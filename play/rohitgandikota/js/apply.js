// apply.js — the 'a' command.
// C ref: src/apply.c

import { INTRINSIC } from './const.js';
import { Passes_walls } from './youprop.js';
import { boulder_hits_pool } from './do.js';
import { is_pool_or_lava } from './dbridge.js';
import { OBJ_INVENT, OBJ_MINVENT } from './const.js';
import { Wwalking } from './youprop.js';
import { humanoid, is_flyer, is_floater } from './mondata.js';
import { set_msg_xy } from './pline.js';
import { couldsee } from './vision.js';
import { get_obj_location } from './zap.js';
import { Shk_Your } from './shk.js';
import { verbalize } from './pline.js';
import { NO_MINVENT, TT_BURIEDBALL } from './const.js';
import { buried_ball_to_freedom } from './dig.js';
import { unpunish } from './read.js';
import { mkundead } from './mkroom.js';
import { openit, findit } from './detect.js';
import { use_crystal_ball } from './detect.js';
import { litroom } from './read.js';
import { uhim } from './mhitu.js';
import { nomul } from './hack.js';
import { bot } from './display.js';
import { explode } from './explode.js';
import { zappable, release_hold, zapsetup, zapwrapup, bhitm, bhitpile, bhito } from './zap.js';
import { setnotworn } from './worn.js';
import { check_unpaid, costly_alteration, pay_for_damage } from './shk.js';
import { safe_qbuf, ysimple_name } from './objnam.js';
import { paranoia_bits } from './options.js';
import { paranoid_query } from './cmd.js';
import { HEAD, PARANOID_BREAKWAND, COST_DSTROY, EXPL_MAGICAL, EXPL_FIERY, EXPL_FROSTY, N_DIRS, OBJ_AT } from './const.js';
import { objdescr_is } from './o_init.js';
import { retouch_object } from './artifact.js';
import { mhis } from './mhitu.js';
import { pline_mon } from './pline.js';
import { game } from './gstate.js';
import { ECMD_OK, ECMD_TIME, ECMD_CANCEL, CQ_CANNED, GETOBJ_NOFLAGS,
         nothing_happens, M_AP_TYPE, M_AP_NOTHING, M_AP_FURNITURE, M_AP_OBJECT,
         M_AP_MONSTER, ARTICLE_A, SUPPRESS_IT,
         SUPPRESS_INVISIBLE, nothing_seems_to_happen, IS_OBSTRUCTED, IS_TREE,
         Is_airlevel, Is_waterlevel, NOSE, NO_TRAP_FLAGS, RLOC_MSG,
         RLOC_NONE, RLOC_NOMSG, TIMEOUT, Upolyd, A_DEX, A_CON, A_CHA,
         MAX_SPELL_STUDY,
         SICK_ALL, SICK_NONVOMITABLE,
         NH_RED, plur, HOMEMADE_TIN, COLNO, FLASHED_LIGHT,
         STOMACH, DIGTYP_UNDIGGABLE, N_DIRS_Z, xdir, ydir,
         TT_WEB, TT_PIT, FOOT, NO_KILLER_PREFIX, XKILL_NOMSG,
         IS_WATERWALL, LAVAWALL }
    from './const.js';
import { addinv, addinv_nomerge, carrying, freeinv, getobj, hands_obj,
         hold_another_object, obj_extract_self, update_inventory, useup,
         useupall, useupf, weight, any_obj_ok, prinv, stackobj }
    from './invent.js';
import { getdir, get_adjacent_loc, cmdq_add_ec, cmdq_add_key, confdir, getlin }
    from './cmd.js';
import { pick_lock } from './lock.js';
import { is_pick, is_axe, delobj, m_at, mongone, seemimic, wake_nearby, wakeup,
         is_pool, is_lava, mnexto, see_monster_closeup, xkilled }
    from './mon.js';
import { is_pole } from './u_init.js';
import { ECMD_FAIL } from './const.js';
import { Blind, Fumbling, Glib, Hallucination, Deaf, Stone_resistance,
         Underwater, Levitation, Flying } from './youprop.js';
import { GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE,
         GETOBJ_EXCLUDE_INACCESS, GETOBJ_EXCLUDE_SELECTABLE,
         GETOBJ_PROMPT } from './invent.js';
import { OCLASSES, MATERIALS } from './objects_data.js';
import { mstatusline, ustatusline } from './insight.js';
import { Norep, You_cant, You_hear, You_see, pline_The } from './pline.js';
import { d, rn1, rn2, rnd, rnl } from './rng.js';
import { isok, ACCESSIBLE, IS_STWALL, IS_DOOR, D_ISOPEN, IRONBARS, ICE,
         MAX_OIL_IN_FLASK, BOLT_LIM, NON_PM } from './const.js';
import { walk_path } from './dothrow.js';
import { closed_door } from './cmd.js';
import { sobj_at } from './invent.js';
import { ONAMES } from './objects_data.js';
import { canseemon, canspotmon, glyph_is_invisible_at, map_invisible, newsym,
         pline, sensemon, unmap_invisible } from './display.js';
import { You, There, You_feel, Your } from './pline.js';
import { dist2, distu, s_suffix } from './hacklib.js';
import { cansee } from './vision.js';
import { wield_tool, welded } from './wield.js';
import { body_part, mbodypart } from './polyself.js';
import { FACE, FINGER, HAND } from './const.js';
import { OBJ_NAME, The, Tobjnam, Yname2, Yobjnam2, an, aobjnam, doname, singular,
         cxname, xname, yname, the, thesimpleoname, gloves_simple_name, makeplural,
         otense, vtense } from './objnam.js';
import { Amonnam, Monnam, a_monnam, hcolor, l_monnam, mon_nam,
         noit_mon_nam, pmname, upstart, x_monnam, y_monnam }
    from './do_name.js';
import { defsyms } from './drawing_data.js';
import { bimanual, carried, Is_candle, is_boots, is_gloves,
         is_flimsy } from './obj.js';
import { clear_splitobjs, mkobj, mksobj, place_object, rnd_class, set_bknown,
         splitobj, set_tin_variety, unbless } from './mkobj.js';
import { attacktype_fordmg, can_blow, has_head, haseyes, nohands, nolimbs,
         breathless, passes_walls, poly_when_stoned, throws_rocks, touch_petrifies,
         unsolid } from './mondata.js';
import { check_capacity, invocation_pos, losehp, may_passwall } from './hack.js';
import { tty_yn_function } from './tty/topl.js';
import { makeknown, observe_object } from './o_init.js';
import { Blindf_off, Blindf_on, cursed } from './do_wear.js';
import { DEADMONSTER } from './monst.js';
import { ACURR, change_luck, exercise } from './attrib.js';
import { WEAK, A_STR } from './const.js';
import { is_rider, makemon, set_malign, MM_NOMSG, NO_MM_FLAGS }
    from './makemon.js';
import { ATTKS, PMNAMES } from './monst_data.js';
import { attach_egg_hatch_timeout, begin_burn, end_burn, HATCH_EGG,
         stop_timer } from './timeout.js';
import { bhit, obj_resists, zapyourself } from './zap.js';
import { ceiling, surface } from './dungeon.js';
import { can_reach_floor, pickup_object } from './pickup.js';
import { use_pick_axe } from './dig.js';
import { dbon, do_attack } from './uhitm.js';
import { possibly_unwield, setmnotwielded } from './weapon.js';
import { freehand } from './wield.js';
import { mwelded } from './wield.js';
import { fingers_or_gloves } from './do_wear.js';
import { dowrite } from './write.js';
import { m_next2u } from './mon.js';
import { get_iter_mons } from './mon.js';
import { mon_has_amulet } from './wizard.js';
import { fire_damage } from './trap.js';
import { reset_utrap } from './trap.js';
import { instapetrify } from './trap.js';
import { little_to_big } from './mkobj.js';
import { big_to_little } from './mkobj.js';
import { uhis } from './mhitu.js';
import { stumble_onto_mimic } from './uhitm.js';
import { force_attack } from './uhitm.js';
import { Protection_from_shape_changers } from './youprop.js';
import { teleds } from './teleport.js';
import { enexto } from './teleport.js';
import { obj_no_longer_held } from './do.js';
import { dropx } from './do.js';
import { kick_steed } from './steed.js';
import { MON_WEP } from './monst.js';
import { bigmonst } from './mondata.js';
import { polymon } from './polyself.js';
import { TELEDS_ALLOW_DRAG } from './const.js';
import { IS_FURNITURE } from './const.js';
import { something } from './const.js';
import { OBJ_FLOOR } from './const.js';
import { costly_spot } from './shk.js';
import { bill_dummy_object } from './shk.js';
import { make_glib } from './potion.js';
import { On_stairs } from './stairs.js';
import { mkclass } from './makemon.js';
import { MONSYMS } from './monst_data.js';
import { mon_adjust_speed } from './worn.js';
import { G_GONE } from './const.js';
import { Something } from './const.js';
import { obj_merge_light_sources } from './light.js';
import { shk_your } from './shk.js';
import { Role_if } from './attrib.js';
import { glyph_at } from './display.js';
import { check_unpaid_usage } from './shk.js';
import { make_blinded } from './potion.js';
import { incr_itimeout } from './potion.js';
import { set_itimeout } from './potion.js';
import { gulp_blnd_check } from './mhitu.js';
import { MFLAGS } from './monst_data.js';
import { nxtobj } from './invent.js';
import { obj_has_timer } from './timeout.js';
import { init_dummyobj } from './mkobj.js';
import { get_mtraits } from './mkobj.js';
import { cant_reach_floor } from './engrave.js';
import { pronoun_gender } from './mondata.js';
import { is_whirly } from './mondata.js';
import { type_is_pname } from './mondata.js';
import { genders } from './role.js';
import { highc } from './hacklib.js';
import { is_female } from './makemon.js';
import { is_male } from './makemon.js';
import { map_object } from './display.js';
import { feel_newsym } from './display.js';
import { obj_pmname } from './do_name.js';
import { PRONOUN_NO_IT } from './const.js';
import { REVIVE_MON } from './const.js';
import { u_at } from './const.js';
import { STATUE_TRAP } from './const.js';
import { Has_contents } from './const.js';
import { Is_stronghold } from './const.js';
import { MCORPSENM } from './const.js';
import { Mgender } from './const.js';
import { SDOOR } from './const.js';
import { SCORR } from './const.js';
import { CORR } from './const.js';
import { simpleonames } from './objnam.js';
import { simple_typename } from './objnam.js';
import { t_at } from './mon.js';
import { cvt_sdoor_to_door } from './detect.js';
import { recalc_block_point } from './vision.js';
import { unblock_point } from './vision.js';
import { vault_summon_gd } from './vault.js';
import { tele_to_rnd_pet } from './teleport.js';
import { noteleport_level } from './teleport.js';
import { fill_pit } from './trap.js';
import { mintrap } from './trap.js';
import { Trap_Killed_Mon } from './trap.js';
import { mhidden_description } from './pager.js';
import { MHID_ARTICLE } from './const.js';
import { MHID_ALTMON } from './const.js';
import { poly_gender } from './polyself.js';
import { Invis } from './youprop.js';
import { See_invisible } from './youprop.js';
import { Free_action } from './youprop.js';
import { is_vampire } from './mondata.js';
import { perceives } from './mondata.js';
import { is_unicorn } from './mondata.js';
import { is_demon } from './mondata.js';
import { is_vampshifter } from './monst.js';
import { make_confused } from './potion.js';
import { paralyze_monst } from './potion.js';
import { monverbself } from './do_name.js';
import { mhe } from './do_name.js';
import { howmonseen } from './vision.js';
import { mon_reflects } from './muse.js';
import { killed } from './mon.js';
import { mpickobj } from './makemon.js';
import { tele_restrict } from './teleport.js';
import { rloc } from './teleport.js';
import { monflee } from './monmove.js';
import { MAXULEV } from './const.js';
import { INVIS_BEAM } from './const.js';
import { MONSEEN_NORMAL } from './const.js';
import { MONSEEN_SEEINVIS } from './const.js';
import { MONSEEN_INFRAVIS } from './const.js';
import { isqrt } from './hacklib.js';
import { sgn } from './hacklib.js';
import { uwep_skill_type } from './weapon.js';
import { P_SKILL } from './weapon.js';
import { u_wield_art } from './artifact.js';
import { ART_SNICKERSNEE } from './artilist_data.js';
import { wake_nearto } from './mon.js';
import { mdistu } from './monmove.js';
import { accessible } from './monmove.js';
import { getpos } from './getpos.js';
import { getpos_sethilite } from './getpos.js';
import { attack_checks } from './uhitm.js';
import { check_caitiff } from './uhitm.js';
import { overexertion } from './hack.js';
import { spoteffects } from './hack.js';
import { in_rooms } from './hack.js';
import { thitmonst } from './dothrow.js';
import { hurtle } from './dothrow.js';
import { activate_statue_trap } from './trap.js';
import { dotrap } from './trap.js';
import { feeltrap } from './trap.js';
import { trapname } from './trap.js';
import { u_wipe_engr } from './engrave.js';
import { strongmonst } from './mondata.js';
import { verysmall } from './mondata.js';
import { digests } from './mondata.js';
import { rloc_to } from './teleport.js';
import { NO_COLOR } from './terminal.js';
import { MENU_BEHAVE_STANDARD } from './const.js';
import { MENU_ITEMFLAGS_NONE } from './const.js';
import { PICK_ONE } from './const.js';
import { ROWNO } from './const.js';
import { P_NONE } from './const.js';
import { P_BASIC } from './const.js';
import { P_SKILLED } from './const.js';
import { P_RIDING } from './const.js';
import { STONE } from './const.js';
import { KILLED_BY } from './const.js';
import { IS_AIR } from './const.js';
import { AIR } from './const.js';
import { CLOUD } from './const.js';
import { LANDMINE } from './const.js';
import { BEAR_TRAP } from './const.js';
import { FORCEBUNGLE } from './const.js';
import { SHOPBASE } from './const.js';
import { stairway_at } from './dig.js';
import { reset_trapset } from './cmd.js';
import { use_unpaid_trapobj } from './shk.js';
import { add_damage } from './shk.js';
import { set_occupation } from './allmain.js';
import { maketrap } from './mklev.js';
import { arti_speak } from './artifact.js';
import { use_saddle } from './steed.js';
import { dig_check } from './dig.js';
import { watch_dig } from './dig.js';
import { fillholetyp } from './dig.js';
import { liquid_flow } from './dig.js';
import { digactualhole } from './dig.js';
import { spot_stop_timers } from './timeout.js';
import { Can_dig_down } from './dungeon.js';
import { DIGCHECK_FAILED } from './const.js';
import { DIGCHECK_FAIL_BOULDER } from './const.js';
import { IS_WALL } from './const.js';
import { MELT_ICE_AWAY } from './const.js';
import { ROOM } from './const.js';
import { PIT } from './const.js';
import { HOLE } from './const.js';



































































































































































































































































































































/* src/apply.c:4285 — the lock tools. pick_lock() reaches get_adjacent_loc(),
   so applying one consumes a DIRECTION key. Missing that left the direction to
   run as a movement command, which is exactly what made an earlier attempt at
   this command cost seed0077 a screen: its rogue applies item `e`, the lock
   pick, and the `j` after it is a direction in C and a move in ours. */

/* src/apply.c: the remaining directional tool placeholders. Stethoscopes and
   figurines have their own handlers below. */

/* src/apply.c:4344 — use_lamp() is void, so doapply's `int res = ECMD_TIME`
   survives and applying a lamp takes a turn. */


/* src/apply.c:4268 ordinary containers open the same interaction used by
   #loot.  A bag of tricks has its own effect and is intentionally omitted. */

// src/apply.c:698 number_leashed().
export function number_leashed() {
    return (game.invent || []).filter((obj) =>
        obj.otyp === ONAMES.LEASH && obj.leashmon).length;
}

// src/apply.c:746 unleash_all()
export function unleash_all() {
    for (const otmp of game.invent || [])
        if (otmp.otyp === ONAMES.LEASH)
            otmp.leashmon = 0;
    for (const mtmp of game.level?.monsters || [])
        mtmp.mleashed = 0;
}

// src/apply.c:761 leashable().
export function leashable(mtmp) {
    return mtmp.mnum !== PMNAMES.PM_LONG_WORM
        && !unsolid(mtmp.data)
        && (!nolimbs(mtmp.data) || has_head(mtmp.data));
}

// src/apply.c:881 get_mleash().
export function get_mleash(mtmp) {
    return (game.invent || []).find((obj) =>
        obj.otyp === ONAMES.LEASH && obj.leashmon === mtmp.m_id) || null;
}

// src/apply.c:919 next_to_u(), keep leashed followers beside the hero.
// src/apply.c:891 mleashed_next2u(); get_iter_mons() callback: a leashed
// pet that cannot stay next to the hero drops its leash (or holds the hero
// back when the leash is cursed)
async function mleashed_next2u(mtmp) {
    if (mtmp.mleashed) {
        if (!m_next2u(mtmp))
            await mnexto(mtmp, RLOC_NOMSG);
        if (!m_next2u(mtmp)) {
            const otmp = get_mleash(mtmp);

            if (!otmp) {
                /* impossible("leashed-unleashed mon?") */
                return true;
            }

            if (otmp.cursed)
                return true;
            mtmp.mleashed = 0;
            otmp.leashmon = 0;
            update_inventory();
            await You_feel(`${(number_leashed() > 1) ? 'a' : 'the'} leash go slack.`);
        }
    }
    return false;
}

export async function next_to_u() {
    if (await get_iter_mons(mleashed_next2u))
        return false;

    /* no pack mules for the Amulet */
    if (game.u.usteed && mon_has_amulet(game.u.usteed))
        return false;
    return true;
}

// src/apply.c:931 check_leash(). Moving farther from a leashed pet can
// tighten, choke, or snap the leash. This runs after the hero's coordinates
// change, so x,y are the square the hero just left.
export async function check_leash(x, y) {
    for (const otmp of game.invent || []) {
        if (otmp.otyp !== ONAMES.LEASH || !otmp.leashmon)
            continue;

        const mtmp = (game.level?.monsters || []).find((mon) =>
            !DEADMONSTER(mon) && mon.m_id === otmp.leashmon);
        if (!mtmp) {
            /* impossible("leash in use isn't attached to anything?") */
            otmp.leashmon = 0;
            continue;
        }

        if (dist2(game.u.ux, game.u.uy, mtmp.mx, mtmp.my)
            <= dist2(x, y, mtmp.mx, mtmp.my))
            continue;
        if (!um_dist(mtmp.mx, mtmp.my, 3)) {
            ; /* still close enough */
        } else if (otmp.cursed && !breathless(mtmp.data)) {
            if (um_dist(mtmp.mx, mtmp.my, 5)
                || ((mtmp.mhp -= rnd(2)) <= 0)) {
                const savePacifism = game.u.uconduct?.killer | 0;

                await Your(`leash chokes ${mon_nam(mtmp)} to death!`);
                await xkilled(mtmp, XKILL_NOMSG);
                if (!DEADMONSTER(mtmp)) {
                    game.u.uconduct ||= {};
                    game.u.uconduct.killer = savePacifism;
                }
            } else {
                await pline_mon(mtmp, `${Monnam(mtmp)} is choked by the leash!`);
                if (mtmp.mtame && rn2(mtmp.mtame))
                    mtmp.mtame--;
            }
        } else if (um_dist(mtmp.mx, mtmp.my, 5)) {
            await pline(`${s_suffix(Monnam(mtmp))} leash snaps loose!`);
            await m_unleash(mtmp, false);
        } else {
            await You('pull on the leash.');
            if (mtmp.data.msound) {
                const { growl, yelp, whimper } = await import('./sounds.js');
                switch (rn2(3)) {
                case 0:
                    await growl(mtmp);
                    break;
                case 1:
                    await yelp(mtmp);
                    break;
                default:
                    await whimper(mtmp);
                    break;
                }
            }
        }
    }
}

async function use_leash_core(obj, mtmp, cc, spotmon) {
    if (!spotmon && !glyph_is_invisible_at(cc.x, cc.y)) {
        await You(`fail to ${obj.leashmon ? 'un' : ''}leash something.`);
        map_invisible(cc.x, cc.y);
    } else if (!mtmp.mtame) {
        await pline(`${Monnam(mtmp)} ${obj.leashmon
            ? 'is not' : 'cannot be'} leashed!`);
    } else if (!obj.leashmon) {
        if (mtmp.mleashed) {
            await pline(`This ${spotmon ? l_monnam(mtmp)
                : 'creature'} is already leashed.`);
        } else if (unsolid(mtmp.data)) {
            await pline('The leash would just fall off.');
        } else if (nolimbs(mtmp.data) && !has_head(mtmp.data)) {
            await pline(`${Monnam(mtmp)} has no extremities the leash would fit.`);
        } else if (!leashable(mtmp)) {
            let name = l_monnam(mtmp);
            if (cc.x !== mtmp.mx || cc.y !== mtmp.my)
                name = `${s_suffix(name)} tail`;
            await pline(`The leash won't fit onto ${spotmon ? 'your ' : ''}${name}.`);
        } else {
            await You(`slip the leash around ${spotmon ? 'your ' : ''}${l_monnam(mtmp)}.`);
            mtmp.mleashed = 1;
            obj.leashmon = mtmp.m_id;
            mtmp.msleeping = 0;
            update_inventory();
        }
    } else if (obj.leashmon !== mtmp.m_id) {
        await pline('This leash is not attached to that creature.');
    } else if (obj.cursed) {
        await pline_The('leash would not come off!');
        set_bknown(obj, 1);
    } else {
        mtmp.mleashed = 0;
        obj.leashmon = 0;
        update_inventory();
        await You(`remove the leash from ${spotmon ? 'your ' : ''}${l_monnam(mtmp)}.`);
    }
}

// src/apply.c:769 use_leash().
async function use_leash(obj) {
    if (game.u.uswallow) {
        const engulfer = noit_mon_nam(game.u.ustuck);
        const action = !obj.leashmon
            ? `leash ${engulfer} from inside.`
            : obj.leashmon === game.u.ustuck.m_id
              ? `unleash ${engulfer} from inside.`
              : `unleash anything from inside ${engulfer}.`;
        await You_cant(action);
        return ECMD_OK;
    }
    if (!obj.leashmon && number_leashed() >= 2) {
        await You('cannot leash any more pets.');
        return ECMD_OK;
    }

    const cc = {};
    if (!await get_adjacent_loc(null, null, game.u.ux, game.u.uy, cc))
        return ECMD_OK;

    if (cc.x === game.u.ux && cc.y === game.u.uy) {
        if (game.u.usteed && game.u.dz > 0) {
            await use_leash_core(obj, game.u.usteed, cc, true);
            return ECMD_TIME;
        }
        await pline('Leash yourself?  Very funny...');
        return ECMD_OK;
    }

    const mtmp = m_at(cc.x, cc.y);
    if (!mtmp) {
        await There('is no creature there.');
        unmap_invisible(cc.x, cc.y);
        return ECMD_TIME;
    }

    await use_leash_core(obj, mtmp, cc, canspotmon(mtmp));
    return ECMD_TIME;
}


// src/apply.c:2955 use_whip(). This covers wield-and-replay, direction
// handling, self damage, ordinary snaps, adjacent attacks, floor snags, and
// weapon disarming. Mounted use and pit escape remain explicit gaps.
async function use_whip(obj) {
    let buf;
    let mtmp;
    let otmp;
    let rx, ry, proficient, res = ECMD_OK;
    const msg_slipsfree = 'The bullwhip slips free.';
    const msg_snap = 'Snap!';

    if (obj !== game.u.uwep) {
        if (await wield_tool(obj, 'lash')) {
            cmdq_add_ec(CQ_CANNED, doapply);
            cmdq_add_key(CQ_CANNED, obj.invlet);
            return ECMD_TIME;
        }
        return ECMD_OK;
    }
    if (!(await getdir(null)))
        return (res | ECMD_CANCEL);

    if (game.u.uswallow) {
        mtmp = game.u.ustuck;
        rx = mtmp.mx;
        ry = mtmp.my;
    } else {
        confdir(false);
        rx = game.u.ux + game.u.dx;
        ry = game.u.uy + game.u.dy;
        if (!isok(rx, ry)) {
            await You('miss.');
            return res;
        }
        mtmp = m_at(rx, ry);
    }

    /* fake some proficiency checks */
    proficient = 0;
    if (Role_if(PMNAMES.PM_ARCHEOLOGIST))
        ++proficient;
    if (ACURR(A_DEX) < 6)
        proficient--;
    else if (ACURR(A_DEX) >= 14)
        proficient += (ACURR(A_DEX) - 14);
    if (Fumbling())
        --proficient;
    if (proficient > 3)
        proficient = 3;
    if (proficient < 0)
        proficient = 0;

    /* the C reaches this arm by 'goto whipattack' from the pit arm too */
    const whipattack = async () => {
        otmp = null; /* if monster is unseen, can't attempt to disarm it */
        if (!canspotmon(mtmp)) {
            let spotitnow;

            mtmp.mundetected = 0; /* bring non-mimic hider out of hiding */
            /* check visibility again after mundetected=0 in case being
               brought out of hiding has exposed it (might not if hero is
               blind or formerly hidden monster is also invisible) */
            spotitnow = canspotmon(mtmp);
            if (spotitnow || !glyph_is_invisible_at(rx, ry)) {
                await pline(`${!spotitnow ? 'A monster' : Amonnam(mtmp)} is there that you ${
                      !Blind() ? "couldn't see" : "hadn't noticed"}.`);
                if (!spotitnow)
                    map_invisible(rx, ry);
                else
                    newsym(rx, ry);
            }
        } else {
            /* monster is known so if it is wielding something, try to
               disarm it rather than make a direct attack */
            otmp = MON_WEP(mtmp);
        }

        if (otmp) {
            let onambuf;
            let mon_hand;
            let gotit = proficient && (!Fumbling() || !rn2(10));

            onambuf = cxname(otmp);
            if (gotit) {
                mon_hand = mbodypart(mtmp, HAND);
                if (bimanual(otmp))
                    mon_hand = makeplural(mon_hand);
            } else
                mon_hand = null; /* lint suppression */

            await You(`wrap your bullwhip around ${yname(otmp)}.`);
            if (gotit && mwelded(otmp)) {
                await pline(`${(otmp.quan === 1) ? 'It is' : 'They are'} welded to ${mhis(mtmp)} ${
                      mon_hand}${!otmp.bknown ? '!' : '.'}`);
                set_bknown(otmp, 1);
                gotit = false; /* can't pull it free */
            }
            if (gotit) {
                obj_extract_self(otmp);
                await possibly_unwield(mtmp, false);
                await setmnotwielded(mtmp, otmp);

                switch (rn2(proficient + 1)) {
                case 2:
                    /* to floor near you */
                    await You(`yank ${yname(otmp)} to the ${surface(game.u.ux, game.u.uy)}!`);
                    place_object(otmp, game.u.ux, game.u.uy);
                    stackobj(otmp);
                    break;
                case 3:
                    /* right into your inventory */
                    await You(`snatch ${yname(otmp)}!`);
                    if (otmp.otyp === ONAMES.CORPSE
                        && touch_petrifies(game.mons[otmp.corpsenm]) && !game.u.uarmg
                        && !Stone_resistance()
                        && !(poly_when_stoned(game.youmonst.data)
                             && await polymon(PMNAMES.PM_STONE_GOLEM))) {
                        const kbuf = (otmp.quan === 1) ? an(onambuf) : onambuf;

                        await pline(`Snatching ${kbuf} is a fatal mistake.`);
                        /* corpse probably has a rot timer but is now
                           OBJ_FREE; end of game cleanup will panic if
                           it isn't part of current level; plus it would
                           be missing from bones, so put it on the floor */
                        place_object(otmp, game.u.ux, game.u.uy); /* but don't stack */

                        await instapetrify(kbuf);
                        /* life-saved; free the corpse again */
                        obj_extract_self(otmp);
                    }
                    await hold_another_object(otmp, 'You drop %s!',
                                              doname(otmp), null);
                    break;
                default:
                    /* to floor beneath mon */
                    await You(`yank ${the(onambuf)} from ${
                        s_suffix(mon_nam(mtmp))} ${mon_hand}!`);
                    obj_no_longer_held(otmp);
                    place_object(otmp, mtmp.mx, mtmp.my);
                    stackobj(otmp);
                    break;
                }
            } else {
                await pline(msg_slipsfree);
            }
        } else { /* mtmp isn't wielding a weapon; attack it */
            let do_snap = true;

            if (M_AP_TYPE(mtmp) && !Protection_from_shape_changers()
                && !sensemon(mtmp)) {
                await stumble_onto_mimic(mtmp);
                do_snap = false;
            } else {
                await You(`flick your bullwhip towards ${mon_nam(mtmp)}.`);
            }
            if (proficient && await force_attack(mtmp, false))
                return ECMD_TIME;
            if (do_snap)
                await pline(msg_snap);
        }
        /* regardless of mtmp's weapon or hero's proficiency */
        await wakeup(mtmp, true);
        return null;
    };

    if (game.u.uswallow) {
        await There('is not enough room to flick your bullwhip.');

    } else if (Underwater()) {
        await There('is too much resistance to flick your bullwhip.');

    } else if (game.u.dz < 0) {
        await You(`flick a bug off of the ${ceiling(game.u.ux, game.u.uy)}.`);

    } else if (!game.u.dz && (IS_WATERWALL(game.level.at(rx, ry).typ)
                              || game.level.at(rx, ry).typ === LAVAWALL)) {
        await You('cause a small splash.');
        if (game.level.at(rx, ry).typ === LAVAWALL)
            await fire_damage(game.u.uwep, false, rx, ry);
        return ECMD_TIME;
    } else if ((!game.u.dx && !game.u.dy) || (game.u.dz > 0)) {
        let dam;

        /* Sometimes you hit your steed by mistake */
        if (game.u.usteed && !rn2(proficient + 2)) {
            await You(`whip ${mon_nam(game.u.usteed)}!`);
            await kick_steed();
            return ECMD_TIME;
        }
        if (is_pool_or_lava(game.u.ux, game.u.uy)
            || IS_WATERWALL(game.level.at(rx, ry).typ)
            || game.level.at(rx, ry).typ === LAVAWALL) {
            await You('cause a small splash.');
            if (is_lava(game.u.ux, game.u.uy))
                await fire_damage(game.u.uwep, false, game.u.ux, game.u.uy);
            return ECMD_TIME;
        }
        if (Levitation() || game.u.usteed || Flying()) {
            /* Have a shot at snaring something on the floor.  A flyer
               can reach the floor so could just pick an item up, but
               allow snagging by whip too. */
            otmp = (game.level.objects || []).find((o) => o.ox === game.u.ux && o.oy === game.u.uy
                                                        && (o.where === undefined || o.where === OBJ_FLOOR)) || null;
            if (otmp && otmp.otyp === ONAMES.CORPSE
                && (otmp.corpsenm === PMNAMES.PM_HORSE
                    || otmp.corpsenm === little_to_big(PMNAMES.PM_HORSE) /* warhorse */
                    || otmp.corpsenm === big_to_little(PMNAMES.PM_HORSE))) { /* pony */
                await pline('Why beat a dead horse?');
                return ECMD_TIME;
            }
            if (otmp && proficient) {
                await You(`wrap your bullwhip around ${
                    an(singular(otmp, xname))} on the ${surface(game.u.ux, game.u.uy)}.`);
                if (rnl(6) || await pickup_object(otmp, 1, true) < 1)
                    await pline(msg_slipsfree);
                return ECMD_TIME;
            }
        }
        dam = rnd(2) + dbon() + obj.spe;
        if (dam <= 0)
            dam = 1;
        await You(`hit your ${body_part(FOOT)} with your bullwhip.`);
        buf = `killed ${uhim()}self with ${uhis()} bullwhip`;
        await losehp(Maybe_Half_Phys(dam), buf, NO_KILLER_PREFIX);
        return ECMD_TIME;

    } else if ((Fumbling() || Glib()) && !rn2(5)) {
        await pline_The(`bullwhip slips out of your ${body_part(HAND)}.`);
        await dropx(obj);

    } else if (game.u.utrap && game.u.utraptype === TT_PIT) {
        /*
         * Assumptions:
         *
         * if you're in a pit
         *    - you are attempting to get out of the pit
         *    - if there is no suitable boulder or furniture to target,
         *      target a big monster for that, or if a small or medium
         *      monster is present, attack it
         *      [if both boulder and furniture are present, target the
         *      former because it is on top of the latter]
         * else if you are applying it towards a monster
         *    - if monster is concealed, reveal it and proceed;
         *    - if it was not concealed and is wielding a weapon, attempt
         *      to disarm it;
         *    - otherwise attack it.
         *
         * if you're confused (and thus off the mark)
         *    - you only end up hitting.
         */
        let wrapped_what = sobj_at(ONAMES.BOULDER, rx, ry) ? 'a boulder'
                           : IS_FURNITURE(game.level.at(rx, ry).typ)
                             ? something : null;
        let goto_whipattack = false;

        if (mtmp) {
            /* if a big monster is known to be present, target it in
               preference to boulder or furniture; if any small or medium
               monster is present, or an unseen big one, use the boulder
               or furniture if available, otherwise attack */
            if (bigmonst(mtmp.data) && canspotmon(mtmp))
                wrapped_what = buf = mon_nam(mtmp);

            if (!wrapped_what)
                goto_whipattack = true;
        }
        if (goto_whipattack) {
            if (await whipattack() === ECMD_TIME)
                return ECMD_TIME;
        } else if (wrapped_what) {
            const cc = { x: rx, y: ry };

            await You(`wrap your bullwhip around ${wrapped_what}.`);
            if (proficient && rn2(proficient + 2)) {
                if (!mtmp || enexto(cc, rx, ry, game.youmonst.data)) {
                    await You('yank yourself out of the pit!');
                    await reset_utrap(true); /* [was after teleds(); do this before
                                              * in case it has no alternative other
                                              * than to put hero in another trap] */
                    await teleds(cc.x, cc.y, TELEDS_ALLOW_DRAG);
                    game.vision_full_recalc = 1;
                }
            } else {
                await pline(msg_slipsfree);
            }
            if (mtmp)
                await wakeup(mtmp, true);
        } else
            await pline(msg_snap);

    } else if (mtmp) {
        if (await whipattack() === ECMD_TIME)
            return ECMD_TIME;

    } else if (Is_airlevel(game.u.uz) || Is_waterlevel(game.u.uz)) {
        /* it must be air -- water checked above */
        await You('snap your whip through thin air.');

    } else {
        await pline(msg_snap);
    }
    return ECMD_TIME;
}

// src/eat.c:3098 use_tin_opener(). The opener is wielded before the tin
// prompt, but unlike picks and whips the application continues immediately.
function tinopen_ok(obj) {
    return obj?.otyp === ONAMES.TIN ? GETOBJ_SUGGEST : GETOBJ_EXCLUDE;
}

async function use_tin_opener(obj) {
    let res = ECMD_OK;

    if (!carrying(ONAMES.TIN)) {
        await You('have no tin to open.');
        return ECMD_OK;
    }

    if (obj !== game.u.uwep) {
        if (obj.cursed && obj.bknown
            && (await tty_yn_function(`Really wield ${doname(obj)}?`,
                                      'ynq', 'q')) !== 'y')
            return ECMD_OK;
        if (!await wield_tool(obj, 'use'))
            return ECMD_OK;
        res = ECMD_TIME;
    }

    const tin = await getobj('open', tinopen_ok, GETOBJ_NOFLAGS);
    if (!tin)
        return res | ECMD_CANCEL;

    const { start_tin } = await import('./eat.js');
    await start_tin(tin);
    return ECMD_TIME;
}

async function use_lamp(obj) {
    const lamp = (obj.otyp === ONAMES.OIL_LAMP
                  || obj.otyp === ONAMES.MAGIC_LAMP) ? 'lamp'
                 : (obj.otyp === ONAMES.BRASS_LANTERN) ? 'lantern'
                   : null;

    /*
     * When blind, lamps' and candles' on/off state can be distinguished
     * by heat.  For brass lantern assume that there is an on/off switch
     * that can be felt.
     */

    if (obj.lamplit) {
        if (lamp) /* lamp or lantern */
            await pline(`${Shk_Your(obj)}${lamp} is now off.`);
        else
            await You(`snuff out ${yname(obj)}.`);
        await end_burn(obj, true);
        return;
    }
    if (Underwater()) {
        await pline(`${
              !Is_candle(obj) ? 'This is not a diving lamp'
                              : "Sorry, fire and water don't mix"}.`);
        return;
    }
    /* magic lamps with an spe == 0 (wished for) cannot be lit */
    if ((!Is_candle(obj) && obj.age === 0)
        || (obj.otyp === ONAMES.MAGIC_LAMP && obj.spe === 0)) {
        if (obj.otyp === ONAMES.BRASS_LANTERN) {
            if (!Blind())
                await Your('lantern is out of power.');
            else
                await pline(nothing_seems_to_happen);
        } else {
            await pline(`This ${xname(obj)} has no oil.`);
        }
        return;
    }
    if (obj.cursed && !rn2(2)) {
        if ((obj.otyp === ONAMES.OIL_LAMP || obj.otyp === ONAMES.MAGIC_LAMP) && !rn2(3)) {
            await pline_The(`lamp spills and covers your ${
                      fingers_or_gloves(true)} with oil.`);
            make_glib(((game.u.intrinsic?.HGlib | 0) & TIMEOUT) + d(2, 10));
        } else if (!Blind()) {
            await pline(`${Tobjnam(obj, 'flicker')} for a moment, then ${
                  otense(obj, 'die')}.`);
        } else {
            await pline(nothing_seems_to_happen);
        }
    } else {
        if (lamp) { /* lamp or lantern */
            await check_unpaid(obj);
            await pline(`${Shk_Your(obj)}${lamp} is now on.`);
        } else { /* candle(s) */
            await pline(`${s_suffix(Yname2(obj))} flame${plur(obj.quan)} ${
                  otense(obj, 'burn')}${Blind() ? '.' : ' brightly!'}`);
            if (obj.unpaid && costly_spot(game.u.ux, game.u.uy)
                && obj.age === 20 * game.objects[obj.otyp].oc_cost) {
                const ithem = (obj.quan > 1) ? 'them' : 'it';
                /* struct monst *shkp = shop_keeper(*in_rooms(u.ux, u.uy, SHOPBASE)); SetVoice(shkp, 0, 80, 0); */

                await verbalize(`You burn ${ithem}, you bought ${ithem}!`);
                bill_dummy_object(obj);
            }
        }
        await begin_burn(obj, false);
    }
}

// src/apply.c:1703 light_cocktail(). A lit oil potion is a one-item stack
// with a burn timer and radius-one light source. Snuffing restores its unused
// fuel, then removes and re-adds it so that it can merge with matching oil.
async function light_cocktail(optr) {
    let obj = optr.obj; /* obj is a potion of oil */
    let split1off;

    if (game.u.uswallow) {
        await You(no_elbow_room);
        return;
    }

    if (obj.lamplit) {
        await You('snuff the lit potion.');
        await end_burn(obj, true);
        /*
         * Free & add to re-merge potion.  This will average the
         * age of the potions.  Not exactly the best solution,
         * but its easy.  Don't do that unless obj is not worn (uwep,
         * uswapwep, or uquiver) because if wielded and other oil is
         * quivered a "null obj after quiver merge" panic will occur.
         */
        if (!obj.owornmask) {
            freeinv(obj);
            optr.obj = addinv(obj);
        }
        return;
    } else if (Underwater()) {
        await There('is not enough oxygen to sustain a fire.');
        return;
    }

    split1off = (obj.quan > 1);
    if (split1off)
        obj = splitobj(obj, 1);

    await You(`light ${shk_your(obj)}potion.${
        Blind() ? '' : '  It gives off a dim light.'}`);

    if (obj.unpaid && costly_spot(game.u.ux, game.u.uy)) {
        /* struct monst *shkp = shop_keeper(*in_rooms(u.ux, u.uy, SHOPBASE)); */

        /* Normally, we shouldn't both partially and fully charge
         * for an item, but (Yendorian Fuel) Taxes are inevitable...
         */
        await check_unpaid(obj);
        /* SetVoice(shkp, 0, 80, 0); */
        await verbalize("That's in addition to the cost of the potion, of course.");
        bill_dummy_object(obj);
    }
    makeknown(obj.otyp);

    await begin_burn(obj, false); /* after shop billing */
    if (split1off) {
        obj_extract_self(obj); /* free from inv */
        obj.nomerge = 1;
        obj = await hold_another_object(obj, 'You drop %s!', doname(obj),
                                        null);
        if (obj)
            obj.nomerge = 0;
    }
    optr.obj = obj;
}

// src/apply.c:1319 use_candelabrum().
async function use_candelabrum(obj) {
    const s = obj.spe !== 1 ? 'candles' : 'candle';

    if (obj.lamplit) {
        await You(`snuff the ${s}.`);
        await end_burn(obj, true);
        return;
    }
    if (obj.spe <= 0) {
        await pline(`This ${xname(obj)} has no ${s}.`);
        if ((game.invent || []).some((otmp) =>
            otmp.otyp === ONAMES.WAX_CANDLE
            || otmp.otyp === ONAMES.TALLOW_CANDLE)) {
            await pline(`To attach candles, apply them instead of the ${xname(obj)}.`);
        }
        return;
    }
    if (Underwater()) {
        await You('cannot make fire under water.');
        return;
    }
    if (game.u.uswallow || obj.cursed) {
        if (!Blind())
            await pline(`The ${s} ${vtense(s, 'flicker')} for a moment, then ${vtense(s, 'die')}.`);
        return;
    }
    if (obj.spe < 7) {
        await There(`${vtense(s, 'are')} only ${obj.spe} ${s} in ${the(xname(obj))}.`);
        if (!Blind()) {
            await pline(`${obj.spe === 1 ? 'It is' : 'They are'} lit.  ${
                Tobjnam(obj, 'shine')} dimly.`);
        }
    } else {
        await pline(`${The(xname(obj))}'s ${s} burn${Blind() ? '.' : ' brightly!'}`);
    }

    if (!invocation_pos(game.u.ux, game.u.uy) || On_stairs(game.u.ux, game.u.uy)) {
        await pline(`The ${s} ${vtense(s, 'are')} being rapidly consumed!`);
        obj.age = Math.max(1, Math.trunc(((obj.age || 0) + 1) / 2));
    } else {
        if (obj.spe === 7) {
            await pline(`${The(xname(obj))} ${Blind()
                ? 'radiates a strange warmth' : 'glows with a strange light'}!`);
        }
        obj.known = 1;
    }

    await begin_burn(obj, false);
}

// src/apply.c:1200 use_bell(). The charged invocation path is complete;
// unrelated charged effects remain recorded until their object interactions
// are ported.
async function use_bell(optr) {
    const obj = optr.obj;
    let mtmp;
    let wakem = false, learno = false;
    const ordinary = (obj.otyp !== ONAMES.BELL_OF_OPENING || !obj.spe),
          invoking = (obj.otyp === ONAMES.BELL_OF_OPENING
                      && invocation_pos(game.u.ux, game.u.uy)
                      && !On_stairs(game.u.ux, game.u.uy));

    /* Hero_playnotes(obj_to_instr(obj), "C", 100); empty in this build */
    await You(`ring ${the(xname(obj))}.`);

    if (Underwater() || (game.u.uswallow && ordinary)) {
        await pline('But the sound is muffled.');

    } else if (invoking && ordinary) {
        /* needs to be recharged... */
        await pline('But it makes no sound.');
        learno = true; /* help player figure out why */

    } else if (ordinary) {
        if (obj.cursed && !rn2(4)
            /* note: once any of them are gone, we stop all of them */
            && !(game.mvitals[PMNAMES.PM_WOOD_NYMPH].mvflags & G_GONE)
            && !(game.mvitals[PMNAMES.PM_WATER_NYMPH].mvflags & G_GONE)
            && !(game.mvitals[PMNAMES.PM_MOUNTAIN_NYMPH].mvflags & G_GONE)
            && (mtmp = makemon(mkclass(MONSYMS.S_NYMPH, 0), game.u.ux, game.u.uy,
                               NO_MINVENT | MM_NOMSG)) != null) {
            await You(`summon ${a_monnam(mtmp)}!`);
            if (!obj_resists(obj, 93, 100)) {
                await pline(`${Tobjnam(obj, 'have')} shattered!`);
                useup(obj);
                optr.obj = null;
            } else
                switch (rn2(3)) {
                default:
                    break;
                case 1:
                    mon_adjust_speed(mtmp, 2, null);
                    break;
                case 2: /* no explanation; it just happens... */
                    game.nomovemsg = '';
                    game.multi_reason = null;
                    nomul(-rnd(2));
                    break;
                }
        }
        wakem = true;

    } else {
        /* charged Bell of Opening */
        await consume_obj_charge(obj, true);

        if (game.u.uswallow) {
            if (!obj.cursed)
                await openit();
            else
                await pline(nothing_happens);

        } else if (obj.cursed) {
            const mm = { x: game.u.ux, y: game.u.uy };

            await mkundead(mm, false, NO_MINVENT);
            wakem = true;

        } else if (invoking) {
            await pline(`${Tobjnam(obj, 'issue')} an unsettling shrill sound...`);
            obj.age = game.moves;
            learno = true;
            wakem = true;

        } else if (obj.blessed) {
            let res = 0;

            if (game.u.uchain) {
                unpunish();
                res = 1;
            } else if (game.u.utrap && game.u.utraptype === TT_BURIEDBALL) {
                await buried_ball_to_freedom();
                res = 1;
            }
            res += await openit();
            switch (res) {
            case 0:
                await pline(nothing_happens);
                break;
            case 1:
                await pline(`${Something} opens...`);
                learno = true;
                break;
            default:
                await pline('Things open around you...');
                learno = true;
                break;
            }

        } else { /* uncursed */
            if (await findit() !== 0)
                learno = true;
            else
                await pline(nothing_happens);
        }

    } /* charged BofO */

    if (learno) {
        makeknown(ONAMES.BELL_OF_OPENING);
        obj.known = 1;
    }
    if (wakem)
        await wake_nearby(true);
}

// src/apply.c:1399 use_candle(), including attaching candles to the
// Candelabrum of Invocation.
async function use_candle(optr) {
    let obj = optr.obj;
    let otmp;
    let s = (obj.quan !== 1) ? 'candles' : 'candle';
    let qbuf, qsfx, q;
    let was_lamplit;

    if (game.u.uswallow) {
        await You(no_elbow_room);
        return;
    }

    /* obj is the candle; otmp is the candelabrum */
    otmp = carrying(ONAMES.CANDELABRUM_OF_INVOCATION);
    if (!otmp || otmp.spe === 7) {
        await use_lamp(obj);
        return;
    }

    /* first, minimal candelabrum suffix for formatting candles */
    qsfx = ` to\x1b${thesimpleoname(otmp)}?`;
    /* next, format the candles as a prefix for the candelabrum */
    qbuf = safe_qbuf('Attach ', qsfx, obj, yname, thesimpleoname, s);
    /* strip temporary candelabrum suffix */
    if ((q = qbuf.indexOf(' to\x1b')) >= 0)
        qbuf = qbuf.slice(0, q) + ' to ';
    /* last, format final "attach candles to candelabrum?" query */
    if (await tty_yn_function(safe_qbuf(qbuf, '?', otmp, yname, thesimpleoname, 'it'), 'yn', 'n')
        === 'n') {
        await use_lamp(obj);
        return;
    } else {
        if (otmp.spe + obj.quan > 7) {
            obj = splitobj(obj, 7 - otmp.spe);
            /* avoid a grammatical error if obj->quan gets
               reduced to 1 candle from more than one */
            s = (obj.quan !== 1) ? 'candles' : 'candle';
        } else
            optr.obj = null;

        /* The candle's age field doesn't correctly reflect the amount
           of fuel in it while it's lit, because the fuel is measured
           by the timer. So to get accurate age updating, we need to
           end the burn temporarily while attaching the candle. */
        was_lamplit = obj.lamplit;
        if (was_lamplit)
            await end_burn(obj, true);

        await You(`attach ${obj.quan}${!otmp.spe ? '' : ' more'} ${s} to ${
            the(xname(otmp))}.`);
        if (!otmp.spe || otmp.age > obj.age)
            otmp.age = obj.age;
        otmp.spe += obj.quan;
        if (otmp.lamplit && !was_lamplit)
            await pline_The(`new ${s} magically ${vtense(s, 'ignite')}!`);
        else if (!otmp.lamplit && was_lamplit)
            await pline(`${(obj.quan > 1) ? 'They go' : 'It goes'} out.`);
        if (obj.unpaid) {
            /* struct monst *shkp = shop_keeper(*in_rooms(u.ux, u.uy, SHOPBASE)); SetVoice(shkp, 0, 80, 0); */
            await verbalize(`You ${otmp.lamplit ? 'burn' : 'use'} ${
                      (obj.quan > 1) ? 'them' : 'it'}, you bought ${
                      (obj.quan > 1) ? 'them' : 'it'}!`);
        }
        if (obj.quan < 7 && otmp.spe === 7)
            await pline(`${The(xname(otmp))} now has seven${
                  otmp.lamplit ? ' lit' : ''} candles attached.`);
        /* candelabrum's light range might increase */
        if (otmp.lamplit)
            await obj_merge_light_sources(otmp, otmp);
        /* candles are no longer a separate light source */
        /* candles are now gone */
        useupall(obj);
        /* candelabrum's weight is changing */
        otmp.owt = weight(otmp);
        update_inventory();
    }
}

// src/apply.c:1472 snuff_candle()
export async function snuff_candle(otmp) {
    const candle = Is_candle(otmp);

    if ((candle || otmp.otyp === ONAMES.CANDELABRUM_OF_INVOCATION)
        && otmp.lamplit) {
        const cc = { x: 0, y: 0 };
        const many = candle ? (otmp.quan > 1) : (otmp.spe > 1);

        get_obj_location(otmp, cc, 0);
        if (otmp.where === OBJ_MINVENT ? cansee(cc.x, cc.y) : !Blind())
            await pline(`${Shk_Your(otmp)}${candle ? '' : "candelabrum's "}candle${many ? "s'" : "'s"} flame${many ? 's are' : ' is'} extinguished.`);
        await end_burn(otmp, true);
        return true;
    }
    return false;
}

// src/apply.c:1497 snuff_lit()
export async function snuff_lit(obj) {
    const cc = { x: 0, y: 0 };

    if (obj.lamplit) {
        if (obj.otyp === ONAMES.OIL_LAMP || obj.otyp === ONAMES.MAGIC_LAMP
            || obj.otyp === ONAMES.BRASS_LANTERN || obj.otyp === ONAMES.POT_OIL) {
            get_obj_location(obj, cc, 0);
            if (obj.where === OBJ_MINVENT ? cansee(cc.x, cc.y) : !Blind())
                await pline(`${Yname2(obj)} ${otense(obj, 'go')} out!`);
            await end_burn(obj, true);
            return true;
        }
        if (await snuff_candle(obj))
            return true;
    }
    return false;
}

// src/apply.c:1518 splash_lit()
export async function splash_lit(obj) {
    let result, dunk = false;

    /* lantern won't be extinguished by a rust trap or rust monster attack
       but will be if submerged or placed into a container or swallowed by
       a monster (for mobile light source handling, not because it ought
       to stop being lit in all those situations...) */
    if (obj.lamplit && obj.otyp === ONAMES.BRASS_LANTERN) {
        let mtmp;
        let useeit = false, uhearit = false, snuff = true;

        if (obj.where === OBJ_INVENT) {
            useeit = !Blind();
            uhearit = !Deaf();
            /* underwater light sources aren't allowed but if hero
               is just entering water, Underwater won't be set yet */
            dunk = (is_pool(game.u.ux, game.u.uy)
                    && ((!Levitation() && !Flying() && !Wwalking())
                        || Is_waterlevel(game.u.uz)));
            snuff = false;
        } else if (obj.where === OBJ_MINVENT
                   /* don't assume that lit lantern has been swallowed;
                      a nymph might have stolen it or picked it up */
                   && ((mtmp = obj.ocarry), humanoid(mtmp.data))) {
            const cc = { x: 0, y: 0 };

            useeit = get_obj_location(obj, cc, 0) && cansee(cc.x, cc.y);
            uhearit = couldsee(cc.x, cc.y) && distu(cc.x, cc.y) < 5 * 5;
            dunk = (is_pool(mtmp.mx, mtmp.my)
                    && ((!is_flyer(mtmp.data) && !is_floater(mtmp.data))
                        || Is_waterlevel(game.u.uz)));
            snuff = false;
            if (useeit)
                set_msg_xy(cc.x, cc.y);
        }

        if (useeit || uhearit)
            await pline(`${Yname2(obj)} ${uhearit ? 'crackles' : ''}${(uhearit && useeit) ? ' and ' : ''}${useeit ? 'flickers' : ''}.`);
        if (!dunk && !snuff)
            return false;
    }

    result = await snuff_lit(obj);

    /* this is simpler when we wait until after lantern has been snuffed */
    if (dunk) {
        /* drain some of the battery but don't short it out entirely */
        obj.age -= (obj.age > 200) ? 100 : Math.trunc(obj.age / 2);
    }
    return result;
}

// src/apply.c:4151 apply_ok() — the getobj filter for 'a'.
//
// The graystone dknown/touchstone refinement needs discovery state that is
// live, so it is ported whole; the final arm is EXCLUDE_SELECTABLE, which
// keeps unlisted items pickable via '*' with "Sorry, I don't know how to use
// that." when one is forced.
/* include/obj.h is_graystone() */
const is_graystone = (o) =>
    o.otyp === ONAMES.LUCKSTONE || o.otyp === ONAMES.LOADSTONE
    || o.otyp === ONAMES.FLINT || o.otyp === ONAMES.TOUCHSTONE;

// src/apply.c:1772 rub_ok(): objects accepted by #rub.
export function rub_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;
    if (obj.otyp === ONAMES.OIL_LAMP || obj.otyp === ONAMES.MAGIC_LAMP
        || obj.otyp === ONAMES.BRASS_LANTERN || is_graystone(obj)
        || obj.otyp === ONAMES.LUMP_OF_ROYAL_JELLY)
        return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

// src/apply.c:2660 touchstone_ok().
function touchstone_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;
    if (obj.oclass === OCLASSES.COIN_CLASS)
        return GETOBJ_SUGGEST;
    if (obj.oclass === OCLASSES.GEM_CLASS
        && !(obj.dknown && game.objects[obj.otyp].oc_name_known))
        return GETOBJ_SUGGEST;
    return GETOBJ_DOWNPLAY;
}

const C_OBJ_COLORS = [
    'black', 'red', 'green', 'brown', 'blue', 'magenta', 'cyan', 'gray',
    'transparent', 'orange', 'bright green', 'yellow', 'bright blue',
    'bright magenta', 'bright cyan', 'white',
];

// src/apply.c:2680 use_stone().
async function use_stone(tstone) {
    const scritch = '"scritch, scritch"';

    if (!Blind())
        observe_object(tstone);
    const known = tstone.otyp === ONAMES.TOUCHSTONE && tstone.dknown
                  && game.objects[ONAMES.TOUCHSTONE].oc_name_known;
    const obj = await getobj(`rub on the stone${plur(tstone.quan)}`,
                             known ? touchstone_ok : any_obj_ok,
                             GETOBJ_PROMPT);
    if (!obj)
        return ECMD_CANCEL;

    if (obj === tstone && obj.quan === 1) {
        await You_cant(`rub ${the(xname(obj))} on itself.`);
        return ECMD_OK;
    }

    if (tstone.otyp === ONAMES.TOUCHSTONE && tstone.cursed
        && obj.oclass === OCLASSES.GEM_CLASS && !is_graystone(obj)
        && !obj_resists(obj, 80, 100)) {
        if (Blind()) {
            await You_feel('something shatter.');
        } else if (Hallucination()) {
            await pline('Oh, wow, look at the pretty shards.');
        } else {
            await pline(`A sharp crack shatters ${
                obj.quan > 1 ? 'one of ' : ''}${the(xname(obj))}.`);
        }
        useup(obj);
        return ECMD_TIME;
    }

    if (Blind()) {
        await pline(scritch);
        return ECMD_TIME;
    }
    if (Hallucination()) {
        await pline('Oh wow, man: Fractals!');
        return ECMD_TIME;
    }

    let do_scratch = false;
    let streak_color = null;
    let oclass = obj.oclass;
    const objclass = game.objects[obj.otyp];

    if (oclass === OCLASSES.RING_CLASS
        && objclass.oc_material !== MATERIALS.GEMSTONE
        && objclass.oc_material !== MATERIALS.MINERAL)
        oclass = 0; /* RANDOM_CLASS */

    if (oclass === OCLASSES.GEM_CLASS || oclass === OCLASSES.RING_CLASS) {
        if (tstone.otyp !== ONAMES.TOUCHSTONE) {
            do_scratch = true;
        } else {
            const role = game.urole?.mnum;
            const race = game.urace?.mnum;
            const effective = tstone.blessed
                || (!tstone.cursed
                    && (role === 'PM_ARCHEOLOGIST'
                        || role === PMNAMES.PM_ARCHEOLOGIST
                        || race === 'PM_GNOME'
                        || race === PMNAMES.PM_GNOME));
            if (obj.oclass === OCLASSES.GEM_CLASS && effective) {
                makeknown(ONAMES.TOUCHSTONE);
                makeknown(obj.otyp);
                await prinv(null, obj, 0);
                return ECMD_TIME;
            }
            if (objclass.oc_material === MATERIALS.GLASS) {
                do_scratch = true;
            } else {
                streak_color = C_OBJ_COLORS[objclass.oc_color];
            }
        }
        if (tstone.otyp !== ONAMES.TOUCHSTONE)
            streak_color = C_OBJ_COLORS[objclass.oc_color];
    } else {
        switch (objclass.oc_material) {
        case MATERIALS.CLOTH:
            await pline(`${Tobjnam(tstone, 'look')} a little more polished now.`);
            return ECMD_TIME;
        case MATERIALS.LIQUID:
            if (!obj.known)
                await You('must think this is a wetstone, do you?');
            else
                await pline(`${Tobjnam(tstone, 'are')} a little wetter now.`);
            return ECMD_TIME;
        case MATERIALS.WAX:
            streak_color = 'waxy';
            break;
        case MATERIALS.WOOD:
            streak_color = 'wooden';
            break;
        case MATERIALS.GOLD:
            do_scratch = true;
            streak_color = 'golden';
            break;
        case MATERIALS.SILVER:
            do_scratch = true;
            streak_color = 'silvery';
            break;
        default:
            if (is_flimsy(obj))
                streak_color = C_OBJ_COLORS[objclass.oc_color];
            else
                do_scratch = tstone.otyp !== ONAMES.TOUCHSTONE;
            break;
        }
    }

    const stone = `stone${plur(tstone.quan)}`;
    if (do_scratch) {
        await You(`make ${streak_color ? `${streak_color} ` : ''}`
                  + `scratch marks on the ${stone}.`);
    } else if (streak_color) {
        await You_see(`${streak_color} streaks on the ${stone}.`);
    } else {
        await pline(scritch);
    }
    return ECMD_TIME;
}

// src/apply.c:2177 use_tinning_kit().
async function use_tinning_kit(obj) {
    let corpse, can;
    let mptr;

    /* This takes only 1 move.  If this is to be changed to take many
     * moves, we've got to deal with decaying corpses...
     */
    if (obj.spe <= 0) {
        await You('seem to be out of tins.');
        return;
    }
    const { floorfood } = await import('./eat.js');
    if (!(corpse = await floorfood('tin', 2)))
        return;
    if (corpse.oeaten) {
        await You(`cannot tin ${something} which is partly eaten.`);
        return;
    }
    mptr = game.mons[corpse.corpsenm];
    if (touch_petrifies(mptr) && !Stone_resistance() && !game.u.uarmg) {
        let kbuf;
        const corpse_name = an(cxname(corpse));

        if (poly_when_stoned(game.youmonst.data)) {
            await You(`tin ${corpse_name} without wearing gloves.`);
            kbuf = '';
        } else {
            await pline(`Tinning ${corpse_name} without wearing gloves is a fatal mistake...`);
            kbuf = `trying to tin ${corpse_name} without gloves`;
        }
        await instapetrify(kbuf);
    }
    if (is_rider(mptr)) {
        const { revive_corpse } = await import('./do.js');
        if (await revive_corpse(corpse))
            await verbalize('Yes...  But War does not preserve its enemies...');
        else
            await pline_The('corpse evades your grasp.');
        return;
    }
    if (mptr.cnutrit === 0) {
        await pline("That's too insubstantial to tin.");
        return;
    }
    await consume_obj_charge(obj, true);

    if ((can = mksobj(ONAMES.TIN, false, false)) != null) {
        const you_buy_it = 'You tin it, you bought it!';

        can.corpsenm = corpse.corpsenm;
        can.cursed = obj.cursed;
        can.blessed = obj.blessed;
        can.owt = weight(can);
        can.known = 1;
        /* Mark tinned tins. No spinach allowed... */
        set_tin_variety(can, HOMEMADE_TIN);
        if (carried(corpse)) {
            if (corpse.unpaid) {
                /* struct monst *shkp = shop_keeper(*in_rooms(u.ux, u.uy, SHOPBASE)); SetVoice(shkp, 0, 80, 0); */
                await verbalize(you_buy_it);
            }
            useup(corpse);
        } else {
            if (costly_spot(corpse.ox, corpse.oy) && !corpse.no_charge) {
                /* struct monst *shkp = shop_keeper(*in_rooms(corpse->ox, corpse->oy, SHOPBASE)); SetVoice(shkp, 0, 80, 0); */
                await verbalize(you_buy_it);
            }
            await useupf(corpse, 1);
        }
        await hold_another_object(can, 'You make, but cannot pick up, %s.',
                                  doname(can), null);
    } else {
        /* impossible("Tinning failed.") */
    }
}

// src/potion.c:2815 djinni_from_bottle().
async function djinni_from_bottle(obj) {
    const mtmp = makemon(game.mons[PMNAMES.PM_DJINNI],
                         game.u.ux, game.u.uy, MM_NOMSG);
    if (!mtmp) {
        await pline('It turns out to be empty.');
        return;
    }

    if (!Blind()) {
        await pline(`In a cloud of smoke, ${a_monnam(mtmp)} emerges!`);
        await pline(`${Monnam(mtmp)} speaks.`);
    } else {
        await You('smell acrid fumes.');
        await pline('Something speaks.');
    }

    let chance = rn2(5);
    if (obj.blessed)
        chance = chance === 4 ? rnd(4) : 0;
    else if (obj.cursed)
        chance = chance === 0 ? rn2(4) : 4;

    if (chance === 0) {
        await pline('"I am in your debt.  I will grant one wish!"');
        mongone(mtmp);
        const { makewish } = await import('./zap.js');
        await makewish();
    } else if (chance === 1) {
        await pline('"Thank you for freeing me!"');
        const { initedog } = await import('./dog.js');
        initedog(mtmp, true);
    } else if (chance === 2) {
        await pline('"You freed me!"');
        mtmp.mpeaceful = 1;
        set_malign(mtmp);
    } else if (chance === 3) {
        await pline('"It is about time!"');
        if (canspotmon(mtmp))
            await pline(`${Monnam(mtmp)} vanishes.`);
        mongone(mtmp);
    } else {
        await pline('"You disturbed me, fool!"');
        mtmp.mpeaceful = 0;
        set_malign(mtmp);
    }
}

// src/apply.c:1785 dorub(): the #rub command.
export async function dorub() {
    let obj;

    if (nohands(game.youmonst.data)) {
        await You("aren't able to rub anything without hands.");
        return ECMD_OK;
    }
    obj = await getobj('rub', rub_ok, GETOBJ_NOFLAGS);
    if (!obj)
        return ECMD_CANCEL;
    if (obj.oclass === OCLASSES.GEM_CLASS || obj.oclass === OCLASSES.FOOD_CLASS) {
        if (is_graystone(obj)) {
            return await use_stone(obj);
        } else if (obj.otyp === ONAMES.LUMP_OF_ROYAL_JELLY) {
            return await use_royal_jelly(obj);
        } else {
            await pline("Sorry, I don't know how to use that.");
            return ECMD_OK;
        }
    }
    if (obj !== game.u.uwep) {
        if (await wield_tool(obj, 'rub')) {
            cmdq_add_ec(CQ_CANNED, dorub);
            cmdq_add_key(CQ_CANNED, obj.invlet);
            return ECMD_TIME;
        }
        return ECMD_OK;
    }

    /* now uwep is obj */
    if (game.u.uwep.otyp === ONAMES.MAGIC_LAMP) {
        if (game.u.uwep.spe > 0 && !rn2(3)) {
            await check_unpaid_usage(game.u.uwep, true); /* unusual item use */
            /* bones preparation:  perform the lamp transformation
               before releasing the djinni in case the latter turns out
               to be fatal (a hostile djinni has no chance to attack yet,
               but an indebted one who grants a wish might bestow an
               artifact which blasts the hero with lethal results) */
            game.u.uwep.otyp = ONAMES.OIL_LAMP;
            game.u.uwep.spe = 0; /* for safety */
            game.u.uwep.age = rn1(500, 1000);
            if (game.u.uwep.lamplit)
                await begin_burn(game.u.uwep, true);
            await djinni_from_bottle(game.u.uwep);
            makeknown(ONAMES.MAGIC_LAMP);
            update_inventory();
        } else if (rn2(2)) {
            await You(`${!Blind() ? 'see a puff of' : 'smell'} smoke.`);
        } else
            await pline(nothing_happens);
    } else if (obj.otyp === ONAMES.BRASS_LANTERN) {
        /* message from Adventure */
        await pline('Rubbing the electric lamp is not particularly rewarding.');
        await pline('Anyway, nothing exciting happens.');
    } else
        await pline(nothing_happens);
    return ECMD_TIME;
}

export function apply_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;

    /* all tools, all wands (breaking), all spellbooks (flipping through) */
    if (obj.oclass === OCLASSES.TOOL_CLASS || obj.oclass === OCLASSES.WAND_CLASS
        || obj.oclass === OCLASSES.SPBOOK_CLASS)
        return GETOBJ_SUGGEST;

    /* applying coins to flip them is a minor easter egg */
    if (obj.oclass === OCLASSES.COIN_CLASS)
        return GETOBJ_DOWNPLAY;

    /* certain weapons */
    if (obj.oclass === OCLASSES.WEAPON_CLASS
        && (is_pick(obj) || is_axe(obj) || is_pole(obj)
            || obj.otyp === ONAMES.BULLWHIP))
        return GETOBJ_SUGGEST;

    if (obj.oclass === OCLASSES.POTION_CLASS) {
        /* permit applying unknown potions, but don't suggest them */
        if (!obj.dknown || !game.objects[obj.otyp].oc_name_known)
            return GETOBJ_DOWNPLAY;

        /* only applicable potion is oil, suggested once discovered */
        if (obj.otyp === ONAMES.POT_OIL)
            return GETOBJ_SUGGEST;
    }

    /* certain foods */
    if (obj.otyp === ONAMES.CREAM_PIE || obj.otyp === ONAMES.EUCALYPTUS_LEAF
        || obj.otyp === ONAMES.LUMP_OF_ROYAL_JELLY)
        return GETOBJ_SUGGEST;

    if (obj.otyp === ONAMES.BANANA && Hallucination())
        return GETOBJ_DOWNPLAY;

    if (is_graystone(obj)) {
        if (!obj.dknown)
            return GETOBJ_SUGGEST;

        if (obj.otyp !== ONAMES.TOUCHSTONE
            && (game.objects[ONAMES.TOUCHSTONE].oc_name_known
                || game.objects[obj.otyp].oc_name_known))
            return GETOBJ_EXCLUDE_SELECTABLE;

        return GETOBJ_SUGGEST;
    }

    return GETOBJ_EXCLUDE_SELECTABLE;
}

/* src/apply.c:3616 use_royal_jelly(): rub one lump on an egg. */
function jelly_ok(obj) {
    return obj?.otyp === ONAMES.EGG ? GETOBJ_SUGGEST : GETOBJ_EXCLUDE;
}

async function use_royal_jelly(jelly) {
    const splitit = jelly.quan > 1;
    const obj = splitit ? splitobj(jelly, 1) : jelly;
    freeinv(obj);

    const egg = await getobj('rub the royal jelly on', jelly_ok,
                             GETOBJ_PROMPT);
    if (!egg) {
        /* In 5.0.0, unsplitobj(obj) receives the free split child here and
           returns null, so cancelling a split application loses one lump. */
        if (!splitit)
            addinv_nomerge(obj);
        update_inventory();
        return ECMD_CANCEL;
    }

    await You(`smear royal jelly all over ${yname(egg)}.`);
    if (egg.otyp !== ONAMES.EGG) {
        await pline(nothing_happens);
    } else {
        const oldcorpsenm = egg.corpsenm;
        if (egg.corpsenm === PMNAMES.PM_KILLER_BEE)
            egg.corpsenm = PMNAMES.PM_QUEEN_BEE;

        if (obj.cursed) {
            if (egg.timed || egg.corpsenm !== oldcorpsenm) {
                await pline(`The ${xname(egg)} ${otense(egg, 'quiver')} `
                            + 'feebly.');
            } else {
                await pline(nothing_seems_to_happen);
            }
            stop_timer(HATCH_EGG, egg);
        } else {
            const was_timed = egg.timed;
            if (egg.corpsenm !== NON_PM) {
                if (!egg.timed)
                    attach_egg_hatch_timeout(egg, 0);
                if (obj.blessed && !egg.spe)
                    egg.spe = 2;
            }
            if ((egg.timed && !was_timed) || egg.spe === 2
                || egg.corpsenm !== oldcorpsenm) {
                await pline(`The ${xname(egg)} ${otense(egg, 'quiver')} `
                            + 'briefly.');
            } else {
                await pline(nothing_seems_to_happen);
            }
        }
    }

    clear_splitobjs();
    return ECMD_TIME;
}

/* src/apply.c no_elbow_room[] */
const no_elbow_room = 'have no elbow-room to maneuver.';
const is_wet_towel = (obj) => obj.otyp === ONAMES.TOWEL && obj.spe > 0;
/* include/youprop.h: Blinded (timed or a worn blindfold/towel), its timeout,
   Sick, Stunned, Confusion; include/you.h Ugender */
const Blinded = () => !!((game.u.intrinsic?.HBlinded | 0)
                         || (game.u.ublindf && (game.u.ublindf.otyp === ONAMES.BLINDFOLD
                                                 || game.u.ublindf.otyp === ONAMES.TOWEL)));
const BlindedTimeout = () => ((game.u.intrinsic?.HBlinded | 0) & TIMEOUT);
const Sick = () => !!(game.u.uprops?.SICK);
const Stunned = () => !!(game.u.intrinsic?.HStun);
const Confusion = () => !!(game.u.intrinsic?.HConfusion);
/* include/you.h:558 next2u() */
const next2u = (px, py) => (distu(px, py) <= 2);
const Ugender = () => ((Upolyd(game.u) ? game.u.mfemale : game.flags?.female) ? 1 : 0);
/* the C compares glyph integers; our glyph_at() returns descriptors */
const glyph_is_monster = (g) => g?.kind === 'mon';
const glyph_is_invisible = (g) => g?.kind === 'invis';
const glyph_is_statue = (g) => g?.kind === 'obj' && !!g.statue;
const glyph_is_cmap = (g) => g?.kind === 'cmap';
const glyph_to_cmap = (g) => g.cmap;
const glyph_to_obj = (g) => (g?.kind === 'obj' ? g.otyp : -1);

async function dry_a_towel(obj, amount, verbose) {
    const newspe = amount < 0 ? obj.spe + amount : amount;
    if (newspe < obj.spe && verbose) {
        await pline(`${Yobjnam2(obj, null)} dries${newspe ? '' : ' out'}.`);
    }
    if (newspe !== obj.spe) {
        obj.spe = Math.max(0, Math.min(newspe, 7));
        if (obj === game.u.uwep)
            game.unweapon = !is_wet_towel(obj);
    }
}

// src/apply.c:112 use_towel().
async function use_towel(obj) {
    const drying_feedback = (obj === game.u.uwep);

    if (!freehand()) {
        await You(`have no free ${body_part(HAND)}!`);
        return ECMD_OK;
    } else if (obj === game.u.ublindf) {
        await You("cannot use it while you're wearing it!");
        return ECMD_OK;
    } else if (obj.cursed) {
        let old;

        switch (rn2(3)) {
        case 2:
            old = ((game.u.intrinsic?.HGlib | 0) & TIMEOUT);
            make_glib(old + rn1(10, 3)); /* + 3..12 */
            await Your(`${makeplural(body_part(HAND))} ${
                 (old ? 'are filthier than ever' : 'get slimy')}!`);
            if (is_wet_towel(obj))
                await dry_a_towel(obj, -1, drying_feedback);
            return ECMD_TIME;
        case 1:
            if (!game.u.ublindf) {
                old = game.u.ucreamed | 0;
                game.u.ucreamed = old + rn1(10, 3);
                await pline(`Yecch!  Your ${body_part(FACE)} ${
                      (old ? 'has more' : 'now has')} gunk on it!`);
                await make_blinded(BlindedTimeout() + game.u.ucreamed - old, true);
            } else {
                let what;

                what = (game.u.ublindf.otyp === ONAMES.LENSES)
                           ? 'lenses'
                           : (obj.otyp === game.u.ublindf.otyp) ? 'other towel'
                                                                : 'blindfold';
                if (game.u.ublindf.cursed) {
                    await You(`push your ${what} ${
                        rn2(2) ? 'cock-eyed' : 'crooked'}.`);
                } else {
                    const saved_ublindf = game.u.ublindf;
                    await You(`push your ${what} off.`);
                    await Blindf_off(game.u.ublindf);
                    await dropx(saved_ublindf);
                }
            }
            if (is_wet_towel(obj))
                await dry_a_towel(obj, -1, drying_feedback);
            return ECMD_TIME;
        case 0:
            break;
        }
    }

    if (Glib()) {
        make_glib(0);
        await You(`wipe off your ${
            !game.u.uarmg ? makeplural(body_part(HAND)) : gloves_simple_name(game.u.uarmg)}.`);
        if (is_wet_towel(obj))
            await dry_a_towel(obj, -1, drying_feedback);
        return ECMD_TIME;
    } else if (game.u.ucreamed) {
        incr_itimeout('HBlinded', (-1 * (game.u.ucreamed | 0)));
        game.u.ucreamed = 0;
        if (!Blinded()) {
            await pline("You've got the glop off.");
            if (!(await gulp_blnd_check())) {
                set_itimeout('HBlinded', 1);
                await make_blinded(0, true);
            }
        } else {
            await Your(`${body_part(FACE)} feels clean now.`);
        }
        if (is_wet_towel(obj))
            await dry_a_towel(obj, -1, drying_feedback);
        return ECMD_TIME;
    }

    await Your(`${body_part(FACE)} and ${makeplural(body_part(HAND))} are already clean.`);

    return ECMD_OK;
}

function grease_covering(obj) {
    const u = game.u;
    if (!obj?.owornmask)
        return [];
    if (obj === u.uarm && u.uarmc)
        return [u.uarmc];
    if (obj === u.uarmu && (u.uarm || u.uarmc))
        return [u.uarmc, u.uarm].filter(Boolean);
    if ((obj === u.uleft || obj === u.uright) && u.uarmg)
        return [u.uarmg];
    return [];
}

/* src/apply.c:2590 grease_ok().  Hands are a real getobj choice; gold and
   equipment hidden under outer armor or gloves are not. */
function grease_ok(obj) {
    if (!obj)
        return GETOBJ_SUGGEST;
    if (obj.oclass === OCLASSES.COIN_CLASS)
        return GETOBJ_EXCLUDE;
    if (grease_covering(obj).length)
        return GETOBJ_EXCLUDE_INACCESS;
    return GETOBJ_SUGGEST;
}

export async function consume_obj_charge(obj, maybe_unpaid) /* false if caller handles shop billing */
{
    if (maybe_unpaid)
        await check_unpaid(obj);
    obj.spe -= 1;
    if (obj.known)
        update_inventory();
}

// src/apply.c:60 do_blinding_ray() / :80 use_camera().
async function do_blinding_ray(obj) {
    const ref = { obj };
    const mtmp = await bhit(game.u.dx, game.u.dy, COLNO, FLASHED_LIGHT,
                            null, null, ref);
    obj.ox = game.u.ux;
    obj.oy = game.u.uy;
    if (mtmp) {
        const { flash_hits_mon } = await import('./uhitm.js');
        await flash_hits_mon(mtmp, obj);
        await see_monster_closeup(mtmp, true);
    }
}

async function use_camera(obj) {
    if (Underwater()) {
        await pline('Using your camera underwater would void the warranty.');
        return ECMD_OK;
    }
    if (!await getdir(null))
        return ECMD_CANCEL;

    if (obj.spe <= 0) {
        await pline(nothing_happens);
        return ECMD_TIME;
    }
    await consume_obj_charge(obj, true);

    if (obj.cursed && !rn2(2)) {
        await zapyourself(obj, true);
    } else if (game.u.uswallow) {
        await You(`take a picture of ${s_suffix(mon_nam(game.u.ustuck))} ${
            mbodypart(game.u.ustuck, STOMACH)}.`);
    } else if (game.u.dz) {
        await You(`take a picture of the ${game.u.dz > 0
            ? surface(game.u.ux, game.u.uy)
            : ceiling(game.u.ux, game.u.uy)}.`);
    } else if (!game.u.dx && !game.u.dy) {
        await zapyourself(obj, true);
    } else {
        await do_blinding_ray(obj);
    }
    return ECMD_TIME;
}

// src/apply.c:2604 use_grease().
async function use_grease(obj) {
    const u = game.u;
    const { dropx } = await import('./do.js');

    if (Glib()) {
        await pline(`${Tobjnam(obj, 'slip')} from your `
                    + `${fingers_or_gloves(false)}.`);
        await dropx(obj);
        return ECMD_TIME;
    }

    if ((obj.spe | 0) > 0) {
        if ((obj.cursed || Fumbling() || u.intrinsic?.HFumbling)
            && !rn2(2)) {
            await consume_obj_charge(obj, true);
            await pline(`${Tobjnam(obj, 'slip')} from your `
                        + `${fingers_or_gloves(false)}.`);
            await dropx(obj);
            return ECMD_TIME;
        }

        const target = await getobj('grease', grease_ok, GETOBJ_PROMPT);
        if (!target)
            return ECMD_CANCEL;

        const covering = grease_covering(target);
        if (covering.length) {
            const outer = covering.length === 1
                ? yname(covering[0])
                : `${yname(covering[0])} and ${xname(covering[1])}`;
            await You(`need to take off ${outer} to grease ${yname(target)}.`);
            return ECMD_OK;
        }

        await consume_obj_charge(obj, true);
        const { make_glib } = await import('./potion.js');
        const oldglib = ((u.intrinsic?.HGlib || u.uprops?.GLIB || 0)
                         & TIMEOUT);
        if (target !== hands_obj) {
            await You(`cover ${yname(target)} with a thick layer of grease.`);
            target.greased = 1;
            if (obj.cursed && !nohands(game.youmonst.data)) {
                make_glib(oldglib + rn1(6, 10));
                await pline(`Some of the grease gets all over your `
                            + `${fingers_or_gloves(true)}.`);
            }
        } else {
            make_glib(oldglib + rn1(11, 5));
            await You(`coat your ${fingers_or_gloves(true)} with grease.`);
        }
    } else {
        await pline(`${Tobjnam(obj, obj.known ? 'are' : 'seem')} `
                    + `${obj.known ? '' : 'to be '}empty.`);
    }
    update_inventory();
    return ECMD_TIME;
}

// src/apply.c:4496 flip_coin().
async function flip_coin(obj) {
    let dropped = obj;
    let lose_coin = false;

    await You(`flip ${an(singular(obj, xname))}.`);
    if (Underwater()) {
        await pline('It tumbles away.');
        lose_coin = true;
    } else {
        const dex = ACURR(A_DEX);
        if (Glib() || Fumbling() || game.u.intrinsic?.HFumbling
            || (dex < 10 && !rn2(dex))) {
            await pline(`It slips between your ${fingers_or_gloves(false)}.`);
            lose_coin = true;
        }
    }

    if (lose_coin) {
        if (obj.quan > 1)
            dropped = splitobj(obj, 1);
        const { dropx } = await import('./do.js');
        await dropx(dropped);
        return ECMD_TIME;
    }

    if (Hallucination()) {
        await pline(rn2(100) ? 'Wow, a double header!'
                             : 'The coin miraculously lands on its edge!');
    } else {
        await pline(`It comes up ${rn2(2) ? 'heads' : 'tails'}.`);
    }
    return ECMD_TIME;
}

// src/apply.c:4426 flip_through_book().
// src/apply.c:4431 unfixable_trouble_count() — troubles that a unicorn horn
// (is_horn) or a potion of restore ability can't fix.
export function unfixable_trouble_count(is_horn) {
    const u = game.u;
    const props = u.uprops || {};
    const intr = u.intrinsic || {};
    let unfixable_trbl = 0;

    if (props.STONED)
        unfixable_trbl++;
    if (props.SLIMED)
        unfixable_trbl++;
    if (props.STRANGLED)
        unfixable_trbl++;
    const wounded_legs = ((intr.HWounded_legs || 0) > 0)
                         || !!(u.EWounded_legs || 0);
    if ((u.atemp?.a?.[A_DEX] | 0) < 0 && wounded_legs)
        unfixable_trbl++;
    if ((u.atemp?.a?.[A_STR] | 0) < 0 && (u.uhs ?? 0) >= WEAK)
        unfixable_trbl++;
    /* for a horn, a non-timeout source of these can't be cured by it,
       so don't count it as a trouble which can't be fixed */
    if (props.SICK && (!is_horn || ((props.SICK | 0) & ~TIMEOUT) !== 0))
        unfixable_trbl++;
    if (props.STUNNED && (!is_horn || ((intr.HStun | 0) & ~TIMEOUT) !== 0))
        unfixable_trbl++;
    if (props.CONFUSION
        && (!is_horn || ((intr.HConfusion | 0) & ~TIMEOUT) !== 0))
        unfixable_trbl++;
    if (Hallucination()
        && (!is_horn || ((intr.HHallucination | 0) & ~TIMEOUT) !== 0))
        unfixable_trbl++;
    if (props.VOMITING
        && (!is_horn || ((props.VOMITING | 0) & ~TIMEOUT) !== 0))
        unfixable_trbl++;
    if (Deaf() && (!is_horn || ((intr.HDeaf | 0) & ~TIMEOUT) !== 0))
        unfixable_trbl++;

    return unfixable_trbl;
}

async function flip_through_book(obj) {
    if (Underwater()) {
        await You("don't want to get the pages even more soggy, do you?");
        return ECMD_OK;
    }

    await You(`flip through the pages of ${thesimpleoname(obj)}.`);
    if (obj.otyp === ONAMES.SPE_BOOK_OF_THE_DEAD) {
        if (!Deaf()) {
            await You_hear(`the pages make an unpleasant ${
                Hallucination() ? 'chuckling' : 'rustling'} sound.`);
        } else if (!Blind()) {
            await You_see(`the pages glow faintly ${hcolor(NH_RED)}.`);
        } else {
            await You_feel('the pages tremble.');
        }
    } else if (Blind()) {
        await pline(`The pages feel ${Hallucination()
            ? 'freshly picked' : 'rough and dry'}.`);
    } else if (obj.otyp === ONAMES.SPE_BLANK_PAPER) {
        await pline(`This spellbook ${Hallucination()
            ? "doesn't have much of a plot" : 'has nothing written in it'}.`);
        makeknown(obj.otyp);
    } else if (Hallucination()) {
        await You('enjoy the animated initials.');
    } else if (obj.otyp === ONAMES.SPE_NOVEL) {
        await pline('This looks like it might be interesting to read.');
    } else {
        const fadeness = [
            'fresh', 'slightly faded', 'very faded', 'extremely faded',
            'barely visible',
        ];
        const findx = Math.min(obj.spestudied | 0, MAX_SPELL_STUDY);
        await pline(`The${game.objects[obj.otyp].oc_magic ? ' magical' : ''} `
                    + `ink in this spellbook is ${fadeness[findx]}.`);
    }
    return ECMD_TIME;
}

// src/apply.c:3568 use_cream_pie(): apply a pie to the hero's face.
async function use_cream_pie(obj) {
    const wasblind = !!game.u.ublind;
    const wascreamed = !!game.u.ucreamed;
    const several = obj.quan > 1;
    if (several)
        obj = splitobj(obj, 1);
    const pie_name = the(xname(obj));

    if (Hallucination()) {
        await You('give yourself a facial.');
    } else {
        await You(`immerse your ${body_part(FACE)} in `
                  + `${several ? 'one of ' : ''}`
                  + `${several ? makeplural(pie_name) : pie_name}.`);
    }

    const blindinc = rnd(25);
    game.u.ucreamed = (game.u.ucreamed || 0) + blindinc;
    const intr = (game.u.intrinsic ||= {});
    intr.HBlinded = (intr.HBlinded || 0) + blindinc;
    game.u.ublind = 1;
    game.vision_full_recalc = 1;
    (game.disp ||= {}).botl = true;
    if (!game.u.ublind || (game.u.ublind && wasblind)) {
        await pline(`There's ${wascreamed ? 'more ' : ''}sticky goop all over `
                    + `your ${body_part(FACE)}.`);
    } else {
        await You_cant(`see through all the sticky goop on your `
                       + `${body_part(FACE)}.`);
    }

    delobj(obj);
    return ECMD_OK;
}

// src/apply.c:318 use_stethoscope() — apply a stethoscope.
//
// THE TIME RULE: the first use in a hero turn is free; the second in the
// same turn costs the move (hero_seq vs context.stethoscope_seq). The
// engulfed-interference rn2 cannot fire (no engulfing yet); the steed,
// swallow, dz (floor/ceiling) and monster arms are recorded; the cursed
// heartbeat coin-flip rn2(2) is real.
// src/apply.c:1001 beautiful(); charisma is supposed to include qualities
// like leadership and personal magnetism rather than just appearance, but it
// has devolved to this...
export function beautiful() {
    let res;
    const cha = ACURR(A_CHA);

    /* don't bother complaining about the sexism; NetHack is not real life */
    res = ((cha >= 25) ? 'sublime' /* 25 is the maximum possible */
           : (cha >= 19) ? 'splendorous' /* note: not "splendiferous" */
             : (cha >= 16) ? ((poly_gender() === 1) ? 'beautiful' : 'handsome')
               : (cha >= 14) ? ((poly_gender() === 1) ? 'winsome' : 'amiable')
                 : (cha >= 11) ? 'cute'
                   : (cha >= 9) ? 'plain'
                     : (cha >= 6) ? 'homely'
                       : (cha >= 4) ? 'ugly'
                         : 'hideous'); /* 3 is the minimum possible */
    return res;
}

/* src/apply.c look_str[] */
const look_str = (how) => `look ${how}.`;

// src/apply.c:1018 use_mirror()
async function use_mirror(obj) {
    let mirror, uvisage;
    let mtmp;
    let how_seen;
    let mlet;
    let vis, invis_mirror, useeit, monable;

    if (!(await getdir(null)))
        return ECMD_CANCEL;
    invis_mirror = Invis();
    useeit = !Blind() && (!invis_mirror || See_invisible());
    uvisage = beautiful();
    mirror = simpleonames(obj); /* "mirror" or "looking glass" */
    if (obj.cursed && !rn2(2)) {
        if (!Blind())
            await pline_The(`${mirror} fogs up and doesn't reflect!`);
        else
            await pline(nothing_seems_to_happen);
        return ECMD_TIME;
    }
    if (!game.u.dx && !game.u.dy && !game.u.dz) {
        if (!useeit) {
            await You_cant(`see your ${uvisage} ${body_part(FACE)}.`);
        } else {
            if (game.u.umonnum === PMNAMES.PM_FLOATING_EYE) {
                if (Free_action()) {
                    await You('stiffen momentarily under your gaze.');
                } else {
                    if (Hallucination())
                        await pline(`Yow!  The ${mirror} stares back!`);
                    else
                        await pline("Yikes!  You've frozen yourself!");
                    if (!Hallucination() || !rn2(4)) {
                        nomul(-rnd(MAXULEV + 6 - game.u.ulevel));
                        game.multi_reason = 'gazing into a mirror';
                    }
                    game.nomovemsg = null; /* default, "you can move again" */
                }
            } else if (is_vampire(game.youmonst.data)
                       || is_vampshifter(game.youmonst)) {
                await You("don't have a reflection.");
            } else if (game.u.umonnum === PMNAMES.PM_UMBER_HULK) {
                await pline("Huh?  That doesn't look like you!");
                await make_confused((game.u.intrinsic?.HConfusion | 0) + d(3, 4), false);
            } else if (Hallucination()) {
                await You(look_str(hcolor(null)));
            } else if (Sick()) {
                await You(look_str('peaked'));
            } else if (game.u.uhs >= WEAK) {
                await You(look_str('undernourished'));
            } else if (Upolyd(game.u)) {
                await You(`look like ${an(pmname(game.mons[game.u.umonnum], Ugender()))}.`);
            } else {
                await You(`look as ${uvisage} as ever.`);
            }
        }
        return ECMD_TIME;
    }
    if (game.u.uswallow) {
        if (useeit)
            await You(`reflect ${s_suffix(mon_nam(game.u.ustuck))} ${
                mbodypart(game.u.ustuck, STOMACH)}.`);
        return ECMD_TIME;
    }
    if (Underwater()) {
        if (useeit)
            await You(`${
                Hallucination() ? 'give the fish a chance to fix their makeup'
                              : 'reflect the murky water'}.`);
        return ECMD_TIME;
    }
    if (game.u.dz) {
        if (useeit)
            await You(`reflect the ${
                (game.u.dz > 0) ? surface(game.u.ux, game.u.uy) : ceiling(game.u.ux, game.u.uy)}.`);
        return ECMD_TIME;
    }
    const pobj = { obj };
    mtmp = await bhit(game.u.dx, game.u.dy, COLNO, INVIS_BEAM, null, null, pobj);
    if (!mtmp || !haseyes(mtmp.data) || game.notonhead)
        return ECMD_TIME;

    /* couldsee(mtmp->mx, mtmp->my) is implied by the fact that bhit()
       targeted it, so we can ignore possibility of X-ray vision */
    vis = canseemon(mtmp);
    /* ways to directly see monster (excludes X-ray vision, telepathy,
       extended detection, type-specific warning) */
    const SEENMON = (MONSEEN_NORMAL | MONSEEN_SEEINVIS | MONSEEN_INFRAVIS);
    how_seen = vis ? howmonseen(mtmp) : 0;
    /* whether monster is able to use its vision-based capabilities */
    monable = !mtmp.mcan && (!mtmp.minvis || perceives(mtmp.data));
    mlet = mtmp.data.mlet;
    if (mtmp.msleeping) {
        if (vis)
            await pline(`${Monnam(mtmp)} is too tired to look at your ${mirror}.`);
    } else if (!mtmp.mcansee) {
        if (vis)
            await pline(`${Monnam(mtmp)} can't see anything right now.`);
    } else if (invis_mirror && !perceives(mtmp.data)) {
        if (vis)
            await pline(`${Monnam(mtmp)} fails to notice your ${mirror}.`);
        /* infravision doesn't produce an image in the mirror */
    } else if ((how_seen & SEENMON) === MONSEEN_INFRAVIS) {
        if (vis) /* (redundant) */
            await pline(`${monverbself(mtmp, Monnam(mtmp), 'are',
                                       'too far away to see')} in the dark.`);
        /* some monsters do special things */
    } else if (mlet === MONSYMS.S_VAMPIRE || mlet === MONSYMS.S_GHOST || is_vampshifter(mtmp)) {
        if (vis)
            await pline(`${Monnam(mtmp)} doesn't have a reflection.`);
    } else if (monable && mtmp.data === game.mons[PMNAMES.PM_MEDUSA]) {
        if (await mon_reflects(mtmp, 'The gaze is reflected away by %s %s!'))
            return ECMD_TIME;
        if (vis)
            await pline(`${Monnam(mtmp)} is turned to stone!`);
        game.stoned = true;
        await killed(mtmp);
    } else if (monable && mtmp.data === game.mons[PMNAMES.PM_FLOATING_EYE]) {
        let tmp = d(mtmp.m_lev, mtmp.data.mattk[0][3]);
        if (!rn2(4))
            tmp = 120;
        if (vis)
            await pline(`${Monnam(mtmp)} is frozen by its reflection.`);
        else
            await You_hear(`${something} stop moving.`);
        await paralyze_monst(mtmp, (mtmp.mfrozen | 0) + tmp);
    } else if (monable && mtmp.data === game.mons[PMNAMES.PM_UMBER_HULK]) {
        if (vis)
            await pline(`${Monnam(mtmp)} confuses itself!`);
        mtmp.mconf = 1;
    } else if (monable && (mlet === MONSYMS.S_NYMPH
                           || mtmp.data === game.mons[PMNAMES.PM_AMOROUS_DEMON])) {
        if (vis) {
            let buf; /* "She" or "He" */

            await pline(`${ /* "<mon> admires self in your mirror " */
                  monverbself(mtmp, Monnam(mtmp), 'admire', null)} in your ${mirror}.`);
            buf = mhe(mtmp);
            await pline(`${upstart(buf)} takes it!`);
        } else
            await pline(`It steals your ${mirror}!`);
        setnotworn(obj); /* in case mirror was wielded */
        freeinv(obj);
        await mpickobj(mtmp, obj);
        if (!(await tele_restrict(mtmp)))
            await rloc(mtmp, RLOC_MSG);
    } else if (!is_unicorn(mtmp.data) && !humanoid(mtmp.data)
               && !is_demon(mtmp.data)
               && (!mtmp.minvis || perceives(mtmp.data)) && rn2(5)) {
        let do_react = true;

        if (mtmp.mfrozen) {
            if (vis)
                await You(`discern no obvious reaction from ${mon_nam(mtmp)}.`);
            else
                await You_feel(
                       'a bit silly gesturing the mirror in that direction.');
            do_react = false;
        }
        if (do_react) {
            if (vis)
                await pline(`${Monnam(mtmp)} is frightened by its reflection.`);
            await monflee(mtmp, d(2, 4), false, false);
        }
    } else if (!Blind()) {
        if (mtmp.minvis && !See_invisible())
            ;
        else if ((mtmp.minvis && !perceives(mtmp.data))
                 /* redundant: can't get here if these are true */
                 || !haseyes(mtmp.data) || game.notonhead || !mtmp.mcansee)
            await pline(`${Monnam(mtmp)} doesn't seem to notice ${mhis(mtmp)} reflection.`);
        else
            await pline(`${Monnam(mtmp)} ignores ${mhis(mtmp)} reflection.`);
    }
    return ECMD_TIME;
}

// src/apply.c:198 its_dead(); maybe give a stethoscope message based on
// floor objects
async function its_dead(rx, ry, resp) {
    let buf;
    let more_corpses;
    let mptr;
    let corpse = sobj_at(ONAMES.CORPSE, rx, ry),
        statue = sobj_at(ONAMES.STATUE, rx, ry);

    if (!can_reach_floor(true)) { /* levitation or unskilled riding */
        corpse = null;            /* can't reach corpse on floor */
        /* you can't reach tiny statues (even though you can fight
           tiny monsters while levitating--consistency, what's that?) */
        while (statue && game.mons[statue.corpsenm].msize === MFLAGS.MZ_TINY)
            statue = nxtobj(statue, ONAMES.STATUE, true);
    }
    /* when both corpse and statue are present, pick the uppermost one */
    if (corpse && statue) {
        if (nxtobj(statue, ONAMES.CORPSE, true) === corpse)
            corpse = null; /* corpse follows statue; ignore it */
        else
            statue = null; /* corpse precedes statue; ignore statue */
    }
    more_corpses = !!(corpse && nxtobj(corpse, ONAMES.CORPSE, true));

    /* additional stethoscope messages from jyoung@apanix.apana.org.au */
    if (!corpse && !statue) {
        ; /* nothing to do */

    } else if (Hallucination()) {
        if (!corpse) {
            /* it's a statue */
            buf = "You're both stoned";
        } else if (corpse.quan === 1 && !more_corpses) {
            let gndr = 2; /* neuter: "it" */
            const mtmp = get_mtraits(corpse, false);

            /* (most corpses don't retain the monster's sex, so
               we're usually forced to use generic pronoun here) */
            if (mtmp) {
                mtmp.data = game.mons[mtmp.mnum];
                gndr = pronoun_gender(mtmp, PRONOUN_NO_IT);
            } else {
                mptr = game.mons[corpse.corpsenm];
                if (is_female(mptr))
                    gndr = 1;
                else if (is_male(mptr))
                    gndr = 0;
            }
            buf = `${genders[gndr].he}'s dead`; /* "he"/"she"/"it" */
            buf = highc(buf[0]) + buf.slice(1);
        } else { /* plural */
            buf = "They're dead";
        }
        /* variations on "He's dead, Jim." (Star Trek's Dr McCoy) */
        await You_hear(`a voice say, "${buf}, Jim."`);
        resp.v = ECMD_TIME;
        return true;

    } else if (corpse) {
        const here = u_at(rx, ry),
              one = (corpse.quan === 1 && !more_corpses);
        let reviver = false;
        let visglyph;

        visglyph = glyph_at(rx, ry);
        /* corpseglyph = obj_to_glyph(corpse, rn2): the displayed glyph is
           compared by descriptor since our glyphs are not integers */
        const corpseglyph_shown = (visglyph.kind === 'obj' && visglyph.actual_otyp === ONAMES.CORPSE
                                   && visglyph.corpsenm === corpse.corpsenm);

        if (Blind() && !corpseglyph_shown)
            map_object(corpse, true);

        if (Role_if(PMNAMES.PM_HEALER)) {
            /* ok to reset `corpse' here; we're done with it */
            do {
                if (obj_has_timer(corpse, REVIVE_MON))
                    reviver = true;
                else
                    corpse = nxtobj(corpse, ONAMES.CORPSE, true);
            } while (corpse && !reviver);
        }
        await You(`determine that ${
            one ? (here ? 'this' : 'that') : (here ? 'these' : 'those')} unfortunate being${
            one ? '' : 's'} ${one ? 'is' : 'are'}${reviver ? ' mostly' : ''} dead.`);
        return true;

    } else { /* statue */
        let what, how;

        mptr = game.mons[statue.corpsenm];
        if (Blind()) { /* ignore statue->dknown; it'll always be set */
            buf = `${u_at(rx, ry) ? 'This' : 'That'} ${
                    humanoid(mptr) ? 'person' : 'creature'}`;
            what = buf;
        } else {
            what = obj_pmname(statue);
            if (!type_is_pname(mptr))
                what = The(what);
        }
        how = 'fine';
        if (Role_if(PMNAMES.PM_HEALER)) {
            const ttmp = t_at(rx, ry);

            if (ttmp && ttmp.ttyp === STATUE_TRAP)
                how = 'extraordinary';
            else if (Has_contents(statue))
                how = 'remarkable';
        }

        await pline(`${what} is in ${how} health for a statue.`);
        return true;
    }
    return false; /* no corpse or statue */
}

/* src/apply.c hollow_str[] */
const hollow_str = (what) => `a hollow sound.  This must be a secret ${what}!`;

// src/apply.c:318 use_stethoscope(); Strictly speaking it makes no sense for
// usage of a stethoscope to not take any time; however, unless it did, the
// stethoscope would be almost useless.  As a compromise, one use per turn is
// free, another uses up the turn; this makes curse status have a tangible
// effect.
async function use_stethoscope(obj) {
    let mtmp;
    let lev;
    let res;
    let rx, ry;
    const interference = (game.u.uswallow && is_whirly(game.u.ustuck.data)
                          && !rn2(Role_if(PMNAMES.PM_HEALER) ? 10 : 3));

    if (nohands(game.youmonst.data)) {
        await You('have no hands!'); /* not `body_part(HAND)' */
        return ECMD_OK;
    } else if (Deaf()) {
        await You_cant('hear anything!');
        return ECMD_OK;
    } else if (!freehand()) {
        await You(`have no free ${body_part(HAND)}.`);
        return ECMD_OK;
    }
    if (!(await getdir(null)))
        return ECMD_CANCEL;

    res = (game.hero_seq === game.context.stethoscope_seq) ? ECMD_TIME : ECMD_OK;
    game.context.stethoscope_seq = game.hero_seq;

    game.bhitpos = { x: game.u.ux, y: game.u.uy }; /* tentative, reset below */
    game.notonhead = !!game.u.uswallow;
    if (game.u.usteed && game.u.dz > 0) {
        if (interference) {
            await pline(`${Monnam(game.u.ustuck)} interferes.`);
            await mstatusline(game.u.ustuck);
        } else
            await mstatusline(game.u.usteed);
        return res;
    } else if (game.u.uswallow && (game.u.dx || game.u.dy || game.u.dz)) {
        await mstatusline(game.u.ustuck);
        return res;
    } else if (game.u.uswallow && interference) {
        await pline(`${Monnam(game.u.ustuck)} interferes.`);
        await mstatusline(game.u.ustuck);
        return res;
    } else if (game.u.dz) {
        const resbox = { v: res };
        if (Underwater()) {
            /* Soundeffect(se_faint_splashing, 35); */
            await You_hear('faint splashing.');
        } else if (game.u.dz < 0 || !can_reach_floor(true)) {
            await cant_reach_floor(game.u.ux, game.u.uy, (game.u.dz < 0), true, false);
        } else if (await its_dead(game.u.ux, game.u.uy, resbox)) {
            res = resbox.v; /* message already given */
        } else if (Is_stronghold(game.u.uz)) {
            /* Soundeffect(se_crackling_of_hellfire, 35); */
            await You_hear('the crackling of hellfire.');
        } else {
            await pline_The(`${surface(game.u.ux, game.u.uy)} seems healthy enough.`);
        }
        return res;
    } else if (obj.cursed && !rn2(2)) {
        /* Soundeffect(se_heart_beat, 100); */
        await You_hear('your heart beat.');
        return res;
    }
    confdir(false);
    if (!game.u.dx && !game.u.dy) {
        await ustatusline();
        return res;
    }
    rx = game.u.ux + game.u.dx;
    ry = game.u.uy + game.u.dy;
    if (!isok(rx, ry)) {
        /* Soundeffect(se_typing_noise, 100); */
        await You_hear('a faint typing noise.');
        return ECMD_OK;
    }
    if ((mtmp = m_at(rx, ry)) != null) {
        const mnm = x_monnam(mtmp, ARTICLE_A, null,
                             SUPPRESS_IT | SUPPRESS_INVISIBLE, false);

        /* gb.bhitpos needed by mstatusline() iff mtmp is a long worm */
        game.bhitpos = { x: rx, y: ry };
        game.notonhead = (mtmp.mx !== rx || mtmp.my !== ry);

        if (mtmp.mundetected) {
            if (!canspotmon(mtmp))
                await There(`is ${mnm} hidden there.`);
            mtmp.mundetected = 0;
            newsym(mtmp.mx, mtmp.my);
        } else if (mtmp.mappearance) {
            let what = 'thing';
            let use_plural = false;
            let odummy;

            switch (M_AP_TYPE(mtmp)) {
            case M_AP_OBJECT:
                /* FIXME?
                 *  we should probably be using object_from_map() here
                 */
                odummy = init_dummyobj({}, mtmp.mappearance, 1);
                /* simple_typename() yields "fruit" for any named fruit;
                   we want the same thing '//' or ';' shows: "slime mold"
                   or "grape" or "slice of pizza" */
                if (odummy.otyp === ONAMES.SLIME_MOLD && (mtmp.mextra && (mtmp.mextra.mcorpsenm ?? -1) !== -1)) {
                    odummy.spe = MCORPSENM(mtmp);
                    what = simpleonames(odummy);
                } else {
                    what = simple_typename(odummy.otyp);
                }
                use_plural = (is_boots(odummy) || is_gloves(odummy)
                              || odummy.otyp === ONAMES.LENSES);
                break;
            case M_AP_MONSTER: /* ignore Hallucination here */
                what = pmname(game.mons[mtmp.mappearance], Mgender(mtmp));
                break;
            case M_AP_FURNITURE:
                what = defsyms[mtmp.mappearance].explain;
                break;
            }
            seemimic(mtmp);
            await pline(`${use_plural ? 'Those' : 'That'} ${what} ${
                  use_plural ? 'are' : 'is'} really ${mnm}.`);
        } else if (game.flags?.verbose !== false && !canspotmon(mtmp)) {
            await There(`is ${mnm} there.`);
        }

        await mstatusline(mtmp);
        if (!canspotmon(mtmp))
            map_invisible(rx, ry);
        return res;
    }
    if (unmap_invisible(rx, ry))
        await pline_The('invisible monster must have moved.');

    lev = game.level.at(rx, ry);
    switch (lev.typ) {
    case SDOOR:
        /* Soundeffect(se_hollow_sound, 100); */
        await You_hear(hollow_str('door'));
        cvt_sdoor_to_door(lev); /* ->typ = DOOR */
        recalc_block_point(rx, ry);
        feel_newsym(rx, ry);
        return res;
    case SCORR:
        await You_hear(hollow_str('passage'));
        lev.typ = CORR, lev.flags = 0;
        unblock_point(rx, ry);
        feel_newsym(rx, ry);
        return res;
    }

    if (!(await its_dead(rx, ry, { v: res })))
        await You('hear nothing special.'); /* not You_hear()  */
    return res;
}

// src/apply.c:2511 figurine_location_checks(). A carried figurine can be
// activated only where its monster can physically fit.
async function figurine_location_checks(obj, x, y) {
    if (game.u.uswallow) {
        await You("don't have enough room in here.");
        return false;
    }
    if (!isok(x, y)) {
        await You('cannot put the figurine there.');
        return false;
    }

    const ptr = game.mons[obj.corpsenm];
    const typ = game.level.at(x, y).typ;
    if (IS_OBSTRUCTED(typ)
        && !(passes_walls(ptr) && may_passwall(x, y))) {
        await You(`cannot place a figurine in ${IS_TREE(typ)
            ? 'a tree' : 'solid rock'}!`);
        return false;
    }
    if (sobj_at(ONAMES.BOULDER, x, y) && !passes_walls(ptr)
        && !throws_rocks(ptr)) {
        await You('cannot fit the figurine on the boulder.');
        return false;
    }
    return true;
}

// src/apply.c:2544 use_figurine().
async function use_figurine(obj) {
    if (game.u.uswallow) {
        await figurine_location_checks(obj, game.u.ux, game.u.uy);
        return ECMD_OK;
    }
    if (!await getdir(null))
        return ECMD_CANCEL;

    const x = game.u.ux + game.u.dx;
    const y = game.u.uy + game.u.dy;
    if (!await figurine_location_checks(obj, x, y))
        return ECMD_TIME;

    let action;
    if (game.u.dx || game.u.dy)
        action = 'set the figurine beside you';
    else if (Is_airlevel(game.u.uz) || Is_waterlevel(game.u.uz)
             || is_pool(x, y))
        action = 'release the figurine';
    else if (game.u.dz < 0)
        action = 'toss the figurine into the air';
    else
        action = 'set the figurine on the ground';

    await You(`${action} and it ${Blind() ? 'supposedly ' : ''}transforms.`);
    const { make_familiar } = await import('./dog.js');
    await make_familiar(obj, x, y, false);
    useup(obj);
    if (Blind())
        map_invisible(x, y);
    return ECMD_TIME;
}

// src/apply.c:476 use_whistle().
async function use_whistle(obj) {
    if (!can_blow(game.youmonst)) {
        await You('are incapable of using the whistle.');
    } else if (Underwater()) {
        await You(`blow bubbles through ${yname(obj)}.`);
    } else {
        if (Deaf())
            await You_feel(`rushing air tickle your ${body_part(NOSE)}.`);
        else
            await You(`produce a ${obj.cursed ? 'shrill' : 'high'} whistling sound.`);
        /* Soundeffect(se_shrill_whistle, 50); */
        await wake_nearby(true);
        if (obj.cursed)
            vault_summon_gd();
    }
}

// src/apply.c:516 magic_whistled(). Relocate every tame companion next to the
// hero, identify an unknown whistle when the move is visible, and combine the
// relocation feedback once the whistle is already known.
async function magic_whistled(obj) {
    let buf, mnam = null,
        shiftbuf, appearbuf, disappearbuf;
    let oseen, nseen;
    const already_discovered = game.objects[obj.otyp].oc_name_known != 0;
    let omx, omy, shift = 0, appear = 0, disappear = 0, trapped = 0;

    /* stasis prevents magic-whistling */
    if ((game.level?.flags?.stasis_until ?? 0) >= game.moves)
        return;

    /* need to copy (up to 3) names as they're collected rather than just
       save pointers to them, otherwise churning through every mbuf[] might
       clobber the ones we care about */
    shiftbuf = appearbuf = disappearbuf = '';

    for (const mtmp of [...(game.level?.monsters || [])]) {
        /* nextmon = mtmp->nmon; trap might kill mon (the copied list) */
        if (DEADMONSTER(mtmp))
            continue;
        /* only tame monsters are affected;
           steed is already at your location, so not affected;
           this avoids trap issues if you're on a trap location */
        if (!mtmp.mtame || mtmp === game.u.usteed)
            continue;
        if (mtmp.mtrapped) {
            /* no longer in previous trap (affects mintrap) */
            mtmp.mtrapped = 0;
            await fill_pit(mtmp.mx, mtmp.my);
        }

        oseen = canspotmon(mtmp); /* old 'seen' status */
        if (oseen) /* get name in case it's one we'll remember */
            mnam = y_monnam(mtmp); /* before mnexto(); it might disappear */
        /* mimic must be revealed before we know whether it
           actually moves because line-of-sight may change */
        if (M_AP_TYPE(mtmp))
            seemimic(mtmp);
        omx = mtmp.mx, omy = mtmp.my;
        await mnexto(mtmp, !already_discovered ? RLOC_MSG : RLOC_NONE);

        if (mtmp.mx !== omx || mtmp.my !== omy) {
            if (mtmp.mundetected) { /* reveal non-mimic hider that moved */
                mtmp.mundetected = 0;
                newsym(mtmp.mx, mtmp.my);
            }
            /*
             * FIXME:
             *  All relocated monsters should change positions essentially
             *  simultaneously but we're dealing with them sequentially.
             *  That could kill some off in the process, each time leaving
             *  their target position (which should be occupied at least
             *  momentarily) available as a potential death trap for others.
             *
             *  Also, teleporting onto a trap introduces message sequencing
             *  issues.  We try to avoid the most obvious non sequiturs by
             *  checking whether pline() got called during mintrap().
             *  iflags.last_msg will be changed from the value we set here
             *  to PLNMSG_UNKNOWN in that situation.
             */
            const previousMessage = game._prevmsg; /* iflags.last_msg = PLNMSG_enum */
            if (await mintrap(mtmp, NO_TRAP_FLAGS) === Trap_Killed_Mon)
                change_luck(-1);
            if (game._prevmsg !== previousMessage) {
                ++trapped;
                continue;
            }
            /* dying while seen would have issued a message and not get here;
               being sent to an unseen location and dying there should be
               included in the disappeared case */
            nseen = DEADMONSTER(mtmp) ? false : canspotmon(mtmp);

            if (nseen) {
                mnam = y_monnam(mtmp);
                if (oseen) {
                    if (++shift === 1)
                        shiftbuf = `${mnam} shifts location`;
                } else {
                    if (++appear === 1)
                        appearbuf = `${mnam} appears`;
                }
            } else if (oseen) {
                if (++disappear === 1)
                    disappearbuf = `${mnam} disappears`;
            }
        }
    }

    /*
     * If any pets changed location, (1) they might have been in view
     * before and still in view after, (2) out of view before but in
     * view after, (3) in view before but out of view after (perhaps
     * on the far side of a boulder/door/wall), or (4) out of view
     * before and still out of view after.  The first two cases are
     * the usual ones; the fourth will happen if the hero can't see.
     *
     * If the magic whistle hasn't been discovered yet, rloc() issued
     * any applicable vanishing and/or appearing messages, and we make
     * it become discovered now if any pets moved within or into view.
     * If it has already been discovered, we told rloc() not to issue
     * messages and will issue one cumulative message now (for any of
     * the first three cases, not the fourth) to reduce verbosity for
     * the first case of a single pet (avoid "vanishes and reappears")
     * and greatly reduce verbosity for multiple pets regardless of
     * each one's case.
     */
    buf = '';
    if (!already_discovered) {
        /* message(s) were handled by rloc(); if only noticeable change was
           pet(s) disappearing, the magic whistle won't become discovered */
        if (shift + appear + trapped > 0)
            makeknown(obj.otyp);
    } else {
        /* could use array of cardinal number names like wishcmdassist() but
           extra precision above 3 or 4 seems pedantic; not used for 0 or 1 */
        const HowMany = (n) => (((n) < 2) ? 'sqrt(-1)'
                                : ((n) === 2) ? 'two'
                                  : ((n) === 3) ? 'three'
                                    : ((n) === 4) ? 'four'
                                      : ((n) <= 7) ? 'several'
                                        : 'many');
        /* magic whistle is already discovered so rloc() message(s)
           were suppressed above; if any discernible relocation occurred,
           construct a message now and issue it below */
        if (shift > 0) {
            if (shift > 1)
                shiftbuf = `${HowMany(shift)} creatures shift locations`;
            buf = upstart(shiftbuf);
        }
        if (appear > 0) {
            if (appear > 1)
                /* shift==0: N creatures appear;
                   shift==1: Foo shifts location and N other creatures appear;
                   shift >1: M creatures shift locations and N others appear */
                appearbuf = `${HowMany(appear)} ${
                        (shift === 0) ? 'creatures'
                        : (shift === 1) ? 'other creatures'
                          : 'others'} appear`;
            if (shift === 0)
                buf = upstart(appearbuf);
            else
                buf += `${
                         /* to get here:  appear > 0 and shift != 0,
                            so "shifters, appearers" if disappear != 0
                            with ", and disappearers" yet to be appended,
                            or "shifters and appearers" otherwise */
                         disappear ? ',' : ' and'} ${appearbuf}`;
        }
        if (disappear > 0) {
            if (disappear > 1)
                disappearbuf = `${HowMany(disappear)} ${
                        (shift === 0 && appear === 0) ? 'creatures'
                        : (shift < 2 && appear < 2) ? 'other creatures'
                          : 'others'} disappear`;
            if (shift + appear === 0)
                buf = upstart(disappearbuf);
            else
                buf += `${(shift && appear) ? ',' : ''} and ${disappearbuf}`;
        }
    }
    if (buf)
        await pline(`${buf}.`);
    return;
}

// src/apply.c:495 use_magic_whistle().
async function use_magic_whistle(obj) {
    if (!can_blow(game.youmonst)) {
        await You('are incapable of using the whistle.');
    } else if (obj.cursed && !rn2(2)) {
        await You(`produce a ${Underwater() ? 'very ' : ''}high-${
            Deaf() ? 'frequency vibration' : 'pitched humming noise'}.`);
        await wake_nearby(true);
        if (!rn2(2) && !noteleport_level(game.youmonst))
            await tele_to_rnd_pet();
    } else {
        /* it's magic!  it works underwater too (at a higher pitch) */
        const kind = Hallucination() ? 'normal'
                     : (Underwater() && !Deaf()) ? 'strange, high-pitched'
                       : 'strange';
        await You(Deaf() ? `produce a ${kind}, sharp vibration.`   /* alt_whistle_str */
                         : `produce a ${kind} whistling sound.`);  /* whistle_str */
        /* Soundeffect(se_shrill_whistle, 80); */
        await magic_whistled(obj);
    }
}

// src/makemon.c:1471 the arrival message makemon() prints; our makemon()
// is synchronous so the callers that create visible monsters print it
async function bagotricks_arrival(mtmp) {
    let what = null;
    /* MM_NOEXCLAM is used for #wizgenesis (^G) */
    let exclaim = true;

    if ((canseemon(mtmp) && (M_AP_TYPE(mtmp) === M_AP_NOTHING
                             || M_AP_TYPE(mtmp) === M_AP_MONSTER))
        || sensemon(mtmp)) {
        what = Amonnam(mtmp);
        if (M_AP_TYPE(mtmp) === M_AP_MONSTER)
            exclaim = true;
    } else if (canseemon(mtmp)) {
        /* mimic masquerading as furniture or object and not sensed */
        what = upstart(mhidden_description(mtmp, MHID_ARTICLE | MHID_ALTMON));
    }
    if (what) {
        set_msg_xy(mtmp.mx, mtmp.my);
        await Norep(`${what}${exclaim ? ' suddenly' : ''} ${
              /* 'what' might be "gold pieces" so need plural verb */
              vtense(what, 'appear')}${
              next2u(mtmp.mx, mtmp.my) ? ' next to you'
              : (distu(mtmp.mx, mtmp.my) <= (BOLT_LIM * BOLT_LIM)) ? ' close by'
                : ''}${exclaim ? '!' : '.'}`);
    }
    return ((canseemon(mtmp) && (M_AP_TYPE(mtmp) === M_AP_NOTHING
                                 || M_AP_TYPE(mtmp) === M_AP_MONSTER))
            || sensemon(mtmp));
}

// src/makemon.c:2554 bagotricks(), for applying or tipping one charge.
export async function bagotricks(bag, tipping = false, seenState = null) {
    let moncount = 0;

    if (bag.spe < 1) {
        await pline(tipping && bag.cknown ? "It's empty." : nothing_happens);
        if (bag.dknown && game.objects[bag.otyp].oc_name_known) {
            bag.cknown = 1;
            update_inventory();
        }
        return moncount;
    }

    await consume_obj_charge(bag, !tipping);

    let creatcnt = 1, seecount = 0;
    if (!rn2(23))
        creatcnt += rnd(7);
    do {
        const oldIds = new Set((game.level?.monsters || []).map((m) => m.m_id));
        const mtmp = makemon(null, game.u.ux, game.u.uy, NO_MM_FLAGS);
        if (mtmp) {
            moncount++;
            const made = (game.level?.monsters || [])
                .filter((m) => !oldIds.has(m.m_id) && m !== mtmp)
                .reverse();
            made.push(mtmp);
            let primaryDiscerned = false;
            for (const arrival of made) {
                const discerned = await bagotricks_arrival(arrival);
                if (arrival === mtmp)
                    primaryDiscerned = discerned;
            }
            if (primaryDiscerned)
                seecount++;
        }
    } while (--creatcnt > 0);

    if (seecount) {
        if (seenState)
            seenState.count += seecount;
        if (bag.dknown) {
            makeknown(ONAMES.BAG_OF_TRICKS);
            update_inventory();
        }
    } else if (!tipping) {
        await pline(moncount ? nothing_seems_to_happen : nothing_happens);
    }
    return moncount;
}

// src/mkobj.c:2847 hornoplenty(), for applying one charge. Tipping sends the
// created object to the floor and defers the horn's usage fee to the caller.
export async function hornoplenty(horn, tipping = false) {
    if (horn.spe < 1) {
        await pline(nothing_happens);
        if (!horn.cknown) {
            horn.cknown = 1;
            update_inventory();
        }
        return 0;
    }

    if (horn.unpaid && !tipping) {
        const { check_unpaid } = await import('./shk.js');
        await check_unpaid(horn);
    }
    horn.spe--;
    if (horn.known)
        update_inventory();

    let obj, what;
    if (!rn2(13)) {
        obj = mkobj(OCLASSES.POTION_CLASS, false);
        if (game.objects[obj.otyp].oc_magic) {
            do {
                obj.otyp = rnd_class(ONAMES.POT_BOOZE, ONAMES.POT_WATER);
            } while (obj.otyp === ONAMES.POT_SICKNESS);
            if (obj.otyp === ONAMES.POT_OIL)
                obj.age = MAX_OIL_IN_FLASK;
        }
        what = obj.quan > 1 ? 'Some potions' : 'A potion';
    } else {
        obj = mkobj(OCLASSES.FOOD_CLASS, false);
        if (obj.otyp === ONAMES.FOOD_RATION && !rn2(7))
            obj.otyp = ONAMES.LUMP_OF_ROYAL_JELLY;
        what = 'Some food';
    }

    await pline(`${what} ${vtense(what, 'spill')} out.`);
    obj.blessed = horn.blessed;
    obj.cursed = horn.cursed;
    obj.owt = weight(obj);

    if (horn.unpaid) {
        const { addtobill } = await import('./shk.js');
        await addtobill(obj, false, false, true);
    }

    if (tipping) {
        game.iflags.suppress_price = (game.iflags.suppress_price || 0) + 1;
        const name = doname(obj);
        game.iflags.suppress_price -= 1;
        await pline(`${upstart(name)} ${otense(obj, 'drop')} to the ${
            surface(game.u.ux, game.u.uy)}.`);
        place_object(obj, game.u.ux, game.u.uy);
        stackobj(obj);
        if (horn.dknown)
            makeknown(ONAMES.HORN_OF_PLENTY);
        return 1;
    }

    const typ = game.level.at(game.u.ux, game.u.uy).typ;
    const dropFmt = game.u.uswallow
        ? 'Oops!  %s out of your reach!'
        : (Is_airlevel(game.u.uz) || Is_waterlevel(game.u.uz)
           || typ < IRONBARS || typ >= ICE)
            ? 'Oops!  %s away from you!'
            : 'Oops!  %s to the floor!';
    await hold_another_object(obj, dropFmt, The(aobjnam(obj, 'slip')), null);

    if (horn.dknown)
        makeknown(ONAMES.HORN_OF_PLENTY);
    return 1;
}

// src/apply.c:2259 use_unicorn_horn(). A cursed horn adds one random timed
// ailment. A noncursed horn shuffles the timed ailments and cures a random
// prefix, with a blessed horn able to cure more of them.
export async function use_unicorn_horn(obj) {
    const u = game.u;
    const intr = (u.intrinsic ||= {});
    const props = (u.uprops ||= {});
    const {
        make_blinded, make_confused, make_deaf, make_hallucinated,
        make_sick, make_stunned, make_vomiting,
    } = await import('./potion.js');

    if (obj.cursed) {
        const lcount = rn1(90, 10);

        switch (Math.trunc(rn2(13) / 2)) {
        case 0: {
            const sick = (props.SICK | 0) & TIMEOUT;
            await make_sick(sick ? Math.trunc(sick / 3) + 1
                                 : rn1(ACURR(A_CON), 20),
                            xname(obj), true, SICK_NONVOMITABLE);
            break;
        }
        case 1:
            await make_blinded(((intr.HBlinded | 0) & TIMEOUT) + lcount,
                               true);
            break;
        case 2:
            if (!(intr.HConfusion || props.CONFUSION))
                await You(`suddenly feel ${Hallucination() ? 'trippy'
                                                           : 'confused'}.`);
            await make_confused(((intr.HConfusion | 0) & TIMEOUT) + lcount,
                                true);
            break;
        case 3:
            await make_stunned(((intr.HStun | 0) & TIMEOUT) + lcount, true);
            break;
        case 4:
            if (props.VOMITING) {
                const { vomit } = await import('./eat.js');
                await vomit();
            } else {
                await make_vomiting(14, false);
            }
            break;
        case 5:
            await make_hallucinated(
                ((intr.HHallucination | 0) & TIMEOUT) + lcount, true, 0);
            break;
        case 6:
            if (Deaf())
                await pline(nothing_seems_to_happen);
            await make_deaf(((intr.HDeaf | 0) & TIMEOUT) + lcount, true);
            break;
        }
        return;
    }

    const timed_trouble = (value) => {
        value = Number(value) || 0;
        return value && !(value & ~TIMEOUT) ? value & TIMEOUT : 0;
    };
    const trouble = [];
    if (timed_trouble(props.SICK))
        trouble.push('sick');

    const stuckData = u.ustuck?.data ?? game.mons?.[u.ustuck?.mnum];
    const swallowedBlindAttack = u.uswallow && stuckData
        && attacktype_fordmg(stuckData, ATTKS.AT_ENGL, ATTKS.AD_BLND);
    if (timed_trouble(intr.HBlinded) > (u.ucreamed || 0)
        && !swallowedBlindAttack)
        trouble.push('blinded');
    if (timed_trouble(intr.HHallucination))
        trouble.push('hallucinating');
    if (timed_trouble(props.VOMITING))
        trouble.push('vomiting');
    if (timed_trouble(intr.HConfusion))
        trouble.push('confused');
    if (timed_trouble(intr.HStun))
        trouble.push('stunned');
    if (timed_trouble(intr.HDeaf))
        trouble.push('deaf');

    if (!trouble.length) {
        await pline(nothing_happens);
        return;
    }
    for (let i = trouble.length - 1; i > 0; i--) {
        const iswap = rn2(i + 1);
        if (iswap !== i)
            [trouble[i], trouble[iswap]] = [trouble[iswap], trouble[i]];
    }

    let val_limit = rn2(d(2, obj.blessed ? 4 : 2));
    if (val_limit > trouble.length)
        val_limit = trouble.length;

    for (let val = 0; val < val_limit; val++) {
        switch (trouble[val]) {
        case 'sick':
            await make_sick(0, null, true, SICK_ALL);
            break;
        case 'blinded':
            await make_blinded(u.ucreamed || 0, true);
            break;
        case 'hallucinating':
            await make_hallucinated(0, true, 0);
            break;
        case 'vomiting':
            await make_vomiting(0, true);
            break;
        case 'confused':
            await make_confused(0, true);
            break;
        case 'stunned':
            await make_stunned(0, true);
            break;
        case 'deaf':
            await make_deaf(0, true);
            break;
        }
    }

    if (val_limit)
        (game.disp ||= {}).botl = true;
    else
        await pline(nothing_seems_to_happen);
}

// src/apply.c doapply() — the 'a' command.
export async function doapply() {
    let obj;
    let res = ECMD_TIME;

    if (nohands(game.youmonst.data)) {
        await You("aren't able to use or apply tools in your current form.");
        return ECMD_OK;
    }
    if (await check_capacity(null))
        return ECMD_OK;

    obj = await getobj('use or apply', apply_ok, GETOBJ_NOFLAGS);
    if (!obj)
        return ECMD_CANCEL;

    if (!await retouch_object(obj, false))
        return ECMD_TIME; /* evading your grasp costs a turn; just be
                             grateful that you don't drop it as well */

    if (obj.oclass === OCLASSES.WAND_CLASS)
        return await do_break_wand(obj);

    if (obj.oclass === OCLASSES.SPBOOK_CLASS)
        return await flip_through_book(obj);

    if (obj.oclass === OCLASSES.COIN_CLASS)
        return await flip_coin(obj);

    switch (obj.otyp) {
    case ONAMES.BLINDFOLD:
    case ONAMES.LENSES:
        if (obj === game.u.ublindf) {
            if (!(await cursed(obj)))
                await Blindf_off(obj);
        } else if (!game.u.ublindf) {
            await Blindf_on(obj);
        } else {
            await You(`are already ${
                (game.u.ublindf.otyp === ONAMES.TOWEL) ? 'covered by a towel'
                : (game.u.ublindf.otyp === ONAMES.BLINDFOLD) ? 'wearing a blindfold'
                  : 'wearing lenses'}.`);
        }
        break;
    case ONAMES.CREAM_PIE:
        res = await use_cream_pie(obj);
        obj = null;
        break;
    case ONAMES.LUMP_OF_ROYAL_JELLY:
        res = await use_royal_jelly(obj);
        break;
    case ONAMES.BULLWHIP:
        res = await use_whip(obj);
        break;
    case ONAMES.GRAPPLING_HOOK:
        res = await use_grapple(obj);
        break;
    case ONAMES.LARGE_BOX:
    case ONAMES.CHEST:
    case ONAMES.ICE_BOX:
    case ONAMES.SACK:
    case ONAMES.BAG_OF_HOLDING:
    case ONAMES.OILSKIN_SACK: {
        const { use_container } = await import('./pickup.js');
        res = await use_container(obj, true, false);
        break;
    }
    case ONAMES.BAG_OF_TRICKS:
        await bagotricks(obj, false, null);
        break;
    case ONAMES.CAN_OF_GREASE:
        res = await use_grease(obj);
        break;
    case ONAMES.LOCK_PICK:
    case ONAMES.CREDIT_CARD:
    case ONAMES.SKELETON_KEY:
        res = ((await pick_lock(obj, 0, 0, null)) !== 0) ? ECMD_TIME : ECMD_OK;
        break;
    case ONAMES.PICK_AXE:
    case ONAMES.DWARVISH_MATTOCK:
        res = await use_pick_axe(obj);
        break;
    case ONAMES.TINNING_KIT:
        await use_tinning_kit(obj);
        break;
    case ONAMES.LEASH:
        res = await use_leash(obj);
        break;
    case ONAMES.SADDLE:
        res = await use_saddle(obj);
        break;
    case ONAMES.MAGIC_WHISTLE:
        await use_magic_whistle(obj);
        break;
    case ONAMES.TIN_WHISTLE:
        await use_whistle(obj);
        break;
    case ONAMES.EUCALYPTUS_LEAF:
        /* MRKR: Every Australian knows that a gum leaf makes an excellent
         * whistle, especially if your pet is a tame kangaroo named Skippy.
         */
        if (obj.blessed) {
            await use_magic_whistle(obj);
            /* sometimes the blessing will be worn off */
            if (!rn2(49)) {
                if (!Blind()) {
                    await pline(`${Yobjnam2(obj, 'glow')} ${hcolor('brown')}.`);
                    set_bknown(obj, 1);
                }
                unbless(obj);
            }
        } else {
            await use_whistle(obj);
        }
        break;
    case ONAMES.STETHOSCOPE:
        res = await use_stethoscope(obj);
        break;
    case ONAMES.MIRROR:
        res = await use_mirror(obj);
        break;
    case ONAMES.BELL:
    case ONAMES.BELL_OF_OPENING: {
        const pobj = { obj };
        await use_bell(pobj);
        obj = pobj.obj;
        break;
    }
    case ONAMES.CANDELABRUM_OF_INVOCATION:
        await use_candelabrum(obj);
        break;
    case ONAMES.WAX_CANDLE:
    case ONAMES.TALLOW_CANDLE: {
        const pobj = { obj };
        await use_candle(pobj);
        obj = pobj.obj;
        break;
    }
    case ONAMES.OIL_LAMP:
    case ONAMES.MAGIC_LAMP:
    case ONAMES.BRASS_LANTERN:
        await use_lamp(obj);
        break;
    case ONAMES.POT_OIL: {
        const pobj = { obj };
        await light_cocktail(pobj);
        obj = pobj.obj;
        break;
    }
    case ONAMES.EXPENSIVE_CAMERA:
        res = await use_camera(obj);
        break;
    case ONAMES.TOWEL:
        res = await use_towel(obj);
        break;
    case ONAMES.CRYSTAL_BALL:
        await use_crystal_ball(obj);
        break;
    case ONAMES.MAGIC_MARKER:
        res = await dowrite(obj);
        break;
    case ONAMES.TIN_OPENER:
        res = await use_tin_opener(obj);
        break;
    case ONAMES.FIGURINE:
        res = await use_figurine(obj);
        break;
    case ONAMES.UNICORN_HORN:
        await use_unicorn_horn(obj);
        break;
    case ONAMES.WOODEN_FLUTE:
    case ONAMES.MAGIC_FLUTE:
    case ONAMES.TOOLED_HORN:
    case ONAMES.FROST_HORN:
    case ONAMES.FIRE_HORN:
    case ONAMES.WOODEN_HARP:
    case ONAMES.MAGIC_HARP:
    case ONAMES.BUGLE:
    case ONAMES.LEATHER_DRUM:
    case ONAMES.DRUM_OF_EARTHQUAKE: {
        const { do_play_instrument } = await import('./music.js');
        res = await do_play_instrument(obj);
        break;
    }
    case ONAMES.HORN_OF_PLENTY: /* not a musical instrument */
        await hornoplenty(obj, false);
        break;
    case ONAMES.LAND_MINE:
    case ONAMES.BEARTRAP:
        await use_trap(obj);
        if (game.occupation === set_trap)
            obj = null; /* not gone yet but behave as if it was */
        break;
    case ONAMES.FLINT:
    case ONAMES.LUCKSTONE:
    case ONAMES.LOADSTONE:
    case ONAMES.TOUCHSTONE:
        res = await use_stone(obj);
        break;
    case ONAMES.BANANA:
        if (Hallucination()) {
            await pline('It rings! ... But no-one answers.');
            break;
        }
        /*FALLTHRU*/
    default:
        /* Pole-weapons can strike at a distance */
        if (is_pole(obj)) {
            res = await use_pole(obj, false);
            break;
        } else if (is_pick(obj) || is_axe(obj)) {
            res = await use_pick_axe(obj);
            break;
        }
        await pline("Sorry, I don't know how to use that.");
        return ECMD_FAIL;
    }
    /* This assumes that anything that potentially destroyed obj has kept
     * track of it and set obj to null before this point. */
    if (obj && obj.oartifact) {
        res |= await arti_speak(obj); /* sets ECMD_TIME bit if artifact speaks */
    }
    return res;
}


/* src/apply.c:1854 enum jump_trajectory */
const jAny = 0, /* any direction => magical jump */
      jHorz = 1,
      jVert = 2,
      jDiag = 3; /* jHorz|jVert */

// src/apply.c:1862 check_jump(); callback routine for walk_path()
function check_jump(arg, x, y) {
    const traj = arg;
    const lev = game.level.at(x, y);

    if (Passes_walls())
        return true;
    if (IS_STWALL(lev.typ))
        return false;
    if (IS_DOOR(lev.typ)) {
        if (closed_door(x, y))
            return false;
        if ((lev.doormask & D_ISOPEN) !== 0 && traj !== jAny
            /* reject diagonal jump into or out-of or through open door */
            && (traj === jDiag
                /* reject horizontal jump through horizontal open door
                   and non-horizontal (ie, vertical) jump through
                   non-horizontal (vertical) open door */
                || ((traj & jHorz) !== 0) === !!lev.horizontal))
            return false;
        /* empty doorways aren't restricted */
    }
    /* let giants jump over boulders (what about Flying?
       and is there really enough head room for giants to jump
       at all, let alone over something tall?) */
    if (sobj_at(ONAMES.BOULDER, x, y) && !throws_rocks(game.youmonst.data))
        return false;
    return true;
}

// src/apply.c:1893 is_valid_jump_pos()
export async function is_valid_jump_pos(x, y, magic, showmsg) {
    if (!magic && !((game.u.intrinsic?.HJumping ?? 0) & ~INTRINSIC)
        && !game.u.uprops?.JUMPING && distu(x, y) !== 5) {
        /* The Knight jumping restriction still applies when riding a
         * horse.  After all, what shape is the knight piece in chess?
         */
        if (showmsg)
            await pline('Illegal move!');
        return false;
    } else if (distu(x, y) > (magic ? 6 + magic * 3 : 9)) {
        if (showmsg)
            await pline('Too far!');
        return false;
    } else if (!isok(x, y)) {
        if (showmsg)
            await You('cannot jump there!');
        return false;
    } else if (!cansee(x, y)) {
        if (showmsg)
            await You('cannot see where to land!');
        return false;
    } else {
        const uc = {}, tc = {};
        const lev = game.level.at(game.u.ux, game.u.uy);
        /* we want to categorize trajectory for use in determining
           passage through doorways: horizontal, vertical, or diagonal;
           since knight's jump and other irregular directions are
           possible, we flatten those out to simplify door checks */
        let diag, traj;
        const dx = x - game.u.ux, dy = y - game.u.uy;
        let ax = Math.abs(dx), ay = Math.abs(dy);

        /* diag: any non-orthogonal destination classified as diagonal */
        diag = (magic || Passes_walls() || (!dx && !dy)) ? jAny
               : !dy ? jHorz : !dx ? jVert : jDiag;
        /* traj: flatten out the trajectory => some diagonals re-classified */
        if (ax >= 2 * ay)
            ay = 0;
        else if (ay >= 2 * ax)
            ax = 0;
        traj = (magic || Passes_walls() || (!ax && !ay)) ? jAny
               : !ay ? jHorz : !ax ? jVert : jDiag;
        /* walk_path doesn't process the starting spot;
           this is iffy:  if you're starting on a closed door spot,
           you _can_ jump diagonally from doorway (without needing
           Passes_walls); that's intentional but is it correct? */
        if (diag === jDiag && IS_DOOR(lev.typ)
            && (lev.doormask & D_ISOPEN) !== 0
            && (traj === jDiag
                || ((traj & jHorz) !== 0) === !!lev.horizontal)) {
            if (showmsg)
                await You_cant('jump diagonally out of a doorway.');
            return false;
        }
        uc.x = game.u.ux, uc.y = game.u.uy;
        tc.x = x, tc.y = y; /* target */
        if (!(await walk_path(uc, tc, check_jump, traj))) {
            if (showmsg)
                await There('is an obstacle preventing that jump.');
            return false;
        }
    }
    return true;
}

// src/apply.c:1959 get_valid_jump_position()
export async function get_valid_jump_position(x, y) {
    return (isok(x, y)
            && (ACCESSIBLE(game.level.at(x, y).typ) || Passes_walls())
            && await is_valid_jump_pos(x, y, game.jumping_is_magic, false));
}

// src/apply.c:726 m_unleash(), release a monster from its leash.
export async function m_unleash(mtmp, feedback) {
    let otmp;

    if (feedback) {
        if (canseemon(mtmp))
            await pline_mon(mtmp, `${Monnam(mtmp)} pulls free of ${mhis(mtmp)} leash!`);
        else
            await Your('leash falls slack.');
    }
    if ((otmp = get_mleash(mtmp)) != null) {
        otmp.leashmon = 0;
        update_inventory();
    }
    mtmp.mleashed = 0;
}

/* include/hack.h:1236 Maybe_Half_Phys() */
const Maybe_Half_Phys = (dmg) =>
    (!!(game.u.intrinsic?.HHalf_physical_damage || game.u.uprops?.HALF_PHDAM)
     ? Math.trunc((dmg + 1) / 2) : dmg);

/* src/apply.c static strings shared by use_pole() and use_grapple() */
const not_enough_room = "There's not enough room here to use that.",
      where_to_hit = 'Where do you want to hit?',
      cant_see_spot = "won't hit anything if you can't see that spot.",
      cant_reach = "can't reach that spot from here.";

/* src/apply.c glyph_is_poleable() */
const glyph_is_poleable = (G) =>
    (glyph_is_monster(G) || glyph_is_invisible(G) || glyph_is_statue(G));

// src/apply.c:3341 find_poleable_mon(); find pos of monster in range, if
// only one monster
function find_poleable_mon(pos) {
    let mtmp;
    const mpos = { x: 0, y: 0 }; /* no candidate location yet */
    let impaired;
    let x, y, lo_x, hi_x, lo_y, hi_y, rt;
    let glyph;

    impaired = (Confusion() || Stunned() || Hallucination());
    rt = isqrt(game.polearm_range_max);
    lo_x = Math.max(game.u.ux - rt, 1), hi_x = Math.min(game.u.ux + rt, COLNO - 1);
    lo_y = Math.max(game.u.uy - rt, 0), hi_y = Math.min(game.u.uy + rt, ROWNO - 1);
    for (x = lo_x; x <= hi_x; ++x) {
        for (y = lo_y; y <= hi_y; ++y) {
            if (!get_valid_polearm_position(x, y))
                continue;
            glyph = glyph_at(x, y);
            if (!impaired
                && glyph_is_monster(glyph)
                && (mtmp = m_at(x, y)) != null
                && (mtmp.mtame || (mtmp.mpeaceful && game.flags?.confirm !== false)))
                continue;
            if (glyph_is_poleable(glyph)
                && (!glyph_is_statue(glyph) || impaired)) {
                if (mpos.x)
                    return false; /* more than one candidate location */
                mpos.x = x, mpos.y = y;
            }
        }
    }
    if (!mpos.x)
        return false; /* no candidate location */
    pos.x = mpos.x, pos.y = mpos.y;
    return true;
}

// src/apply.c:3377 get_valid_polearm_position()
function get_valid_polearm_position(x, y) {
    let glyph;

    glyph = glyph_at(x, y);

    return (isok(x, y) && distu(x, y) >= game.polearm_range_min
            && distu(x, y) <= game.polearm_range_max
            && (cansee(x, y) || (couldsee(x, y)
                                 && glyph_is_poleable(glyph))));
}

// src/apply.c:3391 display_polearm_positions(); getpos_sethilite() marks the
// valid squares from the validator, so tmp_at() has no work here
function display_polearm_positions(on_off) {
    let x, y, dx, dy;

    if (on_off) {
        /* on: tmp_at(DISP_BEAM, cmap_to_glyph(S_goodpos)) */
        for (dx = -3; dx <= 3; dx++)
            for (dy = -3; dy <= 3; dy++) {
                x = dx + game.u.ux;
                y = dy + game.u.uy;
                if (get_valid_polearm_position(x, y)) {
                    /* tmp_at(x, y) */
                }
            }
    } else {
        /* off: tmp_at(DISP_END, 0) */
    }
}

// src/apply.c:3427 calc_pole_range(); Calculate allowable range (pole's
// reach is always 2 steps):
//  unskilled and basic: orthogonal direction, 4..4;
//  skilled: as basic, plus knight's jump position, 4..5;
//  expert: as skilled, plus diagonal, 4..8.
function calc_pole_range() {
    const typ = uwep_skill_type();
    let min_range, max_range;

    min_range = 4;
    if (typ === P_NONE || P_SKILL(typ) <= P_BASIC)
        max_range = 4;
    else if (P_SKILL(typ) === P_SKILLED)
        max_range = 5;
    else
        max_range = 8; /* (P_SKILL(typ) >= P_EXPERT) */

    game.polearm_range_min = min_range;
    game.polearm_range_max = max_range;
    return { min_range, max_range };
}

// src/apply.c:3447 could_pole_mon(); return TRUE if hero is wielding a
// polearm and there's at least one monster they could hit with it
export function could_pole_mon() {
    let cc;
    const hitm = game.context?.polearm?.hitmon;

    if (!game.u.uwep || !is_pole(game.u.uwep))
        return false;

    const { min_range, max_range } = calc_pole_range();

    cc = { x: game.u.ux, y: game.u.uy };
    if (!find_poleable_mon(cc)) {
        if (hitm && !DEADMONSTER(hitm) && sensemon(hitm)
            && mdistu(hitm) <= max_range && mdistu(hitm) >= min_range)
            return true;
    } else {
        return true;
    }
    return false;
}

// src/apply.c:3470 snickersnee_used_dist_attk(); was Snickersnee used to
// attack at distance this turn already?
function snickersnee_used_dist_attk(obj) {
    if (obj && obj === game.u.uwep && u_wield_art(ART_SNICKERSNEE)
        && game.context?.snickersnee_turn === game.moves)
        return true;
    return false;
}

// src/apply.c:3426 use_pole(); Distance attacks by pole-weapons
async function use_pole(obj, autohit) {
    const thump = (what) => `Thump!  Your blow bounces harmlessly off the ${what}.`;
    let res = ECMD_OK, max_range, min_range, glyph;
    const cc = { x: 0, y: 0 };
    let mtmp;
    const hitm = game.context?.polearm?.hitmon;
    let freehit = false;

    /* Are you allowed to use the pole? */
    if (game.u.uswallow) {
        await pline(not_enough_room);
        return ECMD_OK;
    }
    if (obj !== game.u.uwep) {
        if (await wield_tool(obj, 'swing')) {
            cmdq_add_ec(CQ_CANNED, doapply);
            cmdq_add_key(CQ_CANNED, obj.invlet);
            return ECMD_TIME;
        }
        return ECMD_OK;
    }
    /* assert(obj == uwep); */

    ({ min_range, max_range } = calc_pole_range());

    /* Prompt for a location */
    if (!autohit)
        await pline(where_to_hit);
    cc.x = game.u.ux;
    cc.y = game.u.uy;
    if (!find_poleable_mon(cc) && hitm
        && !DEADMONSTER(hitm) && sensemon(hitm)
        && mdistu(hitm) <= max_range && mdistu(hitm) >= min_range) {
        cc.x = hitm.mx;
        cc.y = hitm.my;
    }
    if (!autohit) {
        await getpos_sethilite(display_polearm_positions,
                               get_valid_polearm_position);
        if (await getpos(cc, true, 'the spot to hit') < 0)
            /* ESC; uses turn iff polearm became wielded */
            return (res | ECMD_CANCEL);
    }

    glyph = glyph_at(cc.x, cc.y);
    if (distu(cc.x, cc.y) > max_range) {
        await pline('Too far!');
        return ECMD_FAIL;
    } else if (distu(cc.x, cc.y) < min_range) {
        if (autohit && u_at(cc.x, cc.y))
            await pline("Don't know what to hit.");
        else
            await pline('Too close!');
        return ECMD_FAIL;
    } else if (!cansee(cc.x, cc.y) && !glyph_is_poleable(glyph)) {
        await You(cant_see_spot);
        return ECMD_FAIL;
    } else if (!couldsee(cc.x, cc.y)) { /* Eyes of the Overworld */
        await You(cant_reach);
        return ECMD_FAIL;
    }

    ((game.context ||= {}).polearm ||= {}).hitmon = null;
    /* Attack the monster there */
    game.bhitpos = { x: cc.x, y: cc.y };
    if ((mtmp = m_at(game.bhitpos.x, game.bhitpos.y)) != null) {
        if (await attack_checks(mtmp, game.u.uwep)) /* can attack proceed? */
            /* no, abort the attack attempt; result depends on
               res: 1 => polearm became wielded, 0 => already wielded;
               svc.context.move: 1 => discovered hidden monster at target spot,
               0 => answered 'n' to "Really attack?" prompt */
            return res | (game.context.move ? ECMD_TIME : ECMD_OK);
        if (await overexertion())
            return ECMD_TIME; /* burn nutrition; maybe pass out */
        game.context.polearm.hitmon = mtmp;

        if (snickersnee_used_dist_attk(obj)) {
            await pline_The("blade doesn't reach there!");
            return ECMD_FAIL;
        }

        await check_caitiff(mtmp);
        game.notonhead = (game.bhitpos.x !== mtmp.mx || game.bhitpos.y !== mtmp.my);

        /* Snickersnee allows one free hit from a distance per turn */
        if (obj === game.u.uwep && u_wield_art(ART_SNICKERSNEE)) {
            freehit = (game.moves !== game.context.snickersnee_turn);
            game.context.snickersnee_turn = game.moves;
            if (freehit && !Deaf()) {
                /* Soundeffect(se_sword_blade_rings, 100); */
                await pline('Shkinng!'); /* /sha-kin!/ */
            }
        }

        await thitmonst(mtmp, game.u.uwep);
    } else if (glyph_is_statue(glyph) /* might be hallucinatory */
               && sobj_at(ONAMES.STATUE, game.bhitpos.x, game.bhitpos.y)) {
        const t = t_at(game.bhitpos.x, game.bhitpos.y);

        if (t && t.ttyp === STATUE_TRAP
            && await activate_statue_trap(t, t.tx, t.ty, false)) {
            ; /* feedback has been give by animate_statue() */
        } else {
            /* Since statues look like monsters now, we say something
               different from "you miss" or "there's nobody there".
               Note:  we only do this when a statue is displayed here,
               because the player is probably attempting to attack it;
               other statues obscured by anything are just ignored. */
            await pline(thump('statue'));
            await wake_nearto(game.bhitpos.x, game.bhitpos.y, 25);
        }
    } else {
        /* no monster here and no statue seen or remembered here */
        unmap_invisible(game.bhitpos.x, game.bhitpos.y);

        if (glyph_to_obj(glyph) === ONAMES.BOULDER
            && sobj_at(ONAMES.BOULDER, game.bhitpos.x, game.bhitpos.y)) {
            await pline(thump('boulder'));
            await wake_nearto(game.bhitpos.x, game.bhitpos.y, 25);
        } else if (!accessible(game.bhitpos.x, game.bhitpos.y)
                   || IS_FURNITURE(game.level.at(game.bhitpos.x, game.bhitpos.y).typ)) {
            /* similar to 'F'orcefight with a melee weapon; we know that
               the spot can be seen or we wouldn't have gotten this far */
            await You(`uselessly attack ${
                (game.level.at(game.bhitpos.x, game.bhitpos.y).typ === STONE
                 || game.level.at(game.bhitpos.x, game.bhitpos.y).typ === SCORR)
                ? 'stone'
                : glyph_is_cmap(glyph)
                  ? the(defsyms[glyph_to_cmap(glyph)].explain)
                  : 'an unknown obstacle'}.`);
        } else {
            await You('miss; there is no one there to hit.');
        }
    }
    u_wipe_engr(2); /* same as for melee or throwing */
    return freehit ? ECMD_OK : ECMD_TIME;
}

// src/apply.c:3686 grapple_range()
function grapple_range() {
    const typ = uwep_skill_type();
    let max_range = 4;

    if (typ === P_NONE || P_SKILL(typ) <= P_BASIC)
        max_range = 4;
    else if (P_SKILL(typ) === P_SKILLED)
        max_range = 5;
    else
        max_range = 8;
    return max_range;
}

// src/apply.c:3700 can_grapple_location()
function can_grapple_location(x, y) {
    return (isok(x, y) && cansee(x, y) && distu(x, y) <= grapple_range());
}

// src/apply.c:3706 display_grapple_positions(); getpos_sethilite() marks
// the valid squares from the validator, so tmp_at() has no work here
function display_grapple_positions(on_off) {
    let x, y, dx, dy;

    if (on_off) {
        /* on: tmp_at(DISP_BEAM, cmap_to_glyph(S_goodpos)) */
        for (dx = -3; dx <= 3; dx++)
            for (dy = -3; dy <= 3; dy++) {
                x = dx + game.u.ux;
                y = dy + game.u.uy;
                if (can_grapple_location(x, y) && !u_at(x, y)) {
                    /* tmp_at(x, y) */
                }
            }
    } else {
        /* off: tmp_at(DISP_END, 0) */
    }
}

// src/apply.c:3729 use_grapple()
async function use_grapple(obj) {
    let res = ECMD_OK, typ, tohit;
    let save_confirm;
    const cc = { x: 0, y: 0 };
    let mtmp;
    let otmp;

    /* Are you allowed to use the hook? */
    if (game.u.uswallow) {
        await pline(not_enough_room);
        return ECMD_OK;
    }
    if (obj !== game.u.uwep) {
        /* "cast": grappling hook evolved from slash'em's fishing pole */
        if (await wield_tool(obj, 'cast')) {
            cmdq_add_ec(CQ_CANNED, doapply);
            cmdq_add_key(CQ_CANNED, obj.invlet);
            return ECMD_TIME;
        }
        return ECMD_OK;
    }
    /* assert(obj == uwep); */

    /* Prompt for a location */
    await pline(where_to_hit);
    cc.x = game.u.ux;
    cc.y = game.u.uy;
    await getpos_sethilite(display_grapple_positions, can_grapple_location);
    if (await getpos(cc, true, 'the spot to hit') < 0)
        /* ESC; uses turn iff grapnel became wielded */
        return (res | ECMD_CANCEL);

    /* Calculate range; unlike use_pole(), there's no minimum for range */
    typ = uwep_skill_type();
    if (distu(cc.x, cc.y) > grapple_range()) {
        await pline('Too far!');
        return res;
    } else if (!cansee(cc.x, cc.y)) {
        await You(cant_see_spot);
        return res;
    } else if (!couldsee(cc.x, cc.y)) { /* Eyes of the Overworld */
        await You(cant_reach);
        return res;
    }

    /* What do you want to hit? */
    tohit = rn2(5);
    if (typ !== P_NONE && P_SKILL(typ) >= P_SKILLED) {
        const { tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
                tty_select_menu, tty_destroy_nhwindow, NHW_MENU, ATR_NONE } =
            await import('./tty/wintty.js');
        const tmpwin = tty_create_nhwindow(NHW_MENU);
        let any;
        let buf;
        let selected;
        const clr = NO_COLOR;

        any = 0; /* set all bits to zero */
        any = 1; /* use index+1 (can't use 0) as identifier */
        tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
        any++;
        buf = `an object on the ${surface(cc.x, cc.y)}`;
        tty_add_menu(tmpwin, null, any, 0, 0, ATR_NONE,
                     clr, buf, MENU_ITEMFLAGS_NONE);
        any++;
        tty_add_menu(tmpwin, null, any, 0, 0, ATR_NONE,
                     clr, 'a monster', MENU_ITEMFLAGS_NONE);
        any++;
        buf = `the ${surface(cc.x, cc.y)}`;
        tty_add_menu(tmpwin, null, any, 0, 0, ATR_NONE, clr,
                     buf, MENU_ITEMFLAGS_NONE);
        tty_end_menu(tmpwin, 'Aim for what?');
        tohit = rn2(4);
        if ((selected = await tty_select_menu(tmpwin, PICK_ONE)).length > 0
            && rn2(P_SKILL(typ) > P_SKILLED ? 20 : 2))
            tohit = selected[0] - 1;
        tty_destroy_nhwindow(tmpwin);
    }

    /* possibly scuff engraving at your feet;
       any engraving at the target location is unaffected */
    if (tohit === 2 || !rn2(2))
        u_wipe_engr(rnd(2));

    /* What did you hit? */
    switch (tohit) {
    case 0: /* Trap */
        /* FIXME -- untrap needs to deal with non-adjacent traps */
        break;
    case 1: /* Object */
        if ((otmp = (game.level.objects || []).find((o) => o.ox === cc.x && o.oy === cc.y
                        && (o.where === undefined || o.where === OBJ_FLOOR))) != null) {
            await You(`snag an object from the ${surface(cc.x, cc.y)}!`);
            await pickup_object(otmp, 1, false);
            /* If pickup fails, leave it alone */
            newsym(cc.x, cc.y);
            return ECMD_TIME;
        }
        break;
    case 2: /* Monster */
        game.bhitpos = { x: cc.x, y: cc.y };
        if ((mtmp = m_at(cc.x, cc.y)) == null)
            break;
        game.notonhead = (game.bhitpos.x !== mtmp.mx || game.bhitpos.y !== mtmp.my);
        save_confirm = game.flags.confirm;
        if (verysmall(mtmp.data) && !rn2(4)
            && enexto(cc, game.u.ux, game.u.uy, null)) {
            game.flags.confirm = false;
            await attack_checks(mtmp, game.u.uwep);
            game.flags.confirm = save_confirm;
            await check_caitiff(mtmp); /* despite fact there's no damage */
            await You(`pull in ${mon_nam(mtmp)}!`);
            mtmp.mundetected = 0;
            await rloc_to(mtmp, cc.x, cc.y);
            return ECMD_TIME;
        } else if ((!bigmonst(mtmp.data) && !strongmonst(mtmp.data))
                   || rn2(4)) {
            game.flags.confirm = false;
            await attack_checks(mtmp, game.u.uwep);
            game.flags.confirm = save_confirm;
            await check_caitiff(mtmp);
            await thitmonst(mtmp, game.u.uwep);
            return ECMD_TIME;
        }
        /*FALLTHRU*/
    case 3: /* Surface */
        if (IS_AIR(game.level.at(cc.x, cc.y).typ) || is_pool(cc.x, cc.y))
            await pline_The(`hook slices through the ${surface(cc.x, cc.y)}.`);
        else {
            await You(`are yanked toward the ${surface(cc.x, cc.y)}!`);
            await hurtle(sgn(cc.x - game.u.ux), sgn(cc.y - game.u.uy), 1, false);
            await spoteffects(true);
        }
        return ECMD_TIME;
    default: /* Yourself (oops!) */
        if (P_SKILL(typ) <= P_BASIC) {
            await You('hook yourself!');
            await losehp(Maybe_Half_Phys(rn1(10, 10)), 'a grappling hook',
                         KILLED_BY);
            return ECMD_TIME;
        }
        break;
    }
    await pline(nothing_happens);
    return ECMD_TIME;
}

// src/apply.c:2821 use_trap()
async function use_trap(otmp) {
    let ttyp, tmp;
    let what = null;
    let buf;
    const levtyp = game.level.at(game.u.ux, game.u.uy).typ;
    const occutext = 'setting the trap';

    if (nohands(game.youmonst.data))
        what = 'without hands';
    else if (Stunned())
        what = 'while stunned';
    else if (game.u.uswallow)
        what = digests(game.u.ustuck.data) ? 'while swallowed' : 'while engulfed';
    else if (Underwater())
        what = 'underwater';
    else if (Levitation())
        what = 'while levitating';
    else if (is_pool(game.u.ux, game.u.uy))
        what = 'in water';
    else if (is_lava(game.u.ux, game.u.uy))
        what = 'in lava';
    else if (On_stairs(game.u.ux, game.u.uy)) {
        const stway = stairway_at(game.u.ux, game.u.uy);
        what = stway.isladder ? 'on the ladder' : 'on the stairs';
    } else if (IS_FURNITURE(levtyp) || IS_OBSTRUCTED(levtyp)
             || closed_door(game.u.ux, game.u.uy) || t_at(game.u.ux, game.u.uy))
        what = 'here';
    else if (Is_airlevel(game.u.uz) || Is_waterlevel(game.u.uz))
        what = (levtyp === AIR)
                   ? 'in midair'
                   : (levtyp === CLOUD)
                         ? 'in a cloud'
                         : 'in this place'; /* Air/Water Plane catch-all */
    if (what) {
        await You_cant(`set a trap ${what}!`);
        reset_trapset();
        return;
    }
    ttyp = (otmp.otyp === ONAMES.LAND_MINE) ? LANDMINE : BEAR_TRAP;
    const ti = (game.trapinfo ||= {});
    if (otmp === ti.tobj && u_at(ti.tx, ti.ty)) {
        await You(`resume setting ${shk_your(otmp)}${trapname(ttyp, false)}.`);
        set_occupation(set_trap, occutext, 0);
        return;
    }
    ti.tobj = otmp;
    ti.tx = game.u.ux, ti.ty = game.u.uy;
    tmp = ACURR(A_DEX);
    ti.time_needed =
        (tmp > 17) ? 2 : (tmp > 12) ? 3 : (tmp > 7) ? 4 : 5;
    if (Blind())
        ti.time_needed *= 2;
    tmp = ACURR(A_STR);
    if (ttyp === BEAR_TRAP && tmp < 18)
        ti.time_needed += (tmp > 12) ? 1 : (tmp > 7) ? 2 : 4;
    /*[fumbling and/or confusion and/or cursed object check(s)
       should be incorporated here instead of in set_trap]*/
    if (game.u.usteed && P_SKILL(P_RIDING) < P_BASIC) {
        let chance;

        if (Fumbling() || otmp.cursed)
            chance = (rnl(10) > 3);
        else
            chance = (rnl(10) > 5);
        await You(`aren't very skilled at reaching from ${mon_nam(game.u.usteed)}.`);
        buf = `Continue your attempt to set ${the(trapname(ttyp, false))}?`;
        if (await tty_yn_function(buf, 'yn', 'n') === 'y') {
            if (chance) {
                switch (ttyp) {
                case LANDMINE: /* set it off */
                    ti.time_needed = 0;
                    ti.force_bungle = true;
                    break;
                case BEAR_TRAP: /* drop it without arming it */
                    reset_trapset();
                    await You(`drop ${the(trapname(ttyp, false))}!`);
                    await dropx(otmp);
                    return;
                }
            }
        } else {
            reset_trapset();
            return;
        }
    }
    await You(`begin setting ${shk_your(otmp)}${trapname(ttyp, false)}.`);
    await use_unpaid_trapobj(otmp, game.u.ux, game.u.uy);
    set_occupation(set_trap, occutext, 0);
    return;
}

// src/apply.c:2916 set_trap(); occupation routine called each turn while
// arming a beartrap or landmine
async function set_trap() {
    const ti = (game.trapinfo ||= {});
    const otmp = ti.tobj;
    let ttmp;
    let ttyp;

    if (!otmp || !carried(otmp) || !u_at(ti.tx, ti.ty)) {
        /* trap object might have been stolen or hero teleported */
        reset_trapset();
        return 0;
    }

    if (--ti.time_needed > 0)
        return 1; /* still busy */

    ttyp = (otmp.otyp === ONAMES.LAND_MINE) ? LANDMINE : BEAR_TRAP;
    ttmp = maketrap(game.u.ux, game.u.uy, ttyp);
    if (ttmp) {
        ttmp.madeby_u = 1;
        feeltrap(ttmp);
        if (in_rooms(game.u.ux, game.u.uy, SHOPBASE).length) {
            add_damage(game.u.ux, game.u.uy, 0); /* schedule removal */
        }
        if (!ti.force_bungle)
            await You(`finish arming ${the(trapname(ttyp, false))}.`);
        if (((otmp.cursed || Fumbling()) && (rnl(10) > 5))
            || ti.force_bungle)
            await dotrap(ttmp,
                         (ti.force_bungle ? FORCEBUNGLE : 0));
    } else {
        /* this shouldn't happen */
        await Your('trap setting attempt fails.');
    }
    useup(otmp);
    reset_trapset();
    return 0;
}

// src/apply.c:3876 discard_broken_wand(), the broken wand is gone.
function discard_broken_wand() {
    let obj;

    obj = game.current_wand; /* [see dozap() and destroy_items()] */
    game.current_wand = null;
    if (obj)
        delobj(obj);
    nomul(0);
}

// src/apply.c:3888 broken_wand_explode(), the attack-wand explosion.
async function broken_wand_explode(obj, dmg, expltype) {
    await explode(game.u.ux, game.u.uy, -(obj.otyp), dmg, OCLASSES.WAND_CLASS,
                  expltype);
    makeknown(obj.otyp); /* explode describes the effect */
    discard_broken_wand();
}

// src/apply.c:3909 do_break_wand(), #force applied to a wand: snap it and
// release its charges around the hero.
async function do_break_wand(obj) {
    const BY_OBJECT = null;
    const nothing_else_happens = 'But nothing else happens...';
    let i;
    let x, y;
    let mon;
    let dmg, damage;
    let affects_objects;
    let shop_damage = false;
    let fillmsg = false;
    const is_fragile = (objdescr_is(obj, 'balsa')
                        || objdescr_is(obj, 'glass'));

    if (nohands(game.youmonst.data)) {
        await You_cant(`break ${yname(obj)} without hands!`);
        return ECMD_OK;
    } else if (!freehand()) {
        await Your(`${makeplural(body_part(HAND))} are occupied!`);
        return ECMD_OK;
    } else if (ACURR(A_STR) < (is_fragile ? 5 : 10)) {
        await You(`don't have the strength to break ${yname(obj)}!`);
        return ECMD_OK;
    }
    if (!(await paranoid_query((paranoia_bits() & PARANOID_BREAKWAND) !== 0,
                               safe_qbuf('Are you really sure you want to break ',
                                         '?', obj, yname, ysimple_name,
                                         'the wand'))))
        return ECMD_OK;

    await pline(`Raising ${yname(obj)} high above your ${body_part(HEAD)}, you ${
                is_fragile ? 'snap' : 'break'} it in two!`);
    if (obj.unpaid) {
        await check_unpaid(obj); /* Extra charge for use */
        await costly_alteration(obj, COST_DSTROY);
    }
    game.current_wand = obj; /* destroy_items might reset this */
    freeinv(obj);       /* hide it from destroy_items instead... */
    setnotworn(obj);    /* so we need to do this ourselves */

    if (!(await zappable(obj))) {
        await pline(nothing_else_happens);
        discard_broken_wand();
        return ECMD_TIME;
    }
    /* successful call to zappable() consumes a charge; put it back */
    obj.spe++;
    /* might have "wrested" a final charge, taking it from 0 to -1;
       if so, we just brought it back up to 0, which wouldn't do much
       below so give it 1..3 charges now, usually making it stronger
       than an ordinary last charge (the wand is already gone from
       inventory, so perm_invent can't accidentally reveal this) */
    if (!obj.spe)
        obj.spe = rnd(3);

    obj.ox = game.u.ux;
    obj.oy = game.u.uy;
    dmg = obj.spe * 4;
    affects_objects = false;

    switch (obj.otyp) {
    case ONAMES.WAN_OPENING:
        if (game.u.ustuck) {
            await release_hold();
            if (obj.dknown)
                makeknown(ONAMES.WAN_OPENING);
            discard_broken_wand();
            return ECMD_TIME;
        }
        /* FALLTHROUGH */
    case ONAMES.WAN_WISHING:
    case ONAMES.WAN_NOTHING:
    case ONAMES.WAN_LOCKING:
    case ONAMES.WAN_PROBING:
    case ONAMES.WAN_ENLIGHTENMENT:
    case ONAMES.WAN_SECRET_DOOR_DETECTION:
    case ONAMES.WAN_STASIS:
        await pline(nothing_else_happens);
        discard_broken_wand();
        return ECMD_TIME;
    case ONAMES.WAN_DEATH:
    case ONAMES.WAN_LIGHTNING:
        await broken_wand_explode(obj, dmg * 4, EXPL_MAGICAL);
        return ECMD_TIME;
    case ONAMES.WAN_FIRE:
        await broken_wand_explode(obj, dmg * 2, EXPL_FIERY);
        return ECMD_TIME;
    case ONAMES.WAN_COLD:
        await broken_wand_explode(obj, dmg * 2, EXPL_FROSTY);
        return ECMD_TIME;
    case ONAMES.WAN_MAGIC_MISSILE:
        await broken_wand_explode(obj, dmg, EXPL_MAGICAL);
        return ECMD_TIME;
    case ONAMES.WAN_STRIKING:
        await pline('A wall of force smashes down around you!');
        dmg = d(1 + obj.spe, 6); /* normally 2d12 */
        /* FALLTHROUGH */
    case ONAMES.WAN_CANCELLATION:
    case ONAMES.WAN_POLYMORPH:
    case ONAMES.WAN_TELEPORTATION:
    case ONAMES.WAN_UNDEAD_TURNING:
        affects_objects = true;
        break;
    default:
        break;
    }

    /* magical explosion and its visual effect occur before specific effects
       [note: this explosion is generic magic and won't be
       fatal so that we never leave a bones file where none of the
       surrounding targets (or underlying objects) got affected yet.] */
    await explode(obj.ox, obj.oy, -(obj.otyp), rnd(dmg), OCLASSES.WAND_CLASS,
                  EXPL_MAGICAL);

    /* prepare for potential feedback from polymorph... */
    zapsetup();

    /* this makes it hit us last, so that we can see the action first */
    for (i = 0; i <= N_DIRS; i++) {
        x = obj.ox + xdir[i];
        y = obj.oy + ydir[i];
        game.bhitpos = { x, y };
        if (!isok(x, y))
            continue;

        if (obj.otyp === ONAMES.WAN_DIGGING) {
            let typ;
            const dcres = dig_check(BY_OBJECT, x, y);

            if (dcres < DIGCHECK_FAILED || dcres === DIGCHECK_FAIL_BOULDER) {
                if (IS_WALL(game.level.at(x, y).typ) || IS_DOOR(game.level.at(x, y).typ)) {
                    /* normally, pits and holes don't anger guards, but they
                     * do if it's a wall or door that's being dug */
                    await watch_dig(null, x, y, true);
                    if (in_rooms(x, y, SHOPBASE).length)
                        shop_damage = true;
                }
                if (game.level.at(x, y).typ === ICE)
                    spot_stop_timers(x, y, MELT_ICE_AWAY);
                /*
                 * Let liquid flow into the newly created pits.
                 * Adjust corresponding code in music.c for
                 * drum of earthquake if you alter this sequence.
                 */
                typ = fillholetyp(x, y, false);
                if (typ !== ROOM) {
                    game.level.at(x, y).typ = typ, game.level.at(x, y).flags = 0;
                    await liquid_flow(x, y, typ, t_at(x, y),
                                      fillmsg
                                        ? null
                                        : 'Some holes are quickly filled with %s!');
                    fillmsg = true;
                } else {
                    await digactualhole(x, y, BY_OBJECT,
                                        (rn2(obj.spe) < 3
                                         || (!Can_dig_down(game.u.uz)
                                             && !game.level.at(x, y).candig)) ? PIT : HOLE);
                }
            }
            await fill_pit(x, y);
            await maybe_dunk_boulders(x, y);
            recalc_block_point(x, y);
            continue;
        } else if (obj.otyp === ONAMES.WAN_CREATE_MONSTER) {
            /* u.ux,u.uy creates it near you--x,y might create it in rock */
            makemon(null, game.u.ux, game.u.uy, NO_MM_FLAGS);
            continue;
        } else if (x !== game.u.ux || y !== game.u.uy) {
            /*
             * Wand breakage is targeting a square adjacent to the hero,
             * which might contain a monster or a pile of objects or both.
             * Handle objects last; avoids having undead turning raise an
             * undead's corpse and then attack resulting undead monster.
             * obj->bypass in bhitm() prevents the polymorphing of items
             * dropped due to monster's polymorph and prevents undead
             * turning that kills an undead from raising resulting corpse.
             */
            if ((mon = m_at(x, y)) != null) {
                await bhitm(mon, obj);
                /* if (disp.botl) bot(); */
            }
            if (affects_objects && OBJ_AT(x, y)) {
                await bhitpile(obj, bhito, x, y, 0);
                if (game.disp?.botl)
                    await bot(); /* potion effects */
            }
        } else {
            /*
             * Wand breakage is targeting the hero.  Using xdir[]+ydir[]
             * deltas for location selection causes this case to happen
             * after all the adjacent targets have been processed.
             * Handle objects first, in case damage is fatal and leaves
             * bones, or teleportation sends one or more of the objects to
             * same destination as hero (lookhere/autopickup);
             * we don't want to be hit by an obj which is about to be
             * polymorphed or teleported or destroyed.
             */
            if (affects_objects && OBJ_AT(x, y)) {
                await bhitpile(obj, bhito, x, y, 0);
                if (game.disp?.botl)
                    await bot(); /* potion effects */
            }
            damage = await zapyourself(obj, false);
            if (damage) {
                await losehp(Maybe_Half_Phys(damage),
                             `killed ${uhim()}self by breaking a wand`,
                             NO_KILLER_PREFIX);
            }
            if (game.disp?.botl)
                await bot(); /* blindness */
        }
    }

    /* potentially give post zap/break feedback */
    await zapwrapup();

    /* Note: if player fell thru, this call is a no-op.
       Damage is handled in digactualhole in that case */
    if (shop_damage)
        await pay_for_damage('dig into', false);

    if (obj.otyp === ONAMES.WAN_LIGHT)
        await litroom(true, obj); /* only needs to be done once */

    discard_broken_wand();
    return ECMD_TIME;
}

// src/apply.c:711 o_unleash(); release the leash's monster
export function o_unleash(otmp) {
    for (const mtmp of (game.level.monsters || []))
        if (mtmp.m_id === otmp.leashmon) {
            mtmp.mleashed = 0;
            break;
        }
    otmp.leashmon = 0;
    update_inventory();
}

// src/apply.c:3897 maybe_dunk_boulders()
export async function maybe_dunk_boulders(x, y) {
    let otmp;

    while (is_pool_or_lava(x, y) && (otmp = sobj_at(ONAMES.BOULDER, x, y)) != null) {
        obj_extract_self(otmp);
        await boulder_hits_pool(otmp, x, y, false);
    }
}

// src/apply.c um_dist(); is <x,y> more than n squares from the hero?
export function um_dist(x, y, n) {
    return (Math.abs(game.u.ux - x) > n || Math.abs(game.u.uy - y) > n);
}
