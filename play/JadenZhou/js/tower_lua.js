// tower_lua.js — port of the Vlad's Tower level scripts: dat/tower1.lua
// (the upper stage, Vlad's own level), dat/tower2.lua (the middle stage)
// and dat/tower3.lua (the bottom stage, with the portal arrival).
// makemaz() loads them through load_special() (sp_lev.c).
// C ref: dat/tower1.lua, dat/tower2.lua, dat/tower3.lua
//
// Lua-side rolls: shuffle() (nhlib.lua) and two math.random(4,8) calls,
// tagged the way the C recorder writes them.

import { withRngCaller } from './rng.js';

// The des.map() map, verbatim from the .lua file.
const MAP_tower1 = [
    '  --- --- ---  ',
    '  |.| |.| |.|  ',
    '---S---S---S---',
    '|.......+.+...|',
    '---+-----.-----',
    '  |...\\.|.+.|  ',
    '---+-----.-----',
    '|.......+.+...|',
    '---S---S---S---',
    '  |.| |.| |.|  ',
    '  --- --- ---  ',
].join('\n') + '\n';

// math.random called from the script's chunk (the contents functions are
// anonymous): the recorder tags the roll with nhlib's math.random line
// (10 for two arguments) and "lua" at the calling line.
function chunk_random(G, line, ...args) {
    return withRngCaller(
        `random src=nhlib.lua:${args.length === 1 ? 8 : 10} parent=lua(tower1.lua:${line})`,
        () => G.math.random(...args));
}

// C ref: dat/tower1.lua
// Upper stage of Vlad's tower
function tower1_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection, nh = G.nh;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'solidify');
    des.map({ halign: 'half-left', valign: 'center', map: MAP_tower1 });

    // local niches = { {03,01}, {03,09}, {07,01}, {07,09}, {11,01}, {11,09} };
    const niches = [ [3, 1], [3, 9], [7, 1], [7, 9], [11, 1], [11, 9] ];
    G.shuffle(niches);

    des.ladder('down', 11, 5);
    // -- The lord and his court
    des.monster('Vlad the Impaler', 6, 5);
    des.monster('V', niches[0]);  /* niches[1] */
    des.monster('V', niches[1]);  /* niches[2] */
    des.monster('V', niches[2]);  /* niches[3] */
    // -- The brides; they weren't named in Bram Stoker's original _Dracula_
    // -- and when appearing in umpteen subsequent books and movies there is
    // -- no consensus for their names.  According to the Wikipedia entry for
    // -- "Brides of Dracula", the "Czechoslovakian TV film Hrabe Drakula (1971)"
    // -- gave them titles rather than (or perhaps in addition to) specific names
    // -- and we use those titles here.  Marking them as 'waiting' forces them to
    // -- start in vampire form instead of vampshifted into bat/fog/wolf form.
    const Vgenod = nh.is_genocided('vampire');
    let Vnames = [ null, null, null ];
    if (!Vgenod) {
        Vnames = [ 'Madame', 'Marquise', 'Countess' ];
    }
    des.monster({ id: 'vampire lady', coord: niches[3], name: Vnames[0], waiting: 1 });
    des.monster({ id: 'vampire lady', coord: niches[4], name: Vnames[1], waiting: 1 });
    des.monster({ id: 'vampire lady', coord: niches[5], name: Vnames[2], waiting: 1 });
    // -- The doors
    des.door('closed', 8, 3);
    des.door('closed', 10, 3);
    des.door('closed', 3, 4);
    des.door('locked', 10, 5);
    des.door('locked', 8, 7);
    des.door('locked', 10, 7);
    des.door('closed', 3, 6);
    // -- treasures
    des.object('chest', 7, 5);

    des.object('chest', niches[5]);  /* niches[6] */
    des.object('chest', niches[0]);  /* niches[1] */
    des.object('chest', niches[1]);  /* niches[2] */
    des.object('chest', niches[2]);  /* niches[3] */
    des.object({ id: 'chest', coord: niches[3],
                 contents: function() {
                     des.object({ id: 'wax candle',
                                  quantity: chunk_random(G, 65, 4, 8) });
                 },
    });
    des.object({ id: 'chest', coord: niches[4],
                 contents: function() {
                     des.object({ id: 'tallow candle',
                                  quantity: chunk_random(G, 70, 4, 8) });
                 },
    });
    // -- We have to protect the tower against outside attacks
    des.non_diggable(selection.area(0, 0, 14, 10));
}

// tower2.lua and tower3.lua: translated from the .lua files by a script
// (maps verbatim), then reviewed; Lua arrays are 1-based (t[i] is t[i - 1]).

const MAP_tower2 = [
    '  --- --- ---  ',
    '  |.| |.| |.|  ',
    '---S---S---S---',
    '|.S.........S.|',
    '---.------+----',
    '  |......|..|  ',
    '--------.------',
    '|.S......+..S.|',
    '---S---S---S---',
    '  |.| |.| |.|  ',
    '  --- --- ---  ',
].join('\n') + '\n';

// C ref: dat/tower2.lua
function tower2_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'solidify');
    des.map({ halign: 'half-left', valign: 'center', map: MAP_tower2 });
    // Random places are the 10 niches
    const place = [[3, 1], [7, 1], [11, 1], [1, 3], [13, 3],
        [1, 7], [13, 7], [3, 9], [7, 9], [11, 9]];
    G.shuffle(place);

    des.ladder('up', 11, 5);
    des.ladder('down', 3, 7);
    des.door('locked', 10, 4);
    des.door('locked', 9, 7);
    des.monster('&', place[9]);
    des.monster('&', place[0]);
    des.monster('hell hound pup', place[1]);
    des.monster('hell hound pup', place[2]);
    des.monster('winter wolf', place[3]);
    des.object({ id: 'chest', coord: place[4],
        contents: function() {
            des.object('amulet of life saving');
        } });
    des.object({ id: 'chest', coord: place[5],
        contents: function() {
            des.object('amulet of strangulation');
        } });
    des.object('water walking boots', place[6]);
    des.object('crystal plate mail', place[7]);

    const spbooks = ['spellbook of invisibility',
        'spellbook of cone of cold',
        'spellbook of create familiar',
        'spellbook of clairvoyance',
        'spellbook of charm monster',
        'spellbook of stone to flesh',
        'spellbook of polymorph'];
    G.shuffle(spbooks);
    des.object(spbooks[0], place[8]);

    // Walls in the tower are non diggable
    des.non_diggable(selection.area(0, 0, 14, 10));
}

const MAP_tower3 = [
    '    --- --- ---    ',
    '    |.| |.| |.|    ',
    '  ---S---S---S---  ',
    '  |.S.........S.|  ',
    '-----.........-----',
    '|...|.........+...|',
    '|.---.........---.|',
    '|.|.S.........S.|.|',
    '|.---S---S---S---.|',
    '|...|.|.|.|.|.|...|',
    '---.---.---.---.---',
    '  |.............|  ',
    '  ---------------  ',
].join('\n') + '\n';

// C ref: dat/tower3.lua
function tower3_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor', 'solidify');
    des.map({ halign: 'half-left', valign: 'center', map: MAP_tower3 });
    // Random places are the 10 niches
    const place = [[5, 1], [9, 1], [13, 1], [3, 3], [15, 3],
        [3, 7], [15, 7], [5, 9], [9, 9], [13, 9]];

    des.levregion({ type: 'branch', region: [2, 5, 2, 5] });
    des.ladder('up', 5, 7);
    // Entry door is, of course, locked
    des.door('locked', 14, 5);
    // Let's put a dragon behind the door, just for the fun...
    des.monster('D', 13, 5);
    des.monster({ x: 12, y: 4 });
    des.monster({ x: 12, y: 6 });
    des.monster();
    des.monster();
    des.monster();
    des.monster();
    des.monster();
    des.monster();
    des.object('long sword', place[3]);
    des.trap({ coord: place[3] });
    des.object('lock pick', place[0]);
    des.trap({ coord: place[0] });
    des.object('elven cloak', place[1]);
    des.trap({ coord: place[1] });
    des.object('blindfold', place[2]);
    des.trap({ coord: place[2] });
    // Walls in the tower are non diggable
    des.non_diggable(selection.area(0, 0, 18, 12));
}


// The hand-ported tower level scripts by file name, for nhl_loadlua().
export const tower_lua_files = {
    'tower1.lua': tower1_lua,
    'tower2.lua': tower2_lua,
    'tower3.lua': tower3_lua,
};
