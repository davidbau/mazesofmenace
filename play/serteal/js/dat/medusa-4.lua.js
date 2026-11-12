export default "\n" + // -- NetHack medusa medusa-4.lua	$NHDT-Date: 1716152274 2024/05/19 20:57:54 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.8 $
"\n" + // --	Copyright (c) 1989 by Jean-Christophe Collet
"\n" + // --	Copyright (c) 1990, 1991 by M. Stephenson
"\n" + // -- NetHack may be freely redistributed.  See license for details.
"\n" + // --
`des.level_init({ style = "solidfill", fg = " " });
des.level_flags("noteleport", "mazelevel")
` + "\n" + // --
"\n" + // -- Here the Medusa rules some slithery monsters from her 'palace', with
"\n" + // -- a yellow dragon nesting in the backyard.
"\n" + // --
`des.map([[
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
}}}}}}}}}}}}}}........}}}}}}}}}}}}}}}}}}}}}}}..}}}.....}}}}}}}}}}}----|}}}}}
}}}}}}..----------F-.....}}}}}}}}}}}}}}}}..---...}}}}....T.}}}}}}}....|}}}}}
}}}.....|...F......S}}}}....}}}}}}}...}}.....|}}.}}}}}}}......}}}}|......}}}
}}}.....+...|..{...|}}}}}}}}}}}}.....}}}}|...|}}}}}}}}}}}.}}}}}}}}----.}}}}}
}}......|...|......|}}}}}}}}}......}}}}}}|.......}}}}}}}}}}}}}..}}}}}...}}}}
}}|-+--F|-+--....|F|-|}}}}}....}}}....}}}-----}}.....}}}}}}}......}}}}.}}}}}
}}|...}}|...|....|}}}|}}}}}}}..}}}}}}}}}}}}}}}}}}}}....}}}}}}}}....T.}}}}}}}
}}|...}}F...+....F}}}}}}}..}}}}}}}}}}}}}}...}}}}}}}}}}}}}}}}}}}}}}....}}..}}
}}|...}}|...|....|}}}|}....}}}}}}....}}}...}}}}}...}}}}}}}}}}}}}}}}}.....}}}
}}--+--F|-+--....-F|-|....}}}}}}}}}}.T...}}}}....---}}}}}}}}}}}}}}}}}}}}}}}}
}}......|...|......|}}}}}.}}}}}}}}}....}}}}}}}.....|}}}}}}}}}.}}}}}}}}}}}}}}
}}}}....+...|..{...|.}}}}}}}}}}}}}}}}}}}}}}}}}}.|..|}}}}}}}......}}}}...}}}}
}}}}}}..|...F......|...}}}}}}}}}}..---}}}}}}}}}}--.-}}}}}....}}}}}}....}}}}}
}}}}}}}}-----S----F|....}}}}}}}}}|...|}}}}}}}}}}}}...}}}}}}...}}}}}}..}}}}}}
}}}}}}}}}..............T...}}}}}.|.......}}}}}}}}}}}}}}..}...}.}}}}....}}}}}
}}}}}}}}}}....}}}}...}...}}}}}.......|.}}}}}}}}}}}}}}.......}}}}}}}}}...}}}}
}}}}}}}}}}..}}}}}}}}}}.}}}}}}}}}}-..--.}}}}}}}}..}}}}}}..T...}}}..}}}}}}}}}}
}}}}}}}}}...}}}}}}}}}}}}}}}}}}}}}}}...}}}}}}}....}}}}}}}.}}}..}}}...}}}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.}}}}}}....}}}}}}}}}}}}}}}}}}}...}}}}}}
}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
]]);

` + "\n" + // --
"\n" + // -- place handling is similar to medusa-3.lua except that there are 4
"\n" + // -- downstairs-eligible rooms rather than 3, and only 2 of them are used
`local place = selection.new();
` + "\n" + // -- each of these spots are inside a distinct room
`place:set(04,08);
place:set(10,04);
place:set(10,08);
place:set(10,12);

` + "\n" + // -- location of Medusa and downstairs and Perseus's statue
`local medloc = place:rndcoord(1,1);
` + "\n" + // -- specific location for some other statue in a different downstairs-eligible
"\n" + // -- room, to prevent object detection from becoming a trivial way to pinpoint
"\n" + // -- Medusa's location
"\n" + // -- [usefulness depends on future STATUE->dknown changes in nethack's core]
`local altloc = place:rndcoord(1,1);

` + "\n" + // --
`des.region(selection.area(00,00,74,19),"lit")
` + "\n" + // -- fixup_special hack: The first "room" region in Medusa levels gets filled
"\n" + // -- with some leaderboard statues, so this needs to be a room; setting
"\n" + // -- irregular=1 will force this
`des.region({ region={13,03, 18,13}, lit=1, type="ordinary", irregular=1 })
` + "\n" + // --
`des.teleport_region({ region = {64,01,74,17}, dir="down" });
des.teleport_region({ region = {02,02,18,13}, dir="up" });
` + "\n" + // --
`des.levregion({ region = {67,01,74,20}, type="stair-up" });

` + "\n" + // -- place the downstairs at the same spot where Medusa will be placed
`des.stair("down", medloc)
` + "\n" + // --
`des.door("locked",04,06)
des.door("locked",04,10)
des.door("locked",08,04)
des.door("locked",08,12)
des.door("locked",10,06)
des.door("locked",10,10)
des.door("locked",12,08)
` + "\n" + // --
`des.levregion({ region = {27,00,79,20}, type="branch" });
` + "\n" + // --
`des.non_diggable(selection.area(01,01,22,14));
` + "\n" + // --
`des.object("crystal ball", 07,08)
` + "\n" + // --
"\n" + // -- same spot as Medusa plus downstairs
`des.object({ id="statue", coord=medloc, buc="uncursed",
                      montype="knight", historic=1, male=1,name="Perseus",
                      contents = function()
                         if percent(75) then
                            des.object({ id = "shield of reflection", buc="cursed", spe=0 })
                         end
                         if percent(25) then
                            des.object({ id = "levitation boots", spe=0 })
                         end
                         if percent(50) then
                            des.object({ id = "scimitar", buc="blessed", spe=2 })
                         end
                         if percent(50) then
                            des.object("sack")
                         end
                      end
});
` + "\n" + // --
"\n" + // -- first random statue is in one of the designated stair rooms but not the
"\n" + // -- one with Medusa plus downstairs
`des.object({ id = "statue", coord=altloc, contents=0 })
des.object({ id = "statue", contents=0 })
des.object({ id = "statue", contents=0 })
des.object({ id = "statue", contents=0 })
des.object({ id = "statue", contents=0 })
des.object({ id = "statue", contents=0 })
des.object({ id = "statue", contents=0 })
for i=1,8 do
   des.object()
end
` + "\n" + // --
`for i=1,7 do
   des.trap()
end
` + "\n" + // --
"\n" + // -- place Medusa before placing other monsters so that they won't be able to
"\n" + // -- unintentionally steal her spot on the downstairs
`des.monster({ id = "Medusa", coord=medloc, asleep=1 })
des.monster("kraken", 07,07)
` + "\n" + // --
"\n" + // -- the nesting dragon
`des.monster({ id = "yellow dragon", x=05, y=04, asleep=1 })
if percent(50) then
   des.monster({ id = "baby yellow dragon", x=04,y=04, asleep=1 })
end
if percent(25) then
   des.monster({ id = "baby yellow dragon", x=04, y=05, asleep=1 })
end
des.object({ id = "egg", x=05, y=04, montype="yellow dragon" });
if percent(50) then
   des.object({ id = "egg", x=05, y=04, montype="yellow dragon" });
end
if percent(25) then
   des.object({ id = "egg", x=05, y=04, montype="yellow dragon" });
end
` + "\n" + // --
`des.monster("giant eel")
des.monster("giant eel")
des.monster("jellyfish")
des.monster("jellyfish")
for i=1,14 do
   des.monster("S")
end
for i=1,4 do
   des.monster("black naga hatchling")
   des.monster("black naga")
end

` + "\n" + // --#medusa-4.lua
``;
