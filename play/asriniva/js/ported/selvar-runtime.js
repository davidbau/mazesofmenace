export function createSelvarState() { return { selection_flood_check_func: 0n }; }

const pools=new WeakMap(),bindings=new WeakMap();
export function withSelvarEnvironment(services,layout,state,callback){
    if(!Object.isFrozen(layout)||!services.moduleKey)return callback(createSelvarEnvironment(services,layout,state));
    let modules=pools.get(state);if(!modules)pools.set(state,modules=new WeakMap());
    let layouts=modules.get(services.moduleKey);if(!layouts)modules.set(services.moduleKey,layouts=new WeakMap());
    let frames=layouts.get(layout);if(!frames)layouts.set(layout,frames=[]);
    let frame=frames.find(entry=>!entry.busy);
    if(!frame){frame={services,busy:true};const prototype=new Proxy({}, {get:(_,key)=>frame.services[key]});frame.env=createSelvarEnvironment(services,layout,state,prototype);frames.push(frame);}
    frame.busy=true;frame.services=services;bindings.get(frame.env)(services);
    try{return callback(frame.env);}finally{bindings.get(frame.env)(undefined);frame.services=undefined;frame.busy=false;}
}

// Live C views, scalar conversions and header macros outside the translated TU.
export function createSelvarEnvironment(services, layout, state,servicePrototype=services) {
    const widths = { pointerSize: 8, longSize: 8, intSize: 4, charSize: 1, charSigned: 1,
        booleanSize: 1, booleanSigned: 1, coordxySize: 2, coordxySigned: 1,
        floatSize: 4, CHAR_BIT: 8, sel_wid_size: 4, sel_hei_size: 4,
        sel_bounds_dirty_size: 1, sel_map_size: 8, rect_lx_size: 2, rect_ly_size: 2,
        rect_hx_size: 2, rect_hy_size: 2, room_lx_size: 2, room_ly_size: 2,
        room_hx_size: 2, room_hy_size: 2, terrain_typ_size: 1, coder_croom_size: 8 };
    for (const [key, value] of Object.entries(widths))
        if (layout[key] !== value) throw new Error('Review changed selvar ABI: ' + key);
    const address = value => Number(value?.address ?? value ?? 0);
    const global = index => address(services.global(index));
    let dataView,signedBytes;
    const view=()=>{const buffer=services.heap().buffer;if(dataView?.buffer!==buffer)dataView=new DataView(buffer);return dataView;};
    const pointer = at => Number(view().getBigUint64(at, true));
    const int = v => typeof v === 'bigint' ? Number(BigInt.asIntN(32, v)) : v | 0;
    const coordxy = v => int(v) << 16 >> 16;
    const char = v => int(v) << 24 >> 24;
    const long = v => BigInt.asIntN(64, BigInt(v));
    function rect(value) {
        const at = address(value);
        if (!at) return 0;
        const result = { address: at };
        for (const field of ['lx', 'ly', 'hx', 'hy'])
            Object.defineProperty(result, field, {
                get() { return view().getInt16(at + layout['rect_' + field], true); },
                set(v) { view().setInt16(at + layout['rect_' + field], coordxy(v), true); },
            });
        return result;
    }
    function selection(value) {
        const at = address(value);
        if (!at) return 0;
        return { address: at,
            get wid() { return view().getInt32(at + layout.sel_wid, true); },
            set wid(v) { view().setInt32(at + layout.sel_wid, int(v), true); },
            get hei() { return view().getInt32(at + layout.sel_hei, true); },
            set hei(v) { view().setInt32(at + layout.sel_hei, int(v), true); },
            get bounds_dirty() { return view().getInt8(at + layout.sel_bounds_dirty); },
            set bounds_dirty(v) { view().setInt8(at + layout.sel_bounds_dirty, char(v)); },
            get bounds() { return rect(at + layout.sel_bounds); },
            set bounds(v) { services.heap().copyWithin(at + layout.sel_bounds, address(v), address(v) + layout.rectSize); },
            get map() { return pointer(at + layout.sel_map); },
            set map(v) { view().setBigUint64(at + layout.sel_map, BigInt(address(v)), true); },
        };
    }
    function room(value) {
        const at = address(value);
        if (!at) return 0;
        const result = { address: at };
        for (const field of ['lx', 'ly', 'hx', 'hy'])
            Object.defineProperty(result, field, { get() { return view().getInt16(at + layout['room_' + field], true); } });
        return result;
    }
    const indexed = (length, get, set) => new Proxy({}, {
        get(target, key) {
            if (key === 'length') return length;
            if (typeof key === 'string' && /^\d+$/.test(key)) return get(Number(key));
            return Reflect.get(target, key);
        },
        set(target, key, value) {
            if (set && typeof key === 'string' && /^\d+$/.test(key)) { set(Number(key), value); return true; }
            return Reflect.set(target, key, value);
        },
    });
    function coordArray(value, length) {
        const at = address(value);
        const result = indexed(length, i => view().getInt16(at + i * layout.coordxySize, true),
            (i, v) => view().setInt16(at + i * layout.coordxySize, coordxy(v), true));
        result.address = at;
        return result;
    }
    const env = { ...layout, selvarState: state,
        get HEAP8() { const buffer=services.heap().buffer;if(signedBytes?.buffer!==buffer)signedBytes=new Int8Array(buffer);return signedBytes; },
        get HEAPU8() { return services.heap(); },
        int, coordxy, char, long, selection, rect, room, coordArray,
        longToFloat(value) {
            let n = long(value), sign = 1;
            if (n < 0n) { n = -n; sign = -1; }
            const shift = n.toString(2).length - 24;
            if (shift <= 0) return Number(n) * sign;
            const bits = BigInt(shift), half = 1n << (bits - 1n);
            let q = n >> bits;
            const rem = n - (q << bits);
            if (rem > half || (rem === half && (q & 1n))) q++;
            return Math.fround(Number(q) * 2 ** shift) * sign;
        },
        floatToLong(value) {
            if (Number.isNaN(value)) return 0n;
            if (value >= 9223372036854775808) return 9223372036854775807n;
            if (value <= -9223372036854775808) return -9223372036854775808n;
            return BigInt(Math.trunc(value));
        },
        copySelection(dst, src) { services.heap().copyWithin(address(dst), address(src), address(src) + layout.selectionSize); },
        rectLocal() { return rect(services.stackAlloc(layout.rectSize)); },
        rectLocalCopy(source) {
            const at = address(services.stackAlloc(layout.rectSize));
            services.heap().copyWithin(at, address(source), address(source) + layout.rectSize);
            return rect(at);
        },
        coordPointer(value) {
            const at = address(value);
            return { address: at, get value() { return view().getInt16(at, true); },
                set value(v) { view().setInt16(at, coordxy(v), true); } };
        },
        coordArrayLocal(length) { return coordArray(services.stackAlloc(length * layout.coordxySize), length); },
        charLocal() { return address(services.stackAlloc(layout.charSize)); },
        cg: { get zeroNhRect() { return global(0) + layout.zeroRect; } },
        gc: { get coder() { const at = pointer(global(2) + layout.coder); return at ? {
            address: at, get croom() { return room(pointer(at + layout.coder_croom)); },
        } : 0; } },
        svr: { rooms: indexed(layout.MAXNROFROOMS + 1, i => room(global(3) + layout.rooms + i * layout.roomSize)) },
        roomIndex(r) { return (address(r) - global(3) - layout.rooms) / layout.roomSize; },
        levl: indexed(layout.COLNO, x => indexed(layout.ROWNO, y => ({
            get typ() { return view().getInt8(global(1) + layout.terrain + (x * layout.ROWNO + y) * layout.terrainSize + layout.terrain_typ); },
            get lit() { return services.terrainBit(x, y, 0); },
            get edge() { return services.terrainBit(x, y, 1); },
            get roomno() { return services.terrainBit(x, y, 2); },
        }))),
        min(a, b) { return a < b ? a : b; }, max(a, b) { return a > b ? a : b; },
        abs(v) { return Math.abs(v); },
    };
    Object.setPrototypeOf(env,servicePrototype);
    bindings.set(env,next=>{services=next;});
    return env;
}
