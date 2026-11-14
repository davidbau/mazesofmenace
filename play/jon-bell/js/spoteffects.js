// C hack.c:836 dosinkfall() — landing on a sink while levitating/flying.
// Used by the shared landing coordinator in landing-effects.js.
import { game } from './gstate.js';
import { rn1 } from './rng.js';
import { rnd } from './rnd.js';
import { pline } from './pline.js';
import { exercise, acurr } from './attrib.js';
import { losehp } from './hack.js';
import { do_death_sequence } from './end.js';
import { selftouch } from './trap.js';
import { is_weptool } from './mhitm.js';
import { float_vs_flight } from './polyself.js';
import {
    Boots_off, Ring_off, off_msg, stop_donning,
    LEVITATION_BOOTS_OTYP_DW, RIN_LEVITATION_OTYP,
} from './do_wear.js';
import { doname } from './objnam.js';
import {
    A_CON, A_DEX, FROMFORM, FROMOUTSIDE, I_SPECIAL, TIMEOUT, W_ARTI,
    HALF_PHDAM, LEVITATION, FLYING,
    NO_KILLER_PREFIX,
} from './const.js';
export { dosinkfall } from './hack.js'; // relocate-fns






