/* NetHack 5.0	quest.c	$NHDT-Date: 1774269965 2026/03/23 04:46:05 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.46 $ */
/*      Copyright 1991, M. Stephenson             */
/* NetHack may be freely redistributed.  See license for details. */


import { C } from './c-runtime.js';

/* C structs remain live views, and Qstat retains native bitfield narrowing.
 * Unsigned strategy masks use BigInt, pointer equality compares addresses,
 * and C logical results are normalized where stored in a one-bit field. */

/*  quest dungeon branch routines. */




export function on_start()
{
    if (!C.Qstat.first_start) {
        C.qt_pager("firsttime");
        C.Qstat.first_start = 1;
    } else if ((C.u.uz0.dnum != C.u.uz.dnum) || (C.u.uz0.dlevel < C.u.uz.dlevel)) {
        if (C.Qstat.not_ready <= 2)
            C.qt_pager("nexttime");
        else
            C.qt_pager("othertime");
    }
}

export function on_locate()
{
    /* the locate messages are phrased in a manner such that they only
       make sense when arriving on the level from above */
    let from_above = (C.u.uz0.dlevel < C.u.uz.dlevel);

    if (C.Qstat.killed_nemesis) {
        return;
    } else if (!C.Qstat.first_locate) {
        if (from_above)
            C.qt_pager("locate_first");
        /* if we've arrived from below this will be a lie, but there won't
           be any point in delivering the message upon a return visit from
           above later since the level has now been seen */
        C.Qstat.first_locate = 1;
    } else {
        if (from_above)
            C.qt_pager("locate_next");
    }
}

export function on_goal()
{
    if (C.Qstat.killed_nemesis) {
        return;
    } else if (!C.Qstat.made_goal) {
        C.qt_pager("goal_first");
        C.Qstat.made_goal = 1;
    } else {
        /*
         * Some QT_NEXTGOAL messages reference the quest artifact;
         * find out if it is still present.  If not, request an
         * alternate message (qt_pager() will revert to delivery
         * of QT_NEXTGOAL if current role doesn't have QT_ALTGOAL).
         * Note: if hero is already carrying it, it is treated as
         * being absent from the level for quest message purposes.
         */
        let whichobjchains = ((1 << C.OBJ_FLOOR)
                                   | (1 << C.OBJ_MINVENT)
                                   | (1 << C.OBJ_BURIED));
        let qarti = C.find_quest_artifact(whichobjchains);

        C.qt_pager(qarti ? "goal_next" : "goal_alt");
        if (C.Qstat.made_goal < 7)
            C.Qstat.made_goal++;
    }
}

export function onquest()
{
    if (C.u.uevent.qcompleted || C.Not_firsttime)
        return;
    if (!C.Is_special(C.u.uz))
        return;

    if (C.Is_qstart(C.u.uz))
        on_start();
    else if (C.Is_qlocate(C.u.uz))
        on_locate();
    else if (C.Is_nemesis(C.u.uz))
        on_goal();
    return;
}

export function nemdead()
{
    if (!C.Qstat.killed_nemesis) {
        C.Qstat.killed_nemesis = 1;
        C.qt_pager("killed_nemesis");
    }
}

export function leaddead()
{
    if (!C.Qstat.killed_leader) {
        C.Qstat.killed_leader = 1;
        /* TODO: qt_pager("killed_leader"); ? */
    }
}

export function artitouch(obj)
{
    if (!C.Qstat.touched_artifact) {
        /* in case we haven't seen the item yet (ie, currently blinded),
           this quest message describes it by name so mark it as seen */
        C.observe_object(obj);
        /* only give this message once */
        C.Qstat.touched_artifact = 1;
        C.qt_pager("gotit");
        C.exercise(C.A_WIS, 1);
    }
}

/* external hook for do.c (level change check) */
export function ok_to_quest()
{
    return C.boolean(((C.Qstat.got_quest || C.Qstat.got_thanks)
                       && is_pure(0) > 0) || C.Qstat.killed_leader);
}

export function not_capable()
{
    return C.boolean(C.u.ulevel < C.MIN_QUEST_LEVEL);
}

export function is_pure(talk)
{
    let purity;
    const original_alignment = C.u.ualignbase[C.A_ORIGINAL];

    if (C.wizard && talk) {
        if (C.u.ualign.type != original_alignment) {
            C.You("are currently %s instead of %s.", C.align_str(C.u.ualign.type),
                C.align_str(original_alignment));
        } else if (C.u.ualignbase[C.A_CURRENT] != original_alignment) {
            C.You("have converted.");
        } else if (C.u.ualign.record < C.MIN_QUEST_ALIGN) {
            C.You("are currently %d and require %d.", C.u.ualign.record,
                C.MIN_QUEST_ALIGN);
            if (C.yn_function("adjust?", 0, 121, 1) == 121)
                C.u.ualign.record = C.MIN_QUEST_ALIGN;
        }
    }
    purity = (C.u.ualign.record >= C.MIN_QUEST_ALIGN
              && C.u.ualign.type == original_alignment
              && C.u.ualignbase[C.A_CURRENT] == original_alignment)
                 ? 1
                 : (C.u.ualignbase[C.A_CURRENT] != original_alignment) ? -1 : 0;
    return purity;
}

/*
 * Expel the player to the stairs on the parent of the quest dungeon.
 *
 * This assumes that the hero is currently _in_ the quest dungeon and that
 * there is a single branch to and from it.
 */
export function expulsion(seal)
{
    let br;
    let dest;
    let t;
    let portal_flag = C.u.uevent.qexpelled ? C.UTOTYPE_NONE : C.UTOTYPE_PORTAL;

    br = C.dungeon_branch("The Quest");
    dest = (br.end1.dnum == C.u.uz.dnum) ? br.end2 : br.end1;
    if (seal)
        portal_flag |= C.UTOTYPE_RMPORTAL;
    C.nomul(0); /* stop running */
    C.schedule_goto(dest, portal_flag, 0, 0);
    if (seal) { /* remove the portal to the quest - sealing it off */
        let reexpelled = C.u.uevent.qexpelled;

        C.u.uevent.qexpelled = 1;
        C.remdun_mapseen(C.quest_dnum);
        /* Delete the near portal now; the far (main dungeon side)
           portal will be deleted as part of arrival on that level.
           If monster movement is in progress, any who haven't moved
           yet will now miss out on a chance to wander through it... */
        for (t = C.gf.ftrap; t; t = t.ntrap)
            if (t.ttyp == C.MAGIC_PORTAL)
                break;
        if (t)
            C.deltrap(t); /* (display might be briefly out of sync) */
        else if (!reexpelled)
            C.impossible("quest portal already gone?");
    }
}

/* Either you've returned to quest leader while carrying the quest
   artifact or you've just thrown it to/at him or her.  If quest
   completion text hasn't been given yet, give it now.  Otherwise
   give another message about the character keeping the artifact
   and using the magic portal to return to the dungeon.  Also called
   if hero throws or kicks an invocation item (probably the Bell)
   at the leader. */
export function finish_quest(obj) /* quest artifact or thrown unique item or faux
                               * AoY; possibly null if carrying the Amulet */
{
    let otmp;

    if (obj && !C.is_quest_artifact(obj)) {
        /* tossed an invocation item (or [fake] AoY) at the quest leader */
        if (C.Deaf)
            return; /* optional (unlike quest completion) so skip if deaf */
        /* do ID first so that the message identifying the item will refer to
           it by name (and so justify the ID we already gave...) */
        C.fully_identify_obj(obj);
        /* update_inventory() is not necessary or helpful here because item
           was thrown, so isn't currently in inventory anyway */
        if (obj.otyp == C.AMULET_OF_YENDOR) {
            C.qt_pager("hasamulet");
        } else if (obj.otyp == C.FAKE_AMULET_OF_YENDOR) {
            C.verbalize(
      "Sorry to say, this is a mere imitation of the true Amulet of Yendor.");
        } else {
            C.verbalize("Ah, I see you've found %s.", C.the(C.xname(obj)));
        }
        return;
    }

    if (C.u.uhave.amulet) {
        /* has the amulet in inventory -- most likely the player has already
           completed the quest and stopped in on her way back up, but it's not
           impossible to have gotten the amulet before formally presenting the
           quest artifact to the leader. */
        C.qt_pager("hasamulet");
        /* leader IDs the real amulet but ignores any fakes */
        if ((otmp = C.carrying(C.AMULET_OF_YENDOR)) != 0) {
            C.fully_identify_obj(otmp);
            C.update_inventory();
        }
    } else {
        /* normal quest completion; threw artifact or walked up carrying it */
        C.qt_pager(!C.Qstat.got_thanks ? "offeredit" : "offeredit2");
        /* should have obtained bell during quest;
           if not, suggest returning for it now */
        if ((otmp = C.carrying(C.BELL_OF_OPENING)) == 0)
            C.com_pager("quest_complete_no_bell");
    }
    C.Qstat.got_thanks = 1;

    if (obj) {
        C.u.uevent.qcompleted = 1; /* you did it! */
        /* behave as if leader imparts sufficient info about the
           quest artifact */
        C.fully_identify_obj(obj);
        C.update_inventory();
    }
}

export function chat_with_leader(mtmp)
{
    if (!mtmp.mpeaceful || C.Qstat.pissed_off)
        return;

    /*  Rule 0: Cheater checks. */
    if (C.u.uhave.questart && !C.Qstat.met_nemesis)
        C.Qstat.cheater = 1;

    /*  It is possible for you to get the amulet without completing
     *  the quest.  If so, try to induce the player to quest.
     */
    if (C.Qstat.got_thanks) {
        /* Rule 1: You've gone back with/without the amulet. */
        if (C.u.uhave.amulet)
            finish_quest(0);

        /* Rule 2: You've gone back before going for the amulet. */
        else
            C.qt_pager("posthanks");

    /* Rule 3: You've got the artifact and are back to return it. */
    } else if (C.u.uhave.questart) {
        let otmp;

        for (otmp = C.gi.invent; otmp; otmp = otmp.nobj)
            if (C.is_quest_artifact(otmp))
                break;

        finish_quest(otmp);

    /* Rule 4: You haven't got the artifact yet. */
    } else if (C.Qstat.got_quest) {
        C.qt_pager("encourage");

    /* Rule 5: You aren't yet acceptable - or are you? */
    } else {
        let purity = 0;

        if (!C.Qstat.met_leader) {
            C.qt_pager("leader_first");
            C.Qstat.met_leader = 1;
            C.Qstat.not_ready = 0;
        } else
            C.qt_pager("leader_next");

        /* the quest leader might have passed through the portal into
           the regular dungeon; none of the remaining make sense there */
        if (!C.on_level(C.u.uz, C.qstart_level))
            return;

        if (not_capable()) {
            C.qt_pager("badlevel");
            C.exercise(C.A_WIS, 1);
            expulsion(0);
        } else if ((purity = is_pure(1)) < 0) {
            if (!C.Qstat.pissed_off) {
                C.com_pager("banished");
                C.Qstat.pissed_off = 1;
                expulsion(0);

                /* being expelled is hardly an achievement but none of the
                   other livelog classifications fit */
                C.livelog_printf(C.LL_ACHIEVE,
                               "%s has expelled you from the quest",
                               C.noit_mon_nam(mtmp));
            }
        } else if (purity == 0) {
            C.qt_pager("badalign");
            C.Qstat.not_ready = 1;
            C.exercise(C.A_WIS, 1);
            expulsion(0);
        } else { /* You are worthy! */
            C.qt_pager("assignquest");
            C.exercise(C.A_WIS, 1);
            C.Qstat.got_quest = 1;

            /* phrasing is a bit clumsy but allows #chronicle to provide a
               clue to players who are reaching the quest for first time;
               matters most for Home 1 that has stairs down which aren't
               easily found */
            C.livelog_printf(C.LL_ACHIEVE,
                     "%s has granted access to proceed deeper into the quest",
                           C.noit_mon_nam(mtmp));
        }
    }
}

export function leader_speaks(mtmp)
{
    /* maybe you attacked leader? */
    if (!mtmp.mpeaceful) {
        if (!C.Qstat.pissed_off) {
            /* again, don't end it permanently if the leader gets angry
             * since you're going to have to kill him to go questing... :)
             * ...but do only show this crap once. */
            C.qt_pager("leader_last");
        }
        C.Qstat.pissed_off = 1;
        mtmp.mstrategy &= ~C.STRAT_WAITMASK; /* end the inaction */
    }
    /* the quest leader might have passed through the portal into the
       regular dungeon; if so, mustn't perform "backwards expulsion" */
    if (!C.on_level(C.u.uz, C.qstart_level))
        return;

    if (!C.Qstat.pissed_off)
        chat_with_leader(mtmp);
}

export function chat_with_nemesis()
{
    /*  The nemesis will do most of the talking, but... */
    C.qt_pager("discourage");
    if (!C.Qstat.met_nemesis)
        C.Qstat.met_nemesis++;
}

export function nemesis_speaks()
{
    if (!C.Qstat.in_battle) {
        if (C.u.uhave.questart)
            C.qt_pager("nemesis_wantsit");
        else if (C.Qstat.made_goal == 1 || !C.Qstat.met_nemesis)
            C.qt_pager("nemesis_first");
        else if (C.Qstat.made_goal < 4)
            C.qt_pager("nemesis_next");
        else if (C.Qstat.made_goal < 7)
            C.qt_pager("nemesis_other");
        else if (!C.rn2(5, 414, 'nemesis_speaks'))
            C.qt_pager("discourage");
        if (C.Qstat.made_goal < 7)
            C.Qstat.made_goal++;
        C.Qstat.met_nemesis = 1;
    } else /* he will spit out random maledictions */
        if (!C.rn2(5, 420, 'nemesis_speaks'))
        C.qt_pager("discourage");
}

/* create cloud of stinking gas around dying nemesis */
export function nemesis_stinks(mx, my)
{
    let save_mon_moving = C.svc.context.mon_moving;

    /*
     * Some nemeses (determined by caller) release a cloud of noxious
     * gas when they die.  Don't make the hero be responsible for such
     * a cloud even if hero has just killed nemesis.
     */
    C.svc.context.mon_moving = 1;
    C.create_gas_cloud(mx, my, 5, 8);
    C.svc.context.mon_moving = save_mon_moving;
}

export function chat_with_guardian()
{
    /*  These guys/gals really don't have much to say... */
    if (C.u.uhave.questart && C.Qstat.killed_nemesis)
        C.qt_pager("guardtalk_after");
    else
        C.qt_pager("guardtalk_before");
}

export function prisoner_speaks(mtmp)
{
    if (mtmp.data.address == C.mons[C.PM_PRISONER].address
        && (mtmp.mstrategy & C.STRAT_WAITMASK)) {
        /* Awaken the prisoner */
        if (C.canseemon(mtmp))
            C.pline("%s speaks:", C.Monnam(mtmp));
        // SetVoice(mtmp, 0, 80, 0); /* inactive empty macro */
        C.verbalize("I'm finally free!");
        mtmp.mstrategy &= ~C.STRAT_WAITMASK;
        mtmp.mpeaceful = 1;

        /* Your god is happy... */
        C.adjalign(3);

        /* ...But the guards are not */
        C.angry_guards(0);
    }
    return;
}

export function quest_chat(mtmp)
{
    if (mtmp.m_id == C.Qstat.leader_m_id) {
        chat_with_leader(mtmp);
        /* leader might have become pissed during the chat */
        if (C.Qstat.pissed_off)
            C.setmangry(mtmp, 0);
        return;
    }
    switch (mtmp.data.msound) {
    case C.MS_NEMESIS:
        chat_with_nemesis();
        break;
    case C.MS_GUARDIAN:
        chat_with_guardian();
        break;
    default:
        C.impossible("quest_chat: Unknown quest character %s.", C.mon_nam(mtmp));
    }
}

export function quest_talk(mtmp)
{
    if (mtmp.m_id == C.Qstat.leader_m_id) {
        leader_speaks(mtmp);
        return;
    }
    switch (mtmp.data.msound) {
    case C.MS_NEMESIS:
        nemesis_speaks();
        break;
    case C.MS_DJINNI:
        prisoner_speaks(mtmp);
        break;
    default:
        break;
    }
}

export function quest_stat_check(mtmp)
{
    if (mtmp.data.msound == C.MS_NEMESIS)
        C.Qstat.in_battle = Number(!!(!C.helpless(mtmp) && C.monnear(mtmp, C.u.ux, C.u.uy)));
}


/*quest.c*/
