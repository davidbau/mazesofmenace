// legacy_intro.js — C allmain.c newgame() `if (flags.legacy) com_pager(...)` before `welcome(TRUE)`.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, clearPendingMessageAndToplineLikeC } from './display.js';
import { nhlibAlignShuffleRn2LikeC } from './nhlib_align_shuffle.js';

/**
 * C questpgr.c `skip_pager` / allmain ordering: legacy pager after `bot`, before `welcome`.
 */
export async function awaitLegacyIntroMoreLikeC() {
    const g = game;
    if (!g.flags?.legacy) return;
    if (g.u?.uroleplay?.pauper) return; /* C `pauper_legacy` — not modeled */
    if (g.program_state?.wizkit_wishing) return;

    /* C: questpgr.c com_pager — nhl_init() loads nhlib.lua before questtext pager. */
    nhlibAlignShuffleRn2LikeC();

    g._legacyIntroActive = true;
    clearPendingMessageAndToplineLikeC();
    await flush_screen(1);
    await nhgetch();
    g._legacyIntroActive = false;
    delete g._botlLine1PreFindAcBotlLikeC;
    delete g._botlLine2PreFindAcBotlLikeC;
    delete g._legacyIntroCol;
    await flush_screen(1);
}
