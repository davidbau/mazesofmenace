// Standalone transport for the unchanged SFBASE/SFSTRUCT implementations.
import { createNativeSfbase } from './native/sfbase.js';
import { createOptimizedSfbaseEnvironment } from './bindings/sfbase.js';
import * as sfstruct from '../ported/sfstruct.js';
import { createNativeSfstruct } from './native/sfstruct.js';
import { initializeSfstruct } from './bindings/sfstruct.js';
import { address } from './memory-services.js';
import { moves_to_relative_time, relative_time_to_moves, rest_adjust_levelflags } from '../ported/restore.js';
import { nativeStateFor } from './native/state-bridge.js';
export function enableSerialization(environment, layouts) {
    const { services, memory, functions } = environment, L = layouts.sfbase, S = layouts.sfstruct;
    const owner = nativeStateFor(environment),
        historicalCallbacks = new Map();
    if (typeof services.fwrite !== 'function' || !services.program_state) throw new Error(
        'Enable stdio and DECL before serialization');
    const movesAt = environment.ctypes.locate('struct instance_globals_saved_m', environment.requireGlobal(
            'svm'), 'moves').at,
        time = Object.create(services);
    Object.defineProperty(time, 'svm', {
        value: Object.defineProperty({}, 'moves', {
            get: () => environment.ctypes.load('long', movesAt)
        })
    });
    const levelAt = environment.ctypes.locate('struct instance_globals_saved_l', environment.requireGlobal(
            'svl'), 'level').at,
        flags = {
            address: environment.ctypes.locate('dlevel_t', levelAt, 'flags').at
        };
    Object.defineProperty(time, 'svl', {
        value: {
            level: { flags }
        }
    });
    time.longPointer = p => {
        const at = address(p);
        return Object.defineProperty({ address: at }, 'value', {
            get: () => environment.ctypes.load('long', at),
            set: value => environment.ctypes.store('long', at, value)
        });
    };
    time.addressOf = (owner, key) => {
        if (owner !== flags || key !== 'stasis_until') throw new Error('Unknown RESTORE timestamp field');
        return environment.ctypes.locate('struct levelflags', flags.address, key).at;
    };
    environment.register('restore-timestamps', {
        moves_to_relative_time,
        relative_time_to_moves,
        rest_adjust_levelflags
    }, time, {
        prepareArgs: (name, args) => {
            if (name !== 'rest_adjust_levelflags') args[0] = time.longPointer(args[0]);
            return args;
        }
    });
    const names = ['sfoprocs', 'sfiprocs', 'sfoflprocs', 'sfiflprocs', 'zerosfoprocs', 'zerosfiprocs',
        'zerosfoflprocs', 'zerosfiflprocs', 'historical_sfo_procs', 'historical_sfi_procs'
    ];
    const tables = names.map((name, i) => environment.allocateGlobal(name, (i < 4 ? L.NUM_SAVEFORMATS : 1) * (
        i === 2 || i === 3 || i === 6 || i === 7 ? L.fieldlevelSize : L.structlevelSize)));
    const bufferNames = Object.keys(L).filter(k => k.startsWith('buffer_')).map(k => k.slice(7));
    // The original adapter's declared order is part of its buffer ABI.
    const ordered = ['sfvalue_char', 'sfvalue_boolean', 'sfvalue_schar', 'sfvalue_aligntyp', 'sfvalue_any',
        'sfvalue_genericptr', 'sfvalue_int16', 'sfvalue_int32', 'sfvalue_int64', 'sfvalue_uchar',
        'sfvalue_uint16', 'sfvalue_uint32', 'sfvalue_uint64', 'sfvalue_size_t', 'sfvalue_time_t',
        'sfvalue_short', 'sfvalue_ushort', 'sfvalue_int', 'sfvalue_unsigned', 'sfvalue_long',
        'sfvalue_ulong', 'sfvalue_xint8', 'sfvalue_xint16', 'sfvalue_bitfield', 'bitfield_dump',
        'complex_dump'
    ];
    if (ordered.some(key => !bufferNames.includes(key))) throw new Error(
    'Missing measured serializer buffer');
    const buffers = ordered.map(key => environment.allocateGlobal('sfbase.' + key, L['buffer_' + key]));
    const local = Object.create(services);
    Object.assign(local, {
        global: i => {
            if (!tables[i]) throw new Error('Unknown serializer table');
            return tables[i];
        },
        buffer: i => {
            if (!buffers[i]) throw new Error('Unknown serializer buffer');
            return buffers[i];
        },
        pri: i => ['lld', 'lld', 'llu', 'llu'][i],
        call: (fn, nhfp, data, tag, count) => functions.callback(fn)(nhfp, data, tag, ...(count ===
            undefined ? [] : [count])),
        boundSerializer: token => historicalCallbacks.get(token),
        Snprintf: (out, n, format, ...args) => {
            args.pop();
            return environment.libc.snprintf(address(out), Number(n), format, ...args);
        },
    });
    const fd = environment.ctypes.record('struct nh_file').fields.fd;
    if (fd.offset !== S.nhf_fd || fd.ctype !== 'int fd') throw Error('Review shared NHFILE descriptor');
    const baseEnv = createOptimizedSfbaseEnvironment(local, {
        ...L,
        nhf_fd: fd.offset,
        nhf_fd_size: 4
    });
    const basePolicy = createNativeSfbase(baseEnv);
    const nativeEntry = fn => Object.assign(fn, {
        nativeDirect: true,
        nativePrepared: true,
        nativeState: owner
    });
    const baseEntries = Object.fromEntries(Object.entries(basePolicy).filter(([, fn]) => typeof fn ===
        'function').map(([name, fn]) => {
        let entry = fn;
        if (/^(sfo_|sfi_)version_info$/.test(name)) entry = (file, value, tag) => fn(baseEnv
            .nhfile(file), baseEnv.version(value), tag);
        else if (/^(sfo_|sfi_|sf_log$)/.test(name)) entry = (file, ...args) => fn(baseEnv.nhfile(
            file), ...args);
        return [name, nativeEntry(entry)];
    }));
    environment.register('sfbase', baseEntries, baseEnv);
    const restore = environment.allocateGlobal('restoreinfo', S.restoreSize),
        structServices = Object.create(services);
    const historicalTokens = {
        rm: [],
        schar: []
    };
    let structPolicy;
    Object.assign(structServices, {
        restore: () => restore,
        program: () => environment.requireGlobal('program_state'),
        setExt: (input, p) => memory.view.setBigUint64(tables[8 + input] + S.procs_ext, BigInt(p),
            true),
        setProc: (input, index, p) => {
            const keys = Object.keys((input ? sfstruct.historical_sfi_procs : sfstruct
                    .historical_sfo_procs).fn),
                field = keys[index].slice(3);
            const offset = S['proc_' + (field === 'genericptr' ? 'genericptr_t' : field)];
            if (offset === undefined) throw new Error(
                'Missing measured serialization callback field');
            memory.view.setBigUint64(tables[8 + input] + offset, BigInt(p), true);
            if (Object.hasOwn(historicalTokens, field)) historicalTokens[field][input] = BigInt(
            p);
        },
        callback: (input, index) => {
            const table = input ? sfstruct.historical_sfi_procs : sfstruct.historical_sfo_procs,
                fn = Object.values(table.fn)[index];
            const name = Object.entries(sfstruct).find(([, value]) => value === fn)?.[0];
            if (!name) throw new Error('Missing translated historical serializer');
            const invoke = (file, value, tag, count) => structPolicy[name](baseEnv.nhfile(file),
                value, tag, count);
            const token = functions.functionPointer(invoke, fn.length === 4 ? 'vpppi' : 'vppp');
            historicalCallbacks.set(token, invoke);
            return token;
        },
        nh_terminate: services.exit,
        nhclose: services.close,
        delete_savefile: (...args) => environment.resolve('delete_savefile')(...args),
        display_nhwindow: (...args) => environment.resolve('display_nhwindow')(...args),
        pline: (...args) => environment.resolve('pline')(...args),
        impossible: (...args) => environment.resolve('impossible')(...args),
        error: (...args) => environment.resolve('error')(...args),
    });
    const { env: structEnv } = initializeSfstruct(structServices, S);
    structPolicy = createNativeSfstruct(structEnv);
    const {
        historical_map_locations,
        historical_last_seen_terrain,
        ...structExports
    } = structPolicy;
    const structEntries = Object.fromEntries(Object.entries(structExports).filter(([, fn]) => typeof fn ===
        'function').map(([name, fn]) => [
        name, nativeEntry(name.startsWith('historical_') ? (file, value, tag, count) => fn(baseEnv
            .nhfile(file), value, tag, count) : fn),
    ]));
    environment.register('sfstruct', structEntries, structEnv);
    for (const [name, entry] of Object.entries({
            ...baseEntries,
            ...structEntries
        })) owner.functions.set(name, entry);
    for (const name of Object.keys(baseEntries))
        if (name.startsWith('norm_ptrs_')) {
            const published = services[name],
                normalize = baseEntries[name];
            structEnv[name] = at => services[name] === published ? normalize(at) : services[name](at);
        }
    environment.call('sfbase', 'sf_init');
    const { COLNO, ROWNO } = layouts.save;
    const matchingDimensions = layouts.restore.COLNO === COLNO && layouts.restore.ROWNO === ROWNO;
    const mapField = environment.ctypes.record('dlevel_t').fields.locations;
    const terrainField = environment.ctypes.record('struct instance_globals_saved_l').fields.lastseentyp;

    function bindLevelArray(field, at, type, elementSize, serializer, transfer) {
        if (!matchingDimensions || !field || field.ctype !== type || elementSize !== S['type_' + serializer +
                '_size'])
            return () => false;
        const base = at + field.offset;
        const offset = L.structlevel_fn + L['proc_' + serializer],
            tokens = historicalTokens[serializer];
        return (nhfp, reading) => {
            const file = baseEnv.nhfile(nhfp);
            if (!file.structlevel || file.fplog || (reading && (file.mode & (L.CONVERTING | L
                    .UNCONVERTING)))) return false;
            const slot = file.fnidx;
            if (slot < 0 || slot >= L.NUM_SAVEFORMATS) return false;
            const input = Number(reading);
            const tokenAt = tables[input] + slot * L.structlevelSize + offset;
            if (memory.view.getBigUint64(tokenAt, true) !== tokens[input]) return false;
            transfer(file, base, COLNO * ROWNO, reading);
            return true;
        };
    }
    const transferMap = bindLevelArray(mapField, levelAt, `struct rm[${COLNO}][${ROWNO}] locations`,
        environment.ctypes.size('struct rm'), 'rm', historical_map_locations);
    const transferTerrain = bindLevelArray(terrainField, environment.requireGlobal('svl'),
        `schar[${COLNO}][${ROWNO}] lastseentyp`, 1, 'schar', historical_last_seen_terrain);
    owner.saveMapLocations = nhfp => transferMap(nhfp, false);
    owner.restoreMapLocations = nhfp => transferMap(nhfp, true);
    owner.saveLastSeenTerrain = nhfp => transferTerrain(nhfp, false);
    owner.restoreLastSeenTerrain = nhfp => transferTerrain(nhfp, true);
    return { base: baseEnv, struct: structEnv, tables, buffers, restore };
}
