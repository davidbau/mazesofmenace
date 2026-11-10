// JS owns catalogue source rows and static attack data. Only the original
// public memcpy initializes live mons; startup initializes the attack tables.
export function createMonstState(services, layout, namespace) {
    const widths = { pointerSize: 8, longSize: 8, intSize: 4, charSize: 1, charSigned: 1,
        CHAR_BIT: 8, NUM_MGENDERS: 3, NATTK: 6, pmnames_size: 24, pmidx_size: 4,
        mlet_size: 1, mlevel_size: 1, mmove_size: 1, ac_size: 1, mr_size: 1,
        maligntyp_size: 1, geno_size: 2, mattk_size: 24, cwt_size: 4,
        cnutrit_size: 2, msound_size: 1, msize_size: 1, mresists_size: 1,
        mconveys_size: 1, mflags1_size: 8, mflags2_size: 8, mflags3_size: 2,
        difficulty_size: 1, mcolor_size: 1, aatyp_size: 1, adtyp_size: 1,
        damn_size: 1, damd_size: 1 };
    for (const [key, width] of Object.entries(widths))
        if (layout[key] !== width) throw new Error('Review changed monst ABI: ' + key);
    const address = value => Number(value?.address ?? value ?? 0);
    const source = address(services.storage(1));
    const yes = address(services.storage(2)), no = address(services.storage(3));
    const { mons_init, c_sa_yes, c_sa_no } = namespace;
    if (mons_init.length !== layout.rowCount || layout.rowCount !== layout.NUMMONS + 1
        || layout.sizeof_mons !== layout.rowCount * layout.monsterSize
        || layout.sizeof_attacks !== layout.NATTK * layout.attackSize)
        throw new Error('Review changed monster catalogue dimensions');
    services.heap().fill(0, source, source + layout.sizeof_mons);
    services.heap().fill(0, yes, yes + layout.sizeof_attacks);
    services.heap().fill(0, no, no + layout.sizeof_attacks);
    const view = () => new DataView(services.heap().buffer);
    function attacks(destination, data) {
        if (data.length !== layout.NATTK) throw new Error('Review changed monster attacks');
        for (let index = 0; index < layout.NATTK; index++) {
            if (data[index].length !== 4) throw new Error('Review changed attack fields');
            for (const [field, key] of ['aatyp', 'adtyp', 'damn', 'damd'].entries()) {
                const value = data[index][field];
                if (!Number.isSafeInteger(value)) throw new Error('Review monster attack: ' + key);
                view().setUint8(destination + index * layout.attackSize + layout[key], value);
            }
        }
    }
    attacks(yes, c_sa_yes);
    attacks(no, c_sa_no);
    for (let row = 0; row < layout.rowCount; row++) {
        const monster = mons_init[row], base = source + row * layout.monsterSize;
        if (monster.pmnames.length !== layout.NUM_MGENDERS) throw new Error('Review monster gender names');
        for (let gender = 0; gender < layout.NUM_MGENDERS; gender++) {
            const name = monster.pmnames[gender];
            const pointer = name === null ? 0 : address(services.literal(name));
            view().setBigUint64(base + layout.pmnames + gender * layout.pointerSize, BigInt(pointer), true);
        }
        for (const [field, kind] of [['pmidx', 'Int32'], ['mlet', 'Int8'], ['mlevel', 'Int8'],
            ['mmove', 'Int8'], ['ac', 'Int8'], ['mr', 'Int8'], ['maligntyp', 'Int8'],
            ['geno', 'Uint16'], ['cwt', 'Uint32'], ['cnutrit', 'Uint16'], ['msound', 'Uint8'],
            ['msize', 'Uint8'], ['mresists', 'Uint8'], ['mconveys', 'Uint8'],
            ['mflags3', 'Uint16'], ['difficulty', 'Uint8'], ['mcolor', 'Uint8']]) {
            if (!Number.isSafeInteger(monster[field])) throw new Error('Review monster field: ' + field);
            view()['set' + kind](base + layout[field], monster[field], true);
        }
        for (const field of ['mflags1', 'mflags2']) {
            if (typeof monster[field] !== 'bigint') throw new Error('Review monster unsigned long: ' + field);
            view().setBigUint64(base + layout[field], BigInt.asUintN(64, monster[field]), true);
        }
        attacks(base + layout.mattk, monster.mattk);
    }
    return { source, mons_init, yes, no };
}

export function createMonstEnvironment(services, layout, state) {
    return { ...services, ...layout,
        get mons() { return Number(services.storage(0)); },
        memcpy(destination, source, size) {
            if (source !== state.mons_init) throw new Error('Unexpected monster initializer source');
            return services.memcpy(destination, state.source, size);
        },
    };
}
