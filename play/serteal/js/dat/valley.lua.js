export default "\n" + // -- NetHack gehennom valley.lua	$NHDT-Date: 1652196038 2022/05/10 15:20:38 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.4 $
"\n" + // --	Copyright (c) 1989 by Jean-Christophe Collet
"\n" + // --	Copyright (c) 1992 by M. Stephenson and Izchak Miller
"\n" + // -- NetHack may be freely redistributed.  See license for details.
"\n" + // --
"\n" + // --
`
des.level_init({ style = "solidfill", fg = " " });

des.level_flags("mazelevel", "noteleport", "hardfloor", "nommap", "temperate");

des.map([[
----------------------------------------------------------------------------
|...S.|..|.....|  |.....-|      |................|   |...............| |...|
|---|.|.--.---.|  |......--- ----..........-----.-----....---........---.-.|
|   |.|.|..| |.| --........| |.............|   |.......---| |-...........--|
|   |...S..| |.| |.......-----.......------|   |--------..---......------- |
|----------- |.| |-......| |....|...-- |...-----................----       |
|.....S....---.| |.......| |....|...|  |..............-----------          |
|.....|.|......| |.....--- |......---  |....---.......|                    |
|.....|.|------| |....--   --....-- |-------- ----....---------------      |
|.....|--......---BBB-|     |...--  |.......|    |..................|      |
|..........||........-|    --...|   |.......|    |...||.............|      |
|.....|...-||-........------....|   |.......---- |...||.............--     |
|.....|--......---...........--------..........| |.......---------...--    |
|.....| |------| |--.......--|   |..B......----- -----....| |.|  |....---  |
|.....| |......--| ------..| |----..B......|       |.--------.-- |-.....---|
|------ |........|  |.|....| |.....----BBBB---------...........---.........|
|       |........|  |...|..| |.....|  |-.............--------...........---|
|       --.....-----------.| |....-----.....----------     |.........----  |
|        |..|..B...........| |.|..........|.|              |.|........|    |
----------------------------------------------------------------------------
]]);

` + "\n" + // -- Make the path somewhat unpredictable
"\n" + // -- If you get "lucky", you may have to go through all three graveyards.
`if percent(50) then
   des.terrain(selection.line(50,8, 53,8), '-')
   des.terrain(selection.line(40,8, 43,8), 'B')
end
if percent(50) then
   des.terrain({ x=27, y=12, typ='|' })
   des.terrain(selection.line(27,3, 29,3), 'B')
   des.terrain({ x=28, y=2, typ='-' })
end
if percent(50) then
   des.terrain(selection.line(16,10, 16,11), '|')
   des.terrain(selection.line(9,13, 14,13), 'B')
end


` + "\n" + // -- Dungeon Description
"\n" + // -- The shrine to Moloch.
`des.region({ region={01,06, 05,14},lit=1,type="temple",filled=2 })
` + "\n" + // -- The Morgues
`des.region({ region={19,01, 24,08},lit=0,type="morgue",filled=1,irregular=1 })
des.region({ region={09,14, 16,18},lit=0,type="morgue",filled=1,irregular=1 })
des.region({ region={37,09, 43,14},lit=0,type="morgue",filled=1,irregular=1 })
` + "\n" + // -- Stairs
`des.stair("down", 01,01)
` + "\n" + // -- Branch location
`des.levregion({ type="branch", region={66,17,66,17} })
des.teleport_region({ region = {58,09,72,18}, dir="down" })

` + "\n" + // -- Secret Doors
`des.door("locked",04,01)
des.door("locked",08,04)
des.door("locked",06,06)

` + "\n" + // -- The altar of Moloch.
`des.altar({ x=03,y=10,align="noalign", type="shrine" })

` + "\n" + // -- Non diggable walls - everywhere!
`des.non_diggable(selection.area(00,00,75,19))

` + "\n" + // -- Objects
"\n" + // -- **LOTS** of dead bodies (all human).
"\n" + // -- note: no priest(esse)s or monks - maybe Moloch has a *special*
"\n" + // --       fate reserved for members of *those* classes.
"\n" + // --
`des.object({ id="corpse",montype="archeologist" })
des.object({ id="corpse",montype="archeologist" })
des.object({ id="corpse",montype="barbarian" })
des.object({ id="corpse",montype="barbarian" })
des.object({ id="corpse",montype="caveman" })
des.object({ id="corpse",montype="cavewoman" })
des.object({ id="corpse",montype="healer" })
des.object({ id="corpse",montype="healer" })
des.object({ id="corpse",montype="knight" })
des.object({ id="corpse",montype="knight" })
des.object({ id="corpse",montype="ranger" })
des.object({ id="corpse",montype="ranger" })
des.object({ id="corpse",montype="rogue" })
des.object({ id="corpse",montype="rogue" })
des.object({ id="corpse",montype="samurai" })
des.object({ id="corpse",montype="samurai" })
des.object({ id="corpse",montype="tourist" })
des.object({ id="corpse",montype="tourist" })
des.object({ id="corpse",montype="valkyrie" })
des.object({ id="corpse",montype="valkyrie" })
des.object({ id="corpse",montype="wizard" })
des.object({ id="corpse",montype="wizard" })
` + "\n" + // --
"\n" + // -- Some random weapons and armor.
"\n" + // --
`des.object("[")
des.object("[")
des.object("[")
des.object("[")
des.object(")")
des.object(")")
des.object(")")
des.object(")")
` + "\n" + // --
"\n" + // -- Some random loot.
"\n" + // --
`des.object("ruby")
des.object("*")
des.object("*")
des.object("!")
des.object("!")
des.object("!")
des.object("?")
des.object("?")
des.object("?")
des.object("/")
des.object("/")
des.object("=")
des.object("=")
des.object("+")
des.object("+")
des.object("(")
des.object("(")
des.object("(")

` + "\n" + // -- (Not so) Random traps.
`des.trap("spiked pit", 05,02)
des.trap("spiked pit", 14,05)
des.trap("sleep gas", 03,01)
des.trap("board", 21,12)
des.trap("board")
des.trap("dart", 60,01)
des.trap("dart", 26,17)
des.trap("anti magic")
des.trap("anti magic")
des.trap("magic")
des.trap("magic")

` + "\n" + // -- Random monsters.
"\n" + // -- The ghosts.
`des.monster("ghost")
des.monster("ghost")
des.monster("ghost")
des.monster("ghost")
des.monster("ghost")
des.monster("ghost")
` + "\n" + // -- Add a few bats for atmosphere.
`des.monster("vampire bat")
des.monster("vampire bat")
des.monster("vampire bat")
` + "\n" + // -- And a lich for good measure.
`des.monster("L")
` + "\n" + // -- Some undead nasties for good measure
`des.monster("V")
des.monster("V")
des.monster("V")
des.monster("Z")
des.monster("Z")
des.monster("Z")
des.monster("Z")
des.monster("M")
des.monster("M")
des.monster("M")
des.monster("M")
`;
