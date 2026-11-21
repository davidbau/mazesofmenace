// oracle_lua.js — hand port of dat/oracle.lua, the Oracle level.
// makemaz("oracle") loads it through load_special() (sp_lev.c).
// C ref: dat/oracle.lua
//
// The script rolls no dice on the Lua side; every roll comes from the
// des.* functions (sp_lev.js).

// C ref: dat/oracle.lua (top-level chunk)
export function oracle_lua(L) {
    const G = L.globals;
    const des = G.des;

    // -- Oracle level
    des.level_flags('noflip');

    des.room({ type: 'ordinary', lit: 1, x: 3, y: 3, xalign: 'center', yalign: 'center', w: 11, h: 9, contents: function() {
        des.object({ id: 'statue', x: 0, y: 0, montype: 'C', historic: true });
        des.object({ id: 'statue', x: 0, y: 8, montype: 'C', historic: true });
        des.object({ id: 'statue', x: 10, y: 0, montype: 'C', historic: true });
        des.object({ id: 'statue', x: 10, y: 8, montype: 'C', historic: true });
        des.object({ id: 'statue', x: 5, y: 1, montype: 'C', historic: true });
        des.object({ id: 'statue', x: 5, y: 7, montype: 'C', historic: true });
        des.object({ id: 'statue', x: 2, y: 4, montype: 'C', historic: true });
        des.object({ id: 'statue', x: 8, y: 4, montype: 'C', historic: true });

        des.room({ type: 'delphi', lit: 1, x: 4, y: 3, w: 3, h: 3, contents: function() {
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

    des.room({ contents: function() {
        des.stair('up');
        des.object();
    } });

    des.room({ contents: function() {
        des.stair('down');
        des.object();
        des.trap();
        des.monster();
        des.monster();
    } });

    des.room({ contents: function() {
        des.object();
        des.object();
        des.monster();
    } });

    des.room({ contents: function() {
        des.object();
        des.trap();
        des.monster();
    } });

    des.room({ contents: function() {
        des.object();
        des.trap();
        des.monster();
    } });

    des.random_corridors();
}
