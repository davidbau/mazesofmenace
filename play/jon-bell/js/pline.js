// C src/pline.c:impossible. Only qualified callers are migrated here; existing
// caller-local diagnostic stubs are not silently enabled across the game.
import { game } from './gstate.js';
import { BUFSZ, DEVTEAM_EMAIL } from './const.js';
import { nh_sprintf, pline, urgent_pline } from './display.js';
import { paniclog } from './files.js';

export async function impossible(s, ...args) {
    const state = game.program_state;
    // Fatal panic/recovery and optional crash-report submission are separate
    // unported platform dependencies. Do not turn either into a normal return.
    if (state.in_impossible)
        throw new Error('panic: impossible called impossible');
    state.in_impossible = 1;
    const pbuf = nh_sprintf(s, args).slice(0, BUFSZ - 1);
    paniclog('impossible', pbuf);
    if (game.iflags?.debug_fuzzer === 1) // fuzzer_impossible_panic
        throw new Error('panic: ' + pbuf);

    await urgent_pline('%s', pbuf);
    if (state.in_sanity_check) {
        state.in_impossible = 0;
        return;
    }
    let pbuf2 = 'Program in disorder!';
    if (state.something_worth_saving)
        pbuf2 += '  (Saving and reloading may fix this problem.)';
    await pline('%s', pbuf2);
    await pline('Please report these messages to %s.', DEVTEAM_EMAIL);
    if (game.sysopt?.support)
        await pline('Alternatively, contact local support: %s', game.sysopt.support);
    if (game.sysopt?.crashreporturl)
        throw new Error('impossible: crash-report interface is not ported');
    state.in_impossible = 0;
}
