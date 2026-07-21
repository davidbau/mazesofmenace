// dokick.js — #kick command.
// C ref: dokick.c — dokick, kick_dumb, kick_door, kick_nondoor, maybe_kick_monster,
// kick_monster, kickdmg (partial). Object/secret-door/furniture kicks named
// in C-JS-MAP.md.

import { game } from './gstate.js';
import { rn2, rnd, rnl } from './rng.js';
import {
    acurr, acurrstr, A_DEX, A_STR, A_CON, exercise, Fumbling,
} from './attrib.js';
import { pline, newsym, canspotmon, map_invisible, flush_topl_more } from './display.js';
import { vision_recalc, recalc_block_point } from './vision.js';
import { getdir } from './lock.js';
import { near_capacity, inv_weight, weight_cap } from './invent.js';
import { objects_at } from './mkobj.js';
import {
    mon_at, attack_checks, passive, killed, check_caitiff,
} from './uhitm.js';
import { AT_KICK } from './mhitm.js';
import { overexertion, losehp, maybe_half_phys } from './hack.js';
import { set_wounded_legs, legs_in_no_shape } from './trap.js';
import { setmangry, seemimic } from './mon.js';
import { mon_nam, Monnam } from './do_name.js';
import { martial_bonus, use_skill } from './weapon.js';
import {
    verysmall, bigmonst, thick_skinned, nohands, haseyes,
    is_flyer, is_floater, can_teleport, M1_SLITHY,
} from './monsters.js';
import { objectNames } from './objects.js';
import { monsterNames } from './generated/monsters_data.js';
import {
    COLNO, ROWNO,
    SDOOR, SCORR, STAIRS, LADDER, IRONBARS, LAVAWALL,
    D_ISOPEN, D_BROKEN, D_NODOOR, D_TRAPPED, LA_DOWN, SLT_ENCUMBER,
    IS_DOOR, IS_STWALL, IS_POOL, IS_THRONE, IS_FOUNTAIN, IS_SINK, IS_GRAVE,
    IS_TREE, KILLED_BY, Upolyd, M_AP_TYPE, M_AP_MONSTER, P_NONE, P_MARTIAL_ARTS,
    RIGHT_SIDE, TIMEOUT,
} from './const.js';

const PM_SASQUATCH = monsterNames.indexOf('PM_SASQUATCH');
const PM_SHADE = monsterNames.indexOf('PM_SHADE');
const KICKING_BOOTS = objectNames.indexOf('KICKING_BOOTS');
const kick_passes_thru = 'kick passes harmlessly through';

function isok(x, y) {
    return x >= 1 && x < COLNO && y >= 0 && y < ROWNO;
}

/**
 * C ref: dokick.c martial() macro — martial_bonus / Sasquatch / kicking boots.
 */
function martial() {
    const ym = game.youmonst?.data;
    const uarmf = game.u?.uarmf;
    return martial_bonus()
        || (ym && (ym.mndx ?? -1) === PM_SASQUATCH)
        || !!(uarmf && (uarmf.otyp | 0) === KICKING_BOOTS);
}

/**
 * C ref: dokick.c kick_dumb — empty space / open doorway.
 * RNG: exercise(A_DEX, FALSE) always; low-DEX strain path adds rn2(3),
 * exercise(A_STR, FALSE), and set_wounded_legs(RIGHT_SIDE, 5+rnd(5)).
 */
async function kick_dumb(x, y) {
    exercise(A_DEX, false);
    if (martial() || acurr(A_DEX) >= 16 || rn2(3)) {
        await pline('You kick at empty space.');
        // Blind feel_location deferred
    } else {
        await pline('Dumb move!  You strain a muscle.');
        exercise(A_STR, false);
        // C: set_wounded_legs(RIGHT_SIDE, 5 + rnd(5)) — ATEMP(DEX)-- (D-0785)
        await set_wounded_legs(RIGHT_SIDE, 5 + rnd(5));
    }
    // Airlevel / Levitation hurtle deferred
    void x;
    void y;
}

/**
 * C ref: dokick.c kick_ouch — solid terrain / failed impact (partial).
 * Blind feel_location / wake_nearto / drawbridge / airlevel hurtle deferred.
 * losehp applies the damage roll (regen_hp needs uhp < uhpmax).
 * set_wounded_legs on !rn2(3) → ATEMP(DEX)-- (D-0785).
 */
async function kick_ouch(x, y, kickobjnam = '') {
    await pline('Ouch!  That hurts!');
    exercise(A_DEX, false);
    exercise(A_STR, false);
    // Blind feel_location / wake_nearto / drawbridge deferred
    if (!rn2(3)) {
        // C: set_wounded_legs(RIGHT_SIDE, 5 + rnd(5))
        await set_wounded_legs(RIGHT_SIDE, 5 + rnd(5));
    }
    // C: dmg = rnd(ACURR(A_CON) > 15 ? 3 : 5);
    //     losehp(Maybe_Half_Phys(dmg), kickstr(...), KILLED_BY);
    const dmg = rnd(acurr(A_CON) > 15 ? 3 : 5);
    const what = kickobjnam || 'a wall';
    losehp(maybe_half_phys(dmg), what, KILLED_BY);
    // Is_airlevel / Levitation hurtle deferred
    void x;
    void y;
}

/**
 * C ref: dokick.c kick_door — open/broken/nodoor → kick_dumb; else
 * CLOSED/LOCKED bust attempt (exercise DEX, rnl(35) vs avrg_attrib).
 * Shop damage / town watchman / b_trapped body / Blind feel_location
 * deferred (named in C-JS-MAP).
 */
async function kick_door(x, y, avrg_attrib) {
    const loc = game.level?.at(x, y);
    if (!loc) {
        await kick_dumb(x, y);
        return;
    }
    const mask = loc.doormask ?? D_NODOOR;
    if (mask === D_ISOPEN || mask === D_BROKEN || mask === D_NODOOR) {
        await kick_dumb(x, y);
        return;
    }

    // C: not enough leverage while levitating
    if (game.u?.Levitation) {
        await kick_ouch(x, y);
        return;
    }

    exercise(A_DEX, true);
    // C: doorbuster = Upolyd && is_giant(youmonst.data) — giant poly deferred
    const doorbuster = Upolyd(game.u) && !!game.youmonst?.data?.is_giant;
    // C: rnl(35) < avrg_attrib + (!martial() ? 0 : ACURR(A_DEX))
    const chance = avrg_attrib + (!martial() ? 0 : acurr(A_DEX));
    if (doorbuster || rnl(35) < chance) {
        // shopdoor / in_rooms(SHOPBASE) deferred → treat as non-shop
        const shopdoor = false;
        if (mask & D_TRAPPED) {
            if (game.flags?.verbose !== false) {
                await pline('You kick the door.');
            }
            exercise(A_STR, false);
            loc.doormask = D_NODOOR;
            if (loc.flags !== undefined) loc.flags = loc.doormask;
            // b_trapped("door", FOOT) deferred
            newsym(x, y);
            recalc_block_point(x, y);
            vision_recalc(1);
        } else if (acurr(A_STR) > 18 && !rn2(5) && !shopdoor) {
            await pline('As you kick the door, it shatters to pieces!');
            exercise(A_STR, true);
            loc.doormask = D_NODOOR;
            if (loc.flags !== undefined) loc.flags = loc.doormask;
            newsym(x, y);
            recalc_block_point(x, y);
            vision_recalc(1);
        } else {
            await pline('As you kick the door, it crashes open!');
            exercise(A_STR, true);
            loc.doormask = D_BROKEN;
            if (loc.flags !== undefined) loc.flags = loc.doormask;
            newsym(x, y);
            recalc_block_point(x, y);
            vision_recalc(1);
        }
        // add_damage / pay_for_damage / watchman_thief_arrest deferred
    } else {
        // Blind feel_location deferred
        exercise(A_STR, true);
        // C: (Deaf || !rn2(3)) ? "Thwack" : "Whammm"
        const thud = (game.u?.Deaf || !rn2(3)) ? 'Thwack' : 'Whammm';
        await pline(`${thud}!!`);
        // in_town watchman_door_damage deferred
    }
}

/**
 * C ref: dokick.c kick_nondoor — empty-floor envelope.
 * SDOOR/SCORR open rolls, throne/fountain/grave/tree/sink specials deferred.
 */
async function kick_nondoor(x, y, avrg_attrib) {
    const loc = game.level?.at(x, y);
    if (!loc) {
        await kick_dumb(x, y);
        return true;
    }
    const typ = loc.typ;

    if (typ === SDOOR || typ === SCORR) {
        // Secret door/passage open attempt deferred → failed kick hurts
        await kick_ouch(x, y);
        return true;
    }
    if (IS_THRONE(typ) || IS_FOUNTAIN(typ) || IS_GRAVE(typ) || IS_TREE(typ)
        || IS_SINK(typ) || typ === IRONBARS) {
        // Furniture / bars specials deferred
        await kick_ouch(x, y);
        return true;
    }
    if (typ === STAIRS || typ === LADDER || IS_STWALL(typ)) {
        // Down ladder/stairs → empty-space kick; solid wall → ouch
        if (!IS_STWALL(typ) && loc.ladder === LA_DOWN) {
            await kick_dumb(x, y);
            return true;
        }
        await kick_ouch(x, y);
        return true;
    }
    void avrg_attrib;
    await kick_dumb(x, y);
    return true;
}

/**
 * C ref: dokick.c maybe_kick_monster — forcefight for hostile/unseen,
 * then attack_checks || overexertion may abort.
 */
async function maybe_kick_monster(mon, x, y) {
    if (!mon) return false;
    const ctx = game.context || (game.context = {});
    const save_forcefight = !!ctx.forcefight;
    if (!game.bhitpos) game.bhitpos = { x: 0, y: 0 };
    game.bhitpos.x = x;
    game.bhitpos.y = y;
    if (!mon.mpeaceful || !canspotmon(mon)) {
        ctx.forcefight = true; /* attack even if invisible */
    }
    let keep = mon;
    if ((await attack_checks(mon)) || overexertion()) {
        keep = null; /* don't kick after all */
    }
    ctx.forcefight = save_forcefight;
    return keep != null;
}

/**
 * C ref: dokick.c kickdmg — non-poly kick damage + passive.
 * special_dmgval / abuse_dog / monflee / hurtle deferred.
 */
async function kickdmg(mon, clumsy) {
    let dmg = Math.trunc((acurrstr() + acurr(A_DEX) + acurr(A_CON)) / 15);
    let kick_skill = P_NONE;
    const u = game.u || {};
    const uarmf = u.uarmf;

    if (uarmf && (uarmf.otyp | 0) === KICKING_BOOTS) dmg += 5;
    if (clumsy) dmg = Math.trunc(dmg / 2);
    if (thick_skinned(mon.data)) dmg = 0;
    if ((mon.data?.mndx ?? -1) === PM_SHADE) dmg = 0;

    // special_dmgval deferred (0 when no blessed/silver boots wired)
    const specialdmg = 0;
    if ((mon.data?.mndx ?? -1) === PM_SHADE && !specialdmg) {
        await pline(`The ${kick_passes_thru}.`);
        return;
    }

    if (M_AP_TYPE(mon)) seemimic(mon);
    // C: check_caitiff(mon) before tame abuse
    check_caitiff(mon);

    if (mon.mtame) {
        // abuse_dog / monflee deferred — still need damage path RNG
    }

    if (dmg > 0) {
        dmg = rnd(dmg);
        if (martial()) {
            if (dmg > 1) kick_skill = P_MARTIAL_ARTS;
            dmg += rn2(Math.trunc(acurr(A_DEX) / 2) + 1);
        }
        exercise(A_DEX, true);
    }
    dmg += specialdmg;
    if (uarmf) dmg += uarmf.spe | 0;
    dmg += u.udaminc | 0;
    if (dmg > 0) mon.mhp = (mon.mhp | 0) - dmg;

    // martial knockback / goodpos / mintrap deferred (needs !rn2(3) when martial)

    await passive(mon, uarmf, true, (mon.mhp | 0) > 0, AT_KICK, false);
    if ((mon.mhp | 0) <= 0) await killed(mon);
    if (kick_skill !== P_NONE) use_skill(kick_skill, 1);
}

/**
 * C ref: dokick.c kick_monster — anger, encumbrance clumsiness, evade, kickdmg.
 * Poly AT_KICK loop / maybe_mnexto evade body / Levitation wild-miss named
 * omissions when those arms fire.
 */
async function kick_monster(mon, x, y) {
    let clumsy = false;
    let goto_doit = false;

    setmangry(mon, true);

    const u = game.u || {};
    if (u.Levitation && !rn2(3) && verysmall(mon.data)
        && !is_flyer(mon.data)) {
        await pline('Floating in the air, you miss wildly!');
        exercise(A_DEX, false);
        await passive(mon, u.uarmf, false, 1, AT_KICK, false);
        return;
    }

    if (mon.mundetected
        || (M_AP_TYPE(mon) && M_AP_TYPE(mon) !== M_AP_MONSTER)) {
        if (M_AP_TYPE(mon)) seemimic(mon);
        mon.mundetected = 0;
        if (!canspotmon(mon)) map_invisible(x, y);
        else newsym(x, y);
        const who = canspotmon(mon) ? mon_nam(mon) : 'something hidden';
        await pline(`There is ${who} here.`);
    }

    // Upolyd AT_KICK attacktype loop deferred — fall through to normal kick

    const i = -inv_weight();
    const j = weight_cap();

    if (i < Math.trunc((j * 3) / 10)) {
        if (!rn2((i < Math.trunc(j / 10)) ? 2 : (i < Math.trunc(j / 5)) ? 3 : 4)) {
            if (martial()) {
                goto_doit = true; /* C: goto doit — skip Fumbling/bulky */
            } else {
                await pline('Your clumsy kick does no damage.');
                await passive(mon, u.uarmf, false, 1, AT_KICK, false);
                return;
            }
        } else if (i < Math.trunc(j / 10)) {
            clumsy = true;
        } else if (!rn2((i < Math.trunc(j / 5)) ? 2 : 3)) {
            clumsy = true;
        }
    }

    if (!goto_doit) {
        if (Fumbling()) {
            clumsy = true;
        } else if (u.uarm) {
            const od = game.objects?.[u.uarm.otyp];
            if (od?.oc_big && acurr(A_DEX) < rnd(25)) clumsy = true;
        }
    }

    // doit:
    await pline(`You kick ${mon_nam(mon)}.`);
    const ptr = mon.data;
    if (!rn2(clumsy ? 3 : 4) && (clumsy || !bigmonst(ptr))
        && mon.mcansee && !mon.mtrapped && !thick_skinned(ptr)
        && ptr?.mlet !== 'S_EEL' && haseyes(ptr) && mon.mcanmove
        && !mon.mstun && !mon.mconf && !mon.msleeping
        && (ptr?.mmove | 0) >= 12) {
        if (!nohands(ptr) && !rn2(martial() ? 5 : 3)) {
            await pline(`${Monnam(mon)} blocks your ${clumsy ? 'clumsy ' : ''}kick.`);
            await passive(mon, u.uarmf, false, 1, AT_KICK, false);
            return;
        }
        // maybe_mnexto evade body deferred — mon stays put → fall through
        void is_floater;
        void can_teleport;
        void M1_SLITHY;
    }
    await kickdmg(mon, clumsy);
}

/**
 * C ref: dokick.c dokick — #kick (Ctrl-D).
 * Returns true if the action consumes a turn (ECMD_TIME).
 */
export async function dokick() {
    const u = game.u || (game.u = {});
    let no_kick = false;

    // C order: poly/steed deferred; Wounded_legs before encumbrance/utrap.
    // lizard / uinwater / boulder no_kick arms still deferred.
    const wounded = !!(u.Wounded_legs
        || ((u.HWounded_legs | 0) & TIMEOUT)
        || (u.EWounded_legs | 0));
    if (wounded) {
        // C: legs_in_no_shape("kicking", FALSE) then no_kick (D-0786)
        await legs_in_no_shape('kicking', false);
        no_kick = true;
    } else if ((u.utrap | 0) !== 0) {
        no_kick = true;
        await pline("There's not enough room to kick down here.");
    } else if (near_capacity() > SLT_ENCUMBER) {
        await pline('Your load is too heavy to balance yourself for a kick.');
        no_kick = true;
    }

    if (no_kick) {
        // C: display_nhwindow(WIN_MESSAGE, TRUE) — --More-- owns next keys
        await flush_topl_more();
        return false;
    }

    if (!(await getdir(null))) return false;
    if (!u.dx && !u.dy) return false;

    const x = (u.ux || 0) + (u.dx || 0);
    const y = (u.uy || 0) + (u.dy || 0);
    // C ref: dokick.c — gk.kickedloc set before kick resolution; pets avoid it
    game.kickedloc = { x, y };

    const avrg_attrib = Math.trunc(
        (acurr(A_STR) + acurr(A_DEX) + acurr(A_CON)) / 3,
    );

    // Swallow / pit / levitation brace paths deferred

    const mtmp = isok(x, y) ? mon_at(x, y) : null;
    if (mtmp) {
        if (!(await maybe_kick_monster(mtmp, x, y))) {
            // C: return context.move ? ECMD_TIME : ECMD_OK
            return !!(game.context?.move ?? true);
        }
    }

    // wake_nearby(FALSE) / u_wipe_engr(2) — no RNG when no engraving;
    // wake/engraving side effects deferred

    if (!isok(x, y)) {
        await kick_ouch(x, y);
        return true;
    }

    const loc = game.level?.at(x, y);
    if (!loc) {
        await kick_dumb(x, y);
        return true;
    }

    /*
     * C order after maybe_kick: monsters, pools, objects, non-doors, doors.
     * Monster kick runs here when mtmp survived maybe_kick_monster.
     */
    if (mtmp) {
        await kick_monster(mtmp, x, y);
        // glyph / map_invisible / airlevel recoil deferred
        return true;
    }

    if ((IS_POOL(loc.typ) || loc.typ === LAVAWALL) !== !!(u.uinwater)) {
        await pline(`You splash some ${IS_POOL(loc.typ) ? 'water' : 'lava'} around.`);
        return true;
    }

    // OBJ_AT — kick_object body deferred
    if (objects_at(x, y)) {
        await kick_ouch(x, y);
        return true;
    }

    if (IS_DOOR(loc.typ)) {
        await kick_door(x, y, avrg_attrib);
        return true;
    }
    await kick_nondoor(x, y, avrg_attrib);
    return true;
}
