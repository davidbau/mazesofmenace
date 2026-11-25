// lairs_lua.js — port of the Gehennom demon lair level scripts:
// dat/orcus.lua (Orcus Town), dat/juiblex.lua (Juiblex's swamp),
// dat/baalz.lua (Baalzebub's lair) and dat/asmodeus.lua (Asmodeus' lair).
// makemaz() loads them through load_special() (sp_lev.c).
// C ref: dat/orcus.lua, dat/juiblex.lua, dat/baalz.lua, dat/asmodeus.lua
//
// Translated from the .lua files by a script (the des.map() maps are
// verbatim), then reviewed. Lua arrays are 1-based: t[i] is t[i - 1] here.
// Lua-side rolls (math.random, nh.rn2; percent, shuffle and d roll inside
// nhlib_lua.js) go through withRngCaller() with the tag the C recorder
// writes; the selection operators |, &, + and - are lua_bor(), lua_band(),
// lua_add() and lua_sub() (nhlua.js).

import { withRngCaller } from './rng.js';
import { lua_bor, lua_callmeth } from './nhlua.js';
import { chunk_random } from './nhlib_lua.js';

const MAP_orcus = [
    '.|....|....|....|..............|....|........',
    '.|....|....|....|..............|....|........',
    '.|....|....|....|--...-+-------|.............',
    '.|....|....|....|..............+.............',
    '.|.........|....|..............|....|........',
    '.--+-...-+----+--....-------...--------.-+---',
    '.....................|.....|.................',
    '.....................|.....|.................',
    '.--+----....-+---....|.....|...----------+---',
    '.|....|....|....|....---+---...|......|......',
    '.|.........|....|..............|......|......',
    '.----...---------.....-----....+......|......',
    '.|........................|....|......|......',
    '.----------+-...--+--|....|....----------+---',
    '.|....|..............|....+....|.............',
    '.|....+.......|......|....|....|.............',
    '.|....|.......|......|....|....|.............',
].join('\n') + '\n';

// C ref: dat/orcus.lua
function orcus_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;
    // math.random called from the main chunk or an anonymous function
    const random = (line, ...args) => chunk_random(G, 'orcus.lua', line, ...args);

    des.level_init({ style: 'mazegrid', bg: '-' });

    des.level_flags('mazelevel', 'shortsighted');

    const tmpbounds = selection.match('-');
    // tmpbounds:bounds() (a Selvar has a "bounds" field, so call the method
    // through the metatable)
    const bnds = lua_callmeth(tmpbounds, 'bounds');
    const bounds2 = selection.fillrect(bnds.lx, bnds.ly + 1, bnds.hx - 2, bnds.hy - 1);

    // A ghost town
    const orcus1 = des.map({ halign: 'right', valign: 'center', map: MAP_orcus, contents: function(rm) {
        des.mazewalk(0, 6, 'west');
        des.region(selection.area(1, 0, 44, 16), 'unlit');
        des.stair('down', 33, 15);
        des.object('boulder', 19, 2);
        des.object('boulder', 20, 2);
        des.object('boulder', 21, 2);
        des.object('boulder', 36, 2);
        des.object('boulder', 36, 3);
        des.object('boulder', 6, 4);
        des.object('boulder', 5, 5);
        des.object('boulder', 6, 5);
        des.object('boulder', 7, 5);
        des.object('boulder', 39, 5);
        des.object('boulder', 8, 8);
        des.object('boulder', 9, 8);
        des.object('boulder', 10, 8);
        des.object('boulder', 11, 8);
        des.object('boulder', 6, 10);
        des.object('boulder', 5, 11);
        des.object('boulder', 6, 11);
        des.object('boulder', 7, 11);
        des.object('boulder', 21, 11);
        des.object('boulder', 21, 12);
        des.object('boulder', 13, 13);
        des.object('boulder', 14, 13);
        des.object('boulder', 15, 13);
        des.object('boulder', 14, 14);
        des.door('closed', 23, 2);
        des.door('open', 31, 3);
        des.door('nodoor', 3, 5);
        des.door('closed', 9, 5);
        des.door('closed', 14, 5);
        des.door('closed', 41, 5);
        des.door('open', 3, 8);
        des.door('nodoor', 13, 8);
        des.door('open', 41, 8);
        des.door('closed', 24, 9);
        des.door('closed', 31, 11);
        des.door('open', 11, 13);
        des.door('closed', 18, 13);
        des.door('closed', 41, 13);
        des.door('open', 26, 14);
        des.door('closed', 6, 15);
        des.altar({ x: 24, y: 7, align: 'noalign', type: 'sanctum' });
        des.region({ region: [22, 12, 25, 16], lit: 0, type: 'morgue', filled: 1 });
        des.region({ region: [32, 9, 37, 12], lit: 1, type: 'shop', filled: 1 });
        des.region({ region: [12, 0, 15, 4], lit: 1, type: 'shop', filled: 1 });
        des.trap('spiked pit');
        des.trap('sleep gas');
        des.trap('anti magic');
        des.trap('fire');
        des.trap('fire');
        des.trap('fire');
        des.trap('magic');
        des.trap('magic');
        des.object();
        des.object();
        des.object();
        des.object();
        des.object();
        des.object();
        des.object();
        des.object();
        des.object();
        des.object();
        if (random(107, 0, 1) === 1) {
            des.object('magic marker');
        } else {
            des.object('magic lamp');
        }
        des.monster('Orcus', 33, 15);
        des.monster('human zombie', 32, 15);
        des.monster('shade', 32, 14);
        des.monster('shade', 32, 16);
        des.monster('vampire', 35, 16);
        des.monster('vampire', 35, 14);
        des.monster('vampire lord', 36, 14);
        des.monster('vampire lord', 36, 15);
        des.monster('skeleton');
        des.monster('skeleton');
        des.monster('skeleton');
        des.monster('skeleton');
        des.monster('skeleton');
        des.monster('shade');
        des.monster('shade');
        des.monster('shade');
        des.monster('shade');
        des.monster('giant zombie');
        des.monster('giant zombie');
        des.monster('giant zombie');
        des.monster('ettin zombie');
        des.monster('ettin zombie');
        des.monster('ettin zombie');
        des.monster('human zombie');
        des.monster('human zombie');
        des.monster('human zombie');
        des.monster('vampire');
        des.monster('vampire');
        des.monster('vampire');
        des.monster('vampire lord');
        des.monster('vampire lord');
        des.monster();
        des.monster();
        des.monster();
        des.monster();
        des.monster();
    } });

    des.levregion({ region: [1, 0, 12, 20], region_islev: 1, exclude: [20, 1, 70, 20], exclude_islev: 1, type: 'stair-up' });
    des.levregion({ region: [1, 0, 12, 20], region_islev: 1, exclude: [20, 1, 70, 20], exclude_islev: 1, type: 'branch' });
    des.teleport_region({ region: [1, 0, 12, 20], region_islev: 1, exclude: [20, 1, 70, 20], exclude_islev: 1 });

    const protected_ = lua_bor(bounds2.negate(), orcus1);
    G.hell_tweaks(protected_);
}

const MAP_juiblex_1 = [
    'xxxxxxxx',
    'xx...xxx',
    'xxx...xx',
    'xxxx.xxx',
    'xxxxxxxx',
].join('\n') + '\n';

const MAP_juiblex_2 = [
    'xxxxxxxx',
    'xxxx.xxx',
    'xxx...xx',
    'xx...xxx',
    'xxxxxxxx',
].join('\n') + '\n';

const MAP_juiblex_3 = [
    'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'xxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxx',
    'xxx...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...xxx',
    'xxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxx',
    'xxxxxxxxxxxxxxxxxxxxxxxx}}}xxxxxxxxxxxxxxx}}}}}xxxx',
    'xxxxxxxxxxxxxxxxxxxxxxx}}}}}xxxxxxxxxxxxx}.....}xxx',
    'xxxxxxxxxxxxxxxxxxxxxx}}...}}xxxxxxxxxxx}..P.P..}xx',
    'xxxxxxxxxxxxxxxxxxxxx}}..P..}}xxxxxxxxxxx}.....}xxx',
    'xxxxxxxxxxxxxxxxxxxxx}}.P.P.}}xxxxxxxxxxxx}...}xxxx',
    'xxxxxxxxxxxxxxxxxxxxx}}..P..}}xxxxxxxxxxxx}...}xxxx',
    'xxxxxxxxxxxxxxxxxxxxxx}}...}}xxxxxxxxxxxxxx}}}xxxxx',
    'xxxxxxxxxxxxxxxxxxxxxxx}}}}}xxxxxxxxxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxxxxxxxxxxxx}}}xxxxxxxxxxxxxxxxxxxxxxxx',
    'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'xxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxx',
    'xxx...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...xxx',
    'xxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxx',
    'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
].join('\n') + '\n';

// C ref: dat/juiblex.lua
function juiblex_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_flags('mazelevel', 'shortsighted', 'noflip', 'temperate');
    // des.level_init(mines,'.','}',true,true,unlit,false)
    des.level_init({ style: 'swamp', lit: 0 });
    // guarantee at least one open spot to ensure successful stair placement
    des.map({ halign: 'left', valign: 'bottom', map: MAP_juiblex_1 });
    des.object('boulder');
    des.map({ halign: 'right', valign: 'top', map: MAP_juiblex_2 });
    des.object('boulder');
    // lair
    des.map(MAP_juiblex_3);
    // Random registers
    const monster = ['j', 'b', 'P', 'F'];
    G.shuffle(monster);

    const place = selection.new();
    place.set(4, 2);
    place.set(46, 2);
    place.set(4, 15);
    place.set(46, 15);

    // Dungeon description
    des.region({ region: [0, 0, 50, 17], lit: 0, type: 'swamp', filled: 2 });
    des.levregion({ region: [1, 0, 11, 20], region_islev: 1, exclude: [0, 0, 50, 17], type: 'stair-down' });
    des.levregion({ region: [69, 0, 79, 20], region_islev: 1, exclude: [0, 0, 50, 17], type: 'stair-up' });
    des.levregion({ region: [1, 0, 11, 20], region_islev: 1, exclude: [0, 0, 50, 17], type: 'branch' });
    des.teleport_region({ region: [1, 0, 11, 20], region_islev: 1, exclude: [0, 0, 50, 17], dir: 'up' });
    des.teleport_region({ region: [69, 0, 79, 20], region_islev: 1, exclude: [0, 0, 50, 17], dir: 'down' });
    des.feature('fountain', place.rndcoord(1));
    des.monster({ id: 'giant mimic', coord: place.rndcoord(1), appear_as: 'ter:fountain' });
    des.monster({ id: 'giant mimic', coord: place.rndcoord(1), appear_as: 'ter:fountain' });
    des.monster({ id: 'giant mimic', coord: place.rndcoord(1), appear_as: 'ter:fountain' });
    // The demon of the swamp
    des.monster('Juiblex', 25, 8);
    // And a couple demons
    des.monster('lemure', 43, 8);
    des.monster('lemure', 44, 8);
    des.monster('lemure', 45, 8);
    // Some liquids and gems
    des.object('*', 43, 6);
    des.object('*', 45, 6);
    des.object('!', 43, 9);
    des.object('!', 44, 9);
    des.object('!', 45, 9);
    // And lots of blobby monsters
    des.monster(monster[3], 25, 6);
    des.monster(monster[0], 24, 7);
    des.monster(monster[1], 26, 7);
    des.monster(monster[2], 23, 8);
    des.monster(monster[2], 27, 8);
    des.monster(monster[1], 24, 9);
    des.monster(monster[0], 26, 9);
    des.monster(monster[3], 25, 10);
    des.monster('j');
    des.monster('j');
    des.monster('j');
    des.monster('j');
    des.monster('P');
    des.monster('P');
    des.monster('P');
    des.monster('P');
    des.monster('b');
    des.monster('b');
    des.monster('b');
    des.monster('F');
    des.monster('F');
    des.monster('F');
    des.monster('m');
    des.monster('m');
    des.monster('jellyfish');
    des.monster('jellyfish');
    // Some random objects
    des.object('!');
    des.object('!');
    des.object('!');
    des.object('%');
    des.object('%');
    des.object('%');
    des.object('boulder');
    // Some traps
    des.trap('sleep gas');
    des.trap('sleep gas');
    des.trap('anti magic');
    des.trap('anti magic');
    des.trap('magic');
    des.trap('magic');
}

const MAP_baalz = [
    '-------------------------------------------------',
    '|                   ----               ----      ',
    '|          ----     |     -----------  |         ',
    '| ------      |  ---------|.........|--P         ',
    '| F....|  -------|...........--------------      ',
    '---....|--|..................S............|----  ',
    '+...--....S..----------------|............S...|  ',
    '---....|--|..................|............|----  ',
    '| F....|  -------|...........-----S--------      ',
    '| ------      |  ---------|.........|--P         ',
    '|          ----     |     -----------  |         ',
    '|                   ----               ----      ',
    '-------------------------------------------------',
].join('\n') + '\n';

// C ref: dat/baalz.lua
function baalz_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ', lit: 0 });

    // TODO FIXME: see baalz_fixup - the legs get removed currently.

    des.level_flags('mazelevel', 'corrmaze');
    // the two pools are fakes used to mark spots which need special wall fixups
    // the two iron bars are eyes and spots to their left will be made diggable
    des.map({ halign: 'right', valign: 'center', map: MAP_baalz });
    des.levregion({ region: [1, 0, 15, 20], region_islev: 1, exclude: [15, 1, 70, 16], exclude_islev: 1, type: 'stair-up' });
    des.levregion({ region: [1, 0, 15, 20], region_islev: 1, exclude: [15, 1, 70, 16], exclude_islev: 1, type: 'branch' });
    des.teleport_region({ region: [1, 0, 15, 20], region_islev: 1, exclude: [15, 1, 70, 16], exclude_islev: 1 });
    // this actually leaves the farthest right column diggable
    des.non_diggable(selection.area(0, 0, 47, 12));
    des.mazewalk(0, 6, 'west');
    des.stair('down', 44, 6);
    des.door('locked', 0, 6);
    // The fellow in residence
    des.monster('Baalzebub', 35, 6);
    // Some random weapons and armor.
    des.object('[');
    des.object('[');
    des.object(')');
    des.object(')');
    des.object('*');
    des.object('!');
    des.object('!');
    des.object('?');
    des.object('?');
    des.object('?');
    // Some traps.
    des.trap('spiked pit');
    des.trap('fire');
    des.trap('sleep gas');
    des.trap('anti magic');
    des.trap('fire');
    des.trap('magic');
    des.trap('magic');
    // Random monsters.
    des.monster('ghost', 37, 7);
    des.monster('horned devil', 32, 5);
    des.monster('barbed devil', 38, 7);
    des.monster('L');
    // Some Vampires for good measure
    des.monster('V');
    des.monster('V');
    des.monster('V');
}

const MAP_asmodeus_1 = [
    '---------------------',
    '|.............|.....|',
    '|.............S.....|',
    '|---+------------...|',
    '|.....|.........|-+--',
    '|..---|.........|....',
    '|..|..S.........|....',
    '|..|..|.........|....',
    '|..|..|.........|-+--',
    '|..|..-----------...|',
    '|..S..........|.....|',
    '---------------------',
].join('\n') + '\n';

const MAP_asmodeus_2 = [
    '---------------------------------',
    '................................|',
    '................................+',
    '................................|',
    '---------------------------------',
].join('\n') + '\n';

// C ref: dat/asmodeus.lua
function asmodeus_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'mazegrid', bg: '-' });

    des.level_flags('mazelevel');

    const tmpbounds = selection.match('-');
    // tmpbounds:bounds() (a Selvar has a "bounds" field, so call the method
    // through the metatable)
    const bnds = lua_callmeth(tmpbounds, 'bounds');
    const bounds2 = selection.fillrect(bnds.lx, bnds.ly + 1, bnds.hx - 2, bnds.hy - 1);

    // First part
    const asmo1 = des.map({ halign: 'half-left', valign: 'center', map: MAP_asmodeus_1, contents: function(rm) {
        des.door('closed', 4, 3);
        des.door('locked', 18, 4);
        des.door('closed', 18, 8);
        des.stair('down', 13, 7);
        des.non_diggable(selection.area(0, 0, 20, 11));
        des.region(selection.area(1, 1, 20, 10), 'unlit');
        des.monster('Asmodeus', 12, 7);
        des.object('[');
        des.object('[');
        des.object(')');
        des.object(')');
        des.object('*');
        des.object('!');
        des.object('!');
        des.object('?');
        des.object('?');
        des.object('?');
        des.trap('spiked pit', 5, 2);
        des.trap('fire', 8, 6);
        des.trap('sleep gas');
        des.trap('anti magic');
        des.trap('fire');
        des.trap('magic');
        des.trap('magic');
        des.monster('ghost', 11, 7);
        des.monster('horned devil', 10, 5);
        des.monster('L');
        des.monster('V');
        des.monster('V');
        des.monster('V');
    } });

    des.levregion({ region: [1, 0, 6, 20], region_islev: 1, exclude: [6, 1, 70, 16], exclude_islev: 1, type: 'stair-up' });

    des.levregion({ region: [1, 0, 6, 20], region_islev: 1, exclude: [6, 1, 70, 16], exclude_islev: 1, type: 'branch' });
    des.teleport_region({ region: [1, 0, 6, 20], region_islev: 1, exclude: [6, 1, 70, 16], exclude_islev: 1 });

    // Second part
    const asmo2 = des.map({ halign: 'half-right', valign: 'center', map: MAP_asmodeus_2, contents: function(rm) {
        des.mazewalk(32, 2, 'east');
        des.non_diggable(selection.area(0, 0, 32, 4));
        des.door('closed', 32, 2);
        des.monster('&');
        des.monster('&');
        des.monster('&');
        des.trap('anti magic');
        des.trap('fire');
        des.trap('magic');
    } });

    const protected_ = lua_bor(lua_bor(bounds2.negate(), asmo1), asmo2);
    G.hell_tweaks(protected_);
}

// The ported level scripts by file name, for nhl_loadlua().
export const lairs_lua_files = {
    'orcus.lua': orcus_lua,
    'juiblex.lua': juiblex_lua,
    'baalz.lua': baalz_lua,
    'asmodeus.lua': asmodeus_lua,
};
