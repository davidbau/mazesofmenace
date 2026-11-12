import * as Crt from '../c-runtime/adapter-memory.js';
// Native ABI storage and header macros; version policy and table rows live in version.js.
export function createVersionState(services, layout, namespace) {
    if (namespace.critical_sizes.length !== layout.criticalCount || namespace.rt_opts.length !== layout.rtOptCount)
        throw new Error('Review changed version table counts');
    const heap = () => services.heap();
    const view = () => new DataView(heap().buffer);
    const critical = Number(services.storage(0)), rt = Number(services.storage(2));
    heap().fill(0, critical, critical + layout.criticalSize * layout.criticalCount);
    heap().fill(0, rt, rt + layout.rtOptSize * layout.rtOptCount);
    for (const [i, row] of namespace.critical_sizes.entries()) {
        const size = typeof row.ucsize === 'string' ? layout[row.ucsize] : row.ucsize;
        if (!Number.isSafeInteger(size)) throw new Error('Review changed critical size expression');
        const at = critical + i * layout.criticalSize;
        view().setUint8(at + layout.critical_ucsize, size);
        const name = services.literal(row.nm);
        view().setBigUint64(at + layout.critical_nm, BigInt(name), true);
    }
    for (const [i, row] of namespace.rt_opts.entries()) {
        const token = services.literal(row.token);
        const value = row.value === 'regex_id' ? services.regexId()
            : Number(services.global(4)) + layout[row.value];
        const at = rt + i * layout.rtOptSize;
        view().setBigUint64(at + layout.rt_token, BigInt(token), true);
        view().setBigUint64(at + layout.rt_value, BigInt(value), true);
    }
    return { critical, rt, cscbuf: Number(services.storage(1)) };
}

export function createVersionEnvironment(services, layout, state) {
    const widths = { pointerSize: 8, longSize: 8, intSize: 4, charSize: 1, charSigned: 1,
        booleanSize: 1, booleanSigned: 1, versinfo_size: 4, menu_requested_size: 1,
        hname_size: 8, converted_size: 1, nhf_fd_size: 4, nhf_mode_size: 4,
        nhf_fnidx_size: 4, nhf_structlevel_size: 1, nhf_fieldlevel_size: 1,
        config_SFCTOOL: 0, config_MINIMAL_FOR_RECOVER: 0, config_SF_INCLUDE_SUBSTRUCTS: 0,
        config_MICRO: 0, config_RUNTIME_PORT_ID: 0, config_EXTRA_SANITY_CHECKS: 0,
        config_VERS_GAME_NAME: 0, config_RUNTIME_PASTEBUF_SUPPORT: 1, config_DLB: 0,
        config_LIBNH: 0, config_VERSION_COMPATIBILITY: 0, config_AMIGA: 0 };
    for (const [key, expected] of Object.entries(widths))
        if (layout[key] !== expected) throw new Error('Review changed version ABI: ' + key);
    if (layout.NH_DEVEL_STATUS !== layout.NH_STATUS_RELEASED)
        throw new Error('Review changed version development configuration');
    const address = v => Number(v?.address ?? v ?? 0);
    const global = i => address(services.global(i));
    const view = () => new DataView(services.heap().buffer);
    const pointer = at => Number(view().getBigUint64(at, true));
    const int = v => typeof v === 'bigint' ? Number(BigInt.asIntN(32, v)) : v | 0;
    const char = v => int(v) << 24 >> 24;
    const ulong = v => BigInt.asUintN(64, BigInt(v));
    const scalar = (o, key, at, kind) => Crt.defineScalarValue(view,o,key,at,kind);
    const box = (at, kind) => { const o = { address: at }; scalar(o, 'value', () => at, kind); return o; };
    const indexed = (length, get, set, at) => new Proxy({ address: at }, {
        get(o, key) { if (key === 'length') return length;
            return typeof key === 'string' && /^-?\d+$/.test(key) ? get(Number(key)) : Reflect.get(o, key); },
        set(o, key, value) { if (set && typeof key === 'string' && /^-?\d+$/.test(key)) {
            set(Number(key), value); return true; } return Reflect.set(o, key, value); },
    });
    function versionInfo(value) {
        const at = address(value); if (!at) return 0;
        const o = { address: at };
        for (const field of ['incarnation', 'feature_set', 'entity_count'])
            scalar(o, field, () => at + layout['version_' + field], 'BigUint64');
        return o;
    }
    function nhfile(value) {
        const at = address(value); if (!at) return 0;
        const o = { address: at };
        for (const [field, kind] of [['fd', 'Int32'], ['mode', 'Int32'], ['fnidx', 'Int32'],
            ['structlevel', 'Int8'], ['fieldlevel', 'Int8']])
            scalar(o, field, () => at + layout['nhf_' + field], kind);
        return o;
    }
    const nomakedefs = {};
    for (const field of ['version_string', 'version_id', 'git_sha', 'git_branch', 'git_prefix', 'copyright_banner_c']) {
        if (layout['nom_' + field + '_size'] !== 8) throw new Error('Review changed nomakedefs pointer');
        Object.defineProperty(nomakedefs, field, { get() { return pointer(global(0) + layout['nom_' + field]); } });
    }
    for (const field of ['version_number', 'version_features', 'ignored_features', 'version_sanity1']) {
        if (layout['nom_' + field + '_size'] !== 8) throw new Error('Review changed nomakedefs ulong');
        scalar(nomakedefs, field, () => global(0) + layout['nom_' + field], 'BigUint64');
    }
    const flags = {}, iflags = {}, gh = {}, gl = {}, gc = {};
    scalar(flags, 'versinfo', () => global(1) + layout.versinfo, 'Uint32');
    scalar(iflags, 'menu_requested', () => global(2) + layout.menu_requested, 'Int8');
    Object.defineProperty(gh, 'hname', { get() { return pointer(global(3) + layout.hname); } });
    for (const field of ['lua_ver', 'lua_copyright'])
        Object.defineProperty(gl, field, { get() { return global(4) + layout[field]; } });
    scalar(gc, 'converted_savefile_loaded', () => global(5) + layout.converted, 'Int8');
    const critical_sizes = indexed(layout.criticalCount, i => {
        const at = state.critical + i * layout.criticalSize, o = { address: at };
        scalar(o, 'ucsize', () => at + layout.critical_ucsize, 'Uint8');
        Object.defineProperty(o, 'nm', { get() { return pointer(at + layout.critical_nm); } });
        return o;
    });
    const rt_opts = indexed(layout.rtOptCount, i => {
        const at = state.rt + i * layout.rtOptSize;
        return { address: at, get token() { return pointer(at + layout.rt_token); },
            get value() { return pointer(at + layout.rt_value); } };
    });
    const env = Object.assign(Object.create(services), layout, {
        address, int, char, boolean: char, size_t: ulong, ulong, versionInfo, nhfile,
        intPointer: value => address(value) ? box(address(value), 'Int32') : 0,
        intLocal: () => box(services.stackAlloc(4), 'Int32'),
        charLocal: () => box(services.stackAlloc(1), 'Int8'),
        versionLocal(zero) { const at = services.stackAlloc(layout.versionSize);
            if (zero) services.heap().fill(0, at, at + layout.versionSize);
            return versionInfo(at); },
        callLocal(fn, ...args) { const saved = services.stackSave();
            try { return fn(...args); } finally { services.stackRestore(saved); } },
        loadChar: at => view().getInt8(address(at)),
        storeChar: (at, value) => view().setInt8(address(at), Number(value)),
        nomakedefs, flags, iflags, gh, gl, gc, critical_sizes, rt_opts,
        cscbuf: indexed(layout.criticalCount, i => view().getUint8(state.cscbuf + i),
            (i, value) => view().setUint8(state.cscbuf + i, Number(value)), state.cscbuf),
        criticalSizeRef: i => state.critical + i * layout.criticalSize + layout.critical_ucsize,
        cscRef: i => state.cscbuf + i,
        strlen: value => BigInt(services.strlen(value)),
        FEATURE_NOTICE_VER: (major, minor, patch) => ulong((ulong(major) << 24n) | (ulong(minor) << 16n) | (ulong(patch) << 8n)),
    });
    for (const key of ['SFCTOOL_BIT', 'UTD_SKIP_SANITY1', 'UTD_QUIETLY', 'UTD_WITHOUT_WAITSYNCH_PERFILE',
        'UTD_CHECKSIZES', 'UTD_CHECKFIELDCOUNTS']) env[key] = BigInt(layout[key]);
    for (const key of ['COPYRIGHT_BANNER_A', 'COPYRIGHT_BANNER_B', 'COPYRIGHT_BANNER_D'])
        Object.defineProperty(env, key, { get() { return services.literal(layout.strings[key]); } });
    env.OPTIONS_USED = layout.strings.OPTIONS_USED;
    Object.defineProperties(env, {
        WIN_MESSAGE: { get() { return services.winMessage(); } },
        HEAP8: { get() { return new Int8Array(services.heap().buffer); } },
        HEAPU8: { get() { return services.heap(); } },
    });
    return env;
}
