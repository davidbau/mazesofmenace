// pray.js — Prayer / altar gods (partial).
// C ref: pray.c — can_pray, dopray, prayer_done, gods_upset, angrygods,
// water_prayer, on_altar / a_align helpers; dosacrifice (#offer); #turn
// (doturn / maybe_turn_mon_iter, D-0912); desecrate_altar / god_zaps_you /
// fry_by_god (D-0963); angrygods cases 4–8 + gods_angry (D-0969).
//
// Branch envelope: ParanoidPray → paranoid_query(ParanoidConfirm) (D-1000)
// + wizard Force (D-0517) + #pray ublesscnt-too-soon (p_type 0) →
// angrygods; p_type 3 → pleased You_feel + action rn1 + TROUBLE_HIT
// fix_worst_trouble (D-0920) + TROUBLE_LYCANTHROPE you_unwere (D-1004)
// + majors Stoned…Region (D-1011) + collapsing…cursed_blindfold +
// all minor TROUBLE_* (D-1012) + ublesscnt rnz(350); #offer not-on-altar;
// Knight/Cleric #turn chant + exercise + undead iter + nomul;
// digactualhole altar → desecrate_altar; angrygods 0–8 + default zap
// (punish/attrcurse/rndcurse/summon_minion/god_zaps_you).
// Named omissions: pleased pat_on_head gifts / crown / give_spell;
// p_type -2/-1/1/2 outcome bodies beyond water_prayer scan;
// pray_revive; floorfood sacrifice; known_spell SPE_TURN_UNDEAD /
// spelleffects fallback for non-Knight/Cleric; resist TELL pline polish;
// other livelog paths; poly silent/headless can_chant; Fixed_abil/Dunce
// adjattrib; Unaware You_feel dream prefix; music.c do_earthquake altar
// desecrate_altar; SetVoice pitch; ureflects non-shield slots; shieldeff;
// poly mlet "creature" vs mortal; BlindedTimeout==1 region polish;
// stuck_in_wall blocked_boulder Sokoban diagonal polish; update_inventory
// redraw; Blindfolded cream/itch; attacktype_fordmg swallow Blind gate.

import { game } from './gstate.js';
import { rn2, rn1, rnl, rnz, rnd, d } from './rng.js';
import { pline, verbalize, You_feel } from './display.js';
import { nomul } from './hack.js';
import { A_WIS, A_STR, A_MAX, change_luck, adjattrib, adjalign, exercise } from './attrib.js';
import { align_gname, xlev_to_rank, uhim } from './roles.js';
import { objects_at, uncurse } from './mkobj.js';
import { yn_function, paranoid_query } from './getline.js';
import { livelog_printf } from './pline.js';
import { can_chant } from './spell.js';
import { couldsee } from './vision.js';
import { monflee } from './monmove.js';
import { set_malign } from './makemon.js';
import { killed, xkilled } from './uhitm.js';
import { aggravate } from './wizard.js';
import { setuhpmax } from './exper.js';
import { done } from './end.js';
import { monstseesu, monstunseesu } from './mondata.js';
import { mon_nam, Monnam } from './do_name.js';
import { disintegrate_arm, setworn, stuck_ring, unchanger } from './do_wear.js';
import { summon_minion } from './minion.js';
import { makeknown, near_capacity, encumber_msg } from './invent.js';
import { punish, unpunish } from './read.js';
import { attrcurse, rndcurse } from './sit.js';
import { An, xname, makeplural, vtense } from './objnam.js';
import { objectNames, POT_WATER, POTION_CLASS } from './objects.js';
import {
    is_undead as mon_is_undead,
    is_demon as mon_is_demon,
    is_vampshifter,
    nohands, throws_rocks,
    MR_ELEC, MR_DISINT,
} from './monsters.js';
import {
    PM_KNIGHT,
    PM_CLERIC,
} from './generated/monsters_data.js';
import { you_unwere } from './were.js';
import {
    make_slimed, make_stoned, make_sick,
    make_confused, make_stunned, make_hallucinated,
    make_glib, make_deaf,
} from './potion.js';
import { init_uhunger } from './eat.js';
import { region_danger, region_safety } from './region.js';
import { safe_teleds } from './teleport.js';
import { reset_utrap, rescued_from_terrain, heal_legs } from './trap.js';
import { welded } from './wield.js';
import { which_armor } from './worn.js';
import { rehumanize } from './polyself.js';
import { make_blinded } from './do.js';
import { buried_ball_to_freedom } from './dig.js';
import { confers_luck } from './artifact.js';
import {
    IS_ALTAR, Amask2align, AM_MASK, AM_SHRINE, A_NONE, A_LAWFUL, A_NEUTRAL,
    A_CHAOTIC, GEHENNOM, ECMD_OK, ECMD_TIME, PARANOID_PRAY, PARANOID_CONFIRM,
    LL_CONDUCT,
    LL_MINORAC, BOLT_LIM, MAXULEV, TELL, NOTELL, Upolyd, ismnum,
    DIED, KILLED_BY, Is_astralevel, M_SEEN_REFL, M_SEEN_ELEC, M_SEEN_DISINT,
    W_ARMS, W_ARMC, W_ARM, W_AMUL, OBJ_FREE, SICK_ALL,
    WEAK, HUNGRY, TT_LAVA, TT_BURIEDBALL, TELEDS_NO_FLAGS, DISSOLVED,
    XKILL_NOMSG, XKILL_NOCORPSE, XKILL_NOCONDUCT,
    EXT_ENCUMBER, HVY_ENCUMBER, TIMEOUT, isok, IS_OBSTRUCTED,
    SDOOR, SCORR, W_SADDLE, EYE, STOMACH,
} from './const.js';

const SHIELD_OF_REFLECTION = objectNames.indexOf('SHIELD_OF_REFLECTION');
const AMULET_OF_REFLECTION = objectNames.indexOf('AMULET_OF_REFLECTION');
const AMULET_OF_STRANGULATION = objectNames.indexOf('AMULET_OF_STRANGULATION');
const LEVITATION_BOOTS = objectNames.indexOf('LEVITATION_BOOTS');
const RIN_LEVITATION = objectNames.indexOf('RIN_LEVITATION');
const RIN_SUSTAIN_ABILITY = objectNames.indexOf('RIN_SUSTAIN_ABILITY');
const GAUNTLETS_OF_FUMBLING = objectNames.indexOf('GAUNTLETS_OF_FUMBLING');
const FUMBLE_BOOTS = objectNames.indexOf('FUMBLE_BOOTS');
const LOADSTONE = objectNames.indexOf('LOADSTONE');
const HELM_OF_OPPOSITE_ALIGNMENT = objectNames.indexOf('HELM_OF_OPPOSITE_ALIGNMENT');
const SADDLE = objectNames.indexOf('SADDLE');
const BOULDER = objectNames.indexOf('BOULDER');

const MOLOCH = 'Moloch';

const STRIDENT = 4; // pray.c
const DEVOUT = 14; // pray.c
// C: pray.c TROUBLE_* (priority via in_trouble order, not magnitude)
const TROUBLE_STONED = 14;
const TROUBLE_SLIMED = 13;
const TROUBLE_STRANGLED = 12;
const TROUBLE_LAVA = 11;
const TROUBLE_SICK = 10;
const TROUBLE_STARVING = 9;
const TROUBLE_REGION = 8;
const TROUBLE_HIT = 7;
const TROUBLE_LYCANTHROPE = 6;
const TROUBLE_COLLAPSING = 5;
const TROUBLE_STUCK_IN_WALL = 4;
const TROUBLE_CURSED_LEVITATION = 3;
const TROUBLE_UNUSEABLE_HANDS = 2;
const TROUBLE_CURSED_BLINDFOLD = 1;
const TROUBLE_PUNISHED = -1;
const TROUBLE_FUMBLING = -2;
const TROUBLE_CURSED_ITEMS = -3;
const TROUBLE_SADDLE = -4;
const TROUBLE_BLIND = -5;
const TROUBLE_POISONED = -6;
const TROUBLE_WOUNDED_LEGS = -7;
const TROUBLE_HUNGRY = -8;
const TROUBLE_STUNNED = -9;
const TROUBLE_CONFUSED = -10;
const TROUBLE_HALLUCINATION = -11;
// C: pray.c godvoices[]
const GODVOICES = ['booms out', 'thunders', 'rings out', 'booms'];

function Luck() {
    const u = game.u || {};
    return (u.uluck || 0) + (u.moreluck || 0);
}

function Inhell() {
    return (game.u?.uz?.dnum | 0) === GEHENNOM;
}

function Blind() {
    return !!(game.u?.Blind || game.u?.ublind);
}

function Hallucination() {
    return !!(game.u?.Hallucination);
}

/** C youprop.h Antimagic. */
function Antimagic() {
    const u = game.u || {};
    return !!(u.Antimagic || u.HAntimagic || u.EAntimagic);
}

/** C: Punished ≡ uball != 0. */
function Punished() {
    return !!(game.u?.uball);
}

/** C ref: potion.c hcolor — Hallucination synonym deferred. */
function hcolor(colorword) {
    return colorword || 'odd';
}

/** C: pray.c on_altar */
function on_altar() {
    const u = game.u;
    const loc = game.level?.at(u?.ux, u?.uy);
    return !!(loc && IS_ALTAR(loc.typ));
}

/** C: pray.c on_shrine — altarmask AM_SHRINE */
function on_shrine() {
    const u = game.u;
    const loc = game.level?.at(u?.ux, u?.uy);
    if (!loc) return false;
    const mask = (loc.altarmask != null ? loc.altarmask : loc.flags) | 0;
    return (mask & AM_SHRINE) !== 0;
}

/** C: pray.c a_align — altarmask overlays rm.flags in C; JS mkaltar uses flags */
function a_align(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return A_NONE;
    const mask = (loc.altarmask != null ? loc.altarmask : loc.flags) | 0;
    return Amask2align(mask & AM_MASK);
}

/**
 * C ref: pray.c critically_low_hp — hp ≤ 5 or hp*divisor ≤ maxhp.
 * @param {boolean} only_if_injured
 */
function critically_low_hp(only_if_injured) {
    const u = game.u || {};
    const polyd = Upolyd(u);
    let curhp = polyd ? (u.mh | 0) : (u.uhp | 0);
    let maxhp = polyd ? (u.mhmax | 0) : (u.uhpmax | 0);
    if (only_if_injured && !(curhp < maxhp)) return false;
    const hplim = 15 * (u.ulevel | 0);
    if (maxhp > hplim) maxhp = hplim;
    let divisor;
    switch (xlev_to_rank(u.ulevel | 0)) {
    case 0:
    case 1:
        divisor = 5;
        break;
    case 2:
    case 3:
        divisor = 6;
        break;
    case 4:
    case 5:
        divisor = 7;
        break;
    case 6:
    case 7:
        divisor = 8;
        break;
    default:
        divisor = 9;
        break;
    }
    return curhp <= 5 || curhp * divisor <= maxhp;
}

/** C: pray.c `#define Cursed_obj(obj, typ)`. */
function Cursed_obj(obj, typ) {
    return !!(obj && (obj.otyp | 0) === (typ | 0) && obj.cursed);
}

/** C youprop.h Blindfolded / BlindedTimeout / Blinded / Passes_walls / Fixed_abil. */
function Blindfolded() {
    return !!(game.u?.EBlinded || game.u?.ublindf);
}
function Blindfolded_only() {
    return Blindfolded() && !BlindedProp();
}
function BlindedTimeout() {
    return (game.u?.HBlinded | 0) & TIMEOUT;
}
function BlindedProp() {
    const u = game.u || {};
    // C: Blinded ≡ (HBlinded && !BBlinded)
    return !!((u.HBlinded | 0) && !(u.BBlinded | 0));
}
function Passes_walls() {
    const u = game.u || {};
    return !!((u.HPasses_walls | 0) || (u.EPasses_walls | 0) || u.Passes_walls);
}
function Fixed_abil() {
    const u = game.u || {};
    return !!((u.HFixed_abil | 0) || (u.EFixed_abil | 0) || u.Fixed_abil);
}
function Wounded_legs() {
    const u = game.u || {};
    return !!(u.Wounded_legs
        || ((u.HWounded_legs | 0) & TIMEOUT)
        || (u.EWounded_legs | 0));
}
function DeafProp() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf);
}

/** C obj.h bimanual — WEAPON/TOOL with oc_big. */
function bimanual(obj) {
    if (!obj) return false;
    return !!(game.objects?.[obj.otyp]?.oc_bimanual
        || game.objects?.[obj.otyp]?.oc_big);
}

/** C engrave.c freehand — welded two-hand / cursed shield gate. */
function freehand() {
    const u = game.u || {};
    const uwep = u.uwep;
    if (!uwep || !welded(uwep)) return true;
    if (!bimanual(uwep) && (!u.uarms || !u.uarms.cursed)) return true;
    return false;
}

/** C: mondata.c body_part thin — poly table deferred. */
function body_part(part) {
    if ((part | 0) === EYE) return 'eye';
    if ((part | 0) === STOMACH) return 'stomach';
    return 'body';
}

/** C: mondata.c eyecount — poly forms deferred (humanoid 2). */
function eyecount(_data) {
    return 2;
}

/**
 * C ref: pray.c blocked_boulder — boulder stack / pushability gate.
 * Named omit: Sokoban diagonal + pool sink nuance beyond isok/obstruct.
 */
function blocked_boulder(dx, dy) {
    const u = game.u || {};
    let count = 0;
    for (let otmp = objects_at((u.ux | 0) + dx, (u.uy | 0) + dy);
        otmp; otmp = otmp.nexthere) {
        if ((otmp.otyp | 0) === BOULDER) count += otmp.quan | 0;
    }
    const nx = (u.ux | 0) + 2 * dx;
    const ny = (u.uy | 0) + 2 * dy;
    if (count === 0) return false;
    if (count >= 2) {
        // C: pool/lava may still allow push — thin: treat ≥2 as blocked
        return true;
    }
    if (dx && dy && !!(game.level?.flags?.sokoban_rules
        || game.level?.flags?.sokoban || game.Sokoban)) {
        return true;
    }
    if (!isok(nx, ny)) return true;
    const loc = game.level?.at(nx, ny);
    if (loc && IS_OBSTRUCTED(loc.typ | 0)) return true;
    for (let otmp = objects_at(nx, ny); otmp; otmp = otmp.nexthere) {
        if ((otmp.otyp | 0) === BOULDER) return true;
    }
    return false;
}

/**
 * C ref: pray.c stuck_in_wall — all 8 neighbors obstructed / boulder-blocked.
 */
function stuck_in_wall() {
    const u = game.u || {};
    if (Passes_walls()) return false;
    let count = 0;
    for (let i = -1; i <= 1; i++) {
        const x = (u.ux | 0) + i;
        for (let j = -1; j <= 1; j++) {
            if (!i && !j) continue;
            const y = (u.uy | 0) + j;
            const loc = game.level?.at(x, y);
            const typ = loc ? (loc.typ | 0) : -1;
            if (!isok(x, y)
                || (IS_OBSTRUCTED(typ) && typ !== SDOOR && typ !== SCORR)
                || (blocked_boulder(i, j)
                    && !throws_rocks(game.youmonst?.data))) {
                count++;
            }
        }
    }
    return count === 8;
}

/**
 * C ref: pray.c worst_cursed_item — select cursed worn/invent for uncurse.
 * @returns {object|null}
 */
function worst_cursed_item() {
    const u = game.u || {};
    let otmp = null;
    if (near_capacity() >= HVY_ENCUMBER) {
        for (const o of game.invent || []) {
            if (Cursed_obj(o, LOADSTONE)) return o;
        }
    }
    if (u.uwep && welded(u.uwep) && (u.uright || bimanual(u.uwep))) {
        otmp = u.uwep;
    } else if (u.uarmg && u.uarmg.cursed) {
        otmp = u.uarmg;
    } else if (u.uarms && u.uarms.cursed) {
        otmp = u.uarms;
    } else if (u.uarmc && u.uarmc.cursed) {
        otmp = u.uarmc;
    } else if (u.uarm && u.uarm.cursed) {
        otmp = u.uarm;
    } else if (u.uarmh && u.uarmh.cursed
        && (u.uarmh.otyp | 0) !== HELM_OF_OPPOSITE_ALIGNMENT) {
        otmp = u.uarmh;
    } else if (u.uarmf && u.uarmf.cursed) {
        otmp = u.uarmf;
    } else if (u.uarmu && u.uarmu.cursed) {
        otmp = u.uarmu;
    } else if (u.uamul && u.uamul.cursed) {
        otmp = u.uamul;
    } else if (u.uleft && u.uleft.cursed) {
        otmp = u.uleft;
    } else if (u.uright && u.uright.cursed) {
        otmp = u.uright;
    } else if (u.ublindf && u.ublindf.cursed) {
        otmp = u.ublindf;
    } else if (u.uwep && welded(u.uwep)) {
        otmp = u.uwep;
    } else if (u.uswapwep && u.uswapwep.cursed && u.twoweap) {
        otmp = u.uswapwep;
    } else {
        otmp = null;
        for (const o of game.invent || []) {
            if (!o.cursed) continue;
            if ((o.otyp | 0) === LOADSTONE || confers_luck(o)) {
                otmp = o;
                break;
            }
        }
    }
    return otmp || null;
}

/**
 * C ref: pray.c fix_curse_trouble — glow + uncurse (+ Glib gloves clear).
 * Named omit: update_inventory redraw; PLNMSG_OBJ_GLOWS.
 */
async function fix_curse_trouble(otmp, what) {
    const u = game.u || {};
    if (!otmp) return;
    if (otmp === u.uarmg && (u.Glib | 0)) {
        make_glib(0);
        await pline('Your gloves are no longer slippery.');
        if (!otmp.cursed) return;
    }
    if (!Blind() || (otmp === u.ublindf && Blindfolded_only())) {
        const glow = what || `Your ${xname(otmp)} softly glows`;
        await pline(`${glow} ${hcolor('amber')}.`);
        otmp.bknown = !Hallucination();
    }
    uncurse(otmp);
}

/**
 * C ref: pray.c in_trouble — major/minor trouble ranking.
 * Ported: all TROUBLE_* majors + minors (D-1011/D-1012).
 * Named omit: swallow Blind attacktype_fordmg gate polish.
 */
function in_trouble() {
    const u = game.u || {};
    // C: major troubles in priority order
    if (u.Stoned) return TROUBLE_STONED;
    if (u.Slimed) return TROUBLE_SLIMED;
    if (u.Strangled || (u.HStrangled | 0) || (u.EStrangled | 0)) {
        return TROUBLE_STRANGLED;
    }
    if (u.utrap && (u.utraptype | 0) === TT_LAVA) return TROUBLE_LAVA;
    if (u.Sick) return TROUBLE_SICK;
    if ((u.uhs | 0) >= WEAK) return TROUBLE_STARVING;
    if (region_danger()) return TROUBLE_REGION;
    const unchanging = !!(u.Unchanging || u.HUnchanging);
    if ((!Upolyd(u) || unchanging) && critically_low_hp(false)) {
        return TROUBLE_HIT;
    }
    if (ismnum(u.ulycn)) return TROUBLE_LYCANTHROPE;
    const abaseStr = u.acurr?.a?.[A_STR] | 0;
    const amaxStr = u.amax?.a?.[A_STR] | 0;
    if (near_capacity() >= EXT_ENCUMBER && amaxStr - abaseStr > 3) {
        return TROUBLE_COLLAPSING;
    }
    if (stuck_in_wall()) return TROUBLE_STUCK_IN_WALL;
    if (Cursed_obj(u.uarmf, LEVITATION_BOOTS)
        || stuck_ring(u.uleft, RIN_LEVITATION)
        || stuck_ring(u.uright, RIN_LEVITATION)) {
        return TROUBLE_CURSED_LEVITATION;
    }
    if (nohands(game.youmonst?.data) || !freehand()) {
        if (u.uwep && welded(u.uwep)) return TROUBLE_UNUSEABLE_HANDS;
        if (Upolyd(u) && nohands(game.youmonst?.data)
            && (!unchanging
                || (() => {
                    const ot = unchanger();
                    return ot && ot.cursed;
                })())) {
            return TROUBLE_UNUSEABLE_HANDS;
        }
    }
    if (Blindfolded() && u.ublindf && u.ublindf.cursed) {
        return TROUBLE_CURSED_BLINDFOLD;
    }

    // C: minor troubles
    if (Punished() || (u.utrap && (u.utraptype | 0) === TT_BURIEDBALL)) {
        return TROUBLE_PUNISHED;
    }
    if (Cursed_obj(u.uarmg, GAUNTLETS_OF_FUMBLING)
        || Cursed_obj(u.uarmf, FUMBLE_BOOTS)) {
        return TROUBLE_FUMBLING;
    }
    if (worst_cursed_item()) return TROUBLE_CURSED_ITEMS;
    if (u.usteed) {
        const sad = which_armor(u.usteed, W_SADDLE);
        if (Cursed_obj(sad, SADDLE)) return TROUBLE_SADDLE;
    }
    if (BlindedTimeout() > 1
        && !((u.HBlinded | 0) & ~TIMEOUT)
        && (!u.uswallow
            /* attacktype_fordmg swallow Blind deferred — treat as not blind */)) {
        return TROUBLE_BLIND;
    }
    if (((u.HDeaf | 0) & TIMEOUT) > 1) return TROUBLE_BLIND;

    for (let i = 0; i < A_MAX; i++) {
        const base = u.acurr?.a?.[i] | 0;
        const mx = u.amax?.a?.[i] | 0;
        if (base < mx) return TROUBLE_POISONED;
    }
    if (Wounded_legs() && !u.usteed) return TROUBLE_WOUNDED_LEGS;
    if ((u.uhs | 0) >= HUNGRY) return TROUBLE_HUNGRY;
    if ((u.HStun | 0) & TIMEOUT) return TROUBLE_STUNNED;
    if ((u.HConfusion | 0) & TIMEOUT) return TROUBLE_CONFUSED;
    if ((u.HHallucination | 0) & TIMEOUT) return TROUBLE_HALLUCINATION;
    return 0;
}

/** C invent.c useup for worn strangulation amulet (setworn + freeinv). */
function useup_strangle_amulet(otmp) {
    if (!otmp) return;
    const u = game.u || {};
    if (u.uamul === otmp) setworn(null, W_AMUL);
    else if ((otmp.owornmask | 0) & W_AMUL) {
        otmp.owornmask = (otmp.owornmask | 0) & ~W_AMUL;
    }
    if ((otmp.quan || 1) > 1) {
        otmp.quan--;
        return;
    }
    const inv = game.invent || [];
    const idx = inv.indexOf(otmp);
    if (idx >= 0) inv.splice(idx, 1);
    otmp.quan = 0;
    otmp.where = OBJ_FREE;
}

/**
 * C ref: pray.c fix_worst_trouble — divine repair of one trouble code.
 * Ported: Stoned…Hallucination + saddle (D-1011/D-1012).
 */
async function fix_worst_trouble(trouble) {
    const u = game.u || (game.u = {});
    if (!game.flags) game.flags = {};
    let otmp = null;
    let what = null;
    const leftglow = 'Your left ring softly glows';
    const rightglow = 'Your right ring softly glows';

    switch (trouble) {
    case TROUBLE_STONED:
        await make_stoned(0, 'You feel more limber.', 0, '');
        break;
    case TROUBLE_SLIMED:
        await make_slimed(0, 'The slime disappears.');
        break;
    case TROUBLE_STRANGLED: {
        if (u.uamul && (u.uamul.otyp | 0) === AMULET_OF_STRANGULATION) {
            await pline('Your amulet vanishes!');
            useup_strangle_amulet(u.uamul);
        }
        await pline('You can breathe again.');
        u.Strangled = 0;
        u.HStrangled = 0;
        u.EStrangled = 0;
        game.flags.botl = true;
        break;
    }
    case TROUBLE_LAVA:
        if (!(await safe_teleds(TELEDS_NO_FLAGS))) {
            reset_utrap(true);
        }
        await rescued_from_terrain(DISSOLVED);
        break;
    case TROUBLE_STARVING:
        // C: FALLTHROUGH into TROUBLE_HUNGRY
        await pline(`Your ${body_part(STOMACH)} feels content.`);
        init_uhunger();
        game.flags.botl = true;
        break;
    case TROUBLE_HUNGRY:
        await pline(`Your ${body_part(STOMACH)} feels content.`);
        init_uhunger();
        game.flags.botl = true;
        break;
    case TROUBLE_SICK:
        await You_feel('better.');
        await make_sick(0, '', false, SICK_ALL);
        break;
    case TROUBLE_REGION:
        await region_safety();
        break;
    case TROUBLE_HIT: {
        await You_feel('much better.');
        let maxhp;
        if (Upolyd(u)) {
            maxhp = (u.mhmax | 0) + rnd(5);
            setuhpmax(Math.max(maxhp, 5 + 1), false);
            u.mh = u.mhmax;
        }
        maxhp = u.uhpmax | 0;
        if (maxhp < (u.ulevel | 0) * 5 + 11) {
            maxhp += rnd(5);
        }
        setuhpmax(Math.max(maxhp, 5 + 1), true);
        u.uhp = u.uhpmax;
        game.flags.botl = true;
        break;
    }
    case TROUBLE_COLLAPSING: {
        const abaseStr = u.acurr?.a?.[A_STR] | 0;
        const amaxStr = u.amax?.a?.[A_STR] | 0;
        await You_feel(`${amaxStr - abaseStr > 6 ? 'much ' : ''}stronger.`);
        if (!u.acurr) u.acurr = { a: [10, 10, 10, 10, 10, 10] };
        if (!u.amax) u.amax = { a: [...(u.acurr.a || [10, 10, 10, 10, 10, 10])] };
        u.acurr.a[A_STR] = u.amax.a[A_STR] | 0;
        game.flags.botl = true;
        if (Fixed_abil()) {
            otmp = stuck_ring(u.uleft, RIN_SUSTAIN_ABILITY);
            if (otmp) {
                if (otmp === u.uleft) what = leftglow;
            } else {
                otmp = stuck_ring(u.uright, RIN_SUSTAIN_ABILITY);
                if (otmp === u.uright) what = rightglow;
            }
            if (otmp) {
                await fix_curse_trouble(otmp, what);
                break;
            }
        }
        break;
    }
    case TROUBLE_STUCK_IN_WALL:
        if (await safe_teleds(TELEDS_NO_FLAGS)) {
            await pline('Your surroundings change.');
        } else {
            // C: set_itimeout(&HPasses_walls, d(4,4)+4)
            const xt = d(4, 4) + 4;
            u.HPasses_walls = ((u.HPasses_walls | 0) & ~TIMEOUT) | (xt & TIMEOUT);
            await You_feel('much slimmer.');
        }
        break;
    case TROUBLE_CURSED_LEVITATION:
        if (Cursed_obj(u.uarmf, LEVITATION_BOOTS)) {
            otmp = u.uarmf;
        } else if ((otmp = stuck_ring(u.uleft, RIN_LEVITATION))) {
            if (otmp === u.uleft) what = leftglow;
        } else if ((otmp = stuck_ring(u.uright, RIN_LEVITATION))) {
            if (otmp === u.uright) what = rightglow;
        }
        await fix_curse_trouble(otmp, what);
        break;
    case TROUBLE_UNUSEABLE_HANDS:
        if (u.uwep && welded(u.uwep)) {
            await fix_curse_trouble(u.uwep, what);
            break;
        }
        if (Upolyd(u) && nohands(game.youmonst?.data)) {
            if (!(u.Unchanging || u.HUnchanging)) {
                await pline('Your shape becomes uncertain.');
                await rehumanize();
            } else {
                otmp = unchanger();
                if (otmp && otmp.cursed) {
                    await fix_curse_trouble(otmp, what);
                    break;
                }
            }
        }
        // C: impossible if still nohands/!freehand — omit
        break;
    case TROUBLE_CURSED_BLINDFOLD:
        await fix_curse_trouble(u.ublindf, what);
        break;
    case TROUBLE_LYCANTHROPE:
        await you_unwere(true);
        break;
    case TROUBLE_PUNISHED:
        await pline('Your chain disappears.');
        if (u.utrap && (u.utraptype | 0) === TT_BURIEDBALL) {
            buried_ball_to_freedom();
        } else {
            unpunish();
        }
        break;
    case TROUBLE_FUMBLING:
        if (Cursed_obj(u.uarmg, GAUNTLETS_OF_FUMBLING)) otmp = u.uarmg;
        else if (Cursed_obj(u.uarmf, FUMBLE_BOOTS)) otmp = u.uarmf;
        await fix_curse_trouble(otmp, what);
        break;
    case TROUBLE_CURSED_ITEMS:
        otmp = worst_cursed_item();
        if (otmp === u.uright) what = rightglow;
        else if (otmp === u.uleft) what = leftglow;
        await fix_curse_trouble(otmp, what);
        break;
    case TROUBLE_POISONED: {
        if (Hallucination()) {
            await pline("There's a tiger in your tank.");
        } else {
            await You_feel('in good health again.');
        }
        if (!u.acurr) u.acurr = { a: [10, 10, 10, 10, 10, 10] };
        if (!u.amax) u.amax = { a: [...u.acurr.a] };
        for (let i = 0; i < A_MAX; i++) {
            if ((u.acurr.a[i] | 0) < (u.amax.a[i] | 0)) {
                u.acurr.a[i] = u.amax.a[i] | 0;
                game.flags.botl = true;
            }
        }
        await encumber_msg();
        break;
    }
    case TROUBLE_BLIND: {
        let msgbuf = '';
        let eyes = body_part(EYE);
        const cure_deaf = !!((u.HDeaf | 0) & TIMEOUT);
        if (BlindedProp() || BlindedTimeout()) {
            if (eyecount(game.youmonst?.data) !== 1) eyes = makeplural(eyes);
            msgbuf = `Your ${eyes} ${vtense(eyes, 'feel')} better`;
            u.ucreamed = 0;
            await make_blinded(0, false);
        }
        if (cure_deaf) {
            await make_deaf(0, false);
            if (!DeafProp()) {
                msgbuf += msgbuf ? ' and you can hear again' : 'You can hear again';
            }
        }
        if (msgbuf) await pline(`${msgbuf}.`);
        break;
    }
    case TROUBLE_WOUNDED_LEGS:
        await heal_legs(0);
        break;
    case TROUBLE_STUNNED:
        await make_stunned(0, true);
        break;
    case TROUBLE_CONFUSED:
        await make_confused(0, true);
        break;
    case TROUBLE_HALLUCINATION:
        await pline('Looks like you are back in Kansas.');
        await make_hallucinated(0, false, 0);
        break;
    case TROUBLE_SADDLE: {
        otmp = which_armor(u.usteed, W_SADDLE);
        if (otmp && !Blind()) {
            await pline(`Your ${xname(otmp)} softly glows ${hcolor('amber')}.`);
            otmp.bknown = 1;
        }
        if (otmp) uncurse(otmp);
        break;
    }
    default:
        break;
    }
}

/** Local stubs — full mondata predicates deferred (C-JS-MAP). */
function is_demon(_data) {
    return false;
}
function is_undead(_data) {
    return false;
}

function pray_state() {
    if (!game.pray) game.pray = { p_aligntyp: 0, p_trouble: 0, p_type: 0 };
    return game.pray;
}

/**
 * C ref: pray.c water_prayer — bless/curse POT_WATER on altar; no RNG.
 * @returns {boolean} true if any water changed
 */
function water_prayer(bless_water) {
    const u = game.u;
    let changed = 0;
    let other = false;
    const bc_known = !(Blind() || Hallucination());
    for (let otmp = objects_at(u.ux, u.uy); otmp; otmp = otmp.nexthere) {
        if (
            otmp.otyp === POT_WATER
            && (bless_water ? !otmp.blessed : !otmp.cursed)
        ) {
            otmp.blessed = !!bless_water;
            otmp.cursed = !bless_water;
            otmp.bknown = bc_known;
            changed += otmp.quan | 0;
        } else if (otmp.oclass === POTION_CLASS) {
            other = true;
        }
    }
    // Glow pline deferred unless screens need it
    void other;
    return changed > 0;
}

/**
 * C ref: pray.c can_pray — set p_aligntyp / p_trouble / p_type.
 * @param {boolean} praying
 */
export async function can_pray(praying) {
    const u = game.u || (game.u = {});
    const gp = pray_state();
    const data = game.youmonst?.data;

    gp.p_aligntyp = on_altar() ? a_align(u.ux, u.uy) : (u.ualign?.type ?? 0);
    gp.p_trouble = in_trouble();

    if (
        is_demon(data)
        && (gp.p_aligntyp === A_LAWFUL || gp.p_aligntyp !== A_NEUTRAL)
    ) {
        if (praying) {
            await pline(
                `The very idea of praying to a ${
                    gp.p_aligntyp ? 'lawful' : 'neutral'
                } god is repugnant to you.`,
            );
        }
        return false;
    }

    if (praying) {
        await pline(
            `You begin praying to ${align_gname(game.urole, gp.p_aligntyp)}.`,
        );
    }

    const utype = u.ualign?.type ?? 0;
    const record = u.ualign?.record | 0;
    let alignment;
    if (utype && utype === -gp.p_aligntyp) {
        alignment = -record;
    } else if (utype !== gp.p_aligntyp) {
        alignment = Math.trunc(record / 2);
    } else {
        alignment = record;
    }

    const bless = u.ublesscnt | 0;
    if (gp.p_aligntyp === A_NONE) {
        gp.p_type = -2;
    } else if (
        (gp.p_trouble > 0)
            ? (bless > 200)
            : (gp.p_trouble < 0)
                ? (bless > 100)
                : (bless > 0)
    ) {
        gp.p_type = 0; // too soon
    } else if (Luck() < 0 || (u.ugangr | 0) || alignment < 0) {
        gp.p_type = 1;
    } else if (on_altar() && utype !== gp.p_aligntyp) {
        gp.p_type = 2;
    } else {
        gp.p_type = 3;
    }

    if (
        is_undead(data)
        && !Inhell()
        && (
            gp.p_aligntyp === A_LAWFUL
            || (gp.p_aligntyp === A_NEUTRAL && !rn2(10))
        )
    ) {
        gp.p_type = -1;
    }

    return !praying ? (gp.p_type === 3 && !Inhell()) : true;
}

/**
 * C ref: pray.c godvoice — ROLL_FROM(godvoices) → rn2(4).
 * @param {number} g_align
 * @param {string|null} words
 */
async function godvoice(g_align, words) {
    let quot = '';
    let w = words;
    if (w) quot = '"';
    else w = '';
    const how = GODVOICES[rn2(GODVOICES.length)];
    await pline(
        `The voice of ${align_gname(game.urole, g_align)} ${how}: ${quot}${w}${quot}`,
    );
}

/**
 * C ref: pray.c altar_wrath — kick/engrave/dig desecration voice.
 * Branch envelope: own-altar record > -rn2(4) → godvoice + adjattrib WIS
 * + record--; else Deaf-aware whisper + verbalize + Luck>−5 rn2 luck loss.
 * Named omit: SetVoice pitch.
 */
export async function altar_wrath(x, y) {
    const u = game.u || (game.u = {});
    if (!u.ualign) u.ualign = { type: 0, record: 0 };
    const altaralign = a_align(x, y);
    const Deaf = !!(u.Deaf || u.HDeaf || u.EDeaf || u.uroleplay?.deaf);

    if ((u.ualign.type | 0) === (altaralign | 0)
        && (u.ualign.record | 0) > -rn2(4)) {
        await godvoice(altaralign, 'How darest thou desecrate my altar!');
        await adjattrib(A_WIS, -1, false);
        u.ualign.record = (u.ualign.record | 0) - 1;
    } else {
        await pline(
            `${!Deaf ? 'A voice (could it be' : 'Despite your deafness, you seem to hear'} ${
                align_gname(game.urole, altaralign)
            }${!Deaf ? '?) whispers' : ' say'}:`,
        );
        // SetVoice deferred
        await verbalize('Thou shalt pay, infidel!');
        if (Luck() > -5 && rn2(Luck() + 6)) {
            change_luck(rn2(20) ? -1 : -2);
        }
    }
}

/**
 * C ref: exper.c losexp — level-drain for divine anger (drainer==null).
 * RNG-free body; resists_drli / Upolyd / achievements deferred.
 */
function losexp_divine() {
    const u = game.u || (game.u = {});
    if ((u.ulevel | 0) > 1) {
        u.ulevel = (u.ulevel | 0) - 1;
        // adjabil / "lost experience level N" livelog deferred
    } else {
        u.uexp = 0;
        // C: livelog_printf(LL_MINORAC, "lost all experience")
        livelog_printf(LL_MINORAC, 'lost all experience');
    }
    const numHp = (u.uhpinc?.[u.ulevel] | 0);
    u.uhpmax = (u.uhpmax | 0) - numHp;
    if ((u.uhpmax | 0) < 10) u.uhpmax = 10;
    u.uhp = (u.uhp | 0) - numHp;
    if ((u.uhp | 0) < 1) u.uhp = 1;
    else if ((u.uhp | 0) > (u.uhpmax | 0)) u.uhp = u.uhpmax;
    const numEn = (u.ueninc?.[u.ulevel] | 0);
    u.uenmax = (u.uenmax | 0) - numEn;
    if ((u.uenmax | 0) < 0) u.uenmax = 0;
    u.uen = (u.uen | 0) - numEn;
    if ((u.uen | 0) < 0) u.uen = 0;
    else if ((u.uen | 0) > (u.uenmax | 0)) u.uen = u.uenmax;
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
}

/** C ref: youprop.h Reflecting — H/E + worn SoR/AoR subset. */
function Reflecting() {
    const u = game.u || {};
    if ((u.HReflecting | 0) || (u.EReflecting | 0) || u.Reflecting) return true;
    if (u.uarms?.otyp === SHIELD_OF_REFLECTION) return true;
    if (u.uamul?.otyp === AMULET_OF_REFLECTION) return true;
    return false;
}

/** C ref: youprop.h Shock_resistance */
function Shock_resistance() {
    const u = game.u || {};
    return !!(u.Shock_resistance || (u.HShock_resistance | 0)
        || (u.EShock_resistance | 0));
}

/** C ref: youprop.h Disint_resistance */
function Disint_resistance() {
    const u = game.u || {};
    return !!(u.Disint_resistance || (u.HDisint_resistance | 0)
        || (u.EDisint_resistance | 0));
}

/** C: monst.h resists_elec / resists_disint via mresists|mextrinsics|mintrinsics. */
function mon_resists_bit(mon, mrBit) {
    if (!mon) return false;
    const bits = (mon.data?.mresists | 0)
        | (mon.mextrinsics | 0)
        | (mon.mintrinsics | 0);
    return !!(bits & mrBit);
}
function resists_elec(mon) { return mon_resists_bit(mon, MR_ELEC); }
function resists_disint(mon) { return mon_resists_bit(mon, MR_DISINT); }

/** C: dungeon.h Is_sanctum — on_level(&u.uz, &sanctum_level). */
function Is_sanctum(uz) {
    const s = game.sanctum_level;
    const lev = uz ?? game.u?.uz;
    return !!(s && lev
        && (s.dnum | 0) === (lev.dnum | 0)
        && (s.dlevel | 0) === (lev.dlevel | 0));
}

/**
 * C ref: muse.c ureflects — shield slot only (other slots deferred).
 * @returns {Promise<boolean>}
 */
async function ureflects(fmt, str) {
    if (game.u?.uarms?.otyp === SHIELD_OF_REFLECTION) {
        if (fmt && str) {
            await pline(`${str} reflects from your shield.`);
            makeknown(SHIELD_OF_REFLECTION);
        }
        return true;
    }
    return false;
}

/**
 * C ref: pray.c fry_by_god — lightning or disintegration death.
 * @param {number} resp_god
 * @param {boolean} via_disintegration
 */
async function fry_by_god(resp_god, via_disintegration) {
    await pline(
        `You ${!via_disintegration
            ? 'fry to a crisp'
            : 'disintegrate into a pile of dust'}!`,
    );
    if (!game.killer) game.killer = { name: '', format: 0 };
    game.killer.format = KILLED_BY;
    game.killer.name = `the wrath of ${align_gname(game.urole, resp_god)}`;
    await done(DIED);
}

/**
 * C ref: pray.c god_zaps_you — lightning then disintegration wrath.
 * Branch envelope: swallow elec/disint on ustuck; Reflecting / Shock /
 * fry; armor strip via disintegrate_arm; Disint bask + godvoice; astral/
 * sanctum 3× summon_minion.
 * Named omissions: shieldeff flash; SetVoice; ureflects non-shield;
 * @param {number} resp_god
 */
export async function god_zaps_you(resp_god) {
    const u = game.u || (game.u = {});

    if (u.uswallow && u.ustuck) {
        await pline(
            'Suddenly a bolt of lightning comes down at you from the heavens!',
        );
        await pline(`It strikes ${mon_nam(u.ustuck)}!`);
        if (!resists_elec(u.ustuck)) {
            await pline(`${Monnam(u.ustuck)} fries to a crisp!`);
            await xkilled(u.ustuck, XKILL_NOMSG | XKILL_NOCONDUCT);
        } else {
            await pline(`${Monnam(u.ustuck)} seems unaffected.`);
        }
    } else {
        await pline('Suddenly, a bolt of lightning strikes you!');
        if (Reflecting()) {
            // shieldeff deferred
            if (Blind()) {
                await pline("For some reason you're unaffected.");
            } else {
                await ureflects('%s reflects from your %s.', 'It');
            }
            monstseesu(M_SEEN_REFL);
        } else if (Shock_resistance()) {
            // shieldeff deferred
            await pline('It seems not to affect you.');
            monstseesu(M_SEEN_ELEC);
            monstunseesu(M_SEEN_REFL);
        } else {
            await fry_by_god(resp_god, false);
            monstunseesu(M_SEEN_REFL | M_SEEN_ELEC);
            return;
        }
    }

    await pline(`${align_gname(game.urole, resp_god)} is not deterred...`);
    if (u.uswallow && u.ustuck) {
        await pline(
            `A wide-angle disintegration beam aimed at you hits ${mon_nam(u.ustuck)}!`,
        );
        if (!resists_disint(u.ustuck)) {
            await pline(
                `${Monnam(u.ustuck)} disintegrates into a pile of dust!`,
            );
            await xkilled(
                u.ustuck,
                XKILL_NOMSG | XKILL_NOCORPSE | XKILL_NOCONDUCT,
            );
        } else {
            await pline(`${Monnam(u.ustuck)} seems unaffected.`);
        }
    } else {
        await pline('A wide-angle disintegration beam hits you!');

        const EReflecting = u.EReflecting | 0;
        const EDisint = u.EDisint_resistance | 0;
        if (u.uarms && !(EReflecting & W_ARMS) && !(EDisint & W_ARMS)) {
            await disintegrate_arm(u.uarms);
        }
        if (u.uarmc && !(EReflecting & W_ARMC) && !(EDisint & W_ARMC)) {
            await disintegrate_arm(u.uarmc);
        }
        if (u.uarm && !(EReflecting & W_ARM) && !(EDisint & W_ARM)
            && !u.uarmc) {
            await disintegrate_arm(u.uarm);
        }
        if (u.uarmu && !u.uarm && !u.uarmc) {
            await disintegrate_arm(u.uarmu);
        }
        if (!Disint_resistance()) {
            await fry_by_god(resp_god, true);
            monstunseesu(M_SEEN_DISINT);
            return;
        }
        await pline('You bask in its black glow for a minute...');
        await godvoice(resp_god, 'I believe it not!');
        monstseesu(M_SEEN_DISINT);
        if (Is_astralevel(u.uz) || Is_sanctum(u.uz)) {
            // SetVoice deferred
            await verbalize('Thou cannot escape my wrath, mortal!');
            await summon_minion(resp_god, false);
            await summon_minion(resp_god, false);
            await summon_minion(resp_god, false);
            await verbalize(`Destroy ${uhim()}, my servants!`);
        }
    }
}

/**
 * C ref: pray.c desecrate_altar — dig/convert high-altar wrath.
 * Branch envelope: own-altar adjalign/ugangr; charged air + notice pline;
 * godvoice; god_zaps_you.
 * @param {boolean} highaltar
 * @param {number} altaralign
 */
export async function desecrate_altar(highaltar, altaralign) {
    const u = game.u || (game.u = {});
    if (altaralign === (u.ualign?.type ?? 0)) {
        adjalign(-20);
        u.ugangr = (u.ugangr | 0) + 5;
    }
    await You_feel('the air around you grow charged...');
    await pline(
        `Suddenly, you realize that ${align_gname(game.urole, altaralign)} has noticed you...`,
    );
    await godvoice(
        altaralign,
        `So, mortal!  You dare desecrate my ${highaltar ? 'High Temple' : 'altar'}!`,
    );
    await god_zaps_you(altaralign);
}

/**
 * C ref: pray.c gods_angry — deity voice before curse/punish/zap arms.
 * @param {number} g_align
 */
async function gods_angry(g_align) {
    await godvoice(g_align, 'Thou hast angered me.');
}

/**
 * C ref: pray.c angrygods — cases 0–8 + default god_zaps_you + ublesscnt
 * rnz(300) tail (D-0969).
 * Named omissions: SetVoice pitch; poly mlet "creature"; shieldeff on
 * Antimagic glow path.
 */
async function angrygods(resp_god) {
    const u = game.u || (game.u = {});
    if (Inhell()) resp_god = A_NONE;
    u.ublessed = 0;

    let maxanger;
    if (resp_god !== (u.ualign?.type ?? 0)) {
        maxanger = Math.trunc((u.ualign?.record | 0) / 2)
            + (Luck() > 0 ? -Math.trunc(Luck() / 3) : -Luck());
    } else {
        maxanger = 3 * (u.ugangr | 0)
            + ((Luck() > 0 || ((u.ualign?.record | 0) >= STRIDENT))
                ? -Math.trunc(Luck() / 3)
                : -Luck());
    }
    if (maxanger < 1) maxanger = 1;
    else if (maxanger > 15) maxanger = 15;

    const mortal = 'mortal'; // youmonst.data->mlet == S_HUMAN assumed for L1 roles
    switch (rn2(maxanger)) {
    case 0:
    case 1:
        await pline(
            `You feel that ${align_gname(game.urole, resp_god)} is ${
                Hallucination() ? 'bummed' : 'displeased'
            }.`,
        );
        break;
    case 2:
    case 3: {
        await godvoice(resp_god, null);
        const strayed = ((u.ualign?.record | 0) < 0)
            && resp_god === (u.ualign?.type ?? 0);
        // C: ugod_is_angry() — (u.ualign.record < 0)
        await pline(
            `"Thou ${strayed ? 'hast strayed from the path' : 'art arrogant'}, ${mortal}."`,
        );
        // C: SetVoice + verbalize("Thou must relearn thy lessons!")
        await verbalize('Thou must relearn thy lessons!');
        // C: adjattrib(A_WIS, -1, FALSE) → You_feel("foolish!") → more()
        await adjattrib(A_WIS, -1, false);
        losexp_divine();
        break;
    }
    case 6:
        if (!Punished()) {
            await gods_angry(resp_god);
            await punish(null);
            break;
        }
        // FALLTHROUGH — already punished → curse path
    case 4:
    case 5:
        await gods_angry(resp_god);
        if (!Blind() && !Antimagic()) {
            await pline(`${An(hcolor('black'))} glow surrounds you.`);
        }
        // C: if (rn2(2) || !attrcurse()) rndcurse();
        if (rn2(2) || !(await attrcurse())) {
            await rndcurse();
        }
        break;
    case 7:
    case 8: {
        await godvoice(resp_god, null);
        // SetVoice deferred
        const scorn = on_altar()
            && a_align(u.ux | 0, u.uy | 0) !== resp_god;
        await verbalize(`Thou durst ${scorn ? 'scorn' : 'call upon'} me?`);
        await pline(`"Then die, ${mortal}!"`);
        await summon_minion(resp_god, false);
        break;
    }
    default:
        await gods_angry(resp_god);
        await god_zaps_you(resp_god);
        break;
    }

    const new_ublesscnt = rnz(300);
    if (new_ublesscnt > (u.ublesscnt | 0)) u.ublesscnt = new_ublesscnt;
}

/** C ref: pray.c gods_upset */
async function gods_upset(g_align) {
    const u = game.u || (game.u = {});
    if (g_align === (u.ualign?.type ?? 0)) u.ugangr = (u.ugangr | 0) + 1;
    else if (u.ugangr) u.ugangr = (u.ugangr | 0) - 1;
    await angrygods(g_align);
}

/**
 * C ref: pray.c pleased — successful prayer favor.
 * Branch envelope: You_feel align msg; off-altar/low-record adjalign;
 * action rn1 + STRIDENT clamp; fix_worst_trouble switch (HIT D-0920);
 * ublesscnt rnz(350) (+udemigod kick).
 * Named omissions: pleased pat_on_head gift switch;
 * moves>100000 ublesscnt incr; on_altar wrong-god early return polish.
 */
async function pleased(g_align) {
    const u = game.u || (game.u = {});
    let trouble = in_trouble();
    let pat_on_head = 0;

    const record = u.ualign?.record | 0;
    const feel = record >= DEVOUT
        ? (Hallucination() ? 'pleased as punch' : 'well-pleased')
        : record >= STRIDENT
            ? (Hallucination() ? 'ticklish' : 'pleased')
            : (Hallucination() ? 'full' : 'satisfied');
    await You_feel(`that ${align_gname(game.urole, g_align)} is ${feel}.`);

    // C: on_altar && p_aligntyp != ualign → adjalign(-1); return
    if (on_altar() && (pray_state().p_aligntyp | 0) !== (u.ualign?.type ?? 0)) {
        adjalign(-1);
        return;
    } else if (record < 2 && trouble <= 0) {
        adjalign(1);
    }

    if (!trouble && record >= DEVOUT) {
        if ((pray_state().p_trouble | 0) === 0) pat_on_head = 1;
    } else {
        // C: prayer_luck = max(Luck, -1); action = rn1(luck + altar?3+shrine:2, 1)
        const prayer_luck = Math.max(Luck(), -1);
        let action = rn1(
            prayer_luck + (on_altar() ? 3 + (on_shrine() ? 1 : 0) : 2),
            1,
        );
        if (!on_altar()) action = Math.min(action, 3);
        if (record < STRIDENT) {
            // use post-adjalign record
            const rec = u.ualign?.record | 0;
            action = (rec > 0 || !rnl(2)) ? 1 : 0;
        }

        // C: switch (min(action, 5)) — fix_worst_trouble / in_trouble loops
        let tryct = 0;
        switch (Math.min(action, 5)) {
        case 5:
            pat_on_head = 1;
            // FALLTHROUGH
        case 4:
            do {
                await fix_worst_trouble(trouble);
            } while ((trouble = in_trouble()) !== 0);
            break;
        case 3:
            await fix_worst_trouble(trouble);
            // FALLTHROUGH
        case 2:
            while ((trouble = in_trouble()) > 0 && (++tryct < 10)) {
                await fix_worst_trouble(trouble);
            }
            break;
        case 1:
            if (trouble > 0) await fix_worst_trouble(trouble);
            break;
        case 0:
            break;
        }
    }

    // pat_on_head gift switch deferred
    void pat_on_head;
    u.ublesscnt = rnz(350);
    let kick_on_butt = u.uevent?.udemigod ? 1 : 0;
    if (u.uevent?.uhand_of_elbereth) kick_on_butt++;
    if (kick_on_butt) u.ublesscnt += kick_on_butt * rnz(1000);
}

/**
 * C ref: pray.c prayer_done — afternmv after nomul(-3).
 * Ported: p_type 0 (too soon) full path; p_type 3 → pleased envelope;
 * other p_types partial/stub.
 */
export async function prayer_done() {
    const u = game.u || (game.u = {});
    const gp = pray_state();
    const alignment = gp.p_aligntyp;
    u.uinvulnerable = false;

    if (gp.p_type === -2 || gp.p_type === -1) {
        // Moloch / undead paths deferred
        return 1;
    }
    if (Inhell()) {
        await pline(
            `Since you are in Gehennom, ${align_gname(game.urole, alignment)} can't help you.`,
        );
        // angrygods gate deferred
        return 0;
    }

    if (gp.p_type === 0) {
        if (on_altar() && (u.ualign?.type ?? 0) !== alignment) {
            water_prayer(false);
        }
        u.ublesscnt = (u.ublesscnt | 0) + rnz(250);
        change_luck(-3);
        await gods_upset(u.ualign?.type ?? 0);
    } else if (gp.p_type === 1) {
        if (on_altar() && (u.ualign?.type ?? 0) !== alignment) {
            water_prayer(false);
        }
        await angrygods(u.ualign?.type ?? 0);
    } else if (gp.p_type === 2) {
        if (water_prayer(false)) {
            u.ublesscnt = (u.ublesscnt | 0) + rnz(250);
            change_luck(-3);
            await gods_upset(u.ualign?.type ?? 0);
        } else {
            await pleased(alignment);
        }
    } else {
        // p_type 3 coaligned — pray_revive deferred
        if (on_altar()) water_prayer(true);
        await pleased(alignment);
    }
    return 1;
}

/**
 * C ref: pray.c dopray — #pray
 * ParanoidPray (default) → paranoid_query(ParanoidConfirm, …);
 * Confirm bit → getlin "yes"; else yn (D-1000).
 * wizard Force-the-gods (D-0517) → may raise p_type to 3 + clear
 * ublesscnt so uinvulnerable gates gethungry during nomul(-3).
 */
export async function dopray() {
    const u = game.u || (game.u = {});
    // C: flags.paranoia_bits defaults include PARANOID_PRAY
    const bits = game.flags?.paranoia_bits;
    const paranoidPray = bits == null
        ? true
        : (bits & PARANOID_PRAY) !== 0;
    if (paranoidPray) {
        // C: paranoid_query(ParanoidConfirm, "Are you sure…")
        const ParanoidConfirm = bits == null
            ? false
            : (bits & PARANOID_CONFIRM) !== 0;
        const ok = await paranoid_query(
            ParanoidConfirm,
            'Are you sure you want to pray?',
        );
        if (!ok) return ECMD_OK;
    }

    if (!u.uconduct) u.uconduct = {};
    // C: if (!u.uconduct.gnostic++) livelog_printf(...)
    if (!(u.uconduct.gnostic | 0)) {
        u.uconduct.gnostic = 1;
        livelog_printf(LL_CONDUCT, 'rejected atheism with a prayer');
    } else {
        u.uconduct.gnostic = (u.uconduct.gnostic | 0) + 1;
    }

    if (!(await can_pray(true))) return ECMD_OK;

    const gp = pray_state();
    // C: if (wizard && gp.p_type >= 0) Force the gods to be pleased?
    const wizard = !!(game.flags?.debug || game.flags?.wizard);
    if (wizard && (gp.p_type | 0) >= 0) {
        // C: YN() when ParanoidPray (no do-again); else y_n() — both yn/'n'
        const forceOk = (await yn_function(
            'Force the gods to be pleased?', 'yn', 'n',
        )) === 'y';
        if (forceOk) {
            u.ublesscnt = 0;
            if ((u.uluck | 0) < 0) u.uluck = 0;
            if (!u.ualign) u.ualign = { type: 0, record: 0 };
            if ((u.ualign.record | 0) <= 0) u.ualign.record = 1;
            u.ugangr = 0;
            if ((gp.p_type | 0) < 2) gp.p_type = 3;
        }
    }

    nomul(-3);
    game.multi_reason = 'praying';
    game.nomovemsg = 'You finish your prayer.';
    game.afternmv = prayer_done;

    if (gp.p_type === 3 && !Inhell()) {
        if (!Blind()) {
            await pline('You are surrounded by a shimmering light.');
        }
        u.uinvulnerable = true;
    }

    return ECMD_TIME;
}

/**
 * C ref: pray.c dosacrifice (#offer).
 * Branch envelope: not-on-altar / impaired early returns (ECMD_OK, 0 RNG).
 * floorfood sacrifice / amulet / corpse / nothing_happens deferred.
 */
export async function dosacrifice() {
    const u = game.u || {};
    if (!on_altar() || u.uswallow) {
        const prep = (u.Levitation || u.Flying) ? 'over' : 'on';
        await pline(`You are not ${prep} an altar.`);
        return ECMD_OK;
    }
    if (u.Confusion || u.Stunned) {
        await pline('You are too impaired to perform the rite.');
        return ECMD_OK;
    }
    // floorfood("sacrifice", 1) + offering body deferred (C-JS-MAP)
    return ECMD_OK;
}

function Role_if(pm) {
    return (game.urole?.mnum | 0) === (pm | 0);
}

/** C: pray.c halu_gname — non-Hallu → align_gname; Hallu RNG deferred. */
function halu_gname(alignment) {
    if (Hallucination()) {
        // randrole + rn2_on_display_rng pantheon pick deferred
        return align_gname(game.urole, alignment);
    }
    return align_gname(game.urole, alignment);
}

/** Squared distance hero→mon (monmove.c mdistu). */
function mdistu(mtmp) {
    const u = game.u || {};
    const dx = (mtmp.mx | 0) - (u.ux | 0);
    const dy = (mtmp.my | 0) - (u.uy | 0);
    return dx * dx + dy * dy;
}

/**
 * C ref: zap.c resist — oclass '\0' → alev = ulevel (doturn uses this).
 * Named omission: TELL/NOTELL shield pline polish (RNG-identical).
 */
function resist(mtmp, _oclass, _damage, _tell) {
    const alev = game.u?.ulevel | 0;
    let dlev = mtmp.m_lev | 0;
    if (dlev > 50) dlev = 50;
    else if (dlev < 1) dlev = 1;
    const mr = mtmp.data?.mr | 0;
    return rn2(100 + alev - dlev) < mr;
}

function Confusion() {
    const u = game.u || {};
    return !!(u.Confusion || (u.HConfusion | 0));
}

/**
 * C ref: pray.c maybe_turn_mon_iter — #turn undead/demon victim.
 * @param {object} mtmp
 * @param {number} turn_undead_range squared bolt range
 * @param {{ cnt: number }} msgCnt shared turn_undead_msg_cnt
 */
async function maybe_turn_mon_iter(mtmp, turn_undead_range, msgCnt) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    if (!couldsee(mtmp.mx | 0, mtmp.my | 0)
        || mdistu(mtmp) > turn_undead_range) {
        return;
    }
    const u = game.u || {};
    const data = mtmp.data;
    if (mtmp.mpeaceful
        || !(mon_is_undead(data) || is_vampshifter(mtmp)
            || (mon_is_demon(data)
                && ((u.ulevel | 0) > Math.trunc(MAXULEV / 2))))) {
        return;
    }
    mtmp.msleeping = 0;
    if (Confusion()) {
        if (!(msgCnt.cnt++)) {
            await pline('Unfortunately, your voice falters.');
        }
        mtmp.mflee = 0;
        mtmp.mfrozen = 0;
        mtmp.mcanmove = 1;
        return;
    }
    if (resist(mtmp, '\0', 0, TELL)) return;

    let xlev = 6;
    const mlet = data?.mlet;
    // C: intentional fall-through ladder lich→zombie
    switch (mlet) {
    case 'S_LICH':
        xlev += 2;
        // falls through
    case 'S_GHOST':
        xlev += 2;
        // falls through
    case 'S_VAMPIRE':
        xlev += 2;
        // falls through
    case 'S_WRAITH':
        xlev += 2;
        // falls through
    case 'S_MUMMY':
        xlev += 2;
        // falls through
    case 'S_ZOMBIE':
        if ((u.ulevel | 0) >= xlev && !resist(mtmp, '\0', 0, NOTELL)) {
            if ((u.ualign?.type ?? 0) === A_CHAOTIC) {
                mtmp.mpeaceful = 1;
                set_malign(mtmp);
            } else {
                await killed(mtmp);
            }
            return;
        }
        // else flee — fall through
        // falls through
    default:
        await monflee(mtmp, 0, false, true);
        break;
    }
}

/**
 * C ref: pray.c doturn — #turn undead (Knight / Cleric).
 * Named omissions: known_spell(SPE_TURN_UNDEAD)/spelleffects for other
 * roles; Hallu halu_gname pantheon RNG; resist TELL pline.
 */
export async function doturn() {
    const u = game.u || (game.u = {});

    if (!Role_if(PM_CLERIC) && !Role_if(PM_KNIGHT)) {
        // known_spell / spelleffects deferred
        await pline("You don't know how to turn undead!");
        return ECMD_OK;
    }
    if (!(u.uconduct)) u.uconduct = {};
    if (!(u.uconduct.gnostic++)) {
        livelog_printf(LL_CONDUCT, 'rejected atheism by turning undead');
    }

    const Gname = halu_gname(u.ualign?.type ?? 0);

    if (!can_chant()) {
        const how = u.Strangled ? 'not able to call' : 'incapable of calling';
        await pline(`You are ${how} upon ${Gname} to turn aside evilness.`);
        return (u.uconduct.gnostic | 0) === 1 ? ECMD_TIME : ECMD_OK;
    }

    const youData = game.youmonst?.data;
    if (((u.ualign?.type ?? 0) !== A_CHAOTIC
            && (mon_is_demon(youData) || mon_is_undead(youData)
                || is_vampshifter(game.youmonst)))
        || (u.ugangr | 0) > 6) {
        await pline(`For some reason, ${Gname} seems to ignore you.`);
        aggravate();
        exercise(A_WIS, false);
        return ECMD_TIME;
    }
    if (Inhell()) {
        const wont = Gname === MOLOCH ? "won't" : "can't";
        await pline(`Since you are in Gehennom, ${Gname} ${wont} help you.`);
        aggravate();
        return ECMD_TIME;
    }

    await pline(`Calling upon ${Gname}, you chant an arcane formula.`);
    exercise(A_WIS, true);

    let turn_undead_range = BOLT_LIM + Math.trunc((u.ulevel | 0) / 5);
    turn_undead_range *= turn_undead_range;
    const msgCnt = { cnt: 0 };
    for (const mtmp of game.fmon || []) {
        await maybe_turn_mon_iter(mtmp, turn_undead_range, msgCnt);
    }

    nomul(-(5 - Math.trunc(((u.ulevel | 0) - 1) / 6)));
    game.multi_reason = 'trying to turn the monsters';
    game.nomovemsg = 'You can move again.';
    return ECMD_TIME;
}
