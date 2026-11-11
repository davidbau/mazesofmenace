export default "\n" + // -- NetHack gehennom asmodeus.lua	$NHDT-Date: 1652196020 2022/05/10 15:20:20 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.2 $
"\n" + // --	Copyright (c) 1989 by Jean-Christophe Collet
"\n" + // --	Copyright (c) 1992 by M. Stephenson and Izchak Miller
"\n" + // -- NetHack may be freely redistributed.  See license for details.
"\n" + // --
`des.level_init({ style="mazegrid", bg ="-" });

des.level_flags("mazelevel")

local tmpbounds = selection.match("-");
local bnds = tmpbounds:bounds();
local bounds2 = selection.fillrect(bnds.lx, bnds.ly + 1, bnds.hx - 2, bnds.hy - 1);

` + "\n" + // -- First part
`local asmo1 = des.map({ halign = "half-left", valign = "center", map = [[
---------------------
|.............|.....|
|.............S.....|
|---+------------...|
|.....|.........|-+--
|..---|.........|....
|..|..S.........|....
|..|..|.........|....
|..|..|.........|-+--
|..|..-----------...|
|..S..........|.....|
---------------------
]], contents = function(rm)
` + "\n" + // -- Doors
`   des.door("closed",04,03)
   des.door("locked",18,04)
   des.door("closed",18,08)
` + "\n" + // --
`   des.stair("down", 13,07)
` + "\n" + // -- Non diggable walls
`   des.non_diggable(selection.area(00,00,20,11))
` + "\n" + // -- Entire main area
`   des.region(selection.area(01,01,20,10),"unlit")
` + "\n" + // -- The fellow in residence
`   des.monster("Asmodeus",12,07)
` + "\n" + // -- Some random weapons and armor.
`   des.object("[")
   des.object("[")
   des.object(")")
   des.object(")")
   des.object("*")
   des.object("!")
   des.object("!")
   des.object("?")
   des.object("?")
   des.object("?")
` + "\n" + // -- Some traps.
`   des.trap("spiked pit", 05,02)
   des.trap("fire", 08,06)
   des.trap("sleep gas")
   des.trap("anti magic")
   des.trap("fire")
   des.trap("magic")
   des.trap("magic")
` + "\n" + // -- Random monsters.
`   des.monster("ghost",11,07)
   des.monster("horned devil",10,05)
   des.monster("L")
` + "\n" + // -- Some Vampires for good measure
`   des.monster("V")
   des.monster("V")
   des.monster("V")
end });

des.levregion({ region={01,00,6,20}, region_islev=1, exclude={6,1,70,16}, exclude_islev=1, type="stair-up" });

des.levregion({ region={01,00,6,20}, region_islev=1, exclude={6,1,70,16}, exclude_islev=1, type="branch" });
des.teleport_region({ region = {01,00,6,20}, region_islev=1, exclude={6,1,70,16}, exclude_islev=1 })

` + "\n" + // -- Second part
`local asmo2 = des.map({ halign = "half-right", valign = "center", map = [[
---------------------------------
................................|
................................+
................................|
---------------------------------
]], contents = function(rm)
   des.mazewalk(32,02,"east")
` + "\n" + // -- Non diggable walls
`   des.non_diggable(selection.area(00,00,32,04))
   des.door("closed",32,02)
   des.monster("&")
   des.monster("&")
   des.monster("&")
   des.trap("anti magic")
   des.trap("fire")
   des.trap("magic")
end });

local protected = bounds2:negate() | asmo1 | asmo2;
hell_tweaks(protected);
`;
