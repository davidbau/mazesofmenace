// Generated from NetHack quest Lua by tools/generate-quest-levels.mjs.
// Copyright (c) 1989 by Jean-Christophe Collet
// Copyright (c) 1991 by M. Stephenson
// Copyright (c) 1991, 1993 by M. Stephenson, P. Winner
// Copyright (c) 1992 by Dean Luick
// Copyright (c) 1991-2 by M. Stephenson
// Copyright (c) 1991,92 by M. Stephenson
// Copyright (c) 1991,92 by M. Stephenson, P. Winner
// Copyright (c) 1991-92 by M. Stephenson, P. Winner
// Copyright (c) 1992 by David Cohrs
// NetHack may be freely redistributed. See nethack-c/upstream/dat/license.
// Preserve declaration order: geometry and population share the live RNG.
export const QUEST_LEVELS = {
  "Caveman": {
    "x-goal": {
      "source": "Cav-goal.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel"
        ],
        [
          "map",
          "                                                                            \n                          .....................                             \n                         .......................                            \n                        .........................                           \n                       ...........................                          \n                      .............................                         \n                     ...............................                        \n                    .................................                       \n                   ...................................                      \n                  .....................................                     \n                 .......................................                    \n                  .....................................                     \n                   ...................................                      \n                    .................................                       \n                     ...............................                        \n                      .............................                         \n                       ...........................                          \n                        .........................                           \n                         .......................                            \n                                                                            "
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          },
          "lit"
        ],
        [
          "stair",
          "up"
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          }
        ],
        [
          "object",
          {
            "id": "mace",
            "x": 23,
            "y": 10,
            "buc": "blessed",
            "spe": 0,
            "name": "The Sceptre of Might"
          }
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "monster",
          {
            "id": "Chromatic Dragon",
            "x": 23,
            "y": 10,
            "asleep": 1
          }
        ],
        [
          "monster",
          "shrieker",
          26,
          13
        ],
        [
          "monster",
          "shrieker",
          25,
          8
        ],
        [
          "monster",
          "shrieker",
          45,
          11
        ],
        [
          "wallify"
        ]
      ]
    },
    "x-loca": {
      "source": "Cav-loca.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel",
          "hardfloor"
        ],
        [
          "map",
          "                                                                            \n    .............                     ...........                           \n   ...............                   .............                          \n    .............                  ...............        ..........        \n     ...........                    .............      ...............      \n        ...                                    ...   ..................     \n         ...                ..........          ... ..................      \n          ...              ............          BBB...................     \n           ...              ..........          ......................      \n            .....                 ..      .....B........................    \n  ....       ...............      .    ........B..........................  \n ......     .. .............S..............         ..................      \n  ....     ..                ...........             ...............        \n     ..  ...                                    ....................        \n      ....                                      BB...................       \n         ..                 ..                 ..  ...............          \n          ..   .......     ....  .....  ....  ..     .......   S            \n           ............     ....... ..  .......       .....    ...  ....    \n               .......       .....   ......                      .......    \n                                                                            "
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "region": [
              52,
              6,
              73,
              15
            ],
            "lit": 1,
            "type": "ordinary",
            "irregular": 1
          }
        ],
        [
          "door",
          "locked",
          28,
          11
        ],
        [
          "stair",
          "up",
          4,
          3
        ],
        [
          "stair",
          "down",
          73,
          10
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          }
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 2,
            "y": 10,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 3,
            "y": 11,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 4,
            "y": 12,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 2,
            "y": 11,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 16,
            "y": 16,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 17,
            "y": 17,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 18,
            "y": 18,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 19,
            "y": 16,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 30,
            "y": 6,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 31,
            "y": 7,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 32,
            "y": 8,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 33,
            "y": 6,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 34,
            "y": 7,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "h",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "H",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "hill giant",
            "x": 3,
            "y": 12,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "hill giant",
            "x": 20,
            "y": 17,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "hill giant",
            "x": 35,
            "y": 8,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "hill giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "hill giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "hill giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "hill giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "H",
            "peaceful": 0
          }
        ],
        [
          "wallify"
        ]
      ]
    },
    "x-strt": {
      "source": "Cav-strt.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel",
          "noteleport",
          "hardfloor"
        ],
        [
          "map",
          "                                                                            \n  ......     ..........................       ...        ....  ......       \n ......       ..........................     ........       ....    .....   \n  ..BB      .............................    .........            ....  ..  \n     ..    ......................              .......      ..     ....  .. \n     ..     ....................                     ..  .......    ..  ... \n   ..              S   BB                .....     .......   ....      .... \n    ..        ...  .   ..               ........  ..     ..   ..       ...  \n     ..      ......     ..             ............       ..          ...   \n       .      ....       ..             ........           ..  ...........  \n  ...   ..     ..        .............                  ................... \n .....   .....            ...............................      ...........  \n  .....B................            ...                               ...   \n  .....     .  ..........        .... .      ...  ..........           ...  \n   ...     ..          .............  ..    ...................        .... \n          BB       ..   .........      BB    ...  ..........  ..   ...  ... \n       ......    .....  B          ........         ..         .. ....  ... \n     ..........  ..........         ..... ...      .....        ........    \n       ..  ...    .  .....         ....    ..       ...            ..       \n                                                                            "
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "region": [
              13,
              1,
              40,
              5
            ],
            "lit": 1,
            "type": "temple",
            "filled": 1,
            "irregular": 1
          }
        ],
        [
          "region",
          {
            "region": [
              2,
              1,
              8,
              3
            ],
            "lit": 1,
            "type": "ordinary",
            "irregular": 1
          }
        ],
        [
          "region",
          {
            "region": [
              1,
              11,
              6,
              14
            ],
            "lit": 1,
            "type": "ordinary",
            "irregular": 1
          }
        ],
        [
          "region",
          {
            "region": [
              13,
              8,
              18,
              10
            ],
            "lit": 1,
            "type": "ordinary",
            "irregular": 1
          }
        ],
        [
          "region",
          {
            "region": [
              5,
              17,
              14,
              18
            ],
            "lit": 1,
            "type": "ordinary",
            "irregular": 1
          }
        ],
        [
          "region",
          {
            "region": [
              17,
              16,
              23,
              18
            ],
            "lit": 1,
            "type": "ordinary",
            "irregular": 1
          }
        ],
        [
          "region",
          {
            "region": [
              35,
              16,
              44,
              18
            ],
            "lit": 1,
            "type": "ordinary",
            "irregular": 1
          }
        ],
        [
          "stair",
          "down",
          2,
          3
        ],
        [
          "levregion",
          {
            "region": [
              71,
              9,
              71,
              9
            ],
            "type": "branch"
          }
        ],
        [
          "door",
          "locked",
          19,
          6
        ],
        [
          "altar",
          {
            "x": 36,
            "y": 2,
            "align": "coaligned",
            "type": "shrine"
          }
        ],
        [
          "monster",
          {
            "id": "Shaman Karnov",
            "coord": [
              35,
              2
            ],
            "inventory": {
              "operations": [
                [
                  "object",
                  {
                    "id": "leather armor",
                    "spe": 5
                  }
                ],
                [
                  "object",
                  {
                    "id": "club",
                    "spe": 5
                  }
                ]
              ]
            }
          }
        ],
        [
          "object",
          "chest",
          34,
          2
        ],
        [
          "monster",
          "neanderthal",
          20,
          3
        ],
        [
          "monster",
          "neanderthal",
          20,
          2
        ],
        [
          "monster",
          "neanderthal",
          20,
          1
        ],
        [
          "monster",
          "neanderthal",
          21,
          3
        ],
        [
          "monster",
          "neanderthal",
          21,
          2
        ],
        [
          "monster",
          "neanderthal",
          21,
          1
        ],
        [
          "monster",
          "neanderthal",
          22,
          1
        ],
        [
          "monster",
          "neanderthal",
          26,
          9
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          }
        ],
        [
          "trap",
          "pit",
          47,
          11
        ],
        [
          "trap",
          "pit",
          57,
          10
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 47,
            "y": 2,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 48,
            "y": 3,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 49,
            "y": 4,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 67,
            "y": 3,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 69,
            "y": 4,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 51,
            "y": 13,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 53,
            "y": 14,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 55,
            "y": 15,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 63,
            "y": 10,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 65,
            "y": 9,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 67,
            "y": 10,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "bugbear",
            "x": 69,
            "y": 11,
            "peaceful": 0
          }
        ],
        [
          "wallify"
        ]
      ]
    }
  },
  "Healer": {
    "x-goal": {
      "source": "Hea-goal.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": "P"
          }
        ],
        [
          "level_flags",
          "mazelevel"
        ],
        [
          "level_init",
          {
            "style": "mines",
            "fg": ".",
            "bg": "P",
            "smoothed": false,
            "joined": true,
            "lit": 1,
            "walled": false
          }
        ],
        [
          "map",
          ".P....................................PP.\nPP.......PPPPPPP....PPPPPPP....PPPP...PP.\n...PPPPPPP....PPPPPPP.....PPPPPP..PPP...P\n...PP..............................PPP...\n..PP..............................PP.....\n..PP..............................PPP....\n..PPP..............................PP....\n.PPP..............................PPPP...\n...PP............................PPP...PP\n..PPPP...PPPPP..PPPP...PPPPP.....PP...PP.\nP....PPPPP...PPPP..PPPPP...PPPPPPP...PP..\nPPP..................................PPP."
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              40,
              11
            ]
          },
          "lit"
        ],
        [
          "stair",
          "up",
          39,
          10
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              40,
              11
            ]
          }
        ],
        [
          "object",
          {
            "id": "quarterstaff",
            "x": 20,
            "y": 6,
            "buc": "blessed",
            "spe": 0,
            "name": "The Staff of Aesculapius"
          }
        ],
        [
          "object",
          "wand of lightning",
          20,
          6
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "monster",
          {
            "id": "Cyclops",
            "x": 20,
            "y": 6,
            "peaceful": 0
          }
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          {
            "class": "r",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "r",
            "peaceful": 0
          }
        ],
        [
          "monster",
          "giant eel"
        ],
        [
          "monster",
          "giant eel"
        ],
        [
          "monster",
          "giant eel"
        ],
        [
          "monster",
          "giant eel"
        ],
        [
          "monster",
          "giant eel"
        ],
        [
          "monster",
          "giant eel"
        ],
        [
          "monster",
          "electric eel"
        ],
        [
          "monster",
          "electric eel"
        ],
        [
          "monster",
          "shark"
        ],
        [
          "monster",
          "shark"
        ],
        [
          "monster",
          {
            "class": ";",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "D",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "D",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "D",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "D",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "D",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ]
      ]
    },
    "x-loca": {
      "source": "Hea-loca.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel",
          "hardfloor"
        ],
        [
          "level_init",
          {
            "style": "mines",
            "fg": ".",
            "bg": "P",
            "smoothed": true,
            "joined": true,
            "lit": 1,
            "walled": false
          }
        ],
        [
          "map",
          "PPPPPPPPPPPPP.......PPPPPPPPPPP\nPPPPPPPP...............PPPPPPPP\nPPPP.....-------------...PPPPPP\nPPPPP....|.S.........|....PPPPP\nPPP......+.|.........|...PPPPPP\nPPP......+.|.........|..PPPPPPP\nPPPP.....|.S.........|..PPPPPPP\nPPPPP....-------------....PPPPP\nPPPPPPPP...............PPPPPPPP\nPPPPPPPPPPP........PPPPPPPPPPPP"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              30,
              9
            ]
          },
          "lit"
        ],
        [
          "region",
          {
            "region": [
              12,
              3,
              20,
              6
            ],
            "lit": 1,
            "type": "temple",
            "filled": 1
          }
        ],
        [
          "door",
          "closed",
          9,
          4
        ],
        [
          "door",
          "closed",
          9,
          5
        ],
        [
          "door",
          "locked",
          11,
          3
        ],
        [
          "door",
          "locked",
          11,
          6
        ],
        [
          "stair",
          "up",
          4,
          4
        ],
        [
          "stair",
          "down",
          20,
          6
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              11,
              2,
              21,
              7
            ]
          }
        ],
        [
          "altar",
          {
            "x": 13,
            "y": 5,
            "align": "chaos",
            "type": "shrine"
          }
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          {
            "class": "r",
            "peaceful": 0
          }
        ],
        [
          "monster",
          "giant eel"
        ],
        [
          "monster",
          "giant eel"
        ],
        [
          "monster",
          "giant eel"
        ],
        [
          "monster",
          "giant eel"
        ],
        [
          "monster",
          "giant eel"
        ],
        [
          "monster",
          "electric eel"
        ],
        [
          "monster",
          "electric eel"
        ],
        [
          "monster",
          "kraken"
        ],
        [
          "monster",
          "shark"
        ],
        [
          "monster",
          "shark"
        ],
        [
          "monster",
          {
            "class": ";",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": ";",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "D",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "D",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "D",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "D",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "D",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ]
      ]
    },
    "x-strt": {
      "source": "Hea-strt.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel",
          "noteleport",
          "hardfloor"
        ],
        [
          "map",
          "PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP\nPPPP........PPPP.....PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP.P..PPPPP......PPPPPPPP\nPPP..........PPPP...PPPPP.........................PPPP..PPPPP........PPPPPPP\nPP............PPPPPPPP..............................PPP...PPPP......PPPPPPPP\nP.....PPPPPPPPPPPPPPP................................PPPPPPPPPPPPPPPPPPPPPPP\nPPPP....PPPPPPPPPPPP...................................PPPPP.PPPPPPPPPPPPPPP\nPPPP........PPPPP.........-----------------------........PP...PPPPPPP.....PP\nPPP............PPPPP....--|.|......S..........S.|--.....PPPP.PPPPPPP.......P\nPPPP..........PPPPP.....|.S.|......-----------|S|.|......PPPPPP.PPP.......PP\nPPPPPP......PPPPPP......|.|.|......|...|......|.|.|.....PPPPPP...PP.......PP\nPPPPPPPPPPPPPPPPPPP.....+.|.|......S.\\.S......|.|.+......PPPPPP.PPPP.......P\nPPP...PPPPP...PPPP......|.|.|......|...|......|.|.|.......PPPPPPPPPPP.....PP\nPP.....PPP.....PPP......|.|S|-----------......|.S.|......PPPPPPPPPPPPPPPPPPP\nPPP..PPPPP...PPPP.......--|.S..........S......|.|--.....PPPPPPPPP....PPPPPPP\nPPPPPPPPPPPPPPPP..........-----------------------..........PPPPP..........PP\nPPPPPPPPPPPPPPPPP........................................PPPPPP............P\nPPP.............PPPP...................................PPP..PPPP..........PP\nPP...............PPPPP................................PPPP...PPPP........PPP\nPPP.............PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP....PPPPPP\nPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP"
        ],
        [
          "replace_terrain",
          {
            "region": [
              1,
              1,
              74,
              18
            ],
            "fromterrain": "P",
            "toterrain": ".",
            "chance": 10
          }
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          },
          "lit"
        ],
        [
          "stair",
          "down",
          37,
          9
        ],
        [
          "levregion",
          {
            "region": [
              4,
              12,
              4,
              12
            ],
            "type": "branch"
          }
        ],
        [
          "altar",
          {
            "x": 32,
            "y": 9,
            "align": "neutral",
            "type": "altar"
          }
        ],
        [
          "door",
          "locked",
          24,
          10
        ],
        [
          "door",
          "closed",
          26,
          8
        ],
        [
          "door",
          "closed",
          27,
          12
        ],
        [
          "door",
          "locked",
          28,
          13
        ],
        [
          "door",
          "closed",
          35,
          7
        ],
        [
          "door",
          "locked",
          35,
          10
        ],
        [
          "door",
          "locked",
          39,
          10
        ],
        [
          "door",
          "closed",
          39,
          13
        ],
        [
          "door",
          "locked",
          46,
          7
        ],
        [
          "door",
          "closed",
          47,
          8
        ],
        [
          "door",
          "closed",
          48,
          12
        ],
        [
          "door",
          "locked",
          50,
          10
        ],
        [
          "monster",
          {
            "id": "Hippocrates",
            "coord": [
              37,
              10
            ],
            "inventory": {
              "operations": [
                [
                  "object",
                  {
                    "id": "silver dagger",
                    "spe": 5
                  }
                ]
              ]
            }
          }
        ],
        [
          "object",
          "chest",
          37,
          10
        ],
        [
          "monster",
          "attendant",
          29,
          8
        ],
        [
          "monster",
          "attendant",
          29,
          9
        ],
        [
          "monster",
          "attendant",
          29,
          10
        ],
        [
          "monster",
          "attendant",
          29,
          11
        ],
        [
          "monster",
          "attendant",
          40,
          9
        ],
        [
          "monster",
          "attendant",
          40,
          10
        ],
        [
          "monster",
          "attendant",
          40,
          11
        ],
        [
          "monster",
          "attendant",
          40,
          13
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          }
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          "rabid rat"
        ],
        [
          "monster",
          "giant eel"
        ],
        [
          "monster",
          "shark"
        ],
        [
          "monster",
          ";"
        ],
        [
          "monster",
          {
            "class": "D",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "D",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "D",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "D",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "D",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "S",
            "peaceful": 0
          }
        ]
      ]
    }
  },
  "Ranger": {
    "x-goal": {
      "source": "Ran-goal.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel"
        ],
        [
          "map",
          "                                                                            \n  ...                                                                  ...  \n .......................................................................... \n  ...                                +                                 ...  \n   .     ............     .......    .                   .......        .   \n   .  .............................  .       ........   .........S..    .   \n   .   ............    .  ......     .       .      .    .......   ..   .   \n   .     .........     .   ....      +       . ...  .               ..  .   \n   .        S          .         .........   .S.    .S...............   .   \n   .  ...   .     ...  .         .........          .                   .   \n   . ........    .....S.+.......+....\\....+........+.                   .   \n   .  ...         ...    S       .........           ..      .....      .   \n   .                    ..       .........            ..      ......    .   \n   .      .......     ...            +       ....    ....    .......... .   \n   . ..............  ..              .      ......  ..  .............   .   \n   .     .............               .     ..........          ......   .   \n  ...                                +                                 ...  \n .......................................................................... \n  ...                                                                  ...  \n                                                                            "
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          },
          "lit"
        ],
        [
          "stair",
          "up",
          19,
          10
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          }
        ],
        [
          "object",
          {
            "id": "bow",
            "x": 37,
            "y": 10,
            "buc": "blessed",
            "spe": 0,
            "name": "The Longbow of Diana"
          }
        ],
        [
          "object",
          "chest",
          37,
          10
        ],
        [
          "object",
          {
            "coord": [
              36,
              9
            ]
          }
        ],
        [
          "object",
          {
            "coord": [
              36,
              10
            ]
          }
        ],
        [
          "object",
          {
            "coord": [
              36,
              11
            ]
          }
        ],
        [
          "object",
          {
            "coord": [
              37,
              9
            ]
          }
        ],
        [
          "object",
          {
            "coord": [
              37,
              11
            ]
          }
        ],
        [
          "object",
          {
            "coord": [
              38,
              9
            ]
          }
        ],
        [
          "object",
          {
            "coord": [
              38,
              10
            ]
          }
        ],
        [
          "object",
          {
            "coord": [
              38,
              11
            ]
          }
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "door",
          "locked",
          12,
          8
        ],
        [
          "door",
          "closed",
          22,
          10
        ],
        [
          "door",
          "locked",
          24,
          10
        ],
        [
          "door",
          "closed",
          25,
          11
        ],
        [
          "door",
          "closed",
          32,
          10
        ],
        [
          "door",
          "closed",
          37,
          3
        ],
        [
          "door",
          "closed",
          37,
          7
        ],
        [
          "door",
          "closed",
          37,
          13
        ],
        [
          "door",
          "closed",
          37,
          16
        ],
        [
          "door",
          "closed",
          42,
          10
        ],
        [
          "door",
          "locked",
          46,
          8
        ],
        [
          "door",
          "closed",
          51,
          10
        ],
        [
          "door",
          "locked",
          53,
          8
        ],
        [
          "door",
          "closed",
          65,
          5
        ],
        [
          "monster",
          {
            "id": "Scorpius",
            "x": 37,
            "y": 10,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 36,
            "y": 9,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 36,
            "y": 10,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 36,
            "y": 11,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 37,
            "y": 9,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 37,
            "y": 11,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 38,
            "y": 9,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "x": 38,
            "y": 10,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "x": 38,
            "y": 11,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "x": 2,
            "y": 2,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "x": 71,
            "y": 2,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "x": 2,
            "y": 16,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "x": 71,
            "y": 16,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "C",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "C",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "scorpion",
            "x": 3,
            "y": 2,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "scorpion",
            "x": 72,
            "y": 2,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "scorpion",
            "x": 3,
            "y": 17,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "scorpion",
            "x": 72,
            "y": 17,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "scorpion",
            "x": 41,
            "y": 10,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "scorpion",
            "x": 33,
            "y": 9,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "scorpion",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "scorpion",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "s",
            "peaceful": 0
          }
        ],
        [
          "wallify"
        ]
      ]
    },
    "x-loca": {
      "source": "Ran-loca.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel",
          "hardfloor"
        ],
        [
          "map",
          "              .......  .........  .......              \n     ...................       ...................     \n  ....        .......             .......        ....  \n...    .....     .       .....       .     .....    ...\n.   .......... .....  ...........  ..... ..........   .\n.  ..  ..... ..........  .....  .......... .....  ..  .\n.  .     .     .....       .       .....     .     .  .\n.  .   .....         .............         .....   .  .\n.  .  ................  .......  ................  .  .\n.  .   .....            .......            .....   .  .\n.  .     .    ......               ......    .     .  .\n.  .     ...........   .........   ...........     .  .\n.  .          ..........       ..........          .  .\n.  ..  .....     .       .....       .     .....  ..  .\n.   .......... .....  ...........  ..... ..........   .\n.      ..... ..........  .....  .......... .....      .\n.        .     .....       .       .....     .        .\n...   .......           .......           .......   ...\n  ..............     .............     ..............  \n      .......  .......  .......  .......  .......      "
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              54,
              19
            ]
          },
          "lit"
        ],
        [
          "stair",
          "up",
          25,
          5
        ],
        [
          "stair",
          "down",
          27,
          18
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              54,
              19
            ]
          }
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "trap",
          "spiked pit"
        ],
        [
          "trap",
          "spiked pit"
        ],
        [
          "trap",
          "teleport"
        ],
        [
          "trap",
          "teleport"
        ],
        [
          "trap",
          "arrow"
        ],
        [
          "trap",
          "arrow"
        ],
        [
          "monster",
          {
            "id": "wumpus",
            "x": 27,
            "y": 18,
            "peaceful": 0,
            "asleep": 1
          }
        ],
        [
          "monster",
          {
            "id": "giant bat",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "giant bat",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "giant bat",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "giant bat",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "mountain centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "scorpion",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "scorpion",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "scorpion",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "scorpion",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "s",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "s",
            "peaceful": 0
          }
        ]
      ]
    },
    "x-strt": {
      "source": "Ran-strt.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": "."
          }
        ],
        [
          "level_flags",
          "mazelevel",
          "noteleport",
          "hardfloor",
          "arboreal"
        ],
        [
          "level_init",
          {
            "style": "mines",
            "fg": ".",
            "bg": ".",
            "smoothed": true,
            "joined": true,
            "lit": 1,
            "walled": false
          }
        ],
        [
          "replace_terrain",
          {
            "region": [
              0,
              0,
              76,
              19
            ],
            "fromterrain": ".",
            "toterrain": "T",
            "chance": 5
          }
        ],
        [
          "map",
          {
            "halign": "left",
            "valign": "center",
            "map": "                                       xx\n   ...................................  x\n  ..                                 ..  \n ..  ...............F...............  .. \n .  ..             .F.             ..  . \n . ..  .............F.............  .. . \n . .  ..                         ..  . . \n . . ..  .......................  .. ... \n . . .  ..                     ..  .     \n ... . ..  .|..................... ......\n FFF . .  ..S..................          \n ... . ..  .|.................  .... ... \n . . .  ..                     ..  . . . \n . . ..  .......................  .. . . \n . .  ..                         ..  . . \n . ..  .............F.............  .. . \n .  ..             .F.             ..  . \n ..  ...............F...............  .. \n  ..                                 ..  \n   ...................................  x\n                                       xx"
          }
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              40,
              20
            ]
          },
          "lit"
        ],
        [
          "stair",
          "down",
          10,
          10
        ],
        [
          "levregion",
          {
            "region": [
              51,
              2,
              77,
              18
            ],
            "region_islev": 1,
            "type": "branch"
          }
        ],
        [
          "monster",
          {
            "id": "Orion",
            "coord": [
              20,
              10
            ],
            "inventory": {
              "operations": [
                [
                  "object",
                  {
                    "id": "leather armor",
                    "spe": 4
                  }
                ],
                [
                  "object",
                  {
                    "id": "yumi",
                    "spe": 4
                  }
                ],
                [
                  "object",
                  {
                    "id": "ya",
                    "spe": 4,
                    "quantity": 50
                  }
                ]
              ]
            }
          }
        ],
        [
          "object",
          "chest",
          20,
          10
        ],
        [
          "monster",
          "hunter",
          19,
          9
        ],
        [
          "monster",
          "hunter",
          20,
          9
        ],
        [
          "monster",
          "hunter",
          21,
          9
        ],
        [
          "monster",
          "hunter",
          19,
          10
        ],
        [
          "monster",
          "hunter",
          21,
          10
        ],
        [
          "monster",
          "hunter",
          19,
          11
        ],
        [
          "monster",
          "hunter",
          20,
          11
        ],
        [
          "monster",
          "hunter",
          21,
          11
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              40,
              20
            ]
          }
        ],
        [
          "trap",
          "arrow",
          30,
          9
        ],
        [
          "trap",
          "arrow",
          30,
          10
        ],
        [
          "trap",
          "pit",
          40,
          9
        ],
        [
          "trap",
          "spiked pit"
        ],
        [
          "trap",
          "bear"
        ],
        [
          "trap",
          "bear"
        ],
        [
          "monster",
          {
            "id": "minotaur",
            "x": 33,
            "y": 9,
            "peaceful": 0,
            "asleep": 1
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 19,
            "y": 3,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 19,
            "y": 4,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 19,
            "y": 5,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 21,
            "y": 3,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 21,
            "y": 4,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 21,
            "y": 5,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 1,
            "y": 9,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 2,
            "y": 9,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 3,
            "y": 9,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 1,
            "y": 11,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 2,
            "y": 11,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 3,
            "y": 11,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 19,
            "y": 15,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 19,
            "y": 16,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 19,
            "y": 17,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 21,
            "y": 15,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 21,
            "y": 16,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "forest centaur",
            "x": 21,
            "y": 17,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "plains centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "plains centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "plains centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "plains centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "plains centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "plains centaur",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "scorpion",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "scorpion",
            "peaceful": 0
          }
        ]
      ]
    }
  },
  "Barbarian": {
    "x-goal": {
      "source": "Bar-goal.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel"
        ],
        [
          "map",
          "                                                                            \n                               .............                                \n                             ..................                             \n        ....              .........................          ....           \n      .......          ..........................           .......         \n      ......             ........................          .......          \n      ..  ......................................             ..             \n       ..                 .....................             ..              \n        ..                 ..................              ..               \n         ..         ..S...S..............   ................                \n          ..                   ........                ...                  \n       .........                                         ..                 \n       ......  ..                                         ...  ....         \n      .. ...    ..                             ......       ........        \n   ....          .. ..................        ........       ......         \n  ......          ......................       ......         ..            \n   ....             ..................              ...........             \n                      ..............                                        \n                        ...........                                         \n                                                                            "
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          },
          "unlit"
        ],
        [
          "door",
          "locked",
          22,
          9
        ],
        [
          "door",
          "locked",
          26,
          9
        ],
        [
          "stair",
          "up",
          36,
          5
        ],
        [
          "altar",
          {
            "x": 63,
            "y": 4,
            "align": "noncoaligned",
            "type": "altar"
          }
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          }
        ],
        [
          "object",
          {
            "id": "luckstone",
            "x": 63,
            "y": 4,
            "buc": "blessed",
            "spe": 0,
            "name": "The Heart of Ahriman"
          }
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "monster",
          {
            "id": "Thoth Amon",
            "x": 63,
            "y": 4,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ogre",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "O",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "O",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "rock troll",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "rock troll",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "rock troll",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "rock troll",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "rock troll",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "rock troll",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "rock troll",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "rock troll",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "T",
            "peaceful": 0
          }
        ],
        [
          "wallify"
        ]
      ]
    }
  },
  "Rogue": {
    "x-loca": {
      "source": "Rog-loca.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel"
        ],
        [
          "map",
          "             ----------------------------------------------------   --------\n           ---.................................................-    --.....|\n         ---...--------........-------.......................---     ---...|\n       ---.....-      ---......-     ---..................----         --.--\n     ---.....----       --------       --..................--         --..| \n   ---...-----                       ----.----.....----.....---      --..|| \n----..----                       -----..---  |...---  |.......---   --...|  \n|...---                       ----....---    |.---    |.........-- --...||  \n|...-                      ----.....---     ----      |..........---....|   \n|...----                ----......---       |         |...|.......-....||   \n|......-----          ---.........-         |     -----...|............|    \n|..........-----   ----...........---       -------......||...........||    \n|..............-----................---     |............|||..........|     \n|------...............................---   |...........|| |.........||     \n|.....|..............------.............-----..........||  ||........|      \n|.....|.............--    ---.........................||    |.......||      \n|.....|.............-       ---.....................--|     ||......|       \n|-S----------.......----      --.................----        |.....||       \n|...........|..........--------..............-----           ||....|        \n|...........|............................-----                |....|        \n------------------------------------------                    ------        "
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              20
            ]
          },
          "lit"
        ],
        [
          "stair",
          "up"
        ],
        [
          "stair",
          "down"
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              20
            ]
          }
        ],
        [
          "object",
          {
            "id": "scroll of teleportation",
            "x": 11,
            "y": 18,
            "buc": "cursed",
            "spe": 0
          }
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "l",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "guardian naga",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "guardian naga",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "guardian naga",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "guardian naga",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "guardian naga",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "guardian naga",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "guardian naga",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "N",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "N",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "N",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "chameleon",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "chameleon",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "chameleon",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "chameleon",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "chameleon",
            "peaceful": 0
          }
        ]
      ]
    },
    "x-goal": {
      "source": "Rog-goal.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel",
          "noteleport"
        ],
        [
          "map",
          "-----      -------.......................................|-----------------|\n|...|  -----.....|.......................................|.................|\n|...----...|.....|.......................................|....---------....|\n|.---......---..--.................................------------.......|....|\n|...............|..................................|..|...|...----........-|\n|.....-----....--.................................|-..--..-|.....----S----| \n|--S---...|....|.................................|-........-|....|........| \n|.........---------.............................|-....}}....-|...|...|....| \n|....|.....S......|............................|-.....}}.....-|..--.------| \n|-----.....--.....|...........................|-...}}}}}}}}...-|....|.....--\n|...........--....------S-----...............|-....}}}}}}}}....-|..........|\n|............--........|...| |..............--.....}}.}}........----------S-\n|.............|........|...| |..............|......}}}}}}}}......|...|.....|\n|S-.---.---.---.---.---|...| ------------...--........}}.}}.....--..---....|\n|.---.---.---.---.-S-..----- |....|.....|....|-....}}}}}}}}....---..S.|--..|\n|...|.......|..........|...---....---...S.....|-...}}}}}}}}...-|.S..|...|..|\n|...|..|....|..........|............|..--..----|-.....}}.....-|..----...-S--\n|...|---....----.......|----- ......|...---|    |-....}}....-|...|..--.--..|\n-----.....---.....--.---....--...--------..|     |-........-|....|.........|\n    |.............|..........|.............S...   |S-------|.....|..-----..|\n    ----------------------------------------  ......       ----------   ----"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              20
            ]
          },
          "lit"
        ],
        [
          "levregion",
          {
            "region": [
              1,
              0,
              15,
              20
            ],
            "region_islev": 1,
            "exclude": [
              1,
              18,
              4,
              20
            ],
            "type": "stair-up"
          }
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              20
            ]
          }
        ],
        [
          "trap",
          "spiked pit",
          37,
          7
        ],
        [
          "object",
          {
            "id": "skeleton key",
            "x": 38,
            "y": 10,
            "buc": "blessed",
            "spe": 0,
            "name": "The Master Key of Thievery"
          }
        ],
        [
          "object",
          {
            "id": "tin",
            "x": 26,
            "y": 12,
            "montype": "chameleon"
          }
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "monster",
          {
            "id": "Master Assassin",
            "x": 38,
            "y": 10,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "l",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "l",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "guardian naga",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "guardian naga",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "guardian naga",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "guardian naga",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "guardian naga",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "guardian naga",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "guardian naga",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "guardian naga",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "N",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "N",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "N",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "chameleon",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "chameleon",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "chameleon",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "chameleon",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "chameleon",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "shark",
            "x": 51,
            "y": 14,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "shark",
            "x": 53,
            "y": 9,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "shark",
            "x": 55,
            "y": 15,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "shark",
            "x": 58,
            "y": 10,
            "peaceful": 0
          }
        ]
      ]
    },
    "x-strt": {
      "source": "Rog-strt.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel",
          "noteleport",
          "hardfloor",
          "nommap"
        ],
        [
          "map",
          "---------------------------------.------------------------------------------\n|.....|.||..........|....|......|.|.........|.......+............---.......|\n|.....|..+..........+....---....S.|...-S-----.-----.|............+.+.......|\n|.....+.||........---......|....|.|...|.....|.|...|.---.....------.--------|\n|-----|.-------|..|........------.-----.....|.--..|...-------..............|\n|.....|........------+------..........+.....|..--S---.........------.-----..\n|.....|.------...............-----.}}.--------.|....-------.---....|.+...--|\n|..-+--.|....|-----.--------.|...|.....+.....|.|....|.....+.+......|.--....|\n|..|....|....|....+.|......|.|...-----.|.....|.--...|.....|.|......|..|....|\n|..|.-----S----...|.+....-----...|...|.----..|..|.---....--.---S-----.|----|\n|..|.|........|...------.|.S.....|...|....-----.+.|......|..|.......|.|....|\n|---.-------..|...|....|.|.|.....|...----.|...|.|---.....|.|-.......|.---..|\n...........|..S...|....---.----S----..|...|...+.|..-------.---+-....|...--+|\n|---------.---------...|......|....S..|.---...|.|..|...........----.---....|\n|........|.........|...+.------....|---.---...|.--+-.----.----....|.+...--+|\n|........|.---+---.|----.--........|......-----......|..|..|.--+-.|.-S-.|..|\n|........|.|.....|........----------.----.......---.--..|-.|....|.-----.|..|\n|----....+.|.....----+---............|..|--------.+.|...SS.|....|.......|..|\n|...--+-----.....|......|.------------............---...||.------+--+----..|\n|..........S.....|......|.|..........S............|.....||...|.....|....|..|\n-------------------------.--------------------------------------------------"
        ],
        [
          "@local",
          "streets",
          {
            "selection": "floodfill",
            "args": [
              0,
              12
            ]
          }
        ],
        [
          "@local",
          "place",
          [
            [
              33,
              0
            ],
            [
              0,
              12
            ],
            [
              25,
              20
            ],
            [
              75,
              5
            ]
          ]
        ],
        [
          "@call",
          {
            "lua": "call",
            "name": "shuffle",
            "args": [
              {
                "lua": "var",
                "name": "place"
              }
            ]
          }
        ],
        [
          "stair",
          {
            "dir": "down",
            "coord": {
              "lua": "index",
              "value": {
                "lua": "var",
                "name": "place"
              },
              "index": 1
            }
          }
        ],
        [
          "monster",
          {
            "id": "giant mimic",
            "coord": {
              "lua": "index",
              "value": {
                "lua": "var",
                "name": "place"
              },
              "index": 2
            },
            "appear_as": "ter:staircase down"
          }
        ],
        [
          "monster",
          {
            "id": "large mimic",
            "coord": {
              "lua": "index",
              "value": {
                "lua": "var",
                "name": "place"
              },
              "index": 3
            },
            "appear_as": "ter:staircase down"
          }
        ],
        [
          "monster",
          {
            "id": "small mimic",
            "coord": {
              "lua": "index",
              "value": {
                "lua": "var",
                "name": "place"
              },
              "index": 4
            },
            "appear_as": "ter:staircase down"
          }
        ],
        [
          "levregion",
          {
            "region": [
              19,
              9,
              19,
              9
            ],
            "type": "branch"
          }
        ],
        [
          "door",
          "locked",
          32,
          2
        ],
        [
          "door",
          "locked",
          63,
          9
        ],
        [
          "door",
          "locked",
          27,
          10
        ],
        [
          "door",
          "locked",
          31,
          12
        ],
        [
          "door",
          "locked",
          35,
          13
        ],
        [
          "door",
          "locked",
          69,
          15
        ],
        [
          "door",
          "locked",
          56,
          17
        ],
        [
          "door",
          "locked",
          57,
          17
        ],
        [
          "door",
          "locked",
          11,
          19
        ],
        [
          "door",
          "locked",
          37,
          19
        ],
        [
          "door",
          "locked",
          39,
          2
        ],
        [
          "door",
          "locked",
          49,
          5
        ],
        [
          "door",
          "locked",
          10,
          9
        ],
        [
          "door",
          "locked",
          14,
          12
        ],
        [
          "door",
          "closed",
          52,
          1
        ],
        [
          "door",
          "closed",
          9,
          2
        ],
        [
          "door",
          "closed",
          20,
          2
        ],
        [
          "door",
          "closed",
          65,
          2
        ],
        [
          "door",
          "closed",
          67,
          2
        ],
        [
          "door",
          "closed",
          6,
          3
        ],
        [
          "door",
          "closed",
          21,
          5
        ],
        [
          "door",
          "closed",
          38,
          5
        ],
        [
          "door",
          "closed",
          69,
          6
        ],
        [
          "door",
          "closed",
          4,
          7
        ],
        [
          "door",
          "closed",
          39,
          7
        ],
        [
          "door",
          "closed",
          58,
          7
        ],
        [
          "door",
          "closed",
          60,
          7
        ],
        [
          "door",
          "closed",
          18,
          8
        ],
        [
          "door",
          "closed",
          20,
          9
        ],
        [
          "door",
          "closed",
          48,
          10
        ],
        [
          "door",
          "closed",
          46,
          12
        ],
        [
          "door",
          "closed",
          62,
          12
        ],
        [
          "door",
          "closed",
          74,
          12
        ],
        [
          "door",
          "closed",
          23,
          14
        ],
        [
          "door",
          "closed",
          23,
          14
        ],
        [
          "door",
          "closed",
          50,
          14
        ],
        [
          "door",
          "closed",
          68,
          14
        ],
        [
          "door",
          "closed",
          74,
          14
        ],
        [
          "door",
          "closed",
          14,
          15
        ],
        [
          "door",
          "closed",
          63,
          15
        ],
        [
          "door",
          "closed",
          9,
          17
        ],
        [
          "door",
          "closed",
          21,
          17
        ],
        [
          "door",
          "closed",
          50,
          17
        ],
        [
          "door",
          "closed",
          6,
          18
        ],
        [
          "door",
          "closed",
          65,
          18
        ],
        [
          "door",
          "closed",
          68,
          18
        ],
        [
          "monster",
          {
            "id": "Master of Thieves",
            "coord": [
              36,
              11
            ],
            "inventory": {
              "operations": [
                [
                  "object",
                  {
                    "id": "leather armor",
                    "spe": 5
                  }
                ],
                [
                  "object",
                  {
                    "id": "silver dagger",
                    "spe": 4
                  }
                ],
                [
                  "object",
                  {
                    "id": "dagger",
                    "spe": 2,
                    "quantity": {
                      "lua": "call",
                      "name": "d",
                      "args": [
                        2,
                        4
                      ]
                    },
                    "buc": "not-cursed"
                  }
                ]
              ]
            }
          }
        ],
        [
          "object",
          "chest",
          36,
          11
        ],
        [
          "monster",
          "thug",
          28,
          10
        ],
        [
          "monster",
          "thug",
          29,
          11
        ],
        [
          "monster",
          "thug",
          30,
          9
        ],
        [
          "monster",
          "thug",
          31,
          7
        ],
        [
          "monster",
          "thug",
          31,
          13
        ],
        [
          "monster",
          "thug",
          33,
          14
        ],
        [
          "monster",
          "thug",
          30,
          15
        ],
        [
          "monster",
          "thug",
          35,
          9
        ],
        [
          "monster",
          "thug",
          36,
          13
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              20
            ]
          }
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "x": 1,
            "y": 12,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "water nymph",
            "x": 2,
            "y": 12,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "water nymph",
            "x": 33,
            "y": 1,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "x": 33,
            "y": 2,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "water nymph",
            "x": 74,
            "y": 5,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "x": 74,
            "y": 4,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "leprechaun",
            "x": 25,
            "y": 19,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "water nymph",
            "x": 25,
            "y": 18,
            "peaceful": 0
          }
        ],
        [
          "@for",
          "i",
          1,
          {
            "lua": "call",
            "name": "math.random",
            "args": [
              4,
              7
            ]
          },
          1,
          [
            [
              "monster",
              {
                "id": "water nymph",
                "coord": {
                  "lua": "method",
                  "value": {
                    "lua": "var",
                    "name": "streets"
                  },
                  "name": "rndcoord",
                  "args": [
                    1
                  ]
                },
                "peaceful": 0
              }
            ],
            [
              "monster",
              {
                "id": "leprechaun",
                "coord": {
                  "lua": "method",
                  "value": {
                    "lua": "var",
                    "name": "streets"
                  },
                  "name": "rndcoord",
                  "args": [
                    1
                  ]
                },
                "peaceful": 0
              }
            ]
          ]
        ],
        [
          "@for",
          "i",
          1,
          {
            "lua": "call",
            "name": "math.random",
            "args": [
              7,
              10
            ]
          },
          1,
          [
            [
              "monster",
              {
                "id": "chameleon",
                "coord": {
                  "lua": "method",
                  "value": {
                    "lua": "var",
                    "name": "streets"
                  },
                  "name": "rndcoord",
                  "args": [
                    1
                  ]
                },
                "peaceful": 0
              }
            ]
          ]
        ]
      ]
    }
  },
  "Valkyrie": {
    "x-loca": {
      "source": "Val-loca.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel",
          "hardfloor",
          "icedpools",
          "noflip"
        ],
        [
          "level_init",
          {
            "style": "mines",
            "fg": ".",
            "bg": "I",
            "smoothed": true,
            "joined": false,
            "lit": 1,
            "walled": false
          }
        ],
        [
          "map",
          "PPPPxxxx                      xxxxPPPPPx\nPLPxxx                          xPPLLLPP\nPPP    .......................    PPPLLP\nxx   ............................   PPPP\nx  ...............................  xxxx\n  .................................   xx\n....................................   x\n  ...................................   \nx  ..................................  x\nxx   ..............................   PP\nxPPP  ..........................     PLP\nxPLLP                             xxPLLP\nxPPPPxx                         xxxxPPPP"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              39,
              12
            ]
          },
          "lit"
        ],
        [
          "stair",
          "up",
          48,
          14
        ],
        [
          "stair",
          "down",
          20,
          6
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              39,
              12
            ]
          }
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "trap",
          "fire"
        ],
        [
          "trap",
          "fire"
        ],
        [
          "trap",
          "fire"
        ],
        [
          "trap",
          "fire"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "a"
        ],
        [
          "monster",
          {
            "class": "H",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "H",
            "peaceful": 0
          }
        ]
      ]
    },
    "x-goal": {
      "source": "Val-goal.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": "L"
          }
        ],
        [
          "level_flags",
          "mazelevel",
          "icedpools"
        ],
        [
          "level_init",
          {
            "style": "mines",
            "fg": ".",
            "bg": "L",
            "smoothed": true,
            "joined": true,
            "lit": 1,
            "walled": false
          }
        ],
        [
          "map",
          "xxxxxx.....................xxxxxxxx\nxxxxx.......LLLLL.LLLLL......xxxxxx\nxxxx......LLLLLLLLLLLLLLL......xxxx\nxxxx.....LLL|---------|LLL.....xxxx\nxxxx....LL|--.........--|LL.....xxx\nx......LL|-...LLLLLLL...-|LL.....xx\n.......LL|...LL.....LL...|LL......x\n......LL|-..LL.......LL..-|LL......\n......LL|.................|LL......\n......LL|-..LL.......LL..-|LL......\n.......LL|...LL.....LL...|LL.......\nxx.....LL|-...LLLLLLL...-|LL......x\nxxx.....LL|--.........--|LL.....xxx\nxxxx.....LLL|---------|LLL...xxxxxx\nxxxxx.....LLLLLLLLLLLLLLL...xxxxxxx\nxxxxxx......LLLLL.LLLLL.....xxxxxxx\nxxxxxxxxx..................xxxxxxxx"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              34,
              16
            ]
          },
          "lit"
        ],
        [
          "replace_terrain",
          {
            "region": [
              44,
              9,
              46,
              11
            ],
            "fromterrain": "L",
            "toterrain": ".",
            "chance": 50
          }
        ],
        [
          "stair",
          "up",
          45,
          10
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              34,
              16
            ]
          }
        ],
        [
          "drawbridge",
          {
            "x": 17,
            "y": 2,
            "dir": "south",
            "state": "random"
          }
        ],
        [
          "@if",
          {
            "lua": "call",
            "name": "percent",
            "args": [
              75
            ]
          },
          [
            [
              "drawbridge",
              {
                "x": 17,
                "y": 14,
                "dir": "north",
                "state": "open"
              }
            ]
          ],
          [
            [
              "drawbridge",
              {
                "x": 17,
                "y": 14,
                "dir": "north",
                "state": "random"
              }
            ]
          ]
        ],
        [
          "object",
          {
            "id": "crystal ball",
            "x": 17,
            "y": 8,
            "buc": "blessed",
            "spe": 5,
            "name": "The Orb of Fate"
          }
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "trap",
          "board",
          13,
          8
        ],
        [
          "trap",
          "board",
          21,
          8
        ],
        [
          "trap",
          "fire"
        ],
        [
          "trap",
          "fire"
        ],
        [
          "trap",
          "fire"
        ],
        [
          "trap",
          "fire"
        ],
        [
          "trap",
          "board"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "monster",
          "Lord Surtur",
          17,
          8
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "fire ant"
        ],
        [
          "monster",
          "a"
        ],
        [
          "monster",
          "a"
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "x": 10,
            "y": 6,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "x": 10,
            "y": 7,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "x": 10,
            "y": 8,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "x": 10,
            "y": 9,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "x": 10,
            "y": 10,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "x": 24,
            "y": 6,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "x": 24,
            "y": 7,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "x": 24,
            "y": 8,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "x": 24,
            "y": 9,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "x": 24,
            "y": 10,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "H",
            "peaceful": 0
          }
        ]
      ]
    },
    "x-strt": {
      "source": "Val-strt.lua",
      "operations": [
        [
          "level_flags",
          "mazelevel",
          "noteleport",
          "hardfloor",
          "icedpools"
        ],
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": "I"
          }
        ],
        [
          "@local",
          "pools",
          {
            "selection": "new",
            "args": []
          }
        ],
        [
          "@for",
          "i",
          1,
          13,
          1,
          [
            [
              "@call",
              {
                "lua": "method",
                "value": {
                  "lua": "var",
                  "name": "pools"
                },
                "name": "set",
                "args": []
              }
            ]
          ]
        ],
        [
          "@assign",
          "pools",
          {
            "lua": "binary",
            "op": "|",
            "left": {
              "lua": "var",
              "name": "pools"
            },
            "right": {
              "selection": "grow",
              "args": [
                {
                  "selection": "set",
                  "args": [
                    {
                      "selection": "new",
                      "args": []
                    }
                  ]
                },
                "west"
              ]
            }
          }
        ],
        [
          "@assign",
          "pools",
          {
            "lua": "binary",
            "op": "|",
            "left": {
              "lua": "var",
              "name": "pools"
            },
            "right": {
              "selection": "grow",
              "args": [
                {
                  "selection": "set",
                  "args": [
                    {
                      "selection": "new",
                      "args": []
                    }
                  ]
                },
                "north"
              ]
            }
          }
        ],
        [
          "@assign",
          "pools",
          {
            "lua": "binary",
            "op": "|",
            "left": {
              "lua": "var",
              "name": "pools"
            },
            "right": {
              "selection": "grow",
              "args": [
                {
                  "selection": "set",
                  "args": [
                    {
                      "selection": "new",
                      "args": []
                    }
                  ]
                },
                "random"
              ]
            }
          }
        ],
        [
          "terrain",
          {
            "lua": "method",
            "value": {
              "lua": "method",
              "value": {
                "lua": "var",
                "name": "pools"
              },
              "name": "clone",
              "args": []
            },
            "name": "grow",
            "args": [
              "all"
            ]
          },
          "P"
        ],
        [
          "terrain",
          {
            "lua": "var",
            "name": "pools"
          },
          "L"
        ],
        [
          "map",
          "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\nxxxxxxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...xxxxxxxxxxxxxxxxxxxxx\nxxxxxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx..{..xxxxxxxxxxxxxxxxxxxx\nxxxxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.....xxxxxxxxxxxxxxxxxxx\nxxxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxx\nxxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxx\nxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx..xxxxxxxxxxxxxxxxxxx\nxxxxxxxx.....xxxxxxxxxxxxx|----------------|xxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxx\nxxxxxxx..xxx...xxxxxxxxxxx|................|xxxxxxxxxx..xxxxxxxxxxxxxxxxxxxx\nxxxxxx..xxxxxx......xxxxx.|................|.xxxxxxxxx.xxxxxxxxxxxxxxxxxxxxx\nxxxxx..xxxxxxxxxxxx.......+................+...xxxxxxx.xxxxxxxxxxxxxxxxxxxxx\nxxxx..xxxxxxxxx.....xxxxx.|................|.x...xxxxx.xxxxxxxxxxxxxxxxxxxxx\nxxx..xxxxxxxxx..xxxxxxxxxx|................|xxxx.......xxxxxxxxxxxxxxxxxxxxx\nxxxx..xxxxxxx..xxxxxxxxxxx|----------------|xxxxxxxxxx...xxxxxxxxxxxxxxxxxxx\nxxxxxx..xxxx..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...xxxxxxxxxxxxxxxxx\nxxxxxxx......xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...xxxxxxxxxxxxxxx\nxxxxxxxxx...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...x......xxxxxx\nxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.........xxxxx\nxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.......xxxxxx\nxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          },
          "lit"
        ],
        [
          "levregion",
          {
            "region": [
              66,
              17,
              66,
              17
            ],
            "type": "branch"
          }
        ],
        [
          "stair",
          "down",
          18,
          1
        ],
        [
          "feature",
          "fountain",
          53,
          2
        ],
        [
          "door",
          "locked",
          26,
          10
        ],
        [
          "door",
          "locked",
          43,
          10
        ],
        [
          "monster",
          {
            "id": "Norn",
            "coord": [
              35,
              10
            ],
            "inventory": {
              "operations": [
                [
                  "object",
                  {
                    "id": "banded mail",
                    "spe": 5
                  }
                ],
                [
                  "object",
                  {
                    "id": "long sword",
                    "spe": 4
                  }
                ]
              ]
            }
          }
        ],
        [
          "object",
          "chest",
          36,
          10
        ],
        [
          "monster",
          "warrior",
          27,
          8
        ],
        [
          "monster",
          "warrior",
          27,
          9
        ],
        [
          "monster",
          "warrior",
          27,
          11
        ],
        [
          "monster",
          "warrior",
          27,
          12
        ],
        [
          "monster",
          "warrior",
          42,
          8
        ],
        [
          "monster",
          "warrior",
          42,
          9
        ],
        [
          "monster",
          "warrior",
          42,
          11
        ],
        [
          "monster",
          "warrior",
          42,
          12
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              26,
              7,
              43,
              13
            ]
          }
        ],
        [
          "trap",
          "fire"
        ],
        [
          "trap",
          "fire"
        ],
        [
          "trap",
          "fire"
        ],
        [
          "trap",
          "fire"
        ],
        [
          "trap",
          "fire"
        ],
        [
          "trap",
          "fire"
        ],
        [
          "monster",
          "fire ant",
          4,
          12
        ],
        [
          "monster",
          "fire ant",
          8,
          8
        ],
        [
          "monster",
          "fire ant",
          14,
          4
        ],
        [
          "monster",
          "fire ant",
          17,
          11
        ],
        [
          "monster",
          "fire ant",
          24,
          10
        ],
        [
          "monster",
          "fire ant",
          45,
          10
        ],
        [
          "monster",
          "fire ant",
          54,
          2
        ],
        [
          "monster",
          "fire ant",
          55,
          7
        ],
        [
          "monster",
          "fire ant",
          58,
          14
        ],
        [
          "monster",
          "fire ant",
          63,
          17
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "x": 18,
            "y": 1,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "fire giant",
            "x": 10,
            "y": 16,
            "peaceful": 0
          }
        ]
      ]
    }
  },
  "Knight": {
    "x-loca": {
      "source": "Kni-loca.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel",
          "hardfloor"
        ],
        [
          "level_init",
          {
            "style": "mines",
            "fg": ".",
            "bg": "P",
            "smoothed": false,
            "joined": true,
            "lit": 1,
            "walled": false
          }
        ],
        [
          "map",
          "xxxxxxxxx......xxxx...........xxxxxxxxxx\nxxxxxxx.........xxx.............xxxxxxxx\nxxxx..............................xxxxxx\nxx.................................xxxxx\n....................................xxxx\n.......................................x\n........................................\nxx...................................xxx\nxxxx..............................xxxxxx\nxxxxxx..........................xxxxxxxx\nxxxxxxxx.........xx..........xxxxxxxxxxx\nxxxxxxxxx.......xxxxxx.....xxxxxxxxxxxxx"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              39,
              11
            ]
          },
          "lit"
        ],
        [
          "region",
          {
            "region": [
              9,
              2,
              27,
              9
            ],
            "lit": 1,
            "type": "temple",
            "filled": 2
          }
        ],
        [
          "stair",
          "up",
          38,
          0
        ],
        [
          "stair",
          "down",
          18,
          5
        ],
        [
          "altar",
          {
            "x": 17,
            "y": 5,
            "align": "neutral",
            "type": "shrine"
          }
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "trap",
          "magic",
          8,
          11
        ],
        [
          "trap",
          "magic",
          9,
          11
        ],
        [
          "trap",
          "magic",
          10,
          11
        ],
        [
          "trap",
          "magic",
          11,
          11
        ],
        [
          "trap",
          "magic",
          12,
          11
        ],
        [
          "trap",
          "magic",
          13,
          11
        ],
        [
          "trap",
          "magic",
          14,
          11
        ],
        [
          "trap",
          "magic",
          15,
          11
        ],
        [
          "trap",
          "magic",
          16,
          11
        ],
        [
          "trap",
          "magic",
          20,
          11
        ],
        [
          "trap",
          "magic",
          21,
          11
        ],
        [
          "trap",
          "magic",
          22,
          11
        ],
        [
          "trap",
          "magic",
          23,
          11
        ],
        [
          "trap",
          "magic",
          24,
          11
        ],
        [
          "trap",
          "magic",
          25,
          11
        ],
        [
          "trap",
          "magic",
          26,
          11
        ],
        [
          "trap",
          "magic",
          27,
          11
        ],
        [
          "trap",
          "magic",
          28,
          11
        ],
        [
          "trap",
          "magic",
          0,
          3
        ],
        [
          "trap",
          "magic",
          0,
          4
        ],
        [
          "trap",
          "magic",
          0,
          5
        ],
        [
          "trap",
          "magic",
          0,
          6
        ],
        [
          "trap",
          "magic",
          6,
          0
        ],
        [
          "trap",
          "magic",
          7,
          0
        ],
        [
          "trap",
          "magic",
          8,
          0
        ],
        [
          "trap",
          "magic",
          9,
          0
        ],
        [
          "trap",
          "magic",
          10,
          0
        ],
        [
          "trap",
          "magic",
          11,
          0
        ],
        [
          "trap",
          "magic",
          12,
          0
        ],
        [
          "trap",
          "magic",
          13,
          0
        ],
        [
          "trap",
          "magic",
          14,
          0
        ],
        [
          "trap",
          "magic",
          19,
          0
        ],
        [
          "trap",
          "magic",
          20,
          0
        ],
        [
          "trap",
          "magic",
          21,
          0
        ],
        [
          "trap",
          "magic",
          22,
          0
        ],
        [
          "trap",
          "magic",
          23,
          0
        ],
        [
          "trap",
          "magic",
          24,
          0
        ],
        [
          "trap",
          "magic",
          25,
          0
        ],
        [
          "trap",
          "magic",
          26,
          0
        ],
        [
          "trap",
          "magic",
          27,
          0
        ],
        [
          "trap",
          "magic",
          28,
          0
        ],
        [
          "trap",
          "magic",
          29,
          0
        ],
        [
          "trap",
          "magic",
          30,
          0
        ],
        [
          "trap",
          "magic",
          31,
          0
        ],
        [
          "trap",
          "magic",
          32,
          0
        ],
        [
          "trap",
          "anti magic"
        ],
        [
          "trap",
          "anti magic"
        ],
        [
          "trap",
          "anti magic"
        ],
        [
          "trap",
          "anti magic"
        ],
        [
          "trap",
          "anti magic"
        ],
        [
          "trap",
          "anti magic"
        ],
        [
          "trap",
          "anti magic"
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "i",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "j",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ochre jelly",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ochre jelly",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ochre jelly",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ochre jelly",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ochre jelly",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ochre jelly",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ochre jelly",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "j",
            "peaceful": 0
          }
        ]
      ]
    },
    "x-strt": {
      "source": "Kni-strt.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": "."
          }
        ],
        [
          "level_flags",
          "mazelevel",
          "noteleport",
          "hardfloor"
        ],
        [
          "level_init",
          {
            "style": "mines",
            "fg": ".",
            "bg": ".",
            "smoothed": false,
            "joined": false,
            "lit": 1,
            "walled": false
          }
        ],
        [
          "map",
          "..................................................\n.-----......................................-----.\n.|...|......................................|...|.\n.--|+-------------------++-------------------+|--.\n...|...................+..+...................|...\n...|.|-----------------|++|-----------------|.|...\n...|.|.................|..|.........|.......|.|...\n...|.|...\\.............+..+.........|.......|.|...\n...|.|.................+..+.........+.......|.|...\n...|.|.................|..|.........|.......|.|...\n...|.|--------------------------------------|.|...\n...|..........................................|...\n.--|+----------------------------------------+|--.\n.|...|......................................|...|.\n.-----......................................-----.\n.................................................."
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              49,
              15
            ]
          },
          "lit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              4,
              4,
              45,
              11
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "region": [
              6,
              6,
              22,
              9
            ],
            "lit": 1,
            "type": "throne",
            "filled": 2
          }
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              27,
              6,
              43,
              9
            ]
          },
          "lit"
        ],
        [
          "levregion",
          {
            "region": [
              20,
              14,
              20,
              14
            ],
            "type": "branch"
          }
        ],
        [
          "stair",
          "down",
          40,
          7
        ],
        [
          "door",
          "locked",
          24,
          3
        ],
        [
          "door",
          "locked",
          25,
          3
        ],
        [
          "door",
          "closed",
          23,
          4
        ],
        [
          "door",
          "closed",
          26,
          4
        ],
        [
          "door",
          "locked",
          24,
          5
        ],
        [
          "door",
          "locked",
          25,
          5
        ],
        [
          "door",
          "closed",
          23,
          7
        ],
        [
          "door",
          "closed",
          26,
          7
        ],
        [
          "door",
          "closed",
          23,
          8
        ],
        [
          "door",
          "closed",
          26,
          8
        ],
        [
          "door",
          "closed",
          36,
          8
        ],
        [
          "door",
          "closed",
          4,
          3
        ],
        [
          "door",
          "closed",
          45,
          3
        ],
        [
          "door",
          "closed",
          4,
          12
        ],
        [
          "door",
          "closed",
          45,
          12
        ],
        [
          "monster",
          {
            "id": "King Arthur",
            "coord": [
              9,
              7
            ],
            "inventory": {
              "operations": [
                [
                  "object",
                  {
                    "id": "long sword",
                    "spe": 4,
                    "buc": "blessed",
                    "name": "Excalibur"
                  }
                ],
                [
                  "object",
                  {
                    "id": "plate mail",
                    "spe": 4
                  }
                ]
              ]
            }
          }
        ],
        [
          "object",
          "chest",
          9,
          7
        ],
        [
          "monster",
          {
            "id": "knight",
            "x": 4,
            "y": 2,
            "peaceful": 1
          }
        ],
        [
          "monster",
          {
            "id": "knight",
            "x": 4,
            "y": 13,
            "peaceful": 1
          }
        ],
        [
          "monster",
          {
            "id": "knight",
            "x": 45,
            "y": 2,
            "peaceful": 1
          }
        ],
        [
          "monster",
          {
            "id": "knight",
            "x": 45,
            "y": 13,
            "peaceful": 1
          }
        ],
        [
          "monster",
          "page",
          16,
          6
        ],
        [
          "monster",
          "page",
          18,
          6
        ],
        [
          "monster",
          "page",
          20,
          6
        ],
        [
          "monster",
          "page",
          16,
          9
        ],
        [
          "monster",
          "page",
          18,
          9
        ],
        [
          "monster",
          "page",
          20,
          9
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              49,
              15
            ]
          }
        ],
        [
          "trap",
          "sleep gas",
          24,
          4
        ],
        [
          "trap",
          "sleep gas",
          25,
          4
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "monster",
          {
            "id": "quasit",
            "x": 14,
            "y": 0,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "x": 16,
            "y": 0,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "x": 18,
            "y": 0,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "x": 20,
            "y": 0,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "x": 22,
            "y": 0,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "x": 24,
            "y": 0,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "x": 26,
            "y": 0,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "x": 28,
            "y": 0,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "x": 30,
            "y": 0,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "x": 32,
            "y": 0,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "x": 34,
            "y": 0,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "quasit",
            "x": 36,
            "y": 0,
            "peaceful": 0
          }
        ],
        [
          "@for",
          "i",
          1,
          {
            "lua": "binary",
            "op": "+",
            "left": 2,
            "right": {
              "lua": "call",
              "name": "nh.rn2",
              "args": [
                3
              ]
            }
          },
          1,
          [
            [
              "monster",
              {
                "id": "warhorse",
                "peaceful": 1,
                "inventory": {
                  "operations": [
                    [
                      "@if",
                      {
                        "lua": "call",
                        "name": "percent",
                        "args": [
                          50
                        ]
                      },
                      [
                        [
                          "object",
                          "saddle"
                        ]
                      ],
                      []
                    ]
                  ]
                }
              }
            ]
          ]
        ]
      ]
    }
  },
  "Monk": {
    "x-goal": {
      "source": "Mon-goal.lua",
      "operations": [
        [
          "level_flags",
          "mazelevel"
        ],
        [
          "level_init",
          {
            "style": "mines",
            "fg": "L",
            "bg": ".",
            "smoothed": false,
            "joined": false,
            "lit": 0,
            "walled": false
          }
        ],
        [
          "map",
          "xxxxxx..xxxxxx...xxxxxxxxx\nxxxx......xx......xxxxxxxx\nxx.xx.............xxxxxxxx\nx....................xxxxx\n......................xxxx\n......................xxxx\nxx........................\nxxx......................x\nxxx................xxxxxxx\nxxxx.....x.xx.......xxxxxx\nxxxxx...xxxxxx....xxxxxxxx"
        ],
        [
          "@local",
          "place",
          [
            [
              14,
              4
            ],
            [
              13,
              7
            ]
          ]
        ],
        [
          "@local",
          "placeidx",
          {
            "lua": "call",
            "name": "math.random",
            "args": [
              1,
              {
                "lua": "unary",
                "op": "#",
                "operand": {
                  "lua": "var",
                  "name": "place"
                }
              }
            ]
          }
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              25,
              10
            ]
          },
          "unlit"
        ],
        [
          "stair",
          "up",
          20,
          5
        ],
        [
          "object",
          {
            "id": "lenses",
            "coord": {
              "lua": "index",
              "value": {
                "lua": "var",
                "name": "place"
              },
              "index": {
                "lua": "var",
                "name": "placeidx"
              }
            },
            "buc": "blessed",
            "spe": 0,
            "name": "The Eyes of the Overworld"
          }
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "trap",
          "fire"
        ],
        [
          "trap",
          "fire"
        ],
        [
          "trap",
          "fire"
        ],
        [
          "trap",
          "fire"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "monster",
          "Master Kaen",
          {
            "lua": "index",
            "value": {
              "lua": "var",
              "name": "place"
            },
            "index": {
              "lua": "var",
              "name": "placeidx"
            }
          }
        ],
        [
          "altar",
          {
            "coord": {
              "lua": "index",
              "value": {
                "lua": "var",
                "name": "place"
              },
              "index": {
                "lua": "var",
                "name": "placeidx"
              }
            },
            "align": "noalign",
            "type": "altar"
          }
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "xorn"
        ],
        [
          "monster",
          "xorn"
        ],
        [
          "monster",
          "xorn"
        ],
        [
          "monster",
          "xorn"
        ],
        [
          "monster",
          "xorn"
        ],
        [
          "monster",
          "xorn"
        ],
        [
          "monster",
          "xorn"
        ],
        [
          "monster",
          "xorn"
        ],
        [
          "monster",
          "xorn"
        ]
      ]
    },
    "x-loca": {
      "source": "Mon-loca.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel"
        ],
        [
          "map",
          "             ----------------------------------------------------   --------\n           ---.................................................-    --.....|\n         ---...--------........------........................---     ---...|\n       ---.....-      --.......-    ----..................----         --.--\n     ---.....----      ---------       --..................--         --..| \n   ---...-----                       ----.----.....----.....---      --..|| \n----..----                       -----..---  |...---  |.......---   --...|  \n|...---                       ----....---    |.---    |.........-- --...||  \n|...-                      ----.....---     ----      |..........---....|   \n|...----                ----......---       |         |...|.......-....||   \n|......-----          ---.........-         |     -----...|............|    \n|..........-----   ----...........---       -------......||...........||    \n|..............-----................---     |............|||..........|     \n|-S----...............................---   |...........|| |.........||     \n|.....|..............------.............-----..........||  ||........|      \n|.....|.............--    ---.........................||    |.......||      \n|.....|.............-       ---.....................--|     ||......|       \n|---S--------.......----      --.................----        |.....||       \n|...........|..........--------..............-----           ||....|        \n|...........|............................-----                |....|        \n------------------------------------------                    ------        "
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              20
            ]
          },
          "lit"
        ],
        [
          "stair",
          "up"
        ],
        [
          "stair",
          "down"
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              20
            ]
          }
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "@local",
          "tinplace",
          {
            "lua": "method",
            "value": {
              "selection": "negate",
              "args": []
            },
            "name": "filter_mapchar",
            "args": [
              "."
            ]
          }
        ],
        [
          "@local",
          "tinloc",
          {
            "lua": "method",
            "value": {
              "lua": "var",
              "name": "tinplace"
            },
            "name": "rndcoord",
            "args": [
              0
            ]
          }
        ],
        [
          "object",
          {
            "id": "tin",
            "coord": {
              "lua": "var",
              "name": "tinloc"
            },
            "quantity": 2,
            "buc": "blessed",
            "montype": "spinach"
          }
        ],
        [
          "engraving",
          {
            "coord": {
              "lua": "var",
              "name": "tinloc"
            },
            "type": "burn",
            "text": "Elbereth"
          }
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "earth elemental"
        ],
        [
          "monster",
          "xorn"
        ],
        [
          "monster",
          "xorn"
        ],
        [
          "monster",
          "xorn"
        ],
        [
          "monster",
          "xorn"
        ],
        [
          "monster",
          "xorn"
        ],
        [
          "monster",
          "xorn"
        ],
        [
          "monster",
          "xorn"
        ],
        [
          "monster",
          "xorn"
        ],
        [
          "monster",
          "xorn"
        ]
      ]
    },
    "x-strt": {
      "source": "Mon-strt.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel",
          "noteleport",
          "hardfloor"
        ],
        [
          "map",
          "............................................................................\n............................................................................\n............................................................................\n....................------------------------------------....................\n....................|................|.....|.....|.....|....................\n....................|..------------..|--+-----+-----+--|....................\n....................|..|..........|..|.................|....................\n....................|..|..........|..|+---+---+-----+--|....................\n..................---..|..........|......|...|...|.....|....................\n..................+....|..........+......|...|...|.....|....................\n..................+....|..........+......|...|...|.....|....................\n..................---..|..........|......|...|...|.....|....................\n....................|..|..........|..|+-----+---+---+--|....................\n....................|..|..........|..|.................|....................\n....................|..------------..|--+-----+-----+--|....................\n....................|................|.....|.....|.....|....................\n....................------------------------------------....................\n............................................................................\n............................................................................\n............................................................................"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          },
          "lit"
        ],
        [
          "region",
          {
            "region": [
              24,
              6,
              33,
              13
            ],
            "lit": 1,
            "type": "temple"
          }
        ],
        [
          "replace_terrain",
          {
            "region": [
              0,
              0,
              10,
              19
            ],
            "fromterrain": ".",
            "toterrain": "T",
            "chance": 10
          }
        ],
        [
          "replace_terrain",
          {
            "region": [
              65,
              0,
              75,
              19
            ],
            "fromterrain": ".",
            "toterrain": "T",
            "chance": 10
          }
        ],
        [
          "@local",
          "spacelocs",
          {
            "selection": "floodfill",
            "args": [
              5,
              4
            ]
          }
        ],
        [
          "terrain",
          [
            5,
            4
          ],
          "."
        ],
        [
          "levregion",
          {
            "region": [
              5,
              4,
              5,
              4
            ],
            "type": "branch"
          }
        ],
        [
          "stair",
          "down",
          52,
          9
        ],
        [
          "door",
          "locked",
          18,
          9
        ],
        [
          "door",
          "locked",
          18,
          10
        ],
        [
          "door",
          "closed",
          34,
          9
        ],
        [
          "door",
          "closed",
          34,
          10
        ],
        [
          "door",
          "closed",
          40,
          5
        ],
        [
          "door",
          "closed",
          46,
          5
        ],
        [
          "door",
          "closed",
          52,
          5
        ],
        [
          "door",
          "locked",
          38,
          7
        ],
        [
          "door",
          "closed",
          42,
          7
        ],
        [
          "door",
          "closed",
          46,
          7
        ],
        [
          "door",
          "closed",
          52,
          7
        ],
        [
          "door",
          "locked",
          38,
          12
        ],
        [
          "door",
          "closed",
          44,
          12
        ],
        [
          "door",
          "closed",
          48,
          12
        ],
        [
          "door",
          "closed",
          52,
          12
        ],
        [
          "door",
          "closed",
          40,
          14
        ],
        [
          "door",
          "closed",
          46,
          14
        ],
        [
          "door",
          "closed",
          52,
          14
        ],
        [
          "altar",
          {
            "x": 28,
            "y": 9,
            "align": "noalign",
            "type": "altar"
          }
        ],
        [
          "monster",
          {
            "id": "Grand Master",
            "coord": [
              28,
              10
            ],
            "inventory": {
              "operations": [
                [
                  "object",
                  {
                    "id": "robe",
                    "spe": 6
                  }
                ]
              ]
            }
          }
        ],
        [
          "monster",
          "abbot",
          32,
          7
        ],
        [
          "monster",
          "abbot",
          32,
          8
        ],
        [
          "monster",
          "abbot",
          32,
          11
        ],
        [
          "monster",
          "abbot",
          32,
          12
        ],
        [
          "monster",
          "abbot",
          33,
          7
        ],
        [
          "monster",
          "abbot",
          33,
          8
        ],
        [
          "monster",
          "abbot",
          33,
          11
        ],
        [
          "monster",
          "abbot",
          33,
          12
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              18,
              3,
              55,
              16
            ]
          }
        ],
        [
          "@for",
          "i",
          1,
          2,
          1,
          [
            [
              "trap",
              "dart",
              {
                "lua": "method",
                "value": {
                  "lua": "var",
                  "name": "spacelocs"
                },
                "name": "rndcoord",
                "args": [
                  1
                ]
              }
            ]
          ]
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "@for",
          "i",
          1,
          8,
          1,
          [
            [
              "monster",
              "earth elemental",
              {
                "lua": "method",
                "value": {
                  "lua": "var",
                  "name": "spacelocs"
                },
                "name": "rndcoord",
                "args": [
                  1
                ]
              }
            ]
          ]
        ],
        [
          "@for",
          "i",
          1,
          4,
          1,
          [
            [
              "monster",
              "xorn",
              {
                "lua": "method",
                "value": {
                  "lua": "var",
                  "name": "spacelocs"
                },
                "name": "rndcoord",
                "args": [
                  1
                ]
              }
            ]
          ]
        ],
        [
          "object",
          {
            "id": "tin",
            "coord": [
              29,
              9
            ],
            "quantity": 2,
            "montype": "spinach"
          }
        ],
        [
          "object",
          {
            "id": "food ration",
            "coord": [
              46,
              4
            ],
            "quantity": 4
          }
        ]
      ]
    }
  },
  "Tourist": {
    "x-loca": {
      "source": "Tou-loca.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel",
          "hardfloor"
        ],
        [
          "map",
          "----------------------------------------------------------------------------\n|....|......|..........|......|......|...|....|.....|......|...............|\n|....|......|.|------|.|......|......|.|.|....|..}..|......|.|----------|..|\n|....|--+----.|......|.|-S---+|+-----|.|.S....|.....|---+--|.|..........+..|\n|....|........|......|.|...|.........|.|------|..............|..........|-+|\n|....+...}}...+......|.|...|.|-----|.|..............|--+----------------|..|\n|----|........|------|.|---|.|.....|......|-----+-|.|.......|...........|--|\n|............................|.....|.|--+-|.......|.|.......|...........|..|\n|----|.....|-------------|...|--+--|.|....|.......|.|-----------+-------|..|\n|....+.....+.........S...|...........|....|-------|........................|\n|....|.....|.........|...|.|---------|....|.........|-------|.|----------|.|\n|....|.....|---------|---|.|......|..+....|-------|.|.......|.+......S.\\.|.|\n|....|.....+.........S...|.|......|..|....|.......|.|.......|.|......|...|.|\n|-------|..|.........|---|.|+-------------------+-|.|.......+.|----------|.|\n|.......+..|---------|.........|.........|..........|.......|.|..........|.|\n|.......|..............|--+--|.|.........|.|----+-----------|.|..........|.|\n|---------+-|--+-----|-|.....|.|.........|.|........|.|.....+.|..........+.|\n|...........|........|.S.....|.|----+----|.|--------|.|.....|.|----------|.|\n|...........|........|.|.....|........................|.....|..............|\n----------------------------------------------------------------------------"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          },
          "lit"
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          }
        ],
        [
          "region",
          {
            "region": [
              1,
              1,
              4,
              5
            ],
            "lit": 0,
            "type": "morgue",
            "filled": 1
          }
        ],
        [
          "region",
          {
            "region": [
              15,
              3,
              20,
              5
            ],
            "lit": 1,
            "type": "shop",
            "filled": 1
          }
        ],
        [
          "region",
          {
            "region": [
              62,
              3,
              71,
              4
            ],
            "lit": 1,
            "type": "shop",
            "filled": 1
          }
        ],
        [
          "region",
          {
            "region": [
              1,
              17,
              11,
              18
            ],
            "lit": 1,
            "type": "barracks",
            "filled": 1
          }
        ],
        [
          "region",
          {
            "region": [
              12,
              9,
              20,
              10
            ],
            "lit": 1,
            "type": "barracks",
            "filled": 1
          }
        ],
        [
          "region",
          {
            "region": [
              53,
              11,
              59,
              14
            ],
            "lit": 1,
            "type": "zoo",
            "filled": 1
          }
        ],
        [
          "region",
          {
            "region": [
              63,
              14,
              72,
              16
            ],
            "lit": 1,
            "type": "barracks",
            "filled": 1
          }
        ],
        [
          "region",
          {
            "region": [
              32,
              14,
              40,
              16
            ],
            "lit": 1,
            "type": "temple",
            "filled": 1
          }
        ],
        [
          "region",
          {
            "region": [
              6,
              1,
              11,
              2
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "region": [
              24,
              1,
              29,
              2
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "region": [
              31,
              1,
              36,
              2
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "region": [
              42,
              1,
              45,
              3
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "region": [
              53,
              1,
              58,
              2
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "region": [
              24,
              4,
              26,
              5
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "region": [
              30,
              6,
              34,
              7
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              73,
              5,
              74,
              5
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "region": [
              1,
              9,
              4,
              12
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "region": [
              1,
              14,
              7,
              15
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "region": [
              12,
              12,
              20,
              13
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "region": [
              13,
              17,
              20,
              18
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "region": [
              22,
              9,
              24,
              10
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "region": [
              22,
              12,
              24,
              12
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "region": [
              24,
              16,
              28,
              18
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "region": [
              28,
              11,
              33,
              12
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              35,
              11,
              36,
              12
            ]
          },
          "lit"
        ],
        [
          "region",
          {
            "region": [
              38,
              8,
              41,
              12
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "region": [
              43,
              7,
              49,
              8
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "region": [
              43,
              12,
              49,
              12
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "region": [
              44,
              16,
              51,
              16
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "region": [
              53,
              6,
              59,
              7
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "region": [
              61,
              6,
              71,
              7
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "region": [
              55,
              16,
              59,
              18
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "region": [
              63,
              11,
              68,
              12
            ],
            "type": "ordinary"
          }
        ],
        [
          "region",
          {
            "region": [
              70,
              11,
              72,
              12
            ],
            "type": "ordinary"
          }
        ],
        [
          "stair",
          "up",
          10,
          4
        ],
        [
          "stair",
          "down",
          73,
          5
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          }
        ],
        [
          "door",
          "closed",
          5,
          5
        ],
        [
          "door",
          "closed",
          5,
          9
        ],
        [
          "door",
          "closed",
          8,
          14
        ],
        [
          "door",
          "closed",
          8,
          3
        ],
        [
          "door",
          "closed",
          11,
          9
        ],
        [
          "door",
          "closed",
          11,
          12
        ],
        [
          "door",
          "closed",
          10,
          16
        ],
        [
          "door",
          "closed",
          14,
          5
        ],
        [
          "door",
          "closed",
          15,
          16
        ],
        [
          "door",
          "locked",
          21,
          9
        ],
        [
          "door",
          "locked",
          21,
          12
        ],
        [
          "door",
          "closed",
          23,
          17
        ],
        [
          "door",
          "closed",
          25,
          3
        ],
        [
          "door",
          "closed",
          26,
          15
        ],
        [
          "door",
          "closed",
          29,
          3
        ],
        [
          "door",
          "closed",
          28,
          13
        ],
        [
          "door",
          "closed",
          31,
          3
        ],
        [
          "door",
          "closed",
          32,
          8
        ],
        [
          "door",
          "closed",
          37,
          11
        ],
        [
          "door",
          "closed",
          36,
          17
        ],
        [
          "door",
          "locked",
          41,
          3
        ],
        [
          "door",
          "closed",
          40,
          7
        ],
        [
          "door",
          "closed",
          48,
          6
        ],
        [
          "door",
          "closed",
          48,
          13
        ],
        [
          "door",
          "closed",
          48,
          15
        ],
        [
          "door",
          "closed",
          56,
          3
        ],
        [
          "door",
          "closed",
          55,
          5
        ],
        [
          "door",
          "closed",
          72,
          3
        ],
        [
          "door",
          "locked",
          74,
          4
        ],
        [
          "door",
          "closed",
          64,
          8
        ],
        [
          "door",
          "closed",
          62,
          11
        ],
        [
          "door",
          "closed",
          69,
          11
        ],
        [
          "door",
          "closed",
          60,
          13
        ],
        [
          "door",
          "closed",
          60,
          16
        ],
        [
          "door",
          "closed",
          73,
          16
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object",
          "blank paper",
          71,
          12
        ],
        [
          "object",
          "blank paper",
          71,
          12
        ],
        [
          "@local",
          "validtraps",
          {
            "lua": "method",
            "value": {
              "selection": "area",
              "args": [
                0,
                0,
                75,
                19
              ]
            },
            "name": "filter_mapchar",
            "args": [
              "."
            ]
          }
        ],
        [
          "@assign",
          "validtraps",
          {
            "lua": "binary",
            "op": "-",
            "left": {
              "lua": "var",
              "name": "validtraps"
            },
            "right": {
              "lua": "binary",
              "op": "+",
              "left": {
                "selection": "area",
                "args": [
                  15,
                  3,
                  20,
                  5
                ]
              },
              "right": {
                "selection": "area",
                "args": [
                  62,
                  3,
                  71,
                  4
                ]
              }
            }
          }
        ],
        [
          "@for",
          "i",
          1,
          9,
          1,
          [
            [
              "trap",
              {
                "lua": "method",
                "value": {
                  "lua": "var",
                  "name": "validtraps"
                },
                "name": "rndcoord",
                "args": [
                  1
                ]
              }
            ]
          ]
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "s"
        ],
        [
          "monster",
          "s"
        ]
      ]
    },
    "x-goal": {
      "source": "Tou-goal.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel"
        ],
        [
          "map",
          "----------------------------------------------------------------------------\n|.........|.........|..........|..| |.................|........|........|..|\n|.........|.........|..........|..| |....--------.....|........|........|..|\n|------S--|--+-----------+------..| |....|......|.....|........|........|..|\n|.........|.......................| |....|......+.....--+-------------+--..|\n|.........|.......................| |....|......|..........................|\n|-S-----S-|......----------.......| |....|......|..........................|\n|..|..|...|......|........|.......| |....-----------.........----..........|\n|..+..+...|......|........|.......| |....|.........|.........|}}|..........|\n|..|..|...|......+........|.......| |....|.........+.........|}}|..........|\n|..|..|...|......|........|.......S.S....|.........|.........----..........|\n|---..----|......|........|.......| |....|.........|.......................|\n|.........+......|+F-+F-+F|.......| |....-----------.......................|\n|---..----|......|..|..|..|.......| |......................--------------..|\n|..|..|...|......--F-F--F--.......| |......................+............|..|\n|..+..+...|.......................| |--.---...-----+-----..|............|..|\n|--|..----|--+-----------+------..| |.....|...|.........|..|------------|..|\n|..+..+...|.........|..........|..| |.....|...|.........|..+............|..|\n|..|..|...|.........|..........|..| |.....|...|.........|..|............|..|\n----------------------------------------------------------------------------"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          },
          "lit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              1,
              1,
              9,
              2
            ]
          },
          "lit"
        ],
        [
          "region",
          {
            "region": [
              1,
              4,
              9,
              5
            ],
            "lit": 1,
            "type": "barracks",
            "filled": 1
          }
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              1,
              7,
              2,
              10
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              7,
              7,
              9,
              10
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              1,
              14,
              2,
              15
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              7,
              14,
              9,
              15
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              1,
              17,
              2,
              18
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              7,
              17,
              9,
              18
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "region": [
              11,
              1,
              19,
              2
            ],
            "lit": 0,
            "type": "barracks",
            "filled": 1
          }
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              21,
              1,
              30,
              2
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "region": [
              11,
              17,
              19,
              18
            ],
            "lit": 0,
            "type": "barracks",
            "filled": 1
          }
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              21,
              17,
              30,
              18
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              18,
              7,
              25,
              11
            ]
          },
          "lit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              18,
              13,
              19,
              13
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              21,
              13,
              22,
              13
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              24,
              13,
              25,
              13
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              42,
              3,
              47,
              6
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              42,
              8,
              50,
              11
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "region": [
              37,
              16,
              41,
              18
            ],
            "lit": 0,
            "type": "morgue",
            "filled": 1
          }
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              47,
              16,
              55,
              18
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              55,
              1,
              62,
              3
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              64,
              1,
              71,
              3
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "region": [
              60,
              14,
              71,
              15
            ],
            "lit": 1,
            "type": "shop",
            "filled": 1
          }
        ],
        [
          "region",
          {
            "region": [
              60,
              17,
              71,
              18
            ],
            "lit": 1,
            "type": "shop",
            "filled": 1
          }
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          }
        ],
        [
          "stair",
          "up",
          70,
          8
        ],
        [
          "door",
          "locked",
          7,
          3
        ],
        [
          "door",
          "locked",
          2,
          6
        ],
        [
          "door",
          "locked",
          8,
          6
        ],
        [
          "door",
          "closed",
          3,
          8
        ],
        [
          "door",
          "closed",
          6,
          8
        ],
        [
          "door",
          "open",
          10,
          12
        ],
        [
          "door",
          "closed",
          3,
          15
        ],
        [
          "door",
          "closed",
          6,
          15
        ],
        [
          "door",
          "closed",
          3,
          17
        ],
        [
          "door",
          "closed",
          6,
          17
        ],
        [
          "door",
          "closed",
          13,
          3
        ],
        [
          "door",
          "random",
          25,
          3
        ],
        [
          "door",
          "closed",
          13,
          16
        ],
        [
          "door",
          "random",
          25,
          16
        ],
        [
          "door",
          "locked",
          17,
          9
        ],
        [
          "door",
          "locked",
          18,
          12
        ],
        [
          "door",
          "locked",
          21,
          12
        ],
        [
          "door",
          "locked",
          24,
          12
        ],
        [
          "door",
          "locked",
          34,
          10
        ],
        [
          "door",
          "locked",
          36,
          10
        ],
        [
          "door",
          "random",
          48,
          4
        ],
        [
          "door",
          "random",
          56,
          4
        ],
        [
          "door",
          "random",
          70,
          4
        ],
        [
          "door",
          "random",
          51,
          9
        ],
        [
          "door",
          "random",
          51,
          15
        ],
        [
          "door",
          "open",
          59,
          14
        ],
        [
          "door",
          "open",
          59,
          17
        ],
        [
          "object",
          {
            "id": "credit card",
            "x": 4,
            "y": 1,
            "buc": "blessed",
            "spe": 0,
            "name": "The Platinum Yendorian Express Card"
          }
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "@local",
          "validtraps",
          {
            "lua": "method",
            "value": {
              "selection": "area",
              "args": [
                0,
                0,
                75,
                19
              ]
            },
            "name": "filter_mapchar",
            "args": [
              "."
            ]
          }
        ],
        [
          "@assign",
          "validtraps",
          {
            "lua": "binary",
            "op": "-",
            "left": {
              "lua": "var",
              "name": "validtraps"
            },
            "right": {
              "selection": "area",
              "args": [
                60,
                14,
                71,
                18
              ]
            }
          }
        ],
        [
          "@for",
          "i",
          1,
          6,
          1,
          [
            [
              "trap",
              {
                "lua": "method",
                "value": {
                  "lua": "var",
                  "name": "validtraps"
                },
                "name": "rndcoord",
                "args": [
                  1
                ]
              }
            ]
          ]
        ],
        [
          "monster",
          {
            "id": "Master of Thieves",
            "x": 4,
            "y": 1,
            "peaceful": 0
          }
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "s"
        ],
        [
          "monster",
          "s"
        ],
        [
          "monster",
          "succubus",
          2,
          8
        ],
        [
          "monster",
          "succubus",
          8,
          8
        ],
        [
          "monster",
          "incubus",
          2,
          14
        ],
        [
          "monster",
          "incubus",
          8,
          14
        ],
        [
          "monster",
          "incubus",
          2,
          17
        ],
        [
          "monster",
          "incubus",
          8,
          17
        ],
        [
          "monster",
          {
            "id": "Kop Kaptain",
            "x": 24,
            "y": 9,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "Kop Lieutenant",
            "x": 20,
            "y": 9,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "Kop Lieutenant",
            "x": 22,
            "y": 11,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "Kop Lieutenant",
            "x": 22,
            "y": 7,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "Keystone Kop",
            "x": 19,
            "y": 7,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "Keystone Kop",
            "x": 19,
            "y": 8,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "Keystone Kop",
            "x": 22,
            "y": 9,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "Keystone Kop",
            "x": 24,
            "y": 11,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "Keystone Kop",
            "x": 19,
            "y": 11,
            "peaceful": 0
          }
        ],
        [
          "monster",
          "prisoner",
          19,
          13
        ],
        [
          "monster",
          "prisoner",
          21,
          13
        ],
        [
          "monster",
          "prisoner",
          24,
          13
        ],
        [
          "monster",
          {
            "id": "watchman",
            "x": 33,
            "y": 10,
            "peaceful": 0
          }
        ],
        [
          "wallify"
        ]
      ]
    },
    "x-strt": {
      "source": "Tou-strt.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel",
          "noteleport",
          "hardfloor"
        ],
        [
          "map",
          ".......}}....---------..-------------------------------------------------...\n........}}...|.......|..|.-------------------------------------------...|...\n.........}}..|.......|..|.|......|......|.............|......|......|...|...\n..........}}.|.......|..|.|......+......+.............+......+..\\...|...|...\n...........}}}..........|.|......|......|.............|......|......|...|...\n.............}}.........|.|----S-|--S---|S----------S-|---S--|------|...|...\n..............}}}.......|...............................................|...\n................}}}.....----S------++--S----------S----------S-----------...\n..................}}...........    ..    ...................................\n......-------......}}}}........}}}}..}}}}..}}}}..}}}}.......................\n......|.....|.......}}}}}}..}}}}   ..   }}}}..}}}}..}}}.....................\n......|.....+...........}}}}}}........................}}}..}}}}..}}}..}}}...\n......|.....|...........................................}}}}..}}}..}}}}.}}}}\n......-------...............................................................\n............................................................................\n...-------......-------.....................................................\n...|.....|......|.....|.....................................................\n...|.....+......+.....|.....................................................\n...|.....|......|.....|.....................................................\n...-------......-------....................................................."
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          },
          "lit"
        ],
        [
          "region",
          {
            "region": [
              14,
              1,
              20,
              3
            ],
            "lit": 0,
            "type": "morgue",
            "filled": 1
          }
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              7,
              10,
              11,
              12
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              4,
              16,
              8,
              18
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              17,
              16,
              21,
              18
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              27,
              2,
              32,
              4
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              34,
              2,
              39,
              4
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              41,
              2,
              53,
              4
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              55,
              2,
              60,
              4
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              62,
              2,
              67,
              4
            ]
          },
          "lit"
        ],
        [
          "stair",
          "down",
          66,
          3
        ],
        [
          "levregion",
          {
            "region": [
              68,
              14,
              68,
              14
            ],
            "type": "branch"
          }
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          }
        ],
        [
          "door",
          "locked",
          31,
          5
        ],
        [
          "door",
          "locked",
          36,
          5
        ],
        [
          "door",
          "locked",
          41,
          5
        ],
        [
          "door",
          "locked",
          52,
          5
        ],
        [
          "door",
          "locked",
          58,
          5
        ],
        [
          "door",
          "locked",
          28,
          7
        ],
        [
          "door",
          "locked",
          39,
          7
        ],
        [
          "door",
          "locked",
          50,
          7
        ],
        [
          "door",
          "locked",
          61,
          7
        ],
        [
          "door",
          "closed",
          33,
          3
        ],
        [
          "door",
          "closed",
          40,
          3
        ],
        [
          "door",
          "closed",
          54,
          3
        ],
        [
          "door",
          "closed",
          61,
          3
        ],
        [
          "door",
          "open",
          12,
          11
        ],
        [
          "door",
          "open",
          9,
          17
        ],
        [
          "door",
          "open",
          16,
          17
        ],
        [
          "door",
          "locked",
          35,
          7
        ],
        [
          "door",
          "locked",
          36,
          7
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "giant spider"
        ],
        [
          "monster",
          "s"
        ],
        [
          "monster",
          "s"
        ],
        [
          "monster",
          "forest centaur"
        ],
        [
          "monster",
          "forest centaur"
        ],
        [
          "monster",
          "forest centaur"
        ],
        [
          "monster",
          "forest centaur"
        ],
        [
          "monster",
          "forest centaur"
        ],
        [
          "monster",
          "forest centaur"
        ],
        [
          "monster",
          "forest centaur"
        ],
        [
          "monster",
          "forest centaur"
        ],
        [
          "monster",
          "C"
        ],
        [
          "monster",
          {
            "id": "Twoflower",
            "coord": [
              64,
              3
            ],
            "inventory": {
              "operations": [
                [
                  "object",
                  {
                    "id": "walking shoes",
                    "spe": 3
                  }
                ],
                [
                  "object",
                  {
                    "id": "hawaiian shirt",
                    "spe": 3
                  }
                ]
              ]
            }
          }
        ],
        [
          "object",
          "chest",
          64,
          3
        ],
        [
          "monster",
          "guide",
          29,
          3
        ],
        [
          "monster",
          "guide",
          32,
          4
        ],
        [
          "monster",
          "guide",
          35,
          2
        ],
        [
          "monster",
          "guide",
          38,
          3
        ],
        [
          "monster",
          "guide",
          45,
          3
        ],
        [
          "monster",
          "guide",
          48,
          2
        ],
        [
          "monster",
          "guide",
          49,
          4
        ],
        [
          "monster",
          "guide",
          51,
          3
        ],
        [
          "monster",
          "guide",
          57,
          3
        ],
        [
          "monster",
          "guide",
          62,
          4
        ],
        [
          "monster",
          "guide",
          66,
          4
        ],
        [
          "monster",
          "watchman",
          35,
          8
        ],
        [
          "monster",
          "watchman",
          36,
          8
        ],
        [
          "monster",
          "giant eel",
          62,
          12
        ],
        [
          "monster",
          "piranha",
          47,
          10
        ],
        [
          "monster",
          "piranha",
          29,
          11
        ],
        [
          "monster",
          "kraken",
          34,
          9
        ],
        [
          "monster",
          "kraken",
          37,
          9
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ]
      ]
    }
  },
  "Samurai": {
    "x-goal": {
      "source": "Sam-goal.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel",
          "noteleport"
        ],
        [
          "map",
          "                                             \n           .......................           \n       ......-------------------......       \n    ......----.................----......    \n   ....----.....-------------.....----....   \n  ....--.....----...........----.....--....  \n  ...||....---....---------....---....||...  \n  ...|....--....---.......---....--....|...  \n ....|...||...---...--+--...---...||...|.... \n ....|...|....|....|-...-|....|....|...|.... \n ....|...|....|....+.....+....|....|...|.... \n ....|...|....|....|-...-|....|....|...|.... \n ....|...||...---...--+--...---...||...|.... \n  ...|....--....---.......---....--....|...  \n  ...||....---....---------....---....||...  \n  ....--.....----...........----.....--....  \n   ....----.....-------------.....----....   \n    ......----.................----......    \n       ......-------------------......       \n           .......................           "
        ],
        [
          "@local",
          "place",
          [
            [
              2,
              11
            ],
            [
              42,
              9
            ]
          ]
        ],
        [
          "@local",
          "placeidx",
          {
            "lua": "call",
            "name": "math.random",
            "args": [
              1,
              {
                "lua": "unary",
                "op": "#",
                "operand": {
                  "lua": "var",
                  "name": "place"
                }
              }
            ]
          }
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              44,
              19
            ]
          },
          "unlit"
        ],
        [
          "door",
          "closed",
          19,
          10
        ],
        [
          "door",
          "closed",
          22,
          8
        ],
        [
          "door",
          "closed",
          22,
          12
        ],
        [
          "door",
          "closed",
          25,
          10
        ],
        [
          "stair",
          {
            "dir": "up",
            "coord": {
              "lua": "index",
              "value": {
                "lua": "var",
                "name": "place"
              },
              "index": {
                "lua": "var",
                "name": "placeidx"
              }
            }
          }
        ],
        [
          "@local",
          "place",
          [
            [
              22,
              14
            ],
            [
              30,
              10
            ],
            [
              22,
              6
            ],
            [
              14,
              10
            ]
          ]
        ],
        [
          "@local",
          "placeidx",
          {
            "lua": "call",
            "name": "math.random",
            "args": [
              1,
              {
                "lua": "unary",
                "op": "#",
                "operand": {
                  "lua": "var",
                  "name": "place"
                }
              }
            ]
          }
        ],
        [
          "terrain",
          {
            "lua": "index",
            "value": {
              "lua": "var",
              "name": "place"
            },
            "index": {
              "lua": "var",
              "name": "placeidx"
            }
          },
          "."
        ],
        [
          "@local",
          "place",
          [
            [
              22,
              4
            ],
            [
              35,
              10
            ],
            [
              22,
              16
            ],
            [
              9,
              10
            ]
          ]
        ],
        [
          "@local",
          "placeidx",
          {
            "lua": "call",
            "name": "math.random",
            "args": [
              1,
              {
                "lua": "unary",
                "op": "#",
                "operand": {
                  "lua": "var",
                  "name": "place"
                }
              }
            ]
          }
        ],
        [
          "terrain",
          {
            "lua": "index",
            "value": {
              "lua": "var",
              "name": "place"
            },
            "index": {
              "lua": "var",
              "name": "placeidx"
            }
          },
          "."
        ],
        [
          "@local",
          "place",
          [
            [
              22,
              2
            ],
            [
              22,
              18
            ]
          ]
        ],
        [
          "@local",
          "placeidx",
          {
            "lua": "call",
            "name": "math.random",
            "args": [
              1,
              {
                "lua": "unary",
                "op": "#",
                "operand": {
                  "lua": "var",
                  "name": "place"
                }
              }
            ]
          }
        ],
        [
          "terrain",
          {
            "lua": "index",
            "value": {
              "lua": "var",
              "name": "place"
            },
            "index": {
              "lua": "var",
              "name": "placeidx"
            }
          },
          "."
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              44,
              19
            ]
          }
        ],
        [
          "object",
          {
            "id": "tsurugi",
            "x": 22,
            "y": 10,
            "buc": "blessed",
            "spe": 0,
            "name": "The Tsurugi of Muramasa"
          }
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "trap",
          "board",
          22,
          9
        ],
        [
          "trap",
          "board",
          24,
          10
        ],
        [
          "trap",
          "board",
          22,
          11
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "monster",
          "Ashikaga Takauji",
          22,
          10
        ],
        [
          "monster",
          {
            "id": "samurai",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "samurai",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "samurai",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "samurai",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "samurai",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ninja",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ninja",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ninja",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ninja",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ninja",
            "peaceful": 0
          }
        ],
        [
          "monster",
          "wolf"
        ],
        [
          "monster",
          "wolf"
        ],
        [
          "monster",
          "wolf"
        ],
        [
          "monster",
          "wolf"
        ],
        [
          "monster",
          "d"
        ],
        [
          "monster",
          "d"
        ],
        [
          "monster",
          "stalker"
        ],
        [
          "monster",
          "stalker"
        ],
        [
          "monster",
          "stalker"
        ],
        [
          "monster",
          "stalker"
        ],
        [
          "monster",
          "stalker"
        ],
        [
          "monster",
          "stalker"
        ],
        [
          "monster",
          "stalker"
        ],
        [
          "monster",
          "stalker"
        ],
        [
          "monster",
          "stalker"
        ]
      ]
    },
    "x-loca": {
      "source": "Sam-loca.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel",
          "hardfloor"
        ],
        [
          "map",
          "............................................................................\n............................................................................\n........-----..................................................-----........\n........|...|..................................................|...|........\n........|...---..}..--+------------------------------+--..}..---...|........\n........|-|...|.....|...|....|....|....|....|....|.|...|.....|...|-|........\n..........|...-------...|....|....|....|....|....S.|...-------...|..........\n..........|-|.........------+----+-+-------+-+--------.........|-|..........\n............|..--------.|}........................}|.--------..|............\n............|..+........+..........................+........+..|............\n............|..+........+..........................+........+..|............\n............|..--------.|}........................}|.--------..|............\n..........|-|.........--------+-+-------+-+----+------.........|-|..........\n..........|...-------...|.S....|....|....|....|....|...-------...|..........\n........|-|...|.....|...|.|....|....|....|....|....|...|.....|...|-|........\n........|...---..}..--+------------------------------+--..}..---...|........\n........|...|..................................................|...|........\n........-----..................................................-----........\n............................................................................\n............................................................................"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          },
          "lit"
        ],
        [
          "door",
          "locked",
          22,
          4
        ],
        [
          "door",
          "locked",
          22,
          15
        ],
        [
          "door",
          "locked",
          53,
          4
        ],
        [
          "door",
          "locked",
          53,
          15
        ],
        [
          "door",
          "locked",
          49,
          6
        ],
        [
          "door",
          "locked",
          26,
          13
        ],
        [
          "door",
          "locked",
          28,
          7
        ],
        [
          "door",
          "locked",
          30,
          12
        ],
        [
          "door",
          "locked",
          33,
          7
        ],
        [
          "door",
          "locked",
          32,
          12
        ],
        [
          "door",
          "locked",
          35,
          7
        ],
        [
          "door",
          "locked",
          40,
          12
        ],
        [
          "door",
          "locked",
          43,
          7
        ],
        [
          "door",
          "locked",
          42,
          12
        ],
        [
          "door",
          "locked",
          45,
          7
        ],
        [
          "door",
          "locked",
          47,
          12
        ],
        [
          "door",
          "closed",
          15,
          9
        ],
        [
          "door",
          "closed",
          15,
          10
        ],
        [
          "door",
          "closed",
          24,
          9
        ],
        [
          "door",
          "closed",
          24,
          10
        ],
        [
          "door",
          "closed",
          51,
          9
        ],
        [
          "door",
          "closed",
          51,
          10
        ],
        [
          "door",
          "closed",
          60,
          9
        ],
        [
          "door",
          "closed",
          60,
          10
        ],
        [
          "stair",
          "up",
          10,
          10
        ],
        [
          "stair",
          "down",
          25,
          14
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          }
        ],
        [
          "object",
          "*",
          25,
          5
        ],
        [
          "object",
          "*",
          26,
          5
        ],
        [
          "object",
          "*",
          27,
          5
        ],
        [
          "object",
          "*",
          28,
          5
        ],
        [
          "object",
          "*",
          25,
          6
        ],
        [
          "object",
          "*",
          26,
          6
        ],
        [
          "object",
          "*",
          27,
          6
        ],
        [
          "object",
          "*",
          28,
          6
        ],
        [
          "object",
          "[",
          40,
          5
        ],
        [
          "object",
          "[",
          41,
          5
        ],
        [
          "object",
          "[",
          42,
          5
        ],
        [
          "object",
          "[",
          43,
          5
        ],
        [
          "object",
          "[",
          40,
          6
        ],
        [
          "object",
          "[",
          41,
          6
        ],
        [
          "object",
          "[",
          42,
          6
        ],
        [
          "object",
          "[",
          43,
          6
        ],
        [
          "object",
          ")",
          27,
          13
        ],
        [
          "object",
          ")",
          28,
          13
        ],
        [
          "object",
          ")",
          29,
          13
        ],
        [
          "object",
          ")",
          30,
          13
        ],
        [
          "object",
          ")",
          27,
          14
        ],
        [
          "object",
          ")",
          28,
          14
        ],
        [
          "object",
          ")",
          29,
          14
        ],
        [
          "object",
          ")",
          30,
          14
        ],
        [
          "object",
          "(",
          37,
          13
        ],
        [
          "object",
          "(",
          38,
          13
        ],
        [
          "object",
          "(",
          39,
          13
        ],
        [
          "object",
          "(",
          40,
          13
        ],
        [
          "object",
          "(",
          37,
          14
        ],
        [
          "object",
          "(",
          38,
          14
        ],
        [
          "object",
          "(",
          39,
          14
        ],
        [
          "object",
          "(",
          40,
          14
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "monster",
          {
            "id": "ninja",
            "x": 15,
            "y": 5,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ninja",
            "x": 16,
            "y": 5,
            "peaceful": 0
          }
        ],
        [
          "monster",
          "wolf",
          17,
          5
        ],
        [
          "monster",
          "wolf",
          18,
          5
        ],
        [
          "monster",
          {
            "id": "ninja",
            "x": 19,
            "y": 5,
            "peaceful": 0
          }
        ],
        [
          "monster",
          "wolf",
          15,
          14
        ],
        [
          "monster",
          "wolf",
          16,
          14
        ],
        [
          "monster",
          {
            "id": "ninja",
            "x": 17,
            "y": 14,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ninja",
            "x": 18,
            "y": 14,
            "peaceful": 0
          }
        ],
        [
          "monster",
          "wolf",
          56,
          5
        ],
        [
          "monster",
          {
            "id": "ninja",
            "x": 57,
            "y": 5,
            "peaceful": 0
          }
        ],
        [
          "monster",
          "wolf",
          58,
          5
        ],
        [
          "monster",
          "wolf",
          59,
          5
        ],
        [
          "monster",
          {
            "id": "ninja",
            "x": 56,
            "y": 14,
            "peaceful": 0
          }
        ],
        [
          "monster",
          "wolf",
          57,
          14
        ],
        [
          "monster",
          {
            "id": "ninja",
            "x": 58,
            "y": 14,
            "peaceful": 0
          }
        ],
        [
          "monster",
          "d",
          59,
          14
        ],
        [
          "monster",
          "wolf",
          60,
          14
        ],
        [
          "monster",
          "stalker"
        ],
        [
          "monster",
          "stalker"
        ],
        [
          "monster",
          "stalker"
        ],
        [
          "monster",
          "stalker"
        ],
        [
          "monster",
          "stalker"
        ],
        [
          "monster",
          "stalker"
        ],
        [
          "monster",
          "stalker"
        ],
        [
          "monster",
          "stalker"
        ],
        [
          "monster",
          "stalker"
        ],
        [
          "monster",
          {
            "id": "samurai",
            "x": 30,
            "y": 5,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "samurai",
            "x": 31,
            "y": 5,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "samurai",
            "x": 32,
            "y": 5,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "samurai",
            "x": 32,
            "y": 14,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "samurai",
            "x": 33,
            "y": 14,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "samurai",
            "x": 34,
            "y": 14,
            "peaceful": 0
          }
        ]
      ]
    },
    "x-strt": {
      "source": "Sam-strt.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel",
          "noteleport",
          "hardfloor"
        ],
        [
          "map",
          "..............................................................PP............\n...............................................................PP...........\n..........---------------------------------------------------...PPP.........\n..........|......|.........|...|..............|...|.........|....PPPPP......\n......... |......|.........S...|..............|...S.........|.....PPPP......\n..........|......|.........|---|..............|---|.........|.....PPP.......\n..........+......|.........+...-------++-------...+.........|......PP.......\n..........+......|.........|......................|.........|......PP.......\n......... |......---------------------++--------------------|........PP.....\n..........|.................................................|.........PP....\n..........|.................................................|...........PP..\n..........----------------------------------------...-------|............PP.\n..........................................|.................|.............PP\n.............. ................. .........|.................|..............P\n............. } ............... } ........|.................|...............\n.............. ........PP....... .........|.................|...............\n.....................PPP..................|.................|...............\n......................PP..................-------------------...............\n............................................................................\n............................................................................"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          },
          "lit"
        ],
        [
          "region",
          {
            "region": [
              18,
              3,
              26,
              7
            ],
            "lit": 1,
            "type": "throne",
            "filled": 2
          }
        ],
        [
          "levregion",
          {
            "region": [
              62,
              12,
              70,
              17
            ],
            "type": "branch"
          }
        ],
        [
          "stair",
          "down",
          29,
          4
        ],
        [
          "door",
          "locked",
          10,
          6
        ],
        [
          "door",
          "locked",
          10,
          7
        ],
        [
          "door",
          "closed",
          27,
          4
        ],
        [
          "door",
          "closed",
          27,
          6
        ],
        [
          "door",
          "closed",
          38,
          6
        ],
        [
          "door",
          "locked",
          38,
          8
        ],
        [
          "door",
          "closed",
          39,
          6
        ],
        [
          "door",
          "locked",
          39,
          8
        ],
        [
          "door",
          "closed",
          50,
          4
        ],
        [
          "door",
          "closed",
          50,
          6
        ],
        [
          "monster",
          {
            "id": "Lord Sato",
            "coord": [
              20,
              4
            ],
            "inventory": {
              "operations": [
                [
                  "object",
                  {
                    "id": "splint mail",
                    "spe": 5,
                    "eroded": -1,
                    "buc": "not-cursed"
                  }
                ],
                [
                  "object",
                  {
                    "id": "katana",
                    "spe": 4,
                    "eroded": -1,
                    "buc": "not-cursed"
                  }
                ]
              ]
            }
          }
        ],
        [
          "object",
          "chest",
          20,
          4
        ],
        [
          "monster",
          "roshi",
          18,
          4
        ],
        [
          "monster",
          "roshi",
          18,
          5
        ],
        [
          "monster",
          "roshi",
          18,
          6
        ],
        [
          "monster",
          "roshi",
          18,
          7
        ],
        [
          "monster",
          "roshi",
          26,
          4
        ],
        [
          "monster",
          "roshi",
          26,
          5
        ],
        [
          "monster",
          "roshi",
          26,
          6
        ],
        [
          "monster",
          "roshi",
          26,
          7
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          }
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "monster",
          {
            "id": "ninja",
            "x": 64,
            "y": 0,
            "peaceful": 0
          }
        ],
        [
          "monster",
          "wolf",
          65,
          1
        ],
        [
          "monster",
          {
            "id": "ninja",
            "x": 67,
            "y": 2,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ninja",
            "x": 69,
            "y": 5,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ninja",
            "x": 69,
            "y": 6,
            "peaceful": 0
          }
        ],
        [
          "monster",
          "wolf",
          69,
          7
        ],
        [
          "monster",
          {
            "id": "ninja",
            "x": 70,
            "y": 6,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ninja",
            "x": 70,
            "y": 7,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ninja",
            "x": 72,
            "y": 1,
            "peaceful": 0
          }
        ],
        [
          "monster",
          "wolf",
          75,
          9
        ],
        [
          "monster",
          {
            "id": "ninja",
            "x": 73,
            "y": 5,
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "ninja",
            "x": 68,
            "y": 2,
            "peaceful": 0
          }
        ],
        [
          "monster",
          "stalker"
        ]
      ]
    }
  },
  "Wizard": {
    "x-goal": {
      "source": "Wiz-goal.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": " "
          }
        ],
        [
          "level_flags",
          "mazelevel"
        ],
        [
          "map",
          "                                                                            \n                                                                            \n                                                                            \n                   -------------                 -------------              \n                   |...........|                 |...........|              \n            -------|...........-------------------...........|              \n            |......S...........|..|..|..|..|..|..|...........|              \n            |......|...........|..|..|..|..|..|..|...........|              \n            |......|...........-F+-F+-F+-F+-F+-F+-...........|              \n            --S----|...........S.................+...........|              \n            |......|...........-F+-F+-F+-F+-F+-F+-...........|              \n            |......|...........|..|..|..|..|..|..|...........|              \n            |......|...........|..|..|..|..|..|..|...........|              \n            -------|...........-------------------...........|              \n                   |...........|                 |...........|              \n                   -------------                 -------------              \n                                                                            \n                                                                            \n                                                                            \n                                                                            "
        ],
        [
          "region",
          {
            "region": [
              13,
              10,
              18,
              12
            ],
            "lit": 0,
            "type": "temple",
            "filled": 2
          }
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              13,
              6,
              18,
              8
            ]
          },
          "lit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              20,
              4,
              30,
              14
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              32,
              6,
              33,
              7
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              35,
              6,
              36,
              7
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              38,
              6,
              39,
              7
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              41,
              6,
              42,
              7
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              44,
              6,
              45,
              7
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              47,
              6,
              48,
              7
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              32,
              9,
              48,
              9
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              32,
              11,
              33,
              12
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              35,
              11,
              36,
              12
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              38,
              11,
              39,
              12
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              41,
              11,
              42,
              12
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              44,
              11,
              45,
              12
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              47,
              11,
              48,
              12
            ]
          },
          "unlit"
        ],
        [
          "region",
          {
            "selection": "area",
            "args": [
              50,
              4,
              60,
              14
            ]
          },
          "lit"
        ],
        [
          "door",
          "locked",
          19,
          6
        ],
        [
          "door",
          "locked",
          14,
          9
        ],
        [
          "door",
          "locked",
          31,
          9
        ],
        [
          "door",
          "locked",
          33,
          8
        ],
        [
          "door",
          "locked",
          36,
          8
        ],
        [
          "door",
          "locked",
          39,
          8
        ],
        [
          "door",
          "locked",
          42,
          8
        ],
        [
          "door",
          "locked",
          45,
          8
        ],
        [
          "door",
          "locked",
          48,
          8
        ],
        [
          "door",
          "locked",
          33,
          10
        ],
        [
          "door",
          "locked",
          36,
          10
        ],
        [
          "door",
          "locked",
          39,
          10
        ],
        [
          "door",
          "locked",
          42,
          10
        ],
        [
          "door",
          "locked",
          45,
          10
        ],
        [
          "door",
          "locked",
          48,
          10
        ],
        [
          "door",
          "locked",
          49,
          9
        ],
        [
          "stair",
          "up",
          55,
          5
        ],
        [
          "non_diggable",
          {
            "selection": "area",
            "args": [
              0,
              0,
              75,
              19
            ]
          }
        ],
        [
          "altar",
          {
            "coord": [
              16,
              11
            ],
            "aligned": "noncoaligned",
            "type": "altar"
          }
        ],
        [
          "object",
          {
            "id": "amulet of ESP",
            "x": 16,
            "y": 11,
            "buc": "blessed",
            "spe": 0,
            "name": "The Eye of the Aethiopica"
          }
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "object"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "trap"
        ],
        [
          "monster",
          "Dark One",
          16,
          11
        ],
        [
          "monster",
          {
            "class": "B",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "B",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "B",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "B",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "B",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "B",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "B",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "B",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "B",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "B",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "B",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "i",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "i",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "i",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "i",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "i",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "i",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "class": "i",
            "peaceful": 0
          }
        ],
        [
          "monster",
          "vampire bat"
        ],
        [
          "monster",
          "vampire bat"
        ],
        [
          "monster",
          "vampire bat"
        ],
        [
          "monster",
          "vampire bat"
        ],
        [
          "monster",
          "vampire bat"
        ],
        [
          "monster",
          "vampire bat"
        ],
        [
          "monster",
          "vampire bat"
        ],
        [
          "monster",
          "vampire bat"
        ],
        [
          "monster",
          {
            "class": "i",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "rogue",
            "x": 35,
            "y": 6,
            "peaceful": 1,
            "name": "Pug"
          }
        ],
        [
          "monster",
          {
            "id": "owlbear",
            "x": 47,
            "y": 6,
            "peaceful": 1,
            "asleep": 1
          }
        ],
        [
          "monster",
          {
            "id": "wizard",
            "x": 32,
            "y": 11,
            "peaceful": 1,
            "asleep": 1,
            "name": "Newt"
          }
        ],
        [
          "monster",
          {
            "id": "Grey-elf",
            "x": 44,
            "y": 11,
            "peaceful": 1
          }
        ],
        [
          "monster",
          {
            "id": "hill giant",
            "x": 47,
            "y": 11,
            "peaceful": 1,
            "asleep": 1
          }
        ],
        [
          "monster",
          {
            "id": "gnomish wizard",
            "x": 38,
            "y": 6,
            "peaceful": 1
          }
        ],
        [
          "monster",
          {
            "id": "prisoner",
            "x": 35,
            "y": 11,
            "peaceful": 1
          }
        ],
        [
          "monster",
          {
            "id": "prisoner",
            "x": 41,
            "y": 11,
            "peaceful": 1,
            "asleep": 1
          }
        ]
      ]
    }
  }
};
