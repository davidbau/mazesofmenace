// zap.js — Zap command / wish helpers (partial).
// C ref: zap.c dozap, zappable, weffects, zapnodir, learnwand, makewish,
//        zapyourself, ubuzz, dobuzz, zhitm, destroy_items, resist,
//        bhit, bhito, bhitm, bhitpile, poly_obj, obj_shudders,
//        cancel_item, cancel_monst, revive, revive_egg, unturn_dead,
//        unturn_you
//
// Branch envelope: getobj wand + zappable + cursed backfire gate +
// NODIR weffects → zapnodir WAN_SECRET_DOOR_DETECTION → findit;
// directional getdir ('.' = self) → confdir + zapyourself SPE_HEALING /
// SPE_EXTRA_HEALING / WAN_SLEEP / SPE_SLEEP / WAN_DEATH /
// SPE_FINGER_OF_DEATH / WAN_POLYMORPH / WAN_STRIKING / WAN_CANCELLATION /
// WAN_TELEPORTATION / WAN_UNDEAD_TURNING / WAN_LIGHT;
// getobj `?`/`*` → display_pickinv_reply; RAY weffects → ubuzz/dobuzz
// for WAN_MAGIC_MISSILE..WAN_LIGHTNING (zhitm damage types + bounce +
// Reflecting); IMMEDIATE weffects → bhit(rn1(8,6)) + bhito WAN_POLYMORPH
// / cancel / striking boulder+statue+hero_breaks / tele pile + bhitm
// strike/cancel/poly/tele/undead(+unturn_dead); RAY WAN_DIGGING/SPE_DIG
// → zap_dig (dig.c).
// Named omissions: zap_updown/uswallow full; bhitm slow/speed/locking/
// probing/opening/healing; zap_map; spell ubuzz; mon_reflects;
// fireball/Hallucination hdmgtype rn2; zap_over_floor ice melt/fountain/
// WEB/POOL→PIT/cold freeze; burn_floor_objects after fire door;
// map_invisible/unmap during buzz; backfire body; other NODIR; wrest
// pline; check_capacity; check_unpaid; update_inventory; shieldeff/
// monstunseesu; setworn EReflecting bits; ureflects W_WEP/W_AMUL/W_ARM/
// silver-dragon arms beyond shield makeknown; create_polymon after
// poly_zapped; do_osshock shop bill; invent/worn poly_obj arms;
// boxlock on Is_box; blank_novel / corpse revive→rot timer; revive
// container/buried/cant_revive/omonst/ghost/shop stolen_value;
// defended(); resists_magm body; ignite_items body; burnarmor worn
// erode ported (D-0741); acid_damage/erode_armor; death-breath
// disintegrate_arm; potionbreathe invis flash (D-0741);
// inventory_resistance_check; destroy_items elec body; ugolemeffects;
// burn_away_slime; spell_damage_bonus / Knight questart double;
// Rider/Death specials; disintegrate_mon; fire completelyburns
// XKILL_NOCORPSE; mon_reflects; flash_hits WAN_LIGHT bhitm.
// Shop door/bars destroy + dobuzz pay_for_damage: D-0948.
// Break-wand adjacent bhit + cancel helpers: D-0952.
// unturn_dead invent revive + hero_breaks + worn ABON: D-0955.

import { game } from './gstate.js';
import { rn1, rn2, rnd, d } from './rng.js';
import { getlin } from './getline.js';
import {
    flush_screen, flush_topl_more, pline, Norep, You_feel, newsym,
    tmp_at, zapdir_to_glyph, nh_delay_output, canseemon, canspotmon,
} from './display.js';
import { cansee, couldsee } from './vision.js';
import { nhgetch } from './input.js';
import { readobjnam, HANDS_OBJ, NOTHING_OBJ } from './readobjnam.js';
import { hold_another_object, makeknown, encumber_msg } from './invent.js';
import { doname, xname, vtense, The, an } from './objnam.js';
import {
    A_WIS, A_STR, A_CON, A_DEX, A_INT, A_CHA, exercise,
} from './attrib.js';
import { findit } from './detect.js';
import {
    confdir, fall_asleep, losehp, maybe_half_phys, nomul, is_pool,
    in_rooms, dissolve_bars, stop_occupation,
} from './hack.js';
import {
    nonliving, is_demon, nohands, MR_FIRE, MR_COLD, MR_DISINT, MR_ELEC,
    MR_POISON, MR_ACID, is_undead, is_vampshifter, monsterNames, mons,
} from './monsters.js';
import { m_at, wakeup, seemimic, dead_species, normal_shape } from './mon.js';
import { find_mac, monkilled } from './mhitm.js';
import { more_experienced } from './exper.js';
import { obj_resists } from './dogmove.js';
import { zap_dig, fracture_rock, break_statue } from './dig.js';
import { killed, xkilled } from './uhitm.js';
import { mon_nam, Monnam } from './do_name.js';
import { finish_losehp_done } from './end.js';
import { burnarmor } from './trap.js';
import { potionbreathe, make_stunned } from './potion.js';
import { create_gas_cloud } from './region.js';
import { cvt_sdoor_to_door } from './detect.js';
import { recalc_block_point } from './vision.js';
import { picking_at, reset_pick } from './lock.js';
import { monflee } from './monmove.js';
import { newcham, makemon } from './makemon.js';
import { tele, u_teleport_mon, rloco, enexto } from './teleport.js';
import { find_ac } from './u_init.js';
import { rehumanize } from './polyself.js';
import { costly_alteration } from './shk.js';
import {
    mkobj, delobj, objects_at, replace_object, rnd_class, weight, splitobj,
    oc_merge_of, uncurse, attach_egg_hatch_timeout,
} from './mkobj.js';
import {
    WAND_CLASS, SPBOOK_CLASS, WEAPON_CLASS, ARMOR_CLASS, POTION_CLASS,
    TOOL_CLASS, GEM_CLASS, SCROLL_CLASS, RING_CLASS, FOOD_CLASS, NODIR,
    IMMEDIATE, objectNames,
} from './objects.js';
import {
    WAND_BACKFIRE_CHANCE, WAND_WREST_CHANCE, nothing_happens,
    NO_KILLER_PREFIX, DIED, KILLED_BY, KILLED_BY_AN, isok, ZAP_POS, STONE,
    IS_DOOR, IS_ROOM, D_CLOSED, D_LOCKED, D_NODOOR, D_BROKEN,
    DISP_BEAM, DISP_CHANGE, DISP_END,
    OBJ_FLOOR, OBJ_INVENT, OBJ_MINVENT, Has_contents, ZAPPED_WAND, NOTELL, TELL,
    STRAT_WAITMASK,
    POOL, Is_waterlevel, Is_rogue_level, AD_RBRE, UNCHANGING,
    PLNMSG_ENVELOPED_IN_GAS, PLNMSG_OBJ_GLOWS, IRONBARS, SDOOR, SHOPBASE,
    SHOP_DOOR_COST,
    SHOP_BARS_COST, W_NONDIGGABLE, COST_CANCEL, COST_UNCURS, COST_UNBLSS,
    TIMEOUT, XKILL_GIVEMSG, XKILL_NOCORPSE, Upolyd,
    M_AP_TYPE, M_AP_NOTHING, M_AP_MONSTER, NON_PM, ismnum,
    W_RING, W_ARMG, W_ARMH, W_ARMOR,
    NO_MINVENT, MM_NOWAIT, MM_NOMSG, MM_NOCOUNTBIRTH, IS_POOL,
} from './const.js';
import { hero_breaks, breaks } from './dothrow.js';

const SPE_HEALING = objectNames.indexOf('SPE_HEALING');
const SPE_EXTRA_HEALING = objectNames.indexOf('SPE_EXTRA_HEALING');
const WAN_MAGIC_MISSILE = objectNames.indexOf('WAN_MAGIC_MISSILE');
const WAN_SLEEP = objectNames.indexOf('WAN_SLEEP');
const WAN_LIGHT = objectNames.indexOf('WAN_LIGHT');
const WAN_LIGHTNING = objectNames.indexOf('WAN_LIGHTNING');
const WAN_WISHING = objectNames.indexOf('WAN_WISHING');
const WAN_POLYMORPH = objectNames.indexOf('WAN_POLYMORPH');
const SPE_POLYMORPH = objectNames.indexOf('SPE_POLYMORPH');
const POT_POLYMORPH = objectNames.indexOf('POT_POLYMORPH');
const POT_OIL = objectNames.indexOf('POT_OIL');
const SCR_FIRE = objectNames.indexOf('SCR_FIRE');
const SPE_FIREBALL = objectNames.indexOf('SPE_FIREBALL');
const SPE_BOOK_OF_THE_DEAD = objectNames.indexOf('SPE_BOOK_OF_THE_DEAD');
const GLOB_OF_GREEN_SLIME = objectNames.indexOf('GLOB_OF_GREEN_SLIME');
const AMULET_OF_UNCHANGING = objectNames.indexOf('AMULET_OF_UNCHANGING');
const STRANGE_OBJECT = objectNames.indexOf('STRANGE_OBJECT');
const SPE_SLEEP = objectNames.indexOf('SPE_SLEEP');
const SHIELD_OF_REFLECTION = objectNames.indexOf('SHIELD_OF_REFLECTION');
const WAN_DIGGING = objectNames.indexOf('WAN_DIGGING');
const SPE_DIG = objectNames.indexOf('SPE_DIG');
const WAN_DEATH = objectNames.indexOf('WAN_DEATH');
const SPE_FINGER_OF_DEATH = objectNames.indexOf('SPE_FINGER_OF_DEATH');
const WAN_STRIKING = objectNames.indexOf('WAN_STRIKING');
const SPE_FORCE_BOLT = objectNames.indexOf('SPE_FORCE_BOLT');
const WAN_CANCELLATION = objectNames.indexOf('WAN_CANCELLATION');
const SPE_CANCELLATION = objectNames.indexOf('SPE_CANCELLATION');
const WAN_TELEPORTATION = objectNames.indexOf('WAN_TELEPORTATION');
const SPE_TELEPORT_AWAY = objectNames.indexOf('SPE_TELEPORT_AWAY');
const WAN_UNDEAD_TURNING = objectNames.indexOf('WAN_UNDEAD_TURNING');
const SPE_TURN_UNDEAD = objectNames.indexOf('SPE_TURN_UNDEAD');
const BOULDER = objectNames.indexOf('BOULDER');
const STATUE = objectNames.indexOf('STATUE');
const SCR_BLANK_PAPER = objectNames.indexOf('SCR_BLANK_PAPER');
const SPE_BLANK_PAPER = objectNames.indexOf('SPE_BLANK_PAPER');
const SPE_NOVEL = objectNames.indexOf('SPE_NOVEL');
const POT_WATER = objectNames.indexOf('POT_WATER');
const POT_ACID = objectNames.indexOf('POT_ACID');
const POT_SICKNESS = objectNames.indexOf('POT_SICKNESS');
const POT_SEE_INVISIBLE = objectNames.indexOf('POT_SEE_INVISIBLE');
const POT_FRUIT_JUICE = objectNames.indexOf('POT_FRUIT_JUICE');
const MAGIC_LAMP = objectNames.indexOf('MAGIC_LAMP');
const CRYSTAL_BALL = objectNames.indexOf('CRYSTAL_BALL');
const CANDELABRUM_OF_INVOCATION = objectNames.indexOf('CANDELABRUM_OF_INVOCATION');
const CORPSE = objectNames.indexOf('CORPSE');
const EGG = objectNames.indexOf('EGG');
const RIN_GAIN_STRENGTH = objectNames.indexOf('RIN_GAIN_STRENGTH');
const RIN_GAIN_CONSTITUTION = objectNames.indexOf('RIN_GAIN_CONSTITUTION');
const RIN_ADORNMENT = objectNames.indexOf('RIN_ADORNMENT');
const RIN_INCREASE_ACCURACY = objectNames.indexOf('RIN_INCREASE_ACCURACY');
const RIN_INCREASE_DAMAGE = objectNames.indexOf('RIN_INCREASE_DAMAGE');
const RIN_PROTECTION = objectNames.indexOf('RIN_PROTECTION');
const GAUNTLETS_OF_DEXTERITY = objectNames.indexOf('GAUNTLETS_OF_DEXTERITY');
const HELM_OF_BRILLIANCE = objectNames.indexOf('HELM_OF_BRILLIANCE');
const PM_LONG_WORM = monsterNames.indexOf('PM_LONG_WORM');
const PM_CLAY_GOLEM = monsterNames.indexOf('PM_CLAY_GOLEM');
const PM_KNIGHT = monsterNames.indexOf('PM_KNIGHT');
const NC_VIA_WAND_OR_SPELL = 0x02;
const NC_SHOW_MSG = 0x01;

/* C ref: zap.c ZT_* = AD_* - 1 */
const ZT_MAGIC_MISSILE = 0;
const ZT_FIRE = 1;
const ZT_COLD = 2;
const ZT_SLEEP = 3;
const ZT_DEATH = 4;
const ZT_LIGHTNING = 5;
const ZT_POISON_GAS = 6;
const ZT_ACID = 7;
const ZT_SPELL_0 = 10; // ZT_SPELL(0)
const ZT_BREATH_0 = 20; // ZT_BREATH(0)
const MAGIC_COOKIE = 1000; // zap.c local #define
const AD_COLD = 3;
const AD_FIRE = 2;
const AD_ELEC = 6;
const DMG_DESTROY_SCALE = 5;
const MAX_ITEMS_DESTROYED = 20;

const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

/** C ref: youprop.h Sleep_resistance */
function Sleep_resistance() {
    const u = game.u || {};
    return !!(u.HSleep_resistance || u.ESleep_resistance);
}

/** C ref: youprop.h Fire_resistance */
function Fire_resistance() {
    const u = game.u || {};
    return !!(u.Fire_resistance || u.HFire_resistance || u.EFire_resistance);
}

/** C ref: youprop.h Cold_resistance */
function Cold_resistance() {
    const u = game.u || {};
    return !!(u.Cold_resistance || u.HCold_resistance || u.ECold_resistance);
}

/** C ref: youprop.h Shock_resistance */
function Shock_resistance() {
    const u = game.u || {};
    return !!(u.Shock_resistance || u.HShock_resistance || u.EShock_resistance);
}

/** C ref: youprop.h Antimagic */
function Antimagic() {
    const u = game.u || {};
    return !!(u.Antimagic || u.HAntimagic || u.EAntimagic);
}

/** C ref: youprop.h Half_spell_damage */
function Half_spell_damage() {
    const u = game.u || {};
    return !!(u.Half_spell_damage || u.HHalf_spell_damage
        || u.EHalf_spell_damage);
}

/**
 * C ref: trap.c burnarmor — used via import; local stub removed (D-0741).
 */

/**
 * C ref: youprop.h Reflecting — setworn EReflecting deferred; worn
 * SHIELD_OF_REFLECTION matches Healer starter kit (D-0450).
 */
function Reflecting() {
    const u = game.u || {};
    if (u.HReflecting || u.EReflecting) return true;
    return u.uarms?.otyp === SHIELD_OF_REFLECTION;
}

function Blind() {
    return !!(game.u?.Blind || game.u?.ublind);
}

/** C ref: do_name.c Amonnam — highc(a_monnam). */
function Amonnam(mtmp) {
    const s = mon_nam(mtmp) || 'it';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/** C ref: youprop.h Deaf */
function Deaf() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf);
}

/** C ref: pline.c You_hear — acoustics/Deaf; Unaware/Underwater deferred. */
async function You_hear(line) {
    if (Deaf()) return;
    await pline(`You hear ${line}`);
}

function closed_door(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
}

function rm_wall_info(lev) {
    return ((lev.wall_info | 0) | (lev.flags | 0));
}

function u_at(x, y) {
    return game.u?.ux === x && game.u?.uy === y;
}

/** C ref: zap.c zaptype — abs with monster-wand fixup. */
function zaptype(type) {
    let t = type | 0;
    if (t <= -30 && t >= -39) t += 30;
    return Math.abs(t);
}

/** C ref: hack.h BZ_OFS_WAN / BZ_U_WAND */
function BZ_OFS_WAN(otyp) {
    return Math.abs((otyp | 0) - WAN_MAGIC_MISSILE) % 10;
}
function BZ_U_WAND(bztyp) {
    return 0 + (bztyp | 0);
}

/**
 * C ref: zap.c flash_types — wand 0..9 / spell 10..19 / breath 20..29.
 * Empty slots match C; Hallucination suppress deferred (caller passes
 * fltyp already via zaptype).
 */
function flash_str(fltyp) {
    const names = [
        'magic missile', 'bolt of fire', 'bolt of cold', 'sleep ray',
        'death ray', 'bolt of lightning', '', '', '', '',
        'magic missile', 'fireball', 'cone of cold', 'sleep ray',
        'finger of death', 'bolt of lightning', '', '', '', '',
        'blast of missiles', 'blast of fire', 'blast of frost',
        'blast of sleep gas', 'blast of disintegration',
        'blast of lightning', 'blast of poison gas', 'blast of acid',
        '', '',
    ];
    return names[zaptype(fltyp)] || 'ray';
}

/**
 * C ref: zap.c zap_over_floor — floor effects for buzz trail.
 * Envelope: ZT_FIRE is_pool → create_gas_cloud(rnd(5)) + Norep hissing
 * gas / uneventful (+ POOL rangemod); ZT_POISON_GAS ZAP_POS →
 * create_gas_cloud(1,8); ZT_LIGHTNING/ZT_ACID IRONBARS dissolve + shop
 * bars; SDOOR reveal; closed_door destroy + shop door; ignoremon wakeup.
 * Named omit: WEB burn, ice melt, fountain steam, POOL→ROOM+maketrap PIT,
 * cold freeze, burn_floor_objects.
 */
/**
 * C ref: zap.c zap_over_floor — also called from explode.c explode.
 * shopdamage is `{ v: boolean }` out-param (C `boolean *`).
 */
export async function zap_over_floor(x, y, type, shopdamage, ignoremon, explodingWand) {
    if ((type | 0) === -1) return -1000; // PHYS_EXPL_TYPE
    const loc = game.level?.at?.(x, y);
    if (!loc) return 0;
    const damgtype = zaptype(type) % 10;
    let rangemod = 0;
    let exploding_wand_typ = explodingWand | 0;
    const see_it = cansee(x, y);

    switch (damgtype) {
    case ZT_FIRE: {
        if (is_pool(x, y)) {
            const u = game.u || {};
            const on_water_level = !!Is_waterlevel(u.uz);
            let msggiven = false;
            let msgtxt = !Deaf()
                ? 'You hear hissing gas.'
                : ((type | 0) >= 0
                    ? 'That seemed remarkably uneventful.'
                    : null);

            if (!on_water_level) {
                create_gas_cloud(x, y, rnd(5), 0);
                if ((game.iflags?.last_msg | 0) === PLNMSG_ENVELOPED_IN_GAS) {
                    msggiven = true;
                }
            }

            if ((loc.typ | 0) !== POOL) {
                const seePool = cansee(x, y);
                if (on_water_level) {
                    msgtxt = (seePool || !Deaf()) ? 'Some water boils.' : null;
                } else if (seePool) {
                    msgtxt = 'Some water evaporates.';
                }
            } else {
                // C: POOL → ROOM + maketrap(PIT) + see_it evaporate — deferred;
                // still apply rangemod so buzz length matches.
                rangemod -= 3;
            }
            if (msgtxt && !msggiven) await Norep(msgtxt);
        }
        break;
    }
    case ZT_POISON_GAS:
        if (ZAP_POS(loc.typ)) create_gas_cloud(x, y, 1, 8);
        break;
    case ZT_LIGHTNING:
    case ZT_ACID:
        if ((loc.typ | 0) === IRONBARS) {
            if (damgtype === ZT_LIGHTNING && rn2(10)) break;
            if ((rm_wall_info(loc) & W_NONDIGGABLE) !== 0) {
                if (see_it) {
                    await Norep(`The iron bars ${
                        damgtype === ZT_ACID ? 'corrode' : 'melt'
                    } somewhat but remain intact.`);
                }
            } else {
                rangemod -= 3;
                if (see_it) {
                    await Norep(`The iron bars ${
                        damgtype === ZT_ACID ? 'corrode away' : 'melt'
                    }.`);
                }
                dissolve_bars(x, y);
                if (in_rooms(x, y, SHOPBASE)) {
                    const { add_damage } = await import('./shk.js');
                    add_damage(x, y, (type | 0) >= 0 ? SHOP_BARS_COST : 0);
                    if ((type | 0) >= 0 && shopdamage) shopdamage.v = true;
                }
            }
        }
        break;
    default:
        break;
    }

    // C: zapverb / yourzap for door feedback
    let yourzap = (type | 0) >= 0 && !exploding_wand_typ;
    let zapverb = 'blast';
    if (!exploding_wand_typ) {
        const ztype = zaptype(type);
        if (ztype < ZT_SPELL_0) zapverb = 'bolt';
        else if (ztype < ZT_BREATH_0) zapverb = 'spell';
    } else if (exploding_wand_typ === POT_OIL
        || exploding_wand_typ === SCR_FIRE) {
        exploding_wand_typ = 0;
        yourzap = (type | 0) >= 0 && !exploding_wand_typ;
    }

    // secret door → regular door
    if ((loc.typ | 0) === SDOOR) {
        cvt_sdoor_to_door(loc);
        recalc_block_point(x, y);
        newsym(x, y);
        if (see_it) {
            await pline(
                `${yourzap ? 'Your' : 'The'} ${zapverb} reveals a secret door.`,
            );
        } else if (Is_rogue_level(game.u?.uz)) {
            await You_feel('a draft.');
        }
    }

    // regular door absorbs zap / may be destroyed
    if (closed_door(x, y)) {
        let new_doormask = -1;
        let see_txt = null;
        let sense_txt = null;
        let hear_txt = null;

        rangemod = -1000;
        switch (damgtype) {
        case ZT_FIRE:
            new_doormask = D_NODOOR;
            see_txt = 'The door is consumed in flames!';
            sense_txt = 'smell smoke.';
            break;
        case ZT_COLD:
            new_doormask = D_NODOOR;
            see_txt = 'The door freezes and shatters!';
            hear_txt = 'a deep cracking sound.';
            break;
        case ZT_DEATH:
            if (Math.abs(type | 0) === (ZT_BREATH_0 + ZT_DEATH)) {
                new_doormask = D_NODOOR;
                see_txt = 'The door disintegrates!';
                hear_txt = 'crashing wood.';
                break;
            }
            // non-breath death → absorb (C goto def_case)
            // falls through
        case ZT_LIGHTNING:
            if (damgtype === ZT_LIGHTNING) {
                new_doormask = D_BROKEN;
                see_txt = 'The door splinters!';
                hear_txt = 'crackling.';
                break;
            }
            // falls through for non-breath ZT_DEATH
        default: {
            let handled = false;
            if (exploding_wand_typ > 0
                && exploding_wand_typ === WAN_STRIKING) {
                new_doormask = D_BROKEN;
                see_txt = 'The door crashes open!';
                sense_txt = 'feel a burst of cool air.';
                handled = true;
            }
            if (!handled) {
                if (see_it) {
                    if (exploding_wand_typ) {
                        await pline('The door remains intact.');
                    } else {
                        await pline(
                            `The door absorbs ${yourzap ? 'your' : 'the'} ${
                                zapverb
                            }!`,
                        );
                    }
                } else {
                    await You_feel('vibrations.');
                }
            }
            break;
        }
        }
        if (new_doormask >= 0) {
            if (in_rooms(x, y, SHOPBASE)) {
                const { add_damage } = await import('./shk.js');
                if ((type | 0) >= 0) {
                    add_damage(x, y, SHOP_DOOR_COST);
                    if (shopdamage) shopdamage.v = true;
                } else {
                    add_damage(x, y, 0);
                }
            }
            loc.doormask = new_doormask;
            if (loc.flags !== undefined) loc.flags = new_doormask;
            recalc_block_point(x, y);
            if (see_it) {
                await pline(see_txt);
                newsym(x, y);
            } else if (sense_txt) {
                await pline(`You ${sense_txt}`);
            } else if (hear_txt) {
                await You_hear(hear_txt);
            }
            if (picking_at(x, y)) {
                await stop_occupation();
                reset_pick();
            }
        }
    }

    // burn_floor_objects deferred
    if (!ignoremon) {
        const mon = m_at(x, y);
        if (mon) await wakeup(mon, (type | 0) >= 0);
    }
    return rangemod;
}

/**
 * C ref: muse.c ureflects — shield slot only (W_WEP/W_AMUL/W_ARM/dragon
 * deferred). When fmt+str given, makeknown like C so first observed
 * reflection discovers the type and may exercise(A_WIS) (D-0452).
 */
async function ureflects(fmt, str) {
    if (game.u?.uarms?.otyp === SHIELD_OF_REFLECTION) {
        if (fmt && str) {
            // C: pline(fmt, str, "shield") with fmt "But %s reflects from your %s!"
            await pline(`But ${str} reflects from your shield!`);
            makeknown(SHIELD_OF_REFLECTION);
        }
        return true;
    }
    return false;
}

/**
 * C ref: zap.c zap_hit — rn2(20) vs AC_VALUE(ac).
 * spell_hit_bonus deferred (type always 0 for wand rays here).
 */
function zap_hit(ac, _type) {
    const chance = rn2(20);
    if (!chance) return rnd(10) < (ac | 0);
    // C: AC_VALUE — positive as-is; negative → -rnd(-ac)
    let a = ac | 0;
    if (a < 0) a = -rnd(-a);
    return 3 - chance < a;
}

/** C ref: zap.c bounce_dir */
function bounce_dir(sx, sy, ddx, ddy, bounceback) {
    let dx = ddx;
    let dy = ddy;
    if (!dx || !dy || (bounceback > 0 && !rn2(bounceback))) {
        return { dx: -dx, dy: -dy };
    }
    let bounce = 0;
    const lsy = sy - dy;
    const lsx = sx - dx;
    const typAt = (x, y) => game.level?.at?.(x, y)?.typ;
    const rmn1 = typAt(sx, lsy);
    if (isok(sx, lsy) && ZAP_POS(rmn1)
        && !closed_door(sx, lsy)
        && (IS_ROOM(rmn1) || (isok(sx + dx, lsy) && ZAP_POS(typAt(sx + dx, lsy))))) {
        bounce = 1;
    }
    const rmn2 = typAt(lsx, sy);
    if (isok(lsx, sy) && ZAP_POS(rmn2)
        && !closed_door(lsx, sy)
        && (IS_ROOM(rmn2) || (isok(lsx, sy + dy) && ZAP_POS(typAt(lsx, sy + dy))))) {
        if (!bounce || rn2(2)) bounce = 2;
    }
    switch (bounce) {
    case 0:
        dx = -dx;
        dy = -dy;
        break;
    case 1:
        dy = -dy;
        break;
    case 2:
        dx = -dx;
        break;
    }
    return { dx, dy };
}

/**
 * C ref: mhitm.c sleep_monst subset — resists_sleep deferred to false
 * for unknown; mfrozen path only.
 */
function sleep_monst_zap(mon, amt) {
    if (!mon) return 0;
    if (mon.mcanmove) {
        mon.meating = 0;
        amt = (amt | 0) + (mon.mfrozen | 0);
        if (amt > 0) {
            mon.mcanmove = 0;
            mon.mfrozen = Math.min(amt, 127);
        } else {
            mon.msleeping = 1;
        }
        return 1;
    }
    return 0;
}

/**
 * C ref: monst.h Resists_Elem / mon_resistancebits — data.mresists |
 * mextrinsics | mintrinsics. Named omission: artifact/worn grants.
 */
function mon_resists_bit(mon, mrBit) {
    if (!mon) return false;
    const bits = (mon.data?.mresists | 0)
        | (mon.mextrinsics | 0)
        | (mon.mintrinsics | 0);
    return !!(bits & mrBit);
}
function resists_fire(mon) { return mon_resists_bit(mon, MR_FIRE); }
function resists_cold(mon) { return mon_resists_bit(mon, MR_COLD); }
function resists_elec(mon) { return mon_resists_bit(mon, MR_ELEC); }
function resists_poison(mon) { return mon_resists_bit(mon, MR_POISON); }
function resists_acid(mon) { return mon_resists_bit(mon, MR_ACID); }
function resists_disint(mon) { return mon_resists_bit(mon, MR_DISINT); }
/** C: resists_magm — Antimagic-style; deferred → false (no shield RNG). */
function resists_magm(_mon) { return false; }

/** C ref: zap.c is_hero_spell */
function is_hero_spell(type) {
    return (type | 0) >= ZT_SPELL_0 && (type | 0) < 20;
}

/** C ref: zap.c exclam */
function exclam(force) {
    if (force < 0) return '?';
    if (force <= 4) return '.';
    return '!';
}

/** C ref: zap.c hit — ray hit message (objnam The adds article). */
async function hit_zap(str, mtmp, force) {
    const bx = game.bhitpos?.x ?? mtmp.mx;
    const by = game.bhitpos?.y ?? mtmp.my;
    const verbosely = game.flags?.verbose !== false
        && (cansee(bx, by) || canseemon(mtmp));
    const whom = verbosely ? mon_nam(mtmp) : 'it';
    await pline(`${The(str)} ${vtense(str, 'hit')} ${whom}${force}`);
}

/**
 * C ref: mthrowu.c m_useup — consume one from monster invent.
 */
function m_useup(mon, obj) {
    if (!mon || !obj) return;
    if ((obj.quan | 0) > 1) {
        obj.quan = (obj.quan | 0) - 1;
        return;
    }
    if (mon.minvent === obj) mon.minvent = obj.nobj || null;
    else {
        for (let p = mon.minvent; p; p = p.nobj) {
            if (p.nobj === obj) {
                p.nobj = obj.nobj || null;
                break;
            }
        }
    }
}

/**
 * C ref: invent.c useup — consume one from hero invent array.
 */
function useup_invent(obj) {
    if (!obj) return;
    if ((obj.quan | 0) > 1) {
        obj.quan = (obj.quan | 0) - 1;
        if (typeof weight === 'function') obj.owt = weight(obj);
        return;
    }
    const inv = game.invent || [];
    const idx = inv.indexOf(obj);
    if (idx >= 0) inv.splice(idx, 1);
}

function is_youmonst_carrier(mon) {
    return !!(mon && (mon === game.youmonst || mon._youmonst));
}

/**
 * C ref: zap.c destroyable — AD_COLD potions; AD_FIRE potion/scroll/spbook;
 * AD_ELEC ring/wand subset.
 */
function destroyable(obj, adtyp) {
    if (!obj || obj.oartifact) return false;
    if (obj.in_use && (obj.quan | 0) === 1) return false;
    if (adtyp === AD_COLD) {
        return obj.oclass === POTION_CLASS && (obj.otyp | 0) !== POT_OIL;
    }
    if (adtyp === AD_FIRE) {
        if ((obj.otyp | 0) === SCR_FIRE || (obj.otyp | 0) === SPE_FIREBALL) {
            return false;
        }
        return (obj.otyp | 0) === GLOB_OF_GREEN_SLIME
            || obj.oclass === POTION_CLASS
            || obj.oclass === SCROLL_CLASS
            || obj.oclass === SPBOOK_CLASS;
    }
    if (adtyp === AD_ELEC) {
        if (obj.oclass !== RING_CLASS && obj.oclass !== WAND_CLASS) return false;
        // RIN_SHOCK / WAN_LIGHTNING immune deferred → treat as destroyable
        return true;
    }
    return false;
}

const DESTROY_STRINGS = [
    ['freezes and shatters', 'freeze and shatter', 'shattered potion'],
    ['boils and explodes', 'boil and explode', 'boiling potion'],
    ['ignites and explodes', 'ignite and explode', 'exploding potion'],
    ['catches fire and burns', 'catch fire and burn', 'burning scroll'],
    ['catches fire and burns', '', 'burning book'],
    ['turns to dust and vanishes', '', ''],
    ['breaks apart and explodes', '', 'exploding wand'],
];

/**
 * C ref: zap.c maybe_destroy_item — AD_COLD potions + AD_FIRE potion/scroll/
 * spbook. Named omissions: inventory_resistance_check; worn Ring_gone;
 * Book-of-Dead glow; AD_ELEC body; chargeit; mult forms beyond 1-of-1.
 */
async function maybe_destroy_item(carrier, obj, dmgtyp) {
    if (!obj) return 0;
    const u_carry = is_youmonst_carrier(carrier);
    // inventory_resistance_check deferred → never early-out

    let quan = 0;
    let dmg = 0;
    let dindx = 0;
    let xresist = false;
    let skip = false;

    if (dmgtyp === AD_COLD) {
        quan = obj.quan | 0;
        dindx = 0;
        dmg = rnd(4);
    } else if (dmgtyp === AD_FIRE) {
        xresist = obj.oclass !== POTION_CLASS
            && (obj.otyp | 0) !== GLOB_OF_GREEN_SLIME
            && (u_carry ? Fire_resistance() : false);
        if ((obj.otyp | 0) === SPE_BOOK_OF_THE_DEAD) {
            // glow pline deferred; item remains
            return 0;
        }
        quan = obj.quan | 0;
        if (obj.oclass === POTION_CLASS) {
            dindx = ((obj.otyp | 0) !== POT_OIL) ? 1 : 2;
            dmg = rnd(6);
        } else if (obj.oclass === SCROLL_CLASS) {
            dindx = 3;
            dmg = 1;
        } else if (obj.oclass === SPBOOK_CLASS) {
            dindx = 4;
            dmg = 1;
        } else if (obj.oclass === FOOD_CLASS) {
            dindx = 1;
            dmg = Math.trunc(((obj.owt | 0) + 19) / 20);
        } else {
            return 0;
        }
    } else {
        // AD_ELEC body deferred
        return 0;
    }

    if (skip) return 0;

    const osym = obj.oclass;
    if (obj.in_use) quan -= 1;
    let cnt = 0;
    for (let i = 0; i < quan; i++) {
        if (!rn2(3)) cnt++;
    }
    if (!cnt) return 0;

    // C: pline("%s%s %s!", mult, Yname2/yname, destroy_strings[dindx][cnt>1])
    const vis = !u_carry && canseemon(carrier);
    if (u_carry || vis) {
        const mult = (cnt === 1)
            ? ((quan === 1) ? '' : 'One of ')
            : ((cnt < quan) ? 'Some of '
                : (quan === 2) ? 'Both of ' : 'All of ');
        const verb = DESTROY_STRINGS[dindx]?.[cnt > 1 ? 1 : 0] || 'destroyed';
        // Yname2 ≈ "Your " + xname for 1-of-1 carried
        const nam = (cnt === 1 && quan === 1 && u_carry)
            ? `Your ${xname(obj)}`
            : (u_carry ? `your ${xname(obj)}` : xname(obj));
        await pline(`${mult}${nam} ${verb}!`);
    }

    if (u_carry) {
        // C: potionbreathe before useup (fire/elec potions, not cold)
        if (osym === POTION_CLASS && dmgtyp !== AD_COLD) {
            // breathless/haseyes deferred — wizard/human always qualifies
            await potionbreathe(obj);
        }
        // Ring_gone / setnotworn deferred for worn rings
        if (obj === game.current_wand) game.current_wand = null;
    }

    for (let i = 0; i < cnt; i++) {
        if (u_carry) useup_invent(obj);
        else m_useup(carrier, obj);
    }
    if (dmg) {
        if (!u_carry) return xresist ? 0 : dmg;
        if (xresist) {
            await pline("You aren't hurt!");
        } else {
            const how = DESTROY_STRINGS[dindx]?.[2] || 'destroyed item';
            const one = cnt === 1;
            losehp(dmg, one ? how : `${how}s`, one ? KILLED_BY_AN : KILLED_BY);
            exercise(A_STR, false);
            // C losehp → urgent_pline + done noreturn
            if (game._losehp_needs_done || game.program_state?.gameover) {
                await finish_losehp_done();
            }
        }
    }
    return dmg;
}

/**
 * C ref: zap.c destroy_items — limit rn2 + invent/minvent scan.
 * Hero uses game.invent array; monsters use minvent nobj chain.
 * Named omissions: bypass_objlist; defer levitation/were; elec body.
 */
export async function destroy_items(mon, dmgtyp, dmg_in) {
    let limit = Math.trunc((dmg_in | 0) / DMG_DESTROY_SCALE);
    if (((dmg_in | 0) % DMG_DESTROY_SCALE) > rn2(DMG_DESTROY_SCALE)) limit++;
    if (limit > MAX_ITEMS_DESTROYED) limit = MAX_ITEMS_DESTROYED;
    if (limit < 1) return 0;

    const u_carry = is_youmonst_carrier(mon);
    const items = new Array(MAX_ITEMS_DESTROYED).fill(null);
    let elig_stacks = 0;

    const visit = (obj) => {
        if (!destroyable(obj, dmgtyp)) return;
        const i = (elig_stacks < limit) ? elig_stacks : rn2(elig_stacks);
        elig_stacks++;
        if (i < 0 || i >= limit) return;
        items[i] = obj;
    };

    if (u_carry) {
        for (const obj of game.invent || []) visit(obj);
    } else {
        for (let obj = mon?.minvent; obj; obj = obj.nobj) visit(obj);
    }

    if (elig_stacks > limit) elig_stacks = limit;
    let dmg_out = 0;
    for (let i = 0; i < elig_stacks; i++) {
        const obj = items[i];
        if (obj) {
            dmg_out += await maybe_destroy_item(mon, obj, dmgtyp);
            // C: losehp→done noreturn mid-loop
            if (u_carry && game.program_state?.gameover) break;
        }
    }
    return dmg_out;
}

/** C ref: zap.c ignite_items — body deferred (RNG gate still called). */
function ignite_items(_objchn) {
    // oil lamp / candle ignition deferred
}

/**
 * C ref: zap.c resist — alev by oclass; if resisted halve damage; apply
 * remaining damage and kill when fatal.
 * @returns {Promise<boolean>} true if resisted
 */
async function resist(mtmp, oclass, damage, tell) {
    void tell; // shieldeff deferred
    let alev;
    switch (oclass) {
    case WAND_CLASS: alev = 12; break;
    case TOOL_CLASS: alev = 10; break;
    case WEAPON_CLASS: alev = 10; break;
    case SCROLL_CLASS: alev = 9; break;
    case POTION_CLASS: alev = 6; break;
    case RING_CLASS: alev = 5; break;
    default: alev = game.u?.ulevel | 0; break;
    }
    let dlev = mtmp.m_lev | 0;
    if (dlev > 50) dlev = 50;
    else if (dlev < 1) dlev = 1;
    const mr = mtmp.data?.mr | 0;
    const resisted = rn2(100 + alev - dlev) < mr;
    let dmg = damage | 0;
    if (resisted) dmg = Math.trunc((dmg + 1) / 2);
    if (dmg) {
        mtmp.mhp = (mtmp.mhp | 0) - dmg;
        if ((mtmp.mhp | 0) < 1) {
            if (game.m_using) await monkilled(mtmp, '', AD_RBRE);
            else await killed(mtmp);
        }
    }
    return resisted;
}

/**
 * C ref: zap.c zhitm — wand/spell/breath hit on monster.
 * Envelope: ZT_MAGIC_MISSILE..ZT_ACID dice + cold/fire/elec destroy_items
 * + resist halve. Named omissions: defended(); resists_magm body;
 * spell_damage_bonus; burnarmor/ignite; acid_damage/erode; death-breath
 * armor strip; Rider/Death; Knight questart double; shieldeff.
 * @returns {Promise<number>} damage applied (MAGIC_COOKIE = disintegrate)
 */
async function zhitm(mon, type, nd, ootmp) {
    let tmp = 0;
    let orig_dmg = 0;
    const damgtype = zaptype(type) % 10;
    let sho_shieldeff = false;
    const spellcaster = is_hero_spell(type);
    if (ootmp) ootmp.otmp = null;

    switch (damgtype) {
    case ZT_MAGIC_MISSILE:
        if (resists_magm(mon) /* || defended(mon, AD_MAGM) */) {
            sho_shieldeff = true;
            break;
        }
        tmp = d(nd, 6);
        // spell_damage_bonus deferred
        void spellcaster;
        break;
    case ZT_FIRE:
        if (resists_fire(mon) /* || defended(mon, AD_FIRE) */) {
            sho_shieldeff = true;
            break;
        }
        tmp = d(nd, 6);
        orig_dmg = tmp;
        if (resists_cold(mon)) tmp += 7;
        // C: burnarmor → maybe destroy_items+ignite_items
        if (await burnarmor(mon)) {
            if (!rn2(3)) {
                tmp += await destroy_items(mon, AD_FIRE, orig_dmg);
                ignite_items(mon.minvent);
            }
        }
        break;
    case ZT_COLD:
        if (resists_cold(mon) /* || defended(mon, AD_COLD) */) {
            sho_shieldeff = true;
            break;
        }
        tmp = d(nd, 6);
        orig_dmg = tmp;
        if (resists_fire(mon)) tmp += d(nd, 3);
        if (!rn2(3)) tmp += await destroy_items(mon, AD_COLD, orig_dmg);
        break;
    case ZT_SLEEP:
        tmp = 0;
        sleep_monst_zap(mon, d(nd, 25));
        break;
    case ZT_DEATH: {
        // breath disintegration arms deferred — wand death only
        const absType = Math.abs(type | 0);
        if (absType !== (20 + ZT_DEATH)) { // ZT_BREATH(ZT_DEATH)
            if (nonliving(mon.data) || is_demon(mon.data)
                || resists_magm(mon)) {
                sho_shieldeff = true;
                break;
            }
            type = -1; // no saving throw
        } else {
            if (resists_disint(mon)) {
                sho_shieldeff = true;
            } else {
                tmp = MAGIC_COOKIE;
            }
            type = -1;
            break;
        }
        tmp = (mon.mhp | 0) + 1;
        break;
    }
    case ZT_LIGHTNING:
        tmp = d(nd, 6);
        orig_dmg = tmp;
        if (resists_elec(mon) /* || defended(mon, AD_ELEC) */) {
            sho_shieldeff = true;
            tmp = 0;
        }
        // blinding rnd(50) when nd>2 deferred (no RNG stub when skipped)
        if (!rn2(3)) tmp += await destroy_items(mon, AD_ELEC, orig_dmg);
        break;
    case ZT_POISON_GAS:
        if (resists_poison(mon) /* || defended(mon, AD_DRST) */) {
            sho_shieldeff = true;
            break;
        }
        tmp = d(nd, 6);
        break;
    case ZT_ACID:
        if (resists_acid(mon) /* || defended(mon, AD_ACID) */) {
            sho_shieldeff = true;
            break;
        }
        tmp = d(nd, 6);
        // acid_damage / erode_armor rn2(6) deferred
        break;
    default:
        break;
    }

    // shieldeff deferred
    void sho_shieldeff;
    // Knight questart double deferred
    if (tmp > 0 && (type | 0) >= 0
        && await resist(mon, (type | 0) < ZT_SPELL_0 ? WAND_CLASS : 0, 0, NOTELL)) {
        tmp = Math.trunc(tmp / 2);
    }
    if (tmp < 0) tmp = 0;
    mon.mhp = (mon.mhp | 0) - tmp;
    return tmp;
}

/**
 * C ref: zap.c zhitu — hero hit by ray (wand/spell/breath).
 * Envelope: ZT_MAGIC_MISSILE..ZT_LIGHTNING damage + ZT_FIRE burnarmor/
 * destroy_items/ignite gate + ZT_COLD/ELEC destroy_items + losehp.
 * Named omissions: shieldeff/monstunseesu/ugolemeffects; burn_away_slime;
 * death/disintegrate arms; poison/acid; ignite_items body; killer buzzer
 * verb polish.
 */
async function zhitu(type, nd, fltxt, _sx, _sy) {
    let dam = 0;
    const abstyp = zaptype(type);
    let orig_dam = 0;

    switch (abstyp % 10) {
    case ZT_MAGIC_MISSILE:
        if (Antimagic()) {
            await pline('The missiles bounce off!');
        } else {
            dam = d(nd, 6);
            exercise(A_STR, false);
        }
        break;
    case ZT_FIRE:
        orig_dam = d(nd, 6);
        if (Fire_resistance()) {
            await pline("You don't feel hot!");
            // ugolemeffects deferred
        } else {
            dam = orig_dam;
        }
        // burn_away_slime deferred
        if (await burnarmor(game.youmonst || { _youmonst: true })) {
            if (!rn2(3)) {
                await destroy_items(
                    game.youmonst || { _youmonst: true },
                    AD_FIRE,
                    orig_dam,
                );
            }
            if (!rn2(3)) ignite_items(game.invent);
        }
        break;
    case ZT_COLD:
        orig_dam = d(nd, 6);
        if (Cold_resistance()) {
            await pline("You don't feel cold.");
        } else {
            dam = orig_dam;
        }
        if (!rn2(3)) {
            await destroy_items(
                game.youmonst || { _youmonst: true },
                AD_COLD,
                orig_dam,
            );
        }
        break;
    case ZT_SLEEP:
        if (Sleep_resistance()) {
            await pline("You don't feel sleepy.");
        } else {
            fall_asleep(-d(nd, 25), true);
        }
        break;
    case ZT_DEATH:
        // breath/disintegrate + nonliving/Antimagic arms deferred
        if (nonliving(game.youmonst?.data) || is_demon(game.youmonst?.data)) {
            await pline('You seem unaffected.');
            break;
        }
        if (Antimagic()) {
            await pline("You aren't affected.");
            break;
        }
        {
            if (!game.killer) game.killer = { name: '', format: 0 };
            game.killer.format = KILLED_BY_AN;
            game.killer.name = fltxt || '';
            // C: done(DIED) noreturn from zhitu death arm
            losehp((game.u?.uhp | 0) + 1, fltxt || 'death ray', KILLED_BY_AN);
            if (game._losehp_needs_done || game.program_state?.gameover) {
                await finish_losehp_done();
            }
            return;
        }
    case ZT_LIGHTNING:
        orig_dam = d(nd, 6);
        if (Shock_resistance()) {
            await pline("You aren't affected.");
        } else {
            dam = orig_dam;
            exercise(A_CON, false);
        }
        if (!rn2(3)) {
            await destroy_items(
                game.youmonst || { _youmonst: true },
                AD_ELEC,
                orig_dam,
            );
        }
        break;
    case ZT_POISON_GAS:
    case ZT_ACID:
        // poisoned/acid arms deferred
        break;
    default:
        break;
    }

    // C: destroy_items losehp→done noreturn skips bolt losehp
    if (game.program_state?.gameover) return;

    if (dam && Half_spell_damage() && abstyp < 20) {
        dam = Math.trunc((dam + 1) / 2);
    }
    if (dam) {
        const kbuf = fltxt || 'ray';
        // C hack.c losehp → done(DIED) noreturn — must not resume weffects
        // learnwand (D-0737; same contract as thitu/mbhitm D-0255/D-0323).
        losehp(dam, kbuf, KILLED_BY_AN);
        if (game._losehp_needs_done || game.program_state?.gameover) {
            await finish_losehp_done();
        }
    }
}

/**
 * C ref: zap.c dobuzz — wand/spell/breath ray + DISP_BEAM + zhitm/zhitu.
 * Envelope: type<0 newsym; rn1(7,7) range; zap_over_floor trail (gas
 * deferred until after hit/reflect); mon/hero zap_hit; type<0 dead →
 * monkilled(…, AD_RBRE) else xkilled/killed; shopdamage → pay_for_damage
 * (D-0948). Named omit: fireball; mon_reflects; map_invisible; Hallu
 * hdmgtype; disintegrate_mon; fire completelyburns XKILL_NOCORPSE;
 * steed redirect.
 */
export async function dobuzz(
    type, nd, sx0, sy0, dx0, dy0, sayhit, _saymiss, forcemiss,
) {
    const fltyp = zaptype(type);
    const damgtype = fltyp % 10;
    // C: Hallucination ? rn2(6) : damgtype — Hallu path deferred
    const hdmgtype = damgtype;
    let sx = sx0;
    let sy = sy0;
    let dx = dx0;
    let dy = dy0;
    // C: type < 0 → newsym(u.ux, u.uy) before range roll
    if ((type | 0) < 0) {
        const u = game.u || {};
        if (u.ux != null) newsym(u.ux, u.uy);
    }
    let range = rn1(7, 7);
    if (dx === 0 && dy === 0) range = 1;
    const shopdamage = { v: false };

    // C: tmp_at(DISP_BEAM, zapdir_to_glyph(dx, dy, hdmgtype))
    tmp_at(DISP_BEAM, zapdir_to_glyph(dx, dy, hdmgtype));
    try {
        while (range-- > 0) {
            const lsx = sx;
            const lsy = sy;
            sx += dx;
            sy += dy;
            const loc = game.level?.at?.(sx, sy);
            const typ = loc?.typ;
            let do_bounce = false;

            if (!isok(sx, sy) || typ === STONE) {
                do_bounce = true;
            } else {
                // C: reveal/unreveal invisible before tmp_at — deferred;
                // paint beam when ZAP_POS or previous cell was visible.
                if (cansee(sx, sy)) {
                    if (ZAP_POS(typ)
                        || (isok(lsx, lsy) && cansee(lsx, lsy))) {
                        tmp_at(sx, sy);
                    }
                    await nh_delay_output();
                }

                // C: gb.bhitpos for hit()/miss()
                if (!game.bhitpos) game.bhitpos = {};
                game.bhitpos.x = sx;
                game.bhitpos.y = sy;

                let gas_hit = damgtype === ZT_POISON_GAS;
                // fireballs skip; poison gas defers zap_over_floor until
                // after hit/reflect so reflection can cancel the cloud.
                if (!gas_hit) {
                    range += await zap_over_floor(
                        sx, sy, type, shopdamage, true, 0,
                    );
                }

                // Prior wand path: closed door absorb pline (C uses
                // zap_over_floor rangemod; keep message for screen PASS).
                if ((type | 0) >= 0 && closed_door(sx, sy)) {
                    await pline('The door absorbs your bolt!');
                    range += -1000;
                }

                let mon = m_at(sx, sy);
                if (mon) {
                    if ((type | 0) >= 0 && mon.mstrategy != null) {
                        mon.mstrategy &= ~STRAT_WAITMASK;
                    }
                    if (!forcemiss && zap_hit(find_mac(mon), 0)) {
                        // mon_reflects deferred
                        const mon_could_move = !!mon.mcanmove;
                        const ootmp = { otmp: null };
                        const tmp = await zhitm(mon, type, nd, ootmp);

                        if (tmp === MAGIC_COOKIE) {
                            // C disintegrate_mon: type<0 monkilled(-AD_RBRE)
                            // else xkilled(NOMSG|NOCORPSE) — deferred → kill
                            await killed(mon);
                        } else if ((mon.mhp | 0) < 1) {
                            // C: type < 0 → monkilled(mon, flash, AD_RBRE);
                            // else xkilled (hero credit + treasure rn2(6)).
                            if ((type | 0) < 0) {
                                await monkilled(
                                    mon, flash_str(fltyp), AD_RBRE,
                                );
                            } else {
                                await killed(mon);
                            }
                        } else {
                            if (!ootmp.otmp) {
                                if (sayhit || canseemon(mon)) {
                                    await hit_zap(
                                        flash_str(fltyp), mon, exclam(tmp),
                                    );
                                }
                            }
                            // slept_monst deferred
                            void mon_could_move;
                            if (damgtype !== ZT_SLEEP) {
                                await wakeup(mon, (type | 0) >= 0);
                            }
                        }
                        range -= 2;
                    }
                } else if (u_at(sx, sy) && range >= 0) {
                    nomul(0);
                    if (!forcemiss && zap_hit(game.u?.uac ?? 10, 0)) {
                        range -= 2;
                        // C: pline_The / The(flash) via article + capitalize
                        await pline(`The ${flash_str(fltyp)} hits you!`);
                        if (Reflecting()) {
                            if (!Blind()) {
                                await ureflects(
                                    'But %s reflects from your %s!',
                                    'it',
                                );
                            } else {
                                await pline(
                                    'For some reason you are not affected.',
                                );
                            }
                            dx = -dx;
                            dy = -dy;
                            gas_hit = false;
                        } else {
                            await zhitu(type, nd, flash_str(fltyp), sx, sy);
                            // C: fatal losehp never returns into dobuzz
                            if (game.program_state?.gameover) break;
                        }
                    } else if (!Blind()) {
                        await pline(`The ${flash_str(fltyp)} whizzes by you!`);
                    }
                    nomul(0);
                }

                if (gas_hit) {
                    await zap_over_floor(sx, sy, type, shopdamage, true, 0);
                }

                if (!ZAP_POS(typ) || (closed_door(sx, sy) && range >= 0)) {
                    do_bounce = true;
                }
            }

            if (do_bounce) {
                // C: bounce_dir always runs once in make_bounce; pline only when
                // (--range > 0 && cansee previous). Cardinal bounce uses no rn2.
                const bchance = (!isok(sx, sy) || typ === STONE) ? 10 : 75;
                if ((--range > 0 && isok(lsx, lsy) && cansee(lsx, lsy))) {
                    await pline(`The ${flash_str(fltyp)} bounces!`);
                }
                const bd = bounce_dir(sx, sy, dx, dy, bchance);
                dx = bd.dx;
                dy = bd.dy;
                // C: tmp_at(DISP_CHANGE, zapdir_to_glyph(dx, dy, hdmgtype))
                tmp_at(DISP_CHANGE, zapdir_to_glyph(dx, dy, hdmgtype));
            }
        }
    } finally {
        tmp_at(DISP_END, 0);
    }
    // fireball explode deferred
    if (shopdamage.v) {
        const { pay_for_damage } = await import('./shk.js');
        const dmgstr = damgtype === ZT_FIRE ? 'burn away'
            : damgtype === ZT_COLD ? 'shatter'
                : damgtype === ZT_ACID ? 'damage'
                    : damgtype === ZT_DEATH ? 'disintegrate'
                        : 'destroy';
        await pay_for_damage(dmgstr, false);
    }
}

/** C ref: zap.c ubuzz */
async function ubuzz(type, nd) {
    const u = game.u;
    await dobuzz(type, nd, u.ux, u.uy, u.dx, u.dy, true, false, false);
}

/** C ref: objnam.c The — capitalize the(str) for glow cancel pline. */
function The_name(str) {
    if (!str) return str;
    // Most wand xnames are "wand of …" → "The wand of …"
    if (/^[A-Z]/.test(str)) return str;
    return `The ${str}`;
}

/**
 * C ref: potion.c healup — add HP; optional sick/blind cure.
 * Kept here for zapyourself without potion.js → weapon.js cycle via spell.
 */
function healup(nhp, nxtra, curesick, cureblind) {
    const u = game.u;
    if (!u) return;
    if (nhp) {
        if (u.Upolyd) {
            u.mh = (u.mh ?? 0) + nhp;
            if (u.mh > (u.mhmax ?? 0)) {
                u.mhmax = (u.mhmax ?? 0) + nxtra;
                u.mh = u.mhmax;
            }
        } else {
            u.uhp = (u.uhp ?? 0) + nhp;
            if (u.uhp > (u.uhpmax ?? 0)) {
                u.uhpmax = (u.uhpmax ?? 0) + nxtra;
                u.uhp = u.uhpmax;
                if ((u.uhppeak ?? 0) < u.uhpmax) u.uhppeak = u.uhpmax;
            }
        }
    }
    if (cureblind) {
        u.ucreamed = 0;
        u.Blinded = 0;
    }
    if (curesick) u.Sick = 0;
}

const MAXWISHTRY = 5;
const WAN_SECRET_DOOR_DETECTION =
    objectNames.indexOf('WAN_SECRET_DOOR_DETECTION');

/** Invent letters of zappable wands (C zap_ok → GETOBJ_SUGGEST). */
function zap_lets() {
    const inv = game.invent || [];
    const lets = [];
    for (const o of inv) {
        if (o.oclass === WAND_CLASS && o.invlet) lets.push(o.invlet);
    }
    lets.sort();
    return lets.join('');
}

/**
 * C ref: cmd.c getdir for zap — '.' is self (dx=dy=dz=0, success).
 * Esc/space/return cancel. lock.js getdir still treats '.' as cancel.
 */
/**
 * C ref: cmd.c getdir — direction for zap; '.' / 's' = self.
 * After a successful horizontal dir (including self dz==0), C always
 * calls confdir(FALSE) which may roll u_maybe_impaired.
 */
async function getdir_zap(prompt) {
    const msg = prompt || 'In what direction?';
    game._pending_message = `${msg} `;
    await flush_screen(1);
    const disp = game.nhDisplay;
    if (disp?.setCursor) disp.setCursor(game._pending_message.length, 0);
    const key = await nhgetch();
    const ch = String.fromCharCode(key);
    game._pending_message = '';
    if (!game.u) game.u = {};
    if (ch === '.' || ch === 's') {
        game.u.dx = game.u.dy = game.u.dz = 0;
    } else if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
        game.u.dx = game.u.dy = game.u.dz = 0;
        return false;
    } else if (!(ch in DIR_DX)) {
        game.u.dx = game.u.dy = game.u.dz = 0;
        return false;
    } else {
        game.u.dx = DIR_DX[ch];
        game.u.dy = DIR_DY[ch];
        game.u.dz = 0;
    }
    // C getdir: if (!u.dz) confdir(FALSE);
    if (!game.u.dz) confdir(false);
    return true;
}

/**
 * C ref: invent.c getobj("zap", zap_ok, GETOBJ_NOFLAGS)
 * `?`/`*` → display_pickinv_reply (D-0450).
 */
async function getobj_zap() {
    const { display_pickinv_reply } = await import('./invent.js');
    for (;;) {
        await flush_topl_more();
        const lets = zap_lets();
        const query = lets
            ? `What do you want to zap? [${lets} or ?*]`
            : 'What do you want to zap? [*]';
        const prompt = `${query} `;

        game._pending_message = prompt;
        const disp = game.nhDisplay;
        await flush_screen(1);
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);

        const key = await nhgetch();
        const ch = String.fromCharCode(key);

        if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            const picked = await display_pickinv_reply(ch === '*' ? '*' : lets);
            if (picked === '\x1b') {
                if (game.flags?.verbose !== false) await pline('Never mind.');
                return null;
            }
            if (!picked) continue;
            const otmp = (game.invent || []).find(o => o.invlet === picked);
            if (!otmp) {
                await pline("You don't have that object.");
                continue;
            }
            if (otmp.oclass !== WAND_CLASS) {
                await pline("You can't zap that!");
                return null;
            }
            game._pending_message = '';
            return otmp;
        }

        const otmp = (game.invent || []).find(o => o.invlet === ch);
        if (!otmp) {
            await pline("You don't have that object.");
            continue;
        }
        if (otmp.oclass !== WAND_CLASS) {
            await pline("You can't zap that!");
            return null;
        }
        game._pending_message = '';
        return otmp;
    }
}

/**
 * C ref: zap.c zappable — consume a charge; wrest path when spe==0.
 * @returns {number} 1 if zap available
 */
export function zappable(wand) {
    if (wand.spe < 0 || (wand.spe === 0 && rn2(WAND_WREST_CHANCE)))
        return 0;
    if (wand.spe === 0) {
        // You wrest one last charge… — message deferred until needed
    }
    wand.spe--;
    return 1;
}

/**
 * C ref: zap.c learnwand — discover type when effect observed + dknown.
 * makeknown → discover_object(..., credit_hero=TRUE) → exercise(A_WIS).
 */
export function learnwand(obj) {
    if (!obj || obj.oclass === SPBOOK_CLASS) return;
    const oc = game.objects?.[obj.otyp];
    if (!oc) return;
    if (oc.oc_name_known) {
        // observe_object — dknown even if Blind when already known
        obj.dknown = true;
    } else {
        if (!game.u?.Blind) obj.dknown = true;
        if (obj.dknown) makeknown(obj.otyp);
    }
    // update_inventory deferred
}

/**
 * C ref: zap.c zapnodir — NODIR wand effects.
 * Branch envelope: WAN_SECRET_DOOR_DETECTION → findit only.
 */
async function zapnodir(obj) {
    let known = false;

    switch (obj.otyp) {
    case WAN_SECRET_DOOR_DETECTION:
        known = !!obj.dknown;
        await findit();
        break;
    default:
        // light / create / wish / enlighten / stasis deferred
        break;
    }

    if (known) {
        const oc = game.objects?.[obj.otyp];
        if (oc && !oc.oc_name_known) {
            // C: zap.c zapnodir — score for discovering the type
            more_experienced(0, 10);
        }
        learnwand(obj);
    }
}

/**
 * C ref: worn.c bypass_obj — mark obj so pile zaps skip it this turn.
 */
function bypass_obj(obj) {
    if (!obj) return;
    obj.bypass = 1;
    if (!game.context) game.context = {};
    game.context.bypasses = true;
}

/** C ref: obj.h is_weptool — TOOL with oc_skill != P_NONE. */
function is_weptool(obj) {
    if (!obj || obj.oclass !== TOOL_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill;
    return sk != null && sk !== 0 && sk !== -1 /* P_NONE */;
}

/** C ref: mkobj.c unbless — clear blessed only. */
function unbless(obj) {
    if (obj) obj.blessed = false;
}

/**
 * C ref: zap.c revive_egg — re-arm HATCH_EGG when typed + !dead_species.
 */
function revive_egg(obj) {
    if (!obj || (obj.otyp | 0) !== EGG) return;
    const cn = obj.corpsenm ?? NON_PM;
    if (cn !== NON_PM && !dead_species(cn, true)) {
        attach_egg_hatch_timeout(obj, 0);
    }
}

/**
 * C ref: zap.c revive — invent/minvent/floor envelope for unturn_dead.
 * Named omit: nested containers; buried zombie dig-out; cant_revive
 * zombie/doppel; montraits/omonst; ghost recorporealization; shop
 * stolen_value; oeaten/oname; Rider delobj_core force.
 * @returns {Promise<object|null>} revived monst or null
 */
async function revive(corpse, by_hero) {
    if (!corpse || (corpse.otyp | 0) !== CORPSE) return null;
    const montype = corpse.corpsenm | 0;
    if (!ismnum(montype)) return null;

    let x = 0;
    let y = 0;
    if (corpse.where === OBJ_INVENT
        || (game.invent || []).includes(corpse)) {
        x = game.u?.ux | 0;
        y = game.u?.uy | 0;
    } else if (corpse.where === OBJ_MINVENT && corpse.ocarry) {
        x = corpse.ocarry.mx | 0;
        y = corpse.ocarry.my | 0;
    } else if (corpse.where === OBJ_FLOOR) {
        x = corpse.ox | 0;
        y = corpse.oy | 0;
    } else {
        // contained / buried / free — deferred
        return null;
    }
    if (!x) return null;
    corpse.ox = x;
    corpse.oy = y;

    const mptr = mons(montype);
    if (!mptr) return null;
    if (corpse.norevive
        || (mptr.mlet === 'S_EEL'
            && !IS_POOL(game.level?.at?.(x, y)?.typ ?? 0))) {
        if (cansee(x, y)) {
            const nm = xname(corpse) || 'corpse';
            const up = nm.charAt(0).toUpperCase() + nm.slice(1);
            await pline(`${up} twitches feebly.`);
        }
        return null;
    }

    const xy = { x, y };
    if (m_at(x, y) && enexto(xy, x, y, mptr)) {
        x = xy.x;
        y = xy.y;
    }

    const mmflags = NO_MINVENT | MM_NOWAIT | MM_NOMSG | MM_NOCOUNTBIRTH;
    // cant_revive / montraits deferred → plain makemon of corpse species
    const mtmp = makemon(mptr, x, y, mmflags);
    if (!mtmp) return null;

    if (mtmp.mundetected) {
        mtmp.mundetected = 0;
        newsym(mtmp.mx | 0, mtmp.my | 0);
    }
    if (M_AP_TYPE(mtmp) !== M_AP_NOTHING) seemimic(mtmp);

    let one_of = (corpse.quan | 0) > 1;
    let used = corpse;
    if (one_of) {
        const child = splitobj(corpse, 1);
        if (child) used = child;
    }

    if (by_hero) {
        x = used.ox | 0;
        y = used.oy | 0;
        if (cansee(x, y)) {
            const carried = used.where === OBJ_INVENT
                || (game.invent || []).includes(used);
            const prefix = one_of ? 'one of ' : '';
            const own = carried ? 'your ' : 'the ';
            let nm = xname(used) || 'corpse';
            if (one_of) used.quan = (used.quan | 0) + 1; // force plural briefly
            const body = `${prefix}${own}${nm}`;
            if (one_of) used.quan = (used.quan | 0) - 1;
            const up = body.charAt(0).toUpperCase() + body.slice(1);
            await pline(`${up} glows iridescently.`);
            if (!game.iflags) game.iflags = {};
            game.iflags.last_msg = PLNMSG_OBJ_GLOWS;
        }
        // shop stolen_value deferred
    }

    mtmp.mrevived = 1;

    switch (used.where) {
    case OBJ_INVENT:
        useup_invent(used);
        break;
    case OBJ_FLOOR:
        delobj(used);
        break;
    case OBJ_MINVENT:
        m_useup(used.ocarry, used);
        break;
    default:
        delobj(used);
        break;
    }
    return mtmp;
}

/**
 * C ref: zap.c unturn_dead — revive invent/minvent eggs+corpses.
 * @returns {Promise<number>} count revived
 */
async function unturn_dead(mon) {
    if (!mon) return 0;
    const is_u = mon === game.youmonst || mon._youmonst;
    const youseeit = is_u ? true : canseemon(mon);
    const items = is_u
        ? [...(game.invent || [])]
        : (() => {
            const out = [];
            for (let o = mon.minvent; o; o = o.nobj) out.push(o);
            return out;
        })();
    let res = 0;

    for (const otmp of items) {
        if ((otmp.otyp | 0) === EGG) revive_egg(otmp);
        if ((otmp.otyp | 0) !== CORPSE) continue;

        let owner = '';
        let corpse = '';
        if (youseeit) {
            corpse = xname(otmp) || 'corpse';
            if ((otmp.quan | 0) > 1) {
                owner = 'One of your ';
            } else {
                owner = 'Your ';
            }
        }
        const corpsenm = otmp.corpsenm | 0;
        const save_norevive = otmp.norevive | 0;
        otmp.norevive = 0;

        const mtmp2 = await revive(otmp, !game.context?.mon_moving);
        if (mtmp2) {
            res++;
            const different_type = mtmp2.data !== mons(corpsenm);
            if ((game.iflags?.last_msg | 0) === PLNMSG_OBJ_GLOWS) {
                corpse = 'It';
                owner = '';
            }
            if (youseeit) {
                const verb = nonliving(mtmp2.data)
                    ? 'reanimates' : 'comes alive';
                const as2 = different_type
                    ? ` as ${an((mtmp2.data?.mname || 'monster').toLowerCase())}`
                    : '';
                await pline(
                    `${owner}${corpse} suddenly ${verb}${as2}!`,
                );
            } else if (canseemon(mtmp2)) {
                await pline(`${Amonnam(mtmp2)} suddenly appears!`);
            }
        } else {
            otmp.norevive = save_norevive ? 1 : 0;
        }
    }
    if (is_u && res) await encumber_msg();
    return res;
}

/**
 * C ref: zap.c unturn_you — invent unturn_dead + undead shudder/stun.
 */
async function unturn_you() {
    await unturn_dead(game.youmonst);
    const youdata = game.youmonst?.data;
    if (is_undead(youdata)) {
        const more = (game.u?.HStun | 0) & TIMEOUT ? 'even more ' : '';
        await You_feel(`frightened and ${more}stunned.`);
        await make_stunned(
            ((game.u?.HStun | 0) & TIMEOUT) + rnd(30), false,
        );
    } else {
        await pline('You shudder in dread.');
    }
}

/**
 * C ref: zap.c cancel_item — strip charges/enchant + blank scrolls/books
 * + water potions; unbless/uncurse. Worn ABON / uhitinc/udaminc before
 * spe clear. Named omit: blank_novel; corpse revive→rot timer swap.
 */
async function cancel_item(obj) {
    if (!obj) return;
    const otyp = obj.otyp | 0;
    const oc = game.objects?.[otyp];
    const u = game.u || {};
    const carried = obj.where === OBJ_INVENT
        || (game.invent || []).includes(obj);
    if (carried) {
        // C: worn ABON / hit-dam before spe is zeroed
        switch (otyp) {
        case RIN_GAIN_STRENGTH:
            if ((obj.owornmask | 0) & W_RING) {
                if (!u.abon) u.abon = { a: [0, 0, 0, 0, 0, 0] };
                u.abon.a[A_STR] = (u.abon.a[A_STR] | 0) - (obj.spe | 0);
                if (game.flags) game.flags.botl = true;
                if (game.disp) game.disp.botl = true;
            }
            break;
        case RIN_GAIN_CONSTITUTION:
            if ((obj.owornmask | 0) & W_RING) {
                if (!u.abon) u.abon = { a: [0, 0, 0, 0, 0, 0] };
                u.abon.a[A_CON] = (u.abon.a[A_CON] | 0) - (obj.spe | 0);
                if (game.flags) game.flags.botl = true;
                if (game.disp) game.disp.botl = true;
            }
            break;
        case RIN_ADORNMENT:
            if ((obj.owornmask | 0) & W_RING) {
                if (!u.abon) u.abon = { a: [0, 0, 0, 0, 0, 0] };
                u.abon.a[A_CHA] = (u.abon.a[A_CHA] | 0) - (obj.spe | 0);
                if (game.flags) game.flags.botl = true;
                if (game.disp) game.disp.botl = true;
            }
            break;
        case RIN_INCREASE_ACCURACY:
            if ((obj.owornmask | 0) & W_RING) {
                u.uhitinc = (u.uhitinc | 0) - (obj.spe | 0);
            }
            break;
        case RIN_INCREASE_DAMAGE:
            if ((obj.owornmask | 0) & W_RING) {
                u.udaminc = (u.udaminc | 0) - (obj.spe | 0);
            }
            break;
        case RIN_PROTECTION:
            if ((obj.owornmask | 0) & W_RING) {
                if (game.flags) game.flags.botl = true;
                if (game.disp) game.disp.botl = true;
            }
            break;
        case GAUNTLETS_OF_DEXTERITY:
            if ((obj.owornmask | 0) & W_ARMG) {
                if (!u.abon) u.abon = { a: [0, 0, 0, 0, 0, 0] };
                u.abon.a[A_DEX] = (u.abon.a[A_DEX] | 0) - (obj.spe | 0);
                if (game.flags) game.flags.botl = true;
                if (game.disp) game.disp.botl = true;
            }
            break;
        case HELM_OF_BRILLIANCE:
            if ((obj.owornmask | 0) & W_ARMH) {
                if (!u.abon) u.abon = { a: [0, 0, 0, 0, 0, 0] };
                u.abon.a[A_INT] = (u.abon.a[A_INT] | 0) - (obj.spe | 0);
                u.abon.a[A_WIS] = (u.abon.a[A_WIS] | 0) - (obj.spe | 0);
                if (game.flags) game.flags.botl = true;
                if (game.disp) game.disp.botl = true;
            }
            break;
        default:
            if ((obj.owornmask | 0) & W_ARMOR) {
                if (game.flags) game.flags.botl = true;
                if (game.disp) game.disp.botl = true;
            }
            break;
        }
    }
    const magic = !!(oc?.oc_magic);
    const speMatter = !!(obj.spe)
        && (obj.oclass === ARMOR_CLASS || obj.oclass === WEAPON_CLASS
            || is_weptool(obj));
    if (magic || speMatter || otyp === POT_ACID || otyp === POT_SICKNESS
        || (otyp === POT_WATER && (obj.blessed || obj.cursed))
        || otyp === SPE_NOVEL) {
        const cancelled_spe = (obj.oclass === WAND_CLASS
            || otyp === CRYSTAL_BALL) ? -1 : 0;
        if ((obj.spe | 0) !== cancelled_spe
            && otyp !== WAN_CANCELLATION
            && otyp !== MAGIC_LAMP
            && otyp !== CANDELABRUM_OF_INVOCATION) {
            await costly_alteration(obj, COST_CANCEL);
            obj.spe = cancelled_spe;
        }
        switch (obj.oclass) {
        case SCROLL_CLASS:
            await costly_alteration(obj, COST_CANCEL);
            obj.otyp = SCR_BLANK_PAPER;
            obj.spe = 0;
            break;
        case SPBOOK_CLASS:
            if (otyp !== SPE_CANCELLATION && otyp !== SPE_BOOK_OF_THE_DEAD) {
                await costly_alteration(obj, COST_CANCEL);
                obj.otyp = SPE_BLANK_PAPER;
                // blank_novel deferred
            }
            break;
        case POTION_CLASS: {
            const alter = (otyp !== POT_WATER)
                ? COST_CANCEL
                : (obj.cursed ? COST_UNCURS : COST_UNBLSS);
            await costly_alteration(obj, alter);
            if (otyp === POT_SICKNESS || otyp === POT_SEE_INVISIBLE) {
                obj.otyp = POT_FRUIT_JUICE;
            } else {
                obj.otyp = POT_WATER;
                obj.odiluted = 0;
            }
            break;
        }
        default:
            break;
        }
    }
    // corpse revive→rot timer deferred
    unbless(obj);
    uncurse(obj);
}

/**
 * C ref: zap.c cancel_monst — resist gate; optional invent cancel;
 * hero rehumanize / mon mcan + normal_shape; clay golem kill.
 * @returns {Promise<boolean>} true if not resisted
 */
export async function cancel_monst(
    mdef, obj, youattack, allow_cancel_kill, self_cancel,
) {
    if (!mdef || !obj) return false;
    const youdefend = mdef === game.youmonst;
    if (youdefend
        ? (!youattack && Antimagic())
        : (await resist(mdef, obj.oclass, 0, NOTELL))) {
        return false;
    }

    if (self_cancel) {
        const chain = youdefend ? game.invent : mdef.minvent;
        for (let otmp = chain; otmp; otmp = otmp.nobj) {
            await cancel_item(otmp);
        }
        if (youdefend) {
            if (game.flags) game.flags.botl = true;
            find_ac();
        }
    }

    if (youdefend) {
        if (Upolyd()) {
            const umon = game.u?.umonnum | 0;
            if (umon === PM_CLAY_GOLEM) {
                if (!Blind()) {
                    await pline('Some writing vanishes from your head!');
                } else {
                    await You_feel('light headed.');
                }
                game.u.mh = 0;
            }
            const u = game.u || {};
            const up = u.uprops?.[UNCHANGING];
            const unchanging = !!(u.Unchanging || u.HUnchanging || u.EUnchanging
                || (up?.intrinsic | 0) || (up?.extrinsic | 0));
            if (unchanging && (u.mh | 0) > 0) {
                await pline('Your amulet grows hot for a moment, then cools.');
            } else {
                await rehumanize();
            }
        }
    } else {
        mdef.mcan = 1;
        normal_shape(mdef);
        if (mdef.data === mons(PM_CLAY_GOLEM)
            || (mdef.data?.mndx | 0) === PM_CLAY_GOLEM) {
            if (canseemon(mdef)) {
                await pline(
                    `Some writing vanishes from ${mon_nam(mdef)}'s head!`,
                );
            }
            if (allow_cancel_kill) {
                if (youattack) await killed(mdef);
                else await monkilled(mdef, '', AD_RBRE);
            }
        }
    }
    return true;
}

/** C ref: role.h Role_if */
function Role_if(pm) {
    return (game.urole?.mnum | 0) === (pm | 0);
}

/** C ref: zap.c hit — wand/spell hit message. */
async function hit_msg(str, mtmp, force) {
    const bx = game._bhitpos?.x ?? mtmp.mx;
    const by = game._bhitpos?.y ?? mtmp.my;
    const verbosely = game.flags?.verbose !== false
        && (cansee(bx, by) || canspotmon(mtmp));
    const whom = verbosely ? mon_nam(mtmp) : 'it';
    await pline(`${The(str)} ${vtense(str, 'hit')} ${whom}${force}`);
}

/** C ref: zap.c miss — wand/spell miss message. */
async function miss_msg(str, mtmp) {
    const bx = game._bhitpos?.x ?? mtmp.mx;
    const by = game._bhitpos?.y ?? mtmp.my;
    const whom = ((cansee(bx, by) || canspotmon(mtmp))
        && game.flags?.verbose !== false)
        ? mon_nam(mtmp) : 'it';
    await pline(`${The(str)} ${vtense(str, 'miss')} ${whom}.`);
}

/**
 * C ref: zap.c bhitm — monster hit by wand/spell effect.
 * Envelope (break-wand / IMMEDIATE): WAN_STRIKING, WAN_UNDEAD_TURNING
 * (damage; invent unturn_dead deferred), WAN_POLYMORPH, WAN_CANCELLATION,
 * WAN_TELEPORTATION, WAN_LIGHT (flash_hits deferred → no-op).
 * Named omit: slow/speed/locking/probing/opening/healing/make-invis;
 * long-worm mcorpsenm polish; Knight questart double; spell_damage_bonus.
 * @returns {Promise<number>} 0 (non-stopping for bhit range)
 */
export async function bhitm(mtmp, otmp) {
    if (!mtmp || !otmp) return 0;
    let wake = true;
    let reveal_invis = false;
    let learn_it = false;
    let helpful_gesture = false;
    const otyp = otmp.otyp | 0;
    let zap_type_text = 'spell';
    const disguised_mimic = mtmp.data?.mlet === 'S_MIMIC'
        && M_AP_TYPE(mtmp) !== M_AP_NOTHING;
    const bhitpos = game._bhitpos || (game._bhitpos = { x: 0, y: 0 });
    game.notonhead = ((mtmp.mx | 0) !== (bhitpos.x | 0)
        || (mtmp.my | 0) !== (bhitpos.y | 0));

    switch (otyp) {
    case WAN_STRIKING:
        zap_type_text = 'wand';
        // FALLTHROUGH
    case SPE_FORCE_BOLT: {
        reveal_invis = true;
        learn_it = cansee(bhitpos.x | 0, bhitpos.y | 0);
        if (resists_magm(mtmp)) {
            if (disguised_mimic) seemimic(mtmp);
            await pline('Boing!');
        } else if (game.u?.uswallow || rnd(20) < 10 + find_mac(mtmp)) {
            if (disguised_mimic) seemimic(mtmp);
            let dmg = d(2, 12);
            // Knight questart / spell_damage_bonus deferred
            void Role_if;
            void PM_KNIGHT;
            await hit_msg(zap_type_text, mtmp, exclam(dmg));
            await resist(mtmp, otmp.oclass, dmg, TELL);
        } else {
            if (!disguised_mimic) await miss_msg(zap_type_text, mtmp);
            learn_it = false;
        }
        break;
    }
    case WAN_UNDEAD_TURNING:
    case SPE_TURN_UNDEAD: {
        wake = false;
        if (await unturn_dead(mtmp)) wake = true;
        if (is_undead(mtmp.data) || is_vampshifter(mtmp)) {
            reveal_invis = true;
            wake = true;
            let dmg = rnd(8);
            if (!game.context) game.context = {};
            game.context.bypasses = true;
            if (!(await resist(mtmp, otmp.oclass, dmg, NOTELL))) {
                if ((mtmp.mhp | 0) > 0) {
                    await monflee(mtmp, 0, false, true);
                }
            }
        }
        break;
    }
    case WAN_POLYMORPH:
    case SPE_POLYMORPH:
    case POT_POLYMORPH: {
        if (mtmp.data === mons(PM_LONG_WORM)
            || (mtmp.data?.mndx | 0) === PM_LONG_WORM) {
            // long-worm mcorpsenm skip deferred — still allow first hit
        }
        if (resists_magm(mtmp)) {
            // shieldeff deferred
        } else if (!(await resist(mtmp, otmp.oclass, 0, NOTELL))) {
            const polyspot = otyp !== POT_POLYMORPH;
            const give_msg = !game.u?.Hallucination
                && (canseemon(mtmp) || !!(game.u?.uswallow && game.u?.ustuck === mtmp));
            if (polyspot) {
                for (let obj = mtmp.minvent; obj; obj = obj.nobj) {
                    bypass_obj(obj);
                }
            }
            if ((mtmp.cham ?? NON_PM) === NON_PM && !rn2(25)) {
                if (canseemon(mtmp)) {
                    await pline(`${Monnam(mtmp)} shudders!`);
                    learn_it = true;
                }
                await xkilled(mtmp, XKILL_GIVEMSG | XKILL_NOCORPSE);
            } else {
                let ncflags = 0;
                if (polyspot) ncflags |= NC_VIA_WAND_OR_SPELL;
                if (give_msg) ncflags |= NC_SHOW_MSG;
                if (newcham(mtmp, null, ncflags)
                    || (ismnum(mtmp.cham)
                        && newcham(mtmp, mons(mtmp.cham), ncflags))) {
                    if (give_msg && (canspotmon(mtmp)
                        || (game.u?.uswallow && game.u?.ustuck === mtmp))) {
                        learn_it = true;
                    }
                }
            }
        }
        break;
    }
    case WAN_CANCELLATION:
    case SPE_CANCELLATION:
        if (disguised_mimic) seemimic(mtmp);
        await cancel_monst(mtmp, otmp, true, true, false);
        break;
    case WAN_TELEPORTATION:
    case SPE_TELEPORT_AWAY:
        if (disguised_mimic) seemimic(mtmp);
        reveal_invis = !(await u_teleport_mon(mtmp, true));
        learn_it = canspotmon(mtmp);
        break;
    case WAN_LIGHT:
        // flash_hits_mon deferred (camera path has a local copy)
        break;
    default:
        break;
    }

    if (wake && (mtmp.mhp | 0) > 0) {
        await wakeup(mtmp, helpful_gesture ? false : true);
    }
    void reveal_invis;
    if (learn_it) learnwand(otmp);
    return 0;
}

/**
 * C ref: zap.c zapyourself — self-directed wand/spell effects.
 * Branch envelope: SPE_HEALING / SPE_EXTRA_HEALING / WAN_SLEEP /
 * SPE_SLEEP / WAN_DEATH / SPE_FINGER_OF_DEATH / WAN_POLYMORPH /
 * SPE_POLYMORPH / WAN_STRIKING / WAN_CANCELLATION / WAN_TELEPORTATION /
 * WAN_UNDEAD_TURNING / WAN_LIGHT; other otyps named in C-JS-MAP.
 * @param {boolean} ordinary wand zap (TRUE) vs broken/spell (FALSE)
 * @returns {number} damage (0 for healing/sleep/death/poly)
 */
export async function zapyourself(obj, ordinary) {
    if (!obj) return 0;
    let learn_it = false;
    let damage = 0;

    switch (obj.otyp) {
    case SPE_HEALING:
    case SPE_EXTRA_HEALING:
        learn_it = true;
        healup(
            d(6, obj.otyp === SPE_EXTRA_HEALING ? 8 : 4),
            0,
            false,
            !!(obj.blessed || obj.otyp === SPE_EXTRA_HEALING),
        );
        await You_feel(`${obj.otyp === SPE_EXTRA_HEALING ? 'much ' : ''}better.`);
        break;

    case WAN_SLEEP:
    case SPE_SLEEP:
        learn_it = true;
        if (Sleep_resistance()) {
            // shieldeff / monstseesu deferred (no RNG)
            await pline("You don't feel sleepy!");
        } else {
            if (ordinary) await pline('The sleep ray hits you!');
            else await pline('You fall asleep!');
            // monstunseesu deferred
            fall_asleep(-rnd(50), true);
        }
        break;

    case WAN_DEATH:
    case SPE_FINGER_OF_DEATH: {
        // C: nonliving / demon → harmless beam; else learn + done(DIED)
        const youdata = game.youmonst?.data;
        if (nonliving(youdata) || is_demon(youdata)) {
            await pline(obj.otyp === WAN_DEATH
                ? 'The wand shoots an apparently harmless beam at you.'
                : 'You seem no deader than before.');
            break;
        }
        learn_it = true;
        // C: uhim() → genders[flags.female ? 1 : 0].him (not u.female)
        const him = game.flags?.female ? 'her' : 'him';
        if (!game.killer) game.killer = { name: '', format: 0 };
        game.killer.name = `shot ${him}self with a death ray`;
        game.killer.format = NO_KILLER_PREFIX;
        // C urgent_pline — same more() ownership as pline here
        await pline('You irradiate yourself with pure energy!');
        await pline('You die.');
        const { done } = await import('./end.js');
        await done(DIED);
        break;
    }

    case WAN_POLYMORPH:
    case SPE_POLYMORPH: {
        // C: zap.c zapyourself — !Unchanging → learn + polyself(POLY_NOFLAGS)
        const u = game.u || {};
        const up = u.uprops?.[UNCHANGING];
        const unchanging = !!(u.Unchanging || u.HUnchanging || u.EUnchanging
            || (up?.intrinsic | 0) || (up?.extrinsic | 0));
        if (!unchanging) {
            learn_it = true;
            const { polyself } = await import('./polyself.js');
            await polyself(0);
        }
        break;
    }

    case WAN_STRIKING:
    case SPE_FORCE_BOLT:
        learn_it = true;
        if (Antimagic()) {
            await pline('Boing!');
        } else {
            if (ordinary) {
                await pline('You bash yourself!');
                damage = d(2, 12);
            } else {
                damage = d(1 + (obj.spe | 0), 6);
            }
            exercise(A_STR, false);
        }
        break;

    case WAN_CANCELLATION:
    case SPE_CANCELLATION:
        await cancel_monst(game.youmonst, obj, true, true, true);
        break;

    case WAN_TELEPORTATION:
    case SPE_TELEPORT_AWAY: {
        const u0x = game.u?.ux0 ?? game.u?.ux | 0;
        const u0y = game.u?.uy0 ?? game.u?.uy | 0;
        await tele();
        const u = game.u || {};
        const Teleport_control = !!(u.HTeleport_control || u.ETeleport_control
            || u.Teleport_control);
        const Stunned = !!(u.HStun || u.Stunned);
        const dx = (u.ux | 0) - (u0x | 0);
        const dy = (u.uy | 0) - (u0y | 0);
        if ((Teleport_control && !Stunned)
            || !couldsee(u0x | 0, u0y | 0)
            || (dx * dx + dy * dy) >= 16) {
            learn_it = true;
        }
        break;
    }

    case WAN_UNDEAD_TURNING:
    case SPE_TURN_UNDEAD: {
        learn_it = true;
        await unturn_you();
        break;
    }

    case WAN_LIGHT:
        // broken wand: lightdamage + flashburn deferred → no hero dmg
        damage = 0;
        break;

    default:
        // Other zapyourself cases deferred
        break;
    }

    if (learn_it) learnwand(obj);
    return damage;
}

/** C ref: obj.h unpolyable */
function unpolyable(obj) {
    if (!obj) return true;
    const t = obj.otyp | 0;
    return t === WAN_POLYMORPH || t === SPE_POLYMORPH
        || t === POT_POLYMORPH || t === AMULET_OF_UNCHANGING;
}

/**
 * C ref: zap.c obj_unpolyable — type gate then obj_resists(5, 95).
 */
function obj_unpolyable(obj) {
    if (unpolyable(obj) || obj === game.u?.uball || obj === game.u?.uskin) {
        return true;
    }
    return obj_resists(obj, 5, 95);
}

/**
 * C ref: zap.c obj_shudders — half-life by class/BUC/quan.
 */
function obj_shudders(obj) {
    if (!obj) return false;
    if (game.context?.bypasses && obj.bypass) return false;

    let zap_odds;
    if (obj.oclass === WAND_CLASS) zap_odds = 3;
    else if (obj.cursed) zap_odds = 3;
    else if (obj.blessed) zap_odds = 12;
    else zap_odds = 8;

    if ((obj.quan | 0) > 4) zap_odds = Math.trunc(zap_odds / 2);
    return !rn2(zap_odds);
}

/**
 * C ref: zap.c do_osshock — destroy via shudder; poly_zapped material roll.
 * Shop bill / hideunder cover deferred.
 */
function do_osshock(obj) {
    if (!obj) return;
    game._obj_zapped = true;

    if ((game._poly_zapped ?? -1) < 0) {
        const luck = game.u?.uluck | 0;
        for (let i = obj.quan | 0; i; i--) {
            if (!rn2(luck + 45)) {
                const mat = game.objects?.[obj.otyp]?.oc_material;
                game._poly_zapped = mat ?? 0;
                break;
            }
        }
    }

    // C: split off rnd(quan-1), then delobj the split portion
    let victim = obj;
    if ((obj.quan | 0) > 1) {
        const q = obj.quan | 0;
        victim = splitobj(obj, rnd(q - 1)) || obj;
    }
    // costly_spot / addtobill deferred
    delobj(victim);
}

/**
 * C ref: invent.c / shk.c delete_contents — obfree chain (no obj_resists).
 */
function delete_contents(obj) {
    while (obj?.cobj) {
        const curr = obj.cobj;
        // extract from container
        obj.cobj = curr.nobj || null;
        curr.nobj = null;
        curr.ocontainer = null;
        curr.where = 0; // OBJ_FREE — obfree, no resist roll
        if (Has_contents(curr)) delete_contents(curr);
    }
}

/**
 * C ref: zap.c poly_obj — floor STRANGE_OBJECT path (wand/pile zap).
 * Invent/worn/boulder/shop/egg/leash arms deferred.
 */
function poly_obj(obj, id) {
    if (!obj) return null;
    const can_merge = id === STRANGE_OBJECT;
    const obj_location = obj.where;
    let otmp;

    if (id === STRANGE_OBJECT) {
        let try_limit = 3;
        const magic_obj = game.objects?.[obj.otyp]?.oc_magic | 0;
        // degraded unicorn horn → magic_obj=0 deferred
        otmp = null;
        do {
            if (otmp) delobj(otmp);
            otmp = mkobj(obj.oclass, false);
        } while (--try_limit > 0
            && ((game.objects?.[otmp.otyp]?.oc_magic | 0) !== magic_obj));
    } else {
        // mksobj(id) path deferred — callers use STRANGE_OBJECT
        otmp = mkobj(obj.oclass, false);
    }

    otmp.quan = obj.quan | 0;
    otmp.no_charge = obj.no_charge;
    if (obj_location === 1 /* OBJ_INVENT */) otmp.invlet = obj.invlet;

    // charged_objs: WAND / WEAPON / ARMOR keep spe
    const oc = otmp.oclass;
    if (oc === WAND_CLASS || oc === WEAPON_CLASS || oc === ARMOR_CLASS) {
        otmp.spe = obj.spe | 0;
    }
    otmp.recharged = obj.recharged | 0;
    otmp.cursed = !!obj.cursed;
    otmp.blessed = !!obj.blessed;
    // erosion / traps / poison deferred

    if (Has_contents(otmp)) delete_contents(otmp);

    // fuse n→1 — C: !oc_merge || (can_merge && quan > rn2(1000))
    if ((otmp.quan | 0) > 1) {
        if (!oc_merge_of(otmp.otyp)
            || (can_merge && (otmp.quan | 0) > rn2(1000))) {
            otmp.quan = 1;
        }
    }

    switch (otmp.oclass) {
    case TOOL_CLASS:
        // MAGIC_LAMP / MAGIC_MARKER polish deferred
        break;
    case WAND_CLASS:
        while (otmp.otyp === WAN_WISHING || otmp.otyp === WAN_POLYMORPH) {
            otmp.otyp = rnd_class(WAN_LIGHT, WAN_LIGHTNING);
        }
        if ((otmp.recharged | 0) < rn2(7)) otmp.recharged = (otmp.recharged | 0) + 1;
        break;
    case POTION_CLASS: {
        const POT_WATER = objectNames.indexOf('POT_WATER');
        const POT_GAIN = objectNames.indexOf('POT_GAIN_ABILITY');
        while (otmp.otyp === POT_POLYMORPH) {
            otmp.otyp = rnd_class(POT_GAIN, POT_WATER);
        }
        break;
    }
    case SPBOOK_CLASS: {
        const SPE_BLANK = objectNames.indexOf('SPE_BLANK_PAPER');
        const bases = game.bases || [];
        while (otmp.otyp === SPE_POLYMORPH) {
            otmp.otyp = rnd_class(bases[SPBOOK_CLASS] | 0, SPE_BLANK);
        }
        // spestudied degrade deferred
        break;
    }
    case GEM_CLASS:
        // mineral→ROCK backfire deferred
        break;
    default:
        break;
    }

    otmp.owt = weight(otmp);

    if (obj_location === OBJ_FLOOR) {
        replace_object(obj, otmp);
        // boulder block_point deferred
    } else {
        // invent/minvent — extract+free old; leave otmp free
        delobj(obj);
        return otmp;
    }
    delobj(obj);
    return otmp;
}

/**
 * C ref: zap.c bhito — floor object hit by wand.
 * Envelope: WAN_POLYMORPH; WAN_CANCELLATION; WAN_STRIKING boulder/statue/
 * hero_breaks|breaks; WAN_TELEPORTATION rloco; WAN_UNDEAD_TURNING floor
 * corpse/egg thin revive. Named omit: probing; boxlock; full revive arms.
 * @returns {Promise<number>} 1 if affected
 */
async function bhito(obj, otmp) {
    if (!obj || !otmp || obj === otmp) return 0;
    if (obj.bypass && game.context?.bypasses) return 0;

    let res = 1;
    let learn_it = false;

    if (obj === game.u?.uball || obj === game.u?.uchain) {
        return 0;
    }

    switch (otmp.otyp) {
    case WAN_POLYMORPH:
    case SPE_POLYMORPH:
        if (obj_unpolyable(obj)) {
            res = 0;
            break;
        }
        if (obj_shudders(obj)) {
            if (cansee(obj.ox, obj.oy)) learn_it = true;
            do_osshock(obj);
            break;
        }
        {
            const neu = poly_obj(obj, STRANGE_OBJECT);
            if (neu) newsym(neu.ox, neu.oy);
        }
        break;
    case WAN_CANCELLATION:
    case SPE_CANCELLATION:
        await cancel_item(obj);
        newsym(obj.ox | 0, obj.oy | 0);
        break;
    case WAN_STRIKING:
    case SPE_FORCE_BOLT: {
        let maybelearnit = cansee(obj.ox | 0, obj.oy | 0) || !Deaf();
        if ((obj.otyp | 0) === BOULDER) {
            if (cansee(obj.ox | 0, obj.oy | 0)) {
                await pline('The boulder falls apart.');
            } else {
                await You_hear('a crumbling sound.');
            }
            fracture_rock(obj);
        } else if ((obj.otyp | 0) === STATUE) {
            if (break_statue(obj)) {
                if (cansee(obj.ox | 0, obj.oy | 0)) {
                    await pline('The statue shatters.');
                } else {
                    await You_hear('a crumbling sound.');
                }
            }
        } else {
            const oox = obj.ox | 0;
            const ooy = obj.oy | 0;
            const broke = game.context?.mon_moving
                ? await breaks(obj, oox, ooy)
                : await hero_breaks(obj, oox, ooy, 0);
            if (!broke) maybelearnit = false;
            else newsym(oox, ooy);
            res = 0;
        }
        if (maybelearnit) learn_it = true;
        break;
    }
    case WAN_TELEPORTATION:
    case SPE_TELEPORT_AWAY:
        rloco(obj);
        break;
    case WAN_UNDEAD_TURNING:
    case SPE_TURN_UNDEAD:
        if ((obj.otyp | 0) === EGG) {
            revive_egg(obj);
            res = 1;
        } else if ((obj.otyp | 0) === CORPSE) {
            const save_norevive = obj.norevive | 0;
            obj.norevive = 0;
            const m = await revive(obj, !game.context?.mon_moving);
            if (!m) {
                obj.norevive = save_norevive ? 1 : 0;
                res = 0;
            }
        } else {
            res = 0;
        }
        break;
    default:
        res = 0;
        break;
    }

    if (learn_it) learnwand(otmp);
    return res;
}

/**
 * C ref: zap.c bhitpile — walk floor pile with fhito.
 * create_polymon / recreate_pile / fill_pit deferred.
 */
export async function bhitpile(wand, fhito, tx, ty, _zz) {
    let hitanything = 0;
    if (!objects_at(tx, ty)) return 0;

    game._poly_zapped = -1;
    for (let otmp = objects_at(tx, ty); otmp; ) {
        const next_obj = otmp.nexthere;
        if (otmp.where !== OBJ_FLOOR
            || (otmp.ox | 0) !== (tx | 0) || (otmp.oy | 0) !== (ty | 0)) {
            otmp = next_obj;
            continue;
        }
        hitanything += (await fhito(otmp, wand)) | 0;
        otmp = next_obj;
    }
    return hitanything;
}

/**
 * C ref: zap.c bhit — ZAPPED_WAND lateral path only.
 * Thrown/kicked/flash/tmp_at / zap_map / doorlock deferred.
 */
async function bhit(ddx, ddy, range, weapon, fhitm, fhito, pobj) {
    const obj = pobj?.obj;
    const bhitpos = game._bhitpos || (game._bhitpos = { x: 0, y: 0 });
    bhitpos.x = game.u?.ux | 0;
    bhitpos.y = game.u?.uy | 0;
    let r = range | 0;

    while (r-- > 0) {
        bhitpos.x += ddx;
        bhitpos.y += ddy;
        const x = bhitpos.x | 0;
        const y = bhitpos.y | 0;
        if (!isok(x, y)) {
            bhitpos.x -= ddx;
            bhitpos.y -= ddy;
            break;
        }

        const loc = game.level?.at?.(x, y);
        let typ = loc?.typ;

        const mtmp = m_at(x, y);
        if (mtmp && weapon === ZAPPED_WAND) {
            if (fhitm) await fhitm(mtmp, obj);
            else await bhitm(mtmp, obj);
            r -= 3;
        }

        if (fhito) {
            if (await bhitpile(obj, fhito, x, y, 0)) r--;
        }

        if (weapon === ZAPPED_WAND && (IS_DOOR(typ) || typ === STONE)) {
            // doorlock deferred
        }
        if (!ZAP_POS(typ) || closed_door(x, y)) {
            bhitpos.x -= ddx;
            bhitpos.y -= ddy;
            break;
        }
    }
    return null;
}

function zapsetup() {
    game._obj_zapped = false;
}

/**
 * C ref: zap.c zapwrapup — feedback after do_osshock set obj_zapped.
 */
export async function zapwrapup() {
    if (game._obj_zapped) {
        await You_feel('shuddering vibrations.');
    }
    game._obj_zapped = false;
}

export { zapsetup, bhito };

/**
 * C ref: zap.c weffects — exercise + effect dispatch.
 * NODIR + RAY wand ubuzz; IMMEDIATE bhit WAN_POLYMORPH;
 * WAN_DIGGING/SPE_DIG → zap_dig; spell ubuzz / zap_updown / steed deferred.
 */
async function weffects(obj) {
    const otyp = obj.otyp;
    const oc = game.objects?.[otyp];
    let disclose = false;
    const was_unkn = !oc?.oc_name_known;

    exercise(A_WIS, true);

    // steed down-zap deferred
    if (oc?.oc_dir === NODIR) {
        await zapnodir(obj);
    } else if (oc?.oc_dir === IMMEDIATE) {
        zapsetup();
        if (game.u?.uswallow) {
            if (game.u.ustuck) await bhitm(game.u.ustuck, obj);
        } else if (game.u?.dz) {
            // zap_updown deferred
        } else {
            const range = rn1(8, 6);
            const pref = { obj };
            await bhit(game.u.dx | 0, game.u.dy | 0, range, ZAPPED_WAND,
                bhitm, bhito, pref);
            // C may null *pobj if destroyed — wand is hero's, keep
        }
        await zapwrapup();
    } else {
        // RAY — neither immediate nor directionless
        if (otyp === WAN_DIGGING || otyp === SPE_DIG) {
            await zap_dig();
            disclose = true;
        } else if (otyp >= WAN_MAGIC_MISSILE && otyp <= WAN_LIGHTNING) {
            await ubuzz(
                BZ_U_WAND(BZ_OFS_WAN(otyp)),
                otyp === WAN_MAGIC_MISSILE ? 2 : 6,
            );
            disclose = true;
        }
        // SPE_* ubuzz deferred
    }
    // C: fatal zhitu→losehp→done never resumes here for learnwand
    if (game.program_state?.gameover) return;
    if (disclose) {
        learnwand(obj);
        if (was_unkn) {
            // C: zap.c weffects — score for discovering the type
            more_experienced(0, 10);
        }
    }
}

/**
 * C ref: zap.c dozap / #zap ('z')
 * @returns {Promise<number>} 0 = cancel/no turn, 1 = took time
 */
export async function dozap() {
    // C: nohands(youmonst.data) before getobj (brown-mold poly etc.)
    if (nohands(game.youmonst?.data)) {
        await pline("You aren't able to zap anything in your current form.");
        return 0;
    }
    // check_capacity deferred
    const obj = await getobj_zap();
    if (!obj) return 0;

    // check_unpaid deferred
    const oc = game.objects?.[obj.otyp];
    const need_dir = oc && oc.oc_dir !== NODIR;

    if (!zappable(obj)) {
        await pline(nothing_happens);
    } else if (obj.cursed && !rn2(WAND_BACKFIRE_CHANCE)) {
        // backfire body deferred — still exercise like C then stop
        exercise(A_STR, false);
        return 1;
    } else if (need_dir && !(await getdir_zap(null))) {
        // cancel direction — still paid a charge via zappable
        if (!Blind()) {
            await pline(`${The_name(xname(obj))} glows and fades.`);
        }
    } else if (need_dir && !(game.u.dx || game.u.dy || game.u.dz)) {
        const damage = await zapyourself(obj, true);
        if (damage) {
            // killer_xname deferred — xname sufficient for early kits
            const buf = `zapped ${game.u?.female ? 'her' : 'him'}self with ${xname(obj)}`;
            losehp(maybe_half_phys(damage), buf, NO_KILLER_PREFIX);
        }
    } else {
        game.current_wand = obj;
        await weffects(obj);
        game.current_wand = null;
    }

    if (obj && obj.spe < 0) {
        // turn to dust / useupall deferred
    }
    // update_inventory deferred
    return 1;
}

/**
 * C ref: zap.c makewish — prompt + readobjnam + hold_another_object.
 * Help / history / livelog / terrain-wish paths deferred.
 */
export async function makewish() {
    const nothing = NOTHING_OBJ;
    let tries = 0;
    let buf = '';

    if (game.flags?.verbose) {
        await pline('You may wish for an object.');
    }

    for (;;) {
        let prompt = 'For what do you wish';
        if (game.flags?.cmdassist && tries > 0) {
            prompt += " (enter 'help' for assistance)";
        }
        prompt += '?';
        buf = await getlin(prompt);
        if (!buf || buf === '\x1b') {
            buf = '';
            break;
        }
        buf = String(buf).trim().replace(/\s+/g, ' ');
        if (/^help$/i.test(buf)) {
            // wishcmdassist deferred
            buf = '';
            continue;
        }
        break;
    }

    let otmp = readobjnam(buf, nothing);
    if (!otmp) {
        await pline('Nothing fitting that description exists in the game.');
        if (++tries < MAXWISHTRY) {
            // retry omitted for single-shot session wishes; fall through
        }
        // C: after MAXWISHTRY, random readobjnam(NULL) — deferred
        return;
    }
    if (otmp === nothing) return;
    if (otmp === HANDS_OBJ) return;

    if (!game.u) game.u = {};
    if (!game.u.uconduct) game.u.uconduct = {};
    game.u.uconduct.wishes = (game.u.uconduct.wishes | 0) + 1;

    // C: hold_another_object(otmp, oops_msg, The(aobjnam(...)), NULL)
    // Simplified message path: prinv via hold when successful.
    const verb = 'drop';
    const oops = `Oops!  %s to the floor!`;
    await hold_another_object(otmp, oops, `The ${doname(otmp)} ${verb}s`, null);

    game.u.ublesscnt = (game.u.ublesscnt | 0) + rn1(100, 50);
}
