import * as CAdapter from '../../c-runtime/adapter-factories.js';
// REPORT ABI and per-module static storage. The translated TU owns algorithms.
import * as report from '../../ported/report.js';
import { withCEnvironment } from '../../c-runtime/context.js';

export function createReportState(services, layout) {
    const bid = Number(services.global(6)), url = Number(services.global(7));
    if (layout.bidSize !== 40 || layout.MAX_URL !== 8192)
        throw new Error('Review changed REPORT static arrays');
    const state = { once: 0, bid, url,
        urem: layout.MAX_URL, uend: url, utmp: 0, mark: 0 };
    state.uendRef = { get value() { return state.uend; }, set value(v) { state.uend = Number(v); } };
    state.uremRef = { get value() { return state.urem; }, set value(v) { state.urem = v | 0; } };
    return state;
}

export function createReportEnvironment(services, layout, state) {
    if (layout.pointerSize !== 8 || layout.intSize !== 4 || layout.charSize !== 1
        || !layout.CRASHREPORT || !layout.PANICTRACE || !layout.DUMPLOG_CORE
        || layout.PANICTRACE_LIBC || layout.PANICTRACE_GDB || layout.WIN32
        || layout.NO_SIGNAL || layout.CRASHREPORT_EXEC_NOSTDERR
        || layout.strings.CRASHREPORT !== '/usr/bin/open')
        throw new Error('Review changed REPORT ABI or configured source branches');
    const view = () => CAdapter.currentDataView(services);
    const ptr = at => Number(view().getBigUint64(Number(at), true));
    const setptr = (at, value) => view().setBigUint64(Number(at), BigInt(value), true);
    const integer = at => view().getInt32(Number(at), true);
    const text = value => typeof value === 'string' ? services.text(value) : Number(value || 0);
    const gs = { get saved_pline_index() { return view().getUint32(Number(services.global(4)), true); },
        saved_plines: new Proxy({}, { get: (_, key) => ptr(Number(services.global(5)) + Number(key) * 8) }) };
    const locals = new Map();
    const env = { ...layout, ...services, CRASHREPORT: layout.strings.CRASHREPORT,
        DEVTEAM_URL: layout.strings.DEVTEAM_URL, reportState: state, text, gs,
        get HEAPU8() { return services.heap(); },
        get HEAP8() { return layout.charSigned ? services.signedHeap() : services.heap(); },
        gc: { get crash_urlmax() { return integer(services.global(0)); },
            get crash_name() { return ptr(services.global(1)); },
            get crash_email() { return ptr(services.global(2)); } },
        sysopt: { get crashreporturl() { return ptr(services.global(3)); } },
        get errno() { return integer(services.errnoPointer()); },
        set errno(v) { view().setInt32(Number(services.errnoPointer()), v, true); },
        pointerRef(at) { return { address: Number(at), get value() { return ptr(at); }, set value(v) { setptr(at, v); } }; },
        intRef(at) { return { address: Number(at), get value() { return integer(at); }, set value(v) { view().setInt32(Number(at), v, true); } }; },
        localArray(name, size) {
            if (!locals.has(name)) locals.set(name, Number(services.stackAlloc(size)));
            return locals.get(name);
        },
        intLocal() { return env.intRef(services.stackAlloc(4)); },
        pointerArray(values) { const at = Number(services.stackAlloc(values.length * 8));
            values.forEach((value, i) => setptr(at + i * 8, text(value))); return at; },
        Sprintf(out, format, ...args) {
            switch (format) {
            case '%%%02X': return services.format(out, 0, args[0], 0, 0);
            case '?cos=%d&v=1': return services.format(out, 1, args[0], 0, 0);
            case '%.40s report for NetHack %.40s': return services.format(out, 2, 0, text(args[0]), text(args[1]));
            case '%d': return services.format(out, 3, args[0], 0, 0);
            case "Can't start /usr/bin/open: %.*s": return services.format(out, 4, args[0], text(args[1]), 0);
            default: throw new Error('Unreviewed REPORT format: ' + format);
            }
        },
    };
    return env;
}

export function createReportBridge(layout) {
    const states = new WeakMap();
    return function(services, name, ...args) {
        const key = services.moduleKey ?? services;
        let state = states.get(key);
        if (!state) { state = createReportState(services, layout); states.set(key, state); }
        const env = createReportEnvironment(services, layout, state);
        args = args.map(value => typeof value === 'bigint' ? Number(value) : value);
        if (name === 'swr_add_uricoded') {
            args[1] = env.pointerRef(args[1]); args[2] = env.intRef(args[2]);
        }
        if (typeof report[name] !== 'function') throw new Error('Unknown REPORT function ' + name);
        return withCEnvironment(env, report[name], ...args);
    };
}
