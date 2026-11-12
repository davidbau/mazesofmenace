export default "\n" + // -- NetHack Barbarian Bar-goal.lua	$NHDT-Date: 1652196000 2022/05/10 15:20:00 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
"\n" + // --	Copyright (c) 1989 by Jean-Christophe Collet
"\n" + // --	Copyright (c) 1991 by M. Stephenson
"\n" + // -- NetHack may be freely redistributed.  See license for details.
"\n" + // --
`des.level_init({ style = "solidfill", fg = " " });

des.level_flags("mazelevel");

des.map([[
                                                                            
                               .............                                
                             ..................                             
        ....              .........................          ....           
      .......          ..........................           .......         
      ......             ........................          .......          
      ..  ......................................             ..             
       ..                 .....................             ..              
        ..                 ..................              ..               
         ..         ..S...S..............   ................                
          ..                   ........                ...                  
       .........                                         ..                 
       ......  ..                                         ...  ....         
      .. ...    ..                             ......       ........        
   ....          .. ..................        ........       ......         
  ......          ......................       ......         ..            
   ....             ..................              ...........             
                      ..............                                        
                        ...........                                         
                                                                            
]]);
` + "\n" + // -- Dungeon Description
`des.region(selection.area(00,00,75,19), "unlit")
` + "\n" + // -- Secret doors
`des.door("locked",22,09)
des.door("locked",26,09)
` + "\n" + // -- Stairs
`des.stair("up", 36,05)
` + "\n" + // -- The altar.  Unattended.
`des.altar({ x=63,y=04,align="noncoaligned", type="altar" })
des.non_diggable(selection.area(00,00,75,19))
` + "\n" + // -- Objects
`des.object({ id = "luckstone", x=63, y=04,buc="blessed",spe=0,name="The Heart of Ahriman" })
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
` + "\n" + // -- Random traps
`des.trap()
des.trap()
des.trap()
des.trap()
des.trap()
des.trap()
` + "\n" + // -- Random monsters.
`des.monster({ id = "Thoth Amon", x=63, y=04, peaceful=0 })
des.monster({ id = "ogre", peaceful=0 })
des.monster({ id = "ogre", peaceful=0 })
des.monster({ id = "ogre", peaceful=0 })
des.monster({ id = "ogre", peaceful=0 })
des.monster({ id = "ogre", peaceful=0 })
des.monster({ id = "ogre", peaceful=0 })
des.monster({ id = "ogre", peaceful=0 })
des.monster({ id = "ogre", peaceful=0 })
des.monster({ id = "ogre", peaceful=0 })
des.monster({ id = "ogre", peaceful=0 })
des.monster({ id = "ogre", peaceful=0 })
des.monster({ id = "ogre", peaceful=0 })
des.monster({ id = "ogre", peaceful=0 })
des.monster({ id = "ogre", peaceful=0 })
des.monster({ id = "ogre", peaceful=0 })
des.monster({ id = "ogre", peaceful=0 })
des.monster({ class = "O", peaceful=0 })
des.monster({ class = "O", peaceful=0 })
des.monster({ id = "rock troll", peaceful=0 })
des.monster({ id = "rock troll", peaceful=0 })
des.monster({ id = "rock troll", peaceful=0 })
des.monster({ id = "rock troll", peaceful=0 })
des.monster({ id = "rock troll", peaceful=0 })
des.monster({ id = "rock troll", peaceful=0 })
des.monster({ id = "rock troll", peaceful=0 })
des.monster({ id = "rock troll", peaceful=0 })
des.monster({ class = "T", peaceful=0 })
des.wallify()

`;
