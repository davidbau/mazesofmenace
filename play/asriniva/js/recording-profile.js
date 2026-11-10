// Environment data, separate from game decisions and screen rendering.
export const PUBLIC_RECORDING_PROFILE = Object.freeze({
    // Documented in docs/recording-environment.md.
    home: '/Users/davidbau/git/mazesofmenace/teleport/maud/test/comparison/c-harness/results',
    // Inferred: recordings allow debug play and omit a named wizard contact list.
    // This is a supported NetHack sysconf value, not a text-output filter.
    wizards: '*',
    support: '',
});

export function recordingProfile() {
    const env = typeof process !== 'undefined' ? process.env || {} : {};
    const profile = {
        home: env.TELEPORT_RECORDING_HOME ?? PUBLIC_RECORDING_PROFILE.home,
        wizards: env.TELEPORT_RECORDING_WIZARDS ?? PUBLIC_RECORDING_PROFILE.wizards,
        support: env.TELEPORT_RECORDING_SUPPORT ?? PUBLIC_RECORDING_PROFILE.support,
    };
    for (const [name, value] of Object.entries(profile)) {
        if (/[\0\r\n]/.test(value)) throw new Error(`Invalid recording profile ${name}`);
    }
    profile.home = profile.home.replace(/\/+$/, '');
    if (!profile.home.startsWith('/') || profile.home === '/'
        || profile.home.split('/').some(part => part === '.' || part === '..')) {
        throw new Error('Recording HOME must be an absolute virtual directory');
    }
    return profile;
}

export function profileSysconf(text, profile) {
    const lines = text.split('\n').filter(line => !/^\s*(WIZARDS|SUPPORT)\s*=/.test(line));
    lines.push('# Recording profile; see js/recording-profile.js.', `WIZARDS=${profile.wizards}`);
    // An empty SUPPORT assignment creates a non-null empty string in NetHack,
    // which would itself add a contact line. Omit the setting for no override.
    if (profile.support) lines.push(`SUPPORT=${profile.support}`);
    return lines.join('\n');
}
