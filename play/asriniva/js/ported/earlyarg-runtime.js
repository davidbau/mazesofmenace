// Native pointer cells/layouts and original header ABI; parser policy is in earlyarg.js.
import * as earlyarg from './earlyarg.js';
import { withCEnvironment } from './c-runtime.js';
const states = new WeakMap();
const catalogueNames = ['monsdump','objdump','defsym_cmap_dump','defsym_mon_syms_dump',
    'defsym_mon_defchars_dump','objclass_defchars_dump','objclass_classes_dump',
    'objclass_syms_dump','arti_enum_dump','mcastu_enum_dump'];

function stateFor(services, layout) {
    const key = services.moduleKey;
    if (!key || typeof key !== 'object') throw new Error('EARLYARG needs the actual Module identity');
    if (states.has(key)) return states.get(key);
    if (layout.pointerSize !== 8 || layout.intSize !== 4 || layout.booleanSize !== 1)
        throw new Error('Review changed EARLYARG ABI');
    for (const [name,value] of Object.entries({UNIX:1,CHDIR:1,SYSCF:1,PANICTRACE:1,
        NO_SIGNAL:0,TTY_GRAPHICS:1,ENHANCED_SYMBOLS:1,CRASHREPORT:1,NODUMPENUMS:0,WIN32:0,DLB:0}))
        if (layout['config_' + name] !== value) throw new Error('Review changed EARLYARG configuration: ' + name);
    const state = { ArgVal_novalue: Number(services.storage(2)) };
    const view = () => new DataView(services.heap().buffer);
    for (const name of catalogueNames) {
        state[name] = earlyarg[name].map(row => ({ val: typeof row.val === 'string' ? layout[row.val] : row.val, nm: row.nm }));
        if (state[name].length !== layout[name + '_count'] || state[name].some(row => !Number.isInteger(row.val)))
            throw new Error('Review changed EARLYARG catalogue: ' + name);
    }
    state.earlyopts = earlyarg.earlyopts.map(row => ({ ...row, e: layout[row.e] }));
    for (const [index, name] of ['monsdump','objdump'].entries()) {
        const at = Number(services.storage(index));
        services.heap().fill(0, at, at + state[name].length * layout.EnumDumpSize);
        for (const [i, row] of state[name].entries()) {
            view().setInt32(at + i * layout.EnumDumpSize + layout.enum_val, row.val, true);
            const text = services.literal(row.nm);
            view().setBigUint64(at + i * layout.EnumDumpSize + layout.enum_nm, BigInt(text), true);
        }
    }
    // These two original nonconst arrays are externally visible to C. After
    // JS-owned initialization, their native cells remain the live authority.
    for (const [index,name] of ['monsdump','objdump'].entries()) {
        const at = Number(services.storage(index));
        state[name] = Array.from({ length: state[name].length }, (_, i) => {
            const row = {}, cell = at + i * layout.EnumDumpSize;
            Object.defineProperties(row, {
                val: { get: () => view().getInt32(cell + layout.enum_val, true),
                    set: value => view().setInt32(cell + layout.enum_val, Number(value), true) },
                nm: { get: () => Number(view().getBigUint64(cell + layout.enum_nm, true)),
                    set: value => view().setBigUint64(cell + layout.enum_nm, BigInt(value), true) },
            });
            return row;
        });
    }
    const text = earlyarg.ArgVal_novalue_initial;
    for (let i = 0; i < text.length; i++) services.heap()[state.ArgVal_novalue + i] = text.charCodeAt(i);
    services.heap()[state.ArgVal_novalue + text.length] = 0;
    states.set(key, state);
    return state;
}
export function initializeEarlyarg(services, layout) { stateFor(services, layout); }

export function createEarlyargEnvironment(services, layout) {
    const state = stateFor(services, layout);
    const address = value => Number(value?.address ?? value ?? 0);
    const raw = value => BigInt.asUintN(64, BigInt(value?.address ?? value ?? 0));
    const view = () => new DataView(services.heap().buffer);
    const global = index => Number(services.global(index));
    const int = value => typeof value === 'bigint' ? Number(BigInt.asIntN(32, value)) : Number(value) | 0;
    const scalar = (target, key, at, type) => Object.defineProperty(target, key, {
        get() { return view()['get' + type](at(), true); },
        set(value) { view()['set' + type](at(), Number(value), true); },
    });
    const ptrField = (target, key, at, wrap = value => value) => Object.defineProperty(target, key, {
        get() { return wrap(Number(view().getBigUint64(at(), true))); },
        set(value) { view().setBigUint64(at(), raw(value), true); },
    });
    const argv = value => {
        const at = address(value);
        return new Proxy({ address: at }, {
            get(target, key) {
                return typeof key === 'string' && /^-?\d+$/.test(key)
                    ? Number(view().getBigUint64(at + Number(key) * layout.pointerSize, true)) : target[key];
            },
            set(target, key, value) {
                if (typeof key === 'string' && /^-?\d+$/.test(key))
                    view().setBigUint64(at + Number(key) * layout.pointerSize, raw(value), true);
                else target[key] = value;
                return true;
            },
        });
    };
    const intPointer = value => {
        const at = address(value); if (!at) return 0;
        const box = { address: at }; scalar(box, 'value', () => at, 'Int32'); return box;
    };
    const pointerBox = (value, wrap) => {
        const at = address(value); if (!at) return 0;
        const box = { address: at }; ptrField(box, 'value', () => at, wrap); return box;
    };
    const gc = {}, gd = {}, gh = {}, program_state = {}, iflags = { debug: {} };
    for (const name of ['cmdline_rcfile','cmdline_windowsys']) ptrField(gc, name, () => global(0) + layout['gc_' + name]);
    scalar(gd, 'deferred_showpaths', () => global(1) + layout.gd_deferred_showpaths, 'Int8');
    ptrField(gd, 'deferred_showpaths_dir', () => global(1) + layout.gd_deferred_showpaths_dir);
    ptrField(gh, 'hname', () => global(2) + layout.gh_hname);
    scalar(program_state, 'early_options', () => global(3) + layout.program_early_options, 'Int32');
    for (const key of ['initoptions_noterminate','fuzzerpending']) scalar(iflags, key, () => global(4) + layout['iflags_' + key], 'Int8');
    for (const key of ['test','ttystatus']) scalar(iflags.debug, key, () => global(4) + layout['iflags_debug_' + key], 'Int8');
    const env = Object.assign(Object.create(services), layout, state, {
        gc,gd,gh,program_state,iflags,int,argv,intPointer,
        argvPointer: value => pointerBox(value, argv),charPointerPointer: value => pointerBox(value),
        argvAdd: (value, count) => argv(address(value) + int(count) * layout.pointerSize),
        charPointer: value => typeof value === 'string' ? services.literal(value) : address(value),
        uchar: value => int(value) & 255,
        loadChar: value => view().getInt8(address(value)),
        storeChar(at, value) { const ch = int(value) << 24 >> 24; view().setInt8(address(at), ch); return ch; },
    });
    ptrField(env, 'ARGV0', () => global(5));
    Object.defineProperties(env, {
        HEAPU8: { get: () => services.heap() },
        USAGEHELP: { get: () => services.usageHelp() },stdout: { get: () => services.stdout() },
    });
    return env;
}
export function callEarlyarg(services, layout, name, ...args) {
    const env = createEarlyargEnvironment(services, layout);
    if (name === 'early_options') args = [env.intPointer(args[0]),env.argvPointer(args[1]),env.charPointerPointer(args[2])];
    else if (name === 'lopt') { args[4] = env.intPointer(args[4]); args[5] = env.argvPointer(args[5]); }
    else if (name === 'consume_arg' || name === 'consume_two_args') { args[1] = env.intPointer(args[1]); args[2] = env.argvPointer(args[2]); }
    else if (name === 'argcheck' || name === 'scores_only') args[1] = env.argv(args[1]);
    return withCEnvironment(env, earlyarg[name], ...args);
}
