export default "\n" + // -- NetHack Samurai Sam-filb.lua	$NHDT-Date: 1652196013 2022/05/10 15:20:13 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
"\n" + // --	Copyright (c) 1989 by Jean-Christophe Collet
"\n" + // --	Copyright (c) 1991-92 by M. Stephenson, P. Winner
"\n" + // -- NetHack may be freely redistributed.  See license for details.
"\n" + // --
`des.level_init({ style = "solidfill", fg = " " });

des.level_flags("mazelevel");

des.map([[
-------------                                  -------------
|...........|                                  |...........|
|...-----...|----------------------------------|...-----...|
|...|   |...|..................................|...|   |...|
|...-----..........................................-----...|
|...........|--S----------------------------S--|...........|
----...--------.|..........................|.--------...----
   |...|........+..........................+........|...|   
   |...|........+..........................+........|...|   
----...--------.|..........................|.--------...----
|...........|--S----------------------------S--|...........|
|...-----..........................................-----...|
|...|   |...|..................................|...|   |...|
|...-----...|----------------------------------|...-----...|
|...........|                                  |...........|
-------------                                  -------------
]]);
des.region(selection.area(00,00,59,15), "unlit")
` + "\n" + // -- Doors
`des.door("closed",16,07)
des.door("closed",16,08)
des.door("closed",43,07)
des.door("closed",43,08)
` + "\n" + // --
`des.stair("up")
des.stair("down")
` + "\n" + // --
`des.object()
des.object()
des.object()
des.object()
des.object()
des.object()
des.object()
des.object()
des.object()
` + "\n" + // --
`des.monster("d")
des.monster("wolf")
des.monster("wolf")
des.monster("wolf")
des.monster("wolf")
des.monster("stalker")
des.monster("stalker")
des.monster("stalker")
` + "\n" + // --
`des.trap()
des.trap()
des.trap()
des.trap()
`;
