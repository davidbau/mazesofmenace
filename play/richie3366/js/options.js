// options.js — Parse .nethackrc options.
// C ref: options.c — handles OPTIONS=, BIND=, etc.

/**
 * C: options.c boolean opt_set-style OPTIONS=key:val (tutorial:yes, color:no, …).
 * @param {string} val
 */
function parseRcBooleanishLikeC(val) {
    const v = String(val).trim().toLowerCase();
    if (!v) return false;
    if (v === 'no' || v === 'false' || v === 'off' || v === '0' || v === 'n') return false;
    if (v === 'yes' || v === 'true' || v === 'on' || v === '1' || v === 'y') return true;
    return false;
}

export function parseNethackrc(rc) {
    /* Unknown OPTIONS=key:val pairs land in flags (e.g. genericusers — C sysopt.genericusers / plnamesuffix). */
    const result = {
        name: '', role: -1, race: -1, gender: -1, align: -1,
        flags: {}, iflags: {},
        explicitNameInRc: false,
        explicitRoleInRc: false,
        explicitRaceInRc: false,
        explicitGenderInRc: false,
        explicitAlignInRc: false,
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

                if (key === 'name') { result.name = val; result.explicitNameInRc = true; }
                else if (key === 'role') { result.role = val; result.explicitRoleInRc = true; }
                else if (key === 'race') { result.race = val; result.explicitRaceInRc = true; }
                else if (key === 'gender') { result.gender = val; result.explicitGenderInRc = true; }
                else if (key === 'align') { result.align = val; result.explicitAlignInRc = true; }
                else if (key === 'playmode' && val === 'debug') result.flags.debug = true;
                else if (key === 'pettype' || key === 'pet') {
                    result.flags.pettype = val;
                    if (val === 'none' || val === 'n') result.preferred_pet = 'n';
                    else if (val === 'dog' || val === 'd') result.preferred_pet = 'd';
                    else if (val === 'cat' || val === 'c') result.preferred_pet = 'c';
                }
                else if (key === 'symset') result.symset = val;
                else if (key === 'suppress_alert') result.flags.suppress_alert = val;
                else if (key === 'msg_window') result.iflags.prevmsg_window = val;
                else if (key === 'tutorial') {
                    /* C: opt_set_in_config[opt_tutorial] — ask_do_tutorial skips menu when set from rc */
                    result.flags.tutorial = parseRcBooleanishLikeC(val);
                    result.tutorial_set = true;
                } else if (key === 'color') result.flags.color = parseRcBooleanishLikeC(val);
                else if (key === 'verbose') result.flags.verbose = parseRcBooleanishLikeC(val);
                else if (key === 'legacy') result.flags.legacy = parseRcBooleanishLikeC(val);
                else if (key === 'autoopen') result.flags.autoopen = parseRcBooleanishLikeC(val);
                else if (key === 'pushweapon') result.flags.pushweapon = parseRcBooleanishLikeC(val);
                else if (key === 'showexp') result.flags.showexp = parseRcBooleanishLikeC(val);
                else if (key === 'time') result.flags.time = parseRcBooleanishLikeC(val);
                else if (key === 'autopickup' || key === 'pickup') {
                    /* C: boolean branch maps autopickup → flags.pickup */
                    result.flags.pickup = parseRcBooleanishLikeC(val);
                } else if (key === 'splash_screen') {
                    result.iflags.wc_splash_screen = parseRcBooleanishLikeC(val);
                } else if (key === 'perm_invent') {
                    result.iflags.perm_invent = parseRcBooleanishLikeC(val);
                } else result.flags[key] = val;
            } else {
                // Boolean flag
                const lname = stripped.toLowerCase();
                const value = !negated;

                if (lname === 'autopickup') result.flags.pickup = value;
                else if (lname === 'color') result.flags.color = value;
                else if (lname === 'legacy') result.flags.legacy = value;
                else if (lname === 'tutorial') { result.flags.tutorial = value; result.tutorial_set = true; }
                else if (lname === 'splash_screen') result.iflags.wc_splash_screen = value;
                else if (lname === 'perm_invent') result.iflags.perm_invent = value;
                else if (lname === 'autoopen') result.flags.autoopen = value;
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
