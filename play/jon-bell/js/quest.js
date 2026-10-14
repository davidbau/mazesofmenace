// @ts-nocheck
// quest.js — Quest functions.
// C ref: quest.c
//
// WIRE_PENDING: port-gen-quest_stat_check-001

import { game } from './gstate.js';
import { monnear as monnear_real } from './makemon.js';
import { qt_pager, com_pager, quest_nemesis_death_text } from './questpgr.js';
import { carrying, fully_identify_obj, verbalize } from './cmd.js';
import { is_quest_artifact, the, xname } from './objnam.js';
import { update_inventory } from './inventory_refresh.js';
import { create_gas_cloud } from './region.js';
import { DEAF } from './const.js';
import { BELL_OF_OPENING } from './objclass_ranges.js';

const AMULET_OF_YENDOR = 213, FAKE_AMULET_OF_YENDOR = 212;
const MS_LEADER = 36, MS_NEMESIS = 37; // monflag.h

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

// C questpgr.c:147-194 uses the HERO'S quest text even for a different
// role's nemesis. Reading raw text still initializes Lua and consumes RNG.
async function stinky_nemesis() {
    const raw = await quest_nemesis_death_text();
    if (!raw)
        return false;
    const text = raw.replace(/\n/g, ' ').toLowerCase();
    let pos = text.indexOf('noxious');
    if (pos < 0) pos = text.indexOf('poisonous');
    if (pos < 0) pos = text.indexOf('toxic');
    return pos >= 0 && (text.indexOf(' gas', pos) >= 0
                       || text.indexOf(' fumes', pos) >= 0);
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

// C mon.c:2461 monnear — use the canonical predicate, including the
// grid-bug diagonal exception.
function monnear(mon, x, y) { return monnear_real(mon, x, y); }

// C monst.h:249 helpless(mon) — msleeping || !mcanmove
function _helpless(mtmp) {
    return !!(mtmp.msleeping | 0) || !(mtmp.mcanmove | 0);
}

// C quest.c:513-518 quest_stat_check(mtmp)
// Checks if the monster is the nemesis and if so, sets the quest in_battle flag
// based on whether the nemesis is helpless and nearby.
export function quest_stat_check(mtmp) {
    // C: if (mtmp->data->msound == MS_NEMESIS)  — plain deref, no guard
    if (mtmp.data.msound === 37) { // MS_NEMESIS = 37
        // C: Qstat(in_battle) = (!helpless(mtmp) && monnear(mtmp, u.ux, u.uy));
        //    where Qstat(x) == svq.quest_status.x  (single faithful path, no fallback)
        const is_helpless = _helpless(mtmp);
        const is_near = monnear(mtmp, game.u.ux, game.u.uy);
        game.svq.quest_status.in_battle = (!is_helpless && is_near) ? 1 : 0;
    }
}
