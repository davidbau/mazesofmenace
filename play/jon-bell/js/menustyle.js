// C options.c:menutype and optfn_menustyle(do_set). Shared by the parser,
// value display and interactive handler; menu_style is the actual flags field.
import { MENU_TRADITIONAL, MENU_COMBINATION, MENU_FULL, MENU_PARTIAL } from './const.js';

export const menutype = [
    ['traditional', '[prompt for object class(es), then', ' ask y/n for each item in those classes]'],
    ['combination', '[prompt for object class(es), then', ' use menu for items in those classes]'],
    ['full', '[use menu to choose class(es), then', ' use another menu for items in those]'],
    ['partial', '[skip class filtering; always', ' use menu of all available items]'],
];

export function optfn_menustyle_set(flags, opts, op, negated) {
    const val_required = opts.length > 5 && !negated;
    let tmp;
    if (!op) {
        if (val_required) return false;
        tmp = negated ? 'n' : 'f';
    } else tmp = op[0].toLowerCase();
    switch (tmp) {
    case 'n': case 't': flags.menu_style = MENU_TRADITIONAL; break;
    case 'c': flags.menu_style = MENU_COMBINATION; break;
    case 'f': flags.menu_style = MENU_FULL; break;
    case 'p': flags.menu_style = MENU_PARTIAL; break;
    default: return false;
    }
    return true;
}
