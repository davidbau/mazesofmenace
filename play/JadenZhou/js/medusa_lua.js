// medusa_lua.js — hand port of dat/medusa-1.lua .. dat/medusa-4.lua, the
// Medusa's island variants. makemaz("medusa") picks one with rnd(4) and
// loads it through load_special() (sp_lev.c).
// C ref: dat/medusa-1.lua, dat/medusa-2.lua, dat/medusa-3.lua,
//        dat/medusa-4.lua
//
// Lua-side rolls: percent() (nhlib.lua), tagged the way the C recorder
// writes them (see nhlib_lua.js). The rndcoord picks roll in selvar.c.
// Every other roll comes from the des.* functions (sp_lev.js).

// The des.map() maps, verbatim from the .lua files (a Lua long string
// drops the newline right after its opening [[).
const MAP_medusa_1 = [
    '}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}',
    '}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}',
    '}}.}}}}}..}}}}}......}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}....}}}...}}}}}',
    '}...}}.....}}}}}....}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}...............}',
    '}....}}}}}}}}}}....}}}..}}}}}}}}}}}.......}}}}}}}}}}}}}}}}..}}.....}}}...}}',
    '}....}}}}}}}}.....}}}}..}}}}}}.................}}}}}}}}}}}.}}}}.....}}...}}',
    '}....}}}}}}}}}}}}.}}}}.}}}}}}.-----------------.}}}}}}}}}}}}}}}}}.........}',
    '}....}}}}}}}}}}}}}}}}}}.}}}...|...............S...}}}}}}}}}}}}}}}}}}}....}}',
    '}.....}.}}....}}}}}}}}}.}}....--------+--------....}}}}}}..}}}}}}}}}}}...}}',
    '}......}}}}..}}}}}}}}}}}}}........|.......|........}}}}}....}}}}}}}}}}}}}}}',
    '}.....}}}}}}}}}}}}}}}}}}}}........|.......|........}}}}}...}}}}}}}}}.}}}}}}',
    '}.....}}}}}}}}}}}}}}}}}}}}....--------+--------....}}}}}}.}.}}}}}}}}}}}}}}}',
    '}......}}}}}}}}}}}}}}}}}}}}...S...............|...}}}}}}}}}}}}}}}}}.}}}}}}}',
    '}.......}}}}}}}..}}}}}}}}}}}}.-----------------.}}}}}}}}}}}}}}}}}....}}}}}}',
    '}........}}.}}....}}}}}}}}}}}}.................}}}}}..}}}}}}}}}.......}}}}}',
    '}.......}}}}}}}......}}}}}}}}}}}}}}.......}}}}}}}}}.....}}}}}}...}}..}}}}}}',
    '}.....}}}}}}}}}}}.....}}}}}}}}}}}}}}}}}}}}}}.}}}}}}}..}}}}}}}}}}....}}}}}}}',
    '}}..}}}}}}}}}}}}}....}}}}}}}}}}}}}}}}}}}}}}...}}..}}}}}}}.}}.}}}}..}}}}}}}}',
    '}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}',
    '}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}',
].join('\n') + '\n';

const MAP_medusa_2 = [
    '}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}',
    '}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}',
    '}------}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}-------}}}}}}}}--------------}',
    '}|....|}}}}}}}}}..}.}}..}}}}}}}}}}}}}..}}}}}}-.....--}}}}}}}|............|}',
    '}|....|.}}}}}}}}}}}.}...}}..}}}}}}}}}}}}}}}}}---......}}}}}.|............|}',
    '}S....|.}}}}}}---}}}}}}}}}}}}}}}}}}}}}}}}}}---...|..-}}}}}}.S..----------|}',
    '}|....|.}}}}}}-...}}}}}}}}}.}}...}.}}}}.}}}......----}}}}}}.|............|}',
    '}|....|.}}}}}}-....--}}}}}}}}}}}}}}}}}}}}}}----...--}}}}}}}.|..--------+-|}',
    '}|....|.}}}}}}}......}}}}...}}}}}}.}}}}}}}}}}}---..---}}}}}.|..|..S...|..|}',
    '}|....|.}}}}}}-....-}}}}}}}------}}}}}}}}}}}}}}-...|.-}}}}}.|..|..|...|..|}',
    '}|....|.}}}}}}}}}---}}}}}}}........}}}}}}}}}}---.|....}}}}}.|..|..|...|..|}',
    '}|....|.}}}}}}}}}}}}}}}}}}-....|...-}}}}}}}}--...----.}}}}}.|..|..|...|..|}',
    '}|....|.}}}}}}..}}}}}}}}}}---..--------}}}}}-..---}}}}}}}}}.|..|..-------|}',
    '}|...}|...}}}.}}}}}}...}}}}}--..........}}}}..--}}}}}}}}}}}.|..|.........|}',
    '}|...}S...}}.}}}}}}}}}}}}}}}-..--------}}}}}}}}}}}}}}...}}}.|..--------..S}',
    '}|...}|...}}}}}}}..}}}}}}----..|....-}}}}}}}}}}}}}}}}}..}}}.|............|}',
    '}|....|}}}}}....}}}}..}}.-.......----}}......}}}}}}.......}}|............|}',
    '}------}}}}}}}}}}}}}}}}}}---------}}}}}}}}}}}}}}}}}}}}}}}}}}--------------}',
    '}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}',
    '}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}',
].join('\n') + '\n';

const MAP_medusa_3 = [
    '}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}',
    '}}}}}}}}}}.}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.}}}}}}}}}}}}}}}}}}}}}}}}}}}}',
    '}}}}}}}}T..T.}}}}}}}}}}}}}}}}}}}}..}}}}}}}}.}}}...}}}}}}}.}}}}}......}}}}}}}',
    '}}}}}}.......T.}}}}}}}}}}}..}}}}..T.}}}}}}...T...T..}}...T..}}..-----..}}}}}',
    '}}}...-----....}}}}}}}}}}.T..}}}}}...}}}}}.....T..}}}}}......T..|...|.T..}}}',
    '}}}.T.|...|...T.}}}}}}}.T......}}}}..T..}}.}}}.}}...}}}}}.T.....+...|...}}}}',
    '}}}}..|...|.}}.}}}}}.....}}}T.}}}}.....}}}}}}.T}}}}}}}}}}}}}..T.|...|.}}}}}}',
    '}}}}}.|...|.}}}}}}..T..}}}}}}}}}}}}}T.}}}}}}}}..}}}}}}}}}}}.....-----.}}}}}}',
    '}}}}}.--+--..}}}}}}...}}}}}}}}}}}}}}}}}}}T.}}}}}}}}}}}}}}}}.T.}........}}}}}',
    '}}}}}.......}}}}}}..}}}}}}}}}.}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.}}}.}}.T.}}}}}}',
    '}}.T...T...}}}}T}}}}}}}}}}}....}}}}}}}}}}T}}}}}.T}}...}}}}}}}}}}}}}}...}}}}}',
    '}}}...T}}}}}}}..}}}}}}}}}}}.T...}}}}}}}}.T.}.T.....T....}}}}}}}}}}}}}.}}}}}}',
    '}}}}}}}}}}}}}}}....}}}}}}}...}}.}}}}}}}}}}............T..}}}}}.T.}}}}}}}}}}}',
    '}}}}}}}}}}}}}}}}..T..}}}}}}}}}}}}}}..}}}}}..------+--...T.}}}....}}}}}}}}}}}',
    '}}}}.}..}}}}}}}.T.....}}}}}}}}}}}..T.}}}}.T.|...|...|....}}}}}.}}}}}...}}}}}',
    '}}}.T.}...}..}}}}T.T.}}}}}}.}}}}}}}....}}...|...+...|.}}}}}}}}}}}}}..T...}}}',
    '}}}}..}}}.....}}...}}}}}}}...}}}}}}}}}}}}}T.|...|...|}}}}}}}}}}}....T..}}}}}',
    '}}}}}..}}}.T..}}}.}}}}}}}}.T..}}}}}}}}}}}}}}---S-----}}}}}}}}}}}}}....}}}}}}',
    '}}}}}}}}}}}..}}}}}}}}}}}}}}}.}}}}}}}}}}}}}}}}}T..T}}}}}}}}}}}}}}}}}}}}}}}}}}',
    '}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}',
].join('\n') + '\n';

const MAP_medusa_4 = [
    '}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}',
    '}}}}}}}}}}}}}}........}}}}}}}}}}}}}}}}}}}}}}}..}}}.....}}}}}}}}}}}----|}}}}}',
    '}}}}}}..----------F-.....}}}}}}}}}}}}}}}}..---...}}}}....T.}}}}}}}....|}}}}}',
    '}}}.....|...F......S}}}}....}}}}}}}...}}.....|}}.}}}}}}}......}}}}|......}}}',
    '}}}.....+...|..{...|}}}}}}}}}}}}.....}}}}|...|}}}}}}}}}}}.}}}}}}}}----.}}}}}',
    '}}......|...|......|}}}}}}}}}......}}}}}}|.......}}}}}}}}}}}}}..}}}}}...}}}}',
    '}}|-+--F|-+--....|F|-|}}}}}....}}}....}}}-----}}.....}}}}}}}......}}}}.}}}}}',
    '}}|...}}|...|....|}}}|}}}}}}}..}}}}}}}}}}}}}}}}}}}}....}}}}}}}}....T.}}}}}}}',
    '}}|...}}F...+....F}}}}}}}..}}}}}}}}}}}}}}...}}}}}}}}}}}}}}}}}}}}}}....}}..}}',
    '}}|...}}|...|....|}}}|}....}}}}}}....}}}...}}}}}...}}}}}}}}}}}}}}}}}.....}}}',
    '}}--+--F|-+--....-F|-|....}}}}}}}}}}.T...}}}}....---}}}}}}}}}}}}}}}}}}}}}}}}',
    '}}......|...|......|}}}}}.}}}}}}}}}....}}}}}}}.....|}}}}}}}}}.}}}}}}}}}}}}}}',
    '}}}}....+...|..{...|.}}}}}}}}}}}}}}}}}}}}}}}}}}.|..|}}}}}}}......}}}}...}}}}',
    '}}}}}}..|...F......|...}}}}}}}}}}..---}}}}}}}}}}--.-}}}}}....}}}}}}....}}}}}',
    '}}}}}}}}-----S----F|....}}}}}}}}}|...|}}}}}}}}}}}}...}}}}}}...}}}}}}..}}}}}}',
    '}}}}}}}}}..............T...}}}}}.|.......}}}}}}}}}}}}}}..}...}.}}}}....}}}}}',
    '}}}}}}}}}}....}}}}...}...}}}}}.......|.}}}}}}}}}}}}}}.......}}}}}}}}}...}}}}',
    '}}}}}}}}}}..}}}}}}}}}}.}}}}}}}}}}-..--.}}}}}}}}..}}}}}}..T...}}}..}}}}}}}}}}',
    '}}}}}}}}}...}}}}}}}}}}}}}}}}}}}}}}}...}}}}}}}....}}}}}}}.}}}..}}}...}}}}}}}}',
    '}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}.}}}}}}....}}}}}}}}}}}}}}}}}}}...}}}}}}',
    '}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}',
].join('\n') + '\n';

// C ref: dat/medusa-1.lua (top-level chunk)
// -- These are the Medusa's levels :
function medusa_1_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport');

    des.map(MAP_medusa_1);
    // -- Dungeon Description
    des.region(selection.area(0, 0, 74, 19), 'lit');
    des.region(selection.area(31, 7, 45, 7), 'unlit');
    // -- make the downstairs room a real room to control arriving monsters,
    // -- and also as a fixup_special hack; the first room defined on Medusa's level
    // -- receives some statues
    des.region({ region: [35, 9, 41, 10], lit: 0, type: 'ordinary', arrival_room: true });
    des.region(selection.area(31, 12, 45, 12), 'unlit');
    // -- Teleport: down to up stairs island, up to Medusa's island
    des.teleport_region({ region: [1, 1, 5, 17], dir: 'down' });
    des.teleport_region({ region: [26, 4, 50, 15], dir: 'up' });
    // -- Stairs
    des.stair('up', 5, 14);
    des.stair('down', 36, 10);
    // -- Doors
    des.door('closed', 46, 7);
    des.door('locked', 38, 8);
    des.door('locked', 38, 11);
    des.door('closed', 30, 12);
    // -- Branch, not allowed inside Medusa's building.
    des.levregion({ region: [1, 0, 79, 20], exclude: [30, 6, 46, 13], type: 'branch' });
    // -- Non diggable walls
    des.non_diggable(selection.area(30, 6, 46, 13));
    // -- Objects
    des.object({ id: 'statue', x: 36, y: 10, buc: 'uncursed',
                 montype: 'knight', historic: 1, male: 1, name: 'Perseus',
                 contents: function() {
                     if (G.percent(75)) {
                         des.object({ id: 'shield of reflection', buc: 'cursed', spe: 0 });
                     }
                     if (G.percent(25)) {
                         des.object({ id: 'levitation boots', spe: 0 });
                     }
                     if (G.percent(50)) {
                         des.object({ id: 'scimitar', buc: 'blessed', spe: 2 });
                     }
                     if (G.percent(50)) {
                         des.object('sack');
                     }
                 },
    });

    // -- Specifying explicit contents forces them to be empty.
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    // -- Random traps
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    des.trap('board', 38, 7);
    des.trap('board', 38, 12);
    // -- Random monsters
    des.monster({ id: 'Medusa', x: 36, y: 10, asleep: 1 });
    des.monster('giant eel', 11, 6);
    des.monster('giant eel', 23, 13);
    des.monster('giant eel', 29, 2);
    des.monster('jellyfish', 2, 2);
    des.monster('jellyfish', 0, 8);
    des.monster('jellyfish', 4, 18);
    des.monster('water troll', 51, 3);
    des.monster('water troll', 64, 11);
    des.monster({ class: 'S', x: 38, y: 7 });
    des.monster({ class: 'S', x: 38, y: 12 });
    des.monster();
    des.monster();
    des.monster();
    des.monster();
    des.monster();
    des.monster();
    des.monster();
    des.monster();
    des.monster();
    des.monster();
}

// C ref: dat/medusa-2.lua (top-level chunk)
function medusa_2_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });

    des.level_flags('mazelevel', 'noteleport');

    des.map(MAP_medusa_2);
    // -- Dungeon Description
    des.region(selection.area(0, 0, 74, 19), 'lit');
    des.region(selection.area(2, 3, 5, 16), 'unlit');
    // -- fixup_special hack: the first room defined on a Medusa level gets some
    // -- leaderboard statues; setting the region as irregular makes it a room
    des.region({ region: [61, 3, 72, 16], lit: 0, type: 'ordinary', irregular: 1 });
    des.region(selection.area(71, 8, 72, 11), 'unlit');
    // -- make the downstairs area a real room to control arriving monsters
    des.region({ region: [67, 8, 69, 11], lit: 1, type: 'ordinary', arrival_room: true });
    // -- Teleport: down to up stairs island, up to Medusa's island
    des.teleport_region({ region: [2, 3, 5, 16], dir: 'down' });
    des.teleport_region({ region: [61, 3, 72, 16], dir: 'up' });
    // -- Stairs
    des.stair('up', 4, 9);
    des.stair('down', 68, 10);
    // -- Doors
    des.door('locked', 71, 7);
    // -- Branch, not allowed on Medusa's island.
    des.levregion({ type: 'branch', region: [1, 0, 79, 20], exclude: [59, 1, 73, 17] });
    // -- Non diggable walls
    des.non_diggable(selection.area(1, 2, 6, 17));
    des.non_diggable(selection.area(60, 2, 73, 17));
    // -- Objects
    des.object({ id: 'statue', x: 68, y: 10, buc: 'uncursed',
                 montype: 'knight', historic: 1, male: 1, name: 'Perseus',
                 contents: function() {
                     if (G.percent(25)) {
                         des.object({ id: 'shield of reflection', buc: 'cursed', spe: 0 });
                     }
                     if (G.percent(75)) {
                         des.object({ id: 'levitation boots', spe: 0 });
                     }
                     if (G.percent(50)) {
                         des.object({ id: 'scimitar', buc: 'blessed', spe: 2 });
                     }
                     if (G.percent(50)) {
                         des.object('sack');
                     }
                 },
    });
    des.object({ id: 'statue', x: 64, y: 8, contents: 0 });
    des.object({ id: 'statue', x: 65, y: 8, contents: 0 });
    des.object({ id: 'statue', x: 64, y: 9, contents: 0 });
    des.object({ id: 'statue', x: 65, y: 9, contents: 0 });
    des.object({ id: 'statue', x: 64, y: 10, contents: 0 });
    des.object({ id: 'statue', x: 65, y: 10, contents: 0 });
    des.object({ id: 'statue', x: 64, y: 11, contents: 0 });
    des.object({ id: 'statue', x: 65, y: 11, contents: 0 });
    des.object('boulder', 4, 4);
    des.object('/', 52, 9);
    des.object('boulder', 52, 9);
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    des.object();
    // -- Traps
    des.trap('magic', 3, 12);
    des.trap();
    des.trap();
    des.trap();
    des.trap();
    // -- Monsters.
    des.monster({ id: 'Medusa', x: 68, y: 10, asleep: 1 });
    des.monster('gremlin', 2, 14);
    des.monster('titan', 2, 5);
    des.monster('electric eel', 10, 13);
    des.monster('electric eel', 11, 13);
    des.monster('electric eel', 10, 14);
    des.monster('electric eel', 11, 14);
    des.monster('electric eel', 10, 15);
    des.monster('electric eel', 11, 15);
    des.monster('jellyfish', 1, 1);
    des.monster('jellyfish', 0, 8);
    des.monster('jellyfish', 4, 19);
    des.monster({ id: 'stone golem', x: 64, y: 8, asleep: 1 });
    des.monster({ id: 'stone golem', x: 65, y: 8, asleep: 1 });
    des.monster({ id: 'stone golem', x: 64, y: 9, asleep: 1 });
    des.monster({ id: 'stone golem', x: 65, y: 9, asleep: 1 });
    des.monster({ id: 'cobra', x: 64, y: 10, asleep: 1 });
    des.monster({ id: 'cobra', x: 65, y: 10, asleep: 1 });
    des.monster('A', 72, 8);
    des.monster({ id: 'yellow light', x: 72, y: 11, asleep: 1 });
    des.monster({ x: 17, y: 7 });
    des.monster({ x: 28, y: 11 });
    des.monster({ x: 32, y: 13 });
    des.monster({ x: 49, y: 9 });
    des.monster({ x: 48, y: 7 });
    des.monster({ x: 65, y: 3 });
    des.monster({ x: 70, y: 4 });
    des.monster({ x: 70, y: 15 });
    des.monster({ x: 65, y: 16 });
    des.monster();
    des.monster();
    des.monster();
    des.monster();
}

// C ref: dat/medusa-3.lua (top-level chunk)
function medusa_3_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('noteleport', 'mazelevel', 'shortsighted');
    // --
    // -- Here you disturb ravens nesting in the trees.
    // --
    des.map(MAP_medusa_3);

    const place = selection.new();
    // -- each of these spots are inside a distinct room
    place.set(8, 6);
    place.set(66, 5);
    place.set(46, 15);

    // -- location of Medusa and downstairs and Perseus's statue
    const medloc = place.rndcoord(1, 1);
    // -- specific location for some other statue in a different downstairs-eligible
    // -- room, to prevent object detection from becoming a trivial way to pinpoint
    // -- Medusa's location
    // -- [usefulness depends on future STATUE->dknown changes in nethack's core]
    const altloc = place.rndcoord(1, 1);
    // -- location of a fountain, in the remaining of three downstairs-eligible rooms
    const othloc = place.rndcoord(1, 1);
    // -- once here, all three points set in 'place' have been used up

    des.region(selection.area(0, 0, 74, 19), 'lit');
    // -- fixup_special hack: the first room defined on a Medusa level gets some
    // -- leaderboard statues, use arrival_room to force it to be a room even though
    // -- monsters won't arrive within it
    des.region({ region: [49, 14, 51, 16], lit: -1, type: 'ordinary', arrival_room: true });
    des.region(selection.area(7, 5, 9, 7), 'unlit');
    des.region(selection.area(65, 4, 67, 6), 'unlit');
    des.region(selection.area(45, 14, 47, 16), 'unlit');
    // -- Non diggable walls
    // -- 4th room has diggable walls as Medusa is never placed there
    des.non_diggable(selection.area(6, 4, 10, 8));
    des.non_diggable(selection.area(64, 3, 68, 7));
    des.non_diggable(selection.area(44, 13, 48, 17));
    // -- All places are accessible also with jumping, so don't bother
    // -- restricting the placement when teleporting from levels below this.
    des.teleport_region({ region: [33, 2, 38, 7], dir: 'down' });
    des.levregion({ region: [32, 1, 39, 7], type: 'stair-up' });

    // -- place the downstairs at the same spot where Medusa will be placed
    des.stair('down', medloc);
    // --
    des.door('locked', 8, 8);
    des.door('locked', 64, 5);
    des.door('random', 50, 13);
    des.door('locked', 48, 15);
    // --
    // -- in one of the three designated rooms, but not the one with Medusa plus
    // -- downstairs and also not 'altloc' where a random statue will be placed
    des.feature('fountain', othloc);
    // --
    // -- same spot as Medusa plus downstairs
    des.object({ id: 'statue', coord: medloc, buc: 'uncursed',
                 montype: 'knight', historic: 1, male: 1, name: 'Perseus',
                 contents: function() {
                     if (G.percent(75)) {
                         des.object({ id: 'shield of reflection', buc: 'cursed', spe: 0 });
                     }
                     if (G.percent(25)) {
                         des.object({ id: 'levitation boots', spe: 0 });
                     }
                     if (G.percent(50)) {
                         des.object({ id: 'scimitar', buc: 'blessed', spe: 2 });
                     }
                     if (G.percent(50)) {
                         des.object('sack');
                     }
                 },
    });
    // --
    // -- first random statue is in one of the three designated rooms but not the
    // -- one with Medusa plus downstairs or the one with the fountain
    des.object({ id: 'statue', coord: altloc, contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });

    for (let i = 1; i <= 8; i++) {
        des.object();
    }
    des.object('scroll of blank paper', 48, 18);
    des.object('scroll of blank paper', 48, 18);
    // --
    des.trap('rust');
    des.trap('rust');
    des.trap('board');
    des.trap('board');
    des.trap();
    // --
    // -- place Medusa before placing other monsters so that they won't be able to
    // -- unintentionally steal her spot on the downstairs
    des.monster({ id: 'Medusa', coord: medloc, asleep: 1 });
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('jellyfish');
    des.monster('jellyfish');
    des.monster('wood nymph');
    des.monster('wood nymph');
    des.monster('water nymph');
    des.monster('water nymph');

    for (let i = 1; i <= 30; i++) {
        des.monster({ id: 'raven', peaceful: 0 });
    }
}

// C ref: dat/medusa-4.lua (top-level chunk)
function medusa_4_lua(L) {
    const G = L.globals, des = G.des, selection = G.selection;

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('noteleport', 'mazelevel');
    // --
    // -- Here the Medusa rules some slithery monsters from her 'palace', with
    // -- a yellow dragon nesting in the backyard.
    // --
    des.map(MAP_medusa_4);

    // --
    // -- place handling is similar to medusa-3.lua except that there are 4
    // -- downstairs-eligible rooms rather than 3, and only 2 of them are used
    const place = selection.new();
    // -- each of these spots are inside a distinct room
    place.set(4, 8);
    place.set(10, 4);
    place.set(10, 8);
    place.set(10, 12);

    // -- location of Medusa and downstairs and Perseus's statue
    const medloc = place.rndcoord(1, 1);
    // -- specific location for some other statue in a different downstairs-eligible
    // -- room, to prevent object detection from becoming a trivial way to pinpoint
    // -- Medusa's location
    // -- [usefulness depends on future STATUE->dknown changes in nethack's core]
    const altloc = place.rndcoord(1, 1);

    // --
    des.region(selection.area(0, 0, 74, 19), 'lit');
    // -- fixup_special hack: The first "room" region in Medusa levels gets filled
    // -- with some leaderboard statues, so this needs to be a room; setting
    // -- irregular=1 will force this
    des.region({ region: [13, 3, 18, 13], lit: 1, type: 'ordinary', irregular: 1 });
    // --
    des.teleport_region({ region: [64, 1, 74, 17], dir: 'down' });
    des.teleport_region({ region: [2, 2, 18, 13], dir: 'up' });
    // --
    des.levregion({ region: [67, 1, 74, 20], type: 'stair-up' });

    // -- place the downstairs at the same spot where Medusa will be placed
    des.stair('down', medloc);
    // --
    des.door('locked', 4, 6);
    des.door('locked', 4, 10);
    des.door('locked', 8, 4);
    des.door('locked', 8, 12);
    des.door('locked', 10, 6);
    des.door('locked', 10, 10);
    des.door('locked', 12, 8);
    // --
    des.levregion({ region: [27, 0, 79, 20], type: 'branch' });
    // --
    des.non_diggable(selection.area(1, 1, 22, 14));
    // --
    des.object('crystal ball', 7, 8);
    // --
    // -- same spot as Medusa plus downstairs
    des.object({ id: 'statue', coord: medloc, buc: 'uncursed',
                 montype: 'knight', historic: 1, male: 1, name: 'Perseus',
                 contents: function() {
                     if (G.percent(75)) {
                         des.object({ id: 'shield of reflection', buc: 'cursed', spe: 0 });
                     }
                     if (G.percent(25)) {
                         des.object({ id: 'levitation boots', spe: 0 });
                     }
                     if (G.percent(50)) {
                         des.object({ id: 'scimitar', buc: 'blessed', spe: 2 });
                     }
                     if (G.percent(50)) {
                         des.object('sack');
                     }
                 },
    });
    // --
    // -- first random statue is in one of the designated stair rooms but not the
    // -- one with Medusa plus downstairs
    des.object({ id: 'statue', coord: altloc, contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    des.object({ id: 'statue', contents: 0 });
    for (let i = 1; i <= 8; i++) {
        des.object();
    }
    // --
    for (let i = 1; i <= 7; i++) {
        des.trap();
    }
    // --
    // -- place Medusa before placing other monsters so that they won't be able to
    // -- unintentionally steal her spot on the downstairs
    des.monster({ id: 'Medusa', coord: medloc, asleep: 1 });
    des.monster('kraken', 7, 7);
    // --
    // -- the nesting dragon
    des.monster({ id: 'yellow dragon', x: 5, y: 4, asleep: 1 });
    if (G.percent(50)) {
        des.monster({ id: 'baby yellow dragon', x: 4, y: 4, asleep: 1 });
    }
    if (G.percent(25)) {
        des.monster({ id: 'baby yellow dragon', x: 4, y: 5, asleep: 1 });
    }
    des.object({ id: 'egg', x: 5, y: 4, montype: 'yellow dragon' });
    if (G.percent(50)) {
        des.object({ id: 'egg', x: 5, y: 4, montype: 'yellow dragon' });
    }
    if (G.percent(25)) {
        des.object({ id: 'egg', x: 5, y: 4, montype: 'yellow dragon' });
    }
    // --
    des.monster('giant eel');
    des.monster('giant eel');
    des.monster('jellyfish');
    des.monster('jellyfish');
    for (let i = 1; i <= 14; i++) {
        des.monster('S');
    }
    for (let i = 1; i <= 4; i++) {
        des.monster('black naga hatchling');
        des.monster('black naga');
    }
}

// The hand-ported Medusa level scripts by file name, for nhl_loadlua().
export const medusa_lua_files = {
    'medusa-1.lua': medusa_1_lua,
    'medusa-2.lua': medusa_2_lua,
    'medusa-3.lua': medusa_3_lua,
    'medusa-4.lua': medusa_4_lua,
};
