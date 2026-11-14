// Canonical paranoid confirmation reader.  C ref: cmd.c:5588-5658.
// Kept dependency-light so death, equipment, combat, and command callers can
// share it without routing input through cmd.js/end.js cycles.
import { game } from './gstate.js';
import { rn2 } from './rnd.js';
import { nhgetch } from './input.js';
import { flush_screen, pline_flush_point, force_more, force_more_lone_frame, topl_park_cursor, tty_getlin_recall, tty_getlin_history, _topline_more_pending, restore_occupation_topline, putmsghistory, restore_command_topline } from './display.js';
import { yn_function_menu, doprev_message } from './cmd.js';
import { bot } from './botl.js';
import { vision_recalc } from './vision.js';
import { PARANOID_CONFIRM, BUFSZ, QBUFSZ, COLNO, MAX_MSG_HISTORY } from './const.js';
export { paranoid_ynq } from './cmd.js'; // relocate-fns





