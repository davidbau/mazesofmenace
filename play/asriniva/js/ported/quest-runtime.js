// Live C fields and header macros; quest decisions remain in quest.js.
export function createQuestEnvironment(services, layout) {
    if (layout.pointerSize !== 8 || layout.intSize !== 4 || layout.longSize !== 8
        || layout.charSize !== 1 || !layout.charSigned || layout.CHAR_BIT !== 8
        || layout.booleanSize !== 1 || !layout.booleanSigned
        || layout.coordxySize !== 2 || !layout.coordxySigned || layout.heroLevelSize !== 4
        || layout.heroAlignTypeSize !== 1 || layout.heroAlignRecordSize !== 4 || layout.heroAlignBaseSize !== 1
        || layout.propValueSize !== 8 || layout.leaderIdSize !== 4 || layout.questDungeonSize !== 2
        || layout.levelFieldSize !== 2 || layout.monMovingSize !== 1 || layout.debugSize !== 1
        || layout.mon_data_size !== 8 || layout.mon_m_id_size !== 4 || layout.mon_mstrategy_size !== 8
        || layout.monsterSoundSize !== 1 || layout.objectTypeSize !== 2
        || !Number.isSafeInteger(layout.STRAT_WAITMASK))
        throw new Error('Review changed quest ABI');
    const address = value => Number(value?.address ?? value ?? 0);
    const global = index => address(services.global(index));
    const view = () => new DataView(services.heap().buffer);
    const pointer = at => Number(view().getBigUint64(at, true));
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
    function level(value) {
        const at = address(value);
        return {
            address: at,
            get dnum() { return view().getInt16(at + layout.levelDnum, true); },
            set dnum(value) { view().setInt16(at + layout.levelDnum, value, true); },
            get dlevel() { return view().getInt16(at + layout.levelDlevel, true); },
            set dlevel(value) { view().setInt16(at + layout.levelDlevel, value, true); },
        };
    }
    function permonst(value) {
        const at = address(value);
        if (!at) return 0;
        return { address: at, get msound() { return view().getUint8(at + layout.monsterSound); } };
    }
    function monster(value) {
        const at = address(value);
        if (!at) return 0;
        const result = {
            address: at,
            get data() { return permonst(pointer(at + layout.mon_data)); },
            get m_id() { return view().getUint32(at + layout.mon_m_id, true); },
            get mstrategy() { return view().getBigUint64(at + layout.mon_mstrategy, true); },
            set mstrategy(value) { view().setBigUint64(at + layout.mon_mstrategy, BigInt.asUintN(64, BigInt(value)), true); },
        };
        for (const [index, field] of ['mpeaceful', 'msleeping', 'mfrozen', 'mcanmove'].entries())
            Object.defineProperty(result, field, {
                get() { return services.monsterBit(at, index); },
                set(value) { services.setMonsterBit(at, index, Number(value)); },
            });
        return result;
    }
    function object(value) {
        const at = address(value);
        if (!at) return 0;
        return {
            address: at,
            get nobj() { return object(pointer(at + layout.objectNext)); },
            get otyp() { return view().getInt16(at + layout.objectType, true); },
        };
    }
    function trap(value) {
        const at = address(value);
        if (!at) return 0;
        return {
            address: at,
            get ntrap() { return trap(pointer(at + layout.trapNext)); },
            get ttyp() { return services.trapType(at); },
        };
    }
    function branch(value) {
        const at = address(value);
        if (!at) return 0;
        return { address: at, end1: level(at + layout.branchEnd1), end2: level(at + layout.branchEnd2) };
    }
    const Qstat = {
        get leader_m_id() { return view().getUint32(global(1) + layout.leaderId, true); },
        set leader_m_id(value) { view().setUint32(global(1) + layout.leaderId, value, true); },
    };
    for (const [index, field] of ['first_start', 'not_ready', 'killed_nemesis', 'first_locate', 'made_goal',
        'killed_leader', 'touched_artifact', 'got_quest', 'got_thanks', 'pissed_off', 'met_nemesis',
        'cheater', 'met_leader', 'in_battle'].entries())
        Object.defineProperty(Qstat, field, {
            get() { return services.questBit(index); },
            set(value) { services.setQuestBit(index, Number(value)); },
        });
    const heroBits = indices => {
        const result = {};
        for (const [field, index] of Object.entries(indices))
            Object.defineProperty(result, field, {
                get() { return services.heroBit(index); },
                set(value) { services.setHeroBit(index, Number(value)); },
            });
        return result;
    };
    const u = {
        get ux() { return view().getInt16(global(0) + layout.heroUx, true); },
        get uy() { return view().getInt16(global(0) + layout.heroUy, true); },
        get ulevel() { return view().getInt32(global(0) + layout.heroLevel, true); },
        get uz() { return level(global(0) + layout.heroUz); },
        get uz0() { return level(global(0) + layout.heroUz0); },
        uevent: heroBits({ qcompleted: 0, qexpelled: 1 }),
        uhave: heroBits({ amulet: 2, questart: 3 }),
        ualign: {
            get type() { return view().getInt8(global(0) + layout.heroAlignType); },
            get record() { return view().getInt32(global(0) + layout.heroAlignRecord, true); },
            set record(value) { view().setInt32(global(0) + layout.heroAlignRecord, int(value), true); },
        },
        ualignbase: indexed(layout.heroAlignBaseCount,
            index => view().getInt8(global(0) + layout.heroAlignBase + index),
            (index, value) => view().setInt8(global(0) + layout.heroAlignBase + index, value)),
    };
    const qlevel = field => level(global(2) + layout[field]);
    const assigned = lev => lev.dlevel !== 0 || lev.dnum !== 0;
    const property = field => view().getBigInt64(global(0) + layout.heroProps + layout.DEAF * layout.propSize + layout[field], true);
    return {
        ...services,
        ...layout,
        STRAT_WAITMASK: BigInt(layout.STRAT_WAITMASK),
        LL_ACHIEVE: BigInt(layout.LL_ACHIEVE),
        get HEAP8() { return new Int8Array(services.heap().buffer); },
        get HEAPU8() { return services.heap(); },
        int,
        boolean(value) { return int(value) << 24 >> 24; },
        coordxy(value) { return int(value) << 16 >> 16; },
        monster,
        object,
        permonst,
        level,
        branch,
        trap,
        Qstat,
        u,
        get wizard() { return view().getInt8(global(4) + layout.debug); },
        get Deaf() { return property('propIntrinsic') !== 0n || property('propExtrinsic') !== 0n || !!services.heroBit(4); },
        get Not_firsttime() { return services.on_level(u.uz0, u.uz); },
        get quest_dnum() { return view().getInt16(global(2) + layout.questDungeon, true); },
        get qstart_level() { return qlevel('startLevel'); },
        Is_qstart(lev) { const target = qlevel('startLevel'); return assigned(target) && !!services.on_level(lev, target); },
        Is_qlocate(lev) { const target = qlevel('locateLevel'); return assigned(target) && !!services.on_level(lev, target); },
        Is_nemesis(lev) { const target = qlevel('nemesisLevel'); return assigned(target) && !!services.on_level(lev, target); },
        svc: { context: {
            get mon_moving() { return view().getInt8(global(3) + layout.monMoving); },
            set mon_moving(value) { view().setInt8(global(3) + layout.monMoving, int(value)); },
        } },
        gi: { get invent() { return object(pointer(global(5) + layout.inventory)); } },
        gf: { get ftrap() { return trap(pointer(global(6) + layout.traps)); } },
        mons: indexed(layout.NUMMONS + 1, index => permonst(global(7) + index * layout.permonstSize)),
        helpless(mon) { return !!mon.msleeping || !mon.mcanmove; },
        dungeon_branch(...args) { return branch(services.dungeon_branch(...args)); },
        find_quest_artifact(...args) { return object(services.find_quest_artifact(...args)); },
        carrying(...args) { return object(services.carrying(...args)); },
    };
}
