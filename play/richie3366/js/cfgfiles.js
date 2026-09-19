// cfgfiles.js — config file handling (cfgfiles.c).
//
// C locus: nethack-c/upstream/src/cfgfiles.c do_write_config_file `:169–210`
// [campaign 7/7] — #saveoptions: serialize the changed options via
// all_options_strbuf and write them into the config file. Final activation
// of the saveoptions family: every callee below went live in [1/7]–[6/7].

import { game } from './gstate.js';
import { BUFSZ, ECMD_OK } from './const.js';
import { pline, tty_wait_synch } from './display.js';
import { paranoid_query } from './getline.js';
import {
    get_configfile,
    strbuf_init,
    all_options_strbuf,
    strbuf_empty,
} from './options.js';
import { vfsWriteFile } from './storage.js';

/** C ref: hack.h `:1504–1506` FEATURE_NOTICE_VER(3, 7, 0). */
const FEATURE_NOTICE_VER_3_7_0 = (3 << 24) | (7 << 16);

/**
 * C ref: cfgfiles.c do_write_config_file `:169–210` in C order.
 * Sole C caller: cmd.c extcmdlist "saveoptions" `:1843–1845`
 * (IFBURIED | GENERALCMD | NOFUZZERCMD; wired via EXT_CMDS in getline.js).
 * @returns {Promise<number>} ECMD_OK, like C on every path.
 */
export async function do_write_config_file() {
    // C `:174`: !configfile[0] — the file-static lives in js/options.js.
    const configfile = get_configfile() || '';
    if (!configfile) {
        await pline('Strange, could not figure out config file name.'); // C `:175`
        return ECMD_OK; // C `:176`
    }
    // C `:178`: flags.suppress_alert is zero-initialized and no JS path
    // sets it, so ?? 0 is exactly the C default; the comparisons below
    // are the common first-run arm.
    if ((game.flags?.suppress_alert ?? 0) < FEATURE_NOTICE_VER_3_7_0) {
        await pline('Warning: saveoptions is highly experimental!'); // C `:179`
        await tty_wait_synch(); // C `:180` wait_synch (game build: wintty.c tty_wait_synch)
        await pline('Some settings are not saved!'); // C `:181`
        await tty_wait_synch(); // C `:182`
        await pline( // C `:183–184` (one literal across two source lines)
            'All manual customization and comments are removed from the file!'
        );
        await tty_wait_synch(); // C `:185`
    }
    // C `:187–190`: Sprintf(tmp, "Overwrite config file %.*s?", N,
    // configfile) with N = BUFSZ - sizeof(prompt) - 2 — %.*s truncates.
    const overwritePrompt = 'Overwrite config file %.*s?';
    const tmp =
        'Overwrite config file ' +
        configfile.slice(0, BUFSZ - (overwritePrompt.length + 1) - 2) +
        '?';
    if (!(await paranoid_query(true, tmp))) return ECMD_OK; // C `:191–192`
    // C `:194–209`: fopen(configfile, "w") + fwrite + fclose. Contest
    // Rule #2: no fopen — persist via storage.js VFS. The VFS boolean
    // stands in for fp (false = fopen failed → silent ECMD_OK like C,
    // which has no message on that path). VFS writes are atomic, so
    // wrote == len always and the `:205–208` partial-write pline has no
    // representable trigger (map-named).
    const sbuf = {};
    strbuf_init(sbuf); // C `:199` (all_options_strbuf re-inits too, js/options.js)
    all_options_strbuf(sbuf); // C `:200`
    const text = sbuf.str ?? ''; // C `:201` strlen
    if (vfsWriteFile(configfile, text)) { // C `:202` fwrite + `:203` fclose
        // Wrote the whole buffer: nothing left to report.
    }
    strbuf_empty(sbuf); // C `:204`
    return ECMD_OK; // C `:209`
}
