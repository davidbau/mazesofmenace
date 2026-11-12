export default "\n" + // -- NetHack Caveman Cav-goal.lua	$NHDT-Date: 1652196002 2022/05/10 15:20:02 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.1 $
"\n" + // --	Copyright (c) 1989 by Jean-Christophe Collet
"\n" + // --	Copyright (c) 1991 by M. Stephenson
"\n" + // -- NetHack may be freely redistributed.  See license for details.
"\n" + // --
`des.level_init({ style = "solidfill", fg = " " });

des.level_flags("mazelevel");

des.map([[
                                                                            
                          .....................                             
                         .......................                            
                        .........................                           
                       ...........................                          
                      .............................                         
                     ...............................                        
                    .................................                       
                   ...................................                      
                  .....................................                     
                 .......................................                    
                  .....................................                     
                   ...................................                      
                    .................................                       
                     ...............................                        
                      .............................                         
                       ...........................                          
                        .........................                           
                         .......................                            
                                                                            
]]);
` + "\n" + // -- Dungeon Description
`des.region(selection.area(00,00,75,19), "lit")
` + "\n" + // -- Stairs
`des.stair("up")
` + "\n" + // -- Non diggable walls
`des.non_diggable(selection.area(00,00,75,19))
` + "\n" + // -- Objects
`des.object({ id = "mace", x=23, y=10, buc="blessed", spe=0, name="The Sceptre of Might" })
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
` + "\n" + // -- monsters.
`des.monster({ id = "Chromatic Dragon", x=23, y=10, asleep=1 })
des.monster("shrieker", 26, 13)
des.monster("shrieker", 25, 8)
des.monster("shrieker", 45, 11)
des.wallify()
`;
