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
import { pline, canseemon, canspotmon, more, map_invisible, unmap_invisible,
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
import { wake_nearby } from './mon.js';
import { get_iter_mons } from './mon.js';
import { get_iter_mons_xy } from './mon.js';
import { maybe_mnexto } from './mon.js';
import { wakeup } from './mon.js';
import { Role_if } from './attrib.js';
import { A_CHA } from './const.js';
import { P_NONE } from './const.js';
import { P_MARTIAL_ARTS } from './const.js';
import { W_ARMF } from './const.js';
import { NO_TRAP_FLAGS } from './const.js';
import { NATTK } from './const.js';
import { M_ATTK_MISS } from './const.js';
import { M_ATTK_DEF_DIED } from './const.js';
import { STONE } from './const.js';
import { OBJ_FLOOR } from './const.js';
import { OBJ_MINVENT } from './const.js';
import { OBJ_MIGRATING } from './const.js';
import { WEB } from './const.js';
import { STATUE_TRAP } from './const.js';
import { CXN_PFX_THE } from './const.js';
import { FOOT } from './const.js';
import { KICKED_WEAPON } from './const.js';
import { VIS_EFFECTS } from './const.js';
import { MAY_HIT } from './const.js';
import { D_WARNED } from './const.js';
import { SHOP_DOOR_COST } from './const.js';
import { ER_NOTHING } from './const.js';
import { NH_BLACK } from './const.js';
import { TT_PIT } from './const.js';
import { TT_WEB } from './const.js';
import { TT_BEARTRAP } from './const.js';
import { LAVAWALL } from './const.js';
import { Is_airlevel } from './const.js';
import { Is_waterlevel } from './const.js';
import { something } from './const.js';
import { Something } from './const.js';
import { is_pit } from './const.js';
import { Trap_Killed_Mon } from './trap.js';
import { can_teleport } from './mondata.js';
import { attacktype } from './mondata.js';
import { likes_gold } from './mondata.js';
import { touch_petrifies } from './mondata.js';
import { poly_when_stoned } from './mondata.js';
import { digests } from './mondata.js';
import { is_giant } from './mondata.js';
import { is_watch } from './mondata.js';
import { special_dmgval } from './weapon.js';
import { use_skill } from './weapon.js';
import { find_roll_to_hit } from './uhitm.js';
import { mon_maybe_unparalyze } from './uhitm.js';
import { damageum } from './uhitm.js';
import { missum } from './uhitm.js';
import { set_apparxy } from './monmove.js';
import { mon_yells } from './monmove.js';
import { goodpos } from './makemon.js';
import { remove_monster } from './makemon.js';
import { place_monster } from './makemon.js';
import { is_mercenary } from './makemon.js';
import { m_in_out_region } from './region.js';
import { mintrap } from './trap.js';
import { find_trap } from './detect.js';
import { activate_statue_trap } from './trap.js';
import { instapetrify } from './trap.js';
import { chest_trap } from './trap.js';
import { b_trapped } from './trap.js';
import { fall_through } from './trap.js';
import { water_damage } from './trap.js';
import { Levitation } from './youprop.js';
import { Passes_walls } from './youprop.js';
import { Stone_resistance } from './youprop.js';
import { Hallucination } from './youprop.js';
import { Blind } from './youprop.js';
import { feel_location } from './display.js';
import { feel_newsym } from './display.js';
import { glyph_at } from './display.js';
import { show_glyph_cell } from './display.js';
import { You_cant } from './pline.js';
import { Norep } from './pline.js';
import { verbalize } from './pline.js';
import { hliquid } from './do_name.js';
import { mhis } from './mondata.js';
import { noteleport_level } from './teleport.js';
import { finish_meating } from './dogmove.js';
import { mpickobj } from './makemon.js';
import { make_happy_shk } from './shk.js';
import { money_cnt } from './invent.js';
import { hidden_gold } from './invent.js';
import { xname } from './objnam.js';
import { otense } from './objnam.js';
import { miss } from './zap.js';
import { killer_xname } from './objnam.js';
import { corpse_xname } from './objnam.js';
import { singular } from './objnam.js';
import { The } from './objnam.js';
import { distant_name } from './objnam.js';
import { Doname2 } from './objnam.js';
import { An } from './objnam.js';
import { polymon } from './polyself.js';
import { is_ice } from './dbridge.js';
import { is_art } from './artifact.js';
import { ART_MJOLLNIR } from './artilist_data.js';
import { find_objowner } from './shk.js';
import { costly_adjacent } from './shk.js';
import { addtobill } from './shk.js';
import { flooreffects } from './do.js';
import { place_object } from './mkobj.js';
import { impact_disturbs_zombies } from './hack.js';
import { stackobj } from './invent.js';
import { Is_box } from './obj.js';
import { breakchestlock } from './lock.js';
import { hero_breaks } from './dothrow.js';
import { splitobj } from './mkobj.js';
import { scatter } from './explode.js';
import { surface } from './dungeon.js';
import { snuff_candle } from './apply.js';
import { bhit } from './zap.js';
import { thitmonst } from './dothrow.js';
import { costly_gold } from './shk.js';
import { subfrombill } from './shk.js';
import { contained_gold } from './invent.js';
import { donate_gold } from './shk.js';
import { set_wounded_legs } from './do.js';
import { hurtle } from './dothrow.js';
import { in_town } from './hack.js';
import { add_damage } from './shk.js';
import { pay_for_damage } from './shk.js';
import { mksobj } from './mkobj.js';
import { altar_wrath } from './pray.js';
import { disturb_grave } from './engrave.js';
import { del_engr_at } from './engrave.js';
import { G_GONE } from './const.js';
import { rnd_treefruit_at } from './dig.js';
import { is_plural } from './obj.js';
import { sink_backs_up } from './fountain.js';
import { kick_steed } from './steed.js';
import { legs_in_no_shape } from './do.js';
import { t_at } from './mon.js';
import { couldsee } from './vision.js';
import { d } from './rng.js';





























































































































































































































































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
/* src/decl.c gn.nowhere: the rm kick_ouch() refers to when off the map */
const nowhere = { typ: STONE };
/* include/hack.h ROLL_FROM(); include/youprop.h Wounded_legs */
const ROLL_FROM = (array) => array[rn2(array.length)];
const Wounded_legs = () => !!(game.u.intrinsic?.HWounded_legs || game.u.EWounded_legs);
/* include/hack.h:1236 Maybe_Half_Phys() */
const Maybe_Half_Phys = (dmg) =>
    (!!(game.u.intrinsic?.HHalf_physical_damage || game.u.uprops?.HALF_PHDAM)
     ? Math.trunc((dmg + 1) / 2) : dmg);
/* include/you.h Luck: u.uluck + u.moreluck, read at each use */
const Luck = () => (game.u.uluck | 0) + (game.u.moreluck | 0);
/* the C compares glyph integers; our glyph_at() returns descriptors */
const same_glyph = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// src/dokick.c:34 kickdmg(), damage from an ordinary, unpolymorphed kick.
// Keep the damage, exercise and passive-counterattack calls in C's order;
// all three can draw and the target can die between them.
async function kickdmg(mon, clumsy) {
    let mdx, mdy;
    let dmg = Math.trunc((acurrstr() + ACURR(A_DEX) + ACURR(A_CON)) / 15);
    let specialdmg, kick_skill = P_NONE;
    let trapkilled = false;

    if (game.u.uarmf && game.u.uarmf.otyp === ONAMES.KICKING_BOOTS)
        dmg += 5;

    /* excessive wt affects dex, so it affects dmg */
    if (clumsy)
        dmg = Math.trunc(dmg / 2);

    /* kicking a dragon or an elephant will not harm it */
    if (thick_skinned(mon.data))
        dmg = 0;

    /* attacking a shade is normally useless */
    if (mon.data === game.mons[PMNAMES.PM_SHADE])
        dmg = 0;

    specialdmg = special_dmgval(game.youmonst, mon, W_ARMF, null);

    if (mon.data === game.mons[PMNAMES.PM_SHADE] && !specialdmg) {
        await pline_The(`${kick_passes_thru}.`);
        /* doesn't exercise skill or abuse alignment or frighten pet,
           and shades have no passive counterattack */
        return;
    }

    if (M_AP_TYPE(mon))
        seemimic(mon);

    await check_caitiff(mon);

    /* squeeze some guilt feelings... */
    if (mon.mtame) {
        await abuse_dog(mon);
        if (mon.mtame)
            await monflee(mon, (dmg ? rnd(dmg) : 1), false, false);
        else
            mon.mflee = 0;
    }

    if (dmg > 0) {
        /* convert potential damage to actual damage */
        dmg = rnd(dmg);
        if (martial()) {
            if (dmg > 1)
                kick_skill = P_MARTIAL_ARTS;
            dmg += rn2(Math.trunc(ACURR(A_DEX) / 2) + 1);
        }
        /* a good kick exercises your dex */
        exercise(A_DEX, true);
    }
    dmg += specialdmg; /* for blessed (or hypothetically, silver) boots */
    if (game.u.uarmf)
        dmg += (game.u.uarmf.spe | 0);
    dmg += (game.u.udaminc | 0); /* add ring(s) of increase damage */
    if (dmg > 0)
        mon.mhp -= dmg;
    if (!DEADMONSTER(mon) && martial() && !bigmonst(mon.data) && !rn2(3)
        && mon.mcanmove && mon !== game.u.ustuck && !mon.mtrapped) {
        /* see if the monster has a place to move into */
        mdx = mon.mx + game.u.dx;
        mdy = mon.my + game.u.dy;
        /* TODO: replace with mhurtle? */
        if (goodpos(mdx, mdy, mon, 0)) {
            await pline(`${Monnam(mon)} reels from the blow.`);
            if (await m_in_out_region(mon, mdx, mdy)) {
                remove_monster(mon.mx, mon.my);
                newsym(mon.mx, mon.my);
                place_monster(mon, mdx, mdy);
                newsym(mon.mx, mon.my);
                set_apparxy(mon);
                if (await mintrap(mon, NO_TRAP_FLAGS) === Trap_Killed_Mon)
                    trapkilled = true;
            }
        }
    }

    await passive(mon, game.u.uarmf, true, !DEADMONSTER(mon), ATTKS.AT_KICK, false);
    if (DEADMONSTER(mon) && !trapkilled)
        await killed(mon);

    /* may bring up a dialog, so put this after all messages */
    if (kick_skill !== P_NONE) /* exercise proficiency */
        await use_skill(kick_skill, 1);
}

// src/dokick.c:146 kick_monster(), the ordinary hero form is complete.
// Polymorphed multi-kick attacks are tracked separately because they use the
// full hmonas damage machinery rather than this function's kickdmg path.
async function kick_monster(mon, x, y) {
    let clumsy = false;
    let i, j;
    let doit = false;

    /* anger target even if wild miss will occur */
    await setmangry(mon, true);

    if (Levitation() && !rn2(3) && verysmall(mon.data)
        && !is_flyer(mon.data)) {
        await pline('Floating in the air, you miss wildly!');
        exercise(A_DEX, false);
        await passive(mon, game.u.uarmf, false, 1, ATTKS.AT_KICK, false);
        return;
    }

    /* reveal hidden target even if kick ends up missing (note: being
       hidden doesn't affect chance to hit so neither does this reveal) */
    if (mon.mundetected
        || (M_AP_TYPE(mon) && M_AP_TYPE(mon) !== M_AP_MONSTER)) {
        if (M_AP_TYPE(mon))
            seemimic(mon);
        mon.mundetected = 0;
        if (!canspotmon(mon))
            map_invisible(x, y);
        else
            newsym(x, y);
        await There(`is ${canspotmon(mon) ? a_monnam(mon) : 'something hidden'} here.`);
    }

    /* Kick attacks by kicking monsters are normal attacks, not special.
     * This is almost always worthless, since you can either take one turn
     * and do all your kicks, or else take one turn and attack the monster
     * normally, getting all your attacks _including_ all your kicks.
     * If you have >1 kick attack, you get all of them.
     */
    if (Upolyd(game.u) && attacktype(game.youmonst.data, ATTKS.AT_KICK)) {
        let uattk;
        let sum, kickdieroll, armorpenalty, specialdmg;
        const out = { attk_count: 0, role_roll_penalty: 0 };
        const tmp = await find_roll_to_hit(mon, ATTKS.AT_KICK, null, out);
        armorpenalty = out.role_roll_penalty;
        mon_maybe_unparalyze(mon);

        for (i = 0; i < NATTK; i++) {
            /* first of two kicks might have provoked counterattack
               that has incapacitated the hero (ie, floating eye) */
            if (game.multi < 0)
                break;

            uattk = game.youmonst.data.mattk[i];
            /* we only care about kicking attacks here */
            if (uattk[0] !== ATTKS.AT_KICK)
                continue;

            kickdieroll = rnd(20);
            specialdmg = special_dmgval(game.youmonst, mon, W_ARMF, null);
            if (mon.data === game.mons[PMNAMES.PM_SHADE] && !specialdmg) {
                /* doesn't matter whether it would have hit or missed,
                   and shades have no passive counterattack */
                await Your(`${kick_passes_thru} ${mon_nam(mon)}.`);
                break; /* skip any additional kicks */
            } else if (tmp > kickdieroll) {
                await You(`kick ${mon_nam(mon)}.`);
                sum = await damageum(mon, uattk, specialdmg);
                await passive(mon, game.u.uarmf, (sum !== M_ATTK_MISS),
                              !(sum & M_ATTK_DEF_DIED), ATTKS.AT_KICK, false);
                if ((sum & M_ATTK_DEF_DIED))
                    break; /* Defender died */
            } else {
                await missum(mon, uattk, (tmp + armorpenalty > kickdieroll));
                await passive(mon, game.u.uarmf, false, 1, ATTKS.AT_KICK, false);
            }
        }
        return;
    }

    i = -inv_weight();
    j = weight_cap();

    /* What the following confusing if statements mean:
     * If you are over 70% of carrying capacity, you go through a "deal no
     * damage" check, and if that fails, a "clumsy kick" check.
     * At this % of carrycap | Chance of no damage | Chance of clumsiness
     *             [70%-80%) |                 1/4 |                  1/3
     *             [80%-90%) |                 1/3 |                  1/2
     *            [90%-100%) |                 1/2 |                   1
     */
    if (i < Math.trunc((j * 3) / 10)) {
        if (!rn2((i < Math.trunc(j / 10)) ? 2 : (i < Math.trunc(j / 5)) ? 3 : 4)) {
            if (martial())
                doit = true;
            else {
                await Your('clumsy kick does no damage.');
                await passive(mon, game.u.uarmf, false, 1, ATTKS.AT_KICK, false);
                return;
            }
        }
        if (!doit) {
            if (i < Math.trunc(j / 10))
                clumsy = true;
            else if (!rn2((i < Math.trunc(j / 5)) ? 2 : 3))
                clumsy = true;
        }
    }

    if (!doit) {
        if (Fumbling())
            clumsy = true;

        else if (game.u.uarm && game.objects[game.u.uarm.otyp].oc_bulky && ACURR(A_DEX) < rnd(25))
            clumsy = true;
    }
 /* doit: */
    await You(`kick ${mon_nam(mon)}.`);
    if (!rn2(clumsy ? 3 : 4) && (clumsy || !bigmonst(mon.data))
        && mon.mcansee && !mon.mtrapped && !thick_skinned(mon.data)
        && mon.data.mlet !== MONSYMS.S_EEL && haseyes(mon.data) && mon.mcanmove
        && !mon.mstun && !mon.mconf && !mon.msleeping
        && mon.data.mmove >= 12) {
        if (!nohands(mon.data) && !rn2(martial() ? 5 : 3)) {
            await pline(`${Monnam(mon)} blocks your ${clumsy ? 'clumsy ' : ''}kick.`);
            await passive(mon, game.u.uarmf, false, 1, ATTKS.AT_KICK, false);
            return;
        } else {
            await maybe_mnexto(mon);
            if (mon.mx !== x || mon.my !== y) {
                unmap_invisible(x, y);
                await pline(`${Monnam(mon)} ${
                    (can_teleport(mon.data) && !noteleport_level(mon))
                        ? 'teleports'
                        : is_floater(mon.data)
                              ? 'floats'
                              : is_flyer(mon.data) ? 'swoops'
                                                   : (nolimbs(mon.data)
                                                      || slithy(mon.data))
                                                         ? 'slides'
                                                         : 'jumps'}, ${
                    clumsy ? 'easily' : 'nimbly'} evading your ${clumsy ? 'clumsy ' : ''}kick.`);
                await passive(mon, game.u.uarmf, false, 1, ATTKS.AT_KICK, false);
                return;
            }
        }
    }
    await kickdmg(mon, clumsy);
}

// src/dokick.c:295 ghitm(); gold hits a monster.  Return TRUE if caught
// (the gold taken care of), FALSE otherwise.  The gold object is *not*
// attached to the fobj chain!
async function ghitm(mtmp, gold) {
    let msg_given = false;

    if (!likes_gold(mtmp.data) && !mtmp.isshk && !mtmp.ispriest
        && !mtmp.isgd && !is_mercenary(mtmp.data)) {
        await wakeup(mtmp, true);
    } else if (!mtmp.mcanmove) {
        /* too light to do real damage */
        if (canseemon(mtmp)) {
            await pline_The(`${xname(gold)} harmlessly ${otense(gold, 'hit')} ${mon_nam(mtmp)}.`);
            msg_given = true;
        }
    } else {
        const was_sleeping = mtmp.msleeping;
        let umoney;
        const value = gold.quan * game.objects[gold.otyp].oc_cost;

        mtmp.msleeping = 0; /* end indeterminate sleep (won't get here
                             * for temporary--counted--sleep since that
                             * uses mfrozen and mfrozen implies !mcanmove) */
        finish_meating(mtmp);
        if (!mtmp.isgd && !rn2(4)) /* not always pleasing */
            await setmangry(mtmp, true);
        /* greedy monsters catch gold */
        if (cansee(mtmp.mx, mtmp.my))
            await pline(`${Monnam(mtmp)} ${was_sleeping ? 'awakens and ' : ''}catches the gold.`);
        await mpickobj(mtmp, gold);
        gold = null; /* obj has been freed */
        if (mtmp.isshk) {
            let robbed = mtmp.eshk.robbed;

            if (robbed) {
                robbed -= value;
                if (robbed < 0)
                    robbed = 0;
                await pline_The(`amount ${!robbed ? '' : 'partially '}covers ${mhis(mtmp)} recent losses.`);
                mtmp.eshk.robbed = robbed;
                if (!robbed)
                    await make_happy_shk(mtmp, false);
            } else {
                /* SetVoice(mtmp, 0, 80, 0); */
                if (mtmp.mpeaceful) {
                    mtmp.eshk.credit += value;
                    await You(`have ${mtmp.eshk.credit} ${currency(mtmp.eshk.credit)} in credit.`);
                } else
                    await verbalize('Thanks, scum!');
            }
        } else if (mtmp.ispriest) {
            /* SetVoice(mtmp, 0, 80, 0); */
            if (mtmp.mpeaceful)
                await verbalize('Thank you for your contribution.');
            else
                await verbalize('Thanks, scum!');
        } else if (mtmp.isgd) {
            umoney = money_cnt(game.invent);
            /* Some of these are iffy, because a hostile guard
               won't become peaceful and resume leading hero
               out of the vault.  If he did do that, player
               could try fighting, then weasel out of being
               killed by throwing his/her gold when losing. */
            /* SetVoice(mtmp, 0, 80, 0); */
            await verbalize(umoney ? 'Drop the rest and follow me.'
                            : hidden_gold(true)
                              ? 'You still have hidden gold.  Drop it now.'
                              : mtmp.mpeaceful
                                ? "I'll take care of that; please move along."
                                : "I'll take that; now get moving.");
        } else if (is_mercenary(mtmp.data)) {
            const was_angry = !mtmp.mpeaceful;
            let goldreqd = 0;

            if (mtmp.data === game.mons[PMNAMES.PM_SOLDIER])
                goldreqd = 100;
            else if (mtmp.data === game.mons[PMNAMES.PM_SERGEANT])
                goldreqd = 250;
            else if (mtmp.data === game.mons[PMNAMES.PM_LIEUTENANT])
                goldreqd = 500;
            else if (mtmp.data === game.mons[PMNAMES.PM_CAPTAIN])
                goldreqd = 750;

            if (goldreqd && rn2(3)) {
                umoney = money_cnt(game.invent);
                goldreqd += Math.trunc((umoney + game.u.ulevel * rn2(5)) / ACURR(A_CHA));
                if (value > goldreqd)
                    mtmp.mpeaceful = true;
            }

            if (!mtmp.mpeaceful) {
                /* SetVoice(mtmp, 0, 80, 0); */
                if (goldreqd)
                    await verbalize("That's not enough, coward!");
                else /* unbribable (watchman) */
                    await verbalize("I don't take bribes from scum like you!");
            } else if (was_angry) {
                /* SetVoice(mtmp, 0, 80, 0); */
                await verbalize('That should do.  Now beat it!');
            } else {
                /* SetVoice(mtmp, 0, 80, 0); */
                await verbalize(`Thanks for the tip, ${game.flags.female ? 'lady' : 'buddy'}.`);
            }
        }
        return true;
    }

    if (!msg_given)
        await miss(xname(gold), mtmp);
    return false;
}

// src/dokick.c:508 really_kick_object(), through the common immovable-object
// path. This covers ordinary floor stacks whose next square is blocked, while
// retaining the range and break-test draws that happen before the "Thump!".
// src/dokick.c:489 kick_object(); kick the top object of the pile at <x,y>;
// kickobjnam = { v } receives the object's killer name (matters iff res==0)
async function kick_object(x, y, kickobjnam) {
    let res = 0;

    kickobjnam.v = '';
    /* if a pile, the "top" object gets kicked */
    game.kickedobj = (game.level.objects || []).find(o => o.where === OBJ_FLOOR && o.ox === x && o.oy === y) || null;
    if (game.kickedobj) {
        /* formatted object name matters iff res==0 */
        kickobjnam.v = killer_xname(game.kickedobj);
        /* kick object; if fatal, done() will clean up kickedobj */
        res = await really_kick_object(x, y);
        game.kickedobj = null;
    }
    return res;
}

// src/dokick.c:508 really_kick_object(); guts of kick_object
async function really_kick_object(x, y) {
    let range;
    let mon, shkp = null;
    let trap;
    let bhitroom;
    let costly, isgold, slide = false;

    /* gk.kickedobj should always be set due to conditions of call */
    if (!game.kickedobj || game.kickedobj.otyp === ONAMES.BOULDER
        || game.kickedobj === game.u.uball || game.kickedobj === game.u.uchain)
        return 0;

    if ((trap = t_at(x, y)) != null) {
        if ((is_pit(trap.ttyp) && !Passes_walls()) || trap.ttyp === WEB) {
            if (!trap.tseen)
                await find_trap(trap);
            await You_cant(`kick ${something} that's in a ${
                Hallucination() ? 'tizzy'
                    : (trap.ttyp === WEB) ? 'web'
                        : 'pit'}!`);
            return 1;
        }
        if (trap.ttyp === STATUE_TRAP) {
            await activate_statue_trap(trap, x, y, false);
            return 1;
        }
    }

    if (Fumbling() && !rn2(3)) {
        await Your('clumsy kick missed.');
        return 1;
    }

    if (!game.u.uarmf && game.kickedobj.otyp === ONAMES.CORPSE
        && touch_petrifies(game.mons[game.kickedobj.corpsenm])
        && !Stone_resistance()) {
        await You(`kick ${corpse_xname(game.kickedobj, null, CXN_PFX_THE)} with your bare ${
            makeplural(body_part(FOOT))}.`);
        if (poly_when_stoned(game.youmonst.data) && await polymon(PMNAMES.PM_STONE_GOLEM)) {
            ; /* hero has been transformed but kick continues */
        } else {
            /* normalize body shape here; foot, not body_part(FOOT) */
            (game.killer ||= {}).name = `kicking ${killer_xname(game.kickedobj)} barefoot`;
            await instapetrify(game.killer.name);
        }
    }

    isgold = (game.kickedobj.oclass === OCLASSES.COIN_CLASS);
    {
        let k_owt = game.kickedobj.owt;

        /* for non-gold stack, 1 item will be split off below (unless an
           early return occurs, so we aren't moving the split to here);
           calculate the range for that 1 rather than for the whole stack */
        if (game.kickedobj.quan > 1 && !isgold) {
            const save_quan = game.kickedobj.quan;

            game.kickedobj.quan = 1;
            k_owt = weight(game.kickedobj);
            game.kickedobj.quan = save_quan;
        }

        /* range < 2 means the object will not move
           (maybe dexterity should also figure here) */
        range = Math.trunc(acurrstr() / 2) - Math.trunc(k_owt / 40);
    }

    if (martial())
        range += rnd(3);

    if (is_pool(x, y)) {
        /* you're in the water too; significantly reduce range */
        range = Math.trunc(range / 3) + 1; /* {1,2}=>1, {3,4,5}=>2, {6,7,8}=>3 */
    } else if (Is_airlevel(game.u.uz) || Is_waterlevel(game.u.uz)) {
        /* you're in air, since is_pool did not match */
        range += rnd(3);
    } else {
        if (is_ice(x, y))
            range += rnd(3), slide = true;
        if (game.kickedobj.greased)
            range += rnd(3), slide = true;
    }

    /* Mjollnir is magically too heavy to kick */
    if (is_art(game.kickedobj, ART_MJOLLNIR))
        range = 1;

    /* see if the object has a place to move into */
    if (!isok(x + game.u.dx, y + game.u.dy)
        || !ZAP_POS(game.level.at(x + game.u.dx, y + game.u.dy).typ)
        || closed_door(x + game.u.dx, y + game.u.dy))
        range = 1;

    /* 5.0: this used to skip 'costly' handling if kickedobj->no_charge
       was set but that optimization could result in no_charge staying set
       for objects kicked out of the shop */
    shkp = find_objowner(game.kickedobj, x, y);
    costly = (shkp && (costly_spot(x, y) || (costly_adjacent(shkp, x, y)
                                             && game.kickedobj.unpaid)));
    /* 5.0: give feedback about the item being kicked; some follow-on
       messages refer to "it" */
    await Norep(`You kick ${
        !isgold ? singular(game.kickedobj, doname) : doname(game.kickedobj)}.`);

    if (IS_OBSTRUCTED(game.level.at(x, y).typ) || closed_door(x, y)) {
        if ((!martial() && rn2(20) > ACURR(A_DEX))
            || IS_OBSTRUCTED(game.level.at(game.u.ux, game.u.uy).typ) || closed_door(game.u.ux, game.u.uy)) {
            if (Blind())
                await pline("It doesn't come loose.");
            else
                await pline(`${The(distant_name(game.kickedobj, xname))} ${
                    otense(game.kickedobj, 'do')}n't come loose.`);
            return (!rn2(3) || martial()) ? 1 : 0;
        }
        if (Blind())
            await pline('It comes loose.');
        else
            await pline(`${The(distant_name(game.kickedobj, xname))} ${
                otense(game.kickedobj, 'come')} loose.`);
        obj_extract_self(game.kickedobj);
        newsym(x, y);
        if (costly && (!costly_spot(game.u.ux, game.u.uy)
                       || !(game.u.urooms || '').includes(in_rooms(x, y, SHOPBASE)[0] || '\0'))) {
            if (!game.kickedobj.no_charge)
                await addtobill(game.kickedobj, false, false, false);
            else /* don't leave no_charge set when outside shop */
                game.kickedobj.no_charge = 0;
        }
        if (!(await flooreffects(game.kickedobj, game.u.ux, game.u.uy, 'fall'))) {
            place_object(game.kickedobj, game.u.ux, game.u.uy);
            impact_disturbs_zombies(game.kickedobj, true);
            stackobj(game.kickedobj);
            newsym(game.u.ux, game.u.uy);
        }
        return 1;
    }

    /* a box gets a chance of breaking open here */
    if (Is_box(game.kickedobj)) {
        const otrp = game.kickedobj.otrapped;

        if (range < 2)
            await pline('THUD!');
        await container_impact_dmg(game.kickedobj, x, y);
        if (game.kickedobj.olocked) {
            if (!rn2(5) || (martial() && !rn2(2))) {
                await You('break open the lock!');
                await breakchestlock(game.kickedobj, false);
                if (otrp)
                    await chest_trap(game.kickedobj, LEG, false);
                return 1;
            }
        } else {
            if (!rn2(3) || (martial() && !rn2(2))) {
                await pline_The('lid slams open, then falls shut.');
                game.kickedobj.lknown = 1;
                if (otrp)
                    await chest_trap(game.kickedobj, LEG, false);
                return 1;
            }
        }
        if (range < 2)
            return 1;
        /* else let it fall through to the next cases... */
    }

    /* fragile objects should not be kicked */
    if (await hero_breaks(game.kickedobj, game.kickedobj.ox, game.kickedobj.oy, 0))
        return 1;

    /* too heavy to move.  range is calculated as potential distance from
     * player, so range == 2 means the object may move up to one square
     * from its current position
     */
    if (range < 2) {
        if (!Is_box(game.kickedobj))
            await pline('Thump!');
        return (!rn2(3) || martial()) ? 1 : 0;
    }

    if (game.kickedobj.quan > 1) {
        if (!isgold) {
            game.kickedobj = splitobj(game.kickedobj, 1);
        } else {
            if (rn2(20)) {
                const flyingcoinmsg = [
                    'scatter the coins', 'knock coins all over the place',
                    'send coins flying in all directions',
                ];

                if (!Deaf())
                    await pline('Thwwpingg!');
                await You(`${ROLL_FROM(flyingcoinmsg)}!`);
                await scatter(x, y, rnd(3), VIS_EFFECTS | MAY_HIT,
                              game.kickedobj);
                newsym(x, y);
                return 1;
            }
            if (game.kickedobj.quan > 300) {
                await pline('Thump!');
                return (!rn2(3) || martial()) ? 1 : 0;
            }
        }
    }

    if (slide && !Blind())
        await pline(`Whee!  ${Doname2(game.kickedobj)} ${
            otense(game.kickedobj, 'slide')} across the ${surface(x, y)}.`);

    obj_extract_self(game.kickedobj);
    snuff_candle(game.kickedobj);
    newsym(x, y);
    const pobj = { obj: game.kickedobj };
    mon = await bhit(game.u.dx, game.u.dy, range, KICKED_WEAPON,
                     null, null, pobj);
    game.kickedobj = pobj.obj;
    if (!game.kickedobj)
        return 1; /* object broken */

    if (mon) {
        if (mon.isshk && game.kickedobj.where === OBJ_MINVENT
            && game.kickedobj.ocarry === mon)
            return 1; /* alert shk caught it */
        game.notonhead = (mon.mx !== game.bhitpos.x || mon.my !== game.bhitpos.y);
        if (isgold ? await ghitm(mon, game.kickedobj)      /* caught? */
                   : await thitmonst(mon, game.kickedobj)) /* hit && used up? */
            return 1;
    }

    /* the object might have fallen down a hole;
       ship_object() will have taken care of shop billing */
    if (game.kickedobj.where === OBJ_MIGRATING)
        return 1;

    bhitroom = in_rooms(game.bhitpos.x, game.bhitpos.y, SHOPBASE)[0] || '';
    /* if obj is marked no_charge, stolen_value() won't blame hero for
       theft but will clear that flag */
    if (costly && (!costly_spot(game.bhitpos.x, game.bhitpos.y)
                   || (in_rooms(x, y, SHOPBASE)[0] || '') !== bhitroom)) {
        /* kicked from inside shop to somewhere outside shop */
        if (isgold)
            await costly_gold(x, y, game.kickedobj.quan, false);
        else
            await stolen_value(game.kickedobj, x, y, !!shkp.mpeaceful,
                               false);
        costly = false; /* already billed */
    }

    if (await flooreffects(game.kickedobj, game.bhitpos.x, game.bhitpos.y, 'fall'))
        return 1;
    if (costly) {
        let gtg = 0;

        /* costly + landed outside shop handled above; must be inside shop */
        if (game.kickedobj.unpaid)
            subfrombill(game.kickedobj, shkp);

        /* if billed for contained gold during kick, get a refund now */
        if (Has_contents(game.kickedobj)
            && (gtg = contained_gold(game.kickedobj, true)) > 0)
            await donate_gold(gtg, shkp, false);
    }
    place_object(game.kickedobj, game.bhitpos.x, game.bhitpos.y);
    impact_disturbs_zombies(game.kickedobj, true);
    stackobj(game.kickedobj);
    newsym(game.kickedobj.ox, game.kickedobj.oy);
    return 1;
}

// src/dokick.c:1257 dokick() — the '^D' command.
//
// The refusal chain comes first and each arm ends the command after a
// --More--; only then is a direction read. What is ported is the chain, the
// direction, the swallowed and Levitation arms, and the monster kick; kicking
// objects, doors and terrain is recorded.
export async function dokick() {
    let x, y;
    let avrg_attrib;
    let glyph, oldglyph = null, oldcell = null;
    let mtmp;
    let no_kick = false;

    if (nolimbs(game.youmonst.data) || slithy(game.youmonst.data)) {
        await You('have no legs to kick with.');
        no_kick = true;
    } else if (verysmall(game.youmonst.data)) {
        await You('are too small to do any kicking.');
        no_kick = true;
    } else if (game.u.usteed) {
        const { tty_yn_function } = await import('./tty/topl.js');
        if ((await tty_yn_function('Kick your steed?', 'yn', 'y')) === 'y') {
            await You(`kick ${mon_nam(game.u.usteed)}.`);
            await kick_steed();
            return ECMD_TIME;
        } else {
            return ECMD_OK;
        }
    } else if (Wounded_legs()) {
        await legs_in_no_shape('kicking', false);
        no_kick = true;
    } else if (near_capacity() > SLT_ENCUMBER) {
        await Your('load is too heavy to balance yourself for a kick.');
        no_kick = true;
    } else if (game.youmonst.data.mlet === MONSYMS.S_LIZARD) {
        await Your('legs cannot kick effectively.');
        no_kick = true;
    } else if (game.u.uinwater && !rn2(2)) {
        await Your("slow motion kick doesn't hit anything.");
        no_kick = true;
    } else if (game.u.utrap) {
        no_kick = true;
        switch (game.u.utraptype) {
        case TT_PIT:
            if (!Passes_walls())
                await pline("There's not enough room to kick down here.");
            else
                no_kick = false;
            break;
        case TT_WEB:
        case TT_BEARTRAP:
            await You_cant(`move your ${body_part(LEG)}!`);
            break;
        default:
            break;
        }
    } else if (sobj_at(ONAMES.BOULDER, game.u.ux, game.u.uy) && !Passes_walls()) {
        await pline("There's not enough room to kick in here.");
        no_kick = true;
    }

    if (no_kick) {
        /* ignore direction typed before player notices kick failed */
        await display_nhwindow_message(); /* --More-- */
        return ECMD_FAIL;
    }

    if (!(await getdir(null)))
        return ECMD_CANCEL;
    if (!game.u.dx && !game.u.dy)
        return ECMD_CANCEL;

    x = game.u.ux + game.u.dx;
    y = game.u.uy + game.u.dy;
    game.kickedloc = { x, y };

    /* KMH -- Kicking boots always succeed */
    if (game.u.uarmf && game.u.uarmf.otyp === ONAMES.KICKING_BOOTS)
        avrg_attrib = 99;
    else
        avrg_attrib = Math.trunc((acurrstr() + ACURR(A_DEX) + ACURR(A_CON)) / 3);

    if (game.u.uswallow) {
        switch (rn2(3)) {
        case 0:
            await You_cant(`move your ${body_part(LEG)}!`);
            break;
        case 1:
            if (digests(game.u.ustuck.data)) {
                await pline(`${Monnam(game.u.ustuck)} burps loudly.`);
                break;
            }
            /*FALLTHRU*/
        default:
            await Your('feeble kick has no effect.');
            break;
        }
        return ECMD_TIME;
    } else if (game.u.utrap && game.u.utraptype === TT_PIT) {
        /* must be Passes_walls */
        await You('kick at the side of the pit.');
        return ECMD_TIME;
    }
    if (Levitation()) {
        let xx, yy;

        xx = game.u.ux - game.u.dx;
        yy = game.u.uy - game.u.dy;
        /* doors can be opened while levitating, so they must be
         * reachable for bracing purposes
         * Possible extension: allow bracing against stuff on the side?
         */
        if (isok(xx, yy) && !IS_OBSTRUCTED(game.level.at(xx, yy).typ)
            && !IS_DOOR(game.level.at(xx, yy).typ)
            && (!Is_airlevel(game.u.uz) || !OBJ_AT(xx, yy))) {
            await You('have nothing to brace yourself against.');
            return ECMD_OK;
        }
    }

    mtmp = isok(x, y) ? m_at(x, y) : null;
    /* might not kick monster if it is hidden and becomes revealed,
       if it is peaceful and player declines to attack, or if the
       hero passes out due to encumbrance with low hp; svc.context.move
       will be 1 unless player declines to kick peaceful monster */
    if (mtmp) {
        oldglyph = glyph_at(x, y);
        {
            const loc = game.level.at(x, y);
            oldcell = { ch: loc.disp_ch, color: loc.disp_color, dec: loc.disp_decgfx,
                        attr: loc.disp_attr, glyph: loc.disp_glyph };
        }
        if (!(await maybe_kick_monster(mtmp, x, y)))
            return (game.context.move ? ECMD_TIME : ECMD_OK);
    }

    await wake_nearby(false);
    u_wipe_engr(2);

    if (!isok(x, y)) {
        game.maploc = nowhere;
        await kick_ouch(x, y, '');
        return ECMD_TIME;
    }
    game.maploc = game.level.at(x, y);

    /*
     * The next five tests should stay in their present order:
     * monsters, pools, objects, non-doors, doors.
     *
     * [FIXME:  Monsters who are hidden underneath objects or
     * in pools should lead to hero kicking the concealment
     * rather than the monster, probably exposing the hidden
     * monster in the process.  And monsters who are hidden on
     * ceiling shouldn't be kickable (unless hero is flying?);
     * kicking toward them should just target whatever is on
     * the floor at that spot.]
     */

    if (mtmp) {
        /* save mtmp->data (for recoil) in case mtmp gets killed */
        const mdat = mtmp.data;

        await kick_monster(mtmp, x, y);
        glyph = glyph_at(x, y);
        /* see comment in attack_checks() */
        if (DEADMONSTER(mtmp)) { /* DEADMONSTER() */
            /* if we mapped an invisible monster and immediately
               killed it, we don't want to forget what we thought
               was there before the kick */
            if (!same_glyph(glyph, oldglyph) && glyph_is_invisible_at(x, y))
                show_glyph_cell(x, y, oldcell.ch, oldcell.color, oldcell.dec,
                                oldcell.attr, oldcell.glyph); /* show_glyph(x, y, oldglyph) */
        } else if (!canspotmon(mtmp)
                   /* check <x,y>; monster that evades kick by jumping
                      to an unseen square doesn't leave an I behind */
                   && mtmp.mx === x && mtmp.my === y
                   && !glyph_is_invisible_at(x, y)
                   && !engulfing_u(mtmp)) {
            map_invisible(x, y);
        }
        /* recoil if floating */
        if ((Is_airlevel(game.u.uz) || Levitation()) && game.context.move) {
            let range;

            range =
                (game.youmonst.data.cwt + (weight_cap() + inv_weight()));
            if (range < 1)
                range = 1; /* divide by zero avoidance */
            range = Math.trunc((3 * mdat.cwt) / range);

            if (range < 1)
                range = 1;
            await hurtle(-game.u.dx, -game.u.dy, range, true);
        }
        return ECMD_TIME;
    }
    unmap_invisible(x, y);
    if ((is_pool(x, y) || game.maploc.typ === LAVAWALL) !== !!game.u.uinwater) {
        /* objects normally can't be removed from water by kicking */
        await You(`splash some ${hliquid(is_pool(x, y) ? 'water' : 'lava')} around.`);
        /* pretend the kick is fast enough for lava not to burn */
        return ECMD_TIME;
    }

    if (OBJ_AT(x, y) && (!Levitation() || Is_airlevel(game.u.uz)
                         || Is_waterlevel(game.u.uz) || sobj_at(ONAMES.BOULDER, x, y))) {
        const kickobjnam = { v: '' };

        if (await kick_object(x, y, kickobjnam)) {
            if (Is_airlevel(game.u.uz))
                await hurtle(-game.u.dx, -game.u.dy, 1, true); /* assume it's light */
            return ECMD_TIME;
        }
        await kick_ouch(x, y, kickobjnam.v);
        return ECMD_TIME;
    }

    if (IS_DOOR(game.maploc.typ))
        await kick_door(x, y, avrg_attrib);
    else
        return await kick_nondoor(x, y, avrg_attrib);
    return ECMD_TIME;
}

// src/dokick.c:794 kickstr(); cause of death if kicking kills kicker
function kickstr(kickobjnam) {
    let what;

    if (kickobjnam)
        what = kickobjnam;
    else if (game.maploc === nowhere)
        what = 'nothing';
    else if (IS_DOOR(game.maploc.typ))
        what = 'a door';
    else if (IS_TREE(game.maploc.typ))
        what = 'a tree';
    else if (IS_STWALL(game.maploc.typ))
        what = 'a wall';
    else if (IS_OBSTRUCTED(game.maploc.typ))
        what = 'a rock';
    else if (IS_THRONE(game.maploc.typ))
        what = 'a throne';
    else if (IS_FOUNTAIN(game.maploc.typ))
        what = 'a fountain';
    else if (IS_GRAVE(game.maploc.typ))
        what = 'a headstone';
    else if (IS_SINK(game.maploc.typ))
        what = 'a sink';
    else if (IS_ALTAR(game.maploc.typ))
        what = 'an altar';
    else if (IS_DRAWBRIDGE(game.maploc.typ))
        what = 'a drawbridge';
    else if (game.maploc.typ === STAIRS)
        what = 'the stairs';
    else if (game.maploc.typ === LADDER)
        what = 'a ladder';
    else if (game.maploc.typ === IRONBARS)
        what = 'an iron bar';
    else
        what = 'something weird';
    return 'kicking ' + what;
}

// src/dokick.c:834 watchman_thief_arrest(); get_iter_mons() callback
async function watchman_thief_arrest(mtmp) {
    if (is_watch(mtmp.data) && couldsee(mtmp.mx, mtmp.my)
        && mtmp.mpeaceful) {
        await mon_yells(mtmp, "Halt, thief!  You're under arrest!");
        await angry_guards(false);
        return true;
    }
    return false;
}

// src/dokick.c:846 watchman_door_damage(); get_iter_mons_xy() callback
async function watchman_door_damage(mtmp, x, y) {
    if (is_watch(mtmp.data) && mtmp.mpeaceful
        && couldsee(mtmp.mx, mtmp.my)) {
        if (game.level.at(x, y).looted & D_WARNED) {
            await mon_yells(mtmp,
                            "Halt, vandal!  You're under arrest!");
            await angry_guards(false);
        } else {
            await mon_yells(mtmp, 'Hey, stop damaging that door!');
            game.level.at(x, y).looted |= D_WARNED;
        }
        return true;
    }
    return false;
}

// src/dokick.c:881 kick_ouch(); the kick hurt the hero, not the target
async function kick_ouch(x, y, kickobjnam) {
    let dmg;

    await pline('Ouch!  That hurts!');
    exercise(A_DEX, false);
    exercise(A_STR, false);
    if (isok(x, y)) {
        if (Blind())
            feel_location(x, y); /* we know we hit it */
        if (is_drawbridge_wall(x, y) >= 0) {
            await pline_The('drawbridge is unaffected.');
            /* update maploc to refer to the drawbridge */
            const cc = { x, y };
            find_drawbridge(cc);
            game.maploc = game.level.at(cc.x, cc.y);
        }
        await wake_nearto(x, y, 5 * 5);
    }
    if (!rn2(3))
        await set_wounded_legs(RIGHT_SIDE, 5 + rnd(5));
    dmg = rnd(ACURR(A_CON) > 15 ? 3 : 5);
    await losehp(Maybe_Half_Phys(dmg), kickstr(kickobjnam), KILLED_BY);
    if (Is_airlevel(game.u.uz) || Levitation())
        await hurtle(-game.u.dx, -game.u.dy, rn1(2, 4), true); /* assume it's heavy */
}

// src/dokick.c:890 kick_dumb() — kicking a doorway with nothing in it.
async function kick_dumb(x, y) {
    exercise(A_DEX, false);
    if (martial() || ACURR(A_DEX) >= 16 || rn2(3)) {
        await You('kick at empty space.');
        if (Blind())
            feel_location(x, y);
    } else {
        await pline('Dumb move!  You strain a muscle.');
        exercise(A_STR, false);
        await set_wounded_legs(RIGHT_SIDE, 5 + rnd(5));
    }
    if ((Is_airlevel(game.u.uz) || Levitation()) && rn2(2))
        await hurtle(-game.u.dx, -game.u.dy, 1, true);
}

// src/dokick.c:910 kick_door() — kick a door.
async function kick_door(x, y, avrg_attrib) {
    let doorbuster;

    if (game.maploc.doormask === D_ISOPEN || game.maploc.doormask === D_BROKEN
        || game.maploc.doormask === D_NODOOR) {
        await kick_dumb(x, y);
        return; /* uses a turn */
    }

    /* not enough leverage to kick open doors while levitating */
    if (Levitation()) {
        await kick_ouch(x, y, '');
        return;
    }

    exercise(A_DEX, true);
    doorbuster = Upolyd(game.u) && is_giant(game.youmonst.data);
    /* door is known to be CLOSED or LOCKED */
    if (doorbuster
        || (rnl(35) < avrg_attrib + (!martial() ? 0 : ACURR(A_DEX)))) {
        const shopdoor = in_rooms(x, y, SHOPBASE).length ? true : false;

        /* break the door */
        if (game.maploc.doormask & D_TRAPPED) {
            if (game.flags.verbose)
                await You('kick the door.');
            exercise(A_STR, false);
            game.maploc.doormask = D_NODOOR;
            await b_trapped('door', FOOT);
        } else if (ACURR(A_STR) > 18 && !rn2(5) && !shopdoor) {
            /* Soundeffect(se_kick_door_it_shatters, 50); */
            await pline('As you kick the door, it shatters to pieces!');
            exercise(A_STR, true);
            game.maploc.doormask = D_NODOOR;
        } else {
            /* Soundeffect(se_kick_door_it_crashes_open, 50); */
            await pline('As you kick the door, it crashes open!');
            exercise(A_STR, true);
            game.maploc.doormask = D_BROKEN;
        }
        feel_newsym(x, y); /* we know we broke it */
        recalc_block_point(x, y); /* vision */
        if (shopdoor) {
            add_damage(x, y, SHOP_DOOR_COST);
            await pay_for_damage('break', false);
        }
        if (in_town(x, y))
            await get_iter_mons(watchman_thief_arrest);
    } else {
        if (Blind())
            feel_location(x, y); /* we know we hit it */
        exercise(A_STR, true);
        /* note: this used to be unconditional "WHAMMM!!!" but that has a
           fairly strong connotation of noise that a deaf hero shouldn't
           hear; we've kept the extra 'm's and one of the extra '!'s */
        await pline(`${(Deaf() || !rn2(3)) ? 'Thwack' : 'Whammm'}!!`);
        if (in_town(x, y))
            await get_iter_mons_xy(watchman_door_damage, x, y);
    }
}

// src/dokick.c:974 kick_nondoor() — every terrain arm that is not a door.
// Unreachable machinery is recorded at the exact C call position; every
// draw C makes before such a point is made here too.
async function kick_nondoor(x, y, avrg_attrib) {
    if (game.maploc.typ === SDOOR) {
        if (!Levitation() && rn2(30) < avrg_attrib) {
            cvt_sdoor_to_door(game.maploc); /* ->typ = DOOR */
            /* Soundeffect(se_crash_door, 40); */
            await pline(`Crash!  ${
                  /* don't "kick open" when it's locked
                     unless it also happens to be trapped */
                  ((game.maploc.doormask & (D_LOCKED | D_TRAPPED))
                   === D_LOCKED) ? 'Your kick uncovers' : 'You kick open'} a secret door!`);
            exercise(A_DEX, true);
            if (game.maploc.doormask & D_TRAPPED) {
                game.maploc.doormask = D_NODOOR;
                await b_trapped('door', FOOT);
            } else if (game.maploc.doormask !== D_NODOOR
                       && !(game.maploc.doormask & D_LOCKED))
                game.maploc.doormask = D_ISOPEN;
            feel_newsym(x, y); /* we know it's gone */
            if (game.maploc.doormask === D_ISOPEN
                || game.maploc.doormask === D_NODOOR)
                unblock_point(x, y); /* vision */
            return ECMD_TIME;
        } else {
            await kick_ouch(x, y, '');
            return ECMD_TIME;
        }
    }
    if (game.maploc.typ === SCORR) {
        if (!Levitation() && rn2(30) < avrg_attrib) {
            /* Soundeffect(se_crash_door, 40); */
            await pline('Crash!  You kick open a secret passage!');
            exercise(A_DEX, true);
            game.maploc.typ = CORR;
            feel_newsym(x, y); /* we know it's gone */
            unblock_point(x, y); /* vision */
            return ECMD_TIME;
        } else {
            await kick_ouch(x, y, '');
            return ECMD_TIME;
        }
    }
    if (IS_THRONE(game.maploc.typ)) {
        let i;
        if (Levitation()) {
            await kick_dumb(x, y);
            return ECMD_TIME;
        }
        if ((Luck() < 0 || game.maploc.looted) && !rn2(3)) {
            game.maploc.looted = 0; /* don't leave loose ends.. */
            game.maploc.typ = ROOM;
            mkgold(rnd(200), x, y);
            /* Soundeffect(se_crash_throne_destroyed, 60); */
            if (Blind())
                await pline('CRASH!  You destroy it.');
            else {
                await pline('CRASH!  You destroy the throne.');
                newsym(x, y);
            }
            exercise(A_DEX, true);
            return ECMD_TIME;
        } else if (Luck() > 0 && !rn2(3) && !game.maploc.looted) {
            mkgold(rn1(201, 300), x, y);
            i = Luck() + 1;
            if (i > 6)
                i = 6;
            while (i--)
                mksobj_at(
                       rnd_class(ONAMES.DILITHIUM_CRYSTAL, ONAMES.LUCKSTONE - 1), x, y,
                       false, true);
            if (Blind())
                await You(`kick ${something} loose!`);
            else {
                await You('kick loose some ornamental coins and gems!');
                newsym(x, y);
            }
            /* prevent endless milking */
            game.maploc.looted = T_LOOTED;
            return ECMD_TIME;
        } else if (!rn2(4)) {
            if (dunlev(game.u.uz) < dunlevs_in_dungeon(game.u.uz)) {
                await fall_through(false, 0);
                return ECMD_TIME;
            } else {
                await kick_ouch(x, y, '');
                return ECMD_TIME;
            }
        }
        await kick_ouch(x, y, '');
        return ECMD_TIME;
    }
    if (IS_ALTAR(game.maploc.typ)) {
        if (Levitation()) {
            await kick_dumb(x, y);
            return ECMD_TIME;
        }
        await You(`kick ${(Blind() ? something : 'the altar')}.`);
        await altar_wrath(x, y);
        if (!rn2(3)) {
            await kick_ouch(x, y, '');
            return ECMD_TIME;
        }
        exercise(A_DEX, true);
        return ECMD_TIME;
    }
    if (IS_FOUNTAIN(game.maploc.typ)) {
        if (Levitation()) {
            await kick_dumb(x, y);
            return ECMD_TIME;
        }
        await You(`kick ${(Blind() ? something : 'the fountain')}.`);
        if (!rn2(3)) {
            await kick_ouch(x, y, '');
            return ECMD_TIME;
        }
        /* make metal boots rust */
        if (game.u.uarmf && rn2(3))
            if (await water_damage(game.u.uarmf, 'metal boots', true) === ER_NOTHING) {
                await Your('boots get wet.');
                /* could cause short-lived fumbling here */
            }
        exercise(A_DEX, true);
        return ECMD_TIME;
    }
    if (IS_GRAVE(game.maploc.typ)) {
        if (Levitation()) {
            await kick_dumb(x, y);
        } else if (rn2(4)) {
            /* minor injury */
            await kick_ouch(x, y, '');
        } else if (!game.maploc.disturbed && !rn2(2)) {
            /* disturb the grave: summon a ghoul (once only), same as
               when engraving */
            await disturb_grave(x, y);
        } else {
            /* destroy the headstone, implicitly destroying any
               not-yet-created contents (including zombie or mummy);
               any already created contents will still be buried here */
            exercise(A_WIS, false);
            if (Role_if(PMNAMES.PM_ARCHEOLOGIST) || Role_if(PMNAMES.PM_SAMURAI)
                || (game.u.ualign.type === A_LAWFUL && game.u.ualign.record > -10))
                await adjalign(-sgn(game.u.ualign.type));
            game.maploc.typ = ROOM;
            game.maploc.emptygrave = 0; /* clear 'flags' */
            game.maploc.disturbed = 0; /* clear 'horizontal' */
            mksobj_at(ONAMES.ROCK, x, y, true, false);
            del_engr_at(x, y);
            if (Blind()) {
                /* [feel this happen if Deaf?] */
                await pline(`Crack!  ${Something} broke!`);
            } else {
                await pline_The('headstone topples over and breaks!');
                newsym(x, y);
            }
        }
        return ECMD_TIME;
    }
    if (game.maploc.typ === IRONBARS) {
        await kick_ouch(x, y, '');
        return ECMD_TIME;
    }
    if (IS_TREE(game.maploc.typ)) {
        let treefruit;

        /* nothing, fruit or trouble? 75:23.5:1.5% */
        if (rn2(3)) {
            if (!rn2(6) && !(game.mvitals[PMNAMES.PM_KILLER_BEE].mvflags & G_GONE))
                await You_hear('a low buzzing.'); /* a warning */
            await kick_ouch(x, y, '');
            return ECMD_TIME;
        }
        if (rn2(15) && !(game.maploc.looted & TREE_LOOTED)
            && (treefruit = rnd_treefruit_at(x, y)) != null) {
            const nfruit = 8 - rnl(7);
            let nfall;
            const frtype = treefruit.otyp;

            treefruit.quan = nfruit;
            treefruit.owt = weight(treefruit);
            if (is_plural(treefruit))
                await pline(`Some ${xname(treefruit)} fall from the tree!`);
            else
                await pline(`${An(xname(treefruit))} falls from the tree!`);
            nfall = await scatter(x, y, 2, MAY_HIT, treefruit);
            if (nfall !== nfruit) {
                /* scatter left some in the tree, but treefruit
                 * may not refer to the correct object */
                treefruit = mksobj(frtype, true, false);
                treefruit.quan = nfruit - nfall;
                await pline(`${nfruit - nfall} ${xname(treefruit)} got caught in the branches.`);
                /* dealloc_obj(treefruit) */
            }
            exercise(A_DEX, true);
            exercise(A_WIS, true); /* discovered a new food source! */
            newsym(x, y);
            game.maploc.looted |= TREE_LOOTED;
            return ECMD_TIME;
        } else if (!(game.maploc.looted & TREE_SWARM)) {
            let cnt = rnl(4) + 2;
            let made = 0;
            const mm = { x, y };

            while (cnt--) {
                if (enexto(mm, mm.x, mm.y, game.mons[PMNAMES.PM_KILLER_BEE])
                    && await makemon(game.mons[PMNAMES.PM_KILLER_BEE], mm.x, mm.y,
                                     MM_ANGRY | MM_NOMSG))
                    made++;
            }
            if (made)
                await pline("You've attracted the tree's former occupants!");
            else
                await You('smell stale honey.');
            game.maploc.looted |= TREE_SWARM;
            return ECMD_TIME;
        }
        await kick_ouch(x, y, '');
        return ECMD_TIME;
    }
    if (IS_SINK(game.maploc.typ)) {
        const gend = poly_gender();

        if (Levitation()) {
            await kick_dumb(x, y);
            return ECMD_TIME;
        }
        if (rn2(5)) {
            /* Soundeffect(se_klunk_pipe, 60); */
            if (!Deaf())
                await pline('Klunk!  The pipes vibrate noisily.');
            else
                await pline('Klunk!');
            exercise(A_DEX, true);
            return ECMD_TIME;
        } else if (!(game.maploc.looted & S_LPUDDING) && !rn2(3)
                   && !(game.mvitals[PMNAMES.PM_BLACK_PUDDING].mvflags & G_GONE)) {
            /* Soundeffect(se_gushing_sound, 100); */
            if (Blind()) {
                if (!Deaf())
                    await You_hear('a gushing sound.');
            } else {
                await pline(`A ${hcolor(NH_BLACK)} ooze gushes up from the drain!`);
            }
            await makemon(game.mons[PMNAMES.PM_BLACK_PUDDING], x, y, MM_NOMSG);
            exercise(A_DEX, true);
            newsym(x, y);
            game.maploc.looted |= S_LPUDDING;
            return ECMD_TIME;
        } else if (!(game.maploc.looted & S_LDWASHER) && !rn2(3)
                   && !(game.mvitals[PMNAMES.PM_AMOROUS_DEMON].mvflags & G_GONE)) {
            /* can't resist... */
            await pline(`${(Blind() ? Something : 'The dish washer')} returns!`);
            if (await makemon(game.mons[PMNAMES.PM_AMOROUS_DEMON], x, y,
                              MM_NOMSG | ((gend === 1 || (gend === 2 && rn2(2)))
                                          ? MM_MALE : MM_FEMALE)))
                newsym(x, y);
            game.maploc.looted |= S_LDWASHER;
            exercise(A_DEX, true);
            return ECMD_TIME;
        } else if (!rn2(3)) {
            await sink_backs_up(x, y);
            return ECMD_TIME;
        }
        await kick_ouch(x, y, '');
        return ECMD_TIME;
    }
    if (game.maploc.typ === STAIRS || game.maploc.typ === LADDER
        || IS_STWALL(game.maploc.typ)) {
        if (!IS_STWALL(game.maploc.typ) && game.maploc.ladder === LA_DOWN) {
            await kick_dumb(x, y);
            return ECMD_TIME;
        }
        await kick_ouch(x, y, '');
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
