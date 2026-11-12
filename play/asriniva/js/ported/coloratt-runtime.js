import * as Crt from '../c-runtime/adapter-memory.js';
// Native table storage and field views; color policy remains in coloratt.js.
export function createColorattState(services, layout, namespace) {
    const view = () => new DataView(services.heap().buffer);
    const resolve = v => typeof v === 'string' ? layout[v] : v;
    const tables = [
        ['colortable', 'colorCount', 'colorEntrySize', { colortyp: 'Int32', tableindex: 'Int32', rgbindex: 'Int32', name: 'pointer', r: 'BigInt64', g: 'BigInt64', b: 'BigInt64' }, 'color'],
        ['colornames', 'colorNameCount', 'nameEntrySize', { name: 'pointer', color: 'Int32' }, 'name'],
        ['attrnames', 'attrNameCount', 'nameEntrySize', { name: 'pointer', attr: 'Int32' }, 'name'],
        ['color_256_definitions', 'color256Count', 'color256Size', { index: 'Int32', value: 'Uint32' }, 'c256'],
    ];
    const state = { buf: Number(services.storage(4)), hexcolor: Number(services.storage(5)) };
    for (const [index, [name, count, size, fields, prefix]] of tables.entries()) {
        const at = Number(services.storage(index)); state[name] = at;
        if (namespace[name].length !== layout[count]) throw new Error('Review changed color table count');
        services.heap().fill(0, at, at + layout[count] * layout[size]);
        for (const [i, row] of namespace[name].entries()) for (const [field, kind] of Object.entries(fields)) {
            const offset = layout[prefix + '_' + (prefix === 'name' && field !== 'name' ? 'value' : field)];
            let value = row[field];
            if (kind === 'pointer') value = value === 0 ? 0n : BigInt(services.literal(value));
            else { value = resolve(value); if (!Number.isSafeInteger(value)) throw new Error('Review changed color table scalar');
                if (kind.includes('Big')) value = BigInt(value); }
            view()['set' + (kind === 'pointer' ? 'BigUint64' : kind)](at + i * layout[size] + offset, value, true);
        }
    }
    return state;
}

export function createColorattEnvironment(services, layout, state) {
    const widths = { pointerSize: 8, longSize: 8, intSize: 4, charSize: 1, charSigned: 1,
        booleanSize: 1, booleanSigned: 1, color_colortyp_size: 4, color_tableindex_size: 4,
        color_rgbindex_size: 4, color_name_size: 8, color_r_size: 8, color_g_size: 8,
        color_b_size: 8, name_name_size: 8, name_value_size: 4, c256_index_size: 4,
        c256_value_size: 4, ca_color_size: 4, ca_attr_size: 4, mc_match_size: 8,
        mc_origstr_size: 8, mc_color_size: 4, mc_attr_size: 4, mc_next_size: 8,
        gm_customcolor_size: 4, gm_color256idx_size: 2, menu_colorings_size: 8,
        color_colorings_size: 8, save_menucolors_size: 1, save_colorings_size: 8,
        use_menu_color_size: 1, CHANGE_COLOR: 0, ASSERT_ENABLED: 1 };
    for (const [key, expected] of Object.entries(widths))
        if (layout[key] !== expected) throw new Error('Review changed coloratt ABI: ' + key);
    const address = v => Number(v?.address ?? v ?? 0);
    const global = i => address(services.global(i));
    const view = () => new DataView(services.heap().buffer);
    const pointer = at => Number(view().getBigUint64(at, true));
    const int = v => typeof v === 'bigint' ? Number(BigInt.asIntN(32, v)) : v | 0;
    const scalar = (o, key, at, kind) => Crt.defineScalarValue(view,o,key,at,kind);
    const ptrField = (o, key, at, wrap = v => v) => Object.defineProperty(o, key, {
        get() { return wrap(pointer(at())); },
        set(v) { view().setBigUint64(at(), BigInt(address(v)), true); },
    });
    const box = (at, kind) => { if (!at) return 0; const o = { address: at }; scalar(o, 'value', () => at, kind); return o; };
    const indexed = (length, get, at) => new Proxy({ address: at }, {
        get(o, key) { if (key === 'length') return length;
            return typeof key === 'string' && /^-?\d+$/.test(key) ? get(Number(key)) : Reflect.get(o, key); },
    });
    function colorEntry(v) {
        const at = address(v); if (!at) return 0; const o = { address: at };
        for (const [key, kind] of [['colortyp', 'Int32'], ['tableindex', 'Int32'], ['rgbindex', 'Int32'],
            ['r', 'BigInt64'], ['g', 'BigInt64'], ['b', 'BigInt64']]) scalar(o, key, () => at + layout['color_' + key], kind);
        ptrField(o, 'name', () => at + layout.color_name); return o;
    }
    function colorAttr(v) {
        const at = address(v); if (!at) return 0; const o = { address: at };
        for (const key of ['color', 'attr']) scalar(o, key, () => at + layout['ca_' + key], 'Int32');
        return o;
    }
    function menuColoring(v) {
        const at = address(v); if (!at) return 0; const o = { address: at };
        for (const key of ['color', 'attr']) scalar(o, key, () => at + layout['mc_' + key], 'Int32');
        ptrField(o, 'match', () => at + layout.mc_match);
        ptrField(o, 'origstr', () => at + layout.mc_origstr);
        ptrField(o, 'next', () => at + layout.mc_next, menuColoring); return o;
    }
    function glyphMap(v) {
        const at = address(v); if (!at) return 0; const o = { address: at };
        scalar(o, 'customcolor', () => at + layout.gm_customcolor, 'Uint32');
        scalar(o, 'color256idx', () => at + layout.gm_color256idx, 'Uint16'); return o;
    }
    function any(v) { const at = address(v), o = { address: at };
        scalar(o, 'a_int', () => at, 'Int32'); return o; }
    const cg = {};
    Object.defineProperty(cg, 'zeroany', { get() { return any(global(0) + layout.zeroany); } });
    const gm = {}, gc = {}, gs = {}, iflags = {};
    ptrField(gm, 'menu_colorings', () => global(1) + layout.menu_colorings, menuColoring);
    ptrField(gc, 'color_colorings', () => global(2) + layout.color_colorings, menuColoring);
    ptrField(gs, 'save_colorings', () => global(3) + layout.save_colorings, menuColoring);
    scalar(gs, 'save_menucolors', () => global(3) + layout.save_menucolors, 'Int8');
    scalar(iflags, 'use_menu_color', () => global(4) + layout.use_menu_color, 'Int8');
    const nameTable = (at, count, valueKey) => indexed(count, i => {
        const o = { address: at + i * layout.nameEntrySize };
        ptrField(o, 'name', () => o.address + layout.name_name);
        scalar(o, valueKey, () => o.address + layout.name_value, 'Int32'); return o;
    }, at);
    const env = Object.assign(Object.create(services), layout, {
        address, int, uint: v => int(v) >>> 0, uint8: v => int(v) & 255,
        long: v => BigInt.asIntN(64, BigInt(v)), boolean: v => int(v) << 24 >> 24,
        colorAttr, colorEntry, glyphMap, menuColoring,
        uint32Pointer: v => box(address(v), 'Uint32'), uint16Pointer: v => box(address(v), 'Uint16'),
        uint32Local: () => box(services.stackAlloc(4), 'Uint32'),
        uint16Local: () => box(services.stackAlloc(2), 'Uint16'),
        charLocal: () => box(services.stackAlloc(1), 'Int8'),
        anyLocal: () => any(services.stackAlloc(layout.anythingSize)),
        copyAny(dst, src) { services.heap().copyWithin(address(dst), address(src), address(src) + layout.anythingSize); },
        menuPointerLocal() { const at = services.stackAlloc(8), o = { address: at };
            Object.defineProperty(o, 'value', { get() { const base = pointer(at); return base ? indexed(0, i => ({
                address: base + i * layout.menuItemSize,
                item: any(base + i * layout.menuItemSize + layout.menuItemInt),
            }), base) : 0; }, set(v) { view().setBigUint64(at, BigInt(address(v)), true); } }); return o; },
        callLocal(fn, ...args) { const saved = services.stackSave();
            try { return fn(...args); } finally { services.stackRestore(saved); } },
        loadChar: at => view().getInt8(address(at)), storeChar: (at, v) => view().setInt8(address(at), Number(v)),
        cString: v => typeof v === 'string' ? services.literal(v) : address(v),
        cg, gm, gc, gs, iflags, colorattState: state,
        colornames: nameTable(state.colornames, layout.colorNameCount, 'color'),
        attrnames: nameTable(state.attrnames, layout.attrNameCount, 'attr'),
        colortable: indexed(layout.colorCount, i => colorEntry(state.colortable + i * layout.colorEntrySize), state.colortable),
        color_256_definitions: indexed(layout.color256Count, i => { const at = state.color_256_definitions + i * layout.color256Size, o = { address: at };
            scalar(o, 'index', () => at + layout.c256_index, 'Int32'); scalar(o, 'value', () => at + layout.c256_value, 'Uint32'); return o; }, state.color_256_definitions),
        digit: c => c >= 48 && c <= 57,
    });
    Object.defineProperties(env, {
        regex_id: { get() { return services.regexId(); } }, hexdd: { get() { return services.hexdd(); } },
        nul_glyphinfo: { get() { return services.nulGlyphInfo(); } },
        HEAP8: { get() { return new Int8Array(services.heap().buffer); } }, HEAPU8: { get() { return services.heap(); } },
    });
    return env;
}
