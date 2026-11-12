// Per-module C static storage, kept outside the translated functions.
export function createRndState(services) {
    const rnglist = [services.coreFunction(), services.displayFunction()].map(fn => ({
        fn: Number(fn),
        init: 0,
        rng_state: {
            n: 0,
            r: new BigUint64Array(256),
            m: new BigUint64Array(256),
            a: 0n,
            b: 0n,
            c: 0n,
        },
    }));
    return {
        rng_logfile: 0,
        rng_log_disp: 0,
        rng_call_count: 0,
        rng_caller_file: 0,
        rng_caller_line: 0,
        rng_caller_func: 0,
        rnglist,
    };
}

export function createRndEnvironment(services, layout, state) {
    if (layout.ULONG_SIZE !== 8 || layout.intSize !== 4 || layout.pointerSize !== 8
        || !layout.USE_ISAAC64 || layout.ISAAC64_SZ !== 256)
        throw new Error('Review changed rnd ABI or generator configuration');
    return {
        ...services,
        ...layout,
        rndState: state,
        get HEAP8() { return services.signedHeap(); },
        get HEAPU8() { return services.heap(); },
        get Luck() { return services.luck(); },
        u: { get ulevel() { return services.level(); } },
        get has_strong_rngseed() { return services.strongSeed(); },
        intArray(pointer) {
            const address = Number(pointer);
            return new Proxy({ address }, {
                get(target, key) {
                    if (typeof key === 'string' && /^-?\d+$/.test(key))
                        return new DataView(services.heap().buffer)
                            .getInt32(address + Number(key) * layout.intSize, true);
                    return Reflect.get(target, key);
                },
                set(target, key, value) {
                    if (typeof key === 'string' && /^-?\d+$/.test(key)) {
                        new DataView(services.heap().buffer)
                            .setInt32(address + Number(key) * layout.intSize, value, true);
                        return true;
                    }
                    return Reflect.set(target, key, value);
                },
            });
        },
    };
}
