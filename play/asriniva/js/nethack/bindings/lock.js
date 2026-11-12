import * as CAdapter from '../../c-runtime/adapter-factories.js';
// Live native storage and header expansions; lock policy remains in lock.js.
export function createLockEnvironment(services, layout, namespace) {
    const widths = { pointerSize: 8, longSize: 8, intSize: 4, charSize: 1, charSigned: 1,
        booleanSize: 1, booleanSigned: 1, coordxySize: 2, coordxySigned: 1,
        obj_nobj_size: 8, obj_nexthere_size: 8, obj_cobj_size: 8, obj_otyp_size: 2,
        obj_oclass_size: 1, obj_ox_size: 2, obj_oy_size: 2, obj_where_size: 1,
        obj_quan_size: 8, obj_age_size: 8, obj_spe_size: 1, obj_oartifact_size: 1,
        mon_data_size: 8, mon_mx_size: 2, mon_my_size: 2, mon_m_ap_type_size: 1,
        mon_mappearance_size: 4, pm_mflags1_size: 8, pm_msize_size: 1,
        cls_oc_skill_size: 1, cls_oc_wldam_size: 1, xlock_door_size: 8,
        xlock_box_size: 8, xlock_picktyp_size: 4, xlock_chance_size: 4,
        xlock_usedtime_size: 4, xlock_magic_key_size: 1,
        u_ux_size: 2, u_uy_size: 2, u_dx_size: 4, u_dy_size: 4, u_dz_size: 4,
        u_utrap_size: 4, u_utraptype_size: 4, u_usteed_size: 8, u_ustuck_size: 8,
        coord_x_size: 2, coord_y_size: 2, level_dnum_size: 2, level_dlevel_size: 2,
        prop_intrinsic_size: 8, prop_extrinsic_size: 8, prop_blocked_size: 8,
        rm_typ_size: 1, rm_glyph_size: 4, occupation_size: 8, invent_size: 8,
        moves_size: 8, autounlock_size: 4, verbose_size: 1, visionRecalc_size: 1,
        vizArray_size: 8, roleMnum_size: 2, multi_size: 8, config_SND_LIB_INTEGRATED: 0 };
    for (const [key, expected] of Object.entries(widths))
        if (layout[key] !== expected) throw new Error('Review changed lock ABI: ' + key);
    const address = value => Number(value?.address ?? value ?? 0);
    const raw = value => CAdapter.unsignedPointer(value);
    const global = i => address(services.global(i));
    const view = () => CAdapter.currentDataView(services);
    const pointer = at => CAdapter.readPointerNumber(view,at);
    const int = value => CAdapter.signedInt(value);
    const boolean = value => int(value) << 24 >> 24;
    const coordxy = value => int(value) << 16 >> 16;
    const long = value => BigInt.asIntN(64, BigInt(value));
    const scalar = (obj, key, at, kind) => Object.defineProperty(obj, key, {
        get() { return view()['get' + kind](at(), true); },
        set(value) { view()['set' + kind](at(), kind.includes('Big') ? BigInt(value) : Number(value), true); },
    });
    const ptrField = (obj, key, at, wrap = value => value) => Object.defineProperty(obj, key, {
        get() { return wrap(pointer(at())); },
        set(value) { view().setBigUint64(at(), raw(value), true); },
    });
    const indexed = (get, at) => new Proxy({ address: at }, {
        get(obj, key) { return typeof key === 'string' && /^-?\d+$/.test(key)
            ? get(Number(key)) : Reflect.get(obj, key); },
    });
    function permonst(value) {
        const at = address(value); if (!at) return 0; const obj = { address: at };
        scalar(obj, 'mflags1', () => at + layout.pm_mflags1, 'BigUint64');
        scalar(obj, 'msize', () => at + layout.pm_msize, 'Uint8'); return obj;
    }
    function object(value) {
        const at = address(value); if (!at) return 0; const obj = { address: at };
        for (const k of ['nobj', 'nexthere', 'cobj']) ptrField(obj, k, () => at + layout['obj_' + k], object);
        for (const [k, kind] of [['otyp','Int16'], ['oclass','Int8'], ['ox','Int16'], ['oy','Int16'],
            ['where','Int8'], ['quan','BigInt64'], ['age','BigInt64'], ['spe','Int8'], ['oartifact','Int8']])
            scalar(obj, k, () => at + layout['obj_' + k], kind);
        for (const [i, k] of ['cursed','olocked','obroken','lknown','otrapped','tknown','dknown','oeroded','oeroded2'].entries())
            Object.defineProperty(obj, k, { get() { return services.objectBit(at, i); },
                set(value) { services.setObjectBit(at, i, value); } }); return obj;
    }
    function monster(value) {
        const at = address(value); if (!at) return 0; const obj = { address: at };
        ptrField(obj, 'data', () => at + layout.mon_data, permonst);
        for (const [k, kind] of [['mx','Int16'], ['my','Int16'], ['m_ap_type','Uint8'], ['mappearance','Uint32']])
            scalar(obj, k, () => at + layout['mon_' + k], kind);
        for (const [i, k] of ['mpeaceful','isshk'].entries()) Object.defineProperty(obj, k, {
            get() { return services.monsterBit(at, i); } }); return obj;
    }
    function coord(value) {
        const at = address(value), obj = { address: at };
        for (const k of ['x','y']) scalar(obj, k, () => at + layout['coord_' + k], 'Int16'); return obj;
    }
    function level(value) {
        const at = address(value), obj = { address: at };
        for (const k of ['dnum','dlevel']) scalar(obj, k, () => at + layout['level_' + k], 'Int16'); return obj;
    }
    function terrain(value) {
        const at = address(value); if (!at) return 0; const obj = { address: at };
        scalar(obj, 'typ', () => at + layout.rm_typ, 'Int8');
        scalar(obj, 'glyph', () => at + layout.rm_glyph, 'Int32');
        const index = (at - global(5) - layout.terrain) / layout.terrainSize;
        Object.defineProperty(obj, 'doormask', {
            get() { return services.terrainBit(Math.trunc(index / layout.ROWNO), index % layout.ROWNO, 0); },
            set(value) { services.setTerrainBit(Math.trunc(index / layout.ROWNO), index % layout.ROWNO, 0, value); },
        }); return obj;
    }
    const u = {};
    for (const [k, kind] of [['ux','Int16'],['uy','Int16'],['dx','Int32'],['dy','Int32'],['dz','Int32'],
        ['utrap','Uint32'],['utraptype','Uint32']]) scalar(u, k, () => global(0) + layout['u_' + k], kind);
    for (const k of ['usteed','ustuck']) ptrField(u, k, () => global(0) + layout['u_' + k], monster);
    Object.defineProperties(u, {
        ushops: { get() { return global(0) + layout.u_ushops; } },
        uz: { get() { return level(global(0) + layout.u_uz); } },
        uswallow: { get() { return services.heroBit(0); } },
    });
    const propAt = (id, key) => global(0) + layout.u_uprops + id * layout.propSize + layout['prop_' + key];
    const prop = (id, key) => view().getBigInt64(propAt(id, key), true);
    const active = id => Boolean(prop(id,'intrinsic') || prop(id,'extrinsic'));
    const unblocked = id => active(id) && !prop(id,'blocked');
    const levl = indexed(x => indexed(y => terrain(global(5) + layout.terrain
        + (x * layout.ROWNO + y) * layout.terrainSize)));
    const floor = (offset, wrap) => indexed(x => indexed(y => wrap(pointer(global(5) + offset
        + (x * layout.ROWNO + y) * 8))));
    const svl = { level: { objects: floor(layout.floorObjects, object) },
        lastseentyp: indexed(x => indexed(y => view().getInt8(global(5) + layout.lastseentyp + x * layout.ROWNO + y))) };
    const xlock = {};
    for (const [k, wrap] of [['door',terrain], ['box',object]]) ptrField(xlock, k, () => global(1) + layout.xlock + layout['xlock_' + k], wrap);
    for (const [k, kind] of [['picktyp','Int32'], ['chance','Int32'], ['usedtime','Int32'], ['magic_key','Int8']])
        scalar(xlock, k, () => global(1) + layout.xlock + layout['xlock_' + k], kind);
    const go = {};
    const callbacks = [namespace.picklock, namespace.forcelock];
    const callbackBits = callbacks.map((_, i) => raw(services.callbackPointer(i)));
    const callback = value => { const i = callbackBits.indexOf(raw(value)); return i < 0 ? raw(value) : callbacks[i]; };
    const callbackPointer = value => { const i = callbacks.indexOf(value); return i < 0 ? raw(value) : callbackBits[i]; };
    Object.defineProperty(go, 'occupation', {
        get() { return callback(services.getOccupation()); },
        set(value) { services.setOccupation(callbackPointer(value)); },
    });
    const gi = {}, flags = {}, gv = {}, svm = {}, cg = {}, svc = { context: {} };
    ptrField(gi, 'invent', () => global(3) + layout.invent, object);
    scalar(flags, 'autounlock', () => global(7) + layout.autounlock, 'Uint32');
    scalar(flags, 'verbose', () => global(7) + layout.verbose, 'Int8');
    scalar(gv, 'vision_full_recalc', () => global(8) + layout.visionRecalc, 'Int8');
    scalar(svm, 'moves', () => global(6) + layout.moves, 'BigInt64');
    Object.defineProperty(cg, 'zeroobj', { get() { return object(global(9) + layout.zeroobj); } });
    Object.defineProperty(svc.context, 'move', { get() { return services.contextBit(0); },
        set(value) { services.setContextBit(0, value); } });
    const gy = {};
    Object.defineProperty(gy, 'youmonst', { get() { return monster(global(4) + layout.youmonst); } });
    const objects = indexed(i => { const at = global(10) + i * layout.objectClassSize, obj = { address: at };
        for (const k of ['oc_skill','oc_wldam']) scalar(obj, k, () => at + layout['cls_' + k], 'Int8');
        Object.defineProperty(obj, 'oc_material', { get() { return services.objectClassBit(at, 0); } }); return obj; });
    const mons = indexed(i => permonst(global(11) + i * layout.permonstSize));
    const env = Object.assign(Object.create(services), layout, {
        address, int, boolean, coordxy, long, bool: value => Number(Boolean(value)),
        object, monster, terrain, coord, level, permonst, u, gx: { xlock }, go, gi, gy, svl, svm, flags, gv, cg, svc, objects, mons, levl,
        samePtr: (a,b) => raw(a) === raw(b),
        coordPointer(value) { const at = address(value); if (!at) return 0; const box = { address: at };
            scalar(box, 'value', () => at, 'Int16'); return box; },
        coordLocal() { return coord(services.stackAlloc(layout.coordSize)); },
        objectLocal() { return object(services.stackAlloc(layout.objectSize)); },
        copyObject(dst, src) { services.heap().copyWithin(address(dst), address(src), address(src) + layout.objectSize); },
        loadChar: at => view().getInt8(address(at)),
        callLocal(fn, ...args) {return CAdapter.callWithStack(services,fn,...args);},
        set_occupation(fn, text, time) { return services.set_occupation(callbackPointer(fn), text, time); },
        M_AP_TYPE: mon => mon.m_ap_type & layout.M_AP_TYPMASK,
        is_door_mappear: mon => (mon.m_ap_type & layout.M_AP_TYPMASK) === layout.M_AP_FURNITURE
            && (mon.mappearance === layout.S_hcdoor || mon.mappearance === layout.S_vcdoor),
        m_at: (x,y) => monster(pointer(global(5) + layout.floorMonsters + (x * layout.ROWNO + y) * 8)),
        OBJ_AT: (x,y) => Boolean(pointer(global(5) + layout.floorObjects + (x * layout.ROWNO + y) * 8)),
        u_at: (x,y) => u.ux === x && u.uy === y,
        Role_if: pm => view().getInt16(global(12) + layout.roleMnum, true) === pm,
        IS_DOOR: typ => typ === layout.DOOR,
        Is_box: obj => obj.otyp === layout.LARGE_BOX || obj.otyp === layout.CHEST,
        carried: obj => obj.where === layout.OBJ_INVENT,
        any_quest_artifact: obj => obj.oartifact >= layout.ART_ORB_OF_DETECTION,
        is_weptool: obj => obj.oclass === layout.TOOL_CLASS && objects[obj.otyp].oc_skill !== layout.P_NONE,
        is_blade: obj => obj.oclass === layout.WEAPON_CLASS && objects[obj.otyp].oc_skill >= layout.P_DAGGER
            && objects[obj.otyp].oc_skill <= layout.P_SABER,
        is_pick: obj => (obj.oclass === layout.WEAPON_CLASS || obj.oclass === layout.TOOL_CLASS)
            && objects[obj.otyp].oc_skill === layout.P_PICK_AXE,
        greatest_erosion: obj => obj.oeroded > obj.oeroded2 ? obj.oeroded : obj.oeroded2,
        nohands: pm => Boolean(pm.mflags1 & BigInt(layout.M1_NOHANDS)),
        breathless: pm => Boolean(pm.mflags1 & BigInt(layout.M1_BREATHLESS)),
        haseyes: pm => !(pm.mflags1 & BigInt(layout.M1_NOEYES)),
        verysmall: pm => pm.msize < layout.MZ_SMALL,
        canspotmon: mon => Boolean(services.canseemon(mon) || services.sensemon(mon)),
        cansee(x,y) { return Boolean(view().getUint8(pointer(pointer(global(8) + layout.vizArray) + y * 8) + x) & layout.IN_SIGHT); },
        distu: (x,y) => services.dist2(x,y,u.ux,u.uy),
        Is_rogue_level(l) { const target = level(global(15) + layout.rogueLevel);
            return Boolean((target.dnum || target.dlevel) && services.on_level(l,target)); },
        pline1: text => services.pline('%s', text),
    });
    Object.defineProperties(env, {
        HEAP8: { get() {return CAdapter.currentInt8View(services);} },
        HEAPU8: { get() { return services.heap(); } },
        uwep: { get() { return object(services.equipment()); } },
        dokick: { get() { return services.commandPointer(); } },
        Something: { get() { return services.commonString(0); } },
        ACURRSTR: { get() { return services.acurrstr(); } },
        ACURR: { value: services.acurr },
        Underwater: { get() { return services.heroBit(1); } },
        Blind: { get() { return unblocked(layout.BLINDED); } },
        Deaf: { get() { return active(layout.DEAF) || services.roleplayDeaf(); } },
        Confusion: { get() { return prop(layout.CONFUSION,'intrinsic'); } },
        Stunned: { get() { return prop(layout.STUNNED,'intrinsic'); } },
        Levitation: { get() { return unblocked(layout.LEVITATION); } },
        Passes_walls: { get() { return active(layout.PASSES_WALLS); } },
        Protection_from_shape_changers: { get() { return active(layout.PROT_FROM_SHAPE_CHANGERS); } },
        Unaware: { get() { return view().getBigInt64(global(14) + layout.multi, true) < 0n
            && (services.unconscious() || services.is_fainted()); } },
        HBlinded: { get() { return prop(layout.BLINDED,'intrinsic'); },
            set(value) { view().setBigInt64(propAt(layout.BLINDED,'intrinsic'), BigInt(value), true); } },
        BBlinded: { get() { return prop(layout.BLINDED,'blocked'); },
            set(value) { view().setBigInt64(propAt(layout.BLINDED,'blocked'), BigInt(value), true); } },
    });
    env.shop_keeper = (...args) => monster(services.shop_keeper(...args));
    return env;
}

// Cache only completed environments; heap fields and world addresses stay live.
const lockEnvironments = new WeakMap();
export function withLockEnvironment(services, layout, namespace, invoke) {
    const key = services.moduleKey;
    // Older embedding facades have no stable Module identity: retain their original path.
    if ((typeof key !== 'object' || key === null) && typeof key !== 'function')
        return invoke(createLockEnvironment(services, layout, namespace), services);
    let layouts = lockEnvironments.get(key);
    if (!layouts) { layouts = new WeakMap(); lockEnvironments.set(key, layouts); }
    let namespaces = layouts.get(layout);
    if (!namespaces) { namespaces = new WeakMap(); layouts.set(layout, namespaces); }
    let entry = namespaces.get(namespace);
    if (!entry) {
        entry = { active: services };
        // ACURR is captured by the unchanged standalone LOCK constructor.
        const acurr = (...args) => Reflect.apply(entry.active.acurr, entry.active, args);

        const forwarding = new Proxy(Object.create(null), {
            get: (_target, key) => key === 'acurr' ? acurr : Reflect.get(entry.active, key, entry.active),
            has: (_target, key) => Reflect.has(entry.active, key),
            ownKeys: () => Reflect.ownKeys(entry.active),
            getOwnPropertyDescriptor: (_target, key) => Reflect.has(entry.active, key)
                ? { configurable: true, enumerable: Object.prototype.propertyIsEnumerable.call(entry.active, key) } : undefined,
        });
        entry.forwarding = forwarding;
        entry.environment = createLockEnvironment(forwarding, layout, namespace);
        // Constructor/ABI validation and service bindings must finish before publication.
        const completed = namespaces.get(namespace);
        if (completed) entry = completed;
        else namespaces.set(namespace, entry);
    }
    const previous = entry.active;
    entry.active = services;
    try { return invoke(entry.environment, entry.forwarding); }
    finally { entry.active = previous; }
}
