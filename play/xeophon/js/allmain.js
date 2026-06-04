// allmain.js — Main game setup and move loop.
// C refs: src/allmain.c:newgame(), moveloop_core().

import { game } from './gstate.js';
import { mklev, l_nhcore_init, u_on_upstairs, makemon, mkcorpstat, mksobj, wipe_engr_at, dropMonsterInventory, wandIndexForRoll, scrollIndexForRoll, potionIndexForRoll, RANDOM_MONSTER_BY_NAME, STONE_RESISTANT_MONSTERS, adjustedMonsterLevel, monsterByRndName, monster_hp, rndmonnum, syncDungeonContext, next_ident, set_malign, enextoMonsterSpot, getbogusmon, pickNasty, chameleonAnimalForm, doppelgangerHumanoidForm, noteleportLevelForMonster, rlocNoMsg, rlocToCoreNoMsg, somexyspace, fumaroles, createMonsterCorpseOrGlob, monsterCorpseDropSucceeds, monsterLeavesCorpseLikeDrop, movebubbles, add_to_minv } from './mklev.js';
import { rhack, pickupObjectName, inventoryItemName, inventoryLetterRank, recordVanquished, finishForceLock, loseExperienceLevel, finishLevelTeleport, finishPickDigDownwardHole, finishPickDigDownwardPit, maybeQueueQuestTalk, monsterGrowUp, monsterHostileCussNoise, monsterTurnDemonBribeArtifact, monsterTurnDemonBribeDemand, monsterTurnDemonBribeNoGold, processForceLockOccupationTick, forceLockOccupationShouldGiveUp, processSpellbookStudyOccupation, processTinOpeningOccupation, finishTinOpeningOccupation, refreshSwallowOverlay, finishSwallowExpel, travelPathKeys, updateGauntletsOfPowerStrength, consumeLifeSavingAmulet, activateStatueTrap, breakStatueObject, burnFloorObjectsByFire, burnRayFloorObjectsByFire, erodeArmorByFireTrap, dryWetTowelFromFire, igniteMonsterFireInventoryItems, monsterFireInventoryDamage, dropMonsterObject, earthFloorEffects, landMonsterThrownObject, stoneMonster, processCorpseTimers, processGlobShrinkTimers, addDelayedFoodBiteNutrition, repairShopDamageForShopkeeper, heroHasAntimagic, heroHasSlowDigestion, applyHeroOrdinaryHunger } from './cmd.js';
import { docrt, cls, bot, flush_screen, pline, newsym, refreshHallucinatedMap, show_glyph_cell } from './display.js';
import { vision_recalc, vision_reset, init_vision_globals, cansee, couldsee, view_from } from './vision.js';
import { init_objects } from './o_init.js';
import { init_dungeons_rng } from './dungeon.js';
import { rn2, rn2_on_display_rng, rnd, rn1, rnl, rne, rnz, d } from './rng.js';
import { COLNO, ROWNO, A_CHA, A_CON, A_DEX, A_INT, A_MAX, A_STR, A_WIS, ALTAR, GRAVE, ICE, IS_OBSTRUCTED, IS_STWALL, IS_TREE, IS_ROOM, IS_WALL, TREE, ROOM, DOOR, CORR, SDOOR, SCORR, IRONBARS, SINK, D_BROKEN, D_CLOSED, D_ISOPEN, D_LOCKED, D_NODOOR, D_TRAPPED, W_NONDIGGABLE, W_NONPASSWALL, APPORT, CADAVER, ACCFOOD, DOGFOOD, MANFOOD, POISON, UNDEF, TABU, NO_MM_FLAGS, NO_MINVENT, MM_NOMSG, IN_SIGHT, ALL_TRAPS, ARROW_TRAP, ROCKTRAP, PIT, SPIKED_PIT, SQKY_BOARD, BEAR_TRAP, LANDMINE, ROLLING_BOULDER_TRAP, SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP, HOLE, TRAPDOOR, TELEP_TRAP, WEB, STATUE_TRAP, MAGIC_TRAP, ANTI_MAGIC, MAGIC_PORTAL, VIBRATING_SQUARE, ALLOW_M, ALLOW_TM, ALLOW_TRAPS, ALLOW_U, ALLOW_ALL, NOTONL, OPENDOOR, UNLOCKDOOR, BUSTDOOR, ALLOW_ROCK, ALLOW_WALL, ALLOW_DIG, ALLOW_SANCT, ALLOW_SSM, ALLOW_BARS, NOGARLIC, Is_airlevel, Is_oracle_level, ACCESSIBLE, IS_POOL, IS_LAVA, WATER, LAVAWALL, BOLT_LIM, MON_POLE_DIST, NO_WEAPON_WANTED, NEED_WEAPON, NEED_AXE, NEED_PICK_AXE, NEED_PICK_OR_AXE, VAULT, VAULT_GUARD_TIME, M_SEEN_MAGR, M_AP_FURNITURE, M_AP_OBJECT, M_AP_TYPE, MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER, OVERLOADED, ROOMOFFSET, SHOPBASE, STRAT_APPEARMSG } from './const.js';
import { CLR_BROWN, CLR_CYAN, CLR_MAGENTA, CLR_RED, CLR_WHITE, CLR_YELLOW, NO_COLOR } from './terminal.js';
import { advanceVaultGuard, prepareVaultGuardEscort, restVaultFakecorr } from './vault.js';
import { DISPLAY_MONSTER_GLYPHS, DISPLAY_MONSTER_HALLU_NAMES } from './monster_data.js';
import { clearMonsterTrack, updateMonsterTrack } from './montrack.js';
import { createGasCloud } from './region.js';
import { advanceFireBreathRay, finishHeroTargetedBreath, fireBreathDamageMonster, fireBreathZapHits } from './fire_breath.js';
import { attachFigurineTransformTimeout, figurineLocationCheck, isFigurineObject, makeFigurineFamiliar, stopFigurineTransformTimeout } from './figurine.js';
import { processBuriedOrganicRot, processMeltIceTimers, removedFromIcebox } from './ice.js';
import { SLIME_MOLD_OTYP, applySlimeMoldFruitFields } from './fruit.js';
import { applyMeltedIceMonsterLiquidEffects } from './monster_liquid.js';
import { eggHatchMonsterData, eggHasHatchTimer, isEggObject, killEggHatchTimer } from './egg_timers.js';
import { metallivoreObjectResists, monsterCouldEatMetalItem as sharedMonsterCouldEatMetalItem, monsterIsMetallivore, monsterIsRustMonster } from './metallivore.js';

const ROLE_STATE = {
    Archeologist: { rank: 'Digger', hpBase: 11, enBase: 1, enRnd: 0, ac: 0, initRecord: 10, attrBase: [7, 10, 10, 7, 7, 7], attrDist: [20, 20, 20, 10, 20, 10] },
    Barbarian: { rank: 'Plunderer', hpBase: 14, enBase: 1, enRnd: 0, ac: 0, initRecord: 10, attrBase: [16, 7, 7, 15, 16, 6], attrDist: [30, 6, 7, 20, 30, 7] },
    Caveman: { rank: 'Troglodyte', hpBase: 14, enBase: 1, enRnd: 0, ac: 0, initRecord: 0, attrBase: [10, 7, 7, 7, 8, 6], attrDist: [30, 6, 7, 20, 30, 7] },
    Healer: { rank: 'Rhizotomist', hpBase: 11, enBase: 1, enRnd: 4, ac: 0, initRecord: 10, attrBase: [7, 7, 13, 7, 11, 16], attrDist: [15, 20, 20, 15, 25, 5] },
    Knight: { rank: 'Gallant', hpBase: 14, enBase: 1, enRnd: 4, ac: 0, initRecord: 10, attrBase: [13, 7, 14, 8, 10, 17], attrDist: [30, 15, 15, 10, 20, 10] },
    Monk: { rank: 'Candidate', hpBase: 12, enBase: 2, enRnd: 2, ac: 0, initRecord: 10, attrBase: [10, 7, 8, 8, 7, 7], attrDist: [25, 10, 20, 20, 15, 10] },
    Priest: { rank: 'Aspirant', hpBase: 12, enBase: 4, enRnd: 3, ac: 0, attrBase: [7, 7, 10, 7, 7, 7], attrDist: [15, 10, 30, 15, 20, 10] },
    Ranger: { rank: 'Tenderfoot', hpBase: 13, enBase: 1, enRnd: 0, ac: 0, initRecord: 10, attrBase: [13, 13, 13, 9, 13, 7], attrDist: [30, 10, 10, 20, 20, 10] },
    Rogue: { rank: 'Footpad', hpBase: 10, enBase: 1, enRnd: 0, ac: 0, initRecord: 10, attrBase: [7, 7, 7, 10, 7, 6], attrDist: [20, 10, 10, 30, 20, 10] },
    Samurai: { rank: 'Hatamoto', hpBase: 13, enBase: 1, enRnd: 0, ac: 0, initRecord: 10, attrBase: [10, 8, 7, 10, 17, 6], attrDist: [30, 10, 8, 30, 14, 8] },
    Tourist: { rank: 'Rambler', hpBase: 8, enBase: 1, enRnd: 0, ac: 0, attrBase: [7, 10, 6, 7, 7, 10], attrDist: [15, 10, 10, 15, 30, 20] },
    Valkyrie: { rank: 'Stripling', hpBase: 14, enBase: 1, enRnd: 0, ac: 0, attrBase: [10, 7, 7, 7, 10, 7], attrDist: [30, 6, 7, 20, 30, 7] },
    Wizard: { rank: 'Evoker', hpBase: 10, enBase: 4, enRnd: 3, ac: 0, attrBase: [7, 10, 7, 7, 7, 7], attrDist: [10, 30, 10, 20, 20, 10] },
};

const RACE_STATE = {
    human: { adj: 'human', hpBase: 2, enBase: 1, attrMin: [3, 3, 3, 3, 3, 3], attrMax: [118, 18, 18, 18, 18, 18] },
    gnome: { adj: 'gnomish', hpBase: 1, enBase: 2, attrMin: [3, 3, 3, 3, 3, 3], attrMax: [68, 19, 18, 18, 18, 18] },
    dwarf: { adj: 'dwarven', hpBase: 4, enBase: 0, attrMin: [3, 3, 3, 3, 3, 3], attrMax: [118, 16, 16, 20, 20, 16] },
    orc: { adj: 'orcish', hpBase: 1, enBase: 1, attrMin: [3, 3, 3, 3, 3, 3], attrMax: [68, 16, 16, 18, 18, 16] },
    elf: { adj: 'elven', hpBase: 1, enBase: 2, attrMin: [3, 3, 3, 3, 3, 3], attrMax: [18, 20, 20, 18, 16, 18] },
};

const ALIGN_TYPE = { lawful: 1, neutral: 0, chaotic: -1 };
const ROLE_CANONICAL = new Map(Object.keys(ROLE_STATE).map(name => [name.toLowerCase(), name]));
const RACE_CANONICAL = new Map(Object.keys(RACE_STATE).map(name => [name.toLowerCase(), name]));
const ALIGN_CANONICAL = new Map(Object.keys(ALIGN_TYPE).map(name => [name.toLowerCase(), name]));
const GENDER_CANONICAL = new Map(['male', 'female'].map(name => [name, name]));
const EGG = 10001;
const LUMP_OF_ROYAL_JELLY = 10089;
const MEAT_RING = 10164;
const MEATBALL = 11012;
const ENORMOUS_MEATBALL = 11013;
const MEAT_STICK = 11014;
const STONED_TEXTS = [
    'You are slowing down.',
    'Your limbs are stiffening.',
    'Your limbs have turned to stone.',
    'You have turned to stone.',
    'You are a statue.',
];
const SLIME_TEXTS = new Map([
    [9, 'You are turning a little green.'],
    [7, 'Your limbs are getting oozy.'],
    [5, 'Your skin begins to peel away.'],
    [3, 'You are turning into a green slime.'],
    [1, 'You have become a green slime.'],
]);
const ROLE_PET = {
    Caveman: 'dog',
    Knight: 'pony',
    Ranger: 'dog',
    Samurai: 'dog',
    Wizard: 'cat',
};
const DEFAULT_DOG_NAMES = {
    Barbarian: 'Idefix',
    Caveman: 'Slasher',
    Ranger: 'Sirius',
    Samurai: 'Hachi',
};
const NO_POLY_FORM_NAMES = new Set([
    'werejackal', 'werewolf', 'orc', 'wererat', 'Angel', 'ki-rin', 'Archon',
    'Vlad the Impaler', 'Nazgul', 'doppelganger', 'soldier', 'sergeant',
    'nurse', 'lieutenant', 'captain', 'ghost', 'shade', 'water demon',
    'erinys', 'sandestin', 'Juiblex', 'Yeenoghu', 'Orcus', 'Geryon',
    'Dispater', 'Baalzebub', 'Asmodeus', 'Demogorgon', 'Death',
    'Pestilence', 'Famine', 'mail daemon', 'djinni', 'kraken', 'chameleon',
]);
const SHAPECHANGE_FORM_NAME_OVERRIDES = new Map([
    [5, 'queen bee'],
    [93, 'woodchuck'],
    [177, 'minotaur'],
]);

function levelRoomByRoomno(roomno) {
    if (roomno < ROOMOFFSET) return null;
    const idx = roomno - ROOMOFFSET;
    return game.level?.rooms?.[idx]
        || (game.level?.subrooms || []).find(room => room?.roomnoidx === idx)
        || null;
}

const FEMALE_ROLE_NAMES = {
    Caveman: 'Cavewoman',
    Priest: 'Priestess',
};

export function syncStartupIdentity(g = game) {
    const roleName = ROLE_CANONICAL.get(String(g._startup_role || '').toLowerCase()) || 'Tourist';
    const raceName = RACE_CANONICAL.get(String(g._startup_race || '').toLowerCase()) || 'human';
    const genderName = GENDER_CANONICAL.get(String(g._startup_gender || '').toLowerCase()) || 'female';
    const alignName = ALIGN_CANONICAL.get(String(g._startup_align || '').toLowerCase()) || 'neutral';
    const role = ROLE_STATE[roleName];
    const race = RACE_STATE[raceName];

    g._startup_role = roleName;
    g._startup_race = raceName;
    g._startup_gender = genderName;
    g._startup_align = alignName;
    g.flags ??= {};
    g.flags.female = genderName === 'female';
    g.urole = { name: { m: roleName, f: FEMALE_ROLE_NAMES[roleName] || null }, rank: { m: role.rank, f: role.rank } };
    g.urace = { adj: race.adj, noun: raceName };
    g.u ??= {};
    g.u.ualign = { type: ALIGN_TYPE[alignName], record: role.initRecord || 0 };
    return { roleName, raceName, genderName, alignName, role, race };
}
const AVAL = 50;
const STARTING_AC = {
    Archeologist: 9,
    Barbarian: 7,
    Caveman: 8,
    Healer: 8,
    Knight: 3,
    Monk: 4,
    Priest: 7,
    Ranger: 7,
    Rogue: 7,
    Samurai: 4,
    Tourist: 10,
    Valkyrie: 6,
    Wizard: 9,
};
const PANTHEON_ROLES = ['Archeologist', 'Barbarian', 'Caveman', 'Healer', 'Knight', 'Monk', 'Priest', 'Rogue', 'Ranger', 'Samurai', 'Tourist', 'Valkyrie', 'Wizard'];
const RANDOM_NEMESIS_GENDER_ROLES = new Set(['Archeologist', 'Wizard']);
const NON_MIMIC_HIDER_NAMES = new Set(['rock piercer', 'iron piercer', 'glass piercer', 'lurker above', 'trapper']);

const ROLE_INVENTORY = {
    Archeologist: [
        { cls: 'weapon', kind: 'bullwhip', spe: 2 },
        { cls: 'armor', kind: 'leather jacket' },
        { cls: 'armor', kind: 'fedora' },
        { cls: 'food', kind: 'food ration', plural: 'food rations', min: 3, max: 3, blessed: false },
        { cls: 'tool', kind: 'pick-axe' },
        { cls: 'tool', kind: 'tinning kit', tool: 'charges' },
        { cls: 'gem', kind: 'touchstone', blessed: false },
        { cls: 'tool', kind: 'sack', tool: 'sack', blessed: false },
    ],
    Barbarian_0: [
        { cls: 'weapon', kind: 'two-handed sword' },
        { cls: 'weapon', kind: 'axe' },
        { cls: 'armor', kind: 'ring mail' },
        { cls: 'food', kind: 'food ration', blessed: false },
    ],
    Barbarian_1: [
        { cls: 'weapon', kind: 'battle-axe' },
        { cls: 'weapon', kind: 'short sword' },
        { cls: 'armor', kind: 'ring mail' },
        { cls: 'food', kind: 'food ration', blessed: false },
    ],
    Caveman: [
        { cls: 'weapon', kind: 'club', spe: 1 },
        { cls: 'weapon', kind: 'sling', spe: 2 },
        { cls: 'gem', kind: 'flint stone', plural: 'flint stones', min: 10, max: 20 },
        { cls: 'gem', kind: 'rock', plural: 'rocks', min: 3, max: 3, blessed: false },
        { cls: 'armor', kind: 'leather armor' },
    ],
    Healer: [
        { cls: 'weapon', kind: 'scalpel' },
        { cls: 'armor', kind: 'leather gloves', spe: 1 },
        { cls: 'tool', kind: 'stethoscope' },
        { cls: 'potion', kind: 'healing', min: 4, max: 4 },
        { cls: 'potion', kind: 'extra healing', min: 4, max: 4 },
        { cls: 'wand', wand: 'sleep', kind: 'sleep' },
        { cls: 'spellbook', level: 1, spellName: 'healing', blessed: true },
        { cls: 'spellbook', level: 3, spellName: 'extra healing', blessed: true },
        { cls: 'spellbook', level: 3, spellName: 'stone to flesh', blessed: true },
        { cls: 'food', kind: 'apple', plural: 'apples', min: 5, max: 5 },
    ],
    Knight: [
        { cls: 'weapon', kind: 'long sword', spe: 1 },
        { cls: 'weapon', kind: 'lance', spe: 1 },
        { cls: 'armor', kind: 'ring mail', spe: 1 },
        { cls: 'armor', kind: 'helmet' },
        { cls: 'armor', kind: 'small shield' },
        { cls: 'armor', kind: 'leather gloves' },
        { cls: 'food', kind: 'apple', plural: 'apples', min: 10, max: 10 },
        { cls: 'food', kind: 'carrot', plural: 'carrots', min: 10, max: 10 },
    ],
    Monk: [
        { cls: 'armor', kind: 'leather gloves', spe: 2 },
        { cls: 'armor', kind: 'robe', spe: 1 },
        { cls: 'scroll', random: true },
        { cls: 'potion', kind: 'healing', min: 3, max: 3 },
        { cls: 'food', kind: 'food ration', plural: 'food rations', min: 3, max: 3 },
        { cls: 'food', kind: 'apple', plural: 'apples', min: 5, max: 5 },
        { cls: 'food', kind: 'orange', plural: 'oranges', min: 5, max: 5 },
        { cls: 'food', kind: 'fortune cookie', plural: 'fortune cookies', min: 3, max: 3 },
    ],
    Priest: [
        { cls: 'weapon', kind: 'mace', spe: 1, blessed: true },
        { cls: 'armor', kind: 'robe', bknown: false },
        { cls: 'armor', kind: 'small shield', bknown: false },
        { cls: 'potion', kind: 'holy water', plural: 'potions of holy water', min: 4, max: 4, blessed: true, bknown: true },
        { cls: 'food', kind: 'clove of garlic', plural: 'cloves of garlic', min: 1, max: 1, blessed: false, bknown: false },
        { cls: 'food', kind: 'sprig of wolfsbane', plural: 'sprigs of wolfsbane', blessed: false, bknown: false },
        { cls: 'spellbook', random: true, min: 2, max: 2, bknown: false },
    ],
    Ranger: [
        { cls: 'weapon', kind: 'dagger', spe: 1 },
        { cls: 'weapon', kind: 'bow', spe: 1 },
        { cls: 'weapon', kind: 'arrow', plural: 'arrows', multigen: true, poisonable: true, spe: 2, min: 50, max: 59 },
        { cls: 'weapon', kind: 'arrow', plural: 'arrows', multigen: true, poisonable: true, min: 30, max: 39 },
        { cls: 'armor', kind: 'cloak of displacement', spe: 2, worn: true },
        { cls: 'food', kind: 'cram ration', plural: 'cram rations', min: 4, max: 4, blessed: false },
    ],
    Rogue: [
        { cls: 'weapon', kind: 'short sword' },
        { cls: 'weapon', kind: 'dagger', plural: 'daggers', min: 6, max: 15, blessed: false },
        { cls: 'armor', kind: 'leather armor', spe: 1 },
        { cls: 'potion', kind: 'sickness', blessed: false },
        { cls: 'tool', kind: 'lock pick', blessed: false },
        { cls: 'tool', kind: 'sack', tool: 'sack', blessed: false },
    ],
    Samurai: [
        { cls: 'weapon', kind: 'katana' },
        { cls: 'weapon', kind: 'wakizashi' },
        { cls: 'weapon', kind: 'yumi' },
        { cls: 'weapon', kind: 'ya', multigen: true, poisonable: true, min: 26, max: 45 },
        { cls: 'armor', kind: 'splint mail' },
    ],
    Tourist: [
        { cls: 'weapon', kind: 'dart', plural: 'darts', multigen: true, poisonable: true, spe: 2, min: 21, max: 40 },
        { cls: 'food', random: true, min: 10, max: 10, blessed: false },
        { cls: 'potion', kind: 'extra healing', plural: 'potions of extra healing', min: 2, max: 2 },
        { cls: 'scroll', kind: 'magic mapping', plural: 'scrolls of magic mapping', min: 4, max: 4 },
        { cls: 'armor', kind: 'Hawaiian shirt' },
        { cls: 'tool', kind: 'expensive camera', tool: 'charges', blessed: false },
        { cls: 'tool', kind: 'credit card', blessed: false },
    ],
    Valkyrie: [
        { cls: 'weapon', kind: 'spear', spe: 1 },
        { cls: 'weapon', kind: 'dagger' },
        { cls: 'armor', kind: 'small shield', spe: 3 },
        { cls: 'food', kind: 'food ration', blessed: false },
    ],
    Wizard: [
        { cls: 'weapon', kind: 'quarterstaff', spe: 1, blessed: true },
        { cls: 'armor', kind: 'cloak of magic resistance' },
        { cls: 'wand', random: true },
        { cls: 'ring', random: true, min: 2, max: 2 },
        { cls: 'potion', random: true, min: 3, max: 3 },
        { cls: 'scroll', random: true, min: 3, max: 3 },
        { cls: 'spellbook', level: 1, spellName: 'force bolt', blessed: true },
        { cls: 'spellbook', random: true },
        { cls: 'tool', kind: 'magic marker', tool: 'magicMarker', spe: 19, blessed: false },
    ],
    Xtra_food: [
        { cls: 'food', random: true, min: 2, max: 2 },
    ],
};

const RACE_INVENTORY_SUBS = {
    elf: {
        dagger: { kind: 'elven dagger', plural: 'elven daggers' },
        spear: { kind: 'elven spear' },
        'short sword': { kind: 'elven short sword' },
        bow: { kind: 'elven bow' },
        arrow: { kind: 'elven arrow', plural: 'elven arrows' },
        helmet: { kind: 'elven leather helm' },
        'cloak of displacement': { kind: 'elven cloak' },
        'cram ration': { kind: 'lembas wafer', plural: 'lembas wafers' },
    },
    orc: {
        dagger: { kind: 'orcish dagger', plural: 'orcish daggers' },
        spear: { kind: 'orcish spear' },
        'short sword': { kind: 'orcish short sword' },
        bow: { kind: 'orcish bow' },
        arrow: { kind: 'orcish arrow', plural: 'orcish arrows' },
        helmet: { kind: 'orcish helm' },
        'small shield': { kind: 'orcish shield' },
        'ring mail': { kind: 'orcish ring mail' },
        'chain mail': { kind: 'orcish chain mail' },
        'cram ration': { kind: 'tripe ration', plural: 'tripe rations' },
        'lembas wafer': { kind: 'tripe ration', plural: 'tripe rations' },
    },
    dwarf: {
        spear: { kind: 'dwarvish spear' },
        'short sword': { kind: 'dwarvish short sword' },
        helmet: { kind: 'dwarvish iron helm' },
        'lembas wafer': { kind: 'cram ration', plural: 'cram rations' },
    },
    gnome: {
        bow: { kind: 'crossbow' },
        arrow: { kind: 'crossbow bolt', plural: 'crossbow bolts' },
    },
};

function applyRaceInventorySubstitution(obj, raceName) {
    const substitution = RACE_INVENTORY_SUBS[raceName]?.[obj?.kind];
    if (!substitution) return obj;
    const hadSingular = obj.singular !== undefined;
    Object.assign(obj, substitution);
    if (hadSingular && substitution.kind) obj.singular = substitution.singular || substitution.kind;
    return obj;
}

const OPTIONAL_INVENTORY = {
    Tinopener: [{ cls: 'tool', kind: 'tin opener', blessed: false }],
    Lamp: [{ cls: 'tool', kind: 'oil lamp', tool: 'lamp', spe: 1, blessed: false }],
    Magicmarker: [{ cls: 'tool', kind: 'magic marker', tool: 'magicMarker', spe: 19, blessed: false }],
    Blindfold: [{ cls: 'tool', kind: 'blindfold', blessed: false }],
    Leash: [{ cls: 'tool', kind: 'leash', blessed: false }],
    Towel: [{ cls: 'tool', kind: 'towel', blessed: false }],
    Healing_book: [{ cls: 'spellbook', level: 1, spellName: 'healing', blessed: true }],
    Protection_book: [{ cls: 'spellbook', level: 1, spellName: 'protection', blessed: true }],
    Confuse_monster_book: [{ cls: 'spellbook', level: 1, spellName: 'confuse monster', blessed: true }],
    Wishing: [{ cls: 'wand', kind: 'wishing', spe: 3 }],
    Money: [{ cls: 'coin' }],
};

const ARMOR_MAGIC_NEGATION = {
    'plate mail': 2,
    'crystal plate mail': 2,
    'bronze plate mail': 1,
    'splint mail': 1,
    'banded mail': 1,
    'dwarvish mithril-coat': 2,
    'elven mithril-coat': 2,
    'chain mail': 1,
    'orcish chain mail': 1,
    'scale mail': 1,
    'studded leather armor': 1,
    'ring mail': 1,
    'orcish ring mail': 1,
    'leather armor': 1,
    'mummy wrapping': 1,
    'elven cloak': 1,
    'orcish cloak': 1,
    'dwarvish cloak': 1,
    'oilskin cloak': 2,
    robe: 2,
    'alchemy smock': 1,
    'leather cloak': 1,
    'cloak of protection': 3,
    'cloak of invisibility': 1,
    'cloak of magic resistance': 1,
    'cloak of displacement': 1,
};

const PET_OBJECT_WEIGHTS = {
    'chain mail': 300,
    'alchemy smock': 10,
    'cloak of displacement': 10,
    'cloak of invisibility': 10,
    'cloak of magic resistance': 10,
    'cloak of protection': 10,
    'dwarvish cloak': 10,
    'elven cloak': 10,
    'orcish chain mail': 300,
    'orcish cloak': 10,
    'ring mail': 250,
    'orcish ring mail': 250,
    'scale mail': 250,
    'gray dragon scale mail': 40,
    'gold dragon scale mail': 40,
    'silver dragon scale mail': 40,
    'red dragon scale mail': 40,
    'white dragon scale mail': 40,
    'orange dragon scale mail': 40,
    'black dragon scale mail': 40,
    'blue dragon scale mail': 40,
    'green dragon scale mail': 40,
    'yellow dragon scale mail': 40,
    'gray dragon scales': 40,
    'gold dragon scales': 40,
    'silver dragon scales': 40,
    'red dragon scales': 40,
    'white dragon scales': 40,
    'orange dragon scales': 40,
    'black dragon scales': 40,
    'blue dragon scales': 40,
    'green dragon scales': 40,
    'yellow dragon scales': 40,
    'studded leather armor': 200,
    'leather armor': 150,
    'leather cloak': 15,
    'leather jacket': 30,
    'mummy wrapping': 3,
    'oilskin cloak': 10,
    robe: 15,
    'orcish helm': 30,
    'small shield': 30,
    'shield of drain resistance': 30,
    'shield of shock resistance': 30,
    'elven shield': 40,
    'Uruk-hai shield': 50,
    'orcish shield': 50,
    'large shield': 100,
    'dwarvish roundshield': 100,
    'shield of reflection': 50,
    helmet: 30,
    'gauntlets of power': 30,
    'leather gloves': 10,
    'speed boots': 20,
    'silver saber': 40,
    dart: 1,
    darts: 1,
    scalpel: 5,
    stethoscope: 4,
    apple: 2,
    'lump of royal jelly': 2,
    meatball: 1,
    'meat stick': 1,
    'enormous meatball': 400,
    rock: 10,
    'tinning kit': 100,
    touchstone: 10,
};
const PET_CLASS_WEIGHTS = { armor: 150, weapon: 30, tool: 10, food: 20, potion: 20, scroll: 5, spellbook: 50, wand: 7, ring: 3, gem: 1 };

function objectWeight(obj) {
    if (!obj) return 0;
    if (obj.otyp === 'corpse' || obj.otyp === CORPSE)
        return MONSTER_BODY_WEIGHTS.get(obj.corpsenm?.name) ?? obj.owt ?? 1;
    if (obj.owt != null) return obj.owt;
    if (obj.otyp === LARGE_BOX || obj.kind === 'large box') return 350;
    if (obj.otyp === CHEST || obj.kind === 'chest') return 600;
    const kind = String(obj.kind || obj.actualKind || '').replace(/^scroll labeled /, '').replace(/^potion of /, '');
    return PET_OBJECT_WEIGHTS[kind] ?? PET_CLASS_WEIGHTS[obj.cls] ?? 1;
}

function heroWearsNutritionAmulet() {
    return (game.inventory || []).some(item => {
        if (!item.worn) return false;
        if (!(item.cls === 'amulet' || item.amuletIndex != null || item.glyph === '"')) return false;
        const name = String(item.actualKind || item.kind || '').toLowerCase();
        return !/cheap plastic imitation/.test(name);
    });
}

function heroHasRealAmuletOfYendor() {
    return !!(game.u?.uhave?.amulet || (game.inventory || []).some(item =>
        item.realAmuletOfYendor || String(item.actualKind || item.kind || '').toLowerCase() === 'amulet of yendor'));
}

function ringNutritionName(item) {
    const roll = item?.ringRoll || item?.roll || 0;
    if (roll) return RING_NAMES[roll - 1] || '';
    return String(item?.actualKind || item?.kind || '').toLowerCase().replace(/^ring of /, '');
}

function wornRingOnHand(hand) {
    const handPattern = hand === 'left' ? /\(on left hand\)/ : /\(on right hand\)/;
    return (game.inventory || []).find(item => item.cls === 'ring' && (item.worn === hand || handPattern.test(item.line || '')));
}

function heroWearsRingNamed(name) {
    return (game.inventory || []).some(item =>
        item.cls === 'ring'
        && (item.worn || /\(on (?:left|right) hand\)/.test(item.line || ''))
        && ringNutritionName(item) === name);
}

function wornRingConsumesNutrition(hand) {
    const item = wornRingOnHand(hand);
    if (!item) return false;
    const name = ringNutritionName(item);
    if (name === 'meat ring') return false;
    if ((item.spe || 0) !== 0) return true;
    return !(item.charged || (item.ringRoll || item.roll || 99) <= 6);
}

function applyAccessoryHunger(accessorytime) {
    if (!game.u) return;
    if (accessorytime % 2) {
        if (heroWearsRingNamed('regeneration'))
            game.u.uhunger = (game.u.uhunger ?? 900) - 1;
        return;
    }
    if (heroWearsRingNamed('hunger'))
        game.u.uhunger = (game.u.uhunger ?? 900) - 1;
    if (accessorytime === 0 && heroHasSlowDigestion() && !heroWearsRingNamed('slow digestion'))
        game.u.uhunger = (game.u.uhunger ?? 900) - 1;
    else if (accessorytime === 4 && wornRingConsumesNutrition('left'))
        game.u.uhunger = (game.u.uhunger ?? 900) - 1;
    else if (accessorytime === 8 && heroWearsNutritionAmulet())
        game.u.uhunger = (game.u.uhunger ?? 900) - 1;
    else if (accessorytime === 12 && wornRingConsumesNutrition('right'))
        game.u.uhunger = (game.u.uhunger ?? 900) - 1;
    else if (accessorytime === 16 && heroHasRealAmuletOfYendor())
        game.u.uhunger = (game.u.uhunger ?? 900) - 1;
}

const TOURIST_FOODS = [
    [140, 'tripe ration', 'tripe rations', 'tripe'],
    [225, 'egg', 'eggs', 'egg'],
    [228, 'eucalyptus leaf', 'eucalyptus leaves', 'eucalyptus leaf'],
    [243, 'apple', 'apples', 'apple'],
    [253, 'orange', 'oranges', 'orange'],
    [263, 'pear', 'pears', 'pear'],
    [273, 'melon', 'melons', 'melon'],
    [283, 'banana', 'bananas', 'banana'],
    [298, 'carrot', 'carrots', 'carrot'],
    [305, 'sprig of wolfsbane', 'sprigs of wolfsbane', 'sprig of wolfsbane'],
    [312, 'clove of garlic', 'cloves of garlic', 'clove of garlic'],
    [387, 'slime mold', 'slime molds', 'slime mold'],
    [412, 'cream pie', 'cream pies', 'cream pie'],
    [425, 'candy bar', 'candy bars', 'candy bar'],
    [480, 'fortune cookie', 'fortune cookies', 'fortune cookie'],
    [505, 'pancake', 'pancakes', 'pancake'],
    [525, 'lembas wafer', 'lembas wafers', 'lembas wafer'],
    [545, 'cram ration', 'cram rations', 'cram ration'],
    [925, 'food ration', 'food rations', 'food ration'],
    [1000, 'tin', 'tins', 'tin'],
];

const PET_FOOD_DELAY = {
    'tripe ration': 2,
    tripe: 2,
    pancake: 2,
    'lembas wafer': 2,
    'cram ration': 3,
    'food ration': 5,
};

const RING_NAMES = [
    'adornment', 'gain strength', 'gain constitution', 'increase accuracy',
    'increase damage', 'protection', 'regeneration', 'searching', 'stealth',
    'sustain ability', 'levitation', 'hunger', 'aggravate monster', 'conflict',
    'warning', 'poison resistance', 'fire resistance', 'cold resistance',
    'shock resistance', 'free action', 'slow digestion', 'teleportation',
    'teleport control', 'polymorph', 'polymorph control', 'invisibility',
    'see invisible', 'protection from shape changers',
];
const POTION_NAMES = [
    'gain ability', 'restore ability', 'confusion', 'blindness', 'paralysis',
    'speed', 'levitation', 'hallucination', 'invisibility', 'see invisible',
    'healing', 'extra healing', 'gain level', 'enlightenment',
    'monster detection', 'object detection', 'gain energy', 'sleeping',
    'full healing', 'polymorph', 'booze', 'sickness', 'fruit juice', 'acid',
    'oil',
];
const POTION_BOTTLE_NAMES = ['bottle', 'phial', 'flagon', 'carafe', 'flask', 'jar', 'vial'];
const POT_HEALING = 235;
const POT_EXTRA_HEALING = 236;
const POT_GAIN_LEVEL = 237;
const POT_ACID = 238;
const POT_CONFUSION = 239;
const POT_BLINDNESS = 242;
const POT_SLEEPING = 243;
const POT_PARALYSIS = 244;
const POT_SPEED = 245;
const POT_FULL_HEALING = 246;
const SCR_TELEPORTATION = 287;
const SCR_CREATE_MONSTER = 292;
const WAN_STRIKING = 300;
const WAN_DIGGING = 305;
const WAN_MAGIC_MISSILE = 306;
const WAN_DEATH = 307;
const WAN_SLEEP = 308;
const WAN_FIRE = 309;
const WAN_COLD = 310;
const WAN_LIGHTNING = 311;
const WAN_TELEPORTATION = 312;
const WAN_CREATE_MONSTER = 313;
const WAN_SPEED_MONSTER = 10092;
const SCROLL_NAMES = [
    'enchant armor', 'destroy armor', 'confuse monster', 'scare monster',
    'remove curse', 'enchant weapon', 'create monster', 'taming', 'genocide',
    'light', 'teleportation', 'gold detection', 'food detection', 'identify',
    'magic mapping', 'amnesia', 'fire', 'earth', 'punishment', 'charging',
    'stinking cloud',
];
const WAND_NAMES = [
    'light', 'secret door detection', 'enlightenment', 'create monster',
    'wishing', 'stasis', 'nothing', 'striking', 'make invisible',
    'slow monster', 'speed monster', 'undead turning', 'polymorph',
    'cancellation', 'teleportation', 'opening', 'locking', 'probing',
    'digging', 'magic missile', 'fire', 'cold', 'sleep', 'death', 'lightning',
];
const WAND_NODIR = new Set(['light', 'secret door detection', 'enlightenment', 'create monster', 'wishing', 'stasis']);
const WEAPON_DISCOVERIES = [
    { name: 'elven arrow', appearance: 'runed arrow', ammo: true },
    { name: 'orcish arrow', appearance: 'crude arrow', ammo: true },
    { name: 'ya', appearance: 'bamboo arrow', ammo: true },
    { name: 'shuriken', appearance: 'throwing star', missile: true },
    { name: 'elven spear', appearance: 'runed spear', spear: true },
    { name: 'orcish spear', appearance: 'crude spear', spear: true },
    { name: 'dwarvish spear', appearance: 'stout spear', spear: true },
    { name: 'javelin', appearance: 'throwing spear', spear: true },
    { name: 'elven dagger', appearance: 'runed dagger', dagger: true },
    { name: 'orcish dagger', appearance: 'crude dagger', dagger: true },
    { name: 'shito', appearance: '[knife]', japaneseAlias: true },
    { name: 'battle-axe', appearance: 'double-headed axe' },
    { name: 'wakizashi', appearance: '[short sword]', japaneseAlias: true },
    { name: 'elven short sword', appearance: 'runed short sword' },
    { name: 'orcish short sword', appearance: 'crude short sword' },
    { name: 'dwarvish short sword', appearance: 'broad short sword' },
    { name: 'scimitar', appearance: 'curved sword' },
    { name: 'ninja-to', appearance: '[broadsword]', japaneseAlias: true },
    { name: 'elven broadsword', appearance: 'runed broadsword' },
    { name: 'katana', appearance: 'samurai sword' },
    { name: 'tsurugi', appearance: 'long samurai sword' },
    { name: 'runesword', appearance: 'runed broadsword' },
    { name: 'partisan', appearance: 'vulgar polearm', polearm: true },
    { name: 'ranseur', appearance: 'hilted polearm', polearm: true },
    { name: 'spetum', appearance: 'forked polearm', polearm: true },
    { name: 'glaive', appearance: 'single-edged polearm', polearm: true },
    { name: 'halberd', appearance: 'angled poleaxe', polearm: true },
    { name: 'bardiche', appearance: 'long poleaxe', polearm: true },
    { name: 'voulge', appearance: 'pole cleaver', polearm: true },
    { name: 'fauchard', appearance: 'pole sickle', polearm: true },
    { name: 'guisarme', appearance: 'pruning hook', polearm: true },
    { name: 'bill-guisarme', appearance: 'hooked polearm', polearm: true },
    { name: 'lucern hammer', appearance: 'pronged polearm', polearm: true },
    { name: 'bec de corbin', appearance: 'beaked polearm', polearm: true },
    { name: 'dwarvish mattock', appearance: 'broad pick' },
    { name: 'quarterstaff', appearance: 'staff' },
    { name: 'aklys', appearance: 'thonged club' },
    { name: 'elven bow', appearance: 'runed bow', launcher: true },
    { name: 'orcish bow', appearance: 'crude bow', launcher: true },
    { name: 'yumi', appearance: 'long bow', launcher: true },
];
const ARMOR_DISCOVERIES = [
    { name: 'elven leather helm', appearance: 'leather hat', race: 'elf', classKnown: true },
    { name: 'orcish helm', appearance: 'iron skull cap', race: 'orc', classKnown: true },
    { name: 'dwarvish iron helm', appearance: 'hard hat', race: 'dwarf', classKnown: true },
    { name: 'helmet', appearanceKey: ['helms', 0], classKnown: true },
    { name: 'orcish chain mail', appearance: 'crude chain mail', race: 'orc', classKnown: true },
    { name: 'orcish ring mail', appearance: 'crude ring mail', race: 'orc', classKnown: true },
    { name: 'elven cloak', appearance: 'faded pall', race: 'elf' },
    { name: 'orcish cloak', appearance: 'coarse mantelet', race: 'orc', classKnown: true },
    { name: 'dwarvish cloak', appearance: 'hooded cloak', race: 'dwarf', classKnown: true },
    { name: 'oilskin cloak', appearance: 'slippery cloak', classKnown: true },
    { name: 'cloak of magic resistance', appearanceKey: ['cloaks', 2] },
    { name: 'cloak of displacement', appearanceKey: ['cloaks', 3] },
    { name: 'elven shield', appearance: 'blue and green shield', race: 'elf', classKnown: true },
    { name: 'small shield', appearance: 'wooden shield' },
    { name: 'Uruk-hai shield', appearance: 'white-handed shield', race: 'orc', classKnown: true },
    { name: 'orcish shield', appearance: 'red-eyed shield', race: 'orc', classKnown: true },
    { name: 'dwarvish roundshield', appearance: 'large round shield', race: 'dwarf', classKnown: true },
    { name: 'leather gloves', appearanceKey: ['gloves', 0], classKnown: true },
    { name: 'gauntlets of power', appearanceKey: ['gloves', 2] },
    { name: 'low boots', appearance: 'walking shoes', classKnown: true },
    { name: 'iron shoes', appearance: 'hard shoes', classKnown: true },
    { name: 'high boots', appearance: 'jackboots', classKnown: true },
    { name: 'speed boots', appearanceKey: ['boots', 0] },
    { name: 'elven boots', appearanceKey: ['boots', 3], race: 'elf' },
];
const TOOL_DISCOVERY = {
    sack: { section: 'Tools', name: 'sack', appearance: 'bag' },
    'oil lamp': { section: 'Tools', name: 'oil lamp', appearance: 'lamp' },
};
const GEM_DISCOVERY = {
    touchstone: { section: 'Gems/Stones', name: 'touchstone', appearance: 'gray' },
    'flint stone': { section: 'Gems/Stones', name: 'flint stone', appearance: 'gray' },
};

const LEVEL_ONE_MONSTERS = [
    ['jackal', 3],
    ['fox', 1],
    ['kobold', 1],
    ['goblin', 2],
    ['sewer rat', 1],
    ['grid bug', 3],
    ['lichen', 4],
    ['kobold zombie', 1],
    ['newt', 5],
];

const SPELLBOOKS = [
    { max: 20, name: 'dig', level: 5, skill: 'matter' },
    { max: 65, name: 'magic missile', level: 2, skill: 'attack' },
    { max: 85, name: 'fireball', level: 4, skill: 'attack' },
    { max: 95, name: 'cone of cold', level: 4, skill: 'attack' },
    { max: 125, name: 'sleep', level: 3, skill: 'enchantment' },
    { max: 130, name: 'finger of death', level: 7, skill: 'attack' },
    { max: 175, name: 'light', level: 1, skill: 'divination' },
    { max: 218, name: 'detect monsters', level: 1, skill: 'divination' },
    { max: 258, name: 'healing', level: 1, skill: 'healing' },
    { max: 283, name: 'knock', level: 1, skill: 'matter' },
    { max: 313, name: 'force bolt', level: 1, skill: 'attack', forceBolt: true },
    { max: 362, name: 'confuse monster', level: 1, skill: 'enchantment' },
    { max: 387, name: 'cure blindness', level: 2, skill: 'healing' },
    { max: 397, name: 'drain life', level: 2, skill: 'attack' },
    { max: 427, name: 'slow monster', level: 2, skill: 'enchantment' },
    { max: 452, name: 'wizard lock', level: 2, skill: 'matter' },
    { max: 487, name: 'create monster', level: 2, skill: 'cleric' },
    { max: 517, name: 'detect food', level: 2, skill: 'divination' },
    { max: 542, name: 'cause fear', level: 3, skill: 'enchantment' },
    { max: 557, name: 'clairvoyance', level: 3, skill: 'divination' },
    { max: 589, name: 'cure sickness', level: 3, skill: 'healing' },
    { max: 609, name: 'charm monster', level: 5, skill: 'enchantment' },
    { max: 642, name: 'haste self', level: 3, skill: 'escape' },
    { max: 662, name: 'detect unseen', level: 3, skill: 'divination' },
    { max: 682, name: 'levitation', level: 4, skill: 'escape' },
    { max: 709, name: 'extra healing', level: 3, skill: 'healing' },
    { max: 734, name: 'restore ability', level: 4, skill: 'healing' },
    { max: 754, name: 'invisibility', level: 4, skill: 'escape' },
    { max: 774, name: 'detect treasure', level: 4, skill: 'divination' },
    { max: 799, name: 'remove curse', level: 3, skill: 'cleric' },
    { max: 817, name: 'magic mapping', level: 5, skill: 'divination' },
    { max: 837, name: 'identify', level: 3, skill: 'divination' },
    { max: 853, name: 'turn undead', level: 6, skill: 'cleric' },
    { max: 863, name: 'polymorph', level: 6, skill: 'matter' },
    { max: 878, name: 'teleport away', level: 6, skill: 'escape' },
    { max: 888, name: 'create familiar', level: 6, skill: 'cleric' },
    { max: 903, name: 'cancellation', level: 7, skill: 'matter' },
    { max: 921, name: 'protection', level: 1, skill: 'cleric' },
    { max: 941, name: 'jumping', level: 1, skill: 'escape' },
    { max: 956, name: 'stone to flesh', level: 3, skill: 'healing' },
    { max: 981, name: 'chain lightning', level: 2, skill: 'attack' },
    { max: 999, blank: true },
    { max: 1000, novel: true },
];

const ROLE_SPELL_SKILLS = {
    Healer: new Set(['healing']),
    Knight: new Set(['attack', 'healing', 'cleric']),
    Monk: new Set(['attack', 'healing', 'divination', 'enchantment', 'cleric', 'escape', 'matter']),
    Priest: new Set(['healing', 'divination', 'cleric']),
    Wizard: new Set(['attack', 'healing', 'divination', 'enchantment', 'cleric', 'escape', 'matter']),
};

function helloForRole(role) {
    if (role === 'Knight') return 'Salutations';
    if (role === 'Samurai') return 'Konnichi wa';
    if (role === 'Tourist') return 'Aloha';
    if (role === 'Valkyrie') return 'Velkommen';
    return 'Hello';
}

function introLines(roleName, rank, alignName) {
    const god = godForRole(roleName, alignName);
    const deityTitle = ['Ishtar', 'Athena', 'Brigit', 'Venus', 'Amaterasu Omikami', 'The Lady'].includes(god) ? 'goddess' : 'god';
    const lines = [
        `It is written in the Book of ${god}:`,
        '',
        '    After the Creation, the cruel god Moloch rebelled',
        '    against the authority of Marduk the Creator.',
        '    Moloch stole from Marduk the most powerful of all',
        '    the artifacts of the gods, the Amulet of Yendor,',
        '    and he hid it in the dark cavities of Gehennom, the',
        '    Under World, where he now lurks, and bides his time.',
        '',
        `Your ${deityTitle} ${god} seeks to possess the Amulet, and with it`,
        'to gain deserved ascendance over the other gods.',
        '',
        `You, a newly trained ${rank}, have been heralded`,
        `from birth as the instrument of ${god}.  You are destined`,
        'to recover the Amulet for your deity, or die in the',
        'attempt.  Your hour of destiny has come.  For the sake',
        `of us all:  Go bravely with ${god}!`,
        '--More--',
    ];
    const width = Math.max(...lines.map(line => line.length));
    const baseCol = Math.min(23, Math.max(0, 79 - width));
    return lines
        .map((line, row) => [row, baseCol + line.length - line.trimStart().length, line.trimStart()]);
}

function godForRole(roleName, alignName) {
    if (roleName === 'Priest') roleName = game._pantheon_role || 'Barbarian';
    const gods = {
        Archeologist: ['Quetzalcoatl', 'Camaxtli', 'Huhetotl'],
        Barbarian: ['Mitra', 'Crom', 'Set'],
        Caveman: ['Anu', 'Ishtar', 'Anshar'],
        Healer: ['Athena', 'Hermes', 'Poseidon'],
        Knight: ['Lugh', 'Brigit', 'Manannan Mac Lir'],
        Monk: ['Shan Lai Ching', 'Chih Sung-tzu', 'Huan Ti'],
        Priest: ['Mitra', 'Crom', 'Set'],
        Ranger: ['Mercury', 'Venus', 'Mars'],
        Rogue: ['Issek', 'Mog', 'Kos'],
        Samurai: ['Amaterasu Omikami', 'Raijin', 'Susanowo'],
        Tourist: ['Blind Io', 'The Lady', 'Offler'],
        Valkyrie: ['Tyr', 'Odin', 'Loki'],
        Wizard: ['Ptah', 'Thoth', 'Anhur'],
    }[roleName] || ['Marduk', 'Marduk', 'Marduk'];
    const idx = alignName === 'lawful' ? 0 : alignName === 'chaotic' ? 2 : 1;
    return gods[idx];
}

function trquan(item) {
    return (item.min ?? 1) + rn2((item.max ?? 1) - (item.min ?? 1) + 1);
}

function blessorcurse(chance) {
    if (!rn2(chance)) return rn2(2) ? 'blessed' : 'cursed';
    return '';
}

function discoveryAppearance(entry) {
    if (!entry?.appearanceKey) return entry?.appearance;
    const [group, index] = entry.appearanceKey;
    return game._object_descriptions?.[group]?.[index] || entry.appearance;
}

function recordDiscovery(section, name, appearance, starred = true) {
    if (!name) return;
    game._discoveries ??= [];
    const text = appearance ? `${name}${appearance.startsWith('[') ? ` ${appearance}` : ` (${appearance})`}` : name;
    const existing = game._discoveries.find(item => item.section === section && item.name === name);
    if (existing) {
        existing.text = text;
        if (!starred) existing.starred = false;
        return;
    }
    game._discoveries.push({ section, name, text, starred });
}

function recordDiscoveryEntry(section, entry, starred = true) {
    recordDiscovery(section, entry.name, discoveryAppearance(entry), starred);
}

function pairArmorDiscoveryName(name) {
    return /(?:boots|shoes|gloves)$/.test(name) || name.startsWith('gauntlets')
        ? `pair of ${name}` : name;
}

function recordArmorDiscoveryByKind(kind, starred = false) {
    const name = String(kind || '').toLowerCase();
    const armor = ARMOR_DISCOVERIES.find(entry => entry.name.toLowerCase() === name);
    if (armor) recordDiscovery('Armor', pairArmorDiscoveryName(armor.name), discoveryAppearance(armor), starred);
}

function recordWeaponDiscoveryForItem(weapon, visible = true) {
    if (!visible) return;
    if (weapon?.kind === 'orcish dagger' || weapon?.otyp === ORCISH_DAGGER)
        recordDiscovery('Weapons', 'crude dagger', null, false);
}

function recordPotionDiscovery(kind, starred = false) {
    const raw = String(kind || '').replace(/^potion:/, '').replace(/^potion of /, '');
    const potion = raw === 'holy water' ? 'water' : raw;
    const index = POTION_NAMES.indexOf(potion);
    const appearance = potion === 'water' ? 'clear' : game._object_descriptions?.potions?.[index]?.description;
    recordDiscovery('Potions', `potion of ${potion}`, appearance, starred);
}

function recordScrollDiscovery(kind, starred = false) {
    const scroll = String(kind || '').replace(/^scroll:/, '').replace(/^scroll of /, '');
    const index = SCROLL_NAMES.indexOf(scroll);
    recordDiscovery('Scrolls', `scroll of ${scroll}`, game._object_descriptions?.scrolls?.[index], starred);
}

function recordRingDiscovery(kind, starred = false) {
    const ring = String(kind || '').replace(/^ring of /, '');
    const index = RING_NAMES.indexOf(ring);
    recordDiscovery('Rings', `ring of ${ring}`, game._object_descriptions?.rings?.[index], starred);
}

function recordWandDiscovery(kind, starred = false) {
    const wand = String(kind || '').replace(/^wand of /, '');
    const index = WAND_NAMES.indexOf(wand);
    recordDiscovery('Wands', `wand of ${wand}`, game._object_descriptions?.wands?.[index]?.description, starred);
}

function recordSpellbookDiscovery(item, starred = false) {
    const spellName = item.spellName || item.spell?.name || String(item.kind || '').replace(/^spellbook(?: of)? /, '');
    const index = SPELLBOOKS.findIndex(spell => spell.name === spellName);
    recordDiscovery('Spellbooks', `spellbook of ${spellName}`, game._object_descriptions?.spellbooks?.[index], starred);
}

function recordStartupInventoryDiscovery(item) {
    const kind = String(item.kind || '').toLowerCase();
    const weapon = WEAPON_DISCOVERIES.find(entry => entry.name === kind);
    if (weapon) recordDiscoveryEntry('Weapons', weapon, false);
    recordArmorDiscoveryByKind(kind, false);
    if (item.cls === 'potion' && kind) recordPotionDiscovery(kind, false);
    if (item.cls === 'scroll' && kind) recordScrollDiscovery(kind, false);
    if (item.cls === 'ring' && kind) recordRingDiscovery(kind, false);
    if (item.cls === 'wand' && kind) recordWandDiscovery(kind, false);
    if (item.cls === 'spellbook') recordSpellbookDiscovery(item, false);
    if (TOOL_DISCOVERY[kind]) recordDiscoveryEntry(TOOL_DISCOVERY[kind].section, TOOL_DISCOVERY[kind], false);
    if (GEM_DISCOVERY[kind]) recordDiscoveryEntry(GEM_DISCOVERY[kind].section, GEM_DISCOVERY[kind], false);
    if (kind === 'oil lamp') recordPotionDiscovery('oil', true);
}

function recordKnownWeaponClass(roleName) {
    if (roleName === 'Ranger') {
        for (const entry of WEAPON_DISCOVERIES.filter(entry => entry.ammo || entry.launcher || entry.spear))
            recordDiscoveryEntry('Weapons', entry, true);
    } else if (roleName === 'Rogue') {
        for (const entry of WEAPON_DISCOVERIES.filter(entry => entry.dagger))
            recordDiscoveryEntry('Weapons', entry, true);
    } else if (roleName === 'Knight' || roleName === 'Samurai') {
        for (const entry of WEAPON_DISCOVERIES.filter(entry => roleName === 'Samurai' || !entry.japaneseAlias))
            recordDiscoveryEntry('Weapons', entry, true);
    } else if (roleName === 'Barbarian' || roleName === 'Valkyrie') {
        for (const entry of WEAPON_DISCOVERIES.filter(entry => !entry.polearm && !entry.japaneseAlias))
            recordDiscoveryEntry('Weapons', entry, true);
    }
}

function recordKnownArmorClass() {
    for (const entry of ARMOR_DISCOVERIES.filter(entry => entry.classKnown)) {
        recordDiscovery('Armor', pairArmorDiscoveryName(entry.name), discoveryAppearance(entry), entry.name !== 'leather gloves');
    }
}

function recordRoleDiscoveries(roleName) {
    recordKnownWeaponClass(roleName);
    if (['Barbarian', 'Knight', 'Monk', 'Samurai', 'Valkyrie'].includes(roleName)) recordKnownArmorClass();
    if (roleName === 'Archeologist') {
        recordDiscoveryEntry('Tools', TOOL_DISCOVERY.sack, true);
        recordDiscoveryEntry('Gems/Stones', GEM_DISCOVERY.touchstone, true);
    } else if (roleName === 'Healer') {
        recordPotionDiscovery('full healing', true);
    } else if (roleName === 'Monk') {
        recordDiscoveryEntry('Weapons', WEAPON_DISCOVERIES.find(entry => entry.name === 'shuriken'), true);
    } else if (roleName === 'Priest') {
        recordPotionDiscovery('water', true);
    } else if (roleName === 'Rogue') {
        recordDiscoveryEntry('Tools', TOOL_DISCOVERY.sack, true);
    }
}

function recordWizardSpellbookDiscoveries(roleName) {
    if (roleName !== 'Wizard') return;
    const knownLevel = { attack: 3, enchantment: 3, healing: 1, divination: 1, cleric: 1, escape: 1, matter: 1 };
    for (const spell of SPELLBOOKS) {
        if (spell.blank || spell.novel || spell.level > (knownLevel[spell.skill] || 0)) continue;
        const name = `spellbook of ${spell.name}`;
        if ((game._discoveries || []).some(entry => entry.section === 'Spellbooks' && entry.name === name)) continue;
        const index = SPELLBOOKS.findIndex(candidate => candidate.name === spell.name);
        recordDiscovery('Spellbooks', name, game._object_descriptions?.spellbooks?.[index], true);
    }
}

function recordRaceDiscoveries(raceName) {
    const weaponPrefix = { elf: 'elven', orc: 'orcish', dwarf: 'dwarvish' }[raceName];
    const orderedWeapons = {
        orc: ['orcish dagger', 'orcish short sword', 'orcish arrow', 'orcish bow', 'orcish spear'],
    }[raceName];
    if (orderedWeapons) {
        for (const name of orderedWeapons)
            recordDiscoveryEntry('Weapons', WEAPON_DISCOVERIES.find(entry => entry.name === name), true);
    } else if (weaponPrefix) {
        for (const entry of WEAPON_DISCOVERIES.filter(entry => entry.name.startsWith(`${weaponPrefix} `)))
            recordDiscoveryEntry('Weapons', entry, true);
    }
    const orderedArmor = {
        orc: ['orcish chain mail', 'orcish ring mail', 'orcish helm', 'orcish shield', 'Uruk-hai shield', 'orcish cloak'],
    }[raceName];
    if (orderedArmor) {
        for (const name of orderedArmor)
            recordDiscoveryEntry('Armor', ARMOR_DISCOVERIES.find(entry => entry.name === name), true);
    } else {
        for (const entry of ARMOR_DISCOVERIES.filter(entry => entry.race === raceName))
            recordDiscoveryEntry('Armor', entry, true);
    }
}

function initWeapon(item) {
    let blessed = false;
    if (item.multigen) rn2(6);
    if (!rn2(11)) {
        rne(3);
        blessed = !!rn2(2);
    } else if (!rn2(10)) {
        rne(3);
    } else {
        blessed = blessorcurse(10) === 'blessed';
    }
    if (item.poisonable) rn2(100);
    return { ...item, blessed };
}

function initArmor(item) {
    let blessed = false;
    let cursed = false;
    if (rn2(10) && !rn2(11)) {
        cursed = true;
        rne(3);
    } else if (!rn2(10)) {
        blessed = !!rn2(2);
        rne(3);
    } else {
        const bc = blessorcurse(10);
        blessed = bc === 'blessed';
        cursed = bc === 'cursed';
    }
    return { ...item, blessed, cursed, known: true };
}

function rndmonnumLevelOne() {
    let total = 0;
    let selected = 'newt';
    for (const [name, freq] of LEVEL_ONE_MONSTERS) {
        total += freq;
        if (rn2(total) < freq) selected = name;
    }
    return selected;
}

function initFoodFromRoll(roll) {
    const food = TOURIST_FOODS.find(([max]) => roll <= max);
    const obj = {
        cls: 'food',
        roll,
        foodRoll: roll,
        singular: food?.[1] || 'food ration',
        plural: food?.[2] || 'food rations',
        kind: food?.[3] || 'food ration',
    };
    if (roll > 312 && roll <= 387) applySlimeMoldFruitFields(Object.assign(obj, { otyp: SLIME_MOLD_OTYP }));
    next_ident();
    if (roll > 925) {
        if (rn2(6)) {
            const monster = rndmonnumLevelOne();
            rn2(15);
            const meat = monster === 'lichen' ? monster : `${monster} meat`;
            obj.kind = `tin:${monster}`;
            obj.singular = `tin of ${meat}`;
            obj.plural = `tins of ${meat}`;
        } else {
            obj.kind = 'tin:spinach';
            obj.singular = 'tin of spinach';
            obj.plural = 'tins of spinach';
        }
        blessorcurse(10);
        obj._createdQuan = rn2(6) ? 1 : 2;
    } else if (roll > 412 && roll <= 425) {
        rn2(12);
        obj._createdQuan = rn2(6) ? 1 : 2;
    } else if (roll > 140 && roll <= 225) {
        obj.otyp = EGG;
        obj.glyph = '%';
        obj.age = game.moves || 1;
        let hatchableEgg = false;
        if (!rn2(3)) {
            for (let tryct = 200; tryct > 0; tryct--) {
                const ptr = rndmonnum();
                if (ptr.oviparous) rn2(77);
                if (ptr.hatchable || ptr.oviparous) {
                    hatchableEgg = true;
                    break;
                }
            }
        }
        obj._createdQuan = rn2(6) ? 1 : 2;
        if (hatchableEgg) {
            for (let i = 151; i <= 200; i++)
                if (rnd(i) > 150) break;
        }
    } else {
        obj._createdQuan = rn2(6) ? 1 : 2;
    }
    return obj;
}

function quiverSuffix(item) {
    const cls = item.cls || '';
    const name = String(item.actualKind || item.kind || pickupObjectName(item)).toLowerCase();
    const bowAmmo = /\b(?:arrow|arrows|ya)\b/.test(name);
    const crossbowAmmo = /\bcrossbow bolts?\b/.test(name);
    if (cls === 'weapon' || item.otyp === DART || item.glyph === ')') {
        if (bowAmmo) return ' (in quiver)';
        if (crossbowAmmo) return ' (in quiver pouch)';
        return ' (at the ready)';
    }
    if (cls === 'ring' || cls === 'amulet' || cls === 'wand' || cls === 'coin' || cls === 'gem') return ' (in quiver pouch)';
    return ' (at the ready)';
}

function initRingRoll(roll) {
    next_ident();
    let spe = 0;
    let cursed = false;
    let blessed = false;
    if (roll <= 6) {
        const bc = blessorcurse(3);
        cursed = bc === 'cursed';
        blessed = bc === 'blessed';
        if (rn2(10)) {
            const sign = blessed ? 1 : cursed ? -1 : 0;
            if (rn2(10) && sign) spe = sign * rne(3);
            else spe = rn2(2) ? rne(3) : -rne(3);
        }
        if (!spe) {
            spe = rn2(4) - rn2(3);
        }
        if (spe < 0 && rn2(5)) cursed = true;
    } else if (rn2(10) && ([12, 13, 22, 24].includes(roll) || !rn2(9))) {
        cursed = true;
    }
    return { cls: 'ring', roll, kind: `ring of ${RING_NAMES[roll - 1]}`, charged: roll <= 6, spe, cursed, blessed };
}

function spellbookForRoll(roll) {
    return SPELLBOOKS.find(spell => roll <= spell.max);
}

function spellbookAllowed(spell, state) {
    if (spell.blank || spell.novel) return false;
    if (spell.forceBolt && state.roleName === 'Wizard') return false;
    if (state.noCreateSpell === spell) return false;
    if (spell.level > (state.gotSpell1 ? 3 : 1)) return false;
    const skills = ROLE_SPELL_SKILLS[state.roleName];
    return !skills || skills.has(spell.skill);
}

function randomObjectAllowed(cls, obj, state) {
    if (cls === 'ring') {
        if ([11, 12, 13].includes(obj.roll)) return false;
        if (state.noCreateRings?.has(obj.roll)) return false;
        return true;
    }
    if (cls === 'wand') return obj.kind !== 'wishing' && obj.kind !== 'nothing';
    if (cls === 'potion') {
        if (state.noCreatePotions === obj.kind) return false;
        return !(obj.roll >= 271 && obj.roll <= 300) && !(obj.roll >= 881 && obj.roll <= 890);
    }
    if (cls === 'scroll') {
        if (obj.roll >= 845 && obj.roll <= 909) return false;
        if (obj.roll >= 973) return false;
        return !(state.roleName === 'Monk' && obj.roll >= 262 && obj.roll <= 341);
    }
    if (cls === 'spellbook') return obj.spell?.name !== state.noCreateSpellName && spellbookAllowed(obj.spell, state);
    return true;
}

function rememberRandomObject(cls, obj, state) {
    if (cls === 'wand' && obj.kind === 'polymorph') {
        state.noCreateRings ??= new Set();
        state.noCreateRings.add(25);
    } else if (cls === 'ring') {
        state.noCreateRings ??= new Set();
        state.noCreateRings.add(obj.roll);
        if (obj.roll === 24) state.noCreateRings.add(25);
        if (obj.roll === 25) {
            state.noCreateRings.add(24);
            state.noCreatePotions = 'polymorph';
            state.noCreateSpellName = 'polymorph';
        }
    } else if (cls === 'potion' && obj.kind === 'polymorph') {
        state.noCreateRings ??= new Set();
        state.noCreateRings.add(25);
    } else if (cls === 'spellbook') {
        state.noCreateSpell = obj.spell;
    }
}

function initRandomObject(cls, state) {
    for (;;) {
        let obj;
        if (cls === 'food') obj = initFoodFromRoll(rnd(1000));
        else if (cls === 'wand') {
            const roll = rnd(1000);
            const wandIndex = wandIndexForRoll(roll);
            const kind = WAND_NAMES[wandIndex];
            obj = { cls, roll, wandIndex, kind };
            next_ident();
            if (kind === 'wishing') obj.spe = 1;
            else if (kind === 'stasis') obj.spe = 3 + rn2(4);
            else obj.spe = (WAND_NODIR.has(kind) ? 11 : 4) + rn2(5);
            const bc = blessorcurse(17);
            obj.blessed = bc === 'blessed';
            obj.cursed = bc === 'cursed';
        } else if (cls === 'ring') {
            obj = initRingRoll(rnd(28));
        } else if (cls === 'potion') {
            const roll = rnd(1000);
            const potionIndex = potionIndexForRoll(roll);
            obj = { cls, roll, potionIndex, kind: potionIndex == null ? 'water' : POTION_NAMES[potionIndex] };
            next_ident();
            const bc = blessorcurse(4);
            obj.blessed = bc === 'blessed';
            obj.cursed = bc === 'cursed';
        } else if (cls === 'scroll') {
            const roll = rnd(1000);
            const scrollIndex = scrollIndexForRoll(roll);
            obj = { cls, roll, scrollIndex, kind: SCROLL_NAMES[scrollIndex] || 'blank paper' };
            next_ident();
            const bc = blessorcurse(4);
            obj.blessed = bc === 'blessed';
            obj.cursed = bc === 'cursed';
        } else if (cls === 'spellbook') {
            const roll = rnd(1000);
            obj = { cls, roll, spell: spellbookForRoll(roll) };
            next_ident();
            const bc = blessorcurse(17);
            obj.blessed = bc === 'blessed';
            obj.cursed = bc === 'cursed';
        }
        if (randomObjectAllowed(cls, obj, state)) {
            rememberRandomObject(cls, obj, state);
            return obj;
        }
    }
}

function initSpecificObject(item) {
    const obj = { ...item };
    next_ident();
    if (obj.tool === 'sack' || obj.kind === 'sack') {
        const contents = 0;
        rn2(contents + 1);
    }
    if (obj.cls === 'weapon') return initWeapon(obj);
    if (obj.cls === 'armor') return initArmor(obj);
    else if (obj.cls === 'food') {
        if (obj.age == null) obj.age = Math.max(game.moves || 0, 1);
        if (obj.kind === 'kelp frond') obj._createdQuan = rnd(2);
        else {
            const roll = rn2(6);
            if (!['corpse', 'meat ring'].includes(obj.kind)) obj._createdQuan = roll ? 1 : 2;
        }
    }
    else if (obj.cls === 'gem') {
        const roll = rn2(6);
        if (obj.kind === 'rock') obj._createdQuan = 6 + roll;
        else if (obj.kind === 'flint stone') obj._createdQuan = roll ? 1 : 2;
    }
    else if (obj.cls === 'potion' || obj.cls === 'scroll') {
        const bc = blessorcurse(4);
        obj.blessed = bc === 'blessed';
        obj.cursed = bc === 'cursed';
    } else if (obj.cls === 'spellbook') {
        const bc = blessorcurse(17);
        obj.blessed = bc === 'blessed';
        obj.cursed = bc === 'cursed';
    } else if (obj.cls === 'wand') {
        if (obj.charges != null) obj.spe = obj.charges;
        if (obj.spe === undefined) obj.spe = 4 + rn2(5);
        const bc = blessorcurse(17);
        obj.blessed = bc === 'blessed';
        obj.cursed = bc === 'cursed';
    } else if (obj.tool === 'charges' || obj.tool === 'magicMarker') {
        const spe = 30 + rn2(70);
        if (obj.spe === undefined) obj.spe = spe;
    } else if (obj.tool === 'lamp') {
        rn2(500);
        const bc = blessorcurse(5);
        obj.blessed = bc === 'blessed';
        obj.cursed = bc === 'cursed';
    }
    return obj;
}

function initInventoryObject(item, state, recordInventory = true, stackQuan = 1) {
    const obj = item.random ? initRandomObject(item.cls, state) : initSpecificObject(item);
    applyRaceInventorySubstitution(obj, state.raceName);
    if ((obj.cls === 'weapon' || obj.cls === 'armor' || obj.kind === 'pick-axe') && obj.spe == null) obj.spe = 0;
    if (obj.cls === 'weapon' || obj.cls === 'armor' || obj.kind === 'pick-axe') obj.known = true;
    if (item.blessed !== undefined) {
        obj.blessed = item.blessed;
        obj.cursed = false;
    }
    obj.cursed = false;
    if (obj.cls !== 'coin') {
        obj.dknown = true;
        obj.bknown = true;
        obj.rknown = true;
        if (obj.otyp === LARGE_BOX || obj.otyp === CHEST || obj.otyp === STATUE
            || obj.kind === 'sack' || obj.tool === 'sack') {
            obj.cknown = true;
            obj.lknown = true;
        }
    }
    if (item.bknown !== undefined) obj.bknown = item.bknown;
    let actualQuan = obj._createdQuan ?? stackQuan;
    if (item.cls === 'weapon' || item.cls === 'tool') actualQuan = trquan(item);
    if (obj.cls === 'ring' && obj.charged && obj.spe <= 0) obj.spe = rne(3);
    if (item.tool === 'magicMarker') obj.spe = (item.spe ?? 19) + rn2(4);
    if (obj.cls === 'spellbook' && (obj.level === 1 || obj.spell?.level === 1)) state.gotSpell1 = true;
    if (recordInventory) {
        state.inventory ??= [];
        if ((item.random || obj.kind != null) && ['scroll', 'potion', 'food', 'gem'].includes(obj.cls)) {
            const existing = state.inventory.find(inv => inv.cls === obj.cls
                && !!inv.blessed === !!obj.blessed
                && !!inv.cursed === !!obj.cursed
                && inv.kind === obj.kind);
            if (existing) {
                existing.quan = (existing.quan || 1) + actualQuan;
                return obj;
            }
        }
        const letter = obj.cls === 'coin' ? '$' : String.fromCharCode(state.nextLetter++);
        const inventoryItem = { ...obj, letter, quan: actualQuan };
        delete inventoryItem._createdQuan;
        if (inventoryItem.cls === 'spellbook') {
            const spell = inventoryItem.spell || SPELLBOOKS.find(entry => entry.name === inventoryItem.spellName);
            const name = spell?.name || inventoryItem.spellName;
            if (name && !(state.knownSpells || []).some(entry => entry.name === name)) {
                state.knownSpells ??= [];
                state.knownSpells.push({
                    name,
                    level: inventoryItem.level || spell?.level || 1,
                    skill: spell?.skill,
                    turns: 20000,
                });
                inventoryItem.knownSpell = true;
            }
        }
        if (inventoryItem.cls === 'armor') inventoryItem.worn = true;
        if (inventoryItem.worn && inventoryItem.kind) {
            const article = /^[aeiou]/i.test(inventoryItem.kind) ? 'an' : 'a';
            const enchantment = inventoryItem.spe == null ? '' : `${inventoryItem.spe >= 0 ? '+' : ''}${inventoryItem.spe} `;
            inventoryItem.line = `${letter} - ${article} ${enchantment}${inventoryItem.kind} (being worn)`;
        }
        state.inventory.push(inventoryItem);
    }
    return obj;
}

function iniInv(items, state) {
    let idx = 0;
    let quan = trquan(items[idx]);
    let recordInventory = true;
    while (idx < items.length) {
        const item = items[idx];
        const splitRandomStack = !!item.random;
        const stackableGeneratedQuan = !item.random && item.cls === 'gem'
            && (item.kind === 'flint stone' || item.kind === 'rock');
        const stackableSpecific = (state.roleName === 'Healer' || state.roleName === 'Tourist')
            && !item.random
            && ['scroll', 'potion', 'food', 'gem'].includes(item.cls);
        const obj = initInventoryObject(item, state, splitRandomStack || stackableSpecific || stackableGeneratedQuan || recordInventory,
            splitRandomStack || stackableSpecific || stackableGeneratedQuan ? 1 : quan);
        if (!recordInventory && item.cls === 'food') {
            for (let i = (state.inventory || []).length - 1; i >= 0; i--) {
                const existing = state.inventory[i];
                if (existing.cls !== obj.cls || existing.kind !== obj.kind
                    || !!existing.blessed !== !!obj.blessed || !!existing.cursed !== !!obj.cursed) continue;
                existing.quan = (existing.quan || 1) + (obj._createdQuan ?? 1);
                break;
            }
        }
        recordInventory = splitRandomStack || stackableGeneratedQuan;
        if (stackableSpecific) recordInventory = true;
        if (item.cls === 'weapon' || item.cls === 'tool') quan = 1;
        if (--quan) continue;
        idx++;
        if (idx < items.length) quan = trquan(items[idx]);
        recordInventory = true;
    }
}

function initializeRoleInventory(roleName, raceName) {
    const state = { roleName, raceName, gotSpell1: false, inventory: [], knownSpells: [], nextLetter: 'a'.charCodeAt(0) };
    game._discoveries = [];
    const substitutions = RACE_INVENTORY_SUBS[raceName] || {};
    const roleInventory = items => items.map(item =>
        item.kind && substitutions[item.kind] ? { ...item, ...substitutions[item.kind] } : item);
    if (roleName === 'Archeologist') {
        iniInv(roleInventory(ROLE_INVENTORY.Archeologist), state);
        if (!rn2(10)) iniInv(OPTIONAL_INVENTORY.Tinopener, state);
        else if (!rn2(4)) iniInv(OPTIONAL_INVENTORY.Lamp, state);
        else if (!rn2(5)) iniInv(OPTIONAL_INVENTORY.Magicmarker, state);
    } else if (roleName === 'Barbarian') {
        iniInv(roleInventory(ROLE_INVENTORY[rn2(100) >= 50 ? 'Barbarian_0' : 'Barbarian_1']), state);
        if (!rn2(6)) iniInv(OPTIONAL_INVENTORY.Lamp, state);
    } else if (roleName === 'Healer') {
        game._goldCount = rn2(1000) + 1001;
        iniInv(roleInventory(ROLE_INVENTORY.Healer), state);
        if (!rn2(25)) iniInv(OPTIONAL_INVENTORY.Lamp, state);
    } else if (roleName === 'Monk') {
        iniInv(roleInventory(ROLE_INVENTORY.Monk), state);
        iniInv([OPTIONAL_INVENTORY[['Healing_book', 'Protection_book', 'Confuse_monster_book'][Math.trunc(rn2(90) / 30)]][0]], state);
        if (!rn2(4)) iniInv(OPTIONAL_INVENTORY.Magicmarker, state);
        else if (!rn2(10)) iniInv(OPTIONAL_INVENTORY.Lamp, state);
    } else if (roleName === 'Priest') {
        iniInv(roleInventory(ROLE_INVENTORY.Priest), state);
        if (!rn2(5)) iniInv(OPTIONAL_INVENTORY.Magicmarker, state);
        else if (!rn2(10)) iniInv(OPTIONAL_INVENTORY.Lamp, state);
    } else if (roleName === 'Tourist') {
        game._goldCount = rnd(1000);
        iniInv(roleInventory(ROLE_INVENTORY.Tourist), state);
        if (!rn2(25)) iniInv(OPTIONAL_INVENTORY.Tinopener, state);
        else if (!rn2(25)) iniInv(OPTIONAL_INVENTORY.Leash, state);
        else if (!rn2(25)) iniInv(OPTIONAL_INVENTORY.Towel, state);
        else if (!rn2(20)) iniInv(OPTIONAL_INVENTORY.Magicmarker, state);
    } else if (ROLE_INVENTORY[roleName]) {
        iniInv(roleInventory(ROLE_INVENTORY[roleName]), state);
        if ((roleName === 'Rogue' || roleName === 'Samurai' || roleName === 'Wizard') && !rn2(5))
            iniInv(OPTIONAL_INVENTORY.Blindfold, state);
        if (roleName === 'Valkyrie' && !rn2(6)) iniInv(OPTIONAL_INVENTORY.Lamp, state);
    }
    if (raceName === 'elf' && (roleName === 'Priest' || roleName === 'Wizard')) {
        const instruments = ['wooden flute', 'tooled horn', 'wooden harp', 'bell', 'bugle', 'leather drum'];
        iniInv([{ cls: 'tool', kind: instruments[rn2(instruments.length)], blessed: false }], state);
    }
    if (raceName === 'orc' && roleName !== 'Wizard') iniInv(ROLE_INVENTORY.Xtra_food, state);
    if (game.flags?.explore) iniInv(OPTIONAL_INVENTORY.Wishing, state);
    if (game._goldCount) iniInv(OPTIONAL_INVENTORY.Money, state);
    recordRoleDiscoveries(roleName);
    recordRaceDiscoveries(raceName);
    for (const item of state.inventory) recordStartupInventoryDiscovery(item);
    recordWizardSpellbookDiscoveries(roleName);
    let wielded = false;
    let alternate = false;
    let quivered = false;
    for (const item of state.inventory) {
        const kind = String(item.kind || '').toLowerCase();
        if (item.cls === 'armor') item.worn = true;
        const projectile = item.cls === 'weapon' && /arrow|bolt|ya|dart|shuriken/.test(kind)
            || item.cls === 'gem' && (kind === 'flint stone' || kind === 'rock');
        const weaponLike = item.cls === 'weapon' || kind === 'pick-axe' || kind === 'tin opener'
            || item.cls === 'gem' && (kind === 'flint stone' || kind === 'rock');
        if (!weaponLike) continue;
        if (projectile) {
            if (!quivered) {
                item.quivered = true;
                quivered = true;
            }
            continue;
        }
        if (!wielded) {
            item.wielded = true;
            wielded = true;
        } else if (!alternate) {
            item.alternate = true;
            alternate = true;
        }
    }
    for (const item of state.inventory) {
        const quan = item.quan || 1;
        if (item.cls === 'coin') {
            item.quan = game._goldCount || quan;
            item.line = `$ - ${item.quan} gold piece${item.quan === 1 ? '' : 's'}`;
            continue;
        }
        const kind = String(item.kind || '').toLowerCase();
        const spe = item.spe ?? 0;
        const blessedState = item.blessed ? 'blessed ' : item.cursed ? 'cursed ' : 'uncursed ';
        const knownState = item.bknown === false ? '' : blessedState;
        let name = pickupObjectName(item);
        if (item.cls === 'armor' && kind === 'leather gloves') name = 'pair of leather gloves';
        if (item.cls === 'tool' && kind === 'sack') name = `empty ${blessedState}sack`;
        if ((item.cls === 'wand' || item.tool === 'charges' || item.tool === 'magicMarker') && item.spe != null) {
            item.chargeKnown = true;
            name = `${name} (0:${item.spe})`;
        }

        let phrase = name;
        let suffix = '';
        if (item.cls === 'weapon' || item.wielded || item.alternate) {
            const enchantment = `${spe >= 0 ? '+' : ''}${spe} `;
            const buc = item.blessed || item.cursed ? blessedState : '';
            phrase = quan > 1 ? `${quan} ${buc}${enchantment}${name}` : `${buc}${enchantment}${name}`;
            if (item.wielded) {
                const hand = /quarterstaff|two-handed sword|battle-axe/.test(kind) ? 'hands' : `${game.u.uhandedness || 'right'} hand`;
                suffix = ` (weapon in ${hand})`;
            } else if (item.alternate) {
                suffix = ` (alternate weapon${quan > 1 ? 's' : ''}; not wielded)`;
            } else if (item.quivered) {
                suffix = quiverSuffix(item);
            }
        } else if (item.cls === 'armor') {
            const rustproof = roleName === 'Samurai' && kind === 'splint mail' ? 'rustproof ' : '';
            phrase = `${knownState}${rustproof}${spe >= 0 ? '+' : ''}${spe} ${name}`;
            if (item.worn) suffix = ' (being worn)';
        } else if (item.cls === 'ring') {
            const chargedRing = item.charged || (item.roll || item.ringRoll || 99) <= 6;
            const enchantment = chargedRing && item.spe != null ? `${item.spe >= 0 ? '+' : ''}${item.spe} ` : '';
            phrase = `${knownState}${enchantment}${name}`;
        } else if (item.cls === 'wand' || item.tool === 'charges' || item.tool === 'magicMarker') {
            phrase = name;
        } else {
            const namedWater = item.cls === 'potion' && kind === 'water' && (item.blessed || item.cursed);
            phrase = kind === 'sack' || kind === 'holy water' || kind === 'unholy water' || namedWater ? name : `${knownState}${name}`;
            if (item.quivered) suffix = quiverSuffix(item);
        }
        if (quan > 1 && item.cls !== 'weapon') phrase = `${quan} ${phrase}`;
        else if (quan === 1) phrase = `${/^[aeiou]/i.test(phrase) ? 'an' : 'a'} ${phrase}`;
        item.line = `${item.letter} - ${phrase}${suffix}`;
    }
    game._known_spells = state.knownSpells;
    return state.inventory;
}

function initializeHero() {
    const { roleName, raceName, alignName, role, race } = syncStartupIdentity(game);
    const attrs = [...role.attrBase];
    game._goldCount = 0;
    game.inventory = initializeRoleInventory(roleName, raceName);
    game._initialGoldCount = game._goldCount || 0;
    game._pet_food_scan_inventory = game.inventory;

    let points = 75 - attrs.reduce((sum, attr) => sum + attr, 0);
    let misses = 0;
    while (points > 0 && misses < 100) {
        let roll = rn2(100);
        for (let i = 0; i < role.attrDist.length; i++) {
            roll -= role.attrDist[i];
            if (roll < 0) {
                if (attrs[i] >= race.attrMax[i]) {
                    misses++;
                    break;
                }
                attrs[i]++;
                points--;
                misses = 0;
                break;
            }
        }
    }
    for (let i = 0; i < attrs.length; i++) {
        if (!rn2(20)) attrs[i] = Math.min(race.attrMax[i], Math.max(race.attrMin[i], attrs[i] + rn2(7) - 2));
    }

    game.u.ulevel = 1;
    game.u.uhp = game._initialHp;
    game.u.uhpmax = game._initialHp;
    game.u.uen = game._initialEnergy;
    game.u.uenmax = game._initialEnergy;
    game.u.uhpinc = [];
    game.u.ueninc = [];
    game.u.uac = game.flags?.legacy === false ? (STARTING_AC[roleName] ?? role.ac) : role.ac;
    game.u.uhunger = 900;
    game._post_intro_ac = STARTING_AC[roleName] ?? role.ac;
    if ((game._known_spells || []).length && game.u.uenmax < 5)
        game._post_intro_energy = 5;
    game.u.uexp = 0;
    game.u.ualign = { type: ALIGN_TYPE[alignName], record: role.initRecord || 0 };
    game.u.ublesscnt = 300;
    game.u.acurr = { a: [...attrs] };
    game.u.amax = { a: [...attrs] };
    game.u.fast = roleName === 'Monk' || roleName === 'Samurai';
    game.u.searching = roleName === 'Archeologist' || roleName === 'Ranger';
    game.u.stealth = roleName === 'Rogue';
    game.u.poisonResistance = roleName === 'Barbarian' || roleName === 'Healer' || raceName === 'orc';
    game.u.sleepResistance = roleName === 'Monk';
    game.u.seeInvisible = roleName === 'Monk';
    game.u.coldResistance = roleName === 'Valkyrie';
    game.u.infravision = raceName === 'dwarf' || raceName === 'elf' || raceName === 'gnome' || raceName === 'orc';
    game._has_displacement = (game.inventory || []).some(item =>
        item.cls === 'armor' && item.worn && item.kind === 'cloak of displacement');
}

function initializePet() {
    if (game.preferred_pet === 'n') return;

    const roleName = game._startup_role || 'Tourist';
    const fixed = ROLE_PET[roleName];
    let pet = fixed;
    if (!pet) {
        if (game.preferred_pet === 'c') pet = 'cat';
        else if (game.preferred_pet === 'd') pet = 'dog';
        else pet = rn2(2) ? 'cat' : 'dog';
    }

    const spots = collectCoords(game.u.ux, game.u.uy, 3);

    next_ident();
    const hp = d(pet === 'pony' ? 2 : 1, 8);
    const petFemale = !!rn2(2);
    if (pet === 'pony') next_ident();
    if ((game._startup_align || 'neutral') === 'neutral') {
        if (rn2(16 + (game.u?.ualign?.record || 0))) rn2(2);
    }

    for (const { x, y } of spots) {
        const loc = game.level?.at(x, y);
        const occupied = game.level?.monsters?.some(mon => mon.mx === x && mon.my === y);
        if (!loc || IS_OBSTRUCTED(loc.typ) || occupied) continue;
        const petName = pet === 'cat' ? 'kitten' : pet === 'dog' ? 'little dog' : pet;
        const givenName = game.petNames?.[pet] || (pet === 'dog' ? DEFAULT_DOG_NAMES[roleName] : '');
        const mlet = pet === 'cat' ? 'feline' : pet === 'pony' ? 'unicorn' : 'dog';
        game.u.uconduct ??= {};
        game.u.uconduct.pets = (game.u.uconduct.pets || 0) + 1;
        game.level?.monsters?.push({
            mx: x,
            my: y,
            mhp: hp,
            mhpmax: hp,
            m_lev: pet === 'pony' ? 2 : 1,
            pet: true,
            female: petFemale,
            givenName,
            saddled: pet === 'pony',
            mtame: 10,
            mpeaceful: 1,
            mextra: { edog: { apport: 3, hungrytime: 1001, dropdist: 10000, whistletime: 0, ogoal: { x: 0, y: 0 } } },
            data: {
                name: petName,
                mlet,
                mlevel: pet === 'pony' ? 3 : 2,
                mac: pet === 'pony' ? 6 : 6,
	                mmove: pet === 'pony' ? 16 : 18,
                small: pet === 'cat' || pet === 'dog',
	                nohands: true,
	                wanderer: pet === 'cat' || pet === 'pony',
	                attack: pet === 'pony' ? { dice: 1, sides: 6, verb: 'kicks' } : { dice: 1, sides: 6, verb: 'bites' },
	            },
	        });
        return;
    }
}

function collectCoords(cx, cy, maxradius) {
    const coords = [];
    for (let radius = 1; radius <= maxradius; radius++) {
        const passStart = coords.length;
        const lox = cx - radius;
        const hix = cx + radius;
        const loy = cy - radius;
        const hiy = cy + radius;
        for (let y = Math.max(loy, 0); y <= hiy && y < ROWNO; y++) {
            for (let x = Math.max(lox, 1); x <= hix && x < COLNO; x++) {
                if (x !== lox && x !== hix && y !== loy && y !== hiy) continue;
                coords.push({ x, y });
            }
        }
        for (let pass = passStart, n = coords.length - passStart; n > 1; pass++, n--) {
            const k = rn2(n);
            if (!k) continue;
            const swap = coords[pass];
            coords[pass] = coords[pass + k];
            coords[pass + k] = swap;
        }
    }
    return coords;
}

const NORMAL_SPEED = 12;
const SPECIAL_PM = 330;
const BOGUSMONSIZE = 100;
const WEAPON_CLASS = 1;
const ARMOR_CLASS = 2;
const SUIT_ARMOR_PATTERN = /(?:armor|mail|coat|jacket|scales?)$/;
const RING_CLASS = 3;
const FOOD_CLASS = 7;
const SCROLL_CLASS = 8;
const SCR_SCARE_MONSTER = 279;
const POTION_CLASS = 9;
const WAND_CLASS = 10;
const SPBOOK_CLASS = 10003;
const TOOL_CLASS = 12;
const GEM_CLASS = 14;
const AMULET_CLASS = 15;
const BOULDER = 465;
const GOLD_PIECE = 466;
const ROCK = 467;
const FLINT = 10166;
const LUCKSTONE = 10127;
const LOADSTONE = 10165;
const KELP_FROND = 172;
const CORPSE = 471;
const STATUE = 472;
const POISONOUS_CORPSES = new Set(['kobold', 'large kobold', 'kobold leader', 'kobold shaman']);
const CORPSE_EATER_MONSTERS = new Set(['purple worm', 'baby purple worm', 'ghoul', 'piranha']);
const DART = 353;
const ORCISH_DAGGER = 10020;
const DAGGER = 10023;
const KNIFE = 10026;
const SPEAR = 10030;
const MONSTER_THROWN_SPEAR_RANKS = new Map([
    ['dwarvish spear', 0],
    ['stout spear', 0],
    ['silver spear', 1],
    ['elven spear', 2],
    ['runed spear', 2],
    ['spear', 3],
    ['orcish spear', 4],
    ['crude spear', 4],
    ['javelin', 5],
    ['throwing spear', 5],
]);
const MONSTER_THROWN_SPEAR_SMALL_DAMAGE = new Map([
    ['dwarvish spear', 8],
    ['stout spear', 8],
    ['silver spear', 6],
    ['elven spear', 7],
    ['runed spear', 7],
    ['spear', 6],
    ['orcish spear', 5],
    ['crude spear', 5],
    ['javelin', 6],
    ['throwing spear', 6],
]);
const SHORT_SWORD = 10031;
const PLATE_MAIL = 10037;
const CRYSTAL_PLATE_MAIL = 10038;
const SPLINT_MAIL = 10039;
const BANDED_MAIL = 10040;
const RING_MAIL = 10041;
const STUDDED_LEATHER_ARMOR = 10042;
const LEATHER_ARMOR = 10043;
const HELMET = 10044;
const DENTED_POT = 10045;
const SMALL_SHIELD = 10046;
const LARGE_SHIELD = 10047;
const LOW_BOOTS = 10048;
const HIGH_BOOTS = 10049;
const LEATHER_GLOVES = 10050;
const LEATHER_CLOAK = 10051;
const TIN_WHISTLE = 224;
function corpseDataForMonster(data) {
    const name = data?.name || '';
    if (data?.corpse) return data.corpse;
    if (name.endsWith(' zombie')) return monsterByRndName(name.replace(/ zombie$/, '')) || data;
    if (name.endsWith(' mummy')) return monsterByRndName(name.replace(/ mummy$/, '')) || data;
    return data;
}
const MERC_ARMOR_BONUS = new Map([
    [PLATE_MAIL, 7],
    [CRYSTAL_PLATE_MAIL, 7],
    [SPLINT_MAIL, 6],
    [BANDED_MAIL, 6],
    [RING_MAIL, 3],
    [STUDDED_LEATHER_ARMOR, 3],
    [LEATHER_ARMOR, 2],
    [HELMET, 1],
    [DENTED_POT, 1],
    [SMALL_SHIELD, 1],
    [LARGE_SHIELD, 2],
    [LOW_BOOTS, 1],
    [HIGH_BOOTS, 2],
    [LEATHER_GLOVES, 1],
    [LEATHER_CLOAK, 1],
]);
const SEARCH_POTION_INDICES = new Set([2, 3, 4, 5, 8, 10, 11, 12, 17, 18, 19, 23]);
const SEARCH_WAND_INDICES = new Set([3, 7, 11, 14, 18, 19, 20, 21, 22, 23, 24]);
const PET_PASSIVE_DAMAGE_MONSTERS = new Set(['brown mold', 'green mold', 'red mold']);
const PETRIFYING_TOUCH_MONSTERS = new Set(['chickatrice', 'cockatrice']);
const DART_TRAP = 2;
const LARGE_BOX = 214;
const CHEST = 215;
const ICE_BOX = 216;
const TRAP_NAMES = {
    1: 'arrow trap',
    2: 'dart trap',
    3: 'falling rock trap',
    4: 'squeaky board',
    5: 'bear trap',
    6: 'land mine',
    7: 'rolling boulder trap',
    8: 'sleeping gas trap',
    9: 'rust trap',
    10: 'fire trap',
    11: 'pit',
    12: 'spiked pit',
    13: 'hole',
    14: 'trap door',
    15: 'teleportation trap',
    16: 'level teleporter',
    17: 'magic portal',
    18: 'web',
    19: 'statue trap',
    20: 'magic trap',
    21: 'anti-magic field',
    22: 'polymorph trap',
    23: 'vibrating square',
};
const RUN_DIRECTIONS = {
    h: { dx: -1, dy: 0 },
    j: { dx: 0, dy: 1 },
    k: { dx: 0, dy: -1 },
    l: { dx: 1, dy: 0 },
    y: { dx: -1, dy: -1 },
    u: { dx: 1, dy: -1 },
    b: { dx: -1, dy: 1 },
    n: { dx: 1, dy: 1 },
};
const SQUEAKY_NOTES = [
    'a C note', 'a D flat', 'a D note', 'an E flat',
    'an E note', 'an F note', 'an F sharp', 'a G note',
    'a G sharp', 'an A note', 'a B flat', 'a B note',
];
const MONSTER_BODY_WEIGHTS = new Map([
    ['jackal', 300], ['kobold', 400], ['kitten', 150], ['housecat', 200],
    ['large cat', 250], ['little dog', 150], ['dog', 400],
    ['large dog', 800], ['goblin', 400], ['gnome', 650], ['orc', 850],
    ['rock mole', 30],
    ['pony', 1300], ['horse', 1800],
]);
const WATERWALL_SWIMMERS = new Set([
    'gremlin', 'water nymph', 'woodchuck', 'water elemental', 'rust monster',
    'garter snake', 'snake', 'water moccasin', 'python', 'pit viper', 'cobra',
    'water troll', 'Medusa', 'water demon', 'mail daemon', 'jellyfish',
    'piranha', 'shark', 'giant eel', 'electric eel', 'kraken', 'newt',
    'baby crocodile', 'crocodile',
]);
const INNATE_RANGED_ATTACK_MONSTERS = new Set([
    'cobra',
    'gray dragon', 'gold dragon', 'silver dragon', 'red dragon', 'white dragon',
    'orange dragon', 'black dragon', 'blue dragon', 'green dragon', 'yellow dragon',
]);
const MONSTER_BREATH_ATTACKS = new Map([
    ['red dragon', { element: 'fire', dice: 6 }],
]);
const CARNIVOROUS_PET_NAMES = new Set([
    'jackal', 'fox', 'coyote', 'little dog', 'dingo', 'dog', 'large dog',
    'wolf', 'winter wolf cub', 'warg', 'winter wolf', 'hell hound pup',
    'hell hound', 'kitten', 'housecat', 'jaguar', 'lynx', 'panther',
    'large cat', 'tiger', 'displacer beast', 'baby gray dragon',
    'baby gold dragon', 'baby silver dragon', 'baby shimmering dragon',
    'baby red dragon', 'baby white dragon', 'baby orange dragon',
    'baby black dragon', 'baby blue dragon', 'baby green dragon',
    'baby yellow dragon', 'gray dragon', 'gold dragon', 'silver dragon',
    'shimmering dragon', 'red dragon', 'white dragon', 'orange dragon',
    'black dragon', 'blue dragon', 'green dragon', 'yellow dragon',
    'carnivorous ape', 'piranha', 'shark', 'giant eel', 'electric eel',
    'kraken', 'wererat', 'werejackal', 'werewolf',
]);
const HERBIVOROUS_PET_NAMES = new Set(['pony', 'horse', 'warhorse']);
const CARNIVORE_DOGFOOD_KINDS = new Set([
    'tripe',
    'tripe ration',
    'meatball',
    'meat ring',
    'meat stick',
    'enormous meatball',
]);
const CARNIVORE_DOGFOOD_OTYPS = new Set([
    MEATBALL,
    MEAT_RING,
    MEAT_STICK,
    ENORMOUS_MEATBALL,
]);

function monsterDietName(mon) {
    return String(mon?.data?.name || '').toLowerCase();
}

function monsterCarnivorous(mon, name = monsterDietName(mon)) {
    const data = mon?.data || {};
    return !!(data.carnivorous || data.carnivore) || CARNIVOROUS_PET_NAMES.has(name);
}

function monsterHerbivorous(mon, name = monsterDietName(mon)) {
    const data = mon?.data || {};
    return !!(data.herbivorous || data.herbivore) || HERBIVOROUS_PET_NAMES.has(name);
}

function dogFoodCorpseIsOld(obj) {
    if (obj?.oldCorpse) return true;
    if (obj?.age == null) return false;
    return (game.moves || 1) - Number(obj.age || 0) >= 50;
}

function dogFoodEggIsStale(obj) {
    if (obj?.staleEgg || obj?.oldEgg) return true;
    if (obj?.age == null) return false;
    return (game.moves || 1) - Number(obj.age || 0) > 400;
}

function dogFoodCorpseIsVegan(data = {}) {
    const name = String(data?.name || '').toLowerCase();
    const mlet = data?.mlet ?? data?.glyph ?? '';
    const lowerMlet = String(mlet).toLowerCase();
    if (data?.vegan || data?.noncorporeal) return true;
    if (['b', 'j', 'f', 'v', 'y', 'blob', 'jelly', 'fungus', 'vortex', 'light'].includes(lowerMlet))
        return true;
    if ((mlet === 'E' || lowerMlet === 'elemental') && name !== 'stalker')
        return true;
    if ((mlet === '\'' || lowerMlet === 'golem') && name !== 'flesh golem' && name !== 'leather golem')
        return true;
    return false;
}

function dogFood(mon, obj) {
    const objectName = String(obj.actualKind || obj.kind || obj.spellName || obj.spell?.name || '').toLowerCase();
    if (objectName === 'bell of opening' || objectName === 'book of the dead'
        || objectName === 'candelabrum of invocation' || objectName === 'amulet of yendor')
        return obj.cursed ? TABU : APPORT;
    rn2(100);
    const petName = monsterDietName(mon);
    const herbivore = monsterHerbivorous(mon, petName);
    const carnivore = monsterCarnivorous(mon, petName);
    const starving = !!(mon?.mtame && !mon?.isminion && mon?.mextra?.edog?.mhpmax_penalty);
    const foodRoll = obj.foodRoll || 1000;

    if (obj.otyp === BOULDER || obj.otyp === STATUE) return UNDEF;
    if (petName === 'ghoul') {
        const kind = String(obj.kind || obj.actualKind || '').toLowerCase();
        if (obj.otyp === 'corpse' || obj.otyp === CORPSE) {
            const corpseName = String(obj.corpsenm?.name || '').toLowerCase();
            if (dogFoodCorpseIsOld(obj) && corpseName !== 'lizard' && corpseName !== 'lichen')
                return DOGFOOD;
            return starving && !dogFoodCorpseIsVegan(obj.corpsenm) ? ACCFOOD : POISON;
        }
        if (obj.otyp === EGG || kind === 'egg')
            return dogFoodEggIsStale(obj) ? CADAVER : starving ? ACCFOOD : POISON;
        if (obj.otyp === FOOD_CLASS || obj.cls === 'food' || obj.foodRoll)
            return TABU;
    }
    if (obj.otyp === 'corpse' || obj.otyp === CORPSE) {
        const corpseName = obj.corpsenm?.name || '';
        if (obj.oldCorpse && corpseName !== 'lichen' && corpseName !== 'lizard') return POISON;
        if (POISONOUS_CORPSES.has(corpseName) && !mon.data?.resistsPoison) return POISON;
        if (corpseName === 'lichen') return herbivore ? CADAVER : MANFOOD;
        return carnivore ? CADAVER : MANFOOD;
    }
    if (obj.otyp === FOOD_CLASS || obj.cls === 'food' || obj.foodRoll) {
        const kind = String(obj.kind || obj.actualKind || '').toLowerCase();
        if ((obj.otyp === LUMP_OF_ROYAL_JELLY || kind === 'lump of royal jelly')
            && petName === 'killer bee')
            return levelHasQueenBee() ? TABU : DOGFOOD;
        if (obj.kind === 'tin' || String(obj.kind || '').startsWith('tin:')) return MANFOOD;
        if (foodRoll <= 140 || CARNIVORE_DOGFOOD_KINDS.has(kind) || CARNIVORE_DOGFOOD_OTYPS.has(obj.otyp)) return carnivore ? DOGFOOD : MANFOOD;
        if (obj.kind === 'egg') return carnivore ? CADAVER : MANFOOD;
        if (obj.kind === 'apple') return herbivore ? DOGFOOD : MANFOOD;
        if (obj.kind === 'carrot') return herbivore ? DOGFOOD : MANFOOD;
        if (herbivore && ((foodRoll > 228 && foodRoll <= 243) || (foodRoll > 283 && foodRoll <= 298)))
            return DOGFOOD;
        if (foodRoll > 387) return carnivore ? ACCFOOD : MANFOOD;
        return herbivore ? ACCFOOD : MANFOOD;
    }
    if (isGelatinousCube(mon) && isOrganicObjectForGelatinousCube(obj)) return ACCFOOD;
    return obj.cursed ? UNDEF : APPORT;
}

function isGelatinousCube(mon) {
    return mon?.data?.name === 'gelatinous cube';
}

function isOrganicObjectForGelatinousCube(obj) {
    if (!obj) return false;
    if (obj.otyp === BOULDER || obj.otyp === STATUE || obj.otyp === ROCK || obj.isRock) return false;
    if (obj.cls === 'food' || obj.otyp === FOOD_CLASS || obj.otyp === CORPSE || obj.otyp === 'corpse') return true;
    const kind = String(obj.kind || obj.actualKind || obj.singular || '').toLowerCase();
    if (obj.otyp === LARGE_BOX || obj.otyp === CHEST || obj.otyp === ICE_BOX) return true;
    return /\b(?:box|chest|sack|bag|scroll|spellbook|book|paper|cloth|leather|wood|wooden|corpse|meat|egg|ration|food|fruit|cookie|wafer|jelly)\b/.test(kind);
}

function gelatinousCubeSpecialPrizeObject(obj) {
    return !!(obj?._sokoPrize || obj?.sokoPrize || obj?._minesPrize || obj?.minesPrize
        || (game.level?.flags?.sokoban_rules && obj?.hidden));
}

function gelatinousCubeUntouchableObject(mon, obj) {
    if (!obj || obj.transientProjectile) return true;
    if (gelatinousCubeSpecialPrizeObject(obj)) return true;
    if (obj.otyp === BOULDER || obj.otyp === STATUE || obj.otyp === ROCK || obj.isRock) return true;
    if (obj.otyp === SCR_SCARE_MONSTER || isScareMonsterScroll(obj)) return true;
    const kind = String(obj.kind || obj.actualKind || '').toLowerCase();
    if (obj === game.u?.uball || obj === game.u?.uchain
        || obj.cls === 'ball' || obj.cls === 'chain'
        || kind === 'heavy iron ball' || kind === 'iron chain') return true;
    const corpseName = String(obj.corpsenm?.name || '').toLowerCase();
    if (corpseName === 'death' || corpseName === 'pestilence' || corpseName === 'famine'
        || obj.corpsenm?.rider || obj.riderCorpse) return true;
    if ((obj.otyp === CORPSE || obj.otyp === 'corpse')
        && PETRIFYING_TOUCH_MONSTERS.has(corpseName)
        && !monsterResistsStoning(mon)) return true;
    return false;
}

function gelatinousCubeInventoryDigestible(obj) {
    return isOrganicObjectForGelatinousCube(obj)
        && !obj?.artifact && !obj?.oartifact
        && !gelatinousCubeSpecialPrizeObject(obj);
}

function gelatinousCubeDigestResisted(obj) {
    const artifact = obj?.artifact || obj?.oartifact;
    return rn2(100) < (artifact ? 95 : 5);
}

function gelatinousCubeHazardousFood(mon, obj) {
    const kind = String(obj?.kind || obj?.actualKind || obj?.globName || '').toLowerCase();
    const corpseName = String(obj?.corpsenm?.name || '').toLowerCase();
    if (/amulet of strangulation|ring of slow digestion/.test(kind)) return true;
    if ((obj?.opoisoned || POISONOUS_CORPSES.has(corpseName)) && !monsterPoisonResistant(mon)) return true;
    if ((PETRIFYING_TOUCH_MONSTERS.has(corpseName) || kind === 'egg' && PETRIFYING_TOUCH_MONSTERS.has(corpseName))
        && !monsterResistsStoning(mon)) return true;
    if (kind === 'glob of green slime' && mon?.data?.name !== 'green slime') return true;
    return false;
}

function gelatinousCubeCanDigestFloorObject(mon, obj) {
    if (gelatinousCubeUntouchableObject(mon, obj)) return false;
    if (!isOrganicObjectForGelatinousCube(obj)) return false;
    if (gelatinousCubeDigestResisted(obj)) return false;
    if (obj?.artifact || obj?.oartifact) return false;
    return !gelatinousCubeHazardousFood(mon, obj);
}

function gelatinousCubeAddToInventory(mon, obj) {
    if (!mon || !obj) return;
    obj.hidden = false;
    obj.buried = false;
    obj.transientProjectile = false;
    obj.seen = false;
    obj._hide_until_seen = false;
    delete obj.line;
    delete obj.nexthere;
    delete obj.nobj;
    add_to_minv(mon, obj);
}

function containerContents(obj) {
    if (Array.isArray(obj?.contents)) return obj.contents;
    if (Array.isArray(obj?.cobj)) return obj.cobj;
    return [];
}

function clearContainerContents(obj) {
    if (!obj) return;
    if (Array.isArray(obj.contents)) obj.contents = [];
    if (Array.isArray(obj.cobj)) obj.cobj = [];
}

function detachContainedObject(container, obj) {
    if (!container || !obj) return;
    if (Array.isArray(container.contents))
        container.contents = container.contents.filter(item => item !== obj);
    if (Array.isArray(container.cobj))
        container.cobj = container.cobj.filter(item => item !== obj);
    obj.contained = false;
    obj.container = null;
    delete obj.nobj;
    delete obj.nexthere;
}

function floorSurfaceNameAt(x, y) {
    const typ = game.level?.at(x, y)?.typ;
    if (typ === ICE) return 'ice';
    if (IS_LAVA(typ)) return 'lava';
    if (IS_POOL(typ)) return 'water';
    if (typ === ALTAR) return 'altar';
    if (typ === GRAVE) return 'grave';
    return 'floor';
}

function possessiveObjectName(obj) {
    const base = pickupObjectName(obj) || obj?.kind || 'container';
    const named = /^the\b/i.test(base) ? base : `The ${base}`;
    return `${named}${/[sxz]$/i.test(named) ? "'" : "'s"}`;
}

function placeMonsterConsumedContent(obj, x, y, messages) {
    Object.assign(obj, { ox: x, oy: y });
    obj.hidden = false;
    obj.buried = false;
    obj.transientProjectile = false;
    delete obj.line;
    const previousMonsterMoving = game._monster_moving;
    game._monster_moving = 1;
    let consumed = false;
    try {
        consumed = earthFloorEffects(obj, x, y, messages, '');
    } finally {
        if (previousMonsterMoving === undefined) delete game._monster_moving;
        else game._monster_moving = previousMonsterMoving;
    }
    if (consumed) return;
    game.level.objects ??= [];
    game.level.objects.push(obj);
    newsym(x, y);
}

function monsterConsumeContainerContents(mon, container, messages) {
    const contents = [...containerContents(container)];
    if (!contents.length || !game.level) return;
    const x = mon.mx;
    const y = mon.my;
    if (x == null || y == null) return;
    const cube = isGelatinousCube(mon);
    if (!cube && !game.u?.blind && couldSeeCoord(x, y))
        messages.push(`${possessiveObjectName(container)} contents spill out onto the ${floorSurfaceNameAt(x, y)}.`);
    for (const obj of contents) {
        detachContainedObject(container, obj);
        if (container.otyp === ICE_BOX || container.kind === 'ice box')
            removedFromIcebox(obj);
        if (cube) {
            gelatinousCubeAddToInventory(mon, obj);
        } else {
            placeMonsterConsumedContent(obj, x, y, messages);
        }
    }
    clearContainerContents(container);
}

function applyMonsterConsumedObjectEffects(mon, obj) {
    if (!mon || !obj) return;
    const ispet = mon.pet || mon.mtame;
    if (!ispet && (mon.mhp || 0) < (mon.mhpmax || 0))
        mon.mhp = Math.min(mon.mhpmax || mon.mhp || 1, (mon.mhp || 1) + objectWeight(obj));
    const corpseName = String(obj.corpsenm?.name || '').toLowerCase();
    if (corpseName === 'wraith') monsterGrowUp(mon, null);
    if (corpseName === 'nurse') mon.mhp = mon.mhpmax || mon.mhp || 1;
    if (String(obj.kind || obj.actualKind || '').toLowerCase() === 'carrot' && mon.mcansee === false)
        mon.mcansee = true;
}

function consumeMonsterEatenObject(mon, obj, objects, messages, { splitStackAccounted = false, wholeStack = false } = {}) {
    applyMonsterConsumedObjectEffects(mon, obj);
    monsterConsumeContainerContents(mon, obj, messages);
    const idx = objects.indexOf(obj);
    if (!wholeStack && idx >= 0 && (obj.quan || 1) > 1
        && (obj.cls === 'food' || obj.otyp === CORPSE || obj.otyp === 'corpse')) {
        if (!splitStackAccounted) next_ident();
        obj.quan--;
    } else if (idx >= 0) {
        objects.splice(idx, 1);
    }
    newsym(mon.mx, mon.my);
}

function addMonsterConsumeMessages(messages) {
    for (const msg of messages) addToplineMessage(msg);
}

function monsterCouldEatMetalItem(mon, obj) {
    return sharedMonsterCouldEatMetalItem(mon, obj, { poisonResistant: monsterPoisonResistant });
}

function leaveMetallivoreRock(mon) {
    const rock = mksobj(ROCK, true, false);
    Object.assign(rock, { ox: mon.mx, oy: mon.my, glyph: '*', color: NO_COLOR });
    game.level?.objects?.push(rock);
}

function metallivoreEatFloorMetal(mon) {
    if (!monsterIsMetallivore(mon) || mon.pet || mon.mtame || !game.level) return false;
    const objects = game.level.objects || [];
    const stack = [...objects]
        .filter(obj => obj.ox === mon.mx && obj.oy === mon.my && !obj.hidden && !obj.transientProjectile)
        .reverse();
    if (!stack.length) return false;

    const messages = [];
    let strippedRustproofing = false;
    const verbose = game.flags?.verbose !== false;
    for (const obj of stack) {
        if (!objects.includes(obj) || !monsterCouldEatMetalItem(mon, obj)) continue;
        if (metallivoreObjectResists(obj)) continue;

        if (monsterIsRustMonster(mon) && (obj.oerodeproof || obj.rustproof)) {
            if (monsterVisibleToHero(mon) && verbose)
                messages.push(`${monsterDisplayName(mon)} eats ${pickupObjectName(obj)}!`);
            obj.oerodeproof = false;
            obj.rustproof = false;
            mon.mstun = 1;
            strippedRustproofing = true;
            if (monsterVisibleToHero(mon) && verbose)
                messages.push(`${monsterDisplayName(mon)} spits ${pickupObjectName(obj)} out in disgust!`);
            continue;
        }

        if (monsterVisibleToHero(mon) && verbose)
            messages.push(`${monsterDisplayName(mon)} eats ${pickupObjectName(obj)}!`);
        else if (verbose)
            messages.push('You hear a crunching sound.');
        mon.meating = Math.trunc(objectWeight(obj) / 2) + 1;
        consumeMonsterEatenObject(mon, obj, objects, messages, { wholeStack: true });
        if ((game.level?.monsters || []).includes(mon) && rnd(25) < 3) leaveMetallivoreRock(mon);
        addMonsterConsumeMessages(messages);
        newsym(mon.mx, mon.my);
        return true;
    }

    if (strippedRustproofing) {
        addMonsterConsumeMessages(messages);
        newsym(mon.mx, mon.my);
    }
    return false;
}

function gelatinousCubeDigestInventory(mon) {
    if (!isGelatinousCube(mon) || mon.pet || mon.mtame || mon.meating) return false;
    const item = (mon.minvent || []).find(gelatinousCubeInventoryDigestible);
    if (!item) return false;
    mon.meating = 1;
    mon.minvent = (mon.minvent || []).filter(obj => obj !== item);
    const messages = [];
    applyMonsterConsumedObjectEffects(mon, item);
    monsterConsumeContainerContents(mon, item, messages);
    addMonsterConsumeMessages(messages);
    newsym(mon.mx, mon.my);
    return true;
}

function gelatinousCubeEngulfFloorObject(mon, obj) {
    const objects = game.level?.objects || [];
    const idx = objects.indexOf(obj);
    if (idx >= 0) objects.splice(idx, 1);
    gelatinousCubeAddToInventory(mon, obj);
}

function gelatinousCubeEatFloorObjects(mon) {
    if (!isGelatinousCube(mon) || mon.pet || mon.mtame || !game.level) return false;
    const objects = game.level.objects || [];
    const stack = [...objects]
        .filter(obj => obj.ox === mon.mx && obj.oy === mon.my && !obj.hidden && !obj.transientProjectile)
        .reverse();
    if (!stack.length) return false;

    const messages = [];
    let ate = 0;
    let engulfed = 0;
    let firstEngulfed = null;
    const visible = monsterVisibleToHero(mon);
    for (const obj of stack) {
        if (!objects.includes(obj) || gelatinousCubeUntouchableObject(mon, obj)) continue;
        if (gelatinousCubeCanDigestFloorObject(mon, obj)) {
            ate++;
            if (visible) messages.push(`${monsterDisplayName(mon)} eats ${pickupObjectName(obj)}!`);
            consumeMonsterEatenObject(mon, obj, objects, messages, { wholeStack: true });
        } else {
            engulfed++;
            if (!firstEngulfed) firstEngulfed = obj;
            gelatinousCubeEngulfFloorObject(mon, obj);
        }
        if (!(game.level?.monsters || []).includes(mon)) break;
    }
    if (engulfed === 1 && visible && firstEngulfed)
        messages.push(`${monsterDisplayName(mon)} engulfs ${pickupObjectName(firstEngulfed)}.`);
    else if (engulfed > 1 && visible)
        messages.push(`${monsterDisplayName(mon)} engulfs several objects.`);
    else if (engulfed && game.flags?.verbose !== false)
        messages.push(`You hear ${engulfed === 1 ? 'a' : 'several'} slurping sound${engulfed === 1 ? '' : 's'}.`);
    if ((ate || engulfed) && isGelatinousCube(mon)) newsym(mon.mx, mon.my);
    addMonsterConsumeMessages(messages);
    return !!(ate || engulfed);
}

function monsterIsCorpseEater(mon) {
    return !!mon?.data?.corpseEater || CORPSE_EATER_MONSTERS.has(mon?.data?.name || '');
}

function corpseEaterVeganCorpse(obj) {
    const corpse = obj?.corpsenm || {};
    const name = String(corpse.name || '').toLowerCase();
    const glyph = corpse.glyph || corpse.mlet || '';
    if (['b', 'j', 'v', 'y', 'F'].includes(glyph)) return true;
    if (glyph === 'E' && name !== 'stalker') return true;
    if (glyph === '\'' && name !== 'flesh golem' && name !== 'leather golem') return true;
    return !!(corpse.noncorporeal || corpse.whirly || ['ghost', 'shade'].includes(name));
}

function monsterWouldConsumeCorpseItem(mon, obj) {
    if (!monsterIsCorpseEater(mon) || mon.pet || mon.mtame || !obj || obj.transientProjectile) return false;
    if (obj.otyp !== CORPSE && obj.otyp !== 'corpse') return false;
    if (corpseEaterVeganCorpse(obj)) return false;
    const corpseName = String(obj.corpsenm?.name || '').toLowerCase();
    if (obj.corpsenm?.rider || obj.riderCorpse
        || corpseName === 'death' || corpseName === 'pestilence' || corpseName === 'famine') return false;
    return !(PETRIFYING_TOUCH_MONSTERS.has(corpseName) && !monsterResistsStoning(mon));
}

function monsterWouldConsumeItem(mon, obj) {
    return monsterCouldEatMetalItem(mon, obj) || monsterWouldConsumeCorpseItem(mon, obj);
}

function corpseEaterEatFloorCorpse(mon) {
    if (!monsterIsCorpseEater(mon) || mon.pet || mon.mtame || !game.level) return false;
    const objects = game.level.objects || [];
    const corpse = [...objects].reverse()
        .find(obj => obj.ox === mon.mx && obj.oy === mon.my && !obj.hidden && monsterWouldConsumeCorpseItem(mon, obj));
    if (!corpse) return false;

    const messages = [];
    if (monsterVisibleToHero(mon) && game.flags?.verbose !== false)
        messages.push(`${monsterDisplayName(mon)} eats ${pickupObjectName(corpse)}!`);
    else if (game.flags?.verbose !== false)
        messages.push('You hear a masticating sound.');
    consumeMonsterEatenObject(mon, corpse, objects, messages);
    addMonsterConsumeMessages(messages);
    return true;
}

function isRoyalJellyObject(obj) {
    return obj?.otyp === LUMP_OF_ROYAL_JELLY
        || String(obj?.kind || obj?.actualKind || '').toLowerCase() === 'lump of royal jelly';
}

function levelHasQueenBee(except = null) {
    return (game.level?.monsters || []).some(mon =>
        mon !== except && (mon.mhp == null || mon.mhp > 0) && mon.data?.name === 'queen bee');
}

function consumeOneFloorObject(obj) {
    if (!obj || !game.level) return;
    if ((obj.quan || 1) > 1) {
        next_ident();
        obj.quan--;
    } else {
        game.level.objects = (game.level.objects || []).filter(other => other !== obj);
    }
    newsym(obj.ox, obj.oy);
}

function maybeKillerBeeEatRoyalJelly(mon) {
    if (!mon || mon.data?.name !== 'killer bee') return false;
    const jelly = (game.level?.objects || []).find(obj =>
        !obj.hidden && !obj.transientProjectile
        && obj.ox === mon.mx && obj.oy === mon.my
        && isRoyalJellyObject(obj));
    if (!jelly || levelHasQueenBee(mon)) return false;

    const visible = !game.u?.blind && !mon.minvis && !mon.mundetected && couldSeeCoord(mon.mx, mon.my);
    const subject = mon.pet
        ? mon.givenName || `Your ${mon.data?.name || 'pet'}`
        : monsterDisplayName(mon);
    if (visible) {
        const name = `${jelly.bknown ? (jelly.blessed ? 'blessed ' : jelly.cursed ? 'cursed ' : 'uncursed ') : ''}lump of royal jelly`;
        addToplineMessage(`${subject} eats a ${name}.`);
    }

    if (mon.pet) {
        const edog = mon.mextra?.edog;
        if (edog) edog.hungrytime = Math.max(edog.hungrytime || 0, game.moves || 1) + 200;
        mon.mtame = Math.min(20, (mon.mtame || 10) + 1);
        game._pet_skip_post_move_roll = 1;
    }
    const delay = jelly.blessed ? 3 : jelly.cursed ? 7 : 5;
    consumeOneFloorObject(jelly);

    const queenData = monsterByRndName('queen bee') || RANDOM_MONSTER_BY_NAME.get('queen bee');
    if ((game._genocided_monsters || []).includes('queen bee') || !queenData) {
        if (visible) addToplineMessage(`As ${subject.replace(/^The /, 'the ')} grows up into a queen bee, she dies!`);
        recordVanquished(mon, false);
        game.level.monsters = (game.level?.monsters || []).filter(other => other !== mon);
        newsym(mon.mx, mon.my);
        return true;
    }

    const queenLevel = queenData.mlevel ?? 9;
    if ((mon.m_lev ?? mon.data?.mlevel ?? 1) < queenLevel - 1) mon.m_lev = queenLevel - 1;
    const hpIncrease = rnd(8);
    mon.mhpmax = (mon.mhpmax || mon.mhp || 1) + hpIncrease;
    mon.mhp = (mon.mhp || 1) + hpIncrease;
    mon.m_lev = Math.min(50, (mon.m_lev ?? queenLevel - 1) + 1);
    if (visible) addToplineMessage(`${subject} grows up into a queen bee.`);
    mon.data = { ...queenData, hpLevel: mon.m_lev };
    mon.female = true;
    mon.mfrozen = delay;
    mon.mcanmove = false;
    mon._skip_mfrozen_decrement = 1;
    newsym(mon.mx, mon.my);
    return true;
}

function monsterWearsGloves(mon) {
    return (mon?.minvent || []).some(item => item.cls === 'armor'
        && (item.worn || item.owornmask)
        && /glove|gauntlet/.test(String(item.kind || item.actualKind || '').toLowerCase()));
}

function monsterResistsStoning(mon) {
    const data = mon?.data || {};
    return !!(data.stoneResistance || STONE_RESISTANT_MONSTERS.has(data.name));
}

function monsterPolyWhenStoned(mon) {
    const data = mon?.data || {};
    return data.name !== 'stone golem'
        && (data.mlet === '\'' || data.glyph === '\'')
        && !(game._genocided_monsters || []).includes('stone golem');
}

function monsterContactPetrifiesAttacker(attacker, defender) {
    const defenderName = String(defender?.data?.name || '').toLowerCase();
    if (!PETRIFYING_TOUCH_MONSTERS.has(defenderName)) return false;
    if (monsterResistsStoning(attacker)) return false;
    return !(attacker?.mw || monsterWearsGloves(attacker));
}

function maybeDropStoneGolemWeapon(mon, floorMessages) {
    const weapon = mon?.mw;
    if (!weapon) return;
    if (!(mon.minvent || []).includes(weapon)) {
        mon.mw = null;
        mon.weapon_check = NEED_WEAPON;
        return;
    }
    if (monsterHasWeaponAttack(mon)) {
        mon.weapon_check = NEED_WEAPON;
        return;
    }
    mon.mw = null;
    mon.weapon_check = NO_WEAPON_WANTED;
    if (!game.u?.blind && (game.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT))
        floorMessages.push(`${monsterDisplayName(mon)} drops ${pickupObjectName(weapon)}.`);
    dropMonsterObject(mon, weapon, floorMessages, { verb: 'drop', monsterMoving: true });
}

function stoneGolemPolymorphMonster(mon, floorMessages, visible) {
    const stoneData = monsterByRndName('stone golem');
    if (!stoneData) return false;
    if (visible) floorMessages.push(`${monsterDisplayName(mon)} solidifies...`);
    const oldHp = mon.mhp || 1;
    const oldMax = mon.mhpmax || oldHp;
    const shiftedLevel = adjustedMonsterLevel(stoneData);
    const shiftedHp = monster_hp(stoneData, shiftedLevel);
    Object.assign(mon, {
        data: { ...stoneData, hpLevel: shiftedLevel },
        m_lev: shiftedLevel,
        mhp: Math.max(1, Math.min(shiftedHp, Math.trunc((oldHp * shiftedHp) / oldMax))),
        mhpmax: shiftedHp,
    });
    maybeDropStoneGolemWeapon(mon, floorMessages);
    if (visible) floorMessages.push(`Now it's a stone golem.`);
    newsym(mon.mx, mon.my);
    return true;
}

function petrifyMonsterAttacker(attacker, defender, { visible = false, messages = null } = {}) {
    if (!monsterContactPetrifiesAttacker(attacker, defender)) return false;
    const floorMessages = Array.isArray(messages) ? messages : [];
    if (monsterPolyWhenStoned(attacker) && stoneGolemPolymorphMonster(attacker, floorMessages, visible)) {
        for (const msg of floorMessages) addToplineMessage(msg);
        return true;
    }
    if (visible) floorMessages.push(`${monsterDisplayName(attacker)} turns to stone!`);
    else if (attacker?.mtame || attacker?.pet)
        floorMessages.push('You have a peculiarly sad feeling for a moment, then it passes.');
    stoneMonster(attacker, floorMessages, { awardExperience: false });
    for (const msg of floorMessages) addToplineMessage(msg);
    return true;
}

function addToplineMessage(msg) {
    let text = String(msg || '');
    if (game._silent_drop_prompt_message) {
        if (game._pending_message === game._silent_drop_prompt_message && !game._message_more)
            game._pending_message = '';
        game._silent_drop_prompt_message = '';
    }
    if (!game._pending_message && game._pending_fumble_turn_message
        && game._last_fumble_turn_message && text !== game._last_fumble_turn_message
        && (game.moves || 0) - (game._last_fumble_turn_move ?? -99) <= 2) {
        text = `${game._last_fumble_turn_message}  ${text}`;
        game._last_fumble_turn_message = '';
    }
    if (text !== 'You are caught in a bear trap.') game._last_trapmove_message = '';
    game._keep_pending_message = 1;
    if (!game._pending_message) {
        game._pending_message = text;
        game._pending_fumble_turn_message = 0;
        game._pending_fumble_turn_message_starts = 0;
        game._pending_fumble_message_roll = 0;
        game._pending_fumble_after_monster_noise_message = 0;
        game._pending_starts_monster_noise_message = 0;
        game._pending_monster_noise_message = 0;
        game._pending_monster_noise_far = 0;
        if (game._swallow_overlay_active) refreshSwallowOverlay(false);
        return true;
    }

    const width = game.nhDisplay?.cols || 80;
    const fits = game._pending_message.length + text.length + 3 < width - 8;
    if (game._running_continuation || game._initial_run_command || game._run_steps_remaining > 0) {
        if (fits) {
            if (/^staircase (?:up|down)$/.test(game._pending_message)
                && /^There is a staircase (?:up|down) here\. {0,2}$/.test(text)) {
                const cursor = Math.max(1, 40 - game._pending_message.length);
                game._pending_message = `${game._pending_message}\x1b[${cursor}C${text.trimEnd()}`;
            } else {
                game._pending_message = `${game._pending_message}  ${text}`;
            }
            if (game._swallow_overlay_active) refreshSwallowOverlay(false);
            return true;
        }
        game._message_more = 1;
        game._process_time_with_more = 0;
        if (game._topline_after_more && game._topline_after_more.length + text.length + 3 < width - 8) {
            game._topline_after_more = `${game._topline_after_more}  ${text}`;
        } else {
            game._topline_after_more = text;
            game._topline_after_more_fumble_turn_message = 0;
            game._topline_after_more_fumble_turn_message_starts = 0;
            game._topline_after_more_fumble_message_roll = 0;
        }
        return false;
    }

    if (fits) {
        if (/^staircase (?:up|down)$/.test(game._pending_message)
            && /^There is a staircase (?:up|down) here\. {0,2}$/.test(text)) {
            const cursor = Math.max(1, 40 - game._pending_message.length);
            game._pending_message = `${game._pending_message}\x1b[${cursor}C${text.trimEnd()}`;
        } else {
            game._pending_message = `${game._pending_message}  ${text}`;
        }
        if (game._swallow_overlay_active) refreshSwallowOverlay(false);
        return true;
    }

    game._message_more = 1;
    game._process_time_with_more = 0;
    if (game._topline_after_more && game._topline_after_more.length + text.length + 3 < width - 8) {
        game._topline_after_more = `${game._topline_after_more}  ${text}`;
    } else {
        game._topline_after_more = text;
        game._topline_after_more_fumble_turn_message = 0;
        game._topline_after_more_fumble_turn_message_starts = 0;
        game._topline_after_more_fumble_message_roll = 0;
    }
    return false;
}

function appendAfterMoreMessage(msg) {
    if (!msg) return;
    if (!game._topline_after_more) {
        game._topline_after_more = msg;
        return;
    }
    const width = game.nhDisplay?.cols || 80;
    if (game._topline_after_more.length + msg.length + 3 < width - 8) {
        game._topline_after_more = `${game._topline_after_more}  ${msg}`;
    } else {
        game._queued_messages_after_more ??= [];
        game._queued_messages_after_more.push({ text: msg, more: true });
    }
}

function addMonsterThrownFloorMessages(messages, afterMore = false) {
    for (const msg of messages || []) {
        if (afterMore) appendAfterMoreMessage(msg);
        else addToplineMessage(msg);
    }
}

function maybeBlockInvulnerableAttack(mon) {
    if (!game.u?.uinvulnerable) return false;
    if (game._prayer_ignore_invulnerable_attack_messages) return true;
    if (mon === game.u?.ustuck) {
        addToplineMessage(`${monsterDisplayName(mon)} loosens its grip slightly.`);
        return true;
    }
    if (Math.max(Math.abs((mon.mx || 0) - (game.u?.ux || 0)), Math.abs((mon.my || 0) - (game.u?.uy || 0))) > 1)
        return true;
    if (!game.u?.blind && !mon.minvis && !mon.mundetected && couldSeeCoord(mon.mx, mon.my))
        addToplineMessage(`${monsterDisplayName(mon)} starts to attack you, but pulls back.`);
    else
        addToplineMessage('You feel something move nearby.');
    return true;
}

function monsterDisplayName(mon, hallucinate = false, bareBogus = false) {
    let name = mon.data?.name || 'creature';
    if (name === 'elf-noble') name = mon.female ? 'elf-lady' : 'elf-lord';
    if (name === 'dwarf leader') name = 'dwarf lord';
    if (name === 'dwarf ruler') name = 'dwarf king';
    if (name === 'gnome leader') name = 'gnome lord';
    if (name === 'gnome ruler') name = 'gnome king';
    if (name === 'kobold leader') name = 'kobold lord';
    if (name === 'ogre leader') name = 'ogre lord';
    if (name === 'vampire leader') name = 'vampire lord';
    if (hallucinate && (game.u?._statusSuffix || '').includes('Hallu') && !game.u?.blind) {
        let halluIndex;
        do {
            halluIndex = rn2_on_display_rng(SPECIAL_PM + BOGUSMONSIZE);
        } while (halluIndex < SPECIAL_PM && !DISPLAY_MONSTER_HALLU_NAMES[halluIndex]);
        if (halluIndex >= SPECIAL_PM) {
            name = getbogusmon();
            if (bareBogus) return name;
        } else {
            rn2_on_display_rng(2);
            name = DISPLAY_MONSTER_HALLU_NAMES[halluIndex] || name;
        }
        return `The ${name}`;
    }
    if (mon.isshk && mon.shknam) return mon.shknam;
    return mon.givenName || `The ${name}`;
}

function normalizedAttackCode(value) {
    return String(value || '').toLowerCase().replace(/^(?:ad|at)_/, '');
}

function isDigestEngulfAttack(attack) {
    return normalizedAttackCode(attack?.aatyp) === 'engl'
        && normalizedAttackCode(attack?.adtyp) === 'dgst';
}

function digestTasteMessage(mon) {
    const name = monsterDisplayName(mon).replace(/^The /, 'the ');
    return `Obviously ${name} doesn't like your taste.`;
}

function covetousMonsterNextToHero(mon) {
    const spot = enextoMonsterSpot(game.u?.ux || 0, game.u?.uy || 0, mon.data || {});
    if (!spot) return false;
    const oldX = mon.mx;
    const oldY = mon.my;
    mon.mx = spot.x;
    mon.my = spot.y;
    mon.mux = game.u?.ux ?? spot.x;
    mon.muy = game.u?.uy ?? spot.y;
    clearMonsterTrack(mon);
    newsym(oldX, oldY);
    newsym(spot.x, spot.y);

    const dist = (spot.x - (game.u?.ux || 0)) ** 2 + (spot.y - (game.u?.uy || 0)) ** 2;
    const where = dist <= 2 ? ' next to you' : dist <= BOLT_LIM * BOLT_LIM ? ' close by' : '';
    const subject = game.u?.blind || mon.minvis ? 'It' : monsterDisplayName(mon);
    const verb = game.u?.blind ? 'arrives' : 'appears';
    const shown = addToplineMessage(`${subject} suddenly ${verb}${where}!`);
    if (!shown && game._message_more) game._topline_more_after_more = 1;
    return true;
}

function exerciseAttribute(attr, increase) {
    const u = game.u;
    if (!u || attr === A_INT || attr === A_CHA) return;
    if (u._polyself_base && attr !== A_WIS) return;
    u._aexe ??= Array(A_MAX).fill(0);
    if (Math.abs(u._aexe[attr] || 0) >= AVAL) return;

    const current = u.acurr?.a?.[attr] ?? 10;
    if (increase) u._aexe[attr] += rn2(19) > current ? 1 : 0;
    else u._aexe[attr] -= rn2(2);
}

function addHeroStatusSuffix(status) {
    if (!game.u) return;
    const parts = String(game.u._statusSuffix || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.includes(status)) parts.push(status);
    game.u._statusSuffix = parts.length ? ` ${parts.join(' ')}` : '';
}

function removeHeroStatusSuffix(status) {
    if (!game.u) return;
    const parts = String(game.u._statusSuffix || '').trim().split(/\s+/).filter(part => part !== status);
    game.u._statusSuffix = parts.length ? ` ${parts.join(' ')}` : '';
}

function articleFor(name) {
    return /^[aeiou]/i.test(String(name || '')) ? 'an' : 'a';
}

function monsterSlingAmmoName(item) {
    if (item?.otyp === FLINT) return 'flint stone';
    if (item?.otyp === ROCK) return 'rock';
    if (item?.otyp === LOADSTONE) return 'loadstone';
    if (item?.otyp === LUCKSTONE) return 'luckstone';
    const name = String(item?.actualKind || item?.kind || item?.gemDescription || '').trim();
    if (name.toLowerCase() === 'flint') return 'flint stone';
    return name || 'rock';
}

function monsterSlingAmmoRank(item, mon) {
    if (!item) return -1;
    const name = monsterSlingAmmoName(item).toLowerCase();
    if (item?.otyp === FLINT || name === 'flint' || name === 'flint stone') return 0;
    if (item?.otyp === ROCK || name === 'rock') return 1;
    if (item?.otyp === LOADSTONE || name === 'loadstone') return item?.cursed ? -1 : 2;
    if (item?.otyp === LUCKSTONE || name === 'luckstone') return 3;
    if (!mon?.data?.likesGems && monsterPickupClass(item) === GEM_CLASS) return 4;
    return -1;
}

function selectMonsterSlingAmmoIndex(mon) {
    let bestIndex = -1;
    let bestRank = Infinity;
    const inventory = mon?.minvent || [];
    for (let i = 0; i < inventory.length; i++) {
        const rank = monsterSlingAmmoRank(inventory[i], mon);
        if (rank >= 0 && rank < bestRank) {
            bestRank = rank;
            bestIndex = i;
        }
    }
    return bestIndex;
}

function monsterSlingAmmoDamageSides(item) {
    const name = monsterSlingAmmoName(item).toLowerCase();
    return item?.otyp === FLINT || name === 'flint' || name === 'flint stone' ? 6 : 3;
}

function armHeroDeathMore(message = 'You die...') {
    const messages = [];
    if (game._pending_message) messages.push(game._pending_message);
    if (game._topline_after_more && !messages.includes(game._topline_after_more))
        messages.push(game._topline_after_more);
    messages.push(message);
    game._pending_message = messages.join('  ');
    game._topline_after_more = '';
    game._message_more = 1;
    game._message_more_line = '';
    game._process_time_with_more = 0;
    game._keep_pending_message = 1;
    game._pending_time_passed = 0;
    if (game.context) game.context.move = 0;
    game._process_command_time_now = 0;
    game._run_steps_remaining = 0;
    game._running_continuation = 0;
    game._initial_run_command = 0;
    game._travel_keys = [];
    game._deferred_monster_turn_tail = 0;
    game._continue_monsters_after_more = 0;
    game._resume_time_after_more = 0;
    game._turn_tail_topline_more = 1;
    game._command_mode = 'deathDieMore';
}

function armHeroLifeSavingMore(message = '') {
    const lifesavingMessage = message
        || `But wait...  Your medallion ${game.u?.blind ? 'feels warm' : 'begins to glow'}!`;
    const messages = [];
    if (game._pending_message) messages.push(game._pending_message);
    if (game._topline_after_more && !messages.includes(game._topline_after_more))
        messages.push(game._topline_after_more);
    messages.push(lifesavingMessage);
    game._pending_message = messages.join('  ');
    game._topline_after_more = '';
    game._message_more = 1;
    game._message_more_line = '';
    game._process_time_with_more = 0;
    game._keep_pending_message = 1;
    game._pending_time_passed = 0;
    if (game.context) game.context.move = 0;
    game._process_command_time_now = 0;
    game._run_steps_remaining = 0;
    game._running_continuation = 0;
    game._initial_run_command = 0;
    game._travel_keys = [];
    game._deferred_monster_turn_tail = 0;
    game._continue_monsters_after_more = 0;
    game._resume_time_after_more = 0;
    game._turn_tail_topline_more = 1;
    game._command_mode = 'lifeSavingMore';
}

function heroWearingSpeedBoots(g = game) {
    return (g.inventory || []).some(item =>
        item.worn && String(item.kind || item.actualKind || item.line || '').includes('speed boots'));
}

function wornSpeedBootsLine(item, g = game) {
    const bucKnown = item.bknown === true || (g._startup_role || g.urole?.name?.m) === 'Priest';
    const buc = item.blessed ? 'blessed' : item.cursed ? 'cursed' : 'uncursed';
    const spe = `${(item.spe ?? 0) >= 0 ? '+' : ''}${item.spe ?? 0}`;
    const phrase = `${bucKnown ? `${buc} ` : ''}${spe} pair of speed boots`;
    const article = /^[aeiou]/i.test(phrase) ? 'an' : 'a';
    return `${item.letter || '?'} - ${article} ${phrase} (being worn)`;
}

function isBlueDragonArmorKind(kind) {
    return kind === 'blue dragon scale mail' || kind === 'blue dragon scales';
}

function heroWearingBlueDragonArmor(g = game) {
    return (g.inventory || []).some(item =>
        item.worn && isBlueDragonArmorKind(String(item.kind || item.actualKind || '').toLowerCase()));
}

const ROLE_INTRINSIC_FAST_LEVELS = {
    Archeologist: 10,
    Barbarian: 7,
    Caveman: 7,
    Knight: 7,
    Monk: 1,
    Samurai: 1,
    Valkyrie: 7,
};

function heroHasIntrinsicFast(g = game) {
    const role = g?._startup_role || g?.urole?.name?.m;
    const threshold = ROLE_INTRINSIC_FAST_LEVELS[role];
    return !!g?.u?._intrinsicFast || (!!threshold && (g?.u?.ulevel || 1) >= threshold);
}

function syncHeroSpeedState(g = game) {
    if (!g?.u) return;
    g.u._blueDragonFast = heroWearingBlueDragonArmor(g);
    const veryFast = !!(g.u._blueDragonFast || heroWearingSpeedBoots(g) || (g.u._veryfastTimeout || 0) > 0);
    g.u.veryfast = veryFast;
    g.u.fast = heroHasIntrinsicFast(g) || veryFast;
}

function setBlueDragonArmorFast(g, enabled) {
    if (!g?.u) return;
    g.u._blueDragonFast = !!enabled;
    const veryFast = !!(g.u._blueDragonFast || heroWearingSpeedBoots(g) || (g.u._veryfastTimeout || 0) > 0);
    g.u.veryfast = veryFast;
    g.u.fast = heroHasIntrinsicFast(g) || veryFast;
}

function addEatingNutrition(g, nutrition) {
    if (!g?.u || !(nutrition > 0)) return;
    g.u.uhunger = (g.u.uhunger ?? 900) + nutrition;
    g.u._statusSuffix = (g.u._statusSuffix || '')
        .replace(/ Satiated| Hungry| Weak| Fainting| Fainted/g, '');
    if (g.u.uhunger > 1000) g.u._statusSuffix = `${g.u._statusSuffix || ''} Satiated`;
}

function consumeEatingObject(item, nutrition) {
    if (!item?.oeaten || !(nutrition > 0)) return;
    item.oeaten -= nutrition;
    if (item.oeaten <= 0) item.oeaten = 1;
}

function consumeEatingInventoryObject(item, nutrition) {
    consumeEatingObject(item, nutrition);
}

function removeEatingInventoryObject(g, item) {
    if (!item) return;
    g.inventory = (g.inventory || []).filter(other => other !== item);
}

function clearEatingInventoryState(g) {
    g._eating_inventory_object = null;
    g._eating_bite_nutrition = 0;
    g._eating_bite_hunger = 0;
}

function clearInterruptedEatingState(g) {
    g._eating_interrupted = 0;
    g._eating_paused_turns_remaining = 0;
}

function clearEatingFullnessState(g) {
    g._eating_canchoke = 0;
    g._eating_fullwarn = 0;
    g._eating_nomovemsg = '';
}

function useUpEatingFloorObject(g, item) {
    if (!item || !g?.level) return;
    g.level.objects = (g.level.objects || []).filter(other => other !== item);
    newsym(item.ox, item.oy);
}

function eatingOccupationObjectName(item) {
    const rawName = item?.line ? inventoryItemName(item) : pickupObjectName({ ...item, quan: 1 });
    const base = rawName
        .replace(/^[a-zA-Z$?] - /, '')
        .replace(/ \((?:weapon|wielded|alternate weapon|being worn|at the ready|in quiver|on .* hand).*$/, '')
        .replace(/^(?:a|an|the)\s+/i, '');
    return `the ${base}`;
}

function clearActiveEatingOccupation(g) {
    g._eating_turns_remaining = 0;
    g._eating_finish_message = '';
    g._eating_floor_object = null;
    g._eating_floor_object_direct_useup = 0;
    g._eating_nutrition = 0;
    g._eating_newt_buzz = 0;
    clearEatingInventoryState(g);
    clearInterruptedEatingState(g);
    clearEatingFullnessState(g);
}

function pauseEatingOccupationAfterChoke(g, remainingTurns) {
    if (!(remainingTurns > 0)) {
        clearActiveEatingOccupation(g);
        return;
    }
    g._eating_paused_turns_remaining = remainingTurns;
    g._eating_interrupted = 1;
    g._eating_turns_remaining = 0;
    g._eating_fullwarn = 0;
    g._eating_nomovemsg = '';
}

export function interruptEatingOccupation(g = game) {
    if (!(g._eating_turns_remaining > 0)) return false;
    if (g._eating_turns_remaining <= 1)
        return processEatingOccupationTick(g);

    const eatenObject = g._eating_inventory_object || g._eating_floor_object;
    const biteNutrition = Math.trunc(g._eating_bite_nutrition || 0);
    if (eatenObject && biteNutrition > 0) {
        g._eating_paused_turns_remaining = g._eating_turns_remaining;
        g._eating_interrupted = 1;
        g._eating_turns_remaining = 0;
        g._pending_rotten_food_eating_message = 0;
        addToplineMessage(`You stop eating ${eatingOccupationObjectName(eatenObject)}.`);
        return true;
    }

    clearActiveEatingOccupation(g);
    g._pending_rotten_food_eating_message = 0;
    return true;
}

function interruptPositiveMultiForStoning() {
    game._run_steps_remaining = 0;
    game._running_continuation = 0;
    game._initial_run_command = 0;
    game._run_steps_after_more = 0;
    game._travel_keys = [];
    game._travel_dynamic_target = null;
    game._search_pending_count = 0;
    game._counted_repeat_interruptible = 0;
}

function stopStoningOccupations() {
    game._eating_turns_remaining = 0;
    game._eating_finish_message = '';
    game._eating_floor_object = null;
    game._eating_floor_object_direct_useup = 0;
    game._eating_floor_object_pending_useup = null;
    game._eating_nutrition = 0;
    game._eating_newt_buzz = 0;
    clearEatingInventoryState(game);
    clearInterruptedEatingState(game);
    clearEatingFullnessState(game);
    game._pending_rotten_food_eating_message = 0;
    game._armor_wear_occupation = null;
    game._armor_takeoff_after_more = null;
    game._armor_finish_after_more = 0;
    game._force_lock_occupation = null;
    game._force_lock_continue_time = 0;
    game._force_lock_finish_after_more = null;
    game._pending_force_lock_start_message = 0;
    game._pick_lock_occupation = null;
    game._pick_lock_continue_time = 0;
    game._pick_dig_occupation = null;
    game._queued_pick_dig_apply_letter = null;
    game._apply_pick_dig_letter = null;
    game._tin_opening_occupation = null;
    game._tin_finish_after_turn = null;
    game._tin_opened_pending = null;
    game._spellbook_study_occupation = null;
    game._spellbook_finish_after_topline_more = null;
    game._prayer_occupation = 0;
    game._prayer_pending_done = 0;
    game._pending_prayer_finish_message = 0;
    game._prayer_process_time_now = 0;
    game._prayer_debug_pleased = 0;
    game._prayer_split_finish_message = 0;
    game._prayer_split_waiting_for_time = 0;
    game._prayer_split_remaining_time = 0;
    game._prayer_nearby_trouble = 0;
    if (game.u) game.u.uinvulnerable = false;
    interruptPositiveMultiForStoning();
}

function silentlyHealHeroWoundedLegsForStoning() {
    if (!game.u || game.u.usteed || !(game.u._woundedLegTurns || 0)) return;
    game.u._woundedLegTurns = 0;
    game.u._woundedLegSide = '';
    if (game.u._woundedDexPenalty && game.u.acurr?.a) {
        game.u.acurr.a[A_DEX]++;
        game.u._woundedDexPenalty = 0;
    }
    game.u._statusSuffix = (game.u._statusSuffix || '').replace(' Burdened', '');
}

function applyStoningDialogueSideEffects(timeout) {
    if (!game.u) return;
    switch (timeout) {
    case 5:
        game.u._veryfastTimeout = 0;
        syncHeroSpeedState(game);
        interruptPositiveMultiForStoning();
        break;
    case 4:
        stopStoningOccupations();
        break;
    case 3:
        stopStoningOccupations();
        game._helpless_time = Math.max(game._helpless_time || 0, 4);
        game._sleeping_time = 0;
        game._wake_message = 'You can move again.';
        game._stoning_multi_reason = 'getting stoned';
        game._pending_time_passed = Math.max(game._pending_time_passed || 0, 3);
        game._process_command_time_now = 1;
        silentlyHealHeroWoundedLegsForStoning();
        break;
    case 2:
        if ((game.u._deafTimeout || 0) > 0 && game.u._deafTimeout < 5)
            game.u._deafTimeout = 5;
        game.u._vomitingTimeout = 0;
        game.u.vomiting = false;
        removeHeroStatusSuffix('Vom');
        game.u._slimingTimeout = 0;
        game.u.sliming = false;
        removeHeroStatusSuffix('Slime');
        break;
    default:
        break;
    }
}

function applySlimingDialogueSideEffects(timeout) {
    if (!game.u) return;
    switch (timeout) {
    case 7:
        game.u._veryfastTimeout = 0;
        syncHeroSpeedState(game);
        interruptPositiveMultiForStoning();
        break;
    case 5:
        if ((game.u._deafTimeout || 0) > 0 && game.u._deafTimeout < 5)
            game.u._deafTimeout = 5;
        break;
    case 3:
        if (game.u._stonedTimeout) {
            game.u._stonedTimeout = 0;
            game.u._stonedKiller = '';
            removeHeroStatusSuffix('Stone');
        }
        break;
    default:
        break;
    }
    exerciseAttribute(A_DEX, false);
}

function processAttributeExercise() {
    const u = game.u;
    if (!u) return;

    const oneShotExerciseTurnOffset = game._exercise_turn_offset || 0;
    const exerciseTurnOffset = oneShotExerciseTurnOffset;
    const turn = (game.moves || 1) + 1 + exerciseTurnOffset;
    const skipPeriodicExerciseTurn = game._skip_periodic_exercise_turn || 0;
    const skipPeriodicExerciseAtTurn = !!skipPeriodicExerciseTurn && turn === skipPeriodicExerciseTurn;
    if (skipPeriodicExerciseAtTurn) game._skip_periodic_exercise_turn = 0;
    const skipPeriodicExercise = !!game._skip_periodic_exercise_once || skipPeriodicExerciseAtTurn;
    const duplicatePeriodicExercise = game._last_periodic_exercise_turn === turn;
    game._skip_periodic_exercise_once = 0;
    if (!skipPeriodicExercise && !duplicatePeriodicExercise && !(turn % 10)) {
        const rawHunger = u.uhunger ?? 900;
        const hunger = rawHunger > 1000 && !(u._statusSuffix || '').includes('Satiated')
            ? 1000
            : rawHunger;
        const roleName = game.urole?.name?.m || game._startup_role || '';
        if (hunger > 1000) {
            exerciseAttribute(A_DEX, false);
            if (roleName === 'Monk') exerciseAttribute(A_WIS, false);
        } else if (hunger > 150) exerciseAttribute(A_CON, true);
        else if (hunger > 0 && hunger <= 50) {
            exerciseAttribute(A_STR, false);
            if (roleName === 'Monk') exerciseAttribute(A_WIS, true);
        }
        else if (hunger <= 0) exerciseAttribute(A_CON, false);

        let carriedWeight = Math.trunc(((game._goldCount || 0) + 50) / 100);
        for (const item of game.inventory || []) {
            if (item.letter === '$' || item.cls === 'coin' || item.otyp === 'coin') continue;
            carriedWeight += objectWeight(item) * (item.quan || 1);
        }
        const capacity = Math.min(1000, 25 * ((u.acurr?.a?.[A_STR] ?? 10) + (u.acurr?.a?.[A_CON] ?? 10)) + 50);
        const burden = carriedWeight - capacity;
        const encumbrance = burden <= 0 ? 0 : Math.min(Math.trunc(burden * 2 / capacity) + 1, OVERLOADED);
        if (encumbrance === MOD_ENCUMBER) exerciseAttribute(A_STR, true);
        else if (encumbrance === HVY_ENCUMBER) {
            exerciseAttribute(A_STR, true);
            exerciseAttribute(A_DEX, false);
        } else if (encumbrance === EXT_ENCUMBER) {
            exerciseAttribute(A_DEX, false);
            exerciseAttribute(A_CON, false);
        }
    }

    if (!skipPeriodicExercise && !duplicatePeriodicExercise && !(turn % 5)) {
        const status = u._statusSuffix || '';
        if (u.clairvoyant) exerciseAttribute(A_WIS, true);
        if (u.regenerating) exerciseAttribute(A_STR, true);
        if (u.sick || u.vomiting || status.includes('Sick')) exerciseAttribute(A_CON, false);
        if (status.includes('Conf') || status.includes('Hallu')) exerciseAttribute(A_WIS, false);
        if ((u._woundedLegTurns || 0) > 0 || u.fumbling || status.includes('Stun')) exerciseAttribute(A_DEX, false);
    }
    if (!skipPeriodicExercise) game._last_periodic_exercise_turn = turn;
    if (oneShotExerciseTurnOffset) game._exercise_turn_offset = 0;

    game.context ??= {};
    game.context.next_attrib_check ??= 600;
    if (turn < game.context.next_attrib_check) return;
    if ((game._running_continuation || game._initial_run_command)
        && (game._run_steps_remaining || 0) > 0)
        return;
    if (game._helpless_time || game._armor_wear_occupation || game._eating_turns_remaining
        || game._force_lock_occupation || game._pick_lock_occupation || game._pick_dig_occupation || game._tin_opening_occupation
        || game._prayer_occupation) return;
    if (game._fumble_turn_message_pending || game._pending_fumble_turn_message
        || game._last_fumble_turn_message) {
        game._fumble_delayed_exerchk = 1;
        game._defer_fumble_exerchk_once = 0;
        return;
    }
    const forceFumbleExerciseRoll = !!game._defer_fumble_exerchk_once;
    game._defer_fumble_exerchk_once = 0;

    const aexe = u._aexe ??= Array(A_MAX).fill(0);
    const race = RACE_STATE[game._startup_race || game.urace?.noun || 'human'] || RACE_STATE.human;
    let testedExercise = false;
    for (let attr = 0; attr < A_MAX; attr++) {
        const ax = aexe[attr] || 0;
        if (!ax) continue;
        const sign = Math.sign(ax);
        const current = u.acurr?.a?.[attr] ?? 10;
        const min = race.attrMin?.[attr] ?? 3;
        const max = Math.min(18, race.attrMax?.[attr] ?? 18);
        if ((ax < 0 && current > min) || (ax > 0 && current < max)) {
            const threshold = attr === A_WIS ? Math.abs(ax) : Math.trunc(Math.abs(ax) * 2 / 3);
            testedExercise = true;
            if (rn2(AVAL) <= threshold && u.acurr?.a) {
                u.acurr.a[attr] = current + sign;
                if (sign > 0 && u.amax?.a) u.amax.a[attr] = Math.max(u.amax.a[attr], u.acurr.a[attr]);
            }
        }
        aexe[attr] = Math.trunc(Math.abs(ax) / 2) * sign;
    }
    if (!testedExercise && (game._fumble_delayed_exerchk || forceFumbleExerciseRoll)) rn2(AVAL);
    game._fumble_delayed_exerchk = 0;
    game.context.next_attrib_check += 800 + rn2(200);
}

function refreshWarningMonsters() {
    if (!game.u?.warning || (game.u?._statusSuffix || '').includes('Hallu')) return;
    for (const mon of game.level?.monsters || []) {
        if (!mon || mon.dead || (mon.mhp != null && mon.mhp <= 0)) continue;
        newsym(mon.mx, mon.my);
    }
}

function processDungeonSounds() {
    if ((game.u?._statusSuffix || '').includes('Deaf') || (game.u?._deafTimeout || 0) > 0) return;
    const flags = game.level?.flags || {};
    const showSound = msg => {
        if (game._suppress_dungeon_sound_messages > 0) {
            game._suppress_dungeon_sound_messages--;
            return true;
        }
        if ((game.level?.monsters || []).some(mon => mon.isgd && mon._vault_escort_active)) return false;
        const shown = addToplineMessage(msg);
        if (shown && game._counted_repeat_interruptible
            && (game._pending_time_passed || 0) <= 1) {
            game._pending_time_passed = 0;
            game._skip_pending_time_decrement = 1;
            game._search_pending_count = 0;
            game._run_steps_remaining = 0;
            game._running_continuation = 0;
            game._initial_run_command = 0;
            game._counted_repeat_interruptible = 0;
            game._message_more = 1;
            game._process_time_with_more = 0;
        }
        if (!shown && game._message_more && game._topline_after_more === msg)
            game._turn_tail_topline_more = 1;
        return shown;
    };
    if (game._skip_next_dungeon_sound > 0) {
        game._skip_next_dungeon_sound--;
        return;
    }
    if (flags.nfountains && !rn2(400)) {
        const sound = rn2(3);
        showSound([
            'You hear bubbling water.',
            'You hear water falling on coins.',
            'You hear the splashing of a naiad.',
        ][sound]);
    }
    if (flags.nsinks && !rn2(300)) {
        const sound = rn2(2);
        showSound([
            'You hear a slow drip.',
            'You hear a gurgling noise.',
        ][sound]);
    }
    for (const flag of ['has_court', 'has_swamp', 'has_vault', 'has_beehive', 'has_morgue', 'has_barracks', 'has_zoo', 'has_shop', 'has_temple']) {
        if (!flags[flag] || rn2(200)) continue;
        if (flag === 'has_shop') {
            const shopRoom = (game.level?.rooms || []).find(room => (room?.rtype || 0) >= SHOPBASE);
            const shopRoomno = shopRoom ? shopRoom.roomnoidx + ROOMOFFSET : 0;
            const shkp = shopRoom && ((shopRoom.resident && !shopRoom.resident.dead ? shopRoom.resident : null)
                || (game.level?.monsters || []).find(mon => mon.isshk && mon.shoproom === shopRoomno));
            const shkpRoom = shkp ? game.level?.at(shkp.mx, shkp.my)?.roomno : 0;
            const heroRoom = game.level?.at(game.u?.ux || 0, game.u?.uy || 0)?.roomno || 0;
            if (!shkp || shkpRoom !== shopRoomno || heroRoom === shopRoomno) continue;
            const sound = rn2(2);
            showSound(sound
                ? 'You hear the chime of a cash register.'
                : 'You hear someone cursing shoplifters.');
        } else if (flag === 'has_vault') {
            const vaultRoom = (game.level?.rooms || []).find(room =>
                room?.rtype === VAULT
                && (game.u?.ux || 0) >= room.lx && (game.u?.ux || 0) <= room.hx
                && (game.u?.uy || 0) >= room.ly && (game.u?.uy || 0) <= room.hy);
            const guardPresent = (game.level?.monsters || [])
                .some(mon => mon.isgd || mon.data?.name === 'guard');
            if (vaultRoom || guardPresent) return;
            const sound = rn2(2);
            showSound(sound
                ? 'You hear someone counting gold coins.'
                : 'You hear the footsteps of a guard on patrol.');
        } else if (flag === 'has_swamp' || flag === 'has_barracks') {
            rn2(flag === 'has_barracks' ? 3 : 2);
        }
        return;
    }
    const oracleLevel = game.oracle_level || game.specialLevels?.find(level => level.name === 'oracle');
    const onOracleLevel = Is_oracle_level(game.u?.uz)
        || (oracleLevel && game.u?.uz?.dnum === (oracleLevel.dnum ?? 0)
            && game.u?.uz?.dlevel === oracleLevel.dlevel);
    if (onOracleLevel && !rn2(400)) {
        const oracle = (game.level?.monsters || []).find(mon => mon.data?.name === 'Oracle');
        if (!oracle || !couldsee(oracle.mx, oracle.my)) rn2(3);
        return;
    }
}

export function processForceLockOccupation() {
    const force = game._force_lock_occupation;
    if (!force) return;
    if (game._message_more && !game._process_time_with_more) return;
    if (game._pet_inventory_resume || game._monster_resume_index || game._monster_resume_same_index
        || game._attack_resume_after_more || game._pickup_resume_after_more || game._queued_dead_monsters?.length) return;

    const chest = force.chest;
    if (!chest || chest.ox !== game.u?.ux || chest.oy !== game.u?.uy) {
        game._force_lock_occupation = null;
        return;
    }

    force.usedtime ||= 0;
    if (force.usedtime++ >= 50 || forceLockOccupationShouldGiveUp(force)) {
        game._force_lock_occupation = null;
        addToplineMessage('You give up your attempt to force the lock.');
        if (force.usedtime >= 50) exerciseAttribute(force.picktyp ? A_DEX : A_STR, true);
        return;
    }

    const tick = processForceLockOccupationTick(force);
    for (const message of tick.messages || []) addToplineMessage(message);
    if (tick.stop) {
        game._force_lock_occupation = null;
        return;
    }

    if (rn2(100) >= force.chance) return;

    game._force_lock_occupation = null;
    if (addToplineMessage('You succeed in forcing the lock.')) {
        if (finishForceLock(force)) game._message_more = 1;
        else game._message_more = 0;
    } else {
        game._force_lock_finish_after_more = force;
    }
}

function processPickLockOccupation() {
    const pick = game._pick_lock_occupation;
    if (!pick) return;

    const chest = pick.chest;
    if (!chest || chest.ox !== game.u?.ux || chest.oy !== game.u?.uy) {
        game._pick_lock_occupation = null;
        return;
    }

    pick.usedtime ||= 0;
    if (pick.usedtime++ >= 50) {
        game._pick_lock_occupation = null;
        addToplineMessage(`You give up your attempt at ${pick.action}.`);
        rn2(19);
        return;
    }

    if (rn2(100) >= pick.chance) return;

    game._pick_lock_occupation = null;
    chest.locked = false;
    chest.olocked = false;
    chest.lknown = true;
    newsym(chest.ox, chest.oy);
    rn2(19);
    if (addToplineMessage(`You succeed in ${pick.action}.`))
        game._pick_lock_continue_time = 1;
}

function pickDigStatueAt(x, y) {
    return (game.level?.objects || []).find(obj =>
        !obj.hidden && !obj.transientProjectile && obj.ox === x && obj.oy === y
        && (obj.kind === 'statue' || obj.otyp === STATUE)) || null;
}

function pickDigStatueTrapAt(x, y) {
    return (game.level?.traps || []).find(trap =>
        trap.tx === x && trap.ty === y && trap.ttyp === STATUE_TRAP) || null;
}

function pickDigTrapAt(x, y) {
    return (game.level?.traps || []).find(trap => trap.tx === x && trap.ty === y) || null;
}

function pickDigItemWielded(item) {
    return !!(item && (item.wielded || item.line?.includes('weapon in') || item.line?.includes('(wielded)')));
}

function pickDigAbilityBonus() {
    const str = game.u?.acurr?.a?.[A_STR] ?? 10;
    if (str < 6) return -2;
    if (str < 8) return -1;
    if (str < 17) return 0;
    if (str < 69) return 1;
    if (str < 118) return 2;
    return 3;
}

function pickDigErosionPenalty(item) {
    return Math.max(item?.oeroded || 0, item?.oeroded2 || 0, item?.erosion || 0);
}

async function processPickDigOccupation() {
    const dig = game._pick_dig_occupation;
    if (!dig) return;
    if (game._message_more && !game._process_time_with_more) return;
    if (game._pet_inventory_resume || game._monster_resume_index || game._monster_resume_same_index
        || game._attack_resume_after_more || game._pickup_resume_after_more || game._queued_dead_monsters?.length) return;

    const item = (game.inventory || []).find(invItem => invItem.letter === dig.itemLetter);
    const ux = game.u?.ux || 0;
    const uy = game.u?.uy || 0;
    const outOfReach = dig.down
        ? (dig.x || 0) !== ux || (dig.y || 0) !== uy
        : Math.max(Math.abs((dig.x || 0) - ux), Math.abs((dig.y || 0) - uy)) > 1;
    if (!pickDigItemWielded(item) || outOfReach) {
        game._pick_dig_occupation = null;
        return;
    }

    dig.effort = (dig.effort || 0) + 10 + rn2(5) + pickDigAbilityBonus()
        + (item?.spe || 0) - pickDigErosionPenalty(item) + (game.u?.udaminc || 0);
    if ((game.urace?.noun || game._startup_race) === 'dwarf') dig.effort *= 2;

    if (dig.down) {
        const trap = pickDigTrapAt(dig.x, dig.y);
        let result = null;
        if (dig.effort > 250 || trap?.ttyp === HOLE) {
            game._pick_dig_occupation = null;
            result = await finishPickDigDownwardHole();
        } else if (dig.effort > 50 && !(trap && (trap.ttyp === TRAPDOOR || trap.ttyp === PIT || trap.ttyp === SPIKED_PIT))) {
            game._pick_dig_occupation = null;
            result = await finishPickDigDownwardPit();
        }
        if (result?.message) {
            addToplineMessage(result.message);
            if (result.more) game._message_more = 1;
        }
        return;
    }

    const statue = pickDigStatueAt(dig.x, dig.y);
    if (!statue) {
        game._pick_dig_occupation = null;
        return;
    }

    if (dig.effort > 100) {
        game._pick_dig_occupation = null;
        const trap = pickDigStatueTrapAt(dig.x, dig.y);
        let animated = false;
        if (trap) {
            const message = await activateStatueTrap(trap, dig.x, dig.y, { shatter: true });
            if (message) {
                addToplineMessage(message);
                animated = true;
            }
        }
        if (!animated) {
            const currentStatue = pickDigStatueAt(dig.x, dig.y);
            if (currentStatue) breakStatueObject(currentStatue, dig.x, dig.y);
            addToplineMessage('The statue shatters.');
        }
        return;
    }

    if (!dig.didMessage) {
        dig.didMessage = true;
        addToplineMessage('You hit the statue with all your might.');
    }
}

function maybePromptQueuedPickDigApply() {
    const letter = game._queued_pick_dig_apply_letter;
    if (!letter || game._command_mode || game._pending_message || game._message_more || game._pending_time_passed) return;
    const item = (game.inventory || []).find(invItem => invItem.letter === letter);
    game._queued_pick_dig_apply_letter = null;
    if (!item || !pickDigItemWielded(item)) return;
    game._apply_pick_dig_letter = letter;
    game._command_mode = 'applyPickDigDirection';
    addToplineMessage('In what direction do you want to dig?');
}

async function processTinOpeningTurn() {
    const result = processTinOpeningOccupation();
    if (!result) return;
    if (result.message) {
        addToplineMessage(result.message);
        return;
    }
    if (result.finish)
        await finishTinOpeningOccupation(result.finish);
}

function eggObjectLocation(entry) {
    if (entry.source === 'inventory') return { x: game.u?.ux || 0, y: game.u?.uy || 0 };
    if (entry.source === 'minvent') return { x: entry.carrier?.mx || 0, y: entry.carrier?.my || 0 };
    return { x: entry.egg.ox || 0, y: entry.egg.oy || 0 };
}

function removeHatchedEgg(entry) {
    const egg = entry.egg;
    if (!egg) return;
    if (entry.source === 'inventory') {
        game.inventory = (game.inventory || []).filter(item => item !== egg);
        game._pet_food_scan_inventory = game.inventory;
    } else if (entry.source === 'floor') {
        game.level.objects = (game.level?.objects || []).filter(obj => obj !== egg);
        newsym(egg.ox, egg.oy);
    } else if (entry.source === 'minvent' && entry.carrier) {
        entry.carrier.minvent = (entry.carrier.minvent || []).filter(obj => obj !== egg);
        entry.carrier.hasInventory = !!entry.carrier.minvent.length;
    }
}

function rescheduleHatchedEggStack(egg) {
    const delay = rnd(12);
    egg.eggHatchTurn = (game.moves || 1) + delay;
    egg._egg_hatch_consumed = true;
    egg._egg_hatch_seq = game._egg_hatch_timer_seq = (game._egg_hatch_timer_seq || 0) + 1;
}

function ensureHatchedPetExtension(mon) {
    mon.mextra ??= {};
    mon.mextra.edog ??= {
        apport: 3,
        hungrytime: Math.max(game.moves || 1, 1) + 1000,
        dropdist: 10000,
        whistletime: 0,
        ogoal: { x: 0, y: 0 },
    };
}

function tameHatchedMonster(mon, entry, yours) {
    const carried = entry.source === 'inventory';
    const dragon = (mon.data?.mlet || mon.data?.glyph) === 'D';
    if ((!yours || entry.silent) && !(carried && dragon)) return;
    mon.pet = true;
    mon.mtame = carried && !dragon ? 20 : Math.max(mon.mtame || 0, 10);
    mon.mpeaceful = 1;
    mon.mflee = 0;
    mon.mfleetim = 0;
    if (game.u) {
        game.u.uconduct ??= {};
        game.u.uconduct.pets = (game.u.uconduct.pets || 0) + 1;
    }
    ensureHatchedPetExtension(mon);
    set_malign(mon);
}

function hatchedMonsterArticle(mon, plural) {
    const name = mon?.givenName || mon?.data?.name || 'creature';
    const pluralName = /(?:s|x|z|ch|sh)$/i.test(name) ? `${name}es`
        : /[^aeiou]y$/i.test(name) ? `${name.slice(0, -1)}ies`
        : `${name}s`;
    if (plural) return `some ${pluralName}`;
    return `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;
}

function reportEggHatch(entry, mon, hatchcount, x, y, yours) {
    const visible = !entry.silent && (cansee(x, y) || !game.viz_array);
    const plural = hatchcount > 1;
    if (entry.source === 'inventory') {
        if (visible) addToplineMessage(`You see ${hatchedMonsterArticle(mon, plural)} drop out of your pack!`);
        else addToplineMessage('You feel something drop from your pack!');
        if (yours) addToplineMessage(`${plural ? 'Their' : 'Its'} crying sounds like "${game.flags?.female ? 'mommy' : 'daddy'}${entry.egg?.spe ? '.' : '?'}"`);
    } else if (entry.source === 'floor' && visible) {
        addToplineMessage(`You see ${hatchedMonsterArticle(mon, plural)} hatch.`);
    } else if (entry.source === 'minvent' && visible) {
        addToplineMessage(`You see ${hatchedMonsterArticle(mon, plural)} drop out of ${monsterDisplayName(entry.carrier)}'s pack!`);
    }
}

function containedObjectChildren(obj) {
    const lists = [];
    if (Array.isArray(obj?.contents)) lists.push(obj.contents);
    if (Array.isArray(obj?.cobj) && obj.cobj !== obj.contents) lists.push(obj.cobj);
    return lists.flat();
}

function appendContainedDueEggEntries(entries, container, context, seen, moves) {
    for (const child of containedObjectChildren(container)) {
        if (!child || seen.has(child)) continue;
        seen.add(child);
        if (isEggObject(child) && eggHasHatchTimer(child) && child.eggHatchTurn <= moves)
            entries.push({ egg: child, source: 'contained', container, ...context });
        appendContainedDueEggEntries(entries, child, context, seen, moves);
    }
}

function appendInertDueEggEntries(entries, objects, source, seen, moves, context = {}) {
    if (!Array.isArray(objects)) return;
    for (const obj of objects) {
        if (!obj || seen.has(obj)) continue;
        seen.add(obj);
        if (isEggObject(obj) && eggHasHatchTimer(obj) && obj.eggHatchTurn <= moves)
            entries.push({ egg: obj, source, ...context });
        appendInertDueEggEntries(entries, containedObjectChildren(obj), source, seen, moves, context);
    }
}

function appendMigratingDueEggEntries(entries, g, seen, moves) {
    if (g._impact_drop_migrations instanceof Map) {
        for (const objects of g._impact_drop_migrations.values())
            appendInertDueEggEntries(entries, objects, 'migrating', seen, moves);
    }
    appendInertDueEggEntries(entries, g.migrating_objs, 'migrating', seen, moves);
    appendInertDueEggEntries(entries, g._migrating_objs, 'migrating', seen, moves);
    for (const carrier of [...(g.migrating_mons || []), ...(g._migrating_mons || [])])
        appendInertDueEggEntries(entries, carrier?.minvent, 'migrating', seen, moves, { carrier });
}

function dueEggEntries(g) {
    const entries = [];
    const containedSeen = new Set();
    const inertSeen = new Set();
    const moves = g.moves || 0;
    for (const egg of [...(g.inventory || [])]) {
        if (isEggObject(egg) && eggHasHatchTimer(egg) && egg.eggHatchTurn <= moves)
            entries.push({ egg, source: 'inventory' });
        appendContainedDueEggEntries(entries, egg, { containerSource: 'inventory' }, containedSeen, moves);
    }
    for (const egg of [...(g.level?.objects || [])]) {
        if (isEggObject(egg) && eggHasHatchTimer(egg) && egg.eggHatchTurn <= moves)
            entries.push({ egg, source: 'floor' });
        appendContainedDueEggEntries(entries, egg, { containerSource: 'floor' }, containedSeen, moves);
    }
    for (const carrier of [...(g.level?.monsters || [])]) {
        for (const egg of [...(carrier.minvent || [])]) {
            if (isEggObject(egg) && eggHasHatchTimer(egg) && egg.eggHatchTurn <= moves)
                entries.push({ egg, source: 'minvent', carrier });
            appendContainedDueEggEntries(entries, egg, { containerSource: 'minvent', carrier }, containedSeen, moves);
        }
    }
    appendInertDueEggEntries(entries, g.level?.buriedobjlist, 'buried', inertSeen, moves);
    appendMigratingDueEggEntries(entries, g, inertSeen, moves);
    return entries.sort((a, b) => ((a.egg.eggHatchTurn || 0) - (b.egg.eggHatchTurn || 0))
        || ((b.egg._egg_hatch_seq || 0) - (a.egg._egg_hatch_seq || 0)));
}

export async function processEggHatchTimeouts(g = game) {
    for (const entry of dueEggEntries(g)) {
        const egg = entry.egg;
        killEggHatchTimer(egg);
        const data = eggHatchMonsterData(egg, g);
        if (!data || entry.source === 'contained' || entry.source === 'buried' || entry.source === 'migrating') continue;

        const yours = !!egg.spe || (entry.source === 'inventory' && !game.flags?.female && !rn2(2));
        const { x, y } = eggObjectLocation(entry);
        const targetCount = rnd(Math.max(1, egg.quan || 1));
        let hatched = 0;
        let lastMon = null;
        for (let i = 0; i < targetCount; i++) {
            const spot = enextoMonsterSpot(x, y, data);
            if (!spot) break;
            const mon = await makemon(data, spot.x, spot.y, NO_MINVENT | MM_NOMSG);
            if (!mon) break;
            tameHatchedMonster(mon, entry, yours);
            newsym(mon.mx, mon.my);
            lastMon = mon;
            hatched++;
        }
        if (!hatched) continue;

        egg.quan = Math.max(0, (egg.quan || 1) - hatched);
        reportEggHatch(entry, lastMon, hatched, x, y, yours);
        game._egg_hatch_processed = (game._egg_hatch_processed || 0) + hatched;
        if ((egg.quan || 0) > 0) rescheduleHatchedEggStack(egg);
        else removeHatchedEgg(entry);
    }
}

function figurineTransformLocation(entry) {
    if (entry.source === 'inventory') return { x: game.u?.ux || 0, y: game.u?.uy || 0 };
    if (entry.source === 'minvent') return { x: entry.carrier?.mx || 0, y: entry.carrier?.my || 0 };
    return { x: entry.figurine.ox || 0, y: entry.figurine.oy || 0 };
}

function dueFigurineEntries(g) {
    const entries = [];
    for (const figurine of [...(g.inventory || [])]) {
        if (isFigurineObject(figurine) && figurine.figurineTransformTurn && figurine.figurineTransformTurn <= g.moves)
            entries.push({ figurine, source: 'inventory' });
    }
    for (const figurine of [...(g.level?.objects || [])]) {
        if (isFigurineObject(figurine) && figurine.figurineTransformTurn && figurine.figurineTransformTurn <= g.moves)
            entries.push({ figurine, source: 'floor' });
    }
    for (const carrier of [...(g.level?.monsters || [])]) {
        for (const figurine of [...(carrier.minvent || [])]) {
            if (isFigurineObject(figurine) && figurine.figurineTransformTurn && figurine.figurineTransformTurn <= g.moves)
                entries.push({ figurine, source: 'minvent', carrier });
        }
    }
    return entries.sort((a, b) => ((a.figurine.figurineTransformTurn || 0) - (b.figurine.figurineTransformTurn || 0))
        || ((b.figurine._figurine_transform_seq || 0) - (a.figurine._figurine_transform_seq || 0)));
}

function removeTransformedFigurine(entry) {
    const figurine = entry.figurine;
    stopFigurineTransformTimeout(figurine);
    if (entry.source === 'inventory') {
        if ((figurine.quan || 1) > 1) {
            figurine.quan = (figurine.quan || 1) - 1;
            const name = pickupObjectName({ ...figurine, quan: 1 });
            figurine.line = `${figurine.letter || '?'} - ${figurine.quan} ${name}`;
        } else {
            game.inventory = (game.inventory || []).filter(item => item !== figurine);
        }
        game._pet_food_scan_inventory = game.inventory;
    } else if (entry.source === 'floor') {
        game.level.objects = (game.level?.objects || []).filter(obj => obj !== figurine);
        newsym(figurine.ox, figurine.oy);
    } else if (entry.source === 'minvent' && entry.carrier) {
        entry.carrier.minvent = (entry.carrier.minvent || []).filter(obj => obj !== figurine);
        entry.carrier.hasInventory = !!entry.carrier.minvent.length;
    }
}

function reportFigurineTransform(entry, mon, x, y, silent) {
    if (!mon || (silent && entry.source !== 'inventory')) return;
    const article = hatchedMonsterArticle(mon, false);
    if (entry.source === 'inventory') {
        if (game.u?.blind || mon.minvis) addToplineMessage('You feel something drop from your pack!');
        else addToplineMessage(`You see ${article} drop out of your pack!`);
    } else if (entry.source === 'floor') {
        if (cansee(x, y)) addToplineMessage(`You see a figurine transform into ${article}!`);
    } else if (entry.source === 'minvent') {
        if (cansee(x, y))
            addToplineMessage(`You see ${article} drop out of ${monsterDisplayName(entry.carrier)}'s pack!`);
    }
}

async function processFigurineTransformTimeouts(g) {
    for (const entry of dueFigurineEntries(g)) {
        const figurine = entry.figurine;
        const timeout = figurine.figurineTransformTurn;
        stopFigurineTransformTimeout(figurine);
        let { x, y } = figurineTransformLocation(entry);
        if (entry.source === 'inventory' || entry.source === 'minvent') {
            const spot = enextoMonsterSpot(x, y, figurine.corpsenm || {});
            if (!spot) {
                attachFigurineTransformTimeout(figurine, rnd(5000));
                continue;
            }
            x = spot.x;
            y = spot.y;
        }
        const check = figurineLocationCheck(figurine, x, y);
        if (!check.ok) {
            attachFigurineTransformTimeout(figurine, rnd(5000));
            continue;
        }
        const result = await makeFigurineFamiliar(figurine, x, y, { quietly: true });
        removeTransformedFigurine(entry);
        reportFigurineTransform(entry, result.mon, x, y, timeout !== g.moves);
    }
}

async function afterMoveTurn(g, includeHeroTime = true) {
    for (const msg of processMeltIceTimers(g, {
        afterMelt: (x, y, result) => result.becameLiquid
            ? applyMeltedIceMonsterLiquidEffects(x, y, { recordKill: recordVanquished })
            : [],
    })) addToplineMessage(msg);
    for (const msg of await processCorpseTimers(g)) addToplineMessage(msg);
    for (const msg of processGlobShrinkTimers(g)) addToplineMessage(msg);
    processBuriedOrganicRot(g);
    await processEggHatchTimeouts(g);
    await processFigurineTransformTimeouts(g);
    if (includeHeroTime && g.moves >= (g.context.seer_turn || 0)) {
        if (g._prayer_debug_pleased && g._pending_prayer_finish_message
            && g._prayer_split_finish_message && !g._prayer_split_waiting_for_time
            && g.u?.blind) {
            g._defer_seer_after_prayer_pleased = 1;
        } else {
            g.context.seer_turn = g.moves + rn2(31) + 15;
        }
    }
}

function maybeShapeshiftVampire(mon) {
    const baseName = mon.vampBase || mon.data?.vampBase;
    if (!baseName) return;
    if (mon.waiting) return;

    const baseData = monsterByRndName(baseName);
    if (!baseData) return;

    const dist2 = (mon.mx - (game.u?.ux || 0)) ** 2 + (mon.my - (game.u?.uy || 0)) ** 2;
    const distantOrUnseen = !couldSeeCoord(mon.mx, mon.my) || dist2 > 64;
    const leaderVampire = baseName === 'vampire leader' || baseName === 'vampire lord' || baseData.vampireLeader;
    let target = null;

    if (mon.data?.mlet !== 'V') {
        const maxhp = mon.mhpmax ?? mon.mhp ?? 1;
        if ((mon.mhp || 0) <= Math.trunc((maxhp + 5) / 6) && rn2(4)) target = baseData;
        else if (mon.data?.name === 'fog cloud' && (mon.mhp || 0) === maxhp && !rn2(4) && distantOrUnseen) {
            const loc = game.level?.at(mon.mx, mon.my);
            const badWalkingForm = loc && (IS_POOL(loc.typ) || IS_LAVA(loc.typ));
            if ((leaderVampire || baseName === 'Vlad the Impaler') && !rn2(baseName === 'Vlad the Impaler' ? 3 : 10) && !badWalkingForm)
                target = RANDOM_MONSTER_BY_NAME.get('wolf');
            if (!target)
                target = !rn2(4) ? RANDOM_MONSTER_BY_NAME.get('fog cloud') : RANDOM_MONSTER_BY_NAME.get('vampire bat');
            if (mon.data?.name !== baseName && !rn2(4)) target = baseData;
        }
    } else if ((mon.mhp || 0) >= Math.trunc((9 * (mon.mhpmax ?? mon.mhp ?? 1)) / 10) && !rn2(6) && distantOrUnseen) {
        const loc = game.level?.at(mon.mx, mon.my);
        const badWalkingForm = loc && (IS_POOL(loc.typ) || IS_LAVA(loc.typ));
        if ((leaderVampire || baseName === 'Vlad the Impaler') && !rn2(baseName === 'Vlad the Impaler' ? 3 : 10) && !badWalkingForm)
            target = RANDOM_MONSTER_BY_NAME.get('wolf');
        if (!target)
            target = !rn2(4) ? RANDOM_MONSTER_BY_NAME.get('fog cloud') : RANDOM_MONSTER_BY_NAME.get('vampire bat');
    }

    if (!target || target.name === mon.data?.name) return;

    const oldHp = mon.mhp || 1;
    const oldMax = mon.mhpmax || oldHp;
    if (target.male) mon.female = false;
    else if (target.female) mon.female = true;
    else if (!target.neuter) rn2(10);
    const newLevel = adjustedMonsterLevel(target);
    const newMax = monster_hp(target, newLevel);
    mon.mhp = Math.max(1, Math.min(newMax, Math.trunc((oldHp * newMax) / oldMax)));
    mon.mhpmax = newMax;
    mon.m_lev = newLevel;
    mon.data = { ...target, hpLevel: newLevel, vampshifter: true, vampBase: baseName };
    possiblyUnwieldMonsterWeapon(mon);
    newsym(mon.mx, mon.my);
}

export async function processMonsterTurns() {
    if (game._stale_queued_kill_pet && game._pending_message !== game._stale_queued_kill_pet.message) {
        const stale = game._stale_queued_kill_pet;
        game._stale_queued_kill_pet = null;
        newsym(stale.x, stale.y);
        if (stale.mon) newsym(stale.mon.mx, stale.mon.my);
        for (const [x, y] of [[stale.x, stale.y], [stale.mon?.mx, stale.mon?.my]]) {
            const loc = game.level?.at(x, y);
            if (loc && game.nhDisplay?.setCell)
                game.nhDisplay.setCell(x - 1, y + 1, loc.disp_ch || ' ', loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
        }
    }
    if (game._eating_floor_object_pending_useup) {
        if (game._eating_floor_object_skip_current_pass) {
            game._eating_floor_object_skip_current_pass = 0;
        } else {
            const eatenFloorObject = game._eating_floor_object_pending_useup;
            rn2(100);
            game.level.objects = (game.level.objects || []).filter(obj => obj !== eatenFloorObject);
            newsym(eatenFloorObject.ox, eatenFloorObject.oy);
            game._eating_floor_object_pending_useup = null;
        }
    }
    if (game._clear_pending_time_after_queued_dead_turn && !game._continue_monsters_after_more) {
        game._clear_pending_time_after_queued_dead_turn = 0;
        game._pending_time_passed = 0;
        game._skip_pending_time_decrement = 1;
        return false;
    }
    if (!game._queued_dead_monsters?.length && game.level?.monsters)
        game.level.monsters = game.level.monsters.filter(mon => mon.mhp == null || mon.mhp > 0);
    let mons = [...(game.level?.monsters || [])].reverse();
    if (game._hallu_names_after_visible_monster_pickup) {
        game._hallu_names_after_visible_monster_pickup = 0;
        for (const mon of mons) {
            if (mon.dead || mon.mhp <= 0 || mon.mpeaceful || mon.pet) continue;
            monsterDisplayName(mon, true);
        }
    }
    const conflictActive = (game.inventory || []).some(item => item.cls === 'ring' && item.worn
        && ((item.ringRoll || item.roll) === 14 || item.actualKind === 'ring of conflict'));
    let somebodyCanMove = game._monster_resume_somebody_can_move || false;
    let startIndex = game._monster_resume_index || 0;
    const pickupResumeStartIndex = startIndex;
    let resumingSameMonster = !!game._monster_resume_same_index;
    let resumeAfterPreturn = !!game._monster_resume_after_preturn;
    const wrapAfterCombatResume = resumingSameMonster && resumeAfterPreturn
        && !!game._attack_resume_after_more;
    if (wrapAfterCombatResume) game._attack_resume_after_more = 0;
    let wrappedAfterCombatResume = false;
    const stopAfterPickupResume = !!game._pickup_resume_stop_after_monsters;
    const continueAfterMore = !!game._continue_monsters_after_more;
    const finishingQueuedDeadTurn = !!game._clear_pending_time_after_queued_dead_turn && continueAfterMore;
    let swallowedEngulferActedThisTurn = false;
    game._pet_combat_more_before_monster_attack = 0;
    if (!startIndex && !resumingSameMonster) {
        for (const mon of mons) {
            mon._moved_ranged_magic_used = 0;
            mon._breath_used_this_turn = 0;
        }
    }
    game._pickup_resume_stop_after_monsters = 0;
    game._continue_monsters_after_more = 0;
    while (game._pickup_deferred_postmove_monsters?.length) {
        const mon = game._pickup_deferred_postmove_monsters.shift();
        if (mon._pickup_newsym_after_more) {
            mon._pickup_newsym_after_more = 0;
            newsym(mon.mx, mon.my);
        }
        if ((game.level?.monsters || []).includes(mon)) maybeSpinMonsterWeb(mon);
        rn2(5);
    }
    while (game._pickup_deferred_postmove_rolls > 0) {
        rn2(5);
        game._pickup_deferred_postmove_rolls--;
    }
    game._monster_resume_index = 0;
    game._monster_resume_somebody_can_move = false;
    game._monster_resume_same_index = 0;
    game._monster_resume_after_preturn = 0;
    if (game._pet_delayed_post_move_roll && !game._message_more) {
        game._pet_delayed_post_move_roll = 0;
        rn2(5);
    }
    if (game._pet_message_resume && !game._message_more) {
        const resume = game._pet_message_resume;
        game._pet_message_resume = null;
        if (resume.kind === 'miss') {
            rn2(3);
            rn2(5);
        } else if (resume.kind === 'hit') {
            const mon = resume.mon;
            const target = resume.target;
            if (mon && target && (game.level?.monsters || []).includes(target)) {
                const petrifyVisible = !game.u?.blind
                    && !!(game.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT)
                    && !!(game.viz_array?.[target.my]?.[target.mx] & IN_SIGHT)
                    && !mon.minvis && !mon.mundetected && !target.minvis && !target.mundetected;
                if (petrifyMonsterAttacker(mon, target, { visible: petrifyVisible })) return false;
                const damage = d(resume.dice ?? 1, resume.sides ?? 2);
                rn2(3);
                rn2(6);
                target.mhp = (target.mhp || 1) - damage;
                if (target.mhp < 1) {
                    const targetName = target.data?.name || 'creature';
                    addToplineMessage(`The ${targetName} is killed!`);
                    const dropCorpse = monsterCorpseDropSucceeds(target, target.data);
                    const corpseData = corpseDataForMonster(target.data);
                    dropMonsterInventory(target);
                    if (dropCorpse && monsterLeavesCorpseLikeDrop(corpseData))
                        createMonsterCorpseOrGlob(target, corpseData);
                    monsterGrowUp(mon, target);
                    rn2(5);
	                    recordVanquished(target, false);
	                    game.level.monsters = (game.level?.monsters || []).filter(other => other !== target);
	                    newsym(target.mx, target.my);
	                    const targetIndex = mons.indexOf(target);
	                    if (targetIndex >= 0) startIndex = Math.max(startIndex, targetIndex + 1);
                } else {
                    rn2(3);
                    const returnAttackRoll = rn2(4);
	                    if (returnAttackRoll
	                        && Math.max(Math.abs(target.mx - mon.mx), Math.abs(target.my - mon.my)) <= 1) {
	                        const targetName = target.data?.name || 'creature';
	                        const petName = mon.givenName || (mon.saddled ? `saddled ${mon.data?.name || 'creature'}`
	                            : mon.data?.name || 'creature');
	                        const petObject = mon.givenName || `the ${petName}`;
	                        const weapon = target.mw || target.minvent?.find(item =>
	                            item.otyp === ORCISH_DAGGER || item.kind === 'orcish dagger' || item.kind === 'dagger');
	                        if (!target.mw && weapon) {
	                            target.mw = weapon;
	                            target.weapon_check = NEED_WEAPON;
	                            target.mlstmv = game.moves || 1;
	                            const stack = (weapon.quan || 1) === 1
	                                ? (weapon.kind === 'orcish dagger' || weapon.otyp === ORCISH_DAGGER ? 'a crude dagger' : `a ${weapon.kind || 'weapon'}`)
	                                : `${weapon.quan} ${weapon.kind === 'orcish dagger' || weapon.otyp === ORCISH_DAGGER ? 'crude daggers' : `${weapon.kind || 'weapon'}s`}`;
	                            recordWeaponDiscoveryForItem(weapon);
	                            addToplineMessage(`The ${targetName} wields ${stack}!`);
	                            game._message_more = 1;
	                            game._process_time_with_more = 0;
	                            if ((mon.mhp || 0) > 0) game._pet_delayed_post_move_roll = 1;
	                            return false;
	                        }
	                        const returnAttack = target.data?.attack || { dice: 1, sides: 2 };
	                        const returnHit = (mon.data?.mac ?? 6) + (target.data?.mlevel ?? 0) > rnd(20);
	                        const nymphReturn = targetName.includes('nymph');
	                        let returnMsg = `The ${targetName} ${returnHit ? (returnAttack.verb || 'hits') : 'misses'} ${petObject}.`;
	                        if (nymphReturn) {
	                            const sameGender = !!target.female === !!mon.female;
	                            returnMsg = returnHit
	                                ? `The ${targetName} smiles at ${petObject} ${sameGender ? 'engagingly' : 'seductively'}.`
	                                : `The ${targetName} pretends to be friendly to ${petObject}.`;
	                        }
	                        if (returnHit) {
	                            const returnDamage = nymphReturn ? d(0, 0) : d(returnAttack.dice ?? 1, returnAttack.sides ?? 2);
	                            rn2(3);
	                            rn2(6);
	                            mon.mhp = (mon.mhp || 1) - returnDamage;
	                            if ((mon.mhp || 0) <= 0) {
	                                game._dead_pet_after_more = mon;
	                                game._queued_message_after_more = `The ${petName} is killed!`;
	                            }
	                        } else {
	                            rn2(3);
	                        }
	                        addToplineMessage(returnMsg);
	                        game._message_more = 1;
	                        game._process_time_with_more = 0;
	                        if (nymphReturn) game._topline_more_after_more = 1;
	                        if (nymphReturn && returnHit && (mon.mhp || 0) > 0) {
	                            rn2(3);
	                            const secondHit = (mon.data?.mac ?? 6) + (target.data?.mlevel ?? 0) > rnd(21);
	                            if (!secondHit) {
	                                game._queued_message_after_more = `The ${targetName} pretends to be friendly to ${petObject}.`;
	                                game._nymph_second_passive_after_more = 1;
	                            }
	                        }
	                        if ((mon.mhp || 0) > 0) game._pet_delayed_post_move_roll = 1;
	                        return false;
	                    }
				                    rn2(5);
                }
            }
        }
    }
    if (game._dead_pet_after_more && !game._message_more) {
        const deadPet = game._dead_pet_after_more;
        game._dead_pet_after_more = null;
        rn2(3);
        next_ident();
        rn2(2);
        game.level.monsters = (game.level?.monsters || []).filter(mon => mon !== deadPet);
        newsym(deadPet.mx, deadPet.my);
    }

	    const storedMonsterMovementReady = mons.some(mon =>
	        (game.level?.monsters || []).includes(mon) && (mon.movement || 0) >= NORMAL_SPEED);
    if ((game._monster_turns_started || storedMonsterMovementReady || resumingSameMonster || startIndex)
        && !finishingQueuedDeadTurn) {
	        do {
		            let swallowedEngulferActed = false;
		            if ((!startIndex || stopAfterPickupResume) && !resumingSameMonster) somebodyCanMove = false;
		            for (let monIndex = startIndex; monIndex < mons.length; monIndex++) {
		                const mon = mons[monIndex];
		                if (!(game.level?.monsters || []).includes(mon)) continue;
		                const resumingPetInventory = game._pet_inventory_resume === mon;
	                const resumedAfterPreturn = resumeAfterPreturn && monIndex === startIndex;
	                if (resumingSameMonster && monIndex === startIndex && mon._resume_web_after_more) {
	                    mon._resume_web_after_more = 0;
	                    mon._hide_for_web_more = 0;
	                    newsym(mon.mx, mon.my);
	                    monsterPickStuff(mon, monIndex, somebodyCanMove);
	                    if (game._message_more && !game._process_time_with_more) return false;
	                    if ((game.level?.monsters || []).includes(mon)) {
	                        maybeSpinMonsterWeb(mon);
	                        rn2(5);
	                    }
	                    resumingSameMonster = false;
	                    continue;
	                }
	                if (resumingSameMonster && monIndex === startIndex && mon._resume_misc_after_more) {
	                    mon._resume_misc_after_more = 0;
	                    if (!mon.data?.mindless && !mon.data?.nohands && !mon.mpeaceful) {
                        const miscRange = (mon.mx - (mon.mux ?? game.u?.ux ?? mon.mx)) ** 2
                            + (mon.my - (mon.muy ?? game.u?.uy ?? mon.my)) ** 2;
                        const potion = [...(mon.minvent || [])].reverse()
                            .find(item => item.cls === 'potion' || item.glyph === '!');
                        if (miscRange <= 36 && potion) {
                            mon.minvent = (mon.minvent || []).filter(item => item !== potion);
                            mon._bullwhip_find_misc_ready = 1;
                            addToplineMessage(couldSeeCoord(mon.mx, mon.my)
                                ? `${monsterDisplayName(mon)} drinks a potion!`
                                : 'You hear a chugging sound.');
                            continue;
                        }
                    }
                }
                const movement = mon.movement || 0;
                const skipAfterMimicReveal = !!mon._skip_after_mimic_reveal;
                if (skipAfterMimicReveal) mon._skip_after_mimic_reveal = 0;
			                if (!resumingPetInventory && !resumedAfterPreturn && mon.data?.name === 'fog cloud') {
		                    const loc = game.level?.at(mon.mx, mon.my);
		                    const closedDoor = loc?.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED));
	                    const visibleRegion = (game.level?.regions || []).some(reg =>
	                        reg.visible && reg.coords?.some(coord => coord.x === mon.mx && coord.y === mon.my));
                    if (!closedDoor && !visibleRegion) createGasCloud(mon.mx, mon.my, 1, 0);
	                }
			                if (!resumingPetInventory && !resumedAfterPreturn) {
						                    if (movement < NORMAL_SPEED) {
								                        continue;
						                    }

			                    mon.movement = movement - NORMAL_SPEED;
			                    if (mon.movement >= NORMAL_SPEED) somebodyCanMove = true;
                        if (monsterMinliquid(mon)) continue;
			                }
	                if (mon.mcanmove === false) continue;
	                const questBattleAtTurnStart = !mon.msleeping && monsterNextToHero(mon);
	                const wasWaiting = !!mon.waiting;
	                if (mon.waiting) {
	                    const seesHero = mon.mcansee !== false
	                        && (!game.u?.invisible || mon.data?.seeInvisible)
	                        && clearPath(mon.mx, mon.my, game.u?.ux || 0, game.u?.uy || 0);
	                    if (seesHero || (mon.mhp || 0) < (mon.mhpmax || 0)) mon.waiting = false;
	                }
	                if (wasWaiting && maybeQueueQuestTalk(mon, { inBattle: questBattleAtTurnStart })) return false;
	                if (mon.waiting) {
	                    if (maybeQueueQuestTalk(mon, { inBattle: questBattleAtTurnStart })) return false;
	                    continue;
	                }
                if (NON_MIMIC_HIDER_NAMES.has(mon.data?.name)) {
		                    const adjacent = Math.max(Math.abs(mon.mx - (game.u?.ux || 0)),
		                        Math.abs(mon.my - (game.u?.uy || 0))) <= 1;
		                    const loc = game.level?.at(mon.mx, mon.my);
			                    if (game.u?.uswallow && mon !== game.u?.ustuck && !mon.pet && !mon.mtame) {
						                    rn2(5);
		                        mon._swallow_distfleeck_done = 1;
	                    }
		                    if (!mon.mcan && mon.appearObj == null && !couldSeeCoord(mon.mx, mon.my)
		                        && !rn2(3) && mon !== game.u?.ustuck && !adjacent && loc?.typ === ROOM) {
		                        mon.mundetected = true;
	                        continue;
	                    }
	                    if (mon.mundetected) continue;
	                }
	                if (mon.data?.mlet === ';' && !mon.mundetected
	                    && (mon.mflee || !monsterNextToHero(mon))
	                    && !monsterVisibleToHero(mon) && !rn2(4)) {
	                    if (hideSeaMonsterUnderWater(mon)) continue;
	                }
	                if (game.level?.flags?.sokoban_rules && mon.msleeping) continue;
                if (mon.appearObj != null) continue;
	                if (mon.msleeping && !disturbSleepingMonster(mon)) continue;
                if (skipAfterMimicReveal) continue;
                if (mon._gear_next_turn) {
                    const targetX = mon.mux ?? game.u?.ux ?? mon.mx;
                    const targetY = mon.muy ?? game.u?.uy ?? mon.my;
                    const farFromHero = (mon.mx - targetX) ** 2 + (mon.my - targetY) ** 2 > 9;
                    if (mon.pet || mon.mpeaceful || farFromHero) {
                        mon._gear_next_turn = 0;
                        const data = mon.data || {};
                        const canWear = !data.nohands && !data.verysmall && !data.mindless;
                        const centaur = data.mlet === 'centaur' || data.glyph === 'C';
                        const gear = canWear && (mon.minvent || []).find(item => {
                            if (item.worn || !(item.cls === 'armor' || item.glyph === '[' || item.otyp === ARMOR_CLASS)) return false;
                            if (!SUIT_ARMOR_PATTERN.test(String(item.kind || item.actualKind || '').toLowerCase())) return true;
                            return !centaur && data.name !== 'marilith' && data.name !== 'winged gargoyle';
                        });
                        if (gear) {
                            gear.worn = true;
                            gear.owornmask ||= 1;
                            const gearKind = String(gear.kind || gear.actualKind || '');
                            const wearDelay = /boots|shoes/.test(gearKind) ? 2
                                : /mail|armor|scales?/.test(gearKind) ? 5 : 1;
                            mon.mfrozen = Math.max(mon.mfrozen || 0, wearDelay);
                            mon.mcanmove = false;
                            continue;
                        }
                    }
                }
                if (mon === game.u?.usteed) {
                    rn2(5);
                    if ((mon.data?.name === 'kitten' || mon.data?.name === 'pony')
                        && (mon.mx - (game.u?.ux || 0)) ** 2 + (mon.my - (game.u?.uy || 0)) ** 2 <= 2) {
                        rn2(4);
                    }
                    rn2(5);
                    continue;
                }
                if (mon.isgd && mon._vault_escort_active) {
                    if (!mon.mx) {
                        restVaultFakecorr(mon);
                        continue;
                    }
                    rn2(5);
                    const guardFar = Math.max(Math.abs(mon.mx - (game.u?.ux || 0)), Math.abs(mon.my - (game.u?.uy || 0))) > 1;
                    if (guardFar) {
                        const vaultRoom = (game.level?.rooms || []).find(room =>
                            room.roomnoidx === mon.egd?.vroom || room.rtype === VAULT);
                        const moveAlongRoll = rn2(10);
                        if (vaultRoom && (game.u?.uy || 0) >= vaultRoom.ly && !moveAlongRoll) {
                            game._pending_message = '"Move along!"';
                            game._keep_pending_message = 1;
                        }
                        restVaultFakecorr(mon);
                        rn2(5);
                        continue;
                    }
                    if (advanceVaultGuard(mon)) {
                        rn2(5);
                        continue;
                    }
                    rn2(5);
		                }
					                consumeSetApparxy(mon);
                if ((game.u?._statusSuffix || '').includes('Hallu')
                    && (scaryObjectAt(mon, game.u?.ux || 0, game.u?.uy || 0)
                        || scaryEngravingAt(mon, game.u?.ux || 0, game.u?.uy || 0)))
                    monsterDisplayName(mon, true);
					                if (game.u?.uswallow && mon !== game.u?.ustuck && !mon.mflee && !mon.pet && !mon.mtame) {
					                        const distfleeckDone = !!mon._swallow_distfleeck_done;
					                        mon._swallow_distfleeck_done = 0;
					                        if (!distfleeckDone) {
					                            rn2(5);
						                        }
					                        const dx = mon.mx - (mon.mux ?? game.u?.ux ?? mon.mx);
					                        const dy = mon.my - (mon.muy ?? game.u?.uy ?? mon.my);
					                        const gridBugDiagonal = mon.data?.name === 'grid bug' && dx && dy;
					                        const nearby = dx * dx + dy * dy < 3 && !gridBugDiagonal;
					                        if (!nearby || mon.mflee || mon.mconf || mon.mstun || mon.mpeaceful)
						                            rn2(5);
				                    continue;
				                }
	                const engraving = game.level?.engravings?.find(engr => engr.x === mon.mx && engr.y === mon.my && engr.text);
                if (engraving) {
                    const engravingType = engraving.type;
                    const preserveRemembered = (mon.pet || mon.mtame) && !(game.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT);
                    wipe_engr_at(mon.mx, mon.my, 1, false);
	                    if (preserveRemembered
	                        && !(game.level?.engravings || []).some(engr => engr.x === mon.mx && engr.y === mon.my && engr.text))
	                        game.level.engravings.push({ x: mon.mx, y: mon.my, text: ' ', type: engravingType });
                }
                if (mon.mconf && !rn2(50)) mon.mconf = 0;
                if (mon.mstun && !rn2(10)) mon.mstun = 0;
                const distfleeckDoneAfterAnger = !!mon._distfleeck_done_after_anger;
                mon._distfleeck_done_after_anger = 0;
                const resumedAfterTeleportRestrict = !!mon._resume_after_teleport_restrict_more;
                if (!resumingPetInventory && resumedAfterPreturn
                    && !distfleeckDoneAfterAnger && !resumedAfterTeleportRestrict) rn2(5);
		                if (!resumingPetInventory && !resumedAfterPreturn) {
                    if (conflictActive && !mon.iswiz && mon.mcansee !== false
                        && couldSeeCoord(mon.mx, mon.my)
                        && (mon.mx - (game.u?.ux || 0)) ** 2 + (mon.my - (game.u?.uy || 0)) ** 2 <= BOLT_LIM * BOLT_LIM
                        && clearPath(mon.mx, mon.my, game.u?.ux || 0, game.u?.uy || 0)) {
                        const monLevel = mon.m_lev ?? mon.data?.hpLevel ?? mon.data?.mlevel ?? 0;
                        const resistChance = Math.min(19,
                            (game.u?.acurr?.a?.[5] ?? 10) - monLevel + (game.u?.ulevel || 1));
                        if (rnd(20) <= resistChance) {
                            const target = (game.level?.monsters || []).find(other => other !== mon
                                && (other.mhp == null || other.mhp > 0)
                                && Math.max(Math.abs((other.mx || 0) - mon.mx), Math.abs((other.my || 0) - mon.my)) <= 1);
                            if (target) {
                                const hit = (target.data?.mac ?? 7) + (mon.data?.mlevel ?? monLevel) > rnd(20);
                                if (hit) {
                                    const attack = mon.data?.attack || { dice: 1, sides: 2 };
                                    target.mhp = (target.mhp || 1) - d(attack.dice ?? 1, attack.sides ?? 2);
                                }
                                rn2(3);
                                if ((target.mhp || 1) < 1) {
                                    game.level.monsters = (game.level?.monsters || []).filter(other => other !== target);
                                    newsym(target.mx, target.my);
                                }
                                continue;
                            }
                        }
		                    }
                    if (mon.mflee) {
                        const canTeleport = mon.data?.mlet === 'nymph'
                            || ['leprechaun', 'tengu', 'quantum mechanic'].includes(mon.data?.name || '');
		                        const teleportRoll = rn2(40);
		                        if (canTeleport && !game.level?.flags?.noteleport && !teleportRoll) {
		                            const oldX = mon.mx, oldY = mon.my;
		                            let teleported = false;
		                            for (let trycount = 0; trycount < 50; trycount++) {
		                                const x = rnd(COLNO - 1), y = rn2(ROWNO);
		                                const loc = game.level?.at(x, y);
		                                const occupied = (game.level?.monsters || [])
		                                    .some(other => other !== mon && other.mx === x && other.my === y);
		                                const boulder = (game.level?.objects || [])
		                                    .some(obj => obj.otyp === BOULDER && obj.ox === x && obj.oy === y);
		                                const onHero = game.u?.ux === x && game.u?.uy === y;
		                                const badPool = IS_POOL(loc?.typ) && !mon.data?.swimmer;
			                                if (!loc || !ACCESSIBLE(loc.typ) || occupied || boulder || onHero || badPool) continue;
				                                mon.mx = x;
				                                mon.my = y;
					                                clearMonsterTrack(mon);
				                                mon.mux = game.u?.ux ?? x;
				                                mon.muy = game.u?.uy ?? y;
			                                newsym(oldX, oldY);
			                                newsym(x, y);
                                            if (couldSeeCoord(x, y)) {
                                                const du = (x - (game.u?.ux || 0)) ** 2 + (y - (game.u?.uy || 0)) ** 2;
                                                const where = du <= 2 ? ' next to you' : du <= BOLT_LIM * BOLT_LIM ? ' close by' : '';
                                                const shown = addToplineMessage(`${monsterDisplayName(mon)} appears${where}!`);
                                                if (!shown && game._message_more && !game._process_time_with_more) {
                                                    game._monster_resume_index = monIndex + 1;
                                                    game._monster_resume_somebody_can_move = somebodyCanMove;
                                                    return false;
                                                }
                                            }
			                                teleported = true;
			                                break;
			                            }
		                            if (teleported) continue;
		                        }
                    if (!mon.mfleetim && (mon.mhpmax == null || mon.mhp == null || mon.mhp >= mon.mhpmax) && !rn2(25)) mon.mflee = 0;
                    }
                    if (!distfleeckDoneAfterAnger && mon.data?.covetous) {
                        const tacticsRoll = rn2(mon.mflee ? 33 : 5);
                        if (!tacticsRoll) {
                            covetousMonsterNextToHero(mon);
                            if (game._message_more && !game._process_time_with_more) return false;
                        }
                    }
                    if (!distfleeckDoneAfterAnger) rn2(5);
	                    if (!mon.pet && !mon.mpeaceful && !mon.data?.mindless && !mon.data?.nohands && !(mon.m_seenres & M_SEEN_MAGR)) {
                        const targetX = mon.mux ?? game.u?.ux ?? mon.mx;
                        const targetY = mon.muy ?? game.u?.uy ?? mon.my;
                        const linedUp = mon.mx === targetX || mon.my === targetY
                            || Math.abs(mon.mx - targetX) === Math.abs(mon.my - targetY);
                        const strikingWand = linedUp && clearPath(mon.mx, mon.my, targetX, targetY)
                            && (mon.minvent || []).find(item => {
                                const kind = String(item.kind || item.actualKind || '').replace(/^wand:/, '').replace(/^wand of /, '');
                                return (item.otyp === WAN_STRIKING || item.wandIndex === 7 || kind === 'striking')
                                    && (item.spe || 0) > 0;
                            });
                        if (strikingWand) {
                            strikingWand.spe--;
                            rn2(8);
                            const wandIndex = strikingWand.wandIndex ?? 7;
                            const appearance = game._object_descriptions?.wands?.[wandIndex]?.description || 'striking';
                            const wandKnown = strikingWand.known || (game._discoveries || [])
                                .some(entry => entry.section === 'Wands' && entry.name === 'wand of striking');
                            const wandName = wandKnown ? 'wand of striking' : `${appearance} wand`;
                            const article = /^[aeiou]/i.test(wandName) ? 'an' : 'a';
                            const zapMessage = couldSeeCoord(mon.mx, mon.my)
                                ? `${monsterDisplayName(mon)} zaps ${article} ${wandName}!`
                                : 'You hear a nearby zap.';
                            const zapShown = addToplineMessage(zapMessage);
                            if (heroHasAntimagic()) {
                                const shieldMessage = 'Boing!';
                                if (!addToplineMessage(shieldMessage) && !zapShown)
                                    game._topline_after_more = `${zapMessage}  ${shieldMessage}`;
                                const knownBefore = (game._discoveries || [])
                                    .some(entry => entry.section === 'Wands' && entry.name === 'wand of striking');
                                recordWandDiscovery('striking', true);
                                if (!knownBefore) exerciseAttribute(A_WIS, true);
                                for (const witness of game.level?.monsters || []) {
                                    if (witness.mpeaceful || witness.msleeping || witness.mcansee === false) continue;
                                    if (clearPath(witness.mx, witness.my, game.u?.ux || 0, game.u?.uy || 0))
                                        witness.m_seenres = (witness.m_seenres || 0) | M_SEEN_MAGR;
                                }
                            } else if (mon.mwandexp && rnd(20) < 10 + (game.u?.uac ?? 10)) {
                                const hitMessage = 'The wand hits you!';
                                const shown = addToplineMessage(hitMessage);
                                if (!shown && !zapShown) game._topline_after_more = `${zapMessage}  ${hitMessage}`;
                                recordWandDiscovery('striking', true);
                                strikingWand.known = true;
	                                if (shown) {
	                                    game.u.uhp = Math.max(0, (game.u?.uhp || 0) - d(2, 12));
	                                    if ((game.u?.uhp || 0) > 0) exerciseAttribute(A_CON, true);
	                                } else {
                                    game._deferred_wand_hit_after_more = 1;
                                    game._deferred_wand_hit_more_after_more = zapShown ? 1 : 0;
                                    game._deferred_wand_hit_death_taker = mon.isshk && mon.shknam ? mon.shknam : '';
                                }
                            } else {
                                if (!mon.mwandexp) rnd(20);
                                const missMessage = 'The wand misses you.';
                                if (!addToplineMessage(missMessage) && !zapShown)
                                    game._topline_after_more = `${zapMessage}  ${missMessage}`;
                            }
                            mon.mwandexp = true;
                            if (game._message_more) {
                                game._process_time_with_more = 0;
                                game._monster_resume_index = monIndex + 1;
                                game._monster_resume_somebody_can_move = somebodyCanMove;
                                return false;
                            }
                            continue;
                        }
                    }
			                    if (mon.meating) {
                        const targetX = mon.mux ?? game.u?.ux ?? mon.mx;
                        const targetY = mon.muy ?? game.u?.uy ?? mon.my;
                        const nearby = (mon.mx - targetX) ** 2 + (mon.my - targetY) ** 2 <= 2;
                        if (mon.pet && nearby && !mon.mflee && !mon.mconf && !mon.mstun && mon.mcansee !== false
                            && mon.data?.wanderer) rn2(4);
                        mon.meating--;
                        if (mon.meating <= 0) mon.meating = 0;
                        rn2(5);
                        continue;
                    }
                    const miscRange = (mon.mx - (mon.mux ?? game.u?.ux ?? mon.mx)) ** 2
                        + (mon.my - (mon.muy ?? game.u?.uy ?? mon.my)) ** 2;
                    const heroWeapon = (game.inventory || []).some(item =>
                        item.wielded || item.line?.includes('weapon in') || item.line?.includes('wielded in right'));
                    const pendingFumbleMore = game._fumble_turn_message_pending
                        && (game._pending_message || game._message_more);
                    if (((game._message_more && !game._process_time_with_more) || pendingFumbleMore)
                        && heroWeapon && !mon.mpeaceful
                        && (mon.minvent || []).some(item => item.kind === 'bullwhip')) {
                        rn2(5);
                        mon._resume_misc_after_more = 1;
                        game._message_more = 1;
                        game._monster_resume_index = monIndex;
                        game._monster_resume_somebody_can_move = somebodyCanMove;
                        game._monster_resume_same_index = 1;
                        return false;
                    }
                    const wieldedWeapon = (game.inventory || []).find(item =>
                        item.wielded || item.line?.includes('weapon in') || item.line?.includes('wielded in right'));
                    const bullwhip = (mon.minvent || []).find(item => item.kind === 'bullwhip');
                    const adjacentKnownHero = (mon.mux === game.u?.ux && mon.muy === game.u?.uy)
                        && Math.max(Math.abs(mon.mx - (game.u?.ux || 0)), Math.abs(mon.my - (game.u?.uy || 0))) <= 1;
                    if (bullwhip && wieldedWeapon && !mon.mpeaceful
                        && (mon._bullwhip_find_misc_ready || adjacentKnownHero)) {
                        const bullwhipRoll = rn2(5);
                        if (!bullwhipRoll && !adjacentKnownHero) continue;
                        if (bullwhipRoll) {
                            if (mon._bullwhip_find_misc_ready) mon._bullwhip_skip_attack = 1;
                        } else {
                            mon.mw ||= bullwhip;
                            const whereTo = rn2(4);
                            const weaponName = pickupObjectName(wieldedWeapon);
                            const theWeapon = weaponName.startsWith('the ') ? weaponName : `the ${weaponName}`;
                            const hand = /two-handed|quarterstaff|battle-axe/.test(String(wieldedWeapon.kind || ''))
                                ? 'hands' : 'hand';
                            mon._hide_for_bullwhip_more = 1;
                            newsym(mon.mx, mon.my);
                            const whipName = 'A whip';
                            const actor = 'It';
                            let followup = 'The whip slips free.';
                            if (whereTo === 1)
                                followup = `${actor} yanks ${theWeapon} from your ${hand}!`;
                            else if (whereTo === 2)
                                followup = `${actor} yanks ${theWeapon} to the floor!`;
                            else if (whereTo === 3)
                                followup = `${actor} snatches ${theWeapon}!`;
                            game._bullwhip_after_more = { mon, itemLetter: wieldedWeapon.letter, item: wieldedWeapon, whereTo };
                            game._pending_message = `${whipName} wraps around ${theWeapon} you're wielding!`;
                            game._message_more = 1;
                            game._process_time_with_more = 0;
                            game._topline_after_more = followup;
                            game._topline_more_after_more = 1;
                            game._attack_resume_after_more = 1;
                            game._monster_resume_index = monIndex + 1;
                            game._monster_resume_somebody_can_move = somebodyCanMove;
                            return false;
                        }
                    }
                    if (!mon.data?.mindless && !mon.data?.nohands && miscRange <= 36) {
                        const healingPotion = findMonsterHealingPotion(mon);
                        const heroLevel = game.u?.ulevel || 1;
                        const healFraction = heroLevel < 10 ? 5 : heroLevel < 14 ? 4 : 3;
                        const woundedEnough = (mon.mhp || 0) < (mon.mhpmax || 0)
                            && ((mon.mhp || 0) < 10 || (mon.mhp || 0) * healFraction < (mon.mhpmax || 0));
                        if (healingPotion && woundedEnough) {
                            drinkMonsterHealingPotion(mon, healingPotion);
                            rn2(5);
                            if (game._message_more && !game._process_time_with_more) {
                                game._monster_resume_index = monIndex + 1;
                                game._monster_resume_somebody_can_move = somebodyCanMove;
                                return false;
                            }
                            continue;
                        }
                        if (mon.mspeed !== 'fast') {
                            const speedWand = [...(mon.minvent || [])].reverse().find(item => {
                                const kind = String(item.kind || item.actualKind || '').replace(/^wand:/, '').replace(/^wand of /, '');
                                return item.otyp === WAN_SPEED_MONSTER || item.wandIndex === 10 || kind === 'speed monster';
                            });
                            if (speedWand && (speedWand.spe || 0) > 0 && !mon.isgd) {
                                speedWand.spe--;
                                mon.mspeed = 'fast';
                                if (couldSeeCoord(mon.mx, mon.my)) {
                                    addToplineMessage(`${monsterDisplayName(mon)} zaps itself with a wand of speed monster!`);
                                } else {
                                    const range = couldsee(mon.mx, mon.my) ? BOLT_LIM + 1 : BOLT_LIM - 3;
                                    const dist = (mon.mx - (game.u?.ux || 0)) ** 2 + (mon.my - (game.u?.uy || 0)) ** 2;
                                    addToplineMessage(`You hear a ${dist <= range * range ? 'nearby' : 'distant'} zap.`);
                                }
                                if (game._message_more && !game._process_time_with_more) {
                                    game._monster_resume_index = monIndex + 1;
                                    game._monster_resume_somebody_can_move = somebodyCanMove;
                                    return false;
                                }
                                continue;
                            }
                            const speedPotion = [...(mon.minvent || [])].reverse().find(item => {
                                const kind = String(item.kind || '').replace(/^potion:/, '').replace(/^potion of /, '');
                                return item.otyp === POT_SPEED || (item.cls === 'potion' && (item.potionIndex === 5 || kind === 'speed'));
                            });
                            if (speedPotion) {
                                if ((speedPotion.quan || 1) > 1) speedPotion.quan--;
                                else mon.minvent = (mon.minvent || []).filter(item => item !== speedPotion);
                                mon.mspeed = 'fast';
                                addToplineMessage(couldSeeCoord(mon.mx, mon.my)
                                    ? `The ${mon.data?.name || 'creature'} drinks a potion of speed!`
                                    : 'You hear a chugging sound.');
                                if (game._message_more && !game._process_time_with_more) {
                                    game._queued_message_after_topline_more = `The ${mon.data?.name || 'creature'} is suddenly moving faster.`;
                                    game._topline_more_after_more = 1;
                                    game._monster_resume_index = monIndex + 1;
                                    game._monster_resume_somebody_can_move = somebodyCanMove;
                                    return false;
                                }
                                continue;
                            }
                        }
                    }
                }
                if (!resumingPetInventory && !resumedAfterPreturn && maybeDemonicBlackmailFalseImage(mon)) {
                    if (game._message_more && !game._process_time_with_more) {
                        game._monster_resume_index = monIndex + 1;
                        game._monster_resume_somebody_can_move = somebodyCanMove;
                        return false;
                    }
                    continue;
                }
                if (!resumingPetInventory && !resumedAfterPreturn)
                    maybeDemonicBlackmailTrueTargetArtifact(mon);
                if (!resumingPetInventory && !resumedAfterPreturn
                    && maybeDemonicBlackmailTrueTargetDemonPolyself(mon)) {
                    if (game._message_more && !game._process_time_with_more) {
                        game._monster_resume_index = monIndex + 1;
                        game._monster_resume_somebody_can_move = somebodyCanMove;
                        return false;
                    }
                    continue;
                }
                if (!resumingPetInventory && !resumedAfterPreturn)
                    maybeDemonicBlackmailTrueTargetNoGold(mon);
                if (!resumingPetInventory && !resumedAfterPreturn
                    && maybeDemonicBlackmailTrueTargetDemand(mon, monIndex, somebodyCanMove))
                    return false;
                if (resumedAfterPreturn) resumeAfterPreturn = false;
                if (!resumingPetInventory && !resumedAfterPreturn && maybeKillerBeeEatRoyalJelly(mon)) {
                    if (game._message_more && !game._process_time_with_more) {
                        game._monster_resume_index = monIndex + 1;
                        game._monster_resume_somebody_can_move = somebodyCanMove;
                        return false;
                    }
                    continue;
                }
                if (!resumingPetInventory && !resumedAfterPreturn && gelatinousCubeDigestInventory(mon)) {
                    if (game._message_more && !game._process_time_with_more) {
                        game._monster_resume_index = monIndex + 1;
                        game._monster_resume_somebody_can_move = somebodyCanMove;
                        return false;
                    }
                    continue;
                }
                if (mon.pet) {
                    if (resumingPetInventory) {
                        game._pet_inventory_resume = null;
                        movePet(mon, true, conflictActive);
                    } else {
                        movePet(mon, false, conflictActive);
                    }
                    const stopPetRepeat = game._pet_kill_no_repeat;
                    if (stopPetRepeat) game._pet_kill_no_repeat = 0;
                    const skipPostMoveRoll = game._pet_skip_post_move_roll;
                    game._pet_skip_post_move_roll = 0;
                    const pausingForMore = game._message_more && !game._process_time_with_more;
                    const delayPostMove = pausingForMore
                        && (game._queued_dead_monsters?.length || game._command_mode === 'ponySecondAttackMore' || mon.saddled
                            || game._pet_message_resume || game._pet_inventory_resume === mon);
		                    if (!delayPostMove && !stopPetRepeat && !skipPostMoveRoll) {
		                        rn2(5);
		                    }
                    if (pausingForMore) {
                        if (game._pet_inventory_resume === mon) {
                            game._monster_resume_index = monIndex;
                            game._monster_resume_somebody_can_move = somebodyCanMove;
                            game._monster_resume_same_index = 1;
                            game._monster_resume_after_preturn = 1;
                        } else if (game._pet_message_resume) {
                            const resumeSamePet = game._pet_message_resume.kind === 'hit';
                            game._monster_resume_index = monIndex + (resumeSamePet ? 0 : 1);
                            game._monster_resume_somebody_can_move = somebodyCanMove;
                            game._monster_resume_same_index = resumeSamePet ? 1 : 0;
                        } else if (game._queued_dead_monsters?.length) {
                            game._monster_resume_index = monIndex + 1;
                            game._monster_resume_somebody_can_move = somebodyCanMove;
                        } else if (!delayPostMove) {
                            game._monster_resume_index = monIndex + 1;
                            game._monster_resume_somebody_can_move = somebodyCanMove;
                        }
                        return false;
                    }
                } else if ((mon.data?.mmove ?? NORMAL_SPEED) > 0) {
                    const apparentX = mon.mux ?? game.u?.ux ?? 0;
                    const apparentY = mon.muy ?? game.u?.uy ?? 0;
                    const gridBugDiagonal = mon.data?.name === 'grid bug' && mon.mx !== apparentX && mon.my !== apparentY;
                    const skipBullwhipAttack = !!mon._bullwhip_skip_attack;
                    mon._bullwhip_skip_attack = 0;
                    const attackData = mon.data || {};
                    const noStandardAttack = attackData.noattacks
                        || attackData.name === 'gas spore'
                        || attackData.name === 'kobold shaman'
                        || attackData.name === 'shrieker';
                    if (attackData.name === 'kobold shaman' && game.u?.blind
                        && Math.max(Math.abs(mon.mx - (game.u?.ux ?? 0)), Math.abs(mon.my - (game.u?.uy ?? 0))) <= 1) {
                        const loc = game.level?.at(mon.mx, mon.my);
                        if (loc) loc.map_invisible = true;
                        newsym(mon.mx, mon.my);
                    }
                    const adjacentHostile = !skipBullwhipAttack
                        && !mon.mpeaceful
                        && !mon.mflee
                        && !noStandardAttack
                        && Math.max(Math.abs(mon.mx - apparentX), Math.abs(mon.my - apparentY)) <= 1
                        && !gridBugDiagonal;
                    const nearby = (mon.mx - apparentX) ** 2 + (mon.my - apparentY) ** 2 < 3
                        && !gridBugDiagonal;
                    if (adjacentHostile && game._pet_return_attack_resumed) {
                        game._pet_return_attack_resumed = 0;
                        rn2(5);
                    }
                    const wandererMovesInstead = nearby && mon.data?.wanderer && !rn2(4);
                    const wandererCanMoveInstead = wandererMovesInstead && monsterHasNonHeroMove(mon, conflictActive);
		                    if (adjacentHostile && !wandererCanMoveInstead) {
	                        const data = mon.data || {};
                        const name = data.name || 'creature';
                        const foundYou = apparentX === (game.u?.ux ?? 0) && apparentY === (game.u?.uy ?? 0);
                        if (foundYou && maybeBlockInvulnerableAttack(mon)) {
                            if (game._message_more && !game._process_time_with_more) return false;
                            continue;
                        }
                        if (name === 'water demon') {
                            const subject = 'The water demon';
                            const dagger = mon.mw || mon.minvent?.find(item => item.kind === 'dagger');
                            const justWielded = !mon.mw && dagger;
                            if (justWielded) {
                                mon.mw = dagger;
                                const stack = (dagger.quan || 1) === 1 ? 'a dagger' : `${dagger.quan} daggers`;
                                addToplineMessage(`${subject} wields ${stack}!`);
                            }
                            rn2(16);
                            if (!justWielded && mon.mw) {
                                rnd(20);
                                game.u.uhp = Math.max(0, (game.u?.uhp || 0) - d(1, 3) - rnd(4));
                                addToplineMessage(`${subject} thrusts one of his daggers.`);
                                rn2(3);
                                rn2(6);
                            }
                            rnd(justWielded ? 21 : 21);
                            const hitDamage = d(1, 3);
                            const hitShown = addToplineMessage(`${subject} hits!`);
                            if (!justWielded) {
                                game._damage_after_topline_more = (game._damage_after_topline_more || 0) + hitDamage;
                                game._knockback_after_topline_more = 1;
                                game._topline_after_more = `${subject} hits!`;
                                game._message_more = 1;
                                game._process_time_with_more = 0;
                            } else if (hitShown && !game._message_more) {
                                game.u.uhp = Math.max(0, (game.u?.uhp || 0) - hitDamage);
                            } else {
                                game._damage_after_topline_more = (game._damage_after_topline_more || 0) + hitDamage;
                            }
                            if (justWielded) {
                                rn2(3);
                                rn2(6);
                                rnd(22);
                                const biteDamage = d(1, 3);
                                const biteShown = addToplineMessage(`${subject} bites!`);
                                if (biteShown && !game._message_more) game.u.uhp = Math.max(0, (game.u?.uhp || 0) - biteDamage);
                                else {
                                    game._damage_after_topline_more = (game._damage_after_topline_more || 0) + biteDamage;
                                    game._knockback_after_topline_more = 1;
                                }
                            }
                            if ((game.u?.uhp || 0) <= 0) {
                                game._death_cause = 'killed by a water demon';
                                game._death_current_move = 1;
                                game._death_moves = game.moves || 1;
                                game._queued_message_after_more = 'You die...';
                                game._message_more = 1;
                            }
                            if (game._message_more && !game._process_time_with_more) return false;
                            continue;
                        }
                        const bites = data.nohands || ['jackal', 'fox', 'coyote', 'dog', 'wolf', 'kitten', 'cat'].some(kind => name.includes(kind));
                        const attackLoc = game.level?.at(mon.mx, mon.my);
                        const monsterInSight = !game.u?.blind && !mon.minvis && !mon.mundetected
                            && !!(game.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT);
                        if (attackLoc?.map_invisible && monsterInSight && !mon._hide_for_bullwhip_more) {
                            attackLoc.map_invisible = false;
                            if (attackLoc.remembered_glyph?.ch === 'I') attackLoc.remembered_glyph = null;
                        }
                        const hiddenBullwhip = !!mon._hide_for_bullwhip_more
                            || (!!attackLoc?.map_invisible && !monsterInSight);
                        const bullwhipHiddenAttack = !!mon._hide_for_bullwhip_more;
                        const subject = game.u?.blind || hiddenBullwhip ? 'It' : monsterDisplayName(mon);
                        if (game.u?.blind && !hiddenBullwhip) {
                            if (attackLoc) attackLoc.map_invisible = true;
                            newsym(mon.mx, mon.my);
                        }
                        const weapon = mon.mw || mon.minvent?.find(item =>
                            item.otyp === ORCISH_DAGGER || item.kind === 'orcish dagger' || item.kind === 'dagger');
                        if (!mon.mw && weapon) {
                            mon.mw = weapon;
                            const stack = (weapon.quan || 1) === 1
                                ? (weapon.kind === 'orcish dagger' || weapon.otyp === ORCISH_DAGGER ? 'a crude dagger' : `a ${weapon.kind || 'weapon'}`)
                                : `${weapon.quan} ${weapon.kind === 'orcish dagger' || weapon.otyp === ORCISH_DAGGER ? 'crude daggers' : `${weapon.kind || 'weapon'}s`}`;
                            recordWeaponDiscoveryForItem(weapon, monsterInSight && !hiddenBullwhip);
                            addToplineMessage(`${subject} wields ${stack}!`);
                            if (game._message_more && !game._process_time_with_more) return false;
                            continue;
                        }
                        const hiddenForcedWeapon = hiddenBullwhip && !game.u?.blind;
                        if (hiddenForcedWeapon) rn2(3);
                        let attack = hiddenForcedWeapon ? { dice: 2, sides: 4, verb: 'hits' }
                            : mon.isshk ? { dice: 4, sides: 4, verb: 'hits' }
                            : data.attack || (name === 'bat' ? { dice: 1, sides: 4, verb: 'bites' }
                            : data.mlet === 'B' ? { dice: 1, sides: 6, verb: 'bites' }
                            : bites ? { dice: 1, sides: 2, verb: 'bites' } : { dice: 1, sides: 4, verb: 'hits' });
                        if (mon.mspec_used && (attack.aatyp === 'engl' || attack.aatyp === 'hugs'
                            || attack.adtyp === 'stck' || attack.adtyp === 'poly')) {
                            const elemental = ['acid', 'elec', 'cold', 'fire'].includes(attack.adtyp);
                            attack = {
                                ...attack,
                                aatyp: elemental ? 'tuch' : 'claw',
                                adtyp: elemental ? attack.adtyp : 'phys',
                                dice: 1,
                                sides: 6,
                                verb: elemental ? 'touches you' : 'hits',
                            };
                        }
                        const swallowedEngulf = game.u?.uswallow && mon === game.u?.ustuck
                            && normalizedAttackCode(attack.aatyp) === 'engl';
                        const targetAc = game.u?.uac ?? 10;
                        let acValue = targetAc;
                        const occupationToHitBonus = game._armor_wear_occupation || game._eating_turns_remaining
                            || game._force_lock_occupation || game._pick_lock_occupation || game._pick_dig_occupation || game._tin_opening_occupation
                            || game._prayer_occupation ? 4 : 0;
                        const attackLevel = mon.m_lev ?? data.hpLevel ?? data.mlevel ?? 0;
		                        let toHit = Math.max(1, acValue + 10 + attackLevel
                                + occupationToHitBonus
	                            + (mon.mstun ? -2 : 0) + (mon.mtrapped ? -2 : 0));
                        const activeWeapon = mon.mw || mon.minvent?.find(item => item.kind === 'bow');
                        const pendingBeforeAttack = game._pending_message || '';
                        const travelFinishPending = !!game._travel_finish_message;
                        const travelFinishOnlyPending = travelFinishPending
                            && pendingBeforeAttack === game._travel_finish_message;
                        const pendingWandHitMessage = /\bzaps .+ wand!  Boing!$/.test(pendingBeforeAttack);
                        const pendingHeroMeleeMessage = /^You (?:hit|miss|attack|kill|destroy) /.test(pendingBeforeAttack);
                        const weaponPrefix = activeWeapon && !hiddenBullwhip && activeWeapon.kind !== 'bullwhip'
                            ? `${subject} ${activeWeapon.kind === 'bow' ? 'swings' : 'thrusts'} ${mon.female ? 'her' : 'his'} ${
                                activeWeapon.kind === 'orcish dagger' || activeWeapon.otyp === ORCISH_DAGGER
                                    ? 'crude dagger' : activeWeapon.kind || 'weapon'
                            }.  `
                            : '';
                        if (Array.isArray(data.attacks) && data.attacks.length
                            && (!hiddenBullwhip || game.u?.blind) && !activeWeapon) {
                            if (targetAc < 0) {
                                acValue = -rnd(-targetAc);
                                toHit = Math.max(1, acValue + 10 + attackLevel
                                    + occupationToHitBonus
                                    + (mon.mstun ? -2 : 0) + (mon.mtrapped ? -2 : 0));
                            }
	                            if (!data.mindless && !data.nohands && !mon.mpeaceful)
	                                monsterLinedUp(mon, apparentX, apparentY);
		                        if (!foundYou) continue;
		                            if (game._topline_after_more) {
		                                game._attack_resume_after_more = 1;
		                                game._message_more = 1;
	                                game._process_time_with_more = 0;
	                                game._monster_resume_index = monIndex;
		                                game._monster_resume_somebody_can_move = somebodyCanMove;
		                                return false;
		                            }
		                            if (game._pet_combat_more_before_monster_attack && pendingBeforeAttack
		                                && game._message_more && game._process_time_with_more) {
		                                game._pet_combat_more_before_monster_attack = 0;
		                                game._pet_return_attack_after_more = null;
		                                game._attack_resume_after_more = 1;
		                                game._message_more = 1;
		                                game._process_time_with_more = 0;
		                                game._monster_resume_index = monIndex;
		                                game._monster_resume_same_index = 1;
		                                game._monster_resume_after_preturn = 1;
		                                game._monster_resume_somebody_can_move = somebodyCanMove;
		                                mon._distfleeck_done_after_anger = 1;
		                                return false;
		                            }
	                            if (pendingBeforeAttack && game._counted_repeat_interruptible
	                                && /^You hear /.test(pendingBeforeAttack)) {
	                                mon._deferred_multi_attack_roll_after_more = rnd(20);
	                                mon._distfleeck_done_after_anger = 1;
	                                game._attack_resume_after_more = 1;
	                                game._message_more = 1;
	                                game._process_time_with_more = 0;
	                                game._pending_time_passed = 1;
	                                game._resume_time_after_more = 1;
	                                game._counted_repeat_interruptible = 0;
	                                game._deferred_counted_repeat_stop_waiting = 1;
	                                game._monster_resume_index = monIndex;
	                                game._monster_resume_same_index = 1;
	                                game._monster_resume_after_preturn = 1;
	                                game._monster_resume_somebody_can_move = somebodyCanMove;
	                                return false;
	                            }
			                            if (travelFinishPending) {
			                                if (travelFinishOnlyPending) game._pending_message = '';
			                                game._travel_finish_message = '';
                                game._travel_keep_message = '';
                            }
                            const deferMultiAttack = !!pendingBeforeAttack && !pendingHeroMeleeMessage;
	                            const multiMessages = [];
	                            let showedAttack = false;
                            const countedRepeatActive = !!game._counted_repeat_interruptible;
                            let stoppedCountedRepeat = false;
	                            const attackCount = deferMultiAttack ? 1 : data.attacks.length;
	                            let deferredMultiAttack = null;
		                            for (let attackIndex = 0; attackIndex < attackCount; attackIndex++) {
		                                const multiAttack = data.attacks[attackIndex];
		                                const deferredAttackRoll = attackIndex === 0
		                                    ? mon._deferred_multi_attack_roll_after_more : null;
		                                if (attackIndex === 0) mon._deferred_multi_attack_roll_after_more = null;
		                                const attackRoll = deferredAttackRoll ?? rnd(20 + attackIndex);
                                    const shownSubject = game.u?.blind || hiddenBullwhip ? 'It' : monsterDisplayName(mon, true);
	                                if (toHit <= attackRoll) {
	                                    const missMessage = `${shownSubject} ${toHit === attackRoll && game.flags?.verbose !== false ? 'just ' : ''}misses!`;
	                                    if (deferMultiAttack) {
	                                        multiMessages.push(missMessage);
	                                        deferredMultiAttack = { first: { hit: false, message: missMessage }, attacks: data.attacks.slice(attackIndex + 1), nextIndex: attackIndex + 1, toHit, subject, name };
	                                        continue;
	                                    }
                                    if (!game._suppress_monster_attack_messages) {
                                        const missShown = addToplineMessage(missMessage);
                                        showedAttack = showedAttack || missShown;
                                        if (missShown && countedRepeatActive && !stoppedCountedRepeat) {
                                            game._pending_time_passed = 0;
                                            game._skip_pending_time_decrement = 1;
                                            game._search_pending_count = 0;
                                            game._counted_repeat_interruptible = 0;
                                            addToplineMessage('You stop waiting.');
                                            stoppedCountedRepeat = true;
                                        }
                                    }
                                    continue;
                                }

	                                let damage = d(multiAttack.dice ?? 1, multiAttack.sides ?? 2);
	                                const hitMessage = `${shownSubject} ${multiAttack.verb || 'hits'}!`;
	                                if (deferMultiAttack) {
	                                    multiMessages.push(hitMessage);
	                                    deferredMultiAttack = { first: { hit: true, damage, message: hitMessage }, attacks: data.attacks.slice(attackIndex + 1), nextIndex: attackIndex + 1, toHit, subject, name };
	                                    continue;
	                                }
	                                rn2(3);
	                                rn2(6);
	                                if (damage && (game.u?.uac ?? 10) < 0)
	                                    damage = Math.max(1, damage - rnd(-(game.u?.uac ?? 10)));
                                const hpBeforeDamage = game.u?.uhp || 0;
                                if (game._suppress_monster_attack_messages) {
                                    game.u.uhp = Math.max(0, hpBeforeDamage - damage);
                                } else {
                                    const hitShown = addToplineMessage(hitMessage);
                                    showedAttack = showedAttack || hitShown;
                                    if (hitShown && countedRepeatActive && !stoppedCountedRepeat) {
                                        game._pending_time_passed = 0;
                                        game._skip_pending_time_decrement = 1;
                                        game._search_pending_count = 0;
                                        game._counted_repeat_interruptible = 0;
                                        addToplineMessage('You stop waiting.');
                                        stoppedCountedRepeat = true;
                                    }
                                    game.u.uhp = Math.max(0, hpBeforeDamage - damage);
                                }
                                if ((game.u?.uhp || 0) <= 0) {
                                    const article = /^[aeiou]/i.test(name) ? 'an' : 'a';
                                    game._death_cause = `killed by ${article} ${name}`;
                                    game._death_current_move = !!game._pending_time_passed;
                                    game._queued_message_after_more = 'You die...';
                                    game._message_more = 1;
                                    break;
                                }
                            }
	                            if (deferMultiAttack) {
	                                if (multiMessages.length)
	                                    game._topline_after_more = multiMessages.join('  ');
	                                game._topline_more_after_more = multiMessages.length ? 1 : 0;
	                                game._attack_resume_after_more = 1;
	                                if (deferredMultiAttack) game._deferred_multiattack_after_more = deferredMultiAttack;
	                                game._message_more = 1;
                                game._process_time_with_more = 0;
                                game._monster_resume_index = monIndex + 1;
                                game._monster_resume_somebody_can_move = somebodyCanMove;
                                return false;
                            }
                            if (showedAttack && data.attacks.length > 1
                                && !game._message_more && !stoppedCountedRepeat && !pendingHeroMeleeMessage) {
                                game._message_more = 1;
                                game._process_time_with_more = 0;
                                game._monster_resume_index = monIndex + 1;
                                game._monster_resume_somebody_can_move = somebodyCanMove;
                                return false;
                            }
                            if (game._message_more && !game._process_time_with_more) return false;
                            continue;
                        }
                        let attackShown = true;
                        let continuedAfterImmediateSting = false;
                        let deferHitEffects = false;
                        if (targetAc < 0) {
                            acValue = -rnd(-targetAc);
                            toHit = Math.max(1, acValue + 10 + attackLevel
                                + occupationToHitBonus
                                + (mon.mstun ? -2 : 0) + (mon.mtrapped ? -2 : 0));
	                            if (/^A mysterious force prevents .* from teleporting!$/.test(pendingBeforeAttack || '')) {
	                                if (!foundYou && game._has_displacement && !game._suppress_monster_attack_messages
	                                    && !game._escape_dismissed_more_this_command) {
	                                    const shownSubject = game.u?.blind || hiddenBullwhip ? 'It' : monsterDisplayName(mon, true);
	                                    const invisible = game.u?.invisible ? 'invisible ' : '';
	                                    game._topline_after_more = `${shownSubject} strikes at your ${invisible}displaced image and misses you!`;
	                                    game._topline_more_after_more = 1;
	                                    game._attack_resume_after_more = 1;
	                                    game._monster_resume_index = monIndex + 1;
	                                    game._monster_resume_somebody_can_move = somebodyCanMove;
	                                } else {
	                                    game._monster_resume_index = monIndex + 1;
	                                    game._monster_resume_somebody_can_move = somebodyCanMove;
	                                }
	                                game._message_more = 1;
	                                game._process_time_with_more = 0;
	                                return false;
	                            }
                        }
		                        if (!data.mindless && !data.nohands && !mon.mpeaceful)
		                            monsterLinedUp(mon, apparentX, apparentY);
	                        if (!foundYou) continue;
		                        if (game._pet_combat_more_before_monster_attack && pendingBeforeAttack
		                            && game._message_more && game._process_time_with_more) {
		                            game._pet_combat_more_before_monster_attack = 0;
		                            game._pet_return_attack_after_more = null;
		                            game._attack_resume_after_more = 1;
		                            game._message_more = 1;
		                            game._process_time_with_more = 0;
		                            game._monster_resume_index = monIndex;
		                            game._monster_resume_same_index = 1;
		                            game._monster_resume_after_preturn = 1;
		                            game._monster_resume_somebody_can_move = somebodyCanMove;
		                            mon._distfleeck_done_after_anger = 1;
		                            return false;
		                        }
	                            if (pendingBeforeAttack && game._counted_repeat_interruptible
	                                && /^You hear /.test(pendingBeforeAttack)) {
	                                mon._deferred_attack_roll_after_more = swallowedEngulf ? 0 : rnd(20);
	                                mon._distfleeck_done_after_anger = 1;
	                                game._attack_resume_after_more = 1;
	                                game._message_more = 1;
                                game._process_time_with_more = 0;
	                                game._pending_time_passed = 1;
	                                game._resume_time_after_more = 1;
	                                game._counted_repeat_interruptible = 0;
	                                game._deferred_counted_repeat_stop_waiting = 1;
	                                game._monster_resume_index = monIndex;
	                                game._monster_resume_same_index = 1;
	                                game._monster_resume_after_preturn = 1;
	                                game._monster_resume_somebody_can_move = somebodyCanMove;
	                                return false;
	                            }
                            let revealedHiderBeforeAttack = false;
                            const attackerLoc = game.level?.at(mon.mx, mon.my);
                            if ((mon.mundetected && monsterUsesPostMoveHide(mon))
                                || (game.u?.blind && attackerLoc?.map_invisible && monsterUsesPostMoveHide(mon))) {
                                mon.mundetected = false;
                                addToplineMessage('Something was hidden under something!');
                                newsym(mon.mx, mon.my);
                                revealedHiderBeforeAttack = true;
                            }
						                        const deferredAttackRoll = mon._deferred_attack_roll_after_more;
	                        mon._deferred_attack_roll_after_more = null;
						                        const attackRoll = swallowedEngulf ? 0 : (deferredAttackRoll ?? rnd(20));
		                        if (!swallowedEngulf && toHit <= attackRoll) {
	                            if (game._suppress_monster_attack_messages) attackShown = false;
	                            else {
                                    if (travelFinishPending) {
                                        if (travelFinishOnlyPending) game._pending_message = '';
                                        game._travel_finish_message = '';
                                        game._travel_keep_message = '';
                                    }
                                    const shownSubject = game.u?.blind || hiddenBullwhip ? 'It' : monsterDisplayName(mon, true);
                                    const shownWeaponPrefix = weaponPrefix ? weaponPrefix.replace(subject, shownSubject) : '';
                                    attackShown = addToplineMessage(`${shownWeaponPrefix}${shownSubject} ${toHit === attackRoll && game.flags?.verbose !== false ? 'just ' : ''}misses!`);
                                    if (attackShown && pendingWandHitMessage) {
                                        game._message_more = 1;
                                        game._process_time_with_more = 0;
                                        game._monster_resume_index = monIndex + 1;
                                        game._monster_resume_somebody_can_move = somebodyCanMove;
                                    }
                                }
	                            if (activeWeapon && !hiddenBullwhip) {
			                game._message_more = 1;
			                game._process_time_with_more = 0;
			                game._monster_resume_index = monIndex + 1;
			                game._monster_resume_somebody_can_move = somebodyCanMove;
			            }
	                        } else {
	                                if (normalizedAttackCode(attack.aatyp) === 'engl') {
	                                    const damage = d(attack.dice ?? 1, attack.sides ?? 2);
                                        const digestAttack = isDigestEngulfAttack(attack);
	                                    if (!game.u?.uswallow) {
	                                        const swallowLevel = mon.m_lev ?? data.hpLevel ?? data.mlevel ?? 1;
	                                        game._swallow_after_more = {
	                                            mon,
	                                            damage,
	                                            coldCheck: attack.adtyp === 'cold' && !mon.mcan,
                                                digestAttack,
	                                            swallowLevel,
	                                            resumeIndex: monIndex + 1,
	                                            somebodyCanMove,
	                                        };
			                                    } else {
			                                        swallowedEngulferActed = true;
			                                        swallowedEngulferActedThisTurn = true;
			                                        if ((game.u.uswldtim || 0) > 0) game.u.uswldtim--;
                                            let slowDigestRegurgitation = false;
                                            if (digestAttack) {
                                                if (heroHasSlowDigestion()) {
                                                    slowDigestRegurgitation = true;
                                                    game.u.uswldtim = 0;
                                                    if ((game.u.uac ?? 10) < 0)
                                                        game.u.uhp = Math.max(0, (game.u?.uhp || 0) - 1);
                                                } else if ((game.u.uswldtim || 0) <= 0) {
                                                    addToplineMessage(`${monsterDisplayName(mon)} totally digests you!`);
                                                    game.u.uhp = 0;
                                                    game._death_cause = `killed by ${/^[aeiou]/i.test(data.name || '') ? 'an' : 'a'} ${data.name || 'monster'}`;
                                                    game._death_current_move = true;
                                                    game._queued_message_after_more = 'You die...';
                                                    game._message_more = 1;
                                                    game._process_time_with_more = 0;
                                                    return false;
                                                } else {
                                                    const adverb = game.u.uswldtim === 2 ? ' thoroughly'
                                                        : game.u.uswldtim === 1 ? ' utterly' : '';
                                                    addToplineMessage(`${monsterDisplayName(mon)}${adverb} digests you!`);
                                                    game.u.uhp = Math.max(0, (game.u?.uhp || 0) - damage);
                                                }
                                            }
			                                        const coldHits = attack.adtyp === 'cold' && !mon.mcan && rn2(2);
			                                        if (coldHits) {
		                                            if (game._command_mode === 'swallowColdMore')
		                                                continue;
		                                            if (/^[a-zA-Z] - .*\(being worn\)\.$/.test(game._pending_message || ''))
		                                                continue;
		                                            const swallowOverlayActive = !!game._swallow_overlay_active;
	                                            if (swallowOverlayActive) game._swallow_overlay_active = 0;
	                                            addToplineMessage('You are freezing to death!');
	                                            if (swallowOverlayActive) game._swallow_overlay_active = 1;
	                                            if (swallowOverlayActive) {
	                                                const prompt = game._message_more && game._pending_message
	                                                    ? `${game._pending_message}--More--` : game._pending_message || '';
	                                                if (game._overlay_lines?.length) game._overlay_lines[0] = [0, 0, prompt];
	                                                const disp = game.nhDisplay;
	                                                if (disp?.setCell) {
	                                                    disp.clearRow?.(0);
	                                                    for (let i = 0; i < prompt.length; i++)
	                                                        disp.setCell(i, 0, prompt[i], NO_COLOR, 0);
	                                                }
	                                            }
	                                            const armorFinishQueued = game._queued_message_after_more === 'You finish your dressing maneuver.';
	                                            game.u.uhp = Math.max(0, (game.u?.uhp || 0) - (armorFinishQueued ? Math.max(1, damage - 1) : damage));
	                                            const coldRepeats = (game._pending_message.match(/You are freezing to death!/g) || []).length;
	                                            if (coldRepeats > 1) {
	                                                game._message_more = 1;
	                                                game._command_mode = 'swallowColdMore';
	                                                game._swallow_cold_more_allows_tail = 1;
	                                                game._suppress_more_time_once = (game._suppress_more_time_once || 0) + 1;
	                                            }
	                                            if (swallowOverlayActive && coldRepeats > 1) {
	                                                const prompt = `${game._pending_message}--More--`;
	                                                if (game._overlay_lines?.length) game._overlay_lines[0] = [0, 0, prompt];
	                                                const disp = game.nhDisplay;
	                                                if (disp?.setCell) {
	                                                    disp.clearRow?.(0);
	                                                    for (let i = 0; i < prompt.length; i++)
	                                                        disp.setCell(i, 0, prompt[i], NO_COLOR, 0);
	                                                }
	                                            }
	                                            if (game._message_more && !game._process_time_with_more && !game._swallow_cold_more_allows_tail) {
	                                                game._command_mode = 'swallowColdMore';
	                                                return false;
	                                            }
	                                        }
				                                        if ((game.u.uswldtim || 0) <= 0) {
                                            const expelMessage = digestAttack
                                                ? `You get regurgitated!  ${digestTasteMessage(mon)}`
                                                : 'You get expelled!';
		                                            const width = game.nhDisplay?.cols || 80;
                                            if (game._pending_message
                                                && game._pending_message.length + expelMessage.length + 3 < width - 8) {
                                                game._pending_message = `${game._pending_message}  ${expelMessage}`;
                                            } else if (game._pending_message) {
                                                game._queued_message_after_more = expelMessage;
                                                game._queued_message_more_after_more = 1;
                                            } else {
                                                game._pending_message = expelMessage;
                                            }
                                            game._keep_pending_message = 1;
                                            game._message_more = 1;
                                            game._process_time_with_more = 0;
                                            if (slowDigestRegurgitation)
                                                await finishSwallowExpel(mon);
                                            else
                                                game._swallow_expel_after_more = { mon };
                                            game._monster_resume_index = monIndex + 1;
                                            game._monster_resume_somebody_can_move = somebodyCanMove;
                                            const prompt = `${game._pending_message || ''}--More--`;
                                            if (game._swallow_overlay_before_command?.length)
                                                game._overlay_lines = game._swallow_overlay_before_command.map(line => [...line]);
                                            if (game._overlay_lines?.length) game._overlay_lines[0] = [0, 0, prompt];
                                            const disp = game.nhDisplay;
		                                            if (disp?.setCell) {
		                                                disp.clearRow?.(0);
		                                                for (let i = 0; i < prompt.length; i++)
		                                                    disp.setCell(i, 0, prompt[i], NO_COLOR, 0);
		                                            }
		                                            return false;
		                                        }
		                                        continue;
		                                    }
	                                    if (travelFinishPending) {
	                                        if (travelFinishOnlyPending) game._pending_message = '';
	                                        game._travel_finish_message = '';
                                        game._travel_keep_message = '';
                                    }
                                    const shownSubject = game.u?.blind || hiddenBullwhip ? 'It' : monsterDisplayName(mon, true);
                                    attackShown = game._suppress_monster_attack_messages
                                        ? false
                                        : addToplineMessage(`${shownSubject} ${attack.verb || 'engulfs you'}!`);
                                    if (attackShown) {
                                        game._message_more = 1;
                                        game._process_time_with_more = 0;
                                        game._monster_resume_index = monIndex + 1;
                                        game._monster_resume_somebody_can_move = somebodyCanMove;
                                        return false;
                                    }
                                    game._topline_more_after_more = 1;
                                    game._attack_resume_after_more = 1;
                                    game._message_more = 1;
                                    game._process_time_with_more = 0;
                                    game._monster_resume_index = monIndex + 1;
                                    game._monster_resume_somebody_can_move = somebodyCanMove;
                                    return false;
                                }
	                            let damage = d(attack.dice ?? 1, attack.sides ?? 2);
		                            if (activeWeapon?.kind === 'orcish dagger' || activeWeapon?.otyp === ORCISH_DAGGER) damage += rnd(3);
		                            else if (activeWeapon?.kind === 'dagger') damage += rnd(4);
		                            else if (activeWeapon?.kind === 'bow') damage += rnd(2);
		                            else if (activeWeapon?.kind === 'bullwhip') damage += rnd(2);
		                            const hpBeforeDamage = game.u?.uhp || 0;
                                    if (attack.adtyp === 'cold' && pendingBeforeAttack && !game._suppress_monster_attack_messages) {
                                        if (travelFinishPending) {
                                            if (travelFinishOnlyPending) game._pending_message = '';
                                            game._travel_finish_message = '';
                                            game._travel_keep_message = '';
                                        }
                                        const shownSubject = game.u?.blind || hiddenBullwhip ? 'It' : monsterDisplayName(mon, true);
                                        const shownWeaponPrefix = weaponPrefix ? weaponPrefix.replace(subject, shownSubject) : '';
                                        const attackMessage = `${shownWeaponPrefix}${shownSubject} ${attack.verb || 'hits'}!`;
                                        const attackShown = addToplineMessage(attackMessage);
                                        const magicNegation = (game.inventory || []).reduce((best, item) =>
                                            item.worn ? Math.max(best, ARMOR_MAGIC_NEGATION[item.kind] || 0) : best, 0);
                                        if (!attackShown) {
                                            game._cold_effect_after_topline_more = {
                                                damage,
                                                level: mon.m_lev ?? data.hpLevel ?? data.mlevel ?? 0,
                                                magicNegation,
                                            };
                                            game._attack_resume_after_more = 1;
                                            game._hallu_display_after_cold_topline = 1;
                                            game._monster_resume_index = monIndex + 1;
                                            game._monster_resume_somebody_can_move = somebodyCanMove;
                                            return false;
                                        }
                                        const coldNegated = rn2(10) < 3 * magicNegation;
                                        if (!coldNegated) {
                                            const frostMessage = "You're covered in frost!";
                                            const width = game.nhDisplay?.cols || 80;
                                            if (attackShown && (game._pending_message || '').length + frostMessage.length + 3 >= width - 8) {
                                                game._topline_after_more = frostMessage;
                                                game._cold_destroy_after_topline_more = mon.m_lev ?? data.hpLevel ?? data.mlevel ?? 0;
                                                game._attack_resume_after_more = 1;
                                                game._hallu_display_after_cold_topline = 1;
                                                game._damage_after_topline_more = (game._damage_after_topline_more || 0) + damage;
                                                game._damage_after_topline_more_needs_ac = 1;
                                                game._knockback_after_topline_more = 1;
                                                game._message_more = 1;
                                                game._process_time_with_more = 0;
                                                game._monster_resume_index = monIndex + 1;
                                                game._monster_resume_somebody_can_move = somebodyCanMove;
                                                return false;
                                            }
                                            if (attackShown) addToplineMessage(frostMessage);
                                            const coldDestroyRoll = rn2(20);
                                            if ((mon.m_lev ?? data.hpLevel ?? data.mlevel ?? 0) > coldDestroyRoll)
                                                rn2(5);
                                        } else {
                                            damage = 0;
                                        }
                                        rn2(3);
                                        rn2(6);
                                        if (damage && (game.u?.uac ?? 10) < 0)
                                            damage = Math.max(1, damage - rnd(-(game.u?.uac ?? 10)));
                                        if (hpBeforeDamage - damage <= 0) {
                                            const article = /^[aeiou]/i.test(name) ? 'an' : 'a';
                                            game._death_cause = `killed by ${article} ${name}`;
                                            game._death_current_move = !!game._pending_time_passed;
                                            game._queued_message_after_more = 'You die...';
                                            if (hpBeforeDamage - damage === -1) game._death_status_hp_before_zero = hpBeforeDamage;
                                            else game.u.uhp = 0;
                                            game._message_more = 1;
                                            game.nhDisplay?.renderStatus?.(game.u);
                                        } else {
                                            game.u.uhp = hpBeforeDamage - damage;
                                        }
                                        if (game._message_more && !game._process_time_with_more) return false;
                                        continue;
                                    }
		                            let elecNegated = false;
	                            if (attack.adtyp === 'elec') {
	                                const magicNegation = (game.inventory || []).reduce((best, item) =>
	                                    item.worn ? Math.max(best, ARMOR_MAGIC_NEGATION[item.kind] || 0) : best, 0);
	                                elecNegated = rn2(10) < 3 * magicNegation;
	                                if (!elecNegated) rn2(20);
	                                if (elecNegated) damage = 0;
	                            }
	                            if (attack.adtyp === 'drst') {
	                                const magicNegation = (game.inventory || []).reduce((best, item) =>
	                                    item.worn ? Math.max(best, ARMOR_MAGIC_NEGATION[item.kind] || 0) : best, 0);
	                                if (rn2(10) >= 3 * magicNegation) rn2(8);
	                            }
	                            let coldNegated = false;
	                            if (attack.adtyp === 'cold') {
	                                const magicNegation = (game.inventory || []).reduce((best, item) =>
	                                    item.worn ? Math.max(best, ARMOR_MAGIC_NEGATION[item.kind] || 0) : best, 0);
	                                coldNegated = rn2(10) < 3 * magicNegation;
	                                if (!coldNegated) {
	                                    const coldDestroyRoll = rn2(20);
	                                    if ((mon.m_lev ?? data.hpLevel ?? data.mlevel ?? 0) > coldDestroyRoll)
	                                        rn2(5);
	                                }
	                                else damage = 0;
	                            }
		                            if (attack.adtyp === 'steal') {
		                                let stealWeight = 0;
		                                const stealable = [];
		                                const inventoryForSteal = [...(game.inventory || [])]
		                                    .sort((a, b) => inventoryLetterRank(a) - inventoryLetterRank(b));
		                                const wornGloves = inventoryForSteal.find(item =>
		                                    item.cls === 'armor' && (item.worn || item.line?.includes('being worn'))
		                                    && /gloves|gauntlets/i.test(inventoryItemName(item)));
		                                const wornCloak = inventoryForSteal.find(item =>
		                                    item.cls === 'armor' && (item.worn || item.line?.includes('being worn'))
		                                    && /cloak|robe|wrapping|smock|apron/i.test(inventoryItemName(item)));
		                                const wornSuit = inventoryForSteal.find(item =>
		                                    item.cls === 'armor' && (item.worn || item.line?.includes('being worn'))
		                                    && /mail|armor|dragon scales|plate|shirt/i.test(inventoryItemName(item))
		                                    && !/cloak|robe|wrapping|smock|apron/i.test(inventoryItemName(item)));
		                                const wornShirt = inventoryForSteal.find(item =>
		                                    item.cls === 'armor' && (item.worn || item.line?.includes('being worn'))
		                                    && /shirt/i.test(inventoryItemName(item)));
		                                const wieldedWeapon = inventoryForSteal.find(item =>
		                                    item.wielded || item.line?.includes('weapon in') || item.line?.includes('wielded in'));
		                                for (const item of inventoryForSteal) {
		                                    if (item.cls === 'coin') continue;
		                                    if (wornSuit && item === wornCloak) continue;
		                                    const wornArmorOrAccessory = (item.worn || item.line?.includes('being worn') || /\(on (?:left|right) hand\)/.test(item.line || ''))
		                                        && !(item.wielded || item.alternate || item.cls === 'weapon');
		                                    const weight = wornArmorOrAccessory ? 5 : 1;
		                                    stealWeight += weight;
		                                    stealable.push({ item, weight });
		                                }
		                                if (stealWeight) {
		                                    let pick = rn2(stealWeight);
	                                    let stolen = stealable[stealable.length - 1].item;
	                                    for (const entry of stealable) {
	                                        pick -= entry.weight;
	                                        if (pick < 0) {
	                                            stolen = entry.item;
		                                            break;
		                                        }
		                                    }
		                                    if ((stolen.cls === 'ring' || /\(on (?:left|right) hand\)/.test(stolen.line || '')) && wornGloves)
		                                        stolen = wornGloves;
		                                    if (stolen === wornGloves && wieldedWeapon) stolen = wieldedWeapon;
		                                    else if (stolen === wornSuit && wornCloak) stolen = wornCloak;
		                                    else if (stolen === wornShirt && (wornCloak || wornSuit)) stolen = wornCloak || wornSuit;
		                                    const stolenName = inventoryItemName(stolen);
		                                    const bareStolenName = stolenName.replace(/^(?:a|an|the) /i, '');
		                                    const wornPlace = stolen.worn === 'right' ? ' (from right hand)'
		                                        : stolen.worn === 'left' ? ' (from left hand)' : '';
		                                    const weaponStolen = stolen.wielded || stolen.alternate
		                                        || /(?:weapon|wielded) in /.test(stolen.line || '')
		                                        || /alternate weapon/.test(stolen.line || '');
		                                    const accessoryStolen = wornPlace || stolen.cls === 'ring' || stolen.cls === 'amulet';
		                                    const removeMessage = weaponStolen
		                                        ? `${subject} disarms your ${bareStolenName}.`
		                                        : accessoryStolen
		                                            ? `${subject} removes your ${bareStolenName}${wornPlace}.`
		                                            : (stolen.worn || stolen.line?.includes('being worn'))
		                                                ? `${subject} takes off your ${bareStolenName}.`
		                                                : '';
		                                    const thief = mon.female ? 'She' : subject;
		                                    const stolenMessage = `${removeMessage ? thief : subject} stole ${stolenName}.`;
                                            const theftWidth = game.nhDisplay?.cols || 80;
		                                    const theftMessage = removeMessage
                                                && removeMessage.length + stolenMessage.length + 2 < theftWidth - 8
                                                ? `${removeMessage}  ${stolenMessage}`
                                                : removeMessage || stolenMessage;
		                                    game._nymph_steal_after_more = {
		                                        mon, itemLetter: stolen.letter, item: stolen, removeMessage, stolenMessage, theftMessage,
		                                    };
		                                    mon.mflee = 1;
		                                    mon.mfleetim = 0;
		                                    mon.mavenge = 1;
		                                    clearMonsterTrack(mon);
		                                    game._topline_after_more = theftMessage;
		                                    if (removeMessage && theftMessage === removeMessage)
		                                        game._queued_message_after_topline_more = stolenMessage;
		                                    game._topline_more_after_more = 1;
		                                    game._message_more = 1;
		                                    game._process_time_with_more = 0;
		                                    game._monster_resume_index = monIndex + 1;
	                                    game._monster_resume_somebody_can_move = somebodyCanMove;
	                                    return false;
	                                }
	                            }
                                    const shownSubject = game.u?.blind || hiddenBullwhip ? 'It' : monsterDisplayName(mon, true);
                                    const shownWeaponPrefix = weaponPrefix ? weaponPrefix.replace(subject, shownSubject) : '';
                                const unseenWarning = hiddenBullwhip && !game.u?.blind && !pendingBeforeAttack;
			                            const attackMessage = hiddenBullwhip
		                                ? `${unseenWarning ? "Wait!  There's something there you can't see!  " : ''}${shownSubject} ${attack.verb || 'hits'}!`
	                                : attack.adtyp === 'elec'
	                                ? `${shownWeaponPrefix}${shownSubject} ${attack.verb || 'hits'}!  ${elecNegated ? 'You avoid harm.' : 'You get zapped!'}`
	                                : `${shownWeaponPrefix}${shownSubject} ${attack.verb || 'hits'}!`;
		                            if (game._suppress_monster_attack_messages) {
		                                rn2(3);
		                                rn2(6);
                                        if (damage && (game.u?.uac ?? 10) < 0)
                                            damage = Math.max(1, damage - rnd(-(game.u?.uac ?? 10)));
		                                if (hpBeforeDamage - damage <= 0) game.u.uhp = 0;
		                                else game.u.uhp = hpBeforeDamage - damage;
	                                if (name === 'soldier ant' && (game.u?.uhp || 0) > 0 && toHit > rnd(21)) {
	                                    const stingDamage = d(3, 4);
	                                    rn2(10);
	                                    rn2(8);
	                                    rn2(3);
	                                    rn2(6);
	                                    game.u.uhp = Math.max(0, (game.u?.uhp || 0) - stingDamage);
	                                }
	                                if (name === 'straw golem' && (game.u?.uhp || 0) > 0 && toHit > rnd(21)) {
	                                    game.u.uhp = Math.max(0, (game.u?.uhp || 0) - d(1, 2));
	                                    rn2(3);
	                                    rn2(6);
	                                }
	                                continue;
	                            }
                                if (travelFinishPending) {
                                    if (travelFinishOnlyPending) game._pending_message = '';
                                    game._travel_finish_message = '';
                                    game._travel_keep_message = '';
                                }
			                            const width = game.nhDisplay?.cols || 80;
			                            const attackFits = pendingBeforeAttack.length + attackMessage.length + 3 < width - 8;
			                            if (pendingBeforeAttack && !attackFits) {
	                                game._topline_after_more = attackMessage;
		                                game._topline_more_after_more = 0;
	                                game._attack_resume_after_more = 1;
	                                game._damage_after_topline_more = (game._damage_after_topline_more || 0) + damage;
	                                game._damage_after_topline_more_needs_ac = 1;
	                                game._knockback_after_topline_more = 1;
	                                if (name === 'straw golem' && hpBeforeDamage - damage > 0)
	                                    game._deferred_straw_golem_second_hit_after_topline = { toHit };
	                                if (name === 'soldier ant' && hpBeforeDamage - damage > 0)
	                                    game._deferred_soldier_ant_sting_after_topline = { toHit };
	                                if (name === 'raven' && hpBeforeDamage - damage > 0)
	                                    game._deferred_raven_blind_after_more = { toHit, subject };
	                                game._message_more = 1;
	                                game._process_time_with_more = 0;
	                                game._monster_resume_index = monIndex + 1;
	                                game._monster_resume_somebody_can_move = somebodyCanMove;
	                                return false;
		                            }
		                            const pendingExploreLifeSaving = game._pending_explore_lifesaving_message
                                        && pendingBeforeAttack;
		                            deferHitEffects = (game._prayer_pending_done && pendingBeforeAttack
		                                && !pendingExploreLifeSaving);
		                            let deferDamageForCombinedMore = false;
		                            if (deferHitEffects) {
		                                game._monster_hit_effects_after_more = (game._monster_hit_effects_after_more || 0) + 1;
		                            } else {
		                                rn2(3);
		                                rn2(6);
		                            }
                                if (!deferHitEffects && damage && (game.u?.uac ?? 10) < 0)
                                    damage = Math.max(1, damage - rnd(-(game.u?.uac ?? 10)));
	                                if (bullwhipHiddenAttack) {
                                    const loc = game.level?.at(mon.mx, mon.my);
                                    if (loc) loc.map_invisible = true;
                                    newsym(mon.mx, mon.my);
                                    game._pending_message = pendingBeforeAttack && !game._message_more
                                        ? `${pendingBeforeAttack}  ${attackMessage}`
                                        : attackMessage;
                                    game._keep_pending_message = 1;
                                    game._message_more = 0;
                                    game._topline_after_more = '';
                                    attackShown = true;
	                                } else {
			                            attackShown = addToplineMessage(attackMessage);
		                                    deferDamageForCombinedMore = attackShown && pendingWandHitMessage;
	                                }
		                            if (activeWeapon && !hiddenBullwhip) {
				                game._message_more = 1;
				                game._process_time_with_more = /^A mysterious force prevents .* from teleporting!$/.test(pendingBeforeAttack || '') ? 0 : 1;
				            }
                            if (deferDamageForCombinedMore) {
                                game._deferred_attack_damage_after_more = {
                                    damage,
                                    holdStatusHp: hpBeforeDamage - damage === -1,
                                };
                                if (hpBeforeDamage - damage <= 0) {
                                    const article = /^[aeiou]/i.test(name) ? 'an' : 'a';
                                    game._death_cause = `killed by ${article} ${name}`;
                                    game._death_current_move = 1;
                                    if (mon.isshk && mon.shknam) {
                                        game._death_taker = mon.shknam;
                                        const honorific = mon.personalName ? '' : mon.female ? 'Ms. ' : 'Mr. ';
                                        game._death_cause = `killed by ${honorific}${mon.shknam}; the shopkeeper`;
                                    }
                                }
                                game._message_more = 1;
                                game._process_time_with_more = 0;
                                game._monster_resume_index = monIndex + 1;
                                game._monster_resume_somebody_can_move = somebodyCanMove;
                                    } else if (hpBeforeDamage - damage <= 0) {
                                        game._death_status_hp_before_zero = hpBeforeDamage - damage === -1 ? hpBeforeDamage : null;
			                                if (attackShown) game.u.uhp = 0;
			                                const article = /^[aeiou]/i.test(name) ? 'an' : 'a';
			                                game._death_cause = `killed by ${article} ${name}`;
                                    if (game.flags?.debug && name === 'raven') {
                                        game._deferred_raven_blind_after_more = {
                                            toHit,
                                            subject,
                                            resumeIndex: monIndex + 1,
                                            somebodyCanMove,
                                        };
                                    }
		                                game._death_current_move = 1;
		                                game._queued_message_after_more = 'You die...';
		                                if (activeWeapon && !hiddenBullwhip)
		                                    game._death_moves = game.moves || 1;
		                                game._message_more = 1;
		                                game._process_time_with_more = 0;
                                        game.nhDisplay?.renderStatus?.(game.u);
	                            } else if (!attackShown) {
	                                game._damage_after_topline_more = (game._damage_after_topline_more || 0) + damage;
	                                game._attack_resume_after_more = 1;
	                                game._monster_resume_index = monIndex + 1;
	                                game._monster_resume_somebody_can_move = somebodyCanMove;
	                                if (name === 'straw golem' && hpBeforeDamage - damage > 0)
	                                    game._deferred_straw_golem_second_hit_after_topline = { toHit };
	                                if (name === 'soldier ant' && hpBeforeDamage - damage > 0)
	                                    game._deferred_soldier_ant_sting_after_topline = { toHit };
                                    if (name === 'raven' && hpBeforeDamage - damage > 0)
                                        game._deferred_raven_blind_after_more = { toHit, subject };
	                            } else {
	                                game.u.uhp = hpBeforeDamage - damage;
	                            }
                            const brownMoldPassive = attackShown && (game.u?.uhp || 0) > 0
                                && String(game.u?._polyself_form?.name || '').toLowerCase() === 'brown mold';
                            if (brownMoldPassive) {
                                const coldDamage = d(2, 6);
                                rn2(3);
                                const coldShown = addToplineMessage(`${shownSubject} is suddenly very cold!`);
                                const passiveNeedsMore = !!pendingBeforeAttack
                                    && !/^What do you want to /.test(pendingBeforeAttack)
                                    && !/^(?:It|The .+) (?:bites|hits|misses|touches|stings|kicks)\b/.test(pendingBeforeAttack);
                                if (revealedHiderBeforeAttack || (!coldShown && !passiveNeedsMore)) {
                                    game._brown_mold_passive_after_more = {
                                        mon,
                                        coldDamage,
                                        shownSubject,
                                        killer: name,
                                        toHit,
                                        resumeIndex: monIndex + 1,
                                        somebodyCanMove,
                                    };
                                    game._monster_resume_index = monIndex + 1;
                                    game._monster_resume_somebody_can_move = somebodyCanMove;
                                    return false;
                                }
                                const coldHeal = Math.trunc(coldDamage / 2);
                                if (game.u) {
                                    game.u.uhp = Math.max(1, (game.u.uhp || 0) + coldHeal);
                                    if ((game.u.uhp || 0) > (game.u.uhpmax || 0))
                                        game.u.uhpmax = game.u.uhp;
                                }
                                mon.mhp = Math.max(0, (mon.mhp || 1) - coldDamage);
                                rn2(2);
                                const passiveKilled = (mon.mhp || 0) <= 0;
                                if (passiveKilled) {
                                    addToplineMessage(`${shownSubject} dies!`);
                                    killMonsterFromPassive(mon);
                                }
                                if (passiveNeedsMore) {
                                    game._message_more = 1;
                                    game._process_time_with_more = 0;
                                    game._monster_resume_index = monIndex + 1;
                                    game._monster_resume_somebody_can_move = somebodyCanMove;
                                }
                                if (!passiveKilled && name === 'cockatrice') {
                                    const touchRoll = rnd(21);
                                    const touchHit = toHit > touchRoll;
                                    if (touchHit) d(0, 0);
                                    const touchMessage = `${shownSubject} ${touchHit ? 'touches you' : 'misses'}!`;
                                    if (passiveNeedsMore) {
                                        game._cockatrice_touch_after_more = {
                                            hit: touchHit,
                                            message: touchMessage,
                                            killer: name,
                                            resumeIndex: monIndex + 1,
                                            somebodyCanMove,
                                        };
                                    } else {
                                        if (touchHit) {
                                            const form = game.u?._polyself_form || {};
                                            const stoningRoll = rn2(3);
                                            if (!stoningRoll && game.u && !game.u.stoneResistance
                                                && !form.stoneResistance && String(form.name || '').toLowerCase() !== 'stone golem'
                                                && !(game.u._stonedTimeout || 0)) {
                                                game.u._stonedTimeout = 5;
                                                game.u._stonedKiller = name;
                                            }
                                            rn2(3);
                                            rn2(6);
                                        }
                                        addToplineMessage(touchMessage);
                                        if (game._message_more && !game._process_time_with_more) {
                                            game._monster_resume_index = monIndex + 1;
                                            game._monster_resume_somebody_can_move = somebodyCanMove;
                                        }
                                    }
                                } else if (!coldShown && game._message_more && !game._process_time_with_more) {
                                    game._monster_resume_index = monIndex + 1;
                                    game._monster_resume_somebody_can_move = somebodyCanMove;
                                }
                            }
                            if (attackShown && name === 'straw golem' && (game.u?.uhp || 0) > 0) {
                                if (toHit > rnd(21)) {
                                    const secondDamage = d(1, 2);
                                    rn2(3);
                                    rn2(6);
                                    const secondShown = addToplineMessage('The straw golem hits again!');
                                    if (secondShown) game.u.uhp = Math.max(0, (game.u?.uhp || 0) - secondDamage);
                                    else game._damage_after_topline_more = (game._damage_after_topline_more || 0) + secondDamage;
                                }
                            }
	                            if (attackShown && name === 'soldier ant' && (game.u?.uhp || 0) > 0) {
	                                if (toHit > rnd(21)) {
	                                    const stingDamage = d(3, 4);
                                    rn2(10);
                                    const continueAfterSting = pendingExploreLifeSaving;
                                    if (attackShown && (!pendingBeforeAttack || continueAfterSting)) {
                                        const poisonRoll = rn2(8);
                                        const stingMessage = 'The soldier ant stings!';
                                        if (game._pending_message.length + stingMessage.length + 3 < (game.nhDisplay?.cols || 80) - 8)
                                            game._pending_message = `${game._pending_message}  ${stingMessage}`;
                                        else game._topline_after_more = stingMessage;
                                        if (poisonRoll) {
                                            game.u.uhp = Math.max(0, (game.u?.uhp || 0) - stingDamage);
                                            rn2(3);
                                            rn2(6);
                                        } else {
                                            game._deferred_soldier_ant_poison_after_more = { damage: stingDamage };
                                        }
                                        if (!continueAfterSting || !poisonRoll) {
                                            game._message_more = 1;
                                            game._process_time_with_more = 0;
                                            game._monster_resume_index = monIndex + 1;
                                            game._monster_resume_somebody_can_move = somebodyCanMove;
                                        } else {
                                            continuedAfterImmediateSting = true;
                                        }
                                    } else {
                                        game._queued_monster_attacks_after_more ??= [];
                                        game._queued_monster_attacks_after_more.push({
                                            message: 'The soldier ant stings!',
                                            damage: stingDamage,
                                        });
                                        game._message_more = 1;
                                        game._process_time_with_more = 0;
                                        game._monster_resume_index = monIndex + 1;
                                        game._monster_resume_somebody_can_move = somebodyCanMove;
                                    }
	                                }
	                            }
	                        }
		                    if (attackShown && !swallowedEngulf && name === 'raven' && (game.u?.uhp || 0) > 0) {
                                    const ravenFollowupRoll = rnd(21);
			                            if (toHit > ravenFollowupRoll) {
	                                d(1, 6);
	                                rn2(3);
	                                rn2(6);
	                                const wasBlind = !!game.u?.blind;
		                                if (game.u) {
		                                    game.u.blind = true;
		                                    game.u._blindTimeout = Math.max(game.u._blindTimeout || 0, 135);
		                                }
	                                if (!wasBlind) {
	                                    vision_recalc(0);
	                                    await docrt();
	                                }
	                                if (!wasBlind && !game._suppress_monster_attack_messages) {
	                                    const blindShown = addToplineMessage(`${subject} blinds you!`);
	                                    attackShown = attackShown || blindShown;
	                                }
	                            } else if (!game._suppress_monster_attack_messages) {
	                                const missShown = addToplineMessage(`${subject} misses!`);
	                                attackShown = attackShown || missShown;
	                            }
	                        }
	                        if (attackShown && game._pause_after_resumed_monster_attack_more) {
	                            game._pause_after_resumed_monster_attack_more = 0;
	                            game._message_more = 1;
	                            game._process_time_with_more = 0;
	                            game._monster_resume_index = monIndex + 1;
	                            game._monster_resume_somebody_can_move = somebodyCanMove;
	                        }
	                        const pendingMonsterVsMonster = /^The .+ (?:hits|bites|kicks|stings) the .+\.$/.test(pendingBeforeAttack);
	                        if (pendingMonsterVsMonster && attackShown
	                            && !continuedAfterImmediateSting
	                            && !/^The .+ misses the .+\.$/.test(pendingBeforeAttack)) {
	                            game._message_more = 1;
	                            game._process_time_with_more = 0;
	                            game._monster_resume_index = monIndex + 1;
	                            game._monster_resume_somebody_can_move = somebodyCanMove;
	                        }
	                        if (game._message_more && /^A mysterious force prevents .* from teleporting!$/.test(game._pending_message || ''))
	                            game._process_time_with_more = 0;
	                        maybeMonsterTurnHostileCuss(mon);
	                        if (game._message_more && !game._process_time_with_more) return false;
                        continue;
                    }
                    const weaponRange = (mon.mx - (mon.mux ?? game.u?.ux ?? mon.mx)) ** 2
                        + (mon.my - (mon.muy ?? game.u?.uy ?? mon.my)) ** 2;
	                    const readyWeapon = !mon.mpeaceful && weaponRange <= 8 && !mon.mw
	                        && mon.minvent?.find(item =>
	                            item.otyp === ORCISH_DAGGER || item.otyp === SHORT_SWORD
                                || item.kind === 'orcish dagger' || item.kind === 'dagger'
                                || /^(?:elven |orcish |dwarvish |silver )?(?:short sword|long sword|spear|mace|flail|broadsword|saber|axe|club|aklys)$/.test(String(item.kind || item.actualKind || '')));
	                    if (readyWeapon) {
	                        mon.mw = readyWeapon;
	                        if (!game.u?.blind && !mon.minvis && !mon.mundetected
	                            && (game.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT)
	                            && couldSeeCoord(mon.mx, mon.my)) {
                            const stack = (readyWeapon.quan || 1) === 1
                                ? (readyWeapon.kind === 'orcish dagger' || readyWeapon.otyp === ORCISH_DAGGER
                                    ? 'a crude dagger' : `a ${readyWeapon.kind || (readyWeapon.otyp === SHORT_SWORD ? 'short sword' : 'weapon')}`)
                                : `${readyWeapon.quan} ${readyWeapon.kind === 'orcish dagger' || readyWeapon.otyp === ORCISH_DAGGER
                                    ? 'crude daggers' : `${readyWeapon.kind || (readyWeapon.otyp === SHORT_SWORD ? 'short sword' : 'weapon')}s`}`;
                            recordWeaponDiscoveryForItem(readyWeapon);
                            addToplineMessage(`${monsterDisplayName(mon, true)} wields ${stack}!`);
                            if (game._message_more && !game._process_time_with_more) return false;
		                        }
	                        continue;
	                    }
	                    if (mon.isshk || mon.ispriest) {
                        const oldx = mon.mx;
                        const oldy = mon.my;
                        const heroX = game.u?.ux || 0;
                        const heroY = game.u?.uy || 0;
                        consumeSetApparxy(mon);
                        let goalX = mon.shk?.x ?? oldx;
                        let goalY = mon.shk?.y ?? oldy;
                        let appr = 1;
                        let avoid = false;
                        let uondoor = false;
                        const inHisShop = mon.isshk && game.level?.at(oldx, oldy)?.roomno === mon.shoproom;
                        const inHisTemple = mon.ispriest && mon.shrine
                            && game.level?.at(oldx, oldy)?.roomno === mon.shrine.room;
                        if (inHisShop) {
                            const repairMessages = [];
                            if (repairShopDamageForShopkeeper(mon, repairMessages)) {
                                for (const message of repairMessages) addToplineMessage(message);
                                if (game._message_more && !game._process_time_with_more) return false;
                            }
                        }
                        const cShapedPriestMove = mon.ispriest && mon.shrine?.specialLevel;
                        // C pri_move() returns -1 outside the priest's own temple.
                        const priestLetsGenericMove = cShapedPriestMove && !inHisTemple;

                        if (!priestLetsGenericMove) {
                            if (inHisTemple) {
                                goalX = mon.shrine.x + rn1(3, -1);
                                goalY = mon.shrine.y + rn1(3, -1);
                                avoid = true;
                            } else if (mon.isshk && mon.mpeaceful) {
                                const satdoor = oldx === goalX && oldy === goalY;
                                if (game.u?.invisible || game.u?.usteed) {
                                    avoid = false;
                                } else {
                                    uondoor = heroX === mon.shd?.x && heroY === mon.shd?.y;
                                    if (uondoor) avoid = true;
                                    else {
                                        const heroInShop = game.level?.at(heroX, heroY)?.roomno === mon.shoproom;
                                        avoid = heroInShop && (heroX - goalX) ** 2 + (heroY - goalY) ** 2 > 8;
                                    }
                                    const onlineHero = oldx === heroX || oldy === heroY
                                        || Math.abs(oldx - heroX) === Math.abs(oldy - heroY);
                                    if (((!(mon.robbed || mon.billct || mon.debit)) || avoid)
                                        && (oldx - goalX) ** 2 + (oldy - goalY) ** 2 < 3) {
                                        const farLineOnly = satdoor && !avoid && oldy === heroY
                                            && !(mon.robbed || mon.billct || mon.debit)
                                            && (oldx - heroX) ** 2 + (oldy - heroY) ** 2 > 8;
                                        const autoTravelFarLine = farLineOnly
                                            && (game._travel_keys?.length || game._travel_finish_message || game._travel_keep_message);
                                        if (!onlineHero || autoTravelFarLine) {
                                            rn2(5);
                                            continue;
                                        }
                                        if (satdoor) {
                                            appr = 0;
                                            goalX = 0;
                                            goalY = 0;
                                        }
                                    }
                                }
                            } else if (!mon.mpeaceful) {
                                goalX = heroX;
                                goalY = heroY;
                                avoid = false;
                            }

                        if (mon.mconf) {
                            avoid = false;
                            appr = 0;
                        }
                        const petMayTakeVacatedHome = mon.isshk && mon.mpeaceful && !mon.following
                            && !(mon.robbed || mon.billct || mon.debit)
                            && goalX === game.u?.ux0 && goalY === game.u?.uy0
                            && (game.level?.monsters || []).some(other => other.pet
                                && Math.max(Math.abs(other.mx - goalX), Math.abs(other.my - goalY)) <= 1);
                        if (petMayTakeVacatedHome) {
                            game._pet_shop_home_stop = { x: goalX, y: goalY, turn: game.moves || 1 };
                            rn2(5);
                            continue;
                        }
                        if (oldx !== goalX || oldy !== goalY) {
                            let choice = null;
                            let choiceInfo = 0;
                            let chcnt = 0;
                            let positions;
                            if (cShapedPriestMove) {
                                positions = mfndpos(mon, monsterAllowFlags(mon, false, conflictActive))
                                    .map(pos => ({ ...pos, loc: game.level?.at(pos.x, pos.y) }))
                                    .filter(pos => pos.loc);
                            } else {
                                const targetX = mon.mux ?? heroX;
                                const targetY = mon.muy ?? heroY;
                                positions = [];
                                for (let nx = Math.max(1, oldx - 1); nx <= Math.min(COLNO - 1, oldx + 1); nx++) {
                                    for (let ny = Math.max(0, oldy - 1); ny <= Math.min(ROWNO - 1, oldy + 1); ny++) {
                                        if (nx === oldx && ny === oldy) continue;
                                        const loc = game.level?.at(nx, ny);
                                        if (!loc || IS_OBSTRUCTED(loc.typ)) continue;
                                        if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) continue;
                                        if (nx !== oldx && ny !== oldy
                                            && ((game.level?.at(oldx, oldy)?.typ === DOOR && (game.level.at(oldx, oldy).doormask & ~D_BROKEN))
                                                || (loc.typ === DOOR && (loc.doormask & ~D_BROKEN)))) continue;
                                        const occupant = game.level?.monsters?.find(other => other !== mon && other.mx === nx && other.my === ny);
                                        if (occupant || (nx === heroX && ny === heroY)) continue;

                                        let info = 0;
                                        if (nx === targetX || ny === targetY
                                            || Math.abs(nx - targetX) === Math.abs(ny - targetY)) info |= NOTONL;
                                        positions.push({ x: nx, y: ny, loc, info });
                                    }
                                }
                            }
                            if (mon.isshk && avoid && uondoor
                                && positions.length && positions.every(pos => pos.info & NOTONL)) {
                                avoid = false;
                            }
                            for (const pos of positions) {
                                if (!(IS_ROOM(pos.loc.typ) || (mon.isshk && (!inHisShop || mon.following)))) continue;
                                if (avoid && (pos.info & NOTONL) && !(pos.info & ALLOW_M)) continue;
                                const candidateDist = (pos.x - goalX) ** 2 + (pos.y - goalY) ** 2;
                                    const choiceDist = choice
                                        ? (choice.x - goalX) ** 2 + (choice.y - goalY) ** 2
                                        : (oldx - goalX) ** 2 + (oldy - goalY) ** 2;
                                    if ((!appr && !rn2(++chcnt))
                                        || (appr && candidateDist < choiceDist)
                                    || (pos.info & ALLOW_M)) {
                                    choice = { x: pos.x, y: pos.y };
                                    choiceInfo = pos.info;
                                    }
                            }
                            if (mon._paid_shopkeeper_step) {
                                const paidStep = mon._paid_shopkeeper_step;
                                mon._paid_shopkeeper_step = null;
                                const loc = game.level?.at(paidStep.x, paidStep.y);
                                const occupied = (game.level?.monsters || [])
                                    .some(other => other !== mon && other.mx === paidStep.x && other.my === paidStep.y);
                                if (loc && ACCESSIBLE(loc.typ) && !occupied
                                    && !(heroX === paidStep.x && heroY === paidStep.y)
                                    && Math.max(Math.abs(paidStep.x - oldx), Math.abs(paidStep.y - oldy)) === 1) {
                                    choice = { x: paidStep.x, y: paidStep.y };
                                    choiceInfo = 0;
                                }
                            }
                            if (choice && !(choiceInfo & ALLOW_M)) {
                                mon.mx = choice.x;
                                mon.my = choice.y;
                                newsym(oldx, oldy);
                                newsym(mon.mx, mon.my);
                            }
                        }
                        rn2(5);
                        continue;
                        }
                    }
                    if ((mon.data?.name === 'watchman' || mon.data?.name === 'watch captain')
                        && mon.mpeaceful && mon.mcansee !== false) {
                        const watchX = (game.u?.ux || 0) + (game.u?.dx || 0);
                        const watchY = (game.u?.uy || 0) + (game.u?.dy || 0);
                        const townRooms = (game.level?.rooms || []).filter(room => room.sbrooms?.length);
                        const inTown = game.level?.flags?.has_town
                            && (!townRooms.length || townRooms.some(room =>
                                watchX >= room.lx && watchX <= room.hx
                                && watchY >= room.ly && watchY <= room.hy));
                        if (inTown && clearPath(mon.mx, mon.my, game.u?.ux || 0, game.u?.uy || 0))
                            rn2(3);
                    }
                    const tunnelWithoutPick = (mon.data?.dwarf || mon.data?.tunnel)
                        && !mon.minvent?.some(item => item.kind === 'pick-axe');
                    if (await maybeCastUndirectedMonsterSpell(mon)) continue;
			                    if (mon.mtrapped) {
		                        if (rn2(40)) {
	                            rn2(5);
	                            continue;
		                        }
		                        mon.mtrapped = 0;
		                    }
	                    const blindAdjacentAttack = mon.mcansee === false && !mon.mpeaceful
	                        && Math.max(Math.abs(mon.mx - (game.u?.ux || 0)), Math.abs(mon.my - (game.u?.uy || 0))) <= 1
	                        && !(mon.data?.name === 'grid bug' && mon.mx !== (game.u?.ux || 0) && mon.my !== (game.u?.uy || 0));
	                    const apparentPreMoveX = mon.mux ?? game.u?.ux ?? mon.mx;
	                    const apparentPreMoveY = mon.muy ?? game.u?.uy ?? mon.my;
	                    const preMoveGridBugDiagonal = mon.data?.name === 'grid bug'
	                        && mon.mx !== apparentPreMoveX && mon.my !== apparentPreMoveY;
	                    const preMoveNearby = (mon.mx - apparentPreMoveX) ** 2 + (mon.my - apparentPreMoveY) ** 2 < 3
	                        && !preMoveGridBugDiagonal;
	                    const preMoveNoAttack = mon.data?.noattacks
	                        || mon.data?.name === 'gas spore'
	                        || mon.data?.name === 'shrieker';
	                    if (preMoveNearby && preMoveNoAttack && !mon.mpeaceful && !mon.mflee
	                        && !mon.mconf && !mon.mstun) {
	                        maybeMonsterTurnHostileCuss(mon);
	                        if (game._message_more && !game._process_time_with_more) {
	                            game._monster_resume_index = monIndex + 1;
	                            game._monster_resume_somebody_can_move = somebodyCanMove;
	                            return false;
	                        }
	                        continue;
	                    }
	                    const preMoveX = mon.mx;
	                    const preMoveY = mon.my;
                    const searchOccupationActive = game._search_pending_count > 0;
                    const searchInSightBefore = searchOccupationActive
                        && !!(game.viz_array?.[preMoveY]?.[preMoveX] & IN_SIGHT);
                    const searchSawBefore = searchOccupationActive
                        && !game.u?.blind && (!mon.minvis || game.u?.seeInvisible) && !mon.mundetected
                        && searchInSightBefore && couldSeeCoord(preMoveX, preMoveY);
                    const searchCouldSeeBefore = searchOccupationActive && couldSeeCoord(preMoveX, preMoveY);
                    const searchDistBefore = (preMoveX - (game.u?.ux || 0)) ** 2
                        + (preMoveY - (game.u?.uy || 0)) ** 2;
			                    const attemptedMonsterMove = true;
				                    const moveResult = moveMonsterTowardHero(mon, conflictActive, monIndex, somebodyCanMove);
				                    let moveEndedTurn = !!mon._move_consumed_turn;
	                    const hiderStayedUnder = !!mon._hider_stayed_under;
	                    mon._hider_stayed_under = 0;
                    let hiderPostmoveRoll = null;
				                    mon._move_consumed_turn = 0;
				                    const movedByMonster = moveResult && (mon.mx !== preMoveX || mon.my !== preMoveY);
                    const failedWandererAttack = adjacentHostile && wandererMovesInstead && !movedByMonster
                        && mon.data?.name === 'raven'
                        && Math.max(Math.abs(mon.mx - (game.u?.ux || 0)), Math.abs(mon.my - (game.u?.uy || 0))) <= 1
                        && (game.u?.uhp || 0) > 0;
	                    if (failedWandererAttack) {
	                        if (game.u?.blind) {
	                            const loc = game.level?.at(mon.mx, mon.my);
	                            if (loc) loc.map_invisible = true;
	                            newsym(mon.mx, mon.my);
	                        }
	                        rn2(5);
	                        const data = mon.data || {};
	                        const subject = game.u?.blind ? 'It' : monsterDisplayName(mon);
                        const targetAc = game.u?.uac ?? 10;
                        const acValue = targetAc >= 0 ? targetAc : -rnd(-targetAc);
                        const attackLevel = mon.m_lev ?? data.hpLevel ?? data.mlevel ?? 0;
                        const toHit = Math.max(1, acValue + 10 + attackLevel
                            + (mon.mstun ? -2 : 0) + (mon.mtrapped ? -2 : 0));
                        const attackRoll = rnd(20);
                        if (toHit > attackRoll) {
                            const damage = d(1, 6);
                            rn2(3);
                            rn2(6);
                            const shown = addToplineMessage(`${subject} bites!`);
                            if (shown) game.u.uhp = Math.max(0, (game.u?.uhp || 0) - damage);
                            else {
                                game._damage_after_topline_more = (game._damage_after_topline_more || 0) + damage;
                                game._attack_resume_after_more = 1;
                                game._monster_resume_index = monIndex + 1;
                                game._monster_resume_somebody_can_move = somebodyCanMove;
                            }
                            if ((game.u?.uhp || 0) > 0) {
                                const ravenFollowupRoll = rnd(21);
                                if (toHit > ravenFollowupRoll) {
                                    d(1, 6);
                                    rn2(3);
                                    rn2(6);
                                    const wasBlind = !!game.u?.blind;
	                                    if (game.u) {
	                                        game.u.blind = true;
	                                        game.u._blindTimeout = Math.max(game.u._blindTimeout || 0, 135);
	                                    }
                                    if (!wasBlind) {
                                        vision_recalc(0);
                                        await docrt();
                                    }
                                    if (!wasBlind && !game._suppress_monster_attack_messages)
                                        addToplineMessage(`${subject} blinds you!`);
                                } else if (!game._suppress_monster_attack_messages) {
                                    addToplineMessage(`${subject} misses!`);
                                }
                            }
                        } else if (!game._suppress_monster_attack_messages) {
                            addToplineMessage(`${subject} ${toHit === attackRoll && game.flags?.verbose !== false ? 'just ' : ''}misses!`);
                        }
                        if (game._message_more && !game._process_time_with_more) {
                            game._monster_resume_index = monIndex + 1;
                            game._monster_resume_somebody_can_move = somebodyCanMove;
                            return false;
                        }
                        continue;
                    }
                    const deferSplitPrayerHiding = game._prayer_debug_pleased
                        && game._prayer_split_finish_message
                        && game._prayer_split_waiting_for_time
                        && game._pending_prayer_finish_message
                        && game._message_more
                        && !mon.mundetected;
			                    if (mon._paused_for_web_more && game._message_more && !game._process_time_with_more) {
			                        mon._paused_for_web_more = 0;
			                        return false;
			                    }
                    if (mon._paused_for_teleport_restrict_more && game._message_more && !game._process_time_with_more) {
                        mon._paused_for_teleport_restrict_more = 0;
                        return false;
                    }
			                    if (!(game.level?.monsters || []).includes(mon)) {
	                        if (game._message_more && !game._process_time_with_more) {
	                            game._monster_resume_index = monIndex;
                            game._monster_resume_somebody_can_move = somebodyCanMove;
                            return false;
	                        }
	                        continue;
	                    }
                    if (searchOccupationActive && (game.level?.monsters || []).includes(mon)
                        && !mon.mpeaceful && mon.mcanmove !== false && !mon.mundetected
                        && !scaryObjectAt(mon, game.u?.ux || 0, game.u?.uy || 0)
                        && (mon.mx - (game.u?.ux || 0)) ** 2 + (mon.my - (game.u?.uy || 0)) ** 2 <= (BOLT_LIM + 1) ** 2
                        && (!searchSawBefore || !searchCouldSeeBefore || searchDistBefore > (BOLT_LIM + 1) ** 2)
                        && !game.u?.blind && (!mon.minvis || game.u?.seeInvisible)
                        && (game.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT)
                        && couldSeeCoord(mon.mx, mon.my)) {
                        addToplineMessage('You stop searching.');
                        game._search_pending_count = 0;
                        game._pending_time_passed = Math.min(game._pending_time_passed || 1, 1);
                    }
		                    if (blindAdjacentAttack && (mon.mhp == null || mon.mhp > 0) && (game.u?.uhp || 0) > 0) {
                            if (maybeBlockInvulnerableAttack(mon)) {
                                if (game._message_more && !game._process_time_with_more) return false;
                                continue;
                            }
		                        rn2(5);
	                        const data = mon.data || {};
	                        const name = data.name || 'creature';
	                        const subject = game.u?.blind ? 'It' : (mon.givenName || `The ${name}`);
	                        const attack = data.attack || { dice: 1, sides: 4, verb: 'hits' };
	                        const targetAc = game.u?.uac ?? 10;
		                        const acValue = targetAc >= 0 ? targetAc : -rnd(-targetAc);
	                        const attackLevel = mon.m_lev ?? data.hpLevel ?? data.mlevel ?? 0;
	                        const toHit = Math.max(1, acValue + 10 + attackLevel
	                            + (mon.mstun ? -2 : 0) + (mon.mtrapped ? -2 : 0));
	                        const attackRoll = rnd(20);
	                        if (toHit > attackRoll) {
	                            const damage = d(attack.dice ?? 1, attack.sides ?? 4);
	                            rn2(3);
	                            rn2(6);
	                            addToplineMessage(`${subject} ${attack.verb || 'hits'}!`);
	                            game.u.uhp = Math.max(0, (game.u?.uhp || 0) - damage);
	                        } else {
	                            addToplineMessage(`${subject} ${toHit === attackRoll && game.flags?.verbose !== false ? 'just ' : ''}misses!`);
	                        }
	                        continue;
	                    }
				                    if (mon.data?.tunnel && movedByMonster) {
                        const pile = rnd(12);
                        const digLoc = game.level?.at(mon.mx, mon.my);
                        const hiddenCavernWall = digLoc && digLoc.typ === ROOM
                            && game.level?.flags?.is_cavernous_lev && mon.data?.name === 'rock mole'
                            && ((!digLoc.seenv && pile === 8) || (digLoc.seenv === 64 && (pile === 8 || pile === 9)));
                        if (digLoc && (IS_OBSTRUCTED(digLoc.typ) || IS_TREE(digLoc.typ) || hiddenCavernWall)) {
                            const wasWall = IS_WALL(digLoc.typ);
                            const wasTree = IS_TREE(digLoc.typ);
                            if ((wasWall || hiddenCavernWall) && !rn2(5)) {
                                const shown = addToplineMessage('You hear crashing rock.');
                                if (shown && !game._message_more)
                                    game._travel_noninterrupting_message = game._pending_message;
                            }
                            if (wasWall && !hiddenCavernWall) {
                                if (game.level?.flags?.is_maze_lev) {
                                    digLoc.typ = ROOM;
                                    digLoc.flags = 0;
                                } else if (game.level?.flags?.is_cavernous_lev && !game.level?.flags?.has_town) {
                                    digLoc.typ = CORR;
                                    digLoc.flags = 0;
                                } else {
                                    digLoc.typ = DOOR;
                                    digLoc.doormask = D_NODOOR;
                                }
                            } else {
                                digLoc.typ = wasTree ? ROOM : CORR;
                                digLoc.flags = 0;
                            }
                            if (!wasWall && !wasTree && pile && pile < 5) {
                                const otyp = pile === 1 ? BOULDER : ROCK;
                                const debris = mksobj(otyp, true, false);
                                Object.assign(debris, {
                                    ox: mon.mx,
                                    oy: mon.my,
                                    glyph: otyp === BOULDER ? '`' : '*',
                                    color: NO_COLOR,
                                });
                                game.level.objects.push(debris);
                            }
                            vision_reset();
                            vision_recalc(0);
                            newsym(mon.mx, mon.my);
                        }
                    }
	                    if (movedByMonster) {
	                        moveEndedTurn = moveEndedTurn || monsterPickStuff(mon, monIndex, somebodyCanMove);
	                        if (game._message_more && !game._process_time_with_more) return false;
	                    }
                    maybeSpinMonsterWeb(mon);
                    if (maybeQueueQuestTalk(mon, { inBattle: questBattleAtTurnStart })) return false;
                    const throwTargetX = mon.mux ?? game.u?.ux ?? mon.mx;
                    const throwTargetY = mon.muy ?? game.u?.uy ?? mon.my;
                    const throwDx = Math.sign(throwTargetX - mon.mx);
                    const throwDy = Math.sign(throwTargetY - mon.my);
                    const throwRange = Math.max(Math.abs(mon.mx - throwTargetX), Math.abs(mon.my - throwTargetY));
                    const straightThrow = mon.mx === throwTargetX || mon.my === throwTargetY
                        || Math.abs(mon.mx - throwTargetX) === Math.abs(mon.my - throwTargetY);
                    const silverDaggerIndex = mon.minvent?.findIndex(item =>
                        item.kind === 'silver dagger' || item.actualKind === 'silver dagger') ?? -1;
                    const plainDaggerIndex = silverDaggerIndex >= 0 ? silverDaggerIndex
                        : (mon.minvent?.findIndex(item => item.otyp === DAGGER || item.kind === 'dagger') ?? -1);
                    const canThrowPlainDagger = !mon._opened_door_this_move && !mon.mpeaceful && plainDaggerIndex >= 0
                        && throwRange > 1 && throwRange < BOLT_LIM && straightThrow
                        && clearPath(mon.mx, mon.my, throwTargetX, throwTargetY);
                    const orcishDaggerIndex = mon.minvent?.findIndex(item => item.otyp === ORCISH_DAGGER || item.kind === 'orcish dagger') ?? -1;
                    const canThrowOrcishDagger = !mon._opened_door_this_move && orcishDaggerIndex >= 0 && throwRange > 1 && throwRange < 8
                        && straightThrow && couldSeeCoord(mon.mx, mon.my);
                    const knifeIndex = mon.minvent?.findIndex(item => item.otyp === KNIFE || item.kind === 'knife') ?? -1;
                    const canThrowKnife = !mon._opened_door_this_move && !mon.mpeaceful && knifeIndex >= 0
                        && throwRange > 1 && throwRange < BOLT_LIM && straightThrow
                        && clearPath(mon.mx, mon.my, throwTargetX, throwTargetY);
                    const spearIndex = (() => {
                        let bestIndex = -1;
                        let bestRank = Infinity;
                        (mon.minvent || []).forEach((item, index) => {
                            const rank = monsterThrownSpearRank(item);
                            if (rank >= 0 && rank < bestRank) {
                                bestIndex = index;
                                bestRank = rank;
                            }
                        });
                        return bestIndex;
                    })();
                    const canThrowSpear = !mon._opened_door_this_move && !mon.mpeaceful && spearIndex >= 0
                        && throwRange > 1 && throwRange < BOLT_LIM && straightThrow
                        && clearPath(mon.mx, mon.my, throwTargetX, throwTargetY);
                    const shurikenIndex = mon.minvent?.findIndex(item => monsterThrownShurikenKind(item)) ?? -1;
                    const canThrowShuriken = !mon._opened_door_this_move && !mon.mpeaceful && shurikenIndex >= 0
                        && throwRange > 1 && throwRange < BOLT_LIM && straightThrow
                        && clearPath(mon.mx, mon.my, throwTargetX, throwTargetY);
                    const breathAttack = movedByMonster && !mon.mpeaceful && !mon._opened_door_this_move
                        && straightThrow && throwRange > 1 && throwRange < BOLT_LIM
                        && (mon.mx - throwTargetX) ** 2 + (mon.my - throwTargetY) ** 2 <= BOLT_LIM * BOLT_LIM
                        && !mon.mspec_used && !mon._breath_used_this_turn && MONSTER_BREATH_ATTACKS.get(mon.data?.name);
                    let postMoveDistFleeRoll = false;
                    if (breathAttack) {
                        rn2(5);
                        postMoveDistFleeRoll = true;
                    }
                    if (breathAttack && monsterLinedUp(mon, throwTargetX, throwTargetY)) {
                        maybeRedDragonFireBreath(mon, {
                            x: mon.mx,
                            y: mon.my,
                            dx: throwDx,
                            dy: throwDy,
                            remaining: 0,
                            heardGas: false,
                        }, breathAttack, monIndex, somebodyCanMove);
                        game._search_pending_count = 0;
                        game._run_steps_remaining = 0;
                        game._travel_keys = [];
                        if ((game._pending_time_passed || 0) > 2) game._pending_time_passed = 2;
                        if (game._message_more && !game._process_time_with_more) return false;
                        continue;
                    }
                    if ((game.level?.monsters || []).includes(mon)) {
                        if (!postMoveDistFleeRoll) rn2(5);
                        const postMoveTargetX = mon.mux ?? game.u?.ux ?? mon.mx;
                        const postMoveTargetY = mon.muy ?? game.u?.uy ?? mon.my;
                        const postMoveDist2 = (mon.mx - postMoveTargetX) ** 2 + (mon.my - postMoveTargetY) ** 2;
                        const postMoveGridBugDiagonal = mon.data?.name === 'grid bug'
                            && mon.mx !== postMoveTargetX && mon.my !== postMoveTargetY;
                        const postMoveNearby = postMoveDist2 < 3 && !postMoveGridBugDiagonal;
                        const ghostChecksOffensiveLine = mon.data?.name === 'ghost'
                            && !moveEndedTurn && !postMoveNearby && monsterWouldCheckOffensiveLine(mon)
                            && ((movedByMonster
                                    && !monsterHasDistanceAttackAvailable(mon)
                                    && !monsterHasWeaponAttack(mon))
                                || (!movedByMonster && !noStandardAttack));
                        if (ghostChecksOffensiveLine) {
                            monsterLinedUp(mon, postMoveTargetX, postMoveTargetY);
                        }
                        if (!movedByMonster && !moveEndedTurn && !mon.mpeaceful && !mon.mflee
                            && !noStandardAttack && postMoveDist2 <= BOLT_LIM * BOLT_LIM
                            && !postMoveNearby && (game.u?.uhp || 0) > 0) {
                            const targetAc = game.u?.uac ?? 10;
                            if (targetAc < 0) rnd(-targetAc);
                            continue;
                        }
                        const postMoveSling = !mon.mpeaceful && (mon.minvent || []).find(item =>
                            item.kind === 'sling' || item.actualKind === 'sling');
                        const postMoveSlingAmmoIndex = postMoveSling ? selectMonsterSlingAmmoIndex(mon) : -1;
                        if (movedByMonster && !game._prayer_force_pleased_heal
                            && postMoveSlingAmmoIndex >= 0 && throwRange >= 4 && throwRange < BOLT_LIM
                            && straightThrow && monsterLinedUp(mon, throwTargetX, throwTargetY)) {
                            const missile = mon.minvent[postMoveSlingAmmoIndex];
                            const missileName = monsterSlingAmmoName(missile);
                            const missileArticle = articleFor(missileName);
                            const missileArticleCap = `${missileArticle[0].toUpperCase()}${missileArticle.slice(1)}`;
                            const throwerVisible = !game.u?.blind && !mon.minvis && !mon.mundetected
                                && (game.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT)
                                && couldSeeCoord(mon.mx, mon.my);
                            const deferPrayerProjectile = !throwerVisible
                                && (game._pending_prayer_finish_message || game._prayer_occupation);
                            rnd(1);
                            if ((missile.quan || 1) > 1) {
                                missile.quan--;
                                if (mon.missile === missile) mon.missile.quan = missile.quan;
                                next_ident();
                            } else {
                                mon.minvent.splice(postMoveSlingAmmoIndex, 1);
                                if (mon.missile === missile) mon.missile = null;
                            }
                            if (throwerVisible) {
                                addToplineMessage(`${monsterDisplayName(mon, true)} shoots ${missileArticle} ${missileName}!`);
                                game._message_more = 1;
                                game._process_time_with_more = 0;
                            }
                            let slingTerrainStop = null;
                            for (let step = 1; step < throwRange; step++) {
                                const sx = mon.mx + throwDx * step;
                                const sy = mon.my + throwDy * step;
                                const remainingRange = throwRange - step;
                                const forcehit = !rn2(5);
                                if (remainingRange && forcehit
                                    && game.level?.at(sx + throwDx, sy + throwDy)?.typ === IRONBARS) {
                                    rn2(100); // C breaktest() calls obj_resists(); sling gems and stones survive here.
                                    if (!(game.u?._statusSuffix || '').includes('Deaf') && !(game.u?._deafTimeout || 0))
                                        addToplineMessage('Clonk!');
                                    slingTerrainStop = { x: sx, y: sy };
                                    break;
                                }
                            }
                            if (slingTerrainStop) {
                                const floorMessages = [];
                                landMonsterThrownObject(missile, slingTerrainStop.x, slingTerrainStop.y, {
                                    glyph: missile.glyph || '*',
                                    color: missile.color ?? NO_COLOR,
                                    messages: floorMessages,
                                });
                                addMonsterThrownFloorMessages(floorMessages, throwerVisible && !deferPrayerProjectile);
                            } else {
                                const catchChance = 100 - (game.u?.acurr?.a?.[A_DEX] ?? 10)
                                    - (game._startup_role === 'Monk' || game._startup_role === 'Rogue' ? 20 : 0);
                                const caught = !game.u?.blind && !game.u?.confusion && !game.u?.stunned
                                    && !game.u?.fumbling && rn2(Math.max(1, catchChance)) === 0;
                                if (caught) {
                                    const catchMessage = `You catch the ${missileName}!`;
                                    if (deferPrayerProjectile) {
                                        game._pending_message = `${catchMessage}  You finish your prayer.  You feel that ${game._prayer_god || 'your god'} is displeased.`;
                                        game._keep_pending_message = 1;
                                        game._prayer_message_complete_once = 1;
                                        game._skip_pending_time_decrement = 1;
                                        game._prayer_nearby_trouble = 0;
                                    } else if (throwerVisible) game._topline_after_more = catchMessage;
                                    else addToplineMessage(catchMessage);
                                } else {
                                    const damage = rnd(monsterSlingAmmoDamageSides(missile));
                                    const hitv = Math.max(-4, 3 - throwRange) + 8 + (missile.spe || 0);
                                    const attackRoll = rnd(20);
                                    const missed = (game.u?.uac ?? 10) + hitv <= attackRoll;
                                    let resultMessage = missed ? 'It misses.' : `You are hit by ${missileArticle} ${missileName}.`;
                                    if (missed && !game.u?.blind && game.flags?.verbose !== false) {
                                        resultMessage = (game.u?.uac ?? 10) + hitv <= attackRoll - 2
                                            ? `${missileArticleCap} ${missileName} misses you.`
                                            : `You are almost hit by ${missileArticle} ${missileName}.`;
                                    }
                                    if (deferPrayerProjectile) {
                                        game._pending_message = `${resultMessage}  You finish your prayer.  You feel that ${game._prayer_god || 'your god'} is displeased.`;
                                        game._keep_pending_message = 1;
                                        game._prayer_message_complete_once = 1;
                                        game._skip_pending_time_decrement = 1;
                                        game._prayer_nearby_trouble = 0;
                                    } else if (throwerVisible) game._topline_after_more = resultMessage;
                                    else addToplineMessage(resultMessage);
                                    if (!missed) {
                                        game._damage_after_topline_more = (game._damage_after_topline_more || 0) + damage;
                                        game._exercise_after_topline_more = (game._exercise_after_topline_more || 0) + 1;
                                    }
                                    if (missed) rn2(5);
                                    const floorMessages = [];
                                    landMonsterThrownObject(missile, game.u?.ux || 0, game.u?.uy || 0, {
                                        glyph: missile.glyph || '*',
                                        color: missile.color ?? NO_COLOR,
                                        messages: floorMessages,
                                        ohit: !missed,
                                    });
                                    addMonsterThrownFloorMessages(floorMessages, throwerVisible && !deferPrayerProjectile);
                                }
                            }
                            game._search_pending_count = 0;
                            game._run_steps_remaining = 0;
                            game._travel_keys = [];
                            if ((game._pending_time_passed || 0) > 2) game._pending_time_passed = 2;
                            if (game._message_more && !game._process_time_with_more) {
                                game._monster_resume_index = monIndex + 1;
                                game._monster_resume_somebody_can_move = somebodyCanMove;
                                return false;
                            }
                            continue;
                        }
							                        const postMoveHideCheck = mon.data?.mlet === ';' ? movedByMonster : attemptedMonsterMove;
							                        if (postMoveHideCheck && monsterUsesPostMoveHide(mon) && !hiderStayedUnder
                                                        && !(mon.data?.mlet === ';' && mon.mundetected)) {
	                                    hiderPostmoveRoll = rn2(5);
		                                }
					                    }
		                    if (moveEndedTurn) continue;
	                    if (movedByMonster && monsterUsesPostMoveHide(mon)) {
	                        const stack = (game.level?.objects || [])
	                            .filter(obj => !obj.transientProjectile && obj.ox === mon.mx && obj.oy === mon.my)
	                            .reverse();
	                        const trap = game.level?.traps?.find(t => t.tx === mon.mx && t.ty === mon.my);
	                        const wasDetected = !mon.mundetected;
	                        let canHide = mon.data?.mlet === ';'
	                            ? seaMonsterCanHideUnderWater(mon)
	                            : !!stack.length && (!trap || trap.ttyp === PIT || trap.ttyp === SPIKED_PIT);
	                        if (canHide && mon.data?.mlet !== ';'
	                            && (stack[0].otyp === GOLD_PIECE || stack[0].glyph === '$' || stack[0].cls === 'coin')) {
                            let coins = 0;
                            canHide = false;
                            for (const obj of stack) {
                                if (!(obj.otyp === GOLD_PIECE || obj.glyph === '$' || obj.cls === 'coin')) {
                                    canHide = true;
                                    break;
                                }
                                coins += obj.quan || 1;
                                if (coins >= 10) {
                                    canHide = true;
                                    break;
                                }
                            }
                        }
                        const willHide = !!(canHide && (mon.mundetected || hiderPostmoveRoll));
                        const hideVisibleToHero = willHide && wasDetected && !game.u?.blind
                            && (game.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT)
                            && couldSeeCoord(mon.mx, mon.my);
                        if (deferSplitPrayerHiding && hideVisibleToHero) {
                            const obj = stack[0];
                            const objectName = obj?.otyp === STATUE || obj?.kind === 'statue'
                                ? 'statue'
                                : obj?.otyp === BOULDER ? 'boulder' : pickupObjectName(obj || {});
                            const article = /^[aeiou]/i.test(objectName) ? 'an' : 'a';
                            const monName = monsterDisplayName(mon).replace(/^The /, 'the ');
                            const verb = mon.data?.mlet === 'S' || mon.data?.name === 'cobra' ? 'slither' : 'hide';
                            mon._split_prayer_deferred_hide_message = `You see ${monName} ${verb} under ${article} ${objectName}.`;
                        } else {
                            mon.mundetected = willHide;
                        }
                        if (!deferSplitPrayerHiding && mon.mundetected && hideVisibleToHero) {
                            const obj = stack[0];
                            const objectName = obj?.otyp === STATUE || obj?.kind === 'statue'
                                ? 'statue'
                                : obj?.otyp === BOULDER ? 'boulder' : pickupObjectName(obj || {});
                            const article = /^[aeiou]/i.test(objectName) ? 'an' : 'a';
                            const monName = monsterDisplayName(mon).replace(/^The /, 'the ');
                            const verb = mon.data?.mlet === 'S' || mon.data?.name === 'cobra' ? 'slither' : 'hide';
                            addToplineMessage(`You see ${monName} ${verb} under ${article} ${objectName}.`);
                        }
	                        newsym(mon.mx, mon.my);
	                    }
                    const throwDist2 = (mon.mx - throwTargetX) ** 2 + (mon.my - throwTargetY) ** 2;
                    const nearThrowTarget = throwDist2 < 3
                        && !(mon.data?.name === 'grid bug' && throwTargetX !== mon.mx && throwTargetY !== mon.my);
	                    const canThrowDart = mon.data?.name === 'kobold' && mon.missile?.otyp === DART && mon.missile.quan > 0
	                        && throwRange > 1 && throwRange <= 4 && straightThrow;
                    let offensivePotionIndex = -1;
                    for (let i = 0; i < (mon.minvent || []).length; i++) {
                        const item = mon.minvent[i];
                        if ([POT_PARALYSIS, POT_BLINDNESS, POT_CONFUSION, POT_SLEEPING, POT_ACID].includes(item.otyp))
                            offensivePotionIndex = i;
                    }
                    const canThrowOffensivePotion = !mon.mpeaceful && offensivePotionIndex >= 0
                        && straightThrow && throwRange > 0 && throwRange < BOLT_LIM
                        && couldSeeCoord(mon.mx, mon.my);
                    const launcher = !mon.mw && !mon.mpeaceful && (mon.minvent || [])
                        .find(item => /^(?:bow|elven bow|orcish bow|yumi|crossbow)$/.test(String(item.kind || item.actualKind || '')));
                    const launcherKind = String(launcher?.kind || launcher?.actualKind || '');
                    const launcherAmmo = launcher && (mon.minvent || []).find(item => {
                        const kind = monsterLauncherProjectileKind(item).toLowerCase();
                        if (launcherKind === 'crossbow') return kind.includes('bolt');
                        return kind.includes('arrow') || kind === 'ya';
                    });
                    const canReadyLauncher = movedByMonster && !nearThrowTarget
                        && launcher && launcherAmmo && throwRange > 1
                        && throwDist2 <= BOLT_LIM * BOLT_LIM && !game.level?.flags?.rogue_level;
                    const activeLauncherKind = String(mon.mw?.kind || mon.mw?.actualKind || '');
	                    const activeLauncher = /^(?:bow|elven bow|orcish bow|yumi|crossbow)$/.test(activeLauncherKind);
	                    const launcherAmmoIndex = activeLauncher ? (mon.minvent || []).findIndex(item => {
	                        const kind = monsterLauncherProjectileKind(item).toLowerCase();
	                        if (activeLauncherKind === 'crossbow') return kind.includes('bolt');
	                        return kind.includes('arrow') || kind === 'ya';
	                    }) : -1;
	                    const canShootLauncher = movedByMonster && !nearThrowTarget
	                        && launcherAmmoIndex >= 0 && throwRange > 1 && throwRange < BOLT_LIM
	                        && throwDist2 <= BOLT_LIM * BOLT_LIM && !game.level?.flags?.rogue_level;
                    const canUseMovedRangedMagic = (mon.data?.spellcaster || mon.data?.name === 'gnomish wizard')
                        && !mon._moved_ranged_magic_used;
                    const canSpitVenom = !mon.mpeaceful && mon.data?.name === 'cobra'
                        && !mon._opened_door_this_move && !nearThrowTarget
                        && throwRange > 1 && throwRange < BOLT_LIM && straightThrow;
                    const canUseMovedWeaponAttack = movedByMonster && !nearThrowTarget && mon.data?.armed
                        && (mon.data?.mercenary || mon.mw || !game._armor_wear_occupation);
                    const canUseWeaponAttack = !game.level?.flags?.rogue_level
                        && (canThrowSpear || canThrowShuriken || canThrowPlainDagger || canThrowOrcishDagger
                            || canThrowKnife || canThrowDart);
                    const canSelectRangedWeapon = canUseWeaponAttack;
                    const canCheckOffensiveItems = !mon.data?.mindless && !mon.data?.nohands && !mon.mpeaceful;
                    let offensiveItemsLinedUp = false;
                    let rangedWeaponLinedUp = false;
                    let consumedMattackuAc = false;
                    if (!moveEndedTurn && !mon.mpeaceful && (game.u?.uhp || 0) > 0
                        && throwDist2 <= BOLT_LIM * BOLT_LIM
                        && (canUseWeaponAttack || canUseMovedWeaponAttack || canSelectRangedWeapon || canThrowOffensivePotion
                            || (!nearby && canUseMovedRangedMagic) || canSpitVenom)) {
                        const targetAc = game.u?.uac ?? 10;
                        if (targetAc < 0) {
                            rnd(-targetAc);
                            if (movedByMonster && canUseMovedRangedMagic) mon._moved_ranged_magic_used = 1;
                            consumedMattackuAc = true;
                        }
                        if (canCheckOffensiveItems)
                            offensiveItemsLinedUp = monsterLinedUp(mon, throwTargetX, throwTargetY);
                        if (canSelectRangedWeapon)
                            rangedWeaponLinedUp = monsterLinedUp(mon, throwTargetX, throwTargetY);
                    }
                    if (canSpitVenom && monsterLinedUp(mon, throwTargetX, throwTargetY)) {
                        next_ident();
                        mon._spit_no_balk = 1;
                        const spitRoll = rn2(BOLT_LIM - throwRange);
                        if (!spitRoll) {
                            const visibleSpitter = !game.u?.blind && couldSeeCoord(mon.mx, mon.my) && !mon.minvis && !mon.mundetected;
                            if (visibleSpitter) {
                                addToplineMessage(`${monsterDisplayName(mon, true)} spits venom!`);
                                recordDiscovery('Venoms', 'splash of venom', null, false);
                            }
                            for (let step = 1; step < throwRange; step++) rn2(5);
                            const attackRoll = rnd(20);
                            if (attackRoll === 20) {
                                if (visibleSpitter) addToplineMessage('It misses.');
                                rn2(5);
                                rn2(100);
                            }
                        }
                        game._search_pending_count = 0;
                        game._run_steps_remaining = 0;
                        game._travel_keys = [];
                        if ((game._pending_time_passed || 0) > 2) game._pending_time_passed = 2;
                        if (game._message_more && !game._process_time_with_more) {
                        game._monster_resume_index = monIndex + 1;
                        game._monster_resume_somebody_can_move = somebodyCanMove;
                        return false;
                    }
                        continue;
                    }
                    if (canReadyLauncher && !((canThrowSpear || canThrowShuriken) && rangedWeaponLinedUp)) {
                        mon.mw = launcher;
                        if (!game.u?.blind && couldSeeCoord(mon.mx, mon.my) && !mon.minvis && !mon.mundetected) {
                            const article = /^[aeiou]/i.test(launcherKind) ? 'an' : 'a';
                            addToplineMessage(`${monsterDisplayName(mon, true)} wields ${article} ${launcherKind}!`);
                            if (game._message_more && !game._process_time_with_more) return false;
                        }
                        continue;
                    }
                    if (canShootLauncher && !((canThrowSpear || canThrowShuriken) && rangedWeaponLinedUp)
                        && !(canThrowOffensivePotion && offensiveItemsLinedUp)
                        && monsterLinedUp(mon, throwTargetX, throwTargetY)) {
                        const missile = mon.minvent[launcherAmmoIndex];
                        if ((missile.quan || 1) > 1) rnd(1);
                        const missileQuan = missile.quan || 1;
                        let thrownMissile = missile;
                        if (missileQuan > 1) {
                            missile.quan--;
                            thrownMissile = { ...missile, id: next_ident(), quan: 1 };
                        } else {
                            mon.minvent.splice(launcherAmmoIndex, 1);
                            if (mon.missile === missile) mon.missile = null;
                        }
                        const missileSpe = missile.spe || 0;
                        const missileErosion = Math.max(0, Math.trunc(Number(thrownMissile.oeroded || 0)),
                            Math.trunc(Number(thrownMissile.oeroded2 || 0)));
                        const coveredBlessedEnchantedArrow = thrownMissile.blessed
                            && (missileSpe === 1 || missileSpe === 2);
                        const coveredArrowState = missileSpe === 0 || coveredBlessedEnchantedArrow
                            || (!thrownMissile.blessed && (missileSpe === 1 || missileSpe === 2));
                        const coveredErodedArrowState = !thrownMissile.blessed
                            || missileSpe === 0 || coveredBlessedEnchantedArrow;
                        const coveredErosionState = !missileErosion || coveredErodedArrowState;
                        const sharedArrowLanding = coveredArrowState && coveredErosionState;
                        const projectileKind = monsterLauncherProjectileKind(thrownMissile);
                        const projectileArticle = /^[aeiou]/i.test(projectileKind) ? 'an' : 'a';
                        const projectileArticleCap = projectileArticle[0].toUpperCase() + projectileArticle.slice(1);
                        addToplineMessage(`${monsterDisplayName(mon, true)} shoots ${projectileArticle} ${projectileKind}!`);
                        game._message_more = 1;
                        game._process_time_with_more = 0;
                        const ironBarsImpactSound = () => {
                            const material = String(thrownMissile.material || thrownMissile.oc_material || '')
                                .toLowerCase().replace(/^hi_/, '');
                            return thrownMissile.cls === 'coin' || thrownMissile.otyp === GOLD_PIECE
                                || thrownMissile.glyph === '$' || material === 'gold' || material === 'silver'
                                ? 'Clink!' : 'Clonk!';
                        };
                        const landAimedArrow = (x, y) => {
                            const floorMessages = [];
                            landMonsterThrownObject(thrownMissile, x, y, {
                                glyph: thrownMissile.glyph || ')',
                                color: thrownMissile.color ?? CLR_CYAN,
                                messages: floorMessages,
                                ohit: false,
                            });
                            addMonsterThrownFloorMessages(floorMessages);
                        };
                        if ((thrownMissile.cursed || thrownMissile.greased) && !rn2(7)) {
                            addToplineMessage(`${monsterDisplayName(mon, true)} misfires!`);
                            const misfireDx = rn2(3) - 1;
                            const misfireDy = rn2(3) - 1;
                            const landMisfiredArrow = (x, y) => {
                                const floorMessages = [];
                                landMonsterThrownObject(thrownMissile, x, y, {
                                    glyph: thrownMissile.glyph || ')',
                                    color: thrownMissile.color ?? CLR_CYAN,
                                    messages: floorMessages,
                                    ohit: false,
                                });
                                addMonsterThrownFloorMessages(floorMessages);
                            };
                            if (!misfireDx && !misfireDy) {
                                landMisfiredArrow(mon.mx, mon.my);
                                game._search_pending_count = 0;
                                game._run_steps_remaining = 0;
                                game._travel_keys = [];
                                game._monster_resume_index = monIndex + 1;
                                game._monster_resume_somebody_can_move = somebodyCanMove;
                                return false;
                            }
                            if (misfireDx !== throwDx || misfireDy !== throwDy) {
                                const ordinaryBlockAhead = (x, y) => {
                                    const nx = x + misfireDx;
                                    const ny = y + misfireDy;
                                    const loc = game.level?.at(nx, ny);
                                    return nx < 1 || nx > COLNO - 1 || ny < 0 || ny > ROWNO - 1
                                        || !loc || IS_OBSTRUCTED(loc.typ)
                                        || (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED)));
                                };
                                let landingX = mon.mx;
                                let landingY = mon.my;
                                if (!ordinaryBlockAhead(landingX, landingY)) {
                                    for (let step = 0; step < throwRange; step++) {
                                        landingX += misfireDx;
                                        landingY += misfireDy;
                                        const remainingRange = throwRange - step - 1;
                                        const forcehit = !rn2(5);
                                        const hitIronBars = remainingRange && forcehit
                                            && game.level?.at(landingX + misfireDx, landingY + misfireDy)?.typ === IRONBARS;
                                        if (hitIronBars) {
                                            rn2(100); // C breaktest() calls obj_resists(); ordinary arrows still survive.
                                            if (!(game.u?._statusSuffix || '').includes('Deaf') && !(game.u?._deafTimeout || 0))
                                                addToplineMessage(ironBarsImpactSound());
                                        }
                                        const stoppedOnSink = remainingRange
                                            && game.level?.at(landingX, landingY)?.typ === SINK;
                                        if (stoppedOnSink && !game.u?.blind && cansee(landingX, landingY)) {
                                            const sinkVerb = (game.u?._statusSuffix || '').includes('Hallu')
                                                ? 'plops' : 'drops';
                                            addToplineMessage(`The ${projectileKind} ${sinkVerb} onto the sink.`);
                                        }
                                        if (!remainingRange || hitIronBars || stoppedOnSink
                                            || ordinaryBlockAhead(landingX, landingY)) break;
                                    }
                                }
                                landMisfiredArrow(landingX, landingY);
                                game._search_pending_count = 0;
                                game._run_steps_remaining = 0;
                                game._travel_keys = [];
                                game._monster_resume_index = monIndex + 1;
                                game._monster_resume_somebody_can_move = somebodyCanMove;
                                return false;
                            }
                        }
                        const ordinaryAimedBlockAhead = (x, y) => {
                            const nx = x + throwDx;
                            const ny = y + throwDy;
                            const loc = game.level?.at(nx, ny);
                            return nx < 1 || nx > COLNO - 1 || ny < 0 || ny > ROWNO - 1
                                || !loc || IS_OBSTRUCTED(loc.typ)
                                || (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED)));
                        };
                        if (ordinaryAimedBlockAhead(mon.mx, mon.my)) {
                            landAimedArrow(mon.mx, mon.my);
                            game._search_pending_count = 0;
                            game._run_steps_remaining = 0;
                            game._travel_keys = [];
                            game._monster_resume_index = monIndex + 1;
                            game._monster_resume_somebody_can_move = somebodyCanMove;
                            return false;
                        }
                        let aimedTerrainStop = null;
                        for (let step = 1; step < throwRange; step++) {
                            const sx = mon.mx + throwDx * step;
                            const sy = mon.my + throwDy * step;
                            const remainingRange = throwRange - step;
                            const forcehit = !rn2(5);
                            const hitIronBars = remainingRange && forcehit
                                && game.level?.at(sx + throwDx, sy + throwDy)?.typ === IRONBARS;
                            if (hitIronBars) {
                                rn2(100); // C breaktest() calls obj_resists(); ordinary arrows still survive.
                                if (!(game.u?._statusSuffix || '').includes('Deaf') && !(game.u?._deafTimeout || 0))
                                    addToplineMessage(ironBarsImpactSound());
                                aimedTerrainStop = { x: sx, y: sy };
                                break;
                            }
                            const stoppedOnSink = remainingRange
                                && game.level?.at(sx, sy)?.typ === SINK;
                            if (stoppedOnSink) {
                                if (!game.u?.blind && cansee(sx, sy)) {
                                    const sinkVerb = (game.u?._statusSuffix || '').includes('Hallu')
                                        ? 'plops' : 'drops';
                                    addToplineMessage(`The ${projectileKind} ${sinkVerb} onto the sink.`);
                                }
                                aimedTerrainStop = { x: sx, y: sy };
                                break;
                            }
                            if (remainingRange && ordinaryAimedBlockAhead(sx, sy)) {
                                aimedTerrainStop = { x: sx, y: sy };
                                break;
                            }
                        }
                        if (aimedTerrainStop) {
                            landAimedArrow(aimedTerrainStop.x, aimedTerrainStop.y);
                            game._search_pending_count = 0;
                            game._run_steps_remaining = 0;
                            game._travel_keys = [];
                            game._monster_resume_index = monIndex + 1;
                            game._monster_resume_somebody_can_move = somebodyCanMove;
                            return false;
                        }
                        const flightX = (game.u?.ux || 0) - throwDx;
                        const flightY = (game.u?.uy || 0) - throwDy;
                        game.level.objects.push({
                            ...thrownMissile,
                            ox: flightX,
                            oy: flightY,
                            quan: 1,
                            glyph: ')',
                            color: CLR_CYAN,
                            transientProjectile: true,
                        });
                        game._clear_transient_projectiles_after_more = 1;
                        newsym(flightX, flightY);
                        const catchChance = 100 - (game.u?.acurr?.a?.[A_DEX] ?? 10)
                            - (game._startup_role === 'Monk' || game._startup_role === 'Rogue' ? 20 : 0);
                        const caught = !game.u?.blind && !game.u?.confusion && !game.u?.stunned
                            && !game.u?.fumbling && rn2(Math.max(1, catchChance)) === 0;
                        if (caught) {
                            game._topline_after_more = `You catch the ${projectileKind}!`;
                        } else {
                            const projectileDamageSides = monsterLauncherProjectileDamageSides(thrownMissile);
                            const projectileDamageBonus = monsterLauncherProjectileDamageBonus(thrownMissile);
                            let damage = rnd(projectileDamageSides) + projectileDamageBonus
                                + missileSpe - missileErosion;
                            let hitv = Math.max(-4, 3 - throwRange) + 8 + missileSpe;
                            if (monsterIsElf(mon) && monsterLauncherProjectileIsBowAmmo(thrownMissile)) {
                                hitv++;
                                if (monsterLauncherWeaponIsElvenBow(mon.mw)) hitv++;
                                if (monsterLauncherProjectileIsElvenArrow(thrownMissile)) damage++;
                            }
                            damage = Math.max(1, damage);
                            const missed = (game.u?.uac ?? 10) + hitv <= rnd(20);
                            game._topline_after_more = missed ? `${projectileArticleCap} ${projectileKind} misses you.`
                                : `You are hit by ${projectileArticle} ${projectileKind}${damage > 4 ? '!' : '.'}`;
                            if (!missed) {
                                if (damage >= (game.u?.uhp || 0)) {
                                    game._lethal_arrow_after_topline_more = {
                                        damage,
                                        holdStatusHp: (game.u?.uhp || 0) - damage === -1,
                                        currentMove: true,
                                        deathCleanupThrownObject: thrownMissile,
                                        deathCleanupGlyph: thrownMissile.glyph || ')',
                                    };
                                    game._death_cause = `killed by ${projectileArticle} ${projectileKind}`;
                                } else {
                                    game._damage_after_topline_more = (game._damage_after_topline_more || 0) + damage;
                                    game._exercise_after_topline_more = (game._exercise_after_topline_more || 0) + 1;
                                    if (sharedArrowLanding) {
                                        game._arrow_drop_throw_after_topline_more = {
                                            missile: thrownMissile,
                                            x: game.u?.ux || 0,
                                            y: game.u?.uy || 0,
                                            ohit: true,
                                        };
                                    } else {
                                        game._arrow_mulch_after_topline_more = 1;
                                    }
                                }
                            } else {
                                rn2(5);
                                if (sharedArrowLanding) {
                                    game._arrow_drop_throw_after_topline_more = {
                                        missile: thrownMissile,
                                        x: game.u?.ux || 0,
                                        y: game.u?.uy || 0,
                                        ohit: false,
                                    };
                                }
                            }
                        }
                        game._search_pending_count = 0;
                        game._run_steps_remaining = 0;
                        game._travel_keys = [];
                        game._monster_resume_index = monIndex + 1;
                        game._monster_resume_somebody_can_move = somebodyCanMove;
                        return false;
                    }
                    if (canThrowSpear && rangedWeaponLinedUp) {
                        const targetAc = game.u?.uac ?? 10;
                        if (targetAc < 0 && !consumedMattackuAc) rnd(-targetAc);

                        const missile = mon.minvent[spearIndex];
                        const spearKind = monsterThrownSpearKind(missile);
                        const spearArticle = /^[aeiou]/i.test(spearKind) ? 'an' : 'a';
                        const spearArticleCap = spearArticle[0].toUpperCase() + spearArticle.slice(1);
                        const spearMaterial = String(missile.material || missile.oc_material || '')
                            .toLowerCase().replace(/^hi_/, '');
                        const spearBarsSound = spearKind === 'silver spear' || spearMaterial === 'silver'
                            ? 'Clink!' : 'Clonk!';
                        const missileSpe = Math.trunc(Number(missile.spe || 0));
                        const missileErosion = Math.max(0, Math.trunc(Number(missile.oeroded || 0)),
                            Math.trunc(Number(missile.oeroded2 || 0)));
                        if ((missile.quan || 1) > 1) missile.quan--;
                        else {
                            mon.minvent.splice(spearIndex, 1);
                            if (mon.missile === missile) mon.missile = null;
                        }
                        const throwerVisible = !game.u?.blind
                            && !!(game.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT)
                            && !mon.minvis;
                        if (throwerVisible) {
                            addToplineMessage(`${monsterDisplayName(mon)} throws ${spearArticle} ${spearKind}!`);
                            game._message_more = 1;
                            game._process_time_with_more = 0;
                        }

                        let spearTerrainStop = null;
                        for (let step = 1; step < throwRange; step++) {
                            const sx = mon.mx + throwDx * step;
                            const sy = mon.my + throwDy * step;
                            const remainingRange = throwRange - step;
                            const forcehit = !rn2(5);
                            if (remainingRange && forcehit
                                && game.level?.at(sx + throwDx, sy + throwDy)?.typ === IRONBARS) {
                                rn2(100); // C forcehit is the only way P_SPEAR hits bars.
                                if (!(game.u?._statusSuffix || '').includes('Deaf') && !(game.u?._deafTimeout || 0))
                                    addToplineMessage(spearBarsSound);
                                spearTerrainStop = { x: sx, y: sy };
                                break;
                            }
                        }
                        if (spearTerrainStop) {
                            const floorMessages = [];
                            landMonsterThrownObject(missile, spearTerrainStop.x, spearTerrainStop.y, {
                                glyph: ')',
                                color: missile.color ?? CLR_CYAN,
                                messages: floorMessages,
                            });
                            addMonsterThrownFloorMessages(floorMessages, throwerVisible);
                        } else {
                            const catchChance = 100 - (game.u?.acurr?.a?.[A_DEX] ?? 10)
                                - (game._startup_role === 'Monk' || game._startup_role === 'Rogue' ? 20 : 0);
                            const caught = !game.u?.blind && !game.u?.confusion && !game.u?.stunned
                                && !game.u?.fumbling && rn2(Math.max(1, catchChance)) === 0;
                            if (caught) {
                                const catchMessage = `You catch the ${spearKind}!`;
                                if (throwerVisible) game._topline_after_more = catchMessage;
                                else addToplineMessage(catchMessage);
                            } else {
                                const damage = Math.max(1, rnd(monsterThrownSpearDamageSides(missile))
                                    + missileSpe - missileErosion);
                                const hitv = Math.max(-4, 3 - throwRange) + 8 + missileSpe;
                                const attackRoll = rnd(20);
                                const missed = (game.u?.uac ?? 10) + hitv <= attackRoll;
                                let resultMessage = `You are hit by ${spearArticle} ${spearKind}${damage > 4 ? '!' : '.'}`;
                                if (missed) {
                                    resultMessage = game.u?.blind || game.flags?.verbose === false
                                        ? 'It misses.'
                                        : (game.u?.uac ?? 10) + hitv <= attackRoll - 2
                                            ? `${spearArticleCap} ${spearKind} misses you.`
                                            : `You are almost hit by ${spearArticle} ${spearKind}.`;
                                }
                                if (throwerVisible) game._topline_after_more = resultMessage;
                                else addToplineMessage(resultMessage);
                                if (!missed) {
                                    game._damage_after_topline_more = (game._damage_after_topline_more || 0) + damage;
                                    game._exercise_after_topline_more = (game._exercise_after_topline_more || 0) + 1;
                                }
                                rn2(5);
                                const floorMessages = [];
                                landMonsterThrownObject(missile, game.u?.ux || 0, game.u?.uy || 0, {
                                    glyph: ')',
                                    color: missile.color ?? CLR_CYAN,
                                    messages: floorMessages,
                                    ohit: !missed,
                                });
                                addMonsterThrownFloorMessages(floorMessages, throwerVisible);
                            }
                        }
                        game._search_pending_count = 0;
                        game._run_steps_remaining = 0;
                        game._travel_keys = [];
                        if ((game._pending_time_passed || 0) > 2) game._pending_time_passed = 2;
                        if (game._message_more && !game._process_time_with_more) {
                            game._monster_resume_index = monIndex + 1;
                            game._monster_resume_somebody_can_move = somebodyCanMove;
                            return false;
                        }
                        continue;
                    }
                    if (canThrowShuriken && rangedWeaponLinedUp) {
                        const targetAc = game.u?.uac ?? 10;
                        if (targetAc < 0 && !consumedMattackuAc) rnd(-targetAc);

                        const missile = mon.minvent[shurikenIndex];
                        const shurikenKind = monsterThrownShurikenKind(missile) || 'shuriken';
                        const shurikenArticle = /^[aeiou]/i.test(shurikenKind) ? 'an' : 'a';
                        const shurikenArticleCap = shurikenArticle[0].toUpperCase() + shurikenArticle.slice(1);
                        const missileSpe = Math.trunc(Number(missile.spe || 0));
                        const missileErosion = Math.max(0, Math.trunc(Number(missile.oeroded || 0)),
                            Math.trunc(Number(missile.oeroded2 || 0)));
                        if ((missile.quan || 1) > 1) missile.quan--;
                        else {
                            mon.minvent.splice(shurikenIndex, 1);
                            if (mon.missile === missile) mon.missile = null;
                        }
                        const throwerVisible = !game.u?.blind
                            && !!(game.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT)
                            && !mon.minvis;
                        if (throwerVisible) {
                            addToplineMessage(`${monsterDisplayName(mon)} throws ${shurikenArticle} ${shurikenKind}!`);
                            game._message_more = 1;
                            game._process_time_with_more = 0;
                        }

                        let shurikenTerrainStop = null;
                        for (let step = 1; step < throwRange; step++) {
                            const sx = mon.mx + throwDx * step;
                            const sy = mon.my + throwDy * step;
                            const remainingRange = throwRange - step;
                            const forcehit = !rn2(5);
                            if (remainingRange && forcehit
                                && game.level?.at(sx + throwDx, sy + throwDy)?.typ === IRONBARS) {
                                rn2(100); // C breaktest() calls obj_resists(); ordinary shuriken survive here.
                                if (!(game.u?._statusSuffix || '').includes('Deaf') && !(game.u?._deafTimeout || 0))
                                    addToplineMessage('Clonk!');
                                shurikenTerrainStop = { x: sx, y: sy };
                                break;
                            }
                        }
                        if (shurikenTerrainStop) {
                            const floorMessages = [];
                            landMonsterThrownObject(missile, shurikenTerrainStop.x, shurikenTerrainStop.y, {
                                glyph: ')',
                                color: missile.color ?? CLR_CYAN,
                                messages: floorMessages,
                            });
                            addMonsterThrownFloorMessages(floorMessages, throwerVisible);
                        } else {
                            const catchChance = 100 - (game.u?.acurr?.a?.[A_DEX] ?? 10)
                                - (game._startup_role === 'Monk' || game._startup_role === 'Rogue' ? 20 : 0);
                            const caught = !game.u?.blind && !game.u?.confusion && !game.u?.stunned
                                && !game.u?.fumbling && rn2(Math.max(1, catchChance)) === 0;
                            if (caught) {
                                const catchMessage = `You catch the ${shurikenKind}!`;
                                if (throwerVisible) game._topline_after_more = catchMessage;
                                else addToplineMessage(catchMessage);
                            } else {
                                const damage = Math.max(1, rnd(8) + missileSpe - missileErosion);
                                const hitv = Math.max(-4, 3 - throwRange) + 8 + missileSpe;
                                const attackRoll = rnd(20);
                                const missed = (game.u?.uac ?? 10) + hitv <= attackRoll;
                                let resultMessage = `You are hit by ${shurikenArticle} ${shurikenKind}${damage > 4 ? '!' : '.'}`;
                                if (missed) {
                                    resultMessage = game.u?.blind || game.flags?.verbose === false
                                        ? 'It misses.'
                                        : (game.u?.uac ?? 10) + hitv <= attackRoll - 2
                                            ? `${shurikenArticleCap} ${shurikenKind} misses you.`
                                            : `You are almost hit by ${shurikenArticle} ${shurikenKind}.`;
                                }
                                if (throwerVisible) game._topline_after_more = resultMessage;
                                else addToplineMessage(resultMessage);
                                if (!missed) {
                                    game._damage_after_topline_more = (game._damage_after_topline_more || 0) + damage;
                                    game._exercise_after_topline_more = (game._exercise_after_topline_more || 0) + 1;
                                }
                                rn2(5);
                                const floorMessages = [];
                                landMonsterThrownObject(missile, game.u?.ux || 0, game.u?.uy || 0, {
                                    glyph: ')',
                                    color: missile.color ?? CLR_CYAN,
                                    messages: floorMessages,
                                    ohit: !missed,
                                });
                                addMonsterThrownFloorMessages(floorMessages, throwerVisible);
                            }
                        }
                        game._search_pending_count = 0;
                        game._run_steps_remaining = 0;
                        game._travel_keys = [];
                        if ((game._pending_time_passed || 0) > 2) game._pending_time_passed = 2;
                        if (game._message_more && !game._process_time_with_more) {
                            game._monster_resume_index = monIndex + 1;
                            game._monster_resume_somebody_can_move = somebodyCanMove;
                            return false;
                        }
                        continue;
                    }
                    if (canThrowPlainDagger && rangedWeaponLinedUp) {
                        const targetAc = game.u?.uac ?? 10;
                        if (targetAc < 0 && !consumedMattackuAc) rnd(-targetAc);

                        const missile = mon.minvent[plainDaggerIndex];
                        const daggerKind = String(missile.actualKind || missile.kind || 'dagger');
                        const daggerArticle = /^[aeiou]/i.test(daggerKind) ? 'an' : 'a';
                        const daggerArticleCap = daggerArticle[0].toUpperCase() + daggerArticle.slice(1);
                        const daggerMaterial = String(missile.material || missile.oc_material || '').toLowerCase();
                        const daggerBarsSound = daggerKind === 'silver dagger' || daggerMaterial === 'silver' ? 'Clink!' : 'Clonk!';
                        if ((missile.quan || 1) > 1) missile.quan--;
                        else {
                            mon.minvent.splice(plainDaggerIndex, 1);
                            if (mon.missile === missile) mon.missile = null;
                        }
                        const throwerVisible = !game.u?.blind
                            && !!(game.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT)
                            && !mon.minvis;
                        if (throwerVisible) {
                            addToplineMessage(`${monsterDisplayName(mon)} throws ${daggerArticle} ${daggerKind}!`);
                            game._message_more = 1;
                            game._process_time_with_more = 0;
                        }

                        let daggerTerrainStop = null;
                        if (game.level?.at(mon.mx + throwDx, mon.my + throwDy)?.typ === IRONBARS) {
                            rn2(100); // C breaktest() calls obj_resists(); ordinary daggers still survive.
                            if (!(game.u?._statusSuffix || '').includes('Deaf') && !(game.u?._deafTimeout || 0))
                                addToplineMessage(daggerBarsSound);
                            daggerTerrainStop = { x: mon.mx, y: mon.my };
                        } else {
                            for (let step = 1; step < throwRange; step++) {
                                const sx = mon.mx + throwDx * step;
                                const sy = mon.my + throwDy * step;
                                const remainingRange = throwRange - step;
                                rn2(5);
                                if (remainingRange && game.level?.at(sx + throwDx, sy + throwDy)?.typ === IRONBARS) {
                                    rn2(100); // C consumes forcehit first; P_DAGGER then hits bars by class.
                                    if (!(game.u?._statusSuffix || '').includes('Deaf') && !(game.u?._deafTimeout || 0))
                                        addToplineMessage(daggerBarsSound);
                                    daggerTerrainStop = { x: sx, y: sy };
                                    break;
                                }
                            }
                        }
                        if (daggerTerrainStop) {
                            const floorMessages = [];
                            landMonsterThrownObject(missile, daggerTerrainStop.x, daggerTerrainStop.y, {
                                glyph: ')',
                                color: CLR_CYAN,
                                messages: floorMessages,
                            });
                            addMonsterThrownFloorMessages(floorMessages, throwerVisible);
                        } else {
                            const catchChance = 100 - (game.u?.acurr?.a?.[A_DEX] ?? 10)
                                - (game._startup_role === 'Monk' || game._startup_role === 'Rogue' ? 20 : 0);
                            const caught = !game.u?.blind && !game.u?.confusion && !game.u?.stunned
                                && !game.u?.fumbling && rn2(Math.max(1, catchChance)) === 0;
                            if (caught) {
                                const catchMessage = `You catch the ${daggerKind}!`;
                                if (throwerVisible) game._topline_after_more = catchMessage;
                                else addToplineMessage(catchMessage);
                            } else {
                                const damage = rnd(4);
                                const hitv = Math.max(-4, 3 - throwRange) + 8 + (missile.spe || 0);
                                const attackRoll = rnd(20);
                                const missed = (game.u?.uac ?? 10) + hitv <= attackRoll;
                                const resultMessage = missed
                                    ? `${daggerArticleCap} ${daggerKind} misses you.`
                                    : `You are hit by ${daggerArticle} ${daggerKind}.`;
                                if (throwerVisible) game._topline_after_more = resultMessage;
                                else addToplineMessage(resultMessage);
                                if (!missed) {
                                    game._damage_after_topline_more = (game._damage_after_topline_more || 0) + damage;
                                    game._exercise_after_topline_more = (game._exercise_after_topline_more || 0) + 1;
                                }
                                rn2(5);
                                const floorMessages = [];
                                landMonsterThrownObject(missile, game.u?.ux || 0, game.u?.uy || 0, {
                                    glyph: ')',
                                    color: CLR_CYAN,
                                    messages: floorMessages,
                                    ohit: !missed,
                                });
                                addMonsterThrownFloorMessages(floorMessages, throwerVisible);
                            }
                        }
                        game._search_pending_count = 0;
                        game._run_steps_remaining = 0;
                        game._travel_keys = [];
                        if ((game._pending_time_passed || 0) > 2) game._pending_time_passed = 2;
                        if (game._message_more && !game._process_time_with_more) {
                            game._monster_resume_index = monIndex + 1;
                            game._monster_resume_somebody_can_move = somebodyCanMove;
                            return false;
                        }
                        continue;
                    }
	                    if (canThrowOffensivePotion && offensiveItemsLinedUp) {
                        const potion = mon.minvent[offensivePotionIndex];
                        if ((potion.quan || 1) > 1) potion.quan--;
                        else mon.minvent.splice(offensivePotionIndex, 1);

                        const throwerVisible = !game.u?.blind && (game.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT) && !mon.minvis;
                        if (throwerVisible) addToplineMessage(`${monsterDisplayName(mon)} hurls a potion!`);
                        for (let step = 1; step < throwRange; step++) rn2(5);
                        const projectileX = (game.u?.ux || 0) - throwDx;
                        const projectileY = (game.u?.uy || 0) - throwDy;
                        if (!game.u?.blind && (game.viz_array?.[projectileY]?.[projectileX] & IN_SIGHT)) {
                            game.level.objects.push({
                                ox: projectileX,
                                oy: projectileY,
                                quan: 1,
                                glyph: '!',
                                color: NO_COLOR,
                                transientProjectile: true,
                            });
                            newsym(projectileX, projectileY);
                        }

                        const catchChance = 100 - (game.u?.acurr?.a?.[A_DEX] ?? 10)
                            - (game._startup_role === 'Monk' || game._startup_role === 'Rogue' ? 20 : 0);
                        const caught = !game.u?.blind && !game.u?.confusion && !game.u?.stunned
                            && !game.u?.fumbling && rn2(Math.max(1, catchChance)) === 0;
                        if (caught) {
                            addToplineMessage('You catch the potion!');
                        } else {
                            const bottle = POTION_BOTTLE_NAMES[rn2(POTION_BOTTLE_NAMES.length)];
                            const damage = rnd(2);
                            game.u.uhp = Math.max(0, (game.u?.uhp || 0) - damage);
                            game._potion_breathe_after_more = { otyp: potion.otyp, potionIndex: potion.potionIndex };
                            game._pending_message = `The ${bottle} crashes on your head and breaks into shards.`;
                            game._message_more = 1;
                            game._process_time_with_more = 0;
                            game._keep_pending_message = 1;
                        }
                        game._search_pending_count = 0;
                        game._run_steps_remaining = 0;
                        game._travel_keys = [];
                        if ((game._pending_time_passed || 0) > 2) game._pending_time_passed = 2;
                        if (game._message_more && !game._process_time_with_more) {
                            game._monster_resume_index = monIndex + 1;
                            game._monster_resume_somebody_can_move = somebodyCanMove;
                            return false;
                        }
                        continue;
                    }
                    if (canThrowOrcishDagger && rangedWeaponLinedUp) {
                        let clearShot = true;
                        for (let step = 1; step < throwRange; step++) {
                            if (IS_OBSTRUCTED(game.level?.at(mon.mx + throwDx * step, mon.my + throwDy * step)?.typ ?? 0)) {
                                clearShot = false;
                                break;
                            }
                        }
                        if (clearShot) {
                            const heroDist = Math.max(Math.abs((game.u?.ux || 0) - mon.mx), Math.abs((game.u?.uy || 0) - mon.my));
                            const prevHeroDist = Math.max(Math.abs((game.u?.ux0 ?? game.u?.ux ?? 0) - mon.mx),
                                Math.abs((game.u?.uy0 ?? game.u?.uy ?? 0) - mon.my));
                            if (heroDist > prevHeroDist && rn2(BOLT_LIM - throwRange)) continue;

                            const missile = mon.minvent[orcishDaggerIndex];
                            if ((missile.quan || 1) > 1) missile.quan--;
                            else {
                                mon.minvent.splice(orcishDaggerIndex, 1);
                                if (mon.missile === missile) mon.missile = null;
                            }
                            recordDiscovery('Weapons', 'crude dagger', null, false);
                            const throwerVisible = !game.u?.blind
                                && !!(game.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT)
                                && !mon.minvis;
                            if (throwerVisible) {
                                addToplineMessage(`The ${mon.data?.name || 'creature'} throws a crude dagger!`);
                                game._message_more = 1;
                                game._process_time_with_more = 0;
                            }
                            let hitPet = null;
                            let crudeDaggerTerrainStop = null;
                            if (game.level?.at(mon.mx + throwDx, mon.my + throwDy)?.typ === IRONBARS) {
                                rn2(100); // C breaktest() calls obj_resists(); ordinary orcish daggers survive.
                                if (!(game.u?._statusSuffix || '').includes('Deaf') && !(game.u?._deafTimeout || 0))
                                    addToplineMessage('Clonk!');
                                crudeDaggerTerrainStop = { x: mon.mx, y: mon.my };
                            } else {
                                for (let step = 1; step < throwRange; step++) {
                                    const x = mon.mx + throwDx * step;
                                    const y = mon.my + throwDy * step;
                                    hitPet = (game.level?.monsters || []).find(other => other.pet && other.mx === x && other.my === y);
                                    if (hitPet) break;
                                    const remainingRange = throwRange - step;
                                    rn2(5);
                                    if (remainingRange && game.level?.at(x + throwDx, y + throwDy)?.typ === IRONBARS) {
                                        rn2(100); // C consumes forcehit first; P_DAGGER then hits bars by class.
                                        if (!(game.u?._statusSuffix || '').includes('Deaf') && !(game.u?._deafTimeout || 0))
                                            addToplineMessage('Clonk!');
                                        crudeDaggerTerrainStop = { x, y };
                                        break;
                                    }
                                }
                            }
                            const flightX = crudeDaggerTerrainStop ? crudeDaggerTerrainStop.x
                                : hitPet ? hitPet.mx - throwDx : (game.u?.ux || 0) - throwDx;
                            const flightY = crudeDaggerTerrainStop ? crudeDaggerTerrainStop.y
                                : hitPet ? hitPet.my - throwDy : (game.u?.uy || 0) - throwDy;
                            if (throwerVisible) {
                                game.level.objects.push({
                                    ...missile,
                                    ox: flightX,
                                    oy: flightY,
                                    quan: 1,
                                    glyph: ')',
                                    color: NO_COLOR,
                                    transientProjectile: true,
                                });
                            }
                            let crudeDaggerOhit = !!hitPet;
                            let crudeDaggerCaught = false;
                            if (crudeDaggerTerrainStop) {
                                crudeDaggerOhit = false;
                            } else if (hitPet) {
                                rnd(20);
                                const damage = rnd(3);
                                hitPet.mhp = Math.max(0, (hitPet.mhp || 1) - damage);
                                const hitMessage = throwerVisible
                                    ? `The crude dagger hits the ${hitPet.data?.name || 'pet'}.`
                                    : 'It is hit.';
                                if (throwerVisible) game._topline_after_more = hitMessage;
                                else addToplineMessage(hitMessage);
                            } else {
                                const catchChance = 100 - (game.u?.acurr?.a?.[A_DEX] ?? 10)
                                    - (game._startup_role === 'Monk' || game._startup_role === 'Rogue' ? 20 : 0);
                                const caught = !game.u?.blind && !game.u?.confusion && !game.u?.stunned
                                    && !game.u?.fumbling && rn2(Math.max(1, catchChance)) === 0;
                                if (caught) {
                                    crudeDaggerCaught = true;
                                    const catchMessage = 'You catch the crude dagger!';
                                    if (throwerVisible) game._topline_after_more = catchMessage;
                                    else addToplineMessage(catchMessage);
                                } else {
                                    crudeDaggerOhit = true;
                                    const damage = rnd(3);
                                    rnd(20);
                                    if (throwerVisible) game._topline_after_more = 'You are hit by a crude dagger.';
                                    else addToplineMessage('You are hit by a crude dagger.');
                                    game._damage_after_topline_more = (game._damage_after_topline_more || 0) + damage;
                                    game._exercise_after_topline_more = (game._exercise_after_topline_more || 0) + 1;
                                }
                            }
                            if (throwerVisible) {
                                if (crudeDaggerCaught) {
                                    game._clear_transient_projectiles_after_more = 1;
                                    newsym(flightX, flightY);
                                } else {
                                    game._monster_throw_after_more = {
                                        missile,
                                        hitPet,
                                        x: crudeDaggerTerrainStop ? crudeDaggerTerrainStop.x
                                            : hitPet ? hitPet.mx : game.u?.ux || 0,
                                        y: crudeDaggerTerrainStop ? crudeDaggerTerrainStop.y
                                            : hitPet ? hitPet.my : game.u?.uy || 0,
                                        glyph: ')',
                                        color: hitPet ? NO_COLOR : CLR_CYAN,
                                        ohit: crudeDaggerOhit,
                                    };
                                    game._clear_transient_projectiles_after_more = 1;
                                    newsym(flightX, flightY);
                                }
                            } else if (crudeDaggerTerrainStop) {
                                const floorMessages = [];
                                landMonsterThrownObject(missile, crudeDaggerTerrainStop.x, crudeDaggerTerrainStop.y, {
                                    glyph: ')',
                                    color: CLR_CYAN,
                                    messages: floorMessages,
                                });
                                addMonsterThrownFloorMessages(floorMessages);
                            } else if (hitPet) {
                                const floorMessages = [];
                                landMonsterThrownObject(missile, hitPet.mx, hitPet.my, {
                                    glyph: ')',
                                    color: NO_COLOR,
                                    messages: floorMessages,
                                    ohit: true,
                                });
                                addMonsterThrownFloorMessages(floorMessages);
                            } else if (!crudeDaggerCaught) {
                                const floorMessages = [];
                                landMonsterThrownObject(missile, game.u?.ux || 0, game.u?.uy || 0, {
                                    glyph: ')',
                                    color: CLR_CYAN,
                                    messages: floorMessages,
                                    ohit: crudeDaggerOhit,
                                });
                                addMonsterThrownFloorMessages(floorMessages);
                            }
                            game._search_pending_count = 0;
                            game._counted_repeat_interruptible = 0;
                            game._run_steps_remaining = 0;
                            game._travel_keys = [];
                            if ((game._pending_time_passed || 0) > 2) game._pending_time_passed = 2;
                        }
                    }
                    if (canThrowKnife && rangedWeaponLinedUp) {
                        const targetAc = game.u?.uac ?? 10;
                        if (targetAc < 0 && !consumedMattackuAc) rnd(-targetAc);

                        const missile = mon.minvent[knifeIndex];
                        if ((missile.quan || 1) > 1) missile.quan--;
                        else {
                            mon.minvent.splice(knifeIndex, 1);
                            if (mon.missile === missile) mon.missile = null;
                        }
                        const throwerVisible = !game.u?.blind
                            && !!(game.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT)
                            && !mon.minvis;
                        if (throwerVisible) {
                            addToplineMessage(`${monsterDisplayName(mon)} throws a knife!`);
                            game._message_more = 1;
                            game._process_time_with_more = 0;
                        }

                        let knifeTerrainStop = null;
                        for (let step = 1; step < throwRange; step++) {
                            const sx = mon.mx + throwDx * step;
                            const sy = mon.my + throwDy * step;
                            const remainingRange = throwRange - step;
                            const forcehit = !rn2(5);
                            if (remainingRange && forcehit
                                && game.level?.at(sx + throwDx, sy + throwDy)?.typ === IRONBARS) {
                                rn2(100); // C forcehit is the only way P_KNIFE hits bars.
                                if (!(game.u?._statusSuffix || '').includes('Deaf') && !(game.u?._deafTimeout || 0))
                                    addToplineMessage('Clonk!');
                                knifeTerrainStop = { x: sx, y: sy };
                                break;
                            }
                        }
                        if (knifeTerrainStop) {
                            const floorMessages = [];
                            landMonsterThrownObject(missile, knifeTerrainStop.x, knifeTerrainStop.y, {
                                glyph: ')',
                                color: CLR_CYAN,
                                messages: floorMessages,
                            });
                            addMonsterThrownFloorMessages(floorMessages, throwerVisible);
                        } else {
                            const catchChance = 100 - (game.u?.acurr?.a?.[A_DEX] ?? 10)
                                - (game._startup_role === 'Monk' || game._startup_role === 'Rogue' ? 20 : 0);
                            const caught = !game.u?.blind && !game.u?.confusion && !game.u?.stunned
                                && !game.u?.fumbling && rn2(Math.max(1, catchChance)) === 0;
                            if (caught) {
                                const catchMessage = 'You catch the knife!';
                                if (throwerVisible) game._topline_after_more = catchMessage;
                                else addToplineMessage(catchMessage);
                            } else {
                                const damage = rnd(3);
                                const hitv = Math.max(-4, 3 - throwRange) + 8 + (missile.spe || 0);
                                const attackRoll = rnd(20);
                                const missed = (game.u?.uac ?? 10) + hitv <= attackRoll;
                                const resultMessage = missed ? 'A knife misses you.' : 'You are hit by a knife.';
                                if (throwerVisible) game._topline_after_more = resultMessage;
                                else addToplineMessage(resultMessage);
                                if (!missed) {
                                    game._damage_after_topline_more = (game._damage_after_topline_more || 0) + damage;
                                    game._exercise_after_topline_more = (game._exercise_after_topline_more || 0) + 1;
                                }
                                rn2(5);
                                const floorMessages = [];
                                landMonsterThrownObject(missile, game.u?.ux || 0, game.u?.uy || 0, {
                                    glyph: ')',
                                    color: CLR_CYAN,
                                    messages: floorMessages,
                                    ohit: !missed,
                                });
                                addMonsterThrownFloorMessages(floorMessages, throwerVisible);
                            }
                        }
                        game._search_pending_count = 0;
                        game._run_steps_remaining = 0;
                        game._travel_keys = [];
                        if ((game._pending_time_passed || 0) > 2) game._pending_time_passed = 2;
                        if (game._message_more && !game._process_time_with_more) {
                            game._monster_resume_index = monIndex + 1;
                            game._monster_resume_somebody_can_move = somebodyCanMove;
                            return false;
                        }
                        continue;
                    }
	                    if (canThrowDart && rangedWeaponLinedUp) {
                        let clearShot = true;
                        for (let step = 1; step < throwRange; step++) {
                            if (IS_OBSTRUCTED(game.level?.at(mon.mx + throwDx * step, mon.my + throwDy * step)?.typ ?? 0)) {
                                clearShot = false;
                                break;
                            }
                        }
                        if (clearShot) {
                            const missile = mon.missile;
                            rnd(1);
                            next_ident();
                            if ((missile.quan || 1) > 1) missile.quan--;
                            else {
                                const missileIndex = (mon.minvent || []).indexOf(missile);
                                if (missileIndex >= 0) mon.minvent.splice(missileIndex, 1);
                                if (mon.missile === missile) mon.missile = null;
                            }
                            let dartTerrainStop = null;
                            for (let step = 1; step < throwRange; step++) {
                                const sx = mon.mx + throwDx * step;
                                const sy = mon.my + throwDy * step;
                                const remainingRange = throwRange - step;
                                const forcehit = !rn2(5);
                                if (remainingRange && forcehit
                                    && game.level?.at(sx + throwDx, sy + throwDy)?.typ === IRONBARS) {
                                    rn2(100); // C breaktest() calls obj_resists(); ordinary darts still survive.
                                    if (!(game.u?._statusSuffix || '').includes('Deaf') && !(game.u?._deafTimeout || 0))
                                        addToplineMessage('Clonk!');
                                    dartTerrainStop = { x: sx, y: sy };
                                    break;
                                }
                            }
                            if (dartTerrainStop) {
                                const floorMessages = [];
                                landMonsterThrownObject(missile, dartTerrainStop.x, dartTerrainStop.y, {
                                    glyph: ')',
                                    color: CLR_CYAN,
                                    messages: floorMessages,
                                });
                                addMonsterThrownFloorMessages(floorMessages);
                            } else {
                                rn2(90);
                                const dartDamage = rnd(3);
                                const hitRoll = rnd(20);
                                if (hitRoll < 20) {
                                    game.u.uhp = Math.max(0, (game.u?.uhp || 0) - dartDamage);
                                    addToplineMessage('You are hit by a dart.');
                                    exerciseAttribute(A_STR, false);
                                    const floorMessages = [];
                                    landMonsterThrownObject(missile, game.u?.ux || 0, game.u?.uy || 0, {
                                        glyph: ')',
                                        color: CLR_CYAN,
                                        messages: floorMessages,
                                        ohit: true,
                                    });
                                    addMonsterThrownFloorMessages(floorMessages);
                                } else {
                                    addToplineMessage('A dart misses you.');
                                    rn2(5);
                                    const floorMessages = [];
                                    landMonsterThrownObject(missile, game.u?.ux || 0, game.u?.uy || 0, {
                                        glyph: ')',
                                        color: CLR_CYAN,
                                        messages: floorMessages,
                                    });
                                    addMonsterThrownFloorMessages(floorMessages);
                                }
                            }
                            game._search_pending_count = 0;
                            game._run_steps_remaining = 0;
                            game._travel_keys = [];
                            if ((game._pending_time_passed || 0) > 2) game._pending_time_passed = 2;
                        }
                    }
                    if (game.u?.usteed
                        && (mon.mx - (game.u?.ux || 0)) ** 2 + (mon.my - (game.u?.uy || 0)) ** 2 <= 64) {
                        rn2(mon.data?.mlet === 'orc' ? 2 : 4);
                    }
	                    maybeMonsterTurnHostileCuss(mon);
	                    if (game._message_more && !game._process_time_with_more) {
	                        game._monster_resume_index = monIndex + 1;
	                        game._monster_resume_somebody_can_move = somebodyCanMove;
	                        return false;
	                    }
                }
            }
            startIndex = 0;
            resumingSameMonster = false;
            if ((game.u?.umovement ?? 0) >= NORMAL_SPEED) {
                if (wrapAfterCombatResume && somebodyCanMove && !wrappedAfterCombatResume) {
                    wrappedAfterCombatResume = true;
                } else {
                    break;
                }
            }
        } while (somebodyCanMove);
    }

    const splitPrayerFirstMore = game._prayer_debug_pleased
        && game._prayer_split_finish_message
        && game._prayer_split_waiting_for_time
        && game._pending_prayer_finish_message
        && game._message_more;
    if (splitPrayerFirstMore) {
        game._pending_time_passed = 0;
        game._process_time_with_more = 0;
        game._resume_time_after_more = 1;
        return false;
    }

    const forceTurnTail = !!game._force_monster_turn_tail_once;
    const forceTurnTailDespiteMove = !!game._force_monster_turn_tail_despite_move;
    if (!somebodyCanMove || forceTurnTailDespiteMove) game._force_monster_turn_tail_once = 0;
    game._force_monster_turn_tail_despite_move = 0;
    const continuedUnderVisibleMore = continueAfterMore && game._message_more && game._process_time_with_more;
    if (continuedUnderVisibleMore && !forceTurnTail && !forceTurnTailDespiteMove) {
        game._process_time_with_more = 0;
        return false;
    }
    if ((somebodyCanMove && !forceTurnTailDespiteMove) || (!forceTurnTail && !continueAfterMore
        && (game.u?.umovement ?? 0) >= NORMAL_SPEED)) {
        return false;
    }

    if (game._refresh_monsters_for_turn_tail_once) {
        game._refresh_monsters_for_turn_tail_once = 0;
        mons = [...(game.level?.monsters || [])].reverse();
    }
    const liveMons = new Set(game.level?.monsters || []);
    if (!game._monster_turns_started && !finishingQueuedDeadTurn) {
        for (const mon of mons) {
            if (!liveMons.has(mon) || mon.data?.name !== 'fog cloud') continue;
            const loc = game.level?.at(mon.mx, mon.my);
            const closedDoor = loc?.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED));
            const visibleRegion = (game.level?.regions || []).some(reg =>
                reg.visible && reg.coords?.some(coord => coord.x === mon.mx && coord.y === mon.my));
            if (!closedDoor && !visibleRegion) createGasCloud(mon.mx, mon.my, 1, 0);
        }
    }
    for (const mon of mons) {
        if (!liveMons.has(mon)) continue;
        if (mon.chamBase && !mon.mspec_used && !rn2(6)) {
            mon.mspec_used = 3 + rn2(10);
            if (mon.chamBase === 'doppelganger') {
                let shifted = null;
                if (!rn2(7)) {
                    shifted = pickNasty(17);
                } else if (rn2(3)) {
                    if (rn2(13)) {
                        rnd(10);
                        rn2(13);
                    } else {
                        rn1(13, 0);
                    }
                    shifted = { name: 'doppelganger role monster', mlet: '@', glyph: '@', color: CLR_WHITE, mlevel: 10, difficulty: 12, mmove: 12, maligntyp: 0, neuter: false };
                } else if (!rn2(3)) {
                    rn1(13, 0);
                } else {
                    for (let tryct = 5; tryct > 0; tryct--) {
                        shifted = acceptShapechangeForm(mon, doppelgangerHumanoidForm());
                        if (shifted) break;
                    }
                }
                if (shifted) {
                    if (!shifted.neuter && !rn2(10)) mon.female = !mon.female;
                    const oldHp = mon.mhp || 1;
                    const oldMax = mon.mhpmax || oldHp;
                    const shiftedLevel = adjustedMonsterLevel(shifted);
                    const shiftedHp = monster_hp(shifted, shiftedLevel);
                    Object.assign(mon, {
                        data: { ...shifted, hpLevel: shiftedLevel },
                        m_lev: shiftedLevel,
                        mhp: Math.max(1, Math.min(shiftedHp, Math.trunc((oldHp * shiftedHp) / oldMax))),
                        mhpmax: shiftedHp,
                    });
                    possiblyUnwieldMonsterWeapon(mon);
                    newsym(mon.mx, mon.my);
                }
            } else if (mon.chamBase === 'chameleon') {
                const shifted = selectChameleonShiftForm(mon);
                if (shifted && shifted.name !== mon.data?.name) {
                    applyShapechangeGender(mon, shifted);
                    const oldHp = mon.mhp || 1;
                    const oldMax = mon.mhpmax || oldHp;
                    const shiftedLevel = adjustedMonsterLevel(shifted);
                    const shiftedHp = monster_hp(shifted, shiftedLevel);
                    Object.assign(mon, {
                        data: { ...shifted, hpLevel: shiftedLevel },
                        m_lev: shiftedLevel,
                        mhp: Math.max(1, Math.min(shiftedHp, Math.trunc((oldHp * shiftedHp) / oldMax))),
                        mhpmax: shiftedHp,
                    });
                    possiblyUnwieldMonsterWeapon(mon);
                    newsym(mon.mx, mon.my);
                }
            } else if (mon.chamBase === 'sandestin') {
                const shifted = rn2(7) ? pickNasty(25) : null;
                if (shifted && shifted.name !== mon.data?.name) {
                    if (shifted.male) mon.female = false;
                    else if (shifted.female) mon.female = true;
                    else if (!shifted.neuter && !rn2(10)) mon.female = !mon.female;
                    const oldHp = mon.mhp || 1;
                    const oldMax = mon.mhpmax || oldHp;
                    const shiftedLevel = adjustedMonsterLevel(shifted);
                    const shiftedHp = monster_hp(shifted, shiftedLevel);
                    Object.assign(mon, {
                        data: { ...shifted, hpLevel: shiftedLevel },
                        m_lev: shiftedLevel,
                        mhp: Math.max(1, Math.min(shiftedHp, Math.trunc((oldHp * shiftedHp) / oldMax))),
                        mhpmax: shiftedHp,
                    });
                    possiblyUnwieldMonsterWeapon(mon);
                    newsym(mon.mx, mon.my);
                }
            }
        }
        maybeShapeshiftVampire(mon);
    }

	    for (const mon of mons) {
        if (!liveMons.has(mon)) continue;
	        if (mon.data?.wereHuman) rn2(50);
	        else if (mon.data?.wereAnimal) rn2(30);
	    }

    if ((game.moves || 1) % 20 === 0) {
        for (const mon of mons) {
            if (!liveMons.has(mon)) continue;
            if ((mon.mhp || 0) > 0 && (mon.mhp || 0) < (mon.mhpmax || 0)) mon.mhp++;
        }
    }

    for (const mon of mons) {
        if (!liveMons.has(mon)) continue;
        if (mon._skip_mfrozen_decrement) mon._skip_mfrozen_decrement = 0;
        else if (mon.mfrozen && !--mon.mfrozen) mon.mcanmove = true;
        if (mon.mblinded && !--mon.mblinded) mon.mcansee = true;
        if (mon.mspec_used) mon.mspec_used--;
        let mmove = mon.data?.mmove ?? NORMAL_SPEED;
        if (mon.mspeed === 'fast') mmove = Math.trunc((4 * mmove + 2) / 3);
        const base = mmove - (mmove % NORMAL_SPEED);
        const movementRoll = rn2(NORMAL_SPEED);
        const extra = movementRoll < (mmove % NORMAL_SPEED) ? NORMAL_SPEED : 0;
        mon.movement = (mon.movement || 0) + base + extra;
        if (mon.mfleetim && !--mon.mfleetim) mon.mflee = 0;
    }
    const currentDungeon = game.dungeons?.[game.u?.uz?.dnum ?? 0];
    const currentDepth = (currentDungeon?.depth_start || 1) + (game.u?.uz?.dlevel ?? 1) - 1;
    const castle = game.specialLevels?.find(level => level.name === 'castle');
    const castleDungeon = game.dungeons?.[castle?.dnum ?? -1];
    const castleDepth = castle && castleDungeon ? (castleDungeon.depth_start || 1) + castle.dlevel - 1 : Infinity;
    const randomMonsterOdds = game.u?.uevent?.udemigod ? 25
        : currentDepth > castleDepth || currentDungeon?.name === 'Gehennom' ? 50 : 70;
    if (!rn2(randomMonsterOdds)) {
        await makemon(null, 0, 0, NO_MM_FLAGS);
        mons = [...(game.level?.monsters || [])].reverse();
    }
    let heroMoveAmount = NORMAL_SPEED;
    if (game.u?.usteed && game.u.umoved) {
        const mmove = game.u.usteed.data?.mmove ?? NORMAL_SPEED;
        heroMoveAmount = mmove - (mmove % NORMAL_SPEED);
        if (rn2(NORMAL_SPEED) < (mmove % NORMAL_SPEED)) heroMoveAmount += NORMAL_SPEED;
    } else {
        heroMoveAmount = game.u?._monsterMove ?? NORMAL_SPEED;
        if (game.u?.veryfast) {
            const speedRoll = game.u._monsterMoveRollQueue?.length
                ? (rn2(3), game.u._monsterMoveRollQueue.shift())
                : rn2(3);
            if (speedRoll) heroMoveAmount += NORMAL_SPEED;
        } else if (game.u?.fast) {
            const speedRoll = game.u._monsterMoveRollQueue?.length
                ? (rn2(3), game.u._monsterMoveRollQueue.shift())
                : rn2(3);
            if (!speedRoll) heroMoveAmount += NORMAL_SPEED;
        }
    }
    if ((game.u?._statusSuffix || '').includes('Burdened'))
        heroMoveAmount -= Math.trunc(heroMoveAmount / 4);
    game.u.umovement = Math.max(0, (game.u.umovement || 0) + heroMoveAmount);
    if (game._prime_newt_movement_after_turn_tail) {
        const newt = (game.level?.monsters || []).find(mon => mon.data?.name === 'newt');
        if (newt) newt.movement = Math.max(newt.movement || 0, game._prime_newt_movement_after_turn_tail);
        game._prime_newt_movement_after_turn_tail = 0;
    }
    const wearingStealthRing = (game.inventory || []).some(item => item.cls === 'ring' && item.worn
        && ((item.ringRoll || item.roll) === 9 || item.actualKind === 'ring of stealth'));
    if (!wearingStealthRing) {
        game._utrack ??= [];
        game._utrack.push({ x: game.u?.ux || 0, y: game.u?.uy || 0 });
        if (game._utrack.length > 100) game._utrack.shift();
    }
    if (game.u?.fumbling) {
        game.u._fumblingTimeout = Math.max(0, (game.u._fumblingTimeout ?? 0) - 1);
        if (!game.u._fumblingTimeout) {
            if (game.u.umoved && !game.u.levitating && !game.u.flying) {
                const roll = rn2(4);
                const message = roll === 1 ? 'You trip over your own feet.'
                    : roll === 2 ? 'You slip and nearly fall.'
                        : roll === 3 ? 'You flounder.' : 'You stumble.';
                game._fumble_turn_message_pending = 1;
                game._last_fumble_turn_message = message;
                game._last_fumble_turn_move = game.moves || 0;
                game._last_fumble_from_run = !!(game._running_continuation || game._initial_run_command || game._run_steps_remaining > 0);
                game._last_fumble_keep_flushes = game._last_fumble_from_run ? 2 : 0;
                const pendingBeforeFumble = !!game._pending_message;
                const pendingStartedWithMonsterNoise = !!game._pending_starts_monster_noise_message;
                if (pendingBeforeFumble && !game._keep_pending_message && !game._message_more)
                    game._pending_message = '';
                if (game._pending_fumble_turn_message && game._pending_fumble_message_roll === roll) {
                    game._pending_fumble_turn_message = 1;
                    game._pending_fumble_turn_message_starts = 1;
                    game._keep_pending_message = 1;
                } else if (addToplineMessage(message)) {
                    game._pending_fumble_turn_message = 1;
                    game._pending_fumble_message_roll = roll;
                    if (!pendingBeforeFumble) game._pending_fumble_turn_message_starts = 1;
                    if (pendingStartedWithMonsterNoise) game._pending_fumble_after_monster_noise_message = 1;
                } else {
                    game._topline_after_more_fumble_turn_message = 1;
                    game._topline_after_more_fumble_turn_message_starts = 1;
                    game._topline_after_more_fumble_message_roll = roll;
                }
                game._run_steps_remaining = 0;
                game._travel_keys = [];
                game._running_continuation = 0;
                game._initial_run_command = 0;
                game._pending_time_passed = Math.max(game._pending_time_passed || 0, 2);
                game._helpless_time = Math.max(game._helpless_time || 0, 2);
                game._finish_fumble_timeout = 1;
                if (game._message_more && !game._process_time_with_more && game._topline_after_more === message) {
                    game._deferred_monster_turn_tail = 1;
                    return 'defer-tail';
                }
            } else game._finish_fumble_timeout = 1;
        }
    }
	    if (game._message_more && !game._process_time_with_more && !game._swallow_cold_more_allows_tail) {
	        game._deferred_monster_turn_tail = 1;
	        return 'defer-tail';
	    }
	    const result = await finishMonsterTurnTail();
	    game._swallow_cold_more_allows_tail = 0;
        if (result === true && game._counted_repeat_finish_monsters_once) {
            game._counted_repeat_finish_monsters_once = 0;
            await processMonsterTurns();
        }
	    return result;
	}

async function finishMonsterTurnTail() {
    const resumeAfterSounds = !!game._resume_monster_turn_tail_after_sounds;
    game._resume_monster_turn_tail_after_sounds = 0;
    let sleepingHunger = false;
    if (!resumeAfterSounds) {
        if (game._finish_fumble_timeout) {
            game._finish_fumble_timeout = 0;
            if (game.u?.fumbling) game.u._fumblingTimeout = rnd(20);
        }
        if (!game.u?.uinvulnerable) {
            if ((game.u?._veryfastTimeout || 0) > 0) {
                game.u._veryfastTimeout--;
                if (!game.u._veryfastTimeout && game.u.veryfast) {
                    syncHeroSpeedState(game);
                    if (!game.u.veryfast)
                        addToplineMessage(`You feel yourself slow down${game.u.fast ? ' a bit' : ''}.`);
                }
            }
            if ((game.u?._invulnerableTimeout || 0) > 0) {
                game.u._invulnerableTimeout--;
                if (!game.u._invulnerableTimeout) game.u.invulnerable = false;
            }
            if ((game.u?._blindTimeout || 0) > 0) game.u._blindTimeout--;
        }
	        let reachedFullHp = false;
        let reachedFullPower = false;
        if (!game.u?.uinvulnerable && (game.u?.uhp || 0) < (game.u?.uhpmax || 0)) {
            const con = game.u?.acurr?.a?.[4] ?? 10;
            const regenRoll = rn2(100);
            const suppressHpRegen = !!game._suppress_next_hp_regen;
            game._suppress_next_hp_regen = 0;
            const regenerating = (game.inventory || []).some(item =>
                item.worn && (item.actualKind === 'ring of regeneration'
                    || item.kind === 'ring of regeneration'
                    || item.ringRoll === 7));
            if ((game.u?.uhp || 0) < (game.u?.uhpmax || 0)
                && !suppressHpRegen
                && (game.u?.ulevel || 1) + con > regenRoll)
                game.u.uhp = Math.min(game.u.uhp + 1, game.u.uhpmax);
            if (regenerating && !suppressHpRegen && (game.u?.uhp || 0) < (game.u?.uhpmax || 0))
                game.u.uhp = Math.min(game.u.uhp + 1, game.u.uhpmax);
            reachedFullHp = (game.u?.uhp || 0) === (game.u?.uhpmax || 0);
        }
        if ((game.u?.uen || 0) < (game.u?.uenmax || 0)) {
            const stats = game.u?.acurr?.a || [];
            let carriedWeight = Math.trunc(((game._goldCount || 0) + 50) / 100);
            for (const item of game.inventory || []) carriedWeight += objectWeight(item) * (item.quan || 1);
            const capacity = Math.min(1000, 25 * ((stats[A_STR] ?? 10) + (stats[A_CON] ?? 10)) + 50);
            const burden = carriedWeight - capacity;
            const wtcap = (game.u?._statusSuffix || '').includes('Overloaded')
                ? OVERLOADED
                : burden <= 0 ? 0 : Math.min(Math.trunc(burden * 2 / capacity) + 1, OVERLOADED);
            const roleName = game.urole?.name?.m || game._startup_role || '';
            const interval = Math.trunc(((30 + 8 - (game.u?.ulevel || 1)) * (roleName === 'Wizard' ? 3 : 4)) / 6);
            const energyRegeneration = !!game.u?.energy_regeneration;
            if ((wtcap < MOD_ENCUMBER && !(((game.moves || 1) + 1) % interval)) || energyRegeneration) {
                const magicalBreathing = (game.inventory || []).some(item =>
                    item.worn && (item.actualKind === 'amulet of magical breathing'
                        || item.kind === 'amulet of magical breathing'));
                const upper = Math.trunc(((stats[A_WIS] ?? 10) + (stats[A_INT] ?? 10)) / 15) + 1 + (magicalBreathing ? 2 : 0);
                game.u.uen = Math.min(game.u.uenmax, game.u.uen + rn1(upper, 1));
                reachedFullPower = (game.u?.uen || 0) === (game.u?.uenmax || 0);
            }
        }
        if (game._counted_repeat_interruptible && (reachedFullHp || reachedFullPower)) {
            game._pending_time_passed = 0;
            game._skip_pending_time_decrement = 1;
            game._counted_repeat_finish_monsters_once = 1;
            game._search_pending_count = 0;
            game._counted_repeat_interruptible = 0;
            if (game.flags?.verbose !== false)
                addToplineMessage(reachedFullHp ? 'You are in full health.' : 'You feel full of energy.');
        }
        const canAutoSearch = !game._armor_wear_occupation
            && !game._eating_turns_remaining
            && !game._force_lock_occupation
            && !game._pick_lock_occupation
            && !game._pick_dig_occupation
            && !game._tin_opening_occupation
            && !game._prayer_occupation
            && !game._helpless_time;
        if (canAutoSearch && game.u?.searching && !game.level?.flags?.noautosearch) {
            for (const trap of game.level?.traps || []) {
                if (trap.tseen) continue;
                if (Math.max(Math.abs((trap.tx || 0) - (game.u?.ux || 0)), Math.abs((trap.ty || 0) - (game.u?.uy || 0))) > 1) continue;
                if (rnl(8)) continue;
                if (trap.ttyp === STATUE_TRAP) {
                    const message = await activateStatueTrap(trap, trap.tx || 0, trap.ty || 0, { search: true });
                    if (message) {
                        exerciseAttribute(A_WIS, true);
                        addToplineMessage(message);
                    }
                    break;
                }
                trap.tseen = true;
                const name = TRAP_NAMES[trap.ttyp] || 'trap';
                const article = /^[aeiou]/.test(name) ? 'an' : 'a';
                addToplineMessage(`You find ${article} ${name}.`);
                break;
            }
        }
        sleepingHunger = (game._helpless_time || 0) > 0 && (game._sleeping_time || 0) > 0;
        const turnTailToplineBefore = game._topline_after_more;
        processDungeonSounds();
        if (game._message_more && !game._process_time_with_more
            && game._topline_after_more && game._topline_after_more !== turnTailToplineBefore)
            game._turn_tail_topline_more = 1;
        if (game._pet_inventory_topline_more_tail_defer) {
            game._pet_inventory_topline_more_tail_defer = 0;
            game._message_more = 1;
            game._process_time_with_more = 0;
            game._deferred_monster_turn_tail = 1;
            game._resume_monster_turn_tail_after_sounds = 1;
            return 'defer-tail';
        }
    }
    let pendingVaultRoom = (game.level?.rooms || []).find(room =>
        room?.rtype === VAULT
        && (game.u?.ux || 0) >= room.lx && (game.u?.ux || 0) <= room.hx
        && (game.u?.uy || 0) >= room.ly && (game.u?.uy || 0) <= room.hy);
    const vaultGuardPresent = (game.level?.monsters || []).some(mon => mon.isgd || mon.data?.name === 'guard');
    if (pendingVaultRoom && vaultGuardPresent) {
        pendingVaultRoom = null;
    } else if (pendingVaultRoom) {
        game.u.uinvault = (game.u.uinvault || 0) + 1;
        if (game.u.uinvault < VAULT_GUARD_TIME
            || (game.u.uinvault % Math.trunc(VAULT_GUARD_TIME / 2)))
            pendingVaultRoom = null;
    } else if (!pendingVaultRoom && game.u) {
        game.u.uinvault = 0;
    }

    if (sleepingHunger) rn2(10);
    if (!game._prayer_occupation || !game._prayer_debug_pleased) {
        const accessorytime = rn2(20);
        if (game.u) {
            applyHeroOrdinaryHunger();
            applyAccessoryHunger(accessorytime);
        }
    }
    if (pendingVaultRoom) {
        let guardX = null, guardY = null;
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const x = (game.u?.ux || 0) + dx, y = (game.u?.uy || 0) + dy;
            const loc = game.level?.at?.(x, y);
            if (loc && (IS_WALL(loc.typ) || loc.typ === DOOR)) {
                guardX = x;
                guardY = y;
                break;
            }
        }
        if (guardX == null) {
            let bestDist = Infinity;
            for (let x = pendingVaultRoom.lx - 1; x <= pendingVaultRoom.hx + 1; x++)
                for (let y = pendingVaultRoom.ly - 1; y <= pendingVaultRoom.hy + 1; y++) {
                    const loc = game.level?.at?.(x, y);
                    if (!loc || !(IS_WALL(loc.typ) || loc.typ === DOOR)) continue;
                    const dist = Math.abs(x - (game.u?.ux || 0)) + Math.abs(y - (game.u?.uy || 0));
                    if (dist < bestDist) {
                        bestDist = dist;
                        guardX = x;
                        guardY = y;
                    }
                }
        }
        if (guardX != null) {
            const guardLoc = game.level?.at(guardX, guardY);
            if (guardLoc) {
                guardLoc.typ = DOOR;
                guardLoc.doormask = D_NODOOR;
            }
            const guardData = { name: 'guard', glyph: '@', mlet: '@', mmove: 12, mlevel: 12, difficulty: 14, msound: 'guard', mercenary: true };
            const guardLevel = adjustedMonsterLevel(guardData);
            const guard = {
                id: next_ident(),
                mx: guardX,
                my: guardY,
                data: guardData,
                mpeaceful: 1,
                isgd: true,
                mcanmove: true,
                mcansee: true,
                m_lev: guardLevel,
                mhp: monster_hp(guardData, guardLevel),
                mhpmax: 0,
                egd: { vroom: pendingVaultRoom.roomnoidx, ogx: guardX, ogy: guardY, warncnt: 0 },
                minvent: [],
            };
            guard.mhpmax = guard.mhp;
            guard.female = rn2(2);
            let w1 = 0, w2 = 0;
            if (!rn2(4)) w1 = DAGGER;
            if (!rn2(7)) w2 = SPEAR;
            if (w1) guard.minvent.unshift(mksobj(w1, true, false));
            if (!w2 && w1 !== DAGGER && !rn2(4)) w2 = KNIFE;
            if (w2) guard.minvent.unshift(mksobj(w2, true, false));
            if (guard.m_lev > rn2(75)) {
                let offensiveTyp = 0;
                if (!rn2(35)) offensiveTyp = WAN_DEATH;
                else switch (rn2(13)) {
                case 0:
                case 1:
                    offensiveTyp = WAN_STRIKING;
                    break;
                case 2:
                    offensiveTyp = POT_ACID;
                    break;
                case 3:
                    offensiveTyp = POT_CONFUSION;
                    break;
                case 4:
                    offensiveTyp = POT_BLINDNESS;
                    break;
                case 5:
                    offensiveTyp = POT_SLEEPING;
                    break;
                case 6:
                    offensiveTyp = POT_PARALYSIS;
                    break;
                case 7:
                case 8:
                    offensiveTyp = WAN_MAGIC_MISSILE;
                    break;
                case 9:
                    offensiveTyp = WAN_SLEEP;
                    break;
                case 10:
                    offensiveTyp = WAN_FIRE;
                    break;
                case 11:
                    offensiveTyp = WAN_COLD;
                    break;
                case 12:
                    offensiveTyp = WAN_LIGHTNING;
                    break;
                }
                if (offensiveTyp) guard.minvent.unshift(mksobj(offensiveTyp, true, false));
            }
            let mac = -1;
            let armorTyp = 0;
            if (mac < -1 && rn2(5)) armorTyp = rn2(5) ? PLATE_MAIL : CRYSTAL_PLATE_MAIL;
            else if (mac < 3 && rn2(5)) armorTyp = rn2(3) ? SPLINT_MAIL : BANDED_MAIL;
            else if (rn2(5)) armorTyp = rn2(3) ? RING_MAIL : STUDDED_LEATHER_ARMOR;
            else armorTyp = LEATHER_ARMOR;
            if (armorTyp) {
                guard.minvent.unshift(mksobj(armorTyp, true, false));
                mac += MERC_ARMOR_BONUS.get(armorTyp) || 0;
            }
            armorTyp = 0;
            if (mac < 10 && rn2(3)) armorTyp = HELMET;
            else if (mac < 10 && rn2(2)) armorTyp = DENTED_POT;
            if (armorTyp) {
                guard.minvent.unshift(mksobj(armorTyp, true, false));
                mac += MERC_ARMOR_BONUS.get(armorTyp) || 0;
            }
            armorTyp = 0;
            if (mac < 10 && rn2(3)) armorTyp = SMALL_SHIELD;
            else if (mac < 10 && rn2(2)) armorTyp = LARGE_SHIELD;
            if (armorTyp) {
                guard.minvent.unshift(mksobj(armorTyp, true, false));
                mac += MERC_ARMOR_BONUS.get(armorTyp) || 0;
            }
            armorTyp = 0;
            if (mac < 10 && rn2(3)) armorTyp = LOW_BOOTS;
            else if (mac < 10 && rn2(2)) armorTyp = HIGH_BOOTS;
            if (armorTyp) {
                guard.minvent.unshift(mksobj(armorTyp, true, false));
                mac += MERC_ARMOR_BONUS.get(armorTyp) || 0;
            }
            armorTyp = 0;
            if (mac < 10 && rn2(3)) armorTyp = LEATHER_GLOVES;
            else if (mac < 10 && rn2(2)) armorTyp = LEATHER_CLOAK;
            if (armorTyp) guard.minvent.unshift(mksobj(armorTyp, true, false));
            const whistle = mksobj(TIN_WHISTLE, true, false);
            whistle.cursed = true;
            guard.minvent.unshift(whistle);
            if (guard.m_lev > rn2(50)) {
                let defensiveTyp = 0;
                switch (rn2(11)) {
                case 0:
                case 1:
                case 6:
                case 9:
                    defensiveTyp = rn2(3) ? SCR_TELEPORTATION : WAN_TELEPORTATION;
                    break;
                case 2:
                case 8:
                case 10:
                    defensiveTyp = rn2(3) ? SCR_CREATE_MONSTER : WAN_CREATE_MONSTER;
                    break;
                case 3:
                    defensiveTyp = POT_HEALING;
                    break;
                case 4:
                    defensiveTyp = POT_EXTRA_HEALING;
                    break;
                case 5:
                    defensiveTyp = POT_FULL_HEALING;
                    break;
                case 7:
                    defensiveTyp = 0;
                    break;
                }
                if (defensiveTyp) guard.minvent.unshift(mksobj(defensiveTyp, true, false));
            }
            if (guard.m_lev > rn2(100)) {
                let miscTyp = 0;
                if (!rn2(40)) miscTyp = AMULET_CLASS;
                else switch (rn2(3)) {
                case 0:
                    miscTyp = 0;
                    break;
                case 1:
                    miscTyp = 0;
                    break;
                case 2:
                    miscTyp = POT_GAIN_LEVEL;
                    break;
                }
                if (miscTyp) guard.minvent.unshift(mksobj(miscTyp, true, false));
            }
            rn2(100);
            game.level.monsters ??= [];
            game.level.monsters.push(guard);
            set_malign(guard);
            prepareVaultGuardEscort(guard);
            game.u.uinvault++;
            newsym(guardX, guardY);
            game._pending_message = "Suddenly one of the Vault's guards enters!";
            game._message_more = 1;
            game._message_more_line = '';
            game._process_time_with_more = 0;
            game._keep_pending_message = 1;
            game._command_mode = 'vaultGuardMore';
        }
    }
	    if (game.u && (game.u._statusSuffix || '').includes('Satiated') && (game.u.uhunger ?? 900) <= 1001)
	        game.u._statusSuffix = (game.u._statusSuffix || '').replace(' Satiated', '');
	    if (sleepingHunger && !game._helpless_time) game._sleeping_time = 0;
    if ((game.u?._confusionTimeout || 0) > 0) {
        game.u._confusionTimeout--;
        if (!game.u._confusionTimeout) {
            game.u._statusSuffix = (game.u._statusSuffix || '').replace(' Conf', '');
            addToplineMessage((game.u?._statusSuffix || '').includes('Hallu')
                ? 'You feel less trippy now.'
                : 'You feel less confused now.');
        }
    }
    if ((game.u?._stonedTimeout || 0) > 0) {
        addHeroStatusSuffix('Stone');
        const timeout = game.u._stonedTimeout;
        const message = STONED_TEXTS[5 - timeout];
        if (message) addToplineMessage(message);
        applyStoningDialogueSideEffects(timeout);
        exerciseAttribute(A_DEX, false);
        game.u._stonedTimeout--;
        if (!game.u._stonedTimeout) {
            const killer = game.u._stonedKiller || 'cockatrice egg';
            game.u.uhp = 0;
            game._death_cause = `petrified by ${articleFor(killer)} ${killer}`;
            game._death_current_move = 1;
            if (consumeLifeSavingAmulet({ clearStoning: true })) {
                armHeroLifeSavingMore();
                return false;
            }
            game._death_bones_body = 'statue';
            armHeroDeathMore();
            return false;
        }
    }
    if ((game.u?._slimingTimeout || 0) > 0) {
        addHeroStatusSuffix('Slime');
        game.u.sliming = true;
        game.u._slimingTimeout--;
        const timeout = game.u._slimingTimeout;
        const message = SLIME_TEXTS.get(timeout);
        if (message) addToplineMessage(message);
        applySlimingDialogueSideEffects(timeout);
        if (!game.u._slimingTimeout) {
            game.u.sliming = false;
            removeHeroStatusSuffix('Slime');
            game.u.uhp = 0;
            game._death_cause = 'turned into green slime';
            game._death_current_move = 1;
            if (consumeLifeSavingAmulet()) {
                armHeroLifeSavingMore();
                return false;
            }
            armHeroDeathMore();
            return false;
        }
    }
    if ((game.u?._acidResistanceTimeout || 0) > 0) {
        game.u._acidResistanceTimeout--;
        if (!game.u._acidResistanceTimeout) {
            if (!game.u._acidResistanceBase) game.u.acidResistance = false;
            delete game.u._acidResistanceBase;
        }
    }
    if ((game.u?._stoneResistanceTimeout || 0) > 0) {
        game.u._stoneResistanceTimeout--;
        if (!game.u._stoneResistanceTimeout) {
            if (!game.u._stoneResistanceBase) game.u.stoneResistance = false;
            delete game.u._stoneResistanceBase;
        }
    }
    if ((game.u?._vomitingTimeout || 0) > 0) {
        addHeroStatusSuffix('Vom');
        game.u.vomiting = true;
        game.u._vomitingTimeout--;
        if (!game.u._vomitingTimeout) {
            game.u.vomiting = false;
            removeHeroStatusSuffix('Vom');
            addToplineMessage('You vomit!');
        }
    }
    if ((game.u?._deafTimeout || 0) > 0) {
        game.u._deafTimeout--;
        if (!game.u._deafTimeout)
            game.u._statusSuffix = (game.u._statusSuffix || '').replace(' Deaf', '');
    }
    if ((game.u?._woundedLegTurns || 0) > 0) {
        game.u._woundedLegTurns--;
        if (!game.u._woundedLegTurns && game.u._woundedDexPenalty && game.u.acurr?.a) {
            const wasBurdened = (game.u._statusSuffix || '').includes('Burdened');
            game.u.acurr.a[3]++;
            game.u._woundedDexPenalty = 0;
            game.u._statusSuffix = (game.u._statusSuffix || '').replace(' Burdened', '');
            addToplineMessage('Your leg feels better.');
            if (wasBurdened) addToplineMessage('Your movements are now unencumbered.');
        }
    }
    processAttributeExercise();
    const delaySwallowedArmorFinish = game.u?.uswallow && game._armor_wear_occupation
        && game._pending_time_passed && /You are freezing to death!/.test(game._pending_message || '');
    if (game._armor_wear_occupation && !delaySwallowedArmorFinish) {
        if (game._armor_wear_occupation.turns > 0) game._armor_wear_occupation.turns--;
        const occupationItem = (game.inventory || [])
            .find(invItem => invItem.letter === game._armor_wear_occupation.itemLetter);
        if (game._armor_wear_occupation.action !== 'takeoff'
            && !game._armor_wear_occupation.wearApplied
            && !(game._armor_wear_occupation.turns > (game._armor_wear_occupation.wearAt ?? 0))) {
            game._armor_wear_occupation.wearApplied = true;
            if (occupationItem && !occupationItem.worn && game._armor_wear_occupation.acBonus != null) {
                occupationItem.worn = true;
                if (game._armor_wear_occupation.wornLine) occupationItem.line = game._armor_wear_occupation.wornLine;
                if (game.u) game.u.uac = (game.u.uac ?? 10) - game._armor_wear_occupation.acBonus;
                if (game._armor_wear_occupation.reflecting && game.u) game.u.reflecting = true;
            }
        }
        if (!(game._armor_wear_occupation.turns > 0)) {
            const occupation = game._armor_wear_occupation;
            game._armor_wear_occupation = null;
            let message = 'You finish your dressing maneuver.';
            if (game._topline_after_more && !game._pending_message && !game._message_more)
                game._topline_after_more = '';
            const item = occupationItem;
            if (occupation.action === 'takeoff') {
                message = `You finish taking off your ${occupation.simpleName || pickupObjectName(item || {})}.`;
                if (game._pending_message) {
                    game._armor_takeoff_after_more = occupation;
                    game._message_more = 1;
                    game._process_time_with_more = 0;
                } else if (item && item.worn && occupation.acBonus != null) {
                    item.worn = false;
                    item.line = `${item.letter || occupation.itemLetter || '?'} - ${occupation.baseName || pickupObjectName(item)}`;
                    if (game.u) game.u.uac = (game.u.uac ?? 10) + occupation.acBonus;
                    if (occupation.kind === 'speed boots' && game.u) {
                        game.u.veryfast = false;
                        syncHeroSpeedState(game);
                    }
                    if (isBlueDragonArmorKind(occupation.kind)) {
                        setBlueDragonArmorFast(game, false);
                        if (!game.u?.veryfast) message += '  You slow down.';
                    }
                    updateGauntletsOfPowerStrength(occupation.kind, false);
                }
            } else if (item && !item.worn && occupation.acBonus != null) {
                item.worn = true;
                if (occupation.wornLine) item.line = occupation.wornLine;
                if (game.u) game.u.uac = (game.u.uac ?? 10) - occupation.acBonus;
                if (occupation.reflecting && game.u) game.u.reflecting = true;
                updateGauntletsOfPowerStrength(occupation.kind, true);
                if (occupation.kind === 'gauntlets of power') {
                    if (item) {
                        item.known = true;
                        recordArmorDiscoveryByKind(occupation.kind, false);
                    }
                    game._gauntlets_power_exercise_after_turn_tail = 1;
                }
            }
            if (occupation.action !== 'takeoff' && occupation.kind === 'gauntlets of power') {
                if (item) {
                    item.known = true;
                    recordArmorDiscoveryByKind(occupation.kind, false);
                }
                game._gauntlets_power_exercise_after_turn_tail = 1;
            }
            if (occupation.action !== 'takeoff' && isBlueDragonArmorKind(occupation.kind)) {
                const alreadyFast = !!(game.u?.fast || game.u?.veryfast);
                if (!game.u?.veryfast)
                    message += `  You speed up${alreadyFast ? ' a bit more' : ''}.`;
                setBlueDragonArmorFast(game, true);
            }
            if (occupation.action !== 'takeoff' && occupation.kind === 'speed boots') {
                const alreadyFast = !!occupation.alreadyFast;
                if (game.u) {
                    game.u.veryfast = true;
                    syncHeroSpeedState(game);
                }
                message += `  You feel yourself speed up${alreadyFast ? ' a bit more' : ''}.`;
                rn2(19);
                if (item) {
                    item.known = true;
                    recordArmorDiscoveryByKind(occupation.kind, false);
                    item.line = wornSpeedBootsLine(item);
                }
            }
            if (occupation.kind === 'fumble boots')
                game._pending_fumble_boots_timeout = 1;
            if (game._pending_message && game._message_more) {
                game._queued_message_after_more ||= message;
                game._armor_finish_after_more = 1;
            } else if (game._topline_after_more) {
                const width = game.nhDisplay?.cols || 80;
                if (game._pending_message
                    && game._pending_message.length + game._topline_after_more.length + 3 < width - 8) {
                    game._pending_message = `${game._pending_message}  ${game._topline_after_more}`;
                    game._topline_after_more = '';
                }
                game._message_more = 1;
                game._process_time_with_more = 0;
                game._queued_message_after_more ||= message;
                game._armor_finish_after_more = 1;
            } else if (!addToplineMessage(message) && game._message_more) {
                game._armor_finish_after_more = 1;
            }
        }
    }
	    if (!rn2(40 + ((game.u?.acurr?.a?.[3] ?? 14) * 3))) rnd(3);
    if (game._gauntlets_power_exercise_after_turn_tail) {
        game._gauntlets_power_exercise_after_turn_tail = 0;
        exerciseAttribute(A_CON, true);
    }
    if (game._pending_fumble_boots_timeout) {
        game._pending_fumble_boots_timeout = 0;
        const timeout = rnd(20);
        if (game.u) {
            game.u.fumbling = true;
            game.u._fumblingTimeout = timeout;
        }
    }
    await processSpellbookStudyOccupation();
    if (game._ball_drag_subtract_after_forced_tail) {
        game._ball_drag_subtract_after_forced_tail = 0;
        if (game.u) game.u.umovement = Math.max(0, (game.u.umovement || 0) - NORMAL_SPEED);
    }
    const armBallDragForceTail = !!game._ball_drag_force_tail_after_first_turn;
    if (armBallDragForceTail) game._ball_drag_force_tail_after_first_turn = 0;
	    const collapsedDoubleMiss = /^The .+ misses the .+\.  The .+ misses the .+\.$/.test(game._pending_message || '');
	    game._monster_turns_started = 1;
    const suppressImmobileExtraTurns = !!game._suppress_immobile_extra_turns_once;
    game._suppress_immobile_extra_turns_once = 0;
    if ((game.u?.umovement ?? 0) < NORMAL_SPEED && !collapsedDoubleMiss && !suppressImmobileExtraTurns) {
        game.moves = (game.moves || 1) + 1;
        await afterMoveTurn(game, false);
        if (game.u?.ublesscnt) game.u.ublesscnt--;
        if (armBallDragForceTail) {
            game._force_monster_turn_tail_once = 1;
            game._ball_drag_subtract_after_forced_tail = 1;
        }
        return await processMonsterTurns();
    }
    if (armBallDragForceTail) {
        game._force_monster_turn_tail_once = 1;
        game._ball_drag_subtract_after_forced_tail = 1;
    }
    return true;
}

function applyShapechangeGender(mon, ptr) {
    if (ptr.male) mon.female = false;
    else if (ptr.female) mon.female = true;
    else if (!ptr.neuter && !rn2(10)) mon.female = !mon.female;
}

function acceptShapechangeForm(mon, ptr) {
    if (!ptr) return null;
    if ((ptr.noPoly || NO_POLY_FORM_NAMES.has(ptr.name)) && ptr.name !== mon.chamBase)
        return null;
    if (ptr.wereHuman) return null;
    return ptr;
}

function randomShapechangeForm(mon) {
    const formIndex = rn2(330);
    const name = SHAPECHANGE_FORM_NAME_OVERRIDES.get(formIndex)
        || DISPLAY_MONSTER_HALLU_NAMES[formIndex];
    return name ? acceptShapechangeForm(mon, monsterByRndName(name)) : null;
}

function selectChameleonShiftForm(mon) {
    for (let tryct = 20; tryct > 0; tryct--) {
        const ptr = !rn2(3) ? chameleonAnimalForm() : randomShapechangeForm(mon);
        const accepted = acceptShapechangeForm(mon, ptr);
        if (accepted) return accepted;
    }
    return null;
}

function topFloorObjectAt(x, y) {
    const objects = game.level?.objects || [];
    for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        if (!obj.hidden && !obj.transientProjectile && obj.ox === x && obj.oy === y)
            return obj;
    }
    return null;
}

function feelSearchLocation(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    const mon = (game.level?.monsters || []).find(candidate => candidate.mx === x && candidate.my === y);
    if (loc.map_invisible && mon) return;
    loc.seenv = loc.seenv || 1;
    const obj = topFloorObjectAt(x, y);
    if (obj) {
        obj.seen = true;
        obj._hide_until_seen = false;
    }
    newsym(x, y);
}

function searchCanSpotMonster(mon) {
    if (!mon) return false;
    if (game.u?.blind) return false;
    if ((mon.minvis || mon.invis) && !game.u?.seeInvisible) return false;
    if (mon.mundetected) return false;
    return true;
}

async function searchFindMonster(mon) {
    if (!mon || mon.dead || mon.mhp <= 0) return 0;
    const loc = game.level?.at(mon.mx, mon.my);
    let foundSomething = !searchCanSpotMonster(mon);
    if (mon.mundetected) {
        mon.mundetected = 0;
        foundSomething = true;
    }
    newsym(mon.mx, mon.my);
    if (!foundSomething) return 0;
    if (!searchCanSpotMonster(mon) && loc?.map_invisible) return -1;
    exerciseAttribute(A_WIS, true);
    if (!searchCanSpotMonster(mon)) {
        if (loc) loc.map_invisible = true;
        newsym(mon.mx, mon.my);
        await pline('You feel an unseen monster!');
        game._search_found_unseen_monster = 1;
        return 1;
    }
    return 0;
}

function killMonsterFromPassive(mon) {
    if (!mon || !(game.level?.monsters || []).includes(mon)) return;
    const data = mon.data || {};
    rn2(6);
    const corpseData = corpseDataForMonster(data);
    const dropCorpse = monsterLeavesCorpseLikeDrop(corpseData)
        && monsterCorpseDropSucceeds(mon, data);
    dropMonsterInventory(mon);
    if (dropCorpse) createMonsterCorpseOrGlob(mon, corpseData);
    recordVanquished(mon, false);
    const loc = game.level?.at(mon.mx, mon.my);
    if (loc?.map_invisible) {
        loc.map_invisible = false;
        loc.remembered_glyph = null;
    }
    game.level.monsters = (game.level?.monsters || []).filter(other => other !== mon);
    mon.movement = 0;
    mon.dead = true;
    newsym(mon.mx, mon.my);
}

function couldSeeCoord(x, y) {
    if (x <= 0 || y < 0 || x >= COLNO || y >= ROWNO) return false;
    return couldsee(x, y);
}

function monsterMinliquid(mon) {
    const loc = game.level?.at(mon.mx, mon.my);
    const data = mon.data || {};
    if (loc && data.swimmer && data.mlet === ';'
        && !IS_POOL(loc.typ) && !IS_LAVA(loc.typ)) {
        if ((mon.mhp || 0) > 1 && rn2(mon.mhp) > rn2(8))
            mon.mhp--;
        monfleeNoMessage(mon, 2, false);
        return false;
    }
    if (!loc || !IS_LAVA(loc.typ) || data.inAir || data.flyer || data.floater || data.likesLava)
        return false;

    if (data.resistsFire) {
        mon.mhp = (mon.mhp || 1) - 1;
        if (mon.mhp > 0) {
            if (cansee(mon.mx, mon.my))
                addToplineMessage(`${monsterDisplayName(mon)} burns slightly.`);
            return true;
        }
    }

    if (cansee(mon.mx, mon.my))
        addToplineMessage(`${monsterDisplayName(mon)} burns to a crisp.`);
    recordVanquished(mon, false);
    dropMonsterInventory(mon);
    game.level.monsters = (game.level?.monsters || []).filter(other => other !== mon);
    newsym(mon.mx, mon.my);
    return true;
}

function monfleeNoMessage(mon, fleetime, first) {
    if (!first || !mon.mflee) {
        if (!fleetime) {
            mon.mfleetim = 0;
        } else if (!mon.mflee || mon.mfleetim) {
            let newTime = fleetime + (mon.mfleetim || 0);
            if (newTime === 1) newTime++;
            mon.mfleetim = Math.min(newTime, 127);
        }
        mon.mflee = 1;
    }
    clearMonsterTrack(mon);
}

function monsterNextToHero(mon) {
    const dx = Math.abs(mon.mx - (game.u?.ux || 0));
    const dy = Math.abs(mon.my - (game.u?.uy || 0));
    return Math.max(dx, dy) <= 1 && !(mon.data?.name === 'grid bug' && dx && dy);
}

function monsterVisibleToHero(mon) {
    return !game.u?.blind && !mon.minvis && !mon.mundetected
        && !!(game.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT)
        && couldSeeCoord(mon.mx, mon.my);
}

function monsterSoundKey(mon) {
    const data = mon?.data || {};
    const explicit = mon?.msound ?? mon?.sound ?? data.msound ?? data.sound;
    return explicit == null ? '' : String(explicit).toLowerCase().replace(/^ms_/, '');
}

function heroIsDemonPolyself() {
    const form = game.u?._polyself_form || game.u?.youmonst?.data || null;
    if (!form) return false;
    const name = String(form.name || form.race || '').toLowerCase();
    const mlet = String(form.mlet || form.glyph || '').toLowerCase();
    return !!(form.demon || form.isDemon || mlet === '&' || mlet === 'demon'
        || /\b(?:demon|juiblex|yeenoghu|orcus|geryon|dispater|baalzebub|asmodeus|demogorgon)\b/.test(name));
}

function monsterDemonBribeRelocationSuffix(x, y, oldX, oldY) {
    const heroX = game.u?.ux ?? 0;
    const heroY = game.u?.uy ?? 0;
    const du = (x - heroX) * (x - heroX) + (y - heroY) * (y - heroY);
    if (du <= 2) return ' next to you';
    if (du <= BOLT_LIM * BOLT_LIM) return ' close by';
    const oldDu = (oldX - heroX) * (oldX - heroX) + (oldY - heroY) * (oldY - heroY);
    if (oldDu === du) return '';
    return du < oldDu ? ' closer to you' : ' farther away';
}

function monsterDemonBribeObjectName(mon) {
    const name = monsterDisplayName(mon);
    if (mon?.givenName || mon?.isshk || mon?.data?.unique
        || mon?.demonLord || mon?.demonPrince || mon?.data?.demonLord || mon?.data?.demonPrince)
        return name.replace(/^The /, '');
    return name.replace(/^The /, 'the ');
}

function relocateDemonicBlackmailBriber(mon) {
    const name = monsterDisplayName(mon);
    const wasVisible = monsterVisibleToHero(mon);
    if (noteleportLevelForMonster(mon))
        return wasVisible ? `A mysterious force prevents ${monsterDemonBribeObjectName(mon)} from teleporting!` : '';

    const oldX = mon.mx;
    const oldY = mon.my;
    if (!rlocNoMsg(mon)) return '';
    clearMonsterTrack(mon);
    newsym(oldX, oldY);
    newsym(mon.mx, mon.my);

    const nowVisible = monsterVisibleToHero(mon);
    if (wasVisible && nowVisible)
        return `${name} vanishes and reappears${monsterDemonBribeRelocationSuffix(mon.mx, mon.my, oldX, oldY)}.`;
    if (wasVisible) return `${name} vanishes!`;
    if (nowVisible) return `${name} appears${monsterDemonBribeRelocationSuffix(mon.mx, mon.my, oldX, oldY)}!`;
    return '';
}

function maybeDemonicBlackmailFalseImage(mon) {
    if (!mon || monsterSoundKey(mon) !== 'bribe' || !mon.mpeaceful || mon.mtame || game.u?.uswallow)
        return false;
    if (mon.mux === game.u?.ux && mon.muy === game.u?.uy) return false;
    const dx = mon.mx - (mon.mux ?? game.u?.ux ?? mon.mx);
    const dy = mon.my - (mon.muy ?? game.u?.uy ?? mon.my);
    const gridBugDiagonal = mon.data?.name === 'grid bug' && dx && dy;
    if (dx * dx + dy * dy >= 3 || gridBugDiagonal) return false;

    const messages = [`${cansee(mon.mux, mon.muy) ? monsterDisplayName(mon) : 'It'} whispers at thin air.`];
    if (heroIsDemonPolyself()) {
        const relocateMessage = relocateDemonicBlackmailBriber(mon);
        if (relocateMessage) messages.push(relocateMessage);
    } else {
        mon.minvis = 0;
        mon.perminvis = 0;
        mon.invisible = 0;
        mon.mpeaceful = 0;
        mon.peaceful = false;
        mon.mtame = 0;
        mon.tame = 0;
        mon.hostile = true;
        set_malign(mon);
        newsym(mon.mx, mon.my);
        messages.push(`${monsterDisplayName(mon)} gets angry!`);
    }
    for (const message of messages) addToplineMessage(message);
    return true;
}

function demonicBlackmailTrueTargetNearby(mon) {
    if (!mon || monsterSoundKey(mon) !== 'bribe' || !mon.mpeaceful || mon.mtame || game.u?.uswallow)
        return false;
    if (mon.mux !== game.u?.ux || mon.muy !== game.u?.uy) return false;
    const dx = mon.mx - (mon.mux ?? game.u?.ux ?? mon.mx);
    const dy = mon.my - (mon.muy ?? game.u?.uy ?? mon.my);
    const gridBugDiagonal = mon.data?.name === 'grid bug' && dx && dy;
    if (dx * dx + dy * dy >= 3 || gridBugDiagonal) return false;
    return true;
}

function demonicBlackmailPrinceReveal(mon) {
    const data = mon?.data || {};
    const isPrince = !!(mon?.demonPrince || mon?.isDemonPrince || data.demonPrince || data.isDemonPrince);
    if (!isPrince || !mon?.minvis) return '';
    const wasUnseen = !monsterVisibleToHero(mon);
    mon.minvis = 0;
    mon.perminvis = 0;
    mon.invisible = 0;
    if (Number.isInteger(mon.mstrategy)) mon.mstrategy &= ~STRAT_APPEARMSG;
    newsym(mon.mx, mon.my);
    if (wasUnseen && monsterVisibleToHero(mon)) return `${monsterDisplayName(mon)} appears before you.`;
    return '';
}

function interruptDemonicBlackmailOccupation() {
    if (game._eating_turns_remaining > 0) {
        clearActiveEatingOccupation(game);
        game._pending_rotten_food_eating_message = 0;
    }
    game._run_steps_remaining = 0;
    game._running_continuation = 0;
    game._initial_run_command = 0;
    game._run_steps_after_more = 0;
    game._travel_keys = [];
    game._travel_dynamic_target = null;
    game._search_pending_count = 0;
    game._counted_repeat_interruptible = 0;
    game._armor_wear_occupation = null;
    game._armor_takeoff_after_more = null;
    game._armor_finish_after_more = 0;
    game._force_lock_occupation = null;
    game._force_lock_continue_time = 0;
    game._force_lock_finish_after_more = null;
    game._pending_force_lock_start_message = 0;
    game._pick_lock_occupation = null;
    game._pick_lock_continue_time = 0;
    game._pick_dig_occupation = null;
    game._queued_pick_dig_apply_letter = null;
    game._apply_pick_dig_letter = null;
    game._tin_opening_occupation = null;
    game._tin_finish_after_turn = null;
    game._tin_opened_pending = null;
    game._spellbook_study_occupation = null;
    game._spellbook_finish_after_topline_more = null;
    game._prayer_occupation = 0;
    game._prayer_pending_done = 0;
    game._pending_prayer_finish_message = 0;
    game._prayer_process_time_now = 0;
    game._prayer_split_finish_message = 0;
    game._prayer_split_waiting_for_time = 0;
    game._prayer_split_remaining_time = 0;
}

function maybeDemonicBlackmailTrueTargetArtifact(mon) {
    if (!demonicBlackmailTrueTargetNearby(mon)) return false;
    const result = monsterTurnDemonBribeArtifact(mon);
    if (result?.message) addToplineMessage(result.message);
    return !!result?.handled;
}

function maybeDemonicBlackmailTrueTargetDemonPolyself(mon) {
    if (!demonicBlackmailTrueTargetNearby(mon) || !heroIsDemonPolyself()) return false;
    interruptDemonicBlackmailOccupation();
    const messages = [];
    const revealMessage = demonicBlackmailPrinceReveal(mon);
    if (revealMessage) messages.push(revealMessage);
    if (heroIsDeafForMonsterNoise()) {
        if (monsterVisibleToHero(mon)) messages.push(`${monsterDisplayName(mon)} says something.`);
    } else {
        messages.push(`${monsterDisplayName(mon)} says, "Good hunting, ${game.flags?.female ? 'Sister' : 'Brother'}."`);
    }
    const relocateMessage = relocateDemonicBlackmailBriber(mon);
    if (relocateMessage) messages.push(relocateMessage);
    if (messages.length) addToplineMessage(messages.join('  '));
    return true;
}

function maybeDemonicBlackmailTrueTargetNoGold(mon) {
    if (!demonicBlackmailTrueTargetNearby(mon)) return false;
    interruptDemonicBlackmailOccupation();
    const result = monsterTurnDemonBribeNoGold(mon);
    if (result?.message) addToplineMessage(result.message);
    return !!result?.handled;
}

function maybeDemonicBlackmailTrueTargetDemand(mon, monIndex, somebodyCanMove) {
    if (!demonicBlackmailTrueTargetNearby(mon)) return false;
    interruptDemonicBlackmailOccupation();
    const result = monsterTurnDemonBribeDemand(mon);
    if (!result?.handled) return false;
    const demandMessageShown = result.message ? addToplineMessage(result.message) : true;
    if (result.commandMode === 'demonBribeOffer' && result.demonBribe) {
        game._demon_bribe_mon = result.demonBribe.mon;
        game._demon_bribe_demand = result.demonBribe.demand;
        game._demon_bribe_prompt = result.demonBribe.mon?._last_demon_bribe_prompt || 'How much will you offer?';
        game._demon_bribe_text = '';
        game._demon_bribe_monster_turn = {
            resumeIndex: monIndex,
            nextIndex: monIndex + 1,
            somebodyCanMove,
        };
        if (demandMessageShown) game._command_mode = result.commandMode;
        else game._demon_bribe_offer_after_more = 1;
        return true;
    }
    return false;
}

function heroIsDeafForMonsterNoise() {
    return (game.u?._statusSuffix || '').includes('Deaf') || (game.u?._deafTimeout || 0) > 0;
}

function maybeMonsterTurnHostileCuss(mon) {
    if (!mon || monsterSoundKey(mon) !== 'cuss' || mon.mpeaceful || mon.minvis) return false;
    const targetX = mon.mux ?? game.u?.ux ?? mon.mx;
    const targetY = mon.muy ?? game.u?.uy ?? mon.my;
    if ((mon.mx - targetX) ** 2 + (mon.my - targetY) ** 2 > BOLT_LIM * BOLT_LIM) return false;
    if (!couldSeeCoord(mon.mx, mon.my)) return false;
    if (rn2(5)) return false;
    if (heroIsDeafForMonsterNoise()) return true;
    const noise = monsterHostileCussNoise(mon, monsterDisplayName(mon));
    if (noise.message) addToplineMessage(noise.message);
    return true;
}

function seaMonsterCanHideUnderWater(mon) {
    const loc = game.level?.at(mon.mx, mon.my);
    return !!loc && IS_POOL(loc.typ) && !game.u?.underwater;
}

function hideSeaMonsterUnderWater(mon) {
    const willHide = seaMonsterCanHideUnderWater(mon);
    mon.mundetected = willHide;
    if (willHide) newsym(mon.mx, mon.my);
    return willHide;
}

function monsterUsesPostMoveHide(mon) {
    return !!(mon.data?.hidesUnder || mon.data?.mlet === ';');
}

function monsterThrownSpearKind(item) {
    return String(item?.actualKind || item?.kind || item?.singular || item?.appearance || 'spear');
}

function monsterThrownShurikenKind(item) {
    const names = [item?.actualKind, item?.kind, item?.singular, item?.appearance]
        .map(name => String(name || '').toLowerCase())
        .filter(Boolean);
    if (names.includes('shuriken')) return 'shuriken';
    if (names.includes('throwing star')) return 'shuriken';
    return '';
}

function monsterLauncherProjectileKind(item) {
    return String(item?.singular || item?.actualKind || item?.kind || item?.appearance || 'arrow');
}

function monsterLauncherProjectileNames(item) {
    return [item?.singular, item?.actualKind, item?.kind, item?.appearance]
        .map(name => String(name || '').toLowerCase())
        .filter(Boolean);
}

function monsterLauncherProjectileDamageSides(item) {
    const names = monsterLauncherProjectileNames(item);
    if (names.some(name => name === 'crossbow bolt')) return 4;
    if (names.some(name => name === 'ya' || name === 'bamboo arrow'
        || name === 'elven arrow' || name === 'runed arrow')) return 7;
    if (names.some(name => name === 'orcish arrow' || name === 'crude arrow')) return 5;
    return 6;
}

function monsterLauncherProjectileDamageBonus(item) {
    return monsterLauncherProjectileNames(item).some(name => name === 'crossbow bolt') ? 1 : 0;
}

function monsterLauncherProjectileIsBowAmmo(item) {
    const names = monsterLauncherProjectileNames(item);
    return !names.some(name => name === 'crossbow bolt')
        && names.some(name => name === 'ya' || name === 'bamboo arrow' || name.includes('arrow'));
}

function monsterLauncherProjectileIsElvenArrow(item) {
    return monsterLauncherProjectileNames(item)
        .some(name => name === 'elven arrow' || name === 'runed arrow');
}

function monsterLauncherWeaponIsElvenBow(item) {
    return [item?.singular, item?.actualKind, item?.kind, item?.appearance]
        .map(name => String(name || '').toLowerCase())
        .some(name => name === 'elven bow' || name === 'runed bow');
}

function monsterIsElf(mon) {
    const name = String(mon?.data?.name || '').toLowerCase();
    return !!mon?.data?.elf || name === 'elf' || name.includes('elf');
}

function monsterThrownSpearNames(item) {
    return [item?.actualKind, item?.kind, item?.singular, item?.appearance]
        .map(name => String(name || '').toLowerCase())
        .filter(Boolean);
}

function monsterThrownSpearRank(item) {
    let rank = item?.otyp === SPEAR ? MONSTER_THROWN_SPEAR_RANKS.get('spear') : Infinity;
    for (const name of monsterThrownSpearNames(item)) {
        if (MONSTER_THROWN_SPEAR_RANKS.has(name))
            rank = Math.min(rank, MONSTER_THROWN_SPEAR_RANKS.get(name));
    }
    return rank === Infinity ? -1 : rank;
}

function monsterThrownSpearDamageSides(item) {
    for (const name of monsterThrownSpearNames(item)) {
        if (MONSTER_THROWN_SPEAR_SMALL_DAMAGE.has(name))
            return MONSTER_THROWN_SPEAR_SMALL_DAMAGE.get(name);
    }
    return 6;
}

function monsterHasDistanceAttackAvailable(mon) {
    const data = mon.data || {};
    const attacks = Array.isArray(data.attacks)
        ? data.attacks
        : data.attack ? [data.attack] : [];
    return attacks.some(attack => ['brea', 'breath', 'spit', 'magc'].includes(attack.aatyp))
        || data.spellcaster || data.magic || data.priest || data.name === 'gnomish wizard'
        || INNATE_RANGED_ATTACK_MONSTERS.has(data.name);
}

function monsterHasWeaponAttack(mon) {
    const data = mon.data || {};
    if (data.armed) return true;
    const attacks = Array.isArray(data.attacks)
        ? data.attacks
        : data.attack ? [data.attack] : [];
    return attacks.some(attack => attack.aatyp === 'weap');
}

function possiblyUnwieldMonsterWeapon(mon) {
    const weapon = mon?.mw;
    if (!weapon) return false;
    if (!(mon.minvent || []).includes(weapon)) {
        mon.mw = null;
        mon.weapon_check = NEED_WEAPON;
        return false;
    }
    if (monsterHasWeaponAttack(mon)) {
        mon.weapon_check = NEED_WEAPON;
        return false;
    }

    mon.mw = null;
    mon.weapon_check = NO_WEAPON_WANTED;
    if (!game.u?.blind && (game.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT)) {
        addToplineMessage(`${monsterDisplayName(mon)} drops ${pickupObjectName(weapon)}.`);
        newsym(mon.mx, mon.my);
    }
    const floorMessages = [];
    dropMonsterObject(mon, weapon, floorMessages, { verb: 'drop', monsterMoving: true });
    addMonsterThrownFloorMessages(floorMessages);
    return true;
}

function monsterWouldCheckOffensiveLine(mon) {
    const data = mon.data || {};
    if (mon.mpeaceful || data.animal || data.mindless || data.nohands) return false;
    if (game.u?.uswallow) return false;
    const ux = game.u?.ux || 0;
    const uy = game.u?.uy || 0;
    if (scaryObjectAt(mon, ux, uy) || scaryEngravingAt(mon, ux, uy)) return false;
    return true;
}

function disturbSleepingMonster(mon) {
    const data = mon.data || {};
    const dx = mon.mx - (game.u?.ux || 0);
    const dy = mon.my - (game.u?.uy || 0);
    if (!couldSeeCoord(mon.mx, mon.my) || dx * dx + dy * dy > 100) return false;
    if (game.u?.stealth && (data.name !== 'ettin' || !rn2(10))) return false;
    const hardToWake = data.mlet === 'n'
        || data.mlet === 'l'
        || data.name === 'jabberwock'
        || data.name === 'vorpal jabberwock';
    if (hardToWake && rn2(50)) return false;
    const alertMonster = game.u?.aggravateMonster || data.mlet === 'd' || data.mlet === '@';
    const appearance = M_AP_TYPE(mon);
    if (!alertMonster && (rn2(7) || appearance === M_AP_FURNITURE || appearance === M_AP_OBJECT))
        return false;
    if (!game.u?.blind && !mon.minvis && !mon.mundetected && couldSeeCoord(mon.mx, mon.my))
        addToplineMessage(`${monsterDisplayName(mon)} wakes up${mon.mpeaceful ? '.' : '!'}`);
    mon.msleeping = 0;
    return true;
}

function accessibleCoord(x, y) {
    const loc = game.level?.at(x, y);
    return !!loc && ACCESSIBLE(loc.typ)
        && !(loc.typ === DOOR && (loc.doormask & (D_LOCKED | D_CLOSED)));
}

function monsterCanOozeOrFogUnderDoor(mon) {
    const data = mon?.data || {};
    return !!(data.amorphous || data.name === 'fog cloud' || data.vampshifter);
}

function apparentTargetAccessible(mon, x, y) {
    if (accessibleCoord(x, y)) return true;
    const loc = game.level?.at(x, y);
    return !!loc && loc.typ === DOOR
        && (loc.doormask & (D_LOCKED | D_CLOSED))
        && monsterCanOozeOrFogUnderDoor(mon);
}

function linedupBlockingTerrain(x, y) {
    const loc = game.level?.at(x, y);
    return !loc || IS_OBSTRUCTED(loc.typ)
        || (loc.typ === DOOR && (loc.doormask & (D_LOCKED | D_CLOSED)))
        || loc.typ === WATER || loc.typ === LAVAWALL;
}

function monsterLinedUp(mon, targetX, targetY) {
    const cachedRoll = mon._linedup_boulder_roll;
    mon._linedup_boulder_roll = null;
    const targetIsHero = targetX === game.u?.ux && targetY === game.u?.uy;
    if (targetIsHero && game.u?._polyself_base) {
        const cachedPolyRoll = mon._linedup_polyself_roll;
        mon._linedup_polyself_roll = null;
        const roll = cachedPolyRoll?.targetX === targetX && cachedPolyRoll?.targetY === targetY
            ? cachedPolyRoll.roll
            : rn2(25);
        const apType = game.u._apType || 'monster';
        const concealed = game.u.uundetected || (apType !== 'nothing' && apType !== 'monster');
        if (roll && concealed) return false;
    }

    const dx = targetX - mon.mx;
    const dy = targetY - mon.my;
    const range = Math.max(Math.abs(dx), Math.abs(dy));
    if (!range || range >= BOLT_LIM) return false;
    if (dx && dy && Math.abs(dx) !== Math.abs(dy)) return false;

    if (targetIsHero ? couldSeeCoord(mon.mx, mon.my) : clearPath(targetX, targetY, mon.mx, mon.my))
        return true;
    if (!targetIsHero) return false;

    const stepX = Math.sign(dx);
    const stepY = Math.sign(dy);
    let x = mon.mx;
    let y = mon.my;
    let boulders = 0;
    do {
        x += stepX;
        y += stepY;
        if (linedupBlockingTerrain(x, y)) return false;
        if ((game.level?.objects || []).some(obj =>
            !obj.transientProjectile && obj.otyp === BOULDER && obj.ox === x && obj.oy === y))
            boulders++;
    } while (x !== targetX || y !== targetY);
    if (cachedRoll?.targetX === targetX && cachedRoll?.targetY === targetY) return cachedRoll.pass;
    return rn2(2 + boulders) < 2;
}

function maybeRedDragonFireBreath(mon, ray, attack, monIndex, somebodyCanMove) {
    const sourceVisible = !game.u?.blind && !mon.minvis && !mon.mundetected && couldSeeCoord(mon.mx, mon.my);
    if (mon.mcan) {
        if (sourceVisible) addToplineMessage(`${monsterDisplayName(mon, true)} coughs.`);
        return true;
    }
    if (!rn2(3)) return true;
    mon._breath_used_this_turn = 1;
    if (sourceVisible) addToplineMessage(`${monsterDisplayName(mon, true)} breathes ${attack.element}!`);
    ray.remaining = rn2(7) + 7;

    for (;;) {
        const event = advanceFireBreathRay(ray, mon.m_id, {
            floorFire: (x, y) => burnRayFloorObjectsByFire(x, y, { heroCaused: false }),
        });
        for (const message of event.messages) {
            if (message) addToplineMessage(message);
        }
        if (!event.target) {
            finishHeroTargetedBreath(mon);
            return true;
        }
        if (event.target.type === 'monster') {
            const target = event.target.mon;
            if (fireBreathZapHits(target.data?.ac ?? target.ac ?? 10)) {
                const visible = !game.u?.blind && !target.minvis && !target.mundetected
                    && couldSeeCoord(target.mx, target.my);
                const hit = fireBreathDamageMonster(target, attack.dice, origDamage => {
                    const messages = [];
                    const damage = monsterFireInventoryDamage(target, origDamage, messages, visible);
                    igniteMonsterFireInventoryItems(target, messages, visible);
                    return { damage, messages };
                });
                for (const message of hit.messages) addToplineMessage(message);
                if (!hit.killedHidden) {
                    addToplineMessage(game.u?.blind || target.minvis || target.mundetected
                        ? 'The blast of fire hits it!'
                        : `The blast of fire hits ${monsterDisplayName(target).replace(/^The /, 'the ')}!`);
                }
                if (ray.remaining > 0) ray.remaining = Math.max(0, ray.remaining - 2);
            }
            continue;
        }
        if (!fireBreathZapHits(game.u?.uac ?? 10)) continue;
        if (ray.remaining > 0) ray.remaining = Math.max(0, ray.remaining - 2);
        game._queued_messages_after_more ??= [];
        game._queued_messages_after_more.push({
            text: 'The blast of fire hits you!',
            more: true,
            fireBreathHeroHit: {
                dice: attack.dice,
                ray: { ...ray, heardGas: false },
                sourceId: mon.m_id,
                resumeIndex: monIndex + 1,
                somebodyCanMove,
            },
        });
        game._message_more = 1;
        game._process_time_with_more = 0;
        return true;
    }
}

function monsterPickupClass(obj) {
    if (obj.otyp === GOLD_PIECE || obj.glyph === '$' || obj.cls === 'coin') return GOLD_PIECE;
    if (obj.otyp === WEAPON_CLASS || obj.cls === 'weapon' || obj.glyph === ')' || obj.otyp === DART || obj.otyp === ORCISH_DAGGER) return WEAPON_CLASS;
    if (obj.otyp === ARMOR_CLASS || obj.cls === 'armor' || obj.glyph === '[') return ARMOR_CLASS;
    if (obj.otyp === FOOD_CLASS || obj.otyp === KELP_FROND || obj.cls === 'food' || obj.foodRoll) return FOOD_CLASS;
    if (obj.otyp === GEM_CLASS || obj.cls === 'gem' || obj.glyph === '*') return GEM_CLASS;
    if (obj.otyp === POTION_CLASS || obj.cls === 'potion' || obj.glyph === '!') return POTION_CLASS;
    if (obj.otyp === SCROLL_CLASS || obj.cls === 'scroll' || obj.glyph === '?') return SCROLL_CLASS;
    if (obj.otyp === WAND_CLASS || obj.cls === 'wand' || obj.glyph === '/') return WAND_CLASS;
    if (obj.otyp === SPBOOK_CLASS || obj.cls === 'spellbook') return SPBOOK_CLASS;
    if (obj.otyp === TOOL_CLASS || obj.cls === 'tool' || obj.glyph === '(') return TOOL_CLASS;
    if (obj.otyp === RING_CLASS || obj.cls === 'ring' || obj.glyph === '=') return RING_CLASS;
    if (obj.otyp === AMULET_CLASS || obj.cls === 'amulet' || obj.glyph === '"') return AMULET_CLASS;
    return obj.otyp;
}

function monsterWouldTakeItem(mon, obj) {
    if (!obj || obj.transientProjectile) return false;
    const cubeWantsObject = isGelatinousCube(mon) && !gelatinousCubeUntouchableObject(mon, obj);
    if (!cubeWantsObject) {
        if (obj.otyp === BOULDER || obj.otyp === STATUE) return false;
        if (obj.otyp === CORPSE || obj.otyp === 'corpse') return false;
    }

    const cls = monsterPickupClass(obj);
    const data = mon.data || {};
    const bodyWeight = data.cwt ?? MONSTER_BODY_WEIGHTS.get(data.name) ?? 1450;
    let maxLoad = (!data.strong || bodyWeight > 1450)
        ? Math.trunc((1000 * bodyWeight) / 1450)
        : 1000;
    if (!data.strong) maxLoad = Math.trunc(maxLoad / 2);
    let currentLoad = 0;
    for (const held of mon.minvent || []) currentLoad += objectWeight(held);
    const pctLoad = Math.trunc((currentLoad * 100) / Math.max(maxLoad, 1));
    if (!mon.isshk && currentLoad + objectWeight(obj) > Math.max(maxLoad, 1)) return false;
    if (cubeWantsObject) return true;

    if (pctLoad < 75 && monsterSearchesForItem(mon, obj, cls)) return true;
    if (data.likesGold && cls === GOLD_PIECE && pctLoad < 95) return true;
    if (data.likesGems && cls === GEM_CLASS && pctLoad < 85) return true;
    if ((data.armed || data.collect || data.likesObjs || data.mlet === 'nymph')
        && [WEAPON_CLASS, ARMOR_CLASS, GEM_CLASS, FOOD_CLASS].includes(cls)
        && pctLoad < 75) return true;
    if (data.likesMagic
        && [AMULET_CLASS, POTION_CLASS, SCROLL_CLASS, WAND_CLASS, RING_CLASS, SPBOOK_CLASS].includes(cls)
        && pctLoad < 85) return true;
    return false;
}

function isScareMonsterScroll(obj) {
    if (!obj) return false;
    if (obj.otyp === SCR_SCARE_MONSTER) return true;
    if (obj.otyp !== SCROLL_CLASS && obj.cls !== 'scroll') return false;
    return obj.scrollIndex === 3 || String(obj.kind || '').includes('scare monster');
}

function monsterIgnoresScareMonster(mon) {
    const data = mon.data || {};
    return mon.pet || mon.mpeaceful || mon.isshk || mon.ispriest || mon.mcansee === false
        || data.mlet === '@' || data.name === 'minotaur';
}

function scaryObjectAt(mon, x, y) {
    if (monsterIgnoresScareMonster(mon)) return false;
    return (game.level?.objects || []).some(obj =>
        !obj.hidden && !obj.transientProjectile && obj.ox === x && obj.oy === y && isScareMonsterScroll(obj));
}

function scaryEngravingAt(mon, x, y) {
    if (monsterIgnoresScareMonster(mon) || mon.mpeaceful || mon.mcansee === false) return false;
    if (mon.isshk || mon.isgd || mon.data?.name === 'minotaur') return false;
    if (game.u?.ux !== x || game.u?.uy !== y) return false;
    return (game.level?.engravings || []).some(engr =>
        engr.x === x && engr.y === y && /Elbereth/.test(engr.text || ''));
}

function monsterKnowsTrap(mon, ttyp) {
    if (!mon) return false;
    if (ttyp === ALL_TRAPS) {
        if (Number.isInteger(mon.mtrapseen)) return mon.mtrapseen === ~0;
        return mon.knownTraps?.includes(ALL_TRAPS) || false;
    }
    if (ttyp <= 0) return false;
    if (Number.isInteger(mon.mtrapseen)) return !!(mon.mtrapseen & (1 << (ttyp - 1)));
    return mon.knownTraps?.includes(ALL_TRAPS) || mon.knownTraps?.includes(ttyp) || false;
}

function monsterLearnTrap(mon, ttyp) {
    if (!mon) return;
    if (ttyp === ALL_TRAPS) {
        mon.mtrapseen = ~0;
        mon.knownTraps = [ALL_TRAPS];
        return;
    }
    if (ttyp <= 0) return;
    mon.mtrapseen = (mon.mtrapseen || 0) | (1 << (ttyp - 1));
    mon.knownTraps ??= [];
    if (!mon.knownTraps.includes(ttyp)) mon.knownTraps.push(ttyp);
}

function monsterTriggerTrap(mon, trap) {
    if (!trap?.ttyp) return;
    monsterLearnTrap(mon, trap.ttyp);
    const loc = game.level?.at(trap.tx, trap.ty);
    const maxDist = loc?.lit ? 49 : 2;
    for (const witness of game.level?.monsters || []) {
        const data = witness.data || {};
        if (data.animal || data.mindless || data.noeyes || witness.mcansee === false) continue;
        if ((witness.mx - trap.tx) ** 2 + (witness.my - trap.ty) ** 2 > maxDist) continue;
        if (!clearPath(witness.mx, witness.my, trap.tx, trap.ty)) continue;
        monsterLearnTrap(witness, trap.ttyp);
    }
}

function validTeleportTrapDestination(dst) {
    return Number.isInteger(dst?.x) && Number.isInteger(dst?.y)
        && dst.x >= 1 && dst.x < COLNO && dst.y >= 0 && dst.y < ROWNO;
}

function monsterTeleportTrapDestination(trap) {
    if (validTeleportTrapDestination(trap?.teledest)) return trap.teledest;
    if (validTeleportTrapDestination(trap?.launch)) return trap.launch;
    return null;
}

function monsterVisibleForTeleportFeedback(mon) {
    return (mon === game.u?.usteed)
        || (!game.u?.blind && couldSeeCoord(mon.mx, mon.my) && !mon.minvis && !mon.mundetected);
}

function monsterTeleportDestinationOccupied(mon, x, y) {
    if (game.u?.ux === x && game.u?.uy === y) return true;
    return (game.level?.monsters || []).some(other => {
        if (!other?.mx || other === mon) return false;
        if (other.mx === x && other.my === y) return true;
        return Array.isArray(other.wormSegments)
            && other.wormSegments.some(seg => seg.x === x && seg.y === y);
    });
}

function monsterVaultTeleportSpotGood(mon, x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !ACCESSIBLE(loc.typ)) return false;
    if (monsterTeleportDestinationOccupied(mon, x, y)) return false;
    const boulder = (game.level?.objects || [])
        .some(obj => !obj.transientProjectile && obj.otyp === BOULDER && obj.ox === x && obj.oy === y);
    return !boulder || !!mon.data?.throwsRocks;
}

function monsterVaultTeleport(mon) {
    const vaultRoom = (game.level?.rooms || []).find(room => room?.rtype === VAULT);
    const spot = { x: 0, y: 0 };
    if (vaultRoom && somexyspace(vaultRoom, spot) && monsterVaultTeleportSpotGood(mon, spot.x, spot.y)) {
        rlocToCoreNoMsg(mon, spot.x, spot.y);
        clearMonsterTrack(mon);
        return true;
    }
    if (!rlocNoMsg(mon)) return false;
    clearMonsterTrack(mon);
    return true;
}

function monsterTeleportTrapEffect(mon, trap) {
    if (trap?.ttyp !== TELEP_TRAP) return false;
    const fixedDest = monsterTeleportTrapDestination(trap);
    if (!fixedDest && monsterKnowsTrap(mon, trap.ttyp) && rn2(4)) return true;

    monsterTriggerTrap(mon, trap);
    if (noteleportLevelForMonster(mon) || mon === game.u?.usteed) return true;

    const oldX = mon.mx;
    const oldY = mon.my;
    const inSight = monsterVisibleForTeleportFeedback(mon);
    const monName = monsterDisplayName(mon);
    if (trap.once) {
        monsterVaultTeleport(mon);
    } else if (fixedDest) {
        if (!monsterTeleportDestinationOccupied(mon, fixedDest.x, fixedDest.y)) {
            rlocToCoreNoMsg(mon, fixedDest.x, fixedDest.y);
            clearMonsterTrack(mon);
        }
    } else if (rlocNoMsg(mon)) {
        clearMonsterTrack(mon);
    }

    const moved = mon.mx !== oldX || mon.my !== oldY;
    if (inSight) {
        trap.tseen = true;
        addToplineMessage(monsterVisibleForTeleportFeedback(mon)
            ? `${monName} seems disoriented.`
            : `${monName} suddenly disappears!`);
    }
    newsym(oldX, oldY);
    if (moved) newsym(mon.mx, mon.my);
    return true;
}

function monsterTrapHarmless(mon, trap) {
    const ttyp = trap?.ttyp;
    const data = mon.data || {};
    const floorTrigger = [ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, BEAR_TRAP, LANDMINE, ROLLING_BOULDER_TRAP,
        SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP, PIT, SPIKED_PIT, HOLE, TRAPDOOR].includes(ttyp);
    if (!game.level?.flags?.sokoban_rules && floorTrigger && data.inAir) return true;
    if (ttyp === BEAR_TRAP) return data.verysmall || data.small || data.amorphous || data.unsolid;
    if (ttyp === RUST_TRAP) return data.name !== 'iron golem';
    if (ttyp === WEB) return monsterWebPassesThrough(data);
    if (ttyp === ANTI_MAGIC) return data.resistsMagic || data.defendsMagic;
    return ttyp === STATUE_TRAP || ttyp === MAGIC_TRAP || ttyp === VIBRATING_SQUARE;
}

function monsterPossessiveName(mon) {
    const name = monsterDisplayName(mon).replace(/^The /, 'the ');
    return name.endsWith('s') ? `${name}'` : `${name}'s`;
}

function monsterFireTrapArmorSlot(mon, slot, messages, visible, ownerPrefix) {
    const inventory = mon.minvent || [];
    const matches = {
        helm: item => /helm|helmet|hat|fedora|cornuthaum|cap|pot/.test(String(item.kind || item.actualKind || '').toLowerCase()),
        cloak: item => /cloak|robe|smock|wrapping/.test(String(item.kind || item.actualKind || '').toLowerCase()),
        body: item => SUIT_ARMOR_PATTERN.test(String(item.kind || item.actualKind || '').toLowerCase()),
        shirt: item => /shirt/.test(String(item.kind || item.actualKind || '').toLowerCase()),
        shield: item => /shield/.test(String(item.kind || item.actualKind || '').toLowerCase()),
        gloves: item => /glove|gauntlet/.test(String(item.kind || item.actualKind || '').toLowerCase()),
        boots: item => /boot|shoe/.test(String(item.kind || item.actualKind || '').toLowerCase()),
    }[slot];
    const item = inventory.find(candidate => candidate.cls === 'armor'
        && (candidate.worn || candidate.owornmask) && matches?.(candidate));
    if (!item) return false;
    return erodeArmorByFireTrap(item, { messages, ownerPrefix, visible });
}

function monsterBurnArmor(mon, visible = false) {
    const messages = [];
    const ownerPrefix = monsterPossessiveName(mon);
    dryWetTowelFromFire(mon.minvent || [], { messages, ownerPrefix, visible });

    for (;;) {
        switch (rn2(5)) {
        case 0:
            if (!monsterFireTrapArmorSlot(mon, 'helm', messages, visible, ownerPrefix)) continue;
            break;
        case 1:
            monsterFireTrapArmorSlot(mon, 'cloak', messages, visible, ownerPrefix)
                || monsterFireTrapArmorSlot(mon, 'body', messages, visible, ownerPrefix)
                || monsterFireTrapArmorSlot(mon, 'shirt', messages, visible, ownerPrefix);
            return { bodyHit: true, messages };
        case 2:
            if (!monsterFireTrapArmorSlot(mon, 'shield', messages, visible, ownerPrefix)) continue;
            break;
        case 3:
            if (!monsterFireTrapArmorSlot(mon, 'gloves', messages, visible, ownerPrefix)) continue;
            break;
        case 4:
            if (!monsterFireTrapArmorSlot(mon, 'boots', messages, visible, ownerPrefix)) continue;
            break;
        }
        break;
    }
    return { bodyHit: false, messages };
}

function monsterFireDestroyableItem(item) {
    if (!item || item.artifact || item.oartifact || (item.in_use && (item.quan || 1) === 1)) return false;
    const cls = item.cls || '';
    const kind = String(item.kind || item.actualKind || '').toLowerCase();
    if (kind === 'fire' || kind === 'fireball' || kind === 'book of the dead') return false;
    return cls === 'potion' || cls === 'scroll' || cls === 'spellbook'
        || kind === 'glob of green slime';
}

function monsterDestroyItemsByFire(mon, damage) {
    let limit = Math.trunc(damage / 5);
    if (damage % 5 > rn2(5)) limit++;
    if (limit < 1) return 0;

    const selected = [];
    let eligible = 0;
    for (const item of mon.minvent || []) {
        if (!monsterFireDestroyableItem(item)) continue;
        const index = eligible < limit ? eligible : rn2(eligible);
        eligible++;
        if (index < limit) selected[index] = item;
    }
    let extraDamage = 0;
    for (const item of selected) {
        if (!item) continue;
        const quantity = Math.max(1, item.quan || 1);
        let destroyed = 0;
        for (let i = 0; i < quantity; i++) {
            if (!rn2(3)) destroyed++;
        }
        if (!destroyed) continue;
        if (item.cls === 'potion') extraDamage += rnd(6);
        mon.minvent = (mon.minvent || []).filter(candidate => candidate !== item);
    }
    return extraDamage;
}

function killMonsterInFireTrap(mon) {
    recordVanquished(mon, false);
    dropMonsterInventory(mon);
    game.level.monsters = (game.level?.monsters || []).filter(other => other !== mon);
    mon.movement = 0;
    newsym(mon.mx, mon.my);
}

function monsterFireTrapEffect(mon, trap) {
    monsterTriggerTrap(mon, trap);
    const origDamage = d(2, 4);
    const visibleMonster = !game.u?.blind && couldSeeCoord(mon.mx, mon.my) && !mon.minvis && !mon.mundetected;
    const visibleTrap = !game.u?.blind && couldSeeCoord(trap.tx, trap.ty);
    if (visibleMonster) {
        addToplineMessage(`A tower of flame erupts from the floor under ${monsterDisplayName(mon).replace(/^The /, 'the ')}!`);
    } else if (visibleTrap) {
        addToplineMessage('You see a tower of flame erupt from the floor!');
    }

    if (!mon.data?.resistsFire) {
        let damage = origDamage;
        const name = mon.data?.name || '';
        if (name === 'paper golem') damage = Math.max(damage, mon.mhpmax || damage);
        else if (name === 'straw golem') damage = Math.max(damage, Math.trunc((mon.mhpmax || damage) / 2));
        else if (name === 'wood golem') damage = Math.max(damage, Math.trunc((mon.mhpmax || damage) / 4));
        else if (name === 'leather golem') damage = Math.max(damage, Math.trunc((mon.mhpmax || damage) / 8));

        mon.mhp = (mon.mhp || 1) - damage;
        if ((mon.mhp || 0) <= 0) {
            killMonsterInFireTrap(mon);
            return true;
        }
        const maxLoss = rn2(damage + 1);
        mon.mhpmax = Math.max(1, (mon.mhpmax || mon.mhp || 1) - maxLoss);
        mon.mhp = Math.min(mon.mhp || 1, mon.mhpmax);
    }

    const armorFire = monsterBurnArmor(mon, visibleMonster);
    for (const message of armorFire.messages) addToplineMessage(message);
    if (armorFire.bodyHit || rn2(3)) {
        const extraDamage = monsterDestroyItemsByFire(mon, origDamage);
        mon.mhp = (mon.mhp || 1) - extraDamage;
        if ((mon.mhp || 0) <= 0) {
            killMonsterInFireTrap(mon);
            return true;
        }
    }
    const floorFire = burnFloorObjectsByFire(trap.tx, trap.ty, { giveFeedback: visibleTrap });
    for (const message of floorFire.messages) addToplineMessage(message);
    const ux = game.u?.ux ?? -99;
    const uy = game.u?.uy ?? -99;
    if (floorFire.count && !visibleTrap && (trap.tx - ux) ** 2 + (trap.ty - uy) ** 2 <= 9)
        addToplineMessage('You smell smoke.');
    if (visibleTrap) trap.tseen = true;
    return false;
}

function monsterWebmakerData(data) {
    return !!(data?.webmaker || data?.name === 'cave spider' || data?.name === 'giant spider');
}

function monsterWebDestructionVerb(data) {
    const name = data?.name || '';
    if (data?.flaming || name === 'flaming sphere' || name === 'fire elemental'
        || name === 'salamander' || name === 'fire vortex') return 'burns';
    if (data?.acidic || name === 'acid blob' || name === 'gelatinous cube') return 'dissolves';
    return '';
}

function monsterWebFlowsThrough(data) {
    const name = data?.name || '';
    return !!(data?.amorphous || data?.unsolid || data?.noncorporeal || data?.whirly
        || name === 'gelatinous cube' || name === 'fog cloud'
        || name.endsWith(' vortex') || name === 'air elemental');
}

function monsterWebPassesThrough(data) {
    return monsterWebmakerData(data) || !!monsterWebDestructionVerb(data) || monsterWebFlowsThrough(data);
}

function monsterWebSpecialEffect(mon, trap) {
    if (!trap || trap.ttyp !== WEB || mon.mtrapped) return false;
    const data = mon.data || {};
    if (monsterWebmakerData(data)) return true;
    const webName = trap.madeby_u ? 'your spider web' : 'a spider web';
    const visible = couldSeeCoord(mon.mx, mon.my);
    const verb = monsterWebDestructionVerb(data);
    if (verb) {
        if (visible) addToplineMessage(`${monsterDisplayName(mon)} ${verb} ${webName}!`);
        game.level.traps = (game.level?.traps || []).filter(item => item !== trap);
        newsym(mon.mx, mon.my);
        return true;
    }
    if (monsterWebFlowsThrough(data)) {
        if (visible) {
            trap.tseen = true;
            addToplineMessage(`${monsterDisplayName(mon)} flows through ${webName}.`);
        }
        return true;
    }
    return false;
}

function monsterAllowFlags(mon, allowHeroAttack = false, conflictActive = false) {
    const data = mon.data || {};
    const canOpen = !data.nohands && !data.verysmall;
    let canTunnel = data.tunnel && !game.level?.flags?.rogue_level;
    let flags = 0;

    if (canTunnel && data.needPick && (!mon.mpeaceful || conflictActive)) {
        const targetX = mon.mux ?? game.u?.ux ?? mon.mx;
        const targetY = mon.muy ?? game.u?.uy ?? mon.my;
        if ((mon.mx - targetX) ** 2 + (mon.my - targetY) ** 2 <= 8)
            canTunnel = false;
    }

    if (mon.pet || mon.mtame) flags |= ALLOW_M | ALLOW_TRAPS | ALLOW_SANCT | ALLOW_SSM;
    else if (mon.mpeaceful) flags |= ALLOW_SANCT | ALLOW_SSM;
    else flags |= ALLOW_U;

    if (allowHeroAttack) flags |= ALLOW_U;
    if (mon.isshk || mon.ispriest) flags |= ALLOW_SSM | ALLOW_SANCT;
    if (data.passWalls) flags |= ALLOW_ROCK | ALLOW_WALL;
    if (data.throwsRocks || data.breaksBoulders) flags |= ALLOW_ROCK;
    if (canTunnel) flags |= ALLOW_DIG;
    if (data.giant) flags |= BUSTDOOR;
    if (canOpen) flags |= OPENDOOR;
    if (canOpen && (mon.hasKey || mon.iswiz || data.rider)) flags |= UNLOCKDOOR;
    if (/ unicorn$/.test(data.name || '') && !game.level?.flags?.noteleport) flags |= NOTONL;
    if (data.mlet === '@' || data.name === 'minotaur') flags |= ALLOW_SSM;
    if (data.passWalls || data.amorphous || data.noncorporeal || data.whirly
        || data.verysmall || data.name === 'bat' || data.name === 'rock mole')
        flags |= ALLOW_BARS;
    if ((data.mlet === 'W' || data.mlet === 'Z' || data.mlet === 'M'
        || data.vampshifter) && data.name !== 'ghost')
        flags |= NOGARLIC;
    return flags;
}

function monsterHasNonHeroMove(mon, conflictActive = false) {
    return mfndpos(mon, monsterAllowFlags(mon, false, conflictActive))
        .some(pos => !(pos.info & ALLOW_U) && !pos.occupant);
}

function badRockForMonster(mon, x, y) {
    if (game.level?.flags?.sokoban_rules
        && game.level?.objects?.some(obj => obj.otyp === BOULDER && obj.ox === x && obj.oy === y)) return true;
    const loc = game.level?.at(x, y);
    if (!loc || !IS_OBSTRUCTED(loc.typ)) return false;

    const data = mon.data || {};
    const mayDig = !(IS_STWALL(loc.typ) || loc.typ === TREE) || !(loc.wall_info & W_NONDIGGABLE);
    const mayPasswall = !IS_STWALL(loc.typ) || !(loc.wall_info & W_NONPASSWALL);
    return (!data.tunnel || data.needPick || !mayDig) && !(data.passWalls && mayPasswall);
}

function monsterCantSqueezeThrough(mon) {
    const data = mon.data || {};
    if (data.passWalls) return false;
    if ((data.big || data.bigmonst || data.giant)
        && !(data.amorphous || data.whirly || data.noncorporeal || data.slithy || data.name === 'fog cloud')) return true;

    let load = 0;
    for (const obj of mon.minvent || []) {
        if (obj.otyp === BOULDER && data.throwsRocks) continue;
        load += objectWeight(obj);
    }
    return load > 600;
}

function mfndpos(mon, flag) {
    const data = mon.data || {};
    const x = mon.mx;
    const y = mon.my;
    const nowLoc = game.level?.at(x, y);
    const nodiag = data.name === 'grid bug';
    const poolOk = !!(data.inAir || data.flyer || data.floater || (data.swimmer && data.mlet !== ';'));
    const lavaOk = !!(data.inAir || data.flyer || data.floater || data.likesLava);
    let wantPool = data.mlet === ';';
    let rockOk = false;
    let treeOk = false;
    let thruDoor = !!(flag & (ALLOW_WALL | BUSTDOOR));

    if (flag & ALLOW_DIG) {
        if (!data.needPick) {
            rockOk = true;
            treeOk = true;
        } else {
            const inventory = mon.minvent || [];
            const shieldWorn = inventory.some(item => item.worn
                && item.cls === 'armor'
                && String(item.kind || '').includes('shield'));
            const weaponKind = mon.mw?.kind || '';
            const weaponCheck = mon.weapon_check ?? 0;
            if (mon.mw?.cursed && !weaponCheck) {
                rockOk = weaponKind === 'pick-axe' || weaponKind === 'dwarvish mattock';
                treeOk = weaponKind === 'axe' || weaponKind === 'battle-axe';
            } else {
                rockOk = inventory.some(item =>
                    item.kind === 'pick-axe'
                    || (item.kind === 'dwarvish mattock' && !shieldWorn));
                treeOk = inventory.some(item =>
                    item.kind === 'axe'
                    || (item.kind === 'battle-axe' && !shieldWorn));
            }
        }
        if (rockOk || treeOk) thruDoor = true;
    }

    for (;;) {
        if (mon.mconf) {
            flag |= ALLOW_ALL;
            flag &= ~NOTONL;
        }
        if (mon.mcansee === false) flag |= ALLOW_SSM;
        const poss = [];
        for (let nx = Math.max(1, x - 1); nx <= Math.min(COLNO - 1, x + 1); nx++) {
            for (let ny = Math.max(0, y - 1); ny <= Math.min(ROWNO - 1, y + 1); ny++) {
                if (nx === x && ny === y) continue;
                const loc = game.level?.at(nx, ny);
                if (!loc) continue;
                const mayPasswall = !IS_STWALL(loc.typ) || !(loc.wall_info & W_NONPASSWALL);
                const mayDig = !(IS_STWALL(loc.typ) || IS_TREE(loc.typ)) || !(loc.wall_info & W_NONDIGGABLE);
                const canDig = (IS_TREE(loc.typ) ? treeOk : rockOk) && mayDig;
                if (IS_OBSTRUCTED(loc.typ) && !((flag & ALLOW_WALL) && mayPasswall) && !canDig) continue;
                if (loc.typ === IRONBARS && !(flag & ALLOW_BARS)) continue;

                const closedDoor = loc.typ === DOOR && (loc.doormask & D_CLOSED);
                const lockedDoor = loc.typ === DOOR && (loc.doormask & D_LOCKED);
                if ((closedDoor && !(flag & OPENDOOR) || lockedDoor && !(flag & UNLOCKDOOR)) && !thruDoor) continue;

                if (nx !== x && ny !== y) {
                    const diagonalDoor = (nowLoc?.typ === DOOR && (nowLoc.doormask & ~D_BROKEN))
                        || (loc.typ === DOOR && (loc.doormask & ~D_BROKEN));
                    if (nodiag || diagonalDoor) continue;
                    if (badRockForMonster(mon, x, ny)
                        && badRockForMonster(mon, nx, y)
                        && monsterCantSqueezeThrough(mon)) continue;
                }

                if (!(poolOk || IS_POOL(loc.typ) === wantPool)) continue;
                if (loc.typ === WATER && !WATERWALL_SWIMMERS.has(data.name)) continue;
                if (loc.typ === LAVAWALL && !(flag & ALLOW_WALL)) continue;
                if (!lavaOk && IS_LAVA(loc.typ)) continue;

                let info = 0;
                let occupant = null;
                if (scaryObjectAt(mon, nx, ny)) {
                    if (!(flag & ALLOW_SSM)) continue;
                    info |= ALLOW_SSM;
                }

                const heroHere = nx === (game.u?.ux || 0) && ny === (game.u?.uy || 0);
                const apparentHeroHere = !mon.pet && nx === mon.mux && ny === mon.muy;
                if (heroHere || apparentHeroHere) {
                    if (heroHere) {
                        mon.mux = game.u?.ux || nx;
                        mon.muy = game.u?.uy || ny;
                    }
                    if (!(flag & ALLOW_U)) continue;
                    info |= ALLOW_U;
                } else {
                    occupant = game.level?.monsters?.find(other => other !== mon && other.mx === nx && other.my === ny) || null;
                    if (occupant) {
                        if (!(flag & ALLOW_M)) continue;
                        info |= ALLOW_M;
                        if (occupant.pet || occupant.mtame) {
                            if (!(flag & ALLOW_TM)) continue;
                            info |= ALLOW_TM;
                        }
                    }
                }

                const boulder = game.level?.objects?.some(obj =>
                    !obj.transientProjectile && obj.ox === nx && obj.oy === ny && obj.otyp === BOULDER);
                if (boulder) {
                    if (!(flag & ALLOW_ROCK)) continue;
                    info |= ALLOW_ROCK;
                }
                const garlic = game.level?.objects?.some(obj =>
                    !obj.transientProjectile && obj.ox === nx && obj.oy === ny
                    && String(obj.kind || obj.actualKind || '').toLowerCase() === 'clove of garlic');
                if (garlic) {
                    if (flag & NOGARLIC) continue;
                    info |= NOGARLIC;
                }

                const targetX = mon.mux ?? game.u?.ux ?? 0;
                const targetY = mon.muy ?? game.u?.uy ?? 0;
                const onLine = nx === targetX || ny === targetY || Math.abs(nx - targetX) === Math.abs(ny - targetY);
                const monSeesHero = mon.mcansee !== false && (!game.u?.invisible || data.seeInvisible);
                if (monSeesHero && onLine) {
                    if (flag & NOTONL) continue;
                    info |= NOTONL;
                }

                const trap = game.level?.traps?.find(t => t.tx === nx && t.ty === ny);
                if (trap && !monsterTrapHarmless(mon, trap)) {
                    if (!(flag & ALLOW_TRAPS) && monsterKnowsTrap(mon, trap.ttyp)) continue;
                    info |= ALLOW_TRAPS;
                }

                poss.push({ x: nx, y: ny, info, occupant, target: occupant, heroSpot: !!(info & ALLOW_U) });
            }
        }
        if (poss.length || !wantPool || IS_POOL(nowLoc?.typ ?? 0)) return poss;
        wantPool = false;
    }
}

function monsterSearchesForItem(mon, obj, cls) {
    const data = mon.data || {};
    if (data.mindless || data.nohands || data.name === 'ghost') return false;
    if (cls === TOOL_CLASS) return !obj.olocked
        && (obj.contents != null || obj.kind === 'bag' || obj.otyp === LARGE_BOX || obj.otyp === CHEST);
    if (cls === WAND_CLASS) {
        if ((obj.spe ?? 0) <= 0) return false;
        const wandIndex = obj.wandIndex;
        if (wandIndex === 8) return !mon.minvis && !mon.invis_blkd && !data.gaze;
        if (wandIndex === 10) return mon.mspeed !== 'fast' && mon.mspeed !== 2;
        if (wandIndex === 12) return (data.difficulty ?? data.mlevel ?? 0) < 6;
        return SEARCH_WAND_INDICES.has(wandIndex);
    }
    if (cls !== POTION_CLASS) return false;

    if (obj.potionIndex != null) return SEARCH_POTION_INDICES.has(obj.potionIndex);
    const kind = String(obj.kind || '').toLowerCase();
    return kind.includes('healing') || kind.includes('speed')
        || kind.includes('invisibility') || kind.includes('gain level')
        || kind.includes('polymorph') || kind.includes('paralysis')
        || kind.includes('sleeping') || kind.includes('acid')
        || kind.includes('confusion') || kind.includes('blindness');
}

function monsterCanReachItem(mon, x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || IS_OBSTRUCTED(loc.typ)) return false;
    if ((game.level?.objects || []).some(obj =>
        !obj.transientProjectile && obj.ox === x && obj.oy === y && obj.otyp === BOULDER)
        && !mon.data?.throwsRocks) return false;
    if ((IS_POOL(loc.typ) || IS_LAVA(loc.typ)) && !(mon.data?.swimmer || mon.data?.flyer)) return false;
    return true;
}

function monsterSearchItemGoal(mon) {
    if (mon.mpeaceful || !(game.level?.objects || []).length) return null;

    const heroDist = Math.max(Math.abs((mon.mux ?? game.u?.ux ?? mon.mx) - mon.mx),
        Math.abs((mon.muy ?? game.u?.uy ?? mon.my) - mon.my));
    let radius = heroDist < 5 ? 4 : 5;
    if (mon.data?.mercenary) radius = 1;

    let goal = null;
    const objects = game.level.objects || [];
    for (let x = Math.max(1, mon.mx - radius); x <= Math.min(COLNO - 1, mon.mx + radius); x++) {
        for (let y = Math.max(0, mon.my - radius); y <= Math.min(ROWNO - 1, mon.my + radius); y++) {
            const dist = Math.max(Math.abs(mon.mx - x), Math.abs(mon.my - y));
            if (radius < dist || !monsterCanReachItem(mon, x, y)) continue;
            if (!objects.some(obj => !obj.transientProjectile && obj.ox === x && obj.oy === y)) continue;

            const blocker = game.level?.monsters?.find(other => other !== mon && other.mx === x && other.my === y);
            if (blocker && (blocker.waiting || blocker.mundetected || blocker.appearObj != null
                || !(blocker.data?.mmove ?? NORMAL_SPEED))) continue;
            const trap = game.level?.traps?.find(item => item.tx === x && item.ty === y);
            if (trap && monsterKnowsTrap(mon, trap.ttyp)) continue;
            if (!clearPath(mon.mx, mon.my, x, y)) continue;

            const roomno = game.level?.at(x, y)?.roomno || 0;
            const room = levelRoomByRoomno(roomno);
            const costlySpot = (room?.rtype || 0) >= SHOPBASE;
            const stack = [...objects].reverse()
                .filter(obj => obj.ox === x && obj.oy === y && !obj.transientProjectile);
            if (!stack.some(obj => obj.otyp !== ROCK && obj.kind !== 'rock' && !obj.isRock
                && (!costlySpot || obj.no_charge)
                && (monsterWouldTakeItem(mon, obj) || monsterWouldConsumeItem(mon, obj)))) continue;
            radius = dist;
            goal = { x, y };
            if (!dist) return goal;
        }
    }
    return goal;
}

function monsterPickStuff(mon, monIndex = null, somebodyCanMove = false, forceMoreOnAppend = false) {
    if (metallivoreEatFloorMetal(mon)) return true;
    if (gelatinousCubeEatFloorObjects(mon)) return true;
    if (corpseEaterEatFloorCorpse(mon)) return true;
    if (mon.mpeaceful && !(mon.pet || mon.mtame) && !mon.isshk) return false;
    const objects = game.level?.objects || [];
    const obj = [...objects].reverse()
        .find(item => item.ox === mon.mx && item.oy === mon.my && monsterWouldTakeItem(mon, item));
    if (!obj || !monsterCanReachItem(mon, mon.mx, mon.my)) return false;
    let deferPickupNewsym = false;
    let deferPickupForExistingTopline = false;
	    const food = (obj.otyp === FOOD_CLASS || obj.cls === 'food' || obj.foodRoll)
	        ? TOURIST_FOODS.find(([max]) => (obj.foodRoll || 1000) <= max)
	        : null;
	    const name = (obj.otyp === POTION_CLASS || obj.cls === 'potion')
	        ? 'potion'
	        : food ? (obj.kind || obj.singular || food[1] || 'food ration')
	            : (obj.otyp === ORCISH_DAGGER || obj.kind === 'orcish dagger') ? 'crude dagger'
	            : pickupObjectName(obj);
			    if (!game.u?.blind && (game.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT)) {
                if ((game.u?._statusSuffix || '').includes('Hallu'))
                    game._hallu_refresh_after_monster_pickup = { x: mon.mx, y: mon.my };
                if ((game.u?._statusSuffix || '').includes('Hallu'))
                    game._hallu_names_after_visible_monster_pickup = 1;
			        const cell = game.nhDisplay?.grid?.[mon.my + 1]?.[mon.mx - 1];
		        const article = (obj.quan || 1) > 1 ? '' : (/^[aeiou]/i.test(name) ? 'an ' : 'a ');
                const pickedObjectName = (obj.quan || 1) > 1
                    ? (obj.plural || (name.endsWith('s') ? name : `${name}s`))
                    : name;
                const pickedName = (obj.quan || 1) > 1 ? `${obj.quan} ${pickedObjectName}` : `${article}${pickedObjectName}`;
		        const message = `${monsterDisplayName(mon, true, true)} picks up ${pickedName}.`;
		        const hadTopline = !!game._pending_message;
		        let shown = true;
		        if (game._topline_after_more) {
	            deferPickupForExistingTopline = true;
		            const width = game.nhDisplay?.cols || 80;
	            if (game._topline_after_more.length + message.length + 3 < width - 8)
                game._topline_after_more = `${game._topline_after_more}  ${message}`;
            else {
                game._queued_messages_after_more ??= [];
                game._queued_messages_after_more.push({ text: message, more: true });
	            }
	            game._topline_more_after_more = 1;
	            game._message_more = 1;
	            game._process_time_with_more = 0;
	            shown = false;
		        } else if (game._suppress_monster_attack_messages) {
		            shown = true;
		        } else {
		            shown = addToplineMessage(message);
		            if (shown && forceMoreOnAppend && hadTopline && monIndex != null) {
		                game._message_more = 1;
		                game._process_time_with_more = 0;
		                shown = false;
		            }
		        }
	        if (!shown && monIndex != null) {
            game._monster_resume_index = monIndex + 1;
            game._monster_resume_somebody_can_move = false;
            game._pickup_resume_after_more = 1;
            game._pickup_deferred_postmove_monsters ??= [];
            game._pickup_deferred_postmove_monsters.push(mon);
            if (deferPickupForExistingTopline) {
                mon._pickup_newsym_after_more = 1;
                deferPickupNewsym = true;
            }
        }
    }
    const quan = obj.quan || 1;
    const cls = monsterPickupClass(obj);
    const dragonStack = (mon.data?.mlet === 'D' || mon.data?.glyph === 'D')
        && (cls === GOLD_PIECE || cls === GEM_CLASS);
    const carryAmount = mon.data?.nohands && quan > 1 && !dragonStack ? 1 : quan;
    const pickedObj = carryAmount < quan ? { ...obj, quan: carryAmount } : obj;
    if (pickedObj === obj) {
        const idx = objects.indexOf(obj);
        if (idx >= 0) objects.splice(idx, 1);
    } else {
        pickedObj.id = next_ident();
        obj.quan -= carryAmount;
    }
    pickedObj.seen = false;
    pickedObj._hide_until_seen = false;
    add_to_minv(mon, pickedObj);
    if (pickedObj.cls === 'armor' || pickedObj.glyph === '[' || pickedObj.otyp === ARMOR_CLASS)
        mon._gear_next_turn = 1;
    if (deferPickupNewsym) {
        const glyph = game.level?.at(mon.mx, mon.my)?.remembered_glyph;
        if (glyph) show_glyph_cell(mon.mx, mon.my, glyph.ch, glyph.color, glyph.dec);
    } else {
        newsym(mon.mx, mon.my);
    }
    return true;
}

const WIZARD_MONSTER_SPELLS = [
    { name: 'psiBolt', level: 0, indirect: false, hostile: true, sight: true },
    { name: 'cureSelf', level: 1, indirect: true },
    { name: 'hasteSelf', level: 2, indirect: true },
    { name: 'stunYou', level: 3, indirect: false, hostile: true, sight: true },
    { name: 'disappear', level: 4, indirect: true },
    { name: 'weakenYou', level: 6, indirect: false, hostile: true, sight: true },
    { name: 'destroyArmor', level: 8, indirect: false, hostile: true, sight: true },
    { name: 'curseItems', level: 10, indirect: false, hostile: true, sight: true },
    { name: 'aggravation', level: 13, indirect: true, hostile: true, sight: true },
    { name: 'summonMons', level: 15, indirect: true, hostile: true, sight: true },
    { name: 'cloneWiz', level: 18, indirect: true, hostile: true, sight: true },
    { name: 'deathTouch', level: 20, indirect: false, hostile: true, sight: true },
];

function monsterCastsWizardSpells(data) {
    return data.name === 'gnomish wizard' || data.mlet === 'L';
}

function monsterHasMagicAttack(data) {
    return monsterCastsWizardSpells(data) || data.spellcaster || data.magic || data.priest;
}

function monsterSpellWouldBeUseless(mon, spell) {
    if (spell.hostile && mon.mpeaceful) return true;
    if (spell.sight && !couldSeeCoord(mon.mx, mon.my)) return true;

    switch (spell.name) {
    case 'cloneWiz':
        return !mon.iswiz;
    case 'cureSelf':
        return (mon.mhp || 0) >= (mon.mhpmax || 0);
    case 'disappear':
        return !!mon.minvis || !!mon.invis_blkd || (!!mon.mpeaceful && !game.u?.seeInvisible);
    case 'hasteSelf':
        return mon.permspeed === 'fast';
    default:
        return false;
    }
}

function chooseWizardMonsterSpell(mon) {
    const level = Math.max(1, mon.m_lev || mon.data?.hpLevel || mon.data?.mlevel || 1);
    const maxSpellLevel = WIZARD_MONSTER_SPELLS[WIZARD_MONSTER_SPELLS.length - 1].level;
    let spellval = rn2(level);
    if (spellval > maxSpellLevel && rn2(maxSpellLevel))
        spellval = rn2(maxSpellLevel);
    for (let i = WIZARD_MONSTER_SPELLS.length - 1; i >= 0; --i) {
        const spell = WIZARD_MONSTER_SPELLS[i];
        if (spell.level <= spellval && !monsterSpellWouldBeUseless(mon, spell))
            return spell;
    }
    return WIZARD_MONSTER_SPELLS[0];
}

function currentLevelInHell() {
    return game.dungeons?.[game.u?.uz?.dnum]?.name === 'Gehennom';
}

function alignSign(maligntyp) {
    return maligntyp > 0 ? 1 : maligntyp < 0 ? -1 : 0;
}

async function summonNastiesForMonster(summoner) {
    const before = (game.level?.monsters || []).length;
    if (!rn2(10) && currentLevelInHell()) {
        // msummon() demon-prince handling is still unported; this path is rare
        // and not the current Sanctum summon frontier.
        return 0;
    }

    let count = 0;
    const maxNasties = 10;
    const summonerClass = summoner.data?.mlet || '';
    const castalign = alignSign(summoner.data?.maligntyp || 0);
    let difcap = summoner.data?.difficulty || 0;
    const outer = rnd((game.u?.ulevel || 1) > 3 ? Math.trunc((game.u?.ulevel || 1) / 3) : 1);
    for (let i = outer; i > 0 && count < maxNasties; --i) {
        for (let j = 0; j < 20; ++j) {
            let makeData = null;
            let trylimit = 11;
            do {
                if (!--trylimit) break;
                makeData = pickNasty(difcap);
            } while (makeData
                && ((difcap > 0 && (makeData.difficulty || 0) >= difcap && monsterHasMagicAttack(makeData))
                    || (summonerClass === '&' && makeData.mlet === 'A')
                    || (summonerClass === 'A' && makeData.mlet === '&')));
            if (!trylimit || !makeData) continue;

            const targetX = summoner.mux ?? game.u?.ux ?? summoner.mx;
            const targetY = summoner.muy ?? game.u?.uy ?? summoner.my;
            const spot = enextoMonsterSpot(targetX, targetY, makeData);
            if (!spot) continue;
            const mon = await makemon(makeData, spot.x, spot.y, MM_NOMSG);
            if (!mon) continue;
            mon.msleeping = 0;
            mon.mpeaceful = 0;
            mon.mtame = 0;
            set_malign(mon);
            mon.mspec_used = rnd(4);
            if (mon.data?.name === 'minotaur')
                mon.data = { ...mon.data, color: CLR_BROWN };
            newsym(mon.mx, mon.my);

            if (mon.data?.name === 'arch-lich' || mon.data?.name === 'Archon') {
                const cap = 26;
                if (!difcap || difcap > cap) difcap = cap;
            }
            count = (game.level?.monsters || []).length - before;
            if (count >= maxNasties
                || (mon.data?.maligntyp || 0) === 0
                || alignSign(mon.data?.maligntyp || 0) === castalign)
                break;
        }
    }
    return count;
}

async function maybeCastUndirectedMonsterSpell(mon) {
    const data = mon.data || {};
    const clericCaster = data.priest || data.name === 'acolyte';
    const wizardCaster = !clericCaster
        && (monsterCastsWizardSpells(data) || data.spellcaster || data.magic);
    const caster = wizardCaster || clericCaster;
    if (mon.mspec_used || !caster) return false;
    if ((mon.mx - (game.u?.ux || 0)) ** 2 + (mon.my - (game.u?.uy || 0)) ** 2 > 49) return false;
    if (wizardCaster) {
        const spell = chooseWizardMonsterSpell(mon);
        if (!spell.indirect || monsterSpellWouldBeUseless(mon, spell)) return false;
        mon.mspec_used = (mon.m_lev || 0) < 8 ? 10 - (mon.m_lev || 0) : 2;
        if (rn2(Math.max(1, (mon.m_lev || 1) * 10)) < (mon.mconf ? 100 : 20))
            return false;
        if (spell.name !== 'summonMons'
            && couldSeeCoord(mon.mx, mon.my) && !game.u?.blind && !mon.minvis && !mon.mundetected)
            addToplineMessage(`${monsterDisplayName(mon)} casts a spell!`);
        if (spell.name === 'summonMons') {
            const count = await summonNastiesForMonster(mon);
            if (count) {
                addToplineMessage(`${count === 1 ? 'A monster appears' : 'Monsters appear'} from nowhere!`);
                if (game._sanctum_summon_ready) {
                    game._sanctum_summon_ready = 0;
                    game._sanctum_summon_script_phase = 'afterSummon';
                    game._refresh_monsters_for_turn_tail_once = 1;
                    if (game.u) game.u.uhunger = 899;
                }
            }
            rn2(5);
            return true;
        }
        if (spell.name === 'disappear') {
            const wasVisible = couldSeeCoord(mon.mx, mon.my)
                && !game.u?.blind && !mon.minvis && !mon.mundetected;
            mon.minvis = 1;
            if (wasVisible) {
                addToplineMessage(`${monsterDisplayName(mon)} suddenly ${game.u?.seeInvisible ? 'becomes transparent' : 'disappears'}!`);
                if (!game.u?.seeInvisible) {
                    const loc = game.level?.at(mon.mx, mon.my);
                    if (loc) loc.map_invisible = true;
                }
            }
            newsym(mon.mx, mon.my);
        } else if (spell.name === 'hasteSelf') {
            mon.permspeed = 'fast';
            mon.mspeed = 'fast';
        } else if (spell.name === 'cureSelf') {
            mon.mhp = Math.min(mon.mhpmax || mon.mhp || 1, (mon.mhp || 1) + Math.max(1, Math.trunc((mon.m_lev || 1) / 2) + 1));
        }
        rn2(5);
        return true;
    }
    const level = Math.max(1, mon.m_lev || mon.data?.hpLevel || mon.data?.mlevel || 1);
    const cleric = clericCaster;
    const maxSpellLevel = cleric ? 13 : 20;
    const attackCount = data.name === 'Arch Priest' ? 2 : 1;
    for (let i = 0; i < attackCount; i++) {
        const spellLevel = rn2(level);
        if (spellLevel > maxSpellLevel && rn2(maxSpellLevel))
            rn2(maxSpellLevel);
    }
    return false;
}

function maybeSpinMonsterWeb(mon) {
    const webmaker = monsterWebmakerData(mon.data);
    if (!webmaker || mon.mspec_used) return;
    if (game.level?.traps?.some(trap => trap.tx === mon.mx && trap.ty === mon.my)) return;
    rn2(1000);
}

function clearPath(x1, y1, x2, y2) {
    if (x1 === x2 && y1 === y2) return true;

    const xStep = Math.sign(x2 - x1);
    const yStep = Math.sign(y2 - y1);
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const clear = (x, y) => {
        const loc = game.level?.at(x, y);
        const boulder = game.level?.objects?.some(obj =>
            !obj.transientProjectile && obj.otyp === BOULDER && obj.ox === x && obj.oy === y);
        return !!loc && !IS_OBSTRUCTED(loc.typ)
            && !boulder
            && (loc.typ !== DOOR || !(loc.doormask & (D_CLOSED | D_LOCKED)));
    };

    let x = x1;
    let y = y1;
    if (dy > dx) {
        let err = (dx << 1) - dy;
        for (let k = dy - 1; k > 0; k--) {
            if (err >= 0) {
                x += xStep;
                err -= dy << 1;
            }
            y += yStep;
            err += dx << 1;
            if (!clear(x, y)) return false;
        }
    } else {
        let err = (dy << 1) - dx;
        for (let k = dx - 1; k > 0; k--) {
            if (err >= 0) {
                y += yStep;
                err -= dx << 1;
            }
            x += xStep;
            err += dy << 1;
            if (!clear(x, y)) return false;
        }
    }
    return true;
}

function consumeSetApparxy(mon) {
    const ux = game.u?.ux || 0;
    const uy = game.u?.uy || 0;
    if (mon?.pet) {
        mon.mux = ux;
        mon.muy = uy;
        return false;
    }
    if (!mon) return false;
    if (mon.mux === ux && mon.muy === uy) {
        mon.mux = ux;
        mon.muy = uy;
        return false;
    }
    const notseen = mon.mcansee === false || (game.u?.invisible && !mon.data?.seeInvisible);
    if (!notseen && (!game._has_displacement || (mon.mux === ux && mon.muy === uy))) {
        if (mon) { mon.mux = ux; mon.muy = uy; }
        return false;
    }

    const displ = notseen ? 1 : couldSeeCoord(mon.mux ?? 0, mon.muy ?? 0) ? 2 : 1;
    if (!rn2(notseen ? 3 : 4)) {
        mon.mux = ux;
        mon.muy = uy;
        return true;
    }

    let mx = ux;
    let my = uy;
    for (let trycnt = 0; trycnt <= 200; trycnt++) {
        mx = ux - displ + rn2(2 * displ + 1);
        my = uy - displ + rn2(2 * displ + 1);
        if (mx <= 0 || my < 0 || mx >= COLNO || my >= ROWNO) continue;
        if (displ !== 2 && mx === mon.mx && my === mon.my) continue;
        if ((mx !== ux || my !== uy) && !apparentTargetAccessible(mon, mx, my)) continue;
        if (!couldSeeCoord(mx, my)) continue;
        break;
    }
    mon.mux = mx;
    mon.muy = my;
    return true;
}

function findMonsterHealingPotion(mon) {
    return [...(mon.minvent || [])].reverse().find(item => {
        const kind = String(item.kind || '').replace(/^potion:/, '').replace(/^potion of /, '');
        return item.otyp === POT_FULL_HEALING || item.otyp === POT_EXTRA_HEALING || item.otyp === POT_HEALING
            || (item.cls === 'potion' && (item.potionIndex === 18 || item.potionIndex === 11 || item.potionIndex === 10
                || kind === 'full healing' || kind === 'extra healing' || kind === 'healing'));
    });
}

function drinkMonsterHealingPotion(mon, healingPotion) {
    const potionDesc = game._object_descriptions?.potions?.[healingPotion.potionIndex]?.description || '';
    if (potionDesc === 'milky' || potionDesc === 'smoky') rn2(13);
    const visible = couldSeeCoord(mon.mx, mon.my);
    addToplineMessage(visible
        ? `${monsterDisplayName(mon)} drinks ${healingPotion.kind ? `a potion of ${String(healingPotion.kind).replace(/^potion:/, '').replace(/^potion of /, '')}` : 'a potion'}!`
        : 'You hear a chugging sound.');
    if (healingPotion.otyp === POT_FULL_HEALING || healingPotion.potionIndex === 18) {
        mon.mhp = mon.mhpmax || mon.mhp || 1;
    } else {
        const sides = healingPotion.otyp === POT_EXTRA_HEALING || healingPotion.potionIndex === 11 ? 8 : 4;
        mon.mhp = Math.min(mon.mhpmax || mon.mhp || 1, (mon.mhp || 1) + d(6, sides));
    }
    if ((healingPotion.quan || 1) > 1) healingPotion.quan--;
    else mon.minvent = (mon.minvent || []).filter(item => item !== healingPotion);
}

function moveMonsterTowardHero(mon, conflictActive = false, monIndex = null, somebodyCanMove = false) {
    mon._opened_door_this_move = 0;
    const data = mon.data || {};
    const done = () => {
        mon._move_consumed_turn = 1;
        return true;
    };
    if (mon.data?.hidesUnder) {
        const stack = (game.level?.objects || [])
            .filter(obj => !obj.transientProjectile && obj.ox === mon.mx && obj.oy === mon.my)
            .reverse();
        const trap = game.level?.traps?.find(t => t.tx === mon.mx && t.ty === mon.my);
        if (stack.length && (!trap || trap.ttyp === PIT || trap.ttyp === SPIKED_PIT)) {
            let canHide = true;
            if (stack[0].otyp === GOLD_PIECE || stack[0].glyph === '$' || stack[0].cls === 'coin') {
                let coins = 0;
                canHide = false;
                for (const obj of stack) {
                    if (!(obj.otyp === GOLD_PIECE || obj.glyph === '$' || obj.cls === 'coin')) {
                        canHide = true;
                        break;
                    }
                    coins += obj.quan || 1;
                    if (coins >= 10) {
                        canHide = true;
                        break;
                    }
                }
            }
            if (canHide && rn2(10)) {
                mon._hider_stayed_under = 1;
                return false;
            }
        }
    }
    consumeSetApparxy(mon);
    const skipTenguTeleport = !!mon._skip_tengu_teleport_once;
    mon._skip_tengu_teleport_once = 0;
    mon._resume_after_teleport_restrict_more = 0;
    if (!skipTenguTeleport && data.name === 'tengu' && !rn2(5) && !mon.mcan) {
        const demonCourtRestricted = game.level?.flags?.demon_court_noteleport
            && !data.demonLord && !data.demonPrince;
        if (game.level?.flags?.noteleport || demonCourtRestricted) {
            if (couldSeeCoord(mon.mx, mon.my)) {
                const monName = monsterDisplayName(mon).replace(/^The /, 'the ');
                if (game._travel_keep_message) {
                    if (game._pending_message === game._travel_keep_message) game._pending_message = '';
                    game._travel_keep_message = '';
                }
                if (!addToplineMessage(`A mysterious force prevents ${monName} from teleporting!`)
                    && game._message_more && !game._process_time_with_more) {
                    game._monster_resume_index = monIndex ?? 0;
                    game._monster_resume_somebody_can_move = somebodyCanMove;
	                    game._monster_resume_same_index = 1;
	                    game._monster_resume_after_preturn = 1;
                    mon._skip_tengu_teleport_once = 1;
                    mon._resume_after_teleport_restrict_more = 1;
                    mon._paused_for_teleport_restrict_more = 1;
	                    return false;
	                }
	            }
	        } else {
            const oldX = mon.mx;
            const oldY = mon.my;
            let spot = null;
            if ((mon.mhp || 0) >= 7 && !mon.mpeaceful && !rn2(2))
                spot = enextoMonsterSpot(game.u?.ux || 0, game.u?.uy || 0, data);
            for (let trycount = 0; !spot && trycount < 50; trycount++) {
                const x = rnd(COLNO - 1);
                const y = rn2(ROWNO);
                const loc = game.level?.at(x, y);
                const occupied = (game.level?.monsters || [])
                    .some(other => other !== mon && other.mx === x && other.my === y);
                const boulder = (game.level?.objects || [])
                    .some(obj => obj.otyp === BOULDER && obj.ox === x && obj.oy === y);
                const onHero = game.u?.ux === x && game.u?.uy === y;
                const badPool = IS_POOL(loc?.typ) && !data.swimmer;
                if (loc && ACCESSIBLE(loc.typ) && !occupied && !boulder && !onHero && !badPool)
                    spot = { x, y };
            }
            if (spot) {
                mon.mx = spot.x;
                mon.my = spot.y;
                clearMonsterTrack(mon);
                newsym(oldX, oldY);
                newsym(mon.mx, mon.my);
                return done();
            }
        }
    }
    const peacefulWander = !!mon.mpeaceful;
    const peacefulSearchItems = !peacefulWander || !rn2(10);
    let randomWander = peacefulWander;
    if (mon.mconf) randomWander = true;
    let goalX = mon.mux ?? game.u?.ux ?? mon.mx;
    let goalY = mon.muy ?? game.u?.uy ?? mon.my;
    const nowLoc = game.level?.at(mon.mx, mon.my);
    const goalLoc = game.level?.at(goalX, goalY);
    const monsterCouldSee = couldSeeCoord(mon.mx, mon.my);
    const shouldSee = monsterCouldSee
        && (goalLoc?.lit || !nowLoc?.lit)
        && (mon.mx - goalX) ** 2 + (mon.my - goalY) ** 2 <= 36;
    const goalDist2 = (mon.mx - goalX) ** 2 + (mon.my - goalY) ** 2;
    const invisibleShouldSee = monsterCouldSee
        && (goalLoc?.lit || !nowLoc?.lit)
        && goalDist2 <= 36;
    if (mon.mcansee === false)
        randomWander = true;
    else if (invisibleShouldSee && game.u?.invisible && !data.seeInvisible) {
        if (rn2(11))
            randomWander = true;
    }
    if (!shouldSee && !mon.data?.noeyes) {
        const tracks = game._utrack || [];
        for (let i = tracks.length - 1; i >= 0; i--) {
            const track = tracks[i];
            const dist = Math.max(Math.abs(mon.mx - track.x), Math.abs(mon.my - track.y));
            if (dist > 1) continue;
            if (dist) {
                goalX = track.x;
                goalY = track.y;
            }
            break;
        }
        if (mon.data?.mlet === 'L' && Math.abs(mon.my - goalY) === 1 && Math.abs(mon.mx - goalX) > 6)
            goalX = mon.mx;
    }
    if (!game.u?.uswallow && !peacefulWander
        && (mon.data?.name === 'stalker' || mon.data?.mlet === 'B' || mon.data?.mlet === 'y')) {
        if (!rn2(3))
            randomWander = true;
    }
    if (mon.mcansee === false) randomWander = true;
    let appr = randomWander ? 0 : (mon.mflee ? -1 : 1);
    const targetDist2 = (mon.mx - goalX) ** 2 + (mon.my - goalY) ** 2;
    const suppressInnateRangedBalk = !!mon._spit_no_balk && !game.u?.uinvulnerable;
    mon._spit_no_balk = 0;
    if (!mon.mpeaceful && targetDist2 < 25 && mon.mcansee !== false && couldSeeCoord(mon.mx, mon.my)) {
        const inventory = mon.minvent || [];
        const weaponKind = String(mon.mw?.kind || mon.mw?.actualKind || '');
        const carriedLauncher = inventory.find(item =>
            /^(?:bow|elven bow|orcish bow|yumi|crossbow|sling)$/.test(String(item.kind || item.actualKind || '')));
        const launcherKind = weaponKind || String(carriedLauncher?.kind || carriedLauncher?.actualKind || '');
        const weaponEntry = WEAPON_DISCOVERIES.find(entry =>
            entry.name === weaponKind || entry.appearance === weaponKind);
        const launcherWeapon = !!weaponEntry?.launcher || /(^| )(bow|crossbow|sling|yumi)$/.test(launcherKind);
        const hasLauncherAndAmmo = launcherWeapon && inventory.some(item => {
            const kind = String(item.kind || item.actualKind || '');
            if (launcherKind.includes('crossbow')) return kind.includes('bolt');
            if (launcherKind.includes('sling')) return kind === 'rock' || item.cls === 'gem' || item.glyph === '*';
            return kind.includes('arrow') || kind === 'ya';
        });
        const hasPolearmInRange = !!weaponEntry?.polearm && targetDist2 <= MON_POLE_DIST;
        const hasRangedMagic = (data.spellcaster || data.name === 'gnomish wizard')
            && ((mon.mhp ?? mon.mhpmax ?? 1) < Math.trunc(((mon.mhpmax ?? mon.mhp ?? 1) + 1) / 3)
                || !mon.mspec_used);
        const hasInnateRangedAttack = INNATE_RANGED_ATTACK_MONSTERS.has(data.name)
            && !suppressInnateRangedBalk
            && ((mon.mhp ?? mon.mhpmax ?? 1) < Math.trunc(((mon.mhpmax ?? mon.mhp ?? 1) + 1) / 3)
                || !mon.mspec_used);
        if (hasLauncherAndAmmo || hasPolearmInRange || hasRangedMagic || hasInnateRangedAttack) appr = -1;
    }
    const canSearchItemsThisTurn = peacefulSearchItems && !game.level?.flags?.rogue_level;
    const apparentX = mon.mux ?? game.u?.ux ?? mon.mx;
    const apparentY = mon.muy ?? game.u?.uy ?? mon.my;
    const throwRange = game.u?._polyself_base?.throwsRocks
        ? 20
        : Math.trunc((game.u?.acurr?.a?.[A_STR] ?? 10) / 2) + 1;
    const inLine = canSearchItemsThisTurn && !peacefulWander && monsterLinedUp(mon, apparentX, apparentY);
    const inThrowRange = Math.max(Math.abs(mon.mx - apparentX), Math.abs(mon.my - apparentY)) <= throwRange;
    const searchItems = canSearchItemsThisTurn
        && (appr !== 1 || randomWander || !inLine || !inThrowRange || mon.mconf || mon.mstun);
    const itemGoal = searchItems ? monsterSearchItemGoal(mon) : null;
    if (itemGoal) {
        if (itemGoal.x === mon.mx && itemGoal.y === mon.my) {
            monsterPickStuff(mon, monIndex, somebodyCanMove);
            mon._move_consumed_turn = 1;
            return false;
        }
        goalX = itemGoal.x;
        goalY = itemGoal.y;
    }
    if (searchItems && appr === -1) {
        const heroDist = Math.max(Math.abs((mon.mux ?? game.u?.ux ?? mon.mx) - mon.mx),
            Math.abs((mon.muy ?? game.u?.uy ?? mon.my) - mon.my));
        if (heroDist < 5) {
            if (heroDist <= 3) {
                goalX = mon.mux ?? game.u?.ux ?? goalX;
                goalY = mon.muy ?? game.u?.uy ?? goalY;
            } else {
                appr = 1;
            }
        }
    }
    if (conflictActive) {
        // C mon_allowflags() calls resist_conflict() before mfndpos().
        rnd(20);
    }
    const poss = mfndpos(mon, monsterAllowFlags(mon, false, conflictActive));
    let next = null;
    let nextInfo = 0;
    let best = (mon.mx - goalX) ** 2 + (mon.my - goalY) ** 2;
    if (!mon.mpeaceful && game.level?.flags?.shortsighted && best > (couldSeeCoord(mon.mx, mon.my) ? 144 : 36) && appr === 1) {
        randomWander = true;
        appr = 0;
    }
    const cnt = poss.length;
    if (!cnt) {
        if (!mon.data?.mindless && !mon.data?.nohands) {
            const healingPotion = findMonsterHealingPotion(mon);
            if (healingPotion) {
                drinkMonsterHealingPotion(mon, healingPotion);
                mon._move_consumed_turn = 1;
                return true;
            }
        }
        return false;
    }
    const moveChoices = poss.length;
    const tracks = updateMonsterTrack(mon);
    const jcnt = Math.min(4, moveChoices - 1);
    let chcnt = 0;
    for (const pos of poss) {
        if (pos.occupant && !(pos.info & ALLOW_M)) continue;
        let skipped = false;
        if (appr !== 0) {
            for (let j = 0; j < jcnt; j++) {
                if (tracks[j]?.x !== pos.x || tracks[j]?.y !== pos.y) continue;
                const roll = rn2(4 * (moveChoices - j));
                if (roll) {
                    skipped = true;
                    break;
                }
            }
        }
        if (skipped) continue;

        const dist = (pos.x - goalX) ** 2 + (pos.y - goalY) ** 2;
        if (randomWander) {
            const roll = rn2(++chcnt);
            if (!roll || !next) {
                next = pos;
                nextInfo = pos.info || 0;
                best = dist;
            }
            continue;
        }
        if (!next || (appr === -1 ? dist >= best : dist < best)) {
            next = pos;
            nextInfo = pos.info || 0;
            best = dist;
        }
    }
    if (!next) return false;
    const nextLocForDig = game.level?.at(next.x, next.y);
    const nextIsClosedDoor = nextLocForDig?.typ === DOOR
        && (nextLocForDig.doormask & (D_CLOSED | D_LOCKED));
    const nextMayDig = nextLocForDig
        && !((IS_STWALL(nextLocForDig.typ) || IS_TREE(nextLocForDig.typ))
            && (nextLocForDig.wall_info & W_NONDIGGABLE));
    if (data.tunnel && data.needPick && (nextMayDig || nextIsClosedDoor)) {
        const shieldWorn = (mon.minvent || []).some(item => item.worn
            && item.cls === 'armor'
            && String(item.kind || '').includes('shield'));
        const currentKind = mon.mw?.kind || '';
        if (nextIsClosedDoor) {
            if (!mon.mw || !(currentKind === 'pick-axe' || currentKind === 'dwarvish mattock') || !(currentKind === 'axe' || currentKind === 'battle-axe'))
                mon.weapon_check = NEED_PICK_OR_AXE;
        } else if (IS_TREE(nextLocForDig.typ)) {
            if (!mon.mw || !(currentKind === 'axe' || currentKind === 'battle-axe'))
                mon.weapon_check = NEED_AXE;
        } else if (IS_STWALL(nextLocForDig.typ)) {
            if (!mon.mw || !(currentKind === 'pick-axe' || currentKind === 'dwarvish mattock'))
                mon.weapon_check = NEED_PICK_AXE;
        }
        let digWeapon = null;
        if (mon.weapon_check === NEED_PICK_AXE)
            digWeapon = (mon.minvent || []).find(item => item.kind === 'pick-axe')
                || (!shieldWorn ? (mon.minvent || []).find(item => item.kind === 'dwarvish mattock') : null);
        else if (mon.weapon_check === NEED_AXE)
            digWeapon = (mon.minvent || []).find(item => item.kind === 'battle-axe' && !shieldWorn)
                || (mon.minvent || []).find(item => item.kind === 'axe');
        else if (mon.weapon_check === NEED_PICK_OR_AXE)
            digWeapon = (mon.minvent || []).find(item => item.kind === 'dwarvish mattock')
                || (mon.minvent || []).find(item => item.kind === 'battle-axe')
                || (!shieldWorn ? (mon.minvent || []).find(item => item.kind === 'pick-axe') : null)
                || (mon.minvent || []).find(item => item.kind === 'axe');
        if (digWeapon && mon.mw !== digWeapon) {
            mon.mw = digWeapon;
            mon.weapon_check = NEED_WEAPON;
            if (couldSeeCoord(mon.mx, mon.my) && !game.u?.blind && !mon.minvis) {
                const name = digWeapon.kind === 'dwarvish mattock' ? 'broad pick' : digWeapon.kind;
                const article = /^[aeiou]/.test(name || '') ? 'an ' : 'a ';
                addToplineMessage(`${monsterDisplayName(mon, true)} wields ${article}${name}.`);
            }
            return done();
        }
    }
    if (nextInfo & ALLOW_U) {
        if (next.x === (game.u?.ux || 0) && next.y === (game.u?.uy || 0)) {
            mon.mux = game.u?.ux ?? mon.mux;
            mon.muy = game.u?.uy ?? mon.muy;
        } else {
            mon._move_consumed_turn = 1;
        }
        return false;
    }
    if (next.target) {
        const weapon = mon.mw || mon.minvent?.find(item =>
            item.otyp === ORCISH_DAGGER || item.kind === 'orcish dagger' || item.kind === 'dagger');
        if (!mon.mw && weapon) {
            mon.mw = weapon;
                const stack = (weapon.quan || 1) === 1
                    ? (weapon.kind === 'orcish dagger' || weapon.otyp === ORCISH_DAGGER ? 'a crude dagger' : `a ${weapon.kind || 'weapon'}`)
                    : `${weapon.quan} ${weapon.kind === 'orcish dagger' || weapon.otyp === ORCISH_DAGGER ? 'crude daggers' : `${weapon.kind || 'weapon'}s`}`;
                recordWeaponDiscoveryForItem(weapon);
                addToplineMessage(`${monsterDisplayName(mon, true)} wields ${stack}!`);
                return done();
            }
        const targetAc = next.target.data?.mac ?? 7;
        const attackerLevel = mon.data?.mlevel ?? 0;
        const hit = targetAc + attackerLevel > rnd(20);
        if (hit) {
            const attack = mon.data?.attack || (mon.data?.name === 'kobold zombie'
                ? { dice: 1, sides: 4 }
                : { dice: 1, sides: 2 });
            next.target.mhp = (next.target.mhp || 1) - d(attack.dice, attack.sides);
        }
        rn2(3);
        if ((next.target.mhp || 1) < 1) {
            const loc = game.level?.at(next.target.mx, next.target.my);
            if (loc?.map_invisible) {
                loc.map_invisible = false;
                loc.remembered_glyph = null;
            }
            game.level.monsters = (game.level?.monsters || []).filter(other => other !== next.target);
            newsym(next.target.mx, next.target.my);
            return done();
        }
        if (hit && rn2(4) && (next.target.movement || 0) > rn2(NORMAL_SPEED)) {
            next.target.movement = next.target.movement > NORMAL_SPEED ? next.target.movement - NORMAL_SPEED : 0;
            const returnAc = mon.data?.mac ?? 7;
            const returnLevel = next.target.data?.mlevel ?? 2;
            const returnHit = returnAc + returnLevel > rnd(20);
            if (returnHit) {
                const attack = next.target.data?.attack || { dice: 1, sides: 6 };
                mon.mhp = (mon.mhp || 1) - d(attack.dice, attack.sides);
            }
            rn2(3);
            if ((mon.mhp || 1) < 1) {
                const loc = game.level?.at(mon.mx, mon.my);
                if (loc?.map_invisible) {
                    loc.map_invisible = false;
                    loc.remembered_glyph = null;
                }
                game.level.monsters = (game.level?.monsters || []).filter(other => other !== mon);
                newsym(mon.mx, mon.my);
            }
        }
        return done();
    }
    const oldx = mon.mx;
    const oldy = mon.my;
    updateMonsterTrack(mon, mon.mx, mon.my);
    mon.mx = next.x;
    mon.my = next.y;
    if (game._gas_spore_residue_mon === mon && !(game.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT))
        game._gas_spore_residue_active = 1;
    let hideDoorOpener = false;
    const nextLoc = game.level?.at(mon.mx, mon.my);
	    if (nextLoc?.typ === DOOR && (nextLoc.doormask & D_CLOSED)) {
	        const didSeeDoor = cansee(mon.mx, mon.my);
            const trappedDoor = !!(nextLoc.doormask & D_TRAPPED);
	        nextLoc.doormask = trappedDoor ? D_NODOOR : D_ISOPEN;
	        vision_reset();
	        vision_recalc(0);
	        mon._opened_door_this_move = 1;
        const monsterVisible = cansee(mon.mx, mon.my);
        const canSeeDoor = didSeeDoor || monsterVisible;
        const openerVisible = monsterVisible && !game.u?.blind && !mon.minvis && !mon.mundetected;
        if (canSeeDoor) {
            nextLoc.lastseentyp = nextLoc.typ;
            nextLoc.lastseendoormask = nextLoc.doormask;
            nextLoc.lastseenwall_info = nextLoc.wall_info;
        }
        hideDoorOpener = canSeeDoor && !openerVisible;
            if (trappedDoor) {
                mon.mstun = 1;
                mon.mhp = (mon.mhp || 1) - rnd(15);
                const distance = (mon.mx - (game.u?.ux || 0)) ** 2 + (mon.my - (game.u?.uy || 0)) ** 2;
                const explosionMessage = canSeeDoor ? 'KABOOM!!  You see a door explode.'
                    : `You hear a ${distance > 49 ? 'distant' : 'nearby'} explosion.`;
                game._pending_message = game._pending_message
                    ? `${game._pending_message}  ${explosionMessage}`
                    : explosionMessage;
                if ((mon.mhp || 1) < 1) {
                    game.level.monsters = (game.level?.monsters || []).filter(other => other !== mon);
                    mon.movement = 0;
                }
            } else {
	            const doorMessage = openerVisible
	                ? `${monsterDisplayName(mon)} opens a door.`
	                : canSeeDoor
	                ? 'You see a door open.'
	                : 'You hear a door open.';
	            game._pending_message = game._pending_message
	                ? `${game._pending_message}  ${doorMessage}`
	                : doorMessage;
            }
	        game._keep_pending_message = 1;
	    }
	        const preserveOldMemory = mon._preserve_pickup_memory?.x === oldx && mon._preserve_pickup_memory?.y === oldy;
	        mon._preserve_pickup_memory = null;
	        const oldLoc = game.level?.at(oldx, oldy);
	        const oldPetGlyph = mon.data?.mlet?.[0] || 'd';
	        if (oldLoc?.remembered_glyph?.ch === oldPetGlyph) oldLoc.remembered_glyph = null;
	        if (!preserveOldMemory) newsym(oldx, oldy);
    if (hideDoorOpener) mon._hide_for_door_open = 1;
    newsym(mon.mx, mon.my);
    if (hideDoorOpener) mon._hide_for_door_open = 0;
    const trap = game.level?.traps?.find(t => t.tx === mon.mx && t.ty === mon.my);
    const cavernTunnelRoom = mon.data?.tunnel && mon.data?.name === 'rock mole'
        && game.level?.flags?.is_cavernous_lev && game.level?.at(mon.mx, mon.my)?.typ === ROOM
        && game.level?.at(mon.mx, mon.my)?.seenv === 64;
    if (monsterTeleportTrapEffect(mon, trap)) return done();
    if (trap?.ttyp === MAGIC_PORTAL) {
        monsterTriggerTrap(mon, trap);
        if (couldSeeCoord(mon.mx, mon.my) && !game.u?.blind && !mon.minvis && !mon.mundetected) {
            trap.tseen = true;
            addToplineMessage(`Suddenly, ${monsterDisplayName(mon)} disappears out of sight.`);
        }
        game.level.monsters = (game.level?.monsters || []).filter(other => other !== mon);
        newsym(mon.mx, mon.my);
        mon.mx = 0;
        mon.my = 0;
        mon.movement = 0;
        return done();
    }
    if (trap?.ttyp === MAGIC_TRAP && monsterKnowsTrap(mon, trap.ttyp) && rn2(4)) return done();
    if (trap?.ttyp === MAGIC_TRAP) {
        monsterTriggerTrap(mon, trap);
        rn2(21);
    }
    if (trap?.ttyp === ANTI_MAGIC) monsterTriggerTrap(mon, trap);
    if (trap?.ttyp === SLP_GAS_TRAP && monsterTrapHarmless(mon, trap)) return done();
    if (trap?.ttyp === SLP_GAS_TRAP) monsterTriggerTrap(mon, trap);
    if (trap?.ttyp === SLP_GAS_TRAP && mon.mcanmove !== false && !mon.msleeping
        && !mon.data?.resistsSleep && !mon.data?.breathless) {
        const duration = rnd(25);
        mon.mcanmove = false;
        mon.mfrozen = Math.min((mon.mfrozen || 0) + duration, 127);
        if (couldSeeCoord(mon.mx, mon.my)) {
            trap.tseen = true;
            addToplineMessage(`${monsterDisplayName(mon)} suddenly falls asleep!`);
        }
    }
    if (trap?.ttyp === FIRE_TRAP && !monsterTrapHarmless(mon, trap)) {
        if (monsterKnowsTrap(mon, trap.ttyp) && rn2(4)) return done();
        if (monsterFireTrapEffect(mon, trap)) return done();
    }
    if (trap?.ttyp === ROCKTRAP && !monsterTrapHarmless(mon, trap)) {
        if (trap.once && trap.tseen && !rn2(15)) {
            game.level.traps = (game.level?.traps || []).filter(item => item !== trap);
            newsym(mon.mx, mon.my);
            return done();
        }
        trap.once = true;
        const rock = mksobj(ROCK, true, false);
        Object.assign(rock, { ox: mon.mx, oy: mon.my, quan: 1, glyph: '*', color: NO_COLOR });
        const stack = game.level?.objects?.find(obj =>
            obj.ox === mon.mx && obj.oy === mon.my && obj.otyp === ROCK && obj.kind === 'rock');
        if (stack) stack.quan = (stack.quan || 1) + 1;
        else game.level.objects.push(rock);

        const damage = d(2, 6);
        mon.mhp = (mon.mhp || 1) - damage;
        if (mon.mhp <= 0) {
            const data = mon.data || {};
            const corpseData = corpseDataForMonster(data);
            const dropCorpse = monsterCorpseDropSucceeds(mon, data);
            dropMonsterInventory(mon);
            if (dropCorpse && monsterLeavesCorpseLikeDrop(corpseData))
                createMonsterCorpseOrGlob(mon, corpseData);
            recordVanquished(mon, false);
            game.level.monsters = (game.level?.monsters || []).filter(other => other !== mon);
            mon.movement = 0;
            newsym(mon.mx, mon.my);
        }
        return done();
    }
    if ((trap?.ttyp === PIT || trap?.ttyp === SPIKED_PIT) && !cavernTunnelRoom && !monsterTrapHarmless(mon, trap)) {
        if (monsterKnowsTrap(mon, trap.ttyp) && rn2(4)) return done();
        monsterTriggerTrap(mon, trap);
        const inSight = couldSeeCoord(mon.mx, mon.my);
        if (inSight) {
            trap.tseen = true;
            addToplineMessage(`${monsterDisplayName(mon)} falls into ${trap.madeby_u ? 'your' : 'a'} pit!`);
        }
        mon.mtrapped = 1;
        const damage = rnd(trap.ttyp === SPIKED_PIT ? 10 : 6);
        mon.mhp = (mon.mhp || 1) - damage;
	        if (mon.mhp < 1) {
	            if (inSight) addToplineMessage(`${monsterDisplayName(mon)} is killed!`);
            const data = mon.data || {};
            const corpseData = corpseDataForMonster(data);
            dropMonsterInventory(mon);
            if (monsterLeavesCorpseLikeDrop(corpseData) && monsterCorpseDropSucceeds(mon, data))
                createMonsterCorpseOrGlob(mon, corpseData);
            recordVanquished(mon, false);
	            game.level.monsters = (game.level?.monsters || []).filter(other => other !== mon);
	            mon.movement = 0;
	            newsym(mon.mx, mon.my);
		            return done();
        }
        mon._move_consumed_turn = 1;
	    }
    if ((trap?.ttyp === HOLE || trap?.ttyp === TRAPDOOR) && !monsterTrapHarmless(mon, trap) && !mon.data?.big) {
        const alreadySeen = monsterKnowsTrap(mon, trap.ttyp) || (trap.ttyp === HOLE && !mon.data?.mindless);
        if (alreadySeen && rn2(4)) return done();
        monsterTriggerTrap(mon, trap);
        if (couldSeeCoord(mon.mx, mon.my)) trap.tseen = true;
        game.level.monsters = (game.level?.monsters || []).filter(other => other !== mon);
        mon.movement = 0;
        newsym(mon.mx, mon.my);
        return done();
    }
    if (trap?.ttyp === DART_TRAP && !monsterTrapHarmless(mon, trap)) {
        if (trap.once && trap.tseen && !rn2(15)) {
            game.level.traps = (game.level?.traps || []).filter(item => item !== trap);
            newsym(mon.mx, mon.my);
            return done();
        }
        monsterTriggerTrap(mon, trap);
        trap.once = true;
        const dart = mksobj(DART, true, false);
        dart.quan = 1;
        dart.opoisoned = !rn2(6);
        const inSight = !game.u?.blind && couldSeeCoord(mon.mx, mon.my) && !mon.minvis && !mon.mundetected;
        if (inSight) trap.tseen = true;
        const hit = (mon.data?.mac ?? 10) + 7 <= rnd(20);
        if (hit) {
            mon.mhp = (mon.mhp || 1) - Math.max(1, rnd(3));
            if (inSight) addToplineMessage(`${monsterDisplayName(mon, true)} is hit by a dart!`);
            if (mon.mhp < 1) {
                recordVanquished(mon, false);
                game.level.monsters = (game.level?.monsters || []).filter(other => other !== mon);
                mon.movement = 0;
                newsym(mon.mx, mon.my);
            }
        } else {
            Object.assign(dart, {
                kind: 'dart',
                ox: mon.mx,
                oy: mon.my,
                glyph: ')',
                color: CLR_CYAN,
                petFetchable: true,
            });
            game.level.objects.push(dart);
            if (inSight) addToplineMessage(`${monsterDisplayName(mon, true)} is almost hit by a dart!`);
            newsym(mon.mx, mon.my);
        }
        return done();
    }
    if (trap?.ttyp === LANDMINE && !monsterTrapHarmless(mon, trap)) {
        monsterTriggerTrap(mon, trap);
        const damage = rnd(16);
        const bodyWeight = mon.data?.cwt ?? MONSTER_BODY_WEIGHTS.get(mon.data?.name) ?? 1450;
        if (rn2(bodyWeight + 1) < 400) return true;
        trap.tseen = true;
        mon.mhp = Math.max(1, (mon.mhp || 1) - damage);
        game.level.traps = (game.level?.traps || []).filter(item => item !== trap);
        newsym(mon.mx, mon.my);
        return done();
    }
    if (trap?.ttyp === SQKY_BOARD) {
        if (monsterTrapHarmless(mon, trap)) return done();
        monsterTriggerTrap(mon, trap);
        const note = SQUEAKY_NOTES[trap.tnote] || 'a note';
        addToplineMessage(couldSeeCoord(mon.mx, mon.my)
            ? `A board beneath the ${mon.data?.name || 'creature'} squeaks ${note} loudly.`
            : `You hear ${note} squeak in the distance.`);
        for (const witness of game.level?.monsters || []) {
            const dist = (witness.mx - mon.mx) ** 2 + (witness.my - mon.my) ** 2;
            if (dist < 40) {
                witness.msleeping = 0;
            }
        }
    }
    if (trap?.ttyp === ROLLING_BOULDER_TRAP && !mon.data?.inAir && !mon.data?.flyer && !mon.data?.floater) {
        monsterTriggerTrap(mon, trap);
        const inSight = couldSeeCoord(mon.mx, mon.my) && !game.u?.blind && !mon.minvis && !mon.mundetected;
        newsym(mon.mx, mon.my);
        if (inSight) {
            addToplineMessage(`Click!  ${monsterDisplayName(mon)} triggers ${trap.tseen ? 'a rolling boulder trap' : 'something'}.`);
            game._message_more = 1;
            game._process_time_with_more = 0;
        }
        let start = trap.launch;
        let end = trap.launch2;
        let boulder = (game.level?.objects || []).find(obj =>
            !obj.transientProjectile && obj.otyp === BOULDER && obj.ox === start?.x && obj.oy === start?.y);
        if (!boulder && end) {
            boulder = (game.level?.objects || []).find(obj =>
                !obj.transientProjectile && obj.otyp === BOULDER && obj.ox === end.x && obj.oy === end.y);
            if (boulder) [start, end] = [end, start];
        }
        if (boulder && start && end) {
            game.level.objects = (game.level.objects || []).filter(obj => obj !== boulder);
            newsym(start.x, start.y);
            vision_reset();
            vision_recalc(0);
            let x = start.x;
            let y = start.y;
            const dx = Math.sign(end.x - start.x);
            const dy = Math.sign(end.y - start.y);
            let finalX = end.x;
            let finalY = end.y;
            for (let dist = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y)); dist > 0; dist--) {
                x += dx;
                y += dy;
                const hit = (game.level?.monsters || []).find(other => other.mx === x && other.my === y);
                if (hit?.data?.throwsRocks && rn2(3)) {
                    hit.minvent ??= [];
                    hit.minvent.push(boulder);
                    boulder = null;
                    break;
                }
                if (hit) {
                    const targetAc = hit.data?.mac ?? 10;
                    const hitRoll = rnd(20);
                    if (5 + targetAc >= hitRoll) {
                        const damage = rnd(20);
                        const hitName = monsterDisplayName(hit);
                        const lowerName = hitName.replace(/^The /, 'the ');
                        hit.mhp = (hit.mhp || 1) - damage;
                        if (hit.mhp < 1) {
                            if (inSight) game._topline_after_more = `The boulder hits ${lowerName}!  ${hitName} is killed!`;
                            if (inSight) {
                                game.level.objects.push({
                                    ...boulder,
                                    ox: x - dx,
                                    oy: y - dy,
                                    quan: 1,
                                    glyph: '`',
                                    color: NO_COLOR,
                                    transientProjectile: true,
                                });
                                game._clear_transient_projectiles_after_more = 1;
                                newsym(x - dx, y - dy);
                            }
                            dropMonsterInventory(hit);
                            game.level.monsters = (game.level?.monsters || []).filter(other => other !== hit);
                            game._rolling_boulder_cleanup_after_more = { x, y, mon: hit };
                        } else if (inSight) {
                            game._topline_after_more = `The boulder hits ${lowerName}!`;
                            newsym(x, y);
                        }
                    }
                }
                const nextLoc = dist > 1 ? game.level?.at(x + dx, y + dy) : null;
                if (nextLoc && (IS_STWALL(nextLoc.typ) || IS_TREE(nextLoc.typ))) {
                    finalX = x;
                    finalY = y;
                    break;
                }
            }
            if (boulder) {
                boulder.ox = finalX;
                boulder.oy = finalY;
                game.level.objects.push(boulder);
                vision_reset();
                vision_recalc(0);
                newsym(finalX, finalY);
            }
            if (inSight) trap.tseen = true;
        }
    }
	    if (monsterWebSpecialEffect(mon, trap)) {
	        mon._move_consumed_turn = 1;
	    } else if (trap?.ttyp === WEB && !mon.mtrapped) {
	        trap.tseen = true;
	        mon.mtrapped = 1;
	        if (couldSeeCoord(mon.mx, mon.my)) {
	            const message = `${monsterDisplayName(mon)} is caught in ${trap.madeby_u ? 'your' : 'a'} spider web.`;
	            const width = game.nhDisplay?.cols || 80;
	            if (game._pending_message && monIndex != null
	                && game._pending_message.length + message.length + 3 >= width - 8) {
	                game._topline_after_more = message;
	                game._message_more = 1;
	                game._process_time_with_more = 0;
	                game._pickup_resume_after_more = 1;
	                game._monster_resume_index = monIndex;
	                game._monster_resume_same_index = 1;
	                game._monster_resume_somebody_can_move = somebodyCanMove;
	                mon._resume_web_after_more = 1;
	                mon._hide_for_web_more = 1;
	                mon._paused_for_web_more = 1;
	                newsym(mon.mx, mon.my);
	            } else {
	                addToplineMessage(message);
	            }
	        }
	        mon._move_consumed_turn = 1;
	    }
    return true;
}

function movePet(mon, resumeAfterInventory = false, conflictActive = false) {
    game._pet_map_redraw_pending = 1;
    const realUx = game.u?.ux ?? mon.mx;
    const realUy = game.u?.uy ?? mon.my;
    let ux = realUx;
    let uy = realUy;

	    const edog = mon.mextra?.edog || { apport: 3, whistletime: 0 };
	    edog.ogoal ??= { x: 0, y: 0 };
		    const whappr = (game.moves || 1) - (edog.whistletime || 0) < 5;
    const udist = (mon.mx - ux) ** 2 + (mon.my - uy) ** 2;
    const objects = game.level?.objects || [];
    let inMastersSight = couldSeeCoord(mon.mx, mon.my);
    const skipClosePetRoll = mon.mflee;
    if (!resumeAfterInventory && !skipClosePetRoll && (mon.data?.name === 'kitten' || mon.data?.name === 'pony') && udist <= 2) {
        rn2(4);
    }
    if (mon.mtrapped) {
        const trap = game.level?.traps?.find(t => t.tx === mon.mx && t.ty === mon.my);
        if (trap?.ttyp === BEAR_TRAP) {
            if (rn2(40)) return;
            mon.mtrapped = 0;
            if (couldSeeCoord(mon.mx, mon.my)
                && !addToplineMessage(`The ${mon.saddled ? 'saddled ' : ''}${mon.data?.name || 'creature'} pulls free of the bear trap.`)
                && game._message_more && !game._process_time_with_more) return;
        } else {
            mon.mtrapped = 0;
        }
    }

    let droppedThisTurn = false;
    let pickedUpThisTurn = false;
    if (!resumeAfterInventory && mon.minvent?.length) {
        if (!rn2(udist + 1) || !rn2(edog.apport || 3)) {
            if (rn2(10) < (edog.apport || 3)) {
                const dropped = mon.minvent.shift();
                Object.assign(dropped, { ox: mon.mx, oy: mon.my });
                if (dropped.kind === 'magic lamp' && (dropped.color == null || dropped.color === NO_COLOR))
                    dropped.color = CLR_YELLOW;
                objects.push(dropped);
                if ((edog.apport || 3) > 1) edog.apport = (edog.apport || 3) - 1;
                const dropVisible = !game.u?.blind && !!(game.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT);
                const eatingMessagePending = game._eating_finish_message
                    && game._pending_rotten_food_eating_message;
                if (dropVisible && !eatingMessagePending) {
                    const loc = game.level?.at(mon.mx, mon.my);
                    if (loc) loc.remembered_glyph = { ch: dropped.glyph || '?', color: dropped.color ?? NO_COLOR, dec: false };
                    const petName = mon.givenName || `The ${mon.saddled ? 'saddled ' : ''}${mon.data?.name || 'pet'}`;
                    const objName = dropped.glyph === '$'
                        ? 'gold piece'
                        : dropped.kind === 'magic lamp' ? 'lamp'
                        : (dropped.kind === 'javelin' || dropped.appearance === 'throwing spear') ? 'throwing spear'
                        : (dropped.otyp === ORCISH_DAGGER || dropped.kind === 'orcish dagger') ? 'crude dagger'
                        : dropped.cls === 'spellbook' || dropped.glyph === '+' ? pickupObjectName(dropped)
                            : dropped.kind || (dropped.otyp === FOOD_CLASS ? 'food ration' : dropped.otyp === 79 ? 'quarterstaff' : pickupObjectName(dropped));
                    if (objName === 'throwing spear') recordDiscovery('Weapons', 'throwing spear', null, false);
                    const shownObjName = (dropped.cls === 'weapon' || dropped.glyph === ')')
                        ? `${dropped.bknown ? (dropped.blessed ? 'blessed ' : dropped.cursed ? 'cursed ' : 'uncursed ') : ''}${dropped.known && dropped.spe ? `${dropped.spe >= 0 ? '+' : ''}${dropped.spe} ` : ''}${objName}`
                        : objName;
                    const article = /^[aeiou]/i.test(shownObjName) ? 'an' : 'a';
                    const shown = addToplineMessage(`${petName} drops ${article} ${shownObjName}.`);
                    if (!shown && game._message_more && !game._process_time_with_more) {
                        game._pet_inventory_resume = mon;
                        game._pet_skip_post_move_roll = 1;
                        return;
                    }
                }
                droppedThisTurn = true;
                if (mon.minvis && dropVisible) newsym(mon.mx, mon.my);
            }
        }
    }

    const hereStack = [...objects].reverse()
        .filter(obj => !obj.hidden && !obj.transientProjectile && obj.ox === mon.mx && obj.oy === mon.my);
    const hereBlocked = resumeAfterInventory || mon.minvent?.length || droppedThisTurn;
    const hereCandidate = hereBlocked ? null
        : hereStack.find(obj => obj.otyp !== BOULDER && obj.otyp !== ROCK && obj.otyp !== STATUE);
    const staleHereCorpse = hereCandidate?.otyp === 'corpse'
        && hereCandidate.oldCorpse
        && hereCandidate.corpsenm?.name !== 'lichen'
        && hereCandidate.corpsenm?.name !== 'lizard';
    if (staleHereCorpse && monsterDietName(mon) !== 'ghoul') dogFood(mon, hereCandidate);
    const hereObj = staleHereCorpse && monsterDietName(mon) !== 'ghoul' ? null : hereCandidate;
    if (hereObj) {
        const pickupVisible = !!(game.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT);
        const hereFood = dogFood(mon, hereObj);
        if ((hereFood <= CADAVER || (edog.mhpmax_penalty && hereFood === ACCFOOD))
            && monsterCanReachItem(mon, hereObj.ox, hereObj.oy)) {
            if (isRoyalJellyObject(hereObj) && maybeKillerBeeEatRoyalJelly(mon)) return;
            const petName = mon.givenName || `Your ${mon.saddled ? 'saddled ' : ''}${mon.data?.name || 'pet'}`;
            const corpseName = hereObj.corpsenm?.name;
            const foodName = (hereObj.otyp === 'corpse' || hereObj.otyp === CORPSE)
                ? `${corpseName || 'monster'} corpse`
                : (hereObj.kind === 'tripe' || (hereObj.foodRoll || 1000) <= 140)
                    ? 'tripe ration'
                    : `${hereObj.blessed ? 'blessed ' : hereObj.cursed ? 'cursed ' : 'uncursed '}${hereObj.kind || 'food'}`;
            const article = /^[aeiou]/i.test(foodName) ? 'an' : 'a';
            if (couldSeeCoord(mon.mx, mon.my)) addToplineMessage(`${petName} eats ${article} ${foodName}.`);
            edog.hungrytime = Math.max(edog.hungrytime || 0, game.moves || 1) + 1200;
            mon.mtame = Math.min(20, (mon.mtame || 10) + 1);
            mon.meating = (hereObj.otyp === 'corpse' || hereObj.otyp === CORPSE)
                ? 3 + (objectWeight(hereObj) >> 6)
                : PET_FOOD_DELAY[hereObj.kind] || 1;
            const splitStackAccounted = (hereObj.quan || 1) > 1 && hereObj.cls === 'food';
            if (splitStackAccounted) next_ident();
            rn2(100);
            rn2(100);
            const consumeMessages = [];
            consumeMonsterEatenObject(mon, hereObj, objects, consumeMessages, { splitStackAccounted });
            addMonsterConsumeMessages(consumeMessages);
            return;
        }
        const petBodyWeight = mon.data?.cwt ?? MONSTER_BODY_WEIGHTS.get(mon.data?.name) ?? 1450;
        const hereWeight = objectWeight(hereObj);
        let petLoad = 0;
        for (const held of mon.minvent || []) {
            petLoad += objectWeight(held);
        }
        let maxLoad = (!mon.data?.strong || petBodyWeight > 1450)
            ? Math.trunc((1000 * petBodyWeight) / 1450)
            : 1000;
        if (!mon.data?.strong) maxLoad = Math.trunc(maxLoad / 2);
        const unresolvedHereObject = hereObj.otyp === WEAPON_CLASS && !hereObj.cls && !hereObj.kind;
        let carryAmount = 0;
        if (!unresolvedHereObject
            && !hereObj.cursed
            && hereObj.otyp !== LARGE_BOX && hereObj.otyp !== CHEST
            && monsterCanReachItem(mon, hereObj.ox, hereObj.oy)) {
            const noHandsStack = mon.data?.nohands && (hereObj.quan || 1) > 1;
            carryAmount = noHandsStack ? 1 : hereObj.quan || 1;
            if (!noHandsStack && petLoad + hereWeight > Math.max(maxLoad, 1)) carryAmount = 0;
        }
        if (hereFood !== UNDEF && carryAmount > 0 && rn2(20) < (edog.apport || 3) + 3) {
                if (rn2(udist) || !rn2(edog.apport || 3)) {
                    const pickedObj = carryAmount < (hereObj.quan || 1)
                        ? { ...hereObj, quan: carryAmount }
                        : hereObj;
                    if (pickedObj === hereObj) {
                        const idx = objects.indexOf(hereObj);
                        if (idx >= 0) objects.splice(idx, 1);
                    } else {
                        pickedObj.id = next_ident();
                        hereObj.quan -= carryAmount;
                    }
                    pickedObj.seen = false;
                    pickedObj._hide_until_seen = false;
                    if (hereObj.otyp === FOOD_CLASS && !pickupVisible) mon._preserve_pickup_memory = { x: mon.mx, y: mon.my };
                    add_to_minv(mon, pickedObj);
                    pickedUpThisTurn = true;
                    if (!game.u?.blind && pickupVisible && !hereObj.hidden) {
                        const petName = mon.givenName || `The ${mon.saddled ? 'saddled ' : ''}${mon.data?.name || 'pet'}`;
	                        const objName = hereObj.glyph === '$'
	                            ? 'gold piece'
	                            : hereObj.kind === 'magic lamp' ? 'lamp'
	                            : (hereObj.otyp === ORCISH_DAGGER || hereObj.kind === 'orcish dagger') ? 'crude dagger'
	                            : hereObj.cls === 'spellbook' || hereObj.glyph === '+' ? pickupObjectName(hereObj)
                                : hereObj.kind || (hereObj.otyp === FOOD_CLASS ? 'food ration' : hereObj.otyp === 79 ? 'quarterstaff' : pickupObjectName(hereObj));
                    const shownObjName = (hereObj.cls === 'weapon' || hereObj.glyph === ')')
                        ? `${hereObj.bknown ? (hereObj.blessed ? 'blessed ' : hereObj.cursed ? 'cursed ' : 'uncursed ') : ''}${hereObj.known && hereObj.spe ? `${hereObj.spe >= 0 ? '+' : ''}${hereObj.spe} ` : ''}${objName}`
                        : objName;
                    const article = /^[aeiou]/i.test(shownObjName) ? 'an' : 'a';
                    const pickupMsg = `${petName} picks up ${article} ${shownObjName}.`;
                    const appendedToHelplessMessage = !!game._pending_message
                        && (game._helpless_time > 0 || game._sleeping_time > 0);
                    if (!/^The .+ drops /.test(game._pending_message || '')) {
                        addToplineMessage(pickupMsg);
                        if (/^The .+ is (?:killed|destroyed)!  The .+ picks up /.test(game._pending_message || '')) {
                            game._message_more = 0;
                            game._process_time_with_more = 0;
                        }
                    }
                    if (appendedToHelplessMessage && !game._message_more) {
                        game._message_more = 1;
                        game._process_time_with_more = 0;
                    }
                    if (game._message_more && !game._process_time_with_more) {
                        game._pet_inventory_resume = mon;
                        game._pet_skip_post_move_roll = 1;
                        return;
                    }
                    }
                    if (hereObj.otyp !== FOOD_CLASS || pickupVisible) newsym(mon.mx, mon.my);
                }
            }
    }

    let goal = { x: ux, y: uy };
    let gtyp = UNDEF;
    let appr = 0;
    let usedUnseenMasterFallback = false;

    const minX = Math.max(1, mon.mx - 5);
    const maxX = Math.min(COLNO - 1, mon.mx + 5);
    const minY = Math.max(0, mon.my - 5);
    const maxY = Math.min(ROWNO - 1, mon.my + 5);
    const dogGoalOrder = objects.map((obj, index) => [obj, index])
        .sort(([, indexA], [, indexB]) => indexB - indexA);
    for (const [obj] of dogGoalOrder) {
        if (obj.transientProjectile) continue;
        if (obj.ox == null || obj.oy == null) continue;
        if (obj.ox < minX || obj.ox > maxX || obj.oy < minY || obj.oy > maxY) continue;
        const food = dogFood(mon, obj);
        if (food > gtyp || food === UNDEF) continue;
        const cursedStack = objects.some(other => !other.transientProjectile
            && other.ox === obj.ox && other.oy === obj.oy && other.cursed);
        if (cursedStack && !(edog.mhpmax_penalty && food < MANFOOD)) continue;
        const reachSeen = new Set([`${mon.mx},${mon.my}`]);
        const reachStack = [{ x: mon.mx, y: mon.my, dist: (mon.mx - obj.ox) ** 2 + (mon.my - obj.oy) ** 2 }];
        let canReachGoal = false;
        for (let ri = 0; ri < reachStack.length && !canReachGoal; ri++) {
            const cur = reachStack[ri];
            if (cur.x === obj.ox && cur.y === obj.oy) {
                canReachGoal = true;
                break;
            }
            for (let nx = cur.x - 1; nx <= cur.x + 1; nx++) {
                for (let ny = cur.y - 1; ny <= cur.y + 1; ny++) {
                    if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
                    const ndist = (nx - obj.ox) ** 2 + (ny - obj.oy) ** 2;
                    if (ndist >= cur.dist) continue;
                    const key = `${nx},${ny}`;
                    const loc = game.level?.at(nx, ny);
                    if (reachSeen.has(key) || !monsterCanReachItem(mon, nx, ny)
                        || (loc?.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED)))) continue;
                    reachSeen.add(key);
                    reachStack.push({ x: nx, y: ny, dist: ndist });
                }
            }
        }
        if (!canReachGoal) continue;
        if (food < MANFOOD) {
            if (food < gtyp || (obj.ox - mon.mx) ** 2 + (obj.oy - mon.my) ** 2 < (goal.x - mon.mx) ** 2 + (goal.y - mon.my) ** 2) {
                goal = { x: obj.ox, y: obj.oy };
                gtyp = food;
            }
        } else if (gtyp === UNDEF && !(mon.minvent?.length) && inMastersSight
                   && (!(game.level?.at(mon.mx, mon.my)?.lit) || game.level?.at(ux, uy)?.lit)) {
            const unresolvedObject = obj.otyp === WEAPON_CLASS && !obj.cls && !obj.kind
                || game.level?.flags?.sokoban_rules && typeof obj.otyp === 'string' && obj.otyp.startsWith('soko-random-');
            const petBodyWeight = mon.data?.cwt ?? MONSTER_BODY_WEIGHTS.get(mon.data?.name) ?? 1450;
            const targetWeight = objectWeight(obj);
            let petLoad = 0;
            for (const held of mon.minvent || []) {
                petLoad += objectWeight(held);
            }
            let maxLoad = (!mon.data?.strong || petBodyWeight > 1450)
                ? Math.trunc((1000 * petBodyWeight) / 1450)
                : 1000;
            if (!mon.data?.strong) maxLoad = Math.trunc(maxLoad / 2);
            let carryAmount = 0;
            if (!unresolvedObject && obj.otyp !== LARGE_BOX && obj.otyp !== CHEST) {
                const noHandsStack = mon.data?.nohands && (obj.quan || 1) > 1;
                carryAmount = noHandsStack ? 1 : obj.quan || 1;
                if (!noHandsStack && petLoad + targetWeight > Math.max(maxLoad, 1)) carryAmount = 0;
            }
	            const apportVisible = food === MANFOOD || clearPath(mon.mx, mon.my, obj.ox, obj.oy);
	            const apportRoll = apportVisible && (edog.apport || 0) > rn2(8);
            if (apportRoll && carryAmount > 0) {
                goal = { x: obj.ox, y: obj.oy };
                gtyp = APPORT;
            }
        }
    }
    if (gtyp === UNDEF || (gtyp !== DOGFOOD && gtyp !== APPORT && (game.moves || 1) < (edog.hungrytime || 0))) {
        goal = { x: ux, y: uy };
        appr = udist >= 9 ? 1 : mon.mflee ? -1 : 0;
        const heroLoc = game.level?.at(ux, uy);
        if (udist > 1) {
            if (!IS_ROOM(heroLoc?.typ ?? 0) || !rn2(4) || whappr || ((mon.minvent?.length || 0) && rn2(edog.apport || 3))) appr = 1;
        }
        if (!appr) {
            for (let stair = game.stairs; stair; stair = stair.next) {
                if (stair.sx === ux && stair.sy === uy) {
                    appr = 1;
                    break;
                }
            }
        }
			        if (!appr) {
	            const petFoodScanInventory = [...(game._pet_food_scan_inventory?.length
	                ? game._pet_food_scan_inventory
	                : game.inventory || [])].sort((a, b) => inventoryLetterRank(a) - inventoryLetterRank(b));
            for (const item of petFoodScanInventory) {
                if (dogFood(mon, item) === DOGFOOD) {
                    appr = 1;
                    break;
                }
            }
            if (!appr) {
                for (const trap of game.level?.traps || []) {
                    if (trap.ttyp === MAGIC_PORTAL && (trap.tx - ux) ** 2 + (trap.ty - uy) ** 2 <= 2) {
                        appr = 1;
                        break;
                    }
                }
            }
        }
        if (!inMastersSight) {
            usedUnseenMasterFallback = true;
            const tracks = game._utrack || [];
            let trackGoal = null;
            for (let i = tracks.length - 1; i >= 0; i--) {
                const track = tracks[i];
                const dist = Math.max(Math.abs(mon.mx - track.x), Math.abs(mon.my - track.y));
                if (dist > 1) continue;
                if (dist) trackGoal = { x: track.x, y: track.y };
                break;
            }
            if (trackGoal) {
                goal = trackGoal;
                edog.ogoal.x = 0;
            } else if (edog.ogoal?.x && (edog.ogoal.x !== mon.mx || edog.ogoal.y !== mon.my)) {
                goal = { x: edog.ogoal.x, y: edog.ogoal.y };
                edog.ogoal.x = 0;
            } else {
                let bestDist = (COLNO + 2) ** 2;
                let doorGoal = null;
                const savedVision = {
                    vis_start_col: game.vis_start_col,
                    vis_start_row: game.vis_start_row,
                    vis_step: game.vis_step,
                    cs_rows: game.cs_rows,
                    cs_left: game.cs_left,
                    cs_right: game.cs_right,
                    vis_callback: game.vis_callback,
                };
                view_from(mon.my, mon.mx, null, null, null, 9, (x, y) => {
                    const dist = (x - ux) ** 2 + (y - uy) ** 2;
                    if (dist < bestDist) {
                        bestDist = dist;
                        doorGoal = { x, y };
                    }
                });
                Object.assign(game, savedVision);
                if (doorGoal && (doorGoal.x !== mon.mx || doorGoal.y !== mon.my)) {
                    goal = doorGoal;
                    edog.ogoal = { x: goal.x, y: goal.y };
                }
            }
        }
    } else {
        appr = 1;
    }
    if (mon.mconf) appr = 0;
    if (!usedUnseenMasterFallback) edog.ogoal.x = 0;
    let allowHeroAttack = false;
    if (conflictActive) {
        rnd(20);
        const monLevel = mon.m_lev ?? mon.data?.hpLevel ?? mon.data?.mlevel ?? 0;
        const resistChance = Math.min(19, (game.u?.acurr?.a?.[5] ?? 10) - monLevel + (game.u?.ulevel || 1));
        allowHeroAttack = rnd(20) <= resistChance;
    }
    const rawCandidates = mfndpos(mon, monsterAllowFlags(mon, allowHeroAttack, conflictActive));
    const uncursedCandidates = rawCandidates.filter(pos => !(game.level?.objects || [])
        .some(obj => !obj.transientProjectile && obj.ox === pos.x && obj.oy === pos.y && obj.otyp !== BOULDER && obj.cursed)).length;
    const candidates = [];
    for (const pos of rawCandidates) {
        let target = null;
        if (pos.occupant) {
            const petLevel = mon.m_lev ?? mon.data?.hpLevel ?? mon.data?.mlevel ?? 2;
            const petHp = mon.mhp ?? mon.mhpmax ?? 1;
            const petMaxHp = mon.mhpmax ?? petHp;
            const targetLevel = pos.occupant.m_lev ?? pos.occupant.data?.hpLevel ?? pos.occupant.data?.mlevel ?? 0;
            const balk = petLevel + Math.trunc((5 * petHp) / Math.max(petMaxHp, 1)) - 2;
            const peacefulBlocked = pos.occupant.mpeaceful && !conflictActive
                && (petHp * 4 < petMaxHp
                    || pos.occupant.data?.msound === 'guardian'
                    || pos.occupant.data?.msound === 'leader');
            const canAttack = !pos.occupant.pet
                    && !(pos.occupant.mtame && mon.mtame && !conflictActive)
	                && targetLevel < balk
                    && !peacefulBlocked
                && !(PET_PASSIVE_DAMAGE_MONSTERS.has(pos.occupant.data?.name) && petHp <= 1);
            if (!canAttack) continue;
            target = pos.occupant;
        }
        candidates.push({ x: pos.x, y: pos.y, target, heroSpot: pos.heroSpot });
    }
    let next = { x: mon.mx, y: mon.my };
    let reluctantObject = null;
    let eatObject = null;
    let best = (mon.mx - goal.x) ** 2 + (mon.my - goal.y) ** 2;
    let chcnt = 0;
    for (const pos of candidates) {
		        if (pos.target) {
	            const petName = mon.givenName || (mon.saddled ? `saddled ${mon.data?.name || 'creature'}`
                : mon.data?.name || 'creature');
            const petSubject = mon.givenName || `The ${petName}`;
            const petObject = mon.givenName || `the ${petName}`;
            const targetName = pos.target.data?.name || 'creature';
            const dieroll = rnd(20);
            const targetAc = pos.target.data?.mac ?? 10;
            const petLevel = mon.m_lev ?? mon.data?.hpLevel ?? mon.data?.mlevel ?? 2;
            const hit = targetAc + petLevel > dieroll;
            const attack = mon.data?.attack || { dice: 1, sides: 6, verb: 'bites' };
            const targetVisible = !game.u?.blind && !!(game.viz_array?.[pos.target.my]?.[pos.target.mx] & IN_SIGHT);
            const attackerInSight = !!(game.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT);
            const attackerInfraredHidden = ['blob', 'fungus', 'lizard', 'snake', 'spider'].includes(mon.data?.mlet || mon.mlet);
            const attackerSeenInfrared = !attackerInSight
                && game.u?.infravision
                && couldSeeCoord(mon.mx, mon.my)
                && !attackerInfraredHidden
                && !mon.data?.mindless
                && !mon.data?.nonliving
                && !mon.data?.name?.endsWith(' golem');
            const attackerSpotted = !game.u?.blind && !mon.minvis && !mon.mundetected
                && (attackerInSight || attackerSeenInfrared);
            const attackerActionVisible = !game.u?.blind && attackerInSight && !mon.minvis && !mon.mundetected;
            if (targetVisible && !attackerSpotted) {
                const loc = game.level?.at(mon.mx, mon.my);
                if (loc) {
                    loc.map_invisible = true;
                    loc.waslit = true;
                    loc.remembered_glyph = { ch: 'I', color: NO_COLOR, dec: false };
                    newsym(mon.mx, mon.my);
                }
            }
            const farNoise = (mon.mx - realUx) ** 2 + (mon.my - realUy) ** 2 > 15;
            const noiseMessage = farNoise ? 'You hear some noises in the distance.' : 'You hear some noises.';
            const attackerSubject = attackerSpotted ? petSubject : 'It';
            const hitVerb = attack.verb === 'kicks' ? 'hits' : attack.verb;
            const msg = targetVisible
                ? hit
                    ? `${attackerSubject} ${hitVerb} the ${targetName}.`
                    : `${attackerSubject} misses the ${targetName}.`
                : hit && attackerActionVisible
                    ? `${petSubject} ${hitVerb} it.`
                    : noiseMessage;
            const showCombat = !game.u?.blind || !targetVisible;
            const repeatNoise = msg === noiseMessage
                && game._monster_noise_far === farNoise
                && (game.moves || 0) - (game._monster_noise_move ?? -99) <= 10;
            if (msg === noiseMessage && !repeatNoise) {
                game._monster_noise_far = farNoise;
                game._monster_noise_move = game.moves || 0;
            }
	            let messageShown = true;
	            const pendingBeforeMessage = game._pending_message || '';
	            const hadPendingMessage = !!pendingBeforeMessage;
	            const pendingStartedWithMonsterNoise = !!game._pending_starts_monster_noise_message;
	            let suppressedRunningPetMessage = false;
            const combinedUnseenHit = !targetVisible
		                && attackerActionVisible
		                && hit
	                && game._pending_monster_noise_message
	                && game._pending_monster_noise_far === farNoise
	                && game._pending_message.length + msg.length + 3 < (game.nhDisplay?.cols || 80) - 8;
	            const repeatedVisibleMiss = targetVisible && !hit && pendingBeforeMessage === `${msg}  ${msg}`;
	            if (!showCombat) {
	                messageShown = false;
	            } else if (repeatNoise) {
	                messageShown = true;
            } else if (msg === noiseMessage && game._pending_message) {
                const width = game.nhDisplay?.cols || 80;
                const fumblePending = game._pending_fumble_turn_message_starts;
                if (fumblePending && game._pending_message.length + msg.length + 3 < width - 8) {
                    game._pending_message = `${game._pending_message}  ${msg}`;
                    game._keep_pending_message = 1;
                } else {
                    messageShown = false;
                }
            } else if (msg === noiseMessage) {
                const runFumbleMessage = game._last_fumble_turn_message
                    && (game.moves || 0) - (game._last_fumble_turn_move ?? -99) <= 1
                    ? game._last_fumble_turn_message : '';
                game._pending_message = runFumbleMessage ? `${runFumbleMessage}  ${msg}` : msg;
                game._last_fumble_turn_message = '';
                game._pending_starts_monster_noise_message = runFumbleMessage ? 0 : 1;
                game._pending_monster_noise_message = 1;
                game._pending_monster_noise_far = farNoise;
                game._pending_fumble_turn_message = runFumbleMessage ? 1 : 0;
                game._pending_fumble_turn_message_starts = runFumbleMessage ? 1 : 0;
                game._pending_fumble_after_monster_noise_message = 0;
                game._message_more = 0;
                game._keep_pending_message = 1;
            } else if (mon.saddled) {
                game._pending_message = game._pending_message ? `${game._pending_message}  ${msg}` : msg;
                game._pending_monster_noise_message = 0;
                game._keep_pending_message = 1;
	            } else if (combinedUnseenHit) {
	                game._pending_message = `${game._pending_message}  ${msg}`;
	                game._pending_monster_noise_message = 0;
	                game._keep_pending_message = 1;
	            } else {
	                const width = game.nhDisplay?.cols || 80;
		                suppressedRunningPetMessage = !!game._pending_message
		                    && (game._running_continuation || game._initial_run_command || game._run_steps_remaining > 0)
		                    && game._pending_message.length + msg.length + 3 >= width - 8;
		                if (repeatedVisibleMiss) game._keep_pending_message = 1;
		                else if (!suppressedRunningPetMessage) messageShown = addToplineMessage(msg);
		                else if (game._message_more && game._process_time_with_more) {
		                    game._queued_messages_after_more ??= [];
		                    const queued = game._queued_messages_after_more[game._queued_messages_after_more.length - 1];
	                    if (queued?.more && queued.text.length + msg.length + 3 < width - 8)
	                        queued.text = `${queued.text}  ${msg}`;
	                    else game._queued_messages_after_more.push({ text: msg, more: true });
	                }
	            }
	            if (hadPendingMessage && messageShown && msg !== noiseMessage && !combinedUnseenHit
	                        && !repeatedVisibleMiss && !suppressedRunningPetMessage && !mon.saddled
				                && !pendingStartedWithMonsterNoise
                                && !/^You miss .+\.$/.test(pendingBeforeMessage)
                                && !/^You drop\b/.test(pendingBeforeMessage)
			                && (!/^(You miss|The .+ misses) the .+\.$/.test(pendingBeforeMessage)
			                        || !game._dismissed_more_this_command)) {
	                const width = game.nhDisplay?.cols || 80;
	                const repeatedMissPair = targetVisible && !hit && pendingBeforeMessage === msg;
	                const monsterAttackPending = /^The .+ (?:bites|hits|misses|kicks|stings|claws|scratches|touches|butts|strikes|engulfs|shoots|throws|zaps)\b/.test(pendingBeforeMessage);
	                if (repeatedMissPair || (targetVisible && !monsterAttackPending) || pendingBeforeMessage.length + msg.length + 3 >= width - 8) {
	                    game._message_more = 1;
	                    game._process_time_with_more = 1;
	                    game._pet_combat_more_before_monster_attack = 1;
                }
			            }

            if (!hit) {
                if (showCombat && !messageShown && msg !== noiseMessage) {
                    game._pet_message_resume = { kind: 'miss' };
                    return;
                }
                rn2(3);
                if (mon.saddled && mon.data?.name === 'pony') {
                    if (msg === noiseMessage) {
                        const secondRoll = rnd(21);
                        const secondHit = targetAc + petLevel > secondRoll;
                        if (secondHit) {
                            if (petrifyMonsterAttacker(mon, pos.target, { visible: targetVisible && attackerSpotted })) return;
                            pos.target.mhp = (pos.target.mhp || 1) - d(1, 2);
                            rn2(3);
                            rn2(6);
                            if (pos.target.mhp < 1) {
                                const dropCorpse = monsterCorpseDropSucceeds(pos.target, pos.target.data);
                                const corpseData = corpseDataForMonster(pos.target.data);
                                dropMonsterInventory(pos.target);
                                if (dropCorpse && monsterLeavesCorpseLikeDrop(corpseData))
                                    createMonsterCorpseOrGlob(pos.target, corpseData);
                                monsterGrowUp(mon, pos.target);
                                rn2(5);
                                recordVanquished(pos.target, false);
                                game.level.monsters = (game.level?.monsters || []).filter(other => other !== pos.target);
                                newsym(pos.target.mx, pos.target.my);
                                mon.movement = 0;
                                game._pet_kill_no_repeat = 1;
                            } else {
                                rn2(3);
                                const returnAttackRoll = rn2(4);
                                if (returnAttackRoll && pos.target.mlstmv !== (game.moves || 1)) {
                                    const returnRoll = rnd(20);
                                    const defenderAc = mon.data?.mac ?? 6;
                                    const targetLevel = pos.target.m_lev ?? pos.target.data?.hpLevel ?? pos.target.data?.mlevel ?? 0;
                                    const returnHit = defenderAc + targetLevel > returnRoll;
                                    const returnAttack = pos.target.data?.attack || { dice: 1, sides: 2 };
                                    if (returnHit) {
                                        d(returnAttack.dice ?? 1, returnAttack.sides ?? 2);
                                        rn2(3);
                                        rn2(6);
                                        rn2(3);
                                    } else {
                                        rn2(3);
                                    }
                                }
                            }
                        } else {
                            rn2(3);
                        }
                    } else {
                        game._message_more = 1;
                        game._pony_second_attack = { target: pos.target, targetName, targetAc, petLevel };
                        game._command_mode = 'ponySecondAttackMore';
                    }
                }
                return;
            }

            if (showCombat && !messageShown) {
                game._pet_message_resume = {
                    kind: 'hit',
                    mon,
                    target: pos.target,
                    dice: attack.dice,
                    sides: attack.sides,
                };
                return;
            }

            if (petrifyMonsterAttacker(mon, pos.target, { visible: targetVisible && attackerSpotted })) return;
            const damage = d(attack.dice, attack.sides);
            rn2(3);
            rn2(6);
            pos.target.mhp = (pos.target.mhp || 1) - damage;
            if (pos.target.mhp < 1) {
	                if (targetVisible) {
	                    const killedShown = addToplineMessage(`The ${targetName} is killed!`);
	                    if (!killedShown) {
                            pos.target._killed_by_mon = mon;
                            const loc = game.level?.at(pos.target.mx, pos.target.my);
                            if (loc?.map_invisible) {
                                loc.map_invisible = false;
                                loc.remembered_glyph = null;
                                for (const obj of game.level?.objects || [])
                                    if (obj.ox === pos.target.mx && obj.oy === pos.target.my) obj.seen = false;
                            }
                            newsym(pos.target.mx, pos.target.my);
	                        game._queued_dead_monsters = [...(game._queued_dead_monsters || []), pos.target];
	                        game._queued_message_after_more = `The ${targetName} is killed!`;
	                        game._queued_postmov_distfleeck = (game._queued_postmov_distfleeck || 0) + 1;
	                        game._topline_after_more = '';
	                        game._message_more = 1;
	                        return;
	                    }
	                    if ((game._topline_after_more || '').startsWith(`The ${targetName} `)) {
	                        game._topline_after_more = '';
	                        game._message_more = 0;
	                    }
	                }
                const dropCorpse = monsterCorpseDropSucceeds(pos.target, pos.target.data);
                const corpseData = corpseDataForMonster(pos.target.data);
                dropMonsterInventory(pos.target);
                if (dropCorpse && monsterLeavesCorpseLikeDrop(corpseData))
                    createMonsterCorpseOrGlob(pos.target, corpseData);
                monsterGrowUp(mon, pos.target);
                rn2(5);
                if (targetName === 'lichen') game._pet_skip_post_move_roll = 1;
                recordVanquished(pos.target, false);
                game.level.monsters = (game.level?.monsters || []).filter(other => other !== pos.target);
                newsym(pos.target.mx, pos.target.my);
                if (targetName !== 'lichen') {
                    game._pet_kill_no_repeat = 1;
                }
                return;
            }

            rn2(3);
            const returnAttackRoll = rn2(4);
            if (returnAttackRoll && pos.target.mlstmv !== (game.moves || 1)) {
                const weapon = pos.target.mw || pos.target.minvent?.find(item =>
                    item.otyp === ORCISH_DAGGER || item.kind === 'orcish dagger' || item.kind === 'dagger');
                if (!pos.target.mw && weapon) {
                    pos.target.mw = weapon;
                    pos.target.weapon_check = NEED_WEAPON;
                    pos.target.mlstmv = game.moves || 1;
                    if (showCombat) {
                        const stack = (weapon.quan || 1) === 1
                            ? (weapon.kind === 'orcish dagger' || weapon.otyp === ORCISH_DAGGER ? 'a crude dagger' : `a ${weapon.kind || 'weapon'}`)
                            : `${weapon.quan} ${weapon.kind === 'orcish dagger' || weapon.otyp === ORCISH_DAGGER ? 'crude daggers' : `${weapon.kind || 'weapon'}s`}`;
                        recordWeaponDiscoveryForItem(weapon);
                        addToplineMessage(`The ${targetName} wields ${stack}!`);
                        game._message_more = 1;
                        game._process_time_with_more = 0;
                    }
                    return;
                }
                const returnRoll = rnd(20);
                pos.target.mlstmv = game.moves || 1;
                const defenderAc = mon.data?.mac ?? 6;
                const targetLevel = pos.target.data?.mlevel ?? 0;
                const returnHit = defenderAc + targetLevel > returnRoll;
                const returnAttack = pos.target.data?.attack || { dice: 1, sides: 2, verb: 'bites' };
                const nymphReturn = targetName.includes('nymph');
                let returnMsg = `The ${targetName} ${returnHit ? (returnAttack.verb || 'hits') : 'misses'} ${petObject}.`;
                if (nymphReturn) {
                    const sameGender = !!pos.target.female === !!mon.female;
                    returnMsg = returnHit
                        ? `The ${targetName} smiles at ${petObject} ${sameGender ? 'engagingly' : 'seductively'}.`
                        : `The ${targetName} pretends to be friendly to ${petObject}.`;
                }
                let returnMessageShown = true;
	                if (showCombat && msg !== noiseMessage) {
	                    if (mon.saddled) game._pending_message = `${game._pending_message}  ${returnMsg}`;
	                    else returnMessageShown = addToplineMessage(returnMsg);
	                    if (nymphReturn && returnMessageShown) {
                        game._message_more = 1;
                        game._process_time_with_more = 0;
                        game._topline_more_after_more = 1;
                    }
	                    if (!nymphReturn && !mon.saddled && returnMessageShown
	                        && (game._running_continuation || game._initial_run_command || game._run_steps_remaining > 0)) {
	                        game._message_more = 1;
	                        game._process_time_with_more = 1;
	                    }
                }
                if (!returnMessageShown) {
                    game._pet_return_attack_after_more = {
                        hit: returnHit,
                        dice: returnAttack.dice ?? 1,
                        sides: returnAttack.sides ?? 2,
                    };
                    game._pet_message_resume = { kind: 'returnAttack' };
                    return;
                }
                if (returnHit) {
                    if (nymphReturn) d(0, 0);
                    else d(returnAttack.dice ?? 1, returnAttack.sides ?? 2);
                    rn2(3);
                    rn2(6);
                    rn2(3);
                } else {
                    rn2(3);
                }
            }
            if (showCombat && mon.saddled && msg !== noiseMessage) game._message_more = 1;
            return;
        }

        const kicked = game._kickedloc;
        if (kicked?.turn === (game.moves || 1)
            && kicked.x === pos.x
            && kicked.y === pos.y
            && mon.mcansee !== false
            && !mon.mconf
            && !mon.mstun
            && Math.max(Math.abs(pos.x - ux), Math.abs(pos.y - uy)) <= 1) continue;
        if (game.level?.flags?.sokoban_rules
            && (mon.mpeaceful || mon.pet)
            && !mon.mconf
            && !mon.mstun
            && (pos.x - realUx) ** 2 + (pos.y - realUy) ** 2 === 4
            && game.level?.objects?.some(obj => !obj.transientProjectile
                && obj.otyp === BOULDER
                && obj.ox === pos.x + Math.sign(realUx - pos.x)
                && obj.oy === pos.y + Math.sign(realUy - pos.y))) continue;

        const trapAtPos = game.level?.traps?.find(t => t.tx === pos.x && t.ty === pos.y);
        if ((trapAtPos?.ttyp === DART_TRAP || trapAtPos?.ttyp === BEAR_TRAP
             || trapAtPos?.ttyp === PIT || trapAtPos?.ttyp === SPIKED_PIT)
            && !monsterTrapHarmless(mon, trapAtPos) && trapAtPos.tseen && rn2(40)) continue;
        const posObjects = (game.level?.objects || [])
            .filter(obj => !obj.transientProjectile && obj.ox === pos.x && obj.oy === pos.y && obj.otyp !== BOULDER);
        const hasCursedObject = posObjects.some(obj => obj.cursed);
        let willEatHere = false;
        for (const obj of posObjects) {
            if (obj.cursed) continue;
            const food = dogFood(mon, obj);
            if (food < MANFOOD && (food < ACCFOOD || (edog.hungrytime || 0) <= (game.moves || 1))) {
                willEatHere = true;
                eatObject = obj;
                break;
            }
        }
	        if (willEatHere) {
            next = pos;
            reluctantObject = null;
            break;
        }
	        if (hasCursedObject && uncursedCandidates > 0 && rn2(13 * uncursedCandidates)) continue;
        if (Math.max(Math.abs(mon.mx - ux), Math.abs(mon.my - uy)) > 5) {
            let backtracking = false;
            const tracks = updateMonsterTrack(mon);
            for (let j = 0; j < Math.min(4, uncursedCandidates - 1); j++) {
                if (tracks[j]?.x === pos.x && tracks[j]?.y === pos.y) {
                    const trackRoll = 4 * (uncursedCandidates - j);
                    if (!rn2(trackRoll)) continue;
                    backtracking = true;
                    break;
                }
            }
            if (backtracking) continue;
        }
	        const dist = (pos.x - goal.x) ** 2 + (pos.y - goal.y) ** 2;
	        let delta = (dist - best) * appr;
			        let choose = (delta === 0 && !rn2(++chcnt)) || delta < 0;
        if (!choose && delta > 0 && !whappr) {
            const stillHere = next.x === mon.mx && next.y === mon.my;
            choose = (stillHere && !rn2(3)) || !rn2(12);
        }
        if (!choose) continue;
        next = pos;
        reluctantObject = hasCursedObject ? posObjects[posObjects.length - 1] : null;
        best = dist;
        if (delta < 0) chcnt = 0;
    }
    let bestRangedScore = -40000;
    let bestRangedTarget = null;
    if (!eatObject && mon.mcansee !== false) {
        const petMux = mon.mux ?? ux;
        const petMuy = mon.muy ?? uy;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (!dx && !dy) continue;
                let target = null;
                for (let step = 1; step <= 7; step++) {
                    const x = mon.mx + dx * step;
                    const y = mon.my + dy * step;
                    if (x <= 0 || y < 0 || x >= COLNO || y >= ROWNO) break;
                    if (!clearPath(mon.mx, mon.my, x, y)) break;
                    if (x === petMux && y === petMuy) {
                        target = { hero: true, mx: x, my: y, m_lev: game.u?.ulevel || 1, mhp: game.u?.uhp || 1 };
                        break;
                    }
                    const candidate = game.level?.monsters?.find(other => other !== mon && other.mx === x && other.my === y);
                    if (!candidate) continue;
                    if (!candidate.minvis && !candidate.mundetected) target = candidate;
                    break;
                }
                if (!target) continue;

                let score = 0;
                let earlyScore = null;
                if (!mon.mconf || !rn2(3)) {
                    const targetDist = Math.max(Math.abs(mon.mx - target.mx), Math.abs(mon.my - target.my));
                    if (target.data?.msound === 'leader' || target.data?.msound === 'guardian') {
                        earlyScore = -5000;
                    } else if (targetDist <= 1 || target.pet || target.hero) {
                        earlyScore = -3000;
                    } else {
                        let friendBehind = false;
                        let cx = target.mx;
                        let cy = target.my;
                        const behindDx = Math.sign(target.mx - mon.mx);
                        const behindDy = Math.sign(target.my - mon.my);
                        for (let dist = targetDist; dist <= 15; dist++) {
                            cx += behindDx;
                            cy += behindDy;
                            if (cx <= 0 || cy < 0 || cx >= COLNO || cy >= ROWNO) break;
                            if (!clearPath(mon.mx, mon.my, cx, cy)) break;
                            if (cx === petMux && cy === petMuy) {
                                friendBehind = true;
                                break;
                            }
                            const pal = game.level?.monsters?.find(other => other.mx === cx && other.my === cy);
                            if (pal?.pet && !pal.minvis) {
                                friendBehind = true;
                                break;
                            }
                            if (pal?.data?.msound === 'leader' || pal?.data?.msound === 'guardian') {
                                friendBehind = true;
                                break;
                            }
                        }
                        if (friendBehind) {
                            earlyScore = -3000;
                        } else {
                            const targetLevel = target.m_lev ?? target.data?.hpLevel ?? target.data?.mlevel ?? 0;
                            const petLevel = mon.m_lev ?? mon.data?.hpLevel ?? mon.data?.mlevel ?? 0;
                            if (!target.mpeaceful) score += 10;
                            if (target.data && !target.data.attack && target.data.mmove === 0) score -= 1000;
                            if ((targetLevel < 2 && petLevel > 5)
                                || (petLevel > 12 && targetLevel < petLevel - 9
                                    && (game.u?.ulevel || 1) > 8 && targetLevel < (game.u?.ulevel || 1) - 7)) {
                                score -= 25;
                            }
                            if (targetLevel > petLevel + 4) score -= (targetLevel - petLevel) * 20;
                            score += targetLevel * 2 + Math.trunc((target.mhp || 1) / 3);
                        }
                    }
                }
                if (earlyScore != null) score = earlyScore;
                else {
                    score += rnd(5);
                    if (mon.mconf && !rn2(3)) score -= 1000;
                }
                if (score > bestRangedScore) {
                    bestRangedScore = score;
                    bestRangedTarget = target;
                }
            }
        }
    }
    if (bestRangedTarget && bestRangedScore >= 0 && (game.moves || 1) > (edog.hungrytime || 0) + 500) rn2(5);

    if (mon._paid_shopkeeper_pet_step) {
        const forcedStep = mon._paid_shopkeeper_pet_step;
        mon._paid_shopkeeper_pet_step = null;
        const loc = game.level?.at(forcedStep.x, forcedStep.y);
        const occupied = (game.level?.monsters || [])
            .some(other => other !== mon && other.mx === forcedStep.x && other.my === forcedStep.y);
        if (loc && ACCESSIBLE(loc.typ) && !occupied
            && !(game.u?.ux === forcedStep.x && game.u?.uy === forcedStep.y)
            && Math.max(Math.abs(forcedStep.x - mon.mx), Math.abs(forcedStep.y - mon.my)) === 1) {
            next = { ...forcedStep, target: null, heroSpot: false };
            eatObject = null;
            reluctantObject = null;
        }
    }
    if (next.heroSpot) {
        const subject = mon.givenName || `The ${mon.saddled ? 'saddled ' : ''}${mon.data?.name || 'creature'}`;
        if (rnd(20) < 20) {
            game.u.uhp = Math.max(0, (game.u?.uhp || 0) - d(1, 6));
            rn2(3);
            rn2(6);
            addToplineMessage(`${subject} kicks!`);
        } else {
            addToplineMessage(`${subject} misses!`);
        }
        if (mon.data?.name === 'pony') {
            let secondMessage = `${subject} misses!`;
            if (rnd(21) < 20) {
                game.u.uhp = Math.max(0, (game.u?.uhp || 0) - d(1, 2));
                rn2(3);
                rn2(6);
                secondMessage = `${subject} bites!`;
            }
            game._topline_after_more = secondMessage;
            game._message_more = 1;
            game._process_time_with_more = 1;
        }
        return;
    }

	    const oldx = mon.mx;
	    const oldy = mon.my;
		    const moved = next.x !== oldx || next.y !== oldy;
		    if (moved) {
	        game._pet_map_redraw_pending = 1;
		        updateMonsterTrack(mon, mon.mx, mon.my);
        mon.mx = next.x;
        mon.my = next.y;

	        const preserveOldMemory = mon._preserve_pickup_memory?.x === oldx && mon._preserve_pickup_memory?.y === oldy;
	        mon._preserve_pickup_memory = null;
	        const oldLoc = game.level?.at(oldx, oldy);
	        const petNowSpotted = !game.u?.blind && !mon.minvis && !mon.mundetected
	            && !!(game.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT);
	        if (oldLoc?.map_invisible && petNowSpotted && (game.viz_array?.[oldy]?.[oldx] & IN_SIGHT)) {
	            oldLoc.map_invisible = false;
	            if (oldLoc.remembered_glyph?.ch === 'I') oldLoc.remembered_glyph = null;
	        }
	        if (!preserveOldMemory) newsym(oldx, oldy);
        if (!(reluctantObject && mon.saddled)) newsym(mon.mx, mon.my);
        const eatenObj = eatObject;
        if (eatenObj) {
            if (isRoyalJellyObject(eatenObj) && maybeKillerBeeEatRoyalJelly(mon)) return;
            const petName = mon.givenName || `Your ${mon.saddled ? 'saddled ' : ''}${mon.data?.name || 'pet'}`;
            const corpseName = eatenObj.corpsenm?.name;
            const foodName = (eatenObj.otyp === 'corpse' || eatenObj.otyp === CORPSE)
                ? `${corpseName || 'monster'} corpse`
                : (eatenObj.kind === 'tripe' || (eatenObj.foodRoll || 1000) <= 140)
                    ? 'tripe ration'
                    : `${eatenObj.blessed ? 'blessed ' : eatenObj.cursed ? 'cursed ' : 'uncursed '}${eatenObj.kind || 'food'}`;
            const article = /^[aeiou]/i.test(foodName) ? 'an' : 'a';
            if (couldSeeCoord(oldx, oldy) || couldSeeCoord(mon.mx, mon.my)) {
                const subject = couldSeeCoord(oldx, oldy) ? petName : 'It';
                addToplineMessage(`${subject} eats ${article} ${foodName}.`);
            }
            edog.hungrytime = Math.max(edog.hungrytime || 0, game.moves || 1) + 1200;
            mon.mtame = Math.min(20, (mon.mtame || 10) + 1);
            mon.meating = (eatenObj.otyp === 'corpse' || eatenObj.otyp === CORPSE)
                ? 3 + (objectWeight(eatenObj) >> 6)
                : PET_FOOD_DELAY[eatenObj.kind] || 1;
            const splitStackAccounted = (eatenObj.quan || 1) > 1 && eatenObj.cls === 'food';
            if (splitStackAccounted) next_ident();
            rn2(100);
            rn2(100);
            const consumeMessages = [];
            consumeMonsterEatenObject(mon, eatenObj, objects, consumeMessages, { splitStackAccounted });
            addMonsterConsumeMessages(consumeMessages);
        }
        if (reluctantObject) {
            const corpseName = reluctantObject.corpsenm?.name || 'monster';
            const objectName = (reluctantObject.otyp === 'corpse' || reluctantObject.otyp === CORPSE)
                ? `${/^[aeiou]/i.test(corpseName) ? 'an' : 'a'} ${corpseName} corpse`
                : 'something';
            const petName = mon.givenName || `Your ${mon.saddled ? 'saddled ' : ''}${mon.data?.name || 'pet'}`;
            const messageShown = (couldSeeCoord(oldx, oldy) || couldSeeCoord(mon.mx, mon.my))
                && addToplineMessage(`${petName} steps reluctantly onto ${objectName}.`);
            if (mon.saddled && messageShown) {
                game._message_more = 1;
            }
        }
	    }
	    const trap = game.level?.traps?.find(t => t.tx === mon.mx && t.ty === mon.my);
	    if (monsterTeleportTrapEffect(mon, trap)) return;
	    if (monsterWebSpecialEffect(mon, trap)) return;
	    if (trap?.ttyp === MAGIC_TRAP && monsterKnowsTrap(mon, trap.ttyp) && rn2(4)) return;
	    if (trap?.ttyp === MAGIC_TRAP) {
	        monsterLearnTrap(mon, trap.ttyp);
	        rn2(21);
	    }
	    if (trap?.ttyp === BEAR_TRAP && !mon.mtrapped && !monsterTrapHarmless(mon, trap)) {
	        if (monsterKnowsTrap(mon, BEAR_TRAP) && rn2(4)) return;
        if (game._message_more && !game._process_time_with_more) {
            game._pet_bear_trap_after_more = { mon, trap };
            return;
        }
        monsterLearnTrap(mon, BEAR_TRAP);
        mon.mtrapped = 1;
        trap.tseen = true;
        d(2, 4);
        rn2(5);
        newsym(mon.mx, mon.my);
        addToplineMessage(`The ${mon.saddled ? 'saddled ' : ''}${mon.data?.name || 'creature'} is caught in a bear trap!`);
    }
    if (trap?.ttyp === PIT || trap?.ttyp === SPIKED_PIT) {
        trap.tseen = true;
        addToplineMessage(`The ${mon.data?.name || 'creature'} falls into ${trap.madeby_u ? 'your' : 'a'} pit!`);
        const damage = rnd(trap.ttyp === SPIKED_PIT ? 10 : 6);
        mon.mhp = (mon.mhp || 1) - damage;
        if (mon.mhp < 1) {
            addToplineMessage(`The ${mon.data?.name || 'creature'} is killed!`);
            const data = mon.data || {};
            const corpseData = corpseDataForMonster(data);
            dropMonsterInventory(mon);
            if (monsterLeavesCorpseLikeDrop(corpseData) && monsterCorpseDropSucceeds(mon, data))
                createMonsterCorpseOrGlob(mon, corpseData);
            recordVanquished(mon, false);
            game.level.monsters = (game.level?.monsters || []).filter(other => other !== mon);
            mon.movement = 0;
            if (mon.pet) game._pet_skip_post_move_roll = 1;
            newsym(mon.mx, mon.my);
            return;
        }
    }
	    if (trap?.ttyp === DART_TRAP) {
	        trap.once = true;
        trap.tseen = true;
        const dart = mksobj(DART, true, false);
        dart.quan = 1;
        dart.opoisoned = !rn2(6);
        const hit = (mon.data?.mac ?? 6) + 7 <= rnd(20);
        if (hit) {
            mon.mhp = Math.max(0, (mon.mhp || 1) - 1);
            addToplineMessage(`The ${mon.data?.name || 'creature'} is hit by a dart!`);
        } else {
            Object.assign(dart, {
                kind: 'dart',
                ox: mon.mx,
                oy: mon.my,
                glyph: ')',
                color: CLR_CYAN,
                petFetchable: true,
            });
            game.level.objects.push(dart);
            addToplineMessage(`The ${mon.data?.name || 'creature'} is almost hit by a dart!`);
            newsym(mon.mx, mon.my);
        }
        if (game._message_more) {
            game._pet_delayed_post_move_roll = 1;
            game._pet_skip_post_move_roll = 1;
	        }
	    }
		}

// C ref: allmain.c newgame()
export async function newgame() {
    const g = game;

    g.u = g.u || {};
    g.flags = g.flags || {};
    g.context = g.context || {};
    g.moves = 1;

    init_objects();
    g.quest_status ??= {};
    if (RANDOM_NEMESIS_GENDER_ROLES.has(g._startup_role)) {
        g.quest_status.nemgend = rn2(100) < 50 ? 'female' : 'male';
    }
    if (g._startup_role === 'Priest') {
        do {
            g._pantheon_role = PANTHEON_ROLES[rn2(PANTHEON_ROLES.length)];
        } while (g._pantheon_role === 'Priest');
    }
    if (!g.dungeons?.length) init_dungeons_rng();
    const { role, race } = syncStartupIdentity(g);
    g._initialHp = role.hpBase + race.hpBase;
    g._initialEnergy = role.enBase + race.enBase + (role.enRnd ? rnd(role.enRnd) : 0);
    g.u.uhandedness = rn2(10) ? 'right' : 'left';
    g.u.umovement = NORMAL_SPEED;
    l_nhcore_init();

    g.u.uz = { dnum: 0, dlevel: 1 };

    await mklev();
    u_on_upstairs();
    g.u.ualign = {
        type: ALIGN_TYPE[g._startup_align],
        record: role.initRecord || 0,
    };
    initializePet();
    initializeHero();
    init_vision_globals();
    vision_reset();
    vision_recalc(0);
    if (g.flags?.legacy !== false) g._intro_lines = introLines(g._startup_role || 'Tourist', role.rank, g._startup_align || 'neutral');
    await cls();
    await docrt();
    await bot();
    await flush_screen(1);

    const roleName = g._startup_role || 'Tourist';
    const raceName = g.urace?.adj || 'human';
    const displayRole = g.flags?.female ? (FEMALE_ROLE_NAMES[roleName] || roleName) : roleName;
    const genderName = roleName === 'Valkyrie' || FEMALE_ROLE_NAMES[roleName] ? '' : `${g.flags?.female ? 'female' : 'male'} `;
    const alignName = g._startup_align || 'neutral';
    const welcome = `${helloForRole(roleName)} ${g.plname || 'Hero'}, welcome to NetHack!  You are a ${alignName} ${genderName}${raceName} ${displayRole}.`;
    await pline(welcome);
    g._welcome_message = 1;
    const dt = String(g._datetime || '');
    if (/^\d{14}$/.test(dt)) {
        g._calendar_messages = [];
        const year = Number(dt.slice(0, 4));
        const month = Number(dt.slice(4, 6));
        const day = Number(dt.slice(6, 8));
        const diy = Math.trunc((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86400000);
        const goldn = ((year - 1900) % 19) + 1;
        let epact = (11 * goldn + 18) % 30;
        if ((epact === 25 && goldn > 11) || epact === 24) epact++;
        g.flags.moonphase = (Math.trunc(((((diy + epact) * 6) + 11) % 177) / 22) & 7);
        if (g.flags.moonphase === 4) {
            g.u.uluck = (g.u.uluck || 0) + 1;
            g._calendar_messages.push('You are lucky!  Full moon tonight.');
        } else if (g.flags.moonphase === 0) {
            g._calendar_messages.push('Be careful!  New moon tonight.');
        }
        const wday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
        if (wday === 5 && day === 13) {
            g.flags.friday13 = 1;
            g.u.uluck = (g.u.uluck || 0) - 1;
            g._calendar_messages.push('Watch out!  Bad things can happen on Friday the 13th.');
        }
    }
    g._message_more = g._calendar_messages?.length
        || (g.flags?.legacy !== false && (!g.tutorial_set_in_config || g.flags?.explore)) ? 1 : 0;

    if (g.flags?.legacy !== false) l_nhcore_init();
}

function regionContains(reg, x, y) {
    return reg?.coords?.some(coord => coord.x === x && coord.y === y);
}

function reportGasCloudDissipation(g, reg) {
    if (reg?.type !== 'gas_cloud') return;
    const ux = g.u?.ux ?? -1;
    const uy = g.u?.uy ?? -1;
    if (regionContains(reg, ux, uy)) {
        addToplineMessage('The gas cloud around you dissipates.');
        return;
    }
    const visibleCount = (reg.coords || []).filter(coord =>
        g.viz_array?.[coord.y]?.[coord.x] & IN_SIGHT).length;
    if (visibleCount) addToplineMessage(`You see ${visibleCount === 1 ? 'a' : 'some'} gas cloud${visibleCount === 1 ? '' : 's'} dissipate.`);
}

function gasCloudWakeNearby(x, y) {
    for (const mon of game.level?.monsters || []) {
        if (!mon.msleeping) continue;
        const dx = (mon.mx || 0) - x;
        const dy = (mon.my || 0) - y;
        if (dx * dx + dy * dy <= 4) mon.msleeping = 0;
    }
}

function heroGasCloudImmune(g) {
    const magicalBreathing = (g.inventory || []).some(item =>
        item.worn && (item.actualKind === 'amulet of magical breathing'
            || item.kind === 'amulet of magical breathing'));
    const form = g.u?._polyself_base || {};
    return !!(g.u?.uinvulnerable || g.u?.underwater || g.u?.uunderwater
        || magicalBreathing || form.breathless || form.nonliving);
}

function monsterGasCloudImmune(mon) {
    const data = mon?.data || {};
    return !!(data.breathless || data.nonliving || data.name === 'fog cloud'
        || data.name?.endsWith(' golem') || data.mlet === 'W'
        || data.mlet === 'Z' || data.mlet === 'M' || data.mlet === "'");
}

function monsterPoisonResistant(mon) {
    const data = mon?.data || {};
    return !!(mon?.poisonResistance || data.resistsPoison || data.poisonResistance);
}

function applyHeroGasCloud(g, reg) {
    if ((reg.damage || 0) < 1 || !regionContains(reg, g.u?.ux, g.u?.uy)) return;
    if (heroGasCloudImmune(g)) return;
    if (!g.u?.blind) {
        addToplineMessage('Your eyes sting.');
        g.u.blind = true;
        g.u._blindTimeout = Math.max(g.u._blindTimeout || 0, 1);
    }
    if (g.u?.poisonResistance) {
        addToplineMessage('You cough!');
        gasCloudWakeNearby(g.u.ux, g.u.uy);
        return;
    }
    addToplineMessage('Something is burning your lungs!');
    addToplineMessage('You cough and spit blood!');
    gasCloudWakeNearby(g.u.ux, g.u.uy);
    g.u.uhp = Math.max(0, (g.u.uhp || 0) - (rnd(reg.damage || 1) + 5));
    if ((g.u.uhp || 0) <= 0) {
        g._death_cause = 'killed by a gas cloud';
        addToplineMessage('You die...');
    }
}

function applyMonsterGasCloud(g, reg, mon) {
    if ((reg.damage || 0) < 1 || !regionContains(reg, mon.mx, mon.my)) return false;
    if (monsterGasCloudImmune(mon)) return false;
    const data = mon.data || {};
    const nearby = (mon.mx - (g.u?.ux || 0)) ** 2 + (mon.my - (g.u?.uy || 0)) ** 2 < 8;
    if (!data.silent && (couldSeeCoord(mon.mx, mon.my) || nearby))
        addToplineMessage(`${monsterDisplayName(mon)} coughs!`);
    gasCloudWakeNearby(mon.mx, mon.my);
    if (reg.heroFault) {
        mon.mpeaceful = 0;
        mon.mtame = 0;
        mon.pet = false;
    }
    if (!data.noeyes && mon.mcansee !== false) {
        mon.mblinded = Math.max(mon.mblinded || 0, 1);
        mon.mcansee = false;
    }
    if (monsterPoisonResistant(mon)) return false;
    mon.mhp = (mon.mhp || 1) - (rnd(reg.damage || 1) + 5);
    if ((mon.mhp || 0) > 0) return false;
    if (couldSeeCoord(mon.mx, mon.my)) addToplineMessage(`${monsterDisplayName(mon)} is killed!`);
    recordVanquished(mon, !!reg.heroFault);
    dropMonsterInventory(mon);
    g.level.monsters = (g.level?.monsters || []).filter(other => other !== mon);
    newsym(mon.mx, mon.my);
    return true;
}

function applyGasCloudEffects(g, reg) {
    applyHeroGasCloud(g, reg);
    for (const mon of [...(g.level?.monsters || [])])
        applyMonsterGasCloud(g, reg, mon);
}

export function advanceRegions(g) {
    if (!g.level?.regions?.length) return;
    const regionCount = g.level.regions.length;
    g.level.regions = g.level.regions.filter(reg => {
        if (reg.ttl !== 0) return true;
        if (reg.type === 'gas_cloud' && (reg.damage || 0) >= 5) {
            reg.damage = Math.trunc((reg.damage || 0) / 2);
            reg.ttl = 2;
            return true;
        }
        reportGasCloudDissipation(g, reg);
        return false;
    });
    if (g.level.regions.length !== regionCount) {
        vision_reset();
        g.vision_full_recalc = 1;
    }
    for (const reg of g.level.regions) {
        if (reg.ttl > 0) reg.ttl--;
        if (reg.type === 'gas_cloud') {
            applyGasCloudEffects(g, reg);
            if (reg.ttl < 20
                && (g.level?.monsters || []).some(mon => mon.data?.name === 'fog cloud'
                    && regionContains(reg, mon.mx, mon.my)))
                reg.ttl += 5;
        }
    }
}

function advanceSpecialLevelFeatures(g) {
    if (Is_airlevel(g.u?.uz)) movebubbles();
    else if (g.level?.flags?.fumaroles) fumaroles();
}

export function processEatingOccupationTick(g = game) {
    if (!(g._eating_turns_remaining > 0) || g._command_mode === 'continueEatingPrompt'
        || (g._pending_message && g._message_more && g._process_time_with_more))
        return false;
    g._eating_turns_remaining--;
    const eatenInventoryObject = g._eating_inventory_object;
    const eatenFloorObject = g._eating_floor_object;
    const biteNutrition = Math.trunc(g._eating_bite_nutrition || 0);
    const biteHunger = Math.trunc(g._eating_bite_hunger || biteNutrition);
    if (eatenInventoryObject && biteNutrition > 0 && g._eating_turns_remaining > 0) {
        const nutritionOutcome = addDelayedFoodBiteNutrition(biteHunger, {
            remainingAfterBite: Math.max(0, g._eating_turns_remaining - 1),
            food: eatenInventoryObject,
        });
        if (nutritionOutcome.messages?.length) addToplineMessage(nutritionOutcome.messages.join('  '));
        if (nutritionOutcome.choked) {
            if (nutritionOutcome.recovered) {
                if (!nutritionOutcome.preBite) consumeEatingInventoryObject(eatenInventoryObject, biteNutrition);
                pauseEatingOccupationAfterChoke(g, nutritionOutcome.preBite
                    ? g._eating_turns_remaining + 1 : g._eating_turns_remaining);
            } else {
                g._message_more = nutritionOutcome.more ? 1 : 0;
                clearActiveEatingOccupation(g);
            }
            if (g.context) g.context.move = nutritionOutcome.move ?? 0;
            return false;
        }
        consumeEatingInventoryObject(eatenInventoryObject, biteNutrition);
        if (nutritionOutcome.prompt) {
            g._command_mode = 'continueEatingPrompt';
            g._pending_time_passed = 0;
        }
    }
    if (eatenFloorObject && biteNutrition > 0 && g._eating_turns_remaining > 0) {
        const nutritionOutcome = addDelayedFoodBiteNutrition(biteHunger, {
            remainingAfterBite: Math.max(0, g._eating_turns_remaining - 1),
            food: eatenFloorObject,
        });
        if (nutritionOutcome.messages?.length) addToplineMessage(nutritionOutcome.messages.join('  '));
        if (nutritionOutcome.choked) {
            if (nutritionOutcome.recovered) {
                if (!nutritionOutcome.preBite) consumeEatingObject(eatenFloorObject, biteNutrition);
                pauseEatingOccupationAfterChoke(g, nutritionOutcome.preBite
                    ? g._eating_turns_remaining + 1 : g._eating_turns_remaining);
            } else {
                g._message_more = nutritionOutcome.more ? 1 : 0;
                clearActiveEatingOccupation(g);
            }
            if (g.context) g.context.move = nutritionOutcome.move ?? 0;
            return false;
        }
        consumeEatingObject(eatenFloorObject, biteNutrition);
        if (nutritionOutcome.prompt) {
            g._command_mode = 'continueEatingPrompt';
            g._pending_time_passed = 0;
        }
    }
    if (!g._eating_turns_remaining) {
        g._map_redraw_pending = 1;
        if (eatenFloorObject) {
            if (g._eating_floor_object_direct_useup) {
                useUpEatingFloorObject(g, eatenFloorObject);
                g._eating_floor_object_direct_useup = 0;
            } else {
                g._eating_floor_object_pending_useup = eatenFloorObject;
            }
            g._eating_floor_object = null;
        }
        if (eatenInventoryObject) {
            removeEatingInventoryObject(g, eatenInventoryObject);
            clearEatingInventoryState(g);
        }
        if (eatenFloorObject && biteNutrition > 0) clearEatingInventoryState(g);
        if (g._eating_nutrition && g.u) {
            addEatingNutrition(g, g._eating_nutrition);
            g._eating_nutrition = 0;
        }
        addToplineMessage(g._eating_nomovemsg || g._eating_finish_message || 'You finish eating.');
        g._eating_nomovemsg = '';
        g._eating_finish_message = '';
        if (g._eating_newt_buzz) {
            g._eating_newt_buzz = 0;
            if (rn2(3) || 3 * (g.u?.uen || 0) <= 2 * (g.u?.uenmax || 0)) {
                const oldEnergy = g.u?.uen || 0;
                if (g.u) g.u.uen = oldEnergy + rnd(3);
                if ((g.u?.uen || 0) > (g.u?.uenmax || 0)) {
                    if (!rn2(3) && g.u) g.u.uenmax = (g.u.uenmax || 0) + 1;
                    if (g.u) g.u.uen = g.u.uenmax || 0;
                }
                if ((g.u?.uen || 0) !== oldEnergy) addToplineMessage('You feel a mild buzz.');
            }
        }
        g._pending_rotten_food_eating_message = 0;
        clearInterruptedEatingState(g);
        clearEatingFullnessState(g);
        g._pet_food_scan_inventory = g.inventory || [];
    }
    return true;
}

export async function moveloop_core() {
    const g = game;
    while (g._pending_time_passed
        && !(g._pending_message && !g._message_more && g._pending_message_blocks_time)
        && (!(g._pending_message && g._message_more) || g._process_time_with_more)) {
        let turnAdvanced = false;
        let skipMonsterTurnsThisPass = false;
        let ballDragNoResumePass = false;
        if (g._ball_drag_delay_no_resume > 0) {
            g._ball_drag_delay_no_resume--;
            ballDragNoResumePass = true;
            g._resume_time_after_more = 0;
            g.u.umovement = (g.u.umovement ?? NORMAL_SPEED) - NORMAL_SPEED;
        } else if (g._resume_time_after_more) {
            g._resume_time_after_more = 0;
        } else {
            g.u.umovement = (g.u.umovement ?? NORMAL_SPEED) - NORMAL_SPEED;
        }
        const armorTailOnly = !!g._armor_tail_after_more;
        if (armorTailOnly) g._armor_tail_after_more = 0;
        if (g._deferred_monster_turn_tail && !(g._pending_message && g._message_more)) {
            g._deferred_monster_turn_tail = 0;
            const tailResult = await finishMonsterTurnTail();
            g.moves = (g.moves || 1) + 1;
            await afterMoveTurn(g);
            g.u.umoved = false;
            if (g.u?.ublesscnt) g.u.ublesscnt--;
            if (tailResult === false && g._command_mode === 'deathDieMore') {
                g._pending_time_passed = 0;
                break;
            }
            advanceSpecialLevelFeatures(g);
            advanceRegions(g);
            g._pending_time_passed = Math.max(0, (g._pending_time_passed || 0) - 1);
            turnAdvanced = true;
            skipMonsterTurnsThisPass = true;
            g._skip_pending_time_decrement = 1;
        }
        if (g._search_pending_count > 0) {
            let foundSearchMonster = false;
            let foundMessage = '';
            let revealedSecretTerrain = false;
            let foundTrap = false;
            let foundStatueTrap = false;
            g._search_pending_count--;
            for (let x = (g.u?.ux || 0) - 1; x <= (g.u?.ux || 0) + 1; x++) {
                for (let y = (g.u?.uy || 0) - 1; y <= (g.u?.uy || 0) + 1; y++) {
                    if (x < 1 || x >= COLNO || y < 0 || y >= ROWNO) continue;
                    if (g.u?.ux === x && g.u?.uy === y) continue;
                    const loc = g.level?.at(x, y);
                    if (!loc) continue;
                    if (g.u?.blind || (g.viz_array?.[y]?.[x] & IN_SIGHT))
                        feelSearchLocation(x, y);
                    if (loc.typ === SDOOR) {
                        if (rnl(7)) continue;
                        let doorMask = loc.doormask & ~(D_BROKEN | D_ISOPEN | D_CLOSED);
                        loc.typ = DOOR;
                        if (!(doorMask & D_LOCKED)) doorMask |= D_CLOSED;
                        loc.doormask = doorMask;
                        foundMessage = 'You find a hidden door.';
                        revealedSecretTerrain = true;
                        newsym(x, y);
                    } else if (loc.typ === SCORR) {
                        if (rnl(7)) continue;
                        loc.typ = CORR;
                        foundMessage = 'You find a hidden passage.';
                        revealedSecretTerrain = true;
                        newsym(x, y);
                    } else {
                        const mon = (g.level?.monsters || []).find(candidate =>
                            candidate.mx === x && candidate.my === y && !candidate._hide_for_bones_prompt);
                        if (mon) {
                            const mfres = await searchFindMonster(mon);
                            if (mfres === -1) continue;
                            if (mfres > 0) {
                                foundSearchMonster = true;
                                break;
                            }
                        }
                        const trap = (g.level?.traps || []).find(candidate =>
                            candidate.tx === x && candidate.ty === y);
                        if (trap && !trap.tseen && !rnl(8)) {
                            if (trap.ttyp === STATUE_TRAP) {
                                foundMessage = await activateStatueTrap(trap, x, y, { search: true }) || '';
                                if (foundMessage) exerciseAttribute(A_WIS, true);
                                foundTrap = true;
                                foundStatueTrap = true;
                                break;
                            }
                            trap.tseen = true;
                            exerciseAttribute(A_WIS, true);
                            newsym(x, y);
                            const name = TRAP_NAMES[trap.ttyp] || 'trap';
                            const article = /^[aeiou]/.test(name) ? 'an' : 'a';
                            foundMessage = `You find ${article} ${name}.`;
                            foundTrap = true;
                        }
                    }
                }
                if (foundSearchMonster || foundStatueTrap) break;
            }
            if (foundSearchMonster) {
                g._search_pending_count = 0;
                g._pending_time_passed = Math.min(g._pending_time_passed, 1);
                g._keep_pending_message = 1;
            } else if (revealedSecretTerrain) {
                rn2(19);
                vision_reset();
                vision_recalc(0);
                await pline(foundMessage);
                g._keep_pending_message = 1;
                g._search_pending_count = 0;
                g._pending_time_passed = Math.min(g._pending_time_passed, 1);
            } else if (foundTrap) {
                if (foundMessage) await pline(foundMessage);
                g._keep_pending_message = 1;
                g._search_pending_count = 0;
                g._pending_time_passed = Math.min(g._pending_time_passed, 1);
            }
        }


        const earlyForceLock = g._force_lock_occupation && !g._process_time_with_more;
        const earlyPickLock = g._pick_lock_occupation && !g._process_time_with_more;
        const earlyPickDig = g._pick_dig_occupation && !g._process_time_with_more;
        const earlyTinOpening = g._tin_opening_occupation && !g._process_time_with_more;
        if (earlyForceLock) processForceLockOccupation();
        if (earlyPickLock) processPickLockOccupation();
        if (earlyPickDig) await processPickDigOccupation();
        if (earlyTinOpening) await processTinOpeningTurn();

        processEatingOccupationTick(g);

        const clearPetKillHalluDisplay = !!g._hallu_display_after_pet_kill_luck;
        const clearColdHalluDisplay = !!g._hallu_display_after_cold_topline;
        const clearDeferredMultiattackHalluDisplay = !!g._hallu_display_after_deferred_multiattack;
        const clearExpelHalluDisplay = !!g._hallu_display_after_expel;
        const normalHalluDisplay = g._hallu_display_after_pet_kill_luck
            || g._hallu_display_after_cold_topline
            || g._hallu_display_after_deferred_multiattack
            || g._hallu_display_after_expel
            || (!g._dismissed_more_this_command && !g._process_time_with_more);
        if (normalHalluDisplay && !armorTailOnly) g._display_hallucinated_normal = 1;
        const ballDragForcedTail = g._ball_drag_force_tail_on_last_turn && g._pending_time_passed === 1;
        let forcedTailRemaining = -1;
        if (g._force_monster_turn_tail_turns > 0) {
            g._force_monster_turn_tail_turns--;
            forcedTailRemaining = g._force_monster_turn_tail_turns;
            g._force_monster_turn_tail_once = 1;
            g._force_monster_turn_tail_despite_move = 1;
        }
        if (ballDragForcedTail) {
            g._ball_drag_force_tail_on_last_turn = 0;
            g._force_monster_turn_tail_once = 1;
        }
        const movedMonsters = skipMonsterTurnsThisPass || armorTailOnly ? false : await processMonsterTurns();
        if (ballDragForcedTail && g.u) g.u.umovement = Math.min(g.u.umovement || 0, NORMAL_SPEED);
        if (ballDragNoResumePass && g.u) g.u.umovement = Math.min(g.u.umovement || 0, NORMAL_SPEED);
        if (normalHalluDisplay && !armorTailOnly) g._display_hallucinated_normal = 0;
	        if (g._eating_turns_remaining > 0
	            && (g.level?.monsters || []).some(mon =>
	                !mon.pet && !mon.mpeaceful && !mon.msleeping && !mon.mundetected
	                && Math.max(Math.abs(mon.mx - (g.u?.ux || 0)), Math.abs(mon.my - (g.u?.uy || 0))) <= 1
	                && couldSeeCoord(mon.mx, mon.my))) {
	            interruptEatingOccupation(g);
	            g._pending_time_passed = 0;
	        }
        if (clearPetKillHalluDisplay) g._hallu_display_after_pet_kill_luck = 0;
        if (clearColdHalluDisplay) g._hallu_display_after_cold_topline = 0;
        if (clearDeferredMultiattackHalluDisplay) g._hallu_display_after_deferred_multiattack = 0;
        if (clearExpelHalluDisplay) g._hallu_display_after_expel = 0;
	        const prayerPartialTurn = !movedMonsters && g._prayer_occupation
	            && g._pending_prayer_finish_message;
	        if (armorTailOnly) {
	            const occupationForTail = g._armor_wear_occupation;
	            g._armor_wear_occupation = null;
	            g._monster_turns_started = 0;
	            const advancedTail = await processMonsterTurns();
	            g._armor_wear_occupation = occupationForTail;
            if (advancedTail) {
                g.moves = (g.moves || 1) + 1;
                await afterMoveTurn(g);
                advanceSpecialLevelFeatures(g);
                advanceRegions(g);
            }
	            const occupation = g._armor_wear_occupation;
	            if (occupation?.turns > 0) occupation.turns--;
	            const item = (g.inventory || []).find(invItem => invItem.letter === occupation?.itemLetter);
            if (occupation && !(occupation.turns > 0)) {
                g._armor_wear_occupation = null;
                let message = 'You finish your dressing maneuver.';
                if (occupation.action === 'takeoff') {
                    message = `You finish taking off your ${occupation.simpleName || pickupObjectName(item || {})}.`;
                    if (item && item.worn && occupation.acBonus != null) {
                        item.worn = false;
                        item.line = `${item.letter || occupation.itemLetter || '?'} - ${occupation.baseName || pickupObjectName(item)}`;
                        if (g.u) g.u.uac = (g.u.uac ?? 10) + occupation.acBonus;
                        if (occupation.kind === 'speed boots' && g.u) {
                            g.u.veryfast = false;
                            syncHeroSpeedState(g);
                        }
                        if (isBlueDragonArmorKind(occupation.kind)) {
                            setBlueDragonArmorFast(g, false);
                            if (!g.u?.veryfast) message += '  You slow down.';
                        }
                        updateGauntletsOfPowerStrength(occupation.kind, false);
                    }
                } else if (item && !item.worn && occupation.acBonus != null) {
                    item.worn = true;
                    if (occupation.wornLine) item.line = occupation.wornLine;
                    if (g.u) g.u.uac = (g.u.uac ?? 10) - occupation.acBonus;
                    if (occupation.reflecting && g.u) g.u.reflecting = true;
                    updateGauntletsOfPowerStrength(occupation.kind, true);
                    if (occupation.kind === 'gauntlets of power') {
                        if (item) {
                            item.known = true;
                            recordArmorDiscoveryByKind(occupation.kind, false);
                        }
                        g._gauntlets_power_exercise_after_turn_tail = 1;
                    }
                }
                if (occupation.action !== 'takeoff' && occupation.kind === 'gauntlets of power') {
                    if (item) {
                        item.known = true;
                        recordArmorDiscoveryByKind(occupation.kind, false);
                    }
                    g._gauntlets_power_exercise_after_turn_tail = 1;
                }
                if (occupation.action !== 'takeoff' && isBlueDragonArmorKind(occupation.kind)) {
                    const alreadyFast = !!(g.u?.fast || g.u?.veryfast);
                    if (!g.u?.veryfast)
                        message += `  You speed up${alreadyFast ? ' a bit more' : ''}.`;
                    setBlueDragonArmorFast(g, true);
                }
                if (occupation.action !== 'takeoff' && occupation.kind === 'speed boots') {
                    const alreadyFast = !!occupation.alreadyFast;
                    if (g.u) {
                        g.u.veryfast = true;
                        syncHeroSpeedState(g);
                    }
                    message += `  You feel yourself speed up${alreadyFast ? ' a bit more' : ''}.`;
                    rn2(19);
                    if (item) {
                        item.known = true;
                        recordArmorDiscoveryByKind(occupation.kind, false);
                        item.line = wornSpeedBootsLine(item, g);
                    }
                }
                if (occupation.kind === 'fumble boots') g._pending_fumble_boots_timeout = 1;
                g._pending_message = message;
                g._keep_pending_message = 1;
                g._message_more = 0;
                g._process_time_with_more = 0;
                g._topline_after_more = '';
            }
            g.u.umoved = false;
            turnAdvanced = true;
            if (g.u?.ublesscnt) g.u.ublesscnt--;
        } else if (movedMonsters === 'defer-tail') {
            // The visible --More-- must be captured before nh_timeout/gethungry tail rolls.
        } else if (movedMonsters) {
            g.moves = (g.moves || 1) + 1;
            await afterMoveTurn(g);
            g.u.umoved = false;
            turnAdvanced = true;
            if (g.u?.ublesscnt) g.u.ublesscnt--;
            advanceSpecialLevelFeatures(g);
            advanceRegions(g);
        }
	        if (turnAdvanced && g._helpless_time > 0) {
	            g._helpless_time--;
	            if (g._sleeping_time > 0) g._sleeping_time--;
	            if (!g._helpless_time && g._wake_message) {
	                g._sleeping_time = 0;
	                if (g._hear_again_after_wake) {
	                    g._hear_again_after_wake = 0;
	                    if (!rn2(2) && g.u) {
	                        g.u._deafTimeout = 0;
	                        g.u._statusSuffix = (g.u._statusSuffix || '').replace(' Deaf', '');
	                    }
	                }
	                const wakeMessage = g._wake_message;
	                const shown = addToplineMessage(wakeMessage);
	                if (!shown && g._message_more && g._topline_after_more === wakeMessage)
	                    g._turn_tail_topline_more = 1;
	                g._wake_message = '';
	            }
	        }
        if (g._force_lock_continue_time) {
            g._force_lock_continue_time = 0;
            g._pending_time_passed++;
            g._continue_monsters_after_more = 1;
        }
        const collapsedDoubleMiss = /^The .+ misses the .+\.  The .+ misses the .+\.$/.test(g._pending_message || '');
        if (prayerPartialTurn) g._skip_pending_time_decrement = 1;
	        if (g._skip_pending_time_decrement) g._skip_pending_time_decrement = 0;
	        else if (g._pet_resume_keep_time_count > 0 && !collapsedDoubleMiss) g._pet_resume_keep_time_count--;
	        else {
	            g._pet_resume_keep_time_count = 0;
	            g._pending_time_passed--;
	        }
        if (g._ball_drag_delay_turns_remaining > 0) {
            if (turnAdvanced) g._ball_drag_delay_turns_remaining--;
            if (g._ball_drag_delay_turns_remaining > 0)
                g._pending_time_passed = Math.max(g._pending_time_passed || 0, 1);
            else
                g._ball_drag_delay_turns_remaining = 0;
        }
	        if (g._eating_finish_extra_time && !g._message_more) {
	            g._eating_finish_extra_time = 0;
	            g._pending_time_passed = Math.max(g._pending_time_passed || 0, 1);
	        }
        if (g._clear_pending_time_after_queued_dead_turn) {
            g._clear_pending_time_after_queued_dead_turn = 0;
            g._pending_time_passed = 0;
        }
        if (g._suppress_monster_attack_messages > 0) g._suppress_monster_attack_messages--;
        if (g._armor_wear_occupation?.action === 'takeoff' && g._pending_message && !g._message_more) {
            g._message_more = 1;
            g._process_time_with_more = 0;
        }
        if (g._armor_wear_occupation && !g._message_more)
            g._pending_time_passed = Math.max(g._pending_time_passed || 0, 1);
        if (!g._pending_time_passed && g._prayer_pending_done && g._prayer_pending_done_delay > 0) {
            g._prayer_pending_done_delay--;
        }
        const waitingForSplitPrayerTime = g._prayer_debug_pleased
            && g._prayer_split_finish_message
            && g._prayer_split_waiting_for_time
            && (g._prayer_split_remaining_time || 0) > 0;
        if (!g._pending_time_passed && g._prayer_pending_done
            && !waitingForSplitPrayerTime && !(g._prayer_pending_done_delay > 0)) {
            const finishSplitPrayer = g._prayer_debug_pleased
                && g._prayer_split_finish_message
                && g._pending_prayer_finish_message;
            g._prayer_pending_done = 0;
            g._prayer_occupation = 0;
            if (g.u) g.u.uinvulnerable = false;
            g.u.umovement = NORMAL_SPEED;
            if (finishSplitPrayer) {
                const finishMessage = 'You finish your prayer.';
                g._pending_message = g._pending_message
                    ? `${g._pending_message}  ${finishMessage}`
                    : finishMessage;
                g._message_more = 1;
                g._keep_pending_message = 1;
                g._process_time_with_more = 0;
                g._suppress_more_time_once = Math.max(g._suppress_more_time_once || 0, 1);
            }
            if (g._prayer_too_soon) {
                g._prayer_too_soon = 0;
                g.u.ublesscnt = (g.u.ublesscnt || 0) + rnz(250);
                g.u.uluck = (g.u.uluck || 0) - 3;
                g.u.ugangr = (g.u.ugangr || 0) + 1;
                const luck = (g.u.uluck || 0) + (g.u.moreluck || 0);
                const record = g.u.ualign?.record || 0;
	                let maxanger = 3 * (g.u.ugangr || 0) + ((luck > 0 || record >= 4) ? Math.trunc(-luck / 3) : -luck);
		                if (maxanger < 1) maxanger = 1;
		                else if (maxanger > 15) maxanger = 15;
		                const angryResult = rn2(maxanger);
			                const prayerMessageComplete = !!g._prayer_message_complete_once;
			                g._prayer_message_complete_once = 0;
			                const deferAngryEffects = g._message_more && g._pending_prayer_finish_message;
		                if (angryResult === 2 || angryResult === 3) {
		                    rn2(4);
		                    if (!deferAngryEffects) {
		                        if (g.u?.acurr?.a) g.u.acurr.a[2] = Math.max(3, (g.u.acurr.a[2] || 4) - 1);
		                        loseExperienceLevel();
		                    }
		                }
		                if (!deferAngryEffects) {
		                    const timeout = rnz(300);
		                    if (timeout > (g.u?.ublesscnt || 0)) g.u.ublesscnt = timeout;
		                }
		                g._prayer_angry_effects_done = !deferAngryEffects;
		                g._prayer_angry_timeout_done = !deferAngryEffects;
		                if (!deferAngryEffects && !g._command_mode && angryResult !== 2 && angryResult !== 3) {
		                    if (!prayerMessageComplete) {
		                        const messages = [];
		                        if (g._pending_message) messages.push(g._pending_message);
		                        else if (g._prayer_nearby_trouble) messages.push('It misses.');
	                        messages.push('You finish your prayer.');
	                        messages.push(`You feel that ${g._prayer_god || 'your god'} is displeased.`);
	                        g._pending_message = messages.join('  ');
	                    }
		                g._message_more = 0;
		                g._keep_pending_message = 1;
		                g._pending_prayer_finish_message = 0;
		                g._prayer_angry_after_more = 0;
		                g._prayer_angry_result = 0;
		                if (g._prayer_nearby_trouble) {
                        if (g.u && (g.u.uhp || 0) < (g.u.uhpmax || 0)) g.u.uhp++;
                        const adjacent = (g.level?.monsters || []).find(mon => !mon.pet && !mon.mpeaceful
                            && Math.max(Math.abs((mon.mx || 0) - (g.u?.ux || 0)), Math.abs((mon.my || 0) - (g.u?.uy || 0))) <= 1);
                        if (adjacent) {
                            adjacent.mundetected = true;
                            newsym(adjacent.mx, adjacent.my);
                        }
                        g._prayer_nearby_trouble = 0;
                    }
                } else {
	                g._prayer_angry_after_more = 1;
	                g._prayer_angry_result = angryResult;
                }
	            }
        }
        if (!earlyForceLock) processForceLockOccupation();
        if (!earlyPickLock) processPickLockOccupation();
        if (!earlyPickDig) await processPickDigOccupation();
        if (!earlyTinOpening) await processTinOpeningTurn();
        if (g._force_lock_continue_time) {
            g._force_lock_continue_time = 0;
            g._pending_time_passed = Math.max(g._pending_time_passed || 0, 1);
            g._continue_monsters_after_more = 1;
        }
        if (g._pick_lock_continue_time) {
            g._pick_lock_continue_time = 0;
            g._pending_time_passed = Math.max(g._pending_time_passed || 0, 1);
            g._continue_monsters_after_more = 1;
        }
        if (g._pick_dig_occupation && !g._message_more)
            g._pending_time_passed = Math.max(g._pending_time_passed || 0, 1);
        if (g._tin_opening_occupation && !g._message_more)
            g._pending_time_passed = Math.max(g._pending_time_passed || 0, 1);
        if (!earlyForceLock
            && g._force_lock_occupation
            && g._process_time_with_more
            && g._pending_force_lock_start_message) {
				            const clearPetKillHalluDisplay = !!g._hallu_display_after_pet_kill_luck;
			            const clearColdHalluDisplay = !!g._hallu_display_after_cold_topline;
			            const clearDeferredMultiattackHalluDisplay = !!g._hallu_display_after_deferred_multiattack;
			            const normalHalluDisplay = g._hallu_display_after_pet_kill_luck
			                || g._hallu_display_after_cold_topline
			                || g._hallu_display_after_deferred_multiattack
			                || (!g._dismissed_more_this_command && !g._process_time_with_more);
			            if (normalHalluDisplay) g._display_hallucinated_normal = 1;
			            const movedMoreMonsters = await processMonsterTurns();
			            if (normalHalluDisplay) g._display_hallucinated_normal = 0;
			            if (clearPetKillHalluDisplay) g._hallu_display_after_pet_kill_luck = 0;
			            if (clearColdHalluDisplay) g._hallu_display_after_cold_topline = 0;
			            if (clearDeferredMultiattackHalluDisplay) g._hallu_display_after_deferred_multiattack = 0;
            if (movedMoreMonsters === 'defer-tail') {
                // Deferred by a message prompt; the top of the loop resumes the tail.
            } else if (movedMoreMonsters) {
                g.moves = (g.moves || 1) + 1;
                await afterMoveTurn(g);
            }
            if (g._message_more && g._pending_force_lock_start_message && !g._process_time_with_more) {
                g._process_time_with_more = 0;
                break;
            }
        }
        if (g._force_lock_occupation
            && (!g._message_more || (g._process_time_with_more && g._pending_force_lock_start_message)))
            g._pending_time_passed = Math.max(g._pending_time_passed || 0, 1);
        if (g._pick_lock_occupation && !g._message_more)
            g._pending_time_passed = Math.max(g._pending_time_passed || 0, 1);
        if (g._pick_dig_occupation && !g._message_more)
            g._pending_time_passed = Math.max(g._pending_time_passed || 0, 1);
        if (g._message_more && !g._process_time_with_more) {
            const moreNeedsTimeResume = g._pet_inventory_resume
                || g._monster_resume_index
                || g._monster_resume_same_index
                || g._attack_resume_after_more
                || g._pickup_resume_after_more
                || g._queued_dead_monsters?.length
	                || g._queued_monster_attacks_after_more?.length
	                || g._continue_monsters_after_more
	                || g._deferred_monster_turn_tail
	                || g._force_lock_occupation
                    || g._pick_lock_occupation
                    || g._pick_dig_occupation
                    || g._tin_opening_occupation;
            const completedTurnTailMore = g._turn_tail_topline_more && !moreNeedsTimeResume;
            if (g._armor_finish_after_more) g._armor_finish_after_more = 0;
            else if (g._suppress_more_time_once > 0) g._suppress_more_time_once--;
            else if (!g._pet_message_resume && !completedTurnTailMore) g._pending_time_passed++;
            g._turn_tail_topline_more = 0;
            const swapMoreBeforeTimeDebit = /^You swap places with\b/.test(g._pending_message || '');
            g._resume_time_after_more = completedTurnTailMore || swapMoreBeforeTimeDebit ? 0 : 1;
            if (g._continue_monsters_after_more && !g._pet_inventory_resume
                && !g._monster_resume_index && !g._monster_resume_same_index
                && !g._attack_resume_after_more && !g._pickup_resume_after_more) {
                g._process_time_with_more = 1;
                continue;
            }
            if (g._pet_message_resume || g._queued_dead_monsters?.length) {
                g._run_steps_after_more = Math.max(g._run_steps_after_more || 0, g._run_steps_remaining || 0);
                if (g._queued_dead_monsters?.length) g._continue_monsters_after_more = 1;
            } else {
                if (g._run_key && (g._run_steps_remaining > 0 || g._initial_run_command || g._running_continuation))
                    g._run_interrupted_by_more = 1;
                if (g._run_interrupted_by_more) g._run_interrupted_more_message = g._pending_message || '';
                g._run_steps_remaining = 0;
            }
            break;
        }
        if (g._message_more && g._process_time_with_more
            && g.u?._monsterMove && g.u._monsterMove < NORMAL_SPEED
            && (g.u?.umovement ?? 0) < NORMAL_SPEED * 2) {
            g._pending_time_passed = Math.max(g._pending_time_passed || 0, 1);
            g._resume_time_after_more = 1;
            g._continue_monsters_after_more = 1;
            if (!g._pet_inventory_resume && !g._monster_resume_index
                && !g._attack_resume_after_more && !g._pickup_resume_after_more) continue;
            break;
        }
        if (!g._pending_time_passed && g._ball_drag_travel_delay_subtract) {
            g._ball_drag_travel_delay_subtract = 0;
            if (g.u) {
                g.u.umovement = Math.max(0, (g.u.umovement || 0) - NORMAL_SPEED);
                g._ball_drag_travel_delay_restore = 2;
            }
        }
        if (!g._pending_time_passed && g._jump_delay_turn) {
            if (turnAdvanced) {
                g._jump_delay_turn = 0;
            } else if (!g._message_more && (g.u?.umovement ?? 0) >= NORMAL_SPEED) {
                g._pending_time_passed = 1;
                continue;
            }
        }
        if (!g._pending_time_passed && g._travel_dynamic_target && !g._travel_keys?.length) {
            const target = g._travel_dynamic_target;
            if ((g.u?.ux || 0) === target.x && (g.u?.uy || 0) === target.y) {
                g._travel_dynamic_target = null;
            } else {
                const keys = travelPathKeys(target.x, target.y, true, !!target.allowGuess, !!target.allowBlockedTarget);
                if (keys[0]) g._travel_keys = [keys[0]];
                else g._travel_dynamic_target = null;
            }
        }
        if (!g._pending_time_passed && g._travel_keys?.length) {
            const key = g._travel_keys.shift();
            const dir = RUN_DIRECTIONS[key] || { dx: 0, dy: 0 };
            const heroX = g.u?.ux || 0;
            const heroY = g.u?.uy || 0;
            const adjacentMonster = !g._travel_ignore_adjacent_stop && (g.level?.monsters || []).find(mon => !mon.pet && !mon.mpeaceful
                && Math.max(Math.abs(mon.mx - heroX), Math.abs(mon.my - heroY)) <= 1);
            if (adjacentMonster) {
                g._travel_keys = [];
                g._travel_dynamic_target = null;
                g._travel_ignore_adjacent_stop = 0;
                break;
            }
            const nextX = (g.u?.ux || 0) + dir.dx;
            const nextY = (g.u?.uy || 0) + dir.dy;
            if ((g.level?.monsters || []).some(mon => !mon.pet && !mon.mpeaceful && mon.mx === nextX && mon.my === nextY)) {
                g._travel_keys = [];
                g._travel_dynamic_target = null;
                break;
            }
            const nextLoc = g.level?.at(nextX, nextY);
            if (g._travel_dynamic_target?.allowBlockedTarget
                && (!nextLoc || IS_OBSTRUCTED(nextLoc.typ)))
                g._suppress_obstructed_message_once = 1;
            await rhack(key);
            if (g._travel_previous_target
                && (g.u?.ux || 0) === g._travel_previous_target.x
                && (g.u?.uy || 0) === g._travel_previous_target.y)
                g._travel_previous_target = null;
            const nonInterruptingTravelMessage = (g._travel_dynamic_target
                && /^A mysterious force prevents .* from teleporting!$/.test(g._pending_message || ''))
                || (g._travel_noninterrupting_message
                    && g._pending_message === g._travel_noninterrupting_message);
            if (g._pending_message && !g._message_more && !nonInterruptingTravelMessage) {
                g._travel_keys = [];
                g._travel_dynamic_target = null;
                g._travel_noninterrupting_message = '';
                break;
            }
            if (!g._pending_message || g._pending_message !== g._travel_noninterrupting_message)
                g._travel_noninterrupting_message = '';
            if (g.context?.move) {
                g._pending_time_passed += g.context.move;
                g.context.move = 0;
            } else {
                g._travel_keys = [];
                g._travel_dynamic_target = null;
                g._travel_ignore_adjacent_stop = 0;
            }
        }
        if (!g._travel_keys?.length && !g._travel_dynamic_target) g._travel_ignore_adjacent_stop = 0;
        if (!g._pending_time_passed && g._confused_run_stop_roll) {
            g._confused_run_stop_roll = 0;
            rn2(5);
            g._run_steps_remaining = 0;
        }
        const resumeRunAfterQueuedDead = !!g._resume_run_after_queued_dead_more;
        if (!g._pending_time_passed && g._dismissed_more_this_command && !g._ignore_run_stop_after_more
            && !resumeRunAfterQueuedDead)
            g._run_steps_remaining = 0;
        if (!g._pending_time_passed
            && (!g._message_more || g._ignore_run_stop_after_more || !g._queued_messages_after_more?.length)
            && !g._run_pause_until_next_command
            && g._run_steps_remaining > 0) {

            const ignoreAdjacentStop = g._ignore_run_stop_after_more;
            const heroX = g.u?.ux || 0;
            const heroY = g.u?.uy || 0;
            const runDir = RUN_DIRECTIONS[g._run_key] || { dx: 0, dy: 0 };
            if (!ignoreAdjacentStop && (g.level?.monsters || []).some(mon =>
                !mon.pet && !mon.mpeaceful
                && (g.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT)
                && Math.max(Math.abs(mon.mx - heroX), Math.abs(mon.my - heroY)) <= 1
                && (g._run_mode !== 1 || (mon.mx === heroX + runDir.dx && mon.my === heroY + runDir.dy))
                && !(mon.data?.name === 'grid bug' && mon.mx !== heroX && mon.my !== heroY)
            )) {
                g._run_steps_remaining = 0;
                break;
            }
            g._run_steps_remaining--;
            g._running_continuation = 1;
            await rhack(g._run_key);
            g._ignore_run_stop_after_more = 0;
            if (g.context?.move) {
                g._pending_time_passed += g.context.move;
                g.context.move = 0;
            } else {
                g._run_steps_remaining = 0;
            }
        }
        if (!g._pending_time_passed && g._teleport_geometric_online_once)
            g._teleport_geometric_online_once = 0;
    }
    if (!g._pending_time_passed && !g._message_more && g._counted_repeat_interruptible)
        g._counted_repeat_interruptible = 0;
    if (g._stairs_arrival_message_after_time && (g._pending_message || g._message_more))
        g._stairs_arrival_message_after_time = '';
    if (g._stairs_arrival_message_after_time && !g._pending_time_passed) {
        const message = g._stairs_arrival_message_after_time;
        g._stairs_arrival_message_after_time = '';
        await pline(message);
        g._keep_pending_message = 1;
    }
    if (g._travel_finish_message && !(g._travel_keys?.length)) {
        const message = g._travel_finish_message;
        g._travel_finish_message = '';
        if (!g._pending_message && !g._message_more) {
            await pline(message);
            g._keep_pending_message = 1;
        }
    }
    if (g._prayer_energy_before_time != null && !g._pending_time_passed) {
        const energy = Math.min(g.u?.uenmax ?? Infinity, g._prayer_energy_before_time + 1);
        if (g.u && (g.u.uen ?? 0) > energy) g.u.uen = energy;
        g._prayer_energy_before_time = null;
    }
    if (g._travel_keep_message && !(g._travel_keys?.length)) {
        const message = g._travel_keep_message;
        g._travel_keep_message = '';
        if (!g._pending_message && !g._message_more) {
            await pline(message);
            g._keep_pending_message = 1;
        }
    }
    if (g._pet_inventory_run_resume && !g._pending_time_passed && !g._message_more)
        g._pet_inventory_run_resume = 0;
    if (g._clear_bullwhip_skip_after_time && !g._pending_time_passed) {
        g._clear_bullwhip_skip_after_time._bullwhip_skip_attack = 0;
        g._clear_bullwhip_skip_after_time = null;
    }
    if (g._queued_more_continue_monsters && g._message_more) {
        g._queued_more_continue_monsters = 0;
        if ((g.level?.monsters || []).some(mon => (mon.movement || 0) >= NORMAL_SPEED)) {
            g._continue_monsters_after_more = 1;
            g._pending_time_passed = Math.max(g._pending_time_passed || 0, 1);
            g._resume_time_after_more = 1;
        }
    } else if (g._queued_more_continue_monsters && !g._message_more) {
        g._queued_more_continue_monsters = 0;
    }
    g._running_continuation = 0;
    g._initial_run_command = 0;
	    g._process_time_with_more = g._message_more && g._continue_monsters_after_more
	        && !g._pet_inventory_resume && !g._monster_resume_index && !g._monster_resume_same_index
	        && !g._attack_resume_after_more && !g._pickup_resume_after_more
	        && !(g._queued_message_after_more && g._search_pending_count > 0) ? 1 : 0;
    g._dismissed_more_this_command = 0;
    g._resume_run_after_queued_dead_more = 0;
    if (g._message_more && !g._pending_message) g._message_more = 0;
    if (!g._message_more) g._more_prompt_hunger_done = 0;
    const staleMonsterMore = g._message_more && !g._pending_time_passed
        && !g._topline_after_more && !g._monster_resume_index
        && !g._attack_resume_after_more && !g._pickup_resume_after_more
        && !g._queued_monster_attacks_after_more?.length
        && /^The .+ (?:bites|stings|hits|misses)!/.test(g._pending_message || '');
    if (staleMonsterMore) g._message_more = 0;
    if (g.vision_full_recalc) {
        vision_recalc(0);
        g.vision_full_recalc = 0;
    }
    if (g._wipe_finish_after_time && !g._pending_time_passed) {
        g._wipe_finish_after_time = 0;
        g.u.blind = 0;
        for (const mon of g.level?.monsters || []) newsym(mon.mx, mon.my);
        await pline("You've got the glop off.  You can see again.");
        g._keep_pending_message = 1;
    }
    if (!g._message_more
        && g._queued_explore_lifesaving_message
        && g._pending_explore_lifesaving_message
        && /^OK, so you don't die\.  /.test(g._pending_message || '')) {
        g._message_more = 1;
        g._process_time_with_more = 0;
        g._keep_pending_message = 1;
    }
    if (!g._message_more
        && g._queued_explore_lifesaving_message
        && g._pending_explore_lifesaving_message) {
        if (g._pending_message === "OK, so you don't die.") {
            g._pending_message = `${g._pending_message}  ${g._queued_message_after_more}`;
            g._keep_pending_message = 1;
        } else if (!g._pending_message) {
            g._pending_message = g._queued_message_after_more;
            g._keep_pending_message = 1;
        }
        g._queued_message_after_more = '';
        g._queued_explore_lifesaving_message = 0;
    }
    if (g._clear_search_safety_message_next_flush && !g._keep_pending_message
        && !g._message_more && g._pending_message_is_search_safety_warning) {
        if (g._clear_safety_message_skip_flushes > 0) {
            g._clear_safety_message_skip_flushes--;
	        } else {
	            g._pending_message = '';
	            g._pending_message_is_search_safety_warning = 0;
	            g._clear_search_safety_message_next_flush = 0;
	        }
	    }
    g._hallu_refreshed_this_command = 0;
    if (g._hallu_refresh_after_expel) {
        g._hallu_refresh_after_expel = 0;
        g._display_hallucinated_redraw = 1;
        refreshHallucinatedMap();
        g._display_hallucinated_redraw = 0;
    }
    if (g._hallu_refresh_after_cold_effect) {
        g._hallu_refresh_after_cold_effect = 0;
        g._display_hallucinated_redraw = 1;
        refreshHallucinatedMap();
        g._display_hallucinated_redraw = 0;
    }
    if (g._hallu_refresh_after_level_teleport_move
        && (g.u?._statusSuffix || '').includes('Hallu')
        && !g._swallow_overlay_active
        && !g._overlay_lines) {
        if (g._skip_hallu_refresh_after_level_teleport_once) {
            g._skip_hallu_refresh_after_level_teleport_once = 0;
        } else {
            g._display_hallucinated_normal = 1;
            if (g._hallu_refresh_after_fullscreen_overlay) {
                g._hallu_refresh_after_fullscreen_overlay = 0;
                if (g.u?.warning) rn2_on_display_rng(5);
                rn2_on_display_rng(DISPLAY_MONSTER_GLYPHS.length);
                rn2_on_display_rng(DISPLAY_MONSTER_GLYPHS.length);
            }
            refreshHallucinatedMap();
            g._hallu_refreshed_this_command = 1;
            g._display_hallucinated_normal = 0;
	        }
	    }
    refreshWarningMonsters();
    const staleFumbleTargetMessage = /^(?:staircase up|staircase down)$/.test(g._pending_message || '');
    if ((!g._pending_message || staleFumbleTargetMessage)
        && g._last_fumble_turn_message && g._last_fumble_from_run) {
        g._pending_message = g._last_fumble_turn_message;
        g._keep_pending_message = 1;
        g._replayed_stale_fumble_message = 1;
    }
	    await bot();
    if (g._map_redraw_pending || g._pet_map_redraw_pending) {
        const skipPetRedraw = !g._map_redraw_pending
            && g._pet_map_redraw_pending
            && g._preserve_gas_spore_residue;
        g._map_redraw_pending = 0;
        g._pet_map_redraw_pending = 0;
        if (!g._message_more && !skipPetRedraw) {
            await docrt();
            g._preserve_gas_spore_residue = 0;
            g._gas_spore_residue_active = 0;
            g._gas_spore_residue_moved = 0;
            g._gas_spore_residue_was_visible = 0;
            g._gas_spore_residue_frames = 0;
            g._gas_spore_residue_mon = null;
        }
    }
    if (g._gas_spore_residue_clear_next_flush && g._gas_spore_residue_mon) {
        const mon = g._gas_spore_residue_mon;
        if ((g.level?.monsters || []).includes(mon)) newsym(mon.mx, mon.my);
        g._gas_spore_residue_clear_next_flush = 0;
        g._gas_spore_residue_active = 0;
        g._gas_spore_residue_moved = 0;
        g._gas_spore_residue_was_visible = 0;
        g._gas_spore_residue_frames = 0;
        g._gas_spore_residue_mon = null;
    }
    if (g._preserve_gas_spore_residue && g._gas_spore_residue_mon) {
        const mon = g._gas_spore_residue_mon;
        if ((g.level?.monsters || []).includes(mon)) {
            if (mon.mx !== g._gas_spore_residue_initial_x || mon.my !== g._gas_spore_residue_initial_y)
                g._gas_spore_residue_moved = 1;
            if (g.viz_array?.[mon.my]?.[mon.mx] & IN_SIGHT) {
                g._gas_spore_residue_visible_x = mon.mx;
                g._gas_spore_residue_visible_y = mon.my;
                g._gas_spore_residue_was_visible = 1;
                g._gas_spore_residue_active = 0;
            } else if (g._gas_spore_residue_moved && g._gas_spore_residue_was_visible) {
                g._gas_spore_residue_active = 1;
            }
            g._gas_spore_residue_x = mon.mx;
            g._gas_spore_residue_y = mon.my;
        }
    }
    if (g._preserve_gas_spore_residue && g._gas_spore_residue_active
        && !g._pending_message && !g._message_more && !g._queued_message_after_more
        && !g._queued_messages_after_more?.length) {
        const mon = g._gas_spore_residue_mon;
        if (mon && (g.level?.monsters || []).includes(mon)) newsym(mon.mx, mon.my);
        g._preserve_gas_spore_residue = 0;
        g._gas_spore_residue_active = 0;
        g._gas_spore_residue_moved = 0;
        g._gas_spore_residue_was_visible = 0;
        g._gas_spore_residue_frames = 0;
        g._gas_spore_residue_mon = null;
    }
    if (g._preserve_gas_spore_residue && g._gas_spore_residue_active) {
        const mon = g._gas_spore_residue_mon;
        if ((g._gas_spore_residue_frames || 0) >= 2) {
            g._preserve_gas_spore_residue = 0;
            g._gas_spore_residue_active = 0;
            g._gas_spore_residue_clear_next_flush = 1;
        } else if (mon && (g.level?.monsters || []).includes(mon)) {
            const ch = mon.data?.glyph || mon.data?.mlet?.[0] || '?';
            show_glyph_cell(mon.mx, mon.my, ch, mon.data?.color ?? CLR_WHITE, false);
            g._gas_spore_residue_frames = (g._gas_spore_residue_frames || 0) + 1;
        }
    }
	    await flush_screen(1);
    const combinedRunFumbleNoise = g._last_fumble_from_run && !g._message_more
        && g._last_fumble_turn_message
        && (g._pending_message || '').startsWith(`${g._last_fumble_turn_message}  You hear some noises`);
    const combinedRunFumbleMessage = g._last_fumble_from_run && !g._message_more
        && g._last_fumble_turn_message
        && g._pending_message !== g._last_fumble_turn_message
        && (g._pending_message || '').includes(g._last_fumble_turn_message);
    if (combinedRunFumbleNoise || combinedRunFumbleMessage) {
        g._last_fumble_turn_message = '';
        g._last_fumble_from_run = 0;
        g._last_fumble_keep_flushes = 0;
    } else if (g._last_fumble_from_run && !g._message_more && g._pending_message === g._last_fumble_turn_message) {
        g._last_fumble_keep_flushes = Math.max(0, (g._last_fumble_keep_flushes ?? 1) - 1);
        if (g._last_fumble_keep_flushes === 1)
            g._clear_fumble_after_rhack = {
                message: g._last_fumble_turn_message,
                move: g._last_fumble_turn_move,
            };
    } else if (g._replayed_stale_fumble_message) {
        const replayedMessage = g._last_fumble_turn_message;
        g._replayed_stale_fumble_message = 0;
        if (!g._message_more && g._pending_message === replayedMessage)
            g._pending_message = '';
        g._last_fumble_turn_message = '';
        g._last_fumble_from_run = 0;
        g._last_fumble_keep_flushes = 0;
        g._keep_pending_message = 0;
    }
    if (g._ball_drag_travel_delay_restore > 0) {
        g._ball_drag_travel_delay_restore--;
        if (!g._ball_drag_travel_delay_restore && g.u)
            g.u.umovement = (g.u.umovement || 0) + NORMAL_SPEED;
    }
	    await rhack(0);
    if (g._clear_fumble_after_rhack) {
        const { message, move } = g._clear_fumble_after_rhack;
        g._clear_fumble_after_rhack = null;
        if (g._last_fumble_turn_move === move && g._last_fumble_keep_flushes === 1) {
            const clearedFumbleMessage = !g._message_more && g._pending_message === message;
            if (clearedFumbleMessage)
                g._pending_message = '';
            g._replayed_stale_fumble_message = 0;
            g._last_fumble_turn_message = '';
            g._last_fumble_from_run = 0;
            g._last_fumble_keep_flushes = 0;
            if (clearedFumbleMessage) {
                g._keep_pending_message = 0;
            }
            g._defer_fumble_exerchk_once = 1;
            g._fumble_turn_message_pending = 0;
            g._pending_fumble_turn_message = 0;
            g._pending_fumble_turn_message_starts = 0;
        }
    }
    if (g._prayer_process_time_now) {
        const prayerTurns = g.context?.move || 3;
        g._prayer_process_time_now = 0;
        if (!g.u?.umoved && g.u) {
            g.u.ux0 = g.u.ux;
            g.u.uy0 = g.u.uy;
        }
        g._pending_time_passed = (g._pending_time_passed || 0) + prayerTurns;
        g.context.move = 0;
        g._process_command_time_now = 0;
        g._process_time_with_more = 1;
        return;
    }
    g._prayer_process_time_now = 0;
    g._hallu_refreshed_this_command = 0;
    if (g._deferred_level_goto && !g._message_more) {
        const { targetLevel, options } = g._deferred_level_goto;
        g._deferred_level_goto = null;
        await finishLevelTeleport(targetLevel, options || {});
    }

    if (g._replayed_stale_fumble_message) {
        g._replayed_stale_fumble_message = 0;
        g._last_fumble_turn_message = '';
        g._last_fumble_from_run = 0;
        g._last_fumble_keep_flushes = 0;
    }
	    if (g._keep_pending_message) g._keep_pending_message = 0;
    else if (!g._message_more) {
        g._pending_message = '';
        g._pending_explore_lifesaving_message = 0;
        g._pending_message_is_search_safety_warning = 0;
        g._clear_search_safety_message_next_flush = 0;
        g._pending_rotten_food_eating_message = 0;
        g._pending_prayer_finish_message = 0;
        g._pending_force_lock_start_message = 0;
        g._pending_fumble_turn_message = 0;
        g._pending_fumble_turn_message_starts = 0;
        g._pending_fumble_message_roll = 0;
        g._pending_fumble_after_monster_noise_message = 0;
        g._pending_starts_monster_noise_message = 0;
        g._pending_monster_noise_message = 0;
        g._pending_monster_noise_far = 0;
        if (g._replayed_stale_fumble_message) {
            g._replayed_stale_fumble_message = 0;
            g._last_fumble_turn_message = '';
            g._last_fumble_from_run = 0;
        } else if (!g._last_fumble_from_run) {
            g._last_fumble_turn_message = '';
        }
    }
    if (!g._pending_message && !g._message_more) {
        g._fumble_turn_message_pending = 0;
        g._topline_after_more_fumble_turn_message = 0;
        g._topline_after_more_fumble_turn_message_starts = 0;
        g._topline_after_more_fumble_message_roll = 0;
    }
    maybePromptQueuedPickDigApply();

    if (g.context?.move) {
        if (!g.u?.umoved && g.u) {
            g.u.ux0 = g.u.ux;
            g.u.uy0 = g.u.uy;
        }
        g._pending_time_passed = (g._pending_time_passed || 0) + g.context.move;
        g.context.move = 0;
    }
    if (g._process_deferred_context_now) {
        g._process_deferred_context_now = 0;
        if (g._pending_time_passed && !g._message_more)
            return await moveloop_core();
    }
    if (g._queued_fire_breath_process_now && g._process_command_time_now
        && g._pending_time_passed && g._process_time_with_more) {
        g._queued_fire_breath_process_now = 0;
        g._process_command_time_now = 0;
        return await moveloop_core();
    }
    g._queued_fire_breath_process_now = 0;
    if (g.u?.uswallow && g._pending_time_passed && !g._message_more)
        return await moveloop_core();
}

export async function moveloop(_resuming) {
    await docrt();
    await flush_screen(1);

    for (;;) {
        await moveloop_core();
        if (game.program_state?.gameover) break;
    }
}
