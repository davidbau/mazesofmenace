// valley_lua.js — hand port of dat/valley.lua, the Valley of the Dead (the
// first level of Gehennom). makemaz("valley") loads it through
// load_special() (sp_lev.c).
// C ref: dat/valley.lua
//
// Lua-side rolls: the three percent(50) path tweaks (nhlib.lua), tagged
// the way the C recorder writes them (see nhlib_lua.js). Every other roll
// comes from the des.* functions (sp_lev.js).

// The des.map() map, verbatim from the .lua file (a Lua long string drops
// the newline right after its opening [[).
const MAP_valley = [
    '----------------------------------------------------------------------------',
    '|...S.|..|.....|  |.....-|      |................|   |...............| |...|',
    '|---|.|.--.---.|  |......--- ----..........-----.-----....---........---.-.|',
    '|   |.|.|..| |.| --........| |.............|   |.......---| |-...........--|',
    '|   |...S..| |.| |.......-----.......------|   |--------..---......------- |',
    '|----------- |.| |-......| |....|...-- |...-----................----       |',
    '|.....S....---.| |.......| |....|...|  |..............-----------          |',
    '|.....|.|......| |.....--- |......---  |....---.......|                    |',
    '|.....|.|------| |....--   --....-- |-------- ----....---------------      |',
    '|.....|--......---BBB-|     |...--  |.......|    |..................|      |',
    '|..........||........-|    --...|   |.......|    |...||.............|      |',
    '|.....|...-||-........------....|   |.......---- |...||.............--     |',
    '|.....|--......---...........--------..........| |.......---------...--    |',
    '|.....| |------| |--.......--|   |..B......----- -----....| |.|  |....---  |',
    '|.....| |......--| ------..| |----..B......|       |.--------.-- |-.....---|',
    '|------ |........|  |.|....| |.....----BBBB---------...........---.........|',
    '|       |........|  |...|..| |.....|  |-.............--------...........---|',
    '|       --.....-----------.| |....-----.....----------     |.........----  |',
    '|        |..|..B...........| |.|..........|.|              |.|........|    |',
    '----------------------------------------------------------------------------',
].join('\n') + '\n';

// C ref: dat/valley.lua (top-level chunk)
function valley_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'nommap', 'temperate');

    des.map(MAP_valley);

    // -- Make the path somewhat unpredictable
    // -- If you get "lucky", you may have to go through all three graveyards.
    if (G.percent(50)) {
        des.terrain(selection.line(50, 8, 53, 8), '-');
        des.terrain(selection.line(40, 8, 43, 8), 'B');
    }
    if (G.percent(50)) {
        des.terrain({ x: 27, y: 12, typ: '|' });
        des.terrain(selection.line(27, 3, 29, 3), 'B');
        des.terrain({ x: 28, y: 2, typ: '-' });
    }
    if (G.percent(50)) {
        des.terrain(selection.line(16, 10, 16, 11), '|');
        des.terrain(selection.line(9, 13, 14, 13), 'B');
    }


    // -- Dungeon Description
    // -- The shrine to Moloch.
    des.region({ region: [1, 6, 5, 14], lit: 1, type: 'temple', filled: 2 });
    // -- The Morgues
    des.region({ region: [19, 1, 24, 8], lit: 0, type: 'morgue', filled: 1, irregular: 1 });
    des.region({ region: [9, 14, 16, 18], lit: 0, type: 'morgue', filled: 1, irregular: 1 });
    des.region({ region: [37, 9, 43, 14], lit: 0, type: 'morgue', filled: 1, irregular: 1 });
    // -- Stairs
    des.stair('down', 1, 1);
    // -- Branch location
    des.levregion({ type: 'branch', region: [66, 17, 66, 17] });
    des.teleport_region({ region: [58, 9, 72, 18], dir: 'down' });

    // -- Secret Doors
    des.door('locked', 4, 1);
    des.door('locked', 8, 4);
    des.door('locked', 6, 6);

    // -- The altar of Moloch.
    des.altar({ x: 3, y: 10, align: 'noalign', type: 'shrine' });

    // -- Non diggable walls - everywhere!
    des.non_diggable(selection.area(0, 0, 75, 19));

    // -- Objects
    // -- **LOTS** of dead bodies (all human).
    // -- note: no priest(esse)s or monks - maybe Moloch has a *special*
    // --       fate reserved for members of *those* classes.
    // --
    des.object({ id: 'corpse', montype: 'archeologist' });
    des.object({ id: 'corpse', montype: 'archeologist' });
    des.object({ id: 'corpse', montype: 'barbarian' });
    des.object({ id: 'corpse', montype: 'barbarian' });
    des.object({ id: 'corpse', montype: 'caveman' });
    des.object({ id: 'corpse', montype: 'cavewoman' });
    des.object({ id: 'corpse', montype: 'healer' });
    des.object({ id: 'corpse', montype: 'healer' });
    des.object({ id: 'corpse', montype: 'knight' });
    des.object({ id: 'corpse', montype: 'knight' });
    des.object({ id: 'corpse', montype: 'ranger' });
    des.object({ id: 'corpse', montype: 'ranger' });
    des.object({ id: 'corpse', montype: 'rogue' });
    des.object({ id: 'corpse', montype: 'rogue' });
    des.object({ id: 'corpse', montype: 'samurai' });
    des.object({ id: 'corpse', montype: 'samurai' });
    des.object({ id: 'corpse', montype: 'tourist' });
    des.object({ id: 'corpse', montype: 'tourist' });
    des.object({ id: 'corpse', montype: 'valkyrie' });
    des.object({ id: 'corpse', montype: 'valkyrie' });
    des.object({ id: 'corpse', montype: 'wizard' });
    des.object({ id: 'corpse', montype: 'wizard' });
    // --
    // -- Some random weapons and armor.
    // --
    des.object('[');
    des.object('[');
    des.object('[');
    des.object('[');
    des.object(')');
    des.object(')');
    des.object(')');
    des.object(')');
    // --
    // -- Some random loot.
    // --
    des.object('ruby');
    des.object('*');
    des.object('*');
    des.object('!');
    des.object('!');
    des.object('!');
    des.object('?');
    des.object('?');
    des.object('?');
    des.object('/');
    des.object('/');
    des.object('=');
    des.object('=');
    des.object('+');
    des.object('+');
    des.object('(');
    des.object('(');
    des.object('(');

    // -- (Not so) Random traps.
    des.trap('spiked pit', 5, 2);
    des.trap('spiked pit', 14, 5);
    des.trap('sleep gas', 3, 1);
    des.trap('board', 21, 12);
    des.trap('board');
    des.trap('dart', 60, 1);
    des.trap('dart', 26, 17);
    des.trap('anti magic');
    des.trap('anti magic');
    des.trap('magic');
    des.trap('magic');

    // -- Random monsters.
    // -- The ghosts.
    des.monster('ghost');
    des.monster('ghost');
    des.monster('ghost');
    des.monster('ghost');
    des.monster('ghost');
    des.monster('ghost');
    // -- Add a few bats for atmosphere.
    des.monster('vampire bat');
    des.monster('vampire bat');
    des.monster('vampire bat');
    // -- And a lich for good measure.
    des.monster('L');
    // -- Some undead nasties for good measure
    des.monster('V');
    des.monster('V');
    des.monster('V');
    des.monster('Z');
    des.monster('Z');
    des.monster('Z');
    des.monster('Z');
    des.monster('M');
    des.monster('M');
    des.monster('M');
    des.monster('M');
}

// The hand-ported Valley script by file name, for nhl_loadlua().
export const valley_lua_files = {
    'valley.lua': valley_lua,
};
