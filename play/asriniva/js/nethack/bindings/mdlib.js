import * as CAdapter from '../../c-runtime/adapter-factories.js';
// Per-module static storage and C ABI views, outside translated mdlib.c.
export function createMdlibState(services, layout, tables) {
    const at = Number(services.storage(1));
    const view = () => CAdapter.currentDataView(services);
    const version = { address: at };
    for (const [name, offset] of Object.entries({ incarnation: layout.versionIncarnation,
        feature_set: layout.versionFeatureSet, entity_count: layout.versionEntityCount }))
        Object.defineProperty(version, name, {
            get() { return view().getBigUint64(at + offset, true); },
            set(value) { view().setBigUint64(at + offset, BigInt.asUintN(64, BigInt(value)), true); },
        });
    const compat = Number(services.storage(2));
    const state = {
        opttext: new Array(layout.MAXOPT).fill(0),
        optbuf: Number(services.storage(0)),
        save_bones_compat_buf: compat,
        version,
        artifact_names: tables.artifact_names,
        window_opts: tables.window_opts_initial.map(entry => ({ ...entry })),
        soundlib_opts: tables.soundlib_opts_initial.map(entry => ({ ...entry,
            text_id: entry.text_id === 0 ? 0 : Number(services.literal(entry.text_id)),
        })),
        build_opts: tables.build_opts_initial.map(entry => typeof entry === 'string' ? entry : compat),
        opt_indent: tables.opt_indent,
    };
    for (const name of ['date_via_env', 'idxopttext', 'done_runtime_opt_init_once']) {
        let value = 0;
        Object.defineProperty(state, name, {
            enumerable: true,
            get() { return value; },
            set(next) { value = name === 'date_via_env' ? Number(next) << 24 >> 24 : Number(next) | 0; },
        });
    }
    return state;
}

export function createMdlibEnvironment(services, layout, state) {
    if (layout.pointerSize !== 8 || layout.intSize !== 4 || layout.longSize !== 8
        || layout.charSize !== 1 || !layout.charSigned || layout.CHAR_BIT !== 8
        || layout.booleanSize !== 1 || !layout.booleanSigned
        || layout.versionFieldSize !== 8 || layout.MAXOPT !== 60 || layout.NH_DEVEL_STATUS !== 0)
        throw new Error('Review changed mdlib ABI or development configuration');
    for (const [name, expected] of Object.entries(configured_flags))
        if (layout['flag_' + name] !== expected)
            throw new Error('Review changed mdlib table configuration: ' + name);
    if (layout.strings.DEV_RANDOM !== '/dev/random')
        throw new Error('Review changed mdlib random seed configuration');
    const address = value => Number(value?.address ?? value ?? 0);
    const view = () => CAdapter.currentDataView(services);
    const int = value => CAdapter.signedInt(value);
    function intPointer(value) {
        const at = address(value);
        if (!at) return 0;
        return {
            address: at,
            get value() { return view().getInt32(at, true); },
            set value(value) { view().setInt32(at, int(value), true); },
        };
    }
    return {
        ...services,
        ...layout,
        ...layout.strings,
        STATUS_ARG: '',
        SFCTOOL_BIT: BigInt(layout.SFCTOOL_BIT),
        mdlibState: state,
        version: state.version,
        optbuf: state.optbuf,
        opt_indent: state.opt_indent,
        save_bones_compat_buf: state.save_bones_compat_buf,
        get HEAP8() {return CAdapter.currentInt8View(services);},
        get HEAPU8() { return services.heap(); },
        int,
        ulong(value) { return BigInt.asUintN(64, typeof value === 'bigint' ? value : BigInt(Math.trunc(value))); },
        intPointer,
        intLocal(initial) {
            const result = intPointer(services.stackAlloc(layout.intSize));
            if (initial !== undefined) result.value = initial;
            return result;
        },
    };
}

// Configuration gates protect the translated preprocessor-selected tables.
const configured_flags = {
    "AMIGA": 0,
    "AMIGA_INTUITION": 0,
    "AMIGA_WBENCH": 0,
    "ANSI_DEFAULT": 0,
    "AZTEC_C": 0,
    "BEOS_GRAPHICS": 0,
    "CLIPPING": 1,
    "COMPRESS": 1,
    "CRASHREPORT": 1,
    "CURSES_GRAPHICS": 0,
    "DEF_PAGER": 0,
    "DEV_RANDOM": 1,
    "DLB": 0,
    "DUMPLOG": 0,
    "EDIT_GETLIN": 0,
    "GEM_GRAPHICS": 0,
    "GNOME_GRAPHICS": 0,
    "GNUDOS": 0,
    "GRAPHIC_TOMBSTONE": 0,
    "HANGUPHANDLING": 1,
    "HAS_NO_MKSTEMP": 0,
    "HOLD_LOCKFILE_OPEN": 0,
    "INSURANCE": 1,
    "LIFE": 0,
    "LIVELOG": 1,
    "LOGFILE": 1,
    "MACOS9": 0,
    "MAIL": 1,
    "MAIL_STRUCTURES": 1,
    "MICRO": 0,
    "MONITOR_HEAP": 0,
    "MOVERLAY": 0,
    "MSDOS": 0,
    "MSWIN_GRAPHICS": 0,
    "NEWS": 1,
    "NO_SIGNAL": 0,
    "NO_TERMS": 0,
    "OVERLAY": 0,
    "PANICLOG": 1,
    "PANICTRACE": 1,
    "PORT_SUB_ID": 0,
    "PREFIXES_IN_USE": 0,
    "QT_GRAPHICS": 0,
    "RANDOM": 0,
    "SAFERHANGUP": 1,
    "SCORE_ON_BOTL": 0,
    "SCREEN_BIOS": 0,
    "SCREEN_DJGPPFAST": 0,
    "SCREEN_VGA": 0,
    "SELECTSAVED": 1,
    "SFCTOOL": 0,
    "SHELL": 1,
    "SHIM_GRAPHICS": 0,
    "SHORT_FILENAMES": 0,
    "SND_LIB_FMOD": 0,
    "SND_LIB_MACSOUND": 0,
    "SND_LIB_MINIAUDIO": 0,
    "SND_LIB_OPENAL": 0,
    "SND_LIB_PORTAUDIO": 0,
    "SND_LIB_QTSOUND": 0,
    "SND_LIB_SDL_MIXER": 0,
    "SND_LIB_SOUND_ESCCODES": 0,
    "SND_LIB_VISSOUND": 0,
    "SND_LIB_WINDSOUND": 0,
    "STATUS_HILITES": 1,
    "SUSPEND": 1,
    "SYSCF": 1,
    "TERMINFO": 1,
    "TERMLIB": 0,
    "TIMED_DELAY": 0,
    "TTY_GRAPHICS": 1,
    "TTY_TILES_ESCCODES": 0,
    "UNIX": 1,
    "USER_SOUNDS": 0,
    "USE_ISAAC64": 1,
    "USE_XPM": 0,
    "VERSION_COMPATIBILITY": 0,
    "VERSION_IN_DLB_FILENAME": 0,
    "VISION_TABLES": 0,
    "VROOMM": 0,
    "WIN32": 0,
    "WIN32CON": 0,
    "X11_GRAPHICS": 0,
    "XLOGFILE": 1,
    "ZLIB_COMP": 0,
    "_MSC_VER": 0,
    "__DJGPP__": 0
};
