import * as CAdapter from '../../c-runtime/adapter-factories.js';
// Native layout and macro expansion; shop choices, naming and allocations are
// translated in shknam.js. Each Wasm module owns these addresses and maps.
export function createShknamState(services, layout, namespace) {
    for (const [key, width] of Object.entries({ pointerSize: 8, shop_symb_size: 1, shop_prob_size: 4, shop_shdist_size: 1, iprob_iprob_size: 4, iprob_itype_size: 4 }))
        if (layout[key] !== width) throw new Error('Review changed shop startup ABI: ' + key);
    const names = Object.entries(namespace).filter(([name, value]) => /^shk/.test(name) && Array.isArray(value));
    const shops = namespace.shtypes, shopBase = Number(services.storage(0)), namesBase = Number(services.storage(1));
    if (shops.length !== layout.shopCount) throw new Error('Review shop catalogue dimensions');
    const view = () => CAdapter.currentDataView(services);
    const byPointer = new Map(), listAddresses = new Map(), unknownLists = new Map();
    let next = namesBase;
    for (const [, list] of names) {
        if (list.at(-1) !== 0) throw new Error('Review shop name list terminator');
        byPointer.set(next, list); listAddresses.set(list, next);
        for (const name of list) {
            const pointer = name === 0 ? 0 : Number(services.literal(name));
            view().setBigUint64(next, BigInt(pointer), true); next += layout.pointerSize;
        }
    }
    services.heap().fill(0, shopBase, shopBase + shops.length * layout.shopSize);
    for (let index = 0; index < shops.length; index++) {
        const shop = shops[index], at = shopBase + index * layout.shopSize;
        for (const field of ['name', 'annotation']) {
            const pointer = shop[field] === 0 ? 0 : Number(services.literal(shop[field]));
            view().setBigUint64(at + layout['shop_' + field], BigInt(pointer), true);
        }
        view().setInt8(at + layout.shop_symb, shop.symb);
        view().setInt32(at + layout.shop_prob, shop.prob, true);
        view().setInt8(at + layout.shop_shdist, shop.shdist);
        if (shop.iprobs.length !== layout.iprobCount) throw new Error('Review shop item probabilities');
        for (let item = 0; item < layout.iprobCount; item++) {
            const pair = at + layout.shop_iprobs + item * layout.iprobSize;
            view().setInt32(pair + layout.iprob_iprob, shop.iprobs[item].iprob, true);
            view().setInt32(pair + layout.iprob_itype, shop.iprobs[item].itype, true);
        }
        const pointer = shop.shknms === 0 ? 0 : listAddresses.get(shop.shknms);
        if (pointer === undefined) throw new Error('Review shop name list identity');
        view().setBigUint64(at + layout.shop_shknms, BigInt(pointer), true);
    }
    return { namespace, shops, shopBase, namesBase, byPointer, listAddresses, unknownLists };
}

export function createShknamEnvironment(services, layout, state) {
    const widths = { pointerSize: 8, longSize: 8, timeSize: 8, intSize: 4,
        charSize: 1, charSigned: 1, booleanSize: 1, booleanSigned: 1,
        coordxySize: 2, coordxySigned: 1, CHAR_BIT: 8, DEBUG: 1, ASSERT_ENABLED: 1,
        shop_symb_size: 1, shop_prob_size: 4, shop_shdist_size: 1, shop_shknms_size: 8,
        room_lx_size: 2, room_hx_size: 2, room_ly_size: 2, room_hy_size: 2,
        room_rtype_size: 1, room_doorct_size: 1, room_fdoor_size: 4,
        room_irregular_size: 1, room_resident_size: 8, mon_data_size: 8,
        mon_nmon_size: 8, mon_mextra_size: 8, mon_m_id_size: 4, mon_mx_size: 2,
        mon_my_size: 2, mon_mhp_size: 4, mextra_eshk_size: 8,
        eshk_parentmid_size: 4, eshk_robbed_size: 8, eshk_credit_size: 8,
        eshk_debit_size: 8, eshk_loan_size: 8, eshk_shoptype_size: 4,
        eshk_shoproom_size: 1, eshk_following_size: 1, eshk_surcharge_size: 1,
        eshk_dismiss_kops_size: 1, eshk_billct_size: 4, eshk_bill_p_size: 8,
        eshk_visitct_size: 4, obj_otyp_size: 2, obj_oclass_size: 1,
        obj_corpsenm_size: 4, obj_spe_size: 1, class_oc_class_size: 1,
        class_oc_prob_size: 2, class_oc_name_idx_size: 2, descr_oc_name_size: 8,
        pm_mlet_size: 1, terrain_typ_size: 1, coord_x_size: 2, coord_y_size: 2,
        level_dnum_size: 2, level_dlevel_size: 2, baseSize: 4,
        gameoverSize: 4, tributeEnabledSize: 1, doorindexSize: 4, wizardSize: 1 };
    for (const [key, width] of Object.entries(widths))
        if (layout[key] !== width) throw new Error('Review changed shknam ABI: ' + key);
    const address = value => Number(value?.address ?? value ?? 0);
    const global = index => address(services.global(index));
    const view = () => CAdapter.currentDataView(services);
    const pointer = at => CAdapter.readPointerNumber(view,at);
    const int = value => CAdapter.signedInt(value);
    const char = value => (int(value) << 24) >> 24;
    const scalar = (target, name, at, kind) => Object.defineProperty(target, name, {
        get() { return view()['get' + kind](at(), true); },
        set(v) { view()['set' + kind](at(), kind.includes('Big') ? BigInt(v) : Number(v), true); },
    });
    const indexed = (length, get, set) => new Proxy({}, {
        get(target, key) { if (key === 'length') return length;
            return typeof key === 'string' && /^-?\d+$/.test(key) ? get(Number(key)) : Reflect.get(target, key); },
        set(target, key, value) { if (set && typeof key === 'string' && /^-?\d+$/.test(key)) {
            set(Number(key), value); return true; } return Reflect.set(target, key, value); },
    });
    function cString(value) { return typeof value === 'string' ? address(services.literal(value)) : address(value); }
    function coord(value) { const at = address(value), result = { address: at };
        for (const field of ['x', 'y']) scalar(result, field, () => at + layout['coord_' + field], 'Int16'); return result; }
    function level(value) { const at = address(value), result = { address: at };
        for (const field of ['dnum', 'dlevel']) scalar(result, field, () => at + layout['level_' + field], 'Int16'); return result; }
    function eshk(value) {
        const at = address(value); if (!at) return 0;
        const result = { address: at };
        for (const [field, kind] of [['parentmid', 'Uint32'], ['robbed', 'BigInt64'], ['credit', 'BigInt64'],
            ['debit', 'BigInt64'], ['loan', 'BigInt64'], ['shoptype', 'Int32'], ['shoproom', 'Int8'],
            ['following', 'Int8'], ['surcharge', 'Int8'], ['dismiss_kops', 'Int8'], ['billct', 'Int32'], ['visitct', 'Int32']])
            scalar(result, field, () => at + layout['eshk_' + field], kind);
        Object.defineProperties(result, {
            bill_p: { get() { return pointer(at + layout.eshk_bill_p); }, set(v) { view().setBigUint64(at + layout.eshk_bill_p, BigInt(address(v)), true); } },
            customer: { get() { return at + layout.eshk_customer; } }, shknam: { get() { return at + layout.eshk_shknam; } },
            shoplevel: { get() { return level(at + layout.eshk_shoplevel); } },
            shk: { get() { return coord(at + layout.eshk_shk); } },
            shd: { get() { return coord(at + layout.eshk_shd); }, set(v) {
                services.heap().copyWithin(at + layout.eshk_shd, address(v), address(v) + layout.coordSize); } },
        }); return result;
    }
    function mextra(value) { const at = address(value); if (!at) return 0;
        return { address: at, get eshk() { return eshk(pointer(at + layout.mextra_eshk)); },
            set eshk(v) { view().setBigUint64(at + layout.mextra_eshk, BigInt(address(v)), true); } }; }
    function permonst(value) { const at = address(value); if (!at) return 0;
        const result = { address: at }; scalar(result, 'mlet', () => at + layout.pm_mlet, 'Int8'); return result; }
    function monster(value) {
        const at = address(value); if (!at) return 0;
        const result = { address: at };
        for (const [field, kind] of [['m_id', 'Uint32'], ['mx', 'Int16'], ['my', 'Int16'], ['mhp', 'Int32']])
            scalar(result, field, () => at + layout['mon_' + field], kind);
        Object.defineProperties(result, {
            nmon: { get() { return monster(pointer(at + layout.mon_nmon)); } },
            data: { get() { return permonst(pointer(at + layout.mon_data)); } },
            mextra: { get() { return mextra(pointer(at + layout.mon_mextra)); },
                set(v) { view().setBigUint64(at + layout.mon_mextra, BigInt(address(v)), true); } },
        });
        for (const [index, field] of ['female', 'isshk', 'mpeaceful', 'msleeping'].entries())
            Object.defineProperty(result, field, { get() { return services.monsterBit(at, index); },
                set(v) { services.setMonsterBit(at, index, Number(v)); } });
        return result;
    }
    function object(value) { const at = address(value); if (!at) return 0;
        const result = { address: at };
        for (const [field, kind] of [['otyp', 'Int16'], ['oclass', 'Int8'], ['corpsenm', 'Int32'], ['spe', 'Int8']])
            scalar(result, field, () => at + layout['obj_' + field], kind);
        return result; }
    function room(value) { const at = address(value), result = { address: at };
        for (const [field, kind] of [['lx', 'Int16'], ['hx', 'Int16'], ['ly', 'Int16'], ['hy', 'Int16'],
            ['rtype', 'Int8'], ['doorct', 'Int8'], ['fdoor', 'Int32'], ['irregular', 'Int8']])
            scalar(result, field, () => at + layout['room_' + field], kind);
        Object.defineProperty(result, 'resident', { get() { return monster(pointer(at + layout.room_resident)); },
            set(v) { view().setBigUint64(at + layout.room_resident, BigInt(address(v)), true); } }); return result; }
    function nameList(value) {
        if (Array.isArray(value)) return value;
        const at = address(value); if (!at) return 0;
        if (state.byPointer.has(at)) return state.byPointer.get(at);
        if (!state.unknownLists.has(at)) { const list = indexed(Infinity, i => pointer(at + i * layout.pointerSize));
            list.address = at; state.unknownLists.set(at, list); }
        return state.unknownLists.get(at);
    }
    function shopClass(value) {
        if (typeof value === 'object' && !('address' in value)) return value;
        const at = address(value), index = (at - state.shopBase) / layout.shopSize;
        if (Number.isInteger(index) && index >= 0 && index < state.shops.length) return state.shops[index];
        return { address: at, get name() { return pointer(at + layout.shop_name); },
            get annotation() { return pointer(at + layout.shop_annotation); }, get symb() { return view().getInt8(at + layout.shop_symb); },
            get prob() { return view().getInt32(at + layout.shop_prob, true); }, get shdist() { return view().getInt8(at + layout.shop_shdist); },
            get shknms() { return nameList(pointer(at + layout.shop_shknms)); },
            iprobs: indexed(layout.iprobCount, i => ({
                get iprob() { return view().getInt32(at + layout.shop_iprobs + i * layout.iprobSize + layout.iprob_iprob, true); },
                get itype() { return view().getInt32(at + layout.shop_iprobs + i * layout.iprobSize + layout.iprob_itype, true); },
            })),
        };
    }
    function coordPointer(value) { const at = address(value), result = { address: at };
        scalar(result, 'value', () => at, 'Int16'); return result; }
    const terrain = (x, y) => {
        const result = { address: global(3) + layout.terrain + (x * layout.ROWNO + y) * layout.terrainSize };
        scalar(result, 'typ', () => result.address + layout.terrain_typ, 'Int8');
        for (const [index, field] of ['edge', 'roomno', 'doormask'].entries())
            Object.defineProperty(result, field, { get() { return services.terrainBit(x, y, index); },
                set(v) { services.setTerrainBit(x, y, index, Number(v)); } }); return result;
    };
    const env = { ...services, ...layout, int, char, boolean: char, long: value => BigInt.asIntN(64, BigInt(value)),
        object, monster, permonst, mextra, eshk, room, shopClass, nameList, coordPointer, cString,
        get HEAP8() {return CAdapter.currentInt8View(services);}, get HEAPU8() { return services.heap(); },
        loadChar(value) { return view().getInt8(cString(value)); }, storeChar(at, value) { view().setInt8(address(at), Number(value)); },
        shopIndex(shop) { const index = state.shops.indexOf(shop); return index >= 0 ? index : (address(shop) - state.shopBase) / layout.shopSize; },
        roomIndex(value) { return (address(value) - global(5) - layout.rooms) / layout.roomSize; },
        get WIN_MESSAGE() { return services.winMessage(); }, get ubirthday() { return services.birthday(); },
        get wizard() { return view().getInt8(global(11) + layout.wizard); },
        get fmon() { return monster(pointer(global(3) + layout.fmon)); },
        get orcus_level() { return level(global(4) + layout.orcusLevel); },
        u: { get uz() { return level(global(0) + layout.u_uz); } },
        gd: { get doorindex() { return view().getInt32(global(10) + layout.doorindex, true); } },
        program_state: { get gameover() { return view().getInt32(global(9) + layout.gameover, true); } },
        svc: { context: { tribute: { get enabled() { return view().getInt8(global(2) + layout.tributeEnabled); },
            get bookstock() { return services.contextBit(0); }, set bookstock(v) { services.setContextBit(0, Number(v)); } } } },
        svb: { bases: indexed(layout.MAXOCLASSES + 2, i => view().getInt32(global(1) + layout.bases + i * layout.baseSize, true)) },
        svd: { doors: indexed(Infinity, i => coord(pointer(global(4) + layout.doors) + i * layout.coordSize)) },
        svr: { rooms: indexed(layout.MAXNROFROOMS, i => room(global(5) + layout.rooms + i * layout.roomSize)) },
        svl: { level: { flags: { get has_shop() { return services.levelBit(0); }, set has_shop(v) { services.setLevelBit(0, Number(v)); } } } },
        mons: indexed(layout.NUMMONS + 1, i => permonst(global(6) + i * layout.permonstSize)),
        objects: indexed(layout.NUM_OBJECTS, i => { const at = global(7) + i * layout.objectClassSize;
            return { address: at, get oc_class() { return view().getInt8(at + layout.class_oc_class); },
                get oc_prob() { return view().getInt16(at + layout.class_oc_prob, true); },
                get oc_material() { return services.objectClassBit(at, 0); },
                get oc_name_idx() { return view().getInt16(at + layout.class_oc_name_idx, true); } }; }),
        levl: indexed(layout.COLNO, x => indexed(layout.ROWNO, y => terrain(x, y))),
        m_at(x, y) { return monster(pointer(global(3) + layout.floorMonsters + (x * layout.ROWNO + y) * layout.pointerSize)); },
        MON_AT(x, y) { return !!env.m_at(x, y); }, ESHK(mon) { return mon.mextra.eshk; },
        has_eshk(mon) { return !!(mon.mextra && mon.mextra.eshk); }, DEADMONSTER(mon) { return mon.mhp < 1; },
        ismnum(index) { return index >= 0 && index < layout.NUMMONS; },
        vegetarian(p) { return [layout.S_BLOB, layout.S_JELLY, layout.S_FUNGUS, layout.S_VORTEX, layout.S_LIGHT, layout.S_GHOST].includes(p.mlet)
            || (p.mlet === layout.S_ELEMENTAL && p.address !== env.mons[layout.PM_STALKER].address)
            || (p.mlet === layout.S_GOLEM && p.address !== env.mons[layout.PM_FLESH_GOLEM].address && p.address !== env.mons[layout.PM_LEATHER_GOLEM].address)
            || (p.mlet === layout.S_PUDDING && p.address !== env.mons[layout.PM_BLACK_PUDDING].address); },
        OBJ_NAME(obj) { return pointer(global(8) + obj.oc_name_idx * layout.descrSize + layout.descr_oc_name); },
        IS_ROOM(typ) { return typ >= layout.ROOM; },
        get Hallucination() { const base = global(0) + layout.u_uprops;
            const read = (id, field) => view().getBigInt64(base + id * layout.propSize + layout['prop_' + field], true);
            return read(layout.HALLUC, 'intrinsic') !== 0n && !(read(layout.HALLUC_RES, 'intrinsic') || read(layout.HALLUC_RES, 'extrinsic')); },
        callLocal(fn, ...args) {return CAdapter.callWithStack(services,fn,...args);},
        coordLocal() { return coordPointer(services.stackAlloc(layout.coordxySize)); },
        intArrayLocal(length) { const at = address(services.stackAlloc(length * layout.intSize));
            const data = indexed(length, i => view().getInt32(at + i * layout.intSize, true),
                (i, v) => view().setInt32(at + i * layout.intSize, Number(v), true)); data.address = at; return data; },
    };
    env.VEGETARIAN_CLASS = layout.MAXOCLASSES + 1;
    env.newmextra = (...args) => mextra(services.newmextra(...args));
    for (const name of ['makemon', 'shop_keeper']) env[name] = (...args) => monster(services[name](...args));
    for (const name of ['mksobj_at', 'mkobj_at']) env[name] = (...args) => object(services[name](...args));
    env.mkclass = (...args) => permonst(services.mkclass(...args));
    env.Is_special = (...args) => { const at = address(services.Is_special(...args));
        return at ? { address: at, flags: { get town() { return services.specialTown(at); } } } : 0; };
    return env;
}
