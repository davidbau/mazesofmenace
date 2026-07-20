// Auto-generated from C source — do not hand-edit

import * as C from './const.js';

export const mons = [
    {
        mname: "giant ant",
        mlet: C.S_ANT,
        mlevel: 2, mmove: 18, ac: 3, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_SGROUP | 3),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 10, cnutrit: 10, msound: C.MS_SILENT, msize: C.MZ_TINY,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_OVIPAROUS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 4,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "killer bee",
        mlet: C.S_ANT,
        mlevel: 1, mmove: 18, ac: -1, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_LGROUP | 2),
        mattk: [
            { at: C.AT_STNG, ad: C.AD_DRST, damn: 1, damd: 3 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1, cnutrit: 5, msound: C.MS_BUZZ, msize: C.MZ_TINY,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_ANIMAL | C.M1_FLY | C.M1_NOHANDS | C.M1_POIS,
        mflags2: C.M2_HOSTILE | C.M2_FEMALE,
        mflags3: 0,
        difficulty: 6,
        mcolor: C.CLR_YELLOW
    },
    {
        mname: "soldier ant",
        mlet: C.S_ANT,
        mlevel: 3, mmove: 18, ac: 3, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_SGROUP | 2),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_STNG, ad: C.AD_DRST, damn: 3, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 20, cnutrit: 5, msound: C.MS_SILENT, msize: C.MZ_TINY,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_OVIPAROUS | C.M1_POIS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 7,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "fire ant",
        mlet: C.S_ANT,
        mlevel: 3, mmove: 18, ac: 3, mr: 10, maligntyp: 0,
        geno: (C.G_GENO | C.G_SGROUP | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_BITE, ad: C.AD_FIRE, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 30, cnutrit: 10, msound: C.MS_SILENT, msize: C.MZ_TINY,
        mresists: C.MR_FIRE, mconveys: C.MR_FIRE,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_OVIPAROUS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 6,
        mcolor: C.CLR_RED
    },
    {
        mname: "giant beetle",
        mlet: C.S_ANT,
        mlevel: 5, mmove: 6, ac: 4, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 3),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 200, cnutrit: 50, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_POIS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 6,
        mcolor: C.CLR_BLACK
    },
    {
        mname: "queen bee",
        mlet: C.S_ANT,
        mlevel: 9, mmove: 24, ac: -4, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_NOGEN),
        mattk: [
            { at: C.AT_STNG, ad: C.AD_DRST, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1, cnutrit: 5, msound: C.MS_BUZZ, msize: C.MZ_TINY,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_ANIMAL | C.M1_FLY | C.M1_NOHANDS | C.M1_OVIPAROUS | C.M1_POIS,
        mflags2: C.M2_HOSTILE | C.M2_FEMALE | C.M2_PRINCE,
        mflags3: 0,
        difficulty: 12,
        mcolor: C.HI_LORD
    },
    {
        mname: "acid blob",
        mlet: C.S_BLOB,
        mlevel: 1, mmove: 3, ac: 8, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_NONE, ad: C.AD_ACID, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 30, cnutrit: 10, msound: C.MS_SILENT, msize: C.MZ_TINY,
        mresists: C.MR_SLEEP | C.MR_POISON | C.MR_ACID | C.MR_STONE, mconveys: C.MR_ACID | C.MR_STONE,
        mflags1: C.M1_BREATHLESS | C.M1_AMORPHOUS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_ACID,
        mflags2: C.M2_WANDER | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 2,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "quivering blob",
        mlet: C.S_BLOB,
        mlevel: 5, mmove: 1, ac: 8, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_TUCH, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 200, cnutrit: 100, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: C.MR_SLEEP | C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS,
        mflags2: C.M2_WANDER | C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 6,
        mcolor: C.CLR_WHITE
    },
    {
        mname: "gelatinous cube",
        mlet: C.S_BLOB,
        mlevel: 6, mmove: 6, ac: 8, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_TUCH, ad: C.AD_PLYS, damn: 2, damd: 4 },
            { at: C.AT_NONE, ad: C.AD_PLYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 600, cnutrit: 150, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_FIRE | C.MR_COLD | C.MR_ELEC | C.MR_SLEEP | C.MR_POISON | C.MR_ACID | C.MR_STONE, mconveys: C.MR_FIRE | C.MR_COLD | C.MR_ELEC | C.MR_SLEEP,
        mflags1: C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_OMNIVORE | C.M1_ACID,
        mflags2: C.M2_WANDER | C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 8,
        mcolor: C.CLR_CYAN
    },
    {
        mname: "chickatrice",
        mlet: C.S_COCKATRICE,
        mlevel: 4, mmove: 4, ac: 8, mr: 30, maligntyp: 0,
        geno: (C.G_GENO | C.G_SGROUP | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 2 },
            { at: C.AT_TUCH, ad: C.AD_STON, damn: 0, damd: 0 },
            { at: C.AT_NONE, ad: C.AD_STON, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 10, cnutrit: 10, msound: C.MS_HISS, msize: C.MZ_TINY,
        mresists: C.MR_POISON | C.MR_STONE, mconveys: C.MR_POISON | C.MR_STONE,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_OMNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 7,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "cockatrice",
        mlet: C.S_COCKATRICE,
        mlevel: 5, mmove: 6, ac: 6, mr: 30, maligntyp: 0,
        geno: (C.G_GENO | 5),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: C.AT_TUCH, ad: C.AD_STON, damn: 0, damd: 0 },
            { at: C.AT_NONE, ad: C.AD_STON, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 30, cnutrit: 30, msound: C.MS_HISS, msize: C.MZ_SMALL,
        mresists: C.MR_POISON | C.MR_STONE, mconveys: C.MR_POISON | C.MR_STONE,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_OMNIVORE | C.M1_OVIPAROUS,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 8,
        mcolor: C.CLR_YELLOW
    },
    {
        mname: "pyrolisk",
        mlet: C.S_COCKATRICE,
        mlevel: 6, mmove: 6, ac: 6, mr: 30, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_GAZE, ad: C.AD_FIRE, damn: 2, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 30, cnutrit: 30, msound: C.MS_HISS, msize: C.MZ_SMALL,
        mresists: C.MR_POISON | C.MR_FIRE, mconveys: C.MR_POISON | C.MR_FIRE,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_OMNIVORE | C.M1_OVIPAROUS,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 8,
        mcolor: C.CLR_RED
    },
    {
        mname: "jackal",
        mlet: C.S_DOG,
        mlevel: 0, mmove: 12, ac: 7, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_SGROUP | 3),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 2 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 300, cnutrit: 250, msound: C.MS_BARK, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 1,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "fox",
        mlet: C.S_DOG,
        mlevel: 0, mmove: 15, ac: 7, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 300, cnutrit: 250, msound: C.MS_BARK, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 1,
        mcolor: C.CLR_RED
    },
    {
        mname: "coyote",
        mlet: C.S_DOG,
        mlevel: 1, mmove: 12, ac: 7, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_SGROUP | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 300, cnutrit: 250, msound: C.MS_BARK, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 2,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "werejackal",
        mlet: C.S_DOG,
        mlevel: 2, mmove: 12, ac: 7, mr: 10, maligntyp: -7,
        geno: (C.G_NOGEN | C.G_NOCORPSE),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_WERE, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 300, cnutrit: 250, msound: C.MS_BARK, msize: C.MZ_SMALL,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_NOHANDS | C.M1_POIS | C.M1_REGEN | C.M1_CARNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_WERE | C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 4,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "little dog",
        mlet: C.S_DOG,
        mlevel: 2, mmove: 18, ac: 6, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 150, cnutrit: 150, msound: C.MS_BARK, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_DOMESTIC,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 3,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "dingo",
        mlet: C.S_DOG,
        mlevel: 4, mmove: 16, ac: 5, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 400, cnutrit: 200, msound: C.MS_BARK, msize: C.MZ_MEDIUM,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 5,
        mcolor: C.CLR_YELLOW
    },
    {
        mname: "dog",
        mlet: C.S_DOG,
        mlevel: 4, mmove: 16, ac: 5, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 400, cnutrit: 200, msound: C.MS_BARK, msize: C.MZ_MEDIUM,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_DOMESTIC,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 5,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "large dog",
        mlet: C.S_DOG,
        mlevel: 6, mmove: 15, ac: 4, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 800, cnutrit: 250, msound: C.MS_BARK, msize: C.MZ_MEDIUM,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_STRONG | C.M2_DOMESTIC,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 7,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "wolf",
        mlet: C.S_DOG,
        mlevel: 5, mmove: 12, ac: 4, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_SGROUP | 2),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 500, cnutrit: 250, msound: C.MS_BARK, msize: C.MZ_MEDIUM,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 6,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "werewolf",
        mlet: C.S_DOG,
        mlevel: 5, mmove: 12, ac: 4, mr: 20, maligntyp: -7,
        geno: (C.G_NOGEN | C.G_NOCORPSE),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_WERE, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 500, cnutrit: 250, msound: C.MS_BARK, msize: C.MZ_MEDIUM,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_NOHANDS | C.M1_POIS | C.M1_REGEN | C.M1_CARNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_WERE | C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 7,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "winter wolf cub",
        mlet: C.S_DOG,
        mlevel: 5, mmove: 12, ac: 4, mr: 0, maligntyp: 0,
        geno: (C.G_NOHELL | C.G_GENO | C.G_SGROUP | 2),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: C.AT_BREA, ad: C.AD_COLD, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 250, cnutrit: 200, msound: C.MS_BARK, msize: C.MZ_SMALL,
        mresists: C.MR_COLD, mconveys: C.MR_COLD,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 7,
        mcolor: C.CLR_CYAN
    },
    {
        mname: "warg",
        mlet: C.S_DOG,
        mlevel: 7, mmove: 12, ac: 4, mr: 0, maligntyp: -5,
        geno: (C.G_GENO | C.G_SGROUP | 2),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 850, cnutrit: 350, msound: C.MS_BARK, msize: C.MZ_MEDIUM,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 8,
        mcolor: C.CLR_BLACK
    },
    {
        mname: "winter wolf",
        mlet: C.S_DOG,
        mlevel: 7, mmove: 12, ac: 4, mr: 20, maligntyp: -5,
        geno: (C.G_NOHELL | C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: C.AT_BREA, ad: C.AD_COLD, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 700, cnutrit: 300, msound: C.MS_BARK, msize: C.MZ_LARGE,
        mresists: C.MR_COLD, mconveys: C.MR_COLD,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG,
        mflags3: 0,
        difficulty: 9,
        mcolor: C.CLR_CYAN
    },
    {
        mname: "hell hound pup",
        mlet: C.S_DOG,
        mlevel: 7, mmove: 12, ac: 4, mr: 20, maligntyp: 0,
        geno: (C.G_HELL | C.G_GENO | C.G_SGROUP | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: C.AT_BREA, ad: C.AD_FIRE, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 200, cnutrit: 200, msound: C.MS_BARK, msize: C.MZ_SMALL,
        mresists: C.MR_FIRE, mconveys: C.MR_FIRE,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 9,
        mcolor: C.CLR_RED
    },
    {
        mname: "hell hound",
        mlet: C.S_DOG,
        mlevel: 12, mmove: 14, ac: 2, mr: 20, maligntyp: -5,
        geno: (C.G_HELL | C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 6 },
            { at: C.AT_BREA, ad: C.AD_FIRE, damn: 3, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 600, cnutrit: 300, msound: C.MS_BARK, msize: C.MZ_MEDIUM,
        mresists: C.MR_FIRE, mconveys: C.MR_FIRE,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 14,
        mcolor: C.CLR_RED
    },
    {
        mname: "Cerberus",
        mlet: C.S_DOG,
        mlevel: 12, mmove: 10, ac: 2, mr: 20, maligntyp: -7,
        geno: (C.G_NOGEN | C.G_UNIQ | C.G_HELL),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1000, cnutrit: 350, msound: C.MS_BARK, msize: C.MZ_LARGE,
        mresists: C.MR_FIRE, mconveys: C.MR_FIRE,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HOSTILE | C.M2_STRONG | C.M2_PNAME | C.M2_MALE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 14,
        mcolor: C.CLR_RED
    },
    {
        mname: "gas spore",
        mlet: C.S_EYE,
        mlevel: 1, mmove: 3, ac: 10, mr: 0, maligntyp: 0,
        geno: (C.G_NOCORPSE | C.G_GENO | 1),
        mattk: [
            { at: C.AT_BOOM, ad: C.AD_PHYS, damn: 4, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 10, cnutrit: 10, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_BREATHLESS | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 2,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "floating eye",
        mlet: C.S_EYE,
        mlevel: 2, mmove: 1, ac: 9, mr: 10, maligntyp: 0,
        geno: (C.G_GENO | 5),
        mattk: [
            { at: C.AT_NONE, ad: C.AD_PLYS, damn: 0, damd: 70 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 10, cnutrit: 10, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_AMPHIBIOUS | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 3,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "freezing sphere",
        mlet: C.S_EYE,
        mlevel: 6, mmove: 13, ac: 4, mr: 0, maligntyp: 0,
        geno: (C.G_NOCORPSE | C.G_NOHELL | C.G_GENO | 2),
        mattk: [
            { at: C.AT_EXPL, ad: C.AD_COLD, damn: 4, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 10, cnutrit: 10, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: C.MR_COLD, mconveys: C.MR_COLD,
        mflags1: C.M1_FLY | C.M1_BREATHLESS | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 9,
        mcolor: C.CLR_WHITE
    },
    {
        mname: "flaming sphere",
        mlet: C.S_EYE,
        mlevel: 6, mmove: 13, ac: 4, mr: 0, maligntyp: 0,
        geno: (C.G_NOCORPSE | C.G_GENO | 2),
        mattk: [
            { at: C.AT_EXPL, ad: C.AD_FIRE, damn: 4, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 10, cnutrit: 10, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: C.MR_FIRE, mconveys: C.MR_FIRE,
        mflags1: C.M1_FLY | C.M1_BREATHLESS | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 9,
        mcolor: C.CLR_RED
    },
    {
        mname: "shocking sphere",
        mlet: C.S_EYE,
        mlevel: 6, mmove: 13, ac: 4, mr: 0, maligntyp: 0,
        geno: (C.G_NOCORPSE | C.G_GENO | 2),
        mattk: [
            { at: C.AT_EXPL, ad: C.AD_ELEC, damn: 4, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 10, cnutrit: 10, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: C.MR_ELEC, mconveys: C.MR_ELEC,
        mflags1: C.M1_FLY | C.M1_BREATHLESS | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 10,
        mcolor: C.HI_ZAP
    },
    {
        mname: "beholder",
        mlet: C.S_EYE,
        mlevel: 6, mmove: 3, ac: 4, mr: 0, maligntyp: -10,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_GAZE, ad: C.AD_SLOW, damn: 0, damd: 0 },
            { at: C.AT_GAZE, ad: C.AD_SLEE, damn: 2, damd: 25 },
            { at: C.AT_GAZE, ad: C.AD_DISN, damn: 0, damd: 0 },
            { at: C.AT_GAZE, ad: C.AD_STON, damn: 0, damd: 0 },
            { at: C.AT_GAZE, ad: C.AD_CNCL, damn: 2, damd: 4 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 4 }
        ],
        cwt: 10, cnutrit: 10, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: C.MR_COLD, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_BREATHLESS | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS,
        mflags2: C.M2_NOPOLY | C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 13,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "kitten",
        mlet: C.S_FELINE,
        mlevel: 2, mmove: 18, ac: 6, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 150, cnutrit: 150, msound: C.MS_MEW, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_WANDER | C.M2_DOMESTIC,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 3,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "housecat",
        mlet: C.S_FELINE,
        mlevel: 4, mmove: 16, ac: 5, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 200, cnutrit: 200, msound: C.MS_MEW, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_DOMESTIC,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 5,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "jaguar",
        mlet: C.S_FELINE,
        mlevel: 4, mmove: 15, ac: 6, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 600, cnutrit: 300, msound: C.MS_GROWL, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 6,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "lynx",
        mlet: C.S_FELINE,
        mlevel: 5, mmove: 15, ac: 6, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 10 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 600, cnutrit: 300, msound: C.MS_GROWL, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 7,
        mcolor: C.CLR_CYAN
    },
    {
        mname: "panther",
        mlet: C.S_FELINE,
        mlevel: 5, mmove: 15, ac: 6, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 10 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 600, cnutrit: 300, msound: C.MS_GROWL, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 7,
        mcolor: C.CLR_BLACK
    },
    {
        mname: "large cat",
        mlet: C.S_FELINE,
        mlevel: 6, mmove: 15, ac: 4, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 250, cnutrit: 250, msound: C.MS_MEW, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_STRONG | C.M2_DOMESTIC,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 7,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "tiger",
        mlet: C.S_FELINE,
        mlevel: 6, mmove: 12, ac: 6, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 10 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 600, cnutrit: 300, msound: C.MS_GROWL, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 8,
        mcolor: C.CLR_YELLOW
    },
    {
        mname: "displacer beast",
        mlet: C.S_FELINE,
        mlevel: 12, mmove: 12, ac: -10, mr: 0, maligntyp: -3,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 4, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 4, damd: 4 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 10 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 750, cnutrit: 400, msound: C.MS_GROWL, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_NASTY,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION | C.M3_DISPLACES,
        difficulty: 14,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "gremlin",
        mlet: C.S_GREMLIN,
        mlevel: 5, mmove: 12, ac: 2, mr: 25, maligntyp: -9,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_CURS, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 100, cnutrit: 20, msound: C.MS_LAUGH, msize: C.MZ_SMALL,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_SWIM | C.M1_HUMANOID | C.M1_POIS,
        mflags2: C.M2_STALK,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 8,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "gargoyle",
        mlet: C.S_GREMLIN,
        mlevel: 6, mmove: 10, ac: -4, mr: 0, maligntyp: -9,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1000, cnutrit: 200, msound: C.MS_GRUNT, msize: C.MZ_HUMAN,
        mresists: C.MR_STONE, mconveys: C.MR_STONE,
        mflags1: C.M1_HUMANOID | C.M1_THICK_HIDE | C.M1_BREATHLESS,
        mflags2: C.M2_HOSTILE | C.M2_STRONG,
        mflags3: 0,
        difficulty: 8,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "winged gargoyle",
        mlet: C.S_GREMLIN,
        mlevel: 9, mmove: 15, ac: -2, mr: 0, maligntyp: -12,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 3, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 3, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1200, cnutrit: 300, msound: C.MS_GRUNT, msize: C.MZ_HUMAN,
        mresists: C.MR_STONE, mconveys: C.MR_STONE,
        mflags1: C.M1_FLY | C.M1_HUMANOID | C.M1_THICK_HIDE | C.M1_BREATHLESS | C.M1_OVIPAROUS,
        mflags2: C.M2_LORD | C.M2_HOSTILE | C.M2_STRONG | C.M2_MAGIC,
        mflags3: 0,
        difficulty: 11,
        mcolor: C.HI_LORD
    },
    {
        mname: "hobbit",
        mlet: C.S_HUMANOID,
        mlevel: 1, mmove: 9, ac: 10, mr: 0, maligntyp: 6,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 500, cnutrit: 200, msound: C.MS_HUMANOID, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 2,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "dwarf",
        mlet: C.S_HUMANOID,
        mlevel: 2, mmove: 6, ac: 10, mr: 10, maligntyp: 4,
        geno: (C.G_GENO | 3),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 900, cnutrit: 300, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_TUNNEL | C.M1_NEEDPICK | C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_DWARF | C.M2_STRONG | C.M2_GREEDY | C.M2_JEWELS | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 4,
        mcolor: C.CLR_RED
    },
    {
        mname: "bugbear",
        mlet: C.S_HUMANOID,
        mlevel: 3, mmove: 9, ac: 5, mr: 0, maligntyp: -6,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1250, cnutrit: 250, msound: C.MS_GROWL, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 5,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "dwarf lord",
        mlet: C.S_HUMANOID,
        mlevel: 4, mmove: 6, ac: 10, mr: 10, maligntyp: 5,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 900, cnutrit: 300, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_TUNNEL | C.M1_NEEDPICK | C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_DWARF | C.M2_STRONG | C.M2_LORD | C.M2_GREEDY | C.M2_JEWELS | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 6,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "dwarf king",
        mlet: C.S_HUMANOID,
        mlevel: 6, mmove: 6, ac: 10, mr: 20, maligntyp: 6,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 900, cnutrit: 300, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_TUNNEL | C.M1_NEEDPICK | C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_DWARF | C.M2_STRONG | C.M2_PRINCE | C.M2_GREEDY | C.M2_JEWELS | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 8,
        mcolor: C.HI_LORD
    },
    {
        mname: "mind flayer",
        mlet: C.S_HUMANOID,
        mlevel: 9, mmove: 12, ac: 5, mr: 90, maligntyp: -8,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_TENT, ad: C.AD_DRIN, damn: 2, damd: 1 },
            { at: C.AT_TENT, ad: C.AD_DRIN, damn: 2, damd: 1 },
            { at: C.AT_TENT, ad: C.AD_DRIN, damn: 2, damd: 1 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1450, cnutrit: 400, msound: C.MS_HISS, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_FLY | C.M1_SEE_INVIS | C.M1_OMNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_NASTY | C.M2_GREEDY | C.M2_JEWELS | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 13,
        mcolor: C.CLR_BRIGHT_MAGENTA
    },
    {
        mname: "master mind flayer",
        mlet: C.S_HUMANOID,
        mlevel: 13, mmove: 12, ac: 0, mr: 90, maligntyp: -8,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: C.AT_TENT, ad: C.AD_DRIN, damn: 2, damd: 1 },
            { at: C.AT_TENT, ad: C.AD_DRIN, damn: 2, damd: 1 },
            { at: C.AT_TENT, ad: C.AD_DRIN, damn: 2, damd: 1 },
            { at: C.AT_TENT, ad: C.AD_DRIN, damn: 2, damd: 1 },
            { at: C.AT_TENT, ad: C.AD_DRIN, damn: 2, damd: 1 }
        ],
        cwt: 1450, cnutrit: 400, msound: C.MS_HISS, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_FLY | C.M1_SEE_INVIS | C.M1_OMNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_NASTY | C.M2_GREEDY | C.M2_JEWELS | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 19,
        mcolor: C.CLR_BRIGHT_MAGENTA
    },
    {
        mname: "manes",
        mlet: C.S_IMP,
        mlevel: 1, mmove: 3, ac: 7, mr: 0, maligntyp: -7,
        geno: (C.G_GENO | C.G_LGROUP | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 100, cnutrit: 100, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_POIS,
        mflags2: C.M2_HOSTILE | C.M2_STALK,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 3,
        mcolor: C.CLR_RED
    },
    {
        mname: "homunculus",
        mlet: C.S_IMP,
        mlevel: 2, mmove: 12, ac: 6, mr: 10, maligntyp: -7,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_SLEE, damn: 1, damd: 3 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 60, cnutrit: 100, msound: C.MS_SILENT, msize: C.MZ_TINY,
        mresists: C.MR_SLEEP | C.MR_POISON, mconveys: C.MR_SLEEP | C.MR_POISON,
        mflags1: C.M1_FLY | C.M1_POIS,
        mflags2: C.M2_STALK,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 3,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "imp",
        mlet: C.S_IMP,
        mlevel: 3, mmove: 12, ac: 2, mr: 20, maligntyp: -7,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 20, cnutrit: 10, msound: C.MS_CUSS, msize: C.MZ_TINY,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_REGEN,
        mflags2: C.M2_WANDER | C.M2_STALK,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 4,
        mcolor: C.CLR_RED
    },
    {
        mname: "lemure",
        mlet: C.S_IMP,
        mlevel: 3, mmove: 3, ac: 7, mr: 0, maligntyp: -7,
        geno: (C.G_HELL | C.G_GENO | C.G_LGROUP | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 150, cnutrit: 100, msound: C.MS_SILENT, msize: C.MZ_MEDIUM,
        mresists: C.MR_SLEEP | C.MR_POISON, mconveys: C.MR_SLEEP,
        mflags1: C.M1_POIS | C.M1_REGEN,
        mflags2: C.M2_HOSTILE | C.M2_WANDER | C.M2_STALK | C.M2_NEUTER,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 5,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "quasit",
        mlet: C.S_IMP,
        mlevel: 3, mmove: 15, ac: 2, mr: 20, maligntyp: -7,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_DRDX, damn: 1, damd: 2 },
            { at: C.AT_CLAW, ad: C.AD_DRDX, damn: 1, damd: 2 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 200, cnutrit: 200, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_REGEN,
        mflags2: C.M2_STALK,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 7,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "tengu",
        mlet: C.S_IMP,
        mlevel: 6, mmove: 13, ac: 5, mr: 30, maligntyp: 7,
        geno: (C.G_GENO | 3),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 7 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 300, cnutrit: 200, msound: C.MS_SQAWK, msize: C.MZ_SMALL,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_TPORT | C.M1_TPORT_CNTRL,
        mflags2: C.M2_STALK,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 7,
        mcolor: C.CLR_CYAN
    },
    {
        mname: "blue jelly",
        mlet: C.S_JELLY,
        mlevel: 4, mmove: 0, ac: 8, mr: 10, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_NONE, ad: C.AD_COLD, damn: 0, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_JELLY, cnutrit: 20, msound: C.MS_SILENT, msize: C.MZ_MEDIUM,
        mresists: C.MR_COLD | C.MR_POISON, mconveys: C.MR_COLD | C.MR_POISON,
        mflags1: C.M1_BREATHLESS | C.M1_AMORPHOUS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 5,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "spotted jelly",
        mlet: C.S_JELLY,
        mlevel: 5, mmove: 0, ac: 8, mr: 10, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_NONE, ad: C.AD_ACID, damn: 0, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_JELLY, cnutrit: 20, msound: C.MS_SILENT, msize: C.MZ_MEDIUM,
        mresists: C.MR_ACID | C.MR_STONE, mconveys: C.MR_ACID | C.MR_STONE,
        mflags1: C.M1_BREATHLESS | C.M1_AMORPHOUS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_ACID | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 6,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "ochre jelly",
        mlet: C.S_JELLY,
        mlevel: 6, mmove: 3, ac: 8, mr: 20, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_ENGL, ad: C.AD_ACID, damn: 3, damd: 6 },
            { at: C.AT_NONE, ad: C.AD_ACID, damn: 3, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_JELLY, cnutrit: 20, msound: C.MS_SILENT, msize: C.MZ_MEDIUM,
        mresists: C.MR_ACID | C.MR_STONE, mconveys: C.MR_ACID | C.MR_STONE,
        mflags1: C.M1_BREATHLESS | C.M1_AMORPHOUS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_ACID | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 8,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "kobold",
        mlet: C.S_KOBOLD,
        mlevel: 0, mmove: 6, ac: 10, mr: 0, maligntyp: -2,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 400, cnutrit: 100, msound: C.MS_ORC, msize: C.MZ_SMALL,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_POIS | C.M1_OMNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 1,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "large kobold",
        mlet: C.S_KOBOLD,
        mlevel: 1, mmove: 6, ac: 10, mr: 0, maligntyp: -3,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 450, cnutrit: 150, msound: C.MS_ORC, msize: C.MZ_SMALL,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_POIS | C.M1_OMNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 2,
        mcolor: C.CLR_RED
    },
    {
        mname: "kobold lord",
        mlet: C.S_KOBOLD,
        mlevel: 2, mmove: 6, ac: 10, mr: 0, maligntyp: -4,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 500, cnutrit: 200, msound: C.MS_ORC, msize: C.MZ_SMALL,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_POIS | C.M1_OMNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_LORD | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 3,
        mcolor: C.HI_LORD
    },
    {
        mname: "kobold shaman",
        mlet: C.S_KOBOLD,
        mlevel: 2, mmove: 6, ac: 6, mr: 10, maligntyp: -4,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 450, cnutrit: 150, msound: C.MS_ORC, msize: C.MZ_SMALL,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_POIS | C.M1_OMNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_MAGIC,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 4,
        mcolor: C.HI_ZAP
    },
    {
        mname: "leprechaun",
        mlet: C.S_LEPRECHAUN,
        mlevel: 5, mmove: 15, ac: 8, mr: 20, maligntyp: 0,
        geno: (C.G_GENO | 4),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_SGLD, damn: 1, damd: 2 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 60, cnutrit: 30, msound: C.MS_LAUGH, msize: C.MZ_TINY,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_TPORT,
        mflags2: C.M2_HOSTILE | C.M2_GREEDY,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 4,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "small mimic",
        mlet: C.S_MIMIC,
        mlevel: 7, mmove: 3, ac: 7, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 3, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 300, cnutrit: 200, msound: C.MS_SILENT, msize: C.MZ_MEDIUM,
        mresists: C.MR_ACID, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_AMORPHOUS | C.M1_HIDE | C.M1_ANIMAL | C.M1_NOEYES | C.M1_NOHEAD | C.M1_NOLIMBS | C.M1_THICK_HIDE | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 8,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "large mimic",
        mlet: C.S_MIMIC,
        mlevel: 8, mmove: 3, ac: 7, mr: 10, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_STCK, damn: 3, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 600, cnutrit: 400, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_ACID, mconveys: 0,
        mflags1: C.M1_CLING | C.M1_BREATHLESS | C.M1_AMORPHOUS | C.M1_HIDE | C.M1_ANIMAL | C.M1_NOEYES | C.M1_NOHEAD | C.M1_NOLIMBS | C.M1_THICK_HIDE | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG,
        mflags3: 0,
        difficulty: 9,
        mcolor: C.CLR_RED
    },
    {
        mname: "giant mimic",
        mlet: C.S_MIMIC,
        mlevel: 9, mmove: 3, ac: 7, mr: 20, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_STCK, damn: 3, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_STCK, damn: 3, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 800, cnutrit: 500, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_ACID, mconveys: 0,
        mflags1: C.M1_CLING | C.M1_BREATHLESS | C.M1_AMORPHOUS | C.M1_HIDE | C.M1_ANIMAL | C.M1_NOEYES | C.M1_NOHEAD | C.M1_NOLIMBS | C.M1_THICK_HIDE | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG,
        mflags3: 0,
        difficulty: 11,
        mcolor: C.HI_LORD
    },
    {
        mname: "wood nymph",
        mlet: C.S_NYMPH,
        mlevel: 3, mmove: 12, ac: 9, mr: 20, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_SITM, damn: 0, damd: 0 },
            { at: C.AT_CLAW, ad: C.AD_SEDU, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_NYMPH, cnutrit: 300, msound: C.MS_SEDUCE, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_TPORT,
        mflags2: C.M2_HOSTILE | C.M2_FEMALE | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 5,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "water nymph",
        mlet: C.S_NYMPH,
        mlevel: 3, mmove: 12, ac: 9, mr: 20, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_SITM, damn: 0, damd: 0 },
            { at: C.AT_CLAW, ad: C.AD_SEDU, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_NYMPH, cnutrit: 300, msound: C.MS_SEDUCE, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_TPORT | C.M1_SWIM,
        mflags2: C.M2_HOSTILE | C.M2_FEMALE | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 5,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "mountain nymph",
        mlet: C.S_NYMPH,
        mlevel: 3, mmove: 12, ac: 9, mr: 20, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_SITM, damn: 0, damd: 0 },
            { at: C.AT_CLAW, ad: C.AD_SEDU, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_NYMPH, cnutrit: 300, msound: C.MS_SEDUCE, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_TPORT,
        mflags2: C.M2_HOSTILE | C.M2_FEMALE | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 5,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "goblin",
        mlet: C.S_ORC,
        mlevel: 0, mmove: 6, ac: 10, mr: 0, maligntyp: -3,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 400, cnutrit: 100, msound: C.MS_ORC, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_ORC | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 1,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "hobgoblin",
        mlet: C.S_ORC,
        mlevel: 1, mmove: 9, ac: 10, mr: 0, maligntyp: -4,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1000, cnutrit: 200, msound: C.MS_ORC, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_ORC | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 3,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "orc",
        mlet: C.S_ORC,
        mlevel: 1, mmove: 9, ac: 10, mr: 0, maligntyp: -3,
        geno: (C.G_GENO | C.G_NOGEN | C.G_LGROUP),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 850, cnutrit: 150, msound: C.MS_ORC, msize: C.MZ_HUMAN,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_ORC | C.M2_STRONG | C.M2_GREEDY | C.M2_JEWELS | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 3,
        mcolor: C.CLR_RED
    },
    {
        mname: "hill orc",
        mlet: C.S_ORC,
        mlevel: 2, mmove: 9, ac: 10, mr: 0, maligntyp: -4,
        geno: (C.G_GENO | C.G_LGROUP | 2),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1000, cnutrit: 200, msound: C.MS_ORC, msize: C.MZ_HUMAN,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_ORC | C.M2_STRONG | C.M2_GREEDY | C.M2_JEWELS | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 4,
        mcolor: C.CLR_YELLOW
    },
    {
        mname: "Mordor orc",
        mlet: C.S_ORC,
        mlevel: 3, mmove: 5, ac: 10, mr: 0, maligntyp: -5,
        geno: (C.G_GENO | C.G_LGROUP | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1200, cnutrit: 200, msound: C.MS_ORC, msize: C.MZ_HUMAN,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_ORC | C.M2_STRONG | C.M2_GREEDY | C.M2_JEWELS | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 5,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "Uruk-hai",
        mlet: C.S_ORC,
        mlevel: 3, mmove: 7, ac: 10, mr: 0, maligntyp: -4,
        geno: (C.G_GENO | C.G_LGROUP | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1300, cnutrit: 300, msound: C.MS_ORC, msize: C.MZ_HUMAN,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_ORC | C.M2_STRONG | C.M2_GREEDY | C.M2_JEWELS | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 5,
        mcolor: C.CLR_BLACK
    },
    {
        mname: "orc shaman",
        mlet: C.S_ORC,
        mlevel: 3, mmove: 9, ac: 5, mr: 10, maligntyp: -5,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1000, cnutrit: 300, msound: C.MS_ORC, msize: C.MZ_HUMAN,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_ORC | C.M2_GREEDY | C.M2_JEWELS | C.M2_MAGIC,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 5,
        mcolor: C.HI_ZAP
    },
    {
        mname: "orc-captain",
        mlet: C.S_ORC,
        mlevel: 5, mmove: 5, ac: 10, mr: 0, maligntyp: -5,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1350, cnutrit: 350, msound: C.MS_ORC, msize: C.MZ_HUMAN,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_ORC | C.M2_STRONG | C.M2_GREEDY | C.M2_JEWELS | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 7,
        mcolor: C.HI_LORD
    },
    {
        mname: "rock piercer",
        mlet: C.S_PIERCER,
        mlevel: 3, mmove: 1, ac: 3, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 4),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 200, cnutrit: 200, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_CLING | C.M1_HIDE | C.M1_ANIMAL | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_CARNIVORE | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 4,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "iron piercer",
        mlet: C.S_PIERCER,
        mlevel: 5, mmove: 1, ac: 0, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 400, cnutrit: 300, msound: C.MS_SILENT, msize: C.MZ_MEDIUM,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_CLING | C.M1_HIDE | C.M1_ANIMAL | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_CARNIVORE | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 6,
        mcolor: C.CLR_CYAN
    },
    {
        mname: "glass piercer",
        mlet: C.S_PIERCER,
        mlevel: 7, mmove: 1, ac: 0, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 4, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 400, cnutrit: 300, msound: C.MS_SILENT, msize: C.MZ_MEDIUM,
        mresists: C.MR_ACID, mconveys: 0,
        mflags1: C.M1_CLING | C.M1_HIDE | C.M1_ANIMAL | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_CARNIVORE | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 9,
        mcolor: C.CLR_WHITE
    },
    {
        mname: "rothe",
        mlet: C.S_QUADRUPED,
        mlevel: 2, mmove: 9, ac: 7, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_SGROUP | 4),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 400, cnutrit: 100, msound: C.MS_MOO, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_OMNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 4,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "mumak",
        mlet: C.S_QUADRUPED,
        mlevel: 5, mmove: 9, ac: 0, mr: 0, maligntyp: -2,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BUTT, ad: C.AD_PHYS, damn: 4, damd: 12 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2500, cnutrit: 500, msound: C.MS_TRUMPET, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_HERBIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 7,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "leocrotta",
        mlet: C.S_QUADRUPED,
        mlevel: 6, mmove: 18, ac: 4, mr: 10, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1200, cnutrit: 500, msound: C.MS_IMITATE, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_OMNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 8,
        mcolor: C.CLR_RED
    },
    {
        mname: "wumpus",
        mlet: C.S_QUADRUPED,
        mlevel: 8, mmove: 3, ac: 2, mr: 10, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2500, cnutrit: 500, msound: C.MS_BURBLE, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_CLING | C.M1_ANIMAL | C.M1_NOHANDS | C.M1_OMNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 9,
        mcolor: C.CLR_CYAN
    },
    {
        mname: "titanothere",
        mlet: C.S_QUADRUPED,
        mlevel: 12, mmove: 12, ac: 6, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2650, cnutrit: 650, msound: C.MS_BELLOW, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_HERBIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 13,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "baluchitherium",
        mlet: C.S_QUADRUPED,
        mlevel: 14, mmove: 12, ac: 5, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 5, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 5, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 3800, cnutrit: 800, msound: C.MS_BELLOW, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_HERBIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 15,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "mastodon",
        mlet: C.S_QUADRUPED,
        mlevel: 20, mmove: 12, ac: 5, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BUTT, ad: C.AD_PHYS, damn: 4, damd: 8 },
            { at: C.AT_BUTT, ad: C.AD_PHYS, damn: 4, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 3800, cnutrit: 800, msound: C.MS_TRUMPET, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_HERBIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 22,
        mcolor: C.CLR_BLACK
    },
    {
        mname: "sewer rat",
        mlet: C.S_RODENT,
        mlevel: 0, mmove: 12, ac: 7, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_SGROUP | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 20, cnutrit: 12, msound: C.MS_SQEEK, msize: C.MZ_TINY,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 1,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "giant rat",
        mlet: C.S_RODENT,
        mlevel: 1, mmove: 10, ac: 7, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_SGROUP | 2),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 30, cnutrit: 30, msound: C.MS_SQEEK, msize: C.MZ_TINY,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 2,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "rabid rat",
        mlet: C.S_RODENT,
        mlevel: 2, mmove: 12, ac: 6, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_DRCO, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 30, cnutrit: 5, msound: C.MS_SQEEK, msize: C.MZ_TINY,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_POIS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 4,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "wererat",
        mlet: C.S_RODENT,
        mlevel: 2, mmove: 12, ac: 6, mr: 10, maligntyp: -7,
        geno: (C.G_NOGEN | C.G_NOCORPSE),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_WERE, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 40, cnutrit: 30, msound: C.MS_SQEEK, msize: C.MZ_TINY,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_NOHANDS | C.M1_POIS | C.M1_REGEN | C.M1_CARNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_WERE | C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 4,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "rock mole",
        mlet: C.S_RODENT,
        mlevel: 3, mmove: 3, ac: 0, mr: 20, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 30, cnutrit: 30, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_TUNNEL | C.M1_ANIMAL | C.M1_NOHANDS | C.M1_METALLIVORE,
        mflags2: C.M2_HOSTILE | C.M2_GREEDY | C.M2_JEWELS | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 4,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "cave spider",
        mlet: C.S_SPIDER,
        mlevel: 1, mmove: 12, ac: 3, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_SGROUP | 2),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 2 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 50, cnutrit: 50, msound: C.MS_SILENT, msize: C.MZ_TINY,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_CONCEAL | C.M1_ANIMAL | C.M1_NOHANDS | C.M1_OVIPAROUS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 3,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "centipede",
        mlet: C.S_SPIDER,
        mlevel: 2, mmove: 4, ac: 3, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_DRST, damn: 1, damd: 3 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 50, cnutrit: 50, msound: C.MS_SILENT, msize: C.MZ_TINY,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_CONCEAL | C.M1_ANIMAL | C.M1_NOHANDS | C.M1_OVIPAROUS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 4,
        mcolor: C.CLR_YELLOW
    },
    {
        mname: "giant spider",
        mlet: C.S_SPIDER,
        mlevel: 5, mmove: 15, ac: 4, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_DRST, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 200, cnutrit: 100, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_OVIPAROUS | C.M1_POIS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG,
        mflags3: 0,
        difficulty: 7,
        mcolor: C.CLR_MAGENTA
    },
    {
        mname: "scorpion",
        mlet: C.S_SPIDER,
        mlevel: 5, mmove: 15, ac: 3, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 2 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 2 },
            { at: C.AT_STNG, ad: C.AD_DRST, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 50, cnutrit: 100, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_CONCEAL | C.M1_ANIMAL | C.M1_NOHANDS | C.M1_OVIPAROUS | C.M1_POIS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 8,
        mcolor: C.CLR_RED
    },
    {
        mname: "lurker above",
        mlet: C.S_TRAPPER,
        mlevel: 10, mmove: 3, ac: 3, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_ENGL, ad: C.AD_WRAP, damn: 1, damd: 6 },
            { at: C.AT_ENGL, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 800, cnutrit: 350, msound: C.MS_SILENT, msize: C.MZ_HUGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HIDE | C.M1_FLY | C.M1_ANIMAL | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STALK | C.M2_STRONG,
        mflags3: 0,
        difficulty: 12,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "trapper",
        mlet: C.S_TRAPPER,
        mlevel: 12, mmove: 3, ac: 3, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_ENGL, ad: C.AD_WRAP, damn: 1, damd: 8 },
            { at: C.AT_ENGL, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 800, cnutrit: 350, msound: C.MS_SILENT, msize: C.MZ_HUGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HIDE | C.M1_ANIMAL | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STALK | C.M2_STRONG,
        mflags3: 0,
        difficulty: 14,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "pony",
        mlet: C.S_UNICORN,
        mlevel: 3, mmove: 16, ac: 6, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_KICK, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 2 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1300, cnutrit: 250, msound: C.MS_NEIGH, msize: C.MZ_MEDIUM,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_HERBIVORE,
        mflags2: C.M2_WANDER | C.M2_STRONG | C.M2_DOMESTIC,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 4,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "white unicorn",
        mlet: C.S_UNICORN,
        mlevel: 4, mmove: 24, ac: 2, mr: 70, maligntyp: 7,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_BUTT, ad: C.AD_PHYS, damn: 1, damd: 12 },
            { at: C.AT_KICK, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1300, cnutrit: 300, msound: C.MS_NEIGH, msize: C.MZ_LARGE,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_NOHANDS | C.M1_HERBIVORE,
        mflags2: C.M2_WANDER | C.M2_STRONG | C.M2_JEWELS,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 6,
        mcolor: C.CLR_WHITE
    },
    {
        mname: "gray unicorn",
        mlet: C.S_UNICORN,
        mlevel: 4, mmove: 24, ac: 2, mr: 70, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BUTT, ad: C.AD_PHYS, damn: 1, damd: 12 },
            { at: C.AT_KICK, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1300, cnutrit: 300, msound: C.MS_NEIGH, msize: C.MZ_LARGE,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_NOHANDS | C.M1_HERBIVORE,
        mflags2: C.M2_WANDER | C.M2_STRONG | C.M2_JEWELS,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 6,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "black unicorn",
        mlet: C.S_UNICORN,
        mlevel: 4, mmove: 24, ac: 2, mr: 70, maligntyp: -7,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BUTT, ad: C.AD_PHYS, damn: 1, damd: 12 },
            { at: C.AT_KICK, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1300, cnutrit: 300, msound: C.MS_NEIGH, msize: C.MZ_LARGE,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_NOHANDS | C.M1_HERBIVORE,
        mflags2: C.M2_WANDER | C.M2_STRONG | C.M2_JEWELS,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 6,
        mcolor: C.CLR_BLACK
    },
    {
        mname: "horse",
        mlet: C.S_UNICORN,
        mlevel: 5, mmove: 20, ac: 5, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_KICK, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1500, cnutrit: 300, msound: C.MS_NEIGH, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_HERBIVORE,
        mflags2: C.M2_WANDER | C.M2_STRONG | C.M2_DOMESTIC,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 7,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "warhorse",
        mlet: C.S_UNICORN,
        mlevel: 7, mmove: 24, ac: 4, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_KICK, ad: C.AD_PHYS, damn: 1, damd: 10 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1800, cnutrit: 350, msound: C.MS_NEIGH, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_HERBIVORE,
        mflags2: C.M2_WANDER | C.M2_STRONG | C.M2_DOMESTIC,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 9,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "fog cloud",
        mlet: C.S_VORTEX,
        mlevel: 3, mmove: 1, ac: 0, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_NOCORPSE | 2),
        mattk: [
            { at: C.AT_ENGL, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_ETHEREAL, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_HUGE,
        mresists: C.MR_SLEEP | C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_BREATHLESS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_AMORPHOUS | C.M1_UNSOLID,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 4,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "dust vortex",
        mlet: C.S_VORTEX,
        mlevel: 4, mmove: 20, ac: 2, mr: 30, maligntyp: 0,
        geno: (C.G_GENO | C.G_NOCORPSE | 2),
        mattk: [
            { at: C.AT_ENGL, ad: C.AD_BLND, damn: 2, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_ETHEREAL, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_HUGE,
        mresists: C.MR_SLEEP | C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_BREATHLESS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 6,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "ice vortex",
        mlet: C.S_VORTEX,
        mlevel: 5, mmove: 20, ac: 2, mr: 30, maligntyp: 0,
        geno: (C.G_NOHELL | C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_ENGL, ad: C.AD_COLD, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_ETHEREAL, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_HUGE,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_BREATHLESS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 7,
        mcolor: C.CLR_CYAN
    },
    {
        mname: "energy vortex",
        mlet: C.S_VORTEX,
        mlevel: 6, mmove: 20, ac: 2, mr: 30, maligntyp: 0,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_ENGL, ad: C.AD_ELEC, damn: 1, damd: 6 },
            { at: C.AT_ENGL, ad: C.AD_DREN, damn: 2, damd: 6 },
            { at: C.AT_NONE, ad: C.AD_ELEC, damn: 0, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_ETHEREAL, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_HUGE,
        mresists: C.MR_ELEC | C.MR_SLEEP | C.MR_DISINT | C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_BREATHLESS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_UNSOLID,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 9,
        mcolor: C.HI_ZAP
    },
    {
        mname: "steam vortex",
        mlet: C.S_VORTEX,
        mlevel: 7, mmove: 22, ac: 2, mr: 30, maligntyp: 0,
        geno: (C.G_HELL | C.G_GENO | C.G_NOCORPSE | 2),
        mattk: [
            { at: C.AT_ENGL, ad: C.AD_FIRE, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_ETHEREAL, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_HUGE,
        mresists: C.MR_FIRE | C.MR_SLEEP | C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_BREATHLESS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_UNSOLID,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 9,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "fire vortex",
        mlet: C.S_VORTEX,
        mlevel: 8, mmove: 22, ac: 2, mr: 30, maligntyp: 0,
        geno: (C.G_HELL | C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_ENGL, ad: C.AD_FIRE, damn: 1, damd: 10 },
            { at: C.AT_NONE, ad: C.AD_FIRE, damn: 0, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_ETHEREAL, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_HUGE,
        mresists: C.MR_FIRE | C.MR_SLEEP | C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_BREATHLESS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_UNSOLID,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 10,
        mcolor: C.CLR_YELLOW
    },
    {
        mname: "baby long worm",
        mlet: C.S_WORM,
        mlevel: 5, mmove: 3, ac: 5, mr: 0, maligntyp: 0,
        geno: C.G_GENO,
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 600, cnutrit: 250, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_SLITHY | C.M1_NOLIMBS | C.M1_CARNIVORE | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 6,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "baby purple worm",
        mlet: C.S_WORM,
        mlevel: 8, mmove: 3, ac: 5, mr: 0, maligntyp: 0,
        geno: C.G_GENO,
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 600, cnutrit: 250, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_SLITHY | C.M1_NOLIMBS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 9,
        mcolor: C.CLR_MAGENTA
    },
    {
        mname: "long worm",
        mlet: C.S_WORM,
        mlevel: 9, mmove: 3, ac: 5, mr: 10, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1500, cnutrit: 500, msound: C.MS_SILENT, msize: C.MZ_GIGANTIC,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_SLITHY | C.M1_NOLIMBS | C.M1_OVIPAROUS | C.M1_CARNIVORE | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY,
        mflags3: 0,
        difficulty: 10,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "purple worm",
        mlet: C.S_WORM,
        mlevel: 15, mmove: 9, ac: 6, mr: 20, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: C.AT_ENGL, ad: C.AD_DGST, damn: 1, damd: 10 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2700, cnutrit: 700, msound: C.MS_SILENT, msize: C.MZ_GIGANTIC,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_SLITHY | C.M1_NOLIMBS | C.M1_OVIPAROUS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY,
        mflags3: 0,
        difficulty: 17,
        mcolor: C.CLR_MAGENTA
    },
    {
        mname: "grid bug",
        mlet: C.S_XAN,
        mlevel: 0, mmove: 12, ac: 9, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_SGROUP | C.G_NOCORPSE | 3),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_ELEC, damn: 1, damd: 1 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 15, cnutrit: 10, msound: C.MS_BUZZ, msize: C.MZ_TINY,
        mresists: C.MR_ELEC | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 1,
        mcolor: C.CLR_MAGENTA
    },
    {
        mname: "xan",
        mlet: C.S_XAN,
        mlevel: 7, mmove: 18, ac: -4, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 3),
        mattk: [
            { at: C.AT_STNG, ad: C.AD_LEGS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 300, cnutrit: 300, msound: C.MS_BUZZ, msize: C.MZ_TINY,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_FLY | C.M1_ANIMAL | C.M1_NOHANDS | C.M1_POIS,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 9,
        mcolor: C.CLR_RED
    },
    {
        mname: "yellow light",
        mlet: C.S_LIGHT,
        mlevel: 3, mmove: 15, ac: 0, mr: 0, maligntyp: 0,
        geno: (C.G_NOCORPSE | C.G_GENO | 4),
        mattk: [
            { at: C.AT_EXPL, ad: C.AD_BLND, damn: 10, damd: 20 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_ETHEREAL, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: C.MR_FIRE | C.MR_COLD | C.MR_ELEC | C.MR_DISINT | C.MR_SLEEP | C.MR_POISON | C.MR_ACID | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_BREATHLESS | C.M1_AMORPHOUS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_UNSOLID | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 5,
        mcolor: C.CLR_YELLOW
    },
    {
        mname: "black light",
        mlet: C.S_LIGHT,
        mlevel: 5, mmove: 15, ac: 0, mr: 0, maligntyp: 0,
        geno: (C.G_NOCORPSE | C.G_GENO | 2),
        mattk: [
            { at: C.AT_EXPL, ad: C.AD_HALU, damn: 10, damd: 12 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_ETHEREAL, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: C.MR_FIRE | C.MR_COLD | C.MR_ELEC | C.MR_DISINT | C.MR_SLEEP | C.MR_POISON | C.MR_ACID | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_BREATHLESS | C.M1_AMORPHOUS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_UNSOLID | C.M1_SEE_INVIS | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 7,
        mcolor: C.CLR_BLACK
    },
    {
        mname: "zruty",
        mlet: C.S_ZRUTY,
        mlevel: 9, mmove: 8, ac: 3, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 3, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 3, damd: 4 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1200, cnutrit: 600, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_HUMANOID | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 11,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "couatl",
        mlet: C.S_ANGEL,
        mlevel: 8, mmove: 10, ac: 5, mr: 30, maligntyp: 7,
        geno: (C.G_NOHELL | C.G_SGROUP | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_DRST, damn: 2, damd: 4 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: C.AT_HUGS, ad: C.AD_WRAP, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 900, cnutrit: 400, msound: C.MS_HISS, msize: C.MZ_LARGE,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_NOHANDS | C.M1_SLITHY | C.M1_POIS,
        mflags2: C.M2_MINION | C.M2_STALK | C.M2_STRONG | C.M2_NASTY,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 11,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "Aleax",
        mlet: C.S_ANGEL,
        mlevel: 10, mmove: 8, ac: 0, mr: 30, maligntyp: 7,
        geno: (C.G_NOHELL | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_KICK, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_IMITATE, msize: C.MZ_HUMAN,
        mresists: C.MR_COLD | C.MR_ELEC | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_SEE_INVIS,
        mflags2: C.M2_MINION | C.M2_STALK | C.M2_NASTY | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 12,
        mcolor: C.CLR_YELLOW
    },
    {
        mname: "Angel",
        mlet: C.S_ANGEL,
        mlevel: 14, mmove: 10, ac: -4, mr: 55, maligntyp: 12,
        geno: (C.G_NOHELL | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_MAGC, ad: C.AD_MAGM, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_CUSS, msize: C.MZ_HUMAN,
        mresists: C.MR_COLD | C.MR_ELEC | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_HUMANOID | C.M1_SEE_INVIS,
        mflags2: C.M2_NOPOLY | C.M2_MINION | C.M2_STALK | C.M2_STRONG | C.M2_NASTY | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 19,
        mcolor: C.CLR_WHITE
    },
    {
        mname: "ki-rin",
        mlet: C.S_ANGEL,
        mlevel: 16, mmove: 18, ac: -5, mr: 90, maligntyp: 15,
        geno: (C.G_NOHELL | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_KICK, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_KICK, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_BUTT, ad: C.AD_PHYS, damn: 3, damd: 6 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_SPELL, msize: C.MZ_LARGE,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_NOHANDS | C.M1_SEE_INVIS,
        mflags2: C.M2_NOPOLY | C.M2_MINION | C.M2_STALK | C.M2_STRONG | C.M2_NASTY | C.M2_LORD,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 21,
        mcolor: C.HI_GOLD
    },
    {
        mname: "Archon",
        mlet: C.S_ANGEL,
        mlevel: 19, mmove: 16, ac: -6, mr: 80, maligntyp: 15,
        geno: (C.G_NOHELL | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_GAZE, ad: C.AD_BLND, damn: 2, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 4, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_CUSS, msize: C.MZ_LARGE,
        mresists: C.MR_FIRE | C.MR_COLD | C.MR_ELEC | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_HUMANOID | C.M1_SEE_INVIS | C.M1_REGEN,
        mflags2: C.M2_NOPOLY | C.M2_MINION | C.M2_STALK | C.M2_STRONG | C.M2_NASTY | C.M2_LORD | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 26,
        mcolor: C.HI_LORD
    },
    {
        mname: "bat",
        mlet: C.S_BAT,
        mlevel: 0, mmove: 22, ac: 8, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_SGROUP | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 20, cnutrit: 20, msound: C.MS_SQEEK, msize: C.MZ_TINY,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_WANDER,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 2,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "giant bat",
        mlet: C.S_BAT,
        mlevel: 2, mmove: 22, ac: 7, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 30, cnutrit: 30, msound: C.MS_SQEEK, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_WANDER | C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 3,
        mcolor: C.CLR_RED
    },
    {
        mname: "raven",
        mlet: C.S_BAT,
        mlevel: 4, mmove: 20, ac: 6, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_BLND, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 40, cnutrit: 20, msound: C.MS_SQAWK, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_ANIMAL | C.M1_NOHANDS | C.M1_OVIPAROUS | C.M1_CARNIVORE,
        mflags2: C.M2_WANDER | C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 6,
        mcolor: C.CLR_BLACK
    },
    {
        mname: "vampire bat",
        mlet: C.S_BAT,
        mlevel: 5, mmove: 20, ac: 6, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_DRST, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 30, cnutrit: 20, msound: C.MS_SQEEK, msize: C.MZ_SMALL,
        mresists: C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_ANIMAL | C.M1_NOHANDS | C.M1_POIS | C.M1_REGEN | C.M1_OMNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 7,
        mcolor: C.CLR_BLACK
    },
    {
        mname: "plains centaur",
        mlet: C.S_CENTAUR,
        mlevel: 4, mmove: 18, ac: 4, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_KICK, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2500, cnutrit: 500, msound: C.MS_HUMANOID, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_STRONG | C.M2_GREEDY | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 6,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "forest centaur",
        mlet: C.S_CENTAUR,
        mlevel: 5, mmove: 18, ac: 3, mr: 10, maligntyp: -1,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: C.AT_KICK, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2550, cnutrit: 600, msound: C.MS_HUMANOID, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_STRONG | C.M2_GREEDY | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 8,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "mountain centaur",
        mlet: C.S_CENTAUR,
        mlevel: 6, mmove: 20, ac: 2, mr: 10, maligntyp: -3,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 10 },
            { at: C.AT_KICK, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_KICK, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2550, cnutrit: 500, msound: C.MS_HUMANOID, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_STRONG | C.M2_GREEDY | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 9,
        mcolor: C.CLR_CYAN
    },
    {
        mname: "baby gray dragon",
        mlet: C.S_DRAGON,
        mlevel: 12, mmove: 9, ac: 2, mr: 10, maligntyp: 0,
        geno: C.G_GENO,
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_BABY_DRAGON, cnutrit: 500, msound: C.MS_ROAR, msize: C.MZ_HUGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_GREEDY | C.M2_JEWELS,
        mflags3: 0,
        difficulty: 13,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "baby gold dragon",
        mlet: C.S_DRAGON,
        mlevel: 12, mmove: 9, ac: 2, mr: 10, maligntyp: 0,
        geno: C.G_GENO,
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_BABY_DRAGON, cnutrit: 500, msound: C.MS_ROAR, msize: C.MZ_HUGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_GREEDY | C.M2_JEWELS,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 13,
        mcolor: C.HI_GOLD
    },
    {
        mname: "baby silver dragon",
        mlet: C.S_DRAGON,
        mlevel: 12, mmove: 9, ac: 2, mr: 10, maligntyp: 0,
        geno: C.G_GENO,
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_BABY_DRAGON, cnutrit: 500, msound: C.MS_ROAR, msize: C.MZ_HUGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_GREEDY | C.M2_JEWELS,
        mflags3: 0,
        difficulty: 13,
        mcolor: C.DRAGON_SILVER
    },
    {
        mname: "baby shimmering dragon",
        mlet: C.S_DRAGON,
        mlevel: 12, mmove: 9, ac: 2, mr: 10, maligntyp: 0,
        geno: C.G_GENO,
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_BABY_DRAGON, cnutrit: 500, msound: C.MS_ROAR, msize: C.MZ_HUGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_GREEDY | C.M2_JEWELS,
        mflags3: 0,
        difficulty: 13,
        mcolor: C.CLR_CYAN
    },
    {
        mname: "baby red dragon",
        mlet: C.S_DRAGON,
        mlevel: 12, mmove: 9, ac: 2, mr: 10, maligntyp: 0,
        geno: C.G_GENO,
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_BABY_DRAGON, cnutrit: 500, msound: C.MS_ROAR, msize: C.MZ_HUGE,
        mresists: C.MR_FIRE, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_GREEDY | C.M2_JEWELS,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 13,
        mcolor: C.CLR_RED
    },
    {
        mname: "baby white dragon",
        mlet: C.S_DRAGON,
        mlevel: 12, mmove: 9, ac: 2, mr: 10, maligntyp: 0,
        geno: C.G_GENO,
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_BABY_DRAGON, cnutrit: 500, msound: C.MS_ROAR, msize: C.MZ_HUGE,
        mresists: C.MR_COLD, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_GREEDY | C.M2_JEWELS,
        mflags3: 0,
        difficulty: 13,
        mcolor: C.CLR_WHITE
    },
    {
        mname: "baby orange dragon",
        mlet: C.S_DRAGON,
        mlevel: 12, mmove: 9, ac: 2, mr: 10, maligntyp: 0,
        geno: C.G_GENO,
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_BABY_DRAGON, cnutrit: 500, msound: C.MS_ROAR, msize: C.MZ_HUGE,
        mresists: C.MR_SLEEP, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_GREEDY | C.M2_JEWELS,
        mflags3: 0,
        difficulty: 13,
        mcolor: C.CLR_ORANGE
    },
    {
        mname: "baby black dragon",
        mlet: C.S_DRAGON,
        mlevel: 12, mmove: 9, ac: 2, mr: 10, maligntyp: 0,
        geno: C.G_GENO,
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_BABY_DRAGON, cnutrit: 500, msound: C.MS_ROAR, msize: C.MZ_HUGE,
        mresists: C.MR_DISINT, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_GREEDY | C.M2_JEWELS,
        mflags3: 0,
        difficulty: 13,
        mcolor: C.CLR_BLACK
    },
    {
        mname: "baby blue dragon",
        mlet: C.S_DRAGON,
        mlevel: 12, mmove: 9, ac: 2, mr: 10, maligntyp: 0,
        geno: C.G_GENO,
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_BABY_DRAGON, cnutrit: 500, msound: C.MS_ROAR, msize: C.MZ_HUGE,
        mresists: C.MR_ELEC, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_GREEDY | C.M2_JEWELS,
        mflags3: 0,
        difficulty: 13,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "baby green dragon",
        mlet: C.S_DRAGON,
        mlevel: 12, mmove: 9, ac: 2, mr: 10, maligntyp: 0,
        geno: C.G_GENO,
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_BABY_DRAGON, cnutrit: 500, msound: C.MS_ROAR, msize: C.MZ_HUGE,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_CARNIVORE | C.M1_POIS,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_GREEDY | C.M2_JEWELS,
        mflags3: 0,
        difficulty: 13,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "baby yellow dragon",
        mlet: C.S_DRAGON,
        mlevel: 12, mmove: 9, ac: 2, mr: 10, maligntyp: 0,
        geno: C.G_GENO,
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_BABY_DRAGON, cnutrit: 500, msound: C.MS_ROAR, msize: C.MZ_HUGE,
        mresists: C.MR_ACID | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_CARNIVORE | C.M1_ACID,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_GREEDY | C.M2_JEWELS,
        mflags3: 0,
        difficulty: 13,
        mcolor: C.CLR_YELLOW
    },
    {
        mname: "gray dragon",
        mlet: C.S_DRAGON,
        mlevel: 15, mmove: 9, ac: -1, mr: 20, maligntyp: 4,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BREA, ad: C.AD_MAGM, damn: 4, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 8 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_DRAGON, cnutrit: 1500, msound: C.MS_ROAR, msize: C.MZ_GIGANTIC,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_SEE_INVIS | C.M1_OVIPAROUS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_GREEDY | C.M2_JEWELS | C.M2_MAGIC,
        mflags3: 0,
        difficulty: 20,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "gold dragon",
        mlet: C.S_DRAGON,
        mlevel: 15, mmove: 9, ac: -1, mr: 20, maligntyp: 4,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BREA, ad: C.AD_FIRE, damn: 4, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 8 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_DRAGON, cnutrit: 1500, msound: C.MS_ROAR, msize: C.MZ_GIGANTIC,
        mresists: C.MR_FIRE, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_SEE_INVIS | C.M1_OVIPAROUS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_GREEDY | C.M2_JEWELS | C.M2_MAGIC,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 20,
        mcolor: C.HI_GOLD
    },
    {
        mname: "silver dragon",
        mlet: C.S_DRAGON,
        mlevel: 15, mmove: 9, ac: -1, mr: 20, maligntyp: 4,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BREA, ad: C.AD_COLD, damn: 4, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 8 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_DRAGON, cnutrit: 1500, msound: C.MS_ROAR, msize: C.MZ_GIGANTIC,
        mresists: C.MR_COLD, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_SEE_INVIS | C.M1_OVIPAROUS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_GREEDY | C.M2_JEWELS | C.M2_MAGIC,
        mflags3: 0,
        difficulty: 20,
        mcolor: C.DRAGON_SILVER
    },
    {
        mname: "shimmering dragon",
        mlet: C.S_DRAGON,
        mlevel: 15, mmove: 9, ac: -1, mr: 20, maligntyp: 4,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BREA, ad: C.AD_MAGM, damn: 4, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 8 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_DRAGON, cnutrit: 1500, msound: C.MS_ROAR, msize: C.MZ_GIGANTIC,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_SEE_INVIS | C.M1_OVIPAROUS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_GREEDY | C.M2_JEWELS | C.M2_MAGIC,
        mflags3: 0,
        difficulty: 20,
        mcolor: C.CLR_CYAN
    },
    {
        mname: "red dragon",
        mlet: C.S_DRAGON,
        mlevel: 15, mmove: 9, ac: -1, mr: 20, maligntyp: -4,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BREA, ad: C.AD_FIRE, damn: 6, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 8 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_DRAGON, cnutrit: 1500, msound: C.MS_ROAR, msize: C.MZ_GIGANTIC,
        mresists: C.MR_FIRE, mconveys: C.MR_FIRE,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_SEE_INVIS | C.M1_OVIPAROUS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_GREEDY | C.M2_JEWELS | C.M2_MAGIC,
        mflags3: C.M3_INFRAVISION | C.M3_INFRAVISIBLE,
        difficulty: 20,
        mcolor: C.CLR_RED
    },
    {
        mname: "white dragon",
        mlet: C.S_DRAGON,
        mlevel: 15, mmove: 9, ac: -1, mr: 20, maligntyp: -5,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BREA, ad: C.AD_COLD, damn: 4, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 8 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_DRAGON, cnutrit: 1500, msound: C.MS_ROAR, msize: C.MZ_GIGANTIC,
        mresists: C.MR_COLD, mconveys: C.MR_COLD,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_SEE_INVIS | C.M1_OVIPAROUS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_GREEDY | C.M2_JEWELS | C.M2_MAGIC,
        mflags3: 0,
        difficulty: 20,
        mcolor: C.CLR_WHITE
    },
    {
        mname: "orange dragon",
        mlet: C.S_DRAGON,
        mlevel: 15, mmove: 9, ac: -1, mr: 20, maligntyp: 5,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BREA, ad: C.AD_SLEE, damn: 4, damd: 25 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 8 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_DRAGON, cnutrit: 1500, msound: C.MS_ROAR, msize: C.MZ_GIGANTIC,
        mresists: C.MR_SLEEP, mconveys: C.MR_SLEEP,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_SEE_INVIS | C.M1_OVIPAROUS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_GREEDY | C.M2_JEWELS | C.M2_MAGIC,
        mflags3: 0,
        difficulty: 20,
        mcolor: C.CLR_ORANGE
    },
    {
        mname: "black dragon",
        mlet: C.S_DRAGON,
        mlevel: 15, mmove: 9, ac: -1, mr: 20, maligntyp: -6,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BREA, ad: C.AD_DISN, damn: 1, damd: 255 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 8 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_DRAGON, cnutrit: 1500, msound: C.MS_ROAR, msize: C.MZ_GIGANTIC,
        mresists: C.MR_DISINT, mconveys: C.MR_DISINT,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_SEE_INVIS | C.M1_OVIPAROUS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_GREEDY | C.M2_JEWELS | C.M2_MAGIC,
        mflags3: 0,
        difficulty: 20,
        mcolor: C.CLR_BLACK
    },
    {
        mname: "blue dragon",
        mlet: C.S_DRAGON,
        mlevel: 15, mmove: 9, ac: -1, mr: 20, maligntyp: -7,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BREA, ad: C.AD_ELEC, damn: 4, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 8 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_DRAGON, cnutrit: 1500, msound: C.MS_ROAR, msize: C.MZ_GIGANTIC,
        mresists: C.MR_ELEC, mconveys: C.MR_ELEC,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_SEE_INVIS | C.M1_OVIPAROUS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_GREEDY | C.M2_JEWELS | C.M2_MAGIC,
        mflags3: 0,
        difficulty: 20,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "green dragon",
        mlet: C.S_DRAGON,
        mlevel: 15, mmove: 9, ac: -1, mr: 20, maligntyp: 6,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BREA, ad: C.AD_DRST, damn: 4, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 8 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_DRAGON, cnutrit: 1500, msound: C.MS_ROAR, msize: C.MZ_GIGANTIC,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_SEE_INVIS | C.M1_OVIPAROUS | C.M1_CARNIVORE | C.M1_POIS,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_GREEDY | C.M2_JEWELS | C.M2_MAGIC,
        mflags3: 0,
        difficulty: 20,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "yellow dragon",
        mlet: C.S_DRAGON,
        mlevel: 15, mmove: 9, ac: -1, mr: 20, maligntyp: 7,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BREA, ad: C.AD_ACID, damn: 4, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 8 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_DRAGON, cnutrit: 1500, msound: C.MS_ROAR, msize: C.MZ_GIGANTIC,
        mresists: C.MR_ACID | C.MR_STONE, mconveys: C.MR_ACID | C.MR_STONE,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_SEE_INVIS | C.M1_OVIPAROUS | C.M1_CARNIVORE | C.M1_ACID,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_GREEDY | C.M2_JEWELS | C.M2_MAGIC,
        mflags3: 0,
        difficulty: 20,
        mcolor: C.CLR_YELLOW
    },
    {
        mname: "stalker",
        mlet: C.S_ELEMENTAL,
        mlevel: 8, mmove: 12, ac: 3, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 3),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 4, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 900, cnutrit: 400, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_FLY | C.M1_SEE_INVIS,
        mflags2: C.M2_WANDER | C.M2_STALK | C.M2_HOSTILE | C.M2_STRONG,
        mflags3: C.M3_INFRAVISION,
        difficulty: 9,
        mcolor: C.CLR_WHITE
    },
    {
        mname: "air elemental",
        mlet: C.S_ELEMENTAL,
        mlevel: 8, mmove: 36, ac: 2, mr: 30, maligntyp: 0,
        geno: (C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_ENGL, ad: C.AD_PHYS, damn: 1, damd: 10 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_ETHEREAL, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_HUGE,
        mresists: C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_BREATHLESS | C.M1_UNSOLID | C.M1_FLY,
        mflags2: C.M2_STRONG | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 10,
        mcolor: C.CLR_CYAN
    },
    {
        mname: "fire elemental",
        mlet: C.S_ELEMENTAL,
        mlevel: 8, mmove: 12, ac: 2, mr: 30, maligntyp: 0,
        geno: (C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_FIRE, damn: 3, damd: 6 },
            { at: C.AT_NONE, ad: C.AD_FIRE, damn: 0, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_ETHEREAL, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_HUGE,
        mresists: C.MR_FIRE | C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_BREATHLESS | C.M1_UNSOLID | C.M1_FLY | C.M1_NOTAKE,
        mflags2: C.M2_STRONG | C.M2_NEUTER,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 10,
        mcolor: C.CLR_YELLOW
    },
    {
        mname: "earth elemental",
        mlet: C.S_ELEMENTAL,
        mlevel: 8, mmove: 6, ac: 2, mr: 30, maligntyp: 0,
        geno: (C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 4, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2500, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_HUGE,
        mresists: C.MR_FIRE | C.MR_COLD | C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_BREATHLESS | C.M1_WALLWALK | C.M1_THICK_HIDE,
        mflags2: C.M2_STRONG | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 10,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "water elemental",
        mlet: C.S_ELEMENTAL,
        mlevel: 8, mmove: 5, ac: 2, mr: 30, maligntyp: 0,
        geno: (C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 5, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2500, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_HUGE,
        mresists: C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_BREATHLESS | C.M1_UNSOLID | C.M1_AMPHIBIOUS | C.M1_SWIM,
        mflags2: C.M2_STRONG | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 10,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "lichen",
        mlet: C.S_FUNGUS,
        mlevel: 0, mmove: 1, ac: 9, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 4),
        mattk: [
            { at: C.AT_TUCH, ad: C.AD_STCK, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 20, cnutrit: 200, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 1,
        mcolor: C.CLR_BRIGHT_GREEN
    },
    {
        mname: "brown mold",
        mlet: C.S_FUNGUS,
        mlevel: 1, mmove: 0, ac: 9, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_NONE, ad: C.AD_COLD, damn: 0, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 50, cnutrit: 30, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: C.MR_COLD | C.MR_POISON, mconveys: C.MR_COLD | C.MR_POISON,
        mflags1: C.M1_BREATHLESS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 2,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "yellow mold",
        mlet: C.S_FUNGUS,
        mlevel: 1, mmove: 0, ac: 9, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_NONE, ad: C.AD_STUN, damn: 0, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 50, cnutrit: 30, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_BREATHLESS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_POIS | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 2,
        mcolor: C.CLR_YELLOW
    },
    {
        mname: "green mold",
        mlet: C.S_FUNGUS,
        mlevel: 1, mmove: 0, ac: 9, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_NONE, ad: C.AD_ACID, damn: 0, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 50, cnutrit: 30, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: C.MR_ACID | C.MR_STONE, mconveys: C.MR_ACID | C.MR_STONE,
        mflags1: C.M1_BREATHLESS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_ACID | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 2,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "red mold",
        mlet: C.S_FUNGUS,
        mlevel: 1, mmove: 0, ac: 9, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_NONE, ad: C.AD_FIRE, damn: 0, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 50, cnutrit: 30, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: C.MR_FIRE | C.MR_POISON, mconveys: C.MR_FIRE | C.MR_POISON,
        mflags1: C.M1_BREATHLESS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 2,
        mcolor: C.CLR_RED
    },
    {
        mname: "shrieker",
        mlet: C.S_FUNGUS,
        mlevel: 3, mmove: 1, ac: 7, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 100, cnutrit: 100, msound: C.MS_SHRIEK, msize: C.MZ_SMALL,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_BREATHLESS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 2,
        mcolor: C.CLR_MAGENTA
    },
    {
        mname: "violet fungus",
        mlet: C.S_FUNGUS,
        mlevel: 3, mmove: 1, ac: 7, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_TUCH, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_TUCH, ad: C.AD_STCK, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 100, cnutrit: 100, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_BREATHLESS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 5,
        mcolor: C.CLR_MAGENTA
    },
    {
        mname: "gnome",
        mlet: C.S_GNOME,
        mlevel: 1, mmove: 6, ac: 10, mr: 4, maligntyp: 0,
        geno: (C.G_GENO | C.G_SGROUP | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 650, cnutrit: 100, msound: C.MS_ORC, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_GNOME | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 3,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "gnome lord",
        mlet: C.S_GNOME,
        mlevel: 3, mmove: 8, ac: 10, mr: 4, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 700, cnutrit: 120, msound: C.MS_ORC, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_GNOME | C.M2_LORD | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 4,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "gnomish wizard",
        mlet: C.S_GNOME,
        mlevel: 3, mmove: 10, ac: 4, mr: 10, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 700, cnutrit: 120, msound: C.MS_ORC, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_GNOME | C.M2_MAGIC,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 5,
        mcolor: C.HI_ZAP
    },
    {
        mname: "gnome king",
        mlet: C.S_GNOME,
        mlevel: 5, mmove: 10, ac: 10, mr: 20, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 750, cnutrit: 150, msound: C.MS_ORC, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_GNOME | C.M2_PRINCE | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 6,
        mcolor: C.HI_LORD
    },
    {
        mname: "giant",
        mlet: C.S_GIANT,
        mlevel: 6, mmove: 6, ac: 0, mr: 0, maligntyp: 2,
        geno: (C.G_GENO | C.G_NOGEN | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 10 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2250, cnutrit: 750, msound: C.MS_BOAST, msize: C.MZ_HUGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_CARNIVORE,
        mflags2: C.M2_GIANT | C.M2_STRONG | C.M2_ROCKTHROW | C.M2_NASTY | C.M2_COLLECT | C.M2_JEWELS,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 8,
        mcolor: C.CLR_RED
    },
    {
        mname: "stone giant",
        mlet: C.S_GIANT,
        mlevel: 6, mmove: 6, ac: 0, mr: 0, maligntyp: 2,
        geno: (C.G_GENO | C.G_SGROUP | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 10 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2250, cnutrit: 750, msound: C.MS_BOAST, msize: C.MZ_HUGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_CARNIVORE,
        mflags2: C.M2_GIANT | C.M2_STRONG | C.M2_ROCKTHROW | C.M2_NASTY | C.M2_COLLECT | C.M2_JEWELS,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 8,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "hill giant",
        mlet: C.S_GIANT,
        mlevel: 8, mmove: 10, ac: 6, mr: 0, maligntyp: -2,
        geno: (C.G_GENO | C.G_SGROUP | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2200, cnutrit: 700, msound: C.MS_BOAST, msize: C.MZ_HUGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_CARNIVORE,
        mflags2: C.M2_GIANT | C.M2_STRONG | C.M2_ROCKTHROW | C.M2_NASTY | C.M2_COLLECT | C.M2_JEWELS,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 10,
        mcolor: C.CLR_CYAN
    },
    {
        mname: "fire giant",
        mlet: C.S_GIANT,
        mlevel: 9, mmove: 12, ac: 4, mr: 5, maligntyp: 2,
        geno: (C.G_GENO | C.G_SGROUP | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 10 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2250, cnutrit: 750, msound: C.MS_BOAST, msize: C.MZ_HUGE,
        mresists: C.MR_FIRE, mconveys: C.MR_FIRE,
        mflags1: C.M1_HUMANOID | C.M1_CARNIVORE,
        mflags2: C.M2_GIANT | C.M2_STRONG | C.M2_ROCKTHROW | C.M2_NASTY | C.M2_COLLECT | C.M2_JEWELS,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 11,
        mcolor: C.CLR_YELLOW
    },
    {
        mname: "frost giant",
        mlet: C.S_GIANT,
        mlevel: 10, mmove: 12, ac: 3, mr: 10, maligntyp: -3,
        geno: (C.G_NOHELL | C.G_GENO | C.G_SGROUP | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 12 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2250, cnutrit: 750, msound: C.MS_BOAST, msize: C.MZ_HUGE,
        mresists: C.MR_COLD, mconveys: C.MR_COLD,
        mflags1: C.M1_HUMANOID | C.M1_CARNIVORE,
        mflags2: C.M2_GIANT | C.M2_STRONG | C.M2_ROCKTHROW | C.M2_NASTY | C.M2_COLLECT | C.M2_JEWELS,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 13,
        mcolor: C.CLR_WHITE
    },
    {
        mname: "ettin",
        mlet: C.S_GIANT,
        mlevel: 10, mmove: 12, ac: 3, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 3, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1700, cnutrit: 500, msound: C.MS_GRUNT, msize: C.MZ_HUGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_HUMANOID | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 13,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "storm giant",
        mlet: C.S_GIANT,
        mlevel: 16, mmove: 12, ac: 3, mr: 10, maligntyp: -3,
        geno: (C.G_GENO | C.G_SGROUP | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 12 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2250, cnutrit: 750, msound: C.MS_BOAST, msize: C.MZ_HUGE,
        mresists: C.MR_ELEC, mconveys: C.MR_ELEC,
        mflags1: C.M1_HUMANOID | C.M1_CARNIVORE,
        mflags2: C.M2_GIANT | C.M2_STRONG | C.M2_ROCKTHROW | C.M2_NASTY | C.M2_COLLECT | C.M2_JEWELS,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 19,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "titan",
        mlet: C.S_GIANT,
        mlevel: 16, mmove: 18, ac: -3, mr: 70, maligntyp: 9,
        geno: (1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2300, cnutrit: 900, msound: C.MS_SPELL, msize: C.MZ_HUGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_STRONG | C.M2_ROCKTHROW | C.M2_NASTY | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 20,
        mcolor: C.CLR_MAGENTA
    },
    {
        mname: "minotaur",
        mlet: C.S_GIANT,
        mlevel: 15, mmove: 15, ac: 6, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_NOGEN),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 3, damd: 10 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 3, damd: 10 },
            { at: C.AT_BUTT, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1500, cnutrit: 700, msound: C.MS_MOO, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_HUMANOID | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 17,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "jabberwock",
        mlet: C.S_JABBERWOCK,
        mlevel: 15, mmove: 12, ac: -2, mr: 50, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 10 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 10 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 10 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 10 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1300, cnutrit: 600, msound: C.MS_BURBLE, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_FLY | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 18,
        mcolor: C.CLR_ORANGE
    },
    {
        mname: "vorpal jabberwock",
        mlet: C.S_JABBERWOCK,
        mlevel: 20, mmove: 12, ac: -2, mr: 50, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 10 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 10 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 3, damd: 10 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 3, damd: 10 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1300, cnutrit: 600, msound: C.MS_BURBLE, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_FLY | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 25,
        mcolor: C.HI_LORD
    },
    {
        mname: "Keystone Kop",
        mlet: C.S_KOP,
        mlevel: 1, mmove: 6, ac: 10, mr: 10, maligntyp: 9,
        geno: (C.G_GENO | C.G_LGROUP | C.G_NOGEN),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 200, msound: C.MS_ARREST, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID,
        mflags2: C.M2_HUMAN | C.M2_WANDER | C.M2_HOSTILE | C.M2_MALE | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 3,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "Kop Sergeant",
        mlet: C.S_KOP,
        mlevel: 2, mmove: 8, ac: 10, mr: 10, maligntyp: 10,
        geno: (C.G_GENO | C.G_SGROUP | C.G_NOGEN),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 200, msound: C.MS_ARREST, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID,
        mflags2: C.M2_HUMAN | C.M2_WANDER | C.M2_HOSTILE | C.M2_STRONG | C.M2_MALE | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 4,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "Kop Lieutenant",
        mlet: C.S_KOP,
        mlevel: 3, mmove: 10, ac: 10, mr: 20, maligntyp: 11,
        geno: (C.G_GENO | C.G_NOGEN),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 200, msound: C.MS_ARREST, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID,
        mflags2: C.M2_HUMAN | C.M2_WANDER | C.M2_HOSTILE | C.M2_STRONG | C.M2_MALE | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 5,
        mcolor: C.CLR_CYAN
    },
    {
        mname: "Kop Kaptain",
        mlet: C.S_KOP,
        mlevel: 4, mmove: 12, ac: 10, mr: 20, maligntyp: 12,
        geno: (C.G_GENO | C.G_NOGEN),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 200, msound: C.MS_ARREST, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID,
        mflags2: C.M2_HUMAN | C.M2_WANDER | C.M2_HOSTILE | C.M2_STRONG | C.M2_MALE | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 6,
        mcolor: C.HI_LORD
    },
    {
        mname: "lich",
        mlet: C.S_LICH,
        mlevel: 11, mmove: 6, ac: 0, mr: 30, maligntyp: -9,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_TUCH, ad: C.AD_COLD, damn: 1, damd: 10 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1200, cnutrit: 100, msound: C.MS_MUMBLE, msize: C.MZ_HUMAN,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: C.MR_COLD,
        mflags1: C.M1_BREATHLESS | C.M1_HUMANOID | C.M1_POIS | C.M1_REGEN,
        mflags2: C.M2_UNDEAD | C.M2_HOSTILE | C.M2_MAGIC,
        mflags3: C.M3_INFRAVISION,
        difficulty: 14,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "demilich",
        mlet: C.S_LICH,
        mlevel: 14, mmove: 9, ac: -2, mr: 60, maligntyp: -12,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_TUCH, ad: C.AD_COLD, damn: 3, damd: 4 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1200, cnutrit: 100, msound: C.MS_MUMBLE, msize: C.MZ_HUMAN,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: C.MR_COLD,
        mflags1: C.M1_BREATHLESS | C.M1_HUMANOID | C.M1_POIS | C.M1_REGEN,
        mflags2: C.M2_UNDEAD | C.M2_HOSTILE | C.M2_MAGIC,
        mflags3: C.M3_INFRAVISION,
        difficulty: 18,
        mcolor: C.CLR_RED
    },
    {
        mname: "master lich",
        mlet: C.S_LICH,
        mlevel: 17, mmove: 9, ac: -4, mr: 90, maligntyp: -15,
        geno: (C.G_HELL | C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_TUCH, ad: C.AD_COLD, damn: 3, damd: 6 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1200, cnutrit: 100, msound: C.MS_MUMBLE, msize: C.MZ_HUMAN,
        mresists: C.MR_FIRE | C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: C.MR_FIRE | C.MR_COLD,
        mflags1: C.M1_BREATHLESS | C.M1_HUMANOID | C.M1_POIS | C.M1_REGEN,
        mflags2: C.M2_UNDEAD | C.M2_HOSTILE | C.M2_MAGIC,
        mflags3: C.M3_WANTSBOOK | C.M3_INFRAVISION,
        difficulty: 21,
        mcolor: C.HI_LORD
    },
    {
        mname: "arch-lich",
        mlet: C.S_LICH,
        mlevel: 25, mmove: 9, ac: -6, mr: 90, maligntyp: -15,
        geno: (C.G_HELL | C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_TUCH, ad: C.AD_COLD, damn: 5, damd: 6 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1200, cnutrit: 100, msound: C.MS_MUMBLE, msize: C.MZ_HUMAN,
        mresists: C.MR_FIRE | C.MR_COLD | C.MR_SLEEP | C.MR_ELEC | C.MR_POISON, mconveys: C.MR_FIRE | C.MR_COLD,
        mflags1: C.M1_BREATHLESS | C.M1_HUMANOID | C.M1_POIS | C.M1_REGEN,
        mflags2: C.M2_UNDEAD | C.M2_HOSTILE | C.M2_MAGIC,
        mflags3: C.M3_WANTSBOOK | C.M3_INFRAVISION,
        difficulty: 29,
        mcolor: C.HI_LORD
    },
    {
        mname: "kobold mummy",
        mlet: C.S_MUMMY,
        mlevel: 3, mmove: 8, ac: 6, mr: 20, maligntyp: -2,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 400, cnutrit: 50, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID | C.M1_POIS,
        mflags2: C.M2_UNDEAD | C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISION,
        difficulty: 4,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "gnome mummy",
        mlet: C.S_MUMMY,
        mlevel: 4, mmove: 10, ac: 6, mr: 20, maligntyp: -3,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 650, cnutrit: 50, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID | C.M1_POIS,
        mflags2: C.M2_UNDEAD | C.M2_HOSTILE | C.M2_GNOME,
        mflags3: C.M3_INFRAVISION,
        difficulty: 5,
        mcolor: C.CLR_RED
    },
    {
        mname: "orc mummy",
        mlet: C.S_MUMMY,
        mlevel: 5, mmove: 10, ac: 5, mr: 20, maligntyp: -4,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 850, cnutrit: 75, msound: C.MS_SILENT, msize: C.MZ_HUMAN,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID | C.M1_POIS,
        mflags2: C.M2_UNDEAD | C.M2_HOSTILE | C.M2_STRONG | C.M2_ORC | C.M2_GREEDY | C.M2_JEWELS,
        mflags3: C.M3_INFRAVISION,
        difficulty: 6,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "dwarf mummy",
        mlet: C.S_MUMMY,
        mlevel: 5, mmove: 10, ac: 5, mr: 20, maligntyp: -4,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 900, cnutrit: 150, msound: C.MS_SILENT, msize: C.MZ_HUMAN,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID | C.M1_POIS,
        mflags2: C.M2_UNDEAD | C.M2_HOSTILE | C.M2_DWARF | C.M2_GREEDY | C.M2_JEWELS,
        mflags3: C.M3_INFRAVISION,
        difficulty: 6,
        mcolor: C.CLR_RED
    },
    {
        mname: "elf mummy",
        mlet: C.S_MUMMY,
        mlevel: 6, mmove: 12, ac: 4, mr: 30, maligntyp: -5,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_ELF, cnutrit: 175, msound: C.MS_SILENT, msize: C.MZ_HUMAN,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID | C.M1_POIS,
        mflags2: C.M2_UNDEAD | C.M2_HOSTILE | C.M2_ELF,
        mflags3: C.M3_INFRAVISION,
        difficulty: 7,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "human mummy",
        mlet: C.S_MUMMY,
        mlevel: 6, mmove: 12, ac: 4, mr: 30, maligntyp: -5,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 200, msound: C.MS_SILENT, msize: C.MZ_HUMAN,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID | C.M1_POIS,
        mflags2: C.M2_UNDEAD | C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISION,
        difficulty: 7,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "ettin mummy",
        mlet: C.S_MUMMY,
        mlevel: 7, mmove: 12, ac: 4, mr: 30, maligntyp: -6,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1700, cnutrit: 250, msound: C.MS_SILENT, msize: C.MZ_HUGE,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID | C.M1_POIS,
        mflags2: C.M2_UNDEAD | C.M2_HOSTILE | C.M2_STRONG,
        mflags3: C.M3_INFRAVISION,
        difficulty: 8,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "giant mummy",
        mlet: C.S_MUMMY,
        mlevel: 8, mmove: 14, ac: 3, mr: 30, maligntyp: -7,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 3, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 3, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2050, cnutrit: 375, msound: C.MS_SILENT, msize: C.MZ_HUGE,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID | C.M1_POIS,
        mflags2: C.M2_UNDEAD | C.M2_HOSTILE | C.M2_GIANT | C.M2_STRONG | C.M2_JEWELS,
        mflags3: C.M3_INFRAVISION,
        difficulty: 10,
        mcolor: C.CLR_CYAN
    },
    {
        mname: "red naga hatchling",
        mlet: C.S_NAGA,
        mlevel: 3, mmove: 10, ac: 6, mr: 0, maligntyp: 0,
        geno: C.G_GENO,
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 500, cnutrit: 100, msound: C.MS_MUMBLE, msize: C.MZ_LARGE,
        mresists: C.MR_FIRE | C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_NOLIMBS | C.M1_SLITHY | C.M1_THICK_HIDE | C.M1_NOTAKE | C.M1_OMNIVORE,
        mflags2: C.M2_STRONG,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 4,
        mcolor: C.CLR_RED
    },
    {
        mname: "black naga hatchling",
        mlet: C.S_NAGA,
        mlevel: 3, mmove: 10, ac: 6, mr: 0, maligntyp: 0,
        geno: C.G_GENO,
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 500, cnutrit: 100, msound: C.MS_MUMBLE, msize: C.MZ_LARGE,
        mresists: C.MR_POISON | C.MR_ACID | C.MR_STONE, mconveys: C.MR_POISON,
        mflags1: C.M1_NOLIMBS | C.M1_SLITHY | C.M1_THICK_HIDE | C.M1_ACID | C.M1_NOTAKE | C.M1_CARNIVORE,
        mflags2: C.M2_STRONG,
        mflags3: 0,
        difficulty: 4,
        mcolor: C.CLR_BLACK
    },
    {
        mname: "golden naga hatchling",
        mlet: C.S_NAGA,
        mlevel: 3, mmove: 10, ac: 6, mr: 0, maligntyp: 0,
        geno: C.G_GENO,
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 500, cnutrit: 100, msound: C.MS_MUMBLE, msize: C.MZ_LARGE,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_NOLIMBS | C.M1_SLITHY | C.M1_THICK_HIDE | C.M1_NOTAKE | C.M1_OMNIVORE,
        mflags2: C.M2_STRONG,
        mflags3: 0,
        difficulty: 4,
        mcolor: C.HI_GOLD
    },
    {
        mname: "guardian naga hatchling",
        mlet: C.S_NAGA,
        mlevel: 3, mmove: 10, ac: 6, mr: 0, maligntyp: 0,
        geno: C.G_GENO,
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 500, cnutrit: 100, msound: C.MS_MUMBLE, msize: C.MZ_LARGE,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_NOLIMBS | C.M1_SLITHY | C.M1_THICK_HIDE | C.M1_NOTAKE | C.M1_OMNIVORE,
        mflags2: C.M2_STRONG,
        mflags3: 0,
        difficulty: 4,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "red naga",
        mlet: C.S_NAGA,
        mlevel: 6, mmove: 12, ac: 4, mr: 0, maligntyp: -4,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_BREA, ad: C.AD_FIRE, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2600, cnutrit: 400, msound: C.MS_MUMBLE, msize: C.MZ_HUGE,
        mresists: C.MR_FIRE | C.MR_POISON, mconveys: C.MR_FIRE | C.MR_POISON,
        mflags1: C.M1_NOLIMBS | C.M1_SLITHY | C.M1_THICK_HIDE | C.M1_OVIPAROUS | C.M1_NOTAKE | C.M1_OMNIVORE,
        mflags2: C.M2_STRONG,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 8,
        mcolor: C.CLR_RED
    },
    {
        mname: "black naga",
        mlet: C.S_NAGA,
        mlevel: 8, mmove: 14, ac: 2, mr: 10, maligntyp: 4,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: C.AT_SPIT, ad: C.AD_ACID, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2600, cnutrit: 400, msound: C.MS_MUMBLE, msize: C.MZ_HUGE,
        mresists: C.MR_POISON | C.MR_ACID | C.MR_STONE, mconveys: C.MR_POISON | C.MR_ACID | C.MR_STONE,
        mflags1: C.M1_NOLIMBS | C.M1_SLITHY | C.M1_THICK_HIDE | C.M1_OVIPAROUS | C.M1_ACID | C.M1_NOTAKE | C.M1_CARNIVORE,
        mflags2: C.M2_STRONG,
        mflags3: 0,
        difficulty: 10,
        mcolor: C.CLR_BLACK
    },
    {
        mname: "golden naga",
        mlet: C.S_NAGA,
        mlevel: 10, mmove: 14, ac: 2, mr: 70, maligntyp: 5,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 4, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2600, cnutrit: 400, msound: C.MS_MUMBLE, msize: C.MZ_HUGE,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_NOLIMBS | C.M1_SLITHY | C.M1_THICK_HIDE | C.M1_OVIPAROUS | C.M1_NOTAKE | C.M1_OMNIVORE,
        mflags2: C.M2_STRONG,
        mflags3: 0,
        difficulty: 13,
        mcolor: C.HI_GOLD
    },
    {
        mname: "guardian naga",
        mlet: C.S_NAGA,
        mlevel: 12, mmove: 16, ac: 0, mr: 50, maligntyp: 7,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_SPIT, ad: C.AD_DRST, damn: 1, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PLYS, damn: 1, damd: 6 },
            { at: C.AT_TUCH, ad: C.AD_PHYS, damn: 0, damd: 0 },
            { at: C.AT_HUGS, ad: C.AD_WRAP, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2600, cnutrit: 400, msound: C.MS_MUMBLE, msize: C.MZ_HUGE,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_NOLIMBS | C.M1_SLITHY | C.M1_THICK_HIDE | C.M1_OVIPAROUS | C.M1_POIS | C.M1_NOTAKE | C.M1_OMNIVORE,
        mflags2: C.M2_STRONG,
        mflags3: 0,
        difficulty: 17,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "ogre",
        mlet: C.S_OGRE,
        mlevel: 5, mmove: 10, ac: 5, mr: 0, maligntyp: -3,
        geno: (C.G_SGROUP | C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 5 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1600, cnutrit: 500, msound: C.MS_GRUNT, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_CARNIVORE,
        mflags2: C.M2_STRONG | C.M2_GREEDY | C.M2_JEWELS | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 7,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "ogre lord",
        mlet: C.S_OGRE,
        mlevel: 7, mmove: 12, ac: 3, mr: 30, maligntyp: -5,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1700, cnutrit: 700, msound: C.MS_GRUNT, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_CARNIVORE,
        mflags2: C.M2_STRONG | C.M2_LORD | C.M2_GREEDY | C.M2_JEWELS | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 9,
        mcolor: C.CLR_RED
    },
    {
        mname: "ogre king",
        mlet: C.S_OGRE,
        mlevel: 9, mmove: 14, ac: 4, mr: 60, maligntyp: -7,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 3, damd: 5 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1700, cnutrit: 750, msound: C.MS_GRUNT, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_CARNIVORE,
        mflags2: C.M2_STRONG | C.M2_PRINCE | C.M2_GREEDY | C.M2_JEWELS | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 11,
        mcolor: C.HI_LORD
    },
    {
        mname: "gray ooze",
        mlet: C.S_PUDDING,
        mlevel: 3, mmove: 1, ac: 8, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_NOCORPSE | 2),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_RUST, damn: 2, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 500, cnutrit: 250, msound: C.MS_SILENT, msize: C.MZ_MEDIUM,
        mresists: C.MR_FIRE | C.MR_COLD | C.MR_POISON | C.MR_ACID | C.MR_STONE, mconveys: C.MR_FIRE | C.MR_COLD | C.MR_POISON,
        mflags1: C.M1_BREATHLESS | C.M1_AMORPHOUS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_OMNIVORE | C.M1_ACID,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 4,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "brown pudding",
        mlet: C.S_PUDDING,
        mlevel: 5, mmove: 3, ac: 8, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_DCAY, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 500, cnutrit: 250, msound: C.MS_SILENT, msize: C.MZ_MEDIUM,
        mresists: C.MR_COLD | C.MR_ELEC | C.MR_POISON | C.MR_ACID | C.MR_STONE, mconveys: C.MR_COLD | C.MR_ELEC | C.MR_POISON,
        mflags1: C.M1_BREATHLESS | C.M1_AMORPHOUS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_OMNIVORE | C.M1_ACID,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 6,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "green slime",
        mlet: C.S_PUDDING,
        mlevel: 6, mmove: 6, ac: 6, mr: 0, maligntyp: 0,
        geno: (C.G_HELL | C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_TUCH, ad: C.AD_SLIM, damn: 1, damd: 4 },
            { at: C.AT_NONE, ad: C.AD_SLIM, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 400, cnutrit: 150, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_COLD | C.MR_ELEC | C.MR_POISON | C.MR_ACID | C.MR_STONE, mconveys: C.MR_ACID | C.MR_STONE,
        mflags1: C.M1_BREATHLESS | C.M1_AMORPHOUS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_OMNIVORE | C.M1_ACID | C.M1_POIS,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 8,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "black pudding",
        mlet: C.S_PUDDING,
        mlevel: 10, mmove: 6, ac: 6, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_CORR, damn: 3, damd: 8 },
            { at: C.AT_NONE, ad: C.AD_CORR, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 900, cnutrit: 250, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_COLD | C.MR_ELEC | C.MR_POISON | C.MR_ACID | C.MR_STONE, mconveys: C.MR_COLD | C.MR_ELEC | C.MR_POISON,
        mflags1: C.M1_BREATHLESS | C.M1_AMORPHOUS | C.M1_NOEYES | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_MINDLESS | C.M1_OMNIVORE | C.M1_ACID,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 12,
        mcolor: C.CLR_BLACK
    },
    {
        mname: "quantum mechanic",
        mlet: C.S_QUANTMECH,
        mlevel: 7, mmove: 12, ac: 3, mr: 10, maligntyp: 0,
        geno: (C.G_GENO | 3),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_TLPT, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 20, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE | C.M1_POIS | C.M1_TPORT,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 9,
        mcolor: C.CLR_CYAN
    },
    {
        mname: "genetic engineer",
        mlet: C.S_QUANTMECH,
        mlevel: 12, mmove: 12, ac: 3, mr: 10, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_POLY, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 20, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE | C.M1_POIS | C.M1_TPORT,
        mflags2: C.M2_HOSTILE | C.M2_NASTY,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 14,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "rust monster",
        mlet: C.S_RUSTMONST,
        mlevel: 5, mmove: 18, ac: 2, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_TUCH, ad: C.AD_RUST, damn: 0, damd: 0 },
            { at: C.AT_TUCH, ad: C.AD_RUST, damn: 0, damd: 0 },
            { at: C.AT_NONE, ad: C.AD_RUST, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1000, cnutrit: 250, msound: C.MS_SILENT, msize: C.MZ_MEDIUM,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_SWIM | C.M1_ANIMAL | C.M1_NOHANDS | C.M1_METALLIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 8,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "disenchanter",
        mlet: C.S_RUSTMONST,
        mlevel: 12, mmove: 12, ac: -10, mr: 0, maligntyp: -3,
        geno: (C.G_HELL | C.G_GENO | 2),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_ENCH, damn: 4, damd: 4 },
            { at: C.AT_NONE, ad: C.AD_ENCH, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 750, cnutrit: 200, msound: C.MS_GROWL, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 14,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "garter snake",
        mlet: C.S_SNAKE,
        mlevel: 1, mmove: 8, ac: 8, mr: 0, maligntyp: 0,
        geno: (C.G_LGROUP | C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 2 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 50, cnutrit: 60, msound: C.MS_HISS, msize: C.MZ_TINY,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_SWIM | C.M1_CONCEAL | C.M1_NOLIMBS | C.M1_ANIMAL | C.M1_SLITHY | C.M1_OVIPAROUS | C.M1_CARNIVORE | C.M1_NOTAKE,
        mflags2: 0,
        mflags3: 0,
        difficulty: 3,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "snake",
        mlet: C.S_SNAKE,
        mlevel: 4, mmove: 15, ac: 3, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_DRST, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 100, cnutrit: 80, msound: C.MS_HISS, msize: C.MZ_SMALL,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_SWIM | C.M1_CONCEAL | C.M1_NOLIMBS | C.M1_ANIMAL | C.M1_SLITHY | C.M1_POIS | C.M1_OVIPAROUS | C.M1_CARNIVORE | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 6,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "water moccasin",
        mlet: C.S_SNAKE,
        mlevel: 4, mmove: 15, ac: 3, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_NOGEN | C.G_LGROUP),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_DRST, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 150, cnutrit: 80, msound: C.MS_HISS, msize: C.MZ_SMALL,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_SWIM | C.M1_CONCEAL | C.M1_NOLIMBS | C.M1_ANIMAL | C.M1_SLITHY | C.M1_POIS | C.M1_CARNIVORE | C.M1_OVIPAROUS | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 7,
        mcolor: C.CLR_RED
    },
    {
        mname: "python",
        mlet: C.S_SNAKE,
        mlevel: 6, mmove: 3, ac: 5, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_TUCH, ad: C.AD_PHYS, damn: 0, damd: 0 },
            { at: C.AT_HUGS, ad: C.AD_WRAP, damn: 1, damd: 4 },
            { at: C.AT_HUGS, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 250, cnutrit: 100, msound: C.MS_HISS, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_SWIM | C.M1_NOLIMBS | C.M1_ANIMAL | C.M1_SLITHY | C.M1_CARNIVORE | C.M1_OVIPAROUS | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG,
        mflags3: C.M3_INFRAVISION,
        difficulty: 8,
        mcolor: C.CLR_MAGENTA
    },
    {
        mname: "pit viper",
        mlet: C.S_SNAKE,
        mlevel: 6, mmove: 15, ac: 2, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_DRST, damn: 1, damd: 4 },
            { at: C.AT_BITE, ad: C.AD_DRST, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 100, cnutrit: 60, msound: C.MS_HISS, msize: C.MZ_MEDIUM,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_SWIM | C.M1_CONCEAL | C.M1_NOLIMBS | C.M1_ANIMAL | C.M1_SLITHY | C.M1_POIS | C.M1_CARNIVORE | C.M1_OVIPAROUS | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISION,
        difficulty: 9,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "cobra",
        mlet: C.S_SNAKE,
        mlevel: 6, mmove: 18, ac: 2, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_DRST, damn: 2, damd: 4 },
            { at: C.AT_SPIT, ad: C.AD_BLND, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 250, cnutrit: 100, msound: C.MS_HISS, msize: C.MZ_MEDIUM,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_SWIM | C.M1_CONCEAL | C.M1_NOLIMBS | C.M1_ANIMAL | C.M1_SLITHY | C.M1_POIS | C.M1_CARNIVORE | C.M1_OVIPAROUS | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 10,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "troll",
        mlet: C.S_TROLL,
        mlevel: 7, mmove: 12, ac: 4, mr: 0, maligntyp: -3,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 2 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 4, damd: 2 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 800, cnutrit: 350, msound: C.MS_GRUNT, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_REGEN | C.M1_CARNIVORE,
        mflags2: C.M2_STRONG | C.M2_STALK | C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 9,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "ice troll",
        mlet: C.S_TROLL,
        mlevel: 9, mmove: 10, ac: 2, mr: 20, maligntyp: -3,
        geno: (C.G_NOHELL | C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_COLD, damn: 2, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1000, cnutrit: 300, msound: C.MS_GRUNT, msize: C.MZ_LARGE,
        mresists: C.MR_COLD, mconveys: C.MR_COLD,
        mflags1: C.M1_HUMANOID | C.M1_REGEN | C.M1_CARNIVORE,
        mflags2: C.M2_STRONG | C.M2_STALK | C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 12,
        mcolor: C.CLR_WHITE
    },
    {
        mname: "rock troll",
        mlet: C.S_TROLL,
        mlevel: 9, mmove: 12, ac: 0, mr: 0, maligntyp: -3,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 3, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1200, cnutrit: 300, msound: C.MS_GRUNT, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_REGEN | C.M1_CARNIVORE,
        mflags2: C.M2_STRONG | C.M2_STALK | C.M2_HOSTILE | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 12,
        mcolor: C.CLR_CYAN
    },
    {
        mname: "water troll",
        mlet: C.S_TROLL,
        mlevel: 11, mmove: 14, ac: 4, mr: 40, maligntyp: -3,
        geno: (C.G_NOGEN | C.G_GENO),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1200, cnutrit: 350, msound: C.MS_GRUNT, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_REGEN | C.M1_CARNIVORE | C.M1_SWIM,
        mflags2: C.M2_STRONG | C.M2_STALK | C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 13,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "Olog-hai",
        mlet: C.S_TROLL,
        mlevel: 13, mmove: 12, ac: -4, mr: 0, maligntyp: -7,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 3, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1500, cnutrit: 400, msound: C.MS_GRUNT, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_REGEN | C.M1_CARNIVORE,
        mflags2: C.M2_STRONG | C.M2_STALK | C.M2_HOSTILE | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 16,
        mcolor: C.HI_LORD
    },
    {
        mname: "umber hulk",
        mlet: C.S_UMBER,
        mlevel: 9, mmove: 6, ac: 2, mr: 25, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 3, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 3, damd: 4 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 5 },
            { at: C.AT_GAZE, ad: C.AD_CONF, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1200, cnutrit: 500, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_TUNNEL | C.M1_CARNIVORE,
        mflags2: C.M2_STRONG,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 12,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "vampire",
        mlet: C.S_VAMPIRE,
        mlevel: 10, mmove: 12, ac: 1, mr: 25, maligntyp: -8,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_DRLI, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_VAMPIRE, msize: C.MZ_HUMAN,
        mresists: C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_BREATHLESS | C.M1_HUMANOID | C.M1_POIS | C.M1_REGEN,
        mflags2: C.M2_UNDEAD | C.M2_STALK | C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_SHAPESHIFTER,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 12,
        mcolor: C.CLR_RED
    },
    {
        mname: "vampire lord",
        mlet: C.S_VAMPIRE,
        mlevel: 12, mmove: 14, ac: 0, mr: 50, maligntyp: -9,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: C.AT_BITE, ad: C.AD_DRLI, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_VAMPIRE, msize: C.MZ_HUMAN,
        mresists: C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_BREATHLESS | C.M1_HUMANOID | C.M1_POIS | C.M1_REGEN,
        mflags2: C.M2_UNDEAD | C.M2_STALK | C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_LORD | C.M2_SHAPESHIFTER,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 14,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "vampire mage",
        mlet: C.S_VAMPIRE,
        mlevel: 20, mmove: 14, ac: -4, mr: 50, maligntyp: -9,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_DRLI, damn: 2, damd: 8 },
            { at: C.AT_BITE, ad: C.AD_DRLI, damn: 1, damd: 8 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_VAMPIRE, msize: C.MZ_HUMAN,
        mresists: C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_BREATHLESS | C.M1_HUMANOID | C.M1_POIS | C.M1_REGEN,
        mflags2: C.M2_UNDEAD | C.M2_STALK | C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_LORD | C.M2_MALE | C.M2_MAGIC | C.M2_SHAPESHIFTER,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 26,
        mcolor: C.HI_ZAP
    },
    {
        mname: "Vlad the Impaler",
        mlet: C.S_VAMPIRE,
        mlevel: 28, mmove: 26, ac: -6, mr: 80, maligntyp: -10,
        geno: (C.G_NOGEN | C.G_NOCORPSE | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 10 },
            { at: C.AT_BITE, ad: C.AD_DRLI, damn: 1, damd: 12 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_VAMPIRE, msize: C.MZ_HUMAN,
        mresists: C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_BREATHLESS | C.M1_HUMANOID | C.M1_POIS | C.M1_REGEN,
        mflags2: C.M2_NOPOLY | C.M2_UNDEAD | C.M2_STALK | C.M2_HOSTILE | C.M2_PNAME | C.M2_STRONG | C.M2_NASTY | C.M2_PRINCE | C.M2_MALE | C.M2_SHAPESHIFTER,
        mflags3: C.M3_WAITFORU | C.M3_WANTSCAND | C.M3_INFRAVISIBLE,
        difficulty: 32,
        mcolor: C.HI_LORD
    },
    {
        mname: "barrow wight",
        mlet: C.S_WRAITH,
        mlevel: 3, mmove: 12, ac: 5, mr: 5, maligntyp: -3,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_DRLI, damn: 0, damd: 0 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 0, damd: 0 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_TUCH, ad: C.AD_COLD, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1200, cnutrit: 0, msound: C.MS_SPELL, msize: C.MZ_HUMAN,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_HUMANOID,
        mflags2: C.M2_UNDEAD | C.M2_STALK | C.M2_HOSTILE | C.M2_COLLECT,
        mflags3: 0,
        difficulty: 8,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "wraith",
        mlet: C.S_WRAITH,
        mlevel: 6, mmove: 12, ac: 4, mr: 15, maligntyp: -6,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_TUCH, ad: C.AD_DRLI, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_ETHEREAL, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_HUMAN,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_FLY | C.M1_HUMANOID | C.M1_UNSOLID,
        mflags2: C.M2_UNDEAD | C.M2_STALK | C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 8,
        mcolor: C.CLR_BLACK
    },
    {
        mname: "Nazgul",
        mlet: C.S_WRAITH,
        mlevel: 13, mmove: 12, ac: 0, mr: 25, maligntyp: -17,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_DRLI, damn: 1, damd: 4 },
            { at: C.AT_BREA, ad: C.AD_SLEE, damn: 2, damd: 25 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 0, msound: C.MS_SPELL, msize: C.MZ_HUMAN,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_HUMANOID | C.M1_SEE_INVIS,
        mflags2: C.M2_NOPOLY | C.M2_UNDEAD | C.M2_STALK | C.M2_STRONG | C.M2_HOSTILE | C.M2_MALE | C.M2_COLLECT,
        mflags3: 0,
        difficulty: 17,
        mcolor: C.HI_LORD
    },
    {
        mname: "xorn",
        mlet: C.S_XORN,
        mlevel: 8, mmove: 9, ac: -2, mr: 20, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 4, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1200, cnutrit: 700, msound: C.MS_ROAR, msize: C.MZ_MEDIUM,
        mresists: C.MR_FIRE | C.MR_COLD | C.MR_STONE, mconveys: C.MR_STONE,
        mflags1: C.M1_BREATHLESS | C.M1_WALLWALK | C.M1_THICK_HIDE | C.M1_METALLIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG,
        mflags3: 0,
        difficulty: 11,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "monkey",
        mlet: C.S_YETI,
        mlevel: 2, mmove: 12, ac: 6, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_SITM, damn: 0, damd: 0 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 100, cnutrit: 50, msound: C.MS_GROWL, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: 0,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 4,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "ape",
        mlet: C.S_YETI,
        mlevel: 4, mmove: 12, ac: 6, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_SGROUP | 2),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1100, cnutrit: 500, msound: C.MS_GROWL, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_STRONG,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 6,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "owlbear",
        mlet: C.S_YETI,
        mlevel: 5, mmove: 12, ac: 5, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 3),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_HUGS, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1700, cnutrit: 700, msound: C.MS_ROAR, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_HUMANOID | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 7,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "yeti",
        mlet: C.S_YETI,
        mlevel: 5, mmove: 15, ac: 6, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1600, cnutrit: 700, msound: C.MS_GROWL, msize: C.MZ_LARGE,
        mresists: C.MR_COLD, mconveys: C.MR_COLD,
        mflags1: C.M1_ANIMAL | C.M1_HUMANOID | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 7,
        mcolor: C.CLR_WHITE
    },
    {
        mname: "carnivorous ape",
        mlet: C.S_YETI,
        mlevel: 6, mmove: 12, ac: 6, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_HUGS, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1250, cnutrit: 550, msound: C.MS_GROWL, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_HUMANOID | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 8,
        mcolor: C.CLR_BLACK
    },
    {
        mname: "sasquatch",
        mlet: C.S_YETI,
        mlevel: 7, mmove: 15, ac: 6, mr: 0, maligntyp: 2,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_KICK, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1550, cnutrit: 750, msound: C.MS_GROWL, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_HUMANOID | C.M1_SEE_INVIS | C.M1_OMNIVORE,
        mflags2: C.M2_STRONG,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 9,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "kobold zombie",
        mlet: C.S_ZOMBIE,
        mlevel: 0, mmove: 6, ac: 10, mr: 0, maligntyp: -2,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 400, cnutrit: 50, msound: C.MS_GROAN, msize: C.MZ_SMALL,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID | C.M1_POIS,
        mflags2: C.M2_UNDEAD | C.M2_STALK | C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISION,
        difficulty: 1,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "gnome zombie",
        mlet: C.S_ZOMBIE,
        mlevel: 1, mmove: 6, ac: 10, mr: 0, maligntyp: -2,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 5 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 650, cnutrit: 50, msound: C.MS_GROAN, msize: C.MZ_SMALL,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID | C.M1_POIS,
        mflags2: C.M2_UNDEAD | C.M2_STALK | C.M2_HOSTILE | C.M2_GNOME,
        mflags3: C.M3_INFRAVISION,
        difficulty: 2,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "orc zombie",
        mlet: C.S_ZOMBIE,
        mlevel: 2, mmove: 6, ac: 9, mr: 0, maligntyp: -3,
        geno: (C.G_GENO | C.G_SGROUP | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 850, cnutrit: 75, msound: C.MS_GROAN, msize: C.MZ_HUMAN,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID | C.M1_POIS,
        mflags2: C.M2_UNDEAD | C.M2_STALK | C.M2_HOSTILE | C.M2_ORC,
        mflags3: C.M3_INFRAVISION,
        difficulty: 3,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "dwarf zombie",
        mlet: C.S_ZOMBIE,
        mlevel: 2, mmove: 6, ac: 9, mr: 0, maligntyp: -3,
        geno: (C.G_GENO | C.G_SGROUP | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 900, cnutrit: 150, msound: C.MS_GROAN, msize: C.MZ_HUMAN,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID | C.M1_POIS,
        mflags2: C.M2_UNDEAD | C.M2_STALK | C.M2_HOSTILE | C.M2_DWARF,
        mflags3: C.M3_INFRAVISION,
        difficulty: 3,
        mcolor: C.CLR_RED
    },
    {
        mname: "elf zombie",
        mlet: C.S_ZOMBIE,
        mlevel: 3, mmove: 6, ac: 9, mr: 0, maligntyp: -3,
        geno: (C.G_GENO | C.G_SGROUP | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 7 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_ELF, cnutrit: 175, msound: C.MS_GROAN, msize: C.MZ_HUMAN,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID,
        mflags2: C.M2_UNDEAD | C.M2_STALK | C.M2_HOSTILE | C.M2_ELF,
        mflags3: C.M3_INFRAVISION,
        difficulty: 4,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "human zombie",
        mlet: C.S_ZOMBIE,
        mlevel: 4, mmove: 6, ac: 8, mr: 0, maligntyp: -3,
        geno: (C.G_GENO | C.G_SGROUP | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 200, msound: C.MS_GROAN, msize: C.MZ_HUMAN,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID,
        mflags2: C.M2_UNDEAD | C.M2_STALK | C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISION,
        difficulty: 5,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "ettin zombie",
        mlet: C.S_ZOMBIE,
        mlevel: 6, mmove: 8, ac: 6, mr: 0, maligntyp: -4,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 10 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 10 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1700, cnutrit: 250, msound: C.MS_GROAN, msize: C.MZ_HUGE,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID,
        mflags2: C.M2_UNDEAD | C.M2_STALK | C.M2_HOSTILE | C.M2_STRONG,
        mflags3: C.M3_INFRAVISION,
        difficulty: 7,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "ghoul",
        mlet: C.S_ZOMBIE,
        mlevel: 3, mmove: 6, ac: 10, mr: 0, maligntyp: -2,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PLYS, damn: 1, damd: 2 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 400, cnutrit: 50, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID | C.M1_POIS | C.M1_OMNIVORE,
        mflags2: C.M2_UNDEAD | C.M2_WANDER | C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISION,
        difficulty: 5,
        mcolor: C.CLR_BLACK
    },
    {
        mname: "giant zombie",
        mlet: C.S_ZOMBIE,
        mlevel: 8, mmove: 8, ac: 6, mr: 0, maligntyp: -4,
        geno: (C.G_GENO | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2050, cnutrit: 375, msound: C.MS_GROAN, msize: C.MZ_HUGE,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID,
        mflags2: C.M2_UNDEAD | C.M2_STALK | C.M2_HOSTILE | C.M2_GIANT | C.M2_STRONG,
        mflags3: C.M3_INFRAVISION,
        difficulty: 9,
        mcolor: C.CLR_CYAN
    },
    {
        mname: "skeleton",
        mlet: C.S_ZOMBIE,
        mlevel: 12, mmove: 8, ac: 4, mr: 0, maligntyp: 0,
        geno: (C.G_NOCORPSE | C.G_NOGEN),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: C.AT_TUCH, ad: C.AD_SLOW, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 300, cnutrit: 5, msound: C.MS_BONES, msize: C.MZ_HUMAN,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID | C.M1_THICK_HIDE,
        mflags2: C.M2_UNDEAD | C.M2_WANDER | C.M2_HOSTILE | C.M2_STRONG | C.M2_COLLECT | C.M2_NASTY,
        mflags3: C.M3_INFRAVISION,
        difficulty: 14,
        mcolor: C.CLR_WHITE
    },
    {
        mname: "straw golem",
        mlet: C.S_GOLEM,
        mlevel: 3, mmove: 12, ac: 10, mr: 0, maligntyp: 0,
        geno: (C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 2 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 2 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 400, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 4,
        mcolor: C.CLR_YELLOW
    },
    {
        mname: "paper golem",
        mlet: C.S_GOLEM,
        mlevel: 3, mmove: 12, ac: 10, mr: 0, maligntyp: 0,
        geno: (C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 400, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 4,
        mcolor: C.HI_PAPER
    },
    {
        mname: "rope golem",
        mlet: C.S_GOLEM,
        mlevel: 4, mmove: 9, ac: 8, mr: 0, maligntyp: 0,
        geno: (C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_HUGS, ad: C.AD_PHYS, damn: 6, damd: 1 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 450, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 6,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "gold golem",
        mlet: C.S_GOLEM,
        mlevel: 5, mmove: 9, ac: 6, mr: 0, maligntyp: 0,
        geno: (C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 3 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 3 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 450, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_SLEEP | C.MR_POISON | C.MR_ACID, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID | C.M1_THICK_HIDE,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 6,
        mcolor: C.HI_GOLD
    },
    {
        mname: "leather golem",
        mlet: C.S_GOLEM,
        mlevel: 6, mmove: 6, ac: 6, mr: 0, maligntyp: 0,
        geno: (C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 800, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 7,
        mcolor: C.HI_LEATHER
    },
    {
        mname: "wood golem",
        mlet: C.S_GOLEM,
        mlevel: 7, mmove: 3, ac: 4, mr: 0, maligntyp: 0,
        geno: (C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 3, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 900, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_COLD | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID | C.M1_THICK_HIDE,
        mflags2: C.M2_HOSTILE | C.M2_NEUTER,
        mflags3: 0,
        difficulty: 8,
        mcolor: C.HI_WOOD
    },
    {
        mname: "flesh golem",
        mlet: C.S_GOLEM,
        mlevel: 9, mmove: 8, ac: 9, mr: 30, maligntyp: 0,
        geno: (1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1400, cnutrit: 600, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_FIRE | C.MR_COLD | C.MR_ELEC | C.MR_SLEEP | C.MR_POISON, mconveys: C.MR_FIRE | C.MR_COLD | C.MR_ELEC | C.MR_SLEEP | C.MR_POISON,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID,
        mflags2: C.M2_HOSTILE | C.M2_STRONG,
        mflags3: 0,
        difficulty: 10,
        mcolor: C.CLR_RED
    },
    {
        mname: "clay golem",
        mlet: C.S_GOLEM,
        mlevel: 11, mmove: 7, ac: 7, mr: 40, maligntyp: 0,
        geno: (C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 3, damd: 10 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1550, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID | C.M1_THICK_HIDE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG,
        mflags3: 0,
        difficulty: 12,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "stone golem",
        mlet: C.S_GOLEM,
        mlevel: 14, mmove: 6, ac: 5, mr: 50, maligntyp: 0,
        geno: (C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 3, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1900, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_SLEEP | C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID | C.M1_THICK_HIDE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG,
        mflags3: 0,
        difficulty: 15,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "glass golem",
        mlet: C.S_GOLEM,
        mlevel: 16, mmove: 6, ac: 1, mr: 50, maligntyp: 0,
        geno: (C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1800, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_SLEEP | C.MR_POISON | C.MR_ACID, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID | C.M1_THICK_HIDE,
        mflags2: C.M2_HOSTILE | C.M2_STRONG,
        mflags3: 0,
        difficulty: 18,
        mcolor: C.CLR_CYAN
    },
    {
        mname: "iron golem",
        mlet: C.S_GOLEM,
        mlevel: 18, mmove: 6, ac: 3, mr: 60, maligntyp: 0,
        geno: (C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 10 },
            { at: C.AT_BREA, ad: C.AD_DRST, damn: 4, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2000, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_FIRE | C.MR_COLD | C.MR_ELEC | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_MINDLESS | C.M1_HUMANOID | C.M1_THICK_HIDE | C.M1_POIS,
        mflags2: C.M2_HOSTILE | C.M2_STRONG | C.M2_COLLECT,
        mflags3: 0,
        difficulty: 22,
        mcolor: C.HI_METAL
    },
    {
        mname: "human",
        mlet: C.S_HUMAN,
        mlevel: 0, mmove: 12, ac: 10, mr: 0, maligntyp: 0,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 2,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "wererat",
        mlet: C.S_HUMAN,
        mlevel: 2, mmove: 12, ac: 10, mr: 10, maligntyp: -7,
        geno: (1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_WERE, msize: C.MZ_HUMAN,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_POIS | C.M1_REGEN | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_WERE | C.M2_HOSTILE | C.M2_HUMAN | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 3,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "werejackal",
        mlet: C.S_HUMAN,
        mlevel: 2, mmove: 12, ac: 10, mr: 10, maligntyp: -7,
        geno: (1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_WERE, msize: C.MZ_HUMAN,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_POIS | C.M1_REGEN | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_WERE | C.M2_HOSTILE | C.M2_HUMAN | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 3,
        mcolor: C.CLR_RED
    },
    {
        mname: "werewolf",
        mlet: C.S_HUMAN,
        mlevel: 5, mmove: 12, ac: 10, mr: 20, maligntyp: -7,
        geno: (1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_WERE, msize: C.MZ_HUMAN,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_POIS | C.M1_REGEN | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_WERE | C.M2_HOSTILE | C.M2_HUMAN | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 6,
        mcolor: C.CLR_ORANGE
    },
    {
        mname: "elf",
        mlet: C.S_HUMAN,
        mlevel: 0, mmove: 12, ac: 10, mr: 2, maligntyp: -3,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_ELF, cnutrit: 350, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: C.MR_SLEEP, mconveys: C.MR_SLEEP,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE | C.M1_SEE_INVIS,
        mflags2: C.M2_NOPOLY | C.M2_ELF | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISION | C.M3_INFRAVISIBLE,
        difficulty: 1,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "Woodland-elf",
        mlet: C.S_HUMAN,
        mlevel: 4, mmove: 12, ac: 10, mr: 10, maligntyp: -5,
        geno: (C.G_GENO | C.G_SGROUP | 2),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_ELF, cnutrit: 350, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: C.MR_SLEEP, mconveys: C.MR_SLEEP,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE | C.M1_SEE_INVIS,
        mflags2: C.M2_ELF | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 6,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "Green-elf",
        mlet: C.S_HUMAN,
        mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: -6,
        geno: (C.G_GENO | C.G_SGROUP | 2),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_ELF, cnutrit: 350, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: C.MR_SLEEP, mconveys: C.MR_SLEEP,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE | C.M1_SEE_INVIS,
        mflags2: C.M2_ELF | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 7,
        mcolor: C.CLR_BRIGHT_GREEN
    },
    {
        mname: "Grey-elf",
        mlet: C.S_HUMAN,
        mlevel: 6, mmove: 12, ac: 10, mr: 10, maligntyp: -7,
        geno: (C.G_GENO | C.G_SGROUP | 2),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_ELF, cnutrit: 350, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: C.MR_SLEEP, mconveys: C.MR_SLEEP,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE | C.M1_SEE_INVIS,
        mflags2: C.M2_ELF | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 8,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "elf-lord",
        mlet: C.S_HUMAN,
        mlevel: 8, mmove: 12, ac: 10, mr: 20, maligntyp: -9,
        geno: (C.G_GENO | C.G_SGROUP | 2),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_ELF, cnutrit: 350, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: C.MR_SLEEP, mconveys: C.MR_SLEEP,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE | C.M1_SEE_INVIS,
        mflags2: C.M2_ELF | C.M2_STRONG | C.M2_LORD | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 11,
        mcolor: C.CLR_BRIGHT_BLUE
    },
    {
        mname: "Elvenking",
        mlet: C.S_HUMAN,
        mlevel: 9, mmove: 12, ac: 10, mr: 25, maligntyp: -10,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_ELF, cnutrit: 350, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: C.MR_SLEEP, mconveys: C.MR_SLEEP,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE | C.M1_SEE_INVIS,
        mflags2: C.M2_ELF | C.M2_STRONG | C.M2_PRINCE | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 11,
        mcolor: C.HI_LORD
    },
    {
        mname: "doppelganger",
        mlet: C.S_HUMAN,
        mlevel: 9, mmove: 12, ac: 5, mr: 20, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 12 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_IMITATE, msize: C.MZ_HUMAN,
        mresists: C.MR_SLEEP, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_HOSTILE | C.M2_STRONG | C.M2_COLLECT | C.M2_SHAPESHIFTER,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 11,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "shopkeeper",
        mlet: C.S_HUMAN,
        mlevel: 12, mmove: 16, ac: 0, mr: 50, maligntyp: 0,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 4 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_SELL, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PEACEFUL | C.M2_STRONG | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 15,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "guard",
        mlet: C.S_HUMAN,
        mlevel: 12, mmove: 12, ac: 10, mr: 40, maligntyp: 10,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 10 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_GUARD, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_MERC | C.M2_PEACEFUL | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 14,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "prisoner",
        mlet: C.S_HUMAN,
        mlevel: 12, mmove: 12, ac: 10, mr: 0, maligntyp: 0,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_DJINNI, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PEACEFUL | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_CLOSE,
        difficulty: 14,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "Oracle",
        mlet: C.S_HUMAN,
        mlevel: 12, mmove: 0, ac: 0, mr: 50, maligntyp: 0,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_NONE, ad: C.AD_MAGM, damn: 0, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_ORACLE, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PEACEFUL | C.M2_FEMALE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 13,
        mcolor: C.HI_ZAP
    },
    {
        mname: "priest",
        mlet: C.S_HUMAN,
        mlevel: 12, mmove: 12, ac: 10, mr: 50, maligntyp: 0,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 10 },
            { at: C.AT_KICK, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_MAGC, ad: C.AD_CLRC, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_PRIEST, msize: C.MZ_HUMAN,
        mresists: C.MR_ELEC, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_LORD | C.M2_PEACEFUL | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 15,
        mcolor: C.CLR_WHITE
    },
    {
        mname: "high priest",
        mlet: C.S_HUMAN,
        mlevel: 25, mmove: 15, ac: 7, mr: 70, maligntyp: 0,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 10 },
            { at: C.AT_KICK, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: C.AT_MAGC, ad: C.AD_CLRC, damn: 2, damd: 8 },
            { at: C.AT_MAGC, ad: C.AD_CLRC, damn: 2, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_PRIEST, msize: C.MZ_HUMAN,
        mresists: C.MR_FIRE | C.MR_ELEC | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_SEE_INVIS | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_MINION | C.M2_PRINCE | C.M2_NASTY | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 30,
        mcolor: C.CLR_WHITE
    },
    {
        mname: "soldier",
        mlet: C.S_HUMAN,
        mlevel: 6, mmove: 10, ac: 10, mr: 0, maligntyp: -2,
        geno: (C.G_SGROUP | C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_SOLDIER, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_MERC | C.M2_STALK | C.M2_HOSTILE | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 8,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "sergeant",
        mlet: C.S_HUMAN,
        mlevel: 8, mmove: 10, ac: 10, mr: 5, maligntyp: -3,
        geno: (C.G_SGROUP | C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_SOLDIER, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_MERC | C.M2_STALK | C.M2_HOSTILE | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 10,
        mcolor: C.CLR_RED
    },
    {
        mname: "nurse",
        mlet: C.S_HUMAN,
        mlevel: 11, mmove: 6, ac: 0, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 3),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_HEAL, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_NURSE, msize: C.MZ_HUMAN,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 13,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "lieutenant",
        mlet: C.S_HUMAN,
        mlevel: 10, mmove: 10, ac: 10, mr: 15, maligntyp: -4,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 3, damd: 4 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 3, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_SOLDIER, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_MERC | C.M2_STALK | C.M2_HOSTILE | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 12,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "captain",
        mlet: C.S_HUMAN,
        mlevel: 12, mmove: 10, ac: 10, mr: 15, maligntyp: -5,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 4 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_SOLDIER, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_MERC | C.M2_STALK | C.M2_HOSTILE | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 14,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "watchman",
        mlet: C.S_HUMAN,
        mlevel: 6, mmove: 10, ac: 10, mr: 0, maligntyp: -2,
        geno: (C.G_SGROUP | C.G_NOGEN | C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_SOLDIER, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_MERC | C.M2_STALK | C.M2_PEACEFUL | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 8,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "watch captain",
        mlet: C.S_HUMAN,
        mlevel: 10, mmove: 10, ac: 10, mr: 15, maligntyp: -4,
        geno: (C.G_NOGEN | C.G_GENO | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 3, damd: 4 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 3, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_SOLDIER, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_MERC | C.M2_STALK | C.M2_PEACEFUL | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 12,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "Medusa",
        mlet: C.S_HUMAN,
        mlevel: 20, mmove: 12, ac: 2, mr: 50, maligntyp: -15,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: C.AT_GAZE, ad: C.AD_STON, damn: 0, damd: 0 },
            { at: C.AT_BITE, ad: C.AD_DRST, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_HISS, msize: C.MZ_LARGE,
        mresists: C.MR_POISON | C.MR_STONE, mconveys: C.MR_POISON | C.MR_STONE,
        mflags1: C.M1_FLY | C.M1_SWIM | C.M1_AMPHIBIOUS | C.M1_HUMANOID | C.M1_POIS | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HOSTILE | C.M2_STRONG | C.M2_PNAME | C.M2_FEMALE,
        mflags3: C.M3_WAITFORU | C.M3_INFRAVISIBLE,
        difficulty: 25,
        mcolor: C.CLR_BRIGHT_GREEN
    },
    {
        mname: "Wizard of Yendor",
        mlet: C.S_HUMAN,
        mlevel: 30, mmove: 12, ac: -8, mr: 100, maligntyp: C.A_NONE,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_SAMU, damn: 2, damd: 12 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_CUSS, msize: C.MZ_HUMAN,
        mresists: C.MR_FIRE | C.MR_POISON, mconveys: C.MR_FIRE | C.MR_POISON,
        mflags1: C.M1_FLY | C.M1_BREATHLESS | C.M1_HUMANOID | C.M1_REGEN | C.M1_SEE_INVIS | C.M1_TPORT | C.M1_TPORT_CNTRL | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_PRINCE | C.M2_MALE | C.M2_MAGIC,
        mflags3: C.M3_COVETOUS | C.M3_WAITFORU | C.M3_INFRAVISIBLE,
        difficulty: 34,
        mcolor: C.HI_OVERLORD
    },
    {
        mname: "Croesus",
        mlet: C.S_HUMAN,
        mlevel: 20, mmove: 15, ac: 0, mr: 40, maligntyp: 15,
        geno: (C.G_UNIQ | C.G_NOGEN),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 10 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_GUARD, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_SEE_INVIS | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_STALK | C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_PNAME | C.M2_PRINCE | C.M2_MALE | C.M2_GREEDY | C.M2_JEWELS | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 22,
        mcolor: C.HI_LORD
    },
    {
        mname: "Charon",
        mlet: C.S_HUMAN,
        mlevel: 76, mmove: 18, ac: -5, mr: 120, maligntyp: 0,
        geno: (C.G_HELL | C.G_NOCORPSE | C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: C.AT_TUCH, ad: C.AD_PLYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_FERRY, msize: C.MZ_HUMAN,
        mresists: C.MR_FIRE | C.MR_COLD | C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_BREATHLESS | C.M1_SEE_INVIS | C.M1_HUMANOID,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PEACEFUL | C.M2_PNAME | C.M2_MALE | C.M2_GREEDY | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 38,
        mcolor: C.CLR_WHITE
    },
    {
        mname: "ghost",
        mlet: C.S_GHOST,
        mlevel: 10, mmove: 3, ac: -5, mr: 50, maligntyp: -5,
        geno: (C.G_NOCORPSE | C.G_NOGEN),
        mattk: [
            { at: C.AT_TUCH, ad: C.AD_PHYS, damn: 1, damd: 1 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 0, msound: C.MS_SILENT, msize: C.MZ_HUMAN,
        mresists: C.MR_COLD | C.MR_DISINT | C.MR_SLEEP | C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_BREATHLESS | C.M1_WALLWALK | C.M1_HUMANOID | C.M1_UNSOLID,
        mflags2: C.M2_NOPOLY | C.M2_UNDEAD | C.M2_STALK | C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISION,
        difficulty: 12,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "shade",
        mlet: C.S_GHOST,
        mlevel: 12, mmove: 10, ac: 10, mr: 0, maligntyp: 0,
        geno: (C.G_NOCORPSE | C.G_NOGEN),
        mattk: [
            { at: C.AT_TUCH, ad: C.AD_PLYS, damn: 2, damd: 6 },
            { at: C.AT_TUCH, ad: C.AD_SLOW, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 0, msound: C.MS_WAIL, msize: C.MZ_HUMAN,
        mresists: C.MR_COLD | C.MR_DISINT | C.MR_SLEEP | C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_BREATHLESS | C.M1_WALLWALK | C.M1_HUMANOID | C.M1_UNSOLID | C.M1_SEE_INVIS,
        mflags2: C.M2_NOPOLY | C.M2_UNDEAD | C.M2_WANDER | C.M2_STALK | C.M2_HOSTILE | C.M2_NASTY,
        mflags3: C.M3_INFRAVISION,
        difficulty: 14,
        mcolor: C.CLR_BLACK
    },
    {
        mname: "water demon",
        mlet: C.S_DEMON,
        mlevel: 8, mmove: 12, ac: -4, mr: 30, maligntyp: -7,
        geno: (C.G_NOCORPSE | C.G_NOGEN),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_DJINNI, msize: C.MZ_HUMAN,
        mresists: C.MR_FIRE | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_POIS | C.M1_SWIM,
        mflags2: C.M2_NOPOLY | C.M2_DEMON | C.M2_STALK | C.M2_HOSTILE | C.M2_NASTY | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 11,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "incubus",
        mlet: C.S_DEMON,
        mlevel: 6, mmove: 12, ac: 0, mr: 70, maligntyp: -9,
        geno: (C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_SSEX, damn: 0, damd: 0 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_SEDUCE, msize: C.MZ_HUMAN,
        mresists: C.MR_FIRE | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_FLY | C.M1_POIS,
        mflags2: C.M2_DEMON | C.M2_STALK | C.M2_HOSTILE | C.M2_NASTY,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 8,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "horned devil",
        mlet: C.S_DEMON,
        mlevel: 6, mmove: 9, ac: -5, mr: 50, maligntyp: 11,
        geno: (C.G_HELL | C.G_NOCORPSE | 2),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 3 },
            { at: C.AT_STNG, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_SILENT, msize: C.MZ_HUMAN,
        mresists: C.MR_FIRE | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_POIS | C.M1_THICK_HIDE,
        mflags2: C.M2_DEMON | C.M2_STALK | C.M2_HOSTILE | C.M2_NASTY,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 9,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "barbed devil",
        mlet: C.S_DEMON,
        mlevel: 8, mmove: 12, ac: 0, mr: 35, maligntyp: 8,
        geno: (C.G_HELL | C.G_NOCORPSE | C.G_SGROUP | 2),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_STCK, damn: 2, damd: 4 },
            { at: C.AT_STNG, ad: C.AD_PHYS, damn: 3, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_SILENT, msize: C.MZ_HUMAN,
        mresists: C.MR_FIRE | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_POIS | C.M1_THICK_HIDE,
        mflags2: C.M2_DEMON | C.M2_STALK | C.M2_HOSTILE | C.M2_NASTY,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 11,
        mcolor: C.CLR_RED
    },
    {
        mname: "marilith",
        mlet: C.S_DEMON,
        mlevel: 7, mmove: 12, ac: -6, mr: 80, maligntyp: -12,
        geno: (C.G_HELL | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 4 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_CUSS, msize: C.MZ_LARGE,
        mresists: C.MR_FIRE | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_SLITHY | C.M1_SEE_INVIS | C.M1_POIS,
        mflags2: C.M2_DEMON | C.M2_STALK | C.M2_HOSTILE | C.M2_NASTY | C.M2_FEMALE | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 11,
        mcolor: C.CLR_RED
    },
    {
        mname: "vrock",
        mlet: C.S_DEMON,
        mlevel: 8, mmove: 12, ac: 0, mr: 50, maligntyp: -9,
        geno: (C.G_HELL | C.G_NOCORPSE | C.G_SGROUP | 2),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_FIRE | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_POIS,
        mflags2: C.M2_DEMON | C.M2_STALK | C.M2_HOSTILE | C.M2_NASTY,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 11,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "hezrou",
        mlet: C.S_DEMON,
        mlevel: 9, mmove: 6, ac: -2, mr: 55, maligntyp: -10,
        geno: (C.G_HELL | C.G_NOCORPSE | C.G_SGROUP | 2),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 4, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_FIRE | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_POIS,
        mflags2: C.M2_DEMON | C.M2_STALK | C.M2_HOSTILE | C.M2_NASTY,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 12,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "bone devil",
        mlet: C.S_DEMON,
        mlevel: 9, mmove: 15, ac: -1, mr: 40, maligntyp: -9,
        geno: (C.G_HELL | C.G_NOCORPSE | C.G_SGROUP | 2),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 3, damd: 4 },
            { at: C.AT_STNG, ad: C.AD_DRST, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_FIRE | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_POIS,
        mflags2: C.M2_DEMON | C.M2_STALK | C.M2_HOSTILE | C.M2_NASTY | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 13,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "ice devil",
        mlet: C.S_DEMON,
        mlevel: 11, mmove: 6, ac: -4, mr: 55, maligntyp: -12,
        geno: (C.G_HELL | C.G_NOCORPSE | 2),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_STNG, ad: C.AD_COLD, damn: 3, damd: 4 },
            { at: C.AT_TUCH, ad: C.AD_SLOW, damn: 1, damd: 1 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_FIRE | C.MR_COLD | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_SEE_INVIS | C.M1_POIS,
        mflags2: C.M2_DEMON | C.M2_STALK | C.M2_HOSTILE | C.M2_NASTY,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 15,
        mcolor: C.CLR_WHITE
    },
    {
        mname: "nalfeshnee",
        mlet: C.S_DEMON,
        mlevel: 11, mmove: 9, ac: -1, mr: 65, maligntyp: -11,
        geno: (C.G_HELL | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_SPELL, msize: C.MZ_LARGE,
        mresists: C.MR_FIRE | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_POIS,
        mflags2: C.M2_DEMON | C.M2_STALK | C.M2_HOSTILE | C.M2_NASTY,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 15,
        mcolor: C.CLR_RED
    },
    {
        mname: "pit fiend",
        mlet: C.S_DEMON,
        mlevel: 13, mmove: 6, ac: -3, mr: 65, maligntyp: -13,
        geno: (C.G_HELL | C.G_NOCORPSE | 2),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 2 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 2 },
            { at: C.AT_HUGS, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_GROWL, msize: C.MZ_LARGE,
        mresists: C.MR_FIRE | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_SEE_INVIS | C.M1_POIS,
        mflags2: C.M2_DEMON | C.M2_STALK | C.M2_HOSTILE | C.M2_NASTY | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 16,
        mcolor: C.CLR_RED
    },
    {
        mname: "sandestin",
        mlet: C.S_DEMON,
        mlevel: 13, mmove: 12, ac: 4, mr: 60, maligntyp: -5,
        geno: (C.G_HELL | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1500, cnutrit: 400, msound: C.MS_CUSS, msize: C.MZ_HUMAN,
        mresists: C.MR_STONE, mconveys: 0,
        mflags1: C.M1_HUMANOID,
        mflags2: C.M2_NOPOLY | C.M2_STALK | C.M2_STRONG | C.M2_COLLECT | C.M2_SHAPESHIFTER,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 15,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "balrog",
        mlet: C.S_DEMON,
        mlevel: 16, mmove: 5, ac: -2, mr: 75, maligntyp: -14,
        geno: (C.G_HELL | C.G_NOCORPSE | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 8, damd: 4 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: C.MR_FIRE | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_SEE_INVIS | C.M1_POIS,
        mflags2: C.M2_DEMON | C.M2_STALK | C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 20,
        mcolor: C.CLR_RED
    },
    {
        mname: "Juiblex",
        mlet: C.S_DEMON,
        mlevel: 50, mmove: 3, ac: -7, mr: 65, maligntyp: -15,
        geno: (C.G_HELL | C.G_NOCORPSE | C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_ENGL, ad: C.AD_DISE, damn: 4, damd: 10 },
            { at: C.AT_SPIT, ad: C.AD_ACID, damn: 3, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1500, cnutrit: 0, msound: C.MS_GURGLE, msize: C.MZ_LARGE,
        mresists: C.MR_FIRE | C.MR_POISON | C.MR_ACID | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_AMPHIBIOUS | C.M1_AMORPHOUS | C.M1_NOHEAD | C.M1_FLY | C.M1_SEE_INVIS | C.M1_ACID | C.M1_POIS,
        mflags2: C.M2_NOPOLY | C.M2_DEMON | C.M2_STALK | C.M2_HOSTILE | C.M2_PNAME | C.M2_NASTY | C.M2_LORD | C.M2_MALE,
        mflags3: C.M3_WAITFORU | C.M3_WANTSAMUL | C.M3_INFRAVISION,
        difficulty: 26,
        mcolor: C.CLR_BRIGHT_GREEN
    },
    {
        mname: "Yeenoghu",
        mlet: C.S_DEMON,
        mlevel: 56, mmove: 18, ac: -5, mr: 80, maligntyp: -15,
        geno: (C.G_HELL | C.G_NOCORPSE | C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 3, damd: 6 },
            { at: C.AT_WEAP, ad: C.AD_CONF, damn: 2, damd: 8 },
            { at: C.AT_CLAW, ad: C.AD_PLYS, damn: 1, damd: 6 },
            { at: C.AT_MAGC, ad: C.AD_MAGM, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 900, cnutrit: 500, msound: C.MS_ORC, msize: C.MZ_LARGE,
        mresists: C.MR_FIRE | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_SEE_INVIS | C.M1_POIS,
        mflags2: C.M2_NOPOLY | C.M2_DEMON | C.M2_STALK | C.M2_HOSTILE | C.M2_PNAME | C.M2_NASTY | C.M2_LORD | C.M2_MALE | C.M2_COLLECT,
        mflags3: C.M3_WANTSAMUL | C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 31,
        mcolor: C.HI_LORD
    },
    {
        mname: "Orcus",
        mlet: C.S_DEMON,
        mlevel: 66, mmove: 9, ac: -6, mr: 85, maligntyp: -20,
        geno: (C.G_HELL | C.G_NOCORPSE | C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 3, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 3, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 3, damd: 4 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 8, damd: 6 },
            { at: C.AT_STNG, ad: C.AD_DRST, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1500, cnutrit: 500, msound: C.MS_ORC, msize: C.MZ_HUGE,
        mresists: C.MR_FIRE | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_SEE_INVIS | C.M1_POIS,
        mflags2: C.M2_NOPOLY | C.M2_DEMON | C.M2_STALK | C.M2_HOSTILE | C.M2_PNAME | C.M2_NASTY | C.M2_PRINCE | C.M2_MALE | C.M2_COLLECT,
        mflags3: C.M3_WAITFORU | C.M3_WANTSBOOK | C.M3_WANTSAMUL | C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 36,
        mcolor: C.HI_LORD
    },
    {
        mname: "Geryon",
        mlet: C.S_DEMON,
        mlevel: 72, mmove: 3, ac: -3, mr: 75, maligntyp: 15,
        geno: (C.G_HELL | C.G_NOCORPSE | C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 3, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 3, damd: 6 },
            { at: C.AT_STNG, ad: C.AD_DRST, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1500, cnutrit: 500, msound: C.MS_BRIBE, msize: C.MZ_HUGE,
        mresists: C.MR_FIRE | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_SEE_INVIS | C.M1_POIS | C.M1_SLITHY,
        mflags2: C.M2_NOPOLY | C.M2_DEMON | C.M2_STALK | C.M2_HOSTILE | C.M2_PNAME | C.M2_NASTY | C.M2_PRINCE | C.M2_MALE,
        mflags3: C.M3_WANTSAMUL | C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 36,
        mcolor: C.HI_LORD
    },
    {
        mname: "Dispater",
        mlet: C.S_DEMON,
        mlevel: 78, mmove: 15, ac: -2, mr: 80, maligntyp: 15,
        geno: (C.G_HELL | C.G_NOCORPSE | C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 6 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 6, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1500, cnutrit: 500, msound: C.MS_BRIBE, msize: C.MZ_HUMAN,
        mresists: C.MR_FIRE | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_SEE_INVIS | C.M1_POIS | C.M1_HUMANOID,
        mflags2: C.M2_NOPOLY | C.M2_DEMON | C.M2_STALK | C.M2_HOSTILE | C.M2_PNAME | C.M2_NASTY | C.M2_PRINCE | C.M2_MALE | C.M2_COLLECT,
        mflags3: C.M3_WANTSAMUL | C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 40,
        mcolor: C.HI_LORD
    },
    {
        mname: "Baalzebub",
        mlet: C.S_DEMON,
        mlevel: 89, mmove: 9, ac: -5, mr: 85, maligntyp: 20,
        geno: (C.G_HELL | C.G_NOCORPSE | C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_DRST, damn: 2, damd: 6 },
            { at: C.AT_GAZE, ad: C.AD_STUN, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1500, cnutrit: 500, msound: C.MS_BRIBE, msize: C.MZ_LARGE,
        mresists: C.MR_FIRE | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_SEE_INVIS | C.M1_POIS,
        mflags2: C.M2_NOPOLY | C.M2_DEMON | C.M2_STALK | C.M2_HOSTILE | C.M2_PNAME | C.M2_NASTY | C.M2_PRINCE | C.M2_MALE,
        mflags3: C.M3_WANTSAMUL | C.M3_WAITFORU | C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 45,
        mcolor: C.HI_LORD
    },
    {
        mname: "Asmodeus",
        mlet: C.S_DEMON,
        mlevel: 105, mmove: 12, ac: -7, mr: 90, maligntyp: 20,
        geno: (C.G_HELL | C.G_NOCORPSE | C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 4, damd: 4 },
            { at: C.AT_MAGC, ad: C.AD_COLD, damn: 6, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1500, cnutrit: 500, msound: C.MS_BRIBE, msize: C.MZ_HUGE,
        mresists: C.MR_FIRE | C.MR_COLD | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_SEE_INVIS | C.M1_HUMANOID | C.M1_POIS,
        mflags2: C.M2_NOPOLY | C.M2_DEMON | C.M2_STALK | C.M2_HOSTILE | C.M2_PNAME | C.M2_STRONG | C.M2_NASTY | C.M2_PRINCE | C.M2_MALE,
        mflags3: C.M3_WANTSAMUL | C.M3_WAITFORU | C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 53,
        mcolor: C.HI_LORD
    },
    {
        mname: "Demogorgon",
        mlet: C.S_DEMON,
        mlevel: 106, mmove: 15, ac: -8, mr: 95, maligntyp: -20,
        geno: (C.G_HELL | C.G_NOCORPSE | C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 8, damd: 6 },
            { at: C.AT_STNG, ad: C.AD_DRLI, damn: 1, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_DISE, damn: 1, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_DISE, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1500, cnutrit: 500, msound: C.MS_GROWL, msize: C.MZ_HUGE,
        mresists: C.MR_FIRE | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_SEE_INVIS | C.M1_NOHANDS | C.M1_POIS,
        mflags2: C.M2_NOPOLY | C.M2_DEMON | C.M2_STALK | C.M2_HOSTILE | C.M2_PNAME | C.M2_NASTY | C.M2_PRINCE | C.M2_MALE,
        mflags3: C.M3_WANTSAMUL | C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 57,
        mcolor: C.HI_LORD
    },
    {
        mname: "Death",
        mlet: C.S_DEMON,
        mlevel: 30, mmove: 12, ac: -5, mr: 100, maligntyp: 0,
        geno: (C.G_UNIQ | C.G_NOGEN),
        mattk: [
            { at: C.AT_TUCH, ad: C.AD_DETH, damn: 8, damd: 8 },
            { at: C.AT_TUCH, ad: C.AD_DETH, damn: 8, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 1, msound: C.MS_RIDER, msize: C.MZ_HUMAN,
        mresists: C.MR_FIRE | C.MR_COLD | C.MR_ELEC | C.MR_SLEEP | C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_HUMANOID | C.M1_REGEN | C.M1_SEE_INVIS | C.M1_TPORT_CNTRL,
        mflags2: C.M2_NOPOLY | C.M2_STALK | C.M2_HOSTILE | C.M2_PNAME | C.M2_STRONG | C.M2_NASTY,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION | C.M3_DISPLACES,
        difficulty: 34,
        mcolor: C.HI_OVERLORD
    },
    {
        mname: "Pestilence",
        mlet: C.S_DEMON,
        mlevel: 30, mmove: 12, ac: -5, mr: 100, maligntyp: 0,
        geno: (C.G_UNIQ | C.G_NOGEN),
        mattk: [
            { at: C.AT_TUCH, ad: C.AD_PEST, damn: 8, damd: 8 },
            { at: C.AT_TUCH, ad: C.AD_PEST, damn: 8, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 1, msound: C.MS_RIDER, msize: C.MZ_HUMAN,
        mresists: C.MR_FIRE | C.MR_COLD | C.MR_ELEC | C.MR_SLEEP | C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_HUMANOID | C.M1_REGEN | C.M1_SEE_INVIS | C.M1_TPORT_CNTRL,
        mflags2: C.M2_NOPOLY | C.M2_STALK | C.M2_HOSTILE | C.M2_PNAME | C.M2_STRONG | C.M2_NASTY,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION | C.M3_DISPLACES,
        difficulty: 34,
        mcolor: C.HI_OVERLORD
    },
    {
        mname: "Famine",
        mlet: C.S_DEMON,
        mlevel: 30, mmove: 12, ac: -5, mr: 100, maligntyp: 0,
        geno: (C.G_UNIQ | C.G_NOGEN),
        mattk: [
            { at: C.AT_TUCH, ad: C.AD_FAMN, damn: 8, damd: 8 },
            { at: C.AT_TUCH, ad: C.AD_FAMN, damn: 8, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 1, msound: C.MS_RIDER, msize: C.MZ_HUMAN,
        mresists: C.MR_FIRE | C.MR_COLD | C.MR_ELEC | C.MR_SLEEP | C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_HUMANOID | C.M1_REGEN | C.M1_SEE_INVIS | C.M1_TPORT_CNTRL,
        mflags2: C.M2_NOPOLY | C.M2_STALK | C.M2_HOSTILE | C.M2_PNAME | C.M2_STRONG | C.M2_NASTY,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION | C.M3_DISPLACES,
        difficulty: 34,
        mcolor: C.HI_OVERLORD
    },
    {
        mname: "mail daemon",
        mlet: C.S_DEMON,
        mlevel: 56, mmove: 24, ac: 10, mr: 127, maligntyp: 0,
        geno: (C.G_NOGEN | C.G_NOCORPSE),
        mattk: [
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 600, cnutrit: 300, msound: C.MS_SILENT, msize: C.MZ_HUMAN,
        mresists: C.MR_FIRE | C.MR_COLD | C.MR_ELEC | C.MR_SLEEP | C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_SWIM | C.M1_BREATHLESS | C.M1_SEE_INVIS | C.M1_HUMANOID | C.M1_POIS,
        mflags2: C.M2_NOPOLY | C.M2_STALK | C.M2_PEACEFUL,
        mflags3: C.M3_INFRAVISIBLE | C.M3_INFRAVISION,
        difficulty: 26,
        mcolor: C.CLR_BRIGHT_BLUE
    },
    {
        mname: "djinni",
        mlet: C.S_DEMON,
        mlevel: 7, mmove: 12, ac: 4, mr: 30, maligntyp: 0,
        geno: (C.G_NOGEN | C.G_NOCORPSE),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1500, cnutrit: 400, msound: C.MS_DJINNI, msize: C.MZ_HUMAN,
        mresists: C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_FLY | C.M1_POIS,
        mflags2: C.M2_NOPOLY | C.M2_STALK | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 8,
        mcolor: C.CLR_YELLOW
    },
    {
        mname: "jellyfish",
        mlet: C.S_EEL,
        mlevel: 3, mmove: 3, ac: 6, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_NOGEN),
        mattk: [
            { at: C.AT_STNG, ad: C.AD_DRST, damn: 3, damd: 3 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 80, cnutrit: 20, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: C.MR_POISON, mconveys: C.MR_POISON,
        mflags1: C.M1_SWIM | C.M1_AMPHIBIOUS | C.M1_NOLIMBS | C.M1_NOHEAD | C.M1_NOTAKE | C.M1_POIS,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 5,
        mcolor: C.CLR_BLUE
    },
    {
        mname: "piranha",
        mlet: C.S_EEL,
        mlevel: 5, mmove: 18, ac: 4, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_NOGEN | C.G_SGROUP),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 60, cnutrit: 30, msound: C.MS_SILENT, msize: C.MZ_SMALL,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_SWIM | C.M1_AMPHIBIOUS | C.M1_ANIMAL | C.M1_NOLIMBS | C.M1_CARNIVORE | C.M1_OVIPAROUS | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 7,
        mcolor: C.CLR_RED
    },
    {
        mname: "shark",
        mlet: C.S_EEL,
        mlevel: 7, mmove: 12, ac: 2, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_NOGEN),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 5, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 500, cnutrit: 350, msound: C.MS_SILENT, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_SWIM | C.M1_AMPHIBIOUS | C.M1_ANIMAL | C.M1_NOLIMBS | C.M1_CARNIVORE | C.M1_OVIPAROUS | C.M1_THICK_HIDE | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 9,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "giant eel",
        mlet: C.S_EEL,
        mlevel: 5, mmove: 9, ac: -1, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_NOGEN),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 3, damd: 6 },
            { at: C.AT_TUCH, ad: C.AD_WRAP, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 200, cnutrit: 250, msound: C.MS_SILENT, msize: C.MZ_HUGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_SWIM | C.M1_AMPHIBIOUS | C.M1_ANIMAL | C.M1_SLITHY | C.M1_NOLIMBS | C.M1_CARNIVORE | C.M1_OVIPAROUS | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 7,
        mcolor: C.CLR_CYAN
    },
    {
        mname: "electric eel",
        mlet: C.S_EEL,
        mlevel: 7, mmove: 10, ac: -3, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | C.G_NOGEN),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_ELEC, damn: 4, damd: 6 },
            { at: C.AT_TUCH, ad: C.AD_WRAP, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 200, cnutrit: 250, msound: C.MS_SILENT, msize: C.MZ_HUGE,
        mresists: C.MR_ELEC, mconveys: C.MR_ELEC,
        mflags1: C.M1_SWIM | C.M1_AMPHIBIOUS | C.M1_ANIMAL | C.M1_SLITHY | C.M1_NOLIMBS | C.M1_CARNIVORE | C.M1_OVIPAROUS | C.M1_NOTAKE,
        mflags2: C.M2_HOSTILE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 10,
        mcolor: C.CLR_BRIGHT_BLUE
    },
    {
        mname: "kraken",
        mlet: C.S_EEL,
        mlevel: 20, mmove: 3, ac: 6, mr: 0, maligntyp: -3,
        geno: (C.G_GENO | C.G_NOGEN),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_HUGS, ad: C.AD_WRAP, damn: 2, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 5, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1800, cnutrit: 1000, msound: C.MS_SILENT, msize: C.MZ_HUGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_SWIM | C.M1_AMPHIBIOUS | C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HOSTILE | C.M2_STRONG,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 22,
        mcolor: C.CLR_RED
    },
    {
        mname: "newt",
        mlet: C.S_LIZARD,
        mlevel: 0, mmove: 6, ac: 8, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 5),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 2 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 10, cnutrit: 20, msound: C.MS_SILENT, msize: C.MZ_TINY,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_SWIM | C.M1_AMPHIBIOUS | C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 1,
        mcolor: C.CLR_YELLOW
    },
    {
        mname: "gecko",
        mlet: C.S_LIZARD,
        mlevel: 1, mmove: 6, ac: 8, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 5),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 3 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 10, cnutrit: 20, msound: C.MS_SQEEK, msize: C.MZ_TINY,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 2,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "iguana",
        mlet: C.S_LIZARD,
        mlevel: 2, mmove: 6, ac: 7, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 5),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 30, cnutrit: 30, msound: C.MS_SILENT, msize: C.MZ_TINY,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 3,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "baby crocodile",
        mlet: C.S_LIZARD,
        mlevel: 3, mmove: 6, ac: 7, mr: 0, maligntyp: 0,
        geno: C.G_GENO,
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 200, cnutrit: 200, msound: C.MS_CHIRP, msize: C.MZ_MEDIUM,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_SWIM | C.M1_AMPHIBIOUS | C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 4,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "lizard",
        mlet: C.S_LIZARD,
        mlevel: 5, mmove: 6, ac: 6, mr: 10, maligntyp: 0,
        geno: (C.G_GENO | 5),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 10, cnutrit: 40, msound: C.MS_SILENT, msize: C.MZ_TINY,
        mresists: C.MR_STONE, mconveys: C.MR_STONE,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 6,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "chameleon",
        mlet: C.S_LIZARD,
        mlevel: 6, mmove: 5, ac: 6, mr: 10, maligntyp: 0,
        geno: (C.G_GENO | 2),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 4, damd: 2 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 100, cnutrit: 100, msound: C.MS_SILENT, msize: C.MZ_TINY,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_CARNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HOSTILE | C.M2_SHAPESHIFTER,
        mflags3: 0,
        difficulty: 7,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "crocodile",
        mlet: C.S_LIZARD,
        mlevel: 6, mmove: 9, ac: 5, mr: 0, maligntyp: 0,
        geno: (C.G_GENO | 1),
        mattk: [
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 4, damd: 2 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 12 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_BELLOW, msize: C.MZ_LARGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_SWIM | C.M1_AMPHIBIOUS | C.M1_ANIMAL | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_OVIPAROUS | C.M1_CARNIVORE,
        mflags2: C.M2_STRONG | C.M2_HOSTILE,
        mflags3: 0,
        difficulty: 7,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "salamander",
        mlet: C.S_LIZARD,
        mlevel: 8, mmove: 12, ac: -1, mr: 0, maligntyp: -9,
        geno: (C.G_HELL | 1),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: C.AT_TUCH, ad: C.AD_FIRE, damn: 1, damd: 6 },
            { at: C.AT_HUGS, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: C.AT_HUGS, ad: C.AD_FIRE, damn: 3, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1500, cnutrit: 400, msound: C.MS_MUMBLE, msize: C.MZ_HUMAN,
        mresists: C.MR_SLEEP | C.MR_FIRE, mconveys: C.MR_FIRE,
        mflags1: C.M1_HUMANOID | C.M1_SLITHY | C.M1_THICK_HIDE | C.M1_POIS,
        mflags2: C.M2_STALK | C.M2_HOSTILE | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 12,
        mcolor: C.CLR_ORANGE
    },
    {
        mname: "long worm tail",
        mlet: C.S_WORM_TAIL,
        mlevel: 0, mmove: 0, ac: 0, mr: 0, maligntyp: 0,
        geno: (C.G_NOGEN | C.G_NOCORPSE | C.G_UNIQ),
        mattk: [
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 0, cnutrit: 0, msound: 0, msize: 0,
        mresists: 0, mconveys: 0,
        mflags1: 0,
        mflags2: C.M2_NOPOLY,
        mflags3: 0,
        difficulty: 1,
        mcolor: C.CLR_BROWN
    },
    {
        mname: "archeologist",
        mlet: C.S_HUMAN,
        mlevel: 10, mmove: 12, ac: 10, mr: 1, maligntyp: 3,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_TUNNEL | C.M1_NEEDPICK | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 12,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "barbarian",
        mlet: C.S_HUMAN,
        mlevel: 10, mmove: 12, ac: 10, mr: 1, maligntyp: 0,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 12,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "caveman",
        mlet: C.S_HUMAN,
        mlevel: 10, mmove: 12, ac: 10, mr: 0, maligntyp: 1,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 12,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "healer",
        mlet: C.S_HUMAN,
        mlevel: 10, mmove: 12, ac: 10, mr: 1, maligntyp: 0,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 12,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "knight",
        mlet: C.S_HUMAN,
        mlevel: 10, mmove: 12, ac: 10, mr: 1, maligntyp: 3,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 12,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "monk",
        mlet: C.S_HUMAN,
        mlevel: 10, mmove: 12, ac: 10, mr: 2, maligntyp: 0,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: C.AT_KICK, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_HERBIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 11,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "priest",
        mlet: C.S_HUMAN,
        mlevel: 10, mmove: 12, ac: 10, mr: 2, maligntyp: 0,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_MAGC, ad: C.AD_CLRC, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 12,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "ranger",
        mlet: C.S_HUMAN,
        mlevel: 10, mmove: 12, ac: 10, mr: 2, maligntyp: -3,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 12,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "rogue",
        mlet: C.S_HUMAN,
        mlevel: 10, mmove: 12, ac: 10, mr: 1, maligntyp: -3,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_STRONG | C.M2_GREEDY | C.M2_JEWELS | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 12,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "samurai",
        mlet: C.S_HUMAN,
        mlevel: 10, mmove: 12, ac: 10, mr: 1, maligntyp: 3,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 12,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "tourist",
        mlet: C.S_HUMAN,
        mlevel: 10, mmove: 12, ac: 10, mr: 1, maligntyp: 0,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 12,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "valkyrie",
        mlet: C.S_HUMAN,
        mlevel: 10, mmove: 12, ac: 10, mr: 1, maligntyp: 1,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: C.MR_COLD, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_STRONG | C.M2_FEMALE | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 12,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "wizard",
        mlet: C.S_HUMAN,
        mlevel: 10, mmove: 12, ac: 10, mr: 3, maligntyp: 0,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_STRONG | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 12,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "Lord Carnarvon",
        mlet: C.S_HUMAN,
        mlevel: 20, mmove: 15, ac: 0, mr: 90, maligntyp: 20,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 10 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 4, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_LEADER, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_TUNNEL | C.M1_NEEDPICK | C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PNAME | C.M2_PEACEFUL | C.M2_STRONG | C.M2_MALE | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_CLOSE | C.M3_INFRAVISIBLE,
        difficulty: 24,
        mcolor: C.HI_LORD
    },
    {
        mname: "Pelias",
        mlet: C.S_HUMAN,
        mlevel: 20, mmove: 15, ac: 0, mr: 90, maligntyp: 0,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 10 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 10 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_LEADER, msize: C.MZ_HUMAN,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PNAME | C.M2_PEACEFUL | C.M2_STRONG | C.M2_MALE | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_CLOSE | C.M3_INFRAVISIBLE,
        difficulty: 24,
        mcolor: C.HI_LORD
    },
    {
        mname: "Shaman Karnov",
        mlet: C.S_HUMAN,
        mlevel: 20, mmove: 15, ac: 0, mr: 90, maligntyp: 20,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 10 },
            { at: C.AT_MAGC, ad: C.AD_CLRC, damn: 2, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_LEADER, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PNAME | C.M2_PEACEFUL | C.M2_STRONG | C.M2_MALE | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_CLOSE | C.M3_INFRAVISIBLE,
        difficulty: 24,
        mcolor: C.HI_LORD
    },
    {
        mname: "Earendil",
        mlet: C.S_HUMAN,
        mlevel: 20, mmove: 12, ac: 0, mr: 50, maligntyp: -20,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_ELF, cnutrit: 350, msound: C.MS_LEADER, msize: C.MZ_HUMAN,
        mresists: C.MR_SLEEP, mconveys: C.MR_SLEEP,
        mflags1: C.M1_HUMANOID | C.M1_SEE_INVIS | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_ELF | C.M2_HUMAN | C.M2_PNAME | C.M2_PEACEFUL | C.M2_STRONG | C.M2_MALE | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_CLOSE | C.M3_INFRAVISION | C.M3_INFRAVISIBLE,
        difficulty: 22,
        mcolor: C.HI_LORD
    },
    {
        mname: "Elwing",
        mlet: C.S_HUMAN,
        mlevel: 20, mmove: 12, ac: 0, mr: 50, maligntyp: -20,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_ELF, cnutrit: 350, msound: C.MS_LEADER, msize: C.MZ_HUMAN,
        mresists: C.MR_SLEEP, mconveys: C.MR_SLEEP,
        mflags1: C.M1_HUMANOID | C.M1_SEE_INVIS | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_ELF | C.M2_HUMAN | C.M2_PNAME | C.M2_PEACEFUL | C.M2_STRONG | C.M2_FEMALE | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_CLOSE | C.M3_INFRAVISION | C.M3_INFRAVISIBLE,
        difficulty: 22,
        mcolor: C.HI_LORD
    },
    {
        mname: "Hippocrates",
        mlet: C.S_HUMAN,
        mlevel: 20, mmove: 15, ac: 0, mr: 90, maligntyp: 0,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_MAGC, ad: C.AD_CLRC, damn: 3, damd: 8 },
            { at: C.AT_MAGC, ad: C.AD_CLRC, damn: 3, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_LEADER, msize: C.MZ_HUMAN,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PNAME | C.M2_PEACEFUL | C.M2_STRONG | C.M2_MALE | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_CLOSE | C.M3_INFRAVISIBLE,
        difficulty: 26,
        mcolor: C.HI_LORD
    },
    {
        mname: "King Arthur",
        mlet: C.S_HUMAN,
        mlevel: 20, mmove: 15, ac: 0, mr: 90, maligntyp: 20,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 10 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 10 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_LEADER, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PNAME | C.M2_PEACEFUL | C.M2_STRONG | C.M2_MALE | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_CLOSE | C.M3_INFRAVISIBLE,
        difficulty: 24,
        mcolor: C.HI_LORD
    },
    {
        mname: "Grand Master",
        mlet: C.S_HUMAN,
        mlevel: 25, mmove: 15, ac: 0, mr: 90, maligntyp: 0,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 4, damd: 10 },
            { at: C.AT_KICK, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: C.AT_MAGC, ad: C.AD_CLRC, damn: 2, damd: 8 },
            { at: C.AT_MAGC, ad: C.AD_CLRC, damn: 2, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_LEADER, msize: C.MZ_HUMAN,
        mresists: C.MR_FIRE | C.MR_ELEC | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_SEE_INVIS | C.M1_HERBIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PEACEFUL | C.M2_STRONG | C.M2_MALE | C.M2_NASTY | C.M2_MAGIC,
        mflags3: C.M3_CLOSE | C.M3_INFRAVISIBLE,
        difficulty: 30,
        mcolor: C.CLR_BLACK
    },
    {
        mname: "Arch Priest",
        mlet: C.S_HUMAN,
        mlevel: 25, mmove: 15, ac: 7, mr: 90, maligntyp: 0,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 10 },
            { at: C.AT_KICK, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: C.AT_MAGC, ad: C.AD_CLRC, damn: 2, damd: 8 },
            { at: C.AT_MAGC, ad: C.AD_CLRC, damn: 2, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_LEADER, msize: C.MZ_HUMAN,
        mresists: C.MR_FIRE | C.MR_ELEC | C.MR_SLEEP | C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_SEE_INVIS | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PEACEFUL | C.M2_STRONG | C.M2_MALE | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_CLOSE | C.M3_INFRAVISIBLE,
        difficulty: 30,
        mcolor: C.CLR_WHITE
    },
    {
        mname: "Orion",
        mlet: C.S_HUMAN,
        mlevel: 20, mmove: 15, ac: 0, mr: 90, maligntyp: 0,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 10 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 4, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2200, cnutrit: 700, msound: C.MS_LEADER, msize: C.MZ_HUGE,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE | C.M1_SEE_INVIS | C.M1_SWIM | C.M1_AMPHIBIOUS,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PNAME | C.M2_PEACEFUL | C.M2_STRONG | C.M2_MALE | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_CLOSE | C.M3_INFRAVISION | C.M3_INFRAVISIBLE,
        difficulty: 24,
        mcolor: C.HI_LORD
    },
    {
        mname: "Master of Thieves",
        mlet: C.S_HUMAN,
        mlevel: 20, mmove: 15, ac: 0, mr: 90, maligntyp: -20,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 10 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_SAMU, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_LEADER, msize: C.MZ_HUMAN,
        mresists: C.MR_STONE, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PEACEFUL | C.M2_STRONG | C.M2_MALE | C.M2_GREEDY | C.M2_JEWELS | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_CLOSE | C.M3_INFRAVISIBLE,
        difficulty: 24,
        mcolor: C.HI_LORD
    },
    {
        mname: "Lord Sato",
        mlet: C.S_HUMAN,
        mlevel: 20, mmove: 15, ac: 0, mr: 90, maligntyp: 20,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 10 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 10 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_LEADER, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PNAME | C.M2_PEACEFUL | C.M2_STRONG | C.M2_MALE | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_CLOSE | C.M3_INFRAVISIBLE,
        difficulty: 24,
        mcolor: C.HI_LORD
    },
    {
        mname: "Twoflower",
        mlet: C.S_HUMAN,
        mlevel: 20, mmove: 15, ac: 10, mr: 90, maligntyp: 0,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 10 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_LEADER, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PNAME | C.M2_PEACEFUL | C.M2_STRONG | C.M2_MALE | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_CLOSE | C.M3_INFRAVISIBLE,
        difficulty: 22,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "Norn",
        mlet: C.S_HUMAN,
        mlevel: 20, mmove: 15, ac: 0, mr: 90, maligntyp: 0,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 10 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 10 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1800, cnutrit: 550, msound: C.MS_LEADER, msize: C.MZ_HUGE,
        mresists: C.MR_COLD, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PEACEFUL | C.M2_STRONG | C.M2_FEMALE | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_CLOSE | C.M3_INFRAVISIBLE,
        difficulty: 24,
        mcolor: C.HI_LORD
    },
    {
        mname: "Neferet the Green",
        mlet: C.S_HUMAN,
        mlevel: 20, mmove: 15, ac: 0, mr: 90, maligntyp: 0,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 10 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 2, damd: 8 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 2, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_LEADER, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_FEMALE | C.M2_PNAME | C.M2_PEACEFUL | C.M2_STRONG | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_CLOSE | C.M3_INFRAVISIBLE,
        difficulty: 25,
        mcolor: C.CLR_GREEN
    },
    {
        mname: "Minion of Huhetotl",
        mlet: C.S_DEMON,
        mlevel: 16, mmove: 12, ac: -2, mr: 75, maligntyp: -14,
        geno: (C.G_NOCORPSE | C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 8, damd: 4 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 6 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 0, damd: 0 },
            { at: C.AT_CLAW, ad: C.AD_SAMU, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_NEMESIS, msize: C.MZ_LARGE,
        mresists: C.MR_FIRE | C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_SEE_INVIS | C.M1_POIS,
        mflags2: C.M2_NOPOLY | C.M2_DEMON | C.M2_STALK | C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_COLLECT,
        mflags3: C.M3_WANTSARTI | C.M3_WAITFORU | C.M3_INFRAVISION | C.M3_INFRAVISIBLE,
        difficulty: 23,
        mcolor: C.CLR_ORANGE
    },
    {
        mname: "Thoth Amon",
        mlet: C.S_HUMAN,
        mlevel: 16, mmove: 12, ac: 0, mr: 10, maligntyp: -14,
        geno: (C.G_NOGEN | C.G_UNIQ | C.G_NOCORPSE),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 0, damd: 0 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 0, damd: 0 },
            { at: C.AT_CLAW, ad: C.AD_SAMU, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_NEMESIS, msize: C.MZ_HUMAN,
        mresists: C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PNAME | C.M2_STRONG | C.M2_MALE | C.M2_STALK | C.M2_HOSTILE | C.M2_NASTY | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_WANTSARTI | C.M3_WAITFORU | C.M3_INFRAVISIBLE,
        difficulty: 22,
        mcolor: C.HI_LORD
    },
    {
        mname: "Chromatic Dragon",
        mlet: C.S_DRAGON,
        mlevel: 16, mmove: 12, ac: 0, mr: 30, maligntyp: -14,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_BREA, ad: C.AD_RBRE, damn: 6, damd: 6 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 0, damd: 0 },
            { at: C.AT_CLAW, ad: C.AD_SAMU, damn: 2, damd: 8 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 4, damd: 8 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 4, damd: 8 },
            { at: C.AT_STNG, ad: C.AD_PHYS, damn: 1, damd: 6 }
        ],
        cwt: C.WT_DRAGON, cnutrit: 1700, msound: C.MS_NEMESIS, msize: C.MZ_GIGANTIC,
        mresists: C.MR_FIRE | C.MR_COLD | C.MR_SLEEP | C.MR_DISINT | C.MR_ELEC | C.MR_POISON | C.MR_ACID | C.MR_STONE, mconveys: C.MR_FIRE | C.MR_COLD | C.MR_SLEEP | C.MR_DISINT | C.MR_ELEC | C.MR_POISON | C.MR_ACID | C.MR_STONE,
        mflags1: C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_CARNIVORE | C.M1_SEE_INVIS | C.M1_POIS,
        mflags2: C.M2_NOPOLY | C.M2_HOSTILE | C.M2_FEMALE | C.M2_STALK | C.M2_STRONG | C.M2_NASTY | C.M2_GREEDY | C.M2_JEWELS | C.M2_MAGIC,
        mflags3: C.M3_WANTSARTI | C.M3_WAITFORU | C.M3_INFRAVISION | C.M3_INFRAVISIBLE,
        difficulty: 23,
        mcolor: C.HI_LORD
    },
    {
        mname: "Goblin King",
        mlet: C.S_ORC,
        mlevel: 15, mmove: 12, ac: 10, mr: 0, maligntyp: -15,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_SAMU, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 750, cnutrit: 350, msound: C.MS_NEMESIS, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_ORC | C.M2_HOSTILE | C.M2_STRONG | C.M2_STALK | C.M2_NASTY | C.M2_MALE | C.M2_GREEDY | C.M2_JEWELS | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_WANTSARTI | C.M3_WAITFORU | C.M3_INFRAVISION | C.M3_INFRAVISIBLE,
        difficulty: 18,
        mcolor: C.HI_LORD
    },
    {
        mname: "Cyclops",
        mlet: C.S_GIANT,
        mlevel: 18, mmove: 12, ac: 0, mr: 0, maligntyp: -15,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 8 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 8 },
            { at: C.AT_CLAW, ad: C.AD_SAMU, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 1900, cnutrit: 700, msound: C.MS_NEMESIS, msize: C.MZ_HUGE,
        mresists: C.MR_STONE, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_GIANT | C.M2_STRONG | C.M2_ROCKTHROW | C.M2_STALK | C.M2_HOSTILE | C.M2_NASTY | C.M2_MALE | C.M2_JEWELS | C.M2_COLLECT,
        mflags3: C.M3_WANTSARTI | C.M3_WAITFORU | C.M3_INFRAVISION | C.M3_INFRAVISIBLE,
        difficulty: 23,
        mcolor: C.CLR_GRAY
    },
    {
        mname: "Ixoth",
        mlet: C.S_DRAGON,
        mlevel: 15, mmove: 12, ac: -1, mr: 20, maligntyp: -14,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_BREA, ad: C.AD_FIRE, damn: 8, damd: 6 },
            { at: C.AT_BITE, ad: C.AD_PHYS, damn: 4, damd: 8 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 0, damd: 0 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_CLAW, ad: C.AD_SAMU, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_DRAGON, cnutrit: 1600, msound: C.MS_NEMESIS, msize: C.MZ_GIGANTIC,
        mresists: C.MR_FIRE | C.MR_STONE, mconveys: C.MR_FIRE,
        mflags1: C.M1_FLY | C.M1_THICK_HIDE | C.M1_NOHANDS | C.M1_CARNIVORE | C.M1_SEE_INVIS,
        mflags2: C.M2_NOPOLY | C.M2_MALE | C.M2_PNAME | C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_STALK | C.M2_GREEDY | C.M2_JEWELS | C.M2_MAGIC,
        mflags3: C.M3_WANTSARTI | C.M3_WAITFORU | C.M3_INFRAVISIBLE,
        difficulty: 22,
        mcolor: C.CLR_RED
    },
    {
        mname: "Master Kaen",
        mlet: C.S_HUMAN,
        mlevel: 25, mmove: 12, ac: -10, mr: 10, maligntyp: -20,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 16, damd: 2 },
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 16, damd: 2 },
            { at: C.AT_MAGC, ad: C.AD_CLRC, damn: 0, damd: 0 },
            { at: C.AT_CLAW, ad: C.AD_SAMU, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_NEMESIS, msize: C.MZ_HUMAN,
        mresists: C.MR_POISON | C.MR_STONE, mconveys: C.MR_POISON,
        mflags1: C.M1_HUMANOID | C.M1_HERBIVORE | C.M1_SEE_INVIS,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_MALE | C.M2_PNAME | C.M2_HOSTILE | C.M2_STRONG | C.M2_NASTY | C.M2_STALK | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_WANTSARTI | C.M3_WAITFORU | C.M3_INFRAVISIBLE,
        difficulty: 31,
        mcolor: C.HI_LORD
    },
    {
        mname: "Nalzok",
        mlet: C.S_DEMON,
        mlevel: 16, mmove: 12, ac: -2, mr: 85, maligntyp: -127,
        geno: (C.G_NOGEN | C.G_UNIQ | C.G_NOCORPSE),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 8, damd: 4 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 4, damd: 6 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 0, damd: 0 },
            { at: C.AT_CLAW, ad: C.AD_SAMU, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_NEMESIS, msize: C.MZ_LARGE,
        mresists: C.MR_FIRE | C.MR_POISON | C.MR_STONE, mconveys: 0,
        mflags1: C.M1_FLY | C.M1_SEE_INVIS | C.M1_POIS,
        mflags2: C.M2_NOPOLY | C.M2_DEMON | C.M2_MALE | C.M2_PNAME | C.M2_HOSTILE | C.M2_STRONG | C.M2_STALK | C.M2_NASTY | C.M2_COLLECT,
        mflags3: C.M3_WANTSARTI | C.M3_WAITFORU | C.M3_INFRAVISION | C.M3_INFRAVISIBLE,
        difficulty: 23,
        mcolor: C.CLR_ORANGE
    },
    {
        mname: "Scorpius",
        mlet: C.S_SPIDER,
        mlevel: 15, mmove: 12, ac: 10, mr: 0, maligntyp: -15,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_SAMU, damn: 2, damd: 6 },
            { at: C.AT_STNG, ad: C.AD_DISE, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 750, cnutrit: 350, msound: C.MS_NEMESIS, msize: C.MZ_HUMAN,
        mresists: C.MR_POISON | C.MR_STONE, mconveys: C.MR_POISON,
        mflags1: C.M1_ANIMAL | C.M1_NOHANDS | C.M1_OVIPAROUS | C.M1_POIS | C.M1_CARNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_MALE | C.M2_PNAME | C.M2_HOSTILE | C.M2_STRONG | C.M2_STALK | C.M2_NASTY | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_WANTSARTI | C.M3_WAITFORU,
        difficulty: 17,
        mcolor: C.HI_LORD
    },
    {
        mname: "Master Assassin",
        mlet: C.S_HUMAN,
        mlevel: 15, mmove: 12, ac: 0, mr: 30, maligntyp: 18,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_DRST, damn: 2, damd: 6 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 8 },
            { at: C.AT_CLAW, ad: C.AD_SAMU, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_NEMESIS, msize: C.MZ_HUMAN,
        mresists: C.MR_STONE, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_STRONG | C.M2_MALE | C.M2_HOSTILE | C.M2_STALK | C.M2_NASTY | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_WANTSARTI | C.M3_WAITFORU | C.M3_INFRAVISIBLE,
        difficulty: 20,
        mcolor: C.HI_LORD
    },
    {
        mname: "Ashikaga Takauji",
        mlet: C.S_HUMAN,
        mlevel: 15, mmove: 12, ac: 0, mr: 40, maligntyp: -13,
        geno: (C.G_NOGEN | C.G_UNIQ | C.G_NOCORPSE),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_SAMU, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_NEMESIS, msize: C.MZ_HUMAN,
        mresists: C.MR_STONE, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PNAME | C.M2_HOSTILE | C.M2_STRONG | C.M2_STALK | C.M2_NASTY | C.M2_MALE | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_WANTSARTI | C.M3_WAITFORU | C.M3_INFRAVISIBLE,
        difficulty: 19,
        mcolor: C.HI_LORD
    },
    {
        mname: "Lord Surtur",
        mlet: C.S_GIANT,
        mlevel: 15, mmove: 12, ac: 2, mr: 50, maligntyp: 12,
        geno: (C.G_NOGEN | C.G_UNIQ),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 10 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 10 },
            { at: C.AT_CLAW, ad: C.AD_SAMU, damn: 2, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 2250, cnutrit: 850, msound: C.MS_NEMESIS, msize: C.MZ_HUGE,
        mresists: C.MR_FIRE | C.MR_STONE, mconveys: C.MR_FIRE,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_GIANT | C.M2_MALE | C.M2_PNAME | C.M2_HOSTILE | C.M2_STALK | C.M2_STRONG | C.M2_NASTY | C.M2_ROCKTHROW | C.M2_JEWELS | C.M2_COLLECT,
        mflags3: C.M3_WANTSARTI | C.M3_WAITFORU | C.M3_INFRAVISION | C.M3_INFRAVISIBLE,
        difficulty: 19,
        mcolor: C.HI_LORD
    },
    {
        mname: "Dark One",
        mlet: C.S_HUMAN,
        mlevel: 15, mmove: 12, ac: 0, mr: 80, maligntyp: -10,
        geno: (C.G_NOGEN | C.G_UNIQ | C.G_NOCORPSE),
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_CLAW, ad: C.AD_SAMU, damn: 1, damd: 4 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_NEMESIS, msize: C.MZ_HUMAN,
        mresists: C.MR_STONE, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_STRONG | C.M2_HOSTILE | C.M2_STALK | C.M2_NASTY | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_WANTSARTI | C.M3_WAITFORU | C.M3_INFRAVISIBLE,
        difficulty: 20,
        mcolor: C.CLR_BLACK
    },
    {
        mname: "student",
        mlet: C.S_HUMAN,
        mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: 3,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_GUARDIAN, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_TUNNEL | C.M1_NEEDPICK | C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PEACEFUL | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 7,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "chieftain",
        mlet: C.S_HUMAN,
        mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: 0,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_GUARDIAN, msize: C.MZ_HUMAN,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PEACEFUL | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 7,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "neanderthal",
        mlet: C.S_HUMAN,
        mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: 1,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_GUARDIAN, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PEACEFUL | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 7,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "High-elf",
        mlet: C.S_HUMAN,
        mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: -7,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 2, damd: 4 },
            { at: C.AT_MAGC, ad: C.AD_CLRC, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_ELF, cnutrit: 350, msound: C.MS_GUARDIAN, msize: C.MZ_HUMAN,
        mresists: C.MR_SLEEP, mconveys: C.MR_SLEEP,
        mflags1: C.M1_HUMANOID | C.M1_SEE_INVIS | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_ELF | C.M2_PEACEFUL | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISION | C.M3_INFRAVISIBLE,
        difficulty: 7,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "attendant",
        mlet: C.S_HUMAN,
        mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: 0,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_GUARDIAN, msize: C.MZ_HUMAN,
        mresists: C.MR_POISON, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PEACEFUL | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 7,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "page",
        mlet: C.S_HUMAN,
        mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: 3,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_GUARDIAN, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PEACEFUL | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 7,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "abbot",
        mlet: C.S_HUMAN,
        mlevel: 5, mmove: 12, ac: 10, mr: 20, maligntyp: 0,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_CLAW, ad: C.AD_PHYS, damn: 8, damd: 2 },
            { at: C.AT_KICK, ad: C.AD_STUN, damn: 3, damd: 2 },
            { at: C.AT_MAGC, ad: C.AD_CLRC, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_GUARDIAN, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_HERBIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PEACEFUL | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 8,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "acolyte",
        mlet: C.S_HUMAN,
        mlevel: 5, mmove: 12, ac: 10, mr: 20, maligntyp: 0,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_MAGC, ad: C.AD_CLRC, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_GUARDIAN, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PEACEFUL | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 8,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "hunter",
        mlet: C.S_HUMAN,
        mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: -7,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 4 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_GUARDIAN, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_SEE_INVIS | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PEACEFUL | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISION | C.M3_INFRAVISIBLE,
        difficulty: 7,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "thug",
        mlet: C.S_HUMAN,
        mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: -3,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_GUARDIAN, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PEACEFUL | C.M2_STRONG | C.M2_GREEDY | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 7,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "ninja",
        mlet: C.S_HUMAN,
        mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: 3,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_HUMANOID, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_HOSTILE | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 7,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "roshi",
        mlet: C.S_HUMAN,
        mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: 3,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_GUARDIAN, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PEACEFUL | C.M2_STRONG | C.M2_COLLECT,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 7,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "guide",
        mlet: C.S_HUMAN,
        mlevel: 5, mmove: 12, ac: 10, mr: 20, maligntyp: 0,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_GUARDIAN, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PEACEFUL | C.M2_STRONG | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 8,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "warrior",
        mlet: C.S_HUMAN,
        mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: 1,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 8 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_GUARDIAN, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PEACEFUL | C.M2_STRONG | C.M2_COLLECT | C.M2_FEMALE,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 7,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "apprentice",
        mlet: C.S_HUMAN,
        mlevel: 5, mmove: 12, ac: 10, mr: 30, maligntyp: 0,
        geno: C.G_NOGEN,
        mattk: [
            { at: C.AT_WEAP, ad: C.AD_PHYS, damn: 1, damd: 6 },
            { at: C.AT_MAGC, ad: C.AD_SPEL, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: C.WT_HUMAN, cnutrit: 400, msound: C.MS_GUARDIAN, msize: C.MZ_HUMAN,
        mresists: 0, mconveys: 0,
        mflags1: C.M1_HUMANOID | C.M1_OMNIVORE,
        mflags2: C.M2_NOPOLY | C.M2_HUMAN | C.M2_PEACEFUL | C.M2_STRONG | C.M2_COLLECT | C.M2_MAGIC,
        mflags3: C.M3_INFRAVISIBLE,
        difficulty: 8,
        mcolor: C.HI_DOMESTIC
    },
    {
        mname: "",
        mlet: 0,
        mlevel: 0, mmove: 0, ac: 0, mr: 0, maligntyp: 0,
        geno: C.G_NOGEN | C.G_NOCORPSE,
        mattk: [
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 },
            { at: 0, ad: 0, damn: 0, damd: 0 }
        ],
        cwt: 0, cnutrit: 0, msound: 0, msize: 0,
        mresists: 0, mconveys: 0,
        mflags1: 0,
        mflags2: C.M2_NOPOLY,
        mflags3: 0,
        difficulty: 0,
        mcolor: 0
    }
];

export const NUMMONS = 392;

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
export const PM_CERBERUS = 27;
export const PM_GAS_SPORE = 28;
export const PM_FLOATING_EYE = 29;
export const PM_FREEZING_SPHERE = 30;
export const PM_FLAMING_SPHERE = 31;
export const PM_SHOCKING_SPHERE = 32;
export const PM_BEHOLDER = 33;
export const PM_KITTEN = 34;
export const PM_HOUSECAT = 35;
export const PM_JAGUAR = 36;
export const PM_LYNX = 37;
export const PM_PANTHER = 38;
export const PM_LARGE_CAT = 39;
export const PM_TIGER = 40;
export const PM_DISPLACER_BEAST = 41;
export const PM_GREMLIN = 42;
export const PM_GARGOYLE = 43;
export const PM_WINGED_GARGOYLE = 44;
export const PM_HOBBIT = 45;
export const PM_DWARF = 46;
export const PM_BUGBEAR = 47;
export const PM_DWARF_LEADER = 48;
export const PM_DWARF_RULER = 49;
export const PM_MIND_FLAYER = 50;
export const PM_MASTER_MIND_FLAYER = 51;
export const PM_MANES = 52;
export const PM_HOMUNCULUS = 53;
export const PM_IMP = 54;
export const PM_LEMURE = 55;
export const PM_QUASIT = 56;
export const PM_TENGU = 57;
export const PM_BLUE_JELLY = 58;
export const PM_SPOTTED_JELLY = 59;
export const PM_OCHRE_JELLY = 60;
export const PM_KOBOLD = 61;
export const PM_LARGE_KOBOLD = 62;
export const PM_KOBOLD_LEADER = 63;
export const PM_KOBOLD_SHAMAN = 64;
export const PM_LEPRECHAUN = 65;
export const PM_SMALL_MIMIC = 66;
export const PM_LARGE_MIMIC = 67;
export const PM_GIANT_MIMIC = 68;
export const PM_WOOD_NYMPH = 69;
export const PM_WATER_NYMPH = 70;
export const PM_MOUNTAIN_NYMPH = 71;
export const PM_GOBLIN = 72;
export const PM_HOBGOBLIN = 73;
export const PM_ORC = 74;
export const PM_HILL_ORC = 75;
export const PM_MORDOR_ORC = 76;
export const PM_URUK_HAI = 77;
export const PM_ORC_SHAMAN = 78;
export const PM_ORC_CAPTAIN = 79;
export const PM_ROCK_PIERCER = 80;
export const PM_IRON_PIERCER = 81;
export const PM_GLASS_PIERCER = 82;
export const PM_ROTHE = 83;
export const PM_MUMAK = 84;
export const PM_LEOCROTTA = 85;
export const PM_WUMPUS = 86;
export const PM_TITANOTHERE = 87;
export const PM_BALUCHITHERIUM = 88;
export const PM_MASTODON = 89;
export const PM_SEWER_RAT = 90;
export const PM_GIANT_RAT = 91;
export const PM_RABID_RAT = 92;
export const PM_WERERAT = 93;
export const PM_ROCK_MOLE = 94;
export const PM_CAVE_SPIDER = 95;
export const PM_CENTIPEDE = 96;
export const PM_GIANT_SPIDER = 97;
export const PM_SCORPION = 98;
export const PM_LURKER_ABOVE = 99;
export const PM_TRAPPER = 100;
export const PM_PONY = 101;
export const PM_WHITE_UNICORN = 102;
export const PM_GRAY_UNICORN = 103;
export const PM_BLACK_UNICORN = 104;
export const PM_HORSE = 105;
export const PM_WARHORSE = 106;
export const PM_FOG_CLOUD = 107;
export const PM_DUST_VORTEX = 108;
export const PM_ICE_VORTEX = 109;
export const PM_ENERGY_VORTEX = 110;
export const PM_STEAM_VORTEX = 111;
export const PM_FIRE_VORTEX = 112;
export const PM_BABY_LONG_WORM = 113;
export const PM_BABY_PURPLE_WORM = 114;
export const PM_LONG_WORM = 115;
export const PM_PURPLE_WORM = 116;
export const PM_GRID_BUG = 117;
export const PM_XAN = 118;
export const PM_YELLOW_LIGHT = 119;
export const PM_BLACK_LIGHT = 120;
export const PM_ZRUTY = 121;
export const PM_COUATL = 122;
export const PM_ALEAX = 123;
export const PM_ANGEL = 124;
export const PM_KI_RIN = 125;
export const PM_ARCHON = 126;
export const PM_BAT = 127;
export const PM_GIANT_BAT = 128;
export const PM_RAVEN = 129;
export const PM_VAMPIRE_BAT = 130;
export const PM_PLAINS_CENTAUR = 131;
export const PM_FOREST_CENTAUR = 132;
export const PM_MOUNTAIN_CENTAUR = 133;
export const PM_BABY_GRAY_DRAGON = 134;
export const PM_BABY_GOLD_DRAGON = 135;
export const PM_BABY_SILVER_DRAGON = 136;
export const PM_BABY_SHIMMERING_DRAGON = 137;
export const PM_BABY_RED_DRAGON = 138;
export const PM_BABY_WHITE_DRAGON = 139;
export const PM_BABY_ORANGE_DRAGON = 140;
export const PM_BABY_BLACK_DRAGON = 141;
export const PM_BABY_BLUE_DRAGON = 142;
export const PM_BABY_GREEN_DRAGON = 143;
export const PM_BABY_YELLOW_DRAGON = 144;
export const PM_GRAY_DRAGON = 145;
export const PM_GOLD_DRAGON = 146;
export const PM_SILVER_DRAGON = 147;
export const PM_SHIMMERING_DRAGON = 148;
export const PM_RED_DRAGON = 149;
export const PM_WHITE_DRAGON = 150;
export const PM_ORANGE_DRAGON = 151;
export const PM_BLACK_DRAGON = 152;
export const PM_BLUE_DRAGON = 153;
export const PM_GREEN_DRAGON = 154;
export const PM_YELLOW_DRAGON = 155;
export const PM_STALKER = 156;
export const PM_AIR_ELEMENTAL = 157;
export const PM_FIRE_ELEMENTAL = 158;
export const PM_EARTH_ELEMENTAL = 159;
export const PM_WATER_ELEMENTAL = 160;
export const PM_LICHEN = 161;
export const PM_BROWN_MOLD = 162;
export const PM_YELLOW_MOLD = 163;
export const PM_GREEN_MOLD = 164;
export const PM_RED_MOLD = 165;
export const PM_SHRIEKER = 166;
export const PM_VIOLET_FUNGUS = 167;
export const PM_GNOME = 168;
export const PM_GNOME_LEADER = 169;
export const PM_GNOMISH_WIZARD = 170;
export const PM_GNOME_RULER = 171;
export const PM_GIANT = 172;
export const PM_STONE_GIANT = 173;
export const PM_HILL_GIANT = 174;
export const PM_FIRE_GIANT = 175;
export const PM_FROST_GIANT = 176;
export const PM_ETTIN = 177;
export const PM_STORM_GIANT = 178;
export const PM_TITAN = 179;
export const PM_MINOTAUR = 180;
export const PM_JABBERWOCK = 181;
export const PM_VORPAL_JABBERWOCK = 182;
export const PM_KEYSTONE_KOP = 183;
export const PM_KOP_SERGEANT = 184;
export const PM_KOP_LIEUTENANT = 185;
export const PM_KOP_KAPTAIN = 186;
export const PM_LICH = 187;
export const PM_DEMILICH = 188;
export const PM_MASTER_LICH = 189;
export const PM_ARCH_LICH = 190;
export const PM_KOBOLD_MUMMY = 191;
export const PM_GNOME_MUMMY = 192;
export const PM_ORC_MUMMY = 193;
export const PM_DWARF_MUMMY = 194;
export const PM_ELF_MUMMY = 195;
export const PM_HUMAN_MUMMY = 196;
export const PM_ETTIN_MUMMY = 197;
export const PM_GIANT_MUMMY = 198;
export const PM_RED_NAGA_HATCHLING = 199;
export const PM_BLACK_NAGA_HATCHLING = 200;
export const PM_GOLDEN_NAGA_HATCHLING = 201;
export const PM_GUARDIAN_NAGA_HATCHLING = 202;
export const PM_RED_NAGA = 203;
export const PM_BLACK_NAGA = 204;
export const PM_GOLDEN_NAGA = 205;
export const PM_GUARDIAN_NAGA = 206;
export const PM_OGRE = 207;
export const PM_OGRE_LEADER = 208;
export const PM_OGRE_TYRANT = 209;
export const PM_GRAY_OOZE = 210;
export const PM_BROWN_PUDDING = 211;
export const PM_GREEN_SLIME = 212;
export const PM_BLACK_PUDDING = 213;
export const PM_QUANTUM_MECHANIC = 214;
export const PM_GENETIC_ENGINEER = 215;
export const PM_RUST_MONSTER = 216;
export const PM_DISENCHANTER = 217;
export const PM_GARTER_SNAKE = 218;
export const PM_SNAKE = 219;
export const PM_WATER_MOCCASIN = 220;
export const PM_PYTHON = 221;
export const PM_PIT_VIPER = 222;
export const PM_COBRA = 223;
export const PM_TROLL = 224;
export const PM_ICE_TROLL = 225;
export const PM_ROCK_TROLL = 226;
export const PM_WATER_TROLL = 227;
export const PM_OLOG_HAI = 228;
export const PM_UMBER_HULK = 229;
export const PM_VAMPIRE = 230;
export const PM_VAMPIRE_LEADER = 231;
export const PM_VAMPIRE_MAGE = 232;
export const PM_VLAD_THE_IMPALER = 233;
export const PM_BARROW_WIGHT = 234;
export const PM_WRAITH = 235;
export const PM_NAZGUL = 236;
export const PM_XORN = 237;
export const PM_MONKEY = 238;
export const PM_APE = 239;
export const PM_OWLBEAR = 240;
export const PM_YETI = 241;
export const PM_CARNIVOROUS_APE = 242;
export const PM_SASQUATCH = 243;
export const PM_KOBOLD_ZOMBIE = 244;
export const PM_GNOME_ZOMBIE = 245;
export const PM_ORC_ZOMBIE = 246;
export const PM_DWARF_ZOMBIE = 247;
export const PM_ELF_ZOMBIE = 248;
export const PM_HUMAN_ZOMBIE = 249;
export const PM_ETTIN_ZOMBIE = 250;
export const PM_GHOUL = 251;
export const PM_GIANT_ZOMBIE = 252;
export const PM_SKELETON = 253;
export const PM_STRAW_GOLEM = 254;
export const PM_PAPER_GOLEM = 255;
export const PM_ROPE_GOLEM = 256;
export const PM_GOLD_GOLEM = 257;
export const PM_LEATHER_GOLEM = 258;
export const PM_WOOD_GOLEM = 259;
export const PM_FLESH_GOLEM = 260;
export const PM_CLAY_GOLEM = 261;
export const PM_STONE_GOLEM = 262;
export const PM_GLASS_GOLEM = 263;
export const PM_IRON_GOLEM = 264;
export const PM_HUMAN = 265;
export const PM_HUMAN_WERERAT = 266;
export const PM_HUMAN_WEREJACKAL = 267;
export const PM_HUMAN_WEREWOLF = 268;
export const PM_ELF = 269;
export const PM_WOODLAND_ELF = 270;
export const PM_GREEN_ELF = 271;
export const PM_GREY_ELF = 272;
export const PM_ELF_NOBLE = 273;
export const PM_ELVEN_MONARCH = 274;
export const PM_DOPPELGANGER = 275;
export const PM_SHOPKEEPER = 276;
export const PM_GUARD = 277;
export const PM_PRISONER = 278;
export const PM_ORACLE = 279;
export const PM_ALIGNED_CLERIC = 280;
export const PM_HIGH_CLERIC = 281;
export const PM_SOLDIER = 282;
export const PM_SERGEANT = 283;
export const PM_NURSE = 284;
export const PM_LIEUTENANT = 285;
export const PM_CAPTAIN = 286;
export const PM_WATCHMAN = 287;
export const PM_WATCH_CAPTAIN = 288;
export const PM_MEDUSA = 289;
export const PM_WIZARD_OF_YENDOR = 290;
export const PM_CROESUS = 291;
export const PM_CHARON = 292;
export const PM_GHOST = 293;
export const PM_SHADE = 294;
export const PM_WATER_DEMON = 295;
export const PM_AMOROUS_DEMON = 296;
export const PM_HORNED_DEVIL = 297;
export const PM_BARBED_DEVIL = 298;
export const PM_MARILITH = 299;
export const PM_VROCK = 300;
export const PM_HEZROU = 301;
export const PM_BONE_DEVIL = 302;
export const PM_ICE_DEVIL = 303;
export const PM_NALFESHNEE = 304;
export const PM_PIT_FIEND = 305;
export const PM_SANDESTIN = 306;
export const PM_BALROG = 307;
export const PM_JUIBLEX = 308;
export const PM_YEENOGHU = 309;
export const PM_ORCUS = 310;
export const PM_GERYON = 311;
export const PM_DISPATER = 312;
export const PM_BAALZEBUB = 313;
export const PM_ASMODEUS = 314;
export const PM_DEMOGORGON = 315;
export const PM_DEATH = 316;
export const PM_PESTILENCE = 317;
export const PM_FAMINE = 318;
export const PM_MAIL_DAEMON = 319;
export const PM_DJINNI = 320;
export const PM_JELLYFISH = 321;
export const PM_PIRANHA = 322;
export const PM_SHARK = 323;
export const PM_GIANT_EEL = 324;
export const PM_ELECTRIC_EEL = 325;
export const PM_KRAKEN = 326;
export const PM_NEWT = 327;
export const PM_GECKO = 328;
export const PM_IGUANA = 329;
export const PM_BABY_CROCODILE = 330;
export const PM_LIZARD = 331;
export const PM_CHAMELEON = 332;
export const PM_CROCODILE = 333;
export const PM_SALAMANDER = 334;
export const PM_LONG_WORM_TAIL = 335;
export const PM_ARCHEOLOGIST = 336;
export const PM_BARBARIAN = 337;
export const PM_CAVE_DWELLER = 338;
export const PM_HEALER = 339;
export const PM_KNIGHT = 340;
export const PM_MONK = 341;
export const PM_CLERIC = 342;
export const PM_RANGER = 343;
export const PM_ROGUE = 344;
export const PM_SAMURAI = 345;
export const PM_TOURIST = 346;
export const PM_VALKYRIE = 347;
export const PM_WIZARD = 348;
export const PM_LORD_CARNARVON = 349;
export const PM_PELIAS = 350;
export const PM_SHAMAN_KARNOV = 351;
export const PM_EARENDIL = 352;
export const PM_ELWING = 353;
export const PM_HIPPOCRATES = 354;
export const PM_KING_ARTHUR = 355;
export const PM_GRAND_MASTER = 356;
export const PM_ARCH_PRIEST = 357;
export const PM_ORION = 358;
export const PM_MASTER_OF_THIEVES = 359;
export const PM_LORD_SATO = 360;
export const PM_TWOFLOWER = 361;
export const PM_NORN = 362;
export const PM_NEFERET_THE_GREEN = 363;
export const PM_MINION_OF_HUHETOTL = 364;
export const PM_THOTH_AMON = 365;
export const PM_CHROMATIC_DRAGON = 366;
export const PM_GOBLIN_KING = 367;
export const PM_CYCLOPS = 368;
export const PM_IXOTH = 369;
export const PM_MASTER_KAEN = 370;
export const PM_NALZOK = 371;
export const PM_SCORPIUS = 372;
export const PM_MASTER_ASSASSIN = 373;
export const PM_ASHIKAGA_TAKAUJI = 374;
export const PM_LORD_SURTUR = 375;
export const PM_DARK_ONE = 376;
export const PM_STUDENT = 377;
export const PM_CHIEFTAIN = 378;
export const PM_NEANDERTHAL = 379;
export const PM_HIGH_ELF = 380;
export const PM_ATTENDANT = 381;
export const PM_PAGE = 382;
export const PM_ABBOT = 383;
export const PM_ACOLYTE = 384;
export const PM_HUNTER = 385;
export const PM_THUG = 386;
export const PM_NINJA = 387;
export const PM_ROSHI = 388;
export const PM_GUIDE = 389;
export const PM_WARRIOR = 390;
export const PM_APPRENTICE = 391;
