// options.js — Parse .nethackrc options.
// C ref: options.c — handles OPTIONS=, BIND=, etc.
import { COMMAND_KEYS } from './command_keys.js';

export function parseNethackrc(rc) {
    const result = {
        name: '', role: '', race: '', gender: '', align: '',
        flags: {}, iflags: {}, keyBindings: {},
    };
    if (!rc) return result;

    // C: cfgfiles.c:parse_conf_buf joins continued lines with one space.
    // A full-line comment contributes no text but can end a continuation.
    const lines = [];
    let pending = '';
    const physicalLines = rc.split('\n');
    if (physicalLines.at(-1) === '') physicalLines.pop();
    for (const rawLine of physicalLines) {
        const continued = rawLine.endsWith('\\');
        const line = (continued ? rawLine.slice(0, -1) : rawLine).trim();
        if (line && !line.startsWith('#')) pending += `${pending ? ' ' : ''}${line}`;
        if (continued) continue;
        if (pending) lines.push(pending);
        pending = '';
    }

    for (const line of lines) {

        const bindMatch = line.match(/^BIND(?:I(?:N(?:G(?:S)?)?)?)?\s*[:=](.*)$/i);
        if (bindMatch) {
            // C parsebindings parses the tail first. A leading/escaped comma
            // names a key rather than separating two bindings.
            const bindings = [];
            let pending = bindMatch[1].trim();
            while (pending) {
                let comma = pending.indexOf(',');
                if (comma === 0) comma = pending.indexOf(',', 1);
                else if (comma > 0 && (pending[comma - 1] === '\\'
                    || (pending[comma - 1] === "'" && pending[comma + 1] === "'")))
                    comma = pending.indexOf(',', comma + 2);
                bindings.push(comma < 0 ? pending : pending.slice(0, comma));
                pending = comma < 0 ? '' : pending.slice(comma + 1);
            }
            for (const binding of bindings.reverse()) {
                const colon = binding.indexOf(':');
                if (colon < 0) continue;
                let text = binding.slice(0, colon).trim();
                const command = binding.slice(colon + 1).trim().toLowerCase();
                if (!Object.hasOwn(COMMAND_KEYS, command) && command !== 'nothing') continue;
                // C txt2key/escapes: byte values, decimal (not C octal)
                // numeric escapes, and combined Meta/control prefixes.
                let code = 0;
                if (text.length === 1) code = text.charCodeAt(0);
                else if (['<enter>', '<space>', '<esc>'].includes(text))
                    code = { '<enter>': 10, '<space>': 32, '<esc>': 27 }[text];
                else if (text.startsWith('\\')) {
                    const meta = /^\\[mM]./.test(text);
                    if (meta) text = text.slice(2);
                    const number = text.match(/^\\(?:(\d{1,3})|[oO]([0-7]{1,3})|[xX]([0-9a-fA-F]{1,2}))/);
                    if (number) code = Number.parseInt(number[1] || number[2] || number[3], number[1] ? 10 : number[2] ? 8 : 16);
                    else if (text[0] === '^' && text.length > 1) code = text.charCodeAt(1) & 31;
                    else if (text[0] === '\\' && text.length > 1)
                        code = { n: 10, t: 9, b: 8, r: 13 }[text[1]] ?? text.charCodeAt(1);
                    else code = text.charCodeAt(0);
                    if (meta) code |= 128;
                } else {
                    let meta = false;
                    if (/^[mM]/.test(text)) {
                        text = text.slice(1);
                        if (text[0] === '-' && text.length > 1) text = text.slice(1);
                        meta = true;
                    }
                    if (text.length > 1 && /^[cC^]/.test(text)) {
                        text = text.slice(1);
                        if (text[0] === '-' && text.length > 1) text = text.slice(1);
                        code = text[0] === '?' ? 127 : text.charCodeAt(0) & 31;
                    } else if (meta) code = text.charCodeAt(0);
                    else if (/^\d{3}/.test(text)) code = Number(text.slice(0, 3));
                    if (meta) code |= 128;
                }
                code &= 255;
                if (code) result.keyBindings[String.fromCharCode(code)] = command;
            }
            continue;
        }

        // C: cfgfiles.c accepts OPTIONS abbreviations of at least four
        // characters, either delimiter, and whitespace before the delimiter.
        const optMatch = line.match(/^OPTI(?:O(?:N(?:S)?)?)?\s*[:=](.*)/i);
        if (!optMatch) continue;

        // C processes the rest of a comma-separated list before its head.
        for (const opt of optMatch[1].split(',').reverse()) {
            const trimmed = opt.trim();
            if (!trimmed) continue;

            // C: options.c:parseoptions toggles negation for every prefix.
            let negated = false;
            let stripped = trimmed;
            while (/^(?:!|no-?)/i.test(stripped)) {
                stripped = stripped.replace(/^(?:!|no-?)/i, '');
                negated = !negated;
            }

            const colonIdx = stripped.search(/[:=]/);
            if (colonIdx >= 0) {
                const key = stripped.slice(0, colonIdx).trim().toLowerCase();
                const val = stripped.slice(colonIdx + 1).trim();

                if (key === 'name') result.name = val;
                else if (key === 'role') result.role = val;
                else if (key === 'race') result.race = val;
                else if (key === 'gender') result.gender = val;
                else if (key === 'align') result.align = val;
                else if (key === 'dogname') result.dogname = val;
                else if (key === 'catname') result.catname = val;
                else if (key === 'horsename') result.horsename = val;
                else if (key === 'playmode' && ['debug', 'wizard'].includes(val.toLowerCase())) result.flags.debug = true;
                else if (key === 'playmode' && ['explore', 'discovery'].includes(val.toLowerCase())) result.flags.explore = true;
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
