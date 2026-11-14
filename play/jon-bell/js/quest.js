// @ts-nocheck
// quest.js — Quest functions.
// C ref: quest.c
//
// WIRE_PENDING: port-gen-quest_stat_check-001

import { game } from './gstate.js';
import { monnear } from './mon.js';
import { qt_pager, com_pager, quest_nemesis_death_text } from './questpgr.js';
import { carrying, fully_identify_obj } from './invent.js';
import { verbalize } from './pline.js';
import { the, xname } from './objnam.js';
import { is_quest_artifact } from './questpgr.js';
import { update_inventory } from './invent.js';
import { create_gas_cloud } from './region.js';
import { DEAF } from './const.js';
import { BELL_OF_OPENING } from './objclass_ranges.js';
import { stinky_nemesis } from './questpgr.js'; // relocate-fns
import { nomul } from './hack.js'; // relocate-fns
import { adjalign, exercise } from './attrib.js'; // relocate-fns
import { LL_ACHIEVE, MAGIC_PORTAL, MS_DJINNI, MS_GUARDIAN, UTOTYPE_PORTAL, _quest_status, impossible_cmd, set_cursor } from './cmd.js'; // relocate-fns
import { A_CURRENT, A_ORIGINAL, A_WIS, MIN_QUEST_ALIGN, MIN_QUEST_LEVEL, STRAT_WAITMASK } from './const.js'; // relocate-fns
import { canseemon, flush_screen, force_more } from './display.js'; // relocate-fns
import { schedule_goto } from './do.js'; // relocate-fns
import { Monnam } from './do_name.js'; // relocate-fns
import { dungeon_branch, on_level, remdun_mapseen } from './dungeon.js'; // relocate-fns
import { questStatusStruct, wizard } from './gstate.js'; // relocate-fns
import { nhgetch } from './input.js'; // relocate-fns
import { align_str } from './insight.js'; // relocate-fns
import { noit_mon_nam } from './do_name.js'; // relocate-fns
import { sp_levchn_lookup } from './mklev.js'; // relocate-fns
import { angry_guards, setmangry } from './mon.js'; // relocate-fns
import { observe_object } from './o_init.js'; // relocate-fns
import { livelog_printf, pline, impossible as real_impossible } from './pline.js'; // relocate-fns
import { PM_PRISONER } from './pm.generated.js'; // relocate-fns
import { find_quest_artifact } from './questpgr.js'; // relocate-fns
import { rn2 } from './rnd.js'; // relocate-fns
import { deltrap } from './trap.js'; // relocate-fns
import { mon_nam } from './uhitm.js'; // relocate-fns

const AMULET_OF_YENDOR = 213, FAKE_AMULET_OF_YENDOR = 212;
const MS_LEADER = 36; export const MS_NEMESIS = 37; // monflag.h

// C quest.c:106-122: report each quest character's death only once.
export async function nemdead() {
    const q = game.svq.quest_status;
    if (!q.killed_nemesis) {
        q.killed_nemesis = true;
        await qt_pager('killed_nemesis');
    }
}

export function leaddead() {
    const q = game.svq.quest_status;
    if (!q.killed_leader)
        q.killed_leader = true;
}

// C quest.c:225-278: leader identifies the offered item and acknowledges
// completion; optional advice about other invocation items is skipped if deaf.
export async function finish_quest(obj) {
    const u = game.u;
    const q = game.svq.quest_status;
    if (obj && !is_quest_artifact(obj)) {
        const deaf = u.uprops?.[DEAF];
        if (deaf?.intrinsic || u.HDeaf || deaf?.extrinsic || u.EDeaf
            || u.uroleplay?.deaf)
            return;
        fully_identify_obj(obj);
        if (obj.otyp === AMULET_OF_YENDOR)
            await qt_pager('hasamulet');
        else if (obj.otyp === FAKE_AMULET_OF_YENDOR)
            await verbalize('Sorry to say, this is a mere imitation of the true Amulet of Yendor.');
        else
            await verbalize("Ah, I see you've found %s.", the(xname(obj)));
        return;
    }

    if (u.uhave.amulet) {
        await qt_pager('hasamulet');
        const amulet = carrying(AMULET_OF_YENDOR);
        if (amulet) {
            fully_identify_obj(amulet);
            update_inventory();
        }
    } else {
        await qt_pager(!q.got_thanks ? 'offeredit' : 'offeredit2');
        if (!carrying(BELL_OF_OPENING))
            await com_pager('quest_complete_no_bell');
    }
    q.got_thanks = true;
    if (obj) {
        u.uevent.qcompleted = 1;
        fully_identify_obj(obj);
        update_inventory();
    }
}

// C quest.c:425-438: a dying nemesis owns its gas cloud, even when killed
// during the hero's turn. Restore the previous monster-movement context.
export function nemesis_stinks(mx, my) {
    const save_mon_moving = game.context.mon_moving;
    game.context.mon_moving = true;
    create_gas_cloud(mx, my, 5, 8);
    game.context.mon_moving = save_mon_moving;
}


// C mon.c:2767-2776, shared by the port's inlined m_detach death paths.
// Call after map removal and Wizard death handling, before inventory drops.
export async function quest_monster_died(mon) {
    if (mon.data.msound === MS_NEMESIS) {
        await nemdead();
        if (await stinky_nemesis())
            nemesis_stinks(mon.mx, mon.my);
    }
    if (mon.data.msound === MS_LEADER)
        leaddead();
}


// C monst.h:249 helpless(mon) — msleeping || !mcanmove
function _helpless(mtmp) {
    return !!(mtmp.msleeping | 0) || !(mtmp.mcanmove | 0);
}

// C quest.c:513-518 quest_stat_check(mtmp)
// Checks if the monster is the nemesis and if so, sets the quest in_battle flag
// based on whether the nemesis is helpless and nearby.
export function quest_stat_check(mtmp) {
    // C: if (mtmp->data->msound == MS_NEMESIS)  — plain deref, no guard
    if (mtmp.data.msound === MS_NEMESIS) {
        // C: Qstat(in_battle) = (!helpless(mtmp) && monnear(mtmp, u.ux, u.uy));
        //    where Qstat(x) == svq.quest_status.x  (single faithful path, no fallback)
        const is_helpless = _helpless(mtmp);
        const is_near = monnear(mtmp, game.u.ux, game.u.uy);
        game.svq.quest_status.in_battle = (!is_helpless && is_near) ? 1 : 0;
    }
}

const UTOTYPE_RMPORTAL = 0x10;

// SET_BOTL / impossible / set_artifact_intrinsic / is_quest_artifact are
// already declared module-wide (see freeinv_core, invent.c's inverse
// function, a few hundred lines up) — reused as-is here.
/* C quest.c:125-139 artitouch(obj).
 * C's artitouch() runs qt_pager("gotit") and then exercise(A_WIS, TRUE)
 * before set_artifact_intrinsic(obj, 1, W_ART) runs in invent.c:991. */
export async function artitouch(obj) {
    const qstat = questStatusStruct();
    if (qstat.touched_artifact)
        return;
    observe_object(obj);
    qstat.touched_artifact = true;
    /* C's qt_pager() prints before addinv's own "j - ..." line; hand the
     * promise back so async addinv_core1 callers can await it.  C quest.c:133
     * exercises only after the pager window is dismissed (and docrt'd). */
    const pager = qt_pager('gotit');
    if (pager && typeof pager.then === 'function')
        return pager.then(() => { exercise(A_WIS, true); });
    await qt_pager('gotit');
    exercise(A_WIS, true);
}

export async function onquest() {
    const u = game.u;
    if (!u) return;

    /* Not_firsttime = on_level(&u.uz0, &u.uz) */
    if (u.uevent && u.uevent.qcompleted)
        return;
    if (u.uz0 && u.uz &&
        u.uz0.dnum === u.uz.dnum && u.uz0.dlevel === u.uz.dlevel)
        return;

    if (!sp_levchn_lookup(u.uz))
        return;

    /* Is_qstart(&u.uz) */
    if (game.qstart_level && u.uz &&
        u.uz.dnum === game.qstart_level.dnum &&
        u.uz.dlevel === game.qstart_level.dlevel)
        await on_start();
    /* Is_qlocate(&u.uz) */
    else if (game.qlocate_level && u.uz &&
        u.uz.dnum === game.qlocate_level.dnum &&
        u.uz.dlevel === game.qlocate_level.dlevel)
        await on_locate();
    /* Is_nemesis(&u.uz) */
    else if (game.nemesis_level && u.uz &&
        u.uz.dnum === game.nemesis_level.dnum &&
        u.uz.dlevel === game.nemesis_level.dlevel)
        await on_goal();
}

/* C ref: quest.c:25-37 on_start()
 *   if (!Qstat(first_start)) { qt_pager("firsttime"); Qstat(first_start) = TRUE; }
 *   else if ((u.uz0.dnum != u.uz.dnum) || (u.uz0.dlevel < u.uz.dlevel)) {
 *       if (Qstat(not_ready) <= 2) qt_pager("nexttime"); else qt_pager("othertime");
 *   }
 * Qstat(x) == svq.quest_status.x. */
async function on_start() {
    const q = _quest_status();
    if (!q.first_start) {
        await qt_pager("firsttime");
        q.first_start = true;
        return;
    }
    const u = game.u || {};
    if ((u.uz0?.dnum | 0) !== (u.uz?.dnum | 0)
        || (u.uz0?.dlevel | 0) < (u.uz?.dlevel | 0)) {
        if ((q.not_ready | 0) <= 2)
            await qt_pager("nexttime");
        else
            await qt_pager("othertime");
    }
}

export function ok_to_quest() {
    const q = _quest_status();
    return !!(((q.got_quest || q.got_thanks) && _is_pure(false) > 0)
              || q.killed_leader);
}

/* C ref: quest.c:152-177 is_pure(talk).  `talk` is FALSE at every ok_to_quest
 * call, so the wizard-mode interactive block (quest.c:158-170, which can prompt
 * "adjust?") is not reached and is not ported.  u.ualignbase is [A_CURRENT,
 * A_ORIGINAL] — you.h:457-458 A_ORIGINAL 1, A_CURRENT 0 — the same indexing
 * js/questpgr.js:409 and js/objnam.js:4627 already use. */
function _is_pure(talk) {
    void talk;
    const u = game.u || {};
    const original_alignment = (u.ualignbase?.[A_ORIGINAL] | 0);
    return ((u.ualign?.record | 0) >= MIN_QUEST_ALIGN
            && (u.ualign?.type | 0) === original_alignment
            && (u.ualignbase?.[A_CURRENT] | 0) === original_alignment)
        ? 1
        : ((u.ualignbase?.[A_CURRENT] | 0) !== original_alignment) ? -1 : 0;
}

async function _is_pure_wizard_prelude() {
    const g = game;
    const u = g.u || {};
    /* C: `if (wizard && talk)` — talk is TRUE at the one call site, so the
     * surviving conjunct is `wizard` (flag.h:30, i.e. flags.debug). */
    if (!wizard())
        return;
    const original_alignment = (u.ualignbase?.[A_ORIGINAL] | 0);
    if ((u.ualign?.type | 0) !== original_alignment) {
        await pline('You are currently %s instead of %s.',
                    align_str(u.ualign?.type | 0), align_str(original_alignment));
    } else if ((u.ualignbase?.[A_CURRENT] | 0) !== original_alignment) {
        await pline('You have converted.');
    } else if ((u.ualign?.record | 0) < MIN_QUEST_ALIGN) {
        await pline('You are currently %d and require %d.',
                    u.ualign?.record | 0, MIN_QUEST_ALIGN);
        /* topl.c:389-391 — the pending You() line is more()d before the prompt
         * overwrites the topline. */
        if (g._pending_message)
            await force_more(g._pending_message);
        const prompt = 'adjust?';
        g._pending_message = prompt;
        await flush_screen(1);
        /* tty_yn_function cursor: one past the prompt's trailing space. */
        set_cursor(prompt.length + 1, 0);
        const q = (await nhgetch()) & 0xff;
        g._pending_message = '';
        if (String.fromCharCode(q) === 'y')
            u.ualign.record = MIN_QUEST_ALIGN;
    }
}

/* C ref: quest.c:146-150 not_capable() — u.ulevel < MIN_QUEST_LEVEL. */
function not_capable() {
    return (game.u?.ulevel | 0) < MIN_QUEST_LEVEL;
}

async function expulsion(seal) {
    const g = game;
    const u = g.u || (g.u = {});
    let portal_flag = (u.uevent?.qexpelled | 0) ? 0 /* UTOTYPE_NONE */ : UTOTYPE_PORTAL;
    const br = dungeon_branch('The Quest');
    if (!br) {
        impossible_cmd('expulsion: no branch for "The Quest"');
        return;
    }
    const dest = ((br.end1?.dnum | 0) === (u.uz?.dnum | 0)) ? br.end2 : br.end1;
    if (seal)
        portal_flag |= UTOTYPE_RMPORTAL;
    nomul(0); /* stop running */
    schedule_goto(dest, portal_flag, null, null);
    if (seal) { /* remove the portal to the quest - sealing it off */
        const reexpelled = u.uevent?.qexpelled | 0;

        (u.uevent ||= {}).qexpelled = 1;
        remdun_mapseen(g.quest_dnum);
        let t = g.ftrap;
        for (; t; t = t.ntrap)
            if ((t.ttyp | 0) === MAGIC_PORTAL)
                break;
        if (t)
            deltrap(t);
        else if (!reexpelled)
            impossible_cmd('quest portal already gone?');
    }
}

async function chat_with_leader(mtmp) {
    const g = game;
    const u = g.u || (g.u = {});
    const q = _quest_status();

    if (!(mtmp.mpeaceful | 0) || q.pissed_off)
        return;

    /*  Rule 0: Cheater checks. */
    if ((u.uhave?.questart | 0) && !q.met_nemesis)
        q.cheater = true;

    /*  It is possible for you to get the amulet without completing
     *  the quest.  If so, try to induce the player to quest.
     */
    if (q.got_thanks) {
        /* Rule 1: You've gone back with/without the amulet. */
        if (u.uhave?.amulet)
            await finish_quest(null);

        /* Rule 2: You've gone back before going for the amulet. */
        else
            await qt_pager('posthanks');

    /* Rule 3: You've got the artifact and are back to return it. */
    } else if (u.uhave?.questart) {
        let otmp = g.invent;
        for (; otmp; otmp = otmp.nobj)
            if (is_quest_artifact(otmp)) break;
        await finish_quest(otmp);

    /* Rule 4: You haven't got the artifact yet. */
    } else if (q.got_quest) {
        await qt_pager('encourage');

    /* Rule 5: You aren't yet acceptable - or are you? */
    } else {
        let purity = 0;

        if (!q.met_leader) {
            await qt_pager('leader_first');
            q.met_leader = true;
            q.not_ready = 0;
        } else {
            await qt_pager('leader_next');
        }

        /* the quest leader might have passed through the portal into
           the regular dungeon; none of the remaining make sense there */
        if (!on_level(u.uz, g.qstart_level))
            return;

        if (not_capable()) {
            await qt_pager('badlevel');
            exercise(A_WIS, true);
            await expulsion(false);
        } else {
            await _is_pure_wizard_prelude();
            purity = _is_pure(true);
            if (purity < 0) {
                if (!q.pissed_off) {
                    await com_pager('banished');
                    q.pissed_off = true;
                    await expulsion(false);

                    /* being expelled is hardly an achievement but none of the
                       other livelog classifications fit */
                    livelog_printf(LL_ACHIEVE,
                                   '%s has expelled you from the quest',
                                   noit_mon_nam(mtmp));
                }
            } else if (purity === 0) {
                await qt_pager('badalign');
                q.not_ready = 1;
                exercise(A_WIS, true);
                await expulsion(false);
            } else { /* You are worthy! */
                await qt_pager('assignquest');
                exercise(A_WIS, true);
                q.got_quest = true;

                /* phrasing is a bit clumsy but allows #chronicle to provide a
                   clue to players who are reaching the quest for first time;
                   matters most for Home 1 that has stairs down which aren't
                   easily found */
                livelog_printf(LL_ACHIEVE,
                    '%s has granted access to proceed deeper into the quest',
                    noit_mon_nam(mtmp));
            }
        }
    }
}

/* C ref: quest.c:368-388 leader_speaks(mtmp) — the leader's UNPROMPTED speech,
 * reached from quest_talk() during the monster's own turn. */
async function leader_speaks(mtmp) {
    const g = game;
    const u = g.u || (g.u = {});
    const q = _quest_status();

    /* maybe you attacked leader? */
    if (!(mtmp.mpeaceful | 0)) {
        if (!q.pissed_off) {
            /* again, don't end it permanently if the leader gets angry
             * since you're going to have to kill him to go questing... :)
             * ...but do only show this crap once. */
            await qt_pager('leader_last');
        }
        q.pissed_off = true;
        mtmp.mstrategy = ((mtmp.mstrategy | 0) & ~STRAT_WAITMASK) >>> 0;
    }
    /* the quest leader might have passed through the portal into the
       regular dungeon; if so, mustn't perform "backwards expulsion" */
    if (!on_level(u.uz, g.qstart_level))
        return;

    if (!q.pissed_off)
        await chat_with_leader(mtmp);
}

/* C ref: quest.c:429-441 chat_with_nemesis() / :464-468 chat_with_guardian() —
 * both are a single qt_pager() call. */
async function chat_with_nemesis() {
    const q = _quest_status();
    /*  The nemesis will do most of the talking, but... */
    await qt_pager('discourage');
    if (!q.met_nemesis)
        q.met_nemesis = (q.met_nemesis | 0) + 1;
}

async function chat_with_guardian() {
    const q = _quest_status();
    /*  These guys/gals really don't have much to say... */
    if ((game.u?.uhave?.questart | 0) && q.killed_nemesis)
        await qt_pager('guardtalk_after');
    else
        await qt_pager('guardtalk_before');
}

/* C ref: quest.c:472-492 quest_chat(mtmp) — the #chat entry point, reached from
 * domonnoise()'s MS_LEADER/MS_NEMESIS/MS_GUARDIAN arm (sounds.c:729-733). */
export async function quest_chat(mtmp) {
    const q = _quest_status();
    if ((mtmp.m_id | 0) === (q.leader_m_id | 0)) {
        await chat_with_leader(mtmp);
        /* leader might have become pissed during the chat */
        if (q.pissed_off)
            await setmangry(mtmp, false);
        return;
    }
    switch (mtmp.data?.msound | 0) {
    case MS_NEMESIS:
        await chat_with_nemesis();
        break;
    case MS_GUARDIAN:
        await chat_with_guardian();
        break;
    default:
        await real_impossible("quest_chat: Unknown quest character %s.", mon_nam(mtmp));
    }
}

/* C ref: quest.c:403-424 nemesis_speaks() */
async function nemesis_speaks() {
    const q = _quest_status();
    if (!q.in_battle) {
        if (game.u?.uhave?.questart)
            await qt_pager('nemesis_wantsit');
        else if ((q.made_goal | 0) === 1 || !q.met_nemesis)
            await qt_pager('nemesis_first');
        else if ((q.made_goal | 0) < 4)
            await qt_pager('nemesis_next');
        else if ((q.made_goal | 0) < 7)
            await qt_pager('nemesis_other');
        else if (!rn2(5))
            await qt_pager('discourage');
        if ((q.made_goal | 0) < 7)
            q.made_goal = (q.made_goal | 0) + 1;
        q.met_nemesis = true;
    } else /* he will spit out random maledictions */
        if (!rn2(5))
            await qt_pager('discourage');
}

/* C ref: quest.c:451-469 prisoner_speaks(mtmp) */
async function prisoner_speaks(mtmp) {
    if (((mtmp.mndx ?? mtmp.mnum) | 0) === PM_PRISONER && ((mtmp.mstrategy | 0) & STRAT_WAITMASK)) {
        /* Awaken the prisoner */
        if (canseemon(mtmp))
            await pline('%s speaks:', Monnam(mtmp));
        await verbalize("I'm finally free!");
        mtmp.mstrategy = ((mtmp.mstrategy | 0) & ~STRAT_WAITMASK) >>> 0;
        mtmp.mpeaceful = 1;
        /* Your god is happy... */
        adjalign(3);
        /* ...But the guards are not */
        await angry_guards(false);
    }
}

/* C ref: quest.c:494-511 quest_talk(mtmp) — the monster-turn entry point, called
 * from dochug() at monmove.c:722 (the STRAT_WAITMASK arm, which is how a WAITING
 * leader speaks to an adjacent hero) and monmove.c:981.
 * nemesis_speaks()/prisoner_speaks() are not ported; report rather than stay
 * silent, so the missing window surfaces as a named gap. */
export async function quest_talk(mtmp) {
    const q = _quest_status();
    if ((mtmp.m_id | 0) === (q.leader_m_id | 0)) {
        await leader_speaks(mtmp);
        return;
    }
    switch (mtmp.data?.msound | 0) {
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

async function on_locate() {
    const u = game.u || {};
    const from_above = (u.uz0?.dlevel | 0) < (u.uz?.dlevel | 0);
    const q = _quest_status();

    if (q.killed_nemesis) {
        return;
    } else if (!q.first_locate) {
        if (from_above)
            await qt_pager("locate_first");
        q.first_locate = true;
    } else {
        if (from_above)
            await qt_pager("locate_next");
    }
}

/* C ref: quest.c:60-87 on_goal() — the quest NEMESIS level's arrival message.
 * Was `impossible('not yet ported: on_goal')` for the same reason.
 *
 * The repeat-visit arm needs find_quest_artifact(), which is now ported at its
 * C home (js/questpgr.js, C questpgr.c:86-120); C's comment for it: "Some
 * QT_NEXTGOAL messages reference the quest artifact; find out if it is still
 * present.  If not, request an alternate message (qt_pager() will revert to
 * delivery of QT_NEXTGOAL if current role doesn't have QT_ALTGOAL).  Note: if
 * hero is already carrying it, it is treated as being absent from the level for
 * quest message purposes" — which is why OBJ_INVENT is NOT in the chain mask.
 *
 * Qstat(made_goal) is a COUNTER, not a flag: C caps it at 7 so a repeat visit
 * can select a later message without overflowing the field. */
async function on_goal() {
    const q = _quest_status();

    if (q.killed_nemesis) {
        return;
    } else if (!q.made_goal) {
        await qt_pager("goal_first");
        q.made_goal = 1;
    } else {
        /* obj.h:76/79 + OBJ_BURIED — this file spells the obj->where ids as
         * literals throughout (cf. js/cmd.js:12216 `3 /* OBJ_INVENT *\/`). */
        const OBJ_FLOOR_ = 1, OBJ_MINVENT_ = 4, OBJ_BURIED_ = 6;
        const whichobjchains = ((1 << OBJ_FLOOR_)
                                | (1 << OBJ_MINVENT_)
                                | (1 << OBJ_BURIED_));
        const qarti = find_quest_artifact(whichobjchains);

        await qt_pager(qarti ? "goal_next" : "goal_alt");
        if ((q.made_goal | 0) < 7)
            q.made_goal = (q.made_goal | 0) + 1;
    }
}
