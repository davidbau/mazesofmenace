// C layouts, addressable locals and header macros. File selection, parsing
// decisions, retries and both caches remain in the translated rumors.js TU.
export function createRumorsState() {
    return { CapMonstCnt: 0, CapBogonCnt: 0, CapMonSiz: 0, CapMons: 0 };
}

export function createRumorsEnvironment(services, layout, state) {
    const widths = { pointerSize: 8, longSize: 8, intSize: 4, uintSize: 4,
        charSize: 1, charSigned: 1, booleanSize: 1, booleanSigned: 1, CHAR_BIT: 8,
        u_ulevel_size: 4, mon_data_size: 8, pm_pmnames_size: 24, pm_geno_size: 2,
        prop_intrinsic_size: 8, prop_extrinsic_size: 8, prop_blocked_size: 8,
        nhfile_mode_size: 4, inventory_size: 8, inMklev_size: 1,
        true_rumor_size_size: 8, true_rumor_start_size: 8, true_rumor_end_size: 8,
        false_rumor_size_size: 8, false_rumor_start_size: 8, false_rumor_end_size: 8,
        oracle_cnt_size: 4, oracle_loc_size: 8, oracle_flg_size: 4, multi_size: 8,
        botl_size: 1, worthSaving_size: 4, debugFuzzer_size: 1, wizard_size: 1,
        DEBUG: 1, DLB: 0, SFCTOOL: 0, SND_LIB_INTEGRATED: 0, ASSERT_ENABLED: 1 };
    for (const [key, width] of Object.entries(widths))
        if (layout[key] !== width) throw new Error('Review changed rumors ABI: ' + key);
    const address = value => Number(value?.address ?? value ?? 0);
    const global = index => address(services.global(index));
    const view = () => new DataView(services.heap().buffer);
    const pointer = at => Number(view().getBigUint64(at, true));
    const int = value => typeof value === 'bigint' ? Number(BigInt.asIntN(32, value)) : value | 0;
    const uint = value => typeof value === 'bigint' ? Number(BigInt.asUintN(32, value)) : value >>> 0;
    const long = value => BigInt.asIntN(64, BigInt(value));
    const ulong = value => BigInt.asUintN(64, BigInt(value));
    const scalar = (target, key, at, kind) => Object.defineProperty(target, key, {
        get() { return view()['get' + kind](at(), true); },
        set(v) { view()['set' + kind](at(), kind.includes('Big') ? BigInt(v) : Number(v), true); },
    });
    const indexed = (at, size, get, set) => new Proxy({ address: at }, {
        get(target, key) { return typeof key === 'string' && /^-?\d+$/.test(key)
            ? get(at + Number(key) * size) : Reflect.get(target, key); },
        set(target, key, value) { if (typeof key === 'string' && /^-?\d+$/.test(key)) {
            set(at + Number(key) * size, value); return true; } return Reflect.set(target, key, value); },
    });
    const pointerArray = value => { const at = address(value); return at ? indexed(at, layout.pointerSize,
        pointer, (cell, v) => view().setBigUint64(cell, BigInt(address(v)), true)) : 0; };
    const ulongArray = value => { const at = address(value); return at ? indexed(at, layout.longSize,
        cell => view().getBigUint64(cell, true), (cell, v) => view().setBigUint64(cell, ulong(v), true)) : 0; };
    function intPointer(value) { const at = address(value), result = { address: at };
        scalar(result, 'value', () => at, 'Int32'); return result; }
    function permonst(value) { const at = address(value); if (!at) return 0;
        const result = { address: at, pmnames: pointerArray(at + layout.pm_pmnames) };
        scalar(result, 'geno', () => at + layout.pm_geno, 'Uint16'); return result; }
    function monster(value) { const at = address(value); if (!at) return 0;
        return { address: at, get data() { return permonst(pointer(at + layout.mon_data)); },
            get mpeaceful() { return services.monsterBit(at, 0); } }; }
    const gt = {}, gf = {}, svo = {}, go = {}, u = { uevent: {} };
    for (const [object, index, fields] of [[gt, 2, ['true_rumor_size', 'true_rumor_start', 'true_rumor_end']],
        [gf, 3, ['false_rumor_size', 'false_rumor_start', 'false_rumor_end']]]) {
        Object.defineProperty(object, 'address', { get() { return global(index); } });
        for (const field of fields) scalar(object, field, () => global(index) + layout[field], field.endsWith('_start') ? 'BigUint64' : 'BigInt64');
    }
    Object.defineProperty(svo, 'address', { get() { return global(4); } });
    scalar(svo, 'oracle_cnt', () => global(4) + layout.oracle_cnt, 'Uint32');
    Object.defineProperty(svo, 'oracle_loc', { get() { return ulongArray(pointer(global(4) + layout.oracle_loc)); },
        set(v) { view().setBigUint64(global(4) + layout.oracle_loc, BigInt(address(v)), true); } });
    scalar(go, 'oracle_flg', () => global(5) + layout.oracle_flg, 'Int32');
    scalar(u, 'ulevel', () => global(0) + layout.u_ulevel, 'Int32');
    for (const [index, field] of ['major_oracle', 'minor_oracle'].entries())
        Object.defineProperty(u.uevent, field, { get() { return services.heroBit(index); },
            set(v) { services.setHeroBit(index, Number(v)); } });
    const env = { ...services, ...layout, ...layout.strings, int, uint, long, ulong,
        boolean(value) { return (int(value) << 24) >> 24; }, gt, gf, svo, go, u,
        get HEAP8() { return new Int8Array(services.heap().buffer); }, get HEAPU8() { return services.heap(); },
        object(value) { const at = address(value); return at ? { address: at } : 0; },
        monster, permonst, ulongArray, winPointer: intPointer, intPointer,
        ref(group, field) { return address(group) + layout[field]; },
        ulongRef(array, index) { return address(array) + index * layout.longSize; },
        intLocal() { return intPointer(services.stackAlloc(layout.intSize)); },
        winLocal() { return intPointer(services.stackAlloc(layout.intSize)); },
        ulongLocal() { const at = address(services.stackAlloc(layout.longSize)), result = { address: at };
            scalar(result, 'value', () => at, 'BigUint64'); return result; },
        callLocal(fn, ...args) { const saved = services.stackSave();
            try { return fn(...args); } finally { services.stackRestore(saved); } },
        rng(value) { return value; },
        callRng(fn, bound) {
            const token = fn === env.rn2 ? services.rngPointer() : fn;
            return services.callRng(BigInt(token), int(bound));
        },
        loadChar(at) { return view().getInt8(address(at)); },
        storeChar(at, value) { view().setInt8(address(at), Number(value)); },
        get WIN_MESSAGE() { return services.winMessage(); },
        get bogon_codes() { return address(services.bogonCodes()); },
        get wizard() { return view().getInt8(global(11) + layout.wizard); },
        gi: { get invent() { return env.object(pointer(global(1) + layout.inventory)); },
            get in_mklev() { return view().getInt8(global(1) + layout.inMklev); } },
        gm: {}, disp: {}, program_state: {}, iflags: {},
        mons: new Proxy({}, { get(target, key) { return typeof key === 'string' && /^-?\d+$/.test(key)
            ? permonst(global(10) + Number(key) * layout.permonstSize) : Reflect.get(target, key); } }),
        get Blind() { const base = global(0) + layout.u_uprops + layout.BLINDED * layout.propSize;
            return (view().getBigInt64(base + layout.prop_intrinsic, true) !== 0n || view().getBigInt64(base + layout.prop_extrinsic, true) !== 0n)
                && view().getBigInt64(base + layout.prop_blocked, true) === 0n; },
        update_file(file) { return view().getInt32(address(file) + layout.nhfile_mode, true) & (layout.COUNTING | layout.WRITING); },
        release_data(file) { return view().getInt32(address(file) + layout.nhfile_mode, true) & layout.FREEING; },
        pline1(text) { return services.pline('%s', text); },
        verbalize1(text) { return services.verbalize('%s', text); },
    };
    scalar(env.gm, 'multi', () => global(6) + layout.multi, 'BigInt64');
    scalar(env.disp, 'botl', () => global(7) + layout.botl, 'Int8');
    scalar(env.program_state, 'something_worth_saving', () => global(8) + layout.worthSaving, 'Int32');
    scalar(env.iflags, 'debug_fuzzer', () => global(9) + layout.debugFuzzer, 'Int8');
    for (const field of ['CapMonstCnt', 'CapBogonCnt', 'CapMonSiz']) Object.defineProperty(env, field, {
        get() { return state[field]; }, set(v) { state[field] = uint(v); },
    });
    Object.defineProperty(env, 'CapMons', { get() { return pointerArray(state.CapMons); },
        set(v) { state.CapMons = address(v); } });
    return env;
}
