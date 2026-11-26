import {game} from './gstate.js';
import {trimspaces} from './hacklib.js';
import {rn2} from './rng.js';
import {config_error_add} from './options.js';

// src/cfgfiles.c:464 choose_random_part()
export function choose_random_part(str, sep) {
    if (str === null) return null;
    const nul = str.indexOf('\0');
    if (nul >= 0) str = str.slice(0, nul);
    let nsep = 1;
    for (const ch of str) if (ch === sep) nsep++;
    let csep = rn2(nsep), pos = 0;
    while (csep > 0 && pos < str.length) {
        pos++;
        if (str[pos] === sep) csep--;
    }
    if (pos < str.length) {
        if (str[pos] === sep) pos++;
        const begin = pos;
        while (pos < str.length && str[pos] !== sep) pos++;
        if (pos > begin) return str.slice(begin, pos);
    }
    return null;
}

// src/cfgfiles.c:507 free_config_sections()
export function free_config_sections() {
    if (game.config_section_chosen) game.config_section_chosen = null;
    if (game.config_section_current) game.config_section_current = null;
}

// src/cfgfiles.c:524 is_config_section()
function is_config_section(str) {
    const a = trimspaces(str);
    if (a[0] !== '[') return null;
    const z = a.indexOf(']', 1);
    if (z < 0) return null;
    let c = z + 1;
    while (a[c] === ' ') c++;
    if (c < a.length && a[c] !== '#') return null;
    return trimspaces(a.slice(1, z));
}

// src/cfgfiles.c:552 handle_config_section()
export function handle_config_section(buf) {
    const sect = is_config_section(buf);
    if (sect !== null) {
        if (game.config_section_current) game.config_section_current = null;
        if (!game.config_section_chosen) {
            config_error_add(`Section "[${sect}]" without CHOOSE`);
            return true;
        }
        if (sect) game.config_section_current = sect;
        else free_config_sections();
        return true;
    }
    if (game.config_section_current) {
        if (!game.config_section_chosen) return true;
        if (game.config_section_current !== game.config_section_chosen) return true;
    }
    return false;
}
