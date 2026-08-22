// timeout.js — timed property expiry (timeout.c nh_timeout subset).
// C ref: timeout.c nh_timeout — once-per-turn intrinsic TIMEOUT decrement.

import { game } from './gstate.js';
import {
    TIMEOUT, FROMOUTSIDE, FUMBLING, FAST, FOOT, ICE, STRAT_WAITMASK,
    UNCHANGING, LAST_PROP, WOUNDED_LEGS, CONFUSION, BLINDED, DEAF,
    GLIB,
    STUNNED, HALLUC, LEVITATION, INVIS, SEE_INVIS, CLAIRVOYANT,
    TELEPORT, REGENERATION, DETECT_MONSTERS,
    OBJ_INVENT, OBJ_FLOOR, OBJ_MINVENT, OBJ_MIGRATING, OBJ_FREE,
    OBJ_CONTAINED, OBJ_BURIED,
    CONTAINED_TOO, BURIED_TOO, TIMER_OBJECT, BURN_OBJECT, LS_OBJECT,
    MAX_RADIUS, W_ARM,
    G_GENOD, G_EXTINCT, NO_MINVENT, MM_NOMSG, NON_PM,
    MV_KNOWS_EGG, ARTICLE_NONE, ARTICLE_A, EXACT_NAME,
    REVIVE_MON, ROT_CORPSE, ZOMBIFY_MON, RLOC_NOMSG,
    has_omid, has_omonst,
} from './const.js';
import { heal_legs } from './trap.js';
import { stop_occupation, nomul, is_pool } from './hack.js';
import { run_timers, start_timer, stop_timer, weight,
    obj_extract_self, delobj, objects_at, attach_egg_hatch_timeout,
    obj_has_timer, rider_revival_time, rot_corpse, set_corpsenm,
    free_omid, free_omonst,
} from './mkobj.js';
import { make_confused, make_slimed } from './potion.js';
import { make_blinded } from './do.js';
import { Fumbling, Fast, Very_fast } from './attrib.js';
import { pline, You_feel, newsym, canseemon, verbalize, Norep, see_monsters } from './display.js';
import { inv_weight } from './invent.js';
import { doname, makeplural, xname, an, The } from './objnam.js';
import { rn2, rnd, d } from './rng.js';
import { objectNames } from './objects.js';
import {
    G_UNIQ, is_were, mons, is_floater, is_flyer, amorphous, nolimbs,
    M1_SLITHY, MZ_SMALL, is_rider, is_displacer,
} from './monsters.js';
import { little_to_big, big_to_little } from './mondata.js';
import { dist2 } from './hacklib.js';
import { zombie_form } from './mon.js';
import { cry_sound } from './sounds.js';
import { rehumanize } from './polyself.js';
import { you_unwere } from './were.js';
import { new_light_source, del_light_source } from './light.js';
import { cansee } from './vision.js';
import { is_art } from './artifact.js';
import { ART_SUNSWORD } from './generated/artifacts_data.js';
import { Monnam, x_monnam, hcolor } from './do_name.js';
import { find_ac } from './u_init.js';

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
    [GLIB]: 'Glib',
    [DETECT_MONSTERS]: 'HDetect_monsters',
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
 * DETECT_MONSTERS TIMEOUT → see_monsters on expiry (D-1418; C timeout.c
 * `:932–934`; remaining expiry switch still silent).
 * mtimedone → rehumanize / Unchanging rnd refresh (D-0928 #1112).
 * usptime SPE_PROTECTION dissipate (D-1390; after mtimedone like C).
 * Remaining uprops TIMEOUT (incl. INVULNERABLE from #wizintrinsic) —
 * generic -- like C's for (upp = u.uprops; …) (D-0928 #1168); expiry
 * switch cases for those props still deferred (silent clear).
 * Named omissions: luck baseluck; Stoned/Slimed/Sick/… dialogues;
 * STUNNED/INVIS/SEE_INVIS/HALLUC/SLEEPY/LEVITATION/… expiry messages;
 * GLIB `make_glib(0)` inventory on expiry; ublesscnt (in allmain); ugallop; delayed
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
            if (p === GLIB) u.HGlib = next;
        }
        // Expiry switch (STONED/HALLUC/INVIS/…) deferred — silent clear
        // except DETECT_MONSTERS → see_monsters (D-1418).
        if (!(next & TIMEOUT) && p === DETECT_MONSTERS) {
            see_monsters();
        }
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

    /* C timeout.c :652–661 — dissipate SPE_PROTECTION (D-1390).
     * After mtimedone / ucreamed; before ugallop / uprops in C.
     * JS uprops arms already ran above (pre-existing order). */
    if (u.usptime) {
        u.usptime = ((u.usptime | 0) - 1) & 0xff;
        if (u.usptime === 0 && (u.uspellprot | 0)) {
            u.usptime = u.uspmtime | 0;
            u.uspellprot = ((u.uspellprot | 0) - 1) & 0xff;
            find_ac();
            if (!Blind()) {
                const hgolden = hcolor('golden'); /* NH_GOLDEN */
                await Norep(
                    `The ${hgolden} haze around you ${
                        u.uspellprot ? 'becomes less dense' : 'disappears'
                    }.`,
                );
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
    // C invent.c: #define carried(o) ((o)->where == OBJ_INVENT)
    return !!obj && obj.where === OBJ_INVENT;
}

/** C ref: zap.c get_obj_location — invent/floor/minvent + flags.
 * hatch_egg / burn_object / fig_transform / catch_lit pass 0:
 * OBJ_CONTAINED and OBJ_BURIED are false unless CONTAINED_TOO /
 * BURIED_TOO. Restore must keep cobj where=OBJ_CONTAINED
 * (restore.c restobjchn; D-1054) — not the parent chain's where. */
export function get_obj_location(obj, locflags = 0) {
    if (!obj) return null;
    switch (obj.where | 0) {
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
 * C ref: light.c obj_merge_light_sources — src folded into dest.
 * src === dest means adding candles to a lit candelabrum (range only).
 */
export function obj_merge_light_sources(src, dest) {
    if (src !== dest) end_burn(src, true);
    const list = game.light_base;
    if (!list?.length || !dest) return;
    for (const ls of list) {
        if (ls.type === LS_OBJECT && ls.id === dest) {
            ls.range = candle_light_range(dest);
            game.vision_full_recalc = 1;
            break;
        }
    }
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

function Deaf_hatch() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.Deaf
        || ((u.HDeaf | 0) & TIMEOUT) || (u.EDeaf | 0));
}

/** C mondata.h is_silent — ptr->msound == MS_SILENT. */
function is_silent_hatch(ptr) {
    return (ptr?.msound | 0) === 0;
}

/**
 * C ref: mondata.c locomotion — verb for how a monster moves.
 */
function locomotion_hatch(ptr, def) {
    const cap = !!(def && def[0] === def[0].toUpperCase()
        && def[0] !== def[0].toLowerCase());
    const pick = (lo, hi) => (cap ? hi : lo);
    if (is_floater(ptr)) return pick('float', 'Float');
    if (is_flyer(ptr) && (ptr.msize ?? 2) <= MZ_SMALL) {
        return pick('fly', 'Fly');
    }
    if (is_flyer(ptr)) return pick('fly', 'Fly');
    if (((ptr?.mflags1 ?? 0) & M1_SLITHY) !== 0) {
        return pick('slither', 'Slither');
    }
    if (amorphous(ptr)) return pick('ooze', 'Ooze');
    if (!(ptr?.mmove | 0)) return pick('wiggle', 'Wiggle');
    if (nolimbs(ptr)) return pick('crawl', 'Crawl');
    return def;
}

/** C ref: hacklib.c ing_suffix — gerund; on/off/with split + vowel doubling. */
function ing_suffix_hatch(s) {
    let buf = String(s);
    const vowel = 'aeiouwy';
    let onoff = '';
    if (/\s+on$/i.test(buf) || /\s+off$/i.test(buf) || /\s+with$/i.test(buf)) {
        const sp = buf.lastIndexOf(' ');
        onoff = buf.slice(sp);
        buf = buf.slice(0, sp);
    }
    const n = buf.length;
    if (n >= 2 && buf.slice(-2).toLowerCase() === 'er') {
        // slither + ing
    } else if (n >= 3
        && !vowel.includes(buf[n - 1].toLowerCase())
        && vowel.includes(buf[n - 2].toLowerCase())
        && !vowel.includes(buf[n - 3].toLowerCase())) {
        buf += buf[n - 1];
    } else if (n >= 2 && buf.slice(-2).toLowerCase() === 'ie') {
        buf = `${buf.slice(0, -2)}y`;
    } else if (n >= 1 && buf[n - 1].toLowerCase() === 'e') {
        buf = buf.slice(0, -1);
    }
    return `${buf}ing${onoff}`;
}

/** C ref: hacklib.c s_suffix — it→its, you→your, *s→*', else *'s. */
function s_suffix_hatch(s) {
    const buf = String(s ?? '');
    const low = buf.toLowerCase();
    if (low === 'it') return `${buf}s`;
    if (low === 'you') return `${buf}r`;
    if (buf.endsWith('s') || buf.endsWith('S')) return `${buf}'`;
    return `${buf}'s`;
}

function m_monnam_hatch(mtmp) {
    return x_monnam(mtmp, ARTICLE_NONE, null, EXACT_NAME, false);
}

function a_monnam_hatch(mtmp) {
    return x_monnam(mtmp, ARTICLE_A, null, 0, false);
}

function obfree_hatch(obj) {
    if (!obj) return;
    obj.quan = 0;
    obj.where = OBJ_FREE;
    obj.timed = 0;
}

/**
 * C ref: mkobj.c container_weight — owt = weight; recurse if contained.
 */
function container_weight_hatch(obj) {
    if (!obj) return;
    obj.owt = weight(obj);
    if ((obj.where | 0) === OBJ_CONTAINED && obj.ocontainer) {
        container_weight_hatch(obj.ocontainer);
    }
}

/**
 * C ref: timeout.c learn_egg_type — little_to_big then MV_KNOWS_EGG.
 * Named omit: update_inventory redraw after the flag.
 */
export function learn_egg_type(mnum) {
    mnum = little_to_big(mnum | 0);
    if (!game.mvitals) game.mvitals = [];
    if (!game.mvitals[mnum]) game.mvitals[mnum] = { mvflags: 0 };
    game.mvitals[mnum].mvflags = (game.mvitals[mnum].mvflags | 0) | MV_KNOWS_EGG;
}

/**
 * C ref: timeout.c hatch_egg — timer callback; spawn big_to_little of
 * egg.corpsenm. Envelope: sterilized NON_PM; yours (spe / male carried
 * rn2(2)); silent timeout!=moves; get_obj_location(0); rnd(quan);
 * G_UNIQ/G_GENOD/G_EXTINCT skip spawn; enexto+makemon NO_MINVENT|MM_NOMSG;
 * tamedog yours||carried-dragon; leftover rnd(12) re-arm; invent useup /
 * floor extract+obfree+hideunder. Named omit: SetVoice before Gleep;
 * update_inventory; migrating #if 0; impossible() unknown where.
 */
export async function hatch_egg(egg, timeout) {
    if (!egg) return;
    if ((egg.corpsenm | 0) === NON_PM) return;

    const { enexto } = await import('./teleport.js');
    const { makemon } = await import('./makemon.js');
    const { tamedog } = await import('./dog.js');
    const { useup } = await import('./eat.js');
    const { m_at, hideunder } = await import('./mon.js');

    let mon = null;
    let mon2 = null;
    const mnum = big_to_little(egg.corpsenm | 0);
    const ptr = mons(mnum);
    // C: yours = (egg->spe || (!flags.female && carried(egg) && !rn2(2)))
    const yours = !!(egg.spe
        || (!game.flags?.female && carried(egg) && !rn2(2)));
    const silent = (timeout | 0) !== (game.moves | 0);
    let hatchcount = 0;
    let cansee_hatchspot = false;
    let x = 0;
    let y = 0;

    const loc = get_obj_location(egg, 0);
    if (loc) {
        x = loc.x | 0;
        y = loc.y | 0;
        hatchcount = rnd(egg.quan | 0);
        cansee_hatchspot = cansee(x, y) && !silent;
        const mv = game.mvitals?.[mnum]?.mvflags | 0;
        if (ptr && !(ptr.geno & G_UNIQ) && !(mv & (G_GENOD | G_EXTINCT))) {
            let i = hatchcount;
            for (; i > 0; i--) {
                const cc = { x, y };
                if (!enexto(cc, x, y, ptr)
                    || !(mon = makemon(ptr, cc.x, cc.y, NO_MINVENT | MM_NOMSG))) {
                    break;
                }
                if ((yours && !silent)
                    || (carried(egg) && mon.data?.mlet === 'S_DRAGON')) {
                    if (await tamedog(mon, null, false)) {
                        if (carried(egg) && mon.data?.mlet !== 'S_DRAGON') {
                            mon.mtame = 20;
                        }
                    }
                }
                if (((game.mvitals?.[mnum]?.mvflags | 0) & G_EXTINCT) !== 0) {
                    break;
                }
                mon2 = mon;
            }
            if (!mon) mon = mon2;
            hatchcount -= i;
            egg.quan = (egg.quan | 0) - hatchcount;
        }
    }

    if (!mon) return;

    let knows_egg = false;
    let redraw = false;
    const siblings = hatchcount > 1;
    let monnambuf = '';
    if (cansee_hatchspot) {
        monnambuf = `${siblings ? 'some ' : ''}${
            siblings ? makeplural(m_monnam_hatch(mon)) : an(m_monnam_hatch(mon))
        }`;
    }

    switch (egg.where | 0) {
    case OBJ_INVENT:
        knows_egg = true;
        if (!cansee_hatchspot) {
            await You_feel(
                `something ${locomotion_hatch(mon.data, 'drop')} from your pack!`,
            );
        } else {
            await You_see(
                `${monnambuf} ${locomotion_hatch(mon.data, 'drop')} out of your pack!`,
            );
        }
        if (yours) {
            const cry = ing_suffix_hatch(cry_sound(mon));
            const seems = (is_silent_hatch(mon.data) || Deaf_hatch())
                ? 'seems' : 'sounds';
            const parent = game.flags?.female ? 'mommy' : 'daddy';
            const punct = egg.spe ? '.' : '?';
            await pline(
                `${siblings ? 'Their' : 'Its'} ${cry} ${seems} like "${parent}${punct}"`,
            );
        } else if (mon.data?.mlet === 'S_DRAGON' && !Deaf_hatch()) {
            // C SetVoice(mon, 0, 80, 0) deferred
            await verbalize('Gleep!');
        }
        break;

    case OBJ_FLOOR:
        if (cansee_hatchspot) {
            knows_egg = true;
            await You_see(`${monnambuf} hatch.`);
            redraw = true;
        }
        break;

    case OBJ_MINVENT:
        if (cansee_hatchspot) {
            const carrier = egg.ocarry;
            let carriedby;
            if (carrier && canseemon(carrier)
                && (!(carrier.wormno | 0)
                    || cansee(carrier.mx | 0, carrier.my | 0))) {
                carriedby = `${s_suffix_hatch(a_monnam_hatch(carrier))} pack`;
                knows_egg = true;
            } else if (carrier && is_pool(carrier.mx | 0, carrier.my | 0)) {
                carriedby = 'empty water';
            } else {
                carriedby = 'thin air';
            }
            await You_see(
                `${monnambuf} ${locomotion_hatch(mon.data, 'drop')} out of ${carriedby}!`,
            );
        }
        break;

    default:
        // C impossible("egg hatched where?")
        break;
    }

    if (cansee_hatchspot && knows_egg) learn_egg_type(mnum);

    if ((egg.quan | 0) > 0) {
        attach_egg_hatch_timeout(egg, rnd(12));
        container_weight_hatch(egg);
    } else if (carried(egg)) {
        useup(egg);
    } else {
        obj_extract_self(egg);
        obfree_hatch(egg);
        const hidemon = m_at(x, y);
        if (hidemon && !hideunder(hidemon) && cansee(x, y)) {
            redraw = true;
        }
    }
    if (redraw) newsym(x, y);
}

/**
 * C ref: do.c revive_mon — timeout.c REVIVE_MON callback.
 * Floor displacer bump: get_obj_location(0) then m_at then rloc(RLOC_NOMSG)
 * under stasis_until < moves; revive_corpse; rider rn2(99) retry via
 * rider_revival_time(TRUE) else ROT_CORPSE d(5,50)−age.
 * Soundeffect(se_scratching, 50) on buried hear arm lives in
 * revive_corpse (D-1222).
 * @param {object} body corpse
 * @param {number} timeout unused in C
 */
export async function revive_mon(body, timeout) {
    void timeout;
    if (!body) return;
    const mptr = mons(body.corpsenm | 0);
    if (is_displacer(mptr) && (body.where | 0) === OBJ_FLOOR) {
        const loc = get_obj_location(body, 0);
        if (loc) {
            const { m_at } = await import('./mon.js');
            const mtmp = m_at(loc.x | 0, loc.y | 0);
            if (mtmp
                && (game.level?.flags?.stasis_until | 0) < (game.moves | 0)) {
                const notice_it = canseemon(mtmp);
                const monname = Monnam(mtmp);
                const { rloc } = await import('./teleport.js');
                if (await rloc(mtmp, RLOC_NOMSG)) {
                    if (notice_it && !canseemon(mtmp)) {
                        await pline(`${monname} vanishes.`);
                    } else if (!notice_it && canseemon(mtmp)) {
                        await pline(`${Monnam(mtmp)} appears.`);
                    } else if (notice_it
                        && dist2(mtmp.mx | 0, mtmp.my | 0,
                            loc.x | 0, loc.y | 0) > 2) {
                        await pline(`${monname} teleports.`);
                    }
                }
            }
        }
    }
    const { revive_corpse } = await import('./do.js');
    if (!(await revive_corpse(body))) {
        let action;
        let when;
        if (is_rider(mptr) && rn2(99)) {
            action = REVIVE_MON;
            when = rider_revival_time(body, true);
        } else {
            if (!obj_has_timer(body, ROT_CORPSE)) {
                await You_feel(`${is_rider(mptr) ? 'much ' : ''}less hassled.`);
            }
            action = ROT_CORPSE;
            when = d(5, 50) - ((game.moves | 0) - (body.age | 0));
            if (when < 1) when = 1;
        }
        if (!obj_has_timer(body, action)) {
            start_timer(when, TIMER_OBJECT, action, body);
        }
    }
}

/**
 * C ref: do.c zombify_mon — timeout.c ZOMBIFY_MON callback.
 * zombie_form + !G_GENOD → drop omid/omonst, set_corpsenm, revive_mon;
 * else rot_corpse. xkilled gz.zombify D-1210; mhitm mdamagem D-1211.
 * @param {object} body corpse
 * @param {number} timeout passed through to revive_mon
 */
export async function zombify_mon(body, timeout) {
    if (!body) return;
    const zmon = zombie_form(mons(body.corpsenm | 0));
    const mv = game.mvitals?.[zmon]?.mvflags | 0;
    if (zmon !== NON_PM && !(mv & G_GENOD)) {
        if (has_omid(body)) free_omid(body);
        if (has_omonst(body)) free_omonst(body);
        set_corpsenm(body, zmon);
        await revive_mon(body, timeout);
    } else {
        await rot_corpse(body);
    }
}
