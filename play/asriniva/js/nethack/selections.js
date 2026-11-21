import { recordNativeRngCaller } from './native/rng-output.js';
// Native entry conversion and shared storage only. Algorithms remain in SELVAR.
import { createNativeSelvar } from './native/selvar.js';
import { createSelvarState, createSelvarEnvironment } from './bindings/selvar.js';
import { nativeStateFor } from './native/state-bridge.js';
export function enableSelections(environment, layouts, creation) {
    const {
        services,
        functions,
        transport
    } = environment, L = Object.freeze(layouts.selvar), state = createSelvarState();
    const owner = nativeStateFor(environment);
    const local = new Proxy(Object.create(services), {
        get: (o, k, r) => Reflect.has(o, k) ? Reflect.get(o, k, r) : typeof k === 'string' ? (...a) =>
            environment.resolve(k)(...a) : undefined
    });
    const pointer = environment.address,
        text = p => typeof p === 'string' ? services.literal(p) : pointer(p);
    const callers = ['selection_filter_percent', 'selection_filter_mapchar', 'selection_rndcoord',
        'selection_do_gradient', 'selection_do_randline'
    ];
    Object.assign(local, {
        moduleKey: environment,
        global: i => {
            const name = ['cg', 'svl', 'gc', 'svr'][i];
            if (!name) throw new Error('Unknown SELVAR global ' + i);
            return environment.requireGlobal(name);
        },
        alloc: n => environment.alloc('alloc', n),
        free: p => services.free(pointer(p)),
        dupstr: p => environment.libc.strdup(text(p)),
        terrainBit: (x, y, i) => {
            const name = ['lit', 'edge', 'roomno'][i];
            if (!name) throw new Error('Unknown SELVAR terrain bit ' + i);
            return creation.environment.levl[x][y][name];
        },
        floodCheck: (cb, x, y) => functions.indirect(cb, 'iii', x, y),
        iterate: (cb, x, y, arg) => functions.indirect(cb, 'viip', x, y, pointer(arg)),
        rn2: (n, line, caller) => {
            if (!callers[caller]) throw new Error('Unknown SELVAR RNG caller ' + caller);
            if (services.rng_log_enabled()) recordNativeRngCaller(services, 'selvar.c', line,
                callers[caller]);
            return services.rn2(n);
        },
        panic: message => environment.resolve('panic')(services.literal('%s'), text(message)),
        impossible: message => environment.resolve('impossible')(services.literal('%s'), text(
            message)),
        Sprintf: (out, format, shape, dx, dy) => services.sprintf(pointer(out), text(format), text(
            shape), dx, dy),
    });
    const env = createSelvarEnvironment(local, L, state, local, true);
    const policy = createNativeSelvar(env);
    const call = (name, ...args) => transport.scoped(() => {
        if (name.startsWith('selection_') && !['selection_new', 'selection_do_line',
                'selection_do_randline', 'selection_from_mkroom'
            ].includes(name)) args[0] = env.selection(args[0]);
        if (['selection_do_line', 'selection_do_randline'].includes(name)) {
            for (let i = 0; i < 4; i++) args[i] = env.coordxy(args[i]);
            if (name === 'selection_do_randline') {
                args[4] = env.char(args[4]);
                args[5] = env.char(args[5]);
            }
            const index = name === 'selection_do_line' ? 4 : 6;
            args[index] = env.selection(args[index]);
        }
        if (name === 'selection_getbounds') args[1] = env.rect(args[1]);
        if (name === 'selection_rndcoord') {
            args[1] = env.coordPointer(args[1]);
            args[2] = env.coordPointer(args[2]);
            args[3] = env.char(args[3]);
        }
        if (name === 'selection_free') args[1] = env.char(args[1]);
        if (name === 'selection_filter_mapchar') args[1] = env.coordxy(args[1]);
        if (name === 'selection_floodfill') {
            args[1] = env.coordxy(args[1]);
            args[2] = env.coordxy(args[2]);
            args[3] = env.char(args[3]);
        }
        if (name === 'selection_from_mkroom') args[0] = env.room(args[0]);
        if (name === 'sel_flood_havepoint') {
            args[0] = env.coordxy(args[0]);
            args[1] = env.coordxy(args[1]);
            args[2] = env.coordArray(args[2]);
            args[3] = env.coordArray(args[3]);
        }
        const result = policy[name](...args);
        return result?.address ?? result ?? 0;
    });
    const getpoint = (x, y, selection) => policy.selection_getpoint(x, y, env.selection(selection));
    const setpoint = (x, y, selection, value) => {
        policy.selection_setpoint(x, y, env.selection(selection), value);
        return 0;
    };
    const entries = Object.fromEntries(Object.keys(policy).map(name => [name, (...args) => call(name, ...
        args)]));
    entries.selection_getpoint = getpoint;
    entries.selection_setpoint = setpoint;
    for (const [name, callback] of Object.entries(entries)) {
        Object.assign(callback, { nativeState: owner, nativeDirect: true, nativePrepared: true });
        owner.functions.set(name, callback);
    }
    environment.register('selections', entries, env);
    return { state };
}
