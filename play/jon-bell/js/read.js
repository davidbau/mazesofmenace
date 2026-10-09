// @ts-nocheck
import { rn2, rnd, rn1, rnl, d } from './rng.js';
import { discover_object } from './o_init.js';
import { MKOBJ_OC_CLASS } from './mkobj_data.js';
import { game } from './gstate.js';
import { pline, getobj_never_mind, bot as bot_read, gamelog_add, obj_to_glyph } from './display.js';
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
/* C read.c:2413-2441 — overcharging any wand or zapping/engraving cursed wand.
 * chg is the recharging adjustment (0 for zap/engrave). */
export async function wand_explode(obj, chg) {
    const expl = !chg ? 'suddenly' : 'vibrates violently and';
    /* number of damage dice */
    if (!chg) chg = 2; /* zap/engrave adjustment */
    let n = (obj.spe | 0) + chg;
    if (n < 2) n = 2; /* arbitrary minimum */
    /* size of damage dice */
    const WAN_NOTHING = 416, WAN_UNDEAD_TURNING = 421, WAN_POLYMORPH = 422,
          WAN_CANCELLATION = 423, WAN_MAGIC_MISSILE = 429, WAN_FIRE = 430,
          WAN_COLD = 431, WAN_DEATH = 433, WAN_LIGHTNING = 434;
    let k;
    switch (obj.otyp | 0) {
    case WAN_WISHING: k = 12; break;
    case WAN_CANCELLATION: case WAN_DEATH: case WAN_POLYMORPH:
    case WAN_UNDEAD_TURNING: k = 10; break;
    case WAN_COLD: case WAN_FIRE: case WAN_LIGHTNING:
    case WAN_MAGIC_MISSILE: k = 8; break;
    case WAN_NOTHING: k = 4; break;
    default: k = 6; break;
    }
    /* inflict damage and destroy the wand */
    const dmg = d(n, k);
    obj.in_use = true; /* in case losehp() is fatal (or --More--^C) */
    await pline(`${Yname2(obj)} ${expl} explodes!`);
    await losehp(dmg /* Maybe_Half_Phys: Half_physical_damage unported */,
                 'exploding wand', KILLED_BY_AN);
    await useup_cmd(obj);
    /* obscure side-effect */
    exercise(A_STR, false);
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
function _p_glow_observe(obj) {
    const p = game.u?.uprops?.[BLINDED];
    const Blind = !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)));
    if (obj && !Blind)
        observe_object(obj);
}
function _p_glow_Blind() {
    const p = game.u?.uprops?.[BLINDED];
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)));
}
/* color may be a string ('blue') or this file's numeric NH_* token. */
function _p_glow_color(color) {
    return hcolor_real(typeof color === 'number' ? hcolor(color) : color);
}
async function p_glow1(obj) {
    /* C read.c:669 */
    _p_glow_observe(obj);
    await pline(`${Yobjnam2(obj, _p_glow_Blind() ? 'vibrate' : 'glow')} briefly.`);
}
async function p_glow2(obj, color) {
    /* C read.c:675-676 */
    const Blind = _p_glow_Blind();
    _p_glow_observe(obj);
    await pline(`${Yobjnam2(obj, Blind ? 'vibrate' : 'glow')}${Blind ? '' : ' '}${Blind ? '' : _p_glow_color(color)} for a moment.`);
}
async function p_glow3(obj, color) {
    /* C read.c:682-684 */
    const Blind = _p_glow_Blind();
    _p_glow_observe(obj);
    await pline(`${Yobjnam2(obj, Blind ? 'vibrate' : 'glow')} feebly${Blind ? '' : ' '}${Blind ? '' : _p_glow_color(color)} for a moment.`);
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
            await wand_explode(obj, rnd(lim));
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
                await wand_explode(obj, 1);
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
// C ref: nethack-c/src/read.c:330 doread() and src/spell.c:468 study_book().
//
// Scope: only the "spellbook already known + Refresh prompt" branch is ported;
// Other doread branches (scrolls, T-shirt, credit card, blank, level filter,
// ─────────────────────────────────────────────────────────────────────────────
import { flush_screen, docrt, cls, under_water, under_ground, newsym, terrain_glyph, occupation_force_more, force_more, map_trap, map_engraving, map_object, unmap_object, show_glyph_cell, update_lastseentyp, GLYPHCLS_TRAP, GLYPHCLS_OBJ, GLYPHCLS_CMAP, GLYPHCLS_ENGR } from './display.js';
import { t_at } from './trap.js';
import { oc_merge as oc_merge_rd } from './oc_merge.generated.js';
import { NUMMONS } from './pm.generated.js';
import { engr_at } from './mklev.js';
/* C detect.c:1418 room_discovered() lives in dungeon.c; this port hosts the
 * dungeon.c #overview block in js/cmd.js. */
import { room_discovered, browse_map, body_part as food_body_part,
         snuff_lit as snuff_lit_real } from './cmd.js';
import { nhgetch } from './input.js';
import { study_book_learn } from './spell.js';
import { exercise } from './attrib.js';
import { study_book_dull } from './spell.js';
import { cansee, unblock_point } from './vision.js';
import { cvt_sdoor_to_door } from './dig.js';
import { COLNO, ROWNO, SDOOR, CORR, SCORR, ROOM, SVALL, IS_FURNITURE, TER_DETECT, TER_OBJ, TER_MON, TER_TRP, TER_MAP, Has_contents, u_at, NOSE } from './const.js';
import { BLINDED, CONFUSION, HALLUC, HALLUC_RES, INVIS, SEE_INVIS } from './const.js';
/* make_confused's C home is potion.c:88; this file's private copy wrote a flat
 * `game.HConfusion` that only its own readers consulted. */
import { make_confused } from './potion.js';
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
import { KILLED_BY_AN } from './const.js';
import { shkname, losehp } from './dokick.js';
import { Yname2, useup as useup_cmd } from './cmd.js';
import { erosion_matters, mkobj, place_object, makemon } from './mklev.js';
/* seffect_light's confused arm only (read.c:1762-1780). */
import { initedog, tamedog } from './dog.js';
import { setmangry } from './mklev.js';
import { isok } from './const.js';
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
import { GETOBJ_PROMPT, GETOBJ_ALLOWCNT, TIMEOUT, STUNNED } from './const.js';
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
import { resist } from './zap.js';
/* C read.c:364-556's non-scroll readable ladder needs these; all are hoisted
 * `export function`s, so the js/mklev.js and js/objnam.js cycles resolve. */
import { create_gas_cloud } from './region.js';
import { bcsign, upwords, outrumor, BY_COOKIE, wipeout_text } from './mklev.js';
import { singular } from './objnam.js';
import { You_cant, getobj_cmdq_drain } from './cmd.js';
import { GETOBJ_EXCLUDE, GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE_SELECTABLE } from './const.js';
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
import { mksobj as mksobj_er, wake_nearto as wake_nearto_er } from './mklev.js';
import { flooreffects as flooreffects_er, ceiling as ceiling_er } from './cmd.js';
import { stackobj as stackobj_er } from './sp_lev.js';
import { killed as killed_er, wakeup as wakeup_er } from './mhitm.js';
import { mondied as mondied_er } from './makemon.js';
import { dmgval as dmgval_er } from './uhitm.js';
import { doname as doname_er, xname as xname_er } from './objnam.js';
import { hard_helmet as hard_helmet_er } from './do_wear.js';
import { sokoban_guilt as sokoban_guilt_er } from './trap.js';
import { map_invisible as map_invisible_er } from './display.js';
import { In_quest as In_quest_er, In_endgame as In_endgame_er, Is_earthlevel as Is_earthlevel_er, PASSES_WALLS as PASSES_WALLS_er, HALF_PHDAM as HALF_PHDAM_er, AIR as AIR_ER, DOOR as DOOR_ER, D_CLOSED as D_CLOSED_ER, D_LOCKED as D_LOCKED_ER, HEAD as HEAD_ER, DEAF as DEAF_ER, IS_OBSTRUCTED, W_ARMH as W_ARMH_ER } from './const.js';
import { mon_nam as mon_nam_er } from './uhitm.js';
import { obfree as obfree_er } from './shk.js';
import { do_genocide, do_class_genocide } from './sit.js';
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
import { s_suffix, y_monnam, hcolor as hcolor_real } from './mhitm.js';
import { Is_waterlevel, Is_rogue_level, ROOMOFFSET, STOMACH } from './const.js';
import { do_clear_area, vision_recalc } from './vision.js';
import { dmgtype } from './dogmove.js';
/* observe_object (C o_init.c:442) is already ported once, in js/cmd.js — import
 * that single copy rather than re-deriving its dknown/discover_object work.
 * js/display.js also declares a private `observe_object`, but that one is a
 * bare `obj.dknown = 1` with neither the FIRST_OBJECT nor the Hallucination
 * guard, so it is NOT the copy to wire. */
import { getObjFromGetobj, observe_object, level_tele, getobj_redo_menu, check_capacity, getpos } from './cmd.js';
/* C teleport.c:844 scrolltele() — the non-confused, non-cursed arm of
 * seffect_teleportation (read.c:1796). */
import { scrolltele } from './teleport.js';
import { explode as explode_fr } from './zap.js';
import { EXPL_FIERY as EXPL_FIERY_FR, PLNMSG_TOWER_OF_FLAME as PLNMSG_TOWER_OF_FLAME_FR,
         HAND as HAND_FR, HEAD as HEAD_FR, M_SEEN_FIRE as M_SEEN_FIRE_FR, FIRE_RES as FIRE_RES_FR,
         ACCESSIBLE as ACCESSIBLE_FR } from './const.js';
import { burn_away_slime as burn_away_slime_fr, monstseesu as monstseesu_fr,
         monstunseesu as monstunseesu_fr } from './mcastu.js';
import { losehp as losehp_fr, delobj as delobj_rd } from './dokick.js';
import { shieldeff as shieldeff_fr } from './display.js';
import { is_pool_or_lava as is_pool_or_lava_fr } from './look.js';
import { hliquid as hliquid_fr } from './mhitm.js';
import { body_part as body_part_fr } from './cmd.js';

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

async function topline_more_loop(msg) {
    const g = game;
    const full = msg + '--More--';
    g._pending_message = full;
    await flush_screen(1);
    /* Cursor just past end of "--More--" (col = msg.length + 8). */
    set_cursor(full.length, 0);
    while (true) {
        const key = await nhgetch();
        if (key === 32 /* space */ || key === 10 /* \n */ ||
            key === 13 /* \r */    || key === 27 /* ESC */) {
            return key;
        }
        g._pending_message = full;
        await flush_screen(1);
        set_cursor(full.length, 0);
    }
}

async function study_book_already_known(spellName) {
    const g = game;
    const msg = `You know "${spellName}" quite well already.`;
    /* C ref: pline + tty more() chain — pline sets the topline; the subsequent
     * y_n in C calls topl.c more() to clear the line.  Mirror that loop. */
    await topline_more_loop(msg);
    const ynPrompt = 'Refresh your memory anyway? [yn] (n)';
    let refresh = false;
    while (true) {
        g._pending_message = ynPrompt;
        await flush_screen(1);
        set_cursor(ynPrompt.length + 1, 0); /* C TTY: cursor past prompt + trailing space */
        const key = await nhgetch();
        const c = String.fromCharCode(key);
        if (c === '\x1b') break;                          /* ESC → default 'n' */
        if (c === '\r' || c === '\n' || c === ' ') break; /* activator → default 'n' */
        const lc = c.toLowerCase();
        if (lc === 'y' || lc === 'n') {                   /* valid yn answer */
            refresh = (lc === 'y');                       /* spell.c:571 only 'n' returns 0 */
            break;
        }
        /* invalid key: tty_yn_function loops and re-reads; prompt persists */
    }
    if (refresh) return true;   /* spell.c:571-573: 'y' falls through to the study below */
    g._pending_message = ynPrompt;
    return false;
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
    /* C ref: spell.c:474-493 — dull-book sleep check, BEFORE the already-known test. */
    if (await study_book_dull(spellbook)) {
        g.context = g.context || {};
        g.context.move = 1;
        return true;
    }
    /* C ref: spell.c:506-510 — SPE_BLANK_PAPER: message, makeknown, return 1.
     * (The resume-after-interrupt test at 496-500 excludes blank paper, so
     * this arm is always reached.) */
    if (booktype === 407 /* SPE_BLANK_PAPER */) {
        await pline('This spellbook is all blank.');
        _makeknown(booktype);
        g.context = g.context || {};
        g.context.move = 1;
        return true;
    }
    /* C ref: spell.c:512-536 — 3.6 tribute: reading a novel. */
    if (booktype === 408 /* SPE_NOVEL */) {
        const { noveltitle, read_tribute } = await import('./do_name.js');
        const box = { value: (spellbook.novelidx ?? spellbook.corpsenm ?? -1) | 0 };
        const tribtitle = noveltitle(box);
        spellbook.novelidx = spellbook.corpsenm = box.value;
        if (await read_tribute('books', tribtitle, 0, null, spellbook.o_id)) {
            _bump_literate();
            _makeknown(booktype);
            const _u = g.u || (g.u = {});
            _u.uevent = _u.uevent || {};
            if (!_u.uevent.read_tribute) {
                const { record_achievement } = await import('./cmd.js');
                record_achievement(20 /* ACH_NOVL */);
                more_experienced(20, 0);
                const { newexplevel } = await import('./uhitm.js');
                await newexplevel();
                _u.uevent.read_tribute = 1;
            }
        }
        g.context = g.context || {};
        g.context.move = 1;
        return true;
    }
    /* C ref: spell.c:561 — find spell slot matching this book's otyp. */
    let sb = null;
    for (const s of spl_book) {
        if ((s.sp_id | 0) === booktype) { sb = s; break; }
    }
    if (sb && (sb.sp_know | 0) > 2000 /* KEEN/10 */) {
        const idx = booktype - _SPBOOK_FIRST_OTYP;
        const name = (idx >= 0 && idx < _SPBOOK_NAMES.length)
            ? _SPBOOK_NAMES[idx] : 'a spell';
        if (!(await study_book_already_known(name))) {
            g.context = g.context || {};
            g.context.move = 0; /* y_n-'n' → study_book returns 0 → ECMD_OK */
            return false;
        }
    }
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

    g._gk_known = false;

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

    const prompt = letters
        ? `What do you want to read? [${letters} or ?*]`
        : 'What do you want to read? [*]';
    /* C invent.c:1779-1825 — getobj FIRST drains the command queue
     * (cmdq_pop CQ_CANNED); a queued invlet answers the prompt and no prompt
     * is shown.  Queue empty -> fall through to the prompt below. */
    const _q = await getobj_cmdq_drain(
        (o) => !o ? GETOBJ_EXCLUDE
            : (_read_ok(o) ? GETOBJ_SUGGEST : GETOBJ_DOWNPLAY));
    if (!_q.drained) {
        g._pending_message = prompt;
        await flush_screen(1);
        set_cursor(prompt.length + 1, 0); /* TTY: cursor past prompt + trailing space */
    }

    const _isQuit = (k) => k === 27 /* ESC */ || k === 32 /* space */
        || k === 13 /* CR */ || k === 10 /* LF */;
    let keyCode = -1;
    let scroll = null;
    let cancelled = false;
    if (_q.drained) {
        if (_q.obj) { scroll = _q.obj; keyCode = scroll.invlet | 0; }
        else cancelled = true;
    }
    while (!_q.drained) {
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
        if (_isQuit(keyCode)) {
            await getobj_never_mind(prompt);
            cancelled = true;
            break;
        }
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
    /* C read.c:362 `scroll->pickup_prev = 0;` — reading clears the
     * just-picked-up mark from the whole stack (the remainder keeps none). */
    if (scroll) scroll.pickup_prev = 0;
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

    if (scroll && (scroll.oclass | 0) !== SCROLL_CLASS
        && (scroll.oclass | 0) !== SPBOOK_CLASS_OC) {
        await pline('That is a silly thing to read.');
        g.context = g.context || {};
        g.context.move = 0;
        await _clear_botl();
        return ECMD_OK;
    }
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
    if (scroll && (scroll.otyp | 0) === SCR_MAIL) {
        scroll._mail_confusion_override = true;   /* C read.c:581 confused = FALSE */
        const _lit = (game.u?.uconduct?.literate) | 0;
        if (!_lit && !(scroll.spe | 0)) {
            void 0;
        }
    }
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

function _can_chant() {
    /* C passes &gy.youmonst; replay state keeps the same form as game.youmonst. */
    return can_chant_real(game.youmonst || { m_id: 0, data: game.youmonst?.data });
}

async function trycall(obj) {
    const g = game;
    const otyp = obj.otyp | 0;
    const nameKnown = !!(g._oc_name_known && g._oc_name_known[otyp]);
    const hasUname = !!(g._oc_uname && g._oc_uname[otyp]);
    if (!nameKnown && !hasUname)
        await _docall_scroll(obj);
}

async function _docall_scroll(obj) {
    const g = game;
    if (!obj.dknown)
        return; /* C do_name.c:642 — probably blind */
    await flush_screen(1); /* C do_name.c:644 */
    /* C do_name.c:651: safe_qbuf(qbuf, "Call ", ":", obj, docall_xname, ...).
     * docall_xname (do_name.c:605) copies the object, forces quan=1 and clears
     * blessed/cursed, then returns an(xname(&otemp)); for a scroll xname() is
     * xname_scroll(). */
    let qname;
    if (obj.oclass === undefined || obj.oclass === SCROLL_CLASS_OC) {
        qname = xname_scroll({
            otyp: obj.otyp | 0, oclass: SCROLL_CLASS_OC, quan: 1,
            blessed: false, cursed: false,
            dknown: !!obj.dknown, bknown: !!obj.bknown,
            oname: undefined,
        });
    } else {
        /* docall_xname's otemp copy: no oextra, quan 1, not blessed/cursed;
         * the class-specific fixups (do_name.c:613-627) are irrelevant to
         * the callable classes that reach here. */
        qname = xname({ ...obj, oextra: undefined, oname: undefined,
                        quan: 1, blessed: false, cursed: false });
    }
    const qbuf = 'Call ' + an(qname) + ':';
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
function _get_obj_location_rd(obj) {
    if ((obj.where | 0) === 1)
        return { x: obj.ox | 0, y: obj.oy | 0 };
    if (_carried_or_worn_rd(obj))
        return { x: game.u?.ux | 0, y: game.u?.uy | 0 };
    return null;
}
function _shk_owns_rd(obj) {
    const loc = _get_obj_location_rd(obj);
    if (loc && (obj.unpaid
                || ((obj.where | 0) === 1 && !obj.no_charge
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

/* C ref: read.c:3066 unpunish().  delobj(chain) runs delobj_core's
 * obj_resists(chain, 0, 0) — one rn2(100) — before the extract (invent.c:1446).
 * js/dig.js's unpunish skips that draw, so this local body follows C. */
async function unpunish_rd() {
    const savechain = game.u?.uchain;
    setworn_bc(null, W_CHAIN);                          /* sets 'uchain' to Null */
    if (savechain)
        await delobj_rd(savechain);
    setworn_bc(null, W_BALL);                           /* sets 'uball' to Null */
}

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
    }
    if (_Punished() && !confused)
        await unpunish_rd();                            /* C read.c:1600 */
    /* C read.c:1602-1605 — buried-ball trap release.  u.utraptype TT_BURIEDBALL
     * is not modelled on this path; no RNG. */
    /* C read.c:1607 update_inventory() — display only, no RNG. */
}

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
            const atmp = await getObjFromGetobj('destroy', any_worn_armor_ok, GETOBJ_PROMPT);
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

function _check_map_spot_rd(x, y, oclass) {
    const g = game;
    const loc = g.level && g.level.at ? g.level.at(x, y) : null;
    const rg = loc && loc.remembered_glyph;
    if (!rg || rg.cls !== GLYPHCLS_OBJ)
        return false;
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

/* ── gold_detect (detect.c:341-475, scroll arm of read.c:2035-2043) ──────────
 * Only the NON-confused, NON-cursed arm is ported; seffect_gold_detection's
 * (confused || scursed) ? trap_detect(sobj) arm is still unported and falls
 * through silently as before.  check_map_spot's glyph decode uses the rendered
 * '$' symbol for COIN_CLASS (same approximation as _check_map_spot_rd). */
import { hidden_gold as hidden_gold_gd } from './vault.js';
import { money_cnt as money_cnt_gd } from './com_pager.js';
import { findgold as findgold_gd } from './makemon.js';
import { x_monnam as x_monnam_gd } from './mhitm.js';
import { currency as currency_gd } from './shk.js';
import { ARTICLE_THE as ARTICLE_THE_GD, ARTICLE_YOUR as ARTICLE_YOUR_GD,
         SUPPRESS_SADDLE as SUPPRESS_SADDLE_GD } from './const.js';
import { MKOBJ_OC_MATERIAL as MKOBJ_OC_MATERIAL_GD } from './mkobj_erosion_meta.js';
import { FOOT as FOOT_GD, TOE as TOE_RD, D_TRAPPED as D_TRAPPED_RD, otrapped_of } from './const.js';
import { PM_GOLD_GOLEM as PM_GOLD_GOLEM_GD } from './pm.generated.js';
const COIN_CLASS_GD = 12, GOLD_MAT_GD = 15, GOLD_PIECE_GD = 438;
function _oc_material_gd(o) { return MKOBJ_OC_MATERIAL_GD[o.otyp | 0] | 0; }
/* C detect.c:229-246 o_material() */
function o_material_gd(obj, material) {
    if (_oc_material_gd(obj) === material)
        return obj;
    if (Has_contents(obj)) {
        for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) {
            if (_oc_material_gd(otmp) === material)
                return otmp;
            else if (Has_contents(otmp)) {
                const temp = o_material_gd(otmp, material);
                if (temp) return temp;
            }
        }
    }
    return null;
}
/* C detect.c:262-306 check_map_spot(x, y, COIN_CLASS, material) */
function _check_map_spot_gd(x, y, material) {
    const g = game;
    const loc = g.level && g.level.at ? g.level.at(x, y) : null;
    const rg = loc && loc.remembered_glyph;
    if (!rg || rg.cls !== GLYPHCLS_OBJ || rg.ch !== '$')
        return false;
    const here = g.level.levelObjects?.[x]?.[y] ?? null;
    if (material) {
        for (let o = here; o; o = o.nexthere)
            if (o_material_gd(o, GOLD_MAT_GD)) return false;
        const mt = m_at(x, y);
        if (mt) for (let o = mt.minvent; o; o = o.nobj)
            if (o_material_gd(o, GOLD_MAT_GD)) return false;
        return true;
    }
    for (let o = here; o; o = o.nexthere)
        if (o_in_rd(o, COIN_CLASS_GD)) return false;
    const mt = m_at(x, y);
    if (mt) for (let o = mt.minvent; o; o = o.nobj)
        if (o_in_rd(o, COIN_CLASS_GD)) return false;
    return true;
}
function _clear_stale_map_gd(material) {
    let change_made = false;
    for (let zx = 1; zx < COLNO; zx++)
        for (let zy = 0; zy < ROWNO; zy++)
            if (_check_map_spot_gd(zx, zy, material)) {
                unmap_object(zx, zy);
                change_made = true;
            }
    return change_made;
}
/* C detect.c:341-475 gold_detect(sobj): returns 1 if nothing was detected. */
async function gold_detect(sobj) {
    const g = game, u = g.u || {};
    let temp = null, ugold = false, steedgold = false;
    let ter_typ = TER_DETECT | TER_OBJ;
    const blessed = !!sobj.blessed;
    const stale = _clear_stale_map_gd(blessed ? GOLD_MAT_GD : 0);
    g._gk_known = stale;
    let outgoldmap = false;

    for (let mtmp = g.fmon; mtmp && !outgoldmap; mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1 || (mtmp.isgd && !mtmp.mx)) continue;
        if (findgold_gd(mtmp.minvent) || (mtmp.mnum | 0) === PM_GOLD_GOLEM_GD) {
            if (mtmp === u.usteed) steedgold = true;
            else { g._gk_known = true; outgoldmap = true; }
        } else {
            for (let obj = mtmp.minvent; obj && !outgoldmap; obj = obj.nobj)
                if ((blessed && o_material_gd(obj, GOLD_MAT_GD))
                    || o_in_rd(obj, COIN_CLASS_GD)) {
                    if (mtmp === u.usteed) steedgold = true;
                    else { g._gk_known = true; outgoldmap = true; }
                }
        }
    }
    if (!outgoldmap) {
        for (let obj = g.fobj; obj; obj = obj.nobj) {
            if (blessed && o_material_gd(obj, GOLD_MAT_GD)) {
                g._gk_known = true;
                if ((obj.ox | 0) !== (u.ux | 0) || (obj.oy | 0) !== (u.uy | 0)) { outgoldmap = true; break; }
            } else if (o_in_rd(obj, COIN_CLASS_GD)) {
                g._gk_known = true;
                if ((obj.ox | 0) !== (u.ux | 0) || (obj.oy | 0) !== (u.uy | 0)) { outgoldmap = true; break; }
            }
        }
    }

    if (!outgoldmap) {
        if (!g._gk_known) {
            let buf;
            if ((u.umonnum | 0) === PM_GOLD_GOLEM_GD && u.umonnum != null)
                buf = `You feel like a million ${currency_gd(2)}!`;
            else if (money_cnt_gd(g.invent) || hidden_gold_gd(true))
                buf = 'You feel worried about your future financial situation.';
            else if (steedgold)
                buf = `You feel interested in ${s_suffix(x_monnam_gd(u.usteed,
                    u.usteed.mtame ? ARTICLE_YOUR_GD : ARTICLE_THE_GD, null,
                    SUPPRESS_SADDLE_GD, false))} financial situation.`;
            else
                buf = 'You feel materially poor.';
            await _strange_feeling(sobj, buf);
            return 1;
        }
        if (stale) await docrt();
        await You('notice some gold between your %s.', makeplural(food_body_part(FOOT_GD)));
        return 0;
    }

    /* outgoldmap: */
    if (g._pending_message) await force_more(g._pending_message);
    await cls();
    const wasConstrained = unconstrain_map_rd();
    try {
        for (let obj = g.fobj; obj; obj = obj.nobj) {
            if (blessed && (temp = o_material_gd(obj, GOLD_MAT_GD)) != null) {
                if (temp !== obj) { temp.ox = obj.ox; temp.oy = obj.oy; }
                map_object(temp, 1);
            } else if ((temp = o_in_rd(obj, COIN_CLASS_GD)) != null) {
                if (temp !== obj) { temp.ox = obj.ox; temp.oy = obj.oy; }
                map_object(temp, 1);
            }
            if (temp && u_at(temp.ox | 0, temp.oy | 0)) ugold = true;
        }
        for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
            if ((mtmp.mhp | 0) < 1 || (mtmp.isgd && !mtmp.mx)) continue;
            temp = null;
            if (findgold_gd(mtmp.minvent) || (mtmp.mnum | 0) === PM_GOLD_GOLEM_GD) {
                const gold = { otyp: GOLD_PIECE_GD, oclass: COIN_CLASS_GD, quan: rnd(10),
                               ox: mtmp.mx, oy: mtmp.my, o_id: 0, nobj: null, cobj: null };
                map_object(gold, 1);
                temp = gold;
            } else {
                for (let obj = mtmp.minvent; obj; obj = obj.nobj)
                    if (blessed && (temp = o_material_gd(obj, GOLD_MAT_GD)) != null) {
                        temp.ox = mtmp.mx; temp.oy = mtmp.my;
                        map_object(temp, 1);
                        break;
                    } else if ((temp = o_in_rd(obj, COIN_CLASS_GD)) != null) {
                        temp.ox = mtmp.mx; temp.oy = mtmp.my;
                        map_object(temp, 1);
                        break;
                    }
            }
            if (temp && u_at(temp.ox | 0, temp.oy | 0)) ugold = true;
        }
        if (!ugold) {
            newsym(u.ux | 0, u.uy | 0);
            ter_typ |= TER_MON;
        }
        await You_feel('very greedy, and sense gold!');
        exercise(2 /* A_WIS */, true);

        await browse_map_rd(ter_typ, 'gold');

        await map_redisplay_rd();
    } finally {
        if (wasConstrained && (g.iflags?.save_uinwater
                               || g.iflags?.save_uburied
                               || g.iflags?.save_uswallow))
            reconstrain_map_rd();
    }
    return 0;
}

/* C ref: read.c:2035-2043 seffect_gold_detection(&sobj) — gold_detect arm only;
 * the confused/cursed trap_detect arm is not ported (no-op, as before). */
async function seffect_gold_detection(sobjp) {
    const sobj = sobjp.obj;
    const scursed = !!sobj.cursed;
    const confused = _Confusion() !== 0;
    if ((confused || scursed) ? await trap_detect(sobj) : await gold_detect(sobj))
        sobjp.obj = null; /* failure: strange_feeling() -> useup() */
}

/* C detect.c:907-953 detect_obj_traps(list, FALSE, 0, NULL): OTRAP_NONE=0,
 * OTRAP_HERE=1, OTRAP_THERE=2.  Only the show_them == FALSE scan is ported. */
function _detect_obj_traps_scan(objlist, show_them = false, how = 0) {
    const u = game.u || {};
    let result = 0;
    for (let otmp = objlist; otmp; otmp = otmp.nobj) {
        const isbox = (otmp.otyp | 0) === 214 || (otmp.otyp | 0) === 215;
        if (isbox && otrapped_of(otmp)) {
            otmp.tknown = 1; /* C detect.c:934 */
            const x = otmp.ox | 0, y = otmp.oy | 0;
            result |= (x === (u.ux | 0) && y === (u.uy | 0)) ? 1 : 2;
            if (show_them) /* C detect.c:938-942: dummytrap.ttyp == TRAPPED_CHEST */
                _sense_trap({ tx: x, ty: y, ttyp: TRAPPED_CHEST_RD }, x, y, how);
        }
        if (Has_contents(otmp))
            result |= _detect_obj_traps_scan(otmp.cobj, show_them, how);
    }
    return result;
}

const FIRST_OBJECT_RD = 18; /* display.c's FIRST_OBJECT; see js/display.js random_object */
const TRAPPED_CHEST_RD = 25, TRAPPED_DOOR_RD = 24;
/* C detect.c:863-896 sense_trap(trap, x, y, src_cursed).  Records whether the
 * sensed spot is the hero's (stands in for display_trap_map's
 * glyph_at(u.ux, u.uy) test: cls() cleared the glyph buffer).  The
 * hallucinated otyp is the rn2 random_object(); oc_merge from the generated table. */
function _sense_trap(trap, x, y, src_cursed) {
    const u = game.u || {};
    let atHero;
    if (_Hallucination() || src_cursed) {
        const ox = trap ? trap.tx : x, oy = trap ? trap.ty : y;
        const obj = { otyp: GOLD_PIECE_GD, oclass: COIN_CLASS_GD, ox, oy,
                      o_id: 0, nobj: null, cobj: null };
        /* C detect.c:878-881: otyp, then quan, then corpsenm = random_monster(rn2) */
        if (_Hallucination())
            obj.otyp = rn2(MKOBJ_OC_CLASS.length - FIRST_OBJECT_RD) + FIRST_OBJECT_RD;
        obj.quan = (obj.otyp === GOLD_PIECE_GD) ? rnd(10)
                   : oc_merge_rd(obj.otyp) ? rnd(2) : 1;
        obj.corpsenm = rn2(NUMMONS);
        map_object(obj, 1);
        atHero = ox === (u.ux | 0) && oy === (u.uy | 0);
    } else {
        map_trap(trap, 1);
        trap.tseen = 1;
        atHero = trap.tx === (u.ux | 0) && trap.ty === (u.uy | 0);
    }
    if (atHero) game._sensed_at_hero = true;
}

/* C detect.c:956-1003 display_trap_map(cursed_src) */
async function display_trap_map(cursed_src) {
    const g = game, u = g.u || {};
    let ter_typ = TER_DETECT | (cursed_src ? TER_OBJ : TER_TRP);
    if (g._pending_message) await force_more(g._pending_message);
    await cls();
    const wasConstrained = unconstrain_map_rd();
    g._sensed_at_hero = false;
    try {
        _detect_obj_traps_scan(g.level?.buriedobjlist, true, cursed_src);
        _detect_obj_traps_scan(g.fobj, true, cursed_src);
        for (let mon = g.fmon; mon; mon = mon.nmon) {
            if ((mon.mhp | 0) < 1 || (mon.isgd && !mon.mx)) continue;
            _detect_obj_traps_scan(mon.minvent, true, cursed_src);
        }
        _detect_obj_traps_scan(g.invent, true, cursed_src);
        for (let t = g.ftrap; t; t = t.ntrap)
            _sense_trap(t, 0, 0, cursed_src);
        const doors = g.level?.doors || [];
        for (let d = 0; d < (g.level?.doorindex | 0) && d < doors.length; d++) {
            const cc = doors[d];
            const loc = g.level.at ? g.level.at(cc.x, cc.y) : null;
            if (!loc || (loc.typ | 0) === SDOOR) continue;
            if ((loc.doormask | 0) & D_TRAPPED_RD)
                _sense_trap({ tx: cc.x, ty: cc.y, ttyp: TRAPPED_DOOR_RD }, cc.x, cc.y, cursed_src);
        }
        if (!g._sensed_at_hero) {
            newsym(u.ux | 0, u.uy | 0);
            ter_typ |= TER_MON;
        }
        await You_feel(cursed_src ? 'very greedy.' : 'entrapped.');
        await browse_map_rd(ter_typ, cursed_src ? 'gold' : 'trap of interest');
        await map_redisplay_rd();
    } finally {
        if (wasConstrained && (g.iflags?.save_uinwater
                               || g.iflags?.save_uburied
                               || g.iflags?.save_uswallow))
            reconstrain_map_rd();
    }
}

/* C detect.c:1010-1077 trap_detect(sobj): returns 1 if nothing was detected.
 * The display arm is display_trap_map above. */
export async function trap_detect(sobj) {
    const g = game, u = g.u || {};
    let found = false;
    const cursed_src = sobj && sobj.cursed ? 1 : 0;
    if (u.usteed) { u.usteed.mx = u.ux; u.usteed.my = u.uy; }
    for (let t = g.ftrap; t; t = t.ntrap) {
        if ((t.tx | 0) !== (u.ux | 0) || (t.ty | 0) !== (u.uy | 0))
        { await display_trap_map(cursed_src); return 0; }
        found = true;
    }
    const lists = [g.fobj, g.level?.buriedobjlist];
    for (let mon = g.fmon; mon; mon = mon.nmon) {
        if ((mon.mhp | 0) < 1 || (mon.isgd && !mon.mx)) continue;
        lists.push(mon.minvent);
    }
    for (const l of lists) {
        const tr = _detect_obj_traps_scan(l);
        if (tr & 2) { await display_trap_map(cursed_src); return 0; }
        if (tr) found = true;
    }
    if (_detect_obj_traps_scan(g.invent)) found = true;
    const doors = g.level?.doors || [];
    for (let d = 0; d < (g.level?.doorindex | 0) && d < doors.length; d++) {
        const cc = doors[d];
        const loc = g.level.at ? g.level.at(cc.x, cc.y) : null;
        if (!loc || (loc.typ | 0) === SDOOR) continue;
        if ((loc.doormask | 0) & D_TRAPPED_RD) {
            if (cc.x !== (u.ux | 0) || cc.y !== (u.uy | 0))
            { await display_trap_map(cursed_src); return 0; }
            found = true;
        }
    }
    if (!found) {
        await _strange_feeling(sobj, `Your ${makeplural(food_body_part(TOE_RD))} stop itching.`);
        return 1;
    }
    await Your('%s itch.', makeplural(food_body_part(TOE_RD)));
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

/* C read.c:687-724 charge_ok() — getobj classifier for the object to charge. */
function charge_ok(obj) {
    const MAGIC_LAMP = 228;
    if (!obj) return GETOBJ_EXCLUDE;
    if (obj.oclass === WAND_CLASS) return GETOBJ_SUGGEST;
    if (obj.oclass === RING_CLASS && obj.otyp >= RIN_BASE && obj.otyp <= RIN_LAST_CHARGED
        && obj.dknown && _oc_name_known(obj.otyp))
        return GETOBJ_SUGGEST;
    if (_is_weptool(obj)) return GETOBJ_EXCLUDE; /* specific check before general tools */
    if (obj.oclass === TOOL_CLASS) {
        if (obj.otyp === BRASS_LANTERN || obj.otyp === OIL_LAMP
            || (obj.otyp === MAGIC_LAMP && !_oc_name_known(MAGIC_LAMP)))
            return GETOBJ_SUGGEST;
        if (_tool_oc_charged(obj.otyp))
            return (obj.dknown && _oc_name_known(obj.otyp)) ? GETOBJ_SUGGEST : GETOBJ_DOWNPLAY;
        return GETOBJ_EXCLUDE;
    }
    return GETOBJ_EXCLUDE_SELECTABLE; /* weapons/armor: selectable for "feeling of loss" */
}
function _tool_oc_charged(otyp) {
    return otyp === BELL_OF_OPENING || otyp === MAGIC_MARKER || otyp === TINNING_KIT
        || otyp === EXPENSIVE_CAMERA || otyp === OIL_LAMP || otyp === BRASS_LANTERN
        || otyp === CRYSTAL_BALL || otyp === HORN_OF_PLENTY || otyp === BAG_OF_TRICKS
        || otyp === CAN_OF_GREASE || otyp === MAGIC_FLUTE || otyp === MAGIC_HARP
        || otyp === FROST_HORN || otyp === FIRE_HORN || otyp === DRUM_OF_EARTHQUAKE;
}

/* C read.c:1788-1827 seffect_charging(&sobj). */
async function seffect_charging(holder) {
    const sobj = holder.obj;
    const u = game.u;
    const sblessed = !!sobj.blessed, scursed = !!sobj.cursed;
    const confused = _uprop_on(CONFUSION);
    const already_known = (sobj.oclass | 0) === SPBOOK_CLASS || _oc_name_known(sobj.otyp);
    if (confused) {
        if (scursed) {
            await pline('You feel discharged.');
            u.uen = 0;
        } else {
            await pline('You feel charged up!');
            u.uen += d(sblessed ? 6 : 4, 4);
            if (u.uen > u.uenmax) u.uenmax = u.uen;
            else u.uen = u.uenmax;
        }
        game.disp.botl = true;
        return;
    }
    /* known = TRUE; -- handled inline here */
    if (!already_known) {
        await pline('This is a charging scroll.');
        learnscroll(sobj);
    }
    useup(sobj); /* so it is not in the getobj picklist */
    holder.obj = null;
    const otmp = await getObjFromGetobj('charge', charge_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT);
    if (otmp) await recharge(otmp, scursed ? -1 : sblessed ? 1 : 0);
}

/* C ref: read.c:1080-1085 can_center_cloud (valid_cloud_pos: read.c:1069-1074) */
function can_center_cloud(x, y) {
    if (!isok(x, y)) return false;
    const typ = game.level?.at(x, y)?.typ;
    if (!(ACCESSIBLE_FR(typ) || is_pool_or_lava_fr(x, y))) return false;
    const u = game.u;
    const dx = u.ux - x, dy = u.uy - y;
    return !!cansee(x, y) && (dx * dx + dy * dy) < 32;
}

/* C ref: read.c:1864-1932 seffect_fire.  The getpos_sethilite() highlight
 * (display_stinking_cloud_positions) is cosmetic and not modelled. */
async function seffect_fire(holder) {
    const sobj = holder.obj;
    const g = game, u = g.u;
    const otyp = sobj.otyp | 0;
    const sblessed = !!sobj.blessed;
    const confused = _Confusion() !== 0;
    const already_known = _oc_name_known(otyp);
    const cc = { x: u.ux, y: u.uy };
    const cval = bcsign(sobj);
    let dam = Math.trunc((2 * (rn1(3, 3) + 2 * cval) + 1) / 3);
    useup(sobj);
    holder.obj = null; /* it's gone */
    if (!already_known)
        learnscrolltyp(SCR_FIRE);
    const underwater = !!u.uinwater;
    if (confused) {
        if (underwater) {
            await pline(`A little ${hliquid_fr('water')} around you vaporizes.`);
        } else if (_uprop_on(FIRE_RES_FR)) {
            shieldeff_fr(u.ux, u.uy);
            monstseesu_fr(M_SEEN_FIRE_FR);
            if (!_Blind())
                await pline(`Oh, look, what a pretty fire in your ${makeplural(body_part_fr(HAND_FR))}.`);
            else
                await pline(`You feel a pleasant warmth in your ${makeplural(body_part_fr(HAND_FR))}.`);
        } else {
            monstunseesu_fr(M_SEEN_FIRE_FR);
            await pline(`The scroll catches fire and you burn your ${makeplural(body_part_fr(HAND_FR))}.`);
            await losehp_fr(1, 'scroll of fire', 1 /* KILLED_BY_AN */);
        }
        return;
    }
    if (underwater) {
        await pline(`The ${hliquid_fr('water')} around you vaporizes violently!`);
    } else {
        if (sblessed) {
            if (!already_known)
                await pline('This is a scroll of fire!');
            dam *= 5;
            await pline('Where do you want to center the explosion?');
            await getpos(cc, true, 'the desired position');
            if (!can_center_cloud(cc.x, cc.y)) {
                /* try to reach too far, get burned */
                cc.x = u.ux;
                cc.y = u.uy;
            }
        }
        if (cc.x === u.ux && cc.y === u.uy) {
            await pline('The scroll erupts in a tower of flame!');
            g.iflags = g.iflags || {};
            g.iflags.last_msg = PLNMSG_TOWER_OF_FLAME_FR; /* for explode() */
            await burn_away_slime_fr();
        }
    }
    await explode_fr(cc.x, cc.y, 11 /* ZT_SPELL_O_FIRE */, dam, SCROLL_CLASS_OC, EXPL_FIERY_FR);
}

/* C ref: read.c:3082-3105 do_stinking_cloud */
async function do_stinking_cloud(sobj, mention_stinking) {
    const u = game.u;
    await pline(`Where do you want to center the ${mention_stinking ? 'stinking ' : ''}cloud?`);
    const cc = { x: u.ux, y: u.uy };
    if ((await getpos(cc, true, 'the desired position')) < 0) {
        await pline('Never mind.');
        return;
    } else if (!can_center_cloud(cc.x, cc.y)) {
        if (_Hallucination())
            await pline('Ugh... someone cut the cheese.');
        else
            await pline(`${sobj.oclass === SCROLL_CLASS_OC ? 'The scroll crumbles with' : 'You smell'} a whiff of rotten eggs.`);
        return;
    }
    create_gas_cloud(cc.x, cc.y, 15 + 10 * bcsign(sobj), 8 + 4 * bcsign(sobj));
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
    case SCR_TAMING:
    case SPE_CHARM_MONSTER:
        /* C read.c:2229-2231 seffect_taming(&sobj); never clears *sobjp. */
        await seffect_taming(sobj);
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
    case SCR_FIRE: {
        /* C read.c:2256-2258 seffect_fire(&sobj); it useup()s the scroll and
         * sets *sobjp = 0, so seffects returns 1 and read_scroll must not
         * useup again. */
        const holder = { obj: sobj };
        await seffect_fire(holder);
        if (!holder.obj) return 1;
        break;
    }
    case SCR_STINKING_CLOUD: {
        /* C read.c:1991-2002 seffect_stinking_cloud */
        const already_known = _oc_name_known(otyp);
        if (!already_known)
            await pline('You have found a scroll of stinking cloud!');
        game._gk_known = true;
        await do_stinking_cloud(sobj, already_known);
        break;
    }
    case SCR_GOLD_DETECTION: {
        /* C read.c:2250-2251 seffect_gold_detection(&sobj) */
        const holder = { obj: sobj };
        await seffect_gold_detection(holder);
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
    case SCR_CHARGING: {
        const holder = { obj: sobj };
        await seffect_charging(holder);
        if (!holder.obj) return 1;
        break;
    }
    case SCR_EARTH:
        /* C read.c:2260-2262 seffect_earth(&sobj).  Never clears *sobjp. */
        await seffect_earth(sobj);
        break;
    default:
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
const SCR_GOLD_DETECTION = 334;
const SCR_FOOD_DETECTION = 335;
const SPE_DETECT_FOOD = 383;
const SCR_IDENTIFY = 336;
const SPE_IDENTIFY = 397; /* objects.h spellbook block (magic mapping = 396) */
const SCR_TAMING = 330, SPE_CHARM_MONSTER = 387; /* objects.h */
const SCR_LIGHT = 332; /* objects.h scroll block; also used as -332 in js/mklev.js shop tables */
const SCR_AMNESIA = 338;
const SCR_CHARGING = 342;
const SCR_EARTH = 340; /* objects.h; matches js/makemon.js:3736 */
const ROCK_ER = 474, BOULDER_ER = 475; /* objects.h; matches js/dokick.js:1978 */
/* objects.h:1189 SCROLL("destroy armor", "JUYED AWK YACC", ...) — the row
 * immediately after "enchant armor" (SCR_ENCHANT_ARMOR = 323) in the same
 * SCROLL() block, so 324.  Cross-checks against the neighbours this file
 * already names: confuse monster 325, scare monster 326, enchant weapon 328. */
const SCR_DESTROY_ARMOR = 324;
/* objects.h scroll block; confirmed by js/oc_name_data.js[331] === 'genocide'. */
const SCR_GENOCIDE = 331;
const ALL_SPELLS = 0x2; /* bitmask for all spells; value doesn't matter since forget is stubbed */

/* C read.c:1044 maybe_tame — monster is hit by scroll of taming's effect */
async function maybe_tame(mtmp, sobj) {
    const was_tame = mtmp.mtame;
    const was_peaceful = mtmp.mpeaceful;

    if (sobj.cursed) {
        await setmangry(mtmp, false);
        if (was_peaceful && !mtmp.mpeaceful)
            return -1;
    } else {
        /* for a shopkeeper, tamedog() calls make_happy_shk() but does not
           tame the target, so call it even if taming gets resisted */
        if (!(await resist(mtmp, sobj.oclass, 0, NOTELL)) || mtmp.isshk)
            await tamedog(mtmp, sobj, false);

        if ((!was_peaceful && mtmp.mpeaceful) || was_tame !== mtmp.mtame)
            return 1;
    }
    return 0;
}

/* C read.c:1678 seffect_taming */
async function seffect_taming(sobj) {
    const g = game;
    const u = g.u;
    const confused = (_Confusion() !== 0);
    let candidates, results, vis_results;

    if (u.uswallow) {
        candidates = 1;
        results = vis_results = await maybe_tame(u.ustuck, sobj);
    } else {
        const bd = confused ? 5 : 1;

        /* maybe_tame() can return positive or negative, not both */
        candidates = results = vis_results = 0;
        for (let i = -bd; i <= bd; i++)
            for (let j = -bd; j <= bd; j++) {
                if (!isok(u.ux + i, u.uy + j))
                    continue;
                let mtmp = m_at(u.ux + i, u.uy + j);
                if (mtmp || (!i && !j && (mtmp = u.usteed))) {
                    ++candidates;
                    const res = await maybe_tame(mtmp, sobj);
                    results += res;
                    if (canspotmon(mtmp))
                        vis_results += res;
                }
            }
    }
    if (!results) {
        await pline(`Nothing interesting ${!candidates ? "happens" : "seems to happen"}.`);
    } else {
        await pline(`The neighborhood ${vis_results ? "is" : "seems"} ${(results < 0) ? "un" : ""}friendlier.`);
        if (vis_results > 0)
            g._gk_known = true;
    }
}

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

function impact_arti_light(otmp, flag, visible) { /* not yet ported */ }
import { light_hits_gremlin } from './cmd.js'; /* C uhitm.c:6425 — real body lives in cmd.js */
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
        move_bc(1, 0, u.uball.ox, u.uball.oy, u.uchain.ox, u.uchain.oy);

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
            move_bc(0, 0, u.uball.ox, u.uball.oy, u.uchain.ox, u.uchain.oy);
    }

    g.vision_full_recalc = 1;
    if (g.gremlins) {
        vision_recalc(0);
        do {
            const gremlin = g.gremlins;
            g.gremlins = gremlin.nxt;
            await light_hits_gremlin(gremlin.mon, rnd(5));
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
    const S_HUMAN_LIT = 53; /* defsym.h S_HUMAN; mons[].mlet is the numeric class */
    const youmlet = youdata ? youdata.mlet : S_HUMAN_LIT;
    if ((youmlet | 0) !== S_HUMAN_LIT || scursed) {
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
        g.u.umconf = ((g.u.umconf | 0) + (incr >>> 0)) >>> 0; /* unsigned; field starts undefined here */
    }
}

async function seffect_genocide(sobj) {
    const g = game;
    const otyp = sobj.otyp | 0;
    const already_known = (sobj.oclass | 0) === SPBOOK_CLASS || _oc_name_known(otyp);
    if (!already_known)
        await You('have found a scroll of genocide!');
    g._gk_known = true;
    /* C read.c:1737 — cursed/confused bits are encoded by the scroll state. */
    if (sobj.blessed)
        await do_class_genocide();
    else
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


/* C objects.h — the scroll block runs SCR_ENCHANT_ARMOR=323 .. SCR_STINKING_CLOUD
 * =343 (js/oc_name_data.js:341 is "punishment"). */
const SCR_PUNISHMENT = 341;
const SCR_STINKING_CLOUD = 343;
/* C objclass.h enum objclass_classes — confirmed against js/mkobj_data.js
 * MKOBJ_SVB_BASES: [15]=477 (HEAVY_IRON_BALL), [16]=478 (IRON_CHAIN). */
const BALL_CLASS = 15;
const CHAIN_CLASS = 16;
/* C objects.h */
const HEAVY_IRON_BALL = 477;
/* C obj.h:394 — WT_IRON_BALL_INCR, the per-repeat weight bump. */
const WT_IRON_BALL_INCR = 160;

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
const M1_AMORPHOUS_RD = 0x00000004, M1_UNSOLID_RD = 0x00100000; /* monflag.h:87,105 */
const S_VORTEX_RD = 23; /* monsym.h S_VORTEX; is_whirly = mlet == S_VORTEX || AIR_ELEMENTAL */
function _amorphous(d) { return ((d.mflags1 | 0) & M1_AMORPHOUS_RD) !== 0; }
function _unsolid(d) { return ((d.mflags1 | 0) & M1_UNSOLID_RD) !== 0; }
function _is_whirly(d) {
    return (d.mlet | 0) === S_VORTEX_RD || (d.pmidx | 0) === PM_AIR_ELEMENTAL;
}

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
    /* C has no n == 0 early-out: rn2(0 + 1) still draws (spell.c:1778). */
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

async function seffect_identify(holder, otyp) {
    const g = game;
    const sobj = holder.obj;
    const is_scroll = (sobj.oclass | 0) === SCROLL_CLASS_OC;
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const confused = false;
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
            learnscrolltyp(SCR_IDENTIFY);
        }
        if (confused || (scursed && !already_known))
            return; /* C read.c:2080-2081 */
    }

    if (g.invent) {
        /* C read.c:2085-2092 */
        let cval = 1;
        if (sblessed || (!scursed && !rn2(5))) { /* read.c:2086 */
            cval = rn2(5);
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

async function _prinv_identify(obj) {
    const letter = obj.invlet ? String.fromCharCode(obj.invlet | 0) : '?';
    /* C invent.c:2875 prinv() -> xprname() -> doname(): the real namer, run on
     * the now-fully-identified object (BUC, enchantment, known type name). */
    const name = await doname_with_price(obj);
    await pline(`${letter} - ${name}.`);
}

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
    for (const o of eligible) { obj_to_glyph(o); entries.push({ obj: o, selected: false }); }
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
        set_cursor(WIN_COL + footer.length + (pageCount > 1 ? 0 : 1), footerRow);

        const k = await nhgetch();
        const kc = typeof k === 'number' ? k : (k?.charCodeAt(0) ?? 0);
        if (kc === 27 /* ESC */) { escaped = true; break; }
        /* RETURN / ENTER finishes the menu with current selections. */
        if (kc === 10 || kc === 13) break;
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
    const is_scroll = ((sobj.oclass | 0) === SCROLL_CLASS_OC);
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const confused = (_Confusion() !== 0);
    const nommap = !!g.level?.flags?.nommap;
    if (is_scroll) {
        if (nommap) { /* C read.c:2110-2118 */
            await Your('mind is filled with crazy lines!');
            if (_Hallucination())
                await pline('Wow!  Modern art.');
            else
                await Your('%s spins in bewilderment.', body_part_fr(HEAD_FR));
            await make_confused(_Confusion() + rnd(30), false);
            return;
        }
        if (sblessed) { /* C read.c:2120-2130 */
            for (let x = 1; x < COLNO; x++)
                for (let y = 0; y < ROWNO; y++) {
                    const lev = g.level?.at(x, y);
                    if (lev && lev.typ === SDOOR) {
                        cvt_sdoor_to_door(lev);
                        if (Is_rogue_level(g.u?.uz))
                            unblock_point(x, y);
                    }
                }
        }
        g._gk_known = true; /* C read.c:2134 gk.known = TRUE */
    }
    if (nommap) { /* C read.c:2137-2141 */
        await Your('%s spins as %s blocks the spell!', body_part_fr(HEAD_FR),
                   'something');
        await make_confused(_Confusion() + rnd(30), false);
        return;
    }
    /* C read.c:2143: pline("A map coalesces in your mind!"); */
    await pline('A map coalesces in your mind!');
    const cval = (scursed && !confused); /* C read.c:2144 */
    if (cval) game.u.uprops[CONFUSION].intrinsic = 1; /* HConfusion = 1 to screw up map */
    await do_mapping();
    if (cval) {
        game.u.uprops[CONFUSION].intrinsic = 0; /* restore */
        await pline("Unfortunately, you can't grasp the details.");
    }
}

export function magic_map_background(loc, x, y) {
    if (!loc) return;
    const tg = terrain_glyph(loc, x, y);
    let rg = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
    /* C: if (!cansee(x,y) && !lev->waslit) — dark-room / dark-corridor correction. */
    if (!cansee(x, y) && !loc.waslit) {
        if (loc.typ === ROOM && rg.ch === '.' && !rg.decgfx && rg.color === NO_COLOR) {
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
        unblock_point(x, y); /* C detect.c:1390 */
    }
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
    if (!cnf && (loc.roomno | 0) >= ROOMOFFSET)
        room_discovered((loc.roomno | 0) - ROOMOFFSET);
}

/* C ref: detect.c:1423 do_mapping() — reveal the whole level into memory, then
 * exercise(A_WIS).  cnf = Confusion (FALSE here).  After revealing, docrt()
 * re-renders the map from the freshly-set remembered glyphs. */
export async function do_mapping() {
    const g = game;
    const cnf = _Confusion(); /* C detect.c:1430 show_map_spot(zx, zy, Confusion) */
    /* C detect.c:1427 unconstrained = unconstrain_map() — an underwater / buried
     * / engulfed hero is brought out to the normal map first. */
    const unconstrained = unconstrain_map_rd();
    for (let zx = 1; zx < COLNO; zx++) {
        for (let zy = 0; zy < ROWNO; zy++) {
            const loc = g.level?.at(zx, zy);
            if (loc) show_map_spot(loc, zx, zy, cnf);
        }
    }
    if (!g.level?.flags?.hero_memory || unconstrained) {
        /* C detect.c:1432-1438 */
        await flush_screen(1);
        await browse_map_rd(TER_DETECT | TER_MAP | TER_TRP | TER_OBJ,
                            'anything of interest');
        await map_redisplay_rd();
    } else {
        reconstrain_map_rd();
    }
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

/* ── Scroll of earth (C read.c:1919-1971 seffect_earth, 2293-2420
 * drop_boulder_on_player / drop_boulder_on_monster) ───────────────────────── */
const M1_WALLWALK_ER = 0x00000008; /* monflag.h:88 */
const S_GHOST_ER = 54; /* monsym.h S_GHOST (v5); matches js/eat.js:991 */
function _has_ceiling_er(lev) {
    return !(In_endgame_er(lev) && !Is_earthlevel_er(lev));
}
function _hero_solid_er() {
    const d = game.youmonst?.data;
    if (!d) return true;
    return !_amorphous(d) && !_uprop_on(PASSES_WALLS_er)
        && (d.mlet | 0) !== S_GHOST_ER && !_unsolid(d);
}
function _mon_solid_er(d) {
    return !_amorphous(d) && !((d.mflags1 | 0) & M1_WALLWALK_ER)
        && (d.mlet | 0) !== S_GHOST_ER && !_unsolid(d);
}
async function seffect_earth(sobj) {
    const g = game, u = g.u;
    const sblessed = !!sobj.blessed, scursed = !!sobj.cursed;
    const confused = _Confusion() !== 0;
    if (!Is_rogue_level(u.uz) && _has_ceiling_er(u.uz)
        && (!In_endgame_er(u.uz) || Is_earthlevel_er(u.uz))) {
        let nboulders = 0;
        if (u.uswallow) {
            await You_hear('rumbling.');
        } else if (!(In_quest_er(u.uz) || !_has_ceiling_er(u.uz))) {
            await pline(`The ${ceiling_er(u.ux, u.uy)} rumbles ${sblessed ? 'around' : 'above'} you!`);
        } else {
            const avalanche = 'avalanche';
            const matbuf = sblessed ? makeplural(avalanche) : an(avalanche);
            await pline(`${matbuf.charAt(0).toUpperCase() + matbuf.slice(1)} of boulders ${sblessed ? 'materialize' : 'materializes'} ${sblessed ? 'around' : 'above'} you!`);
        }
        g._gk_known = true;
        sokoban_guilt_er();
        if (!scursed) {
            for (let x = u.ux - 1; x <= u.ux + 1; x++) {
                for (let y = u.uy - 1; y <= u.uy + 1; y++) {
                    if (isok(x, y) && !closed_door_er(x, y)
                        && !IS_OBSTRUCTED(g.level.at(x, y).typ)
                        && !IS_AIR_ER(g.level.at(x, y).typ)
                        && (x !== u.ux || y !== u.uy)) {
                        if (await drop_boulder_on_monster(x, y, confused, true)) nboulders++;
                    }
                }
            }
        }
        if (!sblessed) {
            await drop_boulder_on_player(confused, !scursed, true, false);
        } else if (!nboulders) {
            await pline('But nothing else happens.');
        }
    }
}
const IS_AIR_ER = (typ) => (typ | 0) === AIR_ER;
function closed_door_er(x, y) {
    const t = game.level.at(x, y);
    return !!t && ((t.typ | 0) === DOOR_ER) && (((t.doormask | 0) & (D_CLOSED_ER | D_LOCKED_ER)) !== 0);
}
export async function drop_boulder_on_player(confused, helmet_protects, byu, skip_uswallow) {
    const g = game, u = g.u;
    if (u.uswallow && !skip_uswallow) {
        await drop_boulder_on_monster(u.ux, u.uy, confused, byu);
        return;
    }
    const otmp2 = await mksobj_er(confused ? ROCK_ER : BOULDER_ER, false, false);
    if (!otmp2) return;
    otmp2.quan = confused ? rn1(5, 2) : 1;
    otmp2.owt = weight(otmp2);
    let dmg;
    if (_hero_solid_er()) {
        await pline(`You are hit by ${await doname_er(otmp2)}!`);
        dmg = Math.trunc(dmgval_er(otmp2, g.youmonst) * otmp2.quan);
        if (u.uarmh && helmet_protects) {
            if (hard_helmet_er(u.uarmh)) {
                await pline('Fortunately, you are wearing a hard helmet.');
                if (dmg > 2) dmg = 2;
            } else if (g.flags?.verbose !== false) {
                await pline(`${await Yname2(u.uarmh)} does not protect you.`);
            }
        }
    } else
        dmg = 0;
    wake_nearto_er(u.ux, u.uy, 4 * 4);
    if (!(await flooreffects_er(otmp2, u.ux, u.uy, 'fall'))) {
        place_object(otmp2, u.ux, u.uy);
        await stackobj_er(otmp2);
        newsym(u.ux, u.uy);
    }
    if (dmg)
        await losehp(_uprop_on(HALF_PHDAM_er) ? Math.trunc((dmg + 1) / 2) : dmg, 'scroll of earth', KILLED_BY_AN);
}
export async function drop_boulder_on_monster(x, y, confused, byu) {
    const g = game, u = g.u;
    const otmp2 = await mksobj_er(confused ? ROCK_ER : BOULDER_ER, false, false);
    if (!otmp2) return false;
    otmp2.quan = confused ? rn1(5, 2) : 1;
    otmp2.owt = weight(otmp2);
    const mtmp = m_at(x, y);
    if (mtmp && _mon_solid_er(mtmp.data)) {
        const helmet = which_armor(mtmp, W_ARMH_ER);
        if (cansee(mtmp.mx, mtmp.my)) {
            await pline(`${Monnam(mtmp)} is hit by ${await doname_er(otmp2)}!`);
            if (mtmp.minvis && !canspotmon(mtmp))
                map_invisible_er(mtmp.mx, mtmp.my);
        } else if (u.uswallow && u.ustuck === mtmp) {
            await You_hear(`something hit ${s_suffix(mon_nam_er(mtmp))} ${mbodypart(mtmp, STOMACH)} over your ${body_part_fr(HEAD_ER)}!`);
        }
        let mdmg = dmgval_er(otmp2, mtmp) * otmp2.quan;
        if (helmet) {
            if (hard_helmet_er(helmet)) {
                if (canspotmon(mtmp))
                    await pline(`Fortunately, ${mon_nam_er(mtmp)} is wearing a hard helmet.`);
                else if (!_uprop_on(DEAF_ER))
                    await You_hear('a clanging sound.');
                if (mdmg > 2) mdmg = 2;
            } else if (canspotmon(mtmp)) {
                await pline(`${Monnam(mtmp)}'s ${xname_er(helmet)} does not protect ${mtmp.female ? 'her' : 'him'}.`);
            }
        }
        mtmp.mhp -= mdmg;
        if (mtmp.mhp <= 0) {
            if (byu) {
                await killed_er(mtmp);
            } else {
                await pline(`${Monnam(mtmp)} is killed.`);
                await mondied_er(mtmp);
            }
        } else {
            await wakeup_er(mtmp, byu);
        }
        wake_nearto_er(x, y, 4 * 4);
    } else if (mtmp && u.uswallow && u.ustuck === mtmp) {
        await obfree_er(otmp2, null);
        await drop_boulder_on_player(confused, true, false, true);
        return true;
    }
    if (!(await flooreffects_er(otmp2, x, y, 'fall'))) {
        place_object(otmp2, x, y);
        await stackobj_er(otmp2);
        newsym(x, y);
    }
    return true;
}
