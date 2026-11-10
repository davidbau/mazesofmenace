// Serialize the two JS-owned source projections into private native source
// buffers.  Live game arrays are populated only by the original memcpy calls.
export function createObjectsState(services, layout, namespace) {
    const widths = { pointerSize: 8, longSize: 8, intSize: 4, charSize: 1, charSigned: 1,
        CHAR_BIT: 8, oc_name_idx_size: 2, oc_descr_idx_size: 2, oc_uname_size: 8,
        oc_subtyp_size: 1, oc_oprop_size: 1, oc_class_size: 1, oc_delay_size: 1,
        oc_color_size: 1, oc_prob_size: 2, oc_weight_size: 4, oc_cost_size: 2,
        oc_wsdam_size: 1, oc_wldam_size: 1, oc_oc1_size: 1, oc_oc2_size: 1,
        oc_nutrition_size: 2, oc_sell_minseen_size: 8, oc_sell_maxseen_size: 8,
        oc_buy_minseen_size: 8, oc_buy_maxseen_size: 8, oc_name_size: 8, oc_descr_size: 8 };
    for (const [key, width] of Object.entries(widths))
        if (layout[key] !== width) throw new Error('Review changed objects ABI: ' + key);
    const address = value => Number(value?.address ?? value ?? 0);
    const descriptorSource = address(services.storage(2));
    const objectSource = address(services.storage(3));
    const { obj_descr_init, obj_init } = namespace;
    if (obj_descr_init.length !== layout.rowCount || obj_init.length !== layout.rowCount
        || layout.rowCount !== layout.NUM_OBJECTS + 1
        || layout.sizeof_obj_descr !== layout.rowCount * layout.descriptorSize
        || layout.sizeof_objects !== layout.rowCount * layout.objectSize)
        throw new Error('Review changed objects catalogue dimensions');
    services.heap().fill(0, descriptorSource, descriptorSource + layout.sizeof_obj_descr);
    services.heap().fill(0, objectSource, objectSource + layout.sizeof_objects);
    const view = () => new DataView(services.heap().buffer);
    const string = value => value === null ? 0 : address(services.literal(value));
    for (let row = 0; row < layout.rowCount; row++) {
        const descriptor = obj_descr_init[row], object = obj_init[row];
        for (const field of ['oc_name', 'oc_descr']) {
            const pointer = string(descriptor[field]);
            view().setBigUint64(descriptorSource + row * layout.descriptorSize + layout[field], BigInt(pointer), true);
        }
        const base = objectSource + row * layout.objectSize;
        for (const [index, field] of ['oc_name_known', 'oc_merge', 'oc_uses_known', 'oc_encountered',
            'oc_magic', 'oc_charged', 'oc_unique', 'oc_nowish', 'oc_big', 'oc_tough',
            'oc_spare1', 'oc_dir', 'oc_material'].entries()) {
            const value = Number(object[field]); // C relational expressions have integer results.
            if (!Number.isSafeInteger(value)) throw new Error('Review objects value: ' + field);
            services.setBit(base, index, value);
        }
        for (const [field, kind] of [['oc_name_idx', 'Int16'], ['oc_descr_idx', 'Int16'],
            ['oc_subtyp', 'Int8'], ['oc_oprop', 'Uint8'], ['oc_class', 'Int8'],
            ['oc_delay', 'Int8'], ['oc_color', 'Uint8'], ['oc_prob', 'Int16'],
            ['oc_weight', 'Uint32'], ['oc_cost', 'Int16'], ['oc_wsdam', 'Int8'],
            ['oc_wldam', 'Int8'], ['oc_oc1', 'Int8'], ['oc_oc2', 'Int8'], ['oc_nutrition', 'Uint16']]) {
            if (!Number.isSafeInteger(object[field])) throw new Error('Review objects value: ' + field);
            view()['set' + kind](base + layout[field], object[field], true);
        }
        const uname = string(object.oc_uname);
        view().setBigUint64(base + layout.oc_uname, BigInt(uname), true);
        for (const field of ['oc_sell_minseen', 'oc_sell_maxseen', 'oc_buy_minseen', 'oc_buy_maxseen']) {
            if (typeof object[field] !== 'bigint') throw new Error('Review objects unsigned long: ' + field);
            view().setBigUint64(base + layout[field], BigInt.asUintN(64, object[field]), true);
        }
    }
    return { descriptorSource, objectSource, obj_descr_init, obj_init };
}

export function createObjectsEnvironment(services, layout, state) {
    return { ...services, ...layout,
        get obj_descr() { return Number(services.storage(0)); },
        get objects() { return Number(services.storage(1)); },
        memcpy(destination, source, size) {
            if (source === state.obj_descr_init) source = state.descriptorSource;
            else if (source === state.obj_init) source = state.objectSource;
            else throw new Error('Unexpected objects initializer source');
            return services.memcpy(destination, source, size);
        },
    };
}
