// dothrow.js — C ref: src/dothrow.c (the 't' throw / 'f' fire family).
//
// Most of dothrow.c's flight path was ported inline into js/invent.js (dothrow,
// dofire, throw_obj, throwit, thitmonst, toss_up, hitfloor, tmiss, omon_adj,
// throwing_weapon, should_mulch_missile, find_launcher).  This module holds the
// functions that had no home there: the break trio (breaktest/breakmsg/
// breakobj) with its two public wrappers, throw_gold, gem_accept, autoquiver,
// ok_to_throw, endmultishot and check_shop_obj.
//
// use_whip() belongs to apply.c but is reached ONLY from dofire()'s empty-quiver
// arm in this port, and js/apply.js is a separate write-lease, so it lives here
// beside its caller.
import { game } from './gstate.js';
import { rn2, rnd, rnl } from './rng.js';
import { m_at, newsym, update_topl } from './display.js';
import { cansee } from './vision.js';
import { isok, IS_FURNITURE, IS_SINK, LAVAWALL, WATER, POOL, MOAT,
         LAVAPOOL, TT_PIT, P_DAGGER, A_DEX, A_CHA, NEED_HTH_WEAPON,
         MM_NOMSG, EYE } from './const.js';
import { mflags1_of, mflags2_of, mflags3_of, msound_of, M1_BREATHLESS,
         M1_NOEYES, M2_DOMESTIC, M3_WANTSARTI, MS_LEADER,
         is_human_flag, is_demon_flag } from './monflags_data.js';
import { attacktype, dmgtype, AT_WEAP, AT_ENGL, AT_HUGS,
         AD_STCK, AD_WRAP } from './monattk_data.js';
import { objects, BOULDER, CORPSE, POTION_CLASS, GEM_CLASS, WEAPON_CLASS,
         ARMOR_CLASS, EGG, STATUE, FOOD_CLASS, SCROLL_CLASS, SPBOOK_CLASS,
         place_object } from './mkobj.js';
import { surface } from './dungeon.js';
import { acurr_eff } from './attrib.js';
import { night, phase_of_the_moon, FULL_MOON } from './calendar.js';
import { name_to_pmidx, monster_by_pmidx, makemon, set_malign,
         is_covetous } from './makemon.js';
import * as I from './invent.js';

// C ref: hack.h ECMD_* result codes.
const ECMD_OK = 0, ECMD_CANCEL = 1, ECMD_TIME = 3;

// onames.h otyps (mkobj.js OBJECT_DATA numbering).
export const BULLWHIP = 82;
// Four of these were off: ROCK named touchstone(472), MIRROR named oil
// lamp(227), POT_OIL named gain ability(297) and POT_WATER named blindness(300).
// POT_WATER was self-cancelling — breakmsg()/breakobj() switch on
// `oclass == POTION_CLASS ? POT_WATER : otyp`, so the same wrong number sat on
// both sides — until breakobj()'s `otyp != POT_WATER` vapor gate read it
// directly and made holy water smell of vapors.
const AKLYS = 80, FLINT = 473, ROCK = 474,
    MIRROR = 230, EXPENSIVE_CAMERA = 229, CRYSTAL_BALL = 231, LENSES = 232,
    MELON = 280, CREAM_PIE = 287, POT_OIL = 321, POT_WATER = 322,
    BLINDING_VENOM = 479, ACID_VENOM = 480, BANANA = 281;

// C ref: objclass.h obj_material_types.
const VEGGY = 3, GLASS = 19, GEMSTONE = 20;
// C ref: body_part() indices as js/invent.js's HUMANOID_PARTS numbers them.
const FOOT = 5, HAND = 6, HEAD = 8;

// ── terrain / state predicates ───────────────────────────────────────────────

// C ref: rm.h IS_WATERWALL(typ).
function IS_WATERWALL(typ) { return typ === WATER; }
function typ_at(x, y) { return game.level?.at?.(x, y)?.typ ?? 0; }
function is_lava_at(x, y) { const t = typ_at(x, y); return t === LAVAPOOL || t === LAVAWALL; }
function is_pool_at(x, y) { const t = typ_at(x, y); return t === POOL || t === MOAT || t === WATER; }
function is_pool_or_lava_at(x, y) { return is_pool_at(x, y) || is_lava_at(x, y); }
function Blind() { return !!(game.u?.uprops?.Blinded || game.u?.Blinded); }
// C ref: mondata.h breathless(ptr) == (mflags1 & M1_BREATHLESS),
// haseyes(ptr) == !(mflags1 & M1_NOEYES).
function breathless(ptr) { return (mflags1_of(ptr) & M1_BREATHLESS) !== 0; }
function haseyes(ptr) { return (mflags1_of(ptr) & M1_NOEYES) === 0; }
// C ref: objnam.c vtense(subj, verb) — `verb` arrives in the plural (no
// trailing s) and is returned unchanged when `subj` reads as plural.  The
// special_subjs[] false-match table and the " of "/" from "/" called " head-noun
// scan are omitted: this port's only caller passes a body_part() noun, which
// contains neither.
function vtense(subj, verb) {
    if (subj) {
        const s = String(subj);
        if (!/^an? /i.test(s)) {
            const last = s.charAt(s.length - 1).toLowerCase();
            const prev = s.length > 1 ? s.charAt(s.length - 2).toLowerCase() : '';
            if ((last === 's' && s.length > 1 && prev !== 'u' && prev !== 's')
                || /eeth$|feet$|ia$|ae$/i.test(s))
                return verb;
            if (/^(they|you)$/i.test(s)) return verb;
        }
    }
    const v = String(verb), lc = v.toLowerCase(), end = lc.charAt(v.length - 1);
    if (lc === 'are') return 'is';
    if (lc === 'have') return `${v.slice(0, -2)}s`;
    if ('zxs'.includes(end)
        || (v.length >= 2 && end === 'h' && 'cs'.includes(lc.charAt(v.length - 2)))
        || (v.length === 2 && end === 'o'))
        return `${v}es`;
    if (end === 'y' && !'aeiou'.includes(lc.charAt(v.length - 2)))
        return `${v.slice(0, -1)}ies`;
    return `${v}s`;
}
// C ref: hack.h next2u(x,y).
function next2u(x, y) {
    const u = game.u;
    return Math.abs(x - u.ux) <= 1 && Math.abs(y - u.uy) <= 1;
}

// C ref: dungeon.c ceiling(x,y) — js/invent.js owns the one copy (ceiling_of).
const ceiling = (x, y) => I.ceiling_of(x, y);

// C ref: objnam.c Doname2(obj) — doname() with a capital first letter.
function Doname2(obj) {
    const d = I.doname_invent(obj);
    return d.charAt(0).toUpperCase() + d.slice(1);
}
// C ref: objnam.c an(s) / the(s) / s_suffix(s).
function an(s) { return /^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`; }
function the_str(s) { return /^[A-Z]/.test(s) ? s : `the ${s}`; }
// C ref: objnam.c Tobjnam(obj, verb) — "The food ration stops".
function Tobjnam(obj, verb) {
    const nm = the_str(I.xname(obj));
    return `${nm.charAt(0).toUpperCase()}${nm.slice(1)} ${I.otense(obj, verb)}`;
}
// C ref: objnam.c helm_simple_name(helmet) — "helm" for a hard hat, else "hat".
function helm_simple_name(o) {
    const mat = objects[o?.otyp]?.material | 0;
    const hard = (mat >= 11 /* IRON */ && mat <= 17 /* MITHRIL */) || mat === GLASS;
    return hard ? 'helm' : 'hat';
}
// C ref: mondata.h bigmonst(ptr) — msize >= MZ_LARGE (3).
function bigmonst(ptr) { return (ptr?.msize ?? 2 /* MZ_MEDIUM */) >= 3; }
// C ref: rm.h ZAP_POS(typ) — typ >= POOL; a thrown object cannot pass solid
// terrain.
function zap_pos(typ) { return typ >= 16 /* POOL */; }
// C ref: monmove.c closed_door(x,y) — a door that is shut or locked.
// rm.h D_CLOSED 0x04, D_LOCKED 0x08 (D_ISOPEN is 0x02 and does NOT block).
function closed_door(x, y) {
    const loc = game.level?.at?.(x, y);
    return loc?.typ === 23 /* DOOR */ && ((loc.doormask || 0) & (0x04 | 0x08)) !== 0;
}
// C ref: youprop.h Fumbling / Glib.
function Fumbling() { return !!(game.u?.HFumbling || game.u?.EFumbling); }
function Glib() { return ((game.u?.Glib || 0) > 0) || ((game.u?.uprops?.Glib || 0) > 0); }
// C ref: role.c Role_if(PM_ARCHEOLOGIST) — role 0 in u_init.c's ordering.
const PM_ARCHEOLOGIST = 0;
// C ref: svl.level.objects[x][y] — the top of the floor pile at (x,y).
function top_floor_obj(x, y) { return I.objects_at(x, y)[0] || null; }
// C ref: apply.c use_whip()'s dead-horse test — a horse, warhorse or pony corpse.
const HORSE_CORPSE_NAMES = new Set(['pony', 'horse', 'warhorse']);
function corpse_is_horse(otmp) {
    const nm = monster_by_pmidx(otmp?.corpsenm)?.name;
    return nm != null && HORSE_CORPSE_NAMES.has(nm);
}
// C ref: apply.c use_whip() — mbodypart(mtmp, HAND), pluralized for a two-
// handed weapon.
async function mon_hand_noun(mtmp, otmp) {
    const { mbodypart } = await import('./monmove.js');
    const hand = mbodypart(mtmp, HAND);
    return I.bimanual(otmp) ? I.makeplural(hand) : hand;
}
// C ref: pickup.c pickup_object(obj, count, telekinesis) reduced to the single
// floor-object case the whip snare uses.  Returns 1 when the object was picked
// up, 0 when it was not.
async function pickup_one_object(otmp) {
    if (!otmp) return 0;
    I.obj_extract_self(otmp);
    await I.hold_another_object(otmp, 'You drop %s!', I.doname_invent(otmp), null);
    return 1;
}
// C ref: trap.c reset_utrap(msg) — clear the trapped state.
function reset_utrap(_msg) {
    const u = game.u;
    u.utrap = 0;
    u.utraptype = 0;
}

// ── ok_to_throw (C ref: dothrow.c:296) ───────────────────────────────────────
//
// Common to dothrow() and dofire(): the count prefix becomes the volley limit,
// the pending multi-turn count is consumed, and a form that cannot hold things
// or a hero at OVERLOADED is refused before any prompt is drawn.
// Returns the shot limit, or -1 when the command is refused.
export async function ok_to_throw() {
    const shotlimit = Math.max(0, game.command_count | 0);
    game.multi = 0; /* reset; it's been used up */

    if (I.notake_youmonst()) {
        await update_topl('You are physically incapable of throwing or shooting anything.');
        return -1;
    }
    if (I.nohands_youmonst()) {
        await update_topl("You can't throw or shoot without hands.");
        return -1;
    }
    if (await I.check_capacity_throw()) return -1;
    return shotlimit;
}

// ── endmultishot (C ref: dothrow.c:589) ──────────────────────────────────────
//
// Truncate an in-flight volley: an interruption (the hero knocked back, the
// target dying) makes the current shot the last one.
export async function endmultishot(verbose) {
    const ms = game.m_shot;
    if (!ms) return;
    if (ms.i < ms.n) {
        if (verbose && !game.context?.mon_moving) {
            await update_topl(`You stop ${ms.s ? 'firing' : 'throwing'} after the ${
                ms.i}${ordin(ms.i)} ${ms.s ? 'shot' : 'toss'}.`);
        }
        ms.n = ms.i; /* make current shot be the last */
    }
}
// C ref: hacklib.c ordin(n) — "1st", "2nd", "3rd", "4th"; 11/12/13 take "th".
function ordin(n) {
    const dd = n % 10;
    return (dd === 0 || dd > 3 || Math.trunc((n % 100) / 10) === 1) ? 'th'
        : (dd === 1) ? 'st' : (dd === 2) ? 'nd' : 'rd';
}

// ── autoquiver (C ref: dothrow.c:380) ────────────────────────────────────────
//
// Fill an empty quiver with the best missile in the pack.  Reached only with the
// (non-default) autoquiver option On; RNG-free, but it decides what a later 'f'
// fires, which is not.
export function autoquiver() {
    if (game.uquiver) return;
    let oammo = null, omissile = null, omisc = null, altammo = null;

    for (const otmp of I.inventoryArray()) {
        if (otmp.owornmask || otmp.oartifact || !otmp.dknown) {
            /* skip it */
        } else if (otmp.otyp === ROCK
                   || (otmp.otyp === FLINT && objects[otmp.otyp]?.oc_name_known)
                   || (otmp.oclass === GEM_CLASS
                       && objects[otmp.otyp]?.material === GLASS
                       && objects[otmp.otyp]?.oc_name_known)) {
            if (I.uslinging()) oammo = otmp;
            else if (I.ammo_and_launcher(otmp, game.uswapwep)) altammo = otmp;
            else if (!omisc) omisc = otmp;
        } else if (otmp.oclass === GEM_CLASS) {
            /* skip non-rock gems -- ammo, but the player must pick them */
        } else if (I.is_ammo(otmp)) {
            if (I.ammo_and_launcher(otmp, game.uwep)) oammo = otmp;
            else if (I.ammo_and_launcher(otmp, game.uswapwep)) altammo = otmp;
            else omisc = otmp;
        } else if (I.is_missile(otmp)) {
            omissile = otmp;
        } else if (otmp.oclass === WEAPON_CLASS && I.throwing_weapon(otmp)) {
            if ((objects[otmp.otyp]?.oc_skill ?? 0) === P_DAGGER && !omissile)
                omissile = otmp;
            else if (otmp.otyp === AKLYS)
                continue;
            else
                omisc = otmp;
        }
    }

    if (oammo) I.setuqwep(oammo);
    else if (omissile) I.setuqwep(omissile);
    else if (altammo) I.setuqwep(altammo);
    else if (omisc) I.setuqwep(omisc);
}

// ── the break trio (C ref: dothrow.c:2416-2653) ──────────────────────────────

// C ref: obj.h is_crackable(o) — glass armor cracks rather than shattering.
function is_crackable(obj) {
    return obj?.oclass === ARMOR_CLASS && objects[obj.otyp]?.material === GLASS;
}

// C ref: dothrow.c breaktest(obj) — will this shatter when it hits something
// hard?  Crystal plate mail and the helm of brilliance answer TRUE here but
// survive breakobj() (erode_obj cracks them instead).
export function breaktest(obj) {
    let nonbreakchance = 1;
    if (obj.oclass === ARMOR_CLASS && objects[obj.otyp]?.material === GLASS)
        nonbreakchance = 90;
    // C ref: mkobj.c obj_resists() — the invocation items and Rider corpses
    // resist WITHOUT rolling; a bare rn2(100) here burned a draw on them.
    if (I.obj_resists(obj, nonbreakchance, 99)) return false;
    if (objects[obj.otyp]?.material === GLASS && !obj.oartifact
        && obj.oclass !== GEM_CLASS)
        return true;
    switch (obj.oclass === POTION_CLASS ? POT_WATER : obj.otyp) {
    case EXPENSIVE_CAMERA:
    case POT_WATER: /* really, all potions */
    case EGG:
    case CREAM_PIE:
    case MELON:
    case ACID_VENOM:
    case BLINDING_VENOM:
        return true;
    default:
        return false;
    }
}

// C ref: dothrow.c breakmsg(obj, in_view) — the per-class breakage message.  A
// blanket "X shatters!" (what the port printed for everything) is wrong for
// eggs/melons ("Splat!"), cream pies ("What a mess!") and venom ("Splash!"),
// and omits the " into a thousand pieces" tail mirrors/lenses/cameras take.
export async function breakmsg(obj, in_view) {
    if (is_crackable(obj)) return; /* breakobj() -> erode_obj() speaks */

    const key = obj.oclass === POTION_CLASS ? POT_WATER : obj.otyp;
    let to_pieces = '';
    switch (key) {
    case LENSES:
    case MIRROR:
    case CRYSTAL_BALL:
    case EXPENSIVE_CAMERA:
        to_pieces = ' into a thousand pieces';
        await shatter_msg(obj, in_view, to_pieces);
        break;
    case POT_WATER: /* really, all potions */
        await shatter_msg(obj, in_view, '');
        break;
    case EGG:
    case MELON:
        await update_topl('Splat!');
        break;
    case CREAM_PIE:
        if (in_view) await update_topl('What a mess!');
        break;
    case ACID_VENOM:
    case BLINDING_VENOM:
        await update_topl('Splash!');
        break;
    default:
        // C's default arm is the glass/crystal WAND, which shares the mirror
        // group's text; anything else here is an impossible() in C.
        await shatter_msg(obj, in_view, ' into a thousand pieces');
        break;
    }
}
async function shatter_msg(obj, in_view, to_pieces) {
    if (!in_view) {
        await update_topl('You hear something shatter!');
    } else {
        await update_topl(`${Doname2(obj)} shatter${
            (obj.quan || 1) === 1 ? 's' : ''}${to_pieces}!`);
    }
}

// C ref: dothrow.c release_camera_demon(obj, x, y) — a broken expensive camera
// sometimes lets its picture-painting demon out.  Two rn2(3) draws, then
// makemon()'s own stream.
export async function release_camera_demon(obj, x, y) {
    if (!rn2(3)) {
        // C ref: monst.h PM_HOMUNCULUS / PM_IMP — resolved from the generated
        // mons[] table BY NAME; hand-written pmidx lists in this port have gone
        // stale three separate times.
        const idx = name_to_pmidx(rn2(3) ? 'homunculus' : 'imp');
        const mtmp = (idx >= 0) ? makemon(monster_by_pmidx(idx), x, y, MM_NOMSG) : null;
        if (mtmp) {
            const U = await import('./uhitm.js');
            if (U.canspotmon(mtmp))
                await update_topl('The picture-painting demon is released!');
            mtmp.mpeaceful = obj.cursed ? 0 : 1;
        }
    }
}

// C ref: dothrow.c breakobj(obj, x, y, hero_caused, from_invent) — destroy the
// object and run its side effects.  Returns 1 when obj is gone.
export async function breakobj(obj, x, y, hero_caused, from_invent) {
    let fracture = false;

    if (is_crackable(obj)) {
        // C: erode_obj(obj, ..., ERODE_CRACK, EF_DESTROY|EF_VERBOSE) — glass
        // armor takes four cracks before it is destroyed.  js/mkobj.js carries
        // greatest_erosion() but no erode_obj(), so the crack step is recorded
        // on the object and the item survives, which is erode_obj()'s answer
        // for the first three cracks.
        obj.oeroded2 = Math.min(3, (obj.oeroded2 | 0) + 1);
        return 0;
    }

    switch (obj.oclass === POTION_CLASS ? POT_WATER : obj.otyp) {
    case MIRROR:
        if (hero_caused) I.change_luck(-2);
        break;
    case POT_WATER: /* really, all potions */
        obj.in_use = 1; /* in case it's fatal */
        if (obj.otyp === POT_OIL && obj.lamplit) {
            const { explode_oil } = await import('./explode.js');
            await explode_oil(obj, x, y);
        } else if (next2u(x, y)) {
            const ptr = I.youmonst_data_pub();
            if (!breathless(ptr) || haseyes(ptr)) {
                const P = await import('./potion.js');
                /* wet towel protects both eyes and breathing */
                if (obj.otyp !== POT_WATER && !P.Half_gas_damage()) {
                    if (!breathless(ptr)) {
                        // [what about "familiar odor" when known?]
                        await update_topl('You smell a peculiar odor...');
                    } else {
                        const PS = await import('./polyself.js');
                        let eyes = PS.body_part(EYE);
                        if (PS.eyecount(ptr) !== 1) eyes = I.makeplural(eyes);
                        await update_topl(`Your ${eyes} ${vtense(eyes, 'water')}.`);
                    }
                }
                await P.potionbreathe_hero(obj);
            }
        }
        break;
    case EXPENSIVE_CAMERA:
        await release_camera_demon(obj, x, y);
        break;
    case EGG:
        /* breaking your own eggs is bad luck */
        if (hero_caused && obj.spe && (obj.corpsenm | 0) >= 0)
            I.change_luck(-Math.min(obj.quan || 1, 5));
        break;
    case BOULDER:
    case STATUE:
        /* caller handles disposition; we only do the shop-theft handling */
        fracture = true;
        break;
    default:
        break;
    }

    if (hero_caused && (from_invent || obj.unpaid))
        await check_shop_obj(obj, x, y, true);

    if (!fracture) I.delobj(obj);
    return 1;
}

// C ref: dothrow.c hero_breaks(obj, x, y, breakflags) — breaktest + breakmsg +
// breakobj for something the hero did.
export const BRK_FROM_INV = 0x01;
export async function hero_breaks(obj, x, y, breakflags) {
    const from_invent = (breakflags & BRK_FROM_INV) !== 0;
    const in_view = Blind() ? false : (from_invent || cansee(x, y));
    if (!breaktest(obj)) return 0;
    await breakmsg(obj, in_view);
    return await breakobj(obj, x, y, true, from_invent);
}

// C ref: dothrow.c breaks(obj, x, y) — the same, for a non-hero cause.
export async function breaks(obj, x, y) {
    const in_view = Blind() ? false : cansee(x, y);
    if (!breaktest(obj)) return 0;
    await breakmsg(obj, in_view);
    return await breakobj(obj, x, y, false, false);
}

// ── check_shop_obj (C ref: dothrow.c:1180) ───────────────────────────────────
//
// Billing for an object that left the hero's hands inside a shop.  js/shkroom.js
// carries costly_spot()/addtobill() but no stolen_value()/subfrombill()/
// sellobj(), so only the no_charge marking that the rest of the port reads runs.
export async function check_shop_obj(obj, x, y, broken) {
    const { costly_spot } = await import('./shkroom.js');
    const costly_xy = costly_spot(x, y);
    if (broken || !costly_xy) {
        if (broken) obj.no_charge = 1;
    }
}

// ── gem_accept (C ref: dothrow.c:2308) ───────────────────────────────────────
//
// A unicorn catches a thrown gem.  The Luck change is the point of the routine
// and is RNG-bearing for a cross-aligned unicorn.
export async function gem_accept(mon, obj) {
    const U = await import('./uhitm.js');
    const nogood = ' is not interested in your junk.',
        acceptgift = ' accepts your gift.',
        maybeluck = ' hesitatingly',
        noluck = ' graciously',
        addluck = ' gratefully';
    const sgn = (n) => ((n > 0) ? 1 : (n < 0) ? -1 : 0);
    const is_buddy = sgn(mon?.data?.maligntyp | 0) === sgn(game.u?.ualign?.type | 0);
    const is_gem = objects[obj.otyp]?.material === GEMSTONE;
    let buf = U.Monnam(mon);
    let ret = 0, nopick = false;

    mon.mpeaceful = 1;
    mon.mavenge = 0;

    if (obj.dknown && objects[obj.otyp]?.oc_name_known) {
        /* object properly identified */
        if (is_gem) {
            if (is_buddy) { buf += addluck; I.change_luck(5); }
            else { buf += maybeluck; I.change_luck(rn2(7) - 3); }
        } else { buf += nogood; nopick = true; }
    } else if (obj.oname || objects[obj.otyp]?.oc_uname) {
        /* making guesses */
        if (is_gem) {
            if (is_buddy) { buf += addluck; I.change_luck(2); }
            else { buf += maybeluck; I.change_luck(rn2(3) - 1); }
        } else { buf += nogood; nopick = true; }
    } else {
        /* value completely unknown to the hero */
        if (is_gem) {
            if (is_buddy) { buf += addluck; I.change_luck(1); }
            else { buf += maybeluck; I.change_luck(rn2(3) - 1); }
        } else { buf += noluck; }
    }
    if (!nopick) {
        buf += acceptgift;
        if (obj.unpaid) await check_shop_obj(obj, mon.mx, mon.my, true);
        const { mpickobj } = await import('./steal.js');
        mpickobj(mon, obj);
        ret = 1;
    }
    if (!Blind()) await update_topl(buf);
    // C: `if (!tele_restrict(mon)) rloc(mon, RLOC_MSG)`.
    const T = await import('./teleport.js');
    if (T.rloc) await T.rloc(mon, true);
    return ret;
}

// ── tamedog (C ref: dog.c:1143) ──────────────────────────────────────────────
//
// thitmonst()'s pet-food arm (dothrow.c:2267) sits between the potion arm and
// the engulfer arm and was missing entirely, so every throw at a pet fell
// through to `tmiss(obj, mon, TRUE)`.  That cost the arm's dogfood()
// obj_resists() rn2(100) AND emitted tmiss's `maybe_wakeup && !rn2(3)` wakeup
// roll that C's `tmiss(obj, mon, FALSE)` short-circuits away: two wrong draws
// where C makes one.  tamedog() lives here beside its caller for the same
// reason use_whip() does — js/dog.js is a separate write-lease.

// C ref: mextra.h dogfood enum — lower is more desirable.
const DOGFOOD = 0, ACCFOOD = 2, MANFOOD = 3;
// C ref: monsym.h S_DOG / S_UNICORN (mons[].mlet, this port's data.mcls).
const S_DOG = 4, S_UNICORN = 21;

// C ref: mons[].mlet.  js/dog.js builds a STARTING pet's `data` by hand and
// leaves mcls off it, so read the flag off the mons[] row when the synthetic
// row has none — otherwise a starting pony answers "not S_UNICORN".
function mcls_of(ptr) {
    return ptr?.mcls ?? monster_by_pmidx(ptr?.pmidx)?.mcls;
}
// C ref: mondata.h is_domestic(ptr) == (mflags2 & M2_DOMESTIC).
function is_domestic(ptr) { return (mflags2_of(ptr) & M2_DOMESTIC) !== 0; }
// C ref: mondata.c sticks(ptr) — whether the hero's own form holds a victim.
function sticks(ptr) {
    return dmgtype(ptr, AD_STCK)
        || (dmgtype(ptr, AD_WRAP) && !attacktype(ptr, AT_ENGL))
        || attacktype(ptr, AT_HUGS);
}
function Upolyd() { return !!game.u?.Upolyd; }
function Hallucination() {
    return ((game.u?.uprops?.Hallucination || 0) > 0) || !!game.u?.HHallucination;
}

// C ref: mondata.h befriend_with_obj(ptr, obj) — thrown food that a monster
// will accept: bananas for monkeys and apes; any food for a domestic animal,
// except that horses (the non-unicorn half of S_UNICORN) take only always-veggy
// food or a lichen corpse.
export function befriend_with_obj(ptr, obj) {
    const pm = ptr?.pmidx;
    if (pm != null && (pm === name_to_pmidx('monkey') || pm === name_to_pmidx('ape')))
        return obj.otyp === BANANA;
    return is_domestic(ptr) && obj.oclass === FOOD_CLASS
        && (mcls_of(ptr) !== S_UNICORN
            || objects[obj.otyp]?.material === VEGGY
            || (obj.otyp === CORPSE && obj.corpsenm === name_to_pmidx('lichen')));
}

// C ref: dog.c initedog(mtmp, everything) — consumes no RNG.  u.uconduct.pets++
// and the livelog line are the only side effects outside the edog struct.
function initedog(mtmp, everything) {
    const edogp = mtmp.edog;
    const minhungry = (game.moves || 0) + 1000;
    const minimumtame = is_domestic(mtmp.data) ? 10 : 5;

    mtmp.mtame = Math.max(minimumtame, mtmp.mtame | 0);
    mtmp.mpeaceful = 1;
    mtmp.mavenge = 0;
    set_malign(mtmp);                   /* recalc alignment now that it's tamed */
    if (everything) {
        mtmp.mleashed = 0;
        mtmp.meating = 0;
        edogp.droptime = 0;
        edogp.dropdist = 10000;
        edogp.apport = acurr_eff(A_CHA);
        edogp.whistletime = 0;
        edogp.ogoal = { x: -1, y: -1 };  /* force error if used before set */
        edogp.abuse = 0;
        edogp.revivals = 0;
        edogp.mhpmax_penalty = 0;
        edogp.killed_by_u = 0;
    } else if (!(edogp.apport > 0)) {
        edogp.apport = 1;
    }
    if (!((edogp.hungrytime | 0) >= minhungry)) edogp.hungrytime = minhungry;
    const u = game.u;
    if (u) { u.uconduct = u.uconduct || {}; u.uconduct.pets = (u.uconduct.pets | 0) + 1; }
}

// C ref: dog.c tamedog(mtmp, obj, givemsg) — TRUE means the monster became tame
// (or ate the thrown food), which tells thitmonst() the object is gone.
export async function tamedog(mtmp, obj, givemsg) {
    const u = game.u;
    const DM = await import('./dogmove.js');
    const U = await import('./uhitm.js');
    let blessed_scroll = false;

    if (obj && (obj.oclass === SCROLL_CLASS || obj.oclass === SPBOOK_CLASS)) {
        blessed_scroll = !!obj.blessed;
        obj = null;                     /* the rest assumes 'obj' is food */
    }
    /* reduce timed sleep or paralysis, leaving mcanmove as-is */
    if (mtmp.mfrozen) mtmp.mfrozen = Math.floor((mtmp.mfrozen + 1) / 2);
    /* end indefinite sleep; distance==1 limits the waking to mtmp */
    if (mtmp.msleeping) {
        const { wake_nearto } = await import('./cmd.js');
        await wake_nearto(mtmp.mx, mtmp.my, 1);
    }
    /* the Wiz, Medusa and the quest nemeses aren't even made peaceful */
    if (mtmp.iswiz || mtmp.data?.pmidx === name_to_pmidx('Medusa')
        || (mflags3_of(mtmp.data) & M3_WANTSARTI))
        return false;

    if (givemsg && !mtmp.mpeaceful && U.canspotmon(mtmp)) {
        await update_topl(`${U.Monnam(mtmp)} seems ${
            Hallucination() ? 'really chill' : 'more amiable'}.`);
        givemsg = false;                /* don't give another message below */
    }
    mtmp.mpeaceful = 1;
    set_malign(mtmp);
    // C reads flags.moonphase, which newgame() latches once (allmain.c:57);
    // nothing in this port stores it yet, so recompute when it is absent.
    const moonphase = game.flags?.moonphase ?? phase_of_the_moon();
    if (moonphase === FULL_MOON && night() && rn2(6) && obj
        && mcls_of(mtmp.data) === S_DOG)
        return false;

    /* if we cannot tame it, at least it's no longer afraid */
    mtmp.mflee = 0;
    mtmp.mfleetim = 0;

    /* make a grabber let go now, whether it becomes tame or not */
    if (mtmp === u.ustuck) {
        if (u.uswallow) {
            const MH = await import('./mhitu.js');
            await MH.expels(mtmp, mtmp.data, true);
        } else if (!(Upolyd() && sticks(I.youmonst_data_pub()))) {
            /* C ref: mon.c unstuck(mtmp) */
            u.ustuck = null;
            u.uswallow = 0;
            U.unstuck_mspec_used(mtmp);
        }
    }

    /* feeding it treats makes it tamer */
    if (mtmp.mtame && obj) {
        // C reads EDOG(mtmp)->hungrytime unconditionally; this port can hold a
        // tame monster with no edog (read.js's MM_EDOG lights), so treat a
        // missing hunger clock as "not hungry" (C's initedog always leaves it
        // above svm.moves) rather than dereferencing it.  The guard sits AFTER
        // dogfood() so the obj_resists rn2(100) still fires where C fires it.
        let tasty;
        if (mtmp.mcanmove && !mtmp.mconf && !mtmp.meating
            && ((tasty = DM.dogfood(mtmp, obj)) === DOGFOOD
                || (tasty <= ACCFOOD
                    && (mtmp.edog?.hungrytime ?? Infinity) <= (game.moves || 0)))
            && mtmp.edog) {
            /* pet will "catch" and eat this thrown food */
            if (U.canseemon(mtmp)) {
                const csz = monster_by_pmidx(obj.corpsenm)?.msize;
                const big_corpse = obj.otyp === CORPSE && csz != null
                    && csz > (monster_by_pmidx(mtmp.data?.pmidx)?.msize ?? 0);
                await update_topl(`${U.Monnam(mtmp)} catches ${the_str(I.xname(obj))}${
                    !big_corpse ? '.' : ', or vice versa!'}`);
            } else if (cansee(mtmp.mx, mtmp.my)) {
                await update_topl(`${Tobjnam(obj, 'stop')}.`);
            }
            place_object(obj, mtmp.mx, mtmp.my); /* dog_eat expects a floor object */
            await DM.dog_eat(mtmp, mtmp.edog, obj, mtmp.mx, mtmp.my);
            /* a non-null result suppresses tmiss()'s "miss" message and
               implies the object has been deleted */
            return true;
        }
        return false;
    }

    /* maximum tameness is 20, only reachable via eating; taming magic may raise
       an already-tame monster below 10 */
    if (mtmp.mtame && mtmp.mtame < 10) {
        if (mtmp.mtame < rnd(10)) mtmp.mtame++;
        if (blessed_scroll) {
            mtmp.mtame += 2;
            if (mtmp.mtame > 10) mtmp.mtame = 10;
        }
        return false;                   /* didn't just get tamed */
    }
    /* pacify an angry shopkeeper but don't tame them */
    if (mtmp.isshk) {
        const S = await import('./shk.js');
        await S.make_happy_shk(mtmp, false);
        return false;
    }

    if (!mtmp.mcanmove
        || mtmp.isshk || mtmp.isgd || mtmp.ispriest || mtmp.isminion
        || is_covetous(mtmp.data) || is_human_flag(mtmp.data)
        || (is_demon_flag(mtmp.data) && !is_demon_flag(I.youmonst_data_pub()))
        || (obj && DM.dogfood(mtmp, obj) >= MANFOOD))
        return false;

    // C: `mtmp->m_id == svq.quest_status.leader_m_id`.  This port carries no
    // leader_m_id; monsters.h marks every quest-leader species MS_LEADER, which
    // js/questpgr.js already uses as the leader identity (no RNG either way).
    if (msound_of(mtmp.data) === MS_LEADER)
        return false;

    /* add the pet extension */
    if (!mtmp.edog) {
        mtmp.edog = {};                 /* newedog(mtmp) */
        initedog(mtmp, true);
    } else {
        initedog(mtmp, false);
    }

    if (obj) {                          /* thrown food */
        /* defer eating until the edog extension has been set up */
        place_object(obj, mtmp.mx, mtmp.my);
        // C passes devour=TRUE here (it halves dog_nutrition()'s hungrytime
        // bump); js/dogmove.js's dog_eat has no devour parameter yet.
        if (await DM.dog_eat(mtmp, mtmp.edog, obj, mtmp.mx, mtmp.my) === 2)
            return true;                /* oops, it died... */
    }

    if (givemsg && U.canspotmon(mtmp))
        await update_topl(`${U.Monnam(mtmp)} seems quite ${
            Hallucination() ? 'approachable' : 'friendly'}.`);

    newsym(mtmp.mx, mtmp.my);
    // C's redraw_worm(mtmp) follows for a long worm; no tamable-by-food species
    // has a wormno.
    if (attacktype(mtmp.data, AT_WEAP)) {
        mtmp.weapon_check = NEED_HTH_WEAPON;
        const M = await import('./monmove.js');
        await M.mon_wield_item(mtmp);
    }
    return true;
}

// ── throw_gold (C ref: dothrow.c:2655) ───────────────────────────────────────
//
// Throwing a stack of coins.  C routes here from throw_obj() BEFORE the
// canletgo/welded/multishot machinery, so gold never rolls a volley and never
// splits: the whole stack flies.
export async function throw_gold(obj) {
    const u = game.u;
    if (!u.dx && !u.dy && !u.dz) {
        await update_topl('You cannot throw gold at yourself.');
        return ECMD_CANCEL;
    }
    I.freeinv(obj);

    let bx = u.ux, by = u.uy;
    if (u.dz) {
        if (u.dz < 0) {
            await update_topl(`The gold hits the ${ceiling(u.ux, u.uy)}, then falls back on top of your ${
                I.body_part(HEAD)}.`);
            if (game.uarmh)
                await update_topl(`Fortunately, you are wearing ${an(helm_simple_name(game.uarmh))}!`);
        }
    } else {
        /* consistent with range for normal objects */
        const range = Math.trunc(I.acurrstr() / 2) - Math.trunc((obj.owt || 0) / 40);
        const odx = u.ux + u.dx, ody = u.uy + u.dy;
        // C: `!ZAP_POS(levl[odx][ody].typ) || closed_door(odx, ody)` — with no
        // room to move, the coins land at the hero's feet.
        if (!isok(odx, ody) || !zap_pos(typ_at(odx, ody)) || closed_door(odx, ody)) {
            /* bhitpos stays on the hero */
        } else {
            const land = I.bhit_thrown_landing(u.dx, u.dy, range);
            bx = land.x; by = land.y;
            if (land.mon && (await ghitm(land.mon, obj))) return ECMD_TIME;
        }
    }

    if (u.dz > 0) await update_topl(`The gold hits the ${surface(bx, by)}.`);
    place_object(obj, bx, by);
    obj.where = 3 /* OBJ_FLOOR */;
    I.stackobj(obj);
    newsym(bx, by);
    return ECMD_TIME;
}

// C ref: steal.c ghitm(mtmp, gold) — a monster reacts to gold thrown at it.
// Returns TRUE when the monster keeps it.  The bribe/leprechaun/soldier arms
// need the gold-lover and bribe subsystems, which this port does not have; the
// wake-and-pick-up behaviour common to every arm is what runs.
async function ghitm(mtmp, gold) {
    const U = await import('./uhitm.js');
    mtmp.msleeping = 0;
    if (!mtmp.mcanmove) return false;
    await U.wakeupAttack(mtmp, false);
    const { mpickobj } = await import('./steal.js');
    mpickobj(mtmp, gold);
    return true;
}

// ── use_whip (C ref: apply.c:2955) ───────────────────────────────────────────
//
// Reached from dofire() when the quiver is empty, autoquiver is off and the
// wielded weapon is a bullwhip — the Archeologist's starting state, so 'f' on
// turn one lands here.  Without it dofire() printed "You have no ammunition
// readied." and opened the fire prompt, so every following keystroke was read
// by the wrong reader.
export async function use_whip(obj, getDir) {
    const U = await import('./uhitm.js');
    const u = game.u;
    const msg_slipsfree = 'The bullwhip slips free.';
    const msg_snap = 'Snap!';
    const res = ECMD_OK;

    if (obj !== game.uwep) {
        // C wields it and re-queues doapply; the wield is what costs the turn.
        if (await I.wield_tool(obj, 'lash')) return ECMD_TIME;
        return ECMD_OK;
    }
    const dir = await getDir();
    if (!dir) return res | ECMD_CANCEL;
    u.dx = dir.dx; u.dy = dir.dy; u.dz = dir.dz || 0;

    let mtmp, rx, ry;
    if (u.uswallow) {
        mtmp = u.ustuck;
        rx = mtmp.mx; ry = mtmp.my;
    } else {
        const { confdir } = await import('./cmd.js');
        if (confdir) confdir(false);
        rx = u.ux + u.dx; ry = u.uy + u.dy;
        if (!isok(rx, ry)) {
            await update_topl('You miss.');
            return res;
        }
        mtmp = m_at(rx, ry);
    }

    /* fake some proficiency checks */
    let proficient = 0;
    if (I.Role_if(PM_ARCHEOLOGIST)) ++proficient;
    const dex = acurr_eff(A_DEX);
    if (dex < 6) proficient--;
    else if (dex >= 14) proficient += (dex - 14);
    if (Fumbling()) --proficient;
    if (proficient > 3) proficient = 3;
    if (proficient < 0) proficient = 0;

    const rtyp = typ_at(rx, ry);
    const Levitation = !!(u?.uprops?.Levitation);
    const Flying = !!(u?.uprops?.Flying);
    const Underwater = !!u.uinwater;

    if (u.uswallow) {
        await update_topl('There is not enough room to flick your bullwhip.');

    } else if (Underwater) {
        await update_topl('There is too much resistance to flick your bullwhip.');

    } else if (u.dz < 0) {
        await update_topl(`You flick a bug off of the ${ceiling(u.ux, u.uy)}.`);

    } else if (!u.dz && (IS_WATERWALL(rtyp) || rtyp === LAVAWALL)) {
        await update_topl('You cause a small splash.');
        return ECMD_TIME;

    } else if ((!u.dx && !u.dy) || (u.dz > 0)) {
        /* Sometimes you hit your steed by mistake */
        if (u.usteed && !rn2(proficient + 2)) {
            await update_topl(`You whip ${U.mon_nam(u.usteed)}!`);
            return ECMD_TIME;
        }
        if (is_pool_or_lava_at(u.ux, u.uy) || IS_WATERWALL(rtyp)
            || rtyp === LAVAWALL) {
            await update_topl('You cause a small splash.');
            return ECMD_TIME;
        }
        if (Levitation || u.usteed || Flying) {
            /* have a shot at snaring something on the floor */
            const otmp = top_floor_obj(u.ux, u.uy);
            if (otmp && otmp.otyp === CORPSE && corpse_is_horse(otmp)) {
                await update_topl('Why beat a dead horse?');
                return ECMD_TIME;
            }
            if (otmp && proficient) {
                await update_topl(`You wrap your bullwhip around ${
                    an(I.singular_name(otmp))} on the ${surface(u.ux, u.uy)}.`);
                if (rnl(6) || (await pickup_one_object(otmp)) < 1)
                    await update_topl(msg_slipsfree);
                return ECMD_TIME;
            }
        }
        let dam = rnd(2) + I.dbon() + (obj.spe | 0);
        if (dam <= 0) dam = 1;
        await update_topl(`You hit your ${I.body_part(FOOT)} with your bullwhip.`);
        I.losehp_throw(dam);
        return ECMD_TIME;

    } else if ((Fumbling() || Glib()) && !rn2(5)) {
        await update_topl(`The bullwhip slips out of your ${I.body_part(HAND)}.`);
        I.dropx(obj);

    } else if (u.utrap && u.utraptype === TT_PIT) {
        /* trying to whip your way out of a pit */
        let wrapped_what = I.sobj_at(BOULDER, rx, ry) ? 'a boulder'
            : IS_FURNITURE(rtyp) ? 'something' : null;
        let whipattack_it = false;

        if (mtmp) {
            if (bigmonst(mtmp.data) && U.canspotmon(mtmp))
                wrapped_what = U.mon_nam(mtmp);
            if (!wrapped_what) whipattack_it = true;
        }
        if (whipattack_it)
            return await whipattack(mtmp, rx, ry, proficient, msg_slipsfree, msg_snap);
        if (wrapped_what) {
            await update_topl(`You wrap your bullwhip around ${wrapped_what}.`);
            if (proficient && rn2(proficient + 2)) {
                await update_topl('You yank yourself out of the pit!');
                await reset_utrap(true);
            } else {
                await update_topl(msg_slipsfree);
            }
            if (mtmp) await U.wakeupAttack(mtmp, true);
        } else {
            await update_topl(msg_snap);
        }

    } else if (mtmp) {
        return await whipattack(mtmp, rx, ry, proficient, msg_slipsfree, msg_snap);

    } else {
        await update_topl(msg_snap);
    }
    return ECMD_TIME;
}

// C ref: apply.c use_whip() `whipattack:` — reveal a hidden target, else try to
// disarm it, else attack it.
async function whipattack(mtmp, rx, ry, proficient, msg_slipsfree, msg_snap) {
    const U = await import('./uhitm.js');
    let otmp = null;

    if (!U.canspotmon(mtmp)) {
        mtmp.mundetected = 0; /* bring a non-mimic hider out of hiding */
        const spotitnow = U.canspotmon(mtmp);
        await update_topl(`${!spotitnow ? 'A monster' : U.Monnam(mtmp)} is there that you ${
            !Blind() ? "couldn't see" : "hadn't noticed"}.`);
        if (spotitnow) newsym(rx, ry);
    } else {
        /* known target: try to disarm rather than attack */
        otmp = mtmp.mw || null;
    }

    if (otmp) {
        const gotit = proficient && (!Fumbling() || !rn2(10));
        await update_topl(`You wrap your bullwhip around ${I.yname(otmp)}.`);
        if (gotit) {
            I.obj_extract_self(otmp);
            mtmp.mw = null;
            mtmp.weapon_check = 1 /* NEED_WEAPON */;
            switch (rn2(proficient + 1)) {
            case 2: /* to floor near you */
                await update_topl(`You yank ${I.yname(otmp)} to the ${
                    surface(game.u.ux, game.u.uy)}!`);
                place_object(otmp, game.u.ux, game.u.uy);
                otmp.where = 3 /* OBJ_FLOOR */;
                I.stackobj(otmp);
                break;
            case 3: /* right into your inventory */
                await update_topl(`You snatch ${I.yname(otmp)}!`);
                await I.hold_another_object(otmp, 'You drop %s!', I.doname_invent(otmp), null);
                break;
            default: /* to floor beneath mon */
                await update_topl(`You yank ${the_str(I.cxname_singular(otmp))} from ${
                    I.s_suffix(U.mon_nam(mtmp))} ${await mon_hand_noun(mtmp, otmp)}!`);
                place_object(otmp, mtmp.mx, mtmp.my);
                otmp.where = 3 /* OBJ_FLOOR */;
                I.stackobj(otmp);
                break;
            }
        } else {
            await update_topl(msg_slipsfree);
        }
    } else { /* mtmp isn't wielding a weapon; attack it */
        await update_topl(`You flick your bullwhip towards ${U.mon_nam(mtmp)}.`);
        if (proficient && (await force_attack(mtmp))) return ECMD_TIME;
        await update_topl(msg_snap);
    }
    /* regardless of mtmp's weapon or hero's proficiency */
    await U.wakeupAttack(mtmp, true);
    return ECMD_TIME;
}

// ── boomhit (C ref: zap.c:4146) ──────────────────────────────────────────────
//
// A thrown boomerang follows a curving 10-step path rather than a straight
// line, so throwit() must NOT run it through bhit().  Treating a boomerang as
// an ordinary missile walked a straight line, hit the wrong squares and never
// rolled the rn2(20)-vs-DEX catch at the end of the curve.
//
// Returns { caught: true } when the hero caught it, { mon } when a monster is
// to be hit by the caller, or { gone: true } when the boomerang was used up.
//
// C ref: decl.c xdir[]/ydir[] — direction 0 is W, then counterclockwise... no:
// the table runs W, NW, N, NE, E, SE, S, SW.
const XDIR = [-1, -1, 0, 1, 1, 1, 0, -1];
const YDIR = [0, -1, -1, -1, 0, 1, 1, 1];
const N_DIRS = 8;
function xytodir(x, y) {
    for (let dd = 0; dd < N_DIRS; dd++)
        if (x === XDIR[dd] && y === YDIR[dd]) return dd;
    return -1; /* DIR_ERR */
}
export async function boomhit(obj, dx, dy, skillsnap) {
    const u = game.u;
    // C ref: you.h URIGHTY — a right-handed hero's boomerang curves
    // counterclockwise.  u_init.c sets uhandedness with rn2(10) at chargen.
    const counterclockwise = (u.uhandedness | 0) === 0 /* RIGHT_HANDED */;
    let nhits = Math.max(1, (obj.spe | 0) + 1);
    let bx = u.ux, by = u.uy;
    let i = xytodir(dx, dy);
    if (i < 0) return { mon: null };

    for (let ct = 0; ct < 10; ct++) {
        i = ((i % N_DIRS) + N_DIRS) % N_DIRS;
        dx = XDIR[i]; dy = YDIR[i];
        bx += dx; by += dy;
        if (!isok(bx, by)) { bx -= dx; by -= dy; break; }
        const mtmp = m_at(bx, by);
        if (mtmp) {
            // C ref: zap.c:4187 m_respond(mtmp) — a shrieker's shriek (and an
            // erinys' aggravate) fires here; js/monmove.js keeps m_respond
            // module-private so it cannot be called from outside that file.
            if (nhits-- < 0) return { mon: mtmp };
            if (await I.thitmonst(mtmp, obj, skillsnap)) return { gone: true };
            break;
        }
        if (!zap_pos(typ_at(bx, by)) || closed_door(bx, by)) {
            bx -= dx; by -= dy; break;
        }
        if (bx === u.ux && by === u.uy) { /* ct == 9 */
            if (Fumbling() || rn2(20) >= acurr_eff(A_DEX)) {
                const U = await import('./uhitm.js');
                const dam = U.dmgval(obj, { data: I.youmonst_data_pub() });
                await thitu(10 + (obj.spe | 0), dam, obj, 'boomerang');
                await endmultishot(true);
                break;
            }
            /* we catch it */
            await update_topl('You skillfully catch the boomerang.');
            return { caught: true };
        }
        if (IS_SINK(typ_at(bx, by))) {
            await update_topl('Klonk!');
            break; /* boomerang falls on sink */
        }
        /* ct==0 initial position and ct==5 opposite position repeat the delta */
        if (ct % 5 !== 0) i = counterclockwise ? (i + 7) : (i + 1);
    }
    return { mon: null, x: bx, y: by };
}

// C ref: mthrowu.c thitu(tlev, dam, objp, name) — a missile hits (or misses)
// the hero.  The rnd(20) fires whether or not it connects.
export async function thitu(tlev, dam, obj, name) {
    const u = game.u;
    const dieroll = rnd(20);
    const onm = an(name);
    if ((u.uac | 0) + tlev <= dieroll) {
        if (Blind() || game.flags?.verbose === false) {
            await update_topl('It misses.');
        } else if ((u.uac | 0) + tlev <= dieroll - 2) {
            const s = onm.charAt(0).toUpperCase() + onm.slice(1);
            await update_topl(`${s} misses you.`);
        } else {
            await update_topl(`You are almost hit by ${onm}.`);
        }
        return 0;
    }
    const excl = dam < 0 ? '?' : (dam <= 4 ? '.' : '!');
    if (Blind() || game.flags?.verbose === false)
        await update_topl(`You are hit${excl}`);
    else
        await update_topl(`You are hit by ${onm}${excl}`);
    I.losehp_throw(dam);
    const { exercise } = await import('./attrib.js');
    exercise(0 /* A_STR */, false);
    return 1;
}

// C ref: uhitm.c force_attack(mtmp, pacifist) — do_attack() with forcefight set.
async function force_attack(mtmp) {
    const U = await import('./uhitm.js');
    const ctx = game.context || (game.context = {});
    const save = ctx.forcefight;
    ctx.forcefight = true;
    try {
        return await U.do_attack(mtmp);
    } finally {
        ctx.forcefight = save;
    }
}
