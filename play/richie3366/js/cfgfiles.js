// cfgfiles.js — config file handling (cfgfiles.c).
//
// C locus: nethack-c/upstream/src/cfgfiles.c do_write_config_file `:169–210`
// [campaign 7/7] — #saveoptions: serialize the changed options via
// all_options_strbuf and write them into the config file. Final activation
// of the saveoptions family: every callee below went live in [1/7]–[6/7].

import { game } from './gstate.js';
import { BUFSZ, ECMD_OK } from './const.js';
import { pline, tty_wait_synch } from './display.js';
import { trimspaces } from './hacklib.js';
import { config_error_add } from './botl.js';
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

/**
 * C ref: cfgfiles.c free_config_sections `:506–517` in C order.
 * C is staticfn void; exported for handle_config_section and the future
 * parse_conf_buf port (`:1768` caller chain). The gameconfig fields live
 * on `game` (currentgraphics precedent); C decl.c NULL-init is `?? null`
 * reads. free/dupstr on strings are GC no-ops (mklev/invent precedent).
 */
export function free_config_sections() {
    // C `:509–512`
    if (game.config_section_chosen != null) {
        game.config_section_chosen = null; // C free + = NULL
    }
    // C `:513–516`
    if (game.config_section_current != null) {
        game.config_section_current = null; // C free + = NULL
    }
}

/**
 * C ref: cfgfiles.c is_config_section `:522–549` in C order — check for
 * "[ anything-except-bracket ] # arbitrary-comment" with optional spaces.
 * C is staticfn char *; exported for handle_config_section (same `:554`
 * call). Returns the bracket-stripped section name, or null.
 * C mutates the input (trailing trimspaces strip, `*z = '\\0'` cut); JS
 * strings are immutable, so the name is returned and the input-strip is
 * owed to the future parse_conf_buf port's FALSE path (map-named).
 * @param {string} str
 * @returns {string|null}
 */
export function is_config_section(str) {
    // C `:530`: trimspaces strips trailing in place, returns past leading.
    const a = trimspaces(str);
    // C `:532–533`: *a++ != '[' — empty input reads '\0' → fail.
    if (a[0] !== '[') return null;
    const past = a.slice(1);
    // C `:535–537`: last char is ']' ignoring any comment.
    const z = past.indexOf(']');
    if (z === -1) return null;
    // C `:539–540`: spaces only (not tabs) between ']' and comment.
    let c = z + 1;
    while (c < past.length && past[c] === ' ') c++;
    // C `:541–542`: *c nonzero and not '#' → fail.
    const tail = past.slice(c);
    if (tail !== '' && !tail.startsWith('#')) return null;
    // C `:545–548`: cut at ']', trim spaces around the choice.
    return trimspaces(past.slice(0, z));
}

/**
 * C ref: cfgfiles.c handle_config_section `:551–582` in C order.
 * C is staticfn boolean; exported for the future parse_conf_buf port —
 * the sole C caller (`:1768`; map-named, no JS dispatch yet).
 * @param {string} buf
 * @returns {boolean} TRUE = line consumed (section header or filtered out)
 */
export function handle_config_section(buf) {
    // C `:554`: pointer test — '' (empty "[]" section) is non-null in C,
    // so this is !== null, not truthiness.
    const sect = is_config_section(buf);
    if (sect !== null) {
        // C `:557–558`: free current BEFORE the CHOOSE check.
        if (game.config_section_current != null)
            game.config_section_current = null; // C free + = 0
        // C `:559–563`: is_config_section() removed brackets from 'sect'.
        if (game.config_section_chosen == null) {
            config_error_add('Section "[%s]" without CHOOSE', sect); // C `:561`
            return true;
        }
        if (sect !== '') { // C `:564–567` *sect — got a section name
            game.config_section_current = sect; // C `:565` dupstr (GC no-op)
            // C `:566–567` debugpline1 — D_DEBUG-only (named omission).
        } else { // C `:568–570` empty section name => end of sections
            free_config_sections(); // C `:569`
            // C `:570` debugpline0 — D_DEBUG-only (named omission).
        }
        return true; // C `:572`
    }
    // C `:575–580`: non-section line under an active section filter.
    if (game.config_section_current != null) {
        if (game.config_section_chosen == null) return true; // C `:576–577`
        // C `:578–579` strcmp — nonzero (different) → filtered out.
        if (game.config_section_current !== game.config_section_chosen)
            return true;
    }
    return false; // C `:580`
}
