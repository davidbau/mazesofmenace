export default "\n" + // -- NetHack Tourist Tou-filb.lua	$NHDT-Date: 1652196015 2022/05/10 15:20:15 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.2 $
"\n" + // --	Copyright (c) 1989 by Jean-Christophe Collet
"\n" + // --	Copyright (c) 1991,92 by M. Stephenson, P. Winner
"\n" + // -- NetHack may be freely redistributed.  See license for details.
"\n" + // --
`des.level_init({ style = "solidfill", fg = " " });

des.level_flags("mazelevel", "noflip");

des.level_init({ style="mines", fg=".", bg=" ", smoothed=true, joined=true, walled=true })

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
des.object()
des.object()
` + "\n" + // --
`des.trap()
des.trap()
des.trap()
des.trap()
` + "\n" + // --
`des.monster({ id = "soldier", peaceful = 0 })
des.monster({ id = "captain", peaceful = 0 })
des.monster({ id = "captain", peaceful = 0 })
des.monster({ class = "H", peaceful = 0 })
des.monster({ class = "H", peaceful = 0 })
des.monster({ class = "C", peaceful = 0 })
des.monster("s")
`;
