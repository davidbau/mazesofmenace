// @ts-nocheck
// C ref: nethack-c-v5/upstream/src/worn.c — shared worn-gear bookkeeping.
import { game } from './gstate.js';
import { cancel_doff, is_elven_armor, oc_armcat } from './do_wear.js';
import { MKOBJ_OC_OPROP, MKOBJ_OC_MERGE } from './mkobj_erosion_meta.js';
import './trap.js';
import { is_weptool, monstunseesu } from './mhitm.js';
import { cvt_prop_to_mseenres, raceptr } from './mondata.js';
import { update_inventory } from './invent.js';
import { set_twoweap } from './wield.js';
import { set_artifact_intrinsic } from './artifact.js';
import { impossible } from './pline.js';
import { PM_MONK, PM_WIZARD, PM_HOBBIT } from './pm.generated.js';
import {
    W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU, W_ARMOR,
    W_RINGL, W_RINGR, W_WEP, W_SWAPWEP, W_QUIVER, W_AMUL, W_TOOL,
    W_BALL, W_CHAIN, W_SADDLE, I_SPECIAL, INVIS, CLAIRVOYANT, BLINDED,
} from './const.js';
import { ARMOR_DATA } from './armor_data.js'; // relocate-fns
import { instapetrify as instapetrify_real, obj_extract_self_general as obj_extract_self } from './cmd.js';
import { can_ride } from './steed.js';
import { set_msg_xy as set_msg_xy_trap } from './pline.js';
import { surface } from './dungeon.js';
import { Yname2 } from './objnam.js'; // relocate-fns
import { ACID_RES, ANTIMAGIC, COLD_RES, DISINT_RES, DISMOUNT_FELL, DISPLACED, FAST, FIRE_RES, FLYING, FUMBLING, JUMPING, LEVITATION, NON_PM, POISON_RES, PROTECTION, REFLECTING, SEE_INVIS, SHOCK_RES, SLEEP_RES, STEALTH, STONE_RES, TELEPAT, WWALKING } from './const.js'; // relocate-fns
import { canseemon, newsym } from './display.js'; // relocate-fns
import { obj_no_longer_held } from './do.js'; // relocate-fns
import { Mgender } from './do_name.js'; // relocate-fns
import { bimanual } from './do_wear.js'; // relocate-fns
import { dismount_steed } from './dog.js'; // relocate-fns
import { You } from './eat.js'; // relocate-fns
import { s_suffix as _s_suffix } from './hacklib.js'; // relocate-fns
import { arti_light_description, arti_light_radius } from './light.js';
import { artifact_light } from './artifact.js'; // relocate-fns
import { sliparm as sliparm_real } from './makemon.js';
import { check_gear_next_turn } from './mon.js';
import { pmname } from './do_name.js';
import { can_saddle } from './steed.js'; // relocate-fns
import { Monnam } from './mcastu.js'; // relocate-fns
import { hcolor, s_suffix } from './mhitm.js'; // relocate-fns
import { place_object } from './mkobj.js'; // relocate-fns
import { curse as _mdw_curse } from './mkobj.js'; // relocate-fns
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js'; // relocate-fns
import { breakarm, num_horns, pronoun_gender } from './mondata.js'; // relocate-fns
import { discover_object } from './o_init.js'; // relocate-fns
import { an, cloak_simple_name, distant_name, doname, otense, simpleonames } from './objnam.js'; // relocate-fns
import { You_hear, pline, pline_mon, impossible as trap_impossible } from './pline.js'; // relocate-fns
import { PM_AIR_ELEMENTAL, PM_CHICKATRICE, PM_COCKATRICE, PM_GRAY_DRAGON, PM_LONG_WORM } from './pm.generated.js'; // relocate-fns
import { rnl } from './rnd.js'; // relocate-fns
import { begin_burn, end_burn } from './timeout.js'; // relocate-fns
import { Monnam_t, OBJ_MINVENT_TR, _IMM_S_VORTEX, _MDW_MFAST, _MDW_MZ_HUMAN, _WORN_MZ_HUGE, _which_armor, selftouch_Stone_resistance, sgn } from './trap.js';
import { m_useup } from './mthrowu.js'; // relocate-fns
import { mon_nam } from './uhitm.js';
import { mwepgone } from './weapon.js'; // relocate-fns
import { cansee, vision_recalc } from './vision.js'; // relocate-fns
import { learnwand } from './zap.js'; // relocate-fns
import { impossible_sync } from './display.js'; // relocate-fns
import { is_youmonst } from './mhitm.js'; // relocate-fns
import { see_wsegs as see_wsegs_real } from './worm.js'; // relocate-fns

export function bypass_obj(obj) {
    // C body (worn.c:1118-1123):
    //     void bypass_obj(struct obj *obj) {
    //         obj->bypass = 1;
    //         svc.context.bypasses = TRUE;
    //     }
    // A pure in-place arg mutation (no RNG, no return). The observable effect
    // asserts it — the mapstate-only state_after_diff cannot see a per-arg
    // struct-field mutation. This is the proving case for that instrument.
    obj.bypass = 1;
    // svc.context.bypasses = TRUE (worn.c:1122). Modeled on game.context like
    // the other svc.context.* JS mirrors (js/dig.js / js/eat.js). Not in the
    game.context = game.context || {};
    game.context.bypasses = true;
}

/* C's struct obj ** entries are property names into the single hero record. */
const worn = [
    [W_ARM, 'uarm'], [W_ARMC, 'uarmc'], [W_ARMH, 'uarmh'],
    [W_ARMS, 'uarms'], [W_ARMG, 'uarmg'], [W_ARMF, 'uarmf'],
    [W_ARMU, 'uarmu'], [W_RINGL, 'uleft'], [W_RINGR, 'uright'],
    [W_WEP, 'uwep'], [W_SWAPWEP, 'uswapwep'], [W_QUIVER, 'uquiver'],
    [W_AMUL, 'uamul'], [W_TOOL, 'ublindf'], [W_BALL, 'uball'],
    [W_CHAIN, 'uchain'],
];
const WEAPON_CLASS = 2;
const MUMMY_WRAPPING = 138, CORNUTHAUM = 93;
const ART_EYES_OF_THE_OVERWORLD = 26;
const ARMOR_CLASS = 3, RING_CLASS = 4, AMULET_CLASS = 5, TOOL_CLASS = 6,
      FOOD_CLASS = 7, GEM_CLASS = 13, BALL_CLASS = 15, CHAIN_CLASS = 16;
const BLINDFOLD = 233, TOWEL = 234, LENSES = 232, TIN_OPENER = 239,
      SADDLE = 235, MEAT_RING = 270;

// C's u.uprops[] is zero-initialized, including the non-property entry 0.
function uprop(p) {
    const props = game.u.uprops ||= {};
    return props[p] ||= { intrinsic: 0, extrinsic: 0, blocked: 0 };
}

/* This only allows for one blocking item per property. */
function w_blocks(o, m) {
    return o.otyp === MUMMY_WRAPPING && (m & W_ARMC) ? INVIS
        : o.otyp === CORNUTHAUM && (m & W_ARMH)
          && game.urole.mnum !== PM_WIZARD ? CLAIRVOYANT
        : o.oartifact === ART_EYES_OF_THE_OVERWORLD && (m & W_TOOL) ? BLINDED
        : 0;
}

/* C worn.c:setworn. Only the real diagnostic can suspend this body. */
export async function setworn(obj, mask) {
    const u = game.u;
    let p;
    if ((mask & (W_ARM | I_SPECIAL)) === (W_ARM | I_SPECIAL)) {
        // Restoring saved game; no properties are conferred via skin.
        u.uskin = obj;
    } else {
        for (const [w_mask, slot] of worn) {
            if (w_mask & mask) {
                const oobj = u[slot];
                if (oobj && !(oobj.owornmask & w_mask))
                    await impossible('Setworn: mask=0x%08lx.', w_mask);
                if (oobj) {
                    if (u.twoweap && (oobj.owornmask & (W_WEP | W_SWAPWEP)))
                        set_twoweap(false);
                    oobj.owornmask &= ~w_mask;
                    if (w_mask & ~(W_SWAPWEP | W_QUIVER)) {
                        p = MKOBJ_OC_OPROP[oobj.otyp];
                        uprop(p).extrinsic &= ~w_mask;
                        monstunseesu(cvt_prop_to_mseenres(p));
                        if ((p = w_blocks(oobj, mask)) !== 0)
                            uprop(p).blocked &= ~w_mask;
                        if (oobj.oartifact)
                            await set_artifact_intrinsic(oobj, 0, mask);
                    }
                    cancel_doff(oobj, w_mask);
                }
                u[slot] = obj;
                if (obj) {
                    obj.owornmask |= w_mask;
                    if (w_mask & ~(W_SWAPWEP | W_QUIVER)) {
                        if (obj.oclass === WEAPON_CLASS || is_weptool(obj)
                            || mask !== W_WEP) {
                            p = MKOBJ_OC_OPROP[obj.otyp];
                            uprop(p).extrinsic |= w_mask;
                            if ((p = w_blocks(obj, mask)) !== 0)
                                uprop(p).blocked |= w_mask;
                        }
                        if (obj.oartifact)
                            await set_artifact_intrinsic(obj, 1, mask);
                    }
                }
            }
        }
        if (obj && (obj.owornmask & W_ARMOR))
            (u.uroleplay ||= {}).nudist = false;
        game.iflags.tux_penalty = !!(u.uarm && game.urole.mnum === PM_MONK
                                    && game.urole.spelarmr);
    }
    if ((game.flags.weaponstatus && (mask & W_WEP))
        || (game.flags.armorstatus && (mask & W_ARMOR)))
        game.disp.botl = true;
    update_inventory();
    recalc_telepat_range();
}

/* C worn.c:setnotworn — called when an object is destroyed or leaves inventory. */
export function setnotworn(obj) {
    const u = game.u;
    let p, unworn = 0;
    if (!obj)
        return;
    if (u.twoweap && (obj === u.uwep || obj === u.uswapwep))
        set_twoweap(false);
    for (const [w_mask, slot] of worn) {
        if (obj === u[slot]) {
            cancel_doff(obj, w_mask);
            u[slot] = null;
            unworn |= w_mask;
            p = MKOBJ_OC_OPROP[obj.otyp];
            uprop(p).extrinsic &= ~w_mask;
            monstunseesu(cvt_prop_to_mseenres(p));
            obj.owornmask &= ~w_mask;
            if (obj.oartifact)
                set_artifact_intrinsic(obj, 0, w_mask);
            if ((p = w_blocks(obj, w_mask)) !== 0)
                uprop(p).blocked &= ~w_mask;
        }
    }
    if (!u.uarm)
        game.iflags.tux_penalty = false;
    if ((game.flags.weaponstatus && (unworn & W_WEP))
        || (game.flags.armorstatus && (unworn & W_ARMOR)))
        game.disp.botl = true;
    update_inventory();
    recalc_telepat_range();
}

/* C worn.c:281-350 — possible equipment slots for ordinary item usage.
 * poly_obj (zap.c:1924-1929) preserves wielded/quivered non-weapons itself. */
export function wearslot(obj) {
    const otyp = obj.otyp;
    let res = 0;
    switch (obj.oclass) {
    case AMULET_CLASS:
        res = W_AMUL;
        break;
    case RING_CLASS:
        res = W_RINGL | W_RINGR;
        break;
    case ARMOR_CLASS:
        res = armcat_to_wornmask(oc_armcat(obj));
        break;
    case WEAPON_CLASS:
        res = W_WEP | W_SWAPWEP;
        if (MKOBJ_OC_MERGE[otyp])
            res |= W_QUIVER;
        break;
    case TOOL_CLASS:
        if (otyp === BLINDFOLD || otyp === TOWEL || otyp === LENSES)
            res = W_TOOL;
        else if (is_weptool(obj) || otyp === TIN_OPENER)
            res = W_WEP | W_SWAPWEP;
        else if (otyp === SADDLE)
            res = W_SADDLE;
        break;
    case FOOD_CLASS:
        if (otyp === MEAT_RING)
            res = W_RINGL | W_RINGR;
        break;
    case GEM_CLASS:
        res = W_QUIVER;
        break;
    case BALL_CLASS:
        res = W_BALL;
        break;
    case CHAIN_CLASS:
        res = W_CHAIN;
        break;
    }
    return res;
}

/* C worn.c:1359-1374 — raceptr handles the hero's polymorphed race. */
export function racial_exception(mon, obj) {
    const ptr = raceptr(mon);
    // Hobbits may wear elven armor; C defines no unacceptable exceptions.
    if (ptr.pmidx === PM_HOBBIT && is_elven_armor(obj))
        return 1;
    return 0;
}

/* find_mac(mon) = mon->data->ac  (worn.c:709, unarmored common case).
 * Per-mndx AC table, generated from monsters.h LVL(...ac...) — same table the
 * uhitm.js melee path uses.  Default 10 (easy to hit) for unmatched indices. */
const MONS_AC = [3,-1,3,3,4,-4,8,8,8,8,6,6,7,7,7,7,6,5,5,4,4,4,4,4,4,4,2,10,9,4,4,4,6,5,6,6,6,4,6,-10,2,-4,-2,10,10,5,10,10,5,0,7,6,2,7,2,5,8,8,8,10,10,10,6,8,7,7,7,9,9,9,10,10,10,10,10,10,5,10,3,0,0,7,0,4,2,6,5,5,7,7,6,6,0,0,3,3,4,3,3,3,6,2,2,2,5,4,0,2,2,2,2,2,5,5,5,6,9,-4,0,0,3,5,0,-4,-5,-6,8,7,6,6,4,3,2,2,2,2,2,2,2,2,2,2,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3,2,2,2,2,9,9,9,9,9,7,7,10,10,4,10,0,0,6,4,3,3,3,-3,6,-2,10,10,10,10,0,-2,-4,-6,6,6,5,5,4,4,4,3,6,6,6,6,4,2,2,0,5,3,4,8,8,6,6,3,3,2,-10,8,3,3,5,2,2,4,2,0,4,-4,2,1,0,-6,5,4,0,-2,6,6,5,6,6,6,10,10,9,9,9,8,6,10,6,4,10,10,8,6,6,4,9,7,5,1,3,10,10,10,10,10,10,10,10,10,10,5,0,10,10,0,10,7,10,10,0,10,10,10,10,2,-8,0,-5,10,-4,0,-5,2,0,-6,0,-2,-1,-4,-1,-3,4,-2,-7,-5,-6,-3,-2,-5,-7,-8,-5,-5,-5,10,4,6,4,2,-1,-3,6,8,8,7,7,6,6,5,-1,0,10,10,10,10,10,10,10,10,10,10,10,10,10,0,0,0,0,0,0,7,0,0,0,10,0,0,-2,0,0,0,-1,-10,-2,10,0,0,2,0,10,10,10,10,10,10,10,10,10,10,10,10,10,10];

/* C you.h:472 AC_MAX — abs(base) capped at 99 for monster AC too
 * (worn.c:733, "same cap as for hero [find_ac(do_wear.c)]"). */
const FIND_MAC_AC_MAX = 99;

/* C objects.h AMULET_OF_GUARDING otyp — worn.c:725 special-cases it to a
 * fixed -2, not impacted by erosion (unlike every other ARM_BONUS piece).
 * Same otyp value as js/trap.js:2100 _MDW_AMULET_OF_GUARDING /
 * js/do_wear.js AMULET_OF_GUARDING. */
const FIND_MAC_AMULET_OF_GUARDING = 210;

export function find_mac(mtmp) {
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    let base = (mtmp.data?.ac ?? ((mndx >= 0 && mndx < MONS_AC.length) ? MONS_AC[mndx] : 10)) | 0;
    const mwflags = (mtmp.misc_worn_check | 0);
    for (let obj = mtmp.minvent; obj; obj = obj.nobj) {
        if (((obj.owornmask | 0) & mwflags) !== 0) {
            if ((obj.otyp | 0) === FIND_MAC_AMULET_OF_GUARDING)
                base -= 2;
            else
                base -= _mdw_arm_bonus(obj);
        }
    }
    if (Math.abs(base) > FIND_MAC_AC_MAX)
        base = sgn(base) * FIND_MAC_AC_MAX;
    return base;
}

/* ── C mondata.h / obj.h predicates shared by m_dowear (C worn.c:757) and
 *    mon_break_armor (C worn.c:1177).  ONE module-scope definition on purpose:
 *    these used to be declared separately inside EACH of those two functions
 *    with divergent bodies (js-binding-audit `sibling-diff`), which is exactly
 *    how a flag fix gets applied to one twin and not the other.  Values mirror
 *    the already-audited copies in js/polyself.js:723-738.
 * ------------------------------------------------------------------------- */
const _WORN_M1_NOHANDS = 0x00002000;  /* C monflag.h:98  */

const _WORN_M1_SLITHY = 0x00080000;   /* C monflag.h:104 */

const _WORN_M1_HUMANOID = 0x00020000; /* C monflag.h:102 */

const _WORN_MZ_SMALL = 1;             /* C monflag.h:178 */

const _WORN_S_GHOST = 54;             /* C defsym.h:358  */

const _WORN_S_CENTAUR_W = 29;         /* C defsym.h:328  */

const _WORN_PM_WINGED_GARGOYLE = 42;  /* js/pm.generated.js */

const _WORN_PM_MARILITH = 294;        /* js/pm.generated.js */

/* C mondata.h:11 verysmall(ptr) = ((ptr)->msize < MZ_SMALL) */
function verysmall(data) { return (data.msize | 0) < _WORN_MZ_SMALL; }

/* C mondata.h:52 nohands(ptr) = (((ptr)->mflags1 & M1_NOHANDS) != 0L) */
function nohands(data) { return ((data.mflags1 | 0) & _WORN_M1_NOHANDS) !== 0; }

/* C mondata.h:67 slithy(ptr) = (((ptr)->mflags1 & M1_SLITHY) != 0L) */
function slithy(data) { return ((data.mflags1 | 0) & _WORN_M1_SLITHY) !== 0; }

/* C mondata.h:65 humanoid(ptr) = (((ptr)->mflags1 & M1_HUMANOID) != 0L) */
function _worn_humanoid(data) { return ((data.mflags1 | 0) & _WORN_M1_HUMANOID) !== 0; }

/* C mondata.h:31 noncorporeal(ptr) = ((ptr)->mlet == S_GHOST) */
function _worn_noncorporeal(data) { return (data.mlet | 0) === _WORN_S_GHOST; }

/* C obj.h:444-447 WrappingAllowed(mptr) — the FULL macro.  Both former copies
   tested only the msize range and dropped humanoid / noncorporeal / centaur /
   winged gargoyle / marilith. */
function WrappingAllowed(data) {
    return _worn_humanoid(data)
        && (data.msize | 0) >= _WORN_MZ_SMALL && (data.msize | 0) <= _WORN_MZ_HUGE
        && !_worn_noncorporeal(data) && (data.mlet | 0) !== _WORN_S_CENTAUR_W
        && (data.pmidx | 0) !== _WORN_PM_WINGED_GARGOYLE
        && (data.pmidx | 0) !== _WORN_PM_MARILITH;
}

function _worn_cantweararm(data) {
    return breakarm(data) || sliparm_real(data);
}

/* C ref: worn.c:748 m_dowear — equip a monster with appropriate worn items. */
export async function m_dowear(mon, creation) {
    /* local helpers mirroring C mondata.h macros that aren't yet ported.
       verysmall/nohands/slithy/WrappingAllowed live at module scope above —
       shared verbatim with mon_break_armor. */
    const S_MUMMY = 39;
    const PM_SKELETON = 248;
    const RACE_EXCEPTION = true;

    function is_animal(data) { return (data.mflags1 & 0x00040000 /* M1_ANIMAL */) !== 0; }
    function mindless(data) { return (data.mflags1 & 0x00010000 /* M1_MINDLESS */) !== 0; }
    function MON_WEP(m) {
        for (let o = m.minvent; o; o = o.nobj) {
            if (((o.owornmask | 0) & W_WEP) !== 0)
                return o;
        }
        return null;
    }
    /* C obj.h:257 bimanual(otmp) — this used to be a `return false` stub,
     * shadowing the real port this file ALREADY imports from js/do_wear.js
     * (line 72, backed by the compiled oc_bimanual otyp set).  A monster
     * wielding a two-handed weapon would have been offered a shield. */

    if (verysmall(mon.data) || nohands(mon.data) || is_animal(mon.data))
        return;
    /* give mummies a chance to wear their wrappings
     * and let skeletons wear their initial armor */
    if (mindless(mon.data)
        && (!creation || (mon.data.mlet !== S_MUMMY
                          && mon.data.pmidx !== PM_SKELETON)))
        return;

    await m_dowear_type(mon, W_AMUL, creation, false);
    let can_wear_armor = !_worn_cantweararm(mon.data); /* for suit, cloak, shirt */
    /* can't put on shirt if already wearing suit */
    if (can_wear_armor && !(mon.misc_worn_check & W_ARM))
        await m_dowear_type(mon, W_ARMU, creation, false);
    /* WrappingAllowed() makes any size between small and huge eligible;
       treating small as a special case allows hobbits, gnomes, and
       kobolds to wear all cloaks; large and huge allows giants and such
       to wear mummy wrappings but not other cloaks */
    if (can_wear_armor || WrappingAllowed(mon.data))
        await m_dowear_type(mon, W_ARMC, creation, false);
    await m_dowear_type(mon, W_ARMH, creation, false);
    if (!MON_WEP(mon) || !bimanual(MON_WEP(mon)))
        await m_dowear_type(mon, W_ARMS, creation, false);
    await m_dowear_type(mon, W_ARMG, creation, false);
    if (!slithy(mon.data) && (mon.data.mlet | 0) !== _WORN_S_CENTAUR_W)
        await m_dowear_type(mon, W_ARMF, creation, false);
    if (can_wear_armor)
        await m_dowear_type(mon, W_ARM, creation, false);
    else
        await m_dowear_type(mon, W_ARM, creation, RACE_EXCEPTION);
}

/* objclass.h — the two oclasses m_dowear_type filters on. */
const _MDW_ARMOR_CLASS = 3, _MDW_AMULET_CLASS = 5;

/* objects.h oc_armcat ordinals (js/armor_data.js `armcat`). */
const _MDW_ARM_SUIT = 0, _MDW_ARM_SHIELD = 1, _MDW_ARM_HELM = 2,
      _MDW_ARM_GLOVES = 3, _MDW_ARM_BOOTS = 4, _MDW_ARM_CLOAK = 5,
      _MDW_ARM_SHIRT = 6;

/* objects.h otyps read by the guards below (index into js/oc_name_data.js
 * OC_NAME, cross-checked against js/armor_data.js). */
const _MDW_AMULET_OF_LIFE_SAVING = 202, _MDW_AMULET_OF_REFLECTION = 208,
      _MDW_AMULET_OF_GUARDING = 210, _MDW_MUMMY_WRAPPING = 138,
      _MDW_HELM_OF_OPPOSITE_ALIGNMENT = 99, _MDW_DUNCE_CAP = 94,
      _MDW_SPEED_BOOTS = 166, _MDW_RUBBER_HOSE = 78;

/* C decl.h:17 NH_BLACK = c_color_names.c_black = "black". */
const NH_BLACK_MDW = 'black';

/* obj.h:418-420 is_flimsy(otmp) — oc_material <= LEATHER(7) || RUBBER_HOSE. */
const _MDW_LEATHER_MAT = 7;

function _mdw_armcat_is(otmp, cat) {
    if (!otmp || (otmp.oclass | 0) !== _MDW_ARMOR_CLASS) return false;
    const row = ARMOR_DATA[otmp.otyp | 0];
    return !!row && (row.armcat | 0) === cat;
}

function _mdw_is_suit(o) { return _mdw_armcat_is(o, _MDW_ARM_SUIT); }

function _mdw_is_shield(o) { return _mdw_armcat_is(o, _MDW_ARM_SHIELD); }

function _mdw_is_helmet(o) { return _mdw_armcat_is(o, _MDW_ARM_HELM); }

function _mdw_is_gloves(o) { return _mdw_armcat_is(o, _MDW_ARM_GLOVES); }

function _mdw_is_boots(o) { return _mdw_armcat_is(o, _MDW_ARM_BOOTS); }

function _mdw_is_cloak(o) { return _mdw_armcat_is(o, _MDW_ARM_CLOAK); }

function _mdw_is_shirt(o) { return _mdw_armcat_is(o, _MDW_ARM_SHIRT); }

function _mdw_is_flimsy(o) {
    if (!o) return false;
    return ((MKOBJ_OC_MATERIAL[o.otyp | 0] | 0) <= _MDW_LEATHER_MAT)
        || (o.otyp | 0) === _MDW_RUBBER_HOSE;
}

/* C mondata.h:57 has_horns(ptr) = (num_horns(ptr) > 0). */
function _mdw_has_horns(data) { return num_horns((data?.pmidx | 0)) > 0; }

/* C objclass.h:99,102 + hack.h:1531 ARM_BONUS(obj):
 *   objects[otyp].a_ac + obj->spe - min(greatest_erosion(obj),
 *                                       objects[otyp].a_ac)
 * a_ac is indexed BY OTYP out of the objects[] table, never read off the
 * object (js/do_wear.js armBonus makes the same point).  A non-armor object
 * has no a_ac row, and C would read the union's oc_oc1 as 0 there. */
function _mdw_arm_bonus(obj) {
    const row = ARMOR_DATA[obj.otyp | 0];
    const a_ac = row ? (row.a_ac | 0) : 0;
    const er1 = (obj.oeroded | 0), er2 = (obj.oeroded2 | 0);
    const erosion = er1 > er2 ? er1 : er2;
    return a_ac + (obj.spe | 0) - (erosion < a_ac ? erosion : a_ac);
}

/* C worn.c oc_delay: objects[otyp].oc_delay.  ARMOR() passes `delay` into the
 * OBJECT() dly slot (objects.h:422-427) and AMULET() passes a literal 0
 * (objects.h:831-834), so the generated armor table is the whole answer for
 * the two classes m_dowear_type can reach. */
function _mdw_oc_delay(otyp) {
    const row = ARMOR_DATA[otyp | 0];
    return row ? (row.delay | 0) : 0;
}

/* C worn.c:1112-1124 racial_exception(mon, obj) — hobbits may wear elven
 * armor; no "unacceptable" exceptions exist in 5.0.  raceptr(mon) is
 * evaluated in the shared port, including the hero's current race. */
function _mdw_racial_exception(mon, obj) {
    return racial_exception(mon, obj);
}

/* C worn.c:1099-1110 extra_pref(mon, obj) — "currently only does speed
 * boots". */
function _mdw_extra_pref(mon, obj) {
    if (obj && (obj.otyp | 0) === _MDW_SPEED_BOOTS
        && (mon.permspeed | 0) !== _MDW_MFAST)
        return 20;
    return 0;
}

/* C youprop.h See_invisible — the same expression js/trap.js:3739 already
 * uses for the mummy-wrapping guard below. */
function _mdw_See_invisible() {
    const u = game.u || {};
    return !!(u.uprops?.[SEE_INVIS]?.intrinsic || u.uprops?.[SEE_INVIS]?.extrinsic);
}

async function m_dowear_type(mon, flag, creation, racialexception) {
    let old, best, obj;
    let oldmask = 0;
    let m_delay = 0;
    const sawmon = canseemon(mon), sawloc = cansee(mon.mx | 0, mon.my | 0);
    let autocurse;
    let nambuf;

    if (mon.mfrozen | 0)
        return; /* probably putting previous item on */

    /* Get a copy of monster's name before altering its visibility */
    nambuf = _mdw_See_invisible() ? Monnam(mon) : mon_nam(mon);

    old = which_armor(mon, flag);
    if (old && (old.cursed | 0))
        return;
    if (old && flag === W_AMUL && (old.otyp | 0) !== _MDW_AMULET_OF_GUARDING)
        return; /* no amulet better than life-saving or reflection */
    best = old;

    let outer_break = false;
    for (obj = mon.minvent; obj && !outer_break; obj = obj.nobj) {
        switch (flag) {
        case W_AMUL:
            if ((obj.oclass | 0) !== _MDW_AMULET_CLASS
                || ((obj.otyp | 0) !== _MDW_AMULET_OF_LIFE_SAVING
                    && (obj.otyp | 0) !== _MDW_AMULET_OF_REFLECTION
                    && (obj.otyp | 0) !== _MDW_AMULET_OF_GUARDING))
                continue;
            /* for 'best' to be non-Null, it must be an amulet of guarding;
               life-saving and reflection don't get here due to early return
               and other amulets of guarding can't be any better */
            if (!best || (obj.otyp | 0) !== _MDW_AMULET_OF_GUARDING) {
                best = obj;
                if ((best.otyp | 0) !== _MDW_AMULET_OF_GUARDING) {
                    outer_break = true; /* life-saving or reflection; use it */
                    break;
                }
            }
            continue; /* skip post-switch armor handling */
        case W_ARMU:
            if (!_mdw_is_shirt(obj))
                continue;
            break;
        case W_ARMC:
            if (!_mdw_is_cloak(obj))
                continue;
            /* mummy wrapping is only cloak allowed when bigger than human */
            if ((mon.data?.msize | 0) > _MDW_MZ_HUMAN
                && (obj.otyp | 0) !== _MDW_MUMMY_WRAPPING)
                continue;
            /* avoid mummy wrapping if it will allow hero to see mon (unless
               this is a new mummy; an invisible one is feasible via ^G) */
            if ((mon.minvis | 0) && ume_w_blocks(obj, W_ARMC) === INVIS
                && !_mdw_See_invisible() && !creation)
                continue;
            break;
        case W_ARMH:
            if (!_mdw_is_helmet(obj))
                continue;
            /* changing alignment is not implemented for monsters;
               priests and minions could change alignment but wouldn't
               want to, so they reject helms of opposite alignment */
            if ((obj.otyp | 0) === _MDW_HELM_OF_OPPOSITE_ALIGNMENT
                && ((mon.ispriest | 0) || (mon.isminion | 0)))
                continue;
            /* (flimsy exception matches polyself handling) */
            if (_mdw_has_horns(mon.data) && !_mdw_is_flimsy(obj))
                continue;
            break;
        case W_ARMS:
            if (!_mdw_is_shield(obj))
                continue;
            break;
        case W_ARMG:
            if (!_mdw_is_gloves(obj))
                continue;
            break;
        case W_ARMF:
            if (!_mdw_is_boots(obj))
                continue;
            break;
        case W_ARM:
            if (!_mdw_is_suit(obj))
                continue;
            if (racialexception && (_mdw_racial_exception(mon, obj) < 1))
                continue;
            break;
        }
        if (outer_break)
            break;
        if (obj.owornmask | 0)
            continue;
        /* I'd like to define a VISIBLE_ARM_BONUS which doesn't assume the
         * monster knows obj->spe, but if I did that, a monster would keep
         * switching forever between two -2 caps since when it took off one
         * it would forget spe and once again think the object is better
         * than what it already has.
         */
        if (best && (_mdw_arm_bonus(best) + _mdw_extra_pref(mon, best)
                     >= _mdw_arm_bonus(obj) + _mdw_extra_pref(mon, obj)))
            continue;
        best = obj;
    }
    /* C `outer_break:` label */
    if (!best || best === old)
        return;

    /* same auto-cursing behavior as for hero */
    autocurse = ((best.otyp | 0) === _MDW_HELM_OF_OPPOSITE_ALIGNMENT
                 || (best.otyp | 0) === _MDW_DUNCE_CAP) && !(best.cursed | 0);
    /* if wearing a cloak, account for the time spent removing
       and re-wearing it when putting on a suit or shirt */
    if ((flag === W_ARM || flag === W_ARMU) && ((mon.misc_worn_check | 0) & W_ARMC))
        m_delay += 2;
    /* when upgrading a piece of armor, account for time spent
       taking off current one */
    if (old) {
        m_delay += _mdw_oc_delay(old.otyp);

        oldmask = old.owornmask | 0; /* needed later by artifact_light() */
        old.owornmask = 0; /* avoid doname() showing "(being worn)" */
    }

    if (!creation) {
        if (sawmon) {
            let buf, oldarm, newarm;

            /* "<Mon> [removes <oldarm> and ]puts on <newarm>."
               uses accessory verbs for armor but we can live with that */
            if (old) {
                oldarm = (await distant_name(old, doname));
                buf = ` removes ${oldarm} and`;
            } else {
                buf = oldarm = '';
            }
            newarm = (await distant_name(best, doname));
            /* a monster will swap an item of the same type as the one it
               is replacing when the enchantment is better;
               if newarm and oldarm have identical descriptions, substitute
               "another <newarm>" for "a|an <newarm>" */
            if (newarm.toLowerCase() === oldarm.toLowerCase()) {
                if (newarm.slice(0, 2).toLowerCase() === 'a ')
                    newarm = 'another ' + newarm.slice(2);
                else if (newarm.slice(0, 3).toLowerCase() === 'an ')
                    newarm = 'another ' + newarm.slice(3);
            }
            pline_mon(mon, `${Monnam(mon)}${buf} puts on ${newarm}.`);
            if (autocurse)
                pline(`${s_suffix(Monnam(mon))} ${simpleonames(best)} `
                      + `${otense(best, 'glow')} ${hcolor(NH_BLACK_MDW)} for a moment.`);
        } /* can see it */
        m_delay += _mdw_oc_delay(best.otyp);
        mon.mfrozen = m_delay;
        if (mon.mfrozen | 0)
            mon.mcanmove = 0;
    }
    if (old) {
        await update_mon_extrinsics(mon, old, false, creation);

        /* owornmask was cleared above but artifact_light() expects it */
        old.owornmask = oldmask;
        if ((old.lamplit | 0) && artifact_light(old))
            end_burn(old, false);
        old.owornmask = 0;
    }
    mon.misc_worn_check = (mon.misc_worn_check | 0) | flag;
    best.owornmask = (best.owornmask | 0) | flag;
    if (autocurse)
        await _mdw_curse(best);
    /* C worn.c:974-991 */
    if (artifact_light(best) && !(best.lamplit | 0)) {
        begin_burn(best, false);
        vision_recalc(1);
        if (!creation && (best.lamplit | 0) && cansee(mon.mx | 0, mon.my | 0)) {
            const adesc = arti_light_description(best);

            if (sawmon) /* could already see monster */
                pline(`${Yname2(best)} ${otense(best, 'begin')} to shine ${adesc}.`);
            else if (canseemon(mon)) /* didn't see it until new light */
                pline(`${Yname2(best)} ${otense(best, 'are')} shining ${adesc}.`);
            else if (sawloc) /* saw location but not invisible monster */
                pline(`Something begins to shine ${adesc}.`);
            else /* didn't see location until new light */
                pline(`Something is shining ${adesc}.`);
        }
    }
    await update_mon_extrinsics(mon, best, true, creation);
    /* if couldn't see it but now can, or vice versa */
    if (!creation && (!!sawmon !== !!canseemon(mon))) {
        if ((mon.minvis | 0) && !_mdw_See_invisible()) {
            pline(`Suddenly you cannot see ${nambuf}.`);
            discover_object(best.otyp | 0, true, true, true);
        /* } else if (!mon->minvis) {
         *     pline("%s suddenly appears!", Amonnam(mon)); */
        }
    }
    void sawloc;
}

/* ---------------------------------------------------------------------------
 * wearmask_to_obj — find worn object by wornmask
 * C ref: nethack-c/src/worn.c:197
 *   struct obj * wearmask_to_obj(long wornmask)
 *
 * Iterates the worn[] array (worn slot descriptors) and returns a reference
 * to the first worn object whose w_mask has bits in common with the argument.
 * Returns null if no matching worn slot is found.
 * RNG: none.
 * ---------------------------------------------------------------------------
 */
export function wearmask_to_obj(wornmask) {
    const u = game.u || {};

    // worn[] array from C (each entry is [w_mask, u.<field_name>])
    const worn = [
        [W_ARM, 'uarm'],
        [W_ARMC, 'uarmc'],
        [W_ARMH, 'uarmh'],
        [W_ARMS, 'uarms'],
        [W_ARMG, 'uarmg'],
        [W_ARMF, 'uarmf'],
        [W_ARMU, 'uarmu'],
        [W_RINGL, 'uleft'],
        [W_RINGR, 'uright'],
        [W_WEP, 'uwep'],
        [W_SWAPWEP, 'uswapwep'],
        [W_QUIVER, 'uquiver'],
        [W_AMUL, 'uamul'],
        [W_TOOL, 'ublindf'],
        [W_BALL, 'uball'],
        [W_CHAIN, 'uchain'],
    ];

    wornmask = wornmask | 0; // ensure integer

    for (const [w_mask, field] of worn) {
        if ((w_mask & wornmask) !== 0) {
            return u[field] ?? null;
        }
    }
    return null;
}

/* ---------------------------------------------------------------------------
 * allunworn — clear all worn/wielded object pointers
 * C ref: nethack-c/src/worn.c:157-168
 *   void allunworn(void)
 *
 * Clears u.twoweap and sets all worn/wielded object pointers on the hero
 * to null. Called after the objects have been freed (without first being
 * unworn) while saving invent during game save.
 * RNG: none.
 * ---------------------------------------------------------------------------
 */
export function allunworn() {
    const u = game.u || {};
    u.twoweap = 0;
    const worn = [
        [W_ARM, 'uarm'],
        [W_ARMC, 'uarmc'],
        [W_ARMH, 'uarmh'],
        [W_ARMS, 'uarms'],
        [W_ARMG, 'uarmg'],
        [W_ARMF, 'uarmf'],
        [W_ARMU, 'uarmu'],
        [W_RINGL, 'uleft'],
        [W_RINGR, 'uright'],
        [W_WEP, 'uwep'],
        [W_SWAPWEP, 'uswapwep'],
        [W_QUIVER, 'uquiver'],
        [W_AMUL, 'uamul'],
        [W_TOOL, 'ublindf'],
        [W_BALL, 'uball'],
        [W_CHAIN, 'uchain'],
    ];
    for (const [w_mask, field] of worn) {
        if (w_mask) {
            u[field] = null;
        }
    }
}

/* ---------------------------------------------------------------------------
 * clear_bypass — helper to recursively clear bypass bits on an object chain
 * C ref: nethack-c/src/worn.c:1031-1045
 *   static void clear_bypass(struct obj *objchn)
 *
 * Walks an object chain (via nobj) and clears the bypass flag on each object.
 * Recursively clears bypass flags on contained objects (cobj chain) if the
 * object has contents.
 * RNG: none.
 * ---------------------------------------------------------------------------
 */
function clear_bypass(objchn) {
    for (let o = objchn; o; o = o.nobj) {
        o.bypass = 0;
        if (o.cobj) { // Has_contents(o)
            clear_bypass(o.cobj);
        }
    }
}

/* ---------------------------------------------------------------------------
 * bypass_objlist — set or clear bypass bits on an object chain
 * C ref: nethack-c/src/worn.c (bypass_objlist)
 *   void bypass_objlist(struct obj *objchain, boolean on)
 *
 * If on is true and objchain is non-null, sets svc.context.bypasses = true.
 * Then walks the objchain (via nobj) and sets bypass = on ? 1 : 0 on each.
 * RNG: none.
 * ---------------------------------------------------------------------------
 */
export function bypass_objlist(objchain, on) {
    if (on && objchain) {
        /* the setters in worn.js/zap.js/cmd.js write game.context */
        game.context = game.context || {};
        game.context.bypasses = true;
    }
    while (objchain) {
        objchain.bypass = on ? 1 : 0;
        objchain = objchain.nobj;
    }
}

export function clear_bypasses() {
    const u = game.u || {};
    const fobj = game.fobj || null;
    const fmon = game.fmon || null;

    clear_bypass(fobj);

    // Clear bypass on hero inventory
    // C worn.c:1082 gi.invent is stored on game.invent in this port.
    // C worn.c:1082 clears gi.invent, stored here as game.invent.
    // Retouching equipment after another polymorph must revisit these items.
    clear_bypass(game.invent || null);

    // Clear bypass on migrating objects
    const gm = game.gm || {};
    clear_bypass(gm.migrating_objs || null);

    // Clear bypass on buried objects
    // C: clear_bypass(svl.level.buriedobjlist).  `.svl` is never assigned in
    // js/ — this port keeps the buried chain on game.level.buriedobjlist, as
    // trap.js:1154 and trap.js:3542 already read it — so the old
    // `game.svl.level` read was unconditionally undefined and buried objects
    // never had their bypass cleared.
    const level = game.level || {};
    clear_bypass(level.buriedobjlist || null);

    // Clear bypass on billed objects
    const gb = game.gb || {};
    clear_bypass(gb.billobjs || null);

    // Clear bypass on deleted objects
    const go = game.go || {};
    clear_bypass(go.objs_deleted || null);

    // Clear bypass on monsters and their inventories
    for (let mtmp = fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mhp <= 0) continue; // DEADMONSTER(mtmp)
        clear_bypass(mtmp.minvent || null);
        // Long worm created by polymorph: clear mcorpsenm to revert to normal
        if (mtmp.data && mtmp.data.pmidx === PM_LONG_WORM) {
            const mextra = mtmp.mextra || {};
            if (mextra.mcorpsenm != null && mextra.mcorpsenm !== NON_PM) {
                mextra.mcorpsenm = NON_PM;
            }
        }
    }

    // Clear bypass on migrating monsters' inventories
    for (let mtmp = gm.migrating_mons || null; mtmp; mtmp = mtmp.nmon) {
        clear_bypass(mtmp.minvent || null);
    }

    // Clear bypass on mydogs (pets being led during level change)
    for (let mtmp = gm.mydogs || null; mtmp; mtmp = mtmp.nmon) {
        clear_bypass(mtmp.minvent || null);
    }

    // Clear bypass on ball and chain (may be floating, not on any object chain)
    if (u.uball) {
        u.uball.bypass = 0;
    }
    if (u.uchain) {
        u.uchain.bypass = 0;
    }

    // Mark that context bypasses have been cleared
    if (game.context) game.context.bypasses = false;
    if (game.svc && game.svc.context) game.svc.context.bypasses = false;
}

/* ---------------------------------------------------------------------------
 * nxt_unbypassed_obj — find next unbypassed object in chain, set its bypass
 * C ref: nethack-c/src/worn.c:1136-1146
 *   struct obj *nxt_unbypassed_obj(struct obj *objchain)
 *
 * Walks objchain (via nobj). Returns the first object whose bypass flag is
 * not set. Sets bypass = 1 on that object and sets svc.context.bypasses = true
 * before returning. Returns null if every object in the chain has bypass set.
 * RNG: none.
 * ---------------------------------------------------------------------------
 */
export function nxt_unbypassed_obj(objchain) {
    while (objchain) {
        if (!objchain.bypass) {
            // bypass_obj(objchain) inline
            objchain.bypass = 1;
            game.context = game.context || {};
            game.context.bypasses = true;
            break;
        }
        objchain = objchain.nobj;
    }
    return objchain;
}

// ── C worn.c:570-705 update_mon_extrinsics + its two macros (module-local,
// per project convention — these are preprocessor macros in C, not separate
// ported functions) ──
const UME_SADDLE_OTYP = 235; /* objects.h SADDLE otyp */

const UME_ALCHEMY_SMOCK_OTYP = 144; /* objects.h ALCHEMY_SMOCK otyp */

const UME_MUMMY_WRAPPING_OTYP = 138; /* objects.h MUMMY_WRAPPING otyp */

const UME_CORNUTHAUM_OTYP = 93; /* objects.h CORNUTHAUM otyp */

/* C artilist.h ART_EYES_OF_THE_OVERWORLD.  The ordinal is 26, NOT 27: "The
 * Palantir of Westernesse" (artilist.h:237-246) is wrapped in `#if 0` — the
 * obsolete Elf-quest artifact is excluded from every preprocessor expansion
 * mode — so every entry from ART_STAFF_OF_AESCULAPIUS onward shifts down one.
 * Counting artilist.h entries with the #if 0 block skipped: 23 = Sceptre of
 * Might, 24 = Staff of Aesculapius, 25 = Magic Mirror of Merlin,
 * 26 = Eyes of the Overworld.  Do not "restore" this to 27. */
const UME_ART_EYES_OF_THE_OVERWORLD = 26; /* artilist index; matches js/cmd.js local const */

/* worn.c obj.h:439 is_art(o,art): (o) && (o)->oartifact == (art). Not yet a
 * shared export (js/cmd.js:5372 has its own module-local copy); mirrored
 * here per that same convention. */
function ume_is_art(o, art) {
    return !!(o && (o.oartifact | 0) === art);
}

/* pm.h Role_if(): compare against this port's role-index representation.  The
 * generated game state normally carries flags.initrole; retain the urole
 * fallback for callers that construct a pre-chargen state directly. */
function ume_Role_if(pm) {
    const g = game;
    const initrole = g.flags?.initrole;
    if (initrole != null)
        return (initrole | 0) === (pm | 0);
    return ((g.urole?.mnum ?? -1) | 0) === (pm | 0);
}

/* worn.c:38 w_blocks(o, m) macro — only one blocking item per property. */
function ume_w_blocks(o, m) {
    if ((o.otyp | 0) === UME_MUMMY_WRAPPING_OTYP && ((m) & W_ARMC) !== 0)
        return INVIS;
    if ((o.otyp | 0) === UME_CORNUTHAUM_OTYP && ((m) & W_ARMH) !== 0
        && !ume_Role_if(PM_WIZARD))
        return CLAIRVOYANT;
    if (ume_is_art(o, UME_ART_EYES_OF_THE_OVERWORLD) && ((m) & W_TOOL) !== 0)
        return BLINDED;
    return 0;
}

/* prop.h res_to_mr(r) macro. */
function ume_res_to_mr(r) {
    return (FIRE_RES <= r && r <= STONE_RES) ? (1 << (r - 1)) : 0;
}

/* worn.c:564 altprop(o) macro. */
function ume_altprop(o) {
    if ((o.otyp | 0) === UME_ALCHEMY_SMOCK_OTYP)
        return POISON_RES + ACID_RES - (MKOBJ_OC_OPROP[o.otyp | 0] | 0);
    return 0;
}

/* C monst.h:205-206 mon->permspeed / mon->mspeed values.  Declared locally
 * (the mcastu.js / makemon.js / fastforward.js convention) rather than
 * imported from the frozen-shadow js/const.js. */
const UME_MSLOW = 1, UME_MFAST = 2;

/* ---------------------------------------------------------------------------
 * mon_adjust_speed — C ref: worn.c:487-564
 *   void mon_adjust_speed(struct monst *mon, int adjust, struct obj *obj)
 *   adjust: positive => increase speed, negative => decrease
 *   obj:    item to make known if the effect can be seen
 *
 * RNG: the body itself draws nothing on the core stream (Monnam()'s
 * hallucination path uses the display stream), but the learnwand(obj) call at
 * worn.c:560-562 can draw rn2(19) through makeknown -> exercise(A_WIS).
 * --------------------------------------------------------------------------- */
export function mon_adjust_speed(mon, adjust, obj) {
    /* C worn.c:494-495 */
    let give_msg = !game.in_mklev;
    let petrify = false;
    const oldspeed = (mon.mspeed | 0);

    switch (adjust | 0) {
    case 2:                                     /* C worn.c:498 */
        mon.permspeed = UME_MFAST;
        give_msg = false;   /* special-case monster creation */
        break;
    case 1:                                     /* C worn.c:502 */
        if ((mon.permspeed | 0) === UME_MSLOW)
            mon.permspeed = 0;
        else
            mon.permspeed = UME_MFAST;
        break;
    case 0:                                     /* C worn.c:508 — just check worn speed boots */
        break;
    case -1:                                    /* C worn.c:510 */
        if ((mon.permspeed | 0) === UME_MFAST)
            mon.permspeed = 0;
        else
            mon.permspeed = UME_MSLOW;
        break;
    case -2:                                    /* C worn.c:516 */
        mon.permspeed = UME_MSLOW;
        give_msg = false;   /* (not currently used) */
        break;
    case -3:                                    /* C worn.c:520 — petrification */
        /* take away intrinsic speed but don't reduce normal speed */
        if ((mon.permspeed | 0) === UME_MFAST)
            mon.permspeed = 0;
        petrify = true;
        break;
    case -4:                                    /* C worn.c:526 — green slime */
        if ((mon.permspeed | 0) === UME_MFAST)
            mon.permspeed = 0;
        give_msg = false;
        break;
    }

    /* C worn.c:533-538 — worn speed boots override permspeed. */
    let otmp;
    for (otmp = mon.minvent; otmp; otmp = otmp.nobj)
        if (otmp.owornmask && (MKOBJ_OC_OPROP[otmp.otyp | 0] | 0) === FAST)
            break;
    if (otmp)                                   /* speed boots */
        mon.mspeed = UME_MFAST;
    else
        mon.mspeed = (mon.permspeed | 0);

    /* C worn.c:541-543 — no message if monster is immobile (temp or perm)
     * or unseen. */
    if (give_msg && ((mon.mspeed | 0) !== oldspeed || petrify)
        && (mon.data ? (mon.data.mmove | 0) : 0)
        && !(mon.mfrozen || mon.msleeping) && canseemon(mon)) {
        /* C worn.c:544-546 — fast to slow (skipping intermediate state)
         * or vice versa. */
        const howmuch = ((mon.mspeed | 0) + oldspeed === UME_MFAST + UME_MSLOW)
            ? "much " : "";

        if (petrify) {
            /* C worn.c:548-552 — mimic the player's petrification countdown;
               "slowing down" even if fast movement rate retained via worn
               speed boots */
            if (game.flags && game.flags.verbose)
                pline_mon(mon, Monnam_t(mon) + " is slowing down.");
        } else if ((adjust | 0) > 0 || (mon.mspeed | 0) === UME_MFAST) {
            /* C worn.c:553-555 */
            pline_mon(mon, Monnam_t(mon) + " is suddenly moving " + howmuch + "faster.");
        } else {
            /* C worn.c:556-558 */
            pline_mon(mon, Monnam_t(mon) + " seems to be moving " + howmuch + "slower.");
        }

        if (obj)
            learnwand(obj);
    }
}

/* C worn.c:570-705 update_mon_extrinsics: armor put on or taken off; might be
 * magical variety. `goto again`/`goto maybe_blocks` become a for(;;) loop that
 * runs the on/off switch at least once (the fallthrough from the C label to
 * the switch), then loops again only when the altwhich re-dispatch fires. */
export async function update_mon_extrinsics(mon, obj, on, silently) {
    let which = MKOBJ_OC_OPROP[obj.otyp | 0] | 0;
    const altwhich = ume_altprop(obj);

    const unseen = !canseemon(mon);
    if (which || altwhich) {
        for (;;) {
            if (on) {
                switch (which) {
                case INVIS:
                    mon.minvis = mon.invis_blkd ? 0 : 1;
                    break;
                case FAST: {
                    const save_in_mklev = game.in_mklev;
                    if (silently)
                        game.in_mklev = true;
                    mon_adjust_speed(mon, 0, obj);
                    game.in_mklev = save_in_mklev;
                    break;
                }
                case ANTIMAGIC:
                case REFLECTING:
                case PROTECTION:
                    break;
                case CLAIRVOYANT:
                case STEALTH:
                case TELEPAT:
                    break;
                case LEVITATION:
                case FLYING:
                case WWALKING:
                    break;
                case DISPLACED:
                case FUMBLING:
                case JUMPING:
                    break;
                default:
                    mon.mextrinsics = (mon.mextrinsics | 0) | ume_res_to_mr(which);
                    break;
                }
            } else {
                switch (which) {
                case INVIS:
                    mon.minvis = mon.perminvis;
                    break;
                case FAST: {
                    const save_in_mklev = game.in_mklev;
                    if (silently)
                        game.in_mklev = true;
                    mon_adjust_speed(mon, 0, obj);
                    game.in_mklev = save_in_mklev;
                    break;
                }
                case FIRE_RES:
                case COLD_RES:
                case SLEEP_RES:
                case DISINT_RES:
                case SHOCK_RES:
                case POISON_RES:
                case ACID_RES:
                case STONE_RES: {
                    const mask = ume_res_to_mr(which);
                    let otmp;
                    for (otmp = mon.minvent; otmp; otmp = otmp.nobj) {
                        if (otmp === obj || !otmp.owornmask)
                            continue;
                        if ((MKOBJ_OC_OPROP[otmp.otyp | 0] | 0) === which)
                            break;
                        if (ume_altprop(otmp) === which)
                            break;
                    }
                    if (!otmp)
                        mon.mextrinsics = (mon.mextrinsics | 0) & ~mask;
                    break;
                }
                default:
                    break;
                }
            }

            if (altwhich && which !== altwhich) {
                which = altwhich;
                continue;
            }
            break;
        }
    }

    switch (ume_w_blocks(obj, ~0)) {
    case INVIS:
        mon.invis_blkd = on ? 1 : 0;
        mon.minvis = on ? 0 : mon.perminvis;
        break;
    default:
        break;
    }

    if (!on && mon === (game.u && game.u.usteed) && (obj.otyp | 0) === UME_SADDLE_OTYP)
        await dismount_steed(DISMOUNT_FELL);

    if (!silently && (unseen ^ !canseemon(mon)))
        newsym(mon.mx, mon.my);
}

/* armcat_to_wornmask — C ref: worn.c:249-278 */
export function armcat_to_wornmask(cat) {
    let mask = 0;
    switch (cat) {
    case _MDW_ARM_SUIT:
        mask = W_ARM;
        break;
    case _MDW_ARM_SHIELD:
        mask = W_ARMS;
        break;
    case _MDW_ARM_HELM:
        mask = W_ARMH;
        break;
    case _MDW_ARM_GLOVES:
        mask = W_ARMG;
        break;
    case _MDW_ARM_BOOTS:
        mask = W_ARMF;
        break;
    case _MDW_ARM_CLOAK:
        mask = W_ARMC;
        break;
    case _MDW_ARM_SHIRT:
        mask = W_ARMU;
        break;
    }
    return mask;
}

/* C ref: worn.c:1376-1417 extract_from_minvent(mon, obj, do_extrinsics, silently).
 * "At its core this is just obj_extract_self(), but it also handles any updates
 * that need to happen if the gear is equipped."  This is the one body;
 * js/mklev.js's extract_from_minvent forwards here.
 *
 * Gold dragon armor must stop shedding light while its worn mask is intact. */
export async function extract_from_minvent(mon, obj, do_extrinsics, silently) {
    const unwornmask = obj.owornmask | 0;

    /* C worn.c:1393-1400. mongets/add_to_minv now maintain ownership. */
    if (obj.where !== OBJ_MINVENT_TR) {
        await trap_impossible("extract_from_minvent called on object not in minvent");
        return;
    }
    if ((unwornmask & W_ARM) && obj.lamplit && artifact_light(obj))
        end_burn(obj, false);
    /* C worn.c:1402.  obj_extract_self is js/mklev.js's port of mkobj.c's
     * switch; its OBJ_MINVENT arm (mkobj.c:2575-2578) does the
     * extract_nobj(obj, &obj->ocarry->minvent) and clears obj->ocarry. */
    obj_extract_self(obj);
    obj.owornmask = 0;
    if (unwornmask) {
        if (!DEADMONSTER_TR(mon) && do_extrinsics) {
            await update_mon_extrinsics(mon, obj, false, silently);
        }
        mon.misc_worn_check = (mon.misc_worn_check | 0) & ~unwornmask;
        /* give monster a chance to wear other equipment on its next move
           instead of waiting until it picks something up */
        check_gear_next_turn(mon);
    }
    await obj_no_longer_held(obj);
    if (unwornmask & W_WEP_TR) {
        mwepgone(mon); /* unwields and sets weapon_check to NEED_WEAPON */
    }
}

const W_WEP_TR = 0x00000100;

function DEADMONSTER_TR(mon) { return !mon || (mon.mhp | 0) <= 0; }

/* C ref: worn.c:1176-1335 mon_break_armor */
export async function mon_break_armor(mon, polyspot) {
    /* local spellings of C mondata.h / obj.h macros used below.
       verysmall/nohands/slithy/WrappingAllowed live at module scope above —
       shared verbatim with m_dowear (they used to be a divergent second copy). */
    const MZ_SMALL = 1;
    const S_CENTAUR = _WORN_S_CENTAUR_W;
    /* C objects.h MUMMY_WRAPPING otyp == 138 (js/oc_name_data.js index 138,
       js/armor_data.js:82).  Was 264, which is a food-class otyp, so the
       `otyp != MUMMY_WRAPPING` guard below was unconditionally true. */
    const MUMMY_WRAPPING = 138;

    /* C mondata.h:56 has_horns(ptr) = num_horns(ptr) > 0 — mondata.c:678, a
       switch over monsndx(), NOT a flag test.  C has no M1_HORNS; the 0x10 this
       used to test is M1_CLING. */
    function has_horns(data) { return num_horns(data.pmidx | 0) > 0; }
    /* C mondata.h:57 is_whirly(ptr) = mlet == S_VORTEX || ptr == &mons[PM_AIR_ELEMENTAL];
       defsym.h:320 S_VORTEX == 22.  (Was 8, which is S_HUMANOID.) */
    function is_whirly(data) { return (data.mlet | 0) === _IMM_S_VORTEX || (data.pmidx | 0) === PM_AIR_ELEMENTAL; }
    /* C obj.h:418 is_flimsy(otmp) — oc_material <= LEATHER || otyp ==
       RUBBER_HOSE.  This was `return false`, i.e. "nothing is ever flimsy",
       which inverts worn.c:1290's helmet arm: `handless_or_tiny ||
       !is_flimsy(otmp)` then always held and a horned monster shed even a
       cloth/leather helmet C leaves on.  The real body is this file's own
       module-scope _mdw_is_flimsy (js/trap.js:2053), already C-faithful. */
    function is_flimsy(obj) { return _mdw_is_flimsy(obj); }
    function sliparm(data) { return sliparm_real(data); }
    /* C worn.c:1032-1044.  Armor which survives a form change is removed
       from the monster inventory, put on the current square, and marked as
       bypassed when this is a polymorph pass so the enclosing object walk
       cannot process it again during the same zap. */
    async function m_lose_armor(mon, obj, polyspot) {
        // C pline.c:283-284 blocks before the equipment is removed.
        if (game._blockingPline) await game._blockingPline;
        await extract_from_minvent(mon, obj, true, false);
        place_object(obj, mon.mx | 0, mon.my | 0);
        if (polyspot)
            bypass_obj(obj);
        newsym(mon.mx | 0, mon.my | 0);
    }
    /* C sndprocs.h:272 Soundeffect(seid, vol) — compiled empty without
       SND_LIB_INTEGRATED (as js/mon.js:2161); seffects.h ordinals. */
    function Soundeffect(se, vol) { }
    const se_clank = 40, se_cracking_sound = 46, se_ripping_sound = 136,
          se_thud = 175;
    /* C you.h:323-324 — evaluate the shared hallucinating pronoun selector
       even when no armor is present; worn.c:1184 initializes both locals
       before testing breakarm/sliparm. */
    function mhim(mon) {
        return ["him", "her", "it", "them"][pronoun_gender(mon, 2)];
    }
    function mhis(mon) {
        return ["his", "her", "its", "their"][pronoun_gender(mon, 2)];
    }
    function touch_petrifies(data) { return (data.pmidx | 0) === PM_COCKATRICE || (data.pmidx | 0) === PM_CHICKATRICE; }
    function Stone_resistance() { return selftouch_Stone_resistance(); }
    /* C obj.h Is_dragon_scales / Is_dragon_mail / Dragon_*_to_pm;
       objects.h otyps (js/oc_name_data.js 101/110/111/120). */
    const GRAY_DRAGON_SCALE_MAIL = 101, YELLOW_DRAGON_SCALE_MAIL = 110,
          GRAY_DRAGON_SCALES = 111, YELLOW_DRAGON_SCALES = 120;
    function Is_dragon_scales(obj) { const t = obj?.otyp | 0; return t >= GRAY_DRAGON_SCALES && t <= YELLOW_DRAGON_SCALES; }
    function Is_dragon_mail(obj) { const t = obj?.otyp | 0; return t >= GRAY_DRAGON_SCALE_MAIL && t <= YELLOW_DRAGON_SCALE_MAIL; }
    function Dragon_scales_to_pm(obj) { return PM_GRAY_DRAGON + ((obj?.otyp | 0) - GRAY_DRAGON_SCALES); }
    function Dragon_mail_to_pm(obj) { return PM_GRAY_DRAGON + ((obj?.otyp | 0) - GRAY_DRAGON_SCALE_MAIL); }
    function MON_WEP(m) {
        /* C monst.h:210: MON_WEP(mon) is the wielded pointer, mon->mw. */
        return m.mw;
    }
    async function instapetrify_local(arg) { return await instapetrify_real(arg); }

    let otmp;
    let mdat = mon.data;
    let vis = cansee(mon.mx | 0, mon.my | 0);
    let handless_or_tiny = (nohands(mdat) || verysmall(mdat));
    let noride = false;
    let pronoun = mhim(mon);
    let ppronoun = mhis(mon);

    if (breakarm(mdat)) {
        otmp = _which_armor(mon, W_ARM);
        if (otmp) {
            if ((Is_dragon_scales(otmp) && (mdat.pmidx | 0) === Dragon_scales_to_pm(otmp))
                || (Is_dragon_mail(otmp) && (mdat.pmidx | 0) === Dragon_mail_to_pm(otmp))) {
                /* no message here */
            } else {
                Soundeffect(se_cracking_sound, 100);
                if (vis)
                    pline_mon(mon, "%s breaks out of %s armor!",
                              Monnam_t(mon), ppronoun);
                else
                    You_hear("a cracking sound.");
            }
            if (game._blockingPline) await game._blockingPline;
            await m_useup(mon, otmp);
        }
        otmp = _which_armor(mon, W_ARMC);
        if (otmp && ((otmp.otyp | 0) !== MUMMY_WRAPPING || !WrappingAllowed(mdat))) {
            if (otmp.oartifact) {
                if (vis)
                    pline_mon(mon, "%s %s falls off!", _s_suffix(Monnam_t(mon)),
                          cloak_simple_name(otmp));
                await m_lose_armor(mon, otmp, polyspot);
            } else {
                Soundeffect(se_ripping_sound, 100);
                if (vis)
                    pline_mon(mon, "%s %s tears apart!", _s_suffix(Monnam_t(mon)),
                          cloak_simple_name(otmp));
                else
                    You_hear("a ripping sound.");
                if (game._blockingPline) await game._blockingPline;
                await m_useup(mon, otmp);
            }
        }
        otmp = _which_armor(mon, W_ARMU);
        if (otmp) {
            if (vis)
                pline_mon(mon, "%s shirt rips to shreds!",
                          _s_suffix(Monnam_t(mon)));
            else
                You_hear("a ripping sound.");
            if (game._blockingPline) await game._blockingPline;
            await m_useup(mon, otmp);
        }
    } else if (sliparm(mdat)) {
        let passes_thru_clothes = !((mdat.msize | 0) <= MZ_SMALL);
        otmp = _which_armor(mon, W_ARM);
        if (otmp) {
            Soundeffect(se_thud, 50);
            if (vis)
                pline_mon(mon, "%s armor falls around %s!",
                          _s_suffix(Monnam_t(mon)), pronoun);
            else
                You_hear("a thud.");
            await m_lose_armor(mon, otmp, polyspot);
        }
        otmp = _which_armor(mon, W_ARMC);
        if (otmp && ((otmp.otyp | 0) !== MUMMY_WRAPPING || !WrappingAllowed(mdat))) {
            if (vis) {
                if (is_whirly(mon.data))
                    pline_mon(mon, "%s %s falls, unsupported!",
                              _s_suffix(Monnam_t(mon)), cloak_simple_name(otmp));
                else
                    pline_mon(mon, "%s shrinks out of %s %s!",
                              Monnam_t(mon), ppronoun,
                              cloak_simple_name(otmp));
            }
            await m_lose_armor(mon, otmp, polyspot);
        }
        otmp = _which_armor(mon, W_ARMU);
        if (otmp) {
            if (vis) {
                if (passes_thru_clothes)
                    pline_mon(mon, "%s seeps right through %s shirt!",
                              Monnam_t(mon), ppronoun);
                else
                    pline_mon(mon, "%s becomes much too small for %s shirt!",
                          Monnam_t(mon), ppronoun);
            }
            await m_lose_armor(mon, otmp, polyspot);
        }
    }
    if (handless_or_tiny) {
        otmp = _which_armor(mon, W_ARMG);
        if (otmp) {
            if (vis)
                pline_mon(mon, "%s drops %s gloves%s!",
                          Monnam_t(mon), ppronoun,
                          MON_WEP(mon) ? " and weapon" : "");
            await m_lose_armor(mon, otmp, polyspot);
        }
        otmp = _which_armor(mon, W_ARMS);
        if (otmp) {
            Soundeffect(se_clank, 50);
            if (vis)
                pline_mon(mon, "%s can no longer hold %s shield!",
                          Monnam_t(mon), ppronoun);
            else
                You_hear("a clank.");
            await m_lose_armor(mon, otmp, polyspot);
        }
    }
    if (handless_or_tiny || has_horns(mdat)) {
        otmp = _which_armor(mon, W_ARMH);
        if (otmp && (handless_or_tiny || !is_flimsy(otmp))) {
            if (vis)
                pline_mon(mon, "%s helmet falls to the %s!",
                          _s_suffix(Monnam_t(mon)), surface(mon.mx | 0, mon.my | 0));
            else
                You_hear("a clank.");
            await m_lose_armor(mon, otmp, polyspot);
        }
    }
    if (handless_or_tiny || slithy(mdat) || (mdat.mlet | 0) === S_CENTAUR) {
        otmp = _which_armor(mon, W_ARMF);
        if (otmp) {
            if (vis) {
                if (is_whirly(mon.data))
                    pline_mon(mon, "%s boots fall away!",
                              _s_suffix(Monnam_t(mon)));
                else
                    pline_mon(mon, "%s boots %s off %s feet!",
                              _s_suffix(Monnam_t(mon)),
                          verysmall(mdat) ? "slide" : "are pushed", ppronoun);
            }
            await m_lose_armor(mon, otmp, polyspot);
        }
    }
    if (!can_saddle(mon)) {
        otmp = _which_armor(mon, W_SADDLE);
        if (otmp) {
            await m_lose_armor(mon, otmp, polyspot);
            if (vis)
                pline_mon(mon, "%s saddle falls off.", _s_suffix(Monnam_t(mon)));
        }
        if (mon === (game.u ? game.u.usteed : null))
            noride = true;
    }
    if (game._blockingPline) await game._blockingPline;
    if (noride || (mon === (game.u ? game.u.usteed : null) && !can_ride(mon))) {
        await You("can no longer ride %s.", mon_nam(mon));
        if (touch_petrifies(game.u.usteed.data) && !Stone_resistance() && rnl(3)) {
            let buf;
            await You("touch %s.", mon_nam(game.u.usteed));
            buf = "falling off " + an(pmname(game.u.usteed.data, Mgender(game.u.usteed)));
            await instapetrify_local(buf);
        }
        await dismount_steed(DISMOUNT_FELL);
    }
    return;
}

/* C ref: worn.c:465-477 mon_set_minvis(mon, cursed_potion). `on` here is
 * the C `cursed_potion` argument (callers pass whether the drunk potion
 * was cursed, per potion.c:1790 / muse.c:2449), NOT the desired minvis
 * state directly — mon->perminvis is set from its logical negation, and
 * minvis itself is only updated when the monster isn't invis_blkd. */
export function mon_set_minvis(mtmp, cursed_potion) {
    mtmp.perminvis = cursed_potion ? 0 : 1;
    if (!mtmp.invis_blkd) {
        mtmp.minvis = mtmp.perminvis;
        newsym(mtmp.mx, mtmp.my); /* make it disappear */
        if (mtmp.wormno)
            see_wsegs_rl(mtmp); /* and any tail too */
    }
}

function see_wsegs_rl(mon) { return see_wsegs_real(mon); }

/* C worn.c:997-1029
 *   struct obj *which_armor(struct monst *mon, long flag)
 *   { if (mon == &gy.youmonst) { switch (flag) { case W_ARM: return uarm; ...
 *       default: impossible("bad flag in which_armor"); return 0; } }
 *     else { for (obj = mon->minvent; obj; obj = obj->nobj)
 *                if (obj->owornmask & flag) return obj;
 *            return (struct obj *) 0; } } */
export function which_armor(mon, flag) {
    if (is_youmonst(mon)) {
        switch (flag) {
        case W_ARM:  return game.u.uarm;
        case W_ARMC: return game.u.uarmc;
        case W_ARMH: return game.u.uarmh;
        case W_ARMS: return game.u.uarms;
        case W_ARMG: return game.u.uarmg;
        case W_ARMF: return game.u.uarmf;
        case W_ARMU: return game.u.uarmu;
        default:
            impossible_sync("bad flag in which_armor");
            return 0;
        }
    } else {
        for (let obj = mon.minvent; obj; obj = obj.nobj)
            if (obj.owornmask & flag)
                return obj;
        return null;
    }
}

/* C ref: do_wear.c:887 — donning side of accessory_or_armor_on for the ARMOR
 * branch (do_wear.c:2359-2407).  Setworn the piece, pick the *_on afternmv by
 * slot, then schedule the donning delay nomul(-oc_delay) — or, if delay==0,
 * fire the *_on callback immediately via unmul("") (do_wear.c:2402).
 *
 *   gw.wasinwater = u.uinwater;       (WWALKING; not modeled — no-op)
 *   setworn(obj, mask);               (slot now occupied)
 *   ga.afternmv = <*_on by slot>;
 *   delay = -objects[obj->otyp].oc_delay;
 *   if (delay) { nomul(delay); gm.multi_reason = "dressing up";
 *                gn.nomovemsg = "You finish your dressing maneuver."; }
 *   else       { unmul(""); on_msg(obj); }
 *
 * RNG-free (Armor_on et al. have 0 RNG call-sites — cref-extract). */
const WORN_SLOTS_TP = ['uarm', 'uarmc', 'uarmh', 'uarms', 'uarmg', 'uarmf',
                       'uarmu', 'uleft', 'uright', 'uwep', 'uswapwep',
                       'uquiver', 'uamul', 'ublindf', 'uball', 'uchain'];

const TELEPAT_PROP = 30;        /* C prop.h:50 TELEPAT */

const W_ART_TP = 0x00001000;    /* C prop.h:114 W_ART — carried artifact */

const BOLT_LIM_TP = 8;          /* C hack.h:49 BOLT_LIM */

export function recalc_telepat_range() {
    const u = game.u;
    if (!u)
        return;
    let nobjs = 0;
    for (const slot of WORN_SLOTS_TP) {
        const oobj = u[slot];
        if (oobj && (MKOBJ_OC_OPROP[oobj.otyp | 0] | 0) === TELEPAT_PROP)
            nobjs++;
    }
    /* C worn.c:62-63 — count all artifacts with SPFX_ESP as one. */
    if (((u.uprops && u.uprops[TELEPAT_PROP] && u.uprops[TELEPAT_PROP].extrinsic) | 0) & W_ART_TP)
        nobjs++;
    u.unblind_telepat_range = nobjs ? (BOLT_LIM_TP * BOLT_LIM_TP) * nobjs : -1;
}
