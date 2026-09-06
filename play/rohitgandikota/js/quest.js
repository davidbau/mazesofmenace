// quest.js — quest progress events.
// C ref: src/quest.c
//
// Only the arrival half is here so far: onquest() and the three per-level
// handlers goto_level dispatches through. Each delivered message is a
// qt_pager() call, and every com_pager_core run costs the nhlib.lua align
// shuffle (rn2(3), rn2(2)) for its fresh Lua state, so a skipped handler is
// two calls short before the text ever shows.

import { game } from './gstate.js';
import { com_pager, is_quest_artifact, qt_pager } from './questpgr.js';
import { tty_yn_function } from './tty/topl.js';
import { You } from './pline.js';
import { exercise } from './attrib.js';
import { align_str } from './role.js';
import { rn2 } from './rng.js';
import { A_WIS, A_CURRENT, A_ORIGINAL, MIN_QUEST_ALIGN,
         MIN_QUEST_LEVEL, STRAT_WAITMASK } from './const.js';
import { MSOUND } from './monst_data.js';
import { ONAMES } from './objects_data.js';

/* include/quest.h:8 struct q_score — zero-initialized at game start */
function Qstat() {
    return (game.quest_status ||= {});
}

// src/quest.c:107 nemdead() and :116 leaddead(), quest death bookkeeping.
export async function nemdead() {
    const q = Qstat();
    if (!q.killed_nemesis) {
        q.killed_nemesis = true;
        await qt_pager('killed_nemesis');
    }
}

export function leaddead() {
    const q = Qstat();
    if (!q.killed_leader)
        q.killed_leader = true;
}

// src/quest.c:426 nemesis_stinks(), create the death cloud as monster-caused.
export async function nemesis_stinks(mx, my) {
    game.context ||= {};
    const saveMonMoving = !!game.context.mon_moving;
    game.context.mon_moving = true;
    try {
        const { create_gas_cloud } = await import('./region.js');
        await create_gas_cloud(mx, my, 5, 8);
    } finally {
        game.context.mon_moving = saveMonMoving;
    }
}

// src/quest.c:125 artitouch() -- first contact with the role's quest
// artifact identifies it by name, delivers the role-specific quest text, and
// exercises wisdom.  addinv_core1() calls this before the object is linked
// into inventory, so the pager precedes the ordinary inventory message.
export async function artitouch(obj) {
    const q = Qstat();
    if (q.touched_artifact)
        return;

    const { observe_object } = await import('./o_init.js');
    observe_object(obj);
    q.touched_artifact = true;
    await qt_pager('gotit');
    exercise(A_WIS, true);
}

// src/quest.c:226 finish_quest(), acknowledge the returned quest artifact and
// fully identify it before giving it back to the hero.
export async function finish_quest(obj) {
    const q = Qstat();
    const { carrying, fully_identify_obj, update_inventory } =
        await import('./invent.js');

    if (obj && !is_quest_artifact(obj)) {
        const { Deaf } = await import('./youprop.js');
        if (Deaf())
            return;
        fully_identify_obj(obj);
        if (obj.otyp === ONAMES.AMULET_OF_YENDOR) {
            await qt_pager('hasamulet');
        } else {
            const { pline } = await import('./display.js');
            if (obj.otyp === ONAMES.FAKE_AMULET_OF_YENDOR) {
                await pline('"Sorry to say, this is a mere imitation of the true Amulet of Yendor."');
            } else {
                const { the, xname } = await import('./objnam.js');
                await pline(`"Ah, I see you've found ${the(xname(obj))}."`);
            }
        }
        return;
    }

    if (game.u.uhave?.amulet) {
        await qt_pager('hasamulet');
        const amulet = carrying(ONAMES.AMULET_OF_YENDOR);
        if (amulet) {
            fully_identify_obj(amulet);
            update_inventory();
        }
    } else {
        await qt_pager(q.got_thanks ? 'offeredit2' : 'offeredit');
        if (!carrying(ONAMES.BELL_OF_OPENING))
            await com_pager('quest_complete_no_bell');
    }
    q.got_thanks = true;

    if (obj) {
        (game.u.uevent ||= {}).qcompleted = 1;
        fully_identify_obj(obj);
        update_inventory();
    }
}

/* include/dungeon.h:129 Lcheck() via on_level() */
const on_level = (a, b) => !!a && !!b && a.dnum === b.dnum
                           && a.dlevel === b.dlevel;

// src/quest.c:184 expulsion(), schedule a return through the Quest branch
// portal after the leader rejects the hero.
async function expulsion(seal) {
    const br = (game.branches || []).find(
        branch => branch.end2.dnum === game.quest_dnum);
    if (!br)
        throw new Error('expulsion: no branch to The Quest');
    const dest = br.end1.dnum === game.u.uz.dnum ? br.end2 : br.end1;
    const qevent = game.u.uevent || (game.u.uevent = {});
    const { nomul } = await import('./hack.js');
    const { schedule_goto, UTOTYPE_NONE, UTOTYPE_PORTAL,
            UTOTYPE_RMPORTAL } = await import('./do.js');
    nomul(0);
    let flags = qevent.qexpelled ? UTOTYPE_NONE : UTOTYPE_PORTAL;
    if (seal)
        flags |= UTOTYPE_RMPORTAL;
    schedule_goto(dest, flags, null, null);
    if (seal)
        qevent.qexpelled = 1;
}

// src/quest.c:153 is_pure() checks the alignment needed for quest access.
// Debug mode offers to raise only the alignment record, just as C does.
async function is_pure(talk) {
    const u = game.u;
    const original = u.ualignbase?.[A_ORIGINAL] ?? u.ualign.type;
    const current = u.ualignbase?.[A_CURRENT] ?? u.ualign.type;

    if (game.wizard && talk) {
        if (u.ualign.type !== original) {
            await You(`are currently ${align_str(u.ualign.type)} instead of ${align_str(original)}.`);
        } else if (current !== original) {
            await You('have converted.');
        } else if (u.ualign.record < MIN_QUEST_ALIGN) {
            await You(`are currently ${u.ualign.record} and require ${MIN_QUEST_ALIGN}.`);
            if (await tty_yn_function('adjust?', null, 'y') === 'y')
                u.ualign.record = MIN_QUEST_ALIGN;
        }
    }
    return quest_purity();
}

function quest_purity() {
    const u = game.u;
    const original = u.ualignbase?.[A_ORIGINAL] ?? u.ualign.type;
    const current = u.ualignbase?.[A_CURRENT] ?? u.ualign.type;
    return (u.ualign.record >= MIN_QUEST_ALIGN
            && u.ualign.type === original && current === original)
        ? 1 : (current !== original) ? -1 : 0;
}

// src/quest.c:140 ok_to_quest(), the quest leader must have granted access,
// and the hero must still meet the alignment requirement. Killing the leader
// bypasses both checks, matching the C rule used by goto_level().
export function ok_to_quest() {
    const q = Qstat();
    return !!(q.killed_leader
              || ((q.got_quest || q.got_thanks)
                  && quest_purity() > 0));
}

// src/quest.c:306 chat_with_leader() and quest_chat().
async function chat_with_leader(mtmp) {
    const q = Qstat();
    if (!mtmp.mpeaceful || q.pissed_off)
        return;

    if (game.u.uhave?.questart && !q.met_nemesis)
        q.cheater = true;

    if (q.got_thanks) {
        if (game.u.uhave?.amulet)
            await finish_quest(null);
        else
            await qt_pager('posthanks');
    } else if (game.u.uhave?.questart) {
        const artifact = (game.invent || []).find(is_quest_artifact);
        await finish_quest(artifact || null);
    } else if (q.got_quest) {
        await qt_pager('encourage');
    } else {
        if (!q.met_leader) {
            await qt_pager('leader_first');
            q.met_leader = true;
            q.not_ready = 0;
        } else {
            await qt_pager('leader_next');
        }

        if (!on_level(game.u.uz, game.special_levels?.qstart_level))
            return;

        if (game.u.ulevel < MIN_QUEST_LEVEL) {
            await qt_pager('badlevel');
            exercise(A_WIS, true);
            await expulsion(false);
        } else {
            const purity = await is_pure(true);
            if (purity < 0) {
                if (!q.pissed_off) {
                    const { com_pager } = await import('./questpgr.js');
                    await com_pager('banished');
                    q.pissed_off = true;
                    await expulsion(false);
                }
            } else if (purity === 0) {
                await qt_pager('badalign');
                q.not_ready = 1;
                exercise(A_WIS, true);
                await expulsion(false);
            } else {
                await qt_pager('assignquest');
                exercise(A_WIS, true);
                q.got_quest = true;
            }
        }
    }
}

// src/quest.c:367 leader_speaks() and :495 quest_talk(), used when a
// strategically waiting leader becomes adjacent during monster movement.
async function leader_speaks(mtmp) {
    const q = Qstat();
    if (!mtmp.mpeaceful) {
        if (!q.pissed_off)
            await qt_pager('leader_last');
        q.pissed_off = true;
        mtmp.mstrategy &= ~STRAT_WAITMASK;
    }
    if (!on_level(game.u.uz, game.special_levels?.qstart_level))
        return;
    if (!q.pissed_off)
        await chat_with_leader(mtmp);
}

export async function quest_talk(mtmp) {
    const q = Qstat();
    const msound = game.mons[mtmp.mnum].msound;
    if (mtmp.m_id === q.leader_m_id) {
        await leader_speaks(mtmp);
    } else if (msound === MSOUND.MS_NEMESIS) {
        if (!q.in_battle) {
            if (game.u.uhave?.questart)
                await qt_pager('nemesis_wantsit');
            else if ((q.made_goal ?? 0) === 1 || !q.met_nemesis)
                await qt_pager('nemesis_first');
            else if ((q.made_goal ?? 0) < 4)
                await qt_pager('nemesis_next');
            else if ((q.made_goal ?? 0) < 7)
                await qt_pager('nemesis_other');
            else if (!rn2(5))
                await qt_pager('discourage');
            if ((q.made_goal ?? 0) < 7)
                q.made_goal = (q.made_goal ?? 0) + 1;
        } else if (!rn2(5)) {
            await qt_pager('discourage');
        }
        q.met_nemesis = true;
    }
}

export async function quest_chat(mtmp) {
    const q = Qstat();
    const msound = game.mons[mtmp.mnum].msound;
    if (mtmp.m_id === q.leader_m_id || msound === MSOUND.MS_LEADER) {
        await chat_with_leader(mtmp);
    } else if (msound === MSOUND.MS_NEMESIS) {
        await qt_pager('discourage');
        q.met_nemesis = true;
    } else if (msound === MSOUND.MS_GUARDIAN) {
        await qt_pager(game.u.uhave?.questart && q.killed_nemesis
            ? 'guardtalk_after' : 'guardtalk_before');
    }
}

// src/quest.c:25 on_start()
async function on_start() {
    const q = Qstat();
    if (!q.first_start) {
        await qt_pager('firsttime');
        q.first_start = true;
    } else if ((game.u.uz0.dnum !== game.u.uz.dnum)
               || (game.u.uz0.dlevel < game.u.uz.dlevel)) {
        if ((q.not_ready ?? 0) <= 2)
            await qt_pager('nexttime');
        else
            await qt_pager('othertime');
    }
}

// src/quest.c:39 on_locate()
async function on_locate() {
    const q = Qstat();
    /* the locate messages are phrased in a manner such that they only
       make sense when arriving on the level from above */
    const from_above = (game.u.uz0.dlevel < game.u.uz.dlevel);

    if (q.killed_nemesis) {
        return;
    } else if (!q.first_locate) {
        if (from_above)
            await qt_pager('locate_first');
        q.first_locate = true;
    } else {
        if (from_above)
            await qt_pager('locate_next');
    }
}

// src/quest.c:61 on_goal()
async function on_goal() {
    const q = Qstat();
    if (q.killed_nemesis) {
        return;
    } else if (!q.made_goal) {
        await qt_pager('goal_first');
        q.made_goal = 1;
    } else {
        /* the return visit needs find_quest_artifact() over the floor,
           minvent and buried chains to pick goal_next vs goal_alt */
        (game.unported ||= new Set()).add('quest:on_goal:find_quest_artifact');
        await qt_pager('goal_next');
        if (q.made_goal < 7)
            q.made_goal++;
    }
}

// src/quest.c:90 onquest() — dispatched from goto_level's arrival tail.
// Not_firsttime is on_level(&u.uz0, &u.uz): u.uz0 still holds the level the
// hero left, until goto_level's tail resets it.
export async function onquest() {
    const { Is_special } = await import('./dungeon.js');

    if (game.u.uevent?.qcompleted || on_level(game.u.uz0, game.u.uz))
        return;
    if (!Is_special(game.u.uz))
        return;

    const sl = game.special_levels || {};
    if (on_level(game.u.uz, sl.qstart_level))
        await on_start();
    else if (on_level(game.u.uz, sl.qlocate_level))
        await on_locate();
    else if (on_level(game.u.uz, sl.nemesis_level))
        await on_goal();
}
