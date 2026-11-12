export default "\n" + // -- NetHack Rogue Rog-filb.lua	$NHDT-Date: 1652196011 2022/05/10 15:20:11 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
"\n" + // --	Copyright (c) 1992 by Dean Luick
"\n" + // -- NetHack may be freely redistributed.  See license for details.
"\n" + // --
"\n" + // --
`des.room({ type = "ordinary",
           contents = function()
              des.stair("up")
              des.object()
              des.monster({ id = "leprechaun", peaceful=0 })
           end
})

des.room({ type = "ordinary",
           contents = function()
              des.object()
              des.object()
              des.monster({ id = "leprechaun", peaceful=0 })
              des.monster({ id = "guardian naga", peaceful=0 })
           end
})

des.room({ type = "ordinary",
           contents = function()
              des.object()
              des.trap()
              des.trap()
              des.object()
              des.monster({ id = "water nymph", peaceful=0 })
           end
})

des.room({ type = "ordinary",
           contents = function()
              des.stair("down")
              des.object()
              des.trap()
              des.trap()
              des.monster({ class = "l", peaceful=0 })
              des.monster({ id = "guardian naga", peaceful=0 })
           end
})

des.room({ type = "ordinary",
           contents = function()
              des.object()
              des.object()
              des.trap()
              des.trap()
              des.monster({ id = "leprechaun", peaceful=0 })
           end
})

des.room({ type = "ordinary",
           contents = function()
              des.object()
              des.trap()
              des.trap()
              des.monster({ id = "leprechaun", peaceful=0 })
              des.monster({ id = "water nymph", peaceful=0 })
           end
})

des.random_corridors()
`;
