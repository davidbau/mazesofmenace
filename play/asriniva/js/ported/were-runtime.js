// Live C storage views and header macro expansions, outside the translated TU.
export function createWereEnvironment(services, layout) {
    if (layout.pointerSize !== 8 || layout.intSize !== 4 || layout.longSize !== 8
        || layout.CHAR_BIT !== 8 || layout.propValueSize !== 8
        || layout.permonstIndexSize !== 4 || layout.permonstFlags2Size !== 8
        || layout.wereChangesSize !== 8)
        throw new Error('Review changed were ABI');
    const address = value => Number(value?.address ?? value ?? 0);
    const view = () => new DataView(services.heap().buffer);
    const global = index => address(services.global(index));
    const pointer = at => Number(view().getBigUint64(at, true));
    const signed = (at, size) => size === 8 ? view().getBigInt64(at, true)
        : view()['getInt' + size * 8](at, true);
    const unsigned = (at, size) => size === 8 ? view().getBigUint64(at, true)
        : view()['getUint' + size * 8](at, true);
    function setSigned(at, size, value) {
        if (size === 8) view().setBigInt64(at, BigInt.asIntN(64, BigInt(value)), true);
        else view()['setInt' + size * 8](at, Number(value), true);
    }
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
            get pmidx() { return signed(at + layout.permonstIndex, layout.permonstIndexSize); },
            get mflags2() { return unsigned(at + layout.permonstFlags2, layout.permonstFlags2Size); },
            pmnames: indexed(layout.NUM_MGENDERS, index =>
                pointer(at + layout.permonstNames + index * layout.pointerSize)),
        };
    }
    function monster(value) {
        const at = address(value);
        if (!at) return 0;
        const result = {
            address: at,
            get data() { return permonst(pointer(at + layout.mon_data)); },
            set data(data) { view().setBigUint64(at + layout.mon_data, BigInt(address(data)), true); },
        };
        for (const name of ['mx', 'my', 'mux', 'muy', 'mhp', 'mhpmax'])
            Object.defineProperty(result, name, {
                get() { return signed(at + layout['mon_' + name], layout['mon_' + name + '_size']); },
                set(field) { setSigned(at + layout['mon_' + name], layout['mon_' + name + '_size'], field); },
            });
        for (const [index, name] of ['msleeping', 'mfrozen', 'mcanmove', 'mpeaceful'].entries())
            Object.defineProperty(result, name, {
                get() { return services.monsterBit(at, index); },
                set(field) { services.setMonsterBit(at, index, Number(field)); },
            });
        return result;
    }
    function intPointer(value) {
        const at = address(value);
        if (!at) return 0;
        return {
            address: at,
            get value() { return view().getInt32(at, true); },
            set value(field) { view().setInt32(at, field, true); },
        };
    }
    const u = {};
    for (const name of ['ux', 'uy', 'umonnum', 'ulycn', 'mtimedone'])
        Object.defineProperty(u, name, {
            get() { return signed(global(1) + layout['hero_' + name], layout['hero_' + name + '_size']); },
            set(value) { setSigned(global(1) + layout['hero_' + name], layout['hero_' + name + '_size'], value); },
        });
    const property = (id, extrinsic = false) => signed(global(1) + layout.heroProps
        + id * layout.propSize + (extrinsic ? layout.propExtrinsic : layout.propIntrinsic), layout.propValueSize);
    const hasProperty = id => property(id) !== 0n || property(id, true) !== 0n;
    return {
        ...services,
        ...layout,
        NO_MM_FLAGS: BigInt(layout.NO_MM_FLAGS),
        get HEAP8() { return new Int8Array(services.heap().buffer); },
        get HEAPU8() { return services.heap(); },
        permonst,
        monster,
        intPointer,
        makemon(...args) { return monster(services.makemon(...args)); },
        mons: indexed(layout.NUMMONS + 1, index => permonst(global(0) + index * layout.permonstSize)),
        u,
        flags: {
            get moonphase() { return unsigned(global(2) + layout.flagsMoonphase, layout.flagsMoonphaseSize); },
            get paranoia_bits() { return unsigned(global(2) + layout.flagsParanoia, layout.flagsParanoiaSize); },
        },
        gw: {
            get were_changes() { return signed(global(3) + layout.wereChanges, layout.wereChangesSize); },
            set were_changes(value) { setSigned(global(3) + layout.wereChanges, layout.wereChangesSize, value); },
        },
        svc: { context: {
            get mon_moving() { return signed(global(4) + layout.contextMonMoving, layout.contextMonMovingSize); },
        } },
        gy: { get youmonst() { return monster(global(5) + layout.youmonst); } },
        get Protection_from_shape_changers() { return hasProperty(layout.PROT_FROM_SHAPE_CHANGERS); },
        get Deaf() { return hasProperty(layout.DEAF) || !!services.roleplayDeaf(); },
        get Hallucination() { return property(layout.HALLUC) !== 0n && !hasProperty(layout.HALLUC_RES); },
        get Polymorph_control() { return hasProperty(layout.POLYMORPH_CONTROL); },
        get Stunned() { return property(layout.STUNNED) !== 0n; },
        get Unaware() {
            return signed(global(6) + layout.multi, layout.multiSize) < 0
                && (!!services.unconscious() || !!services.is_fainted());
        },
        get Unchanging() { return hasProperty(layout.UNCHANGING); },
        get ParanoidWerechange() {
            return (unsigned(global(2) + layout.flagsParanoia, layout.flagsParanoiaSize)
                & layout.PARANOID_WERECHANGE) !== 0;
        },
        is_were(ptr) { return (ptr.mflags2 & BigInt(layout.M2_WERE)) !== 0n; },
        is_human(ptr) { return (ptr.mflags2 & BigInt(layout.M2_HUMAN)) !== 0n; },
        monsndx(ptr) { return ptr.pmidx; },
        helpless(mon) { return !!mon.msleeping || !mon.mcanmove; },
    };
}
