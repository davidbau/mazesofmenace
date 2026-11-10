// Live C storage and header expansions; mobile-light policy remains in light.js.
export function createLightEnvironment(services, layout) {
    const widths = { pointerSize: 8, longSize: 8, intSize: 4, charSize: 1, charSigned: 1,
        booleanSize: 1, booleanSigned: 1, coordxySize: 2, coordxySigned: 1,
        shortSize: 2, shortSigned: 1, anythingSize: 8, seenSize: 1, seenSigned: 0,
        circleElementSize: 2, ls_next_size: 8, ls_x_size: 2, ls_y_size: 2,
        ls_range_size: 2, ls_flags_size: 2, ls_type_size: 2, ls_id_size: 8,
        obj_o_id_size: 4, obj_otyp_size: 2, obj_spe_size: 1, obj_where_size: 1, obj_quan_size: 8,
        mon_nmon_size: 8, mon_m_id_size: 4, mon_mx_size: 2, mon_my_size: 2, mon_mhp_size: 4,
        coord_x_size: 2, coord_y_size: 2, nhf_mode_size: 4, any_a_obj_size: 8,
        any_a_monst_size: 8, any_a_void_size: 8, any_a_uint_size: 4,
        lightBase_size: 8, visionRecalc_size: 1, zeroany_size: 8, fmon_size: 8,
        migratingMons_size: 8, mydogs_size: 8, u_ux_size: 2, u_uy_size: 2,
        config_SFCTOOL: 0, config_NDEBUG: 0 };
    for (const [key, expected] of Object.entries(widths))
        if (layout[key] !== expected) throw new Error('Review changed light ABI: ' + key);
    const raw = v => BigInt.asUintN(64, BigInt(v?.address ?? v ?? 0));
    // Valid heap addresses are Numbers; opaque union bits may exceed their precision.
    const address = v => { const bits = raw(v); return bits <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(bits) : bits; };
    const atNumber = v => Number(raw(v));
    const global = i => atNumber(services.global(i));
    const view = () => new DataView(services.heap().buffer);
    const pointer = at => view().getBigUint64(at, true);
    const int = v => typeof v === 'bigint' ? Number(BigInt.asIntN(32, v)) : v | 0;
    const coordxy = v => int(v) << 16 >> 16;
    const long = v => BigInt.asIntN(64, BigInt(v));
    const scalar = (o, key, at, kind) => Object.defineProperty(o, key, {
        get() { return view()['get' + kind](at(), true); },
        set(v) { view()['set' + kind](at(), kind.includes('Big') ? BigInt(v) : Number(v), true); },
    });
    const ptrField = (o, key, at, wrap) => Object.defineProperty(o, key, {
        get() { return wrap(pointer(at())); },
        set(v) { view().setBigUint64(at(), raw(v), true); },
    });
    const indexed = (length, get, set, at) => new Proxy({ address: address(at ?? 0) }, {
        get(o, key) { if (key === 'length') return length;
            return typeof key === 'string' && /^-?\d+$/.test(key) ? get(Number(key)) : Reflect.get(o, key); },
        set(o, key, value) { if (set && typeof key === 'string' && /^-?\d+$/.test(key)) {
            set(Number(key), value); return true; } return Reflect.set(o, key, value); },
    });
    const copyBytes = (dst, src, size) => services.heap().copyWithin(atNumber(dst), atNumber(src), atNumber(src) + size);
    function object(value) {
        const bits = raw(value); if (!bits) return 0; const at = Number(bits), o = { address: address(bits) };
        for (const [key, kind] of [['o_id', 'Uint32'], ['otyp', 'Int16'], ['spe', 'Int8'],
            ['where', 'Int8'], ['quan', 'BigInt64']]) scalar(o, key, () => at + layout['obj_' + key], kind);
        for (const [index, key] of ['lamplit', 'blessed', 'cursed'].entries())
            Object.defineProperty(o, key, { get() { return services.objectBit(o, index); },
                set(v) { services.setObjectBit(o, index, v); } }); return o;
    }
    function monster(value) {
        const bits = raw(value); if (!bits) return 0; const at = Number(bits), o = { address: address(bits) };
        for (const [key, kind] of [['m_id', 'Uint32'], ['mx', 'Int16'], ['my', 'Int16'], ['mhp', 'Int32']])
            scalar(o, key, () => at + layout['mon_' + key], kind);
        ptrField(o, 'nmon', () => at + layout.mon_nmon, monster);
        for (const [index, key] of ['isgd', 'mtemplit'].entries())
            Object.defineProperty(o, key, { get() { return services.monsterBit(o, index); },
                set(v) { services.setMonsterBit(o, index, v); } }); return o;
    }
    function anything(value) {
        const at = atNumber(value), o = { address: address(value) };
        ptrField(o, 'a_obj', () => at + layout.any_a_obj, object);
        ptrField(o, 'a_monst', () => at + layout.any_a_monst, monster);
        Object.defineProperty(o, 'a_void', { get() { return pointer(at + layout.any_a_void); },
            set(v) { view().setBigUint64(at + layout.any_a_void, raw(v), true); } });
        scalar(o, 'a_uint', () => at + layout.any_a_uint, 'Uint32'); return o;
    }
    function lightSource(value) {
        const bits = raw(value); if (!bits) return 0; const at = Number(bits), o = { address: address(bits) };
        ptrField(o, 'next', () => at + layout.ls_next, lightSource);
        for (const key of ['x', 'y', 'range', 'flags', 'type']) scalar(o, key, () => at + layout['ls_' + key], 'Int16');
        Object.defineProperty(o, 'id', { get() { return anything(at + layout.ls_id); },
            set(v) { copyBytes(at + layout.ls_id, v, layout.anythingSize); } }); return o;
    }
    function nhfile(value) {
        const at = atNumber(value); if (!at) return 0; const o = { address: address(value) };
        scalar(o, 'mode', () => at + layout.nhf_mode, 'Int32'); return o;
    }
    const box = (at, kind) => { if (!at) return 0; const o = { address: at }; scalar(o, 'value', () => at, kind); return o; };
    const linkRef = at => { const o = { address: at };
        Object.defineProperty(o, 'value', { get() { return lightSource(pointer(at)); },
            set(v) { view().setBigUint64(at, raw(v), true); } }); return o; };
    const byteRow = at => indexed(layout.COLNO, x => view().getUint8(at + x),
        (x, value) => view().setUint8(at + x, Number(value)), at);
    const gl = {}, gv = {}, u = {}, cg = {}, gy = {}, gm = {}, gb = { bhitpos: {} };
    ptrField(gl, 'light_base', () => global(0) + layout.lightBase, lightSource);
    scalar(gv, 'vision_full_recalc', () => global(1) + layout.visionRecalc, 'Int8');
    for (const key of ['ux', 'uy']) scalar(u, key, () => global(2) + layout['u_' + key], 'Int16');
    Object.defineProperty(cg, 'zeroany', { get() { return anything(global(3) + layout.zeroany); } });
    Object.defineProperty(gy, 'youmonst', { get() { return monster(global(4) + layout.youmonst); } });
    ptrField(gm, 'migrating_mons', () => global(6) + layout.migratingMons, monster);
    ptrField(gm, 'mydogs', () => global(6) + layout.mydogs, monster);
    for (const key of ['x', 'y']) scalar(gb.bhitpos, key, () => global(7) + layout.bhitpos + layout['coord_' + key], 'Int16');
    const levl = indexed(layout.COLNO, x => indexed(layout.ROWNO, y => ({
        get lit() { return services.terrainBit(x, y, 0); },
    })));
    const env = Object.assign(Object.create(services), layout, {
        rawPointer: raw, address, int, uint: v => int(v) >>> 0, coordxy, long,
        boolean: v => int(v) << 24 >> 24, bool: v => v ? 1 : 0,
        samePtr: (a, b) => raw(a) === raw(b), object, monster, anything, lightSource, nhfile,
        seenRows: value => { const at = atNumber(value); return indexed(layout.ROWNO,
            y => byteRow(Number(pointer(at + y * 8))), null, at); },
        longPointer: value => box(atNumber(value), 'BigInt64'),
        intLocal: () => box(services.stackAlloc(4), 'Int32'),
        uintLocal: () => box(services.stackAlloc(4), 'Uint32'),
        anyLocal: () => anything(services.stackAlloc(layout.anythingSize)),
        copyAny: (dst, src) => copyBytes(dst, src, layout.anythingSize),
        copyLight: (dst, src) => copyBytes(dst, src, layout.lightSourceSize),
        lightHeadRef: () => linkRef(global(0) + layout.lightBase),
        lightNextRef: ls => linkRef(atNumber(ls) + layout.ls_next),
        coordRef: (ls, key) => box(atNumber(ls) + layout['ls_' + key], 'Int16'),
        callLocal(fn, ...args) { const saved = services.stackSave();
            try { return fn(...args); } finally { services.stackRestore(saved); } },
        circle_ptr: radius => { const at = global(9) + view().getInt16(global(10) + int(radius) * 2, true) * 2;
            return indexed(0, i => view().getInt16(at + i * 2, true), null, at); },
        gl, gv, u, cg, gy, gm, gb, levl, abs: Math.abs,
        u_at: (x, y) => x === u.ux && y === u.uy,
        DEADMONSTER: mon => mon.mhp < 1, mon_is_local: mon => mon.mx > 0,
        update_file: fp => fp.mode & (layout.COUNTING | layout.WRITING), release_data: fp => fp.mode & layout.FREEING,
        Is_candle: obj => obj.otyp === layout.TALLOW_CANDLE || obj.otyp === layout.WAX_CANDLE,
        ignitable: obj => obj.otyp === layout.BRASS_LANTERN || obj.otyp === layout.OIL_LAMP
            || (obj.otyp === layout.MAGIC_LAMP && obj.spe > 0) || obj.otyp === layout.CANDELABRUM_OF_INVOCATION
            || obj.otyp === layout.TALLOW_CANDLE || obj.otyp === layout.WAX_CANDLE || obj.otyp === layout.POT_OIL,
        canspotmon: mon => Boolean(services.canseemon(mon) || services.sensemon(mon)),
    });
    Object.defineProperties(env, {
        fmon: { get() { return monster(pointer(global(5) + layout.fmon)); } },
        uskin: { get() { return object(services.uskin()); } },
        HEAP8: { get() { return new Int8Array(services.heap().buffer); } },
        HEAPU8: { get() { return services.heap(); } },
    });
    env.find_oid = nid => object(services.find_oid(nid));
    return env;
}
