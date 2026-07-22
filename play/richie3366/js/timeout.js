// timeout.js — timed property expiry (timeout.c nh_timeout subset).
// C ref: timeout.c nh_timeout — once-per-turn intrinsic TIMEOUT decrement.

import { game } from './gstate.js';
import {
    TIMEOUT, FROMOUTSIDE, FUMBLING, FAST, FOOT, ICE, STRAT_WAITMASK,
    UNCHANGING, LAST_PROP, WOUNDED_LEGS, CONFUSION, BLINDED, DEAF,
    STUNNED, HALLUC, LEVITATION, INVIS, SEE_INVIS, CLAIRVOYANT,
    TELEPORT, REGENERATION,
    OBJ_INVENT, OBJ_FLOOR, OBJ_MINVENT, OBJ_MIGRATING, OBJ_FREE,
    OBJ_CONTAINED, OBJ_BURIED,
    CONTAINED_TOO, BURIED_TOO, TIMER_OBJECT, BURN_OBJECT, LS_OBJECT,
    MAX_RADIUS, W_ARM,
} from './const.js';
import { heal_legs } from './trap.js';
import { stop_occupation, nomul, is_pool } from './hack.js';
import { run_timers, start_timer, stop_timer, weight,
    obj_extract_self, delobj, objects_at } from './mkobj.js';
import { make_confused, make_slimed } from './potion.js';
import { make_blinded } from './do.js';
import { Fumbling, Fast, Very_fast } from './attrib.js';
import { pline, You_feel, newsym } from './display.js';
import { inv_weight } from './invent.js';
import { doname, makeplural, xname, an, The } from './objnam.js';
import { rn2, rnd } from './rng.js';
import { objectNames } from './objects.js';
import { G_UNIQ, is_were } from './monsters.js';
import { rehumanize } from './polyself.js';
import { you_unwere } from './were.js';
import { new_light_source, del_light_source } from './light.js';
import { cansee } from './vision.js';
import { is_art } from './artifact.js';
import { ART_SUNSWORD } from './generated/artifacts_data.js';
import { Monnam } from './do_name.js';

/**
 * Props whose TIMEOUT is already decremented by the dedicated arms below
 * (flat + uprops sync). C does one loop over all uprops; JS keeps those
 * arms and skips them here to avoid double --.
 */
const TIMEOUT_DEDICATED = new Set([
    WOUNDED_LEGS, CONFUSION, BLINDED, DEAF, FUMBLING, FAST,
]);

/** Flat H* mirrors that wiz_intrinsic / make_* keep beside uprops. */
const TIMEOUT_FLAT = {
    [STUNNED]: 'HStun',
    [CONFUSION]: 'HConfusion',
    [HALLUC]: 'HHallucination',
    [BLINDED]: 'HBlinded',
    [DEAF]: 'HDeaf',
    [WOUNDED_LEGS]: 'HWounded_legs',
    [FUMBLING]: 'HFumbling',
    [LEVITATION]: 'HLevitation',
    [INVIS]: 'HInvis',
    [SEE_INVIS]: 'HSee_invisible',
    [CLAIRVOYANT]: 'HClairvoyant',
    [TELEPORT]: 'HTeleportation',
    [REGENERATION]: 'HRegeneration',
    [FAST]: 'HFast',
};

/** C ref: weight.h WT_NOISY_INV — inv_weight() threshold for noisy fumbling. */
const WT_NOISY_INV = 500;
const ROCK = objectNames.indexOf('ROCK');

/** C ref: youprop.h Unchanging — H || E via flat + uprops. */
function hero_unchanging(u = game.u || {}) {
    const e = u.uprops?.[UNCHANGING];
    return !!((u.Unchanging || u.HUnchanging || u.EUnchanging)
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/**
 * C ref: mon.c wake_nearby / wake_nearto_core — clear sleep/wait within
 * ulevel*20. G_UNIQ keep STRAT_WAITMASK (quest leaders stay meditating).
 * Named omissions: wake_msg; disturb_buried_zombies; petcall whistletime.
 */
function wake_nearby(_petcall) {
    const u = game.u || {};
    const x = u.ux | 0;
    const y = u.uy | 0;
    const distance = ((u.ulevel | 0) * 20) | 0;
    for (const mtmp of game.fmon || []) {
        if (!mtmp || mtmp.mx == null) continue;
        const dx = (mtmp.mx | 0) - x;
        const dy = (mtmp.my | 0) - y;
        if (distance === 0 || dx * dx + dy * dy < distance) {
            mtmp.msleeping = 0;
            const geno = mtmp.data?.geno | 0;
            if (!(geno & G_UNIQ) && mtmp.mstrategy != null) {
                mtmp.mstrategy &= ~STRAT_WAITMASK;
            }
        }
    }
    void _petcall;
}

/** C ref: dbridge.c / rm.h is_ice — ICE terrain; drawbridge-under deferred. */
function is_ice(x, y) {
    return game.level?.at?.(x, y)?.typ === ICE;
}

/** C ref: mondata.c body_part — FOOT; full poly deferred. */
function body_part(part) {
    if (part === FOOT) return 'foot';
    return 'body';
}

/**
 * C ref: timeout.c slip_or_trip — fumble message + optional ice/mount arms.
 * Envelope: floor-object trip (no RNG); ice/FROMOUTSIDE path with rn2(3);
 * on_foot stumble `rn2(4)` messages. Named omissions: Hallu highc bite;
 * corpse touch_petrifies; mounted rn2(4)+dismount_steed; ice hurtle/
 * confdir/`rn2(10+DEX)`; PLNMSG_ONE_ITEM_HERE pronoun; Blind/dknown polish.
 */
async function slip_or_trip() {
    const u = game.u || {};
    const on_foot = !u.usteed;
    let otmp = objects_at(u.ux | 0, u.uy | 0);
    if (otmp && on_foot && !u.uinwater && is_pool(u.ux | 0, u.uy | 0)) {
        otmp = null;
    }

    if (otmp && on_foot) {
        // C: trip over particular floor object — no rn2(4)
        let what;
        if (otmp.dknown || !u.Blind) {
            what = doname(otmp);
        } else {
            let rock = null;
            for (let o = otmp; o; o = o.nexthere) {
                if (o.otyp === ROCK) { rock = o; break; }
            }
            if (!rock) what = 'something';
            else what = ((rock.quan | 0) === 1) ? 'a rock' : 'some rocks';
        }
        if (u.Hallucination) {
            await pline(`Egads!  ${what} bites your ${body_part(FOOT)}!`);
        } else {
            await pline(`You trip over ${what}.`);
        }
        // touch_petrifies corpse arm deferred
    } else if (((u.HFumbling | 0) & FROMOUTSIDE)
        || (is_ice(u.ux | 0, u.uy | 0) && !rn2(3))) {
        // Ice / FROMOUTSIDE slip — mounted dismount + hurtle deferred
        const verb = rn2(2) ? 'slip' : 'slide';
        const prep = is_ice(u.ux | 0, u.uy | 0) ? 'on' : 'off';
        await pline(`You ${verb} ${prep} the ice.`);
        // !on_foot dismount / !rn2(10+DEX) hurtle deferred (no further RNG here)
    } else if (on_foot) {
        // C: timeout.c:1302 switch (rn2(4))
        switch (rn2(4)) {
        case 1:
            await pline(`You trip over your own ${
                u.Hallucination ? 'elbow' : makeplural(body_part(FOOT))
            }.`);
            break;
        case 2:
            await pline(`You slip ${
                u.Hallucination ? 'on a banana peel' : 'and nearly fall'
            }.`);
            break;
        case 3:
            await pline('You flounder.');
            break;
        default:
            await pline('You stumble.');
            break;
        }
    } else {
        // Mounted saddle messages + dismount_steed deferred; still burn rn2(4)
        rn2(4);
    }
}

/**
 * Sync flat HFumbling with uprops[FUMBLING].intrinsic (Boots_on mirror).
 */
function set_HFumbling(val) {
    const u = game.u || (game.u = {});
    u.HFumbling = val | 0;
    if (!u.uprops) u.uprops = {};
    const prop = u.uprops[FUMBLING] || (u.uprops[FUMBLING] = {
        intrinsic: 0, extrinsic: 0, blocked: 0,
    });
    prop.intrinsic = u.HFumbling;
}

/** Sync flat HFast with uprops[FAST].intrinsic. */
function set_HFast(val) {
    const u = game.u || (game.u = {});
    u.HFast = val | 0;
    if (!u.uprops) u.uprops = {};
    const prop = u.uprops[FAST] || (u.uprops[FAST] = {
        intrinsic: 0, extrinsic: 0, blocked: 0,
    });
    prop.intrinsic = u.HFast;
}

/**
 * C ref: potion.c incr_itimeout — add to TIMEOUT field only.
 */
function incr_itimeout_HFumbling(incr) {
    const u = game.u || {};
    const cur = (u.HFumbling | 0) | (u.uprops?.[FUMBLING]?.intrinsic | 0);
    let val = (cur & TIMEOUT) + (incr | 0);
    if (val > TIMEOUT) val = TIMEOUT;
    set_HFumbling((cur & ~TIMEOUT) | (val & TIMEOUT));
}

/**
 * C ref: timeout.c nh_timeout — decrement timed intrinsics; on TIMEOUT
 * expiry run property-specific handlers.
 * Envelope: WOUNDED_LEGS → heal_legs(0) + stop_occupation;
 * CONFUSION → set_itimeout(1) + make_confused(0,TRUE) + stop_occupation;
 * BLINDED → set_itimeout(1) + make_blinded(0,TRUE) + stop_occupation (D-0928);
 * FUMBLING → slip_or_trip + nomul(-2) + incr_itimeout rnd(20) (D-0692);
 * DEAF → make_deaf(0) on expiry (D-0911; talk if !Unaware deferred).
 * FAST → timeout decrement + slow-down You_feel when !Very_fast (D-0919).
 * mtimedone → rehumanize / Unchanging rnd refresh (D-0928 #1112).
 * Remaining uprops TIMEOUT (incl. INVULNERABLE from #wizintrinsic) —
 * generic -- like C's for (upp = u.uprops; …) (D-0928 #1168); expiry
 * switch cases for those props still deferred (silent clear).
 * Named omissions: luck baseluck; Stoned/Slimed/Sick/… dialogues;
 * STUNNED/INVIS/SEE_INVIS/HALLUC/SLEEPY/LEVITATION/… expiry messages;
 * Glib; ublesscnt (in allmain); usptime; ugallop; delayed
 * killers; defer_decor; full ice/mount slip_or_trip arms;
 * you_unwere callers beyond mtimedone (pray TROUBLE / potion).
 * u.uinvulnerable early-return freezes all TIMEOUT (D-0928 #1171).
 */
export async function nh_timeout() {
    const u = game.u || (game.u = {});
    // C: if (u.uinvulnerable) return; — freezes ALL TIMEOUT decrement (D-0928 #1171)
    if (u.uinvulnerable) return;
    // C: for (upp = u.uprops; …) if ((intrinsic & TIMEOUT) && !(--intrinsic & TIMEOUT))

    const hw = u.HWounded_legs | 0;
    if (hw & TIMEOUT) {
        // C: --upp->intrinsic then test TIMEOUT bits cleared
        const next = hw - 1;
        u.HWounded_legs = next;
        if (!(next & TIMEOUT)) {
            // C case WOUNDED_LEGS: heal_legs(0); stop_occupation();
            await heal_legs(0);
            await stop_occupation();
        }
    }

    const hc = u.HConfusion | 0;
    if (hc & TIMEOUT) {
        const next = hc - 1;
        u.HConfusion = next;
        u.Confusion = next;
        if (!(next & TIMEOUT)) {
            // C case CONFUSION: set_itimeout(&HConfusion, 1L);
            // make_confused(0L, TRUE); if (!Confusion) stop_occupation();
            u.HConfusion = ((u.HConfusion | 0) & ~TIMEOUT) | 1;
            u.Confusion = u.HConfusion;
            await make_confused(0, true);
            if (!(u.HConfusion | 0) && !(u.Confusion | 0)) {
                await stop_occupation();
            }
        }
    }

    // C case BLINDED — timeout.c:743; make_blinded(0,TRUE) + stop if cured
    const hb = u.HBlinded | 0;
    if (hb & TIMEOUT) {
        const next = hb - 1;
        u.HBlinded = next;
        // Keep uprops[BLINDED] ≡ HBlinded (C single storage; D-0928 #1171)
        if (!u.uprops) u.uprops = {};
        if (!u.uprops[BLINDED]) {
            u.uprops[BLINDED] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
        }
        u.uprops[BLINDED].intrinsic =
            ((u.uprops[BLINDED].intrinsic | 0) & ~TIMEOUT) | (next & TIMEOUT);
        if (!(next & TIMEOUT)) {
            // C: after --, was_blind = !!Blind (props, not sticky);
            // set_itimeout(&HBlinded, 1L); make_blinded(0L, TRUE);
            // if (was_blind && !Blind) stop_occupation();
            const was_blind = (!!(((u.HBlinded | 0) || (u.EBlinded | 0))
                && !(u.BBlinded | 0)))
                || !!u.uroleplay?.blind;
            u.HBlinded = ((u.HBlinded | 0) & ~TIMEOUT) | 1;
            u.uprops[BLINDED].intrinsic =
                ((u.uprops[BLINDED].intrinsic | 0) & ~TIMEOUT) | 1;
            await make_blinded(0, true);
            const still_blind = (!!(((u.HBlinded | 0) || (u.EBlinded | 0))
                && !(u.BBlinded | 0)))
                || !!u.uroleplay?.blind;
            if (was_blind && !still_blind) await stop_occupation();
        }
    }

    // C case DEAF — timeout.c:752; make_deaf(0,TRUE) talk suppressed if Unaware
    const hd = u.HDeaf | 0;
    if (hd & TIMEOUT) {
        const next = hd - 1;
        u.HDeaf = next;
        if (!(next & TIMEOUT)) {
            // C: set_itimeout(&HDeaf, 1L); make_deaf(0L, TRUE);
            // (TIMEOUT already 0 from --; set 1 so make_deaf old!=0 for botl)
            u.HDeaf = ((u.HDeaf | 0) & ~TIMEOUT) | 1;
            // make_deaf(0): clear TIMEOUT; Unaware → no "hear again" pline
            u.HDeaf = (u.HDeaf | 0) & ~TIMEOUT;
            if (game.disp) game.disp.botl = true;
            if (game.flags) game.flags.botl = true;
            const stillDeaf = !!(u.EDeaf || u.uroleplay?.deaf || u.Deaf);
            if (!stillDeaf) await stop_occupation();
        }
    }

    // C case FUMBLING — timeout.c:902
    const hf = (u.HFumbling | 0) | (u.uprops?.[FUMBLING]?.intrinsic | 0);
    if (hf & TIMEOUT) {
        const next = hf - 1;
        set_HFumbling(next);
        if (!(next & TIMEOUT)) {
            // C: if (u.umoved && !(Levitation || Flying))
            if (u.umoved && !(u.Levitation || u.Flying)) {
                await slip_or_trip();
                nomul(-2);
                game.multi_reason = 'fumbling';
                game.nomovemsg = '';
                // C: inv_weight() > (WT_NOISY_INV * -1)
                if (inv_weight() > -WT_NOISY_INV) {
                    if (!(u.HDeaf | u.Deaf)) {
                        await pline('You make a lot of noise!');
                    }
                    wake_nearby(false);
                }
            }
            // C: HFumbling &= ~FROMOUTSIDE; if (Fumbling) incr_itimeout rnd(20)
            set_HFumbling((u.HFumbling | 0) & ~FROMOUTSIDE);
            if (Fumbling()) {
                incr_itimeout_HFumbling(rnd(20));
            }
            // defer_decor deferred
        }
    }

    // C case FAST — timeout.c:725; timed FAST is Very_fast until TIMEOUT ends
    const hfast = (u.HFast | 0) | (u.uprops?.[FAST]?.intrinsic | 0);
    if (hfast & TIMEOUT) {
        const next = hfast - 1;
        set_HFast(next);
        if (!(next & TIMEOUT)) {
            // C: if (!Very_fast) You_feel("yourself slow down%s.", Fast ? " a bit" : "");
            if (!Very_fast()) {
                await You_feel(`yourself slow down${Fast() ? ' a bit' : ''}.`);
            }
        }
    }

    // C: for (upp = u.uprops; upp < u.uprops + SIZE(u.uprops); upp++)
    //    if ((upp->intrinsic & TIMEOUT) && !(--upp->intrinsic & TIMEOUT))
    // Dedicated arms above already -- those props; remaining (INVULNERABLE,
    // resistances, …) only live in uprops and were never decremented — so
    // #wizintrinsic leftovers like invulnerable [30] never cleared (D-0928).
    if (!u.uprops) u.uprops = {};
    for (let p = 1; p <= LAST_PROP; p++) {
        if (TIMEOUT_DEDICATED.has(p)) continue;
        const prop = u.uprops[p];
        if (!prop) continue;
        const intr = prop.intrinsic | 0;
        if (!(intr & TIMEOUT)) continue;
        const next = intr - 1;
        prop.intrinsic = next;
        const flat = TIMEOUT_FLAT[p];
        if (flat) {
            u[flat] = ((u[flat] | 0) & ~TIMEOUT) | (next & TIMEOUT);
            if (p === HALLUC) {
                u.Hallucination = !!(u.HHallucination & TIMEOUT);
            }
            if (p === STUNNED) u.Stunned = u.HStun;
        }
        // Expiry switch (STONED/HALLUC/INVIS/…) deferred — silent clear.
    }

    // C: u.mtimedone && !--u.mtimedone → Unchanging refresh / were / rehumanize
    if (u.mtimedone) {
        u.mtimedone = (u.mtimedone | 0) - 1;
        if (!(u.mtimedone | 0)) {
            if (hero_unchanging(u)) {
                const mlvl = game.youmonst?.data?.mlevel | 0;
                u.mtimedone = rnd(100 * mlvl + 1);
            } else if (is_were(game.youmonst?.data)) {
                // C: you_unwere(FALSE) — polycontrl may ask rehumanize
                await you_unwere(false);
            } else {
                await rehumanize();
            }
        }
    }

    // C: run_timers() at end of nh_timeout — corpse rot / object timers
    await run_timers();
}

/* ---- light / burn (timeout.c) — D-0978 ---- */

const OIL_LAMP = objectNames.indexOf('OIL_LAMP');
const MAGIC_LAMP = objectNames.indexOf('MAGIC_LAMP');
const BRASS_LANTERN = objectNames.indexOf('BRASS_LANTERN');
const POT_OIL = objectNames.indexOf('POT_OIL');
const TALLOW_CANDLE = objectNames.indexOf('TALLOW_CANDLE');
const WAX_CANDLE = objectNames.indexOf('WAX_CANDLE');
const CANDELABRUM_OF_INVOCATION = objectNames.indexOf('CANDELABRUM_OF_INVOCATION');
const GOLD_DRAGON_SCALE_MAIL = objectNames.indexOf('GOLD_DRAGON_SCALE_MAIL');
const GOLD_DRAGON_SCALES = objectNames.indexOf('GOLD_DRAGON_SCALES');

/** C ref: obj.h Is_candle */
export function Is_candle(otmp) {
    return !!otmp && ((otmp.otyp | 0) === TALLOW_CANDLE
        || (otmp.otyp | 0) === WAX_CANDLE);
}

/** C ref: obj.h age_is_relative */
export function age_is_relative(otmp) {
    if (!otmp) return false;
    const t = otmp.otyp | 0;
    return t === BRASS_LANTERN || t === OIL_LAMP
        || t === CANDELABRUM_OF_INVOCATION
        || t === TALLOW_CANDLE || t === WAX_CANDLE
        || t === POT_OIL;
}

/** C ref: obj.h ignitable */
export function ignitable(otmp) {
    if (!otmp) return false;
    const t = otmp.otyp | 0;
    return t === BRASS_LANTERN || t === OIL_LAMP
        || (t === MAGIC_LAMP && (otmp.spe | 0) > 0)
        || t === CANDELABRUM_OF_INVOCATION
        || t === TALLOW_CANDLE || t === WAX_CANDLE
        || t === POT_OIL;
}

/** C ref: artifact.c artifact_light — Sunsword + worn gold DSM/scales. */
export function artifact_light(obj) {
    if (!obj) return false;
    const t = obj.otyp | 0;
    if ((t === GOLD_DRAGON_SCALE_MAIL || t === GOLD_DRAGON_SCALES)
        && ((obj.owornmask | 0) & W_ARM) !== 0) {
        return true;
    }
    return is_art(obj, ART_SUNSWORD);
}

/** C ref: light.c candle_light_range */
export function candle_light_range(obj) {
    if (!obj) return 3;
    if ((obj.otyp | 0) === CANDELABRUM_OF_INVOCATION) {
        const spe = obj.spe | 0;
        return spe < 4 ? 2 : (spe < 7 ? 3 : 4);
    }
    if (Is_candle(obj)) {
        const n = obj.quan | 0;
        let radius = 1;
        while (radius * radius <= n && radius < MAX_RADIUS) radius++;
        return radius;
    }
    return 3;
}

/** C ref: light.c arti_light_radius */
export function arti_light_radius(obj) {
    if (!obj?.lamplit || !artifact_light(obj)) return 0;
    let res = obj.blessed ? 3 : (!obj.cursed ? 2 : 1);
    if (obj === game.u?.uskin) res = 1;
    else if ((obj.otyp | 0) === GOLD_DRAGON_SCALE_MAIL) res++;
    return res;
}

function Blind() {
    const u = game.u || {};
    return !!((u.HBlind | 0) || (u.EBlind | 0) || u.Blind
        || ((u.HBlinded | 0) & TIMEOUT) || (u.EBlinded | 0));
}

function carried(obj) {
    return !!obj && (obj.where === OBJ_INVENT
        || (game.invent || []).includes(obj));
}

/** C ref: zap.c get_obj_location — invent/floor/minvent + flags. */
export function get_obj_location(obj, locflags = 0) {
    if (!obj) return null;
    switch (obj.where) {
    case OBJ_INVENT:
        return { x: game.u?.ux | 0, y: game.u?.uy | 0 };
    case OBJ_FLOOR:
        return { x: obj.ox | 0, y: obj.oy | 0 };
    case OBJ_MINVENT:
        if (obj.ocarry && (obj.ocarry.mx | 0)) {
            return { x: obj.ocarry.mx | 0, y: obj.ocarry.my | 0 };
        }
        break;
    case OBJ_BURIED:
        if (locflags & BURIED_TOO) {
            return { x: obj.ox | 0, y: obj.oy | 0 };
        }
        break;
    case OBJ_CONTAINED:
        if (locflags & CONTAINED_TOO) {
            return get_obj_location(obj.ocontainer, locflags);
        }
        break;
    default:
        if ((game.invent || []).includes(obj)) {
            return { x: game.u?.ux | 0, y: game.u?.uy | 0 };
        }
        break;
    }
    return null;
}

function Shk_Your(obj) {
    if (carried(obj)) return 'Your ';
    if (obj?.where === OBJ_MINVENT && obj.ocarry) {
        return `${Monnam(obj.ocarry)}'s `;
    }
    return 'The ';
}

function Yname2(obj) {
    if (carried(obj)) {
        const s = `your ${xname(obj)}`;
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
    return The(xname(obj));
}

async function You_see(line) {
    if (Blind()) await pline(`You sense ${line}`);
    else await pline(`You see ${line}`);
}

function useupall_burn(otmp) {
    if (!otmp) return;
    const inv = game.invent || [];
    const idx = inv.indexOf(otmp);
    if (idx >= 0) inv.splice(idx, 1);
    otmp.quan = 0;
    otmp.where = OBJ_FREE;
}

/**
 * C ref: timeout.c burn_away_slime — clear Slimed TIMEOUT with message.
 */
export async function burn_away_slime() {
    const u = game.u || {};
    if (u.Slimed) {
        await make_slimed(0, 'The slime that covers you is burned away!');
    }
}

/**
 * C ref: timeout.c begin_burn — start BURN_OBJECT timer + LS_OBJECT light.
 * Silent. Named omit: update_inventory redraw.
 */
export function begin_burn(obj, already_lit) {
    if (!obj) return;
    let radius = 3;
    let turns = 0;
    let do_timer = true;

    if ((obj.age | 0) === 0 && (obj.otyp | 0) !== MAGIC_LAMP
        && !artifact_light(obj)) {
        return;
    }

    switch (obj.otyp | 0) {
    case MAGIC_LAMP:
        obj.lamplit = 1;
        do_timer = false;
        break;
    case POT_OIL:
        turns = obj.age | 0;
        if (obj.odiluted) turns = Math.trunc((3 * turns + 2) / 4);
        radius = 1;
        break;
    case BRASS_LANTERN:
    case OIL_LAMP:
        if ((obj.age | 0) > 150) turns = (obj.age | 0) - 150;
        else if ((obj.age | 0) > 100) turns = (obj.age | 0) - 100;
        else if ((obj.age | 0) > 50) turns = (obj.age | 0) - 50;
        else if ((obj.age | 0) > 25) turns = (obj.age | 0) - 25;
        else turns = obj.age | 0;
        break;
    case CANDELABRUM_OF_INVOCATION:
    case TALLOW_CANDLE:
    case WAX_CANDLE:
        if ((obj.age | 0) > 75) turns = (obj.age | 0) - 75;
        else if ((obj.age | 0) > 15) turns = (obj.age | 0) - 15;
        else turns = obj.age | 0;
        radius = candle_light_range(obj);
        break;
    default:
        if (artifact_light(obj)) {
            obj.lamplit = 1;
            do_timer = false;
            radius = arti_light_radius(obj);
        } else {
            turns = obj.age | 0;
        }
        break;
    }

    if (do_timer) {
        if (start_timer(turns, TIMER_OBJECT, BURN_OBJECT, obj)) {
            obj.lamplit = 1;
            obj.age = (obj.age | 0) - turns;
            // update_inventory deferred
        } else {
            obj.lamplit = 0;
        }
    } else if (carried(obj) && !already_lit) {
        // update_inventory deferred
    }

    if (obj.lamplit && !already_lit) {
        const loc = get_obj_location(obj, CONTAINED_TOO | BURIED_TOO);
        if (loc) new_light_source(loc.x, loc.y, radius, LS_OBJECT, obj);
    }
}

/**
 * C ref: timeout.c end_burn — snuff or timer-less light off.
 * timer_attached TRUE → stop_timer (+ cleanup_burn via mkobj).
 */
export function end_burn(obj, timer_attached) {
    if (!obj?.lamplit) return;
    if ((obj.otyp | 0) === MAGIC_LAMP || artifact_light(obj)) {
        timer_attached = false;
    }
    if (!timer_attached) {
        del_light_source(LS_OBJECT, obj);
        obj.lamplit = 0;
        return;
    }
    stop_timer(BURN_OBJECT, obj);
}

/**
 * C ref: timeout.c burn_object — BURN_OBJECT timer callback.
 * Envelope: fuel milestones + burn-out useup; away-timeout catch-up.
 * Named omit: maybe_unhide_at polish; update_inventory redraw.
 */
export async function burn_object(obj, timeout) {
    if (!obj) return;
    const moves = game.moves | 0;
    const menorah = (obj.otyp | 0) === CANDELABRUM_OF_INVOCATION;
    const many = menorah ? (obj.spe | 0) > 1 : (obj.quan | 0) > 1;

    if ((timeout | 0) !== moves) {
        const how_long = moves - (timeout | 0);
        if (how_long >= (obj.age | 0)) {
            obj.age = 0;
            end_burn(obj, false);
            if (menorah) {
                obj.spe = 0;
                obj.owt = weight(obj);
            } else if (Is_candle(obj) || (obj.otyp | 0) === POT_OIL) {
                obj_extract_self(obj);
                delobj(obj);
            }
        } else {
            obj.age = (obj.age | 0) - how_long;
            begin_burn(obj, true);
        }
        return;
    }

    const loc = get_obj_location(obj, 0);
    const canseeit = !Blind() && !!loc && cansee(loc.x, loc.y);
    const whose = Shk_Your(obj);
    const bytouch = obj.where === OBJ_INVENT
        && (obj.otyp | 0) !== BRASS_LANTERN;
    let need_newsym = false;

    switch (obj.otyp | 0) {
    case POT_OIL:
        if (canseeit) {
            if (obj.where === OBJ_INVENT || obj.where === OBJ_MINVENT) {
                await pline(`${whose}potion of oil has burnt away.`);
            } else if (obj.where === OBJ_FLOOR) {
                await You_see('a burning potion of oil go out.');
                need_newsym = true;
            }
        }
        end_burn(obj, false);
        if (carried(obj)) useupall_burn(obj);
        else {
            if (obj.where === OBJ_MIGRATING) obj.owornmask = 0;
            obj_extract_self(obj);
            delobj(obj);
        }
        obj = null;
        break;

    case BRASS_LANTERN:
    case OIL_LAMP: {
        const age = obj.age | 0;
        if (age === 150 || age === 100 || age === 50) {
            if (canseeit) {
                if ((obj.otyp | 0) === BRASS_LANTERN) {
                    if (obj.where === OBJ_INVENT) {
                        await pline('Your lantern is getting dim.');
                    } else if (obj.where === OBJ_FLOOR) {
                        await You_see('a lantern getting dim.');
                    } else if (obj.where === OBJ_MINVENT && obj.ocarry) {
                        await pline(
                            `${Monnam(obj.ocarry)}'s lantern is getting dim.`,
                        );
                    }
                } else {
                    const considerably = age === 50 ? ' considerably' : '';
                    if (obj.where === OBJ_INVENT || obj.where === OBJ_MINVENT) {
                        await pline(
                            `${Yname2(obj)} flickers${considerably}.`,
                        );
                    } else if (obj.where === OBJ_FLOOR) {
                        await You_see(
                            `${an(xname(obj))} flicker${considerably}.`,
                        );
                    }
                }
            }
        } else if (age === 25) {
            if (canseeit) {
                if ((obj.otyp | 0) === BRASS_LANTERN) {
                    if (obj.where === OBJ_INVENT) {
                        await pline('Your lantern is getting dim.');
                    } else if (obj.where === OBJ_FLOOR) {
                        await You_see('a lantern getting dim.');
                    }
                } else if (obj.where === OBJ_INVENT
                    || obj.where === OBJ_MINVENT) {
                    await pline(`${Yname2(obj)} seems about to go out.`);
                } else if (obj.where === OBJ_FLOOR) {
                    await You_see(`${an(xname(obj))} about to go out.`);
                }
            }
        } else if (age === 0) {
            if (canseeit || bytouch) {
                if (obj.where === OBJ_INVENT || obj.where === OBJ_MINVENT) {
                    if ((obj.otyp | 0) === BRASS_LANTERN) {
                        await pline(`${whose}lantern has run out of power.`);
                    } else {
                        await pline(`${Yname2(obj)} has gone out.`);
                    }
                } else if (obj.where === OBJ_FLOOR) {
                    if ((obj.otyp | 0) === BRASS_LANTERN) {
                        await You_see('a lantern run out of power.');
                    } else {
                        await You_see(`${an(xname(obj))} go out.`);
                    }
                }
            }
            end_burn(obj, false);
        }
        if (obj && (obj.age | 0)) begin_burn(obj, true);
        break;
    }

    case CANDELABRUM_OF_INVOCATION:
    case TALLOW_CANDLE:
    case WAX_CANDLE: {
        const age = obj.age | 0;
        if (age === 75) {
            if (canseeit) {
                if (obj.where === OBJ_INVENT || obj.where === OBJ_MINVENT) {
                    await pline(
                        `${whose}${menorah ? "candelabrum's " : ''}candle${
                            many ? 's are' : ' is'} getting short.`,
                    );
                } else if (obj.where === OBJ_FLOOR) {
                    await You_see(
                        `${menorah ? "a candelabrum's " : many ? 'some ' : 'a '
                        }candle${many ? 's' : ''} getting short.`,
                    );
                }
            }
        } else if (age === 15) {
            if (canseeit) {
                if (obj.where === OBJ_INVENT || obj.where === OBJ_MINVENT) {
                    await pline(
                        `${whose}${menorah ? "candelabrum's " : ''}candle${
                            many ? "s'" : "'s"} flame${many ? 's' : ''} flicker${
                            many ? '' : 's'} low!`,
                    );
                } else if (obj.where === OBJ_FLOOR) {
                    await You_see(
                        `${menorah ? "a candelabrum's " : many ? 'some ' : 'a '
                        }candle${many ? "s'" : "'s"} flame${
                            many ? 's' : ''} flicker low!`,
                    );
                }
            }
        } else if (age === 0) {
            if (canseeit || bytouch) {
                if (menorah) {
                    if (obj.where === OBJ_INVENT || obj.where === OBJ_MINVENT) {
                        await pline(
                            `${whose}candelabrum's flame${
                                many ? 's die' : ' dies'}.`,
                        );
                    } else if (obj.where === OBJ_FLOOR) {
                        await You_see(
                            `a candelabrum's flame${many ? 's' : ''} die.`,
                        );
                    }
                } else {
                    if (obj.where === OBJ_INVENT || obj.where === OBJ_MINVENT) {
                        await pline(
                            `${Yname2(obj)} ${many ? 'are' : 'is'} consumed!`,
                        );
                    } else if (obj.where === OBJ_FLOOR) {
                        await You_see(
                            `${many ? 'some ' : ''}${
                                many ? xname(obj) : an(xname(obj))
                            } consumed!`,
                        );
                        need_newsym = true;
                    }
                    const u = game.u || {};
                    const hallu = !!(u.Hallucination
                        || ((u.HHallucination | 0) & TIMEOUT));
                    const msg = hallu
                        ? (many ? 'They shriek!' : 'It shrieks!')
                        : Blind() ? ''
                            : (many ? 'Their flames die.' : 'Its flame dies.');
                    if (msg) await pline(msg);
                }
            }
            end_burn(obj, false);
            if (menorah) {
                obj.spe = 0;
                obj.owt = weight(obj);
            } else if (carried(obj)) {
                useupall_burn(obj);
                obj = null;
            } else {
                const onfloor = obj.where === OBJ_FLOOR;
                if (obj.where === OBJ_MIGRATING) obj.owornmask = 0;
                obj_extract_self(obj);
                void onfloor;
                delobj(obj);
                obj = null;
            }
        }
        if (obj && (obj.age | 0)) begin_burn(obj, true);
        break;
    }

    default:
        break;
    }
    if (need_newsym && loc) newsym(loc.x, loc.y);
}
