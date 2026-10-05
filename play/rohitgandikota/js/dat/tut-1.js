// dat/tut-1.js — the 5.0 tutorial level.
// C ref: dat/tut-1.lua
//
// Draw order is the Lua's: two percent(50) doors, the five-slot trap
// location shuffle (rn2(5..2)), four percent(50) trap types, then the
// armor/dagger/boulder/scroll objects and the lichen. The engraving texts
// embed the default key bindings exactly as nh.eckey() renders them; the
// recorded tutorial screens show these strings verbatim.

import { lspo_level_flags, lspo_level_init, lspo_map_full,
         lspo_region_full, lspo_non_diggable, lspo_teleport_region,
         lspo_engraving, lspo_door, lspo_trap, lspo_object,
         lspo_monster, lspo_stair } from '../sp_lev.js';
import { percent } from '../nhlua.js';
import { rn2 } from '../rng.js';
import { game } from '../gstate.js';

const TUT1_MAP = `
---------------------------------------------------------------------------
|-.--|.......|......|..S....|.F.......|.............|.......|.............|
|.-..........|......|--|....|.F.....|.|S-------.....|.....................|
||.--|.......|..T......|....|.F.....|.|.......|.....|.......|.............|
||.|.|.......|......|-.|....|.F.....|.|.......|.....|--------.............|
||.|.|.......|......||.|-.-----------.-.......|-S----.....................|
|-+-S---------..---.||........................|...|.......................|
|......|          |.-------------------.......|...|....--S----............|
|......|  ######  |.........|      |..S.......|...|....|.....|............|
|----.-| -+-   #  |.....---.|######+..|.......S...|....|.....|............|
|----+----.----+---.|.--|.|.|#     ------------...|....|.....F............|
|........|.|......|.|...F...|#  ........|.....+...|....|.....|............|
|.P......-S|......|------.---# .........|.....|...|....-------........----|
|..........|......+.|...|.|.S# ..--S-----.....|LLL|..................|..| |
|.W......---......|.|.|.|.|.|# ..|......|.....|LLL|..................|..--|
|....Z.L.S.F......|.|.|.|.---#   |......+.....|...|..................|..|.|
|........|--......|...|.....|####+......|.....|...+..................||...|
---------------------------------------------------------------------------`;

export async function tut1_level() {
    const des = {
        level_init: lspo_level_init,
        level_flags: lspo_level_flags,
        map: lspo_map_full,
        stair: (o) => (o && typeof o === 'object' && !Array.isArray(o))
            ? lspo_stair(o.dir,
                         Array.isArray(o.coord) ? o.coord[0] : o.coord?.x,
                         Array.isArray(o.coord) ? o.coord[1] : o.coord?.y)
            : lspo_stair(o),
        region: (o) => lspo_region_full(o),
        non_diggable: () => lspo_non_diggable(),
        teleport_region: (o) => lspo_teleport_region(o),
        engraving: (o) => lspo_engraving(o),
        door: (o) => lspo_door(o),
        trap: (o) => lspo_trap(o.type, undefined, undefined, o),
        object: (o) => lspo_object(o),
        monster: (o) => lspo_monster(o),
    };

    des.level_init({ style: 'solidfill', fg: ' ' });
    des.level_flags('mazelevel', 'noflip',
                    'nomongen', 'nodeathdrops', 'noautosearch');

    des.map(TUT1_MAP);

    des.region({ area: [1, 1, 73, 16], lit: 1 });
    des.non_diggable();
    des.teleport_region({ region: [9, 3, 9, 3] });

    /* nh.parse_config: newbie-friendly options for the tutorial */
    game.flags.mention_walls = true;
    game.flags.mention_decor = true;
    game.flags.lit_corridor = true;

    const eng = (x, y, text) =>
        des.engraving({ coord: [x, y], type: 'engrave', text,
                        degrade: false });

    eng(9, 3, 'Move around with h j k l');
    eng(5, 2, 'Move diagonally with b u n y');

    if (game.urole?.name?.m === 'Knight' || game.urole?.name === 'Knight')
        eng(12, 1, "Knights can jump with 'M-j'");

    eng(2, 4, 'Some actions may require multiple tries before succeeding');
    eng(2, 5, 'Open the door by moving into it');
    des.door({ coord: [2, 6], state: 'closed' });
    eng(2, 7, "Close the door with 'c'");

    eng(4, 5, 'You can leave the tutorial via the magic portal.');
    des.trap({ type: 'magic portal', coord: [4, 4], seen: true });

    eng(5, 9, "This door is locked. Kick it with 'Ctrl-D'");
    des.door({ coord: [5, 10], state: 'locked' });
    /* tut_key_help: kick was the first Ctrl-key command */
    eng(6, 8, "Note: Outside the tutorial, Ctrl-key combinations are shown prefixed with a caret, like '^D'");

    eng(5, 12, "Look around the map with ';', press ESC when you're done");

    eng(10, 13, "Use 's' to search for secret doors");
    eng(10, 15, 'Wrong secret');

    eng(10, 10, 'Behind this door is a dark corridor');
    des.door({ coord: [10, 9], state: percent(50) ? 'locked' : 'closed' });
    /* des.region(selection.match("#"), "unlit") and the same for " ":
       every corridor and solid-stone cell of the map goes dark */
    unlight_map_chars(TUT1_MAP, ['#', ' ']);
    des.door({ coord: [15, 10], state: percent(50) ? 'locked' : 'closed' });

    eng(15, 11, 'There are four traps next to you! Search for them.');
    {
        const locs = [[14, 11], [14, 12], [15, 12], [16, 12], [16, 11]];
        /* nhlib shuffle: selection swap from the tail, rn2(i) each */
        for (let i = locs.length; i > 1; i--) {
            const j = rn2(i);
            [locs[i - 1], locs[j]] = [locs[j], locs[i - 1]];
        }
        for (let i = 0; i < 4; i++) {
            des.trap({ type: percent(50) ? 'sleep gas' : 'board',
                       coord: locs[i], victim: false });
        }
    }

    eng(15, 15, "Some traps can be disabled with 'M-u'");
    des.trap({ coord: [15, 16], type: 'web', spider_on_web: false });

    des.door({ coord: [18, 13], state: 'closed' });

    eng(19, 13, "Pick up items with ','");

    const armor = (game.urole?.name?.m === 'Monk'
                   || game.urole?.name === 'Monk')
                  ? 'leather gloves' : 'leather armor';
    des.object({ id: armor, spe: 0, buc: 'cursed', coord: [19, 14] });

    eng(19, 15, "Wear armor with 'W'");

    des.object({ id: 'dagger', spe: 0, buc: 'not-cursed', coord: [21, 15] });

    eng(21, 14, "Wield weapons with 'w'");
    eng(22, 13, 'Hit monsters by walking into them.');

    des.monster({ id: 'lichen', coord: [23, 15], waiting: true,
                  countbirth: false });

    eng(24, 16, 'Now you know the very basics. You can leave the tutorial via the magic portal.');
    eng(26, 16, 'Step into this portal to leave the tutorial');
    des.trap({ type: 'magic portal', coord: [27, 16], seen: true });

    eng(25, 13, 'Push boulders by moving into them');
    des.object({ id: 'boulder', coord: [25, 12] });

    eng(27, 9, "Take off armor with 'T'");

    des.object({ class: '?', id: 'remove curse', buc: 'blessed',
                 coord: [23, 11] });
    eng(22, 11, 'Some items have shuffled descriptions, different each game');
    eng(23, 11, "Pick up this scroll, read it with 'r', and try to remove the armor again");

    eng(19, 10, 'Another magic portal, a way to leave this tutorial');
    des.trap({ type: 'magic portal', coord: [19, 11], seen: true });

    /* rock fall — math.random(m,n) is m + rn2(n-m+1) through the shim */
    const mrand = (m, n) => m + rn2(n - m + 1);
    des.object({ coord: [14, 5], id: 'rock', quantity: mrand(50, 99) });
    des.object({ coord: [15, 5], id: 'rock', quantity: mrand(10, 30) });
    des.object({ coord: [14, 4], id: 'rock', quantity: mrand(10, 30) });
    des.object({ coord: [15, 6], id: 'rock', quantity: mrand(30, 60) });
    des.object({ coord: [14, 6], id: 'rock', quantity: mrand(30, 60) });
    des.object({ coord: [14, 6], id: 'boulder' });

    des.door({ coord: [20, 3], state: percent(50) ? 'open' : 'closed' });

    eng(21, 3, 'Avoid being burdened, it slows you down');
    eng(22, 3, "Drop items with 'd'");
    eng(22, 4, 'You can drop partial stacks by prefixing the item slot letter with a number');

    des.monster({ id: 'yellow mold', coord: [26, 2], waiting: true,
                  countbirth: false });

    eng(25, 5, "Throw items with 't'");

    des.trap({ type: 'magic portal', coord: [21, 1], seen: true });

    des.monster({ id: 'wolf', coord: [29, 2], peaceful: 0, waiting: true,
                  countbirth: false });

    eng(37, 4, 'Missiles, such as rocks, work better when fired from appropriate launcher');

    des.object({ coord: [37, 3], id: 'sling', buc: 'not-cursed', spe: 9 });
    eng(37, 3, 'Wield the sling');
    eng(36, 1, "Use 'f' to fire missiles with the wielded launcher");
    eng(35, 4, "Firing launches items from your quiver; Use 'Q' to put items in it");
    eng(33, 4, "You can wait a turn with 's'");

    des.door({ coord: [38, 6], state: 'closed' });

    eng(39, 6, "You loot containers with 'M-l'");

    des.object({ coord: [41, 6], id: 'large box', broken: true,
                 trapped: false,
                 contents: (obj) => {
                     des.object({ id: 'secret door detection', class: '/',
                                  spe: 30 });
                 } });
    eng(42, 6, "Containers can also be emptied with 'Alt-T'");

    eng(45, 6, "Magic wands are used with 'z'");

    des.door({ coord: [35, 9], state: 'nodoor' });
    eng(34, 9, "You can run by prefixing a movement key with 'G'");

    des.door({ coord: [33, 16], state: 'nodoor' });
    eng(35, 15, "Travel across the level with '_'");

    des.trap({ type: 'magic portal', coord: [27, 14], seen: true });

    const burn = (x, y, text) =>
        des.engraving({ coord: [x, y], type: 'burn', text, degrade: false });

    burn(48, 1, "Use 'e' to eat edible things");

    des.object({ coord: [50, 3], id: 'apple', buc: 'not-cursed' });
    des.object({ coord: [50, 3], id: 'candy bar', buc: 'not-cursed' });
    des.object({ coord: [50, 3], id: 'corpse', montype: 'lichen',
                 buc: 'not-cursed' });

    des.door({ coord: [46, 11], state: 'closed' });

    burn(43, 11, "Use 'X' to use two weapons at once");
    des.object({ coord: [43, 13], id: 'knife', buc: 'uncursed' });
    des.object({ coord: [43, 14], id: 'dagger', buc: 'blessed' });

    burn(43, 16, "Swap weapons quickly with 'x'");

    des.door({ coord: [40, 15], state: 'random' });

    des.object({ coord: [48, 7], id: 'ring of levitation',
                 buc: 'not-cursed' });

    burn(48, 10, "Put on accessories with 'P'");
    burn(48, 16, "Remove accessories with 'R'");

    des.door({ coord: [50, 16], state: 'closed' });

    burn(58, 9, "Use '>' to go down the stairs");
    des.stair({ dir: 'down', coord: [58, 10] });

    /* tut_key_help(64,4): no new ctrl key was introduced since kick */

    burn(65, 3, 'UNDER CONSTRUCTION');

    des.trap({ type: 'magic portal', coord: [66, 2], seen: true });

    burn(69, 12, "Can't get through?  You're carrying too much.");

    des.object({ id: 'boulder', coord: [71, 16] });
    des.object({ id: 'boulder', coord: [72, 16] });
    des.object({ id: 'boulder', coord: [73, 16] });
    des.trap({ type: 'trap door', coord: [73, 15] });

    eng(60, 2, 'Spellcasting');
    if ((game.u.uenmax ?? 0) < 5)
        eng(59, 2, "Unfortunately you don't have enough energy to cast spells.");
    eng(57, 2, "Pick up the spellbook with ','");
    des.object({ coord: [57, 2], id: 'spellbook of light', buc: 'blessed' });
    eng(55, 2, "Read the spellbook with 'r'");
    eng(53, 2, "Use 'Z' to cast a spell");
    des.region({ area: [53, 1, 59, 3], lit: 0 });

    eng(72, 2, `You "quaff" potions with 'q'`);
    des.object({ coord: [72, 2], id: 'potion of object detection',
                 buc: 'blessed' });
}

/* des.region(selection.match(ch), "unlit"): every map cell whose template
   character matches goes unlit. Coordinates are map-relative; add the
   xstart/ystart offset the way get_location() does. */
function unlight_map_chars(mapstr, chars) {
    const rows = mapstr.split('\n').filter((r, i) => !(i === 0 && r === ''));
    for (let my = 0; my < rows.length; my++) {
        for (let mx = 0; mx < rows[my].length; mx++) {
            if (chars.includes(rows[my][mx])) {
                const loc = game.level.at(mx + (game.xstart || 0),
                                          my + (game.ystart || 0));
                if (loc)
                    loc.lit = false;
            }
        }
    }
}
