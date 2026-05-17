// nethack_version.js — Build/version string for #version and similar.
// Reads package.json next to the repo root (one level above js/).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const _dir = dirname(fileURLToPath(import.meta.url));
const _pkg = JSON.parse(readFileSync(join(_dir, '..', 'package.json'), 'utf8'));

export const NH_PORT_VERSION = String(_pkg.version ?? '0.0.0');

/** C: #version / doversion — one-line pline text for the JS port. */
export function versionPlineText() {
    return `NetHack JS port, version ${NH_PORT_VERSION} (development build).`;
}
