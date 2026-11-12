import * as CAdapter from '../../c-runtime/adapter-factories.js';
import * as Crt from '../../c-runtime/adapter-memory.js';
// Compiler-derived C storage views; all Rogue level logic remains in extralev.js.
export function createExtralevEnvironment(services, layout) {
    if (layout.pointerSize !== 8 || layout.intSize !== 4 || layout.longSize !== 8
        || layout.CHAR_BIT !== 8 || layout.coordxySize !== 2 || !layout.coordxySigned
        || layout.booleanSize !== 1 || !layout.booleanSigned
        || layout.rColumns !== 3 || layout.rRows !== 3
        || layout.nroomSize !== 4 || layout.smeqSize !== 4
        || layout.terrainTypeSize !== 1 || layout.objectQuanSize !== 8
        || layout.objectWeightSize !== 4 || layout.objectSpeSize !== 1)
        throw new Error('Review changed extralev ABI');
    for (const field of ['rlx', 'rly', 'dx', 'dy'])
        if (layout['r_' + field + '_size'] !== 2) throw new Error('Review changed Rogue coordinate ABI');
    if (layout.r_real_size !== 1 || layout.r_doortable_size !== 1 || layout.r_nroom_size !== 4)
        throw new Error('Review changed Rogue field ABI');
    const address = value => Number(value?.address ?? value ?? 0);
    const global = index => address(services.global(index));
    const view = () => CAdapter.currentDataView(services);
    const signed = (at, size) => view()['getInt' + size * 8](at, true);
    const setSigned = (at, size, value) => view()['setInt' + size * 8](at, Number(value), true);
    const indexed = (length, getter, setter) => Crt.indexedArray(length,getter,setter);
    function rogue(x, y) {
        const at = global(0) + layout.rOffset + (x * layout.rRows + y) * layout.rogueSize;
        const result = { address: at };
        for (const field of ['rlx', 'rly', 'dx', 'dy', 'real', 'nroom'])
            Object.defineProperty(result, field, {
                get() { return signed(at + layout['r_' + field], layout['r_' + field + '_size']); },
                set(value) { setSigned(at + layout['r_' + field], layout['r_' + field + '_size'], value); },
            });
        Object.defineProperty(result, 'doortable', {
            get() { return view().getUint8(at + layout.r_doortable); },
            set(value) { view().setUint8(at + layout.r_doortable, value); },
        });
        return result;
    }
    function terrain(x, y) {
        const at = global(4) + layout.levlOffset + (x * layout.ROWNO + y) * layout.terrainSize;
        return {
            address: at,
            get typ() { return view().getInt8(at + layout.terrainType); },
            set typ(value) { view().setInt8(at + layout.terrainType, value); },
            get doormask() { return services.doorMask(at); },
            set doormask(value) { services.setDoorMask(at, value); },
        };
    }
    function monster(value) {
        const at = address(value);
        if (!at) return 0;
        return {
            address: at,
            get msleeping() { return services.monsterBit(at, 0); },
            set msleeping(value) { services.setMonsterBit(at, 0, value); },
        };
    }
    function object(value) {
        const at = address(value);
        if (!at) return 0;
        const result = {
            address: at,
            get quan() { return view().getBigInt64(at + layout.objectQuan, true); },
            set quan(value) { view().setBigInt64(at + layout.objectQuan, BigInt.asIntN(64, BigInt(value)), true); },
            get owt() { return view().getUint32(at + layout.objectWeight, true); },
            set owt(value) { view().setUint32(at + layout.objectWeight, value, true); },
            get spe() { return view().getInt8(at + layout.objectSpe); },
            set spe(value) { view().setInt8(at + layout.objectSpe, value); },
        };
        for (const [index, name] of ['oerodeproof', 'known'].entries())
            Object.defineProperty(result, name, {
                get() { return services.objectBit(at, index); },
                set(value) { services.setObjectBit(at, index, value); },
            });
        return result;
    }
    return {
        ...services,
        ...layout,
        NO_MM_FLAGS: BigInt(layout.NO_MM_FLAGS),
        get HEAP8() {return CAdapter.currentInt8View(services);},
        get HEAPU8() { return services.heap(); },
        monster,
        object,
        gr: { r: indexed(layout.rColumns, x => indexed(layout.rRows, y => rogue(x, y))) },
        svn: {
            get nroom() { return view().getInt32(global(1) + layout.nroomOffset, true); },
            set nroom(value) { view().setInt32(global(1) + layout.nroomOffset, value, true); },
        },
        gs: { smeq: indexed(layout.smeqCount,
            index => view().getInt32(global(2) + layout.smeqOffset + index * layout.smeqSize, true),
            (index, value) => view().setInt32(global(2) + layout.smeqOffset + index * layout.smeqSize, value, true)) },
        svr: { rooms: indexed(layout.roomCount, index => ({
            address: global(3) + layout.roomsOffset + index * layout.roomSize,
        })) },
        levl: indexed(layout.COLNO, x => indexed(layout.ROWNO, y => terrain(x, y))),
        mons: indexed(layout.NUMMONS + 1, index => ({ address: global(5) + index * layout.permonstSize })),
        coordxy(value) { return value << 16 >> 16; },
        IS_WALL(value) { return value !== 0 && value <= layout.DBWALL; },
        makemon(...args) { return monster(services.makemon(...args)); },
        christen_monst(...args) { return monster(services.christen_monst(...args)); },
        mksobj_at(...args) { return object(services.mksobj_at(...args)); },
    };
}
