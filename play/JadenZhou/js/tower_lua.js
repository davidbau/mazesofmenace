// tower_lua.js — hand port of the Vlad's Tower level scripts sessions
// reach: dat/tower1.lua (the upper stage, Vlad's own level).
// makemaz() loads it through load_special() (sp_lev.c).
// C ref: dat/tower1.lua
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

// The hand-ported tower level scripts by file name, for nhl_loadlua().
export const tower_lua_files = {
    'tower1.lua': tower1_lua,
};
