// dokick.js — kicking, and the object-shipping machinery that lives with it.
// C ref: src/dokick.c
//
// Only down_gate() and ship_object()'s early returns so far; kicking itself
// is not ported.
//
// NOTE ON WIRING: js/do.js calls ship_object() but must NOT import this file.
// do.js does module-init-time wiring (do_wire_mklev), so any new module that
// pulls do.js back in during its initialisation hits a temporal dead zone on
// mklev_fn rather than a clean circular-import error, and the whole suite
// reads 0. js/cmd.js does the wiring instead, exactly as it already does for
// mklev and sp_lev.

import { ismnum } from './const.js';
import { shkname } from './shknam.js';
import { useup, obfree } from './invent.js';
import { change_luck } from './attrib.js';
import { obj_resists } from './zap.js';
import { Is_mbag } from './mkobj.js';
import { Is_container } from './obj.js';
import { stolen_value, make_angry_shk, inside_shop } from './shk.js';
import { find_drawbridge } from './dbridge.js';
import { angry_guards } from './mon.js';
import { Shknam } from './shknam.js';
import { You_hear } from './pline.js';
import { cansee } from './vision.js';
import { add_to_migration } from './mkobj.js';
import { Has_contents } from './obj.js';
import { obj_extract_self, currency } from './invent.js';
import { in_rooms } from './hack.js';
import { costly_spot, shop_keeper, picked_container, hot_pursuit } from './shk.js';
import { MIGR_WITH_HERO, Is_stronghold, In_endgame, Is_botlevel, ESHK, SHOPBASE } from './const.js';
import { game } from './gstate.js';
import { MIGR_NOWHERE, MIGR_RANDOM, MIGR_STAIRS_UP, MIGR_LADDER_UP,
         MIGR_SSTAIRS, TRAPDOOR, is_hole, SLT_ENCUMBER, STRAT_WAITMASK,
         ECMD_OK, ECMD_TIME, ECMD_FAIL, ECMD_CANCEL, isok, M_AP_TYPE,
         M_AP_MONSTER, Upolyd, engulfing_u } from './const.js';
import { rn2 } from './rng.js';
import { dist2 } from './hacklib.js';
import { near_capacity, acurrstr, ACURR, exercise, inv_weight,
         weight_cap, encumber_msg } from './attrib.js';
import { rnl, rnd } from './rng.js';
import { A_STR, A_DEX, A_CON, D_ISOPEN, D_BROKEN, D_NODOOR, D_TRAPPED,
         IS_DOOR, LEFT_SIDE, RIGHT_SIDE, BOTH_SIDES, LEG } from './const.js';
import { newsym } from './display.js';
import { You } from './pline.js';
import { is_pool } from './mon.js';
import { OBJ_AT } from './const.js';
import { sobj_at, weight } from './invent.js';
import { OCLASSES, ONAMES, MATERIALS } from './objects_data.js';
import { pline, canspotmon, more, map_invisible, unmap_invisible,
         glyph_is_invisible_at } from './display.js';
import { Your, There } from './pline.js';
import { m_at } from './mon.js';
import { u_wipe_engr } from './engrave.js';
import { overexertion } from './hack.js';

import { attack_checks, passive, check_caitiff } from './uhitm.js';
import { closed_door, getdir } from './cmd.js';
import { recalc_block_point, unblock_point } from './vision.js';
import { pline_The } from './pline.js';
import { is_drawbridge_wall } from './dbridge.js';
import { losehp } from './hack.js';
import { wake_nearto, setmangry, seemimic, killed, mnexto } from './mon.js';
import { Deaf } from './youprop.js';
import { hcolor, mon_nam, Monnam, a_monnam } from './do_name.js';
import { doname, makeplural } from './objnam.js';
import { poly_gender, body_part } from './polyself.js';
import { adjalign } from './attrib.js';
import { cvt_sdoor_to_door } from './detect.js';
import { stairway_at } from './display.js';
import { dunlev, dunlevs_in_dungeon } from './dungeon.js';
import { enexto } from './teleport.js';
import { makemon } from './makemon.js';
import { mkgold, mksobj_at, rnd_class } from './mkobj.js';
import { rn1 } from './rng.js';
import { sgn } from './hacklib.js';
import { PMNAMES, MFLAGS, MONSYMS, ATTKS } from './monst_data.js';
import { bigmonst, nohands, is_flyer, is_floater, thick_skinned, haseyes,
         verysmall, nolimbs, slithy, mon_hates_blessings } from './mondata.js';
import { Fumbling } from './youprop.js';
import { DEADMONSTER } from './monst.js';
import { abuse_dog, mon_hates_silver } from './dog.js';
import { monflee } from './monmove.js';
import { SDOOR, SCORR, CORR, STAIRS, LADDER, IRONBARS, LA_DOWN, ROOM,
         IS_STWALL, IS_TREE, IS_THRONE, IS_ALTAR, IS_FOUNTAIN, IS_GRAVE,
         IS_SINK, IS_OBSTRUCTED, IS_DRAWBRIDGE, D_LOCKED,
         T_LOOTED, TREE_LOOTED, TREE_SWARM, S_LPUDDING, S_LDWASHER,
         MM_ANGRY, MM_NOMSG, MM_MALE, MM_FEMALE, KILLED_BY,
         A_WIS, A_LAWFUL, ICE, ZAP_POS } from './const.js';

/* src/dokick.c:8 martial() — Samurai and Monk get the bonus, as do bigfoot
   forms and anyone wearing kicking boots. */
function martial() {
    const r = game.urole?.name?.m;
    return (r === 'Samurai' || r === 'Monk')
           || game.youmonst?.data?.pmidx === PMNAMES.PM_SASQUATCH
           || (game.u.uarmf && game.u.uarmf.otyp === ONAMES.KICKING_BOOTS);
}

function note_unported_dokick(what) {
    (game.unported ||= new Set()).add(what);
}

/* display_nhwindow(WIN_MESSAGE, TRUE) — the blocking --More-- C uses to make
   sure the refusal is read before the direction key arrives. */
async function display_nhwindow_message() {
    await more();
}

// src/dokick.c down_gate() — is there a way DOWN from (x,y) for a dropped
// object to fall through? Returns a MIGR_* code, or MIGR_NOWHERE for an
// ordinary square, which is what makes ship_object() a no-op almost
// everywhere.
//
// stairway_at() and t_at() arrive through the wiring below rather than by
// import, for the reason in the file header.
// var, not let: cmd.js wires these from its top level, which can run before
// this body evaluates (see the add_room_fn note in js/sp_lev.js).
var stairway_at_fn, t_at_fn;
export function dokick_wire(fns) {
    stairway_at_fn = fns.stairway_at;
    t_at_fn = fns.t_at;
}

export function down_gate(x, y) {
    const stway = stairway_at_fn ? stairway_at_fn(x, y) : null;

    game.gate_str = 0;
    /* this matches the player restriction in goto_level().
       on_level(&u.uz, &qstart_level) && !ok_to_quest() -- neither is ported,
       and the quest start level is not reachable in an early-dungeon
       session, so record rather than guess. */
    if (game.level?.flags?.is_qstart)
        (game.unported ||= new Set()).add('dokick:down_gate:quest');

    if (stway && !stway.up && !stway.isladder) {
        game.gate_str = 'down the stairs';
        return (stway.tolev?.dnum === game.u?.uz?.dnum) ? MIGR_STAIRS_UP
                                                        : MIGR_SSTAIRS;
    }
    if (stway && !stway.up && stway.isladder) {
        game.gate_str = 'down the ladder';
        return MIGR_LADDER_UP;
    }
    /* hole will always be flagged as seen; trap drop might or might not */
    const ttmp = t_at_fn ? t_at_fn(x, y) : null;
    if (ttmp && ttmp.tseen && is_hole(ttmp.ttyp)) {
        game.gate_str = (ttmp.ttyp === TRAPDOOR) ? 'through the trap door'
                                                 : 'through the hole';
        return MIGR_RANDOM;
    }
    return MIGR_NOWHERE;
}

// src/dokick.c ship_object() — send a dropped object down a hole or stairs.
//
// Only the two early returns are ported, and they are what answers on any
// ordinary square: no object means FALSE, and no downward gate means FALSE.
// The actual shipping needs drop_to(), the migration lists and the shop arms,
// so a square that DOES have a gate records rather than guessing.
export function ship_object(otmp, x, y, shop_floor_obj) {
    if (!otmp)
        return false;
    if (down_gate(x, y) === MIGR_NOWHERE)
        return false;

    (game.unported ||= new Set()).add('dokick:ship_object:migration');
    return false;
}


// src/mon.c:4367 wake_nearby() — wake everything within ulevel*20 squared.
// Draws nothing: it clears msleeping and the waiting strategy bit.
function wake_nearby(petcall) {
    const distance = game.u.ulevel * 20;
    for (const mtmp of (game.level?.monsters || [])) {
        if (mtmp.mhp <= 0)
            continue;
        if (distance === 0
            || dist2(mtmp.mx, mtmp.my, game.u.ux, game.u.uy) < distance) {
            mtmp.msleeping = 0;
            mtmp.mstrategy &= ~STRAT_WAITMASK;
            if (petcall && mtmp.mtame)
                note_unported_dokick('wake_nearby:petcall');
        }
    }
}

// src/dokick.c:1213 maybe_kick_monster() — the checks that can call the kick
// off. forcefight is forced on for a hostile or unseen target so
// attack_checks does not ask "Really attack?"; overexertion() DRAWS.
async function maybe_kick_monster(mon, x, y) {
    if (!mon)
        return false;
    const save_forcefight = game.context.forcefight;

    game.bhitpos = { x, y };
    if (!mon.mpeaceful || !canspotmon(mon))
        game.context.forcefight = true; /* attack even if invisible */
    let ok = true;
    if ((await attack_checks(mon, null)) || (await overexertion()))
        ok = false;                     /* don't kick after all */
    game.context.forcefight = save_forcefight;
    return ok;
}

const kick_passes_thru = 'kick passes harmlessly through';

// src/dokick.c:34 kickdmg(), damage from an ordinary, unpolymorphed kick.
// Keep the damage, exercise and passive-counterattack calls in C's order;
// all three can draw and the target can die between them.
async function kickdmg(mon, clumsy) {
    const ptr = mon.data || game.mons[mon.mnum];
    const boots = game.u.uarmf || null;
    let dmg = Math.trunc((acurrstr() + ACURR(A_DEX) + ACURR(A_CON)) / 15);
    let specialdmg = 0;

    if (boots?.otyp === ONAMES.KICKING_BOOTS)
        dmg += 5;
    if (clumsy)
        dmg = Math.trunc(dmg / 2);
    if (thick_skinned(ptr) || ptr.pmidx === PMNAMES.PM_SHADE)
        dmg = 0;

    if (boots?.blessed && mon_hates_blessings(mon))
        specialdmg += rnd(4);
    if (boots && game.objects?.[boots.otyp]?.oc_material === MATERIALS.SILVER
        && mon_hates_silver(mon))
        specialdmg += rnd(20);

    if (ptr.pmidx === PMNAMES.PM_SHADE && !specialdmg) {
        await pline_The(`${kick_passes_thru}.`);
        return;
    }

    if (M_AP_TYPE(mon))
        seemimic(mon);
    await check_caitiff(mon);

    if (mon.mtame) {
        await abuse_dog(mon);
        if (mon.mtame)
            monflee(mon, dmg ? rnd(dmg) : 1, false, false);
        else
            mon.mflee = 0;
    }

    let kick_skill = false;
    if (dmg > 0) {
        dmg = rnd(dmg);
        if (martial()) {
            kick_skill = dmg > 1;
            dmg += rn2(Math.trunc(ACURR(A_DEX) / 2) + 1);
        }
        exercise(A_DEX, true);
    }
    dmg += specialdmg;
    if (boots)
        dmg += boots.spe || 0;
    dmg += game.u.udaminc || 0;
    if (dmg > 0)
        mon.mhp -= dmg;

    if (!DEADMONSTER(mon) && martial() && !bigmonst(ptr) && !rn2(3)
        && mon.mcanmove && mon !== game.u.ustuck && !mon.mtrapped) {
        /* The common roll is preserved. Relocating the target also needs
           region crossing and trap handling, neither of which is complete. */
        note_unported_dokick('kickdmg:reel');
    }

    await passive(mon, boots, true, !DEADMONSTER(mon), ATTKS.AT_KICK, false);
    if (DEADMONSTER(mon))
        await killed(mon);
    if (kick_skill)
        note_unported_dokick('kickdmg:use_skill');
}

// src/dokick.c:146 kick_monster(), the ordinary hero form is complete.
// Polymorphed multi-kick attacks are tracked separately because they use the
// full hmonas damage machinery rather than this function's kickdmg path.
async function kick_monster(mon, x, y) {
    const ptr = mon.data || game.mons[mon.mnum];
    let clumsy = false;

    await setmangry(mon, true);

    if (game.u.uprops?.LEVITATION && !rn2(3) && verysmall(ptr)
        && !is_flyer(ptr)) {
        await pline('Floating in the air, you miss wildly!');
        exercise(A_DEX, false);
        await passive(mon, game.u.uarmf, false, true, ATTKS.AT_KICK, false);
        return;
    }

    if (mon.mundetected
        || (M_AP_TYPE(mon) && M_AP_TYPE(mon) !== M_AP_MONSTER)) {
        if (M_AP_TYPE(mon))
            seemimic(mon);
        mon.mundetected = 0;
        if (!canspotmon(mon))
            map_invisible(x, y);
        else
            newsym(x, y);
        await There(`is ${canspotmon(mon) ? a_monnam(mon)
                                         : 'something hidden'} here.`);
    }

    if (Upolyd(game.u)
        && ptr.mattk?.some(a => a?.[0] === ATTKS.AT_KICK))
        note_unported_dokick('kick_monster:polymorphed_kicks');

    const i = -inv_weight();
    const j = weight_cap();
    const j10 = Math.trunc(j / 10), j5 = Math.trunc(j / 5);

    if (i < Math.trunc((j * 3) / 10)) {
        if (!rn2(i < j10 ? 2 : i < j5 ? 3 : 4)) {
            if (!martial()) {
                await Your('clumsy kick does no damage.');
                await passive(mon, game.u.uarmf, false, true, ATTKS.AT_KICK,
                              false);
                return;
            }
        }
        if (i < j10)
            clumsy = true;
        else if (!rn2(i < j5 ? 2 : 3))
            clumsy = true;
    }

    if (Fumbling())
        clumsy = true;
    else if (game.u.uarm && game.objects?.[game.u.uarm.otyp]?.oc_bulky
             && ACURR(A_DEX) < rnd(25))
        clumsy = true;

    await You(`kick ${mon_nam(mon)}.`);
    if (!rn2(clumsy ? 3 : 4) && (clumsy || !bigmonst(ptr))
        && mon.mcansee && !mon.mtrapped && !thick_skinned(ptr)
        && ptr.mlet !== MONSYMS.S_EEL && haseyes(ptr) && mon.mcanmove
        && !mon.mstun && !mon.mconf && !mon.msleeping && ptr.mmove >= 12) {
        if (!nohands(ptr) && !rn2(martial() ? 5 : 3)) {
            await pline(`${Monnam(mon)} blocks your ${clumsy ? 'clumsy ' : ''}kick.`);
            await passive(mon, game.u.uarmf, false, true, ATTKS.AT_KICK,
                          false);
            return;
        }

        mnexto(mon);
        if (mon.mx !== x || mon.my !== y) {
            unmap_invisible(x, y);
            const motion = is_floater(ptr) ? 'floats'
                : is_flyer(ptr) ? 'swoops'
                  : (nolimbs(ptr) || slithy(ptr)) ? 'slides' : 'jumps';
            await pline(`${Monnam(mon)} ${motion}, ${clumsy ? 'easily' : 'nimbly'} evading your ${clumsy ? 'clumsy ' : ''}kick.`);
            await passive(mon, game.u.uarmf, false, true, ATTKS.AT_KICK,
                          false);
            return;
        }
    }

    await kickdmg(mon, clumsy);
}

// src/dokick.c:508 really_kick_object(), through the common immovable-object
// path. This covers ordinary floor stacks whose next square is blocked, while
// retaining the range and break-test draws that happen before the "Thump!".
async function really_kick_object(obj, x, y) {
    if (!obj || obj.otyp === ONAMES.BOULDER)
        return false;

    if (Fumbling() && !rn2(3)) {
        await Your('clumsy kick missed.');
        return true;
    }

    const isgold = obj.oclass === OCLASSES.COIN_CLASS;
    let k_owt = obj.owt;
    if (obj.quan > 1 && !isgold) {
        const save_quan = obj.quan;
        obj.quan = 1;
        k_owt = weight(obj);
        obj.quan = save_quan;
    }

    let range = Math.trunc(acurrstr() / 2) - Math.trunc(k_owt / 40);
    if (martial())
        range += rnd(3);

    if (is_pool(x, y)) {
        range = Math.trunc(range / 3) + 1;
    } else {
        if (game.level.at(x, y)?.typ === ICE)
            range += rnd(3);
        if (obj.greased)
            range += rnd(3);
    }

    const nx = x + game.u.dx, ny = y + game.u.dy;
    const nextloc = game.level.at(nx, ny);
    if (!isok(nx, ny) || !nextloc || !ZAP_POS(nextloc.typ)
        || closed_door(nx, ny))
        range = 1;

    await You(`kick ${doname(obj)}.`);

    const isbox = obj.otyp === ONAMES.LARGE_BOX || obj.otyp === ONAMES.CHEST;
    if (isbox) {
        note_unported_dokick('really_kick_object:box');
        return true;
    }

    const { breaktest, hero_breaks_potion } = await import('./dothrow.js');
    if (obj.oclass === OCLASSES.POTION_CLASS) {
        if (await hero_breaks_potion(obj))
            return true;
    } else if (breaktest(obj)) {
        note_unported_dokick('really_kick_object:breakage');
        return true;
    }

    if (range < 2) {
        await pline('Thump!');
        return !rn2(3) || martial();
    }

    note_unported_dokick('really_kick_object:motion');
    return true;
}

// src/dokick.c:1257 dokick() — the '^D' command.
//
// The refusal chain comes first and each arm ends the command after a
// --More--; only then is a direction read. What is ported is the chain, the
// direction, the swallowed and Levitation arms, and the monster kick; kicking
// objects, doors and terrain is recorded.
export async function dokick() {
    let no_kick = false;
    const mdat = game.youmonst?.data;

    if (nolimbs(mdat) || slithy(mdat)) {
        await You('have no legs to kick with.');
        no_kick = true;
    } else if (verysmall(mdat)) {
        await You('are too small to do any kicking.');
        no_kick = true;
    } else if (game.u.usteed) {
        const { tty_yn_function } = await import('./tty/topl.js');
        if ((await tty_yn_function('Kick your steed?', 'yn', 'y')) === 'y') {
            await You(`kick ${mon_nam(game.u.usteed)}.`);
            const { kick_steed } = await import('./steed.js');
            await kick_steed();
            return ECMD_TIME;
        }
        return ECMD_OK;
    } else if ((game.u.intrinsic?.HWounded_legs || 0) > 0
               || (game.u.EWounded_legs || 0)) {
        const side = (game.u.EWounded_legs || 0) & BOTH_SIDES;
        let leg = body_part(LEG);
        if (side === BOTH_SIDES)
            leg = makeplural(leg);
        await Your(`${side === LEFT_SIDE ? 'left ' : side === RIGHT_SIDE ? 'right ' : ''}`
                   + `${leg} ${side === BOTH_SIDES ? 'are' : 'is'} in no shape for kicking.`);
        no_kick = true;
    } else if (near_capacity() > SLT_ENCUMBER) {
        await Your('load is too heavy to balance yourself for a kick.');
        no_kick = true;
    } else if (mdat?.mlet === MONSYMS.S_LIZARD) {
        await Your('legs cannot kick effectively.');
        no_kick = true;
    } else if (game.u.uinwater && !rn2(2)) {
        await Your("slow motion kick doesn't hit anything.");
        no_kick = true;
    } else if (game.u.utrap) {
        no_kick = true;
        note_unported_dokick('dokick:utrap');
    } else if (sobj_at(ONAMES.BOULDER, game.u.ux, game.u.uy)) {
        await pline("There's not enough room to kick in here.");
        no_kick = true;
    }

    if (no_kick) {
        /* ignore direction typed before the player notices the kick failed */
        await display_nhwindow_message();      /* --More-- */
        return ECMD_FAIL;
    }

    if (!(await getdir(null)))
        return ECMD_CANCEL;
    if (!game.u.dx && !game.u.dy)
        return ECMD_CANCEL;

    const x = game.u.ux + game.u.dx, y = game.u.uy + game.u.dy;
    game.kickedloc = { x, y };

    if (game.u.uswallow) {
        rn2(3);
        note_unported_dokick('dokick:uswallow');
        return ECMD_TIME;
    }
    if (game.u.uprops?.LEVITATION) {
        note_unported_dokick('dokick:levitation');
        return ECMD_OK;
    }

    const mtmp = isok(x, y) ? m_at(x, y) : null;
    if (mtmp) {
        if (!(await maybe_kick_monster(mtmp, x, y)))
            return game.context.move ? ECMD_TIME : ECMD_OK;
    }

    wake_nearby(false);
    u_wipe_engr(2);

    if (!isok(x, y)) {
        note_unported_dokick('dokick:kick_ouch_offmap');
        return ECMD_TIME;
    }

    /* The next five tests stay in C's order: monsters, pools, objects,
       non-doors, doors. */
    if (mtmp) {
        await kick_monster(mtmp, x, y);
        if (!DEADMONSTER(mtmp) && !canspotmon(mtmp)
            && mtmp.mx === x && mtmp.my === y
            && !glyph_is_invisible_at(x, y) && !engulfing_u(mtmp))
            map_invisible(x, y);
        return ECMD_TIME;
    }

    unmap_invisible(x, y);

    /* src/dokick.c:1328 — KMH: kicking boots always succeed */
    const avrg_attrib = (game.u.uarmf
                         && game.u.uarmf.otyp === ONAMES.KICKING_BOOTS)
        ? 99
        : Math.trunc((acurrstr() + ACURR(A_DEX) + ACURR(A_CON)) / 3);

    /* src/dokick.c:1444 — kicking water or lava just splashes it */
    if (is_pool(x, y) !== !!game.u.uinwater) {
        note_unported_dokick('dokick:splash');
        return ECMD_TIME;
    }

    if (OBJ_AT(x, y)) {
        /* The flat floor list is newest-first, matching the head of C's
           per-square pile chain. */
        const obj = (game.level.objects || [])
            .find(o => o.ox === x && o.oy === y);
        if (await really_kick_object(obj, x, y))
            return ECMD_TIME;
        note_unported_dokick('dokick:kick_object');
        return ECMD_TIME;
    }

    const maploc = game.level.at(x, y);
    if (IS_DOOR(maploc.typ))
        await kick_door(x, y, avrg_attrib, maploc);
    else
        return await kick_nondoor(x, y, avrg_attrib, maploc);
    return ECMD_TIME;
}

// src/dokick.c:1596 kickstr() — the killer string for a fatal kick.
function kickstr(maploc, kickobjnam) {
    let what;
    if (kickobjnam)
        what = kickobjnam;
    else if (!maploc)
        what = 'nothing';
    else if (IS_DOOR(maploc.typ))
        what = 'a door';
    else if (IS_TREE(maploc.typ))
        what = 'a tree';
    else if (IS_STWALL(maploc.typ))
        what = 'a wall';
    else if (IS_OBSTRUCTED(maploc.typ))
        what = 'a rock';
    else if (IS_THRONE(maploc.typ))
        what = 'a throne';
    else if (IS_FOUNTAIN(maploc.typ))
        what = 'a fountain';
    else if (IS_GRAVE(maploc.typ))
        what = 'a headstone';
    else if (IS_SINK(maploc.typ))
        what = 'a sink';
    else if (IS_ALTAR(maploc.typ))
        what = 'an altar';
    else if (IS_DRAWBRIDGE(maploc.typ))
        what = 'a drawbridge';
    else if (maploc.typ === STAIRS)
        what = 'the stairs';
    else if (maploc.typ === LADDER)
        what = 'a ladder';
    else if (maploc.typ === IRONBARS)
        what = 'an iron bar';
    else
        what = 'something weird';
    return 'kicking ' + what;
}

// src/dokick.c:881 kick_ouch() — the kick hurt the hero, not the target.
// Kept local because importing do.js here creates the dokick/do wiring cycle
// described at the top of this file.
async function wound_kicking_leg(timex) {
    game.disp ||= {};
    game.disp.botl = true;
    const intr = (game.u.intrinsic ||= {});
    const wounded = (intr.HWounded_legs || 0) > 0
        || (game.u.EWounded_legs || 0);
    if (!wounded)
        game.u.atemp.a[A_DEX]--;
    if (!wounded || (intr.HWounded_legs || 0) < timex)
        intr.HWounded_legs = timex;
    game.u.EWounded_legs = (game.u.EWounded_legs || 0) | RIGHT_SIDE;
    await encumber_msg();
}

async function kick_ouch(x, y, maploc, kickobjnam) {
    await pline('Ouch!  That hurts!');
    exercise(A_DEX, false);
    exercise(A_STR, false);
    if (isok(x, y)) {
        if (game.u.ublind)
            note_unported_dokick('kick_ouch:feel_location');
        if (is_drawbridge_wall(x, y) >= 0) {
            await pline_The('drawbridge is unaffected.');
            /* update maploc to refer to the drawbridge */
            const cc = { x, y };
            find_drawbridge(cc);
            maploc = game.level.at(cc.x, cc.y);
        }
        wake_nearto(x, y, 5 * 5);
    }
    if (!rn2(3))
        await wound_kicking_leg(5 + rnd(5));
    const dmg = rnd(ACURR(A_CON) > 15 ? 3 : 5);
    await losehp(dmg, kickstr(maploc, kickobjnam), KILLED_BY);
    if (game.u.uprops?.LEVITATION)
        note_unported_dokick('kick_ouch:hurtle');
}

// src/dokick.c:890 kick_dumb() — kicking a doorway with nothing in it.
async function kick_dumb(x, y) {
    exercise(A_DEX, false);
    if (martial() || ACURR(A_DEX) >= 16 || rn2(3)) {
        await You('kick at empty space.');
        if (game.u.ublind)
            note_unported_dokick('kick_dumb:feel_location');
    } else {
        await pline('Dumb move!  You strain a muscle.');
        exercise(A_STR, false);
        await wound_kicking_leg(5 + rnd(5));
    }
    /* the airlevel/Levitation hurtle needs neither here */
}

// src/dokick.c:910 kick_door() — kick a door.
async function kick_door(x, y, avrg_attrib, maploc) {
    if (maploc.doormask === D_ISOPEN || maploc.doormask === D_BROKEN
        || maploc.doormask === D_NODOOR) {
        await kick_dumb(x, y);
        return; /* uses a turn */
    }

    /* not enough leverage to kick open doors while levitating */
    if (game.u.uprops?.LEVITATION) {
        await kick_ouch(x, y, maploc, '');
        return;
        return;
    }

    exercise(A_DEX, true);
    const doorbuster = false;   /* Upolyd && is_giant(youmonst.data) */
    /* door is known to be CLOSED or LOCKED */
    if (doorbuster
        || (rnl(35) < avrg_attrib + (!martial() ? 0 : ACURR(A_DEX)))) {
        const shopdoor = false; /* *in_rooms(x, y, SHOPBASE) */

        /* break the door */
        if (maploc.doormask & D_TRAPPED) {
            if (game.flags?.verbose)
                await You('kick the door.');
            exercise(A_STR, false);
            maploc.doormask = D_NODOOR;
            note_unported_dokick('kick_door:b_trapped');
        } else if (ACURR(A_STR) > 18 && !rn2(5) && !shopdoor) {
            await pline('As you kick the door, it shatters to pieces!');
            exercise(A_STR, true);
            maploc.doormask = D_NODOOR;
        } else {
            await pline('As you kick the door, it crashes open!');
            exercise(A_STR, true);
            maploc.doormask = D_BROKEN;
        }
        newsym(x, y);           /* feel_newsym: we know we broke it */
        recalc_block_point(x, y); /* vision */
    } else {
        if (game.u.ublind)
            note_unported_dokick('kick_door:feel_location');
        exercise(A_STR, true);
        /* note: this used to be unconditional "WHAMMM!!!" but that has a
           fairly strong connotation of noise that a deaf hero shouldn't
           hear; we've kept the extra 'm's and one of the extra '!'s */
        await pline(`${(game.u.udeaf || !rn2(3)) ? 'Thwack' : 'Whammm'}!!`);
    }
    /* in_town() watchman reactions need town rooms */
}

// src/dokick.c:974 kick_nondoor() — every terrain arm that is not a door.
// Unreachable machinery is recorded at the exact C call position; every
// draw C makes before such a point is made here too.
async function kick_nondoor(x, y, avrg_attrib, maploc) {
    const G_GONE = MFLAGS.G_GENOD | MFLAGS.G_EXTINCT;
    const Levitation = !!game.u.uprops?.LEVITATION;
    const Blind = !!game.u.ublind;

    if (maploc.typ === SDOOR) {
        if (!Levitation && rn2(30) < avrg_attrib) {
            cvt_sdoor_to_door(maploc); /* ->typ = DOOR */
            await pline('Crash!  %s a secret door!'.replace('%s',
                  ((maploc.doormask & (D_LOCKED | D_TRAPPED))
                   === D_LOCKED) ? 'Your kick uncovers' : 'You kick open'));
            exercise(A_DEX, true);
            if (maploc.doormask & D_TRAPPED) {
                maploc.doormask = D_NODOOR;
                note_unported_dokick('kick_nondoor:b_trapped');
            } else if (maploc.doormask !== D_NODOOR
                       && !(maploc.doormask & D_LOCKED))
                maploc.doormask = D_ISOPEN;
            newsym(x, y); /* feel_newsym: we know it's gone */
            if (maploc.doormask === D_ISOPEN
                || maploc.doormask === D_NODOOR)
                unblock_point(x, y); /* vision */
            return ECMD_TIME;
        } else {
            await kick_ouch(x, y, maploc, '');
            return ECMD_TIME;
        }
    }
    if (maploc.typ === SCORR) {
        if (!Levitation && rn2(30) < avrg_attrib) {
            await pline('Crash!  You kick open a secret passage!');
            exercise(A_DEX, true);
            maploc.typ = CORR;
            newsym(x, y); /* feel_newsym: we know it's gone */
            unblock_point(x, y); /* vision */
            return ECMD_TIME;
        } else {
            await kick_ouch(x, y, maploc, '');
            return ECMD_TIME;
        }
    }
    if (IS_THRONE(maploc.typ)) {
        const Luck = (game.u.uluck | 0) + (game.u.moreluck | 0);
        if (Levitation) {
            await kick_dumb(x, y);
            return ECMD_TIME;
        }
        if ((Luck < 0 || maploc.looted) && !rn2(3)) {
            maploc.looted = 0; /* don't leave loose ends.. */
            maploc.typ = ROOM;
            mkgold(rnd(200), x, y);
            if (Blind)
                await pline('CRASH!  You destroy it.');
            else {
                await pline('CRASH!  You destroy the throne.');
                newsym(x, y);
            }
            exercise(A_DEX, true);
            return ECMD_TIME;
        } else if (Luck > 0 && !rn2(3) && !maploc.looted) {
            mkgold(rn1(201, 300), x, y);
            let i = Luck + 1;
            if (i > 6)
                i = 6;
            while (i--)
                mksobj_at(rnd_class(ONAMES.DILITHIUM_CRYSTAL,
                                    ONAMES.LUCKSTONE - 1), x, y,
                          false, true);
            if (Blind)
                await You('kick something loose!');
            else {
                await You('kick loose some ornamental coins and gems!');
                newsym(x, y);
            }
            /* prevent endless milking */
            maploc.looted = T_LOOTED;
            return ECMD_TIME;
        } else if (!rn2(4)) {
            if (dunlev(game.u.uz) < dunlevs_in_dungeon(game.u.uz)) {
                note_unported_dokick('kick_nondoor:fall_through');
                return ECMD_TIME;
            } else {
                await kick_ouch(x, y, maploc, '');
                return ECMD_TIME;
            }
        }
        await kick_ouch(x, y, maploc, '');
        return ECMD_TIME;
    }
    if (IS_ALTAR(maploc.typ)) {
        if (Levitation) {
            await kick_dumb(x, y);
            return ECMD_TIME;
        }
        await You(`kick ${Blind ? 'something' : 'the altar'}.`);
        note_unported_dokick('kick_nondoor:altar_wrath');
        if (!rn2(3)) {
            await kick_ouch(x, y, maploc, '');
            return ECMD_TIME;
        }
        exercise(A_DEX, true);
        return ECMD_TIME;
    }
    if (IS_FOUNTAIN(maploc.typ)) {
        if (Levitation) {
            await kick_dumb(x, y);
            return ECMD_TIME;
        }
        await You(`kick ${Blind ? 'something' : 'the fountain'}.`);
        if (!rn2(3)) {
            await kick_ouch(x, y, maploc, '');
            return ECMD_TIME;
        }
        /* make metal boots rust */
        if (game.uarmf && rn2(3))
            note_unported_dokick('kick_nondoor:water_damage');
        exercise(A_DEX, true);
        return ECMD_TIME;
    }
    if (IS_GRAVE(maploc.typ)) {
        if (Levitation) {
            await kick_dumb(x, y);
        } else if (rn2(4)) {
            /* minor injury */
            await kick_ouch(x, y, maploc, '');
        } else if (!maploc.disturbed && !rn2(2)) {
            /* disturb the grave: summon a ghoul (once only) */
            note_unported_dokick('kick_nondoor:disturb_grave');
        } else {
            /* destroy the headstone */
            exercise(A_WIS, false);
            if (game.urole?.name?.m === 'Archeologist'
                || game.urole?.name?.m === 'Samurai'
                || (game.u.ualign?.type === A_LAWFUL
                    && (game.u.ualign?.record ?? 0) > -10))
                adjalign(-sgn(game.u.ualign?.type ?? 0));
            maploc.typ = ROOM;
            maploc.emptygrave = 0; /* clear 'flags' */
            maploc.disturbed = 0;  /* clear 'horizontal' */
            mksobj_at(ONAMES.ROCK, x, y, true, false);
            note_unported_dokick('kick_nondoor:del_engr_at');
            if (Blind) {
                await pline('Crack!  Something broke!');
            } else {
                await pline_The('headstone topples over and breaks!');
                newsym(x, y);
            }
        }
        return ECMD_TIME;
    }
    if (maploc.typ === IRONBARS) {
        await kick_ouch(x, y, maploc, '');
        return ECMD_TIME;
    }
    if (IS_TREE(maploc.typ)) {
        /* nothing, fruit or trouble? 75:23.5:1.5% */
        if (rn2(3)) {
            if (!rn2(6)
                && !((game.mvitals?.[PMNAMES.PM_KILLER_BEE]?.mvflags ?? 0)
                     & G_GONE))
                await pline('You hear a low buzzing.'); /* a warning */
            await kick_ouch(x, y, maploc, '');
            return ECMD_TIME;
        }
        if (rn2(15) && !(maploc.looted & TREE_LOOTED)) {
            /* rnd_treefruit_at() + scatter() are the fruit drop; neither
               is ported, and the arm changes the object map. */
            note_unported_dokick('kick_nondoor:treefruit');
            return ECMD_TIME;
        } else if (!(maploc.looted & TREE_SWARM)) {
            let cnt = rnl(4) + 2;
            let made = 0;
            const mm = { x, y };
            while (cnt--) {
                if (enexto(mm, mm.x, mm.y, game.mons[PMNAMES.PM_KILLER_BEE])
                    && await makemon(game.mons[PMNAMES.PM_KILLER_BEE],
                                     mm.x, mm.y, MM_ANGRY | MM_NOMSG))
                    made++;
            }
            if (made)
                await pline("You've attracted the tree's former occupants!");
            else
                await You('smell stale honey.');
            maploc.looted |= TREE_SWARM;
            return ECMD_TIME;
        }
        await kick_ouch(x, y, maploc, '');
        return ECMD_TIME;
    }
    if (IS_SINK(maploc.typ)) {
        const gend = poly_gender();

        if (Levitation) {
            await kick_dumb(x, y);
            return ECMD_TIME;
        }
        if (rn2(5)) {
            if (!Deaf())
                await pline('Klunk!  The pipes vibrate noisily.');
            else
                await pline('Klunk!');
            exercise(A_DEX, true);
            return ECMD_TIME;
        } else if (!(maploc.looted & S_LPUDDING) && !rn2(3)
                   && !((game.mvitals?.[PMNAMES.PM_BLACK_PUDDING]?.mvflags
                         ?? 0) & G_GONE)) {
            if (Blind) {
                if (!Deaf())
                    await pline('You hear a gushing sound.');
            } else {
                await pline(`A ${hcolor('black')} ooze gushes up from the drain!`);
            }
            await makemon(game.mons[PMNAMES.PM_BLACK_PUDDING], x, y, MM_NOMSG);
            exercise(A_DEX, true);
            newsym(x, y);
            maploc.looted |= S_LPUDDING;
            return ECMD_TIME;
        } else if (!(maploc.looted & S_LDWASHER) && !rn2(3)
                   && !((game.mvitals?.[PMNAMES.PM_AMOROUS_DEMON]?.mvflags
                         ?? 0) & G_GONE)) {
            /* can't resist... */
            await pline(`${Blind ? 'Something' : 'The dish washer'} returns!`);
            if (await makemon(game.mons[PMNAMES.PM_AMOROUS_DEMON], x, y,
                              MM_NOMSG | ((gend === 1 || (gend === 2 && rn2(2)))
                                          ? MM_MALE : MM_FEMALE)))
                newsym(x, y);
            maploc.looted |= S_LDWASHER;
            exercise(A_DEX, true);
            return ECMD_TIME;
        } else if (!rn2(3)) {
            note_unported_dokick('kick_nondoor:sink_backs_up');
            return ECMD_TIME;
        }
        await kick_ouch(x, y, maploc, '');
        return ECMD_TIME;
    }
    if (maploc.typ === STAIRS || maploc.typ === LADDER
        || IS_STWALL(maploc.typ)) {
        const sway = stairway_at(x, y);
        if (!IS_STWALL(maploc.typ) && sway && !sway.up) {
            await kick_dumb(x, y);
            return ECMD_TIME;
        }
        await kick_ouch(x, y, maploc, '');
        return ECMD_TIME;
    }
    await kick_dumb(x, y);
    return ECMD_TIME;
}

// src/dokick.c:1473 drop_to(); the destination of objects falling through
// the gate at <x,y>: cc.x is the dungeon number and cc.y the level
export function drop_to(cc, loc, x, y) {
    const u = game.u;
    const stway = stairway_at(x, y);

    switch (loc) {
    case MIGR_RANDOM: /* trap door or hole */
        if (Is_stronghold(u.uz)) {
            cc.x = game.valley_level.dnum;
            cc.y = game.valley_level.dlevel;
            break;
        } else if (In_endgame(u.uz) || Is_botlevel(u.uz)) {
            cc.y = cc.x = 0;
            break;
        }
        /* FALLTHROUGH */
    case MIGR_STAIRS_UP:
    case MIGR_LADDER_UP:
    case MIGR_SSTAIRS:
        if (stway) {
            cc.x = stway.tolev.dnum;
            cc.y = stway.tolev.dlevel;
        } else {
            cc.x = u.uz.dnum;
            cc.y = u.uz.dlevel + 1;
        }
        break;
    default:
    case MIGR_NOWHERE:
        /* y==0 means "nowhere", in which case x doesn't matter */
        cc.y = cc.x = 0;
        break;
    }
}

// src/dokick.c:412 container_impact_dmg()
export async function container_impact_dmg(obj, x, y) {
    let shkp;
    let loss = 0;
    let costly, insider, frominv, wchange = false;

    /* only consider normal containers */
    if (!Is_container(obj) || !Has_contents(obj) || Is_mbag(obj))
        return;

    costly = ((shkp = shop_keeper((in_rooms(x, y, SHOPBASE) || '\0').charCodeAt(0)))
              && costly_spot(x, y));
    insider = (game.u.ushops && inside_shop(game.u.ux, game.u.uy)
               && (in_rooms(x, y, SHOPBASE) || '').charAt(0) === game.u.ushops.charAt(0));
    /* if dropped or thrown, shop ownership flags are set on this obj */
    frominv = (obj !== game.kickedobj);

    for (const otmp of [...(obj.cobj || [])]) {
        let result = null;

        if (game.objects[otmp.otyp].oc_material === MATERIALS.GLASS
            && otmp.oclass !== OCLASSES.GEM_CLASS && !obj_resists(otmp, 33, 100)) {
            result = 'shatter';
        } else if (otmp.otyp === ONAMES.EGG && !rn2(3)) {
            result = 'cracking';
        }
        if (result) {
            if (otmp.otyp === ONAMES.MIRROR)
                change_luck(-2);

            /* eggs laid by you.  penalty is -1 per egg, max 5,
             * but it's always exactly 1 that breaks */
            if (otmp.otyp === ONAMES.EGG && otmp.spe && ismnum(otmp.corpsenm))
                change_luck(-1);
            /* Soundeffect(se_egg_cracking / se_glass_shattering, 25) */
            await You_hear(`a muffled ${result}.`);
            if (costly) {
                if (frominv && !otmp.unpaid)
                    otmp.no_charge = 1;
                loss +=
                    await stolen_value(otmp, x, y, !!shkp.mpeaceful, true);
            }
            if (otmp.quan > 1) {
                useup(otmp);
            } else {
                obj_extract_self(otmp);
                obfree(otmp, null);
            }
            /* contents of this container are no longer known */
            obj.cknown = 0;
            wchange = true;
        }
    }
    if (wchange)
        obj.owt = weight(obj);
    if (costly && loss) {
        if (!insider) {
            await You(`caused ${loss} ${currency(loss)} worth of damage!`);
            await make_angry_shk(shkp, x, y);
        } else {
            await You(`owe ${shkname(shkp)} ${loss} ${currency(loss)} for objects destroyed.`);
        }
    }
}

// src/dokick.c:1511 impact_drop(); objects at <x,y> tumble through the
// gate there (stairs, ladder, hole) to the level below
export async function impact_drop(missile, x, y, dlev) {
    /* missile: caused impact, won't drop itself; dlev: if !0 send to dlev
       near player */
    const u = game.u;
    let toloc;
    let shkp;
    let oct, dct, price, debit, robbed;
    let angry, costly, isrock;
    const cc = { x: 0, y: 0 };

    if (!OBJ_AT(x, y))
        return;

    toloc = down_gate(x, y);
    drop_to(cc, toloc, x, y);
    if (!cc.y)
        return;

    if (dlev) {
        /* send objects next to player falling through trap door.
         * checked in obj_delivery().
         */
        toloc = MIGR_WITH_HERO;
        cc.y = dlev;
    }

    costly = costly_spot(x, y);
    price = debit = robbed = 0;
    angry = false;
    shkp = null;
    /* if 'costly', we must keep a record of ESHK(shkp) before
     * it undergoes changes through the calls to stolen_value.
     * the angry bit must be reset, if needed, in this fn, since
     * stolen_value is called under the 'silent' flag to avoid
     * unsavory pline repetitions.
     */
    if (costly) {
        if ((shkp = shop_keeper((in_rooms(x, y, SHOPBASE) || '\0').charCodeAt(0))) != null) {
            debit = ESHK(shkp).debit;
            robbed = ESHK(shkp).robbed;
            angry = !shkp.mpeaceful;
        }
    }

    isrock = (missile && missile.otyp === ONAMES.ROCK);
    oct = dct = 0;
    for (const obj of (game.level.objects || []).filter(
             (o) => o.ox === x && o.oy === y)) {
        if (obj === missile)
            continue;
        /* number of objects in the pile */
        oct += obj.quan;
        if (obj === u.uball || obj === u.uchain)
            continue;
        /* boulders can fall too, but rarely & never due to rocks */
        if ((isrock && obj.otyp === ONAMES.BOULDER)
            || rn2(obj.otyp === ONAMES.BOULDER ? 30 : 3))
            continue;
        obj_extract_self(obj);

        if (costly) {
            /* strchr(u.urooms, '\0') finds the terminator, so an empty
               in_rooms() result counts as a match in the C */
            const oshop = (in_rooms(x, y, SHOPBASE) || '').charAt(0);
            price += await stolen_value(obj, x, y,
                                        (costly_spot(u.ux, u.uy)
                                         && (oshop === ''
                                             || (u.urooms || '').includes(oshop))),
                                        true);
            /* set obj->no_charge to 0 */
            if (Has_contents(obj))
                picked_container(obj); /* does the right thing */
            if (obj.oclass !== OCLASSES.COIN_CLASS)
                obj.no_charge = 0;
        }

        add_to_migration(obj);
        obj.ox = cc.x;
        obj.oy = cc.y;
        obj.owornmask = toloc;
        /* number of fallen objects */
        dct += obj.quan;
    }

    if (dct && cansee(x, y)) { /* at least one object fell */
        const what = (dct === 1 ? 'object falls' : 'objects fall');

        if (missile)
            await pline(`From the impact, ${
                dct === oct ? 'the ' : dct === 1 ? 'an' : ''}other ${what}.`);
        else if (oct === dct)
            await pline(`${dct === 1 ? 'The' : 'All the'} adjacent ${what} ${
                game.gate_str}.`);
        else
            await pline(`${dct === 1 ? 'One of the' : 'Some of the'} adjacent ${
                dct === 1 ? 'objects falls' : what} ${game.gate_str}.`);
    }

    if (costly && shkp && price) {
        if (ESHK(shkp).robbed > robbed) {
            await You(`removed ${price} ${currency(price)} worth of goods!`);
            if (cansee(shkp.mx, shkp.my)) {
                if (!ESHK(shkp).customer)
                    ESHK(shkp).customer = game.plname;
                if (angry)
                    await pline(`${Shknam(shkp)} is infuriated!`);
                else
                    await pline(`"${game.plname}, you are a thief!"`);
            } else
                await You_hear('a scream, "Thief!"');
            hot_pursuit(shkp);
            await angry_guards(false);
            return;
        }
        if (ESHK(shkp).debit > debit) {
            const amt = (ESHK(shkp).debit - debit);

            await You(`owe ${Shknam(shkp)} ${amt} ${currency(amt)} for goods lost.`);
        }
    }
}
