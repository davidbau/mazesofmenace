// dat_upstream.js — read committed NHL `.lua` dat for Node (judge) and browser (Play UI).
// Must not statically import node:* (browser rejects those specifiers).

/** @type {Map<string, string>} */
const cache = new Map();

/** @param {string} baseName e.g. nhlib, minetn-1 */
function datFileUrl(baseName) {
    const key = encodeURIComponent(String(baseName));
    return new URL(`./nhl_dat/${key}.lua`, import.meta.url);
}

/**
 * @param {string} baseName e.g. nhlib, minetn-1
 * @returns {Promise<string>}
 */
export async function readUpstreamDatTextLikeC(baseName) {
    const key = String(baseName);
    if (cache.has(key)) return cache.get(key);

    const fileUrl = datFileUrl(key);
    let text;
    if (typeof process !== 'undefined' && process.versions != null && process.versions.node != null) {
        const { readFileSync } = await import('node:fs');
        const { fileURLToPath } = await import('node:url');
        text = readFileSync(fileURLToPath(fileUrl), 'utf8');
    } else {
        const res = await fetch(fileUrl);
        if (!res.ok) {
            throw new Error(`readUpstreamDatTextLikeC: fetch ${fileUrl} failed (${res.status})`);
        }
        text = await res.text();
    }
    cache.set(key, text);
    return text;
}
