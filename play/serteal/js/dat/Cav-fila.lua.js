export default "\n" + // -- NetHack Caveman Cav-fila.lua	$NHDT-Date: 1652196001 2022/05/10 15:20:01 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.2 $
"\n" + // --	Copyright (c) 1989 by Jean-Christophe Collet
"\n" + // --	Copyright (c) 1991 by M. Stephenson
"\n" + // -- NetHack may be freely redistributed.  See license for details.
"\n" + // --
`des.level_init({ style = "solidfill", fg = " " });

des.level_flags("mazelevel", "noflip");

des.level_init({ style = "mines", fg = ".", bg = " ", smoothed=true, joined=true, walled=true })

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
` + "\n" + // --
`des.trap()
des.trap()
des.trap()
des.trap()
` + "\n" + // --
`des.monster({ id = "bugbear", peaceful=0 })
des.monster({ id = "bugbear", peaceful=0 })
des.monster({ id = "bugbear", peaceful=0 })
des.monster({ id = "bugbear", peaceful=0 })
des.monster({ id = "bugbear", peaceful=0 })
des.monster({ class = "h", peaceful=0 })
des.monster({ id = "hill giant", peaceful=0 })
`;
