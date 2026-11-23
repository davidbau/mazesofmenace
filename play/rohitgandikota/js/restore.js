// restore.js, persistent fruit names from src/restore.c.
import { game } from './gstate.js';
import { fruitadd } from './options.js';
import { impossible } from './pline.js';
import { place_object } from './mkobj.js';
import { OBJ_FREE } from './const.js';

// src/restore.c:71 find_lev_obj(). Local chains are rebuilt on getlev().
export function find_lev_obj() {
    const reversed = [...game.level.objects].reverse();
    game.level.objects = [];
    game.level.objAt = new Map();
    for (const obj of reversed)
        obj.where = OBJ_FREE;
    for (const obj of reversed)
        place_object(obj, obj.ox, obj.oy);
}

// src/restore.c:468 loadfruitchn()
export function loadfruitchn(saved) {
    let flist = null;
    for (const f of saved || []) {
        if (!f.fid)
            break;
        flist = {fname: f.fname, fid: f.fid, nextf: flist};
    }
    return flist;
}

// src/restore.c:500 ghostfruit()
export async function ghostfruit(otmp) {
    let oldf;
    for (oldf = game.oldfruit; oldf; oldf = oldf.nextf)
        if (oldf.fid === otmp.spe)
            break;
    if (!oldf)
        await impossible('no old fruit?');
    else
        otmp.spe = fruitadd(oldf.fname, null);
}
