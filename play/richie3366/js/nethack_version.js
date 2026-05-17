// nethack_version.js — Build/version string for #version and similar.
//
// Must not import node:fs or other Node-only modules: the contest Play UI
// loads jsmain.js in the browser; the judge still runs under Node and uses
// the same files. Keep NH_PORT_VERSION in sync with the root package.json
// "version" field when you bump the package.

/** Mirrors root package.json "version". */
export const NH_PORT_VERSION = '1.0.0';

/** C: #version / doversion — one-line pline text for the JS port. */
export function versionPlineText() {
    return `NetHack JS port, version ${NH_PORT_VERSION} (development build).`;
}
