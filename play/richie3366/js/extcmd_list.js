// extcmd_list.js — C cmd.c extcmdlist[] entries flagged AUTOCOMPLETE (for tty_get_ext_cmd).
// C ref: cmd.c extcmds_match, win/tty/getline.c ext_cmd_getlin_hook

/** @type {{ txt: string, wiz: boolean }[]} */
export const EXTCMD_AUTOCOMPLETE_LIKE_C = [
    { txt: '?', wiz: false },
    { txt: 'adjust', wiz: false },
    { txt: 'annotate', wiz: false },
    { txt: 'chat', wiz: false },
    { txt: 'chronicle', wiz: false },
    { txt: 'conduct', wiz: false },
    { txt: 'dip', wiz: false },
    { txt: 'enhance', wiz: false },
    { txt: 'force', wiz: false },
    { txt: 'genocided', wiz: false },
    { txt: 'herecmdmenu', wiz: false },
    { txt: 'history', wiz: false },
    { txt: 'invoke', wiz: false },
    { txt: 'jump', wiz: false },
    { txt: 'levelchange', wiz: true },
    { txt: 'lightsources', wiz: true },
    { txt: 'loot', wiz: false },
    { txt: 'monster', wiz: false },
    { txt: 'name', wiz: false },
    { txt: 'offer', wiz: false },
    { txt: 'overview', wiz: false },
    { txt: 'panic', wiz: true },
    { txt: 'polyself', wiz: true },
    { txt: 'pray', wiz: false },
    { txt: 'quit', wiz: false },
    { txt: 'ride', wiz: false },
    { txt: 'rub', wiz: false },
    { txt: 'sit', wiz: false },
    { txt: 'stats', wiz: true },
    { txt: 'terrain', wiz: false },
    { txt: 'therecmdmenu', wiz: false },
    { txt: 'timeout', wiz: true },
    { txt: 'tip', wiz: false },
    { txt: 'turn', wiz: false },
    { txt: 'untrap', wiz: false },
    { txt: 'vanquished', wiz: false },
    { txt: 'version', wiz: false },
    { txt: 'vision', wiz: true },
    { txt: 'wipe', wiz: false },
    { txt: 'wizbury', wiz: true },
    { txt: 'wizdispmacros', wiz: true },
    { txt: 'wizintrinsic', wiz: true },
    { txt: 'wizkill', wiz: true },
    { txt: 'wizmondiff', wiz: true },
    { txt: 'wizrumorcheck', wiz: true },
    { txt: 'wizseenv', wiz: true },
    { txt: 'wizshownhuuid', wiz: true },
    { txt: 'wizsmell', wiz: true },
    { txt: 'wiztelekinesis', wiz: true },
    { txt: 'wizwhere', wiz: true },
    { txt: 'wmode', wiz: true },
];

const ECM_IGNOREAC = 0x01;
const ECM_EXACTMATCH = 0x02;

function strEqI(a, b) {
    return a.toLowerCase() === b.toLowerCase();
}

function strNeqI(a, b, n) {
    return a.slice(0, n).toLowerCase() === b.slice(0, n).toLowerCase();
}

/**
 * C: cmd.c extcmds_match — autocomplete table prefix / exact match.
 * @param {string|null|undefined} findstr
 * @param {number} ecmflags ECM_* from func_tab.h
 * @param {boolean} [wizard]
 * @returns {string[]}
 */
export function extcmdsMatchLikeC(findstr, ecmflags, wizard = false) {
    const ignoreac = (ecmflags & ECM_IGNOREAC) !== 0;
    const exactmatch = (ecmflags & ECM_EXACTMATCH) !== 0;
    const fslen = findstr ? findstr.length : 0;
    const out = [];
    for (const ec of EXTCMD_AUTOCOMPLETE_LIKE_C) {
        if (!wizard && ec.wiz) continue;
        if (!ignoreac && !ec) continue; /* all entries are autocomplete */
        if (!findstr) {
            out.push(ec.txt);
        } else if (exactmatch) {
            if (strEqI(findstr, ec.txt)) out.push(ec.txt);
        } else if (strNeqI(findstr, ec.txt, fslen)) {
            out.push(ec.txt);
        }
    }
    return out;
}

/** C: getline.c ext_cmd_getlin_hook — unique prefix → full ef_txt. */
export function extCmdGetlinHookLikeC(base, wizard = false) {
    const matches = extcmdsMatchLikeC(base, 0, wizard);
    return matches.length === 1 ? matches[0] : null;
}
