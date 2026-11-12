// Execute the compiled recorder inside a fresh Emscripten MEMFS per segment.
// Only seed, date, options, keys and the shared VFS cross this boundary.
import { setStorageForTesting, vfsReadFile, vfsWriteFile } from './storage.js';
import { encodeRecorderScreen, recordingClockEpoch, shouldPersistGameFile } from './wasm-replay-support.js';
import { recordingProfile, profileSysconf } from './recording-profile.js';
import { createPortedRuntime } from './backends/emscripten/runtime.js';
import { createLibraryBindings } from './c-runtime/library-bindings.js';
import { filesUnder, restoreGameFiles, captureGameFiles } from './nethack/game-files.js';
import tuLayouts from './wasm/tu-layouts.json' with { type: 'json' };
import buildMetadata from './wasm/build.json' with { type: 'json' };

const STATE_PATH = '/teleport-wasm64-state.json';

export async function runWasmSegment(input) {
    return runWithTerminal(input);
}

async function runWithTerminal(input) {
    const { default: createNethack } = await import('./wasm/nethack.mjs');
    // Emscripten recognizes this control-flow token without setting Node's
    // exit code to 1; the MEMFS state remains available for capture/persistence.
    const exhausted = 'unwind';
    const screens = [], cursors = [], animations = [];
    let pendingAnimations = [];
    let keyIndex = 0;
    const moves = input.moves || '';
    const diagnostics = [];
    const profile = recordingProfile();
    // Emscripten's libc time functions delegate to JS Date. In Node, Date
    // honors the host process TZ; expose the same zone to C's environment.
    const timezone = (typeof process !== 'undefined' && process.env?.TZ)
        || Intl.DateTimeFormat().resolvedOptions().timeZone;
    let baseline;
    setStorageForTesting(input.storage || null);
    const previousState = vfsReadFile(STATE_PATH);
    const dependencyRuntime = createLibraryBindings({ regex: true });
    const portedRuntime = createPortedRuntime(tuLayouts);
    const recordingEpoch = recordingClockEpoch();
    let luaRuntime;
    if (buildMetadata.luaBackend === 'javascript') {
        const [{ createLuaAbi }, { createLuaBytecodeVM }] = await Promise.all([
            import('./lua/abi.js'), import('./lua/bytecode-vm.js'),
        ]);
        luaRuntime = createLuaAbi({ vmFactory: createLuaBytecodeVM });
    }
    const module = await createNethack({
        nethackPorted: portedRuntime,
        nethackDependencies: dependencyRuntime,
        nethackLua: luaRuntime,
        nethackCalendarTime: () => BigInt(recordingEpoch),
        noInitialRun: true,
        print: line => { diagnostics.push(line); if (diagnostics.length > 40) diagnostics.shift(); },
        printErr: line => diagnostics.push(line),
        teleportReadKey() {
            if (keyIndex >= moves.length) throw exhausted;
            const key = moves.charCodeAt(keyIndex++);
            return key === 13 ? 10 : key;
        },
        teleportCapture(screen, x, y, animation) {
            // Preserve the recorder shadow snapshot and its original encoding.
            // Ghostty is no longer selectable by the active adapter.
            const frame = { screen: encodeRecorderScreen(screen), cursor: [x, y, 1] };
            if (animation) {
                pendingAnimations.push(frame);
            } else {
                screens.push(frame.screen);
                cursors.push(frame.cursor);
                animations.push(pendingAnimations);
                pendingAnimations = [];
            }
        },
        preRun: [instance => {
            const { FS, ENV } = instance;
            Object.assign(ENV, {
                NETHACKDIR: '/nethack', HACKDIR: '/nethack',
                HOME: profile.home, USER: 'root', LOGNAME: 'root',
                TERM: 'xterm-256color', TERMINFO: '/nethack/terminfo', LINES: '24', COLUMNS: '80', TZ: timezone,
                NETHACK_NO_DELAY: '1', NOMUX_MARKERS: '1',
                NETHACK_RAW_KEYS: '1', NETHACK_SEED: String(input.seed ?? 0),
                NETHACK_FIXED_DATETIME: input.datetime || '20000110090000',
                NETHACK_RECORDING_EPOCH: recordingEpoch,
                NETHACK_RNGLOG: '/rng.log',
            });
            FS.mkdirTree(profile.home);
            FS.writeFile(`${profile.home}/.nethackrc`, input.nethackrc || '');
        }],
    });
    {
        const { FS } = module;
        FS.mkdirTree('/nethack/save');
        FS.chdir('/nethack');
        const sysconf = '/nethack/sysconf';
        FS.writeFile(sysconf, profileSysconf(FS.readFile(sysconf, { encoding: 'utf8' }), profile));
        baseline = filesUnder(FS, '/nethack');
        if (previousState) restoreGameFiles(FS, previousState);
    }
    function readRng() {
        try { return module.FS.readFile('/rng.log', { encoding: 'utf8' }).split('\n').filter(Boolean).map(line => line.replace(/^\d+\s+/, '').replace(/\s*=\s*/g, '=')); }
        catch { return []; }
    }
    // -u with an empty name preserves the name-selection prompt.
    const name = /(?:^|[=\s,])name\s*:\s*([^,\n]+)/im.exec(input.nethackrc || '')?.[1]?.trim() || '';
    try {
        const status = module.callMain(['-u', name]);
        if (status) throw new Error(`Game exited with status ${status}: ${diagnostics.join('\n')}`);
    } catch (error) {
        if (error !== exhausted && !(error?.name === 'ExitStatus' && error.status === 0)) {
            throw new Error(`Wasm replay failed: ${error?.stack || error}\n${diagnostics.join('\n')}`);
        }
    }
    const rng = readRng();
    if (!screens.length) throw new Error(`Wasm produced no input boundaries. ${diagnostics.join('\n')}`);
    const state = captureGameFiles(module.FS, baseline, shouldPersistGameFile);
    vfsWriteFile(STATE_PATH, JSON.stringify(state));
    const terminalDiagnostics = { backend: 'shadow' };
    const regexTransport = module.nethackRegexTransport;
    const regexDiagnostics = regexTransport === 'ported-posixregex-direct-js'
        ? portedRuntime.nativeRegexDiagnostics(module)
        : {
            transport: regexTransport,
            backend: regexTransport === 'wasm-libc-js-bridge'
                ? 'javascript-native-macos-compatible-ERE-C-locale' : 'compiled-libc',
            calls: regexTransport === 'wasm-libc-js-bridge'
                ? Object.fromEntries(['regcomp', 'regexec', 'regerror', 'regfree']
                    .map(name => [name, dependencyRuntime.calls[name]])) : null,
        };
    const dependencyDiagnostics = {
        backend: module.nethackDependencyBackend || 'c',
        lua: module.nethackLuaBackend || 'c',
        calls: module.nethackDependencyBackend === 'javascript'
            ? { ...dependencyRuntime.calls, ...(regexDiagnostics.calls || {}) } : null,
        wasmBridgeCalls: module.nethackDependencyBackend === 'javascript'
            ? { ...dependencyRuntime.calls } : null,
        regex: regexDiagnostics,
    };
    return {
        getTerminalDiagnostics: () => terminalDiagnostics,
        getDependencyDiagnostics: () => dependencyDiagnostics,
        getScreens: () => screens, getCursors: () => cursors,
        getRngLog: () => rng,
        getAnimationFramesByStep: () => animations,
    };
}
