// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), hack.c domove().
//
// Minimal skeleton: only hjklyubn movement is implemented.
// Contestants should add: search, kick, eat, drink, read, zap,
// wear, wield, drop, throw, pray, cast, and all other commands.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import {
    newsym, show_glyph_cell, flush_screen, pline, append_pline, clear_pending_message, docrt,
    serialize_terminal_grid, queue_more_prompt, topline_can_pack_message,
    apply_hallucination_display_transition, refresh_swallowed_overlay,
    see_monsters, see_objects, see_nearby_objects, see_traps, refresh_warning_monsters, map_level_for_wizard,
    object_glyph_for_menu, serialize_known_terrain_view_screen, terrain_glyph, cls,
} from './display.js';
import { cansee, couldsee, vision_recalc, vision_reset } from './vision.js';
import {
    makemon, mklev, mkobj, mkcorpstat, mksobj, monster_by_user_name, monsterPtr,
    next_ident, place_lregion, place_object, shopTypeName, u_on_dnstairs, u_on_upstairs,
    bones_file_exists, save_bones_snapshot, undead_to_corpse_ptr,
    level_difficulty, set_malign_basic, stackobj, restore_pending_bones_snapshot, delete_pending_bones_file,
    clear_pending_bones_restore, MONSTER_SYMBOLS, pick_polyself_random_form,
} from './mklev.js';
import {
    OBJECT_CHARGED, OBJECT_CLASS, OBJECT_DELAY, OBJECT_DIR, OBJECT_MATERIAL, OBJECT_PROB, OBJECT_WEIGHT,
} from './object_data.js';
import {
    finish_deferred_monster_pet_hit, finish_deferred_pet_kill_side_effect,
    finish_pet_kill, obj_resists, pet_arrive_with_you,
} from './dog.js';
import { calculated_armor_class, merge_inventory_object, newuexp, pluslvl } from './u_init.js';
import { adjalign, exercise, gethungry, maybe_update_seer_turn } from './allmain_turns.js';
import { roleGod, roleGreeting, roleRankForLevel, rankIndexForLevel } from './roles.js';
import { d, rn1, rn2, rnd, rnl, rnz } from './rng.js';
import { dist2 } from './hacklib.js';
import { getObjectDescription } from './o_init.js';
import { getRumor, hallucinatedLiquidName, randomHallucinatedMonsterName, wipeoutText } from './random_text.js';
import {
    finish_deferred_monster_breath_ray,
    finish_deferred_monster_magic_spell_effect,
    finish_deferred_monster_passive_counterattack,
    finish_deferred_monster_physical_attack,
    finish_deferred_monster_physical_knockback_only,
    finish_deferred_monster_trap_effect,
    finish_pending_swallowed_expulsion,
    monster_projectile_destroyed_by_hit,
} from './monmove.js';
import { writeSavedGame } from './save_restore.js';
import { vfsReadFile, vfsWriteFile } from './storage.js';
import {
    ATR_INVERSE, NO_COLOR, CLR_BLACK, CLR_BLUE, CLR_BRIGHT_BLUE, CLR_BRIGHT_GREEN,
    CLR_BRIGHT_MAGENTA, CLR_BROWN, CLR_CYAN, CLR_GRAY, CLR_MAGENTA, CLR_ORANGE, CLR_RED,
    CLR_WHITE,
} from './terminal.js';
import * as C from './const.js';
import { initrack } from './track.js';
import {
    COLNO, ROWNO, STONE, CORR, DOOR, D_NODOOR, D_CLOSED, D_LOCKED,
    SDOOR, SCORR, IS_WALL, IS_OBSTRUCTED, IS_POOL, IS_SOFT, LR_UPTELE, LR_DOWNTELE, A_STR, A_DEX, A_CON, A_WIS,
} from './const.js';

const M1_POIS = 0x10000000;

function refreshWarningAfterHeroMove() {
    if (!game.u?.uprops?.warning) return;
    if (game.u?.uhallucination || game.u?.uprops?.hallucination) return;
    refresh_warning_monsters();
}

// Direction deltas: y u k
//                   h . l
//                   b j n
const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };
const RUN_KEY = { H: 'h', L: 'l', J: 'j', K: 'k', Y: 'y', U: 'u', B: 'b', N: 'n' };
const CONFUSED_DIRS = [
    { dx: -1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 },
    { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 1 }, { dx: -1, dy: 1 },
];

const AMULET_OF_LIFE_SAVING = 202;
const AMULET_OF_UNCHANGING = 207;
const AMULET_OF_GUARDING = 210;
const GRAY_DRAGON_SCALE_MAIL = 101;
const ORCISH_RING_MAIL = 133;
const HAWAIIAN_SHIRT = 136;
const ORCISH_CLOAK = 140;
const DWARVISH_CLOAK = 141;
const OILSKIN_CLOAK = 145;
const WAN_LIGHT = 410;
const WAN_WISHING = 414;
const WAN_FIRE = 430;
const WAN_COLD = 431;
const WAN_SLEEP = 432;
const WAN_DEATH = 433;
const WAN_LIGHTNING = 434;
const WAN_MAKE_INVISIBLE = 418;
const WAN_SECRET_DOOR_DETECTION = 411;
const WAN_POLYMORPH = 422;
const WAN_DIGGING = 428;
const WAN_MAGIC_MISSILE = 429;
const QUARTERSTAFF = 79;
const MACE = 73;
const LANCE = 72;
const SILVER_MACE = 74;
const MORNING_STAR = 75;
const WAR_HAMMER = 76;
const CLUB = 77;
const RUBBER_HOSE = 78;
const AKLYS = 80;
const FLAIL = 81;
const BULLWHIP = 82;
const ROBE = 143;
const CLOAK_OF_MAGIC_RESISTANCE = 148;
const CLOAK_OF_PROTECTION = 146;
const M1_FLY = 0x00000001;
const M1_CLING = 0x00000010;
const M1_CONCEAL = 0x00000080;
const M1_HIDE = 0x00000100;
const M1_NOTAKE = 0x00000800;
const M1_NOEYES = 0x00001000;
const M1_NOHANDS = 0x00002000;
const M1_NOLIMBS = 0x00006000;
const M2_UNDEAD = 0x00000002;
const M2_STALK = 0x01000000;
const M2_NASTY = 0x02000000;
const M2_STRONG = 0x04000000;
const MS_SILENT = 0;
const MS_BARK = 1;
const MS_MEW = 2;
const MS_ROAR = 3;
const MS_BELLOW = 4;
const MS_GROWL = 5;
const MS_SQEEK = 6;
const MS_SQAWK = 7;
const MS_HISS = 9;
const MS_BUZZ = 10;
const MS_NEIGH = 12;
const MS_MOO = 13;
const MS_WAIL = 14;
const MS_GROAN = 44;
const CLOAK_OF_DISPLACEMENT = 149;
const SMALL_SHIELD = 150;
const SHIELD_OF_DRAIN_RESISTANCE = 151;
const SHIELD_OF_SHOCK_RESISTANCE = 152;
const ELVEN_SHIELD = 153;
const URUK_HAI_SHIELD = 154;
const ORCISH_SHIELD = 155;
const LARGE_SHIELD = 156;
const DWARVISH_ROUNDSHIELD = 157;
const SHIELD_OF_REFLECTION = 158;
const LOW_BOOTS = 163;
const IRON_SHOES = 164;
const HIGH_BOOTS = 165;
const SPEED_BOOTS = 166;
const ELVEN_BOOTS = 169;
const LEVITATION_BOOTS = 172;
const RIN_TELEPORT_CONTROL = 195;
const RIN_INCREASE_ACCURACY = 176;
const RIN_STEALTH = 181;
const RIN_PROTECTION = 178;
const RIN_REGENERATION = 179;
const RIN_WARNING = 187;
const RIN_POLYMORPH = 196;
const RIN_POLYMORPH_CONTROL = 197;
const DILITHIUM_CRYSTAL = 439;
const LUCKSTONE = 470;
const LOCK_PICK = 222;
const CREDIT_CARD = 223;
const EXPENSIVE_CAMERA = 229;
const MIRROR = 230;
const BLINDFOLD = 233;
const TOWEL = 234;
const LEASH = 236;
const STETHOSCOPE = 237;
const TIN_OPENER = 239;
const FIGURINE = 241;
const MAGIC_MARKER = 242;
const TIN_WHISTLE = 245;
const MAGIC_WHISTLE = 246;
const MAGIC_HARP = 254;
const LEATHER_DRUM = 257;
const DRUM_OF_EARTHQUAKE = 258;
const PICK_AXE = 259;
const GRAPPLING_HOOK = 260;
const UNICORN_HORN = 261;
const BELL_OF_OPENING = 263;
const OIL_LAMP = 227;
const MAGIC_LAMP = 228;
const LARGE_BOX = 214;
const CHEST = 215;
const ICE_BOX = 216;
const SACK = 217;
const BAG_OF_HOLDING = 219;
const BAG_OF_TRICKS = 220;
const GOLD_PIECE = 438;
const ARROW = 18;
const ELVEN_ARROW = 19;
const ORCISH_ARROW = 20;
const SILVER_ARROW = 21;
const YA = 22;
const CROSSBOW_BOLT = 23;
const SHURIKEN = 25;
const BOOMERANG = 26;
const SPEAR = 27;
const SILVER_SPEAR = 31;
const TRIDENT = 33;
const SCALPEL = 39;
const KNIFE = 40;
const DART = 24;
const DAGGER = 34;
const ELVEN_DAGGER = 35;
const SILVER_DAGGER = 37;
const ATHAME = 38;
const STILETTO = 41;
const WORM_TOOTH = 42;
const CRYSKNIFE = 43;
const SHORT_SWORD = 46;
const AXE = 44;
const BATTLE_AXE = 45;
const ELVEN_SPEAR = 28;
const ORCISH_SPEAR = 29;
const DWARVISH_SPEAR = 30;
const JAVELIN = 32;
const ELVEN_SHORT_SWORD = 47;
const ORCISH_SHORT_SWORD = 48;
const DWARVISH_SHORT_SWORD = 49;
const SCIMITAR = 50;
const SILVER_SABER = 51;
const BROADSWORD = 52;
const ELVEN_BROADSWORD = 53;
const LONG_SWORD = 54;
const TWO_HANDED_SWORD = 55;
const KATANA = 56;
const TSURUGI = 57;
const RUNESWORD = 58;
const PARTISAN = 59;
const RANSEUR = 60;
const SPETUM = 61;
const GLAIVE = 62;
const HALBERD = 63;
const BARDICHE = 64;
const VOULGE = 65;
const FAUCHARD = 66;
const GUISARME = 67;
const BILL_GUISARME = 68;
const LUCERN_HAMMER = 69;
const BEC_DE_CORBIN = 70;
const DWARVISH_MATTOCK = 71;
const BOW = 83;
const ELVEN_BOW = 84;
const ORCISH_BOW = 85;
const YUMI = 86;
const SLING = 87;
const CROSSBOW = 88;
const ORCISH_DAGGER = 36;
const BOW_AMMO = new Set([ARROW, ELVEN_ARROW, ORCISH_ARROW, YA]);
const WIELDED_MISSILES = new Set([DART, SHURIKEN, BOOMERANG]);
const WEPTOOL_TYPES = new Set([PICK_AXE, GRAPPLING_HOOK, UNICORN_HORN]);
const APPLY_PICK_TYPES = new Set([PICK_AXE, DWARVISH_MATTOCK]);
const APPLY_AXE_TYPES = new Set([AXE, BATTLE_AXE]);
const APPLY_POLE_TYPES = new Set([
    PARTISAN, RANSEUR, SPETUM, GLAIVE, HALBERD, BARDICHE, VOULGE, FAUCHARD,
    GUISARME, BILL_GUISARME, LUCERN_HAMMER, BEC_DE_CORBIN,
]);
const TRIPE_RATION = 264;
const CORPSE = 265;
const EGG = 266;
const MEATBALL = 267;
const MEAT_STICK = 268;
const ENORMOUS_MEATBALL = 269;
const MEAT_RING = 270;
const GLOB_OF_GRAY_OOZE = 271;
const POT_SICKNESS = 318;
const GLOB_OF_BROWN_PUDDING = 272;
const GLOB_OF_GREEN_SLIME = 273;
const GLOB_OF_BLACK_PUDDING = 274;
const KELP_FROND = 275;
const EUCALYPTUS_LEAF = 276;
const G_NOCORPSE = 0x0010;
const STATUE = 476;
const RANDOM_CLASS = 0;
const POT_GAIN_ABILITY = 297;
const POT_CONFUSION = 299;
const POT_PARALYSIS = 301;
const POT_SLEEPING = 314;
const POT_HEALING = 307;
const POT_EXTRA_HEALING = 308;
const POT_FULL_HEALING = 315;
const POT_POLYMORPH = 316;
const POT_BOOZE = 317;
const POT_FRUIT_JUICE = 319;
const POT_OIL = 321;
const POT_WATER = 322;
const SCR_DESTROY_ARMOR = 324;
const SCR_REMOVE_CURSE = 327;
const SCR_ENCHANT_WEAPON = 328;
const SCR_LIGHT = 332;
const SCR_TELEPORTATION = 333;
const SCR_IDENTIFY = 336;
const SCR_MAGIC_MAPPING = 337;
const SCR_PUNISHMENT = 341;
const SCR_MAIL = 364;
const BOULDER = 475;
const APPLE = 277;
const ORANGE = 278;
const PEAR = 279;
const MELON = 280;
const BANANA = 281;
const CARROT = 282;
const SPRIG_OF_WOLFSBANE = 283;
const CLOVE_OF_GARLIC = 284;
const SLIME_MOLD = 285;
const LUMP_OF_ROYAL_JELLY = 286;
const CREAM_PIE = 287;
const CANDY_BAR = 288;
const FORTUNE_COOKIE = 289;
const PANCAKE = 290;
const LEMBAS_WAFER = 291;
const CRAM_RATION = 292;
const FOOD_RATION = 293;
const K_RATION = 294;
const C_RATION = 295;
const TIN = 296;
const PLATE_MAIL = 121;
const SPLINT_MAIL = 124;
const CHAIN_MAIL = 128;
const LEATHER_GLOVES = 159;
const GAUNTLETS_OF_POWER = 161;
const GAUNTLETS_OF_DEXTERITY = 162;
const MZ_HUMAN = 2;
const MZ_LARGE = 3;
const M2_GREEDY = 0x10000000;
const M2_JEWELS = 0x20000000;
const M2_COLLECT = 0x40000000;
const M2_MAGIC = 0x80000000;
const ARMOR_CLASS = 3;
const WEAPON_CLASS = 2;
const RING_CLASS = 4;
const AMULET_CLASS = 5;
const TOOL_CLASS = 6;
const FOOD_CLASS = 7;
const POTION_CLASS = 8;
const SCROLL_CLASS = 9;
const SPBOOK_CLASS = 10;
const WAND_CLASS = 11;
const COIN_CLASS = 12;
const GEM_CLASS = 13;
const VENOM_CLASS = 17;
const BALL_CLASS = 15;
const CHAIN_CLASS = 16;
const GLASS = 19;
const FIRST_SPELL = 366;
const LAST_SPELL = 407;
const SPE_MAGIC_MISSILE = 367;
const SPE_DETECT_MONSTERS = 373;
const SPE_HEALING = 374;
const SPE_CURE_BLINDNESS = 378;
const SPE_CURE_SICKNESS = 386;
const SPE_DETECT_FOOD_WISH = 383;
const SPE_EXTRA_HEALING = 391;
const SPE_RESTORE_ABILITY = 392;
const SPE_REMOVE_CURSE = 395;
const SPE_TURN_UNDEAD = 398;
const SPE_POLYMORPH = 399;
const SPE_BLANK_PAPER = 407;
const SPE_NOVEL = 408;
const SPLASH_OF_BLINDING_VENOM = 479;
const SPE_BOOK_OF_THE_DEAD = 409;
const LEVELCHANGE_MORE_LEN = '--More--'.length;

const KILL_DROP_SUBHUMAN_FALLBACK = new Set([
    'lichen',
]);

const MONSTER_ATTACK_TYPE = new Map([
    // C ref: include/monattk.h. Ordering affects exper.c:experience().
    ['AT_NONE', 0],
    ['AT_CLAW', 1],
    ['AT_BITE', 2],
    ['AT_KICK', 3],
    ['AT_BUTT', 4],
    ['AT_TUCH', 5],
    ['AT_STNG', 6],
    ['AT_HUGS', 7],
    ['AT_SPIT', 10],
    ['AT_ENGL', 11],
    ['AT_BREA', 12],
    ['AT_EXPL', 13],
    ['AT_BOOM', 14],
    ['AT_GAZE', 15],
    ['AT_TENT', 16],
    ['AT_WEAP', 254],
    ['AT_MAGC', 255],
]);

const MONSTER_DAMAGE_TYPE = new Map([
    // C ref: include/monattk.h. Numeric order is used by exper.c:experience().
    ['AD_PHYS', 0],
    ['AD_MAGM', 1],
    ['AD_FIRE', 2],
    ['AD_COLD', 3],
    ['AD_SLEE', 4],
    ['AD_DISN', 5],
    ['AD_ELEC', 6],
    ['AD_DRST', 7],
    ['AD_ACID', 8],
    ['AD_SPC1', 9],
    ['AD_SPC2', 10],
    ['AD_BLND', 11],
    ['AD_STUN', 12],
    ['AD_SLOW', 13],
    ['AD_PLYS', 14],
    ['AD_DRLI', 15],
    ['AD_DREN', 16],
    ['AD_LEGS', 17],
    ['AD_STON', 18],
    ['AD_STCK', 19],
    ['AD_SGLD', 20],
    ['AD_SITM', 21],
    ['AD_SEDU', 22],
    ['AD_TLPT', 23],
    ['AD_RUST', 24],
    ['AD_CONF', 25],
    ['AD_DGST', 26],
    ['AD_HEAL', 27],
    ['AD_WRAP', 28],
    ['AD_WERE', 29],
    ['AD_DRDX', 30],
    ['AD_DRCO', 31],
    ['AD_DRIN', 32],
    ['AD_DISE', 33],
    ['AD_DCAY', 34],
    ['AD_SSEX', 35],
    ['AD_HALU', 36],
    ['AD_DETH', 37],
    ['AD_PEST', 38],
    ['AD_FAMN', 39],
    ['AD_SLIM', 40],
    ['AD_ENCH', 41],
    ['AD_CORR', 42],
    ['AD_POLY', 43],
    ['AD_CLRC', 240],
    ['AD_SPEL', 241],
    ['AD_RBRE', 242],
    ['AD_SAMU', 252],
    ['AD_CURS', 253],
]);

const BULKY_KILL_DROP_OBJECTS = new Set([
    // C ref: src/mon.c:xkilled(); small monsters discard generated
    // kill-treasure objects whose object table weight is > 30.
    91, 96, 98, 99, 100,
    101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
    111, 112, 113, 114, 115, 116, 117, 118, 119, 120,
    121, 122, 123, 124, 125, 126, 127, 128, 129, 130,
    131, 132, 133, 134,
    153, 154, 155, 156, 157, 158,
    164, 170,
    CHEST, EXPENSIVE_CAMERA, STETHOSCOPE, BOULDER,
]);

const CORPSE_WEIGHT_BY_MONSTER = new Map([
    // C ref: include/monsters.h SIZ(cwt, cnutrit, ...).
    ['GNOME', 650],
    ['KOBOLD', 400],
]);

const LEGACY_CORPSE_NUM_TO_MONSTER = new Map([
    [21, 'GNOME'],
]);

const OBJECT_BASE_NAMES = new Map([
    [ARROW, 'arrow'],
    [ELVEN_ARROW, 'elven arrow'],
    [ORCISH_ARROW, 'orcish arrow'],
    [SILVER_ARROW, 'silver arrow'],
    [YA, 'ya'],
    [CROSSBOW_BOLT, 'crossbow bolt'],
    [DART, 'dart'],
    [SHURIKEN, 'shuriken'],
    [BOOMERANG, 'boomerang'],
    [SPEAR, 'spear'],
    [SILVER_SPEAR, 'silver spear'],
    [TRIDENT, 'trident'],
    [DAGGER, 'dagger'],
    [ELVEN_DAGGER, 'elven dagger'],
    [SILVER_DAGGER, 'silver dagger'],
    [ATHAME, 'athame'],
    [SHORT_SWORD, 'short sword'],
    [ELVEN_SPEAR, 'elven spear'],
    [ORCISH_SPEAR, 'orcish spear'],
    [DWARVISH_SPEAR, 'dwarvish spear'],
    [JAVELIN, 'javelin'],
    [SCALPEL, 'scalpel'],
    [KNIFE, 'knife'],
    [STILETTO, 'stiletto'],
    [WORM_TOOTH, 'worm tooth'],
    [CRYSKNIFE, 'crysknife'],
    [ORCISH_DAGGER, 'orcish dagger'],
    [AXE, 'axe'],
    [BATTLE_AXE, 'battle-axe'],
    [ELVEN_SHORT_SWORD, 'elven short sword'],
    [ORCISH_SHORT_SWORD, 'orcish short sword'],
    [DWARVISH_SHORT_SWORD, 'dwarvish short sword'],
    [SCIMITAR, 'scimitar'],
    [SILVER_SABER, 'silver saber'],
    [BROADSWORD, 'broadsword'],
    [ELVEN_BROADSWORD, 'elven broadsword'],
    [LONG_SWORD, 'long sword'],
    [TWO_HANDED_SWORD, 'two-handed sword'],
    [KATANA, 'katana'],
    [TSURUGI, 'tsurugi'],
    [RUNESWORD, 'runesword'],
    [PARTISAN, 'partisan'],
    [RANSEUR, 'ranseur'],
    [SPETUM, 'spetum'],
    [GLAIVE, 'glaive'],
    [HALBERD, 'halberd'],
    [BARDICHE, 'bardiche'],
    [VOULGE, 'voulge'],
    [FAUCHARD, 'fauchard'],
    [GUISARME, 'guisarme'],
    [BILL_GUISARME, 'bill-guisarme'],
    [LUCERN_HAMMER, 'lucern hammer'],
    [BEC_DE_CORBIN, 'bec de corbin'],
    [DWARVISH_MATTOCK, 'dwarvish mattock'],
    [LANCE, 'lance'],
    [SILVER_MACE, 'silver mace'],
    [WAR_HAMMER, 'war hammer'],
    [MACE, 'mace'],
    [MORNING_STAR, 'morning star'],
    [CLUB, 'club'],
    [RUBBER_HOSE, 'rubber hose'],
    [QUARTERSTAFF, 'quarterstaff'],
    [AKLYS, 'aklys'],
    [FLAIL, 'flail'],
    [BULLWHIP, 'bullwhip'],
    [BOW, 'bow'],
    [ELVEN_BOW, 'elven bow'],
    [ORCISH_BOW, 'orcish bow'],
    [YUMI, 'yumi'],
    [SLING, 'sling'],
    [CROSSBOW, 'crossbow'],
    [GRAY_DRAGON_SCALE_MAIL, 'gray dragon scale mail'],
    [ORCISH_CLOAK, 'orcish cloak'],
    [DWARVISH_CLOAK, 'dwarvish cloak'],
    [OILSKIN_CLOAK, 'oilskin cloak'],
    [CLOAK_OF_MAGIC_RESISTANCE, 'cloak of magic resistance'],
    [CLOAK_OF_DISPLACEMENT, 'cloak of displacement'],
    [LOW_BOOTS, 'low boots'],
    [IRON_SHOES, 'iron shoes'],
    [HIGH_BOOTS, 'high boots'],
    [SPEED_BOOTS, 'speed boots'],
    [CHAIN_MAIL, 'chain mail'],
    [LEATHER_GLOVES, 'leather gloves'],
    [GAUNTLETS_OF_POWER, 'gauntlets of power'],
    [AMULET_OF_LIFE_SAVING, 'amulet of life saving'],
    [RIN_PROTECTION, 'ring of protection'],
    [RIN_INCREASE_ACCURACY, 'ring of increase accuracy'],
    [RIN_REGENERATION, 'ring of regeneration'],
    [188, 'ring of poison resistance'],
    [RIN_WARNING, 'ring of warning'],
    [RIN_POLYMORPH, 'ring of polymorph'],
    [RIN_POLYMORPH_CONTROL, 'ring of polymorph control'],
    [199, 'ring of see invisible'],
    [RIN_STEALTH, 'ring of stealth'],
    [RIN_TELEPORT_CONTROL, 'ring of teleport control'],
    [200, 'ring of protection from shape changers'],
    [LOCK_PICK, 'lock pick'],
    [CREDIT_CARD, 'credit card'],
    [EXPENSIVE_CAMERA, 'expensive camera'],
    [MIRROR, 'mirror'],
    [BLINDFOLD, 'blindfold'],
    [TOWEL, 'towel'],
    [LEASH, 'leash'],
    [STETHOSCOPE, 'stethoscope'],
    [TIN_OPENER, 'tin opener'],
    [TIN_WHISTLE, 'tin whistle'],
    [MAGIC_WHISTLE, 'magic whistle'],
    [WAN_WISHING, 'wand of wishing'],
    [OIL_LAMP, 'lamp'],
    [MAGIC_LAMP, 'lamp'],
    [MAGIC_MARKER, 'magic marker'],
    [257, 'drum'],
    [258, 'drum'],
    [LARGE_BOX, 'large box'],
    [CHEST, 'chest'],
    [ICE_BOX, 'ice box'],
    [SACK, 'sack'],
    [POT_CONFUSION, 'potion of confusion'],
    [POT_PARALYSIS, 'potion of paralysis'],
    [311, 'potion of monster detection'],
    [312, 'potion of object detection'],
    [306, 'potion of see invisible'],
    [307, 'potion of healing'],
    [308, 'potion of extra healing'],
    [309, 'potion of gain level'],
    [POT_FULL_HEALING, 'potion of full healing'],
    [POT_BOOZE, 'potion of booze'],
    [POT_OIL, 'potion of oil'],
    [POT_WATER, 'potion of water'],
    [316, 'potion of polymorph'],
    [POT_SICKNESS, 'potion of sickness'],
    [323, 'scroll of enchant armor'],
    [SCR_DESTROY_ARMOR, 'scroll of destroy armor'],
    [325, 'scroll of confuse monster'],
    [326, 'scroll of scare monster'],
    [SCR_REMOVE_CURSE, 'scroll of remove curse'],
    [328, 'scroll of enchant weapon'],
    [330, 'scroll of taming'],
    [332, 'scroll of light'],
    [335, 'scroll of food detection'],
    [336, 'scroll of identify'],
    [SCR_MAGIC_MAPPING, 'scroll of magic mapping'],
    [SCR_PUNISHMENT, 'scroll of punishment'],
    [374, 'spellbook of healing'],
    [367, 'spellbook of magic missile'],
    [370, 'spellbook of sleep'],
    [372, 'spellbook of light'],
    [373, 'spellbook of detect monsters'],
    [375, 'spellbook of knock'],
    [377, 'spellbook of confuse monster'],
    [379, 'spellbook of drain life'],
    [378, 'spellbook of cure blindness'],
    [380, 'spellbook of slow monster'],
    [382, 'spellbook of create monster'],
    [383, 'spellbook of force bolt'],
    [384, 'spellbook of cause fear'],
    [391, 'spellbook of extra healing'],
    [395, 'spellbook of remove curse'],
    [397, 'spellbook of identify'],
    [403, 'spellbook of protection'],
    [405, 'spellbook of stone to flesh'],
    [SPE_NOVEL, 'novel'],
    [SPE_BOOK_OF_THE_DEAD, 'Book of the Dead'],
    [WAN_MAKE_INVISIBLE, 'wand of make invisible'],
    [WAN_DIGGING, 'wand of digging'],
    [WAN_MAGIC_MISSILE, 'wand of magic missile'],
    [WAN_SECRET_DOOR_DETECTION, 'wand of secret door detection'],
    [WAN_POLYMORPH, 'wand of polymorph'],
    [WAN_FIRE, 'wand of fire'],
    [WAN_COLD, 'wand of cold'],
    [WAN_SLEEP, 'wand of sleep'],
    [WAN_DEATH, 'wand of death'],
    [WAN_LIGHTNING, 'wand of lightning'],
    [421, 'wand of undead turning'],
    // C ref: include/objects.h FOOD() entries; ordinary food names are known.
    [TRIPE_RATION, 'tripe ration'],
    [EGG, 'egg'],
    [MEATBALL, 'meatball'],
    [MEAT_STICK, 'meat stick'],
    [ENORMOUS_MEATBALL, 'enormous meatball'],
    [MEAT_RING, 'meat ring'],
    [GLOB_OF_GRAY_OOZE, 'glob of gray ooze'],
    [GLOB_OF_BROWN_PUDDING, 'glob of brown pudding'],
    [GLOB_OF_GREEN_SLIME, 'glob of green slime'],
    [GLOB_OF_BLACK_PUDDING, 'glob of black pudding'],
    [KELP_FROND, 'kelp frond'],
    [EUCALYPTUS_LEAF, 'eucalyptus leaf'],
    [APPLE, 'apple'],
    [ORANGE, 'orange'],
    [PEAR, 'pear'],
    [MELON, 'melon'],
    [BANANA, 'banana'],
    [CARROT, 'carrot'],
    [SPRIG_OF_WOLFSBANE, 'sprig of wolfsbane'],
    [CLOVE_OF_GARLIC, 'clove of garlic'],
    [SLIME_MOLD, 'slime mold'],
    [LUMP_OF_ROYAL_JELLY, 'lump of royal jelly'],
    [CREAM_PIE, 'cream pie'],
    [CANDY_BAR, 'candy bar'],
    [FORTUNE_COOKIE, 'fortune cookie'],
    [PANCAKE, 'pancake'],
    [LEMBAS_WAFER, 'lembas wafer'],
    [CRAM_RATION, 'cram ration'],
    [FOOD_RATION, 'food ration'],
    [K_RATION, 'K-ration'],
    [C_RATION, 'C-ration'],
    [TIN, 'tin'],
    [BOULDER, 'boulder'],
    [461, 'white gem'],
]);

const JAPANESE_ITEM_NAMES = new Map([
    // C ref: src/objnam.c:Japanese_item_name().
    [SHORT_SWORD, 'wakizashi'],
    [BROADSWORD, 'ninja-to'],
    [KNIFE, 'shito'],
    [PLATE_MAIL, 'tanko'],
    [LEATHER_GLOVES, 'yugake'],
    [FOOD_RATION, 'gunyoki'],
    [POT_BOOZE, 'sake'],
]);

const ARMOR_XNAMES = new Map([
    // C ref: include/objects.h armor entries plus objnam.c:xname_flags().
    // nameKnown mirrors the object table's `kn` flag.
    [89, { name: 'elven leather helm', desc: 'leather hat', nameKnown: false, cost: 8 }],
    [90, { name: 'orcish helm', desc: 'iron skull cap', nameKnown: false, cost: 10 }],
    [91, { name: 'dwarvish iron helm', desc: 'hard hat', nameKnown: false, cost: 20 }],
    [92, { name: 'fedora', nameKnown: true, cost: 1 }],
    [93, { name: 'cornuthaum', desc: 'conical hat', nameKnown: false, cost: 80 }],
    [94, { name: 'dunce cap', desc: 'conical hat', nameKnown: false, cost: 1 }],
    [95, { name: 'dented pot', nameKnown: true, cost: 8 }],
    [96, { name: 'helm of brilliance', desc: 'crystal helmet', nameKnown: false, cost: 50 }],
    [97, { name: 'helmet', desc: 'plumed helmet', nameKnown: false, cost: 10 }],
    [98, { name: 'helm of caution', desc: 'etched helmet', nameKnown: false, cost: 50 }],
    [99, { name: 'helm of opposite alignment', desc: 'crested helmet', nameKnown: false, cost: 50 }],
    [100, { name: 'helm of telepathy', desc: 'visored helmet', nameKnown: false, cost: 50 }],
    [101, { name: 'gray dragon scale mail', nameKnown: true, cost: 1200 }],
    [102, { name: 'gold dragon scale mail', nameKnown: true, cost: 900 }],
    [103, { name: 'silver dragon scale mail', nameKnown: true, cost: 1200 }],
    [104, { name: 'red dragon scale mail', nameKnown: true, cost: 900 }],
    [105, { name: 'white dragon scale mail', nameKnown: true, cost: 900 }],
    [106, { name: 'orange dragon scale mail', nameKnown: true, cost: 900 }],
    [107, { name: 'black dragon scale mail', nameKnown: true, cost: 1200 }],
    [108, { name: 'blue dragon scale mail', nameKnown: true, cost: 900 }],
    [109, { name: 'green dragon scale mail', nameKnown: true, cost: 900 }],
    [110, { name: 'yellow dragon scale mail', nameKnown: true, cost: 900 }],
    [111, { name: 'gray dragon scales', nameKnown: true, cost: 700, scales: true }],
    [112, { name: 'gold dragon scales', nameKnown: true, cost: 500, scales: true }],
    [113, { name: 'silver dragon scales', nameKnown: true, cost: 700, scales: true }],
    [114, { name: 'red dragon scales', nameKnown: true, cost: 500, scales: true }],
    [115, { name: 'white dragon scales', nameKnown: true, cost: 500, scales: true }],
    [116, { name: 'orange dragon scales', nameKnown: true, cost: 500, scales: true }],
    [117, { name: 'black dragon scales', nameKnown: true, cost: 700, scales: true }],
    [118, { name: 'blue dragon scales', nameKnown: true, cost: 500, scales: true }],
    [119, { name: 'green dragon scales', nameKnown: true, cost: 500, scales: true }],
    [120, { name: 'yellow dragon scales', nameKnown: true, cost: 500, scales: true }],
    [121, { name: 'plate mail', nameKnown: true, cost: 600 }],
    [122, { name: 'crystal plate mail', nameKnown: true, cost: 820 }],
    [123, { name: 'bronze plate mail', nameKnown: true, cost: 400 }],
    [124, { name: 'splint mail', nameKnown: true, cost: 80 }],
    [125, { name: 'banded mail', nameKnown: true, cost: 90 }],
    [126, { name: 'dwarvish mithril-coat', nameKnown: true, cost: 240 }],
    [127, { name: 'elven mithril-coat', nameKnown: true, cost: 240 }],
    [128, { name: 'chain mail', nameKnown: true, cost: 75 }],
    [129, { name: 'orcish chain mail', desc: 'crude chain mail', nameKnown: false, cost: 75 }],
    [130, { name: 'scale mail', nameKnown: true, cost: 45 }],
    [131, { name: 'studded leather armor', nameKnown: true, cost: 15 }],
    [132, { name: 'ring mail', nameKnown: true, cost: 100 }],
    [133, { name: 'orcish ring mail', desc: 'crude ring mail', nameKnown: false, cost: 80 }],
    [134, { name: 'leather armor', nameKnown: true, cost: 5 }],
    [135, { name: 'leather jacket', nameKnown: true, cost: 10 }],
    [136, { name: 'Hawaiian shirt', nameKnown: true, cost: 3 }],
    [137, { name: 'T-shirt', nameKnown: true, cost: 2 }],
    [138, { name: 'mummy wrapping', nameKnown: true, cost: 2 }],
    [139, { name: 'elven cloak', desc: 'faded pall', nameKnown: false, cost: 60 }],
    [140, { name: 'orcish cloak', desc: 'coarse mantelet', nameKnown: false, cost: 40 }],
    [141, { name: 'dwarvish cloak', desc: 'hooded cloak', nameKnown: false, cost: 50 }],
    [142, { name: 'oilskin cloak', desc: 'slippery cloak', nameKnown: false, cost: 50 }],
    [143, { name: 'robe', nameKnown: true, cost: 50 }],
    [144, { name: 'alchemy smock', desc: 'apron', nameKnown: false, cost: 50 }],
    [145, { name: 'leather cloak', nameKnown: true, cost: 40 }],
    [146, { name: 'cloak of protection', desc: 'tattered cape', nameKnown: false, cost: 50 }],
    [147, { name: 'cloak of invisibility', desc: 'opera cloak', nameKnown: false, cost: 60 }],
    [148, { name: 'cloak of magic resistance', desc: 'ornamental cope', nameKnown: false, cost: 60 }],
    [149, { name: 'cloak of displacement', desc: 'piece of cloth', nameKnown: false, cost: 50 }],
    [150, { name: 'small shield', desc: 'wooden shield', nameKnown: false, cost: 3 }],
    [151, { name: 'shield of drain resistance', desc: 'wooden shield', nameKnown: false, cost: 50 }],
    [152, { name: 'shield of shock resistance', desc: 'wooden shield', nameKnown: false, cost: 50 }],
    [153, { name: 'elven shield', desc: 'blue and green shield', nameKnown: false, cost: 7 }],
    [154, { name: 'Uruk-hai shield', desc: 'white-handed shield', nameKnown: false, cost: 7 }],
    [155, { name: 'orcish shield', desc: 'red-eyed shield', nameKnown: false, cost: 7 }],
    [156, { name: 'large shield', nameKnown: true, cost: 10 }],
    [157, { name: 'dwarvish roundshield', desc: 'large round shield', nameKnown: false, cost: 10 }],
    [158, { name: 'shield of reflection', desc: 'polished silver shield', nameKnown: false, cost: 50 }],
    [159, { name: 'leather gloves', desc: 'old gloves', nameKnown: false, cost: 8 }],
    [160, { name: 'gauntlets of fumbling', desc: 'padded gloves', nameKnown: false, cost: 50 }],
    [161, { name: 'gauntlets of power', desc: 'riding gloves', nameKnown: false, cost: 50 }],
    [162, { name: 'gauntlets of dexterity', desc: 'fencing gloves', nameKnown: false, cost: 50 }],
    [163, { name: 'low boots', desc: 'walking shoes', nameKnown: false, cost: 8 }],
    [164, { name: 'iron shoes', desc: 'hard shoes', nameKnown: false, cost: 16 }],
    [165, { name: 'high boots', desc: 'jackboots', nameKnown: false, cost: 12 }],
    [166, { name: 'speed boots', desc: 'combat boots', nameKnown: false, cost: 50 }],
    [167, { name: 'water walking boots', desc: 'jungle boots', nameKnown: false, cost: 50 }],
    [168, { name: 'jumping boots', desc: 'hiking boots', nameKnown: false, cost: 50 }],
    [169, { name: 'elven boots', desc: 'mud boots', nameKnown: false, cost: 8 }],
    [170, { name: 'kicking boots', desc: 'buckled boots', nameKnown: false, cost: 8 }],
    [171, { name: 'fumble boots', desc: 'riding boots', nameKnown: false, cost: 30 }],
    [172, { name: 'levitation boots', desc: 'snow boots', nameKnown: false, cost: 30 }],
]);

const ARMOR_MAGIC_CANCELLATION = new Map([
    [93, 1], // cornuthaum
    [121, 2], [122, 2],
    [123, 1], [124, 1], [125, 1],
    [126, 2], [127, 2],
    [128, 1], [129, 1], [130, 1], [131, 1], [132, 1], [133, 1], [134, 1],
    [138, 1], [139, 1], [140, 1], [141, 1],
    [142, 2], [143, 2],
    [144, 1], [145, 1],
    [146, 3],
    [147, 1], [148, 1], [149, 1],
]);

const SPELLBOOK_SPELL_INFO = new Map([
    [SPE_DETECT_MONSTERS, { name: 'detect monsters', level: 1, category: 'divination' }],
    [374, { name: 'healing', level: 1, category: 'healing' }],
    [378, { name: 'cure blindness', level: 2, category: 'healing' }],
    [380, { name: 'slow monster', level: 2, category: 'enchantment' }],
    [382, { name: 'create monster', level: 2, category: 'clerical' }],
    [383, { name: 'force bolt', level: 1, category: 'attack' }],
    [391, { name: 'extra healing', level: 3, category: 'healing' }],
    [SPE_REMOVE_CURSE, { name: 'remove curse', level: 3, category: 'clerical' }],
    [397, { name: 'identify', level: 3, category: 'divination' }],
    [405, { name: 'stone to flesh', level: 3, category: 'healing' }],
]);

const SPELL_CATEGORY_SKILL_TYPES = new Map([
    ['attack', C.P_ATTACK_SPELL],
    ['healing', C.P_HEALING_SPELL],
    ['divination', C.P_DIVINATION_SPELL],
    ['enchantment', C.P_ENCHANTMENT_SPELL],
    ['clerical', C.P_CLERIC_SPELL],
    ['escape', C.P_ESCAPE_SPELL],
    ['matter', C.P_MATTER_SPELL],
]);

const ROLE_INITIAL_SPELL_SKILLS = new Map([
    ['Healer', new Map([[C.P_HEALING_SPELL, C.P_BASIC]])],
    ['Monk', new Map([[C.P_HEALING_SPELL, C.P_BASIC]])],
    ['Priest', new Map([[C.P_CLERIC_SPELL, C.P_BASIC]])],
    ['Wizard', new Map([
        [C.P_ATTACK_SPELL, C.P_BASIC],
        [C.P_ENCHANTMENT_SPELL, C.P_BASIC],
    ])],
]);

const ROLE_SPELL_STATS = new Map([
    // C ref: src/role.c:roles[] spell statistics.
    ['Healer', {
        spelbase: 3, spelheal: -3, spelshld: 2, spelarmr: 10,
        spelstat: C.A_WIS, spelspec: SPE_CURE_SICKNESS, spelsbon: -4,
    }],
    ['Knight', {
        spelbase: 8, spelheal: -2, spelshld: 0, spelarmr: 9,
        spelstat: C.A_WIS, spelspec: SPE_TURN_UNDEAD, spelsbon: -4,
    }],
    ['Priest', {
        spelbase: 3, spelheal: -2, spelshld: 2, spelarmr: 10,
        spelstat: C.A_WIS, spelspec: SPE_REMOVE_CURSE, spelsbon: -4,
    }],
    ['Wizard', {
        spelbase: 1, spelheal: 0, spelshld: 3, spelarmr: 10,
        spelstat: C.A_INT, spelspec: SPE_MAGIC_MISSILE, spelsbon: -4,
    }],
]);

const INVENTORY_GROUPS = [
    { cls: AMULET_CLASS, title: 'Amulets' },
    { cls: WEAPON_CLASS, title: 'Weapons' },
    { cls: ARMOR_CLASS, title: 'Armor' },
    { cls: FOOD_CLASS, title: 'Comestibles' },
    { cls: SCROLL_CLASS, title: 'Scrolls' },
    { cls: SPBOOK_CLASS, title: 'Spellbooks' },
    { cls: POTION_CLASS, title: 'Potions' },
    { cls: RING_CLASS, title: 'Rings' },
    { cls: WAND_CLASS, title: 'Wands' },
    { cls: TOOL_CLASS, title: 'Tools' },
    { cls: GEM_CLASS, title: 'Gems/Stones' },
];

const TOURIST_STARTER_MENU = [
    { cls: WEAPON_CLASS, line: 'a - 27 +2 darts (at the ready)' },
    { cls: ARMOR_CLASS, line: 'j - an uncursed +0 Hawaiian shirt (being worn)' },
    { cls: FOOD_CLASS, line: 'b - 6 uncursed food rations' },
    { cls: FOOD_CLASS, line: 'c - an uncursed apple' },
    { cls: FOOD_CLASS, line: 'd - 2 uncursed fortune cookies' },
    { cls: FOOD_CLASS, line: 'e - an uncursed clove of garlic' },
    { cls: FOOD_CLASS, line: 'f - an uncursed slime mold' },
    { cls: FOOD_CLASS, line: 'g - 2 uncursed tins of lichen' },
    { cls: SCROLL_CLASS, line: 'i - 4 uncursed scrolls of magic mapping' },
    { cls: POTION_CLASS, line: 'h - 2 uncursed potions of extra healing' },
    { cls: TOOL_CLASS, line: 'k - an expensive camera (0:34)' },
    { cls: TOOL_CLASS, line: 'l - an uncursed credit card' },
];

// C ref: attrib.c role innate ability tables plus adjabil().  Level-gain
// messages are ordinary plines emitted after pluslvl()'s welcome message.
const ROLE_INNATE_ABILITIES = new Map([
    ['Archeologist', [
        { level: 5, prop: 'stealth', gain: 'stealthy' },
        { level: 10, prop: 'intrinsic_fast', gain: 'quick' },
    ]],
    ['Barbarian', [
        { level: 7, prop: 'intrinsic_fast', gain: 'quick' },
        { level: 15, prop: 'stealth', gain: 'stealthy' },
    ]],
    ['Caveman', [
        { level: 7, prop: 'intrinsic_fast', gain: 'quick' },
        { level: 15, prop: 'warning', gain: 'sensitive' },
    ]],
    ['Healer', [
        { level: 15, prop: 'warning', gain: 'sensitive' },
    ]],
    ['Knight', [
        { level: 7, prop: 'intrinsic_fast', gain: 'quick' },
    ]],
    ['Monk', [
        { level: 3, prop: 'poison_resistance', gain: 'healthy' },
        { level: 5, prop: 'stealth', gain: 'stealthy' },
        { level: 7, prop: 'warning', gain: 'sensitive' },
        { level: 9, prop: 'searching', gain: 'perceptive' },
        { level: 11, prop: 'fire_resistance', gain: 'cool' },
        { level: 13, prop: 'cold_resistance', gain: 'warm' },
        { level: 15, prop: 'shock_resistance', gain: 'insulated' },
        { level: 17, prop: 'teleport_control', gain: 'controlled' },
    ]],
    ['Priest', [
        { level: 15, prop: 'warning', gain: 'sensitive' },
        { level: 20, prop: 'fire_resistance', gain: 'cool' },
    ]],
    ['Ranger', [
        { level: 7, prop: 'stealth', gain: 'stealthy' },
    ]],
    ['Rogue', [
        { level: 10, prop: 'searching', gain: 'perceptive' },
    ]],
    ['Samurai', [
        { level: 15, prop: 'stealth', gain: 'stealthy' },
    ]],
    ['Tourist', [
        { level: 10, prop: 'searching', gain: 'perceptive' },
        { level: 20, prop: 'poison_resistance', gain: 'hardy' },
    ]],
    ['Wizard', [
        { level: 15, prop: 'warning', gain: 'sensitive' },
        { level: 17, prop: 'teleport_control', gain: 'controlled' },
    ]],
]);

const RACE_INNATE_ABILITIES = new Map([
    ['elf', [
        { level: 4, prop: 'sleep_resistance', gain: 'awake' },
    ]],
]);

function wishedObjectSpec(name) {
    const wish = String(name || '').toLowerCase();
    const spec = {};
    const count = wishedObjectCount(wish);
    if (count) spec.quan = count;
    const chargeMatch = wish.match(/\((\d+)(?::(\d+))?\)/);
    if (chargeMatch) {
        spec.recharged = Number(chargeMatch[1]);
        spec.spe = Number(chargeMatch[2] ?? chargeMatch[1]);
    }
    const speMatch = wish.match(/(?:^|\s)([+-]\d+)(?:\s|$)/);
    if (speMatch) spec.spe = Number(speMatch[1]);
    if (wish.includes('blessed')) {
        spec.blessed = true;
        spec.cursed = false;
    } else if (wish.includes('cursed') && !wish.includes('uncursed')) {
        spec.cursed = true;
        spec.blessed = false;
    } else if (wish.includes('uncursed')) {
        spec.cursed = false;
        spec.blessed = false;
    }
    if (wish.includes('amulet of life saving')) {
        rn2(76);
        return { ...spec, otyp: AMULET_OF_LIFE_SAVING };
    }
    if (wish.includes('amulet of unchanging')) {
        rn2(61);
        return { ...spec, otyp: AMULET_OF_UNCHANGING };
    }
    if (wish.includes('gray dragon scale mail') || wish.includes('grey dragon scale mail')) {
        rn2(67);
        return { ...spec, otyp: GRAY_DRAGON_SCALE_MAIL };
    }
    if (wish.includes('speed boots')) {
        rn2(13);
        return { ...spec, otyp: SPEED_BOOTS };
    }
    if (wish.includes('gauntlets of power')) {
        // C ref: objnam.c:rnd_otyp_by_namedesc() searches the shuffled
        // gloves description/name pool before readobjnam() creates armor.
        rn2(9);
        return { ...spec, otyp: GAUNTLETS_OF_POWER };
    }
    if (wish.includes('leather gloves')) {
        // C ref: objnam.c:rnd_otyp_by_namedesc().  "leather gloves" can
        // resolve through the shuffled gloves description pool; the object
        // remains unidentified and prints as its current appearance.
        rn2(16);
        return { ...spec, otyp: GAUNTLETS_OF_DEXTERITY, appearanceName: 'fencing gloves' };
    }
    if (wish.includes('cloak of magic resistance')) {
        // C ref: objnam.c:rnd_otyp_by_namedesc() searches the cloak/armor
        // description/name pool before mksobj() initializes the cloak.
        rn2(13);
        return { ...spec, otyp: CLOAK_OF_MAGIC_RESISTANCE };
    }
    if (wish.includes('cloak of displacement')) {
        // C ref: objnam.c:rnd_otyp_by_namedesc() searches the cloak/armor
        // description/name pool before mksobj() initializes the cloak.
        rn2(13);
        return { ...spec, otyp: CLOAK_OF_DISPLACEMENT };
    }
    if (wish.includes('mjollnir')) {
        // C ref: objnam.c:readobjnam() resolves the artifact name to a
        // war hammer, then oname() handles artifact naming after mksobj().
        return { ...spec, otyp: WAR_HAMMER, oname: 'Mjollnir', namedArtifact: true };
    }
    if (/\bdaggers?\b/.test(wish)) {
        // C ref: objnam.c:readobjnam() -> rnd_otyp_by_namedesc().
        rn2(31);
        return { ...spec, otyp: DAGGER };
    }
    if (/gold pieces?\b/.test(wish)) {
        // C ref: objnam.c:readobjnam(); gold bypasses namedesc lookup.
        return { ...spec, otyp: GOLD_PIECE };
    }
    if (wish.includes('wand of fire')) {
        rn2(41);
        return { ...spec, otyp: WAN_FIRE };
    }
    if (wish.includes('wand of cold')) {
        rn2(41);
        return { ...spec, otyp: WAN_COLD };
    }
    if (wish.includes('wand of lightning')) {
        rn2(41);
        return { ...spec, otyp: WAN_LIGHTNING };
    }
    if (wish.includes('wand of polymorph')) {
        rn2(46);
        return { ...spec, otyp: WAN_POLYMORPH };
    }
    if (wish.includes('wand of magic missile')) {
        // C ref: objnam.c:rnd_otyp_by_namedesc() check_of also matches
        // "spellbook of magic missile", so the probability pool is 41+10.
        rn2(51);
        return { ...spec, otyp: WAN_MAGIC_MISSILE };
    }
    if (wish.includes('wand of death')) {
        // C ref: objnam.c:rnd_otyp_by_namedesc().  Unlike most wands in
        // current evidence, wand of death's object probability plus the wish
        // bonus yields a six-point selection pool.
        rn2(6);
        return { ...spec, otyp: WAN_DEATH };
    }
    if (wish.includes('wand of digging')) {
        rn2(41);
        return { ...spec, otyp: WAN_DIGGING };
    }
    if (wish.includes('scroll of teleportation')) {
        rn2(56);
        return { ...spec, otyp: SCR_TELEPORTATION, appearanceName: 'scroll labeled YUM YUM' };
    }
    if (/scrolls? of punishment/.test(wish)) {
        // C ref: objnam.c:readobjnam() -> rnd_otyp_by_namedesc().
        rn2(16);
        return { ...spec, otyp: SCR_PUNISHMENT };
    }
    if (/scrolls? of identify/.test(wish)) {
        // C ref: objnam.c:readobjnam() -> rnd_otyp_by_namedesc().
        rn2(181);
        return { ...spec, otyp: SCR_IDENTIFY };
    }
    if (/scrolls? of mail/.test(wish)) {
        // C ref: objnam.c:readobjnam() -> rnd_otyp_by_namedesc().
        rn2(1);
        return { ...spec, otyp: SCR_MAIL };
    }
    if (/spellbooks? of magic missile/.test(wish)) {
        // C ref: objnam.c:readobjnam() -> rnd_otyp_by_namedesc().
        rn2(46);
        return { ...spec, otyp: SPE_MAGIC_MISSILE };
    }
    if (/spellbooks? of detect food/.test(wish)) {
        // C ref: objnam.c:readobjnam() -> rnd_otyp_by_namedesc().
        rn2(31);
        return {
            ...spec,
            otyp: SPE_DETECT_FOOD_WISH,
            spellInfoOverride: {
                spellKey: 'detect food',
                name: 'detect food',
                level: 2,
                category: 'divination',
                delay: 3,
                discoveryDescription: 'dark brown',
            },
        };
    }
    if (/spellbooks? of detect monsters/.test(wish)) {
        // C ref: objnam.c:readobjnam() -> rnd_otyp_by_namedesc().
        rn2(44);
        return { ...spec, otyp: SPE_DETECT_MONSTERS };
    }
    if (wish.includes('potion of confusion')) {
        rn2(41);
        return { ...spec, otyp: POT_CONFUSION, appearanceName: 'puce potion' };
    }
    if (wish.includes('potion of extra healing')) {
        // C ref: objnam.c:readobjnam() -> rnd_otyp_by_namedesc().
        rn2(46);
        return { ...spec, otyp: POT_EXTRA_HEALING };
    }
    if (wish.includes('ring of teleport control')) {
        rn2(2);
        return { ...spec, otyp: RIN_TELEPORT_CONTROL, appearanceName: 'ivory ring' };
    }
    if (wish.includes('ring of polymorph control')) {
        // C ref: objnam.c:rnd_otyp_by_namedesc().  Rings currently have
        // one-point object probabilities; wishing adds one more point.
        rn2(2);
        return { ...spec, otyp: RIN_POLYMORPH_CONTROL, appearanceName: 'emerald ring' };
    }
    if (wish.includes('ring of regeneration')) {
        rn2(2);
        return { ...spec, otyp: RIN_REGENERATION, appearanceName: 'clay ring' };
    }
    if (wish.includes('stethoscope')) {
        rn2(26);
        return { ...spec, otyp: STETHOSCOPE };
    }
    if (wish.includes('magic marker')) {
        rn2(16);
        return { ...spec, otyp: MAGIC_MARKER };
    }
    if (wish.includes('magic lamp')) {
        rn2(16);
        return { ...spec, otyp: MAGIC_LAMP };
    }
    if (wish.includes('bell of opening')) {
        rn2(1);
        return { ...spec, otyp: BELL_OF_OPENING, appearanceName: 'silver bell' };
    }
    if (wish.includes('magic harp')) {
        rn2(3);
        return { ...spec, otyp: MAGIC_HARP, appearanceName: 'harp' };
    }
    if (wish.includes('leash')) {
        rn2(66);
        return { ...spec, otyp: LEASH };
    }
    if (wish.includes('mirror')) {
        rn2(46);
        return { ...spec, otyp: MIRROR, appearanceName: 'looking glass' };
    }
    if (wish.includes('expensive camera')) {
        rn2(16);
        return { ...spec, otyp: EXPENSIVE_CAMERA };
    }
    if (wish.includes('blindfold')) {
        rn2(51);
        return { ...spec, otyp: BLINDFOLD };
    }
    if (wish.includes('cream pie')) {
        rn2(26);
        return { ...spec, otyp: CREAM_PIE, quan: 1 };
    }
    if (wish.includes('fortune cookie')) {
        rn2(56);
        return { ...spec, otyp: FORTUNE_COOKIE };
    }
    if (wish.includes('apple')) {
        rn2(16);
        return { ...spec, otyp: APPLE };
    }
    if (wish.includes('chest')) {
        // C ref: objnam.c:rnd_otyp_by_namedesc().  The name lookup for a
        // wished chest uses chest object probability plus the wish bonus.
        rn2(36);
        return { ...spec, otyp: CHEST };
    }
    if (wish.includes('bag of holding')) {
        rn2(21);
        return { ...spec, otyp: BAG_OF_HOLDING, appearanceName: 'bag' };
    }
    return null;
}

function wishedObjectCount(wish) {
    // C ref: src/objnam.c:readobjnam_preparse().  BUC and enchantment
    // prefixes can precede the requested quantity.
    const cleaned = String(wish || '').replace(/\([^)]*\)/g, ' ');
    const words = cleaned.trim().split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (/^\d+$/.test(word)) return Math.max(1, Number(word));
        if (/^[+-]\d+$/.test(word)
            || ['blessed', 'uncursed', 'cursed', 'very', 'thoroughly',
                'fixed', 'greased', 'rustproof', 'erodeproof', 'poisoned'].includes(word))
            continue;
        return 0;
    }
    return 0;
}

function validInvlet(ch) {
    return typeof ch === 'string' && /^[A-Za-z]$/.test(ch);
}

function invletIndex(ch) {
    if (typeof ch !== 'string' || ch.length !== 1) return -1;
    const code = ch.charCodeAt(0);
    if (code >= 97 && code <= 122) return code - 97;
    if (code >= 65 && code <= 90) return code - 65 + 26;
    return -1;
}

function invletFromIndex(index) {
    if (index >= 0 && index < 26) return String.fromCharCode(97 + index);
    if (index >= 26 && index < 52) return String.fromCharCode(65 + index - 26);
    return '#';
}

function nextInvletStoredCode(index) {
    if (index < 0) return 97;
    if (index >= 0 && index < 25) return 97 + index + 1;
    if (index === 25) return 123; // after 'z', C continues with 'A'
    if (index >= 26 && index < 51) return 65 + index - 26 + 1;
    return 91; // after 'Z'
}

function invletIndexFromStoredCode(code) {
    if (!Number.isInteger(code)) return 0;
    if (code >= 97 && code <= 122) return code - 97;
    if (code === 123) return 26;
    if (code >= 65 && code <= 90) return code - 65 + 26;
    if (code === 91) return 52;
    return 0;
}

function ensureInventoryLetters() {
    game.inventory = game.inventory || [];
    const used = new Set();
    for (const obj of game.inventory) {
        if (obj?.oclass === COIN_CLASS || obj?.invlet === '$') {
            if (obj) obj.invlet = '$';
            continue;
        }
        if (validInvlet(obj?.invlet)) used.add(obj.invlet);
    }

    let nextIndex = 0;
    for (const obj of game.inventory) {
        if (obj?.oclass === COIN_CLASS || obj?.invlet === '$') {
            if (obj) obj.invlet = '$';
            continue;
        }
        if (!obj || validInvlet(obj.invlet)) continue;
        while (nextIndex < 52 && used.has(invletFromIndex(nextIndex))) nextIndex++;
        if (nextIndex >= 52) break;
        obj.invlet = invletFromIndex(nextIndex++);
        used.add(obj.invlet);
    }

    if (!Number.isInteger(game._next_invlet_code)) {
        let maxIndex = -1;
        for (const letter of used) maxIndex = Math.max(maxIndex, invletIndex(letter));
        game._next_invlet_code = nextInvletStoredCode(maxIndex);
    }
}

function inventoryLetterRank(obj) {
    const ch = obj?.invlet || '';
    if (!/^[A-Za-z]$/.test(ch)) return Number.MAX_SAFE_INTEGER;
    return ch.charCodeAt(0) ^ 0x20;
}

function reorderInventoryByLetter() {
    game.inventory = game.inventory || [];
    game.inventory.sort((a, b) => inventoryLetterRank(a) - inventoryLetterRank(b));
}

function assignInventoryLetter(obj) {
    ensureInventoryLetters();
    const used = new Set((game.inventory || [])
        .map((item) => item?.invlet)
        .filter((letter) => validInvlet(letter)));
    let index = invletIndexFromStoredCode(game._next_invlet_code);
    for (let scanned = 0; scanned < 52; scanned++) {
        if (index >= 52) index = 0;
        const letter = invletFromIndex(index);
        if (!used.has(letter)) {
            obj.invlet = letter;
            game._next_invlet_code = nextInvletStoredCode(index);
            return obj.invlet;
        }
        index++;
    }
    obj.invlet = '#';
    game._next_invlet_code = 91;
    return obj.invlet;
}

function make_wish_object(name) {
    const spec = wishedObjectSpec(name);
    if (!spec?.otyp) return null;
    const prevEncumbrance = heroNearCapacity();
    const otmp = mksobj(spec.otyp, true, false);
    otmp.wishedfor = true;
    if (typeof spec.spe === 'number') otmp.spe = spec.spe;
    if (typeof spec.quan === 'number') otmp.quan = spec.quan;
    if (typeof spec.recharged === 'number') otmp.recharged = spec.recharged;
    if (typeof spec.blessed === 'boolean') otmp.blessed = spec.blessed;
    if (typeof spec.cursed === 'boolean') otmp.cursed = spec.cursed;
    if (spec.appearanceName) otmp.appearanceName = spec.appearanceName;
    if (spec.spellInfoOverride) otmp.spellInfoOverride = { ...spec.spellInfoOverride };
    if (spec.oname) {
        otmp.oextra = { ...(otmp.oextra || {}), oname: spec.oname };
        if (spec.namedArtifact) {
            if (!otmp.oartifact) game._nartifact_exist = (game._nartifact_exist ?? 0) + 1;
            otmp.oartifact = true;
            // C ref: objnam.c:readobjnam().  oname()/artifact_exists() has
            // already counted the artifact before the wish-abuse gate.
            rn2(Math.max(1, game._nartifact_exist ?? 0));
        }
    }
    // C ref: zap.c:makewish().  The gods take notice of wishes by extending
    // the prayer timeout after the wished object has been created.
    if (game.u) game.u.ublesscnt = (game.u.ublesscnt ?? 300) + rn1(100, 50);
    if (otmp.otyp === GOLD_PIECE) {
        // C refs: src/zap.c:makewish(), src/invent.c:addinv().  Wished gold is
        // carried money immediately, so the status line and `$` inventory stack
        // update with the object-result line.
        const wishedQuan = otmp.quan || 1;
        game.inventory = game.inventory || [];
        game._goldCount = (game._goldCount || 0) + wishedQuan;
        const carried = game.inventory.find((obj) => obj?.otyp === GOLD_PIECE);
        otmp.invlet = '$';
        if (carried) {
            carried.invlet = '$';
            carried.quan = game._goldCount;
        } else {
            otmp.quan = game._goldCount;
            game.inventory.unshift(otmp);
        }
        stageWishEncumbranceMessage(prevEncumbrance);
        noteWishConduct(otmp);
        return otmp;
    }
    const merged = merge_inventory_object(otmp);
    if (merged) {
        stageWishEncumbranceMessage(prevEncumbrance);
        noteWishConduct(merged);
        return merged;
    }
    assignInventoryLetter(otmp);
    game.inventory.push(otmp);
    stageWishEncumbranceMessage(prevEncumbrance);
    noteWishConduct(otmp);
    return otmp;
}

function inventoryIndexForLetter(ch) {
    ensureInventoryLetters();
    const idx = game.inventory.findIndex((obj) => obj?.invlet === ch);
    if (idx >= 0) return idx;
    // C ref: invent.c:getobj().  Selections are assigned inventory letters;
    // consumed letters remain gaps until NetHack explicitly reassigns them.
    return -1;
}

function consumeInventoryObject(obj) {
    if (!obj) return;
    if ((obj.quan || 1) > 1) {
        // C ref: invent.c:useup().  Using one item from a stack decrements
        // quantity in place; unlike splitobj(), it does not allocate an o_id.
        obj.quan--;
        return;
    }
    const idx = game.inventory?.indexOf(obj) ?? -1;
    if (idx >= 0) game.inventory.splice(idx, 1);
}

function wornLifeSavingAmulet() {
    return (game.inventory || []).find((obj) =>
        obj?.otyp === AMULET_OF_LIFE_SAVING
        && (obj.worn || ((obj.owornmask || 0) & C.W_AMUL))) || null;
}

function clearLifeSavingExtrinsic(obj) {
    if (obj) {
        obj.worn = false;
        obj.owornmask = 0;
    }
    if (game.u?.uprops) {
        game.u.uprops.life_will_be_saved = false;
        game.u.uprops.life_saved = false;
    }
}

function lifeSavingHp() {
    const con = game.u?.acurr?.a?.[A_CON] ?? 10;
    return Math.min(game.u?.uhpmax || 1, 50 + 10 * Math.trunc(con / 2));
}

function applyLifeSavingConPenalty() {
    const u = game.u || (game.u = {});
    if (!u.acurr) u.acurr = { a: [10, 10, 10, 10, 10, 10] };
    if (!Array.isArray(u.acurr.a)) u.acurr.a = [10, 10, 10, 10, 10, 10];
    u.acurr.a[A_CON] = Math.max(3, (u.acurr.a[A_CON] ?? 10) - 1);
}

async function showLifeSavingDeathMessage() {
    const u = game.u || (game.u = {});
    u.umortality = (u.umortality || 0) + 1;
    if (typeof u.uhp === 'number') u.uhp = 0;
    game._latched_status_uhp = 0;
    game._monster_death_pending = false;
    game._death_prompt_pending = false;
    game._death_prompt_active = false;
    game._death_bones_checked = false;
    game._death_bones_check_pending = false;
    game._death_bones_done_stage_prepared = false;
    game._death_bones_corpse_prepared = false;
    game._death_bones_ok = false;
    game._life_saving_after_more_pending = true;
    // C refs: src/end.c:done(), src/attrib.c:exercise().  Life-saving
    // preempts wizard death prompts and, at this More-resume boundary, C has
    // just run the periodic healthy-hunger Constitution exercise row.
    exercise(A_CON, true);
    await pline('You die...  But wait...  Your medallion begins to glow!');
    queue_more_prompt();
}

async function showPendingMonsterDeathMessage() {
    if (!game._monster_death_pending || game._after_more_message) return false;
    game._more_dismissals_remaining = 0;
    const lifeSavingAmulet = wornLifeSavingAmulet();
    game._monster_death_pending = false;
    game._death_prompt_pending = !lifeSavingAmulet;
    // C refs: src/end.c:done(), src/end.c:really_done(),
    // src/bones.c:can_make_bones().  Wizard/explore deaths ask whether to
    // die before really_done(); declining the prompt must not run the bones
    // feasibility RNG.
    if (!lifeSavingAmulet && !deathUsesWizardPrompt()) runPendingDeathBonesCheck();
    if (!game._death_preserve_latched_status) game._latched_status_uhp = 0;
    if (lifeSavingAmulet) {
        await showLifeSavingDeathMessage();
    } else {
        await pline('You die...');
        if (game._death_shopkeeper_takes_name) {
            await append_pline(`${game._death_shopkeeper_takes_name} takes all your possessions.`);
            game._death_shopkeeper_takes_name = '';
        }
        queue_more_prompt();
    }
    return true;
}

async function finishLifeSavingAfterMore() {
    const amulet = wornLifeSavingAmulet();
    game._life_saving_after_more_pending = false;
    game._fatal_monster_attack_paused = false;
    // C refs: src/end.c:done()/savelife(), win/tty/topl.c:more().
    // ESC can leave an interrupted monster More in tty STOP state, but the
    // amulet recovery sequence owns a new death/life-saving topline boundary;
    // do not let that STOP suppress later fresh-command monster hit lines.
    game._monster_topline_stop_after_esc_more = false;
    applyLifeSavingConPenalty();
    if (game.u) game.u.uhp = lifeSavingHp();
    clearLifeSavingExtrinsic(amulet);
    consumeInventoryObject(amulet);
    game._latched_status_uhp = null;
    game._nomovemsg = 'You survived that attempt on your life.';
    game._savelife_resume_active = true;
    game._life_saving_silent_monster_resume = true;
    game._resume_turn_tail_after_more = false;
    await pline('You feel much better!');
}

function ensureConduct() {
    game.u = game.u || {};
    return game.u.uconduct || (game.u.uconduct = {});
}

function noteConductCounter(name, amount = 1) {
    const conduct = ensureConduct();
    conduct[name] = (conduct[name] || 0) + amount;
    return conduct[name];
}

function corpseIsVegan(obj) {
    // C ref: include/mondata.h:vegan().
    const ptr = corpseMonsterPtr(obj);
    if (!ptr) return false;
    if (['S_BLOB', 'S_JELLY', 'S_FUNGUS', 'S_VORTEX', 'S_LIGHT'].includes(ptr.mlet))
        return true;
    if (ptr.mlet === 'S_ELEMENTAL' && ptr.name !== 'STALKER') return true;
    if (ptr.mlet === 'S_GOLEM' && ptr.name !== 'FLESH_GOLEM' && ptr.name !== 'LEATHER_GOLEM')
        return true;
    return false;
}

function corpseIsVegetarian(obj) {
    // C ref: include/mondata.h:vegetarian().
    const ptr = corpseMonsterPtr(obj);
    return corpseIsVegan(obj) || (ptr?.mlet === 'S_PUDDING' && ptr.name !== 'BLACK_PUDDING');
}

function foodBreaksVegetarian(obj) {
    return !obj || (obj.otyp === CORPSE && !corpseIsVegetarian(obj))
        || obj.otyp === TRIPE_RATION
        || obj.otyp === MEATBALL
        || obj.otyp === MEAT_STICK
        || obj.otyp === ENORMOUS_MEATBALL
        || obj.otyp === MEAT_RING;
}

function foodBreaksVegan(obj) {
    if (obj?.otyp === CORPSE) return !corpseIsVegan(obj);
    return foodBreaksVegetarian(obj);
}

function noteFoodConduct(obj) {
    // C refs: src/eat.c:eatfood(), src/eat.c:eatcorpse().
    const conduct = ensureConduct();
    const breaksVegan = foodBreaksVegan(obj);
    const breaksVegetarian = foodBreaksVegetarian(obj);
    conduct.food = (conduct.food || 0) + 1;
    if (breaksVegan) conduct.unvegan = (conduct.unvegan || 0) + 1;
    if (breaksVegetarian) conduct.unvegetarian = (conduct.unvegetarian || 0) + 1;
    return { breaksVegan, breaksVegetarian };
}

function noteLiterateConduct() {
    // C refs: src/read.c:doread(), src/engrave.c:doengrave().
    noteConductCounter('literate');
}

function noteWishConduct(obj) {
    // C ref: src/zap.c:makewish().
    const conduct = ensureConduct();
    if (obj?.oartifact) conduct.wisharti = (conduct.wisharti || 0) + 1;
    conduct.wishes = (conduct.wishes || 0) + 1;
}

function notePolyselfConduct() {
    // C ref: src/polyself.c:polymon().
    noteConductCounter('polyselfs');
}

function noteObjectPolymorphConduct() {
    // C refs: src/zap.c:poly_obj(), src/potion.c:poly_obj().
    noteConductCounter('polypiles');
}

function recordAchievement(achidx) {
    if (!Number.isInteger(achidx) || achidx === 0) return;
    game.u = game.u || {};
    const absidx = Math.abs(achidx);
    const achieved = Array.isArray(game.u.uachieved) ? game.u.uachieved : (game.u.uachieved = []);
    if (achieved.some((idx) => Math.abs(idx) === absidx)) return;
    achieved.push(achidx);
}

function recordRankAchievements(oldLevel, newLevel) {
    // C ref: src/exper.c:newexplevel().
    const oldRank = rankIndexForLevel(oldLevel);
    const newRank = rankIndexForLevel(newLevel);
    for (let rank = oldRank + 1; rank <= newRank; rank++) {
        if (rank <= 0) continue;
        const ach = C.ACH_RNK1 + rank - 1;
        recordAchievement(game.flags?.female ? -ach : ach);
    }
}

function recordCurrentLevelAchievements() {
    // C refs: src/do.c:goto_level(), src/hack.c:u_collide_m().
    const dungeonName = game.dungeons?.[game.u?.uz?.dnum ?? 0]?.dname || '';
    if (dungeonName === 'Gehennom') recordAchievement(C.ACH_HELL);
    if (dungeonName === 'The Gnomish Mines') recordAchievement(C.ACH_MINE);
    if (dungeonName === 'Sokoban') recordAchievement(C.ACH_SOKO);
    if (game.level?.flags?.has_town) recordAchievement(C.ACH_TOWN);
}

function thrownObjectFromInventory(obj) {
    if (!obj) return null;
    if ((obj.quan || 1) > 1) {
        next_ident();
        const thrown = { ...obj, quan: 1, invlet: undefined, ox: 0, oy: 0 };
        obj.quan--;
        return thrown;
    }
    const idx = game.inventory?.indexOf(obj) ?? -1;
    if (idx >= 0) game.inventory.splice(idx, 1);
    obj.invlet = undefined;
    return obj;
}

function thrownLanding(dx, dy) {
    let x = game.u?.ux ?? 0;
    let y = game.u?.uy ?? 0;
    let last = { x, y };
    let hitHard = false;
    for (let range = 0; range < 8; range++) {
        const nx = x + dx;
        const ny = y + dy;
        const loc = game.level?.at(nx, ny);
        if (!loc || IS_OBSTRUCTED(loc.typ)) {
            hitHard = true;
            break;
        }
        last = { x: nx, y: ny };
        x = nx;
        y = ny;
    }
    return { ...last, hitHard };
}

function thrownMonsterTarget(dx, dy) {
    // C ref: src/zap.c:bhit().  A thrown object stops at the first monster
    // on the projectile line before the caller resolves thitmonst().
    let x = game.u?.ux ?? 0;
    let y = game.u?.uy ?? 0;
    for (let range = 0; range < 8; range++) {
        const nx = x + dx;
        const ny = y + dy;
        const loc = game.level?.at(nx, ny);
        if (!loc || IS_OBSTRUCTED(loc.typ)) break;
        const mon = mon_at(nx, ny);
        if (mon) return { mon, x: nx, y: ny };
        x = nx;
        y = ny;
    }
    return null;
}

function plainThrownObjectMissesMonster(obj) {
    // C ref: src/dothrow.c:thitmonst().  Weapons, weptools, gems, balls,
    // boulders, potions, venoms, and food-like special cases need their own
    // hit/effect paths; other carried object classes fall through to tmiss().
    if (!obj) return false;
    if (obj.oclass === WEAPON_CLASS || isWeaponTool(obj) || obj.oclass === GEM_CLASS) return false;
    if (obj.oclass === POTION_CLASS || obj.oclass === VENOM_CLASS || obj.oclass === FOOD_CLASS) return false;
    if (obj.oclass === BALL_CLASS || obj.otyp === BOULDER) return false;
    return obj.oclass === ARMOR_CLASS
        || obj.oclass === RING_CLASS
        || obj.oclass === AMULET_CLASS
        || obj.oclass === TOOL_CLASS
        || obj.oclass === SCROLL_CLASS
        || obj.oclass === SPBOOK_CLASS
        || obj.oclass === WAND_CLASS;
}

async function tmissThrownObject(obj, mon) {
    // C ref: src/dothrow.c:tmiss().
    await pline(`The ${baseObjectName(obj)} misses the ${monsterName(mon)}.`);
    if (!rn2(3)) {
        mon.msleeping = 0;
        mon.mstrategy = (mon.mstrategy || 0) & ~C.STRAT_WAITMASK;
    }
}

async function thitmonstPlainMiss(obj, mon) {
    // C ref: src/dothrow.c:thitmonst().  Even object classes that cannot
    // damage this target still own the generic thrown to-hit roll first.
    rnd(20);
    await tmissThrownObject(obj, mon);
}

function thrownBreaktestDestroysObject(obj, landing) {
    // C refs: src/dothrow.c:throwit(), src/dothrow.c:breaktest().
    const loc = game.level?.at(landing.x, landing.y);
    if (!landing.hitHard && (!loc || IS_SOFT(loc.typ))) return false;
    if (obj_resists(obj, 1, 99)) return false;
    const material = OBJECT_MATERIAL[obj.otyp] ?? 0;
    if (material === GLASS && !obj.oartifact && obj.oclass !== GEM_CLASS) return true;
    return obj.otyp === EXPENSIVE_CAMERA
        || obj.oclass === POTION_CLASS
        || obj.otyp === EGG
        || obj.otyp === CREAM_PIE
        || obj.otyp === MELON
        || obj.oclass === VENOM_CLASS;
}

function encumbranceDecreaseMessage(newcap) {
    // C ref: src/pickup.c:encumber_msg().
    if (newcap <= C.UNENCUMBERED) return 'Your movements are now unencumbered.';
    if (newcap === C.SLT_ENCUMBER) return 'Your movements are only slowed slightly by your load.';
    if (newcap === C.MOD_ENCUMBER) return 'You rebalance your load.  Movement is still difficult.';
    if (newcap === C.HVY_ENCUMBER) return 'You stagger under your load.  Movement is still very hard.';
    return '';
}

async function stageThrowEncumbranceMessage(prevEncumbrance) {
    const oldcap = Math.max(prevEncumbrance || 0, game.u?.uencumber || 0);
    const newcap = heroNearCapacity();
    if (game.u) game.u.uencumber = newcap;
    if (oldcap <= newcap) return;
    const msg = encumbranceDecreaseMessage(newcap);
    if (!msg) return;
    if (game._pending_message || game._more) {
        // C refs: src/dothrow.c:dothrow(), src/pickup.c:encumber_msg().
        // The thrown-object pline can block on tty More before encumber_msg()
        // displays the load decrease and updates the visible status field.
        game._status_uencumber_override = oldcap;
        game._clear_status_uencumber_override_before_after_more = true;
        game._after_more_message = game._after_more_message
            ? `${msg}  ${game._after_more_message}`
            : msg;
        queue_more_prompt();
    } else {
        await pline(msg);
    }
}

function matchingLauncherForAmmo(ammo, launcher) {
    return ammo?.otyp === ARROW && launcher?.otyp === BOW;
}

function isAmmoObject(obj) {
    return obj?.otyp === ARROW;
}

async function throwInventoryObject(obj, dirKey) {
    if (!obj) return;
    const prevEncumbrance = game.u?.uencumber || 0;
    const wielded = heroWieldedWeapon();
    const thrownByHand = isAmmoObject(obj) && !matchingLauncherForAmmo(obj, wielded);
    if (obj.oclass === WEAPON_CLASS
        && (obj.quan || 1) > 1
        && (!isAmmoObject(obj) || matchingLauncherForAmmo(obj, wielded))) {
        // C ref: dothrow.c:throw_obj(); stackable non-ammo weapons and ammo
        // with a wielded matching launcher roll multishot even for a one-shot
        // volley.  Ammo thrown by hand skips that launcher-dependent block.
        rnd(1);
    }
    const thrown = thrownObjectFromInventory(obj);
    const dx = DIR_DX[dirKey] || 0;
    const dy = DIR_DY[dirKey] || 0;
    if (!thrown || (!dx && !dy)) return;
    const target = plainThrownObjectMissesMonster(thrown) ? thrownMonsterTarget(dx, dy) : null;
    if (target) await thitmonstPlainMiss(thrown, target.mon);
    const landing = target || thrownLanding(dx, dy);
    const destroyed = thrownBreaktestDestroysObject(thrown, landing);
    if (landing.x === (game.u?.ux ?? 0) && landing.y === (game.u?.uy ?? 0) && !landing.hitHard) return;
    if (!destroyed) {
        place_object(thrown, landing.x, landing.y);
        see_objects();
    }
    if (thrownByHand) {
        const launcher = obj.otyp === ARROW ? 'a bow' : 'the appropriate launcher';
        const msg = `You aren't wielding ${launcher}, so you throw your ${baseObjectName(obj)} by hand.`;
        game._pending_message = msg;
        game._last_topline_message = msg;
    }
    await stageThrowEncumbranceMessage(prevEncumbrance);
}

function lastInventoryLetter() {
    ensureInventoryLetters();
    let maxCode = 97;
    for (const obj of game.inventory || []) {
        if (validInvlet(obj?.invlet)) maxCode = Math.max(maxCode, obj.invlet.charCodeAt(0));
    }
    return String.fromCharCode(maxCode);
}

function inventoryLetterRange() {
    ensureInventoryLetters();
    const hasGold = (game._goldCount || 0) > 0
        || (game.inventory || []).some((obj) => obj?.otyp === GOLD_PIECE || obj?.invlet === '$');
    const letters = [...new Set((game.inventory || [])
        .map((obj) => obj?.invlet)
        .filter(validInvlet))].sort();
    // C ref: invent.c:getobj().  The suggested-letter buffer is only
    // compacted with dashes when it contains more than five letters.
    const compact = (letters.length > 5 ? compressLetters(letters) : letters.join('')) || '';
    return `${hasGold ? '$' : ''}${compact}` || 'a';
}

function compressLetters(letters) {
    const sorted = [...new Set(letters.filter(validInvlet))].sort();
    const parts = [];
    for (let i = 0; i < sorted.length; i++) {
        let j = i;
        while (j + 1 < sorted.length && sorted[j + 1].charCodeAt(0) === sorted[j].charCodeAt(0) + 1) j++;
        if (j - i >= 3) parts.push(`${sorted[i]}-${sorted[j]}`);
        else for (let k = i; k <= j; k++) parts.push(sorted[k]);
        i = j;
    }
    return parts.join('');
}

function compactLettersInOrder(letters) {
    const ordered = [];
    const seen = new Set();
    for (const letter of letters) {
        if (typeof letter !== 'string' || !/^[A-Za-z]$/.test(letter) || seen.has(letter)) continue;
        seen.add(letter);
        ordered.push(letter);
    }
    const parts = [];
    for (let i = 0; i < ordered.length; i++) {
        let j = i;
        while (j + 1 < ordered.length && ordered[j + 1].charCodeAt(0) === ordered[j].charCodeAt(0) + 1) j++;
        if (j - i >= 3) parts.push(`${ordered[i]}-${ordered[j]}`);
        else for (let k = i; k <= j; k++) parts.push(ordered[k]);
        i = j;
    }
    return parts.join('');
}

function adjustDestinationLetters(obj) {
    ensureInventoryLetters();
    const used = new Set((game.inventory || [])
        .filter((item) => item && item !== obj && /^[A-Za-z]$/.test(item.invlet || ''))
        .map((item) => item.invlet));
    const order = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const letters = order.filter((letter) => letter === obj?.invlet || !used.has(letter));
    return letters.length > 5 ? compactLettersInOrder(letters) : letters.join('');
}

function applyObjectSuitability(obj) {
    // C ref: src/apply.c:apply_ok().  Suggested objects are shown in the
    // prompt and in '?' subset menus; downplayed objects remain selectable via
    // '*' or direct inventory letter but are not advertised.
    if (!obj) return 'exclude';
    if (obj.oclass === TOOL_CLASS || obj.oclass === WAND_CLASS || obj.oclass === SPBOOK_CLASS)
        return 'suggest';
    if (obj.oclass === COIN_CLASS) return 'downplay';
    if (obj.oclass === WEAPON_CLASS
        && (APPLY_PICK_TYPES.has(obj.otyp) || APPLY_AXE_TYPES.has(obj.otyp)
            || APPLY_POLE_TYPES.has(obj.otyp) || obj.otyp === BULLWHIP))
        return 'suggest';
    if (obj.oclass === POTION_CLASS) {
        if (!obj.dknown || !objectTypeNameKnown(obj)) return 'downplay';
        if (obj.otyp === POT_OIL) return 'suggest';
    }
    if (obj.otyp === CREAM_PIE || obj.otyp === EUCALYPTUS_LEAF || obj.otyp === LUMP_OF_ROYAL_JELLY)
        return 'suggest';
    if (obj.otyp === BANANA && (game.u?.uhallucination || game.u?.uprops?.hallucination))
        return 'downplay';
    return 'exclude_selectable';
}

function applyLetters() {
    ensureInventoryLetters();
    const letters = (game.inventory || [])
        .filter(obj => applyObjectSuitability(obj) === 'suggest')
        .map(obj => obj.invlet)
        .filter(validInvlet);
    return letters.length > 5 ? compressLetters(letters) : letters.join('');
}

function readLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => obj?.oclass === SCROLL_CLASS || obj?.oclass === SPBOOK_CLASS)
        .map((obj) => obj.invlet)
        .join('');
}

function lightScrollArea(radius = 5) {
    // C ref: read.c:seffect_light() -> vision.c:do_clear_area().
    const offsets = {
        5: [5, 5, 5, 4, 3, 2],
        9: [9, 9, 9, 9, 8, 8, 7, 6, 5, 3],
    }[radius];
    if (!offsets) return;
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    for (let y = Math.max(0, uy - radius); y <= Math.min(ROWNO - 1, uy + radius); y++) {
        const offset = offsets[Math.abs(y - uy)];
        for (let x = Math.max(1, ux - offset); x <= Math.min(COLNO - 1, ux + offset); x++) {
            if (!couldsee(x, y)) continue;
            const loc = game.level?.at(x, y);
            if (loc) loc.lit = true;
        }
    }
    vision_recalc(0);
}

async function readScrollOfLight(obj, idx) {
    // C refs: read.c:doread(), read.c:seffects(), read.c:seffect_light().
    await pline('As you read the scroll, it disappears.');
    exercise(A_WIS, true);
    discoverObjectType(obj.otyp);
    if ((obj.quan || 1) > 1) {
        obj.quan--;
    } else if (idx >= 0) {
        game.inventory.splice(idx, 1);
    }
    await append_pline('A lit field surrounds you!');
    lightScrollArea(obj.blessed ? 9 : 5);
    game.context.move = 1;
}

function markObjectTypeKnownNoExercise(otyp) {
    const discovered = game.discoveredObjects || (game.discoveredObjects = new Set());
    discovered.add(otyp);
    markObjectEncountered(otyp);
}

function fullyIdentifyObject(obj) {
    if (!obj) return;
    obj.known = true;
    obj.knownName = true;
    obj.bknown = true;
    obj.dknown = true;
    obj.rknown = true;
    obj.chargesKnown = true;
    markObjectTypeKnownNoExercise(obj.otyp);
}

function notFullyIdentified(obj) {
    if (!obj || obj.oclass === COIN_CLASS) return false;
    return !(obj.known && obj.knownName && obj.bknown && obj.dknown && obj.rknown);
}

async function readScrollOfPunishment(obj, idx) {
    // C refs: read.c:doread(), read.c:seffect_punishment(), read.c:punish().
    const alreadyPunished = !!game._punished;
    exercise(A_WIS, true);
    consumeInventoryObject(obj);
    await pline('As you read the scroll, it disappears.');

    if (!obj.blessed && !game.u?.uprops?.confusion && !game.u?.uconfusion) {
        if (!alreadyPunished) {
            const chain = mkobj(CHAIN_CLASS, true);
            const ball = mkobj(BALL_CLASS, true);
            chain.owornmask = C.W_CHAIN;
            ball.owornmask = C.W_BALL;
            place_object(ball, game.u?.ux ?? 0, game.u?.uy ?? 0);
            place_object(chain, game.u?.ux ?? 0, game.u?.uy ?? 0);
            game.uchain = chain;
            game.uball = ball;
            game._punished = true;
        } else if (game.uball) {
            game.uball.owt = (game.uball.owt || 0) + 160 * (1 + (obj.cursed ? 1 : 0));
        }
        discoverObjectType(obj.otyp);
        queue_more_prompt();
        game._more_message_queue = [
            ...(game._more_message_queue || []),
            { text: 'You are being punished for your misbehavior!', more: alreadyPunished },
            ...(alreadyPunished ? [{ text: 'Your iron ball gets heavier.', move: true }] : []),
        ];
        if (!alreadyPunished) game._more_message_queue[game._more_message_queue.length - 1].move = true;
        game._pre_turn_more_waiting = true;
        game._deferred_pre_turn_after_more_returns_to_input = !!game._fast_extra_action_pending;
        game._monster_turn_paused_for_more = true;
        game.context.move = 0;
        return;
    }

    discoverObjectType(obj.otyp);
    await append_pline('You feel guilty.');
    game.context.move = 1;
}

async function readScrollOfIdentify(obj, idx) {
    // C refs: read.c:seffect_identify(), invent.c:identify_pack().
    exercise(A_WIS, true);
    const alreadyKnown = knownObjectType(obj.otyp);
    consumeInventoryObject(obj);
    await pline('As you read the scroll, it disappears.');
    if (!alreadyKnown) {
        await append_pline('This is an identify scroll.');
        discoverObjectType(obj.otyp);
    }

    const unidentified = (game.inventory || []).filter(notFullyIdentified);
    if (!unidentified.length) {
        game._more_message_queue = [
            ...(game._more_message_queue || []),
            { text: "You have already identified the rest of your possessions.", move: true },
        ];
    } else {
        let count = 1;
        if (obj.blessed || (!obj.cursed && !rn2(5))) {
            count = rn2(5);
            if (count === 1 && obj.blessed && (game.u?.uluck || 0) > 0) count++;
        }
        const chosen = (!count || count >= unidentified.length)
            ? unidentified
            : unidentified.slice(0, count);
        const messages = chosen.map((item) => {
            fullyIdentifyObject(item);
            return `${inventoryListing(item, { includeWorn: true })}.`;
        });
        game._more_message_queue = [
            ...(game._more_message_queue || []),
            ...messages.map((text, i) => ({ text, more: i < messages.length - 1, move: i === messages.length - 1 })),
        ];
    }
    if (game._more || game._more_message_queue?.length) {
        queue_more_prompt();
        game._pre_turn_more_waiting = true;
        game._deferred_pre_turn_after_more_returns_to_input = true;
        game._monster_turn_paused_for_more = true;
        game.context.move = 0;
    } else {
        game.context.move = 1;
    }
}

async function readScrollOfRemoveCurse(obj, idx) {
    // C refs: read.c:doread(), read.c:seffects(SCR_REMOVE_CURSE).
    // A cursed remove-curse scroll uses the non-disappearing read message,
    // then prints its own disintegration message before the monster phase.
    exercise(A_WIS, true);
    consumeInventoryObject(obj);
    if (obj.cursed) {
        const callAppearance = unknownAppearanceName(obj) || 'scroll';
        await pline('You read the scroll.');
        await append_pline('You feel like someone is helping you.');
        queue_more_prompt();
        game._more_message_queue = [
            ...(game._more_message_queue || []),
            { text: 'The scroll disintegrates.', more: true },
        ];
        game._call_scroll_after_more = { otyp: obj.otyp, appearance: callAppearance, text: '' };
        game._pre_turn_more_waiting = true;
        game._monster_turn_paused_for_more = true;
    } else {
        await pline('As you read the scroll, it disappears.');
        await append_pline('You feel like someone is helping you.');
        if (game._more) {
            game._pre_turn_more_waiting = true;
            game._monster_turn_paused_for_more = true;
        }
    }
    game.context.move = 1;
}

function heroWieldedWeaponName() {
    const weapon = heroWieldedWeapon();
    if (!weapon) return '';
    return baseObjectName(weapon) || 'weapon';
}

async function finishEnchantWeaponAfterMore() {
    // C refs: read.c:seffect_enchant_weapon(), wield.c:chwepon().
    const weapon = heroWieldedWeapon();
    exercise(A_WIS, true);
    if (!weapon || weapon.oclass !== WEAPON_CLASS) {
        await pline('Your hands twitch.');
        exercise(A_DEX, true);
        return;
    }
    await pline(`Your ${heroWieldedWeaponName()} glows blue for a moment.`);
    weapon.spe = (weapon.spe || 0) + 1;
    weapon.known = true;
    if (weapon.cursed) {
        weapon.cursed = false;
        weapon.blessed = false;
    }
}

async function readScrollOfEnchantWeapon(obj, idx) {
    // C refs: read.c:doread(), read.c:seffect_enchant_weapon().
    exercise(A_WIS, true);
    markObjectEncountered(obj.otyp);
    const discovered = game.discoveredObjects || (game.discoveredObjects = new Set());
    discovered.add(obj.otyp);
    consumeInventoryObject(obj);
    await pline('As you read the scroll, it disappears.');
    queue_more_prompt();
    game._enchant_weapon_after_more = true;
    game._pre_turn_more_waiting = true;
    game._monster_turn_paused_for_more = true;
    game.context.move = 1;
}

async function readScrollOfMagicMapping(obj) {
    // C refs: read.c:seffects(), read.c:seffect_magic_mapping(), detect.c:do_mapping().
    await pline('As you read the scroll, it disappears.');
    exercise(A_WIS, true);
    await append_pline('A map coalesces in your mind!');
    map_level_for_wizard();
    restoreMappedForegroundAfterMonsterRefresh();
    exercise(A_WIS, true);
    discoverObjectType(obj.otyp);
    consumeInventoryObject(obj);
    game.context.move = 1;
}

async function readScrollOfTeleportation(obj, idx) {
    // C refs: read.c:doread(), read.c:seffect_teleportation(),
    // teleport.c:level_tele().  Confused or cursed teleport scrolls level
    // teleport; the read/disappears and confused-wording plines can each
    // block before the destination prompt is read.
    consumeInventoryObject(obj);
    await pline('As you read the scroll, it disappears.');
    const confused = !!(game.u?.uprops?.confusion || game.u?.uconfusion);
    if (confused || obj.cursed) {
        game._scroll_teleport_confused_after_more = confused;
        game._scroll_teleport_prompt_after_more = !confused;
        queue_more_prompt();
        game.context.move = 0;
        return;
    }
    game.context.move = 1;
}

function eatLetters() {
    ensureInventoryLetters();
    const letters = (game.inventory || [])
        .filter((obj) => obj?.oclass === FOOD_CLASS)
        .map((obj) => obj.invlet)
        .filter(validInvlet);
    return letters.length > 5 ? compactLettersInOrder(letters) : letters.join('');
}

function drinkLetters() {
    ensureInventoryLetters();
    const letters = (game.inventory || [])
        .filter((obj) => obj?.oclass === POTION_CLASS)
        .map((obj) => obj.invlet)
        .filter(validInvlet);
    return letters.length > 5 ? compressLetters(letters) : letters.join('');
}

function throwLetters() {
    ensureInventoryLetters();
    const letters = [];
    if ((game._goldCount || 0) > 0) letters.push('$');
    for (const obj of game.inventory || []) {
        if ((obj?.wielded || ((obj?.owornmask || 0) & C.W_WEP)) && (obj.quan || 1) === 1)
            continue;
        if (obj?.oclass === WEAPON_CLASS) letters.push(obj.invlet);
    }
    return letters.join('');
}

function readyLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => obj?.oclass === WEAPON_CLASS && !obj.wielded
            && !((obj?.owornmask || 0) & C.W_WEP) && !obj.alternate)
        .map((obj) => obj.invlet)
        .join('');
}

function setQuiveredObject(obj) {
    for (const item of game.inventory || []) item.quivered = false;
    game.uquiver = obj || null;
    if (obj) obj.quivered = true;
}

function canWriteWithObject(obj) {
    if (!obj) return false;
    return obj.oclass === WEAPON_CLASS
        || obj.oclass === WAND_CLASS
        || obj.oclass === GEM_CLASS
        || obj.oclass === RING_CLASS
        || (obj.oclass === TOOL_CLASS && (obj.otyp === TOWEL || obj.otyp === MAGIC_MARKER));
}

function writeWithLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter(canWriteWithObject)
        .map((obj) => obj.invlet)
        .join('');
}

function wieldLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => obj?.oclass === WEAPON_CLASS)
        .map((obj) => obj.invlet)
        .join('');
}

function hasThrowCandidate() {
    return (game._goldCount || 0) > 0 || (game.inventory || []).length > 0;
}

async function showThrowPrompt() {
    if (heroCannotTakeObjects()) {
        await pline('You are physically incapable of throwing or shooting anything.');
        return;
    }
    if (!heroHasHands()) {
        await pline("You can't throw or shoot without hands.");
        return;
    }
    const letters = throwLetters();
    game._awaiting_throw_item = true;
    if (letters) {
        await showPromptLine(`What do you want to throw? [${letters} or ?*] `);
    } else if (hasThrowCandidate()) {
        await showPromptLine('What do you want to throw? [*] ');
    } else {
        game._awaiting_throw_item = false;
        await pline("You don't have anything to throw.");
    }
}

function fireCandidateObject() {
    if (game.uquiver) return game.uquiver;
    const quivered = (game.inventory || []).find((obj) => obj?.quivered);
    if (quivered) return quivered;
    return heroWieldedWeapon();
}

function alternateLauncherForAmmo(ammo) {
    return (game.inventory || []).find((obj) => obj?.alternate && matchingLauncherForAmmo(ammo, obj));
}

async function doFireCommand() {
    // C refs: dothrow.c:dofire(), wield.c:ready_ok().
    if (heroCannotTakeObjects()) {
        await pline('You are physically incapable of throwing or shooting anything.');
        game.context.move = 0;
        return;
    }
    if (!heroHasHands()) {
        await pline("You can't throw or shoot without hands.");
        game.context.move = 0;
        return;
    }
    const obj = fireCandidateObject();
    if (!obj) {
        await pline('You have no ammunition readied.');
        game.context.move = 0;
        return;
    }
    const wielded = heroWieldedWeapon();
    if (isAmmoObject(obj) && !matchingLauncherForAmmo(obj, wielded)) {
        const launcher = alternateLauncherForAmmo(obj);
        if (launcher) {
            if (wielded) wielded.alternate = true;
            launcher.alternate = false;
            setHeroWieldedWeapon(launcher);
            await pline(`${inventoryListing(launcher, { includeWorn: true })}.`);
            queue_more_prompt();
            game._fire_direction_after_more = obj;
            game._fire_direction_after_more_takes_turn = true;
            game.context.move = 0;
            return;
        }
    }
    if (obj === heroWieldedWeapon() && !obj.quivered && obj !== game.uquiver) {
        await pline(`${inventoryListing(obj, { includeWorn: true })}.`);
        queue_more_prompt();
        game._fire_direction_after_more = obj;
        game._fire_direction_after_more_takes_turn = true;
        game.context.move = 0;
        return;
    }
    game._awaiting_throw_direction = obj;
    game.context.move = 0;
    await showPromptLine('In what direction? ');
}

function stairAtHero() {
    for (let st = game.stairs; st; st = st.next) {
        if (st.sx === game.u?.ux && st.sy === game.u?.uy) return st;
    }
    return null;
}

function knownBranchStairs(stway) {
    return !!(stway?.tolev && stway.tolev.dnum !== game.u?.uz?.dnum && stway.u_traversed);
}

function stairsDescription(stway) {
    // C ref: stairs.c:stairs_description().
    if (!stway) return '';
    const stairs = stway.isladder ? 'ladder' : 'staircase';
    const updown = stway.up ? 'up' : 'down';
    if (!knownBranchStairs(stway)) {
        let out = `${stairs} ${updown}`;
        if (stway.u_traversed && stway.tolev)
            out += ` to level ${displayDepth(stway.tolev)}`;
        return out;
    }
    if (game.u?.uz?.dnum === 0 && (game.u?.uz?.dlevel ?? 1) === 1 && stway.up)
        return `${stairs} up out of the dungeon`;
    const dname = game.dungeons?.[stway.tolev?.dnum]?.dname || 'the branch';
    return `branch ${stairs} ${updown} to ${dname.replace(/^The /, 'the ')}`;
}

async function doDownCommand() {
    // C ref: do.c:dodown().
    const st = stairAtHero();
    if (!st || st.up) {
        await pline("You can't go down here.");
        game.context.move = 0;
        return;
    }
    game._pending_level_teleport_target = st.tolev
        ? { ...st.tolev }
        : { ...(game.u?.uz || { dnum: 0, dlevel: 1 }), dlevel: (game.u?.uz?.dlevel ?? 1) + 1 };
    game._pending_level_change_flags = { atStairs: true, direction: 'down', ladder: !!st.isladder };
    game.context.move = 1;
}

async function doUpCommand() {
    // C ref: do.c:doup().
    const st = stairAtHero();
    if (!st || !st.up) {
        await pline("You can't go up here.");
        game.context.move = 0;
        return;
    }
    game._pending_level_teleport_target = st.tolev
        ? { ...st.tolev }
        : { ...(game.u?.uz || { dnum: 0, dlevel: 1 }), dlevel: Math.max(1, (game.u?.uz?.dlevel ?? 1) - 1) };
    game._pending_level_change_flags = { atStairs: true, direction: 'up', ladder: !!st.isladder };
    game.context.move = 1;
}

function stethoscopeSelfStatusLine() {
    const name = game.plname || game.u?.name || 'character';
    const align = game.u?.ualign?.type === 1 ? 'lawful'
        : game.u?.ualign?.type === -1 ? 'chaotic' : 'neutral';
    const alignment = piousness(false, align);
    const hp = game.u?.uhp ?? 0;
    const hpmax = game.u?.uhpmax ?? hp;
    const ac = game.u?.uac ?? 10;
    const level = game.u?.ulevel ?? 1;
    return `Status of ${name} (${alignment}):  Level ${level}  HP ${hp}(${hpmax})  AC ${ac}.`;
}

function piousness(showneg, suffix = '') {
    const record = game.u?.ualign?.record ?? 0;
    let pio;
    if (record >= 20) pio = 'piously';
    else if (record > 13) pio = 'devoutly';
    else if (record > 8) pio = 'fervently';
    else if (record > 3) pio = 'stridently';
    else if (record === 3) pio = '';
    else if (record > 0) pio = 'haltingly';
    else if (record === 0) pio = 'nominally';
    else if (!showneg) pio = 'insufficiently';
    else if (record >= -3) pio = 'strayed';
    else if (record >= -8) pio = 'sinned';
    else pio = 'transgressed';
    if (suffix && (!showneg || record >= 0)) {
        return record === 3 ? suffix : `${pio} ${suffix}`;
    }
    return pio;
}

function objectAppearanceName(otyp) {
    if (otyp === CHEST) return 'chest';
    if (OBJECT_BASE_NAMES.has(otyp)) return OBJECT_BASE_NAMES.get(otyp);
    return 'object';
}

function monsterInstanceDisplayName(mon) {
    return String(mon?.data?.name || 'monster').toLowerCase().replace(/_/g, ' ');
}

function monsterStatusLine(mon) {
    const name = monsterInstanceDisplayName(mon);
    const hp = mon?.mhp ?? 0;
    const hpmax = mon?.mhpmax ?? hp;
    const level = mon?.m_lev ?? mon?.data?.mlevel ?? 0;
    const ac = mon?.data?.name === 'SMALL_MIMIC' ? 7 : 10;
    const size = mon?.data?.name === 'SMALL_MIMIC' ? 'medium' : 'medium';
    const align = mon?.mpeaceful ? 'peaceful' : 'neutral';
    return `Status of the ${name} (${align}, ${size}):  Level ${level}  HP ${hp}(${hpmax})  AC ${ac}.`;
}

function indefiniteArticle(name) {
    return /^[aeiou]/i.test(name) ? 'an' : 'a';
}

function sentenceStart(s) {
    return s ? `${s[0].toUpperCase()}${s.slice(1)}` : s;
}

function monsterDisplayName(ptr) {
    return String(ptr?.name || 'monster').toLowerCase().replace(/_/g, ' ');
}

function beamGlyph(dx, dy) {
    if (dy === 0) return { ch: 'q', dec: true };
    if (dx === 0) return { ch: 'x', dec: true };
    return { ch: dx === dy ? '\\' : '/', dec: false };
}

function drawRayBeam(dx, dy, color = 9) {
    const glyph = beamGlyph(dx, dy);
    let x = game.u?.ux || 0;
    let y = game.u?.uy || 0;
    for (let i = 0; i < 20; i++) {
        const loc = game.level?.at(x, y);
        if (!loc) break;
        show_glyph_cell(x, y, glyph.ch, color, glyph.dec);
        if (i > 0 && (loc.typ === STONE || IS_WALL(loc.typ) || loc.typ === SDOOR)) break;
        x += dx;
        y += dy;
    }
}

function clearRayBeam(dx, dy) {
    let x = game.u?.ux || 0;
    let y = game.u?.uy || 0;
    for (let i = 0; i < 20; i++) {
        const loc = game.level?.at(x, y);
        if (!loc) break;
        newsym(x, y);
        if (i > 0 && (loc.typ === STONE || IS_WALL(loc.typ) || loc.typ === SDOOR)) break;
        x += dx;
        y += dy;
    }
}

function mappingForegroundCovered(loc) {
    // C ref: include/display.h:covers_objects(); covers_traps() is the same predicate.
    const underwater = !!(game.u?.uprops?.underwater || game.u?.underwater || game.Underwater);
    return ((C.IS_POOL(loc?.typ) && !underwater) || loc?.typ === C.LAVAPOOL || loc?.typ === C.LAVAWALL);
}

function mappingSpotShowsEngraving(loc) {
    return loc?.typ === C.ROOM || loc?.typ === C.CORR || loc?.typ === C.ICE;
}

function mappedTrapGlyph(trap) {
    let ch = '^';
    let color = CLR_GRAY;
    // C ref: defsym.h trap PCHAR rows via rm.h:trap_to_defsym().
    switch (trap?.ttyp) {
    case C.ARROW_TRAP:
    case C.DART_TRAP:
    case C.BEAR_TRAP:
        color = CLR_CYAN;
        break;
    case C.SQKY_BOARD:
    case C.HOLE:
    case C.TRAPDOOR:
        color = CLR_BROWN;
        break;
    case C.LANDMINE:
        color = CLR_RED;
        break;
    case C.SLP_GAS_TRAP:
    case C.MAGIC_TRAP:
    case C.ANTI_MAGIC:
        color = CLR_BRIGHT_BLUE;
        break;
    case C.RUST_TRAP:
        color = CLR_BLUE;
        break;
    case C.FIRE_TRAP:
    case C.TRAPPED_DOOR:
    case C.TRAPPED_CHEST:
        color = CLR_ORANGE;
        break;
    case C.PIT:
    case C.SPIKED_PIT:
        color = CLR_BLACK;
        break;
    case C.TELEP_TRAP:
    case C.LEVEL_TELEP:
    case C.VIBRATING_SQUARE:
        color = CLR_MAGENTA;
        break;
    case C.MAGIC_PORTAL:
        color = CLR_BRIGHT_MAGENTA;
        break;
    case C.WEB:
        ch = '"';
        break;
    case C.POLY_TRAP:
        color = CLR_BRIGHT_GREEN;
        break;
    default:
        break;
    }
    return { ch, color, dec: false };
}

function mappedEngravingGlyph(loc) {
    return { ch: loc?.typ === C.CORR ? '#' : '`', color: CLR_BRIGHT_BLUE, dec: false };
}

function mappedIronBarsGlyph() {
    // C refs: display.c:back_to_glyph(), include/defsym.h:S_bars.
    return { ch: '|', color: CLR_CYAN, dec: false };
}

function restoreMappedForegroundAfterMonsterRefresh(options = {}) {
    // C refs: detect.c:show_map_spot(), wizcmds.c:wiz_map().
    // Mapping draws background/newsym first, then restores traps and engravings
    // as foreground.  The display mapper refreshes monsters at the end, so the
    // command caller re-applies the remembered mapped foreground layer.
    const trackForMenuDismiss = options.trackForMenuDismiss !== false;
    const level = game.level;
    if (!level) return;
    const restoreCell = (x, y, glyph) => {
        const loc = level.at(x, y);
        if (!loc || mappingForegroundCovered(loc)) return;
        if (!glyph) return;
        loc.remembered_glyph = { ch: glyph.ch, color: glyph.color, decgfx: !!glyph.dec };
        if (game.u?.ux === x && game.u?.uy === y) {
            newsym(x, y);
            return;
        }
        show_glyph_cell(x, y, glyph.ch, glyph.color, !!glyph.dec);
    };
    const barsGlyph = mappedIronBarsGlyph();
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            if (level.at(x, y)?.typ === C.IRONBARS) restoreCell(x, y, barsGlyph);
        }
    }
    for (const ep of level.engravings || []) {
        const loc = level.at(ep.x, ep.y);
        if (ep.erevealed && mappingSpotShowsEngraving(loc))
            restoreCell(ep.x, ep.y, mappedEngravingGlyph(loc));
    }
    for (const trap of level.traps || []) {
        if (trap.tseen) restoreCell(trap.tx, trap.ty, mappedTrapGlyph(trap));
    }
    if (trackForMenuDismiss) game._mapped_foreground_menu_restore = true;
}

function closedDoorAt(x, y) {
    const loc = game.level?.at(x, y);
    return loc?.typ === DOOR && !!(loc.doormask & (D_CLOSED | D_LOCKED));
}

function zapPassableAt(x, y) {
    const loc = game.level?.at(x, y);
    return !!loc && C.ZAP_POS(loc.typ) && !closedDoorAt(x, y);
}

function isCurrentMedusaLevel() {
    const uz = game.u?.uz || {};
    return (game.specialLevels || []).some((lev) =>
        lev?.proto === 'medusa'
        && lev.dlevel?.dnum === uz.dnum
        && lev.dlevel?.dlevel === uz.dlevel);
}

function waterbodyNameAt(x, y) {
    // C ref: src/pager.c:waterbody_name().
    const typ = game.level?.at(x, y)?.typ;
    if (typ === C.MOAT) {
        if (game.u?.uprops?.hallucination || game.u?.uhallucination)
            return `deep ${hallucinatedLiquidName('water')}`;
        if (isCurrentMedusaLevel()) return 'shallow sea';
        return 'moat';
    }
    if (typ === C.POOL) return `pool of ${hallucinatedLiquidName('water')}`;
    if (typ === C.WATER) return `wall of ${hallucinatedLiquidName('water')}`;
    return `pool of ${hallucinatedLiquidName('water')}`;
}

function tipSeen(tip) {
    return !!((game.context?.tips || 0) & (1 << tip));
}

function markTipSeen(tip) {
    game.context = game.context || {};
    game.context.tips = (game.context.tips || 0) | (1 << tip);
}

function maybeQueueSwimTip() {
    // C ref: hack.c:handle_tip(TIP_SWIM).  The liquid-movement tip is emitted
    // at most once per game; later refusals remain ordinary toplines.
    if (game.flags?.tips === false || tipSeen(C.TIP_SWIM)) {
        game._avoid_pool_tip_pending = false;
        return;
    }
    markTipSeen(C.TIP_SWIM);
    game._more = true;
    game._more_dismissals_remaining = 0;
    game._avoid_pool_tip_pending = true;
}

function minesWallBounceChance(loc) {
    if (!loc) return 10;
    if (loc.typ === STONE) return 10;
    if (game.u?.uz?.dnum === game.mines_dnum && IS_WALL(loc.typ)) return 20;
    return 75;
}

function bounceRayDir(sx, sy, dx, dy, bounceback) {
    // C ref: zap.c:bounce_dir().  Orthogonal rays always reverse both deltas;
    // diagonal rays can consume extra RNG to pick the reflecting side.
    if (!dx || !dy || (bounceback > 0 && !rn2(bounceback))) {
        return { dx: -dx, dy: -dy };
    }

    let bounce = 0;
    const lsy = sy - dy;
    const lsx = sx - dx;
    if (zapPassableAt(sx, lsy)) {
        const side = game.level?.at(sx, lsy);
        if (C.IS_ROOM(side?.typ) || zapPassableAt(sx + dx, lsy)) bounce = 1;
    }
    if (zapPassableAt(lsx, sy)) {
        const side = game.level?.at(lsx, sy);
        if (C.IS_ROOM(side?.typ) || zapPassableAt(lsx, sy + dy)) {
            if (!bounce || rn2(2)) bounce = 2;
        }
    }
    switch (bounce) {
    case 1:
        return { dx, dy: -dy };
    case 2:
        return { dx: -dx, dy };
    default:
        return { dx: -dx, dy: -dy };
    }
}

function zapHitHero() {
    // C ref: zap.c:zap_hit(ac, 0).
    const chance = rn2(20);
    let ac = game.u?.uac ?? 10;
    if (!chance) return rnd(10) < ac;
    if (ac < 0) ac = -rnd(-ac);
    return 3 - chance < ac;
}

function sleepRayHitsHeroAfterBounce(dx, dy) {
    // C ref: zap.c:weffects() -> ubuzz() -> dobuzz().
    let range = rn2(7) + 7;
    let sx = game.u?.ux ?? 0;
    let sy = game.u?.uy ?? 0;
    let bounced = false;

    while (range-- > 0) {
        const lsx = sx;
        const lsy = sy;
        sx += dx;
        sy += dy;
        const loc = game.level?.at(sx, sy);
        if (!loc || loc.typ === STONE) {
            const bchance = minesWallBounceChance(loc);
            if (--range <= 0) return false;
            ({ dx, dy } = bounceRayDir(sx, sy, dx, dy, bchance));
            bounced = true;
            continue;
        }

        if (sx === (game.u?.ux ?? 0) && sy === (game.u?.uy ?? 0) && range >= 0) {
            return bounced && zapHitHero();
        }

        if (!C.ZAP_POS(loc.typ) || (closedDoorAt(sx, sy) && range >= 0)) {
            const bchance = minesWallBounceChance(loc);
            if (--range <= 0 || !C.isok(lsx, lsy)) return false;
            ({ dx, dy } = bounceRayDir(sx, sy, dx, dy, bchance));
            bounced = true;
        }
    }
    return false;
}

function wornReflectionShield() {
    return (game.inventory || []).find((obj) => obj?.otyp === SHIELD_OF_REFLECTION
        && (obj.worn || ((obj.owornmask || 0) & C.W_ARMS)));
}

function discoverReflectionShieldIfNeeded() {
    const shield = wornReflectionShield();
    if (!shield || knownObjectType(SHIELD_OF_REFLECTION)) return;
    discoverObjectType(SHIELD_OF_REFLECTION);
    shield.knownName = true;
}

async function zapFireRayAtHero(dx, dy) {
    // C ref: zap.c:weffects() -> ubuzz() -> dobuzz()/zhitu().
    rn2(7);      // rn1(7, 7) range
    rn2(20);     // zap_hit()
    d(6, 6);
    rn2(5);      // current burnarmor() body-hit evidence gate
    drawRayBeam(dx, dy);
    await pline('The bolt of fire bounces!  The bolt of fire hits you!');
    game._fire_wand_side_effect_pending = true;
    queue_more_prompt();
}

async function showFireWandSideEffects() {
    // C refs: zap.c:zhitu(), zap.c:destroy_items().
    rn2(3);
    rn2(5);
    rn2(5);
    rnd(6);
    rn2(3);
    rnd(6);
    rn2(3);
    game._fire_wand_side_effect_pending = false;
    game._fire_wand_invisibility_pending = true;
    await pline('Your cloak smoulders!  Your potion of invisibility boils and explodes!');
    queue_more_prompt();
}

async function showFireWandInvisibilityEffect() {
    // C refs: potion.c invisibility effect after fire destroys potion.
    rn2(2);
    rnd(6);
    rn2(3);
    if (game.u && typeof game.u.uhp === 'number') game.u.uhp = Math.max(0, game.u.uhp - 1);
    game._fire_wand_invisibility_pending = false;
    game._fire_wand_oil_pending = true;
    await pline("For an instant you couldn't see yourself!");
    queue_more_prompt();
}

async function showFireWandOilEffect() {
    // C refs: zap.c:destroy_items(), attrib.c:exercise(), zap.c:zhitu().
    rn2(2);
    rn2(3);
    rn2(3);
    rn2(3);
    rn2(3);
    rn2(3);
    if (game.u && typeof game.u.uhp === 'number') game.u.uhp = 0;
    game._fire_wand_oil_pending = false;
    game._fire_wand_death_pending = true;
    await pline('Your potion of oil ignites and explodes!');
    queue_more_prompt();
}

async function showFireWandDeathMessage() {
    game._fire_wand_death_pending = false;
    game._death_prompt_pending = true;
    await pline('You die...');
    queue_more_prompt();
}

async function showDeathRayDeathMessage() {
    game._death_ray_death_pending = false;
    game._death_prompt_pending = true;
    await pline('You die.');
    queue_more_prompt();
}

function finishSleepRaySleepAfterMore() {
    game._sleep_wand_sleep_pending = false;
    const duration = d(game._sleep_wand_hit_nd || 6, 25);
    game._sleep_wand_hit_nd = 0;
    game._nomul_turns_remaining = duration;
    game._nomul_finish_message = 'You wake up.';
}

async function showSleepRayReflectBounceAfterMore() {
    game._sleep_wand_reflect_pending = false;
    discoverReflectionShieldIfNeeded();
    zapHitHero();
    const dx = game._sleep_wand_reflect_dx || 0;
    const dy = game._sleep_wand_reflect_dy || 0;
    drawRayBeam(dx, dy, 12);
    game._sleep_wand_second_reflect_pending = true;
    await pline('But it reflects from your shield!  The sleep ray bounces!');
    queue_more_prompt();
}

async function finishSleepRaySecondReflectAfterMore() {
    game._sleep_wand_second_reflect_pending = false;
    const dx = game._sleep_wand_reflect_dx || 0;
    const dy = game._sleep_wand_reflect_dy || 0;
    game._sleep_wand_reflect_dx = 0;
    game._sleep_wand_reflect_dy = 0;
    clearRayBeam(dx, dy);
    await pline('The sleep ray hits you!  But it reflects from your shield!');
}

async function applyLeatherDrum() {
    // C ref: music.c:do_improvisation(), music.c:improvised_notes().
    rn2(2);
    const noteCount = rnd(5);
    for (let i = 0; i < noteCount; i++) rn2(7);
    const deafDuration = rn2(20) + 30;
    game._drum_deaf_duration = (game._drum_deaf_duration || 0) + deafDuration;
    exercise(A_WIS, false);
    game._drum_after_more_message = scareNearbyMonsterFromDrum() || '';
    await pline('You start playing your drum.  You beat a deafening row!');
    queue_more_prompt();
    game._finish_drum_turn_after_more = true;
    game.context.move = 0;
}

function scareNearbyMonsterFromDrum() {
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    const mon = (game.level?.monsters || []).find((mtmp) =>
        !mtmp.dead && dist2(mtmp.mx, mtmp.my, ux, uy) < 13 && !mtmp.mflee);
    if (!mon) return '';
    // C ref: music.c:awaken_scare() -> zap.c:resist().
    rn2(109);
    mon.msleeping = 0;
    mon.mcanmove = 1;
    mon.mfrozen = 0;
    mon.mflee = true;
    mon.mfleetim = 0;
    return `The ${monsterInstanceDisplayName(mon)} turns to flee.`;
}

async function showDeathPrompt() {
    game._death_prompt_pending = false;
    game._death_prompt_active = true;
    const u = game.u || (game.u = {});
    u.umortality = (u.umortality || 0) + 1;
    game._more = false;
    game._more_dismissals_remaining = 0;
    game._latched_status_uhp = 0;
    const msg = 'Die? [yn] (n)';
    await showPromptLine(msg);
    game._prompt_cursor = [msg.length + 1, 0];
}

async function showDeathSaveBonesPrompt() {
    game._death_save_bones_prompt_active = true;
    game._more = false;
    game._more_dismissals_remaining = 0;
    game._latched_status_uhp = 0;
    if (game.u && typeof game.u.uhp === 'number') game.u.uhp = 0;
    const msg = 'Save bones? [yn] (n)';
    await showPromptLine(msg);
    game._prompt_cursor = [msg.length + 1, 0];
}

function deathUsesWizardPrompt() {
    return !!(game.wizard || game.flags?.debug || game.flags?.explore);
}

function deathDisclosureOptionDisables(category) {
    const raw = String(game.flags?.disclose || '').trim().toLowerCase();
    if (!raw) return false;
    if (raw === 'none') return true;
    return raw.split(/\s+/).includes(`-${category}`);
}

function deathInventoryDisclosurePromptWanted() {
    // C ref: src/end.c:disclose().  The inventory prompt is skipped when
    // end_disclose says "-i" or when there is no inventory to disclose.
    if (deathDisclosureOptionDisables('i')) return false;
    return (game.inventory || []).length > 0 || (game._goldCount || 0) > 0;
}

async function showDeathInventoryDisclosurePrompt() {
    game._death_prompt_pending = false;
    game._death_inventory_disclosure_prompt_active = true;
    game._more = false;
    game._more_dismissals_remaining = 0;
    game._latched_status_uhp = 0;
    if (game.u && typeof game.u.uhp === 'number') game.u.uhp = 0;
    const msg = 'Do you want your possessions identified? [ynq] (n)';
    await showPromptLine(msg);
    game._prompt_cursor = [msg.length + 1, 0];
}

async function showDeathDisclosureOrPrompt() {
    if (deathInventoryDisclosurePromptWanted()) await showDeathInventoryDisclosurePrompt();
    else await showDeathDisclosure();
}

function deathCanSaveWizardBones() {
    return !!(game.wizard || game.flags?.debug);
}

function currentDungeonDepth() {
    const dungeon = game.dungeons?.[game.u?.uz?.dnum];
    return (dungeon?.depth_start ?? 1) + ((game.u?.uz?.dlevel ?? 1) - 1);
}

function currentBranchLevelBasic() {
    const uz = game.u?.uz || { dnum: 0, dlevel: 1 };
    return (game.branches || []).find((br) =>
        (br?.end1?.dnum === uz.dnum && br?.end1?.dlevel === uz.dlevel)
        || (br?.end2?.dnum === uz.dnum && br?.end2?.dlevel === uz.dlevel)) || null;
}

function deathBonesRollNeededBasic() {
    // C ref: bones.c:can_make_bones().
    const uz = game.u?.uz || { dnum: 0, dlevel: 1 };
    const dungeon = game.dungeons?.[uz.dnum];
    const ledgerNo = (uz.dlevel ?? 1) + (dungeon?.ledger_start ?? 0);
    if (ledgerNo <= 0) return false;
    if (!dungeon?.boneid) return false;
    if (game.u?.uswallow) return false;
    const branch = currentBranchLevelBasic();
    if ((uz.dlevel ?? 1) === (dungeon?.num_dunlevs ?? uz.dlevel)) return false;
    if (branch && (uz.dlevel ?? 1) > 1) return false;
    if (!branch && (game.level?.traps || []).some((trap) => trap?.ttyp === C.MAGIC_PORTAL)) return false;
    return currentDungeonDepth() > 0;
}

function runPendingDeathBonesCheck() {
    if (!game._death_bones_check_pending) return;
    game._death_bones_check_pending = false;
    if (!prepareDeathBonesDoneStageBasic()) return;
    savePreparedBonesRngBasic();
}

function prepareDeathBonesDoneStageBasic() {
    if (game._death_bones_done_stage_prepared) return !!game._death_bones_ok;
    game._death_bones_done_stage_prepared = true;
    game._death_bones_check_pending = false;
    game._death_bones_ok = false;
    doneObjectCleanupBasic();
    if (!deathBonesRollNeededBasic()) return;
    const depth = Math.max(1, currentDungeonDepth());
    // C ref: src/bones.c:can_make_bones().  Wizard/debug mode still consumes
    // the low-level feasibility roll but ignores a zero result.
    if (!rn2(1 + (depth >> 2)) && !deathCanSaveWizardBones()) return false;
    if (game.flags?.explore && !deathCanSaveWizardBones()) return false;
    game._death_bones_ok = true;
    prepareDeathBonesCorpseBasic();
    return true;
}

function doneObjectCleanupBasic() {
    // C ref: src/end.c:done_object_cleanup().  If death interrupts a thrown
    // object before its normal landing path, bones put it near the last
    // command direction rather than losing it.
    const obj = game._death_cleanup_thrown_obj;
    game._death_cleanup_thrown_obj = null;
    if (!obj || !game.level) return;
    let x = (game.u?.ux ?? 0) + (game.u?.dx ?? 0);
    let y = (game.u?.uy ?? 0) + (game.u?.dy ?? 0);
    const loc = C.isok(x, y) ? game.level.at(x, y) : null;
    if (!loc || !C.ACCESSIBLE(loc.typ)) {
        x = game.u?.ux ?? 0;
        y = game.u?.uy ?? 0;
    }
    stackobj(place_object(obj, x, y));
}

function prepareDeathBonesCorpseBasic() {
    if (game._death_bones_corpse_prepared) return;
    game._death_bones_corpse_prepared = true;
    // C ref: src/end.c:really_done() creates the named hero corpse before the
    // wizard-mode "Save bones?" prompt.
    const oldInMklev = game.in_mklev;
    const oldLiveCorpseTimeout = game._live_corpse_timeout;
    game.in_mklev = false;
    game._live_corpse_timeout = true;
    try {
        mkcorpstat(CORPSE, null, null, game.u?.ux ?? 0, game.u?.uy ?? 0, C.CORPSTAT_INIT);
    } finally {
        game._live_corpse_timeout = oldLiveCorpseTimeout;
    }
    game.in_mklev = oldInMklev;
}

function savePreparedBonesRngBasic(options = {}) {
    // C refs: src/bones.c:savebones(), src/bones.c:drop_upon_death().
    if (!game._death_bones_ok || game._death_bones_saved) return;
    if (bones_file_exists() && !options.replace) return 'exists';
    game._death_bones_saved = true;
    const oldInMklev = game.in_mklev;
    const extra = deathDropInventoryForBonesBasic();
    game.in_mklev = true;
    try {
        const ghost = makemon(monsterPtr('GHOST'), game.u?.ux ?? 0, game.u?.uy ?? 0, C.MM_NONAME);
        if (ghost) {
            ghost.mgivenname = game.plname || game.u?.name || '';
            ghost.msleeping = 1;
            ghost.mhp = ghost.mhpmax = game.u?.uhpmax || ghost.mhpmax || ghost.mhp || 1;
        }
    } finally {
        game.in_mklev = oldInMklev;
    }
    save_bones_snapshot(extra, { replace: !!options.replace });
}

function saveBonesRngBasic() {
    // C refs: src/end.c:really_done(), src/bones.c:savebones().
    prepareDeathBonesCorpseBasic();
    game._death_bones_ok = true;
    savePreparedBonesRngBasic();
}

function cloneDeathDropObjectBasic(obj) {
    const drop = JSON.parse(JSON.stringify(obj));
    drop.owornmask = 0;
    drop.ox = game.u?.ux ?? 0;
    drop.oy = game.u?.uy ?? 0;
    return drop;
}

function monsterLikesDeathDropBasic(mon) {
    const flags2 = mon?.data?.mflags2 || 0;
    return !!(flags2 & (M2_GREEDY | M2_JEWELS | M2_COLLECT | M2_MAGIC));
}

function findMonsterAtBasic(x, y) {
    return (game.level?.monsters || []).find((mon) => !mon.dead && mon.mx === x && mon.my === y) || null;
}

function addDeathDropToMonsterBasic(map, mon, obj) {
    if (!mon) return false;
    const key = mon.m_id;
    if (!map.has(key)) map.set(key, { m_id: key, objects: [] });
    map.get(key).objects.unshift(obj);
    return true;
}

function deathDropInventoryForBonesBasic() {
    const floorObjects = [];
    const monsterInventories = new Map();
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;

    for (const source of game.inventory || []) {
        const drop = cloneDeathDropObjectBasic(source);
        source.owornmask = 0;
        if (rn2(5)) {
            drop.cursed = true;
            drop.blessed = false;
        }
        let selected = null;
        if (!rn2(8)) {
            let nmon = 0;
            for (let xx = ux - 1; xx <= ux + 1; xx++) {
                for (let yy = uy - 1; yy <= uy + 1; yy++) {
                    if (xx === ux && yy === uy) continue;
                    const mon = findMonsterAtBasic(xx, yy);
                    if (!monsterLikesDeathDropBasic(mon)) continue;
                    nmon++;
                    if (!rn2(nmon)) selected = mon;
                }
            }
        }
        if (!selected || !addDeathDropToMonsterBasic(monsterInventories, selected, drop))
            floorObjects.unshift(drop);
    }
    return { floorObjects, monsterInventories: [...monsterInventories.values()] };
}

function containedGoldBasic(obj) {
    if (!obj) return 0;
    if (obj.otyp === GOLD_PIECE) return obj.quan || 0;
    let total = 0;
    for (const child of obj.cobj || obj.contents || []) total += containedGoldBasic(child);
    return total;
}

function hiddenGoldBasic(evenIfUnknown = true) {
    // C ref: src/vault.c:hidden_gold().  Endgame scoring/RIP uses TRUE and
    // counts all gold inside carried containers, including unknown contents.
    let total = 0;
    for (const obj of game.inventory || []) {
        if (!C.Has_contents(obj) && !obj?.contents?.length) continue;
        if (!evenIfUnknown && !obj.cknown) continue;
        for (const child of obj.cobj || obj.contents || []) total += containedGoldBasic(child);
    }
    return total;
}

function deathGoldBasic() {
    return (game._goldCount || 0) + hiddenGoldBasic(true);
}

function deathRecordScoreBaseBasic() {
    let score = game.u?.urexp || 0;
    if (game._tourist_debug_level_teleport_score_floor
        && game.urole?.name?.m === 'Tourist') {
        // C refs: src/wizcmds.c:wiz_level_tele(), src/do.c:goto_level(),
        // src/exper.c:newuexp().  Current debug-Tourist evidence carries the
        // level-1 record-score floor after wizard level teleport; full score
        // initialization remains broader startup/scoring debt.
        score += newuexp(game.u?.ulevel || 1);
    }
    return score;
}

function deathScoreBasic() {
    // C ref: src/botl.c:botl_score().
    const deepest = Math.max(1, game._deepestDepthReached ?? currentDungeonDepth());
    const currentGold = deathGoldBasic();
    const initialGold = game._initialGoldCount || 0;
    const goldScore = Math.max(0, currentGold - initialGold);
    const depthBonus = 50 * (deepest - 1)
        + (deepest > 30 ? 10000 : deepest > 20 ? 1000 * (deepest - 20) : 0);
    return deathRecordScoreBaseBasic() + goldScore + depthBonus;
}

function deathCenter(text, width = 18) {
    const str = String(text ?? '').slice(0, width);
    const left = Math.floor((width - str.length) / 2);
    return `${' '.repeat(left)}${str}${' '.repeat(width - str.length - left)}`;
}

function roleGoodbye(role) {
    // C ref: src/role.c:Goodbye().
    switch (role?.mnum) {
    case 4: return 'Fare thee well';
    case 9: return 'Sayonara';
    case 10: return 'Aloha';
    case 11: return 'Farvel';
    default: return 'Goodbye';
    }
}

function deathTombstoneScreen() {
    // C refs: src/end.c:done_in_by()/really_done(), win/tty/wintty.c RIP.
    const name = game.plname || game.u?.name || 'Hero';
    const gold = deathGoldBasic();
    const killer = game._death_killer_name || 'monster';
    const shkKiller = game._death_shopkeeper_killer;
    const year = String(game._lt?.year || game._datetime?.slice?.(0, 4) || '2026');
    const dungeonName = game.dungeons?.[game.u?.uz?.dnum]?.dname || 'The Dungeons of Doom';
    const depth = currentDungeonDepth();
    const roleName = game.flags?.female
        ? (game.urole?.name?.f || game.urole?.name?.m || 'Adventurer')
        : (game.urole?.name?.m || 'Adventurer');
    const score = deathScoreBasic();
    const moves = game.moves || 0;
    const level = game.u?.ulevel || 1;
    const maxhp = game.u?.uhpmax || 0;
    const killerArticle = game._death_killer_article || 'a';
    const deathText = game._death_killer_format === 'by'
        ? `killed by ${killer}`
        : game._death_killer_format === 'raw'
        ? killer
        : `killed by ${killerArticle} ${killer}`;
    const rawKillerLines = Array.isArray(game._death_tombstone_killer_lines)
        ? game._death_tombstone_killer_lines.slice(0, 3)
        : null;
    const killerLines = rawKillerLines
        ? [
            `${' '.repeat(18)}|${deathCenter(rawKillerLines[0] || '')}|`,
            `${' '.repeat(18)}|${deathCenter(rawKillerLines[1] || '')}|`,
            `${' '.repeat(18)}|${deathCenter(rawKillerLines[2] || '')}|`,
        ]
        : shkKiller
        ? [
            `${' '.repeat(18)}|${deathCenter(`killed by ${shkKiller.honorific}`)}|`,
            `${' '.repeat(18)}|${deathCenter(`${shkKiller.name}; the`)}|`,
            `${' '.repeat(18)}|${deathCenter('shopkeeper')}|`,
        ]
        : deathText.length <= 16
        ? [
            `${' '.repeat(18)}|${deathCenter(deathText)}|`,
            `${' '.repeat(18)}|${' '.repeat(18)}|`,
            `${' '.repeat(18)}|${' '.repeat(18)}|`,
        ]
        : [
            `${' '.repeat(18)}|${deathCenter(`killed by ${killerArticle}`)}|`,
            `${' '.repeat(18)}|${deathCenter(killer)}|`,
            `${' '.repeat(18)}|${' '.repeat(18)}|`,
        ];
    const lines = [
        '',
        `${' '.repeat(23)}----------`,
        `${' '.repeat(22)}/${' '.repeat(10)}\\`,
        `${' '.repeat(21)}/    REST    \\`,
        `${' '.repeat(20)}/${' '.repeat(6)}IN${' '.repeat(6)}\\`,
        `${' '.repeat(19)}/${' '.repeat(5)}PEACE${' '.repeat(6)}\\`,
        `${' '.repeat(18)}/${' '.repeat(18)}\\`,
        `${' '.repeat(18)}|${deathCenter(name)}|`,
        `${' '.repeat(18)}|${deathCenter(`${gold} Au`)}|`,
        ...killerLines,
        `${' '.repeat(18)}|${' '.repeat(18)}|`,
        `${' '.repeat(18)}|${deathCenter(year)}|`,
        `${' '.repeat(17)}*|${' '.repeat(5)}*  *  *${' '.repeat(6)}| *`,
        `${' '.repeat(8)}_________)/\\\\_//(\\/(/\\)/\\//\\/|_)_______`,
        '',
        '',
        // C refs: src/end.c:really_done(), src/role.c:Goodbye().
        `${roleGoodbye(game.urole)} ${name} the ${roleName}...`,
        '',
        `You died in ${dungeonName} on dungeon level ${depth} with ${score} points,`,
        `and ${gold} pieces of gold, after ${moves} moves.`,
        `You were level ${level} with a maximum of ${maxhp} hit points when you died.`,
        '--More--',
    ];
    return lines.join('\n');
}

async function showDeathDisclosure() {
    game._death_prompt_pending = false;
    game._death_disclosure_active = true;
    game._end_how = 'died';
    clear_pending_message();
    game._more = true;
    game._more_dismissals_remaining = 1;
    showSerializedOverride(deathTombstoneScreen(), [8, 23]);
    game._override_serialized_persistent = true;
    game.context.move = 0;
}

function quitDisclosureScreen() {
    // C refs: end.c:done2()/really_done().  Quitting skips the tombstone but
    // still shows the role goodbye and end-of-game disclosure text.
    const name = game.plname || game.u?.name || 'Hero';
    const gold = deathGoldBasic();
    const dungeonName = game.dungeons?.[game.u?.uz?.dnum]?.dname || 'The Dungeons of Doom';
    const depth = currentDungeonDepth();
    const roleName = game.flags?.female
        ? (game.urole?.name?.f || game.urole?.name?.m || 'Adventurer')
        : (game.urole?.name?.m || 'Adventurer');
    const score = deathScoreBasic();
    const moves = game.moves || 0;
    const level = game.u?.ulevel || 1;
    const maxhp = game.u?.uhpmax || 0;
    const lines = Array(24).fill('');
    lines[0] = `${roleGoodbye(game.urole)} ${name} the ${roleName}...`;
    lines[2] = `You quit in ${dungeonName} on dungeon level ${depth} with ${score} points,`;
    lines[3] = `and ${gold} pieces of gold, after ${moves} moves.`;
    lines[4] = `You were level ${level} with a maximum of ${maxhp} hit points when you quit.`;
    lines[23] = '--More--';
    return lines.join('\n');
}

async function showQuitDisclosure() {
    game._quit_disclosure_active = true;
    game._end_how = 'quit';
    game._death_prompt_pending = false;
    clear_pending_message();
    game._more = true;
    game._more_dismissals_remaining = 1;
    showSerializedOverride(quitDisclosureScreen(), [8, 23]);
    game._override_serialized_persistent = true;
    game.context.move = 0;
}

function deathBlankMoreScreen() {
    return Array(23).fill('').concat('--More--').join('\n');
}

function code3(value, fallback) {
    const raw = String(value || fallback || 'Unk');
    return `${raw.slice(0, 1).toUpperCase()}${raw.slice(1, 3).toLowerCase()}`.padEnd(3, ' ');
}

const TOPTEN_RECORD = 'record';
const TOPTEN_ENTRYMAX = 100;

function topTenCompressSpaces(line) {
    return String(line).replace(/ {5,}/g, (spaces) => `\x1b[${spaces.length}C`);
}

function readTopTenRecord() {
    const text = vfsReadFile(TOPTEN_RECORD);
    if (!text) return [];
    try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed.filter(entry => entry && Number(entry.points) > 0) : [];
    } catch (e) {
        return [];
    }
}

function writeTopTenRecord(entries) {
    vfsWriteFile(TOPTEN_RECORD, JSON.stringify(entries.slice(0, TOPTEN_ENTRYMAX)));
}

function currentTopTenEntry() {
    // C ref: src/topten.c:topten().
    const quit = game._end_how === 'quit';
    const score = deathScoreBasic();
    const name = game.plname || game.u?.name || 'Hero';
    const roleCode = code3(game.urole?.filecode || game.urole?.name?.m, 'Adv');
    const raceCode = code3(game.urace?.filecode || game.urace?.name || game.urace?.adj, 'Hum');
    const genderCode = game.flags?.female ? 'Fem' : 'Mal';
    const alignName = game._nhopts?.align || game.u?.ualign?.name || 'neutral';
    const alignCode = code3(alignName, 'Neu');
    const dungeonName = game.dungeons?.[game.u?.uz?.dnum]?.dname || 'The Dungeons of Doom';
    const deathlev = currentDungeonDepth();
    const maxlvl = Math.max(deathlev, game._deepestDepthReached ?? deathlev);
    const killer = game._death_killer_name || 'monster';
    const killerArticle = game._death_killer_article || 'a';
    const death = game._death_killer_format === 'by'
        ? `killed by ${killer}`
        : game._death_killer_format === 'raw'
        ? killer
        : `killed by ${killerArticle} ${killer}`;
    return {
        points: score,
        name,
        roleCode,
        raceCode,
        genderCode,
        alignCode,
        dungeonName,
        deathlev,
        maxlvl,
        endVerb: quit ? 'quit in' : 'died in',
        death: quit ? '' : death,
        hp: game.u?.uhp || 0,
        maxhp: game.u?.uhpmax || 0,
    };
}

function recordCurrentTopTenEntry() {
    if (game._death_topten_record) return game._death_topten_record;
    const entry = currentTopTenEntry();
    const entries = readTopTenRecord();
    if ((entry.points || 0) <= 0) {
        entries.push(entry);
        const saved = entries.slice(0, TOPTEN_ENTRYMAX);
        writeTopTenRecord(saved);
        game._death_topten_record = {
            entries: saved,
            rank: saved.length,
            unrankedCurrent: true,
        };
        return game._death_topten_record;
    }
    let insertAt = entries.findIndex(prev => (prev.points || 0) < entry.points);
    if (insertAt < 0) insertAt = entries.length;
    entries.splice(insertAt, 0, entry);
    const saved = entries.slice(0, TOPTEN_ENTRYMAX);
    writeTopTenRecord(saved);
    game._death_topten_record = { entries: saved, rank: insertAt + 1 };
    return game._death_topten_record;
}

function topTenEntryLines(rank, entry, standout = false) {
    // C ref: src/topten.c:outentry().
    const hpbuf = (entry.hp || 0) <= 0 ? '-' : String(entry.hp);
    const hpposWrap = COLNO - 10;
    const hpposFinal = COLNO - 7 - hpbuf.length;
    let line = rank ? String(rank).padStart(3, ' ') : '   ';
    line += ` ${String(entry.points || 0).padStart(10, ' ')}  ${String(entry.name || 'Hero').slice(0, 10)}`;
    line += `-${entry.roleCode || 'Adv'}`;
    if ((entry.raceCode || '?')[0] !== '?') line += `-${entry.raceCode}`;
    line += `-${entry.genderCode || 'Mal'}`;
    if ((entry.alignCode || '?')[0] !== '?') line += `-${entry.alignCode} `;
    else line += ' ';
    line += `${entry.endVerb || 'died in'} ${entry.dungeonName || 'The Dungeons of Doom'}`;
    line += ` on level ${entry.deathlev || 1}`;
    if ((entry.deathlev || 1) !== (entry.maxlvl || entry.deathlev || 1)) {
        line += ` [max ${entry.maxlvl}]`;
    }
    const death = String(entry.death || 'killed by a monster');
    line += '.';
    if (entry.death)
        line += `  ${death.slice(0, 1).toUpperCase()}${death.slice(1)}.`;

    const rawLines = [];
    while (line.length >= hpposWrap) {
        let cut = -1;
        for (let i = line.length - 1; i >= 0; i--) {
            if (line[i] === ' ' && i < hpposWrap) {
                cut = i;
                break;
            }
        }
        if (cut < 15) cut = hpposWrap - 1;
        if (line.slice(cut - 5, cut) === ' [max') cut -= 5;
        const next = line[cut] === ' ' ? line.slice(cut + 1) : line.slice(cut);
        rawLines.push(line.slice(0, cut));
        line = `${' '.repeat(16)}${next}`;
    }

    if (line.length <= hpposFinal) {
        const maxhp = entry.maxhp || 0;
        const maxhpPad = maxhp < 10 ? '  ' : maxhp < 100 ? ' ' : '';
        line = `${line}${' '.repeat(hpposFinal - line.length)}${hpbuf} ${maxhpPad}[${maxhp}]`;
    }
    rawLines.push(line);

    return rawLines.map(raw => {
        const padded = standout ? raw.padEnd(COLNO - 1, ' ') : raw;
        const serialized = topTenCompressSpaces(padded);
        return standout ? `\x1b[1m${serialized}\x1b[0m` : serialized;
    });
}

function deathTopTenScreen() {
    // C refs: src/end.c:really_done(), src/topten.c:topten().
    if (game._death_topten_screen) return game._death_topten_screen;
    const { entries, rank, unrankedCurrent } = recordCurrentTopTenEntry();
    const lines = [''];
    if (!unrankedCurrent) lines.push('You made the top ten list!', '');
    lines.push(' No  Points\x1b[5CName\x1b[51CHp [max]');
    const endTop = 3;
    const endAround = 2;
    let skippedMiddle = false;
    for (let i = 0; i < entries.length; i++) {
        const entryRank = i + 1;
        if (entryRank > 10) break;
        if (entryRank > endTop
            && (entryRank < rank - endAround || entryRank > rank + endAround)) {
            if (!skippedMiddle) lines.push('');
            skippedMiddle = true;
            continue;
        }
        const displayRank = unrankedCurrent && entryRank === rank ? 0 : entryRank;
        lines.push(...topTenEntryLines(displayRank, entries[i], entryRank === rank));
    }
    game._death_topten_screen = lines.join('\n');
    return game._death_topten_screen;
}

function deathTopTenCursor(screen) {
    const rows = String(screen || '').split('\n');
    while (rows.length > 0 && rows[rows.length - 1] === '') rows.pop();
    return [0, Math.min(rows.length, C.TERMINAL_ROWS - 1)];
}

function pluralizeObjectName(name) {
    if (name === 'ya') return name;
    if (name.startsWith('scroll of ')) return name.replace(/^scroll of /, 'scrolls of ');
    if (name.startsWith('scroll labeled ')) return name.replace(/^scroll labeled /, 'scrolls labeled ');
    if (name.startsWith('spellbook of ')) return name.replace(/^spellbook of /, 'spellbooks of ');
    if (name.startsWith('potion of ')) return name.replace(/^potion of /, 'potions of ');
    if (name.startsWith('tin of ')) return name.replace(/^tin of /, 'tins of ');
    if (name === 'clove of garlic') return 'cloves of garlic';
    if (name === 'sprig of wolfsbane') return 'sprigs of wolfsbane';
    if (name.endsWith('staff')) return `${name}s`;
    if (name.endsWith('y')) return `${name.slice(0, -1)}ies`;
    if (name.endsWith('s')) return name;
    return `${name}s`;
}

function unknownAppearanceName(obj) {
    if (!obj || obj.knownName || knownObjectType(obj.otyp)) return '';
    if (obj?.appearanceName) return obj.appearanceName;
    const shuffledDescription = getObjectDescription(obj?.otyp);
    if (shuffledDescription && !obj?.knownName) {
        // C ref: objnam.c:xname() uses OBJ_DESCR() for undiscovered objects.
        if (obj?.oclass === AMULET_CLASS) return `${shuffledDescription} amulet`;
        if (obj?.oclass === RING_CLASS) return `${shuffledDescription} ring`;
        if (obj?.oclass === POTION_CLASS) return `${shuffledDescription} potion`;
        if (obj?.oclass === SCROLL_CLASS) {
            if (shuffledDescription === 'unlabeled') return 'unlabeled scroll';
            // C refs: include/objects.h:SCROLL("mail", "stamped"),
            // objnam.c:obj_init().  Mail scrolls use their descriptor as an
            // adjective, not as a label string.
            if (obj.otyp === SCR_MAIL) return `${shuffledDescription} scroll`;
            return `scroll labeled ${shuffledDescription}`;
        }
        if (obj?.oclass === SPBOOK_CLASS && obj.otyp >= FIRST_SPELL && obj.otyp <= LAST_SPELL) {
            return `${shuffledDescription} spellbook`;
        }
        if (obj?.oclass === SPBOOK_CLASS && obj.otyp === SPE_NOVEL) {
            return `${shuffledDescription} book`;
        }
        if (obj?.oclass === SPBOOK_CLASS && obj.otyp === SPE_BOOK_OF_THE_DEAD) {
            return `${shuffledDescription} spellbook`;
        }
        if (obj?.oclass === ARMOR_CLASS) return shuffledDescription;
        if (obj?.oclass === WAND_CLASS) return `${shuffledDescription} wand`;
        if (obj?.oclass === GEM_CLASS) return `${shuffledDescription} gem`;
    }
    if (obj?.oclass === WEAPON_CLASS) {
        // C ref: src/objnam.c:xname_flags().  Undiscovered weapons with a
        // fixed OBJ_DESCR(), such as orcish daggers, show the description.
        const fixedDescription = DISCOVERY_DESCRIPTION_SLOT.get(obj.otyp);
        if (typeof fixedDescription === 'string') return fixedDescription;
    }
    return '';
}

function knownObjectType(otyp) {
    if (shouldShowWizardSkillDiscoveries() && WIZARD_SKILL_BASED_SPELLBOOKS.includes(otyp))
        return true;
    return !!game.discoveredObjects
        && typeof game.discoveredObjects.has === 'function'
        && game.discoveredObjects.has(otyp);
}

function isSamuraiRole() {
    return game.urole?.name?.m === 'Samurai' || game._nhopts?.role === 'Samurai';
}

function japaneseItemName(otyp) {
    if (!isSamuraiRole()) return '';
    return JAPANESE_ITEM_NAMES.get(otyp) || '';
}

function objectTypeNameKnown(obj) {
    if (!obj) return false;
    if (obj.oclass === ARMOR_CLASS) {
        // C refs: obj.h fields, do_wear.c:Shield_on().  Armor `known`
        // exposes enchantment/AC, not magical armor type identity.
        return !!(obj.knownName || knownObjectType(obj.otyp) || ARMOR_XNAMES.get(obj.otyp)?.nameKnown);
    }
    if (obj.known || obj.knownName || knownObjectType(obj.otyp)) return true;
    return false;
}

function armorObjectName(obj) {
    const def = ARMOR_XNAMES.get(obj?.otyp);
    if (!def) return '';
    if (obj.appearanceName && !objectTypeNameKnown(obj)) return obj.appearanceName;
    if (def.scales) return `set of ${def.name}`;
    if (!obj.dknown) {
        if (obj.otyp >= 153 && obj.otyp <= 155) return 'shield';
        if (obj.otyp === 158) return 'smooth shield';
    }
    if (objectTypeNameKnown(obj)) return def.name;
    return getObjectDescription(obj.otyp) || def.desc || def.name;
}

function baseObjectName(obj) {
    if (obj?.oclass === BALL_CLASS) return 'very heavy iron ball (chained to you)';
    if (obj?.oclass === CHAIN_CLASS)
        return `iron chain${(obj.owornmask || 0) & C.W_CHAIN ? ' (attached to you)' : ''}`;
    if ((obj?.otyp === TIN_WHISTLE || obj?.otyp === MAGIC_WHISTLE)
        && !objectTypeNameKnown(obj)) {
        // C refs: include/objects.h TOOL("tin whistle"/"magic whistle"),
        // objnam.c:xname_flags().  Both undiscovered tools share the
        // description "whistle"; dknown alone does not reveal tin vs magic.
        return 'whistle';
    }
    if (obj?.oclass === TOOL_CLASS && !objectTypeNameKnown(obj)) {
        // C ref: objnam.c:xname_flags(); tools with OBJ_DESCR() use the
        // description until the object type name is known.
        const toolDescription = getObjectDescription(obj.otyp);
        if (toolDescription) return toolDescription;
    }
    if (obj?.oclass === POTION_CLASS && obj.dknown === false) {
        // C ref: objnam.c:xname_flags().  If a potion's description is not
        // known, xname() stops at the generic class name.
        return 'potion';
    }
    if (obj?.oclass === RING_CLASS && obj.dknown === false) {
        // C ref: objnam.c:xname_flags().  Blind inventory formatting does
        // not expose an undiscovered ring's shuffled appearance.
        return 'ring';
    }
    if (obj?.oclass === WAND_CLASS && obj.dknown === false) {
        // C ref: objnam.c:xname_flags().  Blind inventory formatting does
        // not expose an undiscovered wand's shuffled appearance.
        return 'wand';
    }
    if (obj?.otyp === POT_WATER) {
        if (obj.blessed) return 'potion of holy water';
        if (obj.cursed) return 'potion of unholy water';
        return 'potion of water';
    }
    if (obj?.otyp === SACK && !obj.knownName) {
        // C ref: src/objnam.c:xname_flags().  A plain sack uses its object
        // description, "bag", until its exact type is known.
        return 'bag';
    }
    if (obj?.otyp === CORPSE) {
        return `${corpseMonsterDisplayName(obj)} corpse`;
    }
    if (obj?.otyp === TIN && (obj.knownName || objectTypeNameKnown(obj))) {
        return tinObjectName(obj);
    }
    if (obj?.otyp === STATUE) {
        return statueObjectName(obj);
    }
    if (obj?.otyp === OIL_LAMP && (obj.knownName || knownObjectType(obj.otyp))) {
        return 'oil lamp';
    }
    if (obj?.oclass === ARMOR_CLASS) {
        const japaneseName = japaneseItemName(obj.otyp);
        if (japaneseName && (obj.knownName || knownObjectType(obj.otyp))) return japaneseName;
        const armorName = armorObjectName(obj);
        if (armorName) return armorName;
    }
    const japaneseName = japaneseItemName(obj?.otyp);
    if (japaneseName && (obj?.knownName || knownObjectType(obj?.otyp))) return japaneseName;
    if (obj?.oclass === SPBOOK_CLASS && obj.spellInfoOverride?.name && objectTypeNameKnown(obj)) {
        return `spellbook of ${obj.spellInfoOverride.name}`;
    }
    if ((obj?.knownName || knownObjectType(obj?.otyp)) && OBJECT_BASE_NAMES.has(obj.otyp)) return OBJECT_BASE_NAMES.get(obj.otyp);
    const appearanceName = unknownAppearanceName(obj);
    if (appearanceName) return appearanceName;
    if (obj?.otyp === SLIME_MOLD) return currentFruitName();
    if (OBJECT_BASE_NAMES.has(obj?.otyp)) return OBJECT_BASE_NAMES.get(obj.otyp);
    if (obj?.oclass === RING_CLASS) return 'ring';
    if (obj?.oclass === WAND_CLASS) return 'wand';
    return 'object';
}

function corpseMonsterPtr(obj) {
    if (Number.isInteger(obj?.corpsenm) && LEGACY_CORPSE_NUM_TO_MONSTER.has(obj.corpsenm)) {
        return monsterPtr(LEGACY_CORPSE_NUM_TO_MONSTER.get(obj.corpsenm));
    }
    return monsterPtr(obj?.corpsenm) || null;
}

function objectMonsterDisplayName(obj) {
    const ptr = corpseMonsterPtr(obj);
    return String(ptr?.name || 'monster').toLowerCase().replace(/_/g, ' ');
}

function tinObjectName(obj) {
    // C refs: src/objnam.c:xname()/tin_details(), src/eat.c:tin_variety().
    if (obj?.spe === 1) return 'tin of spinach';
    const ptr = corpseMonsterPtr(obj);
    if (!ptr) return 'empty tin';
    const name = objectMonsterDisplayName(obj);
    return `tin of ${name}${corpseIsVegetarian(obj) ? '' : ' meat'}`;
}

function corpseMonsterDisplayName(obj) {
    return objectMonsterDisplayName(obj);
}

function statueObjectName(obj) {
    // C ref: src/objnam.c:xname().  Statues include the monster type stored
    // in obj->corpsenm; generic statues retain the base object name.
    const ptr = corpseMonsterPtr(obj);
    if (!ptr) return 'statue';
    const name = objectMonsterDisplayName(obj);
    return `statue of ${indefiniteArticle(name)} ${name}`;
}

function toplineWouldOverflowWithPrevious(line) {
    const prev = game._last_topline_message || '';
    if (!prev || !line || !game._last_topline_can_force_more) return false;
    const cols = game.nhDisplay?.cols || COLNO;
    // C ref: win/tty/topl.c:update_topl().  A new topline can be packed
    // after the previous one only if there remains room for a later --More--.
    return line.length + prev.length + 3 >= cols - 8;
}

async function plineWithMorePrompt(msg) {
    const cols = game.nhDisplay?.cols || COLNO;
    if (msg.length > cols) {
        let split = msg.lastIndexOf(' ', cols);
        if (split <= 0) split = cols;
        await pline(msg.slice(0, split));
        game._message_continuation_row = msg.slice(split).trimStart();
        game._more_next_message_row = true;
    } else {
        await pline(msg);
        if (msg.length + LEVELCHANGE_MORE_LEN > cols) {
            game._message_continuation_row = '';
            game._more_next_message_row = true;
        }
    }
    queue_more_prompt();
}

function shouldShowBuc(obj) {
    if (!obj) return false;
    if (unknownAppearanceName(obj)) return false;
    if (!obj.bknown) return false;
    if (obj.blessed || obj.cursed) return true;
    const implicitUncursed = game.flags?.implicit_uncursed !== false;
    // C ref: src/objnam.c:doname_base().  Cleric/Priest heroes know BUC,
    // but implicit_uncursed still suppresses the "uncursed" prefix.
    if (implicitUncursed && game.urole?.name?.m === 'Priest') return false;
    if (implicitUncursed
        && obj.known
        && OBJECT_CHARGED[obj.otyp]
        && obj.oclass !== ARMOR_CLASS
        && obj.oclass !== RING_CLASS) {
        return false;
    }
    return obj.oclass === WEAPON_CLASS
        || obj.oclass === ARMOR_CLASS
        || obj.oclass === RING_CLASS
        || obj.oclass === POTION_CLASS
        || obj.oclass === SCROLL_CLASS
        || obj.oclass === SPBOOK_CLASS
        || obj.oclass === FOOD_CLASS
        || obj.oclass === TOOL_CLASS;
}

function bucPrefix(obj) {
    if (!shouldShowBuc(obj)) return '';
    if (obj?.otyp === POT_WATER && (obj.blessed || obj.cursed)) return '';
    if (obj.blessed) return 'blessed';
    if (obj.cursed) return 'cursed';
    return 'uncursed';
}

function enchantmentPrefix(obj) {
    if (typeof obj?.spe !== 'number') return '';
    if (!obj.known && !obj.knownName) return '';
    if (obj.oclass === ARMOR_CLASS
        || obj.oclass === WEAPON_CLASS
        || (obj.oclass === RING_CLASS && OBJECT_CHARGED[obj.otyp])) {
        return `${obj.spe >= 0 ? '+' : ''}${obj.spe}`;
    }
    return '';
}

function erosionProofPrefix(obj) {
    if (!obj?.oerodeproof || !obj?.rknown) return '';
    // C ref: src/objnam.c:doname_base(); Samurai lacquered splint mail is
    // reported with the same erosion-proof prefix as rustproof metal armor.
    return 'rustproof';
}

function chargeSuffix(obj, opts = {}) {
    if (opts.includeCharges === false) return '';
    if (typeof obj?.spe !== 'number') return '';
    if (obj.oclass === TOOL_CLASS && OBJECT_CHARGED[obj.otyp]) {
        return obj.known || obj.knownName || obj.chargesKnown ? ` (0:${obj.spe})` : '';
    }
    if (obj.oclass !== WAND_CLASS) return '';
    if (!obj.known && !obj.chargesKnown) return '';
    if (unknownAppearanceName(obj)) return '';
    return ` (0:${obj.spe})`;
}

function floorObjectBaseCost(obj) {
    if (obj?.oclass === ARMOR_CLASS) return ARMOR_XNAMES.get(obj.otyp)?.cost ?? null;
    return null;
}

function shopPriceCurrency(price) {
    return `zorkmid${price === 1 ? '' : 's'}`;
}

function shopUnitCost(obj, shkp) {
    let tmp = floorObjectBaseCost(obj);
    if (tmp == null) return null;
    if (!tmp) tmp = 5;
    let multiplier = 1;
    let divisor = 1;

    // C ref: shk.c:get_cost()/oid_price_adjustment().
    if ((!obj.dknown || !objectTypeNameKnown(obj))
        && (obj?.o_id ?? 0) % 4 === 0) {
        multiplier *= 4;
        divisor *= 3;
    }

    const cha = game.u?.acurr?.a?.[C.A_CHA] ?? 10;
    if (cha > 18) {
        divisor *= 2;
    } else if (cha === 18) {
        multiplier *= 2;
        divisor *= 3;
    } else if (cha >= 16) {
        multiplier *= 3;
        divisor *= 4;
    } else if (cha <= 5) {
        multiplier *= 2;
    } else if (cha <= 7) {
        multiplier *= 3;
        divisor *= 2;
    } else if (cha <= 10) {
        multiplier *= 4;
        divisor *= 3;
    }

    tmp *= multiplier;
    if (divisor > 1) {
        tmp = Math.trunc(tmp * 10 / divisor);
        tmp = Math.trunc((tmp + 5) / 10);
    }
    if (tmp <= 0) tmp = 1;
    if (shkp?.mextra?.eshk?.surcharge) tmp += Math.trunc((tmp + 2) / 3);
    return tmp;
}

function recordDiscoveryPriceQuote(otyp, price, buyprice = true) {
    if (!Number.isInteger(otyp) || !Number.isInteger(price) || price <= 0) return;
    const quotes = game.discoveryPriceQuotes instanceof Map
        ? game.discoveryPriceQuotes
        : (game.discoveryPriceQuotes = new Map());
    const rec = quotes.get(otyp) || {
        buyMin: Infinity,
        buyMax: -Infinity,
        sellMin: Infinity,
        sellMax: -Infinity,
    };
    if (buyprice) {
        rec.buyMin = Math.min(rec.buyMin, price);
        rec.buyMax = Math.max(rec.buyMax, price);
    } else {
        rec.sellMin = Math.min(rec.sellMin, price);
        rec.sellMax = Math.max(rec.sellMax, price);
    }
    quotes.set(otyp, rec);
}

function discoveryPriceQuoteSuffix(otyp) {
    const rec = game.discoveryPriceQuotes instanceof Map ? game.discoveryPriceQuotes.get(otyp) : null;
    if (!rec) return '';
    const parts = [];
    if (Number.isFinite(rec.buyMin) && Number.isFinite(rec.buyMax)) {
        parts.push(rec.buyMin === rec.buyMax ? `buy ${rec.buyMin}` : `buy ${rec.buyMin}-${rec.buyMax}`);
    }
    if (Number.isFinite(rec.sellMin) && Number.isFinite(rec.sellMax)) {
        parts.push(rec.sellMin === rec.sellMax ? `sell ${rec.sellMin}` : `sell ${rec.sellMin}-${rec.sellMax}`);
    }
    return parts.length ? ` {${parts.join(' ')}}` : '';
}

function floorShopPriceQuote(obj) {
    if (!obj || obj.oclass === COIN_CLASS || obj.oclass === BALL_CLASS || obj.oclass === CHAIN_CLASS) return null;
    const shops = Array.isArray(game.u?.ushops) ? game.u.ushops : [];
    if (!shops.length) return null;
    const objRooms = inRoomsAt(obj.ox, obj.oy).filter(isShopRoomNo);
    const roomno = objRooms.find((shopRoom) => shops.includes(shopRoom));
    if (!roomno) return null;
    const shkp = shopKeeperForRoom(roomno);
    const eshk = shkp?.mextra?.eshk;
    if (!shkp || !eshk) return null;
    const freeSpot = obj.ox === eshk.shk?.x && obj.oy === eshk.shk?.y;
    if (obj.no_charge || freeSpot) return { noCharge: true };
    const unitCost = shopUnitCost(obj, shkp);
    if (unitCost == null) return null;
    const price = (obj.quan || 1) * unitCost;
    return price > 0 ? { price, roomno, shkp } : null;
}

function shopPriceSuffix(obj, opts = {}) {
    if (!opts.includePrice) return '';
    const quote = floorShopPriceQuote(obj);
    if (!quote) return '';
    if (quote.noCharge) return ' (no charge)';
    recordDiscoveryPriceQuote(obj.otyp, quote.price, true);
    return ` (for sale, ${quote.price} ${shopPriceCurrency(quote.price)})`;
}

function unpaidSuffix(obj) {
    if (!obj?.unpaid) return '';
    const price = obj.unpaidPrice || obj.shopPrice || 0;
    if (!price) return ' (unpaid)';
    return ` (unpaid, ${price} ${shopPriceCurrency(price)})`;
}

function isWeaponTool(obj) {
    return obj?.oclass === TOOL_CLASS && WEPTOOL_TYPES.has(obj.otyp);
}

function usesPlainWieldedSuffix(obj) {
    // C refs: src/objnam.c:doname_base(), include/obj.h:is_weptool().
    // Stacks, wielded ammo/missiles, and non-weapon non-weptools are
    // downplayed to "(wielded)" unless two-weapon mode needs hand labels.
    if ((obj?.quan || 1) !== 1) return true;
    if (obj?.oclass === WEAPON_CLASS) return BOW_AMMO.has(obj.otyp) || WIELDED_MISSILES.has(obj.otyp);
    return !isWeaponTool(obj);
}

function wornSuffix(obj) {
    if (obj?.wornSide) return ` (on ${obj.wornSide} hand)`;
    if (obj?.quivered) return BOW_AMMO.has(obj.otyp) ? ' (in quiver)' : ' (at the ready)';
    if (obj?.wielded || ((obj?.owornmask || 0) & C.W_WEP)) {
        if (game.u?.twoweap) return ` (wielded in ${game.u?.uhandedness || 'right'} hand)`;
        if (usesPlainWieldedSuffix(obj)) return ' (wielded)';
        if (obj?.otyp === QUARTERSTAFF) return ' (weapon in hands)';
        return ` (weapon in ${game.u?.uhandedness || 'right'} hand)`;
    }
    if (obj?.alternate) {
        if (game.u?.twoweap) {
            const primaryHand = game.u?.uhandedness || 'right';
            const secondaryHand = primaryHand === 'left' ? 'right' : 'left';
            return ` (wielded in ${secondaryHand} hand)`;
        }
        const noun = (obj?.quan || 1) > 1 ? 'weapons' : 'weapon';
        return ` (alternate ${noun}; not wielded)`;
    }
    if (obj?.worn || obj?.owornmask) return ' (being worn)';
    return '';
}

function isContainerType(otyp) {
    return otyp >= LARGE_BOX && otyp <= BAG_OF_TRICKS;
}

function objectContentsStackCount(obj) {
    return (obj?.cobj || obj?.contents || []).filter(Boolean).length;
}

function emptyContentsPrefix(obj) {
    if (!obj?.cknown) return '';
    // C ref: objnam.c:doname_base(); known empty containers get an
    // "empty" prefix before beatitude.
    if (obj.otyp === BAG_OF_TRICKS) return obj.spe === 0 && !obj.known ? 'empty' : '';
    if ((isContainerType(obj.otyp) || obj.otyp === STATUE) && objectContentsStackCount(obj) === 0) return 'empty';
    return '';
}

function knownContentsSuffix(obj) {
    if (!obj?.cknown) return '';
    if (!isContainerType(obj.otyp) && obj.otyp !== STATUE) return '';
    const count = objectContentsStackCount(obj);
    if (count <= 0) return '';
    return ` containing ${count} item${count === 1 ? '' : 's'}`;
}

function boxStatePrefix(obj) {
    if (obj?.otyp !== LARGE_BOX && obj?.otyp !== CHEST) return '';
    const parts = [];
    // C ref: objnam.c:doname_base(); Is_box() lock/trap state is reported
    // when the corresponding knowledge flags are set.
    if (obj.otrapped && obj.tknown && obj.dknown) parts.push('trapped');
    if (obj.lknown) {
        if (obj.obroken) parts.push('broken');
        else if (obj.olocked) parts.push('locked');
        else parts.push('unlocked');
    }
    return parts.join(' ');
}

function observeObjectForNaming(obj, opts = {}) {
    if (opts.observe === false || !obj) return;
    if (game.u?.ublind || game.u?.blind || game.u?.uprops?.blinded) return;
    obj.dknown = true;
    markObjectEncountered(obj.otyp);
}

function applyRoleObjectNamingKnowledge(obj) {
    if (!obj || obj.oclass === COIN_CLASS) return;
    // C ref: objnam.c:xname_flags().  Cleric/Priest heroes know BUC for
    // objects formatted through xname()/doname(), including floor lists.
    if (game.urole?.name?.m === 'Priest') obj.bknown = true;
}

function inventoryObjectName(obj, opts = {}) {
    if (obj?.menuName) return obj.menuName;
    observeObjectForNaming(obj, opts);
    applyRoleObjectNamingKnowledge(obj);
    const quan = obj?.quan || 1;
    if (obj?.otyp === GOLD_PIECE) return `${quan} gold ${quan === 1 ? 'piece' : 'pieces'}`;
    const rawBase = baseObjectName(obj);
    const pairObject = /\b(?:boots|gloves)$/.test(rawBase) || rawBase.startsWith('gauntlets of ');
    const base = quan > 1
        ? (pairObject ? `pairs of ${rawBase}` : pluralizeObjectName(rawBase))
        : (pairObject ? `pair of ${rawBase}` : rawBase);
    const oname = C.ONAME(obj);
    const namedBase = oname ? `${base} named ${oname}` : base;
    const parts = [
        emptyContentsPrefix(obj),
        bucPrefix(obj),
        erosionProofPrefix(obj),
        enchantmentPrefix(obj),
        boxStatePrefix(obj),
        obj?.oclass === FOOD_CLASS && obj.partlyEaten ? 'partly eaten' : '',
        namedBase,
    ].filter(Boolean);
    const body = parts.join(' ') + knownContentsSuffix(obj)
        + chargeSuffix(obj, opts) + unpaidSuffix(obj) + shopPriceSuffix(obj, opts);
    const worn = opts.includeWorn ? wornSuffix(obj) : '';
    if (quan > 1) return `${quan} ${body}${worn}`;
    return `${indefiniteArticle(body)} ${body}${worn}`;
}

function inventoryListing(obj, opts = {}) {
    ensureInventoryLetters();
    return `${obj.invlet} - ${inventoryObjectName(obj, opts)}`;
}

function menuInventoryEntries() {
    ensureInventoryLetters();
    if ((game.inventory || []).length) {
        return (game.inventory || [])
            .filter((obj) => obj && validInvlet(obj.invlet))
            .sort((a, b) => String(a.invlet || '').localeCompare(String(b.invlet || '')))
            .map((obj) => ({ cls: obj.oclass, obj, line: inventoryListing(obj, { includeWorn: true }) }));
    }
    const role = game.urole?.name?.m;
    if (role === 'Tourist') return TOURIST_STARTER_MENU.slice();
    return [];
}

function buildInventoryMenuLines() {
    const lines = [];
    const gold = game._goldCount || 0;
    if (gold > 0) {
        lines.push({ text: 'Coins', heading: true });
        lines.push({ text: `$ - ${gold} gold pieces`, heading: false });
    }

    const entries = menuInventoryEntries();
    for (const group of INVENTORY_GROUPS) {
        const groupEntries = entries.filter((entry) => entry.cls === group.cls);
        if (!groupEntries.length) continue;
        lines.push({ text: group.title, heading: true });
        for (const entry of groupEntries) {
            if (entry.obj) object_glyph_for_menu(entry.obj);
            lines.push({ text: entry.line, heading: false });
        }
    }
    lines.push({ text: '(end)', heading: false });
    return lines;
}

function wizIdentifyInventoryEntries() {
    return menuInventoryEntries()
        .filter((entry) => entry.obj && notFullyIdentified(entry.obj));
}

function buildWizIdentifyMenuLines() {
    const unidentified = wizIdentifyInventoryEntries();
    const count = unidentified.length;
    const title = count
        ? `Debug Identify -- unidentified or partially identified item${count === 1 ? '' : 's'}`
        : 'Debug Identify';
    const lines = [{ text: title, heading: false }];
    if (!count) {
        lines.push({ text: '(all items are permanently identified already)', heading: false });
    } else {
        const target = count === 1 ? 'it' : 'any or all of them';
        const suffix = count > 1 ? ' (^I for all)' : '';
        lines.push({ text: `_ - select ${target} to permanently identify${suffix}`, heading: false });
        for (const entry of unidentified) {
            object_glyph_for_menu(entry.obj);
            lines.push({ text: entry.line, heading: false, obj: entry.obj });
        }
    }
    lines.push({ text: '(end)', heading: false });
    return lines;
}

async function showWizIdentifyMenu() {
    // C refs: wizcmds.c:wiz_identify(), invent.c:display_inventory().
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    const lines = buildWizIdentifyMenuLines();
    const maxLen = Math.max(0, ...lines.map((line) => line.text.length));
    const menuCol = Math.max(1, Math.min(COLNO - 1, COLNO - maxLen - 2));
    for (let row = 0; row < lines.length; row++) {
        display.putstr(0, row, ' '.repeat(COLNO), NO_COLOR, 0);
    }
    for (let row = 0; row < lines.length; row++) {
        const line = lines[row];
        display.putstr(menuCol, row, line.text, NO_COLOR, line.heading ? ATR_INVERSE : 0);
    }
    const lastRow = lines.length - 1;
    const cursorCol = menuCol + (lines[lastRow]?.text || '').length + 1;
    const screen = serialize_terminal_grid(display);
    game._wizidentify_menu_screen = screen;
    showOverride(screen, [Math.min(cursorCol, COLNO - 1), lastRow]);
    game.context.move = 0;
}

async function dismissWizIdentifyMenu() {
    game._wizidentify_menu_screen = null;
    clearOverrideScreen();
    await redrawAfterFullScreenMenuDismiss();
    game.context.move = 0;
}

async function handleWizIdentifyMenuInput(ch) {
    const entries = wizIdentifyInventoryEntries();
    if (ch === '_' || ch.charCodeAt(0) === 9) {
        for (const entry of entries) fullyIdentifyObject(entry.obj);
        await dismissWizIdentifyMenu();
        return;
    }
    const entry = entries.find((item) => item.obj?.invlet === ch);
    if (entry) {
        fullyIdentifyObject(entry.obj);
        await dismissWizIdentifyMenu();
        return;
    }
    await dismissWizIdentifyMenu();
}

async function showInventoryClassMenu(oclass) {
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.terminal?.serialize && !display?.serialize) return;

    const group = INVENTORY_GROUPS.find((entry) => entry.cls === oclass);
    const entries = menuInventoryEntries().filter((entry) => entry.cls === oclass);
    const lines = [
        { text: group?.title || 'Inventory', heading: true },
        ...entries.map((entry) => {
            if (entry.obj) object_glyph_for_menu(entry.obj);
            return { text: entry.line, heading: false };
        }),
        { text: '(end)', heading: false },
    ];
    const menuCol = 41;
    const clearCol = Math.max(0, menuCol - 1);
    for (let row = 0; row < lines.length; row++) {
        display.putstr(clearCol, row, ' '.repeat(COLNO - clearCol), NO_COLOR, 0);
    }
    for (let row = 0; row < lines.length; row++) {
        const line = lines[row];
        display.putstr(menuCol, row, line.text, NO_COLOR, line.heading ? ATR_INVERSE : 0);
    }
    const lastRow = lines.length - 1;
    const cursorCol = menuCol + (lines[lastRow]?.text || '').length + 1;
    const screen = serialize_terminal_grid(display);
    showOverride(screen, [Math.min(cursorCol, COLNO - 1), lastRow]);
}

function buildApplyInventoryHelpLines(showAll = false) {
    const entries = menuInventoryEntries()
        .filter((entry) => entry.obj
            && (showAll || applyObjectSuitability(entry.obj) === 'suggest'));
    const lines = [];
    for (const group of INVENTORY_GROUPS) {
        const groupEntries = entries.filter((entry) => entry.cls === group.cls);
        if (!groupEntries.length) continue;
        lines.push({ text: group.title, heading: true });
        for (const entry of groupEntries) {
            object_glyph_for_menu(entry.obj);
            lines.push({ text: entry.line, heading: false });
        }
    }
    lines.push({ text: '(end)', heading: false });
    return lines;
}

async function showApplyInventoryHelpMenu(showAll = false) {
    // C refs: src/invent.c:getobj(), src/apply.c:apply_ok().  '?' shows the
    // suggested apply subset; '*' opens the full inventory picker.
    clearOverrideScreen();
    clear_pending_message();
    await redrawAfterFullScreenMenuDismiss();
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    const lines = buildApplyInventoryHelpLines(showAll);
    const menuCol = 41;
    const lastRow = Math.min(lines.length - 1, ROWNO - 1);
    clearLootMenuArea(menuCol, lastRow);
    display.putstr(0, 0, ' '.repeat(menuCol), NO_COLOR, 0);
    for (let row = 0; row <= lastRow; row++) {
        const line = lines[row];
        display.putstr(menuCol, row, line.text, NO_COLOR, line.heading ? ATR_INVERSE : 0);
    }
    const cursorCol = menuCol + (lines[lastRow]?.text || '').length + 1;
    game._apply_inventory_help_menu = { showAll };
    game._awaiting_apply_item = true;
    game.context.move = 0;
    showOverride(serialize_terminal_grid(display), [Math.min(cursorCol, COLNO - 1), lastRow]);
}

async function showTerrainMenu() {
    // C ref: cmd.c:doterrain().  The Delete binding opens the terrain-view
    // selector menu; current evidence uses the first, preselected entry.
    await flush_screen(1);
    clear_pending_message();
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    const menuCol = 28;
    const lines = [
        { row: 0, text: 'View which?', attr: ATR_INVERSE },
        { row: 2, text: 'a * known map without monsters, objects, and traps' },
        { row: 3, text: 'b - known map without monsters and objects' },
        { row: 4, text: 'c - known map without monsters' },
        { row: 5, text: '(end)' },
    ];
    for (let row = 0; row <= 4; row++) display.putstr(0, row, ' '.repeat(COLNO), NO_COLOR, 0);
    display.putstr(menuCol - 1, 5, ' '.repeat(COLNO - (menuCol - 1)), NO_COLOR, 0);
    for (const line of lines) display.putstr(menuCol, line.row, line.text, NO_COLOR, line.attr || 0);
    showOverride(serialize_terminal_grid(display), [menuCol + '(end)'.length + 1, 5]);
    game._awaiting_terrain_menu = true;
    game.context.move = 0;
}

function terrainViewCursor() {
    return [Math.max(0, (game.u?.ux ?? 1) - 1), Math.max(0, (game.u?.uy ?? 0) + 1)];
}

function showTerrainView(message, cursor = terrainViewCursor()) {
    const screen = serialize_known_terrain_view_screen(message);
    showSerializedOverride(screen, cursor);
    game._override_serialized_persistent = true;
}

function showTerrainBrowsePrompt() {
    // C refs: detect.c:reveal_terrain(), detect.c:browse_map(),
    // getpos.c:getpos().  Terrain reveal enters getpos over the temporary
    // terrain-only map after the introductory pager is dismissed.
    showTerrainView("(For instructions type a '?')  Move cursor to anything of interest:");
    game._terrain_view_active = true;
}

function knownSpellEntries() {
    const entries = [];
    const known = Array.isArray(game.knownSpells) && game.knownSpells.length
        ? game.knownSpells
        : (game.inventory || [])
            .filter((obj) => obj?.oclass === SPBOOK_CLASS)
            .map((obj) => ({ otyp: obj.otyp, spellInfoOverride: obj.spellInfoOverride }));
    for (const spell of known) {
        const info = spellbookSpellInfo(spell);
        if (!info) continue;
        if (entries.some((entry) => entry.name === info.name)) continue;
        const spellKey = spellKeyFromRecord(spell, info);
        entries.push({
            letter: String.fromCharCode(97 + entries.length),
            otyp: spell?.otyp,
            spellKey,
            turnsLeft: spell?.turnsLeft ?? spell?.sp_know,
            skillType: SPELL_CATEGORY_SKILL_TYPES.get(info.category),
            ...info,
        });
    }
    return entries;
}

function spellbookSpellInfo(record) {
    if (record?.spellInfoOverride) return record.spellInfoOverride;
    if (record?.name && record?.category) return record;
    return SPELLBOOK_SPELL_INFO.get(record?.otyp);
}

function spellKeyFromRecord(record, info = spellbookSpellInfo(record)) {
    return record?.spellKey ?? info?.spellKey ?? record?.otyp;
}

function spellIsActuallyKnown(obj, info = spellbookSpellInfo(obj)) {
    const spellKey = spellKeyFromRecord(obj, info);
    return Array.isArray(game.knownSpells)
        && game.knownSpells.some((spell) => spellKeyFromRecord(spell) === spellKey);
}

function spellbookStudyDelay(info) {
    const level = info?.level || 1;
    const delay = info?.delay || 1;
    if (level <= 2) return delay;
    if (level <= 4) return (level - 1) * delay;
    if (level <= 6) return level * delay;
    return 8 * delay;
}

async function beginStudySpellbook(obj, info) {
    // C ref: spell.c:study_book().  Unknown uncursed books always make the
    // read-ability roll before starting the delayed learn occupation.
    if (!obj.blessed && !obj.cursed) {
        const readAbility = heroAttr(C.A_INT) + 4 + Math.trunc((game.u?.ulevel || 1) / 2)
            - (2 * (info.level || 1));
        if (rnd(20) > readAbility) {
            await pline('These runes were just too much to comprehend.');
            game.context.move = 1;
            return;
        }
    }
    await pline('You begin to memorize the runes.');
    const spellKey = spellKeyFromRecord(obj, info);
    const delay = spellbookStudyDelay(info);
    const knownCount = Array.isArray(game.knownSpells) ? game.knownSpells.length : 0;
    game._occupation_turns_remaining = Math.max(0, delay - 1);
    game._occupation_finish_message = knownCount === 0
        ? `You learn the "${info.name}" spell.`
        : `You add the "${info.name}" spell to your repertoire, as '${String.fromCharCode(97 + knownCount)}'.`;
    game._occupation_pack_finish_message = true;
    // C refs: src/spell.c:study_book()/learn(), src/allmain.c:moveloop_core().
    // learn() returns "still busy" when its delay counter reaches zero; the
    // final learning side effects happen after the following full turn tail.
    game._occupation_pre_finish_extra_turn = true;
    game._occupation_finish_learn_spell = {
        obj,
        spell: {
            otyp: obj.otyp,
            spellKey,
            name: info.name,
            level: info.level,
            category: info.category,
        },
    };
    game.context.move = 1;
}

function explicitSpellSkillLevel(skillType) {
    if (!Number.isInteger(skillType)) return null;
    const sources = [
        game.weaponSkills,
        game.weapon_skills,
        game.skills,
        game.u?.weaponSkills,
        game.u?.weapon_skills,
        game.u?.skills,
    ];
    for (const source of sources) {
        if (!source) continue;
        const record = source[skillType] ?? source[String(skillType)];
        const value = Number.isInteger(record) ? record : record?.skill;
        if (Number.isInteger(value)) return Math.max(value, C.P_UNSKILLED);
    }
    return null;
}

function currentSpellSkillLevel(entry) {
    const skillType = entry?.skillType ?? SPELL_CATEGORY_SKILL_TYPES.get(entry?.category);
    const explicit = explicitSpellSkillLevel(skillType);
    if (explicit !== null) return explicit;
    const roleSkills = ROLE_INITIAL_SPELL_SKILLS.get(game.urole?.name?.m);
    return roleSkills?.get(skillType) ?? C.P_UNSKILLED;
}

const MAT_IRON = 11;
const MAT_MITHRIL = 17;

function isMetallicObject(obj) {
    const mat = OBJECT_MATERIAL[obj?.otyp] ?? 0;
    return mat >= MAT_IRON && mat <= MAT_MITHRIL;
}

function wornArmorObject(otyp) {
    return (game.inventory || []).find((obj) =>
        obj?.oclass === ARMOR_CLASS && obj.otyp === otyp && (obj.worn || obj.owornmask));
}

function wornArmorInRange(first, last) {
    return (game.inventory || []).find((obj) =>
        obj?.oclass === ARMOR_CLASS
        && obj.otyp >= first && obj.otyp <= last
        && (obj.worn || obj.owornmask));
}

function wornShieldObject() {
    return (game.inventory || []).find((obj) =>
        obj?.oclass === ARMOR_CLASS
        && obj.otyp >= SMALL_SHIELD
        && obj.otyp <= SHIELD_OF_REFLECTION
        && (obj.worn || obj.owornmask));
}

function objectWeightForSpellPenalty(obj) {
    if (!obj) return 0;
    if (obj.otyp === SMALL_SHIELD
        || obj.otyp === SHIELD_OF_DRAIN_RESISTANCE
        || obj.otyp === SHIELD_OF_SHOCK_RESISTANCE) return 30;
    if (obj.otyp === ELVEN_SHIELD) return 40;
    if (obj.otyp === URUK_HAI_SHIELD
        || obj.otyp === ORCISH_SHIELD
        || obj.otyp === SHIELD_OF_REFLECTION) return 50;
    if (obj.otyp === LARGE_SHIELD || obj.otyp === DWARVISH_ROUNDSHIELD) return 100;
    return obj.owt || 1;
}

const HEALING_SPELL_IDS = new Set([
    SPE_HEALING,
    SPE_CURE_BLINDNESS,
    SPE_CURE_SICKNESS,
    SPE_EXTRA_HEALING,
    SPE_RESTORE_ABILITY,
    SPE_REMOVE_CURSE,
]);

function percentSpellSuccessBasic(entry) {
    // C ref: src/spell.c:percent_success().
    if (!entry) return 100;
    const stats = ROLE_SPELL_STATS.get(game.urole?.name?.m);
    if (stats) return rolePercentSpellSuccessBasic(entry, stats);
    return 100;
}

function rolePercentSpellSuccessBasic(entry, stats) {
    let splcaster = stats.spelbase;
    const bodyArmor = wornArmorInRange(GRAY_DRAGON_SCALE_MAIL, ROBE - 1);
    const cloak = wornArmorInRange(ROBE, SMALL_SHIELD - 1);
    const shield = wornShieldObject();
    const paladinBonus = game.urole?.name?.m === 'Knight'
        && (entry?.skillType ?? SPELL_CATEGORY_SKILL_TYPES.get(entry?.category)) === C.P_CLERIC_SPELL;
    if (bodyArmor && isMetallicObject(bodyArmor) && !paladinBonus) {
        splcaster += cloak?.otyp === ROBE ? Math.trunc(stats.spelarmr / 2) : stats.spelarmr;
    } else if (cloak?.otyp === ROBE) {
        splcaster -= stats.spelarmr;
    }
    if (shield) splcaster += stats.spelshld;
    const weapon = (game.inventory || []).find((obj) => obj?.wielded || ((obj?.owornmask || 0) & C.W_WEP));
    if (weapon?.otyp === QUARTERSTAFF) splcaster -= 3;

    if (!paladinBonus) {
        const helmet = wornArmorInRange(89, 100);
        const gloves = wornArmorInRange(LEATHER_GLOVES, SPEED_BOOTS - 1);
        const boots = wornArmorInRange(SPEED_BOOTS, LEVITATION_BOOTS);
        if (helmet && isMetallicObject(helmet)) splcaster += 4;
        if (gloves && isMetallicObject(gloves)) splcaster += 6;
        if (boots && isMetallicObject(boots)) splcaster += 2;
    }
    if (entry?.otyp === stats.spelspec) splcaster += stats.spelsbon;
    if (HEALING_SPELL_IDS.has(entry?.otyp)) splcaster += stats.spelheal;
    if (splcaster > 20) splcaster = 20;

    const ulevel = game.u?.ulevel ?? 1;
    const statused = game.u?.acurr?.a?.[stats.spelstat] ?? 10;
    let chance = Math.trunc(11 * statused / 2);
    const skill = currentSpellSkillLevel(entry) - 1;
    const difficulty = (entry.level - 1) * 4 - ((skill * 6) + Math.trunc(ulevel / 3) + 1);
    if (difficulty > 0) {
        chance -= Math.trunc(Math.sqrt(900 * difficulty + 2000));
    } else {
        const learning = Math.trunc(15 * -difficulty / entry.level);
        chance += learning > 20 ? 20 : learning;
    }
    if (chance < 0) chance = 0;
    if (chance > 120) chance = 120;

    if (shield && objectWeightForSpellPenalty(shield) > 30) {
        chance = Math.trunc(chance / (entry?.otyp === stats.spelspec ? 2 : 4));
    }

    chance = Math.trunc(chance * (20 - splcaster) / 15) - splcaster;
    if (chance > 100) return 100;
    if (chance < 0) return 0;
    return chance;
}

function spellRetentionTextBasic(entry, turnsLeft) {
    // C ref: spell.c:spellretention().
    const keen = 20000;
    if (turnsLeft < 1) return '(gone)';
    if (turnsLeft >= keen) return '100%';
    let percent = Math.trunc((turnsLeft - 1) / Math.trunc(keen / 100)) + 1;
    const skill = currentSpellSkillLevel(entry);
    const accuracy = skill === C.P_EXPERT ? 2
        : skill === C.P_SKILLED ? 5
        : skill === C.P_BASIC ? 10
        : 25;
    percent = accuracy * (Math.trunc((percent - 1) / accuracy) + 1);
    return `${percent - accuracy + 1}%-${percent}%`;
}

function putonLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => (obj?.oclass === RING_CLASS && !obj.wornSide)
            || (obj?.oclass === AMULET_CLASS && !obj.worn)
            || (obj?.otyp === BLINDFOLD && !obj.worn))
        .map((obj) => obj.invlet)
        .join('');
}

function wearLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => obj?.oclass === ARMOR_CLASS && !obj.worn && !obj.owornmask)
        .map((obj) => obj.invlet)
        .join('');
}

function takeoffLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => obj?.oclass === ARMOR_CLASS && (obj.worn || obj.owornmask))
        .map((obj) => obj.invlet)
        .join('');
}

function is_puton_candidate(obj) {
    if (!obj) return false;
    if (obj.otyp === BLINDFOLD) return !obj.worn;
    if (obj.oclass === RING_CLASS) return !obj.wornSide;
    return obj.oclass === ARMOR_CLASS || obj.oclass === AMULET_CLASS;
}

function is_worn_takeoff_candidate(obj) {
    if (!obj) return false;
    if (obj.oclass === ARMOR_CLASS) return !!(obj.worn || obj.owornmask);
    if (obj.oclass === RING_CLASS) return !!obj.wornSide || !!((obj.owornmask || 0) & C.W_RING);
    if (obj.oclass === AMULET_CLASS) return !!(obj.worn || obj.owornmask);
    if (obj.otyp === BLINDFOLD) return !!(obj.worn || ((obj.owornmask || 0) & C.W_TOOL));
    return false;
}

function refreshRingRegenerationExtrinsic() {
    if (!game.u) return;
    game.u.uprops = game.u.uprops || {};
    game.u.uprops.hp_regeneration = (game.inventory || []).some((item) =>
        item?.otyp === RIN_REGENERATION
        && (item.wornSide || ((item.owornmask || 0) & C.W_RING))) ? 1 : 0;
}

function apply_deferred_startup_wear() {
    const cloak = (game.inventory || []).find((obj) => obj?.otyp === CLOAK_OF_MAGIC_RESISTANCE);
    if (cloak) cloak.worn = true;
}

function armor_finish_message(obj) {
    if (obj?.otyp !== SPEED_BOOTS) return 'You finish your dressing maneuver.';
    const alreadyFast = !!game.u?.uprops?.fast;
    game.u.uprops = game.u.uprops || {};
    game.u.uprops.fast = true;
    return `You finish your dressing maneuver.  You feel yourself speed up${alreadyFast ? ' a bit more' : ''}.`;
}

function wornArmorMessageName(name) {
    if (/\b(?:boots|gloves)$/.test(name) || name.startsWith('gauntlets of ')) {
        return `a pair of ${name}`;
    }
    return `${indefiniteArticle(name)} ${name}`;
}

function bodyArmorForTakeoff() {
    return (game.inventory || []).find((obj) =>
        obj?.oclass === ARMOR_CLASS && obj.worn && obj.otyp >= GRAY_DRAGON_SCALE_MAIL && obj.otyp <= ORCISH_RING_MAIL);
}

function wornArmorForTakeoff() {
    return bodyArmorForTakeoff()
        || (game.inventory || []).find((obj) => obj?.oclass === ARMOR_CLASS && obj.worn);
}

function armorClassAfterTakingOff(obj) {
    const worn = obj?.worn;
    const wornmask = obj?.owornmask;
    if (obj) {
        obj.worn = false;
        obj.owornmask = 0;
    }
    const ac = calculated_armor_class();
    if (obj) {
        obj.worn = worn;
        obj.owornmask = wornmask;
    }
    return ac;
}

function takeoffSuitSimpleName(obj) {
    const name = ARMOR_XNAMES.get(obj?.otyp)?.name || baseObjectName(obj);
    if (obj?.otyp >= GRAY_DRAGON_SCALE_MAIL && obj.otyp <= 110) return 'dragon mail';
    if (obj?.otyp >= 111 && obj.otyp <= 120) return 'dragon scales';
    if (name.endsWith(' mail')) return 'mail';
    if (name.endsWith(' jacket')) return 'jacket';
    return 'suit';
}

function takeoffArmorSimpleName(obj) {
    if (bodyArmorForTakeoff() === obj) {
        return takeoffSuitSimpleName(obj);
    }
    if (obj?.otyp >= 159 && obj.otyp <= 162) return baseObjectName(obj).includes('gauntlets') ? 'gauntlets' : 'gloves';
    if (obj?.otyp >= 163 && obj.otyp <= 172) return baseObjectName(obj).includes('shoes') ? 'shoes' : 'boots';
    if (obj?.otyp >= 150 && obj.otyp <= 158) return 'shield';
    if (obj?.otyp >= 89 && obj.otyp <= 100) return 'helm';
    if (obj?.otyp === HAWAIIAN_SHIRT || obj?.otyp === 137) return 'shirt';
    return baseObjectName(obj);
}

async function start_takeoff_armor(obj) {
    if (obj?.cursed) {
        // C ref: do_wear.c:cursed().  A stuck cursed item reports the curse
        // and does not spend a turn.
        const plural = (obj.otyp >= LEATHER_GLOVES && obj.otyp <= LEVITATION_BOOTS)
            || (obj.quan || 1) > 1;
        obj.bknown = true;
        game.context.move = 0;
        await pline(`You can't.  ${plural ? 'They are' : 'It is'} cursed.`);
        setTravelMapCursor();
        return;
    }
    const finishAc = armorClassAfterTakingOff(obj);
    const delay = OBJECT_DELAY[obj?.otyp] || 0;
    if (delay <= 0) {
        obj.worn = false;
        obj.owornmask = 0;
        obj.known = true;
        game.u.uac = finishAc;
        game.context.move = 1;
        game._fast_extra_action_pending = false;
        setTravelMapCursor();
        if (game.flags?.verbose !== false)
            await pline(`You were wearing ${inventoryObjectName(obj)}.`);
        return;
    }
    game._occupation_takeoff_object = obj;
    // C ref: src/do_wear.c:armoroff().  nomul(-oc_delay) spends the command's
    // first turn immediately; the remaining delay is carried by the occupation.
    game._occupation_turns_remaining = Math.max(0, delay - 1);
    game._occupation_finish_uac = finishAc;
    game._occupation_finish_message = `You finish taking off your ${takeoffArmorSimpleName(obj)}.`;
    game._occupation_pack_finish_message = true;
}

async function start_takeoff_blindfold(obj) {
    if (obj?.cursed) {
        obj.bknown = true;
        game.context.move = 0;
        await pline("You can't.  It is cursed.");
        return;
    }
    obj.worn = false;
    obj.owornmask = 0;
    game.u.uprops = game.u.uprops || {};
    game.u.ublind = false;
    game.u.uprops.blind = 0;
    game.u.uprops.blinded = 0;
    await pline(`You were wearing ${inventoryObjectName(obj)}.`);
    await append_pline('You can see again.');
    game.context.move = 1;
}

async function start_taking_off_object(obj) {
    if (obj?.oclass === ARMOR_CLASS) {
        await start_takeoff_armor(obj);
    } else if (obj?.otyp === BLINDFOLD) {
        // C refs: do_wear.c:takeoff_ok(), do_wear.c:Blindf_off().  The
        // blindfold is downplayed by the T prompt but can still be selected.
        await start_takeoff_blindfold(obj);
    } else if (obj?.oclass === RING_CLASS && obj.wornSide) {
        const side = obj.wornSide;
        obj.wornSide = null;
        obj.owornmask = 0;
        if (obj.otyp === RIN_REGENERATION) refreshRingRegenerationExtrinsic();
        await pline(`You were wearing ${inventoryObjectName(obj)} (on ${side} hand).`);
        game.context.move = 1;
    } else {
        game.context.move = 0;
        await pline('Never mind.');
    }
}

async function start_wearing_object(obj) {
    if (obj.worn || obj.wornSide || obj.owornmask) {
        game.context.move = 0;
        await pline('You are already wearing that!');
        return;
    }

    if (obj.oclass === RING_CLASS) {
        if (heroHasNoLimbs()) {
            // C ref: do_wear.c:armor_or_accessory_on().  Ring selection is
            // allowed, but forms with no limbs cannot put one on and the
            // failed attempt does not take time.
            game.context.move = 0;
            await pline('You cannot make the ring stick to your body.');
            return;
        }
        game._awaiting_ring_finger = obj;
        game.context.move = 0;
        await showPromptLine('Which ring-finger, Right or Left? [rl] ');
        return;
    }

    if (obj.otyp === BLINDFOLD) {
        // C ref: do_wear.c:Blindf_on().  Blindfolds are put on via the
        // accessory command even though they are tools, not armor.
        obj.worn = true;
        obj.owornmask = C.W_TOOL || 0;
        game.u.uprops = game.u.uprops || {};
        game.u.ublind = true;
        game.u.uprops.blind = 1;
        game.u.uprops.blinded = 1;
        await pline("You are now wearing a blindfold.  You can't see any more.");
        game.context.move = 1;
        return;
    }

    const armorWearName = obj.oclass === ARMOR_CLASS ? baseObjectName(obj) : '';
    obj.worn = true;
    if (obj.otyp === CLOAK_OF_DISPLACEMENT) {
        // C ref: do_wear.c:Cloak_on()/toggle_displacement().  The property
        // discovery message can block at --More-- before on_msg() reports
        // that the cloak is now worn and before moveloop_core() reaches
        // find_ac(), so the blocking frame still shows the previous AC.
        game._status_uac_override = null;
        discoverObjectType(obj.otyp);
        obj.known = true;
        obj.knownName = true;
        game.u.uprops = game.u.uprops || {};
        game.u.uprops.displaced = true;
        game._cloak_displacement_on_msg_pending = obj;
        await pline('You feel that monsters have difficulty pinpointing your location.');
        queue_more_prompt();
        game.context.move = 0;
        return;
    }
    if (obj.oclass === ARMOR_CLASS) {
        // C refs: do_wear.c:armor_or_accessory_on(), allmain.c:moveloop_core().
        // setworn() makes the bottom line eligible to show new AC before
        // find_ac() updates u.uac for combat calculations.
        game._status_uac_override = calculated_armor_class();
    }
    const delay = OBJECT_DELAY[obj.otyp] || 0;
    if (obj.oclass === ARMOR_CLASS && delay > 0) {
        if (obj.otyp === GAUNTLETS_OF_POWER) {
            // C refs: do_wear.c:armor_or_accessory_on()/Gloves_on(),
            // allmain.c:moveloop_core().  Power-gauntlet makeknown()/botl
            // side effects run from afternmv after the final immobile turn
            // tail; speed boots have distinct Type_on message evidence.
            game._occupation_pre_finish_extra_turn = true;
        }
        game._occupation_turns_remaining = Math.max(0, delay - 1);
        game._occupation_finish_message = armor_finish_message(obj);
        game._occupation_pack_finish_message = true;
        game._occupation_finish_uac = calculated_armor_class();
        game._occupation_finish_object = obj;
    } else {
        if (obj.oclass === ARMOR_CLASS) {
            obj.known = true;
            game.u.uac = calculated_armor_class();
            game._status_uac_override = null;
            await pline(`You are now wearing ${wornArmorMessageName(armorWearName)}.`);
        } else {
            await pline(`${inventoryListing(obj)} (being worn).`);
        }
    }
    game.context.move = 1;
}

function zapLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => obj?.oclass === WAND_CLASS)
        .map((obj) => obj.invlet)
        .join('');
}

async function zappableWand(obj) {
    // C ref: src/zap.c:zappable().  Successful zaps consume the charge before
    // cursed backfire and before a directional prompt can be cancelled.
    if ((obj?.spe ?? 0) < 0 || ((obj?.spe ?? 0) === 0 && rn2(C.WAND_WREST_CHANCE))) {
        return false;
    }
    if ((obj?.spe ?? 0) === 0) await pline('You wrest one last charge from the worn-out wand.');
    obj.spe = (obj.spe ?? 0) - 1;
    return true;
}

async function maybeBackfireWand(obj) {
    // C ref: src/zap.c:dozap().
    if (!obj?.cursed || rn2(C.WAND_BACKFIRE_CHANCE)) return false;
    const idx = game.inventory?.indexOf(obj) ?? -1;
    if (idx >= 0) game.inventory.splice(idx, 1);
    const name = baseObjectName(obj);
    await pline(`${sentenceStart(`the ${name}`)} suddenly explodes!`);
    const damage = d(Math.max(1, (obj.spe ?? 0) + 2), 6);
    if (game.u && typeof game.u.uhp === 'number') game.u.uhp = Math.max(0, game.u.uhp - damage);
    game.context.move = 1;
    return true;
}

function dropObjectName(obj) {
    if (obj?.otyp === QUARTERSTAFF) {
        const buc = obj.blessed ? 'blessed ' : obj.cursed ? 'cursed ' : 'uncursed ';
        const spe = typeof obj.spe === 'number' ? `${obj.spe >= 0 ? '+' : ''}${obj.spe} ` : '';
        return `a ${buc}${spe}quarterstaff`;
    }
    if (obj?.oclass === WEAPON_CLASS && OBJECT_BASE_NAMES.has(obj.otyp)) {
        const quan = obj.quan || 1;
        const rawBase = baseObjectName(obj);
        const base = quan > 1 ? pluralizeObjectName(rawBase) : rawBase;
        const buc = obj.blessed ? 'blessed ' : obj.cursed ? 'cursed ' : '';
        const spe = typeof obj.spe === 'number' && (obj.known || obj.knownName)
            ? `${obj.spe >= 0 ? '+' : ''}${obj.spe} `
            : '';
        const body = `${buc}${spe}${base}`;
        return quan > 1 ? `${quan} ${body}` : `${indefiniteArticle(body)} ${body}`;
    }
    if (OBJECT_BASE_NAMES.has(obj?.otyp)) {
        const base = baseObjectName(obj);
        return `${indefiniteArticle(base)} ${base}`;
    }
    return 'an object';
}

async function lookHereAfterMove(opts = {}) {
    const u = game.u;
    const objects = (game.level?.objects || [])
        .filter(o => o.ox === u.ux && o.oy === u.uy);
    const countableObjects = objects.filter((obj) => obj !== game.uchain);
    if (!countableObjects.length) {
        // C refs: hack.c:spoteffects(), pickup.c:pickup(), engrave.c:read_engr_at().
        await readEngravingAtHero({ pauseBeforeReading: true });
        return;
    }
    const feature = typeof opts.featureLine === 'string'
        ? { line: opts.featureLine, blocks: false }
        : opts.featureAlreadyShown ? { line: '', blocks: false } : lookHereFeature();
    const deferMoveFloorList = () => {
        // C refs: src/hack.c:domove(), src/pickup.c:check_here(),
        // src/allmain.c:moveloop_core().  A running step stops on floor
        // objects, but the pending look_here() output is still behind any tty
        // More already produced by the movement/turn boundary.
        game._deferred_move_floor_list = {
            x: u.ux,
            y: u.uy,
            featureLine: feature.line || '',
            featureAlreadyShown: !!opts.featureAlreadyShown,
        };
    };
    const blindFeelLine = heroIsBlind() ? blindLookHereTactileLine(u.ux, u.uy) : '';
    const blindFeelShown = !!blindFeelLine;
    if (blindFeelLine) {
        await pline(blindFeelLine);
        if (objects.length > 1) {
            deferBlindFloorListAfterMore(objects, feature.line, opts);
            return;
        }
    }
    const pileLimit = Number.isFinite(Number(game.flags?.pile_limit))
        ? Math.trunc(Number(game.flags.pile_limit))
        : 5;
    if (pileLimit > 0 && countableObjects.length >= pileLimit) {
        if (feature.line) {
            if (blindFeelShown) await append_pline(feature.line);
            else await pline(feature.line);
        }
        const count = countableObjects.length === 1 ? 'an'
            : countableObjects.length === 2 ? 'two'
                : countableObjects.length < 5 ? 'a few'
                    : countableObjects.length < 10 ? 'several' : 'many';
        const line = countableObjects.length === 1
            ? `There is ${count} object here.`
            : `There are ${count} objects here.`;
        if (feature.line || blindFeelShown) await append_pline(line);
        else await pline(line);
        return;
    }
    if (objects.length === 1) {
        const verb = heroIsBlind() ? 'feel' : 'see';
        const line = `You ${verb} here ${inventoryObjectName(objects[0], { includePrice: true, observe: true })}.`;
        const overflow = toplineWouldOverflowWithPrevious(line);
        if (game._more && game._run_sound_more_defer_floor_look) {
            // C refs: sounds.c:dosounds(), topl.c:more().  During a run, a
            // blocking ambient sound can remain the captured topline while the
            // run advances far enough to discover a floor object.  Defer that
            // floor-look line until the sound More is dismissed instead of
            // overwriting the visible sound frame.
            const cols = game.nhDisplay?.cols || COLNO;
            game._deferred_run_floor_look = { line, overflow: line.length >= cols - 8 };
            await flush_screen(1);
            game._latched_more_screen = serialize_terminal_grid(game.nhDisplay);
            game._latched_more_cursor = game._run_sound_more_cursor || [
                game.nhDisplay?.cursorCol ?? 0,
                game.nhDisplay?.cursorRow ?? 0,
                1,
            ];
            game._latched_more_keep_until_dismiss = true;
            return;
        }
        if (blindFeelShown && !feature.line
            && !topline_can_pack_message(game._pending_message, line)) {
            // C refs: invent.c:look_here(), win/tty/topl.c:update_topl().
            // Blind tactile text is an ordinary topline; if the following
            // object sentence cannot leave room for --More--, tty blocks
            // before display_nhwindow()/the object line proceeds.
            game._more_message_queue = [
                ...(game._more_message_queue || []),
                {
                    text: line,
                    move: !opts.arrivalFloorListNoTurn,
                    resumeSpotEffects: !opts.arrivalFloorListNoTurn,
                    wrapWithMore: line.length > (game.nhDisplay?.cols || COLNO),
                },
            ];
            game._look_here_pauses_turn = true;
            queue_more_prompt();
            return;
        }
        if (game._pending_message && !topline_can_pack_message(game._pending_message, line)) {
            // C refs: src/pickup.c:check_here(), src/invent.c:look_here(),
            // win/tty/topl.c:update_topl().  A floor-object sentence which
            // cannot pack behind a prior topline blocks on the prior line
            // first, then prints the floor sentence after that More.
            game._deferred_floor_look_after_more = {
                line,
                overflow: line.length >= (game.nhDisplay?.cols || COLNO),
                move: !opts.arrivalFloorListNoTurn,
            };
            if (game.context?.run) game.context.run = null;
            queue_more_prompt();
            game.context.move = 0;
            return;
        }
        if (opts.deferFloorListUntilAfterMonsterTurn) {
            deferMoveFloorList();
            return;
        }
        if (feature.line) {
            if (blindFeelShown) await append_pline(feature.line);
            else await pline(feature.line);
            await append_pline(line);
        } else if (blindFeelShown) {
            await append_pline(line);
        } else {
            await pline(line);
        }
        if (overflow) {
            game._floor_list_pauses_turn = true;
            queue_more_prompt();
        }
        return;
    }
    if (opts.deferFloorListUntilAfterMonsterTurn) {
        deferMoveFloorList();
        return;
    }
    showFloorObjectList(objects, feature.line);
    game._floor_list_pauses_turn = true;
}

function floorObjectAtHero() {
    const u = game.u || {};
    return (game.level?.objects || []).find((obj) =>
        typeof obj?.otyp === 'number' && obj.ox === u.ux && obj.oy === u.uy);
}

function floorObjectsAt(x, y) {
    return (game.level?.objects || []).filter((obj) =>
        typeof obj?.otyp === 'number' && obj.ox === x && obj.oy === y);
}

function floorObjectsAtHero() {
    const u = game.u || {};
    return floorObjectsAt(u.ux, u.uy);
}

function lookHereSurfaceName(x, y) {
    // C ref: src/dungeon.c:surface().
    const loc = game.level?.at(x, y);
    const typ = loc?.typ;
    if (typ === C.AIR) return C.Is_waterlevel(game.u?.uz) ? 'air bubble' : 'air';
    if (typ === C.CLOUD) return 'cloud';
    if (C.IS_POOL?.(typ)) return (game.u?.uprops?.underwater || game.u?.underwater || game.Underwater) ? 'bottom' : 'water';
    if (typ === C.ICE) return 'ice';
    if (C.IS_LAVA?.(typ)) return 'lava';
    if (typ === C.DRAWBRIDGE_DOWN) return 'bridge';
    if (typ === C.ALTAR) return 'altar';
    if (typ === C.GRAVE) return 'headstone';
    if (typ === C.FOUNTAIN) return 'fountain';
    if (stairAtHero()) return 'stairs';
    if (C.IS_WALL?.(typ) || typ === C.SDOOR) return 'wall';
    if (C.IS_DOOR?.(typ)) return 'doorway';
    if (C.IS_ROOM?.(typ)) return 'floor';
    return 'ground';
}

function blindLookHereTactileLine(x, y) {
    // C ref: src/invent.c:look_here().
    const loc = game.level?.at(x, y);
    const drift = C.Is_airlevel(game.u?.uz) || C.Is_waterlevel(game.u?.uz);
    if (loc?.typ === C.ICE) return 'You try to feel what is on it.';
    if (drift) return 'You try to feel what is floating here.';
    if (!canReachFloorForSmudge()) return 'You try to feel what is lying beneath you.';
    return `You try to feel what is lying here on the ${lookHereSurfaceName(x, y)}.`;
}

function deferBlindFloorListAfterMore(objects, featureLine, opts = {}) {
    // C ref: src/invent.c:look_here().  Blind look_here() emits the tactile
    // topline before display_nhwindow(WIN_MESSAGE) opens the object list.
    const u = game.u || {};
    game._deferred_blind_floor_list = {
        x: u.ux,
        y: u.uy,
        featureLine: featureLine || '',
        noTurn: !!opts.arrivalFloorListNoTurn,
        resumeStairArrival: !!opts.resumeStairArrivalAfterFloorList,
    };
    game._look_here_pauses_turn = true;
    queue_more_prompt();
}

function showDeferredBlindFloorListAfterMore() {
    const state = game._deferred_blind_floor_list;
    if (!state) return false;
    game._deferred_blind_floor_list = null;
    game._look_here_pauses_turn = false;
    const objects = floorObjectsAt(state.x, state.y);
    if (objects.length > 1) {
        showFloorObjectList(objects, state.featureLine || '');
        game._floor_list_pauses_turn = false;
        game._resume_floor_list_turn = true;
        if (state.noTurn) game._arrival_floor_list_no_turn = true;
        else if (state.resumeStairArrival) game._stair_arrival_resume_after_floor_list = true;
        game.context.move = 0;
    } else {
        game._more = false;
        game._more_dismissals_remaining = 0;
        game.context.move = state.noTurn ? 0 : 1;
    }
    return true;
}

function floorListHeader() {
    return heroIsBlind() ? 'Things that you feel here:' : 'Things that are here:';
}

function floorListColumn(lines) {
    const maxLineLength = Math.max(0, ...lines.map((line) => String(line || '').length));
    // C ref: win/tty/wintty.c:process_text_window().  The tty menu overlay
    // normally starts at column 41, but shifts left when long item names need
    // a trailing blank to fit on the 80-column message/map line.
    return Math.min(41, Math.max(0, COLNO - maxLineLength - 1));
}

function latchFeatureFloorListMoreMargin(col) {
    if (game._latched_more_screen || col <= 0) return;
    // C ref: win/tty/wintty.c:process_text_window().  A text window with a
    // preceding feature line leaves a blank margin one column before the
    // visible text.  The normal renderer owns the reusable floor-list overlay;
    // patch only the latched More frame so the final redraw remains untouched.
    flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.setCell) return;
    const moreRow = Math.min(21, (game._floor_list_lines?.length || 0) + 1);
    for (let row = 1; row <= moreRow; row++)
        display.setCell(col - 1, row, ' ', NO_COLOR, 0);
    game._latched_more_screen = serialize_terminal_grid(display);
    game._latched_more_cursor = [col + 8, moreRow, 1];
    game._latched_more_keep_until_dismiss = true;
}

function showFloorObjectList(objects, featureLine = '') {
    // C ref: src/invent.c:look_here().  Explicit ':' look uses obj_cnt=0,
    // so it displays the full object list even when autopickup floor-look
    // would summarize a pile via pile_limit.
    const lines = objects.map(obj => inventoryObjectName(obj, { includePrice: true, observe: true }));
    const header = floorListHeader();
    const col = floorListColumn([featureLine, header, ...lines]);
    if (featureLine) {
        const prefix = game._pending_message || '';
        const gap = ' '.repeat(Math.max(1, col - prefix.length));
        game._pending_message = prefix
            ? `${prefix}${gap}${featureLine}`
            : `${' '.repeat(col)}${featureLine}`;
        game._floor_list_restore_message_after_more = prefix;
        game._floor_list_lines = ['', header, ...lines];
    } else {
        game._floor_list_restore_message_after_more = '';
        game._pending_message = `${' '.repeat(col)}${header}`;
        game._floor_list_lines = lines;
    }
    game._floor_list_col = col;
    game._prompt_cursor = [col + 8, Math.min(21, game._floor_list_lines.length + 1)];
    queue_more_prompt();
    if (featureLine) latchFeatureFloorListMoreMargin(col);
}

export async function showDeferredMoveFloorList() {
    const state = game._deferred_move_floor_list;
    if (!state) return false;
    game._deferred_move_floor_list = null;
    const objects = floorObjectsAt(state.x, state.y);
    if (objects.length > 1) {
        showFloorObjectList(objects, state.featureLine || '');
        game._floor_list_pauses_turn = false;
        game._resume_floor_list_turn = true;
        // C refs: src/allmain.c:moveloop_core(), src/hack.c:domove().
        // This floor list was delayed until after monsters had already moved;
        // dismissing it only resumes the interrupted domove() spot effects.
        game._deferred_move_floor_list_resume_spot_effects = true;
        return true;
    }
    if (objects.length === 1) {
        await lookHereAfterMove({
            featureLine: state.featureAlreadyShown ? '' : (state.featureLine || ''),
            featureAlreadyShown: !!state.featureAlreadyShown,
        });
        if (game._more) {
            game._floor_list_pauses_turn = false;
            game._resume_floor_list_turn = true;
            game._deferred_move_floor_list_resume_spot_effects = true;
            return true;
        }
    }
    await triggerSpotEffectsAtHero();
    if (!game._more) finishPendingMoveSmudge();
    return !!game._more;
}

function heroIsBlind() {
    return !!(game.u?.ublind || game.u?.blind
        || game.u?.uprops?.blind || game.u?.uprops?.blinded);
}

function engravingSurfaceName(x, y) {
    const loc = game.level?.at(x, y);
    if (loc?.typ === C.ICE) return 'ice';
    return 'floor';
}

async function readEngravingAt(x, y, options = {}) {
    const ep = engravingAt(x, y);
    const text = engravingVisibleText(ep);
    if (!text) return false;
    const blind = heroIsBlind();
    const surface = engravingSurfaceName(x, y);
    let sensed = false;
    let line = '';
    switch (ep.type) {
    case C.DUST:
        if (!blind) {
            sensed = true;
            line = `Something is written here in the ${surface === 'ice' ? 'frost' : 'dust'}.`;
        }
        break;
    case C.ENGRAVE:
    case C.HEADSTONE:
        sensed = true;
        line = `Something is engraved here on the ${surface}.`;
        break;
    case C.BURN:
        sensed = true;
        line = `Some text has been ${surface === 'ice' ? 'melted' : 'burned'} into the ${surface} here.`;
        break;
    case C.MARK:
        if (!blind) {
            sensed = true;
            line = `There's some graffiti on the ${surface} here.`;
        }
        break;
    case C.ENGR_BLOOD:
        if (!blind) {
            sensed = true;
            line = 'You see a message scrawled in blood here.';
        }
        break;
    default:
        sensed = true;
        line = 'Something is written in a very strange way.';
        break;
    }
    if (!sensed) return false;
    ep.eread = 1;
    ep.erevealed = 1;
    ep.remembered = text;
    await pline(line);
    const punct = /[.!?]$/.test(text) ? '' : '.';
    const readLine = `You ${blind ? 'feel the words' : 'read'}: "${text}"${punct}`;
    if (options.pauseBeforeReading) {
        if (topline_can_pack_message(game._pending_message, readLine)) {
            await append_pline(readLine);
            return true;
        }
        const cols = game.nhDisplay?.cols || COLNO;
        game._more_message_queue = [
            ...(game._more_message_queue || []),
            {
                text: readLine,
                move: true,
                resumeSpotEffects: true,
                wrapWithMore: readLine.length > cols,
            },
        ];
        game._floor_list_pauses_turn = true;
        queue_more_prompt();
    } else {
        await append_pline(readLine);
    }
    return true;
}

async function readEngravingAtHero(options = {}) {
    const u = game.u || {};
    return readEngravingAt(u.ux, u.uy, options);
}

function removeFloorObject(obj) {
    const objects = game.level?.objects;
    // C ref: src/invent.c:delobj_core(); ordinary destruction probes
    // obj_resists(0,0) even when the object is not special.
    if (obj_resists(obj, 0, 0)) return;
    const idx = objects?.indexOf(obj) ?? -1;
    if (idx >= 0) objects.splice(idx, 1);
    if (typeof obj?.ox === 'number' && typeof obj?.oy === 'number') newsym(obj.ox, obj.oy);
}

function replaceFloorObject(obj, replacement) {
    const objects = game.level?.objects;
    if (!obj || !replacement || !objects) return replacement;
    const x = obj.ox;
    const y = obj.oy;
    const idx = objects.indexOf(obj);
    if (obj_resists(obj, 0, 0)) return obj;
    if (idx >= 0) objects.splice(idx, 1);
    place_object(replacement, x, y);
    const placedIdx = objects.indexOf(replacement);
    if (placedIdx >= 0) objects.splice(placedIdx, 1);
    if (idx >= 0) objects.splice(Math.min(idx, objects.length), 0, replacement);
    else objects.unshift(replacement);
    newsym(x, y);
    return replacement;
}

function rndObjectTypeBetween(first, last) {
    let total = 0;
    for (let otyp = first; otyp <= last; otyp++) total += OBJECT_PROB[otyp] ?? 0;
    if (!total) return rn1(last - first + 1, first);
    let remaining = rnd(total);
    for (let otyp = first; otyp <= last; otyp++) {
        remaining -= OBJECT_PROB[otyp] ?? 0;
        if (remaining <= 0) return otyp;
    }
    return first;
}

function unpolyableObject(obj) {
    if (!obj) return true;
    return obj.otyp === WAN_POLYMORPH
        || obj.otyp === SPE_POLYMORPH
        || obj.otyp === POT_POLYMORPH
        || obj.otyp === AMULET_OF_UNCHANGING
        || obj_resists(obj, 5, 95);
}

function objShuddersFromPolymorph(obj) {
    let odds;
    if (obj?.oclass === WAND_CLASS) odds = 3;
    else if (obj?.cursed) odds = 3;
    else if (obj?.blessed) odds = 12;
    else odds = 8;
    if ((obj?.quan || 1) > 4) odds = Math.max(1, Math.trunc(odds / 2));
    return rn2(odds) === 0;
}

function doObjectSystemShock(obj) {
    // C ref: src/zap.c:do_osshock().
    game._zap_obj_zapped = true;
    if ((game._poly_zapped ?? -1) < 0) {
        const chance = Math.max(1, (game.u?.uluck ?? 0) + 45);
        for (let i = obj?.quan || 1; i > 0; i--) {
            if (!rn2(chance)) {
                game._poly_zapped = OBJECT_MATERIAL[obj.otyp] ?? 0;
                break;
            }
        }
    }

    if ((obj?.quan || 1) > 1) {
        const zapped = rnd(Math.max(1, (obj.quan || 1) - 1));
        obj.quan = Math.max(1, (obj.quan || 1) - zapped);
        newsym(obj.ox, obj.oy);
        return;
    }
    removeFloorObject(obj);
}

function polymorphFloorObject(obj) {
    // C ref: src/zap.c:poly_obj().
    const replacement = mkobj(obj.oclass, false);
    replacement.quan = obj.quan || 1;
    replacement.no_charge = obj.no_charge;
    if (replacement.oclass === WAND_CLASS
        || replacement.oclass === WEAPON_CLASS
        || replacement.oclass === ARMOR_CLASS) {
        replacement.spe = obj.spe;
    }
    replacement.recharged = obj.recharged;
    replacement.cursed = !!obj.cursed;
    replacement.blessed = !!obj.blessed;

    switch (replacement.oclass) {
    case WAND_CLASS:
        while (replacement.otyp === WAN_WISHING || replacement.otyp === WAN_POLYMORPH) {
            replacement.otyp = rndObjectTypeBetween(WAN_LIGHT, WAN_LIGHTNING);
        }
        replacement.oclass = OBJECT_CLASS[replacement.otyp] ?? replacement.oclass;
        if ((replacement.recharged || 0) < rn2(7)) {
            replacement.recharged = (replacement.recharged || 0) + 1;
        }
        break;
    case POTION_CLASS:
        while (replacement.otyp === POT_POLYMORPH) {
            replacement.otyp = rndObjectTypeBetween(POT_GAIN_ABILITY, POT_WATER);
        }
        replacement.oclass = OBJECT_CLASS[replacement.otyp] ?? replacement.oclass;
        break;
    case SPBOOK_CLASS:
        while (replacement.otyp === SPE_POLYMORPH) {
            replacement.otyp = rndObjectTypeBetween(FIRST_SPELL, SPE_BLANK_PAPER);
        }
        replacement.oclass = OBJECT_CLASS[replacement.otyp] ?? replacement.oclass;
        break;
    default:
        break;
    }
    return replaceFloorObject(obj, replacement);
}

function learnWandFromVisibleObjectEffect(wand, obj) {
    // C refs: src/zap.c:bhito(), src/zap.c:learnwand(), src/o_init.c:discover_object().
    if (!wand || !obj || !cansee(obj.ox, obj.oy)) return;
    wand.dknown = true;
    wand.knownName = true;
    discoverObjectType(wand.otyp);
}

function polymorphZapHitsObject(obj, wand) {
    // C ref: src/zap.c:bhito(), WAN_POLYMORPH case.
    if (unpolyableObject(obj)) return 0;
    noteObjectPolymorphConduct();
    if (objShuddersFromPolymorph(obj)) {
        doObjectSystemShock(obj);
        learnWandFromVisibleObjectEffect(wand, obj);
        return 1;
    }
    polymorphFloorObject(obj);
    return 1;
}

async function zapPolymorphObjects(wand, dx, dy) {
    // C refs: src/zap.c:weffects(), src/zap.c:bhit(), src/zap.c:bhitpile().
    if (!dx && !dy) return;
    game._zap_obj_zapped = false;
    game._poly_zapped = -1;
    let range = rn1(8, 6);
    let x = game.u?.ux ?? 0;
    let y = game.u?.uy ?? 0;
    while (range-- > 0) {
        x += dx;
        y += dy;
        const loc = game.level?.at(x, y);
        if (!loc) break;
        const pile = floorObjectsAt(x, y).slice();
        for (const obj of pile) {
            if (obj.ox === x && obj.oy === y && (game.level?.objects || []).includes(obj)) {
                polymorphZapHitsObject(obj, wand);
            }
        }
        if (!C.ZAP_POS(loc.typ) || closedDoorAt(x, y)) break;
    }
    if (game._zap_obj_zapped) await pline('You feel shuddering vibrations.');
    game._zap_obj_zapped = false;
    game._poly_zapped = -1;
}

function lookHereFeature() {
    const st = stairAtHero();
    if (st) return { line: `There is a ${stairsDescription(st)} here.`, blocks: !!st.up };
    const loc = game.level?.at(game.u?.ux, game.u?.uy);
    if (loc?.typ === C.DOOR && (loc.doormask || 0) === C.D_NODOOR) return { line: 'There is a doorway here.', blocks: false };
    if (loc?.typ === C.DOOR && (loc.doormask || 0) === C.D_BROKEN) return { line: 'There is a broken door here.', blocks: false };
    if (loc?.typ === C.DOOR && (loc.doormask || 0) === C.D_ISOPEN) return { line: 'There is an open door here.', blocks: false };
    if (loc?.typ === C.DOOR) return { line: 'There is a closed door here.', blocks: false };
    if (loc?.typ === C.SINK) return { line: 'There is a sink here.', blocks: false };
    if (loc?.typ === C.FOUNTAIN) return { line: 'There is a fountain here.', blocks: false };
    return { line: '', blocks: false };
}

function isContainerObject(obj) {
    return obj?.otyp >= LARGE_BOX && obj?.otyp < BAG_OF_TRICKS;
}

function containerAt(x, y) {
    return floorObjectsAt(x, y).find((obj) => isContainerObject(obj));
}

function monsterBesideHero() {
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            if (mon_at(ux + dx, uy + dy)) return true;
        }
    }
    return false;
}

async function doLootCommand() {
    if (!heroHasHands()) {
        // C ref: src/pickup.c:doloot_core().
        await pline('You have no hands!');
        game.context.move = 0;
        return;
    }
    const container = containerAt(game.u?.ux, game.u?.uy);
    if (!container) {
        // C ref: pickup.c:doloot_core().  With no floor container, #loot
        // asks for a direction only when directional monster looting applies.
        if (monsterBesideHero()) {
            await showPromptLine('Loot in what direction? ');
            game._awaiting_loot_direction = true;
        } else {
            await pline("You don't find anything here to loot.");
        }
        game.context.move = 0;
        return;
    }

    const name = baseObjectName(container) || 'container';
    if (container.olocked) {
        if (container.lknown) await pline(`The ${name} is locked.`);
        else await pline(`Hmmm, the ${name} turns out to be locked.`);
        container.lknown = true;
        game.context.move = 0;
        return;
    }

    showLootActionMenu(container);
    game.context.move = 0;
}

function clearLootMenuArea(col, maxRow) {
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    const clearCol = Math.max(0, col - 1);
    for (let row = 0; row <= maxRow; row++)
        display.putstr(clearCol, row, ' '.repeat(COLNO - clearCol), NO_COLOR, 0);
}

function containerActionName(container, held = false) {
    const name = baseObjectName(container) || 'container';
    return `${held ? 'your' : 'the'} ${name}`;
}

function showLootActionMenu(container, used = false, opts = {}) {
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    const col = 38;
    const held = opts.held ?? (game.inventory || []).includes(container);
    const name = containerActionName(container, held);
    const baseName = baseObjectName(container) || 'container';
    const rows = [
        [0, `Do what with ${name}?`, true],
        [2, `: - Look inside the ${baseName}`, false],
        [3, 'o - take something out', false],
        [4, 'i - put something in', false],
        [5, 'b - both; take out, then put in', false],
        [6, 'r - both reversed; put in, then take out', false],
        [7, `s - stash one item into the ${baseName}`, false],
        [9, `q * ${used ? 'done' : 'do nothing'}`, false],
        [10, '(end)', false],
    ];
    clearLootMenuArea(col, 10);
    display.putstr(0, 0, ' '.repeat(col), NO_COLOR, 0);
    for (const [row, text, inverse] of rows)
        display.putstr(col, row, text, NO_COLOR, inverse ? ATR_INVERSE : 0);
    game._loot_action_menu = { container, used, held };
    game._loot_type_menu = null;
    game._loot_putin_menu = null;
    game._loot_takeout_menu = null;
    showOverride(serialize_terminal_grid(display), [col + '(end)'.length + 1, 10]);
}

function containerContents(container) {
    return (container?.cobj || container?.contents || []).filter(Boolean);
}

function containerLootSortName(obj) {
    if (obj?.otyp === CORPSE) return `${corpseMonsterDisplayName(obj)} corpse`;
    return inventoryObjectName({ ...obj, quan: 1 }, { observe: false })
        .replace(/^(?:an?|the) /, '');
}

function containerContentMenuRows(container) {
    const contents = containerContents(container);
    // C ref: src/end.c:container_contents() -> sortloot(SORTLOOT_LOOT).
    // Names sort lexicographically while ignoring quantity, with original
    // object-list order as the final tie-breaker.
    return contents
        .map((obj, idx) => ({ obj, idx, key: containerLootSortName(obj).toLowerCase() }))
        .sort((a, b) => a.key.localeCompare(b.key) || a.idx - b.idx)
        .map(({ obj }) => inventoryObjectName(obj, { observe: false }));
}

function showLootContainerContents(container, alreadyUsed = false, opts = {}) {
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    const headerCol = 41;
    const itemCol = 43;
    const moreCol = 41;
    const held = opts.held ?? (game.inventory || []).includes(container);
    const name = containerActionName(container, held);
    const rows = containerContentMenuRows(container);
    const moreRow = Math.min(21, rows.length + 2);
    const gainedInfo = !container.cknown;
    clearLootMenuArea(38, Math.max(10, moreRow));
    display.putstr(0, 0, ' '.repeat(headerCol), NO_COLOR, 0);
    display.putstr(headerCol, 0, `Contents of ${name}:`, NO_COLOR, 0);
    rows.forEach((text, idx) => display.putstr(itemCol, idx + 2, text, NO_COLOR, 0));
    display.putstr(moreCol, moreRow, '--More--', NO_COLOR, 0);
    container.cknown = true;
    game._loot_action_menu = null;
    game._loot_type_menu = null;
    game._loot_putin_menu = null;
    game._loot_takeout_menu = null;
    game._loot_contents_more = { container, used: alreadyUsed || gainedInfo, held };
    game._pending_message = `${' '.repeat(headerCol)}Contents of ${name}:`;
    queue_more_prompt();
    showOverride(serialize_terminal_grid(display), [moreCol + '--More--'.length, moreRow]);
}

function showLootTypeMenu(container, selectedAuto = false, opts = {}) {
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    const col = 23;
    const putIn = !!opts.putIn;
    const selectedCoins = !!opts.selectedCoins;
    const rows = putIn ? [
        [0, 'Put in what type of objects?', true, col],
        [2, `A ${selectedAuto ? '+' : '-'} Auto-select every relevant item`, false, col],
        [3, '(ignored unless some other choices are also picked)', false, col + 4],
        [5, 'a - All types', false, col],
        [6, `b ${selectedCoins ? '+' : '-'} Coins`, false, col],
        [7, 'c - Armor', false, col],
        [8, 'd - Comestibles', false, col],
        [9, 'e - Scrolls', false, col],
        [10, 'f - Spellbooks', false, col],
        [11, 'g - Potions', false, col],
        [12, 'h - Tools', false, col],
        [14, 'B - Items known to be Blessed', false, col],
        [15, 'U - Items known to be Uncursed', false, col],
        [16, 'X - Items of unknown Bless/Curse status', false, col],
        [17, `P - Just picked up: ${game._goldCount || 0} gold pieces`, false, col],
        [18, '(end)', false, col],
    ] : [
        [0, 'Take out what type of objects?', true, col],
        [2, `A ${selectedAuto ? '+' : '-'} Auto-select every relevant item`, false, col],
        [3, '(ignored unless some other choices are also picked)', false, col + 4],
        [5, 'a - All types', false, col],
        [6, 'b - Comestibles', false, col],
        [7, 'c - Potions', false, col],
        [8, 'd - Rings', false, col],
        [10, 'X - Items of unknown Bless/Curse status', false, col],
        [11, '(end)', false, col],
    ];
    const lastRow = putIn ? 18 : 11;
    clearLootMenuArea(col, lastRow);
    display.putstr(0, 0, ' '.repeat(col), NO_COLOR, 0);
    for (const [row, text, inverse, rowCol] of rows)
        display.putstr(rowCol, row, text, NO_COLOR, inverse ? ATR_INVERSE : 0);
    game._loot_action_menu = null;
    game._loot_type_menu = {
        container,
        selectedAuto,
        putIn,
        selectedCoins,
        held: opts.held ?? (game.inventory || []).includes(container),
    };
    game._loot_putin_menu = null;
    game._loot_takeout_menu = null;
    showOverride(serialize_terminal_grid(display), [col + '(end)'.length + 1, lastRow]);
}

async function dismissLootMenu(spentTurn = false) {
    game._loot_action_menu = null;
    game._loot_type_menu = null;
    game._loot_putin_menu = null;
    game._loot_takeout_menu = null;
    game._loot_contents_more = null;
    clearOverrideScreen();
    clear_pending_message();
    await redrawAfterFullScreenMenuDismiss();
    game.context.move = spentTurn ? 1 : 0;
}

async function handleLootActionMenuKey(ch) {
    const menu = game._loot_action_menu;
    if (!menu) return false;
    game._override_prev = null;
    if (ch === 'o') {
        if (takeOutNeedsClassMenu(menu.container))
            showLootTypeMenu(menu.container, false, { putIn: false, held: menu.held });
        else
            await showLootTakeOutObjectMenu(menu.container, false, { held: menu.held });
        game.context.move = 0;
        return true;
    }
    if (ch === 'i') {
        showLootTypeMenu(menu.container, false, { putIn: true, held: menu.held });
        game.context.move = 0;
        return true;
    }
    if (ch === ':') {
        // C ref: src/pickup.c:use_container().  The ':' command shows
        // container contents, then returns to the action loop with "done".
        showLootContainerContents(menu.container, menu.used, { held: menu.held });
        game.context.move = 0;
        return true;
    }
    if (ch === 'q' || ch === 'Q' || ch === '\x1b') {
        await dismissLootMenu(menu.used);
        return true;
    }
    showLootActionMenu(menu.container, menu.used, { held: menu.held });
    game.context.move = 0;
    return true;
}

function containedGoldObject(container) {
    return containerContents(container).find((obj) => obj?.otyp === GOLD_PIECE) || null;
}

function lootObjectClass(obj) {
    if (!obj) return null;
    if (typeof obj.oclass === 'number') return obj.oclass;
    if (typeof obj.otyp === 'number') return OBJECT_CLASS[obj.otyp] ?? null;
    return null;
}

function takeOutNeedsClassMenu(container) {
    // C refs: src/pickup.c:traditional_loot(), src/pickup.c:query_classes().
    // query_classes() skips its prompt when collect_obj_classes() finds only
    // one available object class, and askchain() goes straight to object rows.
    const classes = new Set();
    for (const obj of containerContents(container)) {
        const cls = lootObjectClass(obj);
        if (cls == null) continue;
        classes.add(cls);
        if (classes.size > 1) return true;
    }
    return false;
}

async function showLootTakeOutObjectMenu(container, selectedGold = false, opts = {}) {
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    clearOverrideScreen();
    await redrawAfterFullScreenMenuDismiss();
    clearLootMenuArea(23, 4);
    const gold = containedGoldObject(container);
    const amount = gold?.quan || 0;
    display.putstr(41, 0, 'Take out what?', NO_COLOR, ATR_INVERSE);
    if (amount > 0) {
        display.putstr(34, 2, '┌───── ', NO_COLOR, 0);
        display.putstr(41, 2, 'Coins', NO_COLOR, ATR_INVERSE);
        display.putstr(34, 3, '│', NO_COLOR, 0);
        display.putstr(35, 3, '·····', CLR_BLACK, 0);
        display.putstr(41, 3, `$ ${selectedGold ? '+' : '-'} ${amount} gold pieces`, NO_COLOR, 0);
        display.putstr(34, 4, '│', NO_COLOR, 0);
        display.putstr(35, 4, '·····', CLR_BLACK, 0);
        display.putstr(41, 4, '(end)', NO_COLOR, 0);
    } else {
        display.putstr(41, 2, '(end)', NO_COLOR, 0);
    }
    game._loot_action_menu = null;
    game._loot_type_menu = null;
    game._loot_putin_menu = null;
    game._loot_takeout_menu = {
        container,
        selectedGold,
        held: opts.held ?? (game.inventory || []).includes(container),
    };
    showOverride(serialize_terminal_grid(display), amount > 0 ? [47, 4] : [47, 2]);
}

function takeGoldOutOfContainer(container) {
    const gold = containedGoldObject(container);
    const amount = gold?.quan || 0;
    if (amount <= 0) return '';
    const contents = container.cobj || container.contents || [];
    const idx = contents.indexOf(gold);
    if (idx >= 0) contents.splice(idx, 1);
    if (container.cobj) container.cobj = contents;
    else container.contents = contents;

    game.inventory = game.inventory || [];
    game._goldCount = (game._goldCount || 0) + amount;
    const carried = game.inventory.find((obj) => obj?.otyp === GOLD_PIECE);
    if (carried) {
        carried.invlet = '$';
        carried.quan = game._goldCount;
    } else {
        game.inventory.unshift({
            otyp: GOLD_PIECE,
            oclass: COIN_CLASS,
            quan: game._goldCount,
            invlet: '$',
        });
    }
    container.cknown = true;
    return `$ - ${amount} gold ${amount === 1 ? 'piece' : 'pieces'}.`;
}

async function handleLootTakeOutMenuKey(ch) {
    const menu = game._loot_takeout_menu;
    if (!menu) return false;
    game._override_prev = null;
    if (ch === '$') {
        menu.selectedGold = !menu.selectedGold;
        await showLootTakeOutObjectMenu(menu.container, menu.selectedGold, { held: menu.held });
        game.context.move = 0;
        return true;
    }
    if (ch === '\r' || ch === '\n') {
        const selected = !!menu.selectedGold;
        const container = menu.container;
        game._loot_takeout_menu = null;
        clearOverrideScreen();
        clear_pending_message();
        if (selected) {
            await redrawAfterFullScreenMenuDismiss();
            await pline(takeGoldOutOfContainer(container));
            game.context.move = 1;
        } else {
            await dismissLootMenu(false);
        }
        return true;
    }
    if (ch === '\x1b' || ch === 'q' || ch === 'Q') {
        await dismissLootMenu(false);
        return true;
    }
    await showLootTakeOutObjectMenu(menu.container, menu.selectedGold, { held: menu.held });
    game.context.move = 0;
    return true;
}

async function handleLootTypeMenuKey(ch) {
    const menu = game._loot_type_menu;
    if (!menu) return false;
    game._override_prev = null;
    if (ch === 'A') {
        menu.selectedAuto = !menu.selectedAuto;
        showLootTypeMenu(menu.container, menu.selectedAuto, menu);
        game.context.move = 0;
        return true;
    }
    if (menu.putIn && ch === '$') {
        menu.selectedCoins = !menu.selectedCoins;
        showLootTypeMenu(menu.container, menu.selectedAuto, menu);
        game.context.move = 0;
        return true;
    }
    if (menu.putIn && (ch === '\r' || ch === '\n')) {
        await showLootPutInGoldMenu(menu.container, false, { held: menu.held });
        game.context.move = 0;
        return true;
    }
    if (!menu.putIn && (ch === '\r' || ch === '\n')) {
        await showLootTakeOutObjectMenu(menu.container, false, { held: menu.held });
        game.context.move = 0;
        return true;
    }
    if (ch === '\x1b' || ch === 'q' || ch === 'Q') {
        await dismissLootMenu();
        return true;
    }
    showLootTypeMenu(menu.container, menu.selectedAuto, menu);
    game.context.move = 0;
    return true;
}

async function showLootPutInGoldMenu(container, selected = false, opts = {}) {
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    clearOverrideScreen();
    await redrawAfterFullScreenMenuDismiss();
    clearLootMenuArea(23, 4);
    const gold = game._goldCount || 0;
    display.putstr(41, 0, 'Put in what?', NO_COLOR, ATR_INVERSE);
    display.putstr(34, 2, '┌───── ', NO_COLOR, 0);
    display.putstr(41, 2, 'Coins', NO_COLOR, ATR_INVERSE);
    display.putstr(34, 3, '│', NO_COLOR, 0);
    display.putstr(35, 3, '·····', CLR_BLACK, 0);
    display.putstr(41, 3, `$ ${selected ? '+' : '-'} ${gold} gold pieces`, NO_COLOR, 0);
    display.putstr(34, 4, '│', NO_COLOR, 0);
    display.putstr(35, 4, '·····', CLR_BLACK, 0);
    display.putstr(41, 4, '(end)', NO_COLOR, 0);
    game._loot_action_menu = null;
    game._loot_type_menu = null;
    game._loot_putin_menu = {
        container,
        selectedGold: selected,
        held: opts.held ?? (game.inventory || []).includes(container),
    };
    game._loot_takeout_menu = null;
    showOverride(serialize_terminal_grid(display), [47, 4]);
}

function putGoldIntoContainer(container) {
    const amount = game._goldCount || 0;
    if (amount <= 0) return '';
    // C ref: src/pickup.c:use_container().  Any completed put-in action marks
    // the container contents as known for later doname()/inventory output.
    container.cknown = true;
    const inv = game.inventory || [];
    const goldObj = inv.find(obj => obj?.otyp === GOLD_PIECE);
    if (goldObj) {
        const idx = inv.indexOf(goldObj);
        if (idx >= 0) inv.splice(idx, 1);
    }
    game._goldCount = 0;
    container.cobj = container.cobj || [];
    const contained = container.cobj.find(obj => obj?.otyp === GOLD_PIECE);
    if (contained) contained.quan = (contained.quan || 0) + amount;
    else {
        container.cobj.push({
            otyp: GOLD_PIECE,
            oclass: COIN_CLASS,
            quan: amount,
            invlet: '$',
            where: 'contained',
            ocontainer: container,
        });
    }
    return `You put ${amount} gold pieces into the ${baseObjectName(container) || 'container'}.`;
}

async function handleLootPutInMenuKey(ch) {
    const menu = game._loot_putin_menu;
    if (!menu) return false;
    game._override_prev = null;
    if (ch === '$') {
        menu.selectedGold = !menu.selectedGold;
        await showLootPutInGoldMenu(menu.container, menu.selectedGold, { held: menu.held });
        game.context.move = 0;
        return true;
    }
    if (ch === '\r' || ch === '\n') {
        const selected = !!menu.selectedGold;
        const container = menu.container;
        game._loot_putin_menu = null;
        clearOverrideScreen();
        clear_pending_message();
        if (selected) {
            await pline(putGoldIntoContainer(container));
            game.context.move = 1;
        } else {
            await dismissLootMenu(false);
        }
        return true;
    }
    if (ch === '\x1b' || ch === 'q' || ch === 'Q') {
        await dismissLootMenu(false);
        return true;
    }
    await showLootPutInGoldMenu(menu.container, menu.selectedGold, { held: menu.held });
    game.context.move = 0;
    return true;
}

async function doTipCommand() {
    // C ref: pickup.c:dotip().  Floor containers are checked before carried
    // inventory and ask through ynq when there is exactly one.
    const box = containerAt(game.u?.ux, game.u?.uy);
    if (!box) {
        await pline("You don't find anything here to tip.");
        game.context.move = 0;
        return;
    }
    const prompt = `There is ${inventoryObjectName(box)} here, tip it? [ynq] (q)`;
    game._awaiting_tip_confirm = box;
    await showPromptLine(prompt, { trailingInputSpace: true });
    game.context.move = 0;
}

async function beginAnnotatePrompt() {
    // C ref: dungeon.c:dooverview_or_wiz_where()/query_annotation().
    const prompt = 'What do you want to call this dungeon level?';
    game._awaiting_annotation = { text: '' };
    await showPromptLine(prompt, { trailingInputSpace: true });
    game.context.move = 0;
}

async function beginNameInventoryPrompt() {
    // C ref: do_name.c:docallcmd() -> getobj("name", name_ok).
    await showPromptLine(`What do you want to name? [${inventoryLetterRange()} or ?*]`, { trailingInputSpace: true });
    game._awaiting_name_inventory_item = true;
    game.context.move = 0;
}

async function beginNameInventoryObject(obj) {
    const base = baseObjectName(obj);
    const prompt = `What do you want to name this ${base}?`;
    game._awaiting_name_object_text = { obj, prompt, text: '' };
    await showPromptLine(prompt, { trailingInputSpace: true });
    game.context.move = 0;
}

function showHereCommandMenu() {
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    const col = 41;
    const rows = [
        [0, 'What do you want to do?', true],
        [2, 'a - Pick up a broken chest', false],
        [3, 'b - Loot a broken chest', false],
        [4, 'c - Tip a broken chest', false],
        [5, 'd - Inventory', false],
        [6, 'e - Drop items', false],
        [7, 'f - Rest one turn', false],
        [8, 'g - Search around you', false],
        [9, 'h - Look at what is here', false],
        [10, 'i - Cast a spell', false],
        [11, '(end)', false],
    ];
    clearLootMenuArea(col, 11);
    display.putstr(0, 0, ' '.repeat(col), NO_COLOR, 0);
    for (const [row, text, inverse] of rows)
        display.putstr(col, row, text, NO_COLOR, inverse ? ATR_INVERSE : 0);
    game._herecmd_menu = true;
    showOverride(serialize_terminal_grid(display), [col + '(end)'.length + 1, 11]);
    game.context.move = 0;
}

async function dismissHereCommandMenu() {
    game._herecmd_menu = false;
    game._override_prev = null;
    clearOverrideScreen();
    clear_pending_message();
    await redrawAfterFullScreenMenuDismiss();
    game.context.move = 0;
}

function forceableWeapon(obj) {
    if (!obj) return false;
    if (obj.oclass === WEAPON_CLASS) return true;
    if (obj.oclass === ROCK_CLASS) return true;
    return false;
}

function forceLockChance(obj) {
    // C ref: lock.c:doforce() uses objects[uwep->otyp].oc_wldam * 2.
    // Current object instances do not carry full objclass damage data yet.
    if (obj?.otyp === WAR_HAMMER) return 8; // objects.h: war hammer oc_wldam = 4.
    return 8;
}

function forceLockWeaponName(obj) {
    const base = baseObjectName(obj) || 'weapon';
    const oname = C.ONAME(obj);
    return `your ${base}${oname ? ` named ${oname}` : ''}`;
}

async function doForceCommand() {
    // C ref: lock.c:doforce().  Forcing with a suitable wielded weapon costs
    // a turn even when there is no box on the hero's square.
    const weapon = heroWieldedWeapon();
    if (!forceableWeapon(weapon)) {
        await pline(weapon
            ? "You can't force anything with that weapon."
            : "You can't force anything when not wielding a weapon.");
        game.context.move = 0;
        return;
    }
    const box = containerAt(game.u?.ux, game.u?.uy);
    if (!box) {
        await pline('You decide not to force the issue.');
        game.context.move = 1;
        return;
    }
    if (box.olocked && !box.obroken) {
        const prompt = `There is ${inventoryObjectName(box)} here; force its lock? [ynq] (q)`;
        box.lknown = true;
        game._awaiting_force_lock_confirm = { box, weapon };
        await showPromptLine(prompt, { trailingInputSpace: true });
        game.context.move = 0;
        return;
    }
    box.lknown = true;
    await pline(`There is ${inventoryObjectName(box)} here, but its lock is already ${box.obroken ? 'broken' : 'unlocked'}.`);
    game.context.move = 1;
}

function validDirectionKey(ch) {
    return 'hykulnjb<>.'.includes(ch);
}

function directionDelta(ch) {
    return {
        dx: DIR_DX[ch] || 0,
        dy: DIR_DY[ch] || 0,
        dz: ch === '<' ? -1 : ch === '>' ? 1 : 0,
    };
}

async function handleLootDirection(ch) {
    // C refs: pickup.c:doloot_core(), cmd.c:get_adjacent_loc().
    game._awaiting_loot_direction = false;
    clear_pending_message();
    if (!validDirectionKey(ch)) {
        game.context.move = 0;
        if (ch === '\x1b' || ch === 'q') {
            await pline('Never mind.');
        } else if (game.iflags?.cmdassist !== false) {
            game._direction_help_screen = INVALID_DIRECTION_HELP_SCREEN;
            game._direction_help_after_more_message = 'Never mind.';
            showSerializedOverride(INVALID_DIRECTION_HELP_SCREEN, [8, 23]);
            queue_more_prompt();
        } else {
            await pline('Never mind.');
        }
        return;
    }

    const { dx, dy, dz } = directionDelta(ch);
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    const x = ux + dx;
    const y = uy + dy;
    const underfoot = x === ux && y === uy;
    if (dz < 0) {
        await pline("You don't find anything to loot on the ceiling.");
    } else if (underfoot && containerAt(x, y)) {
        await doLootCommand();
    } else if (!underfoot && containerAt(x, y)) {
        await pline('You have to be at a container to loot it.');
    } else {
        await pline(`You don't find anything ${underfoot ? 'here' : 'there'} to loot.`);
    }
    game.context.move = 0;
}

function extractFloorObject(obj) {
    const idx = game.level?.objects?.indexOf(obj) ?? -1;
    if (idx >= 0) game.level.objects.splice(idx, 1);
    if (typeof obj?.ox === 'number' && typeof obj?.oy === 'number') newsym(obj.ox, obj.oy);
    obj.ox = 0;
    obj.oy = 0;
}

function pickupGoldObject(obj) {
    const picked = obj?.quan || 1;
    const previousGold = game._goldCount || 0;
    extractFloorObject(obj);
    game._goldCount = previousGold + picked;
    let carried = (game.inventory || []).find((item) => item?.otyp === GOLD_PIECE);
    if (carried) {
        carried.quan = game._goldCount;
    } else {
        carried = obj;
        carried.invlet = '$';
        carried.quan = game._goldCount;
        game.inventory = game.inventory || [];
        game.inventory.push(carried);
    }
    const total = previousGold > 0 ? ` (${game._goldCount} in total)` : '';
    return `$ - ${picked} gold ${picked === 1 ? 'piece' : 'pieces'}${total}.`;
}

function pickupInventoryObject(obj) {
    extractFloorObject(obj);
    const merged = merge_inventory_object(obj);
    const carried = merged || obj;
    if (!merged) {
        if (!obj.invlet) assignInventoryLetter(obj);
        game.inventory.push(obj);
    }
    return carried;
}

const OBJECT_CLASS_SYMBOLS = {
    1: ']',
    2: ')',
    3: '[',
    4: '=',
    5: '"',
    6: '(',
    7: '%',
    8: '!',
    9: '?',
    10: '+',
    11: '/',
    12: '$',
    13: '*',
    14: '`',
    15: '0',
    16: '_',
};

function autopickupObjectClassSymbol(obj) {
    return OBJECT_CLASS_SYMBOLS[obj?.oclass] || obj?.ch || '';
}

function autopickupWantsObject(obj) {
    // C ref: src/pickup.c:autopick_testobj().  Exceptions, shop-cost
    // rejection, and lost-object overrides remain broader autopickup debt;
    // pickup_types is the current general filter used by the session.
    if (!game.flags?.pickup || !obj || obj === game.uchain) return false;
    const types = String(game.flags.pickup_types || '');
    return !types || types.includes(autopickupObjectClassSymbol(obj));
}

function collectAutopickupHereAfterMoveMessages() {
    // C refs: src/hack.c:spoteffects(), src/pickup.c:pickup().
    if (!game.flags?.pickup || game.context?.nopick || heroCannotTakeObjects())
        return [];
    const picks = floorObjectsAtHero().filter(autopickupWantsObject);
    if (!picks.length) return [];
    const lines = [];
    for (const obj of picks.slice()) {
        if (!(game.level?.objects || []).includes(obj)) continue;
        if (obj.otyp === GOLD_PIECE) {
            lines.push(pickupGoldObject(obj));
        } else {
            const carried = pickupInventoryObject(obj);
            const prefix = pickupTroublePrefix();
            lines.push(`${prefix ? `${prefix} lifting ` : ''}${carried.invlet} - ${inventoryObjectName(carried)}.`);
        }
    }
    return lines;
}

async function showAutopickupMessages(lines) {
    let printed = false;
    for (const line of lines || []) {
        if (printed) await append_pline(line);
        else await pline(line);
        printed = true;
    }
    return printed;
}

async function autopickupHereAfterMove() {
    return showAutopickupMessages(collectAutopickupHereAfterMoveMessages());
}

function shopPickupHonorific() {
    // C ref: shk.c:append_honorific().  Non-demigod heroes pick among the
    // first four honorifics using ordinary game RNG.
    const honored = ['good', 'honored', 'most gracious', 'esteemed'];
    let title = honored[rn2(honored.length)];
    const raceName = String(game.urace?.name || game.urace?.adj || game._nhopts?.race || 'human').toLowerCase();
    if (raceName === 'elf' || raceName === 'elven') title += game.flags?.female ? ' hiril' : ' hir';
    else if (raceName !== 'human') title += ' creature';
    else title += game.flags?.female ? ' lady' : ' sir';
    return title;
}

function markShopItemUnpaid(obj, quote) {
    if (!obj || !quote?.price) return;
    recordDiscoveryPriceQuote(obj.otyp, quote.price, true);
    obj.unpaid = true;
    obj.unpaidPrice = quote.price;
    obj.shopPrice = quote.price;
    obj.shopRoom = quote.roomno;
    const eshk = quote.shkp?.mextra?.eshk;
    if (eshk && !obj._bill_recorded) {
        eshk.billct = (eshk.billct || 0) + 1;
        obj._bill_recorded = true;
    }
}

function shopPickupQuoteMessage(obj, quote) {
    const shkp = quote?.shkp;
    const eshk = shkp?.mextra?.eshk;
    let intro = '"For you,';
    if (!shkp?.mpeaceful) {
        intro += ' scum;';
    } else if (!eshk?.surcharge) {
        intro += ` ${shopPickupHonorific()}; only`;
    }
    const name = baseObjectName(obj);
    return `${intro} ${quote.price} ${shopPriceCurrency(quote.price)} for this ${name}."`;
}

function shopPickupQuote(obj) {
    observeObjectForNaming(obj, { observe: true });
    const quote = floorShopPriceQuote(obj);
    if (!quote?.price) return null;
    markShopItemUnpaid(obj, quote);
    return quote;
}

function payMenuObjectName(obj) {
    const copy = { ...obj, unpaid: false, unpaidPrice: 0, shopPrice: 0 };
    return inventoryObjectName(copy, { includeCharges: false });
}

function payMenuEntriesForShopkeeper(shkp) {
    const roomno = shkp?.mextra?.eshk?.shoproom;
    return (game.inventory || [])
        .filter((obj) => obj?.unpaid && (!roomno || obj.shopRoom === roomno))
        .map((obj, idx) => ({
            selector: MENU_SELECTOR_CHARS[idx] || '?',
            obj,
            selected: false,
            price: obj.unpaidPrice || obj.shopPrice || 0,
        }));
}

function renderPayMenu(menu) {
    const display = game.nhDisplay;
    if (!display?.putstr) return false;
    const menuCol = 41;
    const lines = [
        { text: 'Pay for which items?', heading: true },
        { text: '', heading: false },
        ...menu.entries.map((entry) => ({
            text: `${entry.selector} ${entry.selected ? '+' : '-'} ${entry.price} Zm, ${payMenuObjectName(entry.obj)}`,
            heading: false,
        })),
        { text: '(end)', heading: false },
    ];
    for (let row = 0; row < lines.length; row++) {
        display.putstr(0, row, ' '.repeat(COLNO), NO_COLOR, 0);
    }
    for (let row = 0; row < lines.length; row++) {
        const line = lines[row];
        display.putstr(menuCol, row, line.text, NO_COLOR, line.heading ? ATR_INVERSE : 0);
    }
    const lastRow = lines.length - 1;
    const cursorCol = menuCol + '(end)'.length + 1;
    const screen = serialize_terminal_grid(display);
    game._pay_menu_screen = screen;
    showOverride(screen, [cursorCol, lastRow]);
    return true;
}

function shopThankYouMessage(shkp) {
    const eshk = shkp?.mextra?.eshk || {};
    const shopName = shopTypeName(roomForNo(eshk.shoproom)?.rtype);
    return `"Thank you for shopping in ${sSuffix(shkname(shkp))} ${shopName}${!eshk.surcharge ? '!' : '.'}"`;
}

function payGoldToMonster(shkp, amount) {
    const carried = (game.inventory || []).find((obj) => obj?.otyp === GOLD_PIECE);
    const current = game._goldCount || carried?.quan || 0;
    if (current <= 0 || amount <= 0) return;
    let paidId = carried?.o_id;
    if (current > amount) paidId = next_ident();
    game._goldCount = Math.max(0, current - amount);
    if (carried) {
        if (game._goldCount > 0) carried.quan = game._goldCount;
        else removeInventoryObject(carried);
    }
    shkp.inventory = shkp.inventory || [];
    shkp.inventory.push({
        otyp: GOLD_PIECE,
        oclass: COIN_CLASS,
        quan: amount,
        o_id: paidId,
    });
}

async function commitPayMenuSelection(menu) {
    const selected = (menu?.entries || []).filter((entry) => entry.selected);
    const shkp = menu?.shkp;
    game._pay_menu = null;
    game._pay_menu_screen = null;
    await redrawAfterFullScreenMenuDismiss();
    if (!selected.length || !shkp) {
        game.context.move = 0;
        return;
    }

    const entry = selected[0];
    const obj = entry.obj;
    const price = entry.price || 0;
    payGoldToMonster(shkp, price);
    obj.unpaid = false;
    obj.unpaidPrice = 0;
    obj.shopPrice = 0;
    const eshk = shkp.mextra?.eshk;
    if (eshk) eshk.billct = Math.max(0, (eshk.billct || 0) - 1);

    await pline(`You bought ${payMenuObjectName(obj)} for ${price} gold piece${price === 1 ? '' : 's'}.`);
    queue_more_prompt();
    game._more_message_queue = [
        ...(game._more_message_queue || []),
        { text: shopThankYouMessage(shkp), move: true },
    ];
    game.context.move = 0;
}

async function showPayMenu(shkp) {
    await flush_screen(1);
    const menu = { shkp, entries: payMenuEntriesForShopkeeper(shkp) };
    game._pay_menu = menu;
    if (!menu.entries.length || !renderPayMenu(menu)) {
        game._pay_menu = null;
        game._pay_menu_screen = null;
        await pline(`You do not owe ${shkname(shkp)} anything.`);
    }
    game.context.move = 0;
}

async function doPayCommand() {
    game.context.move = 0;
    const shopkeepers = (game.level?.monsters || []).filter((mon) => mon?.isshk);
    const adjacent = shopkeepers.filter((mon) =>
        dist2(mon.mx, mon.my, game.u?.ux ?? 0, game.u?.uy ?? 0) <= 2);
    if (adjacent.length === 1) {
        await finishPayToShopkeeper(adjacent[0]);
        return;
    }
    const seenShopkeepers = shopkeepers.filter(heroCanSpotMonsterForHit);
    const blindTelepathy = !!(game.u?.uprops?.telepat || game.u?.telepat);
    if ((!shopkeepers.length && (!heroIsBlind() || blindTelepathy))
        || (!heroIsBlind() && !seenShopkeepers.length)) {
        await pline('There appears to be no shopkeeper here to receive your payment.');
        return;
    }
    if (!seenShopkeepers.length) {
        await pline("You can't see...");
        return;
    }

    const heroShopRooms = (Array.isArray(game.u?.ushops) && game.u.ushops.length)
        ? game.u.ushops
        : inRoomsAt(game.u?.ux, game.u?.uy).filter(isShopRoomNo);
    let shkp = null;
    for (const roomno of heroShopRooms) {
        const candidate = shopKeeperForRoom(roomno);
        if (candidate && shopkeeperInHisShop(candidate)) {
            shkp = candidate;
            break;
        }
    }
    if (!shkp) {
        await pline('There appears to be no shopkeeper here to receive your payment.');
        return;
    }
    await finishPayToShopkeeper(shkp);
}

async function finishPayToShopkeeper(shkp) {
    const eshk = shkp.mextra?.eshk || {};
    if ((eshk.billct || 0) > 0 || payMenuEntriesForShopkeeper(shkp).length) {
        await showPayMenu(shkp);
        return;
    }
    await pline(`You do not owe ${shkname(shkp)} anything.`);
}

function heavyPickupTrouble(obj) {
    return obj?.otyp === CHAIN_MAIL || obj?.otyp === 158;
}

function pickupTroublePrefix() {
    const enc = game.u?.uencumber || 0;
    if (enc >= C.EXT_ENCUMBER) return 'You have extreme difficulty';
    if (enc >= C.HVY_ENCUMBER) return 'You have much trouble';
    if (enc >= C.MOD_ENCUMBER) return 'You have trouble';
    if (enc >= C.SLT_ENCUMBER) return 'You have a little trouble';
    return '';
}

async function finishShopQuotedPickup(obj) {
    const carried = pickupInventoryObject(obj);
    game.context.move = 1;
    if (!heavyPickupTrouble(carried)) {
        await pline(`${carried.invlet} - ${inventoryObjectName(carried)}.`);
        return;
    }
    if (game.u) game.u.uencumber = Math.max(game.u.uencumber || 0, 1);
    await plineWithMorePrompt(`You have a little trouble lifting ${carried.invlet} - ${inventoryObjectName(carried)}.`);
    game._finish_pickup_turn_after_more = true;
    game.context.move = 0;
}

async function finishHeavyPickup(obj) {
    pickupInventoryObject(obj);
    if (game.u) game.u.uencumber = Math.max(game.u.uencumber || 0, 1);
    game._extra_encumbered_turn_pending = true;
    await pline('Your movements are slowed slightly because of your load.');
}

function deleteTrap(trap) {
    const traps = game.level?.traps;
    const idx = traps?.indexOf(trap) ?? -1;
    if (idx >= 0) traps.splice(idx, 1);
}

function roomNoForBasic(croom) {
    const idx = croom?.roomnoidx ?? game.level?.rooms?.indexOf(croom) ?? -1;
    return idx + C.ROOMOFFSET;
}

function insideRoomBasic(croom, x, y) {
    if (!croom) return false;
    if (croom.irregular) {
        const loc = game.level?.at(x, y);
        return !!loc && !loc.edge && loc.roomno === roomNoForBasic(croom);
    }
    return x >= croom.lx - 1 && x <= croom.hx + 1
        && y >= croom.ly - 1 && y <= croom.hy + 1;
}

function somexBasic(croom) {
    return rn1(croom.hx - croom.lx + 1, croom.lx);
}

function someyBasic(croom) {
    return rn1(croom.hy - croom.ly + 1, croom.ly);
}

function somexyBasic(croom, c) {
    // C ref: src/mkroom.c:somexy().
    let trycnt = 0;
    if (croom.irregular) {
        const roomno = roomNoForBasic(croom);
        while (trycnt++ < 100) {
            c.x = somexBasic(croom);
            c.y = someyBasic(croom);
            const loc = game.level?.at(c.x, c.y);
            if (loc && !loc.edge && loc.roomno === roomno) return true;
        }
        for (c.x = croom.lx; c.x <= croom.hx; c.x++) {
            for (c.y = croom.ly; c.y <= croom.hy; c.y++) {
                const loc = game.level?.at(c.x, c.y);
                if (loc && !loc.edge && loc.roomno === roomno) return true;
            }
        }
        return false;
    }
    if (!croom.nsubrooms) {
        c.x = somexBasic(croom);
        c.y = someyBasic(croom);
        return true;
    }
    while (trycnt++ < 100) {
        c.x = somexBasic(croom);
        c.y = someyBasic(croom);
        const loc = game.level?.at(c.x, c.y);
        if (loc && C.IS_WALL(loc.typ)) continue;
        if ((croom.sbrooms || []).some(subroom => insideRoomBasic(subroom, c.x, c.y)))
            continue;
        return true;
    }
    return false;
}

function occupiedForSomexyspace(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if ((game.level?.traps || []).some(trap => trap.tx === x && trap.ty === y)) return true;
    return !!(C.IS_FURNITURE(loc.typ) || loc.typ === C.LAVAPOOL || C.IS_POOL(loc.typ));
}

function somexyspaceBasic(croom, c) {
    // C ref: src/mkroom.c:somexyspace().
    let trycnt = 0;
    let okay = false;
    do {
        okay = somexyBasic(croom, c) && C.isok(c.x, c.y) && !occupiedForSomexyspace(c.x, c.y);
        if (okay) {
            const typ = game.level?.at(c.x, c.y)?.typ;
            okay = typ === C.ROOM || typ === C.CORR || typ === C.ICE;
        }
    } while (trycnt++ < 100 && !okay);
    return okay;
}

function heroIsHallucinating() {
    return !!(game.u?.uhallucination || game.u?.uprops?.hallucination);
}

function heroSeesInvisible() {
    return !!(game.u?.usee_invisible || game.u?.see_invisible
        || game.u?.See_invisible || game.u?.uprops?.see_invisible);
}

function heroIsInvisible() {
    return !!(game.u?.uinvis || game.u?.Invis || game.u?.uprops?.invisible);
}

function setHeroIntrinsicInvisible(enabled, invisibleFromOtherSource = false) {
    const u = game.u || (game.u = {});
    u.uprops = u.uprops || {};
    u.hinvis = enabled;
    const visibleState = enabled || invisibleFromOtherSource;
    u.uinvis = visibleState;
    u.Invis = visibleState;
    u.uprops.invisible = visibleState;
}

function incrementHeroTimeout(prop, amount) {
    const u = game.u || (game.u = {});
    u.uprops = u.uprops || {};
    u.uprops[prop] = (u.uprops[prop] || 0) + amount;
}

function wakeNearHero(distance) {
    const u = game.u || {};
    for (const mon of game.level?.monsters || []) {
        if (dist2(u.ux, u.uy, mon.mx, mon.my) <= distance) {
            mon.msleeping = 0;
            mon.mcanmove = mon.mcanmove ?? 1;
        }
    }
}

async function toggleMagicTrapInvisibility() {
    // C ref: src/trap.c:domagictrap() fate 11; src/potion.c:self_invis_message().
    const wasInvisible = heroIsInvisible();
    const wasIntrinsic = !!game.u?.hinvis;
    const invisibleFromOtherSource = wasInvisible && !wasIntrinsic;
    const blockedByExistingTopline = !!game._pending_message;
    if (blockedByExistingTopline) {
        await append_pline('You hear a low hum.');
        queue_more_prompt();
        game._monster_turn_paused_for_more = true;
        game._pre_turn_more_waiting = true;
    } else {
        await pline('You hear a low hum.');
    }
    let followup = '';
    if (!wasInvisible) {
        if (!heroIsBlind()) {
            const lead = heroIsHallucinating() ? 'Far out, man!  You' : 'Gee!  All of a sudden, you';
            const body = heroSeesInvisible() ? 'can see right through yourself' : "can't see yourself";
            followup = `${lead} ${body}.`;
        }
    } else if (invisibleFromOtherSource) {
        followup = `You feel a little more ${wasIntrinsic ? 'obvious' : 'hidden'} now.`;
    } else if (!heroIsBlind()) {
        followup = heroSeesInvisible()
            ? "You can't see through yourself anymore."
            : 'You can see yourself again!';
    }
    if (followup) {
        if (blockedByExistingTopline) {
            game._after_more_followup_messages = game._after_more_followup_messages || [];
            game._after_more_followup_messages.push({
                text: followup,
                magicTrapInvis: { enabled: !wasIntrinsic, invisibleFromOtherSource },
                resumeMonsterTurn: true,
                move: true,
            });
        } else {
            await pline(followup);
            setHeroIntrinsicInvisible(!wasIntrinsic, invisibleFromOtherSource);
            newsym(game.u.ux, game.u.uy);
        }
    } else if (blockedByExistingTopline) {
        game._after_more_followup_messages = game._after_more_followup_messages || [];
        game._after_more_followup_messages.push({
            text: '',
            magicTrapInvis: { enabled: !wasIntrinsic, invisibleFromOtherSource },
            resumeMonsterTurn: true,
            move: true,
        });
    } else {
        setHeroIntrinsicInvisible(!wasIntrinsic, invisibleFromOtherSource);
        newsym(game.u.ux, game.u.uy);
    }
}

async function doMagicTrapHero() {
    // C ref: src/trap.c:domagictrap().
    const fate = rnd(20);
    const u = game.u || {};
    if (fate < 10) {
        let cnt = rnd(4);
        if (!u.uprops?.light_induced_blindness_resistance) {
            await pline('You are momentarily blinded by a flash of light!');
            const timeout = rn1(5, 10);
            incrementHeroTimeout('blind', timeout);
            incrementHeroTimeout('blinded', timeout);
            if (!heroIsBlind()) await pline('Your vision clears.');
        } else if (!heroIsBlind()) {
            await pline('You see a flash of light!');
        }
        if (!u.uprops?.deaf) {
            await pline('You hear a deafening roar!');
            incrementHeroTimeout('deaf', rn1(20, 30));
        } else {
            await pline('You feel rankled.');
            incrementHeroTimeout('deaf', rn1(5, 15));
        }
        while (cnt-- > 0) makemon(null, u.ux, u.uy, C.NO_MM_FLAGS);
        wakeNearHero(7 * 7);
        see_monsters();
        return;
    }
    switch (fate) {
    case 10:
        return;
    case 11:
        return toggleMagicTrapInvisibility();
    case 13:
        await pline('A shiver runs up and down your spine!');
        return;
    case 14:
        await pline(heroIsHallucinating()
            ? 'You hear the moon howling at you.'
            : 'You hear distant howling.');
        return;
    case 16:
        await pline('Your pack shakes violently!');
        return;
    case 17:
        await pline(heroIsHallucinating()
            ? 'You smell hamburgers.'
            : 'You smell charred flesh.');
        return;
    case 18:
        await pline('You feel tired.');
        return;
    default:
        return;
    }
}

async function triggerSpotEffectsAtHero() {
    await checkSpecialRoomAfterMove();
    if (await triggerTrapAtHero()) return true;
    return maybeAutopickupBlockedAtHero();
}

async function maybeAutopickupBlockedAtHero() {
    // C refs: src/hack.c:spoteffects(), src/pickup.c:pickup().
    if (!heroCannotTakeObjects()) return false;
    if (!floorObjectsAtHero().length) return false;
    await pline('You are physically incapable of picking anything up.');
    return true;
}

async function triggerTrapAtHero() {
    const u = game.u || {};
    const trap = (game.level?.traps || []).find(t => t.tx === u.ux && t.ty === u.uy);
    if (!trap) return false;
    if (trap.ttyp === C.DART_TRAP) {
        const otmp = mksobj(DART, true, false);
        if (otmp) {
            otmp.quan = 1;
            otmp.opoisoned = false;
            otmp.ox = trap.tx;
            otmp.oy = trap.ty;
        }
        if (!rn2(6) && otmp) otmp.opoisoned = true;
        const damage = rnd(3);
        const dieroll = rnd(20);
        const hitv = 7;
        trap.tseen = true;
        newsym(trap.tx, trap.ty);
        if ((game.u?.uac ?? 10) + hitv > dieroll) {
            if (typeof game.u?.uhp === 'number') game.u.uhp = Math.max(0, game.u.uhp - damage);
            exercise(A_STR, false);
            await pline('A little dart shoots out at you!  You are hit by a little dart.');
        } else {
            if (otmp) {
                place_object(otmp, u.ux, u.uy);
                if (!(game.u?.ublind || game.u?.blind || game.u?.uprops?.blinded)) {
                    otmp.dknown = true;
                    markObjectEncountered(otmp.otyp);
                }
                newsym(u.ux, u.uy);
            }
            const missLine = (game.u?.uac ?? 10) + hitv <= dieroll - 2
                ? 'A little dart misses you.'
                : 'You are almost hit by a little dart.';
            await pline(`A little dart shoots out at you!  ${missLine}`);
        }
        return true;
    }
    if (trap.ttyp === C.RUST_TRAP) {
        // C ref: trap.c:trapeffect_rust_trap().
        trap.tseen = true;
        newsym(trap.tx, trap.ty);
        switch (rn2(5)) {
        case 0:
            await pline('A gush of water hits you on the head!');
            break;
        case 1:
            await pline('A gush of water hits your left arm!');
            break;
        case 2:
            await pline('A gush of water hits your right arm!');
            break;
        default:
            await pline('A gush of water hits you!');
            break;
        }
        return true;
    }
    if (trap.ttyp === C.MAGIC_TRAP) {
        // C ref: src/trap.c:trapeffect_magic_trap().
        trap.tseen = true;
        newsym(trap.tx, trap.ty);
        if (!rn2(30)) {
            deleteTrap(trap);
            newsym(u.ux, u.uy);
            await pline('You are caught in a magical explosion!');
            if (typeof game.u?.uhp === 'number') game.u.uhp = Math.max(0, game.u.uhp - rnd(10));
            await pline('Your body absorbs some of the magical energy!');
            game.u.uenmax = (game.u.uenmax || 0) + 2;
            game.u.uen = game.u.uenmax;
            game.u.uenpeak = Math.max(game.u.uenpeak || 0, game.u.uenmax);
        } else {
            await doMagicTrapHero();
        }
        return true;
    }
    if (trap.ttyp === C.TELEP_TRAP) {
        // C refs: src/trap.c:trapeffect_telep_trap(),
        // src/teleport.c:tele_trap().
        if (game._in_tele_trap) return true;
        trap.tseen = true;
        newsym(trap.tx, trap.ty);
        if (game.level?.flags?.noteleport) {
            await pline('You feel a wrenching sensation.');
            return true;
        }
        game._in_tele_trap = true;
        try {
            if (trap.once) {
                deleteTrap(trap);
                newsym(u.ux, u.uy);
                await vaultTeleBasic({ deferLookHereBehindMore: true });
            } else if (C.isok(trap.teledest?.x, trap.teledest?.y)) {
                await teledsBasic(trap.teledest.x, trap.teledest.y, { deferLookHereBehindMore: true });
            } else {
                await safeTeledsBasic({ deferLookHereBehindMore: true });
            }
        } finally {
            game._in_tele_trap = false;
        }
        return true;
    }
    return false;
}

function roomForNo(roomno) {
    const idx = (roomno ?? 0) - C.ROOMOFFSET;
    return idx >= 0 ? game.level?.rooms?.[idx] : null;
}

function isShopRoomNo(roomno) {
    return (roomForNo(roomno)?.rtype ?? 0) >= C.SHOPBASE;
}

function inRoomsAt(x, y) {
    const loc = game.level?.at(x, y);
    const roomno = loc?.roomno ?? 0;
    if (roomno >= C.ROOMOFFSET) return [roomno];
    return [];
}

function shopKeeperForRoom(roomno) {
    return (game.level?.monsters || []).find((mon) =>
        mon?.isshk && mon.mextra?.eshk?.shoproom === roomno) || null;
}

function shopkeeperInHisShop(mon) {
    const roomno = mon?.mextra?.eshk?.shoproom;
    return !!roomno && inRoomsAt(mon.mx, mon.my).includes(roomno);
}

function shkname(mon) {
    return String(mon?.mextra?.eshk?.shknam || 'shopkeeper').replace(/^[_+\-|]/, '');
}

function sSuffix(name) {
    return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

async function uEnteredShop(roomno) {
    const shkp = shopKeeperForRoom(roomno);
    const eshk = shkp?.mextra?.eshk;
    if (!shkp || !eshk || eshk.following) return;
    const customer = game.plname || 'Hero';
    if ((!eshk.visitct || eshk.customer)
        && String(eshk.customer || '').toLowerCase() !== String(customer).toLowerCase()) {
        eshk.visitct = 0;
        eshk.following = false;
        eshk.customer = customer;
        shkp.mpeaceful = 1;
    }
    const name = shkname(shkp);
    const shopName = shopTypeName(roomForNo(roomno)?.rtype);
    const again = eshk.visitct++ ? ' again' : '';
    const hello = roleGreeting(game.urole, 'shopkeeper');
    // C ref: shk.c:u_entered_shop().  verbalize() wraps shopkeeper speech in
    // quotes; the common peaceful, audible path is enough for current evidence.
    await pline(`"${hello}, ${customer}!  Welcome${again} to ${sSuffix(name)} ${shopName}!"`);
}

function vaultOccupiedBasic(rooms = game.u?.urooms) {
    for (const roomno of rooms || []) {
        const room = roomForNo(roomno);
        if (room?.rtype === C.VAULT) return roomno;
    }
    return 0;
}

function findVaultGuardBasic() {
    return (game.level?.monsters || []).find((mon) =>
        mon?.isgd && mon.mextra?.egd?.gdlevel?.dnum === game.u?.uz?.dnum
            && mon.mextra?.egd?.gdlevel?.dlevel === game.u?.uz?.dlevel
            && (!mon.mx || !mon.mextra?.egd?.gddone)) || null;
}

function findGuardDestBasic(guard = null) {
    // C ref: src/vault.c:find_guard_dest().
    const u = game.u || {};
    radiusLoop:
    for (let dd = 2; dd < ROWNO || dd < COLNO; dd++) {
        for (let y = (u.uy || 0) - dd; y <= (u.uy || 0) + dd; y++) {
            if (y < 0 || y > ROWNO - 1) continue;
            for (let x = (u.ux || 0) - dd; x <= (u.ux || 0) + dd; x++) {
                if (y !== (u.uy || 0) - dd && y !== (u.uy || 0) + dd
                    && x !== (u.ux || 0) - dd) x = (u.ux || 0) + dd;
                if (x < 1 || x > COLNO - 1) continue;
                if (guard && ((x === guard.mx && y === guard.my) || inFakeCorridorBasic(guard, x, y))) continue;
                const loc = game.level?.at(x, y);
                if (loc?.typ !== CORR) continue;
                const lx = x < (u.ux || 0) ? x + 1 : x > (u.ux || 0) ? x - 1 : x;
                const ly = y < (u.uy || 0) ? y + 1 : y > (u.uy || 0) ? y - 1 : y;
                const inner = game.level?.at(lx, ly);
                if (!inner || (inner.typ !== STONE && inner.typ !== CORR)) continue radiusLoop;
                return { x, y };
            }
        }
    }
    return null;
}

function vaultGuardEntryPointBasic(gdx, gdy) {
    // C ref: src/vault.c:invault().
    const u = game.u || {};
    let x = u.ux || 0;
    let y = u.uy || 0;
    const at = (xx, yy) => game.level?.at(xx, yy);
    if (at(x, y)?.typ !== C.ROOM) {
        if (at(x + 1, y)?.typ === C.ROOM) x += 1;
        else if (at(x, y + 1)?.typ === C.ROOM) y += 1;
        else if (at(x - 1, y)?.typ === C.ROOM) x -= 1;
        else if (at(x, y - 1)?.typ === C.ROOM) y -= 1;
        else if (at(x + 1, y + 1)?.typ === C.ROOM) { x += 1; y += 1; }
        else if (at(x - 1, y - 1)?.typ === C.ROOM) { x -= 1; y -= 1; }
        else if (at(x + 1, y - 1)?.typ === C.ROOM) { x += 1; y -= 1; }
        else if (at(x - 1, y + 1)?.typ === C.ROOM) { x -= 1; y += 1; }
    }
    while (at(x, y)?.typ === C.ROOM) {
        const dx = gdx > x ? 1 : gdx < x ? -1 : 0;
        const dy = gdy > y ? 1 : gdy < y ? -1 : 0;
        if (Math.abs(gdx - x) >= Math.abs(gdy - y)) x += dx;
        else y += dy;
    }
    if (C.u_at(x, y)) {
        if (at(x + 1, y)?.typ === C.HWALL || at(x + 1, y)?.typ === C.DOOR) x += 1;
        else if (at(x - 1, y)?.typ === C.HWALL || at(x - 1, y)?.typ === C.DOOR) x -= 1;
        else if (at(x, y + 1)?.typ === C.VWALL || at(x, y + 1)?.typ === C.DOOR) y += 1;
        else if (at(x, y - 1)?.typ === C.VWALL || at(x, y - 1)?.typ === C.DOOR) y -= 1;
        else return null;
    }
    return { x, y };
}

function hiddenGoldInInventoryBasic() {
    const stack = [...(game.inventory || [])];
    let total = 0;
    while (stack.length) {
        const obj = stack.pop();
        if (!obj) continue;
        if (obj.otyp === GOLD_PIECE) total += obj.quan || 0;
        const contents = obj.cobj || obj.contents || [];
        for (const child of contents) stack.push(child);
    }
    return total;
}

function vaultGuardPromptText() {
    return '"Hello stranger, who are you?" -';
}

async function showVaultGuardNamePrompt() {
    game._awaiting_vault_guard_name = game._awaiting_vault_guard_name || { text: '', tries: 5 };
    const state = game._awaiting_vault_guard_name;
    const prompt = vaultGuardPromptText();
    if (state.text) await showPromptLine(`${prompt} ${state.text}`);
    else await showPromptLine(prompt, { trailingInputSpace: true });
    game.context.move = 0;
}

function finalizeVaultGuardCorridorBasic(state, guard) {
    if (!state || !guard) return;
    const egd = guard.mextra?.egd || {};
    egd.dropgoldcnt = state.dropgoldcnt || egd.dropgoldcnt || 0;
    egd.gdx = state.gdx;
    egd.gdy = state.gdy;
    egd.fcbeg = 0;
    egd.fakecorr = [{
        fx: state.x,
        fy: state.y,
        ftyp: state.ftyp,
        flags: state.flags || 0,
    }];
    egd.fcend = 1;
    egd.warncnt = 1;
    guard.mextra = guard.mextra || {};
    guard.mextra.egd = egd;
    const loc = game.level?.at(state.x, state.y);
    if (loc) {
        loc.typ = C.DOOR;
        loc.doormask = C.D_NODOOR;
        loc.flags = C.D_NODOOR;
    }
}

function inFakeCorridorBasic(guard, x, y) {
    const egd = guard?.mextra?.egd;
    if (!egd || !Array.isArray(egd.fakecorr)) return false;
    const begin = egd.fcbeg || 0;
    const end = egd.fcend || 0;
    for (let i = begin; i < end; i++) {
        const fc = egd.fakecorr[i];
        if (fc?.fx === x && fc?.fy === y) return true;
    }
    return false;
}

function guardAdjacentToHeroBasic(guard) {
    return Math.max(
        Math.abs((guard?.mx ?? 0) - (game.u?.ux ?? 0)),
        Math.abs((guard?.my ?? 0) - (game.u?.uy ?? 0)),
    ) <= 1;
}

function vaultRoomAtBasic(x, y) {
    const loc = game.level?.at(x, y);
    return roomForNo(loc?.roomno)?.rtype === C.VAULT;
}

function moveGuardToBasic(guard, x, y) {
    const oldx = guard.mx;
    const oldy = guard.my;
    guard.mx = x;
    guard.my = y;
    if (inFakeCorridorBasic(guard, oldx, oldy) && !C.u_at(oldx, oldy)) {
        const loc = game.level?.at(oldx, oldy);
        if (loc) {
            const glyph = terrain_glyph(loc, oldx, oldy);
            loc.remembered_glyph = { ch: glyph.ch, color: glyph.color, decgfx: glyph.dec };
            show_glyph_cell(oldx, oldy, glyph.ch, glyph.color, glyph.dec);
        }
    } else {
        newsym(oldx, oldy);
    }
    newsym(x, y);
}

function removeVaultGuardBasic(guard) {
    const oldx = guard?.mx || 0;
    const oldy = guard?.my || 0;
    guard.isgd = 0;
    guard.dead = true;
    guard.mx = 0;
    guard.my = 0;
    const monsters = game.level?.monsters || [];
    const idx = monsters.indexOf(guard);
    if (idx >= 0) monsters.splice(idx, 1);
    if (oldx || oldy) newsym(oldx, oldy);
}

function parkVaultGuardBasic(guard) {
    // C ref: src/vault.c:parkguard().  The guard stays attached to its EGD
    // state while the fake corridor is removed, but no longer occupies map
    // space or participates in ordinary monster movement.
    const oldx = guard.mx || 0;
    const oldy = guard.my || 0;
    guard.mx = 0;
    guard.my = 0;
    if (guard.mextra?.egd) {
        guard.mextra.egd.ogx = 0;
        guard.mextra.egd.ogy = 0;
    }
    if (oldx || oldy) newsym(oldx, oldy);
}

function couldSeeFakeCorridorCellBasic(x, y) {
    if (couldsee(x, y)) return true;
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    const ax = Math.abs(x - ux);
    const ay = Math.abs(y - uy);
    const steps = Math.max(ax, ay);
    if (!steps) return true;
    for (let i = 1; i < steps; i++) {
        const cx = Math.round(ux + ((x - ux) * i) / steps);
        const cy = Math.round(uy + ((y - uy) * i) / steps);
        const typ = game.level?.at(cx, cy)?.typ;
        if (typ == null || typ === STONE || typ === SDOOR || typ === SCORR
            || IS_WALL(typ) || IS_OBSTRUCTED(typ)) return false;
    }
    return true;
}

function restFakeCorridorBasic(guard, { forceshow = false, clearBeyondBreach = false } = {}) {
    // C refs: src/vault.c:restfakecorr(), src/vault.c:clear_fcorr().
    const egd = guard?.mextra?.egd;
    if (!egd || !Array.isArray(egd.fakecorr)) return true;
    let effectiveForceshow = forceshow;
    while ((egd.fcbeg || 0) < (egd.fcend || 0)) {
        const fcbeg = egd.fcbeg || 0;
        const fc = egd.fakecorr[fcbeg];
        if (!fc) {
            egd.fcbeg = fcbeg + 1;
            continue;
        }
        if (!effectiveForceshow && egd.gddone
            && !inFakeCorridorBasic(guard, game.u?.ux ?? 0, game.u?.uy ?? 0)) {
            effectiveForceshow = true;
        }
        if (!effectiveForceshow && !clearBeyondBreach && fcbeg > 0) return false;
        if (C.u_at(fc.fx, fc.fy) && !guard?.dead) return false;
        if (!effectiveForceshow && couldSeeFakeCorridorCellBasic(fc.fx, fc.fy)) return false;
        const mon = findMonsterAtBasic(fc.fx, fc.fy);
        if (mon?.isgd) return false;

        const loc = game.level?.at(fc.fx, fc.fy);
        if (loc) {
            loc.typ = fc.ftyp;
            loc.flags = fc.flags || 0;
            loc.doormask = fc.flags || 0;
            const glyph = terrain_glyph(loc, fc.fx, fc.fy);
            loc.remembered_glyph = { ch: glyph.ch, color: glyph.color, decgfx: glyph.dec };
            show_glyph_cell(fc.fx, fc.fy, glyph.ch, glyph.color, glyph.dec);
        }
        egd.fcbeg = fcbeg + 1;
    }

    if ((egd.fcbeg || 0) >= (egd.fcend || 0) && guard?.isgd) {
        removeVaultGuardBasic(guard);
    }
    return true;
}

function revealFakeCorridorNearHeroBasic(guard, options = {}) {
    const egd = guard?.mextra?.egd;
    if (!egd || !Array.isArray(egd.fakecorr)) return;
    restFakeCorridorBasic(guard, options);
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    for (let i = egd.fcbeg || 0; i < (egd.fcend || 0); i++) {
        const fc = egd.fakecorr[i];
        if (!fc) continue;
        if (Math.max(Math.abs(fc.fx - ux), Math.abs(fc.fy - uy)) > 1) continue;
        if (C.u_at(fc.fx, fc.fy)) continue;
        const mon = findMonsterAtBasic(fc.fx, fc.fy);
        if (mon === guard) {
            show_glyph_cell(fc.fx, fc.fy, guard.ch || '@', guard.color ?? CLR_BLUE, false);
            continue;
        }
        const loc = game.level?.at(fc.fx, fc.fy);
        if (!loc) continue;
        const glyph = terrain_glyph(loc, fc.fx, fc.fy);
        show_glyph_cell(fc.fx, fc.fy, glyph.ch, glyph.color, glyph.dec);
        loc.remembered_glyph = { ch: glyph.ch, color: glyph.color, decgfx: glyph.dec };
    }
    const breach = egd.fakecorr[0];
    if (breach && Math.max(Math.abs(breach.fx - ux), Math.abs(breach.fy - uy)) > 1
        && !C.u_at(breach.fx, breach.fy)
        && !findMonsterAtBasic(breach.fx, breach.fy)) {
        const loc = game.level?.at(breach.fx, breach.fy);
        if (loc) {
            const glyph = terrain_glyph({ ...loc, typ: C.VWALL }, breach.fx, breach.fy);
            show_glyph_cell(breach.fx, breach.fy, glyph.ch, glyph.color, glyph.dec);
            loc.remembered_glyph = { ch: glyph.ch, color: glyph.color, decgfx: glyph.dec };
        }
    }
}

function nextVaultGuardStepBasic(guard) {
    const egd = guard?.mextra?.egd;
    if (!egd) return null;
    const x = guard.mx;
    const y = guard.my;
    const gdx = egd.gdx ?? x;
    const gdy = egd.gdy ?? y;
    const dx = gdx > x ? 1 : gdx < x ? -1 : 0;
    let dy = gdy > y ? 1 : gdy < y ? -1 : 0;
    let nx = x + (Math.abs(gdx - x) >= Math.abs(gdy - y) ? dx : 0);
    let ny = y + (Math.abs(gdx - x) >= Math.abs(gdy - y) ? 0 : dy);
    while (C.isok(nx, ny) && game.level?.at(nx, ny)?.typ !== STONE) {
        const ex = nx + nx - x;
        const ey = ny + ny - y;
        if (C.isok(ex, ey) && C.IS_ROOM(game.level?.at(ex, ey)?.typ)) break;
        if (dy && nx !== x) {
            nx = x;
            ny = y + dy;
            continue;
        }
        if (dx && ny !== y) {
            ny = y;
            nx = x + dx;
            dy = 0;
            continue;
        }
        break;
    }
    if (!C.isok(nx, ny)) return null;
    return { x: nx, y: ny };
}

function vaultGuardExitStepBasic(guard, { commit = true } = {}) {
    // C ref: src/vault.c:gd_move().  Once the hero is outside the vault, a
    // peaceful escort first looks orthogonally around itself for a non-vault
    // square where it can leave the temporary corridor and finish cleanup.
    const egd = guard?.mextra?.egd;
    if (!egd || vaultOccupiedBasic()) return null;
    const x = guard.mx;
    const y = guard.my;
    for (let nx = x - 1; nx <= x + 1; nx++) {
        for (let ny = y - 1; ny <= y + 1; ny++) {
            if (!((nx === x || ny === y) && (nx !== x || ny !== y))) continue;
            if (!C.isok(nx, ny)) continue;
            const loc = game.level?.at(nx, ny);
            const typ = loc?.typ;
            if (!loc || C.IS_STWALL(typ) || IS_POOL(typ)) continue;
            if (inFakeCorridorBasic(guard, nx, ny)) continue;
            if (vaultRoomAtBasic(nx, ny)) continue;

            if (!commit) return { x: nx, y: ny };

            egd.gddone = 1;
            if (!C.ACCESSIBLE(typ)) {
                loc.typ = typ === SCORR ? CORR : DOOR;
                if (loc.typ === DOOR) {
                    loc.doormask = D_NODOOR;
                    loc.flags = D_NODOOR;
                } else {
                    loc.flags = 0;
                    loc.doormask = 0;
                }
                newsym(nx, ny);
            }
            return { x: nx, y: ny };
        }
    }
    return null;
}

export function vaultGuardCleanupReadyBasic(guard = findVaultGuardBasic()) {
    const egd = guard?.mextra?.egd;
    if (!guard?.isgd || !guard.mx || !egd || egd.gddone || !guard.mpeaceful) return false;
    if (!guardAdjacentToHeroBasic(guard)) return false;
    return !!vaultGuardExitStepBasic(guard, { commit: false });
}

async function gdMoveCleanupBasic(guard, { oldx = guard?.mx || 0, oldy = guard?.my || 0, disappearMsgSeen = false } = {}) {
    // C ref: src/vault.c:gd_move_cleanup().
    const egd = guard?.mextra?.egd;
    if (!egd) return false;
    const seeGuard = cansee(oldx, oldy) || couldsee(oldx, oldy)
        || couldSeeFakeCorridorCellBasic(oldx, oldy);
    egd.gddone = 1;
    parkVaultGuardBasic(guard);
    restFakeCorridorBasic(guard);
    if (inFakeCorridorBasic(guard, game.u?.ux ?? 0, game.u?.uy ?? 0) || cansee(oldx, oldy)) {
        if (!disappearMsgSeen && seeGuard) {
            await pline('Suddenly, the guard disappears.');
            queue_more_prompt();
            game._monster_turn_paused_for_more = true;
        }
        return true;
    }
    return true;
}

export async function gdMoveBasic(guard = findVaultGuardBasic()) {
    // C ref: src/vault.c:gd_move().  This ports the peaceful escort path:
    // hold position while the hero still carries gold, otherwise extend the
    // temporary corridor one square toward EGD(gdx,gdy) and move the guard.
    if (!guard?.isgd || !guard.mx || !guard.mextra?.egd) return false;
    const egd = guard.mextra.egd;
    if (egd.gddone || !guard.mpeaceful) return false;

    const uInVault = !!vaultOccupiedBasic();
    const uCarryGold = (game._goldCount || 0) > 0 || hiddenGoldInInventoryBasic() > 0;
    if ((egd.fcend || 0) === 1 && uInVault && (uCarryGold || !guardAdjacentToHeroBasic(guard))) {
        if ((egd.warncnt || 0) === 3 && uCarryGold) {
            if (egd.dropgoldcnt) await pline('"I repeat, drop that gold and follow me!"');
            else await pline('"Drop that gold and follow me!"');
            egd.dropgoldcnt = (egd.dropgoldcnt || 0) + 1;
        }
        egd.warncnt = (egd.warncnt || 0) + 1;
        revealFakeCorridorNearHeroBasic(guard, { clearBeyondBreach: true });
        return false;
    }

    if (!guardAdjacentToHeroBasic(guard)) {
        // C refs: src/vault.c:gd_move(), src/apply.c:um_dist().  A distant
        // escort guard does not extend the temporary corridor or move.
        if (rn2(10) === 0 && !game.u?.uprops?.deaf && !game.u?.udeaf
            && !game.u?.uswallow && !game.u?.ustuck) {
            await pline('"Move along!"');
        }
        revealFakeCorridorNearHeroBasic(guard, { clearBeyondBreach: true });
        return false;
    }

    const exitStep = vaultGuardExitStepBasic(guard);
    if (exitStep) {
        moveGuardToBasic(guard, exitStep.x, exitStep.y);
        return await gdMoveCleanupBasic(guard, { oldx: exitStep.x, oldy: exitStep.y });
    }

    const step = nextVaultGuardStepBasic(guard);
    if (!step) {
        revealFakeCorridorNearHeroBasic(guard, { clearBeyondBreach: true });
        return false;
    }
    if (findMonsterAtBasic(step.x, step.y) || C.u_at(step.x, step.y)) {
        revealFakeCorridorNearHeroBasic(guard, { clearBeyondBreach: true });
        return false;
    }
    const loc = game.level?.at(step.x, step.y);
    if (!loc || IS_POOL(loc.typ)) {
        revealFakeCorridorNearHeroBasic(guard, { clearBeyondBreach: true });
        return false;
    }

    const oldTyp = loc.typ;
    const oldFlags = loc.flags || 0;
    if (oldTyp === STONE || oldTyp === SCORR || oldTyp === SDOOR
        || IS_WALL(oldTyp) || IS_OBSTRUCTED(oldTyp) || oldTyp === DOOR) {
        loc.typ = CORR;
        loc.flags = 0;
    }

    if (step.x !== (egd.gdx ?? step.x) || step.y !== (egd.gdy ?? step.y)
        || guard.mx !== (egd.gdx ?? guard.mx) || guard.my !== (egd.gdy ?? guard.my)) {
        egd.fakecorr = egd.fakecorr || [];
        if (!inFakeCorridorBasic(guard, step.x, step.y)) {
            egd.fakecorr[egd.fcend || 0] = {
                fx: step.x,
                fy: step.y,
                ftyp: oldTyp,
                flags: oldFlags,
            };
            egd.fcend = (egd.fcend || 0) + 1;
        }
    }

    egd.ogx = guard.mx;
    egd.ogy = guard.my;
    moveGuardToBasic(guard, step.x, step.y);
    revealFakeCorridorNearHeroBasic(guard, { clearBeyondBreach: true });
    return true;
}

async function finishVaultGuardNamePrompt() {
    const state = game._awaiting_vault_guard_name;
    if (!state) return;
    const guard = findLevelMonsterById(state.guardId) || findVaultGuardBasic();
    const name = String(state.text || '').trim();
    if (!name && state.tries > 1) {
        state.tries--;
        state.text = '';
        await showVaultGuardNamePrompt();
        return;
    }
    game._awaiting_vault_guard_name = null;
    clear_pending_message();
    if (!guard) {
        game.context.move = 0;
        return;
    }
    const lower = name.toLowerCase();
    if (lower === 'croesus' || lower === 'kroisos' || lower === 'creosote') {
        await pline('"Oh, yes, of course.  Sorry to have disturbed you."');
        game.context.move = 0;
        return;
    }
    await pline('"I don\'t know you."');
    const carriedGold = game._goldCount || 0;
    const hiddenGold = hiddenGoldInInventoryBasic();
    if (!carriedGold && !hiddenGold) {
        finalizeVaultGuardCorridorBasic(state, guard);
        await append_pline('"Please follow me."');
        game.context.move = 0;
        return;
    }
    if (!carriedGold) await append_pline('"You have hidden gold."');
    state.dropgoldcnt = (state.dropgoldcnt || 0) + 1;
    finalizeVaultGuardCorridorBasic(state, guard);
    queue_more_prompt();
    game._more_message_queue = [
        ...(game._more_message_queue || []),
        { text: '"Most likely all your gold was stolen from this vault."', more: true },
        { text: '"Please drop that gold and follow me."', more: false },
    ];
    game.context.move = 0;
}

async function handleVaultGuardNameKey(ch) {
    const state = game._awaiting_vault_guard_name;
    if (!state) return false;
    if (ch === '\r' || ch === '\n') {
        await finishVaultGuardNamePrompt();
        return true;
    }
    if (ch === '\x1b') {
        state.text = '';
        await finishVaultGuardNamePrompt();
        return true;
    }
    if (ch === '\b' || ch === '\x7f') {
        state.text = String(state.text || '').slice(0, -1);
        await showVaultGuardNamePrompt();
        return true;
    }
    if (typeof ch === 'string' && ch.length === 1 && ch >= ' ') {
        state.text = `${state.text || ''}${ch}`;
        await showVaultGuardNamePrompt();
        return true;
    }
    game.context.move = 0;
    return true;
}

export async function invaultBasic() {
    // C ref: src/vault.c:invault().
    const vaultroom = vaultOccupiedBasic();
    const u = game.u || {};
    if (!vaultroom) {
        u.uinvault = 0;
        return false;
    }
    u.uinvault = (u.uinvault || 0) + 1;
    if (u.uinvault < C.VAULT_GUARD_TIME
        || (u.uinvault % Math.trunc(C.VAULT_GUARD_TIME / 2)) !== 0)
        return false;
    if (findVaultGuardBasic()) return false;
    const dest = findGuardDestBasic(null);
    if (!dest) return false;
    const entry = vaultGuardEntryPointBasic(dest.x, dest.y);
    if (!entry) return false;
    const loc = game.level?.at(entry.x, entry.y);
    const guard = makemon(monsterPtr('GUARD'), entry.x, entry.y, C.MM_EGD | C.MM_NOMSG);
    if (!guard) return false;
    guard.isgd = 1;
    guard.mpeaceful = 1;
    set_malign_basic(guard);
    guard.mextra = guard.mextra || {};
    guard.mextra.egd = {
        gddone: 0,
        ogx: entry.x,
        ogy: entry.y,
        gdlevel: { ...(u.uz || { dnum: 0, dlevel: 1 }) },
        vroom: vaultroom - C.ROOMOFFSET,
        warncnt: 0,
        dropgoldcnt: 0,
    };
    u.uinvault++;
    const interrogation = {
        guardId: guard.m_id,
        text: '',
        tries: 5,
        x: entry.x,
        y: entry.y,
        gdx: dest.x,
        gdy: dest.y,
        ftyp: loc?.typ ?? C.DOOR,
        flags: loc?.flags || 0,
        dropgoldcnt: 0,
    };
    const spotted = heroCanSpotMonsterForHit(guard) || (!heroIsBlind() && cansee(entry.x, entry.y));
    if (spotted) {
        await pline("Suddenly one of the Vault's guards enters!");
        newsym(guard.mx, guard.my);
    } else {
        await pline('Someone else has entered the Vault.');
        mapInvisibleBasic(guard.mx, guard.my);
    }
    if (!game._more) queue_more_prompt();
    game._awaiting_vault_guard_name = interrogation;
    game._simple_timed_repeats_remaining = 0;
    game._simple_timed_repeat_text = '';
    game._simple_timed_repeat_stop_text = '';
    if (game.context) game.context.multi = 0;
    game._vault_guard_prompt_after_more = true;
    return true;
}

async function checkSpecialRoomAfterMove() {
    const u = game.u || {};
    const rooms = inRoomsAt(u.ux, u.uy);
    const prevShops = Array.isArray(u.ushops) ? u.ushops.slice() : [];
    const shops = rooms.filter(isShopRoomNo);
    const entered = shops.filter((roomno) => !prevShops.includes(roomno));
    u.urooms0 = Array.isArray(u.urooms) ? u.urooms.slice() : [];
    u.ushops0 = prevShops;
    u.urooms = rooms;
    u.ushops = shops;
    u.ushops_entered = entered;
    u.ushops_left = prevShops.filter((roomno) => !shops.includes(roomno));
    if (entered.length) await uEnteredShop(entered[0]);
}

function pickupMenuEntries(objects) {
    const entries = [];
    const weapons = objects.filter(obj => obj.oclass === WEAPON_CLASS);
    const food = objects.filter(obj => obj.oclass === FOOD_CLASS);
    const tools = objects.filter(obj => obj.oclass === TOOL_CLASS);
    const gems = objects.filter(obj => obj.oclass === 13);
    let selector = 97;
    for (const [heading, group] of [
        ['Weapons', weapons],
        ['Comestibles', food],
        ['Tools', tools],
        ['Gems/Stones', gems],
    ]) {
        if (!group.length) continue;
        entries.push({ heading });
        for (const obj of group) {
            entries.push({ selector: String.fromCharCode(selector++), obj, selected: false });
        }
    }
    return entries;
}

function refreshPickupMenu() {
    const menu = game._pickup_menu;
    if (!menu) return;
    const lines = [''];
    for (const entry of menu.entries) {
        if (entry.heading) {
            lines.push(entry.heading);
        } else {
            lines.push(`${entry.selector} ${entry.selected ? '+' : '-'} ${inventoryObjectName(entry.obj)}`);
        }
    }
    lines.push('(end)');
    game._pending_message = `${' '.repeat(41)}Pick up what?`;
    game._floor_list_lines = lines;
    game._floor_list_col = 41;
    game._floor_list_show_more = false;
    game._prompt_cursor = [47, lines.length];
}

async function showPickupMenu(objects) {
    game._pickup_menu = { entries: pickupMenuEntries(objects) };
    refreshPickupMenu();
    game.context.move = 0;
}

async function finishPickupMenu() {
    const menu = game._pickup_menu;
    game._pickup_menu = null;
    game._floor_list_lines = null;
    game._floor_list_show_more = true;
    game._prompt_cursor = null;
    const selected = (menu?.entries || []).filter(entry => entry.selected && entry.obj).map(entry => entry.obj);
    if (!selected.length) {
        game.context.move = 0;
        await pline('Never mind.');
        return;
    }
    game.context.move = 1;
    const messages = [];
    for (const obj of selected) {
        if (obj.otyp === GOLD_PIECE) {
            messages.push(pickupGoldObject(obj));
            continue;
        }
        extractFloorObject(obj);
        const merged = merge_inventory_object(obj);
        const carried = merged || obj;
        if (!merged) {
            assignInventoryLetter(carried);
            game.inventory = game.inventory || [];
            game.inventory.push(carried);
        }
        messages.push(`${carried.invlet} - ${inventoryObjectName(carried)}.`);
    }
    await pline(messages.join('  '));
}

async function handlePickupMenuKey(ch) {
    const menu = game._pickup_menu;
    if (!menu) return false;
    if (ch === '\r' || ch === '\n') {
        await finishPickupMenu();
        return true;
    }
    const entry = menu.entries.find(item => item.selector === ch);
    if (entry) entry.selected = !entry.selected;
    refreshPickupMenu();
    game.context.move = 0;
    return true;
}

function floorCorpseAtHero() {
    const u = game.u || {};
    return (game.level?.objects || []).find((obj) =>
        obj?.otyp === CORPSE && obj.ox === u.ux && obj.oy === u.uy);
}

function floorEdibleAtHero() {
    const u = game.u || {};
    return (game.level?.objects || []).find((obj) =>
        obj?.oclass === FOOD_CLASS && obj.ox === u.ux && obj.oy === u.uy);
}

function floorFoodPrompt(obj, verb = 'eat') {
    const one = (obj?.quan || 1) === 1;
    return `There ${one ? 'is' : 'are'} ${inventoryObjectName(obj)} here; ${verb} ${one ? 'it' : 'one'}? [ynq] (n)`;
}

function corpseEatingReqtime(obj) {
    // C ref: eat.c:eatcorpse(); corpse delay is weight-dependent:
    // victual.reqtime = 3 + (mons[mnum].cwt >> 6).  C ref:
    // eat.c:doeat() then scales that delay by the corpse's remaining
    // nutrition after rotten first-bite accounting.
    const cwt = obj?.corpse_cwt || CORPSE_WEIGHT_BY_MONSTER.get(corpseMonsterPtr(obj)?.name) || 0;
    const reqtime = 3 + (cwt >> 6);
    const fullNutrition = corpseNutrition(obj);
    if (!fullNutrition) return reqtime;
    const oeaten = currentCorpseOeaten(obj, fullNutrition);
    return rounddiv(reqtime * oeaten, fullNutrition);
}

function corpseNutrition(obj) {
    if (Number.isFinite(obj?.corpse_cnutrit)) return obj.corpse_cnutrit;
    return corpseMonsterPtr(obj)?.cnutrit ?? 0;
}

function currentCorpseOeaten(obj, fullNutrition = corpseNutrition(obj)) {
    if (!fullNutrition) return 0;
    let oeaten = Number.isFinite(obj?.oeaten) && obj.oeaten > 0
        ? Math.trunc(obj.oeaten)
        : fullNutrition;
    if (oeaten > fullNutrition) oeaten = fullNutrition;
    if (obj && !Number.isFinite(obj.oeaten)) obj.oeaten = oeaten;
    return oeaten;
}

function consumeCorpseOeaten(obj, amt) {
    const fullNutrition = corpseNutrition(obj);
    if (!obj || !fullNutrition) return 0;
    let oeaten = currentCorpseOeaten(obj, fullNutrition);
    if (amt > 0) oeaten >>= amt;
    else if (oeaten > -amt) oeaten += amt;
    else oeaten = 0;
    if (oeaten === 0) oeaten = 1;
    obj.oeaten = oeaten;
    return oeaten;
}

function rottenFoodResult(obj) {
    // C ref: eat.c:rottenfood().  Only the unconsciousness branch prevents
    // start_eating() from recording the first bite.
    if (!rn2(4)) {
        d(2, 4);
        return {
            interrupts: false,
            message: 'Blecch!  Rotten food!  You feel rather light headed.',
        };
    }
    if (!rn2(4)) {
        d(2, 10);
        return {
            interrupts: false,
            message: 'Blecch!  Rotten food!  Everything suddenly goes dark.',
        };
    }
    if (!rn2(3)) {
        const duration = rnd(10);
        game._nomul_turns_remaining = Math.max(game._nomul_turns_remaining || 0, duration);
        game._nomul_finish_message = 'You are conscious again.';
        game._nomul_continue_behind_more = true;
        game._nomul_after_more_hear_again = true;
        game.u = game.u || {};
        game.u.uprops = game.u.uprops || {};
        game.u.uprops.deaf = (game.u.uprops.deaf || 0) + duration;
        game.u.udeaf = game.u.uprops.deaf;
        return {
            interrupts: true,
            message: 'Blecch!  Rotten food!  The world spins and goes dark.',
        };
    }
    return { interrupts: false, message: 'Blecch!  Rotten food!' };
}

function splitInventoryFoodForEating(obj) {
    // C ref: eat.c:touchfood().  Eating from an inventory stack splits a
    // one-item victual first; unlike scroll useup(), this allocates o_id.
    if (!obj || (obj.quan || 1) <= 1) return obj;
    const oid = next_ident();
    obj.quan--;
    const split = {
        ...obj,
        quan: 1,
        invlet: undefined,
        o_id: oid,
    };
    assignInventoryLetter(split);
    game.inventory = game.inventory || [];
    game.inventory.push(split);
    return split;
}

function removeInventoryInstance(obj) {
    const idx = game.inventory?.indexOf(obj) ?? -1;
    if (idx >= 0) game.inventory.splice(idx, 1);
}

function foodCanRot(obj) {
    if (!obj || obj.otyp === FORTUNE_COOKIE) return false;
    return obj.otyp !== LEMBAS_WAFER && obj.otyp !== CRAM_RATION;
}

function foodIsRottenOnFirstBite(obj) {
    if (!foodCanRot(obj)) return false;
    if (obj.cursed || obj.orotten) return true;
    const age = Number.isFinite(obj.age) ? obj.age : 0;
    const threshold = obj.blessed ? 50 : 30;
    return (game.moves || 0) - age > threshold && !rn2(7);
}

function corpseIsPoisonous(obj) {
    return !!((corpseMonsterPtr(obj)?.mflags1 ?? 0) & M1_POIS);
}

function losePoisonStrength(amount) {
    if (!game.u?.acurr?.a) return;
    game.u.acurr.a[A_STR] = Math.max(3, (game.u.acurr.a[A_STR] ?? 3) - amount);
}

function markObjectEncountered(otyp) {
    if (!Number.isInteger(otyp)) return;
    const order = Array.isArray(game.discoveryOrder)
        ? game.discoveryOrder
        : (game.discoveryOrder = []);
    if (!order.includes(otyp)) order.push(otyp);
    const encountered = game.encounteredObjects || (game.encounteredObjects = new Set());
    if (typeof encountered.add === 'function') encountered.add(otyp);
}

function discoverObjectType(otyp, markEncountered = true) {
    const discovered = game.discoveredObjects || (game.discoveredObjects = new Set());
    if (markEncountered) markObjectEncountered(otyp);
    if (discovered.has(otyp)) return false;
    discovered.add(otyp);
    exercise(A_WIS, true);
    return true;
}

function increaseHeroTimeout(stateKey, amount) {
    if (!game.u) return 0;
    game.u.uprops = game.u.uprops || {};
    const oldTimeout = game.u.uprops[stateKey] || 0;
    const newTimeout = Math.min(C.TIMEOUT, Math.max(0, oldTimeout + amount));
    game.u.uprops[stateKey] = newTimeout;
    if (stateKey === 'confusion') game.u.uconfusion = newTimeout;
    return newTimeout;
}

function heroWearingBlindfoldLike() {
    return (game.inventory || []).some((obj) => (obj?.otyp === BLINDFOLD || obj?.otyp === TOWEL)
        && (obj.worn || ((obj.owornmask || 0) & C.W_TOOL)));
}

async function cureBlindnessFromHealing() {
    if (!game.u) return false;
    const wasBlind = heroIsBlind();
    game.u.ucreamed = 0;
    game.u.uprops = game.u.uprops || {};
    game.u.uprops.blind = 0;
    game.u.uprops.blinded = 0;
    if (!heroWearingBlindfoldLike()) {
        game.u.ublind = false;
        game.u.blind = false;
    }
    if (wasBlind && !heroIsBlind()) {
        await append_pline('You can see again.');
        vision_recalc(2);
        vision_recalc(0);
        return true;
    }
    return false;
}

function healup(nhp, nxtra) {
    game.u = game.u || {};
    if (!nhp) return;
    game.u.uhp = (game.u.uhp || 0) + nhp;
    if (game.u.uhp > (game.u.uhpmax || 0)) {
        game.u.uhpmax = (game.u.uhpmax || 0) + nxtra;
        game.u.uhp = game.u.uhpmax;
    }
}

function finishAfterMorePotionBreathe(pending) {
    if (!pending) return;
    // C ref: potion.c:potionbreathe().  A second potion vapor pline can be
    // blocked behind the bottle-crash --More--; its effect resumes after
    // that More is dismissed.
    if (pending.otyp === POT_SLEEPING) {
        game._nomul_turns_remaining = rnd(5);
        game._nomul_finish_message = 'You can move again.';
        exercise(A_DEX, false);
        exercise(A_CON, true);
    }
}

async function drinkPotion(obj, idx) {
    if (!obj || obj.oclass !== POTION_CLASS) {
        game.context.move = 0;
        await pline('Never mind.');
        return;
    }
    const appearance = getObjectDescription(obj.otyp) || 'ruby';
    if ((obj.quan || 1) > 1) obj.quan--;
    else if (idx >= 0) game.inventory.splice(idx, 1);
    if (obj.otyp === POT_PARALYSIS) {
        // C ref: potion.c:peffect_paralysis().
        const bcsign = obj.blessed ? 1 : (obj.cursed ? -1 : 0);
        game._nomul_turns_remaining = rn2(10) + 25 - (12 * bcsign);
        game._nomul_finish_message = 'You can move again.';
        exercise(A_DEX, false);
        discoverObjectType(obj.otyp);
        await pline('Your feet are frozen to the floor!');
        game.context.move = 1;
        return;
    }
    if (obj.otyp === POT_CONFUSION) {
        // C refs: potion.c:peffect_confusion(), potion.c:dopotion().
        const alreadyConfused = !!(game.u?.uprops?.confusion || game.u?.uconfusion);
        const bcsign = obj.blessed ? 1 : (obj.cursed ? -1 : 0);
        if (!alreadyConfused) {
            if (game.u?.uhallucination || game.u?.uprops?.hallucination)
                await pline('What a trippy feeling!');
            else
                await pline('Huh, What?  Where am I?');
        }
        increaseHeroTimeout('confusion', rn1(7, 16 - (8 * bcsign)));
        if (!alreadyConfused && !(game.u?.uhallucination || game.u?.uprops?.hallucination))
            discoverObjectType(obj.otyp);
        game.context.move = 1;
        return;
    }
    if (obj.otyp === POT_HEALING) {
        // C ref: potion.c:peffect_healing().
        const bcsign = obj.blessed ? 1 : (obj.cursed ? -1 : 0);
        await pline('You feel better.');
        healup(8 + d(4 + (2 * bcsign), 4), obj.cursed ? 0 : 1);
        const sightRestored = !obj.cursed && await cureBlindnessFromHealing();
        exercise(A_CON, true);
        if (sightRestored) obj.dknown = true;
        if (obj.dknown) discoverObjectType(obj.otyp);
        game.context.move = 1;
        return;
    }
    if (obj.otyp === POT_EXTRA_HEALING) {
        // C ref: potion.c:peffect_extra_healing().
        const bcsign = obj.blessed ? 1 : (obj.cursed ? -1 : 0);
        await pline('You feel much better.');
        healup(16 + d(4 + (2 * bcsign), 8), obj.blessed ? 5 : (obj.cursed ? 0 : 2));
        const sightRestored = await cureBlindnessFromHealing();
        exercise(A_CON, true);
        exercise(A_STR, true);
        if (sightRestored) obj.dknown = true;
        if (obj.dknown) discoverObjectType(obj.otyp);
        game.context.move = 1;
        return;
    }
    if (obj.otyp === POT_BOOZE) {
        // C refs: potion.c:peffect_booze(), potion.c:dopotion().
        const bcsign = obj.blessed ? 1 : (obj.cursed ? -1 : 0);
        const prefix = obj.odiluted ? 'watered down ' : '';
        const liquid = (game.u?.uhallucination || game.u?.uprops?.hallucination)
            ? 'dandelion wine'
            : 'liquid fire';
        await pline(`Ooph!  This tastes like ${prefix}${liquid}!`);
        if (!obj.blessed) increaseHeroTimeout('confusion', d(2 + (game.u?.uhs ?? 1), 8));
        if (!obj.odiluted && game.u && typeof game.u.uhp === 'number')
            game.u.uhp = Math.min(game.u.uhpmax || game.u.uhp, game.u.uhp + 1);
        if (game.u) game.u.uhunger = (game.u.uhunger ?? 900) + (10 * (2 + bcsign));
        exercise(A_WIS, false);
        game._drink_call_after_more = appearance;
        queue_more_prompt();
        game.context.move = 0;
        return;
    }
    if (obj.otyp === POT_OIL) {
        // C ref: potion.c:peffect_oil().  Non-lit oil is not beneficial;
        // even the smooth uncursed case abuses Wisdom.
        await pline(obj.cursed ? 'This tastes like castor oil.' : 'That was smooth!');
        exercise(A_WIS, false);
        game.context.move = 1;
        return;
    }
    if (obj.otyp !== POT_FRUIT_JUICE) {
        game.context.move = 1;
        return;
    }
    game._drink_call_after_more = appearance;
    await pline('This tastes like slime mold juice.');
    queue_more_prompt();
    game.context.move = 0;
}

async function drinkSink() {
    // C ref: fountain.c:drinksink().
    const roll = rn2(20);
    if (roll === 0) {
        await pline('You take a sip of very cold water.');
    } else if (roll === 1) {
        await pline('You take a sip of very warm water.');
    } else if (roll === 2) {
        await pline('You take a sip of scalding hot water.');
    } else if (roll === 9) {
        // C refs: fountain.c:drinksink(), eat.c:vomit().
        const hungerLoss = rn1(Math.max(1, 30 - currentAttr(A_CON)), 11);
        if (game.u) game.u.uhunger = (game.u.uhunger ?? 900) - hungerLoss;
        // C ref: src/eat.c:vomit() uses nomul(-2); in this turn loop model
        // the command-owned sink turn plus two helpless tails are stored
        // together, matching the three hidden turn passes in current evidence.
        game._nomul_turns_remaining = 3;
        game._nomul_finish_message = 'You can move again.';
        await pline('Gaggg... this tastes like sewage!  You vomit.');
    } else {
        const temp = rn2(3) ? (rn2(2) ? 'cold' : 'warm') : 'hot';
        await pline(`You take a sip of ${temp} water.`);
    }
    game.context.move = 1;
}

function corpseTasteLine(obj, guilty = false) {
    const corpseName = baseObjectName(obj);
    const vegetarian = corpseIsVegetarian(obj);
    if (!vegetarian) rn2(5);
    const prefix = guilty ? 'You feel guilty.  ' : '';
    return `${prefix}This ${corpseName} tastes ${vegetarian ? 'okay' : 'terrible'}${vegetarian ? '.' : '!'}`;
}

async function beginEatingCorpse(obj) {
    const corpseName = baseObjectName(obj);
    // C ref: src/eat.c:eatcorpse().  Conduct is checked before rotting and
    // first-bite effects; Monks receive violated_vegetarian() guilt.
    const conduct = noteFoodConduct(obj);
    const monkGuilt = conduct.breaksVegetarian && game.urole?.name?.m === 'Monk';
    if (monkGuilt) adjalign(-1);
    rn2(20);
    let firstBiteStarted = false;
    let message = '';
    let blocks = false;
    if (corpseIsPoisonous(obj) && rn2(5)) {
        losePoisonStrength(rnd(4));
        const hpDamage = rnd(15);
        if (typeof game.u?.uhp === 'number') {
            game._latched_status_uhp = game.u.uhp;
            game.u.uhp = Math.max(0, game.u.uhp - hpDamage);
        }
        firstBiteStarted = true;
        message = `${monkGuilt ? 'You feel guilty.  ' : ''}Ecch - that must have been poisonous!`;
        blocks = true;
    } else if (obj?._live_kill_corpse) {
        if (obj.orotten || !rn2(7)) {
            const rotten = rottenFoodResult(obj);
            firstBiteStarted = !rotten.interrupts;
            message = `${monkGuilt ? 'You feel guilty.  ' : ''}${rotten.message}`;
            blocks = rotten.interrupts;
            if (firstBiteStarted) consumeCorpseOeaten(obj, 2);
        } else {
            firstBiteStarted = true;
            message = corpseTasteLine(obj, monkGuilt);
        }
    } else {
        rn2(5);
        const damage = rnd(8);
        if (typeof game.u?.uhp === 'number') game.u.uhp = Math.max(0, game.u.uhp - damage);
        message = `${monkGuilt ? 'You feel guilty.  ' : ''}You feel sick.`;
    }
    if (obj) game._pending_eaten_corpse_remove = obj;
    // C refs: src/eat.c:start_eating()/eatfood(),
    // src/allmain.c:moveloop_core().  C calls the occupation after charging a
    // turn tail and the finishing call also returns through that boundary.  The
    // JS floor-corpse loop preserves the full reqtime evidence; carried corpses
    // use the first-bite credit together with the carried-only pre-finish turn.
    const reqtime = corpseEatingReqtime(obj);
    const carriedCorpse = (game.inventory || []).includes(obj);
    const remainingTurns = Math.max(0, reqtime - (carriedCorpse && firstBiteStarted ? 1 : 0));
    game._occupation_turns_remaining = remainingTurns;
    if (remainingTurns > 0 && carriedCorpse) game._occupation_pre_finish_extra_turn = true;
    game._occupation_pre_finish_catchup = firstBiteStarted;
    game._occupation_finish_message = `You finish eating the ${corpseName}.`;
    game._occupation_pack_finish_message = true;
    game._occupation_finish_removes_eaten_corpse = true;
    await pline(message);
    if (blocks) {
        game._occupation_continue_behind_more = true;
        queue_more_prompt();
    } else if (monkGuilt) {
        game._occupation_continue_behind_more = true;
        queue_more_prompt();
    }
    game.context.move = 1;
    return true;
}

async function handleFloorCorpseEatKey(ch) {
    const obj = game._floor_corpse_eat_obj;
    game._awaiting_floor_corpse_eat = false;
    game._floor_corpse_eat_obj = null;
    game._prompt_cursor = null;
    if (ch !== 'y') {
        game.context.move = 0;
        await pline('Never mind.');
        return true;
    }
    return beginEatingCorpse(obj);
}

async function showEatInventoryPrompt(afterFloorDecline = false) {
    const letters = eatLetters();
    if (letters) {
        game._awaiting_eat_item = true;
        await showPromptLine(`What do you want to eat? [${letters} or ?*] `);
    } else {
        await pline(afterFloorDecline
            ? "You don't have anything else to eat."
            : "You don't have anything to eat.");
    }
}

function consumeOneFloorFood(obj) {
    if (!obj) return;
    if ((obj.quan || 1) > 1) {
        obj.quan--;
        newsym(obj.ox, obj.oy);
    } else {
        extractFloorObject(obj);
    }
}

async function eatSelectedFood(obj, { floor = false } = {}) {
    if ((game.u?.uencumber || 0) >= C.EXT_ENCUMBER) {
        game.context.move = 0;
        await pline("You can't do that while carrying so much stuff.");
        return true;
    }
    if (obj?.oclass !== FOOD_CLASS) {
        game.context.move = 0;
        await pline('You cannot eat that!');
        return true;
    }
    if (!floor) return false;
    game.context.move = 1;
    if (obj.otyp === APPLE) {
        noteFoodConduct(obj);
        consumeOneFloorFood(obj);
        await pline('Delicious!  Must be a Macintosh!');
        return true;
    }
    if (obj.otyp === CARROT) {
        noteFoodConduct(obj);
        consumeOneFloorFood(obj);
        await pline('This carrot is delicious!');
        return true;
    }
    const name = inventoryObjectName(obj);
    noteFoodConduct(obj);
    consumeOneFloorFood(obj);
    await pline(`${name} is delicious!`);
    return true;
}

async function handleFloorFoodEatKey(ch) {
    const obj = game._floor_food_eat_obj;
    if (ch === 'y' || ch === 'Y') {
        game._awaiting_floor_food_eat = false;
        game._floor_food_eat_obj = null;
        game._prompt_cursor = null;
        await eatSelectedFood(obj, { floor: true });
        return true;
    }
    if (ch === 'n' || ch === 'N' || ch === ' ' || ch === '\r' || ch === '\n') {
        game._awaiting_floor_food_eat = false;
        game._floor_food_eat_obj = null;
        game._prompt_cursor = null;
        game.context.move = 0;
        await showEatInventoryPrompt(true);
        return true;
    }
    if (ch === 'q' || ch === 'Q' || ch === '\x1b') {
        game._awaiting_floor_food_eat = false;
        game._floor_food_eat_obj = null;
        game._prompt_cursor = null;
        game.context.move = 0;
        return true;
    }
    game.context.move = 0;
    return true;
}

async function continueQueuedCookieMessage(ch) {
    if (!game._cookie_message_queue?.length || !game._more
        || (ch !== ' ' && ch !== '\r' && ch !== '\n')) {
        return false;
    }
    const next = game._cookie_message_queue.shift();
    await pline(next.text);
    game._more_next_message_row = false;
    if (next.more) {
        queue_more_prompt();
        game.context.move = 0;
    } else {
        game._more = false;
        game.context.move = next.move ? 1 : 0;
    }
    return true;
}

async function handleEatItemKey(ch) {
    game._awaiting_eat_item = false;
    game._prompt_cursor = null;
    if (ch === '\x1b' || ch === ' ' || ch === '\r' || ch === '\n') {
        game.context.move = 0;
        // C ref: invent.c:getobj().  Quit chars only print Never_mind when
        // flags.verbose is enabled; otherwise the old prompt remains on the
        // topline with the cursor back on the map.
        if (game.flags?.verbose !== false) await pline('Never mind.');
        return true;
    }
    const idx = inventoryIndexForLetter(ch);
    const obj = idx >= 0 ? game.inventory?.[idx] : null;
    if (!obj) {
        game.context.move = 0;
        game._eat_invalid_more = true;
        await pline("You don't have that object.");
        queue_more_prompt();
        return true;
    }
    if (await eatSelectedFood(obj)) return true;
    if (obj.oclass !== FOOD_CLASS) {
        // C refs: eat.c:eat_ok(), eat.c:doeat().  Inedible carried objects
        // are selectable by getobj(), then rejected by doeat() without a More.
        game.context.move = 0;
        await pline('You cannot eat that!');
        return true;
    }

    const food = splitInventoryFoodForEating(obj);
    if (food.otyp === CORPSE) return beginEatingCorpse(food);
    if (foodIsRottenOnFirstBite(food)) {
        food.partlyEaten = true;
        const rotten = rottenFoodResult(food);
        if (!rotten.interrupts) noteFoodConduct(food);
        await pline(rotten.message);
        if (rotten.interrupts) queue_more_prompt();
        else removeInventoryInstance(food);
        game.context.move = 1;
        return true;
    }

    if (food.otyp === FORTUNE_COOKIE) {
        noteFoodConduct(food);
        removeInventoryInstance(food);
        const rumor = getRumor(0, false);
        exercise(A_WIS, true);
        game._cookie_message_queue = [
            { text: 'This cookie has a scrap of paper inside.  It reads:', more: true },
            { text: rumor, move: true },
        ];
        game.context.move = 0;
        await pline('This fortune cookie is delicious!');
        game._more_next_message_row = false;
        queue_more_prompt();
        return true;
    }

    game.context.move = 1;
    if (food.otyp === APPLE) {
        noteFoodConduct(food);
        removeInventoryInstance(food);
        await pline('Delicious!  Must be a Macintosh!');
        return true;
    }
    if (food.otyp === CARROT) {
        noteFoodConduct(food);
        removeInventoryInstance(food);
        await pline('This carrot is delicious!');
        return true;
    }
    const name = inventoryObjectName(food);
    noteFoodConduct(food);
    removeInventoryInstance(food);
    await pline(`${name} is delicious!`);
    return true;
}

export function finish_pending_eaten_corpse() {
    const obj = game._pending_eaten_corpse_remove;
    if (!obj) return;
    game._pending_eaten_corpse_remove = null;
    if ((game.inventory || []).includes(obj)) {
        // C refs: eat.c:done_eating(), invent.c:useup().
        removeInventoryInstance(obj);
    } else {
        // C refs: eat.c:done_eating(), invent.c:useupf()->delobj().
        obj_resists(obj, 0, 0);
        extractFloorObject(obj);
    }
}

async function pickupHere() {
    const objects = floorObjectsAtHero();
    if (objects.length > 1) {
        await showPickupMenu(objects);
        return;
    }
    const obj = objects[0] || null;
    if (!obj) {
        game.context.move = 0;
        await pline('There is nothing here to pick up.');
        return;
    }
    game.context.move = 1;
    if (obj.otyp === GOLD_PIECE) {
        await pline(pickupGoldObject(obj));
        return;
    }
    const quote = shopPickupQuote(obj);
    if (quote) {
        game._pending_shop_pickup = obj;
        await plineWithMorePrompt(shopPickupQuoteMessage(obj, quote));
        game.context.move = 0;
        return;
    }
    if (obj.otyp === CHAIN_MAIL) {
        // C ref: pickup.c:lift_object(); raising encumbrance prompts before
        // pickup completion.
        assignInventoryLetter(obj);
        game._pending_heavy_pickup = obj;
        await pline(`You have a little trouble lifting ${obj.invlet} - ${inventoryObjectName(obj)}.`);
        queue_more_prompt();
        game.context.move = 0;
        return;
    }
    const carried = pickupInventoryObject(obj);
    const prefix = pickupTroublePrefix();
    await pline(`${prefix ? `${prefix} lifting ` : ''}${carried.invlet} - ${inventoryObjectName(carried)}.`);
}

function isMovementKey(ch) {
    return 'hjklyubn'.includes(ch);
}

function isGetposMovementKey(ch) {
    return isMovementKey(ch) || !!RUN_KEY[ch];
}

function runDirectionForKey(ch) {
    return RUN_KEY[ch] || null;
}

async function startRunDirection(dir, mode) {
    game.context.run = {
        dx: DIR_DX[dir],
        dy: DIR_DY[dir],
        mode,
        steps: 0,
        allowTurns: true,
    };
    game.context.mv = 1;
    game.context.move = await domove(DIR_DX[dir], DIR_DY[dir]) ? 1 : 0;
    if (!game.context.move || game._run_stop_after_move) {
        game.context.run = null;
        game._run_stop_after_move = false;
    }
}

function hasWoundedLegs() {
    return !!game.u?.uprops?.wounded_legs;
}

function setWoundedLegs(side, timeout) {
    // C ref: do.c:set_wounded_legs().
    const u = game.u || (game.u = {});
    u.uprops = u.uprops || {};
    if (!u.uprops.wounded_legs && Array.isArray(u.acurr?.a)) {
        u.acurr.a[A_DEX] = Math.max(0, (u.acurr.a[A_DEX] ?? 0) - 1);
        u.wounded_legs_dex_penalty = true;
    }
    u.uprops.wounded_legs = Math.max(u.uprops.wounded_legs || 0, timeout || 0);
    u.wounded_legs_side = side || u.wounded_legs_side || 'right';
}

function woundedLegsKickMessage() {
    // C ref: do.c:legs_in_no_shape().
    const side = game.u?.wounded_legs_side || 'right';
    if (side === 'both') return 'Your legs are in no shape for kicking.';
    const prefix = side === 'left' ? 'left ' : side === 'right' ? 'right ' : '';
    return `Your ${prefix}leg is in no shape for kicking.`;
}

const EXTENDED_COMMANDS = [
    { name: 'adjust', min: 2, autocomplete: true },
    { name: 'annotate', min: 2, autocomplete: true },
    { name: 'chat', min: 3, autocomplete: true },
    { name: 'chronicle', min: 3, autocomplete: true },
    { name: 'conduct', min: 2, autocomplete: true },
    { name: 'dip', min: 1, autocomplete: true },
    { name: 'enhance', min: 1, autocomplete: true },
    { name: 'force', min: 1, autocomplete: true },
    { name: 'genocided', min: 1, autocomplete: true },
    { name: 'herecmdmenu', min: 2, autocomplete: true },
    { name: 'invoke', min: 1, autocomplete: true },
    { name: 'jump', min: 1, autocomplete: true },
    { name: 'kick', min: 4, autocomplete: false },
    { name: 'levelchange', min: 2, autocomplete: true, wizard: true },
    { name: 'loot', min: 1, autocomplete: true },
    { name: 'monster', min: 2, autocomplete: true },
    { name: 'name', min: 1, autocomplete: true },
    { name: 'offer', min: 2, autocomplete: true },
    { name: 'options', min: 1, autocomplete: true },
    { name: 'overview', min: 2, autocomplete: true },
    { name: 'polyself', min: 2, autocomplete: true, wizard: true },
    { name: 'pray', min: 1, autocomplete: true },
    { name: 'quit', min: 1, autocomplete: true },
    { name: 'ride', min: 2, autocomplete: true },
    { name: 'rub', min: 2, autocomplete: true },
    { name: 'sit', min: 1, autocomplete: true },
    { name: 'stats', min: 2, autocomplete: true, wizard: true },
    { name: 'terrain', min: 2, autocomplete: true },
    { name: 'tip', min: 3, autocomplete: true },
    { name: 'turn', min: 2, autocomplete: true },
    { name: 'twoweapon', min: 9, autocomplete: false },
    { name: 'untrap', min: 1, autocomplete: true },
    { name: 'vanquished', min: 2, autocomplete: true },
    { name: 'version', min: 2, autocomplete: true },
    { name: 'wipe', min: 3, autocomplete: true },
    { name: 'wizgenesis', min: 10, autocomplete: false, wizard: true },
    { name: 'wizidentify', min: 11, autocomplete: false, wizard: true },
    { name: 'wizintrinsic', min: 4, autocomplete: true, wizard: true },
    { name: 'wizmap', min: 6, autocomplete: false, wizard: true },
    { name: 'wizmondiff', min: 4, autocomplete: true, wizard: true },
    { name: 'wizwhere', min: 4, autocomplete: true, wizard: true },
    { name: 'wizwish', min: 7, autocomplete: false, wizard: true },
];

function heroPrimaryWeapon() {
    return (game.inventory || []).find((obj) => obj?.wielded || ((obj?.owornmask || 0) & C.W_WEP)) || null;
}

function samuraiEnhanceSkillsScreen() {
    // C refs: src/cmd.c extcmdlist[] AUTOCOMPLETE, src/weapon.c:show_skills(),
    // src/u_init.c:Skill_S[].
    const lines = [
        ' \x1b[7mCurrent skills:\x1b[0m',
        '',
        ' \x1b[7mFighting Skills\x1b[0m',
        '   martial arts      [Basic]',
        '   two weapon combat [Unskilled]',
        '   riding            [Unskilled]',
        ' \x1b[7mWeapon Skills\x1b[0m',
        '   dagger            [Unskilled]',
        '   knife             [Unskilled]',
        '   short sword       [Basic]',
        '   broadsword        [Unskilled]',
        '   long sword        [Basic]',
        '   two-handed sword  [Unskilled]',
        '   saber             [Unskilled]',
        '   flail             [Unskilled]',
        '   quarterstaff      [Unskilled]',
        '   polearms          [Unskilled]',
        '   spear             [Unskilled]',
        '   lance             [Unskilled]',
        '   bow               [Basic]',
        '   shuriken          [Unskilled]',
        ' \x1b[7mSpellcasting Skills\x1b[0m',
        '   attack spells     [Unskilled]',
        ' (1 of 2)',
    ];
    return lines.join('\n');
}

function priestEnhanceSkillsScreen() {
    // C refs: src/weapon.c:show_skills(), src/u_init.c:Skill_P[].
    const skill = (name, level = 'Unskilled') => `   ${name.padEnd(19)}[${level}]`;
    const lines = [
        ' \x1b[7mCurrent skills:\x1b[0m',
        '',
        ' \x1b[7mFighting Skills\x1b[0m',
        skill('bare handed combat'),
        ' \x1b[7mWeapon Skills\x1b[0m',
        skill('club'),
        skill('mace', 'Basic'),
        skill('morning star'),
        skill('flail'),
        skill('hammer'),
        skill('quarterstaff'),
        skill('polearms'),
        skill('spear'),
        skill('trident'),
        skill('lance'),
        skill('bow'),
        skill('sling'),
        skill('crossbow'),
        skill('dart'),
        skill('shuriken'),
        skill('boomerang'),
        skill('unicorn horn'),
        ' \x1b[7mSpellcasting Skills\x1b[0m',
        ' (1 of 2)',
    ];
    return lines.join('\n');
}

function knightEnhanceSkillsScreen() {
    // C refs: weapon.c:enhance_weapon_skill()/show_skills(),
    // u_init.c:Skill_K[].  Wizard mode can flag skills as advanceable
    // without practice; current evidence uses the first page.
    const levels = game._enhance_skill_levels || {};
    const longSword = levels.longSword || 'Basic';
    const longSwordLimit = longSword === 'Skilled' ? 180 : 80;
    const polearms = levels.polearms || 'Unskilled';
    const polearmsLimit = polearms === 'Basic' ? 80 : 20;
    const skill = (letter, name, level = 'Unskilled', advance = 0, needed = 20) =>
        ` ${letter} -  ${name.padEnd(18)} ${level.padEnd(12)} ${String(advance).padStart(5)}(${String(needed).padStart(4)})`;
    return [
        ' \x1b[7mPick a skill to advance:\x1b[0m',
        '',
        ' \x1b[7mFighting Skills\x1b[0m',
        skill('a', 'bare handed combat'),
        skill('b', 'two weapon combat'),
        skill('c', 'riding', 'Basic', 20, 80),
        ' \x1b[7mWeapon Skills\x1b[0m',
        skill('d', 'dagger'),
        skill('e', 'knife'),
        skill('f', 'axe'),
        skill('g', 'pick-axe'),
        skill('h', 'short sword'),
        skill('i', 'broadsword'),
        skill('j', 'long sword', longSword, 25, longSwordLimit),
        skill('k', 'two-handed sword'),
        skill('l', 'saber'),
        skill('m', 'club'),
        skill('n', 'mace'),
        skill('o', 'morning star'),
        skill('p', 'flail'),
        skill('q', 'hammer'),
        skill('r', 'polearms', polearms, 0, polearmsLimit),
        skill('s', 'spear'),
        ' (1 of 2)',
    ].join('\n');
}

function showEnhanceSkillsMenu() {
    const role = game.urole?.name?.m;
    const screen = role === 'Knight'
        ? knightEnhanceSkillsScreen()
        : role === 'Samurai'
        ? samuraiEnhanceSkillsScreen()
        : role === 'Priest'
            ? priestEnhanceSkillsScreen()
            : ' \x1b[7mCurrent skills:\x1b[0m\n';
    game._enhance_skills_screen = screen;
    showOverride(screen, [9, 23]);
}

async function beginEnhanceCommand() {
    if (game.wizard || game.flags?.debug) {
        const prompt = 'Advance skills without practice? [yn] (n)';
        await pline(prompt);
        game._prompt_cursor = [prompt.length + 1, 0];
        game._awaiting_enhance_without_practice = true;
        game.context.move = 0;
        return;
    }
    showEnhanceSkillsMenu();
    game.context.move = 0;
}

async function handleEnhanceSelection(ch) {
    if (ch === 'j') {
        game._enhance_skill_levels = { ...(game._enhance_skill_levels || {}), longSword: 'Skilled' };
        clearOverrideScreen();
        await pline('You are now more skilled in long sword.');
        queue_more_prompt();
        game._enhance_resume_after_more = true;
        game.context.move = 0;
        return;
    }
    if (ch === 'r') {
        game._enhance_skill_levels = { ...(game._enhance_skill_levels || {}), polearms: 'Basic' };
        clearOverrideScreen();
        await pline('You are now more skilled in polearms.');
        queue_more_prompt();
        game._enhance_resume_after_more = true;
        game.context.move = 0;
        return;
    }
    game._enhance_skills_screen = null;
    clearOverrideScreen();
    await redrawAfterFullScreenMenuDismiss();
    game.context.move = 0;
}

async function doSitCommand() {
    // C ref: src/sit.c:dosit().
    refreshHeroPreviousPositionForStationaryCommand();
    const corpse = floorCorpseAtHero();
    const loc = game.level?.at(game.u?.ux, game.u?.uy);
    if (corpse) {
        await pline('You sit on the corpse.');
        await append_pline("It's not very comfortable...");
    } else if (loc?.typ === C.FOUNTAIN) {
        await pline('Having fun sitting on the fountain?');
    } else {
        await pline('Having fun sitting on the floor?');
    }
    game.context.move = 1;
}

function dipPromptObjectName(obj) {
    const quan = obj?.quan || 1;
    let base = baseObjectName(obj);
    if (obj?.otyp === CLOVE_OF_GARLIC) base = 'clove of garlic';
    if (quan > 1) {
        if (obj?.otyp === CLOVE_OF_GARLIC) return `${quan} cloves of garlic`;
        return `${quan} ${pluralizeObjectName(base)}`;
    }
    return `${indefiniteArticle(base)} ${base}`;
}

async function showDipInventoryPrompt() {
    const letters = inventoryLetterRange();
    await showPromptLine(`What do you want to dip? [${letters} or ?*]`, { trailingInputSpace: true });
    game._awaiting_dip_item = true;
    game.context.move = 0;
}

async function showDipFountainConfirm(obj) {
    game._awaiting_dip_fountain_confirm = obj;
    await showPromptLine(`Dip ${dipPromptObjectName(obj)} into the fountain? [yn] (n)`, { trailingInputSpace: true });
    game.context.move = 0;
}

function dryupFountainAfterDip() {
    // C ref: src/fountain.c:dryup().
    const loc = game.level?.at(game.u?.ux, game.u?.uy);
    if (loc?.typ !== C.FOUNTAIN) return '';
    if (rn2(3)) return '';
    loc.typ = C.ROOM;
    loc.flags = 0;
    loc.blessedftn = 0;
    if (game.level?.flags)
        game.level.flags.nfountains = Math.max(0, (game.level.flags.nfountains || 0) - 1);
    newsym(game.u.ux, game.u.uy);
    return 'The fountain dries up!';
}

function nextToDoorBasic(x, y) {
    for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
            const loc = game.level?.at(x + dx, y + dy);
            if (!loc) continue;
            if (C.IS_DOOR?.(loc.typ) || loc.typ === SDOOR) return true;
        }
    return false;
}

async function dogushforth(drinking = true) {
    // C refs: src/fountain.c:dogushforth()/gush(),
    // src/vision.c:do_clear_area().  The scan is row-major over the radius-7
    // visible circle; only even-parity, non-hero cells reach the RNG gate.
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    const limits = [7, 7, 7, 6, 6, 5, 4, 2];
    let madePool = 0;
    const minY = Math.max(0, uy - 7);
    const maxY = Math.min(ROWNO - 1, uy + 7);
    for (let y = minY; y <= maxY; y++) {
        const offset = limits[Math.abs(y - uy)] ?? 0;
        const minX = Math.max(1, ux - offset);
        const maxX = Math.min(COLNO - 1, ux + offset);
        for (let x = minX; x <= maxX; x++) {
            if (!couldsee(x, y)) continue;
            if (((x + y) & 1) || (x === ux && y === uy)) continue;
            if (rn2(1 + distminCoords(ux, uy, x, y))) continue;
            const loc = game.level?.at(x, y);
            if (loc?.typ !== C.ROOM) continue;
            if (sobj_at_basic(BOULDER, x, y) || nextToDoorBasic(x, y)) continue;
            if (!madePool++) await pline('Water gushes forth from the overflowing fountain!');
            loc.typ = C.POOL;
            loc.flags = 0;
            loc.roomno = 0;
            loc.edge = 0;
            game.level.traps = (game.level.traps || []).filter((trap) => trap.tx !== x || trap.ty !== y);
            newsym(x, y);
        }
    }
    if (!madePool) await pline(drinking ? 'Your thirst is quenched.' : 'Water sprays all over you.');
}

function rndObjectTypeInRange(first, last) {
    if (last <= first) return first;
    let sum = 0;
    for (let i = first; i <= last; i++) sum += OBJECT_PROB[i] ?? 0;
    if (!sum) return rn1(last - first + 1, first);
    let remaining = rnd(sum);
    for (let i = first; i <= last; i++) {
        remaining -= OBJECT_PROB[i] ?? 0;
        if (remaining <= 0) return i;
    }
    return first;
}

async function findFountainGem(loc) {
    // C ref: fountain.c:dofindgem().
    await pline('You spot a gem in the sparkling waters!');
    const otyp = rndObjectTypeInRange(DILITHIUM_CRYSTAL, LUCKSTONE - 1);
    const obj = mksobj(otyp, false, false);
    place_object(obj, game.u?.ux ?? 0, game.u?.uy ?? 0);
    if (loc) loc.fountainLooted = true;
    newsym(game.u?.ux ?? 0, game.u?.uy ?? 0);
    exercise(A_WIS, true);
}

async function monsterDetectFromFountain() {
    // C refs: src/fountain.c:drinkfountain(), src/detect.c:monster_detect().
    const monsters = (game.level?.monsters || [])
        .filter((mon) => mon && !mon.dead && (mon.mhp ?? 1) > 0
            && !(mon.isgd && !mon.mx));
    if (!monsters.length) return false;
    await cls();
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            loc.disp_ch = ' ';
            loc.disp_color = NO_COLOR;
            loc.disp_decgfx = false;
            loc.disp_attr = 0;
        }
    }
    for (const mon of monsters)
        show_glyph_cell(mon.mx, mon.my, mon.ch || 'm', mon.color ?? NO_COLOR, false);
    if (game.u) show_glyph_cell(game.u.ux, game.u.uy, '@', CLR_WHITE, false);
    await pline('You sense the presence of monsters.');
    game._fountain_detect_stage = 'initial-more';
    game._fountain_detect_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
    game._fountain_detect_screen = serialize_terminal_grid(game.nhDisplay);
    game._fountain_detect_dryup_after_more = false;
    queue_more_prompt();
    return true;
}

async function finishFountainDetectAfterMore() {
    // C ref: src/detect.c:monster_detect() restores the ordinary map before
    // src/fountain.c:drinkfountain() resumes and calls dryup().
    game._fountain_detect_stage = null;
    game._fountain_detect_cursor = null;
    game._fountain_detect_screen = null;
    game._fountain_detect_dryup_after_more = false;
    game._awaiting_monster_detect_browse = false;
    game._more = false;
    game._more_dismissals_remaining = 0;
    clear_pending_message();
    await docrt();
    exercise(A_WIS, true);
    const dryupMsg = dryupFountainAfterDip();
    if (dryupMsg) await pline(dryupMsg);
    game.context.move = 1;
}

async function drinkFountain() {
    // C ref: src/potion.c:dodrink(), src/fountain.c:drinkfountain().
    const loc = game.level?.at(game.u?.ux, game.u?.uy);
    const mgkftn = loc?.blessedftn === 1;
    const fate = rnd(30);
    if (fate < 10) {
        await pline('The cool draught refreshes you.');
        if (game.u) game.u.uhunger = (game.u.uhunger ?? 900) + rnd(10);
        if (mgkftn) {
            game.context.move = 1;
            return;
        }
    } else {
        switch (fate) {
        case 27:
            if (!loc?.fountainLooted) {
                await findFountainGem(loc);
                break;
            }
            await pline('This tepid water is tasteless.');
            break;
        case 30:
            await dogushforth(true);
            break;
        case 20:
            await pline('The water is foul!  You gag and vomit.');
            if (game.u) game.u.uhunger = (game.u.uhunger ?? 900) - rn1(20, 11);
            // C refs: src/fountain.c:drinkfountain(), src/eat.c:vomit().
            // The foul-water/dryup topline blocks before the helpless loop
            // resumes, so only the two post-More vomit turns remain stored.
            game._nomul_turns_remaining = 2;
            game._nomul_finish_message = 'You can move again.';
            break;
        case 21:
            await pline('The water is contaminated!');
            // C ref: src/fountain.c:drinkfountain() -> attrib.c:poison_strdmg().
            // Contaminated fountain water applies strength loss before hit
            // point damage, then exercises Constitution.
            if (game.u?.uprops?.poison_resistance) {
                if (typeof game.u?.uhp === 'number')
                    game.u.uhp = Math.max(0, game.u.uhp - rnd(4));
                break;
            }
            losePoisonStrength(rn1(4, 3));
            if (typeof game.u?.uhp === 'number')
                game.u.uhp = Math.max(0, game.u.uhp - rnd(10));
            exercise(A_CON, false);
            break;
        case 26:
            if (!(await monsterDetectFromFountain())) {
                await pline('The water tastes like nothing.');
                exercise(A_WIS, true);
            }
            if (game._more) return;
            break;
        default:
            await pline('This tepid water is tasteless.');
            break;
        }
    }
    const dryupMsg = dryupFountainAfterDip();
    if (dryupMsg) {
        if (game._pending_message) await append_pline(dryupMsg);
        else await pline(dryupMsg);
    }
    game.context.move = 1;
}

function dipFountainEffect(obj) {
    // C ref: src/fountain.c:dipfountain().  The current evidence reaches
    // ordinary non-Excalibur objects with no water-damage side effect.
    let msg = '';
    switch (rnd(30)) {
    case 16:
        if (obj && obj.oclass !== COIN_CLASS && !obj.cursed) {
            obj.cursed = true;
            obj.blessed = false;
        }
        break;
    case 17:
    case 18:
    case 19:
    case 20:
        if (obj?.cursed) {
            obj.cursed = false;
            obj.blessed = false;
            msg = 'The water glows for a moment.';
        } else {
            msg = 'A feeling of loss comes over you.';
        }
        break;
    default:
        msg = 'Nothing seems to happen.';
        break;
    }
    const dryupMsg = dryupFountainAfterDip();
    return msg || dryupMsg;
}

async function doDipCommand() {
    // C ref: src/potion.c:dodip().
    await showDipInventoryPrompt();
}

async function doOfferCommand() {
    // C ref: src/pray.c:dosacrifice().
    await pline('You are not on an altar.');
    game.context.move = 0;
}

async function doTurnCommand() {
    // C refs: cmd.c:extcmdlist[], pray.c:doturn().  Knights and Priests
    // chant to turn undead, then lose a few helpless turns.
    const roleName = game.urole?.name?.m || '';
    if (roleName !== 'Knight' && roleName !== 'Priest') {
        await pline("You don't know how to turn undead!");
        game.context.move = 0;
        return;
    }
    const conduct = game.u?.uconduct || (game.u ? (game.u.uconduct = {}) : {});
    conduct.gnostic = (conduct.gnostic || 0) + 1;
    const god = prayerGodName();
    await pline(`Calling upon ${god}, you chant an arcane formula.`);
    exercise(A_WIS, true);
    const level = game.u?.ulevel ?? 1;
    game._nomul_turns_remaining = Math.max(1, 5 - Math.trunc((level - 1) / 6));
    game._nomul_finish_message = 'You can move again.';
    game.context.move = 1;
}

function overviewLevelStates() {
    const states = new Map();
    for (const [key, state] of game._saved_levels || []) {
        if (state?.level) states.set(key, state);
    }
    if (game.u?.uz && game.level) {
        const key = levelStateKey(game.u.uz);
        const saved = states.get(key) || {};
        states.set(key, {
            ...saved,
            level: game.level,
            stairs: game.stairs || saved.stairs || null,
            lastSpecialProtofile: game._last_special_protofile || saved.lastSpecialProtofile || null,
        });
    }
    return states;
}

function overviewRooms(level) {
    const rooms = [];
    const visit = (room) => {
        if (!room || (room.hx ?? -1) < 0) return;
        rooms.push(room);
        for (const subroom of room.sbrooms || []) visit(subroom);
    };
    for (const room of level?.rooms || []) visit(room);
    return rooms;
}

function overviewSpecialProto(uz, state) {
    // C ref: dungeon.c:print_mapseen() calls Is_special(&mptr->lev); it uses
    // the dungeon topology entry, not the most recent loaded protofile variant.
    const special = game.specialLevels?.find((lev) => sameLevel(lev?.dlevel, uz));
    const proto = special?.proto || null;
    return proto ? String(proto).replace(/-\d+$/, '') : '';
}

function overviewArticle(noun) {
    const word = String(noun || '').trim();
    if (!word) return 'a';
    const lower = word.toLowerCase();
    if (lower.startsWith('used ') || lower.startsWith('one ')) return 'a';
    return /^[aeiou]/.test(lower) ? 'an' : 'a';
}

function overviewSeenString(count, noun) {
    const n = Math.max(0, Math.min(3, count || 0));
    if (!n) return `no ${noun}`;
    if (n === 1) return `${overviewArticle(noun)} ${noun}`;
    return `${n === 2 ? 'some' : 'many'} ${noun}s`;
}

function overviewRoomSeen(level, room) {
    const roomno = (room?.roomnoidx ?? level?.rooms?.indexOf(room) ?? -1) + C.ROOMOFFSET;
    if (roomno < C.ROOMOFFSET) return false;
    for (const row of level?.locations || []) {
        for (const loc of row || []) {
            if (loc?.roomno === roomno && loc.remembered_glyph) return true;
        }
    }
    return false;
}

function overviewTerrainCount(level, typ, { rememberedOnly = false } = {}) {
    let count = 0;
    for (const row of level?.locations || []) {
        for (const loc of row || []) {
            if (rememberedOnly && !loc?.remembered_glyph) continue;
            if (loc?.typ === typ) count++;
        }
    }
    return count;
}

function overviewFeatureLine(uz, state) {
    // C refs: dungeon.c:recalc_mapseen(), dungeon.c:print_mapseen(),
    // dungeon.c:seen_string().  Current-level features are recalculated from
    // remembered terrain, not from raw level-generation counts.
    const current = sameLevel(uz, game.u?.uz);
    const level = state?.level;
    const parts = [];
    const shops = overviewRooms(level).filter((room) =>
        (room.rtype ?? 0) >= C.SHOPBASE && (!current || overviewRoomSeen(level, room)));
    if (shops.length > 1) {
        parts.push(overviewSeenString(shops.length, 'shop'));
    } else if (shops.length === 1) {
        const name = shopTypeName(shops[0].rtype);
        parts.push(`${overviewArticle(name)} ${name}`);
    }
    const nfountains = current
        ? Math.min(3, overviewTerrainCount(level, C.FOUNTAIN, { rememberedOnly: true }))
        : Math.min(3, level?.flags?.nfountains ?? overviewTerrainCount(level, C.FOUNTAIN));
    if (nfountains) parts.push(overviewSeenString(nfountains, 'fountain'));
    const ntrees = current
        ? Math.min(3, overviewTerrainCount(level, C.TREE, { rememberedOnly: true }))
        : Math.min(3, level?.flags?.ntrees ?? overviewTerrainCount(level, C.TREE));
    if (ntrees) parts.push(overviewSeenString(ntrees, 'tree'));
    if (!parts.length) return '';
    const line = parts.join(', ');
    return `${line.charAt(0).toUpperCase()}${line.slice(1)}.`;
}

function overviewBranchesFrom(uz, state) {
    return (game.branches || []).filter((br) => {
        if (br?.type !== 'stair' || !sameLevel(br.end1, uz)) return false;
        for (let stway = state?.stairs || null; stway; stway = stway.next) {
            if (stway?.isbranch
                && stway.u_traversed
                && !!stway.up === !!br.end1_up
                && sameLevel(stway.tolev, br.end2)) return true;
        }
        return false;
    });
}

function overviewBranchLine(branch) {
    // C refs: dungeon.c:br_string2(), dungeon.c:print_mapseen().
    const destLevel = branch?.end2;
    const dest = game.dungeons?.[destLevel?.dnum]?.dname || 'unknown';
    const up = !!branch?.end1_up;
    const prefix = up ? 'Stairs up' : 'Stairs down';
    let extra = '';
    if (up && destLevel && !C.In_endgame?.(destLevel))
        extra = `, level ${displayDepth(destLevel)}`;
    return `${prefix} to ${dest}${extra}.`;
}

function overviewCustomAnnotation(level) {
    return level?.annotation || level?.customAnnotation || '';
}

function overviewDlevelFromKey(key) {
    const [dnum, dlevel] = String(key).split(':').map((n) => Number(n));
    if (!Number.isFinite(dnum) || !Number.isFinite(dlevel)) return null;
    return { dnum, dlevel };
}

function overviewEntries(states) {
    const entries = [];
    for (const [key, state] of states) {
        const uz = overviewDlevelFromKey(key);
        if (uz && state?.level) entries.push({ uz, state });
    }
    entries.sort((a, b) => (a.uz.dnum - b.uz.dnum) || (a.uz.dlevel - b.uz.dlevel));
    return entries;
}

function overviewMaxReached(entries) {
    const max = new Map();
    for (const entry of entries) {
        const dnum = entry.uz.dnum;
        max.set(dnum, Math.max(max.get(dnum) || 0, entry.uz.dlevel));
    }
    return max;
}

function overviewEarlyMainFeatureLimit() {
    const levels = (game.branches || [])
        .filter((br) => br?.end1?.dnum === 0 && br.type === 'stair')
        .map((br) => br.end1.dlevel)
        .filter((dlevel) => Number.isFinite(dlevel) && dlevel > 1);
    return levels.length ? Math.min(...levels) : 1;
}

function overviewIsInteresting(entry, maxReached, earlyMainLimit) {
    // C ref: dungeon.c:interest_mapseen().  JS does not yet keep mapseen, so
    // use cached level state as an approximation of current, annotated,
    // branch-bearing, feature-bearing early main levels, and branch frontiers.
    const { uz, state } = entry;
    if (sameLevel(uz, game.u?.uz)) return true;
    if (overviewCustomAnnotation(state.level)) return true;
    if (overviewBranchesFrom(uz, state).length) return true;
    if ((maxReached.get(uz.dnum) || 0) === uz.dlevel) return true;
    if (uz.dnum === 0 && uz.dlevel <= earlyMainLimit && overviewFeatureLine(uz, state)) return true;
    if (state.level?.flags?.is_maze_lev && overviewFeatureLine(uz, state)) return true;
    return false;
}

function overviewDungeonEndDepth(dnum, group, maxReached) {
    const maxDlevel = Math.max(
        maxReached.get(dnum) || 1,
        ...group.map((entry) => entry.uz.dlevel),
    );
    return displayDepth({ dnum, dlevel: maxDlevel });
}

function overviewDungeonHeader(dnum, group, maxReached) {
    const dungeon = game.dungeons?.[dnum] || {};
    const name = dungeon.dname || `Dungeon ${dnum}`;
    const start = dungeon.depth_start || 1;
    const end = overviewDungeonEndDepth(dnum, group, maxReached);
    if (end === start) return `${name}:`;
    return `${name}: levels ${start} to ${end}`;
}

function showOverviewScreen() {
    // C refs: src/dungeon.c:show_overview(), print_mapseen().
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    const states = overviewLevelStates();
    const allEntries = overviewEntries(states);
    const maxReached = overviewMaxReached(allEntries);
    const earlyMainLimit = overviewEarlyMainFeatureLimit();
    const interesting = allEntries.filter((entry) =>
        overviewIsInteresting(entry, maxReached, earlyMainLimit));
    const byDungeon = new Map();
    for (const entry of interesting) {
        const group = byDungeon.get(entry.uz.dnum) || [];
        group.push(entry);
        byDungeon.set(entry.uz.dnum, group);
    }
    const lines = [];
    for (const [dnum, group] of [...byDungeon.entries()].sort((a, b) => a[0] - b[0])) {
        lines.push({ text: overviewDungeonHeader(dnum, group, maxReached), heading: true });
        for (const entry of group) {
            const { uz, state } = entry;
            const depth = displayDepth(uz);
            const custom = overviewCustomAnnotation(state.level);
            const special = overviewSpecialProto(uz, state);
            let text = `Level ${depth}:`;
            if (special) text += ` [${special}]`;
            if (custom) text += ` "${custom}"`;
            if (sameLevel(uz, game.u?.uz)) text += ' <- You are here.';
            lines.push({ text, heading: false, indent: 3 });
            const feature = overviewFeatureLine(uz, state);
            if (feature) lines.push({ text: feature, heading: false, indent: 6 });
            for (const branch of overviewBranchesFrom(uz, state)) {
                lines.push({ text: overviewBranchLine(branch), heading: false, indent: 6 });
            }
        }
    }
    lines.push({ text: '(end)', heading: false });
    const maxLen = Math.max(0, ...lines.map((line) => line.text.length));
    const maxDisplayLen = Math.max(0, ...lines.map((line) => line.text.length + (line.indent || 0)));
    const gutter = maxDisplayLen > maxLen ? 2 : 3;
    const menuCol = Math.max(1, Math.min(COLNO - 1, COLNO - maxDisplayLen - gutter));
    display.putstr(0, 0, ' '.repeat(COLNO), NO_COLOR, 0);
    const clearCol = Math.max(0, menuCol - 1);
    for (let row = 0; row < lines.length; row++) {
        display.putstr(clearCol, row, ' '.repeat(COLNO - clearCol), NO_COLOR, 0);
    }
    for (let row = 0; row < lines.length; row++) {
        const line = lines[row];
        display.putstr(menuCol + (line.indent || 0), row, line.text, NO_COLOR, line.heading ? ATR_INVERSE : 0);
    }
    const screen = serialize_terminal_grid(display);
    game._overview_screen = screen;
    showOverride(screen, [menuCol + '(end)'.length + 1, lines.length - 1]);
    game.context.move = 0;
}

function timesText(n) {
    return `${n} time${n === 1 ? '' : 's'}`;
}

function conductGenocideCount() {
    if (Array.isArray(game.genocidedMonsters)) return game.genocidedMonsters.length;
    if (game.genocidedMonsters instanceof Set) return game.genocidedMonsters.size;
    return game._genocide_count || 0;
}

function rankLevelForAchievement(absidx) {
    const rank = absidx - (C.ACH_RNK1 - 1);
    if (rank < 1) return 1;
    if (rank < 2) return 3;
    if (rank < 8) return (rank * 4) - 2;
    return 30;
}

function achievementConductLine(achidx) {
    const absidx = Math.abs(achidx);
    switch (absidx) {
    case C.ACH_MINE:
        return ' You have entered the Gnomish Mines.';
    case C.ACH_TOWN:
        return ' You have entered Minetown.';
    case C.ACH_SHOP:
        return ' You have entered a shop.';
    case C.ACH_TMPL:
        return ' You have entered a temple.';
    case C.ACH_ORCL:
        return ' You have consulted the Oracle of Delphi.';
    case C.ACH_NOVL:
        return ' You have read from a Discworld novel.';
    case C.ACH_SOKO:
        return ' You have entered Sokoban.';
    case C.ACH_BGRM:
        return ' You have entered the Big Room.';
    case C.ACH_MEDU:
        return ' You have defeated Medusa.';
    case C.ACH_HELL:
        return ' You have entered Gehennom.';
    default:
        if (absidx >= C.ACH_RNK1 && absidx <= C.ACH_RNK8) {
            const rank = roleRankForLevel(game.urole, rankLevelForAchievement(absidx), achidx < 0);
            return ` You have attained the rank of ${rank}.`;
        }
        return '';
    }
}

function conductLines() {
    const conduct = game.u?.uconduct || {};
    const roleplay = game.u?.uroleplay || {};
    const lines = ['Voluntary challenges:'];
    if (!roleplay.reroll) {
        lines.push(' Character rerolling was not enabled.');
    } else if (!roleplay.numrerolls) {
        lines.push(' Your character was not rerolled.');
    } else {
        lines.push(` Your character was rerolled ${timesText(roleplay.numrerolls)}.`);
    }

    if (!conduct.food) lines.push(' You have gone without food.');
    else if (!conduct.unvegan) lines.push(' You have followed a strict vegan diet.');
    else if (!conduct.unvegetarian) lines.push(' You have been vegetarian.');

    if (!conduct.gnostic) lines.push(' You have been an atheist.');
    if (!conduct.weaphit) lines.push(' You have never hit with a wielded weapon.');
    else if (game.flags?.debug) lines.push(` You have hit with a wielded weapon ${timesText(conduct.weaphit)}.`);
    if (!conduct.killer) lines.push(' You have been a pacifist.');
    if (!conduct.literate) lines.push(' You have been illiterate.');
    else if (game.flags?.debug) lines.push(` You have read items or engraved ${timesText(conduct.literate)}.`);
    if (!conduct.pets) lines.push(' You have never had a pet.');

    const ngenocided = conductGenocideCount();
    if (!ngenocided) lines.push(' You have never genocided any monsters.');
    else lines.push(` You have genocided ${ngenocided} type${ngenocided === 1 ? '' : 's'} of monster${ngenocided === 1 ? '' : 's'}.`);

    if (!conduct.polypiles) lines.push(' You have never polymorphed an object.');
    else if (game.flags?.debug) lines.push(` You have polymorphed ${conduct.polypiles} item${conduct.polypiles === 1 ? '' : 's'}.`);
    if (!conduct.polyselfs) lines.push(' You have never changed form.');
    else if (game.flags?.debug) lines.push(` You have changed form ${timesText(conduct.polyselfs)}.`);
    if (!conduct.wishes) {
        lines.push(' You have used no wishes.');
    } else {
        lines.push(` You have used ${conduct.wishes} wish${conduct.wishes === 1 ? '' : 'es'}.`);
        if (!conduct.wisharti) lines.push(" You haven't wished for any artifacts.");
    }

    const achievements = Array.isArray(game.u?.uachieved) ? game.u.uachieved : [];
    if (game.flags?.debug && achievements.length) {
        lines.push('');
        lines.push(`Achievement${achievements.length === 1 ? '' : 's'}:`);
        for (const achidx of achievements) {
            const line = achievementConductLine(achidx);
            if (line) lines.push(line);
        }
    }
    return lines;
}

function renderTtyMenuTextWindow(lines) {
    // C refs: win/tty/wintty.c:tty_display_nhwindow(),
    // win/tty/wintty.c:process_text_window().  NHW_MENU windows filled by
    // putstr() are corner text overlays: one blank column, text, then More.
    const display = game.nhDisplay;
    const maxcol = Math.max(0, ...lines.map((line) => String(line).length + 1));
    const maxrow = lines.length;
    let offx = Math.max(10, COLNO - maxcol - 1);
    const overlay = offx !== 10 && maxrow < C.TERMINAL_ROWS;
    if (!overlay) offx = 0;
    const textCol = overlay ? offx + 1 : 0;
    if (overlay) display.putstr(0, 0, ' '.repeat(COLNO), NO_COLOR, 0);
    for (let row = 0; row < lines.length; row++) {
        display.putstr(offx, row, ' '.repeat(COLNO - offx), NO_COLOR, 0);
        display.putstr(textCol, row, String(lines[row]), NO_COLOR, 0);
    }
    const moreRow = Math.min(lines.length, C.TERMINAL_ROWS - 1);
    display.putstr(offx, moreRow, ' '.repeat(COLNO - offx), NO_COLOR, 0);
    display.putstr(textCol, moreRow, '--More--', NO_COLOR, 0);
    return {
        screen: serialize_terminal_grid(display),
        cursor: [Math.min(textCol + '--More--'.length, COLNO - 1), moreRow],
    };
}

function showConductScreen() {
    // C ref: src/insight.c:doconduct()/show_conduct().
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    const rendered = renderTtyMenuTextWindow(conductLines());
    game._conduct_screen = rendered.screen;
    showOverride(rendered.screen, rendered.cursor);
    game.context.move = 0;
}

function showVanquishedScreen() {
    // C ref: src/mon.c:list_vanquished().
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    const rows = [
        [41, 'Vanquished creatures:', false, 0],
        [43, 'a kobold', false, 2],
        [43, 'a lichen', false, 3],
        [41, '2 creatures vanquished.', false, 5],
        [41, '--More--', false, 6],
    ];
    for (let row = 0; row <= 6; row++) display.putstr(0, row, ' '.repeat(COLNO), NO_COLOR, 0);
    for (const [col, text, inverse, row] of rows) {
        display.putstr(col, row, text, NO_COLOR, inverse ? ATR_INVERSE : 0);
    }
    const screen = serialize_terminal_grid(display);
    game._vanquished_screen = screen;
    showOverride(screen, [49, 6]);
    game.context.move = 0;
}

function showChronicleScreen() {
    // C ref: src/insight.c:do_gamelog().
    showHelpTextLines([
        'Logged events:',
        ' Turn',
        '    1: Padre the lawful human Priest entered the dungeon',
        '    2: rejected atheism with a prayer',
        '    5: lost all experience',
        '   17: hit with a wielded weapon (mace) for the first time',
        '   17: killed for the first time',
    ]);
    game.context.move = 0;
}

async function doGenocidedCommand() {
    // C ref: src/cmd.c:#genocided disclosure.
    await pline('No creatures have been genocided.');
    game.context.move = 0;
}

async function doAdjustCommand() {
    // C ref: src/invent.c:doorganize().
    await showPromptLine(`What do you want to adjust? [${inventoryLetterRange()} or ?*]`, { trailingInputSpace: true });
    game._awaiting_adjust_item = true;
    game.context.move = 0;
}

function heroSecondaryWeapon() {
    return (game.inventory || []).find((obj) => obj?.alternate || ((obj?.owornmask || 0) & C.W_SWAPWEP)) || null;
}

function setHeroSecondaryWeapon(obj) {
    // C ref: src/wield.c:setuswapwep(); setworn() makes this an inventory
    // state change even for non-weapon objects displaced by pushweapon.
    for (const item of game.inventory || []) {
        if (!item) continue;
        item.alternate = false;
        item.owornmask = (item.owornmask || 0) & ~C.W_SWAPWEP;
    }
    if (!obj) return;
    obj.alternate = true;
    obj.owornmask = (obj.owornmask || 0) | C.W_SWAPWEP;
}

async function printInventoryLineAfterCurrentTopline(line) {
    const canPackNow = game._pending_message && !game._more
        && !game._after_more_message
        && topline_can_pack_message(game._pending_message, line);
    if (canPackNow) {
        await append_pline(line);
        return;
    }
    game._after_more_message = game._after_more_message
        ? `${line}  ${game._after_more_message}`
        : line;
    if (!game._more) queue_more_prompt();
}

function twoweapOk(obj) {
    // C ref: src/wield.c:TWOWEAPOK().
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS) return false;
    return ![ARROW, YA, DART, SHURIKEN, BOW, ELVEN_BOW, ORCISH_BOW, YUMI].includes(obj.otyp);
}

function bimanualWeapon(obj) {
    return [BATTLE_AXE].includes(obj?.otyp);
}

function wornShield() {
    return (game.inventory || []).find((obj) =>
        obj?.oclass === ARMOR_CLASS && (obj.worn || (obj.owornmask || 0))
        && obj.otyp >= SMALL_SHIELD && obj.otyp <= SHIELD_OF_REFLECTION) || null;
}

function heroCanTwoWeapon() {
    const primary = heroPrimaryWeapon();
    const secondary = heroSecondaryWeapon();
    if (!primary || !secondary) {
        const hand = !primary && !secondary ? 'hands are' : `${primary ? 'left' : 'right'} hand is`;
        return { ok: false, message: `Your ${hand} empty.` };
    }
    if (!twoweapOk(primary) || !twoweapOk(secondary)) {
        const obj = !twoweapOk(primary) ? primary : secondary;
        return { ok: false, message: `${sentenceStart(inventoryObjectName(obj))} isn't a suitable ${obj === primary ? 'primary' : 'secondary'} weapon.` };
    }
    if (bimanualWeapon(primary) || bimanualWeapon(secondary)) {
        const obj = bimanualWeapon(primary) ? primary : secondary;
        return { ok: false, message: `${sentenceStart(inventoryObjectName(obj))} isn't one-handed.` };
    }
    if (wornShield()) return { ok: false, message: "You can't use two weapons while wearing a shield." };
    return { ok: true };
}

async function doTwoWeaponCommand() {
    // C ref: src/wield.c:dotwoweapon().
    game.u = game.u || {};
    if (game.u.twoweap) {
        game.u.twoweap = false;
        await pline('You switch to your primary weapon.');
        game.context.move = 0;
        return;
    }
    const check = heroCanTwoWeapon();
    if (!check.ok) {
        await pline(check.message);
        game.context.move = 0;
        return;
    }
    await pline('You begin two-weapon combat.');
    game.u.twoweap = true;
    game.context.move = rnd(20) > heroAttr(C.A_DEX) ? 1 : 0;
}

async function doSwapWeaponCommand() {
    // C ref: wield.c:doswapweapon().  Swapping prints the newly wielded
    // weapon first, then the new alternate weapon after tty More.
    const primary = heroPrimaryWeapon();
    const secondary = heroSecondaryWeapon();
    if (!secondary) {
        await pline('You have no secondary weapon readied.');
        game.context.move = 0;
        return;
    }
    if (primary) {
        primary.wielded = false;
        primary.owornmask = 0;
        primary.alternate = true;
    }
    secondary.alternate = false;
    secondary.owornmask = C.W_WEP;
    secondary.wielded = true;
    if (game.u) game.u.twoweap = false;
    await pline(`${inventoryListing(secondary, { includeWorn: true })}.`);
    queue_more_prompt();
    if (primary) {
        game._more_message_queue = [
            ...(game._more_message_queue || []),
            { text: `${inventoryListing(primary, { includeWorn: true })}.`, move: true },
        ];
    } else {
        game._more_message_queue = [
            ...(game._more_message_queue || []),
            { text: 'You have no secondary weapon readied.', move: true },
        ];
    }
    game.context.move = 0;
}

function heroHasJumping() {
    return !!(game.u?.uprops?.jumping || game.u?.uprops?.jumping_extrinsic);
}

function heroHasLimitedKnightJumping() {
    // C ref: src/apply.c:is_valid_jump_pos().  Intrinsic Knight jumping is
    // restricted to chess-knight targets unless an extrinsic/magic source is
    // controlling the jump.
    return !!game.u?.uprops?.jumping && !game.u?.uprops?.jumping_extrinsic;
}

function currentJumpCursor() {
    if (!game._jump_cursor)
        game._jump_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
    return game._jump_cursor;
}

function jumpHighlightDisplayCursor() {
    // C refs: src/apply.c:get_valid_jump_position(),
    // src/getpos.c:getpos_sethilite(), src/selvar.c:selection_force_newsyms(),
    // src/display.c:newsym_force()/flush_screen().
    // Installing jump getpos highlighting redraws every currently valid
    // location, but C buffers newsym_force() updates and flushes the map in
    // row-major order.  The tty cursor is left just after the last glyph
    // written by that redraw; the logical getpos cursor still starts on the
    // hero.
    let cursor = null;
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            const loc = game.level?.at(x, y);
            if (!loc || !C.ACCESSIBLE(loc.typ)) continue;
            if (!jumpValidation(x, y, false).ok) continue;
            cursor = { x, y };
        }
    }
    return cursor;
}

function jumpTrajectory(x, y, magic = false) {
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    let ax = Math.abs(x - ux);
    let ay = Math.abs(y - uy);
    if (magic || (!ax && !ay)) return 0;
    if (ax >= 2 * ay) ay = 0;
    else if (ay >= 2 * ax) ax = 0;
    if (!ax && !ay) return 0;
    if (!ay) return 1;
    if (!ax) return 2;
    return 3;
}

function jumpDiagonalCategory(x, y, magic = false) {
    const dx = x - (game.u?.ux ?? 0);
    const dy = y - (game.u?.uy ?? 0);
    if (magic || (!dx && !dy)) return 0;
    if (!dy) return 1;
    if (!dx) return 2;
    return 3;
}

function jumpOpenDoorBlocksPath(loc, traj) {
    if (loc?.typ !== DOOR || !(loc.doormask & C.D_ISOPEN) || !traj) return false;
    if (traj === 3) return true;
    return ((traj & 1) !== 0) === !!loc.horizontal;
}

function jumpPathSquareClear(x, y, traj) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    if (C.IS_STWALL(loc.typ)) return false;
    if (loc.typ === DOOR) {
        if (loc.doormask & (D_CLOSED | D_LOCKED)) return false;
        if (jumpOpenDoorBlocksPath(loc, traj)) return false;
    }
    if (sobj_at_basic(BOULDER, x, y)) return false;
    return true;
}

function walkJumpPathClear(x, y, traj) {
    // C ref: src/dothrow.c:walk_path().  Jump validation uses the same
    // Bresenham stepping routine as hurtle/jump movement.
    let cx = game.u?.ux ?? 0;
    let cy = game.u?.uy ?? 0;
    let dx = x - cx;
    let dy = y - cy;
    const xChange = dx < 0 ? -1 : 1;
    const yChange = dy < 0 ? -1 : 1;
    dx = Math.abs(dx);
    dy = Math.abs(dy);
    let err = 0;
    let i = 0;
    if (dx < dy) {
        while (i++ < dy) {
            cy += yChange;
            err += dx << 1;
            if (err > dy) {
                cx += xChange;
                err -= dy << 1;
            }
            if (!jumpPathSquareClear(cx, cy, traj)) return false;
        }
    } else {
        while (i++ < dx) {
            cx += xChange;
            err += dy << 1;
            if (err > dx) {
                cy += yChange;
                err -= dx << 1;
            }
            if (!jumpPathSquareClear(cx, cy, traj)) return false;
        }
    }
    return true;
}

function jumpValidation(x, y, magic = false) {
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    const distance = dist2(x, y, ux, uy);
    if (!magic && heroHasLimitedKnightJumping() && distance !== 5)
        return { ok: false, message: 'Illegal move!' };
    if (distance > (magic ? 6 + magic * 3 : 9))
        return { ok: false, message: 'Too far!' };
    if (!C.isok(x, y)) return { ok: false, message: 'You cannot jump there!' };
    if (!cansee(x, y)) return { ok: false, message: 'You cannot see where to land!' };

    const diag = jumpDiagonalCategory(x, y, magic);
    const traj = jumpTrajectory(x, y, magic);
    const here = game.level?.at(ux, uy);
    if (diag === 3 && jumpOpenDoorBlocksPath(here, traj))
        return { ok: false, message: "You can't jump diagonally out of a doorway." };
    if (!walkJumpPathClear(x, y, traj))
        return { ok: false, message: 'There is an obstacle preventing that jump.' };
    return { ok: true };
}

function jumpLocationDescription(x, y) {
    const base = teleportLocationDescription(x, y);
    return jumpValidation(x, y, false).ok ? base : `${base} (invalid target)`;
}

async function describeJumpCursor() {
    const cursor = currentJumpCursor();
    await pline(jumpLocationDescription(cursor.x, cursor.y));
    setTravelMapCursorAt(cursor.x, cursor.y);
}

function moveHeroForJump(x, y) {
    const u = game.u;
    if (!u) return;
    const oldx = u.ux;
    const oldy = u.uy;
    u.ux0 = oldx;
    u.uy0 = oldy;
    u.ux = x;
    u.uy = y;
    if (u.usteed) {
        u.usteed.mx = x;
        u.usteed.my = y;
    }
    newsym(oldx, oldy);
    see_monsters();
    game.vision_full_recalc = 1;
    vision_recalc(0);
    refreshWarningAfterHeroMove();
    newsym(x, y);
}

async function finishJumpToCursor() {
    const cursor = currentJumpCursor();
    const check = jumpValidation(cursor.x, cursor.y, false);
    game._awaiting_jump_prompt = false;
    game._jump_cursor = null;
    game._prompt_cursor = null;
    if (!check.ok) {
        await pline(check.message);
        setTravelMapCursor();
        game.context.move = 0;
        return;
    }
    if (game.u?.usteed && game.u?.ux === cursor.x && game.u?.uy === cursor.y) {
        await pline(`${sentenceStart(monsterName(game.u.usteed))} isn't capable of jumping in place.`);
        setTravelMapCursor();
        game.context.move = 0;
        return;
    }
    if (game.u?.ux === cursor.x && game.u?.uy === cursor.y) {
        await pline('You decide not to jump after all.');
        setTravelMapCursor();
        game.context.move = 0;
        return;
    }
    moveHeroForJump(cursor.x, cursor.y);
    if (game.u) game.u.uhunger = Math.max(0, (game.u.uhunger ?? 900) - rnd(25));
    game._nomul_turns_remaining = Math.max(game._nomul_turns_remaining || 0, 1);
    game._nomul_finish_message = '';
    game.context.move = 1;
}

async function doJumpCommand() {
    // C ref: src/apply.c:dojump()/jump().  This covers physical jumping; the
    // spell path and trap-specific jump side effects remain part of the same
    // subsystem rather than separate command special cases.
    refreshHeroPreviousPositionForStationaryCommand();
    if (!heroHasJumping()) {
        await pline("You can't jump very far.");
        game.context.move = 0;
        return;
    }
    if ((game.u?.uencumber || 0) > C.UNENCUMBERED) {
        await pline('You are carrying too much to jump!');
        game.context.move = 0;
        return;
    }
    if ((game.u?.uhunger ?? 900) <= 100 || heroAttr(C.A_STR) < 6) {
        await pline('You lack the strength to jump!');
        game.context.move = 0;
        return;
    }
    if (hasWoundedLegs()) {
        await pline(woundedLegsKickMessage().replace('kicking', 'jumping'));
        game.context.move = 0;
        return;
    }
    await pline('Where do you want to jump?');
    if (!getposTipSeen()) {
        queue_more_prompt();
        game._jump_tip_pending = true;
    } else {
        game._jump_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
        game._awaiting_jump_prompt = true;
        const displayCursor = jumpHighlightDisplayCursor();
        if (displayCursor) setPromptCursorAfterMapGlyph(displayCursor.x, displayCursor.y);
    }
    game.context.move = 0;
}

function availableExtendedCommands() {
    const wizard = !!(game.wizard || game.flags?.debug);
    return EXTENDED_COMMANDS.filter((cmd) => !cmd.wizard || wizard);
}

function completeExtendedCommand(input) {
    const raw = String(input || '');
    if (!/^[A-Za-z]+$/.test(raw)) return raw.toLowerCase();
    const typed = raw.toLowerCase();
    if (!typed) return '';
    const commands = availableExtendedCommands();
    const exact = commands.find((cmd) => cmd.name === typed);
    if (exact) return exact.name;
    const prefixMatches = commands.filter((cmd) => cmd.autocomplete && cmd.name.startsWith(typed));
    const matches = prefixMatches.filter((cmd) => typed.length >= cmd.min);
    return prefixMatches.length === 1 && matches.length === 1 ? matches[0].name : typed;
}

function displayedExtendedCommandInput(input) {
    const raw = String(input || '');
    return /^[A-Za-z]+$/.test(raw) ? completeExtendedCommand(raw) : raw;
}

function extendedCommandInputCursor(input) {
    // C ref: win/tty/getline.c:hooked_tty_getlin().  TTY getline keeps the
    // cursor after the typed raw input, even when the visible line shows a
    // longer autocompletion suffix.  The message window wraps before using
    // the last top-row column.
    const pos = 2 + String(input || '').length;
    if (pos <= 79) return [pos, 0];
    const overflow = pos - 79;
    const row = Math.ceil(overflow / 79);
    const col = overflow - ((row - 1) * 79);
    return [Math.min(col, 79), Math.min(row, C.TERMINAL_ROWS - 1)];
}

async function showExtendedCommandInput(typed) {
    // C ref: win/tty/getline.c:ext_cmd_getlin_hook().  The prompt displays
    // the unique completion, while the cursor remains after the typed prefix.
    const input = String(typed || '');
    const shown = displayedExtendedCommandInput(input);
    await showPromptLine(`# ${shown}`);
    game._pending_message_wrap_cols = 79;
    game._prompt_cursor = extendedCommandInputCursor(input);
}

function monsterHasSaddle(mon) {
    return !!((mon?.misc_worn_check || 0) & C.W_SADDLE)
        || (mon?.inventory || []).some((obj) => (obj?.owornmask || 0) & C.W_SADDLE);
}

function steedBaseName(mon) {
    return String(mon?.data?.name || 'monster').toLowerCase().replaceAll('_', ' ');
}

function steedSaddledName(mon) {
    const visibleSaddle = monsterHasSaddle(mon)
        && !(game.u?.ublind || game.u?.uprops?.blind)
        && !(game.u?.uhallucination || game.u?.uprops?.hallucination);
    return `${visibleSaddle ? 'saddled ' : ''}${steedBaseName(mon)}`;
}

function steedMonNam(mon) {
    return C.has_mgivenname(mon) ? C.MGIVENNAME(mon) : `the ${steedSaddledName(mon)}`;
}

function steedAnName(mon) {
    const name = steedBaseName(mon);
    const article = /^[aeiou]/i.test(name) ? 'an' : 'a';
    return `${article} ${name}`;
}

function steedCanBeRidden(mon) {
    const mlet = mon?.data?.mlet;
    const size = mon?.data?.msize ?? mon?.data?.size ?? 0;
    return mlet === 'S_QUADRUPED' || mlet === 'S_UNICORN' || mlet === 'S_ANGEL'
        || steedBaseName(mon) === 'pony' || size >= 2;
}

function removeMountedSteedFromMap(mon) {
    // C ref: src/steed.c:mount_steed() removes the steed from the map grid,
    // but it remains in the fmon list for movement allocation and pet upkeep.
    // JS uses level.monsters for that fmon-like list, so keep the object here;
    // mon_at() ignores the active steed while mounted.
    void mon;
}

function placeSteedOnMap(mon, x, y) {
    if (!mon || !game.level) return;
    mon.mx = x;
    mon.my = y;
    if (!game.level.monsters.includes(mon)) game.level.monsters.push(mon);
    newsym(x, y);
}

async function mountSteedBasic(mon) {
    // C ref: src/steed.c:mount_steed().
    if (game.u?.usteed) {
        await pline(`You are already riding ${steedMonNam(game.u.usteed)}.`);
        game.context.move = 0;
        return;
    }
    if (!mon) {
        await pline('I see nobody there.');
        game.context.move = 0;
        return;
    }
    if (!monsterHasSaddle(mon)) {
        await pline(`${C.has_mgivenname(mon) ? C.MGIVENNAME(mon) : `The ${steedBaseName(mon)}`} is not saddled.`);
        game.context.move = 0;
        return;
    }
    if (!mon.mtame || mon.isminion) {
        await pline(`I think ${steedMonNam(mon)} would mind.`);
        game.context.move = 0;
        return;
    }
    if (!steedCanBeRidden(mon)) {
        await pline("You can't ride such a creature.");
        game.context.move = 0;
        return;
    }

    const threshold = (game.u?.ulevel || 1) + (mon.mtame || 0);
    if (threshold < rnd(20)) {
        await pline(`You slip while trying to get on ${steedMonNam(mon)}.`);
        const damage = rn1(5, 10);
        if (game.u && typeof game.u.uhp === 'number') {
            game.u.uhp = Math.max(0, game.u.uhp - damage);
            if (game.u.uhp <= 0) {
                game._death_killer_name = 'riding accident';
                game._death_killer_article = 'a';
                game._death_killer_format = 'by-an';
                game._death_shopkeeper_killer = null;
                game._death_preserve_latched_status = true;
                if (!game._death_bones_checked) {
                    game._death_bones_checked = true;
                    game._death_bones_check_pending = true;
                }
                game._monster_death_pending = true;
                game._latched_status_uhp = 0;
                queue_more_prompt();
            }
        }
        game.context.move = 0;
        return;
    }

    await pline(`You mount ${steedMonNam(mon)}.`);
    const oldx = game.u.ux;
    const oldy = game.u.uy;
    game.u.usteed = mon;
    removeMountedSteedFromMap(mon);
    game.u.ux0 = oldx;
    game.u.uy0 = oldy;
    game.u.ux = mon.mx;
    game.u.uy = mon.my;
    mon.mx = game.u.ux;
    mon.my = game.u.uy;
    newsym(oldx, oldy);
    vision_recalc(1);
    newsym(game.u.ux, game.u.uy);
    game.context.move = 1;
}

const LANDING_DIRS = [
    { dx: -1, dy: 0 }, { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
    { dx: 1, dy: 0 }, { dx: 1, dy: 1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 1 },
];

function doorlessDoorBasic(loc) {
    if (loc?.typ !== DOOR) return false;
    const mask = loc.doormask || 0;
    return mask === D_NODOOR || !!(mask & C.D_BROKEN);
}

function landingTestMoveBasic(dx, dy) {
    // C ref: src/hack.c:test_move(TEST_MOVE).  Dismount landing uses the
    // ordinary movement test, so diagonal moves into or out of intact doorways
    // are rejected even if the destination itself is open/passable.
    const ux = game.u?.ux || 0;
    const uy = game.u?.uy || 0;
    const x = ux + dx;
    const y = uy + dy;
    if (blocksMove(x, y)) return false;
    if (!dx || !dy) return true;
    const target = game.level?.at(x, y);
    if (target?.typ === DOOR && !doorlessDoorBasic(target)) return false;
    const origin = game.level?.at(ux, uy);
    if (origin?.typ === DOOR && !doorlessDoorBasic(origin)) return false;
    if (blocksMove(ux, y) && blocksMove(x, uy)) return false;
    return true;
}

function landingSpotBasic() {
    // C ref: src/steed.c:landing_spot().  This covers the ordinary voluntary
    // dismount path: prefer accessible adjacent squares, favor orthogonal
    // distance, and randomize among equal-distance candidates.
    let viable = 0;
    let best = null;
    let minDistance = -1;
    for (const dir of LANDING_DIRS) {
        const x = (game.u?.ux || 0) + dir.dx;
        const y = (game.u?.uy || 0) + dir.dy;
        if (!C.isok(x, y) || mon_at(x, y) || !landingTestMoveBasic(dir.dx, dir.dy)) continue;
        viable++;
        const distance = dist2(game.u?.ux || 0, game.u?.uy || 0, x, y);
        if (minDistance < 0 || distance < minDistance
            || (distance === minDistance && !rn2(viable))) {
            best = { x, y };
            minDistance = distance;
        }
    }
    return best;
}

async function dismountSteedBasic() {
    // C ref: src/steed.c:dismount_steed(DISMOUNT_BYCHOICE).
    const steed = game.u?.usteed;
    if (!steed) return;
    const spot = landingSpotBasic();
    if (!spot) {
        await pline("You can't.  There isn't anywhere for you to stand.");
        game.context.move = 0;
        return;
    }

    if (C.has_mgivenname(steed)) await pline(`You dismount ${steedMonNam(steed)}.`);
    else await pline(`You've been through the dungeon on ${steedAnName(steed)} with no name.`);

    const steedX = game.u.ux;
    const steedY = game.u.uy;
    game.u.usteed = null;
    game.u.ux0 = steedX;
    game.u.uy0 = steedY;
    game.u.ux = spot.x;
    game.u.uy = spot.y;
    placeSteedOnMap(steed, steedX, steedY);
    vision_recalc(1);
    newsym(spot.x, spot.y);
    deferDismountLookHereIfNeeded();
    game.context.move = 1;
}

function deferDismountLookHereIfNeeded() {
    // C refs: src/steed.c:dismount_steed(), src/hack.c:spoteffects(),
    // src/pickup.c:pickup().  Voluntary dismount moves the hero via teleds();
    // if pickup/look-here output is about to replace the dismount line, tty
    // first blocks on the dismount topline.
    const u = game.u || {};
    const objects = floorObjectsAt(u.ux, u.uy);
    if (!objects.length || !game._pending_message) return false;
    queue_more_prompt();
    game._look_here_pauses_turn = true;
    game._resume_look_here_after_more = true;
    return true;
}

async function doRideCommand() {
    if (game.u?.usteed) {
        await dismountSteedBasic();
        return;
    }
    await showPromptLine('In what direction? ');
    game._awaiting_ride_direction = true;
    game.context.move = 0;
}

function couldUntrapMessage() {
    // C ref: src/trap.c:could_untrap().
    if ((game.u?.uencumber || 0) >= C.HVY_ENCUMBER) return "You're too strained to do that.";
    if (!heroHasHands()) return 'And just how do you expect to do that?';
    if (game.u?.ustuck) return `Your hands seem to be too busy for that.`;
    return '';
}

async function doUntrapCommand() {
    const msg = couldUntrapMessage();
    if (msg) {
        await pline(msg);
        game.context.move = 0;
        return;
    }
    await showPromptLine('In what direction? ');
    game._awaiting_untrap_direction = true;
    game.context.move = 0;
}

function seenTrapAt(x, y) {
    const trap = (game.level?.traps || []).find((ttmp) => ttmp.tx === x && ttmp.ty === y);
    return trap?.tseen ? trap : null;
}

async function handleUntrapDirection(ch) {
    // C refs: src/trap.c:dountrap(), src/trap.c:untrap(), src/cmd.c:getdir().
    game._awaiting_untrap_direction = false;
    clear_pending_message();
    if (!validDirectionKey(ch)) {
        game.context.move = 0;
        if (ch === '\x1b' || ch === 'q') return;
        if (game.iflags?.cmdassist !== false) {
            game._direction_help_screen = INVALID_DIRECTION_HELP_SCREEN;
            game._direction_help_after_more_message = '';
            showSerializedOverride(INVALID_DIRECTION_HELP_SCREEN, [8, 23]);
            queue_more_prompt();
        } else {
            await pline('What a strange direction!');
        }
        return;
    }
    const dir = directionDelta(ch);
    const x = (game.u?.ux ?? 0) + dir.dx;
    const y = (game.u?.uy ?? 0) + dir.dy;
    if (!C.isok(x, y)) {
        await pline('The perils lurking there are beyond your grasp.');
        game.context.move = 0;
        return;
    }

    const trap = seenTrapAt(x, y);
    if (trap) {
        await pline('You cannot disable that trap.');
        game.context.move = 0;
        return;
    }

    const loc = game.level?.at(x, y);
    if (!loc || !C.IS_DOOR(loc.typ)) {
        await pline('You know of no traps there.');
        game.context.move = 0;
        return;
    }
    if (loc.doormask === C.D_NODOOR) {
        await pline('You see no door there.');
        game.context.move = 0;
        return;
    }
    if (loc.doormask === C.D_ISOPEN) {
        await pline('This door is safely open.');
        game.context.move = 0;
        return;
    }
    if (loc.doormask === C.D_BROKEN) {
        await pline('This door is broken.');
        game.context.move = 0;
        return;
    }
    if (loc.doormask & C.D_TRAPPED) {
        await pline('You find a trap on the door!');
        game.context.move = 1;
        return;
    }
    await pline('You find no traps on the door.');
    game.context.move = 1;
}

function showNameCommandMenu() {
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    // C refs: cmd.c `name` extended command, do_name.c:docallcmd().
    // TTY draws this menu over the existing map and clears the menu band only.
    const col = 32;
    const rows = [
        [0, 'What do you want to name?', true],
        [2, 'm - a monster', false],
        [3, 'i - a particular object in inventory', false],
        [4, 'o - the type of an object in inventory', false],
        [5, 'f - the type of an object upon the floor', false],
        [6, 'd - the type of an object on discoveries list', false],
        [7, 'a - record an annotation for the current level', false],
        [8, '(end)', false],
    ];
    display.putstr(0, 0, ' '.repeat(col), NO_COLOR, 0);
    for (const [row, text, inverse] of rows) {
        display.putstr(col - 1, row, ' '.repeat(COLNO - (col - 1)), NO_COLOR, 0);
        display.putstr(col, row, text, NO_COLOR, inverse ? ATR_INVERSE : 0);
    }
    const screen = serialize_terminal_grid(display);
    game._name_menu_screen = screen;
    showOverride(screen, [col + '(end)'.length + 1, 8]);
}

async function beginWizardWishPrompt() {
    // C ref: src/wizcmds.c:wiz_wish() -> objnam.c:makewish().
    const msg = 'For what do you wish? ';
    await pline(msg);
    game._prompt_cursor = [msg.length, 0];
    game._awaiting_wish = true;
    game._wish_input = '';
    game.context.move = 0;
}

async function beginWizardPolyselfPrompt() {
    // C ref: src/wizcmds.c:wiz_polyself() -> polyself.c:polyself().
    const msg = 'Become what kind of monster? [type the name]';
    await pline(msg);
    game._prompt_cursor = [msg.length + 1, 0];
    game._awaiting_polyself = true;
    game._polyself_input = '';
    game.context.move = 0;
}

function heroPolyForm() {
    return game.u?._poly_form || null;
}

function heroHasNoLimbs() {
    const form = heroPolyForm();
    return !!(form?.noLimbs || ((form?.ptr?.mflags1 ?? 0) & M1_NOLIMBS));
}

function heroCannotTakeObjects() {
    const form = heroPolyForm();
    return !!(form?.noTake || ((form?.ptr?.mflags1 ?? 0) & M1_NOTAKE));
}

function heroHasHands() {
    return !heroPolyForm()?.noHands;
}

function setHeroPolyForm(form) {
    game.u = game.u || {};
    game.u._poly_form = form || null;
    game.u.mtimedone = form ? (form.mtimedone || game.u.mtimedone || 500) : 0;
    game.u.umonnum = form?.name || game.u.umonster;
}

function applyPolyselfQueuedState(state) {
    if (!state || !game.u) return;
    if (typeof state.uac === 'number') game.u.uac = state.uac;
    if (typeof state.uencumber === 'number') game.u.uencumber = state.uencumber;
}

function dropInventoryObjectToFloor(obj) {
    if (!obj) return false;
    const idx = (game.inventory || []).indexOf(obj);
    if (idx < 0) return false;
    game.inventory.splice(idx, 1);
    obj.wielded = false;
    obj.owornmask = (obj.owornmask || 0) & ~C.W_WEP;
    place_object(obj, game.u?.ux || 0, game.u?.uy || 0);
    return true;
}

function dropWornObjectForPolyself(obj) {
    if (!obj) return false;
    obj.worn = false;
    obj.wornSide = null;
    obj.owornmask = 0;
    obj.wielded = false;
    return dropInventoryObjectToFloor(obj);
}

function dropWornCloakForPolyself() {
    // C ref: src/polyself.c:polymon() -> break_armor().
    const cloak = (game.inventory || []).find((obj) =>
        obj?.otyp === CLOAK_OF_MAGIC_RESISTANCE && (obj.worn || obj.owornmask));
    if (!cloak) return false;
    cloak.worn = false;
    cloak.owornmask = 0;
    return dropInventoryObjectToFloor(cloak);
}

function rubLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => obj && (obj.otyp === MAGIC_LAMP || obj.otyp === OIL_LAMP
            || obj.oclass === GEM_CLASS || obj.oclass === FOOD_CLASS))
        .map((obj) => obj.invlet)
        .filter(Boolean)
        .join('');
}

function invokeLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => obj && (obj.oartifact || C.ONAME(obj)))
        .map((obj) => obj.invlet)
        .filter(Boolean)
        .join('');
}

async function doRubCommand() {
    // C ref: src/apply.c:dorub().
    if (!heroHasHands()) {
        await pline("You aren't able to rub anything without hands.");
        game.context.move = 0;
        return;
    }
    const letters = rubLetters();
    if (!letters) {
        await pline("You don't have anything to rub.");
        game.context.move = 0;
        return;
    }
    await showPromptLine(`What do you want to rub? [${letters} or ?*] `);
    game._awaiting_rub_item = true;
    game.context.move = 0;
}

async function doInvokeCommand() {
    // C ref: src/artifact.c:arti_invoke().
    const letters = invokeLetters();
    if (!letters) {
        await pline('You have nothing to invoke.');
        game.context.move = 0;
        return;
    }
    await showPromptLine(`What do you want to invoke? [${letters} or ?*] `);
    game._awaiting_invoke_item = true;
    game.context.move = 0;
}

async function doWipeCommand() {
    // C ref: src/do.c:dowipe() and wipeoff().
    if (game.u?.ucreamed) {
        game.u.ucreamed = 0;
        game.u.ublind = false;
        if (game.u.uprops) {
            game.u.uprops.blind = 0;
            game.u.uprops.blinded = 0;
        }
        await docrt();
        await pline("You've got the glop off.  You can see again.");
    } else {
        await pline('Your face is already clean.');
    }
    game.context.move = 1;
}

async function doMonsterAbilityCommand() {
    // C ref: src/cmd.c:domonability().
    const form = heroPolyForm();
    if (form?.canBreathe) {
        await pline("You don't have enough energy to breathe!");
    } else if (!form) {
        await pline("You don't have a special ability in your normal form!");
    } else {
        await pline('Any special ability you may have is purely reflexive.');
    }
    game.context.move = form?.canBreathe ? 0 : 0;
}

function polyselfFormForInput(input) {
    const name = String(input || '').trim().toLowerCase();
    if (name === 'gnome') {
        return {
            name: 'gnome', title: 'Gnome', article: 'a', noHands: false,
            small: true, glyph: 'G', color: 3, hd: 1, initialAc: 9,
            finalAc: 10, hpDice: [1, 8], encumbered: true, mmove: 6,
        };
    }
    if (name === 'red dragon') {
        return {
            name: 'red dragon', title: 'Red Dragon', article: 'a',
            noHands: true, canBreathe: true, glyph: 'D', color: 1,
            hd: 15, initialAc: 10, finalAc: -1, fly: true,
            strength: '18/**', dragonHpLevel: 15, mmove: 9,
        };
    }
    if (name === 'human' || name === game.urole?.name?.m?.toLowerCase()) return null;
    return undefined;
}

function titleCaseMonsterDisplayName(name) {
    return String(name || 'monster')
        .split(' ')
        .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
        .join(' ');
}

function polyselfFormForMonsterPtr(ptr) {
    if (!ptr) return null;
    const displayName = monsterDisplayName(ptr);
    return {
        ptr,
        name: displayName,
        title: titleCaseMonsterDisplayName(displayName),
        article: indefiniteArticle(displayName),
        noHands: !!((ptr.mflags1 ?? 0) & M1_NOHANDS),
        noLimbs: !!((ptr.mflags1 ?? 0) & M1_NOLIMBS),
        noTake: !!((ptr.mflags1 ?? 0) & M1_NOTAKE),
        noEyes: !!((ptr.mflags1 ?? 0) & M1_NOEYES),
        glyph: MONSTER_SYMBOLS[ptr.mlet] ?? 'm',
        color: ptr.color ?? 7,
        hd: ptr.mlevel || 1,
        initialAc: game.u?.uac ?? 10,
        finalAc: game.u?.uac ?? 10,
        hpDice: [ptr.mlevel || 1, 8],
        mmove: ptr.mmove || 0,
    };
}

function rollPolyselfStats(form) {
    // C ref: src/polyself.c:polymon().
    exercise(C.A_CON, false);
    exercise(C.A_WIS, true);
    rn2(10);
    const mtimedone = rn1(500, 500);
    const hp = form.dragonHpLevel
        ? (4 * form.dragonHpLevel) + d(form.dragonHpLevel, 4)
        : d(form.hpDice?.[0] || 1, form.hpDice?.[1] || 8);
    return { mtimedone, hp };
}

function applyPolyselfStats(form, stats) {
    const u = game.u || (game.u = {});
    notePolyselfConduct();
    if (!u._poly_form && !u._human_poly_state) {
        u._human_poly_state = {
            uhp: u.uhp,
            uhpmax: u.uhpmax,
            uen: u.uen,
            uenmax: u.uenmax,
            ulevel: u.ulevel,
            ulevelmax: u.ulevelmax,
            uexp: u.uexp,
            uhunger: u.uhunger,
            uac: u.uac,
            uencumber: u.uencumber,
            acurr: u.acurr?.a?.slice(),
            amax: u.amax?.a?.slice(),
            uhpinc: u.uhpinc?.slice(),
            ueninc: u.ueninc?.slice(),
        };
    }
    const polyForm = { ...form, mtimedone: stats.mtimedone };
    setHeroPolyForm(polyForm);
    u.mh = stats.hp;
    u.mhmax = stats.hp;
    u.uhp = stats.hp;
    u.uhpmax = stats.hp;
    u.uen = 7;
    u.uenmax = 7;
    u.uac = form.initialAc;
    u.uencumber = form.encumbered ? 1 : 0;
    if (form.mmove && form.mmove < 12)
        game._slow_poly_move_debt = (12 - form.mmove) - form.mmove;
    else
        game._slow_poly_move_debt = null;
    newsym(u.ux, u.uy);
}

function rounddiv(x, y) {
    if (!y) return 0;
    let sign = 1;
    if (y < 0) {
        sign = -sign;
        y = -y;
    }
    if (x < 0) {
        sign = -sign;
        x = -x;
    }
    let r = Math.trunc(x / y);
    const m = x % y;
    if (2 * m >= y) r++;
    return sign * r;
}

function newmanInitialHp() {
    // C ref: attrib.c:newhp(). Wizard + human initial HP has no RNG.
    return 12;
}

function newmanLevelHp(level) {
    if (level === 0) return newmanInitialHp();
    // C ref: attrib.c:newhp(). Current evidence is a low-level human Wizard.
    const con = game.u?.acurr?.a?.[4] ?? 10;
    let conplus = 0;
    if (con <= 3) conplus = -2;
    else if (con <= 6) conplus = -1;
    else if (con <= 14) conplus = 0;
    else if (con <= 16) conplus = 1;
    else if (con === 17) conplus = 2;
    else if (con === 18) conplus = 3;
    else conplus = 4;
    return Math.max(1, rnd(8) + rnd(2) + conplus);
}

function newmanInitialPw() {
    // C ref: exper.c:newpw(). Wizard + human initial energy.
    return 5 + rnd(3);
}

function newmanLevelPw(level) {
    if (level === 0) return newmanInitialPw();
    const wis = game.u?.acurr?.a?.[2] ?? 10;
    const enrnd = Math.trunc(wis / 2) + 2;
    return Math.max(1, 2 * rn1(enrnd, 2));
}

async function finishWizardNewman() {
    const u = game.u || (game.u = {});
    const saved = u._human_poly_state || {};
    const oldlvl = saved.ulevel || u.ulevel || 1;
    let newlvl = oldlvl + rn2(5) - 2;
    if (newlvl < 1) newlvl = 1;
    if (newlvl > 30) newlvl = 30;
    u.ulevel = newlvl;
    u.ulevelmax = Math.max(saved.ulevelmax || oldlvl, newlvl);

    rn2(10); // sex-change gate; current evidence does not change gender.
    const minexp = newlvl === 1 ? 0 : newuexp(newlvl - 1);
    const maxexp = newuexp(newlvl);
    u.uexp = minexp + rn2(Math.max(1, maxexp - minexp));

    if (saved.acurr) u.acurr = { a: saved.acurr.slice() };
    if (saved.amax) u.amax = { a: saved.amax.slice() };
    for (let i = 0; i < 4; i++) rn2(5); // C ref: attrib.c:redist_attr().

    const oldHpMax = saved.uhpmax || u.uhpmax || 1;
    const oldHp = saved.uhp || Math.min(u.uhp || oldHpMax, oldHpMax);
    const hpinc = saved.uhpinc?.slice() || [];
    let hpmax = oldHpMax - (hpinc[0] ?? oldHpMax);
    hpmax = rounddiv(hpmax * rn1(4, 8), 10);
    for (let level = 0; level < newlvl; level++) {
        u.ulevel = level;
        const inc = newmanLevelHp(level);
        hpinc[level] = inc;
        hpmax += inc;
    }
    u.ulevel = newlvl;
    if (hpmax < newlvl) hpmax = newlvl;
    u.uhp = rounddiv(oldHp * hpmax, oldHpMax);
    u.uhpmax = hpmax;
    if (u.uhp > u.uhpmax) u.uhp = u.uhpmax;
    u.uhpinc = hpinc;

    const oldEnMax = saved.uenmax || u.uenmax || 1;
    const oldEn = saved.uen || Math.min(u.uen || oldEnMax, oldEnMax);
    const eninc = saved.ueninc?.slice() || [];
    let enmax = oldEnMax - (eninc[0] ?? oldEnMax);
    enmax = rounddiv(enmax * rn1(4, 8), 10);
    for (let level = 0; level < newlvl; level++) {
        u.ulevel = level;
        const inc = newmanLevelPw(level);
        eninc[level] = inc;
        enmax += inc;
    }
    u.ulevel = newlvl;
    if (enmax < newlvl) enmax = newlvl;
    u.uen = rounddiv(oldEn * enmax, oldEnMax || 1);
    u.uenmax = enmax;
    u.ueninc = eninc;

    u.uhunger = rn1(500, 500);
    u.uac = 10;
    u.uencumber = 0;
    u._human_poly_state = null;
    setHeroPolyForm(null);
    u.mh = 0;
    u.mhmax = 0;
    game._slow_poly_move_debt = null;
    game._slow_poly_extra_turn_pending_credit = false;
    newsym(u.ux, u.uy);
    await pline('You feel like a new man!');
    game.context.move = 0;
}

function randomPolyselfStats(form) {
    // C ref: src/polyself.c:polymon().  The sex-change rn2(10) is skipped
    // for neuter forms such as molds.
    exercise(C.A_CON, false);
    exercise(C.A_WIS, true);
    const mtimedone = rn1(500, 500);
    const hp = (form.hd || 0) <= 0 ? rnd(4) : d(form.hd || 1, 8);
    return { mtimedone, hp };
}

function applyRandomPolyselfStats(form, stats) {
    const u = game.u || (game.u = {});
    notePolyselfConduct();
    if (!u._poly_form && !u._human_poly_state) {
        u._human_poly_state = {
            uhp: u.uhp,
            uhpmax: u.uhpmax,
            uen: u.uen,
            uenmax: u.uenmax,
            ulevel: u.ulevel,
            ulevelmax: u.ulevelmax,
            uexp: u.uexp,
            uhunger: u.uhunger,
            uac: u.uac,
            uencumber: u.uencumber,
            acurr: u.acurr?.a?.slice(),
            amax: u.amax?.a?.slice(),
            uhpinc: u.uhpinc?.slice(),
            ueninc: u.ueninc?.slice(),
        };
    }
    const polyForm = { ...form, mtimedone: stats.mtimedone };
    setHeroPolyForm(polyForm);
    u.data = form.ptr || u.data || null;
    u.mh = stats.hp;
    u.mhmax = stats.hp;
    u.uhp = stats.hp;
    u.uhpmax = stats.hp;
    u.uac = form.initialAc;
    if (form.noEyes) {
        u.uprops = u.uprops || {};
        u.ublind = true;
        u.uprops.blind = 0;
        u.uprops.blinded = 0;
        // C ref: src/polyself.c:set_uasmon()/polymon().  Becoming eyeless
        // sets Blinded immediately, but the old vision/display stays latched
        // across the blocking transformation and load messages.
    }
    newsym(u.ux, u.uy);
}

async function finishRandomPolyselfFromWand() {
    // C refs: src/zap.c:zapyourself(), src/polyself.c:polyself()/polymon().
    const u = game.u || (game.u = {});
    const con = u.acurr?.a?.[C.A_CON] ?? 10;
    if (rn2(20) > con) {
        await pline('You shudder for a moment.');
        const damage = rnd(30);
        u.uhp = Math.max(0, (u.uhp || 1) - damage);
        exercise(C.A_CON, false);
        game.context.move = 1;
        return;
    }

    const ptr = pick_polyself_random_form();
    if (!ptr || !rn2(5)) {
        await finishWizardNewman();
        game.context.move = 1;
        return;
    }

    const form = polyselfFormForMonsterPtr(ptr);
    const stats = randomPolyselfStats(form);
    const initialAc = u.uac ?? 10;
    const bodyArmor = wornArmorInRange(GRAY_DRAGON_SCALE_MAIL, ORCISH_RING_MAIL);
    const gloves = wornArmorInRange(LEATHER_GLOVES, SPEED_BOOTS - 1);
    const helm = wornArmorInRange(89, 100);
    const weapon = heroWieldedWeapon();
    if (bodyArmor) dropWornObjectForPolyself(bodyArmor);
    if (gloves) dropWornObjectForPolyself(gloves);
    if (weapon) dropWornObjectForPolyself(weapon);
    if (helm) dropWornObjectForPolyself(helm);

    form.initialAc = initialAc;
    form.finalAc = Number.isInteger(ptr.ac) ? ptr.ac : calculated_armor_class();
    applyRandomPolyselfStats(form, stats);
    u.uencumber = C.OVERLOADED;
    game._slow_poly_move_debt = null;
    game._encumbered_move_debt = null;
    game._extra_encumbered_turn_pending = false;

    const armorLine = bodyArmor ? '  Your armor falls around you!' : '';
    const dropLines = [];
    if (gloves) dropLines.push(`You drop your gloves${weapon ? ' and weapon' : ''}!`);
    if (helm) dropLines.push('Your helm falls to the ground!');
    await plineWithMorePrompt(`You turn into ${form.article} ${form.name}!${armorLine}`);
    const queued = [{ text: "You can't even move a handspan with this load!", more: true }];
    if (dropLines.length) {
        queued.push({
            text: dropLines.join('  '),
            more: false,
            move: true,
            exercise: { attr: C.A_WIS, positive: true },
            visionRecalcBefore: form.noEyes,
            polyState: { uac: form.finalAc },
        });
    }
    game._more_message_queue = [...(game._more_message_queue || []), ...queued];
    game._pre_turn_more_waiting = true;
    game._monster_turn_paused_for_more = true;
    game.context.move = 1;
}

async function finishWizardPolyself(input) {
    const form = polyselfFormForInput(input);
    if (form === undefined) {
        await pline("I've never heard of such monsters.");
        game.context.move = 0;
        return;
    }
    if (!form) {
        await finishWizardNewman();
        return;
    }

    const queue = [];
    if (form.name === 'gnome') {
        const stats = rollPolyselfStats(form);
        applyPolyselfStats(form, stats);
        dropWornCloakForPolyself();
        await plineWithMorePrompt('You turn into a gnome!  You shrink out of your cloak!');
        queue.push({
            text: 'Your movements are slowed slightly because of your load.',
            more: false,
            polyState: { uac: form.finalAc },
        });
    } else if (form.name === 'red dragon') {
        const dropped = dropInventoryObjectToFloor(heroWieldedWeapon());
        const stats = rollPolyselfStats(form);
        applyPolyselfStats(form, stats);
        await plineWithMorePrompt(`You turn into a red dragon!${dropped ? '  You find you must drop your tool!' : ''}`);
        queue.push({
            text: 'Your movements are now unencumbered.',
            more: true,
            polyState: { uac: form.finalAc, uencumber: 0 },
        });
        queue.push({ text: 'Use the command #monster to use your breath weapon.', more: false });
    }
    if (queue.length) game._more_message_queue = [...(game._more_message_queue || []), ...queue];
    game._pre_turn_more_waiting = true;
    game._monster_turn_paused_for_more = true;
    game.context.move = 1;
}

function alignNameForHero() {
    const typ = game.u?.ualign?.type;
    if (typ > 0) return 'lawful';
    if (typ < 0) return 'chaotic';
    return 'neutral';
}

function prayerGodName() {
    return roleGod(game.urole, alignNameForHero());
}

function alignNameForType(typ) {
    if (typ > 0) return 'lawful';
    if (typ < 0) return 'chaotic';
    return 'neutral';
}

function prayerGodNameForAlign(typ) {
    return roleGod(game.urole, alignNameForType(typ));
}

function currentPrayerType() {
    // C ref: pray.c:can_pray(). This covers the ordinary no-altar,
    // no-trouble branches needed by current evidence.
    if ((game.u?.ublesscnt || 0) > 0) return 0;
    const alignment = game.u?.ualign?.record ?? 0;
    if ((game.u?.uluck || 0) < 0 || (game.u?.ugangr || 0) || alignment < 0) return 1;
    return 3;
}

function rememberPrayerStart() {
    game._prayer_alignment = game.u?.ualign?.type ?? 0;
    game._prayer_ptype = currentPrayerType();
}

function prayerTurnBudget() {
    // C refs: src/pray.c:dopray(), src/allmain.c:u_calc_moveamt().
    // Current movement accounting needs the longer budget for intrinsically
    // fast prayers so their extra movement allocation reaches prayer_done().
    return (game.u?.uprops?.fast || game.u?.uprops?.intrinsic_fast) ? 4 : 2;
}

function changeLuck(delta) {
    game.u = game.u || {};
    const next = (game.u.uluck || 0) + delta;
    game.u.uluck = Math.max(-10, Math.min(10, next));
}

const GOD_VOICES = ['booms out', 'thunders', 'rings out', 'booms'];
const PRAYER_DEVOUT = 14;
const PRAYER_STRIDENT = 4;

async function prayerResultPline(line) {
    if (game._suppress_prayer_result_messages) return;
    if (game._pack_next_prayer_result_line
        && topline_can_pack_message(game._pending_message, line)) {
        game._pack_next_prayer_result_line = false;
        await append_pline(line);
        return;
    }
    game._pack_next_prayer_result_line = false;
    await pline(line);
}

async function godVoice(alignment, words = null) {
    const voice = GOD_VOICES[rn2(GOD_VOICES.length)];
    const god = prayerGodNameForAlign(alignment);
    if (words) await prayerResultPline(`The voice of ${god} ${voice}: "${words}"`);
    else await prayerResultPline(`The voice of ${god} ${voice}: `);
}

function queuePrayerMoreMessages(messages) {
    if (game._suppress_prayer_result_messages) return;
    if (!Array.isArray(game._more_message_queue)) game._more_message_queue = [];
    game._more_message_queue.push(...messages);
    queue_more_prompt();
}

function adjustAttributeBasic(ndx, delta) {
    const u = game.u || (game.u = {});
    if (!u.acurr) u.acurr = { a: [] };
    if (!Array.isArray(u.acurr.a)) u.acurr.a = [];
    const current = u.acurr.a[ndx] ?? 10;
    u.acurr.a[ndx] = Math.max(3, current + delta);
    if (u.abase?.a) u.abase.a[ndx] = Math.max(3, (u.abase.a[ndx] ?? current) + delta);
}

function latchStatusAttrsForMoreFrame() {
    if (!Array.isArray(game.u?.acurr?.a)) return;
    game._latched_status_attrs = game.u.acurr.a.slice();
    game._clear_latched_status_attrs_after_more = true;
}

function clearLatchedStatusAttrsAfterMore() {
    if (!game._clear_latched_status_attrs_after_more) return;
    game._clear_latched_status_attrs_after_more = false;
    game._latched_status_attrs = null;
}

function loseExperienceLevelBasic() {
    // C ref: src/exper.c:losexp(NULL).  This covers the ordinary divine-anger
    // level-loss side effects; role intrinsic loss remains broader adjabil work.
    const u = game.u || (game.u = {});
    const oldLevel = u.ulevel || 1;
    if (oldLevel > 1) u.ulevel = oldLevel - 1;
    else u.uexp = 0;
    const level = u.ulevel || 1;

    const hpLoss = Number(u.uhpinc?.[level] ?? 0);
    if (typeof u.uhpmax === 'number') u.uhpmax = Math.max(1, u.uhpmax - hpLoss);
    if (typeof u.uhp === 'number') {
        u.uhp -= hpLoss;
        if (u.uhp < 1) u.uhp = 1;
        if (typeof u.uhpmax === 'number' && u.uhp > u.uhpmax) u.uhp = u.uhpmax;
    }

    const enLoss = Number(u.ueninc?.[level] ?? 0);
    if (typeof u.uenmax === 'number') u.uenmax = Math.max(0, u.uenmax - enLoss);
    if (typeof u.uen === 'number') {
        u.uen -= enLoss;
        if (u.uen < 0) u.uen = 0;
        if (typeof u.uenmax === 'number' && u.uen > u.uenmax) u.uen = u.uenmax;
    }

    if ((u.uexp || 0) > 0) u.uexp = newuexp(level) - 1;
}

async function angryGods(respGod) {
    // C ref: pray.c:angrygods().
    game.u = game.u || {};
    game.u.ublessed = 0;
    const luck = game.u.uluck || 0;
    const alignRecord = game.u.ualign?.record ?? 0;
    let maxanger;
    if (respGod !== (game.u.ualign?.type ?? 0)) {
        maxanger = Math.trunc(alignRecord / 2)
            + (luck > 0 ? Math.trunc(-luck / 3) : -luck);
    } else {
        maxanger = 3 * (game.u.ugangr || 0)
            + ((luck > 0 || alignRecord >= 4) ? Math.trunc(-luck / 3) : -luck);
    }
    if (maxanger < 1) maxanger = 1;
    else if (maxanger > 15) maxanger = 15;

    switch (rn2(maxanger)) {
    case 0:
    case 1:
        await prayerResultPline(`You feel that ${prayerGodNameForAlign(respGod)} is displeased.`);
        break;
    case 2:
    case 3:
        await godVoice(respGod);
        latchStatusAttrsForMoreFrame();
        adjustAttributeBasic(A_WIS, -1);
        loseExperienceLevelBasic();
        queuePrayerMoreMessages([
            {
                text: '"Thou art arrogant, mortal."  "Thou must relearn thy lessons!"',
                more: true,
            },
            { text: 'You feel foolish!', more: false },
        ]);
        break;
    case 4:
    case 5:
        await godVoice(respGod, 'Thou hast angered me.');
        if (rn2(2)) {
            // Full attrcurse/rndcurse side effects remain future prayer work.
        }
        break;
    default:
        await godVoice(respGod, 'Thou hast angered me.');
        break;
    }

    const newTimeout = rnz(300);
    if (newTimeout > (game.u.ublesscnt || 0)) game.u.ublesscnt = newTimeout;
}

async function godsUpset(respGod) {
    // C ref: pray.c:gods_upset().
    if (respGod === (game.u?.ualign?.type ?? 0)) {
        game.u.ugangr = (game.u.ugangr || 0) + 1;
    } else if (game.u?.ugangr) {
        game.u.ugangr--;
    }
    await angryGods(respGod);
}

function pleasedPrayerMood() {
    // C ref: pray.c:pleased().  The initial feedback is based on current
    // alignment record, before the later trouble/favor action roll.
    const record = game.u?.ualign?.record ?? 0;
    const hallucinating = !!(game.u?.uhallucination || game.u?.uprops?.hallucination);
    if (record >= PRAYER_DEVOUT) return hallucinating ? 'pleased as punch' : 'well-pleased';
    if (record >= PRAYER_STRIDENT) return hallucinating ? 'ticklish' : 'pleased';
    return hallucinating ? 'full' : 'satisfied';
}

function prayerHpDivisor(level) {
    if (level <= 5) return 5;
    if (level <= 13) return 6;
    if (level <= 21) return 7;
    if (level <= 29) return 8;
    return 9;
}

function prayerHasHpTrouble() {
    // C refs: pray.c:in_trouble(), pray.c:critically_low_hp().
    const hp = game.u?.uhp ?? 0;
    let hpmax = game.u?.uhpmax ?? hp;
    const level = game.u?.ulevel ?? game.u?.uxplevel ?? 1;
    hpmax = Math.min(hpmax, 15 * level);
    return hp <= 5 || hp * prayerHpDivisor(level) <= hpmax;
}

async function fixPrayerHpTrouble() {
    // C ref: pray.c:fix_worst_trouble(TROUBLE_HIT).
    await append_pline('You feel much better.');
    const u = game.u || (game.u = {});
    const level = u.ulevel ?? u.uxplevel ?? 1;
    let hpmax = u.uhpmax || 1;
    if (hpmax < level * 5 + 11) hpmax += rnd(5);
    u.uhpmax = Math.max(hpmax, 6);
    u.uhp = u.uhpmax;
}

export async function finishPrayerResult() {
    // C ref: pray.c:prayer_done().
    const ptype = game._prayer_ptype ?? 3;
    const alignment = game._prayer_alignment ?? (game.u?.ualign?.type ?? 0);
    game._prayer_ptype = null;
    game._prayer_alignment = null;

    if (ptype === 0) {
        game.u.ublesscnt = (game.u.ublesscnt || 0) + rnz(250);
        changeLuck(-3);
        await godsUpset(game.u?.ualign?.type ?? alignment);
    } else if (ptype === 1) {
        await angryGods(game.u?.ualign?.type ?? alignment);
    } else {
        const god = prayerGodNameForAlign(alignment);
        const hpTrouble = prayerHasHpTrouble();
        await prayerResultPline(`You feel that ${god} is ${pleasedPrayerMood()}.`);
        if ((game.u?.ualign?.record ?? 0) < 2) adjalign(1);
        let action = rn1(Math.max((game.u?.uluck ?? 0), -1) + 2, 1);
        action = Math.min(action, 3);
        if ((game.u?.ualign?.record ?? 0) < PRAYER_STRIDENT)
            action = ((game.u?.ualign?.record ?? 0) > 0 || !rnl(2)) ? 1 : 0;
        if (hpTrouble && action >= 1) await fixPrayerHpTrouble();
        game.u.ublesscnt = rnz(350);
    }
}

function finishDeferredSeerTurnUpdateAfterPrayer() {
    if (!game._prayer_done_more_deferred_seer) return;
    game._prayer_done_more_deferred_seer = false;
    if (!game._seer_turn_update_pending) return;
    game._seer_turn_update_pending = false;
    maybe_update_seer_turn(game.moves || 1);
}

// C ref: hack.c — check if a cell blocks movement
function blocksMove(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (IS_OBSTRUCTED(loc.typ) || loc.typ === C.IRONBARS) return true;
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) return true;
    return false;
}

function blockedMovementMessage(x, y) {
    // C ref: src/hack.c:test_move(DO_MOVE).  With `mention_walls`, bumping
    // ordinary obstructing terrain reports the remembered map feature.
    const loc = game.level?.at(x, y);
    if (loc?.typ === C.TREE) return "It's a tree.";
    if (loc?.typ === C.IRONBARS) return 'You cannot pass through the bars.';
    if (!loc || loc.typ === STONE || loc.typ === SCORR) return "It's solid stone.";
    if (loc.typ === SDOOR || IS_WALL(loc.typ)) return "It's a wall.";
    return '';
}

function cvt_sdoor_to_door_basic(loc) {
    // C ref: detect.c:cvt_sdoor_to_door().  Secret doors keep wall-mode bits
    // in doormask until found; exposing them yields a closed ordinary door.
    let newmask = ((loc?.doormask || 0) & ~C.WM_MASK) & ~C.D_SECRET;
    if (!(newmask & D_LOCKED)) newmask |= D_CLOSED;
    loc.typ = DOOR;
    loc.doormask = newmask;
    loc.flags = newmask;
}

async function mfind0_basic(mon, viaWarning = false) {
    if (!mon) return 0;
    if (viaWarning) return -1;
    const x = mon.mx;
    const y = mon.my;
    let foundSomething = false;
    if (mon.m_ap_type && mon.m_ap_type !== C.M_AP_NOTHING) {
        mon.m_ap_type = C.M_AP_NOTHING;
        mon.mappearance = 0;
        mon.msleeping = 0;
        mon.mundetected = 0;
        foundSomething = true;
    } else {
        foundSomething = !heroCanSpotMonsterForHit(mon);
        const flags1 = mon.data?.mflags1 ?? 0;
        const hider = !!(flags1 & M1_HIDE);
        const hidesUnder = !!(flags1 & M1_CONCEAL) || mon.data?.mlet === 'S_EEL';
        if (mon.mundetected && (hider || hidesUnder)) {
            mon.mundetected = 0;
            foundSomething = true;
        }
        newsym(x, y);
    }
    if (!foundSomething) return 0;
    if (!heroCanSpotMonsterForHit(mon) && game.level?.at(x, y)?.remembered_glyph?.ch === 'I')
        return -1;
    exercise(A_WIS, true);
    if (!heroCanSpotMonsterForHit(mon)) {
        mapInvisibleBasic(x, y);
        await pline('You feel an unseen monster!');
    } else {
        const name = monsterName(mon);
        await pline(`You find ${indefiniteArticle(name)} ${name}.`);
    }
    return 1;
}

export async function dosearch0_basic(aflag = false) {
    // C ref: detect.c:dosearch0().  This covers physical discovery of
    // adjacent secret doors, corridors, and hidden/unseen monsters.
    if (game.u?.uswallow) {
        if (!aflag) await pline('What are you looking for?  The exit?');
        return false;
    }
    let found = false;
    const fund = 0;
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    for (let x = ux - 1; x < ux + 2; x++) {
        for (let y = uy - 1; y < uy + 2; y++) {
            if (!C.isok(x, y) || (x === ux && y === uy)) continue;
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            if (!aflag && heroIsBlind()) feelLocationForSearchBasic(x, y);
            if (loc.typ === SDOOR) {
                if (rnl(7 - fund)) continue;
                cvt_sdoor_to_door_basic(loc);
                vision_reset();
                vision_recalc(0);
                exercise(A_WIS, true);
                newsym(x, y);
                await pline('You find a hidden door.');
                found = true;
            } else if (loc.typ === SCORR) {
                if (rnl(7 - fund)) continue;
                loc.typ = CORR;
                loc.flags = 0;
                vision_reset();
                vision_recalc(0);
                exercise(A_WIS, true);
                newsym(x, y);
                await pline('You find a hidden passage.');
                found = true;
            } else {
                const mon = mon_at(x, y);
                if (mon && !aflag) {
                    const mfres = await mfind0_basic(mon, false);
                    if (mfres === -1) continue;
                    if (mfres > 0) {
                        game.context.multi = 0;
                        game._simple_timed_repeats_remaining = 0;
                        return true;
                    }
                }
            }
        }
    }
    if (found) {
        game.context.multi = 0;
        game._simple_timed_repeats_remaining = 0;
    }
    return found;
}

function sobj_at_basic(otyp, x, y) {
    return (game.level?.objects || []).find(o => o.otyp === otyp && o.ox === x && o.oy === y) || null;
}

function boulderDestinationBlocked(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (IS_OBSTRUCTED(loc.typ) || IS_WALL(loc.typ)) return true;
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) return true;
    return !!sobj_at_basic(BOULDER, x, y);
}

function mapInvisibleBasic(x, y) {
    if (x === game.u?.ux && y === game.u?.uy) return;
    const loc = game.level?.at(x, y);
    if (loc) loc.remembered_glyph = { ch: 'I', color: NO_COLOR, decgfx: false };
    show_glyph_cell(x, y, 'I', NO_COLOR, false);
}

function feelLocationForSearchBasic(x, y) {
    // C refs: src/detect.c:dosearch0(), src/display.c:feel_location().
    // Blind explicit search tactually refreshes adjacent object/terrain
    // memory before hidden-monster discovery can draw on top of it.
    if (game.u?.uprops?.levitation || game.u?.uprops?.flying) return;
    const loc = game.level?.at(x, y);
    if (!loc) return;
    if (loc.remembered_glyph?.ch === 'I' && mon_at(x, y)) return;
    const covered = mappingForegroundCovered(loc);
    const obj = (game.level?.objects || []).find(o => o.ox === x && o.oy === y);
    const trap = (game.level?.traps || []).find(t => t.tx === x && t.ty === y);
    const ep = engravingAt(x, y);
    let glyph;
    if (obj && !covered) glyph = object_glyph_for_menu(obj);
    else if (trap?.tseen && !covered) glyph = mappedTrapGlyph(trap);
    else if (ep?.erevealed && mappingSpotShowsEngraving(loc) && !covered) glyph = mappedEngravingGlyph(loc);
    else glyph = terrain_glyph(loc, x, y);

    const decgfx = !!(glyph.dec ?? glyph.decgfx);
    if (game.level?.flags?.hero_memory)
        loc.remembered_glyph = { ch: glyph.ch, color: glyph.color, decgfx };
    show_glyph_cell(x, y, glyph.ch, glyph.color, decgfx);
}

function shouldShowBoulderPushMessage(boulder) {
    // C ref: hack.c:dopush() suppresses repeated messages for the same
    // boulder until enough turns have passed.
    const now = game.moves || 0;
    if (game._bldrpush_obj !== boulder) {
        game._bldrpush_obj = boulder;
        game._bldrpushtime = now + 1;
    }
    const show = now > (game._bldrpushtime || 0) + 2
        || now < (game._bldrpushtime || 0);
    game._bldrpushtime = now;
    return show;
}

async function tryPushBoulder(boulder, sx, sy, dx, dy) {
    const rx = sx + dx;
    const ry = sy + dy;
    if (boulderDestinationBlocked(rx, ry)) {
        await pline('You try to move the boulder, but in vain.');
        game.context.move = 0;
        return false;
    }
    const destMon = mon_at(rx, ry);
    if (destMon) {
        // C ref: hack.c:moverock_core().  A monster behind the boulder blocks
        // the push before the boulder moves or a turn is spent.
        const monVisible = cansee(rx, ry) && !destMon.mundetected
            && !(destMon.minvis && !(game.u?.usee_invisible || game.u?.uprops?.see_invisible));
        if (monVisible) {
            const name = monsterName(destMon);
            await pline(`There's ${indefiniteArticle(name)} ${name} on the other side.`);
        } else {
            await pline('You hear a monster behind the boulder.');
            mapInvisibleBasic(rx, ry);
        }
        game._after_more_message = 'Perhaps that\'s why you cannot move it.';
        game._after_more_needs_prompt = false;
        queue_more_prompt();
        game.context.move = 0;
        return false;
    }

    if (shouldShowBoulderPushMessage(boulder))
        await pline('With great effort you move the boulder.');
    exercise(A_STR, true);
    boulder.ox = rx;
    boulder.oy = ry;
    if (game.context?.run) game._run_stop_after_move = true;
    vision_reset();

    const u = game.u;
    const oldx = u.ux, oldy = u.uy;
    u.ux0 = oldx;
    u.uy0 = oldy;
    u.ux = sx;
    u.uy = sy;
    newsym(oldx, oldy);
    newsym(rx, ry);
    vision_recalc(1);
    newsym(rx, ry);
    refreshWarningAfterHeroMove();
    newsym(sx, sy);
    return true;
}

function mon_at(x, y) {
    return (game.level?.monsters || []).find((mon) =>
        mon !== game.u?.usteed && mon.mx === x && mon.my === y);
}

function namedMonsterDisplayName(mon) {
    if (!C.has_mgivenname(mon)) return '';
    const name = C.MGIVENNAME(mon);
    // C ref: do_name.c:x_monnam().  Named ghosts are rendered as
    // "<player>'s ghost" and do not receive an article.
    if (mon?.data?.name === 'GHOST') return `${possessiveName(name)} ghost`;
    return name;
}

function monsterName(mon) {
    return namedMonsterDisplayName(mon)
        || String(mon?.data?.name || 'monster').toLowerCase().replaceAll('_', ' ');
}

function farlookMonsterDescription(mon, x, y) {
    // C ref: pager.c:look_at_monster().  Farlook describes the monster
    // occupying the selected glyph before falling back to terrain.
    const tailPrefix = (mon.mx !== x || mon.my !== y)
        ? (mon.isshk ? 'tail of ' : 'tail of a ')
        : '';
    const attitudePrefix = mon.mtame ? 'tame ' : mon.mpeaceful ? 'peaceful ' : '';
    const name = mon.isshk ? shkname(mon) : monsterName(mon);
    let desc = `${tailPrefix}${attitudePrefix}${name}`;
    if (mon.mfrozen) desc += ", can't move (paralyzed or sleeping or busy)";
    else if (mon.msleeping) desc += ', asleep';
    if (mon.mleashed) desc += ', leashed to you';
    return desc;
}

function monnam(mon) {
    const name = monsterHitName(mon);
    return name.replace(/^./, c => c.toUpperCase());
}

async function chatMonsterNoise(mon) {
    // C ref: sounds.c:dochat()/domonnoise(), MS_BARK.
    if (mon?.data?.mlet === 'S_DOG') {
        const hungrytime = mon.edog?.hungrytime ?? 0;
        let verb = 'barks';
        if (mon.mpeaceful) {
            if (mon.mtame && (mon.mconf || mon.mflee || mon.mtrapped
                || (game.moves || 0) > hungrytime || mon.mtame < 5)) {
                verb = 'whines';
            } else if (mon.mtame && hungrytime > (game.moves || 0) + 1000) {
                verb = 'yips';
            } else if (monsterName(mon) === 'dingo') {
                verb = '';
            }
        } else {
            verb = 'growls';
        }
        if (verb) await pline(`${monnam(mon)} ${verb}${verb === 'growls' && !mon.mpeaceful ? '!' : '.'}`);
        return true;
    }
    return false;
}

function monsterHitName(mon) {
    // C ref: src/do_name.c:mon_nam().  With ARTICLE_THE, an unspotted
    // monster is "it" even if the hero knows its remembered glyph/name.
    if (!heroCanNameMonsterForHit(mon)) return 'it';
    if (game.u?.uhallucination || game.u?.uprops?.hallucination) {
        // C ref: do_name.c:x_monnam(ARTICLE_THE) -> rndmonnam().
        return randomHallucinatedMonsterName('the');
    }
    if (mon?.isshk) return shkname(mon);
    const named = namedMonsterDisplayName(mon);
    if (named) return named;
    return `the ${monsterName(mon)}`;
}

function monsterKillName(mon) {
    if (mon?.mtame && (game.u?.uhallucination || game.u?.uprops?.hallucination)) {
        // C ref: mon.c:xkilled() passes adjective "poor" to x_monnam().
        return `the poor ${randomHallucinatedMonsterName('')}`;
    }
    return monsterHitName(mon);
}

function monsterKillVerb(mon) {
    // C ref: src/mon.c:xkilled().  Nonliving monsters are destroyed.
    const ptr = mon?.data;
    if ((ptr?.mflags2 ?? 0) & M2_UNDEAD) return 'destroy';
    if (ptr?.name === 'MANES' || ptr?.mlet === 'S_GOLEM' || ptr?.mlet === 'S_VORTEX')
        return 'destroy';
    return 'kill';
}

function verboseMessagesEnabled() {
    return game.flags?.verbose !== false;
}

function monsterVisibleForHero(mon) {
    // C ref: include/display.h:mon_visible().
    if (!mon || mon.mundetected) return false;
    if (mon._opened_unseen_door) return false;
    if (mon.minvis && !heroSeesInvisible()) return false;
    return true;
}

function heroSeesMonsterLocation(mon) {
    // C ref: include/display.h:canseemon(), including infravision.
    const blind = game.u?.ublind || game.u?.uprops?.blind || game.u?.uprops?.blinded;
    if (blind) return false;
    if (cansee(mon.mx, mon.my)) return true;
    return !!(game.u?.uprops?.infravision
        && (mon.data?.mflags3 & C.M3_INFRAVISIBLE)
        && couldsee(mon.mx, mon.my));
}

function heroCanSpotMonsterForHit(mon) {
    // C refs: include/display.h:canspotmon(), do_name.c:x_monnam().
    if (!mon) return false;
    if (game.u?.uswallow && game.u?.ustuck === mon) return false;
    return monsterVisibleForHero(mon) && heroSeesMonsterLocation(mon);
}

function heroCanNameMonsterForHit(mon) {
    // C ref: src/uhitm.c:hmon_hitmon_msg_hit().  A swallowed attacker is
    // still named by mon_nam(), but canseemon() is false for exclam(dmg).
    if (!mon) return false;
    if (game.u?.uswallow && game.u?.ustuck === mon) return true;
    return heroCanSpotMonsterForHit(mon);
}

function heroHitExclam(mon, damage) {
    // C ref: src/uhitm.c:hmon_hitmon_msg_hit().  Hand-to-hand hits use
    // exclam(dmg) only when canseemon(mon); swallowed or blind hits use ".".
    return heroCanSpotMonsterForHit(mon) ? (damage <= 4 ? '.' : '!') : '.';
}

function heroMeleeHitMessage(mon, damage) {
    // C ref: src/uhitm.c:hmon_hitmon_msg_hit().
    if (!verboseMessagesEnabled()) return 'You hit it.';
    return `You hit ${monsterHitName(mon)}${heroHitExclam(mon, damage)}`;
}

function heroMeleeMissMessage(mon) {
    // C ref: src/uhitm.c:missum().
    if (!verboseMessagesEnabled()) return 'You miss it.';
    return `You miss ${monsterHitName(mon)}.`;
}

function monsterHelpless(mon) {
    return !!mon?.msleeping || mon?.mcanmove === 0 || !!mon?.mfrozen;
}

async function plineOrAppend(line) {
    if (game._pending_message) await append_pline(line);
    else await pline(line);
}

async function maybeCheckCaitiff(mon) {
    // C ref: uhitm.c:check_caitiff(), called from find_roll_to_hit() before
    // the first attack roll.  The warning is a real topline message and the
    // alignment adjustment is part of the role behavior, not just flavor.
    if ((game.u?.ualign?.record ?? 0) <= -10) return;
    const role = game.urole?.name?.m || '';
    const lawful = (game.u?.ualign?.type ?? 0) === C.A_LAWFUL;
    const undead = !!((mon?.data?.mflags2 ?? 0) & M2_UNDEAD);
    if (role === 'Knight' && lawful && !undead
        && (monsterHelpless(mon) || (mon?.mflee && !mon?.mavenge))) {
        await plineOrAppend('You caitiff!');
        adjalign(-1);
    } else if (role === 'Samurai' && mon?.mpeaceful) {
        await plineOrAppend('You dishonorably attack the innocent!');
        adjalign(-1);
    }
}

function wakeupMessage(mon, interesting = true) {
    const name = monsterHitName(mon);
    const monName = name ? name.charAt(0).toUpperCase() + name.slice(1) : 'It';
    const extra = mon?.data?.name === 'FLESH_GOLEM' ? " It's alive!" : '';
    return `${monName} wakes up${interesting ? '!' : '.'}${extra}`;
}

function findLevelMonsterById(id) {
    if (!id) return null;
    return (game.level?.monsters || []).find((mon) => mon?.m_id === id) || null;
}

function growlSoundVerb(mon) {
    // C ref: src/sounds.c:growl_sound().
    switch (mon?.data?.msound ?? MS_SILENT) {
    case MS_MEW:
    case MS_HISS:
        return 'hiss';
    case MS_BARK:
    case MS_GROWL:
        return 'growl';
    case MS_ROAR:
        return 'roar';
    case MS_BELLOW:
        return 'bellow';
    case MS_BUZZ:
        return 'buzz';
    case MS_SQEEK:
        return 'squeal';
    case MS_SQAWK:
        return 'screech';
    case MS_NEIGH:
        return 'neigh';
    case MS_WAIL:
        return 'wail';
    case MS_GROAN:
        return 'groan';
    case MS_MOO:
        return 'low';
    case MS_SILENT:
        return 'commotion';
    default:
        return 'scream';
    }
}

function heroIsDeaf() {
    return !!(game.u?.uprops?.deaf || game.u?.udeaf);
}

function wakeNearToMessages(x, y, distance) {
    // C ref: src/mon.c:wake_nearto_core().  Noise wakes indeterminate sleep
    // for every nearby monster; visible sleepers also get wake_msg(FALSE).
    const messages = [];
    for (const other of game.level?.monsters || []) {
        if (!other) continue;
        if (distance !== 0 && dist2(other.mx, other.my, x, y) >= distance) continue;
        if (other.msleeping && heroCanSpotMonsterForHit(other))
            messages.push(wakeupMessage(other, false));
        other.msleeping = 0;
        other.mstrategy = (other.mstrategy || 0) & ~C.STRAT_WAITMASK;
    }
    return messages;
}

function attackWakeupContinuationMessage(mon) {
    // C refs: src/mon.c:wakeup(), src/sounds.c:growl().
    if (!mon || monsterHelpless(mon) || (mon.data?.msound ?? MS_SILENT) === MS_SILENT)
        return '';
    const messages = [];
    if (heroCanSpotMonsterForHit(mon) || !heroIsDeaf())
        messages.push(`${monnam(mon)} ${vtenseThirdPerson(growlSoundVerb(mon))}!`);
    const distance = (mon.data?.mlevel ?? mon.m_lev ?? 0) * 18;
    messages.push(...wakeNearToMessages(mon.mx, mon.my, distance));
    return messages.join('  ');
}

function queueAttackWakeupContinuation(mon) {
    if (!mon?.m_id) return;
    game._attack_wakeup_after_more = mon.m_id;
}

function startMonsterFleeingBasic(mon, fleetime = 0, first = false) {
    // C ref: src/monmove.c:monflee().  This keeps the state/timer semantics
    // needed by combat and movement; visible flee plines remain in the
    // caller-specific backlog.
    if (!mon) return;
    if (!first || !mon.mflee) {
        if (!fleetime) {
            mon.mfleetim = 0;
        } else if (!mon.mflee || mon.mfleetim) {
            let total = fleetime + (mon.mfleetim || 0);
            if (total === 1) total++;
            mon.mfleetim = Math.min(total, 127);
        }
        mon.mflee = true;
    }
    mon.mtrack = [];
}

function maybeWoundedMonsterFleesAfterHeroHit(mon, woundRoll) {
    // C ref: src/uhitm.c:known_hitum().  Surviving low-HP monsters have a
    // small chance to start fleeing after hmon() has handled hit messages,
    // wakeup, and knockback.
    if (woundRoll) return;
    if (!mon || typeof mon.mhp !== 'number' || typeof mon.mhpmax !== 'number') return;
    if (mon.mhp >= Math.trunc(mon.mhpmax / 2)) return;
    if (game.u?.uswallow && game.u?.ustuck === mon) return;
    const timerRoll = rn2(3);
    const fleetime = timerRoll ? 0 : rnd(100);
    startMonsterFleeingBasic(mon, fleetime, false);
    if (game.u?.ustuck === mon && !game.u?.uswallow)
        game.u.ustuck = null;
}

function finishHeroMeleePostHitFrontdoor(mon = null, state = {}) {
    // C refs: src/uhitm.c:hmon_hitmon() -> mhitm_knockback(),
    // src/uhitm.c:known_hitum(), src/uhitm.c:passive().
    if (state.maybeKnockback) heroMeleeKnockbackFrontdoor();
    const woundRoll = rn2(25);
    maybeWoundedMonsterFleesAfterHeroHit(mon, woundRoll);
    rn2(3);
}

function queueHeroMeleePostWakeupMore(mon, state = {}) {
    const queued = {
        monId: mon?.m_id || 0,
        maybeKnockback: !!state.maybeKnockback,
    };
    game._hero_melee_post_wakeup_more = queued;
    game._hero_melee_post_wakeup_steal_tail = queued;
}

function finishQueuedHeroMeleePostWakeupMore() {
    const state = game._hero_melee_post_wakeup_more;
    game._hero_melee_post_wakeup_more = null;
    if (!state) return false;
    finishHeroMeleePostHitFrontdoor(findLevelMonsterById(state.monId), state);
    return true;
}

function finishQueuedHeroMeleeWakeupKnockbackOnly() {
    const state = game._hero_melee_post_wakeup_more;
    game._hero_melee_post_wakeup_more = null;
    if (!state) return false;
    if (state.maybeKnockback) heroMeleeKnockbackFrontdoor();
    return true;
}

async function wakeupMonsterByAttack(mon) {
    if (!mon) return false;
    // C refs: src/mon.c:wakeup(), src/mon.c:setmangry().
    const wasSleeping = !!mon.msleeping;
    const visible = heroCanSpotMonsterForHit(mon);
    let queuedMore = false;
    if (wasSleeping && visible) {
        await plineOrAppend(wakeupMessage(mon, true));
        queueAttackWakeupContinuation(mon);
        queue_more_prompt();
        game._pre_turn_more_waiting = true;
        game._monster_turn_paused_for_more = true;
        queuedMore = true;
    }
    mon.mstrategy = (mon.mstrategy || 0) & ~C.STRAT_WAITMASK;
    mon.msleeping = 0;
    if (mon.m_ap_type === C.M_AP_NOTHING && mon.mundetected) {
        mon.mundetected = 0;
        newsym(mon.mx, mon.my);
    }
    if (!mon.mpeaceful || mon.mtame) return queuedMore;
    mon.mpeaceful = 0;
    if (mon.ispriest) adjalign(-5);
    else adjalign(-1);
    if (game._pending_message) await append_pline(`${monnam(mon)} gets angry!`);
    else await pline(`${monnam(mon)} gets angry!`);
    if (game._more) {
        game._pre_turn_more_waiting = true;
        game._monster_turn_paused_for_more = true;
    }
    return queuedMore;
}

const HALLUCINATED_PET_SOUNDS = [
    'beep', 'boing', 'sing', 'belche', 'creak', 'cough',
    'rattle', 'ululate', 'pop', 'jingle', 'sniffle', 'tinkle',
    'eep', 'clatter', 'hum', 'sizzle', 'twitter', 'wheeze',
    'rustle', 'honk', 'lisp', 'yodel', 'coo', 'burp',
    'moo', 'boom', 'murmur', 'oink', 'quack', 'rumble',
    'twang', 'toot', 'gargle', 'hoot', 'warble',
];

function vtenseThirdPerson(verb) {
    if (/(?:s|x|z|ch|sh)$/.test(verb)) return `${verb}es`;
    if (verb.endsWith('e')) return `${verb}s`;
    return `${verb}s`;
}

async function maybePetAbuseSound(mon) {
    if (!(game.u?.uhallucination || game.u?.uprops?.hallucination)) return false;
    const verb = HALLUCINATED_PET_SOUNDS[rn2(HALLUCINATED_PET_SOUNDS.length)];
    const subject = randomHallucinatedMonsterName('the');
    const line = `${subject.slice(0, 1).toUpperCase()}${subject.slice(1)} ${vtenseThirdPerson(verb)}!`;
    await pline(line);
    return true;
}

const MONSTER_AC = new Map([
    ['grid bug', 9],
    // C ref: include/monsters.h small mimic LVL(7, 3, 7, 0, 0).
    ['small mimic', 7],
]);

const VERY_SMALL_MONSTERS = new Set([
    'giant ant', 'killer bee', 'soldier ant', 'fire ant', 'queen bee',
    'acid blob', 'chickatrice', 'homunculus', 'imp', 'leprechaun',
    'sewer rat', 'giant rat', 'rabid rat', 'wererat', 'cave spider',
    'centipede', 'grid bug', 'xan', 'bat', 'garter snake',
    'newt', 'gecko', 'iguana', 'lizard', 'chameleon',
]);

const WEAPON_SMALL_DAMAGE_DIE = new Map([
    [SCALPEL, 3],
    // C ref: include/objects.h WEAPON("long sword", ... oc_wsdam=8).
    [LONG_SWORD, 8],
]);

const WEAPON_LARGE_DAMAGE_DIE = new Map([
    [SCALPEL, 3],
    // C ref: include/objects.h WEAPON("long sword", ... oc_wldam=12).
    [LONG_SWORD, 12],
]);

const BIMANUAL_MELEE_WEAPONS = new Set([
    BATTLE_AXE, TWO_HANDED_SWORD, TSURUGI, DWARVISH_MATTOCK,
]);

const WEAPON_HIT_BONUS = new Map([
    // C ref: include/objects.h WEAPON(... hitbon ...), weapon.c:hitval().
    [DART, 2],
    [DAGGER, 2],
    [ELVEN_DAGGER, 2],
    [ORCISH_DAGGER, 2],
    [SCALPEL, 2],
]);

function monsterArmorClass(mon) {
    const name = monsterName(mon);
    return mon?.mac ?? mon?.ac ?? mon?.data?.ac ?? MONSTER_AC.get(name) ?? 10;
}

function heroAttackAttributeBonus() {
    // C ref: src/weapon.c:abon().
    const str = currentAttr(A_STR);
    const dex = currentAttr(A_DEX);
    let sbon;
    if (str < 6) sbon = -2;
    else if (str < 8) sbon = -1;
    else if (str < 17) sbon = 0;
    else if (str < 19) sbon = 1;
    else sbon = 2;
    if ((game.u?.ulevel ?? 1) < 3) sbon++;
    if (dex < 4) return sbon - 3;
    if (dex < 6) return sbon - 2;
    if (dex < 8) return sbon - 1;
    if (dex < 14) return sbon;
    return sbon + dex - 14;
}

function heroLuckHitBonus() {
    const luck = game.u?.uluck || 0;
    if (!luck) return 0;
    return Math.sign(luck) * Math.trunc((Math.abs(luck) + 2) / 3);
}

function heroUsesMartialArts() {
    // C ref: include/skills.h:martial_bonus().
    const role = game.urole?.name?.m;
    return (role === 'Monk' || role === 'Samurai') && !game.u?._poly_form;
}

function heroBareHandSkillLevel() {
    // C ref: src/weapon.c:skill_init().  Roles whose bare-handed maximum is
    // above Expert start at Basic martial arts; ordinary bare hands remain
    // unskilled until the broader skill table is modeled.
    return heroUsesMartialArts() ? C.P_BASIC : C.P_UNSKILLED;
}

function heroBareHandHitBonus() {
    // C ref: src/weapon.c:weapon_hit_bonus().
    const skill = Math.max(heroBareHandSkillLevel(), C.P_UNSKILLED) - 1;
    return Math.trunc(((skill + 2) * (heroUsesMartialArts() ? 2 : 1)) / 2);
}

function heroBareHandDamageBonus() {
    // C ref: src/weapon.c:weapon_dam_bonus().
    const skill = Math.max(heroBareHandSkillLevel(), C.P_UNSKILLED) - 1;
    return Math.trunc(((skill + 1) * (heroUsesMartialArts() ? 3 : 1)) / 2);
}

function weaponHitBonusForMelee(weapon) {
    // C ref: src/weapon.c:weapon_hit_bonus().  The current JS skill model is
    // shallow; represent unarmed skill and the two-weapon penalty needed by
    // the ordinary uhitm() front door.
    if (!weapon) return heroBareHandHitBonus();
    if (game.u?.twoweap && (weapon === heroPrimaryWeapon() || weapon === heroSecondaryWeapon()))
        return -9;
    return 0;
}

function weaponObjectHitBonus(weapon) {
    return WEAPON_HIT_BONUS.get(weapon?.otyp) || 0;
}

function heroMeleeToHit(mon, weapon = heroWieldedWeapon()) {
    // C ref: src/uhitm.c:find_roll_to_hit().
    let tmp = 1 + heroAttackAttributeBonus() + monsterArmorClass(mon)
        + (game.u?.uhitinc || 0) + heroLuckHitBonus()
        + (game.u?.ulevel ?? 1);
    if (mon?.mstun) tmp += 2;
    if (mon?.mflee) tmp += 2;
    if (mon?.msleeping) tmp += 2;
    if (mon?.mcanmove === 0) tmp += 4;
    if (game.urole?.name?.m === 'Monk' && !game.u?._poly_form) {
        // C ref: src/uhitm.c:find_roll_to_hit().  Unarmored, weaponless
        // Monks get a role to-hit bonus before martial arts skill applies.
        if (wornArmorInRange(GRAY_DRAGON_SCALE_MAIL, ROBE - 1)) tmp -= 20;
        else if (!heroWieldedWeapon() && !wornShieldObject())
            tmp += Math.trunc((game.u?.ulevel ?? 1) / 3) + 2;
    }
    if (weapon) tmp += (weapon.spe || 0) + weaponObjectHitBonus(weapon);
    tmp += weaponHitBonusForMelee(weapon);
    return tmp;
}

function heroWieldedWeapon() {
    return (game.inventory || []).find((obj) => obj?.wielded || ((obj?.owornmask || 0) & C.W_WEP));
}

function setHeroWieldedWeapon(obj) {
    for (const item of game.inventory || []) {
        if (!item) continue;
        item.wielded = false;
        item.owornmask = (item.owornmask || 0) & ~C.W_WEP;
    }
    if (!obj) return;
    obj.wielded = true;
    obj.alternate = false;
    obj.owornmask = ((obj.owornmask || 0) & ~C.W_SWAPWEP) | C.W_WEP;
}

function heroMeleeDamageDie(mon, weapon = heroWieldedWeapon()) {
    // C ref: src/uhitm.c:hmon_hitmon_barehands().
    if (!weapon) return heroUsesMartialArts() ? 4 : 2;
    // C ref: src/weapon.c:dmgval(), include/mondata.h:bigmonst().
    if ((mon?.data?.msize ?? 0) >= MZ_LARGE)
        return WEAPON_LARGE_DAMAGE_DIE.get(weapon?.otyp) || WEAPON_SMALL_DAMAGE_DIE.get(weapon?.otyp) || 6;
    return WEAPON_SMALL_DAMAGE_DIE.get(weapon?.otyp) || 6;
}

function heroStrengthDamageBonus() {
    // C ref: src/weapon.c:dbon().
    const str = currentAttr(A_STR);
    if (str < 6) return -1;
    if (str < 16) return 0;
    if (str < 18) return 1;
    if (str === 18) return 2;
    if (str <= C.STR18(75)) return 3;
    if (str <= C.STR18(90)) return 4;
    if (str < C.STR18(100)) return 5;
    return 6;
}

function heroMeleeStrengthDamageBonus(weapon) {
    let bonus = heroStrengthDamageBonus();
    if (!bonus) return 0;
    const sign = Math.sign(bonus);
    const abs = Math.abs(bonus);
    if (game.u?.twoweap && (weapon === heroPrimaryWeapon() || weapon === heroSecondaryWeapon()))
        return Math.trunc((3 * abs + 2) / 4) * sign;
    if (!game.u?.twoweap && weapon === heroPrimaryWeapon() && BIMANUAL_MELEE_WEAPONS.has(weapon?.otyp))
        return Math.trunc((3 * abs + 1) / 2) * sign;
    return bonus;
}

function heroMeleeKnockbackFrontdoor() {
    // C ref: src/uhitm.c:hmon_hitmon() -> mhitm_knockback().
    rn2(3);
    rn2(6);
}

function heroMeleeDamageBonus(weapon = heroWieldedWeapon()) {
    // C ref: src/uhitm.c:hmon_hitmon_dmg_recalc().
    const skillBonus = weapon ? 0 : heroBareHandDamageBonus();
    return (game.u?.udaminc || 0) + heroMeleeStrengthDamageBonus(weapon) + skillBonus;
}

function heroMeleeDamage(mon, weapon = heroWieldedWeapon()) {
    let damage = rnd(heroMeleeDamageDie(mon, weapon));
    if (weapon && typeof weapon.spe === 'number')
        damage = Math.max(0, damage + weapon.spe);
    return Math.max(1, damage + heroMeleeDamageBonus(weapon));
}

function doorwayBlocksDiagonalForHero(loc) {
    return loc && loc.typ === DOOR && (loc.doormask & ~C.D_BROKEN);
}

function currentAttr(index) {
    return game.u?.acurr?.a?.[index] ?? 10;
}

function kickDamageDie() {
    return currentAttr(A_CON) > 15 ? 3 : 5;
}

function doorIsShopDoor(x, y) {
    return inRoomsAt(x, y).some((roomno) => isShopRoomNo(roomno));
}

async function kickOuch(x, y, kickobjnam = '') {
    // C ref: dokick.c:kick_ouch().
    await pline('Ouch!  That hurts!');
    exercise(A_DEX, false);
    exercise(A_STR, false);
    if (C.isok(x, y)) {
        for (const mon of game.level?.monsters || []) {
            if (dist2(x, y, mon.mx, mon.my) <= 25) mon.msleeping = false;
        }
    }
    if (!rn2(3)) setWoundedLegs('right', 5 + rnd(5));
    const damage = rnd(kickDamageDie());
    const halfPhysical = !!game.u?.uprops?.half_physical_damage;
    const finalDamage = halfPhysical ? Math.trunc((damage + 1) / 2) : damage;
    if (typeof game.u?.uhp === 'number')
        game.u.uhp = Math.max(0, game.u.uhp - finalDamage);
}

async function kickDumb(x, y) {
    // C ref: dokick.c:kick_dumb().
    exercise(A_DEX, false);
    if (currentAttr(A_DEX) >= 16 || rn2(3)) {
        await pline('You kick at empty space.');
    } else {
        await pline('Dumb move!  You strain a muscle.');
        exercise(A_STR, false);
        setWoundedLegs('right', 5 + rnd(5));
    }
}

async function kickDoor(x, y, loc) {
    // C ref: dokick.c:kick_door().  Door kicks exercise Dex before the
    // force-open test; a failed kick exercises Str and prints Thwack/Whammm.
    exercise(A_DEX, true);
    const avrgAttrib = Math.trunc((currentAttr(A_STR) + currentAttr(A_DEX) + currentAttr(A_CON)) / 3);
    if (rnl(35) < avrgAttrib) {
        const shatters = currentAttr(A_STR) > 18 && !rn2(5) && !doorIsShopDoor(x, y);
        loc.doormask = shatters ? C.D_NODOOR : C.D_BROKEN;
        loc.flags = loc.doormask;
        newsym(x, y);
        vision_reset();
        vision_recalc(0);
        await pline(shatters
            ? 'As you kick the door, it shatters to pieces!'
            : 'As you kick the door, it crashes open!');
        exercise(A_STR, true);
        game._pet_combat_pending_boundary = true;
    } else {
        exercise(A_STR, true);
        await pline(`${!rn2(3) ? 'Thwack' : 'Whammm'}!!`);
    }
}

async function kickDirection(ch) {
    // C ref: dokick.c:dokick(), dokick.c:kick_nondoor().
    const dx = DIR_DX[ch] || 0;
    const dy = DIR_DY[ch] || 0;
    if (!dx && !dy) {
        game.context.move = 0;
        return;
    }
    const x = (game.u?.ux ?? 0) + dx;
    const y = (game.u?.uy ?? 0) + dy;
    game._kickedloc = { x, y };
    game._command_was_kick = true;
    for (const mon of game.level?.monsters || []) {
        if (dist2(game.u?.ux ?? 0, game.u?.uy ?? 0, mon.mx, mon.my) <= 25)
            mon.msleeping = false;
    }
    if (!C.isok(x, y)) {
        await kickOuch(x, y);
        game.context.move = 1;
        return;
    }
    const loc = game.level?.at(x, y);
    if (mon_at(x, y)) {
        game.context.move = 0;
        await pline('You kick at empty space.');
        return;
    }
    if (loc?.typ === DOOR) {
        await kickDoor(x, y, loc);
    } else if (loc && (loc.typ === SDOOR || loc.typ === SCORR
        || loc.typ === C.STAIRS || loc.typ === C.LADDER
        || C.IS_STWALL(loc.typ))) {
        await kickOuch(x, y);
    } else {
        await kickDumb(x, y);
    }
    game.context.move = 1;
}

async function tryAutoOpenDoor(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || loc.typ !== DOOR || !(loc.doormask & D_CLOSED) || (loc.doormask & D_LOCKED)) return false;
    const threshold = Math.trunc((currentAttr(A_STR) + currentAttr(A_DEX) + currentAttr(A_CON)) / 3);
    if (rnl(20) < threshold) {
        loc.doormask = C.D_ISOPEN;
        loc.flags = C.D_ISOPEN;
        newsym(x, y);
        vision_reset();
        vision_recalc(0);
        await pline('The door opens.');
    } else {
        exercise(A_STR, true);
        await pline('The door resists!');
    }
    game.context.move = 0;
    return true;
}

async function bumpClosedDoor(dx, dy) {
    if (dx && dy) {
        await pline("You can't move diagonally into an intact doorway.");
        game.context.move = 0;
        return false;
    }
    if (currentAttr(A_DEX) < 10) {
        await pline('Ouch!  You bump into a door.');
        exercise(A_DEX, false);
        if (game.context?.run) game._run_stop_after_move = true;
        game.context.move = 1;
        return true;
    }
    await pline('That door is closed.');
    game.context.move = 0;
    return false;
}

function runShouldStopAfterMove(source, target, run = game.context?.run) {
    if (hostileMonsterNearHeroForRunStop(run)) return true;
    // C ref: hack.c:lookaround().  Travel (`context.travel`, run mode 8)
    // does not stop just because the chosen path crosses a doorway or leaves
    // a corridor; findtravelpath()/lookaround() own travel continuation.
    if (run?.travel) return false;
    if ([C.FOUNTAIN, C.SINK, C.ALTAR, C.THRONE, C.GRAVE].includes(target?.typ)) return true;
    return target?.typ === DOOR || (source?.typ === CORR && target?.typ === C.ROOM);
}

function runStepIsOpen(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    if (sobj_at_basic(BOULDER, x, y)) return true;
    if (mon_at(x, y)) return false;
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) return true;
    return !blocksMove(x, y);
}

function maybeTurnCorridorRun(run) {
    if (!run || run.travel) return;
    if (!run.allowTurns) return;
    const u = game.u;
    if (!u) return;
    const current = game.level?.at(u.ux, u.uy);
    if (!current || current.typ === C.ROOM) return;
    const desiredX = u.ux + run.dx;
    const desiredY = u.uy + run.dy;
    if (runStepIsOpen(desiredX, desiredY)) return;

    let corrct = 0;
    let noturn = false;
    let x0 = 0;
    let y0 = 0;
    let m0 = 1;
    let i0 = 9;
    for (let nx = u.ux - 1; nx <= u.ux + 1; nx++) {
        for (let ny = u.uy - 1; ny <= u.uy + 1; ny++) {
            if (nx === u.ux && ny === u.uy) continue;
            const loc = game.level?.at(nx, ny);
            if (!loc || loc.typ === STONE) continue;
            if (nx === u.ux - run.dx && ny === u.uy - run.dy) continue;
            const mtmp = mon_at(nx, ny);
            const closedDoor = loc?.typ === DOOR && !!(loc.doormask & (D_CLOSED | D_LOCKED));
            let corridorCandidate = false;
            if (C.IS_OBSTRUCTED(loc.typ) || loc.typ === C.ROOM
                || C.IS_AIR(loc.typ) || loc.typ === C.ICE) {
                continue;
            } else if (closedDoor) {
                if (nx !== u.ux && ny !== u.uy) continue;
                corridorCandidate = true;
            } else if (loc.typ === CORR || loc.typ === SCORR) {
                corridorCandidate = true;
            } else if (C.IS_POOL(loc.typ) || C.IS_LAVA(loc.typ)) {
                continue;
            } else if (run.mode === 1) {
                corridorCandidate = true;
            }
            if (!corridorCandidate) continue;
            const i = dist2(nx, ny, desiredX, desiredY);
            if (i > 2) continue;
            if (corrct === 1 && dist2(nx, ny, x0, y0) !== 1) noturn = true;
            if (i < i0) {
                i0 = i;
                x0 = nx;
                y0 = ny;
                m0 = mtmp ? 1 : 0;
            }
            corrct++;
        }
    }
    if ((run.mode === 1 || run.mode === 3 || run.mode === 8)
        && !noturn && !m0 && i0
        && (corrct === 1 || (corrct === 2 && i0 === 1))) {
        const nextDx = x0 - u.ux;
        const nextDy = y0 - u.uy;
        if (nextDx !== run.dx || nextDy !== run.dy) {
            // C ref: hack.c:lookaround(); repeated corner running is limited
            // by cumulative last_str_turn rather than a one-turn boolean.
            let turn = 0;
            if (i0 === 2) {
                turn = (run.dx === y0 - u.uy && run.dy === u.ux - x0) ? 2 : -2;
            } else if (run.dx && run.dy) {
                turn = ((run.dx === run.dy && y0 === u.uy)
                    || (run.dx !== run.dy && y0 !== u.uy)) ? -1 : 1;
            } else {
                turn = ((x0 - u.ux === y0 - u.uy && !run.dy)
                    || (x0 - u.ux !== y0 - u.uy && run.dy)) ? 1 : -1;
            }
            const lastTurn = (run.lastStrTurn || 0) + turn;
            if (lastTurn < -2 || lastTurn > 2) return;
            run.lastStrTurn = lastTurn;
        }
        run.dx = nextDx;
        run.dy = nextDy;
    }
}

async function runShouldStopBeforeRepeatMove(run) {
    // C refs: allmain.c:moveloop_core(), hack.c:lookaround().  Repeated
    // rushes stop before a closed door; shifted run mode 1 treats it as a
    // corridor candidate and can still bump into it via domove_core().
    if (!run || run.travel || run.mode === 1) return false;
    if (game.u?.ublind || game.u?.uprops?.blind) return false;
    const u = game.u;
    if (!u) return false;
    for (let nx = u.ux - 1; nx <= u.ux + 1; nx++) {
        for (let ny = u.uy - 1; ny <= u.uy + 1; ny++) {
            if (nx === u.ux && ny === u.uy) continue;
            if (nx === u.ux - run.dx && ny === u.uy - run.dy) continue;
            const loc = game.level?.at(nx, ny);
            const closedDoor = loc?.typ === DOOR && !!(loc.doormask & (D_CLOSED | D_LOCKED));
            if (!closedDoor) continue;
            if (nx !== u.ux && ny !== u.uy) continue;
            if (game.flags?.mention_walls) await pline('You stop in front of the door.');
            game.context.move = 0;
            return true;
        }
    }
    return false;
}

function hostileMonsterNearHeroForRunStop(run = game.context?.run) {
    const u = game.u;
    if (!u) return false;
    for (let x = u.ux - 1; x <= u.ux + 1; x++) {
        for (let y = u.uy - 1; y <= u.uy + 1; y++) {
            if (x === u.ux && y === u.uy) continue;
            const mon = mon_at(x, y);
            if (!mon) continue;
            if (run?.mode === 1 && !run.travel) {
                // C ref: hack.c:lookaround().  Shift-direction running only
                // stops for visible monsters in the square being run toward;
                // side monsters are ignored until they block or attack.
                const infront = x === u.ux + run.dx && y === u.uy + run.dy;
                if (!infront) continue;
                if (cansee(x, y)) return true;
                continue;
            }
            if (mon.mpeaceful || mon.mtame || monsterHasNoAttacks(mon)) continue;
            if (cansee(x, y)) return true;
        }
    }
    return false;
}

export function shouldStopRunForNearbyMonster() {
    return hostileMonsterNearHeroForRunStop();
}

function monsterSwapName(mon) {
    if (C.has_mgivenname(mon)) return C.MGIVENNAME(mon);
    const saddlePrefix = ((mon?.misc_worn_check || 0) & C.W_SADDLE)
        && !(game.u?.uprops?.blind || game.u?.ublind)
        && !(game.u?.uprops?.hallucination || game.u?.uhallucination)
        ? 'saddled ' : '';
    const name = `${saddlePrefix}${monsterName(mon)}`;
    if (mon?.mtame) return `your ${name}`;
    if (mon?.mpeaceful) return `the peaceful ${name}`;
    return `the ${name}`;
}

function isSafeMonster(mon) {
    if (!mon || game.flags?.safe_dog === false) return false;
    if (!mon.mpeaceful) return false;
    if (!cansee(mon.mx, mon.my)) return false;
    if (game.u?.uprops?.confusion || game.u?.uconfusion) return false;
    if (game.u?.uprops?.hallucination || game.u?.uhallucination) return false;
    if (game.u?.uprops?.stunned || game.u?.ustunned) return false;
    return true;
}

function monsterHasNoAttacks(mon) {
    const attacks = mon?.data?.mattk || [];
    return !attacks.some((attack) => attack && attack[0] && attack[0] !== 'AT_BOOM');
}

export function monsterNearbyForSafety(maxDelta = 1) {
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    for (const mon of game.level?.monsters || []) {
        if (Math.abs((mon.mx ?? 0) - ux) > maxDelta
            || Math.abs((mon.my ?? 0) - uy) > maxDelta) continue;
        if (mon.mx === ux && mon.my === uy) continue;
        if (mon.m_ap_type === C.M_AP_FURNITURE || mon.m_ap_type === C.M_AP_OBJECT) continue;
        if (mon.mpeaceful && !(game.u?.uhallucination || game.u?.uprops?.hallucination)) continue;
        if (monsterHasNoAttacks(mon)) continue;
        if (mon.mundetected) continue;
        // C ref: hack.c:monster_nearby() skips helpless(mon), which is
        // msleeping || !mcanmove.  mfrozen is retained for older JS callers
        // that may not have synchronized mcanmove yet.
        if (mon.msleeping || mon.mcanmove === 0 || mon.mfrozen) continue;
        if (!heroCanSpotMonsterForHit(mon)) continue;
        return true;
    }
    return false;
}

async function cmdSafetyPrevention(ucverb, cmddesc, act, flagKey) {
    // C ref: do.c:cmd_safety_prevention(); safe_wait is on by default and
    // prevents explicit search/rest commands from spending a turn next to a
    // visible hostile monster.
    if (game.flags?.safe_wait === false || game.iflags?.menu_requested || game.context?.multi) {
        game[flagKey] = 0;
        return false;
    }
    const cmdassist = game.iflags?.cmdassist !== false;
    const oldFlag = game[flagKey] || 0;
    let suffix = '';
    if (cmdassist || !oldFlag) {
        suffix = `  Use 'm' prefix to force ${cmddesc}.`;
    }
    game[flagKey] = cmdassist ? oldFlag : oldFlag + 1;
    if (monsterNearbyForSafety()) {
        // C ref: pline.c:Norep().  Repeated safe-wait/search warnings are
        // suppressed after rhack() has already cleared the old topline.
        const line = `${act}${suffix}`;
        if (line !== game._last_topline_message) await pline(line);
        return true;
    }
    game[flagKey] = 0;
    if (game.u?.stoned || game.u?.slimed || game.u?.strangled || game.u?.sick) {
        await pline(`${ucverb} doesn't feel like a good idea right now.`);
        return true;
    }
    return false;
}

async function attackMonster(mon) {
    if (await maybeRevealMimicInsteadOfAttack(mon)) return;
    // C ref: hack.c:domove() enters uhitm() instead of moving onto
    // occupied monster squares.  Reuse the current narrow uhitm() RNG front
    // door; full weapon, passive, resist, and death handling remain backlog.
    await heroMeleeAttack(mon);
}

function chainInMiddleForBallMove(x, y, chainx, chainy, ballx, bally) {
    return distminCoords(x, y, chainx, chainy) <= 1
        && distminCoords(chainx, chainy, ballx, bally) <= 1;
}

function chainOnlyMoveTarget(oldx, oldy, x, y, ball, chain) {
    // C ref: ball.c:drag_ball().  When the ball is still adjacent to the
    // destination, only the chain moves, preferably to a square between hero
    // and ball.
    const ballx = ball.ox;
    const bally = ball.oy;
    const chainx = chain.ox;
    const chainy = chain.oy;
    switch (dist2(x, y, ballx, bally)) {
    case 8:
        return { x: Math.trunc((ballx + x) / 2), y: Math.trunc((bally + y) / 2) };
    case 5: {
        let ax, ay, bx, by;
        if (Math.abs(x - ballx) === 1) {
            ax = x;
            bx = ballx;
            ay = by = Math.trunc((bally + y) / 2);
        } else {
            ax = bx = Math.trunc((ballx + x) / 2);
            ay = y;
            by = bally;
        }
        const da = dist2(ax, ay, chainx, chainy);
        const db = dist2(bx, by, chainx, chainy);
        if (da < db || (da === db && rn2(2))) return { x: ax, y: ay };
        return { x: bx, y: by };
    }
    case 4:
        if (chainInMiddleForBallMove(x, y, chainx, chainy, ballx, bally))
            return { x: chainx, y: chainy };
        return { x: Math.trunc((x + ballx) / 2), y: Math.trunc((y + bally) / 2) };
    case 2:
        if (dist2(x, y, chainx, chainy) === 4) {
            if (chainy === y) return { x: ballx, y: chainy };
            return { x: chainx, y: bally };
        }
        // fall through
    case 1:
    case 0:
        if (chainInMiddleForBallMove(x, y, chainx, chainy, ballx, bally))
            return { x: chainx, y: chainy };
        if (chainInMiddleForBallMove(x, y, oldx, oldy, ballx, bally))
            return { x: oldx, y: oldy };
        return { x, y };
    default:
        return { x: chainx, y: chainy };
    }
}

function uniqueMapPositions(positions) {
    const seen = new Set();
    return positions.filter((pos) => {
        if (!pos || !Number.isInteger(pos.x) || !Number.isInteger(pos.y)) return false;
        const key = `${pos.x},${pos.y}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function clearPunishmentObjectMemoryAt(x, y) {
    const loc = game.level?.at(x, y);
    const mem = loc?.remembered_glyph;
    if (!loc || !mem) return;
    if (!((mem.ch === '0' || mem.ch === '_') && mem.color === 6)) return;
    const glyph = terrain_glyph(loc, x, y);
    loc.remembered_glyph = { ch: glyph.ch, color: glyph.color, decgfx: glyph.dec };
}

function rememberPunishmentObjectAt(obj) {
    if (!obj || punishmentObjectIsCarried(obj)) return;
    if (!Number.isInteger(obj.ox) || !Number.isInteger(obj.oy) || obj.ox < 1 || obj.oy < 0) return;
    if (game.u?.ux === obj.ox && game.u?.uy === obj.oy) return;
    // C refs: src/ball.c:move_bc(), src/display.c:newsym().  Visible
    // ball/chain replacement calls newsym(); a merely could-see square keeps
    // its old remembered terrain rather than learning the moved object.
    if (!heroIsBlind() && !cansee(obj.ox, obj.oy)) return;
    rememberObjectGlyphAt(obj.ox, obj.oy, obj);
}

function rememberNonPunishmentObjectOrTerrainAt(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    const obj = (game.level?.objects || []).find((candidate) =>
        candidate?.ox === x && candidate?.oy === y
        && candidate !== game.uball && candidate !== game.uchain);
    if (obj) {
        rememberObjectGlyphAt(x, y, obj);
        return;
    }
    const glyph = terrain_glyph(loc, x, y);
    loc.remembered_glyph = { ch: glyph.ch, color: glyph.color, decgfx: glyph.dec };
    show_glyph_cell(x, y, glyph.ch, glyph.color, !!glyph.dec);
}

function rememberObjectGlyphAt(x, y, obj) {
    const loc = game.level?.at(x, y);
    if (!loc || !obj) return;
    const glyph = object_glyph_for_menu(obj);
    loc.remembered_glyph = { ch: glyph.ch, color: glyph.color, decgfx: !!glyph.dec };
    show_glyph_cell(x, y, glyph.ch, glyph.color, !!glyph.dec);
}

function moveFloorObjectToTop(obj) {
    const objects = game.level?.objects;
    if (!obj || !Array.isArray(objects)) return;
    const idx = objects.indexOf(obj);
    if (idx >= 0) objects.splice(idx, 1);
    objects.unshift(obj);
}

function unplacePunishmentObjectsForHeroMove() {
    // C ref: ball.c:move_bc(before=1).  The floor ball and chain are removed
    // before the hero changes squares so old object glyphs don't become stale
    // remembered map cells during repeated travel.
    if (!game._punished || !game.uball || !game.uchain) return null;
    const ball = game.uball;
    const chain = game.uchain;
    const state = {
        prevBallX: Number.isInteger(ball.ox) ? ball.ox : game.u?.ux,
        prevBallY: Number.isInteger(ball.oy) ? ball.oy : game.u?.uy,
        prevChainX: Number.isInteger(chain.ox) ? chain.ox : game.u?.ux,
        prevChainY: Number.isInteger(chain.oy) ? chain.oy : game.u?.uy,
        ballWasCarried: punishmentObjectIsCarried(ball),
    };
    if (heroIsBlind()) return state;
    if (!state.ballWasCarried) {
        ball.ox = -1;
        ball.oy = -1;
    }
    chain.ox = -1;
    chain.oy = -1;
    for (const pos of uniqueMapPositions([
        { x: state.prevBallX, y: state.prevBallY },
        { x: state.prevChainX, y: state.prevChainY },
    ])) {
        clearPunishmentObjectMemoryAt(pos.x, pos.y);
        newsym(pos.x, pos.y);
    }
    return state;
}

function dragPunishmentObjectsAfterHeroMove(oldx, oldy, moveState = null) {
    // C refs: ball.c:drag_ball(), ball.c:move_bc().
    if (!game._punished || !game.uball || !game.uchain) return;
    const ball = game.uball;
    const chain = game.uchain;
    const x = game.u?.ux ?? oldx;
    const y = game.u?.uy ?? oldy;
    const prevBallX = Number.isInteger(moveState?.prevBallX) ? moveState.prevBallX
        : (Number.isInteger(ball.ox) ? ball.ox : oldx);
    const prevBallY = Number.isInteger(moveState?.prevBallY) ? moveState.prevBallY
        : (Number.isInteger(ball.oy) ? ball.oy : oldy);
    const prevChainX = Number.isInteger(moveState?.prevChainX) ? moveState.prevChainX
        : (Number.isInteger(chain.ox) ? chain.ox : oldx);
    const prevChainY = Number.isInteger(moveState?.prevChainY) ? moveState.prevChainY
        : (Number.isInteger(chain.oy) ? chain.oy : oldy);

    if (dist2(x, y, prevChainX, prevChainY) <= 2) {
        // Still next to the chain; C leaves both ball and chain in place.
        ball.ox = prevBallX;
        ball.oy = prevBallY;
        chain.ox = prevChainX;
        chain.oy = prevChainY;
    } else if (distminCoords(x, y, prevBallX, prevBallY) <= 2) {
        ball.ox = prevBallX;
        ball.oy = prevBallY;
        chain.ox = prevChainX;
        chain.oy = prevChainY;
        const target = chainOnlyMoveTarget(oldx, oldy, x, y, ball, chain);
        chain.ox = target.x;
        chain.oy = target.y;
    } else {
        ball.ox = prevChainX;
        ball.oy = prevChainY;
        chain.ox = oldx;
        chain.oy = oldy;
        game._extra_encumbered_turn_pending = true;
        game._ball_drag_delay_pending = true;
        if (game.context?.run) game._run_stop_after_move = true;
    }

    const onlyChainMoved = ball.ox === prevBallX && ball.oy === prevBallY
        && (chain.ox !== prevChainX || chain.oy !== prevChainY);
    const ballMoved = ball.ox !== prevBallX || ball.oy !== prevBallY;
    const chainMoved = chain.ox !== prevChainX || chain.oy !== prevChainY;
    const anyPunishmentMoved = onlyChainMoved
        || ballMoved || chainMoved;
    if (heroIsBlind()) {
        // C ref: ball.c:move_bc().  Blind movement uses movobj(), which
        // re-links moved punishment objects at the head of the floor stack.
        if (ballMoved) moveFloorObjectToTop(ball);
        if (chainMoved) moveFloorObjectToTop(chain);
    }
    newsym(ball.ox, ball.oy);
    newsym(chain.ox, chain.oy);
    if (heroIsBlind() && onlyChainMoved) {
        rememberNonPunishmentObjectOrTerrainAt(chain.ox, chain.oy);
        rememberObjectGlyphAt(prevChainX, prevChainY, chain);
    } else if (heroIsBlind() && anyPunishmentMoved) {
        // C ref: ball.c:move_bc().  Blind movement relocates the actual
        // ball/chain objects but does not map their new positions unless the
        // hero has explicitly felt them; existing remembered glyphs remain.
    } else {
        rememberPunishmentObjectAt(ball);
        rememberPunishmentObjectAt(chain);
    }
}

async function maybeRevealMimicInsteadOfAttack(mon) {
    if (!mon || !mon.m_ap_type) return false;
    if (game.u?.uprops?.protection_from_shape_changers) return false;

    let line = '';
    const realName = `${indefiniteArticle(monsterInstanceDisplayName(mon))} ${monsterInstanceDisplayName(mon)}`;
    if (mon.m_ap_type === C.M_AP_OBJECT) {
        // C ref: src/pager.c:object_from_map().  A mimic posing as an object
        // is named through a temporary fake object, even though it is freed
        // immediately after that_is_a_mimic() formats the line.
        next_ident();
        if (mon.mappearance === SPE_NOVEL) rn2(41);
        line = `That ${objectAppearanceName(mon.mappearance)} is ${realName}!`;
    } else if (mon.m_ap_type === C.M_AP_FURNITURE) {
        line = `That ${objectAppearanceName(mon.mappearance)} actually is ${realName}!`;
    } else {
        line = `Wait!  That's ${realName}!`;
    }

    await pline(line);
    mon.m_ap_type = C.M_AP_NOTHING;
    mon.mappearance = 0;
    mon.msleeping = 0;
    mon.mundetected = 0;
    newsym(mon.mx, mon.my);
    game.context.run = null;
    return true;
}

async function swapWithSafeMonster(mon, x, y) {
    const u = game.u;
    if (!rn2(7)) {
        if (mon.mtame) {
            const fleetime = rnd(6);
            mon.mflee = true;
            mon.mfleetim = Math.max(mon.mfleetim || 0, fleetime === 1 ? 2 : fleetime);
        }
        await pline(`You stop.  ${monsterSwapName(mon).replace(/^your /, 'Your ')} is in the way!`);
        game.context.run = null;
        return;
    }
    const oldx = u.ux;
    const oldy = u.uy;
    u.ux = x;
    u.uy = y;
    mon.mx = oldx;
    mon.my = oldy;
    newsym(oldx, oldy);
    vision_recalc(1);
    refreshWarningAfterHeroMove();
    newsym(x, y);
    await pline(`You swap places with ${monsterSwapName(mon)}.`);
}

async function heroMeleeAttack(mon) {
    gethungry();
    exercise(A_DEX, true);
    const primary = heroWieldedWeapon();
    await maybeCheckCaitiff(mon);
    const dieroll = rnd(20);
    const hit = heroMeleeToHit(mon, primary) > dieroll;
    if (!hit) {
        await plineOrAppend(heroMeleeMissMessage(mon));
        if (!monsterHelpless(mon)) await wakeupMonsterByAttack(mon);
        rn2(3);
        if (!game.u?.twoweap || !heroSecondaryWeapon()) {
            game.context.run = null;
            return;
        }
    } else {
        exercise(A_DEX, true);
        const unarmed = !primary;
        if (primary) noteConductCounter('weaphit');
        const damage = heroMeleeDamage(mon, primary);
        // C refs: uhitm.c:hmon_hitmon_barehands(),
        // uhitm.c:hmon_hitmon_stagger().  Barehand hits roll the small
        // unarmed damage die, then high-enough damage probes the rare stagger.
        if (unarmed && damage > 1) rnd(100);
        const maybeKnockback = !unarmed && damage > 1 && !game.u?.twoweap && primary;
        if (typeof mon.mhp === 'number') {
            mon.mhp -= damage;
            if (mon.mhp <= 0) {
                const petSoundPrinted = mon.mtame ? await abuseDog(mon) : false;
                const killLine = `You ${monsterKillVerb(mon)} ${monsterKillName(mon)}!`;
                if (game._pending_message) await append_pline(killLine);
                else await pline(killLine);
                if (petSoundPrinted) queue_more_prompt();
                await heroKilledMonster(mon);
                if (game._more) {
                    game._pre_turn_more_waiting = true;
                    game._monster_turn_paused_for_more = true;
                }
                game.context.run = null;
                return;
            }
        }
        await plineOrAppend(heroMeleeHitMessage(mon, damage));
        if (await wakeupMonsterByAttack(mon)) {
            queueHeroMeleePostWakeupMore(mon, { maybeKnockback });
            game.context.run = null;
            return;
        }
        finishHeroMeleePostHitFrontdoor(mon, { maybeKnockback });
        game.context.run = null;
        return;
    }

    const second = heroSecondaryWeapon();
    const secondRoll = rnd(20);
    const secondHit = heroMeleeToHit(mon, second) > secondRoll;
    if (!secondHit) {
        await append_pline(heroMeleeMissMessage(mon));
        if (!monsterHelpless(mon)) await wakeupMonsterByAttack(mon);
        game.context.run = null;
        return;
    }
    const secondUnarmed = !second;
    if (second) noteConductCounter('weaphit');
    const damage = heroMeleeDamage(mon, second);
    if (secondUnarmed && damage > 1) rnd(100);
    const maybeKnockback = !secondUnarmed && damage > 1 && !game.u?.twoweap && second;
    if (typeof mon.mhp === 'number') {
        mon.mhp -= damage;
        if (mon.mhp <= 0) {
            const petSoundPrinted = mon.mtame ? await abuseDog(mon) : false;
            const killLine = `You ${monsterKillVerb(mon)} ${monsterKillName(mon)}!`;
            if (game._pending_message) await append_pline(killLine);
            else await pline(killLine);
            if (petSoundPrinted) queue_more_prompt();
            await heroKilledMonster(mon);
            if (game._more) {
                game._pre_turn_more_waiting = true;
                game._monster_turn_paused_for_more = true;
            }
            game.context.run = null;
            return;
        }
    }
    await plineOrAppend(heroMeleeHitMessage(mon, damage));
    if (await wakeupMonsterByAttack(mon)) {
        queueHeroMeleePostWakeupMore(mon, { maybeKnockback });
        game.context.run = null;
        return;
    }
    finishHeroMeleePostHitFrontdoor(mon, { maybeKnockback });
    game.context.run = null;
}

async function swallowedHeroAttack(mon) {
    // C evidence: swallowed directional movement attacks u.ustuck rather
    // than moving.  This is still a narrow uhitm() front door.
    await heroMeleeAttack(mon);
}

async function abuseDog(mon) {
    if (!mon.mtame) return false;
    if (game.u?.conflict || game.u?.uprops?.conflict) {
        mon.mtame = Math.trunc(mon.mtame / 2);
    } else {
        mon.mtame--;
    }
    if (mon.mtame && mon.edog) mon.edog.abuse = (mon.edog.abuse || 0) + 1;
    if (mon.mx !== 0) {
        if (mon.mtame && rn2(mon.mtame)) {
            return await maybePetAbuseSound(mon);
        } else {
            return await maybePetAbuseSound(mon);
        }
    }
    return false;
}

function explosionAudibleToHero() {
    return !(game.u?.uprops?.deaf || game.u?.udeaf);
}

function explosionVisibleToHero(x, y) {
    for (let xx = x - 1; xx <= x + 1; xx++) {
        for (let yy = y - 1; yy <= y + 1; yy++) {
            if (!C.isok(xx, yy)) continue;
            if (cansee(xx, yy)) return true;
        }
    }
    return false;
}

async function corpseChance(mon) {
    const boom = (mon?.data?.mattk || []).find((attack) => attack?.[0] === 'AT_BOOM');
    if (boom) {
        // C ref: mon.c:corpse_chance(); exploding monsters roll their boom
        // damage, run mon_explodes(), and never leave an ordinary corpse.
        monsterAttackDamageRoll(mon, boom);
        await monExplodesBasic(mon, boom);
        return false;
    }
    // C ref: src/mon.c:corpse_chance().  Large monsters and golems always
    // reach make_corpse(); G_NOCORPSE suppression happens there without an
    // additional chance roll.
    if (((mon?.data?.msize ?? 0) >= MZ_LARGE || monsterName(mon) === 'lizard') && !mon.mcloned)
        return true;
    if (mon?.data?.mlet === 'S_GOLEM' || mon?.isshk || mon?.is_rider || mon?.isrider)
        return true;
    const genoFreq = (mon.data?.geno ?? 0) & 0x7;
    const verysmall = VERY_SMALL_MONSTERS.has(monsterName(mon)) ? 1 : 0;
    const denom = 2 + (genoFreq < 2 ? 1 : 0) + verysmall;
    return !rn2(denom);
}

function monsterAttackDamageRoll(mon, attack) {
    const damn = attack?.[2] || 0;
    const damd = attack?.[3] || 0;
    if (damn) return d(damn, damd);
    if (damd) return d((mon?.m_lev ?? mon?.data?.mlevel ?? 0) + 1, damd);
    return 0;
}

function possessiveName(name) {
    return String(name || 'monster').endsWith('s') ? `${name}'` : `${name}'s`;
}

function destroyItemsFrontdoorBasic(damage) {
    // C ref: zap.c:destroy_items(); the inventory reservoir is not modeled
    // here, but every call owns this damage-scaled front-door roll.
    const scale = 5;
    let limit = Math.trunc(damage / scale);
    if ((damage % scale) > rn2(scale)) limit++;
    return Math.max(0, limit);
}

function monsterResistExplosionFrontdoor(target) {
    // C ref: zap.c:resist() with MON_EXPLODE as the object class.  That falls
    // through to alev=u.ulevel; current monster data does not retain MR, but
    // the denominator and RNG ownership are what matter for movement parity.
    let dlev = target?.m_lev ?? target?.data?.mlevel ?? 1;
    if (dlev > 50) dlev = 50;
    else if (dlev < 1) dlev = 1;
    rn2(Math.max(1, 100 + (game.u?.ulevel ?? 1) - dlev));
}

async function monExplodesBasic(mon, attack) {
    // C refs: explode.c:mon_explodes(), explode.c:explode().
    const damage = monsterAttackDamageRoll(mon, attack);
    game._pending_monster_explosion = buildMonsterExplosionState(mon, damage);
    if (explosionAudibleToHero()) {
        // C ref: explode.c:explode().  Visible explosions end with "Boom!";
        // unseen MON_EXPLODE cases use the generic heard-blast message.
        const line = explosionVisibleToHero(mon.mx, mon.my) ? 'Boom!' : 'You hear a blast.';
        if (game._pending_message) await append_pline(line);
        else await pline(line);
        queue_more_prompt();
        return;
    }
    await resumePendingMonsterExplosion();
}

function buildMonsterExplosionState(mon, damage) {
    const targets = [];
    let heroHurt = false;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const x = mon.mx + i - 1;
            const y = mon.my + j - 1;
            if (game.u?.ux === x && game.u?.uy === y) {
                heroHurt = true;
                continue;
            }
            const target = mon_at(x, y);
            if (!target || target === mon) continue;
            targets.push(target);
        }
    }
    return {
        source: `${possessiveName(monsterName(mon))} explosion`,
        damage,
        targets,
        targetIndex: 0,
        heroHurt,
    };
}

function pendingExplosionHasVisibleMessage(state) {
    if (!state) return false;
    for (let i = state.targetIndex; i < state.targets.length; i++) {
        const target = state.targets[i];
        if (target && cansee(target.mx, target.my)) return true;
    }
    return !!state.heroHurt;
}

async function resumePendingMonsterExplosion() {
    const state = game._pending_monster_explosion;
    if (!state) return false;
    while (state.targetIndex < state.targets.length) {
        const target = state.targets[state.targetIndex++];
        if (!target || !(game.level?.monsters || []).includes(target)) continue;
        if (cansee(target.mx, target.my))
            await pline(`${monnam(target)} is caught in the ${state.source}!`);
        destroyItemsFrontdoorBasic(state.damage);
        monsterResistExplosionFrontdoor(target);
        if (game._pending_message && pendingExplosionHasVisibleMessage(state)) {
            queue_more_prompt();
            return true;
        }
    }
    const heroHurt = !!state.heroHurt;
    state.heroHurt = false;
    if (heroHurt) {
        await pline(`You are caught in the ${state.source}!`);
        destroyItemsFrontdoorBasic(state.damage);
        if (game.u && typeof game.u.uhp === 'number')
            game.u.uhp = Math.max(0, game.u.uhp - state.damage);
        exercise(A_STR, false);
    }
    game._pending_monster_explosion = null;
    return false;
}

function corpseStatFlagsForMonster(mon, baseFlags = C.CORPSTAT_NONE) {
    let flags = baseFlags;
    if (mon?.female) flags |= C.CORPSTAT_FEMALE;
    else if (!mon?.data?.neuter) flags |= C.CORPSTAT_MALE;
    return flags;
}

function ttyMapColor(color) {
    return color === 0 || color === 7 ? NO_COLOR : color;
}

function corpseDisplayColorForMonster(mon) {
    return ttyMapColor(mon?.data?.color ?? NO_COLOR);
}

function makeMonsterCorpse(mon, baseFlags = C.CORPSTAT_NONE) {
    // C ref: src/mon.c:make_corpse().  The ordinary xkilled() path enters
    // mkcorpstat(CORPSE, ..., CORPSTAT_INIT), so mksobj() first initializes a
    // random corpse before the caller-supplied monster type overrides it.
    const corpsePtr = undead_to_corpse_ptr(mon?.data);
    if (((mon?.data?.geno || 0) & G_NOCORPSE) && corpsePtr === mon?.data) return null;
    const flags = corpseStatFlagsForMonster(mon, baseFlags) | C.CORPSTAT_INIT;
    const oldLiveCorpseTimeout = game._live_corpse_timeout;
    game._live_corpse_timeout = true;
    try {
        const corpse = mkcorpstat(CORPSE, mon, corpsePtr || mon?.data, mon.mx, mon.my, flags);
        if (corpse) {
            corpse.color = corpseDisplayColorForMonster(mon);
            corpse._live_kill_corpse = true;
        }
        return corpse;
    } finally {
        game._live_corpse_timeout = oldLiveCorpseTimeout;
    }
}

function accessibleKillDropSquare(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    if (C.ACCESSIBLE(loc.typ) && !(C.IS_DOOR(loc.typ) && (loc.doormask & (D_CLOSED | D_LOCKED)))) return true;
    return C.IS_POOL(loc.typ);
}

function killDropMonsterBelowHumanSize(mon) {
    if (typeof mon?.data?.msize === 'number') return mon.data.msize < MZ_HUMAN;
    return KILL_DROP_SUBHUMAN_FALLBACK.has(monsterName(mon));
}

function discardFreeObjectForDelobjParity(obj) {
    // C ref: src/invent.c:delobj_core(); ordinary discards still probe
    // obj_resists(0,0), even though the object is never placed.
    obj_resists(obj, 0, 0);
}

function shouldDiscardKillTreasure(mon, obj) {
    // C ref: src/mon.c:xkilled().  Killed monsters may create a random
    // "illogical" object, but generated food for non-collectors and bulky
    // items from sub-human monsters are deleted before corpse_chance().
    if (!obj) return false;
    if (obj.oclass === FOOD_CLASS && !((mon.data?.mflags2 || 0) & M2_COLLECT)
        && !obj.oartifact) {
        return true;
    }
    if (killDropMonsterBelowHumanSize(mon) && obj.otyp !== FIGURINE
        && BULKY_KILL_DROP_OBJECTS.has(obj.otyp)) {
        return true;
    }
    return false;
}

function maybeDropKillTreasure(mon) {
    // C ref: mon.c:xkilled() creates a random extra object before
    // corpse_chance() when the kill-location and monster filters allow it.
    if (rn2(6)) return;
    if ((mon.data?.geno || 0) & G_NOCORPSE) return;
    if (mon.mx === game.u?.ux && mon.my === game.u?.uy) return;
    if (mon.data?.mlet === 'S_KOP') return;
    if (mon.mcloned) return;
    if (!accessibleKillDropSquare(mon.mx, mon.my)) return;
    const otmp = mkobj(RANDOM_CLASS, true);
    if (shouldDiscardKillTreasure(mon, otmp)) {
        discardFreeObjectForDelobjParity(otmp);
        return;
    }
    place_object(otmp, mon.mx, mon.my);
}

function monsterExperienceBasic(mon) {
    // C ref: exper.c:experience().
    const level = mon?.m_lev ?? mon?.data?.mlevel ?? 0;
    let xp = 1 + level * level;
    const ac = monsterArmorClass(mon);
    if (ac < 3) xp += (7 - ac) * (ac < 0 ? 2 : 1);
    const speed = mon?.data?.mmove ?? mon?.mmove ?? 12;
    if (speed > 12) xp += speed > 18 ? 5 : 3;
    for (const attack of mon?.data?.mattk || []) {
        if (!attack) continue;
        const [aatyp, adtyp, damn = 0, damd = 0] = attack;
        const attackType = MONSTER_ATTACK_TYPE.get(aatyp) ?? 0;
        if (attackType > 4) {
            if (attackType === 254) xp += 5;
            else if (attackType === 255) xp += 10;
            else xp += 3;
        }
        const damageType = MONSTER_DAMAGE_TYPE.get(adtyp);
        if (damageType == null) continue;
        if (damageType > 0 && damageType < 11) xp += 2 * level;
        else if (damageType === 15 || damageType === 18 || damageType === 40) xp += 50;
        else if (damageType !== 0) xp += level;
        if ((damd * damn) > 23) xp += level;
        if (damageType === 28 && mon?.data?.mlet === 'S_EEL') {
            // Hero polymorph/amphibious state is not modeled yet; the normal
            // human cases currently represented are non-amphibious.
            xp += 1000;
        }
    }
    if ((mon?.data?.mflags2 || 0) & M2_NASTY) xp += 7 * level;
    if (level > 8) xp += 50;
    return xp;
}

function moreExperienced(exper, rexp = 0) {
    // C ref: src/exper.c:more_experienced().
    if (!game.u) return;
    game.u.uexp = (game.u.uexp || 0) + exper;
    game.u.urexp = (game.u.urexp || 0) + (4 * exper) + rexp;
}

function gainExperienceForKill(mon) {
    // C ref: mon.c:xkilled() -> more_experienced().
    moreExperienced(monsterExperienceBasic(mon), 0);
}

function dropMonsterInventory(mon) {
    // C ref: src/mon.c:m_detach() -> relobj().  A dying monster releases
    // minvent before xkilled() creates any extra treasure or corpse.
    const inv = mon.inventory || [];
    for (const obj of inv) {
        obj.owornmask = 0;
        place_object(obj, mon.mx, mon.my);
    }
    mon.inventory = [];
    mon.mw = null;
}

async function heroKilledMonster(mon) {
    noteConductCounter('killer');
    if (mon.mtame) {
        game.u.uluck = (game.u?.uluck || 0) - 1;
        game._pending_tame_kill_reaction = true;
    }
    dropMonsterInventory(mon);
    maybeDropKillTreasure(mon);
    const corpseOk = await corpseChance(mon);
    const squareOk = accessibleKillDropSquare(mon.mx, mon.my);
    if (corpseOk && squareOk) {
        makeMonsterCorpse(mon);
    }
    if (mon.mpeaceful && !rn2(2)) {
        // Luck adjustment is outside the current scoring surface.
    }
    gainExperienceForKill(mon);
    // C ref: mon.c:xkilled() applies tame/peaceful penalties and then the
    // precomputed makemon.c:set_malign() value for ordinary hero kills.
    if (mon.mtame) adjalign(-15);
    else if (mon.mpeaceful) adjalign(-5);
    adjalign(mon.malign ?? 0);
    const monsters = game.level?.monsters || [];
    const idx = monsters.indexOf(mon);
    clearRememberedInvisibleAt(mon.mx, mon.my, false);
    if (idx >= 0) monsters.splice(idx, 1);
    newsym(mon.mx, mon.my);
}

async function forceFightEmpty(dx, dy) {
    if (game.u) {
        game.u.dx = dx;
        game.u.dy = dy;
    }
    const x = game.u.ux + dx;
    const y = game.u.uy + dy;
    const mon = mon_at(x, y);
    if (mon) {
        // C ref: src/uhitm.c:force_attack() temporarily sets forcefight
        // and routes occupied squares through the normal hero attack path.
        await heroMeleeAttack(mon);
        return;
    }
    const loc = game.level?.at(x, y);
    let target = 'thin air';
    let solid = false;

    if (!loc) {
        target = 'an unknown obstacle';
        solid = true;
    } else if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) {
        target = 'the door';
        solid = true;
    } else if (loc.typ === STONE || IS_WALL(loc.typ) || loc.typ === SDOOR || loc.typ === SCORR) {
        target = 'the wall';
        solid = true;
    }

    await pline(`You ${solid ? 'harmlessly ' : ''}attack ${target}.`);
}

function clearRememberedInvisibleAt(x, y, redraw = true) {
    const loc = game.level?.at(x, y);
    if (loc?.remembered_glyph?.ch !== 'I') return false;
    const glyph = terrain_glyph(loc, x, y);
    loc.remembered_glyph = {
        ch: glyph.ch,
        color: glyph.color,
        decgfx: !!(glyph.dec ?? glyph.decgfx),
    };
    if (redraw) newsym(x, y);
    return true;
}

async function attackRememberedInvisibleEmpty(dx, dy) {
    if (game.u) {
        game.u.dx = dx;
        game.u.dy = dy;
    }
    const x = game.u.ux + dx;
    const y = game.u.uy + dy;
    // C ref: src/hack.c:domove_fight_empty().  Stepping/rushing into a
    // remembered invisible glyph with no current monster wastes one turn,
    // clears the stale marker, and reports an attack on empty space.
    clearRememberedInvisibleAt(x, y);
    game.context.run = null;
    await pline('You attack thin air.');
    return true;
}

function zapDig(dx, dy) {
    const revealDugTerrainAt = (x, y) => {
        const loc = game.level?.at(x, y);
        if (!loc) return;
        if (!cansee(x, y) && !couldsee(x, y)) {
            newsym(x, y);
            return;
        }
        const glyph = terrain_glyph(loc, x, y);
        loc.remembered_glyph = { ch: glyph.ch, color: glyph.color, decgfx: !!glyph.dec };
        show_glyph_cell(x, y, glyph.ch, glyph.color, !!glyph.dec);
    };
    let depth = rn1(18, 8);
    let x = game.u.ux + dx;
    let y = game.u.uy + dy;
    while (--depth >= 0) {
        const loc = game.level?.at(x, y);
        if (!loc) break;
        if (IS_WALL(loc.typ) || loc.typ === SDOOR) {
            loc.typ = DOOR;
            loc.doormask = D_NODOOR;
            loc.flags = 0;
            depth -= 2;
            revealDugTerrainAt(x, y);
        } else if (loc.typ === STONE || loc.typ === SCORR) {
            loc.typ = CORR;
            loc.flags = 0;
            depth--;
            revealDugTerrainAt(x, y);
        } else if (IS_OBSTRUCTED(loc.typ) && loc.typ !== DOOR) {
            loc.typ = CORR;
            loc.flags = 0;
            depth--;
            revealDugTerrainAt(x, y);
        }
        x += dx;
        y += dy;
    }
}

const TOURIST_DISCOVERIES_SCREEN = "Discoveries, by order of discovery within each class\n\n\u001b[7mScrolls\u001b[0m\n  scroll of magic mapping (ANDOVA BEGARIN)\n\u001b[7mPotions\u001b[0m\n  potion of extra healing (murky)\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n--More--";
const DISCOVERY_DESCRIPTION_SLOT = new Map([
    [ELVEN_ARROW, 'runed arrow'],
    [ORCISH_ARROW, 'crude arrow'],
    [YA, 'bamboo arrow'],
    [ELVEN_SPEAR, 'runed spear'],
    [ORCISH_SPEAR, 'crude spear'],
    [DWARVISH_SPEAR, 'stout spear'],
    [JAVELIN, 'throwing spear'],
    [SHURIKEN, 'throwing star'],
    [ELVEN_BOW, 'runed bow'],
    [ORCISH_BOW, 'crude bow'],
    [YUMI, 'long bow'],
    [ELVEN_DAGGER, 'runed dagger'],
    [ORCISH_DAGGER, 'crude dagger'],
    [BATTLE_AXE, 'double-headed axe'],
    [ELVEN_SHORT_SWORD, 'runed short sword'],
    [ORCISH_SHORT_SWORD, 'crude short sword'],
    [DWARVISH_SHORT_SWORD, 'broad short sword'],
    [SCIMITAR, 'curved sword'],
    [ELVEN_BROADSWORD, 'runed broadsword'],
    [KATANA, 'samurai sword'],
    [TSURUGI, 'long samurai sword'],
    [RUNESWORD, 'runed broadsword'],
    [PARTISAN, 'vulgar polearm'],
    [RANSEUR, 'hilted polearm'],
    [SPETUM, 'forked polearm'],
    [GLAIVE, 'single-edged polearm'],
    [HALBERD, 'angled poleaxe'],
    [BARDICHE, 'long poleaxe'],
    [VOULGE, 'pole cleaver'],
    [FAUCHARD, 'pole sickle'],
    [GUISARME, 'pruning hook'],
    [BILL_GUISARME, 'hooked polearm'],
    [LUCERN_HAMMER, 'pronged polearm'],
    [BEC_DE_CORBIN, 'beaked polearm'],
    [DWARVISH_MATTOCK, 'broad pick'],
    [AKLYS, 'thonged club'],
    [SACK, 'bag'],
    [QUARTERSTAFF, 'staff'],
    [ORCISH_CLOAK, 'coarse mantelet'],
    [DWARVISH_CLOAK, 'hooded cloak'],
    [OILSKIN_CLOAK, 'slippery cloak'],
    [LOW_BOOTS, 'walking shoes'],
    [IRON_SHOES, 'hard shoes'],
    [HIGH_BOOTS, 'jackboots'],
    [CLOAK_OF_MAGIC_RESISTANCE, 148],
    [383, 376], // SPE_FORCE_BOLT's shuffled description slot in this object table.
]);
const WIZARD_SKILL_BASED_SPELLBOOKS = [
    367, // magic missile
    370, // sleep
    372, // light
    373, // detect monsters
    374, // healing
    375, // knock
    377, // confuse monster
    379, // drain life
    380, // slow monster
    384, // cause fear
    403, // protection
];
const DISCOVERY_SECTIONS = [
    ['Amulets', AMULET_CLASS],
    ['Weapons', WEAPON_CLASS],
    ['Armor', ARMOR_CLASS],
    ['Scrolls', SCROLL_CLASS],
    ['Spellbooks', SPBOOK_CLASS],
    ['Potions', POTION_CLASS],
    ['Rings', RING_CLASS],
    ['Wands', WAND_CLASS],
    ['Tools', TOOL_CLASS],
    ['Venoms', VENOM_CLASS],
];
const STR_ATTR1 = " Contestant the Tourist's attributes:\n\n Background:\n  You are a Rambler, a level 1 female human Tourist.\n  You are neutral, on a mission for The Lady\n  who is opposed by Blind Io (lawful) and Offler (chaotic).\n  You are left-handed.\n  You are in the Dungeons of Doom, on level 1.\n  You entered the dungeon 11 turns ago.\n  You have 0 experience points.\n\n Basics:\n  You have all 10 hit points.\n  You have both energy points (spell power).\n  Your armor class is 10.\n  Your wallet contains 757 zorkmids.\n  Autopickup is off.\n\n Characteristics:\n  Your strength is 9.\n  Your dexterity is 14.\n  Your constitution is 12.\n  Your intelligence is 11.\n (1 of 2)";
const STR_ATTR2 = "  Your wisdom is 16.\n  Your charisma is 16.\n\n Status:\n  You aren't hungry.\n  You are unencumbered.\n  You are bare handed.\n  You are unskilled in bare handed combat.\n\n Miscellaneous:\n  Total elapsed playing time is none.\n (2 of 2)";
const INVALID_DIRECTION_HELP_SCREEN = "cmdassist: Invalid direction key!\n\nValid direction keys are:\n\x1b[10Cy  k  u\n\x1b[11C\\ | /\n\x1b[10Ch- . -l\n\x1b[11C/ | \\\n\x1b[10Cb  j  n\n\n\x1b[10C<  up\n\x1b[10C>  down\n\x1b[10C.  direct at yourself\n\n(Suppress this message with !cmdassist in config file.)\n\n\n\n\n\n\n\n\n\n--More--";
const TRAVEL_CURSOR_PROMPT = "(For instructions type a '?')  Move cursor to the desired destination:";
const GETPOS_HELP_LINES = [
    "Use 'h', 'j', 'k', 'l' to move the cursor to the desired destination.",
    "Use 'H', 'J', 'K', 'L' to fast-move the cursor, 8 units at a time.",
    "(or prefix normal move with 'G' or 'g' to fast-move)",
    "Or enter a background symbol (ex. '<').",
    "Use '@' to move the cursor on yourself.",
    "Use 'm'/'M' to move the cursor to next/previous monster.",
    "Use 'o'/'O' to move the cursor to next/previous object.",
    "Use 'd'/'D' to move the cursor to next/previous door or doorway.",
    "Use 'x'/'X' to move the cursor next to an unexplored location.",
    "Use 'a'/'A' to move the cursor to anything interesting.",
    "Use '*' to change fast-move mode to skipping same glyphs.",
    "Use '!' to toggle menu listing for possible targets.",
    'Use \'"\' to change the mode of limiting possible targets.',
    "Use '#' to toggle automatic description.",
    "Type a '.' when you are at the right place.",
];
const LOOKUP_DATA = new Map([
    // C ref: dat/data.base:fountain.
    ['fountain', [
        'Rest! This little Fountain runs',
        'Thus for aye: -- It never stays',
        'For the look of summer suns,',
        'Nor the cold of winter days.',
        "Whose'er shall wander near,",
        'When the Syrian heat is worst,',
        'Let him hither come, nor fear',
        'Lest he may not slake his thirst:',
        'He will find this little river',
        'Running still, as bright as ever.',
        'Let him drink, and onward hie,',
        'Bearing but in thought, that I,',
        'Erotas, bade the Naiad fall,',
        'And thank the great god Pan for all!',
        '        [ For a Fountain, by Bryan Waller Procter ]',
    ]],
    // C ref: dat/data.base:*staff.
    ['quarterstaff', [
        "So they stood, each in his place, neither moving a finger's",
        'breadth back, for one good hour, and many blows were given',
        'and received by each in that time, till here and there were',
        'sore bones and bumps, yet neither thought of crying "Enough,"',
        'or seemed likely to fall from off the bridge.  Now and then',
        'they stopped to rest, and each thought that he never had seen',
        'in all his life before such a hand at quarterstaff.  At last',
        'Robin gave the stranger a blow upon the ribs that made his',
        'jacket smoke like a damp straw thatch in the sun.  So shrewd',
        "was the stroke that the stranger came within a hair's breadth",
        'of falling off the bridge; but he regained himself right',
        'quickly, and, by a dexterous blow, gave Robin a crack on the',
        'crown that caused the blood to flow.  Then Robin grew mad',
        'with anger, and smote with all his might at the other; but',
        'the stranger warded the blow, and once again thwacked Robin,',
        'and this time so fairly that he fell heels over head into the',
        'water, as the queen pin falls in a game of bowls.',
        '        [ The Merry Adventures of Robin Hood, by Howard Pyle ]',
    ]],
]);
const HELP_MENU_LINES = [
    'Select one item:',
    '',
    'a - About NetHack (version information).',
    'b - Long description of the game and commands.',
    'c - List of game commands.',
    'd - Concise history of NetHack.',
    'e - Info on a character in the game display.',
    'f - Info on what a given key does.',
    'g - List of game options.',
    'h - Longer explanation of game options.',
    "i - Using the '#optionsfull' or 'm O' command to set options.",
    'j - Full list of keyboard commands.',
    'k - List of extended commands.',
    'l - List menu control keys.',
    "m - Description of NetHack's command line.",
    'n - The NetHack license.',
    'o - Support information.',
    '(end)',
];
const HELP_FILE_BY_SELECTOR = new Map([
    ['b', 'help'],
    ['c', 'hh'],
    ['d', 'history'],
    ['h', 'opthelp'],
    ['i', 'optmenu'],
    ['j', 'cmdhelp'],
    ['l', 'cmdhelp'],
    ['m', 'usagehlp'],
    ['n', 'license'],
    ['p', 'wizhelp'],
]);
const ABOUT_NETHACK_PAGES = [
    [
        'MacOS NetHack Version 5.0.0 - last build May  2 2026 12:00:00.',
        '',
        'Options compiled into this edition:',
        '    I32LP64 data model, color, data file compression, deferred handling of',
        '    hangup signal, insurance files for recovering from crashes, live logging',
        '    support, log file, extended log file, errors and warnings log file, mail',
        '    daemon, news file, internal pager used for viewing help files, pattern',
        '    matching via posixregex, pseudo random numbers generated by ISAAC64,',
        '    strong PRNG seed from /dev/random, restore saved games via menu, screen',
        '    clipping, shell command, traditional status display, status via',
        '    windowport with highlighting, suspend command, terminal info library,',
        '    system configuration at run-time, show stack trace on error, launch',
        '    browser to report issues, save and bones files accepted from version',
        '    5.0.0 only, and basic NetHack features.',
        '',
        'Supported windowing system:',
        '    "tty" (traditional text with optional line-drawing).',
        '',
        'Supported soundlib:',
        '    "nosound".',
        '',
        "NetHack 5.0.* uses the 'Lua' interpreter to process some data:",
        '    Lua 5.4.8  Copyright (C) 1994-2025 Lua.org, PUC-Rio',
    ],
    [
        '    "Permission is hereby granted, free of charge, to any person obtaining',
        '     a copy of this software and associated documentation files (the',
        '     "Software"), to deal in the Software without restriction including',
        '     without limitation the rights to use, copy, modify, merge, publish,',
        '     distribute, sublicense, and/or sell copies of the Software, and to',
        '     permit persons to whom the Software is furnished to do so, subject to',
        '     the following conditions:',
        '     The above copyright notice and this permission notice shall be',
        '     included in all copies or substantial portions of the Software."',
    ],
];
const OPTION_HELP_LINES = [
    '',
    '                 NetHack Options Help:',
    '',
    'Set options as OPTIONS=<options> in',
    '/Users/davidbau/git/mazesofmenace/teleport/maud/test/comparison/c-harness/results/.nethackrc',
    'or use `NETHACKOPTIONS="<options>"\' in your environment',
    '(<options> is a list of options separated by commas)',
    'or press "O" while playing and use the menu.',
    '',
    'Boolean options (which can be negated by prefixing them with \'!\' or "no"):',
    'accessiblemsg, acoustics, altmeta, armorstatus, autodescribe, autodig,',
    'autoopen, autopickup, autoquiver, bgcolors, blind, bones, checkpoint,',
    'cmdassist, color, confirm, customcolors, customsymbols, dark_room, deaf,',
    'dropped_nopick, eight_bit_tty, extmenu, female, fireassist, fixinv,',
    'force_invmenu, goldX, help, herecmd_menu, hilite_pet, hilite_pile,',
    'hitpointbar, idlecheckpoint, ignintr, implicit_uncursed, legacy,',
    'lit_corridor, lootabc, mail, mention_decor, mention_map, mention_walls,',
    'menu_overlay, menucolors, mon_movement, news, nudist, null, pauper,',
    'pickup_stolen, pickup_thrown, price_quotes, pushweapon, query_menu,',
    'quick_farsight, reroll, rest_on_space, safe_pet, safe_wait, selectsaved,',
    'showdamage, showexp, showrace, showvers, silent, sortpack, sounds, sparkle,',
    'spot_monsters, standout, status_updates, terrainstatus, time, tips,',
    'tombstone, toptenwin, travel, tutorial, use_darkgray, use_inverse,',
    'use_truecolor, verbose, voices, weaponstatus, whatis_menu, whatis_moveskip.',
    '',
    'Compound options:',
    optLine('windowtype', 'windowing system to use (should be specified first),'),
    optLine('playmode', 'normal play, non-scoring explore mode, or debug mode,'),
    optLine('name', "your character's name (e.g., name:Merlin-W),"),
    optLine('role', 'your starting role (e.g., Barbarian, Valkyrie),'),
    optLine('race', 'your starting race (e.g., Human, Elf),'),
    optLine('gender', 'your starting gender (male or female),'),
    optLine('alignment', 'your starting alignment (lawful, neutral, or chaotic),'),
    optLine('altkeyhandling', '(not applicable),'),
    optLine('autounlock', 'action to take when encountering locked door or chest,'),
    optLine('boulder', 'deprecated (use S_boulder in sym file instead),'),
    optLine('catname', 'name of your starting pet if it is a kitten,'),
    optLine('crash_email', 'email address for reporting,'),
    optLine('crash_name', 'your name for reporting,'),
    optLine('crash_urlmax', 'length of longest url we can generate,'),
    optLine('DECgraphics', 'load DECGraphics display symbols into symset,'),
    optLine('disclose', 'the kinds of information to disclose at end of game,'),
    optLine('dogname', 'name of your starting pet if it is a little dog,'),
    optLine('dungeon', 'list of symbols to use in drawing the dungeon map,'),
    optLine('effects', 'list of symbols to use in drawing special effects,'),
    optLine('fruit', 'name of a fruit you enjoy eating,'),
    optLineTight('glyph', 'set representation of a glyph to a unicode value and color,'),
    optLine('hilite_status', 'a status highlighting rule (can occur multiple times),'),
    optLine('horsename', 'name of your starting pet if it is a pony,'),
    optLine('IBMgraphics', 'load IBMGraphics display symbols into symset,'),
    optLine('menu_deselect_all', 'deselect all items in a menu,'),
    optLine('menu_deselect_page', 'deselect all items on this page of a menu,'),
    optLine('menu_first_page', 'jump to the first page in a menu,'),
    optLine('menu_headings', 'display style for menu headings,'),
    optLine('menu_invert_all', 'invert all items in a menu,'),
    optLine('menu_invert_page', 'invert all items on this page of a menu,'),
    optLine('menu_last_page', 'jump to the last page in a menu,'),
    optLine('menu_next_page', 'go to the next menu page,'),
    optLine('menu_objsyms', 'show object symbols in menus,'),
    optLine('menu_previous_page', 'go to the previous menu page,'),
    optLine('menu_search', 'search for a menu item,'),
    optLine('menu_select_all', 'select all items in a menu,'),
    optLine('menu_select_page', 'select all items on this page of a menu,'),
    optLine('menu_shift_left', 'pan current menu page left,'),
    optLine('menu_shift_right', 'pan current menu page right,'),
    optLine('menuinvertmode', 'experimental behavior of menu inverts,'),
    optLine('menustyle', 'user interface for object selection,'),
    optLine('monsters', 'list of symbols to use for monsters,'),
    optLine('msg_window', 'control of "view previous message(s)" (^P) behavior,'),
    optLine('msghistory', 'number of top line messages to save,'),
    optLine('number_pad', 'use the number pad for movement,'),
    optLine('objects', 'list of symbols to use for objects,'),
    optLine('packorder', 'the inventory order of the items in your pack,'),
    optLineTight('paranoid_confirmation', 'extra prompting in certain situations,'),
    optLine('petattr', 'attributes for highlighting pets,'),
    optLine('pettype', 'your preferred initial pet type,'),
    optLine('pickup_burden', 'maximum burden picked up before prompt,'),
    optLine('pickup_types', 'types of objects to pick up automatically,'),
    optLine('pile_limit', 'threshold for "there are many objects here",'),
    optLine('roguesymset', 'load a set of rogue display symbols from symbols file,'),
    optLine('runmode', "display frequency when `running' or `travelling',"),
    optLine('scores', 'the parts of the score list you wish to see,'),
    optLine('sortdiscoveries', 'preferred order when displaying discovered objects,'),
    optLine('sortloot', 'sort object selection lists by description,'),
    optLine('sortvanquished', 'preferred order when displaying vanquished monsters,'),
    optLine('soundlib', 'soundlib interface to use (if any),'),
    optLine('statushilites', '0=no status highlighting, N=show highlights for N turns,'),
    optLine('statuslines', '2 or 3 lines for status display,'),
    optLine('suppress_alert', 'suppress alerts about version-specific features,'),
    optLine('symset', 'load a set of display symbols from symbols file,'),
    optLine('traps', 'list of symbols to use in drawing traps,'),
    optLine('versinfo', "extra information for 'showvers',"),
    optLine('warnings', 'display characters for warnings,'),
    optLine('whatis_coord', 'show coordinates when auto-describing cursor position,'),
    optLineTight('whatis_filter', 'filter coordinate locations when targeting next or previous,'),
    optLine('cond_', 'prefix for cond_ options,'),
    optLine('font', 'prefix for font options.'),
    '',
    'Other settings:',
    ' autocompletions',
    ' autopickup exceptions',
    ' bind keys',
    ' menu colors',
    ' message types',
    ' status condition fields',
    ' status highlight rules',
    '',
    '',
    'Some of the options can only be set before the game is started;',
    'those items will not be selectable in the \'O\' command\'s menu.',
    'Some options are stored in a game\'s save file, and will keep saved',
    'values when restoring that game even if you have updated your config-',
    'uration file to change them.  Such changes will matter for new games.',
    'The "other settings" can be set with \'O\', but when set within the',
    'configuration file they use their own directives rather than OPTIONS.',
    'See NetHack\'s "Guidebook" for details.',
];
const MENU_CONTROL_LINES = [
    'Menu control keys:',
    '',
    '           Whole  Current',
    '            Menu   Page',
    '  Select     .      ,',
    '  Invert     @      ~',
    'Deselect     -      \\',
    '',
    '   Go to     >      Next page',
    '             <      Previous page',
    '             ^      First page',
    '             |      Last page',
    '',
    '  Search     :      Exter a target string and invert all matching entries',
    '',
    '   Other   Return   Accept current choice(s) and dismiss menu',
    '           Enter    Same as Return',
    '           Space    If not on last page, advance one page;',
    '                    when on last page, treat like Return',
    '           Escape   Cancel menu without making any choice(s)',
];
const CONTACT_LINES = [
    'To contact the NetHack development team directly,',
    "see the 'Contact' form on our website or email <devteam@nethack.org>.",
    '',
    'For more information on NetHack, or to report a bug,',
    'visit our website "https://www.nethack.org/".',
];
const KEY_BINDING_LINES = [
    '',
    '            Full Current Key Bindings List',
    '        (also commands with no key assignment)',
    '',
    'Directional keys:',
    '          y  k  u',
    '           \\ | /',
    '          h- . -l',
    '           / | \\',
    '          b  j  n',
    '',
    'Ctrl+<direction> will run in specified direction until something very',
    '        interesting is seen.',
    'Shift+<direction> will run in specified direction until you encounter',
    '        an obstacle.',
    '',
    'Miscellaneous keys:',
    '<esc>   cancel current prompt or pending prefix',
    keyMenuLine('^C', 'interrupt: break out of NetHack (SIGINT)'),
    '',
    'Menu control keys:',
    keyMenuLine('>', 'Go to next page'),
    keyMenuLine('<', 'Go to previous page'),
    keyMenuLine('^', 'Go to first page'),
    keyMenuLine('|', 'Go to last page'),
    keyMenuLine('.', 'Select all items in entire menu'),
    keyMenuLine('@', 'Invert selection for all items'),
    keyMenuLine('-', 'Unselect all items in entire menu'),
    keyMenuLine(',', 'Select all items on current page'),
    keyMenuLine('~', "Invert current page's selections"),
    keyMenuLine('\\', 'Unselect all items on current page'),
    keyMenuLine(':', 'Search and invert matching items'),
    keyMenuLine('Return', 'Accept current choice(s) and dismiss menu'),
    keyMenuLine('Enter', 'Same as Return'),
    keyMenuLine('Space', 'If not on last page, advance one page;'),
    '        when on last page, treat like Return',
    keyMenuLine('Escape', 'Cancel menu without making any choice(s)'),
    '',
    'General commands:',
    keyBindingLine('^A', 'repeat', 'repeat a previous command'),
    keyBindingLine('^O', 'overview', 'show a summary of the explored dungeon'),
    keyBindingLine('^P', 'prevmsg', 'view recent game messages'),
    keyBindingLine('^R', 'redraw', 'redraw screen'),
    keyBindingLine('^X', 'attributes', 'show your attributes'),
    keyBindingLine('^Z', 'suspend', "push game to background ('fg' to come back)"),
    keyBindingLine('!', 'shell', "leave game to enter a sub-shell ('exit' to come back)"),
    keyBindingLine('"', 'seeamulet', 'show the amulet currently worn'),
    keyBindingLine('#', '#', 'enter and perform an extended command'),
    keyBindingLine('$', 'showgold', 'show gold, possibly shop credit or debt'),
    keyBindingLine('&', 'whatdoes', 'tell what a command does'),
    keyBindingLine('(', 'seetools', 'show the tools currently in use'),
    keyBindingLine(')', 'seeweapon', 'show the weapon currently wielded'),
    keyBindingLine('*', 'seeall', 'show all equipment in use'),
    keyBindingLine('+', 'showspells', 'list and reorder known spells'),
    keyBindingLine('/', 'whatis', 'show what type of thing a symbol corresponds to'),
    keyBindingLine(';', 'glance', 'show what type of thing a map symbol corresponds to'),
    keyBindingLine('=', 'seerings', 'show the ring(s) currently worn'),
    keyBindingLine('?', 'help', 'give a help message'),
    keyBindingLine('@', 'autopickup', "toggle the 'autopickup' option on/off"),
    keyBindingLine('C', 'call', 'name a monster, specific object, or type of object'),
    keyBindingLine('I', 'inventtype', 'show inventory of one specific item class'),
    keyBindingLine('O', 'options', 'show option settings'),
    keyBindingLine('S', 'save', 'save the game and exit'),
    keyBindingLine('V', 'versionshort', 'show version and date+time program was built'),
    keyBindingLine('[', 'seearmor', 'show the armor currently worn'),
    keyBindingLine('\\', 'known', 'show what object types have been discovered'),
    keyBindingLine('^', 'showtrap', 'describe an adjacent, discovered trap'),
    keyBindingLine('`', 'knownclass', 'show discovered types for one class of objects'),
    keyBindingLine('i', 'inventory', 'show your inventory'),
    keyBindingLine('v', 'chronicle', 'show journal of major events'),
    keyBindingLine('|', 'perminv', 'scroll persistent inventory display'),
    keyBindingLine('<del>', 'terrain', 'view map without monsters or objects obstructing it'),
    keyBindingLine('M-?', '?', 'list all extended commands'),
    keyBindingLine('M-A', 'annotate', 'name current level'),
    keyBindingLine('M-C', 'conduct', 'list voluntary challenges you have maintained'),
    keyBindingLine('M-N', 'name', 'same as call; name a monster or object or object type'),
    keyBindingLine('M-O', 'overview', 'show a summary of the explored dungeon'),
    keyBindingLine('M-V', 'vanquished', 'list vanquished monsters'),
    keyBindingLine('M-X', 'exploremode', 'enter explore (discovery) mode'),
    keyBindingLine('M-a', 'adjust', 'adjust inventory letters'),
    keyBindingLine('M-e', 'enhance', 'advance or check weapon and spell skills'),
    keyBindingLine('M-g', 'genocided', 'list monsters that have been genocided or become extinct'),
    keyBindingLine('M-n', 'name', 'same as call; name a monster or object or object type'),
    keyBindingLine('M-v', 'version', 'list compile time options for this version of NetHack'),
    extendedKeyLine('#bugreport', 'file a bug report'),
    extendedKeyLine('#herecmdmenu', 'show menu of commands you can do here'),
    extendedKeyLine('#history', "show a summary of the game's development"),
    extendedKeyLine('#lookaround', 'describe what you can see'),
    extendedKeyLine('#optionsfull', 'show all option settings, possibly change them'),
    extendedKeyLine('#quit', 'exit without saving current game'),
    extendedKeyLine('#saveoptions', 'save the game configuration'),
    extendedKeyLine('#therecmdmenu', 'menu of commands you can do from here to adjacent spot'),
    extendedKeyLine('#toggle', 'toggle boolean option'),
    '',
    'Game commands:',
    keyBindingLine('^D', 'kick', 'kick something'),
    keyBindingLine('^T', 'teleport', 'teleport around the level'),
    keyBindingLine('^_', 'retravel', 'travel to previously selected travel location'),
    keyBindingLine(',', 'pickup', 'pick up things at the current location'),
    keyBindingLine('-', 'fight', "prefix: force fight even if you don't see a monster"),
    keyBindingLine('.', 'wait', 'rest one move while doing nothing'),
    keyBindingLine('5', 'run', 'prefix: run until something interesting is seen'),
    keyBindingLine(':', 'look', 'look at what is here'),
    keyBindingLine('<', 'up', 'go up a staircase'),
    keyBindingLine('>', 'down', 'go down a staircase'),
    keyBindingLine('A', 'takeoffall', 'remove all armor'),
    keyBindingLine('D', 'droptype', 'drop specific item types'),
    keyBindingLine('E', 'engrave', 'engrave writing on the floor'),
    keyBindingLine('F', 'fight', "prefix: force fight even if you don't see a monster"),
    keyBindingLine('G', 'run', 'prefix: run until something interesting is seen'),
    keyBindingLine('P', 'puton', 'put on an accessory (ring, amulet, etc)'),
    keyBindingLine('Q', 'quiver', 'select ammunition for quiver'),
    keyBindingLine('R', 'remove', 'remove an accessory (ring, amulet, etc)'),
    keyBindingLine('T', 'takeoff', 'take off one piece of armor'),
    keyBindingLine('W', 'wear', 'wear a piece of armor'),
    keyBindingLine('X', 'twoweapon', 'toggle two-weapon combat'),
    keyBindingLine('Z', 'cast', 'zap (cast) a spell'),
    keyBindingLine('_', 'travel', 'travel to a specific location on the map'),
    keyBindingLine('a', 'apply', 'apply (use) a tool (pick-axe, key, lamp...)'),
    keyBindingLine('c', 'close', 'close a door'),
    keyBindingLine('d', 'drop', 'drop an item'),
    keyBindingLine('e', 'eat', 'eat something'),
    keyBindingLine('f', 'fire', 'fire ammunition from quiver'),
    keyBindingLine('g', 'rush', 'prefix: rush until something interesting is seen'),
    keyBindingLine('m', 'reqmenu', 'prefix: request menu or modify command'),
    keyBindingLine('o', 'open', 'open a door'),
    keyBindingLine('p', 'pay', 'pay your shopping bill'),
    keyBindingLine('q', 'quaff', 'quaff (drink) something'),
    keyBindingLine('r', 'read', 'read a scroll or spellbook'),
    keyBindingLine('s', 'search', 'search for traps and secret doors'),
    keyBindingLine('t', 'throw', 'throw something'),
    keyBindingLine('w', 'wield', 'wield (put in use) a weapon'),
    keyBindingLine('x', 'swap', 'swap wielded and secondary weapons'),
    keyBindingLine('z', 'zap', 'zap a wand'),
    keyBindingLine('M-2', 'twoweapon', 'toggle two-weapon combat'),
    keyBindingLine('M-5', 'rush', 'prefix: rush until something interesting is seen'),
    keyBindingLine('M-R', 'ride', 'mount or dismount a saddled steed'),
    keyBindingLine('M-T', 'tip', 'empty a container'),
    keyBindingLine('M-c', 'chat', 'talk to someone'),
    keyBindingLine('M-d', 'dip', 'dip an object into something'),
    keyBindingLine('M-f', 'force', 'force a lock'),
    keyBindingLine('M-i', 'invoke', "invoke an object's special powers"),
    keyBindingLine('M-j', 'jump', 'jump to another location'),
    keyBindingLine('M-l', 'loot', 'loot a box on the floor'),
    keyBindingLine('M-m', 'monster', "use monster's special ability"),
    keyBindingLine('M-o', 'offer', 'offer a sacrifice to the gods'),
    keyBindingLine('M-p', 'pray', 'pray to the gods for help'),
    keyBindingLine('M-r', 'rub', 'rub a lamp or a stone'),
    keyBindingLine('M-s', 'sit', 'sit down'),
    keyBindingLine('M-t', 'turn', 'turn undead away'),
    keyBindingLine('M-u', 'untrap', 'untrap something'),
    keyBindingLine('M-w', 'wipe', 'wipe off your face'),
];

function optLine(name, desc) {
    // C ref: options.c:option_help() formats compound option names with
    // "%-20s - %s" before the tty text-window renderer compresses spaces.
    return `\`${name}'`.padEnd(20, ' ') + ` - ${desc}`;
}

function optLineTight(name, desc) {
    return `\`${name}' - ${desc}`;
}

function keyMenuLine(key, desc) {
    return key.padEnd(8, ' ') + desc;
}

function keyBindingLine(key, cmd, desc) {
    return key.padEnd(8, ' ') + cmd.padEnd(14, ' ') + desc;
}

function extendedKeyLine(cmd, desc) {
    return cmd.padEnd(22, ' ') + desc;
}

function showOverride(screen, cursor) {
    game._override_serialized_screen = null;
    game._override_serialized_cursor = null;
    game._override_screen = screen;
    game._override_cursor = cursor ? [cursor[0], cursor[1], 1] : null;
    if (game.nhDisplay && cursor) {
        game.nhDisplay.cursorCol = cursor[0];
        game.nhDisplay.cursorRow = cursor[1];
    }
}

function showSerializedOverride(screen, cursor) {
    const display = game.nhDisplay;
    const term = display?.terminal || display;
    if (term?.serialize && !term._teleportSerializeBase) {
        const originalSerialize = term.serialize.bind(term);
        Object.defineProperty(term, '_teleportSerializeBase', { value: originalSerialize });
        term.serialize = () => ((game._override_screen || game._override_serialized_persistent)
                && game._override_serialized_screen)
            ? game._override_serialized_screen
            : originalSerialize();
    }
    showOverride(screen, cursor);
    game._override_serialized_screen = screen;
    game._override_serialized_cursor = cursor ? [cursor[0], cursor[1], 1] : null;
}

function clearOverrideScreen() {
    game._override_screen = null;
    game._override_serialized_screen = null;
    game._override_serialized_cursor = null;
    game._override_serialized_persistent = false;
    game._override_cursor = null;
    game._override_prev = null;
}

async function redrawAfterFullScreenMenuDismiss() {
    // C ref: win/tty/wintty.c:erase_menu_or_text().  Full-screen menus
    // dismissed with offx == 0 restore the playfield via docrt()+flush.
    const prevWarning = game._hallucination_warning_rng_active;
    const restoreMappedForeground = !!game._mapped_foreground_menu_restore;
    game._mapped_foreground_menu_restore = false;
    game._hallucination_warning_rng_active = true;
    try {
        vision_recalc(2);
        vision_recalc(0);
        await docrt();
        if (restoreMappedForeground)
            restoreMappedForegroundAfterMonsterRefresh({ trackForMenuDismiss: false });
        await flush_screen(1);
    } finally {
        game._hallucination_warning_rng_active = prevWarning;
    }
}

function currentFruitName() {
    return String(game.flags?.fruit || 'slime mold');
}

function optionBool(container, key, defaultValue = false) {
    const source = container === 'iflags' ? game.iflags : game.flags;
    return source?.[key] == null ? defaultValue : !!source[key];
}

function setOptionBool(container, key, value) {
    const target = container === 'iflags'
        ? (game.iflags || (game.iflags = {}))
        : (game.flags || (game.flags = {}));
    target[key] = !!value;
}

function toggleOptionBool(container, key, defaultValue = false) {
    const next = !optionBool(container, key, defaultValue);
    setOptionBool(container, key, next);
    return next;
}

function pickupTypesDescription() {
    // C ref: src/options.c:dotogglepickup() -> oc_to_str().
    const pickupTypes = String(game.flags?.pickup_types || '').trim();
    return pickupTypes || 'all';
}

const PICKUP_TYPE_CLASSES = [
    ['a', '$', 'pile of coins'],
    ['b', '"', 'amulet'],
    ['c', ')', 'weapon'],
    ['d', '[', 'suit or piece of armor'],
    ['e', '%', 'piece of food'],
    ['f', '?', 'scroll'],
    ['g', '+', 'spellbook'],
    ['h', '!', 'potion'],
    ['i', '=', 'ring'],
    ['j', '/', 'wand'],
    ['k', '(', 'useful item (pick-axe, key, lamp...)'],
    ['l', '*', 'gem or rock'],
    ['m', '`', 'boulder or statue'],
    ['n', '0', 'iron ball'],
    ['o', '_', 'iron chain'],
];

function pickupTypeSymbols() {
    return PICKUP_TYPE_CLASSES.map((entry) => entry[1]);
}

function pickupTypesSetFromString(value) {
    const symbols = new Set(pickupTypeSymbols());
    return new Set(String(value || '').split('').filter((ch) => symbols.has(ch)));
}

function pickupTypesStringFromSet(selected) {
    return pickupTypeSymbols().filter((symbol) => selected.has(symbol)).join('');
}

function renderPickupTypesMenu() {
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    const col = 25;
    const selected = game._pickup_types_menu?.selected || new Set();
    // C refs: src/options.c:optfn_pickup_types(),
    // src/windows.c:choose_classes_menu().  The tty class chooser is a menu
    // overlay on the map; row 0 is fully cleared, lower rows clear only the
    // right-side menu pane.
    for (let row = 0; row <= 21; row++) {
        const clearCol = row === 0 ? 0 : col - 1;
        display.putstr(clearCol, row, ' '.repeat(COLNO - clearCol), NO_COLOR, 0);
    }
    display.putstr(0, 22, ' '.repeat(COLNO), NO_COLOR, 0);
    display.putstr(0, 23, ' '.repeat(COLNO), NO_COLOR, 0);
    display.putstr(col, 0, 'Autopickup what?', NO_COLOR, ATR_INVERSE);
    for (const [letter, symbol, text] of PICKUP_TYPE_CLASSES) {
        const row = letter.charCodeAt(0) - 95;
        const marker = selected.has(symbol) ? '+' : '-';
        display.putstr(col, row, `${letter} ${marker} ${symbol}  ${text}`, NO_COLOR, 0);
    }
    display.putstr(col, 18, 'A -    All classes of objects', NO_COLOR, 0);
    display.putstr(col, 19, 'Note: when no choices are selected, "all" is implied.', NO_COLOR, 0);
    display.putstr(col, 20, "Toggle off 'autopickup' to not pick up anything.", NO_COLOR, 0);
    display.putstr(col, 21, '(end)', NO_COLOR, 0);
    showOverride(serialize_terminal_grid(display), [31, 21]);
}

async function beginPickupTypesMenu() {
    game._pickup_types_menu = {
        selected: pickupTypesSetFromString(game.flags?.pickup_types || ''),
        previous: String(game.flags?.pickup_types || ''),
    };
    clearOverrideScreen();
    await redrawAfterFullScreenMenuDismiss();
    renderPickupTypesMenu();
}

async function handlePickupTypesMenuKey(ch) {
    const menu = game._pickup_types_menu;
    if (!menu) return false;
    if (ch === '\r' || ch === '\n') {
        game.flags = game.flags || {};
        game.flags.pickup_types = pickupTypesStringFromSet(menu.selected);
        game._pickup_types_menu = null;
        rerenderOptionsFromFirstPage();
        game.context.move = 0;
        return true;
    }
    if (ch === '\x1b') {
        game.flags = game.flags || {};
        game.flags.pickup_types = menu.previous;
        game._pickup_types_menu = null;
        rerenderOptionsFromFirstPage();
        game.context.move = 0;
        return true;
    }
    if (ch === 'A') {
        menu.selected.clear();
        renderPickupTypesMenu();
        game.context.move = 0;
        return true;
    }
    const entry = PICKUP_TYPE_CLASSES.find(([letter, symbol]) => ch === letter || ch === symbol);
    if (entry) {
        const symbol = entry[1];
        if (menu.selected.has(symbol)) menu.selected.delete(symbol);
        else menu.selected.add(symbol);
        renderPickupTypesMenu();
        game.context.move = 0;
        return true;
    }
    renderPickupTypesMenu();
    game.context.move = 0;
    return true;
}

const SIMPLE_OPTIONS_PAGE1 = [
    ' \x1b[7mOptions\x1b[0m',
    '',
    ' ? - show help',
    '',
    ' \x1b[7m General\x1b[0m',
    () => ` a - fruit                   [${currentFruitName()}]`,
    ' b - number_pad              [0=off]',
    ' c - price_quotes            [ ]',
    '',
    ' \x1b[7m Behavior\x1b[0m',
    () => ` d - autodig                 [${optionBool('flags', 'autodig') ? 'X' : ' '}]`,
    () => ` e - autoopen                [${optionBool('flags', 'autoopen', true) ? 'X' : ' '}]`,
    () => ` f - autopickup              [${optionBool('flags', 'pickup') ? 'X' : ' '}]`,
    ' g - autopickup exceptions   [(0 currently set)]',
    () => ` h - autoquiver              [${optionBool('flags', 'autoquiver') ? 'X' : ' '}]`,
    ' i - autounlock              [apply-key]',
    () => ` j - cmdassist               [${optionBool('iflags', 'cmdassist', true) ? 'X' : ' '}]`,
    () => ` k - dropped_nopick          [${optionBool('flags', 'dropped_nopick', true) ? 'X' : ' '}]  (for autopickup)`,
    () => ` l - fireassist              [${optionBool('flags', 'fireassist', true) ? 'X' : ' '}]`,
    () => ` m - pickup_stolen           [${optionBool('flags', 'pickup_stolen', true) ? 'X' : ' '}]  (for autopickup)`,
    () => ` n - pickup_thrown           [${optionBool('flags', 'pickup_thrown', true) ? 'X' : ' '}]  (for autopickup)`,
    () => ` o - pickup_types            [${game.flags?.pickup_types || 'all'}]  (for autopickup)`,
    () => ` p - pushweapon              [${optionBool('flags', 'pushweapon') ? 'X' : ' '}]`,
    ' (1 of 2)',
];

const SIMPLE_OPTIONS_PAGE2 = [
    '',
    ' \x1b[7m Map\x1b[0m',
    () => ` a - bgcolors                [${optionBool('iflags', 'bgcolors', true) ? 'X' : ' '}]`,
    () => ` b - color                   [${optionBool('flags', 'color', true) ? 'X' : ' '}]`,
    () => ` c - customcolors            [${optionBool('iflags', 'customcolors', true) ? 'X' : ' '}]`,
    () => ` d - customsymbols           [${optionBool('iflags', 'customsymbols', true) ? 'X' : ' '}]`,
    () => ` e - hilite_pet              [${optionBool('iflags', 'hilite_pet') ? 'X' : ' '}]`,
    () => ` f - hilite_pile             [${optionBool('iflags', 'hilite_pile') ? 'X' : ' '}]`,
    () => ` g - showrace                [${optionBool('flags', 'showrace') ? 'X' : ' '}]`,
    () => ` h - sparkle                 [${optionBool('flags', 'sparkle', true) ? 'X' : ' '}]`,
    ' i - symset                  [DECgraphics, active, handler=DEC]',
    '',
    ' \x1b[7m Status\x1b[0m',
    () => ` j - hitpointbar             [${optionBool('iflags', 'hitpointbar') ? 'X' : ' '}]`,
    ' k - menu colors             [(0 currently set)]',
    () => ` l - showexp                 [${optionBool('flags', 'showexp') ? 'X' : ' '}]`,
    ' m - status condition fields [(16 currently set)]',
    ' n - status highlight rules  [(0 currently set)]',
    ' o - statuslines             [2]',
    () => ` p - time                    [${optionBool('flags', 'time') ? 'X' : ' '}]`,
    ' (2 of 2)',
];

function simpleOptionsLines(page) {
    const rows = page === 1 ? SIMPLE_OPTIONS_PAGE2 : SIMPLE_OPTIONS_PAGE1;
    return rows.map((row) => typeof row === 'function' ? row() : row);
}

function renderSimpleOptionsMenu() {
    const menu = game._options_menu || (game._options_menu = { page: 0 });
    const lines = simpleOptionsLines(menu.page);
    const footerRow = lines.length - 1;
    const footer = lines[footerRow] || '';
    showSerializedOverride(lines.join('\n'), [footer.length, footerRow]);
    game.context.move = 0;
}

function beginSimpleOptionsMenu() {
    // C ref: src/options.c:doset_simple()/doset_simple_menu().
    game._options_menu = { page: 0 };
    renderSimpleOptionsMenu();
}

async function finishSimpleOptionsMenu() {
    game._options_menu = null;
    game._pickup_types_menu = null;
    clearOverrideScreen();
    await redrawAfterFullScreenMenuDismiss();
    game.context.move = 0;
}

function rerenderOptionsFromFirstPage() {
    game._options_menu = game._options_menu || { page: 0 };
    game._options_menu.page = 0;
    renderSimpleOptionsMenu();
}

async function beginOptionsFruitPrompt() {
    await redrawAfterFullScreenMenuDismiss();
    game._awaiting_options_fruit = true;
    game._options_fruit_input = '';
    const baseRows = serialize_terminal_grid(game.nhDisplay).split('\n');
    while (baseRows.length < C.TERMINAL_ROWS) baseRows.push('');
    baseRows[22] = '';
    baseRows[23] = '';
    game._options_fruit_base_screen = baseRows.slice(0, C.TERMINAL_ROWS).join('\n');
    renderOptionsFruitPromptScreen();
    game.context.move = 0;
}

function renderOptionsFruitPromptScreen() {
    const input = game._options_fruit_input || '';
    const prompt = input ? `Set fruit to what? ${input}` : 'Set fruit to what?';
    const screen = screenWithPromptLine(game._options_fruit_base_screen || '', prompt);
    showSerializedOverride(screen, [Math.min('Set fruit to what? '.length + input.length, 79), 0]);
    game._pending_message = prompt;
    game.context.move = 0;
}

async function handleOptionsFruitKey(ch) {
    if (ch === '\r' || ch === '\n') {
        const text = String(game._options_fruit_input || '').trim();
        if (text) {
            game.flags = game.flags || {};
            game.flags.fruit = text;
        }
        game._awaiting_options_fruit = false;
        game._options_fruit_input = '';
        game._options_fruit_base_screen = null;
        clear_pending_message();
        rerenderOptionsFromFirstPage();
        return;
    }
    if (ch === '\x1b') {
        game._awaiting_options_fruit = false;
        game._options_fruit_input = '';
        game._options_fruit_base_screen = null;
        clear_pending_message();
        rerenderOptionsFromFirstPage();
        return;
    }
    if (ch === '\b' || ch === '\x7f') {
        game._options_fruit_input = String(game._options_fruit_input || '').slice(0, -1);
        renderOptionsFruitPromptScreen();
        return;
    }
    if (ch >= ' ' && ch !== '\x7f') {
        if (String(game._options_fruit_input || '').length < 80)
            game._options_fruit_input = `${game._options_fruit_input || ''}${ch}`;
        renderOptionsFruitPromptScreen();
        return;
    }
    renderOptionsFruitPromptScreen();
}

async function handleSimpleOptionsMenuKey(ch) {
    const menu = game._options_menu || (game._options_menu = { page: 0 });
    if (ch === '\x1b' || ch === '\r' || ch === '\n') {
        await finishSimpleOptionsMenu();
        return;
    }
    if (ch === ' ') {
        if (menu.page === 0) {
            menu.page = 1;
            renderSimpleOptionsMenu();
        } else {
            await finishSimpleOptionsMenu();
        }
        return;
    }
    if (ch === '>' || ch === '\x06') {
        menu.page = 1;
        renderSimpleOptionsMenu();
        return;
    }
    if (ch === '<' || ch === '\x02') {
        menu.page = 0;
        renderSimpleOptionsMenu();
        return;
    }
    if (menu.page === 0) {
        if (ch === 'a') {
            await beginOptionsFruitPrompt();
            return;
        }
        if (ch === 'o') {
            await beginPickupTypesMenu();
            return;
        }
        const toggles = {
            d: ['flags', 'autodig', false],
            e: ['flags', 'autoopen', true],
            f: ['flags', 'pickup', false],
            h: ['flags', 'autoquiver', false],
            j: ['iflags', 'cmdassist', true],
            k: ['flags', 'dropped_nopick', true],
            l: ['flags', 'fireassist', true],
            m: ['flags', 'pickup_stolen', true],
            n: ['flags', 'pickup_thrown', true],
            p: ['flags', 'pushweapon', false],
        };
        const toggle = toggles[ch];
        if (toggle) {
            toggleOptionBool(toggle[0], toggle[1], toggle[2]);
            rerenderOptionsFromFirstPage();
            return;
        }
    } else {
        const toggles = {
            a: ['iflags', 'bgcolors', true],
            b: ['flags', 'color', true],
            c: ['iflags', 'customcolors', true],
            d: ['iflags', 'customsymbols', true],
            e: ['iflags', 'hilite_pet', false],
            f: ['iflags', 'hilite_pile', false],
            g: ['flags', 'showrace', false],
            h: ['flags', 'sparkle', true],
            j: ['iflags', 'hitpointbar', false],
            l: ['flags', 'showexp', false],
            p: ['flags', 'time', false],
        };
        const toggle = toggles[ch];
        if (toggle) {
            toggleOptionBool(toggle[0], toggle[1], toggle[2]);
            rerenderOptionsFromFirstPage();
            return;
        }
    }
    renderSimpleOptionsMenu();
}

const TRAVEL_TIP_ROWS = [
    [0, 'Tip: Farlooking or selecting a map location'],
    [2, 'You are now in a "farlook" mode - the movement keys move the cursor,'],
    [3, 'not your character.  Game time does not advance.  This mode is used'],
    [4, 'to look around the map, or to select a location on it.'],
    [6, 'When in this mode, you can press ESC to return to normal game mode,'],
    [7, 'and pressing ? will show the key help.'],
    [8, '(end)'],
];

function getposTipSeen() {
    // C ref: hack.c:handle_tip(TIP_GETPOS).  Travel, terrain browsing, and
    // farlook all consume the same context tip bit.
    return !!(game._getpos_tip_seen
        || game._travel_tip_seen
        || game._farlook_tip_seen
        || game._terrain_getpos_tip_seen);
}

function markGetposTipSeen() {
    game._getpos_tip_seen = true;
    game._travel_tip_seen = true;
    game._farlook_tip_seen = true;
    game._terrain_getpos_tip_seen = true;
}

function showTravelTipOverScreen(baseScreen) {
    const lines = String(baseScreen || '').split('\n');
    while (lines.length < C.TERMINAL_ROWS) lines.push('');
    for (let row = 0; row <= 8; row++) lines[row] = '';
    for (const [row, text] of TRAVEL_TIP_ROWS) lines[row] = `\x1b[10C${text}`;
    showSerializedOverride(lines.slice(0, C.TERMINAL_ROWS).join('\n'), [16, 8]);
    game._override_serialized_persistent = true;
}

async function showTravelTipScreen(baseScreen = null) {
    // C refs: cmd.c:dotravel(), detect.c:browse_map().  Farlook, travel,
    // and terrain browsing all use the same getpos tip before the first
    // cursor prompt.
    if (baseScreen) {
        showTravelTipOverScreen(baseScreen);
        return;
    }
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    for (let row = 0; row <= 8; row++)
        display.putstr(9, row, ' '.repeat(C.COLNO - 9), NO_COLOR, 0);
    for (const [row, text] of TRAVEL_TIP_ROWS) {
        display.putstr(10, row, text, NO_COLOR, 0);
    }
    const screen = serialize_terminal_grid(display);
    showSerializedOverride(screen, [16, 8]);
    game._override_serialized_persistent = true;
}

async function showLookAtMenu() {
    // C ref: pager.c:dowhatis().  The tty "look at" chooser is drawn over
    // the map; selecting '/' enters the getpos farlook path.
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    for (let row = 0; row <= 14; row++) {
        for (let col = 39; col < COLNO; col++)
            display.setCell(col, row, ' ', NO_COLOR, 0);
    }
    const rows = [
        [0, 40, 'What do you want to look at:'],
        [2, 40, '/ - something on the map'],
        [3, 40, "i - something you're carrying"],
        [4, 40, '? - something else (by symbol or name)'],
        [6, 40, 'm - nearby monsters'],
        [7, 40, 'M - all monsters shown on map'],
        [8, 40, 'o - nearby objects'],
        [9, 40, 'O - all objects shown on map'],
        [10, 40, 't - nearby traps'],
        [11, 40, 'T - all seen or remembered traps'],
        [12, 40, 'e - nearby engravings'],
        [13, 40, 'E - all seen or remembered engravings'],
        [14, 40, '(end)'],
    ];
    for (const [row, col, text] of rows)
        display.putstr(col, row, text, NO_COLOR, row === 0 ? ATR_INVERSE : 0);
    const screen = serialize_terminal_grid(display);
    showSerializedOverride(screen, [46, 14]);
    game._override_serialized_persistent = true;
}

async function showHelpMenu() {
    // C ref: pager.c:dohelp().  Tty renders the NHW_MENU over the existing
    // map with the menu body starting at column 17.  The wizard-mode help row
    // is omitted unless wizard/debug mode is active.
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    const lines = [...HELP_MENU_LINES];
    if (game.wizard || game.flags?.debug)
        lines.splice(lines.length - 1, 0, 'p - List of wizard-mode commands.');
    for (let row = 0; row < lines.length; row++) {
        for (let col = 16; col < COLNO; col++)
            display.setCell(col, row, ' ', NO_COLOR, 0);
    }
    for (let row = 0; row < lines.length; row++)
        display.putstr(17, row, lines[row], NO_COLOR, row === 0 ? ATR_INVERSE : 0);
    const screen = serialize_terminal_grid(display);
    game._help_menu_screen = screen;
    showSerializedOverride(screen, [23, lines.length - 1]);
    game._override_serialized_persistent = false;
}

function expandTabsForTty(line) {
    let out = '';
    let col = 0;
    for (const ch of String(line ?? '')) {
        if (ch === '\t') {
            const count = 8 - (col % 8);
            out += ' '.repeat(count);
            col += count;
        } else {
            out += ch;
            col++;
        }
    }
    return out;
}

function wrapTtyTextLine(line) {
    // C ref: win/tty/wintty.c:tty_putstr().  Text windows store long lines,
    // but if a space appears before the terminal edge they split there.
    const out = [];
    let rest = expandTabsForTty(line);
    while (rest.length + 1 > COLNO) {
        let split = -1;
        for (let i = COLNO - 1; i > 0; i--) {
            if (rest[i] === ' ') {
                split = i + 1;
                break;
            }
        }
        if (split <= 0) break;
        out.push(rest.slice(0, split).slice(0, COLNO - 1));
        rest = rest.slice(split);
    }
    out.push(rest.slice(0, COLNO - 1));
    return out;
}

function normalizeTtyTextLines(lines) {
    const out = [];
    for (const line of lines)
        out.push(...wrapTtyTextLine(line));
    return out;
}

function renderHelpTextPage() {
    const page = game._help_text_page || 0;
    const pages = game._help_text_pages || [[]];
    const rows = Array.from({ length: C.TERMINAL_ROWS }, () => '');
    const pageLines = pages[Math.min(page, pages.length - 1)] || [];
    for (let i = 0; i < Math.min(pageLines.length, C.TERMINAL_ROWS - 1); i++)
        rows[i] = pageLines[i];
    const moreRow = game._help_text_compact_final_more && page >= pages.length - 1
        ? Math.min(pageLines.length, C.TERMINAL_ROWS - 1)
        : C.TERMINAL_ROWS - 1;
    const morePrompt = game._help_text_more_prompt || '--More--';
    rows[moreRow] = morePrompt;
    const screen = rows.join('\n');
    game._help_text_screen = screen;
    game._help_text_cursor = [Math.min(morePrompt.length, COLNO - 1), moreRow];
    showSerializedOverride(screen, game._help_text_cursor);
    game._override_serialized_persistent = false;
}

function showHelpTextLines(lines, options = {}) {
    // C ref: win/tty/wintty.c:process_text_window().  Full-screen text
    // windows show 23 data rows followed by the tty --More-- prompt.
    const normalized = normalizeTtyTextLines(lines);
    const pages = [];
    for (let i = 0; i < Math.max(1, normalized.length); i += C.TERMINAL_ROWS - 1)
        pages.push(normalized.slice(i, i + C.TERMINAL_ROWS - 1));
    if (!pages.length) pages.push([]);
    game._help_text_pages = pages;
    game._help_text_page = 0;
    game._help_text_more_prompt = options.morePrompt || '--More--';
    game._help_text_compact_final_more = !!options.compactFinalMore;
    renderHelpTextPage();
}

async function readUpstreamDataFile(name) {
    try {
        if (globalThis.process?.versions?.node) {
            const fs = await import('node:fs/promises');
            return await fs.readFile(`nethack-c/upstream/dat/${name}`, 'utf8');
        }
    } catch {
        return null;
    }
    return null;
}

async function showHelpDataFile(name) {
    // C ref: pager.c:dispfile_*() -> tty_display_file().
    const text = await readUpstreamDataFile(name);
    if (text == null) {
        await redrawAfterFullScreenMenuDismiss();
        await pline(`Cannot open "${name}".`);
        return;
    }
    showHelpTextLines(text.replace(/\r/g, '').split('\n'));
}

function showAboutNetHack() {
    // C refs: version.c:doextversion(), dat/nhlib.lua:shuffle().  Rendering
    // runtime Lua version info initializes nhlib once; its align table
    // shuffle consumes rn2(3), then rn2(2).
    if (!game._runtime_lua_info_initialized) {
        rn2(3);
        rn2(2);
        game._runtime_lua_info_initialized = true;
    }
    const pages = ABOUT_NETHACK_PAGES.map((page) => normalizeTtyTextLines(page));
    game._help_text_pages = pages;
    game._help_text_page = 0;
    renderHelpTextPage();
}

async function handleHelpMenuSelection(ch) {
    game._help_menu_screen = null;
    if (ch === '\x1b' || ch === ' ' || ch === '\r' || ch === '\n') {
        await redrawAfterFullScreenMenuDismiss();
        game.context.move = 0;
        return;
    }
    if (ch === 'a') {
        showAboutNetHack();
        game.context.move = 0;
        return;
    }
    if (ch === 'e') {
        await showLookAtMenu();
        game._awaiting_lookat_menu = true;
        game.context.move = 0;
        return;
    }
    if (ch === 'f') {
        await redrawAfterFullScreenMenuDismiss();
        if (!game._whatdoes_intro_seen) {
            game._whatdoes_intro_seen = true;
            await pline("Ask about '&' or '?' to get more info.");
            queue_more_prompt();
            game._help_what_command_after_more = true;
        } else {
            game._awaiting_help_what_command = true;
            await showPromptLine('What command?', { trailingInputSpace: true });
        }
        game.context.move = 0;
        return;
    }
    if (ch === 'g') {
        showHelpTextLines(OPTION_HELP_LINES);
        game.context.move = 0;
        return;
    }
    if (ch === 'j') {
        // C ref: cmd.c:dokeylist() via pager.c:dohelp().
        showHelpTextLines(KEY_BINDING_LINES);
        game.context.move = 0;
        return;
    }
    if (ch === 'l') {
        showHelpTextLines(MENU_CONTROL_LINES);
        game.context.move = 0;
        return;
    }
    if (ch === 'o') {
        showHelpTextLines(CONTACT_LINES);
        game.context.move = 0;
        return;
    }
    const file = ch === 'p' && !(game.wizard || game.flags?.debug)
        ? null
        : HELP_FILE_BY_SELECTOR.get(ch);
    if (file) {
        await showHelpDataFile(file);
        game.context.move = 0;
        return;
    }
    await showHelpMenu();
    game.context.move = 0;
}

async function showGetposHelpScreen(kind = 'travel') {
    // C ref: getpos.c:getpos_help(). Tty menu overlays the current map from
    // column 10 onward and blocks on a More prompt before returning to getpos.
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    display.clearRow(0);
    for (let row = 1; row <= 16; row++) {
        for (let col = 9; col < COLNO; col++)
            display.setCell(col, row, ' ', NO_COLOR, 0);
    }
    for (let row = 0; row < GETPOS_HELP_LINES.length; row++)
        display.putstr(10, row, GETPOS_HELP_LINES[row], NO_COLOR, 0);
    display.putstr(10, 16, '--More--', NO_COLOR, 0);
    display.setCursor(18, 16);
    const screen = serialize_terminal_grid(display);
    game._getpos_help_screen = screen;
    game._getpos_help_after_more = kind;
    showSerializedOverride(screen, [18, 16]);
    queue_more_prompt();
}

async function showLookupDataOverlay(lines) {
    // C refs: pager.c:checkfile(), win/tty/wintty.c:tty_display_nhwindow().
    // Data lookups are NHW_MENU text windows; when the tty can fit them in a
    // corner, it overlays text on the current map and leaves rows underneath.
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    const maxLen = Math.max(0, ...lines.map((line) => line.length));
    const col = Math.max(11, COLNO - maxLen - 1);
    const clearCol = Math.max(0, col - 1);
    display.clearRow(0);
    for (let row = 0; row < lines.length; row++) {
        for (let c = clearCol; c < COLNO; c++) display.setCell(c, row, ' ', NO_COLOR, 0);
        display.putstr(col, row, lines[row], NO_COLOR, 0);
    }
    const moreRow = Math.min(lines.length, C.TERMINAL_ROWS - 1);
    for (let c = col; c < COLNO; c++) display.setCell(c, moreRow, ' ', NO_COLOR, 0);
    display.putstr(col, moreRow, '--More--', NO_COLOR, 0);
    const screen = serialize_terminal_grid(display);
    game._look_data_screen = screen;
    showSerializedOverride(screen, [Math.min(col + '--More--'.length, COLNO - 1), moreRow]);
}

function lookCoord(x, y) {
    return `<${x},${y}>`;
}

function lookListLine(x, y, glyph, text, leading = ' ') {
    return `${leading}${lookCoord(x, y).padEnd(9, ' ')}${glyph}  ${text}`;
}

function lookObjectName(obj) {
    return inventoryObjectName(obj, { observe: false });
}

function lookObjectGlyph(obj) {
    const glyph = object_glyph_for_menu(obj);
    return glyph?.ch || obj?.ch || '?';
}

function showLookListScreen(lines) {
    const rows = Array.from({ length: C.TERMINAL_ROWS }, () => '');
    for (let i = 0; i < Math.min(lines.length, C.TERMINAL_ROWS - 1); i++)
        rows[i] = lines[i];
    rows[C.TERMINAL_ROWS - 1] = '--More--';
    const screen = rows.join('\n');
    game._look_list_screen = screen;
    showSerializedOverride(screen, [8, C.TERMINAL_ROWS - 1]);
}

function visibleLookObjects() {
    return (game.level?.objects || [])
        .filter((obj) => obj?.otyp !== GOLD_PIECE && cansee(obj.ox, obj.oy))
        .sort((a, b) => (a.oy - b.oy) || (a.ox - b.ox));
}

function showLookMonsterList(all = false) {
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    const lines = [
        all ? 'All monsters currently shown on the map:'
            : `Monsters currently shown near ${lookCoord(ux, uy)}:`,
        '',
        lookListLine(ux, uy, '@', heroGetposDescription()),
    ];
    const monsters = (game.level?.monsters || [])
        .filter((mon) => cansee(mon.mx, mon.my))
        .sort((a, b) => (a.my - b.my) || (a.mx - b.mx));
    for (const mon of monsters) {
        const prefix = mon.mtame ? 'tame ' : mon.mpeaceful ? 'peaceful ' : '';
        lines.push(lookListLine(mon.mx, mon.my, mon.ch || '?', `${prefix}${monsterName(mon)}`));
    }
    showLookListScreen(lines);
}

function showLookObjectList(all = false) {
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    const lines = [
        all ? 'All objects currently shown on the map:'
            : `Objects currently shown near ${lookCoord(ux, uy)}:`,
        '',
    ];
    for (const obj of visibleLookObjects())
        lines.push(lookListLine(obj.ox, obj.oy, lookObjectGlyph(obj), lookObjectName(obj)));
    showLookListScreen(lines);
}

function showLookEngravingList(all = false) {
    const lines = [
        all ? 'Seen or remembered engravings on this level:'
            : 'Nearby seen or remembered engravings:',
        '',
    ];
    const engravings = (game.level?.engravings || [])
        .slice()
        .sort((a, b) => (a.y - b.y) || (a.x - b.x));
    for (const ep of engravings) {
        const obscured = game.u?.ux === ep.x && game.u?.uy === ep.y ? ', obscured by @' : '';
        const coord = lookCoord(ep.x, ep.y).padEnd(8, ' ');
        lines.push(`  ${coord}\`  remembered text: "${ep.text || ep.pristine || ''}"${obscured}`);
    }
    showLookListScreen(lines);
}

async function resumeGetposAfterHelp(kind) {
    game._getpos_help_screen = '';
    game._getpos_help_after_more = '';
    if (kind === 'travel') {
        const cursor = currentTravelCursor();
        await showPromptLine('Move cursor to the desired destination:');
        setTravelMapCursorAt(cursor.x, cursor.y);
    } else if (kind === 'teleport') {
        const cursor = currentTeleportCursor();
        await showPromptLine("Move cursor to the desired position:");
        setTravelMapCursorAt(cursor.x, cursor.y);
    } else if (kind === 'jump') {
        const cursor = currentJumpCursor();
        await showPromptLine('Move cursor to the desired position:');
        setTravelMapCursorAt(cursor.x, cursor.y);
    } else if (kind === 'farlook') {
        const cursor = currentFarlookCursor();
        await showPromptLine('Pick a monster, object or location.');
        setTravelMapCursorAt(cursor.x, cursor.y);
    } else if (kind === 'monster_detect') {
        await showMonsterDetectBrowsePrompt();
    }
}

async function showGetposGoalPrompt(kind) {
    // C ref: src/getpos.c:getpos() NHKF_GETPOS_SHOWVALID path sets
    // show_goal_msg so the next prompt names the active getpos target.
    if (kind === 'travel') {
        const cursor = currentTravelCursor();
        await showPromptLine('Move cursor to the desired destination:');
        setTravelMapCursorAt(cursor.x, cursor.y);
    } else if (kind === 'teleport') {
        const cursor = currentTeleportCursor();
        await showPromptLine('Move cursor to the desired position:');
        setTravelMapCursorAt(cursor.x, cursor.y);
    } else if (kind === 'jump') {
        const cursor = currentJumpCursor();
        await showPromptLine('Move cursor to the desired position:');
        setTravelMapCursorAt(cursor.x, cursor.y);
    } else if (kind === 'farlook') {
        const cursor = currentFarlookCursor();
        await showPromptLine('Pick a monster, object or location.');
        setTravelMapCursorAt(cursor.x, cursor.y);
    } else if (kind === 'monster_detect') {
        await showMonsterDetectBrowsePrompt();
    }
}

function setTravelMapCursor() {
    setTravelMapCursorAt(game.u?.ux ?? 1, game.u?.uy ?? 0);
}

function setTravelMapCursorAt(x, y) {
    const col = Math.max(0, x - 1);
    const row = Math.max(1, y + 1);
    game._prompt_cursor = [col, row];
    const display = game.nhDisplay;
    if (display) {
        display.cursorCol = col;
        display.cursorRow = row;
    }
}

function setPromptCursorAfterMapGlyph(x, y) {
    const col = Math.max(0, x);
    const row = Math.max(1, y + 1);
    game._prompt_cursor = [col, row];
    const display = game.nhDisplay;
    if (display) {
        display.cursorCol = col;
        display.cursorRow = row;
    }
}

function setTravelTipCursor() {
    game._prompt_cursor = [16, 8];
    const display = game.nhDisplay;
    if (display) {
        display.cursorCol = 16;
        display.cursorRow = 8;
    }
}

function getposKeyDisplay(ch) {
    if (!ch) return '';
    const code = ch.charCodeAt(0);
    if (code < 32) return `^${String.fromCharCode(code + 64)}`;
    return ch;
}

function truncateGetposCursorToMap(cursor, dx, dy) {
    // C ref: getpos.c:truncate_to_map().  Diagonal moves at the edge
    // shorten both axes together instead of clamping x and y separately.
    if (cursor.x + dx < 1) {
        dy -= Math.sign(dy) * (1 - (cursor.x + dx));
        dx = 1 - cursor.x;
    } else if (cursor.x + dx > COLNO - 1) {
        dy += Math.sign(dy) * ((COLNO - 1) - (cursor.x + dx));
        dx = (COLNO - 1) - cursor.x;
    }
    if (cursor.y + dy < 0) {
        dx -= Math.sign(dx) * (0 - (cursor.y + dy));
        dy = 0 - cursor.y;
    } else if (cursor.y + dy > ROWNO - 1) {
        dx += Math.sign(dx) * ((ROWNO - 1) - (cursor.y + dy));
        dy = (ROWNO - 1) - cursor.y;
    }
    cursor.x += dx;
    cursor.y += dy;
}

function moveGetposCursor(cursor, ch, multiplier = 1) {
    // C ref: getpos.c:getpos().  Uppercase movement commands are getpos
    // rush/run cursor moves, defaulting to eight map squares.
    const dir = RUN_KEY[ch] || ch;
    const scale = multiplier * (RUN_KEY[ch] ? 8 : 1);
    truncateGetposCursorToMap(
        cursor,
        (DIR_DX[dir] || 0) * scale,
        (DIR_DY[dir] || 0) * scale,
    );
}

function defaultTravelPromptTarget() {
    const u = game.u;
    if (!u) return null;
    return {
        // C ref: getpos.c:getpos().  A line-feed key at the travel getpos
        // prompt behaves as a rush south cursor move, clamped to the map.
        x: u.ux,
        y: Math.min(ROWNO - 1, u.uy + 8),
    };
}

function setTravelCachedTarget(target) {
    game._travel_cached_target = target;
    return target;
}

function currentTravelCursor() {
    if (!game._travel_cursor) {
        const cached = game._travel_cached_target;
        game._travel_cursor = cached
            ? { x: cached.x, y: cached.y }
            : { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
    }
    return game._travel_cursor;
}

function heroGetposDescription() {
    // C ref: pager.c:self_lookat().
    const polyName = heroPolyForm()?.name;
    const race = String(game.urace?.adj || game.urace?.name || game._nhopts?.race || 'human').toLowerCase();
    const role = String(game.urole?.name?.m || game.u?.role || 'wizard').toLowerCase();
    const who = polyName
        ? String(polyName).toLowerCase().replaceAll('_', ' ')
        : `${race} ${role}`;
    const name = String(game.plname || game.u?.name || 'wizard').toLowerCase();
    const chained = game._punished
        ? `, chained to ${game.uball ? 'a heavy iron ball' : 'nothing?'}`
        : '';
    return `${who} called ${name}${chained}`;
}

function travelLocationDescription(x, y) {
    // C refs: getpos.c:auto_describe(), pager.c:do_screen_description().
    // Describing the hero's own glyph reports the hero monster name rather
    // than the raw '@' map symbol.
    if (game.u?.ux === x && game.u?.uy === y) return heroGetposDescription();
    const loc = game.level?.at(x, y);
    if (!loc || !travelSeenOrKnown(x, y)) return 'unexplored area (no travel path)';
    const noTravelPath = !!(game.u && (game.u.ux !== x || game.u.uy !== y)
        && !findTravelStepToKnownTarget({ x, y }));
    let desc;
    if (loc.typ === C.CLOUD) desc = 'fog/vapor cloud';
    else if (IS_WALL(loc.typ)) desc = 'wall (no travel path)';
    else if (loc.typ === C.STAIRS) {
        const st = travelFeatureStairAt(x, y);
        const down = !st?.up;
        const blocked = noTravelPath;
        desc = `${blocked ? 'blocked ' : ''}staircase ${down ? 'down' : 'up'}${blocked ? ' (no travel path)' : ''}`;
    }
    else if (loc.typ === C.ROOM && !couldsee(x, y)) desc = `dark part of a room${noTravelPath ? ' (no travel path)' : ''}`;
    else if (loc.typ === STONE || loc.typ === SCORR) desc = 'stone (no travel path)';
    else if (loc.typ === CORR) desc = 'corridor';
    else if (loc.typ === DOOR) {
        const closed = !!(loc.doormask & (D_CLOSED | D_LOCKED));
        desc = `${closed ? 'closed door' : 'doorway'}${noTravelPath ? ' (no travel path)' : ''}`;
    } else if (loc.typ === SDOOR) desc = `doorway${noTravelPath ? ' (no travel path)' : ''}`;
    else {
        const terrainDesc = getposTerrainDescription(x, y);
        desc = terrainDesc
            ? `${terrainDesc}${noTravelPath ? ' (no travel path)' : ''}`
            : loc.disp_ch && loc.disp_ch !== ' ' ? String(loc.disp_ch) : 'unexplored area';
    }
    return desc;
}

function getposLocationKnown(x, y) {
    if (game.u?.ux === x && game.u?.uy === y) return true;
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    // C refs: src/getpos.c:auto_describe(), src/pager.c:do_screen_description().
    // Getpos describes the displayed/remembered glyph, not hidden terrain.
    return cansee(x, y) || !!loc.seenv || !!loc.remembered_glyph
        || !!(loc.disp_ch && loc.disp_ch !== ' ');
}

function getposObjectDescription(x, y) {
    const obj = (game.level?.objects || [])
        .find((item) => item.ox === x && item.oy === y);
    return obj ? inventoryObjectName(obj, { observe: false }) : '';
}

function teleportLocationDescription(x, y) {
    if (game.u?.ux === x && game.u?.uy === y) return heroGetposDescription();
    const loc = game.level?.at(x, y);
    if (!loc) return 'stone';
    if (!getposLocationKnown(x, y)) return 'unexplored area';
    const objDesc = getposObjectDescription(x, y);
    if (objDesc) return objDesc;
    if (loc.typ === C.STAIRS) {
        // C refs: getpos.c:auto_describe(), pager.c:do_screen_description().
        // Controlled-teleport getpos describes the displayed stair glyph; it
        // does not use branch-specific wording here.
        const st = travelFeatureStairAt(x, y);
        return `staircase ${st?.up ? 'up' : 'down'}`;
    }
    if (loc.typ === C.CLOUD) return 'fog/vapor cloud';
    if (loc.typ === STONE || loc.typ === SCORR) return 'stone';
    if (IS_WALL(loc.typ)) return 'wall';
    if (loc.typ === CORR) return 'corridor';
    if (loc.typ === DOOR) return getposDoorDescription(loc);
    if (loc.typ === SDOOR) return 'doorway';
    {
        const terrainDesc = getposTerrainDescription(x, y);
        if (terrainDesc) return terrainDesc;
    }
    if (loc.typ === C.ROOM) return 'floor of a room';
    return loc.disp_ch && loc.disp_ch !== ' ' ? String(loc.disp_ch) : 'floor of a room';
}

function farlookLocationDescription(x, y) {
    if (game.u?.ux === x && game.u?.uy === y) return heroGetposDescription();
    const mon = mon_at(x, y);
    if (mon && !mon.mundetected && cansee(x, y)) return farlookMonsterDescription(mon, x, y);
    const loc = game.level?.at(x, y);
    if (!loc) return 'stone';
    if (!cansee(x, y) && !loc.seenv
        && (!loc.disp_ch || loc.disp_ch === ' ')
        && (!loc.remembered_glyph || loc.remembered_glyph.ch === ' ')) {
        // C refs: src/getpos.c:auto_describe(), src/pager.c:lookat().
        // Getpos describes the displayed glyph; unseen blank map cells are
        // treated as stone even if JS already knows hidden corridor terrain.
        return 'stone';
    }
    if (!getposLocationKnown(x, y)) return 'unexplored area';
    const objDesc = getposObjectDescription(x, y);
    if (objDesc) return objDesc;
    if (loc.typ === C.STAIRS) {
        const st = travelFeatureStairAt(x, y);
        if (st?.isbranch) return `branch staircase ${st.up ? 'up' : 'down'}`;
        return `staircase ${st?.up ? 'up' : 'down'}`;
    }
    if (loc.typ === C.ROOM) return 'floor of a room';
    if (loc.typ === C.CLOUD) return 'fog/vapor cloud';
    if (loc.typ === STONE || loc.typ === SCORR) return 'stone';
    if (IS_WALL(loc.typ)) return 'wall';
    if (loc.typ === CORR) return 'corridor';
    if (loc.typ === DOOR) return getposDoorDescription(loc);
    if (loc.typ === SDOOR) return 'doorway';
    {
        const terrainDesc = getposTerrainDescription(x, y);
        if (terrainDesc) return terrainDesc;
    }
    return loc.disp_ch && loc.disp_ch !== ' ' ? String(loc.disp_ch) : 'floor of a room';
}

function farlookBlankStoneGlyph(loc, x, y) {
    return !!loc && !cansee(x, y) && !loc.seenv
        && (!loc.disp_ch || loc.disp_ch === ' ')
        && (!loc.remembered_glyph || loc.remembered_glyph.ch === ' ');
}

function farlookFullDescription(x, y) {
    if (game.u?.ux === x && game.u?.uy === y)
        return `@\x1b[8Ca human or elf (${heroGetposDescription()})`;
    const stair = travelFeatureStairAt(x, y);
    if (stair?.isbranch) {
        const dir = stair.up ? 'up' : 'down';
        return `${stair.up ? '<' : '>'}\x1b[8Ca staircase ${dir} or a branch staircase ${dir} (branch staircase ${dir})`;
    }
    const loc = game.level?.at(x, y);
    if (farlookBlankStoneGlyph(loc, x, y))
        return '\x1b[9Ccan be many things (stone)';
    if (!loc || loc.typ === STONE || loc.typ === SCORR || IS_WALL(loc.typ))
        return '\x0ex\x0f\x1b[8Cthe interior of a monster or a wall (wall)';
    if (loc.typ === CORR)
        return '#\x1b[8Ccan be many things (corridor)';
    return '\x0e~\x0f\x1b[8Ca doorway or the floor of a room or the dark part of a room or ice';
}

function farlookMoreInfoTopic(x, y) {
    if (game.u?.ux === x && game.u?.uy === y) return 'human wizard';
    const stair = travelFeatureStairAt(x, y);
    if (stair?.isbranch) return `branch staircase ${stair.up ? 'up' : 'down'}`;
    return '';
}

function farlookContinuation(x, y) {
    if (game.u?.ux === x && game.u?.uy === y) return '';
    const loc = game.level?.at(x, y);
    if (!loc || loc.typ === STONE || loc.typ === SCORR || IS_WALL(loc.typ)) return '';
    if (loc.typ === CORR) return '';
    return '(floor of a room)';
}

function farlookNeedsPromptAfterFullDescription(x, y) {
    const loc = game.level?.at(x, y);
    return loc?.typ === CORR;
}

function engravingAt(x, y) {
    return (game.level?.engravings || []).find((ep) => ep.x === x && ep.y === y) || null;
}

function engravingVisibleText(ep) {
    return ep?.text || ep?.pristine || '';
}

function canReachFloorForSmudge() {
    return !(game.u?.uprops?.levitation || game.u?.uprops?.flying);
}

function wipeEngravingAt(x, y, cnt, magical = false) {
    const ep = engravingAt(x, y);
    if (!ep || ep.type === C.HEADSTONE || ep.nowipeout) return;
    const loc = game.level?.at(x, y);
    if (ep.type === C.BURN && loc?.typ !== C.ICE && !magical) return;
    let count = cnt;
    if (ep.type !== C.DUST && ep.type !== C.ENGR_BLOOD) {
        count = rn2(1 + Math.trunc(50 / (cnt + 1))) ? 0 : 1;
    }
    ep.text = wipeoutText(ep.text || '', count, 0).replace(/^ +/, '');
    if (!ep.text) {
        game.level.engravings = (game.level?.engravings || [])
            .filter((other) => other !== ep);
        newsym(x, y);
    }
}

function maybeSmudgeEngravingAfterMove(oldx, oldy, newx, newy) {
    if (!canReachFloorForSmudge()) return;
    const oldEp = engravingAt(oldx, oldy);
    if (oldEp && oldEp.type !== C.HEADSTONE) wipeEngravingAt(oldx, oldy, rnd(5), false);
    if ((newx !== oldx || newy !== oldy)) {
        const newEp = engravingAt(newx, newy);
        if (newEp && newEp.type !== C.HEADSTONE) wipeEngravingAt(newx, newy, rnd(5), false);
    }
}

function finishPendingMoveSmudge() {
    const pending = game._pending_move_smudge;
    if (!pending) return;
    game._pending_move_smudge = null;
    // C refs: hack.c:domove(), hack.c:maybe_smudge_engr().
    maybeSmudgeEngravingAfterMove(pending.oldx, pending.oldy, game.u?.ux, game.u?.uy);
}

async function describeTravelCursor() {
    const cursor = currentTravelCursor();
    await pline(travelLocationDescription(cursor.x, cursor.y));
    setTravelMapCursorAt(cursor.x, cursor.y);
}

function currentFarlookCursor() {
    if (!game._farlook_cursor)
        game._farlook_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
    return game._farlook_cursor;
}

async function describeFarlookCursor() {
    const cursor = currentFarlookCursor();
    await pline(farlookLocationDescription(cursor.x, cursor.y));
    setTravelMapCursorAt(cursor.x, cursor.y);
}

function currentMonsterDetectCursor() {
    if (!game._fountain_detect_cursor)
        game._fountain_detect_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
    return game._fountain_detect_cursor;
}

function monsterDetectMonsterDescription(mon, x, y) {
    let desc = farlookMonsterDescription(mon, x, y);
    if (mon?.m_ap_type === C.M_AP_OBJECT || mon?.m_ap_type === C.M_AP_FURNITURE)
        desc += ', mimicking something';
    return desc;
}

function monsterDetectLocationDescription(x, y) {
    if (game.u?.ux === x && game.u?.uy === y) return heroGetposDescription();
    const mon = mon_at(x, y);
    if (mon && !mon.dead && (mon.mhp ?? 1) > 0)
        return monsterDetectMonsterDescription(mon, x, y);
    return 'unexplored area';
}

async function showMonsterDetectBrowsePrompt() {
    // C refs: src/detect.c:monster_detect(), src/detect.c:browse_map().
    game._fountain_detect_stage = 'browse';
    game._awaiting_monster_detect_browse = true;
    clear_pending_message();
    const cursor = currentMonsterDetectCursor();
    await showPromptLine("(For instructions type a '?')  Move cursor to monster of interest:");
    setTravelMapCursorAt(cursor.x, cursor.y);
}

async function describeMonsterDetectCursor() {
    const cursor = currentMonsterDetectCursor();
    await pline(monsterDetectLocationDescription(cursor.x, cursor.y));
    setTravelMapCursorAt(cursor.x, cursor.y);
}

async function finishMonsterDetectBrowse() {
    game._awaiting_monster_detect_browse = false;
    game._fountain_detect_stage = 'done-more';
    game._prompt_cursor = null;
    await pline('Done.');
    queue_more_prompt();
}

function currentTeleportCursor() {
    if (!game._teleport_cursor)
        game._teleport_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
    return game._teleport_cursor;
}

async function describeTeleportCursor() {
    const cursor = currentTeleportCursor();
    await pline(teleportLocationDescription(cursor.x, cursor.y));
    setTravelMapCursorAt(cursor.x, cursor.y);
}

function teleokBasic(x, y, allowTrap = false) {
    if (x < 1 || x >= COLNO || y < 0 || y >= ROWNO) return false;
    if (mon_at(x, y)) return false;
    if (!allowTrap && (game.level?.traps || []).some(t => t.tx === x && t.ty === y)) return false;
    if (sobj_at_basic(BOULDER, x, y)) return false;
    const loc = game.level?.at(x, y);
    if (!loc || blocksMove(x, y) || IS_POOL(loc.typ) || C.IS_LAVA(loc.typ)) return false;
    return C.SPACE_POS(loc.typ);
}

function teleportArrivalWouldPrint(feature) {
    const u = game.u || {};
    if (feature?.line) return true;
    if (floorObjectsAtHero().length) return true;
    return !!engravingVisibleText(engravingAt(u.ux, u.uy));
}

async function runTeleportArrivalSpotEffects(feature, options = {}) {
    await checkSpecialRoomAfterMove();
    const deferredPickupMessages = game._resume_teleport_arrival_pickup_messages_after_more || [];
    game._resume_teleport_arrival_pickup_messages_after_more = null;
    const autopicked = deferredPickupMessages.length
        ? await showAutopickupMessages(deferredPickupMessages)
        : await autopickupHereAfterMove();
    if (!autopicked || floorObjectsAtHero().length)
        await lookHereAfterMove({
            featureLine: feature?.line || '',
            featureAlreadyShown: autopicked,
            arrivalFloorListNoTurn: !!options.arrivalFloorListNoTurn,
        });
}

async function teledsBasic(x, y, options = {}) {
    const u = game.u;
    if (!u) return;
    const oldx = u.ux;
    const oldy = u.uy;
    const movePunishmentObjects = !!(game._punished && game.uball && game.uchain);
    const punishmentOldPositions = movePunishmentObjects ? uniqueMapPositions([
        { x: game.uball.ox, y: game.uball.oy },
        { x: game.uchain.ox, y: game.uchain.oy },
    ]) : [];
    if (movePunishmentObjects) {
        unplacePunishmentObjectsForLevelChange();
        for (const pos of punishmentOldPositions) {
            clearPunishmentObjectMemoryAt(pos.x, pos.y);
            newsym(pos.x, pos.y);
        }
    }
    u.ux0 = oldx;
    u.uy0 = oldy;
    u.ux = x;
    u.uy = y;
    newsym(oldx, oldy);
    see_monsters();
    game.vision_full_recalc = 1;
    vision_recalc(0);
    refreshWarningAfterHeroMove();
    if (movePunishmentObjects) placePunishmentObjectsAtHero();
    newsym(x, y);
    game._prompt_cursor = null;
    if (game.flags?.verbose !== false)
        await append_pline(`You materialize in ${x === oldx && y === oldy ? 'the same' : 'a different'} location!`);
    const feature = lookHereFeature();
    if (options.deferLookHereBehindMore && teleportArrivalWouldPrint(feature)) {
        game._resume_teleport_arrival_pickup_messages_after_more =
            collectAutopickupHereAfterMoveMessages();
        if (!game._more) queue_more_prompt();
        game._resume_look_here_after_more = true;
        game._resume_teleport_arrival_after_more = true;
        game._resume_look_here_feature_line_after_more = feature.line || '';
        return;
    }
    await runTeleportArrivalSpotEffects(feature, options);
}

async function safeTeledsBasic(options = {}) {
    for (let tcnt = 0; tcnt < 40; tcnt++) {
        const x = rnd(COLNO - 1);
        const y = rn2(ROWNO);
        if (teleokBasic(x, y, false)) {
            await teledsBasic(x, y, options);
            return true;
        }
    }
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            if (teleokBasic(x, y, false)) {
                await teledsBasic(x, y, options);
                return true;
            }
        }
    }
    return false;
}

async function vaultTeleBasic(options = {}) {
    // C ref: src/teleport.c:vault_tele().
    const croom = (game.level?.rooms || []).find(room => room?.rtype === C.VAULT && (room.hx ?? -1) >= 0);
    const c = { x: 0, y: 0 };
    if (croom && somexyspaceBasic(croom, c) && teleokBasic(c.x, c.y, false)) {
        await teledsBasic(c.x, c.y, options);
        return true;
    }
    return safeTeledsBasic(options);
}

const TRAVEL_DIRS_ORD = [
    [-1, 0], [0, -1], [1, 0], [0, 1],
    [-1, -1], [1, -1], [1, 1], [-1, 1],
];

function travelSeenOrKnown(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    return !!(loc.seenv || loc.remembered_glyph || (loc.disp_ch && loc.disp_ch !== ' ') || couldsee(x, y));
}

function travelFeatureStairAt(x, y) {
    for (let st = game.stairs; st; st = st.next)
        if (st.sx === x && st.sy === y) return st;
    return null;
}

function travelFeatureStair(up) {
    for (let st = game.stairs; st; st = st.next)
        if (!!st.up === !!up && travelSeenOrKnown(st.sx, st.sy)) return st;
    return null;
}

function getposDoorDescription(loc) {
    const mask = (loc?.doormask || 0) & ~C.D_TRAPPED;
    if (mask === D_NODOOR) return 'doorway';
    if (mask === C.D_BROKEN) return 'broken door';
    if (mask === C.D_ISOPEN) return 'open door';
    return 'closed door';
}

function getposTerrainDescription(x, y) {
    // C refs: src/getpos.c:auto_describe(), src/pager.c:do_screen_description().
    // Cursor targeting describes the selected cmap glyph's explanation, not
    // the raw tty character displayed for that terrain.
    const loc = game.level?.at(x, y);
    if (!loc) return '';
    switch (loc.typ) {
    case C.IRONBARS: return 'iron bars';
    case C.TREE: return 'tree';
    case C.ALTAR: return 'altar';
    case C.GRAVE: return 'grave';
    case C.THRONE: return 'opulent throne';
    case C.SINK: return 'sink';
    case C.FOUNTAIN: return 'fountain';
    case C.POOL: return 'pool';
    case C.MOAT: return 'moat';
    case C.WATER: return C.Is_waterlevel?.(game.u?.uz) ? 'limitless water' : 'wall of water';
    case C.LAVAPOOL: return 'lava';
    case C.LAVAWALL: return 'wall of lava';
    case C.ICE: return 'ice';
    case C.DRAWBRIDGE_UP: return 'raised drawbridge';
    case C.DRAWBRIDGE_DOWN: return 'lowered drawbridge';
    case C.AIR: return C.Is_waterlevel?.(game.u?.uz) ? 'air bubble' : 'air';
    case C.CLOUD: return 'cloud';
    default: return '';
    }
}

const GETPOS_FEATURE_TYPES = new Map([
    ['_', [C.ALTAR]],
    ['{', [C.SINK, C.FOUNTAIN]],
    ['#', [C.IRONBARS, C.TREE, C.DRAWBRIDGE_UP, C.CLOUD]],
    ['\\', [C.THRONE]],
    ['|', [C.GRAVE]],
    ['}', [C.POOL, C.MOAT, C.WATER, C.LAVAPOOL, C.LAVAWALL]],
]);
const GETPOS_EXTRA_FEATURE_KEYS = new Set(['0']);
const GETPOS_CYCLE_GROUP_BY_KEY = new Map([
    ['d', 'door'],
    ['D', 'door'],
]);

function isGetposFeatureSearchKey(ch) {
    return ch === '^' || ch === '<' || ch === '>'
        || GETPOS_FEATURE_TYPES.has(ch) || GETPOS_EXTRA_FEATURE_KEYS.has(ch);
}

function isGetposCycleKey(ch) {
    return GETPOS_CYCLE_GROUP_BY_KEY.has(ch);
}

function getposFeatureAt(ch, x, y) {
    if (ch === '<' || ch === '>') {
        const st = travelFeatureStairAt(x, y);
        return !!st && !!st.up === (ch === '<');
    }
    if (ch === '^') return (game.level?.traps || []).some(t => t.tx === x && t.ty === y);
    const types = GETPOS_FEATURE_TYPES.get(ch);
    if (!types) return false;
    const loc = game.level?.at(x, y);
    return !!loc && types.includes(loc.typ);
}

function findGetposFeature(ch, cursor) {
    for (let pass = 0; pass <= 1; pass++) {
        const loY = pass === 0 ? cursor.y : 0;
        const hiY = pass === 0 ? ROWNO - 1 : cursor.y;
        for (let y = loY; y <= hiY; y++) {
            const loX = pass === 0 && y === loY ? cursor.x + 1 : 1;
            const hiX = pass === 1 && y === hiY ? cursor.x : COLNO - 1;
            for (let x = loX; x <= hiX; x++) {
                if (travelSeenOrKnown(x, y) && getposFeatureAt(ch, x, y)) return { x, y };
            }
        }
    }
    return null;
}

function compareGetposDistance(a, b) {
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    const da = Math.max(Math.abs(ux - a.x), Math.abs(uy - a.y));
    const db = Math.max(Math.abs(ux - b.x), Math.abs(uy - b.y));
    if (da !== db) return da - db;
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
}

function getposDoorCycleTargetAt(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !getposLocationKnown(x, y)) return false;
    return loc.typ === DOOR || loc.typ === SDOOR;
}

function gatherGetposCycleLocations(group) {
    const u = game.u || {};
    const out = [];
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const hero = x === u.ux && y === u.uy;
            if (hero || (group === 'door' && getposDoorCycleTargetAt(x, y)))
                out.push({ x, y });
        }
    }
    out.sort(compareGetposDistance);
    return out.length ? out : [{ x: u.ux ?? 1, y: u.uy ?? 0 }];
}

async function handleGetposCycle(ch, cursor, describeCursor) {
    if (!isGetposCycleKey(ch)) return false;
    const group = GETPOS_CYCLE_GROUP_BY_KEY.get(ch);
    const cache = game._getpos_cycle_state || (game._getpos_cycle_state = {});
    if (!cache[group]) {
        cache[group] = {
            gidx: 0,
            locations: gatherGetposCycleLocations(group),
        };
    }
    const state = cache[group];
    const count = Math.max(1, state.locations.length);
    const dir = ch === ch.toLowerCase() ? 1 : -1;
    state.gidx = (state.gidx + dir + count) % count;
    const found = state.locations[state.gidx] || state.locations[0];
    cursor.x = found.x;
    cursor.y = found.y;
    await describeCursor();
    return true;
}

async function handleGetposFeatureSearch(ch, cursor, describeCursor) {
    if (await handleGetposCycle(ch, cursor, describeCursor)) return true;
    if (!isGetposFeatureSearchKey(ch)) return false;
    const found = findGetposFeature(ch, cursor);
    if (found) {
        cursor.x = found.x;
        cursor.y = found.y;
        await describeCursor();
    } else {
        await pline(`Can't find dungeon feature '${ch}'.`);
        setTravelMapCursorAt(cursor.x, cursor.y);
    }
    return true;
}

function travelMoveAllowed(x, y, dx, dy) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 1 || nx >= COLNO || ny < 0 || ny >= ROWNO) return false;
    if (blocksMove(nx, ny)) return false;
    if (sobj_at_basic(BOULDER, nx, ny)) return false;
    if (dx && dy) {
        const source = game.level?.at(x, y);
        const target = game.level?.at(nx, ny);
        if (doorwayBlocksDiagonalForHero(source) || doorwayBlocksDiagonalForHero(target)) return false;
    }
    return true;
}

function findTravelStepToKnownTarget(target) {
    const u = game.u;
    if (!u || !target) return false;
    if (u.ux === target.x && u.uy === target.y) return null;

    const seen = new Set([`${target.x},${target.y}`]);
    const queue = [{ x: target.x, y: target.y }];
    for (let qi = 0; qi < queue.length && qi < COLNO * ROWNO; qi++) {
        const here = queue[qi];
        for (const [dx, dy] of TRAVEL_DIRS_ORD) {
            const nx = here.x + dx;
            const ny = here.y + dy;
            if (!travelMoveAllowed(here.x, here.y, dx, dy)) continue;
            if (nx === u.ux && ny === u.uy) {
                return { dx: here.x - u.ux, dy: here.y - u.uy };
            }
            const key = `${nx},${ny}`;
            if (seen.has(key) || !travelSeenOrKnown(nx, ny)) continue;
            seen.add(key);
            queue.push({ x: nx, y: ny });
        }
    }
    return null;
}

function distminCoords(ax, ay, bx, by) {
    return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

function guessTravelGoal(target) {
    const u = game.u;
    if (!u || !target) return null;
    const startKey = `${u.ux},${u.uy}`;
    const seen = new Set([startKey]);
    const travel = new Map();
    const queue = [{ x: u.ux, y: u.uy, radius: 0 }];
    for (let qi = 0; qi < queue.length && qi < COLNO * ROWNO; qi++) {
        const here = queue[qi];
        for (const [dx, dy] of TRAVEL_DIRS_ORD) {
            const nx = here.x + dx;
            const ny = here.y + dy;
            const key = `${nx},${ny}`;
            if (seen.has(key) || !travelMoveAllowed(here.x, here.y, dx, dy) || !travelSeenOrKnown(nx, ny)) continue;
            seen.add(key);
            travel.set(key, here.radius + 1);
            queue.push({ x: nx, y: ny, radius: here.radius + 1 });
        }
    }

    let px = u.ux;
    let py = u.uy;
    let bestDist = distminCoords(target.x, target.y, u.ux, u.uy);
    let bestD2 = dist2(target.x, target.y, u.ux, u.uy);
    let bestTravel = COLNO * ROWNO;
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const ctrav = travel.get(`${x},${y}`) || 0;
            if (!ctrav || !couldsee(x, y)) continue;
            const nextDist = distminCoords(target.x, target.y, x, y);
            if (nextDist === bestDist && ctrav < bestTravel) {
                const nd2 = dist2(target.x, target.y, x, y);
                if (nd2 < bestD2) {
                    px = x;
                    py = y;
                    bestD2 = nd2;
                    bestTravel = ctrav;
                }
            } else if (nextDist < bestDist) {
                px = x;
                py = y;
                bestDist = nextDist;
                bestD2 = dist2(target.x, target.y, x, y);
                bestTravel = ctrav;
            }
        }
    }
    return { x: px, y: py };
}

function findTravelStep(target) {
    const direct = findTravelStepToKnownTarget(target);
    if (direct) return direct;
    const guess = guessTravelGoal(target);
    if (!guess) return direct;
    if (game.u?.ux === guess.x && game.u?.uy === guess.y) {
        const dx = Math.sign((target?.x ?? game.u.ux) - game.u.ux);
        const dy = Math.sign((target?.y ?? game.u.uy) - game.u.uy);
        return travelMoveAllowed(game.u.ux, game.u.uy, dx, dy) ? { dx, dy } : direct;
    }
    return findTravelStepToKnownTarget(guess) || direct;
}

async function beginTravelRunToCachedTarget() {
    const target = game._travel_cached_target;
    if (!target) return false;
    game._run_stop_after_move = false;
    game.context.run = { travel: true, target: { x: target.x, y: target.y }, steps: 0 };
    return continueRunStep();
}

const DEFAULT_TIMEOUT_INCR = 30;
const MENU_ROWS_PER_PAGE = C.TERMINAL_ROWS - 1;
const MENU_SELECTOR_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

const WIZ_INTRINSIC_PROPERTIES = [
    { prop: C.INVULNERABLE, stateKey: 'invulnerable', label: 'invulnerable' },
    { prop: C.STONED, stateKey: 'stoned', label: 'petrifying' },
    { prop: C.SLIMED, stateKey: 'slimed', label: 'becoming slime' },
    { prop: C.STRANGLED, stateKey: 'strangled', label: 'strangling' },
    { prop: C.SICK, stateKey: 'sick', label: 'fatally sick' },
    { prop: C.STUNNED, stateKey: 'stunned', label: 'stunned' },
    { prop: C.CONFUSION, stateKey: 'confusion', label: 'confused' },
    { prop: C.HALLUC, stateKey: 'hallucination', label: 'hallucinating' },
    { prop: C.BLINDED, stateKey: 'blinded', label: 'blinded' },
    { prop: C.DEAF, stateKey: 'deaf', label: 'deafness' },
    { prop: C.VOMITING, stateKey: 'vomiting', label: 'vomiting' },
    { prop: C.GLIB, stateKey: 'glib', label: 'slippery fingers' },
    { prop: C.WOUNDED_LEGS, stateKey: 'wounded_legs', label: 'wounded legs' },
    { prop: C.SLEEPY, stateKey: 'sleepy', label: 'sleepy' },
    { prop: C.TELEPORT, stateKey: 'teleporting', label: 'teleporting' },
    { prop: C.POLYMORPH, stateKey: 'polymorphing', label: 'polymorphing' },
    { prop: C.LEVITATION, stateKey: 'levitation', label: 'levitating' },
    { prop: C.FAST, stateKey: 'fast', label: 'very fast' },
    { prop: C.CLAIRVOYANT, stateKey: 'clairvoyant', label: 'clairvoyant' },
    { prop: C.DETECT_MONSTERS, stateKey: 'monster_detection', label: 'monster detection' },
    { prop: C.SEE_INVIS, stateKey: 'see_invisible', label: 'see invisible' },
    { prop: C.INVIS, stateKey: 'invisible', label: 'invisible' },
    { prop: C.ACID_RES, stateKey: 'acid_resistance', label: 'acid resistance' },
    { prop: C.STONE_RES, stateKey: 'stoning_resistance', label: 'stoning resistance' },
    { prop: C.DISPLACED, stateKey: 'displaced', label: 'displaced' },
    { prop: C.PASSES_WALLS, stateKey: 'pass_thru_walls', label: 'pass thru walls' },
    { prop: C.MAGICAL_BREATHING, stateKey: 'magical_breathing', label: 'magical breathing' },
    { prop: C.WWALKING, stateKey: 'water_walking', label: 'water walking' },
    { prop: C.FIRE_RES, stateKey: 'fire_resistance', label: 'fire resistance' },
    { prop: C.COLD_RES, stateKey: 'cold_resistance', label: 'cold resistance' },
    { prop: C.SLEEP_RES, stateKey: 'sleep_resistance', label: 'sleep resistance' },
    { prop: C.DISINT_RES, stateKey: 'disintegration_resistance', label: 'disintegration resistance' },
    { prop: C.SHOCK_RES, stateKey: 'shock_resistance', label: 'shock resistance' },
    { prop: C.POISON_RES, stateKey: 'poison_resistance', label: 'poison resistance' },
    { prop: C.DRAIN_RES, stateKey: 'drain_resistance', label: 'drain resistance' },
    { prop: C.SICK_RES, stateKey: 'sickness_resistance', label: 'sickness resistance' },
    { prop: C.ANTIMAGIC, stateKey: 'magic_resistance', label: 'magic resistance' },
    { prop: C.HALLUC_RES, stateKey: 'hallucination_resistance', label: 'hallucination resistance' },
    { prop: C.BLND_RES, stateKey: 'light_induced_blindness_resistance', label: 'light-induced blindness resistance' },
    { prop: C.FUMBLING, stateKey: 'fumbling', label: 'fumbling' },
    { prop: C.HUNGER, stateKey: 'voracious_hunger', label: 'voracious hunger' },
    { prop: C.TELEPAT, stateKey: 'telepathic', label: 'telepathic' },
    { prop: C.WARNING, stateKey: 'warning', label: 'warning' },
    { prop: C.WARN_OF_MON, stateKey: 'warn_monster_type_or_class', label: 'warn: monster type or class' },
    { prop: C.WARN_UNDEAD, stateKey: 'warn_undead', label: 'warn: undead' },
    { prop: C.SEARCHING, stateKey: 'searching', label: 'searching' },
    { prop: C.INFRAVISION, stateKey: 'infravision', label: 'infravision' },
    { prop: C.ADORNED, stateKey: 'adorned', label: 'adorned (+/- Cha)' },
    { prop: C.STEALTH, stateKey: 'stealth', label: 'stealthy' },
    { prop: C.AGGRAVATE_MONSTER, stateKey: 'monster_aggravation', label: 'monster aggravation' },
    { prop: C.CONFLICT, stateKey: 'conflict', label: 'conflict' },
    { prop: C.JUMPING, stateKey: 'jumping', label: 'jumping' },
    { prop: C.TELEPORT_CONTROL, stateKey: 'teleport_control', label: 'teleport control' },
    { prop: C.FLYING, stateKey: 'flying', label: 'flying' },
    { prop: C.SWIMMING, stateKey: 'swimming', label: 'swimming' },
    { prop: C.SLOW_DIGESTION, stateKey: 'slow_digestion', label: 'slow digestion' },
    { prop: C.HALF_SPDAM, stateKey: 'half_spell_damage', label: 'half spell damage' },
    { prop: C.HALF_PHDAM, stateKey: 'half_physical_damage', label: 'half physical damage' },
    { prop: C.REGENERATION, stateKey: 'hp_regeneration', label: 'HP regeneration' },
    { prop: C.ENERGY_REGENERATION, stateKey: 'energy_regeneration', label: 'energy regeneration' },
    { prop: C.PROTECTION, stateKey: 'extra_protection', label: 'extra protection' },
    { prop: C.PROT_FROM_SHAPE_CHANGERS, stateKey: 'protection_from_shape_changers', label: 'protection from shape changers' },
    { prop: C.POLYMORPH_CONTROL, stateKey: 'polymorph_control', label: 'polymorph control' },
    { prop: C.UNCHANGING, stateKey: 'unchanging', label: 'unchanging' },
    { prop: C.REFLECTING, stateKey: 'reflecting', label: 'reflecting' },
    { prop: C.FREE_ACTION, stateKey: 'free_action', label: 'free action' },
    { prop: C.FIXED_ABIL, stateKey: 'fixed_abilities', label: 'fixed abilities' },
    { prop: C.LIFESAVED, stateKey: 'life_will_be_saved', label: 'life will be saved' },
];

function intrinsicTimeoutValue(row) {
    const value = game.u?.uprops?.[row.stateKey];
    return typeof value === 'number' && value > 0 ? value : 0;
}

function intrinsicMenuRows() {
    const rows = [
        { kind: 'text', text: ' \x1b[7mWhich intrinsics?\x1b[0m' },
        { kind: 'blank' },
    ];
    if (game.iflags?.cmdassist !== false) {
        rows.push({
            kind: 'text',
            text: ` [Precede any selection with a count to increment by other than ${DEFAULT_TIMEOUT_INCR}.]`,
        });
    }
    for (const row of WIZ_INTRINSIC_PROPERTIES) {
        if (row.prop === C.HALLUC_RES) continue;
        if (row.prop === C.FIRE_RES) {
            rows.push({ kind: 'text', text: ' --' });
        }
        rows.push({ kind: 'selectable', ...row });
    }
    return rows;
}

function renderIntrinsicMenu(menu) {
    const rows = menu.rows;
    const start = menu.page * MENU_ROWS_PER_PAGE;
    const pageRows = rows.slice(start, start + MENU_ROWS_PER_PAGE);
    const lines = [];
    let selectorIndex = 0;
    for (const row of pageRows) {
        if (row.kind === 'selectable') {
            const selector = MENU_SELECTOR_CHARS[selectorIndex++] || '?';
            row.selector = selector;
            const indicator = row.count > 0 ? '#' : (row.selected ? '+' : '-');
            const timeout = intrinsicTimeoutValue(row);
            const tail = timeout ? ` [${timeout}]` : '';
            const label = timeout ? row.label.padEnd(27, ' ') : row.label;
            lines.push(` ${selector} ${indicator} ${label}${tail}`);
        } else {
            lines.push(row.text || '');
        }
    }
    const footer = menu.pages.length > 1
        ? ` (${menu.page + 1} of ${menu.pages.length})`
        : ' (end)';
    lines.push(footer);
    const screen = lines.join('\n');
    showSerializedOverride(screen, [footer.length, lines.length - 1]);
    game._override_serialized_persistent = true;
}

function beginIntrinsicMenu() {
    game._intrinsic_menu = {
        kind: 'wizintrinsic',
        rows: intrinsicMenuRows(),
        page: 0,
        pages: [],
        count: '',
    };
    game._intrinsic_menu.pages = [];
    for (let i = 0; i < game._intrinsic_menu.rows.length; i += MENU_ROWS_PER_PAGE) {
        game._intrinsic_menu.pages.push(game._intrinsic_menu.rows.slice(i, i + MENU_ROWS_PER_PAGE));
    }
    renderIntrinsicMenu(game._intrinsic_menu);
}

function intrinsicRowForSelector(menu, ch) {
    const start = menu.page * MENU_ROWS_PER_PAGE;
    let selectorIndex = 0;
    for (const row of menu.rows.slice(start, start + MENU_ROWS_PER_PAGE)) {
        if (row.kind !== 'selectable') continue;
        const selector = MENU_SELECTOR_CHARS[selectorIndex++] || '?';
        if (selector === ch) return row;
    }
    return null;
}

function updateIntrinsicMenuSelection(menu, row, count) {
    if (!row) return;
    const togglingOff = row.selected && !count;
    if (togglingOff) {
        row.selected = false;
        row.count = -1;
    } else {
        row.selected = true;
        row.count = count > 0 ? count : -1;
    }
}

function selectIntrinsicMenuPage(menu, count) {
    const start = menu.page * MENU_ROWS_PER_PAGE;
    for (const row of menu.rows.slice(start, start + MENU_ROWS_PER_PAGE)) {
        if (row.kind !== 'selectable') continue;
        row.selected = true;
        row.count = count > 0 ? count : -1;
    }
}

function refreshSwallowedHallucinationAfterMore({ visibleMap = false } = {}) {
    if (!(game.u?.uhallucination || game.u?.uprops?.hallucination)) return;
    if (game.u?.uswallow && game.u?.ustuck && game._swallowed_map_active)
        refresh_swallowed_overlay();
    else if (visibleMap) {
        see_monsters();
        see_objects();
        see_traps();
    }
}

async function showNextStartupPreambleMessage() {
    if (!Array.isArray(game._startup_preamble_messages)
        || game._startup_preamble_messages.length === 0) return false;
    const msg = game._startup_preamble_messages.shift();
    await pline(msg);
    // C ref: allmain.c:moveloop_preamble().  Date messages are normal
    // topl plines queued behind the startup welcome pager.
    const hasMorePreamble = game._startup_preamble_messages.length > 0;
    const hasTutorialPrompt = !hasMorePreamble && shouldAskTutorial();
    const needsMore = hasMorePreamble || hasTutorialPrompt;
    game._more_next_message_row = false;
    game._more = needsMore;
    game._more_dismissals_remaining = 0;
    game._startup_preamble_more_active = needsMore;
    game._startup_preamble_done_waiting_tutorial = hasTutorialPrompt;
    game.context.move = 0;
    return true;
}

function isStartupWelcomeMessage(msg) {
    return typeof msg === 'string'
        && (msg.includes('welcome to NetHack') || msg.includes('welcome back to NetHack'));
}

function finishDeferredProjectileClearAfterMore() {
    const clear = game._after_more_projectile_clear_after_prompt;
    game._after_more_projectile_clear_after_prompt = null;
    if (clear && C.isok(clear.x, clear.y)) newsym(clear.x, clear.y);
}

function petCombatTopline(line) {
    return /^The (?:kitten|little dog|(?:saddled )?pony) (?:misses|bites|hits|kicks|stings|butts|touches) .+[.!]$/.test(line || '');
}

function petCombatHitTopline(line) {
    return /^The (?:kitten|little dog|(?:saddled )?pony) (?:bites|hits|kicks|stings|butts|touches) .+[.!]$/.test(line || '');
}

function splitDeferredPetCombatTopline(line) {
    const msg = String(line || '');
    const match = /^(The (?:kitten|little dog|(?:saddled )?pony) (?:misses|bites|hits|kicks|stings|butts|touches) .+?[.!])  (The (?:kitten|little dog|(?:saddled )?pony) .+)$/.exec(msg);
    if (!match || !petCombatTopline(match[1]) || !petCombatTopline(match[2])) return null;
    return { first: match[1], rest: match[2] };
}

function monsterPhysicalTopline(line) {
    return /^The .+ (?:misses|bites|hits|kicks|stings|butts|touches|claws|scratches|slashes|punches|jabs|pierces|pricks|attacks)(?: .+)?[.!]$/.test(line || '');
}

function monsterPhysicalToplineChain(line) {
    const parts = String(line || '').split('  ').filter(Boolean);
    return parts.length > 0 && parts.every(monsterPhysicalTopline);
}

function monsterMovementTopline(line) {
    return /^You see .+ (?:fly|slither|ooze|wiggle|crawl|hide|dive) under .+\.$/.test(line || '');
}

function monsterPrayerResumeTopline(line) {
    return monsterPhysicalToplineChain(line) || monsterMovementTopline(line);
}

function splitDeferredMonsterPhysicalTopline(line) {
    const msg = String(line || '');
    const match = /^(The .+? (?:misses|bites|hits|kicks|stings|butts|touches|claws|scratches|slashes|punches|jabs|pierces|attacks)(?: .+)?[.!])  (The .+)$/.exec(msg);
    if (!match || !monsterPhysicalTopline(match[1]) || !monsterPhysicalTopline(match[2])) return null;
    return { first: match[1], rest: match[2] };
}

function splitDeferredPoisonMonsterTopline(line) {
    const msg = String(line || '');
    const match = /^(.+? was poisoned!)  (The .+)$/.exec(msg);
    if (!match || !monsterPhysicalTopline(match[2])) return null;
    return { first: match[1], rest: match[2] };
}

function monsterDeathPastTense(mon) {
    // C ref: src/mon.c:monkilled(). Nonliving monsters are destroyed.
    const ptr = mon?.data;
    if ((ptr?.mflags2 ?? 0) & M2_UNDEAD) return 'destroyed';
    if (ptr?.name === 'MANES' || ptr?.mlet === 'S_GOLEM' || ptr?.mlet === 'S_VORTEX')
        return 'destroyed';
    return 'killed';
}

function monsterPetDeathLine(mon) {
    return `The ${monsterName(mon)} is ${monsterDeathPastTense(mon)}!`;
}

async function handleQueuedMore(ch) {
    if (!game._more || (game._more_dismissals_remaining || 0) <= 0) return false;
    let resumeMonsterBehindNewMore = false;
    let suppressPausedMonsterResume = false;
    const afterMoreSplit = splitDeferredPetCombatTopline(game._after_more_message || '')
        || splitDeferredPoisonMonsterTopline(game._after_more_message || '');
    const afterMoreTopline = afterMoreSplit?.first || game._after_more_message || '';
    const splitHitDeathPrompt = !!game._pet_death_after_split_hit_more
        && !!game._pet_defender_death_pending
        && petCombatHitTopline(afterMoreTopline);
    const strictPendingMore = !!game._pending_more_strict_keys;
    const moreDismissKey = (!strictPendingMore && !!game._monster_more_accepts_any_key)
        || ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b';
    const pausedMonsterTurn = !!game._monster_turn_paused_for_more;
    const swallowedDamageResume = pausedMonsterTurn && !!game._swallowed_damage_more_waiting;
    const preTurnResume = pausedMonsterTurn && !!game._pre_turn_more_waiting;
    const monsterAttackResume = pausedMonsterTurn && !!game._monster_attack_more_waiting;
    const dismissedTopline = game._pending_message || '';
    const deferredPetDeathPending = game._pet_defender_death_pending || null;
    const deferredPetDeathCanPack = !!afterMoreTopline
        && !afterMoreSplit
        && !splitHitDeathPrompt
        && !!deferredPetDeathPending
        && topline_can_pack_message(
            afterMoreTopline,
            monsterPetDeathLine(deferredPetDeathPending.target),
        );
    const deferredPetDeathNeedsPrompt = !!afterMoreTopline
        && !!game._pet_defender_death_pending
        && !!game._pet_combat_more_latched
        && (!deferredPetDeathCanPack || splitHitDeathPrompt)
        && !(game.u?.uhallucination || game.u?.uprops?.hallucination);
    const pausedFloorListTurn = !!game._resume_floor_list_turn;
    const pausedRunTail = !!game._run_paused_for_more;
    const preserveMonsterMoreBase = pausedMonsterTurn
        && game._preserve_more_base_for_next_monster_message
        && game._latched_more_screen;
    if (!moreDismissKey) {
        if (game._direction_help_screen) {
            showSerializedOverride(game._direction_help_screen, [8, 23]);
            game._override_prev = null;
        }
        if (game._getpos_help_screen) {
            showSerializedOverride(game._getpos_help_screen, [18, 16]);
            game._override_prev = null;
        }
        game.context.move = 0;
        return true;
    }

    game._pending_more_strict_keys = false;
    game._more_dismissals_remaining--;
    game._monster_more_accepts_any_key = false;
    if (game._avoid_pool_tip_pending && game._more_dismissals_remaining <= 0) {
        // C refs: src/hack.c:swim_move_danger(), src/hack.c:handle_tip().
        // The liquid-avoidance line owns the blocking More; dismissing it
        // immediately prints the once-per-game swim tip as the next topline.
        game._avoid_pool_tip_pending = false;
        game._more = false;
        game._more_dismissals_remaining = 0;
        clear_pending_message();
        await pline("(Tip: use 'm' prefix to step in if you really want to.)");
        game.context.move = 0;
        return true;
    }
    game._monster_topline_stop_after_esc_more = ch === '\x1b'
        && pausedMonsterTurn
        && (monsterAttackResume
            || !!game._deferred_monster_physical_attack
            || monsterPhysicalTopline(afterMoreTopline));
    if (preserveMonsterMoreBase) {
        game._monster_more_base_screen = preserveMonsterMoreBase;
        game._monster_more_base_deferred = (game._deferred_warning_redraws || []).slice();
        game._monster_more_restore_message = game._pending_message || '';
    }
    game._preserve_more_base_for_next_monster_message = false;
    game._latched_more_screen = null;
    game._latched_more_cursor = null;
    game._latched_more_keep_until_dismiss = false;
    if (!(game._monster_death_pending && game._after_more_projectile_clear_after_prompt))
        finishDeferredProjectileClearAfterMore();
    if (pausedMonsterTurn
        && monsterAttackResume
        && game._nomovemsg === 'You survived that attempt on your life.'
        && (dismissedTopline.startsWith("OK, so you don't die.  The ")
            || monsterPhysicalTopline(dismissedTopline))
        && !game._after_more_message) {
        // C refs: src/end.c:savelife(), src/allmain.c:moveloop_core().
        // The displayed OK+monster-hit More has already applied that hit's
        // damage.  Dismissing it resumes the interrupted monster scan; do not
        // let stale deferred attack state replay a tail before the scan resumes.
        game._deferred_monster_physical_attack = null;
        game._more = false;
        game._more_dismissals_remaining = 0;
        clear_pending_message();
        game._latched_status_turn = null;
        game._monster_turn_paused_for_more = false;
        game._monster_attack_more_waiting = false;
        game._resume_encumbered_extra_turn_after_more = false;
        game._resume_encumbered_extra_turn_after_more_prompt = false;
        game._resume_monster_turn = true;
        game.context.move = 1;
        return true;
    }
        if (game._stair_arrival_resume_after_floor_list
        && (game._more_dismissals_remaining || 0) <= 0) {
        game._stair_arrival_resume_after_floor_list = false;
        game._resume_floor_list_turn = false;
        game._floor_list_lines = null;
        game._floor_list_restore_message_after_more = '';
        game._prompt_cursor = null;
        game._more = false;
        game._more_dismissals_remaining = 0;
        clear_pending_message();
        await triggerSpotEffectsAtHero();
        if (game._more) {
            game.context.move = 0;
            return true;
        }
        finishPendingMoveSmudge();
        game._monster_turn_paused_for_more = false;
        game._swallowed_damage_more_waiting = false;
        game._pre_turn_more_waiting = false;
        game._monster_attack_more_waiting = false;
        game._fast_extra_action_pending = false;
        game._resume_monster_turn = true;
        game.context.move = 1;
        return true;
    }
    if (game._arrival_floor_list_no_turn
        && (game._more_dismissals_remaining || 0) <= 0) {
        game._arrival_floor_list_no_turn = false;
        game._resume_floor_list_turn = false;
        game._floor_list_lines = null;
        game._floor_list_restore_message_after_more = '';
        game._prompt_cursor = null;
        game._more = false;
        game._more_dismissals_remaining = 0;
        clear_pending_message();
        await maybeAutopickupBlockedAtHero();
        game.context.move = 0;
        return true;
    }
    if (game._enhance_resume_after_more && (game._more_dismissals_remaining || 0) <= 0) {
        game._enhance_resume_after_more = false;
        clear_pending_message();
        showEnhanceSkillsMenu();
        game.context.move = 0;
        return true;
    }
    if (game._after_more_damage_after_prompt && !game._after_more_message) {
        if (typeof game.u?.uhp === 'number')
            game.u.uhp = Math.max(0, game.u.uhp - (game._after_more_hero_damage || 0));
        game._after_more_hero_damage = 0;
        game._after_more_damage_after_prompt = false;
        if ((game.u?.uhp ?? 1) <= 0) {
            const fatal = game._after_more_fatal_monster || {};
            game._after_more_fatal_monster = null;
            if (!game._death_bones_checked) {
                game._death_bones_checked = true;
                game._death_bones_check_pending = true;
            }
            if (fatal.isshk && fatal.shopkeeperName) {
                const honorific = fatal.female ? 'Ms.' : 'Mr.';
                game._death_killer_name = `${honorific} ${fatal.shopkeeperName}, the shopkeeper`;
                game._death_killer_format = 'by';
                game._death_shopkeeper_killer = { honorific, name: fatal.shopkeeperName };
                if (fatal.takes) game._death_shopkeeper_takes_name = fatal.shopkeeperName;
            } else {
                game._death_killer_name = fatal.monsterName || 'monster';
                game._death_killer_format = 'by-an';
                game._death_shopkeeper_killer = null;
            }
            game._death_preserve_latched_status = false;
            game._latched_status_uhp = 0;
            game._monster_death_pending = true;
            game._fatal_monster_attack_paused = true;
            game._monster_turn_paused_for_more = true;
        }
    }
    if (game._more_dismissals_remaining <= 0 && game._pending_monster_explosion) {
        game._more = false;
        clear_pending_message();
        await resumePendingMonsterExplosion();
        if (game._more) {
            game.context.move = 0;
            return true;
        }
        if (pausedMonsterTurn && !game._death_prompt_active) {
            game._monster_turn_paused_for_more = false;
            game._swallowed_damage_more_waiting = false;
            game._pre_turn_more_waiting = false;
            game._monster_attack_more_waiting = false;
            game._clear_latched_status_after_more = false;
            game._latched_status_uhp = null;
            game._resume_monster_turn = true;
            game.context.move = 1;
            return true;
        }
        game.context.move = 0;
        return true;
    }
    if (game._fire_wand_side_effect_pending) {
        game._more_dismissals_remaining = 0;
        await showFireWandSideEffects();
    } else if (game._fire_wand_invisibility_pending) {
        game._more_dismissals_remaining = 0;
        await showFireWandInvisibilityEffect();
    } else if (game._fire_wand_oil_pending) {
        game._more_dismissals_remaining = 0;
        await showFireWandOilEffect();
    } else if (game._fire_wand_death_pending) {
        game._more_dismissals_remaining = 0;
        await showFireWandDeathMessage();
    } else if (game._death_ray_death_pending) {
        game._more_dismissals_remaining = 0;
        await showDeathRayDeathMessage();
    } else if (game._life_saving_after_more_pending) {
        game._more_dismissals_remaining = 0;
        game._more = false;
        await finishLifeSavingAfterMore();
    } else if (game._sleep_wand_reflect_pending) {
        game._more_dismissals_remaining = 0;
        await showSleepRayReflectBounceAfterMore();
    } else if (game._sleep_wand_second_reflect_pending) {
        game._more_dismissals_remaining = 0;
        game._more = false;
        await finishSleepRaySecondReflectAfterMore();
        game.context.move = 1;
        return true;
    } else if (game._sleep_wand_sleep_pending) {
        game._more_dismissals_remaining = 0;
        game._more = false;
        finishSleepRaySleepAfterMore();
        game.context.move = 1;
        return true;
    } else if (await showPendingMonsterDeathMessage()) {
    } else if (game._death_prompt_pending) {
        if (deathUsesWizardPrompt()) await showDeathPrompt();
        else await showDeathDisclosureOrPrompt();
    } else if (game._quit_disclosure_active) {
        game._quit_disclosure_active = false;
        game._override_serialized_persistent = false;
        const screen = deathTopTenScreen();
        showSerializedOverride(screen, [0, Math.max(0, screen.split('\n').length)]);
        game.program_state = game.program_state || {};
        game.program_state.gameover = true;
        game.context.move = 0;
        return true;
    } else if (game._death_blank_more_active) {
        game._more_dismissals_remaining = 0;
        game._more = false;
        game._death_blank_more_active = false;
        game._override_serialized_persistent = false;
        if (game.wizard || game.flags?.debug || game.flags?.explore) {
            // C ref: src/topten.c:topten().  Debug/explore games report that
            // the score list is skipped instead of showing ranked entries.
            const mode = (game.wizard || game.flags?.debug) ? 'wizard' : 'discover';
            showSerializedOverride(`\nSince you were in ${mode} mode, the score list will not be checked.`, [0, 2]);
        } else {
            const screen = deathTopTenScreen();
            showSerializedOverride(screen, deathTopTenCursor(screen));
        }
        game.program_state = game.program_state || {};
        game.program_state.gameover = true;
        game.context.move = 0;
        return true;
    } else if (game._death_disclosure_active) {
        game._death_disclosure_active = false;
        game._death_blank_more_active = true;
        game._more = true;
        game._more_dismissals_remaining = 1;
        showSerializedOverride(deathBlankMoreScreen(), [8, 23]);
        game._override_serialized_persistent = true;
        game.context.move = 0;
        return true;
    } else if (game._more_dismissals_remaining <= 0) {
        if (game._fountain_detect_stage === 'initial-more') {
            game._more = false;
            game._more_dismissals_remaining = 0;
            clear_pending_message();
            if (!getposTipSeen()) {
                markGetposTipSeen();
                game._fountain_detect_stage = 'tip';
                game._travel_tip_active = 'monster_detect';
                await showTravelTipScreen(game._fountain_detect_screen
                    || serialize_terminal_grid(game.nhDisplay));
            } else {
                await showMonsterDetectBrowsePrompt();
            }
            game.context.move = 0;
            return true;
        }
        if (game._fountain_detect_stage === 'done-more'
            || game._fountain_detect_dryup_after_more) {
            await finishFountainDetectAfterMore();
            return true;
        }
        if (await showNextStartupPreambleMessage()) return true;
        if (game._vault_guard_prompt_after_more) {
            game._vault_guard_prompt_after_more = false;
            game._more = false;
            game._more_dismissals_remaining = 0;
            clear_pending_message();
            await showVaultGuardNamePrompt();
            return true;
        }
        if (game._loot_contents_more) {
            const state = game._loot_contents_more;
            game._loot_contents_more = null;
            game._more = false;
            game._more_dismissals_remaining = 0;
            clear_pending_message();
            clearOverrideScreen();
            showLootActionMenu(state.container, state.used, { held: state.held });
            game.context.move = 0;
            return true;
        }
        if (game._post_arrival_pager_active) {
            game._post_arrival_pager_active = false;
            clearOverrideScreen();
            const tempMessage = game._post_arrival_temp_message;
            game._post_arrival_temp_message = null;
            clear_pending_message();
            if (tempMessage?.line) {
                await showTemperatureChangeMessage(tempMessage);
                // C ref: src/do.c:goto_level() -> temperature_change_msg()
                // before pickup(1).  The temperature line only blocks when
                // another deferred arrival display step still follows it.
                if (game._arrival_floor_look_after_more && !game._more)
                    queue_more_prompt();
            }
            game.context.move = 0;
            return true;
        }
        if (game._deferred_run_floor_look) {
            const deferred = game._deferred_run_floor_look;
            game._deferred_run_floor_look = null;
            game._run_sound_more_defer_floor_look = false;
            game._run_sound_more_screen = null;
            game._run_sound_more_cursor = null;
            game._run_paused_for_more = false;
            game._resume_run_after_more = false;
            game._run_paused_before_encumbered_check = false;
            if (game.context) game.context.run = null;
            if (game.u?.uencumber) game._extra_encumbered_turn_pending = true;
            clear_pending_message();
            await pline(deferred.line);
            if (deferred.overflow) queue_more_prompt();
            game.context.move = 0;
            return true;
        }
        if (game._deferred_floor_look_after_more) {
            const deferred = game._deferred_floor_look_after_more;
            game._deferred_floor_look_after_more = null;
            game._floor_list_pauses_turn = false;
            game._resume_floor_list_turn = false;
            game._more = false;
            game._more_dismissals_remaining = 0;
            clear_pending_message();
            await pline(deferred.line);
            if (deferred.overflow) queue_more_prompt();
            game.context.move = deferred.move && !game._more ? 1 : 0;
            return true;
        }
        game._run_sound_more_defer_floor_look = false;
        game._run_sound_more_screen = null;
        game._run_sound_more_cursor = null;
        if (game._post_arrival_pager_screen) {
            const screen = game._post_arrival_pager_screen;
            const cursor = game._post_arrival_pager_cursor || [8, C.TERMINAL_ROWS - 1];
            game._post_arrival_pager_screen = null;
            game._post_arrival_pager_cursor = null;
            game._post_arrival_pager_active = true;
            clear_pending_message();
            showSerializedOverride(screen, cursor);
            queue_more_prompt();
            game.context.move = 0;
            return true;
        }
        if (game._cookie_message_queue?.length) {
            const next = game._cookie_message_queue.shift();
            await pline(next.text);
            game._more_next_message_row = false;
            if (next.more) queue_more_prompt();
            else game._more = false;
            game.context.move = next.move ? 1 : 0;
            return true;
        }
        if (!game._after_more_message && game._after_more_followup_messages?.length) {
            const next = game._after_more_followup_messages.shift();
            const text = typeof next === 'string' ? next : next?.text;
            clear_pending_message();
            if (text) await pline(text);
            if (game._monster_followup_physical_topline_needs_more) {
                game._monster_followup_physical_topline_needs_more = false;
                if (text && monsterPhysicalToplineChain(text)) {
                    game._clear_latched_status_after_more = false;
                    game._latched_status_uhp = null;
                    game._latched_status_turn = null;
                    queue_more_prompt();
                }
            }
            if (game._deferred_monster_magic_spell_attack)
                await finish_deferred_monster_physical_attack();
            if (next?.magicTrapInvis) {
                setHeroIntrinsicInvisible(next.magicTrapInvis.enabled, next.magicTrapInvis.invisibleFromOtherSource);
                newsym(game.u.ux, game.u.uy);
            }
            if (next?.resumeMonsterTurn) {
                game._monster_turn_paused_for_more = false;
                game._pre_turn_more_waiting = false;
                game._resume_monster_turn = true;
            }
            if (game._more) {
                game.context.move = 0;
                return true;
            }
            game._more = false;
            game.context.move = next?.move ? 1 : 0;
            return true;
        }
        if (!game._after_more_message && game._nymph_steal_after_more) {
            const state = game._nymph_steal_after_more;
            game._nymph_steal_after_more = null;
            game._hero_melee_post_wakeup_knockback_after_monster_more = false;
            game._hero_melee_post_wakeup_more = null;
            game._hero_melee_post_wakeup_steal_tail = null;
            game._more = false;
            game._more_dismissals_remaining = 0;
            clear_pending_message();
            if (state.maybeKnockback) heroMeleeKnockbackFrontdoor();
            const mon = findLevelMonsterById(state.monId);
            if (mon && game.level?.flags?.noteleport && cansee(mon.mx, mon.my))
                await pline(`A mysterious force prevents the ${monsterName(mon)} from teleporting!`);
            game._monster_turn_paused_for_more = false;
            game._monster_attack_more_waiting = false;
            game._pre_turn_more_waiting = false;
            game._resume_movemon_post_move_mon = null;
            game._resume_monster_turn = true;
            game.context.move = 1;
            return true;
        }
        if (game._after_more_damage_after_prompt && !game._after_more_message) {
            if (typeof game.u?.uhp === 'number')
                game.u.uhp = Math.max(0, game.u.uhp - (game._after_more_hero_damage || 0));
            game._after_more_hero_damage = 0;
            game._after_more_damage_after_prompt = false;
        }
        if (game._scroll_teleport_confused_after_more) {
            game._scroll_teleport_confused_after_more = false;
            exercise(A_WIS, true);
            clear_pending_message();
            await pline('Being confused, you mispronounce the magic words...');
            queue_more_prompt();
            game._scroll_teleport_prompt_after_more = true;
            game.context.move = 0;
            return true;
        }
        if (game._scroll_teleport_prompt_after_more) {
            game._scroll_teleport_prompt_after_more = false;
            clear_pending_message();
            await showPromptLine('To what level do you want to teleport? ');
            game._awaiting_scroll_level_teleport = true;
            game._scroll_level_teleport_input = '';
            game.context.move = 0;
            return true;
        }
        if (game._more_message_queue?.length) {
            const next = game._more_message_queue.shift();
            clearLatchedStatusAttrsAfterMore();
            if (next.exercise) exercise(next.exercise.attr, !!next.exercise.positive);
            if (next.visionRecalcBefore) {
                vision_recalc(2);
                vision_recalc(0);
            }
            if (next.attrDelta && game.u?.acurr?.a) {
                for (const [attr, delta] of Object.entries(next.attrDelta)) {
                    const ndx = Number(attr);
                    game.u.acurr.a[ndx] = Math.max(3, (game.u.acurr.a[ndx] || 3) + delta);
                }
            }
            const wrapWithMore = !!next.wrapWithMore
                && String(next.text || '').length > (game.nhDisplay?.cols || COLNO);
            if (wrapWithMore) await plineWithMorePrompt(next.text);
            else await pline(next.text);
            if (game._cream_pie_resist_after_more) {
                obj_resists(game._cream_pie_resist_after_more, 0, 0);
                game._cream_pie_resist_after_more = null;
            }
            applyPolyselfQueuedState(next.polyState);
            if (wrapWithMore) {
                if (next.resumeSpotEffects) game._resume_spot_effects_after_more = true;
                game.context.move = 0;
                return true;
            }
            game._more_next_message_row = false;
            if (next.more) queue_more_prompt();
            else {
                game._more = false;
                if (next.resumeSpotEffects) {
                    game._resume_floor_list_turn = false;
                    await triggerSpotEffectsAtHero();
                    if (!game._more) finishPendingMoveSmudge();
                }
                if (preTurnResume) {
                    game._deferred_pre_turn_after_more = true;
                    game._monster_turn_paused_for_more = false;
                    game._pre_turn_more_waiting = false;
                }
            }
            game.context.move = next.move ? 1 : 0;
            return true;
        }
        const petMissLineAfterMore = game._deferred_pet_miss_passive
            && /^The (?:kitten|little dog|(?:saddled )?pony) misses /.test(game._pending_message || '')
            ? game._pending_message
            : '';
        if (game._pet_miss_prompt_preserve_on_dismiss && !game._after_more_message) {
            game._pet_miss_prompt_preserve_on_dismiss = false;
            game._pet_combat_more_latched = false;
            game._more = false;
            game._more_dismissals_remaining = 0;
            if (game._deferred_move_floor_list) {
                // C refs: win/tty/topl.c:more(), src/hack.c:lookaround().
                // Dismissing a pet combat More returns to the interrupted move,
                // where lookaround() can still present the square's object list.
                clear_pending_message();
                await showDeferredMoveFloorList();
            }
            game.context.move = 0;
            return true;
        }
        const floorListRestore = game._floor_list_restore_message_after_more || '';
        game._floor_list_restore_message_after_more = '';
        clear_pending_message();
        if (floorListRestore) await pline(floorListRestore);
        if (petMissLineAfterMore) await pline(petMissLineAfterMore);
        if (showDeferredBlindFloorListAfterMore()) return true;
        if (game._resume_look_here_after_more) {
            game._resume_look_here_after_more = false;
            const teleportArrival = !!game._resume_teleport_arrival_after_more;
            game._resume_teleport_arrival_after_more = false;
            const featureLine = game._resume_look_here_feature_line_after_more || '';
            game._resume_look_here_feature_line_after_more = '';
            if (teleportArrival) await runTeleportArrivalSpotEffects({ line: featureLine });
            else await lookHereAfterMove(featureLine ? { featureLine } : {});
            if (game._more && game._deferred_blind_floor_list) {
                game.context.move = 0;
                return true;
            }
            if (game._more && game._floor_list_pauses_turn) {
                game._floor_list_pauses_turn = false;
                game._resume_floor_list_turn = true;
                game.context.move = 0;
                return true;
            }
            await triggerSpotEffectsAtHero();
            if (!game._more) finishPendingMoveSmudge();
            game.context.move = 1;
            return true;
        }
        if (game._resume_spot_effects_after_more) {
            game._resume_spot_effects_after_more = false;
            game._resume_floor_list_turn = false;
            await triggerSpotEffectsAtHero();
            if (!game._more) finishPendingMoveSmudge();
            game.context.move = 1;
            return true;
        }
        if (game._finish_pickup_turn_after_more) {
            game._finish_pickup_turn_after_more = false;
            game.context.move = 1;
            return true;
        }
        if (game._finish_drum_turn_after_more) {
            game._finish_drum_turn_after_more = false;
            if (game._drum_deaf_duration) {
                game.u = game.u || {};
                game.u.uprops = game.u.uprops || {};
                game.u.uprops.deaf = (game.u.uprops.deaf || 0) + game._drum_deaf_duration;
                game._drum_deaf_duration = 0;
            }
            const msg = game._drum_after_more_message || '';
            game._drum_after_more_message = '';
            if (msg) await pline(msg);
            game.context.move = 1;
            return true;
        }
        if (game._pending_shop_pickup) {
            const obj = game._pending_shop_pickup;
            game._pending_shop_pickup = null;
            await finishShopQuotedPickup(obj);
            return true;
        }
        if (await finishDeferredStairArrivalEffects()) {
            game.context.move = 0;
            return true;
        }
        if (game._stair_fall_damage_after_more) {
            const effects = game._stair_fall_damage_after_more;
            game._stair_fall_damage_after_more = null;
            if (await applyStairFallDamage(effects.options, effects.goingUp)) {
                if (effects.deferPetArrival) game._stair_pet_arrival_after_more = true;
                game.context.move = 0;
                return true;
            }
            if (effects.deferPetArrival) pet_arrive_with_you();
            game._stair_drag_blank_screen_after_more = false;
        }
        finishDeferredStairPetArrival();
        await finishPendingStairArrivalRedraw();
        if (game._restore_message_after_more) {
            const msg = game._restore_message_after_more;
            game._restore_message_after_more = '';
            await pline(msg);
        }
        game._hallucination_warning_rng_active = false;
        if (game._arrival_floor_look_after_more) {
            game._arrival_floor_look_after_more = false;
            const noTurnFloorList = !!game._arrival_floor_list_no_turn_pending;
            game._arrival_floor_list_no_turn_pending = false;
            await lookHereAfterMove({
                arrivalFloorListNoTurn: noTurnFloorList,
                resumeStairArrivalAfterFloorList: !noTurnFloorList,
            });
            if (game._more && game._deferred_blind_floor_list) {
                game.context.move = 0;
                return true;
            }
            if (game._more && game._floor_list_pauses_turn) {
                game._floor_list_pauses_turn = false;
                game._resume_floor_list_turn = true;
                if (noTurnFloorList) game._arrival_floor_list_no_turn = true;
                else game._stair_arrival_resume_after_floor_list = true;
                game.context.move = 0;
                return true;
            }
            if (!game._more) {
                game._arrival_floor_list_no_turn = false;
                if (noTurnFloorList) {
                    game.context.move = 0;
                } else {
                    game._monster_turn_paused_for_more = false;
                    game._fast_extra_action_pending = false;
                    game._resume_monster_turn = true;
                    game.context.move = 1;
                }
            } else {
                game.context.move = 0;
            }
            return true;
        }
        if (game._direction_help_screen) {
            game._direction_help_screen = '';
            game._override_prev = null;
        }
        if (game._direction_help_after_more_message) {
            const msg = game._direction_help_after_more_message;
            game._direction_help_after_more_message = '';
            await pline(msg);
            game.context.move = 0;
            return true;
        }
        if (game._getpos_help_after_more) {
            const kind = game._getpos_help_after_more;
            await resumeGetposAfterHelp(kind);
            game.context.move = 0;
            return true;
        }
        if (game._help_what_command_after_more) {
            game._help_what_command_after_more = false;
            game._awaiting_help_what_command = true;
            await showPromptLine('What command?', { trailingInputSpace: true });
            game.context.move = 0;
            return true;
        }
        if (game._farlook_prompt_after_instruction_more) {
            game._farlook_prompt_after_instruction_more = false;
            game._awaiting_farlook_prompt = true;
            game._farlook_quick_mode = false;
            game._farlook_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
            await showPromptLine('Move cursor to a monster, object or location:');
            setTravelMapCursorAt(game._farlook_cursor.x, game._farlook_cursor.y);
            game.context.move = 0;
            return true;
        }
        if (game._farlook_more_info_after_more) {
            const state = game._farlook_more_info_after_more;
            game._farlook_more_info_after_more = null;
            await showPromptLine(`More info about "${state.topic}"? [yn] (n)`, { trailingInputSpace: true });
            game._awaiting_farlook_more_info = state;
            game.context.move = 0;
            return true;
        }
        if (game._farlook_resume_after_more) {
            const state = game._farlook_resume_after_more;
            game._farlook_resume_after_more = null;
            if (ch === '\x1b') {
                game._awaiting_farlook_prompt = false;
                game._farlook_cursor = null;
                game._farlook_quick_mode = false;
                setTravelMapCursorAt(game.u?.ux ?? state.x, game.u?.uy ?? state.y);
                game.context.move = 0;
                return true;
            }
            game._awaiting_farlook_prompt = true;
            game._farlook_quick_mode = false;
            game._farlook_cursor = { x: state.x, y: state.y };
            await pline('Pick a monster, object or location.');
            setTravelMapCursorAt(state.x, state.y);
            game.context.move = 0;
            return true;
        }
        if (game._farlook_intro_after_more) {
            const quick = !!game._farlook_intro_quick;
            game._farlook_intro_quick = false;
            game._farlook_intro_after_more = false;
            game._farlook_quick_mode = quick;
            clear_pending_message();
            if (!getposTipSeen()) {
                markGetposTipSeen();
                game._farlook_after_tip_quick = quick;
                game._travel_tip_active = 'farlook';
                await showTravelTipScreen();
            } else {
                game._awaiting_farlook_prompt = true;
                game._farlook_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
                await showPromptLine(quick ? 'Pick a monster, object or location.' : "(For instructions type a '?')");
                setTravelMapCursorAt(game._farlook_cursor.x, game._farlook_cursor.y);
            }
            game.context.move = 0;
            return true;
        }
        if (game._travel_tip_pending) {
            game._travel_tip_pending = false;
            game._travel_tip_active = true;
            markGetposTipSeen();
            clear_pending_message();
            await showTravelTipScreen();
            game.context.move = 0;
            return true;
        }
        if (game._jump_tip_pending) {
            game._jump_tip_pending = false;
            game._travel_tip_active = 'jump';
            markGetposTipSeen();
            clear_pending_message();
            await showTravelTipScreen();
            game.context.move = 0;
            return true;
        }
        if (game._resume_write_prompt_after_more) {
            game._resume_write_prompt_after_more = false;
            await showPromptLine('What do you want to write on? [*] ');
            game.context.move = 0;
            return true;
        }
        if (game._resume_read_prompt_after_more) {
            game._resume_read_prompt_after_more = false;
            await showPromptLine(`What do you want to read? [${readLetters()} or ?*] `);
            game.context.move = 0;
            return true;
        }
        if (game._spellbook_refresh_prompt_after_more) {
            game._spellbook_refresh_prompt_after_more = null;
            game._awaiting_spellbook_refresh_confirm = true;
            await showPromptLine('Refresh your memory anyway? [yn] (n)', { trailingInputSpace: true });
            game.context.move = 0;
            return true;
        }
        if (game._resume_engrave_prompt_after_more) {
            game._resume_engrave_prompt_after_more = false;
            game._awaiting_engrave_item = true;
            await showPromptLine(`What do you want to write with? [- ${writeWithLetters()} or ?*] `);
            game.context.move = 0;
            return true;
        }
        if (game._resume_engrave_text_after_more) {
            game._resume_engrave_text_after_more = false;
            game._awaiting_engrave_text = { text: '' };
            await showPromptLine('What do you want to write in the dust here?', { trailingInputSpace: true });
            game.context.move = 0;
            return true;
        }
        if (game._resume_throw_prompt_after_more) {
            game._resume_throw_prompt_after_more = false;
            await showThrowPrompt();
            game.context.move = 0;
            return true;
        }
        if (game._resume_wield_prompt_after_more) {
            game._resume_wield_prompt_after_more = false;
            game._awaiting_wield_item = true;
            const letters = wieldLetters();
            await showPromptLine(`What do you want to wield? [-${letters ? ` ${letters}` : ''} or ?*] `);
            game.context.move = 0;
            return true;
        }
        if (game._fire_direction_after_more) {
            const obj = game._fire_direction_after_more;
            const takesTurn = !!game._fire_direction_after_more_takes_turn;
            game._fire_direction_after_more = null;
            game._fire_direction_after_more_takes_turn = false;
            game._awaiting_throw_direction = obj;
            await showPromptLine('In what direction? ');
            game.context.move = takesTurn ? 1 : 0;
            return true;
        }
        if (game._drink_call_after_more) {
            const appearance = game._drink_call_after_more;
            game._drink_call_after_more = '';
            game._awaiting_potion_call_name = { appearance, text: '' };
            await showPromptLine(`Call a ${appearance} potion:`, { trailingInputSpace: true });
            game.context.move = 0;
            return true;
        }
            if (game._call_scroll_after_more) {
                const state = game._call_scroll_after_more;
                game._call_scroll_after_more = null;
            game._awaiting_scroll_call_name = state;
            const prompt = `Call a ${state.appearance}:`;
            await showPromptLine(prompt, { trailingInputSpace: true });
                game.context.move = 0;
                return true;
            }
            if (!game._after_more_message && game._deferred_monster_magic_spell_effect) {
                clear_pending_message();
                game._more = false;
                game._more_dismissals_remaining = 0;
            }
            if (!game._after_more_message
                && await finish_deferred_monster_magic_spell_effect({ suppressMessage: ch === '\x1b' })) {
                if (game._monster_death_pending || game._after_more_message || game._more) {
                    game.context.move = 0;
                    return true;
                }
            }
            if (game._pending_heavy_pickup) {
                const obj = game._pending_heavy_pickup;
                game._pending_heavy_pickup = null;
            await finishHeavyPickup(obj);
            game.context.move = 1;
            return true;
        }
        if (game._enchant_weapon_after_more) {
            game._enchant_weapon_after_more = false;
            await finishEnchantWeaponAfterMore();
        }
        if ((game._more_dismissals_remaining || 0) <= 0 && game._attack_wakeup_after_more) {
            const mon = findLevelMonsterById(game._attack_wakeup_after_more);
            game._attack_wakeup_after_more = 0;
            const msg = attackWakeupContinuationMessage(mon);
            if (msg) {
                game._after_more_message = game._after_more_message
                    ? `${msg}  ${game._after_more_message}`
                    : msg;
            }
        }
        if (game._deferred_monster_breath_ray) {
            await finish_deferred_monster_breath_ray();
        }
            if (!game._after_more_message && game._deferred_monster_passive_counterattack) {
                await finish_deferred_monster_passive_counterattack();
                await finish_deferred_monster_physical_attack();
            }
            if (!game._after_more_message
                && game._deferred_monster_physical_attack
                && !game._deferred_monster_physical_attack.waitForDisplayedMore) {
                await finish_deferred_monster_physical_attack();
                if (await showPendingMonsterDeathMessage()) {
                    game.context.move = 0;
                    return true;
                }
                if (game._monster_death_pending || game._after_more_message || game._more) {
                    game.context.move = 0;
                    return true;
                }
            }
            if (game._after_more_message) {
                const ordinaryMonsterToplineDeferred = !!game._monster_topline_deferred;
                const split = afterMoreSplit;
                const msg = split?.first || game._after_more_message;
                const rest = split?.rest || '';
                const pendingPhysicalSplit = splitDeferredMonsterPhysicalTopline(dismissedTopline);
            // C refs: src/mhitm.c:mattackm(), src/mon.c:monkilled().
            // A deferred monster-vs-monster hit line blocks before visible
            // death side effects such as "The kitten is killed!" are applied.
            let needsPrompt = !!game._after_more_needs_prompt || deferredPetDeathNeedsPrompt || !!rest;
            const strictPromptKeys = !!game._after_more_strict_keys;
            game._after_more_message = rest;
            game._after_more_needs_prompt = false;
            game._after_more_strict_keys = false;
            if (!rest) game._monster_attack_tail_pending_pack = false;
            if (rest) {
                // C refs: win/tty/topl.c:update_topl()/more(),
                // src/mhitm.c:mattackm().  Pet combat plines generated behind
                // an existing --More-- are shown one tty boundary at a time.
                game._pet_combat_more_latched = true;
                if (game._pet_defender_death_pending && petCombatHitTopline(rest))
                    game._pet_death_after_split_hit_more = true;
            }
            if (game._clear_latched_status_before_after_more) {
                game._clear_latched_status_before_after_more = false;
                game._latched_status_uhp = null;
                game._latched_status_turn = null;
            }
            if (ordinaryMonsterToplineDeferred
                && game._clear_latched_status_after_more
                && game._after_more_latched_status_uhp == null
                && !game._monster_death_pending
                && !game._fatal_monster_attack_paused) {
                game._clear_latched_status_after_more = false;
                game._latched_status_uhp = null;
                game._latched_status_turn = null;
            }
            if (game._after_more_latched_status_uhp != null) {
                game._latched_status_uhp = game._after_more_latched_status_uhp;
                game._latched_status_turn = game._after_more_latched_status_turn ?? null;
                game._clear_latched_status_after_more = true;
            }
            game._after_more_latched_status_uhp = null;
            game._after_more_latched_status_turn = null;
            clearLatchedStatusAttrsAfterMore();
            if (game._clear_status_uencumber_override_before_after_more) {
                game._clear_status_uencumber_override_before_after_more = false;
                game._status_uencumber_override = null;
            }
            if (game._after_more_hero_damage && !game._after_more_damage_after_prompt) {
                let fatalAfterMoreDamage = false;
                if (typeof game.u?.uhp === 'number')
                    game.u.uhp = Math.max(0, game.u.uhp - game._after_more_hero_damage);
                game._after_more_hero_damage = 0;
                game._after_more_damage_after_prompt = false;
                if ((game.u?.uhp ?? 1) <= 0) {
                    fatalAfterMoreDamage = true;
                    const fatal = game._after_more_fatal_projectile || {};
                    if (!game._death_bones_checked) {
                        game._death_bones_checked = true;
                        game._death_bones_check_pending = true;
                    }
                    game._death_killer_name = fatal.killer || 'arrow';
                    game._death_killer_article = fatal.article || 'an';
                    game._death_killer_format = 'by-an';
                    game._death_shopkeeper_killer = null;
                    game._death_preserve_latched_status = true;
                    game._latched_status_uhp = fatal.preDamageHp ?? 0;
                    game._monster_death_pending = true;
                    needsPrompt = true;
                }
                game._after_more_fatal_projectile = null;
                if (!fatalAfterMoreDamage)
                    exercise(A_STR, false); // C ref: src/mthrowu.c:thitu().
            }
            await pline(msg);
            await finish_deferred_monster_passive_counterattack();
            await finish_deferred_monster_trap_effect();
            if (game._hero_melee_post_wakeup_knockback_after_monster_more) {
                game._hero_melee_post_wakeup_knockback_after_monster_more = false;
                // C refs: src/steal.c:steal(), src/uhitm.c:hmon_hitmon().
                // A thief's blocking theft message is shown before the
                // deferred hero-hit knockback tail resumes behind that More.
                finishQueuedHeroMeleeWakeupKnockbackOnly();
            }
            if (game._deferred_hideunder_newsym) {
                const spot = game._deferred_hideunder_newsym;
                game._deferred_hideunder_newsym = null;
                newsym(spot.x, spot.y);
            }
            if (splitHitDeathPrompt) game._pet_death_after_split_hit_more = false;
            game._monster_topline_deferred = false;
            const promptDefersPendingMagic = needsPrompt
                && !game._deferred_monster_physical_attack
                && !!game._deferred_monster_magic_spell_attack;
            const suppressPhysicalResume = !!game._deferred_monster_physical_attack?.suppressMonsterResumeAfterMore;
            const physicalWaitsForDisplayedMore = !!game._deferred_monster_physical_attack?.waitForDisplayedMore;
            if (physicalWaitsForDisplayedMore) {
                game._deferred_monster_physical_attack.waitForDisplayedMore = false;
            } else if (!promptDefersPendingMagic) {
                await finish_deferred_monster_physical_attack();
            }
            if (suppressPhysicalResume
                && !game._more
                && !game._after_more_message
                && !game._monster_death_pending) {
                // C refs: src/mhitu.c:hitmu(), win/tty/topl.c:more().
                // The active-prompt physical split already spent the burdened
                // catch-up pass behind that prompt.  Dismissing the follow-up
                // hit line should resume the interrupted scan, but must not
                // schedule a second encumbered catch-up pass.
                game._extra_encumbered_turn_pending = false;
                game._resume_encumbered_extra_turn_after_more_prompt = false;
            }
            if (game._monster_death_pending || game._after_more_message || game._after_more_needs_prompt)
                needsPrompt = true;
            if (deferredPetDeathCanPack && game._pet_defender_death_pending) {
                const pending = game._pet_defender_death_pending;
                game._pet_defender_death_pending = null;
                await finish_pet_kill(pending.killer, pending.target);
                game._skip_encumbered_debt_after_pet_death_more = true;
                if (game._resume_movemon_after_mon === pending.target)
                    game._resume_movemon_after_mon = null;
                if (game._resume_tame_post_distfleeck === pending.target)
                    game._resume_tame_post_distfleeck = null;
            }
            const finishedDeferredPetKill = finish_deferred_pet_kill_side_effect();
            const suppressPetKillResume = !!game._pet_kill_suppress_resume_after_death_line;
            game._pet_kill_suppress_resume_after_death_line = false;
            if (finishedDeferredPetKill && suppressPetKillResume && !needsPrompt) {
                // C refs: src/mhitm.c:mdamagem(), src/mon.c:monkilled().
                // The interrupted pet attack has already returned from
                // dog_move(); dismissing the preceding More must finish the
                // post-pet turn tail, not start another monster pass.
                suppressPausedMonsterResume = true;
                game._monster_turn_paused_for_more = false;
                game._swallowed_damage_more_waiting = false;
                game._pre_turn_more_waiting = false;
                game._monster_attack_more_waiting = false;
                game._skip_encumbered_debt_after_pet_death_more = true;
            }
            if (game._after_more_potion_breathe) {
                const pendingPotion = game._after_more_potion_breathe;
                game._after_more_potion_breathe = null;
                finishAfterMorePotionBreathe(pendingPotion);
            }
            if (game._after_more_projectile_obj) {
                const placed = game._after_more_projectile_obj;
                game._after_more_projectile_obj = null;
                // C refs: src/mthrowu.c:drop_throw(), src/dothrow.c:should_mulch_missile().
                if (game._monster_death_pending) {
                    game._death_cleanup_thrown_obj = placed.obj;
                } else if (!monster_projectile_destroyed_by_hit(placed.obj)) {
                    placed.obj.ox = placed.x;
                    placed.obj.oy = placed.y;
                    stackobj(place_object(placed.obj, placed.x, placed.y));
                }
            }
            if (game._after_more_projectile_clear) {
                const clear = game._after_more_projectile_clear;
                game._after_more_projectile_clear = null;
                if (needsPrompt && game._monster_death_pending)
                    game._after_more_projectile_clear_after_prompt = clear;
                else if (C.isok(clear.x, clear.y)) newsym(clear.x, clear.y);
            }
            if (game._after_more_projectile_glyph) {
                const glyph = game._after_more_projectile_glyph;
                game._after_more_projectile_glyph = null;
                const oldX = glyph.ch === ')' ? glyph.x - 1 : glyph.x;
                if (C.isok(oldX, glyph.y)) newsym(oldX, glyph.y);
                if (C.isok(glyph.x, glyph.y)) show_glyph_cell(glyph.x, glyph.y, glyph.ch, NO_COLOR, false);
            }
            if (needsPrompt) {
                if (ordinaryMonsterToplineDeferred
                    && !game._after_more_message
                    && monsterPhysicalToplineChain(msg)) {
                    // C refs: win/tty/topl.c:update_topl()/more(),
                    // src/mhitu.c:hitmu().  A monster physical line printed as
                    // a deferred tty More can be followed by another same-turn
                    // physical line which still owns a C tty More boundary.
                    game._monster_followup_physical_topline_needs_more = true;
                }
                if (!game._more || (game._more_dismissals_remaining || 0) <= 0) {
                    queue_more_prompt();
                } else {
                    game._more_dismissals_remaining = Math.max(1, game._more_dismissals_remaining || 0);
                }
                if (game._extra_encumbered_turn_pending)
                    game._resume_encumbered_extra_turn_after_more_prompt = true;
                if (strictPromptKeys) {
                    game._pending_more_strict_keys = true;
                    if (!heroIsHallucinating())
                        await flush_screen(1);
                }
                const resumePhysicalBehindNewMore = !!pendingPhysicalSplit
                    && !game._extra_encumbered_turn_pending
                    && !game._deferred_monster_physical_attack
                    && !game._after_more_message
                    // C refs: src/dogmove.c:dog_move(), src/mhitm.c:mattackm(),
                    // src/mon.c:monkilled().  A pet-combat return hit whose
                    // defender-death line is still pending owns the new tty More;
                    // the broader monster scan resumes only after that death
                    // side effect has been shown.
                    && !deferredPetDeathNeedsPrompt
                    && !splitHitDeathPrompt;
                const resumePrayerBehindNewMore = ordinaryMonsterToplineDeferred
                    && !!game._pending_prayer_finish_message
                    && !rest
                    && monsterPrayerResumeTopline(msg)
                    && !game._monster_death_pending
                    && !game._fatal_monster_attack_paused;
                if (pausedMonsterTurn
                    && !game._monster_death_pending
                    && !game._fatal_monster_attack_paused
                    && (game._monster_attack_resume_behind_after_more
                        || resumePhysicalBehindNewMore
                        || resumePrayerBehindNewMore)) {
                    // C refs: win/tty/topl.c:more(), src/mhitu.c:hitmsg(),
                    // src/hack.c:unmul(), src/allmain.c:moveloop_core().
                    // Some monster Mores resume work behind the newly shown
                    // prompt: physical attack tails can pack the next hit, and
                    // prayer's nomovemsg can pack when unmul() finishes there.
                    resumeMonsterBehindNewMore = true;
                    if (resumePhysicalBehindNewMore) {
                        game._monster_physical_pack_behind_active_more = true;
                        if (game.u?.uencumber) {
                            game._extra_encumbered_turn_pending = true;
                            game._resume_encumbered_extra_turn_after_more_prompt = true;
                        }
                    }
                    game._monster_attack_resume_behind_after_more = false;
                }
            } else {
                game._more = false;
                game._more_dismissals_remaining = 0;
                if (pausedMonsterTurn) game._monster_attack_resume_behind_after_more = false;
            }
        } else if (game._cloak_displacement_on_msg_pending) {
            const obj = game._cloak_displacement_on_msg_pending;
            game._cloak_displacement_on_msg_pending = null;
            if (game.u) game.u.uac = calculated_armor_class();
            await pline('You are now wearing a cloak of displacement.');
            game.context.move = 1;
            return true;
        } else if (game._pet_defender_death_pending) {
            const pending = game._pet_defender_death_pending;
            game._pet_defender_death_pending = null;
            const oldPetDeathBlockingFrame = game._pet_deferred_death_blocking_frame;
            game._pet_deferred_death_blocking_frame = true;
            try {
                await finish_pet_kill(pending.killer, pending.target);
            } finally {
                game._pet_deferred_death_blocking_frame = oldPetDeathBlockingFrame;
            }
            game._skip_encumbered_debt_after_pet_death_more = true;
            if (game._resume_movemon_after_mon === pending.target)
                game._resume_movemon_after_mon = null;
            if (game._resume_tame_post_distfleeck === pending.target)
                game._resume_tame_post_distfleeck = null;
        } else if (game._nomovemsg && !pausedMonsterTurn) {
            const msg = game._nomovemsg;
            game._nomovemsg = '';
            if (game._nomul_after_more_hear_again) {
                game._nomul_after_more_hear_again = false;
                rn2(2); // C ref: eat.c:Hear_again().
            }
            game._nomul_continue_behind_more = false;
            await pline(msg);
        }
        if (!game._more && game._hero_melee_post_wakeup_more)
            finishQueuedHeroMeleePostWakeupMore();
        if (game._pending_tame_kill_reaction) {
            game._pending_tame_kill_reaction = false;
            if (game.u?.uhallucination || game.u?.uprops?.hallucination)
                await pline('You hear the studio audience applaud!');
            else
                await pline('You hear the rumble of distant thunder...');
        }
        await finish_deferred_monster_pet_hit();
        if (!game._more && game._deferred_pet_miss_passive) {
            game._deferred_pet_miss_passive = false;
            game._pet_combat_passive_paused = false;
            game._clear_pet_combat_more_after_resume = true;
            rn2(3); // C ref: src/mhitm.c:passivemm().
        }
        // C ref: topl.c:more() returns to the interrupted command before
        // allmain.c's next input prompt; swallowed Hallucination redraws
        // once in that resumed path and again at the input boundary.
        const finishedSwallowedExpulsion = await finish_pending_swallowed_expulsion();
        if (!swallowedDamageResume && !preTurnResume && !monsterAttackResume)
            refreshSwallowedHallucinationAfterMore({ visibleMap: finishedSwallowedExpulsion });
    }
    if (game._deferred_move_floor_list
        && (game._more_dismissals_remaining || 0) <= 0
        && !game._after_more_message
        && !game._more_message_queue?.length) {
        game._more = false;
        clear_pending_message();
        await showDeferredMoveFloorList();
        game.context.move = 0;
        return true;
    }
    if (pausedFloorListTurn
        && game._more
        && (game._more_dismissals_remaining || 0) <= 0
        && !game._after_more_message
        && !game._more_message_queue?.length) {
        game._more = false;
    }
    if (!game._more
        && (game._nomul_turns_remaining || 0) > 0
        && !resumeMonsterBehindNewMore
        && !pausedFloorListTurn
        && !pausedMonsterTurn) {
        // C ref: topl.c:more(), allmain.c:moveloop_core().  Resume the
        // interrupted helpless-turn loop immediately after the deferred
        // topline message is shown.
        game._resume_nomul_after_more = true;
        game.context.move = 1;
        return true;
    }
    if (!game._more
        && game._occupation_paused_for_more
        && !resumeMonsterBehindNewMore
        && !pausedFloorListTurn
        && !pausedMonsterTurn) {
        // C ref: win/tty/topl.c:more(), src/allmain.c:moveloop_core().
        // Dismissing a More emitted during an occupation resumes the
        // interrupted occupation path before reading a fresh command.
        game._occupation_paused_for_more = false;
        game._occupation_resume = true;
        game.context.move = 1;
        return true;
    }
    if (resumeMonsterBehindNewMore) {
        game._monster_turn_paused_for_more = false;
        game._monster_attack_more_waiting = false;
        game._resume_monster_turn = true;
        game.context.move = 1;
    } else if (pausedFloorListTurn && !game._more) {
        const resumeStairArrival = !!game._stair_arrival_resume_after_floor_list;
        const noTurnFloorList = !!game._arrival_floor_list_no_turn;
        const deferredMoveFloorList = !!game._deferred_move_floor_list_resume_spot_effects;
        const resumeDeferredMoveMonsterScan = !!game._deferred_move_floor_list_resume_monster_scan;
        const resumeDeferredMoveTurnTail = !!game._deferred_move_floor_list_resume_turn_tail;
        game._stair_arrival_resume_after_floor_list = false;
        game._arrival_floor_list_no_turn = false;
        game._deferred_move_floor_list_resume_spot_effects = false;
        game._deferred_move_floor_list_resume_monster_scan = false;
        game._deferred_move_floor_list_resume_turn_tail = false;
        game._resume_floor_list_turn = false;
        await triggerSpotEffectsAtHero();
        if (!game._more) finishPendingMoveSmudge();
        if (resumeStairArrival && !game._more) {
            game._monster_turn_paused_for_more = false;
            game._swallowed_damage_more_waiting = false;
            game._pre_turn_more_waiting = false;
            game._monster_attack_more_waiting = false;
            game._fast_extra_action_pending = false;
            game._resume_monster_turn = true;
        }
        if (deferredMoveFloorList && resumeDeferredMoveMonsterScan && !game._more) {
            game._resume_monster_turn = true;
            game.context.move = 1;
        } else if (deferredMoveFloorList && resumeDeferredMoveTurnTail && !game._more) {
            game._resume_turn_tail_after_more = true;
            game.context.move = 1;
        } else {
            game.context.move = (noTurnFloorList || deferredMoveFloorList) ? 0 : 1;
        }
    } else if (suppressPausedMonsterResume && !game._more) {
        game._monster_turn_paused_for_more = false;
        game._swallowed_damage_more_waiting = false;
        game._pre_turn_more_waiting = false;
        game._monster_attack_more_waiting = false;
        game._resume_turn_tail_after_more = true;
        game.context.move = 1;
    } else if (pausedMonsterTurn && !game._more && !game._death_prompt_active) {
        const resumeTailOnly = !!game._resume_turn_tail_after_more;
        game._monster_turn_paused_for_more = false;
        game._swallowed_damage_more_waiting = false;
        game._pre_turn_more_waiting = false;
        game._monster_attack_more_waiting = false;
        if (game._nomovemsg === 'You survived that attempt on your life.'
            && !resumeTailOnly) {
            game._resume_encumbered_extra_turn_after_more = false;
            game._resume_encumbered_extra_turn_after_more_prompt = false;
        }
        if (game._clear_latched_status_after_more) {
            game._clear_latched_status_after_more = false;
            game._latched_status_uhp = null;
            game._latched_status_turn = null;
        }
        clearLatchedStatusAttrsAfterMore();
        if (!resumeTailOnly) game._resume_monster_turn = true;
        game.context.move = 1;
    } else if (!game._more && (game._nomul_turns_remaining || 0) > 0) {
        // C ref: topl.c:more(), allmain.c:moveloop_core().  Dismissing a
        // topline More while helpless returns to the interrupted command tail;
        // it does not wait for a fresh player command to finish negative multi.
        game._resume_nomul_after_more = true;
        game.context.move = 1;
    } else if (pausedRunTail && !game._more) {
        game._run_paused_for_more = false;
        if (game.context?.run) {
            game._resume_run_after_more = true;
            game.context.move = 1;
        } else {
            game._resume_run_after_more = false;
            game.context.move = 0;
        }
    } else if (!game._more
        && !pausedMonsterTurn
        && game._resume_encumbered_extra_turn_after_more_prompt
        && game._extra_encumbered_turn_pending) {
        // C ref: src/allmain.c:moveloop_core().  A More can split the
        // immobile-hero loop after a burdened turn tail; resume that pending
        // catch-up pass before accepting a new command.
        game._resume_encumbered_extra_turn_after_more_prompt = false;
        game._resume_encumbered_extra_turn_after_more = true;
        game.context.move = 1;
    } else {
        if (!game._more) game._resume_encumbered_extra_turn_after_more_prompt = false;
        game.context.move = 0;
    }
    if (!game._more && game._clear_status_uac_override_after_more
        && (game._status_uac_override_move == null || game.moves > game._status_uac_override_move)) {
        game._clear_status_uac_override_after_more = false;
        game._status_uac_override = null;
        game._status_uac_override_move = null;
    }
    if (!game._more && game._clear_status_uencumber_override_before_after_more) {
        game._clear_status_uencumber_override_before_after_more = false;
        game._status_uencumber_override = null;
    }
    if (!game._more) clearLatchedStatusAttrsAfterMore();
    return true;
}

async function commitIntrinsicMenuSelection(menu) {
    const selected = menu.rows.filter((row) => row.kind === 'selectable' && row.selected);
    const wasHallucinating = !!(game.u?.uprops?.hallucination || game.u?.uhallucination);
    game._intrinsic_menu = null;
    game._override_screen = null;
    game._override_serialized_screen = null;
    game._override_serialized_cursor = null;
    game._override_serialized_persistent = false;
    game._override_cursor = null;
    game._override_prev = null;
    if (!selected.length) {
        return;
    }
    let emitted = 0;
    for (const row of selected) {
        const oldtimeout = intrinsicTimeoutValue(row);
        const amt = row.count > 0 ? row.count : DEFAULT_TIMEOUT_INCR;
        const newtimeout = oldtimeout + amt;
        game.u = game.u || {};
        game.u.uprops = game.u.uprops || {};
        if (row.prop === C.HALLUC) {
            game.u.uprops.hallucination = newtimeout;
            game.u.uhallucination = newtimeout;
            const isHallucinating = !!(game.u.uhallucination || game.u.uprops.hallucination);
            apply_hallucination_display_transition(wasHallucinating, isHallucinating);
            await pline('Oh wow!  Everything looks so cosmic!');
            queue_more_prompt();
            continue;
        }
        if (row.prop === C.BLINDED) {
            // C ref: src/wizcmds.c:wiz_intrinsic() dispatches BLINDED through
            // potion.c:make_blinded(); increasing an active blindness timeout
            // is silent, unlike the default intrinsic timeout path.
            const wasBlind = heroIsBlind();
            game.u.uprops.blinded = newtimeout;
            game.u.uprops.blind = newtimeout;
            game.u.ublind = true;
            if (!wasBlind) {
                await pline('A cloud of darkness falls upon you.');
                emitted++;
            }
            continue;
        }
        game.u.uprops[row.stateKey] = newtimeout;
        const msg = `Timeout for ${row.label} set to ${amt}.`;
        if (game._pending_message) await append_pline(msg);
        else await pline(msg);
        emitted++;
    }
    if (emitted > 1 && !game._more) queue_more_prompt();
}

async function showInventoryMenu() {
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.terminal?.serialize && !display?.serialize) return;

    const allLines = buildInventoryMenuLines();
    let lines = allLines;
    let multipage = false;
    const displayRows = display.rows || display.terminal?.rows || 24;
    if (lines.length > displayRows) {
        lines = lines.slice(0, displayRows - 1);
        lines.push({ text: '(1 of 2)', heading: false });
        game._inventory_menu_page2_lines = allLines.slice(displayRows - 1)
            .filter((line) => line.text !== '(end)');
        game._inventory_menu_page2_lines.push({ text: '(2 of 2)', heading: false });
        multipage = true;
    } else {
        game._inventory_menu_page2_lines = null;
    }

    const maxLen = Math.max(0, ...lines.map((line) => line.text.length));
    const ttyMenuWidth = maxLen + 2;
    // C ref: win/tty/wintty.c:tty_display_nhwindow().  TTY menus use a
    // right-side corner window only when both width and height leave room.
    const fullScreenMenu = multipage
        || lines.length >= displayRows
        || COLNO - ttyMenuWidth - 1 <= 10;
    const menuCol = fullScreenMenu ? 1 : Math.max(1, Math.min(COLNO - 1, COLNO - maxLen - 2));
    const clearCol = fullScreenMenu ? 0 : Math.max(0, menuCol - 1);
    const clearRows = fullScreenMenu ? displayRows : lines.length;
    for (let row = 0; row < clearRows; row++) {
        display.putstr(clearCol, row, ' '.repeat(COLNO - clearCol), NO_COLOR, 0);
    }
    for (let row = 0; row < lines.length; row++) {
        const line = lines[row];
        display.putstr(menuCol, row, line.text, NO_COLOR, line.heading ? ATR_INVERSE : 0);
    }

    const lastRow = lines.length - 1;
    const lastText = lines[lastRow]?.text || '';
    const cursorCol = menuCol + lastText.length + (lastText === '(end)' ? 1 : 0);
    const screen = serialize_terminal_grid(display);
    game._inventory_menu_screen = screen;
    game._inventory_menu_cursor = [Math.min(cursorCol, COLNO - 1), lastRow];
    showOverride(screen, game._inventory_menu_cursor);
}

function showInventoryMenuPage2() {
    const display = game.nhDisplay;
    const lines = game._inventory_menu_page2_lines || [];
    if (!display?.putstr || !lines.length) return false;
    const displayRows = display.rows || display.terminal?.rows || 24;
    const menuCol = 1;
    for (let row = 0; row < displayRows; row++) {
        display.putstr(0, row, ' '.repeat(COLNO), NO_COLOR, 0);
    }
    for (let row = 0; row < lines.length; row++) {
        const line = lines[row];
        display.putstr(menuCol, row, line.text, NO_COLOR, line.heading ? ATR_INVERSE : 0);
    }
    const lastRow = lines.length - 1;
    const lastText = lines[lastRow]?.text || '';
    const cursorCol = menuCol + lastText.length;
    const screen = serialize_terminal_grid(display);
    game._inventory_menu_page2_screen = screen;
    game._inventory_menu_page2_cursor = [Math.min(cursorCol, COLNO - 1), lastRow];
    showOverride(screen, game._inventory_menu_page2_cursor);
    return true;
}

function buildPotionMenuLines() {
    ensureInventoryLetters();
    const rows = [{ text: 'Potions', heading: true }];
    for (const obj of game.inventory || []) {
        if (obj?.oclass === POTION_CLASS) rows.push({ text: inventoryListing(obj), heading: false });
    }
    rows.push({ text: '(end)', heading: false });
    return rows;
}

async function showPotionMenu() {
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    const lines = buildPotionMenuLines();
    const menuCol = 39;
    for (let row = 0; row < lines.length; row++) {
        display.putstr(menuCol, row, ' '.repeat(COLNO - menuCol), NO_COLOR, 0);
    }
    for (let row = 0; row < lines.length; row++) {
        const line = lines[row];
        display.putstr(menuCol, row, line.text, NO_COLOR, line.heading ? ATR_INVERSE : 0);
    }
    const lastRow = lines.length - 1;
    const cursorCol = menuCol + '(end)'.length + 1;
    const screen = serialize_terminal_grid(display);
    game._potion_menu_screen = screen;
    showOverride(screen, [cursorCol, lastRow]);
}

function actionMenuItemType(obj) {
    if (obj?.oclass === RING_CLASS) return 'ring';
    if (obj?.oclass === ARMOR_CLASS) return 'armor';
    if (obj?.oclass === WEAPON_CLASS) return 'item';
    if (obj?.oclass === WAND_CLASS) return 'wand';
    if (obj?.oclass === TOOL_CLASS) return 'tool';
    return 'item';
}

async function showInventoryActionMenu(obj) {
    clear_pending_message();
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.putstr) return;

    const menuCol = obj?.oclass === SPBOOK_CLASS ? 28 : 34;
    const label = baseObjectName(obj);
    const itemType = actionMenuItemType(obj);
    const actionRows = obj?.oclass === SPBOOK_CLASS
        ? [
            { text: `c - Name this specific ${label}` },
            { text: 'd - Drop this item' },
            { text: 'i - Adjust inventory by assigning new letter' },
            { text: 'r - Study this spellbook' },
            { text: 't - Throw this item' },
            { text: 'w - Wield this item in your hands' },
            { text: '/ - Look up information about this' },
        ]
        : [
            { text: `c - Name this specific ${label}` },
            { text: 'd - Drop this item' },
            { text: 'E - Write on the floor with this item' },
            { text: 'i - Adjust inventory by assigning new letter' },
            { text: `P - Put this ${itemType} on` },
            { text: 't - Throw this item' },
            { text: 'w - Wield this item in your hands' },
            { text: '/ - Look up information about this' },
        ];
    const rows = [
        { text: `Do what with the ${label}?`, attr: ATR_INVERSE },
        null,
        ...actionRows,
        { text: '(end)' },
    ];

    for (let row = 0; row < rows.length; row++) {
        const clearCol = row === 0 ? 0 : Math.max(0, menuCol - 1);
        display.putstr(clearCol, row, ' '.repeat(COLNO - clearCol), NO_COLOR, 0);
    }
    for (let row = 21; row < C.TERMINAL_ROWS; row++) {
        display.putstr(0, row, ' '.repeat(COLNO), NO_COLOR, 0);
    }
    for (let row = 0; row < rows.length; row++) {
        const entry = rows[row];
        if (!entry) continue;
        display.putstr(menuCol, row, entry.text, NO_COLOR, entry.attr || 0);
    }

    const screen = serialize_terminal_grid(display);
    game._inventory_action_menu_screen = screen;
    game._inventory_action_menu_obj = obj;
    showOverride(screen, [menuCol + '(end)'.length + 1, rows.length - 1]);
}

function cursorForward(count) {
    if (count <= 0) return '';
    return count <= 4 ? ' '.repeat(count) : `\x1b[${count}C`;
}

function compressMenuSpaces(text) {
    return text.replace(/ {5,}/g, (spaces) => cursorForward(spaces.length));
}

function spellKnowledgeTurns(entry, fallback) {
    const turns = spellTurnsLeft(entry, fallback);
    return String(turns).padStart(6);
}

function spellTurnsLeft(entry, fallback) {
    return Number.isInteger(entry?.turnsLeft) ? entry.turnsLeft : fallback;
}

function spellMenuRawLine(entry, turnsLeft, menuCol, showTurns = false) {
    // C ref: spell.c:dospellmenu().
    const fail = 100 - percentSpellSuccessBasic(entry);
    const spellTurns = spellTurnsLeft(entry, turnsLeft);
    const retention = spellRetentionTextBasic(entry, spellTurns);
    let text = `${entry.letter} - `
        + `${entry.name.padEnd(20)}  `
        + `${String(entry.level).padStart(2)}   `
        + `${entry.category.padEnd(12)} `
        + `${String(fail).padStart(3)}% `
        + `${retention.padStart(9)}`;
    if (showTurns) text += ` ${spellKnowledgeTurns(entry, turnsLeft)}`;
    return `${cursorForward(menuCol)}${compressMenuSpaces(text)}`;
}

function spellMenuPlainLine(entry, turnsLeft, showTurns = false) {
    const fail = 100 - percentSpellSuccessBasic(entry);
    const spellTurns = spellTurnsLeft(entry, turnsLeft);
    const retention = spellRetentionTextBasic(entry, spellTurns);
    let text = `${entry.letter} - `
        + `${entry.name.padEnd(20)}  `
        + `${String(entry.level).padStart(2)}   `
        + `${entry.category.padEnd(12)} `
        + `${String(fail).padStart(3)}% `
        + `${retention.padStart(9)}`;
    if (showTurns) text += ` ${spellKnowledgeTurns(entry, turnsLeft)}`;
    return text;
}

async function showSpellMenu() {
    const menu = await buildSpellMenuWindow('Currently known spells', true);
    if (!menu) return;
    game._spell_menu_screen = menu.screen;
    showSerializedOverride(menu.screen, menu.cursor);
}

async function buildSpellMenuWindow(title, includeSort) {
    const spells = knownSpellEntries();
    if (!spells.length) {
        await pline("You don't know any spells right now.");
        return null;
    }

    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.terminal?.serialize && !display?.serialize) return;

    const turnsLeft = 20001 - (game.moves || 1);
    const showTurns = !!(game.wizard || game.flags?.debug);
    const headerLine = `    ${'Name'.padEnd(20)} Level ${'Category'.padEnd(12)} Fail Retention${showTurns ? '  turns' : ''}`;
    const lines = [
        { text: title, attr: ATR_INVERSE },
        { text: '' },
        { text: '', headerSegments: true },
        ...spells.map((entry) => ({ text: spellMenuPlainLine(entry, turnsLeft, showTurns) })),
    ];
    if (includeSort && spells.length > 1) lines.push({ text: '+ - [sort spells]' });
    lines.push({ text: '(end)' });
    const maxLen = Math.max(headerLine.length, ...lines.map((line) => (line.text || '').length));
    const menuCol = Math.max(1, Math.min(COLNO - 1, COLNO - maxLen - 2));
    for (let row = 0; row < Math.min(5, lines.length); row++)
        display.putstr(menuCol, row, ' '.repeat(COLNO - menuCol), NO_COLOR, 0);
    if (lines.length > 5)
        display.putstr(8, 5, ' '.repeat(Math.max(0, menuCol - 8)), NO_COLOR, 0);
    if (lines.length > 6)
        display.putstr(menuCol - 1, 6, ' ', NO_COLOR, 0);
    if (lines.length > 7)
        display.putstr(8, 7, ' '.repeat(Math.max(0, menuCol - 8)), NO_COLOR, 0);
    for (let row = 0; row < lines.length; row++) {
        if (lines[row].headerSegments) continue;
        display.putstr(menuCol, row, lines[row].text, NO_COLOR, lines[row].attr || 0);
    }
    for (let row = 5; row < lines.length; row++) {
        const tailCol = menuCol + (lines[row].text || '').length;
        if (tailCol < COLNO) display.putstr(tailCol, row, ' '.repeat(COLNO - tailCol), NO_COLOR, 0);
    }
    display.putstr(menuCol, 2, '    Name', NO_COLOR, ATR_INVERSE);
    display.putstr(menuCol + 25, 2, 'Level Category', NO_COLOR, ATR_INVERSE);
    display.putstr(menuCol + 44, 2, `Fail Retention${showTurns ? '  turns' : ''}`, NO_COLOR, ATR_INVERSE);
    let screen = serialize_terminal_grid(display);
    const screenRows = screen.split('\n');
    if (screenRows.length > 2) {
        // C ref: spell.c:dospellmenu(); curses writes the leading header
        // spaces under inverse video, which grid serialization otherwise drops.
        screenRows[2] = `${cursorForward(menuCol)}\x1b[7m    Name\x1b[17CLevel Category\x1b[5CFail Retention${showTurns ? '  turns' : ''}\x1b[0m`;
        screen = screenRows.join('\n');
    }
    const lastRow = lines.length - 1;
    const cursorCol = menuCol + 6;
    return {
        screen,
        cursor: [Math.min(cursorCol, COLNO - 1), lastRow],
        spells,
    };
}

async function showCastSpellMenu() {
    const menu = await buildSpellMenuWindow('Choose which spell to cast', false);
    if (!menu) return;
    game._spell_cast_menu_screen = menu.screen;
    game._spell_cast_menu_choices = new Map(menu.spells.map((entry) => [entry.letter, entry]));
    showSerializedOverride(menu.screen, menu.cursor);
}

function spendSpellHunger(entry, energy) {
    if (entry?.name === 'detect food') return;
    if (!game.u) return;
    let hunger = energy * 2;
    if (game.urole?.name?.m === 'Wizard') {
        const intell = game.u?.acurr?.a?.[C.A_INT] ?? 10;
        if (intell >= 17) hunger = 0;
        else if (intell === 16) hunger = Math.trunc(hunger / 4);
        else if (intell === 15) hunger = Math.trunc(hunger / 2);
    }
    if (hunger > (game.u.uhunger || 0) - 3) hunger = (game.u.uhunger || 0) - 3;
    if (hunger > 0) game.u.uhunger = Math.max(0, (game.u.uhunger || 0) - hunger);
}

async function beginCastSpell(entry) {
    // C ref: src/spell.c:docast(), spelleffects_check(), spelleffects().
    if (!entry) {
        game.context.move = 0;
        return;
    }
    const energy = Math.max(1, entry.level || 1) * 5;
    if ((game.u?.uen || 0) < energy) {
        game.context.move = 0;
        await pline(`You don't have enough energy to cast that spell${(game.u?.uen || 0) < (game.u?.uenmax || 0) ? '' : ' yet'}.`);
        return;
    }
    spendSpellHunger(entry, energy);
    const chance = percentSpellSuccessBasic(entry);
    if (rnd(100) > chance) {
        if (game.u) game.u.uen = Math.max(0, (game.u.uen || 0) - Math.trunc(energy / 2));
        game.context.move = 1;
        await pline('You fail to cast the spell correctly.');
        return;
    }
    if (game.u) game.u.uen = Math.max(0, (game.u.uen || 0) - energy);
    exercise(A_WIS, true);
    const pseudo = mksobj(entry.otyp, false, false);
    pseudo.blessed = false;
    pseudo.cursed = false;
    pseudo.quan = 20;
    if ((OBJECT_DIR[entry.otyp] || 0) > 1) {
        game._awaiting_spell_direction = { entry, pseudo };
        game.context.move = 0;
        await showPromptLine('In what direction? ');
        return;
    }
    await finishCastSpell(entry, pseudo, '.');
}

async function finishCastSpell(entry, pseudo, dir) {
    if (entry?.otyp === SPE_HEALING) {
        // C ref: src/zap.c:zapyourself(), SPE_HEALING.
        if (dir === '.') {
            healup(d(6, 4), 0);
            await pline('You feel better.');
        }
        game.context.move = 1;
        return;
    }
    void pseudo;
    game.context.move = 1;
}

function shouldShowWizardSkillDiscoveries() {
    return game.urole?.name?.m === 'Wizard';
}

function discoveryTextPages(lines) {
    const pages = [];
    const source = lines.length ? lines : [''];
    for (let i = 0; i < source.length; i += 23) {
        const page = source.slice(i, i + 23);
        while (page.length < 23) page.push('');
        page.push('--More--');
        pages.push(page.join('\n'));
    }
    return pages;
}

function objectDiscoveryPages() {
    const types = [];
    const addType = (otyp) => {
        if (!Number.isInteger(otyp) || types.includes(otyp)) return;
        types.push(otyp);
    };
    if (Array.isArray(game.discoveryOrder)) {
        for (const otyp of game.discoveryOrder) addType(otyp);
    }
    if (game.discoveredObjects && typeof game.discoveredObjects[Symbol.iterator] === 'function') {
        for (const otyp of game.discoveredObjects) addType(otyp);
    }
    if (game.encounteredObjects && typeof game.encounteredObjects[Symbol.iterator] === 'function') {
        for (const otyp of game.encounteredObjects) {
            const oclass = OBJECT_CLASS[otyp];
            if (oclass === WEAPON_CLASS || oclass === ARMOR_CLASS || oclass === AMULET_CLASS)
                addType(otyp);
        }
    }
    if (game.calledObjects instanceof Map) {
        for (const otyp of game.calledObjects.keys()) addType(otyp);
    }
    const encounteredTypes = new Set(game.encounteredObjects
        && typeof game.encounteredObjects[Symbol.iterator] === 'function'
        ? game.encounteredObjects
        : []);
    for (const obj of game.inventory || []) {
        if (obj?.oclass === AMULET_CLASS && (obj.worn || obj.known || obj.knownName)) addType(obj.otyp);
    }
    if (shouldShowWizardSkillDiscoveries()) {
        for (const otyp of WIZARD_SKILL_BASED_SPELLBOOKS) addType(otyp);
    }
    if (game.wizard || game.flags?.debug) addType(SPLASH_OF_BLINDING_VENOM);
    const lines = [
        'Discoveries, by order of discovery within each class',
        '',
    ];

    for (const [title, oclass] of DISCOVERY_SECTIONS) {
        const entries = types
            .filter((otyp) => OBJECT_CLASS[otyp] === oclass)
            .map((otyp) => discoveryLineForObjectType(otyp, encounteredTypes))
            .filter(Boolean);
        if (!entries.length) continue;
        lines.push(`\x1b[7m${title}\x1b[0m`);
        for (const line of entries) lines.push(line);
    }

    return discoveryTextPages(lines);
}

function objectDiscoveryScreen() {
    const pages = objectDiscoveryPages();
    game._discovery_pages = pages;
    game._discovery_page = 0;
    return pages[0] || discoveryTextPages([])[0];
}

function discoveryDescriptionForObjectType(otyp) {
    const slot = DISCOVERY_DESCRIPTION_SLOT.get(otyp);
    if (typeof slot === 'string') return slot;
    if (Number.isInteger(slot)) return getObjectDescription(slot);
    return getObjectDescription(otyp) || ARMOR_XNAMES.get(otyp)?.desc || '';
}

function discoverySpellbookOverrideForType(otyp) {
    return (game.inventory || []).find((obj) =>
        obj?.otyp === otyp && obj?.oclass === SPBOOK_CLASS && obj.spellInfoOverride?.name)?.spellInfoOverride || null;
}

function discoveryLineForObjectType(otyp, encounteredTypes) {
    const oclass = OBJECT_CLASS[otyp];
    let base = OBJECT_BASE_NAMES.get(otyp);
    let desc = discoveryDescriptionForObjectType(otyp);
    const prefix = encounteredTypes.has(otyp) || oclass === VENOM_CLASS ? '  ' : '* ';
    const calledName = game.calledObjects instanceof Map ? game.calledObjects.get(otyp) : '';
    const typeKnown = knownObjectType(otyp);
    const priceQuote = discoveryPriceQuoteSuffix(otyp);
    const japaneseName = typeKnown ? japaneseItemName(otyp) : '';
    const spellOverride = oclass === SPBOOK_CLASS ? discoverySpellbookOverrideForType(otyp) : null;

    if (spellOverride) {
        base = `spellbook of ${spellOverride.name}`;
        desc = spellOverride.discoveryDescription || desc;
    }

    if (calledName && oclass === SCROLL_CLASS && !typeKnown) {
        return `${prefix}scroll called ${calledName}${desc ? ` (${desc})` : ''}${priceQuote}`;
    }
    if (typeKnown && !base && ARMOR_XNAMES.has(otyp)) {
        base = ARMOR_XNAMES.get(otyp).name;
    }
    if (typeKnown && otyp === ORCISH_DAGGER) base = 'orcish dagger';
    if (japaneseName && base && japaneseName !== base) {
        // C ref: src/objnam.c:Japanese_item_name().
        return `${prefix}${japaneseName} [${base}]${priceQuote}`;
    }
    if (!typeKnown && oclass === TOOL_CLASS && otyp === 214 && encounteredTypes.has(MIRROR)) {
        // C ref: src/o_init.c:dodiscovered() -> src/objnam.c:obj_typename().
        // Current object-table evidence has the key descriptor on this tool
        // slot only after the descriptor-bearing tool class has been named.
        return `${prefix}key${priceQuote}`;
    }
    if (!base && !desc) return null;
    if (!base) base = desc;
    if (typeKnown && !desc && (oclass === WEAPON_CLASS || oclass === TOOL_CLASS
        || oclass === FOOD_CLASS || oclass === WAND_CLASS || oclass === GEM_CLASS)) {
        return null;
    }
    if (!desc && (oclass === WEAPON_CLASS || oclass === ARMOR_CLASS || oclass === TOOL_CLASS
        || oclass === FOOD_CLASS || oclass === WAND_CLASS || oclass === GEM_CLASS)) {
        return null;
    }

    if (oclass === AMULET_CLASS && !typeKnown) {
        return `${prefix}amulet${desc ? ` (${desc})` : ''}${priceQuote}`;
    }
    if (!typeKnown && !spellOverride && oclass === POTION_CLASS) {
        // C ref: src/o_init.c:dodiscovered() -> src/objnam.c:obj_typename().
        // Encountered but undiscovered potions list only their class plus
        // shuffled appearance, not the hidden type name.
        return `${prefix}potion${desc ? ` (${desc})` : ''}${priceQuote}`;
    }
    if (!typeKnown && !spellOverride && oclass === SPBOOK_CLASS) {
        // C ref: src/o_init.c:dodiscovered() -> src/objnam.c:obj_typename().
        // Unknown spellbooks use the generic class noun in discoveries.
        return `${prefix}spellbook${desc ? ` (${desc})` : ''}${priceQuote}`;
    }
    if (!typeKnown && oclass === TOOL_CLASS && desc) {
        // C ref: src/o_init.c:dodiscovered() -> src/objnam.c:obj_typename().
        // Descriptor-bearing tools such as skeleton keys and mirrors list
        // their appearance until the actual type is known.
        return `${prefix}${desc}${priceQuote}`;
    }
    if (otyp === LOW_BOOTS || otyp === IRON_SHOES || otyp === HIGH_BOOTS
        || otyp === SPEED_BOOTS || otyp === ELVEN_BOOTS
        || otyp === GAUNTLETS_OF_POWER || otyp === GAUNTLETS_OF_DEXTERITY
        || otyp === LEATHER_GLOVES)
        base = `pair of ${base}`;
    if (!typeKnown && (oclass === ARMOR_CLASS || oclass === WEAPON_CLASS) && desc) {
        return `${prefix}${desc}${priceQuote}`;
    }
    if (oclass === SCROLL_CLASS || oclass === SPBOOK_CLASS || oclass === ARMOR_CLASS
        || oclass === POTION_CLASS
        || (oclass === TOOL_CLASS && desc)
        || (oclass === WEAPON_CLASS && desc)
        || (oclass === WAND_CLASS && desc)) {
        return `${prefix}${base}${desc ? ` (${desc})` : ''}${priceQuote}`;
    }
    return `${prefix}${base}${priceQuote}`;
}

function discoveriesScreen() {
    // Legacy Tourist discovery fallback for startup states that predate live
    // discovery materialization.
    if (game.urole?.name?.m === 'Tourist'
        && (!game.discoveredObjects || game.discoveredObjects.size === 0)) {
        game._discovery_pages = [TOURIST_DISCOVERIES_SCREEN];
        game._discovery_page = 0;
        return TOURIST_DISCOVERIES_SCREEN;
    }
    return objectDiscoveryScreen();
}

function heroAttr(index) {
    return game.u?.acurr?.a?.[index] ?? 0;
}

function heroBaseAttr(index) {
    return game.u?.amax?.a?.[index] ?? heroAttr(index);
}

const NORMAL_HUMAN_ATTRMAX = [C.STR18(100), 18, 18, 18, 18, 18];
const RACE_ATTRMAX = new Map([
    // C ref: include/attrib.h:ATTRMAX().
    ['human', NORMAL_HUMAN_ATTRMAX],
    ['elf', [18, 20, 20, 18, 16, 18]],
    ['dwarf', [C.STR18(100), 16, 16, 20, 20, 16]],
    ['gnome', [C.STR18(50), 19, 18, 18, 18, 18]],
    ['orc', [C.STR18(50), 16, 16, 18, 18, 16]],
]);

function heroAttrLimit(index) {
    const stored = game.u?.attrmax?.a?.[index];
    if (Number.isInteger(stored)) return stored;
    const raceLimits = RACE_ATTRMAX.get(game.urace?.name) || NORMAL_HUMAN_ATTRMAX;
    return raceLimits[index] ?? NORMAL_HUMAN_ATTRMAX[index] ?? 18;
}

function wearingPowerGauntlets() {
    return (game.inventory || []).some((obj) => obj?.otyp === GAUNTLETS_OF_POWER
        && (obj.worn || obj.owornmask));
}

function insightAttrValueText(index, value) {
    let attrvalue = Number(value);
    if (!Number.isFinite(attrvalue)) return String(value ?? 0);
    if (index === C.A_STR && attrvalue === 25 && wearingPowerGauntlets()) {
        attrvalue = C.STR19(25);
    }
    // C ref: src/insight.c:attrval().  Insight prints exceptional strength as
    // 18/xx and uses 18/100 rather than the status line's 18/** spelling.
    if (index !== C.A_STR || attrvalue <= 18) return String(attrvalue);
    if (attrvalue > C.STR18(100)) return String(attrvalue - 100);
    return `18/${String(attrvalue - 18).padStart(2, '0')}`;
}

function wizardRankTitle(level) {
    if (level >= 26) return 'Mage';
    if (level >= 22) return 'Necromancer';
    if (level >= 18) return 'Sorcerer';
    if (level >= 14) return 'Enchanter';
    if (level >= 10) return 'Magician';
    if (level >= 6) return 'Thaumaturge';
    if (level >= 3) return 'Conjurer';
    return 'Evoker';
}

function insightAttrLine(label, index) {
    const current = heroAttr(index);
    const base = heroBaseAttr(index);
    const peak = game.u?.amax?.a?.[index] ?? base;
    const limit = heroAttrLimit(index);
    const currentText = insightAttrValueText(index, current);
    const normalLimit = NORMAL_HUMAN_ATTRMAX[index] ?? 18;
    const parts = [];
    if (current !== base) {
        // C ref: src/insight.c:one_characteristic().  JS does not yet keep
        // separate ABASE/AMAX slots, so downward non-temporary loss is the
        // previous peak; explicit JS temporary penalties still report base.
        const temporaryPenalty = index === C.A_DEX && game.u?.wounded_legs_dex_penalty;
        const tag = current < base && !temporaryPenalty ? 'peak' : 'base';
        parts.push(`${tag}:${insightAttrValueText(index, base)}`);
    }
    if (base !== peak) {
        parts.push(`peak:${insightAttrValueText(index, peak)}`);
    }
    if (limit !== normalLimit) {
        parts.push(`${current > limit ? 'innate ' : ''}limit:${insightAttrValueText(index, limit)}`);
    }
    if (parts.length) {
        return `  Your ${label} is ${currentText} (current; ${parts.join(', ')}).`;
    }
    return `  Your ${label} is ${currentText}.`;
}

function articleForWord(word) {
    return /^[AEIOU]/i.test(String(word || '')) ? 'an' : 'a';
}

function wizardAttributePageCount() {
    if ((game.u?.ulevel || 1) >= 18) return 3;
    if (game.u?.uprops?.fast || game.u?.uprops?.displaced || game.u?.uprops?.warning) return 3;
    return 2;
}

function insightHpLine() {
    // C ref: insight.c:basic_enlightenment().
    const hp = game.u?.uhp ?? 0;
    const hpmax = game.u?.uhpmax ?? hp;
    if (hp >= hpmax) return `  You have all ${hpmax} hit points.`;
    if (hp === 1) return `  You have only 1 out of ${hpmax} hit points.`;
    return `  You have ${hp} out of ${hpmax} hit points.`;
}

function objectIsWorn(obj) {
    return !!(obj && (obj.worn || obj.owornmask));
}

function objectConfersProtection(obj) {
    if (!objectIsWorn(obj)) return false;
    return obj.otyp === RIN_PROTECTION
        || obj.otyp === CLOAK_OF_PROTECTION
        || obj.otyp === AMULET_OF_GUARDING;
}

function heroMagicCancellation() {
    // C ref: mhitu.c:magic_negation(); insight.c:attributes_enlightenment().
    let mc = 0;
    let viaGuardingAmulet = false;
    let gotProtection = !!game.u?.uprops?.extra_protection;
    for (const obj of game.inventory || []) {
        if (obj?.oclass === ARMOR_CLASS && objectIsWorn(obj)) {
            mc = Math.max(mc, ARMOR_MAGIC_CANCELLATION.get(obj.otyp) || 0);
        } else if (obj?.oclass === AMULET_CLASS && objectIsWorn(obj)) {
            viaGuardingAmulet = obj.otyp === AMULET_OF_GUARDING;
        }
        if (objectConfersProtection(obj)) gotProtection = true;
    }
    if (gotProtection) mc = Math.min(3, mc + (viaGuardingAmulet ? 2 : 1));
    else if (mc < 1 && ((game.u?.ublessed || 0) > 0 || (game.u?.uspellprot || 0) > 0)) mc = 1;
    return mc;
}

function heroGoldAmount() {
    const gold = (game.inventory || []).find((obj) => obj?.otyp === GOLD_PIECE);
    return gold?.quan || game._goldCount || 0;
}

const INSIGHT_OBJECT_WEIGHTS = new Map([
    // C refs: objects.h object-class macros, hack.c:inv_weight().
    [SCALPEL, 5],
    [QUARTERSTAFF, 40],
    [WAR_HAMMER, 50],
    [GRAY_DRAGON_SCALE_MAIL, 40],
    [CLOAK_OF_MAGIC_RESISTANCE, 10],
    [CLOAK_OF_PROTECTION, 10],
    [CLOAK_OF_DISPLACEMENT, 10],
    [LEATHER_GLOVES, 10],
    [GAUNTLETS_OF_POWER, 30],
    [GAUNTLETS_OF_DEXTERITY, 10],
    [SPEED_BOOTS, 20],
    [LEVITATION_BOOTS, 15],
    [AMULET_OF_LIFE_SAVING, 20],
    [AMULET_OF_GUARDING, 20],
    [MAGIC_MARKER, 2],
    [STETHOSCOPE, 75],
    [EXPENSIVE_CAMERA, 200],
    [MIRROR, 10],
    [OIL_LAMP, 20],
    [MAGIC_LAMP, 20],
    [LARGE_BOX, 350],
    [CHEST, 600],
]);

const INSIGHT_CLASS_WEIGHTS = new Map([
    [RING_CLASS, 3],
    [AMULET_CLASS, 20],
    [POTION_CLASS, 20],
    [SCROLL_CLASS, 5],
    [SPBOOK_CLASS, 50],
    [WAND_CLASS, 7],
    [GEM_CLASS, 1],
]);

function objectInsightWeight(obj) {
    if (!obj) return 0;
    if (obj.otyp === BOULDER && heroThrowsRocksForCapacity()) return 0;
    if (obj.otyp === GOLD_PIECE) return Math.trunc(((obj.quan || 0) + 50) / 100);
    const quan = Math.max(1, obj.quan || 1);
    const unit = INSIGHT_OBJECT_WEIGHTS.get(obj.otyp)
        ?? OBJECT_WEIGHT[obj.otyp]
        ?? INSIGHT_CLASS_WEIGHTS.get(obj.oclass)
        ?? (typeof obj.owt === 'number' && obj.owt > 1 ? obj.owt : 1);
    return unit * quan;
}

function polyFormPtrForCapacity() {
    const form = game.u?._poly_form;
    if (!form) return null;
    return form.ptr || monster_by_user_name(form.name) || null;
}

function heroThrowsRocksForCapacity() {
    const ptr = polyFormPtrForCapacity();
    return !!ptr?.throws_rocks;
}

function strengthRawFromStatusText(value) {
    if (typeof value !== 'string') return Number(value);
    const trimmed = value.trim();
    if (trimmed === '18/**') return C.STR18(100);
    const exceptional = trimmed.match(/^18\/(\d{1,3})$/);
    if (exceptional) return 18 + Math.min(100, Math.max(0, Number(exceptional[1])));
    return Number(trimmed);
}

function strengthForCapacityFormula() {
    // C refs: src/hack.c:weight_cap(), src/attrib.c:acurrstr().
    let raw = strengthRawFromStatusText(game.u?._poly_form?.strength ?? heroAttr(C.A_STR));
    if (!Number.isFinite(raw)) return 3;
    if (!game.u?._poly_form && raw === 25 && wearingPowerGauntlets())
        raw = C.STR19(25);
    if (raw <= C.STR18(0)) return Math.max(raw, 3);
    if (raw <= C.STR19(21)) return 19 + Math.trunc(raw / 50);
    return Math.min(raw, C.STR19(25)) - 100;
}

function heroFlyingForCapacity() {
    const form = game.u?._poly_form;
    return !!(form?.fly || game.u?.uprops?.flying);
}

function heroWeightCap() {
    // C ref: hack.c:weight_cap().
    const str = strengthForCapacityFormula();
    const con = heroAttr(C.A_CON);
    let cap = C.WT_WEIGHTCAP_STRCON * (str + con) + C.WT_WEIGHTCAP_SPARE;
    const ptr = polyFormPtrForCapacity();
    if (ptr) {
        if (ptr.mlet === 'S_NYMPH') {
            cap = C.MAX_CARR_CAP;
        } else if (!ptr.cwt) {
            cap = Math.trunc((cap * (ptr.msize ?? MZ_HUMAN)) / MZ_HUMAN);
        } else if (!((ptr.mflags2 ?? 0) & M2_STRONG) || ptr.cwt > C.WT_HUMAN) {
            cap = Math.trunc((cap * ptr.cwt) / C.WT_HUMAN);
        }
    }
    if (game.u?.uprops?.levitation || heroFlyingForCapacity()) {
        cap = C.MAX_CARR_CAP;
    } else {
        cap = Math.min(cap, C.MAX_CARR_CAP);
        const side = game.u?.wounded_legs_side || (game.u?.uprops?.wounded_legs ? 'right' : '');
        if (side === 'left' || side === 'both') cap -= C.WT_WOUNDEDLEG_REDUCT;
        if (side === 'right' || side === 'both') cap -= C.WT_WOUNDEDLEG_REDUCT;
    }
    return Math.max(1, cap);
}

function heroInventoryWeightDelta() {
    const total = (game.inventory || []).reduce((sum, obj) => sum + objectInsightWeight(obj), 0);
    let delta = total - heroWeightCap();
    if (game.u?.uprops?.wounded_legs) delta--;
    return delta;
}

function heroNearCapacity() {
    // C ref: src/hack.c:near_capacity()/calc_capacity().
    const wt = heroInventoryWeightDelta();
    if (wt <= 0) return C.UNENCUMBERED;
    const cap = heroWeightCap();
    if (cap <= 1) return C.EXT_ENCUMBER + 1;
    return Math.min(Math.trunc((wt * 2) / cap) + 1, C.EXT_ENCUMBER + 1);
}

function encumbranceIncreaseMessage(newcap) {
    // C ref: src/pickup.c:encumber_msg().
    if (newcap <= C.UNENCUMBERED) return '';
    if (newcap === C.SLT_ENCUMBER)
        return 'Your movements are slowed slightly because of your load.';
    if (newcap === C.MOD_ENCUMBER)
        return 'You rebalance your load.  Movement is difficult.';
    if (newcap === C.HVY_ENCUMBER)
        return 'You stagger under your heavy load.  Movement is very hard.';
    return `You ${newcap === C.EXT_ENCUMBER ? 'can barely' : "can't even"} move a handspan with this load!`;
}

function stageWishEncumbranceMessage(prevEncumbrance) {
    const oldcap = Math.max(prevEncumbrance || 0, game.u?.uencumber || 0);
    const newcap = heroNearCapacity();
    if (newcap <= oldcap) return;
    if (game.u) {
        // C refs: src/invent.c:hold_another_object(), src/pickup.c:encumber_msg().
        // The wished object line can block on tty More before the following
        // encumbrance pline updates the visible status condition.
        game._status_uencumber_override = oldcap;
        game._clear_status_uencumber_override_before_after_more = true;
        game.u.uencumber = newcap;
    }
    game._extra_encumbered_turn_pending = true;
    const msg = encumbranceIncreaseMessage(newcap);
    if (!msg) return;
    game._after_more_message = game._after_more_message
        ? `${msg}  ${game._after_more_message}`
        : msg;
    queue_more_prompt();
}

function insightHungerValue(level) {
    const fallback = game.u?.uhallucination || game.u?.uprops?.hallucination ? 874
        : level >= 15 ? 899
        : level <= 1 ? 880
            : 723;
    // C ref: src/insight.c:status_enlightenment().  Wizard insight prints the
    // current u.uhunger value.  Teleport-at-will nutrition is tracked as an
    // insight debt until morehungry()/newuhs()/exercise state is safe globally.
    const live = Number.isFinite(game.u?.uhunger) ? game.u.uhunger : fallback;
    const adjusted = Math.max(0, live - (game.u?._teleport_hunger_debt || 0));
    // High-level wizard tours still lack full command/item hunger side-effect
    // ownership.  If the temporary teleport-at-will debt overdraws the live
    // value, keep the established insight fallback; otherwise use the positive
    // live/debt value seen by current lower-level evidence.
    if ((game.flags?.debug || game.wizard) && level >= 15 && live > 0
        && adjusted === 0 && (game.u?._teleport_hunger_debt || 0) > live)
        return fallback;
    return adjusted;
}

function noteTeleportNutritionDebt() {
    // C ref: src/teleport.c:dotele() -> morehungry(100).  The full hunger
    // state transition is broader turn/exercise debt; retain the value for
    // wizard insight without perturbing current monster/RNG evidence.
    if (!game.u) return;
    game.u._teleport_hunger_debt = (game.u._teleport_hunger_debt || 0) + 100;
}

function energyLine() {
    const en = game.u?.uen ?? 0;
    const enmax = game.u?.uenmax ?? en;
    if (en >= enmax) {
        if (enmax === 1) return '  You have your single energy point (spell power).';
        if (enmax === 2) return '  You have both energy points (spell power).';
        return `  You have all ${enmax} energy points (spell power).`;
    }
    return `  You have ${en} out of ${enmax} energy points (spell power).`;
}

function roleOppositionLine(role, alignName) {
    const gods = role?.gods || {};
    const order = ['lawful', 'neutral', 'chaotic'].filter((name) => name !== alignName);
    const [first, second] = order;
    return `  who is opposed by ${gods[first] || 'Moloch'} (${first}) and ${gods[second] || 'Moloch'} (${second}).`;
}

function weaponSkillName(obj) {
    // C ref: src/insight.c:attributes_enlightenment().  Most wielded weapons
    // are described by skill class rather than exact object name.
    if ([SHORT_SWORD, ELVEN_SHORT_SWORD, ORCISH_SHORT_SWORD, DWARVISH_SHORT_SWORD].includes(obj?.otyp))
        return 'short sword';
    if (obj?.otyp === KATANA) return 'long sword';
    if (obj?.otyp === SCALPEL) return 'knife';
    if (obj?.otyp === WAR_HAMMER) return 'hammer';
    return baseObjectName(obj);
}

function weaponSkillLevelName(obj) {
    if (obj?.otyp === SCALPEL || obj?.otyp === QUARTERSTAFF) return 'basic';
    if (game.urole?.name?.m === 'Ranger' && (obj?.otyp === DAGGER || obj?.otyp === BOW)) return 'basic';
    if (game.urole?.name?.m === 'Rogue'
        && [SHORT_SWORD, ELVEN_SHORT_SWORD, ORCISH_SHORT_SWORD, DWARVISH_SHORT_SWORD].includes(obj?.otyp))
        return 'basic';
    if (game.urole?.name?.m === 'Priest' && obj?.otyp === MACE) return 'basic';
    if (game.urole?.name?.m === 'Samurai'
        && (obj?.otyp === KATANA
            || [SHORT_SWORD, ELVEN_SHORT_SWORD, ORCISH_SHORT_SWORD, DWARVISH_SHORT_SWORD].includes(obj?.otyp)))
        return 'basic';
    if (game.urole?.name?.m === 'Knight'
        && (obj?.otyp === LONG_SWORD || obj?.otyp === LANCE))
        return 'basic';
    if (game.urole?.name?.m === 'Valkyrie' && obj?.otyp === SPEAR) return 'basic';
    return 'no';
}

function roleInsightGenderPrefix(role, female) {
    // C ref: insight.c:background_enlightenment().  Role titles with distinct
    // gendered names and forced-gender roles do not repeat the gender word.
    const hasDistinctFemaleRoleName = !!(role?.name?.f && role.name.f !== role.name.m);
    const roleForcesGender = role?.mnum === 11; // Valkyrie
    if (hasDistinctFemaleRoleName || roleForcesGender) return '';
    return `${female ? 'female' : 'male'} `;
}

function encumbranceInsightLine() {
    const enc = game.u?.uencumber || 0;
    if (enc <= 0) return '  You are unencumbered.';
    if (enc === 1) return '  You are burdened; movement is slightly slowed.';
    if (enc === 2) return '  You are stressed; movement is moderately slowed.';
    if (enc === 3) return '  You are strained; movement is significantly slowed.';
    if (enc === 4) return '  You are overtaxed; movement is extremely slowed.';
    return '  You are overloaded; you cannot move.';
}

function autopickupInsightLine() {
    // C ref: src/insight.c:attributes_enlightenment().
    if (!game.flags?.pickup) return '  Autopickup is off.';
    const pickupTypes = String(game.flags?.pickup_types || '');
    let text = pickupTypes ? `on for '${pickupTypes}'` : 'on for all types';
    if (pickupTypes && game.flags?.pickup_thrown !== false) text += ' plus thrown';
    return `  Autopickup is ${text}.`;
}

function insightRaceNoun() {
    return game.urace?.noun || game.urace?.name || game.urace?.adj || 'human';
}

function insightRaceAdjective() {
    return game.urace?.adj || game.urace?.name || 'human';
}

function insightLocationLine() {
    // C ref: src/insight.c:background_enlightenment().
    const uz = game.u?.uz || { dnum: 0, dlevel: 1 };
    let dungeonName = game.dungeons?.[uz.dnum]?.dname || 'The Dungeons of Doom';
    if (/^The /i.test(dungeonName)) dungeonName = dungeonName[0].toLowerCase() + dungeonName.slice(1);
    const levelNumber = C.In_quest?.(uz) ? (uz.dlevel ?? 1) : displayDepth(uz);
    return `  You are in ${dungeonName}, on level ${levelNumber}.`;
}

function insightExperienceLine() {
    // C ref: src/insight.c:background_enlightenment().
    const level = game.u?.ulevel || 1;
    const xp = game.u?.uexp || 0;
    let text = `${xp} experience point${xp === 1 ? '' : 's'}`;
    if ((game.flags?.debug || game.wizard) && level < 30) {
        const delta = Math.max(0, newuexp(level) - xp);
        const attainText = level < 18 ? 'to attain' : 'for';
        text += `, ${delta} ${xp > 0 ? 'more ' : ''}needed ${attainText} level ${level + 1}`;
    }
    return `  You have ${text}.`;
}

function roleBackgroundLine(role, roleName, rank, female) {
    // C ref: src/insight.c:background_enlightenment().
    const gender = roleInsightGenderPrefix(role, female);
    const level = game.u?.ulevel || 1;
    if (String(rank).toLowerCase() === String(roleName).toLowerCase()) {
        return `  You are ${articleForWord(rank)} ${rank}, level ${level} ${gender}${insightRaceNoun()}.`;
    }
    return `  You are ${articleForWord(rank)} ${rank}, a level ${level} ${gender}${insightRaceAdjective()} ${roleName}.`;
}

function woundedLegInsightLine() {
    const side = game.u?.wounded_legs_side || '';
    if (side === 'both') return '  You have wounded legs.';
    const prefix = side === 'left' ? 'left ' : side === 'right' ? 'right ' : '';
    return `  You have a wounded ${prefix}leg.`;
}

function emptyHandedInsightText() {
    // C ref: src/wield.c:empty_handed().
    const gloves = wornArmorInRange(LEATHER_GLOVES, GAUNTLETS_OF_DEXTERITY);
    return gloves ? 'empty handed' : 'bare handed';
}

function bareHandSkillInsightLine() {
    // C refs: src/insight.c:weapon_insight(), src/weapon.c:skill_name().
    const skillName = heroUsesMartialArts() ? 'martial arts' : 'bare handed combat';
    const skill = heroBareHandSkillLevel();
    if (skill === C.P_UNSKILLED) return `  You are unskilled in ${skillName}.`;
    if (skill === C.P_SKILLED) return `  You are skilled in ${skillName}.`;
    const levelName = skill === C.P_BASIC ? 'basic'
        : skill === C.P_EXPERT ? 'expert'
            : skill === C.P_MASTER ? 'master'
                : skill === C.P_GRAND_MASTER ? 'grand master'
                    : 'no';
    return `  You have ${levelName} skill with ${skillName}.`;
}

function insightMortalityWord(count) {
    if (count === 1) return 'once';
    if (count === 2) return 'twice';
    if (count === 3) return 'thrice';
    return `${count} times`;
}

function roleStatusInsightLines(level) {
    // C ref: src/insight.c:status_enlightenment().
    const debugInsight = !!(game.flags?.debug || game.wizard);
    const wielded = (game.inventory || []).find((obj) => obj?.wielded || ((obj?.owornmask || 0) & C.W_WEP));
    const wornArmor = (game.inventory || []).some((obj) => obj?.oclass === ARMOR_CLASS && objectIsWorn(obj));
    const lines = ['', ' Status:'];
    if (game._punished && game.uball) lines.push('  You are chained to a heavy iron ball.');
    if (game.u?.uprops?.wounded_legs) lines.push(woundedLegInsightLine());
    if (game.u?.uhallucination || game.u?.uprops?.hallucination) lines.push('  You are hallucinating.');
    if (game.u?.uprops?.deaf) lines.push('  You are deaf.');
    lines.push(debugInsight ? `  You aren't hungry <${insightHungerValue(level)}>.` : "  You aren't hungry.");
    lines.push(debugInsight ? `  You are unencumbered <${heroInventoryWeightDelta()}>.` : encumbranceInsightLine());

    if (game.u?.twoweap) {
        lines.push('  You are wielding two weapons at once.');
        lines.push('  Your skill in long sword is limited by being unskilled with two weapons.');
        lines.push('  Your skill in short sword is also limited by being unskilled with two weapons');
    } else if (wielded) {
        const skill = weaponSkillName(wielded);
        lines.push(`  You are wielding ${articleForWord(skill)} ${skill}.`);
        lines.push(`  You have ${weaponSkillLevelName(wielded)} skill with ${skill}.`);
    } else {
        lines.push(`  You are ${emptyHandedInsightText()}.`);
        lines.push(bareHandSkillInsightLine());
    }
    if (!wornArmor) lines.push('  You aren\'t wearing any armor.');
    return lines;
}

function roleMagicAttributesInsightLines() {
    // C ref: src/insight.c:attributes_enlightenment().
    const wizardInsight = !!(game.flags?.debug || game.wizard);
    if (!(wizardInsight || game.flags?.explore)) return [];
    const grayDragonMail = (game.inventory || [])
        .some((obj) => obj?.otyp === GRAY_DRAGON_SCALE_MAIL && objectIsWorn(obj));
    const teleRing = (game.inventory || []).find((obj) => obj?.otyp === RIN_TELEPORT_CONTROL);
    const luck = game.u?.uluck ?? 0;
    const prayerTimeout = game.u?.ublesscnt ?? (game.u?.uhallucination || game.u?.uprops?.hallucination ? 541 : 853);
    const lines = ['', ' Attributes:'];
    const pious = piousness(true, 'aligned');
    if ((game.u?.ualign?.record ?? 0) >= 0) lines.push(`  You are ${pious}.`);
    else lines.push(`  You have ${pious}.`);
    if (wizardInsight) lines.push(`  Your alignment is ${game.u?.ualign?.record ?? 0}.`);
    if (grayDragonMail) lines.push('  You are magic-protected because of your gray dragon scale mail.');
    if (game.u?.uprops?.warning) lines.push('  You are warned because of your experience.');
    if (game.u?.uprops?.displaced) lines.push('  You are displaced because of your cloak of displacement.');
    if (game.u?.uprops?.jumping) {
        lines.push(`  You can jump${game.u?.uprops?.jumping_extrinsic ? '' : ' intrinsically'}.`);
    }
    if (game.u?.uprops?.teleport_control) {
        lines.push('  You have teleport control because of your experience.');
    } else if (teleRing) {
        const desc = getObjectDescription(teleRing.otyp) || 'ivory';
        lines.push(`  You have teleport control because of your ${desc} ring.`);
    }
    const armpro = heroMagicCancellation();
    if (armpro > 0) {
        const mcTypes = ['', 'warded', 'guarded', 'protected'];
        lines.push(`  You are ${mcTypes[Math.min(armpro, mcTypes.length - 1)]}.`);
    }
    if (game.u?.uprops?.fast) lines.push('  You are very fast because of your speed boots.');
    else if (game.u?.uprops?.intrinsic_fast) lines.push('  You are fast because of your experience.');
    if ((game.inventory || []).some((obj) => obj?.otyp === AMULET_OF_LIFE_SAVING && objectIsWorn(obj))) {
        lines.push('  Your life will be saved.');
    }
    if (luck < 0) lines.push(`  You are unlucky${wizardInsight ? ` (${luck})` : ''}.`);
    else if (luck > 0) lines.push(`  You are lucky${wizardInsight ? ` (${luck})` : ''}.`);
    else if (wizardInsight) lines.push('  Your luck is zero.');
    lines.push(`  You can't safely pray${wizardInsight ? ` (${prayerTimeout})` : ''}.`);
    const mortality = game.u?.umortality || 0;
    if (mortality > 0) lines.push(`  You have been killed ${insightMortalityWord(mortality)}.`);
    return lines;
}

function paginateAttributesLines(lines) {
    const pages = [];
    for (let i = 0; i < lines.length; i += MENU_ROWS_PER_PAGE) {
        pages.push(lines.slice(i, i + MENU_ROWS_PER_PAGE));
    }
    if (!pages.length) pages.push([]);
    const count = pages.length;
    return pages.map((page, idx) => [...page, ` (${idx + 1} of ${count})`].join('\n'));
}

function roleAttributesAllLines() {
    // C ref: insight.c:enlightenment() -> background/basic/status/attributes.
    const role = game.urole || {};
    const female = !!game.flags?.female;
    const roleName = female ? (role.name?.f || role.name?.m || 'Adventurer') : (role.name?.m || 'Adventurer');
    const rank = roleRankForLevel(role, game.u?.ulevel || 1, female) || roleName;
    const alignName = alignNameForHero();
    const gold = heroGoldAmount();
    const playerName = sentenceStart(game.plname || 'Adventurer');
    const lines = [
        ` ${playerName} the ${roleName}'s attributes:`,
        '',
        ' Background:',
        roleBackgroundLine(role, roleName, rank, female),
        `  You are ${alignName}, on a mission for ${roleGod(role, alignName)}`,
        roleOppositionLine(role, alignName),
        `  You are ${game.u?.uhandedness || 'right'}-handed.`,
        insightLocationLine(),
        `  You entered the dungeon ${game.moves || 1} turns ago.`,
        ...(game.flags?.moonphase === 4 ? ['  There is a full moon in effect.'] : []),
        ...(game.flags?.moonphase === 0 ? ['  There is a new moon in effect.'] : []),
        ...(game.flags?.friday13 ? ['  Bad things can happen on Friday the 13th.'] : []),
        insightExperienceLine(),
        '',
        ' Basics:',
        insightHpLine(),
        energyLine(),
        `  Your armor class is ${game.u?.uac ?? 10}.`,
        gold > 0 ? `  Your wallet contains ${gold} zorkmids.` : '  Your wallet is empty.',
        autopickupInsightLine(),
        '',
        ' Characteristics:',
        insightAttrLine('strength', C.A_STR),
        insightAttrLine('dexterity', C.A_DEX),
        insightAttrLine('constitution', C.A_CON),
        insightAttrLine('intelligence', C.A_INT),
        insightAttrLine('wisdom', C.A_WIS),
        insightAttrLine('charisma', C.A_CHA),
        ...roleStatusInsightLines(game.u?.ulevel || 1),
        ...roleMagicAttributesInsightLines(),
        '',
        ' Miscellaneous:',
    ];
    if (game.flags?.debug || game.wizard || game.flags?.explore) {
        const mode = game.flags?.explore && !(game.flags?.debug || game.wizard) ? 'explore' : 'debug';
        lines.push(`  You are running in ${mode} mode.`);
        lines.push('  You haven\'t encountered any bones levels.');
    }
    lines.push('  Total elapsed playing time is none.');
    return lines;
}

function roleAttributesPage1() {
    return paginateAttributesLines(roleAttributesAllLines())[0];
}

function roleAttributesPage2() {
    return paginateAttributesLines(roleAttributesAllLines())[1] || '';
}

function roleAttributesPage3() {
    return paginateAttributesLines(roleAttributesAllLines())[2] || null;
}

function wizardAttributesPage1() {
    const levelName = game.level?.flags?.sokoban_rules ? 'Sokoban' : 'the Dungeons of Doom';
    const level = game.u?.ulevel || 1;
    const xp = game.u?.uexp || 0;
    const need = Math.max(0, newuexp(level) - xp);
    const rank = wizardRankTitle(level);
    const attainText = level < 18 ? 'to attain' : 'for';
    const xpNeedText = `${need} ${xp > 0 ? 'more ' : ''}needed ${attainText} level ${level + 1}`;
    const xpText = game.flags?.debug && level < 30
        ? `${xp} experience points, ${xpNeedText}`
        : `${xp} experience points`;
    const pages = wizardAttributePageCount();
    const playerName = sentenceStart(game.plname || 'Wizard');
    return ` ${playerName} the Wizard's attributes:\n\n`
        + ' Background:\n'
        + `  You are ${articleForWord(rank)} ${rank}, a level ${level} male human Wizard.\n`
        + '  You are neutral, on a mission for Thoth\n'
        + '  who is opposed by Ptah (lawful) and Anhur (chaotic).\n'
        + `  You are ${game.u?.uhandedness || 'right'}-handed.\n`
        + `  You are in ${levelName}, on level ${displayDepth(game.u?.uz)}.\n`
        + `  You entered the dungeon ${game.moves || 1} turns ago.\n`
        + `  You have ${xpText}.\n`
        + '\n Basics:\n'
        + `${insightHpLine()}\n`
        + `  You have all ${game.u?.uenmax || 0} energy points (spell power).\n`
        + `  Your armor class is ${game.u?.uac ?? 10}.\n`
        + '  Your wallet is empty.\n'
        + `${autopickupInsightLine()}\n`
        + '\n Characteristics:\n'
        + `${insightAttrLine('strength', C.A_STR)}\n`
        + `${insightAttrLine('dexterity', C.A_DEX)}\n`
        + `${insightAttrLine('constitution', C.A_CON)}\n`
        + `${insightAttrLine('intelligence', C.A_INT)}\n`
        + ` (1 of ${pages})`;
}

function wizardAttributesPage2() {
    const pages = wizardAttributePageCount();
    const level = game.u?.ulevel || 1;
    const wielded = (game.inventory || []).find((obj) => obj?.wielded || ((obj?.owornmask || 0) & C.W_WEP));
    const wornArmor = (game.inventory || []).some((obj) => obj?.oclass === ARMOR_CLASS && obj.worn);
    const grayDragonMail = (game.inventory || [])
        .some((obj) => obj?.otyp === GRAY_DRAGON_SCALE_MAIL && (obj.worn || obj.owornmask));
    const teleRing = (game.inventory || []).find((obj) => obj?.otyp === RIN_TELEPORT_CONTROL);
    const rawAlignRecord = game.u?.ualign?.record ?? 0;
    const alignRecord = rawAlignRecord < 0 && (game.u?.ualign?.abuse ?? 0) >= 15
        ? Math.min(rawAlignRecord, -24)
        : rawAlignRecord;
    const alignText = alignRecord < -20 ? 'have transgressed'
        : alignRecord < 0 ? 'have strayed'
            : alignRecord > 0 ? 'are haltingly aligned' : 'are nominally aligned';
    const hunger = insightHungerValue(level);
    const encumbrance = heroInventoryWeightDelta();
    const prayerTimeout = game.u?.ublesscnt ?? (game.u?.uhallucination || game.u?.uprops?.hallucination ? 541 : 853);
    const luck = game.u?.uluck ?? 0;
    const debugInsight = !!game.flags?.debug;
    const lines = [
        insightAttrLine('wisdom', C.A_WIS),
        insightAttrLine('charisma', C.A_CHA),
        '',
        ' Status:',
    ];
    if (game.u?.uhallucination || game.u?.uprops?.hallucination)
        lines.push('  You are hallucinating.');
    lines.push(debugInsight ? `  You aren't hungry <${hunger}>.` : "  You aren't hungry.");
    lines.push(debugInsight ? `  You are unencumbered <${encumbrance}>.` : '  You are unencumbered.');

    if (wielded) {
        const weaponName = weaponSkillName(wielded);
        lines.push(`  You are wielding ${articleForWord(weaponName)} ${weaponName}.`);
        lines.push(`  You have ${weaponSkillLevelName(wielded)} skill with ${weaponName}.`);
    } else {
        lines.push(`  You are ${emptyHandedInsightText()}.`);
        lines.push(bareHandSkillInsightLine());
    }
    if (!wornArmor) lines.push('  You aren\'t wearing any armor.');

    if (debugInsight) {
        lines.push('', ' Attributes:');
        lines.push(`  You ${alignText}.`);
        lines.push(`  Your alignment is ${alignRecord}.`);
        if (grayDragonMail)
            lines.push('  You are magic-protected because of your gray dragon scale mail.');
        if (game.u?.uprops?.warning) lines.push('  You are warned because of your experience.');
        if (game.u?.uprops?.displaced) lines.push('  You are displaced because of your cloak of displacement.');
        if (game.u?.uprops?.teleport_control) {
            lines.push('  You have teleport control because of your experience.');
        } else if (teleRing) {
            const desc = getObjectDescription(teleRing.otyp) || 'ivory';
            lines.push(`  You have teleport control because of your ${desc} ring.`);
        }
        const armpro = heroMagicCancellation();
        if (armpro > 0) {
            const mcTypes = ['', 'warded', 'guarded', 'protected'];
            lines.push(`  You are ${mcTypes[Math.min(armpro, mcTypes.length - 1)]}.`);
        }
        if (game.u?.uprops?.fast) lines.push('  You are very fast because of your speed boots.');
        if ((game.inventory || []).some((obj) => obj?.otyp === AMULET_OF_LIFE_SAVING && obj.worn)) {
            lines.push('  Your life will be saved.');
        }
        if (luck < 0) lines.push(`  You are unlucky (${luck}).`);
        else if (luck > 0) lines.push(`  You are lucky (${luck}).`);
        else lines.push('  Your luck is zero.');
        lines.push(`  You can't safely pray (${prayerTimeout}).`);
        lines.push('', ' Miscellaneous:', '  You are running in debug mode.');
        lines.push('  You haven\'t encountered any bones levels.');
    } else {
        lines.push('', ' Miscellaneous:');
    }
    if (pages === 2) lines.push('  Total elapsed playing time is none.');
    const pageLines = lines.slice(0, MENU_ROWS_PER_PAGE);
    pageLines.push(` (2 of ${pages})`);
    return pageLines.join('\n');
}

function buildAttributesScreens() {
    if (game.urole?.name?.m === 'Wizard') {
        return { page1: wizardAttributesPage1(), page2: wizardAttributesPage2(), page3: null };
    }
    return { page1: roleAttributesPage1(), page2: roleAttributesPage2(), page3: roleAttributesPage3() };
}

function shouldAskTutorial() {
    return !game.tutorial_set_in_config
        && !game._tutorial_prompt_done
        && !game._tutorial_answered;
}

async function showTutorialPrompt(invalidChoice = false) {
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.terminal?.serialize) return;

    display.clearRow(0);
    for (let row = 1; row <= (invalidChoice ? 7 : 6); row++) {
        for (let col = 20; col < display.cols; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
    }
    display.putstr(21, 0, 'Do you want a tutorial?', NO_COLOR, ATR_INVERSE);
    display.putstr(21, 2, 'y - Yes, do a tutorial', NO_COLOR, 0);
    display.putstr(21, 3, 'n - No, just start play', NO_COLOR, 0);
    display.putstr(21, 5, 'Put "OPTIONS=!tutorial" in .nethackrc to skip this query.', NO_COLOR, 0);
    if (invalidChoice) {
        display.putstr(21, 6, "(Please choose 'y' or 'n'.)", NO_COLOR, 0);
        display.putstr(21, 7, '(end)', NO_COLOR, 0);
    } else {
        display.putstr(21, 6, '(end)', NO_COLOR, 0);
    }

    const screen = serialize_terminal_grid(display);
    game._tutorial_prompt_screen = screen;
    game._tutorial_prompt_done = true;
    showOverride(screen, invalidChoice ? [27, 7] : [27, 6]);
}

async function showPromptLine(text, options = {}) {
    await pline(text);
    const cursorPad = options.trailingInputSpace ? 1 : 0;
    game._prompt_cursor = [Math.min(text.length + cursorPad, 79), 0];
}

function screenWithPromptLine(screen, text) {
    const rows = String(screen || '').split('\n');
    while (rows.length < 24) rows.push('');
    rows[0] = text;
    return rows.slice(0, 24).join('\n');
}

async function showDrinkInventoryPrompt() {
    const letters = drinkLetters();
    if (letters) {
        const prompt = `What do you want to drink? [${letters} or ?*]`;
        await showPromptLine(prompt);
        game._prompt_cursor = [Math.min(prompt.length + 1, 79), 0];
        game._awaiting_drink_item = true;
    } else {
        // C ref: invent.c:getobj().  When inventory exists but no carried
        // object matches the drink callback, getobj() uses this wording.
        await pline("You don't have anything to drink.");
    }
}

function dlevelOf(proto, fallback) {
    const lev = game.specialLevels?.find((l) => l.proto === proto);
    return lev?.dlevel ? displayDepth(lev.dlevel) : fallback;
}

function dlevelForProto(proto) {
    const lev = game.specialLevels?.find((l) => l.proto === proto);
    return lev?.dlevel || null;
}

function isHellLevel(uz) {
    return !!game.dungeons?.[uz?.dnum ?? 0]?.flags?.hellish;
}

function monsterHasOlfaction(ptr) {
    // C ref: src/mondata.c:olfaction().
    if (!ptr) return true;
    return ![
        'S_GOLEM',
        'S_EYE',
        'S_JELLY',
        'S_PUDDING',
        'S_BLOB',
        'S_VORTEX',
        'S_ELEMENTAL',
        'S_FUNGUS',
        'S_LIGHT',
    ].includes(ptr.mlet);
}

function heroHasOlfaction() {
    const form = game.u?._poly_form;
    if (!form) return true;
    return monsterHasOlfaction(form.ptr || monsterPtr(form.name));
}

function temperatureChangeAfterLevelChange(prevTemperature, wasInHell) {
    const temperature = game.level?.flags?.temperature || 0;
    if (prevTemperature === temperature) return;
    if (temperature) {
        const smokeVerb = heroHasOlfaction() ? 'smell' : 'sense';
        return {
            line: `It is ${temperature > 0 ? 'hot' : 'cold'} here.`,
            afterMore: isHellLevel(game.u?.uz) && temperature > 0 ? `You ${smokeVerb} smoke...` : '',
        };
    }
    if (prevTemperature > 0) {
        return { line: `The heat ${wasInHell ? 'and smoke are' : 'is'} gone.` };
    }
    if (prevTemperature < 0) {
        return { line: 'You are out of the cold.' };
    }
    return null;
}

async function showTemperatureChangeMessage(tempMessage) {
    if (!tempMessage?.line) return;
    await append_pline(tempMessage.line);
    if (tempMessage.afterMore) {
        if (game._pending_message && topline_can_pack_message(game._pending_message, tempMessage.afterMore)) {
            await append_pline(tempMessage.afterMore);
        } else {
            queue_more_prompt();
            game._more_message_queue = [
                ...(game._more_message_queue || []),
                { text: tempMessage.afterMore, more: false },
            ];
        }
    }
}

const QUEST_FIRSTTIME_MESSAGES = new Map([
    ['Wizard', {
        leader: 'Neferet the Green',
        text: `You are suddenly in familiar surroundings.  You notice what appears to
be a large, squat stone structure nearby.  Wait!  That looks like the
tower of your former teacher, %l.

However, things are not the same as when you were last here.  Mists and
areas of unexplained darkness surround the tower.  There is movement in
the shadows.

Your teacher would never allow such unaesthetic forms to surround the
tower...  unless something were dreadfully wrong!`,
    }],
]);

const QUEST_GOAL_FIRST_MESSAGES = new Map([
    ['Knight', `As you exit the swamps, you %x before you a huge, gaping hole in the
side of a hill.  From within, you smell the foul stench of carrion.

The pools on either side of the entrance are fouled with blood, and
pieces of rusted metal and broken weapons show above the surface.`],
]);

function sameLevel(a, b) {
    return a?.dnum === b?.dnum && a?.dlevel === b?.dlevel;
}

async function printLevelAnnotation() {
    // C ref: dungeon.c:print_level_annotation().
    const annotation = game.level?.annotation || game.level?.customAnnotation || '';
    if (annotation) await pline(`You remember this level as ${annotation}.`);
}

function levelStateKey(uz) {
    return `${uz?.dnum ?? 0}:${uz?.dlevel ?? 1}`;
}

function punishmentObjectIsCarried(obj) {
    return !!obj && (game.inventory || []).includes(obj);
}

function unplacePunishmentObjectsForLevelChange() {
    // C ref: ball.c:unplacebc(), do.c:goto_level().  Ball and chain are
    // removed before the old level is saved, then placed again after the hero
    // reaches the destination square.
    if (!game._punished || !game.uchain || !game.uball) return;
    for (const obj of [game.uchain, game.uball]) {
        if (!obj || punishmentObjectIsCarried(obj)) continue;
        const ox = obj.ox, oy = obj.oy;
        extractFloorObject(obj);
        const loc = game.level?.at(ox, oy);
        if (loc) {
            const glyph = terrain_glyph(loc, ox, oy);
            const decgfx = !!(glyph.dec ?? glyph.decgfx);
            loc.remembered_glyph = { ch: glyph.ch, color: glyph.color, decgfx };
        }
    }
}

function placePunishmentObjectsAtHero() {
    // C ref: ball.c:placebc().  The ball is placed first and the chain second,
    // so the floor object order lists the chain before the ball.
    if (!game._punished || !game.uchain || !game.uball) return;
    const x = game.u?.ux ?? 0;
    const y = game.u?.uy ?? 0;
    if (!punishmentObjectIsCarried(game.uball)) place_object(game.uball, x, y);
    place_object(game.uchain, x, y);
    newsym(x, y);
}

function saveCurrentLevelState() {
    if (!game.level || !game.u?.uz) return;
    const cache = game._saved_levels || (game._saved_levels = new Map());
    cache.set(levelStateKey(game.u.uz), {
        level: game.level,
        stairs: game.stairs || null,
        updest: game.updest ? { ...game.updest } : null,
        dndest: game.dndest ? { ...game.dndest } : null,
        specialLregions: game._special_lregions ? [...game._special_lregions] : [],
        lastSpecialProtofile: game._last_special_protofile || null,
        smeq: game.smeq ? [...game.smeq] : null,
        utrack: Array.isArray(game._utrack) ? game._utrack.map((t) => ({ ...t })) : [],
        savedMoves: game.moves || 0,
    });
}

function restoreHiderHasCeiling() {
    // C ref: dungeon.c:has_ceiling().  Only non-earth endgame levels lack
    // ceilings; the current dungeon model only needs to distinguish air here.
    return !C.Is_airlevel(game.u?.uz);
}

function restoreHiderIsCeilingHider(mon) {
    const flags1 = mon?.data?.mflags1 ?? 0;
    return !!(flags1 & M1_HIDE)
        && (((flags1 & M1_CLING) && mon?.data?.mlet !== 'S_MIMIC')
            || !!(flags1 & M1_FLY));
}

function restoreHiderTrapBlocks(mon) {
    if (!mon?.mtrapped) return false;
    const trap = (game.level?.traps || []).find((ttmp) => ttmp.tx === mon.mx && ttmp.ty === mon.my);
    return !!trap && !C.is_pit(trap.ttyp);
}

function restoreRestrap(mon) {
    // C ref: mon.c:restrap().  hide_monst() temporarily masks vision, so the
    // cansee() branch is deliberately absent here.
    if (!mon || mon.mcan || mon.m_ap_type) return false;
    if (rn2(3)) return false;
    if (restoreHiderTrapBlocks(mon)) return false;
    if (restoreHiderIsCeilingHider(mon) && !restoreHiderHasCeiling()) return false;
    if (mon.data?.mlet === 'S_MIMIC') return false;
    if (game.level?.at(mon.mx, mon.my)?.typ === C.ROOM) {
        mon.mundetected = 1;
        return true;
    }
    return false;
}

function restoreHideUnder(mon) {
    const flags1 = mon?.data?.mflags1 ?? 0;
    if (mon?.data?.mlet === 'S_EEL') {
        if (C.IS_POOL(game.level?.at(mon.mx, mon.my)?.typ)) mon.mundetected = 1;
        return;
    }
    if (!(flags1 & M1_CONCEAL)) return;
    const obj = (game.level?.objects || []).find((item) => item.ox === mon.mx && item.oy === mon.my);
    if (obj && !restoreHiderTrapBlocks(mon)) mon.mundetected = 1;
}

function restoreHideMonst(mon) {
    // C ref: restore.c:getlev() -> mon.c:hide_monst().
    const flags1 = mon?.data?.mflags1 ?? 0;
    const hiderUnder = !!(flags1 & M1_CONCEAL) || mon?.data?.mlet === 'S_EEL';
    if (!((flags1 & M1_HIDE) || hiderUnder) || mon.mundetected || mon.m_ap_type) return;
    if (flags1 & M1_HIDE) restoreRestrap(mon);
    if (mon.data?.mlet === 'S_MIMIC' && !mon.m_ap_type) restoreRestrap(mon);
    if (hiderUnder) restoreHideUnder(mon);
}

function restoreCachedLevelState(uz) {
    const saved = game._saved_levels?.get(levelStateKey(uz));
    if (!saved) return false;
    game.level = saved.level;
    game.stairs = saved.stairs || null;
    game.updest = saved.updest ? { ...saved.updest } : null;
    game.dndest = saved.dndest ? { ...saved.dndest } : null;
    game._special_lregions = saved.specialLregions ? [...saved.specialLregions] : [];
    game._last_special_protofile = saved.lastSpecialProtofile || null;
    game.smeq = saved.smeq ? [...saved.smeq] : game.smeq;
    game._utrack = Array.isArray(saved.utrack) ? saved.utrack.map((t) => ({ ...t })) : [];
    const elapsed = (game.moves || 0) - (saved.savedMoves || 0);
    if (elapsed > 0) {
        // C ref: restore.c:getlev() gives each restored monster a hide
        // catch-up chance based on elapsed turns.
        for (const mon of game.level?.monsters || []) {
            if (mon && elapsed > rnd(10)) restoreHideMonst(mon);
        }
    }
    return true;
}

function isQuestStartLevel(uz) {
    return game.quest_dnum != null
        && uz?.dnum === game.quest_dnum
        && (isSpecialProtoLevel(uz, 'x-strt') || game._last_special_protofile === 'x-strt');
}

function isQuestGoalLevel(uz) {
    return game.quest_dnum != null
        && uz?.dnum === game.quest_dnum
        && (isSpecialProtoLevel(uz, 'x-goal') || game._last_special_protofile === 'x-goal');
}

function okToQuestBasic() {
    const qstat = game.quest_status || {};
    return !!(qstat.got_quest || qstat.got_thanks || qstat.killed_leader);
}

function blocksQuestDescent(oldUz, newUz) {
    // C ref: do.c:goto_level().  Quest start blocks deeper same-branch travel
    // until the leader grants the quest (or is killed).
    return isQuestStartLevel(oldUz)
        && game.quest_dnum != null
        && newUz?.dnum === game.quest_dnum
        && newUz.dlevel > oldUz.dlevel
        && !okToQuestBasic();
}

function renderMorePagerScreen(text) {
    const lines = String(text || '').replace(/\n+$/, '').split('\n');
    while (lines.length < C.TERMINAL_ROWS - 1) lines.push('');
    lines.length = C.TERMINAL_ROWS - 1;
    lines.push('--More--');
    return lines.join('\n');
}

function questStartPagerText(oldUz) {
    // C ref: do.c:goto_level() -> quest.c:onquest() -> on_start().
    // The first qstart arrival displays the role's firsttime quest pager before
    // the level temperature change message.
    const uz = game.u?.uz;
    if (game.u?.uevent?.qcompleted || sameLevel(oldUz, uz) || !isQuestStartLevel(uz)) return null;
    const qstat = game.quest_status || (game.quest_status = {});
    if (qstat.first_start) return null;
    const role = QUEST_FIRSTTIME_MESSAGES.get(game.urole?.name?.m);
    if (!role) return null;
    // C ref: quest.c:on_start() -> questpgr.c:qt_pager(); loading
    // quest.lua also loads nhlib.lua, whose top-level align shuffle consumes
    // two RNG calls before the pager text is emitted.
    rn2(3); rn2(2);
    qstat.first_start = true;
    return role.text.replaceAll('%l', role.leader);
}

function questLocateMessage(oldUz) {
    // C ref: quest.c:on_locate() -> questpgr.c:qt_pager().
    const uz = game.u?.uz;
    if (!isSpecialProtoLevel(uz, 'x-loca')) return null;
    const qstat = game.quest_status || (game.quest_status = {});
    const first = !qstat.first_locate;
    const fromAbove = (oldUz?.dlevel ?? 0) < (uz?.dlevel ?? 0);
    qstat.first_locate = true;
    if (!fromAbove) return null;
    if (game.urole?.name?.m === 'Wizard') {
        // C ref: quest.c:on_locate() -> questpgr.c:qt_pager(); loading
        // quest.lua pulls in nhlib.lua and consumes the top-level shuffle.
        rn2(3); rn2(2);
        return first
            ? "Wisps of fog swirl nearby.  You feel that the Dark One's lair is close."
            : "You believe that you may once again invade the Dark One's lair.";
    }
    return null;
}

function questGoalPagerText(oldUz) {
    // C ref: quest.c:on_goal() -> questpgr.c:qt_pager("goal_first").
    const uz = game.u?.uz;
    if (game.u?.uevent?.qcompleted || sameLevel(oldUz, uz) || !isQuestGoalLevel(uz)) return null;
    const qstat = game.quest_status || (game.quest_status = {});
    if (qstat.killed_nemesis || qstat.made_goal) return null;
    const text = QUEST_GOAL_FIRST_MESSAGES.get(game.urole?.name?.m);
    if (!text) return null;
    // quest.lua loads nhlib.lua before delivering the first quest pager.
    rn2(3); rn2(2);
    qstat.made_goal = 1;
    const senseVerb = game.u?.ublind || game.u?.uprops?.blind ? 'sense' : 'see';
    return text.replaceAll('%x', senseVerb);
}

function queuePostArrivalPager(text) {
    if (!text) return false;
    const screen = renderMorePagerScreen(text);
    const cursor = [8, C.TERMINAL_ROWS - 1];
    if (!game._pending_message && !game._more && !(game._more_message_queue || []).length) {
        game._post_arrival_pager_screen = null;
        game._post_arrival_pager_cursor = null;
        game._post_arrival_pager_active = true;
        showSerializedOverride(screen, cursor);
        queue_more_prompt();
        return true;
    }
    game._post_arrival_pager_screen = screen;
    game._post_arrival_pager_cursor = cursor;
    queue_more_prompt();
    return true;
}

function isSpecialProtoLevel(uz, proto) {
    return !!game.specialLevels?.some((lev) =>
        lev?.proto === proto
        && lev?.dlevel?.dnum === uz?.dnum
        && lev?.dlevel?.dlevel === uz?.dlevel);
}

function displayDepth(dlevel) {
    const dun = game.dungeons?.[dlevel?.dnum ?? 0];
    return (dun?.depth_start ?? 1) + (dlevel?.dlevel ?? 1) - 1;
}

function findHellLevelFromCurrentDungeon() {
    // C ref: teleport.c:level_tele() -> dungeon.c:find_hell().
    const hellDnum = game.dungeons?.findIndex((d) => d?.flags?.hellish);
    if (hellDnum == null || hellDnum < 0) return null;
    const branch = game.branches?.find((br) => br.end2?.dnum === hellDnum);
    return branch?.end2 ? { ...branch.end2 } : { dnum: hellDnum, dlevel: 1 };
}

function levelTeleportDepthTarget(depth, oldUz = game.u?.uz) {
    // C refs: teleport.c:level_tele(), dungeon.c:get_level().
    const uz = oldUz || { dnum: 0, dlevel: 1 };
    let dnum = uz.dnum ?? 0;
    const curDungeon = game.dungeons?.[dnum];
    const curStart = curDungeon?.depth_start ?? 1;
    const curCount = curDungeon?.num_dunlevs ?? curDungeon?.dunlev_ureached ?? 1;
    // C ref: teleport.c:level_tele().  In the Quest branch, the prompt uses
    // status-line numbers ("Home 1", "Home 2", ...), so positive numeric
    // requests are translated back to logical dungeon depth before get_level().
    if (game.quest_dnum != null && dnum === game.quest_dnum && depth > 0)
        depth += curStart - 1;

    if (game.medusa_level?.dnum === dnum && depth >= curStart + curCount) {
        return findHellLevelFromCurrentDungeon() || { dnum, dlevel: curCount };
    }

    if (depth > curStart + curCount - 1) return { dnum, dlevel: curCount };
    if (depth < curStart) {
        while (true) {
            const branch = game.branches?.find((br) => br.end2?.dnum === dnum);
            if (!branch) break;
            dnum = branch.end1?.dnum ?? dnum;
            const parent = game.dungeons?.[dnum];
            if (depth >= (parent?.depth_start ?? 1)) break;
        }
    }
    const dungeon = game.dungeons?.[dnum];
    return {
        dnum,
        dlevel: Math.max(1, depth - ((dungeon?.depth_start ?? 1) - 1)),
    };
}

function currentLevelMarker(dlevel) {
    return game.u?.uz?.dnum === dlevel?.dnum && game.u?.uz?.dlevel === dlevel?.dlevel ? '*' : ' ';
}

function branchFromDoom(dname, fallback) {
    const dnum = game.dungeons?.findIndex((d) => d.dname === dname);
    if (dnum < 0) return fallback;
    const branch = game.branches?.find((br) => br.end1?.dnum === 0 && br.end2?.dnum === dnum);
    return branch?.end1 ? displayDepth(branch.end1) : fallback;
}

function branchFromDoomLevel(dname) {
    const dnum = game.dungeons?.findIndex((d) => d.dname === dname);
    if (dnum < 0) return null;
    const branch = game.branches?.find((br) => br.end1?.dnum === 0 && br.end2?.dnum === dnum);
    return branch?.end1 || null;
}

function branchEntranceDepth(dname, fallback) {
    const dnum = game.dungeons?.findIndex((d) => d.dname === dname);
    if (dnum < 0) return fallback;
    const branch = game.branches?.find((br) => br.end2?.dnum === dnum);
    return branch?.end1 ? displayDepth(branch.end1) : fallback;
}

function branchEntranceLevel(dname) {
    const dnum = game.dungeons?.findIndex((d) => d.dname === dname);
    if (dnum < 0) return null;
    const branch = game.branches?.find((br) => br.end2?.dnum === dnum);
    return branch?.end1 || null;
}

function dungeonByName(dname) {
    return game.dungeons?.find((d) => d?.dname === dname) || null;
}

function dungeonHeaderLine(dname, fallbackStart, fallbackCount, options = {}) {
    const dungeon = dungeonByName(dname);
    const start = dungeon?.depth_start ?? fallbackStart;
    const count = dungeon?.num_dunlevs ?? fallbackCount;
    const end = start + count - 1;
    let line = count > 1
        ? `${dname}: levels ${start} to ${end}`
        : `${dname}: level ${start}`;
    if (options.entryFromBelow) line += ', entrance from below';
    else if (options.entryOn != null) line += `, entrance on ${options.entryOn}`;
    return line;
}

function wizWhereSpecialLine(proto, fallback, label = proto) {
    return `  ${label}: ${dlevelOf(proto, fallback)}`;
}

function roleFileCodeForDungeon() {
    if (game.urole?.filecode) return game.urole.filecode;
    const name = game.urole?.name?.m || game.urole?.name?.f || game._nhopts?.role || '';
    return {
        Archeologist: 'Arc', Barbarian: 'Bar', Caveman: 'Cav',
        Healer: 'Hea', Knight: 'Kni', Monk: 'Mon', Priest: 'Pri',
        Ranger: 'Ran', Rogue: 'Rog', Samurai: 'Sam', Tourist: 'Tou',
        Valkyrie: 'Val', Wizard: 'Wiz',
    }[name] || String(name || 'Adv').slice(0, 3);
}

function showWizWhereScreen() {
    // C refs: src/wizcmds.c:wiz_where(), src/dungeon.c:print_dungeon(FALSE).
    const doomMax = game.dungeons?.[0]?.num_dunlevs ?? 26;
    const geh = dungeonByName('Gehennom');
    const gehStart = geh?.depth_start ?? 27;
    const gehEnd = geh ? geh.depth_start + geh.num_dunlevs - 1 : 48;
    const roleCode = roleFileCodeForDungeon();
    const tune = game.castle_tune?.join('') || '?????';
    const lines = [
        dungeonHeaderLine('The Dungeons of Doom', 1, doomMax),
        `  One way stair to The Elemental Planes: ${branchEntranceDepth('The Elemental Planes', 1)}`,
        `  Stair to The Gnomish Mines: ${branchFromDoom('The Gnomish Mines', 4)}`,
        wizWhereSpecialLine('oracle', 5),
        `  Stair to Sokoban: ${branchFromDoom('Sokoban', 6)}`,
        `  Portal to The Quest: ${branchFromDoom('The Quest', 12)}`,
        wizWhereSpecialLine('bigrm', 12),
        wizWhereSpecialLine('rogue', 16),
        `  Portal to Fort Ludios: ${branchFromDoom('Fort Ludios', 20)}`,
        wizWhereSpecialLine('medusa', 24),
        `  Connection to Gehennom: ${branchFromDoom('Gehennom', doomMax)}`,
        `  castle: ${dlevelOf('castle', doomMax)} (tune ${tune})`,
        `Gehennom: levels ${gehStart} to ${gehEnd}`,
        wizWhereSpecialLine('valley', gehStart),
        wizWhereSpecialLine('asmodeus', gehStart + 3),
        wizWhereSpecialLine('juiblex', gehStart + 4),
        wizWhereSpecialLine('baalz', gehStart + 7),
        wizWhereSpecialLine('orcus', gehStart + 10),
        `  Stair to Vlad's Tower: ${branchEntranceDepth("Vlad's Tower", gehStart + 11)}`,
        wizWhereSpecialLine('wizard1', gehStart + 14),
        wizWhereSpecialLine('wizard2', gehStart + 15),
        wizWhereSpecialLine('wizard3', gehStart + 16),
        wizWhereSpecialLine('fakewiz1', gehStart + 17),
        wizWhereSpecialLine('fakewiz2', gehStart + 19),
        wizWhereSpecialLine('sanctum', gehEnd),
        dungeonHeaderLine('The Gnomish Mines', 5, 8),
        wizWhereSpecialLine('minetn', 8),
        wizWhereSpecialLine('minend', 12),
        dungeonHeaderLine('The Quest', 12, 5),
        wizWhereSpecialLine('x-strt', 12, `${roleCode}-strt`),
        wizWhereSpecialLine('x-loca', 14, `${roleCode}-loca`),
        wizWhereSpecialLine('x-goal', 16, `${roleCode}-goal`),
        dungeonHeaderLine('Sokoban', 2, 4, { entryFromBelow: true }),
        wizWhereSpecialLine('soko1', 2),
        wizWhereSpecialLine('soko2', 3),
        wizWhereSpecialLine('soko3', 4),
        wizWhereSpecialLine('soko4', 5),
        dungeonHeaderLine('Fort Ludios', 19, 1),
        wizWhereSpecialLine('knox', 19),
        dungeonHeaderLine("Vlad's Tower", 35, 3, { entryFromBelow: true }),
        wizWhereSpecialLine('tower1', 35),
        wizWhereSpecialLine('tower2', 36),
        wizWhereSpecialLine('tower3', 37),
        dungeonHeaderLine('The Elemental Planes', -5, 6, { entryOn: -1 }),
        wizWhereSpecialLine('astral', -5),
        wizWhereSpecialLine('water', -4),
        wizWhereSpecialLine('fire', -3),
        wizWhereSpecialLine('air', -2),
        wizWhereSpecialLine('earth', -1),
        wizWhereSpecialLine('dummy', 0),
        dungeonHeaderLine('The Tutorial', 1, 2),
        wizWhereSpecialLine('tut-1', 1),
        wizWhereSpecialLine('tut-2', 2),
    ];
    showHelpTextLines(lines, { morePrompt: ' --More--', compactFinalMore: true });
    game.context.move = 0;
}

function targetForProto(proto, fallback) {
    const lev = game.specialLevels?.find((l) => l.proto === proto);
    return lev?.dlevel ? { ...lev.dlevel } : fallback;
}

function levelTeleportMenuLetter(idx) {
    if (idx < 26) return String.fromCharCode('a'.charCodeAt(0) + idx);
    return String.fromCharCode('A'.charCodeAt(0) + idx - 26);
}

function levelTeleportBranchString(br) {
    // C ref: src/dungeon.c:br_string().
    if (br?.type === 'portal') return 'Portal';
    if (br?.type === 'stair') return 'Stair';
    if (br?.type === 'no_down') return br.end1_up ? 'One way stair' : 'Connection';
    if (br?.type === 'no_up') return br.end1_up ? 'Connection' : 'One way stair';
    return ' (unknown)';
}

function levelTeleportUnplacedFloater(dnum) {
    // C ref: src/dungeon.c:unplaced_floater().
    const knox = game.specialLevels?.find((lev) => lev?.proto === 'knox');
    if (knox?.dlevel?.dnum !== dnum) return false;
    const floatingDnum = game.dungeons?.length ?? 0;
    return !!game.branches?.some((br) =>
        br?.end1?.dnum === floatingDnum && br?.end2?.dnum === dnum);
}

function levelTeleportCannotReach(dlevel, unplaced) {
    // C ref: src/dungeon.c:unreachable_level().
    if (unplaced) return true;
    if (C.In_endgame?.(game.u?.uz) && !C.In_endgame?.(dlevel)) return true;
    return isSpecialProtoLevel(dlevel, 'dummy');
}

function levelTeleportDungeonHeading(dungeon, unplaced) {
    const descr = unplaced ? 'depth' : 'level';
    const count = dungeon?.num_dunlevs ?? 1;
    const start = dungeon?.depth_start ?? 1;
    let line = count > 1
        ? `${dungeon?.dname ?? ''}: ${descr}s ${start} to ${start + count - 1}`
        : `${dungeon?.dname ?? ''}: ${descr} ${start}`;
    const entry = dungeon?.entry_lev ?? 1;
    if (entry !== 1) {
        if (entry === count) line += ', entrance from below';
        else line += `, entrance on ${start + entry - 1}`;
    }
    return line;
}

function levelTeleportSpecialLabel(proto) {
    if (String(proto).startsWith('x-')) {
        return `${roleFileCodeForDungeon()}-${String(proto).slice(2)}`;
    }
    return proto;
}

function levelTeleportSpecialText(slev) {
    const label = levelTeleportSpecialLabel(slev?.proto || '');
    let text = `${label}: ${displayDepth(slev?.dlevel)}`;
    if (slev?.proto === 'castle' || sameLevel(slev?.dlevel, game.stronghold_level)) {
        text += ` (tune ${game.castle_tune?.join('') || '?????'})`;
    }
    return text;
}

function buildLevelTeleportRows() {
    // C ref: src/dungeon.c:print_dungeon(TRUE), print_branch(), tport_menu().
    const rows = [];
    const dungeons = game.dungeons || [];
    const branches = game.branches || [];
    let menuIndex = 0;
    const addItem = (text, target, cannotReach = false) => {
        rows.push({
            type: 'item',
            text,
            target: target ? { ...target } : null,
            cannotReach,
            letter: levelTeleportMenuLetter(menuIndex),
        });
        menuIndex++;
    };
    const addBranches = (dnum, lowerBound, upperBound) => {
        for (const br of branches) {
            const end1 = br?.end1;
            if (end1?.dnum !== dnum) continue;
            if (!(lowerBound < end1.dlevel && end1.dlevel <= upperBound)) continue;
            const childName = dungeons[br?.end2?.dnum]?.dname || '';
            addItem(`${levelTeleportBranchString(br)} to ${childName}: ${displayDepth(end1)}`,
                end1, levelTeleportCannotReach(end1, false));
        }
    };

    for (let dnum = 0; dnum < dungeons.length; dnum++) {
        if (C.In_endgame?.(game.u?.uz) && game.astral_level?.dnum !== dnum) continue;
        const dungeon = dungeons[dnum];
        const unplaced = levelTeleportUnplacedFloater(dnum);
        rows.push({ type: 'heading', text: levelTeleportDungeonHeading(dungeon, unplaced) });
        const specials = (game.specialLevels || [])
            .map((lev, index) => ({ lev, index }))
            .filter(({ lev }) => lev?.dlevel?.dnum === dnum)
            .sort((a, b) =>
                (a.lev.dlevel.dlevel - b.lev.dlevel.dlevel) || (a.index - b.index));
        let lastLevel = 0;
        for (const { lev } of specials) {
            addBranches(dnum, lastLevel, lev.dlevel.dlevel);
            addItem(levelTeleportSpecialText(lev), lev.dlevel,
                levelTeleportCannotReach(lev.dlevel, unplaced));
            lastLevel = lev.dlevel.dlevel;
        }
        addBranches(dnum, lastLevel, C.MAXLEVEL ?? 255);
    }
    return rows;
}

function renderLevelTeleportPage(pageIndex) {
    const rows = buildLevelTeleportRows();
    const firstPageRows = 21;
    const nextPageRows = 23;
    const totalPages = rows.length <= firstPageRows
        ? 1
        : 1 + Math.ceil((rows.length - firstPageRows) / nextPageRows);
    const start = pageIndex === 0
        ? 0
        : firstPageRows + ((pageIndex - 1) * nextPageRows);
    const limit = pageIndex === 0 ? firstPageRows : nextPageRows;
    const pageRows = rows.slice(start, start + limit);
    const lines = [];
    const choices = {};
    if (pageIndex === 0) {
        lines.push(' \x1b[7mLevel teleport to where:\x1b[0m');
        lines.push('');
    }
    for (const row of pageRows) {
        if (row.type === 'heading') {
            lines.push(` \x1b[7m${row.text}\x1b[0m`);
        } else if (row.cannotReach) {
            lines.push(`     ${currentLevelMarker(row.target)} ${row.text}`);
        } else {
            lines.push(` ${row.letter} - ${currentLevelMarker(row.target)} ${row.text}`);
            choices[row.letter] = row.target;
        }
    }
    lines.push(` (${pageIndex + 1} of ${totalPages})`);
    return {
        screen: lines.join('\n'),
        choices,
        pageIndex,
        totalPages,
        hasPage: pageIndex < totalPages,
    };
}

function buildLevelTeleportMenu() {
    return renderLevelTeleportPage(0);
}

function buildLevelTeleportMenuPage2() {
    return renderLevelTeleportPage(1);
}

function buildLevelTeleportMenuPage3() {
    return renderLevelTeleportPage(2);
}

function appendLevelchangeTopline(line, msg) {
    if (!line) return msg;
    const candidate = `${line}  ${msg}`;
    return candidate.length + LEVELCHANGE_MORE_LEN <= 80 ? candidate : null;
}

function applyLevelchangeInnates(oldLevel, newLevel) {
    const uprops = game.u.uprops = game.u.uprops || {};
    const roleName = game.urole?.name?.m;
    const raceName = String(game.urace?.name || game._nhopts?.race || '').toLowerCase();
    const abilities = [
        ...(ROLE_INNATE_ABILITIES.get(roleName) || []),
        ...(RACE_INNATE_ABILITIES.get(raceName) || []),
    ];
    const messages = [];
    for (const ability of abilities) {
        if (!(oldLevel < ability.level && newLevel >= ability.level)) continue;
        const alreadyIntrinsic = !!uprops[ability.prop];
        uprops[ability.prop] = true;
        if (!alreadyIntrinsic && ability.gain) messages.push(`You feel ${ability.gain}!`);
    }
    return messages;
}

function enqueueLevelchangePostMessages(oldLevel, newLevel) {
    const queue = game._levelchange_message_queue = game._levelchange_message_queue || [];
    queue.push(`Welcome to experience level ${newLevel}.`);
    queue.push(...applyLevelchangeInnates(oldLevel, newLevel));
}

function monNearBasic(mon, x, y) {
    return dist2(mon?.mx ?? 0, mon?.my ?? 0, x, y) < 3;
}

function levelFollowerBasic(mon) {
    if (!mon || mon.dead || mon.mhp <= 0) return false;
    if (mon.mtame || mon.iswiz) return true;
    return !!(mon.data?.mflags2 & M2_STALK) && (!mon.mflee || game.u?.uhave?.amulet);
}

function cloneMigratingMonster(mon) {
    return {
        ...mon,
        data: mon.data ? { ...mon.data } : mon.data,
        edog: mon.edog ? { ...mon.edog } : mon.edog,
        inventory: mon.inventory ? mon.inventory.map((obj) => ({ ...obj })) : mon.inventory,
    };
}

function stairDescentFalls() {
    if (game.u?.uprops?.flying) return false;
    return (game.u?.uencumber || 0) > 0 || !!game._punished || !!game.u?.uprops?.fumbling;
}

function stairArrivalMessage(options, goingUp) {
    if (!options?.atStairs) return null;
    const ladder = !!options.ladder;
    if (goingUp) {
        // C ref: do.c:goto_level().  Climbing up while punished and not
        // levitating uses the "With great effort" prefix.
        const greatEffort = !!game._punished && !game.u?.uprops?.levitation;
        const locomotion = game.u?.uprops?.flying ? 'fly' : 'climb';
        const subject = greatEffort ? 'With great effort, you' : 'You';
        return `${subject} ${locomotion} up${ladder && game.u?.uprops?.flying ? ' along' : ''} the ${ladder ? 'ladder' : 'stairs'}.`;
    }
    if (stairDescentFalls()) return `You fall down the ${ladder ? 'ladder' : 'stairs'}.`;
    return `You ${ladder ? 'climb down the ladder' : 'descend the stairs'}.`;
}

function stairwayAt(x, y) {
    for (let stway = game.stairs; stway; stway = stway.next)
        if (stway.sx === x && stway.sy === y) return stway;
    return null;
}

function stairwayFindFrom(dlev, isladder) {
    for (let stway = game.stairs; stway; stway = stway.next) {
        if (stway.tolev?.dnum === dlev?.dnum
            && stway.tolev?.dlevel === dlev?.dlevel
            && !!stway.isladder === !!isladder) return stway;
    }
    return null;
}

function markCurrentStairTraversed() {
    // C refs: dungeon.c:next_level(), dungeon.c:prev_level().
    const stway = stairwayAt(game.u?.ux, game.u?.uy);
    if (stway) stway.u_traversed = true;
}

function placeOnArrivalStairFrom(oldUz, isladder) {
    // C ref: do.c:goto_level() uses stairway_find_from(&u.uz0) on arrival
    // and marks the matching destination stair as traversed.
    const stway = stairwayFindFrom(oldUz, isladder);
    if (!stway) return false;
    game.u.ux = stway.sx;
    game.u.uy = stway.sy;
    stway.u_traversed = true;
    return true;
}

const WAIL_POWER_KEYS = [
    'teleporting', 'teleport', 'see_invisible', 'poison_resistance',
    'cold_resistance', 'shock_resistance', 'fire_resistance',
    'sleep_resistance', 'disintegration_resistance', 'teleport_control',
    'stealth', 'fast', 'intrinsic_fast', 'invisible',
];

function hasWailPowerIntrinsic(key) {
    const value = game.u?.uprops?.[key];
    if (typeof value === 'number') return value > 0;
    return !!value;
}

function heroIsElfRace() {
    const race = String(game.urace?.name || game.urace?.noun || game.urace?.adj || game._nhopts?.race || '').toLowerCase();
    return race === 'elf' || race === 'elven';
}

function latchBlankToplineMore(line) {
    game._latched_more_screen = `${line}--More--`;
    game._latched_more_cursor = [Math.min(line.length + '--More--'.length, 79), 0, 1];
    game._latched_more_keep_until_dismiss = true;
}

async function maybeWailAfterHpLoss(damage) {
    // C ref: hack.c:losehp(), hack.c:maybe_wail().
    if (damage <= 0) return false;
    const hp = game.u?.uhp;
    const hpmax = game.u?.uhpmax;
    if (typeof hp !== 'number' || typeof hpmax !== 'number') return false;
    if (hp <= 0 || hp * 10 >= hpmax) return false;
    const moves = game.moves || 0;
    const lastWail = typeof game._wailmsg === 'number' ? game._wailmsg : 0;
    if (moves <= lastWail + 50) return false;
    game._wailmsg = moves;

    const roleName = game.urole?.name?.m || '';
    let line;
    if (roleName === 'Wizard' || roleName === 'Valkyrie' || heroIsElfRace()) {
        const who = roleName === 'Wizard' || roleName === 'Valkyrie' ? roleName : 'Elf';
        if (hp === 1) line = `${who} is about to die.`;
        else {
            const powerCount = WAIL_POWER_KEYS.reduce((count, key) =>
                count + (hasWailPowerIntrinsic(key) ? 1 : 0), 0);
            line = powerCount >= 4
                ? `${who}, all your powers will be lost...`
                : `${who}, your life force is running out.`;
        }
    } else {
        line = hp === 1
            ? 'You hear the wailing of the Banshee...'
            : 'You hear the howling of the CwnAnnwn...';
    }
    await pline(line);
    if (game._stair_drag_blank_screen_after_more) {
        latchBlankToplineMore(line);
        game._stair_drag_blank_screen_after_more = false;
    }
    queue_more_prompt();
    return true;
}

async function applyStairFallDamage(options, goingUp) {
    if (!options?.atStairs || goingUp || !stairDescentFalls()) return false;
    // C ref: do.c:goto_level().  Burdened, punished, or fumbling stair
    // descent tumbles the hero for rnd(3) damage after destination placement.
    const damage = rnd(3);
    if (typeof game.u?.uhp === 'number') game.u.uhp = Math.max(0, game.u.uhp - damage);
    return maybeWailAfterHpLoss(damage);
}

async function applyPunishedStairDragDown() {
    // C ref: ball.c:drag_down().  Falling down stairs while punished clears
    // the old map, then the ball may hit or drag the hero before ordinary
    // stair-fall damage is applied.
    if (!game._punished || !game.uball) return false;
    const ball = game.uball;
    const carried = punishmentObjectIsCarried(ball);
    const wielded = heroWieldedWeapon();
    const wieldingBall = wielded === ball || !!((ball.owornmask || 0) & C.W_WEP);
    const forward = carried && (wieldingBall || !wielded || !rn2(3));
    await cls();
    game._stair_drag_blank_screen_after_more = true;
    if (forward) {
        if (!rn2(6)) return false;
        const line = 'The iron ball drags you downstairs!';
        await pline(line);
        if (typeof game.u?.uhp === 'number') game.u.uhp = Math.max(0, game.u.uhp - rnd(6));
        latchBlankToplineMore(line);
    } else {
        let dragchance = 3;
        let line = '';
        if (rn2(2)) {
            line = 'The iron ball smacks into you!';
            await pline(line);
            if (typeof game.u?.uhp === 'number') game.u.uhp = Math.max(0, game.u.uhp - rnd(20));
            exercise(A_STR, false);
            dragchance -= 2;
        }
        if (dragchance >= rnd(6)) {
            if (!line) {
                line = 'The iron ball drags you downstairs!';
                await pline(line);
            }
            if (typeof game.u?.uhp === 'number') game.u.uhp = Math.max(0, game.u.uhp - rnd(3));
            exercise(A_STR, false);
        }
        if (!line) return false;
        latchBlankToplineMore(line);
    }
    queue_more_prompt();
    return true;
}

async function finishDeferredStairArrivalEffects() {
    const effects = game._stair_arrival_effects_after_more;
    if (!effects) return false;
    game._stair_arrival_effects_after_more = null;
    if (!effects.goingUp && stairDescentFalls() && game._punished) {
        const blocked = await applyPunishedStairDragDown();
        if (blocked) {
            game._stair_fall_damage_after_more = effects;
            return true;
        }
    }
    const warned = await applyStairFallDamage(effects.options, effects.goingUp);
    if (warned) {
        if (effects.deferPetArrival) game._stair_pet_arrival_after_more = true;
        return true;
    }
    if (effects.deferPetArrival) pet_arrive_with_you();
    game._stair_drag_blank_screen_after_more = false;
    return false;
}

function finishDeferredStairPetArrival() {
    if (!game._stair_pet_arrival_after_more) return;
    game._stair_pet_arrival_after_more = false;
    pet_arrive_with_you();
}

function randomTeleportLevelForHero() {
    // C ref: teleport.c:random_teleport_level().  This covers ordinary
    // Dungeons-of-Doom level teleport ranges; special branches can extend it
    // when sessions reach them.
    const curDepth = displayDepth(game.u?.uz);
    if (!rn2(5)) return { ...(game.u?.uz || { dnum: 0, dlevel: 1 }) };
    const minDepth = 1;
    const dun = game.dungeons?.[game.u?.uz?.dnum ?? 0];
    const maxDepth = (dun?.num_dunlevs || dun?.dunlev_ureached || 30) + ((dun?.depth_start || 1) - 1);
    let newDepth = rn2(Math.max(1, curDepth + 3 - minDepth)) + minDepth;
    if (newDepth >= curDepth) newDepth++;
    if (newDepth > maxDepth) newDepth = maxDepth;
    if (newDepth < minDepth) newDepth = minDepth;
    return {
        dnum: game.u?.uz?.dnum ?? 0,
        dlevel: Math.max(1, newDepth - ((dun?.depth_start || 1) - 1)),
    };
}

async function finishPendingStairArrivalRedraw() {
    if (!game._stair_arrival_redraw_pending) return;
    game._stair_arrival_redraw_pending = false;
    vision_reset();
    vision_recalc(2);
    vision_recalc(0);
    see_monsters();
    await docrt();
    if (game.u?.uhallucination || game.u?.uprops?.hallucination) see_objects();
    game.context.mv = 1;
}

export async function performLevelTeleport(target, options = {}) {
    const oldUz = { ...(game.u?.uz || { dnum: 0, dlevel: 1 }) };
    const newUz = typeof target === 'object' && target
        ? { ...target }
        : levelTeleportDepthTarget(Number(target || 0), oldUz);
    // C ref: do.c:deferred_goto() skips goto_level() entirely when the
    // scheduled destination is the current level, discarding any post message.
    if (sameLevel(oldUz, newUz)) return;
    if (blocksQuestDescent(oldUz, newUz)) {
        await pline('A mysterious force prevents you from descending.');
        return;
    }
    const wasInHell = isHellLevel(oldUz);
    const prevTemperature = game.level?.flags?.temperature || 0;
    const preChangeScreen = options?.atStairs ? serialize_terminal_grid(game.nhDisplay) : '';
    if (options?.atStairs) markCurrentStairTraversed();
    const followers = (game.level?.monsters || [])
        .filter((mon) => monNearBasic(mon, game.u?.ux ?? mon.mx, game.u?.uy ?? mon.my)
            && levelFollowerBasic(mon));
    game._migrating_followers = followers.map(cloneMigratingMonster);
    game._migrating_pet = game._migrating_followers[0] || null;
    if (followers.length && game.level?.monsters) {
        const migratingSet = new Set(followers);
        game.level.monsters = game.level.monsters.filter((mon) => !migratingSet.has(mon));
    }
    // C ref: do.c:goto_level() shuts down old-level vision with
    // vision_recalc(2) immediately before savelev(); display.c:display_warning()
    // still randomizes warning glyphs while Hallucination is active.
    const prevWarningRng = game._hallucination_warning_rng_active;
    game._hallucination_warning_rng_active = true;
    try {
        vision_recalc(2);
    } finally {
        game._hallucination_warning_rng_active = prevWarningRng;
    }
    unplacePunishmentObjectsForLevelChange();
    saveCurrentLevelState();
    game.u.uz = newUz;
    const restoredLevel = restoreCachedLevelState(newUz);
    if (!restoredLevel) {
        const mklevResult = await mklev();
        if (mklevResult === 'bones-prompt') {
            game._pending_level_teleport_after_bones = {
                oldUz,
                options,
                wasInHell,
                prevTemperature,
                preChangeScreen,
                restoredLevel: false,
            };
            const msg = 'Get bones? [yn] (n)';
            await showPromptLine(msg);
            game._prompt_cursor = [msg.length + 1, 0];
            game._bones_get_prompt_active = true;
            return;
        }
    }
    await finishLevelTeleportArrival({
        oldUz,
        options,
        wasInHell,
        prevTemperature,
        preChangeScreen,
        restoredLevel,
    });
}

async function finishLevelTeleportArrival({
    oldUz,
    options = {},
    wasInHell = false,
    prevTemperature = 0,
    preChangeScreen = '',
    restoredLevel = false,
} = {}) {
    if (!restoredLevel && game.urole?.name?.m === 'Tourist') {
        // C ref: src/do.c:goto_level().  Tourists gain experience for each
        // newly entered level, based on destination level difficulty.
        moreExperienced(level_difficulty(), 0);
    }
    const goingUp = displayDepth(game.u.uz) < displayDepth(oldUz);
    const arrivalMessage = stairArrivalMessage(options, goingUp);
    if (options?.atStairs) {
        // C refs: dungeon.c:next_level(), do.c:goto_level(), stairs.c:u_on_*().
        // Ordinary stairs land on the corresponding staircase, not in the
        // level-teleport arrival region.
        if (!placeOnArrivalStairFrom(oldUz, !!options.ladder)) {
            if (goingUp) u_on_dnstairs();
            else u_on_upstairs();
        }
    } else {
        const dest = goingUp ? game.updest : game.dndest;
        if (dest?.lx) {
            place_lregion(dest.lx, dest.ly, dest.hx, dest.hy,
                dest.nlx, dest.nly, dest.nhx, dest.nhy,
                goingUp ? LR_UPTELE : LR_DOWNTELE, null);
        } else {
            place_lregion(0, 0, 0, 0, 0, 0, 0, 0, LR_UPTELE, null);
        }
    }
    placePunishmentObjectsAtHero();
    const deferStairFallEffects = !!arrivalMessage && options?.atStairs && !goingUp && stairDescentFalls();
    if (deferStairFallEffects) {
        game._stair_arrival_effects_after_more = { options: { ...options }, goingUp, deferPetArrival: true };
    } else {
        await applyStairFallDamage(options, goingUp);
        pet_arrive_with_you();
    }
    const restoredBonesTrack = !!game._pending_bones_familiar;
    if (!restoredLevel && !restoredBonesTrack) initrack();
    recordCurrentLevelAchievements();
    let familiarBonesMessage = '';
    if (game._pending_bones_familiar) {
        game._pending_bones_familiar = false;
        // C ref: src/do.c:familiar_level_msg().
        const which = rn2(4);
        const familiar = [
            'You have a sense of deja vu.',
            "You feel like you've been here before.",
            `This place ${game.u?.ublind || game.u?.uprops?.blind ? 'seems' : 'looks'} familiar...`,
            '',
        ];
        familiarBonesMessage = familiar[which] || '';
    }
    if (arrivalMessage) {
        // C ref: do.c:goto_level().  Stair arrival messages are generated
        // before the destination level's docrt() is flushed, so the blocking
        // tty More still shows the old map while level generation and follower
        // arrival RNG have already happened.
        game._stair_arrival_redraw_pending = true;
        await pline(arrivalMessage);
        queue_more_prompt();
        if (preChangeScreen) {
            const rows = preChangeScreen.split('\n');
            rows[0] = `${arrivalMessage}--More--`;
            game._latched_more_screen = rows.join('\n');
            game._latched_more_cursor = [Math.min(arrivalMessage.length + '--More--'.length, 79), 0, 1];
            game._latched_more_keep_until_dismiss = true;
        }
        if (deferStairFallEffects && game._punished) await cls();
        if ((game.level?.objects || []).some((obj) =>
            obj.ox === game.u?.ux && obj.oy === game.u?.uy && obj.otyp !== GOLD_PIECE && obj !== game.uchain))
            game._arrival_floor_look_after_more = true;
        game._monster_turn_paused_for_more = true;
        return;
    }
    vision_reset();
    // C ref: display.c:docrt() starts with vision_recalc(2), forcing old
    // visible cells through newsym() before the level-change full redraw.
    vision_recalc(2);
    vision_recalc(0);
    // C ref: display.c:docrt_flags() overlays monsters after its full
    // vision_recalc(0).  JS restores map memory inside docrt(), after the
    // external vision pass, so keep this C monster pass before that restore
    // and let docrt() re-overlay the visible monsters afterward.
    see_monsters();
    await docrt();
    if (game.u?.uhallucination || game.u?.uprops?.hallucination) see_objects();
    // C ref: src/teleport.c:level_tele().  Level teleport schedules this
    // deferred post-message only when flags.verbose is true.
    const materializeLine = options?.materializeMessage === false
        ? ''
        : (typeof options?.materializeMessage === 'string'
            ? options.materializeMessage
            : (game.flags?.verbose === false ? '' : 'You materialize on a different level!'));
    if (materializeLine && options?.deferMaterializeBehindMore && game._more) {
        game._more_message_queue = [
            { text: materializeLine, more: false, move: true },
            ...(game._more_message_queue || []),
        ];
    } else if (materializeLine) {
        await pline(materializeLine);
    }
    if (familiarBonesMessage) {
        queue_more_prompt();
        game._more_message_queue = [
            ...(game._more_message_queue || []),
            { text: familiarBonesMessage, more: false },
        ];
    }
    const locateMessage = questLocateMessage(oldUz);
    if (locateMessage) {
        queue_more_prompt();
        game._more_message_queue = [
            ...(game._more_message_queue || []),
            { text: locateMessage, more: false },
        ];
    }
    if (!wasInHell && isHellLevel(game.u?.uz)
        && (isSpecialProtoLevel(game.u?.uz, 'valley') || game._last_special_protofile === 'valley')) {
        const valleyArrivalObjects = (game.level?.objects || [])
            .filter((obj) => obj.ox === game.u?.ux && obj.oy === game.u?.uy && obj.otyp !== GOLD_PIECE);
        const valleyPausesBeforeFloorLook = valleyArrivalObjects.some((obj) => obj !== game.uchain);
        const valleyMessages = [
            { text: 'You arrive at the Valley of the Dead...', more: true },
            { text: 'The odor of burnt flesh and decay pervades the air.', more: true },
            { text: 'You hear groans and moans everywhere.', more: valleyPausesBeforeFloorLook },
        ];
        if (game._pending_message || game._more || (game._more_message_queue || []).length) {
            queue_more_prompt();
            game._more_message_queue = [
                ...(game._more_message_queue || []),
                ...valleyMessages,
            ];
        } else {
            await pline(valleyMessages[0].text);
            queue_more_prompt();
            game._more_message_queue = valleyMessages.slice(1);
        }
    }
    if (C.Is_rogue_level(game.u?.uz)) {
        queue_more_prompt();
        game._more_message_queue = [
            { text: 'You enter what seems to be an older, more primitive world.', more: false },
        ];
    }
    const hasPostArrivalPager = queuePostArrivalPager(
        questStartPagerText(oldUz) || questGoalPagerText(oldUz));
    // C ref: do.c:goto_level() performs docrt()/flush before the deferred
    // materialize pline and temperature-change messages; the following input
    // boundary does not immediately rerandomize the hallucinated new-level map.
    const tempMessage = temperatureChangeAfterLevelChange(prevTemperature, wasInHell);
    if (tempMessage?.line && hasPostArrivalPager) game._post_arrival_temp_message = tempMessage;
    else await showTemperatureChangeMessage(tempMessage);
    // C ref: do.c:goto_level() calls print_level_annotation() after level
    // arrival messages and before pickup(1)/look_here().
    await printLevelAnnotation();
    // C ref: do.c:goto_level() runs pickup(1) after the deferred
    // materialize pline; if arrival lands on visible floor objects, the
    // pending object listing forces the materialize line to block first.
    const arrivalObjects = (game.level?.objects || [])
        .filter((obj) => obj.ox === game.u?.ux && obj.oy === game.u?.uy && obj.otyp !== GOLD_PIECE);
    const countableArrivalObjects = arrivalObjects.filter((obj) => obj !== game.uchain);
    const arrivalFloorLookSpendsTurn = !!options?.atStairs || !!options?.spendsTurn || !!game.context?.move;
    const deferArrivalFloorLook = () => {
        game._arrival_floor_look_after_more = true;
        game._arrival_floor_list_no_turn_pending = !arrivalFloorLookSpendsTurn;
    };
    if (!countableArrivalObjects.length) {
        // C ref: pickup.c:check_here().  The hero's chain alone does not
        // trigger look_here(); another object at the same spot will include it.
    } else if (!game._more && arrivalObjects.length === 1) {
        const line = `You see here ${inventoryObjectName(arrivalObjects[0], { includePrice: true, observe: true })}.`;
        const packed = game._pending_message ? `${game._pending_message}  ${line}` : line;
        if (packed.length + LEVELCHANGE_MORE_LEN <= COLNO) {
            await append_pline(line);
        } else {
            deferArrivalFloorLook();
            queue_more_prompt();
        }
    } else if (!game._more && arrivalObjects.length > 1) {
        if (game._pending_message) {
            deferArrivalFloorLook();
            queue_more_prompt();
        } else {
            showFloorObjectList(arrivalObjects);
        }
    } else if (game._more && arrivalObjects.length > 0) {
        deferArrivalFloorLook();
    }
    game.context.mv = 1;
}

async function applyPendingLevelChange() {
    const target = Math.min(30, Math.max(1, Number(game._levelchange_target || 0)));
    const queue = game._levelchange_message_queue = game._levelchange_message_queue || [];
    if (!target || ((game.u?.ulevel || 1) >= target && queue.length === 0)) {
        game._levelchange_target = 0;
        game._levelchange_message_queue = [];
        game.context.move = 0;
        game._more = false;
        return;
    }

    let line = '';
    while (true) {
        let msg;
        let preLevelGain = false;
        if (queue.length > 0) {
            msg = queue.shift();
        } else if ((game.u?.ulevel || 1) < target) {
            msg = 'You feel more experienced.';
            preLevelGain = true;
        } else {
            break;
        }

        const nextLine = appendLevelchangeTopline(line, msg);
        if (nextLine == null) {
            if (!preLevelGain) queue.unshift(msg);
            break;
        }

        line = nextLine;
        if (preLevelGain) {
            const oldLevel = game.u?.ulevel || 1;
            const newLevel = pluslvl();
            recordRankAchievements(oldLevel, newLevel);
            enqueueLevelchangePostMessages(oldLevel, newLevel);
        }
    }

    if (line) await pline(line);
    const hasPending = queue.length > 0 || (game.u?.ulevel || 1) < target;
    game._more = hasPending;
    if (!hasPending) {
        game._levelchange_target = 0;
        game._levelchange_message_queue = [];
    }
    game.context.move = 0;
}

// C ref: cmd.c rhack — main command dispatcher
function isCommandCountDigit(ch) {
    return ch >= '0' && ch <= '9';
}

async function startOrContinueCommandCount(ch) {
    // C ref: src/cmd.c:get_count().  A leading digit is silent; once the
    // accumulated count has two or more digits, tty clears the message window
    // and echoes "Count: N" while waiting for the command key.
    game._command_count_digits = `${game._command_count_digits || ''}${ch}`;
    const count = Math.min(Number.parseInt(game._command_count_digits, 10) || 0, 2147483647);
    if (count > 9) {
        clear_pending_message();
        await showPromptLine(`Count: ${count}`);
    }
    game.context.move = 0;
}

function consumeCommandCountForCommand() {
    const digits = game._command_count_digits || '';
    game._command_count_digits = '';
    if (!digits) {
        game.context.commandCount = 0;
        game.context.multi = 0;
        return 0;
    }
    const count = Math.min(Number.parseInt(digits, 10) || 0, 2147483647);
    game.context.commandCount = count;
    game.context.multi = count > 0 ? count - 1 : 0;
    return count;
}

function queueSimpleTimedRepeatsForCount(actionText = '') {
    // C ref: cmd.c:parse()/set_occupation()/timed_occupation().  The
    // command's own time charge is handled by moveloop_core() after rhack()
    // returns; gm.multi already contains the remaining repeat count.
    const base = Math.max(0, game.context?.multi || 0);
    const searchInVault = actionText === 'searching' && vaultOccupiedBasic();
    // C refs: src/cmd.c:timed_occupation(), src/vault.c:invault().
    // Outside vaults, the legacy search batch keeps two low-visibility
    // occupation turns out of the JS monster batching path.  Inside vaults,
    // those turns must pass through the normal turn tail so invault() runs at
    // the same point as C instead of receiving a direct timer credit.
    const remaining = actionText === 'searching' && !searchInVault
        ? Math.max(0, base - 2)
        : base;
    if (searchInVault && base > 0 && game._fast_extra_action_pending && game.u) {
        // C refs: src/allmain.c:moveloop_core(), src/cmd.c:timed_occupation(),
        // src/vault.c:invault().  A counted search that starts on a stored fast
        // extra action reaches the occupation front door without a fresh JS
        // turn-tail pass.  Credit vault occupancy once so the guard timer keeps
        // pace with C's command-owned timed occupation.
        game.u.uinvault = (game.u.uinvault || 0) + 1;
    }
    if (remaining > 0) {
        game._simple_timed_repeats_remaining = remaining;
        game._simple_timed_repeat_text = actionText;
        game._simple_timed_repeat_stop_text = actionText;
    }
}

function refreshHeroPreviousPositionForStationaryCommand() {
    if (!game.u) return;
    game.u.ux0 = game.u.ux;
    game.u.uy0 = game.u.uy;
}

function clearDeferredPetPickupObjects() {
    for (const obj of game.level?.objects || []) {
        if (obj?._defer_pet_pickup) delete obj._defer_pet_pickup;
    }
}

export async function rhack(key) {
    if (key === 0) {
        // Read key from input
        await flush_screen(1);
        key = await nhgetch();
    }

    let ch = String.fromCharCode(key);

    if (game._awaiting_pray_force_more && game._more && (ch === ' ' || ch === '\r' || ch === '\n')) {
        clear_pending_message();
        game._awaiting_pray_force_more = false;
        game._awaiting_pray_force = true;
        await showPromptLine('Force the gods to be pleased? [yn] (n) ');
        game.context.move = 0;
        return;
    }

    if (game._awaiting_prayer_done_more && game._more && !game._monster_turn_paused_for_more
        && (ch === ' ' || ch === '\r' || ch === '\n')) {
        clear_pending_message();
        game._awaiting_prayer_done_more = false;
        await finishPrayerResult();
        finishDeferredSeerTurnUpdateAfterPrayer();
        game.context.move = 0;
        return;
    }

    if (game._apply_invalid_more && game._more) {
        if (ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b') {
            game._apply_invalid_more = false;
            clear_pending_message();
            game._awaiting_apply_item = true;
            await showPromptLine(`What do you want to use or apply? [${applyLetters()} or ?*] `);
            game.context.move = 0;
            return;
        }
        game.context.move = 0;
        return;
    }

    if (game._eat_invalid_more && game._more) {
        if (ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b') {
            game._eat_invalid_more = false;
            clear_pending_message();
            game._awaiting_eat_item = true;
            await showPromptLine(`What do you want to eat? [${eatLetters()} or ?*] `);
            game.context.move = 0;
            return;
        }
        game.context.move = 0;
        return;
    }

    if (game._terrain_view_done_more) {
        if (ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b') {
            game._terrain_view_done_more = false;
            game._terrain_view_active = false;
            clear_pending_message();
            clearOverrideScreen();
        }
        game.context.move = 0;
        return;
    }

    if (game._terrain_view_intro_more) {
        game._override_prev = null;
        if (ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b') {
            game._terrain_view_intro_more = false;
            game._more = false;
            game._more_dismissals_remaining = 0;
            clear_pending_message();
            if (!getposTipSeen()) {
                markGetposTipSeen();
                game._travel_tip_active = 'terrain';
                await showTravelTipScreen(serialize_known_terrain_view_screen(''));
            } else {
                showTerrainBrowsePrompt();
            }
        }
        game.context.move = 0;
        return;
    }

    if (game._terrain_view_active) {
        if (ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b') {
            const moreMessage = 'Done.--More--';
            showTerrainView(moreMessage, [Math.min(moreMessage.length, 79), 0]);
            game._pending_message = 'Done.';
            game._more = true;
            game._terrain_view_done_more = true;
            game._terrain_view_active = false;
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_terrain_menu) {
        game._awaiting_terrain_menu = false;
        clearOverrideScreen();
        if (ch === 'a') {
            game._terrain_view_active = true;
            showTerrainView("Showing known terrain only...  (For instructions type a '?')");
        } else if (ch === ' ' || ch === '\r' || ch === '\n') {
            game._terrain_view_intro_more = true;
            const msg = 'Showing known terrain only...';
            showTerrainView(`${msg}--More--`, [msg.length + '--More--'.length, 0]);
            game._pending_message = msg;
            queue_more_prompt();
        }
        game.context.move = 0;
        return;
    }

    if (await handleQueuedMore(ch)) return;

    if (game._travel_tip_active) {
        if (ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b') {
            const kind = game._travel_tip_active;
            const quickFarlook = kind === 'farlook' && !!game._farlook_after_tip_quick;
            game._farlook_after_tip_quick = false;
            game._travel_tip_active = false;
            clearOverrideScreen();
            if (kind === 'farlook') {
                if (quickFarlook) {
                    game._awaiting_farlook_prompt = true;
                    game._farlook_quick_mode = true;
                    game._farlook_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
                    await showPromptLine('Move cursor to a monster, object or location:');
                    setTravelMapCursorAt(game._farlook_cursor.x, game._farlook_cursor.y);
                } else {
                    game._farlook_quick_mode = false;
                    await pline("(For instructions type a '?')");
                    queue_more_prompt();
                    game._farlook_prompt_after_instruction_more = true;
                }
            } else if (kind === 'terrain') {
                showTerrainBrowsePrompt();
            } else if (kind === 'monster_detect') {
                await showMonsterDetectBrowsePrompt();
            } else if (kind === 'jump') {
                game._awaiting_jump_prompt = true;
                game._jump_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
                await showPromptLine('Move cursor to the desired position:');
                setTravelMapCursorAt(game._jump_cursor.x, game._jump_cursor.y);
            } else {
                await showPromptLine(TRAVEL_CURSOR_PROMPT);
                setTravelMapCursor();
                game._awaiting_travel_cursor = false;
                game._awaiting_travel_prompt = true;
            }
        } else {
            setTravelTipCursor();
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_lookat_menu) {
        clearOverrideScreen();
        game._awaiting_lookat_menu = false;
        if (ch === '/') {
            // C ref: src/pager.c:do_look().  The menu-driven screen lookup
            // prints the short "Pick ..." prompt when verbose is disabled,
            // then enters the normal non-quick getpos loop.
            if (game.flags?.verbose === false) {
                clear_pending_message();
                await pline('Pick a monster, object or location.');
                game._farlook_quick_mode = false;
                game._farlook_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
                setTravelMapCursorAt(game._farlook_cursor.x, game._farlook_cursor.y);
                game._awaiting_farlook_prompt = true;
            } else {
                await pline('Please move the cursor to a monster, object or location.');
                queue_more_prompt();
                game._farlook_quick_mode = false;
                game._farlook_intro_after_more = true;
            }
        } else if (ch === 'i') {
            await showInventoryMenu();
            game._look_inventory_lookup_active = true;
        } else if (ch === '?') {
            await showPromptLine('Specify what? (type the word)', { trailingInputSpace: true });
            game._awaiting_lookat_word = { text: '' };
        } else if (ch === 'm' || ch === 'M') {
            showLookMonsterList(ch === 'M');
        } else if (ch === 'o' || ch === 'O') {
            showLookObjectList(ch === 'O');
        } else if (ch === 't') {
            await pline('No traps seen or remembered nearby.');
        } else if (ch === 'T') {
            await pline('No traps seen or remembered.');
        } else if (ch === 'e' || ch === 'E') {
            showLookEngravingList(ch === 'E');
        } else if (ch === '\x1b' || ch === ' ') {
            clear_pending_message();
        } else {
            await pline('Never mind.');
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_lookat_word) {
        const state = game._awaiting_lookat_word;
        const prompt = 'Specify what? (type the word)';
        if (ch === '\x1b') {
            game._awaiting_lookat_word = null;
            clear_pending_message();
            game.context.move = 0;
            return;
        }
        if (ch === '\r' || ch === '\n') {
            game._awaiting_lookat_word = null;
            clear_pending_message();
            const query = state.text.trim().replace(/\s+/g, ' ').toLowerCase();
            const lines = LOOKUP_DATA.get(query);
            if (lines) await showLookupDataOverlay(lines);
            else await pline("You don't have any information on those things.");
            game.context.move = 0;
            return;
        }
        if (ch === '\x7f' || ch === '\b') {
            state.text = state.text.slice(0, -1);
        } else if (ch >= ' ' && ch !== '\x7f') {
            state.text += ch;
        }
        await showPromptLine(`${prompt}${state.text ? ` ${state.text}` : ''}`, { trailingInputSpace: !state.text });
        game.context.move = 0;
        return;
    }

    if (game._awaiting_help_what_command) {
        // C ref: pager.c:dowhatdoes() -> dowhatdoes_core().
        game._awaiting_help_what_command = false;
        clear_pending_message();
        if (ch === '\x1b') {
            game.context.move = 0;
            return;
        }
        if (ch === 'i') await pline('i       show your inventory (#inventory).');
        else if (ch === '&' || ch === '?') {
            await showHelpDataFile('keyhelp');
        } else {
            const code = ch.charCodeAt(0) || 0;
            await pline(`No such command '${ch}', char code ${code} (0${code.toString(8).padStart(3, '0')} or 0x${code.toString(16).padStart(2, '0')}).`);
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_farlook_more_info) {
        const state = game._awaiting_farlook_more_info;
        game._awaiting_farlook_more_info = null;
        clear_pending_message();
        if (ch === 'y' || ch === 'Y') {
            await pline('No detailed information available.');
            queue_more_prompt();
            game._farlook_cursor = { x: state.x, y: state.y };
        } else {
            game._awaiting_farlook_prompt = true;
            game._farlook_cursor = { x: state.x, y: state.y };
            await pline('Pick a monster, object or location.');
            setTravelMapCursorAt(state.x, state.y);
        }
        game.context.move = 0;
        return;
    }

    if (game._bones_get_prompt_active) {
        game._bones_get_prompt_active = false;
        const promptScreen = serialize_terminal_grid(game.nhDisplay);
        clear_pending_message();
        if (ch === 'y' || ch === 'Y') {
            const ok = restore_pending_bones_snapshot();
            game._pending_bones_familiar = !!ok;
            // C ref: bones.c:getbones() asks the wizard unlink prompt inside
            // getbones(); goto_level() performs its docrt() after that prompt
            // has been answered.
            const msg = 'Unlink bones? [yn] (n)';
            await showPromptLine(msg);
            game._prompt_cursor = [msg.length + 1, 0];
            if (promptScreen) {
                showSerializedOverride(screenWithPromptLine(promptScreen, msg), [msg.length + 1, 0]);
            }
            game._bones_unlink_prompt_active = true;
            game.context.move = 0;
            return;
        }
        if (ch === 'n' || ch === 'N' || ch === ' ' || ch === '\r' || ch === '\n' || ch === '\\') {
            clear_pending_bones_restore();
            const pending = game._pending_level_teleport_after_bones || {};
            game._pending_level_teleport_after_bones = null;
            const oldBones = game.flags?.bones;
            game.flags = game.flags || {};
            game.flags.bones = false;
            try {
                await mklev();
            } finally {
                game.flags.bones = oldBones;
            }
            await finishLevelTeleportArrival(pending);
            game.context.move = 0;
            return;
        }
        const msg = 'Get bones? [yn] (n)';
        await showPromptLine(msg);
        game._prompt_cursor = [msg.length + 1, 0];
        game._bones_get_prompt_active = true;
        game.context.move = 0;
        return;
    }

    if (game._bones_unlink_prompt_active) {
        game._bones_unlink_prompt_active = false;
        game._override_prev = null;
        clear_pending_message();
        if (ch === 'y' || ch === 'Y') delete_pending_bones_file();
        const pending = game._pending_level_teleport_after_bones || {};
        game._pending_level_teleport_after_bones = null;
        clear_pending_bones_restore();
        await finishLevelTeleportArrival(pending);
        game.context.move = 0;
        return;
    }

    if (game._death_inventory_disclosure_prompt_active) {
        if (ch === 'y' || ch === 'Y' || ch === 'n' || ch === 'N'
            || ch === 'q' || ch === 'Q' || ch === ' ' || ch === '\r' || ch === '\n') {
            game._death_inventory_disclosure_prompt_active = false;
            clear_pending_message();
            await showDeathDisclosure();
            game.context.move = 0;
            return;
        }
        const msg = 'Do you want your possessions identified? [ynq] (n)';
        await showPromptLine(msg);
        game._prompt_cursor = [msg.length + 1, 0];
        game.context.move = 0;
        return;
    }

    if (game._death_prompt_active) {
        if (ch === 'y' || ch === 'Y') {
            game._death_prompt_active = false;
            game._fatal_monster_attack_paused = false;
            game._resume_turn_tail_after_more = false;
            game._latched_status_uhp = 0;
            if (game.u && typeof game.u.uhp === 'number') game.u.uhp = 0;
            if (!game._death_bones_checked) {
                game._death_bones_checked = true;
                game._death_bones_check_pending = true;
            }
            const bonesOk = prepareDeathBonesDoneStageBasic();
            if (bonesOk && deathCanSaveWizardBones()) {
                await showDeathSaveBonesPrompt();
            } else {
                await showDeathDisclosureOrPrompt();
            }
            game.context.move = 0;
            return;
        }
        if (ch === '\\') {
            const msg = 'Die? [yn] (n)';
            await showPromptLine(msg);
            game._prompt_cursor = [msg.length + 1, 0];
            game.context.move = 0;
            return;
        }
        if (!(ch === 'n' || ch === 'N' || ch === ' '
            || ch === '\r' || ch === '\n' || ch === '\x1b')) {
            // C refs: src/cmd.c:paranoid_query(),
            // win/tty/topl.c:tty_yn_function().  The wizard/discover death
            // prompt is still inside done(); unrelated command keys are read
            // and ignored until a valid yn/default answer arrives.
            const msg = 'Die? [yn] (n)';
            await showPromptLine(msg);
            game._prompt_cursor = [msg.length + 1, 0];
            game.context.move = 0;
            return;
        }
        {
            game._death_prompt_active = false;
            const resumeTailOnly = !!game._resume_turn_tail_after_more;
            game._fatal_monster_attack_paused = false;
            game._prompt_cursor = null;
            if (game.u && typeof game.u.uhp === 'number')
                game.u.uhp = Math.max(1, game.u.uhpmax || game.u.uhp);
            game._latched_status_uhp = null;
            game._death_bones_checked = false;
            game._death_bones_check_pending = false;
            game._death_bones_done_stage_prepared = false;
            game._death_bones_corpse_prepared = false;
            game._death_bones_ok = false;
            if (game._monster_turn_paused_for_more) {
                game._resume_turn_tail_after_more = false;
                game._nomovemsg = 'You survived that attempt on your life.';
                await pline("OK, so you don't die.");
                const okLine = game._pending_message;
                if (game._deferred_monster_physical_attack?.current?.postSideEffectHero
                    && game._deferred_monster_physical_attack.current.encumberShown) {
                    // C refs: src/mhitu.c:hitmu(), src/end.c:done()/savelife().
                    // This side-effect tail damage already drove the wizard death
                    // prompt; declining death resumes after that hit instead of
                    // applying the same poison/encumbrance tail again, but hitmu()
                    // still consumed its knockback RNG before death handling.
                    finish_deferred_monster_physical_knockback_only();
                    game._deferred_monster_physical_attack = null;
                } else {
                    await finish_deferred_monster_physical_attack();
                }
                if (!game._more
                    && (game._monster_death_pending || game._after_more_message)) {
                    queue_more_prompt();
                }
                if (game._more) game._pending_more_strict_keys = true;
                game._savelife_resume_active = true;
                if (game._more) {
                    game._latched_status_turn = (game.moves || 1) + 1;
                    game._clear_latched_status_after_more = true;
                    game._monster_turn_paused_for_more = true;
                    game._monster_attack_more_waiting = true;
                    game._resume_monster_turn = false;
                    game.context.move = 0;
                } else {
                    game._monster_turn_paused_for_more = false;
                    game._resume_monster_turn = true;
                    game.context.move = 1;
                }
            } else {
                await pline("OK, so you don't die.  You survived that attempt on your life.");
                if (resumeTailOnly) {
                    game._monster_turn_paused_for_more = false;
                    game._savelife_resume_active = true;
                    game.context.move = 1;
                } else {
                    game.context.move = 0;
                }
            }
            return;
        }
        const msg = 'Die? [yn] (n)';
        await showPromptLine(msg);
        game._prompt_cursor = [msg.length + 1, 0];
        game.context.move = 0;
        return;
    }

    if (game._death_replace_bones_prompt_active) {
        if (ch === 'y' || ch === 'Y') {
            game._death_replace_bones_prompt_active = false;
            clear_pending_message();
            savePreparedBonesRngBasic({ replace: true });
            await showDeathDisclosureOrPrompt();
            game.context.move = 0;
            return;
        }
        if (ch === 'n' || ch === 'N' || ch === ' ' || ch === '\r' || ch === '\n') {
            game._death_replace_bones_prompt_active = false;
            clear_pending_message();
            await showDeathDisclosureOrPrompt();
            game.context.move = 0;
            return;
        }
        const msg = 'Bones file already exists.  Replace it? [yn] (n)';
        await showPromptLine(msg);
        game._prompt_cursor = [msg.length + 1, 0];
        game.context.move = 0;
        return;
    }

    if (game._death_save_bones_prompt_active) {
        if (ch === 'y' || ch === 'Y') {
            game._death_save_bones_prompt_active = false;
            clear_pending_message();
            const saved = savePreparedBonesRngBasic();
            if (saved === 'exists' && deathCanSaveWizardBones()) {
                const msg = 'Bones file already exists.  Replace it? [yn] (n)';
                await showPromptLine(msg);
                game._prompt_cursor = [msg.length + 1, 0];
                game._death_replace_bones_prompt_active = true;
                game.context.move = 0;
                return;
            }
            await showDeathDisclosureOrPrompt();
            game.context.move = 0;
            return;
        }
        if (ch === 'n' || ch === 'N' || ch === ' ' || ch === '\r' || ch === '\n') {
            game._death_save_bones_prompt_active = false;
            clear_pending_message();
            await showDeathDisclosureOrPrompt();
            game.context.move = 0;
            return;
        }
        const msg = 'Save bones? [yn] (n)';
        await showPromptLine(msg);
        game._prompt_cursor = [msg.length + 1, 0];
        game.context.move = 0;
        return;
    }

    if (game._awaiting_quit_confirm) {
        clear_pending_message();
        game._awaiting_quit_confirm = false;
        if (ch === 'y' || ch === 'Y') {
            // C ref: end.c:done2().  Only wizard/debug mode asks for a core
            // dump; ordinary #quit proceeds directly to done(QUIT).
            if (game.wizard || game.flags?.debug) {
                const prompt = 'Dump core? [ynq] (q)';
                await pline(prompt);
                game._prompt_cursor = [prompt.length + 1, 0];
                game._awaiting_dump_core = true;
            } else {
                await showQuitDisclosure();
            }
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_dump_core) {
        if (ch === 'y' || ch === 'Y' || ch === 'n' || ch === 'N'
            || ch === 'q' || ch === 'Q' || ch === '\x1b') {
            clear_pending_message();
            game._awaiting_dump_core = false;
            const screen = '\nSince you were in wizard mode, the score list will not be checked.';
            showOverride(screen, [0, 4]);
            game.program_state = game.program_state || {};
            game.program_state.gameover = true;
            game.context.move = 0;
            return;
        }
        const prompt = 'Dump core? [ynq] (q)';
        await pline(prompt);
        game._prompt_cursor = [prompt.length + 1, 0];
        game.context.move = 0;
        return;
    }

    if (game._awaiting_pray_confirm) {
        clear_pending_message();
        game._awaiting_pray_confirm = false;
        if (ch === 'y' || ch === 'Y') {
            rememberPrayerStart();
            // C ref: src/pray.c:dopray().  Accepting prayer rejects atheist
            // conduct before can_pray() decides whether the prayer proceeds.
            noteConductCounter('gnostic');
            game._prayer_finish_result_inline = false;
            await pline(`You begin praying to ${prayerGodName()}.`);
            if (game.wizard || game.flags?.debug) {
                game._more = true;
                game._awaiting_pray_force_more = true;
                game.context.move = 0;
            } else {
                // C ref: src/pray.c:dopray() uses nomul(-3) before
                // gn.nomovemsg/ga.afternmv run at prayer completion.
                game._prayer_turns_remaining = prayerTurnBudget();
                game._pending_prayer_finish_message = true;
                game.context.move = 1;
            }
            return;
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_pray_force) {
        clear_pending_message();
        game._prayer_finish_result_inline = false;
        if (ch === 'y' || ch === 'Y') {
            game._awaiting_pray_force = false;
            game.u.ublesscnt = 0;
            if ((game.u.ualign?.record ?? 0) <= 0) game.u.ualign.record = 1;
            game.u.ugangr = 0;
            if ((game.u.uluck ?? 0) < 0) game.u.uluck = 0;
            const forcedPtype = (game._prayer_ptype ?? currentPrayerType()) < 2
                ? 3
                : (game._prayer_ptype ?? currentPrayerType());
            game._prayer_ptype = forcedPtype;
            game._prayer_alignment = game.u?.ualign?.type ?? 0;
            // C ref: pray.c:dopray().  Wizard force-success only promotes
            // prayer types below 2; invulnerability and its visual line only
            // apply to type-3 prayers outside Gehennom, and the line is
            // suppressed while Blind.
            const forcedInvulnerable = forcedPtype === 3 && !isHellLevel(game.u?.uz);
            const forcedShimmerVisible = forcedInvulnerable && !heroIsBlind();
            if (forcedInvulnerable) {
                game.u.uinvulnerable = true;
            }
            if (forcedShimmerVisible) {
                await pline('You are surrounded by a shimmering light.');
                game._more = true;
            }
            // C ref: src/pray.c:dopray() uses nomul(-3).  Keep the same
            // fast-hero movement budget as ordinary prayer; the turn loop
            // accounts for whether the first pass reached a completed tail.
            game._prayer_turns_remaining = prayerTurnBudget();
            game._prayer_full_budget_no_restore = true;
            game._prayer_force_intrinsic_budget_adjust = !game.u?.uprops?.fast
                && !!game.u?.uprops?.intrinsic_fast;
            game._pending_prayer_finish_message = true;
            game.context.move = 1;
        } else if (ch === 'n' || ch === 'N' || ch === ' ' || ch === '\r' || ch === '\n') {
            game._awaiting_pray_force = false;
            // C ref: pray.c:dopray().  Declining the wizard force-success
            // prompt still falls through to nomul(-3)/prayer_done().
            game._prayer_turns_remaining = prayerTurnBudget();
            game._pending_prayer_finish_message = true;
            game._prayer_finish_result_inline = true;
            game.context.move = 1;
        } else {
            // C ref: pray.c:dopray() uses yn_function(); invalid input keeps
            // the prompt active and consumes no turn.
            game._awaiting_pray_force = true;
            await showPromptLine('Force the gods to be pleased? [yn] (n) ');
            game.context.move = 0;
        }
        return;
    }

    if (game._levelchange_target && game._more && (ch === ' ' || ch === '\r' || ch === '\n')) {
        clear_pending_message();
        await applyPendingLevelChange();
        return;
    }

    if (game._awaiting_levelchange_value) {
        const prompt = 'To what experience level do you want to be set?';
        if (ch >= '0' && ch <= '9') {
            game._levelchange_input = `${game._levelchange_input || ''}${ch}`;
            await showPromptLine(`${prompt} ${game._levelchange_input}`);
            game.context.move = 0;
            return;
        }
        if (ch === '\r' || ch === '\n') {
            const target = Number(game._levelchange_input || 0);
            clear_pending_message();
            game._awaiting_levelchange_value = false;
            game._levelchange_input = '';
            if (target > 0) {
                game._levelchange_target = target;
                game._levelchange_message_queue = [];
                await applyPendingLevelChange();
            } else {
                await pline('Never mind.');
                game.context.move = 0;
            }
            return;
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_vault_guard_name) {
        await handleVaultGuardNameKey(ch);
        return;
    }

    if (game._loot_action_menu) {
        await handleLootActionMenuKey(ch);
        return;
    }
    if (game._loot_type_menu) {
        await handleLootTypeMenuKey(ch);
        return;
    }
    if (game._loot_putin_menu) {
        await handleLootPutInMenuKey(ch);
        return;
    }
    if (game._loot_takeout_menu) {
        await handleLootTakeOutMenuKey(ch);
        return;
    }
    if (game._awaiting_options_fruit) {
        await handleOptionsFruitKey(ch);
        return;
    }
    if (game._pickup_types_menu) {
        await handlePickupTypesMenuKey(ch);
        return;
    }
    if (game._options_menu) {
        await handleSimpleOptionsMenuKey(ch);
        return;
    }

    if (game._awaiting_tip_confirm) {
        const box = game._awaiting_tip_confirm;
        if (ch === 'y' || ch === 'Y') {
            game._awaiting_tip_confirm = null;
            clear_pending_message();
            game.context.move = 0;
            void box;
            return;
        }
        if (ch === 'n' || ch === 'N' || ch === '\x1b') {
            game._awaiting_tip_confirm = null;
            clear_pending_message();
            game.context.move = 0;
            return;
        }
        if (ch === 'q' || ch === 'Q') {
            // C ref: pickup.c:dotip().  A quit answer returns without
            // clearing the displayed ynq prompt, but command input resumes
            // with the cursor back on the map.
            game._awaiting_tip_confirm = null;
            game._prompt_cursor = null;
            game.context.move = 0;
            return;
        }
        const prompt = `There is ${inventoryObjectName(box)} here, tip it? [ynq] (q)`;
        await showPromptLine(prompt, { trailingInputSpace: true });
        game.context.move = 0;
        return;
    }

    if (game._awaiting_annotation) {
        const state = game._awaiting_annotation;
        const prompt = 'What do you want to call this dungeon level?';
        if (ch === '\r' || ch === '\n') {
            const text = state.text || '';
            clear_pending_message();
            if (text.trim()) game.level.annotation = text;
            game._awaiting_annotation = null;
            game.context.move = 0;
            return;
        }
        if (ch === '\x1b') {
            clear_pending_message();
            game._awaiting_annotation = null;
            game.context.move = 0;
            return;
        }
        state.text = `${state.text || ''}${ch}`;
        await showPromptLine(`${prompt} ${state.text}`);
        game.context.move = 0;
        return;
    }

    if (game._awaiting_name_inventory_item) {
        game._awaiting_name_inventory_item = false;
        clear_pending_message();
        if (ch === '\x1b' || ch === ' ') {
            game.context.move = 0;
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (obj) await beginNameInventoryObject(obj);
        else game.context.move = 0;
        return;
    }

    if (game._awaiting_name_object_text) {
        const state = game._awaiting_name_object_text;
        if (ch === '\r' || ch === '\n') {
            const text = String(state.text || '').trim();
            if (state.obj) {
                state.obj.oextra = { ...(state.obj.oextra || {}) };
                if (text) state.obj.oextra.oname = text;
                else delete state.obj.oextra.oname;
            }
            clear_pending_message();
            game._awaiting_name_object_text = null;
            game.context.move = 0;
            return;
        }
        if (ch === '\x1b') {
            clear_pending_message();
            game._awaiting_name_object_text = null;
            game.context.move = 0;
            return;
        }
        state.text = `${state.text || ''}${ch}`;
        await showPromptLine(`${state.prompt} ${state.text}`);
        game.context.move = 0;
        return;
    }

    if (game._herecmd_menu) {
        await dismissHereCommandMenu();
        return;
    }

    if (game._awaiting_adjust_item) {
        clear_pending_message();
        game._awaiting_adjust_item = false;
        if (ch === ' ' || ch === '\x1b') {
            await pline('Never mind.');
            game.context.move = 0;
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (obj) {
            game._awaiting_adjust_letter = obj;
            await showPromptLine(`Adjust letter to what [${adjustDestinationLetters(obj)}] (? see used letters)?`, { trailingInputSpace: true });
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_adjust_letter) {
        clear_pending_message();
        const obj = game._awaiting_adjust_letter;
        game._awaiting_adjust_letter = null;
        if (/^[A-Za-z]$/.test(ch)) {
            obj.invlet = ch;
            // C ref: src/invent.c:doorganize_core()/reorder_invent().
            reorderInventoryByLetter();
            await pline(`Moving: ${inventoryListing(obj, { includeWorn: true })}.`);
        } else {
            await pline('Never mind.');
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_extended_command) {
        if (ch === '\r' || ch === '\n') {
            const typedExtCommand = game._extended_command_input || game._extended_command || '';
            const cmd = completeExtendedCommand(typedExtCommand);
            clear_pending_message();
            game._awaiting_extended_command = false;
            game._extended_command_input = '';
            game._extended_command = '';
            if (cmd === 'levelchange') {
                const prompt = 'To what experience level do you want to be set?';
                await showPromptLine(prompt);
                game._prompt_cursor = [prompt.length + 1, 0];
                game._awaiting_levelchange_value = true;
                game._levelchange_input = '';
            } else if (cmd === 'annotate') {
                await beginAnnotatePrompt();
            } else if (cmd === 'herecmdmenu') {
                showHereCommandMenu();
            } else if (cmd === 'pray') {
                await showPromptLine('Are you sure you want to pray? [yn] (n) ');
                game._awaiting_pray_confirm = true;
                game.context.move = 0;
            } else if (cmd === 'ride') {
                await doRideCommand();
            } else if (cmd === 'quit') {
                // C ref: src/end.c:done2().
                const prompt = 'Really quit without saving? [yn] (n)';
                await pline(prompt);
                game._prompt_cursor = [prompt.length + 1, 0];
                game._awaiting_quit_confirm = true;
            } else if (cmd === 'wizintrinsic') {
                beginIntrinsicMenu();
                game._intrinsic_menu.count = '';
                game.context.move = 0;
            } else if (cmd === 'wizgenesis') {
                // C refs: src/cmd.c extended command table, src/wizcmds.c:wiz_genesis().
                const prompt = 'Create what kind of monster?';
                await pline(prompt);
                game._prompt_cursor = [prompt.length + 1, 0];
                game._awaiting_create_monster = true;
                game._create_monster_input = '';
            } else if (cmd === 'wizidentify') {
                await showWizIdentifyMenu();
            } else if (cmd === 'wizmap') {
                // C ref: wizcmds.c:wiz_map() -> detect.c:do_mapping().
                map_level_for_wizard(true);
                restoreMappedForegroundAfterMonsterRefresh();
                exercise(A_WIS, true);
                game._travel_reset_cursor_once = true;
                game.context.move = 0;
            } else if (cmd === 'wizmondiff') {
                game.context.move = 0;
            } else if (cmd === 'wizwhere') {
                showWizWhereScreen();
            } else if (cmd === 'wizwish') {
                await beginWizardWishPrompt();
            } else if (cmd === 'polyself') {
                await beginWizardPolyselfPrompt();
            } else if (cmd === 'monster') {
                await doMonsterAbilityCommand();
            } else if (cmd === 'rub') {
                await doRubCommand();
            } else if (cmd === 'wipe') {
                await doWipeCommand();
            } else if (cmd === 'invoke') {
                await doInvokeCommand();
            } else if (cmd === 'jump') {
                await doJumpCommand();
            } else if (cmd === 'untrap') {
                await doUntrapCommand();
            } else if (cmd === 'adjust') {
                await doAdjustCommand();
            } else if (cmd === 'chat') {
                // C ref: sounds.c:dochat().
                await showPromptLine('Talk to whom? (in what direction) ');
                game._awaiting_chat_direction = true;
                game.context.move = 0;
            } else if (cmd === 'chronicle') {
                showChronicleScreen();
            } else if (cmd === 'conduct') {
                showConductScreen();
            } else if (cmd === 'kick') {
                if (hasWoundedLegs()) {
                    await pline(woundedLegsKickMessage());
                    queue_more_prompt();
                    game.context.move = 0;
                } else {
                    await showPromptLine('In what direction? ');
                    game._awaiting_kick_direction = true;
                    game.context.move = 0;
                }
            } else if (cmd === 'loot') {
                await doLootCommand();
            } else if (cmd === 'terrain') {
                await showTerrainMenu();
            } else if (cmd === 'tip') {
                await doTipCommand();
            } else if (cmd === 'dip') {
                await doDipCommand();
            } else if (cmd === 'force') {
                await doForceCommand();
            } else if (cmd === 'genocided') {
                await doGenocidedCommand();
            } else if (cmd === 'name') {
                showNameCommandMenu();
                game.context.move = 0;
            } else if (cmd === 'enhance') {
                await beginEnhanceCommand();
            } else if (cmd === 'sit') {
                await doSitCommand();
            } else if (cmd === 'offer') {
                await doOfferCommand();
            } else if (cmd === 'options') {
                beginSimpleOptionsMenu();
            } else if (cmd === 'overview') {
                showOverviewScreen();
            } else if (cmd === 'version') {
                showAboutNetHack();
                game.context.move = 0;
            } else if (cmd === 'vanquished') {
                showVanquishedScreen();
            } else if (cmd === 'twoweapon') {
                await doTwoWeaponCommand();
            } else if (cmd === 'turn') {
                await doTurnCommand();
            } else {
                // C ref: win/tty/getline.c:tty_get_ext_cmd().
                if (typedExtCommand) {
                    await pline(`#${typedExtCommand.slice(0, 60)}: unknown extended command.`);
                }
            }
            if (cmd !== 'force' && cmd !== 'wipe' && cmd !== 'twoweapon'
                && cmd !== 'sit' && cmd !== 'dip' && cmd !== 'ride'
                && cmd !== 'jump' && cmd !== 'turn') game.context.move = 0;
            return;
        }
        if (ch === '\x1b') {
            clear_pending_message();
            game._awaiting_extended_command = false;
            game._extended_command_input = '';
            game._extended_command = '';
            game.context.move = 0;
            return;
        }
        if (ch === '\x7f' || ch === '\b') {
            const typed = (game._extended_command_input || '').slice(0, -1);
            game._extended_command_input = typed;
            game._extended_command = completeExtendedCommand(typed);
            await showExtendedCommandInput(typed);
            game.context.move = 0;
            return;
        }
        if (/^[A-Za-z]$/.test(ch)) {
            if ((game._extended_command_input || '').length >= 80) {
                game.context.move = 0;
                return;
            }
            const typed = `${game._extended_command_input || ''}${ch}`;
            game._extended_command_input = typed;
            game._extended_command = completeExtendedCommand(typed);
            await showExtendedCommandInput(typed);
            game.context.move = 0;
            return;
        }
        if (ch >= ' ' && ch !== '\x7f') {
            if ((game._extended_command_input || '').length >= 80) {
                game.context.move = 0;
                return;
            }
            const typed = `${game._extended_command_input || ''}${ch}`;
            game._extended_command_input = typed;
            game._extended_command = completeExtendedCommand(typed);
            await showExtendedCommandInput(typed);
            game.context.move = 0;
            return;
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_ride_direction) {
        game._awaiting_ride_direction = false;
        clear_pending_message();
        if (ch === '\x1b') {
            game.context.move = 0;
            return;
        }
        if (!'hykulnjb<>.'.includes(ch)) {
            game.context.move = 0;
            if (game.iflags?.cmdassist !== false) {
                game._direction_help_screen = INVALID_DIRECTION_HELP_SCREEN;
                game._direction_help_after_more_message = '';
                showSerializedOverride(INVALID_DIRECTION_HELP_SCREEN, [8, 23]);
                queue_more_prompt();
            } else {
                await pline('What a strange direction!');
            }
            return;
        }
        if (ch === '<' || ch === '>' || ch === '.') {
            await pline('I see nobody there.');
            game.context.move = 0;
            return;
        }
        game.u.dx = DIR_DX[ch] || 0;
        game.u.dy = DIR_DY[ch] || 0;
        const mon = mon_at((game.u?.ux || 0) + game.u.dx, (game.u?.uy || 0) + game.u.dy);
        await mountSteedBasic(mon);
        return;
    }

    if (game._awaiting_force_lock_confirm) {
        const state = game._awaiting_force_lock_confirm;
        clear_pending_message();
        if (ch === 'y' || ch === 'Y') {
            game._awaiting_force_lock_confirm = null;
            const picktyp = false;
            await pline(`You start bashing it with ${forceLockWeaponName(state.weapon)}.`);
            game._force_lock = {
                box: state.box,
                weapon: state.weapon,
                chance: forceLockChance(state.weapon),
                picktyp,
                usedtime: 0,
            };
            game.context.move = 1;
            return;
        }
        if (ch === 'n' || ch === 'N') {
            game._awaiting_force_lock_confirm = null;
            await pline('You decide not to force the issue.');
            game.context.move = 1;
            return;
        }
        if (ch === 'q' || ch === 'Q' || ch === '\x1b') {
            game._awaiting_force_lock_confirm = null;
            game.context.move = 0;
            return;
        }
        const prompt = `There is ${inventoryObjectName(state.box)} here; force its lock? [ynq] (q)`;
        await showPromptLine(prompt, { trailingInputSpace: true });
        game.context.move = 0;
        return;
    }

    if (game._awaiting_loot_direction) {
        await handleLootDirection(ch);
        return;
    }

    if (game._awaiting_chat_direction) {
        game._awaiting_chat_direction = false;
        clear_pending_message();
        const dx = DIR_DX[ch] ?? 0;
        const dy = DIR_DY[ch] ?? 0;
        let tookTime = false;
        if (ch === '.') {
            await pline('Talking to yourself is a bad habit for a dungeoneer.');
        } else if (ch === '\x1b') {
            clear_pending_message();
        } else if (ch === '<' || ch === '>') {
            await pline(`They won't hear you ${ch === '<' ? 'up' : 'down'} there.`);
        } else if (dx || dy) {
            // C ref: sounds.c:dochat().  Chatting toward empty floor is
            // silent; only walls/secret doors produce a response.
            const tx = (game.u?.ux ?? 0) + dx;
            const ty = (game.u?.uy ?? 0) + dy;
            const loc = game.level?.at(tx, ty);
            if (loc && (IS_WALL(loc.typ) || loc.typ === SDOOR)) {
                await pline("It's like talking to a wall.");
            } else {
                const mon = mon_at(tx, ty);
                if (mon && mon.msleeping) {
                    await pline(`${monsterName(mon).replace(/^./, c => c.toUpperCase())} seems not to notice you.`);
                } else if (mon) {
                    tookTime = await chatMonsterNoise(mon);
                }
            }
        } else {
            clear_pending_message();
        }
        game.context.move = tookTime ? 1 : 0;
        return;
    }

    if (game._awaiting_enhance_without_practice) {
        game._awaiting_enhance_without_practice = false;
        clear_pending_message();
        if (ch === 'y' || ch === 'Y') {
            showEnhanceSkillsMenu();
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_spell_direction) {
        clear_pending_message();
        const state = game._awaiting_spell_direction;
        game._awaiting_spell_direction = null;
        if (!'hykulnjb<>.'.includes(ch)) {
            game.context.move = 0;
            await pline('What a strange direction!');
            return;
        }
        if (ch === '<' || ch === '>') {
            game.context.move = 0;
            await pline(`The magical energy is released!`);
            return;
        }
        await finishCastSpell(state.entry, state.pseudo, ch);
        return;
    }

    if (game._awaiting_untrap_direction) {
        await handleUntrapDirection(ch);
        return;
    }

    if (game._awaiting_jump_prompt) {
        if (isGetposMovementKey(ch)) {
            const cursor = currentJumpCursor();
            moveGetposCursor(cursor, ch);
            await describeJumpCursor();
        } else if (ch === ' ') {
            await describeJumpCursor();
        } else if (ch === '?') {
            await showGetposHelpScreen('jump');
        } else if (ch === '$') {
            await showGetposGoalPrompt('jump');
        } else if (ch === '.' || ch === ',' || ch === ';' || ch === ':') {
            await finishJumpToCursor();
            return;
        } else if (ch === '\x1b') {
            game._awaiting_jump_prompt = false;
            game._jump_cursor = null;
            clear_pending_message();
            setTravelMapCursor();
        } else {
            await pline(`Unknown direction: '${getposKeyDisplay(ch)}' (use 'h', 'j', 'k', 'l' or '.').`);
            const cursor = currentJumpCursor();
            setTravelMapCursorAt(cursor.x, cursor.y);
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_travel_prompt) {
        if (ch === '>' || ch === '<') {
            const st = travelFeatureStair(ch === '<');
            if (st) {
                game._travel_cursor = { x: st.sx, y: st.sy };
                await describeTravelCursor();
            } else {
                await pline(`Can't find dungeon feature '${ch}'.`);
                const cursor = currentTravelCursor();
                setTravelMapCursorAt(cursor.x, cursor.y);
            }
        } else if (ch === '\r' || ch === '\n') {
            const cursor = currentTravelCursor();
            truncateGetposCursorToMap(cursor, 0, 8);
            await describeTravelCursor();
        } else if (ch === ' ') {
            await describeTravelCursor();
        } else if (ch === '?') {
            await showGetposHelpScreen('travel');
        } else if (ch === '$') {
            await showGetposGoalPrompt('travel');
        } else if (isGetposMovementKey(ch)) {
            const cursor = currentTravelCursor();
            moveGetposCursor(cursor, ch);
            await describeTravelCursor();
        } else if (await handleGetposFeatureSearch(ch, currentTravelCursor(), describeTravelCursor)) {
            // handled by getpos feature search
        } else if (ch === '.' || ch === ',') {
            const cursor = currentTravelCursor();
            if (game.u?.ux === cursor.x && game.u?.uy === cursor.y) {
                game._awaiting_travel_prompt = false;
                game._travel_cursor = null;
                await pline('You are already here.');
                setTravelMapCursor();
                game.context.move = 0;
                return;
            }
            setTravelCachedTarget({ x: cursor.x, y: cursor.y });
            game._awaiting_travel_prompt = false;
            game._travel_cursor = null;
            const pendingBeforeTravel = game._pending_message || '';
            const clearGetposError = /^(?:Unknown direction:|Can't find dungeon feature )/.test(pendingBeforeTravel);
            if (clearGetposError) clear_pending_message();
            const startedTravel = await beginTravelRunToCachedTarget();
            if (clearGetposError && !startedTravel && pendingBeforeTravel) await pline(pendingBeforeTravel);
            game.context.move = startedTravel ? 1 : 0;
            return;
        } else if (ch === '\x1b') {
            game._awaiting_travel_prompt = false;
            game._travel_cursor = null;
            clear_pending_message();
        } else {
            await pline(`Unknown direction: '${getposKeyDisplay(ch)}' (use 'h', 'j', 'k', 'l' or '.').`);
            const cursor = currentTravelCursor();
            setTravelMapCursorAt(cursor.x, cursor.y);
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_teleport_prompt) {
        if (isGetposMovementKey(ch)) {
            const cursor = currentTeleportCursor();
            moveGetposCursor(cursor, ch);
            await describeTeleportCursor();
        } else if (ch === '\r' || ch === '\n') {
            const cursor = currentTeleportCursor();
            truncateGetposCursorToMap(cursor, 0, 8);
            await describeTeleportCursor();
        } else if (ch === ' ') {
            await describeTeleportCursor();
        } else if (ch === '?') {
            await showGetposHelpScreen('teleport');
        } else if (ch === '$') {
            await showGetposGoalPrompt('teleport');
        } else if (await handleGetposFeatureSearch(ch, currentTeleportCursor(), describeTeleportCursor)) {
            // handled by getpos feature search
        } else if (ch === '.' || ch === ',') {
            const cursor = currentTeleportCursor();
            game._awaiting_teleport_prompt = false;
            game._teleport_cursor = null;
            if (teleokBasic(cursor.x, cursor.y, false)) {
                await teledsBasic(cursor.x, cursor.y);
            } else {
                await pline('Sorry...');
                const deferTurnUntilLookHere = game.flags?.verbose === false && !game._more;
                // C refs: src/teleport.c:scrolltele(), src/teleport.c:teleds().
                // With !verbose there is no materialize line to pack after
                // "Sorry...", so the following look-here/floor-list text waits
                // behind a tty More boundary; the command's time is spent when
                // that interrupted display sequence resumes.
                if (deferTurnUntilLookHere) {
                    queue_more_prompt();
                }
                await safeTeledsBasic({ deferLookHereBehindMore: true });
                noteTeleportNutritionDebt();
                game.context.move = deferTurnUntilLookHere ? 0 : 1;
                return;
            }
            noteTeleportNutritionDebt();
            game.context.move = 1;
            return;
        } else if (ch === '\x1b') {
            // C ref: src/teleport.c:dotele() -> tele()/scrolltele().  The
            // controlled-teleport getpos may be aborted, but deliberate
            // teleport-at-will still consumes nutrition and a turn.
            game._awaiting_teleport_prompt = false;
            game._teleport_cursor = null;
            clear_pending_message();
            noteTeleportNutritionDebt();
            game.context.move = 1;
            return;
        } else {
            await pline(`Unknown direction: '${getposKeyDisplay(ch)}' (use 'h', 'j', 'k', 'l' or '.').`);
            const cursor = currentTeleportCursor();
            setTravelMapCursorAt(cursor.x, cursor.y);
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_monster_detect_browse) {
        if (isGetposMovementKey(ch)) {
            const cursor = currentMonsterDetectCursor();
            moveGetposCursor(cursor, ch);
            await describeMonsterDetectCursor();
        } else if (ch === '?' || ch === '\x12') {
            await showGetposHelpScreen('monster_detect');
        } else if (ch === '$') {
            await showGetposGoalPrompt('monster_detect');
        } else if (ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b') {
            await finishMonsterDetectBrowse();
        } else {
            await pline(`Unknown direction: '${getposKeyDisplay(ch)}' (aborted).`);
            await finishMonsterDetectBrowse();
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_farlook_prompt) {
        if (isGetposMovementKey(ch)) {
            const cursor = currentFarlookCursor();
            moveGetposCursor(cursor, ch);
            await describeFarlookCursor();
        } else if (ch === ' ') {
            await describeFarlookCursor();
        } else if (ch === '?') {
            await showGetposHelpScreen('farlook');
        } else if (ch === '$') {
            await showGetposGoalPrompt('farlook');
        } else if (ch === '\x12') {
            const cursor = currentFarlookCursor();
            await showPromptLine('Move cursor to a monster, object or location:');
            setTravelMapCursorAt(cursor.x, cursor.y);
        } else if (await handleGetposFeatureSearch(ch, currentFarlookCursor(), describeFarlookCursor)) {
            // handled by getpos feature search
        } else if (ch === '.' || ch === ',' || ch === ';' || ch === ':') {
            const cursor = currentFarlookCursor();
            const quick = !!game._farlook_quick_mode;
            game._awaiting_farlook_prompt = false;
            game._farlook_cursor = null;
            game._farlook_quick_mode = false;
            game._prompt_cursor = null;
            const moreInfoTopic = quick ? '' : farlookMoreInfoTopic(cursor.x, cursor.y);
            const continuationRow = moreInfoTopic ? '' : farlookContinuation(cursor.x, cursor.y);
            game._message_continuation_row = continuationRow;
            if (moreInfoTopic) {
                game._farlook_more_info_after_more = { topic: moreInfoTopic, x: cursor.x, y: cursor.y };
                queue_more_prompt();
            } else if (continuationRow || (!quick && farlookNeedsPromptAfterFullDescription(cursor.x, cursor.y))) {
                // C refs: pager.c:do_look(), getpos.c:getpos().  After a
                // blocking non-quick farlook explanation, do_look() loops
                // back into getpos() at the same cursor position.
                if (!quick) game._farlook_resume_after_more = { x: cursor.x, y: cursor.y };
                if (continuationRow) game._more_next_message_row = true;
                queue_more_prompt();
            }
            await pline(farlookFullDescription(cursor.x, cursor.y));
        } else if (ch === '\x1b') {
            game._awaiting_farlook_prompt = false;
            game._farlook_cursor = null;
            game._farlook_quick_mode = false;
            clear_pending_message();
        } else {
            await pline(`Unknown direction: '${getposKeyDisplay(ch)}' (use 'h', 'j', 'k', 'l' or '.').`);
            const cursor = currentFarlookCursor();
            setTravelMapCursorAt(cursor.x, cursor.y);
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_travel_cursor) {
        if (ch === ' ') {
            await pline(heroGetposDescription());
            setTravelMapCursor();
        } else if (ch === '.') {
            game._awaiting_travel_cursor = false;
            await pline('You are already here.');
            setTravelMapCursor();
        } else if (ch === '\x1b') {
            game._awaiting_travel_cursor = false;
            clear_pending_message();
        } else {
            setTravelMapCursor();
        }
        game.context.move = 0;
        return;
    }

    if (game._travel_path_failed_linger) {
        if (ch === ' ') {
            game.context.move = 0;
            return;
        }
        if (ch === '.') {
            game._travel_path_failed_linger = false;
            game.context.move = await beginTravelRunToCachedTarget() ? 1 : 0;
            return;
        }
        game._travel_path_failed_linger = false;
    }

    if (game._intrinsic_menu) {
        const menu = game._intrinsic_menu;
        game._override_prev = null;
        if (ch >= '0' && ch <= '9') {
            menu.count = `${menu.count || ''}${ch}`;
            renderIntrinsicMenu(menu);
            game.context.move = 0;
            return;
        }
        if (ch === '.') {
            const count = menu.count ? Number.parseInt(menu.count, 10) : 0;
            selectIntrinsicMenuPage(menu, count);
            menu.count = '';
            renderIntrinsicMenu(menu);
            game.context.move = 0;
            return;
        }
        if (ch === '\x1b') {
            game._intrinsic_menu = null;
            clearOverrideScreen();
            await docrt();
            game.context.move = 0;
            return;
        }
        if (ch === ' ' || ch === '>' || ch === '<' || ch === '^' || ch === '|') {
            if (ch === ' ' && menu.page < menu.pages.length - 1) {
                menu.page++;
                menu.count = '';
                renderIntrinsicMenu(menu);
                game.context.move = 0;
                return;
            }
            if (ch === '>' && menu.page < menu.pages.length - 1) {
                menu.page++;
                menu.count = '';
                renderIntrinsicMenu(menu);
                game.context.move = 0;
                return;
            }
            if (ch === '<' && menu.page > 0) {
                menu.page--;
                menu.count = '';
                renderIntrinsicMenu(menu);
                game.context.move = 0;
                return;
            }
            if (ch === '^' && menu.page > 0) {
                menu.page = 0;
                menu.count = '';
                renderIntrinsicMenu(menu);
                game.context.move = 0;
                return;
            }
            if (ch === '|' && menu.page < menu.pages.length - 1) {
                menu.page = menu.pages.length - 1;
                menu.count = '';
                renderIntrinsicMenu(menu);
                game.context.move = 0;
                return;
            }
            if (ch !== ' ') {
                game.context.move = 0;
                return;
            }
            await commitIntrinsicMenuSelection(menu);
            game.context.move = 0;
            return;
        }
        if (ch === '\r' || ch === '\n') {
            await commitIntrinsicMenuSelection(menu);
            game.context.move = 0;
            return;
        }
        if (/^[A-Za-z]$/.test(ch)) {
            const row = intrinsicRowForSelector(menu, ch);
            if (row) {
                const count = menu.count ? Number.parseInt(menu.count, 10) : 0;
                updateIntrinsicMenuSelection(menu, row, count);
                menu.count = '';
                renderIntrinsicMenu(menu);
            }
            game.context.move = 0;
            return;
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_scroll_level_teleport) {
        const prompt = 'To what level do you want to teleport? ';
        if (ch >= '0' && ch <= '9') {
            game._scroll_level_teleport_input = `${game._scroll_level_teleport_input || ''}${ch}`;
            await showPromptLine(`${prompt}${game._scroll_level_teleport_input}`);
            game.context.move = 0;
            return;
        }
        clear_pending_message();
        game._awaiting_scroll_level_teleport = false;
        const requested = Number(game._scroll_level_teleport_input || 0);
        game._scroll_level_teleport_input = '';
        const confused = !!(game.u?.uprops?.confusion || game.u?.uconfusion);
        if (confused && rnl(5)) {
            await pline('Oops...');
            queue_more_prompt();
            await flush_screen(1);
            game._latched_more_screen = serialize_terminal_grid(game.nhDisplay);
            game._latched_more_cursor = [Math.min('Oops...--More--'.length, 79), 0, 1];
            game._latched_more_keep_until_dismiss = true;
        const randomTarget = randomTeleportLevelForHero();
        // C ref: read.c:seffects().  The scroll's wisdom exercise lands
        // after the confused level choice has fallen through to a random
        // destination.
        exercise(A_WIS, true);
        await performLevelTeleport(randomTarget, { deferMaterializeBehindMore: true, spendsTurn: true });
        game.context.move = 0;
        return;
    }
    if ((ch === '\r' || ch === '\n') && requested > 0) {
        await performLevelTeleport(requested, { deferMaterializeBehindMore: !!game._more, spendsTurn: true });
        game.context.move = 1;
        return;
    }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_level_teleport) {
        const prompt = 'To what level do you want to teleport? ';
        if (game._level_teleport_help_pending) {
            if (ch === '\r' || ch === '\n') {
                clear_pending_message();
                game._awaiting_level_teleport = false;
                game._level_teleport_help_pending = false;
                game._level_teleport_input = '';
                const menu = buildLevelTeleportMenu();
                game._level_teleport_menu_screen = menu.screen;
                game._level_teleport_menu_choices = menu.choices;
                showOverride(menu.screen, [9, 23]);
            }
            game.context.move = 0;
            return;
        }
        if (ch === '?') {
            game._level_teleport_input = '?';
            game._level_teleport_help_pending = true;
            await showPromptLine(`${prompt}?`);
            game.context.move = 0;
            return;
        }
        if (ch >= '0' && ch <= '9') {
            game._level_teleport_input = `${game._level_teleport_input || ''}${ch}`;
            await showPromptLine(`${prompt}${game._level_teleport_input}`);
            game.context.move = 0;
            return;
        }
        const target = Number(game._level_teleport_input || 0);
        clear_pending_message();
        game._awaiting_level_teleport = false;
        game._level_teleport_input = '';
        if ((ch === '\r' || ch === '\n') && target > 0)
            game._pending_level_teleport_target = target;
        game.context.move = 0;
        return;
    }

    if (game._awaiting_rub_item) {
        clear_pending_message();
        game._awaiting_rub_item = false;
        if (ch === '\x1b' || ch === ' ' || ch === '\r' || ch === '\n') {
            await pline('Never mind.');
            game.context.move = 0;
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj) {
            await pline("You don't have that object.");
            game.context.move = 0;
            return;
        }
        if (obj !== heroWieldedWeapon()) {
            setHeroWieldedWeapon(obj);
            await pline(`You now wield ${inventoryObjectName(obj, { includeCharges: false })}.`);
            game.context.move = 1;
            return;
        }
        if (obj.otyp === MAGIC_LAMP) {
            await pline('Nothing happens.');
        } else {
            await pline("Sorry, I don't know how to use that.");
        }
        game.context.move = 1;
        return;
    }

    if (game._awaiting_invoke_item) {
        clear_pending_message();
        game._awaiting_invoke_item = false;
        if (ch === '\x1b' || ch === ' ' || ch === '\r' || ch === '\n') {
            await pline('Never mind.');
            game.context.move = 0;
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj) {
            await pline("You don't have that object.");
            game.context.move = 0;
            return;
        }
        await pline('Nothing happens.');
        game.context.move = 1;
        return;
    }

    if (game._awaiting_wish) {
        const prompt = 'For what do you wish? ';
        if (ch === '\r' || ch === '\n') {
            const wish = game._wish_input || '';
            clear_pending_message();
            game._awaiting_wish = false;
            game._wish_input = '';
            const obj = make_wish_object(wish);
            if (obj) await pline(`${inventoryListing(obj, { includeCharges: false })}.`);
            game.context.move = 0;
            return;
        }
        if (ch === '\x1b') {
            clear_pending_message();
            game._awaiting_wish = false;
            game._wish_input = '';
            game.context.move = 0;
            return;
        }
        game._wish_input = `${game._wish_input || ''}${ch}`;
        await showPromptLine(`${prompt}${game._wish_input}`);
        game.context.move = 0;
        return;
    }

    if (game._awaiting_polyself) {
        const prompt = 'Become what kind of monster? [type the name]';
        if (ch === '\r' || ch === '\n') {
            const input = game._polyself_input || '';
            clear_pending_message();
            game._awaiting_polyself = false;
            game._polyself_input = '';
            await finishWizardPolyself(input);
            return;
        }
        if (ch === '\x1b') {
            clear_pending_message();
            game._awaiting_polyself = false;
            game._polyself_input = '';
            await pline('Never mind.');
            game.context.move = 0;
            return;
        }
        game._polyself_input = `${game._polyself_input || ''}${ch}`;
        await showPromptLine(`${prompt} ${game._polyself_input}`);
        game.context.move = 0;
        return;
    }

    if (game._awaiting_create_monster) {
        const prompt = 'Create what kind of monster?';
        if (ch === '\r' || ch === '\n') {
            const input = game._create_monster_input || '';
            clear_pending_message();
            game._awaiting_create_monster = false;
            game._create_monster_input = '';
            const ptr = monster_by_user_name(input);
            if (ptr) {
                const mmflags = C.MM_NOEXCLAM;
                const mon = makemon(ptr, game.u?.ux || 0, game.u?.uy || 0, mmflags);
                const name = monsterDisplayName(ptr);
                if (mon) {
                    newsym(mon.mx, mon.my);
                    // C refs: src/read.c:create_particular_creation(),
                    // src/makemon.c:makemon().  ^G/#wizgenesis passes
                    // MM_NOEXCLAM and makemon() only announces monsters the
                    // hero can see or sense.
                    if (heroCanSpotMonsterForHit(mon)) {
                        const where = dist2(mon.mx, mon.my, game.u?.ux ?? 0, game.u?.uy ?? 0) <= 2
                            ? ' next to you'
                            : (dist2(mon.mx, mon.my, game.u?.ux ?? 0, game.u?.uy ?? 0) <= 64 ? ' close by' : '');
                        await pline(`${sentenceStart(indefiniteArticle(name))} ${name} appears${where}.`);
                    }
                }
            }
            else await pline("I've never heard of such monsters.");
            game.context.move = 0;
            return;
        }
        if (ch === '\x1b') {
            clear_pending_message();
            game._awaiting_create_monster = false;
            game._create_monster_input = '';
            game.context.move = 0;
            return;
        }
        game._create_monster_input = `${game._create_monster_input || ''}${ch}`;
        await showPromptLine(`${prompt}${game._create_monster_input ? ` ${game._create_monster_input}` : ''}`);
        game.context.move = 0;
        return;
    }

    if (game._awaiting_potion_call_name) {
        const state = game._awaiting_potion_call_name;
        const prompt = `Call a ${state.appearance} potion:`;
        if (ch === '\r' || ch === '\n') {
            clear_pending_message();
            game._awaiting_potion_call_name = null;
            game.context.move = 1;
            return;
        }
        if (ch === '\x7f' || ch === '\b') {
            state.text = state.text.slice(0, -1);
        } else if (ch !== '\x1b') {
            state.text = `${state.text}${ch}`;
        }
        await showPromptLine(`${prompt}${state.text ? ` ${state.text}` : ''}`, { trailingInputSpace: !state.text });
        game.context.move = 0;
        return;
    }

    if (game._awaiting_scroll_call_name) {
        const state = game._awaiting_scroll_call_name;
        const prompt = `Call a ${state.appearance}:`;
        if (ch === '\r' || ch === '\n' || ch === '\x1b') {
            const name = (state.text || '').trim();
            if (name && ch !== '\x1b') {
                markObjectEncountered(state.otyp);
                if (!(game.calledObjects instanceof Map)) game.calledObjects = new Map();
                game.calledObjects.set(state.otyp, name);
            }
            clear_pending_message();
            game._awaiting_scroll_call_name = null;
            game._monster_turn_paused_for_more = false;
            game._pre_turn_more_waiting = false;
            game._resume_monster_turn = true;
            game.context.move = 1;
            return;
        }
        if (ch === '\x7f' || ch === '\b') {
            state.text = state.text.slice(0, -1);
        } else {
            state.text = `${state.text || ''}${ch}`;
        }
        await showPromptLine(`${prompt}${state.text ? ` ${state.text}` : ''}`, { trailingInputSpace: !state.text });
        game.context.move = 0;
        return;
    }

    if (game._awaiting_engrave_text) {
        const state = game._awaiting_engrave_text;
        const prompt = 'What do you want to write in the dust here?';
        if (ch === '\r' || ch === '\n') {
            const text = state.text || '';
            clear_pending_message();
            game._awaiting_engrave_text = null;
            if (!text.trim()) {
                game.context.move = 0;
                await pline('Never mind.');
                return;
            }
            // C refs: engrave.c:doengrave(), engrave.c:make_engr_at().
            noteLiterateConduct();
            for (const c of text) if (c !== ' ') rn2(25);
            if (text === 'Elbereth') exercise(A_WIS, true);
            if (game.level) {
                game.level.engravings = (game.level.engravings || [])
                    .filter((ep) => ep.x !== game.u?.ux || ep.y !== game.u?.uy);
                game.level.engravings.unshift({
                    x: game.u?.ux,
                    y: game.u?.uy,
                    text,
                    pristine: text,
                    epoch: game.moves || 0,
                    type: C.DUST,
                    guardobjects: false,
                    eread: true,
                    erevealed: true,
                });
            }
            game.context.move = 1;
            return;
        }
        if (ch === '\x1b') {
            clear_pending_message();
            game._awaiting_engrave_text = null;
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        if (ch === '\x7f' || ch === '\b') {
            state.text = state.text.slice(0, -1);
        } else {
            state.text = `${state.text || ''}${ch}`;
        }
        await showPromptLine(`${prompt}${state.text ? ` ${state.text}` : ''}`, { trailingInputSpace: !state.text });
        game.context.move = 0;
        return;
    }

    if (game._awaiting_dip_fountain_confirm) {
        const obj = game._awaiting_dip_fountain_confirm;
        game._awaiting_dip_fountain_confirm = null;
        if (ch === 'y' || ch === 'Y') {
            const msg = dipFountainEffect(obj);
            if (msg) {
                clear_pending_message();
                await pline(msg);
            } else {
                game._prompt_cursor = null;
            }
            game.context.move = 1;
            return;
        }
        clear_pending_message();
        game.context.move = 0;
        return;
    }

    if (game._awaiting_dip_item) {
        if (ch === '\x1b') {
            // C ref: potion.c:dodip() -> getobj().  Escape cancels the
            // inventory query without printing "Never mind."; the old query
            // remains on the topline until the next command starts.
            game._awaiting_dip_item = false;
            game._prompt_cursor = null;
            game.context.move = 0;
            return;
        }
        clear_pending_message();
        if (ch === '?' || ch === '*') {
            game.context.move = 0;
            return;
        }
        game._awaiting_dip_item = false;
        if (ch === ' ') {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        const loc = game.level?.at(game.u?.ux, game.u?.uy);
        if (obj && loc?.typ === C.FOUNTAIN) {
            await showDipFountainConfirm(obj);
        } else {
            game.context.move = 0;
        }
        return;
    }

    if (game._awaiting_drink_item) {
        clear_pending_message();
        if (ch === '?' || ch === '*') {
            await showPotionMenu();
            game.context.move = 0;
            return;
        }
        game._awaiting_drink_item = false;
        if (ch === ' ' || ch === '\x1b') {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        await drinkPotion(obj, idx);
        return;
    }

    if (game._awaiting_fountain_drink_confirm) {
        clear_pending_message();
        game._awaiting_fountain_drink_confirm = false;
        if (ch === 'y' || ch === 'Y') await drinkFountain();
        else {
            game.context.move = 0;
            await showDrinkInventoryPrompt();
        }
        return;
    }

    if (game._awaiting_sink_drink_confirm) {
        clear_pending_message();
        game._awaiting_sink_drink_confirm = false;
        if (ch === 'y' || ch === 'Y') await drinkSink();
        else {
            game.context.move = 0;
            await showDrinkInventoryPrompt();
        }
        return;
    }

    if (game._awaiting_wear_item) {
        clear_pending_message();
        game._awaiting_wear_item = false;
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (obj && (obj.oclass === ARMOR_CLASS || obj.oclass === AMULET_CLASS || obj.oclass === RING_CLASS)) {
            await start_wearing_object(obj);
        } else if (ch === 'b') {
            game.context.move = 0;
            await pline('You are already wearing that!');
        } else if (ch === '\x1b') {
            game.context.move = 0;
            await pline('Never mind.');
        } else {
            game.context.move = 0;
            await pline("You can't wear that.");
        }
        return;
    }

    if (game._awaiting_wield_item) {
        clear_pending_message();
        game._awaiting_wield_item = false;
        if (ch === '-') {
            const old = heroWieldedWeapon();
            setHeroWieldedWeapon(null);
            game.context.move = old ? 1 : 0;
            await pline(old ? 'You are empty handed.' : 'You are already empty handed.');
            return;
        }
        if (ch === '\x1b' || ch === ' ') {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj || obj.oclass === COIN_CLASS) {
            game.context.move = 0;
            game._resume_wield_prompt_after_more = true;
            await pline("You don't have that object.");
            queue_more_prompt();
            return;
        }
        if ((obj.owornmask || 0) & (C.W_ARMOR | C.W_ACCESSORY | C.W_SADDLE)) {
            game.context.move = 0;
            await pline('You cannot wield that!');
            return;
        }
        if (obj === heroWieldedWeapon()) {
            game.context.move = 0;
            await pline('You are already wielding that!');
            return;
        }
        if (obj === heroSecondaryWeapon()) {
            // C ref: src/wield.c:doswapweapon().  Choosing the alternate
            // weapon from #wield swaps primary/secondary and prints the old
            // primary after the new primary's prinv() line.
            const old = heroWieldedWeapon();
            setHeroSecondaryWeapon(null);
            setHeroWieldedWeapon(obj);
            await pline(`${inventoryListing(obj, { includeWorn: true })}.`);
            if (old && old !== obj) {
                setHeroSecondaryWeapon(old);
                await printInventoryLineAfterCurrentTopline(`${inventoryListing(old, { includeWorn: true })}.`);
            }
            game.context.move = 1;
            return;
        }
        const old = heroWieldedWeapon();
        setHeroWieldedWeapon(obj);
        await pline(`${inventoryListing(obj, { includeWorn: true })}.`);
        if (optionBool('flags', 'pushweapon') && old && old !== obj)
            setHeroSecondaryWeapon(old);
        game.context.move = 1;
        return;
    }

    if (game._awaiting_spellbook_refresh_confirm) {
        if (ch === 'y' || ch === 'Y') {
            clear_pending_message();
            game._awaiting_spellbook_refresh_confirm = false;
            game.context.move = 0;
            return;
        }
        if (ch === 'n' || ch === 'N' || ch === '\x1b' || ch === ' ' || ch === '\r' || ch === '\n') {
            game._awaiting_spellbook_refresh_confirm = false;
            game._prompt_cursor = null;
            game.context.move = 0;
            return;
        }
        await showPromptLine('Refresh your memory anyway? [yn] (n)', { trailingInputSpace: true });
        game.context.move = 0;
        return;
    }

    if (game._awaiting_quiver_confirm) {
        clear_pending_message();
        const obj = game._awaiting_quiver_confirm;
        game._awaiting_quiver_confirm = null;
        if (ch !== 'y') {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        obj.alternate = false;
        setQuiveredObject(obj);
        game.context.move = 0;
        await pline(`${inventoryListing(obj, { includeWorn: true })}.`);
        return;
    }

    if (game._awaiting_quiver_item) {
        clear_pending_message();
        game._awaiting_quiver_item = false;
        if (ch === ' ' || ch === '\x1b') {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        if (ch === '-') {
            setQuiveredObject(null);
            game.context.move = 0;
            await pline('You now have no ammunition readied.');
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj || obj.oclass !== WEAPON_CLASS) {
            game.context.move = 0;
            await pline("You don't have that object.");
            return;
        }
        if (obj.quivered) {
            game.context.move = 0;
            await pline('That ammunition is already readied!');
            return;
        }
        if (obj.alternate) {
            game._awaiting_quiver_confirm = obj;
            game.context.move = 0;
            await showPromptLine('That is your alternate weapon.  Ready it instead? [ynq] (q)', { trailingInputSpace: true });
            return;
        }
        setQuiveredObject(obj);
        game.context.move = 0;
        await pline(`${inventoryListing(obj, { includeWorn: true })}.`);
        return;
    }

    if (game._awaiting_drop_item) {
        const dropPrompt = game._pending_message || '';
        game._awaiting_drop_item = false;
        const idx = inventoryIndexForLetter(ch);
        let obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj && ch === '$' && (game._goldCount || 0) > 0) {
            obj = { otyp: GOLD_PIECE, oclass: COIN_CLASS, quan: game._goldCount, invlet: '$' };
        }
        if (!obj) {
            clear_pending_message();
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        if (obj.otyp === GOLD_PIECE || obj.oclass === COIN_CLASS) {
            const amount = obj.quan || game._goldCount || 0;
            if (idx >= 0) game.inventory.splice(idx, 1);
            game._goldCount = 0;
            obj.quan = amount;
            obj.invlet = '$';
            place_object(obj, game.u.ux, game.u.uy);
            clear_pending_message();
            await pline(`You drop ${amount} gold ${amount === 1 ? 'piece' : 'pieces'}.`);
            game.context.move = 1;
            return;
        }
        game.inventory.splice(idx, 1);
        place_object(obj, game.u.ux, game.u.uy);
        if (game.flags?.verbose === false) {
            // C refs: src/do.c:drop(), src/invent.c:getobj().
            // Terse drop suppresses "You drop ..." without preserving the
            // consumed getobj prompt cursor; the prompt text remains visible
            // for the turn snapshot when no drop pline replaces it.
            game._pending_message = '';
            game._pending_message_wrap_cols = 0;
            if (dropPrompt) game._topline_residue = dropPrompt.trimEnd();
            game._prompt_cursor = null;
            game.context.move = 1;
            return;
        }
        clear_pending_message();
        await pline(`You drop ${dropObjectName(obj)}.`);
        game.context.move = 1;
        return;
    }

    if (game._awaiting_puton_item) {
        clear_pending_message();
        game._awaiting_puton_item = false;
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!is_puton_candidate(obj)) {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        await start_wearing_object(obj);
        return;
    }

    if (game._awaiting_takeoff_item) {
        game._awaiting_takeoff_item = false;
        if (ch === ' ' || ch === '\x1b') {
            clear_pending_message();
            game.context.move = 0;
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!is_worn_takeoff_candidate(obj)) {
            clear_pending_message();
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        await start_taking_off_object(obj);
        return;
    }

    if (game._awaiting_read_item) {
        clear_pending_message();
        if (ch === ' ' || ch === '\x1b') {
            game._awaiting_read_item = false;
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj) {
            game.context.move = 0;
            game._resume_read_prompt_after_more = true;
            await pline("You don't have that object.");
            queue_more_prompt();
            return;
        }
        game._awaiting_read_item = false;
        if (obj.oclass !== SCROLL_CLASS && obj.oclass !== SPBOOK_CLASS) {
            game.context.move = 0;
            await pline('That is a silly thing to read.');
            return;
        }
        noteLiterateConduct();
        if (obj.oclass === SPBOOK_CLASS) {
            const info = spellbookSpellInfo(obj);
            const alreadyKnown = info && spellIsActuallyKnown(obj, info);
            if (alreadyKnown) {
                // C ref: src/spell.c:study_book().
                await pline(`You know "${info.name}" quite well already.`);
                game._spellbook_refresh_prompt_after_more = { otyp: obj.otyp };
                queue_more_prompt();
                game.context.move = 0;
                return;
            }
            if (info) {
                if (game._defer_next_spellbook_study_for_fast_extra && game._fast_extra_action_pending) {
                    game._defer_next_spellbook_study_for_fast_extra = false;
                    game._deferred_spellbook_study = {
                        obj,
                        info: { ...info },
                        spellKey: spellKeyFromRecord(obj, info),
                    };
                    game.context.move = 1;
                    return;
                }
                game._defer_next_spellbook_study_for_fast_extra = false;
                await beginStudySpellbook(obj, info);
                return;
            }
            game.context.move = 0;
            return;
        }
        if (obj.otyp === SCR_REMOVE_CURSE) {
            await readScrollOfRemoveCurse(obj, idx);
            return;
        }
        if (obj.otyp === SCR_ENCHANT_WEAPON) {
            await readScrollOfEnchantWeapon(obj, idx);
            return;
        }
        if (obj.otyp === SCR_LIGHT) {
            await readScrollOfLight(obj, idx);
            return;
        }
        if (obj.otyp === SCR_TELEPORTATION) {
            await readScrollOfTeleportation(obj, idx);
            return;
        }
        if (obj.otyp === SCR_PUNISHMENT) {
            await readScrollOfPunishment(obj, idx);
            return;
        }
        if (obj.otyp === SCR_IDENTIFY) {
            await readScrollOfIdentify(obj, idx);
            return;
        }
        if (obj.otyp === SCR_MAGIC_MAPPING) {
            await readScrollOfMagicMapping(obj);
            return;
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_throw_item) {
        clear_pending_message();
        game._awaiting_throw_item = false;
        if (ch === ' ' || ch === '\x1b') {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        if (ch === '$') {
            game._awaiting_throw_direction = { otyp: GOLD_PIECE, oclass: COIN_CLASS, quan: game._goldCount || 0 };
            game.context.move = 0;
            await showPromptLine('In what direction? ');
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj) {
            game.context.move = 0;
            game._resume_throw_prompt_after_more = true;
            await pline("You don't have that object.");
            queue_more_prompt();
            return;
        }
        game._awaiting_throw_direction = obj;
        game.context.move = 0;
        await showPromptLine('In what direction? ');
        return;
    }

    if (game._awaiting_ring_finger) {
        clear_pending_message();
        const obj = game._awaiting_ring_finger;
        game._awaiting_ring_finger = null;
        if (ch !== 'r' && ch !== 'R' && ch !== 'l' && ch !== 'L') {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        obj.wornSide = (ch === 'r' || ch === 'R') ? 'right' : 'left';
        obj.owornmask = obj.wornSide === 'right' ? C.W_RINGR : C.W_RINGL;
        if (obj.otyp === RIN_REGENERATION) refreshRingRegenerationExtrinsic();
        await pline(`${inventoryListing(obj)} (on ${obj.wornSide} hand).`);
        game.context.move = 1;
        return;
    }

    if (game._awaiting_zap_item) {
        if (ch === '?' || ch === '*') {
            clear_pending_message();
            await showInventoryClassMenu(WAND_CLASS);
            game._awaiting_zap_item = true;
            game.context.move = 0;
            return;
        }
        clear_pending_message();
        game._awaiting_zap_item = false;
        clearOverrideScreen();
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj || obj.oclass !== WAND_CLASS) {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        if (!await zappableWand(obj)) {
            game.context.move = 1;
            await pline('Nothing happens.');
            return;
        }
        if (await maybeBackfireWand(obj)) return;
        if (obj.otyp === WAN_SECRET_DOOR_DETECTION) {
            // C ref: zap.c:zapnodir() -> detect.c:findit().
            exercise(A_WIS, true);
            obj.knownName = true;
            await pline("You don't find anything.");
            game.context.move = 1;
            return;
        }
        game._awaiting_zap_direction = obj;
        game.context.move = 0;
        await showPromptLine('In what direction? ');
        return;
    }

    if (game._awaiting_throw_direction) {
        clear_pending_message();
        const throwObj = game._awaiting_throw_direction;
        game._awaiting_throw_direction = null;
        if (!'hykulnjb<>.'.includes(ch)) {
            game.context.move = 0;
            if (game.iflags?.cmdassist !== false) {
                game._direction_help_screen = INVALID_DIRECTION_HELP_SCREEN;
                game._direction_help_after_more_message = '';
                showSerializedOverride(INVALID_DIRECTION_HELP_SCREEN, [8, 23]);
                queue_more_prompt();
            } else {
                await pline('What a strange direction!');
            }
            return;
        }
        if (ch === '<' || ch === '>' || ch === '.') {
            game.context.move = 0;
            await pline('You cannot throw an object at yourself.');
            return;
        }
        await throwInventoryObject(throwObj, ch);
        game.context.move = 1;
        return;
    }

    if (game._awaiting_close_direction || game._awaiting_open_direction) {
        clear_pending_message();
        const opening = !!game._awaiting_open_direction;
        game._awaiting_close_direction = false;
        game._awaiting_open_direction = false;
        if (!'hykulnjb<>.'.includes(ch)) {
            game.context.move = 0;
            if (ch === '\x1b') {
                await pline('Never mind.');
                return;
            }
            if (game.iflags?.cmdassist !== false) {
                game._direction_help_screen = INVALID_DIRECTION_HELP_SCREEN;
                game._direction_help_after_more_message = opening ? 'Never mind.' : '';
                showSerializedOverride(INVALID_DIRECTION_HELP_SCREEN, [8, 23]);
                queue_more_prompt();
            } else {
                await pline('What a strange direction!');
            }
            return;
        }
        const x = (game.u?.ux ?? 0) + (DIR_DX[ch] || 0);
        const y = (game.u?.uy ?? 0) + (DIR_DY[ch] || 0);
        const loc = game.level?.at(x, y);
        if (opening) {
            game.context.move = 0;
            if (!loc || !C.IS_DOOR(loc.typ)) await pline('You see no door there.');
            else await pline('This door is already open.');
            return;
        }
        if (!loc || !C.IS_DOOR(loc.typ)) {
            game.context.move = 0;
            await pline('You see no door there.');
            return;
        }
        if (loc.doormask === D_NODOOR) {
            game.context.move = 0;
            await pline('This doorway has no door.');
            return;
        }
        if (loc.doormask === C.D_BROKEN) {
            game.context.move = 0;
            await pline('This door is broken.');
            return;
        }
        if (loc.doormask & (D_CLOSED | D_LOCKED)) {
            game.context.move = 0;
            await pline('This door is already closed.');
            return;
        }
        if (loc.doormask === C.D_ISOPEN) {
            if (rn2(25) < 10) {
                loc.doormask = D_CLOSED;
                newsym(x, y);
                await pline('The door closes.');
            } else {
                await pline('The door resists!');
            }
            game.context.move = 1;
            return;
        }
        game.context.move = 0;
        await pline('You see no door there.');
        return;
    }

    if (game._awaiting_kick_direction) {
        game._awaiting_kick_direction = false;
        clear_pending_message();
        if (!'hykulnjb<>.'.includes(ch)) {
            game.context.move = 0;
            if (game.iflags?.cmdassist !== false) {
                game._direction_help_screen = INVALID_DIRECTION_HELP_SCREEN;
                game._direction_help_after_more_message = '';
                showSerializedOverride(INVALID_DIRECTION_HELP_SCREEN, [8, 23]);
                queue_more_prompt();
            } else {
                await pline('What a strange direction!');
            }
            return;
        }
        await kickDirection(ch);
        return;
    }

    if (game._awaiting_engrave_item) {
        clear_pending_message();
        if (ch === ' ' || ch === '\x1b') {
            game._awaiting_engrave_item = false;
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        if (ch === '-') {
            // C ref: engrave.c:doengrave().  Fingertip writing uses dust and
            // prompts for text after the initial message's More prompt.
            game._awaiting_engrave_item = false;
            game._resume_engrave_text_after_more = true;
            game.context.move = 0;
            await pline('You write in the dust with your fingertip.');
            queue_more_prompt();
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj) {
            game.context.move = 0;
            game._resume_engrave_prompt_after_more = true;
            await pline("You don't have that object.");
            queue_more_prompt();
            return;
        }
        game._awaiting_engrave_item = false;
        game.context.move = 0;
        await pline("You can't engrave with that!");
        return;
    }

    if (game._awaiting_zap_direction) {
        clear_pending_message();
        const obj = game._awaiting_zap_direction;
        game._awaiting_zap_direction = null;
        if (!'hykulnjb<>.'.includes(ch)) {
            game.context.move = 1;
            if (!game.u?.ublind && !game.u?.uprops?.blind) {
                await pline(`${sentenceStart(`the ${baseObjectName(obj)}`)} glows and fades.`);
            }
            return;
        }
        const dx = DIR_DX[ch] || 0;
        const dy = DIR_DY[ch] || 0;
        if (obj.otyp === WAN_SLEEP && ch === '.') {
            obj.knownName = true;
            // C ref: src/zap.c:dozap(), src/zap.c:zapyourself(); self-zaps
            // take the zapyourself branch before weffects exercise handling.
            game._nomul_turns_remaining = rnd(50);
            game._nomul_finish_message = 'You wake up.';
            await pline('The sleep ray hits you!');
            game.context.move = 1;
            return;
        }
        if (obj.otyp === WAN_DEATH && ch === '.') {
            obj.knownName = true;
            // C refs: src/cmd.c:getdir()/confdir(), src/zap.c:zapyourself()
            // for WAN_DEATH.  Confusion still probes impairment before a
            // deliberate self direction is honored.
            if (game.u?.uprops?.confusion || game.u?.uconfusion) rn2(5);
            const self = game.flags?.female ? 'herself' : 'himself';
            game._death_killer_name = `shot ${self} with a death ray`;
            game._death_killer_format = 'raw';
            game._death_tombstone_killer_lines = [`shot ${self}`, 'with a death ray'];
            game._death_shopkeeper_killer = null;
            game._death_preserve_latched_status = true;
            game._death_ray_death_pending = true;
            if (!game._death_bones_checked) {
                game._death_bones_checked = true;
                game._death_bones_check_pending = true;
            }
            await pline('You irradiate yourself with pure energy!');
            queue_more_prompt();
            game.context.move = 0;
            return;
        }
        if (obj.otyp === WAN_POLYMORPH && ch === '.') {
            obj.knownName = true;
            await finishRandomPolyselfFromWand();
            return;
        }
        exercise(A_WIS, true);
        if (obj.otyp === WAN_DIGGING) {
            obj.knownName = true;
            obj.chargesKnown = false;
            zapDig(dx, dy);
            exercise(A_WIS, true);
        } else if (obj.otyp === WAN_FIRE) {
            obj.knownName = true;
            await zapFireRayAtHero(dx, dy);
        } else if (obj.otyp === WAN_SLEEP) {
            obj.knownName = true;
            if (sleepRayHitsHeroAfterBounce(dx, dy)) {
                drawRayBeam(dx, dy, 12);
                await pline('The sleep ray bounces!  The sleep ray hits you!');
                game._sleep_wand_hit_nd = 6;
                if (wornReflectionShield()) {
                    game._sleep_wand_reflect_pending = true;
                    game._sleep_wand_reflect_dx = dx;
                    game._sleep_wand_reflect_dy = dy;
                } else {
                    game._sleep_wand_sleep_pending = true;
                }
                queue_more_prompt();
            }
        } else if (obj.otyp === WAN_POLYMORPH) {
            await zapPolymorphObjects(obj, DIR_DX[ch] || 0, DIR_DY[ch] || 0);
        }
        // C ref: topl.c:more() can block inside zap.c:zhitu() before the
        // command returns to allmain.c for turn-tail monster movement.
        game.context.move = (game._fire_wand_side_effect_pending
            || game._sleep_wand_reflect_pending
            || game._sleep_wand_sleep_pending) ? 0 : 1;
        return;
    }

    if (game._awaiting_apply_item) {
        const dismissedApplyHelp = !!game._apply_inventory_help_menu;
        if (dismissedApplyHelp) {
            game._apply_inventory_help_menu = null;
            if (ch === '\x1b' || ch === 'q' || ch === 'Q' || ch === ' ') {
                clearOverrideScreen();
                await redrawAfterFullScreenMenuDismiss();
                game._awaiting_apply_item = true;
                game.context.move = 0;
                await showPromptLine(`What do you want to use or apply? [${applyLetters()} or ?*] `);
                return;
            }
            if (ch === '?' || ch === '*') {
                await showApplyInventoryHelpMenu(ch === '*');
                return;
            }
            clearOverrideScreen();
            await redrawAfterFullScreenMenuDismiss();
        }
        clear_pending_message();
        game._awaiting_apply_item = false;
        if (ch === '\x1b' || ch === ' ' || ch === '\r' || ch === '\n') {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        if (ch === '?' || ch === '*') {
            await showApplyInventoryHelpMenu(ch === '*');
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj) {
            game.context.move = 0;
            game._awaiting_apply_item = true;
            game._apply_invalid_more = true;
            await pline("You don't have that object.");
            queue_more_prompt();
            return;
        }
        if (obj.otyp === CREAM_PIE) {
            // C refs: src/dothrow.c:throwit(), src/do.c:dowipe().
            // Self-cream sets sticky-goop blindness until #wipe cleans it.
            consumeInventoryObject(obj);
            game.u = game.u || {};
            const blindinc = rnd(25); // C ref: src/apply.c:use_cream_pie().
            game.u.ucreamed = Math.max(game.u.ucreamed || 0, blindinc);
            game.u.ublind = true;
            game.u.uprops = game.u.uprops || {};
            game.u.uprops.blind = Math.max(game.u.uprops.blind || 0, game.u.ucreamed);
            game.u.uprops.blinded = Math.max(game.u.uprops.blinded || 0, game.u.ucreamed);
            await docrt();
            await plineWithMorePrompt('You immerse your face in the cream pie.');
            game._more_message_queue = [
                ...(game._more_message_queue || []),
                { text: "You can't see through all the sticky goop on your face.", more: false },
            ];
            game._cream_pie_resist_after_more = obj;
            game._pre_turn_more_waiting = true;
            game._monster_turn_paused_for_more = true;
            game.context.move = 1;
            return;
        }
        if (obj.oclass !== TOOL_CLASS) {
            game.context.move = 0;
            await pline("Sorry, I don't know how to use that.");
            return;
        }
        if (isContainerObject(obj)) {
            // C refs: src/apply.c:doapply(), src/pickup.c:use_container().
            const name = baseObjectName(obj) || 'container';
            if ((obj.otyp === LARGE_BOX || obj.otyp === CHEST) && obj.olocked) {
                if (obj.lknown) await pline(`The ${name} is locked.`);
                else await pline(`Hmmm, the ${name} turns out to be locked.`);
                obj.lknown = true;
                game.context.move = 0;
                return;
            }
            showLootActionMenu(obj, false, { held: true });
            game.context.move = 0;
            return;
        }
        if (obj.otyp === EXPENSIVE_CAMERA || obj.otyp === STETHOSCOPE
            || obj.otyp === LOCK_PICK || obj.otyp === CREDIT_CARD) {
            game._awaiting_apply_direction = obj;
            game.context.move = 0;
            await showPromptLine('In what direction? ');
            return;
        }
        if (obj.otyp === MAGIC_MARKER) {
            game._awaiting_write_on_item = obj;
            game.context.move = 0;
            await showPromptLine('What do you want to write on? [*] ');
            return;
        }
        if (obj.otyp === LEATHER_DRUM) {
            await applyLeatherDrum();
            return;
        }
        game.context.move = 0;
        await pline('Nothing happens.');
        return;
    }

    if (game._awaiting_write_on_item) {
        clear_pending_message();
        const marker = game._awaiting_write_on_item;
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj) {
            game.context.move = 0;
            game._awaiting_write_on_item = marker;
            game._resume_write_prompt_after_more = true;
            await pline("You don't have that object.");
            queue_more_prompt();
            return;
        }
        game._awaiting_write_on_item = null;
        game.context.move = 0;
        await pline('That is a silly thing to write on.');
        return;
    }

    if (game._awaiting_apply_direction) {
        clear_pending_message();
        const obj = game._awaiting_apply_direction;
        game._awaiting_apply_direction = null;
        if (!'hykulnjb<>.'.includes(ch)) {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        if (obj.otyp === STETHOSCOPE) {
            const seq = game.moves ?? 0;
            game.context.move = game._stethoscope_seq === seq ? 1 : 0;
            game._stethoscope_seq = seq;
            if (ch === '.') await pline(stethoscopeSelfStatusLine());
            else {
                const rx = (game.u?.ux ?? 0) + (DIR_DX[ch] || 0);
                const ry = (game.u?.uy ?? 0) + (DIR_DY[ch] || 0);
                const mon = (game.level?.monsters || []).find(m => m.mx === rx && m.my === ry);
                if (mon?.m_ap_type === C.M_AP_OBJECT) {
                    const what = objectAppearanceName(mon.mappearance);
                    mon.m_ap_type = C.M_AP_NOTHING;
                    mon.mappearance = 0;
                    newsym(mon.mx, mon.my);
                    await pline(`That ${what} is really a ${monsterInstanceDisplayName(mon)}.`);
                    game._after_more_message = monsterStatusLine(mon);
                    queue_more_prompt();
                } else {
                    await pline('You hear nothing special.');
                }
            }
            return;
        }
        if (obj.otyp === LOCK_PICK || obj.otyp === CREDIT_CARD) {
            // C ref: lock.c:pick_lock().  Learning that an adjacent square is
            // not a door still consumes the apply-key/lockpick turn.
            const rx = (game.u?.ux ?? 0) + (DIR_DX[ch] || 0);
            const ry = (game.u?.uy ?? 0) + (DIR_DY[ch] || 0);
            const loc = game.level?.at(rx, ry);
            game.context.move = 1;
            if (!loc || !C.IS_DOOR(loc.typ)) await pline('You see no door there.');
            else if (loc.doormask === D_NODOOR) await pline('This doorway has no door.');
            else if (loc.doormask & C.D_ISOPEN) await pline('You cannot lock an open door.');
            else await pline('This lock is not implemented yet.');
            return;
        }
        if (typeof obj.spe === 'number' && obj.spe > 0) obj.spe--;
        game.context.move = 1;
        return;
    }

    // If an override screen was shown last capture (hook set _override_prev),
    // handle multi-page menus: set the next page before returning.
    if (game._override_prev) {
        const prev = game._override_prev;
        game._override_prev = null;
        const tutorialOverride = prev === game._tutorial_prompt_screen
            || (typeof prev === 'string' && prev.includes('Do you want a tutorial?'));
        if (tutorialOverride) {
            if (ch === 'n' || ch === '\x1b') {
                clear_pending_message();
                game._tutorial_answered = true;
                game._startup_preamble_done_waiting_tutorial = false;
                game._startup_preamble_more_active = false;
                game.context.move = 0;
                return;
            }
            if (ch === 'y') {
                // Tutorial dungeon transfer is not implemented yet; record
                // the answer so regular play continues without corrupting RNG.
                clear_pending_message();
                game._tutorial_answered = true;
                game._startup_preamble_done_waiting_tutorial = false;
                game._startup_preamble_more_active = false;
                game.context.move = 0;
                return;
            }
            // C ref: options.c:ask_do_tutorial() + win/tty/wintty.c:tty_select_menu().
            // The menu loop returns with no selection for space/enter, causing
            // ask_do_tutorial() to rebuild the menu with the extra guidance
            // line. Other invalid selector keys are swallowed by the tty menu
            // and leave the original menu/cursor in place.
            await showTutorialPrompt(ch === ' ' || ch === '\r' || ch === '\n');
            game.context.move = 0;
            return;
        }
        if (game._more && ch !== ' ' && ch !== '\r' && ch !== '\n' && ch !== '\x1b') {
            // C ref: win/tty/topl.c:more(); a latched More override ignores
            // non-dismissal keys instead of treating them as menu input.
            showOverride(prev, game._latched_more_cursor || null);
            game.context.move = 0;
            return;
        }
        if (prev === game._spell_cast_menu_screen) {
            const entry = game._spell_cast_menu_choices?.get(ch);
            game._spell_cast_menu_screen = null;
            game._spell_cast_menu_choices = null;
            await redrawAfterFullScreenMenuDismiss();
            if (entry) await beginCastSpell(entry);
            else game.context.move = 0;
            return;
        }
        if (prev === game._help_menu_screen) {
            clearOverrideScreen();
            await handleHelpMenuSelection(ch);
            game.context.move = 0;
            return;
        }
        if (prev === game._help_text_screen) {
            const keyCode = ch.charCodeAt(0);
            const dismiss = ch === ' ' || ch === '\r' || ch === '\n';
            const cancel = ch === '\x1b';
            const pages = game._help_text_pages || [[]];
            const page = game._help_text_page || 0;
            if (dismiss && page + 1 < pages.length) {
                game._help_text_page = page + 1;
                renderHelpTextPage();
            } else if (dismiss || cancel) {
                game._help_text_pages = null;
                game._help_text_page = 0;
                game._help_text_more_prompt = null;
                game._help_text_compact_final_more = false;
                game._help_text_cursor = null;
                game._help_text_screen = null;
                clearOverrideScreen();
                await redrawAfterFullScreenMenuDismiss();
            } else {
                showSerializedOverride(prev, game._help_text_cursor || [8, C.TERMINAL_ROWS - 1]);
                game._override_serialized_persistent = false;
            }
            game.context.move = 0;
            void keyCode;
            return;
        }
        if (prev === game._pay_menu_screen) {
            const menu = game._pay_menu;
            if (ch === '\x1b') {
                game._pay_menu = null;
                game._pay_menu_screen = null;
                await redrawAfterFullScreenMenuDismiss();
                game.context.move = 0;
                return;
            }
            if (ch === '\r' || ch === '\n') {
                await commitPayMenuSelection(menu);
                game.context.move = 0;
                return;
            }
            const entry = menu?.entries?.find((item) => item.selector === ch);
            if (entry) entry.selected = !entry.selected;
            if (menu) renderPayMenu(menu);
            game.context.move = 0;
            return;
        }
        if (prev === game._level_teleport_menu_screen) {
            if (ch === ' ') {
                const menu = buildLevelTeleportMenuPage2();
                game._level_teleport_menu_page2_screen = menu.screen;
                game._level_teleport_menu_page2_choices = menu.choices;
                showOverride(menu.screen, [9, 23]);
                game.context.move = 0;
                return;
            }
            const target = game._level_teleport_menu_choices?.[ch];
            if (target) {
                await redrawAfterFullScreenMenuDismiss();
                game._pending_level_teleport_target = target;
            }
            game.context.move = 0;
            return;
        }
        if (prev === game._level_teleport_menu_page2_screen) {
            if (ch === ' ') {
                const menu = buildLevelTeleportMenuPage3();
                if (menu.pageIndex < menu.totalPages) {
                    game._level_teleport_menu_page3_screen = menu.screen;
                    game._level_teleport_menu_page3_choices = menu.choices;
                    showOverride(menu.screen, [9, 23]);
                }
                game.context.move = 0;
                return;
            }
            const target = game._level_teleport_menu_page2_choices?.[ch];
            if (target) {
                await redrawAfterFullScreenMenuDismiss();
                game._pending_level_teleport_target = target;
            }
            game.context.move = 0;
            return;
        }
        if (prev === game._level_teleport_menu_page3_screen) {
            const target = game._level_teleport_menu_page3_choices?.[ch];
            if (target) {
                await redrawAfterFullScreenMenuDismiss();
                game._pending_level_teleport_target = target;
            }
            game.context.move = 0;
            return;
        }
        if (prev === game._wizidentify_menu_screen) {
            await handleWizIdentifyMenuInput(ch);
            return;
        }
        if (game._look_inventory_lookup_active && prev === game._inventory_menu_screen) {
            game._look_inventory_lookup_active = false;
            game._inventory_menu_screen = null;
            game._inventory_menu_page2_lines = null;
            game._inventory_menu_cursor = null;
            if (ch === '\x1b' || ch === ' ' || ch === '\r' || ch === '\n') {
                await redrawAfterFullScreenMenuDismiss();
                game.context.move = 0;
                return;
            }
            const idx = inventoryIndexForLetter(ch);
            const obj = idx >= 0 ? game.inventory?.[idx] : null;
            const lines = LOOKUP_DATA.get(baseObjectName(obj).toLowerCase());
            if (lines) await showLookupDataOverlay(lines);
            else {
                await redrawAfterFullScreenMenuDismiss();
                await pline("You don't have any information on those things.");
            }
            game.context.move = 0;
            return;
        }
        if (prev === game._inventory_menu_screen) {
            if (ch === ' ' && game._inventory_menu_page2_lines?.length) {
                showInventoryMenuPage2();
                game.context.move = 0;
                return;
            }
            const idx = inventoryIndexForLetter(ch);
            const obj = idx >= 0 ? game.inventory?.[idx] : null;
            if (obj) await showInventoryActionMenu(obj);
            else if (ch === '\x1b' || ch === ' ' || ch === '\r' || ch === '\n') {
                game._inventory_menu_screen = null;
                game._inventory_menu_page2_lines = null;
                game._inventory_menu_cursor = null;
                await redrawAfterFullScreenMenuDismiss();
            } else {
                const cursor = game._inventory_menu_cursor
                    ? [game._inventory_menu_cursor[0], game._inventory_menu_cursor[1]]
                    : null;
                showOverride(prev, cursor);
            }
            game.context.move = 0;
            return;
        }
        if (prev === game._inventory_menu_page2_screen) {
            game._inventory_menu_screen = null;
            game._inventory_menu_page2_screen = null;
            game._inventory_menu_page2_lines = null;
            game._inventory_menu_cursor = null;
            game._inventory_menu_page2_cursor = null;
            await redrawAfterFullScreenMenuDismiss();
            game.context.move = 0;
            return;
        }
        if (prev === game._potion_menu_screen) {
            clear_pending_message();
            game._override_prev = null;
            game._potion_menu_screen = null;
            game._awaiting_drink_item = false;
            const idx = inventoryIndexForLetter(ch);
            const obj = idx >= 0 ? game.inventory?.[idx] : null;
            if (obj?.oclass === POTION_CLASS) await drinkPotion(obj, idx);
            else game.context.move = 0;
            return;
        }
        if (prev === game._inventory_action_menu_screen) {
            const obj = game._inventory_action_menu_obj;
            if (ch === '\r' || ch === '\n' || ch === ' ' || ch === '\x1b') {
                game._inventory_action_menu_obj = null;
                game._inventory_action_menu_screen = null;
                await redrawAfterFullScreenMenuDismiss();
                game.context.move = 0;
                return;
            }
            if (ch === 't' && obj) {
                clear_pending_message();
                game._inventory_action_menu_obj = null;
                game._inventory_action_menu_screen = null;
                game._awaiting_throw_direction = obj;
                game.context.move = 0;
                await showPromptLine('In what direction? ');
                return;
            }
            if (obj) await showInventoryActionMenu(obj);
            game.context.move = 0;
            return;
        }
        if (prev === game._attributes_page2_screen && key !== 32 && key !== 13 && key !== 27) {
            const row = Math.max(0, (game._attributes_page2_screen || '').split('\n').length - 1);
            showOverride(game._attributes_page2_screen, [9, row]);
            game.context.move = 0;
            return;
        }
        if (prev === game._attributes_page2_screen
            && game._attributes_page3_screen
            && (key === 32 || key === 13)) {
            const row = Math.max(0, (game._attributes_page3_screen || '').split('\n').length - 1);
            showOverride(game._attributes_page3_screen, [9, row]);
            game.context.move = 0;
            return;
        }
        if (prev === game._attributes_page3_screen && key !== 32 && key !== 13 && key !== 27) {
            const row = Math.max(0, (game._attributes_page3_screen || '').split('\n').length - 1);
            showOverride(game._attributes_page3_screen, [9, row]);
            game.context.move = 0;
            return;
        }
        if (prev === game._discovery_screen) {
            const dismiss = ch === ' ' || ch === '\r' || ch === '\n';
            const pages = Array.isArray(game._discovery_pages) ? game._discovery_pages : [];
            const page = game._discovery_page || 0;
            if (dismiss && page + 1 < pages.length) {
                game._discovery_page = page + 1;
                game._discovery_screen = pages[game._discovery_page];
                showOverride(game._discovery_screen, [8, 23]);
            } else {
                game._discovery_screen = null;
                game._discovery_pages = null;
                game._discovery_page = 0;
                await redrawAfterFullScreenMenuDismiss();
            }
            game.context.move = 0;
            return;
        }
        if (prev === game._name_menu_screen) {
            game._name_menu_screen = null;
            clearOverrideScreen();
            await redrawAfterFullScreenMenuDismiss();
            if (ch === 'a') await beginAnnotatePrompt();
            else if (ch === 'i' || ch === 'y') await beginNameInventoryPrompt();
            else game.context.move = 0;
            return;
        }
        if (prev === game._enhance_skills_screen) {
            await handleEnhanceSelection(ch);
            return;
        }
        if (prev === game._look_data_screen
            || prev === game._look_list_screen
            || prev === game._overview_screen
            || prev === game._conduct_screen
            || prev === game._vanquished_screen
            || prev === game._spell_cast_menu_screen
            || (prev === game._attributes_page1_screen && key !== 32 && key !== 13)
            || prev === game._attributes_page2_screen
            || prev === game._attributes_page3_screen) {
            game._spell_menu_screen = null;
            game._spell_cast_menu_screen = null;
            game._spell_cast_menu_choices = null;
            game._look_data_screen = null;
            game._look_list_screen = null;
            game._name_menu_screen = null;
            game._enhance_skills_screen = null;
            game._overview_screen = null;
            game._conduct_screen = null;
            game._vanquished_screen = null;
            game._attributes_page1_screen = null;
            game._attributes_page2_screen = null;
            game._attributes_page3_screen = null;
            clearOverrideScreen();
            await redrawAfterFullScreenMenuDismiss();
            game.context.move = 0;
            return;
        }
        if (prev === game._attributes_page1_screen && (key === 32 || key === 13)) {
            // Space/Enter pages to second attributes page.
            const row = Math.max(0, (game._attributes_page2_screen || '').split('\n').length - 1);
            showOverride(game._attributes_page2_screen, [9, row]);
        }
        if (game._deferred_startup_uac != null) {
            game.u.uac = game._deferred_startup_uac;
            game._deferred_startup_uac = null;
            apply_deferred_startup_wear();
        }
        // Any other key: override dismissed (already null)
        game.context.move = 0;
        return;
    }

    const startupMoreDismissKey = game._more && (ch === ' ' || ch === '\r' || ch === '\n');
    const startupPreambleSource = isStartupWelcomeMessage(game._pending_message)
        || game._startup_preamble_more_active;
    if (startupMoreDismissKey
        && startupPreambleSource
        && Array.isArray(game._startup_preamble_messages)
        && game._startup_preamble_messages.length) {
        await showNextStartupPreambleMessage();
        return;
    }

    const showStartupTutorial = shouldAskTutorial()
        && startupMoreDismissKey
        && (isStartupWelcomeMessage(game._pending_message)
            || game._startup_preamble_done_waiting_tutorial);

    if (startupMoreDismissKey
        && game._startup_preamble_done_waiting_tutorial
        && !showStartupTutorial) {
        game._startup_preamble_done_waiting_tutorial = false;
        clear_pending_message();
        game.context.move = 0;
        return;
    }

    const occupationMore = ch === ' '
        && game._occupation_paused_for_more
        && game._more;
    if (occupationMore) {
        clear_pending_message();
        game._occupation_paused_for_more = false;
        game._occupation_resume = true;
        game.context.move = 1;
        return;
    }

    if (game._avoid_pool_tip_pending && game._more
        && (ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b')) {
        game._avoid_pool_tip_pending = false;
        game._more = false;
        clear_pending_message();
        await pline("(Tip: use 'm' prefix to step in if you really want to.)");
        game.context.move = 0;
        return;
    }
    if (game._awaiting_save_confirm) {
        game._awaiting_save_confirm = false;
        clear_pending_message();
        if (ch === 'y' || ch === 'Y') {
            writeSavedGame();
            const screen = `Be seeing you...${'\n'.repeat(C.TERMINAL_ROWS - 1)}`;
            showOverride(screen, [0, 1]);
            game._pending_message = 'Be seeing you...';
            game.program_state = game.program_state || {};
            game.program_state.gameover = true;
        }
        game.context.move = 0;
        return;
    }
    if (game._more && ch !== ' ' && ch !== '\r' && ch !== '\n' && ch !== '\x1b') {
        // C ref: win/tty/topl.c:more(); non-dismissal keys do not reach rhack().
        game.context.move = 0;
        return;
    }
    if (game._pickup_menu) {
        await handlePickupMenuKey(ch);
        return;
    }
    if (game._loot_action_menu) {
        await handleLootActionMenuKey(ch);
        return;
    }
    if (game._loot_type_menu) {
        await handleLootTypeMenuKey(ch);
        return;
    }
    if (game._loot_putin_menu) {
        await handleLootPutInMenuKey(ch);
        return;
    }
    if (game._loot_takeout_menu) {
        await handleLootTakeOutMenuKey(ch);
        return;
    }
    if (await continueQueuedCookieMessage(ch)) return;
    if (game._awaiting_floor_food_eat) {
        await handleFloorFoodEatKey(ch);
        return;
    }
    if (game._awaiting_floor_corpse_eat) {
        await handleFloorCorpseEatKey(ch);
        return;
    }
    if (game._awaiting_eat_item) {
        await handleEatItemKey(ch);
        return;
    }

    // C ref: cmd.c:parse()/get_count().  With number_pad off, digits are a
    // count prefix and do not dispatch until a following non-digit command.
    if (isCommandCountDigit(ch)) {
        await startOrContinueCommandCount(ch);
        return;
    }
    if (game._command_count_digits && ch === '\x1b') {
        game._command_count_digits = '';
        clear_pending_message();
        game.context.move = 0;
        return;
    }
    consumeCommandCountForCommand();

    // Message lines persist while waiting for input, then clear when the
    // next command begins unless the command prints a replacement.
    clear_pending_message();
    clearDeferredPetPickupObjects();
    const forceCommandPrefix = !!game._force_command_prefix;
    game._force_command_prefix = false;
    const redrawCommand = ch === '\x12' || ch === '\x0c';
    if (!redrawCommand) game._redraw_resumes_run = null;

    if (redrawCommand) {
        // C refs: cmd.c:cmdlist[]/bind_key(); display.c:doredraw()/docrt_flags().
        vision_recalc(2);
        vision_recalc(0);
        await docrt();
        if (game._redraw_resumes_run) {
            game.context.run = { ...game._redraw_resumes_run, stopBeforeOpenDoor: true };
            game._redraw_resumes_run = null;
            game._resume_run_after_more = true;
            game.context.move = 1;
        } else if (game.context?.run) {
            game.context.run.stopBeforeOpenDoor = true;
            game._resume_run_after_more = true;
            game.context.move = 1;
        } else {
            game.context.move = 0;
        }
    } else if (game._forcefight_pending && isMovementKey(ch)) {
        game._forcefight_pending = false;
        await forceFightEmpty(DIR_DX[ch], DIR_DY[ch]);
        game.context.move = 1;
    } else if (game._forcefight_pending) {
        // C ref: src/cmd.c:rhack().  The fight prefix only applies to
        // movement commands; an unrelated command is rejected rather than
        // dispatched.
        game._forcefight_pending = false;
        if (ch === 'F') {
            await pline('Double fight prefix, canceled.');
        } else {
            const suffix = (ch === '<' || ch === '>') ? ' other than up or down' : '';
            await pline(`The 'F' prefix should be followed by a movement command${suffix}.`);
        }
        game.context.move = 0;
    } else if (isMovementKey(ch)) {
        game.context.move = await domove(DIR_DX[ch], DIR_DY[ch]) ? 1 : 0;
    } else if (key === 10 || key === 13) {
        // C refs: cmd.c:reset_commands(), cmd.c:do_rush_south().  Line-feed is
        // C('j'), bound to rush mode 3 rather than shifted run mode 1.  Tty
        // Enter can arrive as carriage return in replay input.
        await startRunDirection('j', 3);
    } else if (runDirectionForKey(ch)) {
        const dir = runDirectionForKey(ch);
        await startRunDirection(dir, 1);
    } else if (ch === 'F') {
        game.context.move = 0;
        game._forcefight_pending = true;
    } else if (ch === '.') {
        if (!forceCommandPrefix && await cmdSafetyPrevention('Waiting', 'a no-op (to rest)',
            'Are you waiting to get hit?', '_did_nothing_flag')) {
            game.context.move = 0;
        } else {
            refreshHeroPreviousPositionForStationaryCommand();
            game.context.move = 1;
            queueSimpleTimedRepeatsForCount('waiting');
        }
    } else if (ch === 's') {
        if (!forceCommandPrefix && await cmdSafetyPrevention('Searching', 'another search',
            'You already found a monster.', '_already_found_flag')) {
            game.context.move = 0;
        } else {
            refreshHeroPreviousPositionForStationaryCommand();
            const found = await dosearch0_basic(false);
            game.context.move = 1;
            if (!found) queueSimpleTimedRepeatsForCount('searching');
        }
    } else if (ch === 'm') {
        game._force_command_prefix = true;
        game.context.move = 0;
    } else if (ch === 'c') {
        if (!heroHasHands()) {
            // C ref: src/lock.c:doclose().
            await pline("You can't close anything -- you have no hands!");
            game.context.move = 0;
            return;
        }
        game._awaiting_close_direction = true;
        game.context.move = 0;
        await showPromptLine('In what direction? ');
    } else if (ch === 'o') {
        if (!heroHasHands()) {
            // C ref: src/lock.c:doopen().
            await pline("You can't open anything -- you have no hands!");
            game.context.move = 0;
            return;
        }
        game._awaiting_open_direction = true;
        game.context.move = 0;
        await showPromptLine('In what direction? ');
    } else if (key === 4) {
        if (hasWoundedLegs()) {
            await pline(woundedLegsKickMessage());
            queue_more_prompt();
            game.context.move = 0;
        } else {
            game._awaiting_kick_direction = true;
            game.context.move = 0;
            await showPromptLine('In what direction? ');
        }
    } else if (ch === '#') {
        game.context.move = 0;
        game._awaiting_extended_command = true;
        game._extended_command_input = '';
        game._extended_command = '';
        await showPromptLine('# ');
    } else if (key === 0x7f) {
        await showTerrainMenu();
    } else if (ch === '_') {
        game.context.move = 0;
        if (!getposTipSeen()) {
            await pline('Where do you want to travel to?');
            queue_more_prompt();
            game._travel_tip_pending = true;
        } else {
            const prompt = game.flags?.verbose === false
                ? 'Where do you want to travel to?'
                : "Where do you want to travel to?  (For instructions type a '?')";
            await showPromptLine(prompt);
            if (game._travel_reset_cursor_once) {
                game._travel_reset_cursor_once = false;
                game._travel_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
            } else {
                game._travel_cursor = game._travel_cached_target
                    ? { x: game._travel_cached_target.x, y: game._travel_cached_target.y }
                    : { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
            }
            setTravelMapCursorAt(game._travel_cursor.x, game._travel_cursor.y);
            game._awaiting_travel_prompt = true;
        }
    } else if (ch === 'i') {
        game.context.move = 0;
        await showInventoryMenu();
    } else if (ch === 'w') {
        game.context.move = 0;
        const letters = wieldLetters();
        game._awaiting_wield_item = true;
        await showPromptLine(`What do you want to wield? [-${letters ? ` ${letters}` : ''} or ?*] `);
    } else if (ch === 'x') {
        await doSwapWeaponCommand();
    } else if (ch === 'X') {
        await doTwoWeaponCommand();
    } else if (ch === 'Q') {
        game.context.move = 0;
        const letters = readyLetters();
        game._awaiting_quiver_item = true;
        await showPromptLine(`What do you want to ready? [-${letters ? ` ${letters}` : ''} or ?*] `);
    } else if (ch === 'f') {
        await doFireCommand();
    } else if (ch === '+') {
        game.context.move = 0;
        await showSpellMenu();
    } else if (ch === 'Z') {
        game.context.move = 0;
        await showCastSpellMenu();
    } else if (key === 20) { // ^T teleport
        game.context.move = 0;
        const prompt = game.flags?.verbose === false
            ? 'Where do you want to be teleported?'
            : "Where do you want to be teleported?  (For instructions type a '?')";
        await showPromptLine(prompt);
        game._teleport_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
        setTravelMapCursorAt(game._teleport_cursor.x, game._teleport_cursor.y);
        game._awaiting_teleport_prompt = true;
    } else if (ch === '?') {
        game.context.move = 0;
        await showHelpMenu();
    } else if (ch === 'O') {
        beginSimpleOptionsMenu();
    } else if (ch === '/') {
        game.context.move = 0;
        await showLookAtMenu();
        game._awaiting_lookat_menu = true;
    } else if (ch === ';') {
        game.context.move = 0;
        // C refs: src/pager.c:do_look(), src/getpos.c:getpos().
        // The quick farlook getpos prompt starts as a fresh prompt line; an
        // old command-result topline does not turn it into a blocking More.
        clear_pending_message();
        await pline('Pick a monster, object or location.');
        if (!getposTipSeen()) {
            queue_more_prompt();
            game._farlook_intro_after_more = true;
            game._farlook_intro_quick = true;
        } else {
            game._farlook_quick_mode = true;
            game._farlook_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
            setTravelMapCursorAt(game._farlook_cursor.x, game._farlook_cursor.y);
            game._awaiting_farlook_prompt = true;
        }
    } else if (key === 22) { // ^V wizard level teleport
        game.context.move = 0;
        if ((game.wizard || game.flags?.debug) && game.urole?.name?.m === 'Tourist')
            game._tourist_debug_level_teleport_score_floor = true;
        const msg = 'To what level do you want to teleport? ';
        await pline(msg);
        game._prompt_cursor = [msg.length, 0];
        game._awaiting_level_teleport = true;
        game._level_teleport_input = '';
    } else if (key === 23) { // ^W wizard wish
        await beginWizardWishPrompt();
    } else if (key === 7) { // ^G wizard create monster
        game.context.move = 0;
        const msg = 'Create what kind of monster?';
        await pline(msg);
        // C ref: read.c:create_particular() -> win/tty/getline.c:hooked_tty_getlin().
        game._prompt_cursor = [msg.length + 1, 0];
        game._awaiting_create_monster = true;
        game._create_monster_input = '';
    } else if (ch === 'W') {
        game.context.move = 0;
        if (!heroHasHands() || heroHasNoLimbs()) {
            // C ref: src/do_wear.c:dowear().  Tiny or handless forms cannot
            // even start the wear-object getobj() prompt.
            await pline("Don't even bother.");
            return;
        }
        const letters = wearLetters();
        const msg = letters ? `What do you want to wear? [${letters} or ?*] ` : 'What do you want to wear? [*] ';
        await pline(msg);
        game._prompt_cursor = [msg.length, 0];
        game._awaiting_wear_item = true;
    } else if (ch === 'T') {
        const suggestedLetters = takeoffLetters();
        const armor = wornArmorForTakeoff();
        const anyTakeoff = (game.inventory || []).some(is_worn_takeoff_candidate);
        if (!anyTakeoff) {
            game.context.move = 0;
            await pline('Not wearing any armor or accessories.');
        } else if (armor && suggestedLetters.length === 1) {
            game.context.move = 1;
            await start_takeoff_armor(armor);
        } else {
            game.context.move = 0;
            const prompt = suggestedLetters
                ? `What do you want to take off? [${suggestedLetters} or ?*] `
                : 'What do you want to take off? [*] ';
            await showPromptLine(prompt);
            game._awaiting_takeoff_item = true;
        }
    } else if (ch === '\\') {
        game.context.move = 0;
        const screen = discoveriesScreen();
        game._discovery_screen = screen;
        showOverride(screen, [8, 23]);
    } else if (key === 24) { // ^X
        game.context.move = 0;
        const screens = buildAttributesScreens();
        game._attributes_page1_screen = screens.page1;
        game._attributes_page2_screen = screens.page2;
        game._attributes_page3_screen = screens.page3 || null;
        showOverride(screens.page1, [9, 23]);
    } else if (key === 6 && (game.wizard || game.flags?.debug)) {
        // C ref: wizcmds.c:wiz_map() -> detect.c:do_mapping().
        map_level_for_wizard(true);
        restoreMappedForegroundAfterMonsterRefresh();
        exercise(A_WIS, true);
        game._travel_reset_cursor_once = true;
        game.context.move = 0;
    } else if (ch === '>') {
        await doDownCommand();
    } else if (ch === '<') {
        await doUpCommand();
    } else if (ch === ':') {
        game.context.move = 0;
        if (await readEngravingAtHero()) {
            // C refs: invent.c:dolook() -> pickup.c:look_here() ->
            // engrave.c:read_engr_at().
            queue_more_prompt();
        } else {
            // C ref: invent.c:dolook() -> invent.c:look_here().
            const feature = lookHereFeature();
            const objects = floorObjectsAtHero();
            if (feature.line) await pline(feature.line);
            if (feature.blocks && objects.length > 0) {
                queue_more_prompt();
                return;
            }
            if (objects.length === 1) {
                const line = `You see here ${inventoryObjectName(objects[0], { includePrice: true, observe: true })}.`;
                if (feature.line) await append_pline(line);
                else await pline(line);
            } else if (objects.length > 1) {
                showFloorObjectList(objects, feature.line || '');
            } else if (!feature.line) {
                await pline("You see no objects here.");
            }
        }
    } else if (ch === ',') {
        await pickupHere();
    } else if (ch === '@') {
        // C ref: src/cmd.c:init_commands(), src/options.c:dotogglepickup().
        game.context.move = 0;
        const flags = game.flags || (game.flags = {});
        flags.pickup = !flags.pickup;
        await pline(flags.pickup
            ? `Autopickup: ON, for ${pickupTypesDescription()} objects.`
            : 'Autopickup: OFF.');
    } else if (ch === 'p') {
        await doPayCommand();
    } else if (ch === '$') {
        game.context.move = 0;
        const gold = heroGoldAmount();
        await pline(gold > 0
            ? `Your wallet contains ${gold} zorkmids.`
            : 'Your wallet is empty.');
    } else if (ch === ')') {
        game.context.move = 0;
        const weapon = heroWieldedWeapon();
        if (weapon) await pline(`${inventoryListing(weapon, { includeWorn: true })}.`);
        else await pline('You are bare handed.');
    } else if (ch === '[') {
        game.context.move = 0;
        const wornArmor = (game.inventory || []).filter((obj) =>
            obj?.oclass === ARMOR_CLASS && (obj.worn || (obj.owornmask || 0)));
        if (wornArmor.length) await pline(`${inventoryListing(wornArmor[0], { includeWorn: true })}.`);
        else await pline('You are not wearing any armor.');
    } else if (ch === '=') {
        game.context.move = 0;
        const rings = (game.inventory || []).filter((obj) => obj?.oclass === RING_CLASS && (obj.worn || obj.wornSide));
        if (rings.length) await pline(`${inventoryListing(rings[0], { includeWorn: true })}.`);
        else await pline('You are not wearing any rings.');
    } else if (ch === '"') {
        game.context.move = 0;
        const amulet = (game.inventory || []).find((obj) => obj?.oclass === AMULET_CLASS && (obj.worn || (obj.owornmask || 0)));
        if (amulet) await pline(`${inventoryListing(amulet, { includeWorn: true })}.`);
        else await pline('You are not wearing an amulet.');
    } else if (ch === 'P') {
        game.context.move = 0;
        const letters = putonLetters();
        if (letters) {
            await showPromptLine(`What do you want to put on? [${letters} or ?*] `);
            game._awaiting_puton_item = true;
        } else {
            await pline('You are not carrying anything to put on.');
        }
    } else if (ch === 'r') {
        game.context.move = 0;
        // C ref: src/read.c:doread() -> src/hack.c:check_capacity().
        if ((game.u?.uencumber || 0) >= C.EXT_ENCUMBER) {
            await pline("You can't do that while carrying so much stuff.");
            return;
        }
        await showPromptLine(`What do you want to read? [${readLetters()} or ?*] `);
        game._awaiting_read_item = true;
    } else if (ch === 'E') {
        game.context.move = 0;
        await showPromptLine(`What do you want to write with? [- ${writeWithLetters()} or ?*] `);
        game._awaiting_engrave_item = true;
    } else if (ch === 'q') {
        game.context.move = 0;
        if (game.level?.at(game.u?.ux, game.u?.uy)?.typ === C.FOUNTAIN) {
            const prompt = 'Drink from the fountain? [yn] (n)';
            await showPromptLine(prompt, { trailingInputSpace: true });
            game._awaiting_fountain_drink_confirm = true;
            return;
        }
        if (game.level?.at(game.u?.ux, game.u?.uy)?.typ === C.SINK) {
            const prompt = 'Drink from the sink? [yn] (n)';
            await showPromptLine(prompt);
            game._prompt_cursor = [prompt.length + 1, 0];
            game._awaiting_sink_drink_confirm = true;
            return;
        }
        await showDrinkInventoryPrompt();
    } else if (ch === 'e') {
        const corpse = floorCorpseAtHero();
        if (corpse) {
            const corpseName = baseObjectName(corpse);
            game.context.move = 0;
            game._awaiting_floor_corpse_eat = true;
            game._floor_corpse_eat_obj = corpse;
            await showPromptLine(`There is a ${corpseName} here; eat it? [ynq] (n)`, { trailingInputSpace: true });
        } else if (floorEdibleAtHero()) {
            const food = floorEdibleAtHero();
            game.context.move = 0;
            game._awaiting_floor_food_eat = true;
            game._floor_food_eat_obj = food;
            await showPromptLine(floorFoodPrompt(food), { trailingInputSpace: true });
        } else {
            game.context.move = 0;
            await showEatInventoryPrompt();
        }
    } else if (ch === 'z') {
        game.context.move = 0;
        if (!heroHasHands()) {
            await pline("You aren't able to zap anything in your current form.");
            return;
        }
        const letters = zapLetters();
        if (letters) {
            await showPromptLine(`What do you want to zap? [${letters} or ?*] `);
            game._awaiting_zap_item = true;
        } else {
            await pline('You have nothing to zap.');
        }
    } else if (ch === 't') {
        game.context.move = 0;
        await showThrowPrompt();
    } else if (ch === 'a') {
        game.context.move = 0;
        // C ref: src/apply.c:doapply().  No-hands polymorph forms fail
        // before burden/capacity checks or the tool inventory prompt.
        if (!heroHasHands()) {
            await pline("You aren't able to use or apply tools in your current form.");
            return;
        }
        if ((game.u?.uencumber || 0) >= C.EXT_ENCUMBER) {
            await pline("You can't do that while carrying so much stuff.");
            return;
        }
        const letters = applyLetters();
        if (letters) {
            await showPromptLine(`What do you want to use or apply? [${letters} or ?*] `);
            game._awaiting_apply_item = true;
        } else {
            // C ref: invent.c:getobj().
            await pline("You don't have anything to use or apply.");
        }
    } else if (ch === 'd') {
        game.context.move = 0;
        await showPromptLine(`What do you want to drop? [${inventoryLetterRange()} or ?*] `);
        game._awaiting_drop_item = true;
    } else if (ch === 'S') {
        game.context.move = 0;
        await showPromptLine('Really save? [yn] (n)', { trailingInputSpace: true });
        game._awaiting_save_confirm = true;
    } else if ((ch === ' ' || ch === '\r' || ch === '\n') && showStartupTutorial) {
        game._startup_preamble_done_waiting_tutorial = false;
        game._startup_preamble_more_active = false;
        game.context.move = 0;
        await showTutorialPrompt(false);
    } else if (ch === '\x1b') {
        // ESC does not print unknown command, just dismiss/wait.
        game.context.move = 0;
    } else {
        // Unknown command
        game.context.move = 0;
        await pline(`Unknown command '${ch}'.`);
    }
}

// C ref: hack.c domove — execute a movement
export async function continueRunStep() {
    const run = game.context?.run;
    if (!run) return false;
    if (run.steps++ > COLNO * ROWNO) {
        game.context.run = null;
        game.context.move = 0;
        return false;
    }
    if (await runShouldStopBeforeRepeatMove(run)) {
        game.context.run = null;
        return false;
    }
    maybeTurnCorridorRun(run);
    let step = run.travel ? findTravelStep(run.target) : { dx: run.dx, dy: run.dy };
    if (!step) {
        game.context.run = null;
        game.context.move = 0;
        return false;
    }
    if (run.travel) {
        // C ref: hack.c:findtravelpath()/domove().  Travel chooses a path,
        // but each domove attempt receives a unit direction.
        step = { dx: Math.sign(step.dx), dy: Math.sign(step.dy) };
    }
    game.context.move = 0;
    game.context.mv = 1;
    const moved = await domove(step.dx, step.dy);
    if (run.travel) setTravelMapCursor();
    game.context.move = moved ? 1 : 0;
    if (run.travel && game.u?.ux === run.target.x && game.u?.uy === run.target.y) {
        game._travel_cached_target = null;
        game.context.run = null;
        return moved;
    }
    if (!moved || game._run_stop_after_move) {
        game.context.run = null;
        game._run_stop_after_move = false;
    }
    return moved;
}

function uMaybeImpaired() {
    // C ref: hack.c:u_maybe_impaired().
    if (game.u?.uprops?.stunned || game.u?.ustunned) return true;
    if (game.u?.uprops?.confusion || game.u?.uconfusion) return !rn2(5);
    return false;
}

function impairedMovementDirection() {
    // C refs: hack.c:impaired_movement(), cmd.c:confdir().
    if (!uMaybeImpaired()) return null;
    for (let tries = 0; tries <= 50; tries++) {
        const dir = CONFUSED_DIRS[rn2(CONFUSED_DIRS.length)];
        const x = (game.u?.ux || 0) + dir.dx;
        const y = (game.u?.uy || 0) + dir.dy;
        if (C.isok(x, y) && !blocksMove(x, y)) return dir;
    }
    return { blocked: true, dx: 0, dy: 0 };
}

async function carryingTooMuchForMove() {
    // C ref: src/hack.c:carrying_too_much().
    const u = game.u;
    const wtcap = u?.uencumber || 0;
    if (C.Is_airlevel(u?.uz)) return false;
    const upolyd = (u?.mhmax || 0) > 0;
    const lowStamina = wtcap > C.SLT_ENCUMBER
        && (upolyd
            ? ((u?.mh || 0) < 5 && u.mh !== u.mhmax)
            : ((u?.uhp || 0) < 10 && u.uhp !== u.uhpmax));
    if (wtcap < C.OVERLOADED && !lowStamina) return false;
    if (wtcap < C.OVERLOADED) {
        await pline("You don't have enough stamina to move.");
        exercise(A_CON, false);
    } else {
        await pline('You collapse under your load.');
    }
    game.context.move = 1;
    if (game.context?.run) game._run_stop_after_move = true;
    return true;
}

export async function domove(dx, dy) {
    const u = game.u;
    if (await carryingTooMuchForMove()) return true;

    if (u.uswallow && u.ustuck) {
        await swallowedHeroAttack(u.ustuck);
        return true;
    }

    const impaired = impairedMovementDirection();
    if (impaired?.blocked) {
        game.context.move = 0;
        return false;
    }
    if (impaired) {
        dx = impaired.dx;
        dy = impaired.dy;
        if (game.context?.run && !game.context.run.travel) {
            // C ref: cmd.c:confdir()/hack.c:domove_core().  Confused
            // movement mutates u.dx/u.dy, so an active run continues (or
            // stops) using the confused vector rather than the original key.
            game.context.run.dx = dx;
            game.context.run.dy = dy;
        }
    }
    u.dx = dx;
    u.dy = dy;

    const newx = u.ux + dx;
    const newy = u.uy + dy;
    const target = game.level.at(newx, newy);
    const currentSource = game.level.at(u.ux, u.uy);
    const is_diag = dx !== 0 && dy !== 0;
    const mon = mon_at(newx, newy);

    if (game.context?.run?.stopBeforeOpenDoor && !game.context.run.travel) {
        if (currentSource?.typ === CORR && target?.typ === DOOR
            && !(target.doormask & (D_CLOSED | D_LOCKED))) {
            // C ref: hack.c:lookaround().  A message/redraw-interrupted
            // corridor run can stop at the doorway boundary before exposing
            // the next room.
            game.context.run.stopBeforeOpenDoor = false;
            game.context.move = 0;
            return false;
        }
    }

    if (is_diag && !blocksMove(newx, newy)) {
        const side1x = u.ux + dx, side1y = u.uy;
        const side2x = u.ux, side2y = u.uy + dy;
        const sokoBouldersBlock = !!game.level?.flags?.sokoban_rules;
        const side1Blocked = blocksMove(side1x, side1y)
            || (sokoBouldersBlock && sobj_at_basic(BOULDER, side1x, side1y));
        const side2Blocked = blocksMove(side2x, side2y)
            || (sokoBouldersBlock && sobj_at_basic(BOULDER, side2x, side2y));
        if (side1Blocked && side2Blocked) {
            await pline('You cannot pass that way.');
            game.context.move = 0;
            return false;
        }
    }

    if (is_diag && game.level?.flags?.sokoban_rules && sobj_at_basic(BOULDER, newx, newy)) {
        await pline('You try to move the boulder, but in vain.');
        game.context.move = 0;
        return false;
    }
    const boulder = sobj_at_basic(BOULDER, newx, newy);
    if (boulder) {
        return tryPushBoulder(boulder, newx, newy, dx, dy);
    }

    if (target?.typ === DOOR && (target.doormask & (D_CLOSED | D_LOCKED))) {
        if (game.context?.run) return bumpClosedDoor(dx, dy);
        if (target.doormask & D_LOCKED) {
            // C ref: lock.c:doopen_indir().  A normal movement key against a
            // locked door reports the lock without spending a turn; run/rush
            // movement still uses the bump-into-door path above.
            await pline('This door is locked.');
            game.context.move = 0;
            return false;
        }
        if (await tryAutoOpenDoor(newx, newy)) return false;
        return bumpClosedDoor(dx, dy);
    }

    if (blocksMove(newx, newy)) {
        // Can't move there
        const msg = game.flags?.mention_walls ? blockedMovementMessage(newx, newy) : '';
        if (msg) await pline(msg);
        game.context.move = 0;
        return false;
    }

    if (mon) {
        // C ref: src/hack.c:domove_core() checks m_at(x,y) and routes to
        // do_attack() before ordinary terrain/liquid movement handling.
        if (isSafeMonster(mon)) {
            await swapWithSafeMonster(mon, newx, newy);
            return true;
        }
        if (game.context?.run && cansee(newx, newy)) {
            // C ref: hack.c:domove_core().  Running into a visible non-safe
            // monster stops the run instead of performing a melee attack.
            game.context.move = 0;
            game.context.run = null;
            return false;
        }
        if (!heroCanSpotMonsterForHit(mon)
            && game.level?.at(newx, newy)?.remembered_glyph?.ch !== 'I') {
            // C ref: src/uhitm.c:attack_checks().  A normal blind bump into
            // an unseen monster marks the square and spends the turn without
            // performing the melee hit; force-fight is the explicit attack path.
            await pline("Wait!  There's something there you can't see!");
            mapInvisibleBasic(newx, newy);
            return true;
        }
        await attackMonster(mon);
        return true;
    }

    if (target?.remembered_glyph?.ch === 'I')
        return attackRememberedInvisibleEmpty(dx, dy);

    if (target && IS_POOL(target.typ)) {
        // C ref: hack.c:domove_core(); paranoid movement into known liquid
        // is a zero-time prompt gate when no monster occupies the square.
        await pline(`You avoid stepping into the ${waterbodyNameAt(newx, newy)}.`);
        maybeQueueSwimTip();
        game.context.move = 0;
        return false;
    }
    if (target && C.IS_LAVA(target.typ)) {
        // C ref: hack.c:swim_move_danger(); visible lava is blocked by the
        // paranoid swim/liquid safety gate before spending a turn.
        await pline('You avoid stepping into the molten lava.');
        maybeQueueSwimTip();
        game.context.move = 0;
        return false;
    }

    if (is_diag) {
        const source = game.level.at(u.ux, u.uy);
        if (doorwayBlocksDiagonalForHero(target) || doorwayBlocksDiagonalForHero(source)) {
            if (game.flags?.mention_walls) await pline(`You can't move diagonally into an intact doorway.`);
            game.context.move = 0;
            return false;
        }
    }

    // Move the hero
    const oldx = u.ux, oldy = u.uy;
    const source = game.level.at(oldx, oldy);
    const punishmentMoveState = unplacePunishmentObjectsForHeroMove();
    u.ux0 = oldx;
    u.uy0 = oldy;
    u.ux = newx;
    u.uy = newy;
    u.umoved = true;
    if (u.usteed) {
        u.usteed.mx = newx;
        u.usteed.my = newy;
    }
    game._pending_move_smudge = { oldx, oldy };
    if (game.context?.run && runShouldStopAfterMove(source, target)) {
        if (target?.typ === DOOR && !(target.doormask & (D_CLOSED | D_LOCKED))) {
            game._redraw_resumes_run = { ...game.context.run };
        } else {
            game._redraw_resumes_run = null;
        }
        game._run_stop_after_move = true;
    }

    // Update display
    newsym(oldx, oldy);
    vision_recalc(1);
    // C refs: src/hack.c:domove_core(), src/ball.c:move_bc().  The drag
    // target is computed before movement, but ball/chain replacement happens
    // after the hero move has recalculated vision.
    dragPunishmentObjectsAfterHeroMove(oldx, oldy, punishmentMoveState);
    see_nearby_objects();
    // C ref: hack.c:domove() post-move vision redraw clears warning glyphs
    // whose mdisdu() range changed when the hero moved.
    refreshWarningAfterHeroMove();
    newsym(newx, newy);
    revealFakeCorridorNearHeroBasic(findVaultGuardBasic());
    await checkSpecialRoomAfterMove();
    const autopicked = await autopickupHereAfterMove();
    if (!autopicked || floorObjectsAtHero().length)
        await lookHereAfterMove({
            deferFloorListUntilAfterMonsterTurn: !!game.context?.run,
            featureAlreadyShown: autopicked,
        });
    if (!game._more && !game._deferred_move_floor_list) await triggerTrapAtHero();
    // C refs: src/hack.c:domove(), src/hack.c:maybe_smudge_engr().
    // A movement floor-list can be deferred behind the monster turn, but the
    // post-domove engraving smudge still belongs to the completed movement.
    if (!game._more) finishPendingMoveSmudge();
    return true;
}
