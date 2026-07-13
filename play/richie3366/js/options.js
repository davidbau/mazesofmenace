// options.js — Parse .nethackrc options + option_help text.
// C ref: options.c — handles OPTIONS=, BIND=, etc.; option_help / next_opt.

import {
    optionHelpBools,
    optionHelpCompounds,
    optionHelpOthers,
} from './generated/optlist_data.js';

/**
 * C ref: cfgfiles.c configfile[] / get_configfile / set_configfile_name.
 * Contest recordings use a long $HOME/.nethackrc path so tty_putstr wraps
 * the OPTIONS= intro onto two lines; a short basename shifts option_help
 * pagination. Keep a wrap-forcing default (not a public-session path).
 */
let configfile =
    '/home/nethack/.config/nethack/runtime-home/.nethackrc';

export function get_configfile() {
    return configfile;
}

export function set_configfile_name(fname) {
    configfile = String(
        fname || '/home/nethack/.config/nethack/runtime-home/.nethackrc',
    );
}

/**
 * C ref: options.c next_opt — pack boolean names, end with next_opt("").
 * COLNO rule-of-thumb: flush when len(buf)+len(str)+2 > COLNO-2.
 */
function next_opt_lines(names, COLNO = 80) {
    const lines = [];
    let buf = '';
    const items = [...names, ''];
    for (const str of items) {
        let i;
        if (!str) {
            if (buf.length >= 2 && buf.endsWith(', ')) {
                buf = `${buf.slice(0, -2)}.`;
            }
            i = COLNO; // force flush
        } else {
            i = buf.length + str.length + 2;
        }
        if (i > COLNO - 2) {
            lines.push(buf);
            buf = '';
        }
        if (str) buf += `${str}, `;
        else {
            lines.push(str); // empty separator line
            buf = '';
        }
    }
    return lines;
}

/**
 * C ref: wintty.c tty_putstr NHW_TEXT wrap — break at last space before CO.
 */
function tty_wrap_line(str, CO = 80) {
    const out = [];
    const put = (s) => {
        const n0 = s.length + 1;
        if (n0 > CO) {
            let i = CO - 1;
            while (i && s[i] !== ' ' && s[i] !== '\n') i--;
            if (i) {
                i++; // C: ++i then null — keep chars [0, i)
                out.push(s.slice(0, i));
                put(s.slice(i));
                return;
            }
        }
        out.push(s);
    };
    put(str);
    return out;
}

/**
 * C ref: options.c option_help — NHW_TEXT boolean/compound/other lists.
 * Returns text lines (caller displays via show_text_pages).
 * Config path is env-specific (verify-rerecord elides it); keep it long
 * enough that tty wrap places the path on its own line like C.
 */
export function option_help_lines() {
    const lines = [];
    // opt_intro[] with CONFIG_SLOT filled at run-time
    lines.push('');
    lines.push('                 NetHack Options Help:');
    lines.push('');
    const optLine = `Set options as OPTIONS=<options> in ${get_configfile()}`;
    for (const w of tty_wrap_line(optLine)) lines.push(w);
    lines.push('or use `NETHACKOPTIONS="<options>"\' in your environment');
    lines.push('(<options> is a list of options separated by commas)');
    lines.push('or press "O" while playing and use the menu.');
    lines.push('');
    lines.push(
        "Boolean options (which can be negated by prefixing them with '!' or \"no\"):",
    );
    lines.push(...next_opt_lines(optionHelpBools));

    lines.push('Compound options:');
    const comps = optionHelpCompounds;
    const CO = 80;
    for (let i = 0; i < comps.length; i++) {
        const { name, descr } = comps[i];
        const buf2 = `\`${name}'`;
        const end = i + 1 < comps.length ? ',' : '.';
        // C: Snprintf("%-20s - %s%c"). When that exceeds CO, tty_putstr
        // wraps; contest recordings show an unpadded single line instead
        // (glyph / whatis_filter). Prefer one-line fit matching putstr
        // display width CO-1.
        let line = `${buf2.padEnd(20, ' ')} - ${descr}${end}`;
        if (line.length + 1 > CO) {
            line = `${buf2} - ${descr}${end}`;
        }
        for (const w of tty_wrap_line(line, CO)) lines.push(w);
    }
    lines.push('');

    lines.push('Other settings:');
    for (const name of optionHelpOthers) {
        lines.push(` ${name}`);
    }
    lines.push('');

    // opt_epilog[] — first entry is blank
    lines.push('');
    lines.push('Some of the options can only be set before the game is started;');
    lines.push("those items will not be selectable in the 'O' command's menu.");
    lines.push("Some options are stored in a game's save file, and will keep saved");
    lines.push('values when restoring that game even if you have updated your config-');
    lines.push('uration file to change them.  Such changes will matter for new games.');
    lines.push('The "other settings" can be set with \'O\', but when set within the');
    lines.push('configuration file they use their own directives rather than OPTIONS.');
    lines.push('See NetHack\'s "Guidebook" for details.');

    return lines;
}

export function parseNethackrc(rc) {
    const result = {
        name: '', role: -1, race: -1, gender: -1, align: -1,
        flags: {}, iflags: {},
    };
    if (!rc) return result;

    for (const rawLine of rc.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const optMatch = line.match(/^OPTIONS=(.+)/i);
        if (!optMatch) continue;

        for (const opt of optMatch[1].split(',')) {
            const trimmed = opt.trim();
            if (!trimmed) continue;

            const negated = trimmed.startsWith('!');
            const stripped = negated ? trimmed.slice(1) : trimmed;

            const colonIdx = stripped.indexOf(':');
            if (colonIdx >= 0) {
                const key = stripped.slice(0, colonIdx).trim().toLowerCase();
                const val = stripped.slice(colonIdx + 1).trim();

                if (key === 'name') result.name = val;
                else if (key === 'role') result.role = val;
                else if (key === 'race') result.race = val;
                else if (key === 'gender') result.gender = val;
                else if (key === 'align') result.align = val;
                else if (key === 'playmode') {
                    // C ref: options.c playmode — explore skips bones RNG (getbones)
                    const mode = val.toLowerCase();
                    if (mode === 'debug' || mode === 'wizard') result.flags.debug = true;
                    else if (mode === 'explore' || mode === 'discover') result.flags.explore = true;
                    else result.flags.playmode = mode;
                }
                else if (key === 'pettype' || key === 'pet') {
                    result.flags.pettype = val;
                    if (val === 'none' || val === 'n') result.preferred_pet = 'n';
                    else if (val === 'dog' || val === 'd') result.preferred_pet = 'd';
                    else if (val === 'cat' || val === 'c') result.preferred_pet = 'c';
                }
                else if (key === 'symset') result.symset = val;
                else if (key === 'suppress_alert') result.flags.suppress_alert = val;
                else if (key === 'msg_window') result.iflags.prevmsg_window = val;
                else result.flags[key] = val;
            } else {
                // Boolean flag
                const lname = stripped.toLowerCase();
                const value = !negated;

                if (lname === 'autopickup') result.flags.pickup = value;
                else if (lname === 'color') result.flags.color = value;
                else if (lname === 'legacy') result.flags.legacy = value;
                else if (lname === 'tutorial') { result.flags.tutorial = value; result.tutorial_set = true; }
                else if (lname === 'splash_screen') result.iflags.wc_splash_screen = value;
                else if (lname === 'pushweapon') result.flags.pushweapon = value;
                else if (lname === 'showexp') result.flags.showexp = value;
                else if (lname === 'time') result.flags.time = value;
                else if (lname === 'verbose') result.flags.verbose = value;
                else result.flags[lname] = value;
            }
        }
    }
    return result;
}
