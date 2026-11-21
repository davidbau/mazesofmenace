// soko_lua.js — hand port of the Sokoban level scripts sessions reach:
// dat/soko1-1.lua and dat/soko1-2.lua (the top level, with the prize).
// makemaz("soko1") picks one with rnd(2) and loads it through
// load_special() (sp_lev.c).
// C ref: dat/soko1-1.lua, dat/soko1-2.lua
//
// The only Lua-side roll is percent() (nhlib_lua.js).

// The des.map() maps, verbatim from the .lua files.
const MAP_soko1_1 = [
    '--------------------------',
    '|........................|',
    '|.......|---------------.|',
    '-------.------         |.|',
    ' |...........|         |.|',
    ' |...........|         |.|',
    '--------.-----         |.|',
    '|............|         |.|',
    '|............|         |.|',
    '-----.--------   ------|.|',
    ' |..........|  --|.....|.|',
    ' |..........|  |.+.....|.|',
    ' |.........|-  |-|.....|.|',
    '-------.----   |.+.....+.|',
    '|........|     |-|.....|--',
    '|........|     |.+.....|  ',
    '|...|-----     --|.....|  ',
    '-----            -------  ',
].join('\n') + '\n';

const MAP_soko1_2 = [
    '  ------------------------',
    '  |......................|',
    '  |..-------------------.|',
    '----.|    -----        |.|',
    '|..|.--  --...|        |.|',
    '|.....|--|....|        |.|',
    '|.....|..|....|        |.|',
    '--....|......--        |.|',
    ' |.......|...|   ------|.|',
    ' |....|..|...| --|.....|.|',
    ' |....|--|...| |.+.....|.|',
    ' |.......|..-- |-|.....|.|',
    ' ----....|.--  |.+.....+.|',
    '    ---.--.|   |-|.....|--',
    '     |.....|   |.+.....|  ',
    '     |..|..|   --|.....|  ',
    '     -------     -------  ',
].join('\n') + '\n';


// C ref: dat/soko1-1.lua
function soko1_1_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;
    const percent = G.percent;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'premapped', 'sokoban', 'solidify');
    des.map(MAP_soko1_1);

    G.place = selection.new();
    G.place.set(16, 11);
    G.place.set(16, 13);
    G.place.set(16, 15);

    des.stair('down', 1, 1);
    des.region(selection.area(0, 0, 25, 17), 'lit');
    des.non_diggable(selection.area(0, 0, 25, 17));
    des.non_passwall(selection.area(0, 0, 25, 17));

    // -- Boulders
    des.object('boulder', 3, 5);
    des.object('boulder', 5, 5);
    des.object('boulder', 7, 5);
    des.object('boulder', 9, 5);
    des.object('boulder', 11, 5);
    // --
    des.object('boulder', 4, 7);
    des.object('boulder', 4, 8);
    des.object('boulder', 6, 7);
    des.object('boulder', 9, 7);
    des.object('boulder', 11, 7);
    // --
    des.object('boulder', 3, 12);
    des.object('boulder', 4, 10);
    des.object('boulder', 5, 12);
    des.object('boulder', 6, 10);
    des.object('boulder', 7, 11);
    des.object('boulder', 8, 10);
    des.object('boulder', 9, 12);
    // --
    des.object('boulder', 3, 14);

    // -- prevent monster generation over the (filled) holes
    des.exclusion({ type: 'monster-generation', region: [7, 1, 23, 1] });
    // -- Traps
    des.trap('hole', 7, 1);
    des.trap('rolling boulder', 8, 1);
    des.trap('hole', 9, 1);
    des.trap('hole', 10, 1);
    des.trap('hole', 11, 1);
    des.trap('hole', 12, 1);
    des.trap('hole', 13, 1);
    des.trap('hole', 14, 1);
    des.trap('hole', 15, 1);
    des.trap('hole', 16, 1);
    des.trap('hole', 17, 1);
    des.trap('hole', 18, 1);
    des.trap('hole', 19, 1);
    des.trap('hole', 20, 1);
    des.trap('hole', 21, 1);
    des.trap('hole', 22, 1);
    des.trap('hole', 23, 1);

    des.monster({ id: 'giant mimic', appear_as: 'obj:boulder' });
    des.monster({ id: 'giant mimic', appear_as: 'obj:boulder' });

    // -- Random objects
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '=' });
    des.object({ class: '/' });

    // -- Rewards
    des.door('locked', 23, 13);
    des.door('closed', 17, 11);
    des.door('closed', 17, 13);
    des.door('closed', 17, 15);

    des.region({ region: [18, 10, 22, 16], lit: 1, type: 'zoo', filled: 1, irregular: 1 });

    const pt = selection.rndcoord(G.place);
    if (percent(75)) {
        des.object({ id: 'bag of holding', coord: pt,
                     buc: 'not-cursed', achievement: 1 });
    } else {
        des.object({ id: 'amulet of reflection', coord: pt,
                     buc: 'not-cursed', achievement: 1 });
    }
    des.engraving({ coord: pt, type: 'burn', text: 'Elbereth' });
    des.object({ id: 'scroll of scare monster', coord: pt, buc: 'cursed' });
}

// C ref: dat/soko1-2.lua
function soko1_2_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;
    const percent = G.percent;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'premapped', 'sokoban', 'solidify');

    des.map(MAP_soko1_2);

    const place = selection.new();
    place.set(16, 10);
    place.set(16, 12);
    place.set(16, 14);

    des.stair('down', 6, 15);
    des.region(selection.area(0, 0, 25, 16), 'lit');
    des.non_diggable(selection.area(0, 0, 25, 16));
    des.non_passwall(selection.area(0, 0, 25, 16));

    // -- Boulders
    des.object('boulder', 4, 4);
    des.object('boulder', 2, 6);
    des.object('boulder', 3, 6);
    des.object('boulder', 4, 7);
    des.object('boulder', 5, 7);
    des.object('boulder', 2, 8);
    des.object('boulder', 5, 8);
    des.object('boulder', 3, 9);
    des.object('boulder', 4, 9);
    des.object('boulder', 3, 10);
    des.object('boulder', 5, 10);
    des.object('boulder', 6, 12);
    // --
    des.object('boulder', 7, 14);
    // --
    des.object('boulder', 11, 5);
    des.object('boulder', 12, 6);
    des.object('boulder', 10, 7);
    des.object('boulder', 11, 7);
    des.object('boulder', 10, 8);
    des.object('boulder', 12, 9);
    des.object('boulder', 11, 10);

    // -- prevent monster generation over the (filled) holes
    des.exclusion({ type: 'monster-generation', region: [5, 1, 23, 1] });
    // -- Traps
    des.trap('rolling boulder', 5, 1);
    des.trap('hole', 6, 1);
    des.trap('hole', 7, 1);
    des.trap('hole', 8, 1);
    des.trap('hole', 9, 1);
    des.trap('hole', 10, 1);
    des.trap('hole', 11, 1);
    des.trap('hole', 12, 1);
    des.trap('hole', 13, 1);
    des.trap('hole', 14, 1);
    des.trap('hole', 15, 1);
    des.trap('hole', 16, 1);
    des.trap('hole', 17, 1);
    des.trap('hole', 18, 1);
    des.trap('hole', 19, 1);
    des.trap('hole', 20, 1);
    des.trap('hole', 21, 1);
    des.trap('hole', 22, 1);
    des.trap('hole', 23, 1);

    des.monster({ id: 'giant mimic', appear_as: 'obj:boulder' });
    des.monster({ id: 'giant mimic', appear_as: 'obj:boulder' });

    // -- Random objects
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '=' });
    des.object({ class: '/' });

    // -- Rewards
    des.door('locked', 23, 12);
    des.door('closed', 17, 10);
    des.door('closed', 17, 12);
    des.door('closed', 17, 14);
    des.region({ region: [18, 9, 22, 15], lit: 1, type: 'zoo', filled: 1, irregular: 1 });

    const pt = selection.rndcoord(place);
    if (percent(25)) {
        des.object({ id: 'bag of holding', coord: pt,
                     buc: 'not-cursed', achievement: 1 });
    } else {
        des.object({ id: 'amulet of reflection', coord: pt,
                     buc: 'not-cursed', achievement: 1 });
    }
    des.engraving({ coord: pt, type: 'burn', text: 'Elbereth' });
    des.object({ id: 'scroll of scare monster', coord: pt, buc: 'cursed' });
}

// The hand-ported Sokoban level scripts by file name, for nhl_loadlua().
export const soko_lua_files = {
    'soko1-1.lua': soko1_1_lua,
    'soko1-2.lua': soko1_2_lua,
};
