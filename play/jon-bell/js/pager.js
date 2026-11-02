// pager.js — C ref: pager.c.
import { checkfile_keys, dbase_scan } from './data_base.js';
import { isok } from './const.js'; // relocate-fns
import { GLYPHCLS_ENGR, GLYPHCLS_INVIS, GLYPHCLS_MON, GLYPHCLS_OBJ, GLYPHCLS_TRAP } from './display.js'; // relocate-fns
import { game } from './gstate.js'; // relocate-fns

export function ia_checkfile(inp) {
    const keys = checkfile_keys(inp);
    if (!keys) return false;
    const { dbase_str, alt } = keys;
    for (let pass = (alt === dbase_str) ? 0 : 1; pass >= 0; --pass) {
        const key = pass === 1 ? alt : dbase_str;
        if (pass === 1 && !alt) continue;
        if (dbase_scan(key) >= 0)
            return true;                 /* pager.c:1076-1078 */
    }
    return false;
}

/* C pager.c:1247 do_screen_description().  The accessibility call from
 * show_glyph only needs the first description for the glyph just painted;
 * preserve that contract without enumerating pager symbol tables here. */
export function do_screen_description(cc, b1, sym, buf, firstmatch, n) {
    if (!cc || !isok(cc.x, cc.y) || !game.level)
        return 0;
    const loc = game.level.at(cc.x, cc.y);
    if (!loc)
        return 0;
    let text;
    switch (loc.disp_cls) {
    case GLYPHCLS_MON: text = 'monster'; break;
    case GLYPHCLS_OBJ: text = 'object'; break;
    case GLYPHCLS_TRAP: text = 'trap'; break;
    case GLYPHCLS_ENGR: text = 'engraving'; break;
    case GLYPHCLS_INVIS: text = 'invisible monster'; break;
    default: text = (loc.disp_ch === ' ') ? 'unexplored area' : 'terrain'; break;
    }
    if (firstmatch && typeof firstmatch === 'object') {
        if (Array.isArray(firstmatch)) firstmatch[0] = text;
        else firstmatch.value = text;
    }
    return 1;
}
