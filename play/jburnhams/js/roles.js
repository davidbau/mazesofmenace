import * as C from './const.js';
import * as M from './monst.js';
import * as O from './objects.js';

export const roles = [
    {
        name: { m: "Archeologist", f: 0 },
        rank: [
            { m: "Digger", f: 0 },
            { m: "Field Worker", f: 0 },
            { m: "Investigator", f: 0 },
            { m: "Exhumer", f: 0 },
            { m: "Excavator", f: 0 },
            { m: "Spelunker", f: 0 },
            { m: "Speleologist", f: 0 },
            { m: "Collector", f: 0 },
            { m: "Curator", f: 0 }
        ],
        lgod: "Quetzalcoatl",
        ngod: "Camaxtli",
        cgod: "Huhetotl",
        filecode: "Arc",
        homebase: "the College of Archeology",
        intermed: "the Tomb of the Toltec Kings",
        mnum: M.PM_ARCHEOLOGIST,
        petnum: C.NON_PM,
        ldrnum: M.PM_LORD_CARNARVON,
        guardnum: M.PM_STUDENT,
        neminum: M.PM_MINION_OF_HUHETOTL,
        enemy1num: C.NON_PM,
        enemy2num: M.PM_HUMAN_MUMMY,
        enemy1sym: C.S_SNAKE,
        enemy2sym: C.S_MUMMY,
        questarti: O.ART_ORB_OF_DETECTION,
        allow: C.M2_HUMAN | C.M2_DWARF | C.M2_GNOME | C.ROLE_MALE | C.ROLE_FEMALE | C.ROLE_LAWFUL
          | C.ROLE_NEUTRAL,
        attrbase: [  7, 10, 10, 7, 7, 7  ],
        attrdist: [  20, 20, 20, 10, 20, 10  ],
        hpadv: { infix: 11, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
        xlev: 14,
        initrecord: 10,
        spelbase: 5,
        spelheal: 0,
        spelshld: 2,
        spelarmr: 10,
        spelstat: C.A_INT,
        spelspec: O.SPE_MAGIC_MAPPING,
        spelsbon: -4
    },
    {
        name: { m: "Barbarian", f: 0 },
        rank: [
            { m: "Plunderer", f: "Plunderess" },
            { m: "Pillager", f: 0 },
            { m: "Bandit", f: 0 },
            { m: "Brigand", f: 0 },
            { m: "Raider", f: 0 },
            { m: "Reaver", f: 0 },
            { m: "Slayer", f: 0 },
            { m: "Chieftain", f: "Chieftainess" },
            { m: "Conqueror", f: "Conqueress" }
        ],
        lgod: "Mitra",
        ngod: "Crom",
        cgod: "Set",
        filecode: "Bar",
        homebase: "the Camp of the Duali Tribe",
        intermed: "the Duali Oasis",
        mnum: M.PM_BARBARIAN,
        petnum: C.NON_PM,
        ldrnum: M.PM_PELIAS,
        guardnum: M.PM_CHIEFTAIN,
        neminum: M.PM_THOTH_AMON,
        enemy1num: M.PM_OGRE,
        enemy2num: M.PM_TROLL,
        enemy1sym: C.S_OGRE,
        enemy2sym: C.S_TROLL,
        questarti: O.ART_HEART_OF_AHRIMAN,
        allow: C.M2_HUMAN | C.M2_ORC | C.ROLE_MALE | C.ROLE_FEMALE | C.ROLE_NEUTRAL
          | C.ROLE_CHAOTIC,
        attrbase: [  16, 7, 7, 15, 16, 6  ],
        attrdist: [  30, 6, 7, 20, 30, 7  ],
        hpadv: { infix: 14, inrnd: 0, lofix: 0, lornd: 10, hifix: 2, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
        xlev: 10,
        initrecord: 10,
        spelbase: 14,
        spelheal: 0,
        spelshld: 0,
        spelarmr: 8,
        spelstat: C.A_INT,
        spelspec: O.SPE_HASTE_SELF,
        spelsbon: -4
    },
    {
        name: { m: "Caveman", f: "Cavewoman" },
        rank: [
            { m: "Troglodyte", f: 0 },
            { m: "Aborigine", f: 0 },
            { m: "Wanderer", f: 0 },
            { m: "Vagrant", f: 0 },
            { m: "Wayfarer", f: 0 },
            { m: "Roamer", f: 0 },
            { m: "Nomad", f: 0 },
            { m: "Rover", f: 0 },
            { m: "Pioneer", f: 0 }
        ],
        lgod: "Anu",
        ngod: "_Ishtar",
        cgod: "Anshar",
        filecode: "Cav",
        homebase: "the Caves of the Ancestors",
        intermed: "the Dragon's Lair",
        mnum: M.PM_CAVE_DWELLER,
        petnum: M.PM_LITTLE_DOG,
        ldrnum: M.PM_SHAMAN_KARNOV,
        guardnum: M.PM_NEANDERTHAL,
        neminum: M.PM_CHROMATIC_DRAGON,
        enemy1num: M.PM_BUGBEAR,
        enemy2num: M.PM_HILL_GIANT,
        enemy1sym: C.S_HUMANOID,
        enemy2sym: C.S_GIANT,
        questarti: O.ART_SCEPTRE_OF_MIGHT,
        allow: C.M2_HUMAN | C.M2_DWARF | C.M2_GNOME | C.ROLE_MALE | C.ROLE_FEMALE | C.ROLE_LAWFUL
          | C.ROLE_NEUTRAL,
        attrbase: [  10, 7, 7, 7, 8, 6  ],
        attrdist: [  30, 6, 7, 20, 30, 7  ],
        hpadv: { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
        xlev: 10,
        initrecord: 0,
        spelbase: 12,
        spelheal: 0,
        spelshld: 1,
        spelarmr: 8,
        spelstat: C.A_INT,
        spelspec: O.SPE_DIG,
        spelsbon: -4
    },
    {
        name: { m: "Healer", f: 0 },
        rank: [
            { m: "Rhizotomist", f: 0 },
            { m: "Empiric", f: 0 },
            { m: "Embalmer", f: 0 },
            { m: "Dresser", f: 0 },
            { m: "Medicus ossium", f: "Medica ossium" },
            { m: "Herbalist", f: 0 },
            { m: "Magister", f: "Magistra" },
            { m: "Physician", f: 0 },
            { m: "Chirurgeon", f: 0 }
        ],
        lgod: "_Athena",
        ngod: "Hermes",
        cgod: "Poseidon",
        filecode: "Hea",
        homebase: "the Temple of Epidaurus",
        intermed: "the Temple of Coeus",
        mnum: M.PM_HEALER,
        petnum: C.NON_PM,
        ldrnum: M.PM_HIPPOCRATES,
        guardnum: M.PM_ATTENDANT,
        neminum: M.PM_CYCLOPS,
        enemy1num: M.PM_GIANT_RAT,
        enemy2num: M.PM_SNAKE,
        enemy1sym: C.S_RODENT,
        enemy2sym: C.S_YETI,
        questarti: O.ART_STAFF_OF_AESCULAPIUS,
        allow: C.M2_HUMAN | C.M2_GNOME | C.ROLE_MALE | C.ROLE_FEMALE | C.ROLE_NEUTRAL,
        attrbase: [  7, 7, 13, 7, 11, 16  ],
        attrdist: [  15, 20, 20, 15, 25, 5  ],
        hpadv: { infix: 11, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
        enadv: { infix: 1, inrnd: 4, lofix: 0, lornd: 1, hifix: 0, hirnd: 2 },
        xlev: 20,
        initrecord: 10,
        spelbase: 3,
        spelheal: -3,
        spelshld: 2,
        spelarmr: 10,
        spelstat: C.A_WIS,
        spelspec: O.SPE_CURE_SICKNESS,
        spelsbon: -4
    },
    {
        name: { m: "Knight", f: 0 },
        rank: [
            { m: "Gallant", f: 0 },
            { m: "Esquire", f: 0 },
            { m: "Bachelor", f: 0 },
            { m: "Sergeant", f: 0 },
            { m: "Knight", f: 0 },
            { m: "Banneret", f: 0 },
            { m: "Chevalier", f: "Chevaliere" },
            { m: "Seignieur", f: "Dame" },
            { m: "Paladin", f: 0 }
        ],
        lgod: "Lugh",
        ngod: "_Brigit",
        cgod: "Manannan Mac Lir",
        filecode: "Kni",
        homebase: "Camelot Castle",
        intermed: "the Isle of Glass",
        mnum: M.PM_KNIGHT,
        petnum: M.PM_PONY,
        ldrnum: M.PM_KING_ARTHUR,
        guardnum: M.PM_PAGE,
        neminum: M.PM_IXOTH,
        enemy1num: M.PM_QUASIT,
        enemy2num: M.PM_OCHRE_JELLY,
        enemy1sym: C.S_IMP,
        enemy2sym: C.S_JELLY,
        questarti: O.ART_MAGIC_MIRROR_OF_MERLIN,
        allow: C.M2_HUMAN | C.ROLE_MALE | C.ROLE_FEMALE | C.ROLE_LAWFUL,
        attrbase: [  13, 7, 14, 8, 10, 17  ],
        attrdist: [  30, 15, 15, 10, 20, 10  ],
        hpadv: { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 },
        enadv: { infix: 1, inrnd: 4, lofix: 0, lornd: 1, hifix: 0, hirnd: 2 },
        xlev: 10,
        initrecord: 10,
        spelbase: 8,
        spelheal: -2,
        spelshld: 0,
        spelarmr: 9,
        spelstat: C.A_WIS,
        spelspec: O.SPE_TURN_UNDEAD,
        spelsbon: -4
    },
    {
        name: { m: "Monk", f: 0 },
        rank: [
            { m: "Candidate", f: 0 },
            { m: "Novice", f: 0 },
            { m: "Initiate", f: 0 },
            { m: "Student of Stones", f: 0 },
            { m: "Student of Waters", f: 0 },
            { m: "Student of Metals", f: 0 },
            { m: "Student of Winds", f: 0 },
            { m: "Student of Fire", f: 0 },
            { m: "Master", f: 0 }
        ],
        lgod: "Shan Lai Ching",
        ngod: "Chih Sung-tzu",
        cgod: "Huan Ti",
        filecode: "Mon",
        homebase: "the Monastery of Chan-Sune",
        intermed: "the Monastery of the Earth-Lord",
        mnum: M.PM_MONK,
        petnum: C.NON_PM,
        ldrnum: M.PM_GRAND_MASTER,
        guardnum: M.PM_ABBOT,
        neminum: M.PM_MASTER_KAEN,
        enemy1num: M.PM_EARTH_ELEMENTAL,
        enemy2num: M.PM_XORN,
        enemy1sym: C.S_ELEMENTAL,
        enemy2sym: C.S_XORN,
        questarti: O.ART_EYES_OF_THE_OVERWORLD,
        allow: C.M2_HUMAN | C.ROLE_MALE | C.ROLE_FEMALE | C.ROLE_LAWFUL | C.ROLE_NEUTRAL
          | C.ROLE_CHAOTIC,
        attrbase: [  10, 7, 8, 8, 7, 7  ],
        attrdist: [  25, 10, 20, 20, 15, 10  ],
        hpadv: { infix: 12, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
        enadv: { infix: 2, inrnd: 2, lofix: 0, lornd: 2, hifix: 0, hirnd: 2 },
        xlev: 10,
        initrecord: 10,
        spelbase: 8,
        spelheal: -2,
        spelshld: 2,
        spelarmr: 20,
        spelstat: C.A_WIS,
        spelspec: O.SPE_RESTORE_ABILITY,
        spelsbon: -4
    },
    {
        name: { m: "Priest", f: "Priestess" },
        rank: [
            { m: "Aspirant", f: 0 },
            { m: "Acolyte", f: 0 },
            { m: "Adept", f: 0 },
            { m: "Priest", f: "Priestess" },
            { m: "Curate", f: 0 },
            { m: "Canon", f: "Canoness" },
            { m: "Lama", f: 0 },
            { m: "Patriarch", f: "Matriarch" },
            { m: "High Priest", f: "High Priestess" }
        ],
        lgod: 0,
        ngod: 0,
        cgod: 0,
        filecode: "Pri",
        homebase: "the Great Temple",
        intermed: "the Temple of Nalzok",
        mnum: M.PM_CLERIC,
        petnum: C.NON_PM,
        ldrnum: M.PM_ARCH_PRIEST,
        guardnum: M.PM_ACOLYTE,
        neminum: M.PM_NALZOK,
        enemy1num: M.PM_HUMAN_ZOMBIE,
        enemy2num: M.PM_WRAITH,
        enemy1sym: C.S_ZOMBIE,
        enemy2sym: C.S_WRAITH,
        questarti: O.ART_MITRE_OF_HOLINESS,
        allow: C.M2_HUMAN | C.M2_ELF | C.ROLE_MALE | C.ROLE_FEMALE | C.ROLE_LAWFUL | C.ROLE_NEUTRAL
          | C.ROLE_CHAOTIC,
        attrbase: [  7, 7, 10, 7, 7, 7  ],
        attrdist: [  15, 10, 30, 15, 20, 10  ],
        hpadv: { infix: 12, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
        enadv: { infix: 4, inrnd: 3, lofix: 0, lornd: 2, hifix: 0, hirnd: 2 },
        xlev: 10,
        initrecord: 0,
        spelbase: 3,
        spelheal: -2,
        spelshld: 2,
        spelarmr: 10,
        spelstat: C.A_WIS,
        spelspec: O.SPE_REMOVE_CURSE,
        spelsbon: -4
    },
    {
        name: { m: "Rogue", f: 0 },
        rank: [
            { m: "Footpad", f: 0 },
            { m: "Cutpurse", f: 0 },
            { m: "Rogue", f: 0 },
            { m: "Pilferer", f: 0 },
            { m: "Robber", f: 0 },
            { m: "Burglar", f: 0 },
            { m: "Filcher", f: 0 },
            { m: "Magsman", f: "Magswoman" },
            { m: "Thief", f: 0 }
        ],
        lgod: "Issek",
        ngod: "Mog",
        cgod: "Kos",
        filecode: "Rog",
        homebase: "the Thieves' Guild Hall",
        intermed: "the Assassins' Guild Hall",
        mnum: M.PM_ROGUE,
        petnum: C.NON_PM,
        ldrnum: M.PM_MASTER_OF_THIEVES,
        guardnum: M.PM_THUG,
        neminum: M.PM_MASTER_ASSASSIN,
        enemy1num: M.PM_LEPRECHAUN,
        enemy2num: M.PM_GUARDIAN_NAGA,
        enemy1sym: C.S_NYMPH,
        enemy2sym: C.S_NAGA,
        questarti: O.ART_MASTER_KEY_OF_THIEVERY,
        allow: C.M2_HUMAN | C.M2_ORC | C.ROLE_MALE | C.ROLE_FEMALE | C.ROLE_CHAOTIC,
        attrbase: [  7, 7, 7, 10, 7, 6  ],
        attrdist: [  20, 10, 10, 30, 20, 10  ],
        hpadv: { infix: 10, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
        xlev: 11,
        initrecord: 10,
        spelbase: 8,
        spelheal: 0,
        spelshld: 1,
        spelarmr: 9,
        spelstat: C.A_INT,
        spelspec: O.SPE_DETECT_TREASURE,
        spelsbon: -4
    },
    {
        name: { m: "Ranger", f: 0 },
        rank: [
            { m: "Tenderfoot", f: 0 },
            { m: "Lookout", f: 0 },
            { m: "Trailblazer", f: 0 },
            { m: "Reconnoiterer", f: "Reconnoiteress" },
            { m: "Scout", f: 0 },
            { m: "Arbalester", f: 0 },
            { m: "Archer", f: 0 },
            { m: "Sharpshooter", f: 0 },
            { m: "Marksman", f: "Markswoman" }
        ],
        lgod: "Mercury",
        ngod: "_Venus",
        cgod: "Mars",
        filecode: "Ran",
        homebase: "Orion's camp",
        intermed: "the cave of the wumpus",
        mnum: M.PM_RANGER,
        petnum: M.PM_LITTLE_DOG,
        ldrnum: M.PM_ORION,
        guardnum: M.PM_HUNTER,
        neminum: M.PM_SCORPIUS,
        enemy1num: M.PM_FOREST_CENTAUR,
        enemy2num: M.PM_SCORPION,
        enemy1sym: C.S_CENTAUR,
        enemy2sym: C.S_SPIDER,
        questarti: O.ART_LONGBOW_OF_DIANA,
        allow: C.M2_HUMAN | C.M2_ELF | C.M2_GNOME | C.M2_ORC | C.ROLE_MALE | C.ROLE_FEMALE
          | C.ROLE_NEUTRAL | C.ROLE_CHAOTIC,
        attrbase: [  13, 13, 13, 9, 13, 7  ],
        attrdist: [  30, 10, 10, 20, 20, 10  ],
        hpadv: { infix: 13, inrnd: 0, lofix: 0, lornd: 6, hifix: 1, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
        xlev: 12,
        initrecord: 10,
        spelbase: 9,
        spelheal: 2,
        spelshld: 1,
        spelarmr: 10,
        spelstat: C.A_INT,
        spelspec: O.SPE_INVISIBILITY,
        spelsbon: -4
    },
    {
        name: { m: "Samurai", f: 0 },
        rank: [
            { m: "Hatamoto", f: 0 },
            { m: "Ronin", f: 0 },
            { m: "Ninja", f: "Kunoichi" },
            { m: "Joshu", f: 0 },
            { m: "Ryoshu", f: 0 },
            { m: "Kokushu", f: 0 },
            { m: "Daimyo", f: 0 },
            { m: "Kuge", f: 0 },
            { m: "Shogun", f: 0 }
        ],
        lgod: "_Amaterasu Omikami",
        ngod: "Raijin",
        cgod: "Susanowo",
        filecode: "Sam",
        homebase: "the Castle of the Taro Clan",
        intermed: "the Shogun's Castle",
        mnum: M.PM_SAMURAI,
        petnum: M.PM_LITTLE_DOG,
        ldrnum: M.PM_LORD_SATO,
        guardnum: M.PM_ROSHI,
        neminum: M.PM_ASHIKAGA_TAKAUJI,
        enemy1num: M.PM_WOLF,
        enemy2num: M.PM_STALKER,
        enemy1sym: C.S_DOG,
        enemy2sym: C.S_ELEMENTAL,
        questarti: O.ART_TSURUGI_OF_MURAMASA,
        allow: C.M2_HUMAN | C.ROLE_MALE | C.ROLE_FEMALE | C.ROLE_LAWFUL,
        attrbase: [  10, 8, 7, 10, 17, 6  ],
        attrdist: [  30, 10, 8, 30, 14, 8  ],
        hpadv: { infix: 13, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
        xlev: 11,
        initrecord: 10,
        spelbase: 10,
        spelheal: 0,
        spelshld: 0,
        spelarmr: 8,
        spelstat: C.A_INT,
        spelspec: O.SPE_CLAIRVOYANCE,
        spelsbon: -4
    },
    {
        name: { m: "Tourist", f: 0 },
        rank: [
            { m: "Rambler", f: 0 },
            { m: "Sightseer", f: 0 },
            { m: "Excursionist", f: 0 },
            { m: "Peregrinator", f: "Peregrinatrix" },
            { m: "Traveler", f: 0 },
            { m: "Journeyer", f: 0 },
            { m: "Voyager", f: 0 },
            { m: "Explorer", f: 0 },
            { m: "Adventurer", f: 0 }
        ],
        lgod: "Blind Io",
        ngod: "_The Lady",
        cgod: "Offler",
        filecode: "Tou",
        homebase: "Ankh-Morpork",
        intermed: "the Thieves' Guild Hall",
        mnum: M.PM_TOURIST,
        petnum: C.NON_PM,
        ldrnum: M.PM_TWOFLOWER,
        guardnum: M.PM_GUIDE,
        neminum: M.PM_MASTER_OF_THIEVES,
        enemy1num: M.PM_GIANT_SPIDER,
        enemy2num: M.PM_FOREST_CENTAUR,
        enemy1sym: C.S_SPIDER,
        enemy2sym: C.S_CENTAUR,
        questarti: O.ART_YENDORIAN_EXPRESS_CARD,
        allow: C.M2_HUMAN | C.ROLE_MALE | C.ROLE_FEMALE | C.ROLE_NEUTRAL,
        attrbase: [  7, 10, 6, 7, 7, 10  ],
        attrdist: [  15, 10, 10, 15, 30, 20  ],
        hpadv: { infix: 8, inrnd: 0, lofix: 0, lornd: 8, hifix: 0, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
        xlev: 14,
        initrecord: 0,
        spelbase: 5,
        spelheal: 1,
        spelshld: 2,
        spelarmr: 10,
        spelstat: C.A_INT,
        spelspec: O.SPE_CHARM_MONSTER,
        spelsbon: -4
    },
    {
        name: { m: "Valkyrie", f: 0 },
        rank: [
            { m: "Stripling", f: 0 },
            { m: "Skirmisher", f: 0 },
            { m: "Fighter", f: 0 },
            { m: "Man-at-arms", f: "Woman-at-arms" },
            { m: "Warrior", f: 0 },
            { m: "Swashbuckler", f: 0 },
            { m: "Hero", f: "Heroine" },
            { m: "Champion", f: 0 },
            { m: "Lord", f: "Lady" }
        ],
        lgod: "Tyr",
        ngod: "Odin",
        cgod: "Loki",
        filecode: "Val",
        homebase: "the Shrine of Destiny",
        intermed: "the cave of Surtur",
        mnum: M.PM_VALKYRIE,
        petnum: C.NON_PM,
        ldrnum: M.PM_NORN,
        guardnum: M.PM_WARRIOR,
        neminum: M.PM_LORD_SURTUR,
        enemy1num: M.PM_FIRE_ANT,
        enemy2num: M.PM_FIRE_GIANT,
        enemy1sym: C.S_ANT,
        enemy2sym: C.S_GIANT,
        questarti: O.ART_ORB_OF_FATE,
        allow: C.M2_HUMAN | C.M2_DWARF | C.ROLE_FEMALE | C.ROLE_LAWFUL | C.ROLE_NEUTRAL,
        attrbase: [  10, 7, 7, 7, 10, 7  ],
        attrdist: [  30, 6, 7, 20, 30, 7  ],
        hpadv: { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
        xlev: 10,
        initrecord: 0,
        spelbase: 10,
        spelheal: -2,
        spelshld: 0,
        spelarmr: 9,
        spelstat: C.A_WIS,
        spelspec: O.SPE_CONE_OF_COLD,
        spelsbon: -4
    },
    {
        name: { m: "Wizard", f: 0 },
        rank: [
            { m: "Evoker", f: 0 },
            { m: "Conjurer", f: 0 },
            { m: "Thaumaturge", f: 0 },
            { m: "Magician", f: 0 },
            { m: "Enchanter", f: "Enchantress" },
            { m: "Sorcerer", f: "Sorceress" },
            { m: "Necromancer", f: 0 },
            { m: "Wizard", f: 0 },
            { m: "Mage", f: 0 }
        ],
        lgod: "Ptah",
        ngod: "Thoth",
        cgod: "Anhur",
        filecode: "Wiz",
        homebase: "the Lonely Tower",
        intermed: "the Tower of Darkness",
        mnum: M.PM_WIZARD,
        petnum: M.PM_KITTEN,
        ldrnum: M.PM_NEFERET_THE_GREEN,
        guardnum: M.PM_APPRENTICE,
        neminum: M.PM_DARK_ONE,
        enemy1num: M.PM_VAMPIRE_BAT,
        enemy2num: M.PM_XORN,
        enemy1sym: C.S_BAT,
        enemy2sym: C.S_WRAITH,
        questarti: O.ART_EYE_OF_THE_AETHIOPICA,
        allow: C.M2_HUMAN | C.M2_ELF | C.M2_GNOME | C.M2_ORC | C.ROLE_MALE | C.ROLE_FEMALE
          | C.ROLE_NEUTRAL | C.ROLE_CHAOTIC,
        attrbase: [  7, 10, 7, 7, 7, 7  ],
        attrdist: [  10, 30, 10, 20, 20, 10  ],
        hpadv: { infix: 10, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
        enadv: { infix: 4, inrnd: 3, lofix: 0, lornd: 2, hifix: 0, hirnd: 3 },
        xlev: 12,
        initrecord: 0,
        spelbase: 1,
        spelheal: 0,
        spelshld: 3,
        spelarmr: 10,
        spelstat: C.A_INT,
        spelspec: O.SPE_MAGIC_MISSILE,
        spelsbon: -4
    },
];

export const races = [
    {
        noun: "human",
        adj: "human",
        coll: "humanity",
        filecode: "Hum",
        individual: { m: "man", f: "woman" },
        mnum: M.PM_HUMAN,
        mummynum: M.PM_HUMAN_MUMMY,
        zombienum: M.PM_HUMAN_ZOMBIE,
        allow: C.M2_HUMAN | C.ROLE_MALE | C.ROLE_FEMALE | C.ROLE_LAWFUL | C.ROLE_NEUTRAL
            | C.ROLE_CHAOTIC,
        selfmask: C.M2_HUMAN,
        lovemask: 0,
        hatemask: C.M2_GNOME | C.M2_ORC,
        attrmin: [  3, 3, 3, 3, 3, 3  ],
        attrmax: [  C.STR18(100), 18, 18, 18, 18, 18  ],
        hpadv: { infix: 2, inrnd: 0, lofix: 0, lornd: 2, hifix: 1, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 2, lornd: 0, hifix: 2, hirnd: 0 }
    },
    {
        noun: "elf",
        adj: "elven",
        coll: "elvenkind",
        filecode: "Elf",
        individual: { m: 0, f: 0 },
        mnum: M.PM_ELF,
        mummynum: M.PM_ELF_MUMMY,
        zombienum: M.PM_ELF_ZOMBIE,
        allow: C.M2_ELF | C.ROLE_MALE | C.ROLE_FEMALE | C.ROLE_CHAOTIC,
        selfmask: C.M2_ELF,
        lovemask: C.M2_ELF,
        hatemask: C.M2_ORC,
        attrmin: [  3, 3, 3, 3, 3, 3  ],
        attrmax: [  18, 20, 20, 18, 16, 18  ],
        hpadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 1, hirnd: 0 },
        enadv: { infix: 2, inrnd: 0, lofix: 3, lornd: 0, hifix: 3, hirnd: 0 }
    },
    {
        noun: "dwarf",
        adj: "dwarven",
        coll: "dwarvenkind",
        filecode: "Dwa",
        individual: { m: 0, f: 0 },
        mnum: M.PM_DWARF,
        mummynum: M.PM_DWARF_MUMMY,
        zombienum: M.PM_DWARF_ZOMBIE,
        allow: C.M2_DWARF | C.ROLE_MALE | C.ROLE_FEMALE | C.ROLE_LAWFUL,
        selfmask: C.M2_DWARF,
        lovemask: C.M2_DWARF | C.M2_GNOME,
        hatemask: C.M2_ORC,
        attrmin: [  3, 3, 3, 3, 3, 3  ],
        attrmax: [  C.STR18(100), 16, 16, 20, 20, 16  ],
        hpadv: { infix: 4, inrnd: 0, lofix: 0, lornd: 3, hifix: 2, hirnd: 0 },
        enadv: { infix: 0, inrnd: 0, lofix: 0, lornd: 0, hifix: 0, hirnd: 0 }
    },
    {
        noun: "gnome",
        adj: "gnomish",
        coll: "gnomehood",
        filecode: "Gno",
        individual: { m: 0, f: 0 },
        mnum: M.PM_GNOME,
        mummynum: M.PM_GNOME_MUMMY,
        zombienum: M.PM_GNOME_ZOMBIE,
        allow: C.M2_GNOME | C.ROLE_MALE | C.ROLE_FEMALE | C.ROLE_NEUTRAL,
        selfmask: C.M2_GNOME,
        lovemask: C.M2_DWARF | C.M2_GNOME,
        hatemask: C.M2_HUMAN,
        attrmin: [  3, 3, 3, 3, 3, 3  ],
        attrmax: [  C.STR18(50), 19, 18, 18, 18, 18  ],
        hpadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 0 },
        enadv: { infix: 2, inrnd: 0, lofix: 2, lornd: 0, hifix: 2, hirnd: 0 }
    },
    {
        noun: "orc",
        adj: "orcish",
        coll: "orcdom",
        filecode: "Orc",
        individual: { m: 0, f: 0 },
        mnum: M.PM_ORC,
        mummynum: M.PM_ORC_MUMMY,
        zombienum: M.PM_ORC_ZOMBIE,
        allow: C.M2_ORC | C.ROLE_MALE | C.ROLE_FEMALE | C.ROLE_CHAOTIC,
        selfmask: C.M2_ORC,
        lovemask: 0,
        hatemask: C.M2_HUMAN | C.M2_ELF | C.M2_DWARF,
        attrmin: [  3, 3, 3, 3, 3, 3  ],
        attrmax: [  C.STR18(50), 16, 16, 18, 18, 16  ],
        hpadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 1, lornd: 0, hifix: 1, hirnd: 0 }
    },
];

export const genders = [
    { name: "male", he: "he", him: "him", his: "his", filecode: "Mal", allow: C.ROLE_MALE },
    { name: "female", he: "she", him: "her", his: "her", filecode: "Fem", allow: C.ROLE_FEMALE },
    { name: "neuter", he: "it", him: "it", his: "its", filecode: "Ntr", allow: C.ROLE_NEUTER },
    { name: "group", he: "they", him: "them", his: "their", filecode: "Grp", allow: 0 }
];

export const aligns = [
    { noun: "law", adj: "lawful", filecode: "Law", allow: C.ROLE_LAWFUL, value: C.A_LAWFUL },
    { noun: "balance", adj: "neutral", filecode: "Neu", allow: C.ROLE_NEUTRAL, value: C.A_NEUTRAL },
    { noun: "chaos", adj: "chaotic", filecode: "Cha", allow: C.ROLE_CHAOTIC, value: C.A_CHAOTIC },
    { noun: "evil", adj: "unaligned", filecode: "Una", allow: 0, value: C.A_NONE }
];

export function findRole(name) {
    if (!name) return null;
    const lc = name.toLowerCase();
    return roles.find(r => r.name.m.toLowerCase() === lc || (r.name.f && String(r.name.f).toLowerCase() === lc));
}

export function findRace(name) {
    if (!name) return null;
    const lc = name.toLowerCase();
    return races.find(r => r.noun.toLowerCase() === lc);
}

// Appended role and race attributes based on extraction
roles[0].attrbase = [7, 10, 10, 7, 7, 7];
roles[0].attrdist = [20, 20, 20, 10, 20, 10];
roles[0].enadv = { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 };

roles[1].attrbase = [16, 7, 7, 15, 16, 6];
roles[1].attrdist = [30, 6, 7, 20, 30, 7];
roles[1].enadv = { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 };

roles[2].attrbase = [10, 7, 7, 7, 8, 6];
roles[2].attrdist = [30, 6, 7, 20, 30, 7];
roles[2].enadv = { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 };

roles[3].attrbase = [7, 7, 13, 7, 11, 16];
roles[3].attrdist = [15, 20, 20, 15, 25, 5];
roles[3].enadv = { infix: 1, inrnd: 4, lofix: 0, lornd: 1, hifix: 0, hirnd: 2 };

roles[4].attrbase = [13, 7, 14, 8, 10, 17];
roles[4].attrdist = [30, 15, 15, 10, 20, 10];
roles[4].enadv = { infix: 1, inrnd: 4, lofix: 0, lornd: 1, hifix: 0, hirnd: 2 };

roles[5].attrbase = [10, 7, 8, 8, 7, 7];
roles[5].attrdist = [25, 10, 20, 20, 15, 10];
roles[5].enadv = { infix: 2, inrnd: 2, lofix: 0, lornd: 2, hifix: 0, hirnd: 2 };

roles[6].attrbase = [7, 7, 10, 7, 7, 7];
roles[6].attrdist = [15, 10, 30, 15, 20, 10];
roles[6].enadv = { infix: 4, inrnd: 3, lofix: 0, lornd: 2, hifix: 0, hirnd: 2 };

roles[7].attrbase = [7, 7, 7, 10, 7, 6];
roles[7].attrdist = [20, 10, 10, 30, 20, 10];
roles[7].enadv = { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 };

roles[8].attrbase = [13, 13, 13, 9, 13, 7];
roles[8].attrdist = [30, 10, 10, 20, 20, 10];
roles[8].enadv = { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 };

roles[9].attrbase = [10, 8, 7, 10, 17, 6];
roles[9].attrdist = [30, 10, 8, 30, 14, 8];
roles[9].enadv = { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 };

roles[10].attrbase = [7, 10, 6, 7, 7, 10];
roles[10].attrdist = [15, 10, 10, 15, 30, 20];
roles[10].enadv = { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 };

roles[11].attrbase = [10, 7, 7, 7, 10, 7];
roles[11].attrdist = [30, 6, 7, 20, 30, 7];
roles[11].enadv = { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 };

roles[12].attrbase = [7, 10, 7, 7, 7, 7];
roles[12].attrdist = [10, 30, 10, 20, 20, 10];
roles[12].enadv = { infix: 4, inrnd: 3, lofix: 0, lornd: 2, hifix: 0, hirnd: 3 };

races[0].attrmax = [118, 18, 18, 18, 18, 18 ];
races[0].enadv = { infix: 1, inrnd: 0, lofix: 2, lornd: 0, hifix: 2, hirnd: 0 };

races[1].attrmax = [18, 20, 20, 18, 16, 18 ];
races[1].enadv = { infix: 2, inrnd: 0, lofix: 3, lornd: 0, hifix: 3, hirnd: 0 };

races[2].attrmax = [118, 16, 16, 20, 20, 16 ];
races[2].enadv = { infix: 0, inrnd: 0, lofix: 0, lornd: 0, hifix: 0, hirnd: 0 };

races[3].attrmax = [18+50, 19, 18, 18, 18, 18 ];
races[3].enadv = { infix: 2, inrnd: 0, lofix: 2, lornd: 0, hifix: 2, hirnd: 0 };

races[4].attrmax = [18+50, 16, 16, 18, 18, 16 ];
races[4].enadv = { infix: 1, inrnd: 0, lofix: 1, lornd: 0, hifix: 1, hirnd: 0 };


// Appended hpadv attributes based on extraction
roles[0].hpadv = { infix: 11, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 };
roles[1].hpadv = { infix: 14, inrnd: 0, lofix: 0, lornd: 10, hifix: 2, hirnd: 0 };
roles[2].hpadv = { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 };
roles[3].hpadv = { infix: 11, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 };
roles[4].hpadv = { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 };
roles[5].hpadv = { infix: 12, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 };
roles[6].hpadv = { infix: 12, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 };
roles[7].hpadv = { infix: 10, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 };
roles[8].hpadv = { infix: 13, inrnd: 0, lofix: 0, lornd: 6, hifix: 1, hirnd: 0 };
roles[9].hpadv = { infix: 13, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 };
roles[10].hpadv = { infix: 8, inrnd: 0, lofix: 0, lornd: 8, hifix: 0, hirnd: 0 };
roles[11].hpadv = { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 };
roles[12].hpadv = { infix: 10, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 };

races[0].hpadv = { infix: 2, inrnd: 0, lofix: 0, lornd: 2, hifix: 1, hirnd: 0 };
races[1].hpadv = { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 1, hirnd: 0 };
races[2].hpadv = { infix: 4, inrnd: 0, lofix: 0, lornd: 3, hifix: 2, hirnd: 0 };
races[3].hpadv = { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 0 };
races[4].hpadv = { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 0 };

// Appended xlev values
roles[0].xlev = 14;
roles[1].xlev = 10;
roles[2].xlev = 10;
roles[3].xlev = 20;
roles[4].xlev = 10;
roles[5].xlev = 10;
roles[6].xlev = 10;
roles[7].xlev = 11;
roles[8].xlev = 12;
roles[9].xlev = 11;
roles[10].xlev = 14;
roles[11].xlev = 10;
roles[12].xlev = 12;
