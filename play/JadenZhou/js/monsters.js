// monsters.js — the monster table: mons[].
// C ref: include/monsters.h (the table), src/monst.c (mons_init[],
//        monst_globals_init()), include/permonst.h (struct permonst,
//        enum monnums), include/monflag.h, include/monattk.h,
//        include/defsym.h (MONSYM monster classes).
//
// The table is monsters.h transcribed entry for entry, in the same order,
// with the same conditional compilation as the C build (MAIL_STRUCTURES is
// defined in global.h; CHARON is not defined; "#if 0" entries are omitted).
// The monst.c macros (MON, NAM, NAMS, LVL, SIZ, ATTK, A) are JS functions
// that build one struct permonst each. The last MON() argument is PM_##bn,
// i.e. the entry's own enum monnums value, listed first below.
//
// mons[] is the live copy: monst_globals_init() (called from early_init())
// fills it from mons_init[], and role_init() adjusts the quest monsters.

import {
    CLR_BLACK, CLR_BLUE, CLR_BRIGHT_BLUE, CLR_BRIGHT_GREEN,
    CLR_BRIGHT_MAGENTA, CLR_BROWN, CLR_CYAN, CLR_GRAY, CLR_GREEN,
    CLR_MAGENTA, CLR_ORANGE, CLR_RED, CLR_WHITE, CLR_YELLOW,
} from './terminal.js';
import {
    A_NONE, DRAGON_SILVER, HI_DOMESTIC, HI_GOLD, HI_LEATHER, HI_LORD, HI_METAL,
    HI_OVERLORD, HI_PAPER, HI_WOOD, HI_ZAP, NON_PM, WT_BABY_DRAGON,
    WT_DRAGON, WT_ELF, WT_ETHEREAL, WT_HUMAN, WT_JELLY, WT_NYMPH,
} from './const.js';

// ---------------------------------------------------------------------------
// defsym.h: MONSYM(idx, ch, basename, sym, desc) with MONSYMS_S_ENUM
// (enum mon_class_types; 0 is reserved, MAXMCLASSES follows the last)
export const S_ANT = 1; /* 'a' ant or other insect */
export const S_BLOB = 2; /* 'b' blob */
export const S_COCKATRICE = 3; /* 'c' cockatrice */
export const S_DOG = 4; /* 'd' dog or other canine */
export const S_EYE = 5; /* 'e' eye or sphere */
export const S_FELINE = 6; /* 'f' cat or other feline */
export const S_GREMLIN = 7; /* 'g' gremlin */
export const S_HUMANOID = 8; /* 'h' humanoid */
export const S_IMP = 9; /* 'i' imp or minor demon */
export const S_JELLY = 10; /* 'j' jelly */
export const S_KOBOLD = 11; /* 'k' kobold */
export const S_LEPRECHAUN = 12; /* 'l' leprechaun */
export const S_MIMIC = 13; /* 'm' mimic */
export const S_NYMPH = 14; /* 'n' nymph */
export const S_ORC = 15; /* 'o' orc */
export const S_PIERCER = 16; /* 'p' piercer */
export const S_QUADRUPED = 17; /* 'q' quadruped */
export const S_RODENT = 18; /* 'r' rodent */
export const S_SPIDER = 19; /* 's' arachnid or centipede */
export const S_TRAPPER = 20; /* 't' trapper or lurker above */
export const S_UNICORN = 21; /* 'u' unicorn or horse */
export const S_VORTEX = 22; /* 'v' vortex */
export const S_WORM = 23; /* 'w' worm */
export const S_XAN = 24; /* 'x' xan or other mythical/fantastic insect */
export const S_LIGHT = 25; /* 'y' light */
export const S_ZRUTY = 26; /* 'z' zruty */
export const S_ANGEL = 27; /* 'A' angelic being */
export const S_BAT = 28; /* 'B' bat or bird */
export const S_CENTAUR = 29; /* 'C' centaur */
export const S_DRAGON = 30; /* 'D' dragon */
export const S_ELEMENTAL = 31; /* 'E' elemental */
export const S_FUNGUS = 32; /* 'F' fungus or mold */
export const S_GNOME = 33; /* 'G' gnome */
export const S_GIANT = 34; /* 'H' giant humanoid */
export const S_invisible = 35; /* 'I' invisible monster */
export const S_JABBERWOCK = 36; /* 'J' jabberwock */
export const S_KOP = 37; /* 'K' Keystone Kop */
export const S_LICH = 38; /* 'L' lich */
export const S_MUMMY = 39; /* 'M' mummy */
export const S_NAGA = 40; /* 'N' naga */
export const S_OGRE = 41; /* 'O' ogre */
export const S_PUDDING = 42; /* 'P' pudding or ooze */
export const S_QUANTMECH = 43; /* 'Q' quantum mechanic */
export const S_RUSTMONST = 44; /* 'R' rust monster or disenchanter */
export const S_SNAKE = 45; /* 'S' snake */
export const S_TROLL = 46; /* 'T' troll */
export const S_UMBER = 47; /* 'U' umber hulk */
export const S_VAMPIRE = 48; /* 'V' vampire */
export const S_WRAITH = 49; /* 'W' wraith */
export const S_XORN = 50; /* 'X' xorn */
export const S_YETI = 51; /* 'Y' apelike creature */
export const S_ZOMBIE = 52; /* 'Z' zombie */
export const S_HUMAN = 53; /* '@' human or elf */
export const S_GHOST = 54; /* ' ' ghost */
export const S_GOLEM = 55; /* '\'' golem */
export const S_DEMON = 56; /* '&' major demon */
export const S_EEL = 57; /* ';' sea monster */
export const S_LIZARD = 58; /* ':' lizard */
export const S_WORM_TAIL = 59; /* '~' long worm tail */
export const S_MIMIC_DEF = 60; /* ']' mimic */
export const MAXMCLASSES = 61;
// defsym.h: MONSYM with MONSYMS_DEFCHAR_ENUM (enum mon_defchars)
export const DEF_ANT = 'a';
export const DEF_BLOB = 'b';
export const DEF_COCKATRICE = 'c';
export const DEF_DOG = 'd';
export const DEF_EYE = 'e';
export const DEF_FELINE = 'f';
export const DEF_GREMLIN = 'g';
export const DEF_HUMANOID = 'h';
export const DEF_IMP = 'i';
export const DEF_JELLY = 'j';
export const DEF_KOBOLD = 'k';
export const DEF_LEPRECHAUN = 'l';
export const DEF_MIMIC = 'm';
export const DEF_NYMPH = 'n';
export const DEF_ORC = 'o';
export const DEF_PIERCER = 'p';
export const DEF_QUADRUPED = 'q';
export const DEF_RODENT = 'r';
export const DEF_SPIDER = 's';
export const DEF_TRAPPER = 't';
export const DEF_UNICORN = 'u';
export const DEF_VORTEX = 'v';
export const DEF_WORM = 'w';
export const DEF_XAN = 'x';
export const DEF_LIGHT = 'y';
export const DEF_ZRUTY = 'z';
export const DEF_ANGEL = 'A';
export const DEF_BAT = 'B';
export const DEF_CENTAUR = 'C';
export const DEF_DRAGON = 'D';
export const DEF_ELEMENTAL = 'E';
export const DEF_FUNGUS = 'F';
export const DEF_GNOME = 'G';
export const DEF_GIANT = 'H';
export const DEF_INVISIBLE = 'I';
export const DEF_JABBERWOCK = 'J';
export const DEF_KOP = 'K';
export const DEF_LICH = 'L';
export const DEF_MUMMY = 'M';
export const DEF_NAGA = 'N';
export const DEF_OGRE = 'O';
export const DEF_PUDDING = 'P';
export const DEF_QUANTMECH = 'Q';
export const DEF_RUSTMONST = 'R';
export const DEF_SNAKE = 'S';
export const DEF_TROLL = 'T';
export const DEF_UMBER = 'U';
export const DEF_VAMPIRE = 'V';
export const DEF_WRAITH = 'W';
export const DEF_XORN = 'X';
export const DEF_YETI = 'Y';
export const DEF_ZOMBIE = 'Z';
export const DEF_HUMAN = '@';
export const DEF_GHOST = ' ';
export const DEF_GOLEM = "'";
export const DEF_DEMON = '&';
export const DEF_EEL = ';';
export const DEF_LIZARD = ':';
export const DEF_WORM_TAIL = '~';
export const DEF_MIMIC_DEF = ']';

// ---------------------------------------------------------------------------
// monattk.h: attack types and damage types
export const AT_ANY = (-1); /* fake attack; dmgtype_fromattack wildcard */
export const AT_NONE = 0; /* passive monster (ex. acid blob) */
export const AT_CLAW = 1; /* claw (punch, hit, etc.) */
export const AT_BITE = 2; /* bite */
export const AT_KICK = 3; /* kick */
export const AT_BUTT = 4; /* head butt (ex. a unicorn) */
export const AT_TUCH = 5; /* touches */
export const AT_STNG = 6; /* sting */
export const AT_HUGS = 7; /* crushing bearhug */
export const AT_SPIT = 10; /* spits substance - ranged */
export const AT_ENGL = 11; /* engulf (swallow or by a cloud) */
export const AT_BREA = 12; /* breath - ranged */
export const AT_EXPL = 13; /* explodes - proximity */
export const AT_BOOM = 14; /* explodes when killed */
export const AT_GAZE = 15; /* gaze - ranged */
export const AT_TENT = 16; /* tentacles */
export const AT_WEAP = 254; /* uses weapon */
export const AT_MAGC = 255; /* uses magic spell(s) */
export const AD_ANY = (-1); /* fake damage; attacktype_fordmg wildcard */
export const AD_PHYS = 0; /* ordinary physical */
export const AD_MAGM = 1; /* magic missiles */
export const AD_FIRE = 2; /* fire damage */
export const AD_COLD = 3; /* frost damage */
export const AD_SLEE = 4; /* sleep ray */
export const AD_DISN = 5; /* disintegration (death ray) */
export const AD_ELEC = 6; /* shock damage */
export const AD_DRST = 7; /* drains str (poison) */
export const AD_ACID = 8; /* acid damage */
export const AD_SPC1 = 9; /* for extension of buzz() */
export const AD_SPC2 = 10; /* for extension of buzz() */
export const AD_BLND = 11; /* blinds (yellow light) */
export const AD_STUN = 12; /* stuns */
export const AD_SLOW = 13; /* slows */
export const AD_PLYS = 14; /* paralyzes */
export const AD_DRLI = 15; /* drains life levels (Vampire) */
export const AD_DREN = 16; /* drains magic energy */
export const AD_LEGS = 17; /* damages legs (xan) */
export const AD_STON = 18; /* petrifies (Medusa, cockatrice) */
export const AD_STCK = 19; /* sticks to you (mimic) */
export const AD_SGLD = 20; /* steals gold (leppie) */
export const AD_SITM = 21; /* steals item (nymphs) */
export const AD_SEDU = 22; /* seduces & steals multiple items */
export const AD_TLPT = 23; /* teleports you (Quantum Mech.) */
export const AD_RUST = 24; /* rusts armour (Rust Monster) */
export const AD_CONF = 25; /* confuses (Umber Hulk) */
export const AD_DGST = 26; /* digests opponent (trapper, etc.) */
export const AD_HEAL = 27; /* heals opponent's wounds (nurse) */
export const AD_WRAP = 28; /* special "stick" for eels */
export const AD_WERE = 29; /* confers lycanthropy */
export const AD_DRDX = 30; /* drains dexterity (quasit) */
export const AD_DRCO = 31; /* drains constitution */
export const AD_DRIN = 32; /* drains intelligence (mind flayer) */
export const AD_DISE = 33; /* confers diseases */
export const AD_DCAY = 34; /* decays organics (brown Pudding) */
export const AD_SSEX = 35; /* Succubus seduction (extended) */
export const AD_HALU = 36; /* causes hallucination */
export const AD_DETH = 37; /* for Death only */
export const AD_PEST = 38; /* for Pestilence only */
export const AD_FAMN = 39; /* for Famine only */
export const AD_SLIM = 40; /* turns you into green slime */
export const AD_ENCH = 41; /* remove enchantment (disenchanter) */
export const AD_CORR = 42; /* corrode armor (black pudding) */
export const AD_POLY = 43; /* polymorph the target (genetic engineer) */
export const AD_CLRC = 240; /* random clerical spell */
export const AD_SPEL = 241; /* random magic spell */
export const AD_RBRE = 242; /* random breath weapon */
export const AD_SAMU = 252; /* hits, may steal Amulet (Wizard) */
export const AD_CURS = 253; /* random curse (ex. gremlin) */

// ---------------------------------------------------------------------------
// monflag.h: enum ms_sounds
export const MS_SILENT = 0; /* makes no sound */
export const MS_BARK = 1; /* if full moon, may howl */
export const MS_MEW = 2; /* mews or hisses */
export const MS_ROAR = 3; /* roars */
export const MS_BELLOW = 4; /* adult male crocodiles; hatchlings 'chirp' */
export const MS_GROWL = 5; /* growls */
export const MS_SQEEK = 6; /* squeaks, as a rodent */
export const MS_SQAWK = 7; /* squawks, as a bird */
export const MS_CHIRP = 8; /* baby crocodile */
export const MS_HISS = 9; /* hisses */
export const MS_BUZZ = 10; /* buzzes (killer bee) */
export const MS_GRUNT = 11; /* grunts (or speaks own language) */
export const MS_NEIGH = 12; /* neighs, as an equine */
export const MS_MOO = 13; /* minotaurs, rothes */
export const MS_WAIL = 14; /* wails, as a tortured soul */
export const MS_GURGLE = 15; /* gurgles, as liquid or through saliva */
export const MS_BURBLE = 16; /* burbles (jabberwock) */
export const MS_TRUMPET = 17; /* trumpets (elephant) */
export const MS_ANIMAL = 17; /* up to here are animal noises */
export const MS_SHRIEK = 18; /* wakes up others */
export const MS_BONES = 19; /* rattles bones (skeleton) */
export const MS_LAUGH = 20; /* grins, smiles, giggles, and laughs */
export const MS_MUMBLE = 21; /* says something or other */
export const MS_IMITATE = 22; /* imitates others (leocrotta) */
export const MS_WERE = 23; /* lycanthrope in human form */
export const MS_ORC = 24; /* intelligent brutes */
export const MS_HUMANOID = 25; /* generic traveling companion */
export const MS_ARREST = 26; /* "Stop in the name of the law!" (Kops) */
export const MS_SOLDIER = 27; /* army and watchmen expressions */
export const MS_GUARD = 28; /* "Please drop that gold and follow me." */
export const MS_DJINNI = 29; /* "Thank you for freeing me!" */
export const MS_NURSE = 30; /* "Take off your shirt, please." */
export const MS_SEDUCE = 31; /* "Hello, sailor." (Nymphs) */
export const MS_VAMPIRE = 32; /* vampiric seduction, Vlad's exclamations */
export const MS_BRIBE = 33; /* asks for money, or berates you */
export const MS_CUSS = 34; /* berates (demons) or intimidates (Wiz) */
export const MS_RIDER = 35; /* astral level special monsters */
export const MS_LEADER = 36; /* your class leader */
export const MS_NEMESIS = 37; /* your nemesis */
export const MS_GUARDIAN = 38; /* your leader's guards */
export const MS_SELL = 39; /* demand payment, complain about shoplifters */
export const MS_ORACLE = 40; /* do a consultation */
export const MS_PRIEST = 41; /* ask for contribution; do cleansing */
export const MS_SPELL = 42; /* spellcaster not matching any of the above */
export const MS_BOAST = 43; /* giants */
export const MS_GROAN = 44; /* zombies groan */

// monflag.h: resistances, flags, sizes, races, generation masks
// (G_KNOWN, G_GENOD, G_EXTINCT, G_GONE and enum mgender are in const.js)
export const MR_FIRE = 0x01; /* resists fire */
export const MR_COLD = 0x02; /* resists cold */
export const MR_SLEEP = 0x04; /* resists sleep */
export const MR_DISINT = 0x08; /* resists disintegration */
export const MR_ELEC = 0x10; /* resists electricity */
export const MR_POISON = 0x20; /* resists poison */
export const MR_ACID = 0x40; /* resists acid */
export const MR_STONE = 0x80; /* resists petrification */
export const MR2_SEE_INVIS = 0x0100; /* see invisible */
export const MR2_LEVITATE = 0x0200; /* levitation */
export const MR2_WATERWALK = 0x0400; /* water walking */
export const MR2_MAGBREATH = 0x0800; /* magical breathing */
export const MR2_DISPLACED = 0x1000; /* displaced */
export const MR2_STRENGTH = 0x2000; /* gauntlets of power */
export const MR2_FUMBLING = 0x4000; /* clumsy */
export const M1_FLY = 0x00000001; /* can fly or float */
export const M1_SWIM = 0x00000002; /* can traverse water */
export const M1_AMORPHOUS = 0x00000004; /* can flow under doors */
export const M1_WALLWALK = 0x00000008; /* can phase through rock */
export const M1_CLING = 0x00000010; /* can cling to ceiling */
export const M1_TUNNEL = 0x00000020; /* can tunnel through rock */
export const M1_NEEDPICK = 0x00000040; /* needs pick to tunnel */
export const M1_CONCEAL = 0x00000080; /* hides under objects */
export const M1_HIDE = 0x00000100; /* mimics, blends in with ceiling */
export const M1_AMPHIBIOUS = 0x00000200; /* can survive underwater */
export const M1_BREATHLESS = 0x00000400; /* doesn't need to breathe */
export const M1_NOTAKE = 0x00000800; /* cannot pick up objects */
export const M1_NOEYES = 0x00001000; /* no eyes to gaze into or blind */
export const M1_NOHANDS = 0x00002000; /* no hands to handle things */
export const M1_NOLIMBS = 0x00006000; /* no arms/legs to kick/wear on */
export const M1_NOHEAD = 0x00008000; /* no head to behead */
export const M1_MINDLESS = 0x00010000; /* has no mind--golem, zombie, mold */
export const M1_HUMANOID = 0x00020000; /* has humanoid head/arms/torso */
export const M1_ANIMAL = 0x00040000; /* has animal body */
export const M1_SLITHY = 0x00080000; /* has serpent body */
export const M1_UNSOLID = 0x00100000; /* has no solid or liquid body */
export const M1_THICK_HIDE = 0x00200000; /* has thick hide or scales */
export const M1_OVIPAROUS = 0x00400000; /* can lay eggs */
export const M1_REGEN = 0x00800000; /* regenerates hit points */
export const M1_SEE_INVIS = 0x01000000; /* can see invisible creatures */
export const M1_TPORT = 0x02000000; /* can teleport */
export const M1_TPORT_CNTRL = 0x04000000; /* controls where it teleports to */
export const M1_ACID = 0x08000000; /* acidic to eat */
export const M1_POIS = 0x10000000; /* poisonous to eat */
export const M1_CARNIVORE = 0x20000000; /* eats corpses */
export const M1_HERBIVORE = 0x40000000; /* eats fruits */
export const M1_OMNIVORE = 0x60000000; /* eats both */
export const M1_METALLIVORE = 0x80000000; /* eats metal */
export const M2_NOPOLY = 0x00000001; /* players mayn't poly into one */
export const M2_UNDEAD = 0x00000002; /* is walking dead */
export const M2_WERE = 0x00000004; /* is a lycanthrope */
export const M2_HUMAN = 0x00000008; /* is a human */
export const M2_ELF = 0x00000010; /* is an elf */
export const M2_DWARF = 0x00000020; /* is a dwarf */
export const M2_GNOME = 0x00000040; /* is a gnome */
export const M2_ORC = 0x00000080; /* is an orc */
export const M2_DEMON = 0x00000100; /* is a demon */
export const M2_MERC = 0x00000200; /* is a guard or soldier */
export const M2_LORD = 0x00000400; /* is a lord to its kind */
export const M2_PRINCE = 0x00000800; /* is an overlord to its kind */
export const M2_MINION = 0x00001000; /* is a minion of a deity */
export const M2_GIANT = 0x00002000; /* is a giant */
export const M2_SHAPESHIFTER = 0x00004000; /* is a shapeshifting species */
export const M2_MALE = 0x00010000; /* always male */
export const M2_FEMALE = 0x00020000; /* always female */
export const M2_NEUTER = 0x00040000; /* neither male nor female */
export const M2_PNAME = 0x00080000; /* monster name is a proper name */
export const M2_HOSTILE = 0x00100000; /* always starts hostile */
export const M2_PEACEFUL = 0x00200000; /* always starts peaceful */
export const M2_DOMESTIC = 0x00400000; /* can be tamed by feeding */
export const M2_WANDER = 0x00800000; /* wanders randomly */
export const M2_STALK = 0x01000000; /* follows you to other levels */
export const M2_NASTY = 0x02000000; /* extra-nasty monster (more xp) */
export const M2_STRONG = 0x04000000; /* strong (or big) monster */
export const M2_ROCKTHROW = 0x08000000; /* throws boulders */
export const M2_GREEDY = 0x10000000; /* likes gold */
export const M2_JEWELS = 0x20000000; /* likes gems */
export const M2_COLLECT = 0x40000000; /* picks up weapons and food */
export const M2_MAGIC = 0x80000000; /* picks up magic items */
export const M3_WANTSAMUL = 0x0001; /* would like to steal the amulet */
export const M3_WANTSBELL = 0x0002; /* wants the bell */
export const M3_WANTSBOOK = 0x0004; /* wants the book */
export const M3_WANTSCAND = 0x0008; /* wants the candelabrum */
export const M3_WANTSARTI = 0x0010; /* wants the quest artifact */
export const M3_WANTSALL = 0x001f; /* wants any major artifact */
export const M3_WAITFORU = 0x0040; /* waits to see you or get attacked */
export const M3_CLOSE = 0x0080; /* lets you close unless attacked */
export const M3_COVETOUS = 0x001f; /* wants something */
export const M3_WAITMASK = 0x00c0; /* waiting... */
export const M3_INFRAVISION = 0x0100; /* has infravision */
export const M3_INFRAVISIBLE = 0x0200; /* visible by infravision */
export const M3_DISPLACES = 0x0400; /* moves monsters out of its way */
export const MZ_TINY = 0; /* < 2' */
export const MZ_SMALL = 1; /* 2-4' */
export const MZ_MEDIUM = 2; /* 4-7' */
export const MZ_HUMAN = MZ_MEDIUM; /* human-sized */
export const MZ_LARGE = 3; /* 7-12' */
export const MZ_HUGE = 4; /* 12-25' */
export const MZ_GIGANTIC = 7; /* off the scale */
export const MH_HUMAN = M2_HUMAN;
export const MH_ELF = M2_ELF;
export const MH_DWARF = M2_DWARF;
export const MH_GNOME = M2_GNOME;
export const MH_ORC = M2_ORC;
export const G_UNIQ = 0x1000; /* generated only once */
export const G_NOHELL = 0x0800; /* not generated in "hell" */
export const G_HELL = 0x0400; /* generated only in "hell" */
export const G_NOGEN = 0x0200; /* generated only specially */
export const G_SGROUP = 0x0080; /* appear in small groups normally */
export const G_LGROUP = 0x0040; /* appear in large groups normally */
export const G_GENO = 0x0020; /* can be genocided */
export const G_NOCORPSE = 0x0010; /* no corpse left ever */
export const G_FREQ = 0x0007; /* creation frequency mask */
export const G_IGNORE = 0x8000; /* for mkclass(), ignore G_GENOD|G_EXTINCT */
export const MV_KNOWS_EGG = 0x08; /* player recognizes egg of this monster type */

// ---------------------------------------------------------------------------
// permonst.h
export const NATTK = 6; /* max # of attacks for any given monster */
export const NORMAL_SPEED = 12;

// permonst.h: enum monnums (MONS_ENUM expansion of monsters.h)
export const PM_GIANT_ANT = 0;
export const PM_KILLER_BEE = 1;
export const PM_SOLDIER_ANT = 2;
export const PM_FIRE_ANT = 3;
export const PM_GIANT_BEETLE = 4;
export const PM_QUEEN_BEE = 5;
export const PM_ACID_BLOB = 6;
export const PM_QUIVERING_BLOB = 7;
export const PM_GELATINOUS_CUBE = 8;
export const PM_CHICKATRICE = 9;
export const PM_COCKATRICE = 10;
export const PM_PYROLISK = 11;
export const PM_JACKAL = 12;
export const PM_FOX = 13;
export const PM_COYOTE = 14;
export const PM_WEREJACKAL = 15;
export const PM_LITTLE_DOG = 16;
export const PM_DINGO = 17;
export const PM_DOG = 18;
export const PM_LARGE_DOG = 19;
export const PM_WOLF = 20;
export const PM_WEREWOLF = 21;
export const PM_WINTER_WOLF_CUB = 22;
export const PM_WARG = 23;
export const PM_WINTER_WOLF = 24;
export const PM_HELL_HOUND_PUP = 25;
export const PM_HELL_HOUND = 26;
export const PM_GAS_SPORE = 27;
export const PM_FLOATING_EYE = 28;
export const PM_FREEZING_SPHERE = 29;
export const PM_FLAMING_SPHERE = 30;
export const PM_SHOCKING_SPHERE = 31;
export const PM_KITTEN = 32;
export const PM_HOUSECAT = 33;
export const PM_JAGUAR = 34;
export const PM_LYNX = 35;
export const PM_PANTHER = 36;
export const PM_LARGE_CAT = 37;
export const PM_TIGER = 38;
export const PM_DISPLACER_BEAST = 39;
export const PM_GREMLIN = 40;
export const PM_GARGOYLE = 41;
export const PM_WINGED_GARGOYLE = 42;
export const PM_HOBBIT = 43;
export const PM_DWARF = 44;
export const PM_BUGBEAR = 45;
export const PM_DWARF_LEADER = 46;
export const PM_DWARF_RULER = 47;
export const PM_MIND_FLAYER = 48;
export const PM_MASTER_MIND_FLAYER = 49;
export const PM_MANES = 50;
export const PM_HOMUNCULUS = 51;
export const PM_IMP = 52;
export const PM_LEMURE = 53;
export const PM_QUASIT = 54;
export const PM_TENGU = 55;
export const PM_BLUE_JELLY = 56;
export const PM_SPOTTED_JELLY = 57;
export const PM_OCHRE_JELLY = 58;
export const PM_KOBOLD = 59;
export const PM_LARGE_KOBOLD = 60;
export const PM_KOBOLD_LEADER = 61;
export const PM_KOBOLD_SHAMAN = 62;
export const PM_LEPRECHAUN = 63;
export const PM_SMALL_MIMIC = 64;
export const PM_LARGE_MIMIC = 65;
export const PM_GIANT_MIMIC = 66;
export const PM_WOOD_NYMPH = 67;
export const PM_WATER_NYMPH = 68;
export const PM_MOUNTAIN_NYMPH = 69;
export const PM_GOBLIN = 70;
export const PM_HOBGOBLIN = 71;
export const PM_ORC = 72;
export const PM_HILL_ORC = 73;
export const PM_MORDOR_ORC = 74;
export const PM_URUK_HAI = 75;
export const PM_ORC_SHAMAN = 76;
export const PM_ORC_CAPTAIN = 77;
export const PM_ROCK_PIERCER = 78;
export const PM_IRON_PIERCER = 79;
export const PM_GLASS_PIERCER = 80;
export const PM_ROTHE = 81;
export const PM_MUMAK = 82;
export const PM_LEOCROTTA = 83;
export const PM_WUMPUS = 84;
export const PM_TITANOTHERE = 85;
export const PM_BALUCHITHERIUM = 86;
export const PM_MASTODON = 87;
export const PM_SEWER_RAT = 88;
export const PM_GIANT_RAT = 89;
export const PM_RABID_RAT = 90;
export const PM_WERERAT = 91;
export const PM_ROCK_MOLE = 92;
export const PM_WOODCHUCK = 93;
export const PM_CAVE_SPIDER = 94;
export const PM_CENTIPEDE = 95;
export const PM_GIANT_SPIDER = 96;
export const PM_SCORPION = 97;
export const PM_LURKER_ABOVE = 98;
export const PM_TRAPPER = 99;
export const PM_PONY = 100;
export const PM_WHITE_UNICORN = 101;
export const PM_GRAY_UNICORN = 102;
export const PM_BLACK_UNICORN = 103;
export const PM_HORSE = 104;
export const PM_WARHORSE = 105;
export const PM_FOG_CLOUD = 106;
export const PM_DUST_VORTEX = 107;
export const PM_ICE_VORTEX = 108;
export const PM_ENERGY_VORTEX = 109;
export const PM_STEAM_VORTEX = 110;
export const PM_FIRE_VORTEX = 111;
export const PM_BABY_LONG_WORM = 112;
export const PM_BABY_PURPLE_WORM = 113;
export const PM_LONG_WORM = 114;
export const PM_PURPLE_WORM = 115;
export const PM_GRID_BUG = 116;
export const PM_XAN = 117;
export const PM_YELLOW_LIGHT = 118;
export const PM_BLACK_LIGHT = 119;
export const PM_ZRUTY = 120;
export const PM_COUATL = 121;
export const PM_ALEAX = 122;
export const PM_ANGEL = 123;
export const PM_KI_RIN = 124;
export const PM_ARCHON = 125;
export const PM_BAT = 126;
export const PM_GIANT_BAT = 127;
export const PM_RAVEN = 128;
export const PM_VAMPIRE_BAT = 129;
export const PM_PLAINS_CENTAUR = 130;
export const PM_FOREST_CENTAUR = 131;
export const PM_MOUNTAIN_CENTAUR = 132;
export const PM_BABY_GRAY_DRAGON = 133;
export const PM_BABY_GOLD_DRAGON = 134;
export const PM_BABY_SILVER_DRAGON = 135;
export const PM_BABY_RED_DRAGON = 136;
export const PM_BABY_WHITE_DRAGON = 137;
export const PM_BABY_ORANGE_DRAGON = 138;
export const PM_BABY_BLACK_DRAGON = 139;
export const PM_BABY_BLUE_DRAGON = 140;
export const PM_BABY_GREEN_DRAGON = 141;
export const PM_BABY_YELLOW_DRAGON = 142;
export const PM_GRAY_DRAGON = 143;
export const PM_GOLD_DRAGON = 144;
export const PM_SILVER_DRAGON = 145;
export const PM_RED_DRAGON = 146;
export const PM_WHITE_DRAGON = 147;
export const PM_ORANGE_DRAGON = 148;
export const PM_BLACK_DRAGON = 149;
export const PM_BLUE_DRAGON = 150;
export const PM_GREEN_DRAGON = 151;
export const PM_YELLOW_DRAGON = 152;
export const PM_STALKER = 153;
export const PM_AIR_ELEMENTAL = 154;
export const PM_FIRE_ELEMENTAL = 155;
export const PM_EARTH_ELEMENTAL = 156;
export const PM_WATER_ELEMENTAL = 157;
export const PM_LICHEN = 158;
export const PM_BROWN_MOLD = 159;
export const PM_YELLOW_MOLD = 160;
export const PM_GREEN_MOLD = 161;
export const PM_RED_MOLD = 162;
export const PM_SHRIEKER = 163;
export const PM_VIOLET_FUNGUS = 164;
export const PM_GNOME = 165;
export const PM_GNOME_LEADER = 166;
export const PM_GNOMISH_WIZARD = 167;
export const PM_GNOME_RULER = 168;
export const PM_GIANT = 169;
export const PM_STONE_GIANT = 170;
export const PM_HILL_GIANT = 171;
export const PM_FIRE_GIANT = 172;
export const PM_FROST_GIANT = 173;
export const PM_ETTIN = 174;
export const PM_STORM_GIANT = 175;
export const PM_TITAN = 176;
export const PM_MINOTAUR = 177;
export const PM_JABBERWOCK = 178;
export const PM_KEYSTONE_KOP = 179;
export const PM_KOP_SERGEANT = 180;
export const PM_KOP_LIEUTENANT = 181;
export const PM_KOP_KAPTAIN = 182;
export const PM_LICH = 183;
export const PM_DEMILICH = 184;
export const PM_MASTER_LICH = 185;
export const PM_ARCH_LICH = 186;
export const PM_KOBOLD_MUMMY = 187;
export const PM_GNOME_MUMMY = 188;
export const PM_ORC_MUMMY = 189;
export const PM_DWARF_MUMMY = 190;
export const PM_ELF_MUMMY = 191;
export const PM_HUMAN_MUMMY = 192;
export const PM_ETTIN_MUMMY = 193;
export const PM_GIANT_MUMMY = 194;
export const PM_RED_NAGA_HATCHLING = 195;
export const PM_BLACK_NAGA_HATCHLING = 196;
export const PM_GOLDEN_NAGA_HATCHLING = 197;
export const PM_GUARDIAN_NAGA_HATCHLING = 198;
export const PM_RED_NAGA = 199;
export const PM_BLACK_NAGA = 200;
export const PM_GOLDEN_NAGA = 201;
export const PM_GUARDIAN_NAGA = 202;
export const PM_OGRE = 203;
export const PM_OGRE_LEADER = 204;
export const PM_OGRE_TYRANT = 205;
export const PM_GRAY_OOZE = 206;
export const PM_BROWN_PUDDING = 207;
export const PM_GREEN_SLIME = 208;
export const PM_BLACK_PUDDING = 209;
export const PM_QUANTUM_MECHANIC = 210;
export const PM_GENETIC_ENGINEER = 211;
export const PM_RUST_MONSTER = 212;
export const PM_DISENCHANTER = 213;
export const PM_GARTER_SNAKE = 214;
export const PM_SNAKE = 215;
export const PM_WATER_MOCCASIN = 216;
export const PM_PYTHON = 217;
export const PM_PIT_VIPER = 218;
export const PM_COBRA = 219;
export const PM_TROLL = 220;
export const PM_ICE_TROLL = 221;
export const PM_ROCK_TROLL = 222;
export const PM_WATER_TROLL = 223;
export const PM_OLOG_HAI = 224;
export const PM_UMBER_HULK = 225;
export const PM_VAMPIRE = 226;
export const PM_VAMPIRE_LEADER = 227;
export const PM_VLAD_THE_IMPALER = 228;
export const PM_BARROW_WIGHT = 229;
export const PM_WRAITH = 230;
export const PM_NAZGUL = 231;
export const PM_XORN = 232;
export const PM_MONKEY = 233;
export const PM_APE = 234;
export const PM_OWLBEAR = 235;
export const PM_YETI = 236;
export const PM_CARNIVOROUS_APE = 237;
export const PM_SASQUATCH = 238;
export const PM_KOBOLD_ZOMBIE = 239;
export const PM_GNOME_ZOMBIE = 240;
export const PM_ORC_ZOMBIE = 241;
export const PM_DWARF_ZOMBIE = 242;
export const PM_ELF_ZOMBIE = 243;
export const PM_HUMAN_ZOMBIE = 244;
export const PM_ETTIN_ZOMBIE = 245;
export const PM_GHOUL = 246;
export const PM_GIANT_ZOMBIE = 247;
export const PM_SKELETON = 248;
export const PM_STRAW_GOLEM = 249;
export const PM_PAPER_GOLEM = 250;
export const PM_ROPE_GOLEM = 251;
export const PM_GOLD_GOLEM = 252;
export const PM_LEATHER_GOLEM = 253;
export const PM_WOOD_GOLEM = 254;
export const PM_FLESH_GOLEM = 255;
export const PM_CLAY_GOLEM = 256;
export const PM_STONE_GOLEM = 257;
export const PM_GLASS_GOLEM = 258;
export const PM_IRON_GOLEM = 259;
export const PM_HUMAN = 260;
export const PM_HUMAN_WERERAT = 261;
export const PM_HUMAN_WEREJACKAL = 262;
export const PM_HUMAN_WEREWOLF = 263;
export const PM_ELF = 264;
export const PM_WOODLAND_ELF = 265;
export const PM_GREEN_ELF = 266;
export const PM_GREY_ELF = 267;
export const PM_ELF_NOBLE = 268;
export const PM_ELVEN_MONARCH = 269;
export const PM_DOPPELGANGER = 270;
export const PM_SHOPKEEPER = 271;
export const PM_GUARD = 272;
export const PM_PRISONER = 273;
export const PM_ORACLE = 274;
export const PM_ALIGNED_CLERIC = 275;
export const PM_HIGH_CLERIC = 276;
export const PM_SOLDIER = 277;
export const PM_SERGEANT = 278;
export const PM_NURSE = 279;
export const PM_LIEUTENANT = 280;
export const PM_CAPTAIN = 281;
export const PM_WATCHMAN = 282;
export const PM_WATCH_CAPTAIN = 283;
export const PM_MEDUSA = 284;
export const PM_WIZARD_OF_YENDOR = 285;
export const PM_CROESUS = 286;
export const PM_GHOST = 287;
export const PM_SHADE = 288;
export const PM_WATER_DEMON = 289;
export const PM_AMOROUS_DEMON = 290;
export const PM_HORNED_DEVIL = 291;
export const PM_ERINYS = 292;
export const PM_BARBED_DEVIL = 293;
export const PM_MARILITH = 294;
export const PM_VROCK = 295;
export const PM_HEZROU = 296;
export const PM_BONE_DEVIL = 297;
export const PM_ICE_DEVIL = 298;
export const PM_NALFESHNEE = 299;
export const PM_PIT_FIEND = 300;
export const PM_SANDESTIN = 301;
export const PM_BALROG = 302;
export const PM_JUIBLEX = 303;
export const PM_YEENOGHU = 304;
export const PM_ORCUS = 305;
export const PM_GERYON = 306;
export const PM_DISPATER = 307;
export const PM_BAALZEBUB = 308;
export const PM_ASMODEUS = 309;
export const PM_DEMOGORGON = 310;
export const PM_DEATH = 311;
export const PM_PESTILENCE = 312;
export const PM_FAMINE = 313;
export const PM_MAIL_DAEMON = 314;
export const PM_DJINNI = 315;
export const PM_JELLYFISH = 316;
export const PM_PIRANHA = 317;
export const PM_SHARK = 318;
export const PM_GIANT_EEL = 319;
export const PM_ELECTRIC_EEL = 320;
export const PM_KRAKEN = 321;
export const PM_NEWT = 322;
export const PM_GECKO = 323;
export const PM_IGUANA = 324;
export const PM_BABY_CROCODILE = 325;
export const PM_LIZARD = 326;
export const PM_CHAMELEON = 327;
export const PM_CROCODILE = 328;
export const PM_SALAMANDER = 329;
export const PM_LONG_WORM_TAIL = 330;
export const PM_ARCHEOLOGIST = 331;
export const PM_BARBARIAN = 332;
export const PM_CAVE_DWELLER = 333;
export const PM_HEALER = 334;
export const PM_KNIGHT = 335;
export const PM_MONK = 336;
export const PM_CLERIC = 337;
export const PM_RANGER = 338;
export const PM_ROGUE = 339;
export const PM_SAMURAI = 340;
export const PM_TOURIST = 341;
export const PM_VALKYRIE = 342;
export const PM_WIZARD = 343;
export const PM_LORD_CARNARVON = 344;
export const PM_PELIAS = 345;
export const PM_SHAMAN_KARNOV = 346;
export const PM_HIPPOCRATES = 347;
export const PM_KING_ARTHUR = 348;
export const PM_GRAND_MASTER = 349;
export const PM_ARCH_PRIEST = 350;
export const PM_ORION = 351;
export const PM_MASTER_OF_THIEVES = 352;
export const PM_LORD_SATO = 353;
export const PM_TWOFLOWER = 354;
export const PM_NORN = 355;
export const PM_NEFERET_THE_GREEN = 356;
export const PM_MINION_OF_HUHETOTL = 357;
export const PM_THOTH_AMON = 358;
export const PM_CHROMATIC_DRAGON = 359;
export const PM_CYCLOPS = 360;
export const PM_IXOTH = 361;
export const PM_MASTER_KAEN = 362;
export const PM_NALZOK = 363;
export const PM_SCORPIUS = 364;
export const PM_MASTER_ASSASSIN = 365;
export const PM_ASHIKAGA_TAKAUJI = 366;
export const PM_LORD_SURTUR = 367;
export const PM_DARK_ONE = 368;
export const PM_STUDENT = 369;
export const PM_CHIEFTAIN = 370;
export const PM_NEANDERTHAL = 371;
export const PM_ATTENDANT = 372;
export const PM_PAGE = 373;
export const PM_ABBOT = 374;
export const PM_ACOLYTE = 375;
export const PM_HUNTER = 376;
export const PM_THUG = 377;
export const PM_NINJA = 378;
export const PM_ROSHI = 379;
export const PM_GUIDE = 380;
export const PM_WARRIOR = 381;
export const PM_APPRENTICE = 382;
export const NUMMONS = 383;
export const LOW_PM = NON_PM + 1;       /* first monster in mons */
export const LEAVESTATUE = NON_PM - 1;  /* leave statue instead of corpse */
export const HIGH_PM = NUMMONS - 1;
export const SPECIAL_PM = PM_LONG_WORM_TAIL; /* [normal] < ~ < [special] */

// ---------------------------------------------------------------------------
// monst.c: table-building macros

// C ref: monst.c NAM() -- { (const char *) 0, (const char *) 0, name }
function NAM(name) { return [null, null, name]; }
// C ref: monst.c NAMS() -- { namm, namf, namn }
function NAMS(namm, namf, namn) { return [namm, namf, namn]; }
// C ref: monst.c LVL() -- lvl, mov, ac, mr, aln
function LVL(lvl, mov, ac, mr, aln) { return [lvl, mov, ac, mr, aln]; }
// C ref: monst.c SIZ() -- wt, nut, snd, siz
function SIZ(wt, nut, snd, siz) { return [wt, nut, snd, siz]; }
// C ref: monst.c ATTK() -- { at, ad, n, d } (struct attack)
function ATTK(at, ad, n, d) { return { aatyp: at, adtyp: ad, damn: n, damd: d }; }
// C ref: monst.c A() -- { a1, a2, a3, a4, a5, a6 }
function A(a1, a2, a3, a4, a5, a6) { return [a1, a2, a3, a4, a5, a6]; }
// C ref: monst.c NO_ATTK -- { 0, 0, 0, 0 }
const NO_ATTK = ATTK(0, 0, 0, 0);

// C ref: monst.c MON() -- one struct permonst:
//   { nam, PM_##bn, sym, lvl, gen, atk, siz, mr1, mr2, flg1, flg2, flg3, d, col }
function MON(nam, sym, lvl, gen, atk, siz, mr1, mr2, flg1, flg2, flg3, d, col,
             pmidx) {
    const [mlevel, mmove, ac, mr, maligntyp] = lvl;
    const [cwt, cnutrit, msound, msize] = siz;
    return {
        pmnames: nam,           /* [MALE, FEMALE, NEUTRAL] names */
        pmidx,                  /* mons array index aka PM_ identifier */
        mlet: sym,              /* symbol */
        mlevel,                 /* base monster level */
        mmove,                  /* move speed */
        ac,                     /* (base) armor class */
        mr,                     /* (base) magic resistance */
        maligntyp,              /* basic monster alignment */
        geno: gen,              /* creation/geno mask value */
        mattk: atk,             /* attacks matrix */
        cwt,                    /* weight of corpse */
        cnutrit,                /* its nutritional value */
        msound,                 /* noise it makes (6 bits) */
        msize,                  /* physical size (3 bits) */
        mresists: mr1,          /* resistances */
        mconveys: mr2,          /* conveyed by eating */
        mflags1: flg1 >>> 0,    /* boolean bitflags (unsigned long) */
        mflags2: flg2 >>> 0,    /* more boolean bitflags (unsigned long) */
        mflags3: flg3,          /* yet more boolean bitflags */
        difficulty: d,          /* toughness (formerly from  makedefs -m) */
        mcolor: col,            /* color to use */
    };
}

// monsters.h: standard demons & devils
const SEDUCTION_ATTACKS_YES = A(ATTK(AT_BITE, AD_SSEX, 0, 0), ATTK(AT_CLAW, AD_PHYS, 1, 3),  ATTK(AT_CLAW, AD_PHYS, 1, 3), NO_ATTK, NO_ATTK, NO_ATTK);
const SEDUCTION_ATTACKS_NO = A(ATTK(AT_CLAW, AD_PHYS, 1, 3), ATTK(AT_CLAW, AD_PHYS, 1, 3),  ATTK(AT_BITE, AD_DRLI, 2, 6), NO_ATTK, NO_ATTK, NO_ATTK);

// C ref: monst.c mons_init[NUMMONS + 1]
const mons_init = [
    MON(NAM("giant ant"), S_ANT,
        LVL(2, 18, 3, 0, 0), (G_GENO | G_SGROUP | 3),
        A(ATTK(AT_BITE, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(10, 10, MS_SILENT, MZ_TINY), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_CARNIVORE, M2_HOSTILE, 0,
        4, CLR_BROWN, PM_GIANT_ANT),
    MON(NAM("killer bee"), S_ANT,
        LVL(1, 18, -1, 0, 0), (G_GENO | G_LGROUP | 2),
        A(ATTK(AT_STNG, AD_DRST, 1, 3),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1, 5, MS_BUZZ, MZ_TINY), MR_POISON, MR_POISON,
        M1_ANIMAL | M1_FLY | M1_NOHANDS | M1_POIS, M2_HOSTILE | M2_FEMALE, 0,
        6, CLR_YELLOW, PM_KILLER_BEE),
    MON(NAM("soldier ant"), S_ANT,
        LVL(3, 18, 3, 0, 0), (G_GENO | G_SGROUP | 2),
        A(ATTK(AT_BITE, AD_PHYS, 2, 4), ATTK(AT_STNG, AD_DRST, 3, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(20, 5, MS_SILENT, MZ_TINY), MR_POISON, MR_POISON,
        M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_POIS | M1_CARNIVORE,
        M2_HOSTILE, 0,
        7, CLR_BLUE, PM_SOLDIER_ANT),
    MON(NAM("fire ant"), S_ANT,
        LVL(3, 18, 3, 10, 0), (G_GENO | G_SGROUP | 1),
        A(ATTK(AT_BITE, AD_PHYS, 2, 4), ATTK(AT_BITE, AD_FIRE, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(30, 10, MS_SILENT, MZ_TINY), MR_FIRE, MR_FIRE,
        M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_CARNIVORE, M2_HOSTILE,
        M3_INFRAVISIBLE,
        6, CLR_RED, PM_FIRE_ANT),
    MON(NAM("giant beetle"), S_ANT,
        LVL(5, 6, 4, 0, 0), (G_GENO | 3),
        A(ATTK(AT_BITE, AD_PHYS, 3, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(200, 50, MS_SILENT, MZ_LARGE), MR_POISON, MR_POISON,
        M1_ANIMAL | M1_NOHANDS | M1_POIS | M1_CARNIVORE, M2_HOSTILE, 0,
        6, CLR_BLACK, PM_GIANT_BEETLE),
    MON(NAM("queen bee"), S_ANT,
        LVL(9, 24, -4, 0, 0), (G_GENO | G_NOGEN),
        A(ATTK(AT_STNG, AD_DRST, 1, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1, 5, MS_BUZZ, MZ_TINY), MR_POISON, MR_POISON,
        M1_ANIMAL | M1_FLY | M1_NOHANDS | M1_OVIPAROUS | M1_POIS,
        M2_HOSTILE | M2_FEMALE | M2_PRINCE, 0,
        12, HI_LORD, PM_QUEEN_BEE),
    /*
     * blobs
     */
    MON(NAM("acid blob"), S_BLOB,
        LVL(1, 3, 8, 0, 0), (G_GENO | 2),
        A(ATTK(AT_NONE, AD_ACID, 1, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(30, 10, MS_SILENT, MZ_TINY),
        MR_SLEEP | MR_POISON | MR_ACID | MR_STONE, MR_ACID | MR_STONE,
        M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_ACID,
        M2_WANDER | M2_NEUTER, 0,
        2, CLR_GREEN, PM_ACID_BLOB),
    MON(NAM("quivering blob"), S_BLOB,
        LVL(5, 1, 8, 0, 0), (G_GENO | 2),
        A(ATTK(AT_TUCH, AD_PHYS, 1, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(200, 100, MS_SILENT, MZ_SMALL), MR_SLEEP | MR_POISON, MR_POISON,
        M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS,
        M2_WANDER | M2_HOSTILE | M2_NEUTER, 0,
        6, CLR_WHITE, PM_QUIVERING_BLOB),
    MON(NAM("gelatinous cube"), S_BLOB,
        LVL(6, 6, 8, 0, 0), (G_GENO | 2),
        A(ATTK(AT_TUCH, AD_PLYS, 2, 4), ATTK(AT_NONE, AD_PLYS, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(600, 150, MS_SILENT, MZ_LARGE),
        MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON | MR_ACID
            | MR_STONE,
        MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP,
        M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS | M1_OMNIVORE
            | M1_ACID,
        M2_WANDER | M2_HOSTILE | M2_NEUTER, 0,
        8, CLR_CYAN, PM_GELATINOUS_CUBE),
    /*
     * cockatrice
     */
    MON(NAM("chickatrice"), S_COCKATRICE,
        LVL(4, 4, 8, 30, 0), (G_GENO | G_SGROUP | 1),
        A(ATTK(AT_BITE, AD_PHYS, 1, 2), ATTK(AT_TUCH, AD_STON, 0, 0),
          ATTK(AT_NONE, AD_STON, 0, 0), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(10, 10, MS_HISS, MZ_TINY), MR_POISON | MR_STONE,
        MR_POISON | MR_STONE, M1_ANIMAL | M1_NOHANDS | M1_OMNIVORE,
        M2_HOSTILE, M3_INFRAVISIBLE,
        7, CLR_BROWN, PM_CHICKATRICE),
    MON(NAM("cockatrice"), S_COCKATRICE,
        LVL(5, 6, 6, 30, 0), (G_GENO | 5),
        A(ATTK(AT_BITE, AD_PHYS, 1, 3), ATTK(AT_TUCH, AD_STON, 0, 0),
          ATTK(AT_NONE, AD_STON, 0, 0), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(30, 30, MS_HISS, MZ_SMALL), MR_POISON | MR_STONE,
        MR_POISON | MR_STONE,
        M1_ANIMAL | M1_NOHANDS | M1_OMNIVORE | M1_OVIPAROUS, M2_HOSTILE,
        M3_INFRAVISIBLE,
        8, CLR_YELLOW, PM_COCKATRICE),
    MON(NAM("pyrolisk"), S_COCKATRICE,
        LVL(6, 6, 6, 30, 0), (G_GENO | 1),
        A(ATTK(AT_GAZE, AD_FIRE, 2, 6), ATTK(AT_BITE, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(30, 30, MS_HISS, MZ_SMALL), MR_POISON | MR_FIRE,
        MR_POISON | MR_FIRE,
        M1_ANIMAL | M1_NOHANDS | M1_OMNIVORE | M1_OVIPAROUS, M2_HOSTILE,
        M3_INFRAVISIBLE,
        8, CLR_RED, PM_PYROLISK),
    /*
     * dogs & other canines
     */
    MON(NAM("jackal"), S_DOG,
        LVL(0, 12, 7, 0, 0), (G_GENO | G_SGROUP | 3),
        A(ATTK(AT_BITE, AD_PHYS, 1, 2),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(300, 250, MS_BARK, MZ_SMALL), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_HOSTILE, M3_INFRAVISIBLE,
        1, CLR_BROWN, PM_JACKAL),
    MON(NAM("fox"), S_DOG,
        LVL(0, 15, 7, 0, 0), (G_GENO | 1),
        A(ATTK(AT_BITE, AD_PHYS, 1, 3),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(300, 250, MS_BARK, MZ_SMALL), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_HOSTILE, M3_INFRAVISIBLE,
        1, CLR_RED, PM_FOX),
    MON(NAM("coyote"), S_DOG,
        LVL(1, 12, 7, 0, 0), (G_GENO | G_SGROUP | 1),
        A(ATTK(AT_BITE, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(300, 250, MS_BARK, MZ_SMALL), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_HOSTILE, M3_INFRAVISIBLE,
        2, CLR_BROWN, PM_COYOTE),
    MON(NAM("werejackal"), S_DOG,
        LVL(2, 12, 7, 10, -7), (G_NOGEN | G_NOCORPSE),
        A(ATTK(AT_BITE, AD_WERE, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(300, 250, MS_BARK, MZ_SMALL), MR_POISON, 0,
        M1_NOHANDS | M1_POIS | M1_REGEN | M1_CARNIVORE,
        M2_NOPOLY | M2_WERE | M2_HOSTILE, M3_INFRAVISIBLE,
        4, CLR_BROWN, PM_WEREJACKAL),
    MON(NAM("little dog"), S_DOG,
        LVL(2, 18, 6, 0, 0), (G_GENO | 1),
        A(ATTK(AT_BITE, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(150, 150, MS_BARK, MZ_SMALL), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_DOMESTIC, M3_INFRAVISIBLE,
        3, HI_DOMESTIC, PM_LITTLE_DOG),
    MON(NAM("dingo"), S_DOG,
        LVL(4, 16, 5, 0, 0), (G_GENO | 1),
        A(ATTK(AT_BITE, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(400, 200, MS_BARK, MZ_MEDIUM), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_HOSTILE, M3_INFRAVISIBLE,
        5, CLR_YELLOW, PM_DINGO),
    MON(NAM("dog"), S_DOG,
        LVL(4, 16, 5, 0, 0), (G_GENO | 1),
        A(ATTK(AT_BITE, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(400, 200, MS_BARK, MZ_MEDIUM), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_DOMESTIC, M3_INFRAVISIBLE,
        5, HI_DOMESTIC, PM_DOG),
    MON(NAM("large dog"), S_DOG,
        LVL(6, 15, 4, 0, 0), (G_GENO | 1),
        A(ATTK(AT_BITE, AD_PHYS, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(800, 250, MS_BARK, MZ_MEDIUM), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_STRONG | M2_DOMESTIC,
        M3_INFRAVISIBLE,
        7, HI_DOMESTIC, PM_LARGE_DOG),
    MON(NAM("wolf"), S_DOG,
        LVL(5, 12, 4, 0, 0), (G_GENO | G_SGROUP | 2),
        A(ATTK(AT_BITE, AD_PHYS, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(500, 250, MS_BARK, MZ_MEDIUM), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_HOSTILE, M3_INFRAVISIBLE,
        6, CLR_GRAY, PM_WOLF),
    /* werewolf in wolf form; one in human form uses a different monster
       type (in the S_HUMAN section below); switching back and forth is
       a shape-change that sets monst->data to the appropriate monster */
    MON(NAM("werewolf"), S_DOG,
        LVL(5, 12, 4, 20, -7), (G_NOGEN | G_NOCORPSE),
        A(ATTK(AT_BITE, AD_WERE, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(500, 250, MS_BARK, MZ_MEDIUM), MR_POISON, 0,
        M1_NOHANDS | M1_POIS | M1_REGEN | M1_CARNIVORE,
        M2_NOPOLY | M2_WERE | M2_HOSTILE, M3_INFRAVISIBLE,
        7, CLR_GRAY, PM_WEREWOLF),
    MON(NAM("winter wolf cub"), S_DOG,
        LVL(5, 12, 4, 0, 0),
        (G_NOHELL | G_GENO | G_SGROUP | 2),
        A(ATTK(AT_BITE, AD_PHYS, 1, 8), ATTK(AT_BREA, AD_COLD, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(250, 200, MS_BARK, MZ_SMALL), MR_COLD, MR_COLD,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_HOSTILE, 0,
        7, CLR_CYAN, PM_WINTER_WOLF_CUB),
    MON(NAM("warg"), S_DOG,
        LVL(7, 12, 4, 0, -5), (G_GENO | G_SGROUP | 2),
        A(ATTK(AT_BITE, AD_PHYS, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(850, 350, MS_BARK, MZ_MEDIUM), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_HOSTILE, M3_INFRAVISIBLE,
        8, CLR_BLACK, PM_WARG),
    MON(NAM("winter wolf"), S_DOG,
        LVL(7, 12, 4, 20, -5), (G_NOHELL | G_GENO | 1),
        A(ATTK(AT_BITE, AD_PHYS, 2, 6), ATTK(AT_BREA, AD_COLD, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(700, 300, MS_BARK, MZ_LARGE), MR_COLD, MR_COLD,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_HOSTILE | M2_STRONG, 0,
        9, CLR_CYAN, PM_WINTER_WOLF),
    MON(NAM("hell hound pup"), S_DOG,
        LVL(7, 12, 4, 20, 0), (G_HELL | G_GENO | G_SGROUP | 1),
        A(ATTK(AT_BITE, AD_PHYS, 2, 6), ATTK(AT_BREA, AD_FIRE, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(200, 200, MS_BARK, MZ_SMALL), MR_FIRE, MR_FIRE,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_HOSTILE, M3_INFRAVISIBLE,
        9, CLR_RED, PM_HELL_HOUND_PUP),
    MON(NAM("hell hound"), S_DOG,
        LVL(12, 14, 2, 20, -5), (G_HELL | G_GENO | 1),
        A(ATTK(AT_BITE, AD_PHYS, 3, 6), ATTK(AT_BREA, AD_FIRE, 3, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(600, 300, MS_BARK, MZ_MEDIUM), MR_FIRE, MR_FIRE,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_HOSTILE | M2_STRONG,
        M3_INFRAVISIBLE, 14, CLR_RED, PM_HELL_HOUND),
    /*
     * eyes
     */
    MON(NAM("gas spore"), S_EYE,
        LVL(1, 3, 10, 0, 0), (G_NOCORPSE | G_GENO | 1),
        A(ATTK(AT_BOOM, AD_PHYS, 4, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(10, 10, MS_SILENT, MZ_SMALL), 0, 0,
        M1_FLY | M1_BREATHLESS | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS,
        M2_HOSTILE | M2_NEUTER, 0,
        2, CLR_GRAY, PM_GAS_SPORE),
    MON(NAM("floating eye"), S_EYE,
        LVL(2, 1, 9, 10, 0), (G_GENO | 5),
        A(ATTK(AT_NONE, AD_PLYS, 0, 70),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(10, 10, MS_SILENT, MZ_SMALL), 0, 0,
        M1_FLY | M1_AMPHIBIOUS | M1_NOLIMBS | M1_NOHEAD | M1_NOTAKE,
        M2_HOSTILE | M2_NEUTER, M3_INFRAVISIBLE,
        3, CLR_BLUE, PM_FLOATING_EYE),
    MON(NAM("freezing sphere"), S_EYE,
        LVL(6, 13, 4, 0, 0), (G_NOCORPSE | G_NOHELL | G_GENO | 2),
        A(ATTK(AT_EXPL, AD_COLD, 4, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(10, 10, MS_SILENT, MZ_SMALL), MR_COLD, MR_COLD,
        M1_FLY | M1_BREATHLESS | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_NOTAKE,
        M2_HOSTILE | M2_NEUTER, M3_INFRAVISIBLE,
        9, CLR_WHITE, PM_FREEZING_SPHERE),
    MON(NAM("flaming sphere"), S_EYE,
        LVL(6, 13, 4, 0, 0), (G_NOCORPSE | G_GENO | 2),
        A(ATTK(AT_EXPL, AD_FIRE, 4, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(10, 10, MS_SILENT, MZ_SMALL), MR_FIRE, MR_FIRE,
        M1_FLY | M1_BREATHLESS | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_NOTAKE,
        M2_HOSTILE | M2_NEUTER, M3_INFRAVISIBLE, 9, CLR_RED, PM_FLAMING_SPHERE),
    MON(NAM("shocking sphere"), S_EYE,
        LVL(6, 13, 4, 0, 0), (G_NOCORPSE | G_GENO | 2),
        A(ATTK(AT_EXPL, AD_ELEC, 4, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(10, 10, MS_SILENT, MZ_SMALL), MR_ELEC, MR_ELEC,
        M1_FLY | M1_BREATHLESS | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_NOTAKE,
        M2_HOSTILE | M2_NEUTER, M3_INFRAVISIBLE,
        10, HI_ZAP, PM_SHOCKING_SPHERE),
    /*
     * felines
     */
    MON(NAM("kitten"), S_FELINE,
        LVL(2, 18, 6, 0, 0), (G_GENO | 1),
        A(ATTK(AT_BITE, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(150, 150, MS_MEW, MZ_SMALL), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_WANDER | M2_DOMESTIC,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        3, HI_DOMESTIC, PM_KITTEN),
    MON(NAM("housecat"), S_FELINE,
        LVL(4, 16, 5, 0, 0), (G_GENO | 1),
        A(ATTK(AT_BITE, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(200, 200, MS_MEW, MZ_SMALL), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_DOMESTIC,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        5, HI_DOMESTIC, PM_HOUSECAT),
    MON(NAM("jaguar"), S_FELINE,
        LVL(4, 15, 6, 0, 0), (G_GENO | 2),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 4), ATTK(AT_CLAW, AD_PHYS, 1, 4),
          ATTK(AT_BITE, AD_PHYS, 1, 8), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(600, 300, MS_GROWL, MZ_LARGE), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_HOSTILE,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        6, CLR_BROWN, PM_JAGUAR),
    MON(NAM("lynx"), S_FELINE,
        LVL(5, 15, 6, 0, 0), (G_GENO | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 4), ATTK(AT_CLAW, AD_PHYS, 1, 4),
          ATTK(AT_BITE, AD_PHYS, 1, 10), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(600, 300, MS_GROWL, MZ_SMALL), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_HOSTILE,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        7, CLR_CYAN, PM_LYNX),
    MON(NAM("panther"), S_FELINE,
        LVL(5, 15, 6, 0, 0), (G_GENO | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 6), ATTK(AT_CLAW, AD_PHYS, 1, 6),
          ATTK(AT_BITE, AD_PHYS, 1, 10), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(600, 300, MS_GROWL, MZ_LARGE), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_HOSTILE,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        7, CLR_BLACK, PM_PANTHER),
    MON(NAM("large cat"), S_FELINE,
        LVL(6, 15, 4, 0, 0), (G_GENO | 1),
        A(ATTK(AT_BITE, AD_PHYS, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(250, 250, MS_MEW, MZ_SMALL), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_STRONG | M2_DOMESTIC,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        7, HI_DOMESTIC, PM_LARGE_CAT),
    MON(NAM("tiger"), S_FELINE,
        LVL(6, 12, 6, 0, 0), (G_GENO | 2),
        A(ATTK(AT_CLAW, AD_PHYS, 2, 4), ATTK(AT_CLAW, AD_PHYS, 2, 4),
          ATTK(AT_BITE, AD_PHYS, 1, 10), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(600, 300, MS_GROWL, MZ_LARGE), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_HOSTILE,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        8, CLR_YELLOW, PM_TIGER),
    MON(NAM("displacer beast"), S_FELINE,
        LVL(12, 12, -10, 0, -3), (G_GENO | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 4, 4), ATTK(AT_CLAW, AD_PHYS, 4, 4),
          ATTK(AT_BITE, AD_PHYS, 2, 10), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(750, 400, MS_GROWL, MZ_LARGE), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_HOSTILE | M2_NASTY,
        M3_INFRAVISIBLE | M3_INFRAVISION | M3_DISPLACES,
        14, CLR_BLUE, PM_DISPLACER_BEAST),
    /*
     * gremlins and gargoyles
     */
    MON(NAM("gremlin"), S_GREMLIN,
        LVL(5, 12, 2, 25, -9), (G_GENO | 2),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 6), ATTK(AT_CLAW, AD_PHYS, 1, 6),
          ATTK(AT_BITE, AD_PHYS, 1, 4), ATTK(AT_CLAW, AD_CURS, 0, 0),
          NO_ATTK, NO_ATTK),
        SIZ(100, 20, MS_LAUGH, MZ_SMALL), MR_POISON, MR_POISON,
        M1_SWIM | M1_HUMANOID | M1_POIS, M2_STALK, M3_INFRAVISIBLE,
        8, CLR_GREEN, PM_GREMLIN),
    /* gargoyle and winged gargoyle are inspired by a cheesy made-for-TV
       horror movie (starring Cornel Wilde and Jennifer Salt, 1972) */
    MON(NAM("gargoyle"), S_GREMLIN,
        LVL(6, 10, -4, 0, -9), (G_GENO | 2),
        A(ATTK(AT_CLAW, AD_PHYS, 2, 6), ATTK(AT_CLAW, AD_PHYS, 2, 6),
          ATTK(AT_BITE, AD_PHYS, 2, 4), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1000, 200, MS_GRUNT, MZ_HUMAN), MR_STONE, MR_STONE,
        M1_HUMANOID | M1_THICK_HIDE | M1_BREATHLESS,
        M2_HOSTILE | M2_STRONG, 0,
        8, CLR_BROWN, PM_GARGOYLE),
    MON(NAM("winged gargoyle"), S_GREMLIN,
        LVL(9, 15, -2, 0, -12), (G_GENO | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 3, 6), ATTK(AT_CLAW, AD_PHYS, 3, 6),
          ATTK(AT_BITE, AD_PHYS, 3, 4), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1200, 300, MS_GRUNT, MZ_HUMAN), MR_STONE, MR_STONE,
        M1_FLY | M1_HUMANOID | M1_THICK_HIDE | M1_BREATHLESS | M1_OVIPAROUS,
        M2_LORD | M2_HOSTILE | M2_STRONG | M2_MAGIC, 0,
        11, HI_LORD, PM_WINGED_GARGOYLE),
    /*
     * humanoids
     */
    MON(NAM("hobbit"), S_HUMANOID,
        LVL(1, 9, 10, 0, 6), (G_GENO | 2),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(500, 200, MS_HUMANOID, MZ_SMALL), 0, 0, M1_HUMANOID | M1_OMNIVORE,
        M2_COLLECT, M3_INFRAVISIBLE | M3_INFRAVISION,
        2, CLR_GREEN, PM_HOBBIT),
    /* unlike plain human|elf|orc, plain "dwarf" is an ordinary monster */
    MON(NAM("dwarf"), S_HUMANOID,
        LVL(2, 6, 10, 10, 4), (G_GENO | 3),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(900, 300, MS_HUMANOID, MZ_HUMAN), 0, 0,
        M1_TUNNEL | M1_NEEDPICK | M1_HUMANOID | M1_OMNIVORE,
        M2_DWARF | M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        4, CLR_RED, PM_DWARF),
    MON(NAM("bugbear"), S_HUMANOID,
        LVL(3, 9, 5, 0, -6), (G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1250, 250, MS_GROWL, MZ_LARGE), 0, 0,
        M1_HUMANOID | M1_OMNIVORE, M2_STRONG | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        5, CLR_BROWN, PM_BUGBEAR),
    MON(NAMS("dwarf lord", "dwarf lady", "dwarf leader"), S_HUMANOID,
        LVL(4, 6, 10, 10, 5), (G_GENO | 2),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 4), ATTK(AT_WEAP, AD_PHYS, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(900, 300, MS_HUMANOID, MZ_HUMAN), 0, 0,
        M1_TUNNEL | M1_NEEDPICK | M1_HUMANOID | M1_OMNIVORE,
        M2_DWARF | M2_STRONG | M2_LORD | M2_GREEDY | M2_JEWELS | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        6, CLR_BLUE, PM_DWARF_LEADER),
    MON(NAMS("dwarf king", "dwarf queen", "dwarf ruler"),
        S_HUMANOID, LVL(6, 6, 10, 20, 6), (G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 6), ATTK(AT_WEAP, AD_PHYS, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(900, 300, MS_HUMANOID, MZ_HUMAN), 0, 0,
        M1_TUNNEL | M1_NEEDPICK | M1_HUMANOID | M1_OMNIVORE,
        M2_DWARF | M2_STRONG | M2_PRINCE | M2_GREEDY | M2_JEWELS
            | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        8, HI_LORD, PM_DWARF_RULER),
    MON(NAM("mind flayer"), S_HUMANOID,
        LVL(9, 12, 5, 90, -8), (G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 4), ATTK(AT_TENT, AD_DRIN, 2, 1),
          ATTK(AT_TENT, AD_DRIN, 2, 1), ATTK(AT_TENT, AD_DRIN, 2, 1),
          NO_ATTK, NO_ATTK),
        SIZ(1450, 400, MS_HISS, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_FLY | M1_SEE_INVIS | M1_OMNIVORE,
        M2_HOSTILE | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        13, CLR_BRIGHT_MAGENTA, PM_MIND_FLAYER),
    MON(NAM("master mind flayer"), S_HUMANOID,
        LVL(13, 12, 0, 90, -8), (G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 8), ATTK(AT_TENT, AD_DRIN, 2, 1),
          ATTK(AT_TENT, AD_DRIN, 2, 1), ATTK(AT_TENT, AD_DRIN, 2, 1),
          ATTK(AT_TENT, AD_DRIN, 2, 1), ATTK(AT_TENT, AD_DRIN, 2, 1)),
        SIZ(1450, 400, MS_HISS, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_FLY | M1_SEE_INVIS | M1_OMNIVORE,
        M2_HOSTILE | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        19, CLR_BRIGHT_MAGENTA, PM_MASTER_MIND_FLAYER),
    /*
     * imps & other minor demons/devils
     */
    MON(NAM("manes"), S_IMP,
        LVL(1, 3, 7, 0, -7), (G_GENO | G_LGROUP | G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 3), ATTK(AT_CLAW, AD_PHYS, 1, 3),
          ATTK(AT_BITE, AD_PHYS, 1, 4), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(100, 100, MS_SILENT, MZ_SMALL), MR_SLEEP | MR_POISON, 0, M1_POIS,
        M2_HOSTILE | M2_STALK, M3_INFRAVISIBLE | M3_INFRAVISION,
        3, CLR_RED, PM_MANES),
    MON(NAM("homunculus"), S_IMP,
        LVL(2, 12, 6, 10, -7), (G_GENO | 2),
        A(ATTK(AT_BITE, AD_SLEE, 1, 3),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(60, 100, MS_SILENT, MZ_TINY), MR_SLEEP | MR_POISON,
        MR_SLEEP | MR_POISON, M1_FLY | M1_POIS, M2_STALK,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        3, CLR_GREEN, PM_HOMUNCULUS),
    MON(NAM("imp"), S_IMP,
        LVL(3, 12, 2, 20, -7), (G_GENO | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(20, 10, MS_CUSS, MZ_TINY), 0, 0, M1_REGEN, M2_WANDER | M2_STALK,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        4, CLR_RED, PM_IMP),
    MON(NAM("lemure"), S_IMP,
        LVL(3, 3, 7, 0, -7), (G_HELL | G_GENO | G_LGROUP | G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 3),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(150, 100, MS_SILENT, MZ_MEDIUM), MR_SLEEP | MR_POISON, MR_SLEEP,
        M1_POIS | M1_REGEN, M2_HOSTILE | M2_WANDER | M2_STALK | M2_NEUTER,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        5, CLR_BROWN, PM_LEMURE),
    MON(NAM("quasit"), S_IMP,
        LVL(3, 15, 2, 20, -7), (G_GENO | 2),
        A(ATTK(AT_CLAW, AD_DRDX, 1, 2), ATTK(AT_CLAW, AD_DRDX, 1, 2),
          ATTK(AT_BITE, AD_PHYS, 1, 4), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(200, 200, MS_SILENT, MZ_SMALL), MR_POISON, MR_POISON, M1_REGEN,
        M2_STALK, M3_INFRAVISIBLE | M3_INFRAVISION,
        7, CLR_BLUE, PM_QUASIT),
    MON(NAM("tengu"), S_IMP,
        LVL(6, 13, 5, 30, 7), (G_GENO | 3),
        A(ATTK(AT_BITE, AD_PHYS, 1, 7),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(300, 200, MS_SQAWK, MZ_SMALL), MR_POISON, MR_POISON,
        M1_TPORT | M1_TPORT_CNTRL, M2_STALK, M3_INFRAVISIBLE | M3_INFRAVISION,
        7, CLR_CYAN, PM_TENGU),
    /*
     * jellies
     */
    MON(NAM("blue jelly"), S_JELLY,
        LVL(4, 0, 8, 10, 0), (G_GENO | 2),
        A(ATTK(AT_NONE, AD_COLD, 0, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_JELLY, 20, MS_SILENT, MZ_MEDIUM), MR_COLD | MR_POISON,
        MR_COLD | MR_POISON,
        M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_NOTAKE,
        M2_HOSTILE | M2_NEUTER, 0,
        5, CLR_BLUE, PM_BLUE_JELLY),
    MON(NAM("spotted jelly"), S_JELLY,
        LVL(5, 0, 8, 10, 0), (G_GENO | 1),
        A(ATTK(AT_NONE, AD_ACID, 0, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_JELLY, 20, MS_SILENT, MZ_MEDIUM),
        MR_ACID | MR_STONE, MR_ACID | MR_STONE,
        M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_ACID | M1_NOTAKE,
        M2_HOSTILE | M2_NEUTER, 0,
        6, CLR_GREEN, PM_SPOTTED_JELLY),
    MON(NAM("ochre jelly"), S_JELLY,
        LVL(6, 3, 8, 20, 0), (G_GENO | 2),
        A(ATTK(AT_ENGL, AD_ACID, 3, 6), ATTK(AT_NONE, AD_ACID, 3, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_JELLY, 20, MS_SILENT, MZ_MEDIUM),
        MR_ACID | MR_STONE, MR_ACID | MR_STONE,
        M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_ACID | M1_NOTAKE,
        M2_HOSTILE | M2_NEUTER, 0,
        8, CLR_BROWN, PM_OCHRE_JELLY),
    /*
     * kobolds
     */
    MON(NAM("kobold"), S_KOBOLD,
        LVL(0, 6, 10, 0, -2), (G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(400, 100, MS_ORC, MZ_SMALL), MR_POISON, 0,
        M1_HUMANOID | M1_POIS | M1_OMNIVORE, M2_HOSTILE | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        1, CLR_BROWN, PM_KOBOLD),
    MON(NAM("large kobold"), S_KOBOLD,
        LVL(1, 6, 10, 0, -3), (G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(450, 150, MS_ORC, MZ_SMALL), MR_POISON, 0,
        M1_HUMANOID | M1_POIS | M1_OMNIVORE, M2_HOSTILE | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        2, CLR_RED, PM_LARGE_KOBOLD),
    MON(NAMS("kobold lord", "kobold lady", "kobold leader"), S_KOBOLD,
        LVL(2, 6, 10, 0, -4), (G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(500, 200, MS_ORC, MZ_SMALL), MR_POISON, 0,
        M1_HUMANOID | M1_POIS | M1_OMNIVORE,
        M2_HOSTILE | M2_LORD | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        3, HI_LORD, PM_KOBOLD_LEADER),
    MON(NAM("kobold shaman"), S_KOBOLD,
        LVL(2, 6, 6, 10, -4), (G_GENO | 1),
        A(ATTK(AT_MAGC, AD_SPEL, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(450, 150, MS_ORC, MZ_SMALL), MR_POISON, 0,
        M1_HUMANOID | M1_POIS | M1_OMNIVORE, M2_HOSTILE | M2_MAGIC,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        4, HI_ZAP, PM_KOBOLD_SHAMAN),
    /*
     * leprechauns
     */
    MON(NAM("leprechaun"), S_LEPRECHAUN,
        LVL(5, 15, 8, 20, 0), (G_GENO | 4),
        A(ATTK(AT_CLAW, AD_SGLD, 1, 2),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(60, 30, MS_LAUGH, MZ_TINY), 0, 0, M1_HUMANOID | M1_TPORT,
        M2_HOSTILE | M2_GREEDY, M3_INFRAVISIBLE,
        4, CLR_GREEN, PM_LEPRECHAUN),
    /*
     * mimics
     */
    MON(NAM("small mimic"), S_MIMIC,
        LVL(7, 3, 7, 0, 0), (G_GENO | 2),
        A(ATTK(AT_CLAW, AD_PHYS, 3, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(300, 200, MS_SILENT, MZ_MEDIUM), MR_ACID, 0,
        M1_BREATHLESS | M1_AMORPHOUS | M1_HIDE | M1_ANIMAL | M1_NOEYES
            | M1_NOHEAD | M1_NOLIMBS | M1_THICK_HIDE | M1_CARNIVORE,
        M2_HOSTILE, 0,
        8, CLR_BROWN, PM_SMALL_MIMIC),
    MON(NAM("large mimic"), S_MIMIC,
        LVL(8, 3, 7, 10, 0), (G_GENO | 1),
        A(ATTK(AT_CLAW, AD_STCK, 3, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(600, 400, MS_SILENT, MZ_LARGE), MR_ACID, 0,
        M1_CLING | M1_BREATHLESS | M1_AMORPHOUS | M1_HIDE | M1_ANIMAL
            | M1_NOEYES | M1_NOHEAD | M1_NOLIMBS | M1_THICK_HIDE
            | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG, 0,
        9, CLR_RED, PM_LARGE_MIMIC),
    MON(NAM("giant mimic"), S_MIMIC,
        LVL(9, 3, 7, 20, 0), (G_GENO | 1),
        A(ATTK(AT_CLAW, AD_STCK, 3, 6), ATTK(AT_CLAW, AD_STCK, 3, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(800, 500, MS_SILENT, MZ_LARGE), MR_ACID, 0,
        M1_CLING | M1_BREATHLESS | M1_AMORPHOUS | M1_HIDE | M1_ANIMAL
            | M1_NOEYES | M1_NOHEAD | M1_NOLIMBS | M1_THICK_HIDE
            | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG, 0,
        11, HI_LORD, PM_GIANT_MIMIC),
    /*
     * nymphs
     */
    MON(NAM("wood nymph"), S_NYMPH,
        LVL(3, 12, 9, 20, 0), (G_GENO | 2),
        A(ATTK(AT_CLAW, AD_SITM, 0, 0), ATTK(AT_CLAW, AD_SEDU, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_NYMPH, 300, MS_SEDUCE, MZ_HUMAN), 0, 0, M1_HUMANOID | M1_TPORT,
        M2_HOSTILE | M2_FEMALE | M2_COLLECT, M3_INFRAVISIBLE,
        5, CLR_GREEN, PM_WOOD_NYMPH),
    MON(NAM("water nymph"), S_NYMPH,
        LVL(3, 12, 9, 20, 0), (G_GENO | 2),
        A(ATTK(AT_CLAW, AD_SITM, 0, 0), ATTK(AT_CLAW, AD_SEDU, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_NYMPH, 300, MS_SEDUCE, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_TPORT | M1_SWIM, M2_HOSTILE | M2_FEMALE | M2_COLLECT,
        M3_INFRAVISIBLE,
        5, CLR_BLUE, PM_WATER_NYMPH),
    MON(NAM("mountain nymph"), S_NYMPH,
        LVL(3, 12, 9, 20, 0), (G_GENO | 2),
        A(ATTK(AT_CLAW, AD_SITM, 0, 0), ATTK(AT_CLAW, AD_SEDU, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_NYMPH, 300, MS_SEDUCE, MZ_HUMAN), 0, 0, M1_HUMANOID | M1_TPORT,
        M2_HOSTILE | M2_FEMALE | M2_COLLECT, M3_INFRAVISIBLE,
        5, CLR_BROWN, PM_MOUNTAIN_NYMPH),
    /*
     * orcs
     */
    MON(NAM("goblin"), S_ORC,
        LVL(0, 6, 10, 0, -3), (G_GENO | 2),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(400, 100, MS_ORC, MZ_SMALL), 0, 0, M1_HUMANOID | M1_OMNIVORE,
        M2_ORC | M2_COLLECT, M3_INFRAVISIBLE | M3_INFRAVISION,
        1, CLR_GRAY, PM_GOBLIN),
    MON(NAM("hobgoblin"), S_ORC, LVL(1, 9, 10, 0, -4), (G_GENO | 2),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1000, 200, MS_ORC, MZ_HUMAN), 0, 0, M1_HUMANOID | M1_OMNIVORE,
        M2_ORC | M2_STRONG | M2_COLLECT, M3_INFRAVISIBLE | M3_INFRAVISION,
        3, CLR_BROWN, PM_HOBGOBLIN),
    /* Plain "orc" for zombie and mummy corpses only; not created at random.
     * Orcs (but not goblins and hobgoblins) are granted poison resistance;
     * however, their corpses don't confer it. */
    MON(NAM("orc"), S_ORC,
        LVL(1, 9, 10, 0, -3), (G_GENO | G_NOGEN | G_LGROUP),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(850, 150, MS_ORC, MZ_HUMAN), MR_POISON, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_ORC | M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        3, CLR_RED, PM_ORC),
    MON(NAM("hill orc"), S_ORC,
        LVL(2, 9, 10, 0, -4), (G_GENO | G_LGROUP | 2),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1000, 200, MS_ORC, MZ_HUMAN), MR_POISON, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_ORC | M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        4, CLR_YELLOW, PM_HILL_ORC),
    MON(NAM("Mordor orc"), S_ORC,
        LVL(3, 5, 10, 0, -5), (G_GENO | G_LGROUP | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1200, 200, MS_ORC, MZ_HUMAN), MR_POISON, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_ORC | M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        5, CLR_BLUE, PM_MORDOR_ORC),
    MON(NAM("Uruk-hai"), S_ORC,
        LVL(3, 7, 10, 0, -4), (G_GENO | G_LGROUP | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1300, 300, MS_ORC, MZ_HUMAN), MR_POISON, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_ORC | M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        5, CLR_BLACK, PM_URUK_HAI),
    MON(NAM("orc shaman"), S_ORC,
        LVL(3, 9, 5, 10, -5), (G_GENO | 1),
        A(ATTK(AT_MAGC, AD_SPEL, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1000, 300, MS_ORC, MZ_HUMAN), MR_POISON, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_ORC | M2_GREEDY | M2_JEWELS | M2_MAGIC,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        5, HI_ZAP, PM_ORC_SHAMAN),
    MON(NAM("orc-captain"), S_ORC,
        LVL(5, 5, 10, 0, -5), (G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 4), ATTK(AT_WEAP, AD_PHYS, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1350, 350, MS_ORC, MZ_HUMAN), MR_POISON, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_ORC | M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        7, HI_LORD, PM_ORC_CAPTAIN),
    /*
     * piercers
     */
    MON(NAM("rock piercer"), S_PIERCER,
        LVL(3, 1, 3, 0, 0), (G_GENO | 4),
        A(ATTK(AT_BITE, AD_PHYS, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(200, 200, MS_SILENT, MZ_SMALL), 0, 0,
        M1_CLING | M1_HIDE | M1_ANIMAL | M1_NOEYES | M1_NOLIMBS | M1_CARNIVORE
            | M1_NOTAKE,
        M2_HOSTILE, 0,
        4, CLR_GRAY, PM_ROCK_PIERCER),
    MON(NAM("iron piercer"), S_PIERCER,
        LVL(5, 1, 0, 0, 0), (G_GENO | 2),
        A(ATTK(AT_BITE, AD_PHYS, 3, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(400, 300, MS_SILENT, MZ_MEDIUM), 0, 0,
        M1_CLING | M1_HIDE | M1_ANIMAL | M1_NOEYES | M1_NOLIMBS | M1_CARNIVORE
            | M1_NOTAKE,
        M2_HOSTILE, 0,
        6, CLR_CYAN, PM_IRON_PIERCER),
    MON(NAM("glass piercer"), S_PIERCER,
        LVL(7, 1, 0, 0, 0), (G_GENO | 1),
        A(ATTK(AT_BITE, AD_PHYS, 4, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(400, 300, MS_SILENT, MZ_MEDIUM), MR_ACID, 0,
        M1_CLING | M1_HIDE | M1_ANIMAL | M1_NOEYES | M1_NOLIMBS | M1_CARNIVORE
            | M1_NOTAKE,
        M2_HOSTILE, 0,
        9, CLR_WHITE, PM_GLASS_PIERCER),
    /*
     * quadrupeds
     *  (note: horses are grouped with unicorns in another section below)
     */
    MON(NAM("rothe"), S_QUADRUPED,
        LVL(2, 9, 7, 0, 0), (G_GENO | G_SGROUP | 4),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 3), ATTK(AT_BITE, AD_PHYS, 1, 3),
          ATTK(AT_BITE, AD_PHYS, 1, 8), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(400, 100, MS_MOO, MZ_LARGE), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_OMNIVORE, M2_HOSTILE, M3_INFRAVISIBLE,
        4, CLR_BROWN, PM_ROTHE),
    MON(NAM("mumak"), S_QUADRUPED,
        LVL(5, 9, 0, 0, -2), (G_GENO | 1),
        A(ATTK(AT_BUTT, AD_PHYS, 4, 12), ATTK(AT_BITE, AD_PHYS, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2500, 500, MS_TRUMPET, MZ_LARGE), 0, 0,
        M1_ANIMAL | M1_THICK_HIDE | M1_NOHANDS | M1_HERBIVORE,
        M2_HOSTILE | M2_STRONG, M3_INFRAVISIBLE,
        7, CLR_GRAY, PM_MUMAK),
    MON(NAM("leocrotta"), S_QUADRUPED,
        LVL(6, 18, 4, 10, 0), (G_GENO | 2),
        A(ATTK(AT_CLAW, AD_PHYS, 2, 6), ATTK(AT_BITE, AD_PHYS, 2, 6),
          ATTK(AT_CLAW, AD_PHYS, 2, 6), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1200, 500, MS_IMITATE, MZ_LARGE), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_OMNIVORE, M2_HOSTILE | M2_STRONG,
        M3_INFRAVISIBLE,
        8, CLR_RED, PM_LEOCROTTA),
    MON(NAM("wumpus"), S_QUADRUPED,
        LVL(8, 3, 2, 10, 0), (G_GENO | 1),
        A(ATTK(AT_BITE, AD_PHYS, 3, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2500, 500, MS_BURBLE, MZ_LARGE), 0, 0,
        M1_CLING | M1_ANIMAL | M1_NOHANDS | M1_OMNIVORE,
        M2_HOSTILE | M2_STRONG, M3_INFRAVISIBLE,
        9, CLR_CYAN, PM_WUMPUS),
    MON(NAM("titanothere"), S_QUADRUPED,
        LVL(12, 12, 6, 0, 0), (G_GENO | 2),
        A(ATTK(AT_CLAW, AD_PHYS, 2, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2650, 650, MS_BELLOW, MZ_LARGE), 0, 0,
        M1_ANIMAL | M1_THICK_HIDE | M1_NOHANDS | M1_HERBIVORE,
        M2_HOSTILE | M2_STRONG, M3_INFRAVISIBLE,
        13, CLR_GRAY, PM_TITANOTHERE),
    MON(NAM("baluchitherium"), S_QUADRUPED,
        LVL(14, 12, 5, 0, 0), (G_GENO | 2),
        A(ATTK(AT_CLAW, AD_PHYS, 5, 4), ATTK(AT_CLAW, AD_PHYS, 5, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(3800, 800, MS_BELLOW, MZ_LARGE), 0, 0,
        M1_ANIMAL | M1_THICK_HIDE | M1_NOHANDS | M1_HERBIVORE,
        M2_HOSTILE | M2_STRONG, M3_INFRAVISIBLE,
        15, CLR_GRAY, PM_BALUCHITHERIUM),
    MON(NAM("mastodon"), S_QUADRUPED,
        LVL(20, 12, 5, 0, 0), (G_GENO | 1),
        A(ATTK(AT_BUTT, AD_PHYS, 4, 8), ATTK(AT_BUTT, AD_PHYS, 4, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(3800, 800, MS_TRUMPET, MZ_LARGE), 0, 0,
        M1_ANIMAL | M1_THICK_HIDE | M1_NOHANDS | M1_HERBIVORE,
        M2_HOSTILE | M2_STRONG, M3_INFRAVISIBLE,
        22, CLR_BLACK, PM_MASTODON),
    /*
     * rodents
     */
    MON(NAM("sewer rat"), S_RODENT,
        LVL(0, 12, 7, 0, 0), (G_GENO | G_SGROUP | 1),
        A(ATTK(AT_BITE, AD_PHYS, 1, 3),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(20, 12, MS_SQEEK, MZ_TINY), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_HOSTILE, M3_INFRAVISIBLE,
        1, CLR_BROWN, PM_SEWER_RAT),
    MON(NAM("giant rat"), S_RODENT,
        LVL(1, 10, 7, 0, 0), (G_GENO | G_SGROUP | 2),
        A(ATTK(AT_BITE, AD_PHYS, 1, 3),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(30, 30, MS_SQEEK, MZ_TINY), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_HOSTILE, M3_INFRAVISIBLE,
        2, CLR_BROWN, PM_GIANT_RAT),
    MON(NAM("rabid rat"), S_RODENT,
        LVL(2, 12, 6, 0, 0), (G_GENO | 1),
        A(ATTK(AT_BITE, AD_DRCO, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(30, 5, MS_SQEEK, MZ_TINY), MR_POISON, 0,
        M1_ANIMAL | M1_NOHANDS | M1_POIS | M1_CARNIVORE, M2_HOSTILE,
        M3_INFRAVISIBLE,
        4, CLR_BROWN, PM_RABID_RAT),
    MON(NAM("wererat"), S_RODENT,
        LVL(2, 12, 6, 10, -7), (G_NOGEN | G_NOCORPSE),
        A(ATTK(AT_BITE, AD_WERE, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(40, 30, MS_SQEEK, MZ_TINY), MR_POISON, 0,
        M1_NOHANDS | M1_POIS | M1_REGEN | M1_CARNIVORE,
        M2_NOPOLY | M2_WERE | M2_HOSTILE, M3_INFRAVISIBLE,
        4, CLR_BROWN, PM_WERERAT),
    MON(NAM("rock mole"), S_RODENT,
        LVL(3, 3, 0, 20, 0), (G_GENO | 2),
        A(ATTK(AT_BITE, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(30, 30, MS_SILENT, MZ_SMALL), 0, 0,
        M1_TUNNEL | M1_ANIMAL | M1_NOHANDS | M1_METALLIVORE,
        M2_HOSTILE | M2_GREEDY | M2_JEWELS | M2_COLLECT, M3_INFRAVISIBLE,
        4, CLR_GRAY, PM_ROCK_MOLE),
    MON(NAM("woodchuck"), S_RODENT,
        LVL(3, 3, 0, 20, 0), (G_NOGEN | G_GENO),
        A(ATTK(AT_BITE, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(30, 30, MS_SILENT, MZ_SMALL), 0, 0,
        M1_TUNNEL /*LOGGING*/ | M1_ANIMAL | M1_NOHANDS | M1_SWIM
            | M1_HERBIVORE,
        /* In reality, they tunnel instead of cutting lumber.  Oh, well. */
        M2_WANDER | M2_HOSTILE, M3_INFRAVISIBLE,
        4, CLR_BROWN, PM_WOODCHUCK),
    /*
     * spiders & scorpions (keep webmaker() in sync if new critters are added)
     */
    MON(NAM("cave spider"), S_SPIDER,
        LVL(1, 12, 3, 0, 0), (G_GENO | G_SGROUP | 2),
        A(ATTK(AT_BITE, AD_PHYS, 1, 2),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(50, 50, MS_SILENT, MZ_TINY), MR_POISON, MR_POISON,
        M1_CONCEAL | M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_CARNIVORE,
        M2_HOSTILE, 0,
        3, CLR_GRAY, PM_CAVE_SPIDER),
    MON(NAM("centipede"), S_SPIDER,
        LVL(2, 4, 3, 0, 0), (G_GENO | 1),
        A(ATTK(AT_BITE, AD_DRST, 1, 3),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(50, 50, MS_SILENT, MZ_TINY), MR_POISON, MR_POISON,
        M1_CONCEAL | M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_CARNIVORE,
        M2_HOSTILE, 0,
        4, CLR_YELLOW, PM_CENTIPEDE),
    MON(NAM("giant spider"), S_SPIDER,
        LVL(5, 15, 4, 0, 0), (G_GENO | 1),
        A(ATTK(AT_BITE, AD_DRST, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(200, 100, MS_SILENT, MZ_LARGE), MR_POISON, MR_POISON,
        M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_POIS | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG, 0,
        7, CLR_MAGENTA, PM_GIANT_SPIDER),
    MON(NAM("scorpion"), S_SPIDER,
        LVL(5, 15, 3, 0, 0), (G_GENO | 2),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 2), ATTK(AT_CLAW, AD_PHYS, 1, 2),
          ATTK(AT_STNG, AD_DRST, 1, 4), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(50, 100, MS_SILENT, MZ_SMALL), MR_POISON, MR_POISON,
        M1_CONCEAL | M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_POIS
            | M1_CARNIVORE,
        M2_HOSTILE, 0,
        8, CLR_RED, PM_SCORPION),
    /*
     * trappers, lurkers, &c
     * Note:  prior to 5.0, these were defined to do AD_DGST damage,
     * but they don't swallow their victims into their stomachs and
     * digest, they enfold and crush or suffocate.
     * The Monster Manual states that someone engulfed by a trapper
     * can't use weapons but we do not enforce that.
     */
    MON(NAM("lurker above"), S_TRAPPER,
        LVL(10, 3, 3, 0, 0), (G_GENO | 2),
        A(ATTK(AT_ENGL, AD_WRAP, 1, 6), ATTK(AT_ENGL, AD_PHYS, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(800, 350, MS_SILENT, MZ_HUGE), 0, 0,
        M1_HIDE | M1_FLY | M1_ANIMAL | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_CARNIVORE,
        M2_HOSTILE | M2_STALK | M2_STRONG, 0,
        12, CLR_GRAY, PM_LURKER_ABOVE),
    MON(NAM("trapper"), S_TRAPPER,
        LVL(12, 3, 3, 0, 0), (G_GENO | 2),
        A(ATTK(AT_ENGL, AD_WRAP, 1, 8), ATTK(AT_ENGL, AD_PHYS, 2, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(800, 350, MS_SILENT, MZ_HUGE), 0, 0,
        M1_HIDE | M1_ANIMAL | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_CARNIVORE,
        M2_HOSTILE | M2_STALK | M2_STRONG, 0,
        14, CLR_GREEN, PM_TRAPPER),
    /*
     * unicorns and horses
     */
    MON(NAM("pony"), S_UNICORN,
        LVL(3, 16, 6, 0, 0), (G_GENO | 2),
        A(ATTK(AT_KICK, AD_PHYS, 1, 6), ATTK(AT_BITE, AD_PHYS, 1, 2),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1300, 250, MS_NEIGH, MZ_MEDIUM), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_HERBIVORE,
        M2_WANDER | M2_STRONG | M2_DOMESTIC, M3_INFRAVISIBLE,
        4, CLR_BROWN, PM_PONY),
    MON(NAM("white unicorn"), S_UNICORN,
        LVL(4, 24, 2, 70, 7), (G_GENO | 2),
        A(ATTK(AT_BUTT, AD_PHYS, 1, 12), ATTK(AT_KICK, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1300, 300, MS_NEIGH, MZ_LARGE), MR_POISON, MR_POISON,
        M1_NOHANDS | M1_HERBIVORE, M2_WANDER | M2_STRONG | M2_JEWELS,
        M3_INFRAVISIBLE,
        6, CLR_WHITE, PM_WHITE_UNICORN),
    MON(NAM("gray unicorn"), S_UNICORN,
        LVL(4, 24, 2, 70, 0), (G_GENO | 1),
        A(ATTK(AT_BUTT, AD_PHYS, 1, 12), ATTK(AT_KICK, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1300, 300, MS_NEIGH, MZ_LARGE), MR_POISON, MR_POISON,
        M1_NOHANDS | M1_HERBIVORE, M2_WANDER | M2_STRONG | M2_JEWELS,
        M3_INFRAVISIBLE,
        6, CLR_GRAY, PM_GRAY_UNICORN),
    MON(NAM("black unicorn"), S_UNICORN,
        LVL(4, 24, 2, 70, -7), (G_GENO | 1),
        A(ATTK(AT_BUTT, AD_PHYS, 1, 12), ATTK(AT_KICK, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1300, 300, MS_NEIGH, MZ_LARGE), MR_POISON, MR_POISON,
        M1_NOHANDS | M1_HERBIVORE, M2_WANDER | M2_STRONG | M2_JEWELS,
        M3_INFRAVISIBLE,
        6, CLR_BLACK, PM_BLACK_UNICORN),
    MON(NAM("horse"), S_UNICORN,
        LVL(5, 20, 5, 0, 0), (G_GENO | 2),
        A(ATTK(AT_KICK, AD_PHYS, 1, 8), ATTK(AT_BITE, AD_PHYS, 1, 3),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1500, 300, MS_NEIGH, MZ_LARGE), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_HERBIVORE,
        M2_WANDER | M2_STRONG | M2_DOMESTIC, M3_INFRAVISIBLE,
        7, CLR_BROWN, PM_HORSE),
    MON(NAM("warhorse"), S_UNICORN,
        LVL(7, 24, 4, 0, 0), (G_GENO | 2),
        A(ATTK(AT_KICK, AD_PHYS, 1, 10), ATTK(AT_BITE, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1800, 350, MS_NEIGH, MZ_LARGE), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_HERBIVORE,
        M2_WANDER | M2_STRONG | M2_DOMESTIC, M3_INFRAVISIBLE,
        9, CLR_BROWN, PM_WARHORSE),
    /*
     * vortices
     */
    MON(NAM("fog cloud"), S_VORTEX,
        LVL(3, 1, 0, 0, 0), (G_GENO | G_NOCORPSE | 2),
        A(ATTK(AT_ENGL, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_ETHEREAL, 0, MS_SILENT, MZ_HUGE), MR_SLEEP | MR_POISON | MR_STONE, 0,
        M1_FLY | M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_AMORPHOUS | M1_UNSOLID,
        M2_HOSTILE | M2_NEUTER, 0,
        4, CLR_GRAY, PM_FOG_CLOUD),
    MON(NAM("dust vortex"), S_VORTEX,
        LVL(4, 20, 2, 30, 0), (G_GENO | G_NOCORPSE | 2),
        A(ATTK(AT_ENGL, AD_BLND, 2, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_ETHEREAL, 0, MS_SILENT, MZ_HUGE), MR_SLEEP | MR_POISON | MR_STONE, 0,
        M1_FLY | M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS,
        M2_HOSTILE | M2_NEUTER, 0,
        6, CLR_BROWN, PM_DUST_VORTEX),
    MON(NAM("ice vortex"), S_VORTEX,
        LVL(5, 20, 2, 30, 0), (G_NOHELL | G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_ENGL, AD_COLD, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_ETHEREAL, 0, MS_SILENT, MZ_HUGE),
        MR_COLD | MR_SLEEP | MR_POISON | MR_STONE, 0,
        M1_FLY | M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS,
        M2_HOSTILE | M2_NEUTER, M3_INFRAVISIBLE,
        7, CLR_CYAN, PM_ICE_VORTEX),
    MON(NAM("energy vortex"), S_VORTEX,
        LVL(6, 20, 2, 30, 0), (G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_ENGL, AD_ELEC, 1, 6), ATTK(AT_ENGL, AD_DREN, 2, 6),
          ATTK(AT_NONE, AD_ELEC, 0, 4), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_ETHEREAL, 0, MS_SILENT, MZ_HUGE),
        MR_ELEC | MR_SLEEP | MR_DISINT | MR_POISON | MR_STONE, 0,
        M1_FLY | M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_UNSOLID,
        M2_HOSTILE | M2_NEUTER, 0,
        9, HI_ZAP, PM_ENERGY_VORTEX),
    MON(NAM("steam vortex"), S_VORTEX,
        LVL(7, 22, 2, 30, 0), (G_HELL | G_GENO | G_NOCORPSE | 2),
        A(ATTK(AT_ENGL, AD_FIRE, 1, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_ETHEREAL, 0, MS_SILENT, MZ_HUGE),
        MR_FIRE | MR_SLEEP | MR_POISON | MR_STONE, 0,
        M1_FLY | M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_UNSOLID,
        M2_HOSTILE | M2_NEUTER, M3_INFRAVISIBLE,
        9, CLR_BLUE, PM_STEAM_VORTEX),
    MON(NAM("fire vortex"), S_VORTEX,
        LVL(8, 22, 2, 30, 0), (G_HELL | G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_ENGL, AD_FIRE, 1, 10), ATTK(AT_NONE, AD_FIRE, 0, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_ETHEREAL, 0, MS_SILENT, MZ_HUGE),
        MR_FIRE | MR_SLEEP | MR_POISON | MR_STONE, 0,
        M1_FLY | M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_UNSOLID,
        M2_HOSTILE | M2_NEUTER, M3_INFRAVISIBLE,
        10, CLR_YELLOW, PM_FIRE_VORTEX),
    /*
     * worms
     */
    MON(NAM("baby long worm"), S_WORM,
        LVL(5, 3, 5, 0, 0), G_GENO,
        A(ATTK(AT_BITE, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(600, 250, MS_SILENT, MZ_LARGE), 0, 0,
        M1_ANIMAL | M1_SLITHY | M1_NOLIMBS | M1_CARNIVORE | M1_NOTAKE,
        M2_HOSTILE, 0,
        6, CLR_BROWN, PM_BABY_LONG_WORM),
    MON(NAM("baby purple worm"), S_WORM,
        LVL(8, 3, 5, 0, 0), G_GENO,
        A(ATTK(AT_BITE, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(600, 250, MS_SILENT, MZ_LARGE), 0, 0,
        M1_ANIMAL | M1_SLITHY | M1_NOLIMBS | M1_CARNIVORE, M2_HOSTILE, 0,
        9, CLR_MAGENTA, PM_BABY_PURPLE_WORM),
    MON(NAM("long worm"), S_WORM,
        LVL(9, 3, 5, 10, 0), (G_GENO | 2),
        A(ATTK(AT_BITE, AD_PHYS, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1500, 500, MS_SILENT, MZ_GIGANTIC), 0, 0,
        M1_ANIMAL | M1_SLITHY | M1_NOLIMBS | M1_OVIPAROUS | M1_CARNIVORE
            | M1_NOTAKE,
        M2_HOSTILE | M2_STRONG | M2_NASTY, 0,
        10, CLR_BROWN, PM_LONG_WORM),
    MON(NAM("purple worm"), S_WORM,
        LVL(15, 9, 6, 20, 0), (G_GENO | 2),
        A(ATTK(AT_BITE, AD_PHYS, 2, 8), ATTK(AT_ENGL, AD_DGST, 1, 10),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2700, 700, MS_SILENT, MZ_GIGANTIC), 0, 0,
        M1_ANIMAL | M1_SLITHY | M1_NOLIMBS | M1_OVIPAROUS | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG | M2_NASTY, 0,
        17, CLR_MAGENTA, PM_PURPLE_WORM),
    /*
     * xan, &c
     */
    MON(NAM("grid bug"), S_XAN,
        LVL(0, 12, 9, 0, 0), (G_GENO | G_SGROUP | G_NOCORPSE | 3),
        A(ATTK(AT_BITE, AD_ELEC, 1, 1),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(15, 10, MS_BUZZ, MZ_TINY), MR_ELEC | MR_POISON, 0,
        M1_ANIMAL | M1_NOHANDS,
        M2_HOSTILE, M3_INFRAVISIBLE,
        1, CLR_MAGENTA, PM_GRID_BUG),
    MON(NAM("xan"), S_XAN,
        LVL(7, 18, -4, 0, 0), (G_GENO | 3),
        A(ATTK(AT_STNG, AD_LEGS, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(300, 300, MS_BUZZ, MZ_TINY), MR_POISON, MR_POISON,
        M1_FLY | M1_ANIMAL | M1_NOHANDS | M1_POIS, M2_HOSTILE,
        M3_INFRAVISIBLE,
        9, CLR_RED, PM_XAN),
    /*
     * lights
     */
    /* yellow light is visible and its suicidal explosion causes blindness */
    MON(NAM("yellow light"), S_LIGHT,
        LVL(3, 15, 0, 0, 0), (G_NOCORPSE | G_GENO | 4),
        A(ATTK(AT_EXPL, AD_BLND, 10, 20),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_ETHEREAL, 0, MS_SILENT, MZ_SMALL),
        MR_FIRE | MR_COLD | MR_ELEC | MR_DISINT | MR_SLEEP | MR_POISON
            | MR_ACID | MR_STONE, 0,
        M1_FLY | M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS
               | M1_NOHEAD | M1_MINDLESS | M1_UNSOLID | M1_NOTAKE,
        M2_HOSTILE | M2_NEUTER, M3_INFRAVISIBLE,
        5, CLR_YELLOW, PM_YELLOW_LIGHT),
    /* black light is invisible and causes hallucination */
    MON(NAM("black light"), S_LIGHT,
        LVL(5, 15, 0, 0, 0), (G_NOCORPSE | G_GENO | 2),
        A(ATTK(AT_EXPL, AD_HALU, 10, 12),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_ETHEREAL, 0, MS_SILENT, MZ_SMALL),
        MR_FIRE | MR_COLD | MR_ELEC | MR_DISINT | MR_SLEEP | MR_POISON
            | MR_ACID | MR_STONE, 0,
        M1_FLY | M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS
            | M1_NOHEAD | M1_MINDLESS | M1_UNSOLID | M1_SEE_INVIS | M1_NOTAKE,
        M2_HOSTILE | M2_NEUTER, 0,
        7, CLR_BLACK, PM_BLACK_LIGHT),
    /*
     * zruty
     */
    MON(NAM("zruty"), S_ZRUTY,
        LVL(9, 8, 3, 0, 0), (G_GENO | 2),
        A(ATTK(AT_CLAW, AD_PHYS, 3, 4), ATTK(AT_CLAW, AD_PHYS, 3, 4),
          ATTK(AT_BITE, AD_PHYS, 3, 6), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1200, 600, MS_SILENT, MZ_LARGE), 0, 0,
        M1_ANIMAL | M1_HUMANOID | M1_CARNIVORE, M2_HOSTILE | M2_STRONG,
        M3_INFRAVISIBLE,
        11, CLR_BROWN, PM_ZRUTY),
    /*
     * Angels and other lawful minions
     */
    MON(NAM("couatl"), S_ANGEL,
        LVL(8, 10, 5, 30, 7), (G_NOHELL | G_SGROUP | G_NOCORPSE | 1),
        A(ATTK(AT_BITE, AD_DRST, 2, 4), ATTK(AT_BITE, AD_PHYS, 1, 3),
          ATTK(AT_HUGS, AD_WRAP, 2, 4), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(900, 400, MS_HISS, MZ_LARGE), MR_POISON, 0,
        M1_FLY | M1_NOHANDS | M1_SLITHY | M1_POIS,
        M2_MINION | M2_STALK | M2_STRONG | M2_NASTY,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        11, CLR_GREEN, PM_COUATL),
    MON(NAM("Aleax"), S_ANGEL,
        LVL(10, 8, 0, 30, 7), (G_NOHELL | G_NOCORPSE | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6), ATTK(AT_WEAP, AD_PHYS, 1, 6),
          ATTK(AT_KICK, AD_PHYS, 1, 4), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_IMITATE, MZ_HUMAN),
        MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON, 0,
        M1_HUMANOID | M1_SEE_INVIS,
        M2_MINION | M2_STALK | M2_NASTY | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        12, CLR_YELLOW, PM_ALEAX),
    /* Angels start with the emin extension attached, and usually have
       the isminion flag set; however, non-minion Angels can be tamed
       and will switch to edog (guardian Angel is handled specially and
       always sticks with emin) */
    MON(NAM("Angel"), S_ANGEL,
        LVL(14, 10, -4, 55, 12), (G_NOHELL | G_NOCORPSE | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6), ATTK(AT_WEAP, AD_PHYS, 1, 6),
          ATTK(AT_CLAW, AD_PHYS, 1, 4), ATTK(AT_MAGC, AD_MAGM, 2, 6),
          NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_CUSS, MZ_HUMAN),
        MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON, 0,
        M1_FLY | M1_HUMANOID | M1_SEE_INVIS,
        M2_NOPOLY | M2_MINION | M2_STALK | M2_STRONG | M2_NASTY | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        19, CLR_WHITE, PM_ANGEL),
    /* the AD&D Monster Manual depicts ki-rin as very similar to unicorns
       except that they fly (without wings) and can cast spells; nethack's
       ki-rin doesn't leave its horn when killed, but it can use the horn
       while alive to cure itself of various maladies */
    MON(NAM("ki-rin"), S_ANGEL,
        LVL(16, 18, -5, 90, 15), (G_NOHELL | G_NOCORPSE | 1),
        A(ATTK(AT_KICK, AD_PHYS, 2, 4), ATTK(AT_KICK, AD_PHYS, 2, 4),
          ATTK(AT_BUTT, AD_PHYS, 3, 6), ATTK(AT_MAGC, AD_SPEL, 2, 6),
          NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_SPELL, MZ_LARGE), MR_POISON, 0,
        M1_FLY | M1_NOHANDS | M1_SEE_INVIS,
        M2_NOPOLY | M2_MINION | M2_STALK | M2_STRONG | M2_NASTY | M2_LORD,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        21, HI_GOLD, PM_KI_RIN),
    MON(NAM("Archon"), S_ANGEL,
        LVL(19, 16, -6, 80, 15), (G_NOHELL | G_NOCORPSE | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 4), ATTK(AT_WEAP, AD_PHYS, 2, 4),
          ATTK(AT_GAZE, AD_BLND, 2, 6), ATTK(AT_CLAW, AD_PHYS, 1, 8),
          ATTK(AT_MAGC, AD_SPEL, 4, 6), NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_CUSS, MZ_LARGE),
        MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON, 0,
        M1_FLY | M1_HUMANOID | M1_SEE_INVIS | M1_REGEN,
        M2_NOPOLY | M2_MINION | M2_STALK | M2_STRONG | M2_NASTY | M2_LORD
            | M2_COLLECT | M2_MAGIC,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        26, HI_LORD, PM_ARCHON),
    /*
     * Bats and birds
     */
    MON(NAM("bat"), S_BAT,
        LVL(0, 22, 8, 0, 0), (G_GENO | G_SGROUP | 1),
        A(ATTK(AT_BITE, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(20, 20, MS_SQEEK, MZ_TINY), 0, 0,
        M1_FLY | M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_WANDER,
        M3_INFRAVISIBLE, 2, CLR_BROWN, PM_BAT),
    MON(NAM("giant bat"), S_BAT,
        LVL(2, 22, 7, 0, 0), (G_GENO | 2),
        A(ATTK(AT_BITE, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(30, 30, MS_SQEEK, MZ_SMALL), 0, 0,
        M1_FLY | M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
        M2_WANDER | M2_HOSTILE, M3_INFRAVISIBLE,
        3, CLR_RED, PM_GIANT_BAT),
    MON(NAM("raven"), S_BAT,
        LVL(4, 20, 6, 0, 0), (G_GENO | 2),
        A(ATTK(AT_BITE, AD_PHYS, 1, 6), ATTK(AT_CLAW, AD_BLND, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(40, 20, MS_SQAWK, MZ_SMALL), 0, 0,
        M1_FLY | M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_CARNIVORE,
        M2_WANDER | M2_HOSTILE, M3_INFRAVISIBLE, 6, CLR_BLACK, PM_RAVEN),
    MON(NAM("vampire bat"), S_BAT, LVL(5, 20, 6, 0, 0), (G_GENO | 2),
        A(ATTK(AT_BITE, AD_PHYS, 1, 6), ATTK(AT_BITE, AD_DRST, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(30, 20, MS_SQEEK, MZ_SMALL), MR_SLEEP | MR_POISON, 0,
        M1_FLY | M1_ANIMAL | M1_NOHANDS | M1_POIS | M1_REGEN | M1_OMNIVORE,
        M2_HOSTILE, M3_INFRAVISIBLE,
        7, CLR_BLACK, PM_VAMPIRE_BAT),
    /*
     * Centaurs
     */
    MON(NAM("plains centaur"), S_CENTAUR,
        LVL(4, 18, 4, 0, 0), (G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6), ATTK(AT_KICK, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2500, 500, MS_HUMANOID, MZ_LARGE), 0, 0,
        M1_HUMANOID | M1_OMNIVORE, M2_STRONG | M2_GREEDY | M2_COLLECT,
        M3_INFRAVISIBLE, 6, CLR_BROWN, PM_PLAINS_CENTAUR),
    MON(NAM("forest centaur"), S_CENTAUR,
        LVL(5, 18, 3, 10, -1), (G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 8), ATTK(AT_KICK, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2550, 600, MS_HUMANOID, MZ_LARGE), 0, 0,
        M1_HUMANOID | M1_OMNIVORE, M2_STRONG | M2_GREEDY | M2_COLLECT,
        M3_INFRAVISIBLE,
        8, CLR_GREEN, PM_FOREST_CENTAUR),
    MON(NAM("mountain centaur"), S_CENTAUR,
        LVL(6, 20, 2, 10, -3), (G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 10), ATTK(AT_KICK, AD_PHYS, 1, 6),
          ATTK(AT_KICK, AD_PHYS, 1, 6), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2550, 500, MS_HUMANOID, MZ_LARGE), 0, 0,
        M1_HUMANOID | M1_OMNIVORE, M2_STRONG | M2_GREEDY | M2_COLLECT,
        M3_INFRAVISIBLE,
        9, CLR_CYAN, PM_MOUNTAIN_CENTAUR),
    /*
     * Dragons
     */
    /* The order of the dragons is VERY IMPORTANT.  Quite a few
     * pieces of code depend on gray being first and yellow being last.
     * The code also depends on the *order* being the same as that for
     * dragon scale mail and dragon scales in objects.c.  [Also,
     * 'tilemap' assumes that shimmering dragon follows silver dragon.]
     *
     * Adult dragons are all lawful or chaotic; baby dragons are all
     * neutral.  This affects monster generation on some special levels.
     * Baby dragons cannot confer intrinsics, to avoid polyself/egg abuse.
     *
     * As reptiles, dragons are cold-blooded and thus aren't seen with
     * infravision.  Red and gold dragons (also Chromatic Dragon) are
     * the exceptions because they breathe fire.
     */
    MON(NAM("baby gray dragon"), S_DRAGON,
        LVL(12, 9, 2, 10, 0), G_GENO,
        A(ATTK(AT_BITE, AD_PHYS, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_BABY_DRAGON, 500, MS_ROAR, MZ_HUGE), 0, 0,
        M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS, 0,
        13, CLR_GRAY, PM_BABY_GRAY_DRAGON),
    MON(NAM("baby gold dragon"), S_DRAGON,
        LVL(12, 9, 2, 10, 0), G_GENO,
        A(ATTK(AT_BITE, AD_PHYS, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_BABY_DRAGON, 500, MS_ROAR, MZ_HUGE), 0, 0,
        M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS, M3_INFRAVISIBLE,
        13, HI_GOLD, PM_BABY_GOLD_DRAGON),
    MON(NAM("baby silver dragon"), S_DRAGON,
        LVL(12, 9, 2, 10, 0), G_GENO,
        A(ATTK(AT_BITE, AD_PHYS, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_BABY_DRAGON, 500, MS_ROAR, MZ_HUGE), 0, 0,
        M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS, 0,
        13, DRAGON_SILVER, PM_BABY_SILVER_DRAGON),
    MON(NAM("baby red dragon"), S_DRAGON,
        LVL(12, 9, 2, 10, 0), G_GENO,
        A(ATTK(AT_BITE, AD_PHYS, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_BABY_DRAGON, 500, MS_ROAR, MZ_HUGE), MR_FIRE, 0,
        M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS, M3_INFRAVISIBLE,
        13, CLR_RED, PM_BABY_RED_DRAGON),
    MON(NAM("baby white dragon"), S_DRAGON,
        LVL(12, 9, 2, 10, 0), G_GENO,
        A(ATTK(AT_BITE, AD_PHYS, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_BABY_DRAGON, 500, MS_ROAR, MZ_HUGE), MR_COLD, 0,
        M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS, 0,
        13, CLR_WHITE, PM_BABY_WHITE_DRAGON),
    MON(NAM("baby orange dragon"), S_DRAGON,
        LVL(12, 9, 2, 10, 0), G_GENO,
        A(ATTK(AT_BITE, AD_PHYS, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_BABY_DRAGON, 500, MS_ROAR, MZ_HUGE), MR_SLEEP, 0,
        M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS, 0,
        13, CLR_ORANGE, PM_BABY_ORANGE_DRAGON),
    MON(NAM("baby black dragon"), S_DRAGON,
        LVL(12, 9, 2, 10, 0), G_GENO,
        A(ATTK(AT_BITE, AD_PHYS, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_BABY_DRAGON, 500, MS_ROAR, MZ_HUGE), MR_DISINT, 0,
        M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS, 0,
        13, CLR_BLACK, PM_BABY_BLACK_DRAGON),
    MON(NAM("baby blue dragon"), S_DRAGON,
        LVL(12, 9, 2, 10, 0), G_GENO,
        A(ATTK(AT_BITE, AD_PHYS, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_BABY_DRAGON, 500, MS_ROAR, MZ_HUGE), MR_ELEC, 0,
        M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS, 0,
        13, CLR_BLUE, PM_BABY_BLUE_DRAGON),
    MON(NAM("baby green dragon"), S_DRAGON,
        LVL(12, 9, 2, 10, 0), G_GENO,
        A(ATTK(AT_BITE, AD_PHYS, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_BABY_DRAGON, 500, MS_ROAR, MZ_HUGE), MR_POISON, 0,
        M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE | M1_POIS,
        M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS, 0,
        13, CLR_GREEN, PM_BABY_GREEN_DRAGON),
    MON(NAM("baby yellow dragon"), S_DRAGON,
        LVL(12, 9, 2, 10, 0), G_GENO,
        A(ATTK(AT_BITE, AD_PHYS, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_BABY_DRAGON, 500, MS_ROAR, MZ_HUGE), MR_ACID | MR_STONE, 0,
        M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE | M1_ACID,
        M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS, 0,
        13, CLR_YELLOW, PM_BABY_YELLOW_DRAGON),
    MON(NAM("gray dragon"), S_DRAGON,
        LVL(15, 9, -1, 20, 4), (G_GENO | 1),
        A(ATTK(AT_BREA, AD_MAGM, 4, 6), ATTK(AT_BITE, AD_PHYS, 3, 8),
          ATTK(AT_CLAW, AD_PHYS, 1, 4), ATTK(AT_CLAW, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK),
        SIZ(WT_DRAGON, 1500, MS_ROAR, MZ_GIGANTIC), 0, 0,
        M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
        0,
        20, CLR_GRAY, PM_GRAY_DRAGON),
    /* gold dragon can be seen via infravision but doesn't have infravision */
    MON(NAM("gold dragon"), S_DRAGON,
        LVL(15, 9, -1, 20, 4), (G_GENO | 1),
        A(ATTK(AT_BREA, AD_FIRE, 4, 6), ATTK(AT_BITE, AD_PHYS, 3, 8),
          ATTK(AT_CLAW, AD_PHYS, 1, 4), ATTK(AT_CLAW, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK),
        SIZ(WT_DRAGON, 1500, MS_ROAR, MZ_GIGANTIC), MR_FIRE, 0,
        M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
        M3_INFRAVISIBLE,
        20, HI_GOLD, PM_GOLD_DRAGON),
    MON(NAM("silver dragon"), S_DRAGON,
        LVL(15, 9, -1, 20, 4), (G_GENO | 1),
        A(ATTK(AT_BREA, AD_COLD, 4, 6), ATTK(AT_BITE, AD_PHYS, 3, 8),
          ATTK(AT_CLAW, AD_PHYS, 1, 4), ATTK(AT_CLAW, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK),
        SIZ(WT_DRAGON, 1500, MS_ROAR, MZ_GIGANTIC), MR_COLD, 0,
        M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
        0,
        20, DRAGON_SILVER, PM_SILVER_DRAGON),
    /* red dragon has infravision and can be seen via infravision */
    MON(NAM("red dragon"), S_DRAGON,
        LVL(15, 9, -1, 20, -4), (G_GENO | 1),
        A(ATTK(AT_BREA, AD_FIRE, 6, 6), ATTK(AT_BITE, AD_PHYS, 3, 8),
          ATTK(AT_CLAW, AD_PHYS, 1, 4), ATTK(AT_CLAW, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK),
        SIZ(WT_DRAGON, 1500, MS_ROAR, MZ_GIGANTIC), MR_FIRE, MR_FIRE,
        M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
        M3_INFRAVISION | M3_INFRAVISIBLE,
        20, CLR_RED, PM_RED_DRAGON),
    MON(NAM("white dragon"), S_DRAGON,
        LVL(15, 9, -1, 20, -5), (G_GENO | 1),
        A(ATTK(AT_BREA, AD_COLD, 4, 6), ATTK(AT_BITE, AD_PHYS, 3, 8),
          ATTK(AT_CLAW, AD_PHYS, 1, 4), ATTK(AT_CLAW, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK),
        SIZ(WT_DRAGON, 1500, MS_ROAR, MZ_GIGANTIC), MR_COLD, MR_COLD,
        M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
        0,
        20, CLR_WHITE, PM_WHITE_DRAGON),
    MON(NAM("orange dragon"), S_DRAGON,
        LVL(15, 9, -1, 20, 5), (G_GENO | 1),
        A(ATTK(AT_BREA, AD_SLEE, 4, 25), ATTK(AT_BITE, AD_PHYS, 3, 8),
          ATTK(AT_CLAW, AD_PHYS, 1, 4), ATTK(AT_CLAW, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK),
        SIZ(WT_DRAGON, 1500, MS_ROAR, MZ_GIGANTIC), MR_SLEEP, MR_SLEEP,
        M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
        0,
        20, CLR_ORANGE, PM_ORANGE_DRAGON),
    /* disintegration breath is actually all or nothing, not 1d255 */
    MON(NAM("black dragon"), S_DRAGON,
        LVL(15, 9, -1, 20, -6), (G_GENO | 1),
        A(ATTK(AT_BREA, AD_DISN, 1, 255), ATTK(AT_BITE, AD_PHYS, 3, 8),
          ATTK(AT_CLAW, AD_PHYS, 1, 4), ATTK(AT_CLAW, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK),
        SIZ(WT_DRAGON, 1500, MS_ROAR, MZ_GIGANTIC), MR_DISINT, MR_DISINT,
        M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
        0,
        20, CLR_BLACK, PM_BLACK_DRAGON),
    MON(NAM("blue dragon"), S_DRAGON,
        LVL(15, 9, -1, 20, -7), (G_GENO | 1),
        A(ATTK(AT_BREA, AD_ELEC, 4, 6), ATTK(AT_BITE, AD_PHYS, 3, 8),
          ATTK(AT_CLAW, AD_PHYS, 1, 4), ATTK(AT_CLAW, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK),
        SIZ(WT_DRAGON, 1500, MS_ROAR, MZ_GIGANTIC), MR_ELEC, MR_ELEC,
        M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
        0,
        20, CLR_BLUE, PM_BLUE_DRAGON),
    MON(NAM("green dragon"), S_DRAGON,
        LVL(15, 9, -1, 20, 6), (G_GENO | 1),
        A(ATTK(AT_BREA, AD_DRST, 4, 6), ATTK(AT_BITE, AD_PHYS, 3, 8),
          ATTK(AT_CLAW, AD_PHYS, 1, 4), ATTK(AT_CLAW, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK),
        SIZ(WT_DRAGON, 1500, MS_ROAR, MZ_GIGANTIC), MR_POISON, MR_POISON,
        M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE | M1_POIS,
        M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
        0,
        20, CLR_GREEN, PM_GREEN_DRAGON),
    MON(NAM("yellow dragon"), S_DRAGON,
        LVL(15, 9, -1, 20, 7), (G_GENO | 1),
        A(ATTK(AT_BREA, AD_ACID, 4, 6), ATTK(AT_BITE, AD_PHYS, 3, 8),
          ATTK(AT_CLAW, AD_PHYS, 1, 4), ATTK(AT_CLAW, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK),
        SIZ(WT_DRAGON, 1500, MS_ROAR, MZ_GIGANTIC),
        MR_ACID | MR_STONE, MR_ACID | MR_STONE,
        M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS
            | M1_OVIPAROUS | M1_CARNIVORE | M1_ACID,
        M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
        0,
        20, CLR_YELLOW, PM_YELLOW_DRAGON),
    /*
     * Elementals
     */
    MON(NAM("stalker"), S_ELEMENTAL,
        LVL(8, 12, 3, 0, 0), (G_GENO | 3),
        A(ATTK(AT_CLAW, AD_PHYS, 4, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(900, 400, MS_SILENT, MZ_LARGE), 0, 0,
        M1_ANIMAL | M1_FLY | M1_SEE_INVIS,
        M2_WANDER | M2_STALK | M2_HOSTILE | M2_STRONG, M3_INFRAVISION,
        9, CLR_WHITE, PM_STALKER),
    MON(NAM("air elemental"), S_ELEMENTAL,
        LVL(8, 36, 2, 30, 0), (G_NOCORPSE | 1),
        A(ATTK(AT_ENGL, AD_PHYS, 1, 10),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_ETHEREAL, 0, MS_SILENT, MZ_HUGE), MR_POISON | MR_STONE, 0,
        M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS | M1_BREATHLESS
            | M1_UNSOLID | M1_FLY,
        M2_STRONG | M2_NEUTER, 0,
        10, CLR_CYAN, PM_AIR_ELEMENTAL),
    MON(NAM("fire elemental"), S_ELEMENTAL,
        LVL(8, 12, 2, 30, 0), (G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_FIRE, 3, 6), ATTK(AT_NONE, AD_FIRE, 0, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_ETHEREAL, 0, MS_SILENT, MZ_HUGE), MR_FIRE | MR_POISON | MR_STONE, 0,
        M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS | M1_BREATHLESS
            | M1_UNSOLID | M1_FLY | M1_NOTAKE,
        M2_STRONG | M2_NEUTER, M3_INFRAVISIBLE,
        10, CLR_YELLOW, PM_FIRE_ELEMENTAL),
    MON(NAM("earth elemental"), S_ELEMENTAL,
        LVL(8, 6, 2, 30, 0), (G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 4, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2500, 0, MS_SILENT, MZ_HUGE),
        MR_FIRE | MR_COLD | MR_POISON | MR_STONE, 0,
        M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS | M1_BREATHLESS
            | M1_WALLWALK | M1_THICK_HIDE,
        M2_STRONG | M2_NEUTER, 0,
        10, CLR_BROWN, PM_EARTH_ELEMENTAL),
    MON(NAM("water elemental"), S_ELEMENTAL,
        LVL(8, 5, 2, 30, 0), (G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 5, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2500, 0, MS_SILENT, MZ_HUGE), MR_POISON | MR_STONE, 0,
        M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS | M1_BREATHLESS
            | M1_UNSOLID | M1_AMPHIBIOUS | M1_SWIM,
        M2_STRONG | M2_NEUTER, 0,
        10, CLR_BLUE, PM_WATER_ELEMENTAL),
    /*
     * Fungi
     */
    MON(NAM("lichen"), S_FUNGUS,
        LVL(0, 1, 9, 0, 0), (G_GENO | 4),
        A(ATTK(AT_TUCH, AD_STCK, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(20, 200, MS_SILENT, MZ_SMALL), 0, 0,
        M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_NOTAKE,
        M2_HOSTILE | M2_NEUTER, 0,
        1, CLR_BRIGHT_GREEN, PM_LICHEN),
    MON(NAM("brown mold"), S_FUNGUS,
        LVL(1, 0, 9, 0, 0), (G_GENO | 1),
        A(ATTK(AT_NONE, AD_COLD, 0, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(50, 30, MS_SILENT, MZ_SMALL), MR_COLD | MR_POISON,
        MR_COLD | MR_POISON, M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS
                                 | M1_NOHEAD | M1_MINDLESS | M1_NOTAKE,
        M2_HOSTILE | M2_NEUTER, 0,
        2, CLR_BROWN, PM_BROWN_MOLD),
    MON(NAM("yellow mold"), S_FUNGUS,
        LVL(1, 0, 9, 0, 0), (G_GENO | 2),
        A(ATTK(AT_NONE, AD_STUN, 0, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(50, 30, MS_SILENT, MZ_SMALL), MR_POISON, MR_POISON,
        M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_POIS | M1_NOTAKE,
        M2_HOSTILE | M2_NEUTER, 0,
        2, CLR_YELLOW, PM_YELLOW_MOLD),
    MON(NAM("green mold"), S_FUNGUS,
        LVL(1, 0, 9, 0, 0), (G_GENO | 1),
        A(ATTK(AT_NONE, AD_ACID, 0, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(50, 30, MS_SILENT, MZ_SMALL),
        MR_ACID | MR_STONE, MR_ACID | MR_STONE,
        M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_ACID | M1_NOTAKE,
        M2_HOSTILE | M2_NEUTER, 0,
        2, CLR_GREEN, PM_GREEN_MOLD),
    MON(NAM("red mold"), S_FUNGUS,
        LVL(1, 0, 9, 0, 0), (G_GENO | 1),
        A(ATTK(AT_NONE, AD_FIRE, 0, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(50, 30, MS_SILENT, MZ_SMALL), MR_FIRE | MR_POISON,
        MR_FIRE | MR_POISON, M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS
                                 | M1_NOHEAD | M1_MINDLESS | M1_NOTAKE,
        M2_HOSTILE | M2_NEUTER, M3_INFRAVISIBLE,
        2, CLR_RED, PM_RED_MOLD),
    MON(NAM("shrieker"), S_FUNGUS,
        LVL(3, 1, 7, 0, 0), (G_GENO | 1),
        A(NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(100, 100, MS_SHRIEK, MZ_SMALL), MR_POISON, MR_POISON,
        M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_NOTAKE,
        M2_HOSTILE | M2_NEUTER, 0,
        2, CLR_MAGENTA, PM_SHRIEKER),
    MON(NAM("violet fungus"), S_FUNGUS,
        LVL(3, 1, 7, 0, 0), (G_GENO | 2),
        A(ATTK(AT_TUCH, AD_PHYS, 1, 4), ATTK(AT_TUCH, AD_STCK, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(100, 100, MS_SILENT, MZ_SMALL), MR_POISON, MR_POISON,
        M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_NOTAKE,
        M2_HOSTILE | M2_NEUTER, 0,
        5, CLR_MAGENTA, PM_VIOLET_FUNGUS),
    /*
     * Gnomes
     *  Unlike plain human|elf|orc, plain "gnome" is an ordinary monster.
     */
    MON(NAM("gnome"), S_GNOME,
        LVL(1, 6, 10, 4, 0), (G_GENO | G_SGROUP | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(650, 100, MS_ORC, MZ_SMALL), 0, 0, M1_HUMANOID | M1_OMNIVORE,
        M2_GNOME | M2_COLLECT, M3_INFRAVISIBLE | M3_INFRAVISION,
        3, CLR_BROWN, PM_GNOME),
    MON(NAMS("gnome lord", "gnome lady", "gnome leader"),
        S_GNOME, LVL(3, 8, 10, 4, 0), (G_GENO | 2),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(700, 120, MS_ORC, MZ_SMALL), 0, 0, M1_HUMANOID | M1_OMNIVORE,
        M2_GNOME | M2_LORD | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION, 4, CLR_BLUE, PM_GNOME_LEADER),
    MON(NAM("gnomish wizard"), S_GNOME,
        LVL(3, 10, 4, 10, 0), (G_GENO | 1),
        A(ATTK(AT_MAGC, AD_SPEL, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(700, 120, MS_ORC, MZ_SMALL), 0, 0, M1_HUMANOID | M1_OMNIVORE,
        M2_GNOME | M2_MAGIC, M3_INFRAVISIBLE | M3_INFRAVISION,
        5, HI_ZAP, PM_GNOMISH_WIZARD),
    MON(NAMS("gnome king", "gnome queen", "gnome ruler"),
        S_GNOME, LVL(5, 10, 10, 20, 0), (G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(750, 150, MS_ORC, MZ_SMALL), 0, 0, M1_HUMANOID | M1_OMNIVORE,
        M2_GNOME | M2_PRINCE | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        6, HI_LORD, PM_GNOME_RULER),
    /*
     * giant Humanoids
     */
    /* plain giant is a placeholder for zombie and mummy corpses */
    MON(NAM("giant"), S_GIANT,
        LVL(6, 6, 0, 0, 2), (G_GENO | G_NOGEN | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 10),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2250, 750, MS_BOAST, MZ_HUGE), 0, 0, M1_HUMANOID | M1_CARNIVORE,
        M2_GIANT | M2_STRONG | M2_ROCKTHROW | M2_NASTY | M2_COLLECT
            | M2_JEWELS,
        M3_INFRAVISIBLE | M3_INFRAVISION, 8, CLR_RED, PM_GIANT),
    MON(NAM("stone giant"), S_GIANT,
        LVL(6, 6, 0, 0, 2), (G_GENO | G_SGROUP | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 10),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2250, 750, MS_BOAST, MZ_HUGE), 0, 0, M1_HUMANOID | M1_CARNIVORE,
        M2_GIANT | M2_STRONG | M2_ROCKTHROW | M2_NASTY | M2_COLLECT
            | M2_JEWELS,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        8, CLR_GRAY, PM_STONE_GIANT),
    MON(NAM("hill giant"), S_GIANT,
        LVL(8, 10, 6, 0, -2), (G_GENO | G_SGROUP | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2200, 700, MS_BOAST, MZ_HUGE), 0, 0, M1_HUMANOID | M1_CARNIVORE,
        M2_GIANT | M2_STRONG | M2_ROCKTHROW | M2_NASTY | M2_COLLECT
            | M2_JEWELS,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        10, CLR_CYAN, PM_HILL_GIANT),
    MON(NAM("fire giant"), S_GIANT,
        LVL(9, 12, 4, 5, 2), (G_GENO | G_SGROUP | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 10),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2250, 750, MS_BOAST, MZ_HUGE), MR_FIRE, MR_FIRE,
        M1_HUMANOID | M1_CARNIVORE, M2_GIANT | M2_STRONG | M2_ROCKTHROW
                                        | M2_NASTY | M2_COLLECT | M2_JEWELS,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        11, CLR_YELLOW, PM_FIRE_GIANT),
    MON(NAM("frost giant"), S_GIANT,
        LVL(10, 12, 3, 10, -3), (G_NOHELL | G_GENO | G_SGROUP | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 12),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2250, 750, MS_BOAST, MZ_HUGE), MR_COLD, MR_COLD,
        M1_HUMANOID | M1_CARNIVORE, M2_GIANT | M2_STRONG | M2_ROCKTHROW
                                        | M2_NASTY | M2_COLLECT | M2_JEWELS,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        13, CLR_WHITE, PM_FROST_GIANT),
    /* ettin is a two-headed giant but its corpse doesn't confer strength */
    MON(NAM("ettin"), S_GIANT,
        LVL(10, 12, 3, 0, 0), (G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 8), ATTK(AT_WEAP, AD_PHYS, 3, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1700, 500, MS_GRUNT, MZ_HUGE), 0, 0,
        M1_ANIMAL | M1_HUMANOID | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG | M2_NASTY | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        13, CLR_BROWN, PM_ETTIN),
    MON(NAM("storm giant"), S_GIANT,
        LVL(16, 12, 3, 10, -3), (G_GENO | G_SGROUP | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 12),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2250, 750, MS_BOAST, MZ_HUGE), MR_ELEC, MR_ELEC,
        M1_HUMANOID | M1_CARNIVORE, M2_GIANT | M2_STRONG | M2_ROCKTHROW
                                        | M2_NASTY | M2_COLLECT | M2_JEWELS,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        19, CLR_BLUE, PM_STORM_GIANT),
    MON(NAM("titan"), S_GIANT,
        LVL(16, 18, -3, 70, 9), (1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 8), ATTK(AT_MAGC, AD_SPEL, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2300, 900, MS_SPELL, MZ_HUGE), 0, 0,
        M1_FLY | M1_HUMANOID | M1_OMNIVORE,
        M2_STRONG | M2_ROCKTHROW | M2_NASTY | M2_COLLECT | M2_MAGIC,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        20, CLR_MAGENTA, PM_TITAN),
    MON(NAM("minotaur"), S_GIANT,
        LVL(15, 15, 6, 0, 0), (G_GENO | G_NOGEN),
        A(ATTK(AT_CLAW, AD_PHYS, 3, 10), ATTK(AT_CLAW, AD_PHYS, 3, 10),
          ATTK(AT_BUTT, AD_PHYS, 2, 8), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1500, 700, MS_MOO, MZ_LARGE), 0, 0,
        M1_ANIMAL | M1_HUMANOID | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG | M2_NASTY, M3_INFRAVISIBLE | M3_INFRAVISION,
        17, CLR_BROWN, PM_MINOTAUR),
    /*
     * Invisible
     * S_invisible=='I' is a visual marker for all invisible monsters
     * and must be not be used for any specific monster types.  Long
     * time 'invisible stalker' was changed to 'stalker', an Elemental.
     */

    /*
     * Jabberwock
     */
    /* the illustration from _Through_the_Looking_Glass_
       depicts hands as well as wings */
    MON(NAM("jabberwock"), S_JABBERWOCK,
        LVL(15, 12, -2, 50, 0), (G_GENO | 1),
        A(ATTK(AT_BITE, AD_PHYS, 2, 10), ATTK(AT_BITE, AD_PHYS, 2, 10),
          ATTK(AT_CLAW, AD_PHYS, 2, 10), ATTK(AT_CLAW, AD_PHYS, 2, 10),
          NO_ATTK, NO_ATTK),
        SIZ(1300, 600, MS_BURBLE, MZ_LARGE), 0, 0,
        M1_ANIMAL | M1_FLY | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG | M2_NASTY | M2_COLLECT, M3_INFRAVISIBLE,
        18, CLR_ORANGE, PM_JABBERWOCK),
    /*
     * Kops
     */
    MON(NAM("Keystone Kop"), S_KOP,
        LVL(1, 6, 10, 10, 9), (G_GENO | G_LGROUP | G_NOGEN),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 200, MS_ARREST, MZ_HUMAN), 0, 0, M1_HUMANOID,
        M2_HUMAN | M2_WANDER | M2_HOSTILE | M2_MALE | M2_COLLECT,
        M3_INFRAVISIBLE,
        3, CLR_BLUE, PM_KEYSTONE_KOP),
    MON(NAM("Kop Sergeant"), S_KOP,
        LVL(2, 8, 10, 10, 10), (G_GENO | G_SGROUP | G_NOGEN),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 200, MS_ARREST, MZ_HUMAN), 0, 0, M1_HUMANOID,
        M2_HUMAN | M2_WANDER | M2_HOSTILE | M2_STRONG | M2_MALE | M2_COLLECT,
        M3_INFRAVISIBLE,
        4, CLR_BLUE, PM_KOP_SERGEANT),
    MON(NAM("Kop Lieutenant"), S_KOP,
        LVL(3, 10, 10, 20, 11), (G_GENO | G_NOGEN),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 200, MS_ARREST, MZ_HUMAN), 0, 0, M1_HUMANOID,
        M2_HUMAN | M2_WANDER | M2_HOSTILE | M2_STRONG | M2_MALE | M2_COLLECT,
        M3_INFRAVISIBLE,
        5, CLR_CYAN, PM_KOP_LIEUTENANT),
    MON(NAM("Kop Kaptain"), S_KOP,
        LVL(4, 12, 10, 20, 12), (G_GENO | G_NOGEN),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 200, MS_ARREST, MZ_HUMAN), 0, 0, M1_HUMANOID,
        M2_HUMAN | M2_WANDER | M2_HOSTILE | M2_STRONG | M2_MALE | M2_COLLECT,
        M3_INFRAVISIBLE,
        6, HI_LORD, PM_KOP_KAPTAIN),
    /*
     * Liches
     */
    MON(NAM("lich"), S_LICH,
        LVL(11, 6, 0, 30, -9), (G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_TUCH, AD_COLD, 1, 10), ATTK(AT_MAGC, AD_SPEL, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1200, 100, MS_MUMBLE, MZ_HUMAN), MR_COLD | MR_SLEEP | MR_POISON,
        MR_COLD, M1_BREATHLESS | M1_HUMANOID | M1_POIS | M1_REGEN,
        M2_UNDEAD | M2_HOSTILE | M2_MAGIC, M3_INFRAVISION,
        14, CLR_BROWN, PM_LICH),
    MON(NAM("demilich"), S_LICH,
        LVL(14, 9, -2, 60, -12), (G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_TUCH, AD_COLD, 3, 4), ATTK(AT_MAGC, AD_SPEL, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1200, 100, MS_MUMBLE, MZ_HUMAN), MR_COLD | MR_SLEEP | MR_POISON,
        MR_COLD, M1_BREATHLESS | M1_HUMANOID | M1_POIS | M1_REGEN,
        M2_UNDEAD | M2_HOSTILE | M2_MAGIC, M3_INFRAVISION,
        18, CLR_RED, PM_DEMILICH),
    MON(NAM("master lich"), S_LICH,
        LVL(17, 9, -4, 90, -15), (G_HELL | G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_TUCH, AD_COLD, 3, 6), ATTK(AT_MAGC, AD_SPEL, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1200, 100, MS_MUMBLE, MZ_HUMAN),
        MR_FIRE | MR_COLD | MR_SLEEP | MR_POISON, MR_FIRE | MR_COLD,
        M1_BREATHLESS | M1_HUMANOID | M1_POIS | M1_REGEN,
        M2_UNDEAD | M2_HOSTILE | M2_MAGIC, M3_WANTSBOOK | M3_INFRAVISION,
        21, HI_LORD, PM_MASTER_LICH),
    MON(NAM("arch-lich"), S_LICH,
        LVL(25, 9, -6, 90, -15), (G_HELL | G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_TUCH, AD_COLD, 5, 6), ATTK(AT_MAGC, AD_SPEL, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1200, 100, MS_MUMBLE, MZ_HUMAN),
        MR_FIRE | MR_COLD | MR_SLEEP | MR_ELEC | MR_POISON, MR_FIRE | MR_COLD,
        M1_BREATHLESS | M1_HUMANOID | M1_POIS | M1_REGEN,
        M2_UNDEAD | M2_HOSTILE | M2_MAGIC, M3_WANTSBOOK | M3_INFRAVISION,
        29, HI_LORD, PM_ARCH_LICH),
    /*
     * Mummies
     */
    MON(NAM("kobold mummy"), S_MUMMY,
        LVL(3, 8, 6, 20, -2), (G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(400, 50, MS_SILENT, MZ_SMALL), MR_COLD | MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
        M2_UNDEAD | M2_HOSTILE, M3_INFRAVISION,
        4, CLR_BROWN, PM_KOBOLD_MUMMY),
    MON(NAM("gnome mummy"), S_MUMMY,
        LVL(4, 10, 6, 20, -3), (G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(650, 50, MS_SILENT, MZ_SMALL), MR_COLD | MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
        M2_UNDEAD | M2_HOSTILE | M2_GNOME, M3_INFRAVISION,
        5, CLR_RED, PM_GNOME_MUMMY),
    MON(NAM("orc mummy"), S_MUMMY,
        LVL(5, 10, 5, 20, -4), (G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(850, 75, MS_SILENT, MZ_HUMAN), MR_COLD | MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
        M2_UNDEAD | M2_HOSTILE | M2_STRONG | M2_ORC | M2_GREEDY | M2_JEWELS,
        M3_INFRAVISION,
        6, CLR_GRAY, PM_ORC_MUMMY),
    MON(NAM("dwarf mummy"), S_MUMMY,
        LVL(5, 10, 5, 20, -4), (G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(900, 150, MS_SILENT, MZ_HUMAN), MR_COLD | MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
        M2_UNDEAD | M2_HOSTILE | M2_DWARF | M2_GREEDY | M2_JEWELS,
        M3_INFRAVISION,
        6, CLR_RED, PM_DWARF_MUMMY),
    MON(NAM("elf mummy"), S_MUMMY,
        LVL(6, 12, 4, 30, -5), (G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_ELF, 175, MS_SILENT, MZ_HUMAN), MR_COLD | MR_SLEEP | MR_POISON,
        0, M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
        M2_UNDEAD | M2_HOSTILE | M2_ELF, M3_INFRAVISION,
        7, CLR_GREEN, PM_ELF_MUMMY),
    MON(NAM("human mummy"), S_MUMMY,
        LVL(6, 12, 4, 30, -5), (G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 2, 4), ATTK(AT_CLAW, AD_PHYS, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 200, MS_SILENT, MZ_HUMAN),
        MR_COLD | MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
        M2_UNDEAD | M2_HOSTILE, M3_INFRAVISION,
        7, CLR_GRAY, PM_HUMAN_MUMMY),
    MON(NAM("ettin mummy"), S_MUMMY,
        LVL(7, 12, 4, 30, -6), (G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 2, 6), ATTK(AT_CLAW, AD_PHYS, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1700, 250, MS_SILENT, MZ_HUGE), MR_COLD | MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
        M2_UNDEAD | M2_HOSTILE | M2_STRONG, M3_INFRAVISION,
        8, CLR_BLUE, PM_ETTIN_MUMMY),
    MON(NAM("giant mummy"), S_MUMMY,
        LVL(8, 14, 3, 30, -7), (G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 3, 4), ATTK(AT_CLAW, AD_PHYS, 3, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2050, 375, MS_SILENT, MZ_HUGE), MR_COLD | MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
        M2_UNDEAD | M2_HOSTILE | M2_GIANT | M2_STRONG | M2_JEWELS,
        M3_INFRAVISION,
        10, CLR_CYAN, PM_GIANT_MUMMY),
    /*
     * Nagas
     */
    MON(NAM("red naga hatchling"), S_NAGA,
        LVL(3, 10, 6, 0, 0), G_GENO,
        A(ATTK(AT_BITE, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(500, 100, MS_MUMBLE, MZ_LARGE), MR_FIRE | MR_POISON, MR_POISON,
        M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE | M1_NOTAKE | M1_OMNIVORE,
        M2_STRONG, M3_INFRAVISIBLE,
        4, CLR_RED, PM_RED_NAGA_HATCHLING),
    MON(NAM("black naga hatchling"), S_NAGA,
        LVL(3, 10, 6, 0, 0), G_GENO,
        A(ATTK(AT_BITE, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(500, 100, MS_MUMBLE, MZ_LARGE),
        MR_POISON | MR_ACID | MR_STONE, MR_POISON,
        M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE | M1_ACID | M1_NOTAKE
            | M1_CARNIVORE,
        M2_STRONG, 0,
        4, CLR_BLACK, PM_BLACK_NAGA_HATCHLING),
    MON(NAM("golden naga hatchling"), S_NAGA,
        LVL(3, 10, 6, 0, 0), G_GENO,
        A(ATTK(AT_BITE, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(500, 100, MS_MUMBLE, MZ_LARGE), MR_POISON, MR_POISON,
        M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE | M1_NOTAKE | M1_OMNIVORE,
        M2_STRONG, 0,
        4, HI_GOLD, PM_GOLDEN_NAGA_HATCHLING),
    MON(NAM("guardian naga hatchling"), S_NAGA,
        LVL(3, 10, 6, 0, 0), G_GENO,
        A(ATTK(AT_BITE, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(500, 100, MS_MUMBLE, MZ_LARGE), MR_POISON, MR_POISON,
        M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE | M1_NOTAKE | M1_OMNIVORE,
        M2_STRONG, 0,
        4, CLR_GREEN, PM_GUARDIAN_NAGA_HATCHLING),
    MON(NAM("red naga"), S_NAGA,
        LVL(6, 12, 4, 0, -4), (G_GENO | 1),
        A(ATTK(AT_BITE, AD_PHYS, 2, 4), ATTK(AT_BREA, AD_FIRE, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2600, 400, MS_MUMBLE, MZ_HUGE), MR_FIRE | MR_POISON,
        MR_FIRE | MR_POISON, M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE
                                 | M1_OVIPAROUS | M1_NOTAKE | M1_OMNIVORE,
        M2_STRONG, M3_INFRAVISIBLE,
        8, CLR_RED, PM_RED_NAGA),
    MON(NAM("black naga"), S_NAGA,
        LVL(8, 14, 2, 10, 4), (G_GENO | 1),
        A(ATTK(AT_BITE, AD_PHYS, 2, 6), ATTK(AT_SPIT, AD_ACID, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2600, 400, MS_MUMBLE, MZ_HUGE),
        MR_POISON | MR_ACID | MR_STONE, MR_POISON | MR_ACID | MR_STONE,
        M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE | M1_OVIPAROUS | M1_ACID
            | M1_NOTAKE | M1_CARNIVORE,
        M2_STRONG, 0,
        10, CLR_BLACK, PM_BLACK_NAGA),
    MON(NAM("golden naga"), S_NAGA,
        LVL(10, 14, 2, 70, 5), (G_GENO | 1),
        A(ATTK(AT_BITE, AD_PHYS, 2, 6), ATTK(AT_MAGC, AD_SPEL, 4, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2600, 400, MS_MUMBLE, MZ_HUGE), MR_POISON, MR_POISON,
        M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE | M1_OVIPAROUS | M1_NOTAKE
            | M1_OMNIVORE,
        M2_STRONG, 0,
        13, HI_GOLD, PM_GOLDEN_NAGA),
    /* 5.0: guardian naga used to have three attacks: bite, spit, hug
       but in order for the hug to succeed the two preceding attacks had
       to have hit, and it's not possible to both bite and spit, hence
       the hug never hit; change to spit, bite, touch, hug; if the bite
       and touch hit, the hug will too */
    MON(NAM("guardian naga"), S_NAGA,
        LVL(12, 16, 0, 50, 7), (G_GENO | 1),
        A(ATTK(AT_SPIT, AD_DRST, 1, 6), ATTK(AT_BITE, AD_PLYS, 1, 6),
          ATTK(AT_TUCH, AD_PHYS, 0, 0), ATTK(AT_HUGS, AD_WRAP, 2, 4),
          NO_ATTK, NO_ATTK),
        SIZ(2600, 400, MS_MUMBLE, MZ_HUGE), MR_POISON, MR_POISON,
        M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE | M1_OVIPAROUS | M1_POIS
            | M1_NOTAKE | M1_OMNIVORE,
        M2_STRONG, 0,
        17, CLR_GREEN, PM_GUARDIAN_NAGA),
    /*
     * Ogres
     */
    MON(NAM("ogre"), S_OGRE,
        LVL(5, 10, 5, 0, -3), (G_SGROUP | G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 5),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1600, 500, MS_GRUNT, MZ_LARGE), 0, 0, M1_HUMANOID | M1_CARNIVORE,
        M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        7, CLR_BROWN, PM_OGRE),
    MON(NAMS("ogre lord", "ogre lady", "ogre leader"), S_OGRE,
        LVL(7, 12, 3, 30, -5), (G_GENO | 2),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1700, 700, MS_GRUNT, MZ_LARGE), 0, 0, M1_HUMANOID | M1_CARNIVORE,
        M2_STRONG | M2_LORD | M2_GREEDY | M2_JEWELS | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        9, CLR_RED, PM_OGRE_LEADER),
    MON(NAMS("ogre king", "ogre queen", "ogre tyrant"), S_OGRE,
        LVL(9, 14, 4, 60, -7), (G_GENO | 2),
        A(ATTK(AT_WEAP, AD_PHYS, 3, 5),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1700, 750, MS_GRUNT, MZ_LARGE), 0, 0, M1_HUMANOID | M1_CARNIVORE,
        M2_STRONG | M2_PRINCE | M2_GREEDY | M2_JEWELS | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        11, HI_LORD, PM_OGRE_TYRANT),
    /*
     * Puddings
     *
     * must be in the same order as the pudding globs in objects.c
     */
    MON(NAM("gray ooze"), S_PUDDING,
        LVL(3, 1, 8, 0, 0), (G_GENO | G_NOCORPSE | 2),
        A(ATTK(AT_BITE, AD_RUST, 2, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(500, 250, MS_SILENT, MZ_MEDIUM),
        MR_FIRE | MR_COLD | MR_POISON | MR_ACID | MR_STONE,
        MR_FIRE | MR_COLD | MR_POISON,
        M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_OMNIVORE | M1_ACID,
        M2_HOSTILE | M2_NEUTER, 0,
        4, CLR_GRAY, PM_GRAY_OOZE),
    MON(NAM("brown pudding"), S_PUDDING,
        LVL(5, 3, 8, 0, 0), (G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_BITE, AD_DCAY, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(500, 250, MS_SILENT, MZ_MEDIUM),
        MR_COLD | MR_ELEC | MR_POISON | MR_ACID | MR_STONE,
        MR_COLD | MR_ELEC | MR_POISON,
        M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_OMNIVORE | M1_ACID,
        M2_HOSTILE | M2_NEUTER, 0,
        6, CLR_BROWN, PM_BROWN_PUDDING),
    MON(NAM("green slime"), S_PUDDING,
        LVL(6, 6, 6, 0, 0), (G_HELL | G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_TUCH, AD_SLIM, 1, 4), ATTK(AT_NONE, AD_SLIM, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(400, 150, MS_SILENT, MZ_LARGE),
        MR_COLD | MR_ELEC | MR_POISON | MR_ACID | MR_STONE, MR_ACID | MR_STONE,
        M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_OMNIVORE | M1_ACID | M1_POIS,
        M2_HOSTILE | M2_NEUTER, 0,
        8, CLR_GREEN, PM_GREEN_SLIME),
    MON(NAM("black pudding"), S_PUDDING,
        LVL(10, 6, 6, 0, 0), (G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_BITE, AD_CORR, 3, 8), ATTK(AT_NONE, AD_CORR, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(900, 250, MS_SILENT, MZ_LARGE),
        MR_COLD | MR_ELEC | MR_POISON | MR_ACID | MR_STONE,
        MR_COLD | MR_ELEC | MR_POISON,
        M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_OMNIVORE | M1_ACID,
        M2_HOSTILE | M2_NEUTER, 0,
        12, CLR_BLACK, PM_BLACK_PUDDING),
    /*
     * Quantum mechanics
     */
    MON(NAM("quantum mechanic"), S_QUANTMECH,
        LVL(7, 12, 3, 10, 0), (G_GENO | 3),
        A(ATTK(AT_CLAW, AD_TLPT, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 20, MS_HUMANOID, MZ_HUMAN), MR_POISON, 0,
        M1_HUMANOID | M1_OMNIVORE | M1_POIS | M1_TPORT, M2_HOSTILE,
        M3_INFRAVISIBLE,
        9, CLR_CYAN, PM_QUANTUM_MECHANIC),
    /* 5.0: from slash'em, to expand Q class; hit polymorphs target */
    MON(NAM("genetic engineer"), S_QUANTMECH,
        LVL(12, 12, 3, 10, 0), (G_GENO | 1),
        A(ATTK(AT_CLAW, AD_POLY, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 20, MS_HUMANOID, MZ_HUMAN), MR_POISON, 0,
        M1_HUMANOID | M1_OMNIVORE | M1_POIS | M1_TPORT, M2_HOSTILE | M2_NASTY,
        M3_INFRAVISIBLE,
        14, CLR_GREEN, PM_GENETIC_ENGINEER),
    /*
     * Rust monster or disenchanter
     */
    MON(NAM("rust monster"), S_RUSTMONST,
        LVL(5, 18, 2, 0, 0), (G_GENO | 2),
        A(ATTK(AT_TUCH, AD_RUST, 0, 0), ATTK(AT_TUCH, AD_RUST, 0, 0),
          ATTK(AT_NONE, AD_RUST, 0, 0), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1000, 250, MS_SILENT, MZ_MEDIUM), 0, 0,
        M1_SWIM | M1_ANIMAL | M1_NOHANDS | M1_METALLIVORE, M2_HOSTILE,
        M3_INFRAVISIBLE,
        8, CLR_BROWN, PM_RUST_MONSTER),
    MON(NAM("disenchanter"), S_RUSTMONST,
        LVL(12, 12, -10, 0, -3), (G_HELL | G_GENO | 2),
        A(ATTK(AT_CLAW, AD_ENCH, 4, 4), ATTK(AT_NONE, AD_ENCH, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(750, 200, MS_GROWL, MZ_LARGE), 0, 0, M1_ANIMAL | M1_CARNIVORE,
        M2_HOSTILE, M3_INFRAVISIBLE,
        14, CLR_BLUE, PM_DISENCHANTER),
    /*
     * Snakes
     *  Note: in the real world, most snakes are oviparous but some aren't;
     *  we treat all of these as if they are.
     */
    MON(NAM("garter snake"), S_SNAKE,
        LVL(1, 8, 8, 0, 0), (G_LGROUP | G_GENO | 1),
        A(ATTK(AT_BITE, AD_PHYS, 1, 2),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(50, 60, MS_HISS, MZ_TINY), 0, 0,
        M1_SWIM | M1_CONCEAL | M1_NOLIMBS | M1_ANIMAL | M1_SLITHY
            | M1_OVIPAROUS | M1_CARNIVORE | M1_NOTAKE,
        0, 0,
        3, CLR_GREEN, PM_GARTER_SNAKE),
    MON(NAM("snake"), S_SNAKE,
        LVL(4, 15, 3, 0, 0), (G_GENO | 2),
        A(ATTK(AT_BITE, AD_DRST, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(100, 80, MS_HISS, MZ_SMALL), MR_POISON, MR_POISON,
        M1_SWIM | M1_CONCEAL | M1_NOLIMBS | M1_ANIMAL | M1_SLITHY | M1_POIS
            | M1_OVIPAROUS | M1_CARNIVORE | M1_NOTAKE,
        M2_HOSTILE, 0,
        6, CLR_BROWN, PM_SNAKE),
    MON(NAM("water moccasin"), S_SNAKE,
        LVL(4, 15, 3, 0, 0), (G_GENO | G_NOGEN | G_LGROUP),
        A(ATTK(AT_BITE, AD_DRST, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(150, 80, MS_HISS, MZ_SMALL), MR_POISON, MR_POISON,
        M1_SWIM | M1_CONCEAL | M1_NOLIMBS | M1_ANIMAL | M1_SLITHY | M1_POIS
            | M1_CARNIVORE | M1_OVIPAROUS | M1_NOTAKE,
        M2_HOSTILE, 0,
        7, CLR_RED, PM_WATER_MOCCASIN),
    MON(NAM("python"), S_SNAKE,
        LVL(6, 3, 5, 0, 0), (G_GENO | 1),
        A(ATTK(AT_BITE, AD_PHYS, 1, 4), ATTK(AT_TUCH, AD_PHYS, 0, 0),
          ATTK(AT_HUGS, AD_WRAP, 1, 4), ATTK(AT_HUGS, AD_PHYS, 2, 4),
          NO_ATTK, NO_ATTK),
        SIZ(250, 100, MS_HISS, MZ_LARGE), 0, 0,
        M1_SWIM | M1_NOLIMBS | M1_ANIMAL | M1_SLITHY | M1_CARNIVORE
            | M1_OVIPAROUS | M1_NOTAKE,
        M2_HOSTILE | M2_STRONG, M3_INFRAVISION,
        8, CLR_MAGENTA, PM_PYTHON),
    MON(NAM("pit viper"), S_SNAKE,
        LVL(6, 15, 2, 0, 0), (G_GENO | 1),
        A(ATTK(AT_BITE, AD_DRST, 1, 4), ATTK(AT_BITE, AD_DRST, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(100, 60, MS_HISS, MZ_MEDIUM), MR_POISON, MR_POISON,
        M1_SWIM | M1_CONCEAL | M1_NOLIMBS | M1_ANIMAL | M1_SLITHY | M1_POIS
            | M1_CARNIVORE | M1_OVIPAROUS | M1_NOTAKE,
        M2_HOSTILE, M3_INFRAVISION,
        9, CLR_BLUE, PM_PIT_VIPER),
    MON(NAM("cobra"), S_SNAKE,
        LVL(6, 18, 2, 0, 0), (G_GENO | 1),
        A(ATTK(AT_BITE, AD_DRST, 2, 4), ATTK(AT_SPIT, AD_BLND, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(250, 100, MS_HISS, MZ_MEDIUM), MR_POISON, MR_POISON,
        M1_SWIM | M1_CONCEAL | M1_NOLIMBS | M1_ANIMAL | M1_SLITHY | M1_POIS
            | M1_CARNIVORE | M1_OVIPAROUS | M1_NOTAKE,
        M2_HOSTILE, 0,
        10, CLR_BLUE, PM_COBRA),
    /*
     * Trolls
     */
    MON(NAM("troll"), S_TROLL,
        LVL(7, 12, 4, 0, -3), (G_GENO | 2),
        A(ATTK(AT_WEAP, AD_PHYS, 4, 2), ATTK(AT_CLAW, AD_PHYS, 4, 2),
          ATTK(AT_BITE, AD_PHYS, 2, 6), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(800, 350, MS_GRUNT, MZ_LARGE), 0, 0,
        M1_HUMANOID | M1_REGEN | M1_CARNIVORE,
        M2_STRONG | M2_STALK | M2_HOSTILE, M3_INFRAVISIBLE | M3_INFRAVISION,
        9, CLR_BROWN, PM_TROLL),
    MON(NAM("ice troll"), S_TROLL,
        LVL(9, 10, 2, 20, -3), (G_NOHELL | G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 6), ATTK(AT_CLAW, AD_COLD, 2, 6),
          ATTK(AT_BITE, AD_PHYS, 2, 6), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1000, 300, MS_GRUNT, MZ_LARGE), MR_COLD, MR_COLD,
        M1_HUMANOID | M1_REGEN | M1_CARNIVORE,
        M2_STRONG | M2_STALK | M2_HOSTILE, M3_INFRAVISIBLE | M3_INFRAVISION,
        12, CLR_WHITE, PM_ICE_TROLL),
    MON(NAM("rock troll"), S_TROLL,
        LVL(9, 12, 0, 0, -3), (G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 3, 6), ATTK(AT_CLAW, AD_PHYS, 2, 8),
          ATTK(AT_BITE, AD_PHYS, 2, 6), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1200, 300, MS_GRUNT, MZ_LARGE), 0, 0,
        M1_HUMANOID | M1_REGEN | M1_CARNIVORE,
        M2_STRONG | M2_STALK | M2_HOSTILE | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        12, CLR_CYAN, PM_ROCK_TROLL),
    MON(NAM("water troll"), S_TROLL,
        LVL(11, 14, 4, 40, -3), (G_NOGEN | G_GENO),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 8), ATTK(AT_CLAW, AD_PHYS, 2, 8),
          ATTK(AT_BITE, AD_PHYS, 2, 6), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1200, 350, MS_GRUNT, MZ_LARGE), 0, 0,
        M1_HUMANOID | M1_REGEN | M1_CARNIVORE | M1_SWIM,
        M2_STRONG | M2_STALK | M2_HOSTILE, M3_INFRAVISIBLE | M3_INFRAVISION,
        13, CLR_BLUE, PM_WATER_TROLL),
    MON(NAM("Olog-hai"), S_TROLL,
        LVL(13, 12, -4, 0, -7), (G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 3, 6), ATTK(AT_CLAW, AD_PHYS, 2, 8),
          ATTK(AT_BITE, AD_PHYS, 2, 6), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1500, 400, MS_GRUNT, MZ_LARGE), 0, 0,
        M1_HUMANOID | M1_REGEN | M1_CARNIVORE,
        M2_STRONG | M2_STALK | M2_HOSTILE | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        16, HI_LORD, PM_OLOG_HAI),
    /*
     * Umber hulk
     */
    MON(NAM("umber hulk"), S_UMBER,
        LVL(9, 6, 2, 25, 0), (G_GENO | 2),
        A(ATTK(AT_CLAW, AD_PHYS, 3, 4), ATTK(AT_CLAW, AD_PHYS, 3, 4),
          ATTK(AT_BITE, AD_PHYS, 2, 5), ATTK(AT_GAZE, AD_CONF, 0, 0),
          NO_ATTK, NO_ATTK),
        SIZ(1200, 500, MS_SILENT, MZ_LARGE), 0, 0, M1_TUNNEL | M1_CARNIVORE,
        M2_STRONG, M3_INFRAVISIBLE,
        12, CLR_BROWN, PM_UMBER_HULK),
    /*
     * Vampires
     */
    MON(NAM("vampire"), S_VAMPIRE,
        LVL(10, 12, 1, 25, -8), (G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 6), ATTK(AT_BITE, AD_DRLI, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_VAMPIRE, MZ_HUMAN), MR_SLEEP | MR_POISON, 0,
        M1_FLY | M1_BREATHLESS | M1_HUMANOID | M1_POIS | M1_REGEN,
        M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_STRONG | M2_NASTY
            | M2_SHAPESHIFTER,
        M3_INFRAVISIBLE,
        12, CLR_RED, PM_VAMPIRE),
    MON(NAMS("vampire lord", "vampire lady", "vampire leader"), S_VAMPIRE,
        LVL(12, 14, 0, 50, -9), (G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 8), ATTK(AT_BITE, AD_DRLI, 1, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_VAMPIRE, MZ_HUMAN), MR_SLEEP | MR_POISON, 0,
        M1_FLY | M1_BREATHLESS | M1_HUMANOID | M1_POIS | M1_REGEN,
        M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_STRONG | M2_NASTY | M2_LORD
            | M2_SHAPESHIFTER,
        M3_INFRAVISIBLE,
        14, CLR_BLUE, PM_VAMPIRE_LEADER),
    MON(NAM("Vlad the Impaler"), S_VAMPIRE,
        LVL(28, 26, -6, 80, -10), (G_NOGEN | G_NOCORPSE | G_UNIQ),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 10), ATTK(AT_BITE, AD_DRLI, 1, 12),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_VAMPIRE, MZ_HUMAN), MR_SLEEP | MR_POISON, 0,
        M1_FLY | M1_BREATHLESS | M1_HUMANOID | M1_POIS | M1_REGEN,
        M2_NOPOLY | M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_PNAME | M2_STRONG
            | M2_NASTY | M2_PRINCE | M2_MALE | M2_SHAPESHIFTER,
        M3_WAITFORU | M3_WANTSCAND | M3_INFRAVISIBLE,
        32, HI_LORD, PM_VLAD_THE_IMPALER),
    /*
     * Wraiths
     */
    MON(NAM("barrow wight"), S_WRAITH,
        LVL(3, 12, 5, 5, -3), (G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_WEAP, AD_DRLI, 0, 0), ATTK(AT_MAGC, AD_SPEL, 0, 0),
          ATTK(AT_CLAW, AD_PHYS, 1, 4), ATTK(AT_TUCH, AD_COLD, 1, 4),
          NO_ATTK, NO_ATTK),
        SIZ(1200, 0, MS_SPELL, MZ_HUMAN), MR_COLD | MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_HUMANOID,
        M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_COLLECT, 0,
        8, CLR_GRAY, PM_BARROW_WIGHT),
    /* wraiths weigh 0 but can leave corpses */
    MON(NAM("wraith"), S_WRAITH,
        LVL(6, 12, 4, 15, -6), (G_GENO | 2),
        A(ATTK(AT_TUCH, AD_DRLI, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_ETHEREAL, 0, MS_SILENT, MZ_HUMAN),
        MR_COLD | MR_SLEEP | MR_POISON | MR_STONE, 0,
        M1_BREATHLESS | M1_FLY | M1_HUMANOID | M1_UNSOLID,
        M2_UNDEAD | M2_STALK | M2_HOSTILE, 0,
        8, CLR_BLACK, PM_WRAITH),
    MON(NAM("Nazgul"), S_WRAITH,
        LVL(13, 12, 0, 25, -17), (G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_WEAP, AD_DRLI, 1, 4), ATTK(AT_BREA, AD_SLEE, 2, 25),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 0, MS_SPELL, MZ_HUMAN), MR_COLD | MR_SLEEP | MR_POISON,
        0, M1_BREATHLESS | M1_HUMANOID | M1_SEE_INVIS,
        M2_NOPOLY | M2_UNDEAD | M2_STALK | M2_STRONG | M2_HOSTILE | M2_MALE
            | M2_COLLECT,
        0, 17, HI_LORD, PM_NAZGUL),
    /*
     * Xorn
     */
    MON(NAM("xorn"), S_XORN,
        LVL(8, 9, -2, 20, 0), (G_GENO | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 3), ATTK(AT_CLAW, AD_PHYS, 1, 3),
          ATTK(AT_CLAW, AD_PHYS, 1, 3), ATTK(AT_BITE, AD_PHYS, 4, 6),
          NO_ATTK, NO_ATTK),
        SIZ(1200, 700, MS_ROAR, MZ_MEDIUM), MR_FIRE | MR_COLD | MR_STONE,
        MR_STONE,
        M1_BREATHLESS | M1_WALLWALK | M1_THICK_HIDE | M1_METALLIVORE,
        M2_HOSTILE | M2_STRONG, 0,
        11, CLR_BROWN, PM_XORN),
    /*
     * Apelike beasts
     */
    /* tameable via banana; does not grow up into ape...
       not flagged as domestic, so no guilt penalty for eating non-pet one */
    MON(NAM("monkey"), S_YETI,
        LVL(2, 12, 6, 0, 0), (G_GENO | 1),
        A(ATTK(AT_CLAW, AD_SITM, 0, 0), ATTK(AT_BITE, AD_PHYS, 1, 3),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(100, 50, MS_GROWL, MZ_SMALL), 0, 0,
        M1_ANIMAL | M1_HUMANOID | M1_OMNIVORE, 0, M3_INFRAVISIBLE,
        4, CLR_GRAY, PM_MONKEY),
    MON(NAM("ape"), S_YETI,
        LVL(4, 12, 6, 0, 0), (G_GENO | G_SGROUP | 2),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 3), ATTK(AT_CLAW, AD_PHYS, 1, 3),
          ATTK(AT_BITE, AD_PHYS, 1, 6), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1100, 500, MS_GROWL, MZ_LARGE), 0, 0,
        M1_ANIMAL | M1_HUMANOID | M1_OMNIVORE, M2_STRONG, M3_INFRAVISIBLE,
        6, CLR_BROWN, PM_APE),
    MON(NAM("owlbear"), S_YETI,
        LVL(5, 12, 5, 0, 0), (G_GENO | 3),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 6), ATTK(AT_CLAW, AD_PHYS, 1, 6),
          ATTK(AT_HUGS, AD_PHYS, 2, 8), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1700, 700, MS_ROAR, MZ_LARGE), 0, 0,
        M1_ANIMAL | M1_HUMANOID | M1_CARNIVORE,
        M2_HOSTILE | M2_STRONG | M2_NASTY, M3_INFRAVISIBLE,
        7, CLR_BROWN, PM_OWLBEAR),
    MON(NAM("yeti"), S_YETI,
        LVL(5, 15, 6, 0, 0), (G_GENO | 2),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 6), ATTK(AT_CLAW, AD_PHYS, 1, 6),
          ATTK(AT_BITE, AD_PHYS, 1, 4), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1600, 700, MS_GROWL, MZ_LARGE), MR_COLD, MR_COLD,
        M1_ANIMAL | M1_HUMANOID | M1_CARNIVORE, M2_HOSTILE | M2_STRONG,
        M3_INFRAVISIBLE,
        7, CLR_WHITE, PM_YETI),
    MON(NAM("carnivorous ape"), S_YETI,
        LVL(6, 12, 6, 0, 0), (G_GENO | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 4), ATTK(AT_CLAW, AD_PHYS, 1, 4),
          ATTK(AT_HUGS, AD_PHYS, 1, 8), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1250, 550, MS_GROWL, MZ_LARGE), 0, 0,
        M1_ANIMAL | M1_HUMANOID | M1_CARNIVORE, M2_HOSTILE | M2_STRONG,
        M3_INFRAVISIBLE,
        8, CLR_BLACK, PM_CARNIVOROUS_APE),
    MON(NAM("sasquatch"), S_YETI,
        LVL(7, 15, 6, 0, 2), (G_GENO | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 6), ATTK(AT_CLAW, AD_PHYS, 1, 6),
          ATTK(AT_KICK, AD_PHYS, 1, 8), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1550, 750, MS_GROWL, MZ_LARGE), 0, 0,
        M1_ANIMAL | M1_HUMANOID | M1_SEE_INVIS | M1_OMNIVORE, M2_STRONG,
        M3_INFRAVISIBLE,
        9, CLR_GRAY, PM_SASQUATCH),
    /*
     * Zombies
     */
    MON(NAM("kobold zombie"), S_ZOMBIE,
        LVL(0, 6, 10, 0, -2), (G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(400, 50, MS_GROAN, MZ_SMALL), MR_COLD | MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
        M2_UNDEAD | M2_STALK | M2_HOSTILE, M3_INFRAVISION,
        1, CLR_BROWN, PM_KOBOLD_ZOMBIE),
    MON(NAM("gnome zombie"), S_ZOMBIE,
        LVL(1, 6, 10, 0, -2), (G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 5),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(650, 50, MS_GROAN, MZ_SMALL), MR_COLD | MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
        M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_GNOME, M3_INFRAVISION,
        2, CLR_BROWN, PM_GNOME_ZOMBIE),
    MON(NAM("orc zombie"), S_ZOMBIE,
        LVL(2, 6, 9, 0, -3), (G_GENO | G_SGROUP | G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(850, 75, MS_GROAN, MZ_HUMAN), MR_COLD | MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
        M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_ORC, M3_INFRAVISION,
        3, CLR_GRAY, PM_ORC_ZOMBIE),
    MON(NAM("dwarf zombie"), S_ZOMBIE,
        LVL(2, 6, 9, 0, -3), (G_GENO | G_SGROUP | G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(900, 150, MS_GROAN, MZ_HUMAN), MR_COLD | MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
        M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_DWARF, M3_INFRAVISION,
        3, CLR_RED, PM_DWARF_ZOMBIE),
    MON(NAM("elf zombie"), S_ZOMBIE,
        LVL(3, 6, 9, 0, -3), (G_GENO | G_SGROUP | G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 7),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_ELF, 175, MS_GROAN, MZ_HUMAN), MR_COLD | MR_SLEEP | MR_POISON,
        0, M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID,
        M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_ELF, M3_INFRAVISION,
        4, CLR_GREEN, PM_ELF_ZOMBIE),
    MON(NAM("human zombie"), S_ZOMBIE,
        LVL(4, 6, 8, 0, -3), (G_GENO | G_SGROUP | G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 200, MS_GROAN, MZ_HUMAN),
        MR_COLD | MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID,
        M2_UNDEAD | M2_STALK | M2_HOSTILE, M3_INFRAVISION,
        5, HI_DOMESTIC, PM_HUMAN_ZOMBIE),
    MON(NAM("ettin zombie"), S_ZOMBIE,
        LVL(6, 8, 6, 0, -4), (G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 10), ATTK(AT_CLAW, AD_PHYS, 1, 10),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1700, 250, MS_GROAN, MZ_HUGE), MR_COLD | MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID,
        M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_STRONG, M3_INFRAVISION,
        7, CLR_BLUE, PM_ETTIN_ZOMBIE),
    MON(NAM("ghoul"), S_ZOMBIE,
        LVL(3, 6, 10, 0, -2), (G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PLYS, 1, 2), ATTK(AT_CLAW, AD_PHYS, 1, 3),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(400, 50, MS_SILENT, MZ_SMALL), MR_COLD | MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS | M1_OMNIVORE,
        M2_UNDEAD | M2_WANDER | M2_HOSTILE, M3_INFRAVISION,
        5, CLR_BLACK, PM_GHOUL),
    MON(NAM("giant zombie"), S_ZOMBIE,
        LVL(8, 8, 6, 0, -4), (G_GENO | G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 2, 8), ATTK(AT_CLAW, AD_PHYS, 2, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2050, 375, MS_GROAN, MZ_HUGE), MR_COLD | MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID,
        M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_GIANT | M2_STRONG,
        M3_INFRAVISION,
        9, CLR_CYAN, PM_GIANT_ZOMBIE),
    MON(NAM("skeleton"), S_ZOMBIE,
        LVL(12, 8, 4, 0, 0), (G_NOCORPSE | G_NOGEN),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 6), ATTK(AT_TUCH, AD_SLOW, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(300, 5, MS_BONES, MZ_HUMAN),
        MR_COLD | MR_SLEEP | MR_POISON | MR_STONE, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_THICK_HIDE,
        M2_UNDEAD | M2_WANDER | M2_HOSTILE | M2_STRONG | M2_COLLECT
            | M2_NASTY,
        M3_INFRAVISION,
        14, CLR_WHITE, PM_SKELETON),
    /*
     * golems
     */
    MON(NAM("straw golem"), S_GOLEM,
        LVL(3, 12, 10, 0, 0), (G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 2), ATTK(AT_CLAW, AD_PHYS, 1, 2),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(400, 0, MS_SILENT, MZ_LARGE), MR_COLD | MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID, M2_HOSTILE | M2_NEUTER, 0,
        4, CLR_YELLOW, PM_STRAW_GOLEM),
    MON(NAM("paper golem"), S_GOLEM,
        LVL(3, 12, 10, 0, 0), (G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 3),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(400, 0, MS_SILENT, MZ_LARGE), MR_COLD | MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID, M2_HOSTILE | M2_NEUTER, 0,
        4, HI_PAPER, PM_PAPER_GOLEM),
    MON(NAM("rope golem"), S_GOLEM,
        LVL(4, 9, 8, 0, 0), (G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 4), ATTK(AT_CLAW, AD_PHYS, 1, 4),
          ATTK(AT_HUGS, AD_PHYS, 6, 1), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(450, 0, MS_SILENT, MZ_LARGE), MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID, M2_HOSTILE | M2_NEUTER, 0,
        6, CLR_BROWN, PM_ROPE_GOLEM),
    MON(NAM("gold golem"), S_GOLEM,
        LVL(5, 9, 6, 0, 0), (G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 2, 3), ATTK(AT_CLAW, AD_PHYS, 2, 3),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(450, 0, MS_SILENT, MZ_LARGE), MR_SLEEP | MR_POISON | MR_ACID, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_THICK_HIDE,
        M2_HOSTILE | M2_NEUTER, 0,
        6, HI_GOLD, PM_GOLD_GOLEM),
    MON(NAM("leather golem"), S_GOLEM,
        LVL(6, 6, 6, 0, 0), (G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 6), ATTK(AT_CLAW, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(800, 0, MS_SILENT, MZ_LARGE), MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID, M2_HOSTILE | M2_NEUTER, 0,
        7, HI_LEATHER, PM_LEATHER_GOLEM),
    MON(NAM("wood golem"), S_GOLEM,
        LVL(7, 3, 4, 0, 0), (G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 3, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(900, 0, MS_SILENT, MZ_LARGE), MR_COLD | MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_THICK_HIDE,
        M2_HOSTILE | M2_NEUTER, 0,
        8, HI_WOOD, PM_WOOD_GOLEM),
    MON(NAM("flesh golem"), S_GOLEM,
        LVL(9, 8, 9, 30, 0), (1),
        A(ATTK(AT_CLAW, AD_PHYS, 2, 8), ATTK(AT_CLAW, AD_PHYS, 2, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1400, 600, MS_SILENT, MZ_LARGE),
        MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON,
        MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID, M2_HOSTILE | M2_STRONG, 0,
        10, CLR_RED, PM_FLESH_GOLEM),
    MON(NAM("clay golem"), S_GOLEM,
        LVL(11, 7, 7, 40, 0), (G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 3, 10),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1550, 0, MS_SILENT, MZ_LARGE), MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_THICK_HIDE,
        M2_HOSTILE | M2_STRONG, 0,
        12, CLR_BROWN, PM_CLAY_GOLEM),
    MON(NAM("stone golem"), S_GOLEM,
        LVL(14, 6, 5, 50, 0), (G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 3, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1900, 0, MS_SILENT, MZ_LARGE), MR_SLEEP | MR_POISON | MR_STONE, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_THICK_HIDE,
        M2_HOSTILE | M2_STRONG, 0,
        15, CLR_GRAY, PM_STONE_GOLEM),
    MON(NAM("glass golem"), S_GOLEM,
        LVL(16, 6, 1, 50, 0), (G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 2, 8), ATTK(AT_CLAW, AD_PHYS, 2, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1800, 0, MS_SILENT, MZ_LARGE), MR_SLEEP | MR_POISON | MR_ACID, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_THICK_HIDE,
        M2_HOSTILE | M2_STRONG, 0,
        18, CLR_CYAN, PM_GLASS_GOLEM),
    MON(NAM("iron golem"), S_GOLEM,
        LVL(18, 6, 3, 60, 0), (G_NOCORPSE | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 4, 10), ATTK(AT_BREA, AD_DRST, 4, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2000, 0, MS_SILENT, MZ_LARGE),
        MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON, 0,
        M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_THICK_HIDE | M1_POIS,
        M2_HOSTILE | M2_STRONG | M2_COLLECT, 0,
        22, HI_METAL, PM_IRON_GOLEM),
    /*
     * humans, including elves and were-critters;
     *  the '@' class does not obey rule #2.
     *  Plain "human" is a placeholder, not a normal monster.
     */
    MON(NAM("human"), S_HUMAN, /* for corpses */
        LVL(0, 12, 10, 0, 0), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_HUMANOID, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
        M3_INFRAVISIBLE,
        2, HI_DOMESTIC, PM_HUMAN),
    MON(NAM("wererat"), S_HUMAN,
        LVL(2, 12, 10, 10, -7), (1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_WERE, MZ_HUMAN), MR_POISON, 0,
        M1_HUMANOID | M1_POIS | M1_REGEN | M1_OMNIVORE,
        M2_NOPOLY | M2_WERE | M2_HOSTILE | M2_HUMAN | M2_COLLECT,
        M3_INFRAVISIBLE,
        3, CLR_BROWN, PM_HUMAN_WERERAT),
    MON(NAM("werejackal"), S_HUMAN,
        LVL(2, 12, 10, 10, -7), (1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_WERE, MZ_HUMAN), MR_POISON, 0,
        M1_HUMANOID | M1_POIS | M1_REGEN | M1_OMNIVORE,
        M2_NOPOLY | M2_WERE | M2_HOSTILE | M2_HUMAN | M2_COLLECT,
        M3_INFRAVISIBLE,
        3, CLR_RED, PM_HUMAN_WEREJACKAL),
    MON(NAM("werewolf"), S_HUMAN,
        LVL(5, 12, 10, 20, -7), (1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_WERE, MZ_HUMAN), MR_POISON, 0,
        M1_HUMANOID | M1_POIS | M1_REGEN | M1_OMNIVORE,
        M2_NOPOLY | M2_WERE | M2_HOSTILE | M2_HUMAN | M2_COLLECT,
        M3_INFRAVISIBLE,
        6, CLR_ORANGE, PM_HUMAN_WEREWOLF),
    /* plain "elf" is a placeholder, not a normal monster */
    MON(NAM("elf"), S_HUMAN, /* for corpses */
        LVL(0, 12, 10, 2, -3), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_ELF, 350, MS_HUMANOID, MZ_HUMAN), MR_SLEEP, MR_SLEEP,
        M1_HUMANOID | M1_OMNIVORE | M1_SEE_INVIS,
        M2_NOPOLY | M2_ELF | M2_COLLECT,
        M3_INFRAVISION | M3_INFRAVISIBLE,
        1, HI_DOMESTIC, PM_ELF),
    MON(NAM("Woodland-elf"), S_HUMAN,
        LVL(4, 12, 10, 10, -5), (G_GENO | G_SGROUP | 2),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 4), NO_ATTK,
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_ELF, 350, MS_HUMANOID, MZ_HUMAN), MR_SLEEP, MR_SLEEP,
        M1_HUMANOID | M1_OMNIVORE | M1_SEE_INVIS, M2_ELF | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        6, CLR_GREEN, PM_WOODLAND_ELF),
    MON(NAM("Green-elf"), S_HUMAN,
        LVL(5, 12, 10, 10, -6), (G_GENO | G_SGROUP | 2),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_ELF, 350, MS_HUMANOID, MZ_HUMAN), MR_SLEEP, MR_SLEEP,
        M1_HUMANOID | M1_OMNIVORE | M1_SEE_INVIS, M2_ELF | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        7, CLR_BRIGHT_GREEN, PM_GREEN_ELF),
    MON(NAM("Grey-elf"), S_HUMAN,
        LVL(6, 12, 10, 10, -7), (G_GENO | G_SGROUP | 2),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_ELF, 350, MS_HUMANOID, MZ_HUMAN), MR_SLEEP, MR_SLEEP,
        M1_HUMANOID | M1_OMNIVORE | M1_SEE_INVIS, M2_ELF | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        8, CLR_GRAY, PM_GREY_ELF),
    MON(NAMS("elf-lord", "elf-lady", "elf-noble"), S_HUMAN,
        LVL(8, 12, 10, 20, -9), (G_GENO | G_SGROUP | 2),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 4), ATTK(AT_WEAP, AD_PHYS, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_ELF, 350, MS_HUMANOID, MZ_HUMAN), MR_SLEEP, MR_SLEEP,
        M1_HUMANOID | M1_OMNIVORE | M1_SEE_INVIS,
        M2_ELF | M2_STRONG | M2_LORD | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        11, CLR_BRIGHT_BLUE, PM_ELF_NOBLE),
    MON(NAMS("Elvenking", "Elvenqueen", "elven monarch"), S_HUMAN,
        LVL(9, 12, 10, 25, -10), (G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 4), ATTK(AT_WEAP, AD_PHYS, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_ELF, 350, MS_HUMANOID, MZ_HUMAN), MR_SLEEP, MR_SLEEP,
        M1_HUMANOID | M1_OMNIVORE | M1_SEE_INVIS,
        M2_ELF | M2_STRONG | M2_PRINCE | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        11, HI_LORD, PM_ELVEN_MONARCH),
    MON(NAM("doppelganger"), S_HUMAN,
        LVL(9, 12, 5, 20, 0), (G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 12),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_IMITATE, MZ_HUMAN), MR_SLEEP, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_HOSTILE | M2_STRONG | M2_COLLECT
            | M2_SHAPESHIFTER,
        M3_INFRAVISIBLE,
        11, HI_DOMESTIC, PM_DOPPELGANGER),
    /* 5.0: shopkeepers used to have speed 18, but if/when they were
       hasted they always got 2 moves per turn and had a tendency to move
       away from blocking the door and then move right back; since they
       might start with a potion of speed and drink that as soon as the
       hero gets close, once inside the shop the hero could have trouble
       getting out again; also, being slowed still guaranteed one move
       per turn; reduce their innate speed from 18 to 16 for a hasted
       speed of 22 rather than 24 and slowed speed of 11 rather than 12;
       they will still block the shop door, but not as tenaciously */
    MON(NAM("shopkeeper"), S_HUMAN,
        LVL(12, 16, 0, 50, 0), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 4, 4), ATTK(AT_WEAP, AD_PHYS, 4, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_SELL, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PEACEFUL
            | M2_STRONG | M2_COLLECT | M2_MAGIC,
        M3_INFRAVISIBLE,
        15, HI_DOMESTIC, PM_SHOPKEEPER),
    /* vault guard */
    MON(NAM("guard"), S_HUMAN,
        LVL(12, 12, 10, 40, 10), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 4, 10),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_GUARD, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_MERC | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
        M3_INFRAVISIBLE,
        14, CLR_BLUE, PM_GUARD),
    /* prisoner is used on some special levels */
    MON(NAM("prisoner"), S_HUMAN,
        LVL(12, 12, 10, 0, 0), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_DJINNI, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
        M3_INFRAVISIBLE | M3_CLOSE,
        14, HI_DOMESTIC, PM_PRISONER),
    /* the Oracle of Delphi doesn't move */
    MON(NAM("Oracle"), S_HUMAN,
        LVL(12, 0, 0, 50, 0), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_NONE, AD_MAGM, 0, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_ORACLE, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_FEMALE, M3_INFRAVISIBLE,
        13, HI_ZAP, PM_ORACLE),
    /* aligned priests always have the epri extension attached;
       individual instantiations should always have either ispriest
       or isminion set; role monster priests are separate (below) */
    MON(NAMS("priest", "priestess", "aligned cleric"), S_HUMAN,
        LVL(12, 12, 10, 50, 0), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 4, 10), ATTK(AT_KICK, AD_PHYS, 1, 4),
          ATTK(AT_MAGC, AD_CLRC, 0, 0), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_PRIEST, MZ_HUMAN), MR_ELEC, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_LORD | M2_PEACEFUL | M2_COLLECT,
        M3_INFRAVISIBLE,
        15, CLR_WHITE, PM_ALIGNED_CLERIC),
    /* high priests always have epri and always have ispriest set;
       they are flagged as unique even through they aren't */
    MON(NAMS("high priest", "high priestess", "high cleric"), S_HUMAN,
        LVL(25, 15, 7, 70, 0), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_WEAP, AD_PHYS, 4, 10), ATTK(AT_KICK, AD_PHYS, 2, 8),
          ATTK(AT_MAGC, AD_CLRC, 2, 8), ATTK(AT_MAGC, AD_CLRC, 2, 8),
          NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_PRIEST, MZ_HUMAN),
        MR_FIRE | MR_ELEC | MR_SLEEP | MR_POISON, 0,
        M1_HUMANOID | M1_SEE_INVIS | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_MINION | M2_PRINCE | M2_NASTY | M2_COLLECT
            | M2_MAGIC,
        M3_INFRAVISIBLE,
        30, CLR_WHITE, PM_HIGH_CLERIC),
    MON(NAM("soldier"), S_HUMAN,
        LVL(6, 10, 10, 0, -2), (G_SGROUP | G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_SOLDIER, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE, M2_NOPOLY | M2_HUMAN | M2_MERC | M2_STALK
                                       | M2_HOSTILE | M2_STRONG | M2_COLLECT,
        M3_INFRAVISIBLE,
        8, CLR_GRAY, PM_SOLDIER),
    MON(NAM("sergeant"), S_HUMAN,
        LVL(8, 10, 10, 5, -3), (G_SGROUP | G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_SOLDIER, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE, M2_NOPOLY | M2_HUMAN | M2_MERC | M2_STALK
                                       | M2_HOSTILE | M2_STRONG | M2_COLLECT,
        M3_INFRAVISIBLE,
        10, CLR_RED, PM_SERGEANT),
    MON(NAM("nurse"), S_HUMAN,
        LVL(11, 6, 0, 0, 0), (G_GENO | 3),
        A(ATTK(AT_CLAW, AD_HEAL, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_NURSE, MZ_HUMAN), MR_POISON, MR_POISON,
        M1_HUMANOID | M1_OMNIVORE, M2_NOPOLY | M2_HUMAN | M2_HOSTILE,
        M3_INFRAVISIBLE,
        13, HI_DOMESTIC, PM_NURSE),
    MON(NAM("lieutenant"), S_HUMAN,
        LVL(10, 10, 10, 15, -4), (G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 3, 4), ATTK(AT_WEAP, AD_PHYS, 3, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_SOLDIER, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE, M2_NOPOLY | M2_HUMAN | M2_MERC | M2_STALK
                                       | M2_HOSTILE | M2_STRONG | M2_COLLECT,
        M3_INFRAVISIBLE,
        12, CLR_GREEN, PM_LIEUTENANT),
    MON(NAM("captain"), S_HUMAN,
        LVL(12, 10, 10, 15, -5), (G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 4, 4), ATTK(AT_WEAP, AD_PHYS, 4, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_SOLDIER, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE, M2_NOPOLY | M2_HUMAN | M2_MERC | M2_STALK
                                       | M2_HOSTILE | M2_STRONG | M2_COLLECT,
        M3_INFRAVISIBLE,
        14, CLR_BLUE, PM_CAPTAIN),
    MON(NAM("watchman"), S_HUMAN,
        LVL(6, 10, 10, 0, -2), (G_SGROUP | G_NOGEN | G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_SOLDIER, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE, M2_NOPOLY | M2_HUMAN | M2_MERC | M2_STALK
                                       | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
        M3_INFRAVISIBLE,
        8, CLR_GRAY, PM_WATCHMAN),
    MON(NAM("watch captain"), S_HUMAN,
        LVL(10, 10, 10, 15, -4), (G_NOGEN | G_GENO | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 3, 4), ATTK(AT_WEAP, AD_PHYS, 3, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_SOLDIER, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE, M2_NOPOLY | M2_HUMAN | M2_MERC | M2_STALK
                                       | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
        M3_INFRAVISIBLE,
        12, CLR_GREEN, PM_WATCH_CAPTAIN),
    /* Unique humans not tied to quests.
     */
    MON(NAM("Medusa"), S_HUMAN,
        LVL(20, 12, 2, 50, -15), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 4), ATTK(AT_CLAW, AD_PHYS, 1, 8),
          ATTK(AT_GAZE, AD_STON, 0, 0), ATTK(AT_BITE, AD_DRST, 1, 6),
          NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_HISS, MZ_LARGE),
        MR_POISON | MR_STONE, MR_POISON | MR_STONE,
        M1_FLY | M1_SWIM | M1_AMPHIBIOUS | M1_HUMANOID | M1_POIS | M1_OMNIVORE,
        M2_NOPOLY | M2_HOSTILE | M2_STRONG | M2_PNAME | M2_FEMALE,
        M3_WAITFORU | M3_INFRAVISIBLE,
        25, CLR_BRIGHT_GREEN, PM_MEDUSA),
    MON(NAM("Wizard of Yendor"), S_HUMAN,
        LVL(30, 12, -8, 100, A_NONE), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_CLAW, AD_SAMU, 2, 12), ATTK(AT_MAGC, AD_SPEL, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_CUSS, MZ_HUMAN), MR_FIRE | MR_POISON,
        MR_FIRE | MR_POISON,
        M1_FLY | M1_BREATHLESS | M1_HUMANOID | M1_REGEN | M1_SEE_INVIS
            | M1_TPORT | M1_TPORT_CNTRL | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_HOSTILE | M2_STRONG | M2_NASTY | M2_PRINCE
            | M2_MALE | M2_MAGIC,
        M3_COVETOUS | M3_WAITFORU | M3_INFRAVISIBLE,
        34, HI_OVERLORD, PM_WIZARD_OF_YENDOR),
    MON(NAM("Croesus"), S_HUMAN,
        LVL(20, 15, 0, 40, 15), (G_UNIQ | G_NOGEN),
        A(ATTK(AT_WEAP, AD_PHYS, 4, 10),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_GUARD, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_SEE_INVIS | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_STALK | M2_HOSTILE | M2_STRONG | M2_NASTY
            | M2_PNAME | M2_PRINCE | M2_MALE | M2_GREEDY | M2_JEWELS
            | M2_COLLECT | M2_MAGIC,
        M3_INFRAVISIBLE,
        22, HI_LORD, PM_CROESUS),
    /*
     * ghosts
     *  ghosts and shades don't leave corpses; assigning human weight
     *  to them matters for statues
     */
    MON(NAM("ghost"), S_GHOST,
        LVL(10, 3, -5, 50, -5), (G_NOCORPSE | G_NOGEN),
        A(ATTK(AT_TUCH, AD_PHYS, 1, 1),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 0, MS_SILENT, MZ_HUMAN),
        MR_COLD | MR_DISINT | MR_SLEEP | MR_POISON | MR_STONE, 0,
        M1_FLY | M1_BREATHLESS | M1_WALLWALK | M1_HUMANOID | M1_UNSOLID,
        M2_NOPOLY | M2_UNDEAD | M2_STALK | M2_HOSTILE, M3_INFRAVISION,
        12, CLR_GRAY, PM_GHOST),
    MON(NAM("shade"), S_GHOST,
        LVL(12, 10, 10, 0, 0), (G_NOCORPSE | G_NOGEN),
        A(ATTK(AT_TUCH, AD_PLYS, 2, 6), ATTK(AT_TUCH, AD_SLOW, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 0, MS_WAIL, MZ_HUMAN),
        MR_COLD | MR_DISINT | MR_SLEEP | MR_POISON | MR_STONE, 0,
        M1_FLY | M1_BREATHLESS | M1_WALLWALK | M1_HUMANOID | M1_UNSOLID
            | M1_SEE_INVIS,
        M2_NOPOLY | M2_UNDEAD | M2_WANDER | M2_STALK | M2_HOSTILE | M2_NASTY,
        M3_INFRAVISION,
        14, CLR_BLACK, PM_SHADE),
    /*
     * (major) demons
     */
    MON(NAM("water demon"), S_DEMON,
        LVL(8, 12, -4, 30, -7), (G_NOCORPSE | G_NOGEN),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 3), ATTK(AT_CLAW, AD_PHYS, 1, 3),
          ATTK(AT_BITE, AD_PHYS, 1, 3), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_DJINNI, MZ_HUMAN), MR_FIRE | MR_POISON, 0,
        M1_HUMANOID | M1_POIS | M1_SWIM,
        M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        11, CLR_BLUE, PM_WATER_DEMON),
    /* standard demons & devils
     */


    /* incubus and succubus; prior to 5.0, succubus and incubus were
       distinct monsters; "amorous demon" is considered to be a temporary
       placeholder but may be here to stay... */
    MON(NAMS("incubus", "succubus", "amorous demon"), S_DEMON,
        LVL(6, 12, 0, 70, -9), (G_NOCORPSE | 1),
        SEDUCTION_ATTACKS_YES,
        SIZ(WT_HUMAN, 400, MS_SEDUCE, MZ_HUMAN),
        MR_FIRE | MR_POISON, 0, M1_HUMANOID | M1_FLY | M1_POIS,
        M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        8, CLR_GRAY, PM_AMOROUS_DEMON),
    MON(NAM("horned devil"), S_DEMON,
        LVL(6, 9, -5, 50, 11), (G_HELL | G_NOCORPSE | 2),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 4), ATTK(AT_CLAW, AD_PHYS, 1, 4),
          ATTK(AT_BITE, AD_PHYS, 2, 3), ATTK(AT_STNG, AD_PHYS, 1, 3),
          NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_SILENT, MZ_HUMAN), MR_FIRE | MR_POISON, 0,
        M1_POIS | M1_THICK_HIDE, M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        9, CLR_BROWN, PM_HORNED_DEVIL),
    /* Used by AD&D for a type of demon, originally one of the Furies
       and spelled this way; plural is erinyes */
    MON(NAM("erinys"), S_DEMON,
        LVL(7, 12, 2, 30, 10), (G_HELL | G_NOCORPSE | G_SGROUP | 2),
        /* erinys attacks (among other things) are variable depending on your
           alignment abuse, can be increased from here by adj_erinys(mon.c) */
        A(ATTK(AT_WEAP, AD_DRST, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_SILENT, MZ_HUMAN), MR_FIRE | MR_POISON, 0,
        M1_HUMANOID | M1_POIS,
        M2_NOPOLY | M2_DEMON | M2_STALK | M2_STRONG | M2_NASTY | M2_FEMALE
            | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        10, CLR_RED, PM_ERINYS),
    MON(NAM("barbed devil"), S_DEMON,
        LVL(8, 12, 0, 35, 8), (G_HELL | G_NOCORPSE | G_SGROUP | 2),
        A(ATTK(AT_CLAW, AD_PHYS, 2, 4), ATTK(AT_CLAW, AD_STCK, 2, 4),
          ATTK(AT_STNG, AD_PHYS, 3, 4), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_SILENT, MZ_HUMAN), MR_FIRE | MR_POISON, 0,
        M1_POIS | M1_THICK_HIDE, M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        11, CLR_RED, PM_BARBED_DEVIL),
    MON(NAM("marilith"), S_DEMON,
        LVL(7, 12, -6, 80, -12), (G_HELL | G_NOCORPSE | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 4), ATTK(AT_WEAP, AD_PHYS, 2, 4),
          ATTK(AT_CLAW, AD_PHYS, 2, 4), ATTK(AT_CLAW, AD_PHYS, 2, 4),
          ATTK(AT_CLAW, AD_PHYS, 2, 4), ATTK(AT_CLAW, AD_PHYS, 2, 4)),
        SIZ(WT_HUMAN, 400, MS_CUSS, MZ_LARGE), MR_FIRE | MR_POISON, 0,
        M1_HUMANOID | M1_SLITHY | M1_SEE_INVIS | M1_POIS,
        M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY | M2_FEMALE | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        11, CLR_RED, PM_MARILITH),
    MON(NAM("vrock"), S_DEMON,
        LVL(8, 12, 0, 50, -9), (G_HELL | G_NOCORPSE | G_SGROUP | 2),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 4), ATTK(AT_CLAW, AD_PHYS, 1, 4),
          ATTK(AT_CLAW, AD_PHYS, 1, 8), ATTK(AT_CLAW, AD_PHYS, 1, 8),
          ATTK(AT_BITE, AD_PHYS, 1, 6), NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_SILENT, MZ_LARGE), MR_FIRE | MR_POISON, 0,
        M1_POIS, M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        11, CLR_GREEN, PM_VROCK),
    MON(NAM("hezrou"), S_DEMON,
        LVL(9, 6, -2, 55, -10), (G_HELL | G_NOCORPSE | G_SGROUP | 2),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 3), ATTK(AT_CLAW, AD_PHYS, 1, 3),
          ATTK(AT_BITE, AD_PHYS, 4, 4), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_SILENT, MZ_LARGE), MR_FIRE | MR_POISON, 0,
        M1_HUMANOID | M1_POIS, M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        12, CLR_GREEN, PM_HEZROU),
    MON(NAM("bone devil"), S_DEMON,
        LVL(9, 15, -1, 40, -9), (G_HELL | G_NOCORPSE | G_SGROUP | 2),
        A(ATTK(AT_WEAP, AD_PHYS, 3, 4), ATTK(AT_STNG, AD_DRST, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_SILENT, MZ_LARGE), MR_FIRE | MR_POISON, 0,
        M1_POIS, M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        13, CLR_GRAY, PM_BONE_DEVIL),
    MON(NAM("ice devil"), S_DEMON,
        LVL(11, 6, -4, 55, -12), (G_HELL | G_NOCORPSE | 2),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 4), ATTK(AT_CLAW, AD_PHYS, 1, 4),
          ATTK(AT_BITE, AD_PHYS, 2, 4), ATTK(AT_STNG, AD_COLD, 3, 4),
          ATTK(AT_TUCH, AD_SLOW, 1, 1), NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_SILENT, MZ_LARGE),
        MR_FIRE | MR_COLD | MR_POISON, 0, M1_SEE_INVIS | M1_POIS,
        M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        15, CLR_WHITE, PM_ICE_DEVIL),
    MON(NAM("nalfeshnee"), S_DEMON,
        LVL(11, 9, -1, 65, -11), (G_HELL | G_NOCORPSE | 1),
        A(ATTK(AT_CLAW, AD_PHYS, 1, 4), ATTK(AT_CLAW, AD_PHYS, 1, 4),
          ATTK(AT_BITE, AD_PHYS, 2, 4), ATTK(AT_MAGC, AD_SPEL, 0, 0),
          NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_SPELL, MZ_LARGE), MR_FIRE | MR_POISON, 0,
        M1_HUMANOID | M1_POIS, M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        15, CLR_RED, PM_NALFESHNEE),
    MON(NAM("pit fiend"), S_DEMON,
        LVL(13, 6, -3, 65, -13), (G_HELL | G_NOCORPSE | 2),
        A(ATTK(AT_WEAP, AD_PHYS, 4, 2), ATTK(AT_WEAP, AD_PHYS, 4, 2),
          ATTK(AT_HUGS, AD_PHYS, 2, 4), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_GROWL, MZ_LARGE), MR_FIRE | MR_POISON, 0,
        M1_SEE_INVIS | M1_POIS,
        M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        16, CLR_RED, PM_PIT_FIEND),
    /* from Jack Vance's _Rhialto_the_Marvellous_, one of the sequels
       to _The_Dying_Earth_ */
    MON(NAM("sandestin"), S_DEMON,
        LVL(13, 12, 4, 60, -5), (G_HELL | G_NOCORPSE | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 6), ATTK(AT_WEAP, AD_PHYS, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1500, 400, MS_CUSS, MZ_HUMAN), MR_STONE, 0, M1_HUMANOID,
        M2_NOPOLY | M2_STALK | M2_STRONG | M2_COLLECT | M2_SHAPESHIFTER,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        15, CLR_GRAY, PM_SANDESTIN),
    MON(NAM("balrog"), S_DEMON,
        LVL(16, 5, -2, 75, -14), (G_HELL | G_NOCORPSE | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 8, 4), ATTK(AT_WEAP, AD_PHYS, 4, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_SILENT, MZ_LARGE), MR_FIRE | MR_POISON, 0,
        M1_FLY | M1_SEE_INVIS | M1_POIS,
        M2_DEMON | M2_STALK | M2_HOSTILE | M2_STRONG | M2_NASTY | M2_COLLECT,
        M3_INFRAVISIBLE | M3_INFRAVISION,
        20, CLR_RED, PM_BALROG),
    /* Named demon lords & princes plus Arch-Devils.
     * (their order matters; see minion.c)
     */
    MON(NAM("Juiblex"), S_DEMON, LVL(50, 3, -7, 65, -15),
        (G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ),
        A(ATTK(AT_ENGL, AD_DISE, 4, 10), ATTK(AT_SPIT, AD_ACID, 3, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1500, 0, MS_GURGLE, MZ_LARGE),
        MR_FIRE | MR_POISON | MR_ACID | MR_STONE, 0,
        M1_AMPHIBIOUS | M1_AMORPHOUS | M1_NOHEAD | M1_FLY | M1_SEE_INVIS
            | M1_ACID | M1_POIS,
        M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_NASTY
            | M2_LORD | M2_MALE,
        M3_WAITFORU | M3_WANTSAMUL | M3_INFRAVISION,
        26, CLR_BRIGHT_GREEN, PM_JUIBLEX),
    MON(NAM("Yeenoghu"), S_DEMON,
        LVL(56, 18, -5, 80, -15), (G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ),
        A(ATTK(AT_WEAP, AD_PHYS, 3, 6), ATTK(AT_WEAP, AD_CONF, 2, 8),
          ATTK(AT_CLAW, AD_PLYS, 1, 6), ATTK(AT_MAGC, AD_MAGM, 2, 6),
          NO_ATTK, NO_ATTK),
        SIZ(900, 500, MS_ORC, MZ_LARGE), MR_FIRE | MR_POISON, 0,
        M1_FLY | M1_SEE_INVIS | M1_POIS,
        M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_NASTY
            | M2_LORD | M2_MALE | M2_COLLECT,
        M3_WANTSAMUL | M3_INFRAVISIBLE | M3_INFRAVISION,
        31, HI_LORD, PM_YEENOGHU),
    MON(NAM("Orcus"), S_DEMON,
        LVL(66, 9, -6, 85, -20), (G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ),
        A(ATTK(AT_WEAP, AD_PHYS, 3, 6), ATTK(AT_CLAW, AD_PHYS, 3, 4),
          ATTK(AT_CLAW, AD_PHYS, 3, 4), ATTK(AT_MAGC, AD_SPEL, 8, 6),
          ATTK(AT_STNG, AD_DRST, 2, 4), NO_ATTK),
        SIZ(1500, 500, MS_ORC, MZ_HUGE), MR_FIRE | MR_POISON, 0,
        M1_FLY | M1_SEE_INVIS | M1_POIS,
        M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_NASTY
            | M2_PRINCE | M2_MALE | M2_COLLECT,
        M3_WAITFORU | M3_WANTSBOOK | M3_WANTSAMUL | M3_INFRAVISIBLE
            | M3_INFRAVISION,
        36, HI_LORD, PM_ORCUS),
    MON(NAM("Geryon"), S_DEMON,
        LVL(72, 3, -3, 75, 15), (G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ),
        A(ATTK(AT_CLAW, AD_PHYS, 3, 6), ATTK(AT_CLAW, AD_PHYS, 3, 6),
          ATTK(AT_STNG, AD_DRST, 2, 4), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1500, 500, MS_BRIBE, MZ_HUGE), MR_FIRE | MR_POISON, 0,
        M1_FLY | M1_SEE_INVIS | M1_POIS | M1_SLITHY,
        M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_NASTY
            | M2_PRINCE | M2_MALE,
        M3_WANTSAMUL | M3_INFRAVISIBLE | M3_INFRAVISION,
        36, HI_LORD, PM_GERYON),
    MON(NAM("Dispater"), S_DEMON,
        LVL(78, 15, -2, 80, 15), (G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ),
        A(ATTK(AT_WEAP, AD_PHYS, 4, 6), ATTK(AT_MAGC, AD_SPEL, 6, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1500, 500, MS_BRIBE, MZ_HUMAN), MR_FIRE | MR_POISON, 0,
        M1_FLY | M1_SEE_INVIS | M1_POIS | M1_HUMANOID,
        M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_NASTY
            | M2_PRINCE | M2_MALE | M2_COLLECT,
        M3_WANTSAMUL | M3_INFRAVISIBLE | M3_INFRAVISION,
        40, HI_LORD, PM_DISPATER),
    MON(NAM("Baalzebub"), S_DEMON,
        LVL(89, 9, -5, 85, 20), (G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ),
        A(ATTK(AT_BITE, AD_DRST, 2, 6), ATTK(AT_GAZE, AD_STUN, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1500, 500, MS_BRIBE, MZ_LARGE), MR_FIRE | MR_POISON, 0,
        M1_FLY | M1_SEE_INVIS | M1_POIS,
        M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_NASTY
            | M2_PRINCE | M2_MALE,
        M3_WANTSAMUL | M3_WAITFORU | M3_INFRAVISIBLE | M3_INFRAVISION,
        45, HI_LORD, PM_BAALZEBUB),
    MON(NAM("Asmodeus"), S_DEMON,
        LVL(105, 12, -7, 90, 20), (G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ),
        A(ATTK(AT_CLAW, AD_PHYS, 4, 4), ATTK(AT_MAGC, AD_COLD, 6, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1500, 500, MS_BRIBE, MZ_HUGE), MR_FIRE | MR_COLD | MR_POISON, 0,
        M1_FLY | M1_SEE_INVIS | M1_HUMANOID | M1_POIS,
        M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_STRONG
            | M2_NASTY | M2_PRINCE | M2_MALE,
        M3_WANTSAMUL | M3_WAITFORU | M3_INFRAVISIBLE | M3_INFRAVISION,
        53, HI_LORD, PM_ASMODEUS),
    MON(NAM("Demogorgon"), S_DEMON,
        LVL(106, 15, -8, 95, -20), (G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ),
        A(ATTK(AT_MAGC, AD_SPEL, 8, 6), ATTK(AT_STNG, AD_DRLI, 1, 4),
          ATTK(AT_CLAW, AD_DISE, 1, 6), ATTK(AT_CLAW, AD_DISE, 1, 6),
          NO_ATTK, NO_ATTK),
        SIZ(1500, 500, MS_GROWL, MZ_HUGE), MR_FIRE | MR_POISON, 0,
        M1_FLY | M1_SEE_INVIS | M1_NOHANDS | M1_POIS,
        M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_NASTY
            | M2_PRINCE | M2_MALE,
        M3_WANTSAMUL | M3_INFRAVISIBLE | M3_INFRAVISION,
        57, HI_LORD, PM_DEMOGORGON),
    /* Riders -- the Four Horsemen of the Apocalypse ("War" == player);
     * depicted with '&' but do not have M2_DEMON set.
     */
    MON(NAM("Death"), S_DEMON,
        LVL(30, 12, -5, 100, 0), (G_UNIQ | G_NOGEN),
        A(ATTK(AT_TUCH, AD_DETH, 8, 8), ATTK(AT_TUCH, AD_DETH, 8, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 1, MS_RIDER, MZ_HUMAN),
        MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON | MR_STONE, 0,
        M1_FLY | M1_HUMANOID | M1_REGEN | M1_SEE_INVIS | M1_TPORT_CNTRL,
        M2_NOPOLY | M2_STALK | M2_HOSTILE | M2_PNAME | M2_STRONG | M2_NASTY,
        M3_INFRAVISIBLE | M3_INFRAVISION | M3_DISPLACES,
        34, HI_OVERLORD, PM_DEATH),
    MON(NAM("Pestilence"), S_DEMON,
        LVL(30, 12, -5, 100, 0), (G_UNIQ | G_NOGEN),
        A(ATTK(AT_TUCH, AD_PEST, 8, 8), ATTK(AT_TUCH, AD_PEST, 8, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 1, MS_RIDER, MZ_HUMAN),
        MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON | MR_STONE, 0,
        M1_FLY | M1_HUMANOID | M1_REGEN | M1_SEE_INVIS | M1_TPORT_CNTRL,
        M2_NOPOLY | M2_STALK | M2_HOSTILE | M2_PNAME | M2_STRONG | M2_NASTY,
        M3_INFRAVISIBLE | M3_INFRAVISION | M3_DISPLACES,
        34, HI_OVERLORD, PM_PESTILENCE),
    MON(NAM("Famine"), S_DEMON,
        LVL(30, 12, -5, 100, 0), (G_UNIQ | G_NOGEN),
        A(ATTK(AT_TUCH, AD_FAMN, 8, 8), ATTK(AT_TUCH, AD_FAMN, 8, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 1, MS_RIDER, MZ_HUMAN),
        MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON | MR_STONE, 0,
        M1_FLY | M1_HUMANOID | M1_REGEN | M1_SEE_INVIS | M1_TPORT_CNTRL,
        M2_NOPOLY | M2_STALK | M2_HOSTILE | M2_PNAME | M2_STRONG | M2_NASTY,
        M3_INFRAVISIBLE | M3_INFRAVISION | M3_DISPLACES,
        34, HI_OVERLORD, PM_FAMINE),
    /* other demons
     */
    MON(NAM("mail daemon"), S_DEMON,
        LVL(56, 24, 10, 127, 0), (G_NOGEN | G_NOCORPSE),
        A(NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(600, 300, MS_SILENT, MZ_HUMAN),
        MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON | MR_STONE, 0,
        M1_FLY | M1_SWIM | M1_BREATHLESS | M1_SEE_INVIS | M1_HUMANOID
            | M1_POIS,
        M2_NOPOLY | M2_STALK | M2_PEACEFUL, M3_INFRAVISIBLE | M3_INFRAVISION,
        26, CLR_BRIGHT_BLUE, PM_MAIL_DAEMON),
    /* djinni is singular; plural is djinn */
    MON(NAM("djinni"), S_DEMON,
        LVL(7, 12, 4, 30, 0), (G_NOGEN | G_NOCORPSE),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1500, 400, MS_DJINNI, MZ_HUMAN), MR_POISON | MR_STONE, 0,
        M1_HUMANOID | M1_FLY | M1_POIS, M2_NOPOLY | M2_STALK | M2_COLLECT,
        M3_INFRAVISIBLE, 8, CLR_YELLOW, PM_DJINNI),
    /*
     * sea monsters
     *
     * 5.0: all the fish except kraken used to specify M1_SLITHY, presumably
     * cloned from giant eel.  Using "slither" to describe their movement
     * wasn't appropriate.  Unfortunately, locomotion() isn't able to choose
     * "swim" as their movement description because it is only passed a
     * monster type, not a specific monster (for <mx,my>) or the relevant
     * location, and therefore doesn't know whether water is involved.
     */
    MON(NAM("jellyfish"), S_EEL,
        LVL(3, 3, 6, 0, 0), (G_GENO | G_NOGEN),
        A(ATTK(AT_STNG, AD_DRST, 3, 3),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(80, 20, MS_SILENT, MZ_SMALL), MR_POISON, MR_POISON,
        M1_SWIM | M1_AMPHIBIOUS | M1_NOLIMBS | M1_NOHEAD
            | M1_NOTAKE | M1_POIS, M2_HOSTILE, 0,
        5, CLR_BLUE, PM_JELLYFISH),
    MON(NAM("piranha"), S_EEL,
        LVL(5, 18, 4, 0, 0), (G_GENO | G_NOGEN | G_SGROUP),
        A(ATTK(AT_BITE, AD_PHYS, 2, 6), ATTK(AT_BITE, AD_PHYS, 2, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(60, 30, MS_SILENT, MZ_SMALL), 0, 0,
        M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_NOLIMBS
            | M1_CARNIVORE | M1_OVIPAROUS | M1_NOTAKE, M2_HOSTILE, 0,
        7, CLR_RED, PM_PIRANHA),
    MON(NAM("shark"), S_EEL,
        LVL(7, 12, 2, 0, 0), (G_GENO | G_NOGEN),
        A(ATTK(AT_BITE, AD_PHYS, 5, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(500, 350, MS_SILENT, MZ_LARGE), 0, 0,
        M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_NOLIMBS
            | M1_CARNIVORE | M1_OVIPAROUS | M1_THICK_HIDE | M1_NOTAKE,
        M2_HOSTILE, 0,
        9, CLR_GRAY, PM_SHARK),
    MON(NAM("giant eel"), S_EEL,
        LVL(5, 9, -1, 0, 0), (G_GENO | G_NOGEN),
        A(ATTK(AT_BITE, AD_PHYS, 3, 6), ATTK(AT_TUCH, AD_WRAP, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(200, 250, MS_SILENT, MZ_HUGE), 0, 0,
        M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_SLITHY | M1_NOLIMBS
            | M1_CARNIVORE | M1_OVIPAROUS | M1_NOTAKE,
        M2_HOSTILE, M3_INFRAVISIBLE,
        7, CLR_CYAN, PM_GIANT_EEL),
    MON(NAM("electric eel"), S_EEL,
        LVL(7, 10, -3, 0, 0), (G_GENO | G_NOGEN),
        A(ATTK(AT_BITE, AD_ELEC, 4, 6), ATTK(AT_TUCH, AD_WRAP, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(200, 250, MS_SILENT, MZ_HUGE), MR_ELEC, MR_ELEC,
        M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_SLITHY | M1_NOLIMBS
            | M1_CARNIVORE | M1_OVIPAROUS | M1_NOTAKE,
        M2_HOSTILE, M3_INFRAVISIBLE,
        10, CLR_BRIGHT_BLUE, PM_ELECTRIC_EEL),
    MON(NAM("kraken"), S_EEL,
        LVL(20, 3, 6, 0, -3), (G_GENO | G_NOGEN),
        A(ATTK(AT_CLAW, AD_PHYS, 2, 4), ATTK(AT_CLAW, AD_PHYS, 2, 4),
          ATTK(AT_HUGS, AD_WRAP, 2, 6), ATTK(AT_BITE, AD_PHYS, 5, 4),
          NO_ATTK, NO_ATTK),
        SIZ(1800, 1000, MS_SILENT, MZ_HUGE), 0, 0,
        M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
        M2_NOPOLY | M2_HOSTILE | M2_STRONG, M3_INFRAVISIBLE,
        22, CLR_RED, PM_KRAKEN),
    /*
     * lizards, &c
     */
    MON(NAM("newt"), S_LIZARD,
        LVL(0, 6, 8, 0, 0), (G_GENO | 5),
        A(ATTK(AT_BITE, AD_PHYS, 1, 2),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(10, 20, MS_SILENT, MZ_TINY), 0, 0,
        M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
        M2_HOSTILE, 0,
        1, CLR_YELLOW, PM_NEWT),
    MON(NAM("gecko"), S_LIZARD,
        LVL(1, 6, 8, 0, 0), (G_GENO | 5),
        A(ATTK(AT_BITE, AD_PHYS, 1, 3),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(10, 20, MS_SQEEK, MZ_TINY), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_HOSTILE, 0,
        2, CLR_GREEN, PM_GECKO),
    MON(NAM("iguana"), S_LIZARD,
        LVL(2, 6, 7, 0, 0), (G_GENO | 5),
        A(ATTK(AT_BITE, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(30, 30, MS_SILENT, MZ_TINY), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_HOSTILE, 0,
        3, CLR_BROWN, PM_IGUANA),
    MON(NAM("baby crocodile"), S_LIZARD,
        LVL(3, 6, 7, 0, 0), G_GENO,
        A(ATTK(AT_BITE, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(200, 200, MS_CHIRP, MZ_MEDIUM), 0, 0,
        M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
        M2_HOSTILE, 0,
        4, CLR_BROWN, PM_BABY_CROCODILE),
    /* trivia:  before monster corpses were implemented, "lizard corpse"
       was a specific type of item */
    MON(NAM("lizard"), S_LIZARD,
        LVL(5, 6, 6, 10, 0), (G_GENO | 5),
        A(ATTK(AT_BITE, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(10, 40, MS_SILENT, MZ_TINY), MR_STONE, MR_STONE,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE, M2_HOSTILE, 0,
        6, CLR_GREEN, PM_LIZARD),
    MON(NAM("chameleon"), S_LIZARD,
        LVL(6, 5, 6, 10, 0), (G_GENO | 2),
        A(ATTK(AT_BITE, AD_PHYS, 4, 2),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(100, 100, MS_SILENT, MZ_TINY), 0, 0,
        M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
        M2_NOPOLY | M2_HOSTILE | M2_SHAPESHIFTER, 0,
        7, CLR_BROWN, PM_CHAMELEON),
    MON(NAM("crocodile"), S_LIZARD,
        LVL(6, 9, 5, 0, 0), (G_GENO | 1),
        A(ATTK(AT_BITE, AD_PHYS, 4, 2), ATTK(AT_CLAW, AD_PHYS, 1, 12),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_BELLOW, MZ_LARGE), 0, 0,
        M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_THICK_HIDE | M1_NOHANDS
            | M1_OVIPAROUS | M1_CARNIVORE,
        M2_STRONG | M2_HOSTILE, 0,
        7, CLR_BROWN, PM_CROCODILE),
    MON(NAM("salamander"), S_LIZARD,
        LVL(8, 12, -1, 0, -9), (G_HELL | 1),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 8), ATTK(AT_TUCH, AD_FIRE, 1, 6),
          ATTK(AT_HUGS, AD_PHYS, 2, 6), ATTK(AT_HUGS, AD_FIRE, 3, 6),
          NO_ATTK, NO_ATTK),
        SIZ(1500, 400, MS_MUMBLE, MZ_HUMAN), MR_SLEEP | MR_FIRE, MR_FIRE,
        M1_HUMANOID | M1_SLITHY | M1_THICK_HIDE | M1_POIS,
        M2_STALK | M2_HOSTILE | M2_COLLECT | M2_MAGIC, M3_INFRAVISIBLE,
        12, CLR_ORANGE, PM_SALAMANDER),

    /*
     * dummy monster needed for visual interface
     * (marking it unique prevents figurines)
     */
    MON(NAM("long worm tail"), S_WORM_TAIL,
        LVL(0, 0, 0, 0, 0), (G_NOGEN | G_NOCORPSE | G_UNIQ),
        A(NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(0, 0, 0, 0), 0, 0, 0, M2_NOPOLY, 0,
        1, CLR_BROWN, PM_LONG_WORM_TAIL),
    /* Note:
     * Worm tail must be between the normal monsters and the special
     * quest & pseudo-character ones because an optimization in the
     * random monster selection code assumes everything beyond here
     * has the G_NOGEN and M2_NOPOLY attributes.
     */

    /*
     * character classes
     */
    MON(NAM("archeologist"), S_HUMAN,
        LVL(10, 12, 10, 1, 3), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6), ATTK(AT_WEAP, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_HUMANOID, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_TUNNEL | M1_NEEDPICK | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT, M3_INFRAVISIBLE,
        12, HI_DOMESTIC, PM_ARCHEOLOGIST),
    MON(NAM("barbarian"), S_HUMAN,
        LVL(10, 12, 10, 1, 0), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6), ATTK(AT_WEAP, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_HUMANOID, MZ_HUMAN), MR_POISON, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT, M3_INFRAVISIBLE,
        12, HI_DOMESTIC, PM_BARBARIAN),
    MON(NAMS("caveman", "cavewoman", "cave dweller"), S_HUMAN,
        LVL(10, 12, 10, 0, 1), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_HUMANOID, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
        M3_INFRAVISIBLE,
        12, HI_DOMESTIC, PM_CAVE_DWELLER),
    MON(NAM("healer"), S_HUMAN,
        LVL(10, 12, 10, 1, 0), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_HUMANOID, MZ_HUMAN), MR_POISON, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT, M3_INFRAVISIBLE,
        12, HI_DOMESTIC, PM_HEALER),
    MON(NAM("knight"), S_HUMAN,
        LVL(10, 12, 10, 1, 3), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6), ATTK(AT_WEAP, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_HUMANOID, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT, M3_INFRAVISIBLE,
        12, HI_DOMESTIC, PM_KNIGHT),
    MON(NAM("monk"), S_HUMAN,
        LVL(10, 12, 10, 2, 0), G_NOGEN,
        A(ATTK(AT_CLAW, AD_PHYS, 1, 8), ATTK(AT_KICK, AD_PHYS, 1, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_HUMANOID, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_HERBIVORE,
        M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
        M3_INFRAVISIBLE,
        11, HI_DOMESTIC, PM_MONK),
    /* monster priests are separate monsters (above; "aligned cleric") */
    MON(NAMS("priest", "priestess", "cleric"), S_HUMAN,
        LVL(10, 12, 10, 2, 0), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6), ATTK(AT_MAGC, AD_CLRC, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_HUMANOID, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
        M3_INFRAVISIBLE,
        12, HI_DOMESTIC, PM_CLERIC),
    MON(NAM("ranger"), S_HUMAN,
        LVL(10, 12, 10, 2, -3), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_HUMANOID, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT, M3_INFRAVISIBLE,
        12, HI_DOMESTIC, PM_RANGER),
    MON(NAM("rogue"), S_HUMAN,
        LVL(10, 12, 10, 1, -3), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6), ATTK(AT_WEAP, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_HUMANOID, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
        M3_INFRAVISIBLE,
        12, HI_DOMESTIC, PM_ROGUE),
    MON(NAM("samurai"), S_HUMAN,
        LVL(10, 12, 10, 1, 3), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 8), ATTK(AT_WEAP, AD_PHYS, 1, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_HUMANOID, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT, M3_INFRAVISIBLE,
        12, HI_DOMESTIC, PM_SAMURAI),
    MON(NAM("tourist"), S_HUMAN,
        LVL(10, 12, 10, 1, 0), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6), ATTK(AT_WEAP, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_HUMANOID, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT, M3_INFRAVISIBLE,
        12, HI_DOMESTIC, PM_TOURIST),
    /* valk is lawful by default; player valk can be neutral, in which case
       role_init() will change this monster and 'warrior' to be neutral too;
       if a neutral valk leaves a bones file containing neutral warriors,
       the latter will magically turn lawful if encountered by a lawful valk
       or any non-valk (for bones on the dungeon side of the portal) */
    MON(NAM("valkyrie"), S_HUMAN,
        LVL(10, 12, 10, 1, 1), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 8), ATTK(AT_WEAP, AD_PHYS, 1, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_HUMANOID, MZ_HUMAN), MR_COLD, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_FEMALE | M2_COLLECT,
        M3_INFRAVISIBLE,
        12, HI_DOMESTIC, PM_VALKYRIE),
    MON(NAM("wizard"), S_HUMAN,
        LVL(10, 12, 10, 3, 0), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6), ATTK(AT_MAGC, AD_SPEL, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_HUMANOID, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT | M2_MAGIC,
        M3_INFRAVISIBLE,
        12, HI_DOMESTIC, PM_WIZARD),
    /*
     * quest leaders
     */
    MON(NAM("Lord Carnarvon"), S_HUMAN,
        LVL(20, 15, 0, 90, 20), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_WEAP, AD_PHYS, 4, 10), ATTK(AT_MAGC, AD_SPEL, 4, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_LEADER, MZ_HUMAN), 0, 0,
        M1_TUNNEL | M1_NEEDPICK | M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC, M3_CLOSE | M3_INFRAVISIBLE,
        24, HI_LORD, PM_LORD_CARNARVON),
    MON(NAM("Pelias"), S_HUMAN,
        LVL(20, 15, 0, 90, 0), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_WEAP, AD_PHYS, 4, 10), ATTK(AT_WEAP, AD_PHYS, 4, 10),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_LEADER, MZ_HUMAN), MR_POISON, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC, M3_CLOSE | M3_INFRAVISIBLE,
        24, HI_LORD, PM_PELIAS),
    MON(NAM("Shaman Karnov"), S_HUMAN,
        LVL(20, 15, 0, 90, 20), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_WEAP, AD_PHYS, 4, 10), ATTK(AT_MAGC, AD_CLRC, 2, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_LEADER, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC, M3_CLOSE | M3_INFRAVISIBLE,
        24, HI_LORD, PM_SHAMAN_KARNOV),
    MON(NAM("Hippocrates"), S_HUMAN,
        LVL(20, 15, 0, 90, 0), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6), ATTK(AT_MAGC, AD_CLRC, 3, 8),
          ATTK(AT_MAGC, AD_CLRC, 3, 8), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_LEADER, MZ_HUMAN), MR_POISON, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC, M3_CLOSE | M3_INFRAVISIBLE,
        26, HI_LORD, PM_HIPPOCRATES),
    MON(NAM("King Arthur"), S_HUMAN,
        LVL(20, 15, 0, 90, 20), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_WEAP, AD_PHYS, 4, 10), ATTK(AT_WEAP, AD_PHYS, 4, 10),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_LEADER, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC, M3_CLOSE | M3_INFRAVISIBLE,
        24, HI_LORD, PM_KING_ARTHUR),
    MON(NAM("Grand Master"), S_HUMAN,
        LVL(25, 15, 0, 90, 0), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_CLAW, AD_PHYS, 4, 10), ATTK(AT_KICK, AD_PHYS, 2, 8),
          ATTK(AT_MAGC, AD_CLRC, 2, 8), ATTK(AT_MAGC, AD_CLRC, 2, 8),
          NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_LEADER, MZ_HUMAN),
        MR_FIRE | MR_ELEC | MR_SLEEP | MR_POISON, 0,
        M1_HUMANOID | M1_SEE_INVIS | M1_HERBIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_MALE | M2_NASTY
            | M2_MAGIC, M3_CLOSE | M3_INFRAVISIBLE,
        30, CLR_BLACK, PM_GRAND_MASTER),
    MON(NAM("Arch Priest"), S_HUMAN,
        LVL(25, 15, 7, 90, 0), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_WEAP, AD_PHYS, 4, 10), ATTK(AT_KICK, AD_PHYS, 2, 8),
          ATTK(AT_MAGC, AD_CLRC, 2, 8), ATTK(AT_MAGC, AD_CLRC, 2, 8),
          NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_LEADER, MZ_HUMAN),
        MR_FIRE | MR_ELEC | MR_SLEEP | MR_POISON, 0,
        M1_HUMANOID | M1_SEE_INVIS | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_MALE | M2_COLLECT
            | M2_MAGIC, M3_CLOSE | M3_INFRAVISIBLE,
        30, CLR_WHITE, PM_ARCH_PRIEST),
    MON(NAM("Orion"), S_HUMAN, LVL(20, 15, 0, 90, 0), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_WEAP, AD_PHYS, 4, 10), ATTK(AT_MAGC, AD_SPEL, 4, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2200, 700, MS_LEADER, MZ_HUGE), 0, 0,
        M1_HUMANOID | M1_OMNIVORE | M1_SEE_INVIS | M1_SWIM | M1_AMPHIBIOUS,
        M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC,
        M3_CLOSE | M3_INFRAVISION | M3_INFRAVISIBLE,
        24, HI_LORD, PM_ORION),
    /* Note: Master of Thieves is also the Tourist's nemesis.
     */
    MON(NAM("Master of Thieves"), S_HUMAN,
        LVL(20, 15, 0, 90, -20), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_WEAP, AD_PHYS, 4, 10), ATTK(AT_WEAP, AD_PHYS, 2, 6),
          ATTK(AT_CLAW, AD_SAMU, 2, 4), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_LEADER, MZ_HUMAN), MR_STONE, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_MALE | M2_GREEDY
            | M2_JEWELS | M2_COLLECT | M2_MAGIC,
        M3_CLOSE | M3_INFRAVISIBLE,
        24, HI_LORD, PM_MASTER_OF_THIEVES),
    MON(NAM("Lord Sato"), S_HUMAN, LVL(20, 15, 0, 90, 20), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_WEAP, AD_PHYS, 4, 10), ATTK(AT_WEAP, AD_PHYS, 4, 10),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_LEADER, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC, M3_CLOSE | M3_INFRAVISIBLE,
        24, HI_LORD, PM_LORD_SATO),
    MON(NAM("Twoflower"), S_HUMAN,
        LVL(20, 15, 10, 90, 0), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_WEAP, AD_PHYS, 4, 10),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_LEADER, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC, M3_CLOSE | M3_INFRAVISIBLE,
        22, HI_DOMESTIC, PM_TWOFLOWER),
    /* for a valkyrie hero, Norn's alignment will be changed to match hero's
       starting alignment */
    MON(NAM("Norn"), S_HUMAN,
        LVL(20, 15, 0, 90, 0), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_WEAP, AD_PHYS, 4, 10), ATTK(AT_WEAP, AD_PHYS, 4, 10),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1800, 550, MS_LEADER, MZ_HUGE), MR_COLD, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_FEMALE
            | M2_COLLECT | M2_MAGIC, M3_CLOSE | M3_INFRAVISIBLE,
        24, HI_LORD, PM_NORN),
    MON(NAM("Neferet the Green"), S_HUMAN,
        LVL(20, 15, 0, 90, 0), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_WEAP, AD_PHYS, 4, 10), ATTK(AT_MAGC, AD_SPEL, 2, 8),
          ATTK(AT_MAGC, AD_SPEL, 2, 8), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_LEADER, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_FEMALE | M2_PNAME | M2_PEACEFUL | M2_STRONG
            | M2_COLLECT | M2_MAGIC, M3_CLOSE | M3_INFRAVISIBLE,
        25, CLR_GREEN, PM_NEFERET_THE_GREEN),
    /*
     * quest nemeses
     */
    MON(NAM("Minion of Huhetotl"), S_DEMON,
        LVL(16, 12, -2, 75, -14), (G_NOCORPSE | G_NOGEN | G_UNIQ),
        A(ATTK(AT_WEAP, AD_PHYS, 8, 4), ATTK(AT_WEAP, AD_PHYS, 4, 6),
          ATTK(AT_MAGC, AD_SPEL, 0, 0), ATTK(AT_CLAW, AD_SAMU, 2, 6),
          NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_NEMESIS, MZ_LARGE),
        MR_FIRE | MR_POISON | MR_STONE, 0, M1_FLY | M1_SEE_INVIS | M1_POIS,
        M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_STRONG | M2_NASTY
            | M2_COLLECT,
        M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISION | M3_INFRAVISIBLE,
        23, CLR_ORANGE, PM_MINION_OF_HUHETOTL),
    MON(NAM("Thoth Amon"), S_HUMAN,
        LVL(16, 12, 0, 10, -14), (G_NOGEN | G_UNIQ | G_NOCORPSE),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6), ATTK(AT_MAGC, AD_SPEL, 0, 0),
          ATTK(AT_MAGC, AD_SPEL, 0, 0), ATTK(AT_CLAW, AD_SAMU, 1, 4),
          NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_NEMESIS, MZ_HUMAN), MR_POISON | MR_STONE, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_STRONG | M2_MALE | M2_STALK
            | M2_HOSTILE | M2_NASTY | M2_COLLECT | M2_MAGIC,
        M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISIBLE,
        22, HI_LORD, PM_THOTH_AMON),
    /* Multi-headed, possessing the breath attacks of all the other dragons
     * (selected at random when attacking).  Despite being a superset of
     * gold dragon, does not emit light.  Also does not fly.
     */
    MON(NAM("Chromatic Dragon"), S_DRAGON,
        LVL(16, 12, 0, 30, -14), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_BREA, AD_RBRE, 6, 6), ATTK(AT_MAGC, AD_SPEL, 0, 0),
          ATTK(AT_CLAW, AD_SAMU, 2, 8), ATTK(AT_BITE, AD_PHYS, 4, 8),
          ATTK(AT_BITE, AD_PHYS, 4, 8), ATTK(AT_STNG, AD_PHYS, 1, 6)),
        SIZ(WT_DRAGON, 1700, MS_NEMESIS, MZ_GIGANTIC),
        MR_FIRE | MR_COLD | MR_SLEEP | MR_DISINT | MR_ELEC | MR_POISON
            | MR_ACID | MR_STONE,
        MR_FIRE | MR_COLD | MR_SLEEP | MR_DISINT | MR_ELEC | MR_POISON
            | MR_ACID | MR_STONE,
        M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE | M1_SEE_INVIS | M1_POIS,
        M2_NOPOLY | M2_HOSTILE | M2_FEMALE | M2_STALK | M2_STRONG | M2_NASTY
            | M2_GREEDY | M2_JEWELS | M2_MAGIC,
        M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISION | M3_INFRAVISIBLE,
        23, HI_LORD, PM_CHROMATIC_DRAGON),
    MON(NAM("Cyclops"), S_GIANT,
        LVL(18, 12, 0, 0, -15), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_WEAP, AD_PHYS, 4, 8), ATTK(AT_WEAP, AD_PHYS, 4, 8),
          ATTK(AT_CLAW, AD_SAMU, 2, 6), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(1900, 700, MS_NEMESIS, MZ_HUGE), MR_STONE, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_GIANT | M2_STRONG | M2_ROCKTHROW | M2_STALK
            | M2_HOSTILE | M2_NASTY | M2_MALE | M2_JEWELS | M2_COLLECT,
        M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISION | M3_INFRAVISIBLE,
        23, CLR_GRAY, PM_CYCLOPS),
    MON(NAM("Ixoth"), S_DRAGON,
        LVL(15, 12, -1, 20, -14), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_BREA, AD_FIRE, 8, 6), ATTK(AT_BITE, AD_PHYS, 4, 8),
          ATTK(AT_MAGC, AD_SPEL, 0, 0), ATTK(AT_CLAW, AD_PHYS, 2, 4),
          ATTK(AT_CLAW, AD_SAMU, 2, 4), NO_ATTK),
        SIZ(WT_DRAGON, 1600, MS_NEMESIS, MZ_GIGANTIC), MR_FIRE | MR_STONE,
        MR_FIRE,
        M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE | M1_SEE_INVIS,
        M2_NOPOLY | M2_MALE | M2_PNAME | M2_HOSTILE | M2_STRONG | M2_NASTY
            | M2_STALK | M2_GREEDY | M2_JEWELS | M2_MAGIC,
        M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISIBLE,
        22, CLR_RED, PM_IXOTH),
    MON(NAM("Master Kaen"), S_HUMAN,
        LVL(25, 12, -10, 10, -20), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_CLAW, AD_PHYS, 16, 2), ATTK(AT_CLAW, AD_PHYS, 16, 2),
          ATTK(AT_MAGC, AD_CLRC, 0, 0), ATTK(AT_CLAW, AD_SAMU, 1, 4),
          NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_NEMESIS, MZ_HUMAN), MR_POISON | MR_STONE,
        MR_POISON, M1_HUMANOID | M1_HERBIVORE | M1_SEE_INVIS,
        M2_NOPOLY | M2_HUMAN | M2_MALE | M2_PNAME | M2_HOSTILE | M2_STRONG
            | M2_NASTY | M2_STALK | M2_COLLECT | M2_MAGIC,
        M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISIBLE,
        31, HI_LORD, PM_MASTER_KAEN),
    MON(NAM("Nalzok"), S_DEMON, LVL(16, 12, -2, 85, -127),
        (G_NOGEN | G_UNIQ | G_NOCORPSE),
        A(ATTK(AT_WEAP, AD_PHYS, 8, 4), ATTK(AT_WEAP, AD_PHYS, 4, 6),
          ATTK(AT_MAGC, AD_SPEL, 0, 0), ATTK(AT_CLAW, AD_SAMU, 2, 6),
          NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_NEMESIS, MZ_LARGE),
        MR_FIRE | MR_POISON | MR_STONE, 0, M1_FLY | M1_SEE_INVIS | M1_POIS,
        M2_NOPOLY | M2_DEMON | M2_MALE | M2_PNAME | M2_HOSTILE | M2_STRONG
            | M2_STALK | M2_NASTY | M2_COLLECT,
        M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISION | M3_INFRAVISIBLE,
        23, CLR_ORANGE, PM_NALZOK),
    MON(NAM("Scorpius"), S_SPIDER,
        LVL(15, 12, 10, 0, -15), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_CLAW, AD_PHYS, 2, 6), ATTK(AT_CLAW, AD_SAMU, 2, 6),
          ATTK(AT_STNG, AD_DISE, 1, 4), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(750, 350, MS_NEMESIS, MZ_HUMAN), MR_POISON | MR_STONE, MR_POISON,
        M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_POIS | M1_CARNIVORE,
        M2_NOPOLY | M2_MALE | M2_PNAME | M2_HOSTILE | M2_STRONG | M2_STALK
            | M2_NASTY | M2_COLLECT | M2_MAGIC,
        M3_WANTSARTI | M3_WAITFORU,
        17, HI_LORD, PM_SCORPIUS),
    MON(NAM("Master Assassin"), S_HUMAN,
        LVL(15, 12, 0, 30, 18), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_WEAP, AD_DRST, 2, 6), ATTK(AT_WEAP, AD_PHYS, 2, 8),
          ATTK(AT_CLAW, AD_SAMU, 2, 6), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_NEMESIS, MZ_HUMAN), MR_STONE, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_MALE | M2_HOSTILE | M2_STALK
            | M2_NASTY | M2_COLLECT | M2_MAGIC,
        M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISIBLE,
        20, HI_LORD, PM_MASTER_ASSASSIN),
    /* A renegade daimyo who led a 13 year civil war against the shogun
     * of his time.
     */
    MON(NAM("Ashikaga Takauji"), S_HUMAN,
        LVL(15, 12, 0, 40, -13), (G_NOGEN | G_UNIQ | G_NOCORPSE),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 6), ATTK(AT_WEAP, AD_PHYS, 2, 6),
          ATTK(AT_CLAW, AD_SAMU, 2, 6), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_NEMESIS, MZ_HUMAN), MR_STONE, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_HOSTILE | M2_STRONG | M2_STALK
            | M2_NASTY | M2_MALE | M2_COLLECT | M2_MAGIC,
        M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISIBLE,
        19, HI_LORD, PM_ASHIKAGA_TAKAUJI),
    /*
     * Note: the Master of Thieves was defined above.
     */
    MON(NAM("Lord Surtur"), S_GIANT,
        LVL(15, 12, 2, 50, 12), (G_NOGEN | G_UNIQ),
        A(ATTK(AT_WEAP, AD_PHYS, 2, 10), ATTK(AT_WEAP, AD_PHYS, 2, 10),
          ATTK(AT_CLAW, AD_SAMU, 2, 6), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(2250, 850, MS_NEMESIS, MZ_HUGE), MR_FIRE | MR_STONE, MR_FIRE,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_GIANT | M2_MALE | M2_PNAME | M2_HOSTILE | M2_STALK
            | M2_STRONG | M2_NASTY | M2_ROCKTHROW | M2_JEWELS | M2_COLLECT,
        M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISION | M3_INFRAVISIBLE,
        19, HI_LORD, PM_LORD_SURTUR),
    MON(NAM("Dark One"), S_HUMAN,
        LVL(15, 12, 0, 80, -10), (G_NOGEN | G_UNIQ | G_NOCORPSE),
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6), ATTK(AT_WEAP, AD_PHYS, 1, 6),
          ATTK(AT_CLAW, AD_SAMU, 1, 4), ATTK(AT_MAGC, AD_SPEL, 0, 0),
          NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_NEMESIS, MZ_HUMAN), MR_STONE, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_HOSTILE | M2_STALK | M2_NASTY
            | M2_COLLECT | M2_MAGIC,
        M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISIBLE,
        20, CLR_BLACK, PM_DARK_ONE),
    /*
     * quest "guardians"
     */
    MON(NAM("student"), S_HUMAN,
        LVL(5, 12, 10, 10, 3), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_GUARDIAN, MZ_HUMAN), 0, 0,
        M1_TUNNEL | M1_NEEDPICK | M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
        M3_INFRAVISIBLE,
        7, HI_DOMESTIC, PM_STUDENT),
    MON(NAM("chieftain"), S_HUMAN,
        LVL(5, 12, 10, 10, 0), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_GUARDIAN, MZ_HUMAN), MR_POISON, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
        M3_INFRAVISIBLE,
        7, HI_DOMESTIC, PM_CHIEFTAIN),
    MON(NAM("neanderthal"), S_HUMAN,
        LVL(5, 12, 10, 10, 1), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 2, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_GUARDIAN, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
        M3_INFRAVISIBLE,
        7, HI_DOMESTIC, PM_NEANDERTHAL),
    /* attendants used to be lawful but have been changed to neutral because
       grow_up() promotes them to healer and the latter is always neutral */
    MON(NAM("attendant"), S_HUMAN,
        LVL(5, 12, 10, 10, 0), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_GUARDIAN, MZ_HUMAN), MR_POISON, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
        M3_INFRAVISIBLE,
        7, HI_DOMESTIC, PM_ATTENDANT),
    MON(NAM("page"), S_HUMAN,
        LVL(5, 12, 10, 10, 3), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6), ATTK(AT_WEAP, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_GUARDIAN, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
        M3_INFRAVISIBLE,
        7, HI_DOMESTIC, PM_PAGE),
    MON(NAM("abbot"), S_HUMAN,
        LVL(5, 12, 10, 20, 0), G_NOGEN,
        A(ATTK(AT_CLAW, AD_PHYS, 8, 2), ATTK(AT_KICK, AD_STUN, 3, 2),
          ATTK(AT_MAGC, AD_CLRC, 0, 0), NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_GUARDIAN, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_HERBIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
        M3_INFRAVISIBLE,
        8, HI_DOMESTIC, PM_ABBOT),
    MON(NAM("acolyte"), S_HUMAN,
        LVL(5, 12, 10, 20, 0), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6), ATTK(AT_MAGC, AD_CLRC, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_GUARDIAN, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
        M3_INFRAVISIBLE,
        8, HI_DOMESTIC, PM_ACOLYTE),
    MON(NAM("hunter"), S_HUMAN,
        LVL(5, 12, 10, 10, -7), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 4),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_GUARDIAN, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_SEE_INVIS | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
        M3_INFRAVISION | M3_INFRAVISIBLE,
        7, HI_DOMESTIC, PM_HUNTER),
    MON(NAM("thug"), S_HUMAN,
        LVL(5, 12, 10, 10, -3), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6), ATTK(AT_WEAP, AD_PHYS, 1, 6),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_GUARDIAN, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE, M2_NOPOLY | M2_HUMAN | M2_PEACEFUL
                                       | M2_STRONG | M2_GREEDY | M2_COLLECT,
        M3_INFRAVISIBLE,
        7, HI_DOMESTIC, PM_THUG),
    MON(NAM("ninja"), S_HUMAN,
        LVL(5, 12, 10, 10, 3), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 8), ATTK(AT_WEAP, AD_PHYS, 1, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_HUMANOID, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_HOSTILE | M2_STRONG | M2_COLLECT,
        M3_INFRAVISIBLE,
        7, HI_DOMESTIC, PM_NINJA),
    MON(NAM("roshi"), S_HUMAN,
        LVL(5, 12, 10, 10, 3), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 8), ATTK(AT_WEAP, AD_PHYS, 1, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_GUARDIAN, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE,
        M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
        M3_INFRAVISIBLE,
        7, HI_DOMESTIC, PM_ROSHI),
    MON(NAM("guide"), S_HUMAN,
        LVL(5, 12, 10, 20, 0), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6), ATTK(AT_MAGC, AD_SPEL, 0, 0), NO_ATTK,
          NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_GUARDIAN, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE, M2_NOPOLY | M2_HUMAN | M2_PEACEFUL
                                       | M2_STRONG | M2_COLLECT | M2_MAGIC,
        M3_INFRAVISIBLE,
        8, HI_DOMESTIC, PM_GUIDE),
    /* warriors used to be chaotic but have been changed to lawful because
       grow_up() promotes them to valkyrie; for a valkyrie hero, they might
       be changed to neutral at game start; see the valkyrie comment above */
    MON(NAM("warrior"), S_HUMAN,
        LVL(5, 12, 10, 10, 1), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 8), ATTK(AT_WEAP, AD_PHYS, 1, 8),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_GUARDIAN, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE, M2_NOPOLY | M2_HUMAN | M2_PEACEFUL
                                       | M2_STRONG | M2_COLLECT | M2_FEMALE,
        M3_INFRAVISIBLE,
        7, HI_DOMESTIC, PM_WARRIOR),
    MON(NAM("apprentice"), S_HUMAN,
        LVL(5, 12, 10, 30, 0), G_NOGEN,
        A(ATTK(AT_WEAP, AD_PHYS, 1, 6), ATTK(AT_MAGC, AD_SPEL, 0, 0),
          NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(WT_HUMAN, 400, MS_GUARDIAN, MZ_HUMAN), 0, 0,
        M1_HUMANOID | M1_OMNIVORE, M2_NOPOLY | M2_HUMAN | M2_PEACEFUL
                                       | M2_STRONG | M2_COLLECT | M2_MAGIC,
        M3_INFRAVISIBLE,
        8, HI_DOMESTIC, PM_APPRENTICE),

    /*
     * mons_init() in monst.c adds a terminator here, mons[NUMMONS].
     * It is part of the mons[] array without introducing another type
     * of monster.
     */


/*monsters.h*/

    /*
     * Array terminator, added to the end of the entries in monsters.h.
     *
     * mons[NUMMONS] used to be all zero except "" instead of Null for
     * the name field.  Then the index field was added and the terminator
     * uses NON_PM for that.  Now, a few monster flags also get set.
     */
    MON(NAM(""), 0,
        LVL(0, 0, 0, 0, 0), G_NOGEN | G_NOCORPSE,
        A(NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK, NO_ATTK),
        SIZ(0, 0, 0, 0), 0, 0,
        0,  M2_NOPOLY, 0,
        0, 0, NON_PM),
];

// C ref: monst.c mons[SIZE(mons_init)] -- the live, modifiable copy
export const mons = [];

// C ref: monst.c monst_globals_init() -- memcpy(mons, mons_init, sizeof mons)
export function monst_globals_init() {
    mons.length = 0;
    for (const pm of mons_init)
        mons.push({ ...pm, pmnames: [...pm.pmnames],
                    mattk: pm.mattk.map(a => ({ ...a })) });
    return;
}

// C ref: monst.c c_sa_yes[], c_sa_no[]
export const c_sa_yes = SEDUCTION_ATTACKS_YES;
export const c_sa_no = SEDUCTION_ATTACKS_NO;
