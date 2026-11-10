import { write_ok } from './write.js';

// Live object data and header macros; writing decisions remain in write.js.
export function createWriteEnvironment(services, layout) {
    if (layout.pointerSize !== 8 || layout.intSize !== 4 || layout.longSize !== 8
        || layout.charSize !== 1 || !layout.charSigned || layout.CHAR_BIT !== 8
        || layout.booleanSize !== 1 || !layout.booleanSigned || layout.MAIL_STRUCTURES !== 1
        || layout.obj_otyp_size !== 2 || layout.obj_oclass_size !== 1 || layout.obj_spe_size !== 1
        || layout.class_oc_name_idx_size !== 2 || layout.class_oc_descr_idx_size !== 2
        || layout.class_oc_uname_size !== 8 || layout.class_oc_level_size !== 1
        || layout.baseSize !== 4 || layout.heroLevelSize !== 4 || layout.literateSize !== 8
        || layout.propValueSize !== 8 || layout.roleMonsterSize !== 2
        || layout.permonstFlagsSize !== 8 || !Number.isSafeInteger(layout.M1_NOHANDS))
        throw new Error('Review changed write ABI or mail configuration');
    const address = value => Number(value?.address ?? value ?? 0);
    const global = index => address(services.global(index));
    const view = () => new DataView(services.heap().buffer);
    const pointer = at => Number(view().getBigUint64(at, true));
    const indexed = (length, getter) => new Proxy({}, {
        get(target, key) {
            if (key === 'length') return length;
            if (typeof key === 'string' && /^\d+$/.test(key)) return getter(Number(key));
            return Reflect.get(target, key);
        },
    });
    function object(value) {
        const at = address(value);
        if (!at) return 0;
        const result = {
            address: at,
            get otyp() { return view().getInt16(at + layout.obj_otyp, true); },
            get oclass() { return view().getInt8(at + layout.obj_oclass); },
            get spe() { return view().getInt8(at + layout.obj_spe); },
            set spe(value) { view().setInt8(at + layout.obj_spe, value); },
        };
        for (const [index, field] of ['dknown', 'bknown', 'blessed', 'cursed'].entries())
            Object.defineProperty(result, field, {
                get() { return services.objectBit(at, index); },
                set(value) { services.setObjectBit(at, index, Number(value)); },
            });
        return result;
    }
    function objectClass(index) {
        const at = global(0) + index * layout.objectClassSize;
        const result = {
            address: at,
            get oc_name_idx() { return view().getInt16(at + layout.class_oc_name_idx, true); },
            get oc_descr_idx() { return view().getInt16(at + layout.class_oc_descr_idx, true); },
            get oc_uname() { return pointer(at + layout.class_oc_uname); },
            get oc_level() { return view().getInt8(at + layout.class_oc_level); },
        };
        for (const [bit, field] of ['oc_name_known', 'oc_encountered'].entries())
            Object.defineProperty(result, field, {
                get() { return services.objectClassBit(at, bit); },
            });
        return result;
    }
    const property = (id, field) => view().getBigInt64(global(3) + layout.heroProps
        + id * layout.propSize + layout[field], true);
    const hasProperty = id => property(id, 'propIntrinsic') !== 0n || property(id, 'propExtrinsic') !== 0n;
    return {
        ...services,
        ...layout,
        LL_CONDUCT: BigInt(layout.LL_CONDUCT),
        get HEAP8() { return new Int8Array(services.heap().buffer); },
        get HEAPU8() { return services.heap(); },
        int(value) { return typeof value === 'bigint' ? Number(BigInt.asIntN(32, value)) : value | 0; },
        object,
        objects: indexed(layout.NUM_OBJECTS + 1, objectClass),
        OBJ_NAME(obj) { return pointer(global(1) + obj.oc_name_idx * layout.descriptorSize + layout.descriptorName); },
        OBJ_DESCR(obj) { return pointer(global(1) + obj.oc_descr_idx * layout.descriptorSize + layout.descriptorDescription); },
        svb: { bases: indexed(layout.baseCount, index => view().getInt32(global(2) + layout.bases + index * layout.baseSize, true)) },
        u: {
            get ulevel() { return view().getInt32(global(3) + layout.heroLevel, true); },
            uconduct: {
                get literate() { return view().getBigInt64(global(3) + layout.literate, true); },
                set literate(value) { view().setBigInt64(global(3) + layout.literate, BigInt.asIntN(64, value), true); },
            },
        },
        gy: { get youmonst() {
            const at = global(5) + layout.youmonst;
            return {
                address: at,
                get data() {
                    const data = pointer(at + layout.monsterData);
                    return {
                        address: data,
                        get mflags1() { return view().getBigUint64(data + layout.permonstFlags1, true); },
                    };
                },
            };
        } },
        svp: { get plname() { return global(6) + layout.playerName; } },
        Role_if(which) { return view().getInt16(global(4) + layout.roleMonster, true) === which; },
        nohands(ptr) { return (ptr.mflags1 & BigInt(layout.M1_NOHANDS)) !== 0n; },
        get Blind() { return hasProperty(layout.BLINDED) && property(layout.BLINDED, 'propBlocked') === 0n; },
        get Glib() { return property(layout.GLIB, 'propIntrinsic') !== 0n; },
        get Hallucination() { return property(layout.HALLUC, 'propIntrinsic') !== 0n && !hasProperty(layout.HALLUC_RES); },
        zeroBuffer(size) {
            const at = address(services.stackAlloc(size));
            services.heap().fill(0, at, at + size);
            return at;
        },
        getobj(verb, callback, flags) {
            if (callback !== write_ok) throw new Error('Unsupported write callback identity');
            return object(services.getobj(verb, callback, flags));
        },
        mksobj(...args) { return object(services.mksobj(...args)); },
        hold_another_object(...args) { return object(services.hold_another_object(...args)); },
    };
}
