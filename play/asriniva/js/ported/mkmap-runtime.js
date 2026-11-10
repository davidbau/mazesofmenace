// Live C map/room structures and header macros, outside the translated TU.
export function createMkmapEnvironment(services, layout) {
    if (layout.pointerSize !== 8 || layout.intSize !== 4 || layout.longSize !== 8
        || layout.shortSize !== 2 || layout.charSize !== 1 || !layout.charSigned
        || layout.CHAR_BIT !== 8 || layout.booleanSize !== 1 || !layout.booleanSigned
        || layout.coordxySize !== 2 || !layout.coordxySigned || layout.terrainTypeSize !== 1
        || layout.newLocationsSize !== 8 || layout.subroomsPointerSize !== 8
        || layout.nroomSize !== 4 || layout.nsubroomSize !== 4 || layout.nLocFilledSize !== 4
        || layout.levelFieldSize !== 2)
        throw new Error('Review changed mkmap ABI');
    for (const field of ['lx', 'hx', 'ly', 'hy'])
        if (layout['room_' + field + '_size'] !== 2) throw new Error('Review changed room coordinate ABI');
    for (const field of ['rlit', 'irregular'])
        if (layout['room_' + field + '_size'] !== 1) throw new Error('Review changed room boolean ABI');
    for (const field of ['min_rx', 'max_rx', 'min_ry', 'max_ry'])
        if (layout['bound_' + field + '_size'] !== 2) throw new Error('Review changed map bound ABI');
    for (const field of ['bg', 'fg', 'smoothed', 'joined', 'icedpools'])
        if (layout['init_' + field + '_size'] !== 1) throw new Error('Review changed level initializer byte ABI');
    for (const field of ['lit', 'walled'])
        if (layout['init_' + field + '_size'] !== 2) throw new Error('Review changed level initializer short ABI');
    const address = value => Number(value?.address ?? value ?? 0);
    const global = index => address(services.global(index));
    const view = () => new DataView(services.heap().buffer);
    const pointer = at => Number(view().getBigUint64(at, true));
    const indexed = (length, getter, setter, at) => new Proxy(at === undefined ? {} : { address: at }, {
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
    function room(value) {
        const at = address(value);
        const result = { address: at };
        for (const field of ['lx', 'hx', 'ly', 'hy', 'rlit', 'irregular']) {
            const bits = layout['room_' + field + '_size'] * 8;
            Object.defineProperty(result, field, {
                get() { return view()['getInt' + bits](at + layout['room_' + field], true); },
                set(value) { view()['setInt' + bits](at + layout['room_' + field], value, true); },
            });
        }
        return result;
    }
    function terrain(x, y) {
        const at = global(0) + layout.levlOffset + (x * layout.ROWNO + y) * layout.terrainSize;
        const result = {
            address: at,
            get typ() { return view().getInt8(at + layout.terrainType); },
            set typ(value) { view().setInt8(at + layout.terrainType, value); },
        };
        for (const [index, field] of ['roomno', 'lit', 'edge', 'icedpool'].entries())
            Object.defineProperty(result, field, {
                get() { return services.terrainBit(at, index); },
                set(value) { services.setTerrainBit(at, index, value); },
            });
        return result;
    }
    function coord(value) {
        const at = address(value);
        return {
            address: at,
            get x() { return view().getInt16(at + layout.coordX, true); },
            set x(value) { view().setInt16(at + layout.coordX, value, true); },
            get y() { return view().getInt16(at + layout.coordY, true); },
            set y(value) { view().setInt16(at + layout.coordY, value, true); },
        };
    }
    function levInit(value) {
        const at = address(value);
        const result = { address: at };
        for (const field of ['bg', 'fg', 'smoothed', 'joined', 'lit', 'walled', 'icedpools']) {
            const bits = layout['init_' + field + '_size'] * 8;
            Object.defineProperty(result, field, {
                get() { return view()['getInt' + bits](at + layout['init_' + field], true); },
                set(value) { view()['setInt' + bits](at + layout['init_' + field], value, true); },
            });
        }
        return result;
    }
    const gn = {
        get new_locations() {
            const at = pointer(global(1) + layout.newLocations);
            return at ? indexed((layout.WIDTH + 1) * layout.HEIGHT,
                index => view().getInt8(at + index),
                (index, value) => view().setInt8(at + index, value), at) : 0;
        },
        set new_locations(value) {
            view().setBigUint64(global(1) + layout.newLocations, BigInt(address(value)), true);
        },
        get nsubroom() { return view().getInt32(global(1) + layout.nsubroom, true); },
        set nsubroom(value) { view().setInt32(global(1) + layout.nsubroom, value, true); },
        get n_loc_filled() { return view().getInt32(global(1) + layout.nLocFilled, true); },
        set n_loc_filled(value) { view().setInt32(global(1) + layout.nLocFilled, value, true); },
    };
    const gm = {};
    for (const field of ['min_rx', 'max_rx', 'min_ry', 'max_ry'])
        Object.defineProperty(gm, field, {
            get() { return view().getInt16(global(2) + layout['bound_' + field], true); },
            set(value) { view().setInt16(global(2) + layout['bound_' + field], value, true); },
        });
    const levelFlags = {};
    for (const [index, field] of ['is_maze_lev', 'is_cavernous_lev'].entries())
        Object.defineProperty(levelFlags, field, {
            get() { return services.levelBit(index); },
            set(value) { services.setLevelBit(index, value); },
        });
    const int = value => typeof value === 'bigint' ? Number(BigInt.asIntN(32, value)) : value | 0;
    return {
        ...services,
        ...layout,
        get HEAP8() { return new Int8Array(services.heap().buffer); },
        get HEAPU8() { return services.heap(); },
        int,
        coordxy(value) { return int(value) << 16 >> 16; },
        short(value) { return int(value) << 16 >> 16; },
        char(value) { return int(value) << 24 >> 24; },
        boolean(value) { return int(value) << 24 >> 24; },
        long(value) { return BigInt.asIntN(64, typeof value === 'bigint' ? value : BigInt(Math.trunc(value))); },
        room,
        coord,
        levInit,
        coordLocal() { return coord(services.stackAlloc(layout.coordSize)); },
        roomNext(value) { return room(address(value) + layout.roomSize); },
        roomBefore(left, right) { return address(left) < address(right); },
        copyRoom(destination, source) {
            const at = address(source);
            services.heap().copyWithin(address(destination), at, at + layout.roomSize);
        },
        newLocIndex(i, j) { return j * (layout.WIDTH + 1) + i; },
        levl: indexed(layout.COLNO, x => indexed(layout.ROWNO, y => terrain(x, y))),
        gn,
        gm,
        svn: {
            get nroom() { return view().getInt32(global(3) + layout.nroom, true); },
            set nroom(value) { view().setInt32(global(3) + layout.nroom, value, true); },
        },
        svr: { rooms: indexed(layout.roomCount, index => room(global(4) + layout.rooms + index * layout.roomSize)) },
        gs: { subrooms: indexed(layout.roomCount, index => room(pointer(global(5) + layout.subrooms) + index * layout.roomSize)) },
        svl: { level: { flags: levelFlags } },
        u: { get uz() {
            const at = global(6) + layout.heroLevel;
            return {
                address: at,
                get dnum() { return view().getInt16(at + layout.levelDnum, true); },
                get dlevel() { return view().getInt16(at + layout.levelDlevel, true); },
            };
        } },
        IS_ROOM(typ) { return typ >= layout.ROOM; },
        IS_WALL(typ) { return typ !== 0 && typ <= layout.DBWALL; },
        IS_DOOR(typ) { return typ === layout.DOOR; },
        IS_OBSTRUCTED(typ) { return typ < layout.POOL; },
    };
}
