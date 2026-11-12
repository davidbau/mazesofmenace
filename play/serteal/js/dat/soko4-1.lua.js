export default "\n" + // -- NetHack sokoban soko4-1.lua	$NHDT-Date: 1652196036 2022/05/10 15:20:36 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.2 $
"\n" + // --	Copyright (c) 1998-1999 by Kevin Hugo
"\n" + // -- NetHack may be freely redistributed.  See license for details.
"\n" + // --
"\n" + // --
"\n" + // -- In case you haven't played the game Sokoban, you'll learn
"\n" + // -- quickly.  This branch isn't particularly difficult, just time
"\n" + // -- consuming.  Some players may wish to skip this branch.
"\n" + // --
"\n" + // -- The following actions are currently permitted without penalty:
"\n" + // --   Carrying or throwing a boulder already in inventory
"\n" + // --     (player or nonplayer).
"\n" + // --   Teleporting boulders.
"\n" + // --   Digging in the floor.
"\n" + // -- The following actions are permitted, but with a luck penalty:
"\n" + // --   Breaking boulders.
"\n" + // --   Stone-to-fleshing boulders.
"\n" + // --   Creating new boulders (e.g., with a scroll of earth).
"\n" + // --   Jumping.
"\n" + // --   Being pulled by a thrown iron ball.
"\n" + // --   Hurtling through the air from Newton's 3rd law.
"\n" + // --   Squeezing past boulders when naked or as a giant.
"\n" + // -- These actions are not permitted:
"\n" + // --   Moving diagonally between two boulders and/or walls.
"\n" + // --   Pushing a boulder diagonally.
"\n" + // --   Picking up boulders (player or nonplayer).
"\n" + // --   Digging or walking through walls.
"\n" + // --   Teleporting within levels or between levels of this branch.
"\n" + // --   Using cursed potions of gain level.
"\n" + // --   Escaping a pit/hole (e.g., by flying, levitation, or
"\n" + // --     passing a dexterity check).
"\n" + // --   Bones files are not permitted.
`

` + "\n" + // --## Bottom (first) level of Sokoban ###
`des.level_init({ style = "solidfill", fg = " " });

des.level_flags("mazelevel", "noteleport", "hardfloor", "premapped", "sokoban", "solidify");

des.map([[
------  ----- 
|....|  |...| 
|....----...| 
|...........| 
|..|-|.|-|..| 
---------|.---
|......|.....|
|..----|.....|
--.|   |.....|
 |.|---|.....|
 |...........|
 |..|---------
 ----         
]]);
des.levregion({ region = {06,04,06,04}, type = "branch" })
des.stair("up", 06,06)
des.region(selection.area(00,00,13,12), "lit")
des.non_diggable(selection.area(00,00,13,12))
des.non_passwall(selection.area(00,00,13,12))

` + "\n" + // -- Boulders
`des.object("boulder",02,02)
des.object("boulder",02,03)
` + "\n" + // --
`des.object("boulder",10,02)
des.object("boulder",09,03)
des.object("boulder",10,04)
` + "\n" + // --
`des.object("boulder",08,07)
des.object("boulder",09,08)
des.object("boulder",09,09)
des.object("boulder",08,10)
des.object("boulder",10,10)

` + "\n" + // -- prevent monster generation over the (filled) pits
`des.exclusion({ type = "monster-generation", region = { 01,06, 07,11 } });

` + "\n" + // -- Traps
`des.trap("pit",04,06)

des.trap("pit",02,06)
des.trap("pit",02,07)
des.trap("pit",02,08)
des.trap("rolling boulder",02,09)

des.trap("pit",02,10)
des.trap("pit",03,10)
des.trap("pit",04,10)
des.trap("pit",05,10)
des.trap("pit",06,10)
des.trap("rolling boulder",07,10)

` + "\n" + // -- A little help
`des.object("scroll of earth",02,11)
des.object("scroll of earth",03,11)

` + "\n" + // -- Random objects
`des.object({ class = "%" });
des.object({ class = "%" });
des.object({ class = "%" });
des.object({ class = "%" });
des.object({ class = "=" });
des.object({ class = "/" });

`;
