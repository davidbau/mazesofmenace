export default "\n" + // -- NetHack mines minefill.lua	$NHDT-Date: 1652196028 2022/05/10 15:20:28 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.3 $
"\n" + // --	Copyright (c) 1989-95 by Jean-Christophe Collet
"\n" + // --	Copyright (c) 1991-95 by M. Stephenson
"\n" + // -- NetHack may be freely redistributed.  See license for details.
"\n" + // --
"\n" + // --
`
` + "\n" + // --	The "fill" level for the mines.
"\n" + // --
"\n" + // --	This level is used to fill out any levels not occupied by
"\n" + // --	specific levels.
"\n" + // --
`des.level_init({ style = "solidfill", fg = " " });

des.level_flags("mazelevel", "noflip");

des.level_init({ style="mines", fg=".", bg=" ", smoothed=true, joined=true, walled=true })

` + "\n" + // --
`des.stair("up")
des.stair("down")
` + "\n" + // --
`for i = 1,math.random(2, 5) do
   des.object("*")
end
des.object("(")
for i = 1,math.random(2, 4) do
   des.object()
end
if percent(75) then
   for i = 1,math.random(1, 2) do
      des.object("boulder")
   end
end
` + "\n" + // --
`for i = 1,math.random(6, 8) do
   des.monster("gnome")
end
des.monster("gnome lord")
des.monster("dwarf")
des.monster("dwarf")
des.monster("G")
des.monster("G")
des.monster(percent(50) and "h" or "G")
` + "\n" + // --
`des.trap()
des.trap()
des.trap()
des.trap()
des.trap()
des.trap()
`;
