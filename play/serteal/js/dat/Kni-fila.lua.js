export default "\n" + // -- NetHack Knight Kni-fila.lua	$NHDT-Date: 1652196004 2022/05/10 15:20:04 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.2 $
"\n" + // --	Copyright (c) 1989 by Jean-Christophe Collet
"\n" + // --	Copyright (c) 1991,92 by M. Stephenson
"\n" + // -- NetHack may be freely redistributed.  See license for details.
"\n" + // --
`des.level_init({ style = "solidfill", fg = "." });

des.level_flags("mazelevel", "noflip");

des.level_init({ style="mines", fg=".", bg="P", smoothed=false, joined=true, lit=1, walled=false })

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
` + "\n" + // --
`des.monster({ id = "quasit", peaceful=0 })
des.monster({ id = "quasit", peaceful=0 })
des.monster({ id = "quasit", peaceful=0 })
des.monster({ id = "quasit", peaceful=0 })
des.monster({ class = "i", peaceful=0 })
des.monster({ id = "ochre jelly", peaceful=0 })
` + "\n" + // --
`des.trap()
des.trap()
des.trap()
des.trap()
`;
