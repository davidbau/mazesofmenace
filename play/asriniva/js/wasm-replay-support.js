// Recording-format and process-state adaptation. No recorded answers enter here.

// The contest recorder build pins SOURCE_DATE_EPOCH to May 2, 2026 at 12:00 UTC.
// Use that reproducible clock to supply the recorder parser's inherited DST flag.
// The historical capture clock is not present in session descriptors.
export const DEFAULT_RECORDING_EPOCH = 1777723200;

export function recordingClockEpoch() {
    const value = (typeof process !== 'undefined' && process.env?.TELEPORT_RECORDING_EPOCH)
        || String(DEFAULT_RECORDING_EPOCH);
    const seconds = Number(value);
    if (!/^-?\d+$/.test(value) || !Number.isSafeInteger(seconds)
        || !Number.isFinite(new Date(seconds * 1000).getTime())) {
        throw new Error('TELEPORT_RECORDING_EPOCH must be valid Unix seconds');
    }
    return String(seconds);
}

export function encodeRecorderScreen(screen) {
    // Match scripts/record-session.mjs encodeScreenAnsiRle, including its
    // attribute-blind space compression. Cursor-forward leaves skipped cells
    // plain in the frozen decoder, even when inverse video is active.
    const lines = screen.split('\n').slice(0, 24);
    while (lines.length < 24) lines.push('');
    const compressed = lines.map(line => line.replace(/ +$/u, '')
        .replace(/ {5,}/g, run => `\x1b[${run.length}C`));
    while (compressed.length && compressed.at(-1) === '') compressed.pop();
    return compressed.join('\n');
}

export function shouldPersistGameFile(path) {
    // NetHack reserves the 'bon' prefix for bones. Numeric suffixes on those
    // files are dungeon levels, not process lock/temporary level-file markers.
    if (/^\/nethack\/bon[^/]*$/.test(path)) return true;
    return !/^\/nethack\/[^/]+\.\d+$/.test(path);
}
