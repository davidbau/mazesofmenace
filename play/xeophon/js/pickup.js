// C pickup.c:autopick_testobj. Shop ownership and loss provenance precede
// class preferences and the first matching description exception.
import { LOST_THROWN, LOST_STOLEN, LOST_DROPPED, LOST_EXPLODING } from './const.js';

export function autopickTestObject(obj, { costly = false, types = '', thrown = true,
    stolen = true, dropped = true, exceptions = [], name = '', glyph = obj.glyph } = {}) {
    if (costly && !obj.no_charge) return false;
    const loss = typeof obj.how_lost === 'string'
        ? { LOST_THROWN, LOST_STOLEN, LOST_DROPPED, LOST_EXPLODING }[obj.how_lost] : obj.how_lost;
    if ((thrown && loss === LOST_THROWN) || (stolen && loss === LOST_STOLEN)) return true;
    if ((dropped && loss === LOST_DROPPED) || loss === LOST_EXPLODING) return false;
    let pick = !types || types === 'all' || types.includes(glyph);
    for (const exception of exceptions) {
        if (new RegExp(exception.pattern, exception.flags || '').test(name)) {
            pick = !!exception.grab;
            break;
        }
    }
    return pick;
}
