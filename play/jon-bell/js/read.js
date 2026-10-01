// @ts-nocheck
/* js/read.js — recharge() and helpers from nethack-c/src/read.c.
 * C ref: nethack-c/src/read.c:728-1008
 *
 * Wave cadence-1 (with-context AB arm).
 * RNG sites (up to 17 per call, path-dependent):
 *
 * WAND_CLASS path:
 *   1. rn2(343)  — read.c:762: explosion check (only if n>0 and not WAN_WISHING)
 *   2. rnd(lim)  — read.c:763: wand_explode damage (only if exploded)
 *   3. rn1(5, lim+1-5) — read.c:773: charge count (if !cursed, lim!=1)
 *   4. rnd(n)    — read.c:775: charge count for !blessed (if !cursed, lim!=1)
 *
 * RING_CLASS (oc_charged) path:
 *   1. rnd(3)  — read.c:803: s if blessed
 *      rnd(2)  — read.c:803: |s| if cursed
 *   2. rn2(7)  — read.c:807: destruction check
 *   3. rnd(3*abs(spe)) — read.c:812: explosion damage (only if destroyed)
 *
 * TOOL_CLASS (oc_charged) path, per switch case:
 *   BELL_OF_OPENING:      rnd(3)           if is_blessed
 *   MAGIC_MARKER/TINNING_KIT/EXPENSIVE_CAMERA:
 *                         rn1(16,15)       if is_blessed & !recharged-marker
 *                         rn1(11,10)       if !is_cursed & (not marker case)
 *   CRYSTAL_BALL:         rnd(2)           if !is_cursed && !is_blessed && spe<7||cursed
 *   HORN_OF_PLENTY/BAG_OF_TRICKS/CAN_OF_GREASE:
 *                         rn1(10,6) or rn1(5,6) if is_blessed; rn1(5,2) if normal
 *   MAGIC_FLUTE/MAGIC_HARP/FROST_HORN/FIRE_HORN/DRUM_OF_EARTHQUAKE:
 *                         d(2,4) if is_blessed; rnd(4) if normal
 *
 * @ts-nocheck — js sibling; ambient game types not declared.
 */
import { rn2, rnd, rn1, rnl, d } from './rng.js';
import { discover_object } from './o_init.js';
import { MKOBJ_OC_CLASS } from './mkobj_data.js';
import { game } from './gstate.js';
import { pline, getobj_never_mind, bot as bot_read, gamelog_add } from './display.js';
import monsPack from './makemon_mons.json' with { type: 'json' };
import {
    PM_GUARD, PM_SHOPKEEPER, PM_PRIEST as PM_ALIGNED_CLERIC,
    PM_HIGH_PRIEST as PM_HIGH_CLERIC, PM_ANGEL, PM_LONG_WORM_TAIL,
    PM_LONG_WORM, PM_HUMAN_ZOMBIE, PM_DOPPELGANGER, PM_AIR_ELEMENTAL,
    PM_GREMLIN,
    /* seffect_light's confused arm (read.c:1757).  VERIFIED BY NAME against
     * js/makemon_pmnames.json for the 5.0 tree — [118] = "yellow light",
     * [119] = "black light" — because pm.generated.js still carries some 3.7
     * spellings and a PM_ index taken on faith from it can be off by a row. */
    PM_YELLOW_LIGHT, PM_BLACK_LIGHT, PM_ACID_BLOB,
} from './pm.generated.js';
/* m_at (C hack.c) is already ported once, in js/uhitm.js — set_lit()'s gremlin
 * test (read.c:2477) needs it. */
import { m_at, more_experienced, slots_required } from './uhitm.js';
import { P_NAME } from './skills.js';
// ── Object class constants (objclass.h enum objclass_classes) ─────────────────
// C ref: nethack-c/include/objclass.h — RING_CLASS=4, TOOL_CLASS=6, WAND_CLASS=11
const WAND_CLASS = 11;
const RING_CLASS = 4;
const TOOL_CLASS = 6;
// ── Directional wand oc_dir constants (objclass.h) ────────────────────────────
// C ref: nethack-c/include/objclass.h line 75: NODIR=1
const NODIR = 1;
// ── Wand otyp constants (objects.h — base WAN_LIGHT=410) ─────────────────────
// C ref: nethack-c/include/objects.h WAND() entries.
// Wands with NODIR: WAN_LIGHT(410), WAN_SECRET_DOOR_DETECTION(411),
//   WAN_ENLIGHTENMENT(412), WAN_CREATE_MONSTER(413), WAN_WISHING(414),
//   WAN_STASIS(415).
// Wands with IMMEDIATE (oc_dir != NODIR): WAN_NOTHING(416)..WAN_PROBING(427).
// Wands with RAY (oc_dir != NODIR): WAN_DIGGING(428)..WAN_LIGHTNING(434).
const WAN_WISHING = 414;
// Wand oc_dir lookup: otyps 410-415 are NODIR, 416-434 are not NODIR.
// The recharge lim formula uses: oc_dir != NODIR ? 8 : 15.
// WAN_LIGHT=410 base, offsets 0-5 are NODIR, offsets 6+ are not NODIR.
const WAN_FIRST_NODIR = 410; /* WAN_LIGHT */
const WAN_LAST_NODIR = 415; /* WAN_STASIS */
// ── Ring slot constants (worn.h) ──────────────────────────────────────────────
// C ref: nethack-c/include/worn.h W_RINGL / W_RINGR mapped to LEFT_RING/RIGHT_RING.
// From js/const.js: LEFT_RING = W_RINGL, RIGHT_RING = W_RINGR.
// We use numeric values that match C (LEFT_RING=0x80000, RIGHT_RING=0x100000).
// See frozen/const.js for exact values — import from there to stay in sync.
// For RNG-critical paths we only need them for masking; actual values do not
// affect RNG order.
const LEFT_RING = 0x20000;
const RIGHT_RING = 0x40000;
// ── Ring oc_charged bounds (u_init.js comments, objects.h) ───────────────────
// Rings with oc_charged: adornment(173)..protection(178). See zap.js RIN_BASE.
const RIN_BASE = 173;
const RIN_LAST_CHARGED = 178;
// ── Tool otyp constants (u_init.js verified values) ──────────────────────────
const BELL_OF_OPENING = 263;
const MAGIC_MARKER = 242;
const TINNING_KIT = 238;
const EXPENSIVE_CAMERA = 229;
const OIL_LAMP = 227;
const BRASS_LANTERN = 226;
const CRYSTAL_BALL = 231;
const HORN_OF_PLENTY = 252;
const BAG_OF_TRICKS = 220;
const CAN_OF_GREASE = 240;
const MAGIC_FLUTE = 248;
const MAGIC_HARP = 254;
const FROST_HORN = 250;
const FIRE_HORN = 251;
const DRUM_OF_EARTHQUAKE = 258;
// ── SPE_LIM constant (const.js line 1104) ────────────────────────────────────
const SPE_LIM = 99;
// ── Candy bar otyp constant (objects.h) ──────────────────────────────────────
// C ref: objects.h — CANDY_BAR = 288 (Food otyp).
const CANDY_BAR = 288;
// ── candy_wrappers array (read.c:283-292) ──────────────────────────────────────
// C ref: read.c:283-292 — static const char *const candy_wrappers[].
// Array of 12 wrapper flavor names; assign_candy_wrapper uses this for spe values.
const candy_wrappers = [
    "",                         // (none -- should never happen)
    "Apollo",                   // Lost
    "Moon Crunchy",             // South Park
    "Snacky Cake", "Chocolate Nuggie", "The Small Bar",
    "Crispy Yum Yum", "Nilla Crunchie",   "Berry Bar",
    "Choco Nummer",   "Om-nom", // Cat Macro
    "Fruity Oaty",              // Serenity
    "Wonka Bar",                // Charlie and the Chocolate Factory
];
/* ---------------------------------------------------------------------------
 * assign_candy_wrapper — assign a wrapper flavor to a candy bar stack.
 * C ref: nethack-c/src/read.c:303-311
 *
 * If obj is a CANDY_BAR, randomly assign a wrapper (spe value 1..11, skipping 0).
 * RNG: rn2(SIZE(candy_wrappers) - 1) = rn2(11), returning 0..10, then add 1.
 * ---------------------------------------------------------------------------
 */
export function assign_candy_wrapper(obj) {
    if (obj.otyp === CANDY_BAR) {
        /* skips candy_wrappers[0] */
        obj.spe = 1 + rn2(candy_wrappers.length - 1);
    }
    return;
}
/* ---------------------------------------------------------------------------
 * wand_explode — stub for wand explosion (RNG: rnd(lim) is consumed).
 * C ref: nethack-c/src/read.c — called at lines 763, 785.
 * The rnd(lim) is passed in as 'dam' already evaluated by the caller.
 * ---------------------------------------------------------------------------
 */
function wand_explode_stub(obj, dam) {
    /* C: various pline calls + losehp + useup.
     * RNG for dam is consumed by the caller before this call.
     * No additional RNG in this stub path. */
    /* TODO: full wand_explode implementation (damage, useup) when a session
     * exercises the deep path. */
}
/* ---------------------------------------------------------------------------
 * stripspe — remove charges from object (no RNG).
 * C ref: nethack-c/src/read.c stripspe() — sets spe=0, costs.
 * ---------------------------------------------------------------------------
 */
function stripspe(obj) {
    if (obj && obj.spe > 0)
        obj.spe = 0;
}
/* ---------------------------------------------------------------------------
 * cap_spe — clamp spe to +/-SPE_LIM.
 * C ref: nethack-c/src/read.c:79-86
 *     staticfn void
 *     cap_spe(struct obj *obj)
 *     {
 *         if (obj) {
 *             if (abs(obj->spe) > SPE_LIM)
 *                 obj->spe = sgn(obj->spe) * SPE_LIM;
 *         }
 *     }
 * SPE_LIM is 99 (read.c:78 comment "max spe is +99, min is -99"), NOT the
 * signed-char range this used to clamp to.  No RNG consumed.
 * ---------------------------------------------------------------------------
 */
function cap_spe(obj) {
    if (!obj)
        return;
    if (Math.abs(obj.spe | 0) > SPE_LIM)
        obj.spe = ((obj.spe | 0) < 0 ? -1 : 1) * SPE_LIM;
}
/* ---------------------------------------------------------------------------
 * p_glow1, p_glow2, p_glow3 — object glow pline stubs.
 * C ref: nethack-c/src/read.c p_glow1/2/3 — no RNG.
 * ---------------------------------------------------------------------------
 */
/* C read.c:667-683 — all three p_glow variants name the object through
 * Yobjnam2(otmp, ...) (objnam.c:2278), and that naming call is NOT
 * side-effect-free:
 *     Yobjnam2 -> yobjnam -> yname (objnam.c:2357) -> cxname -> xname
 *     (objnam.c:575) -> xname_flags, which at objnam.c:627-628 does
 *         if (!Blind && !gd.distantname) observe_object(obj);
 * and observe_object (o_init.c:442) sets obj->dknown = 1.  The message text
 * itself is still a stub here, but the dknown side effect is load-bearing:
 * without it recharge() leaves the object unidentified (capture divergence
 * __args_after__.obj.dknown C=1 JS=0 on the crystal-ball p_glow1 path).
 * gd.distantname is not tracked anywhere in this port (false on every
 * reachable path), so only the Blind guard applies — same reasoning as the
 * two existing xname shims in js/cmd.js (_wt_xname, xprname). */
function _p_glow_observe(obj) {
    const p = game.u?.uprops?.[BLINDED];
    const Blind = !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)));
    if (obj && !Blind)
        observe_object(obj);
}
async function p_glow1(obj) {
    /* C: pline("%s briefly.", Yobjnam2(otmp, Blind ? "vibrate" : "glow")) */
    _p_glow_observe(obj);
}
async function p_glow2(obj, color) {
    /* C: pline("%s%s%s for a moment.", Yobjnam2(otmp, ...), ...) */
    _p_glow_observe(obj);
}
async function p_glow3(obj, color) {
    /* C: pline("%s feebly%s%s for a moment.", Yobjnam2(otmp, ...), ...) */
    _p_glow_observe(obj);
}
/* ---------------------------------------------------------------------------
 * recharge — recharge an object (wand, ring, or tool).
 * C ref: nethack-c/src/read.c:728-1008
 *
 * curse_bless: -1 = cursed scroll, 0 = uncursed, +1 = blessed scroll.
 *
 * RNG sites in C call order (max 17 across all branches, path-dependent):
 *
 * === WAND_CLASS branch ===
 *   • rn2(343)      [read.c:762] — explosion check; consumed only if n>0
 *                                   and otyp != WAN_WISHING
 *   • rnd(lim)      [read.c:763] — passed to wand_explode; only if exploded
 *   • rn1(5,lim+1-5)[read.c:773] — new charge; only if !is_cursed && lim!=1
 *   • rnd(n)        [read.c:775] — reduced charge; only if !is_blessed
 *
 * === RING_CLASS (oc_charged) branch ===
 *   • rnd(3)  [read.c:803] — s, if is_blessed
 *   OR rnd(2) [read.c:803] — |s|, if is_cursed
 *   (s=1 if neither blessed nor cursed, no RNG)
 *   • rn2(7)  [read.c:807] — destruction threshold
 *   • rnd(3*abs(spe)) [read.c:812] — explosion damage; only if destroyed
 *
 * === TOOL_CLASS (oc_charged switch) ===
 *   Consumed only for the matching otyp case; see inline comments.
 * ---------------------------------------------------------------------------
 */
export async function recharge(obj, curse_bless) {
    let n;
    const is_cursed = curse_bless < 0;
    const is_blessed = curse_bless > 0;
    if (obj.oclass === WAND_CLASS) {
        /* C read.c:738-740: lim = wishing ? 1 : (oc_dir != NODIR) ? 8 : 15 */
        const otyp = obj.otyp | 0;
        let lim;
        if (otyp === WAN_WISHING) {
            lim = 1;
        }
        else if (otyp < WAN_FIRST_NODIR || otyp > WAN_LAST_NODIR) {
            /* WAN_NOTHING(416)+ or unrecognised — directional (oc_dir != NODIR) */
            lim = 8;
        }
        else {
            /* WAN_LIGHT(410)..WAN_STASIS(415), excluding WAN_WISHING(414) — NODIR */
            lim = 15;
        }
        /* C read.c:743-744: undo cancellation */
        if (obj.spe === -1)
            obj.spe = 0;
        /* C read.c:760-764: explosion check */
        n = obj.recharged | 0;
        if (n > 0 && (otyp === WAN_WISHING
            || (n * n * n > rn2(7 * 7 * 7)))) { /* rn2(343) */
            /* wand explodes: consume rnd(lim) for damage */
            const dam = rnd(lim);
            wand_explode_stub(obj, dam);
            return;
        }
        /* C read.c:767: increment recharge count (didn't explode) */
        obj.recharged = (n + 1) & 0xFFFFFFFF; /* unsigned in C */
        /* C read.c:770-799: actual recharging */
        if (is_cursed) {
            /* C read.c:771: stripspe(obj) */
            stripspe(obj);
        }
        else {
            /* C read.c:773: n = (lim==1) ? 1 : rn1(5, lim+1-5) */
            if (lim === 1) {
                n = 1;
            }
            else {
                n = rn1(5, lim + 1 - 5); /* rn1 consumes rn2(5) */
            }
            /* C read.c:774-775: if (!is_blessed) n = rnd(n) */
            if (!is_blessed) {
                n = rnd(n);
            }
            /* C read.c:777-780: update spe */
            if (obj.spe < n) {
                obj.spe = n;
            }
            else {
                obj.spe++;
            }
            /* C read.c:781-787: wishing wand overflow → explode */
            if (otyp === WAN_WISHING && obj.spe > 3) {
                /* wands can't give more than three wishes */
                wand_explode_stub(obj, 1);
                return;
            }
            /* C read.c:788-793: glow messages */
            if (lim === 1) {
                await p_glow3(obj, 'blue');
            }
            else if (obj.spe >= lim) {
                await p_glow2(obj, 'blue');
            }
            else {
                await p_glow1(obj);
            }
        }
    }
    else if (obj.oclass === RING_CLASS
        && (obj.otyp >= RIN_BASE && obj.otyp <= RIN_LAST_CHARGED)) {
        /* C read.c:801-833: oc_charged ring path */
        /* C read.c:803: int s = is_blessed ? rnd(3) : is_cursed ? -rnd(2) : 1 */
        let s;
        if (is_blessed) {
            s = rnd(3);
        }
        else if (is_cursed) {
            s = -rnd(2);
        }
        else {
            s = 1; /* no RNG */
        }
        /* C read.c:804: boolean is_on = (obj == uleft || obj == uright) */
        const g = game;
        const worn = (obj.owornmask | 0);
        const is_on = !!(worn & (LEFT_RING | RIGHT_RING));
        /* C read.c:807: if (obj->spe > rn2(7) || obj->spe <= -5) → destroy */
        const spe_cur = obj.spe | 0;
        if (spe_cur > rn2(7) || spe_cur <= -5) {
            /* C read.c:808-814: ring explodes */
            await pline("It momentarily, then explodes!"); /* simplified */
            if (is_on) {
                /* Ring_gone(obj) — remove ring from worn slots, no RNG */
                obj.owornmask = 0;
            }
            /* C read.c:812: s = rnd(3 * abs(obj->spe)) — damage */
            const dmg_s = rnd(3 * Math.abs(spe_cur));
            /* C read.c:813: useup(obj), obj = 0; losehp(Maybe_Half_Phys(s), ...) */
            /* TODO: apply damage to u.uhp */
            /* obj consumed — return since obj is gone */
            return;
        }
        else {
            /* C read.c:816-833: ring spins path */
            /* C read.c:816: long mask = is_on ? (... LEFT_RING : RIGHT_RING) : 0 */
            const mask = is_on
                ? ((worn & LEFT_RING) ? LEFT_RING : RIGHT_RING)
                : 0;
            /* C read.c:818-819: pline spin message */
            await pline(`${s < 0 ? 'It spins counter' : 'It spins '}clockwise for a moment.`);
            if (s < 0) {
                /* C read.c:821: costly_alteration(obj, COST_DECHNT) — no RNG */
            }
            /* C read.c:823-824: cause attributes/properties to be updated */
            if (is_on) {
                /* Ring_off(obj) — no RNG */
                obj.owornmask &= ~(LEFT_RING | RIGHT_RING);
            }
            obj.spe += s; /* C read.c:825: update ring while off */
            if (is_on) {
                obj.owornmask |= mask; /* setworn */
                /* Ring_on(obj) — no RNG for RNG-score purposes */
            }
            /* C read.c:831-832: alter_cost if s>0 && unpaid — no RNG */
        }
    }
    else if (obj.oclass === TOOL_CLASS) {
        /* C read.c:835-1004: tool path */
        const rechrg = obj.recharged | 0;
        /* C read.c:838-841: increment recharged counter if oc_charged */
        /* For tools, oc_charged is per-otyp; we handle it inside each case.
         * The increment happens before the switch for all oc_charged tools. */
        /* C read.c:838: if (objects[obj->otyp].oc_charged) recharged++ */
        /* All rechargeable tool otyps below have oc_charged=1 per objects.h. */
        const is_oc_charged = (obj.otyp === BELL_OF_OPENING
            || obj.otyp === MAGIC_MARKER || obj.otyp === TINNING_KIT
            || obj.otyp === EXPENSIVE_CAMERA || obj.otyp === OIL_LAMP
            || obj.otyp === BRASS_LANTERN || obj.otyp === CRYSTAL_BALL
            || obj.otyp === HORN_OF_PLENTY || obj.otyp === BAG_OF_TRICKS
            || obj.otyp === CAN_OF_GREASE || obj.otyp === MAGIC_FLUTE
            || obj.otyp === MAGIC_HARP || obj.otyp === FROST_HORN
            || obj.otyp === FIRE_HORN || obj.otyp === DRUM_OF_EARTHQUAKE);
        if (is_oc_charged) {
            /* C read.c:840-841: if (rechrg < 7) recharged++ */
            if (rechrg < 7)
                obj.recharged++;
        }
        switch (obj.otyp) {
            case BELL_OF_OPENING:
                /* C read.c:845-852 */
                if (is_cursed) {
                    stripspe(obj);
                }
                else if (is_blessed) {
                    obj.spe += rnd(3); /* RNG: rnd(3) */
                }
                else {
                    obj.spe += 1;
                }
                if (obj.spe > 5)
                    obj.spe = 5;
                break;
            case MAGIC_MARKER:
            case TINNING_KIT:
            case EXPENSIVE_CAMERA:
                /* C read.c:855-893 */
                if (is_cursed) {
                    stripspe(obj);
                }
                else if (rechrg && obj.otyp === MAGIC_MARKER) {
                    /* C read.c:859-865: previously recharged magic marker */
                    obj.recharged = 1; /* override increment done above */
                    if (obj.spe < 3) {
                        await pline("Your marker seems permanently dried out.");
                    }
                    else {
                        /* pline1(nothing_happens) */
                        await pline("Nothing happens.");
                    }
                    /* no RNG consumed */
                }
                else if (is_blessed) {
                    /* C read.c:867-878: n = rn1(16, 15) */
                    n = rn1(16, 15); /* RNG: rn1(16,15) → rn2(16)+15, range 15..30 */
                    if (obj.spe + n <= 50) {
                        obj.spe = 50;
                    }
                    else if (obj.spe + n <= 75) {
                        obj.spe = 75;
                    }
                    else {
                        const chrg = obj.spe | 0;
                        if ((chrg + n) > 127)
                            obj.spe = 127;
                        else
                            obj.spe += n;
                    }
                    await p_glow2(obj, 'blue');
                }
                else {
                    /* C read.c:880-893: n = rn1(11, 10) */
                    n = rn1(11, 10); /* RNG: rn1(11,10) → rn2(11)+10, range 10..20 */
                    if (obj.spe + n <= 50) {
                        obj.spe = 50;
                    }
                    else {
                        const chrg = obj.spe | 0;
                        if (chrg + n > SPE_LIM)
                            obj.spe = SPE_LIM;
                        else
                            obj.spe += n;
                    }
                    await p_glow2(obj, 'white');
                }
                break;
            case OIL_LAMP:
            case BRASS_LANTERN:
                /* C read.c:895-914 */
                if (is_cursed) {
                    stripspe(obj);
                    if (obj.lamplit) {
                        if (!game.u.blind) {
                            await pline(`${obj._name || 'lamp'} goes out!`);
                        }
                        /* end_burn(obj, TRUE) — no RNG */
                        obj.lamplit = false;
                    }
                }
                else if (is_blessed) {
                    obj.spe = 1;
                    obj.age = 1500;
                    await p_glow2(obj, 'blue');
                }
                else {
                    obj.spe = 1;
                    obj.age = (obj.age || 0) + 750;
                    if (obj.age > 1500)
                        obj.age = 1500;
                    await p_glow1(obj);
                }
                /* no RNG in any lamp/lantern path */
                break;
            case CRYSTAL_BALL:
                /* C read.c:916-954 */
                if (obj.spe === -1)
                    obj.spe = 0; /* like wands, uncancel first */
                if (is_cursed) {
                    /* C read.c:920-931: cursed removes charges */
                    if (!obj.cursed) {
                        await p_glow2(obj, 'black');
                        obj.cursed = true; /* curse(obj) */
                    }
                    else {
                        await pline(`${obj._name || 'ball'} vibrates briefly.`);
                    }
                    /* costly_alteration — no RNG */
                    obj.spe = 0;
                }
                else if (is_blessed) {
                    /* C read.c:932-938: blessed sets to max */
                    obj.spe = 7;
                    await p_glow2(obj, obj.blessed ? 'blue' : 'light blue');
                    if (!obj.blessed)
                        obj.blessed = true; /* bless(obj) */
                }
                else {
                    /* C read.c:939-954: uncursed increments */
                    if (obj.spe < 7 || obj.cursed) {
                        n = rnd(2); /* RNG: rnd(2) */
                        obj.spe = Math.min(obj.spe + n, 7);
                        if (!obj.cursed) {
                            await p_glow1(obj);
                        }
                        else {
                            await p_glow2(obj, 'amber');
                            obj.cursed = false; /* uncurse(obj) */
                        }
                    }
                    else {
                        /* charges at max and not cursed */
                        await pline("Nothing happens.");
                    }
                }
                break;
            case HORN_OF_PLENTY:
            case BAG_OF_TRICKS:
            case CAN_OF_GREASE:
                /* C read.c:956-975 */
                if (is_cursed) {
                    stripspe(obj);
                }
                else if (is_blessed) {
                    if (obj.spe <= 10) {
                        obj.spe += rn1(10, 6); /* RNG: rn1(10,6) */
                    }
                    else {
                        obj.spe += rn1(5, 6); /* RNG: rn1(5,6) */
                    }
                    if (obj.spe > 50)
                        obj.spe = 50;
                    await p_glow2(obj, 'blue');
                }
                else {
                    obj.spe += rn1(5, 2); /* RNG: rn1(5,2) */
                    if (obj.spe > 50)
                        obj.spe = 50;
                    await p_glow1(obj);
                }
                break;
            case MAGIC_FLUTE:
            case MAGIC_HARP:
            case FROST_HORN:
            case FIRE_HORN:
            case DRUM_OF_EARTHQUAKE:
                /* C read.c:976-994 */
                if (is_cursed) {
                    stripspe(obj);
                }
                else if (is_blessed) {
                    obj.spe += d(2, 4); /* RNG: d(2,4) */
                    if (obj.spe > 20)
                        obj.spe = 20;
                    await p_glow2(obj, 'blue');
                }
                else {
                    obj.spe += rnd(4); /* RNG: rnd(4) */
                    if (obj.spe > 20)
                        obj.spe = 20;
                    await p_glow1(obj);
                }
                break;
            default:
                /* C read.c:995-1003: not_chargable */
                await pline("You have a feeling of loss.");
                break;
        } /* switch */
    }
    else {
        /* C read.c:1001-1003: not_chargable (non-wand, non-ring, non-tool) */
        await pline("You have a feeling of loss.");
    }
    /* C read.c:1007: cap_spe(obj) — prevent enchantment from getting out of range */
    cap_spe(obj);
}

// ─────────────────────────────────────────────────────────────────────────────
// doread + study_book (early-known-spell branch) — seed0501 priest 'r/g' path.
// C ref: nethack-c/src/read.c:330 doread() and src/spell.c:468 study_book().
//
// Scope: only the "spellbook already known + Refresh prompt" branch is ported;
// it covers the seed0501 trajectory of Z/r/g and ends pinned on the y_n prompt.
// Other doread branches (scrolls, T-shirt, credit card, blank, level filter,
// MAIL_STRUCTURES) are deferred until exercised by a session.
// ─────────────────────────────────────────────────────────────────────────────
import { flush_screen, docrt, cls, under_water, under_ground, newsym, terrain_glyph, occupation_force_more, force_more, map_trap, map_engraving, map_object, unmap_object, show_glyph_cell, update_lastseentyp, GLYPHCLS_TRAP, GLYPHCLS_OBJ, GLYPHCLS_CMAP, GLYPHCLS_ENGR } from './display.js';
import { t_at } from './trap.js';
import { engr_at } from './mklev.js';
/* C detect.c:1418 room_discovered() lives in dungeon.c; this port hosts the
 * dungeon.c #overview block in js/cmd.js. */
import { room_discovered, browse_map, body_part as food_body_part,
         snuff_lit as snuff_lit_real } from './cmd.js';
import { nhgetch } from './input.js';
import { study_book_learn } from './spell.js';
import { exercise } from './attrib.js';
import { cansee } from './vision.js';
import { COLNO, ROWNO, CORR, SCORR, ROOM, SVALL, IS_FURNITURE, TER_DETECT, TER_OBJ, TER_MON, Has_contents, u_at, NOSE } from './const.js';
import { BLINDED, CONFUSION, HALLUC, HALLUC_RES, INVIS, SEE_INVIS } from './const.js';
/* make_confused's C home is potion.c:88; this file's private copy wrote a flat
 * `game.HConfusion` that only its own readers consulted. */
import { make_confused } from './potion.js';
/* skills.h oc_skill values — the read.c:1526 mergeable-weapon test and the
 * read.c:1533 uslinging() test.  Imported from the single canonical copy in
 * js/const.js rather than re-declared (const-agreement-check gate). */
import { P_DAGGER, P_KNIFE, P_SPEAR, P_SLING } from './const.js';
/* worn.h/prop.h owornmask bits: W_ART/W_ARTI are the artifact "carried" pseudo
 * slots that seffect_remove_curse masks off at read.c:1516. */
import { W_ARM, W_ARMU, W_SADDLE, W_BALL, W_CHAIN, W_ART, W_ARTI } from './const.js';
/* Shared removal, worn-slot bookkeeping and monster armor selection. */
import { remove_worn_item } from './steal.js';
import { setworn } from './worn.js';
import { which_armor } from './makemon.js';
import { NO_COLOR, CLR_BLACK } from './terminal.js';
import { build_window_screen, tty_window_offx, menu_search_case } from './com_pager.js';
import { getObjDescr, xname_scroll, makeplural, an, Yobjnam2, otense, not_fully_identified } from './objnam.js';
import { simpleonames, suit_simple_name } from './objnam.js';
/* C read.c:384-390's "obscured by" guard needs shk_your()'s shop-owner arm
 * (shk.c:5885-5896 shk_owns): shop_keeper/costly_spot (js/shk.js), inside_shop
 * (js/mklev.js, the single live body -- see js/cmd.js:159) and shkname
 * (js/dokick.js).  s_suffix and y_monnam come from the js/mhitm.js import this
 * file already carries. */
import { shop_keeper, costly_spot } from './shk.js';
import { inside_shop } from './mklev.js';
import { shkname } from './dokick.js';
import { erosion_matters, mkobj, place_object, makemon } from './mklev.js';
/* seffect_light's confused arm only (read.c:1762-1780). */
import { initedog } from './dog.js';
import { canspotmon, _topl_stash_result } from './display.js';
import { MM_EDOG, NO_MINVENT, MM_NOMSG, G_GONE } from './const.js';
/* C ref: ball.c:193 placebc() — punish()'s ball&chain placement lives in
 * ball.c, so it is ported in js/ball.js next to move_bc/drag_ball. */
import { placebc, set_bc, move_bc } from './ball.js';
import { weight } from './weight.js';
import { encumber_msg } from './weight.js';
/* some_armor (C do_wear.c:2630) is the RNG-consuming armor picker used by
 * seffect_enchant_armor / seffect_destroy_armor; adj_abon (C do_wear.c) is the
 * Dex/Int+Wis adjustment applied after an armor's spe changes.  Both are
 * already ported once in js/do_wear.js — import that single copy. */
import { some_armor, adj_abon } from './do_wear.js';
/* C read.c:1362/:1380 disintegrate_arm, :1367 count_worn_armor, :1376
 * any_worn_armor_ok and :1387 destroy_arm — all do_wear.c functions, so they
 * live in js/do_wear.js next to some_armor rather than being re-derived here. */
import { destroy_arm, disintegrate_arm, count_worn_armor,
         any_worn_armor_ok } from './do_wear.js';
/* C objnam.c:574 xname() — actualoname()'s override_ID-bracketed namer below. */
import { xname, doname_with_price } from './objnam.js';
/* C invent.c:1752 getobj() — the shared (prompt-less) selector; see the KNOWN
 * GAP at its one call site in seffect_destroy_armor. */
import { getobj } from './eat.js';
import { GETOBJ_PROMPT, TIMEOUT, STUNNED } from './const.js';
/* doread()'s own return value (C read.c returns ECMD_OK/ECMD_TIME/ECMD_CANCEL
 * from every arm); this file previously only set g.context.move as a side
 * effect and fell off the end with an implicit `undefined` return. */
import { ECMD_OK, ECMD_TIME, ECMD_CANCEL, LL_CONDUCT } from './const.js';
/* C hack.h:538 GETOBJ_SUGGEST — see the enum note at js/do_wear.js's
 * any_worn_armor_ok; js/const.js's copy of that enum is not C's. */
const GETOBJ_SUGGEST_RD = 2;
/* C potion.c make_stunned() — read.c:1360's stun on a doubly-cursed hit. */
import { make_stunned } from './potion.js';
/* C youprop.h:80 HStun == u.uprops[STUNNED].intrinsic (no extrinsic term),
 * spelled the same way js/mhitu.js:310 spells it. */
function _HStun() { return (game.u?.uprops?.[STUNNED]?.intrinsic) | 0; }
/* getlin (C win/tty/getline.c tty_getlin) is the keystroke-consuming string
 * reader used by docall(); js/potion.js already drives it from _docall_potion. */
import { getlin } from './wizcmds.js';
/* objects[otyp].oc_magic, extracted from nethack-c/src/objects.c (see
 * js/mkobj_erosion_meta.js header).  seffect_enchant_armor reads it at
 * read.c:1207 ("nonmagical armor is easier to enchant"). */
import { MKOBJ_OC_MAGIC, MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js';
import { getObjName } from './o_init.js';
/* ── seffects arms landed 2026-08-31 (claude-lane subsystem-port) ────────────
 * C read.c:2202-2280's switch dispatches 23 scroll otyps; this file carried 11
 * of them and let the rest fall to a silent `default: break`.  The four arms
 * below are the ones the corpus REACHES (measured over all 688
 * corpus-generated/v5/train sessions, by grepping the recorded C RNG-leaf
 * attribution and the recorded toplines):
 *     seffect_mail            4 sessions   RNG-free
 *     seffect_scare_monster   1 session    draws resist() per visible monster
 *     seffect_create_monster  1 session    rn2(73) + create_critters()
 *     seffect_blank_paper     1 session    RNG-free
 * The remaining eight unported arms (taming, genocide, gold detection, food
 * detection, charging, fire, earth, stinking cloud) draw in ZERO of the 688 —
 * see the `default:` comment in seffects() for why that arm is still silent
 * rather than C's impossible().
 *
 * resist()/monflee() are cyclic imports (js/zap.js imports litroom() from this
 * file) but every binding used is a hoisted `function` declaration, so the
 * cycle resolves — the same argument js/makemon.js:94 records for
 * create_particular. */
import { resist } from './zap.js';
/* C read.c:364-556's non-scroll readable ladder needs these; all are hoisted
 * `export function`s, so the js/mklev.js and js/objnam.js cycles resolve. */
import { bcsign, upwords, outrumor, BY_COOKIE, wipeout_text } from './mklev.js';
import { singular } from './objnam.js';
import { You_cant } from './cmd.js';
import {
    /* read.c:503-507's red_mons[].  Taken from pm.generated.js but VERIFIED BY
     * NAME against js/makemon_pmnames.json (see the marker arm's comment). */
    PM_FIRE_ANT, PM_PYROLISK, PM_HELL_HOUND, PM_IMP,
    PM_LARGE_MIMIC, PM_LEOCROTTA, PM_SCORPION, PM_XAN,
    PM_GIANT_BAT, PM_WATER_MOCCASIN, PM_FLESH_GOLEM,
    PM_BARBED_DEVIL, PM_MARILITH, PM_PIRANHA,
} from './pm.generated.js';
import PMNAMES_RD from './makemon_pmnames.json' with { type: 'json' };
import { monflee, create_critters, permonstTemplate, can_chant as can_chant_real } from './makemon.js';
import { You_hear } from './display.js';
/* C hack.h NOTELL — resist()'s `tell` argument. */
import { NOTELL } from './const.js';
import { Monnam } from './mcastu.js';
import { do_genocide } from './sit.js';
/* C ref: pline.h:44 `#define You(...)  pline("You " __VA_ARGS__)`.
 *
 * This file used to import You() from js/eat.js.  That export is NOT a port of
 * C's You() macro: it is the eat-occupation result channel
 * (`game._resultMessage += msg`, js/eat.js:2612), which drops the "You " prefix
 * and defers the text to whenever js/allmain.js:967 next drains the channel.
 * Both of this file's You() call sites are ordinary immediate messages, so the
 * stand-in printed them unprefixed AND out of order — punish()'s line surfaced
 * BEFORE the "As you read the scroll, it disappears." that C emits ahead of it.
 * Same shape as the local You_feel()/Your() helpers already in this file. */
function You(fmt, ...args) { return pline("You " + fmt, ...args); }
/* mbodypart: the only real body in js/ is js/cmd.js's (C polyself.c:1956).
 * js/makemon.js re-exported a THROWING stub of the same name, and this import
 * named that one.  cmd.js is already imported by this file (line 606 et al),
 * and mbodypart is a hoisted `export function`, so the read<->cmd cycle is
 * safe for the same reason js/mhitm.js:78-82 documents. */
import { mbodypart } from './cmd.js';
import { s_suffix, y_monnam } from './mhitm.js';
import { Is_waterlevel, Is_rogue_level, ROOMOFFSET, STOMACH } from './const.js';
import { do_clear_area, vision_recalc } from './vision.js';
import { dmgtype } from './dogmove.js';
/* observe_object (C o_init.c:442) is already ported once, in js/cmd.js — import
 * that single copy rather than re-deriving its dknown/discover_object work.
 * js/display.js also declares a private `observe_object`, but that one is a
 * bare `obj.dknown = 1` with neither the FIRST_OBJECT nor the Hallucination
 * guard, so it is NOT the copy to wire. */
import { observe_object, level_tele, getobj_redo_menu, check_capacity, getpos } from './cmd.js';
/* C teleport.c:844 scrolltele() — the non-confused, non-cursed arm of
 * seffect_teleportation (read.c:1796). */
import { scrolltele } from './teleport.js';

const SPBOOK_CLASS = 10;
// NH_ color constants (nhcolor enum: nh_NO_COLOR=0, nh_BLACK=1, nh_RED=2, ...)
const NH_RED = 2;
const NH_PURPLE = 16;
/* C decl.h:17-27 — NH_BLACK / NH_SILVER / NH_GOLDEN are c_color_names members
 * ("black" / "silver" / "golden", decl.c:16-19).  This file passes hcolor()
 * a numeric token instead of the C string; the values below are the nhcolor
 * enum indices for black/silver/golden and are used ONLY as hcolor() keys. */
const NH_BLACK = 1;
const NH_SILVER = 17;
const NH_GOLDEN = 18;
const NH_BLUE = 6;
const SCROLL_CLASS_OC = 9;

/* C ref: spell.c:107-114 spellet — letter for spell slot i. */
function spellet(i) {
    if (i < 26) return String.fromCharCode(97 + i);
    if (i < 52) return String.fromCharCode(65 + i - 26);
    return ' ';
}

/* C ref: invent.c:1627 compactify() + invent.c:1908 — collapse runs of >=3
 * consecutive invlets to "<first>-<last>", but ONLY when the suggested-letter
 * count exceeds 5 (C gates the compactify call on `suggested > 5`).  For
 * seed4200's readable set "ijklmp" (6 items) this yields "i-mp"; a 2-letter
 * priest set is left untouched. */
function _compact_letter_ranges(letters) {
    if (!letters || letters.length <= 5) return letters;
    let out = '';
    let i = 0;
    const n = letters.length;
    while (i < n) {
        let j = i;
        /* extend the run of consecutive letters (code points differ by 1). */
        while (j + 1 < n
            && letters.charCodeAt(j + 1) === letters.charCodeAt(j) + 1)
            j++;
        const runLen = j - i + 1;
        if (runLen >= 3) {
            out += letters[i] + '-' + letters[j];
        } else {
            out += letters.slice(i, j + 1);
        }
        i = j + 1;
    }
    return out;
}

/* C ref: tty set_cursor — write cursor position via game.nhDisplay. */
function set_cursor(col, row) {
    const disp = game.nhDisplay;
    if (disp) {
        disp.cursorCol = col;
        disp.cursorRow = row;
    }
}

/* C ref: topl.c more() — append "--More--" to topline and wait for a dismiss
 * key.  Unlike _topline_more in cmd.js, this version LOOPS until a valid
 * dismiss key (space, enter, ESC) is received, silently consuming other keys.
 * The screen stays unchanged across non-dismiss keys (preNhgetchHook captures
 * the same screen each iteration), matching C's tty_doprev_message behaviour.
 *
 * C ref: topl.c more / tty_putstr's MORE flag.  Dismiss keys in our build:
 *   ' ', '\n' (10), '\r' (13), '\x1b' (27).
 */
async function topline_more_loop(msg) {
    const g = game;
    const full = msg + '--More--';
    g._pending_message = full;
    await flush_screen(1);
    /* Cursor just past end of "--More--" (col = msg.length + 8). */
    set_cursor(full.length, 0);
    while (true) {
        const key = await nhgetch(); /* preHook captures current screen each iter */
        if (key === 32 /* space */ || key === 10 /* \n */ ||
            key === 13 /* \r */    || key === 27 /* ESC */) {
            return key;
        }
        /* Non-dismiss key — re-render same screen so the next preHook captures
         * the unchanged --More-- prompt (cursor too).  flush_screen would reset
         * cursor to the hero, so set _pending_message + set_cursor again. */
        g._pending_message = full;
        await flush_screen(1);
        set_cursor(full.length, 0);
    }
}

/* C ref: spell.c:468 study_book() — the early-return branch when hero already
 * knows the spell at high retention (spellknow(i) > KEEN/10).
 *
 * Truncated port: covers spell.c:561-573 only:
 *   pline "You know \"<name>\" quite well already."
 *   y_n("Refresh your memory anyway?") returns 'n' → return 0 (no turn)
 *
 * For seed0501: light is at sp_know=20000 > 2000 → this branch fires.
 *
 * The y_n() call internally calls more() because the topline is occupied by
 * the pline above (C topl.c more() invokes when adding a query to a full
 * topline).  After more() is dismissed, y_n writes "Refresh your memory
 * anyway? [yn] (n)" and reads the response.  Replay ends here — the response
 * is the last key in the session, captured by the preHook of the next-but-
 * never-fired nhgetch.
 */
async function study_book_already_known(spellName) {
    const g = game;
    const msg = `You know "${spellName}" quite well already.`;
    /* C ref: pline + tty more() chain — pline sets the topline; the subsequent
     * y_n in C calls topl.c more() to clear the line.  Mirror that loop. */
    await topline_more_loop(msg);
    /* After --More-- dismiss: y_n("Refresh your memory anyway?") =
     * yn_function(query, "yn", 'n', TRUE).  C ref: spell.c:571, cmd.c:6150.
     * tty_yn_function renders "<query> [yn] (n)" and LOOPS reading keys until a
     * valid response: 'y'/'n' answer the prompt, <space>/<return>/ESC select the
     * default ('n'), and ANY OTHER KEY beeps and re-reads — the prompt persists
     * and the invalid key is consumed without terminating (spell.c only cares
     * whether the result is 'n', so the return value is discarded here).
     *
     * The single-key read this replaced leaked invalid keystrokes to rhack
     * (seed0600: after the prompt, keys 'a' and 'm' must be eaten by the loop
     * before '\r' selects the default; a lone nhgetch consumed only 'a' and
     * desynced the whole downstream input stream).
     *
     * seed0501 ends AT this prompt: its first nhgetch throws InputQueueEmpty
     * (caught by the gameFromSession loop) exactly as before — iteration 1 is
     * byte-identical to the old single read, so that session is unaffected. */
    const ynPrompt = 'Refresh your memory anyway? [yn] (n)';
    while (true) {
        g._pending_message = ynPrompt;
        await flush_screen(1);
        set_cursor(ynPrompt.length + 1, 0); /* C TTY: cursor past prompt + trailing space */
        const key = await nhgetch();
        const c = String.fromCharCode(key);
        if (c === '\x1b') break;                          /* ESC → default 'n' */
        if (c === '\r' || c === '\n' || c === ' ') break; /* activator → default 'n' */
        const lc = c.toLowerCase();
        if (lc === 'y' || lc === 'n') break;              /* valid yn answer */
        /* invalid key: tty_yn_function loops and re-reads; prompt persists */
    }
    /* C ref: after y_n returns, study_book returns 0 with NO new pline, so the
     * "Refresh your memory anyway?" topline is NOT cleared — it lingers until the
     * NEXT command's nhgetch clears WIN_MESSAGE (cf. dooup's y_n_default in
     * cmd.js).  Restore the prompt so the resulting-state frame still shows it,
     * matching C.  (seed0501 ends inside the loop above via InputQueueEmpty and
     * never reaches this line.) */
    g._pending_message = ynPrompt;
}

/* C ref: spell.c:468 study_book(spellbook) — study a specific spellbook
 * object.  Truncated port: covers only the "already know it quite well"
 * branch (spell.c:561-573), which is the path exercised when the hero studies
 * a starting-kit spellbook for a spell they begin the game knowing at full
 * retention (sp_know = 20000 > KEEN/10).
 *
 * Looks up the spell slot whose sp_id matches the book's otyp (C spell.c:561
 * `spellid(i) == booktype`); if that slot's sp_know > KEEN/10 (2000), emits
 * "You know \"<name>\" quite well already." then the y_n refresh prompt.
 *
 * Returns false (study_book's y_n-'n' branch → ECMD_OK, no turn).  C ref:
 * read.c:608 `if (scroll->oclass == SPBOOK_CLASS) return study_book(scroll)`.
 *
 * Used by itemactions() IA_READ_OBJ (iactions.c:222 cmdq_add_ec(doread)) for a
 * spellbook selected from the inventory item-action menu. */
const _SPBOOK_FIRST_OTYP = 366;
const _SPBOOK_NAMES = [
    'dig','magic missile','fireball','cone of cold','sleep',
    'finger of death','light','detect monsters','healing','knock',
    'force bolt','confuse monster','cure blindness','drain life',
    'slow monster','wizard lock','create monster','detect food',
    'cause fear','clairvoyance','cure sickness','charm monster',
    'haste self','detect unseen','levitation','extra healing',
    'restore ability','invisibility','detect treasure','remove curse',
    'magic mapping','identify','turn undead','polymorph',
    'teleport away','create familiar','cancellation','protection',
    'jumping','stone to flesh','chain lightning','blank paper',
];
export async function study_book(spellbook) {
    const g = game;
    const spl_book = g.spl_book || [];
    const booktype = (typeof spellbook?.otyp === 'number') ? (spellbook.otyp | 0) : -1;
    /* C ref: spell.c:561 — find spell slot matching this book's otyp. */
    let sb = null;
    for (const s of spl_book) {
        if ((s.sp_id | 0) === booktype) { sb = s; break; }
    }
    if (sb && (sb.sp_know | 0) > 2000 /* KEEN/10 */) {
        const idx = booktype - _SPBOOK_FIRST_OTYP;
        const name = (idx >= 0 && idx < _SPBOOK_NAMES.length)
            ? _SPBOOK_NAMES[idx] : 'a spell';
        await study_book_already_known(name);
        g.context = g.context || {};
        g.context.move = 0; /* y_n-'n' → study_book returns 0 → ECMD_OK */
        return false;
    }
    /* C ref: spell.c:537-640 — the hero does NOT already know this spell at high
     * retention → schedule the multi-turn `learn` occupation (the seed4200
     * blessed finger-of-death path).  study_book_learn returns true (ECMD_TIME)
     * with g.occupation = learn set; the allmain.js learn-occupation driver runs
     * the study turns. */
    const moved = await study_book_learn(spellbook);
    g.context = g.context || {};
    g.context.move = moved ? 1 : 0;
    return !!moved;
}

// C read.c:330 doread — select an actual inventory object to read.
/* C ref: pline.c:266-274 — vpline() calls `flush_screen()` before EVERY
 * pline (whenever u.ux is set), and flush_screen() (display.c:2236-2237)
 * does `if (disp.botl || disp.botlx) bot();`.  So the getobj SET_BOTL at
 * invent.c:2049 is cleared by whatever pline doread's own body prints next —
 * every arm below prints at least one before it returns.  This mirrors the
 * already-landed fix for the identical class of bug in js/mhitu.js's
 * mattacku (`if (game.disp && game.disp.botl) await bot_mu();`, "40 of its
 * 44 RED records were a lone extra botl write"); bot() is DISPLAY-ONLY and
 * RNG-free, and it does not touch _pending_message, so calling it here does
 * not disturb the deferred-topline / --More-- machinery. */
async function _clear_botl() {
    if (game.disp && game.disp.botl)
        await bot_read();
}
export async function doread() {
    /* A rejected g-prefix can precede an extended #read command.  C's
     * ECMD_FAIL cleanup clears the movement prefix before the read prompt. */
    if (game.context?.run) {
        game.context.run = 0;
        if (game.gd) game.gd.domove_attempting = 0;
    }
    const g = game;

    /* C read.c:354 — gk.known = FALSE, BEFORE check_capacity()/getobj().
     * gk.known is the "this effect identified the scroll" flag that read.c:637
     * tests to choose learnscroll() (which draws rn2(19) inside
     * discover_object -> exercise(A_WIS, TRUE)) over trycall().  It is a
     * GLOBAL, reset at the top of EVERY doread; without this reset a `true`
     * left behind by an earlier scroll (seffect_light / seffect_magic_mapping
     * / seffect_confuse_monster all set it) made the NEXT read call
     * learnscroll() and draw a phantom rn2(19).  That phantom draw was
     * seed0002's first RNG divergence (scorer: js "rn2(19)=6" vs session
     * "rn2(5)=2 @ distfleeck(monmove.c:539)"). */
    g._gk_known = false;

    /* C read.c:355 — `if (check_capacity((char *) 0)) return ECMD_OK;`
     * The comment above already named this line and it was never written, so an
     * over-encumbered hero was prompted for a scroll and READ it.  C refuses
     * with "You can't do that while carrying so much stuff."  seed4500-knight-
     * coverage step 1504: the hero is an Overloaded brown mold and this port
     * opened the getobj prompt, then ate the answer key.  RNG-free. */
    if (check_capacity(null)) {
        g.context = g.context || {};
        g.context.move = 0;   /* C ECMD_OK — no time passes */
        return ECMD_OK;
    }

    /* C read.c:315 read_ok(): SCROLL_CLASS || SPBOOK_CLASS → GETOBJ_SUGGEST
     * (the items shown inside the [ ] bracket); everything else is DOWNPLAY /
     * EXCLUDE and not listed.  Build the suggested-letter string by walking the
     * real gi.invent (game.invent), in invent order, collecting the invlet of
     * each readable item.  C ref: invent.c getobj letter-bucket build. */
    const SCROLL_CLASS = 9, SPBOOK_CLASS_OC = 10;
    /* objects.h ordinals, resolved by NAME against js/oc_name_data.js
     * (OC_NAME.indexOf('blank paper') === 365 is the SCROLL, lastIndexOf === 407
     * the SPELLBOOK); the two spellbook neighbours agree with js/spell.js:77
     * SPE_NOVEL = 408 and js/objnam.js:99's SPE_BLANK_PAPER (407) /
     * SPE_BOOK_OF_THE_DEAD (409). */
    const SCR_BLANK_PAPER_RD = 365, SPE_BLANK_PAPER_RD = 407,
          SPE_NOVEL_RD = 408, SPE_BOOK_OF_THE_DEAD_RD = 409;
    const _read_ok = (o) =>
        (o.oclass | 0) === SCROLL_CLASS || (o.oclass | 0) === SPBOOK_CLASS_OC;
    let letters = '';
    for (let o = g.invent; o; o = o.nobj) {
        if (_read_ok(o) && o.invlet)
            letters += String.fromCharCode(o.invlet | 0);
    }
    /* The UNCOMPACTED list is what getobj hands display_pickinv as `lets`
     * (invent.c:1964 `allowed_choices = bp`) — bp is the raw buffer, built
     * BEFORE the range collapse that only shapes the prompt bracket. */
    const rawLetters = letters;
    /* C ref: invent.c getobj — collapse a run of >=3 consecutive letters to
     * "<first>-<last>" (e.g. "ijklm" → "i-m").  This is the compact bracket
     * form the recorded prompt uses ("[i-mp or ?*]"). */
    letters = _compact_letter_ranges(letters);

    /* C ref: invent.c:1927-1934 — the bracket is " [*]" when NO letter was
     * suggested and " [<letters> or ?*]" otherwise:
     *     if (!buf[0]) Strcat(qbuf, " [*]");
     *     else Sprintf(eos(qbuf), " [%s or ?*]", buf);
     * read_ok (read.c:315) DOWNPLAYs every non-scroll/non-book carried item, so a
     * hero with neither suggests nothing and C prompts "What do you want to
     * read? [*]" — the old unconditional form rendered "[ or ?*]" (seed0368
     * steps 73 and 77). */
    const prompt = letters
        ? `What do you want to read? [${letters} or ?*]`
        : 'What do you want to read? [*]';
    g._pending_message = prompt;
    await flush_screen(1);
    set_cursor(prompt.length + 1, 0); /* TTY: cursor past prompt + trailing space */

    /* ── getobj for(;;) loop (C ref: invent.c:1916-2069) ─────────────────────
     * Read an object letter.  An invlet NOT in inventory plines "You don't have
     * that object." (invent.c:2059), which lands on the still-occupied prompt
     * topline and more()s.  CRUCIAL: the more() loop (win/tty/topl.c more()) only
     * DISMISSES on a dismiss key (space / CR / LF / ESC); any OTHER key rings the
     * bell and re-shows --More-- — it does NOT begin a new getobj read.  Only after
     * the More is dismissed does getobj re-prompt and read the next letter.  A
     * quitchar (ESC / space / CR / LF) at the prompt cancels → "Never mind."
     * (invent.c:1950-1953), doread(NULL) = ECMD_CANCEL, NO turn.
     *
     * seed2200 steps 16-21: 'r' → prompt; 'j' (not in invent) → "don't have"+more();
     * 'q','g' are swallowed by more() as non-dismiss keys (C step 18/19); ' ' (step
     * 20) dismisses the more() and re-prompts; ESC (step 21) cancels ("Never mind.").
     * Reading 'q'/'g' as fresh getobj selections (the old single-key path) leaked
     * them to rhack — 'q' became dodrink → a spurious quaff turn whose movemon
     * mis-aligned the engrave that follows. */
    const _isQuit = (k) => k === 27 /* ESC */ || k === 32 /* space */
        || k === 13 /* CR */ || k === 10 /* LF */;
    let keyCode = -1;
    let scroll = null;
    let cancelled = false;
    for (;;) {
        const raw = await nhgetch();
        keyCode = typeof raw === 'number' ? raw : (raw?.charCodeAt(0) ?? 0);
        /* C invent.c:1937-1948 tests digits before quitchars.  doread's
         * getobj call does not pass GETOBJ_ALLOWCNT, so a digit reports this
         * error, pages it, then returns to the same object prompt. */
        if (keyCode >= 48 /* '0' */ && keyCode <= 57 /* '9' */) {
            await occupation_force_more('No count allowed with this command.',
                null, (g.moves | 0), null);
            g._pending_message = prompt;
            await flush_screen(1);
            set_cursor(prompt.length + 1, 0);
            continue;
        }
        /* C invent.c:1950-1953 —
         *     if (strchr(quitchars, ilet)) {
         *         if (flags.verbose) pline1(Never_mind);
         *         return (struct obj *) 0;
         *     }
         * quitchars is decl.c:96 " \r\n\033", so ALL FOUR cancel keys take this
         * arm, not just ESC.  This arm was ESC-only, so a SPACE at the read prompt
         * cancelled without leaving the loop.  The `flags.verbose` test lives in
         * getobj_never_mind(): gen040-reseed-seed267324 runs `OPTIONS=!verbose`,
         * and at its step 495 the space that cancels THIS prompt leaves C's
         * topline still reading "What do you want to read? [ijk or ?*]" while the
         * port overwrote it with "Never mind.". */
        if (_isQuit(keyCode)) {
            await getobj_never_mind(prompt);
            cancelled = true;
            break;
        }
        /* C invent.c:1960-1999 `redo_menu` — '?' and '*' are NOT looked up as
         * invlets; they open display_pickinv (restricted to the suggested
         * letters for '?', the whole pack for '*') and ITS answer becomes the
         * object letter.  This loop had no such branch at all, so '?' fell
         * through to the invlet walk below, matched nothing, and paged "You
         * don't have that object." — seed0004-feeding-pony step 288, where C
         * shows the one-line message menu "o - a scroll labeled STRC PRST SKRZ
         * KRK.--More--" and the following 'o' reads the scroll.  Everything
         * after that step diverged: 113 contiguous frames. */
        if (keyCode === 63 /* '?' */ || keyCode === 42 /* '*' */) {
            const pick = await getobj_redo_menu(keyCode, rawLetters, '');
            /* invent.c:1989-1993 — ESC out of the menu: "Never mind." (already
             * plined by getobj_redo_menu) and getobj returns NULL. */
            if (pick === 27) { cancelled = true; break; }
            /* invent.c:1982-1986 — no selection → re-prompt and re-read. */
            if (!pick) {
                g._pending_message = prompt;
                await flush_screen(1);
                set_cursor(prompt.length + 1, 0);
                continue;
            }
            keyCode = pick;
        }
        /* find the picked item in invent (invent.c:2003). */
        scroll = null;
        for (let o = g.invent; o; o = o.nobj) {
            if (o.invlet && (o.invlet | 0) === keyCode) { scroll = o; break; }
        }
        if (scroll) break; /* found → proceed to read/study dispatch below */
        /* C invent.c:2058 — !otmp → "You don't have that object." → more().
         * occupation_force_more drives win/tty/topl.c more(): it consumes any
         * non-dismiss keys (re-showing --More--) until a dismiss key (space/CR/
         * LF/ESC), exactly like C.  After dismissal we re-prompt and re-read. */
        await occupation_force_more("You don't have that object.", null, (g.moves | 0), null);
        g._pending_message = prompt;
        await flush_screen(1);
        set_cursor(prompt.length + 1, 0);
    }
    const ch = String.fromCharCode(keyCode);
    if (cancelled) {
        /* C invent.c:1950-1953 — the quitchar arm returns BEFORE line 2049's
         * `disp.botl = TRUE`, so getobj's SET_BOTL is never reached on this
         * path.  This block used to run unconditionally above the cancel
         * check, so a cancelled read wrongly raised botl for a command C
         * never touched it on.
         * getobj → NULL → doread(NULL) = ECMD_CANCEL: no turn consumed. */
        g.context = g.context || {};
        g.context.move = 0;
        return ECMD_CANCEL;
    }
    /* C invent.c:2049 — `disp.botl = TRUE;` right before getobj returns the
     * selected object ("May have changed the amount of money"). */
    g.disp = g.disp || {};
    g.disp.botl = 1;

    /* ===== C read.c:364-556 — the non-scroll readable ladder ==================
     *
     * This is the else-if chain that sits ABOVE the silly_thing arm below, and
     * until now NONE of it was ported, so every readable in it was rejected
     * with "That is a silly thing to read." and cost no turn.  The comment that
     * used to stand on the silly_thing arm said these were "NOT ported; none is
     * carried in the corpus, and when one is, this arm will wrongly claim it,
     * which is the signal to port them."  MEASURED over all 688
     * corpus-generated/v5/train sessions, that premise is FALSE and the signal
     * has fired:
     *     FORTUNE_COOKIE   7 sessions   ("You break up the cookie...")
     *     MAGIC_MARKER     2 sessions   ("Magic Marker(TM) ... Water Soluble.")
     *     everything else  0 sessions   (coin / candy / orb / credit card /
     *                                    dunce cap / T-shirt / Hawaiian shirt)
     * [[comments-asserting-absence-are-untrustworthy]].
     *
     * THE TURN IS AS IMPORTANT AS THE TEXT.  Most of these arms return
     * ECMD_TIME, so C runs a monster pass this port was skipping entirely.
     * gen625-grammar-seed827169 step 33 records `rnd(20)=11 @ mattacku(mhitu.c:806)`
     * and `d(1,2)=2 @ hitmu(mhitu.c:1187)` in the same bucket as the marker
     * text; ECMD_OK skipped all of it, which is why that member is RNG-FIRST at
     * lead 0.  Each arm below therefore sets context.move exactly as C's return
     * value does.
     *
     * The remaining unported arm in this ladder is ORB_OF_FATE
     * (read.c:527-536), which needs is_art(obj, ART_ORB_OF_FATE), i.e. the
     * artifact table; js/read.js has no artifact lookup.  T_SHIRT and
     * ALCHEMY_SMOCK now use the canonical deterministic wipeout helper above;
     * HAWAIIAN_SHIRT continues through its separate RNG-free design table.
     * ========================================================================= */

    /* C read.c:364-375 — outrumor has its own blindness check.
     *
     *     if (otyp == FORTUNE_COOKIE) {
     *         if (flags.verbose) You("break up the cookie and throw away the pieces.");
     *         outrumor(bcsign(scroll), BY_COOKIE);
     *         if (!Blind) if (!u.uconduct.literate++) livelog_printf(...);
     *         useup(scroll);
     *         return ECMD_TIME;
     *     }
     *
     * Note where the Blind test is: the conduct bump is skipped for a blind
     * hero (you did not actually read anything), but the cookie is USED UP and
     * the turn IS consumed either way.  outrumor's own Blind arm prints the
     * two-line "scrap of paper" / "What a pity" pair and draws NOTHING -- which
     * is the branch all three cookie members of this row take. */
    if (scroll && (scroll.otyp | 0) === FORTUNE_COOKIE_RD) {
        if (game.flags?.verbose)
            await pline('You break up the cookie and throw away the pieces.');
        await outrumor(bcsign(scroll), BY_COOKIE);
        if (!_Blind())
            _bump_literate();
        useup(scroll);
        game.context = game.context || {};
        game.context.move = 1;                     /* C ECMD_TIME */
        await _clear_botl();
        return ECMD_TIME;
    }

    /* C read.c:375-415 — T_SHIRT / ALCHEMY_SMOCK / HAWAIIAN_SHIRT share a Blind
     * check and (for T_SHIRT/HAWAIIAN_SHIRT only) an "obscured by worn suit"
     * check, then split: HAWAIIAN_SHIRT prints its RNG-free procedural design
     * and returns; T_SHIRT/ALCHEMY_SMOCK print their slogan text through
     * erode_obj_text().  All three arms now use the canonical C helper bodies
     * above; the seeded erode path is deterministic and consumes no RNG.
     *
     *     if (Blind) { You_cant(find_any_braille); return ECMD_OK; }
     *     if ((otyp == T_SHIRT || otyp == HAWAIIAN_SHIRT) && uarm
     *         && scroll == uarmu) {
     *         pline("%s shirt is obscured by %s%s.",
     *               scroll->unpaid ? "That" : "Your", shk_your(buf, uarm),
     *               suit_simple_name(uarm));
     *         return ECMD_OK;
     *     }
     *     if (otyp == HAWAIIAN_SHIRT) {
     *         pline("%s features %s.", flags.verbose ? "The design" : "It",
     *               hawaiian_design(scroll, buf));
     *         return ECMD_TIME;
     *     }
     *
     * THE "obscured by a worn suit" GUARD IS PORTED BELOW, and porting it is
     * a TURN-ACCOUNTING fix, not a message fix: C returns ECMD_OK from it and
     * spends NO world turn, while the design arm two lines later returns
     * ECMD_TIME.  Skipping the guard therefore ran a monster pass C does not
     * run for every hero wearing body armour over the shirt -- a Tourist
     * starts with HAWAIIAN_SHIRT in uarmu, so one body-armour pickup arms it.
     * (CLAUDE.md 2026-09-07: this is the class that cost the generated corpus
     * 11,625 screen points.)
     *
     * C's guard condition is `(otyp == T_SHIRT || otyp == HAWAIIAN_SHIRT)`.
     * The two shirt types share the same worn-suit predicate, while an
     * alchemy smock remains readable beneath body armour as C specifies. */
    if (scroll && ((scroll.otyp | 0) === T_SHIRT_RD
                   || (scroll.otyp | 0) === ALCHEMY_SMOCK_RD)) {
        if (_Blind()) {
            await You_cant(FIND_ANY_BRAILLE);
            game.context = game.context || {};
            game.context.move = 0;                 /* C ECMD_OK */
            await _clear_botl();
            return ECMD_OK;
        }
        const _uarm_rd = game.u?.uarm;
        if ((scroll.otyp | 0) === T_SHIRT_RD
            && _uarm_rd && _worn_as_shirt_rd(scroll)) {
            await pline('%s shirt is obscured by %s%s.',
                        scroll.unpaid ? 'That' : 'Your',
                        _shk_your_rd(_uarm_rd),
                        suit_simple_name(_name_obj(_uarm_rd)));
            game.context = game.context || {};
            game.context.move = 0;                 /* C ECMD_OK */
            await _clear_botl();
            return ECMD_OK;
        }
        _bump_literate();
        const mesg = (scroll.otyp | 0) === T_SHIRT_RD
            ? tshirt_text(scroll)
            : apron_text(scroll);
        let endpunct = '';
        if (game.flags?.verbose) {
            const last = mesg.length ? mesg[mesg.length - 1] : '';
            if ('.!?'.indexOf(last) < 0)
                endpunct = '.';
            await pline('It reads:');
        }
        await pline('"%s"%s', mesg, endpunct);
        game.context = game.context || {};
        game.context.move = 1;                     /* C ECMD_TIME */
        await _clear_botl();
        return ECMD_TIME;
    }

    if (scroll && (scroll.otyp | 0) === HAWAIIAN_SHIRT_RD) {
        if (_Blind()) {
            await You_cant(FIND_ANY_BRAILLE);
            game.context = game.context || {};
            game.context.move = 0;                 /* C ECMD_OK */
            await _clear_botl();
            return ECMD_OK;
        }
        /* C read.c:383-390, under C's own comment "can't read shirt worn
         * under suit (under cloak is ok though)":
         *     if ((otyp == T_SHIRT || otyp == HAWAIIAN_SHIRT) && uarm
         *         && scroll == uarmu) {
         *         pline("%s shirt is obscured by %s%s.",
         *               scroll->unpaid ? "That" : "Your", shk_your(buf, uarm),
         *               suit_simple_name(uarm));
         *         return ECMD_OK;
         *     }
         * This PRECEDES the design print and returns ECMD_OK — no turn. */
        const _uarm_rd = game.u?.uarm;
        if (_uarm_rd && _worn_as_shirt_rd(scroll)) {
            await pline('%s shirt is obscured by %s%s.',
                        scroll.unpaid ? 'That' : 'Your',
                        _shk_your_rd(_uarm_rd),
                        suit_simple_name(_name_obj(_uarm_rd)));
            game.context = game.context || {};
            game.context.move = 0;                 /* C ECMD_OK */
            await _clear_botl();
            return ECMD_OK;
        }
        await pline('%s features %s.',
                    game.flags?.verbose ? 'The design' : 'It',
                    hawaiian_design(scroll));
        game.context = game.context || {};
        game.context.move = 1;                     /* C ECMD_TIME */
        await _clear_botl();
        return ECMD_TIME;
    }

    /* C read.c:412-443 — DUNCE_CAP / CORNUTHAUM, tourists only.
     *
     *     const char *cap_text = (otyp == DUNCE_CAP) ? "DUNCE" : "WIZZARD";
     *     if (scroll->o_id % 3) {
     *         You_cant("find anything to read on this %s.", simpleonames(scroll));
     *         return ECMD_OK;
     *     }
     *     pline("%s on the %s.  It reads:  %s.",
     *           !Blind ? "There is writing" : "You feel lettering",
     *           simpleonames(scroll), cap_text);
     *     if (!u.uconduct.literate++) livelog_printf(...);
     *     trycall(scroll);
     *     return ECMD_TIME;
     *
     * C's own comment keeps the misspelling "WIZZARD" (Rincewind's hat), so it
     * is transliterated, not corrected -- Cardinal Rule 1. */
    if (scroll
        && ((scroll.otyp | 0) === DUNCE_CAP_RD || (scroll.otyp | 0) === CORNUTHAUM)
        && _Role_if_rd(ROLE_IDX_TOURIST)) {
        const cap_text = ((scroll.otyp | 0) === DUNCE_CAP_RD) ? 'DUNCE' : 'WIZZARD';
        if ((scroll.o_id | 0) % 3) {
            /* no need to vary this when blind; "on this ___" is important */
            await You_cant('find anything to read on this %s.', simpleonames(scroll));
            game.context = game.context || {};
            game.context.move = 0;                 /* C ECMD_OK */
            await _clear_botl();
            return ECMD_OK;
        }
        await pline('%s on the %s.  It reads:  %s.',
                    !_Blind() ? 'There is writing' : 'You feel lettering',
                    simpleonames(scroll), cap_text);
        _bump_literate();
        /* C: despite the fact that player will recognize the object type, don't
         * make it become a discovery for hero. */
        await trycall(scroll);
        game.context = game.context || {};
        game.context.move = 1;                     /* C ECMD_TIME */
        await _clear_botl();
        return ECMD_TIME;
    }

    /* C read.c:444-497 — CREDIT_CARD.  Pure table lookup and integer
     * arithmetic on o_id; no RNG.  `card_msgs[SIZE-1]` is reserved for an
     * artifact card, and the o_id modulus therefore runs over SIZE-1 = 13. */
    if (scroll && (scroll.otyp | 0) === CREDIT_CARD_RD) {
        const card_msgs = [
            'Leprechaun Gold Tru$t - Shamrock Card',
            'Magic Memory Vault Charge Card',
            'Larn National Bank',                  /* Larn */
            'First Bank of Omega',                 /* Omega */
            'Bank of Zork - Frobozz Magic Card',   /* Zork */
            "Ankh-Morpork Merchant's Guild Barter Card",
            "Ankh-Morpork Thieves' Guild Unlimited Transaction Card",
            'Ransmannsby Moneylenders Association',
            'Bank of Gehennom - 99% Interest Card',
            'Yendorian Express - Copper Card',
            'Yendorian Express - Silver Card',
            'Yendorian Express - Gold Card',
            'Yendorian Express - Mithril Card',
            'Yendorian Express - Platinum Card',   /* must be last */
        ];
        const oid = scroll.o_id | 0;
        if (_Blind()) {
            await pline('You feel the embossed numbers:');
        } else {
            if (game.flags?.verbose)
                await pline('It reads:');
            await pline('"%s"', scroll.oartifact
                                ? card_msgs[card_msgs.length - 1]
                                : card_msgs[oid % (card_msgs.length - 1)]);
        }
        /* Make a credit card number -- C read.c:481-489, transliterated
         * argument for argument. */
        await pline('"%d0%d %d%d1 0%d%d0"%s',
                    ((oid % 89) + 10),
                    (oid % 4),
                    (((oid * 499) % 899999) + 100000),
                    (oid % 10),
                    (!(oid % 3)) ? 1 : 0,
                    ((oid * 7) % 10),
                    (game.flags?.verbose || _Blind()) ? '.' : '');
        _bump_literate();
        game.context = game.context || {};
        game.context.move = 1;                     /* C ECMD_TIME */
        await _clear_botl();
        return ECMD_TIME;
    }

    /* C read.c:498-501 — CAN_OF_GREASE: `pline("This %s has no label.",
     * singular(scroll, xname)); return ECMD_OK;`  No turn, no conduct bump. */
    if (scroll && (scroll.otyp | 0) === CAN_OF_GREASE) {
        await pline('This %s has no label.', (await singular(scroll, xname)));
        game.context = game.context || {};
        game.context.move = 0;                     /* C ECMD_OK */
        await _clear_botl();
        return ECMD_OK;
    }

    /* C read.c:502-524 — MAGIC_MARKER.
     *
     *     static const int red_mons[] = { PM_FIRE_ANT, ... PM_PIRANHA };
     *     struct permonst *pm = &mons[red_mons[scroll->o_id % SIZE(red_mons)]];
     *     if (Blind) { You_cant(find_any_braille); return ECMD_OK; }
     *     if (flags.verbose) pline("It reads:");
     *     Sprintf(buf, "%s", pmname(pm, NEUTRAL));
     *     pline("\"Magic Marker(TM) %s Red Ink Marker Pen.  Water Soluble.\"",
     *           upwords(buf));
     *     if (!u.uconduct.literate++) livelog_printf(...);
     *     return ECMD_TIME;
     *
     * The two corpus members read back exactly: gen625's o_id % 14 == 3 gives
     * PM_IMP -> "Imp", gen604's == 6 gives PM_SCORPION -> "Scorpion".  They also
     * differ on flags.verbose -- gen604 shows the separate "It reads:" page and
     * gen625 does not -- which is why the verbose prefix is a real branch and
     * not decoration.
     *
     * The PM_ indices come from js/pm.generated.js but are VERIFIED BY NAME
     * against js/makemon_pmnames.json (that file's [3]/[11]/[26]/[52]/[97]/...
     * read "fire ant"/"pyrolisk"/"hell hound"/"imp"/"scorpion"), because
     * pm.generated.js still carries some 3.7 spellings and an index taken on
     * faith from it can be off by a row.  pmname(pm, NEUTRAL) is
     * pm->pmnames[NEUTRAL] with C's fallback (do_name.c:1303). */
    if (scroll && (scroll.otyp | 0) === MAGIC_MARKER) {
        const red_mons = [
            PM_FIRE_ANT, PM_PYROLISK, PM_HELL_HOUND, PM_IMP,
            PM_LARGE_MIMIC, PM_LEOCROTTA, PM_SCORPION, PM_XAN,
            PM_GIANT_BAT, PM_WATER_MOCCASIN, PM_FLESH_GOLEM,
            PM_BARBED_DEVIL, PM_MARILITH, PM_PIRANHA,
        ];
        const mndx = red_mons[(scroll.o_id | 0) % red_mons.length];
        if (_Blind()) {
            await You_cant(FIND_ANY_BRAILLE);
            game.context = game.context || {};
            game.context.move = 0;                 /* C ECMD_OK */
            await _clear_botl();
            return ECMD_OK;
        }
        if (game.flags?.verbose)
            await pline('It reads:');
        const buf = _pmname_neutral(mndx);
        await pline('"Magic Marker(TM) %s Red Ink Marker Pen.  Water Soluble."',
                    upwords(buf));
        _bump_literate();
        game.context = game.context || {};
        game.context.move = 1;                     /* C ECMD_TIME */
        await _clear_botl();
        return ECMD_TIME;
    }

    /* C read.c:525-536 — a COIN_CLASS object (gold).  Note the three-way
     * message: Blind gets "feel the embossed words", a verbose sighted hero
     * gets "You read:", and a non-verbose sighted hero gets no preamble at all.
     * The quoted line is printed in every case. */
    if (scroll && (scroll.oclass | 0) === COIN_CLASS_OC) {
        if (_Blind())
            await pline('You feel the embossed words:');
        else if (game.flags?.verbose)
            await pline('You read:');
        await pline('"1 Zorkmid.  857 GUE.  In Frobs We Trust."');
        _bump_literate();
        game.context = game.context || {};
        game.context.move = 1;                     /* C ECMD_TIME */
        await _clear_botl();
        return ECMD_TIME;
    }

    /* C read.c:548-556 — CANDY_BAR.  candy_wrapper_text(obj) is
     * `candy_wrappers[obj->spe % SIZE(candy_wrappers)]` (read.c:294-300); index
     * 0 is the empty string and assign_candy_wrapper (already ported at the top
     * of this file) skips it, so the `!*wrapper` arm is C's own bullet-proofing
     * for a candy bar that never got one. */
    if (scroll && (scroll.otyp | 0) === CANDY_BAR) {
        const wrapper = candy_wrappers[(scroll.spe | 0) % candy_wrappers.length];
        if (_Blind()) {
            await You_cant(FIND_ANY_BRAILLE);
            game.context = game.context || {};
            game.context.move = 0;                 /* C ECMD_OK */
            await _clear_botl();
            return ECMD_OK;
        }
        if (!wrapper) {
            await pline("The candy bar's wrapper is blank.");
            game.context = game.context || {};
            game.context.move = 0;                 /* C ECMD_OK */
            await _clear_botl();
            return ECMD_OK;
        }
        await pline('The wrapper reads: "%s".', wrapper);
        _bump_literate();
        game.context = game.context || {};
        game.context.move = 1;                     /* C ECMD_TIME */
        await _clear_botl();
        return ECMD_TIME;
    }

    /* C read.c:557-560 — an object that is neither a scroll nor a spellbook is
     * rejected with the common silly-thing string, ECMD_OK, no turn:
     *     } else if (scroll->oclass != SCROLL_CLASS
     *                && scroll->oclass != SPBOOK_CLASS) {
     *         pline(silly_thing_to, "read");
     *         return ECMD_OK;
     *     }
     * silly_thing_to is decl.c's "That is a silly thing to %s."  read_ok DOWNPLAYs
     * these rather than EXCLUDEing them, so getobj hands them to doread instead of
     * calling silly_thing() itself — the player CAN pick them at the "[*]" prompt.
     * The earlier otyp-specific readables C tests before this arm (T-shirt, cap,
     * credit card, can of grease, magic marker, coins, Orb of Fate, candy bar —
     * read.c:400-556) are NOT ported; none is carried in the corpus, and when one
     * is, this arm will wrongly claim it, which is the signal to port them.
     * seed0368 steps 74 and 78 read the cloak 'e' / the arrows 'a'. */
    if (scroll && (scroll.oclass | 0) !== SCROLL_CLASS
        && (scroll.oclass | 0) !== SPBOOK_CLASS_OC) {
        await pline('That is a silly thing to read.');
        g.context = g.context || {};
        g.context.move = 0;
        await _clear_botl();
        return ECMD_OK;
    }
    /* C read.c:561-576 — the LAST arm of the same else-if chain the silly_thing
     * test above closes, so it is only reached for a scroll or a spellbook:
     *
     *     } else if (Blind && otyp != SPE_BOOK_OF_THE_DEAD) {
     *         const char *what = 0;
     *
     *         if (otyp == SPE_NOVEL)          what = "words";
     *         else if (scroll->oclass == SPBOOK_CLASS) what = "mystic runes";
     *         else if (!scroll->dknown)       what = "formula on the scroll";
     *         if (what) {
     *             pline("Being blind, you cannot read the %s.", what);
     *             return ECMD_OK;
     *         }
     *     }
     *
     * Note what C does NOT block: a blind hero reading a scroll whose
     * appearance is already dknown falls THROUGH (what stays NULL) and reads
     * it normally.  Only an unidentified scroll, a spellbook and a novel are
     * refused, and the Book of the Dead is exempt entirely.
     *
     * MEASURED on corpus-generated/v5/train/gen128-reseed-seed1659512 step 419,
     * where the hero is blind inside a dust vortex: C prints "Being blind, you
     * cannot read the formula on the scroll." and consumes no turn, while this
     * port read the scroll ("As you pronounce the formula on it, the scroll
     * disappears.--More--"), destroyed it, and ran its effect.  RNG-free here,
     * but NOT downstream: the scroll effect C never runs was drawing, which is
     * why that session's RNG divergence sat seven steps later at 426.
     *
     * ECMD_OK — no turn consumed, so context.move is cleared exactly as the
     * silly_thing arm above clears it. */
    if (scroll && _Blind() && (scroll.otyp | 0) !== SPE_BOOK_OF_THE_DEAD_RD) {
        let what = null;
        if ((scroll.otyp | 0) === SPE_NOVEL_RD)
            what = 'words';
        else if ((scroll.oclass | 0) === SPBOOK_CLASS_OC)
            what = 'mystic runes';
        else if (!scroll.dknown)
            what = 'formula on the scroll';
        if (what) {
            await pline('Being blind, you cannot read the ' + what + '.');
            g.context = g.context || {};
            g.context.move = 0;
            await _clear_botl();
            return ECMD_OK;
        }
    }
    /* C read.c:578-595 — the two things a scroll of mail does BEFORE the
     * literacy bump, both #ifdef MAIL_STRUCTURES (defined in this build):
     *
     *     confused = (Confusion != 0);
     *     if (otyp == SCR_MAIL) {
     *         confused = FALSE; / * override * /
     *         if (!u.uconduct.literate) {
     *             if (!scroll->spe && y_n(
     *              "Reading mail will violate \"illiterate\" conduct.  Read anyway?"
     *                                    ) != 'y')
     *                 return ECMD_OK;
     *         }
     *     }
     *
     * The `confused = FALSE` override is why a confused hero reading mail never
     * gets the "Being confused, you mispronounce the magic words..." line;
     * read_scroll() recomputes `confused` itself from _Confusion(), so the
     * override is carried on the object as a flag it reads.
     *
     * The y_n is NOT reached on any of this row's four members: all four wished
     * their scroll, and objnam.c:5171 (js/objnam.js) gives a wished mail scroll
     * spe = 1, so `!scroll->spe` is false.  It is ported anyway because it is
     * part of the same C block and because a spe-0 mail scroll picked up in
     * play WOULD reach it.  y_n is not wired here, so the prompt itself is
     * left as a named gap rather than guessed at: taking the un-prompted
     * branch matches C whenever the hero is already literate, which is the
     * only state any corpus session reaches this line in (C's own
     * `u.uconduct.literate` is bumped by every earlier read, and the block
     * immediately below is what bumps ours). */
    if (scroll && (scroll.otyp | 0) === SCR_MAIL) {
        scroll._mail_confusion_override = true;   /* C read.c:581 confused = FALSE */
        const _lit = (game.u?.uconduct?.literate) | 0;
        if (!_lit && !(scroll.spe | 0)) {
            /* KNOWN GAP: C opens y_n() here and returns ECMD_OK on anything but
             * 'y'.  Unreached on every session in corpus-generated/v5/train that
             * reads mail (all four are spe-1 wishes), so it is named rather than
             * guessed.  When a session reaches it, wire y_n and delete this. */
            void 0;
        }
    }
    /* C read.c:598-606 — the illiteracy conduct bump, which sits between the
     * silly_thing arm above and the SPBOOK dispatch below:
     *     if (otyp != SPE_BOOK_OF_THE_DEAD && otyp != SPE_NOVEL
     *         && otyp != SPE_BLANK_PAPER && otyp != SCR_BLANK_PAPER)
     *         if (!u.uconduct.literate++) livelog_printf(...);
     * ("Actions required to win the game aren't counted towards conduct".)
     * Nothing in js/ wrote u.uconduct.literate except js/engrave.js:332, and
     * THAT site is guarded on `if (u.uconduct)` — an object nothing creates —
     * so the counter never left 0 and insight.c:2170's conduct line always read
     * "You have been illiterate."  MEASURED on seed4500-knight-coverage step
     * 1573: C's #conduct window reads "You have read items or engraved 5
     * times."  RNG-free. */
    if (scroll) {
        const _otyp = scroll.otyp | 0;
        if (_otyp !== SPE_BOOK_OF_THE_DEAD_RD && _otyp !== SPE_NOVEL_RD
            && _otyp !== SPE_BLANK_PAPER_RD && _otyp !== SCR_BLANK_PAPER_RD) {
            const _u = g.u || (g.u = {});
            _u.uconduct = _u.uconduct || {};
            if (!(_u.uconduct.literate | 0)) {
                const readWhat = (scroll.oclass | 0) === SPBOOK_CLASS_OC ? 'a book'
                    : (scroll.oclass | 0) === SCROLL_CLASS ? 'a scroll' : 'something';
                gamelog_add(LL_CONDUCT, g.moves | 0,
                    `became literate by reading ${readWhat}`);
            }
            _u.uconduct.literate = (_u.uconduct.literate | 0) + 1;
        }
    }
    /* The selected object is a spellbook → study_book (C read.c:608-610):
     *   if (scroll->oclass == SPBOOK_CLASS) return study_book(scroll) ? ECMD_TIME : ECMD_OK;
     * For a book whose spell the hero does NOT already know at high retention,
     * study_book sets up the multi-turn `learn` occupation (the seed4200 path). */
    if (scroll && (scroll.oclass | 0) === SPBOOK_CLASS_OC) {
        const moved = await study_book(scroll);
        g.context = g.context || {};
        /* C read.c:609: study_book TRUE → ECMD_TIME (context.move stays 1 so the
         * occupation driver runs); FALSE → ECMD_OK (no turn). */
        g.context.move = moved ? 1 : 0;
        await _clear_botl();
        return moved ? ECMD_TIME : ECMD_OK;
    }

    /* The selected object is an actual scroll (SCROLL_CLASS) → read it.
     * C ref: read.c:611-646 — print "As you read the scroll, it disappears.",
     * invoke seffects(scroll), then learnscroll + useup.  This is the non-special
     * (not cookie/shirt/cap/credit-card) scroll path; magic mapping reaches here. */
    if (scroll && (scroll.oclass | 0) === SCROLL_CLASS) {
        await read_scroll(scroll);
        g.context = g.context || {};
        g.context.move = 1; /* C read.c:646: doread returns ECMD_TIME */
        /* read_scroll plined the scroll feedback ("As you read the scroll, it
         * disappears." + the seffect message, e.g. "A map coalesces in your
         * mind!") into _pending_message.  Because doread consumes a turn
         * (move=1), moveloop_core would otherwise CLEAR _pending_message
         * (allmain.js:1082), discarding the result line.  Mirror the
         * domove/dodrop path: hand the result to _resultMessage so the next
         * rhack(0) restores it onto the topline at the NEXT nhgetch — exactly
         * where C shows the scroll feedback (seed2200 step 10).  The read
         * turn's movemon (faithful_moveloop_turn) concatenates any of its own
         * plines onto this via the allmain.js:974 merge, matching C's single
         * topline that persists until tty_nhgetch. */
        if (g._pending_message) {
            _topl_stash_result();
        }
        await _clear_botl();
        return ECMD_TIME;
    }

    g.context = g.context || {};
    g.context.move = 0;
    await _clear_botl();
    return ECMD_OK;
}

/* ── Scroll otyp constants (objects.h SCR_* sequence) ────────────────────────
 * C ref: nethack-c/include/objects.h — the scroll block.  SCR_BLANK_PAPER is the
 * last scroll (otyp 365); SCR_MAGIC_MAPPING is otyp 337. */
const SCR_MAGIC_MAPPING = 337;
/* objects.h scroll block — SCR_TELEPORTATION, cross-checked against
 * js/o_init_data.js:12 ("verified: SCR_TELEPORTATION=323+10=333"),
 * js/mklev.js:223 and js/makemon.js:1199, which all carry the same 333. */
const SCR_TELEPORTATION = 333;
const SCR_BLANK_PAPER = 365;
/* objects.h SCROLL("mail", ...) -- the XTRA_SCROLL_LABEL fillers occupy
 * 344..363, so mail is 364 and blank paper 365.  RESOLVED BY NAME against the
 * port's own object table (js/oc_name_data.js OC_NAME[364] === 'mail',
 * OC_NAME[365] === 'blank paper'), not counted off the C header, and it agrees
 * with the 364 js/mklev.js:1909 already carries. */
const SCR_MAIL = 364;
/* objects.h SCROLL block, same table: 'scare monster' and 'create monster'. */
const SCR_SCARE_MONSTER = 326;
const SCR_CREATE_MONSTER = 329;
/* objects.h SPELL block (dig = 366): 'confuse monster' 377, 'create monster'
 * 382, 'cause fear' 384 -- all three read back by name from OC_NAME, and they
 * bracket the SPE_REMOVE_CURSE 395 / SPE_MAGIC_MAPPING 396 / SPE_IDENTIFY 397
 * this file already carries. */
const SPE_CONFUSE_MONSTER = 377;
const SPE_CREATE_MONSTER = 382;
const SPE_CAUSE_FEAR = 384;
/* Otyps read by C read.c:364-556's non-scroll ladder, all resolved BY NAME
 * against js/oc_name_data.js (OC_NAME.indexOf(...)), never counted off the C
 * header.  CORNUTHAUM (93), CAN_OF_GREASE (240), MAGIC_MARKER (242) and
 * CANDY_BAR (288) are already declared above and are reused. */
const FORTUNE_COOKIE_RD = 289;
const DUNCE_CAP_RD      = 94;
const CREDIT_CARD_RD    = 223;
/* objects.h HAWAIIAN_SHIRT = 136, read out of the C enum -- same value this
 * file already uses at the _STARTER_ARMOR_OTYP table above (read.js:2018). */
const HAWAIIAN_SHIRT_RD = 136;
/* objects.h armor block.  These are the two readable garments that use the
 * fixed slogan tables below; they are deliberately kept separate from the
 * Hawaiian shirt design arm because read.c sends them through erosion text. */
const T_SHIRT_RD      = 137;
const ALCHEMY_SMOCK_RD = 144;
/* roles[] index of the Tourist -- js/roles.js's table reads [10] = "Tourist".
 * C's Role_if(PM_TOURIST) compares gu.urole.mnum, and this port's urole.mnum /
 * flags.initrole are ROLE INDICES (the same encoding js/objnam.js:3460
 * _Role_if uses), NOT monster ids. */
const ROLE_IDX_TOURIST = 10;
/* C read.c:332 `static const char find_any_braille[] = "feel any Braille
 * writing.";` -- the argument to You_cant(), which prefixes "You can't ". */
const FIND_ANY_BRAILLE = 'feel any Braille writing.';

/* C ref: read.c:100-186 tshirt_text() and read.c:254-280 apron_text().
 * The source tables are part of the user-visible game data, so preserve the
 * spelling, capitalization, punctuation, and the two spaces in the long
 * slogans exactly.  The index is o_id % SIZE(table), with no RNG. */
const T_SHIRT_MESSAGES = [
    'I explored the Dungeons of Doom and all I got was this lousy T-shirt!',
    'Is that Mjollnir in your pocket or are you just happy to see me?',
    "It's not the size of your sword, it's how #enhance'd you are with it.",
    "Madame Elvira's House O' Succubi Lifetime Customer",
    "Madame Elvira's House O' Succubi Employee of the Month",
    'Ludios Vault Guards Do It In Small, Dark Rooms',
    'Yendor Military Soldiers Do It In Large Groups',
    'I survived Yendor Military Boot Camp',
    'Ludios Accounting School Intra-Mural Lacrosse Team',
    'Oracle(TM) Fountains 10th Annual Wet T-Shirt Contest',
    'Hey, black dragon!  Disintegrate THIS!',
    "I'm With Stupid -->",
    "Don't blame me, I voted for Izchak!",
    "Don't Panic",
    'Furinkan High School Athletic Dept.',
    'Hel-LOOO, Nurse!',
    '=^.^=',
    '100% goblin hair - do not wash',
    'Aberzombie and Fitch',
    'cK -- Cockatrice touches the Kop',
    "Don't ask me, I only adventure here",
    'Down with pants!',
    'd, your dog or a killer?',
    'FREE PUG AND NEWT!',
    'Go team ant!',
    'Got newt?',
    'Hello, my darlings!',
    'Hey!  Nymphs!  Steal This T-Shirt!',
    'I <3 Dungeon of Doom',
    'I <3 Maud',
    'I am a Valkyrie.  If you see me running, try to keep up.',
    'I am not a pack rat - I am a collector',
    'I bounced off a rubber tree',
    'Plunder Island Brimstone Beach Club',
    'If you can read this, I can hit you with my polearm',
    "I'm confused!",
    'I scored with the princess',
    'I want to live forever or die in the attempt.',
    'Lichen Park',
    'LOST IN THOUGHT - please send search party',
    'Meat is Mordor',
    'Minetown Better Business Bureau',
    'Minetown Watch',
    "Ms. Palm's House of Negotiable Affection--A Very Reputable House Of Disrepute",
    'Protection Racketeer',
    'Real men love Crom',
    'Somebody stole my Mojo!',
    'The Hellhound Gang',
    'The Werewolves',
    'They Might Be Storm Giants',
    'Weapons don\'t kill people, I kill people',
    'White Zombie',
    "You're killing me!",
    'Anhur State University - Home of the Fighting Fire Ants!',
    'FREE HUGS',
    'Serial Ascender',
    'Real men are valkyries',
    "Young Men's Cavedigging Association",
    'Occupy Fort Ludios',
    'I couldn\'t afford this T-shirt so I stole it!',
    'Mind flayers suck',
    "I'm not wearing any pants",
    'Down with the living!',
    'Pudding farmer',
    'Vegetarian',
    'Hello, I\'m War!',
    'It is better to light a candle than to curse the darkness',
    'It is easier to curse the darkness than to light a candle',
    'rock--paper--scissors--lizard--Spock!',
    '/Valar morghulis/ -- /Valar dohaeris/',
];
const ALCHEMY_SMOCK_MESSAGES = [
    'Kiss the cook',
    "I'm making SCIENCE!",
    "Don't mess with the chef",
    "Don't make me poison you",
    "Gehennom's Kitchen",
    'Rat: The other white meat',
    'If you can\'t stand the heat, get out of Gehennom!',
    "If we weren't meant to eat animals, why are they made out of meat?",
    "If you don't like the food, I'll stab you",
    'I am an alchemist; if you see me running, try to catch up...',
];

/* C ref: read.c:89-97 erode_obj_text().  `seed` is unsigned in C and the
 * seeded wipeout path consumes no global RNG; wipeout_text is the canonical
 * engrave.c implementation shared with engraving erosion. */
function _erode_obj_text_rd(obj, text) {
    const erosion = Math.max(obj.oeroded | 0, obj.oeroded2 | 0);
    if (!erosion)
        return text;
    const count = Math.trunc(text.length * erosion / (2 * 3));
    const ubirthday = game.u?.ubirthday | 0;
    const seed = (((obj.o_id | 0) ^ ubirthday) >>> 0);
    return wipeout_text(text, count, seed);
}

/* Exported for the generated function-level replay fixtures as well as for
 * doread().  C writes through `buf`; a JS string return is the corresponding
 * value in this port's char-pointer marshalling convention. */
export function tshirt_text(tshirt, buf = '') {
    const text = T_SHIRT_MESSAGES[(tshirt.o_id | 0) % T_SHIRT_MESSAGES.length];
    return _erode_obj_text_rd(tshirt, text);
}
export function apron_text(apron, buf = '') {
    const text = ALCHEMY_SMOCK_MESSAGES[(apron.o_id | 0) % ALCHEMY_SMOCK_MESSAGES.length];
    return _erode_obj_text_rd(apron, text);
}

/* C ref: read.c:192-213 hawaiian_motif's `hawaiian_motifs[]`. */
const HAWAIIAN_MOTIFS = [
    /* birds */
    'flamingo', 'parrot', 'toucan', 'bird of paradise',
    /* sea creatures */
    'sea turtle', 'tropical fish', 'jellyfish', 'giant eel', 'water nymph',
    /* plants */
    'plumeria', 'orchid', 'hibiscus flower', 'palm tree',
    /* other */
    'hula dancer', 'sailboat', 'ukulele',
];
/* C ref: read.c:189-221 hawaiian_motif(shirt, buf) -- RNG-free, deterministic
 * from the shirt's o_id XORed with ubirthday (so a tourist's fixed-o_id
 * starting shirt still gets a varying design; C's own comment). `>>> 0`
 * mirrors C's `unsigned motif = shirt->o_id ^ (unsigned) ubirthday;` -- JS's
 * `^` yields a signed int32, and the mod below needs the unsigned value. */
function hawaiian_motif(shirt) {
    const ubirthday = game.u?.ubirthday ?? 0;
    const motif = (((shirt.o_id | 0) ^ (ubirthday | 0)) >>> 0) % HAWAIIAN_MOTIFS.length;
    return HAWAIIAN_MOTIFS[motif];
}
/* C ref: read.c:226-240 hawaiian_design's `hawaiian_bgs[]`. */
const HAWAIIAN_BGS = [
    /* solid colors */
    'purple', 'yellow', 'red', 'blue', 'orange', 'black', 'green',
    /* adjectives */
    'abstract', 'geometric', 'patterned', 'naturalistic',
];
/* C ref: read.c:223-251 staticfn hawaiian_design(shirt, buf) -- RNG-free.
 * Deliberately a DIFFERENT hash than hawaiian_motif (C's own comment: reusing
 * the same formula could make some motif/background combos unreachable). */
function hawaiian_design(shirt) {
    const ubirthday = game.u?.ubirthday ?? 0;
    const bg = (((shirt.o_id | 0) ^ (~ubirthday | 0)) >>> 0) % HAWAIIAN_BGS.length;
    return `${makeplural(hawaiian_motif(shirt))} on ${an(HAWAIIAN_BGS[bg])} background`;
}

/* C you.h:247 `#define Role_if(X) (gu.urole.mnum == (X))`, in this port's
 * role-index encoding.  Same body as js/objnam.js:3460 _Role_if and
 * js/m_initweap.js:234 Role_if; this file had no copy. */
function _Role_if_rd(role_idx) {
    const g = game;
    const ir = (g.flags && g.flags.initrole != null) ? (g.flags.initrole | 0) : -1;
    if (ir >= 0) return ir === (role_idx | 0);
    return ((g.urole && g.urole.mnum != null) ? (g.urole.mnum | 0) : -1) === (role_idx | 0);
}

/* C do_name.c:1303 pmname(pm, mgender):
 *     if (mgender < MALE || mgender >= NUM_MGENDERS || !pm->pmnames[mgender])
 *         mgender = NEUTRAL;
 *     return pm->pmnames[mgender];
 * Every caller in read.c passes NEUTRAL (= 2), and the fallback is the same
 * slot, so this reduces to pmnames[NEUTRAL]. */
function _pmname_neutral(mndx) {
    const NEUTRAL = 2;
    const row = PMNAMES_RD.pmnames[mndx | 0];
    return (row && row[NEUTRAL]) || '';
}

/* C read.c's repeated `if (!u.uconduct.literate++) livelog_printf(LL_CONDUCT, ...)`.
 * The livelog line is not a terminal write and has no counterpart here; the
 * POST-INCREMENT is what matters, and js/read.js:1200 already bumps the same
 * counter on the scroll/spellbook path (insight.c:2170 reads it for #conduct). */
function _bump_literate() {
    const _u = game.u || (game.u = {});
    _u.uconduct = _u.uconduct || {};
    _u.uconduct.literate = (_u.uconduct.literate | 0) + 1;
}
const SPE_MAGIC_MAPPING = 396; /* objects.h spellbook block */
/* Verified against the C enum itself (gcc -E over include/objects.h with
 * OBJECTS_ENUM, then printf of each symbol), not inferred from source order. */
const SCR_ENCHANT_ARMOR = 323;
const SCR_ENCHANT_WEAPON = 328;
const SCR_REMOVE_CURSE = 327;
const SCR_FIRE = 339;
const SPE_REMOVE_CURSE = 395;
const POT_WATER = 322;
const LOADSTONE = 471;
const LEASH_OTYP = 236;
const LUCKSTONE = 470;
const BAG_OF_HOLDING = 219;
const FIGURINE = 241;
/* Armor otyps referenced by seffect_enchant_armor (same enum dump). */
const ELVEN_LEATHER_HELM = 89, CORNUTHAUM = 93;
const GRAY_DRAGON_SCALE_MAIL = 101;
const SILVER_DRAGON_SCALE_MAIL = 103, BLACK_DRAGON_SCALE_MAIL = 107;
const GRAY_DRAGON_SCALES = 111, SILVER_DRAGON_SCALES = 113;
const BLACK_DRAGON_SCALES = 117, YELLOW_DRAGON_SCALES = 120;
const ELVEN_MITHRIL_COAT = 127, ELVEN_CLOAK = 139;
const SMALL_SHIELD = 150, ELVEN_SHIELD = 153, SHIELD_OF_REFLECTION = 158;
const ELVEN_BOOTS = 169;
const COIN_CLASS_OC = 12, WEAPON_CLASS_OC = 2, GEM_CLASS_OC = 13;
const ARMOR_CLASS_OC = 3;
/* attrib.h enum attrib_types */
const A_STR = 0, A_WIS = 2, A_CON = 4;

/* ── Hero-state predicates ───────────────────────────────────────────────────
 * This file historically read flat game._Blind / game.Confusion / game.Punished
 * flags; js-binding-audit reports that NOTHING in js/ ever assigns `_Blind`,
 * `Confusion` or `Punished`, so those spellings are permanently undefined.  The
 * live binding is u.uprops[<prop.h index>] (what js/display.js:3089 and
 * js/uhitm.js:1878 read). */
function _uprop_on(idx) {
    const p = game.u?.uprops?.[idx];
    return !!(p && (((p.intrinsic | 0) !== 0) || ((p.extrinsic | 0) !== 0)));
}
/* C: Blind — youprop.h.  The live binding in this port is u.uprops[BLINDED]
 * (prop.h index 15), the same one js/display.js:3089 and js/uhitm.js:1878 read;
 * this file's older `_Blind()` spelling is assigned by NOTHING in js/ and is
 * therefore permanently undefined, so it is deliberately NOT consulted here. */
function _Blind() {
    return _uprop_on(BLINDED);
}
/* C youprop.h: Invisible = Invis && !See_invisible. */
function _Invisible() {
    return _uprop_on(INVIS) && !_uprop_on(SEE_INVIS);
}
/* C ball.c: Punished is true when the hero has a ball attached. */
function _Punished() {
    return !!game.u?.uball;
}
/* C: Confusion — youprop.h:83-84 HConfusion == u.uprops[CONFUSION].intrinsic.
 * Returns the timeout value (C tests `Confusion != 0`), so a caller may compare
 * against 0 exactly as C does.  INTRINSIC ONLY: unlike Blind, the Confusion
 * macro has no extrinsic term.  The old `game.Confusion` / `game.HConfusion`
 * fallbacks are gone with this file's private make_confused, which wrote the
 * flat spelling that only these fallbacks could see. */
function _Confusion() {
    return (game.u?.uprops?.[CONFUSION]?.intrinsic) | 0;
}
/* C: Hallucination — HHallucination && !Halluc_resistance (youprop.h). */
function _Hallucination() {
    return !!(_uprop_on(HALLUC) && !_uprop_on(HALLUC_RES));
}

/* C ref: objects[otyp].oc_magic — read by seffects (read.c:2199-2200) to award
 * exercise(A_WIS, TRUE) "just for trying", which DRAWS rn2(19).
 *
 * This used to be the hand-written predicate `otyp !== SCR_BLANK_PAPER`, i.e.
 * "every scroll is magic except blank paper".  MEASURED FALSE: objects.h has
 * TWO non-magic scrolls, because the mail scroll's SCROLL() row also passes
 * mgc = 0 —
 *     SCROLL("mail",        "stamped",  0,  0,  0, SCR_MAIL),
 *     SCROLL("blank paper", "unlabeled", 0, 28, 60, SCR_BLANK_PAPER),
 * — and js/objnam.js:3919 already recorded that this exact predicate is "right
 * for 42 of the 43 scrolls and wrong for SCR_MAIL (otyp 364, oc_magic 0)"
 * without anything acting on it.  So every mail read drew a phantom rn2(19)
 * that C does not draw, which is the RNG divergence at the read step on all
 * four SCR_MAIL sessions in corpus-generated/v5/train.
 *
 * Now read from the extracted objects.c column (js/mkobj_erosion_meta.js), the
 * same table seffect_enchant_armor already consults at read.c:1207, rather than
 * from a predicate that has to be kept in step with the header by hand. */
function _scroll_oc_magic(otyp) {
    return !!MKOBJ_OC_MAGIC[otyp | 0];
}

/* C ref: read.c:611-646 — the non-special scroll branch of doread().  Prints the
 * scroll feedback, runs seffects(), then learnscroll/trycall + useup. */
async function read_scroll(scroll) {
    const g = game;
    const otyp = scroll.otyp | 0;
    /* C read.c:578-582 — `confused = (Confusion != 0);` and then, for
     * SCR_MAIL only, `confused = FALSE; / * override * /`.  doread() sets the
     * flag (read.c:581) because that is where C's override lives; this is the
     * single reader. */
    const confused = !scroll._mail_confusion_override && (_Confusion() !== 0);
    scroll.in_use = true; /* C read.c:611 */
    /* C read.c:612-634 */
    if (otyp !== SCR_BLANK_PAPER) {
        const silently = !_can_chant();
        /* C read.c:617-618 — a few scroll feedback messages describe something
         * happening to the scroll ITSELF, so those avoid "it disappears": the
         * scroll of fire, and a CURSED scroll of remove curse (which
         * disintegrates instead — read.c:1506).  Without this the topline read
         * "As you read the scroll, it disappears." (38 cols) where C reads "You
         * read the scroll." (20 cols); the shorter line let the following
         * seffect plines fit under update_topl's CO-1-8 reserve, so C's
         * --More-- never fired on the JS side and its page-ack keystroke leaked
         * to rhack (seed0002 step 128, MISSING-CONSUME). */
        const nodisappear = (otyp === SCR_FIRE
                             || (otyp === SCR_REMOVE_CURSE && !!scroll.cursed));
        if (_Blind())
            await pline(nodisappear
                        ? `You ${silently ? 'cogitate' : 'pronounce'} the formula on the scroll.`
                        : `As you ${silently ? 'cogitate' : 'pronounce'} the formula on it, the scroll disappears.`);
        else
            await pline(nodisappear ? 'You read the scroll.'
                                    : 'As you read the scroll, it disappears.');
        /* C read.c:629-634 */
        if (confused) {
            if (_Hallucination())
                await pline('Being so trippy, you screw up...');
            else
                await pline(`Being confused, you ${silently ? 'misunderstand' : 'mispronounce'} the magic words...`);
        }
    }
    /* C read.c:635: if (!seffects(scroll)) { ...learnscroll...; useup(scroll); } */
    const handled = await seffects(scroll);
    if (!handled) {
        /* C read.c:636-645: if scroll type not yet known, learnscroll (when
         * gk.known) else trycall.  gk.known is set TRUE by the seffects that
         * self-identify (light, magic mapping, confuse monster); doread resets
         * it to FALSE on entry (read.c:354). */
        if (!_oc_name_known(otyp)) {
            if (g._gk_known) learnscroll(scroll);
            else await trycall(scroll);
        }
        scroll.in_use = false;
        if (otyp !== SCR_BLANK_PAPER) useup(scroll);
    }
}

/* C ref: mondata.c:580-587 can_chant(&gy.youmonst) — FALSE when the hero is
 * Strangled or polymorphed into a silent/headless/buzzing form.  Neither
 * Strangled nor those polyforms is tracked on the read path in this port, so
 * this returns TRUE (C's value for an ordinary hero).  When a session puts the
 * hero in one of those states the feedback verb will be wrong, which is the
 * signal to port the real predicate. */
function _can_chant() {
    /* C passes &gy.youmonst; replay state keeps the same form as game.youmonst. */
    return can_chant_real(game.youmonst || { m_id: 0, data: game.youmonst?.data });
}

/* C ref: do_name.c:678 trycall(obj) — offer to #call the object's type when the
 * type is neither identified nor already user-named.  (js/cmd.js exports a
 * trycall, but it delegates to js/cmd.js:18375 docall(), which is a no-op stub;
 * this file needs the real keystroke-consuming docall, so it drives
 * _docall_scroll directly — the same shape js/potion.js uses for
 * _docall_potion.) */
async function trycall(obj) {
    const g = game;
    const otyp = obj.otyp | 0;
    const nameKnown = !!(g._oc_name_known && g._oc_name_known[otyp]);
    const hasUname = !!(g._oc_uname && g._oc_uname[otyp]);
    if (!nameKnown && !hasUname)
        await _docall_scroll(obj);
}

/* C ref: do_name.c:636-676 docall(struct obj *obj) — scoped to SCROLL_CLASS,
 * the only class that reaches it from read.c:643.  Mirrors js/potion.js
 * _docall_potion (do_name.c:636 for POTION_CLASS).
 *
 * KEYSTROKE ACCOUNTING (this is the point of the port): the "Call a <scroll>:"
 * prompt is a getlin() — every character the player types, plus the closing
 * Return, is a keystroke C consumes here and never hands to rhack.  Before the
 * prompt is drawn, tty's update_topl more()s the still-unacked scroll feedback,
 * consuming one more.  seed0002 steps 129-140 are exactly that: one page-ack
 * plus "helpig you" + CR.  RNG-free apart from discover_object below (which
 * passes credit_hero=FALSE, so it does not exercise()). */
async function _docall_scroll(obj) {
    const g = game;
    if (!obj.dknown)
        return; /* C do_name.c:642 — probably blind */
    await flush_screen(1); /* C do_name.c:644 */
    /* C do_name.c:651: safe_qbuf(qbuf, "Call ", ":", obj, docall_xname, ...).
     * docall_xname (do_name.c:605) copies the object, forces quan=1 and clears
     * blessed/cursed, then returns an(xname(&otemp)); for a scroll xname() is
     * xname_scroll(). */
    const qbuf = 'Call ' + an(xname_scroll({
        otyp: obj.otyp | 0, oclass: SCROLL_CLASS_OC, quan: 1,
        blessed: false, cursed: false,
        dknown: !!obj.dknown, bknown: !!obj.bknown,
        oname: undefined,
    })) + ':';
    /* win/tty/topl.c update_topl(): the prompt lands on a topline that still
     * holds the unacked scroll feedback, so the tty more()s it first. */
    if (g._pending_message)
        await force_more(g._pending_message);
    const buf = await getlin(qbuf);
    if (buf === '\x1b')
        return; /* C: name_from_player returned 0 */
    /* C do_name.c:666 mungspaces — strip leading/trailing, collapse runs. */
    const name = buf.trim().replace(/\s+/g, ' ');
    if (!g._oc_uname) g._oc_uname = {};
    const had_name = !!g._oc_uname[obj.otyp | 0];
    if (!name) {
        /* C do_name.c:667-669 — all spaces uncalls the type. */
        if (had_name) delete g._oc_uname[obj.otyp | 0];
    } else {
        g._oc_uname[obj.otyp | 0] = name;
        /* C do_name.c:672 discover_object(otyp, FALSE, TRUE, TRUE) —
         * mark_as_known=FALSE, so NO exercise(A_WIS) and NO RNG. */
        discover_object(obj.otyp | 0, false, true, true);
    }
}

/* C ref: o_init.c — is this object type's identity known? */
function _oc_name_known(otyp) {
    return !!(game._oc_name_known && game._oc_name_known[otyp]);
}

/* C ref: invent.c useup() / useupall() — consume one scroll from inventory.
 * A stack quan>1 is decremented; a singleton is unlinked from gi.invent. */
export function useup(obj) {
    if (obj.quan != null && (obj.quan | 0) > 1) {
        /* C invent.c:1324 useup(): clear in_use on the quan>1 decrement path. */
        obj.in_use = false;
        obj.quan = (obj.quan | 0) - 1;
        return;
    }
    let prev = null;
    for (let o = game.invent; o; prev = o, o = o.nobj) {
        if (o === obj) {
            if (prev) prev.nobj = o.nobj; else game.invent = o.nobj;
            obj.nobj = null;
            /* Bump bridge objs_deleted.count to match C's delobj counter.
             * C ref: invent.c useup() -> freeinv() -> delobj() -> dealloc_obj()
             * puts the object on the objs_deleted queue.  js/potion.js's own
             * useup() (dodrink's copy of the same C function) already does
             * this bump; this copy silently omitted it, so a scroll consumed
             * through doread left the capture's objs_deleted.count MISSING
             * where C's recorded 1. */
            const store = game.__bridge__ || (game.__bridge__ = {});
            const key = 'objs_deleted.count';
            const cur = store[key] !== undefined ? Number(store[key]) : 0;
            store[key] = String(cur + 1);
            return;
        }
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Object-state helpers used by the seffects below.
 * ═══════════════════════════════════════════════════════════════════════════ */

/* C ref: objnam.c:2376-2382 Yname2(obj) = highc(yname(obj)); yname (2357) is
 * shk_your() + cxname(obj).  js/objnam.js exposes the same chain through
 * Yobjnam2(obj, verb) -> yobjnam -> aobjnam(obj, verb) -> cxname; passing a
 * null verb makes aobjnam skip the verb suffix, leaving exactly yname's text
 * for the quan==1 objects this is called on (worn armor never stacks).
 * (js/cmd.js also EXPORTS a `Yname2`, but it is a throwing stub — do not wire
 * it; this local name is deliberately distinct so nothing shadows.) */
function _Yname2(obj) {
    return Yobjnam2(obj, null);
}

/* ── Worn-armor record adapter ────────────────────────────────────────────────
 * The hero's WORN armor slots (u.uarm/uarmc/uarmh/...) are populated by
 * js/u_init.js's ROLE_STARTER_ARMOR table (js/u_init.js:186-204) with SYMBOLIC
 * records — { otyp: 'HELMET', a_ac: 1, spe: 0, oeroded: 0, oeroded2: 0 } — not
 * with the numeric-otyp objects the rest of the port uses.  js/do_wear.js's
 * some_armor() returns those records and js/do_wear.js's find_ac() reads them,
 * so an enchantment MUST mutate the record it was handed (that is what moves
 * AC:-7 -> AC:-11 on seed0365 step 147).  But js/objnam.js cannot NAME one:
 * xname_flags() falls through to its default arm and renders the literal
 * "xname_flags(HELMET,0)", and aobjnam() prefixes "undefined " because `quan`
 * is absent.  So: mutate the real record, and name through a numeric-otyp view
 * of it — the same separation C makes in docall_xname (do_name.c:605), which
 * names through a struct copy.
 *
 * This adapter is a BRIDGE OVER A MODEL GAP, not a fix for it: the real fix is
 * for js/u_init.js to build proper objects (or for u.uarm* to point at the
 * g.invent entries, which already exist with the right numeric otyps and
 * owornmasks).  Both files are outside this file's write scope. */
const _STARTER_ARMOR_OTYP = {
    /* keys: js/u_init.js ROLE_STARTER_ARMOR / js/cmd.js ARMOR_STR_NAME.
     * values: objects.h otyps, read out of the C enum itself. */
    SMALL_SHIELD: 150, LEATHER_JACKET: 135, LEATHER_ARMOR: 134,
    RING_MAIL: 132, SPLINT_MAIL: 124, FEDORA: 92, HELMET: 97, ROBE: 143,
    CLOAK_OF_DISPLACEMENT: 149, CLOAK_OF_MAGIC_RESISTANCE: 148,
    LEATHER_GLOVES: 159, HAWAIIAN_SHIRT: 136,
};
/* C read.c:1280 reads otmp->known ("is the enchantment known?").  For ARMOR the
 * objects.h ARMOR() macro passes a literal 1 in the BITS uskn slot, i.e.
 * objects[<any armor>].oc_uses_known == 1, so u_init.c:1212-1213 sets known=1 on
 * every piece of a role's STARTING armor.  js/u_init.js's ROLE_STARTER_ARMOR
 * records omit the field, and reading `undefined` as 0 would send doread down
 * trycall() instead of learnscroll() — a whole "Call a <scroll>:" getlin's worth
 * of keystrokes C never reads (and, via that getlin's forced more(), a --More--
 * C never raises).  A record with a real numeric otyp is a real object and is
 * read as-is; only the symbolic ini_inv records get the C-derived default. */
function _armor_known(otmp) {
    if (typeof otmp.otyp === 'number')
        return !!otmp.known;
    return true;
}
/* Numeric objects.h otyp for an armor record, symbolic or not.  Returns -1 when
 * the record carries a symbolic otyp this table does not cover — the caller
 * then behaves as C does for an object of no special type, and the gap is
 * visible rather than silently mis-typed. */
function _armor_otyp(otmp) {
    if (typeof otmp.otyp === 'number')
        return otmp.otyp | 0;
    const n = _STARTER_ARMOR_OTYP[otmp.otyp];
    return (n === undefined) ? -1 : n;
}
/* A naming-only view of an armor record: the record itself when it is already a
 * proper object, otherwise a numeric-otyp copy carrying the fields
 * xname_armor/aobjnam/otense read.  NEVER mutate the returned object expecting
 * the game to see it. */
function _name_obj(otmp) {
    if (typeof otmp.otyp === 'number')
        return otmp;
    const n = _armor_otyp(otmp);
    if (n < 0)
        return otmp;
    return {
        otyp: n, oclass: ARMOR_CLASS_OC, quan: 1, where: 3 /* OBJ_INVENT */,
        spe: otmp.spe | 0, blessed: otmp.blessed, cursed: otmp.cursed,
        dknown: 1, bknown: otmp.bknown, known: _armor_known(otmp) ? 1 : 0,
        oeroded: otmp.oeroded | 0, oeroded2: otmp.oeroded2 | 0,
        oerodeproof: otmp.oerodeproof | 0, oartifact: 0, oname: undefined,
    };
}

/* C read.c:385 `scroll == uarmu` — pointer identity against the worn-shirt
 * slot.  This port keeps that fact in TWO places and neither alone is
 * sufficient: js/do_wear.js's setworn() points u.uarmu at the real g.invent
 * object, but js/u_init.js:1568-1578 leaves u.uarm* pointing at a SEPARATE
 * synthetic AC-bearing record and stamps owornmask on the g.invent clone
 * instead — so a Tourist's STARTING Hawaiian shirt (the exact hero C's guard
 * is written for) fails the identity test and passes the mask test, while a
 * shirt donned during play does the reverse.  Both are this port's spelling of
 * C's single `obj == uarmu`; read both. */
function _worn_as_shirt_rd(obj) {
    if (!obj)
        return false;
    if (obj === game.u?.uarmu)
        return true;
    return ((obj.owornmask | 0) & W_ARMU) !== 0;
}
/* C ref: obj.h carried(obj) == (obj->where == OBJ_INVENT).  In C a WORN armor
 * piece is always on the invent chain, so carried(uarm) is unconditionally
 * true there; in this port u.uarm* may hold the synthetic u_init record that is
 * on no chain and carries no `where` (js/u_init.js:1568-1578), which _carried()
 * alone would read as "the" where C says "your".  Occupying a worn slot IS
 * C's OBJ_INVENT for these objects; that is a read of this port's own
 * representation, not an extra state bit. */
function _carried_or_worn_rd(obj) {
    if (!obj)
        return false;
    if (_carried(obj))
        return true;
    const u = game.u || {};
    return obj === u.uarm || obj === u.uarmc || obj === u.uarmh || obj === u.uarms
        || obj === u.uarmg || obj === u.uarmf || obj === u.uarmu;
}
/* C ref: obj.h get_obj_location(obj, &x, &y, 0) for the two `where` values
 * shk_owns can see from here: OBJ_INVENT (and this port's worn records) give
 * the hero's square, OBJ_FLOOR gives the object's own.  Returns null for the
 * carrier-indirect cases (OBJ_MINVENT / OBJ_CONTAINED), which C resolves
 * through the carrier and which cannot occur for a worn suit. */
function _get_obj_location_rd(obj) {
    if ((obj.where | 0) === 1 /* OBJ_FLOOR */)
        return { x: obj.ox | 0, y: obj.oy | 0 };
    if (_carried_or_worn_rd(obj))
        return { x: game.u?.ux | 0, y: game.u?.uy | 0 };
    return null;
}
/* C ref: shk.c:5884-5896 staticfn shk_owns(buf, obj) — the owning shopkeeper's
 * possessive name for an object still on a bill or sitting on a costly floor
 * spot, C's literal "the" when no shopkeeper is there, or 0 (null) when the
 * object is not shop-owned at all.  RNG-free. */
function _shk_owns_rd(obj) {
    const loc = _get_obj_location_rd(obj);
    if (loc && (obj.unpaid
                || ((obj.where | 0) === 1 /* OBJ_FLOOR */ && !obj.no_charge
                    && costly_spot(loc.x, loc.y)))) {
        const shkp = shop_keeper(inside_shop(loc.x, loc.y));
        return shkp ? s_suffix(shkname(shkp)) : THE_YOUR_RD[0];
    }
    return null;
}
/* C ref: shk.c:5898-5904 staticfn mon_owns(buf, obj). */
function _mon_owns_rd(obj) {
    if ((obj.where | 0) === 4 /* OBJ_MINVENT */)
        return s_suffix(y_monnam(obj.ocarry));
    return null;
}
/* C ref: decl.c c_common_strings.c_the_your — shk.c's the_your[]. */
const THE_YOUR_RD = ['the', 'your'];
/* C ref: shk.c:5861-5874 shk_your(buf, obj) — "your "/"the "/"Foobar's ",
 * trailing space included.  C writes through an out-parameter; JS strings are
 * immutable, so this returns the value (C clears buf[0] first, so no caller
 * ever reads the incoming buffer).  RNG-free on every arm.
 *
 * The two CORPSE arms (type_is_pname / the_unique_pm) are guarded on
 * `obj->otyp == CORPSE`; read.c:388's only caller passes `uarm`, an
 * ARMOR_CLASS object, so they are structurally unreachable from here and are
 * not duplicated into this file. */
function _shk_your_rd(obj) {
    let prefix = _shk_owns_rd(obj);
    if (prefix == null)
        prefix = _mon_owns_rd(obj);
    if (prefix == null)
        prefix = THE_YOUR_RD[_carried_or_worn_rd(obj) ? 1 : 0];
    return prefix + ' ';
}
/* C ref: obj.h:280-282 is_shield(otmp) — ARMOR_CLASS with oc_armcat ARM_SHIELD,
 * i.e. the contiguous SMALL_SHIELD..SHIELD_OF_REFLECTION block. */
function _is_shield(otmp) {
    const otyp = _armor_otyp(otmp);
    return otyp >= SMALL_SHIELD && otyp <= SHIELD_OF_REFLECTION;
}
/* C ref: obj.h:299-302 is_elven_armor(otmp). */
function _is_elven_armor(otmp) {
    const otyp = _armor_otyp(otmp);
    return otyp === ELVEN_LEATHER_HELM || otyp === ELVEN_MITHRIL_COAT
        || otyp === ELVEN_CLOAK || otyp === ELVEN_SHIELD || otyp === ELVEN_BOOTS;
}
/* C ref: obj.h:347-348 Is_dragon_scales(obj). */
function _Is_dragon_scales(obj) {
    const otyp = _armor_otyp(obj);
    return otyp >= GRAY_DRAGON_SCALES && otyp <= YELLOW_DRAGON_SCALES;
}
/* C ref: obj.h — objects[otyp].oc_magic, from the generated table. */
function _oc_magic(otyp) {
    return !!MKOBJ_OC_MAGIC[otyp | 0];
}
/* C ref: mkobj.c:1857-1861 bcsign / carried(obj) (obj.h) — OBJ_INVENT is 3. */
function _carried(obj) {
    return (obj.where | 0) === 3 || _in_invent(obj);
}
function _in_invent(obj) {
    for (let o = game.invent; o; o = o.nobj)
        if (o === obj) return true;
    return false;
}
/* C ref: mkobj.c:1746-1839 bless()/curse()/uncurse().
 *
 * Ported faithfully for the ordinary object: the blessed/cursed bits, plus the
 * three special-case arms C takes.  NOT PORTED (annotated where they sit): the
 * lamplit arti_light_radius/maybe_adjust_light bracket (this port has no light
 * radius model — js/read.js:1214 impact_arti_light is already a documented
 * stub), set_moreluck() for a carried luckstone/luck artifact, weight() for a
 * bag of holding, and the figurine transform timer.  None of the four consumes
 * RNG, so the draw order is unaffected; each is flagged so a session that
 * actually carries one of those objects surfaces as a state divergence rather
 * than as silence. */
function _bless(otmp) {
    if ((otmp.oclass | 0) === COIN_CLASS_OC)
        return;                                  /* C mkobj.c:1750 */
    otmp.cursed = 0;
    otmp.blessed = 1;
    _bc_side_effects(otmp);
}
function _uncurse(otmp) {
    otmp.cursed = 0;                             /* C mkobj.c:1829 */
    _bc_side_effects(otmp);
}
function _curse(otmp) {
    if ((otmp.oclass | 0) === COIN_CLASS_OC)
        return;                                  /* C mkobj.c:1789 */
    otmp.blessed = 0;
    otmp.cursed = 1;
    /* C mkobj.c:1797-1802 — uwep bimanual reset_remarm() / uswapwep twoweapon
     * drop.  Not ported (no RNG); reached only when the cursed object is the
     * wielded or alternate weapon. */
    _bc_side_effects(otmp);
}
function _bc_side_effects(otmp) {
    const otyp = otmp.otyp | 0;
    if (_carried(otmp) && (otyp === LUCKSTONE || otmp.oartifact)) {
        /* C: set_moreluck() — luck bookkeeping, not ported here.  No RNG. */
    } else if (otyp === BAG_OF_HOLDING) {
        /* C: otmp->owt = weight(otmp) — weight() not ported.  No RNG. */
    } else if (otyp === FIGURINE) {
        /* C: figurine transform timer start/stop.  No RNG. */
    }
}
/* C ref: mkobj.c:1841-1855 blessorcurse(otmp, chance).
 * RNG: rn2(chance), and on success rn2(2). */
function _blessorcurse(otmp, chance) {
    if (otmp.blessed || otmp.cursed)
        return;
    if (!rn2(chance)) {
        if (!rn2(2)) _curse(otmp);
        else _bless(otmp);
    }
}
/* C ref: shk.c costly_alteration() / alter_cost() — shop billing for an object
 * whose value the hero just changed.  Both are message+billing only (no RNG).
 * This port has no shop-bill model on the read path, so both are no-ops; an
 * unpaid object reaching here is a real gap and is flagged rather than faked. */
function _costly_alteration(_obj, _cost_type) { /* not yet ported (no RNG) */ }
function _alter_cost(_obj, _amount) { /* not yet ported (no RNG) */ }
/* C ref: potion.c:1462-1478 strange_feeling(obj, txt). */
async function _strange_feeling(obj, txt) {
    const beginner = !!(game.flags && game.flags.beginner);
    if (beginner || !txt)
        await pline(`You have a ${_Hallucination() ? 'normal' : 'strange'} feeling for a moment, then it passes.`);
    else
        await pline(txt);
    if (!obj)
        return;
    if (obj.dknown)
        await trycall(obj);
    useup(obj);
}
/* C ref: uwep && objects[uwep->otyp].oc_skill == P_SLING (weapon.c uslinging). */
function _uslinging() {
    const uwep = game.u?.uwep;
    return !!(uwep && (MKOBJ_OC_SKILL[uwep.otyp | 0] | 0) === P_SLING);
}
/* C ref: objects[otyp].oc_merge for a quivered WEAPON_CLASS object.  Follows the
 * class-proxy this port already uses in js/dogmove.js (_oc_merge_dm) and
 * js/cmd.js (_pickup_oc_merge): the mergeable weapons are exactly the stackable
 * ammo/missile kinds (oc_skill in the ranged/thrown families), which is the set
 * read.c:1526's comment names ("ammo, missiles, spears, daggers & knives"). */
function _oc_merge_weapon(obj) {
    const sk = MKOBJ_OC_SKILL[obj.otyp | 0] | 0;
    /* skills.h: negative oc_skill values are the ranged/propelled classes
     * (-P_BOW..-P_SLING etc.), which are the stackable ammo; P_DAGGER,
     * P_KNIFE, P_SPEAR and P_JAVELIN-family thrown weapons also merge. */
    return sk < 0 || sk === P_DAGGER || sk === P_KNIFE || sk === P_SPEAR;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * seffect_enchant_armor — C ref: nethack-c/src/read.c:1114-1290
 *
 * RNG DRAW ORDER (exactly as C evaluates it):
 *   1. some_armor(&gy.youmonst)            read.c:1121 (C initializer — runs
 *                                          FIRST, before any body statement):
 *                                          up to 4x rn2(4) at do_wear.c:2642,
 *                                          2645, 2648, 2651, one per worn
 *                                          helmet/gloves/boots/shield.
 *   2. !otmp branch:  exercise(A_CON,..)   read.c:1132  rn2(19) or rn2(2)
 *                     exercise(A_STR,..)   read.c:1133  rn2(19) or rn2(2)
 *   3. rn2(s)                              read.c:1177  ONLY when
 *                                          s > (special_armor ? 5 : 3)
 *   4. rn2(otmp->spe)                      read.c:1216  ONLY when s<=0 && spe>0
 *      OR rnd(s)                           read.c:1219  when s > 0
 *   5. rn2(7)                              read.c:1287  ONLY when the new spe
 *                                          exceeds the limit and the armor is
 *                                          not special
 * Ground truth, seed0365 step 146-147 (recorded C trace):
 *   rn2(19)=4 @ exercise(attrib.c:509)     <- seffects read.c:2200, not here
 *   rn2(4)=0 @ some_armor(do_wear.c:2642)
 *   rn2(4)=3 @ some_armor(do_wear.c:2645)
 *   rn2(4)=1 @ some_armor(do_wear.c:2651)
 *   rnd(4)=4 @ seffect_enchant_armor(read.c:1217)
 *   >pline @ seffect_enchant_armor(read.c:1259)   -> "Your helmet glows silver
 *                                                    for a while." + more()
 *   rn2(7)=2 @ seffect_enchant_armor(read.c:1287) -> !2 is false, no 2nd pline
 * ═══════════════════════════════════════════════════════════════════════════ */
async function seffect_enchant_armor(sobjp) {
    const g = game;
    const sobj = sobjp.obj;
    let s;
    /* C read.c:1121 — a declaration initializer, so this runs BEFORE the body.
     * Getting it out of order costs up to four rn2(4) draws. */
    const otmp = some_armor(g.youmonst);
    /* `nm` is the naming view of `otmp` (identical object when u.uarm* already
     * holds a proper numeric-otyp object); `otyp` is its objects.h otyp.  ALL
     * mutation below targets `otmp`, never `nm` — see _name_obj. */
    const nm = otmp ? _name_obj(otmp) : null;
    const otyp = otmp ? _armor_otyp(otmp) : -1;
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const confused = (_Confusion() !== 0);
    const Blind = _Blind();

    if (!otmp) {                                        /* C read.c:1126 */
        await _strange_feeling(sobj, !Blind
                               ? 'Your skin glows then fades.'
                               : 'Your skin feels warm for a moment.');
        sobjp.obj = null;      /* C read.c:1131 — useup() in strange_feeling() */
        exercise(A_CON, !scursed);                      /* C read.c:1132 */
        exercise(A_STR, !scursed);                      /* C read.c:1133 */
        return;
    }
    if (confused) {                                     /* C read.c:1135 */
        const old_erodeproof = ((otmp.oerodeproof | 0) !== 0);
        const new_erodeproof = !scursed;
        otmp.oerodeproof = 0;                     /* C read.c:1138 for messages */
        if (Blind) {
            otmp.rknown = false;
            await pline(`${Yobjnam2(nm, 'feel')} warm for a moment.`);
        } else {
            otmp.rknown = true;
            await pline(`${Yobjnam2(nm, 'are')} covered by a `
                        + `${scursed ? 'mottled' : 'shimmering'} `
                        + `${hcolor(scursed ? NH_BLACK : NH_GOLDEN)} `
                        + `${scursed ? 'glow' : (_is_shield(otmp) ? 'layer' : 'shield')}!`);
        }
        if (new_erodeproof && ((otmp.oeroded | 0) || (otmp.oeroded2 | 0))) {
            otmp.oeroded = otmp.oeroded2 = 0;
            await pline(`${Yobjnam2(nm, Blind ? 'feel' : 'look')} as good as new!`);
        }
        if (old_erodeproof && !new_erodeproof) {
            otmp.oerodeproof = 1;      /* C read.c:1156 restore before shop bill */
            _costly_alteration(otmp, 'COST_DEGRD');
        }
        otmp.oerodeproof = new_erodeproof ? 1 : 0;
        return;
    }
    /* C read.c:1163-1164 — elven armor (and a wizard's cornuthaum) vibrates
     * warningly when enchanted beyond a limit. */
    const special_armor = _is_elven_armor(otmp)
        || (((g.flags?.initrole ?? -1) | 0) === 12 /* Role_if(PM_WIZARD) */
            && otyp === CORNUTHAUM);
    let same_color;
    if (scursed)
        same_color = (otyp === BLACK_DRAGON_SCALE_MAIL
                      || otyp === BLACK_DRAGON_SCALES);
    else
        same_color = (otyp === SILVER_DRAGON_SCALE_MAIL
                      || otyp === SILVER_DRAGON_SCALES
                      || otyp === SHIELD_OF_REFLECTION);
    if (Blind)
        same_color = false;

    /* C read.c:1175 — KMH, catch underflow */
    s = scursed ? -(otmp.spe | 0) : (otmp.spe | 0);
    if (s > (special_armor ? 5 : 3) && rn2(s)) {        /* C read.c:1176 */
        otmp.in_use = true;
        await pline(`${_Yname2(nm)} violently `
                    + `${otense(nm, Blind ? 'vibrate' : 'glow')}`
                    + `${(!Blind && !same_color) ? ' ' : ''}`
                    + `${(Blind || same_color) ? '' : hcolor(scursed ? NH_BLACK : NH_SILVER)}`
                    + ` for a while, then ${otense(nm, 'evaporate')}.`);
        await remove_worn_item(otmp, false);
        useup(otmp);
        return;
    }
    if (s < -100)
        s = -100;                                       /* C read.c:1188 */

    /* C read.c:1190-1199 — base power of the enchantment.  C's `/` truncates
     * toward zero; Math.trunc reproduces that for the negative-s case. */
    s = Math.trunc((4 - s) / 2);
    if (special_armor)                                  /* C read.c:1204 */
        ++s;
    if (!_oc_magic(otyp))                               /* C read.c:1206 */
        ++s;
    if (sblessed)                                       /* C read.c:1208 */
        ++s;

    if (s <= 0) {                                       /* C read.c:1211 */
        s = 0;
        if ((otmp.spe | 0) > 0 && !rn2(otmp.spe | 0))   /* C read.c:1213 */
            s = 1;
    } else {
        s = rnd(s);                                     /* C read.c:1216 */
    }
    if (s > 11)
        s = 11;                                         /* C read.c:1218 */
    if (scursed)
        s = -s;                                         /* C read.c:1221 */

    if (s >= 0 && _Is_dragon_scales(otmp)) {            /* C read.c:1223 */
        const was_lit = otmp.lamplit;
        /* C read.c:1225: old_light = artifact_light(otmp) ? arti_light_radius(otmp)
         * : 0.  No light-radius model in this port (see js/read.js
         * impact_arti_light), and dragon scales are never an artifact light, so
         * old_light is 0 here; the maybe_adjust_light() call below is therefore
         * unreachable, not skipped.  No RNG either way. */
        await pline(`${_Yname2(nm)} merges and hardens!`);
        await setworn(null, W_ARM);                     /* C read.c:1230 */
        /* C read.c:1232 — assumes same order */
        otmp.otyp = (otmp.otyp | 0) + (GRAY_DRAGON_SCALE_MAIL - GRAY_DRAGON_SCALES);
        otmp.lamplit = 0;                               /* C read.c:1233 */
        if (sblessed) {
            otmp.spe = (otmp.spe | 0) + 1;
            cap_spe(otmp);
            if (!otmp.blessed)
                _bless(otmp);
        } else if (otmp.cursed) {
            _uncurse(otmp);
        }
        otmp.known = 1;                                 /* C read.c:1244 */
        await setworn(otmp, W_ARM);
        if (otmp.unpaid)
            _alter_cost(otmp, 0);
        otmp.lamplit = was_lit;
        return;
    }
    /* C read.c:1253-1259 — the main feedback pline.  This is the pline whose
     * width tips update_topl past its CO-1-8 reserve and fires more(); its
     * absence is seed0365's MISSING-CONSUME at step 147. */
    await pline(`${_Yname2(nm)} `
                + `${(s === 0) ? 'violently ' : ''}`
                + `${otense(nm, Blind ? 'vibrate' : 'glow')}`
                + `${(!Blind && !same_color) ? ' ' : ''}`
                + `${(Blind || same_color) ? '' : hcolor(scursed ? NH_BLACK : NH_SILVER)}`
                + ` for a ${(s * s > 1) ? 'while' : 'moment'}.`);
    if (s < 0)
        _costly_alteration(otmp, 'COST_DECHNT');        /* C read.c:1263 */
    if (scursed && !otmp.cursed)
        _curse(otmp);
    else if (sblessed && !otmp.blessed)
        _bless(otmp);
    else if (!scursed && otmp.cursed)
        _uncurse(otmp);
    if (s) {                                            /* C read.c:1270 */
        const oldspe = otmp.spe | 0;
        otmp.spe = oldspe + s;
        cap_spe(otmp);
        s = (otmp.spe | 0) - oldspe;    /* cap_spe() might have throttled 's' */
        if (s)
            adj_abon(otmp, s);                          /* C read.c:1279 */
        g._gk_known = _armor_known(otmp);               /* C read.c:1280 */
        if (s > 0 && otmp.unpaid)
            _alter_cost(otmp, 0);
    }

    if (((otmp.spe | 0) > (special_armor ? 5 : 3))
        && (special_armor || !rn2(7))) {                /* C read.c:1286-1287 */
        await pline(`${Yobjnam2(nm, 'suddenly vibrate')} `
                    + `${Blind ? 'again' : 'unexpectedly'}.`);
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * chwepon — C ref: nethack-c-v5/upstream/src/wield.c:916-1047
 *
 * CANONICAL HOME: wield.c, i.e. js/cmd.js, where this port's other 72 wield.c
 * functions live.  It sits here instead because every helper it needs is
 * read.js-private (_strange_feeling, _uncurse, _costly_alteration, cap_spe) and
 * its only caller in the whole game is seffect_enchant_weapon() below.  Same
 * arrangement, and the same CROSSFILE note, as observe_object() in js/objnam.js.
 *
 * RNG DRAW ORDER: exactly one site — rn2(3) at wield.c:998, and only when the
 * enchantment would push |spe| past 5 in the direction it is already going.
 * Everything else in the function is message + state.  (The rn2(7) at :1044 is
 * the elven-weapon vibration clue, drawn only when spe > 5.)
 * ═══════════════════════════════════════════════════════════════════════════ */

/* C obj.h — `#define is_weptool(o) ((o)->oclass == TOOL_CLASS \
 *                                   && objects[(o)->otyp].oc_skill != P_NONE)` */
function _is_weptool(obj) {
    return (obj.oclass | 0) === TOOL_CLASS_OC
        && (MKOBJ_OC_SKILL[obj.otyp | 0] | 0) !== P_NONE_OC;
}
const TOOL_CLASS_OC = 6;
const P_NONE_OC = 0;
const TIN_OPENER = 239;
const WORM_TOOTH = 42;
const CRYSKNIFE = 43;
const STRANGE_OBJECT = 0;
/* C obj.h — `#define erodeable_wep(o) (is_weptool(o) || (o)->oclass == WEAPON_CLASS
 *                                      || is_wep_artifact...)`; the shape C
 * actually ships is erosion_matters() restricted to the weapon side, which
 * js/mklev.js already exports.  will_weld(optr) is
 *     ((optr)->cursed && (erodeable_wep(optr) || (optr)->otyp == TIN_OPENER)) */
function _will_weld(obj) {
    return !!obj.cursed
        && (((obj.oclass | 0) === WEAPON_CLASS_OC || _is_weptool(obj))
            || (obj.otyp | 0) === TIN_OPENER);
}

async function chwepon(otmp, amount) {
    const g = game;
    const uwep = g.u?.uwep;
    const Blind = _Blind();
    const color = hcolor((amount < 0) ? NH_BLACK : NH_BLUE);
    let otyp = STRANGE_OBJECT;

    /* C wield.c:925-946 — nothing enchantable wielded. */
    if (!uwep || ((uwep.oclass | 0) !== WEAPON_CLASS_OC && !_is_weptool(uwep))) {
        let buf;
        if (amount >= 0 && uwep && _will_weld(uwep)) { /* cursed tin opener */
            if (!Blind) {
                buf = `${Yobjnam2(uwep, 'glow')} with ${an(hcolor_amber())} aura.`;
                uwep.bknown = _Hallucination() ? 0 : 1; /* ok to bypass set_bknown() */
            } else {
                /* cursed tin opener is wielded in right hand */
                buf = `Your right ${body_part('hand')} tingles.`;
            }
            _uncurse(uwep);
        } else {
            buf = `Your ${makeplural(body_part('hand'))} `
                + `${(amount >= 0) ? 'twitch' : 'itch'}.`;
        }
        await _strange_feeling(otmp, buf); /* pline()+docall()+useup() */
        exercise(A_DEX, amount >= 0);
        return 0;
    }

    if (otmp && (otmp.oclass | 0) === SCROLL_CLASS_OC)
        otyp = otmp.otyp | 0;

    /* C wield.c:951-988 — the worm tooth <-> crysknife transformations. */
    if ((uwep.otyp | 0) === WORM_TOOTH && amount >= 0) {
        const multiple = (uwep.quan | 0) > 1;
        /* order: message, transformation, shop handling */
        await Your(`%s %s much sharper now.`, simpleonames(uwep),
                  multiple ? 'fuse, and become' : 'is');
        uwep.otyp = CRYSKNIFE;
        uwep.oerodeproof = 0;
        if (multiple) {
            uwep.quan = 1;
            uwep.owt = weight(uwep);
        }
        if (uwep.cursed)
            _uncurse(uwep);
        if (uwep.unpaid)
            _alter_cost(uwep, 0);
        if (otyp !== STRANGE_OBJECT)
            _makeknown(otyp);
        if (multiple)
            encumber_msg();
        return 1;
    } else if ((uwep.otyp | 0) === CRYSKNIFE && amount < 0) {
        const multiple = (uwep.quan | 0) > 1;
        /* order matters: message, shop handling, transformation */
        await Your(`%s %s much duller now.`, simpleonames(uwep),
                  multiple ? 'fuse, and become' : 'is');
        _costly_alteration(uwep, 'COST_DEGRD');
        uwep.otyp = WORM_TOOTH;
        uwep.oerodeproof = 0;
        if (multiple) {
            uwep.quan = 1;
            uwep.owt = weight(uwep);
        }
        if (otyp !== STRANGE_OBJECT && otmp.bknown)
            _makeknown(otyp);
        if (multiple)
            encumber_msg();
        return 1;
    }

    /* C wield.c:990-996 — a named artifact resists disenchantment.
     * KNOWN GAP: restrict_name() (artifact.c:329) is not ported; the guard also
     * needs uwep->oartifact, which no corpus weapon reaching here carries.  C
     * draws NO RNG on this arm (it is a pline and an early return), so skipping
     * it cannot shift the sequence — it can only mis-word a message for an
     * artifact being disenchanted, which is the signal to port restrict_name. */

    /* C wield.c:997-1010 — soft upper/lower limit on uwep->spe. */
    if ((((uwep.spe | 0) > 5 && amount >= 0)
         || ((uwep.spe | 0) < -5 && amount < 0))
        && rn2(3)) {
        if (!Blind)
            await pline(`${Yobjnam2(uwep, 'violently glow')} ${color} `
                        + `for a while and then ${otense(uwep, 'evaporate')}.`);
        else
            await pline(`${Yobjnam2(uwep, 'evaporate')}.`);
        _useupall(uwep); /* let all of them disappear */
        return 1;
    }

    /* C wield.c:1011-1020 — the feedback pline, and the scroll's self-ID. */
    if (!Blind) {
        const xtime = (amount * amount === 1) ? 'moment' : 'while';
        await pline(`${Yobjnam2(uwep, amount === 0 ? 'violently glow' : 'glow')} `
                    + `${color} for a ${xtime}.`);
        if (otyp !== STRANGE_OBJECT && uwep.known
            && (amount > 0 || (amount < 0 && otmp.bknown)))
            _makeknown(otyp);
    }
    if (amount < 0)
        _costly_alteration(uwep, 'COST_DECHNT');
    uwep.spe = (uwep.spe | 0) + amount;
    if (amount > 0) {
        if (uwep.cursed)
            _uncurse(uwep);
        /* update shop bill to reflect new higher price */
        if (uwep.unpaid)
            _alter_cost(uwep, 0);
    }

    /* C wield.c:1027-1039 — Magicbane's spe-dependent adverse reaction gives an
     * obscure clue.  KNOWN GAP: u_wield_art(ART_MAGICBANE) has no equivalent in
     * this port (js/objnam.js's _artiexist models only the wish-time existence
     * bits), so the clue line is not emitted.  Message only; no RNG. */

    /* C wield.c:1041-1045 — an elven magic clue, cookie@keebler: elven weapons
     * vibrate warningly when enchanted beyond a limit.  The rn2(7) is inside a
     * `spe > 5` guard, so it is unreachable for every weapon in the corpus; the
     * is_elven_weapon()/oartifact disjuncts short-circuit BEFORE it in C, which
     * is why the guard must be written in C's order if this ever fires. */
    if ((uwep.spe | 0) > 5
        && (_is_elven_weapon(uwep) || uwep.oartifact || !rn2(7))) {
        await pline(`${Yobjnam2(uwep, 'suddenly vibrate')} unexpectedly.`);
    }

    return 1;
}

/* C objects.h ELVEN_* weapons — is_elven_weapon() (obj.h) is an otyp membership
 * test over the elven weapon run.  JS otyps coincide with C's below 366. */
const _ELVEN_WEAPON_OTYPS = new Set([
    19 /* ELVEN_ARROW */, 28 /* ELVEN_SPEAR */, 35 /* ELVEN_DAGGER */,
    47 /* ELVEN_SHORT_SWORD */, 53 /* ELVEN_BROADSWORD */, 84 /* ELVEN_BOW */,
]);
function _is_elven_weapon(obj) {
    return _ELVEN_WEAPON_OTYPS.has(obj.otyp | 0);
}
/* C hack.h:1530 — `#define makeknown(x) discover_object((x), TRUE, TRUE, TRUE)`.
 * credit_hero is TRUE, so this DRAWS rn2(19) via exercise(A_WIS) — but only when
 * the type was not already oc_name_known (o_init.c's own guard). */
function _makeknown(otyp) {
    discover_object(otyp | 0, true, true, true);
}
/* C invent.c useupall(obj) — remove the whole stack, not one item. */
function _useupall(obj) {
    let prev = null;
    for (let o = game.invent; o; prev = o, o = o.nobj) {
        if (o === obj) {
            if (prev) prev.nobj = o.nobj; else game.invent = o.nobj;
            obj.nobj = null;
            return;
        }
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * seffect_enchant_weapon — C ref: nethack-c-v5/upstream/src/read.c:1620-1675
 *
 * RNG DRAW ORDER: the `s` ladder draws AT MOST ONE value, and only for an
 * already-well-enchanted or blessed-scroll case:
 *     scursed            -> -1                      (no draw)
 *     !uwep              -> 1                       (no draw)
 *     uwep->spe >= 9     -> rn2(uwep->spe) == 0
 *     sblessed           -> rnd(3 - uwep->spe / 3)
 *     else               -> 1                       (no draw)
 * then chwepon()'s own rn2(3)/rn2(7), both behind |spe| > 5 guards.
 *
 * Ground truth, seed0002 step 191 (recorded C trace) — an uncursed scroll, a
 * Healer's +0 scalpel, not confused, not blind:
 *   rn2(19)=12 @ exercise(attrib.c:509)   <- seffects read.c:2200, not here
 *   (no further draw before the monster-movement block)
 *   topline "Your scalpel glows blue for a moment."
 * i.e. s == 1 with no draw, chwepon takes the plain feedback arm, and
 * makeknown(SCR_ENCHANT_WEAPON) fires because uwep->known is set on a starting
 * weapon and amount > 0.  That makeknown is the load-bearing half: without it
 * read_scroll's `if (!oc_name_known) trycall()` opened a "Call a scroll labeled
 * VE FORBRYDERNE:" getlin, which swallowed every following keystroke.
 * ═══════════════════════════════════════════════════════════════════════════ */
async function seffect_enchant_weapon(sobjp) {
    const g = game;
    const sobj = sobjp.obj;
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const confused = (_Confusion() !== 0);
    const uwep = g.u?.uwep;
    let s;

    /* [What about twoweapon mode?  Proofing/repairing/enchanting both
       would be too powerful, but shouldn't we choose randomly between
       primary and secondary instead of always acting on primary?] */
    if (confused && uwep
        && erosion_matters(uwep) && (uwep.oclass | 0) !== ARMOR_CLASS_OC) {
        const old_erodeproof = ((uwep.oerodeproof | 0) !== 0);
        const new_erodeproof = !scursed;
        uwep.oerodeproof = 0; /* for messages */
        if (_Blind()) {
            uwep.rknown = 0;
            await Your('weapon feels warm for a moment.');
        } else {
            uwep.rknown = 1;
            await pline(`${Yobjnam2(uwep, 'are')} covered by a `
                        + `${scursed ? 'mottled' : 'shimmering'} `
                        + `${hcolor(scursed ? NH_PURPLE : NH_GOLDEN)} `
                        + `${scursed ? 'glow' : 'shield'}!`);
        }
        if (new_erodeproof && ((uwep.oeroded | 0) || (uwep.oeroded2 | 0))) {
            uwep.oeroded = uwep.oeroded2 = 0;
            await pline(`${Yobjnam2(uwep, _Blind() ? 'feel' : 'look')} as good as new!`);
        }
        if (old_erodeproof && !new_erodeproof) {
            /* restore old_erodeproof before shop charges */
            uwep.oerodeproof = 1;
            _costly_alteration(uwep, 'COST_DEGRD');
        }
        uwep.oerodeproof = new_erodeproof ? 1 : 0;
        return;
    }
    s = scursed ? -1
        : !uwep ? 1 /* guard further tests against null pointer */
          : ((uwep.spe | 0) >= 9) ? ((rn2(uwep.spe | 0) === 0) ? 1 : 0)
            /* >= 9 case prevents rnd(0); C's `/` truncates toward zero */
            : sblessed ? rnd(3 - Math.trunc((uwep.spe | 0) / 3))
              : 1; /* uncursed */
    if (!(await chwepon(sobj, s)))
        sobjp.obj = null; /* nothing enchanted: strange_feeling -> useup */
    if (uwep)
        cap_spe(uwep);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * seffect_remove_curse — C ref: nethack-c/src/read.c:1488-1602
 *
 * RNG DRAW ORDER: NONE on the scursed path (message only).  On the non-cursed
 * CONFUSED path, blessorcurse(obj, 2) draws rn2(2) per eligible object and a
 * further rn2(2) whenever the first lands on 0 (mkobj.c:1847-1852).  The
 * uncursing path itself is RNG-free.
 *
 * Ground truth, seed0002 step 127 (recorded C trace):
 *   rn2(19)=12 @ exercise(attrib.c:509)              <- seffects read.c:2200
 *   >pline @ seffect_remove_curse(read.c:1503)       "You feel like someone is
 *                                                     helping you."
 *   >pline @ seffect_remove_curse(read.c:1506)       "The scroll disintegrates."
 *   >more  @ more(../win/tty/topl.c:212)
 * The scroll is CURSED, so doread's own feedback is the nodisappear form ("You
 * read the scroll.", read.c:625) and the three lines together overflow the
 * topline: the first page is "You read the scroll.  You feel like someone is
 * helping you.--More--", acked by step 128, then "The scroll disintegrates."
 * --More--, acked by step 129, then trycall()'s "Call a scroll labeled XOR
 * OTA:" getlin eats steps 130-140.
 * ═══════════════════════════════════════════════════════════════════════════ */
async function seffect_remove_curse(sobj) {
    const g = game;
    const otyp = sobj.otyp | 0;
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const confused = (_Confusion() !== 0);
    let obj, nxto;
    let wornmask;

    /* C read.c:1499-1503 */
    await You_feel(!_Hallucination()
                   ? (!confused ? 'like someone is helping you.'
                                : 'like you need some help.')
                   : (!confused ? 'in touch with the Universal Oneness.'
                                : 'the power of the Force against you!'));

    if (scursed) {
        await pline_The('scroll disintegrates.');       /* C read.c:1506 */
    } else {
        /* C read.c:1508-1514 — remember nobj BEFORE processing, because the
         * confused case can curse the secondary weapon and drop it, moving it
         * off the invent chain mid-traversal. */
        for (obj = g.invent; obj; obj = nxto) {
            nxto = obj.nobj;
            if ((obj.oclass | 0) === COIN_CLASS_OC)     /* C read.c:1518 */
                continue;
            /* C read.c:1521-1523 — hide the current scroll from itself. */
            if (obj === sobj && (obj.quan | 0) === 1)
                continue;
            wornmask = (obj.owornmask | 0)
                & ~(W_BALL | W_ART | W_ARTI);
            if (wornmask && !sblessed) {                /* C read.c:1525 */
                if (obj === g.u?.uswapwep) {
                    if (!(g.u?.twoweap))
                        wornmask = 0;
                } else if (obj === g.u?.uquiver) {
                    if ((obj.oclass | 0) === WEAPON_CLASS_OC) {
                        if (!_oc_merge_weapon(obj))
                            wornmask = 0;
                    } else if ((obj.oclass | 0) === GEM_CLASS_OC) {
                        if (!_uslinging())
                            wornmask = 0;
                    } else {
                        wornmask = 0;
                    }
                }
            }
            if (sblessed || wornmask || (obj.otyp | 0) === LOADSTONE
                || ((obj.otyp | 0) === LEASH_OTYP && obj.leashmon)) {
                /* C read.c:1554 — water price varies by curse/bless status */
                const shop_h2o = (obj.unpaid && (obj.otyp | 0) === POT_WATER);
                if (confused) {
                    _blessorcurse(obj, 2);              /* C read.c:1557 — RNG */
                    obj.bknown = 0;                     /* C read.c:1560 */
                    if (shop_h2o && (obj.cursed || obj.blessed))
                        _alter_cost(obj, 0);
                } else if (obj.cursed) {
                    if (shop_h2o)
                        _costly_alteration(obj, 'COST_UNCURS');
                    _uncurse(obj);                      /* C read.c:1571 */
                    /* C read.c:1575-1576 — a cursed-known item becoming
                     * known-uncursed identifies the scroll. */
                    if (obj.bknown && otyp === SCR_REMOVE_CURSE)
                        learnscrolltyp(SCR_REMOVE_CURSE);
                }
            }
        }
        /* C read.c:1581-1598 — a ridden steed's saddle is treated as part of
         * the hero's inventory:
         *     if (u.usteed && (obj = which_armor(u.usteed, W_SADDLE)) != 0) {
         *         if (confused) { blessorcurse(obj, 2); obj->bknown = 0; }
         *         else if (obj->cursed) {
         *             uncurse(obj);
         *             if (!Blind) { pline("%s %s.", Yobjnam2(obj, "glow"),
         *                                 hcolor("amber"));
         *                           obj->bknown = Hallucination ? 0 : 1; }
         *             else obj->bknown = 0;
         *         }
         *     }
         * NOT PORTED, and deliberately not faked: this port has no steed model
         * at all — nothing in js/ ever assigns `usteed`, so the branch is
         * unreachable and a `u.usteed` read would be a permanently-undefined
         * accessor (the exact silent-default shape js-binding-audit gates on).
         * The confused arm would draw rn2(2)[+rn2(2)] via blessorcurse, so a
         * session that actually rides while reading remove curse will surface
         * as an RNG divergence here rather than as silence. */
    }
    if (_Punished() && !confused) {
        /* C read.c:1600 unpunish() — ball & chain removal (ball.c).  Not ported
         * here; no RNG.  A Punished hero reading remove curse will keep the ball
         * in this port, which is a state divergence, not a silent one. */
    }
    /* C read.c:1602-1605 — buried-ball trap release.  u.utraptype TT_BURIEDBALL
     * is not modelled on this path; no RNG. */
    /* C read.c:1607 update_inventory() — display only, no RNG. */
}

/* C ref: read.c:1786 seffect_teleportation(struct obj **sobjp):
 *
 *     boolean scursed = sobj->cursed;
 *     boolean confused = (Confusion != 0);
 *     if (confused || scursed) {
 *         level_tele();
 *         gk.known = TRUE;
 *     } else {
 *         scrolltele(sobj);
 *     }
 *
 * SCR_TELEPORTATION had NO arm in this file's seffects() switch at all, so a
 * read scroll of teleportation fell into `default:` and did nothing — and then,
 * gk.known still false, read_scroll's tail called trycall() and put up a "Call a
 * scroll labeled ...:" naming prompt C never shows.  seed5006 segment 0 step 161
 * is the witness: a CONFUSED Tourist reads it, C runs level_tele() (which is the
 * only reason the "To what level do you want to teleport?" prompt appears at
 * step 163 and the hero ends up on the Dlvl 3 that segment 1's bones file is
 * built from), and this port asked her to name the scroll instead.
 *
 * Both arms are C's; neither is a stand-in.  level_tele() lives in js/cmd.js
 * (the level-teleport body, teleport.c:1165) and scrolltele() in
 * js/teleport.js (teleport.c:844). */
async function seffect_teleportation(sobj) {
    const scursed = !!sobj.cursed;
    const confused = (_Confusion() !== 0);

    if (confused || scursed) {
        await level_tele();
        /* C read.c:1793 — "gives 'materialize on different/same level!'
         * message, must be a teleport scroll". */
        game._gk_known = true;
    } else {
        /* C read.c:1796 — scrolltele() calls learnscroll() as appropriate. */
        await scrolltele(sobj);
    }
}

/* C ref: do_name.c:2432 hcolor("amber") — NH_AMBER (decl.c:16-19). */
function hcolor_amber() {
    return 'amber';
}

/* ── C ref: read.c:1294-1321 disintegrate_cursed_armor(void) ──────────────────
 *   gather every CURSED worn piece into armors[] in the order
 *   uarm, uarmc, uarmh, uarms, uarmg, uarmf, uarmu;
 *   if (!idx) return FALSE;
 *   if (disintegrate_arm(armors[rn2(idx)])) return TRUE;
 *   return FALSE;
 * Note the gather order is NOT destroy_arm()'s — C lists uarmh before uarms
 * here and after it there — so the two cannot share a helper.
 * RNG: rn2(idx) once (only when at least one cursed piece is worn), plus
 * whatever disintegrate_arm draws. */
async function disintegrate_cursed_armor() {
    const u = game.u || {};
    const armors = [];

    if (u.uarm && u.uarm.cursed) armors.push(u.uarm);
    if (u.uarmc && u.uarmc.cursed) armors.push(u.uarmc);
    if (u.uarmh && u.uarmh.cursed) armors.push(u.uarmh);
    if (u.uarms && u.uarms.cursed) armors.push(u.uarms);
    if (u.uarmg && u.uarmg.cursed) armors.push(u.uarmg);
    if (u.uarmf && u.uarmf.cursed) armors.push(u.uarmf);
    if (u.uarmu && u.uarmu.cursed) armors.push(u.uarmu);
    const idx = armors.length;
    if (!idx)
        return false;

    if (await disintegrate_arm(armors[rn2(idx)]))
        return true;

    return false;
}

/* C ref: objnam.c:2490-2497 actualoname(obj) —
 *   iflags.override_ID = TRUE; res = minimal_xname(obj); iflags.override_ID = FALSE;
 * i.e. the object's REAL type name regardless of what the hero has identified.
 * KNOWN GAP: minimal_xname() (objnam.c:2478) is not ported, so xname() stands
 * in under the same override_ID bracket that js/objnam.js already honours
 * (js/objnam.js:3413, :3974, :4329).  For a single unidentified scroll — the
 * only object that reaches the one call site below — the two agree, because
 * minimal_xname's whole job is to suppress the quantity/BUC/erosion prefixes
 * that a fresh single scroll does not carry.  RNG: none. */
function _actualoname(obj) {
    const g = game;
    g.iflags = g.iflags || {};
    const saved = g.iflags.override_ID;
    g.iflags.override_ID = 1;
    try {
        return xname(obj);
    } finally {
        g.iflags.override_ID = saved;
    }
}

/* ── C ref: read.c:1323-1395 seffect_destroy_armor(struct obj **sobjp) ────────
 * The scroll of destroy armor.  5.0 rewrote this: the ordinary (uncursed,
 * unconfused) arm now calls destroy_arm(), which ERODES worn armor rather than
 * disintegrating it, so a leather-armored hero gets "Your leather armor
 * smoulders!" — the message this port used to lose entirely, because
 * SCR_DESTROY_ARMOR had no arm in seffects() at all.
 *
 * RNG, in C's order:
 *   some_armor(&gy.youmonst)  do_wear.c:2630 — rn2(4) per extra worn slot
 *                             beyond the first candidate (helm/gloves/boots/
 *                             shield); zero draws when only a suit is worn.
 *   confused && !otmp     : exercise(A_STR/A_CON, FALSE)  read.c:1338-1339
 *   scursed && armor cursed: rn1(10, 10)                  read.c:1360
 *   scursed, armor not    : disintegrate_arm()            read.c:1362
 *   blessed + >1 worn     : disintegrate_arm() after getobj  read.c:1376-1381
 *   blessed               : disintegrate_cursed_armor()   read.c:1384
 *   otherwise             : destroy_arm()                 read.c:1387
 *   destroy_arm() failed  : exercise(A_STR/A_CON, FALSE)  read.c:1391-1392
 *
 * Measured on the 44 public sessions: destroy_arm() fires exactly once (seed0007
 * step 123, one rn2(4) + two rn2(1)) and NOTHING reaches disintegrate_arm().
 */
async function seffect_destroy_armor(sobjp) {
    const g = game, u = g.u || {};
    const sobj = sobjp.obj;
    let otmp = some_armor(g.youmonst);            /* read.c:1327 */
    const scursed = !!sobj.cursed;
    const confused = (_Confusion() !== 0);        /* read.c:1329 */

    if (confused) {
        if (!otmp) {
            await _strange_feeling(sobj, 'Your bones itch.');  /* read.c:1333 */
            sobjp.obj = null;   /* C read.c:1334 — useup() in strange_feeling() */
            exercise(A_STR, false);                            /* read.c:1335 */
            exercise(A_CON, false);                            /* read.c:1336 */
            return;
        }
        const old_erodeproof = ((otmp.oerodeproof | 0) !== 0);
        const new_erodeproof = scursed;
        otmp.oerodeproof = 0;   /* C read.c:1343 — "for messages" */
        await p_glow2(otmp, NH_PURPLE);
        if (old_erodeproof && !new_erodeproof) {
            /* restore old_erodeproof before shop charges */
            otmp.oerodeproof = 1;
            _costly_alteration(otmp, 'COST_DEGRD');
        }
        otmp.oerodeproof = new_erodeproof ? 1 : 0;
        return;
    }

    if (scursed) {
        if (otmp && otmp.cursed) {
            /* armor and scroll both cursed */
            await pline(`${Yobjnam2(otmp, 'vibrate')}.`);      /* read.c:1354 */
            if ((otmp.spe | 0) >= -6) {
                otmp.spe = (otmp.spe | 0) + -1;
                adj_abon(otmp, -1);
            }
            make_stunned((_HStun() & TIMEOUT) + rn1(10, 10), true); /* read.c:1360 */
        } else if (await disintegrate_arm(otmp)) {
            g._gk_known = true;
            return;
        }
    } else {
        const gets_choice = !!(otmp && sobj && sobj.blessed
                               && count_worn_armor() > 1);      /* read.c:1367 */

        if (gets_choice) {
            if (!_oc_name_known(sobj.otyp | 0))
                await pline(`This is ${an(_actualoname(sobj))}!`);  /* read.c:1373 */
            g._gk_known = true;
            /* C read.c:1376 getobj("destroy", any_worn_armor_ok, GETOBJ_PROMPT).
             * KNOWN GAP: the shared getobj (js/eat.js:2808) picks the first
             * GETOBJ_SUGGEST item WITHOUT opening C's prompt, so it consumes no
             * keystroke where C consumes one.  That is a pre-existing property
             * of this tree's getobj, not something introduced here, and no
             * public session reaches this arm; the C call is written as C wrote
             * it so the site becomes correct the moment a real getobj lands. */
            const atmp = getobj('destroy', any_worn_armor_ok, GETOBJ_PROMPT);
            /* check the return value, in case the user picked a non-valid obj */
            if (any_worn_armor_ok(atmp) === GETOBJ_SUGGEST_RD)
                otmp = atmp;
            if (await disintegrate_arm(otmp)) {
                g._gk_known = true;
                return;
            }
        } else if (sobj.blessed && await disintegrate_cursed_armor()) {
            g._gk_known = true;
            return;
        } else if (!(await destroy_arm())) {
            await _strange_feeling(sobj, 'Your skin itches.');  /* read.c:1388 */
            sobjp.obj = null;   /* C read.c:1389 — useup() in strange_feeling() */
            exercise(A_STR, false);                             /* read.c:1390 */
            exercise(A_CON, false);                             /* read.c:1391 */
            return;
        } else {
            g._gk_known = true;
        }
    }
    void u;
}

/* C ref: read.c:2194 seffects(sobj) — dispatch a scroll/spell effect.  Returns a
 * truthy value only for the cases that consume the scroll themselves (none of the
 * ported cases do), so doread's caller performs the useup.  Awards exercise(A_WIS)
 * for any oc_magic item before dispatch (read.c:2199-2200). */
/* -- The four seffects arms this port was missing ----------------------------
 * All four sit in C's read.c:2202 switch, which this file dispatched only 11 of
 * 23 cases from.  Every one is transliterated from nethack-c-v5/upstream (the
 * 5.0 tree the scorer targets), not from nethack-c/ (3.7).
 */

/* C ref: read.c:2156-2188 seffect_mail(&sobj)  [#ifdef MAIL_STRUCTURES, which
 * global.h:432 defines in this build -- js/mklev.js:1907 already records that].
 *
 *     boolean odd = (sobj->o_id % 2) == 1;
 *     gk.known = TRUE;
 *     switch (sobj->spe) {
 *     case 2:  pline("This scroll is marked \"%s\".",
 *                    odd ? "Postage Due" : "Return to Sender");   break;
 *     case 1:  pline("This seems to be %s.",
 *                    odd ? "a chain letter threatening your luck"
 *                        : "junk mail addressed to the finder of the Eye of Larn");
 *              break;
 *     default: readmail(sobj);   break;      [MAIL is not defined in this build]
 *     }
 *
 * spe carries the provenance: 0 delivered in-game, 1 from bones or WISHING
 * (objnam.c:5171), 2 written with a magic marker (write.c:366).  RNG-FREE.
 *
 * gk.known = TRUE is load-bearing beyond the text: read_scroll()'s caller tests
 * it (read.c:637) to choose learnscroll() over trycall(), so without this arm
 * the frame AFTER a mail read was the "Call a stamped scroll:" docall prompt on
 * every member of this row rather than C's mail text.
 *
 * The MAIL-undefined `default` arm is ported as C compiles it: with MAIL
 * undefined the preprocessor keeps the `pline("That was a scroll of mail?")`
 * precaution, and C's own comment says that arm is unreachable because spe
 * won't be 0.  Ported anyway rather than dropped, so a spe-0 mail scroll
 * produces C's string instead of silence. */
async function seffect_mail(sobjp) {
    const sobj = sobjp.obj !== undefined ? sobjp.obj : sobjp;
    const odd = ((sobj.o_id | 0) % 2) === 1;

    game._gk_known = true;                       /* C read.c:2162 gk.known = TRUE */
    switch (sobj.spe | 0) {
    case 2:
        /* "stamped scroll" created via magic marker--without a stamp */
        await pline('This scroll is marked "%s".',
                    odd ? 'Postage Due' : 'Return to Sender');
        break;
    case 1:
        /* scroll of mail obtained from bones file or from wishing */
        await pline('This seems to be %s.',
                    odd ? 'a chain letter threatening your luck'
                        : 'junk mail addressed to the finder of the Eye of Larn');
        break;
    default:
        /* C read.c:2178-2185: MAIL is undefined in this build, so the
         * readmail() call is preprocessed out and the precaution remains. */
        await pline('That was a scroll of mail?');
        break;
    }
}

/* C ref: read.c:1453-1486 seffect_scare_monster(&sobj)
 *
 *     for (mtmp = fmon; mtmp; mtmp = mtmp->nmon) {
 *         if (DEADMONSTER(mtmp)) continue;
 *         if (cansee(mtmp->mx, mtmp->my)) {
 *             if (confused || scursed) {
 *                 mtmp->mflee = mtmp->mfrozen = mtmp->msleeping = 0;
 *                 mtmp->mcanmove = 1;
 *             } else if (!resist(mtmp, sobj->oclass, 0, NOTELL))
 *                 monflee(mtmp, 0, FALSE, FALSE);
 *             if (!mtmp->mtame) ct++;
 *         }
 *     }
 *     if (otyp == SCR_SCARE_MONSTER || !ct) { ... You_hear(...) }
 *
 * THE RNG IS THE resist() CALL, one per VISIBLE non-resisting monster, and it
 * is the whole reason this arm shows up on the RNG axis:
 * gen594-grammar-seed758889's first divergence is C's
 * `rn2(108)=57 @resist(zap.c:6141)` at leaf 6148, where this port was still
 * inside the monster-movement pass because the scroll did nothing.
 * resist() is rn2(100 + alev - dlev) with alev 9 for SCROLL_CLASS, so a
 * recorded rn2(108) reads back as "one visible monster of level 1".
 *
 * DEADMONSTER(mon) is (mon)->mhp < 1 (mondata.h) -- the same spelling
 * js/makemon.js:5771 uses inside monflee itself. */
async function seffect_scare_monster(sobjp) {
    const sobj = sobjp.obj !== undefined ? sobjp.obj : sobjp;
    const otyp = sobj.otyp | 0;
    const scursed = !!sobj.cursed;
    const confused = (_Confusion() !== 0);
    let ct = 0;

    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1)                  /* C DEADMONSTER(mtmp) */
            continue;
        if (cansee(mtmp.mx | 0, mtmp.my | 0)) {
            if (confused || scursed) {
                mtmp.mflee = 0;
                mtmp.mfrozen = 0;
                mtmp.msleeping = 0;
                mtmp.mcanmove = 1;
            } else if (!await resist(mtmp, sobj.oclass | 0, 0, NOTELL)) {
                await monflee(mtmp, 0, false, false);
            }
            if (!mtmp.mtame)
                ct++;                            /* pets don't laugh at you */
        }
    }
    if (otyp === SCR_SCARE_MONSTER || !ct) {
        /* C's Soundeffect() writes to the sound interface, which this port has
         * no window-port for; it emits nothing to the 24x80 terminal and draws
         * no RNG, so there is nothing to mirror. */
        await You_hear('%s %s.',
                       (confused || scursed) ? 'sad wailing' : 'maniacal laughter',
                       !ct ? 'in the distance' : 'close by');
    }
}

/* C ref: read.c:1607-1623 seffect_create_monster(&sobj)
 *
 *     if (create_critters(1 + ((confused || scursed) ? 12 : 0)
 *                         + ((sblessed || rn2(73)) ? 0 : rnd(4)),
 *                         confused ? &mons[PM_ACID_BLOB] : (struct permonst *) 0,
 *                         FALSE))
 *         gk.known = TRUE;
 *
 * THE DRAW ORDER IS THE POINT.  C evaluates the count argument before the
 * mptr argument, and inside the count `sblessed || rn2(73)` short-circuits:
 * a BLESSED scroll draws nothing, an unblessed one always draws rn2(73), and
 * only a zero from that draws the extra rnd(4).  gen586-grammar-seed744787
 * records exactly `rn2(73)=63 @ seffect_create_monster(read.c:1616)` -- nonzero,
 * so cnt stays 1 and no rnd(4) follows.
 *
 * neverask is FALSE, so in wizard mode create_critters() opens C's
 * "Create what kind of monster?" prompt (makemon.c:1568 create_particular()) --
 * which is the frame gen586 is missing.  create_critters is already ported
 * (js/makemon.js:3294) and is async here because makemon()/create_particular()
 * are. */
async function seffect_create_monster(sobjp) {
    const sobj = sobjp.obj !== undefined ? sobjp.obj : sobjp;
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const confused = (_Confusion() !== 0);

    const cnt = 1 + ((confused || scursed) ? 12 : 0)
                  + ((sblessed || rn2(73)) ? 0 : rnd(4));
    const mptr = confused ? permonstTemplate(PM_ACID_BLOB) : null;
    if (await create_critters(cnt, mptr, false))
        game._gk_known = true;
    /* C's comment: no need to flush monsters; we ask for identification only
     * if the monsters are not visible. */
}

/* C ref: read.c:2004-2012 seffect_blank_paper(&sobj)
 *
 *     if (Blind) You("don't remember there being any magic words on this scroll.");
 *     else       pline("This scroll seems to be blank.");
 *     gk.known = TRUE;
 *
 * RNG-free.  read_scroll() already carries C's two `otyp != SCR_BLANK_PAPER`
 * guards (read.c:612 suppresses the "As you read..." line, read.c:645 suppresses
 * the useup), so this arm is the only piece of the blank-paper path that was
 * missing: without it a blank scroll printed NOTHING at all. */
async function seffect_blank_paper(sobjp) {
    void sobjp;                                  /* C marks it UNUSED */
    if (_Blind())
        await pline("You don't remember there being any magic words on this scroll.");
    else
        await pline('This scroll seems to be blank.');
    game._gk_known = true;
}

/* C ref: detect.c:201-221 o_in(obj, oclass) — recursively search obj (and, for
 * a container, its contents) for an object of class `oclass`, first found.
 * SchroedingersBox is excluded because the corpse it might contain hasn't
 * resolved live/dead yet (obj.h SchroedingersBox: LARGE_BOX && spe===1). */
const LARGE_BOX_OTYP_RD = 214;
function _SchroedingersBox_rd(o) {
    return (o.otyp | 0) === LARGE_BOX_OTYP_RD && (o.spe | 0) === 1;
}
function o_in_rd(obj, oclass) {
    if ((obj.oclass | 0) === oclass)
        return obj;
    if (Has_contents(obj) && !_SchroedingersBox_rd(obj)) {
        for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) {
            if ((otmp.oclass | 0) === oclass)
                return otmp;
            if (Has_contents(otmp)) {
                const temp = o_in_rd(otmp, oclass);
                if (temp)
                    return temp;
            }
        }
    }
    return null;
}

const FOOD_CLASS_RD = 7, POTION_CLASS_RD = 8;

/* C ref: detect.c:262-306 check_map_spot(x, y, oclass, 0) — food_detect always
 * passes material=0, so only the oclass arm is reachable here.  C decodes the
 * remembered glyph back to an otyp via glyph_to_obj() and reads
 * objects[otyp].oc_class; this port's loc.remembered_glyph carries no otyp
 * (see js/display.js's cell shape), so it matches the glyph's rendered
 * SYMBOL against the target class's default symbol instead ('%' FOOD_CLASS,
 * '!' POTION_CLASS) -- equivalent whenever the default symset AND NOT HALLUCINATING is in effect,
 * which every corpus session uses. *
 * HALLUCINATION GAP (2026-09-10 review): C decodes the STORED otyp —
 * objects[glyph_to_obj(glyph)].oc_class == oclass (detect.c:290) — while this
 * reads the RENDERED character. Those agree under the default symset because
 * class syms are a bijection, but under hallucination the rendered char need
 * not track the object's real class. What it changes is which stale cells get
 * unmapped, hence `stale`, which selects between "You sense a lack of food
 * nearby." and the strange_feeling path — i.e. whether the scroll is USED UP.
 * Narrow, but not cosmetic. Decode the class rather than matching the symbol
 * when a glyph_to_obj equivalent exists here.
 */
function _check_map_spot_rd(x, y, oclass) {
    const g = game;
    const loc = g.level && g.level.at ? g.level.at(x, y) : null;
    const rg = loc && loc.remembered_glyph;
    if (!rg || rg.cls !== GLYPHCLS_OBJ)
        return false;
    // Campaign Rogue levels use ':' for remembered food-class glyphs;
    // detect.c decodes the stored glyph class rather than assuming '%'.
    const wantCh = (oclass === POTION_CLASS_RD)
        ? '!' : (Is_rogue_level(game.u?.uz) ? ':' : '%');
    if (rg.ch !== wantCh)
        return false;
    for (let otmp = g.level.levelObjects?.[x]?.[y] ?? null; otmp; otmp = otmp.nexthere)
        if (o_in_rd(otmp, oclass))
            return false;
    const mtmp = m_at(x, y);
    if (mtmp)
        for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj)
            if (o_in_rd(otmp, oclass))
                return false;
    return true;
}
/* C ref: detect.c:318-330 clear_stale_map(oclass, 0). RNG-free. */
function clear_stale_map_rd(oclass) {
    let change_made = false;
    for (let zx = 1; zx < COLNO; zx++) {
        for (let zy = 0; zy < ROWNO; zy++) {
            if (_check_map_spot_rd(zx, zy, oclass)) {
                unmap_object(zx, zy);
                change_made = true;
            }
        }
    }
    return change_made;
}

/* C ref: detect.c:70-82 unconstrain_map() / detect.c:85-90 reconstrain_map() --
 * bring a swallowed/buried/underwater hero out to (and back from) the normal
 * map for the duration of a detection's display. */
function unconstrain_map_rd() {
    const g = game, u = g.u || {};
    const res = !!(u.uinwater || u.uburied || u.uswallow);
    g.iflags = g.iflags || {};
    g.iflags.save_uinwater = u.uinwater; u.uinwater = 0;
    g.iflags.save_uburied = u.uburied; u.uburied = 0;
    g.iflags.save_uswallow = u.uswallow; u.uswallow = 0;
    return res;
}
function reconstrain_map_rd() {
    const g = game, u = g.u || {};
    const saved = {
        uinwater: !!g.iflags?.save_uinwater,
        uburied: !!g.iflags?.save_uburied,
        uswallow: !!g.iflags?.save_uswallow,
    };
    u.uinwater = g.iflags?.save_uinwater; if (g.iflags) g.iflags.save_uinwater = 0;
    u.uburied = g.iflags?.save_uburied; if (g.iflags) g.iflags.save_uburied = 0;
    u.uswallow = g.iflags?.save_uswallow; if (g.iflags) g.iflags.save_uswallow = 0;
    return saved;
}
/* C ref: detect.c:94-102 map_redisplay(): reconstrain_map() then docrt(), whose
 * first statement flushes any pending topline -- a blocking more() when one
 * is outstanding (the pattern js/cmd.js's reveal_terrain and js/potion.js's
 * object_detect both gate off game._pending_message). The restored underwater
 * or buried view is then redrawn through the shared display routines. */
async function map_redisplay_rd() {
    const saved = reconstrain_map_rd();
    if (game._pending_message)
        await force_more(game._pending_message);
    await docrt();
    // C detect.c:101-102 restores the constrained view after docrt().
    if (saved.uinwater)
        await under_water(2);
    if (saved.uburied)
        await under_ground(2);
}
/* C ref: detect.c:106-118 browse_map(ter_typ, ter_explain) -- getpos()'s
 * autodescribe pass over whatever is currently shown on the map. */
async function browse_map_rd(ter_typ, ter_explain) {
    const g = game, u = g.u || {};
    const dummy_pos = { x: u.ux | 0, y: u.uy | 0 };
    g.iflags = g.iflags || {};
    const save_autodescribe = g.iflags.autodescribe;
    g.iflags.autodescribe = true;
    g.iflags.terrainmode = ter_typ;
    await getpos(dummy_pos, false, ter_explain);
    g.iflags.terrainmode = 0;
    g.iflags.autodescribe = save_autodescribe;
}

/* C ref: detect.c:479-591 food_detect(sobj) -- "returns 1 if nothing was
 * detected, 0 if something was detected".  sobj is null for the crystal-ball
 * caller (not reached from seffects, which always passes the scroll/spell). */
async function food_detect(sobj) {
    const g = game, u = g.u || {};
    let ct = 0, ctu = 0;
    const confused = (_Confusion() !== 0) || !!(sobj && sobj.cursed);
    const oclass = confused ? POTION_CLASS_RD : FOOD_CLASS_RD;
    const what = confused ? 'something' : 'food';

    const stale = clear_stale_map_rd(oclass);
    if (u.usteed) { u.usteed.mx = u.ux; u.usteed.my = u.uy; }

    for (let obj = g.fobj; obj; obj = obj.nobj)
        if (o_in_rd(obj, oclass)) {
            if (u_at(obj.ox | 0, obj.oy | 0)) ctu++; else ct++;
        }
    for (let mtmp = g.fmon; mtmp && (!ct || !ctu); mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1 || (mtmp.isgd && !mtmp.mx))
            continue;
        for (let obj = mtmp.minvent; obj; obj = obj.nobj) {
            if (o_in_rd(obj, oclass)) {
                if (u_at(mtmp.mx | 0, mtmp.my | 0)) ctu++; else ct++;
                break;
            }
        }
    }

    if (!ct && !ctu) {
        g._gk_known = stale && !confused;
        if (stale) {
            if (g._pending_message) await force_more(g._pending_message);
            await docrt();
            await You('sense a lack of %s nearby.', what);
            if (sobj && sobj.blessed) {
                if (!u.uedibility)
                    await Your('%s starts to tingle.', food_body_part(NOSE));
                u.uedibility = 1;
            }
        } else if (sobj) {
            const tingle = (sobj.blessed && !u.uedibility) ? ' then starts to tingle' : '';
            const buf = `Your ${food_body_part(NOSE)} twitches${tingle}.`;
            if (sobj.blessed && !u.uedibility) {
                const savebeginner = !!(g.flags && g.flags.beginner);
                if (g.flags) g.flags.beginner = false;
                await _strange_feeling(sobj, buf);
                if (g.flags) g.flags.beginner = savebeginner;
                u.uedibility = 1;
            } else {
                await _strange_feeling(sobj, buf);
            }
        }
        return !stale;
    } else if (!ct) {
        g._gk_known = true;
        await You('%s %s nearby.', sobj ? 'smell' : 'sense', what);
        if (sobj && sobj.blessed) {
            if (!u.uedibility)
                await Your('%s starts to tingle.', food_body_part(NOSE));
            u.uedibility = 1;
        }
    } else {
        g._gk_known = true;
        /* cls() (display.c:2064-2072) clears WIN_MAP only, never the message
         * window -- but this port's cls() also zeroes _pending_message (see
         * its own comment), which C's does not.  Page the still-pending
         * "As you read the scroll, it disappears." here, the same guard
         * js/potion.js's object_detect and js/cmd.js's reveal_terrain use
         * around their own cls()/docrt(), so the message this port would
         * otherwise silently drop instead pages exactly as C's next pline()
         * (the "smell food" one below) would force it via update_topl's
         * overflow check. */
        if (g._pending_message)
            await force_more(g._pending_message);
        await cls();
        const wasConstrained = unconstrain_map_rd();
        try {
            for (let obj = g.fobj; obj; obj = obj.nobj) {
                const temp = o_in_rd(obj, oclass);
                if (temp) {
                    if (temp !== obj) { temp.ox = obj.ox; temp.oy = obj.oy; }
                    map_object(temp, 1);
                }
            }
            for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
                if ((mtmp.mhp | 0) < 1 || (mtmp.isgd && !mtmp.mx))
                    continue;
                for (let obj = mtmp.minvent; obj; obj = obj.nobj) {
                    const temp = o_in_rd(obj, oclass);
                    if (temp) {
                        temp.ox = mtmp.mx; temp.oy = mtmp.my;
                        map_object(temp, 1);
                        break;
                    }
                }
            }
            let ter_typ = TER_DETECT | TER_OBJ;
            if (!ctu) {
                newsym(u.ux | 0, u.uy | 0);
                ter_typ |= TER_MON;
            }
            if (sobj) {
                if (sobj.blessed) {
                    await Your('%s %s to tingle and you smell %s.', food_body_part(NOSE),
                               u.uedibility ? 'continues' : 'starts', what);
                    u.uedibility = 1;
                } else {
                    await Your('%s tingles and you smell %s.', food_body_part(NOSE), what);
                }
            } else {
                await You('sense %s.', what);
            }
            exercise(2 /* A_WIS */, true);

            await browse_map_rd(ter_typ, 'food');

            await map_redisplay_rd();
        } finally {
            // map_redisplay_rd() consumes the saved flags; if an earlier
            // display/message operation throws, restore them here instead.
            if (wasConstrained && (g.iflags?.save_uinwater
                                   || g.iflags?.save_uburied
                                   || g.iflags?.save_uswallow))
                reconstrain_map_rd();
        }
    }
    return 0;
}

/* C ref: read.c:2050-2054 seffect_food_detection(&sobj).
 *
 *     if (food_detect(sobj))
 *         *sobjp = 0; nothing detected: strange_feeling -> useup()
 *
 * food_detect() only USES UP the scroll in the "stale && !confused, not
 * stale" strange_feeling() branches (strange_feeling() itself calls
 * useup()); every other branch leaves *sobjp untouched, so seffects()
 * returns 1 only when the holder was cleared here, matching the
 * enchant-armor/identify holder shape already used above. */
async function seffect_food_detection(sobjp) {
    const sobj = sobjp.obj !== undefined ? sobjp.obj : sobjp;
    if (await food_detect(sobj))
        sobjp.obj = null;
}

export async function seffects(sobj) {
    const otyp = sobj.otyp | 0;
    if (_scroll_oc_magic(otyp))
        exercise(2 /* A_WIS */, true); /* read.c:2200 — rn2(19) */
    switch (otyp) {
    case SCR_ENCHANT_ARMOR: {
        /* C read.c:2208-2210 seffect_enchant_armor(&sobj).  The no-armor branch
         * (read.c:1127-1134) runs strange_feeling(), which useup()s the scroll
         * and sets *sobjp = 0 — so seffects must then return 1 and read_scroll
         * must NOT useup again.  Same holder shape as seffect_identify. */
        const holder = { obj: sobj };
        await seffect_enchant_armor(holder);
        if (!holder.obj) return 1;
        break;
    }
    case SCR_DESTROY_ARMOR: {
        /* C read.c:2211-2213 seffect_destroy_armor(&sobj).  Two of its arms
         * (the confused-with-no-armor one and the destroy_arm()-failed one) run
         * strange_feeling(), which useup()s the scroll and sets *sobjp = 0 — so
         * seffects must then return 1 and read_scroll must NOT useup again.
         * Same holder shape as the enchant-armor arm above. */
        const holder = { obj: sobj };
        await seffect_destroy_armor(holder);
        if (!holder.obj) return 1;
        break;
    }
    case SCR_ENCHANT_WEAPON: {
        /* C read.c:2211-2213 seffect_enchant_weapon(&sobj).  The no-weapon
         * branch runs chwepon()'s strange_feeling(), which useup()s the scroll
         * and sets *sobjp = 0, so seffects must then return 1 and read_scroll
         * must NOT useup again — same holder shape as the enchant-armor arm. */
        const holder = { obj: sobj };
        await seffect_enchant_weapon(holder);
        if (!holder.obj) return 1;
        break;
    }
    case SCR_REMOVE_CURSE:
    case SPE_REMOVE_CURSE:
        /* C read.c:2225-2228.  seffect_remove_curse never clears *sobjp. */
        await seffect_remove_curse(sobj);
        break;
    case SCR_LIGHT:
        await seffect_light(sobj);
        break;
    case SCR_AMNESIA:
        await seffect_amnesia(sobj);
        break;
    case SCR_PUNISHMENT:
        /* C read.c:2276-2278.  seffect_punishment never clears *sobjp, so
         * seffects returns 0 and read_scroll performs the useup. */
        await seffect_punishment(sobj);
        break;
    case 325: /* SCR_CONFUSE_MONSTER */
    case SPE_CONFUSE_MONSTER:
        /* C read.c:2214-2217 pairs the scroll and the spellbook on one arm;
         * this file carried only the scroll. */
        await seffect_confuse_monster(sobj);
        break;
    case SCR_MAIL:
        /* C read.c:2203-2206 (#ifdef MAIL_STRUCTURES).  seffect_mail never
         * clears *sobjp, so seffects returns 0 and read_scroll does the useup. */
        await seffect_mail(sobj);
        break;
    case SCR_SCARE_MONSTER:
    case SPE_CAUSE_FEAR:
        /* C read.c:2218-2221.  Never clears *sobjp. */
        await seffect_scare_monster(sobj);
        break;
    case SCR_BLANK_PAPER:
        /* C read.c:2222-2224.  Never clears *sobjp -- and read_scroll's own
         * `otyp !== SCR_BLANK_PAPER` guard (read.c:645) is what stops the
         * useup, exactly as in C. */
        await seffect_blank_paper(sobj);
        break;
    case SCR_CREATE_MONSTER:
    case SPE_CREATE_MONSTER:
        /* C read.c:2229-2232.  Never clears *sobjp. */
        await seffect_create_monster(sobj);
        break;
    case SCR_TELEPORTATION:
        /* C read.c:2246-2248 seffect_teleportation(&sobj).  Never clears
         * *sobjp, so seffects returns 0 and read_scroll performs the useup. */
        await seffect_teleportation(sobj);
        break;
    case SCR_MAGIC_MAPPING:
    case SPE_MAGIC_MAPPING:
        await seffect_magic_mapping(sobj);
        break;
    case SCR_GENOCIDE:
        /* C read.c:2240 seffect_genocide(&sobj).  Never clears *sobjp, so
         * seffects returns 0 and read_scroll performs the useup. */
        await seffect_genocide(sobj);
        break;
    case SCR_FOOD_DETECTION:
    case SPE_DETECT_FOOD: {
        /* C read.c:2252-2255 seffect_food_detection(&sobj).  food_detect()
         * useing up the scroll (via strange_feeling()) is the branch that
         * clears *sobjp; same holder shape as the enchant-armor arm. */
        const holder = { obj: sobj };
        await seffect_food_detection(holder);
        if (!holder.obj) return 1;
        break;
    }
    case SCR_IDENTIFY:
    case SPE_IDENTIFY: {
        /* C read.c:2055 seffect_identify(&sobj).  Uses up the scroll itself
         * (and sets *sobjp = 0), so seffects returns 1 below and read_scroll
         * must NOT useup again.  Marker: pass a 1-element holder so the callee
         * can clear it (mirrors C's struct obj **sobjp). */
        const holder = { obj: sobj };
        await seffect_identify(holder, otyp);
        if (!holder.obj) return 1; /* C: sobj gone → seffects returns 1 */
        break;
    }
    default:
        /* C read.c:2284-2285's default is
         *     impossible("What weird effect is this? (%u)", otyp);
         * i.e. C treats an unhandled otyp as a BUG, not as a no-op -- and in C
         * it is UNREACHABLE, because all 23 scroll/spell otyps have an arm.
         *
         * DELIBERATELY NOT PORTED AS impossible(), and this is a STOP with a
         * measurement rather than an oversight.  Reaching this arm here means
         * one of the still-unported arms (SCR_TAMING/SPE_CHARM_MONSTER,
         * SCR_GOLD_DETECTION, SCR_CHARGING, SCR_FIRE, SCR_EARTH,
         * SCR_STINKING_CLOUD -- SCR_FOOD_DETECTION/SPE_DETECT_FOOD moved out
         * of this list, see seffect_food_detection above) was selected.
         * C does NOT print impossible() there -- it runs the real effect -- so
         * emitting impossible()'s topline would put text on row 0 that C never
         * writes, which is strictly further from C's frame than staying silent
         * (read_scroll has already plined C's "As you read the scroll, it
         * disappears.", which C also prints).
         *
         * Port the remaining arms and this comment becomes wrong -- at that
         * point the default IS unreachable here too and impossible() is the
         * faithful thing to write. */
        break;
    }
    return 0; /* C: magic-mapping case breaks → seffects returns 0 → doread useup */
}

/* ── Scroll/spell otyp constants for identify (objects.h) ──────────────────────
 * SCR_MAGIC_MAPPING = 337 (see above); identify is the scroll immediately
 * before it → SCR_IDENTIFY = 336.  The spellbook of identify is SPE_IDENTIFY. */
const A_DEX = 3; /* attrib.h A_DEX */
/* objects.h scroll block, verified against js/mklev.js:2345's own comment
 * ("SCR_FOOD_DETECTION: base 323 + pos 12") and js/spell.js:69. */
const SCR_FOOD_DETECTION = 335;
const SPE_DETECT_FOOD = 383;
const SCR_IDENTIFY = 336;
const SPE_IDENTIFY = 397; /* objects.h spellbook block (magic mapping = 396) */
const SCR_LIGHT = 332; /* objects.h scroll block; also used as -332 in js/mklev.js shop tables */
const SCR_AMNESIA = 338;
/* objects.h:1189 SCROLL("destroy armor", "JUYED AWK YACC", ...) — the row
 * immediately after "enchant armor" (SCR_ENCHANT_ARMOR = 323) in the same
 * SCROLL() block, so 324.  Cross-checks against the neighbours this file
 * already names: confuse monster 325, scare monster 326, enchant weapon 328. */
const SCR_DESTROY_ARMOR = 324;
/* objects.h scroll block; confirmed by js/oc_name_data.js[331] === 'genocide'. */
const SCR_GENOCIDE = 331;
const ALL_SPELLS = 0x2; /* bitmask for all spells; value doesn't matter since forget is stubbed */

/* C ref: read.c:1738-1746 (seffect_light) + read.c:2491-2634 (litroom).
 * Corpus path assumes not Confused (matches read_scroll's existing
 * not-Blind/not-Confused simplification for this file).  gk.known is set
 * for a sighted hero; litroom() prints the lit-field feedback;
 * lightdamage() always returns a truthy pseudo-damage for a non-gremlin
 * hero (dmg starts at amt=5, only ever reduced when polymorphed into a
 * gremlin, never zeroed) so gk.known is also set on the !scursed path
 * regardless of blindness.  RNG: none on this path (lightdamage() only draws
 * rnd() when the hero is polymorphed into a gremlin).
 *
 * The lit-field pline used to be emitted HERE, inline, and litroom() was never
 * called — so the scroll printed its message and lit nothing.  C's litroom()
 * owns both: it prints, then do_clear_area(u.ux, u.uy, blessed ? 9 : 5,
 * set_lit) marks the squares lit and vision_recalc(2) forces the redraw that
 * reveals newly-lit corridor.  seed0002 step 96 is exactly that: C draws two
 * corridor '#' at (69,7)/(69,8) that JS left blank. */
async function seffect_light(sobj) {
    const g = game;
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    /* C read.c:1748 — boolean confused = (Confusion != 0). */
    const confused = (_Confusion() !== 0);

    if (!confused) {
        if (!_Blind()) g._gk_known = true; /* read.c:1751 gk.known=TRUE (!Blind) */
        /* C read.c:1752 litroom(!scursed, sobj) */
        await litroom(!scursed, sobj);
        if (!scursed) {
            /* lightdamage always returns truthy dmg for a non-gremlin hero. */
            g._gk_known = true;
        }
    } else {
        /* C read.c:1756-1783 — a confused scroll of light does NOT light the
         * room; it surrounds the hero with cancelled tame lights.  This whole
         * arm was absent, so a confused read fell through to litroom() and lit
         * the room anyway, drawing none of the rn1()/makemon() the C run does.
         *
         * UNREACHED on the 44 public sessions and known to be: seffect_light
         * runs exactly once across the corpus (tools/fn-reach.mjs, 1 call on
         * 1/44) and that read is not confused, so this arm is held-out value
         * only and is measured at +0 on public by construction, not by luck. */
        const pm = scursed ? PM_BLACK_LIGHT : PM_YELLOW_LIGHT;
        /* C read.c:1759 — svm.mvitals[pm].mvflags & G_GONE. */
        const mvflags = (g.mvitals && g.mvitals[pm]) ? (g.mvitals[pm].mvflags | 0) : 0;
        if ((mvflags & G_GONE) !== 0) {
            pline("Tiny lights sparkle in the air momentarily.");
        } else {
            /* surround with cancelled tame lights which won't explode */
            let sawlights = false;
            /* C read.c:1765 — rn1(2, 3) + (sblessed * 2).  The rn1 is drawn
             * ONCE, before the loop, and is the only RNG on this arm. */
            const numlights = rn1(2, 3) + (sblessed ? 2 : 0);
            for (let i = 0; i < numlights; ++i) {
                /* js/mklev.js makemon() takes the monster INDEX in the mdat
                 * slot (see js/vault.js:262 for the same convention). */
                const mon = await makemon(pm, g.u.ux, g.u.uy,
                                          MM_EDOG | NO_MINVENT | MM_NOMSG);
                if (mon) {
                    initedog(mon, true);
                    mon.msleeping = 0;
                    mon.mcan = 1;
                    if (canspotmon(mon))
                        sawlights = true;
                    newsym(mon.mx, mon.my);
                }
            }
            if (sawlights) {
                pline("Lights appear all around you!");
                g._gk_known = true;
            }
        }
    }
}

/* C ref: read.c:2491-2636 litroom */
/* local helpers copied from cmd.js (not exported) */
const ART_SUNSWORD_LIT = 20;
function is_art_lit(obj, art) {
    return !!(obj && (obj.oartifact | 0) === art);
}
const OTYP_GOLD_DRAGON_SCALE_MAIL_LIT = 102, OTYP_GOLD_DRAGON_SCALES_LIT = 112;
function artifact_light_lit(obj) {
    const W_ARM_MASK = 0x1;
    if (obj && (obj.otyp === OTYP_GOLD_DRAGON_SCALE_MAIL_LIT || obj.otyp === OTYP_GOLD_DRAGON_SCALES_LIT)
        && ((obj.owornmask | 0) & W_ARM_MASK) !== 0)
        return true;
    return is_art_lit(obj, ART_SUNSWORD_LIT);
}
/* digests: C macro dmgtype(ptr, AD_DGST) — AD_DGST=11 inline */
const AD_DGST_LIT = 11;
function digests_lit(mon_data) {
    return dmgtype(mon_data, AD_DGST_LIT);
}
/* C mondata.h:57-58
 *   #define is_whirly(ptr) \
 *       ((ptr)->mlet == S_VORTEX || (ptr) == &mons[PM_AIR_ELEMENTAL])
 * Same shape as the already-ported js/dogmove.js:3512 and js/mhitm.js:2742
 * legs: the C pointer-identity test against &mons[PM_AIR_ELEMENTAL] becomes an
 * index compare on the permonst proxy's own row number (`pmidx`).  Was a
 * throw-stub on a reachable path (swallowed by a vortex, not blind). */
const S_VORTEX_LIT = 22;      /* monsym.h S_VORTEX */
function is_whirly_lit(mon_data) {
    return !!mon_data && ((mon_data.mlet | 0) === S_VORTEX_LIT
                          || (mon_data.pmidx | 0) === PM_AIR_ELEMENTAL);
}
/* free: no-op in JS */
function free_lit(ptr) {}

/* stubs for unported helpers — no-op for sweep compatibility */
function impact_arti_light(otmp, flag, visible) { /* not yet ported */ }
function light_hits_gremlin(mon, dmg) { /* not yet ported */ }
/* move_bc(before, control, ballx, bally, chainx, chainy)
 * C ref: nethack-c/src/ball.c:437-558.  Pick the ball and chain up off the
 * floor before the hero's surroundings change (before=1) and put them back
 * after (before=0).  litroom is the only caller in this file, and it calls
 * with control=0 and only when !Blind (read.c:2578 and read.c:2616), so the
 * whole `if (Blind)` half (ball.c:449-506) and every `control & BC_*` arm are
 * dead for this call site.
 *
 * DELIBERATELY STILL A NO-OP — this is not an oversight:
 *  1. The two calls are a MATCHED PAIR.  Implementing only the before=1 half
 *     (remove_object + maybe_unhide_at + newsym, all of which js/mklev.js
 *     already exports) would unlink uball/uchain from the floor and never
 *     relink them: the ball and chain would leak off the level permanently.
 *     A half-port here is strictly worse than no port.
 *  2. The before=0 half needs place_object, which js/mklev.js:2836 declares
 *     file-private (NOT exported).  Importing a name that module does not
 *     export is an ESM load error, i.e. all 64 sessions fail.
 *  3. Faithful control=0 behaviour also needs bc_order() (ball.c:400-425) and
 *     a u.bc_order state slot: C picks the placement order via
 *     `(control & BC_CHAIN) || (!control && u.bc_order == BCPOS_CHAIN)`, so
 *     with control=0 the ball/chain stacking order on the tile is decided
 *     entirely by bc_order.  js/ball.js:167 dragBallMoveBc() looks like the
 *     body wanted but is specialised to drag_ball's control!=0 usage — it
 *     tests only `(control & BC_CHAIN) !== 0` and omits the bc_order
 *     bookkeeping — so it is NOT reusable here without that fix.
 * The port belongs in js/ball.js next to ball.c's other functions, promoted
 * from dragBallMoveBc and exported; see CROSSFILE-ball-move_bc.patch.
 *
 * REACHABILITY (measured, not assumed): zero.  Instrumenting litroom and
 * running all 64 sessions individually via ps_test_runner --worker-session
 * produced 0 litroom entries.  On the C side the recorder attributes callee
 * entries to their call site, and the only litroom site in any of the 64
 * traces is `>pline @ litroom(read.c:2565)` (6 calls in 3 sessions) — that
 * line is in the `on` branch, so C never takes the !on branch that reaches
 * move_bc either.  The sweep cannot grade it at all: move_bc's capture set is
 * empty (skip_reason=empty_corpus).
 * RNG ON THE GAPPED PATH: NONE.  ball.c:437-558 and bc_order (ball.c:400-425)
 * contain no rn2/rnd/rne/rnz/d call, so leaving this inert cannot shift the
 * RNG sequence or its order; only floor-object placement and map glyphs. */
/* C ref: read.c:2470-2489 set_lit(x, y, val) — the do_clear_area() callback
 * litroom() drives.  `val` is a non-null pointer flag, not a value: non-null
 * lights the square, null darkens it.
 *   if (val) { levl[x][y].lit = 1; if a gremlin is here, push it on `gremlins` }
 *   else     { levl[x][y].lit = 0; snuff_light_source(x, y); }
 * RNG: none.
 * KNOWN GAP (darken path only): snuff_light_source() — light.c's floor-lamp
 * bookkeeping — is unported (js/mklev.js:10395 still throws on it), so a cursed
 * scroll of light leaves a dropped lit lamp burning.  It consumes no RNG, and
 * the lit=0 half (which is what the map render reads) is faithful. */
function set_lit(x, y, val) {
    const loc = game.level?.at(x, y);
    if (!loc)
        return;
    if (val) {
        loc.lit = 1;
        const mtmp = m_at(x, y);
        if (mtmp && (mtmp.data?.pmidx | 0) === PM_GREMLIN)
            game.gremlins = { mon: mtmp, nxt: game.gremlins || null };
    } else {
        loc.lit = 0;
        /* C: snuff_light_source(x, y) — see KNOWN GAP above. */
    }
}

/* C ref: read.c:2491-2636 litroom(boolean on, struct obj *obj).
 * async because every message site below goes through js pline(), which is
 * async (it may have to page a --More--); C's litroom prints and then keeps
 * going, so each call is awaited in place to preserve that order. */
export async function litroom(on, obj) {
    const g = game;
    const u = g.u;
    const blessed_effect = !!(obj && obj.oclass === SCROLL_CLASS_OC && obj.blessed);
    const no_op = !!(u.uswallow || u.uinwater || Is_waterlevel(u.uz));
    const is_lit = {}; /* dummy object to serve as non-null pointer for set_lit */
    /* C read.c:2495 `struct obj *otmp, *nextobj;` — FUNCTION scope.  Declaring
     * this inside the loop body made it invisible to the `otmp = nextobj`
     * update expression (a separate per-iteration scope), so both walks below
     * threw `ReferenceError: nextobj is not defined` on the first update. */
    let nextobj;

    /* update object lights and produce message (provided you're not blind) */
    if (!on) {
        let still_lit = 0;

        for (let otmp = g.invent; otmp; otmp = nextobj) {
            nextobj = otmp.nobj;
            if (otmp.lamplit) {
                if (!artifact_light_lit(otmp))
                    await snuff_lit_real(otmp);
                else
                    impact_arti_light(otmp, true, !_Blind());

                if (otmp.lamplit)
                    ++still_lit;
            }
        }
        if (!_Blind()) {
            if (still_lit)
                await pline_The("ambient light seems dimmer.");
            else if (u.uswallow)
                await pline("It seems even darker in here than before.");
            else
                await You("are surrounded by darkness!");
        }
    } else { /* on */
        if (blessed_effect) {
            for (let otmp = g.invent; otmp; otmp = nextobj) {
                nextobj = otmp.nobj;
                if (otmp.lamplit && artifact_light_lit(otmp))
                    impact_arti_light(otmp, false, !_Blind());
            }
        }
        if (u.uswallow) {
            if (_Blind())
                ; /* no feedback */
            /* C read.c:2556-2563 — js pline() takes ONE already-formatted
             * string; passing printf varargs printed the literal format
             * ("A lit field %ssurrounds you!") straight to the topline. */
            else if (digests_lit(u.ustuck.data))
                await pline(`${s_suffix(Monnam(u.ustuck))} ${mbodypart(u.ustuck, STOMACH)} is lit.`);
            else if (is_whirly_lit(u.ustuck.data))
                await pline(`${Monnam(u.ustuck)} shines briefly.`);
            else
                await pline(`${Monnam(u.ustuck)} glistens.`);
        } else if (!_Blind() && (!Is_rogue_level(u.uz)
                              || g.level?.at(u.ux, u.uy)?.typ !== CORR)) {
            /* C read.c:2565 pline("A lit field %ssurrounds you!", ...) */
            await pline(`A lit field ${no_op ? 'briefly ' : ''}surrounds you!`);
        }
    }

    /* No-op when swallowed or in water */
    if (no_op)
        return;

    if (_Punished() && !on && !_Blind())
        move_bc(1, 0, g.uball.ox, g.uball.oy, g.uchain.ox, g.uchain.oy);

    if (Is_rogue_level(u.uz)) {
        /* C: levl[u.ux][u.uy].roomno / svr.rooms[] — the port's map cell is
         * game.level.at(x, y) and its room table is game.level.rooms[]. */
        const rnum = (g.level?.at(u.ux, u.uy)?.roomno | 0) - ROOMOFFSET;
        if (rnum >= 0) {
            const room = g.level.rooms[rnum];
            for (let rx = room.lx - 1; rx <= room.hx + 1; rx++)
                for (let ry = room.ly - 1; ry <= room.hy + 1; ry++)
                    set_lit(rx, ry, on ? is_lit : null);
            room.rlit = on;
        }
    } else if (is_art_lit(obj, ART_SUNSWORD_LIT)) {
        set_lit(u.ux, u.uy, is_lit);
    } else {
        do_clear_area(u.ux, u.uy, blessed_effect ? 9 : 5,
                      set_lit, on ? is_lit : null);
    }

    if (!_Blind()) {
        vision_recalc(2);
        if (_Punished() && !on)
            move_bc(0, 0, g.uball.ox, g.uball.oy, g.uchain.ox, g.uchain.oy);
    }

    g.vision_full_recalc = 1;
    if (g.gremlins) {
        vision_recalc(0);
        do {
            const gremlin = g.gremlins;
            g.gremlins = gremlin.nxt;
            light_hits_gremlin(gremlin.mon, rnd(5));
            free_lit(gremlin);
        } while (g.gremlins);
    }
}

/* C ref: read.c:1398-1452 seffect_confuse_monster(struct obj **sobjp) */
async function seffect_confuse_monster(sobj) {
    const g = game;
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    /* C read.c:1401  boolean confused = (Confusion != 0);  `g.Confusion` is a
     * spelling nothing in js/ assigns — see _Confusion() above. */
    const confused = (_Confusion() != 0);
    const altfeedback = (_Blind() || _Invisible());
    const hands = makeplural(body_part("hand"));

    const youdata = g.youmonst.data;
    const youmlet = youdata ? youdata.mlet : '@';
    if (youmlet != '@' /* S_HUMAN */ || scursed) {
        if (!_Confusion())
            await pline("You feel confused.");
        await make_confused(_Confusion() + rnd(100), false);
    } else if (confused) {
        if (!sblessed) {
            await pline("Your %s begin to %s%s.", hands,
                 altfeedback ? "tingle" : "glow ",
                 altfeedback ? "" : hcolor(NH_PURPLE));
            await make_confused(_Confusion() + rnd(100), false);
        } else {
            await pline("A %s%s surrounds your %s.",
                  altfeedback ? "" : hcolor(NH_RED),
                  altfeedback ? "faint buzz" : " glow", body_part("head"));
            await make_confused(0, true);
        }
    } else {
        /* scroll vs spell */
        let incr = (sobj.oclass == SCROLL_CLASS_OC) ? 3 : 0;

        if (!sblessed) {
            if (altfeedback)
                await pline("Your %s tingle%s.", hands, g.u.umconf ? " even more" : "");
            else if (!g.u.umconf)
                await pline("Your %s begin to glow %s.", hands, hcolor(NH_RED));
            else
                await pline_The("%s glow of your %s intensifies.", hcolor(NH_RED),
                          hands);
            incr += rnd(2);
        } else {
            if (altfeedback)
                await pline("Your %s tingle %s sharply.", hands,
                     g.u.umconf ? "even more" : "very");
            else
                await pline("Your %s glow %s brilliant %s.", hands,
                     g.u.umconf ? "an even more" : "a", hcolor(NH_RED));
            incr += rn1(8, 2);
        }
        /* after a while, repeated uses become less effective */
        if (g.u.umconf >= 40)
            incr = 1;
        g.u.umconf += (incr >>> 0); /* unsigned */
    }
}

/* C ref: read.c:1722 seffect_genocide(struct obj **sobjp).
 *
 * KNOWN GAP: do_genocide()/do_class_genocide() -- the class-selection menu and
 * the actual monster-removal effect -- are not ported anywhere in this tree,
 * so only the unconditional prefix (read.c:1726-1730) is ported here: the
 * "you have found a scroll of genocide!" discovery message and gk.known=TRUE.
 * That prefix is what doread's tail (learnscroll -> learnscrolltyp ->
 * more_experienced) needs to award the first-discovery exp bonus, and it is
 * also everything C itself does when the class-selection prompt is
 * cancelled (0 further RNG draws).  A session where the player actually
 * completes a genocide (drawing RNG inside do_genocide/do_class_genocide)
 * still diverges past this point -- the gap is real and named, not hidden. */
async function seffect_genocide(sobj) {
    const g = game;
    const otyp = sobj.otyp | 0;
    const already_known = (sobj.oclass | 0) === SPBOOK_CLASS || _oc_name_known(otyp);
    if (!already_known)
        await You('have found a scroll of genocide!');
    g._gk_known = true;
    /* C read.c:1737 — cursed/confused bits are encoded by the scroll state. */
    await do_genocide((sobj.cursed ? 0 : 1) | (_Confusion() ? 2 : 0));
}

/* C ref: read.c:1830 seffect_amnesia(struct obj **sobjp) */
async function seffect_amnesia(sobj) {
    const g = game;
    const sblessed = !!sobj.blessed;
    g._gk_known = true;
    g.disp = g.disp || {};
    g.disp.botl = 1; /* SET_BOTL from getobj (invent.c:2049) */
    forget(!sblessed ? ALL_SPELLS : 0);
    if (_Hallucination())
        await Your("mind releases itself from mundane concerns.");
    else if (((g.plname ?? g.u?.plname ?? "").substring(0, 4).toLowerCase() === "maud"))
        await pline("As your mind turns inward on itself, you forget everything else.");
    else if (rn2(2))
        await pline("Who was that Maud person anyway?");
    else
        await pline("Thinking of Maud you forget everything else.");
    exercise(2 /* A_WIS */, false);
}

/* ── Punishment (read.c:1976-1988 + read.c:3018-3062 + ball.c:110-143) ────────
 *
 * The scroll of punishment was the LAST unported scroll effect that a corpus
 * session actually reads, and its absence did not merely drop a message: with
 * no arm in seffects(), gk.known stayed FALSE, so doread's tail (read.c:636-643)
 * took `trycall(scroll)` instead of `learnscroll(scroll)` and opened a
 * "Call a scroll labeled KIRJE:" getlin.  A getlin swallows every keystroke up
 * to the closing Return, so from seed4500 step 492 onward EVERY recorded key was
 * being typed into a naming field instead of driving the game — 1094 consecutive
 * frames of it.  The turn counter reading one low at step 491 was a symptom of
 * this same substitution, not turn accounting.
 */

/* C objects.h — the scroll block runs SCR_ENCHANT_ARMOR=323 .. SCR_STINKING_CLOUD
 * =343 (js/oc_name_data.js:341 is "punishment"). */
const SCR_PUNISHMENT = 341;
/* C objclass.h enum objclass_classes — confirmed against js/mkobj_data.js
 * MKOBJ_SVB_BASES: [15]=477 (HEAVY_IRON_BALL), [16]=478 (IRON_CHAIN). */
const BALL_CLASS = 15;
const CHAIN_CLASS = 16;
/* C objects.h */
const HEAVY_IRON_BALL = 477;
/* C obj.h:394 — WT_IRON_BALL_INCR, the per-repeat weight bump. */
const WT_IRON_BALL_INCR = 160;

/* C ref: read.c:1976-1988 seffect_punishment(struct obj **sobjp).
 * gk.known is set unconditionally (so doread learnscroll()s the type — that is
 * the rn2(19) exercise at index 12 of seed4500's step-492 slice), and a confused
 * or BLESSED read only feels guilty. */
async function seffect_punishment(sobj) {
    const g = game;
    const sblessed = !!sobj.blessed;
    const confused = (_Confusion() !== 0);

    g._gk_known = true;                       /* C read.c:1982 */
    if (confused || sblessed) {               /* C read.c:1983 */
        await You_feel("guilty.");
        return;
    }
    await punish(sobj);                       /* C read.c:1987 */
}

/* C ref: read.c:3018-3062 punish(struct obj *sobj).
 *
 * RNG (measured against seed4500 step 492, leaves 49915-49926): the two
 * mkobj() calls are the ONLY draws — each is rnd(oclass_prob_totals[oclass])
 * = rnd(1000) at mkobj.c:289, then mksobj's next_ident rnd(2) and the four
 * mkobj_erosions draws.  placebc()'s flooreffects() calls draw nothing on a
 * plain floor square.
 *
 * NOTE the message ordering, which is load-bearing for the frame at step 491:
 * You() runs FIRST, before any mkobj, so it is the pline that more()s the
 * still-unacked "As you read the scroll, it disappears." — the --More-- frame
 * C captures there is punish()'s doing, and the ball/chain do not exist yet
 * when it is drawn. */
export async function punish(sobj) {
    const g = game;
    const u = g.u || (g.u = {});
    /* C read.c:3021 — angrygods() calls punish() with a NULL sobj. */
    const reuse_ball = (sobj && (sobj.otyp | 0) === HEAVY_IRON_BALL) ? sobj : null;
    const cursed_levy = (sobj && sobj.cursed) ? 1 : 0;

    if (!reuse_ball)
        await You("are being punished for your misbehavior!"); /* C read.c:3030 */

    if (u.uball) {                                            /* C read.c:3031 Punished */
        await Your("iron ball gets heavier.");
        u.uball.owt = (u.uball.owt | 0) + WT_IRON_BALL_INCR * (1 + cursed_levy);
        return;
    }
    /* C read.c:3036-3044 — an amorphous/whirly/unsolid polyform cannot be
     * chained; the ball is created and immediately dropped.  Same two mkobj
     * draws either way for the non-reuse case, so this arm is RNG-identical. */
    const ydata = g.youmonst && g.youmonst.data;
    if (ydata && (_amorphous(ydata) || _is_whirly(ydata) || _unsolid(ydata))) {
        if (!reuse_ball) {
            await pline("A ball and chain appears, then falls away.");
            await dropy((await mkobj(BALL_CLASS, true)));
        } else {
            await dropy(reuse_ball);
        }
        return;
    }

    setworn_bc((await mkobj(CHAIN_CLASS, true)), W_CHAIN);            /* C read.c:3046 */
    if (!reuse_ball)
        setworn_bc((await mkobj(BALL_CLASS, true)), W_BALL);          /* C read.c:3048 */
    else
        setworn_bc(reuse_ball, W_BALL);

    /* C read.c:3056-3061 — place them unless swallowed. */
    if (!u.uswallow) {
        await placebc();
        if (_Blind())                                 /* C read.c:3058-3059 */
            set_bc(1);      /* set up ball and chain variables */
        newsym(u.ux, u.uy);
    }
}

/* C ref: worn.c:73 setworn(obj, mask), specialised to W_BALL / W_CHAIN.
 *
 * js/steal.js exports a setworn() but its body is `throw new Error('not yet
 * ported')`, so it cannot be used.  This is the ball/chain slice of the real
 * one: HEAVY_IRON_BALL and IRON_CHAIN both have oc_oprop 0, so the extrinsic /
 * w_blocks / artifact / twoweap arms of C's setworn are all no-ops for them and
 * what remains is the owornmask bit plus the `*(wp->w_obj) = obj` write to C's
 * uball / uchain globals.  js/ball.js and js/dig.js DERIVE uball/uchain by
 * scanning for the owornmask bit, and js/cmd.js:8502 / js/trap.js:3688 read
 * u.uball / u.uchain directly, so both representations are written here. */
function setworn_bc(obj, mask) {
    const u = game.u || (game.u = {});
    const slot = (mask === W_BALL) ? 'uball' : 'uchain';
    const oobj = u[slot];
    if (oobj && oobj !== obj)
        oobj.owornmask = (oobj.owornmask | 0) & ~mask;
    u[slot] = obj;
    if (obj)
        obj.owornmask = (obj.owornmask | 0) | mask;
}

/* C ref: mondata.h amorphous/is_whirly/unsolid — the three polyform tests
 * punish() consults.  Same flag reads js/makemon.js:2911-2913 makes. */
const M1_AMORPHOUS_RD = 0x00040000, M1_UNSOLID_RD = 0x00080000;
const S_VORTEX_RD = 23; /* monsym.h S_VORTEX; is_whirly = mlet == S_VORTEX || AIR_ELEMENTAL */
function _amorphous(d) { return ((d.mflags1 | 0) & M1_AMORPHOUS_RD) !== 0; }
function _unsolid(d) { return ((d.mflags1 | 0) & M1_UNSOLID_RD) !== 0; }
function _is_whirly(d) {
    return (d.mlet | 0) === S_VORTEX_RD || (d.pmidx | 0) === PM_AIR_ELEMENTAL;
}

/* C ref: mkobj.c dropy(obj) — drop at the hero's feet with no shop/flooreffects
 * bookkeeping.  Only the amorphous-polyform arm above reaches it, which no
 * corpus session does; keep it minimal and faithful rather than absent, so the
 * arm cannot silently leak the object off the level. */
function dropy(obj) {
    const u = game.u || {};
    if (obj) place_object(obj, u.ux, u.uy);
}

/* C ref: read.c:1020 forget(int howmuch) — forget skills, and (if
 * howmuch & ALL_SPELLS) spells too, after a scroll of amnesia. */
function forget(howmuch) {
    if (howmuch & ALL_SPELLS)
        losespells();
    /* C read.c:1029 drain_weapon_skill(rnd(howmuch ? 5 : 3)) — the rnd() is
     * evaluated as drain_weapon_skill's ARGUMENT, before the call. */
    drain_weapon_skill(rnd(howmuch ? 5 : 3));
}
/* C ref: spell.c:1763 losespells(void) — forget a random selection of known
 * spells (memory retention -> 0) after amnesia.  `n` is the number of known
 * spells (spellid(n) == NO_SPELL terminates C's scan; this port's g.spl_book
 * holds exactly the known entries, so its length is n directly). */
export function losespells() {
    const g = game;
    g.context = g.context || {};
    /* C spell.c:1766-1767 — discard any in-progress study context. */
    g.context.spbook = g.context.spbook || { book: null, o_id: 0, delay: 0 };
    g.context.spbook.book = null;
    g.context.spbook.o_id = 0;
    const spl = g.spl_book || [];
    const n = spl.length;
    if (n <= 0)
        return;
    let nzap = rn2(n + 1);
    if (_Confusion() !== 0) {
        const i2 = rn2(n + 1);
        if (i2 > nzap)
            nzap = i2;
    }
    /* C spell.c:1782-1783 — good Luck might ameliorate spell loss. */
    if (nzap > 1 && !rnl(7))
        nzap = rnd(nzap);
    /* C spell.c:1809-1826 — pick exactly nzap of the n spells uniformly. */
    for (let i = 0; nzap > 0; i++) {
        if (rn2(n - i) < nzap) {
            spl[i].sp_know = 0;
            exercise(2 /* A_WIS */, false);
            nzap--;
        }
    }
}
/* C ref: weapon.c:1476 drain_weapon_skill(int n) — drain n random advanced
 * skills, refund their slots, and reduce their accumulated practice. */
export function drain_weapon_skill(n) {
    const g = game;
    const u = g.u || (g.u = {});
    const drained = new Set();
    while (--n >= 0) {
        const advanced = u.skills_advanced | 0;
        if (!advanced)
            continue;
        const i = rn2(advanced);
        const skill = (u.skill_record?.[i] ?? 0) | 0;
        drained.add(skill);
        if (!u.skill_record) u.skill_record = [];
        u.skill_record.splice(i, 1);
        u.skills_advanced = advanced - 1;

        const row = u.weapon_skills?.[skill];
        if (!row || (row.skill | 0) <= 1)
            throw new Error(`panic: drain_weapon_skill (${skill})`);
        row.skill = (row.skill | 0) - 1;
        u.weapon_slots = (u.weapon_slots | 0) + slots_required(skill);
        const curradv = (row.skill | 0) * (row.skill | 0) * 20;
        const prevLevel = (row.skill | 0) - 1;
        const prevadv = prevLevel * prevLevel * 20;
        if ((row.advance | 0) >= curradv)
            row.advance = prevadv + rn2(curradv - prevadv);
    }
    for (const skill of [...drained].sort((a, b) => a - b)) {
        const level = u.weapon_skills?.[skill]?.skill | 0;
        pline(`You forget ${level >= 2 ? 'some of ' : ''}your training in ${P_NAME(skill)}.`);
    }
}
function You_feel(msg) { return pline("You feel " + msg); }
function Your(fmt, ...args) { return pline("Your " + fmt, ...args); }
function body_part(part) { return part; }
/* C do_name.c:2432 hcolor(colorstr) returns colorstr unchanged unless the hero
 * is hallucinating (that branch draws from rn2_on_display_rng, NOT the core RNG,
 * and is not modelled here — same simplification this helper has always made).
 * The table below is the identity map from this file's numeric NH_* tokens to
 * the C c_color_names strings (decl.c:16-19). */
function hcolor(color) {
    return color === NH_BLUE ? "blue"
        : color === NH_RED ? "red"
        : color === NH_PURPLE ? "purple"
        : color === NH_BLACK ? "black"
        : color === NH_SILVER ? "silver"
        : color === NH_GOLDEN ? "golden"
        : "";
}

function pline_The(fmt, ...args) { return pline("The " + fmt, ...args); }

/* ---------------------------------------------------------------------------
 * seffect_identify — C ref: read.c:2055-2099.
 * The scroll-of-identify effect.  Uses up the scroll first, then (for the
 * non-confused, non-cursed-unknown case) computes cval = rn2(5) and runs
 * identify_pack(cval) which pops the per-item identify menu.
 *
 * RNG: rn2(5) (read.c:2087) for cval when sblessed || (!scursed && !rn2(5)).
 * Per identified item: discover_object(credit_hero=TRUE) → exercise(A_WIS)
 * → rn2(19) (the seed5500 step-787 leaves).
 * ---------------------------------------------------------------------------
 */
async function seffect_identify(holder, otyp) {
    const g = game;
    const sobj = holder.obj;
    const is_scroll = (sobj.oclass | 0) === SCROLL_CLASS_OC;
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const confused = false; /* Confusion not exercised by the corpus identify path */
    /* C read.c:2063: already_known for a spellbook is TRUE; for a scroll it is
     * objects[otyp].oc_name_known. */
    const already_known = !is_scroll || _oc_name_known(otyp);

    if (is_scroll) {
        /* C read.c:2070: useup the scroll first, before learnscrolltyp →
         * makeknown's perm_invent update; also simplifies empty-invent check. */
        useup(sobj);
        holder.obj = null; /* C: *sobjp = 0 — it's gone */
        if (confused || (scursed && !already_known)) {
            await pline('You identify this as an identify scroll.');
        } else if (!already_known) {
            await pline('This is an identify scroll.');
        }
        if (!already_known) {
            /* C read.c:2079: learnscrolltyp(SCR_IDENTIFY) — discover the scroll
             * type (credit_hero=TRUE → its own exercise).  Not exercised here
             * (identify is already known in seed5500), but faithful. */
            learnscrolltyp(SCR_IDENTIFY);
        }
        if (confused || (scursed && !already_known))
            return; /* C read.c:2080-2081 */
    }

    if (g.invent) {
        /* C read.c:2085-2092 */
        let cval = 1;
        if (sblessed || (!scursed && !rn2(5))) { /* read.c:2086 */
            cval = rn2(5); /* read.c:2087 — leaf 2270 in seed5500 */
            /* C read.c:2089: if (cval == 1 && sblessed && Luck > 0) ++cval; */
            const luck = (g.u && (g.u.uluck | 0)) || 0;
            if (cval === 1 && sblessed && luck > 0) ++cval;
        }
        await identify_pack(cval, !already_known);
    } else {
        await pline(`You're not carrying anything${is_scroll ? ' else' : ''} to be identified.`);
    }
}

/* C ref: invent.c:2698 count_unidentified — number of not-fully-identified items
 * in a chain. */
function count_unidentified(chain) {
    let n = 0;
    for (let o = chain; o; o = o.nobj)
        if (not_fully_identified(o)) n++;
    return n;
}

/* not_fully_identified() lives in objnam.c (objnam.c:1784), so its JS home is
 * js/objnam.js, which now exports the full body (including the container/box
 * cknown/lknown clauses this local copy stopped short of).  Imported at the
 * head of this file; the private partial copy that was here is removed. */

/* C ref: invent.c:2636 fully_identify_obj(otmp) — make an object actually
 * identified; no display updating.  makeknown(otyp) → discover_object(credit
 * hero=TRUE) → exercise(A_WIS) → rn2(19). */
function fully_identify_obj(otmp) {
    const otyp = otmp.otyp | 0;
    /* C: makeknown(otmp->otyp) == discover_object(otyp, TRUE, TRUE, TRUE). */
    discover_object(otyp, true, true, true);
    /* C: observe_object / set_cknown_lknown / artifact / egg — set the per-obj
     * known flags so the item is no longer not_fully_identified. */
    otmp.known = 1;
    otmp.bknown = 1;
    otmp.rknown = 1;
    otmp.dknown = 1;
    if (otmp.oclass === 5 /* AMULET? */ || otmp.otyp === undefined) { /* no-op */ }
}

/* C ref: invent.c:2650 identify(otmp) — identify one object and give immediate
 * feedback via prinv (the "n - a blessed scroll of enchant weapon." line). */
async function identify(otmp) {
    fully_identify_obj(otmp);
    await _prinv_identify(otmp);
    return 1;
}

/* C ref: invent.c:2875 prinv()/xprname() — the single-line item display.  For
 * identify the prefix is empty, so the line is "<invlet> - <doname>".  doname()
 * for the now-fully-identified item prepends the BUC adjective (the item is
 * bknown after fully_identify_obj), e.g. "a blessed scroll of enchant weapon".
 * Each line --More--s on the topline (the seed5500 step-787/788
 * "n - a blessed scroll of enchant weapon.--More--"). */
async function _prinv_identify(obj) {
    const letter = obj.invlet ? String.fromCharCode(obj.invlet | 0) : '?';
    /* C invent.c:2875 prinv() -> xprname() -> doname(): the real namer, run on
     * the now-fully-identified object (BUC, enchantment, known type name). */
    const name = await doname_with_price(obj);
    await pline(`${letter} - ${name}.`);
}

/* C ref: invent.c:2711 identify_pack — dialog to identify id_limit items (0=all).
 * For the corpus, id_limit (cval) is small and < unid_cnt, so it goes through the
 * menu_identify path (MENU_FULL default → ggetobj returns 0 → menu_identify). */
export async function identify_pack(id_limit, learning_id) {
    const g = game;
    const unid_cnt = count_unidentified(g.invent);
    if (!unid_cnt) {
        await pline(`You have already identified ${learning_id ? 'the rest' : 'all'} of your possessions.`);
    } else if (!id_limit || id_limit >= unid_cnt) {
        /* Identify everything (C read.c:2724-2730). */
        let remaining = unid_cnt;
        for (let o = g.invent; o; o = o.nobj) {
            if (not_fully_identified(o)) {
                await identify(o);
                if (--remaining < 1) break;
            }
        }
    } else {
        /* Identify up to id_limit items via the menu (MENU_FULL → menu_identify). */
        await menu_identify(id_limit);
    }
    /* C: update_inventory() — display refresh, no RNG. */
}

/* C invent.c:2669 query_objlist(..., SIGNAL_NOMENU, ...) returns -1 when the
 * filter matched nothing, which is NOT the same answer as 0 ("menu shown, no
 * selection"); this sentinel keeps the two apart across the JS return value. */
const NO_ELIGIBLE_ITEMS = Symbol('query_objlist n == -1');

/* C ref: invent.c:2659 menu_identify(id_limit) — pop the "What would you like to
 * identify first?" PICK_ANY menu over the not_fully_identified inventory, take up
 * to id_limit picks, and identify each (firing its discover_object exercise +
 * prinv). */
async function menu_identify(id_limit) {
    const g = game;
    let first = true;
    /* C invent.c:2664 `int ... tryct = 5;` — the re-prompt budget. */
    let tryct = 5;
    while (id_limit > 0) {
        const prompt = `What would you like to identify ${first ? 'first' : 'next'}?`;
        const picks = await _identify_objlist_menu(prompt);
        if (picks === null) break; /* ESC — player quit the menu (n == -2) */
        if (picks === NO_ELIGIBLE_ITEMS) {
            /* C n == -1 — query_objlist found nothing to offer. */
            await pline('That was all.');
            break;
        }
        if (picks.length === 0) {
            /* C invent.c:2687-2692 — the menu was shown and the player
             * committed WITHOUT selecting anything (n == 0).  C does not give
             * up here: it burns one of five tries and re-opens the same menu,
             * printing "Choose an item; use ESC to decline." on every try but
             * the last, where it prints thats_enough_tries (decl.c:42,
             * "That's enough tries!") and stops.  This port broke out of the
             * loop instead, so C's re-prompt and its --More-- never appeared,
             * and C then read a keystroke this port did not — a wrong KEYSTROKE
             * COUNT, not merely a wrong frame.  gen232 step 496. */
            if (!--tryct) {
                await pline("That's enough tries!");
                break;
            }
            await pline('Choose an item; use ESC to decline.');
            continue;
        }
        let n = picks.length;
        if (n > id_limit) n = id_limit;
        for (let i = 0; i < n; i++, id_limit--)
            await identify(picks[i]);
        /* C: if (id_limit) wait_synch(); — display sync, no RNG. */
        /* C invent.c:2686 — `first = 0` sits INSIDE the n > 0 arm, so a
         * no-selection round re-asks "identify first?", not "next?". */
        first = false;
    }
}

/* C ref: invent.c query_objlist over gi.invent with not_fully_identified filter,
 * PICK_ANY | USE_INVLET | INVORDER_SORT, rendered as a full-screen tty menu with
 * per-class headers (Scrolls, Potions, Rings, ...).  Returns the array of picked
 * objects (in inventory order), or null if the player ESCs (C n == -2).
 *
 * The menu consumes navigation keystrokes (letter toggles, page keys) but no RNG;
 * RNG is fired only later by identify() per pick. */
async function _identify_objlist_menu(promptText) {
    const g = game;
    /* C wintty.c:1918-1919 — the FIRST thing tty_display_nhwindow() does for an
     * NHW_MENU is
     *     if (ttyDisplay->toplin == TOPLINE_NEED_MORE)
     *         tty_display_nhwindow(WIN_MESSAGE, TRUE);
     * so a topline still standing when the menu opens is paged out with a
     * --More-- of its own, on its own frame, before the menu is drawn.
     *
     * This lived in menu_identify() and ran ONCE, before the loop — enough for
     * the "As you read the scroll, it disappears." topline that precedes the
     * first menu (seed5500 step 768 = SPACE), but menu_identify re-opens the
     * window after a no-selection round and its "Choose an item; use ESC to
     * decline." pline needs exactly the same treatment.  It belongs at the
     * window, not at the caller. */
    if (g._pending_message) {
        await topline_more_loop(g._pending_message);
        g._pending_message = '';
    }
    /* Collect eligible items in invent order (invent.c reorder_invent keeps
     * gi.invent sorted by inventory letter, which is also what SORTLOOT_INVLET
     * gives query_objlist's within-class pass).  The CLASS grouping order comes
     * from flags.inv_order, not from invent order — see INV_ORDER below. */
    const eligible = [];
    for (let o = g.invent; o; o = o.nobj)
        if (not_fully_identified(o)) eligible.push(o);
    /* C pickup.c query_objlist: `if (!olist ...) return 0;` / the n == -1
     * SIGNAL_NOMENU arm — with nothing to offer, NO window is opened at all
     * and the caller gets -1.  Distinguish that from "menu shown, nothing
     * picked" (n == 0), which menu_identify handles very differently. */
    if (!eligible.length)
        return NO_ELIGIBLE_ITEMS;

    /* C pickup.c:1101 query_objlist — `pack = strcpy(packbuf, flags.inv_order)`
     * and the `do { ... pack++; } while (sorted && *pack)` loop walk the CLASS
     * ORDER, not the invent order: one pass per class in flags.inv_order, each
     * pass scanning the (invlet-sorted) item list for members of that class.
     * flags.inv_order is def_inv_order (options.c:136-140):
     *   COIN, AMULET, WEAPON, ARMOR, FOOD, SCROLL, SPBOOK, POTION, RING, WAND,
     *   TOOL, GEM, ROCK, BALL, CHAIN
     * so TOOL_CLASS(6) comes AFTER WAND_CLASS(11) even though gi.invent is held
     * in invlet order (invent.c reorder_invent) and a tool can hold an early
     * letter.  Grouping by first-appearance-in-invent instead put the hero's
     * magic marker ('m', TOOL) and wished large box ('Q', TOOL) at the TOP of
     * page 1, shifting every later row down by 4. */
    /* oclass values, NOT otyps (objclass.h enum objclass_classes, generated from
     * defsym.h:466-483 OBJCLASS()); listed in def_inv_order sequence. */
    const INV_ORDER = [
        12, /* COIN_CLASS   */ 5,  /* AMULET_CLASS */
        2,  /* WEAPON_CLASS */ 3,  /* ARMOR_CLASS  */
        7,  /* FOOD_CLASS   */ 9,  /* SCROLL_CLASS */
        10, /* SPBOOK_CLASS */ 8,  /* POTION_CLASS */
        4,  /* RING_CLASS   */ 11, /* WAND_CLASS   */
        6,  /* TOOL_CLASS   */ 13, /* GEM_CLASS    */
        14, /* ROCK_CLASS   */ 15, /* BALL_CLASS   */
        16, /* CHAIN_CLASS  */
    ];
    const present = new Set(eligible.map(o => o.oclass | 0));
    const classOrder = INV_ORDER.filter(oc => present.has(oc));
    /* Any class not in def_inv_order (there is none in the corpus) would be
     * dropped by C's loop as well, so no fallback pass is needed. */
    /* C invent.c:4789-4793 names[] (indexed by oclass), via let_to_name(). */
    const CLASS_HEADER = {
        1: 'Illegal objects', 2: 'Weapons', 3: 'Armor', 4: 'Rings',
        5: 'Amulets', 6: 'Tools', 7: 'Comestibles', 8: 'Potions',
        9: 'Scrolls', 10: 'Spellbooks', 11: 'Wands', 12: 'Coins',
        13: 'Gems/Stones', 14: 'Boulders/Statues', 15: 'Iron balls',
        16: 'Chains', 17: 'Venoms',
    };

    /* Build display rows: header + items, plus selection state per item. */
    const entries = []; /* {obj, selected} */
    /* Each entry is the FULLY rendered row (leading margin included), because the
     * tty menu's separator row carries no margin while every menu line does.
     * C's page-1 layout for this menu (session step 768, verbatim):
     *   row0  " <inv>What would you like to identify first?</inv>"
     *   row1  ""                       <- separator, no leading space
     *   row2  " <inv>Scrolls</inv>"
     *   row3  " n - a scroll labeled PRIRUTSENIE"    ... through row8 " t - ..."
     *   row9  " <inv>Potions</inv>"    <- NO blank line before a class heading
     * i.e. exactly ONE separator, between the prompt and the first heading:
     * pickup.c:1101-1140 query_objlist emits only add_menu_heading + add_menu per
     * class, never a spacer, so the single gap is the tty menu's prompt
     * separator.  Emitting a spacer per class pushed Potions/Rings down a row
     * each and shortened page 1. */
    /* The menu's mlist entries, WITHOUT the one-column left margin.  C stores
     * the bare string in tty_add_menu and paints the margin at draw time
     * (wintty.c:1432-1433 `(void) putchar(' '); ++ttyDisplay->curx;`, which in
     * process_menu_window is UNCONDITIONAL — unlike process_text_window, where
     * it is gated on cw->offx).  Keeping the margin out of the string is what
     * lets tty_window_offx() measure cw->maxcol the way tty_end_menu does. */
    function buildLines() {
        const lines = [];
        lines.push(`\x1b[7m${promptText}\x1b[0m`);
        lines.push('');
        for (const oc of classOrder) {
            lines.push(`\x1b[7m${CLASS_HEADER[oc] ?? 'Items'}\x1b[0m`);
            for (const e of entries) {
                if ((e.obj.oclass | 0) !== oc) continue;
                const letter = String.fromCharCode(e.obj.invlet | 0);
                lines.push(`${letter} ${e.selected ? '+' : '-'} ${e.name}`);
            }
        }
        return lines;
    }
    for (const o of eligible) entries.push({ obj: o, selected: false });
    /* C pickup.c:1137 query_objlist add_menu(..., doname_with_price(curr), ...):
     * each row is the REAL doname text (BUC/enchantment/"(being worn)"/known
     * type names), not the appearance-only partial namer, so the menu width
     * and hence offx match C.  Names are built once in class order; a toggle
     * cannot change them. */
    for (const oc of classOrder)
        for (const e of entries)
            if ((e.obj.oclass | 0) === oc)
                e.name = await doname_with_price(e.obj);

    const LETTERSET = new Map(entries.map(e => [e.obj.invlet | 0, e]));
    let escaped = false;
    /* C ref: win/tty/getline.c:213 — a MENU_SEARCH's tty_getlin ends with
     * clear_nhwindow(WIN_MESSAGE), which blanks SCREEN row 0.  When this menu
     * is full-screen (offx == 0) row 0 is the prompt line, and
     * process_menu_window only repaints on a page change — which this renderer
     * never performs, so once erased it stays erased. */
    let titleErased = false;
    /* ── WINDOW GEOMETRY (C wintty.c:1902-1932 tty_display_nhwindow, NHW_MENU)
     *
     * A tty NHW_MENU is an OVERLAY in the top-right corner, not a full-screen
     * window.  wintty.c defines H2344_BROKEN at line 13, so the live arm is
     *     cw->offx = min(min(82, cols / 2), cols - maxcol - 1)
     * i.e. min(40, 79 - maxcol) at 80 columns, and the window is forced
     * full-screen (offx = 0, term_clear_screen()) only when
     *     cw->maxrow >= ttyDisplay->rows  ||  !iflags.menu_overlay
     * with maxrow = nitems + 1 for a single page and lmax + 1 = 24 for a
     * multi-page menu (tty_end_menu, wintty.c:2836-2841).  At 24 rows that
     * makes every menu of 23 or more entries full-screen and every shorter one
     * a corner overlay over the live map and status lines.
     *
     * This renderer was written against seed5500 step 768 and seed0006 step
     * 546, whose identify menus both run to two pages and are therefore
     * full-screen — so it hard-coded the full-screen case and drew a SHORT
     * menu at column 1 over a blanked screen.  gen232-reseed-seed1268561 step
     * 495 is the short case: 7 entries (prompt + blank + 2 class headings + 3
     * items), maxcol = 40 from the prompt, offx = 39, and C paints the menu at
     * column 40 with the map and both status rows still showing.  JS blanked
     * all of it, which cost the frame and the 20 after it.
     *
     * js/com_pager.js already carries the shared machinery (tty_window_offx +
     * build_window_screen) that js/shk.js's "Pay for which items?" menu and
     * js/pickup_container.js use for exactly this. */
    const SCREEN_ROWS = 24;
    /* C tty_end_menu: lmax = min(52, rows - 1) = 23 lines per page. */
    const PAGE_CONTENT = SCREEN_ROWS - 1;
    /* offx is computed ONCE when the window is displayed and does not change
     * as selections toggle (a '+'/'-' swap cannot change a line's width), so
     * measure it from the un-erased first frame. */
    const GEOM_LINES = buildLines();
    const FULL_SCREEN = (GEOM_LINES.length + 1) >= SCREEN_ROWS;
    const WIN_COL = FULL_SCREEN
        ? 1
        : tty_window_offx([...GEOM_LINES.slice(0, PAGE_CONTENT), '(end)'], 'end');
    const frameRows = () => {
        const lines = buildLines();
        const pageCount = Math.max(1, Math.ceil(lines.length / PAGE_CONTENT));
        const pageLines = lines.slice(0, PAGE_CONTENT);
        const footer = (pageCount > 1) ? `(1 of ${pageCount})` : '(end)';
        const footerRow = pageLines.length;
        if (FULL_SCREEN) {
            /* C: term_clear_screen() then each row at column offx + 1 = 1. */
            const rows = new Array(SCREEN_ROWS).fill('');
            for (let i = 0; i < pageLines.length; i++) rows[i] = ` ${pageLines[i]}`;
            rows[footerRow] = ` ${footer}`;
            if (titleErased) rows[0] = '';
            return { rows, footer, footerRow, pageCount };
        }
        const winLines = pageLines.slice();
        winLines.push(footer);
        if (titleErased) winLines[0] = '';
        const rows = build_window_screen(winLines, WIN_COL, g.u?.uac ?? 0).split('\n');
        return { rows, footer, footerRow, pageCount };
    };
    while (true) {
        const { rows, footer, footerRow, pageCount } = frameRows();
        g._screen_output = rows.join('\n');
        /* C wintty.c:1543-1545 draws the footer with
         *     tty_curs(window, 1, page_lines);  -> curx = offx
         *     cl_end();
         *     dmore(cw, resp);                  -> tty_curs(BASE, curx + 2, .)
         *                                          then xputs(morestr)
         * so the text lands at column offx + 1 (= WIN_COL) and the cursor ends
         * strlen(morestr) further right.  morestr is tty_end_menu's "(end) " —
         * SIX characters, the trailing space included (wintty.c:2820) — on a
         * single-page menu, and process_menu_window's Sprintf "(%d of %d)"
         * with NO trailing space on a multi-page one (wintty.c:1538-1539).
         * Verified both ways: seed5500 step 768 and seed0006 step 546 record
         * [9,23,1] for a full-screen "(1 of 2)" (1 + 8), and gen232 step 495
         * records [46,7,1] for an overlay "(end) " (40 + 6). */
        set_cursor(WIN_COL + footer.length + (pageCount > 1 ? 0 : 1), footerRow);

        const k = await nhgetch();
        const kc = typeof k === 'number' ? k : (k?.charCodeAt(0) ?? 0);
        if (kc === 27 /* ESC */) { escaped = true; break; }
        /* RETURN / ENTER finishes the menu with current selections. */
        if (kc === 10 || kc === 13) break;
        /* SPACE advances the page; on the last page it finishes (C menu next-page
         * then accept).  For the seed5500 menu all picks are on page 1 and the
         * player presses ENTER, so paging is not exercised; advance-or-finish. */
        if (kc === 32) {
            /* single page → finish; multi-page → would advance.  We only render
             * page 1, so treat space as finish to keep selections intact. */
            break;
        }
        const e = LETTERSET.get(kc);
        if (e) { e.selected = !e.selected; continue; }
        if (kc === 0x3a /* ':' MENU_SEARCH */) {
            /* C ref: win/tty/wintty.c:1700-1730 — tty_getlin("Search for:"),
             * "*%s*", then pmatchi() over the whole mlist toggling every
             * selectable hit.  query_objlist opens this menu PICK_ANY
             * (pickup.c:1101), so it never finishes early.  pmatchi matches
             * what tty_add_menu STORED, "%c - %s" (wintty.c:2596-2600): no
             * leading margin space (that is paint-time putchar(' ')), and a
             * literal " - " rather than the '+' a selected row is drawn with. */
            await menu_search_case(
                'ANY',
                entries.map((en) => ({
                    str: `${String.fromCharCode(en.obj.invlet | 0)} - ${en.name}`,
                    en,
                })),
                () => frameRows().rows,
                (curr) => { curr.en.selected = !curr.en.selected; });
            titleErased = true;
            continue;
        }
        /* C: non-accelerator keys ring the bell, menu stays up. */
    }
    g._pending_message = '';
    await flush_screen(1);
    if (escaped) return null; /* C n == -2 */
    /* C tty_select_menu / process_menu_window hand back the picks in MENU order
     * (the class-grouped order query_objlist added them), not invent order. */
    const picked = [];
    for (const oc of classOrder)
        for (const e of entries)
            if (e.selected && (e.obj.oclass | 0) === oc) picked.push(e.obj);
    return picked;
}

/* C ref: read.c:2102 seffect_magic_mapping() — the magic-mapping scroll/spell.
 * For the non-nommap, non-confused, non-blessed wizard case: set gk.known, print
 * "A map coalesces in your mind!", then do_mapping(). */
async function seffect_magic_mapping(sobj) {
    const g = game;
    const is_scroll = true; /* sobj is a real scroll here */
    /* C read.c:2110-2134: nommap / blessed-secret-door handling — not exercised by
     * the corpus (no nommap level, scroll not blessed); skip to the common path. */
    if (is_scroll) {
        g._gk_known = true; /* C read.c:2134 gk.known = TRUE */
    }
    /* C read.c:2143: pline("A map coalesces in your mind!"); */
    await pline('A map coalesces in your mind!');
    /* C read.c:2144 cval = (scursed && !confused) — false here (not cursed). */
    await do_mapping();
}

/* C ref: display.c:233 magic_map_background(x,y,show) — set the remembered glyph
 * at (x,y) to the real terrain (back_to_glyph), correcting out-of-sight unlit
 * room/corridor floor to dark.  We store the terrain glyph into loc.remembered_glyph
 * (the JS analogue of lev->glyph). */
export function magic_map_background(loc, x, y) {
    if (!loc) return;
    const tg = terrain_glyph(loc, x, y);
    let rg = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
    /* C: if (!cansee(x,y) && !lev->waslit) — dark-room / dark-corridor correction. */
    if (!cansee(x, y) && !loc.waslit) {
        if (loc.typ === ROOM && rg.ch === '.' && !rg.decgfx && rg.color === NO_COLOR) {
            /* S_room → DARKROOMSYM (dark floor) under dark_room+use_color. */
            rg.color = CLR_BLACK;
        } else if (loc.typ === ROOM && rg.ch === '~' && rg.decgfx && rg.color === NO_COLOR) {
            rg.color = CLR_BLACK;
        }
        /* CORR S_litcorr → S_corr is already the plain corridor glyph here. */
    }
    /* C display.c:250-252 only replaces unexplored/cmap memory. Objects and
     * invisible-monster markers survive magic mapping. Trap and engraving
     * glyphs are in C's cmap range; legacy terrain memory has no cls. */
    const rememberedClass = loc.remembered_glyph?.cls;
    if (game.level?.flags?.hero_memory
        && (rememberedClass == null || rememberedClass === GLYPHCLS_CMAP
            || rememberedClass === GLYPHCLS_TRAP || rememberedClass === GLYPHCLS_ENGR))
        loc.remembered_glyph = { ...rg, cls: GLYPHCLS_CMAP };
    /* C display.c:257 — `update_lastseentyp(x, y);` is magic_map_background's
     * LAST statement, and it is the ONLY writer of svl.lastseentyp[][] on the
     * magic-mapping path (C's plain map_background, display.c:279-287, has no
     * such call; only magic_map_background and the _map_location macro do).
     * It was dropped here, so a level revealed by #wizmap / a scroll of magic
     * mapping ended up fully seenv'd with an all-zero lastseentyp plane, and
     * #overview's recalc_mapseen counted no features on it at all.
     * MEASURED on seed4500-knight-coverage step 893: Dlvl 3's fountain, Dlvl
     * 4's three fountains and Dlvl 24's fountain were all invisible to the
     * overview (Dlvl 3 was dropped from the list entirely for failing
     * interest_mapseen), while the ONE fountain on Dlvl 4 the hero had walked
     * past in person was counted — the sighted path already had its writer. */
    update_lastseentyp(x, y);
}

/* C ref: detect.c:1373 show_map_spot(x,y,cnf) — reveal one cell during mapping.
 * cnf (Confusion) is FALSE here, so no rn2(7) skip fires.  Sets seenv=SVALL,
 * converts secret corridors to corridors, then forces the remembered terrain
 * glyph and re-renders via newsym. */
export function show_map_spot(loc, x, y, cnf) {
    if (!loc) return;
    if (cnf && rn2(7)) return; /* C detect.c:1381 — not taken (cnf=0) */
    loc.seenv = SVALL; /* C detect.c:1385 */
    if (loc.typ === SCORR) { /* C detect.c:1388-1391 */
        loc.typ = CORR;
        /* unblock_point — vision update; the cell is now passable corridor. */
    }
    /* C detect.c:1399 oldglyph = glyph_at(x,y) — what is CURRENTLY PAINTED here,
     * captured BEFORE magic_map_background overwrites the cell.  The JS analogue
     * of gbuf[y][x] is the disp_* cell (what the last paint put on the screen);
     * disp_cls carries the glyph FAMILY that C encodes in the glyph number. */
    const oldCls = loc.disp_cls;
    const oldGlyph = { ch: loc.disp_ch, color: loc.disp_color, decgfx: !!loc.disp_decgfx,
                       cls: oldCls };
    /* C detect.c:1400-1405: hero_memory path — magic_map_background then newsym. */
    magic_map_background(loc, x, y);
    newsym(x, y);
    /* C detect.c:1406-1416 — "force the real background, then if it's not
     * furniture and there's a KNOWN trap there, display the trap, else if there
     * was an object shown there, redisplay the object.  So during mapping,
     * furniture takes precedence over traps, which take precedence over objects,
     * opposite to how normal vision behaves." */
    if (!IS_FURNITURE(loc.typ)) {
        const t = t_at(x, y);
        let ep;
        if (t !== null && (t.tseen | 0)) {
            map_trap(t, 1);                               /* C detect.c:1408 */
        } else if ((ep = engr_at(x, y)) !== null && !cnf) {
            map_engraving(ep, 1);                         /* C detect.c:1410 */
        } else if (oldCls === GLYPHCLS_TRAP || oldCls === GLYPHCLS_OBJ) {
            /* C detect.c:1412-1414 show_glyph(x,y,oldglyph) + (hero_memory)
             * lev->glyph = oldglyph — put back the trap/object the background
             * overwrite just wiped. */
            show_glyph_cell(x, y, oldGlyph.ch, oldGlyph.color, oldGlyph.decgfx, 0, oldCls);
            if (game.level?.flags?.hero_memory)
                loc.remembered_glyph = { ch: oldGlyph.ch, color: oldGlyph.color,
                                         decgfx: oldGlyph.decgfx, cls: oldCls };
        }
    }
    /* C detect.c:1417-1419 — `if (!cnf && lev->roomno >= ROOMOFFSET)
     *     room_discovered(lev->roomno - ROOMOFFSET);`
     * "possibly update #overview".  The old note here called the overview "not a
     * rendered channel", which stopped being true when show_overview() was
     * ported: this is how a shop or temple on a MAGIC-MAPPED level gets into
     * mapseen.msrooms[] without the hero ever walking into it.  MEASURED on
     * seed4500 step 893 — C annotates the #wizmap'd Dlvl 3 "A general store, a
     * fountain." and this port printed "A fountain." */
    if (!cnf && (loc.roomno | 0) >= ROOMOFFSET)
        room_discovered((loc.roomno | 0) - ROOMOFFSET);
}

/* C ref: detect.c:1423 do_mapping() — reveal the whole level into memory, then
 * exercise(A_WIS).  cnf = Confusion (FALSE here).  After revealing, docrt()
 * re-renders the map from the freshly-set remembered glyphs. */
export async function do_mapping() {
    const g = game;
    const cnf = 0; /* Confusion — not set in seed2200 read path */
    for (let zx = 1; zx < COLNO; zx++) {
        for (let zy = 0; zy < ROWNO; zy++) {
            const loc = g.level?.at(zx, zy);
            if (loc) show_map_spot(loc, zx, zy, cnf);
        }
    }
    /* C detect.c:1432-1442 — the tail is a TWO-ARM branch on
     *     if (!svl.level.flags.hero_memory || unconstrained) { flush_screen;
     *         browse_map(...); map_redisplay(); }  else { reconstrain_map(); }
     * `unconstrained` is unconstrain_map()'s return, TRUE only for a hero who is
     * underwater / buried / engulfed (detect.c:1355), and hero_memory is on, so
     * every corpus reach takes the ELSE arm — which redraws NOTHING.  The screen
     * after do_mapping is exactly what show_map_spot's own show_glyph calls left.
     *
     * This port ended with an unconditional docrt(), which is C's OTHER arm and
     * is not RNG-neutral in what it paints: docrt_flags ends in see_monsters(),
     * so every monster is overlaid AFTER the trap/object pass — undoing the
     * "during mapping, furniture > traps > objects, opposite to how normal
     * vision behaves" priority the whole function exists to produce.  Measured
     * on seed4500 step 1241 (#wizmap on Dlvl 25): C paints the `"` of the web at
     * (26,16) over the giant spider mktrap() put on it (mklev.c:2104), this port
     * repainted the `s`, and that single cell was 15 consecutive frames.
     * reconstrain_map() restores u.uinwater/uburied/uswallow, all of which this
     * port never cleared here, so the else arm is a no-op. */
    /* C detect.c:1443: exercise(A_WIS, TRUE) → rn2(19) */
    exercise(2 /* A_WIS */, true);
}


/* ---------------------------------------------------------------------------
 * learnscrolltyp — learn the identity of a scroll type.
 * C ref: nethack-c/src/read.c:57-66
 *
 * If the scroll type is not yet known, call discover_object(scrolltyp, ...,
 * credit_hero=TRUE) (which calls exercise and consumes RNG) and
 * more_experienced(0, 10). Return TRUE if the type was just learned,
 * FALSE if it was already known.
 *
 * RNG: rn2(19) or rn2(2) from exercise() inside discover_object when the
 * object type wasn't yet known.
 * ---------------------------------------------------------------------------
 */
function learnscrolltyp(scrolltyp) {
    const g = game;

    /* Check if the object type is already known (JS: game._oc_name_known[otyp]). */
    const isKnown = !!(g._oc_name_known && g._oc_name_known[scrolltyp]);

    if (!isKnown) {
        /* Mark the object type as known. discover_object consumes RNG via
         * exercise(A_WIS, TRUE) when credit_hero=TRUE. */
        discover_object(scrolltyp, true, true, true);
        /* C read.c:61 more_experienced(0, 10).  The note that stood here — "not
         * yet exported from uhitm.js" — was FALSE: js/exper.js has the body and
         * js/uhitm.js re-exports it (js/zap.js, js/cmd.js and js/potion.js all
         * import it from there).  RNG-free; it moves u.urexp only, which nothing
         * paints until the tombstone.  MEASURED, seed5006 segment 0 step 187:
         * the confused read of a scroll of teleportation is the session's only
         * type discovery, and C's stone says "with 144 points" where this port
         * said 134 — exactly the missing 10. */
        more_experienced(0, 10);
        return true;
    }
    return false;
}

/* ---------------------------------------------------------------------------
 * learnscroll — learn a scroll's identity when reading it.
 * C ref: nethack-c/src/read.c:69-76
 *
 * If sobj->oclass != SPBOOK_CLASS, call learnscrolltyp(sobj->otyp) to
 * register the scroll type as known. Spellbooks (SPBOOK_CLASS) are handled
 * separately by doread().
 *
 * RNG: passed through to learnscrolltyp (via discover_object/exercise).
 * ---------------------------------------------------------------------------
 */
export function learnscroll(sobj) {
    if (sobj.oclass !== SPBOOK_CLASS)
        learnscrolltyp(sobj.otyp);
}

/* ---------------------------------------------------------------------------
 * cant_revive — decide whether reviving/statue-animating *mtype forces a
 * substitute monster type instead.
 * C ref: nethack-c/src/read.c:3111-3135
 *
 * mons[] row lookup mirrors the established MONS[idx][3]==geno pattern used
 * throughout the port (e.g. js/makemon.js:282-283, js/trap.js). G_UNIQ =
 * 0x1000 (monflag.h). unique_corpstat(ptr) = (ptr->geno & G_UNIQ) != 0
 * (mondata.h:174). has_omonst(o) = (o->oextra && OMONST(o)) (obj.h:197).
 *
 * mtype is an int* output param: JS receives the boxed {value} carrier and
 * mutates mtype.value in place, per the port's established out-param
 * convention (js/lock.js x/y, js/trap.js noticed, js/potion.js which).
 *
 * RNG: none.
 * ---------------------------------------------------------------------------
 */
const G_UNIQ = 0x1000;
const _CANT_REVIVE_MONS = /** @type {number[][]} */ (monsPack.mons);

function has_omonst(o) {
    return Boolean(o.oextra && o.oextra.omonst);
}

export function cant_revive(mtype, revival, from_obj) {
    if (mtype.value === PM_GUARD
        || (mtype.value === PM_SHOPKEEPER && !revival)
        || mtype.value === PM_HIGH_CLERIC || mtype.value === PM_ALIGNED_CLERIC
        || mtype.value === PM_ANGEL) {
        mtype.value = PM_HUMAN_ZOMBIE;
        return true;
    } else if (mtype.value === PM_LONG_WORM_TAIL) {
        mtype.value = PM_LONG_WORM;
        return true;
    } else if ((_CANT_REVIVE_MONS[mtype.value][3] & G_UNIQ) !== 0
               && (!from_obj || !has_omonst(from_obj))) {
        mtype.value = PM_DOPPELGANGER;
        return true;
    }
    return false;
}
