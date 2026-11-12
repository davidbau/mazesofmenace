export default "\n" + // -- NetHack Healer Hea-strt.lua	$NHDT-Date: 1652196004 2022/05/10 15:20:04 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.2 $
"\n" + // --	Copyright (c) 1989 by Jean-Christophe Collet
"\n" + // --	Copyright (c) 1991, 1993 by M. Stephenson, P. Winner
"\n" + // -- NetHack may be freely redistributed.  See license for details.
"\n" + // --
"\n" + // --
"\n" + // --	The "start" level for the quest.
"\n" + // --
"\n" + // --	Here you meet your (besieged) class leader, Hippocrates
"\n" + // --	and receive your quest assignment.
"\n" + // --
`des.level_init({ style = "solidfill", fg = " " });

des.level_flags("mazelevel", "noteleport", "hardfloor")

des.map([[
PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
PPPP........PPPP.....PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP.P..PPPPP......PPPPPPPP
PPP..........PPPP...PPPPP.........................PPPP..PPPPP........PPPPPPP
PP............PPPPPPPP..............................PPP...PPPP......PPPPPPPP
P.....PPPPPPPPPPPPPPP................................PPPPPPPPPPPPPPPPPPPPPPP
PPPP....PPPPPPPPPPPP...................................PPPPP.PPPPPPPPPPPPPPP
PPPP........PPPPP.........-----------------------........PP...PPPPPPP.....PP
PPP............PPPPP....--|.|......S..........S.|--.....PPPP.PPPPPPP.......P
PPPP..........PPPPP.....|.S.|......-----------|S|.|......PPPPPP.PPP.......PP
PPPPPP......PPPPPP......|.|.|......|...|......|.|.|.....PPPPPP...PP.......PP
PPPPPPPPPPPPPPPPPPP.....+.|.|......S.\\.S......|.|.+......PPPPPP.PPPP.......P
PPP...PPPPP...PPPP......|.|.|......|...|......|.|.|.......PPPPPPPPPPP.....PP
PP.....PPP.....PPP......|.|S|-----------......|.S.|......PPPPPPPPPPPPPPPPPPP
PPP..PPPPP...PPPP.......--|.S..........S......|.|--.....PPPPPPPPP....PPPPPPP
PPPPPPPPPPPPPPPP..........-----------------------..........PPPPP..........PP
PPPPPPPPPPPPPPPPP........................................PPPPPP............P
PPP.............PPPP...................................PPP..PPPP..........PP
PP...............PPPPP................................PPPP...PPPP........PPP
PPP.............PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP....PPPPPP
PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
]]);

des.replace_terrain({ region={01,01, 74,18}, fromterrain="P", toterrain=".", chance=10 })

` + "\n" + // -- Dungeon Description
`des.region(selection.area(00,00,75,19), "lit")
` + "\n" + // -- Stairs
`des.stair("down", 37,9)
` + "\n" + // -- Portal arrival point
`des.levregion({ region = {04,12,04,12}, type="branch" })
` + "\n" + // -- altar for the Temple
`des.altar({ x=32,y=09,align="neutral",type="altar" })
` + "\n" + // -- Doors
`des.door("locked",24,10)
des.door("closed",26,08)
des.door("closed",27,12)
des.door("locked",28,13)
des.door("closed",35,07)
des.door("locked",35,10)
des.door("locked",39,10)
des.door("closed",39,13)
des.door("locked",46,07)
des.door("closed",47,08)
des.door("closed",48,12)
des.door("locked",50,10)
` + "\n" + // -- Hippocrates
`des.monster({ id = "Hippocrates", coord = {37, 10}, inventory = function()
   des.object({ id = "silver dagger", spe = 5 });
end })
` + "\n" + // -- The treasure of Hippocrates
`des.object("chest", 37, 10)
` + "\n" + // -- intern guards for the audience chamber
`des.monster("attendant", 29, 08)
des.monster("attendant", 29, 09)
des.monster("attendant", 29, 10)
des.monster("attendant", 29, 11)
des.monster("attendant", 40, 09)
des.monster("attendant", 40, 10)
des.monster("attendant", 40, 11)
des.monster("attendant", 40, 13)
` + "\n" + // -- Non diggable walls
`des.non_diggable(selection.area(00,00,75,19))
` + "\n" + // -- Random traps
`des.trap()
des.trap()
des.trap()
des.trap()
des.trap()
des.trap()
` + "\n" + // -- Monsters on siege duty.
`des.monster("rabid rat")
des.monster("rabid rat")
des.monster("rabid rat")
des.monster("rabid rat")
des.monster("rabid rat")
des.monster("rabid rat")
des.monster("rabid rat")
des.monster("rabid rat")
des.monster("rabid rat")
des.monster("rabid rat")
des.monster("giant eel")
des.monster("shark")
des.monster(";")
des.monster({ class = "D", peaceful=0 })
des.monster({ class = "D", peaceful=0 })
des.monster({ class = "D", peaceful=0 })
des.monster({ class = "D", peaceful=0 })
des.monster({ class = "D", peaceful=0 })
des.monster({ class = "S", peaceful=0 })
des.monster({ class = "S", peaceful=0 })
des.monster({ class = "S", peaceful=0 })
des.monster({ class = "S", peaceful=0 })
des.monster({ class = "S", peaceful=0 })
`;
