// zap.js — Zap command / wish helpers (partial).
// C ref: zap.c dozap, zappable, weffects, zapnodir, learnwand, makewish,
//        zapyourself, flashburn, lightdamage, ubreatheu, ubuzz, dobuzz, zhitm, destroy_items, resist,
//        bhit, bhito, bhitm, bhitpile, poly_obj, obj_unpolyable, obj_shudders,
//        probe_monster, probe_objchain,
//        cancel_item, cancel_monst, revive, revive_egg, unturn_dead,
//        unturn_you, drain_item, zap_map, maybe_explode_trap
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
// SPE_LIGHT NODIR wand-duplicate cast dispatch (D-1427);
// SPE_SLEEP RAY wand-duplicate weffects ubuzz (D-1440;
// C spell.c :1462 / zap.c :3461–3462);
// SPE_DIG RAY wand-duplicate weffects zap_dig (D-1441;
// C spell.c :1467 / zap.c :3459–3460);
// SPE_MAGIC_MISSILE RAY wand-duplicate weffects ubuzz (D-1448;
// C spell.c :1463 / zap.c :3461–3462);
// SPE_FINGER_OF_DEATH RAY wand-duplicate weffects ubuzz (D-1449;
// C spell.c :1472 / zap.c :3461–3462);
// SPE_TURN_UNDEAD IMMEDIATE wand-duplicate weffects bhit (D-1458;
// C spell.c :1468 / zap.c :3440–3451);
// SPE_POLYMORPH IMMEDIATE wand-duplicate weffects bhit (D-1459;
// C spell.c :1469 / zap.c :3440–3451);
// SPE_CANCELLATION IMMEDIATE wand-duplicate weffects bhit (D-1460;
// C spell.c :1471 / zap.c :3440–3451);
// SPE_STONE_TO_FLESH IMMEDIATE wand-duplicate weffects bhit (D-1461;
// C spell.c :1478 / zap.c :3440–3451);
// SPE_TELEPORT_AWAY IMMEDIATE wand-duplicate weffects bhit (D-1468;
// C spell.c :1470 / zap.c :3440–3451);
// SPE_HEALING/SPE_EXTRA_HEALING IMMEDIATE wand-duplicate weffects
// bhit (D-1469; C spell.c :1475–1514 / zap.c :3440–3451;
// bhitm :433–473 healmon);
// zapyourself WAN_MAKE_INVISIBLE (D-1369);
// zapyourself WAN_SPEED_MONSTER speed_up(rn1(25,50)) (D-1410);
// zapyourself WAN/SPE_SLOW_MONSTER u_slow_down (D-1433);
// zapyourself WAN_LOCKING/SPE_WIZARD_LOCK closeholdingtrap +
// boxlock_invent (D-1434);
// zapyourself WAN_PROBING probe_objchain + ustatusline (D-1435);
// zapyourself SPE_DRAIN_LIFE !Drain_resistance + losexp (D-1446);
// bhitm WAN_MAKE_INVISIBLE mon_set_minvis + knowninvisible (D-1414);
// knowninvisible See_invisible/Detect_monsters ≡ uprops (D-1423);
// bhitm WAN_SPEED_MONSTER mon_adjust_speed + check_gear_next_turn (D-1422);
// bhitm WAN_SLOW_MONSTER mon_adjust_speed(-1) + whirly expels (D-1424);
// bhitm WAN_LOCKING closeholdingtrap (D-1425);
// bhitm WAN_PROBING probe_monster + probe_objchain (D-1426);
// zap_steed WAN_PROBING probe_monster (D-1443);
// zap_steed WAN_TELEPORTATION / SPE_TELEPORT_AWAY tele() together (D-1455);
// zap_steed WAN_OPENING/SPE_KNOCK via bhitm (D-1463);
// zap_steed SPE_DRAIN_LIFE via bhitm (D-1464);
// zap_steed WAN_CANCELLATION/SPE_CANCELLATION via bhitm (D-1470);
// zap_steed WAN_POLYMORPH/SPE_POLYMORPH via bhitm (D-1471);
// zap_steed WAN_MAKE_INVISIBLE via bhitm (D-1473);
// zap_steed WAN_STRIKING/SPE_FORCE_BOLT via bhitm (D-1474);
// zap_steed WAN_SLOW_MONSTER/SPE_SLOW_MONSTER via bhitm (D-1478);
// zap_steed WAN_SPEED_MONSTER via bhitm (D-1479);
// zap_steed SPE_CURE_SICKNESS via bhitm (D-1480);
// zap_updown WAN_PROBING bhitpile+zap_map+display_binventory (D-1444);
// zap_updown WAN_OPENING/SPE_KNOCK portcullis/quest/traps (D-1454);
// bhit doorlock WAN_OPENING/SPE_KNOCK SDOOR appear + locked unlock (D-1462);
// bhit doorlock WAN_LOCKING/SPE_WIZARD_LOCK Rogue hide / obstructed /
// trap-in-doorway / lock-shut (D-1475);
// bhit doorlock WAN_STRIKING/SPE_FORCE_BOLT SDOOR appear + smash /
// trapped explode + shop D_BROKEN (D-1482);
// zap_updown WAN_STRIKING/SPE_FORCE_BOLT destroy db / rock / trapdoor (D-1456);
// zap_updown WAN_LOCKING/SPE_WIZARD_LOCK close db / hole→trapdoor (D-1465);
// zap_updown SPE_STONE_TO_FLESH blood / nothing_happens then epilogue (D-1466);
// zap_updown default break into down bhitpile+zap_map (D-1485);
// zap_map lateral drawbridge + bhit ZAPPED_WAND zap_map (D-1489);
// bhito WAN_PROBING observe + display_cinventory / tin / egg (D-1445);
// bhito SPE_DRAIN_LIFE drain_item (D-1453);
// bhitm SPE_DRAIN_LIFE monhp_per_lvl + resist + m_lev (D-1436);
// bhitm SPE_HEALING/SPE_EXTRA_HEALING healmon + skilled/extra
// mcureblindness (D-1469);
// dozap cursed backfire explode + d(spe+2,6) + useupall (D-1416);
// dozap self-zap losehp killer_xname + uhim (D-1345);
// getobj `?`/`*` → display_pickinv_reply; RAY weffects → ubuzz/dobuzz
// for WAN_MAGIC_MISSILE..WAN_LIGHTNING (zhitm damage types + bounce +
// Reflecting); IMMEDIATE weffects → bhit(rn1(8,6)) + bhito WAN_POLYMORPH
// / cancel / striking boulder+statue+hero_breaks / tele pile + bhitm
// strike/cancel/poly/tele/undead(+unturn_dead); RAY WAN_DIGGING/SPE_DIG
// → zap_dig (dig.c); RAY SPE_MAGIC_MISSILE..SPE_FINGER_OF_DEATH weffects
// → ubuzz BZ_U_SPELL (D-1386); SPE_FORCE_BOLT IMMEDIATE weffects/bhit
// + bhitm spell_damage_bonus (D-1388; Knight questart dbldam named).
// zap_map lateral drawbridge + bhit ZAPPED_WAND zap_map (D-1489);
// Named omissions: zap_map uswallow pile;
// force_decor ice/furniture; draft_message
// Rogue SDOOR; Invocation_lev vibrating-square "the";
// bhito opening chain / uchain unpunish is D-1481;
// bhito poly-arm boxlock reset_pick is D-1483;
// bhit doorlock WAN_STRIKING/SPE_FORCE_BOLT is D-1482;
// muse.c mbhit doorlock is D-1484;
// (zapyourself WAN_SPEED is D-1410; zapyourself WAN_SLOW is D-1433;
// zapyourself WAN_LOCKING is D-1434; zapyourself WAN_PROBING is D-1435;
// zapyourself SPE_DRAIN_LIFE is D-1446;
// zap_steed WAN_PROBING is D-1443; zap_steed WAN_TELEPORTATION is D-1455;
// zap_steed WAN_OPENING/SPE_KNOCK bhitm is D-1463;
// zap_steed SPE_DRAIN_LIFE bhitm is D-1464;
// zap_steed SPE_HEALING/SPE_EXTRA_HEALING bhitm is D-1469;
// zap_updown WAN_PROBING is D-1444;
// zap_updown WAN_OPENING/SPE_KNOCK is D-1454;
// zap_updown WAN_STRIKING/SPE_FORCE_BOLT is D-1456;
// zap_updown WAN_LOCKING/SPE_WIZARD_LOCK is D-1465;
// zap_updown SPE_STONE_TO_FLESH is D-1466;
// zap_updown default down POLY/cancel/invis/tele bhitpile+zap_map is D-1485;
// bhito WAN_PROBING is D-1445; bhito SPE_DRAIN_LIFE is D-1453;
// bhito WAN_OPENING/WAN_LOCKING/SPE_KNOCK/SPE_WIZARD_LOCK boxlock
// is D-1467; bhito uchain unpunish WAN_OPENING/SPE_KNOCK is D-1481;
// bhito poly-arm Is_box boxlock reset_pick is D-1483;
// zap_steed SPE_CURE_SICKNESS bhitm is D-1480;
// zap_steed WAN_SPEED_MONSTER bhitm is D-1479;
// zap_steed WAN_SLOW_MONSTER/SPE_SLOW_MONSTER bhitm is D-1478;
// zap_steed WAN_CANCELLATION/SPE_CANCELLATION bhitm is D-1470;
// zap_steed WAN_POLYMORPH/SPE_POLYMORPH bhitm is D-1471;
// zap_steed WAN_MAKE_INVISIBLE bhitm is D-1473;
// zap_steed WAN_STRIKING/SPE_FORCE_BOLT bhitm is D-1474;
// bhitm WAN_SPEED is D-1422; bhitm WAN_SLOW is D-1424;
// bhitm WAN_MAKE_INVISIBLE is D-1414; bhitm WAN_LOCKING is D-1425;
// bhitm WAN_PROBING is D-1426; bhitm SPE_DRAIN_LIFE is D-1436);
// zap_map engraving/cancel trap is D-1476;
// zap_map non-probing lateral drawbridge; force_decor;
// zap_map from lateral bhit; mon_reflects;
// Hallucination hdmgtype rn2; map_invisible/unmap during buzz;
// SPE_LIGHT NODIR wand-duplicate cast dispatch is D-1427
// (zapnodir SPE_LIGHT already D-1366); SPE_SLEEP RAY
// wand-duplicate weffects is D-1440; SPE_DIG RAY
// wand-duplicate weffects/zap_dig is D-1441; SPE_MAGIC_MISSILE
// RAY wand-duplicate weffects is D-1448; SPE_FINGER_OF_DEATH
// RAY wand-duplicate weffects is D-1449; SPE_KNOCK IMMEDIATE
// wand-duplicate weffects is D-1450; SPE_SLOW_MONSTER
// IMMEDIATE wand-duplicate weffects is D-1451; SPE_WIZARD_LOCK
// IMMEDIATE wand-duplicate weffects is D-1452; SPE_TURN_UNDEAD
// IMMEDIATE wand-duplicate weffects is D-1458; SPE_POLYMORPH
// IMMEDIATE wand-duplicate weffects is D-1459; SPE_CANCELLATION
// IMMEDIATE wand-duplicate weffects is D-1460; SPE_STONE_TO_FLESH
// IMMEDIATE wand-duplicate weffects is D-1461; SPE_TELEPORT_AWAY
// IMMEDIATE wand-duplicate weffects is D-1468; SPE_HEALING/
// SPE_EXTRA_HEALING IMMEDIATE wand-duplicate weffects is D-1469;
// potion peffect_enlightenment is D-1413;
// dozap spe<0 dust useupall (backfire is D-1416);
// wrest pline; check_capacity;
// check_unpaid; update_inventory; shieldeff/monstunseesu; setworn
// EReflecting bits (W_WEP artifact D-1342); ureflects W_AMUL/W_ARM/dragon
// D-1353 (shared muse.c clone); mcastu ureflects named; create_polymon after poly_zapped;
// do_osshock shop bill; invent poly_obj worn remap is D-1510;
// poly-arm boxlock reset_pick is D-1483; polypiles/livelog named;
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
// closeholdingtrap bhitm WAN_LOCKING (D-1425);
// zapyourself WAN_LOCKING boxlock_invent (D-1434);
// zapyourself WAN_PROBING probe_objchain + ustatusline (D-1435);
// zapyourself SPE_DRAIN_LIFE !Drain_resistance + losexp (D-1446);
// probe_monster bhitm WAN_PROBING (D-1426);
// zap_steed WAN_PROBING probe_monster (D-1443);
// zap_steed WAN_TELEPORTATION / SPE_TELEPORT_AWAY tele() together (D-1455);
// zap_steed WAN_OPENING/SPE_KNOCK via bhitm (D-1463);
// zap_steed SPE_DRAIN_LIFE via bhitm (D-1464);
// zap_steed WAN_CANCELLATION/SPE_CANCELLATION via bhitm (D-1470);
// zap_steed WAN_POLYMORPH/SPE_POLYMORPH via bhitm (D-1471);
// zap_steed WAN_MAKE_INVISIBLE via bhitm (D-1473);
// zap_steed WAN_STRIKING/SPE_FORCE_BOLT via bhitm (D-1474);
// zap_steed WAN_SLOW_MONSTER/SPE_SLOW_MONSTER via bhitm (D-1478);
// zap_steed WAN_SPEED_MONSTER via bhitm (D-1479);
// zap_steed SPE_CURE_SICKNESS via bhitm (D-1480);
// montraits/omonst/ghost recorporealize (D-0982);
// trap_ice_effects; Underwater/utrap lava arms.
// spell.c skilled SPE_FIREBALL scatter is D-1378 (this callee
// spell_damage_bonus); unskilled FIREBALL/CONE FALLTHROUGH weffects
// is D-1386 (this callee SPE ubuzz). SPE_FORCE_BOLT IMMEDIATE bhit
// + bhitm spell_damage_bonus is D-1388. zhitm spell_damage_bonus named.
// muse MUSE_CAMERA is D-1376; Sunsword invoke_blinding_ray is D-1377.
// bhit WEB stick D-1393; throwit fly / skiprange named.
// bhitm WAN_MAKE_INVISIBLE is D-1414; conferral See_invisible
// uprops in knowninvisible is D-1423; zap_steed WAN_PROBING is
// D-1443; zap_steed WAN_TELEPORTATION is D-1455; zap_steed
// WAN_OPENING/SPE_KNOCK bhitm is D-1463; zap_steed
// SPE_DRAIN_LIFE bhitm is D-1464; zap_steed
// WAN_CANCELLATION/SPE_CANCELLATION bhitm is D-1470;
// zap_steed WAN_POLYMORPH/SPE_POLYMORPH bhitm is D-1471;
// zap_steed WAN_MAKE_INVISIBLE bhitm is D-1473;
// zap_steed WAN_STRIKING/SPE_FORCE_BOLT bhitm is D-1474;
// zap_steed WAN_SLOW_MONSTER/SPE_SLOW_MONSTER bhitm is D-1478;
// zap_steed WAN_SPEED_MONSTER bhitm is D-1479;
// zap_steed SPE_CURE_SICKNESS bhitm is D-1480;
// zap_map WAN_MAKE_INVISIBLE engraving is D-1476; setworn
// w_blocks still named.
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
    flush_screen, flush_topl_more, pline, pline_dir, pline_mon, Norep, You_feel, newsym,
    tmp_at, zapdir_to_glyph, nh_delay_output, canseemon, canspotmon, shieldeff,
    obj_glyph, glyph_is_invisible, map_invisible, bot, set_msg_xy,
} from './display.js';
import { cansee, couldsee } from './vision.js';
import { nhgetch } from './input.js';
import { readobjnam_wish, HANDS_OBJ, NOTHING_OBJ } from './readobjnam.js';
import {
    hold_another_object, makeknown, encumber_msg, enlightenment, freeinv_core,
    observe_object, display_minventory, display_binventory, display_cinventory,
    update_inventory, set_cknown_lknown, getobj,
} from './invent.js';
import { mstatusline, ustatusline } from './insight.js';
import { setnotworn } from './do.js';
import { doname, xname, yname, distant_name, vtense, The, the, an, An, killer_xname, ansimpleoname, otyp_is_charged, makeplural } from './objnam.js';
import { uhim } from './roles.js';
import { fix_wall_spines } from './mklev.js';
import {
    A_WIS, A_STR, A_CON, A_DEX, A_INT, A_CHA, exercise, acurr, adjalign,
} from './attrib.js';
import { findit, cvt_sdoor_to_door, show_map_spot } from './detect.js';
import {
    confdir, fall_asleep, losehp, maybe_half_phys, nomul, is_pool,
    is_lava, is_moat, waterbody_name, in_rooms, dissolve_bars, stop_occupation,
    SURFACE_AT,
} from './hack.js';
import {
    nonliving, is_demon, nohands, MR_FIRE, MR_COLD, MR_DISINT, MR_ELEC,
    MR_POISON, MR_ACID, is_undead, is_were, is_vampshifter, monsterNames, mons,
    G_UNIQ, G_NOCORPSE, is_rider, is_swimmer, mindless, MZ_MEDIUM, is_whirly,
    hides_under, is_golem, vegetarian, carnivorous, NUMMONS,
} from './monsters.js';
import { m_at, wakeup, seemimic, dead_species, normal_shape, replmon, find_mid, mongone, restore_cham, m_respond, hideunder, healmon, can_be_hatched } from './mon.js';
import { find_mac, monkilled, shade_miss } from './mhitm.js';
import { update_mapseen_for } from './dungeon.js';
import {
    find_drawbridge, open_drawbridge, close_drawbridge, is_db_wall,
    is_drawbridge_wall, destroy_drawbridge,
} from './dbridge.js';
import { ok_to_quest } from './quest.js';
import { more_experienced, losexp, newexplevel } from './exper.js';
import { obj_resists } from './dogmove.js';
import { zap_dig, fracture_rock, break_statue, bury_objs, unearth_objs } from './dig.js';
import {
    killed, xkilled, flash_hits_mon, m_is_steadfast, that_is_a_mimic,
} from './uhitm.js';
import { mon_nam, Monnam, noit_Monnam, christen_monst, hliquid, Hallucination, rndmonnam } from './do_name.js';
import { finish_losehp_done } from './end.js';
import {
    burnarmor, t_at, maketrap, delfloortrap, dotrap, mintrap, deltrap,
    NO_TRAP_FLAGS, ignite_items, openholdingtrap, closeholdingtrap,
    openfallingtrap, self_invis_message, trapname, animate_statue,
} from './trap.js';
import { potionbreathe, make_stunned, speed_up } from './potion.js';
import { useup, carried, fix_petrification } from './eat.js';
import { burn_away_slime, get_obj_location } from './timeout.js';
import { show_transient_light, transient_light_cleanup } from './light.js';
import { create_gas_cloud } from './region.js';
import { recalc_block_point } from './vision.js';
import { picking_at, reset_pick, boxlock, boxlock_invent, doorlock } from './lock.js';
import { monflee, sticks } from './monmove.js';
import { digests, set_ustuck, unstuck, expels, ureflects, u_slow_down } from './mhitu.js';
import { newcham, makemon, create_critters, monhp_per_lvl, neweshk, add_to_minv, set_mimic_sym, newmcorpsenm } from './makemon.js';
import { tele, u_teleport_mon, rloco, enexto } from './teleport.js';
import { find_ac } from './u_init.js';
import { rehumanize, polymon, body_part } from './polyself.js';
import { costly_alteration, stolen_value, costly_spot, shop_keeper, hot_pursuit } from './shk.js';
import { dryup } from './fountain.js';
import { explode } from './explode.js';
import { unpunish, litroom } from './read.js';
import { engr_at, del_engr, make_engr_at, wipe_engr_at, random_engraving, rloc_engr } from './engrave.js';
import { bare_artifactname, defends, defends_when_carried, is_art } from './artifact.js';
import { ART_GRIMTOOTH } from './generated/artifacts_data.js';
import { Ring_gone, Ring_off, Ring_on, setworn, set_wear } from './do_wear.js';
import { which_armor, mon_set_minvis, check_gear_next_turn, wearslot, wearmask_to_obj } from './worn.js';
import { mhurtle, hero_breaks, breaks } from './dothrow.js';
import { abuse_dog, wary_dog, tamedog } from './dog.js';
import { setuwep, setuswapwep, setuqwep, set_twoweap } from './wield.js';
import { remove_worn_item } from './steal.js';
import {
    mkobj, mksobj, delobj, objects_at, replace_object, rnd_class, weight, splitobj,
    oc_merge_of, uncurse, attach_egg_hatch_timeout, obj_extract_self,
    eaten_stat, start_timer, spot_stop_timers, spot_time_left, obj_stop_timers,
    obj_ice_effects, place_object, stackobj, mergable, set_corpsenm, kill_egg,
    get_mtraits, free_omonst, free_omid, is_metallic, is_crackable,
    mksobj_at, is_flammable, is_rottable, is_rustprone, is_corrodeable,
    erosion_matters, is_damageable, fixup_oil,
} from './mkobj.js';
import {
    WAND_CLASS, SPBOOK_CLASS, WEAPON_CLASS, ARMOR_CLASS, POTION_CLASS,
    TOOL_CLASS, GEM_CLASS, SCROLL_CLASS, RING_CLASS, FOOD_CLASS, COIN_CLASS,
    ROCK_CLASS, NODIR, IMMEDIATE, objectNames,
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
    SHOP_BARS_COST, W_NONDIGGABLE, COST_CANCEL, COST_DRAIN, COST_UNCURS, COST_UNBLSS,
    TIMEOUT, XKILL_GIVEMSG, XKILL_NOCORPSE, Upolyd, INVIS,
    engulfing_u, Is_container, Is_box,
    MINV_ALL, MINV_NOLET, PICK_NONE,
    SEE_INVIS, DETECT_MONSTERS,
    TELEPAT, INTRINSIC, FAST, BOLT_LIM,
    LEFT_RING, RIGHT_RING,
    M_AP_TYPE, M_AP_NOTHING, M_AP_MONSTER, M_AP_OBJECT, M_AP_FURNITURE,
    NON_PM, ismnum,
    MIM_REVEAL, MIM_OMIT_WAIT, ANIMATE_SPELL,
    def_warnsyms,
    W_RING, W_ARMG, W_ARMH, W_ARMOR, W_SADDLE, W_ART, W_ARTI,
    W_WEP, W_SWAPWEP, W_QUIVER, W_WEAPONS,
    REFLECTING, ANTIMAGIC, SHOCK_RES, DRAIN_RES, TELEPORT_CONTROL, STUNNED,
    NO_MINVENT, MM_NOWAIT, MM_NOMSG, MM_NOCOUNTBIRTH, MM_MALE, MM_FEMALE,
    IS_POOL, CONTAINED_TOO, BURIED_TOO, ROOM, CORR, GRAVE,
    CORPSTAT_GENDER, CORPSTAT_MALE, CORPSTAT_FEMALE, MFAST,
    OMONST, has_oname, ONAME, has_omonst, has_omid, OMID, ESHK,
    WEB, PIT, HOLE, TRAPDOOR, HEAD, FACE, FOOT, ENGRAVE, IS_FOUNTAIN, IS_WATERWALL, IS_WALL, HWALL, VWALL,
    TIMER_LEVEL, MELT_ICE_AWAY, EXPL_FIERY, EXPL_MAGICAL, COLNO, ROWNO,
    xytodir,
    IS_ALTAR, Is_earthlevel, IS_AIR, CLOUD, IS_SINK,
    MM_NOTAIL, MM_ADJACENTOK, NATTK,
    MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS,
    P_SHURIKEN, P_BOW,
    IS_FURNITURE, IS_GRAVE, SCORR, VAULT, TEMPLE, In_quest, Is_firelevel,
    VIBRATING_SQUARE, MAGIC_PORTAL, HEADSTONE, TRAP_EXPLODE, is_magical_trap,
    GETOBJ_EXCLUDE, GETOBJ_SUGGEST, GETOBJ_NOFLAGS,
    has_mcorpsenm,
} from './const.js';

const MZ_HUMAN = MZ_MEDIUM;
const SPE_HEALING = objectNames.indexOf('SPE_HEALING');
const SPE_EXTRA_HEALING = objectNames.indexOf('SPE_EXTRA_HEALING');
const SPE_CURE_SICKNESS = objectNames.indexOf('SPE_CURE_SICKNESS');
const WAN_MAGIC_MISSILE = objectNames.indexOf('WAN_MAGIC_MISSILE');
const SPE_MAGIC_MISSILE = objectNames.indexOf('SPE_MAGIC_MISSILE');
const WAN_SLEEP = objectNames.indexOf('WAN_SLEEP');
const WAN_LIGHT = objectNames.indexOf('WAN_LIGHT');
const SPE_LIGHT = objectNames.indexOf('SPE_LIGHT');
const EXPENSIVE_CAMERA = objectNames.indexOf('EXPENSIVE_CAMERA');
const WAN_LIGHTNING = objectNames.indexOf('WAN_LIGHTNING');
const WAN_MAKE_INVISIBLE = objectNames.indexOf('WAN_MAKE_INVISIBLE');
const WAN_SPEED_MONSTER = objectNames.indexOf('WAN_SPEED_MONSTER');
const WAN_SLOW_MONSTER = objectNames.indexOf('WAN_SLOW_MONSTER');
const SPE_SLOW_MONSTER = objectNames.indexOf('SPE_SLOW_MONSTER');
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
const SPE_DRAIN_LIFE = objectNames.indexOf('SPE_DRAIN_LIFE');
const WAN_CANCELLATION = objectNames.indexOf('WAN_CANCELLATION');
const SPE_CANCELLATION = objectNames.indexOf('SPE_CANCELLATION');
const SPE_STONE_TO_FLESH = objectNames.indexOf('SPE_STONE_TO_FLESH');
const WAN_TELEPORTATION = objectNames.indexOf('WAN_TELEPORTATION');
const SPE_TELEPORT_AWAY = objectNames.indexOf('SPE_TELEPORT_AWAY');
const WAN_UNDEAD_TURNING = objectNames.indexOf('WAN_UNDEAD_TURNING');
const SPE_TURN_UNDEAD = objectNames.indexOf('SPE_TURN_UNDEAD');
const WAN_OPENING = objectNames.indexOf('WAN_OPENING');
const SPE_KNOCK = objectNames.indexOf('SPE_KNOCK');
const WAN_LOCKING = objectNames.indexOf('WAN_LOCKING');
const SPE_WIZARD_LOCK = objectNames.indexOf('SPE_WIZARD_LOCK');
const WAN_PROBING = objectNames.indexOf('WAN_PROBING');
const CHEST = objectNames.indexOf('CHEST');
const LARGE_BOX = objectNames.indexOf('LARGE_BOX');
// C defsym.h S_vodoor..S_hcdoor — is_cmap_door (sym.h)
const S_VODOOR = 13;
const S_HCDOOR = 16;
const WAN_FIRE = objectNames.indexOf('WAN_FIRE');
const WAN_COLD = objectNames.indexOf('WAN_COLD');
const SPE_CONE_OF_COLD = objectNames.indexOf('SPE_CONE_OF_COLD');
const FIRE_HORN = objectNames.indexOf('FIRE_HORN');
const FROST_HORN = objectNames.indexOf('FROST_HORN');
const ROCK = objectNames.indexOf('ROCK');
const BOULDER = objectNames.indexOf('BOULDER');
/** C objclass.h ARM_HELM — oc_armcat; JS oc_skill stand-in. */
const ARM_HELM = 2;
const STATUE = objectNames.indexOf('STATUE');
const TIN = objectNames.indexOf('TIN');
const SCR_BLANK_PAPER = objectNames.indexOf('SCR_BLANK_PAPER');
const SPE_BLANK_PAPER = objectNames.indexOf('SPE_BLANK_PAPER');
const SPE_NOVEL = objectNames.indexOf('SPE_NOVEL');
const POT_WATER = objectNames.indexOf('POT_WATER');
const POT_ACID = objectNames.indexOf('POT_ACID');
const POT_SICKNESS = objectNames.indexOf('POT_SICKNESS');
const POT_SEE_INVISIBLE = objectNames.indexOf('POT_SEE_INVISIBLE');
const POT_FRUIT_JUICE = objectNames.indexOf('POT_FRUIT_JUICE');
const MAGIC_LAMP = objectNames.indexOf('MAGIC_LAMP');
const OIL_LAMP = objectNames.indexOf('OIL_LAMP');
const MAGIC_MARKER = objectNames.indexOf('MAGIC_MARKER');
const UNICORN_HORN = objectNames.indexOf('UNICORN_HORN');
const LOW_BOOTS = objectNames.indexOf('LOW_BOOTS');
const POT_GAIN_ABILITY = objectNames.indexOf('POT_GAIN_ABILITY');
const CRYSTAL_BALL = objectNames.indexOf('CRYSTAL_BALL');
const CANDELABRUM_OF_INVOCATION = objectNames.indexOf('CANDELABRUM_OF_INVOCATION');
const CORPSE = objectNames.indexOf('CORPSE');
const FIGURINE = objectNames.indexOf('FIGURINE');
const MEATBALL = objectNames.indexOf('MEATBALL');
const MEAT_RING = objectNames.indexOf('MEAT_RING');
const MEAT_STICK = objectNames.indexOf('MEAT_STICK');
const ENORMOUS_MEATBALL = objectNames.indexOf('ENORMOUS_MEATBALL');
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
const PM_HEALER = monsterNames.indexOf('PM_HEALER');
const PM_MONK = monsterNames.indexOf('PM_MONK');
const PM_STONE_GOLEM = monsterNames.indexOf('PM_STONE_GOLEM');
const PM_FLESH_GOLEM = monsterNames.indexOf('PM_FLESH_GOLEM');
const PM_CROCODILE = monsterNames.indexOf('PM_CROCODILE');
const PM_DEATH = monsterNames.indexOf('PM_DEATH');
const PM_PESTILENCE = monsterNames.indexOf('PM_PESTILENCE');
const PM_GREMLIN = monsterNames.indexOf('PM_GREMLIN');
const NC_VIA_WAND_OR_SPELL = 0x02;
const NC_SHOW_MSG = 0x01;
/* C materials.h GEMSTONE=20 MINERAL=21 — stone_to_flesh_obj. */
const MAT_GEMSTONE = 20;
const MAT_MINERAL = 21;
/* C defsym.h PCHAR — stone_furniture_type mimic mappearance. */
const S_VWALL = 1;
const S_TRWALL = 11;
const S_UPSTAIR = 25;
const S_DNSTAIR = 26;
const S_BRUPSTAIR = 29;
const S_BRDNSTAIR = 30;
const S_ALTAR = 33;
const S_THRONE = 35;
const S_SINK = 36;

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
const AD_DRLI = 15;
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

/**
 * C youprop.h Drain_resistance — HDrain_resistance || EDrain_resistance
 * ≡ uprops[DRAIN_RES].intrinsic || uprops[DRAIN_RES].extrinsic.
 * confer_oc_oprop writes DRAIN_RES only to uprops (EDrain_resistance
 * unmirrored except black DSM `set_extrinsic_bit`). Keep H/E/sticky
 * flats. Caller: zapyourself SPE_DRAIN_LIFE (D-1446). Not
 * resists_drli (that is losexp / bhitm D-1436).
 */
function Drain_resistance() {
    const u = game.u || {};
    const e = u.uprops?.[DRAIN_RES];
    return !!((u.Drain_resistance || u.HDrain_resistance || u.EDrain_resistance)
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/**
 * C youprop.h Teleport_control — HTeleport_control || ETeleport_control
 * ≡ uprops[TELEPORT_CONTROL].intrinsic || extrinsic.
 * confer_oc_oprop writes TELEPORT_CONTROL only to uprops (E unmirrored).
 * Keep H/E/sticky flats for poly/eat. Callers: zap_steed /
 * zapyourself WAN_TELEPORTATION (D-1455; same C criteria).
 */
function Teleport_control() {
    const u = game.u || {};
    const e = u.uprops?.[TELEPORT_CONTROL];
    return !!((u.Teleport_control || u.HTeleport_control || u.ETeleport_control)
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/**
 * C youprop.h Stunned — HStun ≡ uprops[STUNNED].intrinsic (not EStun).
 * Sticky u.Stunned kept for JS gates. Caller: zap_steed /
 * zapyourself WAN_TELEPORTATION learnwand (D-1455).
 */
function Stunned() {
    const u = game.u || {};
    const e = u.uprops?.[STUNNED];
    return !!((u.HStun | 0) || u.Stunned || (e?.intrinsic | 0));
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

/**
 * C youprop.h:103 Blind — (HBlinded || EBlinded) && !BBlinded.
 * D-0716 uroleplay.blind (same as apply.js). Not sticky u.Blind||u.ublind
 * (D-1604; review **558** zap bhit show_transient_light).
 */
function Blind() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/** C obj.h is_helmet — ARMOR + oc_armcat ARM_HELM (JS oc_skill stand-in). */
function is_helmet_zap(obj) {
    return !!obj && obj.oclass === ARMOR_CLASS
        && (game.objects?.[obj.otyp]?.oc_skill ?? -1) === ARM_HELM;
}

/**
 * C do_wear.c hard_helmet :567–573 — metallic or glass helm.
 * Caller: zap_updown WAN_STRIKING/SPE_FORCE_BOLT falling rock (D-1456).
 */
function hard_helmet(obj) {
    if (!obj || !is_helmet_zap(obj)) return false;
    return is_metallic(obj) || is_crackable(obj);
}

/**
 * C youprop.h:103 Blind for zapyourself WAN_MAKE_INVISIBLE msg.
 * Same helper as bhit show_transient_light (D-1604).
 */
function Blinded_for_invis() {
    return Blind();
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

/**
 * C display.h _knowninvisible — minvis and (See_invisible or
 * Detect_monsters at the cell, or !Blind timeout-telepathy
 * within BOLT_LIM²). Sole caller: zap.c bhitm WAN_MAKE_INVISIBLE
 * (D-1414). C youprop.h See_invisible / Detect_monsters are
 * H||E ≡ uprops[SEE_INVIS] / DETECT_MONSTERS (D-1423). JS
 * confer_oc_oprop writes ring-of-see-invisible to extrinsic
 * only (no ESee_invisible mirror); timeout.js See_invisible()
 * already ORs those uprops — this helper must too.
 */
function knowninvisible(mon) {
    if (!mon?.minvis) return false;
    const u = game.u || {};
    const pSee = u.uprops?.[SEE_INVIS];
    const pDet = u.uprops?.[DETECT_MONSTERS];
    // C youprop.h:152 See_invisible (HSee_invisible || ESee_invisible)
    const See_invisible = !!((u.HSee_invisible | 0)
        || (u.ESee_invisible | 0) || u.See_invisible
        || (pSee?.intrinsic | 0) || (pSee?.extrinsic | 0));
    // C youprop.h:190 Detect_monsters (HDetect_monsters || EDetect_monsters)
    const Detect_monsters = !!(u.Detect_monsters
        || (u.HDetect_monsters | 0) || (u.EDetect_monsters | 0)
        || (pDet?.intrinsic | 0) || (pDet?.extrinsic | 0));
    if (cansee(mon.mx | 0, mon.my | 0)
        && (See_invisible || Detect_monsters)) {
        return true;
    }
    const HTelepat = (u.HTelepat | 0)
        || (u.uprops?.[TELEPAT]?.intrinsic | 0);
    const dx = (mon.mx | 0) - (u.ux | 0);
    const dy = (mon.my | 0) - (u.uy | 0);
    return !Blinded_for_invis()
        && !!(HTelepat & ~INTRINSIC)
        && (dx * dx + dy * dy) <= (BOLT_LIM * BOLT_LIM);
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

/** C ref: pline.c Your — prefix "Your ". */
async function Your(rest) {
    await pline(`Your ${rest}`);
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
 * chargeit callee. Full wand/tool/blessed path is D-1502 in read.js.
 */
async function recharge_elec_ring(obj) {
    const { recharge } = await import('./read.js');
    await recharge(obj, 0);
}

/**
 * C ref: zap.c maybe_destroy_item — AD_COLD potions + AD_FIRE potion/scroll/
 * spbook + AD_ELEC ring/wand (D-1368). Shock_resistance via
 * uprops[SHOCK_RES] (D-1371). Named omissions:
 * inventory_resistance_check; Book-of-Dead glow; mult forms beyond 1-of-1.
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
export async function resist(mtmp, oclass, damage, tell) {
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

/** C ref: zap.c zap_ok — wands SUGGEST; else EXCLUDE (incl. hands). */
function zap_ok(obj) {
    if (obj && obj.oclass === WAND_CLASS) return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
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
 */
async function getobj_zap() {
    return getobj('zap', zap_ok, GETOBJ_NOFLAGS);
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

/**
 * C dungeon.c ceiling :1714–1747 — vault/temple/shop in_rooms then
 * water/air/fire/quest/Underwater/room. Caller: zap_updown WAN_PROBING up.
 */
function ceiling_updown(x, y) {
    const loc = game.level?.at?.(x, y);
    const typ = loc?.typ ?? 0;
    const uz = game.u?.uz;
    if (in_rooms(x, y, VAULT)) return "vault's ceiling";
    if (in_rooms(x, y, TEMPLE)) return "temple's ceiling";
    if (in_rooms(x, y, SHOPBASE)) return "shop's ceiling";
    if (Is_waterlevel(uz)) return 'water above';
    if (IS_AIR(typ)) return 'sky';
    if (Is_firelevel(uz)) return 'flames above';
    if (In_quest(uz)) return 'expanse above';
    if (game.u?.Underwater) return "water's surface";
    if ((IS_ROOM(typ) && !Is_earthlevel(uz))
        || IS_WALL(typ) || IS_DOOR(typ) || typ === SDOOR) {
        return 'ceiling';
    }
    return 'rock cavern';
}

/**
 * C dungeon.c surface :1750–1787 — swallow named (zap_updown is
 * !uswallow); air/pool/ice/lava/bridge/altar/grave/fountain/stairs/
 * wall/door/floor/ground. On_stairs named → ground unless furniture
 * (zap_updown WAN_PROBING uses "it" for IS_FURNITURE).
 */
function surface_zap(x, y) {
    const loc = game.level?.at?.(x, y);
    const levtyp = SURFACE_AT(x, y);
    const uz = game.u?.uz;
    if (IS_AIR(levtyp)) {
        if (Is_waterlevel(uz)) return 'air bubble';
        return levtyp === CLOUD ? 'cloud' : 'air';
    }
    if (is_pool(x, y)) {
        return (game.u?.Underwater && !Is_waterlevel(uz))
            ? 'bottom' : hliquid('water');
    }
    if (is_ice(x, y)) return 'ice';
    if (is_lava(x, y)) return hliquid('lava');
    if ((loc?.typ | 0) === DRAWBRIDGE_DOWN) return 'bridge';
    if (IS_ALTAR(levtyp)) return 'altar';
    if (IS_GRAVE(levtyp) || levtyp === GRAVE) return 'headstone';
    if (IS_FOUNTAIN(levtyp)) return 'fountain';
    if (IS_WALL(levtyp) || levtyp === SDOOR) return 'wall';
    if (IS_DOOR(levtyp)) return 'doorway';
    if (IS_ROOM(levtyp) && !Is_earthlevel(uz)) return 'floor';
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
 * SPE_DETECT_UNSEEN shares SECRET_DOOR findit (D-1412);
 * SPE_LIGHT NODIR wand-duplicate cast dispatch (D-1427;
 * zapnodir SPE_LIGHT already live D-1366).
 * SPE_SLEEP RAY wand-duplicate weffects ubuzz (D-1440).
 * SPE_DIG RAY wand-duplicate weffects zap_dig (D-1441).
 * SPE_MAGIC_MISSILE RAY wand-duplicate weffects ubuzz (D-1448).
 * SPE_FINGER_OF_DEATH RAY wand-duplicate weffects ubuzz (D-1449).
 * SPE_KNOCK IMMEDIATE wand-duplicate weffects bhit (D-1450;
 * bhitm/zapyourself SPE_KNOCK already D-0981).
 * SPE_SLOW_MONSTER IMMEDIATE wand-duplicate weffects bhit
 * (D-1451; bhitm D-1424; zapyourself D-1433).
 * SPE_WIZARD_LOCK IMMEDIATE wand-duplicate weffects bhit
 * (D-1452; bhitm D-1425; zapyourself D-1434).
 * SPE_TURN_UNDEAD IMMEDIATE wand-duplicate weffects bhit
 * (D-1458; bhitm/zapyourself unturn D-0955).
 * SPE_POLYMORPH IMMEDIATE wand-duplicate weffects bhit
 * (D-1459; bhitm WAN/SPE/POT poly live; zapyourself D-0156).
 * SPE_CANCELLATION IMMEDIATE wand-duplicate weffects bhit
 * (D-1460). SPE_STONE_TO_FLESH IMMEDIATE wand-duplicate
 * weffects bhit (D-1461). SPE_TELEPORT_AWAY IMMEDIATE
 * wand-duplicate weffects bhit (D-1468). SPE_HEALING/
 * SPE_EXTRA_HEALING IMMEDIATE wand-duplicate weffects bhit
 * (D-1469; bhitm healmon :433–473).
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

/** C ref: obj.h bimanual — WEAPON/TOOL with oc_bimanual (oc_big). */
function bimanual(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS) return false;
    return !!(game.objects?.[obj.otyp]?.oc_big);
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
 * @returns {Promise<object|null>}
 */
export async function montraits(obj, cc, adjacentok) {
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
    await restore_cham(mtmp2);
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
                // C zap.c :994 — await so unleash/Elbereth finish
                // before speed/HP (D-1648).
                await newcham(mtmp, mptr, 0);
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
        mtmp = await montraits(corpse, xy, false);
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
        await normal_shape(mdef);
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

/**
 * C zap.c bhitm box_or_door — mimic appearances that have locks
 * (CHEST/LARGE_BOX or cmap door S_vodoor..S_hcdoor).
 */
function box_or_door(monst) {
    const ap = M_AP_TYPE(monst);
    if (ap === M_AP_OBJECT) {
        const appear = monst.mappearance | 0;
        return appear === CHEST || appear === LARGE_BOX;
    }
    if (ap === M_AP_FURNITURE) {
        const i = monst.mappearance | 0;
        return i >= S_VODOOR && i <= S_HCDOOR;
    }
    return false;
}

/**
 * C mkobj.c stone_object_type :1264–1271 — boulder/statue/figurine
 * mimic shapes undone by stone-to-flesh (D-1461).
 */
function stone_object_type(mappearance) {
    const otyp = mappearance | 0;
    return otyp === BOULDER || otyp === STATUE || otyp === FIGURINE;
}

/**
 * C mkobj.c stone_furniture_type :1276–1295 — stairs/altar/throne/sink
 * or wall glyphs S_vwall..S_trwall (D-1461).
 */
function stone_furniture_type(mappearance) {
    const sym = mappearance | 0;
    switch (sym) {
    case S_UPSTAIR:
    case S_DNSTAIR:
    case S_BRUPSTAIR:
    case S_BRDNSTAIR:
    case S_ALTAR:
    case S_THRONE:
    case S_SINK:
        return true;
    default:
        return sym >= S_VWALL && sym <= S_TRWALL;
    }
}

/** C obj.h SchroedingersBox — LARGE_BOX with spe==1. */
function SchroedingersBox(obj) {
    return !!obj && (obj.otyp | 0) === LARGE_BOX && (obj.spe | 0) === 1;
}

/** C objnam.c otense — verb given plural; singular → vtense. */
function otense_zap(obj, verb) {
    if ((obj?.quan | 0) !== 1) return verb;
    return vtense(null, verb);
}

/** C objnam.c Tobjnam — The(xname) + otense. Caller: bhito WAN_PROBING. */
function Tobjnam_zap(obj, verb) {
    const bp = The(xname(obj));
    return verb ? `${bp} ${otense_zap(obj, verb)}` : bp;
}

/**
 * C zap.c probe_objchain :611–623 — observe each; container/statue
 * lknown (+ cknown unless SchroedingersBox); tin known.
 * Hero invent is JS Array (C gi.invent nobj, D-1017); minvent stays nobj.
 */
function probe_objchain(otmp) {
    const visit = (o) => {
        if (!o) return;
        observe_object(o);
        if (Is_container(o) || (o.otyp | 0) === STATUE) {
            o.lknown = 1;
            if (!SchroedingersBox(o)) o.cknown = 1;
        } else if ((o.otyp | 0) === TIN) {
            o.known = 1;
        }
    };
    if (Array.isArray(otmp)) {
        for (const o of otmp) visit(o);
        return;
    }
    for (; otmp; otmp = otmp.nobj) visit(otmp);
}

/**
 * C zap.c probe_monster :625–640 — mstatusline; notonhead skips
 * minvent (long-worm tail). Else probe_objchain + display_minventory
 * (MINV_ALL|MINV_NOLET|PICK_NONE) or "not carrying anything".
 * Callers: bhitm WAN_PROBING (D-1426); zap_steed WAN_PROBING (D-1443).
 * zapyourself WAN_PROBING uses probe_objchain + ustatusline (D-1435).
 * zap_updown WAN_PROBING uses bhitpile/zap_map/display_binventory (D-1444).
 * bhito WAN_PROBING uses observe_object + display_cinventory (D-1445).
 */
export async function probe_monster(mtmp) {
    if (!mtmp) return;
    await mstatusline(mtmp);
    if (game.notonhead) return;
    if (mtmp.minvent) {
        probe_objchain(mtmp.minvent);
        // C display_minventory NULL title → s_suffix(noit_Monnam)+" possessions:"
        const title = `${s_suffix_zap(noit_Monnam(mtmp))} possessions:`;
        await display_minventory(
            mtmp, MINV_ALL | MINV_NOLET | PICK_NONE, title,
        );
    } else {
        const extra = engulfing_u(mtmp) ? ' besides you' : '';
        await pline(
            `${noit_Monnam(mtmp)} is not carrying anything${extra}.`,
        );
    }
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
 * C ref: mondata.c resists_drli :201–211 — undead/demon/were/lycan/
 * Death/vampshifter, else defended(AD_DRLI). First caller: zap.c
 * bhitm SPE_DRAIN_LIFE (D-1436). Named omit: defended worn-item walk.
 */
function resists_drli(mon) {
    const ptr = mon?.data;
    if (!ptr) return false;
    if (is_undead(ptr) || is_demon(ptr) || is_were(ptr)
        || (mon === game.youmonst && ismnum(game.u?.ulycn))
        || (ptr.mndx | 0) === PM_DEATH || is_vampshifter(mon)) {
        return true;
    }
    return false;
}

/**
 * C ref: mon.c shieldeff_mon :6058–6063 — sparkle then "resists!"
 * if cansee. Display sparkle is display.c shieldeff (D-wired).
 * Caller: bhitm SPE_DRAIN_LIFE resists_drli (D-1436).
 */
async function shieldeff_mon(mtmp) {
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    await shieldeff(mx, my);
    if (cansee(mx, my)) {
        await pline_mon(mtmp, `${Monnam(mtmp)} resists!`);
    }
}

/* C decl.c c_obj_colors[] — mimic_hit_msg vivid color. */
const C_OBJ_COLORS_ZAP = [
    'black', 'red', 'green', 'brown', 'blue', 'magenta', 'cyan', 'gray',
    'transparent', 'orange', 'bright green', 'yellow', 'bright blue',
    'bright magenta', 'bright cyan', 'white',
];

/**
 * C ref: mon.c mimic_hit_msg :5776–5793 — object-mimic hit by
 * SPE_HEALING/SPE_EXTRA_HEALING prints a more vivid color.
 * Caller: zap.c bhitm (D-1469).
 */
async function mimic_hit_msg(mtmp, otyp) {
    if (M_AP_TYPE(mtmp) !== M_AP_OBJECT) return;
    if (otyp !== SPE_HEALING && otyp !== SPE_EXTRA_HEALING) return;
    const ap = mtmp.mappearance | 0;
    const oc = game.objects?.[ap];
    const color = C_OBJ_COLORS_ZAP[oc?.oc_color | 0] || 'colorless';
    const raw = objectNames[ap] || 'object';
    const name = String(raw).toLowerCase().replace(/_/g, ' ');
    await pline_mon(mtmp, `${The(name)} seems a more vivid ${color} than before.`);
}

/**
 * C ref: zap.c bhitm — monster hit by wand/spell effect.
 * Envelope (break-wand / IMMEDIATE): WAN_STRIKING, WAN_UNDEAD_TURNING
 * (damage; invent unturn_dead deferred), WAN_POLYMORPH, WAN_CANCELLATION,
 * WAN_TELEPORTATION, WAN_MAKE_INVISIBLE (D-1414), WAN_SPEED_MONSTER
 * (D-1422; mon_adjust_speed(+1) + check_gear_next_turn), WAN_SLOW_MONSTER
 * (D-1424; mon_adjust_speed(-1) + whirly expels; no helpful_gesture),
 * WAN_LIGHT (flash_hits_mon), WAN_OPENING/SPE_KNOCK
 * (release_hold; openholding/openfalling; SPE_KNOCK mhurtle; saddle),
 * WAN_LOCKING/SPE_WIZARD_LOCK (D-1425; closeholdingtrap; wake =
 * trap-hit), WAN_PROBING (D-1426; probe_monster; wake = FALSE;
 * always learn), SPE_DRAIN_LIFE (D-1436; monhp_per_lvl then
 * spell_damage_bonus; resists_drli → shieldeff_mon else !resist
 * NOTELL then extra mhp/mhpmax + m_lev-- / killed),
 * SPE_STONE_TO_FLESH (D-1461; golem newcham / stone-mimic
 * that_is_a_mimic(MIM_REVEAL|MIM_OMIT_WAIT); else wake FALSE),
 * SPE_HEALING/SPE_EXTRA_HEALING (D-1469; healmon + skilled/extra
 * mcureblindness; Pestilence resist TELL; wake FALSE).
 * Named omit: Knight questart double
 * on striking; mhurtle petrify/steed; that_is_a_mimic MIM_REVEAL
 * pline (box_or_door+seemimic wired);
 * zap_steed WAN_MAKE_INVISIBLE is D-1473; zap_map engraving
 * WAN_MAKE_INVISIBLE is D-1476; zap_steed WAN_PROBING
 * is D-1443; bhito WAN_PROBING is
 * D-1445; SPE_DRAIN_LIFE drain_item is D-1453; worm see_wsegs; defended(AD_DRLI).
 * zapyourself WAN_LOCKING is D-1434; zapyourself WAN_PROBING is D-1435;
 * zapyourself SPE_DRAIN_LIFE is D-1446.
 * SPE_TURN_UNDEAD wand-duplicate weffects is D-1458
 * (bhitm dbldam + spell_damage_bonus; unturn_dead D-0955).
 * SPE_FORCE_BOLT spell_damage_bonus is D-1388.
 * SPE_HEALING/SPE_EXTRA_HEALING wand-duplicate weffects is D-1469.
 * zap_steed SPE_CURE_SICKNESS routes here (D-1480) but C has
 * no bhitm arm (default impossible; objects.h NODIR).
 * @returns {Promise<number>} 0 (non-stopping for bhit range)
 */
export async function bhitm(mtmp, otmp) {
    if (!mtmp || !otmp) return 0;
    let wake = true;
    let reveal_invis = false;
    let learn_it = false;
    let helpful_gesture = false;
    const otyp = otmp.otyp | 0;
    /* C zap.c bhitm :186 — SPBOOK + blessed (skilled heal spell). */
    const skilled_spell = otmp.oclass === SPBOOK_CLASS && !!otmp.blessed;
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
        // C zap.c bhitm :189–217. zap_steed WAN_STRIKING/
        // SPE_FORCE_BOLT routes here (D-1474). resists_magm
        // Boing (shieldeff named); else rnd(20)<10+find_mac
        // then d(2,12) + SPE spell_damage_bonus (D-1388) +
        // resist TELL; miss skips learn_it. Knight dbldam named.
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
    case WAN_SLOW_MONSTER:
    case SPE_SLOW_MONSTER: {
        // C zap.c bhitm :218–232 — !resist NOTELL then seemimic,
        // mon_adjust_speed(mtmp, -1, otmp), check_gear_next_turn.
        // Whirly engulfer: You disrupt + huge hole + expels.
        // No helpful_gesture (unlike WAN_SPEED :233–242 / D-1422).
        // Callee worn.c mon_adjust_speed lives in muse.js (D-0871).
        // zap_steed WAN/SPE_SLOW via bhitm is D-1478.
        // zapyourself WAN_SLOW is D-1433.
        // SPE_SLOW wand-duplicate weffects is D-1451.
        if (!(await resist(mtmp, otmp.oclass, 0, NOTELL))) {
            if (disguised_mimic) seemimic(mtmp);
            const { mon_adjust_speed } = await import('./muse.js');
            await mon_adjust_speed(mtmp, -1, otmp);
            check_gear_next_turn(mtmp);
            if (engulfing_u(mtmp) && is_whirly(mtmp.data)) {
                await You(`disrupt ${mon_nam(mtmp)}!`);
                await pline('A huge hole opens up...');
                await expels(mtmp, mtmp.data, true);
            }
        }
        break;
    }
    case WAN_SPEED_MONSTER: {
        // C zap.c bhitm :233–242 — !resist NOTELL then seemimic,
        // mon_adjust_speed(mtmp, 1, otmp), check_gear_next_turn.
        // helpful_gesture always (wake without anger). Callee
        // worn.c mon_adjust_speed lives in muse.js (D-0871).
        // zap_steed WAN_SPEED via bhitm is D-1479; WAN_SLOW is D-1424.
        if (!(await resist(mtmp, otmp.oclass, 0, NOTELL))) {
            if (disguised_mimic) seemimic(mtmp);
            const { mon_adjust_speed } = await import('./muse.js');
            await mon_adjust_speed(mtmp, 1, otmp);
            check_gear_next_turn(mtmp);
        }
        helpful_gesture = true;
        break;
    }
    case WAN_UNDEAD_TURNING:
    case SPE_TURN_UNDEAD: {
        // C zap.c bhitm :243–262 — wake FALSE then unturn_dead
        // (invent eggs/corpses) can wake. Undead/vampshifter:
        // reveal + wake + rnd(8); Knight questart dbldam ×2;
        // SPE_TURN_UNDEAD spell_damage_bonus; bypasses then
        // !resist NOTELL then monflee if still alive.
        // SPE_TURN_UNDEAD wand-duplicate weffects is D-1458.
        // SPE_POLYMORPH wand-duplicate weffects is D-1459.
        wake = false;
        if (await unturn_dead(mtmp)) wake = true;
        if (is_undead(mtmp.data) || is_vampshifter(mtmp)) {
            reveal_invis = true;
            wake = true;
            let dmg = rnd(8);
            const dbldam = Role_if(PM_KNIGHT) && !!(game.u?.uhave?.questart);
            if (dbldam) dmg *= 2;
            if (otyp === SPE_TURN_UNDEAD) {
                dmg = spell_damage_bonus(dmg);
            }
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
        // C zap.c bhitm :263–334. SPE_POLYMORPH wand-duplicate
        // weffects is D-1459. zap_steed WAN/SPE_POLYMORPH
        // routes here (D-1471). Long-worm has_mcorpsenm skip +
        // post-poly PM_LONG_WORM flag (D-1598).
        if ((mtmp.data?.mndx | 0) === PM_LONG_WORM && has_mcorpsenm(mtmp)) {
            /* already flagged by this zap — skip further poly */
        } else if (resists_magm(mtmp)) {
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
                if (await newcham(mtmp, null, ncflags)
                    || (ismnum(mtmp.cham)
                        && await newcham(mtmp, mons(mtmp.cham), ncflags))) {
                    if (give_msg && (canspotmon(mtmp)
                        || (game.u?.uswallow && game.u?.ustuck === mtmp))) {
                        learn_it = true;
                    }
                }
            }
            // C: even if poly failed — further hits on a new tail
            // must not transform again this zap.
            if ((mtmp.mhp | 0) > 0
                && (mtmp.data?.mndx | 0) === PM_LONG_WORM) {
                if (!has_mcorpsenm(mtmp))
                    newmcorpsenm(mtmp);
                mtmp.mextra.mcorpsenm = PM_LONG_WORM;
                if (!game.context) game.context = {};
                game.context.bypasses = true;
            }
        }
        break;
    }
    case WAN_CANCELLATION:
    case SPE_CANCELLATION:
        // C zap.c bhitm :335–340. zap_steed WAN/SPE_CANCELLATION
        // routes here (D-1470); cancel_monst invent=FALSE.
        if (disguised_mimic) seemimic(mtmp);
        await cancel_monst(mtmp, otmp, true, true, false);
        break;
    case WAN_TELEPORTATION:
    case SPE_TELEPORT_AWAY:
        // C zap.c bhitm :341–347. zap_steed WAN/SPE_TELEPORT
        // calls tele() (hero+steed together, D-1455), not this
        // u_teleport_mon path.
        if (disguised_mimic) seemimic(mtmp);
        reveal_invis = !(await u_teleport_mon(mtmp, true));
        learn_it = canspotmon(mtmp);
        break;
    case WAN_MAKE_INVISIBLE: {
        // C zap.c bhitm :348–368 — snapshot name before minvis;
        // mon_set_minvis(FALSE); transparent iff !oldinvis &&
        // knowninvisible; else vanish iff couldsee && !canseemon.
        // knowninvisible See_invisible is youprop.h H||E ≡
        // uprops[SEE_INVIS] so conferral ring-of-SI still learns
        // (D-1423). zap_steed WAN_MAKE_INVISIBLE routes here
        // (D-1473). zap_map engraving WAN_MAKE_INVISIBLE is D-1476.
        const oldinvis = mtmp.minvis;
        const couldsee = canseemon(mtmp);
        if (disguised_mimic) seemimic(mtmp);
        const nambuf = Monnam(mtmp);
        mon_set_minvis(mtmp, false);
        if (!oldinvis && knowninvisible(mtmp)) {
            await pline(`${nambuf} turns transparent!`);
            reveal_invis = true;
            learn_it = true;
        } else if (couldsee && !canseemon(mtmp)) {
            await pline(`${nambuf} vanishes!`);
        }
        break;
    }
    case WAN_LOCKING:
    case SPE_WIZARD_LOCK: {
        // C zap.c bhitm :370–375 — box_or_door mimic then
        // wake = closeholdingtrap(mtmp, &learn_it). that_is_a_mimic
        // (MIM_REVEAL) named; seemimic is the C comment. Callee
        // trap.c :6210–6247. zap_updown LOCKING is D-1465.
        // zap_steed does not route locking to bhitm.
        // zapyourself WAN_LOCKING is D-1434.
        // SPE_WIZARD_LOCK wand-duplicate weffects is D-1452.
        if (disguised_mimic && box_or_door(mtmp)) seemimic(mtmp);
        const closed = await closeholdingtrap(mtmp);
        if (closed.noticed) learn_it = true;
        wake = closed.happened;
        break;
    }
    case WAN_PROBING:
        // C zap.c bhitm :376–381 — wake FALSE; reveal_invis; probe;
        // always learn. Callee probe_monster :625–640. zap_steed
        // WAN_PROBING calls probe_monster directly (D-1443), not
        // this bhitm. zap_updown WAN_PROBING is D-1444; bhito WAN_PROBING
        // is D-1445. zapyourself WAN_PROBING is D-1435.
        wake = false;
        reveal_invis = true;
        await probe_monster(mtmp);
        learn_it = true;
        break;
    case SPE_STONE_TO_FLESH: {
        /* C zap.c bhitm :490–520 — golem newcham / stone-mimic
         * that_is_a_mimic(MIM_REVEAL|MIM_OMIT_WAIT); else wake
         * FALSE. SPE_STONE wand-duplicate weffects is D-1461.
         * zap_updown SPE_STONE_TO_FLESH is D-1466. */
        if (mtmp.data?.mlet === 'S_GOLEM') {
            const name = Monnam(mtmp);
            const mndx = mtmp.data?.mndx | 0;
            let mesg;
            if (mndx === PM_STONE_GOLEM
                && await newcham(mtmp, mons(PM_FLESH_GOLEM), 0)) {
                mesg = 'turns to flesh!';
            } else if (mndx === PM_FLESH_GOLEM) {
                mesg = 'seems fleshier...';
            } else {
                mesg = 'looks rather fleshy for a moment.';
            }
            if (canseemon(mtmp)) {
                await pline(`${name} ${mesg}`);
            }
        } else if (mtmp.data?.mlet === 'S_MIMIC'
            && ((M_AP_TYPE(mtmp) === M_AP_FURNITURE
                    && stone_furniture_type(mtmp.mappearance))
                || (M_AP_TYPE(mtmp) === M_AP_OBJECT
                    && stone_object_type(mtmp.mappearance)))) {
            if (cansee(mtmp.mx | 0, mtmp.my | 0)) {
                set_msg_xy(mtmp.mx | 0, mtmp.my | 0);
                await that_is_a_mimic(mtmp, MIM_REVEAL | MIM_OMIT_WAIT);
            }
        } else {
            wake = false;
        }
        break;
    }
    case SPE_DRAIN_LIFE: {
        // C zap.c bhitm :521–544 — seemimic; dmg = monhp_per_lvl;
        // Knight questart dbldam ×2; SPE always spell_damage_bonus.
        // resists_drli → shieldeff_mon (no resist RNG). Else
        // !resist NOTELL (applies dmg, may kill) then extra
        // mhp/mhpmax strip; dead / mhpmax<=0 / m_lev<1 → killed
        // else m_lev-- + weaker pline. Does not discover the type
        // (unlike probing).
        // Callees: makemon.c monhp_per_lvl; mondata.c resists_drli
        // (defended AD_DRLI named); mon.c shieldeff_mon; zap.c
        // resist. zapyourself SPE_DRAIN is D-1446; bhito
        // drain_item is D-1453; zap_steed SPE_DRAIN_LIFE
        // routes here (D-1464).
        if (disguised_mimic) seemimic(mtmp);
        let dmg = monhp_per_lvl(mtmp);
        const dbldam = Role_if(PM_KNIGHT) && !!(game.u?.uhave?.questart);
        if (dbldam) dmg *= 2;
        if (otyp === SPE_DRAIN_LIFE) {
            dmg = spell_damage_bonus(dmg);
        }
        if (resists_drli(mtmp)) {
            await shieldeff_mon(mtmp);
        } else if (!(await resist(mtmp, otmp.oclass, dmg, NOTELL))
            && (mtmp.mhp | 0) >= 1) {
            mtmp.mhp = (mtmp.mhp | 0) - dmg;
            mtmp.mhpmax = (mtmp.mhpmax | 0) - dmg;
            if ((mtmp.mhp | 0) < 1
                || (mtmp.mhpmax | 0) <= 0
                || (mtmp.m_lev | 0) < 1) {
                await killed(mtmp);
            } else {
                mtmp.m_lev = (mtmp.m_lev | 0) - 1;
                if (canseemon(mtmp)) {
                    await pline(`${Monnam(mtmp)} suddenly seems weaker!`);
                }
            }
        }
        break;
    }
    case WAN_LIGHT:
        // C: broken-wand / IMMEDIATE light flash on monster
        if (await flash_hits_mon(mtmp, otmp)) {
            learn_it = true;
            reveal_invis = true;
        }
        break;
    case WAN_OPENING:
    case SPE_KNOCK:
        // C zap.c bhitm :383–432. zap_steed WAN_OPENING/SPE_KNOCK
        // routes here (D-1463). that_is_a_mimic box_or_door named.
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
    case SPE_HEALING:
    case SPE_EXTRA_HEALING: {
        /* C zap.c bhitm :433–473. d(6, extra?8:4) then Pestilence
         * resist(healamt/2, TELL); else wake FALSE, healmon,
         * skilled||extra mcureblindness, looks better, Healer
         * tame XP, tame/peaceful adjalign. Caller spelleffects
         * D-1469; zap_steed via bhitm. */
        const healamt = d(6, otyp === SPE_EXTRA_HEALING ? 8 : 4);
        reveal_invis = true;
        const pest = (mtmp.data?.mndx | 0) === PM_PESTILENCE
            || mtmp.data === mons(PM_PESTILENCE);
        if (!pest) {
            const delta = (mtmp.mhpmax | 0) - (mtmp.mhp | 0);
            wake = false;
            healmon(mtmp, healamt, 0);
            if (skilled_spell || otyp === SPE_EXTRA_HEALING) {
                const { mcureblindness } = await import('./muse.js');
                await mcureblindness(mtmp, canseemon(mtmp));
            }
            if (canseemon(mtmp)) {
                if (disguised_mimic) {
                    if (M_AP_TYPE(mtmp) === M_AP_OBJECT
                        && (mtmp.mappearance | 0) === STRANGE_OBJECT) {
                        set_mimic_sym(mtmp);
                        newsym(mtmp.mx | 0, mtmp.my | 0);
                    } else {
                        await mimic_hit_msg(mtmp, otyp);
                    }
                } else {
                    await pline(
                        `${Monnam(mtmp)} looks${
                            otyp === SPE_EXTRA_HEALING ? ' much' : ''
                        } better.`,
                    );
                }
            }
            if (mtmp.mtame && Role_if(PM_HEALER) && delta > 0) {
                more_experienced(Math.min(delta, healamt), 0);
                await newexplevel();
            }
            if (mtmp.mtame || mtmp.mpeaceful) {
                const atype = game.u?.ualign?.type | 0;
                adjalign(Role_if(PM_HEALER)
                    ? 1
                    : (atype < 0 ? -1 : atype !== 0 ? 1 : 0));
            }
        } else {
            await resist(mtmp, otmp.oclass, (healamt / 2) | 0, TELL);
        }
        break;
    }
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
    // C zap.c bhitm :563–566 — reveal_invis maps 'I' at bhitpos
    // when the hero can see the spot but not the monster (D-1426;
    // probing always sets this; other arms already set the flag).
    if (reveal_invis && (mtmp.mhp | 0) > 0) {
        const bx = bhitpos.x | 0;
        const by = bhitpos.y | 0;
        if (cansee(bx, by) && !canspotmon(mtmp)) {
            map_invisible(bx, by);
        }
    }
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
 * WAN/SPE_SLOW_MONSTER u_slow_down (D-1433);
 * WAN_LOCKING/SPE_WIZARD_LOCK closeholdingtrap + boxlock_invent
 * (D-1434);
 * WAN_PROBING probe_objchain + update_inventory + ustatusline
 * (D-1435);
 * SPE_DRAIN_LIFE !Drain_resistance + losexp (D-1446);
 * SPE_STONE_TO_FLESH polymon flesh golem / Stoned
 * fix_petrification / invent bhito + merge (D-1461);
 * WAN_DIGGING / SPE_DIG no-op (C :2955–2959; directed D-1441
 * weffects → zap_dig);
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
        // C: zap.c zapyourself :2804–2810 — !Unchanging →
        // learn + polyself(POLY_NOFLAGS). SPE_POLYMORPH
        // wand-duplicate weffects is D-1459.
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

    case SPE_DRAIN_LIFE:
        // C zap.c zapyourself :2817–2823 — if (!Drain_resistance)
        // learn_it + losexp("life drainage"); damage = 0.
        // Gate is youprop.h H||E (uprops[DRAIN_RES]), not
        // resists_drli. learnwand is a no-op for SPBOOK
        // ("no effect for spells..."). Callee exper.c losexp
        // (undead/demon still no-ops after learn_it). bhitm
        // drain is D-1436; bhito drain_item is D-1453; zap_steed
        // SPE_DRAIN_LIFE via bhitm is D-1464.
        if (!Drain_resistance()) {
            learn_it = true;
            await losexp('life drainage');
        }
        damage = 0;
        break;

    case WAN_TELEPORTATION:
    case SPE_TELEPORT_AWAY: {
        // C zap.c zapyourself :2876–2882 — tele() then same
        // learnwand criteria as mounted zap_steed :3104–3113
        // (D-1455): (Teleport_control && !Stunned) ||
        // !couldsee(ux0,uy0) || distu(ux0,uy0) >= 16. teleds
        // sets ux0 to the origin; do not snapshot pre-tele ux0.
        await tele();
        const u = game.u || {};
        const u0x = u.ux0 | 0;
        const u0y = u.uy0 | 0;
        const dx = (u.ux | 0) - u0x;
        const dy = (u.uy | 0) - u0y;
        if ((Teleport_control() && !Stunned())
            || !couldsee(u0x, u0y)
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
        // bhitm is D-1414; zap_steed is D-1473; zap_map
        // engraving WAN_MAKE_INVISIBLE is D-1476.
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
        // potion.c speed_up :2918–2928 (D-1408). bhitm
        // WAN_SPEED is D-1422; bhitm WAN_SLOW is D-1424;
        // zap_steed WAN/SPE_SLOW is D-1478; zap_steed WAN_SPEED
        // is D-1479.
        // zapyourself WAN_SLOW is D-1433.
        await speed_up(rn1(25, 50));
        learn_it = true;
        break;

    case WAN_SLOW_MONSTER:
    case SPE_SLOW_MONSTER: {
        // C zap.c zapyourself :2868–2874 — HFast&(TIMEOUT|INTRINSIC)
        // then learn + u_slow_down. Boots-only EFast is a no-op.
        // Callee mhitu.c u_slow_down :161–171. WAN_LOCKING is
        // D-1434. WAN_PROBING is D-1435. bhitm SPE_DRAIN is D-1436;
        // zapyourself SPE_DRAIN_LIFE is D-1446.
        // SPE_SLOW wand-duplicate weffects is D-1451.
        const u = game.u || {};
        const hfast = (u.HFast | 0) | (u.uprops?.[FAST]?.intrinsic | 0);
        if (hfast & (TIMEOUT | INTRINSIC)) {
            learn_it = true;
            await u_slow_down();
        }
        break;
    }

    case WAN_LOCKING:
    case SPE_WIZARD_LOCK: {
        // C zap.c zapyourself :2948–2954 — similar to opening;
        // invent is hit iff no trap triggered:
        // if (u.utrap || !closeholdingtrap(&youmonst, &learn_it))
        //     boxlock_invent(obj);
        // C || short-circuits: already-trapped skips closeholdingtrap
        // (noticed stays unset). Callee trap.c :6210–6247 (D-1425)
        // + zap.c boxlock_invent :2687–2702 (lock.c boxlock).
        // WAN_PROBING is D-1435. bhitm SPE_DRAIN is D-1436;
        // zapyourself SPE_DRAIN is D-1446; zap_updown LOCKING is
        // D-1465; STONE still named.
        // SPE_WIZARD_LOCK wand-duplicate weffects is D-1452.
        const alreadyTrapped = !!(game.u?.utrap | 0);
        if (alreadyTrapped) {
            await boxlock_invent(obj);
        } else {
            const closed = await closeholdingtrap(
                game.youmonst || { _youmonst: true },
            );
            if (closed.noticed) learn_it = true;
            if (!closed.happened) {
                await boxlock_invent(obj);
            }
        }
        break;
    }

    case WAN_DIGGING:
    case SPE_DIG:
        // C zap.c zapyourself :2955–2959 — break (also
        // SPE_DETECT_UNSEEN / WAN_NOTHING). No learn_it.
        // Directed SPE_DIG is weffects → zap_dig (D-1441).
        break;

    case WAN_PROBING:
        // C zap.c zapyourself :2960–2965 — probe_objchain(invent);
        // update_inventory(); learn_it = TRUE; ustatusline().
        // Always learn (empty pack still). Does not call probe_monster
        // (that is bhitm D-1426 / zap_steed D-1443). Callees
        // probe_objchain :611–623 (hero invent Array, D-1017);
        // invent.c update_inventory; insight.c ustatusline
        // (stethoscope; ailments named). bhitm SPE_DRAIN is D-1436;
        // zapyourself SPE_DRAIN is D-1446; zap_updown WAN_PROBING is D-1444;
        // bhito WAN_PROBING is D-1445.
        probe_objchain(game.invent);
        update_inventory();
        learn_it = true;
        await ustatusline();
        break;

    case SPE_STONE_TO_FLESH: {
        /* C zap.c zapyourself :2966–3003 — polymon flesh golem,
         * Stoned fix_petrification, then invent bhito + paranoid
         * merge (skip worn). SPE_STONE wand-duplicate is D-1461.
         * poly_obj worn-slot remap named. */
        if ((game.u?.umonnum | 0) === PM_STONE_GOLEM) {
            learn_it = true;
            await polymon(PM_FLESH_GOLEM);
        }
        if (game.u?.Stoned) {
            learn_it = true;
            await fix_petrification();
        }
        const pack = [...(game.invent || [])];
        for (const otmp of pack) {
            if (!otmp) continue;
            if (await bhito(otmp, obj)) learn_it = true;
        }
        let didmerge;
        do {
            didmerge = false;
            const inv = game.invent || [];
            outer: for (let i = 0; i < inv.length; i++) {
                const otmp = inv[i];
                if (otmp.owornmask) continue;
                for (let j = i + 1; j < inv.length; j++) {
                    const onxt = inv[j];
                    if (!mergable(otmp, onxt)) continue;
                    otmp.quan = (otmp.quan || 1) + (onxt.quan || 1);
                    otmp.owt = weight(otmp);
                    if (onxt.known) otmp.known = 1;
                    if (onxt.bknown) otmp.bknown = 1;
                    if (onxt.rknown) otmp.rknown = 1;
                    obj_extract_self(onxt);
                    didmerge = true;
                    break outer;
                }
            }
        } while (didmerge);
        break;
    }

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
export function obj_unpolyable(obj) {
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
 * C zap.c stone_to_flesh_obj :1991–2112 — mineral/gemstone then
 * obj_resists(2,98); ROCK/TOOL boulder meat / statue animate /
 * figurine makemon; RING meat ring; WAND meat stick; GEM meatball.
 * SPE_STONE wand-duplicate is D-1461. Named: zap_map
 * lateral drawbridge. zap_updown SPE_STONE_TO_FLESH is D-1466.
 * zap_map SPE_STONE_TO_FLESH ENGRAVE wipe is D-1476.
 * @returns {Promise<number>}
 */
async function stone_to_flesh_obj(obj) {
    if (!obj) return 0;
    const ocl = game.objects?.[obj.otyp];
    const mat = ocl?.oc_material | 0;
    if (mat !== MAT_MINERAL && mat !== MAT_GEMSTONE) return 0;
    if (obj_resists(obj, 2, 98)) return 0;

    const loc = get_obj_location(obj, 0) || { x: 0, y: 0 };
    const oox = loc.x | 0;
    const ooy = loc.y | 0;
    let smell = false;
    let golem_xform = false;
    let res = 1;
    const oclass = ocl?.oc_class;

    switch (oclass) {
    case ROCK_CLASS:
    case TOOL_CLASS:
        if ((obj.otyp | 0) === BOULDER) {
            obj = await poly_obj(obj, ENORMOUS_MEATBALL);
            smell = true;
        } else if ((obj.otyp | 0) === STATUE
            || (obj.otyp | 0) === FIGURINE) {
            let ptr = mons(obj.corpsenm);
            let mon = null;
            if (is_golem(ptr)) {
                golem_xform = ptr !== mons(PM_FLESH_GOLEM);
            } else if (vegetarian(ptr)) {
                obj = await poly_obj(obj, MEATBALL);
                smell = true;
                break;
            }
            if ((obj.otyp | 0) === STATUE) {
                mon = await animate_statue(
                    obj, oox, ooy, ANIMATE_SPELL, null,
                );
            } else {
                if (golem_xform) ptr = mons(PM_FLESH_GOLEM);
                mon = makemon(ptr, oox, ooy, NO_MINVENT | MM_NOMSG);
                if (mon) {
                    if (costly_spot(oox, ooy)
                        && (carried(obj) ? obj.unpaid : !obj.no_charge)) {
                        const shkp = shop_keeper(
                            in_rooms(oox, ooy, SHOPBASE) || '',
                        );
                        await stolen_value(
                            obj, oox, ooy, !!(shkp && shkp.mpeaceful), false,
                        );
                    }
                    if (obj.timed) obj_stop_timers(obj);
                    if (carried(obj)) useup(obj);
                    else delobj(obj);
                    if (cansee(mon.mx | 0, mon.my | 0)) {
                        await pline(
                            `The figurine ${
                                golem_xform ? 'turns to flesh and ' : ''
                            }animates!`,
                        );
                    }
                }
            }
            if (mon) {
                ptr = mon.data;
                if (is_golem(ptr) && ptr !== mons(PM_FLESH_GOLEM)) {
                    await newcham(
                        mon, mons(PM_FLESH_GOLEM), NC_VIA_WAND_OR_SPELL,
                    );
                }
            } else if (((ptr?.geno | 0) & (G_NOCORPSE | G_UNIQ)) !== 0) {
                res = 0;
            } else {
                while (obj.cobj) {
                    const item = obj.cobj;
                    bypass_obj(item);
                    obj_extract_self(item);
                    place_object(item, oox, ooy);
                }
                obj = await poly_obj(obj, CORPSE);
            }
        } else {
            res = 0;
        }
        break;
    case RING_CLASS:
        obj = await poly_obj(obj, MEAT_RING);
        smell = true;
        break;
    case WAND_CLASS:
        obj = await poly_obj(obj, MEAT_STICK);
        smell = true;
        break;
    case GEM_CLASS:
        obj = await poly_obj(obj, MEATBALL);
        smell = true;
        break;
    case WEAPON_CLASS:
        /* FALLTHROUGH */
    default:
        res = 0;
        break;
    }

    if (smell) {
        if (Role_if(PM_MONK)
            || !(game.u?.uconduct?.unvegetarian | 0)
            || !carnivorous(game.youmonst?.data)) {
            await Norep('You smell the odor of meat.');
        } else {
            await Norep('You smell a delicious smell.');
        }
    }
    newsym(oox, ooy);
    return res;
}

/**
 * C ref: zap.c poly_obj — STRANGE_OBJECT class-preserving poly
 * (wand/pile + potion_dip D-1499) plus mksobj(id) for stone-to-flesh
 * (D-1461 :1728–1736). Invent worn remap + set_wear (D-1510).
 * Named: sokoban_guilt / egg/leash / addinv_core1/2 / shop bill /
 * gem mineral rnd / spestudied / floor boulder block.
 */
export async function poly_obj(obj, id) {
    if (!obj) return null;
    const can_merge = id === STRANGE_OBJECT;
    const obj_location = obj.where;
    let otmp;

    if (id === STRANGE_OBJECT) {
        let try_limit = 3;
        let magic_obj = game.objects?.[obj.otyp]?.oc_magic | 0;
        if ((obj.otyp | 0) === UNICORN_HORN && obj.degraded_horn) {
            magic_obj = 0;
        }
        otmp = null;
        do {
            if (otmp) delobj(otmp);
            otmp = mkobj(obj.oclass, false);
        } while (--try_limit > 0
            && ((game.objects?.[otmp.otyp]?.oc_magic | 0) !== magic_obj));
    } else {
        /* C zap.c :1728–1736 mksobj(id) + USES_CORPSENM. */
        otmp = mksobj(id, false, false);
        const uses = (typ) => typ === CORPSE || typ === STATUE
            || typ === FIGURINE;
        if (uses(obj.otyp | 0) && uses(id | 0)) {
            set_corpsenm(otmp, obj.corpsenm);
        }
    }

    otmp.quan = obj.quan | 0;
    otmp.no_charge = obj.no_charge;
    if (obj_location === OBJ_INVENT) otmp.invlet = obj.invlet;

    /* C zap.c :1756–1779 — avoid abusing eggs laid by you.
     * random_monster(rn2) is rn2(NUMMONS); set_corpsenm re-arms hatch. */
    if ((obj.otyp | 0) === EGG && obj.spe) {
        let tryct = 100;
        if ((otmp.otyp | 0) === EGG) {
            kill_egg(otmp);
        } else {
            otmp.otyp = EGG;
            otmp.owt = weight(otmp);
        }
        otmp.corpsenm = NON_PM;
        otmp.spe = 0;
        while (tryct--) {
            const mnum = can_be_hatched(rn2(NUMMONS));
            if (mnum !== NON_PM && !dead_species(mnum, true)) {
                otmp.spe = 1;
                set_corpsenm(otmp, mnum);
                break;
            }
        }
    }

    // charged_objs: WAND / WEAPON / ARMOR keep spe
    const oc = otmp.oclass;
    if (oc === WAND_CLASS || oc === WEAPON_CLASS || oc === ARMOR_CLASS) {
        otmp.spe = obj.spe | 0;
    }
    otmp.recharged = obj.recharged | 0;
    otmp.cursed = !!obj.cursed;
    otmp.blessed = !!obj.blessed;

    if (erosion_matters(otmp)) {
        if (is_flammable(otmp) || is_rustprone(otmp) || is_crackable(otmp)) {
            otmp.oeroded = obj.oeroded | 0;
        }
        if (is_corrodeable(otmp) || is_rottable(otmp)) {
            otmp.oeroded2 = obj.oeroded2 | 0;
        }
        if (is_damageable(otmp)) {
            otmp.oerodeproof = obj.oerodeproof;
        }
    }

    if (obj.otrapped && Is_box(otmp)) otmp.otrapped = 1;
    if (obj.opoisoned) {
        const sk = game.objects?.[otmp.otyp]?.oc_skill ?? 0;
        if (((otmp.oclass | 0) === WEAPON_CLASS
                && sk >= -P_SHURIKEN && sk <= -P_BOW)
            || is_art(otmp, ART_GRIMTOOTH)) {
            otmp.opoisoned = 1;
        }
    }

    if (id === STRANGE_OBJECT && (obj.otyp | 0) === CORPSE
        && (obj.corpsenm | 0) === PM_CROCODILE) {
        otmp.otyp = LOW_BOOTS;
        otmp.oclass = ARMOR_CLASS;
        otmp.spe = 0;
        otmp.oeroded = 0;
        otmp.oerodeproof = true;
        otmp.quan = 1;
        otmp.cursed = false;
    }

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
        if ((otmp.otyp | 0) === MAGIC_LAMP) {
            otmp.otyp = OIL_LAMP;
            otmp.age = 1500;
        } else if ((otmp.otyp | 0) === MAGIC_MARKER) {
            otmp.recharged = 1;
        }
        break;
    case WAND_CLASS:
        while (otmp.otyp === WAN_WISHING || otmp.otyp === WAN_POLYMORPH) {
            otmp.otyp = rnd_class(WAN_LIGHT, WAN_LIGHTNING);
        }
        if ((otmp.recharged | 0) < rn2(7)) otmp.recharged = (otmp.recharged | 0) + 1;
        break;
    case POTION_CLASS:
        while (otmp.otyp === POT_POLYMORPH) {
            otmp.otyp = rnd_class(POT_GAIN_ABILITY, POT_WATER);
        }
        if ((otmp.otyp | 0) === POT_OIL || (obj.otyp | 0) === POT_OIL) {
            fixup_oil(otmp, obj);
        }
        break;
    case SPBOOK_CLASS: {
        const bases = game.bases || [];
        while (otmp.otyp === SPE_POLYMORPH) {
            otmp.otyp = rnd_class(bases[SPBOOK_CLASS] | 0, SPE_BLANK_PAPER);
        }
        // spestudied degrade named
        break;
    }
    case GEM_CLASS:
        // mineral→ROCK backfire named (rnd(4) RNG)
        break;
    default:
        break;
    }

    otmp.owt = weight(otmp);

    /* C :1900–1913 — done adjusting except possibly wearing. */
    get_obj_location(obj, BURIED_TOO | CONTAINED_TOO);
    const old_wornmask = (obj.owornmask | 0) & ~(W_ART | W_ARTI);

    if (obj_location === OBJ_FLOOR || obj_location === OBJ_INVENT) {
        replace_object(obj, otmp);
        if (obj_location === OBJ_INVENT) {
            freeinv_core(obj);
            /* addinv_core1/2 named */
            if (old_wornmask) {
                /* C :1921–1950 — keep weapon slots; else wearslot & old. */
                const was_twohanded = bimanual(obj);
                const was_twoweap = !!(game.u?.twoweap);
                const new_wornmask = ((old_wornmask & W_WEAPONS) !== 0)
                    ? old_wornmask
                    : (wearslot(otmp) & old_wornmask);
                await remove_worn_item(obj, true);
                const u = game.u || {};
                if ((new_wornmask & W_WEP) !== 0) {
                    if (was_twohanded || !bimanual(otmp) || !u.uarms) {
                        setuwep(otmp);
                    }
                    if (was_twoweap && u.uwep && !bimanual(u.uwep)) {
                        set_twoweap(true);
                    }
                } else if ((new_wornmask & W_SWAPWEP) !== 0) {
                    if (was_twohanded || !bimanual(otmp)) {
                        setuswapwep(otmp);
                    }
                    if (was_twoweap && u.uswapwep) {
                        set_twoweap(true);
                    }
                } else if ((new_wornmask & W_QUIVER) !== 0) {
                    setuqwep(otmp);
                } else if (new_wornmask) {
                    setworn(otmp, new_wornmask);
                    await set_wear(otmp);
                    otmp = wearmask_to_obj(new_wornmask);
                }
            }
        }
        // boulder block_point / shop bill named
    } else {
        // minvent/contained — extract+free old; leave otmp free
        delobj(obj);
        return otmp;
    }
    delobj(obj);
    return otmp;
}

/**
 * C ref: zap.c drain_item :1382–1455 — strip one spe from a charged
 * or enchanted object. First caller this iter: bhito SPE_DRAIN_LIFE
 * (D-1453). Callees: artifact.c defends / defends_when_carried
 * (defn/cary extract), obj_resists(10,90), costly_alteration
 * COST_DRAIN, bot, invent update_inventory. Named omit: uhitm /
 * mhitu / mhitm AD_ENCH callers.
 * @returns {Promise<boolean>} TRUE if spe was reduced
 */
export async function drain_item(obj, by_you) {
    if (!obj) return false;
    const oc = game.objects?.[obj.otyp];
    const charged = !!(oc?.oc_charged) || otyp_is_charged(obj.otyp | 0);
    if ((!charged
            && obj.oclass !== WEAPON_CLASS
            && obj.oclass !== ARMOR_CLASS
            && !is_weptool(obj))
        || (obj.spe | 0) <= 0) {
        return false;
    }
    if (defends(AD_DRLI, obj) || defends_when_carried(AD_DRLI, obj)
        || obj_resists(obj, 10, 90)) {
        return false;
    }
    if (by_you) {
        await costly_alteration(obj, COST_DRAIN);
    }
    obj.spe = (obj.spe | 0) - 1;
    const u = game.u || {};
    const u_ring = obj === u.uleft || obj === u.uright;
    switch (obj.otyp) {
    case RIN_GAIN_STRENGTH:
        if (((obj.owornmask | 0) & W_RING) && u_ring) {
            if (!u.abon) u.abon = { a: [0, 0, 0, 0, 0, 0] };
            u.abon.a[A_STR] = (u.abon.a[A_STR] | 0) - 1;
            if (game.flags) game.flags.botl = true;
            if (game.disp) game.disp.botl = true;
        }
        break;
    case RIN_GAIN_CONSTITUTION:
        if (((obj.owornmask | 0) & W_RING) && u_ring) {
            if (!u.abon) u.abon = { a: [0, 0, 0, 0, 0, 0] };
            u.abon.a[A_CON] = (u.abon.a[A_CON] | 0) - 1;
            if (game.flags) game.flags.botl = true;
            if (game.disp) game.disp.botl = true;
        }
        break;
    case RIN_ADORNMENT:
        if (((obj.owornmask | 0) & W_RING) && u_ring) {
            if (!u.abon) u.abon = { a: [0, 0, 0, 0, 0, 0] };
            u.abon.a[A_CHA] = (u.abon.a[A_CHA] | 0) - 1;
            if (game.flags) game.flags.botl = true;
            if (game.disp) game.disp.botl = true;
        }
        break;
    case RIN_INCREASE_ACCURACY:
        if (((obj.owornmask | 0) & W_RING) && u_ring) {
            u.uhitinc = (u.uhitinc | 0) - 1;
        }
        break;
    case RIN_INCREASE_DAMAGE:
        if (((obj.owornmask | 0) & W_RING) && u_ring) {
            u.udaminc = (u.udaminc | 0) - 1;
        }
        break;
    case RIN_PROTECTION:
        /* C :1430–1432 — u_ring only, no owornmask & W_RING */
        if (u_ring) {
            if (game.flags) game.flags.botl = true;
            if (game.disp) game.disp.botl = true;
        }
        break;
    case HELM_OF_BRILLIANCE:
        if (((obj.owornmask | 0) & W_ARMH) && obj === u.uarmh) {
            if (!u.abon) u.abon = { a: [0, 0, 0, 0, 0, 0] };
            u.abon.a[A_INT] = (u.abon.a[A_INT] | 0) - 1;
            u.abon.a[A_WIS] = (u.abon.a[A_WIS] | 0) - 1;
            if (game.flags) game.flags.botl = true;
            if (game.disp) game.disp.botl = true;
        }
        break;
    case GAUNTLETS_OF_DEXTERITY:
        if (((obj.owornmask | 0) & W_ARMG) && obj === u.uarmg) {
            if (!u.abon) u.abon = { a: [0, 0, 0, 0, 0, 0] };
            u.abon.a[A_DEX] = (u.abon.a[A_DEX] | 0) - 1;
            if (game.flags) game.flags.botl = true;
            if (game.disp) game.disp.botl = true;
        }
        break;
    default:
        break;
    }
    if (game.disp?.botl || game.flags?.botl) {
        await bot();
    }
    if ((obj.where | 0) === OBJ_INVENT) {
        update_inventory();
    }
    return true;
}

/**
 * C ref: zap.c bhito — floor object hit by wand.
 * Envelope: WAN_POLYMORPH; WAN_PROBING (D-1445; observe + container
 * peek / tin known / egg known; learn iff res); WAN_CANCELLATION;
 * WAN_STRIKING boulder/statue/hero_breaks|breaks; SPE_DRAIN_LIFE
 * drain_item (D-1453; void return so res stays 1); WAN_TELEPORTATION
 * rloco; WAN_UNDEAD_TURNING floor corpse/egg thin revive;
 * SPE_STONE_TO_FLESH stone_to_flesh_obj (D-1461; invent ok —
 * C `:2178–2179` floor-or-STONE); WAN_OPENING/SPE_KNOCK/
 * WAN_LOCKING/SPE_WIZARD_LOCK boxlock (D-1467; learn iff
 * Klunk/Klick); uchain WAN_OPENING/SPE_KNOCK unpunish
 * (D-1481; C `:2181–2188` before the otyp switch; uball
 * always res=0); poly-arm Is_box boxlock reset_pick
 * (D-1483; C `:2202–2204` after unpolyable, before shudder;
 * callee POLY returns false so res stays 1). Named:
 * polypiles/livelog; hideunder cover; muse.c mbhit fhito_loc /
 * destroy_drawbridge (doorlock is D-1484).
 * zap_updown SPE_STONE_TO_FLESH is D-1466.
 * @returns {Promise<number>} 1 if affected
 */
async function bhito(obj, otmp) {
    if (!obj || !otmp || obj === otmp) return 0;
    if (obj.bypass && game.context?.bypasses) return 0;

    let res = 1;
    let learn_it = false;

    /* C zap.c bhito :2181–2188 — uball never affected; uchain
     * + WAN_OPENING/SPE_KNOCK → learn_it + unpunish (res stays 1);
     * other otyps on uchain → res=0. Both skip the otyp switch. */
    if (obj === game.u?.uball) {
        res = 0;
    } else if (obj === game.u?.uchain) {
        if ((otmp.otyp | 0) === WAN_OPENING || (otmp.otyp | 0) === SPE_KNOCK) {
            learn_it = true;
            unpunish();
        } else {
            res = 0;
        }
    } else switch (otmp.otyp) {
    case WAN_POLYMORPH:
    case SPE_POLYMORPH:
        if (obj_unpolyable(obj)) {
            res = 0;
            break;
        }
        /* C zap.c bhito :2202–2204 — lock context is obsolete if
         * the zapped floor object is a box. boxlock POLY only
         * reset_pick when xlock.box == obj (D-1483). (void) so
         * res stays 1. polypiles/livelog named. */
        if (Is_box(obj)) {
            await boxlock(obj, otmp);
        }
        if (obj_shudders(obj)) {
            if (cansee(obj.ox, obj.oy)) learn_it = true;
            do_osshock(obj);
            break;
        }
        {
            const neu = await poly_obj(obj, STRANGE_OBJECT);
            if (neu) newsym(neu.ox, neu.oy);
        }
        break;
    case WAN_PROBING:
        /* C zap.c bhito :2222–2274 */
        res = !obj.dknown ? 1 : 0;
        observe_object(obj);
        if (Is_container(obj) || (obj.otyp | 0) === STATUE) {
            obj.cknown = 1;
            obj.lknown = 1;
            if (Is_box(obj) && !obj.tknown) {
                if (obj.otrapped) {
                    await pline(`${Tobjnam_zap(obj, 'are')} trapped!`);
                }
                obj.tknown = 1;
            }
            if (!obj.cobj) {
                await pline(`${Tobjnam_zap(obj, 'are')} empty.`);
            } else if (SchroedingersBox(obj)) {
                await You(
                    `aren't sure whether ${the(xname(obj))} has ${
                        an(Hallucination() ? rndmonnam(null) : 'cat')
                    } or its corpse inside.`,
                );
                obj.cknown = 0;
            } else {
                for (let o = obj.cobj; o; o = o.nobj) observe_object(o);
                await display_cinventory(obj);
            }
            res = 1;
        } else if ((obj.otyp | 0) === TIN) {
            if (!obj.known || !obj.cknown) res = 1;
            obj.known = 1;
            set_cknown_lknown(obj);
        } else if ((obj.otyp | 0) === EGG) {
            if (!obj.known && (obj.corpsenm ?? NON_PM) !== NON_PM) {
                res = 1;
            }
            obj.known = 1;
        }
        if (res) learn_it = true;
        break;
    case WAN_CANCELLATION:
    case SPE_CANCELLATION:
        await cancel_item(obj);
        newsym(obj.ox | 0, obj.oy | 0);
        break;
    case SPE_DRAIN_LIFE:
        /* C zap.c bhito :2318–2320 — drain_item(obj, TRUE); void
         * so res stays 1. Does not set learn_it. */
        await drain_item(obj, true);
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
    case WAN_OPENING:
    case SPE_KNOCK:
    case WAN_LOCKING:
    case SPE_WIZARD_LOCK:
        /* C zap.c bhito :2393–2403 — Is_box → boxlock; else res=0.
         * learn_it iff boxlock returned true (Klunk/Klick).
         * uchain unpunish is D-1481 (before this switch).
         * poly-arm boxlock reset_pick is D-1483. */
        if (Is_box(obj)) {
            res = (await boxlock(obj, otmp)) ? 1 : 0;
        } else {
            res = 0;
        }
        if (res) learn_it = true;
        break;
    case SPE_STONE_TO_FLESH:
        /* C zap.c bhito :2412–2414 — stone_to_flesh_obj; no learn_it. */
        res = await stone_to_flesh_obj(obj);
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
 * doorlock WAN_OPENING/SPE_KNOCK is D-1462; WAN_LOCKING/SPE_WIZARD_LOCK
 * is D-1475; WAN_STRIKING/SPE_FORCE_BOLT is D-1482 (`:4056–4074`;
 * callee lock.c `:1103–1272`; learnwand also if WAN_STRIKING &&
 * !Deaf; D_BROKEN shop add_damage + pay_for_damage destroy).
 * zap_map from lateral ZAPPED_WAND is D-1489 (`:3919–3924`;
 * callee `zap_map` `:3685–3717` OPENING/LOCKING/STRIKING).
 * Named omit: THROWN_WEAPON fly callers (throwit still inlines those
 * and still skips WEB / shade / mimic-object); FLASHED_LIGHT DISP_BEAM /
 * INVIS_BEAM stop; shkcatch pick; map_invisible / unmap_object;
 * skiprange rocks. show_transient_light is D-1597; bhit `!Blind`
 * is youprop.h:103 (D-1604).
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
    let shopdoor = false;
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
            let typ = loc?.typ;

            // C: WATERWALL / LAVAWALL stop thrown/kicked items
            if ((weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
                && (IS_WATERWALL(typ) || typ === LAVAWALL)) {
                break;
            }
            // C zap.c bhit :3901–3917 — thrown/kicked lamplit +
            // FLASHED_LIGHT show_transient_light before iron bars
            // (D-1597). !Blind is youprop.h:103, not sticky
            // u.Blind||u.ublind (D-1604).
            if (weapon === THROWN_WEAPON || weapon === KICKED_WEAPON) {
                if (obj?.lamplit && !Blind()) {
                    await show_transient_light(obj, x, y);
                }
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
            } else if (weapon === FLASHED_LIGHT) {
                if (!Blind()) await show_transient_light(null, x, y);
            }

            if (weapon === ZAPPED_WAND) {
                /* C zap.c bhit :3919–3924 — cancellation/opening/
                 * locking/striking/probing before m_at (D-1489). */
                await zap_map(x, y, obj);
                /* terrain might have changed (exposed secret door|corridor) */
                typ = loc?.typ;
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

            if (weapon === ZAPPED_WAND && (IS_DOOR(typ) || typ === SDOOR)) {
                /* C zap.c bhit :4056–4074 — doorlock WAN_OPENING/
                 * SPE_KNOCK (D-1462) + WAN_LOCKING/SPE_WIZARD_LOCK
                 * (D-1475) + WAN_STRIKING/SPE_FORCE_BOLT (D-1482).
                 * JS had typ===STONE (wrong); C is SDOOR.
                 * learnwand if cansee or (WAN_STRIKING && !Deaf).
                 * D_BROKEN shop add_damage + pay_for_damage after
                 * the walk (`:4129–4130`). */
                const otyp = obj?.otyp | 0;
                if (otyp === WAN_OPENING || otyp === SPE_KNOCK
                    || otyp === WAN_LOCKING || otyp === SPE_WIZARD_LOCK
                    || otyp === WAN_STRIKING || otyp === SPE_FORCE_BOLT) {
                    if (await doorlock(obj, x, y)) {
                        if (cansee(x, y)
                            || (otyp === WAN_STRIKING && !Deaf())) {
                            learnwand(obj);
                        }
                        if ((loc?.doormask | 0) === D_BROKEN
                            && in_rooms(x, y, SHOPBASE)) {
                            shopdoor = true;
                            const { add_damage } = await import('./shk.js');
                            add_damage(x, y, SHOP_DOOR_COST);
                        }
                    }
                }
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
    /* C zap.c bhit :4129–4130 — after tmp_at END, skipped on
     * goto bhit_done (thrown/kicked monster). */
    if (shopdoor) {
        const { pay_for_damage } = await import('./shk.js');
        await pay_for_damage('destroy', false);
    }
    /* C zap.c bhit :4132–4136 — FLASHED_LIGHT cleanup is the caller's;
     * thrown/kicked always cleanup here (bhit_done). */
    if (weapon === THROWN_WEAPON || weapon === KICKED_WEAPON) {
        await transient_light_cleanup();
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

export { zapsetup, bhito, bhit, zap_map };

/**
 * C trap.h undestroyable_trap — portal / vibrating square.
 * maybe_explode_trap (D-1476) uses the same predicate as trap.c.
 */
function undestroyable_trap(ttyp) {
    return (ttyp | 0) === MAGIC_PORTAL || (ttyp | 0) === VIBRATING_SQUARE;
}

/**
 * C zap.c maybe_explode_trap :3594–3623 — cancellation vs trap.
 * Magical traps explode (TRAP_EXPLODE); undestroyable shield+tseen.
 * Ordinary pits/holes are a no-op. Must not destroy otmp.
 */
async function maybe_explode_trap(ttmp, otmp, learn) {
    if (!ttmp || !otmp) return;
    const otyp = otmp.otyp | 0;
    if (otyp !== WAN_CANCELLATION && otyp !== SPE_CANCELLATION) return;
    const x = ttmp.tx | 0;
    const y = ttmp.ty | 0;
    if (undestroyable_trap(ttmp.ttyp | 0)) {
        await shieldeff(x, y);
        if (cansee(x, y)) {
            ttmp.tseen = 1;
            newsym(x, y);
            learn.v = true;
        }
    } else if (is_magical_trap(ttmp.ttyp | 0)) {
        const seeit = cansee(x, y);
        /* C :3614 — explosion mustn't destroy otmp */
        await explode(
            x, y, -WAN_CANCELLATION, 20 + d(3, 6),
            TRAP_EXPLODE, EXPL_MAGICAL,
        );
        deltrap(ttmp);
        newsym(x, y);
        if (seeit) learn.v = true;
    }
}

/**
 * C zap.c zap_map :3628–3800 — cancel trap + down engraving (D-1476)
 * then !u.dz lateral drawbridge (D-1489; `:3685–3717`) then
 * WAN_PROBING terrain/trap (D-1444). Caller zap_updown down
 * (D-1444/D-1485) and bhit ZAPPED_WAND (D-1489 `:3919–3924`).
 * Named: force_decor ice/furniture; draft_message Rogue SDOOR;
 * Invocation_lev vibrating-square "the".
 */
async function zap_map(x, y, obj) {
    if (!obj) return;
    let ttmp = t_at(x, y);
    const learn = { v: false };

    /* C :3641–3643 — cancellation before engraving / probing. */
    await maybe_explode_trap(ttmp, obj, learn);
    ttmp = t_at(x, y);

    if ((game.u?.dz | 0) > 0) {
        /* C :3645–3683 — down-zap engravings; none sets disclose. */
        const e = engr_at(x, y);
        if (e && (e.engr_type | 0) !== HEADSTONE) {
            switch (obj.otyp | 0) {
            case WAN_POLYMORPH:
            case SPE_POLYMORPH: {
                del_engr(e);
                const rndengr = random_engraving();
                make_engr_at(
                    x, y, rndengr.text, rndengr.pristine,
                    game.moves | 0, 0,
                );
                break;
            }
            case WAN_CANCELLATION:
            case SPE_CANCELLATION:
            case WAN_MAKE_INVISIBLE:
                del_engr(e);
                break;
            case WAN_TELEPORTATION:
            case SPE_TELEPORT_AWAY:
                rloc_engr(e);
                break;
            case SPE_STONE_TO_FLESH:
                if ((e.engr_type | 0) === ENGRAVE) {
                    await pline(Hallucination()
                        ? 'The floor runs like butter!'
                        : 'The edges on the floor get smoother.');
                    wipe_engr_at(x, y, d(2, 4), true);
                }
                break;
            case WAN_STRIKING:
            case SPE_FORCE_BOLT:
                wipe_engr_at(x, y, d(2, 4), true);
                break;
            default:
                break;
            }
        }
    } else if (!(game.u?.dz | 0)) {
        /* C :3685–3717 — lateral drawbridge (D-1489).
         * Up/down drawbridge is zap_updown (D-1454/D-1456/D-1465). */
        const ltyp = game.level?.at?.(x, y)?.typ | 0;
        const dbxy = { x: x | 0, y: y | 0 };
        if (find_drawbridge(dbxy)) {
            switch (obj.otyp | 0) {
            case WAN_OPENING:
            case SPE_KNOCK:
                /* dbwall: closed portcullis of a raised bridge */
                if (is_db_wall(x, y)) {
                    if (cansee(dbxy.x, dbxy.y) || cansee(x, y)) {
                        learn.v = true;
                    }
                    await open_drawbridge(dbxy.x, dbxy.y);
                }
                break;
            case WAN_LOCKING:
            case SPE_WIZARD_LOCK:
                /* learn only when the remapped span is lowered */
                if ((cansee(dbxy.x, dbxy.y) || cansee(x, y))
                    && (game.level?.at?.(dbxy.x, dbxy.y)?.typ | 0)
                        === DRAWBRIDGE_DOWN) {
                    learn.v = true;
                }
                await close_drawbridge(dbxy.x, dbxy.y);
                break;
            case WAN_STRIKING:
            case SPE_FORCE_BOLT:
                /* !DRAWBRIDGE_UP: lowered span or portcullis, not
                 * the empty moat in front of a raised bridge */
                if (ltyp !== DRAWBRIDGE_UP) {
                    learn.v = true;
                    await destroy_drawbridge(dbxy.x, dbxy.y);
                }
                break;
            default:
                break;
            }
        }
    }

    if ((obj.otyp | 0) === WAN_PROBING) {
        const oldtyp = game.lastseentyp?.[x]?.[y] | 0;
        const loc0 = game.level?.at?.(x, y);
        const oldglyph = loc0
            ? `${loc0.disp_ch ?? ''}|${loc0.disp_kind ?? ''}|${loc0.disp_color ?? ''}`
            : '';
        show_map_spot(x, y, false);
        const loc1 = game.level?.at?.(x, y);
        const newglyph = loc1
            ? `${loc1.disp_ch ?? ''}|${loc1.disp_kind ?? ''}|${loc1.disp_color ?? ''}`
            : '';
        if ((game.lastseentyp?.[x]?.[y] | 0) !== oldtyp || newglyph !== oldglyph) {
            learn.v = true;
        }
        const ltyp = SURFACE_AT(x, y);
        if (ltyp === SDOOR) {
            if (loc1) cvt_sdoor_to_door(loc1);
            recalc_block_point(x, y);
            newsym(x, y);
            if (cansee(x, y)) {
                await pline('Probing reveals a secret door.');
                learn.v = true;
            }
            /* Rogue !cansee draft_message named */
        } else if (ltyp === SCORR) {
            if (loc1) loc1.typ = CORR;
            recalc_block_point(x, y);
            newsym(x, y);
            await pline('Probing exposes a secret corridor.');
            learn.v = true;
        } else if (ltyp === ICE || IS_FURNITURE(ltyp)) {
            if ((game.u?.dz | 0) > 0) {
                /* force_decor(TRUE) named */
                learn.v = true;
            }
        }
        if (ttmp) {
            const t_already_seen = ttmp.tseen | 0;
            const hallu = Hallucination();
            ttmp.tseen = 1;
            newsym(x, y);
            if (!t_already_seen || hallu) {
                const ttmpname = trapname(ttmp.ttyp, false);
                /* Invocation_lev vibrating-square "the" named */
                const use_the = hallu ? !rn2(4) : false;
                await You(`find ${use_the ? the(ttmpname) : an(ttmpname)}${use_the ? '!' : '.'}`);
                /* C :3793 — assign, not OR */
                learn.v = !hallu;
            }
        }
    }

    if (learn.v) learnwand(obj);
}

/** C dungeon.c on_level — same dnum/dlevel. zap_updown quest stairs. */
function on_level_updown(a, b) {
    return (a?.dnum | 0) === (b?.dnum | 0)
        && (a?.dlevel | 0) === (b?.dlevel | 0);
}

/** C dungeon.h / quest.h Is_qstart — on_level vs qstart_level. */
function Is_qstart_updown(lev) {
    return on_level_updown(lev, game.qstart_level);
}

/**
 * C youprop.h Levitation — (HLevitation || ELevitation) && !BLevitation.
 * Sticky u.Levitation is not a C field (D-1070). zap_updown D-1466.
 */
function Levitation_updown() {
    const u = game.u || {};
    return !!(((u.HLevitation | 0) || (u.ELevitation | 0))
        && !(u.BLevitation | 0));
}

/**
 * C zap.c zap_updown :3219–3411 — IMMEDIATE wand/spell up or down.
 * WAN_PROBING :3236–3262 (D-1444; early return; own bhitpile).
 * WAN_OPENING/SPE_KNOCK :3263–3288 (D-1454) then shared down
 * bhitpile+zap_map / up hideunder bhito :3382–3408.
 * WAN_STRIKING/SPE_FORCE_BOLT :3290–3354 (D-1456; striking=TRUE
 * FALLTHROUGH into locking body). WAN_LOCKING/SPE_WIZARD_LOCK
 * :3295–3354 (D-1465; !striking close_drawbridge / closeholdingtrap
 * / hole→trapdoor). SPE_STONE_TO_FLESH :3355–3377 (D-1466; C has
 * no WAN_STONE_TO_FLESH) then shared down bhitpile+zap_map / up
 * hideunder. default :3378–3379 break into that epilogue so
 * unmounted down POLY/cancel/invis/tele hit zap_map (D-1485).
 * zap_map engraving/cancel trap is D-1476.
 * zap_map lateral drawbridge + bhit zap_map is D-1489.
 * bhito boxlock is D-1467.
 */
async function zap_updown(obj) {
    if (!obj) return false;
    const x = game.u?.ux | 0;
    const y = game.u?.uy | 0;
    const dz = game.u?.dz | 0;
    let disclose = false;
    /* C :3233 — trap snapshot before switch (drawbridge may move hero). */
    const ttmp = t_at(x, y);

    switch (obj.otyp | 0) {
    case WAN_PROBING: {
        /* C zap.c :3236–3262 */
        let ptmp = 0;
        if (dz < 0) {
            await You(`probe towards the ${ceiling_updown(x, y)}.`);
        } else {
            const rememberedltyp = update_mapseen_for(x, y);
            ptmp += await bhitpile(obj, bhito, x, y, dz);
            const ltyp = SURFACE_AT(x, y);
            await zap_map(x, y, obj);
            let surf;
            if (ltyp === ICE || IS_FURNITURE(ltyp)) {
                surf = 'it';
                if ((game.lastseentyp?.[x]?.[y] | 0) !== rememberedltyp) {
                    ptmp += 1;
                }
            } else {
                surf = the(surface_zap(x, y));
            }
            await You(`probe beneath ${surf}.`);
            ptmp += await display_binventory(x, y, true);
        }
        if (!ptmp) await Your('probe reveals nothing.');
        return true;
    }
    case WAN_OPENING:
    case SPE_KNOCK: {
        /* C zap.c :3263–3288 */
        let stway = game.stairs;
        while (stway) {
            if (!stway.isladder && !stway.up
                && (stway.tolev?.dnum | 0) === (game.u?.uz?.dnum | 0)) {
                break;
            }
            stway = stway.next;
        }
        const dbxy = { x, y };
        if (is_db_wall(x, y) && find_drawbridge(dbxy)) {
            await open_drawbridge(dbxy.x, dbxy.y);
            disclose = true;
        } else if (dz > 0 && stway && (stway.sx | 0) === x
            && (stway.sy | 0) === y
            && on_level_updown(game.u?.uz, game.qstart_level)
            && !ok_to_quest()) {
            await pline('The stairs seem to ripple momentarily.');
            disclose = true;
        }
        if (dz > 0 && (game.u?.utrap | 0)) {
            const hold = await openholdingtrap(
                game.youmonst || { _youmonst: true },
            );
            if (hold.noticed) disclose = true;
        } else if (dz > 0 && !(game.u?.utrap | 0)) {
            const fall = await openfallingtrap(
                game.youmonst || { _youmonst: true },
                false,
            );
            if (fall.noticed) disclose = true;
        }
        break;
    }
    case WAN_STRIKING:
    case SPE_FORCE_BOLT:
    case WAN_LOCKING:
    case SPE_WIZARD_LOCK: {
        /* C zap.c :3290–3354 — striking=TRUE FALLTHROUGH into locking. */
        const otyp = obj.otyp | 0;
        const striking = otyp === WAN_STRIKING || otyp === SPE_FORCE_BOLT;
        const dbxy = { x, y };
        const levtyp = game.level?.at(x, y)?.typ | 0;
        const db_hit = (levtyp === DRAWBRIDGE_DOWN)
            ? (dz > 0)
            : (is_drawbridge_wall(x, y) >= 0 && !is_db_wall(x, y));
        if (db_hit && find_drawbridge(dbxy)) {
            /* C :3302–3306 — !striking close_drawbridge (D-1465). */
            if (!striking) await close_drawbridge(dbxy.x, dbxy.y);
            else await destroy_drawbridge(dbxy.x, dbxy.y);
            disclose = true;
        } else if (striking && dz < 0 && rn2(3)
            && !Is_airlevel(game.u?.uz)
            && !Is_waterlevel(game.u?.uz)
            && !(game.u?.uinwater | 0)
            && !Is_qstart_updown(game.u?.uz)) {
            /* C :3310–3320 — disclose stays false. */
            await pline(
                `A rock is dislodged from the ${ceiling_updown(x, y)} and falls on your ${body_part(HEAD)}.`,
            );
            const dmg = rnd(hard_helmet(game.u?.uarmh) ? 2 : 6);
            losehp(maybe_half_phys(dmg), 'falling rock', KILLED_BY_AN);
            if (game._losehp_needs_done || game.program_state?.gameover) {
                await finish_losehp_done();
                return disclose;
            }
            const otmp = mksobj_at(ROCK, x, y, false, false);
            if (otmp) {
                xname(otmp);
                stackobj(otmp);
            }
            newsym(x, y);
        } else if (dz > 0 && ttmp) {
            /* C :3321–3352 — locking closeholdingtrap then hole→trapdoor. */
            let holding = false;
            if (!striking) {
                const closed = await closeholdingtrap(
                    game.youmonst || { _youmonst: true },
                );
                if (closed.noticed) disclose = true;
                holding = closed.happened;
            }
            if (holding) {
                /* C :3322–3323 — now stuck in web or bear trap */
            } else if (striking && (ttmp.ttyp | 0) === TRAPDOOR) {
                if (Blind() && !(ttmp.tseen | 0)) {
                    await pline('Something beneath you shatters.');
                } else if (!(ttmp.tseen | 0)) {
                    await pline("There's a trapdoor beneath you; it shatters.");
                } else {
                    await pline('The trapdoor beneath you shatters.');
                    disclose = true;
                }
                ttmp.ttyp = HOLE;
                ttmp.tseen = 1;
                newsym(x, y);
                await dotrap(ttmp, NO_TRAP_FLAGS);
            } else if (!striking && (ttmp.ttyp | 0) === HOLE) {
                /* C :3339–3351 — locking transforms hole into trapdoor. */
                ttmp.ttyp = TRAPDOOR;
                if (Blind() || !(ttmp.tseen | 0)) {
                    await pline(
                        `Some ${is_ice(x, y) ? 'frost' : 'dust'} swirls beneath you.`,
                    );
                } else {
                    ttmp.tseen = 1;
                    newsym(x, y);
                    await pline('A trapdoor appears beneath you.');
                    disclose = true;
                }
            }
        }
        break;
    }
    case SPE_STONE_TO_FLESH: {
        /* C zap.c :3355–3377 — spell-only; no WAN_STONE_TO_FLESH.
         * Flavor does not set disclose. Then shared epilogue. */
        if (Is_airlevel(game.u?.uz) || Is_waterlevel(game.u?.uz)
            || !!(game.u?.uinwater | 0)
            || (Is_qstart_updown(game.u?.uz) && dz < 0)) {
            await pline(nothing_happens);
        } else if (dz < 0) {
            /* C :3359–3360 — "we should do more..." */
            await pline(`Blood drips on your ${body_part(FACE)}.`);
        } else if (dz > 0 && !objects_at(x, y)) {
            /* C :3361–3375 — skip if ENGRAVE (zap_map D-1476 owns it). */
            const e = engr_at(x, y);
            if (!(e && (e.engr_type | 0) === ENGRAVE)) {
                if (is_pool(x, y) || is_ice(x, y)) {
                    await pline(nothing_happens);
                } else {
                    await pline(
                        `Blood ${is_lava(x, y) ? 'boil' : 'pool'}s ${
                            Levitation_updown() ? 'beneath' : 'at'
                        } your ${makeplural(body_part(FOOT))}.`,
                    );
                }
            }
        }
        break;
    }
    default:
        /* C zap.c :3378–3379 — break into shared down bhitpile
         * + zap_map / up hideunder (D-1485). */
        break;
    }

    /* C zap.c :3382–3408 — PROBING already returned. */
    if (dz > 0) {
        await bhitpile(obj, bhito, x, y, dz);
        await zap_map(x, y, obj);
    } else if (dz < 0) {
        if ((game.u?.uundetected | 0)
            && hides_under(game.youmonst?.data)) {
            const otmp = objects_at(game.u.ux | 0, game.u.uy | 0);
            let hitit = 0;
            if (otmp) hitit = await bhito(otmp, obj);
            if (hitit) {
                hideunder(game.youmonst);
                disclose = true;
            }
        }
    }
    return disclose;
}

/**
 * C zap.c zap_steed :3087–3140 — downward wand/spell while riding.
 * WAN_PROBING probes the steed directly (not via bhitm) (D-1443).
 * WAN_TELEPORTATION / SPE_TELEPORT_AWAY tele() the hero+steed
 * together then learnwand on the same criteria as zapyourself
 * (D-1455). WAN_OPENING / SPE_KNOCK go through bhitm (D-1463).
 * SPE_DRAIN_LIFE goes through bhitm (D-1464; callee D-1436).
 * SPE_HEALING/SPE_EXTRA_HEALING go through bhitm (D-1469).
 * WAN_CANCELLATION / SPE_CANCELLATION go through bhitm
 * (D-1470; callee cancel_monst invent=FALSE).
 * WAN_POLYMORPH / SPE_POLYMORPH go through bhitm
 * (D-1471; callee resist / rn2(25) shock / newcham).
 * WAN_MAKE_INVISIBLE goes through bhitm
 * (D-1473; callee mon_set_minvis / knowninvisible).
 * WAN_STRIKING / SPE_FORCE_BOLT go through bhitm
 * (D-1474; callee :189–217 Boing / d(2,12) / miss).
 * WAN_SLOW_MONSTER / SPE_SLOW_MONSTER go through bhitm
 * (D-1478; callee :218–232 resist NOTELL / mon_adjust_speed(-1)).
 * WAN_SPEED_MONSTER goes through bhitm
 * (D-1479; callee :233–242 resist NOTELL / mon_adjust_speed(+1)
 * / helpful_gesture). SPE_CURE_SICKNESS goes through bhitm
 * (D-1480; callee has no arm — C bhitm default impossible;
 * objects.h oc_dir is NODIR so weffects never reaches this
 * from a real cast). Caller weffects :3437–3439 sets
 * disclose then learnwand again when oc_dir != NODIR.
 */
async function zap_steed(obj) {
    const steed = game.u?.usteed;
    if (!steed || !obj) return false;
    let steedhit = false;
    const bhitpos = game._bhitpos || (game._bhitpos = { x: 0, y: 0 });
    game.bhitpos = bhitpos;
    bhitpos.x = steed.mx | 0;
    bhitpos.y = steed.my | 0;
    game.notonhead = false;
    switch (obj.otyp | 0) {
    case WAN_PROBING:
        /* C zap.c :3099–3103 */
        await probe_monster(steed);
        learnwand(obj);
        steedhit = true;
        break;
    case WAN_TELEPORTATION:
    case SPE_TELEPORT_AWAY: {
        /* C zap.c :3104–3113 — you go together; not bhitm. */
        await tele();
        const u = game.u || {};
        const u0x = u.ux0 | 0;
        const u0y = u.uy0 | 0;
        const dx = (u.ux | 0) - u0x;
        const dy = (u.uy | 0) - u0y;
        if ((Teleport_control() && !Stunned())
            || !couldsee(u0x, u0y)
            || (dx * dx + dy * dy) >= 16) {
            learnwand(obj);
        }
        steedhit = true;
        break;
    }
    case SPE_CURE_SICKNESS:
    case WAN_MAKE_INVISIBLE:
    case WAN_STRIKING:
    case SPE_FORCE_BOLT:
    case WAN_SLOW_MONSTER:
    case SPE_SLOW_MONSTER:
    case WAN_SPEED_MONSTER:
    case WAN_POLYMORPH:
    case SPE_POLYMORPH:
    case WAN_CANCELLATION:
    case SPE_CANCELLATION:
    case SPE_DRAIN_LIFE:
    case SPE_HEALING:
    case SPE_EXTRA_HEALING:
    case WAN_OPENING:
    case SPE_KNOCK:
        /* C zap.c :3115–3134 — Default processing via bhitm().
         * SPE_CURE_SICKNESS is D-1480 (callee bhitm has no
         * arm; C default impossible; objects.h NODIR so
         * weffects :3437 skips zap_steed on a real cast;
         * spell.c self healup is D-1398).
         * WAN_SPEED_MONSTER is D-1479 (callee bhitm :233–242
         * !resist NOTELL then seemimic + mon_adjust_speed(+1)
         * + check_gear_next_turn; helpful_gesture always).
         * WAN_SLOW_MONSTER/SPE_SLOW_MONSTER is D-1478 (callee
         * bhitm :218–232 !resist NOTELL then seemimic +
         * mon_adjust_speed(-1) + check_gear_next_turn).
         * WAN_STRIKING/SPE_FORCE_BOLT is D-1474 (callee bhitm
         * :189–217 Boing / d(2,12)+spell_damage_bonus / miss).
         * WAN_MAKE_INVISIBLE is D-1473 (callee bhitm
         * :348–368 mon_set_minvis / knowninvisible).
         * WAN/SPE_POLYMORPH is D-1471 (callee bhitm
         * :263–334 resist / rn2(25) shock / newcham).
         * WAN/SPE_CANCELLATION is D-1470 (callee bhitm
         * :335–340 cancel_monst invent=FALSE).
         * SPE_DRAIN_LIFE is D-1464 (callee bhitm D-1436).
         * SPE_HEALING/SPE_EXTRA_HEALING is D-1469 (callee
         * bhitm :433–473). Saddle drop / SPE_KNOCK mhurtle
         * live in bhitm (D-0981). */
        await bhitm(steed, obj);
        steedhit = true;
        break;
    default:
        steedhit = false;
        break;
    }
    return steedhit;
}

/**
 * C ref: zap.c weffects — exercise + effect dispatch.
 * NODIR + RAY wand ubuzz; IMMEDIATE bhit WAN_POLYMORPH /
 * SPE_FORCE_BOLT (D-1388); SPE_DRAIN_LIFE (D-1436);
 * WAN_DIGGING/SPE_DIG → zap_dig (SPE_DIG cast D-1441);
 * RAY SPE_MAGIC_MISSILE..SPE_FINGER_OF_DEATH ubuzz (D-1386)
 * including SPE_SLEEP (D-1440), SPE_MAGIC_MISSILE (D-1448),
 * and SPE_FINGER_OF_DEATH (D-1449) wand-duplicate;
 * SPE_KNOCK IMMEDIATE bhit (D-1450; bhitm D-0981);
 * SPE_SLOW_MONSTER IMMEDIATE bhit (D-1451; bhitm D-1424;
 * zapyourself D-1433);
 * SPE_WIZARD_LOCK IMMEDIATE bhit (D-1452; bhitm D-1425;
 * zapyourself D-1434).
 * SPE_TURN_UNDEAD IMMEDIATE bhit (D-1458; bhitm unturn_dead
 * + undead dmg D-0955; zapyourself unturn_you D-0955).
 * SPE_POLYMORPH IMMEDIATE bhit (D-1459; bhitm WAN/SPE/POT
 * poly live; zapyourself !Unchanging polyself D-0156).
 * SPE_CANCELLATION IMMEDIATE bhit (D-1460; bhitm WAN/SPE
 * cancel_monst live; zapyourself cancel_monst(&youmonst) live).
 * SPE_STONE_TO_FLESH IMMEDIATE bhit (D-1461; bhitm golem/mimic;
 * zapyourself polymon/Stoned/invent; bhito stone_to_flesh_obj).
 * SPE_TELEPORT_AWAY IMMEDIATE bhit (D-1468; bhitm
 * u_teleport_mon; zapyourself tele(); bhito rloco).
 * SPE_HEALING/SPE_EXTRA_HEALING IMMEDIATE bhit (D-1469;
 * bhitm healmon; zapyourself healup D-0135; zap_steed
 * via bhitm).
 * zap_steed WAN_PROBING (D-1443); zap_steed WAN_TELEPORTATION /
 * SPE_TELEPORT_AWAY (D-1455); zap_steed WAN_OPENING/SPE_KNOCK
 * via bhitm (D-1463); zap_steed SPE_DRAIN_LIFE via bhitm
 * (D-1464); zap_steed SPE_HEALING/SPE_EXTRA_HEALING via
 * bhitm (D-1469); zap_steed WAN_CANCELLATION/SPE_CANCELLATION
 * via bhitm (D-1470); zap_steed WAN_POLYMORPH/SPE_POLYMORPH
 * via bhitm (D-1471); zap_steed WAN_MAKE_INVISIBLE via
 * bhitm (D-1473); zap_steed WAN_STRIKING/SPE_FORCE_BOLT
 * via bhitm (D-1474); zap_steed WAN_SLOW_MONSTER/
 * SPE_SLOW_MONSTER via bhitm (D-1478); zap_steed
 * WAN_SPEED_MONSTER via bhitm (D-1479); zap_steed
 * SPE_CURE_SICKNESS via bhitm (D-1480); zap_updown WAN_PROBING (D-1444);
 * zap_updown WAN_OPENING/SPE_KNOCK (D-1454); zap_updown
 * WAN_STRIKING/SPE_FORCE_BOLT (D-1456); zap_updown
 * WAN_LOCKING/SPE_WIZARD_LOCK (D-1465); zap_updown
 * SPE_STONE_TO_FLESH (D-1466); zap_updown default down
 * POLY/cancel/invis/tele bhitpile+zap_map (D-1485);
 * zap_map engraving/cancel trap is D-1476; zap_map lateral
 * drawbridge + bhit zap_map is D-1489; doorlock STRIKING
 * is D-1482; LOCKING is D-1475.
 */
export async function weffects(obj) {
    const otyp = obj.otyp;
    const oc = game.objects?.[otyp];
    let disclose = false;
    const was_unkn = !oc?.oc_name_known;

    exercise(A_WIS, true);

    /* C zap.c weffects :3437–3439 — mounted downward zap hits the
     * steed first. WAN_PROBING is D-1443; WAN_TELEPORTATION /
     * SPE_TELEPORT_AWAY is D-1455; WAN_OPENING/SPE_KNOCK via
     * bhitm is D-1463; SPE_DRAIN_LIFE via bhitm is D-1464;
     * SPE_HEALING/SPE_EXTRA_HEALING via bhitm is D-1469;
     * WAN_CANCELLATION/SPE_CANCELLATION via bhitm is D-1470;
     * WAN_POLYMORPH/SPE_POLYMORPH via bhitm is D-1471;
     * WAN_MAKE_INVISIBLE via bhitm is D-1473;
     * WAN_STRIKING/SPE_FORCE_BOLT via bhitm is D-1474;
     * WAN_SLOW_MONSTER/SPE_SLOW_MONSTER via bhitm is D-1478;
     * WAN_SPEED_MONSTER via bhitm is D-1479;
     * SPE_CURE_SICKNESS via bhitm is D-1480 (objects.h NODIR
     * so this prefix does not run on a real cast);
     * remaining zap_steed otyps return false and fall through
     * (named). */
    if (game.u?.usteed && oc && oc.oc_dir !== NODIR
        && !(game.u.dx | 0) && !(game.u.dy | 0)
        && (game.u.dz | 0) > 0
        && await zap_steed(obj)) {
        disclose = true;
    } else if (oc?.oc_dir === IMMEDIATE) {
        zapsetup();
        if (game.u?.uswallow) {
            if (game.u.ustuck) await bhitm(game.u.ustuck, obj);
        } else if (game.u?.dz) {
            disclose = await zap_updown(obj);
        } else {
            const range = rn1(8, 6);
            const pref = { obj };
            await bhit(game.u.dx | 0, game.u.dy | 0, range, ZAPPED_WAND,
                bhitm, bhito, pref);
            // C may null *pobj if destroyed — wand is hero's, keep
        }
        await zapwrapup();
    } else if (oc?.oc_dir === NODIR) {
        await zapnodir(obj);
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
 * C ref: invent.c useupall `:1312–1317` — setnotworn + freeinv + obfree.
 * Named omit: obfree contents/oextra; update_inventory (C dozap
 * backfire returns before the trailing update_inventory).
 */
function useupall_invent(obj) {
    if (!obj) return;
    setnotworn(obj);
    const inv = game.invent || [];
    const idx = inv.indexOf(obj);
    if (idx >= 0) inv.splice(idx, 1);
    freeinv_core(obj);
    obj.quan = 0;
    obj.where = OBJ_FREE;
}

/**
 * C ref: zap.c backfire `:2605–2614` — cursed-wand explode.
 * in_use before losehp so a fatal done() still sees the wand;
 * C done() is noreturn so skip useupall when JS losehp is fatal.
 */
async function backfire(otmp) {
    otmp.in_use = true;
    await pline(`${The(xname(otmp))} suddenly explodes!`);
    const dmg = d((otmp.spe | 0) + 2, 6);
    losehp(maybe_half_phys(dmg), 'exploding wand', KILLED_BY_AN);
    if (game._losehp_needs_done || game.program_state?.gameover) {
        await finish_losehp_done();
        return;
    }
    useupall_invent(otmp);
}

/**
 * C ref: zap.c dozap / #zap ('z')
 * Self-zap losehp uses killer_xname + uhim (D-1345; C `:2661–2663`).
 * Cursed `rn2(WAND_BACKFIRE_CHANCE)==0` → backfire then exercise STR
 * (D-1416; C `:2647–2652`). Named omit: throwit `:1747` / pickup /
 * wield / invent / mthrowu / do_wear remaining killer_xname;
 * spe<0 dust useupall.
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
        await backfire(obj); /* the wand blows up in your face! */
        if (game.program_state?.gameover) return 1;
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
