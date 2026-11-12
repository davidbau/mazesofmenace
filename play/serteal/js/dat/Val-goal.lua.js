export default "\n" + // -- NetHack Valkyrie Val-goal.lua	$NHDT-Date: 1652196017 2022/05/10 15:20:17 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.5 $
"\n" + // --	Copyright (c) 1989 by Jean-Christophe Collet
"\n" + // --	Copyright (c) 1991-2 by M. Stephenson
"\n" + // -- NetHack may be freely redistributed.  See license for details.
"\n" + // --
`des.level_init({ style = "solidfill", fg = "L" });

des.level_flags("mazelevel", "icedpools")

des.level_init({ style="mines", fg=".", bg="L", smoothed=true, joined=true, lit=1, walled=false })

des.map([[
xxxxxx.....................xxxxxxxx
xxxxx.......LLLLL.LLLLL......xxxxxx
xxxx......LLLLLLLLLLLLLLL......xxxx
xxxx.....LLL|---------|LLL.....xxxx
xxxx....LL|--.........--|LL.....xxx
x......LL|-...LLLLLLL...-|LL.....xx
.......LL|...LL.....LL...|LL......x
......LL|-..LL.......LL..-|LL......
......LL|.................|LL......
......LL|-..LL.......LL..-|LL......
.......LL|...LL.....LL...|LL.......
xx.....LL|-...LLLLLLL...-|LL......x
xxx.....LL|--.........--|LL.....xxx
xxxx.....LLL|---------|LLL...xxxxxx
xxxxx.....LLLLLLLLLLLLLLL...xxxxxxx
xxxxxx......LLLLL.LLLLL.....xxxxxxx
xxxxxxxxx..................xxxxxxxx
]]);
` + "\n" + // -- Dungeon Description
`des.region(selection.area(00,00,34,16), "lit")
` + "\n" + // -- Stairs
"\n" + // -- Note:  The up stairs are *intentionally* off of the map.
"\n" + // -- if the stairs are surrounded by lava, maybe give some room
`des.replace_terrain({ region = {44,09, 46,11}, fromterrain='L', toterrain='.', chance=50 });
des.stair("up", 45,10)
` + "\n" + // -- Non diggable walls
`des.non_diggable(selection.area(00,00,34,16))
` + "\n" + // -- Drawbridges; northern one opens from the south (portcullis) to further
"\n" + // -- north (lowered span), southern one from the north to further south
`des.drawbridge({ x=17, y=02, dir="south", state="random" })
if percent(75) then
   des.drawbridge({ x=17, y=14, dir="north", state="open" })
else
   des.drawbridge({ x=17, y=14, dir="north", state="random" })
end
` + "\n" + // -- Objects
`des.object({ id = "crystal ball", x=17, y=08, buc="blessed", spe=5, name="The Orb of Fate" })
des.object()
des.object()
des.object()
des.object()
des.object()
des.object()
des.object()
des.object()
des.object()
des.object()
des.object()
des.object()
des.object()
des.object()
` + "\n" + // -- Traps
`des.trap("board",13,08)
des.trap("board",21,08)
` + "\n" + // -- Random traps
`des.trap("fire")
des.trap("fire")
des.trap("fire")
des.trap("fire")
des.trap("board")
des.trap()
des.trap()
` + "\n" + // -- Random monsters.
`des.monster("Lord Surtur", 17, 08)
des.monster("fire ant")
des.monster("fire ant")
des.monster("fire ant")
des.monster("fire ant")
des.monster("a")
des.monster("a")
des.monster({ id = "fire giant", x=10, y=06, peaceful = 0 })
des.monster({ id = "fire giant", x=10, y=07, peaceful = 0 })
des.monster({ id = "fire giant", x=10, y=08, peaceful = 0 })
des.monster({ id = "fire giant", x=10, y=09, peaceful = 0 })
des.monster({ id = "fire giant", x=10, y=10, peaceful = 0 })
des.monster({ id = "fire giant", x=24, y=06, peaceful = 0 })
des.monster({ id = "fire giant", x=24, y=07, peaceful = 0 })
des.monster({ id = "fire giant", x=24, y=08, peaceful = 0 })
des.monster({ id = "fire giant", x=24, y=09, peaceful = 0 })
des.monster({ id = "fire giant", x=24, y=10, peaceful = 0 })
des.monster({ id = "fire giant", peaceful = 0 })
des.monster({ id = "fire giant", peaceful = 0 })
des.monster({ class = "H", peaceful = 0 })

` + "\n" + // --
"\n" + // --	The "fill" levels for the quest.
"\n" + // --
"\n" + // --	These levels are used to fill out any levels not occupied by specific
"\n" + // --	levels as defined above. "filla" is the upper filler, between the
"\n" + // --	start and locate levels, and "fillb" the lower between the locate
"\n" + // --	and goal levels.
"\n" + // --
``;
