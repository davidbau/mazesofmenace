// jsmain.js — contest entry point: runs NetHack 5.0 compiled to JavaScript.
//
// js/nethack-c.js is the NetHack 5.0 C source (plus Lua 5.4.8) with the
// contest's recorder patches, compiled by wasm/build.sh (clang → wasm →
// wasm2js: plain JavaScript, no WebAssembly at run time).  This file is
// the replacement for the recorder harness (scripts/record-session.mjs):
// it starts the game in the recording environment, feeds it the keys one
// at a time, and keeps one screen per input boundary.
//
// Contest contract: runSegment(input) → object with getScreens(),
// getRngLog(), getCursors(), getAnimationFramesByStep().  See docs/API.md.
// Browser play (NethackGame) lives in js/play.js.

export { NethackGame } from './play.js';

// The replay build is 7 MB; load it on first use, so the browser page
// (which plays with js/nethack-c-play.js) never fetches it.
let replayBuild = null;
function loadReplayBuild() {
    replayBuild ??= import('./nethack-c.js').then(m => m.default);
    return replayBuild;
}
// Outside a browser (the judge, scripts/), load it with this module.
if (typeof window === 'undefined') await loadReplayBuild();

// The recording environment (docs/recording-environment.md).  HOME shows
// up on screen (the options help prints the config file path).
const HOME = '/Users/davidbau/git/mazesofmenace/teleport/maud/test/comparison/c-harness/results';
export const HACKDIR = '/nh';
const RNGLOG = '/tmp/rng.log';
const DEFAULT_DATETIME = '20000110090000';

// Files the game writes that survive into the next segment of the same
// session, as they do in the recorder's install directory: save files,
// bones and the score files.  Kept in the storage handle (the judge's, or
// the browser's localStorage view) as latin1 strings under "vfs:/<path>",
// the key scheme of js/storage.js.  Lock and level files of a game the
// harness stopped mid-play are left out: the next game finds their
// process gone (veryold() in unixunix.c) and erases them silently.
const STORAGE_PREFIX = 'vfs:/';
const PERSISTENT_FILE = /^(save\/.+|bon.+|record|xlogfile|logfile|livelog|perm|paniclog)$/;

// Thrown from the key callback when the recorded keys run out; it unwinds
// the C stack back to runSegment, like the harness killing the recorder.
class KeysExhausted extends Error {}

// ── Screen encoding (same as scripts/record-session.mjs) ──

function compressAnsiLine(line) {
    let out = '';
    let i = 0;
    while (i < line.length) {
        if (line[i] === ' ') {
            const start = i;
            while (i < line.length && line[i] === ' ') i++;
            const run = i - start;
            out += run >= 5 ? `\x1b[${run}C` : ' '.repeat(run);
        } else {
            out += line[i++];
        }
    }
    return out;
}

function encodeScreen(payload) {
    const lines = payload.split('\n');
    while (lines.length < 24) lines.push('');
    const compressed = lines.slice(0, 24).map(l => compressAnsiLine(l.replace(/ +$/u, '')));
    while (compressed.length > 0 && compressed[compressed.length - 1] === '') compressed.pop();
    return compressed.join('\n');
}

// ── PRNG log (same parsing as scripts/record-session.mjs) ──
// The C side writes "N rn2(12) = 2 @ caller(file.c:123)"; sessions store
// "rn2(12)=2 @ caller(file.c:123)".
function parseRngLog(text) {
    const out = [];
    for (const raw of text.split('\n')) {
        const line = raw.trimEnd();
        if (!line) continue;
        const c0 = line[0];
        if (c0 === '>' || c0 === '<' || c0 === '^') {
            out.push(line);
            continue;
        }
        const sp = line.indexOf(' ');
        if (sp < 0) continue;
        out.push(line.slice(sp + 1).replace(' = ', '='));
    }
    return out;
}

// The recorder runs `nethack -u <name>` with the name from OPTIONS=name:
// (or an empty name, which makes the game ask "Who are you?").
export function playerName(rc) {
    for (const rawLine of String(rc || '').split('\n')) {
        const line = rawLine.trim();
        const upper = line.toUpperCase();
        if (!(upper.startsWith('OPTIONS=') || upper.startsWith('OPTIONS ='))) continue;
        for (const opt of line.slice(line.indexOf('=') + 1).split(',')) {
            const t = opt.trim();
            if (t.toLowerCase().startsWith('name:')) return t.slice('name:'.length).trim();
        }
    }
    return '';
}

// A key is a byte in the tty's 8-bit input domain.  The recorder's pipe
// maps CR to LF the way tmux's line discipline did (ICRNL).
export function keyByte(code) {
    const c = code & 0xff;
    return c === 13 ? 10 : c;
}

function bytesToLatin1(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
        s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return s;
}

function latin1ToBytes(s) {
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
    return out;
}

function storageKeys(storage) {
    const keys = [];
    if (!storage) return keys;
    for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k != null) keys.push(k);
    }
    return keys;
}

function listFiles(FS, dir, prefix = '') {
    const out = [];
    for (const name of FS.readdir(dir)) {
        if (name === '.' || name === '..') continue;
        const path = `${dir}/${name}`;
        const rel = prefix + name;
        if (FS.isDir(FS.stat(path).mode)) out.push(...listFiles(FS, path, rel + '/'));
        else out.push(rel);
    }
    return out;
}

// ── Game set-up shared by replay (runSegment) and play (js/play.js) ──

// The C runtime copies the environment when it starts, so the variables
// go in from preRun, before that happens.
export function environmentSetup({ seed, datetime }) {
    return (Mod) => {
        Object.assign(Mod.ENV, {
            HOME,
            NETHACKDIR: HACKDIR,
            HACKDIR,
            TERM: 'xterm-256color',
            TZ: 'America/New_York',
            NETHACK_NO_DELAY: '1',
            NETHACK_SEED: String(seed ?? 0),
            NETHACK_FIXED_DATETIME: datetime || DEFAULT_DATETIME,
            NETHACK_RNGLOG: RNGLOG,
            NOMUX_MARKERS: '1',
            NETHACK_RAW_KEYS: '1',
        });
        // Test switch for local recordings (see time() in wasm/jsglue.c).
        if (globalThis.process?.env?.NETHACK_JS_REALTIME) Mod.ENV.NETHACK_JS_REALTIME = '1';
    };
}

// Files go in after start-up, when the embedded data files (the module
// carries /nh) are in place: the rc file, then this session's saved files.
export function installFiles(FS, { nethackrc, storage }) {
    FS.mkdirTree(HOME);
    FS.mkdirTree('/tmp');
    FS.mkdirTree(`${HACKDIR}/save`);
    FS.writeFile(`${HOME}/.nethackrc`, nethackrc || '');
    for (const k of storageKeys(storage)) {
        if (!k.startsWith(STORAGE_PREFIX)) continue;
        const rel = k.slice(STORAGE_PREFIX.length);
        if (!PERSISTENT_FILE.test(rel)) continue;
        FS.writeFile(`${HACKDIR}/${rel}`, latin1ToBytes(storage.getItem(k) || ''));
    }
}

// Copy the game's persistent files back into storage, and drop the ones
// the game deleted (a restored save file, used-up bones).
export function persistFiles(FS, storage) {
    if (!storage) return;
    const present = new Set();
    for (const rel of listFiles(FS, HACKDIR)) {
        if (!PERSISTENT_FILE.test(rel)) continue;
        present.add(STORAGE_PREFIX + rel);
        storage.setItem(STORAGE_PREFIX + rel, bytesToLatin1(FS.readFile(`${HACKDIR}/${rel}`)));
    }
    for (const k of storageKeys(storage)) {
        if (k.startsWith(STORAGE_PREFIX) && !present.has(k)
            && PERSISTENT_FILE.test(k.slice(STORAGE_PREFIX.length))) {
            storage.removeItem(k);
        }
    }
}

export function consoleHooks() {
    const debug = globalThis.process?.env?.NH_DEBUG;
    return {
        print: (s) => { if (debug) console.log('[out]', s); },
        printErr: (s) => { if (debug) console.log('[err]', s); },
    };
}

// ── One recorded segment, replayed ──

export class NethackSegment {
    constructor(input) {
        this.input = input;
        this._screens = [];
        this._cursors = [];
        this._anim = [];
        this._pendingAnim = [];
        this._rng = [];
        this._steps = 0;
        this.exitStatus = null;
    }

    getScreens() { return this._screens; }
    getCursors() { return this._cursors; }
    getRngLog() { return this._rng; }
    getAnimationFramesByStep() { return this._anim; }

    async run() {
        const { nethackrc, storage } = this.input;
        const keys = Array.from(this.input.moves || '', ch => keyByte(ch.charCodeAt(0)));
        // The recorder keeps one screen for the start plus one per key.
        const expected = keys.length + 1;
        let nextKey = 0;
        // The recorder reads the PRNG log at each input frame, so a
        // segment's log ends at the last frame it kept.  Track that offset.
        let rngBytesAtLastFrame = 0;
        let FS = null;

        const createNetHack = await loadReplayBuild();
        const M = await createNetHack({
            noInitialRun: true,
            thisProgram: `${HACKDIR}/nethack`,
            preRun: [environmentSetup(this.input)],
            ...consoleHooks(),
            nhNextKey: () => {
                if (nextKey >= keys.length || this._steps >= expected) {
                    throw new KeysExhausted();
                }
                return keys[nextKey++];
            },
            nhFrame: (isInput, seq, cx, cy, payload) => {
                if (this._steps >= expected) return;
                const frame = { screen: encodeScreen(payload), cursor: [cx, cy, 1] };
                if (!isInput) {
                    this._pendingAnim.push(frame);
                    return;
                }
                this._steps++;
                // The judge keeps a recorded step's screen only when it is
                // non-empty (`if (step.screen)` in frozen/ps_test_runner.mjs),
                // so a blank frame (the end of a game after #quit) is left
                // out here too, or every later screen would be off by one.
                if (frame.screen) {
                    this._screens.push(frame.screen);
                    this._cursors.push(frame.cursor);
                }
                try { rngBytesAtLastFrame = FS.stat(RNGLOG).size; } catch { /* no calls yet */ }
                this._anim.push(this._pendingAnim);
                this._pendingAnim = [];
            },
        });
        FS = M.FS;
        installFiles(FS, { nethackrc, storage });

        try {
            this.exitStatus = M.callMain(['-u', playerName(nethackrc)]);
        } catch (e) {
            if (!(e instanceof KeysExhausted)) throw e;
        }

        try {
            const log = FS.readFile(RNGLOG).subarray(0, rngBytesAtLastFrame);
            this._rng = parseRngLog(new TextDecoder().decode(log));
        } catch {
            this._rng = [];
        }
        persistFiles(FS, storage);
        return this;
    }
}

export async function runSegment(input) {
    const segment = new NethackSegment(input || {});
    await segment.run();
    return segment;
}
