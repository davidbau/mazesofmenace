// Generated from NetHack quest Lua by tools/generate-quest-fillers.mjs.
// Copyright (c) 1989 by Jean-Christophe Collet
// Copyright (c) 1991 by M. Stephenson
// Copyright (c) 1991, 1993 by M. Stephenson, P. Winner
// Copyright (c) 1991,92 by M. Stephenson
// Copyright (c) 1991-2 by M. Stephenson
// Copyright (c) 1992 by Dean Luick
// Copyright (c) 1991-92 by M. Stephenson, P. Winner
// Copyright (c) 1991,92 by M. Stephenson, P. Winner
// NetHack may be freely redistributed. See nethack-c/upstream/dat/license.
// Keep operation order: geometry, object, trap and monster creation share RNG.
export const QUEST_FILLERS = {
  "Caveman": {
    "a": {
      "source": "Cav-fila.lua",
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
          "noflip"
        ],
        [
          "level_init",
          {
            "style": "mines",
            "fg": ".",
            "bg": " ",
            "smoothed": true,
            "joined": true,
            "walled": true
          }
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
            "id": "hill giant",
            "peaceful": 0
          }
        ]
      ]
    },
    "b": {
      "source": "Cav-filb.lua",
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
          "noflip"
        ],
        [
          "level_init",
          {
            "style": "mines",
            "fg": ".",
            "bg": " ",
            "smoothed": true,
            "joined": true,
            "walled": true
          }
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
            "class": "h",
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
        ]
      ]
    }
  },
  "Healer": {
    "a": {
      "source": "Hea-fila.lua",
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
          "mazelevel",
          "noflip"
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
          "stair",
          "up"
        ],
        [
          "stair",
          "down"
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
          "electric eel"
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
    },
    "b": {
      "source": "Hea-filb.lua",
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
          "mazelevel",
          "noflip"
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
          "stair",
          "up"
        ],
        [
          "stair",
          "down"
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
          "electric eel"
        ],
        [
          "monster",
          "electric eel"
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
  "Knight": {
    "a": {
      "source": "Kni-fila.lua",
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
          "noflip"
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
          "stair",
          "up"
        ],
        [
          "stair",
          "down"
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
            "id": "ochre jelly",
            "peaceful": 0
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
        ]
      ]
    },
    "b": {
      "source": "Kni-filb.lua",
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
          "noflip"
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
          "stair",
          "up"
        ],
        [
          "stair",
          "down"
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
  "Monk": {
    "a": {
      "source": "Mon-fila.lua",
      "operations": [
        [
          "room",
          [
            [
              "stair",
              "up"
            ],
            [
              "object"
            ],
            [
              "monster",
              {
                "class": "E",
                "peaceful": 0
              }
            ]
          ]
        ],
        [
          "room",
          [
            [
              "object"
            ],
            [
              "object"
            ],
            [
              "monster",
              {
                "class": "E",
                "peaceful": 0
              }
            ]
          ]
        ],
        [
          "room",
          [
            [
              "object"
            ],
            [
              "trap"
            ],
            [
              "object"
            ],
            [
              "monster",
              "xorn"
            ],
            [
              "monster",
              "earth elemental"
            ]
          ]
        ],
        [
          "room",
          [
            [
              "stair",
              "down"
            ],
            [
              "object"
            ],
            [
              "trap"
            ],
            [
              "monster",
              {
                "class": "E",
                "peaceful": 0
              }
            ],
            [
              "monster",
              "earth elemental"
            ]
          ]
        ],
        [
          "room",
          [
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
              "monster",
              {
                "class": "X",
                "peaceful": 0
              }
            ]
          ]
        ],
        [
          "room",
          [
            [
              "object"
            ],
            [
              "trap"
            ],
            [
              "monster",
              "earth elemental"
            ]
          ]
        ],
        [
          "random_corridors"
        ]
      ]
    },
    "b": {
      "source": "Mon-filb.lua",
      "operations": [
        [
          "room",
          [
            [
              "stair",
              "up"
            ],
            [
              "object"
            ],
            [
              "monster",
              {
                "class": "X",
                "peaceful": 0
              }
            ]
          ]
        ],
        [
          "room",
          [
            [
              "object"
            ],
            [
              "object"
            ],
            [
              "monster",
              {
                "class": "X",
                "peaceful": 0
              }
            ]
          ]
        ],
        [
          "room",
          [
            [
              "object"
            ],
            [
              "trap"
            ],
            [
              "object"
            ],
            [
              "monster",
              {
                "class": "E",
                "peaceful": 0
              }
            ]
          ]
        ],
        [
          "room",
          [
            [
              "stair",
              "down"
            ],
            [
              "object"
            ],
            [
              "trap"
            ],
            [
              "monster",
              {
                "class": "E",
                "peaceful": 0
              }
            ],
            [
              "monster",
              "earth elemental"
            ]
          ]
        ],
        [
          "room",
          [
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
              "monster",
              {
                "class": "X",
                "peaceful": 0
              }
            ]
          ]
        ],
        [
          "room",
          [
            [
              "object"
            ],
            [
              "trap"
            ],
            [
              "monster",
              "earth elemental"
            ]
          ]
        ],
        [
          "random_corridors"
        ]
      ]
    }
  },
  "Ranger": {
    "a": {
      "source": "Ran-fila.lua",
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
          "noflip"
        ],
        [
          "level_init",
          {
            "style": "mines",
            "fg": ".",
            "bg": "T",
            "smoothed": true,
            "joined": true,
            "walled": true
          }
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
            "class": "C",
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
    },
    "b": {
      "source": "Ran-filb.lua",
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
          "noflip"
        ],
        [
          "level_init",
          {
            "style": "mines",
            "fg": ".",
            "bg": " ",
            "smoothed": true,
            "joined": true,
            "walled": true
          }
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
            "class": "C",
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
  "Rogue": {
    "a": {
      "source": "Rog-fila.lua",
      "operations": [
        [
          "room",
          [
            [
              "stair",
              "up"
            ],
            [
              "object"
            ],
            [
              "monster",
              {
                "id": "leprechaun",
                "peaceful": 0
              }
            ]
          ]
        ],
        [
          "room",
          [
            [
              "object"
            ],
            [
              "object"
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
                "id": "guardian naga",
                "peaceful": 0
              }
            ]
          ]
        ],
        [
          "room",
          [
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
              "object"
            ],
            [
              "monster",
              {
                "id": "water nymph",
                "peaceful": 0
              }
            ]
          ]
        ],
        [
          "room",
          [
            [
              "stair",
              "down"
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
            ]
          ]
        ],
        [
          "room",
          [
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
              "monster",
              {
                "id": "leprechaun",
                "peaceful": 0
              }
            ]
          ]
        ],
        [
          "room",
          [
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
              "monster",
              {
                "id": "leprechaun",
                "peaceful": 0
              }
            ],
            [
              "monster",
              {
                "id": "water nymph",
                "peaceful": 0
              }
            ]
          ]
        ],
        [
          "random_corridors"
        ]
      ]
    },
    "b": {
      "source": "Rog-filb.lua",
      "operations": [
        [
          "room",
          [
            [
              "stair",
              "up"
            ],
            [
              "object"
            ],
            [
              "monster",
              {
                "id": "leprechaun",
                "peaceful": 0
              }
            ]
          ]
        ],
        [
          "room",
          [
            [
              "object"
            ],
            [
              "object"
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
                "id": "guardian naga",
                "peaceful": 0
              }
            ]
          ]
        ],
        [
          "room",
          [
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
              "object"
            ],
            [
              "monster",
              {
                "id": "water nymph",
                "peaceful": 0
              }
            ]
          ]
        ],
        [
          "room",
          [
            [
              "stair",
              "down"
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
            ]
          ]
        ],
        [
          "room",
          [
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
              "monster",
              {
                "id": "leprechaun",
                "peaceful": 0
              }
            ]
          ]
        ],
        [
          "room",
          [
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
              "monster",
              {
                "id": "leprechaun",
                "peaceful": 0
              }
            ],
            [
              "monster",
              {
                "id": "water nymph",
                "peaceful": 0
              }
            ]
          ]
        ],
        [
          "random_corridors"
        ]
      ]
    }
  },
  "Samurai": {
    "a": {
      "source": "Sam-fila.lua",
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
          "noflip"
        ],
        [
          "level_init",
          {
            "style": "mines",
            "fg": ".",
            "bg": "P",
            "smoothed": true,
            "joined": true,
            "walled": true
          }
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
          "d"
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
          "wolf"
        ],
        [
          "monster",
          "stalker"
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
    },
    "b": {
      "source": "Sam-filb.lua",
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
          [
            "-------------                                  -------------",
            "|...........|                                  |...........|",
            "|...-----...|----------------------------------|...-----...|",
            "|...|   |...|..................................|...|   |...|",
            "|...-----..........................................-----...|",
            "|...........|--S----------------------------S--|...........|",
            "----...--------.|..........................|.--------...----",
            "   |...|........+..........................+........|...|   ",
            "   |...|........+..........................+........|...|   ",
            "----...--------.|..........................|.--------...----",
            "|...........|--S----------------------------S--|...........|",
            "|...-----..........................................-----...|",
            "|...|   |...|..................................|...|   |...|",
            "|...-----...|----------------------------------|...-----...|",
            "|...........|                                  |...........|",
            "-------------                                  -------------"
          ]
        ],
        [
          "region",
          [
            0,
            0,
            59,
            15
          ],
          "unlit"
        ],
        [
          "door",
          "closed",
          16,
          7
        ],
        [
          "door",
          "closed",
          16,
          8
        ],
        [
          "door",
          "closed",
          43,
          7
        ],
        [
          "door",
          "closed",
          43,
          8
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
          "d"
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
  "Tourist": {
    "a": {
      "source": "Tou-fila.lua",
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
          "noflip"
        ],
        [
          "level_init",
          {
            "style": "mines",
            "fg": ".",
            "bg": " ",
            "smoothed": true,
            "joined": true,
            "walled": true
          }
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
          "monster",
          {
            "id": "soldier",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "soldier",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "soldier",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "soldier",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "soldier",
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
            "class": "C",
            "peaceful": 0
          }
        ]
      ]
    },
    "b": {
      "source": "Tou-filb.lua",
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
          "noflip"
        ],
        [
          "level_init",
          {
            "style": "mines",
            "fg": ".",
            "bg": " ",
            "smoothed": true,
            "joined": true,
            "walled": true
          }
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
          "monster",
          {
            "id": "soldier",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "captain",
            "peaceful": 0
          }
        ],
        [
          "monster",
          {
            "id": "captain",
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
            "class": "H",
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
          "s"
        ]
      ]
    }
  },
  "Valkyrie": {
    "a": {
      "source": "Val-fila.lua",
      "operations": [
        [
          "level_init",
          {
            "style": "solidfill",
            "fg": "I"
          }
        ],
        [
          "level_flags",
          "mazelevel",
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
            "joined": true,
            "lit": 1,
            "walled": false
          }
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
            "id": "fire giant",
            "peaceful": 0
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
        ]
      ]
    },
    "b": {
      "source": "Val-filb.lua",
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
          "icedpools",
          "noflip"
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
          "stair",
          "up"
        ],
        [
          "stair",
          "down"
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
          "trap"
        ],
        [
          "trap"
        ]
      ]
    }
  }
};
