// bigrm_lua.js — hand port of dat/bigrm-1.lua .. dat/bigrm-13.lua, the
// big room variants. makemaz("bigrm") picks one with rnd(13) and loads it
// through load_special() (sp_lev.c).
// C ref: dat/bigrm-1.lua .. dat/bigrm-13.lua
//
// Lua tables are JS arrays here (Lua index i is JS index i - 1). Lua-side
// rolls go through withRngCaller() with the tag the C recorder writes; the
// selection operator '|' is lua_bor() (nhlua.js).

import { withRngCaller } from './rng.js';
import { lua_bor } from './nhlua.js';
import { chunk_random } from './nhlib_lua.js';

// The des.map() maps, verbatim from the .lua files (a Lua long string
// drops the newline right after its opening [[).
const MAP_bigrm_1 = [
    '---------------------------------------------------------------------------',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '---------------------------------------------------------------------------',
].join('\n') + '\n';

const MAP_bigrm_2 = [
    '---------------------------------------------------------------------------',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '---------------------------------------------------------------------------',
].join('\n') + '\n';

const MAP_bigrm_3 = [
    '---------------------------------------------------------------------------',
    '|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|..............---.......................................---..............|',
    '|...............|.........................................|...............|',
    '|.....|.|.|.|.|---|.|.|.|.|...................|.|.|.|.|.|---|.|.|.|.|.....|',
    '|.....|--------   --------|...................|----------   --------|.....|',
    '|.....|.|.|.|.|---|.|.|.|.|...................|.|.|.|.|.|---|.|.|.|.|.....|',
    '|...............|.........................................|...............|',
    '|..............---.......................................---..............|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|.|',
    '---------------------------------------------------------------------------',
].join('\n') + '\n';

const MAP_bigrm_4 = [
    '-----------                                                     -----------',
    '|.........|                                                     |.........|',
    '|.........-------------                             -------------.........|',
    '---...................------------       ------------...................---',
    '  --.............................---------.............................--  ',
    '   --.................................................................--   ',
    '    --...............................................................--    ',
    '     --......LLLLL.......................................LLLLL......--     ',
    '      --.....LLLLL.......................................LLLLL.....--      ',
    '      --.....LLLLL.......................................LLLLL.....--      ',
    '     --......LLLLL.......................................LLLLL......--     ',
    '    --...............................................................--    ',
    '   --.................................................................--   ',
    '  --.............................---------.............................--  ',
    '---...................------------       ------------...................---',
    '|.........-------------                             -------------.........|',
    '|.........|                                                     |.........|',
    '-----------                                                     -----------',
].join('\n') + '\n';

const MAP_bigrm_5 = [
    '                            ------------------                            ',
    '                    ---------................---------                    ',
    '              -------................................-------              ',
    '         ------............................................------         ',
    '      ----......................................................----      ',
    '    ---............................................................---    ',
    '  ---................................................................---  ',
    '---....................................................................---',
    '|........................................................................|',
    '|........................................................................|',
    '|........................................................................|',
    '---....................................................................---',
    '  ---................................................................---  ',
    '    ---............................................................---    ',
    '      ----......................................................----      ',
    '         ------............................................------         ',
    '              -------................................-------              ',
    '                    ---------................---------                    ',
    '                            ------------------                            ',
].join('\n') + '\n';

const MAP_bigrm_6 = [
    '     ---------         ---------         ---------         ---------     ',
    '   ---.......---     ---.......---     ---.......---     ---.......---   ',
    '  --...........--   --...........--   --...........--   --...........--  ',
    ' --.............-- --.............-- --.............-- --.............-- ',
    ' -...............- -...............- -...............- -...............- ',
    '--...............---...............---...............---...............--',
    '|.................-.................-.................-.................|',
    '|........T.................T.................T.................T........|',
    '|.......................................................................|',
    '|......T.{.....................................................{.T......|',
    '|.......................................................................|',
    '|........T.................T.................T.................T........|',
    '|.................-.................-.................-.................|',
    '--...............---...............---...............---...............--',
    ' -...............- -...............- -...............- -...............- ',
    ' --.............-- --.............-- --.............-- --.............-- ',
    '  --...........--   --...........--   --...........--   --...........--  ',
    '   ---.......---     ---.......---     ---.......---     ---.......---   ',
    '     ---------         ---------         ---------         ---------     ',
].join('\n') + '\n';

const MAP_bigrm_7 = [
    '                                                        -----              ',
    '                                                ---------...---            ',
    '                                        ---------.........L...---          ',
    '                                ---------.......................---        ',
    '                        ---------.................................---      ',
    '                ---------...........................................---    ',
    '        ---------.....................................................---  ',
    '---------...............................................................---',
    '|.........................................................................|',
    '|.L.....................................................................L.|',
    '|.........................................................................|',
    '---...............................................................---------',
    '  ---.....................................................---------        ',
    '    ---...........................................---------                ',
    '      ---.................................---------                        ',
    '        ---.......................---------                                ',
    '          ---...L.........---------                                        ',
    '            ---...---------                                                ',
    '              -----                                                        ',
].join('\n') + '\n';

const MAP_bigrm_8 = [
    '----------------------------------------------                             ',
    '|............................................---                           ',
    '--.............................................---                         ',
    ' ---......................................FF.....---                       ',
    '   ---...................................FF........---                     ',
    '     ---................................FF...........---                   ',
    '       ---.............................FF..............---                 ',
    '         ---..........................FF.................---               ',
    '           ---.......................FF....................---             ',
    '             ---....................FF.......................---           ',
    '               ---.................FF..........................---         ',
    '                 ---..............FF.............................---       ',
    '                   ---...........FF................................----    ',
    '                     ---........FF...................................---   ',
    '                       ---.....FF......................................--- ',
    '                         ---.............................................--',
    '                           ---............................................|',
    '                             ----------------------------------------------',
].join('\n') + '\n';

const MAP_bigrm_9 = [
    '}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}',
    '}}}}}}}}}}}}}}}}}}}}}}}}}}}}}................}}}}}}}}}}}}}}}}}}}}}}}}}}}}}',
    '}}}}}}}}}}}}}}}}}}}}}................................}}}}}}}}}}}}}}}}}}}}}',
    '}}}}}}}}}}}}}}}............................................}}}}}}}}}}}}}}}',
    '}}}}}}}}}}......................................................}}}}}}}}}}',
    '}}}}}}}............................................................}}}}}}}',
    '}}}}}.......................LLLLLLLLLLLLLLLLLL.......................}}}}}',
    '}}}....................LLLLLLLLLLLLLLLLLLLLLLLLLLL.....................}}}',
    '}....................LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL....................}',
    '}....................LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL....................}',
    '}....................LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL....................}',
    '}}}....................LLLLLLLLLLLLLLLLLLLLLLLLLLL.....................}}}',
    '}}}}}.......................LLLLLLLLLLLLLLLLLL.......................}}}}}',
    '}}}}}}}............................................................}}}}}}}',
    '}}}}}}}}}}......................................................}}}}}}}}}}',
    '}}}}}}}}}}}}}}}............................................}}}}}}}}}}}}}}}',
    '}}}}}}}}}}}}}}}}}}}}}................................}}}}}}}}}}}}}}}}}}}}}',
    '}}}}}}}}}}}}}}}}}}}}}}}}}}}}}................}}}}}}}}}}}}}}}}}}}}}}}}}}}}}',
    '}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}',
].join('\n') + '\n';

const MAP_bigrm_10 = [
    '.......................................................................',
    '.......................................................................',
    '.......................................................................',
    '.......................................................................',
    '...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...',
    '...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC...',
    '...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...',
    '...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC...',
    '...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...',
    '...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC...',
    '...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...',
    '...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC...',
    '...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...',
    '...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC...',
    '...C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C C...',
    '.......................................................................',
    '.......................................................................',
    '.......................................................................',
    '.......................................................................',
].join('\n') + '\n';

const MAP_bigrm_12 = [
    '                                                                           ',
    '         .......................           .......................         ',
    '        .........................         .........................        ',
    '       ...........................       ...........................       ',
    '      .............................     .............................      ',
    '     ........PPPPPPPPPPPPPPP........   ........LLLLLLLLLLLLLLL........     ',
    '    ........PPPPPPPPPPPPPPPPP........ ........LLLLLLLLLLLLLLLLL........    ',
    '   ........PPPWWWWWWWWWWWWWPPP...............LLLZZZZZZZZZZZZZLLL........   ',
    '  ........PPPWWWWWWWWWWWWWWWPPP.............LLLZZZZZZZZZZZZZZZLLL........  ',
    ' ........PPPWWWWWWWWWWWWWWWWWPPP...........LLLZZZZZZZZZZZZZZZZZLLL........ ',
    '  ........PPPWWWWWWWWWWWWWWWPPP.............LLLZZZZZZZZZZZZZZZLLL........  ',
    '   ........PPPWWWWWWWWWWWWWPPP...............LLLZZZZZZZZZZZZZLLL........   ',
    '    ........PPPPPPPPPPPPPPPPP........ ........LLLLLLLLLLLLLLLLL........    ',
    '     ........PPPPPPPPPPPPPPP........   ........LLLLLLLLLLLLLLL........     ',
    '      .............................     .............................      ',
    '       ...........................       ...........................       ',
    '        .........................         .........................        ',
    '         .......................           .......................         ',
    '                                                                           ',
].join('\n') + '\n';

const MAP_bigrm_13 = [
    '---------------------------------------------------------------------------',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '|.........................................................................|',
    '---------------------------------------------------------------------------',
].join('\n') + '\n';

const MAP_bigrm_13_1 = [
    '---',
    '| |',
    '---',
].join('\n');


// the trailing loops every bigroom variant ends with
function bigrm_fill(des, trapfn) {
    for (let i = 1; i <= 15; i++) {
        des.object();
    }
    for (let i = 1; i <= 6; i++) {
        trapfn();
    }
    for (let i = 1; i <= 28; i++) {
        des.monster();
    }
}

// C ref: dat/bigrm-1.lua
function bigrm_1_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;
    const percent = G.percent;

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel', 'noflip');

    des.map(MAP_bigrm_1);

    if (percent(80)) {
        const terrains = ['-', 'F', 'L', 'T', 'C'];
        const tidx = chunk_random(G, 'bigrm-1.lua', 33, 1, terrains.length);
        const choice = chunk_random(G, 'bigrm-1.lua', 34, 0, 5);
        if (choice === 0) {
            // -- one horizontal line
            des.terrain(selection.line(10, 8, 65, 8), terrains[tidx - 1]);
        } else if (choice === 1) {
            // -- two vertical lines
            const sel = lua_bor(selection.line(15, 4, 15, 13), selection.line(59, 4, 59, 13));
            des.terrain(sel, terrains[tidx - 1]);
        } else if (choice === 2) {
            // -- plus sign
            const sel = lua_bor(selection.line(10, 8, 64, 8), selection.line(37, 3, 37, 14));
            des.terrain(sel, terrains[tidx - 1]);
        } else if (choice === 3) {
            // -- brackets:  [  ]
            des.terrain(selection.rect(4, 4, 70, 13), terrains[tidx - 1]);
            const sel = lua_bor(selection.line(25, 4, 50, 4), selection.line(25, 13, 50, 13));
            des.terrain(sel, '.');
        } else if (choice === 4) {
            // -- snake
            des.terrain(selection.fillrect(5, 5, 69, 12), terrains[tidx - 1]);
            for (let i = 0; i <= 7; i++) {
                const x = 6 + i * 8;
                const y = 5 + (i % 2);
                des.terrain(selection.fillrect(x, y, x + 6, y + 6), '.');
            }
        } else {
            // -- nothing
        }
    }

    des.region(selection.area(1, 1, 73, 16), 'lit');

    des.stair('up');
    des.stair('down');

    des.non_diggable();

    bigrm_fill(des, () => des.trap());
}

// C ref: dat/bigrm-2.lua
function bigrm_2_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;
    const percent = G.percent;

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel', 'noflip');

    des.map(MAP_bigrm_2);

    des.region(selection.area(1, 1, 73, 16), 'lit');

    let darkness;
    const choice = chunk_random(G, 'bigrm-2.lua', 34, 0, 3);
    if (choice === 0) {
        darkness = lua_bor(lua_bor(lua_bor(
            selection.area(1, 7, 22, 9),
            selection.area(24, 1, 50, 5)),
            selection.area(24, 11, 50, 16)),
            selection.area(52, 7, 73, 9));
    } else if (choice === 1) {
        darkness = selection.area(24, 1, 50, 16);
    } else if (choice === 2) {
        darkness = lua_bor(selection.area(1, 1, 22, 16),
                           selection.area(52, 1, 73, 16));
    }

    if (darkness !== undefined) {
        des.region(darkness, 'unlit');
        if (percent(25)) {
            des.replace_terrain({ selection: darkness.grow(),
                                  fromterrain: '.', toterrain: 'I' });
        }
    }

    des.stair('up');
    des.stair('down');

    des.non_diggable();

    bigrm_fill(des, () => des.trap());
}

// C ref: dat/bigrm-3.lua
function bigrm_3_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;
    const percent = G.percent;

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel', 'noflip');

    des.map(MAP_bigrm_3);

    des.region(selection.area(1, 1, 73, 16), 'lit');

    if (percent(66)) {
        const sel = selection.match('[.w.]');
        const terrains = ['F', 'T', 'W', 'Z'];
        const choice = terrains[chunk_random(G, 'bigrm-3.lua', 37, 1, terrains.length) - 1];
        des.terrain(sel, choice);
    }

    des.stair('up');
    des.stair('down');

    des.non_diggable();

    for (let i = 1; i <= 15; i++) {
        des.object();
    }

    for (let i = 1; i <= 6; i++) {
        des.trap();
    }

    des.monster({ x: 1, y: 1 });
    des.monster({ x: 13, y: 1 });
    des.monster({ x: 25, y: 1 });
    des.monster({ x: 37, y: 1 });
    des.monster({ x: 49, y: 1 });
    des.monster({ x: 61, y: 1 });
    des.monster({ x: 73, y: 1 });
    des.monster({ x: 7, y: 7 });
    des.monster({ x: 13, y: 7 });
    des.monster({ x: 25, y: 7 });
    des.monster({ x: 37, y: 7 });
    des.monster({ x: 49, y: 7 });
    des.monster({ x: 61, y: 7 });
    des.monster({ x: 67, y: 7 });
    des.monster({ x: 7, y: 9 });
    des.monster({ x: 13, y: 9 });
    des.monster({ x: 25, y: 9 });
    des.monster({ x: 37, y: 9 });
    des.monster({ x: 49, y: 9 });
    des.monster({ x: 61, y: 9 });
    des.monster({ x: 67, y: 9 });
    des.monster({ x: 1, y: 16 });
    des.monster({ x: 13, y: 16 });
    des.monster({ x: 25, y: 16 });
    des.monster({ x: 37, y: 16 });
    des.monster({ x: 49, y: 16 });
    des.monster({ x: 61, y: 16 });
    des.monster({ x: 73, y: 16 });
}

// C ref: dat/bigrm-4.lua
function bigrm_4_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel', 'noflip');

    des.map(MAP_bigrm_4);

    const terrains = ['.', '.', '.', '.', 'P', 'L', '-', 'T', 'W', 'Z'];
    const tidx = chunk_random(G, 'bigrm-4.lua', 31, 1, terrains.length);
    const toterr = terrains[tidx - 1];
    if (toterr !== 'L') {
        des.replace_terrain({ fromterrain: 'L', toterrain: toterr });
    }

    des.feature('fountain', 5, 2);
    des.feature('fountain', 5, 15);
    des.feature('fountain', 69, 2);
    des.feature('fountain', 69, 15);

    des.region(selection.area(1, 1, 73, 16), 'lit');

    des.stair('up');
    des.stair('down');

    des.non_diggable();

    bigrm_fill(des, () => des.trap());
}

// C ref: dat/bigrm-5.lua
function bigrm_5_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;
    const percent = G.percent;

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel', 'noflip');

    des.map(MAP_bigrm_5);

    if (percent(25)) {
        const sel = selection.match('.').percentage(2).grow();
        des.replace_terrain({ selection: sel, fromterrain: '.',
                              toterrain: percent(50) ? 'I' : 'C' });
    }

    des.region(selection.area(0, 0, 72, 18), 'lit');

    des.stair('up');
    des.stair('down');

    des.non_diggable();

    bigrm_fill(des, () => des.trap());
}

// C ref: dat/bigrm-6.lua
function bigrm_6_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel', 'noflip');

    des.map(MAP_bigrm_6);

    des.region(selection.area(1, 1, 72, 17), 'lit');

    des.stair('up');
    des.stair('down');

    des.non_diggable();

    bigrm_fill(des, () => des.trap());
}

// C ref: dat/bigrm-7.lua
function bigrm_7_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel');

    des.map(MAP_bigrm_7);

    const terrain = ['L', 'T', '{', '.'];
    const tidx = chunk_random(G, 'bigrm-7.lua', 32, 1, terrain.length);
    des.replace_terrain({ region: [0, 0, 74, 18], fromterrain: 'L',
                          toterrain: terrain[tidx - 1] });

    des.region(selection.area(1, 1, 73, 17), 'lit');

    des.stair('up');
    des.stair('down');

    des.non_diggable();

    bigrm_fill(des, () => des.trap());
}

// C ref: dat/bigrm-8.lua
function bigrm_8_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;
    const percent = G.percent;

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel');

    des.map(MAP_bigrm_8);

    if (percent(40)) {
        const terrain = ['L', '}', 'T', '.', '-', 'C'];
        const tidx = chunk_random(G, 'bigrm-8.lua', 32, 1, terrain.length);
        des.replace_terrain({ region: [0, 0, 74, 17], fromterrain: 'F',
                              toterrain: terrain[tidx - 1] });
    }

    des.region(selection.area(1, 1, 73, 16), 'lit');

    des.stair('up');
    des.stair('down');

    des.non_diggable();

    bigrm_fill(des, () => des.trap());
}

// C ref: dat/bigrm-9.lua
function bigrm_9_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel', 'noflip');

    des.map(MAP_bigrm_9);

    // -- Unlit, except 3 mapgrids around the "pupil"
    des.region(selection.area(0, 0, 73, 18), 'unlit');
    des.region(selection.area(26, 4, 47, 14), 'lit');
    des.region(selection.area(21, 5, 51, 13), 'lit');
    des.region(selection.area(19, 6, 54, 12), 'lit');

    des.stair('up');
    des.stair('down');

    des.non_diggable();

    bigrm_fill(des, () => des.trap());
}

// C ref: dat/bigrm-10.lua
function bigrm_10_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;
    const percent = G.percent;

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel', 'noflip');

    des.map(MAP_bigrm_10);

    if (percent(40)) {
        // -- occasionally it's not a fog maze
        const terrain = ['L', '}', 'T', '-', 'F'];
        const tidx = chunk_random(G, 'bigrm-10.lua', 34, 1, terrain.length);
        // -- break it up a bit
        des.replace_terrain({ region: [0, 0, 70, 18], fromterrain: 'C',
                              toterrain: '.', chance: 5 });
        des.replace_terrain({ region: [0, 0, 70, 18], fromterrain: 'C',
                              toterrain: terrain[tidx - 1] });
    }

    des.region(selection.area(0, 0, 70, 18), 'lit');

    // -- when falling down on this level, never end up in the fog maze
    des.teleport_region({ region: [0, 0, 70, 18], exclude: [2, 3, 68, 15], dir: 'down' });

    bigrm_fill(des, () => des.trap());

    des.mazewalk({ x: 4, y: 2, dir: 'south', stocked: 0 });

    // -- Stairs up, not in the fog maze
    des.levregion({ region: [0, 0, 70, 18], exclude: [2, 3, 68, 15], type: 'stair-up' });
    des.stair('down');
}

// C ref: dat/bigrm-11.lua
function bigrm_11_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection, nh = G.nh;
    const percent = G.percent;

    // function t_or_f() return percent(50) and true or false; end
    G.t_or_f = function t_or_f() { return percent(50) ? true : false; };

    des.level_flags('mazelevel', 'noflip');
    // table constructor fields are evaluated in order: corrwid, then deadends
    const corrwid = 3 + withRngCaller('nh.rn2(bigrm-11.lua:10)', () => nh.rn2(3));
    des.level_init({ style: 'maze', corrwid, wallthick: 1, deadends: G.t_or_f() });

    des.region(selection.area(0, 0, 75, 18), 'lit');
    des.non_diggable();

    // function replace_wall_boulder(x,y)
    G.replace_wall_boulder = function replace_wall_boulder(x, y) {
        des.terrain(x, y, '.');
        des.object('boulder', x, y);
    };

    // -- replace horizontal and vertical walls
    let sel = lua_bor(selection.match('.w.'), selection.match('.\nw\n.'));
    sel.iterate(G.replace_wall_boulder);
    // -- replace the leftover corner walls
    sel = selection.match('.w.');
    sel.iterate(G.replace_wall_boulder);

    des.stair('up');
    des.stair('down');

    bigrm_fill(des, () => des.trap('rolling boulder'));
}

// C ref: dat/bigrm-12.lua
function bigrm_12_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;
    const percent = G.percent;

    // -- Two hexagons

    des.level_flags('mazelevel', 'noflipy');
    des.level_init({ style: 'solidfill', fg: ' ' });

    des.map(MAP_bigrm_12);

    // -- maybe replace lavawalls/waterwalls with stone walls
    if (percent(20)) {
        if (percent(50)) {
            des.replace_terrain({ fromterrain: 'W', toterrain: '-' });
        }
        if (percent(50)) {
            des.replace_terrain({ fromterrain: 'Z', toterrain: '-' });
        }
    }

    // -- maybe replace pools with floor and then possibly walls with pools
    if (percent(25)) {
        des.replace_terrain({ fromterrain: 'P', toterrain: '.' });
        if (percent(75)) {
            des.replace_terrain({ fromterrain: 'W', toterrain: 'P' });
        }
    }
    if (percent(25)) {
        des.replace_terrain({ fromterrain: 'L', toterrain: '.' });
        if (percent(75)) {
            des.replace_terrain({ fromterrain: 'Z', toterrain: 'L' });
        }
    }

    // -- maybe make both sides have the same terrain
    if (percent(20)) {
        if (percent(50)) {
            // -- both are lava
            des.replace_terrain({ fromterrain: 'P', toterrain: 'L' });
            des.replace_terrain({ fromterrain: 'W', toterrain: 'Z' });
        } else {
            // -- both are water
            des.replace_terrain({ fromterrain: 'L', toterrain: 'P' });
            des.replace_terrain({ fromterrain: 'Z', toterrain: 'W' });
        }
    }

    des.region(selection.area(0, 0, 75, 19), 'lit');
    des.non_diggable();

    des.wallify();

    des.stair('up');
    des.stair('down');

    bigrm_fill(des, () => des.trap());
}

// C ref: dat/bigrm-13.lua
function bigrm_13_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel', 'noflip');

    des.map(MAP_bigrm_13);

    const pillar = MAP_bigrm_13_1;

    // Lua calls each filter as filters[idx](x, y): the frame has no name
    // the recorder accepts, so a roll in filter 6 is tagged with the chunk
    // name "lua" at the filter's line (49).
    G.filters = [
        // -- 1: all pillars
        function(x, y) { return true; },
        // -- 2: 3 vertical lines
        function(x, y) { return (x % 2 === 1); },
        // -- 3: checkerboard
        function(x, y) { return (((x + y) % 2) === 0); },
        // -- 4: center row
        function(x, y) { return (y % 2 === 1); },
        // -- 5: top and bottom rows
        function(x, y) { return (y % 2 === 0); },
        // -- 6: random 50%
        function(x, y) { return (chunk_random(G, 'bigrm-13.lua', 49, 0, 1) === 0); },
        // -- 7: corners and center (Lua '/' is float division)
        function(x, y) { return ((x / 3) % 2 === y % 2); },
        // -- 8: slanted ('//' is floor division)
        function(x, y) { return (Math.floor((x + 1) / 3) === y); },
    ];

    G.idx = chunk_random(G, 'bigrm-13.lua', 56, 1, G.filters.length);

    for (let y = 0; y <= 2; y++) {
        for (let x = 0; x <= 6; x++) {
            if (G.filters[G.idx - 1](x, y)) {
                des.map({ coord: [12 + x * 9, 4 + y * 5], map: pillar, contents: function() {} });
            }
        }
    }

    des.region(selection.area(0, 0, 75, 18), 'lit');
    des.wallify();
    des.non_diggable();

    des.stair('up');
    des.stair('down');

    bigrm_fill(des, () => des.trap());
}

// The bigroom variants by file name, for nhl_loadlua(); makemaz() picks
// "bigrm-<rnd(13)>" (dungeon.lua: bigrm nlevels = 13).
export const bigrm_lua_files = {
    'bigrm-1.lua': bigrm_1_lua,
    'bigrm-2.lua': bigrm_2_lua,
    'bigrm-3.lua': bigrm_3_lua,
    'bigrm-4.lua': bigrm_4_lua,
    'bigrm-5.lua': bigrm_5_lua,
    'bigrm-6.lua': bigrm_6_lua,
    'bigrm-7.lua': bigrm_7_lua,
    'bigrm-8.lua': bigrm_8_lua,
    'bigrm-9.lua': bigrm_9_lua,
    'bigrm-10.lua': bigrm_10_lua,
    'bigrm-11.lua': bigrm_11_lua,
    'bigrm-12.lua': bigrm_12_lua,
    'bigrm-13.lua': bigrm_13_lua,
};
