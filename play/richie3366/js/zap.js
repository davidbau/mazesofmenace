// zap.js — Zap command / wish helpers (partial).
// C ref: zap.c dozap, zappable, weffects, zapnodir, learnwand, makewish,
//        zapyourself, flashburn, lightdamage, ubreatheu, ubuzz, dobuzz, zhitm, destroy_items, resist,
//        bhit, bhito, bhitm, bhitpile, poly_obj, obj_shudders,
//        cancel_item, cancel_monst, revive, revive_egg, unturn_dead,
//        unturn_you
//
// Branch envelope: getobj wand + zappable + cursed backfire gate +
// NODIR weffects → zapnodir WAN_SECRET_DOOR_DETECTION → findit;
// directional getdir ('.' = self) → confdir + zapyourself SPE_HEALING /
// SPE_EXTRA_HEALING / WAN_SLEEP / SPE_SLEEP / WAN_DEATH /
// SPE_FINGER_OF_DEATH / WAN_POLYMORPH / WAN_STRIKING / WAN_CANCELLATION /
// WAN_TELEPORTATION / WAN_UNDEAD_TURNING / WAN_LIGHT /
// WAN_FIRE / FIRE_HORN / WAN_COLD / SPE_CONE_OF_COLD / FROST_HORN (D-0974);
// WAN_LIGHTNING + flashburn (D-1355);
// WAN/SPE_MAGIC_MISSILE (D-1364; Antimagic uprops D-1367);
// SPE_FIREBALL self-explode (D-1365);
// lightdamage + zapnodir WAN/SPE_LIGHT + zapyourself WAN_LIGHT/CAMERA (D-1366);
// zapnodir WAN_CREATE_MONSTER create_critters (D-1379);
// zapnodir WAN_WISHING Luck+rn2(5) / makewish (D-1380);
// zapnodir WAN_ENLIGHTENMENT do_enlightenment_effect (D-1395);
// zapnodir WAN_STASIS stasis_until max moves+rn1(21,10) (D-1404);
// zapnodir SPE_DETECT_UNSEEN shares SECRET_DOOR findit (D-1412);
// zapyourself WAN_MAKE_INVISIBLE (D-1369);
// zapyourself WAN_SPEED_MONSTER speed_up(rn1(25,50)) (D-1410);
// dozap self-zap losehp killer_xname + uhim (D-1345);
// getobj `?`/`*` → display_pickinv_reply; RAY weffects → ubuzz/dobuzz
// for WAN_MAGIC_MISSILE..WAN_LIGHTNING (zhitm damage types + bounce +
// Reflecting); IMMEDIATE weffects → bhit(rn1(8,6)) + bhito WAN_POLYMORPH
// / cancel / striking boulder+statue+hero_breaks / tele pile + bhitm
// strike/cancel/poly/tele/undead(+unturn_dead); RAY WAN_DIGGING/SPE_DIG
// → zap_dig (dig.c); RAY SPE_MAGIC_MISSILE..SPE_FINGER_OF_DEATH weffects
// → ubuzz BZ_U_SPELL (D-1386); SPE_FORCE_BOLT IMMEDIATE weffects/bhit
// + bhitm spell_damage_bonus (D-1388; Knight questart dbldam named).
// Named omissions: zap_updown/uswallow full; bhitm slow/speed/locking/
// probing (zapyourself WAN_SPEED is D-1410; bhitm speed still named);
// zap_map; mon_reflects;
// Hallucination hdmgtype rn2; map_invisible/unmap during buzz;
// backfire body; remaining NODIR wand-duplicate SPE_LIGHT cast
// dispatch; potion peffect_enlightenment is D-1413;
// wrest pline; check_capacity;
// check_unpaid; update_inventory; shieldeff/monstunseesu; setworn
// EReflecting bits (W_WEP artifact D-1342); ureflects W_AMUL/W_ARM/dragon
// D-1353 (shared muse.c clone); mcastu ureflects named; create_polymon after poly_zapped;
// do_osshock shop bill; invent/worn poly_obj arms; floor boxlock;
// blank_novel / corpse revive→rot timer;
// cant_finish_meal; animate_statue montraits wire; defended(); resists_magm
// body; ignite_items body; burnarmor worn erode ported (D-0741);
// acid_damage/erode_armor; death-breath disintegrate_arm;
// potionbreathe invis flash (D-0741); inventory_resistance_check;
// ugolemeffects; burn_away_slime;
// spell_damage_bonus zhitm / Knight questart double; Rider/Death specials;
// disintegrate_mon; fire completelyburns XKILL_NOCORPSE; mon_reflects;
// flash_hits WAN_LIGHT bhitm (D-0979); openholding/openfalling +
// Punished/boxlock_invent/SPE_KNOCK hurtle/saddle (D-0981);
// montraits/omonst/ghost recorporealize (D-0982);
// trap_ice_effects; Underwater/utrap lava arms.
// spell.c skilled SPE_FIREBALL scatter is D-1378 (this callee
// spell_damage_bonus); unskilled FIREBALL/CONE FALLTHROUGH weffects
// is D-1386 (this callee SPE ubuzz). SPE_FORCE_BOLT IMMEDIATE bhit
// + bhitm spell_damage_bonus is D-1388. zhitm spell_damage_bonus named.
// muse MUSE_CAMERA is D-1376; Sunsword invoke_blinding_ray is D-1377.
// bhit WEB stick D-1393; throwit fly / skiprange named.
// bhitm / zap_updown / zap_steed WAN_MAKE_INVISIBLE; setworn w_blocks.
// maybe_destroy_item AD_ELEC rings/wands (D-1368); Shock_resistance
// via uprops[SHOCK_RES] (D-1371); inventory_resistance / full
// read.c recharge wand·tool·blessed still named.
// explode AD_FIRE mon/hero combat: D-0968 (explode.js).
// explode AD_COLD/ELEC mon/hero combat: D-0971 (explode.js).
// explode AD_MAGM/DISN/DRST/ACID mon/hero combat: D-0973 (explode.js).
// Shop door/bars destroy + dobuzz pay_for_damage: D-0948.
// Break-wand adjacent bhit + cancel helpers: D-0952.
// unturn_dead invent revive + hero_breaks + worn ABON: D-0955.
// revive container/buried + cant_revive + OBJ_BURIED extract: D-0964.
// ice melt / burn_floor_objects / fireball trail+explode: D-0965.

import { game } from './gstate.js';
import { rn1, rn2, rnd, d } from './rng.js';
import { getlin } from './getline.js';
import {
    flush_screen, flush_topl_more, pline, pline_dir, Norep, You_feel, newsym,
    tmp_at, zapdir_to_glyph, nh_delay_output, canseemon, canspotmon,
    obj_glyph, glyph_is_invisible,
} from './display.js';
import { cansee, couldsee } from './vision.js';
import { nhgetch } from './input.js';
import { readobjnam_wish, HANDS_OBJ, NOTHING_OBJ } from './readobjnam.js';
import { hold_another_object, makeknown, encumber_msg, enlightenment } from './invent.js';
import { doname, xname, yname, distant_name, vtense, The, an, An, killer_xname, ansimpleoname, otyp_is_charged } from './objnam.js';
import { uhim } from './roles.js';
import { fix_wall_spines } from './mklev.js';
import {
    A_WIS, A_STR, A_CON, A_DEX, A_INT, A_CHA, exercise, acurr,
} from './attrib.js';
import { findit } from './detect.js';
import {
    confdir, fall_asleep, losehp, maybe_half_phys, nomul, is_pool,
    is_lava, is_moat, waterbody_name, in_rooms, dissolve_bars, stop_occupation,
} from './hack.js';
import {
    nonliving, is_demon, nohands, MR_FIRE, MR_COLD, MR_DISINT, MR_ELEC,
    MR_POISON, MR_ACID, is_undead, is_vampshifter, monsterNames, mons,
    G_UNIQ, is_rider, is_swimmer, mindless, MZ_MEDIUM,
} from './monsters.js';
import { m_at, wakeup, seemimic, dead_species, normal_shape, replmon, find_mid, mongone, restore_cham, m_respond } from './mon.js';
import { find_mac, monkilled, shade_miss } from './mhitm.js';
import { more_experienced } from './exper.js';
import { obj_resists } from './dogmove.js';
import { zap_dig, fracture_rock, break_statue, bury_objs, unearth_objs } from './dig.js';
import {
    killed, xkilled, flash_hits_mon, m_is_steadfast,
} from './uhitm.js';
import { mon_nam, Monnam, christen_monst, hliquid, Hallucination } from './do_name.js';
import { finish_losehp_done } from './end.js';
import {
    burnarmor, t_at, maketrap, delfloortrap, dotrap, mintrap,
    NO_TRAP_FLAGS, ignite_items, openholdingtrap, openfallingtrap,
    self_invis_message,
} from './trap.js';
import { potionbreathe, make_stunned, speed_up } from './potion.js';
import { burn_away_slime } from './timeout.js';
import { create_gas_cloud } from './region.js';
import { cvt_sdoor_to_door } from './detect.js';
import { recalc_block_point } from './vision.js';
import { picking_at, reset_pick, boxlock_invent } from './lock.js';
import { monflee, sticks } from './monmove.js';
import { digests, set_ustuck, unstuck, expels, ureflects } from './mhitu.js';
import { newcham, makemon, create_critters, monhp_per_lvl, neweshk, add_to_minv } from './makemon.js';
import { tele, u_teleport_mon, rloco, enexto } from './teleport.js';
import { find_ac } from './u_init.js';
import { rehumanize } from './polyself.js';
import { costly_alteration, stolen_value, costly_spot, shop_keeper, hot_pursuit } from './shk.js';
import { dryup } from './fountain.js';
import { explode } from './explode.js';
import { unpunish, litroom } from './read.js';
import { bare_artifactname } from './artifact.js';
import { Ring_gone, Ring_off, Ring_on, setworn } from './do_wear.js';
import { which_armor } from './worn.js';
import { mhurtle, hero_breaks, breaks } from './dothrow.js';
import { abuse_dog, wary_dog, tamedog } from './dog.js';
import {
    mkobj, delobj, objects_at, replace_object, rnd_class, weight, splitobj,
    oc_merge_of, uncurse, attach_egg_hatch_timeout, obj_extract_self,
    eaten_stat, start_timer, spot_stop_timers, spot_time_left,
    obj_ice_effects, place_object, stackobj,
    get_mtraits, free_omonst, free_omid, is_metallic,
} from './mkobj.js';
import {
    WAND_CLASS, SPBOOK_CLASS, WEAPON_CLASS, ARMOR_CLASS, POTION_CLASS,
    TOOL_CLASS, GEM_CLASS, SCROLL_CLASS, RING_CLASS, FOOD_CLASS, COIN_CLASS,
    NODIR, IMMEDIATE, objectNames,
} from './objects.js';
import {
    WAND_BACKFIRE_CHANCE, WAND_WREST_CHANCE, nothing_happens,
    NO_KILLER_PREFIX, DIED, KILLED_BY, KILLED_BY_AN, isok, ZAP_POS, STONE,
    IS_DOOR, IS_ROOM, D_CLOSED, D_LOCKED, D_NODOOR, D_BROKEN,
    DISP_BEAM, DISP_CHANGE, DISP_END, DISP_FLASH, DISP_TETHER,
    OBJ_FREE, OBJ_FLOOR, OBJ_INVENT, OBJ_MINVENT, OBJ_CONTAINED, OBJ_BURIED,
    Has_contents, ZAPPED_WAND, THROWN_WEAPON, THROWN_TETHERED_WEAPON,
    KICKED_WEAPON,
    FLASHED_LIGHT, INVIS_BEAM, NOTELL, TELL,
    STRAT_WAITMASK,
    POOL, MOAT, WATER, ICE, LAVAPOOL, LAVAWALL, DRAWBRIDGE_UP,
    DRAWBRIDGE_DOWN, ICED_POOL, ICED_MOAT, DB_ICE, DB_UNDER, DB_FLOOR,
    Is_waterlevel, Is_rogue_level, Is_airlevel, AD_RBRE, AD_SPEL, UNCHANGING,
    PLNMSG_ENVELOPED_IN_GAS, PLNMSG_OBJ_GLOWS, IRONBARS, SDOOR, SHOPBASE,
    SHOP_DOOR_COST,
    SHOP_BARS_COST, W_NONDIGGABLE, COST_CANCEL, COST_UNCURS, COST_UNBLSS,
    TIMEOUT, XKILL_GIVEMSG, XKILL_NOCORPSE, Upolyd, INVIS,
    LEFT_RING, RIGHT_RING,
    M_AP_TYPE, M_AP_NOTHING, M_AP_MONSTER, M_AP_OBJECT, NON_PM, ismnum,
    def_warnsyms,
    W_RING, W_ARMG, W_ARMH, W_ARMOR, W_SADDLE,
    REFLECTING, ANTIMAGIC, SHOCK_RES,
    NO_MINVENT, MM_NOWAIT, MM_NOMSG, MM_NOCOUNTBIRTH, MM_MALE, MM_FEMALE,
    IS_POOL, CONTAINED_TOO, BURIED_TOO, ROOM, CORR, GRAVE,
    CORPSTAT_GENDER, CORPSTAT_MALE, CORPSTAT_FEMALE, MFAST,
    OMONST, has_oname, ONAME, has_omonst, has_omid, OMID, ESHK,
    WEB, PIT, IS_FOUNTAIN, IS_WATERWALL, IS_WALL, HWALL, VWALL,
    TIMER_LEVEL, MELT_ICE_AWAY, EXPL_FIERY, COLNO, ROWNO,
    xytodir,
    IS_ALTAR, IS_STWALL, Is_earthlevel, IS_AIR, CLOUD, IS_SINK,
    MM_NOTAIL, MM_ADJACENTOK, NATTK,
    MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS,
} from './const.js';

const MZ_HUMAN = MZ_MEDIUM;
const SPE_HEALING = objectNames.indexOf('SPE_HEALING');
const SPE_EXTRA_HEALING = objectNames.indexOf('SPE_EXTRA_HEALING');
const WAN_MAGIC_MISSILE = objectNames.indexOf('WAN_MAGIC_MISSILE');
const SPE_MAGIC_MISSILE = objectNames.indexOf('SPE_MAGIC_MISSILE');
const WAN_SLEEP = objectNames.indexOf('WAN_SLEEP');
const WAN_LIGHT = objectNames.indexOf('WAN_LIGHT');
const SPE_LIGHT = objectNames.indexOf('SPE_LIGHT');
const EXPENSIVE_CAMERA = objectNames.indexOf('EXPENSIVE_CAMERA');
const WAN_LIGHTNING = objectNames.indexOf('WAN_LIGHTNING');
const WAN_MAKE_INVISIBLE = objectNames.indexOf('WAN_MAKE_INVISIBLE');
const WAN_SPEED_MONSTER = objectNames.indexOf('WAN_SPEED_MONSTER');
const MUMMY_WRAPPING = objectNames.indexOf('MUMMY_WRAPPING');
const RIN_SHOCK_RESISTANCE = objectNames.indexOf('RIN_SHOCK_RESISTANCE');
const WAN_WISHING = objectNames.indexOf('WAN_WISHING');
const WAN_CREATE_MONSTER = objectNames.indexOf('WAN_CREATE_MONSTER');
const WAN_ENLIGHTENMENT = objectNames.indexOf('WAN_ENLIGHTENMENT');
const WAN_STASIS = objectNames.indexOf('WAN_STASIS');
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
const AMULET_OF_REFLECTION = objectNames.indexOf('AMULET_OF_REFLECTION');
const SILVER_DRAGON_SCALES = objectNames.indexOf('SILVER_DRAGON_SCALES');
const SILVER_DRAGON_SCALE_MAIL = objectNames.indexOf('SILVER_DRAGON_SCALE_MAIL');
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
const WAN_OPENING = objectNames.indexOf('WAN_OPENING');
const SPE_KNOCK = objectNames.indexOf('SPE_KNOCK');
const WAN_FIRE = objectNames.indexOf('WAN_FIRE');
const WAN_COLD = objectNames.indexOf('WAN_COLD');
const SPE_CONE_OF_COLD = objectNames.indexOf('SPE_CONE_OF_COLD');
const FIRE_HORN = objectNames.indexOf('FIRE_HORN');
const FROST_HORN = objectNames.indexOf('FROST_HORN');
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
const BAG_OF_HOLDING = objectNames.indexOf('BAG_OF_HOLDING');
const PM_GUARD = monsterNames.indexOf('PM_GUARD');
const PM_SHOPKEEPER = monsterNames.indexOf('PM_SHOPKEEPER');
const PM_HIGH_CLERIC = monsterNames.indexOf('PM_HIGH_CLERIC');
const PM_ALIGNED_CLERIC = monsterNames.indexOf('PM_ALIGNED_CLERIC');
const PM_ANGEL = monsterNames.indexOf('PM_ANGEL');
const PM_HUMAN_ZOMBIE = monsterNames.indexOf('PM_HUMAN_ZOMBIE');
const PM_DOPPELGANGER = monsterNames.indexOf('PM_DOPPELGANGER');
const PM_LONG_WORM = monsterNames.indexOf('PM_LONG_WORM');
const PM_LONG_WORM_TAIL = monsterNames.indexOf('PM_LONG_WORM_TAIL');
const RIN_GAIN_STRENGTH = objectNames.indexOf('RIN_GAIN_STRENGTH');
const RIN_GAIN_CONSTITUTION = objectNames.indexOf('RIN_GAIN_CONSTITUTION');
const RIN_ADORNMENT = objectNames.indexOf('RIN_ADORNMENT');
const RIN_INCREASE_ACCURACY = objectNames.indexOf('RIN_INCREASE_ACCURACY');
const RIN_INCREASE_DAMAGE = objectNames.indexOf('RIN_INCREASE_DAMAGE');
const RIN_PROTECTION = objectNames.indexOf('RIN_PROTECTION');
const GAUNTLETS_OF_DEXTERITY = objectNames.indexOf('GAUNTLETS_OF_DEXTERITY');
const HELM_OF_BRILLIANCE = objectNames.indexOf('HELM_OF_BRILLIANCE');
const PM_SILVER_DRAGON = monsterNames.indexOf('PM_SILVER_DRAGON');
const PM_CLAY_GOLEM = monsterNames.indexOf('PM_CLAY_GOLEM');
const PM_KNIGHT = monsterNames.indexOf('PM_KNIGHT');
const PM_GREMLIN = monsterNames.indexOf('PM_GREMLIN');
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

/**
 * C youprop.h Shock_resistance — HShock_resistance || EShock_resistance
 * ≡ uprops[SHOCK_RES].intrinsic || uprops[SHOCK_RES].extrinsic.
 * confer_oc_oprop writes SHOCK_RES only to uprops (EShock_resistance
 * unmirrored). Keep H/E/sticky flats for eat/poly (invent.js
 * hero_Shock_resistance / D-1089). Worn RIN_SHOCK_RESISTANCE must
 * skip exploding-wand HP ("You aren't hurt!") and WAN_LIGHTNING
 * self-zap (D-1371 / review 328).
 */
function Shock_resistance() {
    const u = game.u || {};
    const e = u.uprops?.[SHOCK_RES];
    return !!((u.Shock_resistance || u.HShock_resistance || u.EShock_resistance)
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/** C ref: youprop.h Acid_resistance */
function Acid_resistance() {
    const u = game.u || {};
    return !!(u.Acid_resistance || u.HAcid_resistance || u.EAcid_resistance);
}

/**
 * C youprop.h Antimagic — HAntimagic || EAntimagic
 * ≡ uprops[ANTIMAGIC].intrinsic || uprops[ANTIMAGIC].extrinsic.
 * confer_oc_oprop writes ANTIMAGIC only to uprops (EAntimagic
 * unmirrored). Keep H/E/sticky flats for eat/poly (invent.js
 * hero_Antimagic / sit.js D-1089). Worn CLOAK_OF_MAGIC_RESISTANCE
 * / gray DSM must bounce MAGIC_MISSILE and WAN_STRIKING (D-1367).
 */
function Antimagic() {
    const u = game.u || {};
    const e = u.uprops?.[ANTIMAGIC];
    return !!((u.Antimagic || u.HAntimagic || u.EAntimagic)
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
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
 * C ref: youprop.h Reflecting — HReflecting || EReflecting
 * (uprops[REFLECTING] + W_WEP flat). Worn otyp / silver-dragon form
 * stand in while confer_oc_oprop does not mirror EReflecting (D-1353).
 */
export function Reflecting() {
    const u = game.u || {};
    if (u.HReflecting || u.EReflecting || u.Reflecting) return true;
    const e = u.uprops?.[REFLECTING];
    if ((e?.intrinsic | 0) || (e?.extrinsic | 0)) return true;
    if (u.uarms?.otyp === SHIELD_OF_REFLECTION) return true;
    if (u.uamul?.otyp === AMULET_OF_REFLECTION) return true;
    const arm = u.uarm?.otyp | 0;
    if (arm === SILVER_DRAGON_SCALES || arm === SILVER_DRAGON_SCALE_MAIL) {
        return true;
    }
    return (game.youmonst?.data?.mndx | 0) === PM_SILVER_DRAGON;
}

function Blind() {
    return !!(game.u?.Blind || game.u?.ublind);
}

/**
 * C youprop.h Blind for zapyourself WAN_MAKE_INVISIBLE msg —
 * (HBlinded || EBlinded) && !BBlinded. Sticky Blind() first.
 */
function Blinded_for_invis() {
    const u = game.u || {};
    if (Blind()) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/**
 * C youprop.h BInvis — uprops[INVIS].blocked.
 * JS setworn named-omits w_blocks; worn MUMMY_WRAPPING on uarmc
 * stands in (C worn.c setworn `:126–127`).
 */
function BInvis() {
    const u = game.u || {};
    const p = u.uprops?.[INVIS];
    if ((u.BInvis | 0) || (p?.blocked | 0)) return true;
    const cloak = u.uarmc;
    return !!(cloak && (cloak.otyp | 0) === MUMMY_WRAPPING);
}

/**
 * C youprop.h Invis — (HInvis || EInvis) && !BInvis
 * via flats + uprops[INVIS] (cloak-of-invis confer writes
 * extrinsic only).
 */
function Invis() {
    const u = game.u || {};
    const p = u.uprops?.[INVIS];
    const H = (u.HInvis | 0) || (p?.intrinsic | 0);
    const E = (u.EInvis | 0) || (p?.extrinsic | 0);
    return !!(H || E) && !BInvis();
}

/** C potion.c itimeout — clamp into TIMEOUT field. */
function itimeout(val) {
    val = val | 0;
    if (val >= TIMEOUT) return TIMEOUT;
    if (val < 1) return 0;
    return val;
}

/**
 * C potion.c incr_itimeout(&HInvis, n) — TIMEOUT bits only.
 * Write HInvis and uprops[INVIS].intrinsic (C single storage;
 * timeout.js decrements uprops then syncs the flat).
 */
function incr_itimeout_HInvis(incr) {
    const u = game.u || (game.u = {});
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[INVIS]) {
        u.uprops[INVIS] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    }
    const cur = (u.HInvis | 0) | (u.uprops[INVIS].intrinsic | 0);
    const next = (cur & ~TIMEOUT) | itimeout((cur & TIMEOUT) + (incr | 0));
    u.HInvis = next;
    u.uprops[INVIS].intrinsic = next;
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

/** C ref: hack.h BZ_OFS_WAN / BZ_U_WAND / BZ_OFS_SPE / BZ_U_SPELL */
function BZ_OFS_WAN(otyp) {
    return Math.abs((otyp | 0) - WAN_MAGIC_MISSILE) % 10;
}
function BZ_U_WAND(bztyp) {
    return 0 + (bztyp | 0);
}
function BZ_OFS_SPE(otyp) {
    return Math.abs((otyp | 0) - SPE_MAGIC_MISSILE) % 10;
}
function BZ_U_SPELL(bztyp) {
    return 10 + (bztyp | 0);
}

/**
 * C ref: zap.c flash_types — wand 0..9 / spell 10..19 / breath 20..29.
 * Empty slots match C; Hallucination suppress deferred (caller passes
 * fltyp already via zaptype).
 */
export function flash_str(fltyp) {
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
 * C ref: invent.c useupf — consume numused from floor pile (shop bill deferred).
 */
function useupf(obj, numused) {
    if (!obj) return;
    let victim = obj;
    const n = numused | 0;
    if ((obj.quan || 1) > n) {
        victim = splitobj(obj, n) || obj;
    }
    delobj(victim);
}

/** C ref: pline.c You — prefix "You ". */
async function You(rest) {
    await pline(`You ${rest}`);
}

/** C ref: dbridge.c / rm.h is_ice — ICE or drawbridge-under DB_ICE. */
export function is_ice(x, y) {
    if (!isok(x, y)) return false;
    const lev = game.level?.at?.(x, y);
    if (!lev) return false;
    if ((lev.typ | 0) === ICE) return true;
    return (lev.typ | 0) === DRAWBRIDGE_UP
        && ((lev.drawbridgemask | 0) & DB_UNDER) === DB_ICE;
}

/**
 * C ref: zap.c burn_floor_objects — burn scrolls/spellbooks/slime glob
 * on floor; return count destroyed. ignite_items still stub (D-0965).
 * give_feedback pline arm (D-0975); zap_over_floor still uses FALSE + smoke.
 */
export async function burn_floor_objects(x, y, give_feedback, u_caused) {
    let cnt = 0;
    let obj = objects_at(x, y);
    while (obj) {
        const obj2 = obj.nexthere;
        const oclass = obj.oclass | 0;
        if (oclass === SCROLL_CLASS || oclass === SPBOOK_CLASS
            || (oclass === FOOD_CLASS
                && (obj.otyp | 0) === GLOB_OF_GREEN_SLIME)) {
            if ((obj.otyp | 0) === SCR_FIRE || (obj.otyp | 0) === SPE_FIREBALL
                || obj_resists(obj, 2, 100)) {
                obj = obj2;
                continue;
            }
            const scrquan = obj.quan || 1;
            let delquan = 0;
            for (let i = scrquan; i > 0; i--) {
                if (!rn2(3)) delquan++;
            }
            if (delquan) {
                // C: save name before potential delobj()
                let buf1 = '';
                let buf2 = '';
                if (give_feedback) {
                    const saveQuan = obj.quan;
                    obj.quan = 1;
                    buf1 = u_at(x, y) ? xname(obj) : distant_name(obj, xname);
                    obj.quan = 2;
                    buf2 = u_at(x, y) ? xname(obj) : distant_name(obj, xname);
                    obj.quan = saveQuan;
                }
                if (u_caused) {
                    useupf(obj, delquan);
                } else if (delquan < scrquan) {
                    obj.quan = scrquan - delquan;
                    obj.owt = weight(obj);
                } else {
                    delobj(obj);
                }
                cnt += delquan;
                if (give_feedback) {
                    if (delquan > 1) {
                        await pline(`${delquan} ${buf2} burn.`);
                    } else {
                        await pline(`${An(buf1)} burns.`);
                    }
                }
            }
        }
        obj = obj2;
    }
    await ignite_items(objects_at(x, y));
    return cnt;
}

/**
 * C ref: zap.c melt_ice — ICE/DB_ICE → pool/moat; stop melt timer;
 * obj_ice_effects + unearth_objs; Norep; hero spoteffects / mon
 * minliquid. Named omit: trap_ice_effects; Underwater vision;
 * boulder_hits_pool body (D-0965/D-0967).
 */
export async function melt_ice(x, y, msg) {
    const lev = game.level?.at?.(x, y);
    if (!lev) return;
    if (!msg) msg = 'The ice crackles and melts.';
    if ((lev.typ | 0) === DRAWBRIDGE_UP || (lev.typ | 0) === DRAWBRIDGE_DOWN) {
        lev.drawbridgemask = (lev.drawbridgemask | 0) & ~DB_ICE;
    } else {
        // lev.typ == ICE
        lev.typ = ((lev.icedpool | 0) === ICED_POOL) ? POOL : MOAT;
        lev.icedpool = 0;
    }
    spot_stop_timers(x, y, MELT_ICE_AWAY);
    // trap_ice_effects deferred
    obj_ice_effects(x, y, false);
    unearth_objs(x, y);
    if (game.u?.Underwater) {
        // vision_recalc(1) deferred
    }
    newsym(x, y);
    if (cansee(x, y) || u_at(x, y)) await Norep(msg);
    // boulder settle / boulder_hits_pool deferred
    if (u_at(x, y)) {
        // spoteffects(TRUE) deferred — drown/notice objects
    } else if (is_pool(x, y)) {
        const mtmp = m_at(x, y);
        if (mtmp) {
            const { minliquid } = await import('./mon.js');
            await minliquid(mtmp);
        }
    }
}

/**
 * C ref: zap.c start_melt_ice_timeout — usually queue MELT_ICE_AWAY;
 * sometimes leave ice permanent when when > MAX_ICE_TIME.
 */
export function start_melt_ice_timeout(x, y, min_time) {
    const MIN_ICE_TIME = 50;
    const MAX_ICE_TIME = 2000;
    let when = min_time | 0;
    if (when < MIN_ICE_TIME - 1) when = MIN_ICE_TIME - 1;
    while (++when <= MAX_ICE_TIME) {
        if (!rn2((MAX_ICE_TIME - when) + MIN_ICE_TIME)) break;
    }
    if (when <= MAX_ICE_TIME) {
        const where = (((x | 0) & 0xffff) << 16) | ((y | 0) & 0xffff);
        start_timer(when, TIMER_LEVEL, MELT_ICE_AWAY, where);
    }
}

/**
 * C ref: zap.c melt_ice_away — TIMER_LEVEL callback; mon_moving so melt
 * does not credit hero.
 */
export async function melt_ice_away(where) {
    const save = game.context?.mon_moving;
    if (!game.context) game.context = {};
    game.context.mon_moving = true;
    const y = (where | 0) & 0xffff;
    const x = ((where | 0) >> 16) & 0xffff;
    await melt_ice(x, y, 'Some ice melts away.');
    game.context.mon_moving = save;
}

/**
 * C ref: zap.c zap_over_floor — floor effects for buzz trail / explode.
 * Envelope (D-0948/D-0965/D-0967): ZT_FIRE WEB/ice melt/pool evaporate+PIT/
 * fountain dryup; ZT_COLD freeze pool/lava + bury_objs + ice firm-up +
 * obj_ice_effects; ZT_POISON_GAS cloud; ZT_LIGHTNING/ZT_ACID IRONBARS;
 * SDOOR; closed_door shop; fire burn_floor_objects; ignoremon wakeup;
 * lavawall→wall + fix_wall_spines (D-0975).
 * Named omit: Underwater/utrap lava arms; dotrap polish.
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
    const lavawall = (loc.typ | 0) === LAVAWALL;

    switch (damgtype) {
    case ZT_FIRE: {
        let t = t_at(x, y);
        if (t && (t.ttyp | 0) === WEB) {
            if (see_it) await Norep('A web bursts into flames!');
            delfloortrap(t);
            t = null;
            if (see_it) newsym(x, y);
        }
        if (is_ice(x, y)) {
            await melt_ice(x, y, null);
        } else if (is_pool(x, y)) {
            const u = game.u || {};
            const on_water_level = !!Is_waterlevel(u.uz);
            let msggiven = false;
            let msgtxt = !Deaf()
                ? 'You hear hissing gas.'
                : ((type | 0) >= 0
                    ? 'That seemed remarkably uneventful.'
                    : null);

            if (!on_water_level) {
                await create_gas_cloud(x, y, rnd(5), 0);
                if ((game.iflags?.last_msg | 0) === PLNMSG_ENVELOPED_IN_GAS) {
                    msggiven = true;
                }
            }

            if ((loc.typ | 0) !== POOL) {
                if (on_water_level) {
                    msgtxt = (see_it || !Deaf()) ? 'Some water boils.' : null;
                } else if (see_it) {
                    msgtxt = 'Some water evaporates.';
                }
            } else {
                rangemod -= 3;
                loc.typ = ROOM;
                loc.flags = 0;
                t = maketrap(x, y, PIT);
                if (see_it) msgtxt = 'The water evaporates.';
            }
            if (msgtxt && !msggiven) await Norep(msgtxt);

            if ((loc.typ | 0) === ROOM) {
                const mon = m_at(x, y);
                if (mon && is_swimmer(mon.data) && mon.mundetected) {
                    mon.mundetected = 0;
                }
                newsym(x, y);
                if (t) {
                    if (u_at(x, y)) await dotrap(t, NO_TRAP_FLAGS);
                    else if (mon) await mintrap(mon, NO_TRAP_FLAGS);
                }
            }
        } else if (IS_FOUNTAIN(loc.typ)) {
            await create_gas_cloud(x, y, rnd(3), 0);
            if (see_it) await pline('Steam billows from the fountain.');
            rangemod -= 1;
            await dryup(x, y, (type | 0) > 0);
        }
        break;
    }
    case ZT_COLD: {
        if (is_pool(x, y) || is_lava(x, y) || lavawall) {
            const lava = is_lava(x, y) || lavawall;
            const moat = is_moat(x, y);
            const chance = Math.max(
                2,
                5 + ((game.level?.flags?.temperature | 0) * 10),
            );

            if (IS_WATERWALL(loc.typ) || (lavawall && rn2(chance))) {
                if (see_it) {
                    await pline(
                        `The ${hliquid(lavawall ? 'lava' : 'water')} `
                        + 'freezes for a moment.',
                    );
                } else {
                    await You_hear('a soft crackling.');
                }
                rangemod -= 1000;
            } else {
                const buf = waterbody_name(x, y);
                rangemod -= 3;
                if ((loc.typ | 0) === DRAWBRIDGE_UP) {
                    loc.drawbridgemask = (loc.drawbridgemask | 0) & ~DB_UNDER;
                    loc.drawbridgemask |= lava ? DB_FLOOR : DB_ICE;
                } else {
                    loc.icedpool = lava
                        ? 0
                        : ((loc.typ | 0) === POOL ? ICED_POOL : ICED_MOAT);
                    if (lavawall) {
                        const up = isok(x, y - 1)
                            && IS_WALL(game.level?.at?.(x, y - 1)?.typ);
                        const dn = isok(x, y + 1)
                            && IS_WALL(game.level?.at?.(x, y + 1)?.typ);
                        loc.typ = (up || dn) ? VWALL : HWALL;
                        // C: fix_wall_spines(max(0,x-1)..min(COLNO-1,x+1), …)
                        fix_wall_spines(
                            Math.max(0, x - 1),
                            Math.max(0, y - 1),
                            Math.min(COLNO - 1, x + 1),
                            Math.min(ROWNO - 1, y + 1),
                        );
                    } else {
                        loc.typ = lava ? ROOM : ICE;
                    }
                }
                await bury_objs(x, y);
                if (see_it) {
                    if (lava) {
                        await Norep(
                            `The ${hliquid('lava')} cools and solidifies.`,
                        );
                    } else if (moat) {
                        await Norep(`The ${buf} is bridged with ice!`);
                    } else {
                        await Norep(`The ${hliquid('water')} freezes.`);
                    }
                    newsym(x, y);
                } else if (!lava) {
                    await You_hear('a crackling sound.');
                }
                if (u_at(x, y)) {
                    // uinwater / utrap lava arms deferred
                } else {
                    const mon = m_at(x, y);
                    if (mon && is_swimmer(mon.data) && mon.mundetected) {
                        mon.mundetected = 0;
                        newsym(x, y);
                    }
                }
                if (!lava) {
                    start_melt_ice_timeout(x, y, 0);
                    obj_ice_effects(x, y, true);
                }
            }
        } else if (is_ice(x, y)) {
            const melt_time = spot_time_left(x, y, MELT_ICE_AWAY);
            if (melt_time !== 0) {
                spot_stop_timers(x, y, MELT_ICE_AWAY);
                start_melt_ice_timeout(x, y, melt_time);
            }
        }
        break;
    }
    case ZT_POISON_GAS:
        if (ZAP_POS(loc.typ)) await create_gas_cloud(x, y, 1, 8);
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
                await dissolve_bars(x, y);
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

    // C: OBJ_AT + ZT_FIRE → burn_floor_objects; smoke if couldsee
    if (objects_at(x, y) && damgtype === ZT_FIRE) {
        if (await burn_floor_objects(x, y, false, (type | 0) > 0)
            && couldsee(x, y)) {
            newsym(x, y);
            await You(`${!Blind() ? 'see a puff' : 'smell a whiff'} of smoke.`);
        }
    }
    if (!ignoremon) {
        const mon = m_at(x, y);
        if (mon) await wakeup(mon, (type | 0) >= 0);
    }
    return rangemod;
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
export function resists_elec(mon) { return mon_resists_bit(mon, MR_ELEC); }
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
        // C zap.c destroyable :5641–5644 — RIN_SHOCK / WAN_LIGHTNING immune
        return (obj.otyp | 0) !== RIN_SHOCK_RESISTANCE
            && (obj.otyp | 0) !== WAN_LIGHTNING;
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

/** C ref: objnam.c Yname2 — capitalized yname. */
function Yname2_destroy(obj) {
    const s = yname(obj);
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/** C ref: objnam.c Yobjnam2 — "Your <xname> <otense verb>". */
function Yobjnam2_destroy(obj, verb) {
    const nam = xname(obj);
    if (!verb) return `Your ${nam}`;
    return `Your ${nam} ${vtense(nam, verb)}`;
}

/**
 * C ref: read.c recharge RING_CLASS curse_bless==0 — maybe_destroy_item
 * chargeit callee. Wand/tool/blessed/cursed recharge named omit.
 */
async function recharge_elec_ring(obj) {
    if (!obj) return;
    const u = game.u || {};
    const is_on = obj === u.uleft || obj === u.uright;
    // curse_bless == 0 → s = 1
    if ((obj.spe | 0) > rn2(7) || (obj.spe | 0) <= -5) {
        await pline(
            `${Yobjnam2_destroy(obj, 'pulsate')} momentarily, then ${vtense(xname(obj), 'explode')}!`,
        );
        if (is_on) await Ring_gone(obj);
        const s = rnd(3 * Math.abs(obj.spe | 0));
        useup_invent(obj);
        losehp(maybe_half_phys(s), 'exploding ring', KILLED_BY_AN);
        if (game._losehp_needs_done || game.program_state?.gameover) {
            await finish_losehp_done();
        }
    } else {
        await pline(`${Yname2_destroy(obj)} spins clockwise for a moment.`);
        const mask = is_on ? (obj === u.uleft ? LEFT_RING : RIGHT_RING) : 0;
        if (is_on) await Ring_off(obj);
        obj.spe = (obj.spe | 0) + 1;
        if (is_on) {
            setworn(obj, mask);
            await Ring_on(obj);
        }
        // unpaid alter_cost named omit
    }
}

/**
 * C ref: zap.c maybe_destroy_item — AD_COLD potions + AD_FIRE potion/scroll/
 * spbook + AD_ELEC ring/wand (D-1368). Shock_resistance via
 * uprops[SHOCK_RES] (D-1371). Named omissions:
 * inventory_resistance_check; Book-of-Dead glow; read.c recharge
 * wand/tool/blessed; mult forms beyond 1-of-1.
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
    let chargeit = false;

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
    } else if (dmgtyp === AD_ELEC) {
        // C zap.c maybe_destroy_item :5858–5879
        xresist = obj.oclass !== RING_CLASS
            && (u_carry ? Shock_resistance() : resists_elec(carrier));
        quan = obj.quan | 0;
        if (obj.oclass === RING_CLASS) {
            const uarmg = game.u?.uarmg;
            if ((((obj.owornmask | 0) & W_RING) && uarmg && !is_metallic(uarmg))
                || (obj.otyp | 0) === RIN_SHOCK_RESISTANCE) {
                skip = true;
            } else if (otyp_is_charged(obj.otyp) && rn2(3)) {
                chargeit = true;
            } else {
                dindx = 5;
                dmg = 0;
            }
        } else if (obj.oclass === WAND_CLASS) {
            dindx = 6;
            dmg = rnd(10);
        }
    } else {
        skip = true;
    }

    if (chargeit) {
        // C: recharge only handles hero inventory
        if (u_carry) await recharge_elec_ring(obj);
    } else if (!skip) {
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
            if (obj.owornmask) {
                if ((obj.owornmask | 0) & W_RING) await Ring_gone(obj);
                else {
                    const { setnotworn } = await import('./do.js');
                    setnotworn(obj);
                }
            }
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
    }
    return dmg;
}

/**
 * C ref: zap.c destroy_items — limit rn2 + invent/minvent scan.
 * Hero uses game.invent array; monsters use minvent nobj chain.
 * Named omissions: bypass_objlist; defer levitation/were.
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
 * zhitm spell_damage_bonus (helper lives D-1378); burnarmor/ignite; acid_damage/erode; death-breath
 * armor strip; Rider/Death; Knight questart double; shieldeff.
 * @returns {Promise<number>} damage applied (MAGIC_COOKIE = disintegrate)
 */
export async function zhitm(mon, type, nd, ootmp) {
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
        // zhitm spell_damage_bonus still named (helper D-1378)
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
                await ignite_items(mon.minvent);
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
 * destroy_items/ignite gate + ZT_COLD/ELEC destroy_items + losehp;
 * ZT_ACID Acid_resistance + hliquid + d(nd,6) (D-1127).
 * Named omissions: shieldeff/monstunseesu/ugolemeffects;
 * death/disintegrate arms; poison; acid_damage/erode_armor bodies;
 * killer buzzer verb polish.
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
        await burn_away_slime();
        if (await burnarmor(game.youmonst || { _youmonst: true })) {
            if (!rn2(3)) {
                await destroy_items(
                    game.youmonst || { _youmonst: true },
                    AD_FIRE,
                    orig_dam,
                );
            }
            if (!rn2(3)) await ignite_items(game.invent);
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
        // poisoned("blast", A_DEX, ...) deferred
        break;
    case ZT_ACID: {
        const u = game.u || {};
        if (Acid_resistance()) {
            await pline(`The ${hliquid('acid')} doesn't hurt.`);
            dam = 0;
        } else {
            await pline(`The ${hliquid('acid')} burns!`);
            dam = d(nd, 6);
            exercise(A_STR, false);
        }
        // acid_damage / erode_armor bodies deferred; consume C rn2 gates
        rn2(u.twoweap ? 3 : 6);
        if (u.twoweap) rn2(3);
        rn2(6);
        break;
    }
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
 * C ref: zap.c ubreatheu — poly'd hero breath against self.
 * dtyp = 20 + adtyp - 1 (ZT_BREATH); flash_str(..., TRUE) no-hallu killer
 * (JS flash_str already skips Hallu).
 */
export async function ubreatheu(mattk) {
    if (!mattk) return;
    const dtyp = 20 + (mattk.adtyp | 0) - 1;
    const u = game.u || {};
    await zhitu(dtyp, mattk.damn | 0, flash_str(dtyp), u.ux, u.uy);
}

/**
 * C ref: zap.c dobuzz — wand/spell/breath ray + DISP_BEAM + zhitm/zhitu.
 * Envelope: type<0 newsym; rn1(7,7) range; fireball skips trail
 * zap_over_floor then explode(d(12,6)) (D-0965); gas deferred until
 * after hit/reflect; mon/hero zap_hit; type<0 dead → monkilled(…,
 * AD_RBRE) else xkilled/killed; shopdamage → pay_for_damage (D-0948).
 * Named omit: mon_reflects; map_invisible; Hallu hdmgtype;
 * disintegrate_mon; fire completelyburns XKILL_NOCORPSE; steed
 * redirect; AD_MAGM..ACID explode combat → explode.js (D-0973).
 */
export async function dobuzz(
    type, nd, sx0, sy0, dx0, dy0, sayhit, _saymiss, forcemiss,
) {
    const fltyp = zaptype(type);
    const damgtype = fltyp % 10;
    // C: Hallucination ? rn2(6) : damgtype — Hallu path deferred
    const hdmgtype = damgtype;
    // C: fireball = (type == ZT_SPELL(ZT_FIRE))
    const fireball = (type | 0) === (ZT_SPELL_0 + ZT_FIRE);
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
    let fireball_type = type | 0;

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
            let fireball_break = false;

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
                // fireballs only damage when they explode; poison gas
                // defers zap_over_floor until after hit/reflect.
                if (!fireball && !gas_hit) {
                    range += await zap_over_floor(
                        sx, sy, type, shopdamage, true, 0,
                    );
                }

                // Prior wand path: closed door absorb pline (C uses
                // zap_over_floor rangemod; keep message for screen PASS).
                if (!fireball && (type | 0) >= 0 && closed_door(sx, sy)) {
                    await pline('The door absorbs your bolt!');
                    range += -1000;
                }

                let mon = m_at(sx, sy);
                if (mon) {
                    if (fireball) {
                        fireball_break = true;
                    } else {
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
                    }
                } else if (u_at(sx, sy) && range >= 0) {
                    nomul(0);
                    if (!forcemiss && zap_hit(game.u?.uac ?? 10, 0)) {
                        range -= 2;
                        // C zap.c:4964 pline_dir(xytodir(-dx,-dy), "%s hits you!",
                        // The(flash_str)) (D-1216). Steed rn2(3) still named.
                        await pline_dir(
                            xytodir(-dx, -dy),
                            `The ${flash_str(fltyp)} hits you!`,
                        );
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

            if (fireball_break) break;

            if (do_bounce) {
                // C: bounce_dir always runs once in make_bounce; pline only when
                // (--range > 0 && cansee previous). Cardinal bounce uses no rn2.
                const bchance = (!isok(sx, sy) || typ === STONE) ? 10 : 75;
                if ((--range > 0 && isok(lsx, lsy) && cansee(lsx, lsy))
                    || fireball) {
                    if (Is_airlevel(game.u?.uz)) {
                        await pline(
                            `The ${flash_str(fltyp)} vanishes into the aether!`,
                        );
                        // C: type = ZT_WAND(ZT_FIRE); fireball flag stays
                        if (fireball) fireball_type = ZT_FIRE;
                        break;
                    } else if (fireball) {
                        sx = lsx;
                        sy = lsy;
                        break;
                    } else {
                        await pline(`The ${flash_str(fltyp)} bounces!`);
                    }
                }
                if (!fireball) {
                    const bd = bounce_dir(sx, sy, dx, dy, bchance);
                    dx = bd.dx;
                    dy = bd.dy;
                    // C: tmp_at(DISP_CHANGE, zapdir_to_glyph(dx, dy, hdmgtype))
                    tmp_at(DISP_CHANGE, zapdir_to_glyph(dx, dy, hdmgtype));
                } else {
                    break;
                }
            }
        }
    } finally {
        tmp_at(DISP_END, 0);
    }
    // C: fireball → explode(sx, sy, type, d(12,6), 0, EXPL_FIERY)
    if (fireball) {
        await explode(sx, sy, fireball_type, d(12, 6), 0, EXPL_FIERY);
    }
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

/** C ref: zap.c ubuzz — exported for music fire/frost horn (D-0974). */
export async function ubuzz(type, nd) {
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
const SPE_DETECT_UNSEEN = objectNames.indexOf('SPE_DETECT_UNSEEN');

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
 * C ref: hacklib.c s_suffix — possessive for saddle drop msg.
 */
function s_suffix_zap(s) {
    if (!s) return s;
    if (s === 'it' || s === 'It') return 'its';
    if (s.endsWith('s') || s.endsWith('z') || s.endsWith('x')
        || s.endsWith('ch') || s.endsWith('sh')) {
        return `${s}'`;
    }
    return `${s}'s`;
}

/** C ref: dungeon.c surface — floor/ground stand-in for saddle drop. */
function surface_zap(x, y) {
    const loc = game.level?.at?.(x, y);
    const typ = loc?.typ ?? 0;
    if (IS_FOUNTAIN(typ)) return 'fountain';
    if (IS_ALTAR(typ)) return 'altar';
    if (IS_WALL(typ) || IS_STWALL(typ)) return 'wall';
    if (IS_DOOR(typ)) return 'doorway';
    if (IS_ROOM(typ) && !Is_earthlevel(game.u?.uz)) return 'floor';
    if (IS_AIR(typ)) return typ === CLOUD ? 'cloud' : 'air';
    return 'ground';
}

/**
 * C ref: zap.c release_hold — free hero from ustuck / uswallow / sticks.
 * Named omit: status UHold botl polish only (set_ustuck already sets botl).
 */
export async function release_hold() {
    const u = game.u || {};
    const mtmp = u.ustuck;
    if (!mtmp) {
        // impossible("release_hold when not held?")
        return;
    }
    if (u.uswallow) {
        if (digests(mtmp.data)) {
            if (!Blind()) {
                await pline(`${Monnam(mtmp)} opens its mouth!`);
            } else {
                await You_feel('a sudden rush of air!');
            }
        }
        await expels(mtmp, mtmp.data, true);
    } else if (sticks(game.youmonst?.data)) {
        set_ustuck(null);
        await You(`release ${mon_nam(mtmp)}.`);
    } else {
        await unstuck(u.ustuck);
        let relbuf;
        if (!nohands(mtmp.data)) {
            // C: s_suffix(mon_nam) + " grasp"
            const nam = mon_nam(mtmp);
            const poss = (!nam) ? nam
                : (nam === 'it' || nam === 'It') ? 'its'
                    : (nam.endsWith('s') || nam.endsWith('z') || nam.endsWith('x')
                        || nam.endsWith('ch') || nam.endsWith('sh'))
                        ? `${nam}'` : `${nam}'s`;
            relbuf = `from ${poss} grasp`;
        } else {
            relbuf = `by ${mon_nam(mtmp)}`;
        }
        await You(`are released ${relbuf}.`);
    }
}

/** C ref: you.h Luck — u.uluck + u.moreluck. */
function Luck() {
    const u = game.u || {};
    return (u.uluck | 0) + (u.moreluck | 0);
}

/**
 * C ref: zap.c do_enlightenment_effect :2525–2532.
 * Callers: zapnodir WAN_ENLIGHTENMENT (D-1395);
 * potion.c peffect_enlightenment (D-1413). Named omit:
 * artifact.c invoke enlightenment.
 */
export async function do_enlightenment_effect() {
    await You_feel('self-knowledgeable...');
    await flush_topl_more(); // display_nhwindow(WIN_MESSAGE, FALSE)
    await enlightenment(MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS);
    await pline('The feeling subsides.'); // C pline_The
    exercise(A_WIS, true);
}

/**
 * C ref: zap.c zapnodir — NODIR wand effects.
 * Branch envelope: WAN_SECRET_DOOR_DETECTION → findit;
 * WAN_LIGHT / SPE_LIGHT → litroom + lightdamage (D-1366);
 * WAN_CREATE_MONSTER → create_critters (D-1379);
 * WAN_WISHING → Luck+rn2(5) then makewish (D-1380);
 * WAN_ENLIGHTENMENT → do_enlightenment_effect (D-1395);
 * WAN_STASIS → stasis_until max moves+rn1(21,10) (D-1404);
 * SPE_DETECT_UNSEEN shares SECRET_DOOR findit (D-1412).
 * Named omit: remaining NODIR wand-duplicate SPE_LIGHT cast
 * dispatch (zapnodir SPE_LIGHT already live D-1366).
 */
export async function zapnodir(obj) {
    let known = false;

    switch (obj.otyp) {
    case WAN_LIGHT:
    case SPE_LIGHT:
        // C zap.c zapnodir :2544–2550 — known if dknown && !Blind;
        // litroom(TRUE) then lightdamage(obj, TRUE, 5) (void).
        known = !!(obj.dknown && !Blind());
        await litroom(true, obj);
        await lightdamage(obj, true, 5);
        break;
    case WAN_SECRET_DOOR_DETECTION:
    case SPE_DETECT_UNSEEN:
        // C zap.c zapnodir :2552–2558 — findit() feedback discovers
        // the type even when Blind or when it finds nothing;
        // known = !!dknown. Spellbooks skip learnwand (SPBOOK_CLASS).
        known = !!obj.dknown;
        await findit();
        break;
    case WAN_CREATE_MONSTER:
        // C zap.c zapnodir :2569–2574 — rn2(23)?1:rn1(7,2) then
        // create_critters(..., NULL, FALSE); known iff seen + dknown.
        if (await create_critters(rn2(23) ? 1 : rn1(7, 2), null, false)) {
            known = !!obj.dknown;
        }
        break;
    case WAN_WISHING:
        // C zap.c zapnodir :2575–2585 — Luck + rn2(5) < 0 then
        // "Unfortunately, nothing happens." (known FALSE); else
        // known = !!dknown then makewish() (discover unless unseen).
        if (Luck() + rn2(5) < 0) {
            await pline('Unfortunately, nothing happens.');
            known = false;
        } else {
            known = !!obj.dknown;
            await makewish();
        }
        break;
    case WAN_ENLIGHTENMENT:
        // C zap.c zapnodir :2586–2590 — known = !!dknown then
        // do_enlightenment_effect (always describes enlightenment).
        known = !!obj.dknown;
        await do_enlightenment_effect();
        break;
    case WAN_STASIS: {
        // C zap.c zapnodir :2559–2568 — no message, known stays
        // FALSE (not distinguishable from other silent NODIR);
        // tmp_until = moves + rn1(21, 10); keep the longest.
        const tmp_until = (game.moves | 0) + rn1(21, 10);
        const lf = game.level.flags;
        if (tmp_until > (lf.stasis_until | 0)) {
            lf.stasis_until = tmp_until;
        }
        break;
    }
    default:
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

/** C ref: mondata.h is_reviver — rider or troll. */
function is_reviver(ptr) {
    return !!(ptr && (is_rider(ptr) || ptr.mlet === 'S_TROLL'));
}

/** C ref: mondata.h unique_corpstat — G_UNIQ. */
function unique_corpstat(ptr) {
    return !!((ptr?.geno | 0) & G_UNIQ);
}

const AD_SEDU = 22;
const AD_SSEX = 35;
const PM_GHOST = monsterNames.indexOf('PM_GHOST');

/** C ref: mondata.h dmgtype — any mattk slot matches adtyp. */
function dmgtype_zap(ptr, adtyp) {
    const slots = ptr?.mattk;
    if (!slots) return false;
    for (let i = 0; i < NATTK; i++) {
        if ((slots[i]?.adtyp | 0) === adtyp) return true;
    }
    return false;
}

/** C: SYSOPT_SEDUCE — runtime seduce option (default on when unset). */
function SYSOPT_SEDUCE_zap() {
    return game.sysopt?.seduce !== false;
}

/**
 * C ref: zap.c montraits — revive from corpse/statue omonst traits.
 * Used by revive() and animate_statue(). Named omit: full replshk bill_p;
 * worm light-source swap.
 * @returns {object|null}
 */
export function montraits(obj, cc, adjacentok) {
    let mtmp = null;
    const mtmp2 = has_omonst(obj) ? get_mtraits(obj, true) : null;
    if (!mtmp2) return null;

    mtmp2.data = mons(mtmp2.mnum | 0);
    if ((mtmp2.mhpmax | 0) > 0 || is_rider(mtmp2.data)) {
        let mmflags = NO_MINVENT | MM_NOWAIT | MM_NOCOUNTBIRTH
            | MM_NOTAIL | MM_NOMSG;
        if (adjacentok) mmflags |= MM_ADJACENTOK;
        mtmp = makemon(mtmp2.data, cc.x | 0, cc.y | 0, mmflags);
    }
    if (!mtmp) {
        // mtmp2 was a copy — drop
        return null;
    }

    // heal / restore drained levels (rnd burns)
    if ((mtmp.m_lev | 0) < (mtmp.data?.mlevel | 0)) {
        const ltmp = rnd((mtmp.data.mlevel | 0) + 1);
        if (ltmp > (mtmp.m_lev | 0)) {
            while ((mtmp.m_lev | 0) < ltmp) {
                mtmp.m_lev = (mtmp.m_lev | 0) + 1;
                mtmp.mhpmax = (mtmp.mhpmax | 0) + monhp_per_lvl(mtmp);
            }
            mtmp2.m_lev = mtmp.m_lev;
        }
    }
    if ((mtmp.mhpmax | 0) > (mtmp2.mhpmax | 0)) mtmp2.mhpmax = mtmp.mhpmax;
    mtmp2.mhp = mtmp2.mhpmax | 0;

    mtmp2.minvent = mtmp.minvent;
    if (mtmp.m_id) {
        mtmp2.m_id = mtmp.m_id;
        if (game.quest_status?.leader_is_dead
            && (mtmp2.m_id | 0) === (game.quest_status.leader_m_id | 0)) {
            game.quest_status.leader_is_dead = false;
        }
    }
    mtmp2.mx = mtmp.mx;
    mtmp2.my = mtmp.my;
    mtmp2.mux = mtmp.mux;
    mtmp2.muy = mtmp.muy;
    mtmp2.mw = mtmp.mw;
    mtmp2.wormno = mtmp.wormno;
    mtmp2.misc_worn_check = mtmp.misc_worn_check;
    mtmp2.weapon_check = mtmp.weapon_check;
    mtmp2.mtrapseen = mtmp.mtrapseen;
    mtmp2.mflee = mtmp.mflee;
    mtmp2.mburied = mtmp.mburied;
    mtmp2.mundetected = mtmp.mundetected;
    mtmp2.mfleetim = mtmp.mfleetim;
    mtmp2.mlstmv = mtmp.mlstmv;
    mtmp2.m_ap_type = mtmp.m_ap_type;

    mtmp2.mrevived = 1;
    mtmp2.mavenge = 0;
    mtmp2.meating = 0;
    mtmp2.mleashed = 0;
    mtmp2.mtrapped = 0;
    mtmp2.msleeping = 0;
    mtmp2.mfrozen = 0;
    mtmp2.mcanmove = 1;
    if (!dmgtype_zap(mtmp2.data, AD_SEDU)
        && (!SYSOPT_SEDUCE_zap() || !dmgtype_zap(mtmp2.data, AD_SSEX))) {
        mtmp2.mcan = 0;
    }
    mtmp2.mcansee = 1;
    mtmp2.mblinded = 0;
    mtmp2.mstun = 0;
    mtmp2.mconf = 0;

    if (mtmp2.isshk) {
        neweshk(mtmp);
        const src = ESHK(mtmp2);
        const dst = ESHK(mtmp);
        if (src && dst) Object.assign(dst, src);
        mtmp.isshk = 1;
    }
    replmon(mtmp, mtmp2);
    newsym(mtmp2.mx | 0, mtmp2.my | 0);
    restore_cham(mtmp2);
    return mtmp2;
}

/**
 * C ref: read.c cant_revive — remap guard/cleric/angel(/shopkeeper create)
 * /worm-tail/unique to zombie or doppelganger.
 * @param {{ mtype: number }} box inout mtype
 * @returns {boolean}
 */
export function cant_revive(box, revival, from_obj) {
    let mtype = box.mtype | 0;
    if (mtype === PM_GUARD
        || (mtype === PM_SHOPKEEPER && !revival)
        || mtype === PM_HIGH_CLERIC
        || mtype === PM_ALIGNED_CLERIC
        || mtype === PM_ANGEL) {
        box.mtype = PM_HUMAN_ZOMBIE;
        return true;
    }
    if (mtype === PM_LONG_WORM_TAIL) {
        box.mtype = PM_LONG_WORM;
        return true;
    }
    if (unique_corpstat(mons(mtype))
        && (!from_obj || !OMONST(from_obj))) {
        box.mtype = PM_DOPPELGANGER;
        return true;
    }
    return false;
}

/**
 * C ref: zap.c get_obj_location — invent/floor/minvent + buried/contained
 * when locflags request.
 * @returns {{ x: number, y: number }|null}
 */
function get_obj_location_zap(obj, locflags = 0) {
    if (!obj) return null;
    switch (obj.where) {
    case OBJ_INVENT:
        return { x: game.u?.ux | 0, y: game.u?.uy | 0 };
    case OBJ_FLOOR:
        return { x: obj.ox | 0, y: obj.oy | 0 };
    case OBJ_MINVENT:
        if (obj.ocarry && (obj.ocarry.mx | 0)) {
            return { x: obj.ocarry.mx | 0, y: obj.ocarry.my | 0 };
        }
        break;
    case OBJ_BURIED:
        if (locflags & BURIED_TOO) {
            return { x: obj.ox | 0, y: obj.oy | 0 };
        }
        break;
    case OBJ_CONTAINED:
        if (locflags & CONTAINED_TOO) {
            return get_obj_location_zap(obj.ocontainer, locflags);
        }
        break;
    default:
        break;
    }
    return null;
}

/**
 * C ref: zap.c get_container_location — outermost container where + nesting.
 * @returns {{ carrier: object|null, loc: number, nesting: number }}
 */
function get_container_location(obj) {
    let nesting = 0;
    let cur = obj;
    while (cur && cur.where === OBJ_CONTAINED) {
        nesting += 1;
        cur = cur.ocontainer;
    }
    if (!cur) return { carrier: null, loc: 0, nesting };
    const loc = cur.where | 0;
    const carrier = loc === OBJ_MINVENT ? (cur.ocarry || null) : null;
    return { carrier, loc, nesting };
}

/** C ref: zap.c zombie_can_dig — ROOM/CORR/GRAVE and no trap. */
function zombie_can_dig(x, y) {
    if (!isok(x, y)) return false;
    if (t_at(x, y)) return false;
    const typ = game.level?.at?.(x, y)?.typ | 0;
    return typ === ROOM || typ === CORR || typ === GRAVE;
}

/** Thin obfree after extract — drop refs for GC. */
function obfree_corpse(obj) {
    if (!obj) return;
    obj.quan = 0;
    obj.where = OBJ_FREE;
    if (obj.oextra) {
        delete obj.oextra.omonst;
        delete obj.oextra.omid;
        delete obj.oextra.oname;
    }
}

/**
 * C ref: zap.c revive — invent/minvent/floor + container/buried +
 * cant_revive zombie/doppel + montraits/omonst + ghost recorporealize +
 * shop stolen_value (D-0983).
 * Named omit: cant_finish_meal; Rider delobj_core force;
 * animate_statue caller of montraits.
 * @returns {Promise<object|null>} revived monst or null
 */
export async function revive(corpse, by_hero) {
    if (!corpse || (corpse.otyp | 0) !== CORPSE) return null;
    let montype = corpse.corpsenm | 0;
    if (!ismnum(montype)) return null;

    const mptr0 = mons(montype);
    // Buried auto-reviver (troll/Rider) digs out like a zombie
    const is_zomb = !!(mptr0 && (mptr0.mlet === 'S_ZOMBIE'
        || (corpse.where === OBJ_BURIED && is_reviver(mptr0))));

    let x = 0;
    let y = 0;
    let container = null;
    let container_nesting = 0;

    if (corpse.where !== OBJ_CONTAINED) {
        const locflags = is_zomb ? BURIED_TOO : 0;
        // invent may lack where — treat invent membership as OBJ_INVENT
        if (corpse.where === OBJ_INVENT
            || (game.invent || []).includes(corpse)) {
            x = game.u?.ux | 0;
            y = game.u?.uy | 0;
        } else {
            const loc = get_obj_location_zap(corpse, locflags);
            if (loc) {
                x = loc.x;
                y = loc.y;
            }
        }
    } else {
        container = corpse.ocontainer;
        const info = get_container_location(container);
        container_nesting = info.nesting | 0;
        switch (info.loc) {
        case OBJ_MINVENT:
            if (info.carrier) {
                x = info.carrier.mx | 0;
                y = info.carrier.my | 0;
            }
            break;
        case OBJ_INVENT:
            x = game.u?.ux | 0;
            y = game.u?.uy | 0;
            break;
        case OBJ_FLOOR: {
            const loc = get_obj_location_zap(corpse, CONTAINED_TOO);
            if (loc) {
                x = loc.x;
                y = loc.y;
            }
            break;
        }
        default:
            break;
        }
    }

    if (x) {
        corpse.ox = x;
        corpse.oy = y;
    }

    if (!x
        || (container && (container.olocked
            || container_nesting > 2
            || (container.otyp | 0) === STATUE
            || ((container.otyp | 0) === BAG_OF_HOLDING && rn2(40))))
        || (is_zomb && corpse.where === OBJ_BURIED
            && !zombie_can_dig(x, y))) {
        return null;
    }

    let mptr = mons(montype);
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

    let mmflags = NO_MINVENT | MM_NOWAIT | MM_NOMSG;
    const cgend = (corpse.spe | 0) & CORPSTAT_GENDER;
    if (cgend === CORPSTAT_MALE) mmflags |= MM_MALE;
    else if (cgend === CORPSTAT_FEMALE) mmflags |= MM_FEMALE;

    let mtmp = null;
    const montypeBox = { mtype: montype };
    if (cant_revive(montypeBox, true, corpse)) {
        montype = montypeBox.mtype;
        mtmp = makemon(mons(montype), x, y, mmflags);
        if (mtmp) {
            if (has_omid(corpse)) free_omid(corpse);
            if (has_omonst(corpse)) free_omonst(corpse);
            if ((mtmp.cham | 0) === PM_DOPPELGANGER) {
                newcham(mtmp, mptr, 0);
            } else if (mtmp.data?.mlet === 'S_ZOMBIE') {
                mtmp.mhp = mtmp.mhpmax = 100;
                // C: mon_adjust_speed(mtmp, 2, NULL) — MFAST, no msg
                mtmp.permspeed = MFAST;
                mtmp.mspeed = MFAST;
            }
        }
    } else if (has_omonst(corpse)) {
        xy.x = x;
        xy.y = y;
        mtmp = montraits(corpse, xy, false);
        if (mtmp && mtmp.mtame && !mtmp.isminion) {
            await wary_dog(mtmp, true);
        }
    } else {
        mtmp = makemon(mptr, x, y, mmflags | MM_NOCOUNTBIRTH);
    }
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
        const carried = used.where === OBJ_INVENT
            || (game.invent || []).includes(used);
        let shkp = null;
        if (costly_spot(x, y)
            && (carried ? used.unpaid : !used.no_charge)) {
            const rooms = in_rooms(x, y, SHOPBASE) || '';
            shkp = shop_keeper(rooms ? rooms.charCodeAt(0) : 0);
        }
        if (cansee(x, y)) {
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
        } else if (shkp) {
            await pline('A corpse is resuscitated.');
        }
        // don't charge for shopkeeper's own corpse if we just revived him
        if (shkp && mtmp !== shkp) {
            await stolen_value(used, x, y, !!shkp.mpeaceful, false);
        }
    }

    // C: recorporealization of an active ghost via OMID
    if (has_omid(used)) {
        const mid = OMID(used);
        const ghost = find_mid(mid, 0);
        if (ghost && (ghost.data?.mndx | 0) === PM_GHOST) {
            if (canseemon(ghost)) {
                await pline(
                    `${Monnam(ghost)} is suddenly drawn into its former body!`,
                );
            }
            while (ghost.minvent) {
                const otmp = ghost.minvent;
                obj_extract_self(otmp);
                add_to_minv(mtmp, otmp);
            }
            if (ghost.mtame && !mtmp.mtame) {
                if (await tamedog(mtmp, null, false)) {
                    mtmp.mtame = ghost.mtame;
                }
            }
            mtmp.mconf = 1;
            await mongone(ghost);
        }
        free_omid(used);
    }

    if (has_oname(used) && !unique_corpstat(mtmp.data)) {
        christen_monst(mtmp, ONAME(used));
    }
    if (used.oeaten) {
        mtmp.mhp = eaten_stat(mtmp.mhp | 0, used);
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
    case OBJ_CONTAINED:
        obj_extract_self(used);
        obfree_corpse(used);
        break;
    case OBJ_BURIED:
        if (is_zomb) {
            obj_extract_self(used);
            obfree_corpse(used);
            break;
        }
        // C panics for non-zombie buried — leave corpse
        break;
    default:
        // C panics; do not invent delobj RNG burn
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
 * Hero invent is JS Array (C gi.invent nobj); minvent stays nobj (D-1017).
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

    if (self_cancel) { /* 1st cancel inventory */
        if (youdefend) {
            for (const otmp of game.invent || []) {
                await cancel_item(otmp);
            }
        } else {
            for (let otmp = mdef.minvent; otmp; otmp = otmp.nobj) {
                await cancel_item(otmp);
            }
        }
        if (youdefend) {
            if (game.disp) game.disp.botl = true; /* potential AC change */
            if (game.flags) game.flags.botl = true;
            find_ac();
            /* update_inventory(); -- handled by caller */
        }
    }

    /* now handle special cases */
    if (youdefend) {
        if (Upolyd()) {
            const umon = game.u?.umonnum | 0;
            if (umon === PM_CLAY_GOLEM) {
                if (!Blind()) {
                    await pline('Some writing vanishes from your head!');
                } else {
                    /* C: "dark" rather than "heavy" is intentional */
                    await You_feel(
                        `${Hallucination() ? 'dark' : 'light'} headed.`,
                    );
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
                    `Some writing vanishes from ${s_suffix_zap(mon_nam(mdef))} head!`,
                );
            }
            if (allow_cancel_kill) {
                if (youattack) await killed(mdef);
                else await monkilled(mdef, '', AD_SPEL);
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
 * WAN_TELEPORTATION, WAN_LIGHT (flash_hits_mon), WAN_OPENING/SPE_KNOCK
 * (release_hold; openholding/openfalling; SPE_KNOCK mhurtle; saddle).
 * Named omit: slow/speed/locking/probing; long-worm mcorpsenm polish;
 * Knight questart double; mhurtle petrify/steed;
 * that_is_a_mimic box_or_door. SPE_FORCE_BOLT spell_damage_bonus is D-1388.
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
            // Knight questart dbldam named
            void Role_if;
            void PM_KNIGHT;
            if (otyp === SPE_FORCE_BOLT) {
                /* C zap.c bhitm :208–209 */
                dmg = spell_damage_bonus(dmg);
            }
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
        // C: broken-wand / IMMEDIATE light flash on monster
        if (await flash_hits_mon(mtmp, otmp)) {
            learn_it = true;
            reveal_invis = true;
        }
        break;
    case WAN_OPENING:
    case SPE_KNOCK:
        if (disguised_mimic) {
            // that_is_a_mimic box_or_door deferred → seemimic
            seemimic(mtmp);
        }
        wake = false; // don't want immediate counterattack
        if (mtmp === game.u?.ustuck) {
            await release_hold();
            learn_it = true;
        } else {
            const hold = await openholdingtrap(mtmp);
            if (hold.happened) {
                if (hold.noticed) learn_it = true;
                break;
            }
            const fall = await openfallingtrap(mtmp, true);
            if (fall.happened) {
                if (fall.noticed) learn_it = true;
                break;
            }
            if (otyp === SPE_KNOCK) {
                wake = true;
                if ((mtmp.data?.msize | 0) < MZ_HUMAN
                    && !m_is_steadfast(mtmp)) {
                    if (canseemon(mtmp)) {
                        await pline(`${Monnam(mtmp)} is knocked back!`);
                    }
                    await mhurtle(
                        mtmp,
                        (mtmp.mx | 0) - (game.u?.ux | 0),
                        (mtmp.my | 0) - (game.u?.uy | 0),
                        rnd(2),
                    );
                } else if (canseemon(mtmp)) {
                    await pline(`${Monnam(mtmp)} doesn't budge.`);
                }
                if ((mtmp.mhp | 0) > 0) {
                    await wakeup(mtmp, !mindless(mtmp.data));
                    await abuse_dog(mtmp);
                }
            } else {
                const saddle = which_armor(mtmp, W_SADDLE);
                if (saddle) {
                    let buf = `${s_suffix_zap(Monnam(mtmp))} ${
                        distant_name(saddle, xname)}`;
                    const mx = mtmp.mx | 0;
                    const my = mtmp.my | 0;
                    if (cansee(mx, my)) {
                        if (!canspotmon(mtmp)) {
                            buf = An(distant_name(saddle, xname));
                        }
                        await pline(
                            `${buf} falls to the ${surface_zap(mx, my)}.`,
                        );
                    } else if (canspotmon(mtmp)) {
                        await pline(`${buf} falls off.`);
                    }
                    // C: mdrop_obj — extract worn saddle to floor
                    obj_extract_self(saddle);
                    saddle.owornmask = 0;
                    mtmp.misc_worn_check =
                        (mtmp.misc_worn_check || 0) & ~W_SADDLE;
                    place_object(saddle, mx, my);
                    stackobj(saddle);
                    newsym(mx, my);
                }
            }
        }
        break;
    default:
        break;
    }

    if (wake && (mtmp.mhp | 0) > 0) {
        await wakeup(mtmp, helpful_gesture ? false : true);
        await m_respond(mtmp);
        // C zap.c bhitm: isshk && !*u.ushops → hot_pursuit
        if (mtmp.isshk && !((game.u?.ushops || '')[0])) {
            hot_pursuit(mtmp);
        }
    }
    void reveal_invis;
    if (learn_it) learnwand(otmp);
    return 0;
}

/** C youprop.h Unaware — multi < 0 && (unconscious || fainted). */
function Unaware() {
    if ((game.multi | 0) >= 0) return false;
    const u = game.u || {};
    return !!(u.usleep || u.Unaware);
}

/**
 * C youprop.h Blind — (HBlinded || EBlinded) && !BBlinded.
 * Sticky u.Blind / ublind / roleplay stand in for unsynced mirrors.
 */
function Blind_props() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    if (u.Blind || u.ublind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/**
 * C ref: mondata.c resists_blnd youmonst :248–272 — Blind / Unaware.
 * Named omit: expl/gaze AD_BLND (yellow light / Archon);
 * resists_blnd_by_arti (Sunsword).
 */
function resists_blnd_you() {
    return Blind_props() || Unaware();
}

/**
 * C ref: zap.c lightdamage :3024–3056 — light damages hero in gremlin form.
 * Non-gremlin returns amt with no RNG. Gremlin: rnd(amt), if >10 then
 * 10+rnd(amt-10), cap 20; pline; losehp(Maybe_Half_Phys) with
 * zapped/blasted + uhim + ansimpleoname (or "spell of light" /
 * bare_artifactname). SCROLL/SPBOOK force "blasted".
 * Callers: zapnodir WAN/SPE_LIGHT; zapyourself WAN_LIGHT
 * (broken) + EXPENSIVE_CAMERA; read.c seffect_light via import;
 * muse MUSE_CAMERA (D-1376); artifact invoke_blinding_ray (D-1377).
 * @returns {Promise<number>} possibly reduced dmg
 */
export async function lightdamage(obj, ordinary, amt) {
    let dmg = amt | 0;
    const u = game.u || {};
    // C: youmonst.data == &mons[PM_GREMLIN] — JS mons() is a new
    // object each call, so compare stored mndx (set_uasmon).
    const isGremlin = (game.youmonst?.data?.mndx | 0) === PM_GREMLIN
        || (u.umonnum | 0) === PM_GREMLIN;
    if (dmg && isGremlin) {
        dmg = rnd(dmg);
        if (dmg > 10) dmg = 10 + rnd(dmg - 10);
        if (dmg > 20) dmg = 20;
        await pline(
            `Ow, that light hurts${(dmg > 2 || (u.mh | 0) <= 5) ? '!' : '.'}`,
        );
        let ord = ordinary;
        if (obj.oclass === SCROLL_CLASS || obj.oclass === SPBOOK_CLASS) {
            ord = false; // say blasted rather than zapped
        }
        const how = obj.oclass === SPBOOK_CLASS
            ? 'spell of light'
            : !obj.oartifact
                ? ansimpleoname(obj)
                : bare_artifactname(obj);
        const buf = `${ord ? 'zapped' : 'blasted'} ${uhim()}self with ${how}`;
        // C: might rehumanize(); fatal only for Unchanging — losehp
        // poly-death still named (hack.c rehumanize deferred).
        losehp(maybe_half_phys(dmg), buf, NO_KILLER_PREFIX);
    }
    return dmg;
}

/**
 * C ref: zap.c flashburn :3059–3079 — light[ning] blinds the hero.
 * Caller always burns duration RNG (zapyourself WAN_LIGHTNING rnd(100)).
 * via_lightning skips arti shieldeff even if resists_blnd_by_arti.
 * @returns {Promise<boolean>} TRUE if an observable flash occurred
 */
export async function flashburn(duration, via_lightning) {
    if (!resists_blnd_you()) {
        await You('are blinded by the flash!');
        const { make_blinded } = await import('./do.js');
        await make_blinded(duration | 0, false);
        if (!Blind_props()) {
            await pline('Your vision clears.');
        }
        return true;
    }
    // C: !via_lightning && resists_blnd_by_arti → shieldeff (named)
    if (!via_lightning) {
        /* shieldeff deferred */
    }
    return false;
}

/**
 * C ref: zap.c spell_damage_bonus :3479–3502 — Int then level.
 * Punish Int<=9 before low level; never drop combined below 1
 * (leave 0). First caller: spell.c skilled fireball scatter (D-1378).
 * bhitm SPE_FORCE_BOLT is D-1388. zhitm / buzz still named.
 */
export function spell_damage_bonus(dmgIn) {
    let dmg = dmgIn | 0;
    const intell = acurr(A_INT);
    if (intell <= 9) {
        if (dmg > 1) dmg = dmg <= 3 ? 1 : dmg - 3;
    } else if (intell <= 13 || (game.u?.ulevel | 0) < 5) {
        /* no bonus or penalty */
    } else if (intell <= 18) {
        dmg += 1;
    } else if (intell <= 24 || (game.u?.ulevel | 0) < 14) {
        dmg += 2;
    } else {
        dmg += 3; /* Int 25 */
    }
    return dmg;
}

/**
 * C ref: zap.c zapyourself — self-directed wand/spell effects.
 * Branch envelope: SPE_HEALING / SPE_EXTRA_HEALING / WAN_SLEEP /
 * SPE_SLEEP / WAN_DEATH / SPE_FINGER_OF_DEATH / WAN_POLYMORPH /
 * SPE_POLYMORPH / WAN_STRIKING / WAN_CANCELLATION / WAN_TELEPORTATION /
 * WAN_UNDEAD_TURNING / WAN_LIGHT / EXPENSIVE_CAMERA / WAN_OPENING / SPE_KNOCK;
 * WAN_FIRE / FIRE_HORN / WAN_COLD / SPE_CONE_OF_COLD / FROST_HORN;
 * WAN_LIGHTNING + flashburn (D-1355);
 * WAN/SPE_MAGIC_MISSILE (D-1364; Antimagic uprops D-1367);
 * SPE_FIREBALL self-explode (D-1365; skilled scatter is spell.c D-1378);
 * lightdamage WAN_LIGHT/CAMERA (D-1366);
 * WAN_MAKE_INVISIBLE (D-1369);
 * WAN_SPEED_MONSTER speed_up (D-1410);
 * other otyps named in C-JS-MAP.
 * @param {boolean} ordinary wand zap (TRUE) vs broken/spell (FALSE)
 * @returns {number} damage (0 for healing/sleep/death/poly)
 * Caller dozap formats losehp with killer_xname + uhim (D-1345).
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
        // C zap.c zapyourself :2915–2918 — broken wand: d(spe,25)
        // then FALLTHROUGH into EXPENSIVE_CAMERA.
        damage = d(obj.spe | 0, 25);
        // FALLTHROUGH
    case EXPENSIVE_CAMERA:
        // C :2920–2928 — if !damage then 5; lightdamage; +rnd(25)
        // flashburn(FALSE); damage reset (explode/losehp not here).
        if (!damage) damage = 5;
        damage = await lightdamage(obj, ordinary, damage);
        damage += rnd(25);
        if (await flashburn(damage, false)) learn_it = true;
        damage = 0;
        break;

    case WAN_OPENING:
    case SPE_KNOCK: {
        if (game.u?.ustuck) {
            await release_hold();
            learn_it = true;
        }
        if (game.u?.uball) {
            // C: Punished ≡ uball
            learn_it = true;
            unpunish();
        }
        // invent is hit iff hero doesn't escape from a trap
        const hold = (game.u?.utrap | 0)
            ? await openholdingtrap(game.youmonst || { _youmonst: true })
            : { happened: false, noticed: false };
        if (hold.noticed) learn_it = true;
        if (!(game.u?.utrap | 0) || !hold.happened) {
            await boxlock_invent(obj);
            const fall = await openfallingtrap(
                game.youmonst || { _youmonst: true },
                true,
            );
            if (fall.noticed) learn_it = true;
        }
        break;
    }

    case SPE_FIREBALL:
        // C zap.c zapyourself :2748–2751 — You explode on self;
        // explode(ux, uy, 11 /* ZT_SPELL(ZT_FIRE) */, d(6,6),
        // WAND_CLASS, EXPL_FIERY). No learn_it; damage stays 0
        // (explode handles HP). WAN_FIRE/FIRE_HORN is the next
        // case (D-0974). Skilled scatter is spell.c D-1378.
        await You('explode a fireball on top of yourself!');
        await explode(
            game.u.ux,
            game.u.uy,
            ZT_SPELL_0 + ZT_FIRE,
            d(6, 6),
            WAND_CLASS,
            EXPL_FIERY,
        );
        break;

    case WAN_FIRE:
    case FIRE_HORN: {
        // C zap.c zapyourself — music fire horn self-blast (D-0974)
        learn_it = true;
        const orig_dmg = d(12, 6);
        if (Fire_resistance()) {
            // shieldeff / monstseesu / ugolemeffects deferred
            await You_feel('rather warm.');
        } else {
            await pline("You've set yourself afire!");
            damage = orig_dmg;
        }
        await burn_away_slime();
        await burnarmor(game.youmonst || { _youmonst: true });
        await destroy_items(game.youmonst || { _youmonst: true }, AD_FIRE, orig_dmg);
        await ignite_items(game.invent);
        break;
    }

    case WAN_COLD:
    case SPE_CONE_OF_COLD:
    case FROST_HORN: {
        learn_it = true;
        const orig_dmg = d(12, 6);
        if (Cold_resistance()) {
            await You_feel('a little chill.');
        } else {
            await pline('You imitate a popsicle!');
            damage = orig_dmg;
        }
        await destroy_items(game.youmonst || { _youmonst: true }, AD_COLD, orig_dmg);
        break;
    }

    case WAN_LIGHTNING: {
        // C zap.c zapyourself :2730–2746 — always learn; d(12,6);
        // !Shock → shock pline + damage + exercise(A_CON); else unharmed;
        // destroy_items AD_ELEC; flashburn(rnd(100), TRUE).
        learn_it = true;
        const orig_dmg = d(12, 6);
        if (!Shock_resistance()) {
            await You('shock yourself!');
            damage = orig_dmg;
            exercise(A_CON, false);
            // monstunseesu deferred
        } else {
            // shieldeff / monstseesu / ugolemeffects deferred
            await You('zap yourself, but seem unharmed.');
        }
        await destroy_items(
            game.youmonst || { _youmonst: true },
            AD_ELEC,
            orig_dmg,
        );
        await flashburn(rnd(100), true);
        break;
    }

    case WAN_MAGIC_MISSILE:
    case SPE_MAGIC_MISSILE:
        // C zap.c zapyourself :2790–2802 — always learn;
        // Antimagic (youprop.h uprops, D-1367) → pline_The bounce
        // (no d()); else d(4,6)+Idiot. shieldeff / monstseesu named.
        learn_it = true;
        if (Antimagic()) {
            await pline('The missiles bounce!');
        } else {
            damage = d(4, 6);
            await pline("Idiot!  You've shot yourself!");
        }
        break;

    case WAN_MAKE_INVISIBLE: {
        // C zap.c zapyourself :2825–2842 — snapshot msg before
        // changing HInvis; mummy wrapping absorbs (BInvis +
        // uarmc MUMMY_WRAPPING); else incr_itimeout rn1(15,31);
        // if msg: learn + newsym then self_invis_message.
        // bhitm / zap_updown / zap_steed still named.
        const u = game.u || {};
        const msg = !Invis() && !Blinded_for_invis() && !BInvis();
        const uarmc = u.uarmc;
        if (BInvis() && uarmc && (uarmc.otyp | 0) === MUMMY_WRAPPING) {
            await You_feel(`rather itchy under ${yname(uarmc)}.`);
            break;
        }
        incr_itimeout_HInvis(rn1(15, 31));
        if (msg) {
            learn_it = true;
            newsym(u.ux | 0, u.uy | 0);
            await self_invis_message();
        }
        break;
    }

    case WAN_SPEED_MONSTER:
        // C zap.c zapyourself :2845–2849 — no longer intrinsic;
        // speed_up(rn1(25, 50)) then always learn. Callee
        // potion.c speed_up :2918–2928 (D-1408). bhitm /
        // zap_steed / WAN_SLOW still named.
        await speed_up(rn1(25, 50));
        learn_it = true;
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
            if (await break_statue(obj)) {
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
 * C zap.c bhit :3983 + display.h glyph_is_monster / glyph_is_warning /
 * glyph_is_invisible on glyph_at (gbuf). JS has no integer glyph ids;
 * classify loc.disp_kind + remembered I + def_warnsyms.
 */
function bhit_xyglyph_known_monster(loc) {
    if (!loc) return false;
    if (loc.disp_kind === 'monster') return true;
    if (loc.disp_kind === 'invisible' || glyph_is_invisible(loc)) return true;
    if (loc.disp_kind === 'object' || loc.disp_kind === 'terrain'
        || loc.disp_kind === 'trap') {
        return false;
    }
    const ch = loc.disp_ch;
    if (ch == null) return false;
    for (let i = 0; i < def_warnsyms.length; i++) {
        if (def_warnsyms[i]?.ch === ch) return true;
    }
    return false;
}

/**
 * C ref: zap.c bhit — ZAPPED_WAND + KICKED_WEAPON + THROWN_TETHERED_WEAPON.
 * Branch envelope: kicked start+range--; WATERWALL/LAVAWALL stop;
 * hits_bars; mon stop; coin/ship_object; DISP_FLASH / DISP_TETHER tmp_at
 * + nh_delay_output; pool/lava/sink stop. THROWN_TETHERED remaps to
 * THROWN_WEAPON after opening TETHER and leaves the cord open for the
 * caller (`:3863–3866`, `:4023–4024`, `:4125–4127`; D-1323).
 * shade_miss thrown/kicked skip is D-1383 (`:3984–3986`).
 * M_AP_OBJECT skip is D-1392 (`:3986–3992`).
 * WEB stick is D-1393 (`:3926–3938`) — after m_at/t_at, before shade.
 * Named omit: THROWN_WEAPON fly callers (throwit still inlines those
 * and still skips WEB / shade / mimic-object); FLASHED_LIGHT DISP_BEAM /
 * INVIS_BEAM stop; show_transient_light; shkcatch pick;
 * map_invisible / unmap_object; zap_map / doorlock; skiprange rocks.
 * pobj is `{ obj }` — may set `.obj = null` when destroyed (kicked).
 */
async function bhit(ddx, ddy, range, weapon, fhitm, fhito, pobj) {
    let obj = pobj?.obj;
    const bhitpos = game._bhitpos || (game._bhitpos = { x: 0, y: 0 });
    game.bhitpos = bhitpos;
    let r = range | 0;
    let result = null;
    let point_blank = true;
    let tethered_weapon = false;
    let bhit_done = false;
    const was_returning = (game.iflags?.returning_missile === obj) ? obj : null;

    // C: kicked object starts one square ahead; range--
    if (weapon === KICKED_WEAPON) {
        bhitpos.x = (game.u?.ux | 0) + ddx;
        bhitpos.y = (game.u?.uy | 0) + ddy;
        r--;
    } else {
        bhitpos.x = game.u?.ux | 0;
        bhitpos.y = game.u?.uy | 0;
    }

    // C zap.c bhit :3861–3868 — FLASHED_LIGHT DISP_BEAM named; tethered
    // opens DISP_TETHER then weapon=THROWN_WEAPON so later ifs match.
    if (weapon === THROWN_TETHERED_WEAPON && obj) {
        tethered_weapon = true;
        weapon = THROWN_WEAPON;
        tmp_at(DISP_TETHER, obj_glyph(obj));
    } else if (weapon !== ZAPPED_WAND && weapon !== INVIS_BEAM && obj) {
        tmp_at(DISP_FLASH, obj_glyph(obj));
    }
    const do_flash = weapon !== ZAPPED_WAND && weapon !== INVIS_BEAM && !!obj;

    try {
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
            const typ = loc?.typ;

            // C: WATERWALL / LAVAWALL stop thrown/kicked items
            if ((weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
                && (IS_WATERWALL(typ) || typ === LAVAWALL)) {
                break;
            }
            // C: iron bars hits_bars for thrown/kicked (D-0990)
            if (weapon === THROWN_WEAPON || weapon === KICKED_WEAPON) {
                // show_transient_light deferred
                if (typ === IRONBARS) {
                    const { hits_bars } = await import('./mthrowu.js');
                    if (await hits_bars(
                        pobj, x - ddx, y - ddy, x, y,
                        point_blank ? 0 : !rn2(5), 1,
                    )) {
                        obj = pobj?.obj;
                        bhitpos.x -= ddx;
                        bhitpos.y -= ddy;
                        break;
                    }
                }
            }

            let mtmp = m_at(x, y);
            const ttmp = t_at(x, y);
            // C zap.c bhit :3926–3938 — empty WEB + thrown/kicked
            // !rn2(3) sticks (D-1393). Monster on the web skips this
            // (shade/M_AP_OBJECT come later). ZAPPED_WAND/FLASHED_LIGHT
            // do not roll. throwit THROWN_WEAPON fly still named.
            if (!mtmp && ttmp && (ttmp.ttyp | 0) === WEB
                && (weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
                && !rn2(3)) {
                if (cansee(x, y)) {
                    await pline(`${Yname2_destroy(obj)} gets stuck in a web!`);
                    ttmp.tseen = true;
                    newsym(x, y);
                }
                if (was_returning) game.iflags.returning_missile = null;
                break;
            }
            // C zap.c bhit :3983–3992 — glyph_at then thrown/kicked
            // shade_miss(TRUE,TRUE) (D-1383) OR (M_AP_OBJECT &&
            // !glyph_is_monster && !glyph_is_warning &&
            // !glyph_is_invisible); FLASHED_LIGHT skips M_AP_OBJECT
            // with no glyph gate (D-1392).
            const known_mon = bhit_xyglyph_known_monster(loc);
            if (mtmp
                && (((weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
                    && (await shade_miss(game.youmonst, mtmp, obj, true, true)
                        || (M_AP_TYPE(mtmp) === M_AP_OBJECT && !known_mon)))
                    || (weapon === FLASHED_LIGHT
                        && M_AP_TYPE(mtmp) === M_AP_OBJECT))) {
                mtmp = null;
            }

            if (mtmp) {
                if (weapon === ZAPPED_WAND) {
                    if (fhitm) await fhitm(mtmp, obj);
                    else await bhitm(mtmp, obj);
                    r -= 3;
                } else if (weapon !== FLASHED_LIGHT && weapon !== INVIS_BEAM) {
                    // THROWN_WEAPON / KICKED_WEAPON — stop on monster
                    // C :4023–4024 — tethered leaves DISP_TETHER open
                    if (!tethered_weapon) tmp_at(DISP_END, 0);
                    game.notonhead = ((x | 0) !== (mtmp.mx | 0)
                        || (y | 0) !== (mtmp.my | 0));
                    result = mtmp;
                    bhit_done = true;
                    break;
                }
            }

            if (fhito) {
                if (await bhitpile(obj, fhito, x, y, 0)) r--;
            } else if (weapon === KICKED_WEAPON) {
                // C: coin pile stop OR ship_object hole/stairs
                obj = pobj?.obj;
                if (!obj) break;
                const coinPile = (obj.oclass | 0) === COIN_CLASS
                    && !!objects_at(x, y);
                if (coinPile) break;
                const { ship_object } = await import('./dokick.js');
                if (await ship_object(obj, x, y, costly_spot(x, y))) {
                    break;
                }
            }

            if (weapon === ZAPPED_WAND && (IS_DOOR(typ) || typ === STONE)) {
                // doorlock deferred
            }
            if (!ZAP_POS(typ) || closed_door(x, y)) {
                bhitpos.x -= ddx;
                bhitpos.y -= ddy;
                break;
            }
            if (do_flash) {
                // map_invisible / unmap_object deferred
                tmp_at(x, y);
                await nh_delay_output();
                // C: kicked objects fall in pools/lava; sink stops physical
                if (weapon === KICKED_WEAPON
                    && (is_pool(x, y) || is_lava(x, y))) {
                    break;
                }
                if (IS_SINK(typ) && weapon !== FLASHED_LIGHT) break;
            } else if (weapon !== ZAPPED_WAND && weapon !== INVIS_BEAM) {
                if (weapon === KICKED_WEAPON
                    && (is_pool(x, y) || is_lava(x, y))) {
                    break;
                }
                if (IS_SINK(typ) && weapon !== FLASHED_LIGHT) break;
            }
            point_blank = false;
        }
    } finally {
        // C :4125–4127 — skip END when tethered unless returning_missile
        // was cleared mid-flight (WEB stick D-1393). Monster hit already
        // ENDed non-tethered via goto bhit_done. Gate on do_flash so a
        // ZAPPED_WAND / empty FLASHED_LIGHT does not close a leftover tmp.
        if (!bhit_done && do_flash) {
            const returning_cleared = !!(was_returning
                && was_returning !== game.iflags?.returning_missile);
            if (!tethered_weapon || returning_cleared) tmp_at(DISP_END, 0);
        }
    }
    return result;
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

export { zapsetup, bhito, bhit };

/**
 * C ref: zap.c weffects — exercise + effect dispatch.
 * NODIR + RAY wand ubuzz; IMMEDIATE bhit WAN_POLYMORPH /
 * SPE_FORCE_BOLT (D-1388); WAN_DIGGING/SPE_DIG → zap_dig;
 * RAY SPE_MAGIC_MISSILE..SPE_FINGER_OF_DEATH ubuzz (D-1386).
 * zap_updown / steed / doorlock deferred.
 */
export async function weffects(obj) {
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
        } else if (otyp >= SPE_MAGIC_MISSILE && otyp <= SPE_FINGER_OF_DEATH) {
            /* C zap.c :3461–3462 */
            await ubuzz(
                BZ_U_SPELL(BZ_OFS_SPE(otyp)),
                Math.trunc((game.u?.ulevel | 0) / 2) + 1,
            );
            disclose = true;
        } else if (otyp >= WAN_MAGIC_MISSILE && otyp <= WAN_LIGHTNING) {
            await ubuzz(
                BZ_U_WAND(BZ_OFS_WAN(otyp)),
                otyp === WAN_MAGIC_MISSILE ? 2 : 6,
            );
            disclose = true;
        }
        /* C impossible("weffects: unexpected spell or wand") named omit */
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
 * Self-zap losehp uses killer_xname + uhim (D-1345; C `:2661–2663`).
 * Named omit: throwit `:1747` / pickup / wield / invent / mthrowu /
 * do_wear remaining killer_xname; backfire body.
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
            // C zap.c:2661–2663 uhim() + killer_xname (D-1345; not xname)
            const buf = `zapped ${uhim()}self with ${killer_xname(obj)}`;
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
 * Terrain wish via readobjnam_wish → wizterrainwish traps (D-1289) +
 * door/wall (D-1290) + secret corridor (D-1304) + switch_terrain
 * (D-1279). Help / history / livelog still named.
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

    let otmp = await readobjnam_wish(buf, nothing);
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
