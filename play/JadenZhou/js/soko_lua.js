// soko_lua.js — hand port of the Sokoban level scripts sessions reach:
// dat/soko1-1.lua and dat/soko1-2.lua (the top level, with the prize),
// and the other levels, dat/soko2-*.lua, soko3-*.lua and soko4-*.lua.
// makemaz("sokoN") picks one with rnd(2) and loads it through
// load_special() (sp_lev.c).
// C ref: dat/soko1-1.lua ... dat/soko4-2.lua
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


const MAP_soko2_1 = [
    '--------------------',
    '|........|...|.....|',
    '|.....-..|.-.|.....|',
    '|..|.....|...|.....|',
    '|-.|..-..|.-.|.....|',
    '|...--.......|.....|',
    '|...|...-...-|.....|',
    '|...|..|...--|.....|',
    '|-..|..|----------+|',
    '|..................|',
    '|...|..|------------',
    '--------            ',
].join('\n') + '\n';

const MAP_soko2_2 = [
    '  --------            ',
    '--|.|....|            ',
    '|........|----------  ',
    '|.-...-..|.|.......|  ',
    '|...-......|.......|  ',
    '|.-....|...|.......|  ',
    '|....-.--.-|.......|  ',
    '|..........|.......|  ',
    '|.--...|...|.......---',
    '|....-.|---|.......+.|',
    '--|....|------------.|',
    '  |................+.|',
    '  --------------------',
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

// C ref: dat/soko2-1.lua
function soko2_1_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'premapped', 'sokoban', 'solidify');

    des.map(MAP_soko2_1);
    des.stair('down', 6, 10);
    des.stair('up', 16, 4);
    des.door('locked', 18, 8);
    des.region(selection.area(0, 0, 19, 11), 'lit');
    des.non_diggable(selection.area(0, 0, 19, 11));
    des.non_passwall(selection.area(0, 0, 19, 11));

    // -- Boulders
    des.object('boulder', 2, 2);
    des.object('boulder', 3, 2);
    // --
    des.object('boulder', 5, 3);
    des.object('boulder', 7, 3);
    des.object('boulder', 7, 2);
    des.object('boulder', 8, 2);
    // --
    des.object('boulder', 10, 3);
    des.object('boulder', 11, 3);
    // --
    des.object('boulder', 2, 7);
    des.object('boulder', 2, 8);
    des.object('boulder', 3, 9);
    // --
    des.object('boulder', 5, 7);
    des.object('boulder', 6, 6);

    // -- prevent monster generation over the (filled) holes
    des.exclusion({ type: 'monster-generation', region: [7, 9, 18, 9] });
    // -- Traps
    des.trap('rolling boulder', 7, 9);
    des.trap('hole', 8, 9);
    des.trap('hole', 9, 9);
    des.trap('hole', 10, 9);
    des.trap('hole', 11, 9);
    des.trap('hole', 12, 9);
    des.trap('hole', 13, 9);
    des.trap('hole', 14, 9);
    des.trap('hole', 15, 9);
    des.trap('hole', 16, 9);
    des.trap('hole', 17, 9);

    // -- Random objects
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '=' });
    des.object({ class: '/' });
}

// C ref: dat/soko2-2.lua
function soko2_2_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'premapped', 'sokoban', 'solidify');

    des.map(MAP_soko2_2);
    des.stair('down', 6, 11);
    des.stair('up', 15, 6);
    des.door('locked', 19, 9);
    des.door('locked', 19, 11);
    des.region(selection.area(0, 0, 21, 12), 'lit');
    des.non_diggable(selection.area(0, 0, 21, 12));
    des.non_passwall(selection.area(0, 0, 21, 12));

    // -- Boulders
    des.object('boulder', 4, 2);
    des.object('boulder', 4, 3);
    des.object('boulder', 5, 3);
    des.object('boulder', 7, 3);
    des.object('boulder', 8, 3);
    des.object('boulder', 2, 4);
    des.object('boulder', 3, 4);
    des.object('boulder', 5, 5);
    des.object('boulder', 6, 6);
    des.object('boulder', 9, 6);
    des.object('boulder', 3, 7);
    des.object('boulder', 4, 7);
    des.object('boulder', 7, 7);
    des.object('boulder', 6, 9);
    des.object('boulder', 5, 10);
    des.object('boulder', 5, 11);

    // -- prevent monster generation over the (filled) holes
    des.exclusion({ type: 'monster-generation', region: [6, 11, 18, 11] });
    // -- Traps
    des.trap('rolling boulder', 7, 11);
    des.trap('hole', 8, 11);
    des.trap('hole', 9, 11);
    des.trap('hole', 10, 11);
    des.trap('hole', 11, 11);
    des.trap('hole', 12, 11);
    des.trap('hole', 13, 11);
    des.trap('hole', 14, 11);
    des.trap('hole', 15, 11);
    des.trap('hole', 16, 11);
    des.trap('hole', 17, 11);
    des.trap('hole', 18, 11);

    // -- Random objects
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '=' });
    des.object({ class: '/' });
}

const MAP_soko3_1 = [
    '-----------       -----------',
    '|....|....|--     |.........|',
    '|....|......|     |.........|',
    '|.........|--     |.........|',
    '|....|....|       |.........|',
    '|-.---------      |.........|',
    '|....|.....|      |.........|',
    '|....|.....|      |.........|',
    '|..........|      |.........|',
    '|....|.....|---------------+|',
    '|....|......................|',
    '-----------------------------',
].join('\n') + '\n';

// C ref: dat/soko3-1.lua
function soko3_1_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'premapped', 'sokoban', 'solidify');

    des.map(MAP_soko3_1);
    des.stair('down', 11, 2);
    des.stair('up', 23, 4);
    des.door('locked', 27, 9);
    des.region(selection.area(0, 0, 28, 11), 'lit');
    des.non_diggable(selection.area(0, 0, 28, 11));
    des.non_passwall(selection.area(0, 0, 28, 11));

    // -- Boulders
    des.object('boulder', 3, 2);
    des.object('boulder', 4, 2);
    // --
    des.object('boulder', 6, 2);
    des.object('boulder', 6, 3);
    des.object('boulder', 7, 2);
    // --
    des.object('boulder', 3, 6);
    des.object('boulder', 2, 7);
    des.object('boulder', 3, 7);
    des.object('boulder', 3, 8);
    des.object('boulder', 2, 9);
    des.object('boulder', 3, 9);
    des.object('boulder', 4, 9);
    // --
    des.object('boulder', 6, 7);
    des.object('boulder', 6, 9);
    des.object('boulder', 8, 7);
    des.object('boulder', 8, 10);
    des.object('boulder', 9, 8);
    des.object('boulder', 9, 9);
    des.object('boulder', 10, 7);
    des.object('boulder', 10, 10);

    // -- prevent monster generation over the (filled) holes
    des.exclusion({ type: 'monster-generation', region: [11, 10, 27, 10] });
    // -- Traps
    des.trap('rolling boulder', 11, 10);
    des.trap('hole', 12, 10);
    des.trap('hole', 13, 10);
    des.trap('hole', 14, 10);
    des.trap('hole', 15, 10);
    des.trap('hole', 16, 10);
    des.trap('hole', 17, 10);
    des.trap('hole', 18, 10);
    des.trap('hole', 19, 10);
    des.trap('hole', 20, 10);
    des.trap('hole', 21, 10);
    des.trap('hole', 22, 10);
    des.trap('hole', 23, 10);
    des.trap('hole', 24, 10);
    des.trap('hole', 25, 10);
    des.trap('hole', 26, 10);

    // -- Random objects
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '=' });
    des.object({ class: '/' });
}

const MAP_soko3_2 = [
    ' ----          -----------',
    '-|..|-------   |.........|',
    '|..........|   |.........|',
    '|..-----.-.|   |.........|',
    '|..|...|...|   |.........|',
    '|.........-|   |.........|',
    '|.......|..|   |.........|',
    '|.----..--.|   |.........|',
    '|........|.--  |.........|',
    '|.---.-.....------------+|',
    '|...|...-................|',
    '|.........----------------',
    '----|..|..|               ',
    '    -------               ',
].join('\n') + '\n';

// C ref: dat/soko3-2.lua
function soko3_2_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'premapped', 'sokoban', 'solidify');

    des.map(MAP_soko3_2);
    des.stair('down', 3, 1);
    des.stair('up', 20, 4);
    des.door('locked', 24, 9);
    des.region(selection.area(0, 0, 25, 13), 'lit');
    des.non_diggable(selection.area(0, 0, 25, 13));
    des.non_passwall(selection.area(0, 0, 25, 13));

    // -- Boulders
    des.object('boulder', 2, 3);
    des.object('boulder', 8, 3);
    des.object('boulder', 9, 4);
    des.object('boulder', 2, 5);
    des.object('boulder', 4, 5);
    des.object('boulder', 9, 5);
    des.object('boulder', 2, 6);
    des.object('boulder', 5, 6);
    des.object('boulder', 6, 7);
    des.object('boulder', 3, 8);
    des.object('boulder', 7, 8);
    des.object('boulder', 5, 9);
    des.object('boulder', 10, 9);
    des.object('boulder', 7, 10);
    des.object('boulder', 10, 10);
    des.object('boulder', 3, 11);

    // -- prevent monster generation over the (filled) holes
    des.exclusion({ type: 'monster-generation', region: [11, 10, 24, 10] });
    // -- Traps
    des.trap('rolling boulder', 11, 10);
    des.trap('hole', 12, 10);
    des.trap('hole', 13, 10);
    des.trap('hole', 14, 10);
    des.trap('hole', 15, 10);
    des.trap('hole', 16, 10);
    des.trap('hole', 17, 10);
    des.trap('hole', 18, 10);
    des.trap('hole', 19, 10);
    des.trap('hole', 20, 10);
    des.trap('hole', 21, 10);
    des.trap('hole', 22, 10);
    des.trap('hole', 23, 10);

    // -- Random objects
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '=' });
    des.object({ class: '/' });
}

const MAP_soko4_1 = [
    '------  ----- ',
    '|....|  |...| ',
    '|....----...| ',
    '|...........| ',
    '|..|-|.|-|..| ',
    '---------|.---',
    '|......|.....|',
    '|..----|.....|',
    '--.|   |.....|',
    ' |.|---|.....|',
    ' |...........|',
    ' |..|---------',
    ' ----         ',
].join('\n') + '\n';

// C ref: dat/soko4-1.lua
function soko4_1_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'premapped', 'sokoban', 'solidify');

    des.map(MAP_soko4_1);
    des.levregion({ region: [6, 4, 6, 4], type: 'branch' });
    des.stair('up', 6, 6);
    des.region(selection.area(0, 0, 13, 12), 'lit');
    des.non_diggable(selection.area(0, 0, 13, 12));
    des.non_passwall(selection.area(0, 0, 13, 12));

    // -- Boulders
    des.object('boulder', 2, 2);
    des.object('boulder', 2, 3);
    // --
    des.object('boulder', 10, 2);
    des.object('boulder', 9, 3);
    des.object('boulder', 10, 4);
    // --
    des.object('boulder', 8, 7);
    des.object('boulder', 9, 8);
    des.object('boulder', 9, 9);
    des.object('boulder', 8, 10);
    des.object('boulder', 10, 10);

    // -- prevent monster generation over the (filled) pits
    des.exclusion({ type: 'monster-generation', region: [1, 6, 7, 11] });

    // -- Traps
    des.trap('pit', 4, 6);

    des.trap('pit', 2, 6);
    des.trap('pit', 2, 7);
    des.trap('pit', 2, 8);
    des.trap('rolling boulder', 2, 9);

    des.trap('pit', 2, 10);
    des.trap('pit', 3, 10);
    des.trap('pit', 4, 10);
    des.trap('pit', 5, 10);
    des.trap('pit', 6, 10);
    des.trap('rolling boulder', 7, 10);

    // -- A little help
    des.object('scroll of earth', 2, 11);
    des.object('scroll of earth', 3, 11);

    // -- Random objects
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '=' });
    des.object({ class: '/' });
}

const MAP_soko4_2 = [
    '-------- ------',
    '|.|....|-|....|',
    '|.|-..........|',
    '|.||....|.....|',
    '|.||....|.....|',
    '|.|-----|.-----',
    '|.|    |......|',
    '|.-----|......|',
    '|.............|',
    '|..|---|......|',
    '----   --------',
].join('\n') + '\n';

// C ref: dat/soko4-2.lua
function soko4_2_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'premapped', 'sokoban', 'solidify');

    des.map(MAP_soko4_2);
    des.levregion({ region: [3, 1, 3, 1], type: 'branch' });
    des.stair('up', 1, 1);
    des.region(selection.area(0, 0, 14, 10), 'lit');
    des.non_diggable(selection.area(0, 0, 14, 10));
    des.non_passwall(selection.area(0, 0, 14, 10));

    // -- Boulders
    des.object('boulder', 5, 2);
    des.object('boulder', 6, 2);
    des.object('boulder', 6, 3);
    des.object('boulder', 7, 3);
    // --
    des.object('boulder', 9, 5);
    des.object('boulder', 10, 3);
    des.object('boulder', 11, 2);
    des.object('boulder', 12, 3);
    // --
    des.object('boulder', 7, 8);
    des.object('boulder', 8, 8);
    des.object('boulder', 9, 8);
    des.object('boulder', 10, 8);

    // -- prevent monster generation over the (filled) pits
    des.exclusion({ type: 'monster-generation', region: [1, 1, 1, 9] });
    des.exclusion({ type: 'monster-generation', region: [1, 8, 7, 9] });
    // -- Traps
    des.trap('pit', 1, 2);
    des.trap('pit', 1, 3);
    des.trap('pit', 1, 4);
    des.trap('pit', 1, 5);
    des.trap('pit', 1, 6);
    des.trap('rolling boulder', 1, 7);

    des.trap('pit', 1, 8);
    des.trap('pit', 2, 8);
    des.trap('pit', 3, 8);
    des.trap('pit', 4, 8);
    des.trap('pit', 5, 8);
    des.trap('rolling boulder', 6, 8);

    // -- A little help
    des.object('scroll of earth', 1, 9);
    des.object('scroll of earth', 2, 9);

    // -- Random objects
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '%' });
    des.object({ class: '=' });
    des.object({ class: '/' });
}

// The hand-ported Sokoban level scripts by file name, for nhl_loadlua().
export const soko_lua_files = {
    'soko1-1.lua': soko1_1_lua,
    'soko1-2.lua': soko1_2_lua,
    'soko2-1.lua': soko2_1_lua,
    'soko2-2.lua': soko2_2_lua,
    'soko3-1.lua': soko3_1_lua,
    'soko3-2.lua': soko3_2_lua,
    'soko4-1.lua': soko4_1_lua,
    'soko4-2.lua': soko4_2_lua,
};
