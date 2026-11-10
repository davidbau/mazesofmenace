// pager.js — C ref: pager.c.
import { checkfile_keys, dbase_scan } from './data_base.js';
import { singular_xname } from './cmd.js';
import { isok } from './const.js'; // relocate-fns
import { GLYPHCLS_ENGR, GLYPHCLS_INVIS, GLYPHCLS_MON, GLYPHCLS_OBJ, GLYPHCLS_TRAP, glyph_at, map_glyphinfo } from './display.js'; // relocate-fns
import { game } from './gstate.js'; // relocate-fns

const chkfilUsrTyped = 0x1; /* lookup via user-entered name vs map pointing */
const chkfilDontAsk = 0x2;  /* skip "More info about <thing>?" confirmation */
const chkfilIaCheck = 0x4;  /* just check for info rather than display it */

export function ia_checkfile(otmp, chkflags = (chkfilIaCheck | chkfilDontAsk)) {
    const itemnam = (otmp && typeof otmp === 'object') ? singular_xname(otmp) : otmp;
    const without_asking = (chkflags & chkfilDontAsk) !== 0;
    const ia_checking = (chkflags & chkfilIaCheck) !== 0;
    const keys = checkfile_keys(itemnam);
    if (!keys) return false;
    const { dbase_str, alt } = keys;
    for (let pass = (alt === dbase_str) ? 0 : 1; pass >= 0; --pass) {
        const key = pass === 1 ? alt : dbase_str;
        if (pass === 1 && !alt) continue;
        if (dbase_scan(key) >= 0 && (without_asking || ia_checking))
            return true;                 /* pager.c:1071-1078 */
    }
    return false;
}

/* C pager.c:1247 do_screen_description().  The accessibility call from
 * show_glyph only needs the first description for the glyph just painted;
 * preserve that contract without enumerating pager symbol tables here. */
export function do_screen_description(cc, b1, sym, buf, firstmatch, n) {
    if (!cc || !isok(cc.x, cc.y) || !game.level)
        return 0;
    if (b1) {
        const glyph = glyph_at(cc.x, cc.y);
        const glyphinfo = {};
        map_glyphinfo(cc.x, cc.y, glyph, 0, glyphinfo);
        sym = glyphinfo.ttychar;
    }
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
