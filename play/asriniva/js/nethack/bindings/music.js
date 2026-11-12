import * as CAdapter from '../../c-runtime/adapter-factories.js';
import * as Crt from '../../c-runtime/adapter-memory.js';
// Live native storage and header expansions; instrument effects remain in music.js.
export function createMusicState(services, layout, namespace) {
    const my_goto_song = Number(services.storage(0));
    if (namespace.my_goto_song_initial.length !== 2) throw new Error('Review changed fallback song');
    services.heap().set(namespace.my_goto_song_initial, my_goto_song);
    return { my_goto_song, improvisation: my_goto_song };
}

export function createMusicEnvironment(services, layout, state) {
    const widths = { pointerSize: 8, longSize: 8, intSize: 4, charSize: 1, charSigned: 1,
        booleanSize: 1, booleanSigned: 1, coordxySize: 2, coordxySigned: 1, CHAR_BIT: 8,
        u_ux_size: 2, u_uy_size: 2, u_ulevel_size: 4, u_dx_size: 4, u_dy_size: 4,
        u_dz_size: 4, u_utrap_size: 4, u_utraptype_size: 4, u_umonnum_size: 4,
        u_umonster_size: 4, u_ustuck_size: 8, u_usteed_size: 8,
        mon_nmon_size: 8, mon_data_size: 8, mon_mx_size: 2, mon_my_size: 2,
        mon_mhp_size: 4, mon_mtame_size: 1, mon_m_ap_type_size: 1, mon_mstrategy_size: 8,
        obj_otyp_size: 2, obj_spe_size: 1, obj_oextra_size: 8,
        pm_mlevel_size: 1, pm_mlet_size: 1, pm_geno_size: 2,
        pm_mflags1_size: 8, pm_mflags2_size: 8, prop_intrinsic_size: 8,
        prop_extrinsic_size: 8, prop_blocked_size: 8, terrain_typ_size: 1,
        level_dnum_size: 2, level_dlevel_size: 2, gender_him_size: 8,
        currentWand_size: 8, botl_size: 1, sokobanDnum_size: 2,
        roleMnum_size: 2, vizArray_size: 8, female_size: 1, SND_LIB_INTEGRATED: 0 };
    for (const [key, width] of Object.entries(widths))
        if (layout[key] !== width) throw new Error('Review changed music ABI: ' + key);
    const address = v => Number(v?.address ?? v ?? 0);
    const global = i => address(services.global(i));
    const view = () => CAdapter.currentDataView(services);
    const pointer = at => CAdapter.readPointerNumber(view,at);
    const int = v => CAdapter.signedInt(v);
    const char = v => int(v) << 24 >> 24;
    const coordxy = v => int(v) << 16 >> 16;
    const scalar = (o, key, at, kind) => Crt.defineScalarValue(view,o,key,at,kind);
    const indexed = (length, get, set, at) => new Proxy({ address: at }, {
        get(o, key) { if (key === 'length') return length;
            return typeof key === 'string' && /^-?\d+$/.test(key) ? get(Number(key)) : Reflect.get(o, key); },
        set(o, key, v) { if (set && typeof key === 'string' && /^-?\d+$/.test(key)) {
            set(Number(key), v); return true; } return Reflect.set(o, key, v); },
    });
    const bytes = (at, length) => indexed(length, i => view().getInt8(at + i),
        (i, v) => view().setInt8(at + i, Number(v)), at);
    function permonst(v) {
        const at = address(v); if (!at) return 0;
        const o = { address: at };
        for (const [key, kind] of [['mlevel', 'Int8'], ['mlet', 'Int8'], ['geno', 'Uint16'],
            ['mflags1', 'BigUint64'], ['mflags2', 'BigUint64']])
            scalar(o, key, () => at + layout['pm_' + key], kind);
        return o;
    }
    function monster(v) {
        const at = address(v); if (!at) return 0;
        const o = { address: at };
        for (const [key, kind] of [['mx', 'Int16'], ['my', 'Int16'], ['mhp', 'Int32'],
            ['mtame', 'Int8'], ['m_ap_type', 'Uint8'], ['mstrategy', 'BigUint64']])
            scalar(o, key, () => at + layout['mon_' + key], kind);
        Object.defineProperties(o, {
            data: { get() { return permonst(pointer(at + layout.mon_data)); } },
            nmon: { get() { return monster(pointer(at + layout.mon_nmon)); } },
        });
        for (const [i, key] of ['msleeping', 'mcanmove', 'mfrozen', 'mpeaceful', 'mavenge',
            'mundetected', 'mtrapped', 'isshk'].entries())
            Object.defineProperty(o, key, { get() { return services.monsterBit(at, i); },
                set(v) { services.setMonsterBit(at, i, v); } });
        return o;
    }
    function object(v) {
        const at = address(v); if (!at) return 0;
        const o = { address: at };
        scalar(o, 'otyp', () => at + layout.obj_otyp, 'Int16');
        scalar(o, 'spe', () => at + layout.obj_spe, 'Int8');
        Object.defineProperty(o, 'oextra', { get() { return pointer(at + layout.obj_oextra); },
            set(v) { view().setBigUint64(at + layout.obj_oextra, BigInt(address(v)), true); } });
        return o;
    }
    function level(at) {
        const o = { address: at };
        for (const key of ['dnum', 'dlevel']) scalar(o, key, () => at + layout['level_' + key], 'Int16');
        return o;
    }
    function trap(v) {
        const at = address(v); if (!at) return 0;
        const o = { address: at };
        for (const [i, key] of ['tseen', 'ttyp'].entries())
            Object.defineProperty(o, key, { get() { return services.trapBit(at, i); },
                set(v) { services.setTrapBit(at, i, v); } });
        return o;
    }
    const box = (at, kind) => { const o = { address: at }; scalar(o, 'value', () => at, kind); return o; };
    const u = { uevent: {} };
    for (const [key, kind] of [['ux', 'Int16'], ['uy', 'Int16'], ['ulevel', 'Int32'],
        ['dx', 'Int32'], ['dy', 'Int32'], ['dz', 'Int32'], ['utrap', 'Uint32'],
        ['utraptype', 'Uint32'], ['umonnum', 'Int32'], ['umonster', 'Int32']])
        scalar(u, key, () => global(0) + layout['u_' + key], kind);
    Object.defineProperty(u, 'uz', { get() { return level(global(0) + layout.u_uz); } });
    for (const key of ['ustuck', 'usteed'])
        Object.defineProperty(u, key, { get() { return monster(pointer(global(0) + layout['u_' + key])); } });
    Object.defineProperty(u, 'uswallow', { get() { return services.heroBit(0); } });
    Object.defineProperty(u.uevent, 'uheard_tune', { get() { return services.heroBit(3); },
        set(v) { services.setHeroBit(3, v); } });
    const propAt = (id, key) => global(0) + layout.u_uprops + id * layout.propSize + layout['prop_' + key];
    const prop = (id, key) => view().getBigInt64(propAt(id, key), true);
    const active = id => Boolean(prop(id, 'intrinsic') || prop(id, 'extrinsic'));
    const unblocked = id => active(id) && !prop(id, 'blocked');
    const flag = (p, key, mask) => Boolean(p[key] & BigInt(layout[mask]));
    const gy = {};
    Object.defineProperty(gy, 'youmonst', { get() { return monster(global(1) + layout.youmonst); } });
    const levl = indexed(layout.COLNO, x => indexed(layout.ROWNO, y => {
        const at = global(2) + layout.terrain + (x * layout.ROWNO + y) * layout.terrainSize;
        const o = { address: at }; scalar(o, 'typ', () => at + layout.terrain_typ, 'Int8');
        Object.defineProperty(o, 'doormask', { get() { return services.terrainBit(x, y, 0); },
            set(v) { services.setTerrainBit(x, y, 0, v); } }); return o;
    }));
    const gc = {};
    Object.defineProperty(gc, 'current_wand', { get() { return object(pointer(global(5) + layout.currentWand)); },
        set(v) { view().setBigUint64(global(5) + layout.currentWand, BigInt(address(v)), true); } });
    const disp = {}; scalar(disp, 'botl', () => global(6) + layout.botl, 'Int8');
    const svc = { context: {} }, svt = {};
    Object.defineProperty(svc.context, 'jingle', { get() { return bytes(global(3) + layout.jingle, layout.jingle_size); } });
    Object.defineProperty(svt, 'tune', { get() { return bytes(global(4) + layout.tune, layout.tune_size); } });
    const is_flyer = p => flag(p, 'mflags1', 'M1_FLY');
    const is_clinger = p => flag(p, 'mflags1', 'M1_CLING');
    const lcheck = (l, key) => { const target = level(global(7) + layout[key]);
        return Boolean((target.dnum || target.dlevel) && services.on_level(l, target)); };
    const env = Object.assign(Object.create(services), layout, {
        address, int, uint: v => int(v) >>> 0, char, boolean: char, coordxy, monster, object,
        booleanPointer: v => box(address(v), 'Int8'),
        booleanLocal: () => box(services.stackAlloc(1), 'Int8'),
        coordLocal: () => box(services.stackAlloc(2), 'Int16'),
        booleanArrayLocal: n => bytes(services.stackAlloc(n), n),
        zeroBuffer(n) { const at = services.stackAlloc(n); services.heap().fill(0, at, at + n); return at; },
        objectLocalCopy(src) { const at = services.stackAlloc(layout.objectSize), from = address(src);
            services.heap().copyWithin(at, from, from + layout.objectSize); return object(at); },
        callLocal(fn, ...args) {return CAdapter.callWithStack(services,fn,...args);},
        loadChar: at => view().getInt8(address(at)), storeChar: (at, v) => view().setInt8(address(at), Number(v)),
        musicState: state, u, gy, levl, gc, disp, svc, svt,
        objects: indexed(layout.NUM_OBJECTS, i => { const at = global(12) + i * layout.objectClassSize;
            return { address: at, get oc_magic() { return services.objectClassBit(at, 0); } }; }),
        mons: indexed(layout.NUMMONS, i => permonst(global(13) + i * layout.permonstSize)),
        DEADMONSTER: m => m.mhp < 1,
        mdistu: m => services.dist2(m.mx, m.my, u.ux, u.uy),
        unique_corpstat: p => Boolean(p.geno & layout.G_UNIQ),
        mindless: p => flag(p, 'mflags1', 'M1_MINDLESS'),
        is_mercenary: p => flag(p, 'mflags2', 'M2_MERC'), is_flyer, is_clinger,
        humanoid: p => flag(p, 'mflags1', 'M1_HUMANOID'),
        slithy: p => flag(p, 'mflags1', 'M1_SLITHY'),
        nolimbs: p => (p.mflags1 & BigInt(layout.M1_NOLIMBS)) === BigInt(layout.M1_NOLIMBS),
        ceiling_hider: p => flag(p, 'mflags1', 'M1_HIDE') && ((is_clinger(p) && p.mlet !== layout.S_MIMIC) || is_flyer(p)),
        M_AP_TYPE: m => m.m_ap_type & layout.M_AP_TYPMASK,
        has_mgivenname: m => services.hasMgivenname(m),
        u_at: (x, y) => x === u.ux && y === u.uy,
        m_at: (x, y) => monster(pointer(global(2) + layout.floorMonsters + (x * layout.ROWNO + y) * layout.pointerSize)),
        cansee: (x, y) => Boolean(view().getUint8(pointer(pointer(global(9) + layout.vizArray) + y * 8) + x) & layout.IN_SIGHT),
        is_pit: t => t === layout.PIT || t === layout.SPIKED_PIT,
        Role_if: pm => view().getInt16(global(8) + layout.roleMnum, true) === pm,
        ACURR: attr => services.acurr(attr), max: Math.max, min: Math.min,
        Amask2align: x => char(!(x & layout.AM_MASK) ? layout.A_NONE : (x & layout.AM_MASK) === layout.AM_LAWFUL ? layout.A_LAWFUL : (x & layout.AM_MASK) - 2),
        Is_astralevel: l => lcheck(l, 'astralLevel'), Is_sanctum: l => lcheck(l, 'sanctumLevel'),
        Is_stronghold: l => lcheck(l, 'strongholdLevel'),
        In_endgame: l => l.dnum === level(global(7) + layout.astralLevel).dnum,
        In_sokoban: l => l.dnum === view().getInt16(global(7) + layout.sokobanDnum, true),
        BZ_OFS_AD: ad => Math.abs(ad - layout.AD_MAGM) % 10, BZ_U_WAND: type => type,
        makeknown: type => services.discover_object(type, 1, 1, 1),
        propertyRef: id => propAt(id, 'intrinsic'),
        Maybe_Half_Phys: damage => active(layout.HALF_PHDAM) ? Math.trunc(int(damage + 1) / 2) : damage,
        uhim: () => pointer(global(11) + (view().getInt8(global(10) + layout.female) ? 1 : 0) * layout.genderSize + layout.gender_him),
        IS_DRAWBRIDGE: typ => typ === layout.DRAWBRIDGE_UP || typ === layout.DRAWBRIDGE_DOWN,
        plur: n => n === 1 ? '' : 's',
        pline1: msg => services.pline('%s', msg),
    });
    for (const [key, get] of Object.entries({
        HEAP8: () => new Int8Array(services.heap().buffer), HEAPU8: () => services.heap(),
        fmon: () => monster(pointer(global(2) + layout.fmon)), Never_mind: () => services.commonString(),
        Stunned: () => prop(layout.STUNNED, 'intrinsic'), Confusion: () => prop(layout.CONFUSION, 'intrinsic'),
        Deaf: () => active(layout.DEAF) || services.heroBit(2),
        Blind: () => unblocked(layout.BLINDED),
        Hallucination: () => Boolean(prop(layout.HALLUC, 'intrinsic') && !active(layout.HALLUC_RES)),
        Fumbling: () => active(layout.FUMBLING), Unchanging: () => active(layout.UNCHANGING),
        Levitation: () => unblocked(layout.LEVITATION),
        Flying: () => Boolean((active(layout.FLYING) || (u.usteed && is_flyer(u.usteed.data))) && !prop(layout.FLYING, 'blocked')),
        Upolyd: () => u.umonnum !== u.umonster, Underwater: () => services.heroBit(1),
    })) Object.defineProperty(env, key, { get });
    env.STRAT_WAITMASK = BigInt(layout.STRAT_WAITMASK);
    for (const key of ['maketrap', 't_at']) env[key] = (...args) => trap(services[key](...args));
    env.sobj_at = (...args) => object(services.sobj_at(...args));
    return env;
}
