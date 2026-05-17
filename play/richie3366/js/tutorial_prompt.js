// tutorial_prompt.js — Tutorial yes/no when special level tut-1 exists.
// C ref: options.c ask_do_tutorial() (NHW_MENU + select_menu(PICK_ONE) loop).

import { nhgetch } from './input.js';
import { NO_COLOR } from './terminal.js';

const ROW_MENU_TOP = 10;
const ROW_MENU_END = 22;

/**
 * C: options.c **`Snprintf(buf, … "Put \"OPTIONS=!tutorial\" in %s …")`**
 * when **`get_configfile()`** has no basename / **`/dev/null`** — contest has no **`get_configfile`** yet.
 * @returns {string}
 */
export function tutorialSkipQueryHintLineLikeC() {
    return 'Put "OPTIONS=!tutorial" in your configuration file to skip this query.';
}

/**
 * C: options.c **`ask_do_tutorial`** — menu when **`!opt_set_in_config[opt_tutorial]`**.
 * Strings match **`add_menu` / `end_menu`** prompts; layout is a tty subset (not full **`wintty`** menu chrome).
 * @param {import('./game_display.js').GameDisplay} disp
 * @returns {Promise<boolean>} true → tutorial, false → skip or ESC
 */
export async function askDoTutorialMenuTTYLikeC(disp) {
    const hint = tutorialSkipQueryHintLineLikeC();
    for (let pass = 0; ; pass++) {
        for (let r = ROW_MENU_TOP; r <= ROW_MENU_END; r++) disp.clearRow(r);
        disp.putstr(0, 10, 'Do you want a tutorial?', NO_COLOR, 0);
        disp.putstr(0, 12, 'y - Yes, do a tutorial', NO_COLOR, 0);
        disp.putstr(0, 13, 'n - No, just start play', NO_COLOR, 0);
        disp.putstr(0, 15, hint, NO_COLOR, 0);
        if (pass > 0) {
            disp.putstr(0, 17, "(Please choose 'y' or 'n'.)", NO_COLOR, 0);
        }
        disp.setCursor(0, 23);
        const k = await nhgetch();
        if (k === 27) return false; /* C: ESC → dotut FALSE */
        if (k === 121 || k === 89) return true; /* y Y — C menu accel */
        if (k === 110 || k === 78) return false; /* n N */
    }
}
