// engrave.js — the 'E' engrave command.
// C ref: nethack-c-v5/upstream/src/engrave.c.
// Implements the player command and its implement effects, with the shared
// engraving store in mklev.js. Bones cleanup and grave disturbance also live
// here, matching their C ownership.
//
// Engraving runs as a moveloop occupation (set_occupation(engrave)): doengrave()
// does the stylus/text/smudge setup and consumes NO time itself; the per-character
// engraving and the post-setup world turn run in the occupation driver in
// allmain.js (modelled on the dig/learn drivers).  C ref: allmain.c:543-558.

import { check_unpaid_usage } from './shk.js';
import { game } from './gstate.js';
import { rn1 } from './rng.js';
import { rn2, rnd } from './rnd.js';
import { goodpos } from './teleport.js';
import { is_pool } from './look.js';
import { is_pool_or_lava } from './dbridge.js';
import { Is_airlevel, Is_waterlevel, CLOUD, IS_FOUNTAIN, IS_AIR, ACCESSIBLE, isok, COLNO, ROWNO, NO_MM_FLAGS } from './const.js';
import { db_under_typ, is_ice } from './dbridge.js';
import { impossible, You_see } from './pline.js';
import { permonstTemplate, is_demon } from './makemon.js';
import { PM_GHOUL, PM_AIR_ELEMENTAL } from './pm.generated.js';
import { wand_explode } from './read.js';
import { sanitize_name } from './bones.js';
import { mon_nam } from './uhitm.js';
import { nhgetch } from './input.js';
import { flush_screen, newsym } from './display.js';
import { pline } from './pline.js';
import { topl_park_cursor } from './display.js';
import { livelog_printf } from './pline.js';
import { LL_CONDUCT } from './const.js';
import { getlin } from './windows.js';
import { zappable, zapnodir, learnwand, make_blinded } from './zap.js';
import { resists_blnd } from './mondata.js';
import { yn_function } from './cmd.js';
import { getObjFromGetobj, body_part, yname, is_blade, pooleffects_is_lava as is_lava } from './cmd.js';
import { surface as surface_real, ceiling } from './dungeon.js';
import { Yname2 } from './objnam.js';
import { dry_a_towel } from './weapon.js';
import { welded } from './wield.js';
import { is_art } from './artifact.js';
import { bimanual, is_boots } from './do_wear.js';
import { Yobjnam2, doname, xname, Tobjnam, otense } from './objnam.js';
import { check_capacity } from './hack.js';
import { useup } from './invent.js';
import { altar_wrath } from './pray.js';
import { GETOBJ_PROMPT, HAND, FINGERTIP } from './const.js';
import { exercise } from './attrib.js';
import { more_experienced } from './exper.js';
import { object_tough } from './o_init.js';
import { splitobj } from './makemon.js';
import { move_engr_at } from './mklev.js';
import { obj_extract_self } from './mkobj.js';
import { hold_another_object } from './invent.js';
import { prinv } from './invent.js';
import { update_inventory } from './invent.js';
import './hold_another_object.js';
import { engravings_list } from './mklev.js';
import { makemon } from './makemon.js';
import { xcrypt } from './hacklib.js';
import { DUST, ENGRAVE, BURN, MARK, ENGR_BLOOD, HEADSTONE, A_WIS,
         ECMD_OK, ECMD_CANCEL, ECMD_FAIL, ECMD_TIME, ICE, IS_ALTAR, BUFSZ,
         DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, DEAF, DB_ICE, DB_UNDER, BLINDED, CONFUSION, STUNNED, HALLUC, HALLUC_RES } from './const.js';
import { surface } from './dungeon.js'; // relocate-fns
import { FLYING, LEVITATION } from './const.js'; // relocate-fns
import { sticks } from './dog.js'; // relocate-fns
import { _uprop_on } from './hold_another_object.js'; // relocate-fns
import { attacktype } from './mondata.js'; // relocate-fns
import { P_SKILL } from './skills.js'; // relocate-fns
import { t_at, uescaped_shaft, uteetering_at_seen_pit } from './trap.js'; // relocate-fns
import { GRAVE, N_ENGRAVE, ROOM } from './const.js'; // relocate-fns
import { ENGRAVE_CHUNK_SIZE, ENGRAVE_LINES, ENGRAVE_OFFSETS, EPITAPH_CHUNK_SIZE, EPITAPH_LINES, EPITAPH_OFFSETS } from './engrave_data.js'; // relocate-fns
import { ENV } from './hostenv.js'; // relocate-fns
import { _engr_map, engr_reset_text_pointers, get_rnd_line_from_section } from './mklev.js'; // relocate-fns
import { set_levltyp } from './mkmaze.js'; // relocate-fns
import { pushRngLogEntry } from './rng.js'; // relocate-fns
import { getrumor } from './rumors.js'; // relocate-fns
import { nomul } from './hack.js'; // relocate-fns
import { _result_append_join } from './cmd.js'; // relocate-fns
import { _topl_stash_result, flush_pending_messages, force_more, Unaware as wizard_Unaware } from './display.js'; // relocate-fns
import { impossible as real_impossible } from './pline.js'; // relocate-fns
import { routeTag } from './route_telemetry.js'; // relocate-fns

/* ── object class numbers (objclass.h OBJCLASS enum) ─────────────────────────── */
const ILLOBJ_CLASS = 1;
const WEAPON_CLASS = 2;
const ARMOR_CLASS = 3;
const RING_CLASS = 4;
const TOOL_CLASS = 6;
const FOOD_CLASS = 7, SCROLL_CLASS = 9, SPBOOK_CLASS = 10;
const WAND_CLASS = 11;
const GEM_CLASS = 13;
const ROCK_CLASS = 14, BALL_CLASS = 15;
const VENOM_CLASS = 17;

const MAGIC_MARKER = 242; /* objects[] otyp (read.js / mklev.js) */
const TOWEL = 234; /* objects.h TOOL() TOWEL; was 125 = BANDED_MAIL */
const ATHAME = 38;
const ART_FIRE_BRAND = 10; /* artilist.h artifact enum, also used by cmd.js */
const WAND_BACKFIRE_CHANCE = 100;

// Wand type constants (objects.h)
const WAN_LIGHT = 410;
const WAN_SECRET_DOOR_DETECTION = 411;
const WAN_ENLIGHTENMENT = 412;
const WAN_CREATE_MONSTER = 413;
const WAN_WISHING = 414;
const WAN_STASIS = 415;
const WAN_NOTHING = 416;
const WAN_STRIKING = 417;
const WAN_MAKE_INVISIBLE = 418;
const WAN_SLOW_MONSTER = 419;
const WAN_SPEED_MONSTER = 420;
const WAN_UNDEAD_TURNING = 421;
const WAN_POLYMORPH = 422;
const WAN_CANCELLATION = 423;
const WAN_TELEPORTATION = 424;
const WAN_OPENING = 425;
const WAN_LOCKING = 426;
const WAN_PROBING = 427;
const WAN_DIGGING = 428;
const WAN_MAGIC_MISSILE = 429;
const WAN_FIRE = 430;
const WAN_COLD = 431;
const WAN_SLEEP = 432;
const WAN_DEATH = 433;
const WAN_LIGHTNING = 434;

const S_VAMPIRE = 48;
const S_VORTEX = 22;
const M1_ANIMAL = 0x00040000;

function is_vampire(ptr) { return !!ptr && (ptr.mlet | 0) === S_VAMPIRE; }
function is_whirly(ptr) { return !!ptr && ((ptr.mlet | 0) === S_VORTEX || (ptr.pmidx | 0) === PM_AIR_ELEMENTAL); }
function is_animal(ptr) { return !!ptr && ((ptr.mflags1 | 0) & M1_ANIMAL) !== 0; }

const HANDS_SYM = '-'; /* const.js HANDS_SYM — getobj's bare-hands option */

/* getobj suggestion sentinels (invent.c). */
const GETOBJ_DOWNPLAY = 1;
const GETOBJ_SUGGEST = 2;

/* Small property helpers for engraving's smudge checks (youprop.h). */
function _hasProp(u, prop) {
    const p = u.uprops && u.uprops[prop];
    if (!p) return false;
    if (prop === CONFUSION || prop === STUNNED) return !!p.intrinsic;
    return !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
}
/* const.js: STUNNED=13, CONFUSION=14, BLINDED=15, HALLUC=23 */
function uBlind(u) { return _hasProp(u, BLINDED); }
function uConfusion(u) { return _hasProp(u, CONFUSION); }
function uStunned(u) { return _hasProp(u, STUNNED); }
/* C youprop.h:115-120: Hallucination is an intrinsic timeout suppressed by
 * intrinsic or extrinsic hallucination resistance, not HALLUC.blocked. */
function uHallu(u) {
    const resistance = u.uprops?.[HALLUC_RES];
    return !!u.uprops?.[HALLUC]?.intrinsic
        && !(resistance?.intrinsic || resistance?.extrinsic);
}
/* C youprop.h:125: #define Deaf (HDeaf || EDeaf || u.uroleplay.deaf) */
function uDeaf(u) {
    const p = u.uprops?.[DEAF];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0) || u.uroleplay?.deaf);
}

function body_part_fingertip() { return body_part(FINGERTIP); }

// C ref: engrave.c:296-315 engr_can_be_felt(ep)
export function engr_can_be_felt(ep) {
    switch (ep?.engr_type | 0) {
    case ENGRAVE:
    case HEADSTONE:
    case BURN:
        return true;
    case DUST:
    case MARK:
    case ENGR_BLOOD:
    default:
        return false;
    }
}

export { is_ice };

/* C engrave.c:473. welded() also identifies the weapon's curse. */
export function freehand() {
    const u = game.u || {};
    const uwep = u.uwep, uarms = u.uarms;
    return !uwep || !welded(uwep)
        || (!bimanual(uwep) && (!uarms || !uarms.cursed));
}

/* C engrave.c:218 — caller has already established that the hero cannot reach. */
export async function cant_reach_floor(x, y, up, check_pit, wand_engraving) {
    await pline("%s can't reach the %s.",
                wand_engraving
                    ? 'The wand does nothing more, and the tip of the wand'
                    : 'You',
                up ? ceiling(x, y)
                    : (check_pit && can_reach_floor(false)) ? 'bottom of the pit'
                                                          : surface_real(x, y));
}

/* C engrave.c:250-261 sengr_at(s, x, y, strict) — check for named engraving at (x,y) */
export function sengr_at(s, x, y, strict) {
    const ep = engr_at(x, y);
    if (ep && (ep.engr_type | 0) !== HEADSTONE
        && (ep.engr_time | 0) <= ((game.moves ?? game.u?.moves ?? 0) | 0)) {
        const txt = String(ep.text ?? '');
        if (strict ? txt.toLowerCase() === String(s).toLowerCase()
                   : txt.toLowerCase().includes(String(s).toLowerCase()))
            return ep;
    }
    return null;
}

/* C engrave.c:264-268 u_wipe_engr(cnt) */
export function u_wipe_engr(cnt) {
    if (can_reach_floor(true))
        wipe_engr_at(game.u?.ux | 0, game.u?.uy | 0, cnt, false);
}

/* stylus_ok — getobj callback (engrave.c:483).  Suggests weapons, wands, gems,
 * rings, and markers/towels; downplays everything else. */
function stylus_ok(obj) {
    if (!obj) return GETOBJ_SUGGEST; /* the bare-hands "-" entry */
    const oc = obj.oclass | 0;
    if (oc === WEAPON_CLASS || oc === WAND_CLASS
        || oc === GEM_CLASS || oc === RING_CLASS)
        return GETOBJ_SUGGEST;
    if (oc === TOOL_CLASS && (obj.otyp === TOWEL || obj.otyp === MAGIC_MARKER))
        return GETOBJ_SUGGEST;
    return GETOBJ_DOWNPLAY;
}

/* C engrave.c:503-539 — can the hero engrave at their location at all? */
async function u_can_engrave() {
    const u = game.u || {};
    /* C engrave.c:510-518 — swallowed: animal engulfers get the Jonah joke,
     * whirly ones cannot be reached; amorphous ones fall through (jello). */
    const lev = game.level?.at?.(u.ux, u.uy);
    /* C rm.h:146 SURFACE_AT includes the terrain under a raised drawbridge. */
    const levtyp = lev?.typ === DRAWBRIDGE_UP
        ? db_under_typ(lev.drawbridgemask) : (lev?.typ | 0);
    if (u.uswallow) {
        const sd = u.ustuck?.data;
        if (sd && ((sd.mflags1 | 0) & 0x00040000 /* M1_ANIMAL */) !== 0) {
            await pline("What would you write?  \"Jonah was here\"?");
            return false;
        } else if (sd && ((sd.mlet | 0) === 22 /* S_VORTEX */
                          || (sd.pmidx | 0) === 154 /* PM_AIR_ELEMENTAL */)) {
            await cant_reach_floor(u.ux, u.uy, false, false, false);
            return false;
        }
    } else if (lev) {
        /* C engrave.c:519-532 — terrain arms */
        if (is_lava(u.ux, u.uy)) {
            await pline(`You can't write on the ${surface_real(u.ux, u.uy)}!`);
            return false;
        } else if (is_pool(u.ux, u.uy) || IS_FOUNTAIN(levtyp)) {
            await pline(`You can't write on the ${surface_real(u.ux, u.uy)}!`);
            return false;
        } else if (IS_AIR(levtyp)) {
            await pline(`You can't write in ${levtyp === CLOUD ? 'cloud vapor' : 'thin air'}!`);
            return false;
        } else if (!ACCESSIBLE(levtyp)) {
            await pline("You can't write here.");
            return false;
        }
    }
    /* C engrave.c:532 cantwield(gy.youmonst.data) = nohands || verysmall (mondata.h:96) */
    const ym = (game.youmonst && game.youmonst.data)
        || (u.umonnum != null ? permonstTemplate(u.umonnum | 0) : null);
    if (ym && (((ym.mflags1 | 0) & 0x00002000) !== 0 || (ym.msize | 0) < 1)) {
        await pline("You can't even hold anything!");
        return false;
    }
    if (await check_capacity(null)) /* C engrave.c:536 */
        return false;
    return true;
}

/* mungspaces — invent.c.  Convert tabs to spaces, collapse runs of spaces to one,
 * and strip leading/trailing spaces.  C ref: hacklib.c mungspaces(). */
function mungspaces_engrave(s) {
    return s.replace(/\t/g, ' ').replace(/ +/g, ' ').replace(/^ +| +$/g, '');
}

/* doengrave_ctx_verb — engrave.c:898.  Sets de.everb / de.eloc for the message. */
function doengrave_ctx_verb(de) {
    switch (de.type) {
    default:
        de.everb = de.adding ? 'add to the weird writing on' : 'write strangely on';
        break;
    case DUST:
        de.everb = de.adding ? 'add to the writing in' : 'write in';
        de.eloc = de.frosted ? 'frost' : 'dust';
        break;
    case HEADSTONE:
        de.everb = de.adding ? 'add to the epitaph on' : 'engrave on';
        break;
    case ENGRAVE:
        de.everb = de.adding ? 'add to the engraving in' : 'engrave in';
        break;
    case BURN:
        de.everb = de.adding
            ? (de.frosted ? 'add to the text melted into' : 'add to the text burned into')
            : (de.frosted ? 'melt into' : 'burn into');
        break;
    case MARK:
        de.everb = de.adding ? 'add to the graffiti on' : 'scribble on';
        break;
    case ENGR_BLOOD:
        de.everb = de.adding ? 'add to the scrawl on' : 'scrawl on';
        break;
    }
}



const GRAVE_TYP = 31; /* const.js GRAVE */

async function The_xname(obj) {
    const x = await xname(obj);
    return 'The ' + x;
}

/* C engrave.c:583 — special effects for wands. */
function wandNameKnown(o) {
    return !!game._oc_name_known?.[o.otyp | 0];
}

/* C engrave.c:1663-1677 rloc_engr — the store is keyed by (x,y), so "move" is
 * move the existing record so all text pointers and flags survive. */
export function rloc_engr(ep, x = ep.engr_x, y = ep.engr_y) {
    let tx, ty, tryct = 200;
    do {
        if (--tryct < 0)
            return null;
        tx = rn1(COLNO - 3, 2);
        ty = rn2(ROWNO);
    } while (engr_at(tx, ty) || !goodpos(tx, ty, null, 0));
    move_engr_at(x, y, tx, ty, ep);
    newsym(tx, ty);
    return engr_at(tx, ty);
}

async function doengrave_sfx_item_WAN(de) {
    const u = game.u || {};
    const blind = uBlind(u);
    switch (de.otmp.otyp) {
    case WAN_LIGHT:
    case WAN_SECRET_DOOR_DETECTION:
    case WAN_STASIS:
    case WAN_CREATE_MONSTER:
    case WAN_WISHING:
    case WAN_ENLIGHTENMENT:
        await zapnodir(de.otmp);
        break;
    case WAN_STRIKING:
        de.post_engr_text = 'The wand unsuccessfully fights your attempt to write!';
        break;
    case WAN_TELEPORTATION: /* (engrave.c:675-682) */
        if (de.oep && de.oep.engr_type !== HEADSTONE) {
            if (!blind) await pline(`The engraving on the ${surface(u.ux, u.uy)} vanishes!`);
            de.teleengr = true;
        }
        break;
    case WAN_POLYMORPH: /* (engrave.c:618-634) */
        if (de.oep) {
            if (!blind) {
                de.type = 0; /* random */
                const re = await random_engraving();
                de.buf = re.text;
                de.ebuf = re.pristine;
            } else {
                if (de.oetype) de.type = de.oetype;
                de.buf = xcrypt(blengr());
            }
            de.dengr = true;
        }
        break;
    case WAN_SLOW_MONSTER:
        if (!blind) de.post_engr_text = `The bugs on the ${surface(u.ux, u.uy)} slow down!`;
        break;
    case WAN_SPEED_MONSTER:
        if (!blind) de.post_engr_text = `The bugs on the ${surface(u.ux, u.uy)} speed up!`;
        break;
    case WAN_MAGIC_MISSILE:
        de.ptext = true;
        if (!blind) de.post_engr_text = `The ${surface(u.ux, u.uy)} is riddled by bullet holes!`;
        break;
    case WAN_SLEEP:
    case WAN_DEATH:
        if (!blind) de.post_engr_text = `The bugs on the ${surface(u.ux, u.uy)} stop moving!`;
        break;
    case WAN_COLD:
        if (!blind) de.post_engr_text = 'A few ice cubes drop from the wand.';
        if (!de.oep || de.oep.engr_type !== BURN) break;
        /* FALLTHRU */
    case WAN_CANCELLATION:
    case WAN_MAKE_INVISIBLE:
        if (de.oep && de.oep.engr_type !== HEADSTONE) {
            if (!blind) await pline(`The engraving on the ${surface(u.ux, u.uy)} vanishes!`);
            de.dengr = true;
        }
        break;
    case WAN_DIGGING:
        de.ptext = true;
        de.type = ENGRAVE;
        if (!wandNameKnown(de.otmp)) {
            if (game.flags?.verbose !== false)
                await pline(`This ${await xname(de.otmp)} is a wand of digging!`);
            de.doknown = true;
        }
        de.post_engr_text = blind
            ? (uDeaf(u) ? 'You feel tremors.' : 'You hear drilling!')
            : game.level?.locations?.[u.ux]?.[u.uy]?.typ === GRAVE_TYP
                ? 'Chips fly out from the headstone.'
            : de.frosted ? 'Ice chips fly up from the ice surface!'
            : game.level?.at(u.ux, u.uy)?.typ === DRAWBRIDGE_DOWN
                ? 'Splinters fly up from the bridge.'
                : 'Gravel flies up from the floor.';
        break;
    case WAN_FIRE:
        de.ptext = true;
        de.type = BURN;
        if (!wandNameKnown(de.otmp)) {
            if (game.flags?.verbose !== false)
                await pline(`This ${await xname(de.otmp)} is a wand of fire!`);
            de.doknown = true;
        }
        de.post_engr_text = blind ? 'You feel the wand heat up.' : 'Flames fly from the wand.';
        break;
    case WAN_LIGHTNING:
        de.ptext = true;
        de.type = BURN;
        if (!wandNameKnown(de.otmp)) {
            if (game.flags?.verbose !== false)
                await pline(`This ${await xname(de.otmp)} is a wand of lightning!`);
            de.doknown = true;
        }
        if (!blind) {
            de.post_engr_text = 'Lightning arcs from the wand.';
            de.doblind = true;
        } else {
            de.post_engr_text = uDeaf(u)
                ? 'Your hair stands up!' : 'You hear crackling!';
        }
        break;
    default:
        break;
    }
}

/* C engrave.c:544 — initialize implement and surface state. */
function doengrave_ctx_init(de) {
    const u = game.u;
    Object.assign(de, {
        dengr: false, doblind: false, doknown: false, eow: false, jello: false,
        ptext: true, teleengr: false, zapwand: false, disprefresh: false,
        adding: false, post_engr_text: '',
        ret: ECMD_OK, type: DUST, oetype: 0,
        otmp: null, oep: engr_at(u.ux, u.uy),
        buf: '', ebuf: '', fbuf: '', qbuf: '', writer: null,
        frosted: is_ice(u.ux, u.uy),
    });
    if (de.oep) de.oetype = de.oep.engr_type;
    const ptr = game.youmonst?.data || permonstTemplate(u.umonnum);
    if (ptr && (is_demon(ptr) || is_vampire(ptr)))
        de.type = ENGR_BLOOD;
    const swallower = u.ustuck?.data;
    de.jello = !!(u.uswallow && swallower
        && !(is_animal(swallower) || is_whirly(swallower)));
}

/* C engrave.c:741 — implement effects, before asking for text. */
async function doengrave_sfx_item(de) {
    const u = game.u;
    const oc = de.otmp.oclass | 0;
    if (oc === RING_CLASS || oc === GEM_CLASS) {
        // C engrave.c:751-758: hard rings and gems carve the surface.
        if (object_tough(de.otmp.otyp)) de.type = ENGRAVE;
    } else if (oc === WAND_CLASS) {
        /* C engrave.c:791-815.  zappable() spends the charge HERE, before
         * the "You write in the dust with <wand>" message doname()s it. */
        if (zappable(de.otmp)) {
            /* C engrave.c:793-798 — bill the charge before backfire. */
            check_unpaid_usage(de.otmp, false);
            if (de.otmp.cursed && !rn2(WAND_BACKFIRE_CHANCE)) {
                await wand_explode(de.otmp, 0);
                de.ret = ECMD_TIME;
                return false;
            }
            de.zapwand = true;
            if (!can_reach_floor(true)) de.ptext = false;
            await doengrave_sfx_item_WAN(de);
        } else {
            de.ptext = false;
            if (can_reach_floor(true)) {
                if ((de.otmp.spe | 0) < 0) de.zapwand = true;
                else await pline('The wand is too worn out to engrave.');
            }
        }
    } else if (oc === FOOD_CLASS || oc === SCROLL_CLASS || oc === SPBOOK_CLASS) {
        /* engrave.c:774-780 — "Objects too silly to engrave with":
         *     pline("%s would get %s.", Yname2(de->otmp),
         *           de->frosted ? "all frosty" : "too dirty");
         *     de->ptext = FALSE; */
        await pline(`${Yname2(de.otmp)} would get `
                    + `${de.frosted ? 'all frosty' : 'too dirty'}.`);
        de.ptext = false;
    } else if (oc === ARMOR_CLASS && is_boots(de.otmp)) {
        de.type = DUST;
    } else if (oc === ARMOR_CLASS || oc === BALL_CLASS || oc === ROCK_CLASS) {
        /* engrave.c:768-772 — "Objects too large to engrave with". */
        await pline("You can't engrave with such a large object!");
        de.ptext = false;
    } else if (oc === TOOL_CLASS) {
        /* C engrave.c:836-880 */
        if (de.otmp === (game.u || {}).ublindf) {
            await pline("That is a bit difficult to engrave with, don't you think?");
            de.ret = ECMD_FAIL;
            return false;
        }
        if (de.otmp.otyp === MAGIC_MARKER) {
            if ((de.otmp.spe | 0) <= 0)
                await pline('Your marker has dried out.');
            else
                de.type = MARK;
        } else if (de.otmp.otyp === TOWEL) {
            /* C engrave.c:850-878 — wiping also dries a wet towel. */
            de.ptext = false;
            const towelMessage = () => `${Yobjnam2(de.otmp, 'get')} ${de.frosted ? 'frosty' : 'dusty'}.`;
            if (de.oep) {
                if (de.oep.engr_type === DUST || de.oep.engr_type === ENGR_BLOOD
                    || de.oep.engr_type === MARK) {
                    if ((de.otmp.spe | 0) > 0) await dry_a_towel(de.otmp, -1, true);
                    if (!uBlind(game.u || {})) await pline('You wipe out the message here.');
                    else await pline(towelMessage());
                    de.dengr = true;
                } else {
                    await pline(`${await Yname2(de.otmp)} can't wipe out this engraving.`);
                }
            } else {
                await pline(towelMessage());
            }
        }
    } else if (oc === WEAPON_CLASS) {
        if (is_art(de.otmp, ART_FIRE_BRAND)) {
            de.type = BURN;
        } else if (is_blade(de.otmp)) {
            if (welded(de.otmp))
                await pline('%s can only scratch the %s.',
                            Yname2(de.otmp), surface_real(u.ux, u.uy));
            else if ((de.otmp.spe | 0) <= -3)
                await pline('%s too dull for engraving.', Yobjnam2(de.otmp, 'are'));
            else
                de.type = ENGRAVE;
        }
    } else if (oc === VENOM_CLASS) {
        await pline("Writing a poison pen letter?");
    } else if (oc === ILLOBJ_CLASS) {
        await impossible("You're engraving with an illegal object!");
    }
    return true;
}

/* doengrave — the 'E' command.  C ref: engrave.c:958.
 * Returns an ECMD_* code; sets g.occupation = 'engrave' when text is to be written.
 * The hero state struct `de` mirrors C's _doengrave_ctx. */
export async function doengrave() {
    const g = game;
    const u = g.u || {};

    if (!(await u_can_engrave())) {
        return ECMD_FAIL;
    }

    const de = {};
    doengrave_ctx_init(de);
    g.multi = 0;
    g.nomovemsg = null; // C engrave.c:971 — clear the occupation end message.

    /* C engrave.c:979 — getobj("write with", stylus_ok, GETOBJ_PROMPT). */
    de.otmp = await getObjFromGetobj('write with', stylus_ok, GETOBJ_PROMPT);
    if (!de.otmp) {
        de.ret = ECMD_CANCEL;
        return doengr_exit(de);
    }

    /* C engrave.c:985 — otmp == &hands_obj → write with fingertip. */
    if (de.otmp.hands) {
        de.writer = 'your ' + body_part_fingertip();
    } else {
        de.writer = yname(de.otmp);
    }

    /* C engrave.c:993 — the wielded or worn stylus is still usable. */
    if (!freehand() && de.otmp !== u.uwep && !de.otmp.owornmask) {
        await pline(`You have no free ${body_part(HAND)} to write with!`);
        return doengr_exit(de);
    }

    if (de.jello) {
        await pline('You tickle %s with %s.', mon_nam(u.ustuck), de.writer);
        await pline('Your message dissolves...');
        return doengr_exit(de);
    }

    let initial_msg_given = false;
    if (!can_reach_floor(true)) {
        if ((de.otmp.oclass | 0) !== WAND_CLASS) {
            await cant_reach_floor(u.ux, u.uy, false, true, false);
            return doengr_exit(de);
        }
        await pline(`You gesture, with your wand, towards the ${surface(u.ux, u.uy)} below you.`);
        initial_msg_given = true;
    }
    if (IS_ALTAR(game.level?.locations?.[u.ux]?.[u.uy]?.typ)) {
        if (!initial_msg_given)
            await pline(`You make a motion towards the altar with ${de.writer}.`);
        await altar_wrath(u.ux, u.uy);
        return doengr_exit(de);
    }

    /* C engrave.c:1019-1031 — a headstone is disturbed before item effects. */
    const loc = game.level.at(u.ux, u.uy);
    if (loc.typ === GRAVE_TYP) {
        if (de.otmp.hands) {
            await pline('You would only make a small smudge on the %s.', surface(u.ux, u.uy));
            return doengr_exit(de);
        } else if (!loc.disturbed) {
            await disturb_grave(u.ux, u.uy);
            return doengr_exit(de);
        }
    }
    if (!(await doengrave_sfx_item(de))) return doengr_exit(de);
    if (loc.typ === GRAVE_TYP) {
        if (de.type === ENGRAVE || de.type === 0) {
            de.type = HEADSTONE;
        } else {
            de.type = DUST;
            de.dengr = de.teleengr = false;
            de.buf = '';
        }
    }
    /* C engrave.c:1053-1057 — identify before any early exit. */
    if (de.doknown) {
        learnwand(de.otmp);
        if (game._oc_name_known?.[de.otmp.otyp | 0])
            more_experienced(0, 10);
    }
    if (de.teleengr) {
        const moved = rloc_engr(de.oep, u.ux, u.uy);
        const o = moved || de.oep;
        o.eread = 0;
        o.erevealed = 0;
        de.disprefresh = true;
        de.oep = null;
    }
    if (de.dengr) {
        del_engr_at(u.ux, u.uy);
        de.oep = null;
        de.disprefresh = true;
    }
    if (de.buf) {
        make_engr_at(u.ux, u.uy, de.buf, de.ebuf, game.moves | 0, de.type);
        const tmp_ep = engr_at(u.ux, u.uy);
        if (!uBlind(u) && tmp_ep) {
            await pline(`The engraving now reads: "${de.buf}".`);
            tmp_ep.eread = 1;
            tmp_ep.erevealed = 1;
            de.disprefresh = true;
        }
        de.ptext = false;
    }
    /* C engrave.c:1087-1097 — a cancelled wand turns to dust. */
    if (de.zapwand && (de.otmp.spe | 0) < 0) {
        await pline(`${await The_xname(de.otmp)} ${uBlind(u) ? '' : 'glows violently, then '}turns to dust.`);
        if (game.level?.locations?.[u.ux]?.[u.uy]?.typ !== GRAVE_TYP)
            await pline('You are not going to get anywhere trying to write in the '
                        + `${de.frosted ? 'frost' : 'dust'} with your dust.`);
        await useup(de.otmp);
        de.otmp = null;
        de.ptext = false;
    }
    if (!de.ptext) {
        if (de.otmp && (de.otmp.oclass | 0) === WAND_CLASS
            && !can_reach_floor(true))
            await cant_reach_floor(u.ux, u.uy, false, true, true);
        de.ret = ECMD_TIME;
        return doengr_exit(de);
    }

    if (de.oep) {
        /* C engrave.c:1109-1168 — decide whether to append, wipe, or
         * overwrite the existing engraving. */
        let c = 'n';
        const blind = uBlind(u);
        if (de.type === HEADSTONE) {
            c = 'y';
        } else if (de.type === de.oetype
                   && (!blind || de.oetype === BURN || de.oetype === ENGRAVE)) {
            c = await yn_function(
                'Do you want to add to the current engraving?', 'ynq', 'y', true);
            if (c === 'q') {
                await pline('Never mind.');
                de.ret = ECMD_OK;
                return doengr_exit(de);
            }
        }
        if (c === 'n' || blind) {
            const oldWipable = de.oetype === DUST || de.oetype === ENGR_BLOOD
                || de.oetype === MARK;
            if (oldWipable && !blind) {
                const oldKind = de.oetype === DUST
                    ? (de.frosted ? 'written in the frost' : 'written in the dust')
                    : de.oetype === ENGR_BLOOD ? 'scrawled in blood' : 'written';
                await pline(`You wipe out the message that was ${oldKind} here.`);
                del_engr_at(u.ux, u.uy);
                de.oep = null;
                de.disprefresh = true;
            } else if (oldWipable && blind) {
                /* C delays deletion until it knows engraving will proceed. */
                de.eow = true;
            } else if (de.type === DUST || de.type === MARK || de.type === ENGR_BLOOD) {
                const oldKind = de.oetype === BURN
                    ? (de.frosted ? 'melted into' : 'burned into') : 'engraved in';
                await pline(`You cannot wipe out the message that is ${oldKind} the ${surface(u.ux, u.uy)} here.`);
                de.ret = ECMD_TIME;
                return doengr_exit(de);
            } else if (de.type !== de.oetype || c === 'n') {
                if (!blind || can_reach_floor(true))
                    await pline('You will overwrite the current message.');
                de.eow = true;
            }
        } else if (de.oep && de.oep.text.length >= BUFSZ - 1) {
            await pline('There is no room to add anything else here.');
            de.ret = ECMD_TIME;
            return doengr_exit(de);
        }
        de.adding = !!(de.oep && !de.eow);
    }

    /* C engrave.c:1172-1186 — message: "You write in the dust with your fingertip." */
    de.eloc = surface(u.ux, u.uy);
    de.adding = !!(de.oep && !de.eow);
    doengrave_ctx_verb(de);

    if (!de.otmp.hands) {
        /* C engrave.c:1177-1183 uses doname(), not the yname() writer used
         * by the earlier special-case messages.  In particular a selected
         * stack must retain its quantity and BUC adjective here. */
        const one = de.type === ENGRAVE && de.otmp.quan > 1 ? '1 of ' : '';
        await pline(`You ${de.everb} the ${de.eloc} with ${one}${await doname(de.otmp)}.`);
    } else {
        /* C engrave.c:1184 — "You write in the dust with your fingertip." */
        await pline(`You ${de.everb} the ${de.eloc} with your ${body_part_fingertip()}.`);
    }

    /* C engrave.c:1188-1193 — prompt for the engraving text and read it. */
    /* getlin owns tty's pending-message pages (getline.c:53-54). It first
     * drains width-driven message boundaries, then acknowledges the final
     * message. Forcing the whole accumulation here collapses separate C
     * pages, e.g. the welded-blade warning and the writing announcement. */
    const qbuf = `What do you want to ${de.everb} the ${de.eloc} here?`;
    let line = await getlin(qbuf);
    if (line === '\x1b') line = ''; /* ESC → empty (handled as Never mind below) */
    de.ebuf = mungspaces_engrave(line);

    /* C engrave.c:1196-1199 — count of non-space chars. */
    let len = 0;
    for (const c of de.ebuf) if (c !== ' ') len++;

    /* C engrave.c:1201-1212 — empty / ESC text → "Never mind." (no wand here). */
    if (len === 0 || de.ebuf.indexOf('\x1b') >= 0) {
        if (de.zapwand) {
            if (!uBlind(u))
                await pline(`${await Tobjnam(de.otmp, 'glow')}, then ${otense(de.otmp, 'fade')}.`);
            de.ret = ECMD_TIME;
            return doengr_exit(de);
        }
        await pline('Never mind.');
        return doengr_exit(de);
    }

    /* C engrave.c:1214-1218 — literacy conduct (not RNG; u.uconduct.literate++). */
    if (!(len === 1 && (de.ebuf.indexOf('x') >= 0 || de.ebuf.indexOf('X') >= 0))) {
        /* `if (u.uconduct)` guarded this on an object NOTHING in js/ creates,
         * so the engraving half of the illiteracy conduct never counted either.
         * C's u.uconduct is a plain struct member; create the bag. */
        u.uconduct = u.uconduct || {};
        if (!((u.uconduct.literate | 0) )) {
            u.uconduct.literate = 1;
            livelog_printf(LL_CONDUCT, 'became literate by engraving "%s"', de.ebuf);
        } else {
            u.uconduct.literate = (u.uconduct.literate | 0) + 1;
        }
    }

    /* C engrave.c:1220-1230 — smudge loop: for each non-space char, with the chance
     * for the engraving surface / state of mind, replace the char with random ASCII.
     * The short-circuit || order is faithful so an afflicted hero fires the right
     * extra RNG.  For the unafflicted DUST hero only rn2(25) fires per char. */
    const blind = uBlind(u), conf = uConfusion(u), stun = uStunned(u), hallu = uHallu(u);
    const isDustOrBlood = (de.type === DUST || de.type === ENGR_BLOOD);
    {
        const chars = de.ebuf.split('');
        for (let i = 0; i < chars.length; i++) {
            if (chars[i] === ' ') continue;
            let smudge = false;
            if (isDustOrBlood) smudge = (rn2(25) === 0);
            if (!smudge && blind) smudge = (rn2(11) === 0);
            if (!smudge && conf) smudge = (rn2(7) === 0);
            if (!smudge && stun) smudge = (rn2(4) === 0);
            if (!smudge && hallu) smudge = (rn2(2) === 0);
            if (smudge) {
                /* C: *sp = ' ' + rnd(96 - 2);  ASCII '!'..'~'. */
                chars[i] = String.fromCharCode(32 + rnd(94));
            }
        }
        de.ebuf = chars.join('');
    }

    /* C engrave.c:1232-1237 — previous engraving overwritten (de.eow). Not reached. */
    if (de.eow && de.oep) {
        del_engr_at(u.ux, u.uy);
        de.oep = null;
        de.disprefresh = true;
    }

    /* C engrave.c:1239-1246 — set up svc.context.engraving and the occupation. */
    g.context = g.context || {};
    g.context.engraving = {
        text: de.ebuf,
        nextc: 0,
        stylus: de.otmp,
        type: de.type,
        pos: { x: u.ux, y: u.uy },
        actionct: 0,
    };
    /* set_occupation(engrave, "engraving", 0) — engrave.c:1246.  The occupation
     * driver in allmain.js runs engrave() once per turn until it returns 0. */
    g.occupation = 'engrave';
    g.occtxt = 'engraving';
    g.occtime = 0;

    if (de.post_engr_text) await pline(de.post_engr_text);
    /* C engrave.c:1248-1255 */
    if (de.doblind && !resists_blnd(game.youmonst)) {
        await pline('You are blinded by the flash!');
        await make_blinded(rnd(50), false);
        if (!uBlind(u)) await pline('Your vision quickly clears.');
    }

    /* C engrave.c:1257 comment — engraving takes time via the occupation, so the
     * setup itself does NOT consume a turn (doengrave returns ECMD_OK). */
    return doengr_exit(de);
}

/* C engrave.c:1259 doengr_exit. */
function doengr_exit(de) {
    const g = game;
    const u = g.u || {};
    if (de.disprefresh) newsym(u.ux, u.uy);
    /* C returns the result; rhack, not this callee, updates context.move. */
    return de.ret;
}

export async function engrave() {
    const g = game;
    const u = g.u || {};
    const eng = g.context && g.context.engraving;
    if (!eng) return 0;

    /* C engrave.c:1288 — teleported away from the engrave square → abort. */
    if (eng.pos.x !== u.ux || eng.pos.y !== u.uy) {
        await pline('You are unable to continue engraving.');
        return 0;
    }

    const firsttime = (eng.actionct === 0);
    const neweng = (eng.actionct === 0);

    /* C engrave.c:1322-1331 — compute rate.  DUST/fingertip → default rate 10. */
    let rate = 10;
    let stylus = eng.stylus;
    if (stylus?.hands) stylus = null;
    else {
        for (stylus = g.invent; stylus && stylus !== eng.stylus; stylus = stylus.nobj) {}
        if (!stylus) { await pline('You are unable to continue engraving.'); return 0; }
    }
    eng.actionct++;
    const dulling = (eng.type === ENGRAVE || eng.type === HEADSTONE) && stylus
        && stylus.oclass === WEAPON_CLASS && (stylus.otyp !== ATHAME || stylus.cursed);
    // C engrave.c:1321-1325: rings and gems carve one character per action.
    if ((eng.type === ENGRAVE || eng.type === HEADSTONE) && stylus
        && (dulling || stylus.oclass === RING_CLASS || stylus.oclass === GEM_CLASS))
        rate = 1;
    const marker = !!(stylus && stylus.otyp === MAGIC_MARKER && eng.type === MARK);
    if (dulling && !is_blade(stylus)) await impossible('carving with non-bladed weapon');
    else if (eng.type === MARK && !marker) await impossible('making graffiti with non-marker stylus');
    if (marker) {
        /* C engrave.c:1326-1328 — one charge / 2 letters */
        rate = Math.min(rate, (stylus.spe | 0) * 2);
    }

    /* C engrave.c:1333-1339 — endc = last char engraved this action. */
    let text = eng.text;
    let i = rate;
    let endc = eng.nextc;
    while (endc < text.length && i > 0) {
        if (text[endc] !== ' ') i--;
        endc++;
    }

    /* C engrave.c:1394-1408 — marker ink: max(rate/2, 1) charges per action */
    let truncate = false;
    if (dulling) {
        const splitstack = stylus.quan > 1;
        let dulled = false;
        if (firsttime) await pline(splitstack ? `One of ${yname(stylus)} gets dull.` : `${Yname2(stylus)} gets dull.`);
        if (splitstack) {
            stylus = eng.stylus = await splitobj(stylus, 1);
            stylus.owornmask = 0;
        }
        if (eng.actionct % 2 === 1) {
            if (stylus.spe <= -3) {
                if (firsttime) await impossible('<= -3 weapon valid for engraving');
                truncate = true;
            }
            else if (endc < text.length || firsttime) { stylus.spe--; dulled = true; }
        }
        if (splitstack) {
            obj_extract_self(stylus);
            await hold_another_object(stylus, 'You drop one %s!', await doname(stylus), null);
        } else if (dulled && stylus.known) {
            await prinv(null, stylus, 1);
            update_inventory();
        }
    }
    if (marker) {
        let ink_cost = Math.max(Math.trunc(rate / 2), 1);
        if ((stylus.spe | 0) < ink_cost) {
            await impossible('overly dry marker valid for graffiti?');
            ink_cost = stylus.spe | 0;
            truncate = true;
        }
        stylus.spe = (stylus.spe | 0) - ink_cost;
        update_inventory();
        if ((stylus.spe | 0) === 0) {
            await pline('Your marker dries out.');
            truncate = true;
        }
    }
    // C engrave.c:1437-1447: check room before truncating worn-out stylus input.
    let oep = engr_at(u.ux, u.uy);
    let buf = oep?.text || '';
    const space_left = BUFSZ - buf.length - 1;
    if (endc - eng.nextc > space_left) {
        await pline('You run out of room to write.');
        endc = eng.nextc + space_left;
        truncate = true;
    }
    if (truncate && endc < text.length) {
        text = text.slice(0, endc);
        eng.text = text;
        await pline(`You are only able to write "${text.slice(0, endc)}".`);
    } else {
        /* C engrave.c:1453-1457 — input not truncated; stylus may still have
         * worn out on the last character. */
        truncate = false;
    }

    /* C engrave.c:1438-1462 — append the engraved slice to any existing engraving. */
    buf += text.slice(eng.nextc, endc);

    /* C engrave.c:1463 — make_engr_at(ux, uy, buf, NULL, svm.moves - gm.multi, type).
     * make_engr_at handles exercise(A_WIS, TRUE) when buf === "Elbereth" and !in_mklev. */
    make_engr_at(u.ux, u.uy, buf, null, (g.moves | 0) - (g.multi | 0), eng.type);
    oep = engr_at(u.ux, u.uy);
    if (oep) { oep.eread = 1; oep.erevealed = 1; oep.remembered = oep.text; }

    if (endc < text.length) {
        /* C engrave.c:1471 — not yet finished this turn. */
        eng.nextc = endc;
        if (neweng) newsym(eng.pos.x, eng.pos.y);
        return 1;
    }
    /* C engrave.c:1477 — finished engraving. */
    if (truncate) {
        /* C engrave.c:1478-1481 */
        await pline('You cannot write any more.');
    } else if (!firsttime) {
        /* "You finish writing in the dust." — only when engraving took >1 action. */
        /* C engrave.c:1411-1432 */
        const ice = is_ice(u.ux, u.uy);
        let finishverb;
        switch (eng.type) {
        case DUST: finishverb = ice ? 'writing in the frost' : 'writing in the dust'; break;
        case HEADSTONE: case ENGRAVE: finishverb = 'engraving'; break;
        case BURN: finishverb = ice ? 'melting your message into the ice'
                                    : 'burning your message into the floor'; break;
        case MARK: finishverb = 'defacing the dungeon'; break;
        case ENGR_BLOOD: finishverb = 'scrawling'; break;
        default: finishverb = 'your weird engraving';
        }
        await pline(`You finish ${finishverb}.`);
    }
    eng.text = '';
    eng.nextc = 0;
    eng.stylus = null;
    if (neweng) newsym(eng.pos.x, eng.pos.y);
    return 0;
}

/* C engrave.c:1520-1546 */
export async function engraving_sanity_check() {
    const eps = engravings_list();
    if (eps.length && (Is_airlevel(game.u.uz) || Is_waterlevel(game.u.uz))) {
        await impossible('engraving sanity: on plane of air/water');
        return;
    }
    for (const ep of eps) {
        const x = ep.engr_x, y = ep.engr_y;
        if (!isok(x, y)) {
            await impossible('engraving sanity: !isok <%i,%i>', x, y);
            continue;
        }
        const lev = game.level.at(x, y);
        const levtyp = lev.typ === DRAWBRIDGE_UP
            ? db_under_typ(lev.drawbridgemask) : lev.typ;
        if (is_pool_or_lava(x, y) || IS_AIR(levtyp) || !ACCESSIBLE(levtyp))
            await impossible('engraving sanity: illegal surface (%d: "%s")',
                             levtyp, surface(x, y));
    }
}

/* C engrave.c:1503 sanitize_engravings() — ep.text corresponds to ep->engr_txt[actual_text].
 * C engrave.c:1508 forget_engravings() — discovery reset. */
export function sanitize_engravings() {
    for (const ep of engravings_list()) ep.text = sanitize_name(ep.text);
}

export function forget_engravings() {
    for (const ep of engravings_list()) ep.erevealed = ep.eread = 0;
}

/* C engrave.c:1706-1721 — engraving and kicking share this grave disturbance. */
export async function disturb_grave(x, y) {
    const loc = game.level.at(x, y);
    if (loc.typ !== GRAVE_TYP) {
        await impossible("Disturbing grave that isn't a grave? (%d)", loc.typ);
        return;
    } else if (loc.disturbed) {
        await impossible('Disturbing already disturbed grave?');
        return;
    }
    await pline('You disturb the undead!');
    loc.disturbed = 1;
    await makemon(permonstTemplate(PM_GHOUL), x, y, NO_MM_FLAGS);
    exercise(A_WIS, false);
}

/* C engrave.c:1743-1767 — encrypted strings, decoded only by the blind writer. */
const blind_writing = [
    'Dfmibe"E{qemr',
    'Qg`z\x7f!@qkqogc',
    'Imsibe"La|mg$B\x7filwg~',
    'Kmlf0Lkh|\x7fo',
    'Qgpz\x7foghdq!Okm~r',
    'Lcvaq!Hk{ugc$Eekke',
    'Lghkxhmvzu!Oqzuow',
    'Dfm|x!Pefel',
    'Dfsibe"V}civkf',
];
function blengr() {
    return blind_writing[rn2(blind_writing.length)];
}

/* enum engraving_texts (nethack-c/include/engrave.h:9). */
const ENGR_ACTUAL_TEXT = 0;
const ENGR_REMEMBERED_TEXT = 1;
const ENGR_PRISTINE_TEXT = 2;

let head_engr = null;

/* C ref: engrave.h newengr(lth) macro — allocate a struct engr sized for a
 * `lth`-byte packed text buffer. */
function newengr(lth) {
    return {
        nxt_engr: null,
        engr_txt: [null, null, null],
        engr_x: 0, engr_y: 0,
        engr_szeach: 0,
        engr_alloc: lth,
        engr_time: 0,
        engr_type: 0,
        guardobjects: 0, nowipeout: 0, eread: 0, erevealed: 0,
    };
}

function sfiUnsigned(_nhfp, _tag) {
    return 0;
}
function sfiChar(_nhfp, _tag, _lth) {
    return '';
}
function sfiEngr(_nhfp, _ep, _tag) {
    /* populates ep's scalar fields (engr_x/y/engr_szeach/engr_alloc/
     * engr_time/engr_type/bitfields) from the byte stream; no-op until that
     * stream exists. */
}


/* include/skills.h:64,95 — P_RIDING = 37, P_BASIC = 2. */
const P_RIDING = 37, P_BASIC = 2;

/* include/monattk.h:19 AT_HUGS. */
const AT_HUGS = 7;

/* include/monflag.h:85,89,92,93,182 and defsym.h:309 MONSYM(13,...,S_MIMIC). */
const M1_FLY = 0x00000001, M1_CLING = 0x00000010, M1_HIDE = 0x00000100;

const MZ_HUGE = 4, S_MIMIC = 13;

/* C youprop.h Levitation / Flying. */
function Levitation() { return _uprop_on(LEVITATION); }

function Flying() {
    // C youprop.h:253: a flying steed confers flight unless BFlying blocks it.
    const u = game.u, p = u?.uprops?.[FLYING];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0)
        || ((u?.usteed?.data?.mflags1 | 0) & 0x00000001 /* M1_FLY */))
        && !(p?.blocked | 0);
}

function _hero_data() {
    const ym = game.youmonst;
    return (ym && ym.data) ? ym.data : null;
}

/* C mondata.h:38-45.  is_hider/is_clinger/is_flyer are single mflags1 bits;
 * ceiling_hider adds the S_MIMIC exclusion on the clinger half.  An absent
 * permonst (a partially-seeded replay world) reads as "no flags", which is the
 * same convention js/eat.js is_clinger and js/mhitu.js nohands_mu use. */
function is_hider(ptr) { return (((ptr?.mflags1 | 0) >>> 0) & M1_HIDE) !== 0; }

function is_clinger(ptr) { return (((ptr?.mflags1 | 0) >>> 0) & M1_CLING) !== 0; }

function is_flyer(ptr) { return (((ptr?.mflags1 | 0) >>> 0) & M1_FLY) !== 0; }

function ceiling_hider(ptr) {
    return is_hider(ptr)
        && ((is_clinger(ptr) && (ptr?.mlet | 0) !== S_MIMIC) || is_flyer(ptr));
}

export function can_reach_floor(check_pit) {
    const u = game.u || {};
    const youdata = _hero_data();

    if (u.uswallow
        || (u.ustuck && !sticks(youdata)
            && attacktype(u.ustuck.data, AT_HUGS))
        || (Levitation() && !(Is_airlevel(u.uz) || Is_waterlevel(u.uz))))
        return false;
    if (u.usteed && P_SKILL(P_RIDING) < P_BASIC)
        return false;
    if (u.uundetected && ceiling_hider(youdata))
        return false;

    if (Flying() || (youdata && (youdata.msize | 0) >= MZ_HUGE))
        return true;

    if (check_pit) {
        const t = t_at(u.ux | 0, u.uy | 0);
        if (t && (uteetering_at_seen_pit(t) || uescaped_shaft(t)))
            return false;
    }
    return true;
}

// C ref: engrave.c make_engr_at — create engraving at coordinates
export function make_engr_at(x, y, text, pristine, epoch, engr_type) {
    if (text != null) { // C engrave.c:420-436 also stores empty strings.
        /* C engrave.c:427-436 — the engraving carries THREE copies of its text
         * (actual / remembered / pristine), all initialised to `s`, and the
         * pristine copy is overwritten with `pristine_s` only when that
         * argument is non-NULL:
         *     for (i = 0; i < text_states; ++i) Strcpy(ep->engr_txt[i], s);
         *     if (havepristine) Strcpy(ep->engr_txt[pristine_text], pristine_s);
         * so a NULL pristine_s means "pristine == actual", NOT "no pristine".
         * This store discarded the argument entirely, which made read_engr_at's
         * endpunct test (engrave.c:390-395) unanswerable — see _reveal_text in
         * js/cmd.js.
         *
         * `off` is C's `ep->engr_txt[actual_text] - engr_text_space(ep)`: the
         * pristine copy is indexed at the actual text's ORIGINAL buffer offset,
         * and wipe_engr_at advances that pointer past leading spaces it has
         * rubbed out.  Zero at creation, maintained below.
         *
         * C engrave.c:452 `ep->engr_type = (e_type > 0) ? e_type : rnd(N_ENGRAVE - 1);`
         * — a non-positive e_type is not "default to DUST", it is "pick one of the
         * N_ENGRAVE-1 non-HEADSTONE types at random" (rnd draws real RNG).  The one
         * live caller of this arm is zap_map's WAN_POLYMORPH/SPE_POLYMORPH engraving
         * rewrite (zap.c:3651-3656, `make_engr_at(x, y, etxt, pristinebuf,
         * svm.moves, 0)`), confirmed against the board: every make_engr_at record
         * with e_type===0 (5 of 300) consumes exactly one RNG draw in [1,5], every
         * other record consumes zero.  This store previously silently defaulted a
         * falsy engr_type to DUST and drew no RNG at all — draws that zap.js's own
         * (still-unported) polymorph arm will need the day it lands. */
        const et = engr_type | 0;
        const ep = {
            text, remembered: text,
            pristine: pristine ?? text, off: 0,
            guardobjects: 0,
            engr_time: epoch | 0,
            engr_type: 0,
        };
        if (text === 'Elbereth') {
            // C engrave.c:442-450
            if (game.in_mklev)
                ep.guardobjects = 1;
            else
                exercise(A_WIS, true);
        }
        ep.engr_type = (et > 0) ? et : rnd(N_ENGRAVE - 1);
        _engr_map.set(`${x},${y}`, ep);
    }
}

// C ref: engrave.c wipe_engr_at — degrade engraving at coordinates (engrave.c:271)
export function wipe_engr_at(x, y, cnt, magical) {
    const ep = _engr_map.get(`${x},${y}`);
    if (!ep)
        return;
    if (ep.engr_type === HEADSTONE)
        return;
    if (ep.nowipeout)
        return;
    // C: if (ep->engr_type != BURN || is_ice(x,y) || (magical && !rn2(2)))
    const isBurn = (ep.engr_type === BURN);
    let doWipe;
    if (!isBurn) {
        doWipe = true;
    }
    else if (is_ice(x, y)) {
        doWipe = true;
    }
    else if (magical && !rn2(2)) {
        doWipe = true;
    }
    else {
        doWipe = false;
    }
    if (!doWipe)
        return;
    // C engrave.c:279-282: if (ep->engr_type != DUST && ep->engr_type != ENGR_BLOOD) cnt = rn2(...) ? 0 : 1
    if (ep.engr_type !== DUST && ep.engr_type !== ENGR_BLOOD) {
        cnt = rn2(1 + Math.trunc(50 / (cnt + 1))) ? 0 : 1;
        // debugpline1("actually eroding %d characters", cnt);
    }
    const newText = wipeout_text(ep.text, cnt, 0);
    // C: trim leading spaces, delete engraving if empty
    const trimmed = newText.replace(/^ +/, '');
    if (!trimmed) {
        _engr_map.delete(`${x},${y}`);
    }
    else {
        /* C engrave.c:284-285 `while (ep->engr_txt[actual_text][0] == ' ')
         * ep->engr_txt[actual_text]++;` — the pointer ADVANCES, it does not
         * shift the buffer, so the pristine copy stays aligned to the original
         * offsets and `off` is how far the actual text has moved. */
        ep.off = (ep.off | 0) + (newText.length - trimmed.length);
        ep.text = trimmed;
    }
}

/* C rumors.c MD_PAD_RUMORS — expected padded line length handed to
   get_rnd_line() by every rumor/engrave/epitaph caller. */
const MD_PAD_RUMORS = 60;

/* C rumors.c:523 couldnt_open_file(fname) — omitted; EPITAPH_LINES is an in-memory table */
function get_rnd_text_epitaph() {
    return get_rnd_line_from_section(EPITAPH_LINES, EPITAPH_OFFSETS, EPITAPH_CHUNK_SIZE, rn2, MD_PAD_RUMORS);
}

export function make_grave(x, y, text) {
    const loc = game.level?.at(x, y);
    const graveTrace = typeof process !== 'undefined' && ENV?.FF_GRAVE_TRACE === '1';
    if (graveTrace)
        pushRngLogEntry(`^grave_try[xy=${x | 0},${y | 0} typ=${loc?.typ ?? -1} trap=${t_at(x, y) ? 1 : 0}]`);
    if (!loc || (loc.typ !== ROOM && loc.typ !== GRAVE) || t_at(x, y))
        return;
    if (!set_levltyp(x, y, GRAVE))
        return;
    del_engr_at(x, y);
    if (text == null)
        text = get_rnd_text_epitaph();
    make_engr_at(x, y, text, null, 0, HEADSTONE);
}

// C ref: rumors.c get_rnd_text(ENGRAVEFILE, ...) — pick a random engraving text.
// Consumes rn2(ENGRAVE_CHUNK_SIZE). Returns the selected engraving text.
function get_rnd_text_engrave() {
    return get_rnd_line_from_section(ENGRAVE_LINES, ENGRAVE_OFFSETS, ENGRAVE_CHUNK_SIZE, rn2, MD_PAD_RUMORS);
}

// C ref: engrave.c rubouts[] — partial rubout table for character degradation.
const rubouts = [
    { from: 'A', to: '^' },
    { from: 'B', to: 'Pb[' },
    { from: 'C', to: '(' },
    { from: 'D', to: '|)[' },
    { from: 'E', to: '|FL[_' },
    { from: 'F', to: '|-' },
    { from: 'G', to: 'C(' },
    { from: 'H', to: '|-' },
    { from: 'I', to: '|' },
    { from: 'K', to: '|<' },
    { from: 'L', to: '|_' },
    { from: 'M', to: '|' },
    { from: 'N', to: '|\\' },
    { from: 'O', to: 'C(' },
    { from: 'P', to: 'F' },
    { from: 'Q', to: 'C(' },
    { from: 'R', to: 'PF' },
    { from: 'T', to: '|' },
    { from: 'U', to: 'J' },
    { from: 'V', to: '/\\' },
    { from: 'W', to: 'V/\\' },
    { from: 'Z', to: '/' },
    { from: 'b', to: '|' },
    { from: 'd', to: 'c|' },
    { from: 'e', to: 'c' },
    { from: 'g', to: 'c' },
    { from: 'h', to: 'n' },
    { from: 'j', to: 'i' },
    { from: 'k', to: '|' },
    { from: 'l', to: '|' },
    { from: 'm', to: 'nr' },
    { from: 'n', to: 'r' },
    { from: 'o', to: 'c' },
    { from: 'q', to: 'c' },
    { from: 'w', to: 'v' },
    { from: 'y', to: 'v' },
    { from: ':', to: '.' },
    { from: ';', to: ',:' },
    { from: ',', to: '.' },
    { from: '=', to: '-' },
    { from: '+', to: '-|' },
    { from: '*', to: '+' },
    { from: '@', to: '0' },
    { from: '0', to: 'C(' },
    { from: '1', to: '|' },
    { from: '6', to: 'o' },
    { from: '7', to: '/' },
    { from: '8', to: '3o' },
];

// C ref: engrave.c wipeout_text — degrade cnt characters in engr string (seed=0 uses rn2).
export function wipeout_text(engr, cnt, seed, rngFn = rn2) {
    const chars = engr.split('');
    const lth = chars.length;
    if (lth && cnt > 0) {
        while (cnt-- > 0) {
            let nxt, use_rubout;
            if (!seed) {
                nxt = rngFn(lth);
                use_rubout = rngFn(4);
            }
            else {
                /* C keeps this as an unsigned int.  Math.imul is required here:
                 * multiplying a 32-bit seed by 31 wraps before C takes the
                 * BUFSZ-1 modulus.  Plain JS multiplication would silently lose
                 * that wrap for seeds above 2^27. */
                seed >>>= 0;
                nxt = seed % lth;
                seed = Math.imul(seed, 31) >>> 0;
                seed %= (BUFSZ - 1); // C engrave.c:141 seed %= (BUFSZ - 1)
                use_rubout = seed & 3;
            }
            if (chars[nxt] === ' ')
                continue;
            if ('?.,\'`-|_'.indexOf(chars[nxt]) >= 0) {
                chars[nxt] = ' ';
                continue;
            }
            let i = rubouts.length;
            if (use_rubout) {
                for (i = 0; i < rubouts.length; i++) {
                    if (chars[nxt] === rubouts[i].from) {
                        const wipeto = rubouts[i].to;
                        const ln = wipeto.length;
                        /* In C the seeded path advances the same local seed
                         * again; it does not consume the global RNG tape. */
                        if (seed) {
                            seed = Math.imul(seed, 31) >>> 0;
                            seed %= (BUFSZ - 1); // C engrave.c:166 seed %= (BUFSZ - 1)
                        }
                        const j = seed ? seed % ln : rngFn(ln);
                        chars[nxt] = wipeto[j];
                        break;
                    }
                }
            }
            if (i === rubouts.length)
                chars[nxt] = '?';
        }
    }
    // trim trailing spaces (engrave.c:181-182: runs even when cnt <= 0)
    return chars.join('').replace(/ +$/, '');
}

// C ref: engrave.c random_engraving — pick a random engraving text and apply wipeout.
// Consumes rn2(4); if 0 uses ENGRAVEFILE else uses getrumor(0,...).
export async function random_engraving() {
    let pristine;
    if (!rn2(4)) {
        pristine = get_rnd_text_engrave();
    }
    else {
        /* C engrave.c:57 — getrumor(0, pristine_copy, TRUE): graffiti must
           never be a fortune-cookie rumor. */
        const rumor = await getrumor(0, true);
        if (rumor && rumor.length > 0) {
            pristine = rumor;
        }
        else {
            pristine = get_rnd_text_engrave();
        }
    }
    const text = wipeout_text(pristine, Math.trunc(pristine.length / 4), 0);
    return { text, pristine };
}

// C ref: engrave.c:462 del_engr_at(x,y) — delete any engraving at (x,y).
export function del_engr_at(x, y) {
    _engr_map.delete(`${x},${y}`);
}

// C ref: engrave.c engr_at — look up engraving record at (x,y).
// Returns the engraving object {text, engr_type} or null.
// display.js newsym uses this to render S_engroom / S_engrcorr glyphs.
export function engr_at(x, y) {
    return _engr_map.get(`${x},${y}`) ?? null;
}

// C engrave.c:1550-1582 save_engravings(nhfp)
function Sfo_unsigned(nhfp, val, name) { /* savefile libc stub */ }

function update_file(nhfp) { return !!(nhfp && (nhfp.mode & 3)); }

export function save_engravings(nhfp) {
    engr_reset_text_pointers();
    if (nhfp && update_file(nhfp)) {
        // C engrave.c:1575-1577 — write end-of-list terminator
        const no_more_engr = 0;
        Sfo_unsigned(nhfp, no_more_engr, "engraving-engr_alloc");
    }
    return new Map(_engr_map);
}

export function rest_engravings(saved) {
    _engr_map.clear();
    if (saved)
        for (const [k, ep] of saved) {
            /* C engrave.c:1610-1613 rest_engravings(): re-advance the actual and
             * remembered text pointers past leading spaces; `off` is how far. */
            const text = ep.text.replace(/^ +/, '');
            _engr_map.set(k, { ...ep, text,
                               engr_time: game.moves | 0,
                               off: (ep.off | 0) + (ep.text.length - text.length),
                               remembered: (ep.remembered ?? ep.text).replace(/^ +/, '') });
        }
}

// C ref: win/tty/topl.c's --More-- combine-vs-force-page decision (topl.c
// message forces --More-- iff it is NOT the last pline in its immediate
// same-step chain, OR a full redraw is still pending before the player's
// next genuinely free keystroke, OR the message itself is too long to fit
// one topline row and word-wraps (the winning 'not-last-or-pending-redraw-
// keystone-spec-wrap-paging.md). The C callsite itself is IDENTICAL at
// every occurrence — the tty layer alone decides — so this helper takes
// the structural facts the CALLER already knows (chain position, pending-
// redraw) plus the message text itself (for the wrap check) rather than
// the call site baking in caller-identity knowledge (e.g. "am I the
// arrival call?").
const _PLINE_PAGED_WRAP_CAPACITY = 79;

async function _pline_paged(msg, last, redrawPending) {
    const wouldWrap = msg.length > _PLINE_PAGED_WRAP_CAPACITY;
    const _committed = (game && (game._pending_message || game._resultMessage)) || '';
    if (_committed.length > 0) {
        if (game._pending_message && game._pending_message.length > 0)
            await pline(msg);
        else
            _result_append_join(game, msg);
        return;
    }
    if (last && !redrawPending && wouldWrap) {
        /* tty/topl.c:257,274,300: the incoming update_topl sampled skip
         * before the preceding more() set WIN_STOP.  Its redotoplin still
         * draws, and a wrapped line calls more() unconditionally (:139-140).
         * Let pline consume the armed bit before paging that painted line. */
        await pline(msg);
        if (game._pending_message === msg) await force_more(msg, undefined, true);
        /* topl.c:257,274,300: this message sampled skip before the previous
         * line's more().  Publish it through pline's armed-STOP handling;
         * redotoplin:139-140 then pages its own wrapped text even after ESC. */
        await pline(msg);
        await flush_pending_messages();
    } else if (!last || redrawPending || wouldWrap) {
        routeTag('_pline_paged', msg); /* telemetry only; inert when env unset */
        await force_more(msg);
    } else {
        await pline(msg);
    }
}

/* C ref: engrave.c:397 — the SECOND pline of read_engr_at:
 *   You("%s: \"%s\"%s", Blind ? "feel the words" : "read", et, endpunct)
 * where endpunct is "" only when the text already ends in '.', '!' or '?'.
 * Factored out of read_engr_at's body because the FIRST pline's page/join
 * decision needs this string's LENGTH before it is printed (update_topl's
 * `n0 + strlen(gt.toplines) + 3 < CO - 8` test). */
function _reveal_text(ep) {
    const _Blind = uBlind(game.u || {});
    const _et = ep.text.slice(0, 232); // C engrave.c:375-385
    const _elen = _et.length;
    const _pristine = (ep.pristine != null) ? ep.pristine : _et;
    const _off = ep.off | 0;
    let _endpunct = '';
    const _last = _et[_elen - 1];
    if (_elen < 2
        || !(_pristine[_off + _elen - 1] === _last
             && (_last === '.' || _last === '!' || _last === '?')))
        _endpunct = '.';
    return `You ${_Blind ? 'feel the words' : 'read'}: "${_et}"${_endpunct}`;
}

export async function read_engr_at(x, y, redrawPending = false) {
    const ep = engr_at(x, y);
    /* C engrave.c:320 — eloc is computed from surface(x,y), including
     * graves/headstones, before selecting the engraving message. */
    const eloc = surface(x, y);
    if (ep && ep.text && ep.text[0]) {
        const _isIce = is_ice(x, y);
        let msg = null;
        const _blindNow = uBlind(game.u || {});
        switch (ep.engr_type) {
        case DUST: if (!_blindNow) msg = `Something is written here in the ${_isIce ? 'frost' : 'dust'}.`; break;
        case ENGRAVE: case HEADSTONE: if (!_blindNow || can_reach_floor(true)) msg = `Something is engraved here on the ${eloc}.`; break;
        case BURN: if (!_blindNow || can_reach_floor(true)) msg = `Some text has been ${_isIce ? 'melted' : 'burned'} into the ${eloc} here.`; break;
        case MARK: if (!_blindNow) msg = `There's some graffiti on the ${eloc} here.`; break;
        case ENGR_BLOOD: if (!_blindNow) msg = `You ${wizard_Unaware() ? 'dream that you see' : 'see'} a message scrawled in blood here.`; break;
        default: await real_impossible('Something is written in a very strange way.'); msg = ''; break;
        }
        if (msg !== null) {
            const _joins = (_reveal_text(ep).length + msg.length + 3) < (80 - 8);
            const _arrivalPages = redrawPending && !_joins;
            if (msg) {
                const _committed = (game && (game._pending_message || game._resultMessage)) || '';
                const _directPline = (_committed.length > 0)
                    ? !!(game._pending_message && game._pending_message.length > 0)
                    : (!redrawPending && msg.length <= _PLINE_PAGED_WRAP_CAPACITY);
                if (ep.engr_type === ENGR_BLOOD && _directPline)
                    await You_see('a message scrawled in blood here.');
                else
                    await _pline_paged(msg, _joins || !_arrivalPages, _arrivalPages);
            }
            /* C ref: engrave.c:397 — SECOND pline of read_engr_at:
             * the literal text reveal.  You("%s: \"%s\"%s",
             * (Blind) ? "feel the words" : "read", et, endpunct).
             * For the tut-1 arrival engraving (not Blind, elen=25,
             * last char 'l' not in ".!?"), endpunct="." and
             * prefix="read", yielding "You read: \"...\"." This is
             * the LAST pline of the chain, so whether it pages
             * depends on redrawPending — see keystone-spec-
             * paging-fix.md (arrival pages; mid-walk does not). */
            {
                const _reveal = _reveal_text(ep);
                await _pline_paged(_reveal, true, _arrivalPages);
                if (game.program_state?.in_moveloop | 0)
                    _topl_stash_result();
            }
            /* C engrave.c:396-399 — a sensed engraving becomes remembered at
             * the moment it is read.  Keep this separate from `text`: wiping
             * later changes the actual engraving but must not rewrite the
             * remembered snapshot used by /e. */
            ep.remembered = ep.text;
            ep.eread = 1;
            ep.erevealed = 1;
            if ((game.context?.run | 0) > 0)
                nomul(0);
        }
    }
}
