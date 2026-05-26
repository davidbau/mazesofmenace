// dat_upstream.js — read nethack-c/upstream/dat/* in Node (judge) and browser (Play UI).
// Must not statically import node:* (browser rejects those specifiers).

/** @type {Map<string, string>} */
const cache = new Map();

function isNodeRuntime() {
    return typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
}

/**
 * @param {string} baseName e.g. nhlib, minetn-1
 * @returns {Promise<string>}
 */
export async function readUpstreamDatTextLikeC(baseName) {
    const key = String(baseName);
    if (cache.has(key)) return cache.get(key);

    let text;
    if (isNodeRuntime()) {
        const { readFileSync } = await import('node:fs');
        const { dirname, join } = await import('node:path');
        const { fileURLToPath } = await import('node:url');
        const here = dirname(fileURLToPath(import.meta.url));
        const path = join(here, '..', 'nethack-c', 'upstream', 'dat', `${key}.lua`);
        text = readFileSync(path, 'utf8');
    } else {
        const url = `/nethack-c/upstream/dat/${encodeURIComponent(key)}.lua`;
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`readUpstreamDatTextLikeC: fetch ${url} failed (${res.status})`);
        }
        text = await res.text();
    }
    cache.set(key, text);
    return text;
}
