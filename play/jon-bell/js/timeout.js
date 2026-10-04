// timeout.js — port of nethack-c/src/timeout.c (scaffold: functions are added

import { RANGE_GLOBAL, NHF_BONESFILE, TIMER_LEVEL, TIMER_OBJECT, TIMER_NONE,
         TIMER_GLOBAL, TIMER_MONSTER, NUM_TIMER_KINDS, NUM_TIME_FUNCS, HATCH_EGG,
         OBJ_INVENT, OBJ_MIGRATING, OBJ_FLOOR, OBJ_BURIED, OBJ_CONTAINED,
         OBJ_MINVENT, BURN_OBJECT, LS_OBJECT, SHRINK_GLOB, CONTAINED_TOO,
         BURIED_TOO, NO_MINVENT, MM_NOMSG, G_EXTINCT, G_GENOD,
         MV_KNOWS_EGG, FIG_TRANSFORM } from './const.js';
import { rot_organic, rot_corpse } from './dig.js';
import { game } from './gstate.js';
import { eatfood } from './eat.js';
import { COLNO, ROWNO, CLOUD } from './const.js';
import { rn2, rn1 } from './rng.js';
import { pline, You_hear } from './display.js';
import { buzz } from './mcastu.js';
import { makemon, hideunder, ing_suffix, revive_corpse, zombie_form, set_corpsenm,
         dealloc_obj, maybe_unhide_at } from './mklev.js';
import { permonstTemplate, container_weight } from './makemon.js';
import { enexto_out } from './teleport.js';
import { tamedog } from './dog.js';
import { make_familiar } from './dog.js';
import { cansee } from './vision.js';
import { m_monnam, locomotion, big_to_little, little_to_big, a_monnam } from './mhitm.js';
import { makeplural, an } from './objnam.js';
import { newsym, You_see, canseemon, Deaf } from './display.js';
import { useup, useupall, obj_extract_self_general, verbalize, Yname2 } from './cmd.js';
import { obfree, is_ice } from './dokick.js';
import { m_at, setmnotwielded } from './uhitm.js';
import { is_pool } from './look.js';
import { s_suffix } from './hacklib.js';
import { cry_sound } from './sounds.js';
import { Blind } from './vision.js';
import { Norep } from './display.js';
import { hcolor } from './mhitm.js';
import { melt_ice_zap } from './zap.js';
import { find_ac } from './do_wear.js';
import { remove_worn_item } from './steal.js';
import { encumber_msg, near_capacity } from './weight.js';
import { OC_WEIGHT } from './oc_weight.generated.js';
import {
    new_light_source, del_light_source, get_obj_location,
    artifact_light, arti_light_radius, candle_light_range,
} from './light.js';
import { update_inventory } from './mhitm.js';
import { nomul, stop_occupation } from './allmain.js';
import { rnd } from './rng.js';
import {
    INVULNERABLE, STONED, SLIMED, STRANGLED, SICK, STUNNED, CONFUSION, HALLUC,
    BLINDED, DEAF, VOMITING, GLIB, WOUNDED_LEGS, SLEEPY, TELEPORT, POLYMORPH,
    LEVITATION, FAST, CLAIRVOYANT, DETECT_MONSTERS, SEE_INVIS, INVIS, ACID_RES,
    STONE_RES, DISPLACED, PASSES_WALLS, MAGICAL_BREATHING, WWALKING, FIRE_RES,
    COLD_RES, SLEEP_RES, DISINT_RES, SHOCK_RES, POISON_RES, DRAIN_RES, SICK_RES,
    ANTIMAGIC, HALLUC_RES, BLND_RES, FUMBLING, HUNGER, TELEPAT, WARNING,
    WARN_OF_MON, WARN_UNDEAD, SEARCHING, INFRAVISION, ADORNED, STEALTH,
    AGGRAVATE_MONSTER, CONFLICT, JUMPING, TELEPORT_CONTROL, FLYING, SWIMMING,
    SLOW_DIGESTION, HALF_SPDAM, HALF_PHDAM, REGENERATION, ENERGY_REGENERATION,
    PROTECTION, PROT_FROM_SHAPE_CHANGERS, POLYMORPH_CONTROL, UNCHANGING,
    REFLECTING, FREE_ACTION, FIXED_ABIL, LIFESAVED,
} from './const.js';

/* C ref: obj.h:315 #define MAX_EGG_HATCH_TIME 200 — longest an egg can remain
 * unhatched.  Load-bearing: it is both bounds of attach_egg_hatch_timeout()'s
 * rnd() loop below, so the exact value fixes the RNG argument sequence. */
const MAX_EGG_HATCH_TIME = 200;
const G_UNIQ = 0x1000;
const S_DRAGON = 30;

/* C apply.c:2398 — delayed figurine transformation. */
async function fig_transform_timer(arg, timeout) {
    const figurine = arg?.a_obj;
    if (!figurine) return;
    const xx = { value: 0 }, yy = { value: 0 };
    if (!get_obj_location(figurine, xx, yy, 0)) {
        start_timer(rnd(5000), TIMER_OBJECT, FIG_TRANSFORM, arg);
        return;
    }
    const mon = await make_familiar(figurine, xx.value | 0, yy.value | 0, true);
    if (mon)
        await useup(figurine);
}

/* C timeout.c:1383 — the timer fires when fuel is exhausted.  The detailed
 * per-object messaging is presentation-only here; the state transition that
 * matters to subsequent turns is extinguishing the light and consuming the
 * remaining fuel. */
async function burn_object_timer(arg) {
    const obj = arg?.a_obj;
    if (!obj) return;

    /* C timeout.c:1391-1397.  A timer which expired while the object was
     * detached (level change) has already consumed all of its fuel; the
     * normal callback below is still the right state transition, but the
     * object must be removed for disposable light sources. */
    obj.age = 0;
    /* The timer element has already been removed by run_timers(), so C calls
     * end_burn(..., FALSE) here; passing TRUE would skip its light-source
     * cleanup and only work accidentally when no light source is registered. */
    end_burn(obj, false);

    const t = obj.otyp | 0;
    if (t === BURN_POT_OIL || Is_candle(obj)) {
        const onFloor = (obj.where | 0) === OBJ_FLOOR;
        const x = obj.ox | 0, y = obj.oy | 0;
        const carried = burn_carried(obj);
        if (carried)
            await useup(obj);
        else {
            obj_extract_self_general(obj);
            await obfree(obj, null);
            if (onFloor)
                maybe_unhide_at(x, y);
        }
        if (onFloor)
            newsym(x, y);
        return;
    }
    if (t === BURN_CANDELABRUM) {
        /* C leaves the candelabrum in place, but consumes all candles and
         * recomputes its weight.  `spe` is the candle count in this port. */
        obj.spe = 0;
        container_weight(obj);
    }
    if (burn_carried(obj))
        update_inventory();
    else if (obj.where === OBJ_FLOOR)
        newsym(obj.ox | 0, obj.oy | 0);
}

/* C mkobj.c:1501 — globs lose one weight unit every ~25 turns. */
async function shrinking_glob_gone(obj) {
    const where = obj.where | 0;
    if (where === OBJ_INVENT || burn_carried(obj)) {
        if (obj.owornmask) {
            await remove_worn_item(obj, false);
            await stop_occupation();
        }
        await useupall(obj);
        return;
    }
    if (where === OBJ_MIGRATING)
        obj.owornmask = 0;
    else if (where === OBJ_MINVENT && obj.owornmask && obj.ocarry?.mw === obj)
        setmnotwielded(obj.ocarry, obj);
    obj_extract_self_general(obj);
    if (where === OBJ_FLOOR)
        maybe_unhide_at(obj.ox | 0, obj.oy | 0);
    await obfree(obj, null);
}

/* C mkobj.c:1501-1647 shrink_glob(). */
async function shrink_glob_timer(arg, timeout) {
    const obj = arg?.a_obj;
    if (!obj || !obj.globby)
        return;

    let outer = obj;
    while ((outer.where | 0) === OBJ_CONTAINED && outer.ocontainer)
        outer = outer.ocontainer;
    let globloc = 0;
    const ox = outer.ox | 0, oy = outer.oy | 0;
    if ((outer.where | 0) === OBJ_FLOOR && is_ice(ox, oy)) globloc = 1;
    else if ((outer.where | 0) === OBJ_BURIED && is_ice(ox, oy)) globloc = 2;

    if ((timeout | 0) < (game.moves | 0) && globloc !== 2) {
        let delta = Math.floor(((game.moves | 0) - (timeout | 0) + 24) / 25);
        const moddelta = 25 - (delta % 25);
        if (globloc === 1)
            delta = Math.floor((delta + 2) / 3);
        if (delta >= (obj.owt | 0)) {
            obj.owt = 0;
            await shrinking_glob_gone(obj);
        } else {
            obj.owt = (obj.owt | 0) - delta;
            if ((obj.where | 0) === OBJ_CONTAINED && obj.ocontainer)
                container_weight(obj.ocontainer);
            start_timer(moddelta, TIMER_OBJECT, SHRINK_GLOB, arg);
        }
        return;
    }

    const beingEaten = game.occupation === eatfood
        && game.context?.victual?.piece === obj;
    if (beingEaten || globloc === 2
        || (globloc === 1 && ((game.moves | 0) % 3) === 1)) {
        start_timer(23 + rn2(5), TIMER_OBJECT, SHRINK_GLOB, arg);
        return;
    }

    game.iflags ??= {};
    const oldPartlyEatenHack = !!game.iflags.partly_eaten_hack;
    let globname;
    game.iflags.partly_eaten_hack = true;
    try {
        globname = Yname2(obj);
    } finally {
        game.iflags.partly_eaten_hack = oldPartlyEatenHack;
    }

    const ininv = (obj.where | 0) === OBJ_INVENT || burn_carried(obj);
    const contnr = (obj.where | 0) === OBJ_CONTAINED ? obj.ocontainer : null;
    let topcontnr = contnr;
    while (topcontnr && (topcontnr.where | 0) === OBJ_CONTAINED)
        topcontnr = topcontnr.ocontainer;
    const oldTopWeight = topcontnr ? (topcontnr.owt | 0) : 0;
    const basewt = OC_WEIGHT[obj.otyp | 0] | 0;
    const msgwt = Math.floor((Math.max(basewt, 1) + 1) / 2);
    let shrink = false, updinv = false;
    if ((obj.owt | 0) > 0) {
        shrink = ((obj.owt | 0) % msgwt) === 0;
        obj.owt = (obj.owt | 0) - 1;
        if ((obj.oeaten | 0) > 1)
            obj.oeaten = (obj.oeaten | 0) - 1;
    }
    const gone = !(obj.owt | 0);

    if (ininv) {
        if (shrink || gone)
            await pline(`${globname} ${gone ? 'dissolves completely' : 'shrinks'}.`);
        updinv = true;
    } else if (contnr) {
        container_weight(contnr);
        if (topcontnr && (topcontnr.where | 0) === OBJ_INVENT) {
            const changed = (topcontnr.owt | 0) !== oldTopWeight;
            if (gone || (shrink && changed)
                || near_capacity() !== (game.u?._oldcap | 0)) {
                await pline(`${Yname2(topcontnr)} ${changed ? 'becomes' : 'seems'}${gone ? '' : ' slightly'} lighter.`);
            }
            updinv = true;
        }
    }

    if (gone) {
        const floor = (obj.where | 0) === OBJ_FLOOR;
        const x = obj.ox | 0, y = obj.oy | 0;
        const seeit = floor && cansee(x, y);
        await shrinking_glob_gone(obj);
        if (seeit) {
            newsym(x, y);
            let fadeName = globname;
            if ((x !== (game.u?.ux | 0) || y !== (game.u?.uy | 0))
                && fadeName.startsWith('The '))
                fadeName = `A ${fadeName.slice(4)}`;
            await pline(`${fadeName} fades away.`);
        }
    } else {
        start_timer(23 + rn2(5), TIMER_OBJECT, SHRINK_GLOB, arg);
    }
    if (updinv) {
        update_inventory();
        await encumber_msg();
    }
}

/* C timeout.c:1017-1220 hatch_egg().  This is async because makemon() and
 * the display message path are async in the JS port. */
async function hatch_egg(arg, timeout) {
    const egg = arg?.a_obj;
    if (!egg || (egg.corpsenm | 0) < 0)
        return;

    const mnum = big_to_little(egg.corpsenm | 0);
    const mdat = permonstTemplate(mnum);
    const carried = (egg.where | 0) === OBJ_INVENT;
    const yours = !!egg.spe || (!game.flags?.female && carried && !rn2(2));
    const silent = (timeout | 0) !== (game.moves | 0);
    const xp = { value: 0 }, yp = { value: 0 };
    let mon = null, mon2 = null, hatchcount = 0;

    /* C get_obj_location(...,0): contained and buried eggs cannot hatch. */
    if (!get_obj_location(egg, xp, yp, 0))
        return;
    const x = xp.value | 0, y = yp.value | 0;
    hatchcount = rnd(egg.quan | 0);
    const canseeHatchspot = cansee(x, y) && !silent;
    const vitals = game.mvitals?.[mnum];
    const gone = (mdat.geno & G_UNIQ)
        || (vitals && ((vitals.mvflags | 0) & (G_GENOD | G_EXTINCT)));
    if (!gone) {
        let i;
        for (i = hatchcount; i > 0; i--) {
            const cc = enexto_out(x, y, mdat);
            if (!cc)
                break;
            mon = await makemon(mdat, cc.x, cc.y, NO_MINVENT | MM_NOMSG);
            if (!mon)
                break;
            if ((yours && !silent)
                || (carried && (mdat.mlet | 0) === S_DRAGON)) {
                if (await tamedog(mon, null, false) && carried
                    && (mdat.mlet | 0) !== S_DRAGON)
                    mon.mtame = 20;
            }
            if (game.mvitals?.[mnum]
                && ((game.mvitals[mnum].mvflags | 0) & G_EXTINCT))
                break;
            mon2 = mon;
        }
        if (!mon) mon = mon2;
        hatchcount -= i;
        egg.quan -= hatchcount;
    }
    if (!mon)
        return;
    const siblings = hatchcount > 1;
    let name = '', knowsEgg = false, redraw = false;
    if (canseeHatchspot)
        name = siblings ? 'some ' + makeplural(m_monnam(mon)) : an(m_monnam(mon));
    switch (egg.where) {
    case OBJ_INVENT:
        knowsEgg = true;
        if (!canseeHatchspot)
            await pline(`You feel something ${locomotion(mon.data, 'drop')} from your pack!`);
        else
            await You_see(`${name} ${locomotion(mon.data, 'drop')} out of your pack!`);
        if (yours) {
            await pline(`${siblings ? 'Their' : 'Its'} ${ing_suffix(cry_sound(mon))} ${
                mon.data.msound === 0 || Deaf() ? 'seems' : 'sounds'} like "${
                game.flags?.female ? 'mommy' : 'daddy'}${egg.spe ? '.' : '?'}"`);
        } else if (mon.data.mlet === S_DRAGON && !Deaf()) {
            await verbalize('Gleep!');
        }
        break;
    case OBJ_FLOOR:
        if (canseeHatchspot) {
            knowsEgg = true;
            await You_see(`${name} hatch.`);
            redraw = true;
        }
        break;
    case OBJ_MINVENT:
        if (canseeHatchspot) {
            const carrier = egg.ocarry;
            let carriedBy;
            if (canseemon(carrier) && (!carrier.wormno || cansee(carrier.mx, carrier.my))) {
                carriedBy = `${s_suffix(a_monnam(carrier))} pack`;
                knowsEgg = true;
            } else {
                carriedBy = is_pool(mon.mx, mon.my) ? 'empty water' : 'thin air';
            }
            await You_see(`${name} ${locomotion(mon.data, 'drop')} out of ${carriedBy}!`);
        }
        break;
    }
    if (canseeHatchspot && knowsEgg)
        learn_egg_type(mnum);
    if (egg.quan > 0) {
        attach_egg_hatch_timeout(egg, rnd(12));
        container_weight(egg);
    } else if (carried) {
        await useup(egg);
    } else {
        obj_extract_self_general(egg);
        await obfree(egg, null);
        mon = m_at(x, y);
        if (mon && !hideunder(mon) && cansee(x, y)) redraw = true;
    }
    if (redraw) newsym(x, y);
}

// C timeout.c:1196 learn_egg_type: hatchlings identify the adult species' egg.
export function learn_egg_type(mnum) {
    const adult = little_to_big(mnum);
    game.mvitals ||= [];
    const vital = game.mvitals[adult] ||= { mvflags: 0 };
    vital.mvflags |= MV_KNOWS_EGG;
    update_inventory();
}

export function attach_egg_hatch_timeout(egg, when) {
    let i;

    /* C timeout.c:986 — stop previous timer, if any. */
    stop_timer(HATCH_EGG, obj_to_any(egg));

    /* C timeout.c:993-999 — decide if and when to hatch. */
    if (!when) {
        for (i = (MAX_EGG_HATCH_TIME - 50) + 1; i <= MAX_EGG_HATCH_TIME; i++) {
            if (rnd(i) > 150) {
                /* egg will hatch */
                when = i;
                break;
            }
        }
    }
    /* C timeout.c:1000-1002 */
    if (when) {
        /* start_timer owns both queue insertion and the TIMER_OBJECT timed
         * count; incrementing the flag alone loses the deadline, so a later
         * set_corpsenm() cannot preserve it through stop_timer(). */
        start_timer(when, TIMER_OBJECT, HATCH_EGG, obj_to_any(egg));
    }
}

/* C ref: timeout.c:950 void fall_asleep(int how_long, boolean wakeup_msg)
 *   stop_occupation();
 *   nomul(how_long);
 *   gm.multi_reason = "sleeping";
 *   (the #if 0 deafness block, timeout.c:957-970, is dead code — not ported)
 *   u.usleep = svm.moves;
 *   gn.nomovemsg = wakeup_msg ? "You wake up." : You_can_move_again;
 *
 * RNG-free.  The occupation stop is awaited because a completed meal can
 * cross the async fpostfx/useup boundary before sleep is armed.
 *
 * The load-bearing line is `u.usleep = svm.moves` (timeout.c:972): it is the
 * flag unconscious() (trap.c:6756) reads, so it is what makes Unaware
 * (youprop.h:399) true on the slept turns and therefore what makes
 * gethungry() draw its rn2(10) at eat.c:3174 while the hero is asleep.
 * nomul() itself clears u.usleep (hack.c:4075), so the assignment MUST follow
 * the nomul() calls, exactly as C orders them. */
export async function fall_asleep(how_long, wakeup_msg) {
    const g = game;
    await stop_occupation();
    nomul(how_long);
    g.multi_reason = 'sleeping';
    if (!g.u)
        g.u = {};
    g.u.usleep = g.moves | 0; /* C timeout.c:972 — u.usleep = svm.moves */
    g.nomovemsg = wakeup_msg ? 'You wake up.' : 'You can move again.';
}

/* Resolve a map cell the same way every other module's local copy of this
 * helper does (js/cmd.js:23916 _levlAt, js/vision.js, ...) — there is no
 * shared export for it yet. */
function _levlAt(x, y) {
    const g = game;
    if (g.level && g.level.locations) return g.level.locations[x]?.[y] ?? null;
    if (g.map) return g.map[x]?.[y] ?? null;
    return null;
}

// C ref: hack.h:1476,1486 BZ_OFS_AD(adtyp) = abs(adtyp - AD_MAGM) % 10;
// BZ_M_SPELL(bztyp) = -10 - bztyp (monster spells are NEGATIVE types, so
// buzz() treats the ray as monster-fired and `type < 0` returns early when swallowed).
const AD_MAGM = 1; /* monattk.h */
function _BZ_OFS_AD(adtyp) { return Math.abs(adtyp - AD_MAGM) % 10; }
function _BZ_M_SPELL(ofs) { return -10 - ofs; }
const AD_ELEC = 6; /* monattk.h */

/* C timeout.h incr_itimeout(&HDeaf, incr) — add to the TIMEOUT bits of the
 * intrinsic without disturbing the FROMOUTSIDE-style flag bits.  HDeaf is the
 * plain u.HDeaf counter in this port, same convention as js/trap.js:5311
 * _incr_HDeaf and js/eat.js's rottenfood/choke arms. */
function _incr_HDeaf(incr) {
    const u = game.u;
    if (!u)
        return;
    u.HDeaf = (u.HDeaf | 0) + (incr | 0);
}

export async function do_storms() {
    const g = game;
    if (!g.level?.flags?.stormy || rn2(8))
        return;

    for (let nstrike = rnd(64); nstrike <= 64; nstrike *= 2) {
        let count = 0;
        let x, y;
        do {
            x = rnd(COLNO - 1);
            y = rn2(ROWNO);
        } while (++count < 100 && _levlAt(x, y)?.typ !== CLOUD);

        if (count < 100) {
            const dirx = rn2(3) - 1;
            const diry = rn2(3) - 1;
            if (dirx !== 0 || diry !== 0) {
                (g.gb ||= {}).buzzer = 0;
                await buzz(_BZ_M_SPELL(_BZ_OFS_AD(AD_ELEC)), 8, x, y, dirx, diry);
            }
        }
    }

    const u = g.u;
    if (_levlAt(u?.ux | 0, u?.uy | 0)?.typ === CLOUD) {
        /* Inside a cloud during a thunderstorm is deafening.  Even if
         * already deaf, we sense the thunder's vibrations.
         * C timeout.c:1880 Soundeffect(se_kaboom_boom_boom, 80) — audio
         * only, no RNG; omitted, same convention as js/dig.js/js/lock.js. */
        await pline('Kaboom!!!  Boom!!  Boom!!');
        _incr_HDeaf(rn1(20, 30));
        g.disp = g.disp || {};
        g.disp.botl = 1;
        if (!u?.uinvulnerable) {
            await stop_occupation();
            nomul(-3);
            g.multi_reason = 'hiding from thunderstorm';
            g.nomovemsg = 0;
        }
    } else {
        await You_hear('a rumbling noise.');
    }
}

// ── the timer chain (timeout.c) ─────────────────────────────────────────────
// C ref: decl.h — `struct timer_global gt` (gt.timer_base, the head of the
// ordered timer queue) and `struct s_timer svt` (svt.timer_id, the id counter).
//
// Both used to be MODULE-PRIVATE `let` objects here, on the stated grounds that
// "insert_timer/start_timer are not ported, so nothing ever links a
// timer_element onto this chain and it stays empty".  That was true and is the
// defect this port closes: with no queue, ROT_CORPSE never fired, so a corpse
// (40,5) is corpse > sack > oil lamp > 10 darts in this port and
// sack > oil lamp > 10 darts in C, so the square rendered "%" where C renders
//
// They now hang off the shared `game` object, because `game` is rebound per
// segment (js/gstate.js resetGame) and a module-private chain would leak every
// timer of segment 0 into segment 1.
function gtimer() {
    if (!game.gt)
        game.gt = {};
    if (game.gt.timer_base === undefined)
        game.gt.timer_base = null;
    return game.gt;
}
function stimer() {
    if (!game.svt)
        game.svt = {};
    if (game.svt.timer_id === undefined)
        game.svt.timer_id = 0;
    return game.svt;
}
/* C svm.moves.  js/allmain.js keeps the turn counter on game.moves; game.svm
 * is the shape a handful of files reach for first, so both spellings are read
 * here rather than picking one and being silently zero on the other path. */
function curmoves() {
    return (game.moves ?? 0) | 0;
}

// alloc(size) (alloc.c) — struct allocator; JS has no sizeof/malloc model, so
// a fresh field-less object stands in for the C allocation, same pattern as
// js/region.js's local alloc(_size) stub.
function alloc(_size) { return {}; }

// Sfi_ulong/Sfi_int/Sfi_fe (savefile.h) — libc-level save-file field readers;
// no JS save-file byte model exists, so these are faithful no-op stubs
// (calls_macro_or_libc), same pattern as js/region.js's Sfi_long/Sfi_int etc.
function Sfi_ulong(nhfp, val, name) { return val; }
function Sfi_int(nhfp, val, name) { return val; }
function Sfi_fe(nhfp, curr, name) { return curr; }

const timeout_funcs = [
    { f: (arg, timeout) => rot_organic(arg, timeout), cleanup: 0, name: 'rot_organic' },
    { f: (arg, timeout) => rot_corpse(arg, timeout), cleanup: 0, name: 'rot_corpse' },
    { f: async (arg) => await revive_corpse(arg?.a_obj), cleanup: 0, name: 'revive_mon' },
    { f: async (arg) => {
        const body = arg?.a_obj;
        if (!body) return false;
        const zmon = zombie_form(permonstTemplate(body.corpsenm | 0));
        if (zmon === -1) return false;
        set_corpsenm(body, zmon);
        return await revive_corpse(body);
    }, cleanup: 0, name: 'zombify_mon' },
    { f: async (arg) => (await burn_object_timer(arg)),
      cleanup: (arg, expire_time) => cleanup_burn(arg, expire_time), name: 'burn_object' },
    { f: (arg, timeout) => hatch_egg(arg, timeout), cleanup: 0, name: 'hatch_egg' },
    { f: (arg, timeout) => fig_transform_timer(arg, timeout), cleanup: 0, name: 'fig_transform' },
    { f: (arg, timeout) => shrink_glob_timer(arg, timeout), cleanup: 0, name: 'shrink_glob' },
    { f: async (arg) => {
        const where = Number(arg?.a_long ?? 0);
        const x = (where >> 16) & 0xffff;
        const y = where & 0xffff;
        await melt_ice_zap(x, y, 'Some ice melts away.');
    }, cleanup: 0, name: 'melt_ice_away' },
];

/* C ref: timeout.c:2467-2481 insert_timer(timer_element *gnu) — link into the
 * global queue, kept sorted by ascending `timeout`.  New timers go AFTER any
 * existing timer with an equal timeout (the loop breaks on `>=`, inserting
 * before the first strictly-later element), which is what makes the fire order
 * of same-turn timers deterministic. */
export function insert_timer(gnu) {
    const gt = gtimer();
    let curr, prev;

    for (prev = null, curr = gt.timer_base; curr; prev = curr, curr = curr.next)
        if (curr.timeout >= gnu.timeout)
            break;

    gnu.next = curr;
    if (prev)
        prev.next = gnu;
    else
        gt.timer_base = gnu;
}

/* C ref: timeout.c:2487-2506 remove_timer(timer_element **base, short
 * func_index, anything *arg) — unlink and return the matching element. */
function remove_timer(func_index, arg) {
    const gt = gtimer();
    let prev, curr;

    for (prev = null, curr = gt.timer_base; curr; prev = curr, curr = curr.next)
        if (curr.func_index === func_index && curr.arg.a_obj === arg.a_obj
            && curr.arg.a_long === arg.a_long)
            break;

    if (curr) {
        if (prev)
            prev.next = curr.next;
        else
            gt.timer_base = curr.next;
    }
    return curr;
}

/* C ref: timeout.c:2222-2242 run_timers(void) — pick off queue elements whose
 * timeout has arrived and call their functions.  Elements may be added or
 * deleted by a handler, so the head is re-read every iteration. */
export async function run_timers() {
    const gt = gtimer();
    let curr;

    while (gt.timer_base && gt.timer_base.timeout <= curmoves()) {
        curr = gt.timer_base;
        gt.timer_base = curr.next;

        if (curr.kind === TIMER_OBJECT)
            curr.arg.a_obj.timed = (curr.arg.a_obj.timed | 0) - 1;
        await timeout_funcs[curr.func_index].f(curr.arg, curr.timeout);
        /* C memsets and frees curr here; JS drops the reference instead */
    }
}

/* C ref: timeout.c:2246-2292 start_timer(long when, short kind, short
 * func_index, anything *arg).  Returns TRUE on success.  C panics on a bad
 * kind/func_index and impossible()s (returning FALSE, timer not started) on a
 * duplicate <kind, func_index, arg> — both reproduced. */
export function start_timer(when, kind, func_index, arg) {
    let gnu, dup;

    if (kind <= TIMER_NONE || kind >= NUM_TIMER_KINDS
        || func_index < 0 || func_index >= NUM_TIME_FUNCS)
        throw new Error(`start_timer (kind ${kind}: ${func_index})`);

    /* fail if <arg> already has a <func_index> timer running */
    for (dup = gtimer().timer_base; dup; dup = dup.next)
        if (dup.kind === kind && dup.func_index === func_index
            && dup.arg.a_obj === arg.a_obj && dup.arg.a_long === arg.a_long)
            break;
    if (dup) {
        /* C impossible("Attempted to start duplicate %s, aborted.") — a warning
         * that returns FALSE and leaves the existing timer alone. */
        return false;
    }

    const svt = stimer();
    gnu = alloc(/* sizeof(timer_element) */);
    gnu.next = null;
    gnu.tid = svt.timer_id++;
    gnu.timeout = curmoves() + (when | 0);
    gnu.kind = kind;
    gnu.needs_fixup = 0;
    gnu.func_index = func_index;
    gnu.arg = arg;
    insert_timer(gnu);

    if (kind === TIMER_OBJECT) /* increment object's timed count */
        arg.a_obj.timed = (arg.a_obj.timed | 0) + 1;

    return true;
}

/* C ref: timeout.c:2298-2317 stop_timer(short func_index, anything *arg) —
 * remove the timer and return the time remaining, or 0 if there was none. */
export function stop_timer(func_index, arg) {
    let cleanup_func;
    const doomed = remove_timer(func_index, arg);

    if (doomed) {
        const timeout = doomed.timeout;
        if (doomed.kind === TIMER_OBJECT)
            arg.a_obj.timed = (arg.a_obj.timed | 0) - 1;
        if ((cleanup_func = timeout_funcs[doomed.func_index].cleanup) !== 0)
            cleanup_func(arg, timeout);
        return timeout - curmoves();
    }
    return 0;
}

/* C ref: timeout.c:2323-2334 peek_timer(short type, anything *arg). */
export function peek_timer(type, arg) {
    for (let curr = gtimer().timer_base; curr; curr = curr.next) {
        if (curr.func_index === type && curr.arg.a_obj === arg.a_obj
            && curr.arg.a_long === arg.a_long)
            return curr.timeout;
    }
    return 0;
}

/* C ref: timeout.c:2338-2354 obj_move_timers(struct obj *src, struct obj *dest)
 * — move all object timers from src to dest, leaving src untimed. */
export function obj_move_timers(src, dest) {
    let count = 0;

    for (let curr = gtimer().timer_base; curr; curr = curr.next)
        if (curr.kind === TIMER_OBJECT && curr.arg.a_obj === src) {
            curr.arg.a_obj = dest;
            dest.timed = (dest.timed | 0) + 1;
            count++;
        }
    if (count !== (src.timed | 0))
        throw new Error('obj_move_timers');
    src.timed = 0;
}

/* C ref: timeout.c:2358-2371 obj_split_timers(struct obj *src,
 * struct obj *dest) — duplicate src's object timers onto dest. */
export function obj_split_timers(src, dest) {
    let curr, next_timer = null;

    for (curr = gtimer().timer_base; curr; curr = next_timer) {
        next_timer = curr.next; /* things may be inserted */
        if (curr.kind === TIMER_OBJECT && curr.arg.a_obj === src) {
            start_timer(curr.timeout - curmoves(), TIMER_OBJECT,
                        curr.func_index, obj_to_any(dest));
        }
    }
}

/* C ref: timeout.c:2376-2399 obj_stop_timers(struct obj *obj) — stop every
 * timer attached to this object. */
export function obj_stop_timers(obj) {
    let cleanup_func;
    let curr, prev, next_timer = null;
    const gt = gtimer();

    for (prev = null, curr = gt.timer_base; curr; curr = next_timer) {
        next_timer = curr.next;
        if (curr.kind === TIMER_OBJECT && curr.arg.a_obj === obj) {
            if (prev)
                prev.next = curr.next;
            else
                gt.timer_base = curr.next;
            if ((cleanup_func = timeout_funcs[curr.func_index].cleanup) !== 0)
                cleanup_func(curr.arg, curr.timeout);
        } else {
            prev = curr;
        }
    }
    obj.timed = 0;
}

/* C ref: timeout.c:2404-2411 obj_has_timer(struct obj *, short timer_type). */
export function obj_has_timer(object, timer_type) {
    return peek_timer(timer_type, obj_to_any(object)) !== 0;
}

// C ref: timeout.c:2406-2429 spot_stop_timers(coordxy x, coordxy y, short func_index)
// Stop all TIMER_LEVEL timers of type func_index that are anchored at (x,y).
export function spot_stop_timers(x, y, func_index) {
    let cleanup_func;
    let curr, prev, next_timer = null;
    const where = ((x << 16) | y);
    const gt = gtimer();

    for (prev = null, curr = gt.timer_base; curr; curr = next_timer) {
        next_timer = curr.next;
        if (curr.kind === TIMER_LEVEL && curr.func_index === func_index
            && curr.arg.a_long === where) {
            if (prev)
                prev.next = curr.next;
            else
                gt.timer_base = curr.next;
            if ((cleanup_func = timeout_funcs[curr.func_index].cleanup) !== 0)
                cleanup_func(curr.arg, curr.timeout);
            /* C memsets and frees curr here; JS drops the reference instead */
        } else {
            prev = curr;
        }
    }
}

/* C ref: timeout.c:2564-2578 mon_is_local(struct monst *mon) — a monster that
 * is migrating or accompanying the hero does NOT stay behind with the level. */
function mon_is_local(mon) {
    for (let curr = game.migrating_mons; curr; curr = curr.nmon)
        if (curr === mon)
            return false;
    /* `gm.mydogs' is used during level changes, never saved and restored */
    for (let curr = game.mydogs; curr; curr = curr.nmon)
        if (curr === mon)
            return false;
    return true;
}

/* C ref: timeout.c:2582-2601 obj_is_local(struct obj *obj). */
function obj_is_local(obj) {
    switch (obj.where | 0) {
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
    }
    /* C panics here.  A timer on an OBJ_FREE/OBJ_DELETED object is a leak this
     * port must not paper over, but it must not lose the whole replay either:
     * treat it as local so it departs with the level it was last seen on. */
    return true;
}

/* C ref: timeout.c:2603-2617 timer_is_local(timer_element *). */
function timer_is_local(timer) {
    switch (timer.kind) {
    case TIMER_LEVEL:
        return true;
    case TIMER_GLOBAL:
        return false;
    case TIMER_OBJECT:
        return obj_is_local(timer.arg.a_obj);
    case TIMER_MONSTER:
        return mon_is_local(timer.arg.a_monst);
    }
    throw new Error('timer_is_local');
}

export function save_timers_level() {
    const gt = gtimer();
    const saved = [];
    let curr, prev, next_timer = null;

    for (prev = null, curr = gt.timer_base; curr; curr = next_timer) {
        next_timer = curr.next;
        if (timer_is_local(curr)) {
            if (prev)
                prev.next = curr.next;
            else
                gt.timer_base = curr.next;
            curr.next = null;
            saved.push(curr);
            /* prev stays the same */
        } else {
            prev = curr;
        }
    }
    return saved;
}

/* C ref: timeout.c:2698-2714 restore_timers(nhfp, RANGE_LEVEL, adjust), the
 * insert half.  `adjust` is 0 for one's own saved level (restore.c:1170 passes
 * it only when ghostly, i.e. a bones file), so the timeouts come back ABSOLUTE
 * and the ones that expired while away fire on the next run_timers(). */
export function restore_timers_level(saved, adjust = 0) {
    if (!saved)
        return;
    for (const curr of saved) {
        curr.next = null;
        if (adjust)
            curr.timeout += adjust;
        insert_timer(curr);
    }
}

/* C ref: timeout.c:2437-2450 spot_time_expires(coordxy, coordxy, short). */
export function spot_time_expires(x, y, func_index) {
    const where = ((x << 16) | y);

    for (let curr = gtimer().timer_base; curr; curr = curr.next) {
        if (curr.kind === TIMER_LEVEL && curr.func_index === func_index
            && curr.arg.a_long === where)
            return curr.timeout;
    }
    return 0;
}

/* C ref: timeout.c:2452-2458 spot_time_left(coordxy, coordxy, short). */
export function spot_time_left(x, y, func_index) {
    const expires = spot_time_expires(x, y, func_index);
    return (expires > 0) ? expires - curmoves() : 0;
}

/* C ref: hack.h obj_to_any(obj) — the `anything` union wrapper.  Local copy
 * per this tree's per-file convention (js/dig.js:619, js/mklev.js:886).
 * `a_long` is spelled out so the chain-walk comparisons above can test both
 * arms of the union without an undefined-vs-undefined false match between an
 * object timer and a level timer. */
function obj_to_any(o) { return { a_obj: o, a_long: null }; }

// C ref: timeout.c:2698-2714 restore_timers(NHFILE *nhfp, int range, long adjust)
export function restore_timers(nhfp, range, adjust) {
    let count = 0;
    let curr;
    const ghostly = (nhfp.ftype === NHF_BONESFILE);

    if (range === RANGE_GLOBAL) {
        const svt = stimer();
        svt.timer_id = Sfi_ulong(nhfp, svt.timer_id, "timer-timer_id");
    }

    /* restore elements */
    count = Sfi_int(nhfp, count, "timer-timer_count");
    while (count-- > 0) {
        curr = alloc(/* sizeof(timer_element) */);
        curr = Sfi_fe(nhfp, curr, "timer");
        if (ghostly)
            curr.timeout += adjust;
        insert_timer(curr);
    }
}


/* C ref: timeout.c:27-114
 *     static const struct propname { int prop_num; const char *prop_name; }
 *     propertynames[] = { ... , { 0, 0 } };
 * "used by wizard mode #timeout and #wizintrinsic; order by 'interest' for
 *  timeout countdown, where most won't occur in normal play" — this ORDER is
 * what indexes the #wizintrinsic menu, so it is load-bearing, not cosmetic.
 * The trailing { 0, 0 } terminator is kept because both callers loop on
 * `(propname = property_by_index(i, &p)) != 0`. */
const propertynames = [
    [INVULNERABLE, "invulnerable"],
    [STONED, "petrifying"],
    [SLIMED, "becoming slime"],
    [STRANGLED, "strangling"],
    [SICK, "fatally sick"],
    [STUNNED, "stunned"],
    [CONFUSION, "confused"],
    [HALLUC, "hallucinating"],
    [BLINDED, "blinded"],
    [DEAF, "deafness"],
    [VOMITING, "vomiting"],
    [GLIB, "slippery fingers"],
    [WOUNDED_LEGS, "wounded legs"],
    [SLEEPY, "sleepy"],
    [TELEPORT, "teleporting"],
    [POLYMORPH, "polymorphing"],
    [LEVITATION, "levitating"],
    [FAST, "very fast"],
    [CLAIRVOYANT, "clairvoyant"],
    [DETECT_MONSTERS, "monster detection"],
    [SEE_INVIS, "see invisible"],
    [INVIS, "invisible"],
    [ACID_RES, "acid resistance"],
    [STONE_RES, "stoning resistance"],
    [DISPLACED, "displaced"],
    [PASSES_WALLS, "pass thru walls"],
    [MAGICAL_BREATHING, "magical breathing"],
    [WWALKING, "water walking"],
    [FIRE_RES, "fire resistance"],
    [COLD_RES, "cold resistance"],
    [SLEEP_RES, "sleep resistance"],
    [DISINT_RES, "disintegration resistance"],
    [SHOCK_RES, "shock resistance"],
    [POISON_RES, "poison resistance"],
    [DRAIN_RES, "drain resistance"],
    [SICK_RES, "sickness resistance"],
    [ANTIMAGIC, "magic resistance"],
    [HALLUC_RES, "hallucination resistance"],
    [BLND_RES, "light-induced blindness resistance"],
    [FUMBLING, "fumbling"],
    [HUNGER, "voracious hunger"],
    [TELEPAT, "telepathic"],
    [WARNING, "warning"],
    [WARN_OF_MON, "warn: monster type or class"],
    [WARN_UNDEAD, "warn: undead"],
    [SEARCHING, "searching"],
    [INFRAVISION, "infravision"],
    [ADORNED, "adorned (+/- Cha)"],
    [STEALTH, "stealthy"],
    [AGGRAVATE_MONSTER, "monster aggravation"],
    [CONFLICT, "conflict"],
    [JUMPING, "jumping"],
    [TELEPORT_CONTROL, "teleport control"],
    [FLYING, "flying"],
    [SWIMMING, "swimming"],
    [SLOW_DIGESTION, "slow digestion"],
    [HALF_SPDAM, "half spell damage"],
    [HALF_PHDAM, "half physical damage"],
    [REGENERATION, "HP regeneration"],
    [ENERGY_REGENERATION, "energy regeneration"],
    [PROTECTION, "extra protection"],
    [PROT_FROM_SHAPE_CHANGERS, "protection from shape changers"],
    [POLYMORPH_CONTROL, "polymorph control"],
    [UNCHANGING, "unchanging"],
    [REFLECTING, "reflecting"],
    [FREE_ACTION, "free action"],
    [FIXED_ABIL, "fixed abilities"],
    [LIFESAVED, "life will be saved"],
    [0, null], /* C: { 0, 0 } terminator */
];

/* C ref: timeout.c:116-125
 *     const char *property_by_index(int idx, int *propertynum) {
 *         if (!IndexOkT(idx, propertynames)) idx = SIZE(propertynames) - 1;
 *         if (propertynum) *propertynum = propertynames[idx].prop_num;
 *         return propertynames[idx].prop_name;
 *     }
 * An out-of-range index is clamped to the terminator, so the name comes back
 * NULL and the caller's loop ends.  Returns [prop_num, prop_name] — the JS
 * stand-in for C's return-value + out-parameter pair. */
export function property_by_index(idx) {
    let i = idx | 0;
    if (i < 0 || i >= propertynames.length)
        i = propertynames.length - 1;
    return propertynames[i];
}


/* C obj.h:427 `#define Is_candle(otmp) ((otmp)->otyp == TALLOW_CANDLE \
 *                                       || (otmp)->otyp == WAX_CANDLE)`
 * otyps from js/oc_name_data.js OC_NAME (index == otyp): 224 "tallow candle",
 * 225 "wax candle", 226 "brass lantern", 227 "oil lamp", 228 "magic lamp",
 * 262 "Candelabrum of Invocation", 321 "oil" (POT_OIL). */
const BURN_TALLOW_CANDLE = 224, BURN_WAX_CANDLE = 225;
const BURN_BRASS_LANTERN = 226, BURN_OIL_LAMP = 227, BURN_MAGIC_LAMP = 228;
const BURN_CANDELABRUM = 262, BURN_POT_OIL = 321;

export function Is_candle(otmp) {
    const t = otmp.otyp | 0;
    return t === BURN_TALLOW_CANDLE || t === BURN_WAX_CANDLE;
}

/* C ref: obj.h:424-426
 *   #define age_is_relative(otmp) ((otmp)->otyp == BRASS_LANTERN \
 *                                  || (otmp)->otyp == OIL_LAMP \
 *                                  || (otmp)->otyp == CANDELABRUM_OF_INVOCATION \
 *                                  || Is_candle(otmp) || (otmp)->otyp == POT_OIL)
 * Kept here beside its one begin_burn-adjacent user; js/cmd.js:35261 carries
 * the same macro as a catch_lit-local `_cl_age_is_relative`. */
export function age_is_relative(otmp) {
    const t = otmp.otyp | 0;
    return t === BURN_BRASS_LANTERN || t === BURN_OIL_LAMP
        || t === BURN_CANDELABRUM || Is_candle(otmp) || t === BURN_POT_OIL;
}

function burn_carried(obj) {
    if ((obj.where | 0) === OBJ_INVENT)
        return true;
    for (let o = game.invent; o; o = o.nobj)
        if (o === obj)
            return true;
    return false;
}

/*
 * C ref: timeout.c:1670-1799.  Start a burn timeout on the given object.  If
 * not "already lit" then create a light source for the vision system.  There
 * had better not be a burn already running on the object.
 *
 * Magic lamps stay lit as long as there's a genie inside, so don't start a
 * timer.
 *
 * Burn rules:
 *      potions of oil, lamps & candles: age = # of turns of fuel left
 *      magic lamps: spe = 0 not lightable, 1 lightable forever
 *      candelabrum: age = turns of fuel left, spe = # of candles
 *
 * This is a "silent" routine - it should not print anything out.
 */
export function begin_burn(obj, already_lit) {
    let radius = 3;
    let turns = 0;
    let do_timer = true;

    /* C:1717-1718 */
    if (obj.age === 0 && (obj.otyp | 0) !== BURN_MAGIC_LAMP
        && !artifact_light(obj))
        return;

    switch (obj.otyp | 0) {
    case BURN_MAGIC_LAMP:
        /* C:1721-1724 */
        obj.lamplit = 1;
        do_timer = false;
        break;

    case BURN_POT_OIL:
        /* C:1726-1732 */
        turns = obj.age;
        if (obj.odiluted)
            turns = Math.floor((3 * turns + 2) / 4);
        radius = 1; /* very dim light */
        break;

    case BURN_BRASS_LANTERN:
    case BURN_OIL_LAMP:
        /* C:1734-1748 — magic times are 150, 100, 50, 25, and 0 */
        if (obj.age > 150)
            turns = obj.age - 150;
        else if (obj.age > 100)
            turns = obj.age - 100;
        else if (obj.age > 50)
            turns = obj.age - 50;
        else if (obj.age > 25)
            turns = obj.age - 25;
        else
            turns = obj.age;
        break;

    case BURN_CANDELABRUM:
    case BURN_TALLOW_CANDLE:
    case BURN_WAX_CANDLE:
        /* C:1750-1760 — magic times are 75, 15, and 0 */
        if (obj.age > 75)
            turns = obj.age - 75;
        else if (obj.age > 15)
            turns = obj.age - 15;
        else
            turns = obj.age;
        radius = candle_light_range(obj);
        break;

    default:
        /* C:1762-1772 — [ALI] Support artifact light sources */
        if (artifact_light(obj)) {
            obj.lamplit = 1;
            do_timer = false;
            radius = arti_light_radius(obj);
        } else {
            /* C impossible("begin burn: unexpected %s", xname(obj)) — a
             * printed warning that then falls through to `turns = obj->age`.
             * js/shk.js's impossible() is a deliberate no-op (it would ADD
             * toplines C's does print, but printing them from a port that
             * reaches impossible() where C does not is the worse error), so
             * only the fallthrough is reproduced. */
            turns = obj.age;
        }
        break;
    }

    /* C:1775-1786 */
    if (do_timer) {
        if (start_timer(turns, TIMER_OBJECT, BURN_OBJECT, obj_to_any(obj))) {
            obj.lamplit = 1;
            obj.age -= turns;
            if (burn_carried(obj) && !already_lit)
                update_inventory();
        } else {
            obj.lamplit = 0;
        }
    } else {
        if (burn_carried(obj) && !already_lit)
            update_inventory();
    }

    /* C:1788-1798 */
    if (obj.lamplit && !already_lit) {
        const x = { value: 0 }, y = { value: 0 };

        if (get_obj_location(obj, x, y, CONTAINED_TOO | BURIED_TOO))
            new_light_source(x.value, y.value, radius, LS_OBJECT,
                             obj_to_any(obj));
        /* else C impossible("begin_burn: can't get obj position") — see above */
    }
}

function cleanup_burn(arg, expire_time) {
    const obj = arg.a_obj;

    /* C:1832-1835 — impossible("cleanup_burn: obj %s not lit"); return. */
    if (!obj.lamplit)
        return;

    del_light_source(LS_OBJECT, obj_to_any(obj));
    /* C:1838-1839 — restore unused time */
    obj.age = (obj.age | 0) + ((expire_time | 0) - curmoves());
    obj.lamplit = 0;

    /* C:1842-1843.  burn_carried() is this file's OBJ_INVENT test (js/timeout.js:747):
     * it keeps C's `obj->where == OBJ_INVENT` and ADDS a gi.invent walk, because
     * this port does not stamp obj.where on every inventory path — the same
     * reason js/cmd.js:345 Shk_Your walks the chain. */
    if (burn_carried(obj))
        update_inventory();
}

/*
 * C ref: timeout.c:1801-1823.  Stop a burn timeout on the given object if a
 * timer is attached.  Darken light source.
 */
export function end_burn(obj, timer_attached) {
    /* C:1806-1809 — impossible("end_burn: obj %s not lit"); return. */
    if (!obj.lamplit)
        return;

    /* C:1811-1812 */
    if ((obj.otyp | 0) === BURN_MAGIC_LAMP || artifact_light(obj))
        timer_attached = false;

    if (!timer_attached) {
        /* C:1814-1820 — [DS] Cleanup explicitly, since timer cleanup won't
         * happen. */
        del_light_source(LS_OBJECT, obj_to_any(obj));
        obj.lamplit = 0;
        if (burn_carried(obj))
            update_inventory();
    } else if (!stop_timer(BURN_OBJECT, obj_to_any(obj))) {
        /* C:1821-1822 impossible("end_burn: obj %s not timed!") */
    }
}

// C timeout.c:653-664, before the timed-property countdown loop.
export async function nh_timeout_spell_protection() {
    const u = game.u;
    if (u.usptime && --u.usptime === 0 && u.uspellprot) {
        u.usptime = u.uspmtime;
        u.uspellprot--;
        find_ac();
        if (!Blind())
            await Norep(`The ${hcolor('golden')} haze around you ${u.uspellprot ? 'becomes less dense' : 'disappears'}.`);
    }
}
