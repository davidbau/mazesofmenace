import { game } from './gstate.js';
import { ECMD_OK } from './const.js';
import { VI_NUMBER, VI_NAME, VI_BRANCH, VERSION_MAJOR, VERSION_MINOR, PATCHLEVEL } from './const.js';
// version.js — Build version info
export const VERSION = '0.1.0';
export const BUILD_DATE = '2026-04-18';
export const COMMIT = 'contest-skeleton';
export const COMMIT_NUMBER = '0';
export const TELEPORT_BUILD_DATE = '2026-04-18';

// src/version.c:89 status_version() — the text 'showvers' puts on the
// status line. The recorder binary is named "nethack" and is built without
// a git branch string, so nomakedefs.git_branch is empty there.
export function status_version(indent) {
    const vflags = game.flags?.versinfo ?? 1;
    let shownum = (vflags & VI_NUMBER) !== 0,
        showname = (vflags & VI_NAME) !== 0,
        showbranch = (vflags & VI_BRANCH) !== 0;
    let name = null, altname = null;
    /* game's name {variants should use own name, not "NetHack"} */
    if (showname) {
        name = 'nethack'; /* nh_basename(gh.hname, FALSE) */
        if (!name) /* shouldn't happen */
            showname = false;
    }
    /* git branch name, if available */
    if (showbranch) {
        altname = ''; /* nomakedefs.git_branch */
        if (!altname)
            showbranch = false;
    }
    if (showname && showbranch) {
        if (altname.toLowerCase().startsWith(name.toLowerCase()))
            showname = false;
    } else if (!showname && !showbranch) {
        /* flags.versinfo could be set to only 'branch' but it might not
           be available */
        shownum = true;
    }
    let buf = '';
    let indentation = indent ? ' ' : '';
    if (showname) {
        buf += `${indentation}${name}`;
        indentation = ' '; /* forced separator rather than optional indent */
    }
    if (showbranch) {
        buf += `${indentation}${altname}`;
        indentation = ' ';
    }
    if (shownum) {
        /* x.y.z version number */
        buf += `${indentation}${VERSION_MAJOR}.${VERSION_MINOR}.${PATCHLEVEL}`;
    }
    return buf;
}

// src/version.c:156 doversion() — the 'V' command: the build's short version
// string, or the whole #version window under the m prefix.
export async function doversion() {
    const { pline } = await import('./display.js');

    if (game.iflags?.menu_requested) {
        const { doextversion } = await import('./pager.js');
        return await doextversion();
    }

    /* getversionstring(buf): nomakedefs.version_id, which is the banner
       line of the recorder build */
    const { VERSION_BANNER_LINE } = await import('./version_data.js');
    await pline(VERSION_BANNER_LINE);
    return ECMD_OK;
}
