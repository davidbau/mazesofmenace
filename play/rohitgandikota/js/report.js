// report.js — the crash and bug reporting commands.
// C ref: src/report.c (CRASHREPORT builds)

import { game } from './gstate.js';
import { pline } from './display.js';
import { ECMD_OK } from './const.js';

const DEVTEAM_URL = 'https://www.nethack.org/'; /* include/hack.h:1557 */

// src/report.c submit_web_report() — hand a report URL to the platform's
// browser launcher (CRASHREPORT "/usr/bin/open" on the recorder's macOS,
// "/usr/bin/xdg-open" on Linux). The launcher is started and forgotten;
// on the recorder it starts, so the command reports success and prints
// nothing. This port has no process to start, and keeps that outcome.
export function submit_web_report(kind, why, msg) {
    return true;
}

// src/report.c:461 dobugreport() — #bugreport
export async function dobugreport() {
    if (!submit_web_report(2, null, '#bugreport command')) {
        await pline(`Unable to send bug report.  Please visit ${
            (game.sysopt?.crashreporturl && game.sysopt.crashreporturl)
              ? game.sysopt.crashreporturl
              : DEVTEAM_URL} instead.`);
    }
    return ECMD_OK;
}
