// Live experience/energy C data and header macros, outside the translated TU.
export function createExperEnvironment(services, layout) {
    if (layout.pointerSize !== 8 || layout.intSize !== 4 || layout.longSize !== 8
        || layout.charSize !== 1 || !layout.charSigned || layout.CHAR_BIT !== 8
        || layout.booleanSize !== 1 || !layout.booleanSigned
        || layout.incrementSize !== 2 || layout.incrementCount !== layout.MAXULEV
        || layout.propValueSize !== 8 || layout.roleMonsterSize !== 2 || layout.roleXlevSize !== 2
        || layout.advanceFieldSize !== 2 || layout.monsterDataSize !== 8 || layout.monsterLevelSize !== 1
        || layout.permonstMoveSize !== 1 || layout.permonstLetterSize !== 1
        || layout.permonstFlagsSize !== 8 || layout.attackFieldSize !== 1
        || layout.flagFieldSize !== 1 || layout.displayBotlSize !== 1 || layout.killerFormatSize !== 4
        || layout.ASSERT_ENABLED !== 1 || layout.MAIL_STRUCTURES !== 1 || layout.SCORE_ON_BOTL !== 0
        || !Number.isSafeInteger(layout.M1_AMPHIBIOUS) || !Number.isSafeInteger(layout.M2_NASTY))
        throw new Error('Review changed exper ABI');
    const integerFields = ['ulevel', 'ulevelmax', 'ulevelpeak', 'uhp', 'uhpmax', 'uhppeak',
        'uen', 'uenmax', 'uenpeak', 'mh', 'mhmax', 'umonnum', 'umonster'];
    for (const field of integerFields)
        if (layout['hero_' + field + '_size'] !== 4) throw new Error('Review changed experience int field');
    for (const field of ['uexp', 'urexp'])
        if (layout['hero_' + field + '_size'] !== 8) throw new Error('Review changed experience long field');
    const address = value => Number(value?.address ?? value ?? 0);
    const global = index => address(services.global(index));
    const view = () => new DataView(services.heap().buffer);
    const pointer = at => Number(view().getBigUint64(at, true));
    const long = value => BigInt.asIntN(64, typeof value === 'bigint' ? value : BigInt(Math.trunc(value)));
    const int = value => typeof value === 'bigint' ? Number(BigInt.asIntN(32, value)) : value | 0;
    const indexed = (length, getter, setter) => new Proxy({}, {
        get(target, key) {
            if (key === 'length') return length;
            if (typeof key === 'string' && /^\d+$/.test(key)) return getter(Number(key));
            return Reflect.get(target, key);
        },
        set(target, key, value) {
            if (setter && typeof key === 'string' && /^\d+$/.test(key)) {
                setter(Number(key), value);
                return true;
            }
            return Reflect.set(target, key, value);
        },
    });
    function permonst(value) {
        const at = address(value);
        if (!at) return 0;
        return {
            address: at,
            get mmove() { return view().getInt8(at + layout.permonstMove); },
            get mlet() { return view().getInt8(at + layout.permonstLetter); },
            get mflags1() { return view().getBigUint64(at + layout.permonstFlags1, true); },
            get mflags2() { return view().getBigUint64(at + layout.permonstFlags2, true); },
            mattk: indexed(layout.NATTK, index => {
                const attack = at + layout.permonstAttacks + index * layout.attackSize;
                return {
                    get aatyp() { return view().getUint8(attack + layout.attackType); },
                    get adtyp() { return view().getUint8(attack + layout.attackDamageType); },
                    get damn() { return view().getUint8(attack + layout.attackDice); },
                    get damd() { return view().getUint8(attack + layout.attackSides); },
                };
            }),
        };
    }
    function monster(value) {
        const at = address(value);
        if (!at) return 0;
        const result = {
            address: at,
            get data() { return permonst(pointer(at + layout.monsterData)); },
            get m_lev() { return view().getUint8(at + layout.monsterLevel); },
        };
        for (const [index, field] of ['mrevived', 'mcloned'].entries())
            Object.defineProperty(result, field, {
                get() { return services.monsterBit(at, index); },
                set(value) { services.setMonsterBit(at, index, value); },
            });
        return result;
    }
    const u = {};
    for (const field of integerFields)
        Object.defineProperty(u, field, {
            get() { return view().getInt32(global(0) + layout['hero_' + field], true); },
            set(value) { view().setInt32(global(0) + layout['hero_' + field], int(value), true); },
        });
    for (const field of ['uexp', 'urexp'])
        Object.defineProperty(u, field, {
            get() { return view().getBigInt64(global(0) + layout['hero_' + field], true); },
            set(value) { view().setBigInt64(global(0) + layout['hero_' + field], long(value), true); },
        });
    for (const field of ['uhpinc', 'ueninc'])
        u[field] = indexed(layout.incrementCount,
            index => view().getInt16(global(0) + layout['hero_' + field] + index * layout.incrementSize, true),
            (index, value) => view().setInt16(global(0) + layout['hero_' + field]
                + index * layout.incrementSize, int(value), true));
    function advance(offset) {
        const result = {};
        for (const field of ['infix', 'inrnd', 'lofix', 'lornd', 'hifix', 'hirnd'])
            Object.defineProperty(result, field, {
                get() { return view().getInt16(global(1) + offset + layout['advance_' + field], true); },
            });
        return result;
    }
    const role = {
        get mnum() { return view().getInt16(global(1) + layout.roleMonster, true); },
        get xlev() { return view().getInt16(global(1) + layout.roleXlev, true); },
        enadv: advance(layout.roleEnergy),
    };
    return {
        ...services,
        ...layout,
        LONG_MAX: BigInt(layout.LONG_MAX),
        LL_MINORAC: BigInt(layout.LL_MINORAC),
        get HEAP8() { return new Int8Array(services.heap().buffer); },
        get HEAPU8() { return services.heap(); },
        long,
        int,
        char(value) { return int(value) << 24 >> 24; },
        xint16(value) { return int(value) << 16 >> 16; },
        monster,
        permonst,
        u,
        gu: { urole: role, urace: { enadv: advance(layout.raceEnergy) } },
        get Role_switch() { return role.mnum; },
        Role_if(which) { return role.mnum === which; },
        get Upolyd() { return u.umonnum !== u.umonster; },
        ACURR(which) { return services.acurr(which); },
        gy: { get youmonst() { return monster(global(2) + layout.youmonst); } },
        mons: indexed(layout.NUMMONS + 1, index => permonst(global(6) + index * layout.permonstSize)),
        get Amphibious() {
            const prop = global(0) + layout.heroProps + layout.MAGICAL_BREATHING * layout.propSize;
            return view().getBigInt64(prop + layout.propIntrinsic, true) !== 0n
                || view().getBigInt64(prop + layout.propExtrinsic, true) !== 0n
                || (monster(global(2) + layout.youmonst).data.mflags1 & BigInt(layout.M1_AMPHIBIOUS)) !== 0n;
        },
        extra_nasty(ptr) { return (ptr.mflags2 & BigInt(layout.M2_NASTY)) !== 0n; },
        flags: {
            get showexp() { return view().getInt8(global(3) + layout.flagShowexp); },
            set showexp(value) { view().setInt8(global(3) + layout.flagShowexp, value); },
            get showscore() { return view().getInt8(global(3) + layout.flagShowscore); },
            set showscore(value) { view().setInt8(global(3) + layout.flagShowscore, value); },
            get beginner() { return view().getInt8(global(3) + layout.flagBeginner); },
            set beginner(value) { view().setInt8(global(3) + layout.flagBeginner, value); },
        },
        disp: {
            get botl() { return view().getInt8(global(4) + layout.displayBotl); },
            set botl(value) { view().setInt8(global(4) + layout.displayBotl, value); },
        },
        svk: { killer: {
            get format() { return view().getInt32(global(5) + layout.killerFormat, true); },
            set format(value) { view().setInt32(global(5) + layout.killerFormat, value, true); },
            get name() { return global(5) + layout.killerName; },
        } },
    };
}
