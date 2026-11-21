// role.js — roles, races, genders and alignments, and role selection.
// C ref: src/role.c (roles[], races[], genders[], aligns[] and the
//        functions below), include/you.h (struct Role, struct Race,
//        struct Gender, struct Align), include/hack.h (UNDEFINED_ROLE,
//        UNDEFINED_RACE, IndexOkT), include/winprocs.h (RS_filter,
//        RS_menu_arg).
//
// The tables are role.c transcribed entry for entry, with the struct
// fields named as in you.h. A C string pointer that is 0 is null here.
// Like C, roles[] and races[] end with a terminator entry, so SIZE(roles)
// is NUM_ROLES + 1 and SIZE(races) is NUM_RACES + 1.
//
// Also ported: the str2xxx/validxxx/randxxx/ok_xxx/pick_xxx helpers, the
// role filter, plnamesuffix(), role_init(), Hello()/Goodbye(), and the
// tty player selection (genl_player_setup() with its prompt and menu
// builders). Not ported: role_selection_prolog() (curses/X11 only).
// The window calls go to wintty.js (C: the windowprocs of the tty port).

import { game } from './gstate.js';
import { rn2, rn2_on_display_rng } from './rng.js';
import { strncmpi, strcmpi } from './hacklib.js';
import {
    SIZE, NON_PM, STR18, A_INT, A_WIS, A_LAWFUL, A_NEUTRAL, A_CHAOTIC, A_NONE,
    ROLE_MALE, ROLE_FEMALE, ROLE_NEUTER, ROLE_LAWFUL, ROLE_NEUTRAL,
    ROLE_CHAOTIC, ROLE_RACEMASK, ROLE_GENDMASK, ROLE_ALIGNMASK, ROLE_NONE,
    ROLE_RANDOM, ROLE_GENDERS, ROLE_ALIGNS, PICK_RANDOM, PICK_RIGID, RS_ROLE,
    RS_RACE, RS_GENDER, RS_ALGNMNT, PL_CSIZ, P_CLERIC_SPELL, RS_NAME,
    AM_LAWFUL, AM_NEUTRAL, AM_CHAOTIC, BP_ALIGN, BP_GEND, BP_RACE, BP_ROLE,
    NUM_BP, BUFSZ, QBUFSZ, NHW_MENU, WIN_ERR, PICK_ONE, PICK_ANY,
    MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE, MENU_ITEMFLAGS_SELECTED,
} from './const.js';
import { NO_COLOR, ATR_NONE } from './terminal.js';
import {
    mons, MS_LEADER, MS_NEMESIS, M2_PEACEFUL, M2_NASTY, M2_STALK, M2_HOSTILE,
    M3_CLOSE, M3_WANTSARTI, M3_WAITFORU, MH_HUMAN, MH_ELF, MH_DWARF, MH_GNOME,
    MH_ORC, S_ANT, S_BAT, S_CENTAUR, S_DOG, S_ELEMENTAL, S_GIANT, S_HUMANOID,
    S_IMP, S_JELLY, S_MUMMY, S_NAGA, S_NYMPH, S_OGRE, S_RODENT, S_SNAKE,
    S_SPIDER, S_TROLL, S_WRAITH, S_XORN, S_YETI, S_ZOMBIE,
    PM_ABBOT, PM_ACOLYTE, PM_APPRENTICE, PM_ARCH_PRIEST, PM_ARCHEOLOGIST,
    PM_ASHIKAGA_TAKAUJI, PM_ATTENDANT, PM_BARBARIAN, PM_BUGBEAR,
    PM_CAVE_DWELLER, PM_CHIEFTAIN, PM_CHROMATIC_DRAGON, PM_CLERIC, PM_CYCLOPS,
    PM_DARK_ONE, PM_DWARF, PM_DWARF_MUMMY, PM_DWARF_ZOMBIE,
    PM_EARTH_ELEMENTAL, PM_ELF, PM_ELF_MUMMY, PM_ELF_ZOMBIE, PM_FIRE_ANT,
    PM_FIRE_GIANT, PM_FOREST_CENTAUR, PM_GIANT_RAT, PM_GIANT_SPIDER, PM_GNOME,
    PM_GNOME_MUMMY, PM_GNOME_ZOMBIE, PM_GRAND_MASTER, PM_GUARDIAN_NAGA,
    PM_GUIDE, PM_HEALER, PM_HILL_GIANT, PM_HIPPOCRATES, PM_HUMAN,
    PM_HUMAN_MUMMY, PM_HUMAN_ZOMBIE, PM_HUNTER, PM_IXOTH, PM_KING_ARTHUR,
    PM_KITTEN, PM_KNIGHT, PM_LEPRECHAUN, PM_LITTLE_DOG, PM_LORD_CARNARVON,
    PM_LORD_SATO, PM_LORD_SURTUR, PM_MASTER_ASSASSIN, PM_MASTER_KAEN,
    PM_MASTER_OF_THIEVES, PM_MINION_OF_HUHETOTL, PM_MONK, PM_NALZOK,
    PM_NEANDERTHAL, PM_NEFERET_THE_GREEN, PM_NORN, PM_OCHRE_JELLY, PM_OGRE,
    PM_ORC, PM_ORC_MUMMY, PM_ORC_ZOMBIE, PM_ORION, PM_PAGE, PM_PELIAS,
    PM_PONY, PM_QUASIT, PM_RANGER, PM_ROGUE, PM_ROSHI, PM_SAMURAI,
    PM_SCORPION, PM_SCORPIUS, PM_SHOPKEEPER, PM_MAIL_DAEMON, PM_SHAMAN_KARNOV, PM_SNAKE, PM_STALKER,
    PM_STUDENT, PM_THOTH_AMON, PM_THUG, PM_TOURIST, PM_TROLL, PM_TWOFLOWER,
    PM_VALKYRIE, PM_VAMPIRE_BAT, PM_WARRIOR, PM_WIZARD, PM_WOLF, PM_WRAITH,
    PM_XORN,
} from './monsters.js';
import { is_neuter, is_female, is_male } from './mondata.js';
import {
    ART_EYE_OF_THE_AETHIOPICA, ART_EYES_OF_THE_OVERWORLD,
    ART_HEART_OF_AHRIMAN, ART_LONGBOW_OF_DIANA, ART_MAGIC_MIRROR_OF_MERLIN,
    ART_MASTER_KEY_OF_THIEVERY, ART_MITRE_OF_HOLINESS, ART_ORB_OF_DETECTION,
    ART_ORB_OF_FATE, ART_SCEPTRE_OF_MIGHT, ART_STAFF_OF_AESCULAPIUS,
    ART_TSURUGI_OF_MURAMASA, ART_YENDORIAN_EXPRESS_CARD,
} from './artilist.js';
import {
    objects, STRANGE_OBJECT, SPE_CHARM_MONSTER, SPE_CLAIRVOYANCE,
    SPE_CONE_OF_COLD, SPE_CURE_SICKNESS, SPE_DETECT_TREASURE, SPE_DIG,
    SPE_HASTE_SELF, SPE_INVISIBILITY, SPE_LIGHT, SPE_MAGIC_MAPPING,
    SPE_MAGIC_MISSILE, SPE_REMOVE_CURSE, SPE_RESTORE_ABILITY, SPE_TURN_UNDEAD,
} from './objects.js';
import { align_gtitle } from './pray.js';
import { lowc, highc, trimspaces, s_suffix } from './hacklib.js';
import { an } from './objnam.js';
import { pline } from './display.js';
import {
    tty_askname, tty_yn_function, tty_create_nhwindow, tty_start_menu,
    tty_add_menu, add_menu_str, tty_end_menu, tty_select_menu,
    tty_destroy_nhwindow,
} from './wintty.js';

// C ref: winprocs.h RS_filter, RS_menu_arg()
export const RS_filter = 5;
export function RS_menu_arg(x) { return ROLE_RANDOM - ((x) + 1); } /* 0..5 -> -3..-8 */

// C ref: hack.h IndexOkT() -- array with terminator variation
function IndexOkT(idx, array) {
    return idx >= 0 && idx < (SIZE(array) - 1);
}

// C ref: hack.h UNDEFINED_ROLE -- used to initialize Role variables
const UNDEFINED_ROLE = {
    /* role name, set of rank names */
    name: { m: null, f: null },
    rank: Array.from({ length: 9 }, () => ({ m: null, f: null })),
    /* strings: pantheon deity names */
    lgod: null, ngod: null, cgod: null,
    /* file code, quest home+goal names */
    filecode: null, homebase: null, intermed: null,
    /* indices: base mon type, pet */
    mnum: NON_PM, petnum: NON_PM,
    /* quest leader, guardians, nemesis */
    ldrnum: NON_PM, guardnum: NON_PM, neminum: NON_PM,
    /* quest enemy types (index, symbol) */
    enemy1num: NON_PM, enemy2num: NON_PM, enemy1sym: 0, enemy2sym: 0,
    /* quest artifact object index */
    questarti: STRANGE_OBJECT,
    /* Bitmasks */
    allow: 0,
    /* Attributes */
    attrbase: [0, 0, 0, 0, 0, 0], attrdist: [0, 0, 0, 0, 0, 0],
    hpadv: { infix: 0, inrnd: 0, lofix: 0, lornd: 0, hifix: 0, hirnd: 0 },
    enadv: { infix: 0, inrnd: 0, lofix: 0, lornd: 0, hifix: 0, hirnd: 0 },
    xlev: 0, initrecord: 0,
    /* spell statistics */
    spelbase: 0, spelheal: 0, spelshld: 0, spelarmr: 0, spelstat: 0,
    spelspec: 0, spelsbon: 0,
};

// C ref: hack.h UNDEFINED_RACE -- used to initialize Race variables
const UNDEFINED_RACE = {
    /* strings */
    noun: null, adj: null, coll: null, filecode: null,
    individual: { m: null, f: null },
    /* Indices: base race, mummy, zombie */
    mnum: NON_PM, mummynum: NON_PM, zombienum: NON_PM,
    /* Bitmasks */
    allow: 0, selfmask: 0, lovemask: 0, hatemask: 0,
    /* Characteristic limits */
    attrmin: [0, 0, 0, 0, 0, 0], attrmax: [0, 0, 0, 0, 0, 0],
    /* Level change HP and Pw adjustments */
    hpadv: { infix: 0, inrnd: 0, lofix: 0, lornd: 0, hifix: 0, hirnd: 0 },
    enadv: { infix: 0, inrnd: 0, lofix: 0, lornd: 0, hifix: 0, hirnd: 0 },
};

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
// C ref: role.c roles[NUM_ROLES+1]
export const roles = [
    { name: { m: "Archeologist", f: null },
      rank: [ { m: "Digger", f: null },
              { m: "Field Worker", f: null },
              { m: "Investigator", f: null },
              { m: "Exhumer", f: null },
              { m: "Excavator", f: null },
              { m: "Spelunker", f: null },
              { m: "Speleologist", f: null },
              { m: "Collector", f: null },
              { m: "Curator", f: null } ],
      lgod: "Quetzalcoatl", ngod: "Camaxtli", cgod: "Huhetotl",
      filecode: "Arc",
      homebase: "the College of Archeology",
      intermed: "the Tomb of the Toltec Kings",
      mnum: PM_ARCHEOLOGIST, petnum: NON_PM,
      ldrnum: PM_LORD_CARNARVON, guardnum: PM_STUDENT, neminum: PM_MINION_OF_HUHETOTL,
      enemy1num: NON_PM, enemy2num: PM_HUMAN_MUMMY,
      enemy1sym: S_SNAKE, enemy2sym: S_MUMMY,
      questarti: ART_ORB_OF_DETECTION,
      allow: MH_HUMAN | MH_DWARF | MH_GNOME | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL | ROLE_NEUTRAL,
      /*          Str Int Wis Dex Con Cha */
      attrbase: [7, 10, 10, 7, 7, 7],
      attrdist: [20, 20, 20, 10, 20, 10],
      hpadv: { infix: 11, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 }, /* Hit points */
      enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 }, /* Energy */
      xlev: 14, initrecord: 10,
      spelbase: 5, spelheal: 0, spelshld: 2, spelarmr: 10,
      spelstat: A_INT, spelspec: SPE_MAGIC_MAPPING, spelsbon: -4 },
    { name: { m: "Barbarian", f: null },
      rank: [ { m: "Plunderer", f: "Plunderess" },
              { m: "Pillager", f: null },
              { m: "Bandit", f: null },
              { m: "Brigand", f: null },
              { m: "Raider", f: null },
              { m: "Reaver", f: null },
              { m: "Slayer", f: null },
              { m: "Chieftain", f: "Chieftainess" },
              { m: "Conqueror", f: "Conqueress" } ],
      lgod: "Mitra", ngod: "Crom", cgod: "Set",
      filecode: "Bar",
      homebase: "the Camp of the Duali Tribe",
      intermed: "the Duali Oasis",
      mnum: PM_BARBARIAN, petnum: NON_PM,
      ldrnum: PM_PELIAS, guardnum: PM_CHIEFTAIN, neminum: PM_THOTH_AMON,
      enemy1num: PM_OGRE, enemy2num: PM_TROLL,
      enemy1sym: S_OGRE, enemy2sym: S_TROLL,
      questarti: ART_HEART_OF_AHRIMAN,
      allow: MH_HUMAN | MH_ORC | ROLE_MALE | ROLE_FEMALE | ROLE_NEUTRAL | ROLE_CHAOTIC,
      /*          Str Int Wis Dex Con Cha */
      attrbase: [16, 7, 7, 15, 16, 6],
      attrdist: [30, 6, 7, 20, 30, 7],
      hpadv: { infix: 14, inrnd: 0, lofix: 0, lornd: 10, hifix: 2, hirnd: 0 }, /* Hit points */
      enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 }, /* Energy */
      xlev: 10, initrecord: 10,
      spelbase: 14, spelheal: 0, spelshld: 0, spelarmr: 8,
      spelstat: A_INT, spelspec: SPE_HASTE_SELF, spelsbon: -4 },
    { name: { m: "Caveman", f: "Cavewoman" },
      rank: [ { m: "Troglodyte", f: null },
              { m: "Aborigine", f: null },
              { m: "Wanderer", f: null },
              { m: "Vagrant", f: null },
              { m: "Wayfarer", f: null },
              { m: "Roamer", f: null },
              { m: "Nomad", f: null },
              { m: "Rover", f: null },
              { m: "Pioneer", f: null } ],
      lgod: "Anu", ngod: "_Ishtar", cgod: "Anshar",
      filecode: "Cav",
      homebase: "the Caves of the Ancestors",
      intermed: "the Dragon's Lair",
      mnum: PM_CAVE_DWELLER, petnum: PM_LITTLE_DOG,
      ldrnum: PM_SHAMAN_KARNOV, guardnum: PM_NEANDERTHAL, neminum: PM_CHROMATIC_DRAGON,
      enemy1num: PM_BUGBEAR, enemy2num: PM_HILL_GIANT,
      enemy1sym: S_HUMANOID, enemy2sym: S_GIANT,
      questarti: ART_SCEPTRE_OF_MIGHT,
      allow: MH_HUMAN | MH_DWARF | MH_GNOME | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL | ROLE_NEUTRAL,
      /*          Str Int Wis Dex Con Cha */
      attrbase: [10, 7, 7, 7, 8, 6],
      attrdist: [30, 6, 7, 20, 30, 7],
      hpadv: { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 }, /* Hit points */
      enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 }, /* Energy */
      xlev: 10, initrecord: 0,
      spelbase: 12, spelheal: 0, spelshld: 1, spelarmr: 8,
      spelstat: A_INT, spelspec: SPE_DIG, spelsbon: -4 },
    { name: { m: "Healer", f: null },
      rank: [ { m: "Rhizotomist", f: null },
              { m: "Empiric", f: null },
              { m: "Embalmer", f: null },
              { m: "Dresser", f: null },
              { m: "Medicus ossium", f: "Medica ossium" },
              { m: "Herbalist", f: null },
              { m: "Magister", f: "Magistra" },
              { m: "Physician", f: null },
              { m: "Chirurgeon", f: null } ],
      lgod: "_Athena", ngod: "Hermes", cgod: "Poseidon",
      filecode: "Hea",
      homebase: "the Temple of Epidaurus",
      intermed: "the Temple of Coeus",
      mnum: PM_HEALER, petnum: NON_PM,
      ldrnum: PM_HIPPOCRATES, guardnum: PM_ATTENDANT, neminum: PM_CYCLOPS,
      enemy1num: PM_GIANT_RAT, enemy2num: PM_SNAKE,
      enemy1sym: S_RODENT, enemy2sym: S_YETI,
      questarti: ART_STAFF_OF_AESCULAPIUS,
      allow: MH_HUMAN | MH_GNOME | ROLE_MALE | ROLE_FEMALE | ROLE_NEUTRAL,
      /*          Str Int Wis Dex Con Cha */
      attrbase: [7, 7, 13, 7, 11, 16],
      attrdist: [15, 20, 20, 15, 25, 5],
      hpadv: { infix: 11, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 }, /* Hit points */
      enadv: { infix: 1, inrnd: 4, lofix: 0, lornd: 1, hifix: 0, hirnd: 2 }, /* Energy */
      xlev: 20, initrecord: 10,
      spelbase: 3, spelheal: -3, spelshld: 2, spelarmr: 10,
      spelstat: A_WIS, spelspec: SPE_CURE_SICKNESS, spelsbon: -4 },
    { name: { m: "Knight", f: null },
      rank: [ { m: "Gallant", f: null },
              { m: "Esquire", f: null },
              { m: "Bachelor", f: null },
              { m: "Sergeant", f: null },
              { m: "Knight", f: null },
              { m: "Banneret", f: null },
              { m: "Chevalier", f: "Chevaliere" },
              { m: "Seignieur", f: "Dame" },
              { m: "Paladin", f: null } ],
      lgod: "Lugh", ngod: "_Brigit", cgod: "Manannan Mac Lir",
      filecode: "Kni",
      homebase: "Camelot Castle",
      intermed: "the Isle of Glass",
      mnum: PM_KNIGHT, petnum: PM_PONY,
      ldrnum: PM_KING_ARTHUR, guardnum: PM_PAGE, neminum: PM_IXOTH,
      enemy1num: PM_QUASIT, enemy2num: PM_OCHRE_JELLY,
      enemy1sym: S_IMP, enemy2sym: S_JELLY,
      questarti: ART_MAGIC_MIRROR_OF_MERLIN,
      allow: MH_HUMAN | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL,
      /*          Str Int Wis Dex Con Cha */
      attrbase: [13, 7, 14, 8, 10, 17],
      attrdist: [30, 15, 15, 10, 20, 10],
      hpadv: { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 }, /* Hit points */
      enadv: { infix: 1, inrnd: 4, lofix: 0, lornd: 1, hifix: 0, hirnd: 2 }, /* Energy */
      xlev: 10, initrecord: 10,
      spelbase: 8, spelheal: -2, spelshld: 0, spelarmr: 9,
      spelstat: A_WIS, spelspec: SPE_TURN_UNDEAD, spelsbon: -4 },
    { name: { m: "Monk", f: null },
      rank: [ { m: "Candidate", f: null },
              { m: "Novice", f: null },
              { m: "Initiate", f: null },
              { m: "Student of Stones", f: null },
              { m: "Student of Waters", f: null },
              { m: "Student of Metals", f: null },
              { m: "Student of Winds", f: null },
              { m: "Student of Fire", f: null },
              { m: "Master", f: null } ],
      lgod: "Shan Lai Ching", ngod: "Chih Sung-tzu", cgod: "Huan Ti",
      filecode: "Mon",
      homebase: "the Monastery of Chan-Sune",
      intermed: "the Monastery of the Earth-Lord",
      mnum: PM_MONK, petnum: NON_PM,
      ldrnum: PM_GRAND_MASTER, guardnum: PM_ABBOT, neminum: PM_MASTER_KAEN,
      enemy1num: PM_EARTH_ELEMENTAL, enemy2num: PM_XORN,
      enemy1sym: S_ELEMENTAL, enemy2sym: S_XORN,
      questarti: ART_EYES_OF_THE_OVERWORLD,
      allow: MH_HUMAN | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL | ROLE_NEUTRAL | ROLE_CHAOTIC,
      /*          Str Int Wis Dex Con Cha */
      attrbase: [10, 7, 8, 8, 7, 7],
      attrdist: [25, 10, 20, 20, 15, 10],
      hpadv: { infix: 12, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 }, /* Hit points */
      enadv: { infix: 2, inrnd: 2, lofix: 0, lornd: 2, hifix: 0, hirnd: 2 }, /* Energy */
      xlev: 10, initrecord: 10,
      spelbase: 8, spelheal: -2, spelshld: 2, spelarmr: 20,
      spelstat: A_WIS, spelspec: SPE_RESTORE_ABILITY, spelsbon: -4 },
    { name: { m: "Priest", f: "Priestess" },
      rank: [ { m: "Aspirant", f: null },
              { m: "Acolyte", f: null },
              { m: "Adept", f: null },
              { m: "Priest", f: "Priestess" },
              { m: "Curate", f: null },
              { m: "Canon", f: "Canoness" },
              { m: "Lama", f: null },
              { m: "Patriarch", f: "Matriarch" },
              { m: "High Priest", f: "High Priestess" } ],
      lgod: null, ngod: null, cgod: null,
      filecode: "Pri",
      homebase: "the Great Temple",
      intermed: "the Temple of Nalzok",
      mnum: PM_CLERIC, petnum: NON_PM,
      ldrnum: PM_ARCH_PRIEST, guardnum: PM_ACOLYTE, neminum: PM_NALZOK,
      enemy1num: PM_HUMAN_ZOMBIE, enemy2num: PM_WRAITH,
      enemy1sym: S_ZOMBIE, enemy2sym: S_WRAITH,
      questarti: ART_MITRE_OF_HOLINESS,
      allow: MH_HUMAN | MH_ELF | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL | ROLE_NEUTRAL | ROLE_CHAOTIC,
      /*          Str Int Wis Dex Con Cha */
      attrbase: [7, 7, 10, 7, 7, 7],
      attrdist: [15, 10, 30, 15, 20, 10],
      hpadv: { infix: 12, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 }, /* Hit points */
      enadv: { infix: 4, inrnd: 3, lofix: 0, lornd: 2, hifix: 0, hirnd: 2 }, /* Energy */
      xlev: 10, initrecord: 0,
      spelbase: 3, spelheal: -2, spelshld: 2, spelarmr: 10,
      spelstat: A_WIS, spelspec: SPE_REMOVE_CURSE, spelsbon: -4 },
    { name: { m: "Rogue", f: null },
      rank: [ { m: "Footpad", f: null },
              { m: "Cutpurse", f: null },
              { m: "Rogue", f: null },
              { m: "Pilferer", f: null },
              { m: "Robber", f: null },
              { m: "Burglar", f: null },
              { m: "Filcher", f: null },
              { m: "Magsman", f: "Magswoman" },
              { m: "Thief", f: null } ],
      lgod: "Issek", ngod: "Mog", cgod: "Kos",
      filecode: "Rog",
      homebase: "the Thieves' Guild Hall",
      intermed: "the Assassins' Guild Hall",
      mnum: PM_ROGUE, petnum: NON_PM,
      ldrnum: PM_MASTER_OF_THIEVES, guardnum: PM_THUG, neminum: PM_MASTER_ASSASSIN,
      enemy1num: PM_LEPRECHAUN, enemy2num: PM_GUARDIAN_NAGA,
      enemy1sym: S_NYMPH, enemy2sym: S_NAGA,
      questarti: ART_MASTER_KEY_OF_THIEVERY,
      allow: MH_HUMAN | MH_ORC | ROLE_MALE | ROLE_FEMALE | ROLE_CHAOTIC,
      /*          Str Int Wis Dex Con Cha */
      attrbase: [7, 7, 7, 10, 7, 6],
      attrdist: [20, 10, 10, 30, 20, 10],
      hpadv: { infix: 10, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 }, /* Hit points */
      enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 }, /* Energy */
      xlev: 11, initrecord: 10,
      spelbase: 8, spelheal: 0, spelshld: 1, spelarmr: 9,
      spelstat: A_INT, spelspec: SPE_DETECT_TREASURE, spelsbon: -4 },
    { name: { m: "Ranger", f: null },
      rank: [ { m: "Tenderfoot", f: null },
              { m: "Lookout", f: null },
              { m: "Trailblazer", f: null },
              { m: "Reconnoiterer", f: "Reconnoiteress" },
              { m: "Scout", f: null },
              { m: "Arbalester", f: null },
              { m: "Archer", f: null },
              { m: "Sharpshooter", f: null },
              { m: "Marksman", f: "Markswoman" } ],
      lgod: "Mercury", ngod: "_Venus", cgod: "Mars",
      filecode: "Ran",
      homebase: "Orion's camp",
      intermed: "the cave of the wumpus",
      mnum: PM_RANGER, petnum: PM_LITTLE_DOG,
      ldrnum: PM_ORION, guardnum: PM_HUNTER, neminum: PM_SCORPIUS,
      enemy1num: PM_FOREST_CENTAUR, enemy2num: PM_SCORPION,
      enemy1sym: S_CENTAUR, enemy2sym: S_SPIDER,
      questarti: ART_LONGBOW_OF_DIANA,
      allow: MH_HUMAN | MH_ELF | MH_GNOME | MH_ORC | ROLE_MALE | ROLE_FEMALE | ROLE_NEUTRAL | ROLE_CHAOTIC,
      /*          Str Int Wis Dex Con Cha */
      attrbase: [13, 13, 13, 9, 13, 7],
      attrdist: [30, 10, 10, 20, 20, 10],
      hpadv: { infix: 13, inrnd: 0, lofix: 0, lornd: 6, hifix: 1, hirnd: 0 }, /* Hit points */
      enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 }, /* Energy */
      xlev: 12, initrecord: 10,
      spelbase: 9, spelheal: 2, spelshld: 1, spelarmr: 10,
      spelstat: A_INT, spelspec: SPE_INVISIBILITY, spelsbon: -4 },
    { name: { m: "Samurai", f: null },
      rank: [ { m: "Hatamoto", f: null },
              { m: "Ronin", f: null },
              { m: "Ninja", f: "Kunoichi" },
              { m: "Joshu", f: null },
              { m: "Ryoshu", f: null },
              { m: "Kokushu", f: null },
              { m: "Daimyo", f: null },
              { m: "Kuge", f: null },
              { m: "Shogun", f: null } ],
      lgod: "_Amaterasu Omikami", ngod: "Raijin", cgod: "Susanowo",
      filecode: "Sam",
      homebase: "the Castle of the Taro Clan",
      intermed: "the Shogun's Castle",
      mnum: PM_SAMURAI, petnum: PM_LITTLE_DOG,
      ldrnum: PM_LORD_SATO, guardnum: PM_ROSHI, neminum: PM_ASHIKAGA_TAKAUJI,
      enemy1num: PM_WOLF, enemy2num: PM_STALKER,
      enemy1sym: S_DOG, enemy2sym: S_ELEMENTAL,
      questarti: ART_TSURUGI_OF_MURAMASA,
      allow: MH_HUMAN | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL,
      /*          Str Int Wis Dex Con Cha */
      attrbase: [10, 8, 7, 10, 17, 6],
      attrdist: [30, 10, 8, 30, 14, 8],
      hpadv: { infix: 13, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 }, /* Hit points */
      enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 }, /* Energy */
      xlev: 11, initrecord: 10,
      spelbase: 10, spelheal: 0, spelshld: 0, spelarmr: 8,
      spelstat: A_INT, spelspec: SPE_CLAIRVOYANCE, spelsbon: -4 },
    { name: { m: "Tourist", f: null },
      rank: [ { m: "Rambler", f: null },
              { m: "Sightseer", f: null },
              { m: "Excursionist", f: null },
              { m: "Peregrinator", f: "Peregrinatrix" },
              { m: "Traveler", f: null },
              { m: "Journeyer", f: null },
              { m: "Voyager", f: null },
              { m: "Explorer", f: null },
              { m: "Adventurer", f: null } ],
      lgod: "Blind Io", ngod: "_The Lady", cgod: "Offler",
      filecode: "Tou",
      homebase: "Ankh-Morpork",
      intermed: "the Thieves' Guild Hall",
      mnum: PM_TOURIST, petnum: NON_PM,
      ldrnum: PM_TWOFLOWER, guardnum: PM_GUIDE, neminum: PM_MASTER_OF_THIEVES,
      enemy1num: PM_GIANT_SPIDER, enemy2num: PM_FOREST_CENTAUR,
      enemy1sym: S_SPIDER, enemy2sym: S_CENTAUR,
      questarti: ART_YENDORIAN_EXPRESS_CARD,
      allow: MH_HUMAN | ROLE_MALE | ROLE_FEMALE | ROLE_NEUTRAL,
      /*          Str Int Wis Dex Con Cha */
      attrbase: [7, 10, 6, 7, 7, 10],
      attrdist: [15, 10, 10, 15, 30, 20],
      hpadv: { infix: 8, inrnd: 0, lofix: 0, lornd: 8, hifix: 0, hirnd: 0 }, /* Hit points */
      enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 }, /* Energy */
      xlev: 14, initrecord: 0,
      spelbase: 5, spelheal: 1, spelshld: 2, spelarmr: 10,
      spelstat: A_INT, spelspec: SPE_CHARM_MONSTER, spelsbon: -4 },
    { name: { m: "Valkyrie", f: null },
      rank: [ { m: "Stripling", f: null },
              { m: "Skirmisher", f: null },
              { m: "Fighter", f: null },
              { m: "Man-at-arms", f: "Woman-at-arms" },
              { m: "Warrior", f: null },
              { m: "Swashbuckler", f: null },
              { m: "Hero", f: "Heroine" },
              { m: "Champion", f: null },
              { m: "Lord", f: "Lady" } ],
      lgod: "Tyr", ngod: "Odin", cgod: "Loki",
      filecode: "Val",
      homebase: "the Shrine of Destiny",
      intermed: "the cave of Surtur",
      mnum: PM_VALKYRIE, petnum: NON_PM,
      ldrnum: PM_NORN, guardnum: PM_WARRIOR, neminum: PM_LORD_SURTUR,
      enemy1num: PM_FIRE_ANT, enemy2num: PM_FIRE_GIANT,
      enemy1sym: S_ANT, enemy2sym: S_GIANT,
      questarti: ART_ORB_OF_FATE,
      allow: MH_HUMAN | MH_DWARF | ROLE_FEMALE | ROLE_LAWFUL | ROLE_NEUTRAL,
      /*          Str Int Wis Dex Con Cha */
      attrbase: [10, 7, 7, 7, 10, 7],
      attrdist: [30, 6, 7, 20, 30, 7],
      hpadv: { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 }, /* Hit points */
      enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 }, /* Energy */
      xlev: 10, initrecord: 0,
      spelbase: 10, spelheal: -2, spelshld: 0, spelarmr: 9,
      spelstat: A_WIS, spelspec: SPE_CONE_OF_COLD, spelsbon: -4 },
    { name: { m: "Wizard", f: null },
      rank: [ { m: "Evoker", f: null },
              { m: "Conjurer", f: null },
              { m: "Thaumaturge", f: null },
              { m: "Magician", f: null },
              { m: "Enchanter", f: "Enchantress" },
              { m: "Sorcerer", f: "Sorceress" },
              { m: "Necromancer", f: null },
              { m: "Wizard", f: null },
              { m: "Mage", f: null } ],
      lgod: "Ptah", ngod: "Thoth", cgod: "Anhur",
      filecode: "Wiz",
      homebase: "the Lonely Tower",
      intermed: "the Tower of Darkness",
      mnum: PM_WIZARD, petnum: PM_KITTEN,
      ldrnum: PM_NEFERET_THE_GREEN, guardnum: PM_APPRENTICE, neminum: PM_DARK_ONE,
      enemy1num: PM_VAMPIRE_BAT, enemy2num: PM_XORN,
      enemy1sym: S_BAT, enemy2sym: S_WRAITH,
      questarti: ART_EYE_OF_THE_AETHIOPICA,
      allow: MH_HUMAN | MH_ELF | MH_GNOME | MH_ORC | ROLE_MALE | ROLE_FEMALE | ROLE_NEUTRAL | ROLE_CHAOTIC,
      /*          Str Int Wis Dex Con Cha */
      attrbase: [7, 10, 7, 7, 7, 7],
      attrdist: [10, 30, 10, 20, 20, 10],
      hpadv: { infix: 10, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 }, /* Hit points */
      enadv: { infix: 4, inrnd: 3, lofix: 0, lornd: 2, hifix: 0, hirnd: 3 }, /* Energy */
      xlev: 12, initrecord: 0,
      spelbase: 1, spelheal: 0, spelshld: 3, spelarmr: 10,
      spelstat: A_INT, spelspec: SPE_MAGIC_MISSILE, spelsbon: -4 },
    /* Array terminator */
    UNDEFINED_ROLE,
];

/* Table of all races */
// C ref: role.c races[NUM_RACES + 1]
export const races = [
    { noun: "human", adj: "human", coll: "humanity", filecode: "Hum",
      individual: { m: "man", f: "woman" },
      mnum: PM_HUMAN, mummynum: PM_HUMAN_MUMMY, zombienum: PM_HUMAN_ZOMBIE,
      allow: MH_HUMAN | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL | ROLE_NEUTRAL | ROLE_CHAOTIC,
      selfmask: MH_HUMAN, lovemask: 0, hatemask: MH_GNOME | MH_ORC,
      /*         Str Int Wis Dex Con Cha */
      attrmin: [3, 3, 3, 3, 3, 3],
      attrmax: [STR18(100), 18, 18, 18, 18, 18],
      hpadv: { infix: 2, inrnd: 0, lofix: 0, lornd: 2, hifix: 1, hirnd: 0 }, /* Hit points */
      enadv: { infix: 1, inrnd: 0, lofix: 2, lornd: 0, hifix: 2, hirnd: 0 } /* Energy */ },
    { noun: "elf", adj: "elven", coll: "elvenkind", filecode: "Elf",
      individual: { m: null, f: null },
      mnum: PM_ELF, mummynum: PM_ELF_MUMMY, zombienum: PM_ELF_ZOMBIE,
      allow: MH_ELF | ROLE_MALE | ROLE_FEMALE | ROLE_CHAOTIC,
      selfmask: MH_ELF, lovemask: MH_ELF, hatemask: MH_ORC,
      /*         Str Int Wis Dex Con Cha */
      attrmin: [3, 3, 3, 3, 3, 3],
      attrmax: [18, 20, 20, 18, 16, 18],
      hpadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 1, hirnd: 0 }, /* Hit points */
      enadv: { infix: 2, inrnd: 0, lofix: 3, lornd: 0, hifix: 3, hirnd: 0 } /* Energy */ },
    { noun: "dwarf", adj: "dwarven", coll: "dwarvenkind", filecode: "Dwa",
      individual: { m: null, f: null },
      mnum: PM_DWARF, mummynum: PM_DWARF_MUMMY, zombienum: PM_DWARF_ZOMBIE,
      allow: MH_DWARF | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL,
      selfmask: MH_DWARF, lovemask: MH_DWARF | MH_GNOME, hatemask: MH_ORC,
      /*         Str Int Wis Dex Con Cha */
      attrmin: [3, 3, 3, 3, 3, 3],
      attrmax: [STR18(100), 16, 16, 20, 20, 16],
      hpadv: { infix: 4, inrnd: 0, lofix: 0, lornd: 3, hifix: 2, hirnd: 0 }, /* Hit points */
      enadv: { infix: 0, inrnd: 0, lofix: 0, lornd: 0, hifix: 0, hirnd: 0 } /* Energy */ },
    { noun: "gnome", adj: "gnomish", coll: "gnomehood", filecode: "Gno",
      individual: { m: null, f: null },
      mnum: PM_GNOME, mummynum: PM_GNOME_MUMMY, zombienum: PM_GNOME_ZOMBIE,
      allow: MH_GNOME | ROLE_MALE | ROLE_FEMALE | ROLE_NEUTRAL,
      selfmask: MH_GNOME, lovemask: MH_DWARF | MH_GNOME, hatemask: MH_HUMAN,
      /*         Str Int Wis Dex Con Cha */
      attrmin: [3, 3, 3, 3, 3, 3],
      attrmax: [STR18(50), 19, 18, 18, 18, 18],
      hpadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 0 }, /* Hit points */
      enadv: { infix: 2, inrnd: 0, lofix: 2, lornd: 0, hifix: 2, hirnd: 0 } /* Energy */ },
    { noun: "orc", adj: "orcish", coll: "orcdom", filecode: "Orc",
      individual: { m: null, f: null },
      mnum: PM_ORC, mummynum: PM_ORC_MUMMY, zombienum: PM_ORC_ZOMBIE,
      allow: MH_ORC | ROLE_MALE | ROLE_FEMALE | ROLE_CHAOTIC,
      selfmask: MH_ORC, lovemask: 0, hatemask: MH_HUMAN | MH_ELF | MH_DWARF,
      /*         Str Int Wis Dex Con Cha */
      attrmin: [3, 3, 3, 3, 3, 3],
      attrmax: [STR18(50), 16, 16, 18, 18, 16],
      hpadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 0 }, /* Hit points */
      enadv: { infix: 1, inrnd: 0, lofix: 1, lornd: 0, hifix: 1, hirnd: 0 } /* Energy */ },
    /* Array terminator */
    UNDEFINED_RACE,
];

/* Table of all genders */
// C ref: role.c genders[]
export const genders = [
    { adj: "male", he: "he", him: "him", his: "his", filecode: "Mal", allow: ROLE_MALE },
    { adj: "female", he: "she", him: "her", his: "her", filecode: "Fem", allow: ROLE_FEMALE },
    { adj: "neuter", he: "it", him: "it", his: "its", filecode: "Ntr", allow: ROLE_NEUTER },
    /* used by pronoun_gender() when hallucinating */
    { adj: "group", he: "they", him: "them", his: "their", filecode: "Grp", allow: 0 },
];

/* Table of all alignments */
// C ref: role.c aligns[]
export const aligns = [
    { noun: "law", adj: "lawful", filecode: "Law", allow: ROLE_LAWFUL, value: A_LAWFUL },
    { noun: "balance", adj: "neutral", filecode: "Neu", allow: ROLE_NEUTRAL, value: A_NEUTRAL },
    { noun: "chaos", adj: "chaotic", filecode: "Cha", allow: ROLE_CHAOTIC, value: A_CHAOTIC },
    { noun: "evil", adj: "unaligned", filecode: "Una", allow: 0, value: A_NONE },
];

/* used by str2XXX() */
const randomstr = "random";

// C ref: decl.h gr.rfilter (struct role_filter), zero-initialized in C.
// Called from early_init().
export function rfilter_init() {
    game.rfilter = { roles: new Array(SIZE(roles)).fill(false), mask: 0 };
}

// C ref: role.c validrole()
export function validrole(rolenum) {
    return IndexOkT(rolenum, roles);
}

// C ref: role.c randrole()
export function randrole(for_display) {
    let res = SIZE(roles) - 1;

    if (for_display)
        res = rn2_on_display_rng(res);
    else
        res = rn2(res);
    return res;
}

// C ref: role.c randrole_filtered()
function randrole_filtered() {
    let i, n = 0;
    const set = [];

    /* this doesn't rule out impossible combinations but attempts to
       honor all the filter masks */
    for (i = 0; i < SIZE(roles) - 1; ++i) /* -1: avoid terminating element */
        if (ok_role(i, ROLE_NONE, ROLE_NONE, ROLE_NONE)
            && ok_race(i, ROLE_RANDOM, ROLE_NONE, ROLE_NONE)
            && ok_gend(i, ROLE_NONE, ROLE_RANDOM, ROLE_NONE)
            && ok_align(i, ROLE_NONE, ROLE_NONE, ROLE_RANDOM))
            set[n++] = i;
    return n ? set[rn2(n)] : randrole(false);
}

// C ref: role.c str2role()
export function str2role(str) {
    let i, len;

    /* Is str valid? */
    if (!str || !str[0])
        return ROLE_NONE;

    /* Match as much of str as is provided */
    len = str.length;
    for (i = 0; roles[i].name.m; i++) {
        /* Does it match the male name? */
        if (!strncmpi(str, roles[i].name.m, len))
            return i;
        /* Or the female name? */
        if (roles[i].name.f && !strncmpi(str, roles[i].name.f, len))
            return i;
        /* Or the filecode? */
        if (!strcmpi(str, roles[i].filecode))
            return i;
    }

    if ((len === 1 && (str[0] === '*' || str[0] === '@'))
        || !strncmpi(str, randomstr, len))
        return ROLE_RANDOM;

    /* Couldn't find anything appropriate */
    return ROLE_NONE;
}

// C ref: role.c validrace()
export function validrace(rolenum, racenum) {
    /* Assumes validrole */
    return (IndexOkT(racenum, races)
            && (roles[rolenum].allow & races[racenum].allow
                & ROLE_RACEMASK)) ? true : false;
}

// C ref: role.c randrace()
export function randrace(rolenum) {
    let i, n = 0;

    /* Count the number of valid races */
    for (i = 0; races[i].noun; i++)
        if (roles[rolenum].allow & races[i].allow & ROLE_RACEMASK)
            n++;

    /* Pick a random race */
    /* Use a factor of 100 in case of bad random number generators */
    if (n)
        n = Math.trunc(rn2(n * 100) / 100);
    for (i = 0; races[i].noun; i++)
        if (roles[rolenum].allow & races[i].allow & ROLE_RACEMASK) {
            if (n)
                n--;
            else
                return i;
        }

    /* This role has no permitted races? */
    return rn2(SIZE(races) - 1);
}

// C ref: role.c str2race()
export function str2race(str) {
    let i, len;

    /* Is str valid? */
    if (!str || !str[0])
        return ROLE_NONE;

    /* Match as much of str as is provided */
    len = str.length;
    for (i = 0; races[i].noun; i++) {
        /* Does it match the noun? */
        if (!strncmpi(str, races[i].noun, len))
            return i;
        /* check adjective too */
        if (races[i].adj && !strncmpi(str, races[i].adj, len))
            return i;
        /* Or the filecode? */
        if (!strcmpi(str, races[i].filecode))
            return i;
    }

    if ((len === 1 && (str[0] === '*' || str[0] === '@'))
        || !strncmpi(str, randomstr, len))
        return ROLE_RANDOM;

    /* Couldn't find anything appropriate */
    return ROLE_NONE;
}

// C ref: role.c validgend()
export function validgend(rolenum, racenum, gendnum) {
    /* Assumes validrole and validrace */
    return (gendnum >= 0 && gendnum < ROLE_GENDERS
            && (roles[rolenum].allow & races[racenum].allow
                & genders[gendnum].allow & ROLE_GENDMASK)) ? true : false;
}

// C ref: role.c randgend()
export function randgend(rolenum, racenum) {
    let i, n = 0;

    /* Count the number of valid genders */
    for (i = 0; i < ROLE_GENDERS; i++)
        if (roles[rolenum].allow & races[racenum].allow & genders[i].allow
            & ROLE_GENDMASK)
            n++;

    /* Pick a random gender */
    if (n)
        n = rn2(n);
    for (i = 0; i < ROLE_GENDERS; i++)
        if (roles[rolenum].allow & races[racenum].allow & genders[i].allow
            & ROLE_GENDMASK) {
            if (n)
                n--;
            else
                return i;
        }

    /* This role/race has no permitted genders? */
    return rn2(ROLE_GENDERS);
}

// C ref: role.c str2gend()
export function str2gend(str) {
    let i, len;

    /* Is str valid? */
    if (!str || !str[0])
        return ROLE_NONE;

    /* Match as much of str as is provided */
    len = str.length;
    for (i = 0; i < ROLE_GENDERS; i++) {
        /* Does it match the adjective? */
        if (!strncmpi(str, genders[i].adj, len))
            return i;
        /* Or the filecode? */
        if (!strcmpi(str, genders[i].filecode))
            return i;
    }
    if ((len === 1 && (str[0] === '*' || str[0] === '@'))
        || !strncmpi(str, randomstr, len))
        return ROLE_RANDOM;

    /* Couldn't find anything appropriate */
    return ROLE_NONE;
}

// C ref: role.c validalign()
export function validalign(rolenum, racenum, alignnum) {
    /* Assumes validrole and validrace */
    return (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && (roles[rolenum].allow & races[racenum].allow
                & aligns[alignnum].allow & ROLE_ALIGNMASK)) ? true : false;
}

// C ref: role.c randalign()
export function randalign(rolenum, racenum) {
    let i, n = 0;

    /* Count the number of valid alignments */
    for (i = 0; i < ROLE_ALIGNS; i++)
        if (roles[rolenum].allow & races[racenum].allow & aligns[i].allow
            & ROLE_ALIGNMASK)
            n++;

    /* Pick a random alignment */
    if (n)
        n = rn2(n);
    for (i = 0; i < ROLE_ALIGNS; i++)
        if (roles[rolenum].allow & races[racenum].allow & aligns[i].allow
            & ROLE_ALIGNMASK) {
            if (n)
                n--;
            else
                return i;
        }

    /* This role/race has no permitted alignments? */
    return rn2(ROLE_ALIGNS);
}

// C ref: role.c str2align()
export function str2align(str) {
    let i, len;

    /* Is str valid? */
    if (!str || !str[0])
        return ROLE_NONE;

    /* Match as much of str as is provided */
    len = str.length;
    for (i = 0; i < ROLE_ALIGNS; i++) {
        /* Does it match the adjective? */
        if (!strncmpi(str, aligns[i].adj, len))
            return i;
        /* Or the filecode? */
        if (!strcmpi(str, aligns[i].filecode))
            return i;
    }
    if ((len === 1 && (str[0] === '*' || str[0] === '@'))
        || !strncmpi(str, randomstr, len))
        return ROLE_RANDOM;

    /* Couldn't find anything appropriate */
    return ROLE_NONE;
}

// C ref: role.c ok_role()
/* is rolenum compatible with any racenum/gendnum/alignnum constraints? */
export function ok_role(rolenum, racenum, gendnum, alignnum) {
    const rfilter = game.rfilter;
    let i;
    let allow;

    if (IndexOkT(rolenum, roles)) {
        if (rfilter.roles[rolenum])
            return false;
        allow = roles[rolenum].allow;
        if (IndexOkT(racenum, races)
            && !(allow & races[racenum].allow & ROLE_RACEMASK))
            return false;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & genders[gendnum].allow & ROLE_GENDMASK))
            return false;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & aligns[alignnum].allow & ROLE_ALIGNMASK))
            return false;
        return true;
    } else {
        /* random; check whether any selection is possible */
        for (i = 0; i < SIZE(roles) - 1; i++) {
            if (rfilter.roles[i])
                continue;
            allow = roles[i].allow;
            if (IndexOkT(racenum, races)
                && !(allow & races[racenum].allow & ROLE_RACEMASK))
                continue;
            if (gendnum >= 0 && gendnum < ROLE_GENDERS
                && !(allow & genders[gendnum].allow & ROLE_GENDMASK))
                continue;
            if (alignnum >= 0 && alignnum < ROLE_ALIGNS
                && !(allow & aligns[alignnum].allow & ROLE_ALIGNMASK))
                continue;
            return true;
        }
        return false;
    }
}

// C ref: role.c pick_role()
/* pick a random role subject to any racenum/gendnum/alignnum constraints */
/* If pickhow == PICK_RIGID a role is returned only if there is  */
/* a single possibility */
export function pick_role(racenum, gendnum, alignnum, pickhow) {
    let i;
    let roles_ok = 0;
    const set = [];

    for (i = 0; i < SIZE(roles) - 1; i++) {
        if (ok_role(i, racenum, gendnum, alignnum)
            && ok_race(i, (racenum >= 0) ? racenum : ROLE_RANDOM,
                       gendnum, alignnum)
            && ok_gend(i, racenum,
                       (gendnum >= 0) ? gendnum : ROLE_RANDOM, alignnum)
            && ok_align(i, racenum,
                        gendnum, (alignnum >= 0) ? alignnum : ROLE_RANDOM))
            set[roles_ok++] = i;
    }
    if (roles_ok === 0 || (roles_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    return set[rn2(roles_ok)];
}

// C ref: role.c ok_race()
/* is racenum compatible with any rolenum/gendnum/alignnum constraints? */
export function ok_race(rolenum, racenum, gendnum, alignnum) {
    const rfilter = game.rfilter;
    let i;
    let allow;

    if (IndexOkT(racenum, races)) {
        if (rfilter.mask & races[racenum].selfmask)
            return false;
        allow = races[racenum].allow;
        if (IndexOkT(rolenum, roles)
            && !(allow & roles[rolenum].allow & ROLE_RACEMASK))
            return false;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & genders[gendnum].allow & ROLE_GENDMASK))
            return false;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & aligns[alignnum].allow & ROLE_ALIGNMASK))
            return false;
        return true;
    } else {
        /* random; check whether any selection is possible */
        for (i = 0; i < SIZE(races) - 1; i++) {
            if (rfilter.mask & races[i].selfmask)
                continue;
            allow = races[i].allow;
            if (IndexOkT(rolenum, roles)
                && !(allow & roles[rolenum].allow & ROLE_RACEMASK))
                continue;
            if (gendnum >= 0 && gendnum < ROLE_GENDERS
                && !(allow & genders[gendnum].allow & ROLE_GENDMASK))
                continue;
            if (alignnum >= 0 && alignnum < ROLE_ALIGNS
                && !(allow & aligns[alignnum].allow & ROLE_ALIGNMASK))
                continue;
            return true;
        }
        return false;
    }
}

// C ref: role.c pick_race()
/* Pick a random race subject to any rolenum/gendnum/alignnum constraints.
   If pickhow == PICK_RIGID a race is returned only if there is
   a single possibility. */
export function pick_race(rolenum, gendnum, alignnum, pickhow) {
    let i;
    let races_ok = 0;

    for (i = 0; i < SIZE(races) - 1; i++) {
        if (ok_race(rolenum, i, gendnum, alignnum))
            races_ok++;
    }
    if (races_ok === 0 || (races_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    races_ok = rn2(races_ok);
    for (i = 0; i < SIZE(races) - 1; i++) {
        if (ok_race(rolenum, i, gendnum, alignnum)) {
            if (races_ok === 0)
                return i;
            else
                races_ok--;
        }
    }
    return ROLE_NONE;
}

// C ref: role.c ok_gend()
/* is gendnum compatible with any rolenum/racenum/alignnum constraints? */
/* gender and alignment are not comparable (and also not constrainable) */
export function ok_gend(rolenum, racenum, gendnum, alignnum) {
    const rfilter = game.rfilter;
    let i;
    let allow;

    if (gendnum >= 0 && gendnum < ROLE_GENDERS) {
        if (rfilter.mask & genders[gendnum].allow)
            return false;
        allow = genders[gendnum].allow;
        if (IndexOkT(rolenum, roles)
            && !(allow & roles[rolenum].allow & ROLE_GENDMASK))
            return false;
        if (IndexOkT(racenum, races)
            && !(allow & races[racenum].allow & ROLE_GENDMASK))
            return false;
        return true;
    } else {
        /* random; check whether any selection is possible */
        for (i = 0; i < ROLE_GENDERS; i++) {
            if (rfilter.mask & genders[i].allow)
                continue;
            allow = genders[i].allow;
            if (IndexOkT(rolenum, roles)
                && !(allow & roles[rolenum].allow & ROLE_GENDMASK))
                continue;
            if (IndexOkT(racenum, races)
                && !(allow & races[racenum].allow & ROLE_GENDMASK))
                continue;
            return true;
        }
        return false;
    }
}

// C ref: role.c pick_gend()
/* pick a random gender subject to any rolenum/racenum/alignnum constraints */
/* gender and alignment are not comparable (and also not constrainable) */
/* If pickhow == PICK_RIGID a gender is returned only if there is  */
/* a single possibility */
export function pick_gend(rolenum, racenum, alignnum, pickhow) {
    let i;
    let gends_ok = 0;

    for (i = 0; i < ROLE_GENDERS; i++) {
        if (ok_gend(rolenum, racenum, i, alignnum))
            gends_ok++;
    }
    if (gends_ok === 0 || (gends_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    gends_ok = rn2(gends_ok);
    for (i = 0; i < ROLE_GENDERS; i++) {
        if (ok_gend(rolenum, racenum, i, alignnum)) {
            if (gends_ok === 0)
                return i;
            else
                gends_ok--;
        }
    }
    return ROLE_NONE;
}

// C ref: role.c ok_align()
/* is alignnum compatible with any rolenum/racenum/gendnum constraints? */
/* alignment and gender are not comparable (and also not constrainable) */
export function ok_align(rolenum, racenum, gendnum, alignnum) {
    const rfilter = game.rfilter;
    let i;
    let allow;

    if (alignnum >= 0 && alignnum < ROLE_ALIGNS) {
        if (rfilter.mask & aligns[alignnum].allow)
            return false;
        allow = aligns[alignnum].allow;
        if (IndexOkT(rolenum, roles)
            && !(allow & roles[rolenum].allow & ROLE_ALIGNMASK))
            return false;
        if (IndexOkT(racenum, races)
            && !(allow & races[racenum].allow & ROLE_ALIGNMASK))
            return false;
        return true;
    } else {
        /* random; check whether any selection is possible */
        for (i = 0; i < ROLE_ALIGNS; i++) {
            if (rfilter.mask & aligns[i].allow)
                continue;
            allow = aligns[i].allow;
            if (IndexOkT(rolenum, roles)
                && !(allow & roles[rolenum].allow & ROLE_ALIGNMASK))
                continue;
            if (IndexOkT(racenum, races)
                && !(allow & races[racenum].allow & ROLE_ALIGNMASK))
                continue;
            return true;
        }
        return false;
    }
}

// C ref: role.c pick_align()
/* Pick a random alignment subject to any rolenum/racenum/gendnum constraints;
   alignment and gender are not comparable (and also not constrainable).
   If pickhow == PICK_RIGID an alignment is returned only if there is
   a single possibility. */
export function pick_align(rolenum, racenum, gendnum, pickhow) {
    let i;
    let aligns_ok = 0;

    for (i = 0; i < ROLE_ALIGNS; i++) {
        if (ok_align(rolenum, racenum, gendnum, i))
            aligns_ok++;
    }
    if (aligns_ok === 0 || (aligns_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    aligns_ok = rn2(aligns_ok);
    for (i = 0; i < ROLE_ALIGNS; i++) {
        if (ok_align(rolenum, racenum, gendnum, i)) {
            if (aligns_ok === 0)
                return i;
            else
                aligns_ok--;
        }
    }
    return ROLE_NONE;
}

// C ref: role.c rigid_role_checks()
export function rigid_role_checks() {
    const flags = game.flags;
    let tmp;

    /* Some roles are limited to a single race, alignment, or gender and
     * calling this routine prior to XXX_player_selection() will help
     * prevent an extraneous prompt that actually doesn't allow
     * you to choose anything further. Note the use of PICK_RIGID which
     * causes the pick_XX() routine to return a value only if there is one
     * single possible selection, otherwise it returns ROLE_NONE.
     *
     */
    if (flags.initrole === ROLE_RANDOM) {
        /* If the role was explicitly specified as ROLE_RANDOM
         * via -uXXXX-@ or OPTIONS=role:random then choose the role
         * in here to narrow down later choices.
         */
        flags.initrole = pick_role(flags.initrace, flags.initgend,
                                   flags.initalign, PICK_RANDOM);
        if (flags.initrole < 0)
            flags.initrole = randrole_filtered();
    }
    if (flags.initrace === ROLE_RANDOM
        && (tmp = pick_race(flags.initrole, flags.initgend,
                            flags.initalign, PICK_RANDOM)) !== ROLE_NONE)
        flags.initrace = tmp;
    if (flags.initalign === ROLE_RANDOM
        && (tmp = pick_align(flags.initrole, flags.initrace,
                             flags.initgend, PICK_RANDOM)) !== ROLE_NONE)
        flags.initalign = tmp;
    if (flags.initgend === ROLE_RANDOM
        && (tmp = pick_gend(flags.initrole, flags.initrace,
                            flags.initalign, PICK_RANDOM)) !== ROLE_NONE)
        flags.initgend = tmp;

    if (flags.initrole !== ROLE_NONE) {
        if (flags.initrace === ROLE_NONE)
            flags.initrace = pick_race(flags.initrole, flags.initgend,
                                       flags.initalign, PICK_RIGID);
        if (flags.initalign === ROLE_NONE)
            flags.initalign = pick_align(flags.initrole, flags.initrace,
                                         flags.initgend, PICK_RIGID);
        if (flags.initgend === ROLE_NONE)
            flags.initgend = pick_gend(flags.initrole, flags.initrace,
                                       flags.initalign, PICK_RIGID);
    }
}

// C ref: role.c setrolefilter()
export function setrolefilter(bufp) {
    const rfilter = game.rfilter;
    let i;
    let reslt = true;

    if ((i = str2role(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM)
        rfilter.roles[i] = true;
    else if ((i = str2race(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM)
        rfilter.mask |= races[i].selfmask;
    else if ((i = str2gend(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM)
        rfilter.mask |= genders[i].allow;
    else if ((i = str2align(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM)
        rfilter.mask |= aligns[i].allow;
    else
        reslt = false;
    return reslt;
}

// C ref: role.c gotrolefilter()
export function gotrolefilter() {
    const rfilter = game.rfilter;
    let i;

    if (rfilter.mask)
        return true;
    for (i = 0; i < SIZE(roles) - 1; ++i)
        if (rfilter.roles[i])
            return true;
    return false;
}

// C ref: role.c rolefilterstring()
/* create a string like " !Bar !Kni" or " !chaotic" that can be
   put back into an RC file by #saveoptions */
export function rolefilterstring(which) {
    const rfilter = game.rfilter;
    let i;
    let outbuf = '';

    switch (which) {
    case RS_ROLE:
        for (i = 0; i < SIZE(roles) - 1; ++i) {
            if (rfilter.roles[i])
                outbuf += ` !${roles[i].name.m.slice(0, 3)}`;
        }
        break;
    case RS_RACE:
        for (i = 0; i < SIZE(races) - 1; ++i) {
            if ((rfilter.mask & races[i].selfmask) !== 0)
                outbuf += ` !${races[i].noun}`;
        }
        break;
    case RS_GENDER:
        for (i = 0; i < SIZE(genders) - 1; ++i) {
            if ((rfilter.mask & genders[i].allow) !== 0)
                outbuf += ` !${genders[i].adj}`;
        }
        break;
    case RS_ALGNMNT:
        for (i = 0; i < SIZE(aligns) - 1; ++i) {
            if ((rfilter.mask & aligns[i].allow) !== 0)
                outbuf += ` !${aligns[i].adj}`;
        }
        break;
    default:
        // impossible("rolefilterstring: bad role aspect (%d)", which);
        outbuf = " ?";
        break;
    }
    /* constructed with a leading space; drop it */
    return outbuf.slice(1);
}

// C ref: role.c clearrolefilter()
export function clearrolefilter(which) {
    const rfilter = game.rfilter;
    let i;

    switch (which) {
    case RS_filter:
        rfilter.mask = 0; /* clear race, gender, and alignment filters */
        /*FALLTHRU*/
    // eslint-disable-next-line no-fallthrough
    case RS_ROLE:
        for (i = 0; i < SIZE(roles) - 1; ++i)
            rfilter.roles[i] = false;
        break;
    case RS_RACE:
        rfilter.mask &= ~ROLE_RACEMASK;
        break;
    case RS_GENDER:
        rfilter.mask &= ~ROLE_GENDMASK;
        break;
    case RS_ALGNMNT:
        rfilter.mask &= ~ROLE_ALIGNMASK;
        break;
    }
}

// C ref: role.c plnamesuffix()
export async function plnamesuffix() {
    const g = game;
    let i;

    /* some generic user names will be ignored in favor of prompting */
    if (g.sysopt?.genericusers) {
        if (g.sysopt.genericusers[0] === '*') {
            g.plname = '';
        } else {
            /* need to ignore appended '-role-race-gender-alignment';
               'plnamelen' is non-zero when dealing with plname[] value that
               contains a username with dash(es) in it and is usually 0 */
            const eptr = g.plname.indexOf('-', g.plnamelen || 0);
            i = (eptr >= 0) ? eptr : g.plname.length;
            /* look for plname[] in the 'genericusers' space-separated list */
            if (g.sysopt.genericusers.split(' ').includes(g.plname.slice(0, i)))
                /* it's generic; remove it so that askname() will be called */
                g.plname = '';
        }
        if (!g.plname)
            g.plnamelen = 0;
    }

    do {
        if (!g.plname) {
            await tty_askname(); /* fill svp.plname[] if necessary, or set
                                  * defer_plname */
            g.plnamelen = 0; /* plname[] might have -role-race-&c attached */
        }

        /* Look for tokens delimited by '-' */
        const plnamelen = g.plnamelen || 0;
        const toks = g.plname.slice(plnamelen).split('-');
        g.plname = g.plname.slice(0, plnamelen) + toks[0];
        for (const sptr of toks.slice(1)) {
            /* Try to match it to something */
            if ((i = str2role(sptr)) !== ROLE_NONE)
                g.flags.initrole = i;
            else if ((i = str2race(sptr)) !== ROLE_NONE)
                g.flags.initrace = i;
            else if ((i = str2gend(sptr)) !== ROLE_NONE)
                g.flags.initgend = i;
            else if ((i = str2align(sptr)) !== ROLE_NONE)
                g.flags.initalign = i;
        }
    } while (!g.plname && !g.iflags?.defer_plname);

    /* commas in the plname confuse the record file, convert to spaces */
    g.plname = g.plname.replace(/,/g, ' ');
}

// C ref: role.c role_init()
export async function role_init() {
    const g = game;
    const flags = g.flags;
    let alignmnt;
    let pm;

    /* Strip the role letter out of the player name.
     * This is included for backwards compatibility.
     */
    await plnamesuffix();

    /* Check for a valid role.  Try flags.initrole first. */
    if (!validrole(flags.initrole)) {
        /* Try the player letter second */
        if ((flags.initrole = str2role(g.pl_character)) < 0)
            /* None specified; pick a random role */
            flags.initrole = randrole_filtered();
    }

    /* We now have a valid role index.  Copy the role name back. */
    /* This should become OBSOLETE */
    g.pl_character = roles[flags.initrole].name.m.slice(0, PL_CSIZ - 1);

    /* Check for a valid race */
    if (!validrace(flags.initrole, flags.initrace))
        flags.initrace = randrace(flags.initrole);

    /* Check for a valid gender.  If new game, check both initgend
     * and female.  On restore, assume flags.female is correct. */
    if (flags.pantheon === -1) { /* new game */
        if (!validgend(flags.initrole, flags.initrace, flags.female))
            flags.female = flags.female ? 0 : 1; /* !flags.female */
    }
    if (!validgend(flags.initrole, flags.initrace, flags.initgend))
        /* Note that there is no way to check for an unspecified gender. */
        flags.initgend = flags.female;

    /* Check for a valid alignment */
    if (!validalign(flags.initrole, flags.initrace, flags.initalign))
        /* Pick a random alignment */
        flags.initalign = randalign(flags.initrole, flags.initrace);
    alignmnt = aligns[flags.initalign].value;

    /* Initialize gu.urole and gu.urace */
    g.urole = { ...roles[flags.initrole] };
    g.urace = { ...races[flags.initrace] };

    if (!g.quest_status) g.quest_status = {};

    /* Fix up the quest leader */
    if (g.urole.ldrnum !== NON_PM) {
        pm = mons[g.urole.ldrnum];
        pm.msound = MS_LEADER;
        pm.mflags2 = (pm.mflags2 | M2_PEACEFUL) >>> 0;
        pm.mflags3 |= M3_CLOSE;
        pm.maligntyp = alignmnt * 3;
        /* if gender is random, we choose it now instead of waiting
           until the leader monster is created */
        g.quest_status.ldrgend =
            is_neuter(pm) ? 2 : is_female(pm) ? 1 : is_male(pm)
                                                    ? 0
                                                    : +(rn2(100) < 50);
    }

    /* Fix up the quest guardians */
    if (g.urole.guardnum !== NON_PM) {
        pm = mons[g.urole.guardnum];
        pm.mflags2 = (pm.mflags2 | M2_PEACEFUL) >>> 0;
        pm.maligntyp = alignmnt * 3;
    }

    /* Fix up the quest nemesis */
    if (g.urole.neminum !== NON_PM) {
        pm = mons[g.urole.neminum];
        pm.msound = MS_NEMESIS;
        pm.mflags2 = (pm.mflags2 & ~M2_PEACEFUL) >>> 0;
        pm.mflags2 = (pm.mflags2 | (M2_NASTY | M2_STALK | M2_HOSTILE)) >>> 0;
        pm.mflags3 &= ~(M3_CLOSE);
        pm.mflags3 |= M3_WANTSARTI | M3_WAITFORU;
        /* if gender is random, we choose it now instead of waiting
           until the nemesis monster is created */
        g.quest_status.nemgend = is_neuter(pm) ? 2 : is_female(pm) ? 1
                                 : is_male(pm) ? 0 : +(rn2(100) < 50);
    }

    /* Fix up the god names */
    if (flags.pantheon === -1) {             /* new game */
        let trycnt = 0;
        flags.pantheon = flags.initrole;     /* use own gods */
        /* unless they're missing */
        while (!roles[flags.pantheon].lgod && ++trycnt < 100)
            flags.pantheon = randrole(false);
        if (!roles[flags.pantheon].lgod) {
            let i;
            for (i = 0; i < SIZE(roles) - 1; i++)
                if (roles[i].lgod) {
                    flags.pantheon = i;
                    break;
                }
        }
    }
    if (!g.urole.lgod) {
        g.urole.lgod = roles[flags.pantheon].lgod;
        g.urole.ngod = roles[flags.pantheon].ngod;
        g.urole.cgod = roles[flags.pantheon].cgod;
    }
    /* 0 or 1; no gods are neuter, nor is gender randomized */
    g.quest_status.godgend = !strcmpi(align_gtitle(alignmnt), "goddess") ? 1 : 0;

    if (g.urole.mnum === PM_CLERIC) /* Role_if(PM_CLERIC) */
        objects[SPE_LIGHT].oc_skill = P_CLERIC_SPELL;

    /* Fix up infravision: disabled in C ("#if 0") so that mons[] can be
       const; set_uasmon() uses mons[race] for this property instead. */

    /* Artifacts are fixed in hack_artifacts() */

    /* Success! */
    return;
}

// C ref: role.c Hello()
export function Hello(mtmp) {
    switch (game.urole.mnum) { /* Role_switch */
    case PM_KNIGHT:
        return "Salutations"; /* Olde English */
    case PM_SAMURAI:
        return (mtmp && mtmp.data === mons[PM_SHOPKEEPER])
                    ? "Irasshaimase"
                    : "Konnichi wa"; /* Japanese */
    case PM_TOURIST:
        return "Aloha"; /* Hawaiian */
    case PM_VALKYRIE:
        return (mtmp && mtmp.data === mons[PM_MAIL_DAEMON]) ? "Hallo" /* MAIL_STRUCTURES */
               : "Velkommen"; /* Norse */
    default:
        return "Hello";
    }
}

// C ref: role.c Goodbye()
export function Goodbye() {
    switch (game.urole.mnum) { /* Role_switch */
    case PM_KNIGHT:
        return "Fare thee well"; /* Olde English */
    case PM_SAMURAI:
        return "Sayonara"; /* Japanese */
    case PM_TOURIST:
        return "Aloha"; /* Hawaiian */
    case PM_VALKYRIE:
        return "Farvel"; /* Norse */
    default:
        return "Goodbye";
    }
}

// C ref: role.c character_race()
/* if pmindex is any player race (not necessarily the hero's),
   return the races[] entry for it; if pmindex is for some
   other type of monster which isn't a player race, return null */
export function character_race(pmindex) {
    for (const r of races) {
        if (r.noun === null) break;
        if (r.mnum === pmindex)
            return r;
    }
    return null;
}

/*--------------------------------------------------------------------------*/
/* role selection prompts and menus */

// C ref: role.c promptsep()
function promptsep(buf, num_post_attribs) {
    const g = game;
    const conjuct = "and ";

    if (num_post_attribs > 1 && g.role_post_attribs < num_post_attribs
        && g.role_post_attribs > 1)
        buf += ",";
    buf += " ";
    --g.role_post_attribs;
    if (!g.role_post_attribs && num_post_attribs > 1)
        buf += conjuct;
    return buf;
}

// C ref: role.c role_gendercount()
function role_gendercount(rolenum) {
    let gendcount = 0;

    if (validrole(rolenum)) {
        if (roles[rolenum].allow & ROLE_MALE)
            ++gendcount;
        if (roles[rolenum].allow & ROLE_FEMALE)
            ++gendcount;
        if (roles[rolenum].allow & ROLE_NEUTER)
            ++gendcount;
    }
    return gendcount;
}

// C ref: role.c race_alignmentcount()
function race_alignmentcount(racenum) {
    let aligncount = 0;

    if (racenum !== ROLE_NONE && racenum !== ROLE_RANDOM) {
        if (races[racenum].allow & ROLE_CHAOTIC)
            ++aligncount;
        if (races[racenum].allow & ROLE_LAWFUL)
            ++aligncount;
        if (races[racenum].allow & ROLE_NEUTRAL)
            ++aligncount;
    }
    return aligncount;
}

// C ref: role.c root_plselection_prompt()
export function root_plselection_prompt(buflen, rolenum, racenum, gendnum,
                                        alignnum) {
    const g = game;
    let k, gendercount = 0, aligncount = 0;
    let buf = '';
    const err_ret = " character's";
    let donefirst = false;

    if (buflen < 1)
        return err_ret;

    /* initialize these static variables each time this is called */
    g.role_post_attribs = 0;
    g.role_pa = [];
    for (k = 0; k < NUM_BP; ++k)
        g.role_pa[k] = 0;

    /* How many alignments are allowed for the desired race? */
    if (racenum !== ROLE_NONE && racenum !== ROLE_RANDOM)
        aligncount = race_alignmentcount(racenum);

    if (alignnum !== ROLE_NONE && alignnum !== ROLE_RANDOM
        && ok_align(rolenum, racenum, gendnum, alignnum)) {
        /* the four lines of code below were in both 'if' and 'else' */
        if (donefirst)
            buf += " ";
        buf += aligns[alignnum].adj;
        donefirst = true;
    } else {
        /* in case we got here by failing the ok_align() test */
        if (alignnum !== ROLE_RANDOM)
            alignnum = ROLE_NONE;
        /* if alignment not specified, but race is specified
           and only one choice of alignment for that race then
           don't include it in the later list */
        if ((((racenum !== ROLE_NONE && racenum !== ROLE_RANDOM)
              && ok_race(rolenum, racenum, gendnum, alignnum))
             && (aligncount > 1))
            || (racenum === ROLE_NONE || racenum === ROLE_RANDOM)) {
            g.role_pa[BP_ALIGN] = 1;
            g.role_post_attribs++;
        }
    }
    /* <your lawful> */

    /* How many genders are allowed for the desired role? */
    if (validrole(rolenum))
        gendercount = role_gendercount(rolenum);

    if (gendnum !== ROLE_NONE && gendnum !== ROLE_RANDOM) {
        if (validrole(rolenum)) {
            /* if role specified, and multiple choice of genders for it,
               and name of role itself does not distinguish gender */
            if ((rolenum !== ROLE_NONE) && (gendercount > 1)
                && !roles[rolenum].name.f) {
                if (donefirst)
                    buf += " ";
                buf += genders[gendnum].adj;
                donefirst = true;
            }
        } else {
            if (donefirst)
                buf += " ";
            buf += genders[gendnum].adj;
            donefirst = true;
        }
    } else {
        /* if gender not specified, but role is specified
                and only one choice of gender then
                don't include it in the later list */
        if ((validrole(rolenum) && (gendercount > 1))
            || !validrole(rolenum)) {
            g.role_pa[BP_GEND] = 1;
            g.role_post_attribs++;
        }
    }
    /* <your lawful female> */

    if (racenum !== ROLE_NONE && racenum !== ROLE_RANDOM) {
        if (validrole(rolenum)
            && ok_race(rolenum, racenum, gendnum, alignnum)) {
            if (donefirst)
                buf += " ";
            buf += (rolenum === ROLE_NONE) ? races[racenum].noun
                                           : races[racenum].adj;
            donefirst = true;
        } else if (!validrole(rolenum)) {
            if (donefirst)
                buf += " ";
            buf += races[racenum].noun;
            donefirst = true;
        } else {
            g.role_pa[BP_RACE] = 1;
            g.role_post_attribs++;
        }
    } else {
        g.role_pa[BP_RACE] = 1;
        g.role_post_attribs++;
    }
    /* <your lawful female gnomish> || <your lawful female gnome> */

    if (validrole(rolenum)) {
        if (donefirst)
            buf += " ";
        if (gendnum !== ROLE_NONE) {
            if (gendnum === 1 && roles[rolenum].name.f)
                buf += roles[rolenum].name.f;
            else
                buf += roles[rolenum].name.m;
        } else {
            if (roles[rolenum].name.f) {
                buf += roles[rolenum].name.m;
                buf += "/";
                buf += roles[rolenum].name.f;
            } else
                buf += roles[rolenum].name.m;
        }
        donefirst = true;
    } else if (rolenum === ROLE_NONE) {
        g.role_pa[BP_ROLE] = 1;
        g.role_post_attribs++;
    }

    if ((racenum === ROLE_NONE || racenum === ROLE_RANDOM)
        && !validrole(rolenum)) {
        if (donefirst)
            buf += " ";
        buf += "character";
        /*donefirst = TRUE;*/
    }
    /* <your lawful female gnomish cavewoman> || <your lawful female gnome>
     *    || <your lawful female character>
     */
    if (buflen > buf.length + 1) {
        return buf;
    } else
        return err_ret;
}

// C ref: role.c build_plselection_prompt()
export function build_plselection_prompt(buflen, rolenum, racenum, gendnum,
                                         alignnum) {
    const g = game;
    const flags = g.flags;
    const defprompt = "Shall I pick a character for you? [ynaq] ";
    let num_post_attribs = 0;
    let tmpbuf, buf;

    if (buflen < QBUFSZ)
        return defprompt;

    tmpbuf = "Shall I pick ";
    if (racenum !== ROLE_NONE || validrole(rolenum))
        tmpbuf += "your ";
    else
        tmpbuf += "a ";
    /* <your> */

    tmpbuf += root_plselection_prompt(buflen - tmpbuf.length,
                                      rolenum, racenum, gendnum, alignnum);
    /* "Shall I pick a character's role, race, gender, and alignment for you?"
       plus " [ynaq] (y)" is a little too long for a conventional 80 columns;
       also, "pick a character's <anything>" sounds a bit stilted */
    tmpbuf = tmpbuf.split("pick a character").join("pick character"); /* strsubst() */
    buf = s_suffix(tmpbuf);
    /* don't bother splitting caveman/cavewoman or priest/priestess
       in order to apply possessive suffix to both halves, but do
       change "priest/priestess'" to "priest/priestess's" */
    if (buf.toLowerCase().endsWith("priest/priestess'"))
        buf += 's'; /* strkitten(buf, 's') */

    /* buf should now be:
     *    <your lawful female gnomish cavewoman's>
     * || <your lawful female gnome's>
     * || <your lawful female character's>
     *
     * Now append the post attributes to it
     */
    num_post_attribs = g.role_post_attribs;
    if (!num_post_attribs) {
        /* some constraints might have been mutually exclusive, in which case
           some prompting that would have been omitted is needed after all */
        if (flags.initrole === ROLE_NONE && !g.role_pa[BP_ROLE])
            g.role_pa[BP_ROLE] = ++g.role_post_attribs;
        if (flags.initrace === ROLE_NONE && !g.role_pa[BP_RACE])
            g.role_pa[BP_RACE] = ++g.role_post_attribs;
        if (flags.initalign === ROLE_NONE && !g.role_pa[BP_ALIGN])
            g.role_pa[BP_ALIGN] = ++g.role_post_attribs;
        if (flags.initgend === ROLE_NONE && !g.role_pa[BP_GEND])
            g.role_pa[BP_GEND] = ++g.role_post_attribs;
        num_post_attribs = g.role_post_attribs;
    }
    if (num_post_attribs) {
        if (g.role_pa[BP_RACE]) {
            buf = promptsep(buf, num_post_attribs);
            buf += "race";
        }
        if (g.role_pa[BP_ROLE]) {
            buf = promptsep(buf, num_post_attribs);
            buf += "role";
        }
        if (g.role_pa[BP_GEND]) {
            buf = promptsep(buf, num_post_attribs);
            buf += "gender";
        }
        if (g.role_pa[BP_ALIGN]) {
            buf = promptsep(buf, num_post_attribs);
            buf += "alignment";
        }
    }
    buf += " for you? [ynaq] ";
    return buf;
}

// C ref: role.c role_menu_extra()
/* add a "pick alignment first"-type entry to the specified menu */
export function role_menu_extra(which, where, preselect) {
    const g = game;
    const flags = g.flags;
    const rfilter = g.rfilter;
    const RS_menu_let = [
        '=',  /* name */
        '?',  /* role */
        '/',  /* race */
        '"',  /* gender */
        '[',  /* alignment */
    ];
    let buf;
    let what = null, constrainer = null, forcedvalue = null;
    let f = 0, r, c, gend, a, i, allowmask;
    const clr = NO_COLOR;

    r = flags.initrole;
    c = flags.initrace;
    switch (which) {
    case RS_NAME:
        what = "name";
        break;
    case RS_ROLE:
        what = "role";
        f = r;
        for (i = 0; i < SIZE(roles) - 1; ++i)
            if (i !== f && !rfilter.roles[i])
                break;
        if (i === SIZE(roles) - 1) {
            constrainer = "filter";
            forcedvalue = "role";
        }
        break;
    case RS_RACE:
        what = "race";
        f = flags.initrace;
        c = ROLE_NONE; /* override player's setting */
        if (r >= 0) {
            allowmask = roles[r].allow & ROLE_RACEMASK;
            if (allowmask === MH_HUMAN)
                c = 0; /* races[human] */
            if (c >= 0) {
                constrainer = "role";
                forcedvalue = races[c].noun;
            } else if (f >= 0 && ((allowmask & ~rfilter.mask)
                                  === races[f].selfmask)) {
                /* if there is only one race choice available due to user
                   options disallowing others, race menu entry is disabled */
                constrainer = "filter";
                forcedvalue = "race";
            }
        }
        break;
    case RS_GENDER:
        what = "gender";
        f = flags.initgend;
        gend = ROLE_NONE;
        if (r >= 0) {
            allowmask = roles[r].allow & ROLE_GENDMASK;
            if (allowmask === ROLE_MALE)
                gend = 0; /* genders[male] */
            else if (allowmask === ROLE_FEMALE)
                gend = 1; /* genders[female] */
            if (gend >= 0) {
                constrainer = "role";
                forcedvalue = genders[gend].adj;
            } else if (f >= 0 && ((allowmask & ~rfilter.mask)
                                  === genders[f].allow)) {
                /* if there is only one gender choice available due to user
                   options disallowing other, gender menu entry is disabled */
                constrainer = "filter";
                forcedvalue = "gender";
            }
        }
        break;
    case RS_ALGNMNT:
        what = "alignment";
        f = flags.initalign;
        a = ROLE_NONE;
        if (r >= 0) {
            allowmask = roles[r].allow & ROLE_ALIGNMASK;
            if (allowmask === AM_LAWFUL)
                a = 0; /* aligns[lawful] */
            else if (allowmask === AM_NEUTRAL)
                a = 1; /* aligns[neutral] */
            else if (allowmask === AM_CHAOTIC)
                a = 2; /* aligns[chaotic] */
            if (a >= 0)
                constrainer = "role";
        }
        if (c >= 0 && !constrainer) {
            allowmask = races[c].allow & ROLE_ALIGNMASK;
            if (allowmask === AM_LAWFUL)
                a = 0; /* aligns[lawful] */
            else if (allowmask === AM_NEUTRAL)
                a = 1; /* aligns[neutral] */
            else if (allowmask === AM_CHAOTIC)
                a = 2; /* aligns[chaotic] */
            if (a >= 0)
                constrainer = "race";
        }
        if (f >= 0 && !constrainer
            && (ROLE_ALIGNMASK & ~rfilter.mask) === aligns[f].allow) {
            /* if there is only one alignment choice available due to user
               options disallowing others, algn menu entry is disabled */
            constrainer = "filter";
            forcedvalue = "alignment";
        }
        if (a >= 0)
            forcedvalue = aligns[a].adj;
        break;
    }

    if (constrainer) {
        /* use four spaces of padding to fake a grayed out menu choice */
        buf = `    ${constrainer} forces ${forcedvalue}`;
        add_menu_str(where, buf);
    } else if (what) {
        buf = `Pick${(f >= 0) ? " another" : ""} ${what} first`;
        tty_add_menu(where, null, RS_menu_arg(which), RS_menu_let[which], 0,
                     ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
    } else if (which === RS_filter) {
        const setfiltering = `${gotrolefilter() ? "Reset" : "Set"} role/race/&c filtering`;

        tty_add_menu(where, null, RS_menu_arg(RS_filter), '~', 0, ATR_NONE,
                     clr, setfiltering, MENU_ITEMFLAGS_NONE);
    } else if (which === ROLE_RANDOM) {
        tty_add_menu(where, null, ROLE_RANDOM, '*', 0,
                     ATR_NONE, clr, "Random",
                     preselect ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
    } else if (which === ROLE_NONE) {
        tty_add_menu(where, null, ROLE_NONE, 'q', 0,
                     ATR_NONE, clr, "Quit",
                     preselect ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
    } else {
        /* impossible("role_menu_extra: bad arg (%d)", which); */
    }
}

/* try to reduce clutter in the code below... */
/* ROLE, RACE, GEND, ALGN are flags.initrole, initrace, initgend, initalign */

// C ref: role.c genl_player_setup()
/* guts of tty's player_selection() */
export async function genl_player_setup(screenheight) {
    const g = game;
    const flags = g.flags;
    let pbuf;
    let i, k, n, choice, nextpick;
    let getconfirmation, picksomething;
    let win = WIN_ERR;
    let selected = null;
    const clr = NO_COLOR;
    let pick4u = 'n';
    let result = 0; /* assume failure (player chooses to 'quit') */

    if (!g.program_state) g.program_state = {};
    g.program_state.in_role_selection = (g.program_state.in_role_selection || 0) + 1;
    /* Used to avoid "Is this ok?" if player has already specified all
     * four facets of role.
     * Note that rigid_role_checks might force any unspecified facets to
     * have a specific value, but that will still require confirmation;
     * player can specify the forced ones if avoiding that is demanded.
     */
    picksomething = (flags.initrole === ROLE_NONE || flags.initrace === ROLE_NONE
                     || flags.initgend === ROLE_NONE || flags.initalign === ROLE_NONE);
    /* Used for '-@';
     * choose randomly without asking for all unspecified facets.
     */
    if (flags.randomall && picksomething) {
        if (flags.initrole === ROLE_NONE)
            flags.initrole = ROLE_RANDOM;
        if (flags.initrace === ROLE_NONE)
            flags.initrace = ROLE_RANDOM;
        if (flags.initgend === ROLE_NONE)
            flags.initgend = ROLE_RANDOM;
        if (flags.initalign === ROLE_NONE)
            flags.initalign = ROLE_RANDOM;
    }

    /* prevent unnecessary prompting if role forces race (samurai) or gender
       (valkyrie) or alignment (rogue), or race forces alignment (orc), &c */
    rigid_role_checks();

    setup_done: {
        if (flags.initrole === ROLE_NONE || flags.initrace === ROLE_NONE
            || flags.initgend === ROLE_NONE || flags.initalign === ROLE_NONE) {
            let prompt = build_plselection_prompt(QBUFSZ, flags.initrole,
                                                  flags.initrace,
                                                  flags.initgend,
                                                  flags.initalign);
            /* prompt[] contains "Shall I pick ... for you? [ynaq] "
               y - game picks role,&c then asks player to confirm;
               n - player manually chooses via menu selections;
               a - like 'y', but skips confirmation and starts game;
               q - quit
             */
            prompt = trimspaces(prompt); /* 'prompt' is constructed with trailing space */
            /* accept any character and do validation ourselves so that we can
               shorten prompt; it will be "Shall I pick ... for you? [ynaq] "
               with final space appended by yn_function() [for tty at least] */
            do {
                pick4u = await tty_yn_function(prompt, null, '\0');
                pick4u = lowc(pick4u);
                if (pick4u === '\x1b' || pick4u === 'q') /* handle [q] */
                    break setup_done;
                if (pick4u === ' ' || pick4u === '\n' || pick4u === '\r')
                    pick4u = 'y'; /* default */
                else if (pick4u === '@' || pick4u === '*')
                    pick4u = 'a'; /* similar to '-@' on command line */
                /* TODO? handle response of '?' */
            } while (pick4u !== 'y' && pick4u !== 'n' && pick4u !== 'a'); /* [yna] */
        }

        makepicks: for (;;) {
            nextpick = RS_ROLE;
            do {
                if (nextpick === RS_ROLE) {
                    nextpick = RS_RACE;
                    /* Select a role, if necessary;
                       we'll try to be compatible with pre-selected
                       race/gender/alignment, but may not succeed. */
                    if (flags.initrole < 0) {
                        /* process the choice */
                        if (pick4u === 'y' || pick4u === 'a'
                            || flags.initrole === ROLE_RANDOM) {
                            /* pick a random role */
                            k = pick_role(flags.initrace, flags.initgend,
                                          flags.initalign, PICK_RANDOM);
                            if (k < 0) {
                                await pline("Incompatible role!");
                                k = randrole(false);
                            }
                        } else {
                            /* 'excess' is used to try to avoid tty pagination */
                            const excess = maybe_skip_seps(screenheight, RS_ROLE);

                            /* prompt for a role */
                            win = plsel_startmenu(screenheight, RS_ROLE);
                            /* populate the menu with role choices */
                            setup_rolemenu(win, true, flags.initrace,
                                           flags.initgend, flags.initalign);
                            /* add miscellaneous menu entries */
                            role_menu_extra(ROLE_RANDOM, win, true);
                            /* separator, not a choice */
                            if (excess < 1 || excess > 2)
                                add_menu_str(win, "");
                            role_menu_extra(RS_RACE, win, false);
                            role_menu_extra(RS_GENDER, win, false);
                            role_menu_extra(RS_ALGNMNT, win, false);
                            role_menu_extra(RS_filter, win, false);
                            role_menu_extra(ROLE_NONE, win, false); /* quit */
                            pbuf = "Pick a role or profession";
                            tty_end_menu(win, pbuf);
                            ({ n, selected } = await tty_select_menu(win, PICK_ONE));
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
                                choice = selected[0].item;
                                if (n > 1 && choice === ROLE_RANDOM)
                                    choice = selected[1].item;
                            } else
                                choice = (n === 0) ? ROLE_RANDOM : ROLE_NONE;
                            selected = null;
                            tty_destroy_nhwindow(win), win = WIN_ERR;

                            if (choice === ROLE_NONE) {
                                break setup_done; /* selected quit */
                            } else if (choice === RS_menu_arg(RS_ALGNMNT)) {
                                flags.initalign = k = ROLE_NONE;
                                nextpick = RS_ALGNMNT;
                            } else if (choice === RS_menu_arg(RS_GENDER)) {
                                flags.initgend = k = ROLE_NONE;
                                nextpick = RS_GENDER;
                            } else if (choice === RS_menu_arg(RS_RACE)) {
                                flags.initrace = k = ROLE_NONE;
                                nextpick = RS_RACE;
                            } else if (choice === RS_menu_arg(RS_filter)) {
                                flags.initrole = k = ROLE_NONE;
                                await reset_role_filtering();
                                nextpick = RS_ROLE;
                            } else if (choice === ROLE_RANDOM) {
                                k = pick_role(flags.initrace, flags.initgend,
                                              flags.initalign, PICK_RANDOM);
                                if (k < 0)
                                    k = randrole(false);
                            } else {
                                k = choice - 1;
                            }
                        }
                        flags.initrole = k;
                    } /* needed role */
                }     /* picking role */

                if (nextpick === RS_RACE) {
                    nextpick = (flags.initrole < 0) ? RS_ROLE : RS_GENDER;
                    /* Select a race, if necessary;
                       force compatibility with role, try for compatibility
                       with pre-selected gender/alignment. */
                    if (flags.initrace < 0 || !validrace(flags.initrole, flags.initrace)) {
                        /* no race yet, or pre-selected race not valid */
                        if (pick4u === 'y' || pick4u === 'a'
                            || flags.initrace === ROLE_RANDOM) {
                            k = pick_race(flags.initrole, flags.initgend,
                                          flags.initalign, PICK_RANDOM);
                            if (k < 0) {
                                await pline("Incompatible race!");
                                k = randrace(flags.initrole);
                            }
                        } else { /* pick4u == 'n' */
                            /* Count the number of valid races */
                            n = 0; /* number valid */
                            k = 0; /* valid race */
                            for (i = 0; races[i].noun; i++)
                                if (ok_race(flags.initrole, i, flags.initgend,
                                            flags.initalign)) {
                                    n++;
                                    k = i;
                                }
                            if (n === 0) {
                                for (i = 0; races[i].noun; i++)
                                    if (validrace(flags.initrole, i)) {
                                        n++;
                                        k = i;
                                    }
                            }
                            /* Permit the user to pick, if there is more than one */
                            if (n > 1) {
                                win = plsel_startmenu(screenheight, RS_RACE);
                                /* populate the menu with role choices */
                                setup_racemenu(win, true, flags.initrole,
                                               flags.initgend, flags.initalign);
                                /* add miscellaneous menu entries */
                                role_menu_extra(ROLE_RANDOM, win, true);
                                add_menu_str(win, ""); /* separator, not a choice */
                                role_menu_extra(RS_ROLE, win, false);
                                role_menu_extra(RS_GENDER, win, false);
                                role_menu_extra(RS_ALGNMNT, win, false);
                                role_menu_extra(RS_filter, win, false);
                                role_menu_extra(ROLE_NONE, win, false); /* quit */
                                pbuf = "Pick a race or species";
                                tty_end_menu(win, pbuf);
                                ({ n, selected } = await tty_select_menu(win, PICK_ONE));
                                if (n > 0) {
                                    choice = selected[0].item;
                                    if (n > 1 && choice === ROLE_RANDOM)
                                        choice = selected[1].item;
                                } else
                                    choice = (n === 0) ? ROLE_RANDOM : ROLE_NONE;
                                selected = null;
                                tty_destroy_nhwindow(win), win = WIN_ERR;

                                if (choice === ROLE_NONE) {
                                    break setup_done; /* selected quit */
                                } else if (choice === RS_menu_arg(RS_ALGNMNT)) {
                                    flags.initalign = k = ROLE_NONE;
                                    nextpick = RS_ALGNMNT;
                                } else if (choice === RS_menu_arg(RS_GENDER)) {
                                    flags.initgend = k = ROLE_NONE;
                                    nextpick = RS_GENDER;
                                } else if (choice === RS_menu_arg(RS_ROLE)) {
                                    flags.initrole = k = ROLE_NONE;
                                    nextpick = RS_ROLE;
                                } else if (choice === RS_menu_arg(RS_filter)) {
                                    flags.initrace = k = ROLE_NONE;
                                    if (await reset_role_filtering())
                                        nextpick = RS_ROLE;
                                    else
                                        nextpick = RS_RACE;
                                } else if (choice === ROLE_RANDOM) {
                                    k = pick_race(flags.initrole, flags.initgend,
                                                  flags.initalign, PICK_RANDOM);
                                    if (k < 0)
                                        k = randrace(flags.initrole);
                                } else {
                                    k = choice - 1;
                                }
                            }
                        }
                        flags.initrace = k;
                    } /* needed race */
                }     /* picking race */

                if (nextpick === RS_GENDER) {
                    nextpick = (flags.initrole < 0) ? RS_ROLE
                               : (flags.initrace < 0) ? RS_RACE
                               : RS_ALGNMNT;
                    /* Select a gender, if necessary;
                       force compatibility with role/race, try for compatibility
                       with pre-selected alignment. */
                    if (flags.initgend < 0
                        || !validgend(flags.initrole, flags.initrace, flags.initgend)) {
                        /* no gender yet, or pre-selected gender not valid */
                        if (pick4u === 'y' || pick4u === 'a'
                            || flags.initgend === ROLE_RANDOM) {
                            k = pick_gend(flags.initrole, flags.initrace,
                                          flags.initalign, PICK_RANDOM);
                            if (k < 0) {
                                await pline("Incompatible gender!");
                                k = randgend(flags.initrole, flags.initrace);
                            }
                        } else { /* pick4u == 'n' */
                            /* Count the number of valid genders */
                            n = 0; /* number valid */
                            k = 0; /* valid gender */
                            for (i = 0; i < ROLE_GENDERS; i++)
                                if (ok_gend(flags.initrole, flags.initrace, i,
                                            flags.initalign)) {
                                    n++;
                                    k = i;
                                }
                            if (n === 0) {
                                for (i = 0; i < ROLE_GENDERS; i++)
                                    if (validgend(flags.initrole, flags.initrace, i)) {
                                        n++;
                                        k = i;
                                    }
                            }
                            /* Permit the user to pick, if there is more than one */
                            if (n > 1) {
                                win = plsel_startmenu(screenheight, RS_GENDER);
                                /* populate the menu with gender choices */
                                setup_gendmenu(win, true, flags.initrole,
                                               flags.initrace, flags.initalign);
                                /* add miscellaneous menu entries */
                                role_menu_extra(ROLE_RANDOM, win, true);
                                add_menu_str(win, ""); /* separator, not a choice */
                                role_menu_extra(RS_ROLE, win, false);
                                role_menu_extra(RS_RACE, win, false);
                                role_menu_extra(RS_ALGNMNT, win, false);
                                role_menu_extra(RS_filter, win, false);
                                role_menu_extra(ROLE_NONE, win, false); /* quit */
                                pbuf = "Pick a gender or sex";
                                tty_end_menu(win, pbuf);
                                ({ n, selected } = await tty_select_menu(win, PICK_ONE));
                                if (n > 0) {
                                    choice = selected[0].item;
                                    if (n > 1 && choice === ROLE_RANDOM)
                                        choice = selected[1].item;
                                } else
                                    choice = (n === 0) ? ROLE_RANDOM : ROLE_NONE;
                                selected = null;
                                tty_destroy_nhwindow(win), win = WIN_ERR;

                                if (choice === ROLE_NONE) {
                                    break setup_done; /* selected quit */
                                } else if (choice === RS_menu_arg(RS_ALGNMNT)) {
                                    flags.initalign = k = ROLE_NONE;
                                    nextpick = RS_ALGNMNT;
                                } else if (choice === RS_menu_arg(RS_RACE)) {
                                    flags.initrace = k = ROLE_NONE;
                                    nextpick = RS_RACE;
                                } else if (choice === RS_menu_arg(RS_ROLE)) {
                                    flags.initrole = k = ROLE_NONE;
                                    nextpick = RS_ROLE;
                                } else if (choice === RS_menu_arg(RS_filter)) {
                                    flags.initgend = k = ROLE_NONE;
                                    if (await reset_role_filtering())
                                        nextpick = RS_ROLE;
                                    else
                                        nextpick = RS_GENDER;
                                } else if (choice === ROLE_RANDOM) {
                                    k = pick_gend(flags.initrole, flags.initrace,
                                                  flags.initalign, PICK_RANDOM);
                                    if (k < 0)
                                        k = randgend(flags.initrole, flags.initrace);
                                } else {
                                    k = choice - 1;
                                }
                            }
                        }
                        flags.initgend = k;
                    } /* needed gender */
                }     /* picking gender */

                if (nextpick === RS_ALGNMNT) {
                    nextpick = (flags.initrole < 0) ? RS_ROLE
                               : (flags.initrace < 0) ? RS_RACE
                                 : RS_GENDER;
                    /* Select an alignment, if necessary;
                       force compatibility with role/race/gender. */
                    if (flags.initalign < 0
                        || !validalign(flags.initrole, flags.initrace, flags.initalign)) {
                        /* no alignment yet, or pre-selected alignment not valid */
                        if (pick4u === 'y' || pick4u === 'a'
                            || flags.initalign === ROLE_RANDOM) {
                            k = pick_align(flags.initrole, flags.initrace,
                                           flags.initgend, PICK_RANDOM);
                            if (k < 0) {
                                await pline("Incompatible alignment!");
                                k = randalign(flags.initrole, flags.initrace);
                            }
                        } else { /* pick4u == 'n' */
                            /* Count the number of valid alignments */
                            n = 0; /* number valid */
                            k = 0; /* valid alignment */
                            for (i = 0; i < ROLE_ALIGNS; i++)
                                if (ok_align(flags.initrole, flags.initrace,
                                             flags.initgend, i)) {
                                    n++;
                                    k = i;
                                }
                            if (n === 0) {
                                for (i = 0; i < ROLE_ALIGNS; i++)
                                    if (validalign(flags.initrole, flags.initrace, i)) {
                                        n++;
                                        k = i;
                                    }
                            }
                            /* Permit the user to pick, if there is more than one */
                            if (n > 1) {
                                win = plsel_startmenu(screenheight, RS_ALGNMNT);
                                setup_algnmenu(win, true, flags.initrole,
                                               flags.initrace, flags.initgend);
                                role_menu_extra(ROLE_RANDOM, win, true);
                                add_menu_str(win, ""); /* separator, not a choice */
                                role_menu_extra(RS_ROLE, win, false);
                                role_menu_extra(RS_RACE, win, false);
                                role_menu_extra(RS_GENDER, win, false);
                                role_menu_extra(RS_filter, win, false);
                                role_menu_extra(ROLE_NONE, win, false); /* quit */
                                pbuf = "Pick an alignment or creed";
                                tty_end_menu(win, pbuf);
                                ({ n, selected } = await tty_select_menu(win, PICK_ONE));
                                if (n > 0) {
                                    choice = selected[0].item;
                                    if (n > 1 && choice === ROLE_RANDOM)
                                        choice = selected[1].item;
                                } else
                                    choice = (n === 0) ? ROLE_RANDOM : ROLE_NONE;
                                selected = null;
                                tty_destroy_nhwindow(win), win = WIN_ERR;

                                if (choice === ROLE_NONE) {
                                    break setup_done; /* selected quit */
                                } else if (choice === RS_menu_arg(RS_GENDER)) {
                                    flags.initgend = k = ROLE_NONE;
                                    nextpick = RS_GENDER;
                                } else if (choice === RS_menu_arg(RS_RACE)) {
                                    flags.initrace = k = ROLE_NONE;
                                    nextpick = RS_RACE;
                                } else if (choice === RS_menu_arg(RS_ROLE)) {
                                    flags.initrole = k = ROLE_NONE;
                                    nextpick = RS_ROLE;
                                } else if (choice === RS_menu_arg(RS_filter)) {
                                    flags.initalign = k = ROLE_NONE;
                                    if (await reset_role_filtering())
                                        nextpick = RS_ROLE;
                                    else
                                        nextpick = RS_ALGNMNT;
                                } else if (choice === ROLE_RANDOM) {
                                    k = pick_align(flags.initrole, flags.initrace,
                                                   flags.initgend, PICK_RANDOM);
                                    if (k < 0)
                                        k = randalign(flags.initrole, flags.initrace);
                                } else {
                                    k = choice - 1;
                                }
                            }
                        }
                        flags.initalign = k;
                    } /* needed alignment */
                }     /* picking alignment */

            } while (flags.initrole < 0 || flags.initrace < 0
                     || flags.initgend < 0 || flags.initalign < 0);

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
            getconfirmation = (picksomething && pick4u !== 'a' && !flags.randomall);
            while (getconfirmation) {
                win = plsel_startmenu(screenheight, RS_filter); /* filter: not ROLE */
                /* [ynaq] menu choices */
                tty_add_menu(win, null, 1, 'y', 0,
                             ATR_NONE, clr, "Yes; start game", MENU_ITEMFLAGS_SELECTED);
                tty_add_menu(win, null, 2, 'n', 0,
                             ATR_NONE, clr, "No; choose role again", MENU_ITEMFLAGS_NONE);
                if (g.iflags.renameallowed) {
                    tty_add_menu(win, null, 3, 'a', 0, ATR_NONE,
                                 clr, "Not yet; choose another name",
                                 MENU_ITEMFLAGS_NONE);
                }
                tty_add_menu(win, null, -1, 'q', 0,
                             ATR_NONE, clr, "Quit", MENU_ITEMFLAGS_NONE);
                pbuf = `Is this ok? [yn${g.iflags.renameallowed ? "a" : ""}q]`;
                tty_end_menu(win, pbuf);
                ({ n, selected } = await tty_select_menu(win, PICK_ONE));
                /* [pick-one menus with a preselected entry behave oddly...] */
                choice = (n > 0) ? selected[n - 1].item : (n === 0) ? 1 : -1;
                selected = null;
                tty_destroy_nhwindow(win);

                switch (choice) {
                default: /* 'q' or ESC */
                    break setup_done; /* quit */
                case 3: { /* 'a' */
                    /*
                     * TODO: what, if anything, should be done if the name is
                     * changed to or from "wizard" after port-specific startup
                     * code has set flags.debug based on the original name?
                     */
                    g.iflags.renameinprogress = true; /* affects main() in unixmain.c */
                    /* plnamesuffix() can change any or all of ROLE, RACE,
                       GEND, ALGN; we'll override that and honor only the name */
                    const saveROLE = flags.initrole, saveRACE = flags.initrace,
                        saveGEND = flags.initgend, saveALGN = flags.initalign;
                    g.plname = '';
                    await plnamesuffix(); /* calls askname() when plname[] is empty */
                    flags.initrole = saveROLE, flags.initrace = saveRACE,
                    flags.initgend = saveGEND, flags.initalign = saveALGN;
                    break; /* getconfirmation is still True */
                }
                case 2: /* 'n' */
                    /* start fresh, but bypass "shall I pick everything for you?"
                       step; any partial role selection via config file, command
                       line, or name suffix is discarded this time */
                    pick4u = 'n';
                    flags.initrole = flags.initrace = flags.initgend
                        = flags.initalign = ROLE_NONE;
                    continue makepicks;
                case 1: /* 'y' or Space or Return/Enter */
                    /* success; drop out through end of function */
                    getconfirmation = false;
                    break;
                }
            } /* while 'getconfirmation' */
            break makepicks;
        }
        /* Success! */
        result = 1;
    }

    /* setup_done: */
    g.program_state.in_role_selection--;
    return result;
}

// C ref: role.c reset_role_filtering()
async function reset_role_filtering() {
    const g = game;
    const flags = g.flags;
    let i, n;
    let filterprompt;

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);

    /* no extra blank line preceding this entry; end_menu supplies one */
    add_menu_str(win, "Unacceptable roles");
    setup_rolemenu(win, false, ROLE_NONE, ROLE_NONE, ROLE_NONE);

    add_menu_str(win, "");
    add_menu_str(win, "Unacceptable races");
    setup_racemenu(win, false, ROLE_NONE, ROLE_NONE, ROLE_NONE);

    add_menu_str(win, "");
    add_menu_str(win, "Unacceptable genders");
    setup_gendmenu(win, false, ROLE_NONE, ROLE_NONE, ROLE_NONE);

    add_menu_str(win, "");
    add_menu_str(win, "Unacceptable alignments");
    setup_algnmenu(win, false, ROLE_NONE, ROLE_NONE, ROLE_NONE);

    filterprompt = `Pick all that apply${gotrolefilter() ? " and/or unpick any that no longer apply" : ""}`;
    tty_end_menu(win, filterprompt);
    const res = await tty_select_menu(win, PICK_ANY);
    n = res.n;

    if (n >= 0) { /* n==0: clear current filters and don't set new ones */
        clearrolefilter(RS_filter);
        for (i = 0; i < n; i++)
            setrolefilter(res.selected[i].item);

        flags.initrole = flags.initrace = flags.initgend = flags.initalign = ROLE_NONE;
    }
    tty_destroy_nhwindow(win);
    return (n > 0) ? true : false;
}

// C ref: role.c maybe_skip_seps()
/* the change in format when this extended role selection was converted from
   tty-only to tty+curses+? made the role selection menu require two pages
   on a traditional 24-line tty; that wasn't fair to tty, so squeeze out
   some blank separator lines from the menu if that will make it fit on one */
function maybe_skip_seps(rows, aspect) {
    const flags = game.flags;
    let i, n = 0;

    /* not much point to generalizing this to other aspects */
    if (aspect !== RS_ROLE)
        return 0;
    /*
     * If there are one or two excess lines, setup_rolemenu() will omit
     * the separator between 'random' and 'pick race first'.  If there are
     * two, plsel_startmenu() will omit the one between role info so far
     * ("<role> <race> ...") and the set of role entries.
     */

    n += 4; /* title and ensuing separator, role info so far and separator */
    for (i = 0; roles[i].name.m; ++i)
        if (ok_role(i, flags.initrace, flags.initgend, flags.initalign)
            && ok_race(i, flags.initrace, flags.initgend, flags.initalign)
            && ok_gend(i, flags.initrace, flags.initgend, flags.initalign)
            && ok_align(i, flags.initrace, flags.initgend, flags.initalign))
            ++n;
    n += 2; /* 'random' and separator */
    n += 5; /* race 1st, gender 1st, alignment 1st, reset filter, quit */
    n += 1; /* footer/prompt */
    if (rows > 0 && n > rows)
        return n - rows;
    return 0;
}

// C ref: role.c plsel_startmenu()
/* start a menu; show role aspects specified so far as a header line */
function plsel_startmenu(ttyrows, aspect) {
    const g = game;
    const flags = g.flags;
    let qbuf;
    const ROLE = () => flags.initrole, RACE = () => flags.initrace,
        GEND = () => flags.initgend, ALGN = () => flags.initalign;
    const s20 = (s) => s.slice(0, 20); /* "%.20s" */

    /* whatever aspect was just chosen might force others (Orc => chaotic,
       Samurai => Human+lawful, Valkyrie => female) */
    rigid_role_checks();

    const rolename = (ROLE() < 0) ? "<role>"
               : (GEND() === 1 && roles[ROLE()].name.f) ? roles[ROLE()].name.f
                 : roles[ROLE()].name.m;
    if (!g.plname || ROLE() < 0 || RACE() < 0 || GEND() < 0 || ALGN() < 0) {
        /* "<role> <race.noun> <gender> <alignment>" */
        qbuf = `${s20(rolename)} ${s20((RACE() < 0) ? "<race>" : races[RACE()].noun)} `
             + `${s20((GEND() < 0) ? "<gender>" : genders[GEND()].adj)} `
             + `${s20((ALGN() < 0) ? "<alignment>" : aligns[ALGN()].adj)}`;
    } else {
        /* "<name> the <alignment> <gender> <race.adjective> <role>" */
        qbuf = `${s20(g.plname)} the ${s20(aligns[ALGN()].adj)} `
             + `${s20(genders[GEND()].adj)} ${s20(races[RACE()].adj)} ${s20(rolename)}`;
    }

    const win = tty_create_nhwindow(NHW_MENU);
    if (win === WIN_ERR)
        throw new Error('panic: could not create role selection window');
    tty_start_menu(win, MENU_BEHAVE_STANDARD);

    add_menu_str(win, qbuf);
    if (maybe_skip_seps(ttyrows, aspect) !== 2)
        add_menu_str(win, "");
    return win;
}

// C ref: role.c setup_rolemenu()
/* add entries a-Archeologist, b-Barbarian, &c to menu being built in 'win' */
function setup_rolemenu(win, filtering, /* True => exclude filtered roles;
                                         * False => filter reset */
                        race, gend, algn) { /* all ROLE_NONE for !filtering case */
    let i;
    let role_ok;
    let thisch, lastch = '', rolenamebuf;
    const clr = NO_COLOR;
    let any;

    for (i = 0; roles[i].name.m; i++) {
        /* role can be constrained by any of race, gender, or alignment */
        role_ok = (ok_role(i, race, gend, algn)
                   && ok_race(i, race, gend, algn)
                   && ok_gend(i, race, gend, algn)
                   && ok_align(i, race, gend, algn));
        if (filtering && !role_ok)
            continue;
        if (filtering)
            any = i + 1;
        else
            any = roles[i].name.m;
        thisch = lowc(roles[i].name.m[0]);
        if (thisch === lastch)
            thisch = highc(thisch);
        rolenamebuf = roles[i].name.m;
        if (roles[i].name.f) {
            /* role has distinct name for female (C,P) */
            if (gend === 1) {
                /* female already chosen; replace male name */
                rolenamebuf = roles[i].name.f;
            } else if (gend < 0) {
                /* not chosen yet; append slash+female name */
                rolenamebuf += "/";
                rolenamebuf += roles[i].name.f;
            }
        }
        /* !filtering implies reset_role_filtering() where we want to
           mark this role as preselected if current filter excludes it */
        tty_add_menu(win, null, any, thisch, 0,
                     ATR_NONE, clr, an(rolenamebuf),
                     (!filtering && !role_ok)
                        ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
        lastch = thisch;
    }
}

// C ref: role.c setup_racemenu()
function setup_racemenu(win, filtering, role, gend, algn) {
    let race_ok;
    let i;
    let this_ch;
    const clr = NO_COLOR;
    let any;

    for (i = 0; races[i].noun; i++) {
        /* no ok_gend(); race isn't constrained by gender */
        race_ok = (ok_race(role, i, gend, algn)
                   && ok_role(role, i, gend, algn)
                   && ok_align(role, i, gend, algn));
        if (filtering && !race_ok)
            continue;
        if (filtering)
            any = i + 1;
        else
            any = races[i].noun;
        this_ch = races[i].noun[0];
        /* filtering: picking race, so choose by first letter, with
           capital letter as unseen accelerator;
           !filtering: resetting filter rather than picking, choose by
           capital letter since lowercase role letters will be present */
        tty_add_menu(win, null, any,
                     filtering ? this_ch : highc(this_ch),
                     filtering ? highc(this_ch) : 0,
                     ATR_NONE, clr, races[i].noun,
                     (!filtering && !race_ok)
                        ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
    }
}

// C ref: role.c setup_gendmenu()
function setup_gendmenu(win, filtering, role, race, algn) {
    let gend_ok;
    let i;
    let this_ch;
    const clr = NO_COLOR;
    let any;

    for (i = 0; i < ROLE_GENDERS; i++) {
        /* no ok_align(); gender isn't constrained by alignment */
        gend_ok = (ok_gend(role, race, i, algn)
                   && ok_role(role, race, i, algn)
                   && ok_race(role, race, i, algn));
        if (filtering && !gend_ok)
            continue;
        if (filtering)
            any = i + 1;
        else
            any = genders[i].adj;
        this_ch = genders[i].adj[0];
        /* (see setup_racemenu for explanation of selector letters
           and setup_rolemenu for preselection) */
        tty_add_menu(win, null, any,
                     filtering ? this_ch : highc(this_ch),
                     filtering ? highc(this_ch) : 0,
                     ATR_NONE, clr, genders[i].adj,
                     (!filtering && !gend_ok)
                        ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
    }
}

// C ref: role.c setup_algnmenu()
function setup_algnmenu(win, filtering, role, race, gend) {
    let algn_ok;
    let i;
    let this_ch;
    const clr = NO_COLOR;
    let any;

    for (i = 0; i < ROLE_ALIGNS; i++) {
        /* no ok_gend(); alignment isn't constrained by gender */
        algn_ok = (ok_align(role, race, gend, i)
                   && ok_role(role, race, gend, i)
                   && ok_race(role, race, gend, i));
        if (filtering && !algn_ok)
            continue;
        if (filtering)
            any = i + 1;
        else
            any = aligns[i].adj;
        this_ch = aligns[i].adj[0];
        /* (see setup_racemenu for explanation of selector letters
           and setup_rolemenu for preselection) */
        tty_add_menu(win, null, any,
                     filtering ? this_ch : highc(this_ch),
                     filtering ? highc(this_ch) : 0,
                     ATR_NONE, clr, aligns[i].adj,
                     (!filtering && !algn_ok)
                        ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
    }
}
