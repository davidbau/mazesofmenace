// timeout.js — the timer queue.
// C ref: src/timeout.c
//
// The queue exists because several subsystems schedule an
// effect for a future turn rather than applying it now: buried organics rot,
// eggs hatch, lit objects burn out. Level generation starts those timers, so a
// port that skips them looks right at generation time and then never fires the
// effect.
//
// Delay draws happen before start_timer, in the effect's scheduling function.

import { update_inventory } from './invent.js';
import { little_to_big } from './mkobj.js';
import { make_slimed, make_stoned, make_vomiting, set_itimeout } from './potion.js';
import { Popeye, eating_dangerous_corpse } from './eat.js';
import { wielding_corpse } from './do_wear.js';
import { nolimbs, emits_light } from './mondata.js';
import { exercise } from './attrib.js';
import { Blind, Hallucination, Acid_resistance, Stone_resistance, Unaware } from './youprop.js';
import { an } from './objnam.js';
import { hcolor, rndmonnam } from './do_name.js';
import { find_delayed_killer, dealloc_killer, done } from './end.js';
import { polymon } from './polyself.js';
import { game } from './gstate.js';
import { rn2, rnd, d } from './rng.js';
import { stop_occupation } from './allmain.js';
import { nomul } from './hack.js';
import { TIMEOUT, FROMOUTSIDE, I_SPECIAL, WT_NOISY_INV, FOOT, NECK,
         A_STR, A_DEX, A_CON, DIED, KILLED_BY, KILLED_BY_AN,
         NO_KILLER_PREFIX, STONED, SLIMED, SICK, STRANGLED,
         STONING, TURNED_SLIME, GENOCIDED, POISONING,
         M_AP_MONSTER, NH_GREEN, G_GENOD, Upolyd, PLNMSG_OK_DONT_DIE,
         PLNMSG_ONE_ITEM_HERE, FULL_MOON, FAINTING, MV_KNOWS_EGG,
         NO_MINVENT, MM_NOMSG, OBJ_FLOOR, OBJ_INVENT, OBJ_MINVENT,
         CONTAINED_TOO, BURIED_TOO, ACID_RES, STONE_RES,
         OBJ_MIGRATING, OBJ_BURIED, OBJ_CONTAINED, RANGE_GLOBAL }
    from './const.js';
import { ONAMES } from './objects_data.js';
import { PMNAMES, MFLAGS, MONSYMS } from './monst_data.js';
import { pline, urgent_pline, newsym } from './display.js';
import { del_light_source, new_light_source, arti_light_radius, LS_OBJECT, LS_MONSTER } from './light.js';
import { artifact_light } from './artifact.js';
import { get_obj_location } from './zap.js';
import { impossible } from './pline.js';
import { xname } from './objnam.js';
import { find_oid } from './shk.js';

// src/timeout.c:129 stoned_texts[], :138 stoned_dialogue()
const stoned_texts = [
    'You are slowing down.',
    'Your limbs are stiffening.',
    'Your limbs have turned to stone.',
    'You have turned to stone.',
    'You are a statue.',
];
async function stoned_dialogue() {
    const i = (game.u.uprops.STONED || 0) & TIMEOUT;
    const intr = (game.u.intrinsic ||= {});
    if (i > 0 && i <= stoned_texts.length) {
        let buf = stoned_texts[stoned_texts.length - i];
        if (nolimbs(game.youmonst.data) && /limbs/i.test(buf))
            buf = buf.replace('limbs', 'extremities');
        await urgent_pline(buf);
    }
    switch (i) {
    case 5:
        intr.HFast = 0;
        if (game.multi > 0)
            nomul(0);
        break;
    case 4:
        if (!Popeye(STONED))
            await stop_occupation();
        if (game.multi > 0)
            nomul(0);
        break;
    case 3:
        await stop_occupation();
        nomul(-3);
        game.multi_reason = 'getting stoned';
        game.nomovemsg = 'You can move again.';
        if ((intr.HWounded_legs || game.u.EWounded_legs) && !game.u.usteed) {
            const { heal_legs } = await import('./do.js');
            await heal_legs(2);
        }
        break;
    case 2:
        if ((intr.HDeaf & TIMEOUT) > 0 && (intr.HDeaf & TIMEOUT) < 5)
            set_itimeout('HDeaf', 5);
        if (game.u.uprops.VOMITING)
            await make_vomiting(0, false);
        if (game.u.uprops.SLIMED)
            await make_slimed(0, null);
        break;
    default:
        break;
    }
    exercise(A_DEX, false);
}

// src/timeout.c:187 vomiting_dialogue(). It runs before the property timer is
// decremented, so every switch value uses the pending timeout minus one.
async function vomiting_dialogue() {
    const props = (game.u.uprops ||= {});
    const v = (props.VOMITING || 0) - 1;
    let text = null;

    switch (v) {
    case 14:
        text = 'are feeling mildly nauseated.';
        break;
    case 11:
        text = props.CONFUSION ? 'feel slightly more confused.'
                               : 'feel slightly confused.';
        break;
    case 6: {
        const { make_stunned, make_confused } = await import('./potion.js');
        await make_stunned((game.u.intrinsic?.HStun || 0) + d(2, 4), false);
        await stop_occupation();
        await make_confused((game.u.intrinsic?.HConfusion || 0) + d(2, 4),
                            false);
        if ((game.multi ?? 0) > 0)
            nomul(0);
        break;
    }
    case 9: {
        const { make_confused } = await import('./potion.js');
        await make_confused((game.u.intrinsic?.HConfusion || 0) + d(2, 4),
                            false);
        if ((game.multi ?? 0) > 0)
            nomul(0);
        break;
    }
    case 8:
        text = game.u.uprops?.STUNNED ? "can't think straight."
                                     : "can't seem to think straight.";
        break;
    case 5:
        text = 'feel incredibly sick.';
        break;
    case 2: {
        const { cantvomit } = await import('./mondata.js');
        const { Hallucination } = await import('./youprop.js');
        if (cantvomit(game.youmonst.data))
            text = 'gag uncontrollably.';
        else
            text = Hallucination() ? 'are about to hurl!'
                                   : 'are about to vomit.';
        break;
    }
    case 0: {
        await stop_occupation();
        const { cantvomit } = await import('./mondata.js');
        const { Hallucination } = await import('./youprop.js');
        const { morehungry, vomit } = await import('./eat.js');
        if (!cantvomit(game.youmonst.data)) {
            await morehungry(20);
            if (game.u.uhs < FAINTING)
                await pline(`You ${Hallucination() ? 'hurl chunks' : 'vomit'}!`);
        }
        await vomit();
        break;
    }
    default:
        break;
    }

    if (text)
        await pline(`You ${text}`);
    const { exercise } = await import('./attrib.js');
    exercise(A_CON, false);
}

// src/timeout.c:381 slime_texts[], :389 slime_dialogue()
const slime_texts = [
    'You are turning a little %s.',
    'Your limbs are getting oozy.',
    'Your skin begins to peel away.',
    'You are turning into %s.',
    'You have become %s.',
];
async function slime_dialogue() {
    const t = game.u.uprops.SLIMED & TIMEOUT, i = Math.trunc(t / 2);
    const intr = (game.u.intrinsic ||= {});
    if (t === 1) {
        game.youmonst.m_ap_type = M_AP_MONSTER;
        game.youmonst.mappearance = PMNAMES.PM_GREEN_SLIME;
        newsym(game.u.ux, game.u.uy);
    }
    if (t % 2 !== 0 && i >= 0 && i < slime_texts.length) {
        let buf = slime_texts[slime_texts.length - i - 1];
        if (nolimbs(game.youmonst.data) && /limbs/i.test(buf))
            buf = buf.replace('limbs', 'extremities');
        if (buf.includes('%')) {
            if (i === 4) {
                if (!Blind())
                    await urgent_pline(buf.replace('%s', hcolor(NH_GREEN)));
            } else {
                await urgent_pline(buf.replace('%s', an(Hallucination()
                    ? rndmonnam(null) : 'green slime')));
            }
        } else {
            await urgent_pline(buf);
        }
    }
    switch (i) {
    case 3:
        intr.HFast = 0;
        if (!Popeye(SLIMED))
            await stop_occupation();
        if (game.multi > 0)
            nomul(0);
        break;
    case 2:
        if ((intr.HDeaf & TIMEOUT) > 0 && (intr.HDeaf & TIMEOUT) < 5)
            set_itimeout('HDeaf', 5);
        break;
    case 1:
        if (game.u.uprops.STONED)
            await make_stoned(0, null, KILLED_BY_AN, null);
        break;
    }
    exercise(A_DEX, false);
}

// src/timeout.c:448 burn_away_slime(), fire burns off the green slime.
export async function burn_away_slime() {
    if (game.u.uprops?.SLIMED) {
        await make_slimed(0, 'The slime that covers you is burned away!');
    }
}

// src/timeout.c:457 slimed_to_death()
async function slimed_to_death(kptr) {
    if (Upolyd(game.u) && game.u.umonnum === PMNAMES.PM_GREEN_SLIME) {
        dealloc_killer(kptr);
        return;
    }
    game.killer ||= {};
    if (kptr?.name) {
        game.killer.format = kptr.format;
        game.killer.name = kptr.name;
    } else {
        game.killer.format = NO_KILLER_PREFIX;
        game.killer.name = 'turned into green slime';
    }
    dealloc_killer(kptr);
    if (emits_light(game.youmonst.data))
        del_light_source(LS_MONSTER, game.youmonst.m_id);
    const save_mvflags = game.mvitals[PMNAMES.PM_GREEN_SLIME].mvflags;
    game.mvitals[PMNAMES.PM_GREEN_SLIME].mvflags = save_mvflags & ~G_GENOD;
    await polymon(PMNAMES.PM_GREEN_SLIME);
    game.mvitals[PMNAMES.PM_GREEN_SLIME].mvflags = save_mvflags;
    await done_timeout(TURNED_SLIME, SLIMED);
    if ((game.mvitals[PMNAMES.PM_GREEN_SLIME].mvflags & G_GENOD) !== 0) {
        game.killer.format = KILLED_BY;
        game.killer.name = 'slimicide';
        if (game.iflags.last_msg === PLNMSG_OK_DONT_DIE)
            await urgent_pline('Yes, you do.  Green slime has been genocided...');
        else
            await urgent_pline('Unfortunately, green slime has been genocided...');
        await done(GENOCIDED);
    }
}

// include/timeout.h:11 enum timer_type
export const TIMER_NONE = 0;
export const TIMER_LEVEL = 1;
export const TIMER_GLOBAL = 2;
export const TIMER_OBJECT = 3;
export const TIMER_MONSTER = 4;
export const NUM_TIMER_KINDS = 5;

// include/timeout.h:36 enum timeout_types
export const ROT_ORGANIC = 0;
export const ROT_CORPSE = 1;
export const REVIVE_MON = 2;
export const ZOMBIFY_MON = 3;
export const BURN_OBJECT = 4;
export const HATCH_EGG = 5;
export const FIG_TRANSFORM = 6;
export const SHRINK_GLOB = 7;
export const MELT_ICE_AWAY = 8;
export const NUM_TIME_FUNCS = 9;

// src/timeout.c:2467 insert_timer() — keep the queue sorted by timeout.
//
// The scan stops at the first entry whose timeout is >= the new one and links
// in FRONT of it, so a tie puts the newcomer first: equal timeouts come out in
// reverse insertion order.
function insert_timer(gnu) {
    const base = (game.timer_base ||= []);
    let i = 0;
    while (i < base.length && base[i].timeout < gnu.timeout)
        i++;
    base.splice(i, 0, gnu);
}

// src/timeout.c mon_is_local/obj_is_local/timer_is_local(). Migrating pets
// and the hero's possessions retain their timers across level changes.
function mon_is_local(mon) {
    return !(game.migrating_mons || []).includes(mon)
        && !(game.mydogs || []).includes(mon);
}

export function obj_is_local(obj) {
    switch (obj.where) {
    case OBJ_INVENT:
    case OBJ_MIGRATING:
        return false;
    case OBJ_FLOOR:
    case OBJ_BURIED:
        return true;
    case OBJ_CONTAINED:
        return obj_is_local(obj.ocontainer);
    case OBJ_MINVENT:
        return mon_is_local(obj.ocarry);
    default:
        throw new Error('obj_is_local');
    }
}

function timer_is_local(timer) {
    switch (timer.kind) {
    case TIMER_LEVEL: return true;
    case TIMER_GLOBAL: return false;
    case TIMER_OBJECT: return obj_is_local(timer.arg);
    case TIMER_MONSTER: return mon_is_local(timer.arg);
    default: throw new Error('timer_is_local');
    }
}

// src/timeout.c write_timer/save_timers(), encode owner IDs without changing
// the live owner or its timed count. Array length represents the saved count.
function write_timer(timer) {
    const saved = {...timer};
    if (!saved.needs_fixup && (saved.kind === TIMER_OBJECT
                              || saved.kind === TIMER_MONSTER)) {
        saved.arg = saved.kind === TIMER_OBJECT ? saved.arg.o_id : saved.arg.m_id;
        saved.needs_fixup = 1;
    }
    return saved;
}

// src/timeout.c:2668 save_timers()
export function save_timers(range, release = false) {
    const local = range !== RANGE_GLOBAL;
    const selected = (game.timer_base || []).filter(t => timer_is_local(t) === local);
    const saved = {timers: selected.map(write_timer)};
    if (range === RANGE_GLOBAL)
        saved.timer_id = game.timer_id;
    if (release)
        game.timer_base = (game.timer_base || []).filter(t => !selected.includes(t));
    return saved;
}

// src/timeout.c:2707 restore_timers(). Insertion reverses equal-time
// entries just as the C queue does. Starting new timers here would alter IDs
// and double the owners' timed counts.
export function restore_timers(saved, range, ghostly = false, adjust = 0) {
    if (range === RANGE_GLOBAL)
        game.timer_id = saved.timer_id;
    for (const timer of saved?.timers || [])
        insert_timer({...timer, timeout: timer.timeout + (ghostly ? adjust : 0)});
}

// src/timeout.c:2751 relink_timers()
export function relink_timers(ghostly, idmap) {
    for (const timer of game.timer_base || []) {
        if (!timer.needs_fixup)
            continue;
        if (timer.kind !== TIMER_OBJECT)
            throw new Error('relink_timers: no monster timer implemented');
        const id = ghostly ? idmap.get(timer.arg) : timer.arg;
        timer.arg = find_oid(id);
        if (!timer.arg)
            throw new Error(`relink_timers: cannot find object ${id}`);
        timer.needs_fixup = 0;
    }
}

// src/timeout.c:2247 start_timer() — schedule `func_index` for `arg` in `when`
// turns. Returns whether it was scheduled.
export function start_timer(when, kind, func_index, arg) {
    if (kind <= TIMER_NONE || kind >= NUM_TIMER_KINDS
        || func_index < 0 || func_index >= NUM_TIME_FUNCS)
        throw new Error(`start_timer (${kind}: ${func_index})`);   /* panic() */

    /* fail if <arg> already has a <func_index> timer running */
    const dup = (game.timer_base ||= []).find(
        (d) => d.kind === kind && d.func_index === func_index && d.arg === arg);
    if (dup)
        return false;                   /* impossible(), aborted */

    const gnu = {
        tid: (game.timer_id ??= 0),     /* svt.timer_id++ — post-increment */
        timeout: (game.moves ?? 0) + when,
        kind,
        needs_fixup: 0,
        func_index,
        arg,
    };
    game.timer_id++;
    insert_timer(gnu);

    if (kind === TIMER_OBJECT)          /* increment object's timed count */
        arg.timed = (arg.timed ?? 0) + 1;

    return true;
}

// src/timeout.c:2299 stop_timer() and :2328 peek_timer().
export function stop_timer(func_index, arg) {
    const base = (game.timer_base ||= []);
    const index = base.findIndex(
        (timer) => timer.func_index === func_index && timer.arg === arg);
    if (index < 0)
        return 0;

    const [timer] = base.splice(index, 1);
    if (timer.kind === TIMER_OBJECT)
        arg.timed = Math.max(0, (arg.timed ?? 1) - 1);
    if (func_index === BURN_OBJECT)
        cleanup_burn(arg, timer.timeout);
    return timer.timeout - (game.moves ?? 0);
}

export function peek_timer(func_index, arg) {
    const timer = (game.timer_base || []).find(
        (candidate) => candidate.func_index === func_index
            && candidate.arg === arg);
    return timer?.timeout ?? 0;
}

// src/timeout.c:2377 obj_stop_timers(). Remove every timer attached to an
// object before changing the object type or corpse species.
export function obj_stop_timers(obj) {
    const base = (game.timer_base ||= []);
    for (let i = 0; i < base.length;) {
        const timer = base[i];
        if (timer.kind === TIMER_OBJECT && timer.arg === obj) {
            base.splice(i, 1);
            if (timer.func_index === BURN_OBJECT)
                cleanup_burn(obj, timer.timeout);
        } else {
            i++;
        }
    }
    obj.timed = 0;
}

// src/timeout.c:2359 obj_split_timers(). Duplicate every object timer onto
// the newly split object without changing the source object's timers.
export function obj_split_timers(src, dest) {
    const timers = (game.timer_base || []).filter(
        (timer) => timer.kind === TIMER_OBJECT && timer.arg === src);
    for (const timer of timers)
        start_timer(timer.timeout - (game.moves ?? 0), TIMER_OBJECT,
                    timer.func_index, dest);
}

function candle_light_range(obj) {
    if (obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION)
        return obj.spe < 4 ? 2 : obj.spe < 7 ? 3 : 4;

    let radius = 1;
    while (radius * radius <= obj.quan)
        radius++;
    return radius;
}

const ordinary_candle = (obj) => obj.otyp === ONAMES.TALLOW_CANDLE
    || obj.otyp === ONAMES.WAX_CANDLE;

// src/timeout.c:1712 begin_burn(). The timer stores the next fuel checkpoint
// while age holds any fuel beyond that checkpoint, exactly as the C object
// does. The synchronous core lets special-level generation finish a floor
// object's timer before the first screen is drawn.
function begin_burn_core(obj) {
    if (!obj || (!obj.age && obj.otyp !== ONAMES.MAGIC_LAMP && !artifact_light(obj)))
        return null;

    let radius = 3;
    let turns = 0;
    let do_timer = true;
    let diagnostic;

    if (obj.otyp === ONAMES.MAGIC_LAMP) {
        obj.lamplit = 1;
        do_timer = false;
    } else if (obj.otyp === ONAMES.POT_OIL) {
        turns = obj.age;
        if (obj.odiluted)
            turns = Math.trunc((3 * turns + 2) / 4);
        radius = 1;
    } else if (obj.otyp === ONAMES.BRASS_LANTERN
               || obj.otyp === ONAMES.OIL_LAMP) {
        turns = obj.age > 150 ? obj.age - 150
              : obj.age > 100 ? obj.age - 100
                : obj.age > 50 ? obj.age - 50
                  : obj.age > 25 ? obj.age - 25 : obj.age;
    } else if (ordinary_candle(obj)
               || obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION) {
        turns = obj.age > 75 ? obj.age - 75
              : obj.age > 15 ? obj.age - 15 : obj.age;
        radius = candle_light_range(obj);
    } else if (artifact_light(obj)) {
        obj.lamplit = 1;
        do_timer = false;
        radius = arti_light_radius(obj);
    } else {
        diagnostic = impossible(`begin burn: unexpected ${xname(obj)}`);
        turns = obj.age;
    }

    const finish = () => {
        if (do_timer) {
            if (start_timer(turns, TIMER_OBJECT, BURN_OBJECT, obj)) {
                obj.lamplit = 1;
                obj.age -= turns;
            } else {
                obj.lamplit = 0;
            }
        }
        return { radius };
    };
    return diagnostic ? diagnostic.then(finish) : finish();
}

function burn_location(obj) {
    const loc = {};
    return get_obj_location(obj, loc, CONTAINED_TOO | BURIED_TOO) ? loc : null;
}

// Level descriptions execute synchronously. Supply their already-loaded light
// hook so a lit floor object has both its timer and light source immediately.
export function begin_burn_level_object(obj, add_light_source) {
    const state = begin_burn_core(obj);
    const finish = result => {
        if (!result || !obj.lamplit)
            return;
        const loc = burn_location(obj);
        if (!loc)
            return impossible("begin_burn: can't get obj position");
        add_light_source(loc.x, loc.y, result.radius, obj.o_id);
        game.vision_full_recalc = 1;
    };
    return state?.then ? state.then(finish) : finish(state);
}

// Valid object construction completes synchronously; only diagnostics wait.
export function begin_burn(obj, already_lit) {
    const state = begin_burn_core(obj);
    const finish = result => {
        if (!result)
            return;
        if (obj.lamplit && obj.where === OBJ_INVENT && !already_lit)
            update_inventory();
        if (obj.lamplit && !already_lit) {
            const loc = burn_location(obj);
            if (!loc)
                return impossible("begin_burn: can't get obj position");
            return new_light_source(loc.x, loc.y, result.radius, LS_OBJECT, obj.o_id);
        }
    };
    return state?.then ? state.then(finish) : finish(state);
}

// src/timeout.c:1804 end_burn() plus cleanup_burn(). stop_timer() returns the
// remaining delay, which is the unused fuel cleanup_burn restores to age.
export function end_burn(obj, timer_attached) {
    if (!obj?.lamplit)
        return impossible(`end_burn: obj ${xname(obj)} not lit`);

    if (obj.otyp === ONAMES.MAGIC_LAMP || artifact_light(obj))
        timer_attached = false;

    if (!timer_attached) {
        del_light_source(LS_OBJECT, obj.o_id);
        obj.lamplit = 0;
        if (obj.where === OBJ_INVENT)
            update_inventory();
    } else if (!stop_timer(BURN_OBJECT, obj)) {
        return impossible(`end_burn: obj ${xname(obj)} not timed!`);
    }
}

// src/timeout.c:1829 cleanup_burn(), also used by direct stop_timer callers.
function cleanup_burn(obj, expire_time) {
    if (!obj.lamplit)
        return impossible(`cleanup_burn: obj ${xname(obj)} not lit`);
    del_light_source(LS_OBJECT, obj.o_id);
    obj.age += expire_time - game.moves;
    obj.lamplit = 0;
    if (obj.where === OBJ_INVENT)
        update_inventory();
}

async function burn_object(obj, timeout) {
    const lamp = obj?.otyp === ONAMES.BRASS_LANTERN
        || obj?.otyp === ONAMES.OIL_LAMP;
    const candle = ordinary_candle(obj);
    const menorah = obj?.otyp === ONAMES.CANDELABRUM_OF_INVOCATION;
    if (obj?.otyp !== ONAMES.POT_OIL && !lamp && !candle && !menorah) {
        note_unported_timeout('burn_object:otyp=' + obj?.otyp);
        return;
    }

    if (timeout !== (game.moves ?? 0)) {
        const how_long = (game.moves ?? 0) - timeout;
        if (how_long < (obj.age || 0)) {
            obj.age -= how_long;
            await begin_burn(obj, true);
            return;
        }
        obj.age = 0;
        await end_burn(obj, false);
        if (menorah) {
            obj.spe = 0;
            const { weight, update_inventory } = await import('./invent.js');
            obj.owt = weight(obj);
            if (obj.where === OBJ_INVENT)
                update_inventory();
        } else if ((candle || obj.otyp === ONAMES.POT_OIL)
                   && (obj.where === OBJ_FLOOR || obj.where === OBJ_MINVENT)) {
            const was_floor = obj.where === OBJ_FLOOR;
            const ox = obj.ox, oy = obj.oy;
            const { obj_extract_self } = await import('./invent.js');
            obj_extract_self(obj);
            if (was_floor) {
                const { newsym } = await import('./display.js');
                newsym(ox, oy);
            }
        }
        return;
    }

    let x, y;
    if (obj.where === OBJ_INVENT) {
        x = game.u.ux;
        y = game.u.uy;
    } else if (obj.where === OBJ_FLOOR) {
        x = obj.ox;
        y = obj.oy;
    } else if (obj.where === OBJ_MINVENT && obj.ocarry) {
        x = obj.ocarry.mx;
        y = obj.ocarry.my;
    }
    const [{ Blind, Hallucination }, { cansee }, names] = await Promise.all([
        import('./youprop.js'), import('./vision.js'), import('./objnam.js'),
    ]);
    const canseeit = x !== undefined && !Blind() && cansee(x, y);
    const bytouch = obj.where === OBJ_INVENT
        && obj.otyp !== ONAMES.BRASS_LANTERN;
    const many = menorah ? obj.spe > 1 : obj.quan > 1;

    if (obj.otyp === ONAMES.POT_OIL) {
        if (canseeit) {
            if (obj.where === OBJ_INVENT)
                await pline('Your potion of oil has burnt away.');
            else if (obj.where === OBJ_FLOOR) {
                const { You_see } = await import('./pline.js');
                await You_see('a burning potion of oil go out.');
            } else {
                note_unported_timeout('burn_object:minvent_message');
            }
        }
        await end_burn(obj, false);
        const { obj_extract_self, useupall } = await import('./invent.js');
        if (obj.where === OBJ_INVENT) {
            useupall(obj);
        } else {
            const was_floor = obj.where === OBJ_FLOOR;
            const ox = obj.ox, oy = obj.oy;
            obj_extract_self(obj);
            if (was_floor) {
                const { newsym } = await import('./display.js');
                newsym(ox, oy);
            }
        }
        return;
    }

    if (lamp) {
        if (obj.age === 150 || obj.age === 100 || obj.age === 50) {
            if (canseeit) {
                if (obj.otyp === ONAMES.BRASS_LANTERN) {
                    await pline('Your lantern is getting dim.');
                } else {
                    await pline(`${names.Yname2(obj)} flickers${
                        obj.age === 50 ? ' considerably' : ''}.`);
                }
            }
        } else if (obj.age === 25) {
            if (canseeit) {
                if (obj.otyp === ONAMES.BRASS_LANTERN)
                    await pline('Your lantern is getting dim.');
                else
                    await pline(`${names.Yname2(obj)} seems about to go out.`);
            }
        } else if (obj.age === 0) {
            if (canseeit || bytouch) {
                await pline(obj.otyp === ONAMES.BRASS_LANTERN
                    ? 'Your lantern has run out of power.'
                    : `${names.Yname2(obj)} has gone out.`);
            }
            await end_burn(obj, false);
        }
        if (obj.age)
            await begin_burn(obj, true);
        return;
    }

    if (obj.age === 75 && canseeit) {
        if (obj.where === OBJ_FLOOR) {
            const { You_see } = await import('./pline.js');
            await You_see(`${menorah ? "a candelabrum's " : many ? 'some ' : 'a '
                }candle${many ? 's' : ''} getting short.`);
        } else {
            const subject = menorah
                ? `Your candelabrum's candle${many ? 's are' : ' is'}`
                : `${many ? 'Your candles are' : 'Your candle is'}`;
            await pline(`${subject} getting short.`);
        }
    } else if (obj.age === 15 && canseeit) {
        if (obj.where === OBJ_FLOOR) {
            const { You_see } = await import('./pline.js');
            await You_see(`${menorah ? "a candelabrum's " : many ? 'some ' : 'a '
                }candle${many ? "s'" : "'s"} flame${many ? 's' : ''} flicker low!`);
        } else {
            const subject = menorah
                ? `Your candelabrum's candle${many ? "s'" : "'s"}`
                : many ? "Your candles'" : "Your candle's";
            await pline(`${subject} flame${many ? 's' : ''} flicker${
                many ? '' : 's'} low!`);
        }
    } else if (obj.age === 0) {
        if (canseeit || bytouch) {
            if (menorah) {
                if (obj.where === OBJ_FLOOR) {
                    const { You_see } = await import('./pline.js');
                    await You_see(`a candelabrum's flame${many ? 's' : ''} die.`);
                } else {
                    await pline(`Your candelabrum's flame${
                        many ? 's die' : ' dies'}.`);
                }
            } else {
                if (obj.where === OBJ_FLOOR) {
                    const { You_see } = await import('./pline.js');
                    await You_see(`${many ? 'some ' : ''}${
                        many ? names.xname(obj) : names.an(names.xname(obj))
                    } consumed!`);
                } else {
                    await pline(`${names.Yname2(obj)} ${
                        many ? 'are' : 'is'} consumed!`);
                }
                if (Hallucination())
                    await pline(many ? 'They shriek!' : 'It shrieks!');
                else if (!Blind())
                    await pline(many ? 'Their flames die.' : 'Its flame dies.');
            }
        }
        await end_burn(obj, false);
        if (menorah) {
            obj.spe = 0;
            const { weight, update_inventory } = await import('./invent.js');
            obj.owt = weight(obj);
            if (obj.where === OBJ_INVENT)
                update_inventory();
        } else {
            const { obj_extract_self, useupall } = await import('./invent.js');
            if (obj.where === OBJ_INVENT)
                useupall(obj);
            else {
                const was_floor = obj.where === OBJ_FLOOR;
                const ox = obj.ox, oy = obj.oy;
                obj_extract_self(obj);
                if (was_floor) {
                    const { newsym } = await import('./display.js');
                    newsym(ox, oy);
                }
            }
        }
        return;
    }
    if (obj.age)
        await begin_burn(obj, true);
}

// src/timeout.c:2416 spot_stop_timers(); stop all timers at a location
// (level timers whose argument is the packed location)
export function spot_stop_timers(x, y, func_index) {
    const where = ((x << 16) | y);
    const timers = game.timer_base || [];

    for (const curr of [...timers]) {
        if (curr.kind === TIMER_LEVEL && curr.func_index === func_index
            && curr.arg === where) {
            timers.splice(timers.indexOf(curr), 1);
            /* the cleanup function for MELT_ICE_AWAY (melt_ice_away's
               cleanup) is not registered in this port's timer table */
        }
    }
}

// src/timeout.c:2444 spot_time_expires(); the time a location timer fires
export function spot_time_expires(x, y, func_index) {
    const where = ((x << 16) | y);

    for (const curr of (game.timer_base || [])) {
        if (curr.kind === TIMER_LEVEL && curr.func_index === func_index
            && curr.arg === where)
            return curr.timeout;
    }
    return 0;
}

// src/timeout.c:2459 spot_time_left()
export function spot_time_left(x, y, func_index) {
    const expires = spot_time_expires(x, y, func_index);
    return (expires > 0) ? expires - game.moves : 0;
}

// src/timeout.c:2222 run_timers() — fire every timer whose time has come.
// The list is ordered; we are done when the first element is in the future.
// Runs from nh_timeout()'s tail (timeout.c:947) and from goto_level.
export async function run_timers() {
    const base = (game.timer_base ||= []);
    while (base.length && base[0].timeout <= (game.moves ?? 0)) {
        const curr = base.shift();
        if (curr.kind === TIMER_OBJECT && curr.arg)
            curr.arg.timed = Math.max(0, (curr.arg.timed ?? 1) - 1);
        switch (curr.func_index) {
        case ROT_CORPSE: {
            const { rot_corpse } = await import('./dig.js');
            await rot_corpse(curr.arg);
            break;
        }
        case ROT_ORGANIC: {
            const { rot_organic } = await import('./dig.js');
            await rot_organic(curr.arg);
            break;
        }
        case REVIVE_MON: {
            const { revive_mon } = await import('./do.js');
            await revive_mon(curr.arg);
            break;
        }
        case ZOMBIFY_MON: {
            const { zombify_mon } = await import('./do.js');
            await zombify_mon(curr.arg, curr.timeout);
            break;
        }
        case BURN_OBJECT:
            await burn_object(curr.arg, curr.timeout);
            break;
        case HATCH_EGG:
            await hatch_egg(curr.arg, curr.timeout);
            break;
        case FIG_TRANSFORM: {
            const { fig_transform } = await import('./apply.js');
            await fig_transform(curr.arg, curr.timeout);
            break;
        }
        case SHRINK_GLOB: {
            const { shrink_glob } = await import('./mkobj.js');
            await shrink_glob(curr.arg, curr.timeout);
            break;
        }
        default:
            /* The remaining callbacks each need their own subsystem; record
               which one fired unported. */
            (game.unported ||= new Set())
                .add('timeout:run_timers:' + curr.func_index);
            break;
        }
    }
}

// src/timeout.c:1204 attach_fig_transform_timeout()
export function attach_fig_transform_timeout(figurine) {
    stop_timer(FIG_TRANSFORM, figurine);
    const i = rnd(9000) + 200;
    start_timer(i, TIMER_OBJECT, FIG_TRANSFORM, figurine);
}

// src/timeout.c:951 fall_asleep() — put the hero to sleep for -how_long turns.
//
// The #if 0 deafness block is not compiled in C and is not ported. usleep
// records WHEN sleep began so combat can wake the hero no earlier than the
// next monster turn. nomovemsg carries the wake message.
export async function fall_asleep(how_long, wakeup_msg) {
    await stop_occupation();
    nomul(how_long);
    game.multi_reason = "sleeping";
    /* early wakeup from combat won't be possible until next monster turn */
    game.u.usleep = game.moves;
    game.nomovemsg = wakeup_msg ? "You wake up." : "You can move again.";
}

// src/timeout.c:1193 learn_egg_type(); note whether egg is a hatchable one
export function learn_egg_type(mnum) {
    /* baby monsters hatch from grown-up eggs */
    mnum = little_to_big(mnum);
    game.mvitals[mnum].mvflags |= MV_KNOWS_EGG;
    /* we might have just learned about other eggs being carried */
    update_inventory();
}

// src/timeout.c:1221 slip_or_trip() — feedback when FUMBLING expires after a
// move. The floor-object and ordinary on-foot paths are common. Ice and
// mounted movement retain their exact gates and record only the unported
// forced-movement tail.
async function slip_or_trip() {
    const u = game.u;
    const on_foot = !u.usteed;
    let otmp = (game.level?.objects || [])
        .find(o => o.ox === u.ux && o.oy === u.uy) || null;
    const { is_pool } = await import('./mon.js');
    if (otmp && on_foot && !u.uinwater && is_pool(u.ux, u.uy))
        otmp = null;

    const { You } = await import('./pline.js');
    const { Hallucination } = await import('./youprop.js');
    if (otmp && on_foot) {
        const { doname } = await import('./objnam.js');
        const { body_part } = await import('./polyself.js');
        let what;
        if (game.iflags?.last_msg === PLNMSG_ONE_ITEM_HERE)
            what = (otmp.quan === 1) ? 'it'
                 : Hallucination() ? 'they' : 'them';
        else if (otmp.dknown || !u.ublind)
            what = doname(otmp);
        else {
            const rock = (game.level.objects || [])
                .find(o => o.ox === u.ux && o.oy === u.uy
                           && o.otyp === ONAMES.ROCK);
            what = !rock ? 'something'
                 : rock.quan === 1 ? 'a rock' : 'some rocks';
        }
        if (Hallucination()) {
            const { pline } = await import('./display.js');
            const cap = what.charAt(0).toUpperCase() + what.slice(1);
            await pline(`Egads!  ${cap} bite${otmp.quan === 1 ? 's' : ''} `
                        + `your ${body_part(FOOT)}!`);
        } else {
            await You(`trip over ${what}.`);
        }
        if (!u.uarmf && otmp.otyp === ONAMES.CORPSE)
            note_unported_timeout('slip_or_trip:petrifying_corpse');
        return;
    }

    const { is_ice } = await import('./dbridge.js');
    const intrinsic = u.intrinsic || {};
    if ((intrinsic.HFumbling & FROMOUTSIDE)
        || (is_ice(u.ux, u.uy) && !rn2(3))) {
        const { pline } = await import('./display.js');
        const verb = rn2(2) ? 'slip' : 'slide';
        await pline(`You ${verb} ${is_ice(u.ux, u.uy) ? 'on' : 'off'} the ice.`);
        if (!on_foot) {
            note_unported_timeout('slip_or_trip:mounted_ice');
        } else {
            const { ACURR } = await import('./attrib.js');
            if (!rn2(10 + ACURR(A_DEX)))
                note_unported_timeout('slip_or_trip:hurtle');
        }
        return;
    }

    if (on_foot) {
        switch (rn2(4)) {
        case 1: {
            const { body_part } = await import('./polyself.js');
            const { makeplural } = await import('./objnam.js');
            await You(`trip over your own ${Hallucination()
                       ? 'elbow' : makeplural(body_part(FOOT))}.`);
            break;
        }
        case 2:
            await You(`slip ${Hallucination()
                      ? 'on a banana peel' : 'and nearly fall'}.`);
            break;
        case 3:
            await You('flounder.');
            break;
        default:
            await You('stumble.');
            break;
        }
    } else {
        /* The mounted branch uses the same rn2(4), then dismounts unless the
           saddle is cursed. Keep the draw while its steed plumbing is absent. */
        rn2(4);
        note_unported_timeout('slip_or_trip:mounted');
    }
}

// src/timeout.c:575 done_timeout()
async function done_timeout(how, which) {
    const props = which === STRANGLED ? game.u.intrinsic : game.u.uprops;
    const key = { [STONED]: 'STONED', [SLIMED]: 'SLIMED',
                  [SICK]: 'SICK', [STRANGLED]: 'HStrangled' }[which];
    props[key] |= I_SPECIAL;
    await done(how);
    props[key] &= ~I_SPECIAL;
    (game.disp ||= {}).botl = true;
}

// src/timeout.c:588 nh_timeout() - per-turn luck and intrinsic timeouts.
export async function nh_timeout() {
    const u = game.u;
    const intr = (u.intrinsic ||= {});
    let baseluck = game.flags?.moonphase === FULL_MOON ? 1 : 0;
    if (game.flags?.friday13)
        baseluck--;
    if (game.quest_status?.killed_leader)
        baseluck -= 4;
    const role = game.urole?.mnum;
    if ((role === PMNAMES.PM_ARCHEOLOGIST || role === 'PM_ARCHEOLOGIST')
        && u.uarmh?.otyp === ONAMES.FEDORA)
        baseluck++;

    const luckPeriod = (u.uhave?.amulet || u.ugangr) ? 300 : 600;
    if ((u.uluck || 0) !== baseluck
        && (game.moves || 0) % luckPeriod === 0) {
        const { stone_luck } = await import('./invent.js');
        const timeLuck = stone_luck(false);
        const noStone = !(game.invent || []).some(
            (obj) => obj.otyp === ONAMES.LUCKSTONE) && !stone_luck(true);
        if (u.uluck > baseluck && (noStone || timeLuck < 0))
            u.uluck--;
        else if (u.uluck < baseluck && (noStone || timeLuck > 0))
            u.uluck++;
    }
    /* src/timeout.c:621, successful prayer freezes every dangerous
       timeout, including wizard-set intrinsics, until prayer finishes. */
    if (u.uinvulnerable)
        return;

    if (u.uprops?.STONED)
        await stoned_dialogue();
    if (u.uprops?.SLIMED)
        await slime_dialogue();
    if (u.uprops?.VOMITING)
        await vomiting_dialogue();

    const strangled = intr.HStrangled || 0;
    if (strangled) {
        const remaining = strangled & TIMEOUT;
        if (remaining > 0 && remaining <= 5) {
            const { breathless } = await import('./mondata.js');
            const cannot_breathe = breathless(game.youmonst.data)
                || !!(intr.HMagical_breathing
                       || game.u.uprops?.MAGICAL_BREATHING);
            const alternate = cannot_breathe || !rn2(50);
            const neck = (await import('./polyself.js')).body_part(NECK);
            const ordinary = [
                'You find it hard to breathe.',
                "You're gasping for air.",
                'You can no longer breathe.',
                null,
                'You suffocate.',
            ];
            const special = [
                `Your ${neck} is becoming constricted.`,
                'Your blood is having trouble reaching your brain.',
                `The pressure on your ${neck} increases.`,
                'Your consciousness is fading.',
                'You suffocate.',
            ];
            let message = (alternate ? special : ordinary)[5 - remaining];
            if (!message) {
                const { hcolor } = await import('./do_name.js');
                const { NH_BLUE } = await import('./const.js');
                message = `You're turning ${hcolor(NH_BLUE)}.`;
            }
            await pline(message);
            if (!alternate)
                await stop_occupation();
        }
        const { exercise } = await import('./attrib.js');
        exercise(A_STR, false);
    }

    /* src/timeout.c:631 sickness_dialogue(), followed later in nh_timeout by
       the property countdown. Fatal illness abuses constitution every turn,
       even when its low-time warning text is not yet due. */
    const sick = game.u.uprops?.SICK || 0;
    if (sick) {
        const half = Math.trunc(sick / 2);
        if (half > 0 && half <= 3 && (sick % 2) !== 0) {
            const messages = ["Your illness feels worse.",
                              "Your illness is severe.",
                              "You are at Death's door."];
            await pline(messages[3 - half]);
        }
        const { exercise } = await import('./attrib.js');
        exercise(A_CON, false);
    }

    /* src/timeout.c:649, before intrinsic timeouts are decremented. */
    if (u.ucreamed)
        u.ucreamed--;

    /* include/prop.h and include/youprop.h: visit intrinsic slots in
       property-number order, independent of when JS fields were created. */
    for (const key of [
        'HFire_resistance', 'HCold_resistance', 'HSleep_resistance',
        'HDisint_resistance', 'HShock_resistance', 'HPoison_resistance',
        'HAcid_resistance', 'HStone_resistance', 'HDrain_resistance',
        'HSick_resistance', 'HAntimagic', 'HStun',
        'HConfusion', 'HBlinded', 'HDeaf',
        'SICK', 'STONED', 'HStrangled',
        'VOMITING', 'HGlib', 'SLIMED',
        'HHallucination', 'HHalluc_resistance', 'HFumbling',
        'HWounded_legs', 'HSleepy', 'HHunger',
        'HSee_invisible', 'HTelepat', 'HWarning',
        'HWarn_of_mon', 'HUndead_warning', 'HSearching',
        'HClairvoyant', 'HInfravision', 'HDetect_monsters',
        'HBlnd_resist', 'HInvis', 'HDisplaced',
        'HStealth', 'HAggravate_monster', 'HConflict',
        'HJumping', 'HTeleportation', 'HTeleport_control',
        'HLevitation', 'HFlying', 'HWwalking',
        'HSwimming', 'HMagical_breathing', 'HPasses_walls',
        'HSlow_digestion', 'HHalf_spell_damage', 'HHalf_physical_damage',
        'HRegeneration', 'HEnergy_regeneration', 'HProtection',
        'HProtection_from_shape_changers', 'HPolymorph', 'HPolymorph_control',
        'HUnchanging', 'HFast', 'HReflecting',
    ]) {
        const props = key.startsWith('H') ? intr : (u.uprops ||= {});
        const v = props[key];
        if (typeof v !== 'number' || !(v & TIMEOUT))
            continue;
        props[key] = v - 1;
        if (props[key] & TIMEOUT)
            continue;
        /* the timeout just ran out */
        switch (key) {
        case 'HAcid_resistance':
            if (!Acid_resistance()) {
                if (eating_dangerous_corpse(ACID_RES)) {
                    set_itimeout('HAcid_resistance', 1);
                    break;
                }
                if (!Unaware()) {
                    const { You } = await import('./pline.js');
                    await You('no longer feel safe from acid.');
                }
            }
            break;
        case 'HStone_resistance':
            if (!Stone_resistance()) {
                if (eating_dangerous_corpse(STONE_RES)) {
                    set_itimeout('HStone_resistance', 1);
                    break;
                }
                if (!Unaware()) {
                    const { You } = await import('./pline.js');
                    await You('no longer feel secure from petrification.');
                }
                await wielding_corpse(u.uwep, null, false);
                await wielding_corpse(u.uswapwep, null, false);
            }
            break;
        case 'SICK': {
            const { SICK_NONVOMITABLE, SICK_ALL, LOW_PM, G_UNIQ } = await import('./const.js');
            const { ACURR, adjattrib } = await import('./attrib.js');
            const { make_sick } = await import('./potion.js');
            const { name_to_mon, type_is_pname } = await import('./mondata.js');
            const { the } = await import('./objnam.js');
            if (((u.usick_type || 0) & SICK_NONVOMITABLE) === 0
                && rn2(100) < ACURR(A_CON)) {
                await pline('You have recovered from your illness.');
                await make_sick(0, null, false, SICK_ALL);
                exercise(A_CON, false);
                await adjattrib(A_CON, -1, 1);
                break;
            }
            await urgent_pline('You die from your illness.');
            const kptr = find_delayed_killer(SICK);
            game.killer ||= {};
            game.killer.format = kptr?.name ? kptr.format : KILLED_BY_AN;
            game.killer.name = kptr?.name || '';
            dealloc_killer(kptr);
            const m_idx = name_to_mon(game.killer.name, null);
            if (m_idx >= LOW_PM) {
                if (type_is_pname(game.mons[m_idx])) {
                    game.killer.format = KILLED_BY;
                } else if (game.mons[m_idx].geno & G_UNIQ) {
                    game.killer.name = the(game.killer.name);
                    game.killer.format = KILLED_BY;
                }
            }
            await done_timeout(POISONING, SICK);
            u.usick_type = 0;
            break;
        }
        case 'STONED': {
            const kptr = find_delayed_killer(STONED);
            game.killer ||= {};
            game.killer.format = kptr?.name ? kptr.format : NO_KILLER_PREFIX;
            game.killer.name = kptr?.name || 'killed by petrification';
            dealloc_killer(kptr);
            await done_timeout(STONING, STONED);
            break;
        }
        case 'SLIMED':
            await slimed_to_death(find_delayed_killer(SLIMED));
            break;
        case 'VOMITING':
            await make_vomiting(0, true);
            break;
        case 'HStrangled': {
            game.killer = {
                format: KILLED_BY,
                name: u.uburied ? 'suffocation' : 'strangulation',
            };
            await done_timeout(DIED, STRANGLED);
            if (u.uamul?.otyp === ONAMES.AMULET_OF_STRANGULATION) {
                const amulet = u.uamul;
                const { Your } = await import('./pline.js');
                await Your('amulet vanishes!');
                const { useup } = await import('./invent.js');
                useup(amulet);
            }
            break;
        }
        case 'HWounded_legs': {
            /* src/timeout.c nh_timeout WOUNDED_LEGS arm: heal_legs(0) */
            const { heal_legs } = await import('./do.js');
            intr.HWounded_legs = 1; /* Wounded_legs still true for the heal */
            await heal_legs(0);
            const { stop_occupation } = await import('./allmain.js');
            await stop_occupation();
            break;
        }
        case 'HConfusion': {
            const { make_confused } = await import('./potion.js');
            intr.HConfusion = 1; /* so make_confused works properly */
            await make_confused(0, true);
            if (!game.u.uprops?.CONFUSION) {
                const { stop_occupation } = await import('./allmain.js');
                await stop_occupation();
            }
            break;
        }
        case 'HStun': {
            const { make_stunned } = await import('./potion.js');
            intr.HStun = 1; /* preserve the old timeout for the cure */
            await make_stunned(0, true);
            break;
        }
        case 'HHallucination': {
            const { make_hallucinated } = await import('./potion.js');
            intr.HHallucination = 1;
            await make_hallucinated(0, true, 0);
            break;
        }
        case 'HBlinded': {
            const { make_blinded } = await import('./potion.js');
            intr.HBlinded = 1; /* preserve the old timeout for the cure */
            await make_blinded(0, true);
            break;
        }
        case 'HGlib': {
            const { make_glib } = await import('./potion.js');
            intr.HGlib = 1; /* preserve the old state for make_glib() */
            make_glib(0);
            break;
        }
        case 'HDeaf': {
            const { make_deaf } = await import('./potion.js');
            const { Deaf } = await import('./youprop.js');
            intr.HDeaf = (intr.HDeaf & ~TIMEOUT) | 1;
            await make_deaf(0, true);
            (game.disp ||= {}).botl = true;
            if (!Deaf())
                await stop_occupation();
            break;
        }
        case 'HFast': {
            const { Fast, Very_fast } = await import('./attrib.js');
            if (!Very_fast()) {
                const { You_feel } = await import('./pline.js');
                await You_feel(`yourself slow down${Fast() ? ' a bit' : ''}.`);
            }
            break;
        }
        case 'HSee_invisible': {
            const { newsym, see_monsters } = await import('./display.js');
            see_monsters();
            newsym(game.u.ux, game.u.uy);
            await stop_occupation();
            break;
        }
        case 'HFumbling': {
            const { Levitation, Flying, Deaf } = await import('./youprop.js');
            if (game.u.umoved && !(Levitation() || Flying())) {
                await slip_or_trip();
                nomul(-2);
                game.multi_reason = 'fumbling';
                game.nomovemsg = '';
                const { inv_weight } = await import('./attrib.js');
                if (inv_weight() > -WT_NOISY_INV) {
                    if (!Deaf()) {
                        const { You } = await import('./pline.js');
                        await You('make a lot of noise!');
                    }
                    const { wake_nearby } = await import('./mon.js');
                    await wake_nearby(false);
                }
            }
            intr.HFumbling &= ~FROMOUTSIDE;
            if (intr.HFumbling || game.u.uprops?.FUMBLING) {
                const timeout = Math.min(TIMEOUT,
                    (intr.HFumbling & TIMEOUT) + rnd(20));
                intr.HFumbling = (intr.HFumbling & ~TIMEOUT) | timeout;
            }
            break;
        }
        case 'HDetect_monsters': {
            const { see_monsters } = await import('./display.js');
            see_monsters();
            break;
        }
        default:
            note_unported_timeout(`nh_timeout:${key}`);
            break;
        }
    }

    /* wiz_intrinsic_timeout() keeps properties without a dedicated live
       HFoo slot here. They are still ordinary u.uprops timeouts in C and
       lose one turn in the same loop. */
    const wiz = game.u.wiz_intrinsic_timeouts;
    if (wiz) {
        for (const key of Object.keys(wiz)) {
            if (typeof wiz[key] !== 'number' || wiz[key] <= 0)
                continue;
            const remaining = --wiz[key];
            if (remaining === 0) {
                delete wiz[key];
                const base = game.u.wiz_intrinsic_base_props?.[key];
                if (base?.had)
                    (game.u.uprops ||= {})[key] = base.value;
                else if (game.u.uprops)
                    delete game.u.uprops[key];
                if (game.u.wiz_intrinsic_base_props)
                    delete game.u.wiz_intrinsic_base_props[key];
            } else {
                (game.u.uprops ||= {})[key] = remaining;
            }
        }
    }

    /* src/timeout.c:947 — expired timers fire at the end of nh_timeout */
    await run_timers();
}

function note_unported_timeout(what) {
    (game.unported ||= new Set()).add(what);
}

// src/timeout.c:981 attach_egg_hatch_timeout() — decide if and when the egg
// hatches: one rnd(i) per age 151..200 until a roll exceeds 150.
export function attach_egg_hatch_timeout(egg, when = 0) {
    /* C always replaces an existing hatch timer before choosing the delay. */
    stop_timer(HATCH_EGG, egg);
    if (!when) {
        for (let i = (200 - 50) + 1; i <= 200; i++)
            if (rnd(i) > 150) {
                when = i;
                break;
            }
    }
    if (when)
        start_timer(when, TIMER_OBJECT, HATCH_EGG, egg);
}

// src/timeout.c:1009 kill_egg(); prevent an egg from hatching
export function kill_egg(egg) {
    stop_timer(HATCH_EGG, egg);
}

// src/timeout.c:1017 hatch_egg() -- turn a fertile egg stack into one or more
// adjacent baby monsters, report what the hero can perceive, and consume the
// eggs which actually hatched.
export async function hatch_egg(egg, timeout) {
    if (!egg || (egg.corpsenm ?? -1) < 0)
        return;

    const { big_to_little } = await import('./mkobj.js');
    const { carried } = await import('./obj.js');
    const mnum = big_to_little(egg.corpsenm);

    let x, y;
    if (egg.where === OBJ_INVENT && (game.invent || []).includes(egg)) {
        x = game.u.ux;
        y = game.u.uy;
    } else if (egg.where === OBJ_FLOOR
               && (game.level?.objects || []).includes(egg)) {
        x = egg.ox;
        y = egg.oy;
    } else if (egg.where === OBJ_MINVENT && egg.ocarry
               && (game.level?.monsters || []).includes(egg.ocarry)
               && (egg.ocarry.minvent || []).includes(egg)) {
        x = egg.ocarry.mx;
        y = egg.ocarry.my;
    } else {
        /* C moves object timers to the saved level's timer chain. The port's
           timer queue is global, so reject an object which is not owned by
           the active level before this callback consumes any RNG. */
        return;
    }

    const isCarried = carried(egg);
    const yours = !!(egg.spe
        || (!game.flags.female && isCarried && !rn2(2)));
    const silent = timeout !== game.moves;

    const { cansee } = await import('./vision.js');
    const { enexto } = await import('./teleport.js');
    const { makemon } = await import('./makemon.js');
    let hatchcount = rnd(egg.quan | 0);
    const canseeHatchspot = cansee(x, y) && !silent;
    const ptr = game.mons[mnum];
    let mon = null, mon2 = null;
    let i = hatchcount;

    if (!(ptr.geno & MFLAGS.G_UNIQ)
        && !((game.mvitals[mnum]?.mvflags ?? 0)
             & (MFLAGS.G_GENOD | MFLAGS.G_EXTINCT))) {
        for (; i > 0; i--) {
            const cc = { x: 0, y: 0 };
            if (!enexto(cc, x, y, ptr))
                break;
            mon = await makemon(ptr, cc.x, cc.y, NO_MINVENT | MM_NOMSG);
            if (!mon)
                break;

            if ((yours && !silent)
                || (isCarried && mon.data.mlet === MONSYMS.S_DRAGON)) {
                const { initedog } = await import('./dog.js');
                initedog(mon, true);
                if (isCarried && mon.data.mlet !== MONSYMS.S_DRAGON)
                    mon.mtame = 20;
            }
            if ((game.mvitals[mnum]?.mvflags ?? 0) & MFLAGS.G_EXTINCT)
                break;
            mon2 = mon;
        }
        if (!mon)
            mon = mon2;
        hatchcount -= i;
        egg.quan -= hatchcount;
    }

    if (!mon)
        return;

    const siblings = hatchcount > 1;
    let monname = '';
    if (canseeHatchspot) {
        const { m_monnam } = await import('./do_name.js');
        const { an, makeplural } = await import('./objnam.js');
        const base = m_monnam(mon);
        monname = siblings ? `some ${makeplural(base)}` : an(base);
    }

    let knowsEgg = false;
    let redraw = false;
    if (egg.where === OBJ_INVENT) {
        const { You_feel, You_see } = await import('./pline.js');
        const { locomotion, is_silent } = await import('./mondata.js');
        knowsEgg = true;
        if (canseeHatchspot)
            await You_see(`${monname} ${locomotion(mon.data, 'drop')} out of your pack!`);
        else
            await You_feel(`something ${locomotion(mon.data, 'drop')} from your pack!`);

        const { Deaf } = await import('./youprop.js');
        if (yours) {
            const { cry_sound } = await import('./sounds.js');
            const { ing_suffix } = await import('./hacklib.js');
            await pline(`${siblings ? 'Their' : 'Its'} ${
                ing_suffix(cry_sound(mon))} ${
                is_silent(mon.data) || Deaf() ? 'seems' : 'sounds'} like "${
                game.flags.female ? 'mommy' : 'daddy'}${egg.spe ? '.' : '?'}"`);
        } else if (mon.data.mlet === MONSYMS.S_DRAGON && !Deaf()) {
            await pline('"Gleep!"');
        }
    } else if (egg.where === OBJ_FLOOR) {
        if (canseeHatchspot) {
            const { You_see } = await import('./pline.js');
            knowsEgg = true;
            await You_see(`${monname} hatch.`);
            redraw = true;
        }
    } else if (egg.where === OBJ_MINVENT && canseeHatchspot) {
        const { a_monnam } = await import('./do_name.js');
        const { s_suffix } = await import('./hacklib.js');
        const { locomotion } = await import('./mondata.js');
        const { canseemon } = await import('./display.js');
        const { is_pool } = await import('./mon.js');
        const carrier = egg.ocarry;
        let carriedby;
        if (carrier && canseemon(carrier)
            && (!carrier.wormno || cansee(carrier.mx, carrier.my))) {
            carriedby = `${s_suffix(a_monnam(carrier))} pack`;
            knowsEgg = true;
        } else {
            carriedby = is_pool(mon.mx, mon.my) ? 'empty water' : 'thin air';
        }
        const { You_see } = await import('./pline.js');
        await You_see(`${monname} ${locomotion(mon.data, 'drop')} out of ${carriedby}!`);
    }

    if (canseeHatchspot && knowsEgg) {
        game.mvitals[egg.corpsenm].mvflags |= MV_KNOWS_EGG;
        const { update_inventory } = await import('./invent.js');
        update_inventory();
    }

    const { useup, obj_extract_self, weight } = await import('./invent.js');
    if (egg.quan > 0) {
        attach_egg_hatch_timeout(egg, rnd(12));
        egg.owt = weight(egg);
    } else if (isCarried) {
        useup(egg);
    } else {
        obj_extract_self(egg);
        const { m_at } = await import('./mon.js');
        const { hideunder } = await import('./makemon.js');
        const floorMon = m_at(x, y);
        if (floorMon && !hideunder(floorMon) && cansee(x, y))
            redraw = true;
    }
    if (redraw) {
        const { newsym } = await import('./display.js');
        newsym(x, y);
    }
}

// src/timeout.c:1846 do_storms() — no lightning if not a stormy level (the
// Plane of Air) or too often even then: the rn2(8) gate is the only draw on
// 7 of 8 stormy turns. A strike sequence spends rnd(64), a cloud hunt of
// up to 100 coordinate pairs and an rn2(3) pair per strike; the bolt itself
// is buzz(), the zap beam engine, which is not ported and records.
export async function do_storms() {
    const { rn2 } = await import('./rng.js');
    const { COLNO, ROWNO, CLOUD } = await import('./const.js');

    /* no lightning if not stormy level or too often, even then */
    if (!game.level?.flags?.stormy || rn2(8))
        return;

    /* the number of strikes is 8-log2(nstrike) */
    for (let nstrike = rnd(64); nstrike <= 64; nstrike *= 2) {
        let x, y, count = 0;
        do {
            x = rnd(COLNO - 1);
            y = rn2(ROWNO);
        } while (++count < 100 && game.level.at(x, y)?.typ !== CLOUD);

        if (count < 100) {
            const dirx = rn2(3) - 1;
            const diry = rn2(3) - 1;
            if (dirx !== 0 || diry !== 0)
                note_unported_timeout('do_storms:buzz');
        }
    }

    if (game.level.at(game.u.ux, game.u.uy)?.typ === CLOUD) {
        /* Inside a cloud during a thunderstorm is deafening. */
        /* Even if already deaf, we sense the thunder's vibrations. */
        const { pline } = await import('./display.js');
        await pline('Kaboom!!!  Boom!!  Boom!!');
        /* incr_itimeout(&HDeaf, rn1(20, 30)) — the draw is C's; the
           deafness property linkage past the timer is not wired */
        const { rn1 } = await import('./rng.js');
        (game.u.intrinsic ||= {}).HDeaf =
            ((game.u.intrinsic.HDeaf | 0) + rn1(20, 30));
        game.botl = true;
        if (!game.u.uinvulnerable) {
            const { stop_occupation } = await import('./allmain.js');
            await stop_occupation();
            await nomul(-3);
            game.multi_reason = 'hiding from thunderstorm';
            game.nomovemsg = 0;
        }
    } else {
        const { You_hear } = await import('./pline.js');
        await You_hear('a rumbling noise.');
    }
}



// src/timeout.c:2404 obj_has_timer(); does the object have a timer of the
// given type?
export function obj_has_timer(object, timer_type) {
    const timeout = peek_timer(timer_type, object);

    return (timeout !== 0);
}
