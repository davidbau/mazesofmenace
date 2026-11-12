import * as CAdapter from '../../c-runtime/adapter-factories.js';
// Live C data and header macro expansions for the translated player monsters.
export function createMplayerEnvironment(services, layout) {
    if (layout.pointerSize !== 8 || layout.intSize !== 4 || layout.longSize !== 8
        || layout.shortSize !== 2 || layout.charSize !== 1 || !layout.charSigned
        || layout.CHAR_BIT !== 8 || layout.booleanSize !== 1 || !layout.booleanSigned
        || layout.coordxySize !== 2 || !layout.coordxySigned
        || layout.permonstIndexSize !== 4 || layout.permonstFlags2Size !== 8
        || layout.levelFieldSize !== 2 || layout.roleMonsterSize !== 2
        || layout.objectSkillSize !== 1 || !Number.isSafeInteger(layout.M2_FEMALE))
        throw new Error('Review changed mplayer ABI');
    for (const field of ['nmon', 'data', 'mextra'])
        if (layout['mon_' + field + '_size'] !== 8) throw new Error('Review changed monster pointer ABI');
    if (layout.mon_m_lev_size !== 1 || layout.mon_mhp_size !== 4 || layout.mon_mhpmax_size !== 4
        || layout.obj_otyp_size !== 2 || layout.obj_oartifact_size !== 1 || layout.obj_oclass_size !== 1
        || layout.obj_quan_size !== 8 || layout.obj_owt_size !== 4 || layout.obj_spe_size !== 1)
        throw new Error('Review changed mplayer numeric field ABI');
    const address = value => Number(value?.address ?? value ?? 0);
    const global = index => address(services.global(index));
    const view = () => CAdapter.currentDataView(services);
    const pointer = at => CAdapter.readPointerNumber(view,at);
    const indexed = (length, getter) => new Proxy({}, {
        get(target, key) {
            if (key === 'length') return length;
            if (typeof key === 'string' && /^\d+$/.test(key)) return getter(Number(key));
            return Reflect.get(target, key);
        },
    });
    function permonst(value) {
        const at = address(value);
        if (!at) return 0;
        return {
            address: at,
            get pmidx() { return view().getInt32(at + layout.permonstIndex, true); },
            get mflags2() { return view().getBigUint64(at + layout.permonstFlags2, true); },
        };
    }
    function monster(value) {
        const at = address(value);
        if (!at) return 0;
        const result = {
            address: at,
            get nmon() { return monster(pointer(at + layout.mon_nmon)); },
            get data() { return permonst(pointer(at + layout.mon_data)); },
            set data(value) { view().setBigUint64(at + layout.mon_data, BigInt(address(value)), true); },
            get m_lev() { return view().getUint8(at + layout.mon_m_lev); },
            set m_lev(value) { view().setUint8(at + layout.mon_m_lev, value); },
            get mhp() { return view().getInt32(at + layout.mon_mhp, true); },
            set mhp(value) { view().setInt32(at + layout.mon_mhp, value, true); },
            get mhpmax() { return view().getInt32(at + layout.mon_mhpmax, true); },
            set mhpmax(value) { view().setInt32(at + layout.mon_mhpmax, value, true); },
        };
        for (const [index, field] of ['female', 'mpeaceful'].entries())
            Object.defineProperty(result, field, {
                get() { return services.monsterBit(at, index); },
                set(value) { services.setMonsterBit(at, index, value); },
            });
        return result;
    }
    function object(value) {
        const at = address(value);
        if (!at) return 0;
        const result = {
            address: at,
            get otyp() { return view().getInt16(at + layout.obj_otyp, true); },
            get oartifact() { return view().getInt8(at + layout.obj_oartifact); },
            get oclass() { return view().getInt8(at + layout.obj_oclass); },
            get quan() { return view().getBigInt64(at + layout.obj_quan, true); },
            set quan(value) { view().setBigInt64(at + layout.obj_quan, BigInt.asIntN(64, BigInt(value)), true); },
            get owt() { return view().getUint32(at + layout.obj_owt, true); },
            set owt(value) { view().setUint32(at + layout.obj_owt, value, true); },
            get spe() { return view().getInt8(at + layout.obj_spe); },
            set spe(value) { view().setInt8(at + layout.obj_spe, value); },
        };
        for (const [index, field] of ['oeroded', 'oeroded2', 'greased', 'oerodeproof'].entries())
            Object.defineProperty(result, field, {
                get() { return services.objectBit(at, index); },
                set(value) { services.setObjectBit(at, index, value); },
            });
        return result;
    }
    function objectClass(index) {
        const at = global(1) + index * layout.objectClassSize;
        return {
            address: at,
            get oc_merge() { return services.objectClassBit(at); },
            get oc_skill() { return view().getInt8(at + layout.objectSkill); },
        };
    }
    function level(at) {
        return {
            address: at,
            get dnum() { return view().getInt16(at + layout.levelDnum, true); },
            get dlevel() { return view().getInt16(at + layout.levelDlevel, true); },
        };
    }
    const atMonster = (x, y) => pointer(global(2) + layout.monsters
        + (x * layout.ROWNO + y) * layout.pointerSize);
    return {
        ...services,
        ...layout,
        NO_MM_FLAGS: BigInt(layout.NO_MM_FLAGS),
        MM_NOMSG: BigInt(layout.MM_NOMSG),
        get HEAP8() {return CAdapter.currentInt8View(services);},
        get HEAPU8() { return services.heap(); },
        permonst,
        monster,
        object,
        mons: indexed(layout.NUMMONS + 1, index => permonst(global(0) + index * layout.permonstSize)),
        objects: indexed(layout.NUM_OBJECTS + 1, objectClass),
        get fmon() { return monster(pointer(global(2) + layout.monlist)); },
        u: { get uz() { return level(global(3) + layout.heroLevel); } },
        gu: { urole: { get mnum() { return view().getInt16(global(4) + layout.roleMonster, true); } } },
        cg: { get zeromonst() { return monster(global(5) + layout.zeroMonster); } },
        monsterLocal(source) {
            const at = address(services.stackAlloc(layout.monsterSize));
            const from = address(source);
            services.heap().copyWithin(at, from, from + layout.monsterSize);
            return monster(at);
        },
        short(value) { return value << 16 >> 16; },
        coordxy(value) { return value << 16 >> 16; },
        monsndx(ptr) { return ptr.pmidx; },
        is_mplayer(ptr) {
            const at = address(ptr), base = global(0);
            return at >= base + layout.PM_ARCHEOLOGIST * layout.permonstSize
                && at <= base + layout.PM_WIZARD * layout.permonstSize;
        },
        is_female(ptr) { return (ptr.mflags2 & BigInt(layout.M2_FEMALE)) !== 0n; },
        has_mgivenname(mon) {
            const extra = pointer(mon.address + layout.mon_mextra);
            return extra !== 0 && pointer(extra + layout.givenName) !== 0;
        },
        MGIVENNAME(mon) { return pointer(pointer(mon.address + layout.mon_mextra) + layout.givenName); },
        In_endgame(lev) { return lev.dnum === level(global(6) + layout.astralLevel).dnum; },
        MON_AT(x, y) { return atMonster(x, y) !== 0; },
        m_at(x, y) { return monster(atMonster(x, y)); },
        is_spear(obj) { return obj.oclass === layout.WEAPON_CLASS && objectClass(obj.otyp).oc_skill === layout.P_SPEAR; },
        makemon(...args) { return monster(services.makemon(...args)); },
        christen_monst(...args) { return monster(services.christen_monst(...args)); },
        mksobj(...args) { return object(services.mksobj(...args)); },
        mkobj(...args) { return object(services.mkobj(...args)); },
        mk_artifact(...args) { return object(services.mk_artifact(...args)); },
    };
}
