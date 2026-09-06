// permonst.js — complete NetHack 5.0 monster database (`mons[]` / `struct permonst`).
//
// Pure data module: no imports, no runtime wiring. Generated once by hand from
// nethack-c/upstream sources (all constant values verified against the C headers):
//   include/permonst.h   — struct permonst / struct attack layout, NATTK = 6
//   include/monsters.h   — all 383 MON() entries in C enum order (PM_GIANT_ANT = 0)
//   include/monattk.h    — AT_* / AD_* attack and damage type codes
//   include/monflag.h    — MS_* sounds, MZ_* sizes, MR_*/MR2_* resistances,
//                          M1_/M2_/M3_* flag bits, G_* geno bits
//   include/defsym.h     — S_* monster class values and display letters (MONSYM)
//   include/weight.h     — WT_* corpse weights (WT_HUMAN etc.)
//   include/color.h      — CLR_* / HI_* colors
//   include/align.h      — A_NONE/A_CHAOTIC/A_NEUTRAL/A_LAWFUL alignments
//   include/mondata.h    — predicate macros (breathless(), is_undead(), ...)
//
// Notes on 5.0 differences kept verbatim here:
//   * NetHack 5.0 has NO playermon/PM_NULL slot: permonst.h defines
//     NON_PM = -1 and LOW_PM = 0, and mons[0] is "giant ant" (PM_GIANT_ANT).
//     Cf. src/dog.c:226 "static init yields 0 (PM_GIANT_ANT)".
//   * `#ifdef CHARON` monsters (Cerberus, Charon) and `#if 0` DEFERRED/OBSOLETE
//     monsters in monsters.h are NOT compiled into mons[] and are omitted here.
//   * The "mail daemon" is compiled (include/global.h:430 defines MAIL_STRUCTURES).
//   * FLAG FIELDS ARE STORED AS UNSIGNED INTEGERS (e.g. M1_METALLIVORE bits set
//     bit 31). JavaScript bitwise ops give signed 32-bit results, so all flag
//     values below are precomputed; predicates use `(x & FLAG) !== 0` which is
//     safe for the sign bit as well. Never recompute flag masks with `|`.

/* include/monattk.h: attack types (struct attack .aatyp) */
export const AT_NONE = 0;
export const AT_CLAW = 1;
export const AT_BITE = 2;
export const AT_KICK = 3;
export const AT_BUTT = 4;
export const AT_TUCH = 5;
export const AT_STNG = 6;
export const AT_HUGS = 7;
export const AT_SPIT = 10;
export const AT_ENGL = 11;
export const AT_BREA = 12;
export const AT_EXPL = 13;
export const AT_BOOM = 14;
export const AT_GAZE = 15;
export const AT_TENT = 16;
export const AT_WEAP = 254;
export const AT_MAGC = 255;
export const AT_ANY = -1;

/* include/monattk.h: damage types (struct attack .adtyp) */
export const AD_PHYS = 0;
export const AD_MAGM = 1;
export const AD_FIRE = 2;
export const AD_COLD = 3;
export const AD_SLEE = 4;
export const AD_DISN = 5;
export const AD_ELEC = 6;
export const AD_DRST = 7;
export const AD_ACID = 8;
export const AD_SPC1 = 9;
export const AD_SPC2 = 10;
export const AD_BLND = 11;
export const AD_STUN = 12;
export const AD_SLOW = 13;
export const AD_PLYS = 14;
export const AD_DRLI = 15;
export const AD_DREN = 16;
export const AD_LEGS = 17;
export const AD_STON = 18;
export const AD_STCK = 19;
export const AD_SGLD = 20;
export const AD_SITM = 21;
export const AD_SEDU = 22;
export const AD_TLPT = 23;
export const AD_RUST = 24;
export const AD_CONF = 25;
export const AD_DGST = 26;
export const AD_HEAL = 27;
export const AD_WRAP = 28;
export const AD_WERE = 29;
export const AD_DRDX = 30;
export const AD_DRCO = 31;
export const AD_DRIN = 32;
export const AD_DISE = 33;
export const AD_DCAY = 34;
export const AD_SSEX = 35;
export const AD_HALU = 36;
export const AD_DETH = 37;
export const AD_PEST = 38;
export const AD_FAMN = 39;
export const AD_SLIM = 40;
export const AD_ENCH = 41;
export const AD_CORR = 42;
export const AD_POLY = 43;
export const AD_CLRC = 240;
export const AD_SPEL = 241;
export const AD_RBRE = 242;
export const AD_SAMU = 252;
export const AD_CURS = 253;
export const AD_ANY = -1;

/* include/monflag.h: monster sounds (struct permonst .msound) */
export const MS_SILENT = 0;
export const MS_BARK = 1;
export const MS_MEW = 2;
export const MS_ROAR = 3;
export const MS_BELLOW = 4;
export const MS_GROWL = 5;
export const MS_SQEEK = 6;
export const MS_SQAWK = 7;
export const MS_CHIRP = 8;
export const MS_HISS = 9;
export const MS_BUZZ = 10;
export const MS_GRUNT = 11;
export const MS_NEIGH = 12;
export const MS_MOO = 13;
export const MS_WAIL = 14;
export const MS_GURGLE = 15;
export const MS_BURBLE = 16;
export const MS_TRUMPET = 17;
export const MS_SHRIEK = 18;
export const MS_BONES = 19;
export const MS_LAUGH = 20;
export const MS_MUMBLE = 21;
export const MS_IMITATE = 22;
export const MS_WERE = 23;
export const MS_ORC = 24;
export const MS_HUMANOID = 25;
export const MS_ARREST = 26;
export const MS_SOLDIER = 27;
export const MS_GUARD = 28;
export const MS_DJINNI = 29;
export const MS_NURSE = 30;
export const MS_SEDUCE = 31;
export const MS_VAMPIRE = 32;
export const MS_BRIBE = 33;
export const MS_CUSS = 34;
export const MS_RIDER = 35;
export const MS_LEADER = 36;
export const MS_NEMESIS = 37;
export const MS_GUARDIAN = 38;
export const MS_SELL = 39;
export const MS_ORACLE = 40;
export const MS_PRIEST = 41;
export const MS_SPELL = 42;
export const MS_BOAST = 43;
export const MS_GROAN = 44;
export const MS_ANIMAL = MS_TRUMPET; /* monflag.h: MS_TRUMPET is last animal noise */

/* include/monflag.h: resistances (struct permonst .mresists/.mconveys) */
export const MR_FIRE = 1;
export const MR_COLD = 2;
export const MR_SLEEP = 4;
export const MR_DISINT = 8;
export const MR_ELEC = 16;
export const MR_POISON = 32;
export const MR_ACID = 64;
export const MR_STONE = 128;
export const MR2_SEE_INVIS = 256;
export const MR2_LEVITATE = 512;
export const MR2_WATERWALK = 1024;
export const MR2_MAGBREATH = 2048;
export const MR2_DISPLACED = 4096;
export const MR2_STRENGTH = 8192;
export const MR2_FUMBLING = 16384;

/* include/monflag.h: physical sizes (struct permonst .msize) */
export const MZ_TINY = 0;
export const MZ_SMALL = 1;
export const MZ_MEDIUM = 2;
export const MZ_HUMAN = 2;
export const MZ_LARGE = 3;
export const MZ_HUGE = 4;
export const MZ_GIGANTIC = 7;

/* include/monflag.h: geno bits (struct permonst .geno); hex = C source form */
export const G_UNIQ = 0x1000;
export const G_NOHELL = 0x0800;
export const G_HELL = 0x0400;
export const G_NOGEN = 0x0200;
export const G_SGROUP = 0x0080;
export const G_LGROUP = 0x0040;
export const G_GENO = 0x0020;
export const G_NOCORPSE = 0x0010;
export const G_FREQ = 0x0007;

/* include/monflag.h: M1_* bits (struct permonst .mflags1) */
export const M1_FLY = 0x00000001;
export const M1_SWIM = 0x00000002;
export const M1_AMORPHOUS = 0x00000004;
export const M1_WALLWALK = 0x00000008;
export const M1_CLING = 0x00000010;
export const M1_TUNNEL = 0x00000020;
export const M1_NEEDPICK = 0x00000040;
export const M1_CONCEAL = 0x00000080;
export const M1_HIDE = 0x00000100;
export const M1_AMPHIBIOUS = 0x00000200;
export const M1_BREATHLESS = 0x00000400;
export const M1_NOTAKE = 0x00000800;
export const M1_NOEYES = 0x00001000;
export const M1_NOHANDS = 0x00002000;
export const M1_NOLIMBS = 0x00006000;
export const M1_NOHEAD = 0x00008000;
export const M1_MINDLESS = 0x00010000;
export const M1_HUMANOID = 0x00020000;
export const M1_ANIMAL = 0x00040000;
export const M1_SLITHY = 0x00080000;
export const M1_UNSOLID = 0x00100000;
export const M1_THICK_HIDE = 0x00200000;
export const M1_OVIPAROUS = 0x00400000;
export const M1_REGEN = 0x00800000;
export const M1_SEE_INVIS = 0x01000000;
export const M1_TPORT = 0x02000000;
export const M1_TPORT_CNTRL = 0x04000000;
export const M1_ACID = 0x08000000;
export const M1_POIS = 0x10000000;
export const M1_CARNIVORE = 0x20000000;
export const M1_HERBIVORE = 0x40000000;
export const M1_OMNIVORE = 0x60000000;
export const M1_METALLIVORE = 0x80000000;

/* include/monflag.h: M2_* bits (struct permonst .mflags2) */
export const M2_NOPOLY = 0x00000001;
export const M2_UNDEAD = 0x00000002;
export const M2_WERE = 0x00000004;
export const M2_HUMAN = 0x00000008;
export const M2_ELF = 0x00000010;
export const M2_DWARF = 0x00000020;
export const M2_GNOME = 0x00000040;
export const M2_ORC = 0x00000080;
export const M2_DEMON = 0x00000100;
export const M2_MERC = 0x00000200;
export const M2_LORD = 0x00000400;
export const M2_PRINCE = 0x00000800;
export const M2_MINION = 0x00001000;
export const M2_GIANT = 0x00002000;
export const M2_SHAPESHIFTER = 0x00004000;
export const M2_MALE = 0x00010000;
export const M2_FEMALE = 0x00020000;
export const M2_NEUTER = 0x00040000;
export const M2_PNAME = 0x00080000;
export const M2_HOSTILE = 0x00100000;
export const M2_PEACEFUL = 0x00200000;
export const M2_DOMESTIC = 0x00400000;
export const M2_WANDER = 0x00800000;
export const M2_STALK = 0x01000000;
export const M2_NASTY = 0x02000000;
export const M2_STRONG = 0x04000000;
export const M2_ROCKTHROW = 0x08000000;
export const M2_GREEDY = 0x10000000;
export const M2_JEWELS = 0x20000000;
export const M2_COLLECT = 0x40000000;
export const M2_MAGIC = 0x80000000;

/* include/monflag.h: M3_* bits (struct permonst .mflags3) */
export const M3_WANTSAMUL = 0x0001;
export const M3_WANTSBELL = 0x0002;
export const M3_WANTSBOOK = 0x0004;
export const M3_WANTSCAND = 0x0008;
export const M3_WANTSARTI = 0x0010;
export const M3_WANTSALL = 0x001F;
export const M3_WAITFORU = 0x0040;
export const M3_CLOSE = 0x0080;
export const M3_COVETOUS = 0x001F;
export const M3_WAITMASK = 0x00C0;
export const M3_INFRAVISION = 0x0100;
export const M3_INFRAVISIBLE = 0x0200;
export const M3_DISPLACES = 0x0400;

/* include/color.h: colors used by monsters.h (struct permonst .mcolor) */
export const CLR_BLACK = 0;
export const CLR_RED = 1;
export const CLR_GREEN = 2;
export const CLR_BROWN = 3;
export const CLR_BLUE = 4;
export const CLR_MAGENTA = 5;
export const CLR_CYAN = 6;
export const CLR_GRAY = 7;
export const CLR_ORANGE = 9;
export const CLR_BRIGHT_GREEN = 10;
export const CLR_YELLOW = 11;
export const CLR_BRIGHT_BLUE = 12;
export const CLR_BRIGHT_MAGENTA = 13;
export const CLR_BRIGHT_CYAN = 14;
export const CLR_WHITE = 15;
export const HI_DOMESTIC = 15;
export const HI_LORD = 5;
export const HI_OVERLORD = 13;
export const HI_METAL = 6;
export const HI_COPPER = 11;
export const HI_SILVER = 7;
export const HI_GOLD = 11;
export const HI_LEATHER = 3;
export const HI_CLOTH = 3;
export const HI_ORGANIC = 3;
export const HI_WOOD = 3;
export const HI_PAPER = 15;
export const HI_GLASS = 14;
export const HI_MINERAL = 7;
export const HI_ZAP = 12;

/* include/defsym.h: monster class symbols (include/sym.h enum values + letters) */
export const S_ANT = 1; // 'a'
export const S_BLOB = 2; // 'b'
export const S_COCKATRICE = 3; // 'c'
export const S_DOG = 4; // 'd'
export const S_EYE = 5; // 'e'
export const S_FELINE = 6; // 'f'
export const S_GREMLIN = 7; // 'g'
export const S_HUMANOID = 8; // 'h'
export const S_IMP = 9; // 'i'
export const S_JELLY = 10; // 'j'
export const S_KOBOLD = 11; // 'k'
export const S_LEPRECHAUN = 12; // 'l'
export const S_MIMIC = 13; // 'm'
export const S_NYMPH = 14; // 'n'
export const S_ORC = 15; // 'o'
export const S_PIERCER = 16; // 'p'
export const S_QUADRUPED = 17; // 'q'
export const S_RODENT = 18; // 'r'
export const S_SPIDER = 19; // 's'
export const S_TRAPPER = 20; // 't'
export const S_UNICORN = 21; // 'u'
export const S_VORTEX = 22; // 'v'
export const S_WORM = 23; // 'w'
export const S_XAN = 24; // 'x'
export const S_LIGHT = 25; // 'y'
export const S_ZRUTY = 26; // 'z'
export const S_ANGEL = 27; // 'A'
export const S_BAT = 28; // 'B'
export const S_CENTAUR = 29; // 'C'
export const S_DRAGON = 30; // 'D'
export const S_ELEMENTAL = 31; // 'E'
export const S_FUNGUS = 32; // 'F'
export const S_GNOME = 33; // 'G'
export const S_GIANT = 34; // 'H'
export const S_invisible = 35; // 'I'
export const S_JABBERWOCK = 36; // 'J'
export const S_KOP = 37; // 'K'
export const S_LICH = 38; // 'L'
export const S_MUMMY = 39; // 'M'
export const S_NAGA = 40; // 'N'
export const S_OGRE = 41; // 'O'
export const S_PUDDING = 42; // 'P'
export const S_QUANTMECH = 43; // 'Q'
export const S_RUSTMONST = 44; // 'R'
export const S_SNAKE = 45; // 'S'
export const S_TROLL = 46; // 'T'
export const S_UMBER = 47; // 'U'
export const S_VAMPIRE = 48; // 'V'
export const S_WRAITH = 49; // 'W'
export const S_XORN = 50; // 'X'
export const S_YETI = 51; // 'Y'
export const S_ZOMBIE = 52; // 'Z'
export const S_HUMAN = 53; // '@'
export const S_GHOST = 54; // ' '
export const S_GOLEM = 55; // '\''
export const S_DEMON = 56; // '&'
export const S_EEL = 57; // ';'
export const S_LIZARD = 58; // ':'
export const S_WORM_TAIL = 59; // '~'
export const S_MIMIC_DEF = 60; // ']'

/*
 * The monster table(s): mons[] in EXACT C order (include/monsters.h as included
 * by src/monst.c). Index matches the C enum monnums value (PM_GIANT_ANT = 0 ...
 * PM_APPRENTICE = NUMMONS-1). Each entry is a plain object mirroring
 * struct permonst (include/permonst.h):
 *
 *   name        display name (NAM(x) -> x; NAMS(m,f,n) -> n, see names below)
 *   names       null, or [male, female, neutral] for NAMS() monsters
 *   sym         S_* class display letter (include/defsym.h MONSYM 'ch' column)
 *   mlet        S_* class number (include/sym.h enum; same as defsym.h idx)
 *   lvl         mlevel: base monster level
 *   mmove       move rate (NORMAL_SPEED == 12)
 *   ac          base armor class
 *   mr          base magic resistance (0..127)
 *   align       maligntyp (align.h: A_NONE == -128, A_CHAOTIC == -1, ...)
 *   geno        creation/geno mask (G_* bits | frequency 0..7)
 *   attacks     mattk[6]: { aatyp: AT_*, adtyp: AD_*, damn, damd }
 *               NO_ATTK (src/monst.c) -> { aatyp: 0, adtyp: 0, damn: 0, damd: 0 }
 *   weight      cwt: corpse weight (WT_* values from include/weight.h inlined)
 *   nutrition   cnutrit
 *   sound       msound (MS_*)
 *   size        msize (MZ_*)
 *   mres        mresists (MR_* | MR2_* mask)
 *   cres        mconveys (MR_* | MR2_* mask)
 *   m1/m2/m3    mflags1/2/3 (M1_* | M2_* | M3_* masks, UNSIGNED; sign bit possible)
 *   difficulty  makedefs-computed toughness
 *   color       mcolor (CLR_* and HI_* codes)
 *   pm          pmidx: this entry's C enum value (== its index in MONS)
 */
function mkAttack(aatyp, adtyp, damn, damd) {
    return { aatyp, adtyp, damn, damd };
}
function mkMon(pm, bn, name, names, sym, mlet, lvl, mmove, ac, mr, align, geno,
               attacks, weight, nutrition, sound, size, mres, cres,
               m1, m2, m3, difficulty, color) {
    return { pm, bn, name, names, sym, mlet, lvl, mmove, ac, mr, align, geno,
             attacks, weight, nutrition, sound, size, mres, cres,
             m1, m2, m3, difficulty, color };
}
const NO_ATTK = () => mkAttack(0, 0, 0, 0); /* src/monst.c: #define NO_ATTK {0,0,0,0} */
export const MONS = [
    mkMon(0, 'PM_GIANT_ANT', /* giant ant */
        'giant ant', null, 'a', 1,
        2, 18, 3, 0, 0, 0x00A3,
        [mkAttack(2, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        10, 10, 0, 0,
        0x0, 0x0,
        0x20442000 >>> 0, 0x00100000 >>> 0, 0x0000,
        4, 3),
    mkMon(1, 'PM_KILLER_BEE', /* killer bee */
        'killer bee', null, 'a', 1,
        1, 18, -1, 0, 0, 0x0062,
        [mkAttack(6, 7, 1, 3), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1, 5, 10, 0,
        0x20, 0x20,
        0x10042001 >>> 0, 0x00120000 >>> 0, 0x0000,
        6, 11),
    mkMon(2, 'PM_SOLDIER_ANT', /* soldier ant */
        'soldier ant', null, 'a', 1,
        3, 18, 3, 0, 0, 0x00A2,
        [mkAttack(2, 0, 2, 4), mkAttack(6, 7, 3, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        20, 5, 0, 0,
        0x20, 0x20,
        0x30442000 >>> 0, 0x00100000 >>> 0, 0x0000,
        7, 4),
    mkMon(3, 'PM_FIRE_ANT', /* fire ant */
        'fire ant', null, 'a', 1,
        3, 18, 3, 10, 0, 0x00A1,
        [mkAttack(2, 0, 2, 4), mkAttack(2, 2, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        30, 10, 0, 0,
        0x1, 0x1,
        0x20442000 >>> 0, 0x00100000 >>> 0, 0x0200,
        6, 1),
    mkMon(4, 'PM_GIANT_BEETLE', /* giant beetle */
        'giant beetle', null, 'a', 1,
        5, 6, 4, 0, 0, 0x0023,
        [mkAttack(2, 0, 3, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        200, 50, 0, 3,
        0x20, 0x20,
        0x30042000 >>> 0, 0x00100000 >>> 0, 0x0000,
        6, 0),
    mkMon(5, 'PM_QUEEN_BEE', /* queen bee */
        'queen bee', null, 'a', 1,
        9, 24, -4, 0, 0, 0x0220,
        [mkAttack(6, 7, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1, 5, 10, 0,
        0x20, 0x20,
        0x10442001 >>> 0, 0x00120800 >>> 0, 0x0000,
        12, 5),
    mkMon(6, 'PM_ACID_BLOB', /* acid blob */
        'acid blob', null, 'b', 2,
        1, 3, 8, 0, 0, 0x0022,
        [mkAttack(0, 8, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        30, 10, 0, 0,
        0xE4, 0xC0,
        0x0801F404 >>> 0, 0x00840000 >>> 0, 0x0000,
        2, 2),
    mkMon(7, 'PM_QUIVERING_BLOB', /* quivering blob */
        'quivering blob', null, 'b', 2,
        5, 1, 8, 0, 0, 0x0022,
        [mkAttack(5, 0, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        200, 100, 0, 1,
        0x24, 0x20,
        0x0001F000 >>> 0, 0x00940000 >>> 0, 0x0000,
        6, 15),
    mkMon(8, 'PM_GELATINOUS_CUBE', /* gelatinous cube */
        'gelatinous cube', null, 'b', 2,
        6, 6, 8, 0, 0, 0x0022,
        [mkAttack(5, 14, 2, 4), mkAttack(0, 14, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        600, 150, 0, 3,
        0xF7, 0x17,
        0x6801F000 >>> 0, 0x00940000 >>> 0, 0x0000,
        8, 6),
    mkMon(9, 'PM_CHICKATRICE', /* chickatrice */
        'chickatrice', null, 'c', 3,
        4, 4, 8, 30, 0, 0x00A1,
        [mkAttack(2, 0, 1, 2), mkAttack(5, 18, 0, 0), mkAttack(0, 18, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        10, 10, 9, 0,
        0xA0, 0xA0,
        0x60042000 >>> 0, 0x00100000 >>> 0, 0x0200,
        7, 3),
    mkMon(10, 'PM_COCKATRICE', /* cockatrice */
        'cockatrice', null, 'c', 3,
        5, 6, 6, 30, 0, 0x0025,
        [mkAttack(2, 0, 1, 3), mkAttack(5, 18, 0, 0), mkAttack(0, 18, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        30, 30, 9, 1,
        0xA0, 0xA0,
        0x60442000 >>> 0, 0x00100000 >>> 0, 0x0200,
        8, 11),
    mkMon(11, 'PM_PYROLISK', /* pyrolisk */
        'pyrolisk', null, 'c', 3,
        6, 6, 6, 30, 0, 0x0021,
        [mkAttack(15, 2, 2, 6), mkAttack(2, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        30, 30, 9, 1,
        0x21, 0x21,
        0x60442000 >>> 0, 0x00100000 >>> 0, 0x0200,
        8, 1),
    mkMon(12, 'PM_JACKAL', /* jackal */
        'jackal', null, 'd', 4,
        0, 12, 7, 0, 0, 0x00A3,
        [mkAttack(2, 0, 1, 2), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        300, 250, 1, 1,
        0x0, 0x0,
        0x20042000 >>> 0, 0x00100000 >>> 0, 0x0200,
        1, 3),
    mkMon(13, 'PM_FOX', /* fox */
        'fox', null, 'd', 4,
        0, 15, 7, 0, 0, 0x0021,
        [mkAttack(2, 0, 1, 3), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        300, 250, 1, 1,
        0x0, 0x0,
        0x20042000 >>> 0, 0x00100000 >>> 0, 0x0200,
        1, 1),
    mkMon(14, 'PM_COYOTE', /* coyote */
        'coyote', null, 'd', 4,
        1, 12, 7, 0, 0, 0x00A1,
        [mkAttack(2, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        300, 250, 1, 1,
        0x0, 0x0,
        0x20042000 >>> 0, 0x00100000 >>> 0, 0x0200,
        2, 3),
    mkMon(15, 'PM_WEREJACKAL', /* werejackal */
        'werejackal', null, 'd', 4,
        2, 12, 7, 10, -7, 0x0210,
        [mkAttack(2, 29, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        300, 250, 1, 1,
        0x20, 0x0,
        0x30802000 >>> 0, 0x00100005 >>> 0, 0x0200,
        4, 3),
    mkMon(16, 'PM_LITTLE_DOG', /* little dog */
        'little dog', null, 'd', 4,
        2, 18, 6, 0, 0, 0x0021,
        [mkAttack(2, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        150, 150, 1, 1,
        0x0, 0x0,
        0x20042000 >>> 0, 0x00400000 >>> 0, 0x0200,
        3, 15),
    mkMon(17, 'PM_DINGO', /* dingo */
        'dingo', null, 'd', 4,
        4, 16, 5, 0, 0, 0x0021,
        [mkAttack(2, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        400, 200, 1, 2,
        0x0, 0x0,
        0x20042000 >>> 0, 0x00100000 >>> 0, 0x0200,
        5, 11),
    mkMon(18, 'PM_DOG', /* dog */
        'dog', null, 'd', 4,
        4, 16, 5, 0, 0, 0x0021,
        [mkAttack(2, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        400, 200, 1, 2,
        0x0, 0x0,
        0x20042000 >>> 0, 0x00400000 >>> 0, 0x0200,
        5, 15),
    mkMon(19, 'PM_LARGE_DOG', /* large dog */
        'large dog', null, 'd', 4,
        6, 15, 4, 0, 0, 0x0021,
        [mkAttack(2, 0, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        800, 250, 1, 2,
        0x0, 0x0,
        0x20042000 >>> 0, 0x04400000 >>> 0, 0x0200,
        7, 15),
    mkMon(20, 'PM_WOLF', /* wolf */
        'wolf', null, 'd', 4,
        5, 12, 4, 0, 0, 0x00A2,
        [mkAttack(2, 0, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        500, 250, 1, 2,
        0x0, 0x0,
        0x20042000 >>> 0, 0x00100000 >>> 0, 0x0200,
        6, 7),
    mkMon(21, 'PM_WEREWOLF', /* werewolf */
        'werewolf', null, 'd', 4,
        5, 12, 4, 20, -7, 0x0210,
        [mkAttack(2, 29, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        500, 250, 1, 2,
        0x20, 0x0,
        0x30802000 >>> 0, 0x00100005 >>> 0, 0x0200,
        7, 7),
    mkMon(22, 'PM_WINTER_WOLF_CUB', /* winter wolf cub */
        'winter wolf cub', null, 'd', 4,
        5, 12, 4, 0, 0, 0x08A2,
        [mkAttack(2, 0, 1, 8), mkAttack(12, 3, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        250, 200, 1, 1,
        0x2, 0x2,
        0x20042000 >>> 0, 0x00100000 >>> 0, 0x0000,
        7, 6),
    mkMon(23, 'PM_WARG', /* warg */
        'warg', null, 'd', 4,
        7, 12, 4, 0, -5, 0x00A2,
        [mkAttack(2, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        850, 350, 1, 2,
        0x0, 0x0,
        0x20042000 >>> 0, 0x00100000 >>> 0, 0x0200,
        8, 0),
    mkMon(24, 'PM_WINTER_WOLF', /* winter wolf */
        'winter wolf', null, 'd', 4,
        7, 12, 4, 20, -5, 0x0821,
        [mkAttack(2, 0, 2, 6), mkAttack(12, 3, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        700, 300, 1, 3,
        0x2, 0x2,
        0x20042000 >>> 0, 0x04100000 >>> 0, 0x0000,
        9, 6),
    mkMon(25, 'PM_HELL_HOUND_PUP', /* hell hound pup */
        'hell hound pup', null, 'd', 4,
        7, 12, 4, 20, 0, 0x04A1,
        [mkAttack(2, 0, 2, 6), mkAttack(12, 2, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        200, 200, 1, 1,
        0x1, 0x1,
        0x20042000 >>> 0, 0x00100000 >>> 0, 0x0200,
        9, 1),
    mkMon(26, 'PM_HELL_HOUND', /* hell hound */
        'hell hound', null, 'd', 4,
        12, 14, 2, 20, -5, 0x0421,
        [mkAttack(2, 0, 3, 6), mkAttack(12, 2, 3, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        600, 300, 1, 2,
        0x1, 0x1,
        0x20042000 >>> 0, 0x04100000 >>> 0, 0x0200,
        14, 1),
    mkMon(27, 'PM_GAS_SPORE', /* gas spore */
        'gas spore', null, 'e', 5,
        1, 3, 10, 0, 0, 0x0031,
        [mkAttack(14, 0, 4, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        10, 10, 0, 1,
        0x0, 0x0,
        0x0001E401 >>> 0, 0x00140000 >>> 0, 0x0000,
        2, 7),
    mkMon(28, 'PM_FLOATING_EYE', /* floating eye */
        'floating eye', null, 'e', 5,
        2, 1, 9, 10, 0, 0x0025,
        [mkAttack(0, 14, 0, 70), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        10, 10, 0, 1,
        0x0, 0x0,
        0x0000EA01 >>> 0, 0x00140000 >>> 0, 0x0200,
        3, 4),
    mkMon(29, 'PM_FREEZING_SPHERE', /* freezing sphere */
        'freezing sphere', null, 'e', 5,
        6, 13, 4, 0, 0, 0x0832,
        [mkAttack(13, 3, 4, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        10, 10, 0, 1,
        0x2, 0x2,
        0x0001EC01 >>> 0, 0x00140000 >>> 0, 0x0200,
        9, 15),
    mkMon(30, 'PM_FLAMING_SPHERE', /* flaming sphere */
        'flaming sphere', null, 'e', 5,
        6, 13, 4, 0, 0, 0x0032,
        [mkAttack(13, 2, 4, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        10, 10, 0, 1,
        0x1, 0x1,
        0x0001EC01 >>> 0, 0x00140000 >>> 0, 0x0200,
        9, 1),
    mkMon(31, 'PM_SHOCKING_SPHERE', /* shocking sphere */
        'shocking sphere', null, 'e', 5,
        6, 13, 4, 0, 0, 0x0032,
        [mkAttack(13, 6, 4, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        10, 10, 0, 1,
        0x10, 0x10,
        0x0001EC01 >>> 0, 0x00140000 >>> 0, 0x0200,
        10, 12),
    mkMon(32, 'PM_KITTEN', /* kitten */
        'kitten', null, 'f', 6,
        2, 18, 6, 0, 0, 0x0021,
        [mkAttack(2, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        150, 150, 2, 1,
        0x0, 0x0,
        0x20042000 >>> 0, 0x00C00000 >>> 0, 0x0300,
        3, 15),
    mkMon(33, 'PM_HOUSECAT', /* housecat */
        'housecat', null, 'f', 6,
        4, 16, 5, 0, 0, 0x0021,
        [mkAttack(2, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        200, 200, 2, 1,
        0x0, 0x0,
        0x20042000 >>> 0, 0x00400000 >>> 0, 0x0300,
        5, 15),
    mkMon(34, 'PM_JAGUAR', /* jaguar */
        'jaguar', null, 'f', 6,
        4, 15, 6, 0, 0, 0x0022,
        [mkAttack(1, 0, 1, 4), mkAttack(1, 0, 1, 4), mkAttack(2, 0, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        600, 300, 5, 3,
        0x0, 0x0,
        0x20042000 >>> 0, 0x00100000 >>> 0, 0x0300,
        6, 3),
    mkMon(35, 'PM_LYNX', /* lynx */
        'lynx', null, 'f', 6,
        5, 15, 6, 0, 0, 0x0021,
        [mkAttack(1, 0, 1, 4), mkAttack(1, 0, 1, 4), mkAttack(2, 0, 1, 10), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        600, 300, 5, 1,
        0x0, 0x0,
        0x20042000 >>> 0, 0x00100000 >>> 0, 0x0300,
        7, 6),
    mkMon(36, 'PM_PANTHER', /* panther */
        'panther', null, 'f', 6,
        5, 15, 6, 0, 0, 0x0021,
        [mkAttack(1, 0, 1, 6), mkAttack(1, 0, 1, 6), mkAttack(2, 0, 1, 10), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        600, 300, 5, 3,
        0x0, 0x0,
        0x20042000 >>> 0, 0x00100000 >>> 0, 0x0300,
        7, 0),
    mkMon(37, 'PM_LARGE_CAT', /* large cat */
        'large cat', null, 'f', 6,
        6, 15, 4, 0, 0, 0x0021,
        [mkAttack(2, 0, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        250, 250, 2, 1,
        0x0, 0x0,
        0x20042000 >>> 0, 0x04400000 >>> 0, 0x0300,
        7, 15),
    mkMon(38, 'PM_TIGER', /* tiger */
        'tiger', null, 'f', 6,
        6, 12, 6, 0, 0, 0x0022,
        [mkAttack(1, 0, 2, 4), mkAttack(1, 0, 2, 4), mkAttack(2, 0, 1, 10), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        600, 300, 5, 3,
        0x0, 0x0,
        0x20042000 >>> 0, 0x00100000 >>> 0, 0x0300,
        8, 11),
    mkMon(39, 'PM_DISPLACER_BEAST', /* displacer beast */
        'displacer beast', null, 'f', 6,
        12, 12, -10, 0, -3, 0x0021,
        [mkAttack(1, 0, 4, 4), mkAttack(1, 0, 4, 4), mkAttack(2, 0, 2, 10), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        750, 400, 5, 3,
        0x0, 0x0,
        0x20042000 >>> 0, 0x02100000 >>> 0, 0x0700,
        14, 4),
    mkMon(40, 'PM_GREMLIN', /* gremlin */
        'gremlin', null, 'g', 7,
        5, 12, 2, 25, -9, 0x0022,
        [mkAttack(1, 0, 1, 6), mkAttack(1, 0, 1, 6), mkAttack(2, 0, 1, 4), mkAttack(1, 253, 0, 0), NO_ATTK(), NO_ATTK()],
        100, 20, 20, 1,
        0x20, 0x20,
        0x10020002 >>> 0, 0x01000000 >>> 0, 0x0200,
        8, 2),
    mkMon(41, 'PM_GARGOYLE', /* gargoyle */
        'gargoyle', null, 'g', 7,
        6, 10, -4, 0, -9, 0x0022,
        [mkAttack(1, 0, 2, 6), mkAttack(1, 0, 2, 6), mkAttack(2, 0, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1000, 200, 11, 2,
        0x80, 0x80,
        0x00220400 >>> 0, 0x04100000 >>> 0, 0x0000,
        8, 3),
    mkMon(42, 'PM_WINGED_GARGOYLE', /* winged gargoyle */
        'winged gargoyle', null, 'g', 7,
        9, 15, -2, 0, -12, 0x0021,
        [mkAttack(1, 0, 3, 6), mkAttack(1, 0, 3, 6), mkAttack(2, 0, 3, 4), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1200, 300, 11, 2,
        0x80, 0x80,
        0x00620401 >>> 0, 0x84100400 >>> 0, 0x0000,
        11, 5),
    mkMon(43, 'PM_HOBBIT', /* hobbit */
        'hobbit', null, 'h', 8,
        1, 9, 10, 0, 6, 0x0022,
        [mkAttack(254, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        500, 200, 25, 1,
        0x0, 0x0,
        0x60020000 >>> 0, 0x40000000 >>> 0, 0x0300,
        2, 2),
    mkMon(44, 'PM_DWARF', /* dwarf */
        'dwarf', null, 'h', 8,
        2, 6, 10, 10, 4, 0x0023,
        [mkAttack(254, 0, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        900, 300, 25, 2,
        0x0, 0x0,
        0x60020060 >>> 0, 0x74000020 >>> 0, 0x0300,
        4, 1),
    mkMon(45, 'PM_BUGBEAR', /* bugbear */
        'bugbear', null, 'h', 8,
        3, 9, 5, 0, -6, 0x0021,
        [mkAttack(254, 0, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1250, 250, 5, 3,
        0x0, 0x0,
        0x60020000 >>> 0, 0x44000000 >>> 0, 0x0300,
        5, 3),
    mkMon(46, 'PM_DWARF_LEADER', /* dwarf leader */
        'dwarf leader', ['dwarf lord', 'dwarf lady', 'dwarf leader'], 'h', 8,
        4, 6, 10, 10, 5, 0x0022,
        [mkAttack(254, 0, 2, 4), mkAttack(254, 0, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        900, 300, 25, 2,
        0x0, 0x0,
        0x60020060 >>> 0, 0x74000420 >>> 0, 0x0300,
        6, 4),
    mkMon(47, 'PM_DWARF_RULER', /* dwarf ruler */
        'dwarf ruler', ['dwarf king', 'dwarf queen', 'dwarf ruler'], 'h', 8,
        6, 6, 10, 20, 6, 0x0021,
        [mkAttack(254, 0, 2, 6), mkAttack(254, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        900, 300, 25, 2,
        0x0, 0x0,
        0x60020060 >>> 0, 0x74000820 >>> 0, 0x0300,
        8, 5),
    mkMon(48, 'PM_MIND_FLAYER', /* mind flayer */
        'mind flayer', null, 'h', 8,
        9, 12, 5, 90, -8, 0x0021,
        [mkAttack(254, 0, 1, 4), mkAttack(16, 32, 2, 1), mkAttack(16, 32, 2, 1), mkAttack(16, 32, 2, 1), NO_ATTK(), NO_ATTK()],
        1450, 400, 9, 2,
        0x0, 0x0,
        0x61020001 >>> 0, 0x72100000 >>> 0, 0x0300,
        13, 13),
    mkMon(49, 'PM_MASTER_MIND_FLAYER', /* master mind flayer */
        'master mind flayer', null, 'h', 8,
        13, 12, 0, 90, -8, 0x0021,
        [mkAttack(254, 0, 1, 8), mkAttack(16, 32, 2, 1), mkAttack(16, 32, 2, 1), mkAttack(16, 32, 2, 1), mkAttack(16, 32, 2, 1), mkAttack(16, 32, 2, 1)],
        1450, 400, 9, 2,
        0x0, 0x0,
        0x61020001 >>> 0, 0x72100000 >>> 0, 0x0300,
        19, 13),
    mkMon(50, 'PM_MANES', /* manes */
        'manes', null, 'i', 9,
        1, 3, 7, 0, -7, 0x0071,
        [mkAttack(1, 0, 1, 3), mkAttack(1, 0, 1, 3), mkAttack(2, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        100, 100, 0, 1,
        0x24, 0x0,
        0x10000000 >>> 0, 0x01100000 >>> 0, 0x0300,
        3, 1),
    mkMon(51, 'PM_HOMUNCULUS', /* homunculus */
        'homunculus', null, 'i', 9,
        2, 12, 6, 10, -7, 0x0022,
        [mkAttack(2, 4, 1, 3), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        60, 100, 0, 0,
        0x24, 0x24,
        0x10000001 >>> 0, 0x01000000 >>> 0, 0x0300,
        3, 2),
    mkMon(52, 'PM_IMP', /* imp */
        'imp', null, 'i', 9,
        3, 12, 2, 20, -7, 0x0021,
        [mkAttack(1, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        20, 10, 34, 0,
        0x0, 0x0,
        0x00800000 >>> 0, 0x01800000 >>> 0, 0x0300,
        4, 1),
    mkMon(53, 'PM_LEMURE', /* lemure */
        'lemure', null, 'i', 9,
        3, 3, 7, 0, -7, 0x0471,
        [mkAttack(1, 0, 1, 3), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        150, 100, 0, 2,
        0x24, 0x4,
        0x10800000 >>> 0, 0x01940000 >>> 0, 0x0300,
        5, 3),
    mkMon(54, 'PM_QUASIT', /* quasit */
        'quasit', null, 'i', 9,
        3, 15, 2, 20, -7, 0x0022,
        [mkAttack(1, 30, 1, 2), mkAttack(1, 30, 1, 2), mkAttack(2, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        200, 200, 0, 1,
        0x20, 0x20,
        0x00800000 >>> 0, 0x01000000 >>> 0, 0x0300,
        7, 4),
    mkMon(55, 'PM_TENGU', /* tengu */
        'tengu', null, 'i', 9,
        6, 13, 5, 30, 7, 0x0023,
        [mkAttack(2, 0, 1, 7), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        300, 200, 7, 1,
        0x20, 0x20,
        0x06000000 >>> 0, 0x01000000 >>> 0, 0x0300,
        7, 6),
    mkMon(56, 'PM_BLUE_JELLY', /* blue jelly */
        'blue jelly', null, 'j', 10,
        4, 0, 8, 10, 0, 0x0022,
        [mkAttack(0, 3, 0, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        50, 20, 0, 2,
        0x22, 0x22,
        0x0001FC04 >>> 0, 0x00140000 >>> 0, 0x0000,
        5, 4),
    mkMon(57, 'PM_SPOTTED_JELLY', /* spotted jelly */
        'spotted jelly', null, 'j', 10,
        5, 0, 8, 10, 0, 0x0021,
        [mkAttack(0, 8, 0, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        50, 20, 0, 2,
        0xC0, 0xC0,
        0x0801FC04 >>> 0, 0x00140000 >>> 0, 0x0000,
        6, 2),
    mkMon(58, 'PM_OCHRE_JELLY', /* ochre jelly */
        'ochre jelly', null, 'j', 10,
        6, 3, 8, 20, 0, 0x0022,
        [mkAttack(11, 8, 3, 6), mkAttack(0, 8, 3, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        50, 20, 0, 2,
        0xC0, 0xC0,
        0x0801FC04 >>> 0, 0x00140000 >>> 0, 0x0000,
        8, 3),
    mkMon(59, 'PM_KOBOLD', /* kobold */
        'kobold', null, 'k', 11,
        0, 6, 10, 0, -2, 0x0021,
        [mkAttack(254, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        400, 100, 24, 1,
        0x20, 0x0,
        0x70020000 >>> 0, 0x40100000 >>> 0, 0x0300,
        1, 3),
    mkMon(60, 'PM_LARGE_KOBOLD', /* large kobold */
        'large kobold', null, 'k', 11,
        1, 6, 10, 0, -3, 0x0021,
        [mkAttack(254, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        450, 150, 24, 1,
        0x20, 0x0,
        0x70020000 >>> 0, 0x40100000 >>> 0, 0x0300,
        2, 1),
    mkMon(61, 'PM_KOBOLD_LEADER', /* kobold leader */
        'kobold leader', ['kobold lord', 'kobold lady', 'kobold leader'], 'k', 11,
        2, 6, 10, 0, -4, 0x0021,
        [mkAttack(254, 0, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        500, 200, 24, 1,
        0x20, 0x0,
        0x70020000 >>> 0, 0x40100400 >>> 0, 0x0300,
        3, 5),
    mkMon(62, 'PM_KOBOLD_SHAMAN', /* kobold shaman */
        'kobold shaman', null, 'k', 11,
        2, 6, 6, 10, -4, 0x0021,
        [mkAttack(255, 241, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        450, 150, 24, 1,
        0x20, 0x0,
        0x70020000 >>> 0, 0x80100000 >>> 0, 0x0300,
        4, 12),
    mkMon(63, 'PM_LEPRECHAUN', /* leprechaun */
        'leprechaun', null, 'l', 12,
        5, 15, 8, 20, 0, 0x0024,
        [mkAttack(1, 20, 1, 2), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        60, 30, 20, 0,
        0x0, 0x0,
        0x02020000 >>> 0, 0x10100000 >>> 0, 0x0200,
        4, 2),
    mkMon(64, 'PM_SMALL_MIMIC', /* small mimic */
        'small mimic', null, 'm', 13,
        7, 3, 7, 0, 0, 0x0022,
        [mkAttack(1, 0, 3, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        300, 200, 0, 2,
        0x40, 0x0,
        0x2024F504 >>> 0, 0x00100000 >>> 0, 0x0000,
        8, 3),
    mkMon(65, 'PM_LARGE_MIMIC', /* large mimic */
        'large mimic', null, 'm', 13,
        8, 3, 7, 10, 0, 0x0021,
        [mkAttack(1, 19, 3, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        600, 400, 0, 3,
        0x40, 0x0,
        0x2024F514 >>> 0, 0x04100000 >>> 0, 0x0000,
        9, 1),
    mkMon(66, 'PM_GIANT_MIMIC', /* giant mimic */
        'giant mimic', null, 'm', 13,
        9, 3, 7, 20, 0, 0x0021,
        [mkAttack(1, 19, 3, 6), mkAttack(1, 19, 3, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        800, 500, 0, 3,
        0x40, 0x0,
        0x2024F514 >>> 0, 0x04100000 >>> 0, 0x0000,
        11, 5),
    mkMon(67, 'PM_WOOD_NYMPH', /* wood nymph */
        'wood nymph', null, 'n', 14,
        3, 12, 9, 20, 0, 0x0022,
        [mkAttack(1, 21, 0, 0), mkAttack(1, 22, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        600, 300, 31, 2,
        0x0, 0x0,
        0x02020000 >>> 0, 0x40120000 >>> 0, 0x0200,
        5, 2),
    mkMon(68, 'PM_WATER_NYMPH', /* water nymph */
        'water nymph', null, 'n', 14,
        3, 12, 9, 20, 0, 0x0022,
        [mkAttack(1, 21, 0, 0), mkAttack(1, 22, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        600, 300, 31, 2,
        0x0, 0x0,
        0x02020002 >>> 0, 0x40120000 >>> 0, 0x0200,
        5, 4),
    mkMon(69, 'PM_MOUNTAIN_NYMPH', /* mountain nymph */
        'mountain nymph', null, 'n', 14,
        3, 12, 9, 20, 0, 0x0022,
        [mkAttack(1, 21, 0, 0), mkAttack(1, 22, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        600, 300, 31, 2,
        0x0, 0x0,
        0x02020000 >>> 0, 0x40120000 >>> 0, 0x0200,
        5, 3),
    mkMon(70, 'PM_GOBLIN', /* goblin */
        'goblin', null, 'o', 15,
        0, 6, 10, 0, -3, 0x0022,
        [mkAttack(254, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        400, 100, 24, 1,
        0x0, 0x0,
        0x60020000 >>> 0, 0x40000080 >>> 0, 0x0300,
        1, 7),
    mkMon(71, 'PM_HOBGOBLIN', /* hobgoblin */
        'hobgoblin', null, 'o', 15,
        1, 9, 10, 0, -4, 0x0022,
        [mkAttack(254, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1000, 200, 24, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x44000080 >>> 0, 0x0300,
        3, 3),
    mkMon(72, 'PM_ORC', /* orc */
        'orc', null, 'o', 15,
        1, 9, 10, 0, -3, 0x0260,
        [mkAttack(254, 0, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        850, 150, 24, 2,
        0x20, 0x0,
        0x60020000 >>> 0, 0x74000081 >>> 0, 0x0300,
        3, 1),
    mkMon(73, 'PM_HILL_ORC', /* hill orc */
        'hill orc', null, 'o', 15,
        2, 9, 10, 0, -4, 0x0062,
        [mkAttack(254, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1000, 200, 24, 2,
        0x20, 0x0,
        0x60020000 >>> 0, 0x74000080 >>> 0, 0x0300,
        4, 11),
    mkMon(74, 'PM_MORDOR_ORC', /* Mordor orc */
        'Mordor orc', null, 'o', 15,
        3, 5, 10, 0, -5, 0x0061,
        [mkAttack(254, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1200, 200, 24, 2,
        0x20, 0x0,
        0x60020000 >>> 0, 0x74000080 >>> 0, 0x0300,
        5, 4),
    mkMon(75, 'PM_URUK_HAI', /* Uruk-hai */
        'Uruk-hai', null, 'o', 15,
        3, 7, 10, 0, -4, 0x0061,
        [mkAttack(254, 0, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1300, 300, 24, 2,
        0x20, 0x0,
        0x60020000 >>> 0, 0x74000080 >>> 0, 0x0300,
        5, 0),
    mkMon(76, 'PM_ORC_SHAMAN', /* orc shaman */
        'orc shaman', null, 'o', 15,
        3, 9, 5, 10, -5, 0x0021,
        [mkAttack(255, 241, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1000, 300, 24, 2,
        0x20, 0x0,
        0x60020000 >>> 0, 0xB0000080 >>> 0, 0x0300,
        5, 12),
    mkMon(77, 'PM_ORC_CAPTAIN', /* orc-captain */
        'orc-captain', null, 'o', 15,
        5, 5, 10, 0, -5, 0x0021,
        [mkAttack(254, 0, 2, 4), mkAttack(254, 0, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1350, 350, 24, 2,
        0x20, 0x0,
        0x60020000 >>> 0, 0x74000080 >>> 0, 0x0300,
        7, 5),
    mkMon(78, 'PM_ROCK_PIERCER', /* rock piercer */
        'rock piercer', null, 'p', 16,
        3, 1, 3, 0, 0, 0x0024,
        [mkAttack(2, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        200, 200, 0, 1,
        0x0, 0x0,
        0x20047910 >>> 0, 0x00100000 >>> 0, 0x0000,
        4, 7),
    mkMon(79, 'PM_IRON_PIERCER', /* iron piercer */
        'iron piercer', null, 'p', 16,
        5, 1, 0, 0, 0, 0x0022,
        [mkAttack(2, 0, 3, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        400, 300, 0, 2,
        0x0, 0x0,
        0x20047910 >>> 0, 0x00100000 >>> 0, 0x0000,
        6, 6),
    mkMon(80, 'PM_GLASS_PIERCER', /* glass piercer */
        'glass piercer', null, 'p', 16,
        7, 1, 0, 0, 0, 0x0021,
        [mkAttack(2, 0, 4, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        400, 300, 0, 2,
        0x40, 0x0,
        0x20047910 >>> 0, 0x00100000 >>> 0, 0x0000,
        9, 15),
    mkMon(81, 'PM_ROTHE', /* rothe */
        'rothe', null, 'q', 17,
        2, 9, 7, 0, 0, 0x00A4,
        [mkAttack(1, 0, 1, 3), mkAttack(2, 0, 1, 3), mkAttack(2, 0, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        400, 100, 13, 3,
        0x0, 0x0,
        0x60042000 >>> 0, 0x00100000 >>> 0, 0x0200,
        4, 3),
    mkMon(82, 'PM_MUMAK', /* mumak */
        'mumak', null, 'q', 17,
        5, 9, 0, 0, -2, 0x0021,
        [mkAttack(4, 0, 4, 12), mkAttack(2, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2500, 500, 17, 3,
        0x0, 0x0,
        0x40242000 >>> 0, 0x04100000 >>> 0, 0x0200,
        7, 7),
    mkMon(83, 'PM_LEOCROTTA', /* leocrotta */
        'leocrotta', null, 'q', 17,
        6, 18, 4, 10, 0, 0x0022,
        [mkAttack(1, 0, 2, 6), mkAttack(2, 0, 2, 6), mkAttack(1, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1200, 500, 22, 3,
        0x0, 0x0,
        0x60042000 >>> 0, 0x04100000 >>> 0, 0x0200,
        8, 1),
    mkMon(84, 'PM_WUMPUS', /* wumpus */
        'wumpus', null, 'q', 17,
        8, 3, 2, 10, 0, 0x0021,
        [mkAttack(2, 0, 3, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2500, 500, 16, 3,
        0x0, 0x0,
        0x60042010 >>> 0, 0x04100000 >>> 0, 0x0200,
        9, 6),
    mkMon(85, 'PM_TITANOTHERE', /* titanothere */
        'titanothere', null, 'q', 17,
        12, 12, 6, 0, 0, 0x0022,
        [mkAttack(1, 0, 2, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2650, 650, 4, 3,
        0x0, 0x0,
        0x40242000 >>> 0, 0x04100000 >>> 0, 0x0200,
        13, 7),
    mkMon(86, 'PM_BALUCHITHERIUM', /* baluchitherium */
        'baluchitherium', null, 'q', 17,
        14, 12, 5, 0, 0, 0x0022,
        [mkAttack(1, 0, 5, 4), mkAttack(1, 0, 5, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        3800, 800, 4, 3,
        0x0, 0x0,
        0x40242000 >>> 0, 0x04100000 >>> 0, 0x0200,
        15, 7),
    mkMon(87, 'PM_MASTODON', /* mastodon */
        'mastodon', null, 'q', 17,
        20, 12, 5, 0, 0, 0x0021,
        [mkAttack(4, 0, 4, 8), mkAttack(4, 0, 4, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        3800, 800, 17, 3,
        0x0, 0x0,
        0x40242000 >>> 0, 0x04100000 >>> 0, 0x0200,
        22, 0),
    mkMon(88, 'PM_SEWER_RAT', /* sewer rat */
        'sewer rat', null, 'r', 18,
        0, 12, 7, 0, 0, 0x00A1,
        [mkAttack(2, 0, 1, 3), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        20, 12, 6, 0,
        0x0, 0x0,
        0x20042000 >>> 0, 0x00100000 >>> 0, 0x0200,
        1, 3),
    mkMon(89, 'PM_GIANT_RAT', /* giant rat */
        'giant rat', null, 'r', 18,
        1, 10, 7, 0, 0, 0x00A2,
        [mkAttack(2, 0, 1, 3), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        30, 30, 6, 0,
        0x0, 0x0,
        0x20042000 >>> 0, 0x00100000 >>> 0, 0x0200,
        2, 3),
    mkMon(90, 'PM_RABID_RAT', /* rabid rat */
        'rabid rat', null, 'r', 18,
        2, 12, 6, 0, 0, 0x0021,
        [mkAttack(2, 31, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        30, 5, 6, 0,
        0x20, 0x0,
        0x30042000 >>> 0, 0x00100000 >>> 0, 0x0200,
        4, 3),
    mkMon(91, 'PM_WERERAT', /* wererat */
        'wererat', null, 'r', 18,
        2, 12, 6, 10, -7, 0x0210,
        [mkAttack(2, 29, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        40, 30, 6, 0,
        0x20, 0x0,
        0x30802000 >>> 0, 0x00100005 >>> 0, 0x0200,
        4, 3),
    mkMon(92, 'PM_ROCK_MOLE', /* rock mole */
        'rock mole', null, 'r', 18,
        3, 3, 0, 20, 0, 0x0022,
        [mkAttack(2, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        30, 30, 0, 1,
        0x0, 0x0,
        0x80042020 >>> 0, 0x70100000 >>> 0, 0x0200,
        4, 7),
    mkMon(93, 'PM_WOODCHUCK', /* woodchuck */
        'woodchuck', null, 'r', 18,
        3, 3, 0, 20, 0, 0x0220,
        [mkAttack(2, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        30, 30, 0, 1,
        0x0, 0x0,
        0x40042022 >>> 0, 0x00900000 >>> 0, 0x0200,
        4, 3),
    mkMon(94, 'PM_CAVE_SPIDER', /* cave spider */
        'cave spider', null, 's', 19,
        1, 12, 3, 0, 0, 0x00A2,
        [mkAttack(2, 0, 1, 2), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        50, 50, 0, 0,
        0x20, 0x20,
        0x20442080 >>> 0, 0x00100000 >>> 0, 0x0000,
        3, 7),
    mkMon(95, 'PM_CENTIPEDE', /* centipede */
        'centipede', null, 's', 19,
        2, 4, 3, 0, 0, 0x0021,
        [mkAttack(2, 7, 1, 3), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        50, 50, 0, 0,
        0x20, 0x20,
        0x20442080 >>> 0, 0x00100000 >>> 0, 0x0000,
        4, 11),
    mkMon(96, 'PM_GIANT_SPIDER', /* giant spider */
        'giant spider', null, 's', 19,
        5, 15, 4, 0, 0, 0x0021,
        [mkAttack(2, 7, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        200, 100, 0, 3,
        0x20, 0x20,
        0x30442000 >>> 0, 0x04100000 >>> 0, 0x0000,
        7, 5),
    mkMon(97, 'PM_SCORPION', /* scorpion */
        'scorpion', null, 's', 19,
        5, 15, 3, 0, 0, 0x0022,
        [mkAttack(1, 0, 1, 2), mkAttack(1, 0, 1, 2), mkAttack(6, 7, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        50, 100, 0, 1,
        0x20, 0x20,
        0x30442080 >>> 0, 0x00100000 >>> 0, 0x0000,
        8, 1),
    mkMon(98, 'PM_LURKER_ABOVE', /* lurker above */
        'lurker above', null, 't', 20,
        10, 3, 3, 0, 0, 0x0022,
        [mkAttack(11, 28, 1, 6), mkAttack(11, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        800, 350, 0, 4,
        0x0, 0x0,
        0x2004F101 >>> 0, 0x05100000 >>> 0, 0x0000,
        12, 7),
    mkMon(99, 'PM_TRAPPER', /* trapper */
        'trapper', null, 't', 20,
        12, 3, 3, 0, 0, 0x0022,
        [mkAttack(11, 28, 1, 8), mkAttack(11, 0, 2, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        800, 350, 0, 4,
        0x0, 0x0,
        0x2004F100 >>> 0, 0x05100000 >>> 0, 0x0000,
        14, 2),
    mkMon(100, 'PM_PONY', /* pony */
        'pony', null, 'u', 21,
        3, 16, 6, 0, 0, 0x0022,
        [mkAttack(3, 0, 1, 6), mkAttack(2, 0, 1, 2), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1300, 250, 12, 2,
        0x0, 0x0,
        0x40042000 >>> 0, 0x04C00000 >>> 0, 0x0200,
        4, 3),
    mkMon(101, 'PM_WHITE_UNICORN', /* white unicorn */
        'white unicorn', null, 'u', 21,
        4, 24, 2, 70, 7, 0x0022,
        [mkAttack(4, 0, 1, 12), mkAttack(3, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1300, 300, 12, 3,
        0x20, 0x20,
        0x40002000 >>> 0, 0x24800000 >>> 0, 0x0200,
        6, 15),
    mkMon(102, 'PM_GRAY_UNICORN', /* gray unicorn */
        'gray unicorn', null, 'u', 21,
        4, 24, 2, 70, 0, 0x0021,
        [mkAttack(4, 0, 1, 12), mkAttack(3, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1300, 300, 12, 3,
        0x20, 0x20,
        0x40002000 >>> 0, 0x24800000 >>> 0, 0x0200,
        6, 7),
    mkMon(103, 'PM_BLACK_UNICORN', /* black unicorn */
        'black unicorn', null, 'u', 21,
        4, 24, 2, 70, -7, 0x0021,
        [mkAttack(4, 0, 1, 12), mkAttack(3, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1300, 300, 12, 3,
        0x20, 0x20,
        0x40002000 >>> 0, 0x24800000 >>> 0, 0x0200,
        6, 0),
    mkMon(104, 'PM_HORSE', /* horse */
        'horse', null, 'u', 21,
        5, 20, 5, 0, 0, 0x0022,
        [mkAttack(3, 0, 1, 8), mkAttack(2, 0, 1, 3), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1500, 300, 12, 3,
        0x0, 0x0,
        0x40042000 >>> 0, 0x04C00000 >>> 0, 0x0200,
        7, 3),
    mkMon(105, 'PM_WARHORSE', /* warhorse */
        'warhorse', null, 'u', 21,
        7, 24, 4, 0, 0, 0x0022,
        [mkAttack(3, 0, 1, 10), mkAttack(2, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1800, 350, 12, 3,
        0x0, 0x0,
        0x40042000 >>> 0, 0x04C00000 >>> 0, 0x0200,
        9, 3),
    mkMon(106, 'PM_FOG_CLOUD', /* fog cloud */
        'fog cloud', null, 'v', 22,
        3, 1, 0, 0, 0, 0x0032,
        [mkAttack(11, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        0, 0, 0, 4,
        0xA4, 0x0,
        0x0011F405 >>> 0, 0x00140000 >>> 0, 0x0000,
        4, 7),
    mkMon(107, 'PM_DUST_VORTEX', /* dust vortex */
        'dust vortex', null, 'v', 22,
        4, 20, 2, 30, 0, 0x0032,
        [mkAttack(11, 11, 2, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        0, 0, 0, 4,
        0xA4, 0x0,
        0x0001F401 >>> 0, 0x00140000 >>> 0, 0x0000,
        6, 3),
    mkMon(108, 'PM_ICE_VORTEX', /* ice vortex */
        'ice vortex', null, 'v', 22,
        5, 20, 2, 30, 0, 0x0831,
        [mkAttack(11, 3, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        0, 0, 0, 4,
        0xA6, 0x0,
        0x0001F401 >>> 0, 0x00140000 >>> 0, 0x0200,
        7, 6),
    mkMon(109, 'PM_ENERGY_VORTEX', /* energy vortex */
        'energy vortex', null, 'v', 22,
        6, 20, 2, 30, 0, 0x0031,
        [mkAttack(11, 6, 1, 6), mkAttack(11, 16, 2, 6), mkAttack(0, 6, 0, 4), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        0, 0, 0, 4,
        0xBC, 0x0,
        0x0011F401 >>> 0, 0x00140000 >>> 0, 0x0000,
        9, 12),
    mkMon(110, 'PM_STEAM_VORTEX', /* steam vortex */
        'steam vortex', null, 'v', 22,
        7, 22, 2, 30, 0, 0x0432,
        [mkAttack(11, 2, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        0, 0, 0, 4,
        0xA5, 0x0,
        0x0011F401 >>> 0, 0x00140000 >>> 0, 0x0200,
        9, 4),
    mkMon(111, 'PM_FIRE_VORTEX', /* fire vortex */
        'fire vortex', null, 'v', 22,
        8, 22, 2, 30, 0, 0x0431,
        [mkAttack(11, 2, 1, 10), mkAttack(0, 2, 0, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        0, 0, 0, 4,
        0xA5, 0x0,
        0x0011F401 >>> 0, 0x00140000 >>> 0, 0x0200,
        10, 11),
    mkMon(112, 'PM_BABY_LONG_WORM', /* baby long worm */
        'baby long worm', null, 'w', 23,
        5, 3, 5, 0, 0, 0x0020,
        [mkAttack(2, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        600, 250, 0, 3,
        0x0, 0x0,
        0x200C6800 >>> 0, 0x00100000 >>> 0, 0x0000,
        6, 3),
    mkMon(113, 'PM_BABY_PURPLE_WORM', /* baby purple worm */
        'baby purple worm', null, 'w', 23,
        8, 3, 5, 0, 0, 0x0020,
        [mkAttack(2, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        600, 250, 0, 3,
        0x0, 0x0,
        0x200C6000 >>> 0, 0x00100000 >>> 0, 0x0000,
        9, 5),
    mkMon(114, 'PM_LONG_WORM', /* long worm */
        'long worm', null, 'w', 23,
        9, 3, 5, 10, 0, 0x0022,
        [mkAttack(2, 0, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1500, 500, 0, 7,
        0x0, 0x0,
        0x204C6800 >>> 0, 0x06100000 >>> 0, 0x0000,
        10, 3),
    mkMon(115, 'PM_PURPLE_WORM', /* purple worm */
        'purple worm', null, 'w', 23,
        15, 9, 6, 20, 0, 0x0022,
        [mkAttack(2, 0, 2, 8), mkAttack(11, 26, 1, 10), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2700, 700, 0, 7,
        0x0, 0x0,
        0x204C6000 >>> 0, 0x06100000 >>> 0, 0x0000,
        17, 5),
    mkMon(116, 'PM_GRID_BUG', /* grid bug */
        'grid bug', null, 'x', 24,
        0, 12, 9, 0, 0, 0x00B3,
        [mkAttack(2, 6, 1, 1), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        15, 10, 10, 0,
        0x30, 0x0,
        0x00042000 >>> 0, 0x00100000 >>> 0, 0x0200,
        1, 5),
    mkMon(117, 'PM_XAN', /* xan */
        'xan', null, 'x', 24,
        7, 18, -4, 0, 0, 0x0023,
        [mkAttack(6, 17, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        300, 300, 10, 0,
        0x20, 0x20,
        0x10042001 >>> 0, 0x00100000 >>> 0, 0x0200,
        9, 1),
    mkMon(118, 'PM_YELLOW_LIGHT', /* yellow light */
        'yellow light', null, 'y', 25,
        3, 15, 0, 0, 0, 0x0034,
        [mkAttack(13, 11, 10, 20), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        0, 0, 0, 1,
        0xFF, 0x0,
        0x0011FC05 >>> 0, 0x00140000 >>> 0, 0x0200,
        5, 11),
    mkMon(119, 'PM_BLACK_LIGHT', /* black light */
        'black light', null, 'y', 25,
        5, 15, 0, 0, 0, 0x0032,
        [mkAttack(13, 36, 10, 12), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        0, 0, 0, 1,
        0xFF, 0x0,
        0x0111FC05 >>> 0, 0x00140000 >>> 0, 0x0000,
        7, 0),
    mkMon(120, 'PM_ZRUTY', /* zruty */
        'zruty', null, 'z', 26,
        9, 8, 3, 0, 0, 0x0022,
        [mkAttack(1, 0, 3, 4), mkAttack(1, 0, 3, 4), mkAttack(2, 0, 3, 6), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1200, 600, 0, 3,
        0x0, 0x0,
        0x20060000 >>> 0, 0x04100000 >>> 0, 0x0200,
        11, 3),
    mkMon(121, 'PM_COUATL', /* couatl */
        'couatl', null, 'A', 27,
        8, 10, 5, 30, 7, 0x0891,
        [mkAttack(2, 7, 2, 4), mkAttack(2, 0, 1, 3), mkAttack(7, 28, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        900, 400, 9, 3,
        0x20, 0x0,
        0x10082001 >>> 0, 0x07001000 >>> 0, 0x0300,
        11, 2),
    mkMon(122, 'PM_ALEAX', /* Aleax */
        'Aleax', null, 'A', 27,
        10, 8, 0, 30, 7, 0x0811,
        [mkAttack(254, 0, 1, 6), mkAttack(254, 0, 1, 6), mkAttack(3, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 22, 2,
        0x36, 0x0,
        0x01020000 >>> 0, 0x43001000 >>> 0, 0x0300,
        12, 11),
    mkMon(123, 'PM_ANGEL', /* Angel */
        'Angel', null, 'A', 27,
        14, 10, -4, 55, 12, 0x0811,
        [mkAttack(254, 0, 1, 6), mkAttack(254, 0, 1, 6), mkAttack(1, 0, 1, 4), mkAttack(255, 1, 2, 6), NO_ATTK(), NO_ATTK()],
        1450, 400, 34, 2,
        0x36, 0x0,
        0x01020001 >>> 0, 0x47001001 >>> 0, 0x0300,
        19, 15),
    mkMon(124, 'PM_KI_RIN', /* ki-rin */
        'ki-rin', null, 'A', 27,
        16, 18, -5, 90, 15, 0x0811,
        [mkAttack(3, 0, 2, 4), mkAttack(3, 0, 2, 4), mkAttack(4, 0, 3, 6), mkAttack(255, 241, 2, 6), NO_ATTK(), NO_ATTK()],
        1450, 400, 42, 3,
        0x20, 0x0,
        0x01002001 >>> 0, 0x07001401 >>> 0, 0x0300,
        21, 11),
    mkMon(125, 'PM_ARCHON', /* Archon */
        'Archon', null, 'A', 27,
        19, 16, -6, 80, 15, 0x0811,
        [mkAttack(254, 0, 2, 4), mkAttack(254, 0, 2, 4), mkAttack(15, 11, 2, 6), mkAttack(1, 0, 1, 8), mkAttack(255, 241, 4, 6), NO_ATTK()],
        1450, 400, 34, 3,
        0x37, 0x0,
        0x01820001 >>> 0, 0xC7001401 >>> 0, 0x0300,
        26, 5),
    mkMon(126, 'PM_BAT', /* bat */
        'bat', null, 'B', 28,
        0, 22, 8, 0, 0, 0x00A1,
        [mkAttack(2, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        20, 20, 6, 0,
        0x0, 0x0,
        0x20042001 >>> 0, 0x00800000 >>> 0, 0x0200,
        2, 3),
    mkMon(127, 'PM_GIANT_BAT', /* giant bat */
        'giant bat', null, 'B', 28,
        2, 22, 7, 0, 0, 0x0022,
        [mkAttack(2, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        30, 30, 6, 1,
        0x0, 0x0,
        0x20042001 >>> 0, 0x00900000 >>> 0, 0x0200,
        3, 1),
    mkMon(128, 'PM_RAVEN', /* raven */
        'raven', null, 'B', 28,
        4, 20, 6, 0, 0, 0x0022,
        [mkAttack(2, 0, 1, 6), mkAttack(1, 11, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        40, 20, 7, 1,
        0x0, 0x0,
        0x20442001 >>> 0, 0x00900000 >>> 0, 0x0200,
        6, 0),
    mkMon(129, 'PM_VAMPIRE_BAT', /* vampire bat */
        'vampire bat', null, 'B', 28,
        5, 20, 6, 0, 0, 0x0022,
        [mkAttack(2, 0, 1, 6), mkAttack(2, 7, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        30, 20, 6, 1,
        0x24, 0x0,
        0x70842001 >>> 0, 0x00100000 >>> 0, 0x0200,
        7, 0),
    mkMon(130, 'PM_PLAINS_CENTAUR', /* plains centaur */
        'plains centaur', null, 'C', 29,
        4, 18, 4, 0, 0, 0x0021,
        [mkAttack(254, 0, 1, 6), mkAttack(3, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2500, 500, 25, 3,
        0x0, 0x0,
        0x60020000 >>> 0, 0x54000000 >>> 0, 0x0200,
        6, 3),
    mkMon(131, 'PM_FOREST_CENTAUR', /* forest centaur */
        'forest centaur', null, 'C', 29,
        5, 18, 3, 10, -1, 0x0021,
        [mkAttack(254, 0, 1, 8), mkAttack(3, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2550, 600, 25, 3,
        0x0, 0x0,
        0x60020000 >>> 0, 0x54000000 >>> 0, 0x0200,
        8, 2),
    mkMon(132, 'PM_MOUNTAIN_CENTAUR', /* mountain centaur */
        'mountain centaur', null, 'C', 29,
        6, 20, 2, 10, -3, 0x0021,
        [mkAttack(254, 0, 1, 10), mkAttack(3, 0, 1, 6), mkAttack(3, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2550, 500, 25, 3,
        0x0, 0x0,
        0x60020000 >>> 0, 0x54000000 >>> 0, 0x0200,
        9, 6),
    mkMon(133, 'PM_BABY_GRAY_DRAGON', /* baby gray dragon */
        'baby gray dragon', null, 'D', 30,
        12, 9, 2, 10, 0, 0x0020,
        [mkAttack(2, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1500, 500, 3, 4,
        0x0, 0x0,
        0x20202001 >>> 0, 0x34100000 >>> 0, 0x0000,
        13, 7),
    mkMon(134, 'PM_BABY_GOLD_DRAGON', /* baby gold dragon */
        'baby gold dragon', null, 'D', 30,
        12, 9, 2, 10, 0, 0x0020,
        [mkAttack(2, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1500, 500, 3, 4,
        0x0, 0x0,
        0x20202001 >>> 0, 0x34100000 >>> 0, 0x0200,
        13, 11),
    mkMon(135, 'PM_BABY_SILVER_DRAGON', /* baby silver dragon */
        'baby silver dragon', null, 'D', 30,
        12, 9, 2, 10, 0, 0x0020,
        [mkAttack(2, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1500, 500, 3, 4,
        0x0, 0x0,
        0x20202001 >>> 0, 0x34100000 >>> 0, 0x0000,
        13, 14),
    mkMon(136, 'PM_BABY_RED_DRAGON', /* baby red dragon */
        'baby red dragon', null, 'D', 30,
        12, 9, 2, 10, 0, 0x0020,
        [mkAttack(2, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1500, 500, 3, 4,
        0x1, 0x0,
        0x20202001 >>> 0, 0x34100000 >>> 0, 0x0200,
        13, 1),
    mkMon(137, 'PM_BABY_WHITE_DRAGON', /* baby white dragon */
        'baby white dragon', null, 'D', 30,
        12, 9, 2, 10, 0, 0x0020,
        [mkAttack(2, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1500, 500, 3, 4,
        0x2, 0x0,
        0x20202001 >>> 0, 0x34100000 >>> 0, 0x0000,
        13, 15),
    mkMon(138, 'PM_BABY_ORANGE_DRAGON', /* baby orange dragon */
        'baby orange dragon', null, 'D', 30,
        12, 9, 2, 10, 0, 0x0020,
        [mkAttack(2, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1500, 500, 3, 4,
        0x4, 0x0,
        0x20202001 >>> 0, 0x34100000 >>> 0, 0x0000,
        13, 9),
    mkMon(139, 'PM_BABY_BLACK_DRAGON', /* baby black dragon */
        'baby black dragon', null, 'D', 30,
        12, 9, 2, 10, 0, 0x0020,
        [mkAttack(2, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1500, 500, 3, 4,
        0x8, 0x0,
        0x20202001 >>> 0, 0x34100000 >>> 0, 0x0000,
        13, 0),
    mkMon(140, 'PM_BABY_BLUE_DRAGON', /* baby blue dragon */
        'baby blue dragon', null, 'D', 30,
        12, 9, 2, 10, 0, 0x0020,
        [mkAttack(2, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1500, 500, 3, 4,
        0x10, 0x0,
        0x20202001 >>> 0, 0x34100000 >>> 0, 0x0000,
        13, 4),
    mkMon(141, 'PM_BABY_GREEN_DRAGON', /* baby green dragon */
        'baby green dragon', null, 'D', 30,
        12, 9, 2, 10, 0, 0x0020,
        [mkAttack(2, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1500, 500, 3, 4,
        0x20, 0x0,
        0x30202001 >>> 0, 0x34100000 >>> 0, 0x0000,
        13, 2),
    mkMon(142, 'PM_BABY_YELLOW_DRAGON', /* baby yellow dragon */
        'baby yellow dragon', null, 'D', 30,
        12, 9, 2, 10, 0, 0x0020,
        [mkAttack(2, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1500, 500, 3, 4,
        0xC0, 0x0,
        0x28202001 >>> 0, 0x34100000 >>> 0, 0x0000,
        13, 11),
    mkMon(143, 'PM_GRAY_DRAGON', /* gray dragon */
        'gray dragon', null, 'D', 30,
        15, 9, -1, 20, 4, 0x0021,
        [mkAttack(12, 1, 4, 6), mkAttack(2, 0, 3, 8), mkAttack(1, 0, 1, 4), mkAttack(1, 0, 1, 4), NO_ATTK(), NO_ATTK()],
        4500, 1500, 3, 7,
        0x0, 0x0,
        0x21602001 >>> 0, 0xB6100000 >>> 0, 0x0000,
        20, 7),
    mkMon(144, 'PM_GOLD_DRAGON', /* gold dragon */
        'gold dragon', null, 'D', 30,
        15, 9, -1, 20, 4, 0x0021,
        [mkAttack(12, 2, 4, 6), mkAttack(2, 0, 3, 8), mkAttack(1, 0, 1, 4), mkAttack(1, 0, 1, 4), NO_ATTK(), NO_ATTK()],
        4500, 1500, 3, 7,
        0x1, 0x0,
        0x21602001 >>> 0, 0xB6100000 >>> 0, 0x0200,
        20, 11),
    mkMon(145, 'PM_SILVER_DRAGON', /* silver dragon */
        'silver dragon', null, 'D', 30,
        15, 9, -1, 20, 4, 0x0021,
        [mkAttack(12, 3, 4, 6), mkAttack(2, 0, 3, 8), mkAttack(1, 0, 1, 4), mkAttack(1, 0, 1, 4), NO_ATTK(), NO_ATTK()],
        4500, 1500, 3, 7,
        0x2, 0x0,
        0x21602001 >>> 0, 0xB6100000 >>> 0, 0x0000,
        20, 14),
    mkMon(146, 'PM_RED_DRAGON', /* red dragon */
        'red dragon', null, 'D', 30,
        15, 9, -1, 20, -4, 0x0021,
        [mkAttack(12, 2, 6, 6), mkAttack(2, 0, 3, 8), mkAttack(1, 0, 1, 4), mkAttack(1, 0, 1, 4), NO_ATTK(), NO_ATTK()],
        4500, 1500, 3, 7,
        0x1, 0x1,
        0x21602001 >>> 0, 0xB6100000 >>> 0, 0x0300,
        20, 1),
    mkMon(147, 'PM_WHITE_DRAGON', /* white dragon */
        'white dragon', null, 'D', 30,
        15, 9, -1, 20, -5, 0x0021,
        [mkAttack(12, 3, 4, 6), mkAttack(2, 0, 3, 8), mkAttack(1, 0, 1, 4), mkAttack(1, 0, 1, 4), NO_ATTK(), NO_ATTK()],
        4500, 1500, 3, 7,
        0x2, 0x2,
        0x21602001 >>> 0, 0xB6100000 >>> 0, 0x0000,
        20, 15),
    mkMon(148, 'PM_ORANGE_DRAGON', /* orange dragon */
        'orange dragon', null, 'D', 30,
        15, 9, -1, 20, 5, 0x0021,
        [mkAttack(12, 4, 4, 25), mkAttack(2, 0, 3, 8), mkAttack(1, 0, 1, 4), mkAttack(1, 0, 1, 4), NO_ATTK(), NO_ATTK()],
        4500, 1500, 3, 7,
        0x4, 0x4,
        0x21602001 >>> 0, 0xB6100000 >>> 0, 0x0000,
        20, 9),
    mkMon(149, 'PM_BLACK_DRAGON', /* black dragon */
        'black dragon', null, 'D', 30,
        15, 9, -1, 20, -6, 0x0021,
        [mkAttack(12, 5, 1, 255), mkAttack(2, 0, 3, 8), mkAttack(1, 0, 1, 4), mkAttack(1, 0, 1, 4), NO_ATTK(), NO_ATTK()],
        4500, 1500, 3, 7,
        0x8, 0x8,
        0x21602001 >>> 0, 0xB6100000 >>> 0, 0x0000,
        20, 0),
    mkMon(150, 'PM_BLUE_DRAGON', /* blue dragon */
        'blue dragon', null, 'D', 30,
        15, 9, -1, 20, -7, 0x0021,
        [mkAttack(12, 6, 4, 6), mkAttack(2, 0, 3, 8), mkAttack(1, 0, 1, 4), mkAttack(1, 0, 1, 4), NO_ATTK(), NO_ATTK()],
        4500, 1500, 3, 7,
        0x10, 0x10,
        0x21602001 >>> 0, 0xB6100000 >>> 0, 0x0000,
        20, 4),
    mkMon(151, 'PM_GREEN_DRAGON', /* green dragon */
        'green dragon', null, 'D', 30,
        15, 9, -1, 20, 6, 0x0021,
        [mkAttack(12, 7, 4, 6), mkAttack(2, 0, 3, 8), mkAttack(1, 0, 1, 4), mkAttack(1, 0, 1, 4), NO_ATTK(), NO_ATTK()],
        4500, 1500, 3, 7,
        0x20, 0x20,
        0x31602001 >>> 0, 0xB6100000 >>> 0, 0x0000,
        20, 2),
    mkMon(152, 'PM_YELLOW_DRAGON', /* yellow dragon */
        'yellow dragon', null, 'D', 30,
        15, 9, -1, 20, 7, 0x0021,
        [mkAttack(12, 8, 4, 6), mkAttack(2, 0, 3, 8), mkAttack(1, 0, 1, 4), mkAttack(1, 0, 1, 4), NO_ATTK(), NO_ATTK()],
        4500, 1500, 3, 7,
        0xC0, 0xC0,
        0x29602001 >>> 0, 0xB6100000 >>> 0, 0x0000,
        20, 11),
    mkMon(153, 'PM_STALKER', /* stalker */
        'stalker', null, 'E', 31,
        8, 12, 3, 0, 0, 0x0023,
        [mkAttack(1, 0, 4, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        900, 400, 0, 3,
        0x0, 0x0,
        0x01040001 >>> 0, 0x05900000 >>> 0, 0x0100,
        9, 15),
    mkMon(154, 'PM_AIR_ELEMENTAL', /* air elemental */
        'air elemental', null, 'E', 31,
        8, 36, 2, 30, 0, 0x0011,
        [mkAttack(11, 0, 1, 10), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        0, 0, 0, 4,
        0xA0, 0x0,
        0x0011F401 >>> 0, 0x04040000 >>> 0, 0x0000,
        10, 6),
    mkMon(155, 'PM_FIRE_ELEMENTAL', /* fire elemental */
        'fire elemental', null, 'E', 31,
        8, 12, 2, 30, 0, 0x0011,
        [mkAttack(1, 2, 3, 6), mkAttack(0, 2, 0, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        0, 0, 0, 4,
        0xA1, 0x0,
        0x0011FC01 >>> 0, 0x04040000 >>> 0, 0x0200,
        10, 11),
    mkMon(156, 'PM_EARTH_ELEMENTAL', /* earth elemental */
        'earth elemental', null, 'E', 31,
        8, 6, 2, 30, 0, 0x0011,
        [mkAttack(1, 0, 4, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2500, 0, 0, 4,
        0xA3, 0x0,
        0x0021F408 >>> 0, 0x04040000 >>> 0, 0x0000,
        10, 3),
    mkMon(157, 'PM_WATER_ELEMENTAL', /* water elemental */
        'water elemental', null, 'E', 31,
        8, 5, 2, 30, 0, 0x0011,
        [mkAttack(1, 0, 5, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2500, 0, 0, 4,
        0xA0, 0x0,
        0x0011F602 >>> 0, 0x04040000 >>> 0, 0x0000,
        10, 4),
    mkMon(158, 'PM_LICHEN', /* lichen */
        'lichen', null, 'F', 32,
        0, 1, 9, 0, 0, 0x0024,
        [mkAttack(5, 19, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        20, 200, 0, 1,
        0x0, 0x0,
        0x0001FC00 >>> 0, 0x00140000 >>> 0, 0x0000,
        1, 10),
    mkMon(159, 'PM_BROWN_MOLD', /* brown mold */
        'brown mold', null, 'F', 32,
        1, 0, 9, 0, 0, 0x0021,
        [mkAttack(0, 3, 0, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        50, 30, 0, 1,
        0x22, 0x22,
        0x0001FC00 >>> 0, 0x00140000 >>> 0, 0x0000,
        2, 3),
    mkMon(160, 'PM_YELLOW_MOLD', /* yellow mold */
        'yellow mold', null, 'F', 32,
        1, 0, 9, 0, 0, 0x0022,
        [mkAttack(0, 12, 0, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        50, 30, 0, 1,
        0x20, 0x20,
        0x1001FC00 >>> 0, 0x00140000 >>> 0, 0x0000,
        2, 11),
    mkMon(161, 'PM_GREEN_MOLD', /* green mold */
        'green mold', null, 'F', 32,
        1, 0, 9, 0, 0, 0x0021,
        [mkAttack(0, 8, 0, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        50, 30, 0, 1,
        0xC0, 0xC0,
        0x0801FC00 >>> 0, 0x00140000 >>> 0, 0x0000,
        2, 2),
    mkMon(162, 'PM_RED_MOLD', /* red mold */
        'red mold', null, 'F', 32,
        1, 0, 9, 0, 0, 0x0021,
        [mkAttack(0, 2, 0, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        50, 30, 0, 1,
        0x21, 0x21,
        0x0001FC00 >>> 0, 0x00140000 >>> 0, 0x0200,
        2, 1),
    mkMon(163, 'PM_SHRIEKER', /* shrieker */
        'shrieker', null, 'F', 32,
        3, 1, 7, 0, 0, 0x0021,
        [NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        100, 100, 18, 1,
        0x20, 0x20,
        0x0001FC00 >>> 0, 0x00140000 >>> 0, 0x0000,
        2, 5),
    mkMon(164, 'PM_VIOLET_FUNGUS', /* violet fungus */
        'violet fungus', null, 'F', 32,
        3, 1, 7, 0, 0, 0x0022,
        [mkAttack(5, 0, 1, 4), mkAttack(5, 19, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        100, 100, 0, 1,
        0x20, 0x20,
        0x0001FC00 >>> 0, 0x00140000 >>> 0, 0x0000,
        5, 5),
    mkMon(165, 'PM_GNOME', /* gnome */
        'gnome', null, 'G', 33,
        1, 6, 10, 4, 0, 0x00A1,
        [mkAttack(254, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        650, 100, 24, 1,
        0x0, 0x0,
        0x60020000 >>> 0, 0x40000040 >>> 0, 0x0300,
        3, 3),
    mkMon(166, 'PM_GNOME_LEADER', /* gnome leader */
        'gnome leader', ['gnome lord', 'gnome lady', 'gnome leader'], 'G', 33,
        3, 8, 10, 4, 0, 0x0022,
        [mkAttack(254, 0, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        700, 120, 24, 1,
        0x0, 0x0,
        0x60020000 >>> 0, 0x40000440 >>> 0, 0x0300,
        4, 4),
    mkMon(167, 'PM_GNOMISH_WIZARD', /* gnomish wizard */
        'gnomish wizard', null, 'G', 33,
        3, 10, 4, 10, 0, 0x0021,
        [mkAttack(255, 241, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        700, 120, 24, 1,
        0x0, 0x0,
        0x60020000 >>> 0, 0x80000040 >>> 0, 0x0300,
        5, 12),
    mkMon(168, 'PM_GNOME_RULER', /* gnome ruler */
        'gnome ruler', ['gnome king', 'gnome queen', 'gnome ruler'], 'G', 33,
        5, 10, 10, 20, 0, 0x0021,
        [mkAttack(254, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        750, 150, 24, 1,
        0x0, 0x0,
        0x60020000 >>> 0, 0x40000840 >>> 0, 0x0300,
        6, 5),
    mkMon(169, 'PM_GIANT', /* giant */
        'giant', null, 'H', 34,
        6, 6, 0, 0, 2, 0x0221,
        [mkAttack(254, 0, 2, 10), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2250, 750, 43, 4,
        0x0, 0x0,
        0x20020000 >>> 0, 0x6E002000 >>> 0, 0x0300,
        8, 1),
    mkMon(170, 'PM_STONE_GIANT', /* stone giant */
        'stone giant', null, 'H', 34,
        6, 6, 0, 0, 2, 0x00A1,
        [mkAttack(254, 0, 2, 10), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2250, 750, 43, 4,
        0x0, 0x0,
        0x20020000 >>> 0, 0x6E002000 >>> 0, 0x0300,
        8, 7),
    mkMon(171, 'PM_HILL_GIANT', /* hill giant */
        'hill giant', null, 'H', 34,
        8, 10, 6, 0, -2, 0x00A1,
        [mkAttack(254, 0, 2, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2200, 700, 43, 4,
        0x0, 0x0,
        0x20020000 >>> 0, 0x6E002000 >>> 0, 0x0300,
        10, 6),
    mkMon(172, 'PM_FIRE_GIANT', /* fire giant */
        'fire giant', null, 'H', 34,
        9, 12, 4, 5, 2, 0x00A1,
        [mkAttack(254, 0, 2, 10), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2250, 750, 43, 4,
        0x1, 0x1,
        0x20020000 >>> 0, 0x6E002000 >>> 0, 0x0300,
        11, 11),
    mkMon(173, 'PM_FROST_GIANT', /* frost giant */
        'frost giant', null, 'H', 34,
        10, 12, 3, 10, -3, 0x08A1,
        [mkAttack(254, 0, 2, 12), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2250, 750, 43, 4,
        0x2, 0x2,
        0x20020000 >>> 0, 0x6E002000 >>> 0, 0x0300,
        13, 15),
    mkMon(174, 'PM_ETTIN', /* ettin */
        'ettin', null, 'H', 34,
        10, 12, 3, 0, 0, 0x0021,
        [mkAttack(254, 0, 2, 8), mkAttack(254, 0, 3, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1700, 500, 11, 4,
        0x0, 0x0,
        0x20060000 >>> 0, 0x46100000 >>> 0, 0x0300,
        13, 3),
    mkMon(175, 'PM_STORM_GIANT', /* storm giant */
        'storm giant', null, 'H', 34,
        16, 12, 3, 10, -3, 0x00A1,
        [mkAttack(254, 0, 2, 12), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2250, 750, 43, 4,
        0x10, 0x10,
        0x20020000 >>> 0, 0x6E002000 >>> 0, 0x0300,
        19, 4),
    mkMon(176, 'PM_TITAN', /* titan */
        'titan', null, 'H', 34,
        16, 18, -3, 70, 9, 0x0001,
        [mkAttack(254, 0, 2, 8), mkAttack(255, 241, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2300, 900, 42, 4,
        0x0, 0x0,
        0x60020001 >>> 0, 0xCE000000 >>> 0, 0x0300,
        20, 5),
    mkMon(177, 'PM_MINOTAUR', /* minotaur */
        'minotaur', null, 'H', 34,
        15, 15, 6, 0, 0, 0x0220,
        [mkAttack(1, 0, 3, 10), mkAttack(1, 0, 3, 10), mkAttack(4, 0, 2, 8), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1500, 700, 13, 3,
        0x0, 0x0,
        0x20060000 >>> 0, 0x06100000 >>> 0, 0x0300,
        17, 3),
    mkMon(178, 'PM_JABBERWOCK', /* jabberwock */
        'jabberwock', null, 'J', 36,
        15, 12, -2, 50, 0, 0x0021,
        [mkAttack(2, 0, 2, 10), mkAttack(2, 0, 2, 10), mkAttack(1, 0, 2, 10), mkAttack(1, 0, 2, 10), NO_ATTK(), NO_ATTK()],
        1300, 600, 16, 3,
        0x0, 0x0,
        0x20040001 >>> 0, 0x46100000 >>> 0, 0x0200,
        18, 9),
    mkMon(179, 'PM_KEYSTONE_KOP', /* Keystone Kop */
        'Keystone Kop', null, 'K', 37,
        1, 6, 10, 10, 9, 0x0260,
        [mkAttack(254, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 200, 26, 2,
        0x0, 0x0,
        0x00020000 >>> 0, 0x40910008 >>> 0, 0x0200,
        3, 4),
    mkMon(180, 'PM_KOP_SERGEANT', /* Kop Sergeant */
        'Kop Sergeant', null, 'K', 37,
        2, 8, 10, 10, 10, 0x02A0,
        [mkAttack(254, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 200, 26, 2,
        0x0, 0x0,
        0x00020000 >>> 0, 0x44910008 >>> 0, 0x0200,
        4, 4),
    mkMon(181, 'PM_KOP_LIEUTENANT', /* Kop Lieutenant */
        'Kop Lieutenant', null, 'K', 37,
        3, 10, 10, 20, 11, 0x0220,
        [mkAttack(254, 0, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 200, 26, 2,
        0x0, 0x0,
        0x00020000 >>> 0, 0x44910008 >>> 0, 0x0200,
        5, 6),
    mkMon(182, 'PM_KOP_KAPTAIN', /* Kop Kaptain */
        'Kop Kaptain', null, 'K', 37,
        4, 12, 10, 20, 12, 0x0220,
        [mkAttack(254, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 200, 26, 2,
        0x0, 0x0,
        0x00020000 >>> 0, 0x44910008 >>> 0, 0x0200,
        6, 5),
    mkMon(183, 'PM_LICH', /* lich */
        'lich', null, 'L', 38,
        11, 6, 0, 30, -9, 0x0031,
        [mkAttack(5, 3, 1, 10), mkAttack(255, 241, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1200, 100, 21, 2,
        0x26, 0x2,
        0x10820400 >>> 0, 0x80100002 >>> 0, 0x0100,
        14, 3),
    mkMon(184, 'PM_DEMILICH', /* demilich */
        'demilich', null, 'L', 38,
        14, 9, -2, 60, -12, 0x0031,
        [mkAttack(5, 3, 3, 4), mkAttack(255, 241, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1200, 100, 21, 2,
        0x26, 0x2,
        0x10820400 >>> 0, 0x80100002 >>> 0, 0x0100,
        18, 1),
    mkMon(185, 'PM_MASTER_LICH', /* master lich */
        'master lich', null, 'L', 38,
        17, 9, -4, 90, -15, 0x0431,
        [mkAttack(5, 3, 3, 6), mkAttack(255, 241, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1200, 100, 21, 2,
        0x27, 0x3,
        0x10820400 >>> 0, 0x80100002 >>> 0, 0x0104,
        21, 5),
    mkMon(186, 'PM_ARCH_LICH', /* arch-lich */
        'arch-lich', null, 'L', 38,
        25, 9, -6, 90, -15, 0x0431,
        [mkAttack(5, 3, 5, 6), mkAttack(255, 241, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1200, 100, 21, 2,
        0x37, 0x3,
        0x10820400 >>> 0, 0x80100002 >>> 0, 0x0104,
        29, 5),
    mkMon(187, 'PM_KOBOLD_MUMMY', /* kobold mummy */
        'kobold mummy', null, 'M', 39,
        3, 8, 6, 20, -2, 0x0031,
        [mkAttack(1, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        400, 50, 0, 1,
        0x26, 0x0,
        0x10030400 >>> 0, 0x00100002 >>> 0, 0x0100,
        4, 3),
    mkMon(188, 'PM_GNOME_MUMMY', /* gnome mummy */
        'gnome mummy', null, 'M', 39,
        4, 10, 6, 20, -3, 0x0031,
        [mkAttack(1, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        650, 50, 0, 1,
        0x26, 0x0,
        0x10030400 >>> 0, 0x00100042 >>> 0, 0x0100,
        5, 1),
    mkMon(189, 'PM_ORC_MUMMY', /* orc mummy */
        'orc mummy', null, 'M', 39,
        5, 10, 5, 20, -4, 0x0031,
        [mkAttack(1, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        850, 75, 0, 2,
        0x26, 0x0,
        0x10030400 >>> 0, 0x34100082 >>> 0, 0x0100,
        6, 7),
    mkMon(190, 'PM_DWARF_MUMMY', /* dwarf mummy */
        'dwarf mummy', null, 'M', 39,
        5, 10, 5, 20, -4, 0x0031,
        [mkAttack(1, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        900, 150, 0, 2,
        0x26, 0x0,
        0x10030400 >>> 0, 0x30100022 >>> 0, 0x0100,
        6, 1),
    mkMon(191, 'PM_ELF_MUMMY', /* elf mummy */
        'elf mummy', null, 'M', 39,
        6, 12, 4, 30, -5, 0x0031,
        [mkAttack(1, 0, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        800, 175, 0, 2,
        0x26, 0x0,
        0x10030400 >>> 0, 0x00100012 >>> 0, 0x0100,
        7, 2),
    mkMon(192, 'PM_HUMAN_MUMMY', /* human mummy */
        'human mummy', null, 'M', 39,
        6, 12, 4, 30, -5, 0x0031,
        [mkAttack(1, 0, 2, 4), mkAttack(1, 0, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 200, 0, 2,
        0x26, 0x0,
        0x10030400 >>> 0, 0x00100002 >>> 0, 0x0100,
        7, 7),
    mkMon(193, 'PM_ETTIN_MUMMY', /* ettin mummy */
        'ettin mummy', null, 'M', 39,
        7, 12, 4, 30, -6, 0x0031,
        [mkAttack(1, 0, 2, 6), mkAttack(1, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1700, 250, 0, 4,
        0x26, 0x0,
        0x10030400 >>> 0, 0x04100002 >>> 0, 0x0100,
        8, 4),
    mkMon(194, 'PM_GIANT_MUMMY', /* giant mummy */
        'giant mummy', null, 'M', 39,
        8, 14, 3, 30, -7, 0x0031,
        [mkAttack(1, 0, 3, 4), mkAttack(1, 0, 3, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2050, 375, 0, 4,
        0x26, 0x0,
        0x10030400 >>> 0, 0x24102002 >>> 0, 0x0100,
        10, 6),
    mkMon(195, 'PM_RED_NAGA_HATCHLING', /* red naga hatchling */
        'red naga hatchling', null, 'N', 40,
        3, 10, 6, 0, 0, 0x0020,
        [mkAttack(2, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        500, 100, 21, 3,
        0x21, 0x20,
        0x60286800 >>> 0, 0x04000000 >>> 0, 0x0200,
        4, 1),
    mkMon(196, 'PM_BLACK_NAGA_HATCHLING', /* black naga hatchling */
        'black naga hatchling', null, 'N', 40,
        3, 10, 6, 0, 0, 0x0020,
        [mkAttack(2, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        500, 100, 21, 3,
        0xE0, 0x20,
        0x28286800 >>> 0, 0x04000000 >>> 0, 0x0000,
        4, 0),
    mkMon(197, 'PM_GOLDEN_NAGA_HATCHLING', /* golden naga hatchling */
        'golden naga hatchling', null, 'N', 40,
        3, 10, 6, 0, 0, 0x0020,
        [mkAttack(2, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        500, 100, 21, 3,
        0x20, 0x20,
        0x60286800 >>> 0, 0x04000000 >>> 0, 0x0000,
        4, 11),
    mkMon(198, 'PM_GUARDIAN_NAGA_HATCHLING', /* guardian naga hatchling */
        'guardian naga hatchling', null, 'N', 40,
        3, 10, 6, 0, 0, 0x0020,
        [mkAttack(2, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        500, 100, 21, 3,
        0x20, 0x20,
        0x60286800 >>> 0, 0x04000000 >>> 0, 0x0000,
        4, 2),
    mkMon(199, 'PM_RED_NAGA', /* red naga */
        'red naga', null, 'N', 40,
        6, 12, 4, 0, -4, 0x0021,
        [mkAttack(2, 0, 2, 4), mkAttack(12, 2, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2600, 400, 21, 4,
        0x21, 0x21,
        0x60686800 >>> 0, 0x04000000 >>> 0, 0x0200,
        8, 1),
    mkMon(200, 'PM_BLACK_NAGA', /* black naga */
        'black naga', null, 'N', 40,
        8, 14, 2, 10, 4, 0x0021,
        [mkAttack(2, 0, 2, 6), mkAttack(10, 8, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2600, 400, 21, 4,
        0xE0, 0xE0,
        0x28686800 >>> 0, 0x04000000 >>> 0, 0x0000,
        10, 0),
    mkMon(201, 'PM_GOLDEN_NAGA', /* golden naga */
        'golden naga', null, 'N', 40,
        10, 14, 2, 70, 5, 0x0021,
        [mkAttack(2, 0, 2, 6), mkAttack(255, 241, 4, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2600, 400, 21, 4,
        0x20, 0x20,
        0x60686800 >>> 0, 0x04000000 >>> 0, 0x0000,
        13, 11),
    mkMon(202, 'PM_GUARDIAN_NAGA', /* guardian naga */
        'guardian naga', null, 'N', 40,
        12, 16, 0, 50, 7, 0x0021,
        [mkAttack(10, 7, 1, 6), mkAttack(2, 14, 1, 6), mkAttack(5, 0, 0, 0), mkAttack(7, 28, 2, 4), NO_ATTK(), NO_ATTK()],
        2600, 400, 21, 4,
        0x20, 0x20,
        0x70686800 >>> 0, 0x04000000 >>> 0, 0x0000,
        17, 2),
    mkMon(203, 'PM_OGRE', /* ogre */
        'ogre', null, 'O', 41,
        5, 10, 5, 0, -3, 0x00A1,
        [mkAttack(254, 0, 2, 5), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1600, 500, 11, 3,
        0x0, 0x0,
        0x20020000 >>> 0, 0x74000000 >>> 0, 0x0300,
        7, 3),
    mkMon(204, 'PM_OGRE_LEADER', /* ogre leader */
        'ogre leader', ['ogre lord', 'ogre lady', 'ogre leader'], 'O', 41,
        7, 12, 3, 30, -5, 0x0022,
        [mkAttack(254, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1700, 700, 11, 3,
        0x0, 0x0,
        0x20020000 >>> 0, 0x74000400 >>> 0, 0x0300,
        9, 1),
    mkMon(205, 'PM_OGRE_TYRANT', /* ogre tyrant */
        'ogre tyrant', ['ogre king', 'ogre queen', 'ogre tyrant'], 'O', 41,
        9, 14, 4, 60, -7, 0x0022,
        [mkAttack(254, 0, 3, 5), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1700, 750, 11, 3,
        0x0, 0x0,
        0x20020000 >>> 0, 0x74000800 >>> 0, 0x0300,
        11, 5),
    mkMon(206, 'PM_GRAY_OOZE', /* gray ooze */
        'gray ooze', null, 'P', 42,
        3, 1, 8, 0, 0, 0x0032,
        [mkAttack(2, 24, 2, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        500, 250, 0, 2,
        0xE3, 0x23,
        0x6801F404 >>> 0, 0x00140000 >>> 0, 0x0000,
        4, 7),
    mkMon(207, 'PM_BROWN_PUDDING', /* brown pudding */
        'brown pudding', null, 'P', 42,
        5, 3, 8, 0, 0, 0x0031,
        [mkAttack(2, 34, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        500, 250, 0, 2,
        0xF2, 0x32,
        0x6801F404 >>> 0, 0x00140000 >>> 0, 0x0000,
        6, 3),
    mkMon(208, 'PM_GREEN_SLIME', /* green slime */
        'green slime', null, 'P', 42,
        6, 6, 6, 0, 0, 0x0431,
        [mkAttack(5, 40, 1, 4), mkAttack(0, 40, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        400, 150, 0, 3,
        0xF2, 0xC0,
        0x7801F404 >>> 0, 0x00140000 >>> 0, 0x0000,
        8, 2),
    mkMon(209, 'PM_BLACK_PUDDING', /* black pudding */
        'black pudding', null, 'P', 42,
        10, 6, 6, 0, 0, 0x0031,
        [mkAttack(2, 42, 3, 8), mkAttack(0, 42, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        900, 250, 0, 3,
        0xF2, 0x32,
        0x6801F404 >>> 0, 0x00140000 >>> 0, 0x0000,
        12, 0),
    mkMon(210, 'PM_QUANTUM_MECHANIC', /* quantum mechanic */
        'quantum mechanic', null, 'Q', 43,
        7, 12, 3, 10, 0, 0x0023,
        [mkAttack(1, 23, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 20, 25, 2,
        0x20, 0x0,
        0x72020000 >>> 0, 0x00100000 >>> 0, 0x0200,
        9, 6),
    mkMon(211, 'PM_GENETIC_ENGINEER', /* genetic engineer */
        'genetic engineer', null, 'Q', 43,
        12, 12, 3, 10, 0, 0x0021,
        [mkAttack(1, 43, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 20, 25, 2,
        0x20, 0x0,
        0x72020000 >>> 0, 0x02100000 >>> 0, 0x0200,
        14, 2),
    mkMon(212, 'PM_RUST_MONSTER', /* rust monster */
        'rust monster', null, 'R', 44,
        5, 18, 2, 0, 0, 0x0022,
        [mkAttack(5, 24, 0, 0), mkAttack(5, 24, 0, 0), mkAttack(0, 24, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1000, 250, 0, 2,
        0x0, 0x0,
        0x80042002 >>> 0, 0x00100000 >>> 0, 0x0200,
        8, 3),
    mkMon(213, 'PM_DISENCHANTER', /* disenchanter */
        'disenchanter', null, 'R', 44,
        12, 12, -10, 0, -3, 0x0422,
        [mkAttack(1, 41, 4, 4), mkAttack(0, 41, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        750, 200, 5, 3,
        0x0, 0x0,
        0x20040000 >>> 0, 0x00100000 >>> 0, 0x0200,
        14, 4),
    mkMon(214, 'PM_GARTER_SNAKE', /* garter snake */
        'garter snake', null, 'S', 45,
        1, 8, 8, 0, 0, 0x0061,
        [mkAttack(2, 0, 1, 2), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        50, 60, 9, 0,
        0x0, 0x0,
        0x204C6882 >>> 0, 0x00000000 >>> 0, 0x0000,
        3, 2),
    mkMon(215, 'PM_SNAKE', /* snake */
        'snake', null, 'S', 45,
        4, 15, 3, 0, 0, 0x0022,
        [mkAttack(2, 7, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        100, 80, 9, 1,
        0x20, 0x20,
        0x304C6882 >>> 0, 0x00100000 >>> 0, 0x0000,
        6, 3),
    mkMon(216, 'PM_WATER_MOCCASIN', /* water moccasin */
        'water moccasin', null, 'S', 45,
        4, 15, 3, 0, 0, 0x0260,
        [mkAttack(2, 7, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        150, 80, 9, 1,
        0x20, 0x20,
        0x304C6882 >>> 0, 0x00100000 >>> 0, 0x0000,
        7, 1),
    mkMon(217, 'PM_PYTHON', /* python */
        'python', null, 'S', 45,
        6, 3, 5, 0, 0, 0x0021,
        [mkAttack(2, 0, 1, 4), mkAttack(5, 0, 0, 0), mkAttack(7, 28, 1, 4), mkAttack(7, 0, 2, 4), NO_ATTK(), NO_ATTK()],
        250, 100, 9, 3,
        0x0, 0x0,
        0x204C6802 >>> 0, 0x04100000 >>> 0, 0x0100,
        8, 5),
    mkMon(218, 'PM_PIT_VIPER', /* pit viper */
        'pit viper', null, 'S', 45,
        6, 15, 2, 0, 0, 0x0021,
        [mkAttack(2, 7, 1, 4), mkAttack(2, 7, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        100, 60, 9, 2,
        0x20, 0x20,
        0x304C6882 >>> 0, 0x00100000 >>> 0, 0x0100,
        9, 4),
    mkMon(219, 'PM_COBRA', /* cobra */
        'cobra', null, 'S', 45,
        6, 18, 2, 0, 0, 0x0021,
        [mkAttack(2, 7, 2, 4), mkAttack(10, 11, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        250, 100, 9, 2,
        0x20, 0x20,
        0x304C6882 >>> 0, 0x00100000 >>> 0, 0x0000,
        10, 4),
    mkMon(220, 'PM_TROLL', /* troll */
        'troll', null, 'T', 46,
        7, 12, 4, 0, -3, 0x0022,
        [mkAttack(254, 0, 4, 2), mkAttack(1, 0, 4, 2), mkAttack(2, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        800, 350, 11, 3,
        0x0, 0x0,
        0x20820000 >>> 0, 0x05100000 >>> 0, 0x0300,
        9, 3),
    mkMon(221, 'PM_ICE_TROLL', /* ice troll */
        'ice troll', null, 'T', 46,
        9, 10, 2, 20, -3, 0x0821,
        [mkAttack(254, 0, 2, 6), mkAttack(1, 3, 2, 6), mkAttack(2, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1000, 300, 11, 3,
        0x2, 0x2,
        0x20820000 >>> 0, 0x05100000 >>> 0, 0x0300,
        12, 15),
    mkMon(222, 'PM_ROCK_TROLL', /* rock troll */
        'rock troll', null, 'T', 46,
        9, 12, 0, 0, -3, 0x0021,
        [mkAttack(254, 0, 3, 6), mkAttack(1, 0, 2, 8), mkAttack(2, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1200, 300, 11, 3,
        0x0, 0x0,
        0x20820000 >>> 0, 0x45100000 >>> 0, 0x0300,
        12, 6),
    mkMon(223, 'PM_WATER_TROLL', /* water troll */
        'water troll', null, 'T', 46,
        11, 14, 4, 40, -3, 0x0220,
        [mkAttack(254, 0, 2, 8), mkAttack(1, 0, 2, 8), mkAttack(2, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1200, 350, 11, 3,
        0x0, 0x0,
        0x20820002 >>> 0, 0x05100000 >>> 0, 0x0300,
        13, 4),
    mkMon(224, 'PM_OLOG_HAI', /* Olog-hai */
        'Olog-hai', null, 'T', 46,
        13, 12, -4, 0, -7, 0x0021,
        [mkAttack(254, 0, 3, 6), mkAttack(1, 0, 2, 8), mkAttack(2, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1500, 400, 11, 3,
        0x0, 0x0,
        0x20820000 >>> 0, 0x45100000 >>> 0, 0x0300,
        16, 5),
    mkMon(225, 'PM_UMBER_HULK', /* umber hulk */
        'umber hulk', null, 'U', 47,
        9, 6, 2, 25, 0, 0x0022,
        [mkAttack(1, 0, 3, 4), mkAttack(1, 0, 3, 4), mkAttack(2, 0, 2, 5), mkAttack(15, 25, 0, 0), NO_ATTK(), NO_ATTK()],
        1200, 500, 0, 3,
        0x0, 0x0,
        0x20000020 >>> 0, 0x04000000 >>> 0, 0x0200,
        12, 3),
    mkMon(226, 'PM_VAMPIRE', /* vampire */
        'vampire', null, 'V', 48,
        10, 12, 1, 25, -8, 0x0031,
        [mkAttack(1, 0, 1, 6), mkAttack(2, 15, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 32, 2,
        0x24, 0x0,
        0x10820401 >>> 0, 0x07104002 >>> 0, 0x0200,
        12, 1),
    mkMon(227, 'PM_VAMPIRE_LEADER', /* vampire leader */
        'vampire leader', ['vampire lord', 'vampire lady', 'vampire leader'], 'V', 48,
        12, 14, 0, 50, -9, 0x0031,
        [mkAttack(1, 0, 1, 8), mkAttack(2, 15, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 32, 2,
        0x24, 0x0,
        0x10820401 >>> 0, 0x07104402 >>> 0, 0x0200,
        14, 4),
    mkMon(228, 'PM_VLAD_THE_IMPALER', /* Vlad the Impaler */
        'Vlad the Impaler', null, 'V', 48,
        28, 26, -6, 80, -10, 0x1210,
        [mkAttack(254, 0, 2, 10), mkAttack(2, 15, 1, 12), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 32, 2,
        0x24, 0x0,
        0x10820401 >>> 0, 0x07194803 >>> 0, 0x0248,
        32, 5),
    mkMon(229, 'PM_BARROW_WIGHT', /* barrow wight */
        'barrow wight', null, 'W', 49,
        3, 12, 5, 5, -3, 0x0031,
        [mkAttack(254, 15, 0, 0), mkAttack(255, 241, 0, 0), mkAttack(1, 0, 1, 4), mkAttack(5, 3, 1, 4), NO_ATTK(), NO_ATTK()],
        1200, 0, 42, 2,
        0x26, 0x0,
        0x00020400 >>> 0, 0x41100002 >>> 0, 0x0000,
        8, 7),
    mkMon(230, 'PM_WRAITH', /* wraith */
        'wraith', null, 'W', 49,
        6, 12, 4, 15, -6, 0x0022,
        [mkAttack(5, 15, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        0, 0, 0, 2,
        0xA6, 0x0,
        0x00120401 >>> 0, 0x01100002 >>> 0, 0x0000,
        8, 0),
    mkMon(231, 'PM_NAZGUL', /* Nazgul */
        'Nazgul', null, 'W', 49,
        13, 12, 0, 25, -17, 0x0031,
        [mkAttack(254, 15, 1, 4), mkAttack(12, 4, 2, 25), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 0, 42, 2,
        0x26, 0x0,
        0x01020400 >>> 0, 0x45110003 >>> 0, 0x0000,
        17, 5),
    mkMon(232, 'PM_XORN', /* xorn */
        'xorn', null, 'X', 50,
        8, 9, -2, 20, 0, 0x0021,
        [mkAttack(1, 0, 1, 3), mkAttack(1, 0, 1, 3), mkAttack(1, 0, 1, 3), mkAttack(2, 0, 4, 6), NO_ATTK(), NO_ATTK()],
        1200, 700, 3, 2,
        0x83, 0x80,
        0x80200408 >>> 0, 0x04100000 >>> 0, 0x0000,
        11, 3),
    mkMon(233, 'PM_MONKEY', /* monkey */
        'monkey', null, 'Y', 51,
        2, 12, 6, 0, 0, 0x0021,
        [mkAttack(1, 21, 0, 0), mkAttack(2, 0, 1, 3), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        100, 50, 5, 1,
        0x0, 0x0,
        0x60060000 >>> 0, 0x00000000 >>> 0, 0x0200,
        4, 7),
    mkMon(234, 'PM_APE', /* ape */
        'ape', null, 'Y', 51,
        4, 12, 6, 0, 0, 0x00A2,
        [mkAttack(1, 0, 1, 3), mkAttack(1, 0, 1, 3), mkAttack(2, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1100, 500, 5, 3,
        0x0, 0x0,
        0x60060000 >>> 0, 0x04000000 >>> 0, 0x0200,
        6, 3),
    mkMon(235, 'PM_OWLBEAR', /* owlbear */
        'owlbear', null, 'Y', 51,
        5, 12, 5, 0, 0, 0x0023,
        [mkAttack(1, 0, 1, 6), mkAttack(1, 0, 1, 6), mkAttack(7, 0, 2, 8), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1700, 700, 3, 3,
        0x0, 0x0,
        0x20060000 >>> 0, 0x06100000 >>> 0, 0x0200,
        7, 3),
    mkMon(236, 'PM_YETI', /* yeti */
        'yeti', null, 'Y', 51,
        5, 15, 6, 0, 0, 0x0022,
        [mkAttack(1, 0, 1, 6), mkAttack(1, 0, 1, 6), mkAttack(2, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1600, 700, 5, 3,
        0x2, 0x2,
        0x20060000 >>> 0, 0x04100000 >>> 0, 0x0200,
        7, 15),
    mkMon(237, 'PM_CARNIVOROUS_APE', /* carnivorous ape */
        'carnivorous ape', null, 'Y', 51,
        6, 12, 6, 0, 0, 0x0021,
        [mkAttack(1, 0, 1, 4), mkAttack(1, 0, 1, 4), mkAttack(7, 0, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1250, 550, 5, 3,
        0x0, 0x0,
        0x20060000 >>> 0, 0x04100000 >>> 0, 0x0200,
        8, 0),
    mkMon(238, 'PM_SASQUATCH', /* sasquatch */
        'sasquatch', null, 'Y', 51,
        7, 15, 6, 0, 2, 0x0021,
        [mkAttack(1, 0, 1, 6), mkAttack(1, 0, 1, 6), mkAttack(3, 0, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1550, 750, 5, 3,
        0x0, 0x0,
        0x61060000 >>> 0, 0x04000000 >>> 0, 0x0200,
        9, 7),
    mkMon(239, 'PM_KOBOLD_ZOMBIE', /* kobold zombie */
        'kobold zombie', null, 'Z', 52,
        0, 6, 10, 0, -2, 0x0031,
        [mkAttack(1, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        400, 50, 44, 1,
        0x26, 0x0,
        0x10030400 >>> 0, 0x01100002 >>> 0, 0x0100,
        1, 3),
    mkMon(240, 'PM_GNOME_ZOMBIE', /* gnome zombie */
        'gnome zombie', null, 'Z', 52,
        1, 6, 10, 0, -2, 0x0031,
        [mkAttack(1, 0, 1, 5), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        650, 50, 44, 1,
        0x26, 0x0,
        0x10030400 >>> 0, 0x01100042 >>> 0, 0x0100,
        2, 3),
    mkMon(241, 'PM_ORC_ZOMBIE', /* orc zombie */
        'orc zombie', null, 'Z', 52,
        2, 6, 9, 0, -3, 0x00B1,
        [mkAttack(1, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        850, 75, 44, 2,
        0x26, 0x0,
        0x10030400 >>> 0, 0x01100082 >>> 0, 0x0100,
        3, 7),
    mkMon(242, 'PM_DWARF_ZOMBIE', /* dwarf zombie */
        'dwarf zombie', null, 'Z', 52,
        2, 6, 9, 0, -3, 0x00B1,
        [mkAttack(1, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        900, 150, 44, 2,
        0x26, 0x0,
        0x10030400 >>> 0, 0x01100022 >>> 0, 0x0100,
        3, 1),
    mkMon(243, 'PM_ELF_ZOMBIE', /* elf zombie */
        'elf zombie', null, 'Z', 52,
        3, 6, 9, 0, -3, 0x00B1,
        [mkAttack(1, 0, 1, 7), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        800, 175, 44, 2,
        0x26, 0x0,
        0x00030400 >>> 0, 0x01100012 >>> 0, 0x0100,
        4, 2),
    mkMon(244, 'PM_HUMAN_ZOMBIE', /* human zombie */
        'human zombie', null, 'Z', 52,
        4, 6, 8, 0, -3, 0x00B1,
        [mkAttack(1, 0, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 200, 44, 2,
        0x26, 0x0,
        0x00030400 >>> 0, 0x01100002 >>> 0, 0x0100,
        5, 15),
    mkMon(245, 'PM_ETTIN_ZOMBIE', /* ettin zombie */
        'ettin zombie', null, 'Z', 52,
        6, 8, 6, 0, -4, 0x0031,
        [mkAttack(1, 0, 1, 10), mkAttack(1, 0, 1, 10), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1700, 250, 44, 4,
        0x26, 0x0,
        0x00030400 >>> 0, 0x05100002 >>> 0, 0x0100,
        7, 4),
    mkMon(246, 'PM_GHOUL', /* ghoul */
        'ghoul', null, 'Z', 52,
        3, 6, 10, 0, -2, 0x0031,
        [mkAttack(1, 14, 1, 2), mkAttack(1, 0, 1, 3), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        400, 50, 0, 1,
        0x26, 0x0,
        0x70030400 >>> 0, 0x00900002 >>> 0, 0x0100,
        5, 0),
    mkMon(247, 'PM_GIANT_ZOMBIE', /* giant zombie */
        'giant zombie', null, 'Z', 52,
        8, 8, 6, 0, -4, 0x0031,
        [mkAttack(1, 0, 2, 8), mkAttack(1, 0, 2, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2050, 375, 44, 4,
        0x26, 0x0,
        0x00030400 >>> 0, 0x05102002 >>> 0, 0x0100,
        9, 6),
    mkMon(248, 'PM_SKELETON', /* skeleton */
        'skeleton', null, 'Z', 52,
        12, 8, 4, 0, 0, 0x0210,
        [mkAttack(254, 0, 2, 6), mkAttack(5, 13, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        300, 5, 19, 2,
        0xA6, 0x0,
        0x00230400 >>> 0, 0x46900002 >>> 0, 0x0100,
        14, 15),
    mkMon(249, 'PM_STRAW_GOLEM', /* straw golem */
        'straw golem', null, '\'', 55,
        3, 12, 10, 0, 0, 0x0011,
        [mkAttack(1, 0, 1, 2), mkAttack(1, 0, 1, 2), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        400, 0, 0, 3,
        0x26, 0x0,
        0x00030400 >>> 0, 0x00140000 >>> 0, 0x0000,
        4, 11),
    mkMon(250, 'PM_PAPER_GOLEM', /* paper golem */
        'paper golem', null, '\'', 55,
        3, 12, 10, 0, 0, 0x0011,
        [mkAttack(1, 0, 1, 3), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        400, 0, 0, 3,
        0x26, 0x0,
        0x00030400 >>> 0, 0x00140000 >>> 0, 0x0000,
        4, 15),
    mkMon(251, 'PM_ROPE_GOLEM', /* rope golem */
        'rope golem', null, '\'', 55,
        4, 9, 8, 0, 0, 0x0011,
        [mkAttack(1, 0, 1, 4), mkAttack(1, 0, 1, 4), mkAttack(7, 0, 6, 1), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        450, 0, 0, 3,
        0x24, 0x0,
        0x00030400 >>> 0, 0x00140000 >>> 0, 0x0000,
        6, 3),
    mkMon(252, 'PM_GOLD_GOLEM', /* gold golem */
        'gold golem', null, '\'', 55,
        5, 9, 6, 0, 0, 0x0011,
        [mkAttack(1, 0, 2, 3), mkAttack(1, 0, 2, 3), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        450, 0, 0, 3,
        0x64, 0x0,
        0x00230400 >>> 0, 0x00140000 >>> 0, 0x0000,
        6, 11),
    mkMon(253, 'PM_LEATHER_GOLEM', /* leather golem */
        'leather golem', null, '\'', 55,
        6, 6, 6, 0, 0, 0x0011,
        [mkAttack(1, 0, 1, 6), mkAttack(1, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        800, 0, 0, 3,
        0x24, 0x0,
        0x00030400 >>> 0, 0x00140000 >>> 0, 0x0000,
        7, 3),
    mkMon(254, 'PM_WOOD_GOLEM', /* wood golem */
        'wood golem', null, '\'', 55,
        7, 3, 4, 0, 0, 0x0011,
        [mkAttack(1, 0, 3, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        900, 0, 0, 3,
        0x26, 0x0,
        0x00230400 >>> 0, 0x00140000 >>> 0, 0x0000,
        8, 3),
    mkMon(255, 'PM_FLESH_GOLEM', /* flesh golem */
        'flesh golem', null, '\'', 55,
        9, 8, 9, 30, 0, 0x0001,
        [mkAttack(1, 0, 2, 8), mkAttack(1, 0, 2, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1400, 600, 0, 3,
        0x37, 0x37,
        0x00030400 >>> 0, 0x04100000 >>> 0, 0x0000,
        10, 1),
    mkMon(256, 'PM_CLAY_GOLEM', /* clay golem */
        'clay golem', null, '\'', 55,
        11, 7, 7, 40, 0, 0x0011,
        [mkAttack(1, 0, 3, 10), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1550, 0, 0, 3,
        0x24, 0x0,
        0x00230400 >>> 0, 0x04100000 >>> 0, 0x0000,
        12, 3),
    mkMon(257, 'PM_STONE_GOLEM', /* stone golem */
        'stone golem', null, '\'', 55,
        14, 6, 5, 50, 0, 0x0011,
        [mkAttack(1, 0, 3, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1900, 0, 0, 3,
        0xA4, 0x0,
        0x00230400 >>> 0, 0x04100000 >>> 0, 0x0000,
        15, 7),
    mkMon(258, 'PM_GLASS_GOLEM', /* glass golem */
        'glass golem', null, '\'', 55,
        16, 6, 1, 50, 0, 0x0011,
        [mkAttack(1, 0, 2, 8), mkAttack(1, 0, 2, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1800, 0, 0, 3,
        0x64, 0x0,
        0x00230400 >>> 0, 0x04100000 >>> 0, 0x0000,
        18, 6),
    mkMon(259, 'PM_IRON_GOLEM', /* iron golem */
        'iron golem', null, '\'', 55,
        18, 6, 3, 60, 0, 0x0011,
        [mkAttack(254, 0, 4, 10), mkAttack(12, 7, 4, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2000, 0, 0, 3,
        0x37, 0x0,
        0x10230400 >>> 0, 0x44100000 >>> 0, 0x0000,
        22, 6),
    mkMon(260, 'PM_HUMAN', /* human */
        'human', null, '@', 53,
        0, 12, 10, 0, 0, 0x0200,
        [mkAttack(254, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 25, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x44000009 >>> 0, 0x0200,
        2, 15),
    mkMon(261, 'PM_HUMAN_WERERAT', /* wererat */
        'wererat', null, '@', 53,
        2, 12, 10, 10, -7, 0x0001,
        [mkAttack(254, 0, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 23, 2,
        0x20, 0x0,
        0x70820000 >>> 0, 0x4010000D >>> 0, 0x0200,
        3, 3),
    mkMon(262, 'PM_HUMAN_WEREJACKAL', /* werejackal */
        'werejackal', null, '@', 53,
        2, 12, 10, 10, -7, 0x0001,
        [mkAttack(254, 0, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 23, 2,
        0x20, 0x0,
        0x70820000 >>> 0, 0x4010000D >>> 0, 0x0200,
        3, 1),
    mkMon(263, 'PM_HUMAN_WEREWOLF', /* werewolf */
        'werewolf', null, '@', 53,
        5, 12, 10, 20, -7, 0x0001,
        [mkAttack(254, 0, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 23, 2,
        0x20, 0x0,
        0x70820000 >>> 0, 0x4010000D >>> 0, 0x0200,
        6, 9),
    mkMon(264, 'PM_ELF', /* elf */
        'elf', null, '@', 53,
        0, 12, 10, 2, -3, 0x0200,
        [mkAttack(254, 0, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        800, 350, 25, 2,
        0x4, 0x4,
        0x61020000 >>> 0, 0x40000011 >>> 0, 0x0300,
        1, 15),
    mkMon(265, 'PM_WOODLAND_ELF', /* Woodland-elf */
        'Woodland-elf', null, '@', 53,
        4, 12, 10, 10, -5, 0x00A2,
        [mkAttack(254, 0, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        800, 350, 25, 2,
        0x4, 0x4,
        0x61020000 >>> 0, 0x40000010 >>> 0, 0x0300,
        6, 2),
    mkMon(266, 'PM_GREEN_ELF', /* Green-elf */
        'Green-elf', null, '@', 53,
        5, 12, 10, 10, -6, 0x00A2,
        [mkAttack(254, 0, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        800, 350, 25, 2,
        0x4, 0x4,
        0x61020000 >>> 0, 0x40000010 >>> 0, 0x0300,
        7, 10),
    mkMon(267, 'PM_GREY_ELF', /* Grey-elf */
        'Grey-elf', null, '@', 53,
        6, 12, 10, 10, -7, 0x00A2,
        [mkAttack(254, 0, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        800, 350, 25, 2,
        0x4, 0x4,
        0x61020000 >>> 0, 0x40000010 >>> 0, 0x0300,
        8, 7),
    mkMon(268, 'PM_ELF_NOBLE', /* elf-noble */
        'elf-noble', ['elf-lord', 'elf-lady', 'elf-noble'], '@', 53,
        8, 12, 10, 20, -9, 0x00A2,
        [mkAttack(254, 0, 2, 4), mkAttack(254, 0, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        800, 350, 25, 2,
        0x4, 0x4,
        0x61020000 >>> 0, 0x44000410 >>> 0, 0x0300,
        11, 12),
    mkMon(269, 'PM_ELVEN_MONARCH', /* elven monarch */
        'elven monarch', ['Elvenking', 'Elvenqueen', 'elven monarch'], '@', 53,
        9, 12, 10, 25, -10, 0x0021,
        [mkAttack(254, 0, 2, 4), mkAttack(254, 0, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        800, 350, 25, 2,
        0x4, 0x4,
        0x61020000 >>> 0, 0x44000810 >>> 0, 0x0300,
        11, 5),
    mkMon(270, 'PM_DOPPELGANGER', /* doppelganger */
        'doppelganger', null, '@', 53,
        9, 12, 5, 20, 0, 0x0021,
        [mkAttack(254, 0, 1, 12), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 22, 2,
        0x4, 0x0,
        0x60020000 >>> 0, 0x44104009 >>> 0, 0x0200,
        11, 15),
    mkMon(271, 'PM_SHOPKEEPER', /* shopkeeper */
        'shopkeeper', null, '@', 53,
        12, 16, 0, 50, 0, 0x0200,
        [mkAttack(254, 0, 4, 4), mkAttack(254, 0, 4, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 39, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0xC4200009 >>> 0, 0x0200,
        15, 15),
    mkMon(272, 'PM_GUARD', /* guard */
        'guard', null, '@', 53,
        12, 12, 10, 40, 10, 0x0200,
        [mkAttack(254, 0, 4, 10), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 28, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x44200209 >>> 0, 0x0200,
        14, 4),
    mkMon(273, 'PM_PRISONER', /* prisoner */
        'prisoner', null, '@', 53,
        12, 12, 10, 0, 0, 0x0200,
        [mkAttack(254, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 29, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x44200009 >>> 0, 0x0280,
        14, 15),
    mkMon(274, 'PM_ORACLE', /* Oracle */
        'Oracle', null, '@', 53,
        12, 0, 0, 50, 0, 0x1200,
        [mkAttack(0, 1, 0, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 40, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x00220009 >>> 0, 0x0200,
        13, 12),
    mkMon(275, 'PM_ALIGNED_CLERIC', /* aligned cleric */
        'aligned cleric', ['priest', 'priestess', 'aligned cleric'], '@', 53,
        12, 12, 10, 50, 0, 0x0200,
        [mkAttack(254, 0, 4, 10), mkAttack(3, 0, 1, 4), mkAttack(255, 240, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 41, 2,
        0x10, 0x0,
        0x60020000 >>> 0, 0x40200409 >>> 0, 0x0200,
        15, 15),
    mkMon(276, 'PM_HIGH_CLERIC', /* high cleric */
        'high cleric', ['high priest', 'high priestess', 'high cleric'], '@', 53,
        25, 15, 7, 70, 0, 0x1200,
        [mkAttack(254, 0, 4, 10), mkAttack(3, 0, 2, 8), mkAttack(255, 240, 2, 8), mkAttack(255, 240, 2, 8), NO_ATTK(), NO_ATTK()],
        1450, 400, 41, 2,
        0x35, 0x0,
        0x61020000 >>> 0, 0xC2001809 >>> 0, 0x0200,
        30, 15),
    mkMon(277, 'PM_SOLDIER', /* soldier */
        'soldier', null, '@', 53,
        6, 10, 10, 0, -2, 0x00A1,
        [mkAttack(254, 0, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 27, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x45100209 >>> 0, 0x0200,
        8, 7),
    mkMon(278, 'PM_SERGEANT', /* sergeant */
        'sergeant', null, '@', 53,
        8, 10, 10, 5, -3, 0x00A1,
        [mkAttack(254, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 27, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x45100209 >>> 0, 0x0200,
        10, 1),
    mkMon(279, 'PM_NURSE', /* nurse */
        'nurse', null, '@', 53,
        11, 6, 0, 0, 0, 0x0023,
        [mkAttack(1, 27, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 30, 2,
        0x20, 0x20,
        0x60020000 >>> 0, 0x00100009 >>> 0, 0x0200,
        13, 15),
    mkMon(280, 'PM_LIEUTENANT', /* lieutenant */
        'lieutenant', null, '@', 53,
        10, 10, 10, 15, -4, 0x0021,
        [mkAttack(254, 0, 3, 4), mkAttack(254, 0, 3, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 27, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x45100209 >>> 0, 0x0200,
        12, 2),
    mkMon(281, 'PM_CAPTAIN', /* captain */
        'captain', null, '@', 53,
        12, 10, 10, 15, -5, 0x0021,
        [mkAttack(254, 0, 4, 4), mkAttack(254, 0, 4, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 27, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x45100209 >>> 0, 0x0200,
        14, 4),
    mkMon(282, 'PM_WATCHMAN', /* watchman */
        'watchman', null, '@', 53,
        6, 10, 10, 0, -2, 0x02A1,
        [mkAttack(254, 0, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 27, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x45200209 >>> 0, 0x0200,
        8, 7),
    mkMon(283, 'PM_WATCH_CAPTAIN', /* watch captain */
        'watch captain', null, '@', 53,
        10, 10, 10, 15, -4, 0x0221,
        [mkAttack(254, 0, 3, 4), mkAttack(254, 0, 3, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 27, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x45200209 >>> 0, 0x0200,
        12, 2),
    mkMon(284, 'PM_MEDUSA', /* Medusa */
        'Medusa', null, '@', 53,
        20, 12, 2, 50, -15, 0x1200,
        [mkAttack(254, 0, 2, 4), mkAttack(1, 0, 1, 8), mkAttack(15, 18, 0, 0), mkAttack(2, 7, 1, 6), NO_ATTK(), NO_ATTK()],
        1450, 400, 9, 3,
        0xA0, 0xA0,
        0x70020203 >>> 0, 0x041A0001 >>> 0, 0x0240,
        25, 10),
    mkMon(285, 'PM_WIZARD_OF_YENDOR', /* Wizard of Yendor */
        'Wizard of Yendor', null, '@', 53,
        30, 12, -8, 100, -128, 0x1200,
        [mkAttack(1, 252, 2, 12), mkAttack(255, 241, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 34, 2,
        0x21, 0x21,
        0x67820401 >>> 0, 0x86110809 >>> 0, 0x025F,
        34, 13),
    mkMon(286, 'PM_CROESUS', /* Croesus */
        'Croesus', null, '@', 53,
        20, 15, 0, 40, 15, 0x1200,
        [mkAttack(254, 0, 4, 10), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 28, 2,
        0x0, 0x0,
        0x61020000 >>> 0, 0xF7190809 >>> 0, 0x0200,
        22, 5),
    mkMon(287, 'PM_GHOST', /* ghost */
        'ghost', null, ' ', 54,
        10, 3, -5, 50, -5, 0x0210,
        [mkAttack(5, 0, 1, 1), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 0, 0, 2,
        0xAE, 0x0,
        0x00120409 >>> 0, 0x01100003 >>> 0, 0x0100,
        12, 7),
    mkMon(288, 'PM_SHADE', /* shade */
        'shade', null, ' ', 54,
        12, 10, 10, 0, 0, 0x0210,
        [mkAttack(5, 14, 2, 6), mkAttack(5, 13, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 0, 14, 2,
        0xAE, 0x0,
        0x01120409 >>> 0, 0x03900003 >>> 0, 0x0100,
        14, 0),
    mkMon(289, 'PM_WATER_DEMON', /* water demon */
        'water demon', null, '&', 56,
        8, 12, -4, 30, -7, 0x0210,
        [mkAttack(254, 0, 1, 3), mkAttack(1, 0, 1, 3), mkAttack(2, 0, 1, 3), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 29, 2,
        0x21, 0x0,
        0x10020002 >>> 0, 0x43100101 >>> 0, 0x0300,
        11, 4),
    mkMon(290, 'PM_AMOROUS_DEMON', /* amorous demon */
        'amorous demon', ['incubus', 'succubus', 'amorous demon'], '&', 56,
        6, 12, 0, 70, -9, 0x0011,
        [mkAttack(2, 35, 0, 0), mkAttack(1, 0, 1, 3), mkAttack(1, 0, 1, 3), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 31, 2,
        0x21, 0x0,
        0x10020001 >>> 0, 0x03100100 >>> 0, 0x0300,
        8, 7),
    mkMon(291, 'PM_HORNED_DEVIL', /* horned devil */
        'horned devil', null, '&', 56,
        6, 9, -5, 50, 11, 0x0412,
        [mkAttack(254, 0, 1, 4), mkAttack(1, 0, 1, 4), mkAttack(2, 0, 2, 3), mkAttack(6, 0, 1, 3), NO_ATTK(), NO_ATTK()],
        1450, 400, 0, 2,
        0x21, 0x0,
        0x10200000 >>> 0, 0x03100100 >>> 0, 0x0300,
        9, 3),
    mkMon(292, 'PM_ERINYS', /* erinys */
        'erinys', null, '&', 56,
        7, 12, 2, 30, 10, 0x0492,
        [mkAttack(254, 7, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 0, 2,
        0x21, 0x0,
        0x10020000 >>> 0, 0x47020101 >>> 0, 0x0300,
        10, 1),
    mkMon(293, 'PM_BARBED_DEVIL', /* barbed devil */
        'barbed devil', null, '&', 56,
        8, 12, 0, 35, 8, 0x0492,
        [mkAttack(1, 0, 2, 4), mkAttack(1, 19, 2, 4), mkAttack(6, 0, 3, 4), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 0, 2,
        0x21, 0x0,
        0x10200000 >>> 0, 0x03100100 >>> 0, 0x0300,
        11, 1),
    mkMon(294, 'PM_MARILITH', /* marilith */
        'marilith', null, '&', 56,
        7, 12, -6, 80, -12, 0x0411,
        [mkAttack(254, 0, 2, 4), mkAttack(254, 0, 2, 4), mkAttack(1, 0, 2, 4), mkAttack(1, 0, 2, 4), mkAttack(1, 0, 2, 4), mkAttack(1, 0, 2, 4)],
        1450, 400, 34, 3,
        0x21, 0x0,
        0x110A0000 >>> 0, 0x43120100 >>> 0, 0x0300,
        11, 1),
    mkMon(295, 'PM_VROCK', /* vrock */
        'vrock', null, '&', 56,
        8, 12, 0, 50, -9, 0x0492,
        [mkAttack(1, 0, 1, 4), mkAttack(1, 0, 1, 4), mkAttack(1, 0, 1, 8), mkAttack(1, 0, 1, 8), mkAttack(2, 0, 1, 6), NO_ATTK()],
        1450, 400, 0, 3,
        0x21, 0x0,
        0x10000000 >>> 0, 0x03100100 >>> 0, 0x0300,
        11, 2),
    mkMon(296, 'PM_HEZROU', /* hezrou */
        'hezrou', null, '&', 56,
        9, 6, -2, 55, -10, 0x0492,
        [mkAttack(1, 0, 1, 3), mkAttack(1, 0, 1, 3), mkAttack(2, 0, 4, 4), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 0, 3,
        0x21, 0x0,
        0x10020000 >>> 0, 0x03100100 >>> 0, 0x0300,
        12, 2),
    mkMon(297, 'PM_BONE_DEVIL', /* bone devil */
        'bone devil', null, '&', 56,
        9, 15, -1, 40, -9, 0x0492,
        [mkAttack(254, 0, 3, 4), mkAttack(6, 7, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 0, 3,
        0x21, 0x0,
        0x10000000 >>> 0, 0x43100100 >>> 0, 0x0300,
        13, 7),
    mkMon(298, 'PM_ICE_DEVIL', /* ice devil */
        'ice devil', null, '&', 56,
        11, 6, -4, 55, -12, 0x0412,
        [mkAttack(1, 0, 1, 4), mkAttack(1, 0, 1, 4), mkAttack(2, 0, 2, 4), mkAttack(6, 3, 3, 4), mkAttack(5, 13, 1, 1), NO_ATTK()],
        1450, 400, 0, 3,
        0x23, 0x0,
        0x11000000 >>> 0, 0x03100100 >>> 0, 0x0300,
        15, 15),
    mkMon(299, 'PM_NALFESHNEE', /* nalfeshnee */
        'nalfeshnee', null, '&', 56,
        11, 9, -1, 65, -11, 0x0411,
        [mkAttack(1, 0, 1, 4), mkAttack(1, 0, 1, 4), mkAttack(2, 0, 2, 4), mkAttack(255, 241, 0, 0), NO_ATTK(), NO_ATTK()],
        1450, 400, 42, 3,
        0x21, 0x0,
        0x10020000 >>> 0, 0x03100100 >>> 0, 0x0300,
        15, 1),
    mkMon(300, 'PM_PIT_FIEND', /* pit fiend */
        'pit fiend', null, '&', 56,
        13, 6, -3, 65, -13, 0x0412,
        [mkAttack(254, 0, 4, 2), mkAttack(254, 0, 4, 2), mkAttack(7, 0, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 5, 3,
        0x21, 0x0,
        0x11000000 >>> 0, 0x43100100 >>> 0, 0x0300,
        16, 1),
    mkMon(301, 'PM_SANDESTIN', /* sandestin */
        'sandestin', null, '&', 56,
        13, 12, 4, 60, -5, 0x0411,
        [mkAttack(254, 0, 2, 6), mkAttack(254, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1500, 400, 34, 2,
        0x80, 0x0,
        0x00020000 >>> 0, 0x45004001 >>> 0, 0x0300,
        15, 7),
    mkMon(302, 'PM_BALROG', /* balrog */
        'balrog', null, '&', 56,
        16, 5, -2, 75, -14, 0x0411,
        [mkAttack(254, 0, 8, 4), mkAttack(254, 0, 4, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 0, 3,
        0x21, 0x0,
        0x11000001 >>> 0, 0x47100100 >>> 0, 0x0300,
        20, 1),
    mkMon(303, 'PM_JUIBLEX', /* Juiblex */
        'Juiblex', null, '&', 56,
        50, 3, -7, 65, -15, 0x1610,
        [mkAttack(11, 33, 4, 10), mkAttack(10, 8, 3, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1500, 0, 15, 3,
        0xE1, 0x0,
        0x19008205 >>> 0, 0x03190501 >>> 0, 0x0141,
        26, 10),
    mkMon(304, 'PM_YEENOGHU', /* Yeenoghu */
        'Yeenoghu', null, '&', 56,
        56, 18, -5, 80, -15, 0x1610,
        [mkAttack(254, 0, 3, 6), mkAttack(254, 25, 2, 8), mkAttack(1, 14, 1, 6), mkAttack(255, 1, 2, 6), NO_ATTK(), NO_ATTK()],
        900, 500, 24, 3,
        0x21, 0x0,
        0x11000001 >>> 0, 0x43190501 >>> 0, 0x0301,
        31, 5),
    mkMon(305, 'PM_ORCUS', /* Orcus */
        'Orcus', null, '&', 56,
        66, 9, -6, 85, -20, 0x1610,
        [mkAttack(254, 0, 3, 6), mkAttack(1, 0, 3, 4), mkAttack(1, 0, 3, 4), mkAttack(255, 241, 8, 6), mkAttack(6, 7, 2, 4), NO_ATTK()],
        1500, 500, 24, 4,
        0x21, 0x0,
        0x11000001 >>> 0, 0x43190901 >>> 0, 0x0345,
        36, 5),
    mkMon(306, 'PM_GERYON', /* Geryon */
        'Geryon', null, '&', 56,
        72, 3, -3, 75, 15, 0x1610,
        [mkAttack(1, 0, 3, 6), mkAttack(1, 0, 3, 6), mkAttack(6, 7, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1500, 500, 33, 4,
        0x21, 0x0,
        0x11080001 >>> 0, 0x03190901 >>> 0, 0x0301,
        36, 5),
    mkMon(307, 'PM_DISPATER', /* Dispater */
        'Dispater', null, '&', 56,
        78, 15, -2, 80, 15, 0x1610,
        [mkAttack(254, 0, 4, 6), mkAttack(255, 241, 6, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1500, 500, 33, 2,
        0x21, 0x0,
        0x11020001 >>> 0, 0x43190901 >>> 0, 0x0301,
        40, 5),
    mkMon(308, 'PM_BAALZEBUB', /* Baalzebub */
        'Baalzebub', null, '&', 56,
        89, 9, -5, 85, 20, 0x1610,
        [mkAttack(2, 7, 2, 6), mkAttack(15, 12, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1500, 500, 33, 3,
        0x21, 0x0,
        0x11000001 >>> 0, 0x03190901 >>> 0, 0x0341,
        45, 5),
    mkMon(309, 'PM_ASMODEUS', /* Asmodeus */
        'Asmodeus', null, '&', 56,
        105, 12, -7, 90, 20, 0x1610,
        [mkAttack(1, 0, 4, 4), mkAttack(255, 3, 6, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1500, 500, 33, 4,
        0x23, 0x0,
        0x11020001 >>> 0, 0x07190901 >>> 0, 0x0341,
        53, 5),
    mkMon(310, 'PM_DEMOGORGON', /* Demogorgon */
        'Demogorgon', null, '&', 56,
        106, 15, -8, 95, -20, 0x1610,
        [mkAttack(255, 241, 8, 6), mkAttack(6, 15, 1, 4), mkAttack(1, 33, 1, 6), mkAttack(1, 33, 1, 6), NO_ATTK(), NO_ATTK()],
        1500, 500, 5, 4,
        0x21, 0x0,
        0x11002001 >>> 0, 0x03190901 >>> 0, 0x0301,
        57, 5),
    mkMon(311, 'PM_DEATH', /* Death */
        'Death', null, '&', 56,
        30, 12, -5, 100, 0, 0x1200,
        [mkAttack(5, 37, 8, 8), mkAttack(5, 37, 8, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 1, 35, 2,
        0xB7, 0x0,
        0x05820001 >>> 0, 0x07180001 >>> 0, 0x0700,
        34, 13),
    mkMon(312, 'PM_PESTILENCE', /* Pestilence */
        'Pestilence', null, '&', 56,
        30, 12, -5, 100, 0, 0x1200,
        [mkAttack(5, 38, 8, 8), mkAttack(5, 38, 8, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 1, 35, 2,
        0xB7, 0x0,
        0x05820001 >>> 0, 0x07180001 >>> 0, 0x0700,
        34, 13),
    mkMon(313, 'PM_FAMINE', /* Famine */
        'Famine', null, '&', 56,
        30, 12, -5, 100, 0, 0x1200,
        [mkAttack(5, 39, 8, 8), mkAttack(5, 39, 8, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 1, 35, 2,
        0xB7, 0x0,
        0x05820001 >>> 0, 0x07180001 >>> 0, 0x0700,
        34, 13),
    mkMon(314, 'PM_MAIL_DAEMON', /* mail daemon */
        'mail daemon', null, '&', 56,
        56, 24, 10, 127, 0, 0x0210,
        [NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        600, 300, 0, 2,
        0xB7, 0x0,
        0x11020403 >>> 0, 0x01200001 >>> 0, 0x0300,
        26, 12),
    mkMon(315, 'PM_DJINNI', /* djinni */
        'djinni', null, '&', 56,
        7, 12, 4, 30, 0, 0x0210,
        [mkAttack(254, 0, 2, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1500, 400, 29, 2,
        0xA0, 0x0,
        0x10020001 >>> 0, 0x41000001 >>> 0, 0x0200,
        8, 11),
    mkMon(316, 'PM_JELLYFISH', /* jellyfish */
        'jellyfish', null, ';', 57,
        3, 3, 6, 0, 0, 0x0220,
        [mkAttack(6, 7, 3, 3), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        80, 20, 0, 1,
        0x20, 0x20,
        0x1000EA02 >>> 0, 0x00100000 >>> 0, 0x0000,
        5, 4),
    mkMon(317, 'PM_PIRANHA', /* piranha */
        'piranha', null, ';', 57,
        5, 18, 4, 0, 0, 0x02A0,
        [mkAttack(2, 0, 2, 6), mkAttack(2, 0, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        60, 30, 0, 1,
        0x0, 0x0,
        0x20446A02 >>> 0, 0x00100000 >>> 0, 0x0000,
        7, 1),
    mkMon(318, 'PM_SHARK', /* shark */
        'shark', null, ';', 57,
        7, 12, 2, 0, 0, 0x0220,
        [mkAttack(2, 0, 5, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        500, 350, 0, 3,
        0x0, 0x0,
        0x20646A02 >>> 0, 0x00100000 >>> 0, 0x0000,
        9, 7),
    mkMon(319, 'PM_GIANT_EEL', /* giant eel */
        'giant eel', null, ';', 57,
        5, 9, -1, 0, 0, 0x0220,
        [mkAttack(2, 0, 3, 6), mkAttack(5, 28, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        200, 250, 0, 4,
        0x0, 0x0,
        0x204C6A02 >>> 0, 0x00100000 >>> 0, 0x0200,
        7, 6),
    mkMon(320, 'PM_ELECTRIC_EEL', /* electric eel */
        'electric eel', null, ';', 57,
        7, 10, -3, 0, 0, 0x0220,
        [mkAttack(2, 6, 4, 6), mkAttack(5, 28, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        200, 250, 0, 4,
        0x10, 0x10,
        0x204C6A02 >>> 0, 0x00100000 >>> 0, 0x0200,
        10, 12),
    mkMon(321, 'PM_KRAKEN', /* kraken */
        'kraken', null, ';', 57,
        20, 3, 6, 0, -3, 0x0220,
        [mkAttack(1, 0, 2, 4), mkAttack(1, 0, 2, 4), mkAttack(7, 28, 2, 6), mkAttack(2, 0, 5, 4), NO_ATTK(), NO_ATTK()],
        1800, 1000, 0, 4,
        0x0, 0x0,
        0x20042202 >>> 0, 0x04100001 >>> 0, 0x0200,
        22, 1),
    mkMon(322, 'PM_NEWT', /* newt */
        'newt', null, ':', 58,
        0, 6, 8, 0, 0, 0x0025,
        [mkAttack(2, 0, 1, 2), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        10, 20, 0, 0,
        0x0, 0x0,
        0x20042202 >>> 0, 0x00100000 >>> 0, 0x0000,
        1, 11),
    mkMon(323, 'PM_GECKO', /* gecko */
        'gecko', null, ':', 58,
        1, 6, 8, 0, 0, 0x0025,
        [mkAttack(2, 0, 1, 3), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        10, 20, 6, 0,
        0x0, 0x0,
        0x20042000 >>> 0, 0x00100000 >>> 0, 0x0000,
        2, 2),
    mkMon(324, 'PM_IGUANA', /* iguana */
        'iguana', null, ':', 58,
        2, 6, 7, 0, 0, 0x0025,
        [mkAttack(2, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        30, 30, 0, 0,
        0x0, 0x0,
        0x20042000 >>> 0, 0x00100000 >>> 0, 0x0000,
        3, 3),
    mkMon(325, 'PM_BABY_CROCODILE', /* baby crocodile */
        'baby crocodile', null, ':', 58,
        3, 6, 7, 0, 0, 0x0020,
        [mkAttack(2, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        200, 200, 8, 2,
        0x0, 0x0,
        0x20042202 >>> 0, 0x00100000 >>> 0, 0x0000,
        4, 3),
    mkMon(326, 'PM_LIZARD', /* lizard */
        'lizard', null, ':', 58,
        5, 6, 6, 10, 0, 0x0025,
        [mkAttack(2, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        10, 40, 0, 0,
        0x80, 0x80,
        0x20042000 >>> 0, 0x00100000 >>> 0, 0x0000,
        6, 2),
    mkMon(327, 'PM_CHAMELEON', /* chameleon */
        'chameleon', null, ':', 58,
        6, 5, 6, 10, 0, 0x0022,
        [mkAttack(2, 0, 4, 2), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        100, 100, 0, 0,
        0x0, 0x0,
        0x20042000 >>> 0, 0x00104001 >>> 0, 0x0000,
        7, 3),
    mkMon(328, 'PM_CROCODILE', /* crocodile */
        'crocodile', null, ':', 58,
        6, 9, 5, 0, 0, 0x0021,
        [mkAttack(2, 0, 4, 2), mkAttack(1, 0, 1, 12), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 4, 3,
        0x0, 0x0,
        0x20642202 >>> 0, 0x04100000 >>> 0, 0x0000,
        7, 3),
    mkMon(329, 'PM_SALAMANDER', /* salamander */
        'salamander', null, ':', 58,
        8, 12, -1, 0, -9, 0x0401,
        [mkAttack(254, 0, 2, 8), mkAttack(5, 2, 1, 6), mkAttack(7, 0, 2, 6), mkAttack(7, 2, 3, 6), NO_ATTK(), NO_ATTK()],
        1500, 400, 21, 2,
        0x5, 0x1,
        0x102A0000 >>> 0, 0xC1100000 >>> 0, 0x0200,
        12, 9),
    mkMon(330, 'PM_LONG_WORM_TAIL', /* long worm tail */
        'long worm tail', null, '~', 59,
        0, 0, 0, 0, 0, 0x1210,
        [NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        0, 0, 0, 0,
        0x0, 0x0,
        0x00000000 >>> 0, 0x00000001 >>> 0, 0x0000,
        1, 3),
    mkMon(331, 'PM_ARCHEOLOGIST', /* archeologist */
        'archeologist', null, '@', 53,
        10, 12, 10, 1, 3, 0x0200,
        [mkAttack(254, 0, 1, 6), mkAttack(254, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 25, 2,
        0x0, 0x0,
        0x60020060 >>> 0, 0x44000009 >>> 0, 0x0200,
        12, 15),
    mkMon(332, 'PM_BARBARIAN', /* barbarian */
        'barbarian', null, '@', 53,
        10, 12, 10, 1, 0, 0x0200,
        [mkAttack(254, 0, 1, 6), mkAttack(254, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 25, 2,
        0x20, 0x0,
        0x60020000 >>> 0, 0x44000009 >>> 0, 0x0200,
        12, 15),
    mkMon(333, 'PM_CAVE_DWELLER', /* cave dweller */
        'cave dweller', ['caveman', 'cavewoman', 'cave dweller'], '@', 53,
        10, 12, 10, 0, 1, 0x0200,
        [mkAttack(254, 0, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 25, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x44000009 >>> 0, 0x0200,
        12, 15),
    mkMon(334, 'PM_HEALER', /* healer */
        'healer', null, '@', 53,
        10, 12, 10, 1, 0, 0x0200,
        [mkAttack(254, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 25, 2,
        0x20, 0x0,
        0x60020000 >>> 0, 0x44000009 >>> 0, 0x0200,
        12, 15),
    mkMon(335, 'PM_KNIGHT', /* knight */
        'knight', null, '@', 53,
        10, 12, 10, 1, 3, 0x0200,
        [mkAttack(254, 0, 1, 6), mkAttack(254, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 25, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x44000009 >>> 0, 0x0200,
        12, 15),
    mkMon(336, 'PM_MONK', /* monk */
        'monk', null, '@', 53,
        10, 12, 10, 2, 0, 0x0200,
        [mkAttack(1, 0, 1, 8), mkAttack(3, 0, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 25, 2,
        0x0, 0x0,
        0x40020000 >>> 0, 0x44000009 >>> 0, 0x0200,
        11, 15),
    mkMon(337, 'PM_CLERIC', /* cleric */
        'cleric', ['priest', 'priestess', 'cleric'], '@', 53,
        10, 12, 10, 2, 0, 0x0200,
        [mkAttack(254, 0, 1, 6), mkAttack(255, 240, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 25, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x44000009 >>> 0, 0x0200,
        12, 15),
    mkMon(338, 'PM_RANGER', /* ranger */
        'ranger', null, '@', 53,
        10, 12, 10, 2, -3, 0x0200,
        [mkAttack(254, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 25, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x44000009 >>> 0, 0x0200,
        12, 15),
    mkMon(339, 'PM_ROGUE', /* rogue */
        'rogue', null, '@', 53,
        10, 12, 10, 1, -3, 0x0200,
        [mkAttack(254, 0, 1, 6), mkAttack(254, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 25, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x74000009 >>> 0, 0x0200,
        12, 15),
    mkMon(340, 'PM_SAMURAI', /* samurai */
        'samurai', null, '@', 53,
        10, 12, 10, 1, 3, 0x0200,
        [mkAttack(254, 0, 1, 8), mkAttack(254, 0, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 25, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x44000009 >>> 0, 0x0200,
        12, 15),
    mkMon(341, 'PM_TOURIST', /* tourist */
        'tourist', null, '@', 53,
        10, 12, 10, 1, 0, 0x0200,
        [mkAttack(254, 0, 1, 6), mkAttack(254, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 25, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x44000009 >>> 0, 0x0200,
        12, 15),
    mkMon(342, 'PM_VALKYRIE', /* valkyrie */
        'valkyrie', null, '@', 53,
        10, 12, 10, 1, 1, 0x0200,
        [mkAttack(254, 0, 1, 8), mkAttack(254, 0, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 25, 2,
        0x2, 0x0,
        0x60020000 >>> 0, 0x44020009 >>> 0, 0x0200,
        12, 15),
    mkMon(343, 'PM_WIZARD', /* wizard */
        'wizard', null, '@', 53,
        10, 12, 10, 3, 0, 0x0200,
        [mkAttack(254, 0, 1, 6), mkAttack(255, 241, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 25, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0xC4000009 >>> 0, 0x0200,
        12, 15),
    mkMon(344, 'PM_LORD_CARNARVON', /* Lord Carnarvon */
        'Lord Carnarvon', null, '@', 53,
        20, 15, 0, 90, 20, 0x1200,
        [mkAttack(254, 0, 4, 10), mkAttack(255, 241, 4, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 36, 2,
        0x0, 0x0,
        0x60020060 >>> 0, 0xC4290009 >>> 0, 0x0280,
        24, 5),
    mkMon(345, 'PM_PELIAS', /* Pelias */
        'Pelias', null, '@', 53,
        20, 15, 0, 90, 0, 0x1200,
        [mkAttack(254, 0, 4, 10), mkAttack(254, 0, 4, 10), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 36, 2,
        0x20, 0x0,
        0x60020000 >>> 0, 0xC4290009 >>> 0, 0x0280,
        24, 5),
    mkMon(346, 'PM_SHAMAN_KARNOV', /* Shaman Karnov */
        'Shaman Karnov', null, '@', 53,
        20, 15, 0, 90, 20, 0x1200,
        [mkAttack(254, 0, 4, 10), mkAttack(255, 240, 2, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 36, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0xC4290009 >>> 0, 0x0280,
        24, 5),
    mkMon(347, 'PM_HIPPOCRATES', /* Hippocrates */
        'Hippocrates', null, '@', 53,
        20, 15, 0, 90, 0, 0x1200,
        [mkAttack(254, 0, 1, 6), mkAttack(255, 240, 3, 8), mkAttack(255, 240, 3, 8), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 36, 2,
        0x20, 0x0,
        0x60020000 >>> 0, 0xC4290009 >>> 0, 0x0280,
        26, 5),
    mkMon(348, 'PM_KING_ARTHUR', /* King Arthur */
        'King Arthur', null, '@', 53,
        20, 15, 0, 90, 20, 0x1200,
        [mkAttack(254, 0, 4, 10), mkAttack(254, 0, 4, 10), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 36, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0xC4290009 >>> 0, 0x0280,
        24, 5),
    mkMon(349, 'PM_GRAND_MASTER', /* Grand Master */
        'Grand Master', null, '@', 53,
        25, 15, 0, 90, 0, 0x1200,
        [mkAttack(1, 0, 4, 10), mkAttack(3, 0, 2, 8), mkAttack(255, 240, 2, 8), mkAttack(255, 240, 2, 8), NO_ATTK(), NO_ATTK()],
        1450, 400, 36, 2,
        0x35, 0x0,
        0x41020000 >>> 0, 0x86210009 >>> 0, 0x0280,
        30, 0),
    mkMon(350, 'PM_ARCH_PRIEST', /* Arch Priest */
        'Arch Priest', null, '@', 53,
        25, 15, 7, 90, 0, 0x1200,
        [mkAttack(254, 0, 4, 10), mkAttack(3, 0, 2, 8), mkAttack(255, 240, 2, 8), mkAttack(255, 240, 2, 8), NO_ATTK(), NO_ATTK()],
        1450, 400, 36, 2,
        0x35, 0x0,
        0x61020000 >>> 0, 0xC4210009 >>> 0, 0x0280,
        30, 15),
    mkMon(351, 'PM_ORION', /* Orion */
        'Orion', null, '@', 53,
        20, 15, 0, 90, 0, 0x1200,
        [mkAttack(254, 0, 4, 10), mkAttack(255, 241, 4, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2200, 700, 36, 4,
        0x0, 0x0,
        0x61020202 >>> 0, 0xC4290009 >>> 0, 0x0380,
        24, 5),
    mkMon(352, 'PM_MASTER_OF_THIEVES', /* Master of Thieves */
        'Master of Thieves', null, '@', 53,
        20, 15, 0, 90, -20, 0x1200,
        [mkAttack(254, 0, 4, 10), mkAttack(254, 0, 2, 6), mkAttack(1, 252, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 36, 2,
        0x80, 0x0,
        0x60020000 >>> 0, 0xF4210009 >>> 0, 0x0280,
        24, 5),
    mkMon(353, 'PM_LORD_SATO', /* Lord Sato */
        'Lord Sato', null, '@', 53,
        20, 15, 0, 90, 20, 0x1200,
        [mkAttack(254, 0, 4, 10), mkAttack(254, 0, 4, 10), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 36, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0xC4290009 >>> 0, 0x0280,
        24, 5),
    mkMon(354, 'PM_TWOFLOWER', /* Twoflower */
        'Twoflower', null, '@', 53,
        20, 15, 10, 90, 0, 0x1200,
        [mkAttack(254, 0, 4, 10), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 36, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0xC4290009 >>> 0, 0x0280,
        22, 15),
    mkMon(355, 'PM_NORN', /* Norn */
        'Norn', null, '@', 53,
        20, 15, 0, 90, 0, 0x1200,
        [mkAttack(254, 0, 4, 10), mkAttack(254, 0, 4, 10), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1800, 550, 36, 4,
        0x2, 0x0,
        0x60020000 >>> 0, 0xC4220009 >>> 0, 0x0280,
        24, 5),
    mkMon(356, 'PM_NEFERET_THE_GREEN', /* Neferet the Green */
        'Neferet the Green', null, '@', 53,
        20, 15, 0, 90, 0, 0x1200,
        [mkAttack(254, 0, 4, 10), mkAttack(255, 241, 2, 8), mkAttack(255, 241, 2, 8), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 36, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0xC42A0009 >>> 0, 0x0280,
        25, 2),
    mkMon(357, 'PM_MINION_OF_HUHETOTL', /* Minion of Huhetotl */
        'Minion of Huhetotl', null, '&', 56,
        16, 12, -2, 75, -14, 0x1210,
        [mkAttack(254, 0, 8, 4), mkAttack(254, 0, 4, 6), mkAttack(255, 241, 0, 0), mkAttack(1, 252, 2, 6), NO_ATTK(), NO_ATTK()],
        1450, 400, 37, 3,
        0xA1, 0x0,
        0x11000001 >>> 0, 0x47100101 >>> 0, 0x0350,
        23, 9),
    mkMon(358, 'PM_THOTH_AMON', /* Thoth Amon */
        'Thoth Amon', null, '@', 53,
        16, 12, 0, 10, -14, 0x1210,
        [mkAttack(254, 0, 1, 6), mkAttack(255, 241, 0, 0), mkAttack(255, 241, 0, 0), mkAttack(1, 252, 1, 4), NO_ATTK(), NO_ATTK()],
        1450, 400, 37, 2,
        0xA0, 0x0,
        0x60020000 >>> 0, 0xC7190009 >>> 0, 0x0250,
        22, 5),
    mkMon(359, 'PM_CHROMATIC_DRAGON', /* Chromatic Dragon */
        'Chromatic Dragon', null, 'D', 30,
        16, 12, 0, 30, -14, 0x1200,
        [mkAttack(12, 242, 6, 6), mkAttack(255, 241, 0, 0), mkAttack(1, 252, 2, 8), mkAttack(2, 0, 4, 8), mkAttack(2, 0, 4, 8), mkAttack(6, 0, 1, 6)],
        4500, 1700, 37, 7,
        0xFF, 0xFF,
        0x31202000 >>> 0, 0xB7120001 >>> 0, 0x0350,
        23, 5),
    mkMon(360, 'PM_CYCLOPS', /* Cyclops */
        'Cyclops', null, 'H', 34,
        18, 12, 0, 0, -15, 0x1200,
        [mkAttack(254, 0, 4, 8), mkAttack(254, 0, 4, 8), mkAttack(1, 252, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1900, 700, 37, 4,
        0x80, 0x0,
        0x60020000 >>> 0, 0x6F112001 >>> 0, 0x0350,
        23, 7),
    mkMon(361, 'PM_IXOTH', /* Ixoth */
        'Ixoth', null, 'D', 30,
        15, 12, -1, 20, -14, 0x1200,
        [mkAttack(12, 2, 8, 6), mkAttack(2, 0, 4, 8), mkAttack(255, 241, 0, 0), mkAttack(1, 0, 2, 4), mkAttack(1, 252, 2, 4), NO_ATTK()],
        4500, 1600, 37, 7,
        0x81, 0x1,
        0x21202001 >>> 0, 0xB7190001 >>> 0, 0x0250,
        22, 1),
    mkMon(362, 'PM_MASTER_KAEN', /* Master Kaen */
        'Master Kaen', null, '@', 53,
        25, 12, -10, 10, -20, 0x1200,
        [mkAttack(1, 0, 16, 2), mkAttack(1, 0, 16, 2), mkAttack(255, 240, 0, 0), mkAttack(1, 252, 1, 4), NO_ATTK(), NO_ATTK()],
        1450, 400, 37, 2,
        0xA0, 0x20,
        0x41020000 >>> 0, 0xC7190009 >>> 0, 0x0250,
        31, 5),
    mkMon(363, 'PM_NALZOK', /* Nalzok */
        'Nalzok', null, '&', 56,
        16, 12, -2, 85, -127, 0x1210,
        [mkAttack(254, 0, 8, 4), mkAttack(254, 0, 4, 6), mkAttack(255, 241, 0, 0), mkAttack(1, 252, 2, 6), NO_ATTK(), NO_ATTK()],
        1450, 400, 37, 3,
        0xA1, 0x0,
        0x11000001 >>> 0, 0x47190101 >>> 0, 0x0350,
        23, 9),
    mkMon(364, 'PM_SCORPIUS', /* Scorpius */
        'Scorpius', null, 's', 19,
        15, 12, 10, 0, -15, 0x1200,
        [mkAttack(1, 0, 2, 6), mkAttack(1, 252, 2, 6), mkAttack(6, 33, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        750, 350, 37, 2,
        0xA0, 0x20,
        0x30442000 >>> 0, 0xC7190001 >>> 0, 0x0050,
        17, 5),
    mkMon(365, 'PM_MASTER_ASSASSIN', /* Master Assassin */
        'Master Assassin', null, '@', 53,
        15, 12, 0, 30, 18, 0x1200,
        [mkAttack(254, 7, 2, 6), mkAttack(254, 0, 2, 8), mkAttack(1, 252, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 37, 2,
        0x80, 0x0,
        0x60020000 >>> 0, 0xC7110009 >>> 0, 0x0250,
        20, 5),
    mkMon(366, 'PM_ASHIKAGA_TAKAUJI', /* Ashikaga Takauji */
        'Ashikaga Takauji', null, '@', 53,
        15, 12, 0, 40, -13, 0x1210,
        [mkAttack(254, 0, 2, 6), mkAttack(254, 0, 2, 6), mkAttack(1, 252, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 37, 2,
        0x80, 0x0,
        0x60020000 >>> 0, 0xC7190009 >>> 0, 0x0250,
        19, 5),
    mkMon(367, 'PM_LORD_SURTUR', /* Lord Surtur */
        'Lord Surtur', null, 'H', 34,
        15, 12, 2, 50, 12, 0x1200,
        [mkAttack(254, 0, 2, 10), mkAttack(254, 0, 2, 10), mkAttack(1, 252, 2, 6), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        2250, 850, 37, 4,
        0x81, 0x1,
        0x60020000 >>> 0, 0x6F192001 >>> 0, 0x0350,
        19, 5),
    mkMon(368, 'PM_DARK_ONE', /* Dark One */
        'Dark One', null, '@', 53,
        15, 12, 0, 80, -10, 0x1210,
        [mkAttack(254, 0, 1, 6), mkAttack(254, 0, 1, 6), mkAttack(1, 252, 1, 4), mkAttack(255, 241, 0, 0), NO_ATTK(), NO_ATTK()],
        1450, 400, 37, 2,
        0x80, 0x0,
        0x60020000 >>> 0, 0xC7100009 >>> 0, 0x0250,
        20, 0),
    mkMon(369, 'PM_STUDENT', /* student */
        'student', null, '@', 53,
        5, 12, 10, 10, 3, 0x0200,
        [mkAttack(254, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 38, 2,
        0x0, 0x0,
        0x60020060 >>> 0, 0x44200009 >>> 0, 0x0200,
        7, 15),
    mkMon(370, 'PM_CHIEFTAIN', /* chieftain */
        'chieftain', null, '@', 53,
        5, 12, 10, 10, 0, 0x0200,
        [mkAttack(254, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 38, 2,
        0x20, 0x0,
        0x60020000 >>> 0, 0x44200009 >>> 0, 0x0200,
        7, 15),
    mkMon(371, 'PM_NEANDERTHAL', /* neanderthal */
        'neanderthal', null, '@', 53,
        5, 12, 10, 10, 1, 0x0200,
        [mkAttack(254, 0, 2, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 38, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x44200009 >>> 0, 0x0200,
        7, 15),
    mkMon(372, 'PM_ATTENDANT', /* attendant */
        'attendant', null, '@', 53,
        5, 12, 10, 10, 0, 0x0200,
        [mkAttack(254, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 38, 2,
        0x20, 0x0,
        0x60020000 >>> 0, 0x44200009 >>> 0, 0x0200,
        7, 15),
    mkMon(373, 'PM_PAGE', /* page */
        'page', null, '@', 53,
        5, 12, 10, 10, 3, 0x0200,
        [mkAttack(254, 0, 1, 6), mkAttack(254, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 38, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x44200009 >>> 0, 0x0200,
        7, 15),
    mkMon(374, 'PM_ABBOT', /* abbot */
        'abbot', null, '@', 53,
        5, 12, 10, 20, 0, 0x0200,
        [mkAttack(1, 0, 8, 2), mkAttack(3, 12, 3, 2), mkAttack(255, 240, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 38, 2,
        0x0, 0x0,
        0x40020000 >>> 0, 0x44200009 >>> 0, 0x0200,
        8, 15),
    mkMon(375, 'PM_ACOLYTE', /* acolyte */
        'acolyte', null, '@', 53,
        5, 12, 10, 20, 0, 0x0200,
        [mkAttack(254, 0, 1, 6), mkAttack(255, 240, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 38, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x44200009 >>> 0, 0x0200,
        8, 15),
    mkMon(376, 'PM_HUNTER', /* hunter */
        'hunter', null, '@', 53,
        5, 12, 10, 10, -7, 0x0200,
        [mkAttack(254, 0, 1, 4), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 38, 2,
        0x0, 0x0,
        0x61020000 >>> 0, 0x44200009 >>> 0, 0x0300,
        7, 15),
    mkMon(377, 'PM_THUG', /* thug */
        'thug', null, '@', 53,
        5, 12, 10, 10, -3, 0x0200,
        [mkAttack(254, 0, 1, 6), mkAttack(254, 0, 1, 6), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 38, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x54200009 >>> 0, 0x0200,
        7, 15),
    mkMon(378, 'PM_NINJA', /* ninja */
        'ninja', null, '@', 53,
        5, 12, 10, 10, 3, 0x0200,
        [mkAttack(254, 0, 1, 8), mkAttack(254, 0, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 25, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x44100009 >>> 0, 0x0200,
        7, 15),
    mkMon(379, 'PM_ROSHI', /* roshi */
        'roshi', null, '@', 53,
        5, 12, 10, 10, 3, 0x0200,
        [mkAttack(254, 0, 1, 8), mkAttack(254, 0, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 38, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x44200009 >>> 0, 0x0200,
        7, 15),
    mkMon(380, 'PM_GUIDE', /* guide */
        'guide', null, '@', 53,
        5, 12, 10, 20, 0, 0x0200,
        [mkAttack(254, 0, 1, 6), mkAttack(255, 241, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 38, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0xC4200009 >>> 0, 0x0200,
        8, 15),
    mkMon(381, 'PM_WARRIOR', /* warrior */
        'warrior', null, '@', 53,
        5, 12, 10, 10, 1, 0x0200,
        [mkAttack(254, 0, 1, 8), mkAttack(254, 0, 1, 8), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 38, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0x44220009 >>> 0, 0x0200,
        7, 15),
    mkMon(382, 'PM_APPRENTICE', /* apprentice */
        'apprentice', null, '@', 53,
        5, 12, 10, 30, 0, 0x0200,
        [mkAttack(254, 0, 1, 6), mkAttack(255, 241, 0, 0), NO_ATTK(), NO_ATTK(), NO_ATTK(), NO_ATTK()],
        1450, 400, 38, 2,
        0x0, 0x0,
        0x60020000 >>> 0, 0xC4200009 >>> 0, 0x0200,
        8, 15),
];

/* include/permonst.h enum monnums and derived bounds. */
export const NUMMONS = 383;
export const NON_PM = -1;   /* "not a monster" */
export const LOW_PM = 0;    /* NON_PM + 1: first monster in mons */
export const HIGH_PM = NUMMONS - 1;
export const SPECIAL_PM = 330; /* PM_LONG_WORM_TAIL */

/* include/permonst.h: NORMAL_SPEED */
export const NORMAL_SPEED = 12;
export const NATTK = 6; /* include/permonst.h: max attacks per monster */

/* include/monsters.h: enum monnums names, C order, value == MONS index. */
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

/* PM name -> index map, e.g. PM.get('PM_ACID_BLOB') (slug = C basename with PM_ prefix). */
export const PM = new Map(MONS.map((m) => [m.bn, m.pm]));

/*
 * Predicates mirroring include/mondata.h macros. Each takes a permonst-shaped
 * object or a PM index into MONS. `(mN & FLAG) !== 0` is used instead of C's
 * `!= 0L`; JS bitwise ops are signed 32-bit but nonzero-ness matches C exactly
 * (including the sign-bit flags M1_METALLIVORE / M2_MAGIC).
 */
function M(x) {
    return (typeof x === 'number') ? MONS[x] : x;
}

/* mondata.h:12 */ export const verysmall = (x) => M(x).size < MZ_SMALL;
/* mondata.h:13 */ export const bigmonst = (x) => M(x).size >= MZ_LARGE;
/* mondata.h:21 */ export const is_flyer = (x) => (M(x).m1 & M1_FLY) !== 0;
/* mondata.h:22 */ export const is_floater = (x) => { const m = M(x); return m.mlet === S_EYE || m.mlet === S_LIGHT; };
/* mondata.h:24 */ export const is_clinger = (x) => (M(x).m1 & M1_CLING) !== 0;
/* mondata.h:25 */ export const is_swimmer = (x) => (M(x).m1 & M1_SWIM) !== 0;
/* mondata.h:26 */ export const breathless = (x) => (M(x).m1 & M1_BREATHLESS) !== 0;
/* mondata.h:27 */ export const amphibious = (x) => (M(x).m1 & M1_AMPHIBIOUS) !== 0;
/* mondata.h:29 */ export const passes_walls = (x) => (M(x).m1 & M1_WALLWALK) !== 0;
/* mondata.h:30 */ export const amorphous = (x) => (M(x).m1 & M1_AMORPHOUS) !== 0;
/* mondata.h:31 */ export const noncorporeal = (x) => M(x).mlet === S_GHOST;
/* mondata.h:32 */ export const tunnels = (x) => (M(x).m1 & M1_TUNNEL) !== 0;
/* mondata.h:33 */ export const needspick = (x) => (M(x).m1 & M1_NEEDPICK) !== 0;
/* mondata.h:35 */ export const hides_under = (x) => (M(x).m1 & M1_CONCEAL) !== 0;
/* mondata.h:38 */ export const is_hider = (x) => (M(x).m1 & M1_HIDE) !== 0;
/* mondata.h:46 */ export const haseyes = (x) => (M(x).m1 & M1_NOEYES) === 0;
/* mondata.h:52 */ export const nohands = (x) => (M(x).m1 & M1_NOHANDS) !== 0;
/* mondata.h:53 */ export const nolimbs = (x) => (M(x).m1 & M1_NOLIMBS) === M1_NOLIMBS;
/* mondata.h:54 */ export const notake = (x) => (M(x).m1 & M1_NOTAKE) !== 0;
/* mondata.h:55 */ export const has_head = (x) => (M(x).m1 & M1_NOHEAD) === 0;
/* mondata.h:62 */ export const is_silent = (x) => M(x).sound === MS_SILENT;
/* mondata.h:63 */ export const unsolid = (x) => (M(x).m1 & M1_UNSOLID) !== 0;
/* mondata.h:64 */ export const mindless = (x) => (M(x).m1 & M1_MINDLESS) !== 0;
/* mondata.h:64 */ export const is_mindless = mindless; /* alias requested by callers */
/* mondata.h:65 */ export const humanoid = (x) => (M(x).m1 & M1_HUMANOID) !== 0;
/* mondata.h:66 */ export const is_animal = (x) => (M(x).m1 & M1_ANIMAL) !== 0;
/* mondata.h:67 */ export const slithy = (x) => (M(x).m1 & M1_SLITHY) !== 0;
/* mondata.h:69 */ export const thick_skinned = (x) => (M(x).m1 & M1_THICK_HIDE) !== 0;
/* mondata.h:78 */ export const lays_eggs = (x) => (M(x).m1 & M1_OVIPAROUS) !== 0;
/* mondata.h:80 */ export const regenerates = (x) => (M(x).m1 & M1_REGEN) !== 0;
/* mondata.h:80 */ export const species_regenerates = regenerates; /* legacy name */
/* mondata.h:81 */ export const perceives = (x) => (M(x).m1 & M1_SEE_INVIS) !== 0;
/* mondata.h:82 */ export const can_teleport = (x) => (M(x).m1 & M1_TPORT) !== 0;
/* mondata.h:83 */ export const control_teleport = (x) => (M(x).m1 & M1_TPORT_CNTRL) !== 0;
/* mondata.h:88 */ export const acidic = (x) => (M(x).m1 & M1_ACID) !== 0;
/* mondata.h:89 */ export const poisonous = (x) => (M(x).m1 & M1_POIS) !== 0;
/* mondata.h:90 */ export const carnivorous = (x) => (M(x).m1 & M1_CARNIVORE) !== 0;
/* mondata.h:91 */ export const herbivorous = (x) => (M(x).m1 & M1_HERBIVORE) !== 0;
/* mondata.h:92 */ export const metallivorous = (x) => (M(x).m1 & M1_METALLIVORE) !== 0;
/* short aliases for the same mondata.h flags */ 
export const carnivore = carnivorous;
export const herbivore = herbivorous;
export const metallivore = metallivorous;
/* mondata.h:93 */ export const polyok = (x) => (M(x).m2 & M2_NOPOLY) === 0;
/* mondata.h:94 */ export const is_shapeshifter = (x) => (M(x).m2 & M2_SHAPESHIFTER) !== 0;
/* mondata.h:95 */ export const is_undead = (x) => (M(x).m2 & M2_UNDEAD) !== 0;
/* mondata.h:96 */ export const is_were = (x) => (M(x).m2 & M2_WERE) !== 0;
/* mondata.h:97-101 */ export const is_elf = (x) => (M(x).m2 & M2_ELF) !== 0;
export const is_dwarf = (x) => (M(x).m2 & M2_DWARF) !== 0;
export const is_gnome = (x) => (M(x).m2 & M2_GNOME) !== 0;
export const is_orc = (x) => (M(x).m2 & M2_ORC) !== 0;
export const is_human = (x) => (M(x).m2 & M2_HUMAN) !== 0;
/* mondata.h:107 */ export const is_giant = (x) => (M(x).m2 & M2_GIANT) !== 0;
/* mondata.h:108 */ export const is_golem = (x) => M(x).mlet === S_GOLEM;
/* mondata.h:109 */ export const is_domestic = (x) => (M(x).m2 & M2_DOMESTIC) !== 0;
/* mondata.h:110 */ export const is_demon = (x) => (M(x).m2 & M2_DEMON) !== 0;
/* mondata.h:111 */ export const is_mercenary = (x) => (M(x).m2 & M2_MERC) !== 0;
/* mondata.h:112 */ export const is_male = (x) => (M(x).m2 & M2_MALE) !== 0;
/* mondata.h:113 */ export const is_female = (x) => (M(x).m2 & M2_FEMALE) !== 0;
/* mondata.h:114 */ export const is_neuter = (x) => (M(x).m2 & M2_NEUTER) !== 0;
/* mondata.h:115 */ export const is_wanderer = (x) => (M(x).m2 & M2_WANDER) !== 0;
/* mondata.h:116 */ export const always_hostile = (x) => (M(x).m2 & M2_HOSTILE) !== 0;
/* mondata.h:117 */ export const always_peaceful = (x) => (M(x).m2 & M2_PEACEFUL) !== 0;
/* mondata.h:120 */ export const extra_nasty = (x) => (M(x).m2 & M2_NASTY) !== 0;
/* mondata.h:121 */ export const strongmonst = (x) => (M(x).m2 & M2_STRONG) !== 0;
/* mondata.h:135 */ export const throws_rocks = (x) => (M(x).m2 & M2_ROCKTHROW) !== 0;
/* mondata.h:136 */ export const type_is_pname = (x) => (M(x).m2 & M2_PNAME) !== 0;
/* mondata.h:137 */ export const is_lord = (x) => (M(x).m2 & M2_LORD) !== 0;
/* mondata.h:138 */ export const is_prince = (x) => (M(x).m2 & M2_PRINCE) !== 0;
/* mondata.h:139 */ export const is_ndemon = (x) => { const m = M(x); return is_demon(m) && (m.m2 & (M2_LORD | M2_PRINCE)) === 0; };
/* mondata.h:142 */ export const is_minion = (x) => (M(x).m2 & M2_MINION) !== 0;
/* mondata.h:143 */ export const likes_gold = (x) => (M(x).m2 & M2_GREEDY) !== 0;
/* mondata.h:144 */ export const likes_gems = (x) => (M(x).m2 & M2_JEWELS) !== 0;
/* mondata.h:147 */ export const likes_magic = (x) => (M(x).m2 & M2_MAGIC) !== 0;
/* mondata.h:153 */ export const is_covetous = (x) => (M(x).m3 & M3_COVETOUS) !== 0;
/* mondata.h:154 */ export const infravision = (x) => (M(x).m3 & M3_INFRAVISION) !== 0;
/* mondata.h:155 */ export const infravisible = (x) => (M(x).m3 & M3_INFRAVISIBLE) !== 0;
/* mondata.h:156 */ export const is_displacer = (x) => (M(x).m3 & M3_DISPLACES) !== 0;
/* mondata.h:200 crawl-by-name predicates */
export const touch_petrifies = (x) => { const m = M(x); return m.pm === PM_COCKATRICE || m.pm === PM_CHICKATRICE; };
/* mondata.h:203 */ export const flesh_petrifies = (x) => touch_petrifies(x) || M(x).pm === PM_MEDUSA;
/* mondata.h:84 */ export const telepathic = (x) => { const p = M(x).pm; return p === PM_FLOATING_EYE || p === PM_MIND_FLAYER || p === PM_MASTER_MIND_FLAYER; };
/* mondata.h:209 */ export const is_mind_flayer = (x) => { const p = M(x).pm; return p === PM_MIND_FLAYER || p === PM_MASTER_MIND_FLAYER; };
/* mondata.h:211 */ export const is_vampire = (x) => M(x).mlet === S_VAMPIRE;
/* mondata.h:218 */ export const weirdnonliving = (x) => is_golem(x) || M(x).mlet === S_VORTEX;
/* mondata.h:219 */ export const nonliving = (x) => is_undead(x) || M(x).pm === PM_MANES || weirdnonliving(x);
/* mondata.h:147*/ export const is_whirly = (x) => { const m = M(x); return m.mlet === S_VORTEX || m.pm === PM_AIR_ELEMENTAL; };
/* mondata.h:59-60 */ export const flaming = (x) => { const p = M(x).pm; return p === PM_FIRE_VORTEX || p === PM_FLAMING_SPHERE || p === PM_FIRE_ELEMENTAL || p === PM_SALAMANDER; };
/* mondata.h:104-105 */ export const is_bat = (x) => { const p = M(x).pm; return p === PM_BAT || p === PM_GIANT_BAT || p === PM_VAMPIRE_BAT; };
/* mondata.h:151 */ export const is_longworm = (x) => { const p = M(x).pm; return p === PM_BABY_LONG_WORM || p === PM_LONG_WORM || p === PM_LONG_WORM_TAIL; };
/* mondata.h:163-165 */ export const is_rider = (x) => { const p = M(x).pm; return p === PM_DEATH || p === PM_FAMINE || p === PM_PESTILENCE; };
/* mondata.h:171 */ export const is_reviver = (x) => is_rider(x) || M(x).mlet === S_TROLL;
/* mondata.h:166-170 note + macro */ export const is_placeholder = (x) => { const p = M(x).pm; return p === PM_ORC || p === PM_GIANT || p === PM_ELF || p === PM_HUMAN; };

/* src/monst.c damage-dice helper parity: max per-attack base damage is damn*damd. */

// mondata.h:vegetarian includes vegan species and all puddings except black
// pudding. This describes what their bodies contain, not what they can eat.
export function vegetarian(mon) {
    const data = M(mon);
    return [S_BLOB, S_JELLY, S_FUNGUS, S_VORTEX, S_LIGHT].includes(data.mlet)
        || data.mlet === S_ELEMENTAL && data.pm !== PM_STALKER
        || data.mlet === S_GOLEM && ![PM_FLESH_GOLEM, PM_LEATHER_GOLEM].includes(data.pm)
        || noncorporeal(data)
        || data.mlet === S_PUDDING && data.pm !== PM_BLACK_PUDDING;
}
