export default "\n" + // -- NetHack Priest Pri-strt.lua	$NHDT-Date: 1652196009 2022/05/10 15:20:09 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.5 $
"\n" + // --	Copyright (c) 1989 by Jean-Christophe Collet
"\n" + // --	Copyright (c) 1991-2 by M. Stephenson
"\n" + // -- NetHack may be freely redistributed.  See license for details.
"\n" + // --
"\n" + // --
"\n" + // --	The "start" level for the quest.
"\n" + // --
"\n" + // --	Here you meet your (besieged) class leader, High Priest
"\n" + // --	and receive your quest assignment.
"\n" + // --
`des.level_init({ style = "solidfill", fg = " " });

des.level_flags("mazelevel", "noteleport", "hardfloor")

des.map([[
............................................................................
............................................................................
............................................................................
....................------------------------------------....................
....................|................|.....|.....|.....|....................
....................|..------------..|--+-----+-----+--|....................
....................|..|..........|..|.................|....................
....................|..|..........|..|+---+---+-----+--|....................
..................---..|..........|......|...|...|.....|....................
..................+....|..........+......|...|...|.....|....................
..................+....|..........+......|...|...|.....|....................
..................---..|..........|......|...|...|.....|....................
....................|..|..........|..|+-----+---+---+--|....................
....................|..|..........|..|.................|....................
....................|..------------..|--+-----+-----+--|....................
....................|................|.....|.....|.....|....................
....................------------------------------------....................
............................................................................
............................................................................
............................................................................
]]);
` + "\n" + // -- Dungeon Description
`des.region(selection.area(00,00,75,19), "lit")
des.region({ region={24,06, 33,13}, lit=1, type="temple", filled=2 })

des.replace_terrain({ region={00,00, 10,19}, fromterrain=".", toterrain="T", chance=10 })
des.replace_terrain({ region={65,00, 75,19}, fromterrain=".", toterrain="T", chance=10 })
des.terrain({05,04}, ".")

local spacelocs = selection.floodfill(05,04);

` + "\n" + // -- Portal arrival point
`des.levregion({ region = {05,04,05,04}, type="branch" })
` + "\n" + // -- Stairs
`des.stair("down", 52,09)
` + "\n" + // -- Doors
`des.door("locked",18,09)
des.door("locked",18,10)
des.door("closed",34,09)
des.door("closed",34,10)
des.door("closed",40,05)
des.door("closed",46,05)
des.door("closed",52,05)
des.door("locked",38,07)
des.door("closed",42,07)
des.door("closed",46,07)
des.door("closed",52,07)
des.door("locked",38,12)
des.door("closed",44,12)
des.door("closed",48,12)
des.door("closed",52,12)
des.door("closed",40,14)
des.door("closed",46,14)
des.door("closed",52,14)
` + "\n" + // -- Unattended Altar - unaligned due to conflict - player must align it.
`des.altar({ x=28, y=09, align="noalign", type="altar" })
` + "\n" + // -- High Priest
`des.monster({ id = "Arch Priest", coord = {28, 10}, inventory = function()
   des.object({ id = "robe", spe = 4 });
   des.object({ id = "mace", spe = 4 });
end })
` + "\n" + // -- The treasure of High Priest
`des.object("chest", 27, 10)
` + "\n" + // -- knight guards for the audience chamber
`des.monster("acolyte", 32, 07)
des.monster("acolyte", 32, 08)
des.monster("acolyte", 32, 11)
des.monster("acolyte", 32, 12)
des.monster("acolyte", 33, 07)
des.monster("acolyte", 33, 08)
des.monster("acolyte", 33, 11)
des.monster("acolyte", 33, 12)
` + "\n" + // -- Non diggable walls
`des.non_diggable(selection.area(18,03,55,16))
` + "\n" + // -- Random traps
`for i = 1, 2 do
   des.trap("dart", spacelocs:rndcoord(1))
end
des.trap()
des.trap()
des.trap()
des.trap()
` + "\n" + // -- Monsters on siege duty.
`for i = 1, 12 do
   des.monster("human zombie", spacelocs:rndcoord(1));
end
`;
