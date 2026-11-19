// js/nhprocess.js: one run of the recorder's NetHack process over the
// transpiled build (transpiler-design.md 8.3). Hand-written glue, shared by
// js/jsmain.js (runSegment: scripted keys, screens and RNG collected as the
// recorder collects them) and js/allmain.js (interactive play).
//
// bootProcess resets all module state, installs the recorder's environment,
// mounts the game data and the user's files, and starts
// main("nethack", "-u", name). Output reaches the caller as the in-band
// OSC 7777 markers the patched tty port writes to stdout at every input
// boundary (NOMUX_MARKERS=1) and, if asked, the NETHACK_RNGLOG lines.
import * as $c from './crt/index.js';
import { game as gstate } from './gstate.js';
import { vfsReadFile, vfsWriteFile } from './storage.js';
import { $initAll } from './nh/index.js';
import { main } from './nh/unixmain.js';
import { files as dataFiles, dirs as dataDirs } from './data/index.js';

// The recorder environment (docs/recording-environment.md, record-session.mjs recordSegment)
export const HOME = '/Users/davidbau/git/mazesofmenace/teleport/maud/test/comparison/c-harness/results';
export const HACKDIR = '/Users/davidbau/git/mazesofmenace/teleport/nethack-c/recorder/install/games/lib/nethackdir';
const RNGLOG = '/dev/nethack-rnglog';

function parseNethackrcName(rc) {
    if (!rc) return null;
    for (const rawLine of rc.split('\n')) {
        const line = rawLine.trim();
        const upper = line.toUpperCase();
        if (!(upper.startsWith('OPTIONS=') || upper.startsWith('OPTIONS ='))) continue;
        for (const opt of line.slice(line.indexOf('=') + 1).split(',')) {
            const t = opt.trim();
            if (t.toLowerCase().startsWith('name:')) return t.slice('name:'.length).trim();
        }
    }
    return null;
}

// ---------- screen encoding: record-session.mjs encodeScreenAnsiRle(payloadToLines(p)) ----------
function compressAnsiLine(line) {
    let out = '', i = 0;
    while (i < line.length) {
        if (line[i] === ' ') {
            const start = i;
            while (i < line.length && line[i] === ' ') i++;
            const run = i - start;
            out += run >= 5 ? `\x1b[${run}C` : ' '.repeat(run);
        } else out += line[i++];
    }
    return out;
}
export function encodeScreen(payload) {
    const lines = payload.split('\n');
    while (lines.length < 24) lines.push('');
    const compressed = lines.slice(0, 24).map((l) => compressAnsiLine(l.replace(/ +$/u, '')));
    while (compressed.length && compressed[compressed.length - 1] === '') compressed.pop();
    return compressed.join('\n');
}

/** Incremental parser for ESC ] 7777 ; KIND=k;SEQ=n;ANIM=a;CX=x;CY=y;LEN=L BEL <L bytes>. */
class MarkerParser {
    constructor(onMarker) { this.buf = new Uint8Array(0); this.onMarker = onMarker; this.dec = new TextDecoder('utf-8'); }
    push(bytes) {
        const b = new Uint8Array(this.buf.length + bytes.length);
        b.set(this.buf); b.set(bytes, this.buf.length);
        this.buf = b;
        for (;;) {
            const start = this.find();
            if (start < 0) { this.buf = this.buf.subarray(Math.max(0, this.buf.length - 7)); return; }
            const bel = this.buf.indexOf(7, start);
            if (bel < 0) { this.buf = this.buf.subarray(start); return; }
            const header = String.fromCharCode(...this.buf.subarray(start + 7, bel));
            const m = {};
            for (const kv of header.split(';')) { const [k, v] = kv.split('='); m[k] = v; }
            const len = Number(m.LEN);
            if (this.buf.length < bel + 1 + len) { this.buf = this.buf.subarray(start); return; }
            const payload = this.dec.decode(this.buf.subarray(bel + 1, bel + 1 + len));
            this.buf = this.buf.subarray(bel + 1 + len);
            this.onMarker({ kind: m.KIND, seq: Number(m.SEQ), cx: Number(m.CX), cy: Number(m.CY), payload });
        }
    }
    find() {
        const b = this.buf;
        for (let i = 0; i + 6 < b.length; i++) {
            if (b[i] === 0x1b && b[i + 1] === 0x5d && b[i + 2] === 0x37 && b[i + 3] === 0x37 && b[i + 4] === 0x37 && b[i + 5] === 0x37 && b[i + 6] === 0x3b) return i;
        }
        return -1;
    }
}

/** RNG log lines -> onCall(entry without the caller tag, full entry). */
function rngLineSink(onCall) {
    let text = '';
    const sink = (bytes) => {
        text += String.fromCharCode(...bytes);
        let nl;
        while ((nl = text.indexOf('\n')) >= 0) {
            const line = text.slice(0, nl).trimEnd();
            text = text.slice(nl + 1);
            if (!line || '<>^'.includes(line[0])) continue;
            const sp = line.indexOf(' ');
            if (sp < 0) continue;
            const rest = line.slice(sp + 1).replace(' = ', '=');
            const at = rest.indexOf(' @ ');
            onCall(at >= 0 ? rest.slice(0, at) : rest, rest);
        }
    };
    sink.flush = () => { if (text) sink(Uint8Array.of(10)); };
    return sink;
}

/**
 * Start one process. opts: { seed, datetime, nethackrc, storage, keys (string),
 * readKey (async () => code, once keys run out), onMarker(m), onRng(call, full) or null,
 * onStarve }. Returns { done: Promise<{ status } | { error }>, flush() }.
 */
export function bootProcess(opts) {
    const parser = new MarkerParser(opts.onMarker);
    const rng = opts.onRng ? rngLineSink(opts.onRng) : null;

    // ---- a fresh process ----
    gstate.mockStorage = opts.storage || null;
    // The recorder creates the score files before each segment (record-session.mjs
    // ensureScorefiles: open for append, so a missing file is created empty and an
    // existing one is kept). Storage is fresh per session, as the recorder's first
    // segment clears them (clearStaleState).
    for (const f of ['record', 'logfile', 'xlogfile']) if (vfsReadFile(`${HACKDIR}/${f}`) === null) vfsWriteFile(`${HACKDIR}/${f}`, '');
    $c.resetStdio();
    $c.resetFs();
    $c.mountData(HACKDIR, dataFiles);
    for (const d of dataDirs) $c.mountData(`${HACKDIR}/${d}`, []);
    $c.mountData(HOME, []);
    if (rng) $c.mountDevice(RNGLOG, rng);
    $c.putFile(`${HOME}/.nethackrc`, opts.nethackrc || '');
    const env = {
        HOME, TERM: 'xterm-256color', TZ: 'America/New_York', USER: 'davidbau', LOGNAME: 'davidbau',
        NETHACKDIR: HACKDIR, HACKDIR, NETHACK_NO_DELAY: '1',
        NETHACK_SEED: String(opts.seed ?? 0), NETHACK_FIXED_DATETIME: opts.datetime || '20000110090000',
        ...(rng ? { NETHACK_RNGLOG: RNGLOG } : {}), NOMUX_MARKERS: '1', NETHACK_RAW_KEYS: '1',
    };
    $c.resetProcess({ env, keys: opts.keys || '', cwd: HOME, onStarve: opts.onStarve || null, readKey: opts.readKey || null });
    $c.setSink($c.stdout, (b) => parser.push(b));
    $c.setSink($c.stderr, null);
    $initAll();

    const name = parseNethackrcName(opts.nethackrc) ?? '';
    const args = [`${HACKDIR}/nethack`, '-u', name];
    const argv = new $c.Ptr([...args.map((s) => $c.lit(s)), null], 0);
    const done = main(args.length, argv).then(
        (status) => ({ status }),
        (e) => (e instanceof $c.ProcessExit ? { status: e.status } : { error: e }));
    return { done, flush: () => { if (rng) rng.flush(); } };
}
