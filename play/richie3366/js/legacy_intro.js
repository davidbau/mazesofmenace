// legacy_intro.js — C allmain.c newgame() `if (flags.legacy) com_pager(...)` before `welcome(TRUE)`.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen } from './display.js';

/**
 * C questpgr.c `skip_pager` / allmain ordering: legacy pager after `bot`, before `welcome`.
 */
export async function awaitLegacyIntroMoreLikeC() {
    const g = game;
    if (!g.flags?.legacy) return;
    if (g.u?.uroleplay?.pauper) return; /* C `pauper_legacy` — not modeled */
    if (g.program_state?.wizkit_wishing) return;

    g._legacyIntroActive = true;
    await flush_screen(1);
    await nhgetch();
    g._legacyIntroActive = false;
    await flush_screen(1);
}
