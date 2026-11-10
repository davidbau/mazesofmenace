import {C} from './c-runtime.js';

/* NetHack 5.0	role.c	$NHDT-Date: 1737607158 2025/01/22 20:39:18 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.107 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985-1999. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */


/*** Table of all roles ***/
/* According to AD&D, HD for some classes (ex. Wizard) should be smaller
 * (4-sided for wizards).  But this is not AD&D, and using the AD&D
 * rule here produces an unplayable character.  Thus I have used a minimum
 * of an 10-sided hit die for everything.  Another AD&D change: wizards get
 * a minimum strength of 4 since without one you can't teleport or cast
 * spells. --KAA
 *
 * As the wizard has been updated (wizard patch 5 jun '96) their HD can be
 * brought closer into line with AD&D. This forces wizards to use magic more
 * and distance themselves from their attackers. --LSZ
 *
 * With the introduction of races, some hit points and energy
 * has been reallocated for each race.  The values assigned
 * to the roles has been reduced by the amount allocated to
 * humans.  --KMH
 *
 * God names use a leading underscore to flag goddesses.
 */

/* NUM_ROLES is defined in hack.h */

export const roles = [
[["Archeologist",
0],
[["Digger",
0],
["Field Worker",
0],
["Investigator",
0],
["Exhumer",
0],
["Excavator",
0],
["Spelunker",
0],
["Speleologist",
0],
["Collector",
0],
["Curator",
0]],
"Quetzalcoatl",
"Camaxtli",
"Huhetotl",
/* Central American */ "Arc",
"the College of Archeology",
"the Tomb of the Toltec Kings",
{c:"PM_ARCHEOLOGIST"},
{c:"NON_PM"},
{c:"PM_LORD_CARNARVON"},
{c:"PM_STUDENT"},
{c:"PM_MINION_OF_HUHETOTL"},
{c:"NON_PM"},
{c:"PM_HUMAN_MUMMY"},
{c:"S_SNAKE"},
{c:"S_MUMMY"},
{c:"ART_ORB_OF_DETECTION"},
{c:"MH_HUMAN | MH_DWARF | MH_GNOME | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL\n          | ROLE_NEUTRAL"},
/* Str Int Wis Dex Con Cha */
      [7,
10,
10,
7,
7,
7],
[20,
20,
20,
10,
20,
10],
/* Init   Lower  Higher */
      [11,
0,
0,
8,
1,
0],
/* Hit points */
      [1,
0,
0,
1,
0,
1],
14,
/* Energy */ 10,
5,
0,
2,
10,
{c:"A_INT"},
{c:"SPE_MAGIC_MAPPING"},
-4],
[["Barbarian",
0],
[["Plunderer",
"Plunderess"],
["Pillager",
0],
["Bandit",
0],
["Brigand",
0],
["Raider",
0],
["Reaver",
0],
["Slayer",
0],
["Chieftain",
"Chieftainess"],
["Conqueror",
"Conqueress"]],
"Mitra",
"Crom",
"Set",
/* Hyborian */ "Bar",
"the Camp of the Duali Tribe",
"the Duali Oasis",
{c:"PM_BARBARIAN"},
{c:"NON_PM"},
{c:"PM_PELIAS"},
{c:"PM_CHIEFTAIN"},
{c:"PM_THOTH_AMON"},
{c:"PM_OGRE"},
{c:"PM_TROLL"},
{c:"S_OGRE"},
{c:"S_TROLL"},
{c:"ART_HEART_OF_AHRIMAN"},
{c:"MH_HUMAN | MH_ORC | ROLE_MALE | ROLE_FEMALE | ROLE_NEUTRAL\n          | ROLE_CHAOTIC"},
/* Str Int Wis Dex Con Cha */
      [16,
7,
7,
15,
16,
6],
[30,
6,
7,
20,
30,
7],
/* Init   Lower  Higher */
      [14,
0,
0,
10,
2,
0],
/* Hit points */
      [1,
0,
0,
1,
0,
1],
10,
/* Energy */ 10,
14,
0,
0,
8,
{c:"A_INT"},
{c:"SPE_HASTE_SELF"},
-4],
[["Caveman",
"Cavewoman"],
[["Troglodyte",
0],
["Aborigine",
0],
["Wanderer",
0],
["Vagrant",
0],
["Wayfarer",
0],
["Roamer",
0],
["Nomad",
0],
["Rover",
0],
["Pioneer",
0]],
"Anu",
"_Ishtar",
"Anshar",
/* Babylonian */ "Cav",
"the Caves of the Ancestors",
"the Dragon's Lair",
{c:"PM_CAVE_DWELLER"},
{c:"PM_LITTLE_DOG"},
{c:"PM_SHAMAN_KARNOV"},
{c:"PM_NEANDERTHAL"},
{c:"PM_CHROMATIC_DRAGON"},
{c:"PM_BUGBEAR"},
{c:"PM_HILL_GIANT"},
{c:"S_HUMANOID"},
{c:"S_GIANT"},
{c:"ART_SCEPTRE_OF_MIGHT"},
{c:"MH_HUMAN | MH_DWARF | MH_GNOME | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL\n          | ROLE_NEUTRAL"},
/* Str Int Wis Dex Con Cha */
      [10,
7,
7,
7,
8,
6],
[30,
6,
7,
20,
30,
7],
/* Init   Lower  Higher */
      [14,
0,
0,
8,
2,
0],
/* Hit points */
      [1,
0,
0,
1,
0,
1],
10,
/* Energy */ 0,
12,
0,
1,
8,
{c:"A_INT"},
{c:"SPE_DIG"},
-4],
[["Healer",
0],
[["Rhizotomist",
0],
["Empiric",
0],
["Embalmer",
0],
["Dresser",
0],
["Medicus ossium",
"Medica ossium"],
["Herbalist",
0],
["Magister",
"Magistra"],
["Physician",
0],
["Chirurgeon",
0]],
"_Athena",
"Hermes",
"Poseidon",
/* Greek */ "Hea",
"the Temple of Epidaurus",
"the Temple of Coeus",
{c:"PM_HEALER"},
{c:"NON_PM"},
{c:"PM_HIPPOCRATES"},
{c:"PM_ATTENDANT"},
{c:"PM_CYCLOPS"},
{c:"PM_GIANT_RAT"},
{c:"PM_SNAKE"},
{c:"S_RODENT"},
{c:"S_YETI"},
{c:"ART_STAFF_OF_AESCULAPIUS"},
{c:"MH_HUMAN | MH_GNOME | ROLE_MALE | ROLE_FEMALE | ROLE_NEUTRAL"},
/* Str Int Wis Dex Con Cha */
      [7,
7,
13,
7,
11,
16],
[15,
20,
20,
15,
25,
5],
/* Init   Lower  Higher */
      [11,
0,
0,
8,
1,
0],
/* Hit points */
      [1,
4,
0,
1,
0,
2],
20,
/* Energy */ 10,
3,
-3,
2,
10,
{c:"A_WIS"},
{c:"SPE_CURE_SICKNESS"},
-4],
[["Knight",
0],
[["Gallant",
0],
["Esquire",
0],
["Bachelor",
0],
["Sergeant",
0],
["Knight",
0],
["Banneret",
0],
["Chevalier",
"Chevaliere"],
["Seignieur",
"Dame"],
["Paladin",
0]],
"Lugh",
"_Brigit",
"Manannan Mac Lir",
/* Celtic */ "Kni",
"Camelot Castle",
"the Isle of Glass",
{c:"PM_KNIGHT"},
{c:"PM_PONY"},
{c:"PM_KING_ARTHUR"},
{c:"PM_PAGE"},
{c:"PM_IXOTH"},
{c:"PM_QUASIT"},
{c:"PM_OCHRE_JELLY"},
{c:"S_IMP"},
{c:"S_JELLY"},
{c:"ART_MAGIC_MIRROR_OF_MERLIN"},
{c:"MH_HUMAN | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL"},
/* Str Int Wis Dex Con Cha */
      [13,
7,
14,
8,
10,
17],
[30,
15,
15,
10,
20,
10],
/* Init   Lower  Higher */
      [14,
0,
0,
8,
2,
0],
/* Hit points */
      [1,
4,
0,
1,
0,
2],
10,
/* Energy */ 10,
8,
-2,
0,
9,
{c:"A_WIS"},
{c:"SPE_TURN_UNDEAD"},
-4],
[["Monk",
0],
[["Candidate",
0],
["Novice",
0],
["Initiate",
0],
["Student of Stones",
0],
["Student of Waters",
0],
["Student of Metals",
0],
["Student of Winds",
0],
["Student of Fire",
0],
["Master",
0]],
"Shan Lai Ching",
"Chih Sung-tzu",
"Huan Ti",
/* Chinese */ "Mon",
"the Monastery of Chan-Sune",
"the Monastery of the Earth-Lord",
{c:"PM_MONK"},
{c:"NON_PM"},
{c:"PM_GRAND_MASTER"},
{c:"PM_ABBOT"},
{c:"PM_MASTER_KAEN"},
{c:"PM_EARTH_ELEMENTAL"},
{c:"PM_XORN"},
{c:"S_ELEMENTAL"},
{c:"S_XORN"},
{c:"ART_EYES_OF_THE_OVERWORLD"},
{c:"MH_HUMAN | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL | ROLE_NEUTRAL\n          | ROLE_CHAOTIC"},
/* Str Int Wis Dex Con Cha */
      [10,
7,
8,
8,
7,
7],
[25,
10,
20,
20,
15,
10],
/* Init   Lower  Higher */
      [12,
0,
0,
8,
1,
0],
/* Hit points */
      [2,
2,
0,
2,
0,
2],
10,
/* Energy */ 10,
8,
-2,
2,
20,
{c:"A_WIS"},
{c:"SPE_RESTORE_ABILITY"},
-4],
[["Priest",
"Priestess"],
[["Aspirant",
0],
["Acolyte",
0],
["Adept",
0],
["Priest",
"Priestess"],
["Curate",
0],
["Canon",
"Canoness"],
["Lama",
0],
["Patriarch",
"Matriarch"],
["High Priest",
"High Priestess"]],
0,
0,
0,
/* deities from a randomly chosen other role will be used */ "Pri",
"the Great Temple",
"the Temple of Nalzok",
{c:"PM_CLERIC"},
{c:"NON_PM"},
{c:"PM_ARCH_PRIEST"},
{c:"PM_ACOLYTE"},
{c:"PM_NALZOK"},
{c:"PM_HUMAN_ZOMBIE"},
{c:"PM_WRAITH"},
{c:"S_ZOMBIE"},
{c:"S_WRAITH"},
{c:"ART_MITRE_OF_HOLINESS"},
{c:"MH_HUMAN | MH_ELF | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL | ROLE_NEUTRAL\n          | ROLE_CHAOTIC"},
/* Str Int Wis Dex Con Cha */
      [7,
7,
10,
7,
7,
7],
[15,
10,
30,
15,
20,
10],
/* Init   Lower  Higher */
      [12,
0,
0,
8,
1,
0],
/* Hit points */
      [4,
3,
0,
2,
0,
2],
10,
/* Energy */ 0,
3,
-2,
2,
10,
{c:"A_WIS"},
{c:"SPE_REMOVE_CURSE"},
-4],
/* Note:  Rogue precedes Ranger so that use of `-R' on the command line
       retains its traditional meaning. */
    [["Rogue",
0],
[["Footpad",
0],
["Cutpurse",
0],
["Rogue",
0],
["Pilferer",
0],
["Robber",
0],
["Burglar",
0],
["Filcher",
0],
["Magsman",
"Magswoman"],
["Thief",
0]],
"Issek",
"Mog",
"Kos",
/* Nehwon */ "Rog",
"the Thieves' Guild Hall",
"the Assassins' Guild Hall",
{c:"PM_ROGUE"},
{c:"NON_PM"},
{c:"PM_MASTER_OF_THIEVES"},
{c:"PM_THUG"},
{c:"PM_MASTER_ASSASSIN"},
{c:"PM_LEPRECHAUN"},
{c:"PM_GUARDIAN_NAGA"},
{c:"S_NYMPH"},
{c:"S_NAGA"},
{c:"ART_MASTER_KEY_OF_THIEVERY"},
{c:"MH_HUMAN | MH_ORC | ROLE_MALE | ROLE_FEMALE | ROLE_CHAOTIC"},
/* Str Int Wis Dex Con Cha */
      [7,
7,
7,
10,
7,
6],
[20,
10,
10,
30,
20,
10],
/* Init   Lower  Higher */
      [10,
0,
0,
8,
1,
0],
/* Hit points */
      [1,
0,
0,
1,
0,
1],
11,
/* Energy */ 10,
8,
0,
1,
9,
{c:"A_INT"},
{c:"SPE_DETECT_TREASURE"},
-4],
[["Ranger",
0],
[["Tenderfoot",
0],
["Lookout",
0],
["Trailblazer",
0],
["Reconnoiterer",
"Reconnoiteress"],
["Scout",
0],
["Arbalester",
0],
/* One skilled at crossbows */
        ["Archer",
0],
["Sharpshooter",
0],
["Marksman",
"Markswoman"]],
"Mercury",
"_Venus",
"Mars",
/* Roman/planets */ "Ran",
"Orion's camp",
"the cave of the wumpus",
{c:"PM_RANGER"},
/* Orion & canis major */ {c:"PM_LITTLE_DOG"},
{c:"PM_ORION"},
{c:"PM_HUNTER"},
{c:"PM_SCORPIUS"},
{c:"PM_FOREST_CENTAUR"},
{c:"PM_SCORPION"},
{c:"S_CENTAUR"},
{c:"S_SPIDER"},
{c:"ART_LONGBOW_OF_DIANA"},
{c:"MH_HUMAN | MH_ELF | MH_GNOME | MH_ORC | ROLE_MALE | ROLE_FEMALE\n          | ROLE_NEUTRAL | ROLE_CHAOTIC"},
/* Str Int Wis Dex Con Cha */
      [13,
13,
13,
9,
13,
7],
[30,
10,
10,
20,
20,
10],
/* Init   Lower  Higher */
      [13,
0,
0,
6,
1,
0],
/* Hit points */
      [1,
0,
0,
1,
0,
1],
12,
/* Energy */ 10,
9,
2,
1,
10,
{c:"A_INT"},
{c:"SPE_INVISIBILITY"},
-4],
[["Samurai",
0],
[["Hatamoto",
0],
/* Banner Knight */
        ["Ronin",
0],
/* no allegiance */
        ["Ninja",
"Kunoichi"],
/* secret society */
        ["Joshu",
0],
/* heads a castle */
        ["Ryoshu",
0],
/* has a territory */
        ["Kokushu",
0],
/* heads a province */
        ["Daimyo",
0],
/* a samurai lord */
        ["Kuge",
0],
/* Noble of the Court */
        ["Shogun",
0]],
/* supreme commander, warlord */ "_Amaterasu Omikami",
"Raijin",
"Susanowo",
/* Japanese */ "Sam",
"the Castle of the Taro Clan",
"the Shogun's Castle",
{c:"PM_SAMURAI"},
{c:"PM_LITTLE_DOG"},
{c:"PM_LORD_SATO"},
{c:"PM_ROSHI"},
{c:"PM_ASHIKAGA_TAKAUJI"},
{c:"PM_WOLF"},
{c:"PM_STALKER"},
{c:"S_DOG"},
{c:"S_ELEMENTAL"},
{c:"ART_TSURUGI_OF_MURAMASA"},
{c:"MH_HUMAN | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL"},
/* Str Int Wis Dex Con Cha */
      [10,
8,
7,
10,
17,
6],
[30,
10,
8,
30,
14,
8],
/* Init   Lower  Higher */
      [13,
0,
0,
8,
1,
0],
/* Hit points */
      [1,
0,
0,
1,
0,
1],
11,
/* Energy */ 10,
10,
0,
0,
8,
{c:"A_INT"},
{c:"SPE_CLAIRVOYANCE"},
-4],
[["Tourist",
0],
[["Rambler",
0],
["Sightseer",
0],
["Excursionist",
0],
["Peregrinator",
"Peregrinatrix"],
["Traveler",
0],
["Journeyer",
0],
["Voyager",
0],
["Explorer",
0],
["Adventurer",
0]],
"Blind Io",
"_The Lady",
"Offler",
/* Discworld */ "Tou",
"Ankh-Morpork",
"the Thieves' Guild Hall",
{c:"PM_TOURIST"},
{c:"NON_PM"},
{c:"PM_TWOFLOWER"},
{c:"PM_GUIDE"},
{c:"PM_MASTER_OF_THIEVES"},
{c:"PM_GIANT_SPIDER"},
{c:"PM_FOREST_CENTAUR"},
{c:"S_SPIDER"},
{c:"S_CENTAUR"},
{c:"ART_YENDORIAN_EXPRESS_CARD"},
{c:"MH_HUMAN | ROLE_MALE | ROLE_FEMALE | ROLE_NEUTRAL"},
/* Str Int Wis Dex Con Cha */
      [7,
10,
6,
7,
7,
10],
[15,
10,
10,
15,
30,
20],
/* Init   Lower  Higher */
      [8,
0,
0,
8,
0,
0],
/* Hit points */
      [1,
0,
0,
1,
0,
1],
14,
/* Energy */ 0,
5,
1,
2,
10,
{c:"A_INT"},
{c:"SPE_CHARM_MONSTER"},
-4],
[["Valkyrie",
0],
[["Stripling",
0],
["Skirmisher",
0],
["Fighter",
0],
["Man-at-arms",
"Woman-at-arms"],
["Warrior",
0],
["Swashbuckler",
0],
["Hero",
"Heroine"],
["Champion",
0],
["Lord",
"Lady"]],
"Tyr",
"Odin",
"Loki",
/* Norse */ "Val",
"the Shrine of Destiny",
"the cave of Surtur",
{c:"PM_VALKYRIE"},
/*PM_WINTER_WOLF_CUB*/ {c:"NON_PM"},
{c:"PM_NORN"},
{c:"PM_WARRIOR"},
{c:"PM_LORD_SURTUR"},
{c:"PM_FIRE_ANT"},
{c:"PM_FIRE_GIANT"},
{c:"S_ANT"},
{c:"S_GIANT"},
{c:"ART_ORB_OF_FATE"},
{c:"MH_HUMAN | MH_DWARF | ROLE_FEMALE | ROLE_LAWFUL | ROLE_NEUTRAL"},
/* Str Int Wis Dex Con Cha */
      [10,
7,
7,
7,
10,
7],
[30,
6,
7,
20,
30,
7],
/* Init   Lower  Higher */
      [14,
0,
0,
8,
2,
0],
/* Hit points */
      [1,
0,
0,
1,
0,
1],
10,
/* Energy */ 0,
10,
-2,
0,
9,
{c:"A_WIS"},
{c:"SPE_CONE_OF_COLD"},
-4],
[["Wizard",
0],
[["Evoker",
0],
["Conjurer",
0],
["Thaumaturge",
0],
["Magician",
0],
["Enchanter",
"Enchantress"],
["Sorcerer",
"Sorceress"],
["Necromancer",
0],
["Wizard",
0],
["Mage",
0]],
"Ptah",
"Thoth",
"Anhur",
/* Egyptian */ "Wiz",
"the Lonely Tower",
"the Tower of Darkness",
{c:"PM_WIZARD"},
{c:"PM_KITTEN"},
{c:"PM_NEFERET_THE_GREEN"},
{c:"PM_APPRENTICE"},
{c:"PM_DARK_ONE"},
{c:"PM_VAMPIRE_BAT"},
{c:"PM_XORN"},
{c:"S_BAT"},
{c:"S_WRAITH"},
{c:"ART_EYE_OF_THE_AETHIOPICA"},
{c:"MH_HUMAN | MH_ELF | MH_GNOME | MH_ORC | ROLE_MALE | ROLE_FEMALE\n          | ROLE_NEUTRAL | ROLE_CHAOTIC"},
/* Str Int Wis Dex Con Cha */
      [7,
10,
7,
7,
7,
7],
[10,
30,
10,
20,
20,
10],
/* Init   Lower  Higher */
      [10,
0,
0,
8,
1,
0],
/* Hit points */
      [4,
3,
0,
2,
0,
3],
12,
/* Energy */ 0,
1,
0,
3,
10,
{c:"A_INT"},
{c:"SPE_MAGIC_MISSILE"},
-4],
/* Array terminator */
    
    [/* role name, set of rank names */        
      [0,
0],
[[0,
0]],
/* strings: pantheon deity names */ 0,
0,
0,
/* file code, quest home+goal names */ 0,
0,
0,
/* indices: base mon type, pet */ {c:"NON_PM"},
{c:"NON_PM"},
/* quest leader, guardians, nemesis */ {c:"NON_PM"},
{c:"NON_PM"},
{c:"NON_PM"},
/* quest enemy types (index, symbol) */ {c:"NON_PM"},
{c:"NON_PM"},
0,
0,
/* quest artifact object index */ {c:"STRANGE_OBJECT"},
/* Bitmasks */ 0,
/* Attributes */                          
      [0],
[0],
[0],
[0],
0,
0,
/* spell statistics */ 0,
0,
0,
0,
0,
0,
0]
];

/* Table of all races */

/* NUM_RACES is defined in hack.h */
export const races = [
["human",
"human",
"humanity",
"Hum",
["man",
"woman"],
{c:"PM_HUMAN"},
{c:"PM_HUMAN_MUMMY"},
{c:"PM_HUMAN_ZOMBIE"},
{c:"MH_HUMAN | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL | ROLE_NEUTRAL\n            | ROLE_CHAOTIC"},
{c:"MH_HUMAN"},
0,
{c:"MH_GNOME | MH_ORC"},
/*    Str     Int Wis Dex Con Cha */
        [3,
3,
3,
3,
3,
3],
[{c:"STR18(100)"},
18,
18,
18,
18,
18],
/* Init   Lower  Higher */
        [2,
0,
0,
2,
1,
0],
/* Hit points */
        [1,
0,
2,
0,
2,
0]  /* Energy */],
["elf",
"elven",
"elvenkind",
"Elf",
[0,
0],
{c:"PM_ELF"},
{c:"PM_ELF_MUMMY"},
{c:"PM_ELF_ZOMBIE"},
{c:"MH_ELF | ROLE_MALE | ROLE_FEMALE | ROLE_CHAOTIC"},
{c:"MH_ELF"},
{c:"MH_ELF"},
{c:"MH_ORC"},
/*  Str    Int Wis Dex Con Cha */
        [3,
3,
3,
3,
3,
3],
[18,
20,
20,
18,
16,
18],
/* Init   Lower  Higher */
        [1,
0,
0,
1,
1,
0],
/* Hit points */
        [2,
0,
3,
0,
3,
0]  /* Energy */],
["dwarf",
"dwarven",
"dwarvenkind",
"Dwa",
[0,
0],
{c:"PM_DWARF"},
{c:"PM_DWARF_MUMMY"},
{c:"PM_DWARF_ZOMBIE"},
{c:"MH_DWARF | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL"},
{c:"MH_DWARF"},
{c:"MH_DWARF | MH_GNOME"},
{c:"MH_ORC"},
/*    Str     Int Wis Dex Con Cha */
        [3,
3,
3,
3,
3,
3],
[{c:"STR18(100)"},
16,
16,
20,
20,
16],
/* Init   Lower  Higher */
        [4,
0,
0,
3,
2,
0],
/* Hit points */
        [0,
0,
0,
0,
0,
0]  /* Energy */],
["gnome",
"gnomish",
"gnomehood",
"Gno",
[0,
0],
{c:"PM_GNOME"},
{c:"PM_GNOME_MUMMY"},
{c:"PM_GNOME_ZOMBIE"},
{c:"MH_GNOME | ROLE_MALE | ROLE_FEMALE | ROLE_NEUTRAL"},
{c:"MH_GNOME"},
{c:"MH_DWARF | MH_GNOME"},
{c:"MH_HUMAN"},
/*  Str    Int Wis Dex Con Cha */
        [3,
3,
3,
3,
3,
3],
[{c:"STR18(50)"},
19,
18,
18,
18,
18],
/* Init   Lower  Higher */
        [1,
0,
0,
1,
0,
0],
/* Hit points */
        [2,
0,
2,
0,
2,
0]  /* Energy */],
["orc",
"orcish",
"orcdom",
"Orc",
[0,
0],
{c:"PM_ORC"},
{c:"PM_ORC_MUMMY"},
{c:"PM_ORC_ZOMBIE"},
{c:"MH_ORC | ROLE_MALE | ROLE_FEMALE | ROLE_CHAOTIC"},
{c:"MH_ORC"},
0,
{c:"MH_HUMAN | MH_ELF | MH_DWARF"},
/*  Str    Int Wis Dex Con Cha */
        [3,
3,
3,
3,
3,
3],
[{c:"STR18(50)"},
16,
16,
18,
18,
16],
/* Init   Lower  Higher */
        [1,
0,
0,
1,
0,
0],
/* Hit points */
        [1,
0,
1,
0,
1,
0]  /* Energy */],
/* Array terminator */
    
    [/* strings */ 0,
0,
0,
0,
[0,
0],
/* Indices: base race, mummy, zombie */ {c:"NON_PM"},
{c:"NON_PM"},
{c:"NON_PM"},
/* Bitmasks */ 0,
0,
0,
0,
/* Characteristic limits */               
      [0],
[0],
/* Level change HP and Pw adjustments */  
      [0],
[0]]
];

/* Table of all genders */
export const genders = [
["male",
"he",
"him",
"his",
"Mal",
{c:"ROLE_MALE"}],
["female",
"she",
"her",
"her",
"Fem",
{c:"ROLE_FEMALE"}],
["neuter",
"it",
"it",
"its",
"Ntr",
{c:"ROLE_NEUTER"}],
/* used by pronoun_gender() when hallucinating */
    ["group",
"they",
"them",
"their",
"Grp",
0]
];

/* Table of all alignments */
export const aligns = [
["law",
"lawful",
"Law",
{c:"ROLE_LAWFUL"},
{c:"A_LAWFUL"}],
["balance",
"neutral",
"Neu",
{c:"ROLE_NEUTRAL"},
{c:"A_NEUTRAL"}],
["chaos",
"chaotic",
"Cha",
{c:"ROLE_CHAOTIC"},
{c:"A_CHAOTIC"}],
["evil",
"unaligned",
"Una",
0,
{c:"A_NONE"}]
];


/* used by str2XXX() */
const randomstr = "random";

export function validrole(rolenum)
{
    rolenum = C.int(rolenum);
    return C.boolean(C.IndexOkT(rolenum, C.roles));
}

export function randrole(for_display)
{
    for_display = C.boolean(for_display);
    let res = C.SIZE(C.roles) - 1;

    if (for_display)
        res = C.rn2_on_display_rng(res);
    else
        res = C.rn2(res, 726, "randrole");
    return res;
}

export function randrole_filtered()
{
    let i, n = 0; const set = new Int32Array(C.SIZE(C.roles));

    /* this doesn't rule out impossible combinations but attempts to
       honor all the filter masks */
    for (i = 0; i < C.SIZE(C.roles) - 1; ++i) /* -1: avoid terminating element */
        if (ok_role(i, C.ROLE_NONE, C.ROLE_NONE, C.ROLE_NONE)
            && ok_race(i, C.ROLE_RANDOM, C.ROLE_NONE, C.ROLE_NONE)
            && ok_gend(i, C.ROLE_NONE, C.ROLE_RANDOM, C.ROLE_NONE)
            && ok_align(i, C.ROLE_NONE, C.ROLE_NONE, C.ROLE_RANDOM))
            set[n++] = i;
    return n ? set[C.rn2(n, 743, "randrole_filtered")] : randrole(0);
}

export function str2role(str)
{
    let i, len;

    /* Is str valid? */
    if (!str || !C.loadChar(str + (0)))
        return C.ROLE_NONE;

    /* Match as much of str as is provided */
    len = C.Strlen(str, 0);
    for (i = 0; C.roles[i].name.m; i++) {
        /* Does it match the male name? */
        if (!C.strncmpi(str, C.roles[i].name.m, len))
            return i;
        /* Or the female name? */
        if (C.roles[i].name.f && !C.strncmpi(str, C.roles[i].name.f, len))
            return i;
        /* Or the filecode? */
        if (!C.strcmpi(str, C.roles[i].filecode))
            return i;
    }

    if ((len == 1 && (C.loadChar(str) == '*'.charCodeAt(0) || C.loadChar(str) == '@'.charCodeAt(0)))
        || !C.strncmpi(str, randomstr, len))
        return C.ROLE_RANDOM;

    /* Couldn't find anything appropriate */
    return C.ROLE_NONE;
}

export function validrace(rolenum, racenum)
{
    rolenum = C.int(rolenum);
    racenum = C.int(racenum);
    /* Assumes validrole */
    return C.boolean(Boolean(C.IndexOkT(racenum, C.races)
                      && (C.roles[rolenum].allow & C.races[racenum].allow
                          & C.ROLE_RACEMASK)));
}

export function randrace(rolenum)
{
    rolenum = C.int(rolenum);
    let i, n = 0;

    /* Count the number of valid races */
    for (i = 0; C.races[i].noun; i++)
        if (C.roles[rolenum].allow & C.races[i].allow & C.ROLE_RACEMASK)
            n++;

    /* Pick a random race */
    /* Use a factor of 100 in case of bad random number generators */
    if (n)
        n = Math.trunc(C.rn2(n * 100, 799, "randrace") / 100);
    for (i = 0; C.races[i].noun; i++)
        if (C.roles[rolenum].allow & C.races[i].allow & C.ROLE_RACEMASK) {
            if (n)
                n--;
            else
                return i;
        }

    /* This role has no permitted races? */
    return C.rn2(C.SIZE(C.races) - 1, 809, "randrace");
}

export function str2race(str)
{
    let i, len;

    /* Is str valid? */
    if (!str || !C.loadChar(str + (0)))
        return C.ROLE_NONE;

    /* Match as much of str as is provided */
    len = C.Strlen(str, 1);
    for (i = 0; C.races[i].noun; i++) {
        /* Does it match the noun? */
        if (!C.strncmpi(str, C.races[i].noun, len))
            return i;
        /* check adjective too */
        if (C.races[i].adj && !C.strncmpi(str, C.races[i].adj, len))
            return i;
        /* Or the filecode? */
        if (!C.strcmpi(str, C.races[i].filecode))
            return i;
    }

    if ((len == 1 && (C.loadChar(str) == '*'.charCodeAt(0) || C.loadChar(str) == '@'.charCodeAt(0)))
        || !C.strncmpi(str, randomstr, len))
        return C.ROLE_RANDOM;

    /* Couldn't find anything appropriate */
    return C.ROLE_NONE;
}

export function validgend(rolenum, racenum, gendnum)
{
    rolenum = C.int(rolenum);
    racenum = C.int(racenum);
    gendnum = C.int(gendnum);
    /* Assumes validrole and validrace */
    return C.boolean(Boolean(gendnum >= 0 && gendnum < C.ROLE_GENDERS
                      && (C.roles[rolenum].allow & C.races[racenum].allow
                          & C.genders[gendnum].allow & C.ROLE_GENDMASK)));
}

export function randgend(rolenum, racenum)
{
    rolenum = C.int(rolenum);
    racenum = C.int(racenum);
    let i, n = 0;

    /* Count the number of valid genders */
    for (i = 0; i < C.ROLE_GENDERS; i++)
        if (C.roles[rolenum].allow & C.races[racenum].allow & C.genders[i].allow
            & C.ROLE_GENDMASK)
            n++;

    /* Pick a random gender */
    if (n)
        n = C.rn2(n, 865, "randgend");
    for (i = 0; i < C.ROLE_GENDERS; i++)
        if (C.roles[rolenum].allow & C.races[racenum].allow & C.genders[i].allow
            & C.ROLE_GENDMASK) {
            if (n)
                n--;
            else
                return i;
        }

    /* This role/race has no permitted genders? */
    return C.rn2(C.ROLE_GENDERS, 876, "randgend");
}

export function str2gend(str)
{
    let i, len;

    /* Is str valid? */
    if (!str || !C.loadChar(str + (0)))
        return C.ROLE_NONE;

    /* Match as much of str as is provided */
    len = C.Strlen(str, 2);
    for (i = 0; i < C.ROLE_GENDERS; i++) {
        /* Does it match the adjective? */
        if (!C.strncmpi(str, C.genders[i].adj, len))
            return i;
        /* Or the filecode? */
        if (!C.strcmpi(str, C.genders[i].filecode))
            return i;
    }
    if ((len == 1 && (C.loadChar(str) == '*'.charCodeAt(0) || C.loadChar(str) == '@'.charCodeAt(0)))
        || !C.strncmpi(str, randomstr, len))
        return C.ROLE_RANDOM;

    /* Couldn't find anything appropriate */
    return C.ROLE_NONE;
}

export function validalign(rolenum, racenum, alignnum)
{
    rolenum = C.int(rolenum);
    racenum = C.int(racenum);
    alignnum = C.int(alignnum);
    /* Assumes validrole and validrace */
    return C.boolean(Boolean(alignnum >= 0 && alignnum < C.ROLE_ALIGNS
                      && (C.roles[rolenum].allow & C.races[racenum].allow
                          & C.aligns[alignnum].allow & C.ROLE_ALIGNMASK)));
}

export function randalign(rolenum, racenum)
{
    rolenum = C.int(rolenum);
    racenum = C.int(racenum);
    let i, n = 0;

    /* Count the number of valid alignments */
    for (i = 0; i < C.ROLE_ALIGNS; i++)
        if (C.roles[rolenum].allow & C.races[racenum].allow & C.aligns[i].allow
            & C.ROLE_ALIGNMASK)
            n++;

    /* Pick a random alignment */
    if (n)
        n = C.rn2(n, 928, "randalign");
    for (i = 0; i < C.ROLE_ALIGNS; i++)
        if (C.roles[rolenum].allow & C.races[racenum].allow & C.aligns[i].allow
            & C.ROLE_ALIGNMASK) {
            if (n)
                n--;
            else
                return i;
        }

    /* This role/race has no permitted alignments? */
    return C.rn2(C.ROLE_ALIGNS, 939, "randalign");
}

export function str2align(str)
{
    let i, len;

    /* Is str valid? */
    if (!str || !C.loadChar(str + (0)))
        return C.ROLE_NONE;

    /* Match as much of str as is provided */
    len = C.Strlen(str, 3);
    for (i = 0; i < C.ROLE_ALIGNS; i++) {
        /* Does it match the adjective? */
        if (!C.strncmpi(str, C.aligns[i].adj, len))
            return i;
        /* Or the filecode? */
        if (!C.strcmpi(str, C.aligns[i].filecode))
            return i;
    }
    if ((len == 1 && (C.loadChar(str) == '*'.charCodeAt(0) || C.loadChar(str) == '@'.charCodeAt(0)))
        || !C.strncmpi(str, randomstr, len))
        return C.ROLE_RANDOM;

    /* Couldn't find anything appropriate */
    return C.ROLE_NONE;
}

/* is rolenum compatible with any racenum/gendnum/alignnum constraints? */
export function ok_role(rolenum, racenum, gendnum, alignnum)
{
    rolenum = C.int(rolenum);
    racenum = C.int(racenum);
    gendnum = C.int(gendnum);
    alignnum = C.int(alignnum);
    let i;
    let allow;

    if (C.IndexOkT(rolenum, C.roles)) {
        if (C.gr.rfilter.roles[rolenum])
            return 0;
        allow = C.roles[rolenum].allow;
        if (C.IndexOkT(racenum, C.races)
            && !(allow & C.races[racenum].allow & C.ROLE_RACEMASK))
            return 0;
        if (gendnum >= 0 && gendnum < C.ROLE_GENDERS
            && !(allow & C.genders[gendnum].allow & C.ROLE_GENDMASK))
            return 0;
        if (alignnum >= 0 && alignnum < C.ROLE_ALIGNS
            && !(allow & C.aligns[alignnum].allow & C.ROLE_ALIGNMASK))
            return 0;
        return 1;
    } else {
        /* random; check whether any selection is possible */
        for (i = 0; i < C.SIZE(C.roles) - 1; i++) {
            if (C.gr.rfilter.roles[i])
                continue;
            allow = C.roles[i].allow;
            if (C.IndexOkT(racenum, C.races)
                && !(allow & C.races[racenum].allow & C.ROLE_RACEMASK))
                continue;
            if (gendnum >= 0 && gendnum < C.ROLE_GENDERS
                && !(allow & C.genders[gendnum].allow & C.ROLE_GENDMASK))
                continue;
            if (alignnum >= 0 && alignnum < C.ROLE_ALIGNS
                && !(allow & C.aligns[alignnum].allow & C.ROLE_ALIGNMASK))
                continue;
            return 1;
        }
        return 0;
    }
}

/* pick a random role subject to any racenum/gendnum/alignnum constraints */
/* If pickhow == PICK_RIGID a role is returned only if there is  */
/* a single possibility */
export function pick_role(racenum, gendnum, alignnum, pickhow)
{
    racenum = C.int(racenum);
    gendnum = C.int(gendnum);
    alignnum = C.int(alignnum);
    pickhow = C.int(pickhow);
    let i;
    let roles_ok = 0; const set = new Int32Array(C.SIZE(C.roles));

    for (i = 0; i < C.SIZE(C.roles) - 1; i++) {
        if (ok_role(i, racenum, gendnum, alignnum)
            && ok_race(i, (racenum >= 0) ? racenum : C.ROLE_RANDOM,
                       gendnum, alignnum)
            && ok_gend(i, racenum,
                       (gendnum >= 0) ? gendnum : C.ROLE_RANDOM, alignnum)
            && ok_align(i, racenum,
                        gendnum, (alignnum >= 0) ? alignnum : C.ROLE_RANDOM))
            set[roles_ok++] = i;
    }
    if (roles_ok == 0 || (roles_ok > 1 && pickhow == C.PICK_RIGID))
        return C.ROLE_NONE;
    return set[C.rn2(roles_ok, 1032, "pick_role")];
}

/* is racenum compatible with any rolenum/gendnum/alignnum constraints? */
export function ok_race(rolenum, racenum, gendnum, alignnum)
{
    rolenum = C.int(rolenum);
    racenum = C.int(racenum);
    gendnum = C.int(gendnum);
    alignnum = C.int(alignnum);
    let i;
    let allow;

    if (C.IndexOkT(racenum, C.races)) {
        if (C.gr.rfilter.mask & C.races[racenum].selfmask)
            return 0;
        allow = C.races[racenum].allow;
        if (C.IndexOkT(rolenum, C.roles)
            && !(allow & C.roles[rolenum].allow & C.ROLE_RACEMASK))
            return 0;
        if (gendnum >= 0 && gendnum < C.ROLE_GENDERS
            && !(allow & C.genders[gendnum].allow & C.ROLE_GENDMASK))
            return 0;
        if (alignnum >= 0 && alignnum < C.ROLE_ALIGNS
            && !(allow & C.aligns[alignnum].allow & C.ROLE_ALIGNMASK))
            return 0;
        return 1;
    } else {
        /* random; check whether any selection is possible */
        for (i = 0; i < C.SIZE(C.races) - 1; i++) {
            if (C.gr.rfilter.mask & C.races[i].selfmask)
                continue;
            allow = C.races[i].allow;
            if (C.IndexOkT(rolenum, C.roles)
                && !(allow & C.roles[rolenum].allow & C.ROLE_RACEMASK))
                continue;
            if (gendnum >= 0 && gendnum < C.ROLE_GENDERS
                && !(allow & C.genders[gendnum].allow & C.ROLE_GENDMASK))
                continue;
            if (alignnum >= 0 && alignnum < C.ROLE_ALIGNS
                && !(allow & C.aligns[alignnum].allow & C.ROLE_ALIGNMASK))
                continue;
            return 1;
        }
        return 0;
    }
}

/* Pick a random race subject to any rolenum/gendnum/alignnum constraints.
   If pickhow == PICK_RIGID a race is returned only if there is
   a single possibility. */
export function pick_race(rolenum, gendnum, alignnum, pickhow)
{
    rolenum = C.int(rolenum);
    gendnum = C.int(gendnum);
    alignnum = C.int(alignnum);
    pickhow = C.int(pickhow);
    let i;
    let races_ok = 0;

    for (i = 0; i < C.SIZE(C.races) - 1; i++) {
        if (ok_race(rolenum, i, gendnum, alignnum))
            races_ok++;
    }
    if (races_ok == 0 || (races_ok > 1 && pickhow == C.PICK_RIGID))
        return C.ROLE_NONE;
    races_ok = C.rn2(races_ok, 1092, "pick_race");
    for (i = 0; i < C.SIZE(C.races) - 1; i++) {
        if (ok_race(rolenum, i, gendnum, alignnum)) {
            if (races_ok == 0)
                return i;
            else
                races_ok--;
        }
    }
    return C.ROLE_NONE;
}

/* is gendnum compatible with any rolenum/racenum/alignnum constraints? */
/* gender and alignment are not comparable (and also not constrainable) */
export function ok_gend(rolenum, racenum, gendnum, alignnum)
{
    rolenum = C.int(rolenum);
    racenum = C.int(racenum);
    gendnum = C.int(gendnum);
    alignnum = C.int(alignnum);
    let i;
    let allow;

    if (gendnum >= 0 && gendnum < C.ROLE_GENDERS) {
        if (C.gr.rfilter.mask & C.genders[gendnum].allow)
            return 0;
        allow = C.genders[gendnum].allow;
        if (C.IndexOkT(rolenum, C.roles)
            && !(allow & C.roles[rolenum].allow & C.ROLE_GENDMASK))
            return 0;
        if (C.IndexOkT(racenum, C.races)
            && !(allow & C.races[racenum].allow & C.ROLE_GENDMASK))
            return 0;
        return 1;
    } else {
        /* random; check whether any selection is possible */
        for (i = 0; i < C.ROLE_GENDERS; i++) {
            if (C.gr.rfilter.mask & C.genders[i].allow)
                continue;
            allow = C.genders[i].allow;
            if (C.IndexOkT(rolenum, C.roles)
                && !(allow & C.roles[rolenum].allow & C.ROLE_GENDMASK))
                continue;
            if (C.IndexOkT(racenum, C.races)
                && !(allow & C.races[racenum].allow & C.ROLE_GENDMASK))
                continue;
            return 1;
        }
        return 0;
    }
}

/* pick a random gender subject to any rolenum/racenum/alignnum constraints */
/* gender and alignment are not comparable (and also not constrainable) */
/* If pickhow == PICK_RIGID a gender is returned only if there is  */
/* a single possibility */
export function pick_gend(rolenum, racenum, alignnum, pickhow)
{
    rolenum = C.int(rolenum);
    racenum = C.int(racenum);
    alignnum = C.int(alignnum);
    pickhow = C.int(pickhow);
    let i;
    let gends_ok = 0;

    for (i = 0; i < C.ROLE_GENDERS; i++) {
        if (ok_gend(rolenum, racenum, i, alignnum))
            gends_ok++;
    }
    if (gends_ok == 0 || (gends_ok > 1 && pickhow == C.PICK_RIGID))
        return C.ROLE_NONE;
    gends_ok = C.rn2(gends_ok, 1157, "pick_gend");
    for (i = 0; i < C.ROLE_GENDERS; i++) {
        if (ok_gend(rolenum, racenum, i, alignnum)) {
            if (gends_ok == 0)
                return i;
            else
                gends_ok--;
        }
    }
    return C.ROLE_NONE;
}

/* is alignnum compatible with any rolenum/racenum/gendnum constraints? */
/* alignment and gender are not comparable (and also not constrainable) */
export function ok_align(rolenum, racenum, gendnum, alignnum)
{
    rolenum = C.int(rolenum);
    racenum = C.int(racenum);
    gendnum = C.int(gendnum);
    alignnum = C.int(alignnum);
    let i;
    let allow;

    if (alignnum >= 0 && alignnum < C.ROLE_ALIGNS) {
        if (C.gr.rfilter.mask & C.aligns[alignnum].allow)
            return 0;
        allow = C.aligns[alignnum].allow;
        if (C.IndexOkT(rolenum, C.roles)
            && !(allow & C.roles[rolenum].allow & C.ROLE_ALIGNMASK))
            return 0;
        if (C.IndexOkT(racenum, C.races)
            && !(allow & C.races[racenum].allow & C.ROLE_ALIGNMASK))
            return 0;
        return 1;
    } else {
        /* random; check whether any selection is possible */
        for (i = 0; i < C.ROLE_ALIGNS; i++) {
            if (C.gr.rfilter.mask & C.aligns[i].allow)
                continue;
            allow = C.aligns[i].allow;
            if (C.IndexOkT(rolenum, C.roles)
                && !(allow & C.roles[rolenum].allow & C.ROLE_ALIGNMASK))
                continue;
            if (C.IndexOkT(racenum, C.races)
                && !(allow & C.races[racenum].allow & C.ROLE_ALIGNMASK))
                continue;
            return 1;
        }
        return 0;
    }
}

/* Pick a random alignment subject to any rolenum/racenum/gendnum constraints;
   alignment and gender are not comparable (and also not constrainable).
   If pickhow == PICK_RIGID an alignment is returned only if there is
   a single possibility. */
export function pick_align(rolenum, racenum, gendnum, pickhow)
{
    rolenum = C.int(rolenum);
    racenum = C.int(racenum);
    gendnum = C.int(gendnum);
    pickhow = C.int(pickhow);
    let i;
    let aligns_ok = 0;

    for (i = 0; i < C.ROLE_ALIGNS; i++) {
        if (ok_align(rolenum, racenum, gendnum, i))
            aligns_ok++;
    }
    if (aligns_ok == 0 || (aligns_ok > 1 && pickhow == C.PICK_RIGID))
        return C.ROLE_NONE;
    aligns_ok = C.rn2(aligns_ok, 1222, "pick_align");
    for (i = 0; i < C.ROLE_ALIGNS; i++) {
        if (ok_align(rolenum, racenum, gendnum, i)) {
            if (aligns_ok == 0)
                return i;
            else
                aligns_ok--;
        }
    }
    return C.ROLE_NONE;
}

export function rigid_role_checks()
{
    let tmp;

    /* Some roles are limited to a single race, alignment, or gender and
     * calling this routine prior to XXX_player_selection() will help
     * prevent an extraneous prompt that actually doesn't allow
     * you to choose anything further. Note the use of PICK_RIGID which
     * causes the pick_XX() routine to return a value only if there is one
     * single possible selection, otherwise it returns ROLE_NONE.
     *
     */
    if (C.flags.initrole == C.ROLE_RANDOM) {
        /* If the role was explicitly specified as ROLE_RANDOM
         * via -uXXXX-@ or OPTIONS=role:random then choose the role
         * in here to narrow down later choices.
         */
        C.flags.initrole = pick_role(C.flags.initrace, C.flags.initgend,
                                   C.flags.initalign, C.PICK_RANDOM);
        if (C.flags.initrole < 0)
            C.flags.initrole = randrole_filtered();
    }
    if (C.flags.initrace == C.ROLE_RANDOM
        && (tmp = pick_race(C.flags.initrole, C.flags.initgend,
                            C.flags.initalign, C.PICK_RANDOM)) != C.ROLE_NONE)
        C.flags.initrace = tmp;
    if (C.flags.initalign == C.ROLE_RANDOM
        && (tmp = pick_align(C.flags.initrole, C.flags.initrace,
                             C.flags.initgend, C.PICK_RANDOM)) != C.ROLE_NONE)
        C.flags.initalign = tmp;
    if (C.flags.initgend == C.ROLE_RANDOM
        && (tmp = pick_gend(C.flags.initrole, C.flags.initrace,
                            C.flags.initalign, C.PICK_RANDOM)) != C.ROLE_NONE)
        C.flags.initgend = tmp;

    if (C.flags.initrole != C.ROLE_NONE) {
        if (C.flags.initrace == C.ROLE_NONE)
            C.flags.initrace = pick_race(C.flags.initrole, C.flags.initgend,
                                       C.flags.initalign, C.PICK_RIGID);
        if (C.flags.initalign == C.ROLE_NONE)
            C.flags.initalign = pick_align(C.flags.initrole, C.flags.initrace,
                                         C.flags.initgend, C.PICK_RIGID);
        if (C.flags.initgend == C.ROLE_NONE)
            C.flags.initgend = pick_gend(C.flags.initrole, C.flags.initrace,
                                       C.flags.initalign, C.PICK_RIGID);
    }
}

export function setrolefilter(bufp)
{
    let i;
    let reslt = 1;

    if ((i = str2role(bufp)) != C.ROLE_NONE && i != C.ROLE_RANDOM)
        C.gr.rfilter.roles[i] = 1;
    else if ((i = str2race(bufp)) != C.ROLE_NONE && i != C.ROLE_RANDOM)
        C.gr.rfilter.mask |= C.races[i].selfmask;
    else if ((i = str2gend(bufp)) != C.ROLE_NONE && i != C.ROLE_RANDOM)
        C.gr.rfilter.mask |= C.genders[i].allow;
    else if ((i = str2align(bufp)) != C.ROLE_NONE && i != C.ROLE_RANDOM)
        C.gr.rfilter.mask |= C.aligns[i].allow;
    else
        reslt = 0;
    return reslt;
}

export function gotrolefilter()
{
    let i;

    if (C.gr.rfilter.mask)
        return 1;
    for (i = 0; i < C.SIZE(C.roles) - 1; ++i)
        if (C.gr.rfilter.roles[i])
            return 1;
    return 0;
}

/* create a string like " !Bar !Kni" or " !chaotic" that can be
   put back into an RC file by #saveoptions */
export function rolefilterstring(outbuf, which)
{
    which = C.int(which);
    let i;

    C.storeChar(outbuf, C.storeChar(outbuf + 1, '\0'.charCodeAt(0)));
    switch (which) {
    case C.RS_ROLE:
        for (i = 0; i < C.SIZE(C.roles) - 1; ++i) {
            if (C.gr.rfilter.roles[i])
                C.Sprintf(C.eos(outbuf), " !%.3s", C.roles[i].name.m);
        }
        break;
    case C.RS_RACE:
        for (i = 0; i < C.SIZE(C.races) - 1; ++i) {
            if ((C.gr.rfilter.mask & C.races[i].selfmask) != 0)
                C.Sprintf(C.eos(outbuf), " !%s", C.races[i].noun);
        }
        break;
    case C.RS_GENDER:
        for (i = 0; i < C.SIZE(C.genders) - 1; ++i) {
            if ((C.gr.rfilter.mask & C.genders[i].allow) != 0)
                C.Sprintf(C.eos(outbuf), " !%s", C.genders[i].adj);
        }
        break;
    case C.RS_ALGNMNT:
        for (i = 0; i < C.SIZE(C.aligns) - 1; ++i) {
            if ((C.gr.rfilter.mask & C.aligns[i].allow) != 0)
                C.Sprintf(C.eos(outbuf), " !%s", C.aligns[i].adj);
        }
        break;
    default:
        C.impossible("rolefilterstring: bad role aspect (%d)", which);
        C.Strcpy(outbuf, " ?");
        break;
    }
    /* constructed with a leading space; drop it */
    return outbuf + 1;
}

export function clearrolefilter(which)
{
    which = C.int(which);
    let i;

    switch (which) {
    case C.RS_filter:
        C.gr.rfilter.mask = 0; /* clear race, gender, and alignment filters */
        
        /*FALLTHRU*/
    case C.RS_ROLE:
        for (i = 0; i < C.SIZE(C.roles) - 1; ++i)
            C.gr.rfilter.roles[i] = 0;
        break;
    case C.RS_RACE:
        C.gr.rfilter.mask &= ~C.ROLE_RACEMASK;
        break;
    case C.RS_GENDER:
        C.gr.rfilter.mask &= ~C.ROLE_GENDMASK;
        break;
    case C.RS_ALGNMNT:
        C.gr.rfilter.mask &= ~C.ROLE_ALIGNMASK;
        break;
    }
}



export function promptsep(buf, num_post_attribs)
{
    num_post_attribs = C.int(num_post_attribs);
    let conjuct = "and ";

    if (num_post_attribs > 1 && C.gr.role_post_attribs < num_post_attribs
        && C.gr.role_post_attribs > 1)
        C.Strcat(buf, ",");
    C.Strcat(buf, " ");
    --C.gr.role_post_attribs;
    if (!C.gr.role_post_attribs && num_post_attribs > 1)
        C.Strcat(buf, conjuct);
    return buf;
}

export function role_gendercount(rolenum)
{
    rolenum = C.int(rolenum);
    let gendcount = 0;

    if (validrole(rolenum)) {
        if (C.roles[rolenum].allow & C.ROLE_MALE)
            ++gendcount;
        if (C.roles[rolenum].allow & C.ROLE_FEMALE)
            ++gendcount;
        if (C.roles[rolenum].allow & C.ROLE_NEUTER)
            ++gendcount;
    }
    return gendcount;
}

export function race_alignmentcount(racenum)
{
    racenum = C.int(racenum);
    let aligncount = 0;

    if (racenum != C.ROLE_NONE && racenum != C.ROLE_RANDOM) {
        if (C.races[racenum].allow & C.ROLE_CHAOTIC)
            ++aligncount;
        if (C.races[racenum].allow & C.ROLE_LAWFUL)
            ++aligncount;
        if (C.races[racenum].allow & C.ROLE_NEUTRAL)
            ++aligncount;
    }
    return aligncount;
}

export function root_plselection_prompt(suppliedbuf, buflen, rolenum, racenum, gendnum, alignnum)
{
    buflen = C.int(buflen);
    rolenum = C.int(rolenum);
    racenum = C.int(racenum);
    gendnum = C.int(gendnum);
    alignnum = C.int(alignnum);
    let k, gendercount = 0, aligncount = 0;
    const buf = C.stackAlloc(C.BUFSZ);
    const err_ret = " character's";
    let donefirst = 0;

    if (!suppliedbuf || buflen < 1)
        return err_ret;

    /* initialize these static variables each time this is called */
    C.gr.role_post_attribs = 0;
    for (k = 0; k < C.NUM_BP; ++k)
        C.gr.role_pa[k] = 0;
    C.storeChar(buf + (0), '\0'.charCodeAt(0));
    C.storeChar(suppliedbuf, '\0'.charCodeAt(0));

    /* How many alignments are allowed for the desired race? */
    if (racenum != C.ROLE_NONE && racenum != C.ROLE_RANDOM)
        aligncount = race_alignmentcount(racenum);

    if (alignnum != C.ROLE_NONE && alignnum != C.ROLE_RANDOM
        && ok_align(rolenum, racenum, gendnum, alignnum)) {
        if (donefirst)
            C.Strcat(buf, " ");
        C.Strcat(buf, C.aligns[alignnum].adj);
        donefirst = 1;
    } else {
        /* in case we got here by failing the ok_align() test */
        if (alignnum != C.ROLE_RANDOM)
            alignnum = C.ROLE_NONE;
        /* if alignment not specified, but race is specified
           and only one choice of alignment for that race then
           don't include it in the later list */
        if ((((racenum != C.ROLE_NONE && racenum != C.ROLE_RANDOM)
              && ok_race(rolenum, racenum, gendnum, alignnum))
             && (aligncount > 1))
            || (racenum == C.ROLE_NONE || racenum == C.ROLE_RANDOM)) {
            C.gr.role_pa[C.BP_ALIGN] = 1;
            C.gr.role_post_attribs++;
        }
    }
    /* <your lawful> */

    /* How many genders are allowed for the desired role? */
    if (validrole(rolenum))
        gendercount = role_gendercount(rolenum);

    if (gendnum != C.ROLE_NONE && gendnum != C.ROLE_RANDOM) {
        if (validrole(rolenum)) {
            /* if role specified, and multiple choice of genders for it,
               and name of role itself does not distinguish gender */
            if ((rolenum != C.ROLE_NONE) && (gendercount > 1)
                && !C.roles[rolenum].name.f) {
                if (donefirst)
                    C.Strcat(buf, " ");
                C.Strcat(buf, C.genders[gendnum].adj);
                donefirst = 1;
            }
        } else {
            if (donefirst)
                C.Strcat(buf, " ");
            C.Strcat(buf, C.genders[gendnum].adj);
            donefirst = 1;
        }
    } else {
        /* if gender not specified, but role is specified
                and only one choice of gender then
                don't include it in the later list */
        if ((validrole(rolenum) && (gendercount > 1))
            || !validrole(rolenum)) {
            C.gr.role_pa[C.BP_GEND] = 1;
            C.gr.role_post_attribs++;
        }
    }
    /* <your lawful female> */

    if (racenum != C.ROLE_NONE && racenum != C.ROLE_RANDOM) {
        if (validrole(rolenum)
            && ok_race(rolenum, racenum, gendnum, alignnum)) {
            if (donefirst)
                C.Strcat(buf, " ");
            C.Strcat(buf, (rolenum == C.ROLE_NONE) ? C.races[racenum].noun
                                               : C.races[racenum].adj);
            donefirst = 1;
        } else if (!validrole(rolenum)) {
            if (donefirst)
                C.Strcat(buf, " ");
            C.Strcat(buf, C.races[racenum].noun);
            donefirst = 1;
        } else {
            C.gr.role_pa[C.BP_RACE] = 1;
            C.gr.role_post_attribs++;
        }
    } else {
        C.gr.role_pa[C.BP_RACE] = 1;
        C.gr.role_post_attribs++;
    }
    /* <your lawful female gnomish> || <your lawful female gnome> */

    if (validrole(rolenum)) {
        C.assert(C.IndexOkT(rolenum, C.roles), 0);
        if (donefirst)
            C.Strcat(buf, " ");
        if (gendnum != C.ROLE_NONE) {
            if (gendnum == 1 && C.roles[rolenum].name.f)
                C.Strcat(buf, C.roles[rolenum].name.f);
            else
                C.Strcat(buf, C.roles[rolenum].name.m);
        } else {
            if (C.roles[rolenum].name.f) {
                C.Strcat(buf, C.roles[rolenum].name.m);
                C.Strcat(buf, "/");
                C.Strcat(buf, C.roles[rolenum].name.f);
            } else
                C.Strcat(buf, C.roles[rolenum].name.m);
        }
        donefirst = 1;
    } else if (rolenum == C.ROLE_NONE) {
        C.gr.role_pa[C.BP_ROLE] = 1;
        C.gr.role_post_attribs++;
    }

    if ((racenum == C.ROLE_NONE || racenum == C.ROLE_RANDOM)
        && !validrole(rolenum)) {
        if (donefirst)
            C.Strcat(buf, " ");
        C.Strcat(buf, "character");
        /*donefirst = TRUE;*/
    }
    /* <your lawful female gnomish cavewoman> || <your lawful female gnome>
     *    || <your lawful female character>
     */
    if (buflen > C.int(C.strlen(buf) + 1n)) {
        C.Strcpy(suppliedbuf, buf);
        return suppliedbuf;
    } else
        return err_ret;
}

export function build_plselection_prompt(buf, buflen, rolenum, racenum, gendnum, alignnum)
{
    buflen = C.int(buflen);
    rolenum = C.int(rolenum);
    racenum = C.int(racenum);
    gendnum = C.int(gendnum);
    alignnum = C.int(alignnum);
    let defprompt = "Shall I pick a character for you? [ynaq] ";
    let num_post_attribs = 0;
    const tmpbuf = C.stackAlloc(C.BUFSZ); let p;

    if (buflen < C.QBUFSZ)
        return  defprompt;

    C.Strcpy(tmpbuf, "Shall I pick ");
    if (racenum != C.ROLE_NONE || validrole(rolenum))
        C.Strcat(tmpbuf, "your ");
    else
        C.Strcat(tmpbuf, "a ");
    /* <your> */

    C.callLocal(root_plselection_prompt, C.eos(tmpbuf), buflen - C.Strlen(tmpbuf, 4),
                                   rolenum, racenum, gendnum, alignnum);
    /* "Shall I pick a character's role, race, gender, and alignment for you?"
       plus " [ynaq] (y)" is a little too long for a conventional 80 columns;
       also, "pick a character's <anything>" sounds a bit stilted */
    C.strsubst(tmpbuf, "pick a character", "pick character");
    C.Sprintf(buf, "%s", C.s_suffix(tmpbuf));
    /* don't bother splitting caveman/cavewoman or priest/priestess
       in order to apply possessive suffix to both halves, but do
       change "priest/priestess'" to "priest/priestess's" */
    if ((p = C.strstri(buf, "priest/priestess'")) != 0
        && C.loadChar(p + (C.priestSuffixLength)) == '\0'.charCodeAt(0))
        C.strkitten(buf, 's'.charCodeAt(0));

    /* buf should now be:
     *    <your lawful female gnomish cavewoman's>
     * || <your lawful female gnome's>
     * || <your lawful female character's>
     *
     * Now append the post attributes to it
     */
    num_post_attribs = C.gr.role_post_attribs;
    if (!num_post_attribs) {
        /* some constraints might have been mutually exclusive, in which case
           some prompting that would have been omitted is needed after all */
        if (C.flags.initrole == C.ROLE_NONE && !C.gr.role_pa[C.BP_ROLE])
            C.gr.role_pa[C.BP_ROLE] = ++C.gr.role_post_attribs;
        if (C.flags.initrace == C.ROLE_NONE && !C.gr.role_pa[C.BP_RACE])
            C.gr.role_pa[C.BP_RACE] = ++C.gr.role_post_attribs;
        if (C.flags.initalign == C.ROLE_NONE && !C.gr.role_pa[C.BP_ALIGN])
            C.gr.role_pa[C.BP_ALIGN] = ++C.gr.role_post_attribs;
        if (C.flags.initgend == C.ROLE_NONE && !C.gr.role_pa[C.BP_GEND])
            C.gr.role_pa[C.BP_GEND] = ++C.gr.role_post_attribs;
        num_post_attribs = C.gr.role_post_attribs;
    }
    if (num_post_attribs) {
        if (C.gr.role_pa[C.BP_RACE]) {
            promptsep(C.eos(buf), num_post_attribs);
            C.Strcat(buf, "race");
        }
        if (C.gr.role_pa[C.BP_ROLE]) {
            promptsep(C.eos(buf), num_post_attribs);
            C.Strcat(buf, "role");
        }
        if (C.gr.role_pa[C.BP_GEND]) {
            promptsep(C.eos(buf), num_post_attribs);
            C.Strcat(buf, "gender");
        }
        if (C.gr.role_pa[C.BP_ALIGN]) {
            promptsep(C.eos(buf), num_post_attribs);
            C.Strcat(buf, "alignment");
        }
    }
    C.Strcat(buf, " for you? [ynaq] ");
    return buf;
}


export function plnamesuffix()
{
    let sptr, eptr;
    let i;

    /* some generic user names will be ignored in favor of prompting */
    if (C.sysopt.genericusers) {
        if (C.loadChar(C.sysopt.genericusers) == '*'.charCodeAt(0)) {
            C.storeChar(C.svp.plname + (0), '\0'.charCodeAt(0));
        } else {
            /* need to ignore appended '-role-race-gender-alignment';
               'plnamelen' is non-zero when dealing with plname[] value that
               contains a username with dash(es) in it and is usually 0 */
            i = ((eptr = C.strchr(C.svp.plname + C.gp.plnamelen, '-'.charCodeAt(0))) != 0)
                ? C.int(eptr - C.svp.plname)
                : C.int(C.Strlen(C.svp.plname, 5));
            /* look for plname[] in the 'genericusers' space-separated list */
            if (C.findword(C.sysopt.genericusers, C.svp.plname, i, 0))
                /* it's generic; remove it so that askname() will be called */
                C.storeChar(C.svp.plname + (0), '\0'.charCodeAt(0));
        }
        if (!C.loadChar(C.svp.plname + (0)))
            C.gp.plnamelen = 0;
    }

    do {
        if (!C.loadChar(C.svp.plname + (0))) {
            C.askname(); /* fill svp.plname[] if necessary, or set
                        * defer_plname */
            C.gp.plnamelen = 0; /* plname[] might have -role-race-&c attached */
        }

        /* Look for tokens delimited by '-' */
        sptr = C.svp.plname + C.gp.plnamelen;
        if ((eptr = C.strchr(sptr, '-'.charCodeAt(0))) !=  0)
            C.storeChar(eptr++, '\0'.charCodeAt(0));
        while (eptr) {
            /* Isolate the next token */
            sptr = eptr;
            if ((eptr = C.strchr(sptr, '-'.charCodeAt(0))) !=  0)
                C.storeChar(eptr++, '\0'.charCodeAt(0));

            /* Try to match it to something */
            if ((i = str2role(sptr)) != C.ROLE_NONE)
                C.flags.initrole = i;
            else if ((i = str2race(sptr)) != C.ROLE_NONE)
                C.flags.initrace = i;
            else if ((i = str2gend(sptr)) != C.ROLE_NONE)
                C.flags.initgend = i;
            else if ((i = str2align(sptr)) != C.ROLE_NONE)
                C.flags.initalign = i;
        }
    } while (!C.loadChar(C.svp.plname + (0)) && !C.iflags.defer_plname);

    /* commas in the svp.plname confuse the record file, convert to spaces */
    C.strNsubst(C.svp.plname, ",", " ", 0);
}

/* show current settings for name, role, race, gender, and alignment
   in the specified window */
export function role_selection_prolog(which, where)
{
    which = C.int(which);
    where = C.int(where);
    const choosing = " choosing now", not_yet = " not yet specified", rand_choice = " random";
    const buf = C.stackAlloc(C.BUFSZ);
    let r, c, gend, a, allowmask;

    r = C.flags.initrole;
    c = C.flags.initrace;
    gend = C.flags.initgend;
    a = C.flags.initalign;
    if (r >= 0) {
        C.assert(C.IndexOkT(r, C.roles), 1);
        allowmask = C.roles[r].allow;
        if ((allowmask & C.ROLE_RACEMASK) == C.MH_HUMAN)
            c = 0; /* races[human] */
        else if (C.IndexOkT(c, C.races)
                 && !(allowmask & C.ROLE_RACEMASK & C.races[c].allow))
            c = C.ROLE_RANDOM;
        if ((allowmask & C.ROLE_GENDMASK) == C.ROLE_MALE)
            gend = 0; /* role forces male (hypothetical) */
        else if ((allowmask & C.ROLE_GENDMASK) == C.ROLE_FEMALE)
            gend = 1; /* role forces female (valkyrie) */
        if ((allowmask & C.ROLE_ALIGNMASK) == C.AM_LAWFUL)
            a = 0; /* aligns[lawful] */
        else if ((allowmask & C.ROLE_ALIGNMASK) == C.AM_NEUTRAL)
            a = 1; /* aligns[neutral] */
        else if ((allowmask & C.ROLE_ALIGNMASK) == C.AM_CHAOTIC)
            a = 2; /* aligns[chaotic] */
    }
    if (c >= 0) {
        C.assert(C.IndexOkT(c, C.races), 2);
        allowmask = C.races[c].allow;
        if ((allowmask & C.ROLE_ALIGNMASK) == C.AM_LAWFUL)
            a = 0; /* aligns[lawful] */
        else if ((allowmask & C.ROLE_ALIGNMASK) == C.AM_NEUTRAL)
            a = 1; /* aligns[neutral] */
        else if ((allowmask & C.ROLE_ALIGNMASK) == C.AM_CHAOTIC)
            a = 2; /* aligns[chaotic] */
        /* [c never forces gender] */
    }
    /* [g and a don't constrain anything sufficiently
       to narrow something done to a single choice] */

    C.Sprintf(buf, "%12s ", "name:");
    C.Strcat(buf, (which == C.RS_NAME) ? choosing
                : !C.loadChar(C.svp.plname) ? not_yet : C.svp.plname);
    C.putstr(where, 0, buf);
    C.Sprintf(buf, "%12s ", "role:");
    C.assert(which == C.RS_ROLE || r == C.ROLE_NONE || r == C.ROLE_RANDOM
           || C.IndexOkT(r, C.roles), 3);
    C.Strcat(buf, (which == C.RS_ROLE) ? choosing
                : (r == C.ROLE_NONE) ? not_yet
                  : (r == C.ROLE_RANDOM) ? rand_choice
                    : C.roles[r].name.m);
    if (r >= 0 && C.roles[r].name.f) {
        /* distinct female name [caveman/cavewoman, priest/priestess] */
        if (gend == 1)
            /* female specified; replace male role name with female one */
            C.Sprintf(C.strchr(buf, ':'.charCodeAt(0)), ": %s", C.roles[r].name.f);
        else if (gend < 0)
            /* gender unspecified; append slash and female role name */
            C.Sprintf(C.eos(buf), "/%s", C.roles[r].name.f);
    }
    C.putstr(where, 0, buf);
    C.Sprintf(buf, "%12s ", "race:");
    C.assert(which == C.RS_RACE || c == C.ROLE_NONE || c == C.ROLE_RANDOM
           || C.IndexOkT(c, C.races), 4);
    C.Strcat(buf, (which == C.RS_RACE) ? choosing
                : (c == C.ROLE_NONE) ? not_yet
                  : (c == C.ROLE_RANDOM) ? rand_choice
                    : C.races[c].noun);
    C.putstr(where, 0, buf);
    C.Sprintf(buf, "%12s ", "gender:");
    C.Strcat(buf, (which == C.RS_GENDER) ? choosing
                : (gend == C.ROLE_NONE) ? not_yet
                  : (gend == C.ROLE_RANDOM) ? rand_choice
                    : C.genders[gend].adj);
    C.putstr(where, 0, buf);
    C.Sprintf(buf, "%12s ", "alignment:");
    C.Strcat(buf, (which == C.RS_ALGNMNT) ? choosing
                : (a == C.ROLE_NONE) ? not_yet
                  : (a == C.ROLE_RANDOM) ? rand_choice
                    : C.aligns[a].adj);
    C.putstr(where, 0, buf);
}

/* add a "pick alignment first"-type entry to the specified menu */
export function role_menu_extra(which, where, preselect)
{
    which = C.int(which);
    where = C.int(where);
    preselect = C.boolean(preselect);
    const RS_menu_let = [
        '='.charCodeAt(0),  /* name */
        '?'.charCodeAt(0),  /* role */
        '/'.charCodeAt(0),  /* race */
        '\"'.charCodeAt(0), /* gender */
        '['.charCodeAt(0),  /* alignment */
    ];
    const any = C.anythingLocal();
    const buf = C.stackAlloc(C.BUFSZ);
    let what = 0, constrainer = 0, forcedvalue = 0;
    let f = 0, r, c, gend, a, i, allowmask;
    let clr = C.NO_COLOR;

    r = C.flags.initrole;
    c = C.flags.initrace;
    switch (which) {
    case C.RS_NAME:
        what = "name";
        break;
    case C.RS_ROLE:
        what = "role";
        f = r;
        for (i = 0; i < C.SIZE(C.roles) - 1; ++i)
            if (i != f && !C.gr.rfilter.roles[i])
                break;
        if (i == C.SIZE(C.roles) - 1) {
            constrainer = "filter";
            forcedvalue = "role";
        }
        break;
    case C.RS_RACE:
        what = "race";
        f = C.flags.initrace;
        c = C.ROLE_NONE; /* override player's setting */
        if (r >= 0) {
            allowmask = C.roles[r].allow & C.ROLE_RACEMASK;
            if (allowmask == C.MH_HUMAN)
                c = 0; /* races[human] */
            if (c >= 0) {
                constrainer = "role";
                forcedvalue = C.races[c].noun;
            } else if (f >= 0 && ((allowmask & ~C.gr.rfilter.mask)
                                  == C.races[f].selfmask)) {
                /* if there is only one race choice available due to user
                   options disallowing others, race menu entry is disabled */
                constrainer = "filter";
                forcedvalue = "race";
            }
        }
        break;
    case C.RS_GENDER:
        what = "gender";
        f = C.flags.initgend;
        gend = C.ROLE_NONE;
        if (r >= 0) {
            allowmask = C.roles[r].allow & C.ROLE_GENDMASK;
            if (allowmask == C.ROLE_MALE)
                gend = 0; /* genders[male] */
            else if (allowmask == C.ROLE_FEMALE)
                gend = 1; /* genders[female] */
            if (gend >= 0) {
                constrainer = "role";
                forcedvalue = C.genders[gend].adj;
            } else if (f >= 0 && ((allowmask & ~C.gr.rfilter.mask)
                                  == C.genders[f].allow)) {
                /* if there is only one gender choice available due to user
                   options disallowing other, gender menu entry is disabled */
                constrainer = "filter";
                forcedvalue = "gender";
            }
        }
        break;
    case C.RS_ALGNMNT:
        what = "alignment";
        f = C.flags.initalign;
        a = C.ROLE_NONE;
        if (r >= 0) {
            allowmask = C.roles[r].allow & C.ROLE_ALIGNMASK;
            if (allowmask == C.AM_LAWFUL)
                a = 0; /* aligns[lawful] */
            else if (allowmask == C.AM_NEUTRAL)
                a = 1; /* aligns[neutral] */
            else if (allowmask == C.AM_CHAOTIC)
                a = 2; /* aligns[chaotic] */
            if (a >= 0)
                constrainer = "role";
        }
        if (c >= 0 && !constrainer) {
            allowmask = C.races[c].allow & C.ROLE_ALIGNMASK;
            if (allowmask == C.AM_LAWFUL)
                a = 0; /* aligns[lawful] */
            else if (allowmask == C.AM_NEUTRAL)
                a = 1; /* aligns[neutral] */
            else if (allowmask == C.AM_CHAOTIC)
                a = 2; /* aligns[chaotic] */
            if (a >= 0)
                constrainer = "race";
        }
        if (f >= 0 && !constrainer
            && (C.ROLE_ALIGNMASK & ~C.gr.rfilter.mask) == C.aligns[f].allow) {
            /* if there is only one alignment choice available due to user
               options disallowing others, algn menu entry is disabled */
            constrainer = "filter";
            forcedvalue = "alignment";
        }
        if (a >= 0)
            forcedvalue = C.aligns[a].adj;
        break;
    }

    C.copyAnything(any, C.cg.zeroany); /* zero out all bits */
    if (constrainer) {
        any.a_int = 0;
        /* use four spaces of padding to fake a grayed out menu choice */
        C.Sprintf(buf, "%4s%s forces %s", "", constrainer, forcedvalue);
        C.add_menu_str(where, buf);
    } else if (what) {
        any.a_int = C.RS_menu_arg(which);
        C.Sprintf(buf, "Pick%s %s first", (f >= 0) ? " another" : "", what);
        C.add_menu(where, C.nulGlyphInfo(), any, RS_menu_let[which], 0,
                 C.ATR_NONE, clr, buf, C.MENU_ITEMFLAGS_NONE);
    } else if (which == C.RS_filter) {
        const setfiltering = C.stackAlloc(40);

        any.a_int = C.RS_menu_arg(C.RS_filter);
        C.Sprintf(setfiltering, "%s role/race/&c filtering",
                gotrolefilter() ? "Reset" : "Set");
        C.add_menu(where, C.nulGlyphInfo(), any, '~'.charCodeAt(0), 0, C.ATR_NONE,
                 clr, setfiltering, C.MENU_ITEMFLAGS_NONE);
    } else if (which == C.ROLE_RANDOM) {
        any.a_int = C.ROLE_RANDOM;
        C.add_menu(where, C.nulGlyphInfo(), any, '*'.charCodeAt(0), 0,
                 C.ATR_NONE, clr, "Random",
                 preselect ? C.MENU_ITEMFLAGS_SELECTED : C.MENU_ITEMFLAGS_NONE);
    } else if (which == C.ROLE_NONE) {
        any.a_int = C.ROLE_NONE;
        C.add_menu(where, C.nulGlyphInfo(), any, 'q'.charCodeAt(0), 0,
                 C.ATR_NONE, clr, "Quit",
                 preselect ? C.MENU_ITEMFLAGS_SELECTED : C.MENU_ITEMFLAGS_NONE);
    } else {
        C.impossible("role_menu_extra: bad arg (%d)", which);
    }
}

/*
 *      Special setup modifications here:
 *
 *      Unfortunately, this is going to have to be done
 *      on each newgame or restore, because you lose the permonst mods
 *      across a save/restore.  :-)
 *
 *      1 - The Rogue Leader is the Tourist Nemesis.
 *      2 - Priests start with a random alignment - convert the leader and
 *          guardians here.
 *      3 - Priests also get their set of deities from a randomly chosen role.
 *      4 - [obsolete] Elves can have one of two different leaders,
 *          but can't work it out here because it requires hacking the
 *          level file data (see sp_lev.c).
 *
 * This code also replaces quest_init().
 */
export function role_init()
{
    let alignmnt;
    let pm;

    /* Strip the role letter out of the player name.
     * This is included for backwards compatibility.
     */
    plnamesuffix();

    /* Check for a valid role.  Try flags.initrole first. */
    if (!validrole(C.flags.initrole)) {
        /* Try the player letter second */
        if ((C.flags.initrole = str2role(C.svp.pl_character)) < 0)
            /* None specified; pick a random role */
            C.flags.initrole = randrole_filtered();
    }

    /* We now have a valid role index.  Copy the role name back. */
    /* This should become OBSOLETE */
    C.Strcpy(C.svp.pl_character, C.roles[C.flags.initrole].name.m);
    C.storeChar(C.svp.pl_character + C.PL_CSIZ - 1, '\0'.charCodeAt(0));

    /* Check for a valid race */
    if (!validrace(C.flags.initrole, C.flags.initrace))
        C.flags.initrace = randrace(C.flags.initrole);

    /* Check for a valid gender.  If new game, check both initgend
     * and female.  On restore, assume flags.female is correct. */
    if (C.flags.pantheon == -1) { /* new game */
        if (!validgend(C.flags.initrole, C.flags.initrace, C.flags.female))
            C.flags.female = !C.flags.female;
    }
    if (!validgend(C.flags.initrole, C.flags.initrace, C.flags.initgend))
        /* Note that there is no way to check for an unspecified gender. */
        C.flags.initgend = C.flags.female;

    /* Check for a valid alignment */
    if (!validalign(C.flags.initrole, C.flags.initrace, C.flags.initalign))
        /* Pick a random alignment */
        C.flags.initalign = randalign(C.flags.initrole, C.flags.initrace);
    alignmnt = C.aligns[C.flags.initalign].value;

    /* Initialize gu.urole and gu.urace */
    C.copyRole(C.gu.urole, C.roles[C.flags.initrole]);
    C.copyRace(C.gu.urace, C.races[C.flags.initrace]);

    /* Fix up the quest leader */
    if (C.gu.urole.ldrnum != C.NON_PM) {
        pm = C.mons[C.gu.urole.ldrnum];
        pm.msound = C.MS_LEADER;
        pm.mflags2 |= (C.M2_PEACEFUL);
        pm.mflags3 |= C.M3_CLOSE;
        pm.maligntyp = alignmnt * 3;
        /* if gender is random, we choose it now instead of waiting
           until the leader monster is created */
        C.svq.quest_status.ldrgend =
            C.is_neuter(pm) ? 2 : C.is_female(pm) ? 1 : C.is_male(pm)
                                                        ? 0
                                                        : (C.rn2(100, 2039, "role_init") < 50);
    }

    /* Fix up the quest guardians */
    if (C.gu.urole.guardnum != C.NON_PM) {
        pm = C.mons[C.gu.urole.guardnum];
        pm.mflags2 |= (C.M2_PEACEFUL);
        pm.maligntyp = alignmnt * 3;
    }

    /* Fix up the quest nemesis */
    if (C.gu.urole.neminum != C.NON_PM) {
        pm = C.mons[C.gu.urole.neminum];
        pm.msound = C.MS_NEMESIS;
        pm.mflags2 &= ~(C.M2_PEACEFUL);
        pm.mflags2 |= (C.M2_NASTY | C.M2_STALK | C.M2_HOSTILE);
        pm.mflags3 &= ~(C.M3_CLOSE);
        pm.mflags3 |= C.M3_WANTSARTI | C.M3_WAITFORU;
        /* if gender is random, we choose it now instead of waiting
           until the nemesis monster is created */
        C.svq.quest_status.nemgend = C.is_neuter(pm) ? 2 : C.is_female(pm) ? 1
                                   : C.is_male(pm) ? 0 : (C.rn2(100, 2060, "role_init") < 50);
    }

    /* Fix up the god names */
    if (C.flags.pantheon == -1) {             /* new game */
        let trycnt = 0;
        C.flags.pantheon = C.flags.initrole;    /* use own gods */
        /* unless they're missing */
        while (!C.roles[C.flags.pantheon].lgod && ++trycnt < 100)
            C.flags.pantheon = randrole(0);
        if (!C.roles[C.flags.pantheon].lgod) {
            let i;
            for (i = 0; i < C.SIZE(C.roles) - 1; i++)
                if (C.roles[i].lgod) {
                    C.flags.pantheon = i;
                    break;
                }
        }
    }
    if (!C.gu.urole.lgod) {
        C.gu.urole.lgod = C.roles[C.flags.pantheon].lgod;
        C.gu.urole.ngod = C.roles[C.flags.pantheon].ngod;
        C.gu.urole.cgod = C.roles[C.flags.pantheon].cgod;
    }
    /* 0 or 1; no gods are neuter, nor is gender randomized */
    C.svq.quest_status.godgend = !C.strcmpi(C.align_gtitle(alignmnt), "goddess");

    if (C.Role_if(C.PM_CLERIC))
        C.objects[C.SPE_LIGHT].oc_skill = C.P_CLERIC_SPELL;


    /* Artifacts are fixed in hack_artifacts() */

    /* Success! */
    return;
}

export function Hello(mtmp)
{
    switch (C.Role_switch) {
    case C.PM_KNIGHT:
        return "Salutations"; /* Olde English */
    case C.PM_SAMURAI:
        return (mtmp && C.samePtr(mtmp.data, C.mons[C.PM_SHOPKEEPER]))
                    ? "Irasshaimase"
                    : "Konnichi wa"; /* Japanese */
    case C.PM_TOURIST:
        return "Aloha"; /* Hawaiian */
    case C.PM_VALKYRIE:
        return (mtmp && C.samePtr(mtmp.data, C.mons[C.PM_MAIL_DAEMON])) ? "Hallo" :
               "Velkommen"; /* Norse */
    default:
        return "Hello";
    }
}

export function Goodbye()
{
    switch (C.Role_switch) {
    case C.PM_KNIGHT:
        return "Fare thee well"; /* Olde English */
    case C.PM_SAMURAI:
        return "Sayonara"; /* Japanese */
    case C.PM_TOURIST:
        return "Aloha"; /* Hawaiian */
    case C.PM_VALKYRIE:
        return "Farvel"; /* Norse */
    default:
        return "Goodbye";
    }
}

/* if pmindex is any player race (not necessarily the hero's),
   return a pointer to the races[] entry for it; if pmindex is for some
   other type of monster which isn't a player race, return Null */
export function character_race(pmindex)
{
    pmindex = C.short(pmindex);
    let r;

    for (r = C.races[0]; r.noun != 0; r = C.nextRace(r))
        if (r.mnum == pmindex)
            return r;
    return  0;
}

/*--------------------------------------------------------------------------*/

/* potential interface routine */
export function genl_player_selection()
{
    if (C.callLocal(genl_player_setup, 0))
        return;

    /* player cancelled role/race/&c selection, so quit */
    C.nh_terminate(C.EXIT_SUCCESS);
    /*NOTREACHED*/
}

/* ['#else' far below] */


/* try to reduce clutter in the code below... */

/* guts of tty's player_selection() */
export function genl_player_setup(screenheight)
{
    screenheight = C.int(screenheight);
    const pbuf = C.stackAlloc(C.QBUFSZ);
    const any = C.anythingLocal();
    let i, k, n, choice, nextpick;
    let getconfirmation, picksomething;
    let win = C.WIN_ERR;
    const selected = C.menuPointerLocal();
    let clr = C.NO_COLOR;
    let pick4u = 'n'.charCodeAt(0);
    let result = 0; /* assume failure (player chooses to 'quit') */

    C.program_state.in_role_selection++;
    setup_done: { /* affects tty menu cleanup */
    /* Used to avoid "Is this ok?" if player has already specified all
     * four facets of role.
     * Note that rigid_role_checks might force any unspecified facets to
     * have a specific value, but that will still require confirmation;
     * player can specify the forced ones if avoiding that is demanded.
     */
    picksomething = (C.flags.initrole == C.ROLE_NONE || C.flags.initrace == C.ROLE_NONE
                     || C.flags.initgend == C.ROLE_NONE || C.flags.initalign == C.ROLE_NONE);
    /* Used for '-@';
     * choose randomly without asking for all unspecified facets.
     */
    if (C.flags.randomall && picksomething) {
        if (C.flags.initrole == C.ROLE_NONE)
            C.flags.initrole = C.ROLE_RANDOM;
        if (C.flags.initrace == C.ROLE_NONE)
            C.flags.initrace = C.ROLE_RANDOM;
        if (C.flags.initgend == C.ROLE_NONE)
            C.flags.initgend = C.ROLE_RANDOM;
        if (C.flags.initalign == C.ROLE_NONE)
            C.flags.initalign = C.ROLE_RANDOM;
    }

    /* prevent unnecessary prompting if role forces race (samurai) or gender
       (valkyrie) or alignment (rogue), or race forces alignment (orc), &c */
    rigid_role_checks();

    if (C.flags.initrole == C.ROLE_NONE || C.flags.initrace == C.ROLE_NONE
        || C.flags.initgend == C.ROLE_NONE || C.flags.initalign == C.ROLE_NONE) {
        let prompt = C.callLocal(build_plselection_prompt, pbuf, C.QBUFSZ,
                                                C.flags.initrole, C.flags.initrace, C.flags.initgend, C.flags.initalign);
        /* prompt[] contains "Shall I pick ... for you? [ynaq] "
           y - game picks role,&c then asks player to confirm;
           n - player manually chooses via menu selections;
           a - like 'y', but skips confirmation and starts game;
           q - quit
         */
        C.trimspaces(prompt); /* 'prompt' is constructed with trailing space */
        /* accept any character and do validation ourselves so that we can
           shorten prompt; it will be "Shall I pick ... for you? [ynaq] "
           with final space appended by yn_function() [for tty at least] */
        do {
            pick4u = C.yn_function(prompt,  0, '\0'.charCodeAt(0), 0);
            pick4u = C.lowc(pick4u);
            if (pick4u == '\x1b'.charCodeAt(0) || pick4u == 'q'.charCodeAt(0)) /* handle [q] */
                break setup_done;
            if (pick4u == ' '.charCodeAt(0) || pick4u == '\n'.charCodeAt(0) || pick4u == '\r'.charCodeAt(0))
                pick4u = 'y'.charCodeAt(0); /* default */
            else if (pick4u == '@'.charCodeAt(0) || pick4u == '*'.charCodeAt(0))
                pick4u = 'a'.charCodeAt(0); /* similar to '-@' on command line */
            /* TODO? handle response of '?' */
        } while (pick4u != 'y'.charCodeAt(0) && pick4u != 'n'.charCodeAt(0) && pick4u != 'a'.charCodeAt(0)); /* [yna] */

    }

 makepicks: for (;;) {
    nextpick = C.RS_ROLE;
    do {
        if (nextpick == C.RS_ROLE) {
            nextpick = C.RS_RACE;
            /* Select a role, if necessary;
               we'll try to be compatible with pre-selected
               race/gender/alignment, but may not succeed. */
            if (C.flags.initrole < 0) {
                /* process the choice */
                if (pick4u == 'y'.charCodeAt(0) || pick4u == 'a'.charCodeAt(0) || C.flags.initrole == C.ROLE_RANDOM) {
                    /* pick a random role */
                    k = pick_role(C.flags.initrace, C.flags.initgend, C.flags.initalign, C.PICK_RANDOM);
                    if (k < 0) {
                        C.pline("Incompatible role!");
                        k = randrole(0);
                    }
                } else {
                    /* 'excess' is used to try to avoid tty pagination */
                    let excess = maybe_skip_seps(screenheight, C.RS_ROLE);

                    /* prompt for a role */
                    win = C.callLocal(plsel_startmenu, screenheight, C.RS_ROLE);
                    /* populate the menu with role choices */
                    C.callLocal(setup_rolemenu, win, 1, C.flags.initrace, C.flags.initgend, C.flags.initalign);
                    /* add miscellaneous menu entries */
                    C.callLocal(role_menu_extra, C.ROLE_RANDOM, win, 1);
                    C.copyAnything(any, C.cg.zeroany); /* separator, not a choice */
                    if (excess < 1 || excess > 2)
                        C.add_menu_str(win, "");
                    C.callLocal(role_menu_extra, C.RS_RACE, win, 0);
                    C.callLocal(role_menu_extra, C.RS_GENDER, win, 0);
                    C.callLocal(role_menu_extra, C.RS_ALGNMNT, win, 0);
                    C.callLocal(role_menu_extra, C.RS_filter, win, 0);
                    C.callLocal(role_menu_extra, C.ROLE_NONE, win, 0); /* quit */
                    C.Strcpy(pbuf, "Pick a role or profession");
                    C.end_menu(win, pbuf);
                    n = C.select_menu(win, C.PICK_ONE, selected);
                    /*
                     * PICK_ONE with preselected choice behaves strangely:
                     *  n == -1 -- <escape>, so use quit choice;
                     *  n ==  0 -- explicitly chose preselected entry,
                     *             toggling it off, so use it;
                     *  n ==  1 -- implicitly chose preselected entry
                     *             with <space> or <return>;
                     *  n ==  2 -- explicitly chose a different entry, so
                     *             both it and preselected one are in list.
                     */
                    if (n > 0) {
                        choice = selected.value[0].item.a_int;
                        if (n > 1 && choice == C.ROLE_RANDOM)
                            choice = selected.value[1].item.a_int;
                    } else
                        choice = (n == 0) ? C.ROLE_RANDOM : C.ROLE_NONE;
                    if (selected.value)
                        C.free(selected.value), selected.value = 0;
                    C.destroy_nhwindow(win), win = C.WIN_ERR;

                    if (choice == C.ROLE_NONE) {
                        break setup_done; /* selected quit */
                    } else if (choice == C.RS_menu_arg(C.RS_ALGNMNT)) {
                        C.flags.initalign = k = C.ROLE_NONE;
                        nextpick = C.RS_ALGNMNT;
                    } else if (choice == C.RS_menu_arg(C.RS_GENDER)) {
                        C.flags.initgend = k = C.ROLE_NONE;
                        nextpick = C.RS_GENDER;
                    } else if (choice == C.RS_menu_arg(C.RS_RACE)) {
                        C.flags.initrace = k = C.ROLE_NONE;
                        nextpick = C.RS_RACE;
                    } else if (choice == C.RS_menu_arg(C.RS_filter)) {
                        C.flags.initrole = k = C.ROLE_NONE;
                        C.callLocal(reset_role_filtering);
                        nextpick = C.RS_ROLE;
                    } else if (choice == C.ROLE_RANDOM) {
                        k = pick_role(C.flags.initrace, C.flags.initgend, C.flags.initalign, C.PICK_RANDOM);
                        if (k < 0)
                            k = randrole(0);
                    } else {
                        k = choice - 1;
                    }
                }
                C.flags.initrole = k;
            } /* needed role */
        }     /* picking role */

        if (nextpick == C.RS_RACE) {
            nextpick = (C.flags.initrole < 0) ? C.RS_ROLE : C.RS_GENDER;
            /* Select a race, if necessary;
               force compatibility with role, try for compatibility
               with pre-selected gender/alignment. */
            if (C.flags.initrace < 0 || !validrace(C.flags.initrole, C.flags.initrace)) {
                /* no race yet, or pre-selected race not valid */
                if (pick4u == 'y'.charCodeAt(0) || pick4u == 'a'.charCodeAt(0) || C.flags.initrace == C.ROLE_RANDOM) {
                    k = pick_race(C.flags.initrole, C.flags.initgend, C.flags.initalign, C.PICK_RANDOM);
                    if (k < 0) {
                        C.pline("Incompatible race!");
                        k = randrace(C.flags.initrole);
                    }
                } else { /* pick4u == 'n' */
                    /* Count the number of valid races */
                    n = 0; /* number valid */
                    k = 0; /* valid race */
                    for (i = 0; C.races[i].noun; i++)
                        if (ok_race(C.flags.initrole, i, C.flags.initgend, C.flags.initalign)) {
                            n++;
                            k = i;
                        }
                    if (n == 0) {
                        for (i = 0; C.races[i].noun; i++)
                            if (validrace(C.flags.initrole, i)) {
                                n++;
                                k = i;
                            }
                    }
                    /* Permit the user to pick, if there is more than one */
                    if (n > 1) {
                        win = C.callLocal(plsel_startmenu, screenheight, C.RS_RACE);
                        C.copyAnything(any, C.cg.zeroany); /* zero out all bits */
                        /* populate the menu with role choices */
                        C.callLocal(setup_racemenu, win, 1, C.flags.initrole, C.flags.initgend, C.flags.initalign);
                        /* add miscellaneous menu entries */
                        C.callLocal(role_menu_extra, C.ROLE_RANDOM, win, 1);
                        any.a_int = 0; /* separator, not a choice */
                        C.add_menu_str(win, "");
                        C.callLocal(role_menu_extra, C.RS_ROLE, win, 0);
                        C.callLocal(role_menu_extra, C.RS_GENDER, win, 0);
                        C.callLocal(role_menu_extra, C.RS_ALGNMNT, win, 0);
                        C.callLocal(role_menu_extra, C.RS_filter, win, 0);
                        C.callLocal(role_menu_extra, C.ROLE_NONE, win, 0); /* quit */
                        C.Strcpy(pbuf, "Pick a race or species");
                        C.end_menu(win, pbuf);
                        n = C.select_menu(win, C.PICK_ONE, selected);
                        if (n > 0) {
                            choice = selected.value[0].item.a_int;
                            if (n > 1 && choice == C.ROLE_RANDOM)
                                choice = selected.value[1].item.a_int;
                        } else
                            choice = (n == 0) ? C.ROLE_RANDOM : C.ROLE_NONE;
                        if (selected.value)
                            C.free(selected.value), selected.value = 0;
                        C.destroy_nhwindow(win), win = C.WIN_ERR;

                        if (choice == C.ROLE_NONE) {
                            break setup_done; /* selected quit */
                        } else if (choice == C.RS_menu_arg(C.RS_ALGNMNT)) {
                            C.flags.initalign = k = C.ROLE_NONE;
                            nextpick = C.RS_ALGNMNT;
                        } else if (choice == C.RS_menu_arg(C.RS_GENDER)) {
                            C.flags.initgend = k = C.ROLE_NONE;
                            nextpick = C.RS_GENDER;
                        } else if (choice == C.RS_menu_arg(C.RS_ROLE)) {
                            C.flags.initrole = k = C.ROLE_NONE;
                            nextpick = C.RS_ROLE;
                        } else if (choice == C.RS_menu_arg(C.RS_filter)) {
                            C.flags.initrace = k = C.ROLE_NONE;
                            if (C.callLocal(reset_role_filtering))
                                nextpick = C.RS_ROLE;
                            else
                                nextpick = C.RS_RACE;
                        } else if (choice == C.ROLE_RANDOM) {
                            k = pick_race(C.flags.initrole, C.flags.initgend, C.flags.initalign, C.PICK_RANDOM);
                            if (k < 0)
                                k = randrace(C.flags.initrole);
                        } else {
                            k = choice - 1;
                        }
                    }
                }
                C.flags.initrace = k;
            } /* needed race */
        }     /* picking race */

        if (nextpick == C.RS_GENDER) {
            nextpick = (C.flags.initrole < 0) ? C.RS_ROLE : (C.flags.initrace < 0) ? C.RS_RACE
                       : C.RS_ALGNMNT;
            /* Select a gender, if necessary;
               force compatibility with role/race, try for compatibility
               with pre-selected alignment. */
            if (C.flags.initgend < 0 || !validgend(C.flags.initrole, C.flags.initrace, C.flags.initgend)) {
                /* no gender yet, or pre-selected gender not valid */
                if (pick4u == 'y'.charCodeAt(0) || pick4u == 'a'.charCodeAt(0) || C.flags.initgend == C.ROLE_RANDOM) {
                    k = pick_gend(C.flags.initrole, C.flags.initrace, C.flags.initalign, C.PICK_RANDOM);
                    if (k < 0) {
                        C.pline("Incompatible gender!");
                        k = randgend(C.flags.initrole, C.flags.initrace);
                    }
                } else { /* pick4u == 'n' */
                    /* Count the number of valid genders */
                    n = 0; /* number valid */
                    k = 0; /* valid gender */
                    for (i = 0; i < C.ROLE_GENDERS; i++)
                        if (ok_gend(C.flags.initrole, C.flags.initrace, i, C.flags.initalign)) {
                            n++;
                            k = i;
                        }
                    if (n == 0) {
                        for (i = 0; i < C.ROLE_GENDERS; i++)
                            if (validgend(C.flags.initrole, C.flags.initrace, i)) {
                                n++;
                                k = i;
                            }
                    }
                    /* Permit the user to pick, if there is more than one */
                    if (n > 1) {
                        win = C.callLocal(plsel_startmenu, screenheight, C.RS_GENDER);
                        C.copyAnything(any, C.cg.zeroany); /* zero out all bits */
                        /* populate the menu with gender choices */
                        C.callLocal(setup_gendmenu, win, 1, C.flags.initrole, C.flags.initrace, C.flags.initalign);
                        /* add miscellaneous menu entries */
                        C.callLocal(role_menu_extra, C.ROLE_RANDOM, win, 1);
                        any.a_int = 0; /* separator, not a choice */
                        C.add_menu_str(win, "");
                        C.callLocal(role_menu_extra, C.RS_ROLE, win, 0);
                        C.callLocal(role_menu_extra, C.RS_RACE, win, 0);
                        C.callLocal(role_menu_extra, C.RS_ALGNMNT, win, 0);
                        C.callLocal(role_menu_extra, C.RS_filter, win, 0);
                        C.callLocal(role_menu_extra, C.ROLE_NONE, win, 0); /* quit */
                        C.Strcpy(pbuf, "Pick a gender or sex");
                        C.end_menu(win, pbuf);
                        n = C.select_menu(win, C.PICK_ONE, selected);
                        if (n > 0) {
                            choice = selected.value[0].item.a_int;
                            if (n > 1 && choice == C.ROLE_RANDOM)
                                choice = selected.value[1].item.a_int;
                        } else
                            choice = (n == 0) ? C.ROLE_RANDOM : C.ROLE_NONE;
                        if (selected.value)
                            C.free(selected.value), selected.value = 0;
                        C.destroy_nhwindow(win), win = C.WIN_ERR;

                        if (choice == C.ROLE_NONE) {
                            break setup_done; /* selected quit */
                        } else if (choice == C.RS_menu_arg(C.RS_ALGNMNT)) {
                            C.flags.initalign = k = C.ROLE_NONE;
                            nextpick = C.RS_ALGNMNT;
                        } else if (choice == C.RS_menu_arg(C.RS_RACE)) {
                            C.flags.initrace = k = C.ROLE_NONE;
                            nextpick = C.RS_RACE;
                        } else if (choice == C.RS_menu_arg(C.RS_ROLE)) {
                            C.flags.initrole = k = C.ROLE_NONE;
                            nextpick = C.RS_ROLE;
                        } else if (choice == C.RS_menu_arg(C.RS_filter)) {
                            C.flags.initgend = k = C.ROLE_NONE;
                            if (C.callLocal(reset_role_filtering))
                                nextpick = C.RS_ROLE;
                            else
                                nextpick = C.RS_GENDER;
                        } else if (choice == C.ROLE_RANDOM) {
                            k = pick_gend(C.flags.initrole, C.flags.initrace, C.flags.initalign, C.PICK_RANDOM);
                            if (k < 0)
                                k = randgend(C.flags.initrole, C.flags.initrace);
                        } else {
                            k = choice - 1;
                        }
                    }
                }
                C.flags.initgend = k;
            } /* needed gender */
        }     /* picking gender */

        if (nextpick == C.RS_ALGNMNT) {
            nextpick = (C.flags.initrole < 0) ? C.RS_ROLE
                       : (C.flags.initrace < 0) ? C.RS_RACE
                         : C.RS_GENDER;
            /* Select an alignment, if necessary;
               force compatibility with role/race/gender. */
            if (C.flags.initalign < 0 || !validalign(C.flags.initrole, C.flags.initrace, C.flags.initalign)) {
                /* no alignment yet, or pre-selected alignment not valid */
                if (pick4u == 'y'.charCodeAt(0) || pick4u == 'a'.charCodeAt(0) || C.flags.initalign == C.ROLE_RANDOM) {
                    k = pick_align(C.flags.initrole, C.flags.initrace, C.flags.initgend, C.PICK_RANDOM);
                    if (k < 0) {
                        C.pline("Incompatible alignment!");
                        k = randalign(C.flags.initrole, C.flags.initrace);
                    }
                } else { /* pick4u == 'n' */
                    /* Count the number of valid alignments */
                    n = 0; /* number valid */
                    k = 0; /* valid alignment */
                    for (i = 0; i < C.ROLE_ALIGNS; i++)
                        if (ok_align(C.flags.initrole, C.flags.initrace, C.flags.initgend, i)) {
                            n++;
                            k = i;
                        }
                    if (n == 0) {
                        for (i = 0; i < C.ROLE_ALIGNS; i++)
                            if (validalign(C.flags.initrole, C.flags.initrace, i)) {
                                n++;
                                k = i;
                            }
                    }
                    /* Permit the user to pick, if there is more than one */
                    if (n > 1) {
                        win = C.callLocal(plsel_startmenu, screenheight, C.RS_ALGNMNT);
                        C.copyAnything(any, C.cg.zeroany); /* zero out all bits */
                        C.callLocal(setup_algnmenu, win, 1, C.flags.initrole, C.flags.initrace, C.flags.initgend);
                        C.callLocal(role_menu_extra, C.ROLE_RANDOM, win, 1);
                        any.a_int = 0; /* separator, not a choice */
                        C.add_menu_str(win, "");
                        C.callLocal(role_menu_extra, C.RS_ROLE, win, 0);
                        C.callLocal(role_menu_extra, C.RS_RACE, win, 0);
                        C.callLocal(role_menu_extra, C.RS_GENDER, win, 0);
                        C.callLocal(role_menu_extra, C.RS_filter, win, 0);
                        C.callLocal(role_menu_extra, C.ROLE_NONE, win, 0); /* quit */
                        C.Strcpy(pbuf, "Pick an alignment or creed");
                        C.end_menu(win, pbuf);
                        n = C.select_menu(win, C.PICK_ONE, selected);
                        if (n > 0) {
                            choice = selected.value[0].item.a_int;
                            if (n > 1 && choice == C.ROLE_RANDOM)
                                choice = selected.value[1].item.a_int;
                        } else
                            choice = (n == 0) ? C.ROLE_RANDOM : C.ROLE_NONE;
                        if (selected.value)
                            C.free(selected.value), selected.value = 0;
                        C.destroy_nhwindow(win), win = C.WIN_ERR;

                        if (choice == C.ROLE_NONE) {
                            break setup_done; /* selected quit */
                        } else if (choice == C.RS_menu_arg(C.RS_GENDER)) {
                            C.flags.initgend = k = C.ROLE_NONE;
                            nextpick = C.RS_GENDER;
                        } else if (choice == C.RS_menu_arg(C.RS_RACE)) {
                            C.flags.initrace = k = C.ROLE_NONE;
                            nextpick = C.RS_RACE;
                        } else if (choice == C.RS_menu_arg(C.RS_ROLE)) {
                            C.flags.initrole = k = C.ROLE_NONE;
                            nextpick = C.RS_ROLE;
                        } else if (choice == C.RS_menu_arg(C.RS_filter)) {
                            C.flags.initalign = k = C.ROLE_NONE;
                            if (C.callLocal(reset_role_filtering))
                                nextpick = C.RS_ROLE;
                            else
                                nextpick = C.RS_ALGNMNT;
                        } else if (choice == C.ROLE_RANDOM) {
                            k = pick_align(C.flags.initrole, C.flags.initrace, C.flags.initgend, C.PICK_RANDOM);
                            if (k < 0)
                                k = randalign(C.flags.initrole, C.flags.initrace);
                        } else {
                            k = choice - 1;
                        }
                    }
                }
                C.flags.initalign = k;
            } /* needed alignment */
        }     /* picking alignment */

    } while (C.flags.initrole < 0 || C.flags.initrace < 0 || C.flags.initgend < 0 || C.flags.initalign < 0);

    /*
     *  Role, race, &c have now been determined;
     *  ask for confirmation and maybe go back to choose all over again.
     *
     *  Uses ynaq for familiarity, although 'a' is usually a
     *  superset of 'y' but here is an alternate form of 'n'.
     *  Menu layout:
     *   title:  Is this ok? [ynaq]
     *   blank:
     *    text:  $name, $alignment $gender $race $role
     *   blank:
     *    menu:  y + yes; play
     *           n - no; pick again
     *   maybe:  a - no; rename hero
     *           q - quit
     *           (end)
     */
    getconfirmation = (picksomething && pick4u != 'a'.charCodeAt(0) && !C.flags.randomall);
    while (getconfirmation) {
        win = C.callLocal(plsel_startmenu, screenheight, C.RS_filter); /* filter: not ROLE */
        C.copyAnything(any, C.cg.zeroany); /* zero out all bits */
        /* [ynaq] menu choices */
        any.a_int = 1;
        C.add_menu(win, C.nulGlyphInfo(), any, 'y'.charCodeAt(0), 0,
                 C.ATR_NONE, clr, "Yes; start game", C.MENU_ITEMFLAGS_SELECTED);
        any.a_int = 2;
        C.add_menu(win, C.nulGlyphInfo(), any, 'n'.charCodeAt(0), 0,
                 C.ATR_NONE, clr, "No; choose role again", C.MENU_ITEMFLAGS_NONE);
        if (C.iflags.renameallowed) {
            any.a_int = 3;
            C.add_menu(win, C.nulGlyphInfo(), any, 'a'.charCodeAt(0), 0, C.ATR_NONE,
                     clr, "Not yet; choose another name",
                     C.MENU_ITEMFLAGS_NONE);
        }
        any.a_int = -1;
        C.add_menu(win, C.nulGlyphInfo(), any, 'q'.charCodeAt(0), 0,
                 C.ATR_NONE, clr, "Quit", C.MENU_ITEMFLAGS_NONE);
        C.Sprintf(pbuf, "Is this ok? [yn%sq]", C.iflags.renameallowed ? "a" : "");
        C.end_menu(win, pbuf);
        n = C.select_menu(win, C.PICK_ONE, selected);
        /* [pick-one menus with a preselected entry behave oddly...] */
        choice = (n > 0) ? selected.value[n - 1].item.a_int : (n == 0) ? 1 : -1;
        if (selected.value)
            C.free(selected.value), selected.value = 0;
        C.destroy_nhwindow(win);

        switch (choice) {
        default: /* 'q' or ESC */
            break setup_done; /* quit */
            break;
        case 3: { /* 'a' */
            /*
             * TODO: what, if anything, should be done if the name is
             * changed to or from "wizard" after port-specific startup
             * code has set flags.debug based on the original name?
             */
            let saveROLE, saveRACE, saveGEND, saveALGN;

            C.iflags.renameinprogress = 1; /* affects main() in unixmain.c */
            /* plnamesuffix() can change any or all of ROLE, RACE,
               GEND, ALGN; we'll override that and honor only the name */
            saveROLE = C.flags.initrole, saveRACE = C.flags.initrace,
            saveGEND = C.flags.initgend, saveALGN = C.flags.initalign;
            C.storeChar(C.svp.plname + (0), '\0'.charCodeAt(0));
            plnamesuffix(); /* calls askname() when svp.plname[] is empty */
            C.flags.initrole = saveROLE, C.flags.initrace = saveRACE,
            C.flags.initgend = saveGEND, C.flags.initalign = saveALGN;
            break; /* getconfirmation is still True */
        }
        case 2: /* 'n' */
            /* start fresh, but bypass "shall I pick everything for you?"
               step; any partial role selection via config file, command
               line, or name suffix is discarded this time */
            pick4u = 'n'.charCodeAt(0);
            C.flags.initrole = C.flags.initrace = C.flags.initgend = C.flags.initalign = C.ROLE_NONE;
            continue makepicks;
            break;
        case 1: /* 'y' or Space or Return/Enter */
            /* success; drop out through end of function */
            getconfirmation = 0;
            break;
        }
    } /* while 'getconfirmation' */
    /* Success! */
    result = 1;
    break makepicks;
    }
    }

    C.program_state.in_role_selection--;
    return result;
}

export function reset_role_filtering()
{
    let win;
    let i, n;
    const filterprompt = C.stackAlloc(C.QBUFSZ);
    const selected = C.menuPointerLocal();

    win = C.create_nhwindow(C.NHW_MENU);
    C.start_menu(win, C.MENU_BEHAVE_STANDARD);

    /* no extra blank line preceding this entry; end_menu supplies one */
    C.add_menu_str(win, "Unacceptable roles");
    C.callLocal(setup_rolemenu, win, 0, C.ROLE_NONE, C.ROLE_NONE, C.ROLE_NONE);

    C.add_menu_str(win, "");
    C.add_menu_str(win, "Unacceptable races");
    C.callLocal(setup_racemenu, win, 0, C.ROLE_NONE, C.ROLE_NONE, C.ROLE_NONE);

    C.add_menu_str(win, "");
    C.add_menu_str(win, "Unacceptable genders");
    C.callLocal(setup_gendmenu, win, 0, C.ROLE_NONE, C.ROLE_NONE, C.ROLE_NONE);

    C.add_menu_str(win, "");
    C.add_menu_str(win, "Unacceptable alignments");
    C.callLocal(setup_algnmenu, win, 0, C.ROLE_NONE, C.ROLE_NONE, C.ROLE_NONE);

    C.Sprintf(filterprompt, "Pick all that apply%s",
            gotrolefilter() ? " and/or unpick any that no longer apply" : "");
    C.end_menu(win, filterprompt);
    n = C.select_menu(win, C.PICK_ANY, selected);

    if (n >= 0) { /* n==0: clear current filters and don't set new ones */
        clearrolefilter(C.RS_filter);
        for (i = 0; i < n; i++)
            setrolefilter(selected.value[i].item.a_string);

        C.flags.initrole = C.flags.initrace = C.flags.initgend = C.flags.initalign = C.ROLE_NONE;
    }
    if (selected.value)
        C.free(selected.value), selected.value = 0;
    C.destroy_nhwindow(win);
    return (n > 0) ? 1 : 0;
}

/* the change in format when this extended role selection was converted from
   tty-only to tty+curses+? made the role selection menu require two pages
   on a traditional 24-line tty; that wasn't fair to tty, so squeeze out
   some blank separator lines from the menu if that will make it fit on one */
export function maybe_skip_seps(rows, aspect)
{
    rows = C.int(rows);
    aspect = C.int(aspect);
    let i, n = 0;

    /* not much point to generalizing this to other aspects */
    if (aspect != C.RS_ROLE)
        return 0;
    /*
     * If there are one or two excess lines, setup_rolemenu() will omit
     * the separator between 'random' and 'pick race first'.  If there are
     * two, plsel_startmenu() will omit the one between role info so far
     * ("<role> <race> ...") and the set of role entries.
     */

    n += 4; /* title and ensuing separator, role info so far and separator */
    for (i = 0; C.roles[i].name.m; ++i)
        if (ok_role(i, C.flags.initrace, C.flags.initgend, C.flags.initalign) && ok_race(i, C.flags.initrace, C.flags.initgend, C.flags.initalign)
            && ok_gend(i, C.flags.initrace, C.flags.initgend, C.flags.initalign) && ok_align(i, C.flags.initrace, C.flags.initgend, C.flags.initalign))
            ++n;
    n += 2; /* 'random' and separator */
    n += 5; /* race 1st, gender 1st, alignment 1st, reset filter, quit */
    n += 1; /* footer/prompt */
    if (rows > 0 && n > rows)
        return n - rows;
    return 0;
}

/* start a menu; show role aspects specified so far as a header line */
export function plsel_startmenu(ttyrows, aspect)
{
    ttyrows = C.int(ttyrows);
    aspect = C.int(aspect);
    const qbuf = C.stackAlloc(C.QBUFSZ);
    let win;
    let rolename;

    /* whatever aspect was just chosen might force others (Orc => chaotic,
       Samurai => Human+lawful, Valkyrie => female) */
    rigid_role_checks();

    rolename = (C.flags.initrole < 0) ? "<role>"
               : (C.flags.initgend == 1 && C.roles[C.flags.initrole].name.f) ? C.roles[C.flags.initrole].name.f
                 : C.roles[C.flags.initrole].name.m;
    if (!C.loadChar(C.svp.plname + (0)) || C.flags.initrole < 0 || C.flags.initrace < 0 || C.flags.initgend < 0 || C.flags.initalign < 0) {
        /* "<role> <race.noun> <gender> <alignment>" */
        C.Sprintf(qbuf, "%.20s %.20s %.20s %.20s",
                rolename,
                (C.flags.initrace < 0) ? "<race>" : C.races[C.flags.initrace].noun,
                (C.flags.initgend < 0) ? "<gender>" : C.genders[C.flags.initgend].adj,
                (C.flags.initalign < 0) ? "<alignment>" : C.aligns[C.flags.initalign].adj);
    } else {
        /* "<name> the <alignment> <gender> <race.adjective> <role>" */
        C.Sprintf(qbuf, "%.20s the %.20s %.20s %.20s %.20s",
                C.svp.plname,
                C.aligns[C.flags.initalign].adj,
                C.genders[C.flags.initgend].adj,
                C.races[C.flags.initrace].adj,
                rolename);
    }

    win = C.create_nhwindow(C.NHW_MENU);
    if (win == C.WIN_ERR)
        C.panic("could not create role selection window");
    C.start_menu(win, C.MENU_BEHAVE_STANDARD);

    C.add_menu_str(win, qbuf);
    if (maybe_skip_seps(ttyrows, aspect) != 2)
        C.add_menu_str(win, "");
    return win;
}


/* add entries a-Archeologist, b-Barbarian, &c to menu being built in 'win' */
export function setup_rolemenu(win, filtering, race, gend, algn)
{
    win = C.int(win);
    filtering = C.boolean(filtering);
    race = C.int(race);
    gend = C.int(gend);
    algn = C.int(algn);
    const any = C.anythingLocal();
    let i;
    let role_ok;
    let thisch, lastch = '\0'.charCodeAt(0); const rolenamebuf = C.stackAlloc(50);
    let clr = C.NO_COLOR;

    C.copyAnything(any, C.cg.zeroany); /* zero out all bits */
    for (i = 0; C.roles[i].name.m; i++) {
        /* role can be constrained by any of race, gender, or alignment */
        role_ok = (ok_role(i, race, gend, algn)
                   && ok_race(i, race, gend, algn)
                   && ok_gend(i, race, gend, algn)
                   && ok_align(i, race, gend, algn));
        if (filtering && !role_ok)
            continue;
        if (filtering)
            any.a_int = i + 1;
        else
            any.a_string = C.roles[i].name.m;
        thisch = C.lowc(C.loadChar(C.roles[i].name.m));
        if (thisch == lastch)
            thisch = C.highc(thisch);
        C.Strcpy(rolenamebuf, C.roles[i].name.m);
        if (C.roles[i].name.f) {
            /* role has distinct name for female (C,P) */
            if (gend == 1) {
                /* female already chosen; replace male name */
                C.Strcpy(rolenamebuf, C.roles[i].name.f);
            } else if (gend < 0) {
                /* not chosen yet; append slash+female name */
                C.Strcat(rolenamebuf, "/");
                C.Strcat(rolenamebuf, C.roles[i].name.f);
            }
        }
        /* !filtering implies reset_role_filtering() where we want to
           mark this role as preselected if current filter excludes it */
        C.add_menu(win, C.nulGlyphInfo(), any, thisch, 0,
                 C.ATR_NONE, clr, C.an(rolenamebuf),
                 (!filtering && !role_ok)
                    ? C.MENU_ITEMFLAGS_SELECTED : C.MENU_ITEMFLAGS_NONE);
        lastch = thisch;
    }
}

export function setup_racemenu(win, filtering, role, gend, algn)
{
    win = C.int(win);
    filtering = C.boolean(filtering);
    role = C.int(role);
    gend = C.int(gend);
    algn = C.int(algn);
    const any = C.anythingLocal();
    let race_ok;
    let i;
    let this_ch;
    let clr = C.NO_COLOR;

    C.copyAnything(any, C.cg.zeroany);
    for (i = 0; C.races[i].noun; i++) {
        /* no ok_gend(); race isn't constrained by gender */
        race_ok = (ok_race(role, i, gend, algn)
                   && ok_role(role, i, gend, algn)
                   && ok_align(role, i, gend, algn));
        if (filtering && !race_ok)
            continue;
        if (filtering)
            any.a_int = i + 1;
        else
            any.a_string = C.races[i].noun;
        this_ch = C.loadChar(C.races[i].noun);
        /* filtering: picking race, so choose by first letter, with
           capital letter as unseen accelerator;
           !filtering: resetting filter rather than picking, choose by
           capital letter since lowercase role letters will be present */
        C.add_menu(win, C.nulGlyphInfo(), any,
                 filtering ? this_ch : C.highc(this_ch),
                 filtering ? C.highc(this_ch) : 0,
                 C.ATR_NONE, clr, C.races[i].noun,
                 (!filtering && !race_ok)
                    ? C.MENU_ITEMFLAGS_SELECTED : C.MENU_ITEMFLAGS_NONE);
    }
}

export function setup_gendmenu(win, filtering, role, race, algn)
{
    win = C.int(win);
    filtering = C.boolean(filtering);
    role = C.int(role);
    race = C.int(race);
    algn = C.int(algn);
    const any = C.anythingLocal();
    let gend_ok;
    let i;
    let this_ch;
    let clr = C.NO_COLOR;

    C.copyAnything(any, C.cg.zeroany);
    for (i = 0; i < C.ROLE_GENDERS; i++) {
        /* no ok_align(); gender isn't constrained by alignment */
        gend_ok = (ok_gend(role, race, i, algn)
                   && ok_role(role, race, i, algn)
                   && ok_race(role, race, i, algn));
        if (filtering && !gend_ok)
            continue;
        if (filtering)
            any.a_int = i + 1;
        else
            any.a_string = C.genders[i].adj;
        this_ch = C.loadChar(C.genders[i].adj);
        /* (see setup_racemenu for explanation of selector letters
           and setup_rolemenu for preselection) */
        C.add_menu(win, C.nulGlyphInfo(), any,
                 filtering ? this_ch : C.highc(this_ch),
                 filtering ? C.highc(this_ch) : 0,
                 C.ATR_NONE, clr, C.genders[i].adj,
                 (!filtering && !gend_ok)
                    ? C.MENU_ITEMFLAGS_SELECTED : C.MENU_ITEMFLAGS_NONE);
    }
}

export function setup_algnmenu(win, filtering, role, race, gend)
{
    win = C.int(win);
    filtering = C.boolean(filtering);
    role = C.int(role);
    race = C.int(race);
    gend = C.int(gend);
    const any = C.anythingLocal();
    let algn_ok;
    let i;
    let this_ch;
    let clr = C.NO_COLOR;

    C.copyAnything(any, C.cg.zeroany);
    for (i = 0; i < C.ROLE_ALIGNS; i++) {
        /* no ok_gend(); alignment isn't constrained by gender */
        algn_ok = (ok_align(role, race, gend, i)
                   && ok_role(role, race, gend, i)
                   && ok_race(role, race, gend, i));
        if (filtering && !algn_ok)
            continue;
        if (filtering)
            any.a_int = i + 1;
        else
            any.a_string = C.aligns[i].adj;
        this_ch = C.loadChar(C.aligns[i].adj);
        /* (see setup_racemenu for explanation of selector letters
           and setup_rolemenu for preselection) */
        C.add_menu(win, C.nulGlyphInfo(), any,
                 filtering ? this_ch : C.highc(this_ch),
                 filtering ? C.highc(this_ch) : 0,
                 C.ATR_NONE, clr, C.aligns[i].adj,
                 (!filtering && !algn_ok)
                    ? C.MENU_ITEMFLAGS_SELECTED : C.MENU_ITEMFLAGS_NONE);
    }
}


/* role.c */

/* OBSOLETE */

/* elf-maid */

/* warrior */

/* commander (Q.) ['a] educated guess,
                                          until further research- SAC */

/* king's servant, minister (Q.) - guess */

/* lord, lady (S.) ['ir] */

/* noble elf, maiden (S.) */

/* prince (S.), elf-maiden (Q.) */

/* Star-king, -queen (Q.) */

/* Elven */

/* 'if' and 'else' had duplicate code here; probably a copy+parse
         * oversight; if a problem with filtering of random role selection
         * crops up, this is probably the place to start looking */

/* if race specified, and multiple choice of alignments for it */

/* the four lines of code below were in both 'if' and 'else' above */

/*
 * Disable this fixup so that mons[] can be const.  The only
 * place where it actually matters for the hero is in set_uasmon()
 * and that can use mons[race] rather than mons[role] for this
 * particular property.  Despite the comment, it is checked--where
 * needed--via intrinsic 'Infravision' which set_uasmon() manages.
 */

/* Fix up infravision */

/* although an infravision intrinsic is possible, infravision
         * is purely a property of the physical race.  This means that we
         * must put the infravision flag in the player's current race
         * (either that or have separate permonst entries for
         * elven/non-elven members of each class).  The side effect is that
         * all NPCs of that class will have (probably bogus) infravision,
         * but since infravision has no effect for NPCs anyway we can
         * ignore this.
         */

/*0*/

/* slightly simpler but more likely to end up being wrapped */

/* strip choices off prompt string; yn_function() will show them */

/* remove trailing space */

/* prompt becomes "Shall I pick ... for you? [ynaq] (y) "
           with " [ynaq] (y) " appended by yn_function() which also changes
           user's <space> and <return> to 'y', <escape> to 'q' */

/* bail */

/* True => exclude filtered roles;
                        * False => filter reset */

/* all ROLE_NONE for !filtering case */

/* !TTY_GRAPHICS */

/* ?TTY_GRAPHICS */
