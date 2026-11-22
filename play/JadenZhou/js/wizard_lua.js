// wizard_lua.js — hand port of the Wizard's Tower level scripts in
// Gehennom: dat/wizard1.lua, dat/wizard2.lua, dat/wizard3.lua (the three
// tower levels) and dat/fakewiz1.lua, dat/fakewiz2.lua (the decoy towers).
// makemaz() loads them through load_special() (sp_lev.c).
// C ref: dat/wizard1.lua, dat/wizard2.lua, dat/wizard3.lua,
//        dat/fakewiz1.lua, dat/fakewiz2.lua
//
// Lua-side rolls: wizard1's secret door wall (math.random inside a
// des.region() contents callback, which C calls, so Lua names it "lua"),
// wizard3's percent(50), and the hell_tweaks() call ending each script
// (nhlib_lua.js). Every other roll comes from the des.* and selection
// functions (sp_lev.js, selvar.js).
//
// The scripts read sel:bounds(): the JS selection's own 'bounds' rect
// shadows that method, and a Lua userdata has no fields of its own, so the
// call goes through the method table as selection.bounds(sel).

import { withRngCaller } from './rng.js';
import { lua_bor } from './nhlua.js';

// The des.map() maps, verbatim from the .lua files (a Lua long string
// drops the newline right after its opening [[).
const MAP_wizard1 = [
    '----------------------------x',
    '|.......|..|.........|.....|x',
    '|.......S..|.}}}}}}}.|.....|x',
    '|..--S--|..|.}}---}}.|---S-|x',
    '|..|....|..|.}--.--}.|..|..|x',
    '|..|....|..|.}|...|}.|..|..|x',
    '|..--------|.}--.--}.|..|..|x',
    '|..|.......|.}}---}}.|..|..|x',
    '|..S.......|.}}}}}}}.|..|..|x',
    '|..|.......|.........|..|..|x',
    '|..|.......|-----------S-S-|x',
    '|..|.......S...............|x',
    '----------------------------x',
].join('\n') + '\n';

const MAP_wizard2 = [
    '----------------------------x',
    '|.....|.S....|.............|x',
    '|.....|.-------S--------S--|x',
    '|.....|.|.........|........|x',
    '|..-S--S|.........|........|x',
    '|..|....|.........|------S-|x',
    '|..|....|.........|.....|..|x',
    '|-S-----|.........|.....|..|x',
    '|.......|.........|S--S--..|x',
    '|.......|.........|.|......|x',
    '|-----S----S-------.|......|x',
    '|............|....S.|......|x',
    '----------------------------x',
].join('\n') + '\n';

const MAP_wizard3 = [
    '----------------------------x',
    '|..|............S..........|x',
    '|..|..------------------S--|x',
    '|..|..|.........|..........|x',
    '|..S..|.}}}}}}}.|..........|x',
    '|..|..|.}}---}}.|-S--------|x',
    '|..|..|.}--.--}.|..|.......|x',
    '|..|..|.}|...|}.|..|.......|x',
    '|..---|.}--.--}.|..|.......|x',
    '|.....|.}}---}}.|..|.......|x',
    '|.....S.}}}}}}}.|..|.......|x',
    '|.....|.........|..|.......|x',
    '----------------------------x',
].join('\n') + '\n';

const MAP_fakewiz = [
    '.........',
    '.}}}}}}}.',
    '.}}---}}.',
    '.}--.--}.',
    '.}|...|}.',
    '.}--.--}.',
    '.}}---}}.',
    '.}}}}}}}.',
    '.........',
].join('\n') + '\n';

// The opening every tower script shares: the maze grid, the level flags
// and the protected area bounds.
//   des.level_init({ style="mazegrid", bg ="-" });
//   des.level_flags(...)
//   local tmpbounds = selection.match("-");
//   local bnds = tmpbounds:bounds();
//   local bounds2 = selection.fillrect(bnds.lx, bnds.ly + 1, bnds.hx - 2, bnds.hy - 1);
function tower_bounds2(selection) {
    const tmpbounds = selection.match('-');
    const bnds = selection.bounds(tmpbounds);
    return selection.fillrect(bnds.lx, bnds.ly + 1, bnds.hx - 2, bnds.hy - 1);
}

// C ref: dat/wizard1.lua (top-level chunk)
//
// The top (real) wizard level.
// Keeping the Moat for old-time's sake
function wizard1_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'mazegrid', bg: '-' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');

    const bounds2 = tower_bounds2(selection);

    const wiz1 = des.map({ halign: 'center', valign: 'center', map: MAP_wizard1,
                           contents: function (rm) {
        des.levregion({ type: 'stair-up', region: [1, 0, 79, 20], region_islev: 1,
                        exclude: [0, 0, 28, 12] });
        des.levregion({ type: 'stair-down', region: [1, 0, 79, 20], region_islev: 1,
                        exclude: [0, 0, 28, 12] });
        des.levregion({ type: 'branch', region: [1, 0, 79, 20], region_islev: 1,
                        exclude: [0, 0, 28, 12] });
        des.teleport_region({ region: [1, 0, 79, 20], region_islev: 1,
                              exclude: [0, 0, 27, 12] });
        des.region({ region: [12, 1, 20, 9], lit: 0, type: 'morgue', filled: 2,
                     contents: function () {
            const sdwall = ['south', 'west', 'east'];
            const k = withRngCaller('random src=nhlib.lua:10 parent=lua(wizard1.lua:38)',
                                    () => G.math.random(1, sdwall.length));
            des.door({ wall: sdwall[k - 1], state: 'secret' });
        } });
        // -- another region to constrain monster arrival
        des.region({ region: [1, 1, 10, 11], lit: 0, type: 'ordinary', arrival_room: true });
        des.mazewalk(28, 5, 'east');
        des.ladder('down', 6, 5);
        // -- Non diggable walls
        // -- Walls inside the moat stay diggable
        des.non_diggable(selection.area(0, 0, 11, 12));
        des.non_diggable(selection.area(11, 0, 21, 0));
        des.non_diggable(selection.area(11, 10, 27, 12));
        des.non_diggable(selection.area(21, 0, 27, 10));
        // -- Non passable walls
        des.non_passwall(selection.area(0, 0, 11, 12));
        des.non_passwall(selection.area(11, 0, 21, 0));
        des.non_passwall(selection.area(11, 10, 27, 12));
        des.non_passwall(selection.area(21, 0, 27, 10));
        // -- The wizard and his guards
        des.monster({ id: 'Wizard of Yendor', x: 16, y: 5, asleep: 1 });
        des.monster('hell hound', 15, 5);
        des.monster('vampire lord', 17, 5);
        // -- The local treasure
        des.object('Book of the Dead', 16, 5);
        // -- Surrounding terror
        des.monster('kraken', 14, 2);
        des.monster('giant eel', 17, 2);
        des.monster('kraken', 13, 4);
        des.monster('giant eel', 13, 6);
        des.monster('kraken', 19, 4);
        des.monster('giant eel', 19, 6);
        des.monster('kraken', 15, 8);
        des.monster('giant eel', 17, 8);
        des.monster('piranha', 15, 2);
        des.monster('piranha', 19, 8);
        // -- Random monsters
        des.monster('D');
        des.monster('H');
        des.monster('&');
        des.monster('&');
        des.monster('&');
        des.monster('&');
        // -- And to make things a little harder.
        des.trap('board', 16, 4);
        des.trap('board', 16, 6);
        des.trap('board', 15, 5);
        des.trap('board', 17, 5);
        // -- Random traps.
        des.trap('spiked pit');
        des.trap('sleep gas');
        des.trap('anti magic');
        des.trap('magic');
        // -- Some random loot.
        des.object('ruby');
        des.object('!');
        des.object('!');
        des.object('?');
        des.object('?');
        des.object('+');
        des.object('+');
        des.object('+');
    } });

    const protected_ = lua_bor(bounds2.negate(), wiz1);
    G.hell_tweaks(protected_);
}

// C ref: dat/wizard2.lua (top-level chunk)
function wizard2_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'mazegrid', bg: '-' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');

    const bounds2 = tower_bounds2(selection);

    const wiz2 = des.map({ halign: 'center', valign: 'center', map: MAP_wizard2,
                           contents: function (rm) {
        des.levregion({ type: 'stair-up', region: [1, 0, 79, 20], region_islev: 1,
                        exclude: [0, 0, 28, 12] });
        des.levregion({ type: 'stair-down', region: [1, 0, 79, 20], region_islev: 1,
                        exclude: [0, 0, 28, 12] });
        des.levregion({ type: 'branch', region: [1, 0, 79, 20], region_islev: 1,
                        exclude: [0, 0, 28, 12] });
        des.teleport_region({ region: [1, 0, 79, 20], region_islev: 1,
                              exclude: [0, 0, 27, 12] });
        // -- entire tower in a region, constrains monster migration
        des.region({ region: [1, 1, 26, 11], lit: 0, type: 'ordinary', arrival_room: true });
        des.region({ region: [9, 3, 17, 9], lit: 0, type: 'zoo', filled: 1 });
        des.door('closed', 15, 2);
        des.door('closed', 11, 10);
        des.mazewalk(28, 5, 'east');
        des.ladder('up', 12, 1);
        des.ladder('down', 14, 11);
        // -- Non diggable walls everywhere
        des.non_diggable(selection.area(0, 0, 27, 12));
        //
        des.non_passwall(selection.area(0, 0, 27, 12));
        // -- Random traps.
        des.trap('spiked pit');
        des.trap('sleep gas');
        des.trap('anti magic');
        des.trap('magic');
        // -- Some random loot.
        des.object('!');
        des.object('!');
        des.object('?');
        des.object('?');
        des.object('+');
        // -- treasures
        des.object('"', 4, 6);
    } });

    const protected_ = lua_bor(bounds2.negate(), wiz2);
    G.hell_tweaks(protected_);
}

// C ref: dat/wizard3.lua (top-level chunk)
function wizard3_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'mazegrid', bg: '-' });

    des.level_flags('mazelevel', 'noteleport', 'hardfloor');

    const bounds2 = tower_bounds2(selection);

    const wiz3 = des.map({ halign: 'center', valign: 'center', map: MAP_wizard3,
                           contents: function (rm) {
        des.levregion({ type: 'stair-up', region: [1, 0, 79, 20], region_islev: 1,
                        exclude: [0, 0, 28, 12] });
        des.levregion({ type: 'stair-down', region: [1, 0, 79, 20], region_islev: 1,
                        exclude: [0, 0, 28, 12] });
        des.levregion({ type: 'branch', region: [1, 0, 79, 20], region_islev: 1,
                        exclude: [0, 0, 28, 12] });
        des.teleport_region({ region: [1, 0, 79, 20], region_islev: 1,
                              exclude: [0, 0, 27, 12] });
        des.levregion({ region: [25, 11, 25, 11], type: 'portal', name: 'fakewiz1' });
        des.mazewalk(28, 9, 'east');
        des.region({ region: [7, 3, 15, 11], lit: 0, type: 'morgue', filled: 2 });
        des.region({ region: [17, 6, 18, 11], lit: 0, type: 'beehive', filled: 1 });
        // -- make the entry chamber a real room; it affects monster arrival
        des.region({ region: [20, 6, 26, 11], lit: 0, type: 'ordinary', arrival_room: true,
                     contents: function () {
            let w = 'north';
            if (G.percent(50)) w = 'west';
            des.door({ state: 'secret', wall: w });
        } });
        des.door('closed', 18, 5);
        des.ladder('up', 11, 7);
        // -- Non diggable walls
        // -- Walls inside the moat stay diggable
        des.non_diggable(selection.area(0, 0, 6, 12));
        des.non_diggable(selection.area(6, 0, 27, 2));
        des.non_diggable(selection.area(16, 2, 27, 12));
        des.non_diggable(selection.area(6, 12, 16, 12));
        //
        des.non_passwall(selection.area(0, 0, 6, 12));
        des.non_passwall(selection.area(6, 0, 27, 2));
        des.non_passwall(selection.area(16, 2, 27, 12));
        des.non_passwall(selection.area(6, 12, 16, 12));
        //
        des.monster('L', 10, 7);
        des.monster('vampire lord', 12, 7);
        // -- Some surrounding horrors
        des.monster('kraken', 8, 5);
        des.monster('giant eel', 8, 8);
        des.monster('kraken', 14, 5);
        des.monster('giant eel', 14, 8);
        // -- Other monsters
        des.monster('L');
        des.monster('D');
        des.monster('D', 26, 9);
        des.monster('&');
        des.monster('&');
        des.monster('&');
        // -- And to make things a little harder.
        des.trap('board', 10, 7);
        des.trap('board', 12, 7);
        des.trap('board', 11, 6);
        des.trap('board', 11, 8);
        // -- Some loot
        des.object(')');
        des.object('!');
        des.object('?');
        des.object('?');
        des.object('(');
        // -- treasures
        des.object('"', 11, 7);
    } });

    const protected_ = lua_bor(bounds2.negate(), wiz3);
    G.hell_tweaks(protected_);
}

// C ref: dat/fakewiz1.lua, dat/fakewiz2.lua (top-level chunks); the two
// differ only in fakewiz1's portal and arrival room and fakewiz2's amulet.
function fakewiz_lua(L, which) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'mazegrid', bg: '-' });

    des.level_flags('mazelevel');

    const bounds2 = tower_bounds2(selection);

    const fakewiz = des.map({ halign: 'center', valign: 'center', map: MAP_fakewiz,
                              contents: function (rm) {
        des.levregion({ region: [1, 0, 79, 20], region_islev: 1, exclude: [0, 0, 8, 8],
                        type: 'stair-up' });
        des.levregion({ region: [1, 0, 79, 20], region_islev: 1, exclude: [0, 0, 8, 8],
                        type: 'stair-down' });
        des.levregion({ region: [1, 0, 79, 20], region_islev: 1, exclude: [0, 0, 8, 8],
                        type: 'branch' });
        des.teleport_region({ region: [1, 0, 79, 20], region_islev: 1,
                              exclude: [2, 2, 6, 6] });
        if (which === 1)
            des.levregion({ region: [4, 4, 4, 4], type: 'portal', name: 'wizard3' });
        des.mazewalk(8, 5, 'east');
        if (which === 1)
            des.region({ region: [4, 3, 6, 6], lit: 0, type: 'ordinary', irregular: 1,
                         arrival_room: true });
        des.monster('L', 4, 4);
        des.monster('vampire lord', 3, 4);
        des.monster('kraken', 6, 6);
        // -- And to make things a little harder.
        des.trap('board', 4, 3);
        des.trap('board', 4, 5);
        des.trap('board', 3, 4);
        des.trap('board', 5, 4);
        if (which === 2) {
            // -- treasures
            des.object('"', 4, 4);
        }
    } });

    const protected_ = lua_bor(bounds2.negate(), fakewiz);
    G.hell_tweaks(protected_);
}

// The hand-ported Wizard's Tower scripts by file name, for nhl_loadlua().
export const wizard_lua_files = {
    'wizard1.lua': wizard1_lua,
    'wizard2.lua': wizard2_lua,
    'wizard3.lua': wizard3_lua,
    'fakewiz1.lua': (L) => fakewiz_lua(L, 1),
    'fakewiz2.lua': (L) => fakewiz_lua(L, 2),
};
