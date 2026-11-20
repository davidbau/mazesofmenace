// zap.js -- zapping wands.
// C ref: zap.c
//
// Ported so far: the #zap command up to choosing the wand (zap_ok(),
// dozap()'s getobj()); zapping itself (zappable(), weffects()) is not
// ported yet.

import { game } from './gstate.js';
import { You } from './display.js';
import { getobj } from './invent.js';
import { check_capacity } from './hack.js';
import { GETOBJ_SUGGEST, GETOBJ_EXCLUDE, GETOBJ_NOFLAGS, ECMD_OK,
         ECMD_CANCEL } from './const.js';
import { WAND_CLASS } from './objects.js';
import { M1_NOHANDS } from './monsters.js';

/* C ref: mondata.h nohands() */
function nohands(ptr) { return (ptr.mflags1 & M1_NOHANDS) !== 0; }

// C ref: zap.c zap_ok() -- getobj callback for object to zap
export function zap_ok(obj) {
    if (obj && obj.oclass === WAND_CLASS)
        return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

// C ref: zap.c dozap() -- #zap command, 'z'
export async function dozap() {
    if (nohands(game.youmonst.data)) {
        await You("aren't able to zap anything in your current form.");
        return ECMD_OK;
    }
    if (await check_capacity(null))
        return ECMD_OK;
    const obj = await getobj("zap", zap_ok, GETOBJ_NOFLAGS);
    if (!obj)
        return ECMD_CANCEL;

    throw new Error('dozap(): zapping a wand (zappable()/weffects()) not ported yet');
}
