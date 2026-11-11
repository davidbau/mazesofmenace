export default "\n" + // -- NetHack Rogue Rog-loca.lua	$NHDT-Date: 1652196012 2022/05/10 15:20:12 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.2 $
"\n" + // --	Copyright (c) 1992 by Dean Luick
"\n" + // -- NetHack may be freely redistributed.  See license for details.
"\n" + // --
`des.level_init({ style = "solidfill", fg = " " });

des.level_flags("mazelevel");

` + "\n" + // --         1         2         3         4         5         6         7
"\n" + // --123456789012345678901234567890123456789012345678901234567890123456789012345
`des.map([[
             ----------------------------------------------------   --------
           ---.................................................-    --.....|
         ---...--------........-------.......................---     ---...|
       ---.....-      ---......-     ---..................----         --.--
     ---.....----       --------       --..................--         --..| 
   ---...-----                       ----.----.....----.....---      --..|| 
----..----                       -----..---  |...---  |.......---   --...|  
|...---                       ----....---    |.---    |.........-- --...||  
|...-                      ----.....---     ----      |..........---....|   
|...----                ----......---       |         |...|.......-....||   
|......-----          ---.........-         |     -----...|............|    
|..........-----   ----...........---       -------......||...........||    
|..............-----................---     |............|||..........|     
|------...............................---   |...........|| |.........||     
|.....|..............------.............-----..........||  ||........|      
|.....|.............--    ---.........................||    |.......||      
|.....|.............-       ---.....................--|     ||......|       
|-S----------.......----      --.................----        |.....||       
|...........|..........--------..............-----           ||....|        
|...........|............................-----                |....|        
------------------------------------------                    ------        
]]);
` + "\n" + // -- Dungeon Description
`des.region(selection.area(00,00,75,20), "lit")
` + "\n" + // -- Doors
"\n" + // --DOOR:locked|closed|open,(xx,yy)
"\n" + // -- Stairs
`des.stair("up")
des.stair("down")
` + "\n" + // -- Non diggable walls
`des.non_diggable(selection.area(00,00,75,20))
` + "\n" + // -- Objects
`des.object({ id = "scroll of teleportation", x=11, y=18, buc="cursed", spe=0 })
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
`des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ id = "leprechaun", peaceful=0 })
des.monster({ class = "l", peaceful=0 })
des.monster({ id = "guardian naga", peaceful=0 })
des.monster({ id = "guardian naga", peaceful=0 })
des.monster({ id = "guardian naga", peaceful=0 })
des.monster({ id = "guardian naga", peaceful=0 })
des.monster({ id = "guardian naga", peaceful=0 })
des.monster({ id = "guardian naga", peaceful=0 })
des.monster({ id = "guardian naga", peaceful=0 })
des.monster({ class = "N", peaceful=0 })
des.monster({ class = "N", peaceful=0 })
des.monster({ class = "N", peaceful=0 })
des.monster({ id = "chameleon", peaceful=0 })
des.monster({ id = "chameleon", peaceful=0 })
des.monster({ id = "chameleon", peaceful=0 })
des.monster({ id = "chameleon", peaceful=0 })
des.monster({ id = "chameleon", peaceful=0 })
`;
