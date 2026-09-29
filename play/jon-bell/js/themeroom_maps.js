// @ts-nocheck
// themeroom_maps.js — Lua map strings from dat/themerms.lua (des.map map-first rooms).
// C ref: nethack-c/dat/themerms.lua + sp_lev.c mapfrag_fromstr / lspo_map.
export const THEMEROOM_DES_MAPS = {
    'L-shaped': {
        map: `-----xxx
|...|xxx
|...|xxx
|...----
|......|
|......|
|......|
--------`,
        filler: [1, 1],
    },
    'L-shaped, rot 1': {
        map: `xxx-----
xxx|...|
xxx|...|
----...|
|......|
|......|
|......|
--------`,
        filler: [5, 1],
    },
    'L-shaped, rot 2': {
        map: `--------
|......|
|......|
|......|
----...|
xxx|...|
xxx|...|
xxx-----`,
        filler: [1, 1],
    },
    'L-shaped, rot 3': {
        map: `--------
|......|
|......|
|......|
|...----
|...|xxx
|...|xxx
-----xxx`,
        filler: [1, 1],
    },
    'Blocked center': {
        map: `-----------
|.........|
|.........|
|.........|
|...LLL...|
|...LLL...|
|...LLL...|
|.........|
|.........|
|.........|
-----------
`,
        filler: [1, 1],
    },
    'Circular, small': {
        map: `xx---xx
x--.--x
--...--
|.....|
--...--
x--.--x
xx---xx`,
        filler: [3, 3],
    },
    'Circular, medium': {
        map: `xx-----xx
x--...--x
--.....--
|.......|
|.......|
|.......|
--.....--
x--...--x
xx-----xx`,
        filler: [4, 4],
    },
    'Circular, big': {
        map: `xxx-----xxx
x---...---x
x-.......-x
--.......--
|.........|
|.........|
|.........|
--.......--
x-.......-x
x---...---x
xxx-----xxx`,
        filler: [5, 5],
    },
    'T-shaped': {
        map: `xxx-----xxx
xxx|...|xxx
xxx|...|xxx
----...----
|.........|
|.........|
|.........|
-----------`,
        filler: [5, 5],
    },
    'T-shaped, rot 1': {
        map: `-----xxx
|...|xxx
|...|xxx
|...----
|......|
|......|
|......|
|...----
|...|xxx
|...|xxx
-----xxx`,
        filler: [2, 2],
    },
    'T-shaped, rot 2': {
        map: `-----------
|.........|
|.........|
|.........|
----...----
xxx|...|xxx
xxx|...|xxx
xxx-----xxx`,
        filler: [2, 2],
    },
    'T-shaped, rot 3': {
        map: `xxx-----
xxx|...|
xxx|...|
----...|
|......|
|......|
|......|
----...|
xxx|...|
xxx|...|
xxx-----`,
        filler: [5, 5],
    },
    'S-shaped': {
        map: `-----xxx
|...|xxx
|...|xxx
|...----
|......|
|......|
|......|
----...|
xxx|...|
xxx|...|
xxx-----`,
        filler: [2, 2],
    },
    'S-shaped, rot 1': {
        map: `xxx--------
xxx|......|
xxx|......|
----......|
|......----
|......|xxx
|......|xxx
--------xxx`,
        filler: [5, 5],
    },
    'Z-shaped': {
        map: `xxx-----
xxx|...|
xxx|...|
----...|
|......|
|......|
|......|
|...----
|...|xxx
|...|xxx
-----xxx`,
        filler: [5, 5],
    },
    'Z-shaped, rot 1': {
        map: `--------xxx
|......|xxx
|......|xxx
|......----
----......|
xxx|......|
xxx|......|
xxx--------`,
        filler: [2, 2],
    },
    'Cross': {
        map: `xxx-----xxx
xxx|...|xxx
xxx|...|xxx
----...----
|.........|
|.........|
|.........|
----...----
xxx|...|xxx
xxx|...|xxx
xxx-----xxx`,
        filler: [6, 6],
    },
    'Four-leaf clover': {
        map: `-----x-----
|...|x|...|
|...---...|
|.........|
---.....---
xx|.....|xx
---.....---
|.........|
|...---...|
|...|x|...|
-----x-----`,
        filler: [6, 6],
    },
    // C ref: themerms.lua "Water-surrounded vault" — moat `}` map; special contents (no filler_region).
    'Water-surrounded vault': {
        map: `}}}}}}
}----}
}|..|}
}|..|}
}----}
}}}}}}`,
        filler: null,
        waterVault: true,
    },
};
