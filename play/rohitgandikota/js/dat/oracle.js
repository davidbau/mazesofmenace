// dat/oracle.js — the Oracle level.
// C ref: dat/oracle.lua
//
// A room-based special level: a central lit 11x9 room ringed with eight
// historic centaur statues around the 3x3 "delphi" subroom (four fountains,
// the Oracle, doorless openings on every wall), four ordinary rooms with the
// stairs and some random contents, then the standard corridor join.

import { lspo_level_flags, lspo_room, lspo_object, lspo_monster, lspo_door,
         lspo_feature, lspo_stair, lspo_trap,
         lspo_random_corridors } from '../sp_lev.js';

export async function oracle_level() {
    const des = {
        level_flags: lspo_level_flags,
        room: (o) => lspo_room(o),
        object: (a, x, y, o) => lspo_object(a, x, y, o),
        monster: (a, x, y, o) => lspo_monster(a, x, y, o),
        door: (o) => lspo_door(o),
        feature: (t, x, y) => lspo_feature(t, x, y),
        stair: (d) => lspo_stair(d),
        trap: () => lspo_trap(),
        random_corridors: lspo_random_corridors,
    };

    des.level_flags('noflip');

    des.room({ type: 'ordinary', lit: 1, x: 3, y: 3,
               xalign: 'center', yalign: 'center', w: 11, h: 9,
               contents: () => {
        des.object('statue', 0, 0, { montype: 'C', historic: true });
        des.object('statue', 0, 8, { montype: 'C', historic: true });
        des.object('statue', 10, 0, { montype: 'C', historic: true });
        des.object('statue', 10, 8, { montype: 'C', historic: true });
        des.object('statue', 5, 1, { montype: 'C', historic: true });
        des.object('statue', 5, 7, { montype: 'C', historic: true });
        des.object('statue', 2, 4, { montype: 'C', historic: true });
        des.object('statue', 8, 4, { montype: 'C', historic: true });

        des.room({ type: 'delphi', lit: 1, x: 4, y: 3, w: 3, h: 3,
                   contents: () => {
            des.feature('fountain', 0, 1);
            des.feature('fountain', 1, 0);
            des.feature('fountain', 1, 2);
            des.feature('fountain', 2, 1);
            des.monster('Oracle', 1, 1);
            des.door({ state: 'nodoor', wall: 'all' });
        } });

        des.monster();
        des.monster();
    } });

    des.room({ contents: () => {
        des.stair('up');
        des.object();
    } });

    des.room({ contents: () => {
        des.stair('down');
        des.object();
        des.trap();
        des.monster();
        des.monster();
    } });

    des.room({ contents: () => {
        des.object();
        des.object();
        des.monster();
    } });

    des.room({ contents: () => {
        des.object();
        des.trap();
        des.monster();
    } });

    des.room({ contents: () => {
        des.object();
        des.trap();
        des.monster();
    } });

    des.random_corridors();
}
