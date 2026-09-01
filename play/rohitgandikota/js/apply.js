// apply.js — the 'a' command.
// C ref: src/apply.c

import { game } from './gstate.js';
import { ECMD_OK, ECMD_TIME, ECMD_CANCEL, CQ_CANNED, GETOBJ_NOFLAGS,
         nothing_happens, M_AP_TYPE, M_AP_NOTHING, M_AP_FURNITURE, M_AP_OBJECT,
         M_AP_MONSTER, ARTICLE_A, SUPPRESS_IT,
         SUPPRESS_INVISIBLE, nothing_seems_to_happen, IS_OBSTRUCTED, IS_TREE,
         Is_airlevel, Is_waterlevel, NOSE, NO_TRAP_FLAGS, RLOC_MSG,
         RLOC_NONE, RLOC_NOMSG, TIMEOUT, Upolyd, A_DEX, A_CON,
         MAX_SPELL_STUDY,
         SICK_ALL, SICK_NONVOMITABLE,
         NH_RED, plur, HOMEMADE_TIN, COLNO, FLASHED_LIGHT,
         STOMACH, DIGTYP_UNDIGGABLE, N_DIRS_Z, xdir, ydir,
         TT_WEB, TT_PIT, FOOT, NO_KILLER_PREFIX, IS_WATERWALL, LAVAWALL }
    from './const.js';
import { addinv, addinv_nomerge, carrying, freeinv, getobj, hands_obj,
         hold_another_object, obj_extract_self, update_inventory, useup,
         useupall, useupf, weight, any_obj_ok, prinv, stackobj }
    from './invent.js';
import { getdir, get_adjacent_loc, cmdq_add_ec, cmdq_add_key, confdir, getlin }
    from './cmd.js';
import { pick_lock } from './lock.js';
import { is_pick, is_axe, delobj, m_at, mongone, seemimic, wake_nearby, wakeup,
         is_pool, is_lava, mnexto, see_monster_closeup } from './mon.js';
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
         passes_walls, poly_when_stoned, throws_rocks, touch_petrifies,
         unsolid } from './mondata.js';
import { check_capacity, invocation_pos, losehp, may_passwall } from './hack.js';
import { tty_yn_function } from './tty/topl.js';
import { makeknown, observe_object } from './o_init.js';
import { Blindf_off, Blindf_on, cursed } from './do_wear.js';
import { DEADMONSTER } from './monst.js';
import { ACURR, change_luck, exercise } from './attrib.js';
import { is_rider, makemon, set_malign, MM_NOMSG, NO_MM_FLAGS }
    from './makemon.js';
import { ATTKS, PMNAMES } from './monst_data.js';
import { attach_egg_hatch_timeout, begin_burn, end_burn, HATCH_EGG,
         stop_timer } from './timeout.js';
import { bhit, obj_resists, zapyourself } from './zap.js';
import { ceiling, surface } from './dungeon.js';
import { can_reach_floor, pickup_object } from './pickup.js';
import { dig_typ, use_pick_axe2 } from './dig.js';
import { dbon, do_attack } from './uhitm.js';
import { possibly_unwield, setmnotwielded } from './weapon.js';

function note_unported_apply(what) {
    (game.unported ||= new Set()).add(what);
}

/* src/apply.c:4285 — the lock tools. pick_lock() reaches get_adjacent_loc(),
   so applying one consumes a DIRECTION key. Missing that left the direction to
   run as a movement command, which is exactly what made an earlier attempt at
   this command cost seed0077 a screen: its rogue applies item `e`, the lock
   pick, and the `j` after it is a direction in C and a move in ours. */
const LOCK_TOOLS = [ONAMES.LOCK_PICK, ONAMES.CREDIT_CARD, ONAMES.SKELETON_KEY];

/* src/apply.c: the remaining directional tool placeholders. Stethoscopes and
   figurines have their own handlers below. */
const NEEDS_DIR = [ONAMES.MIRROR];

/* src/apply.c:4344 — use_lamp() is void, so doapply's `int res = ECMD_TIME`
   survives and applying a lamp takes a turn. */
const LAMPS = [ONAMES.OIL_LAMP, ONAMES.MAGIC_LAMP, ONAMES.BRASS_LANTERN];

const MUSICAL_INSTRUMENTS = [
    ONAMES.WOODEN_FLUTE, ONAMES.MAGIC_FLUTE, ONAMES.TOOLED_HORN,
    ONAMES.FROST_HORN, ONAMES.FIRE_HORN, ONAMES.WOODEN_HARP,
    ONAMES.MAGIC_HARP, ONAMES.BUGLE, ONAMES.LEATHER_DRUM,
    ONAMES.DRUM_OF_EARTHQUAKE,
];

/* src/apply.c:4268 ordinary containers open the same interaction used by
   #loot.  A bag of tricks has its own effect and is intentionally omitted. */
const APPLIED_CONTAINERS = [ONAMES.LARGE_BOX, ONAMES.CHEST, ONAMES.ICE_BOX,
                            ONAMES.SACK, ONAMES.BAG_OF_HOLDING,
                            ONAMES.OILSKIN_SACK];

// src/apply.c:698 number_leashed().
export function number_leashed() {
    return (game.invent || []).filter((obj) =>
        obj.otyp === ONAMES.LEASH && obj.leashmon).length;
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
export async function next_to_u() {
    for (const mtmp of game.level?.monsters || []) {
        if (!mtmp.mleashed)
            continue;
        if (distu(mtmp.mx, mtmp.my) > 2)
            mnexto(mtmp, RLOC_NOMSG);
        if (distu(mtmp.mx, mtmp.my) <= 2)
            continue;

        const leash = get_mleash(mtmp);
        if (!leash) {
            note_unported_apply('next_to_u:missing_leash');
            return false;
        }
        if (leash.cursed)
            return false;

        mtmp.mleashed = 0;
        leash.leashmon = 0;
        update_inventory();
        await You_feel(`${number_leashed() > 1 ? 'a' : 'the'} leash go slack.`);
    }

    if (game.u.usteed) {
        const { mon_has_amulet } = await import('./wizard.js');
        if (mon_has_amulet(game.u.usteed))
            return false;
    }
    return true;
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

function on_stairs_at_u() {
    for (let stway = game.stairs; stway; stway = stway.next)
        if (stway.sx === game.u.ux && stway.sy === game.u.uy)
            return true;
    return false;
}

// src/dig.c:1092 use_pick_axe() -- wield first, replay the application, then
// show only directions with a useful target plus the reachable vertical one.
async function use_pick_axe(obj) {
    if (obj !== game.u.uwep) {
        if (await wield_tool(obj, 'swing')) {
            cmdq_add_ec(CQ_CANNED, doapply);
            cmdq_add_key(CQ_CANNED, obj.invlet);
            return ECMD_TIME;
        }
        return ECMD_OK;
    }

    const verb = is_pick(obj) ? 'dig' : 'chop';
    if (game.u.utrap && game.u.utraptype === TT_WEB) {
        await pline(`Unfortunately, you can't ${verb} while entangled in a web.`);
        return ECMD_OK;
    }

    const chars = 'hykulnjb<>';
    const choices = [];
    const downok = can_reach_floor(false);
    for (let dir = 0; dir < N_DIRS_Z; dir++) {
        if (dir < 8) {
            const rx = game.u.ux + xdir[dir], ry = game.u.uy + ydir[dir];
            if (!isok(rx, ry) || dig_typ(obj, rx, ry) === DIGTYP_UNDIGGABLE)
                continue;
        } else if (((dir === 9) ? 1 : 0) ^ (downok ? 1 : 0)) {
            continue;
        }
        choices.push(chars[dir]);
    }
    if (!await getdir(`In what direction do you want to ${verb}? [${choices.join('')}]`))
        return ECMD_CANCEL;
    return await use_pick_axe2(obj);
}

// src/apply.c:2955 use_whip(). This covers wield-and-replay, direction
// handling, self damage, ordinary snaps, adjacent attacks, floor snags, and
// weapon disarming. Mounted use and pit escape remain explicit gaps.
async function use_whip(obj) {
    const u = game.u;

    if (obj !== u.uwep) {
        if (await wield_tool(obj, 'lash')) {
            cmdq_add_ec(CQ_CANNED, doapply);
            cmdq_add_key(CQ_CANNED, obj.invlet);
            return ECMD_TIME;
        }
        return ECMD_OK;
    }
    if (!await getdir(null))
        return ECMD_OK | ECMD_CANCEL;

    let mtmp;
    let rx, ry;
    if (u.uswallow) {
        mtmp = u.ustuck;
        rx = mtmp.mx;
        ry = mtmp.my;
    } else {
        confdir(false);
        rx = u.ux + u.dx;
        ry = u.uy + u.dy;
        if (!isok(rx, ry)) {
            await You('miss.');
            return ECMD_OK;
        }
        mtmp = m_at(rx, ry);
    }

    let proficient = 0;
    const role = game.urole?.mnum;
    if (role === 'PM_ARCHEOLOGIST' || role === PMNAMES.PM_ARCHEOLOGIST)
        proficient++;
    const dex = ACURR(A_DEX);
    if (dex < 6)
        proficient--;
    else if (dex >= 14)
        proficient += dex - 14;
    if (Fumbling())
        proficient--;
    proficient = Math.max(0, Math.min(3, proficient));

    if (u.uswallow) {
        await There('is not enough room to flick your bullwhip.');
    } else if (Underwater()) {
        await There('is too much resistance to flick your bullwhip.');
    } else if (u.dz < 0) {
        await You(`flick a bug off of the ${ceiling(u.ux, u.uy)}.`);
    } else if (!u.dz && (IS_WATERWALL(game.level.at(rx, ry)?.typ)
                         || game.level.at(rx, ry)?.typ === LAVAWALL)) {
        await You('cause a small splash.');
        if (game.level.at(rx, ry)?.typ === LAVAWALL)
            note_unported_apply('use_whip:lava_wall_fire_damage');
        return ECMD_TIME;
    } else if ((!u.dx && !u.dy) || u.dz > 0) {
        if (is_pool(u.ux, u.uy) || is_lava(u.ux, u.uy)) {
            await You('cause a small splash.');
            if (is_lava(u.ux, u.uy))
                note_unported_apply('use_whip:lava_fire_damage');
            return ECMD_TIME;
        }
        if (Levitation() || u.usteed || Flying()) {
            const otmp = (game.level?.objects || [])
                .find((o) => o.ox === u.ux && o.oy === u.uy);
            if (otmp && proficient) {
                await You(`wrap your bullwhip around ${
                    an(singular(otmp, xname))} on the ${surface(u.ux, u.uy)}.`);
                if (rnl(6) || await pickup_object(otmp, 1, true) < 1)
                    await pline('The bullwhip slips free.');
                return ECMD_TIME;
            }
        }

        let dam = rnd(2) + dbon() + (obj.spe || 0);
        if (dam <= 0)
            dam = 1;
        await You(`hit your ${body_part(FOOT)} with your bullwhip.`);
        const him = game.flags?.female ? 'her' : 'him';
        const his = game.flags?.female ? 'her' : 'his';
        await losehp(dam, `killed ${him}self with ${his} bullwhip`,
                     NO_KILLER_PREFIX);
        return ECMD_TIME;
    } else if ((Fumbling() || Glib()) && !rn2(5)) {
        await pline(`The bullwhip slips out of your ${body_part(HAND)}.`);
        const { dropx } = await import('./do.js');
        await dropx(obj);
    } else if (u.utrap && u.utraptype === TT_PIT) {
        note_unported_apply('use_whip:pit_escape');
        await pline('Snap!');
    } else if (mtmp) {
        if (!canspotmon(mtmp)) {
            note_unported_apply('use_whip:unseen_monster');
        } else if (mtmp.mw) {
            const otmp = mtmp.mw;
            const onambuf = cxname(otmp);
            let gotit = proficient && (!Fumbling() || !rn2(10));
            const monHand = bimanual(otmp)
                ? makeplural(mbodypart(mtmp, HAND)) : mbodypart(mtmp, HAND);

            await You(`wrap your bullwhip around ${
                s_suffix(mon_nam(mtmp))} ${xname(otmp)}.`);
            if (gotit && otmp.cursed && (otmp.owornmask || 0)) {
                note_unported_apply('use_whip:welded_monster_weapon');
                gotit = false;
            }
            if (gotit) {
                obj_extract_self(otmp);
                await possibly_unwield(mtmp, false);
                setmnotwielded(mtmp, otmp);

                switch (rn2(proficient + 1)) {
                case 2:
                    await You(`yank ${yname(otmp)} to the ${
                        surface(u.ux, u.uy)}!`);
                    place_object(otmp, u.ux, u.uy);
                    stackobj(otmp);
                    break;
                case 3:
                    await You(`snatch ${yname(otmp)}!`);
                    await hold_another_object(otmp, 'You drop %s!',
                                              doname(otmp), null);
                    break;
                default:
                    await You(`yank ${the(onambuf)} from ${
                        s_suffix(mon_nam(mtmp))} ${monHand}!`);
                    place_object(otmp, mtmp.mx, mtmp.my);
                    stackobj(otmp);
                    break;
                }
            } else {
                await pline('The bullwhip slips free.');
            }
        } else {
            await You(`flick your bullwhip towards ${mon_nam(mtmp)}.`);
            if (proficient) {
                const context = game.context ||= {};
                const save = context.forcefight;
                if (!mtmp.mtame)
                    context.forcefight = true;
                const attacked = await do_attack(mtmp);
                context.forcefight = save;
                if (attacked)
                    return ECMD_TIME;
            }
            await pline('Snap!');
        }
        await wakeup(mtmp, true);
    } else if (Is_airlevel(u.uz) || Is_waterlevel(u.uz)) {
        await You('snap your whip through thin air.');
    } else {
        await pline('Snap!');
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

// src/apply.c:1628 use_lamp(). Lamps, lanterns, and loose candles share the
// same on/off path; begin_burn() selects their fuel checkpoints and radius.
async function shop_owned_prefix(obj, capitalize) {
    let prefix = carried(obj) ? 'your' : 'the';
    if (obj.unpaid && game.u.ushops) {
        const { shop_keeper } = await import('./shk.js');
        const shkp = shop_keeper(game.u.ushops.charCodeAt(0));
        if (shkp) {
            const raw = shkp.shknam || shkp.eshk?.shknam
                || shkp.mextra?.eshk?.shknam || 'the shopkeeper';
            const name = /^[-+_|]/.test(raw) ? raw.slice(1) : raw;
            prefix = s_suffix(name);
        }
    }
    if (capitalize)
        prefix = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    return `${prefix} `;
}

async function use_lamp(obj) {
    const candle = Is_candle(obj);
    const lamp = obj.otyp === ONAMES.BRASS_LANTERN ? 'lantern'
               : candle ? null : 'lamp';

    if (obj.lamplit) {
        if (lamp)
            await pline(`${await shop_owned_prefix(obj, true)}${lamp} is now off.`);
        else
            await You(`snuff out ${yname(obj)}.`);
        await end_burn(obj, true);
        return;
    }
    if (Underwater()) {
        await pline(candle ? "Sorry, fire and water don't mix."
                           : 'This is not a diving lamp.');
        return;
    }
    if ((!candle && obj.otyp !== ONAMES.MAGIC_LAMP && !obj.age)
        || (obj.otyp === ONAMES.MAGIC_LAMP && !obj.spe)) {
        if (obj.otyp === ONAMES.BRASS_LANTERN)
            await pline(game.u.ublind ? nothing_seems_to_happen
                                      : 'Your lantern is out of power.');
        else
            await pline(`This ${lamp} has no oil.`);
        return;
    }
    if (obj.cursed && !rn2(2)) {
        if ((obj.otyp === ONAMES.OIL_LAMP || obj.otyp === ONAMES.MAGIC_LAMP)
            && !rn2(3)) {
            note_unported_apply('use_lamp:oil_spill');
            await pline('The lamp spills and covers your fingers with oil.');
        } else if (!game.u.ublind) {
            await pline(`${Yname2(obj)} ${otense(obj, 'flicker')} for a moment, then ${
                otense(obj, 'die')}.`);
        } else {
            await pline(nothing_seems_to_happen);
        }
        return;
    }

    if (lamp) {
        if (obj.unpaid) {
            const { check_unpaid } = await import('./shk.js');
            await check_unpaid(obj);
        }
        await pline(`${await shop_owned_prefix(obj, true)}${lamp} is now on.`);
    } else {
        const name = Yname2(obj);
        const possessive = name.endsWith('s') ? `${name}'` : `${name}'s`;
        const many = obj.quan !== 1;
        await pline(`${possessive} flame${many ? 's' : ''} ${
            many ? 'burn' : 'burns'}${Blind() ? '.' : ' brightly!'}`);
    }
    await begin_burn(obj, false);
}

// src/apply.c:1703 light_cocktail(). A lit oil potion is a one-item stack
// with a burn timer and radius-one light source. Snuffing restores its unused
// fuel, then removes and re-adds it so that it can merge with matching oil.
async function light_cocktail(obj) {
    if (game.u.uswallow) {
        await You("don't have enough elbow-room to maneuver.");
        return obj;
    }

    if (obj.lamplit) {
        await You('snuff the lit potion.');
        await end_burn(obj, true);
        if (!obj.owornmask) {
            freeinv(obj);
            obj = await addinv(obj);
        }
        return obj;
    }
    if (Underwater()) {
        await There('is not enough oxygen to sustain a fire.');
        return obj;
    }

    const split1off = obj.quan > 1;
    if (split1off)
        obj = splitobj(obj, 1);

    await You(`light ${await shop_owned_prefix(obj, false)}potion.${Blind()
        ? '' : '  It gives off a dim light.'}`);

    if (obj.unpaid && game.u.ushops) {
        const { bill_dummy_object, check_unpaid } = await import('./shk.js');
        await check_unpaid(obj);
        await pline('"That\'s in addition to the cost of the potion, of course."');
        bill_dummy_object(obj);
    }
    makeknown(obj.otyp);
    await begin_burn(obj, false);

    if (split1off) {
        obj_extract_self(obj);
        obj.nomerge = 1;
        obj = await hold_another_object(obj, 'You drop %s!', doname(obj), null);
        if (obj)
            obj.nomerge = 0;
    }
    return obj;
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

    if (!invocation_pos(game.u.ux, game.u.uy) || on_stairs_at_u()) {
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
async function use_bell(obj) {
    const ordinary = obj.otyp !== ONAMES.BELL_OF_OPENING || !obj.spe;
    const invoking = obj.otyp === ONAMES.BELL_OF_OPENING
        && invocation_pos(game.u.ux, game.u.uy) && !on_stairs_at_u();
    let learn = false;
    let wake = false;

    await You(`ring ${the(xname(obj))}.`);

    if (Underwater() || (game.u.uswallow && ordinary)) {
        await pline('But the sound is muffled.');
    } else if (invoking && ordinary) {
        await pline('But it makes no sound.');
        learn = true;
    } else if (ordinary) {
        if (obj.cursed && !rn2(4))
            note_unported_apply('use_bell:cursed_summoning');
        wake = true;
    } else {
        obj.spe--;
        if (game.u.uswallow) {
            note_unported_apply('use_bell:swallowed_opening');
        } else if (obj.cursed) {
            note_unported_apply('use_bell:summon_undead');
            wake = true;
        } else if (invoking) {
            await pline(`${Tobjnam(obj, 'issue')} an unsettling shrill sound...`);
            obj.age = game.moves;
            learn = true;
            wake = true;
        } else {
            note_unported_apply(obj.blessed ? 'use_bell:openit'
                                            : 'use_bell:findit');
        }
    }

    if (learn) {
        makeknown(ONAMES.BELL_OF_OPENING);
        obj.known = 1;
    }
    if (wake)
        wake_nearby(true);
    update_inventory();
}

// src/apply.c:1399 use_candle(), including attaching candles to the
// Candelabrum of Invocation.
async function use_candle(obj) {
    if (game.u.uswallow) {
        await You('have no elbow-room to maneuver.');
        return;
    }

    const candelabrum = carrying(ONAMES.CANDELABRUM_OF_INVOCATION);
    if (!candelabrum || candelabrum.spe === 7) {
        await use_lamp(obj);
        return;
    }

    if ((await tty_yn_function(
        `Attach ${yname(obj)} to ${yname(candelabrum)}?`, 'yn', 'n')) !== 'y') {
        await use_lamp(obj);
        return;
    }

    const room = 7 - candelabrum.spe;
    if (obj.quan > room)
        obj = splitobj(obj, room);

    const count = obj.quan;
    const s = count !== 1 ? 'candles' : 'candle';
    const was_lamplit = !!obj.lamplit;
    if (was_lamplit)
        await end_burn(obj, true);

    await You(`attach ${count}${candelabrum.spe ? ' more' : ''} ${s} to ${
        the(xname(candelabrum))}.`);
    if (!candelabrum.spe || candelabrum.age > obj.age)
        candelabrum.age = obj.age;
    candelabrum.spe += count;
    if (candelabrum.lamplit && !was_lamplit) {
        await pline(`The new ${s} magically ${vtense(s, 'ignite')}!`);
    } else if (!candelabrum.lamplit && was_lamplit) {
        await pline(`${count > 1 ? 'They go' : 'It goes'} out.`);
    }
    if (obj.unpaid)
        note_unported_apply('use_candle:shop_billing');
    if (count < 7 && candelabrum.spe === 7) {
        await pline(`${The(xname(candelabrum))} now has seven${
            candelabrum.lamplit ? ' lit' : ''} candles attached.`);
    }
    if (candelabrum.lamplit) {
        const { del_light_source, new_light_source, LS_OBJECT } =
            await import('./light.js');
        const radius = candelabrum.spe < 4 ? 2 : candelabrum.spe < 7 ? 3 : 4;
        del_light_source(LS_OBJECT, candelabrum.o_id);
        new_light_source(game.u.ux, game.u.uy, radius, LS_OBJECT,
                         candelabrum.o_id);
        game.vision_full_recalc = 1;
    }
    useupall(obj);
    candelabrum.owt = weight(candelabrum);
    update_inventory();
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

// src/write.c:61 write_ok() selects blank scrolls and spellbooks first.
function write_ok(obj) {
    if (!obj || (obj.oclass !== OCLASSES.SCROLL_CLASS
                 && obj.oclass !== OCLASSES.SPBOOK_CLASS))
        return GETOBJ_EXCLUDE;
    if (obj.otyp === ONAMES.SCR_BLANK_PAPER
        || obj.otyp === ONAMES.SPE_BLANK_PAPER)
        return GETOBJ_SUGGEST;
    return GETOBJ_DOWNPLAY;
}

// src/write.c dowrite(), through the insufficient-ink exit. This covers the
// flat shop fee for a marker before any ink is consumed. Successful writing
// continues through knowledge, luck, and paper-consumption branches that are
// still tracked separately below.
async function dowrite(pen) {
    const paper = await getobj('write on', write_ok, GETOBJ_NOFLAGS);
    if (!paper)
        return ECMD_CANCEL;

    const typeword = paper.otyp === ONAMES.SPE_NOVEL ? 'book'
        : paper.oclass === OCLASSES.SPBOOK_CLASS ? 'spellbook' : 'scroll';
    observe_object(paper);
    if (paper.otyp !== ONAMES.SCR_BLANK_PAPER
        && paper.otyp !== ONAMES.SPE_BLANK_PAPER) {
        await pline(`That ${typeword} is not blank!`);
        exercise(A_WIS, false);
        return ECMD_TIME;
    }
    makeknown(ONAMES.SCR_BLANK_PAPER);

    let name = await getlin(`What type of ${typeword} do you want to write?`);
    name = name.replace(/\s+/g, ' ').trim();
    if (!name || name[0] === '\x1b')
        return ECMD_TIME;
    name = name.replace(/^(?:scroll|spellbook)\s+/i, '')
        .replace(/^of\s+/i, '');

    let otyp = 0;
    const first = game.bases[paper.oclass];
    const last = game.bases[paper.oclass + 1];
    for (let i = first; i < last; i++) {
        const actual = OBJ_NAME(game.objects[i]);
        if (actual && actual.toLowerCase() === name.toLowerCase()
            && (game.objects[i].oc_name_known
                || paper.oclass === OCLASSES.SPBOOK_CLASS)) {
            otyp = i;
            break;
        }
    }
    if (!otyp) {
        await There(`is no such ${typeword}!`);
        return ECMD_TIME;
    }
    if (otyp === ONAMES.SCR_BLANK_PAPER
        || otyp === ONAMES.SPE_BLANK_PAPER) {
        await You_cant('write that!');
        await pline("It's obscene!");
        return ECMD_TIME;
    }
    if (otyp === ONAMES.SPE_BOOK_OF_THE_DEAD) {
        await pline('No mere dungeon adventurer could write that.');
        return ECMD_TIME;
    }

    game.u.uconduct ||= {};
    game.u.uconduct.literate = (game.u.uconduct.literate || 0) + 1;
    const newObj = mksobj(otyp, false, false);
    newObj.bknown = !!(paper.bknown && pen.bknown);
    const { check_unpaid } = await import('./shk.js');
    await check_unpaid(pen);

    const basecost = paper.oclass === OCLASSES.SPBOOK_CLASS
        ? 10 * game.objects[otyp].oc_level : 1000;
    if (pen.spe < Math.trunc(basecost / 2)) {
        await Your('marker is too dry to write that!');
        return ECMD_TIME;
    }

    note_unported_apply('dowrite:ink');
    return ECMD_TIME;
}

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
    if (obj.spe <= 0) {
        await You('seem to be out of tins.');
        return;
    }

    const { floorfood } = await import('./eat.js');
    const corpse = await floorfood('tin', 2);
    if (!corpse)
        return;
    if (corpse.oeaten) {
        await You('cannot tin something which is partly eaten.');
        return;
    }

    const mptr = game.mons[corpse.corpsenm];
    if (touch_petrifies(mptr) && !Stone_resistance() && !game.u.uarmg) {
        const corpse_name = an(cxname(corpse));
        let cause = '';
        if (poly_when_stoned(game.youmonst.data)) {
            await You(`tin ${corpse_name} without wearing gloves.`);
        } else {
            await pline(`Tinning ${corpse_name} without wearing gloves `
                        + 'is a fatal mistake...');
            cause = `trying to tin ${corpse_name} without gloves`;
        }
        const { instapetrify } = await import('./trap.js');
        await instapetrify(cause);
    }

    if (is_rider(mptr)) {
        const { revive_corpse } = await import('./do.js');
        if (await revive_corpse(corpse, true))
            await pline('"Yes...  But War does not preserve its enemies..."');
        else
            await pline('The corpse evades your grasp.');
        return;
    }
    if (!mptr.cnutrit) {
        await pline("That's too insubstantial to tin.");
        return;
    }

    await consume_obj_charge(obj);
    const can = mksobj(ONAMES.TIN, false, false);
    can.corpsenm = corpse.corpsenm;
    can.cursed = obj.cursed;
    can.blessed = obj.blessed;
    can.owt = weight(can);
    can.known = 1;
    set_tin_variety(can, HOMEMADE_TIN);

    if (carried(corpse)) {
        if (corpse.unpaid)
            note_unported_apply('use_tinning_kit:shop_billing');
        useup(corpse);
    } else {
        await useupf(corpse, 1);
    }
    await hold_another_object(can, 'You make, but cannot pick up, %s.',
                              doname(can), null);
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
    const obj = await getobj('rub', rub_ok, GETOBJ_NOFLAGS);
    if (!obj)
        return ECMD_CANCEL;

    if (is_graystone(obj))
        return await use_stone(obj);

    if (obj.oclass === OCLASSES.FOOD_CLASS) {
        note_unported_apply('dorub:use_royal_jelly');
        await pline("Sorry, I don't know how to use that.");
        return ECMD_OK;
    }
    if (obj !== game.u.uwep) {
        if (await wield_tool(obj, 'rub')) {
            cmdq_add_ec(CQ_CANNED, dorub);
            cmdq_add_key(CQ_CANNED, obj.invlet);
            return ECMD_TIME;
        }
        return ECMD_OK;
    }

    if (obj.otyp === ONAMES.MAGIC_LAMP) {
        if (obj.spe > 0 && !rn2(3)) {
            if (obj.unpaid) {
                const { check_unpaid_usage } = await import('./shk.js');
                await check_unpaid_usage(obj, true);
            }
            obj.otyp = ONAMES.OIL_LAMP;
            obj.spe = 0;
            obj.age = rn1(500, 1000);
            if (obj.lamplit)
                await begin_burn(obj, true);
            await djinni_from_bottle(obj);
            makeknown(ONAMES.MAGIC_LAMP);
            update_inventory();
        } else if (rn2(2)) {
            await You(`${game.u.ublind ? 'smell' : 'see a puff of'} smoke.`);
        } else {
            await pline(nothing_happens);
        }
    } else if (obj.otyp === ONAMES.BRASS_LANTERN) {
        await pline('Rubbing the electric lamp is not particularly rewarding.');
        await pline('Anyway, nothing exciting happens.');
    } else {
        await pline(nothing_happens);
    }
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

const is_wet_towel = (obj) => obj.otyp === ONAMES.TOWEL && obj.spe > 0;

function freehand() {
    const u = game.u;
    return !u.uwep || !welded(u.uwep)
        || (!bimanual(u.uwep) && (!u.uarms || !u.uarms.cursed));
}

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
    const u = game.u;
    const drying_feedback = obj === u.uwep;
    const { make_blinded, make_glib } = await import('./potion.js');

    if (!freehand()) {
        await You(`have no free ${body_part(HAND)}!`);
        return ECMD_OK;
    }
    if (obj === u.ublindf) {
        await You("cannot use it while you're wearing it!");
        return ECMD_OK;
    }

    if (obj.cursed) {
        switch (rn2(3)) {
        case 2: {
            const old = (u.intrinsic?.HGlib | 0) & TIMEOUT;
            make_glib(old + rn1(10, 3));
            await Your(`${makeplural(body_part(HAND))} `
                       + `${old ? 'are filthier than ever' : 'get slimy'}!`);
            if (is_wet_towel(obj))
                await dry_a_towel(obj, -1, drying_feedback);
            return ECMD_TIME;
        }
        case 1:
            if (!u.ublindf) {
                const old = u.ucreamed || 0;
                u.ucreamed = old + rn1(10, 3);
                await pline(`Yecch!  Your ${body_part(FACE)} `
                            + `${old ? 'has more' : 'now has'} gunk on it!`);
                const blinded = (u.intrinsic?.HBlinded | 0) & TIMEOUT;
                await make_blinded(blinded + u.ucreamed - old, true);
            } else {
                const what = u.ublindf.otyp === ONAMES.LENSES ? 'lenses'
                    : obj.otyp === u.ublindf.otyp ? 'other towel'
                        : 'blindfold';
                if (u.ublindf.cursed) {
                    await You(`push your ${what} `
                              + `${rn2(2) ? 'cock-eyed' : 'crooked'}.`);
                } else {
                    const blindf = u.ublindf;
                    await You(`push your ${what} off.`);
                    await Blindf_off(blindf);
                    const { dropx } = await import('./do.js');
                    await dropx(blindf);
                }
            }
            if (is_wet_towel(obj))
                await dry_a_towel(obj, -1, drying_feedback);
            return ECMD_TIME;
        default:
            break;
        }
    }

    if (Glib()) {
        make_glib(0);
        await You(`wipe off your ${u.uarmg
            ? gloves_simple_name(u.uarmg) : makeplural(body_part(HAND))}.`);
        if (is_wet_towel(obj))
            await dry_a_towel(obj, -1, drying_feedback);
        return ECMD_TIME;
    }

    if (u.ucreamed) {
        const intr = (u.intrinsic ||= {});
        const old = intr.HBlinded | 0;
        const remaining = Math.max(0, (old & TIMEOUT) - u.ucreamed);
        intr.HBlinded = (old & ~TIMEOUT) | remaining;
        if (!intr.HBlinded)
            delete intr.HBlinded;
        u.ucreamed = 0;

        const blindfolded = u.ublindf
            && (u.ublindf.otyp === ONAMES.BLINDFOLD
                || u.ublindf.otyp === ONAMES.TOWEL);
        const eyeless = Upolyd(u) && game.youmonst?.data
            && !haseyes(game.youmonst.data);
        const still_blind = eyeless
            || (!u.blocked?.BLINDED && (!!remaining || !!blindfolded));
        u.ublind = still_blind ? 1 : 0;

        if (!still_blind) {
            await pline("You've got the glop off.");
            if (u.uswallow)
                note_unported_apply('use_towel:gulp_blnd_check');
            intr.HBlinded = 1;
            u.ublind = u.blocked?.BLINDED ? 0 : 1;
            await make_blinded(0, true);
        } else {
            await Your(`${body_part(FACE)} feels clean now.`);
        }
        if (is_wet_towel(obj))
            await dry_a_towel(obj, -1, drying_feedback);
        return ECMD_TIME;
    }

    await Your(`${body_part(FACE)} and ${makeplural(body_part(HAND))} `
               + 'are already clean.');
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

function fingers_or_gloves(check_gloves) {
    return check_gloves && game.u.uarmg
        ? gloves_simple_name(game.u.uarmg)
        : makeplural(body_part(FINGER));
}

export async function consume_obj_charge(obj) {
    if (obj.unpaid) {
        const { check_unpaid } = await import('./shk.js');
        await check_unpaid(obj);
    }
    obj.spe = (obj.spe | 0) - 1;
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
    await consume_obj_charge(obj);

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
            await consume_obj_charge(obj);
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

        await consume_obj_charge(obj);
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
async function use_stethoscope(obj) {
    /* nohands/freehand: un-polymorphed hero with free hands; a welded
       two-hander would matter and is recorded */
    if (Deaf()) {
        await You_cant("hear anything!");
        return ECMD_OK;
    }
    if (game.u.uwep && game.u.uwep.cursed && game.u.uwep.bknown)
        note_unported_apply('use_stethoscope:freehand');

    if (!await getdir(null))
        return ECMD_CANCEL;

    const res = (game.hero_seq === game.context.stethoscope_seq)
        ? ECMD_TIME : ECMD_OK;
    game.context.stethoscope_seq = game.hero_seq;

    if (game.u.usteed && game.u.dz > 0) {
        note_unported_apply('use_stethoscope:steed');
        return res;
    }
    if (game.u.dz) {
        note_unported_apply('use_stethoscope:dz');
        return res;
    }
    if (obj.cursed && !rn2(2)) {
        await You_hear("your heart beat.");
        return res;
    }
    /* confdir(FALSE) is a no-op for an unimpaired hero */
    if (game.u.uprops?.CONFUSION?.intrinsic || game.u.uprops?.STUNNED?.intrinsic)
        note_unported_apply('use_stethoscope:confdir');
    if (!game.u.dx && !game.u.dy) {
        await ustatusline();
        return res;
    }
    const rx = game.u.ux + game.u.dx, ry = game.u.uy + game.u.dy;
    if (!isok(rx, ry)) {
        await You_hear("a faint typing noise.");
        return ECMD_OK;
    }
    const mtmp = m_at(rx, ry);
    if (mtmp) {
        if (mtmp.mundetected) {
            note_unported_apply('use_stethoscope:hidden_monster');
            mtmp.mundetected = 0;
        } else if (mtmp.mappearance) {
            let what = 'thing', use_plural = false;
            switch (M_AP_TYPE(mtmp)) {
            case M_AP_OBJECT: {
                const otyp = mtmp.mappearance;
                const fake = { otyp, oclass: game.objects[otyp]?.oc_class };
                what = OBJ_NAME(game.objects[otyp]) || 'thing';
                use_plural = is_boots(fake) || is_gloves(fake)
                             || otyp === ONAMES.LENSES;
                break;
            }
            case M_AP_MONSTER:
                what = pmname(game.mons[mtmp.mappearance], mtmp.female ? 1 : 0);
                break;
            case M_AP_FURNITURE:
                what = defsyms[mtmp.mappearance]?.explain || 'thing';
                break;
            }
            seemimic(mtmp);
            const mnm = x_monnam(mtmp, ARTICLE_A, null,
                                 SUPPRESS_IT | SUPPRESS_INVISIBLE, false);
            await pline(`${use_plural ? 'Those' : 'That'} ${what} `
                        + `${use_plural ? 'are' : 'is'} really ${mnm}.`);
        }
        await mstatusline(mtmp);
        return res;
    }
    await You('hear nothing special.');
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

// src/apply.c:4244, applying facewear toggles the selected item directly.
async function use_blindfold(obj) {
    const ublindf = game.u.ublindf;
    if (obj === ublindf) {
        if (!await cursed(obj))
            await Blindf_off(obj);
    } else if (!ublindf) {
        await Blindf_on(obj);
    } else {
        await You(`are already ${ublindf.otyp === ONAMES.TOWEL
            ? 'covered by a towel'
            : ublindf.otyp === ONAMES.BLINDFOLD
                ? 'wearing a blindfold' : 'wearing lenses'}.`);
    }
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
        wake_nearby(true);
        if (obj.cursed)
            note_unported_apply('use_whistle:vault_summon_gd');
    }
}

function whistle_count_name(count) {
    return count === 2 ? 'two' : count === 3 ? 'three'
         : count === 4 ? 'four' : count <= 7 ? 'several' : 'many';
}

// src/apply.c:516 magic_whistled(). Relocate every tame companion next to the
// hero, identify an unknown whistle when the move is visible, and combine the
// relocation feedback once the whistle is already known.
async function magic_whistled(obj) {
    if ((game.level?.flags?.stasis_until ?? 0) >= game.moves)
        return;

    const alreadyDiscovered = !!game.objects[obj.otyp].oc_name_known;
    let shift = 0, appear = 0, disappear = 0, trapped = 0;
    let shiftName = '', appearName = '', disappearName = '';

    for (const mtmp of [...(game.level?.monsters || [])]) {
        if (DEADMONSTER(mtmp) || !mtmp.mtame || mtmp === game.u.usteed)
            continue;
        if (mtmp.mtrapped) {
            mtmp.mtrapped = 0;
            note_unported_apply('magic_whistled:fill_pit');
        }

        const oldSeen = canspotmon(mtmp);
        const oldName = oldSeen ? y_monnam(mtmp) : '';
        if (M_AP_TYPE(mtmp))
            seemimic(mtmp);
        const oldx = mtmp.mx, oldy = mtmp.my;
        await mnexto(mtmp, alreadyDiscovered ? RLOC_NONE : RLOC_MSG);
        if (mtmp.mx === oldx && mtmp.my === oldy)
            continue;

        if (mtmp.mundetected) {
            mtmp.mundetected = 0;
            newsym(mtmp.mx, mtmp.my);
        }
        const previousMessage = game._prevmsg;
        const wasAlive = !DEADMONSTER(mtmp);
        const { mintrap } = await import('./trap.js');
        await mintrap(mtmp, NO_TRAP_FLAGS);
        if (wasAlive && DEADMONSTER(mtmp))
            change_luck(-1);
        if (game._prevmsg !== previousMessage) {
            trapped++;
            continue;
        }

        const newSeen = !DEADMONSTER(mtmp) && canspotmon(mtmp);
        if (newSeen) {
            const newName = y_monnam(mtmp);
            if (oldSeen) {
                if (++shift === 1)
                    shiftName = `${newName} shifts location`;
            } else if (++appear === 1) {
                appearName = `${newName} appears`;
            }
        } else if (oldSeen && ++disappear === 1) {
            disappearName = `${oldName} disappears`;
        }
    }

    if (!alreadyDiscovered) {
        if (shift + appear + trapped > 0)
            makeknown(obj.otyp);
        return;
    }

    if (shift > 1)
        shiftName = `${whistle_count_name(shift)} creatures shift locations`;
    if (appear > 1)
        appearName = `${whistle_count_name(appear)} ${shift === 0
            ? 'creatures' : shift === 1 ? 'other creatures' : 'others'} appear`;
    if (disappear > 1)
        disappearName = `${whistle_count_name(disappear)} ${
            shift === 0 && appear === 0 ? 'creatures'
                : shift < 2 && appear < 2 ? 'other creatures' : 'others'} disappear`;

    let message = '';
    if (shift)
        message = upstart(shiftName);
    if (appear)
        message = !message ? upstart(appearName)
            : `${message}${disappear ? ',' : ' and'} ${appearName}`;
    if (disappear)
        message = !message ? upstart(disappearName)
            : `${message}${shift && appear ? ',' : ''} and ${disappearName}`;
    if (message)
        await pline(`${message}.`);
}

// src/apply.c:495 use_magic_whistle().
async function use_magic_whistle(obj) {
    if (!can_blow(game.youmonst)) {
        await You('are incapable of using the whistle.');
    } else if (obj.cursed && !rn2(2)) {
        await You(`produce a ${Underwater() ? 'very ' : ''}high-${Deaf()
            ? 'frequency vibration' : 'pitched humming noise'}.`);
        wake_nearby(true);
        if (!rn2(2))
            note_unported_apply('use_magic_whistle:tele_to_rnd_pet');
    } else {
        const kind = Hallucination() ? 'normal'
            : Underwater() && !Deaf() ? 'strange, high-pitched' : 'strange';
        await You(Deaf() ? `produce a ${kind}, sharp vibration.`
                         : `produce a ${kind} whistling sound.`);
        await magic_whistled(obj);
    }
}

// src/makemon.c:1471, the arrival message from synchronous makemon().
async function bagotricks_arrival(mtmp) {
    const appearance = M_AP_TYPE(mtmp);
    const visible = canseemon(mtmp);
    const discerned = (visible
                       && (appearance === M_AP_NOTHING
                           || appearance === M_AP_MONSTER))
                      || sensemon(mtmp);

    if (discerned) {
        const what = Amonnam(mtmp);
        const du = distu(mtmp.mx, mtmp.my, game.u.ux, game.u.uy);
        await Norep(`${what} suddenly ${vtense(what, 'appear')}${
            du <= 2 ? ' next to you'
                : du <= BOLT_LIM * BOLT_LIM ? ' close by' : ''}!`);
    } else if (visible) {
        note_unported_apply('bagotricks:mimic_arrival_description');
    }
    return discerned;
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

    if (bag.unpaid && !tipping) {
        const { check_unpaid } = await import('./shk.js');
        await check_unpaid(bag);
    }
    bag.spe--;
    if (bag.known)
        update_inventory();

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
async function use_unicorn_horn(obj) {
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
    if (nohands(game.youmonst.data)) {
        await You("aren't able to use or apply tools in your current form.");
        return ECMD_OK;
    }
    if (await check_capacity(null))
        return ECMD_OK;

    const obj = await getobj('use or apply', apply_ok, 0);

    if (!obj)
        return ECMD_OK; /* ECMD_CANCEL */

    if (obj.oclass === OCLASSES.COIN_CLASS)
        return await flip_coin(obj);

    if (obj.oclass === OCLASSES.SPBOOK_CLASS)
        return await flip_through_book(obj);

    if (LOCK_TOOLS.includes(obj.otyp)) {
        /* src/apply.c:4288 — ECMD_TIME when pick_lock() did anything at all
           (learned something or started picking), ECMD_OK otherwise */
        return (await pick_lock(obj, 0, 0, null)) !== 0 ? ECMD_TIME : ECMD_OK;
    }

    if (obj.otyp === ONAMES.STETHOSCOPE)
        return await use_stethoscope(obj);

    if (obj.otyp === ONAMES.BLINDFOLD || obj.otyp === ONAMES.LENSES)
        return await use_blindfold(obj);

    if (obj.otyp === ONAMES.MAGIC_WHISTLE) {
        await use_magic_whistle(obj);
        return ECMD_TIME;
    }

    if (obj.otyp === ONAMES.TIN_WHISTLE) {
        await use_whistle(obj);
        return ECMD_TIME;
    }

    if (obj.otyp === ONAMES.LEASH)
        return await use_leash(obj);

    if (obj.otyp === ONAMES.EUCALYPTUS_LEAF) {
        if (obj.blessed) {
            await use_magic_whistle(obj);
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
        return ECMD_TIME;
    }

    if (obj.otyp === ONAMES.LUMP_OF_ROYAL_JELLY)
        return await use_royal_jelly(obj);

    if (obj.otyp === ONAMES.TOWEL)
        return await use_towel(obj);

    if (obj.otyp === ONAMES.CAN_OF_GREASE)
        return await use_grease(obj);

    if (obj.otyp === ONAMES.TINNING_KIT) {
        await use_tinning_kit(obj);
        return ECMD_TIME;
    }

    if (obj.otyp === ONAMES.EXPENSIVE_CAMERA)
        return await use_camera(obj);

    if (obj.otyp === ONAMES.CREAM_PIE)
        return await use_cream_pie(obj);

    if (obj.otyp === ONAMES.BANANA) {
        if (Hallucination()) {
            await pline('It rings! ... But no-one answers.');
            return ECMD_TIME;
        }
        await pline("Sorry, I don't know how to use that.");
        return ECMD_FAIL;
    }

    if (obj.otyp === ONAMES.MAGIC_MARKER) {
        return await dowrite(obj);
    }

    if (obj.otyp === ONAMES.FIGURINE)
        return await use_figurine(obj);

    if (obj.otyp === ONAMES.UNICORN_HORN) {
        await use_unicorn_horn(obj);
        return ECMD_TIME;
    }

    if (is_graystone(obj))
        return await use_stone(obj);

    if (obj.otyp === ONAMES.BULLWHIP)
        return await use_whip(obj);

    if (obj.otyp === ONAMES.TIN_OPENER)
        return await use_tin_opener(obj);

    if (NEEDS_DIR.includes(obj.otyp)) {
        if (!await getdir(null))
            return ECMD_OK;
        note_unported_apply(`apply:dir otyp=${obj.otyp}`);
        return ECMD_TIME;
    }

    if (LAMPS.includes(obj.otyp)) {
        await use_lamp(obj);
        return ECMD_TIME;
    }

    if (obj.otyp === ONAMES.POT_OIL) {
        await light_cocktail(obj);
        return ECMD_TIME;
    }

    if (obj.otyp === ONAMES.BELL || obj.otyp === ONAMES.BELL_OF_OPENING) {
        await use_bell(obj);
        return ECMD_TIME;
    }

    if (obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION) {
        await use_candelabrum(obj);
        return ECMD_TIME;
    }

    if (obj.otyp === ONAMES.WAX_CANDLE || obj.otyp === ONAMES.TALLOW_CANDLE) {
        await use_candle(obj);
        return ECMD_TIME;
    }

    if (obj.otyp === ONAMES.HORN_OF_PLENTY) {
        await hornoplenty(obj);
        return ECMD_TIME;
    }

    if (obj.otyp === ONAMES.BAG_OF_TRICKS) {
        await bagotricks(obj);
        return ECMD_TIME;
    }

    if (MUSICAL_INSTRUMENTS.includes(obj.otyp)) {
        const { do_play_instrument } = await import('./music.js');
        return await do_play_instrument(obj);
    }

    if (APPLIED_CONTAINERS.includes(obj.otyp)) {
        const { use_container } = await import('./pickup.js');
        return await use_container(obj, true, false);
    }

    if (is_pick(obj) || is_axe(obj))
        return await use_pick_axe(obj);

    /* src/apply.c doapply's switch: an otyp with a real case whose handler
       is not ported yet is recorded; anything else falls to C's default
       arm, which is fully defined: pole-arms and diggers get their use
       functions, everything else is refused with a message. */
    if (APPLY_CASED_OTYPS.has(obj.otyp)) {
        note_unported_apply(`apply:otyp=${obj.otyp}`);
        return ECMD_OK;
    }
    if (is_pole(obj)) {
        note_unported_apply('apply:use_pole');
        return ECMD_OK;
    }
    await pline("Sorry, I don't know how to use that.");
    return ECMD_FAIL;
}

/* src/apply.c:4280 — the otyps doapply's switch names explicitly */
const APPLY_CASED_OTYPS = new Set([
    'BLINDFOLD', 'LENSES', 'CREAM_PIE', 'LUMP_OF_ROYAL_JELLY', 'BULLWHIP',
    'GRAPPLING_HOOK', 'LARGE_BOX', 'CHEST', 'ICE_BOX', 'SACK',
    'BAG_OF_HOLDING', 'OILSKIN_SACK', 'BAG_OF_TRICKS', 'CAN_OF_GREASE',
    'LOCK_PICK', 'CREDIT_CARD', 'SKELETON_KEY', 'TINNING_KIT', 'LEASH',
    'SADDLE', 'MAGIC_WHISTLE',
    'TIN_WHISTLE', 'EUCALYPTUS_LEAF', 'STETHOSCOPE', 'MIRROR', 'BELL',
    'BELL_OF_OPENING', 'CANDELABRUM_OF_INVOCATION', 'WAX_CANDLE',
    'TALLOW_CANDLE', 'OIL_LAMP', 'MAGIC_LAMP', 'BRASS_LANTERN', 'POT_OIL',
    'EXPENSIVE_CAMERA', 'TOWEL', 'CRYSTAL_BALL', 'MAGIC_MARKER',
    'TIN_OPENER', 'FIGURINE', 'UNICORN_HORN', 'WOODEN_FLUTE', 'MAGIC_FLUTE',
    'TOOLED_HORN', 'FROST_HORN', 'FIRE_HORN', 'WOODEN_HARP', 'MAGIC_HARP',
    'BUGLE', 'LEATHER_DRUM', 'DRUM_OF_EARTHQUAKE', 'HORN_OF_PLENTY',
    'LAND_MINE', 'BEARTRAP', 'FLINT', 'LUCKSTONE', 'LOADSTONE',
    'TOUCHSTONE', 'BANANA',
].map((k) => ONAMES[k]).filter((v) => v !== undefined));


// src/apply.c:1997 is_valid_jump_pos() — can the hero jump to <x,y>?
//
// The first arm is the one every recorded jump takes: without a jumping
// intrinsic the destination must be a knight's move away, distu == 5. The
// door-trajectory tail (which decides whether a diagonal jump can leave or
// enter a doorway) is recorded.
/* src/apply.c:1997 — C prints inline and returns FALSE. Our pline is async
   and get_valid_jump_position() is called from a sync path, so the test
   returns the reason C would have printed (null when the jump is legal) and
   the caller with a message to give prints it. The tests and their order are
   C's exactly. */
export function jump_pos_failure(x, y, magic) {
    const distu = dist2(x, y, game.u.ux, game.u.uy);

    if (!magic && !game.u.uprops?.JUMPING && distu !== 5)
        return { pline: 'Illegal move!' };
    if (distu > (magic ? 6 + magic * 3 : 9))
        return { pline: 'Too far!' };
    if (!isok(x, y))
        return { You: 'cannot jump there!' };
    if (!cansee(x, y))
        return { You: 'cannot see where to land!' };

    /* src/apply.c:2003 — classify the trajectory so the door checks below
       can tell a horizontal jump from a vertical one. Knight's moves and
       other irregular directions are flattened onto the nearest axis. */
    const dx = x - game.u.ux, dy = y - game.u.uy;
    let ax = Math.abs(dx), ay = Math.abs(dy);
    const diag = (magic || game.u.uprops?.PASSES_WALLS || (!dx && !dy)) ? jAny
               : !dy ? jHorz : !dx ? jVert : jDiag;
    if (ax >= 2 * ay)
        ay = 0;
    else if (ay >= 2 * ax)
        ax = 0;
    const traj = (magic || game.u.uprops?.PASSES_WALLS || (!ax && !ay)) ? jAny
               : !ay ? jHorz : !ax ? jVert : jDiag;

    const lev = game.level?.at(game.u.ux, game.u.uy);
    if (diag === jDiag && IS_DOOR(lev?.typ) && (lev.doormask & D_ISOPEN))
        return { You_cant: 'jump diagonally out of a doorway.' };
    if (!walk_path({ x: game.u.ux, y: game.u.uy }, { x, y },
                   check_jump, traj))
        return { There: 'is an obstacle preventing that jump.' };
    return null;
}

// src/apply.c:2065 — the caller that wants the messages.
export async function is_valid_jump_pos(x, y, magic, showmsg) {
    const fail = jump_pos_failure(x, y, magic);
    if (!fail)
        return true;
    if (showmsg) {
        if (fail.pline) await pline(fail.pline);
        else if (fail.You) await You(fail.You);
        else if (fail.You_cant) await You_cant(fail.You_cant);
        else if (fail.There) await There(fail.There);
    }
    return false;
}

/* src/apply.c:1975 — the jump trajectory classes. */
const jAny = 0, jHorz = 1, jVert = 2, jDiag = 3;

// src/apply.c:1980 check_jump() — walk_path's per-square callback.
function check_jump(traj, x, y) {
    const lev = game.level?.at(x, y);

    if (game.u.uprops?.PASSES_WALLS)
        return true;
    if (IS_STWALL(lev?.typ))
        return false;
    if (IS_DOOR(lev?.typ)) {
        if (closed_door(x, y))
            return false;
        if ((lev.doormask & D_ISOPEN) && traj !== jAny
            && (traj === jDiag
                || ((traj & jHorz) !== 0) === (!!lev.horizontal)))
            return false;
        /* empty doorways aren't restricted */
    }
    if (sobj_at(ONAMES.BOULDER, x, y))
        return false;                   /* throws_rocks: no giant hero here */
    return true;
}

// src/apply.c:2035 get_valid_jump_position()
export function get_valid_jump_position(x, y) {
    return isok(x, y)
           && (ACCESSIBLE(game.level?.at(x, y)?.typ)
               || game.u.uprops?.PASSES_WALLS)
           && !jump_pos_failure(x, y, game.jumping_is_magic);
}
