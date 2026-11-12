// Runtime-independent save/bones state transport. The filesystem and persistence
// policy are injected; no Emscripten, host files or global storage is accessed.
// The {files,deleted} payload remains compatible with the existing adapter.
export function filesUnder(filesystem, directory, result = {}) {
    for (const name of filesystem.readdir(directory)) {
        if (name === '.' || name === '..') continue;
        const path = `${directory}/${name}`;
        const stat = filesystem.stat(path);
        if (filesystem.isDir(stat.mode)) filesUnder(filesystem, path, result);
        else if (filesystem.isFile(stat.mode)) result[path] = filesystem.readFile(path);
    }
    return result;
}

export function encodeFileBytes(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192)
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binary);
}

export function decodeFileBytes(text) {
    return Uint8Array.from(atob(text), character => character.charCodeAt(0));
}

export function restoreGameFiles(filesystem, state) {
    if (typeof state === 'string') state = JSON.parse(state);
    for (const path of state.deleted) {
        try { filesystem.unlink(path); } catch { /* already absent, as before */ }
    }
    for (const [path, text] of Object.entries(state.files)) {
        filesystem.mkdirTree(path.slice(0, path.lastIndexOf('/')));
        filesystem.writeFile(path, decodeFileBytes(text));
    }
}

export function captureGameFiles(filesystem, baseline, shouldPersist) {
    if (typeof shouldPersist !== 'function') throw new TypeError('Game-file persistence policy is required');
    const after = filesUnder(filesystem, '/nethack');
    const state = { files: {}, deleted: Object.keys(baseline).filter(path => !(path in after)) };
    for (const [path, data] of Object.entries(after)) {
        if (!shouldPersist(path)) continue;
        const original = baseline[path];
        if (!original || original.length !== data.length || data.some((byte, i) => byte !== original[i]))
            state.files[path] = encodeFileBytes(data);
    }
    return state;
}
