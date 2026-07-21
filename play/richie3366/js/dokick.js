// dokick.js — #kick command + object fall-through (impact_drop).
// C ref: dokick.c — dokick, kick_dumb, kick_door, kick_nondoor, maybe_kick_monster,
// kick_monster, kickdmg (partial); down_gate / drop_to / impact_drop (D-0961).
// Object/secret-door/furniture kicks named in C-JS-MAP.md.

import { game } from './gstate.js';
import { rn2, rnd, rnl } from './rng.js';
import {
    acurr, acurrstr, A_DEX, A_STR, A_CON, exercise, Fumbling,
} from './attrib.js';
import {
    pline, newsym, canspotmon, map_invisible, flush_topl_more, verbalize,
} from './display.js';
import { vision_recalc, recalc_block_point, couldsee, cansee } from './vision.js';
import { getdir } from './lock.js';
import { near_capacity, inv_weight, weight_cap } from './invent.js';
import { objects_at, obj_extract_self, add_to_migration } from './mkobj.js';
import {
    mon_at, attack_checks, passive, killed, check_caitiff,
} from './uhitm.js';
import { AT_KICK } from './mhitm.js';
import {
    overexertion, losehp, maybe_half_phys, in_rooms, in_town,
} from './hack.js';
import { set_wounded_legs, legs_in_no_shape, b_trapped, t_at } from './trap.js';
import { setmangry, seemimic } from './mon.js';
import { mon_nam, Monnam } from './do_name.js';
import { martial_bonus, use_skill } from './weapon.js';
import {
    verysmall, bigmonst, thick_skinned, nohands, haseyes,
    is_flyer, is_floater, can_teleport, M1_SLITHY, is_watch,
} from './monsters.js';
import { objectNames } from './objects.js';
import { monsterNames } from './generated/monsters_data.js';
import { stairway_at } from './mklev.js';
import { ok_to_quest } from './quest.js';
import {
    COLNO, ROWNO,
    SDOOR, SCORR, STAIRS, LADDER, IRONBARS, LAVAWALL,
    D_ISOPEN, D_BROKEN, D_NODOOR, D_TRAPPED, D_WARNED, LA_DOWN, SLT_ENCUMBER,
    IS_DOOR, IS_STWALL, IS_POOL, IS_THRONE, IS_FOUNTAIN, IS_SINK, IS_GRAVE,
    IS_TREE, KILLED_BY, Upolyd, M_AP_TYPE, M_AP_MONSTER, P_NONE, P_MARTIAL_ARTS,
    RIGHT_SIDE, TIMEOUT, FOOT, SHOPBASE, SHOP_DOOR_COST,
    MIGR_NOWHERE, MIGR_RANDOM, MIGR_STAIRS_UP, MIGR_LADDER_UP, MIGR_SSTAIRS,
    MIGR_WITH_HERO, TRAPDOOR, is_hole, Is_stronghold, Is_botlevel, In_endgame,
} from './const.js';

const BOULDER = objectNames.indexOf('BOULDER');
const ROCK = objectNames.indexOf('ROCK');

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
 * C ref: mon.c get_iter_mons — first living on-map mon where bfunc is true.
 */
async function get_iter_mons(bfunc) {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || (mtmp.mhp | 0) <= 0) continue;
        if ((mtmp.mx | 0) <= 0) continue;
        if (await bfunc(mtmp)) return mtmp;
    }
    return null;
}

/**
 * C ref: mon.c get_iter_mons_xy — first living mon where bfunc(mtmp,x,y).
 */
async function get_iter_mons_xy(bfunc, x, y) {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || (mtmp.mhp | 0) <= 0) continue;
        if ((mtmp.mx | 0) <= 0) continue;
        if (await bfunc(mtmp, x, y)) return mtmp;
    }
    return null;
}

/**
 * C ref: dokick.c watchman_thief_arrest — peaceful watch who can see hero
 * yells and angry_guards. Named omit: mon_yells SetVoice/Deaf arms
 * (verbalize like dig.js watch_dig).
 */
async function watchman_thief_arrest(mtmp) {
    if (is_watch(mtmp?.data) && couldsee(mtmp.mx, mtmp.my) && mtmp.mpeaceful) {
        await verbalize("Halt, thief!  You're under arrest!");
        const { angry_guards } = await import('./mon.js');
        await angry_guards(false);
        return true;
    }
    return false;
}

/**
 * C ref: dokick.c watchman_door_damage — warn once (D_WARNED) then arrest.
 * Named omit: mon_yells SetVoice/Deaf arms.
 */
async function watchman_door_damage(mtmp, x, y) {
    if (!(is_watch(mtmp?.data) && mtmp.mpeaceful
        && couldsee(mtmp.mx, mtmp.my))) {
        return false;
    }
    const loc = game.level?.at(x, y);
    if ((loc?.looted | 0) & D_WARNED) {
        await verbalize("Halt, vandal!  You're under arrest!");
        const { angry_guards } = await import('./mon.js');
        await angry_guards(false);
    } else {
        await verbalize('Hey, stop damaging that door!');
        if (loc) loc.looted = (loc.looted | 0) | D_WARNED;
    }
    return true;
}

/**
 * C ref: dokick.c kick_door — open/broken/nodoor → kick_dumb; else
 * CLOSED/LOCKED bust attempt (exercise DEX, rnl(35) vs avrg_attrib).
 * Shop in_rooms + add_damage/pay_for_damage + town watch wired (D-0947).
 * Named omit: Blind feel_location; mon_yells SetVoice/Deaf polish;
 * giant doorbuster poly completeness.
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
        // C: shopdoor = *in_rooms(x, y, SHOPBASE)
        const shopdoor = !!in_rooms(x, y, SHOPBASE);
        if (mask & D_TRAPPED) {
            if (game.flags?.verbose !== false) {
                await pline('You kick the door.');
            }
            exercise(A_STR, false);
            loc.doormask = D_NODOOR;
            if (loc.flags !== undefined) loc.flags = loc.doormask;
            await b_trapped('door', FOOT);
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
        if (shopdoor) {
            const { add_damage, pay_for_damage } = await import('./shk.js');
            add_damage(x, y, SHOP_DOOR_COST);
            await pay_for_damage('break', false);
        }
        if (in_town(x, y)) await get_iter_mons(watchman_thief_arrest);
    } else {
        // Blind feel_location deferred
        exercise(A_STR, true);
        // C: (Deaf || !rn2(3)) ? "Thwack" : "Whammm"
        const thud = (game.u?.Deaf || !rn2(3)) ? 'Thwack' : 'Whammm';
        await pline(`${thud}!!`);
        if (in_town(x, y)) {
            await get_iter_mons_xy(watchman_door_damage, x, y);
        }
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

function on_level(a, b) {
    return !!(a && b
        && (a.dnum | 0) === (b.dnum | 0)
        && (a.dlevel | 0) === (b.dlevel | 0));
}

/**
 * C ref: dokick.c down_gate — migration dest for objects falling down.
 * Sets game.gate_str for impact_drop messages.
 */
export function down_gate(x, y) {
    const u = game.u || {};
    game.gate_str = null;
    if (on_level(u.uz, game.qstart_level) && !ok_to_quest()) {
        return MIGR_NOWHERE;
    }
    const stway = stairway_at(x, y);
    if (stway && !stway.up && !stway.isladder) {
        game.gate_str = 'down the stairs';
        return ((stway.tolev?.dnum | 0) === (u.uz?.dnum | 0))
            ? MIGR_STAIRS_UP
            : MIGR_SSTAIRS;
    }
    if (stway && !stway.up && stway.isladder) {
        game.gate_str = 'down the ladder';
        return MIGR_LADDER_UP;
    }
    const ttmp = t_at(x, y);
    if (ttmp && ttmp.tseen && is_hole(ttmp.ttyp)) {
        game.gate_str = (ttmp.ttyp === TRAPDOOR)
            ? 'through the trap door'
            : 'through the hole';
        return MIGR_RANDOM;
    }
    return MIGR_NOWHERE;
}

/**
 * C ref: dokick.c drop_to — fill coord destination for a down_gate loc.
 * cc.y === 0 means nowhere.
 */
export function drop_to(cc, loc, x, y) {
    const u = game.u || {};
    const stway = stairway_at(x, y);
    switch (loc) {
    case MIGR_RANDOM:
        if (Is_stronghold(u.uz)) {
            const v = game.valley_level;
            cc.x = v?.dnum | 0;
            cc.y = v?.dlevel | 0;
            break;
        } else if (In_endgame(u.uz) || Is_botlevel(u.uz)) {
            cc.y = 0;
            cc.x = 0;
            break;
        }
        // FALLTHROUGH — stairs/ladder/sstairs share dest fill
    case MIGR_STAIRS_UP:
    case MIGR_LADDER_UP:
    case MIGR_SSTAIRS:
        if (stway?.tolev) {
            cc.x = stway.tolev.dnum | 0;
            cc.y = stway.tolev.dlevel | 0;
        } else {
            cc.x = u.uz?.dnum | 0;
            cc.y = (u.uz?.dlevel | 0) + 1;
        }
        break;
    default:
    case MIGR_NOWHERE:
        cc.y = 0;
        cc.x = 0;
        break;
    }
}

/**
 * C ref: dokick.c impact_drop — player/missile impact drops floor objs down.
 * Branch envelope: down_gate/drop_to; boulder/rock rn2 skip; extract +
 * add_to_migration; visible fall messages via gate_str.
 * Named omit: stolen_value / picked_container shop bill; hot_pursuit /
 * angry_guards thief messages when debit/robbed change.
 * @param {object|null} missile  caused impact; won't drop itself
 * @param {number} x
 * @param {number} y
 * @param {number} dlev  if !0 send objs with MIGR_WITH_HERO to dlev
 */
export async function impact_drop(missile, x, y, dlev) {
    if (!objects_at(x, y)) return;

    let toloc = down_gate(x, y);
    const cc = { x: 0, y: 0 };
    drop_to(cc, toloc, x, y);
    if (!cc.y) return;

    if (dlev) {
        toloc = MIGR_WITH_HERO;
        cc.y = dlev | 0;
    }

    // costly_spot / stolen_value shop billing deferred (named omit)
    const isrock = !!(missile && (missile.otyp | 0) === ROCK);
    let oct = 0;
    let dct = 0;
    const u = game.u || {};
    const uball = u.uball;
    const uchain = u.uchain;

    for (let obj = objects_at(x, y); obj; ) {
        const obj2 = obj.nexthere;
        if (obj === missile) {
            obj = obj2;
            continue;
        }
        oct += obj.quan | 0;
        if (obj === uball || obj === uchain) {
            obj = obj2;
            continue;
        }
        // boulders can fall too, but rarely & never due to rocks
        if ((isrock && (obj.otyp | 0) === BOULDER)
            || rn2((obj.otyp | 0) === BOULDER ? 30 : 3)) {
            obj = obj2;
            continue;
        }
        obj_extract_self(obj);
        // stolen_value / picked_container / no_charge shop arms deferred
        add_to_migration(obj);
        obj.ox = cc.x | 0;
        obj.oy = cc.y | 0;
        obj.owornmask = toloc | 0;
        dct += obj.quan | 0;
        obj = obj2;
    }

    if (dct && cansee(x, y)) {
        const what = dct === 1 ? 'object falls' : 'objects fall';
        const gate = game.gate_str || 'down';
        if (missile) {
            await pline(
                `From the impact, ${
                    dct === oct ? 'the ' : dct === 1 ? 'an' : ''
                }other ${what}.`,
            );
        } else if (oct === dct) {
            await pline(
                `${dct === 1 ? 'The' : 'All the'} adjacent ${what} ${gate}.`,
            );
        } else {
            await pline(
                `${dct === 1 ? 'One of the' : 'Some of the'} adjacent ${
                    dct === 1 ? 'objects falls' : what
                } ${gate}.`,
            );
        }
    }
}

