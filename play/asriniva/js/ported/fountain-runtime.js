// Live C storage and header macros; fountain and sink effects remain in fountain.js.
export function createFountainEnvironment(services, layout, namespace) {
    const widths = { pointerSize: 8, longSize: 8, intSize: 4, charSize: 1, charSigned: 1,
        booleanSize: 1, booleanSigned: 1, coordxySize: 2, coordxySigned: 1, CHAR_BIT: 8,
        u_ux_size: 2, u_uy_size: 2, u_uhunger_size: 4, u_utrap_size: 4,
        u_utraptype_size: 4, u_uluck_size: 1, u_ulevel_size: 4,
        obj_nobj_size: 8, obj_otyp_size: 2, obj_oclass_size: 1, obj_oartifact_size: 1,
        obj_spe_size: 1, obj_quan_size: 8, obj_corpsenm_size: 4, mon_nmon_size: 8,
        mon_data_size: 8, mon_mx_size: 2, mon_my_size: 2, mon_mhp_size: 4,
        pm_mflags1_size: 8, class_oc_cost_size: 2, class_oc_descr_idx_size: 2,
        descr_oc_descr_size: 8, prop_intrinsic_size: 8, prop_extrinsic_size: 8,
        prop_blocked_size: 8, terrain_typ_size: 1, level_dnum_size: 2, level_dlevel_size: 2,
        gender_his_size: 8, gender_he_size: 8, gender_him_size: 8, mvital_mvflags_size: 1,
        attrSize: 1, alignmentSize: 1, roleMnumSize: 2, femaleSize: 1, wizardSize: 1,
        botlSize: 1, SND_LIB_INTEGRATED: 0 };
    for (const [key, width] of Object.entries(widths))
        if (layout[key] !== width) throw new Error('Review changed fountain ABI: ' + key);
    const address = value => Number(value?.address ?? value ?? 0);
    const global = index => address(services.global(index));
    const view = () => new DataView(services.heap().buffer);
    const pointer = at => Number(view().getBigUint64(at, true));
    const int = value => typeof value === 'bigint' ? Number(BigInt.asIntN(32, value)) : value | 0;
    const coordxy = value => (int(value) << 16) >> 16;
    const long = value => BigInt.asIntN(64, BigInt(value));
    const scalar = (target, name, at, kind) => Object.defineProperty(target, name, {
        get() { return view()['get' + kind](at(), true); },
        set(value) { view()['set' + kind](at(), kind.includes('Big') ? BigInt(value) : Number(value), true); },
    });
    const indexed = (length, get, set) => new Proxy({}, {
        get(target, key) { if (key === 'length') return length;
            return typeof key === 'string' && /^-?\d+$/.test(key) ? get(Number(key)) : Reflect.get(target, key); },
        set(target, key, value) { if (set && typeof key === 'string' && /^-?\d+$/.test(key)) {
            set(Number(key), value); return true; } return Reflect.set(target, key, value); },
    });
    function object(value) {
        const at = address(value);
        if (!at) return 0;
        const result = { address: at };
        for (const [field, kind] of [['otyp', 'Int16'], ['oclass', 'Int8'], ['oartifact', 'Int8'],
            ['spe', 'Int8'], ['quan', 'BigInt64'], ['corpsenm', 'Int32']])
            scalar(result, field, () => at + layout['obj_' + field], kind);
        Object.defineProperty(result, 'nobj', { get() { return object(pointer(at + layout.obj_nobj)); } });
        Object.defineProperty(result, 'fromsink', { get() { return result.corpsenm; }, set(v) { result.corpsenm = v; } });
        for (const [index, field] of ['cursed', 'blessed', 'oerodeproof', 'oeroded', 'oeroded2', 'dknown'].entries())
            Object.defineProperty(result, field, { get() { return services.objectBit(at, index); },
                set(v) { services.setObjectBit(at, index, Number(v)); } });
        return result;
    }
    function permonst(value) {
        const at = address(value);
        if (!at) return 0;
        const result = { address: at };
        scalar(result, 'mflags1', () => at + layout.pm_mflags1, 'BigUint64');
        return result;
    }
    function monster(value) {
        const at = address(value);
        if (!at) return 0;
        const result = { address: at };
        for (const [field, kind] of [['mx', 'Int16'], ['my', 'Int16'], ['mhp', 'Int32']])
            scalar(result, field, () => at + layout['mon_' + field], kind);
        Object.defineProperties(result, {
            data: { get() { return permonst(pointer(at + layout.mon_data)); } },
            nmon: { get() { return monster(pointer(at + layout.mon_nmon)); } },
        });
        for (const [index, field] of ['msleeping', 'mpeaceful'].entries())
            Object.defineProperty(result, field, { get() { return services.monsterBit(at, index); },
                set(v) { services.setMonsterBit(at, index, Number(v)); } });
        return result;
    }
    function level(value) {
        const at = address(value), result = { address: at };
        for (const field of ['dnum', 'dlevel']) scalar(result, field, () => at + layout['level_' + field], 'Int16');
        return result;
    }
    function intPointer(value) {
        const at = address(value), result = { address: at };
        scalar(result, 'value', () => at, 'Int32');
        return result;
    }
    const u = { ualign: {} };
    for (const [field, kind] of [['ux', 'Int16'], ['uy', 'Int16'], ['uhunger', 'Int32'],
        ['utrap', 'Uint32'], ['utraptype', 'Uint32'], ['uluck', 'Int8'], ['ulevel', 'Int32']])
        scalar(u, field, () => global(0) + layout['u_' + field], kind);
    scalar(u.ualign, 'type', () => global(0) + layout.u_alignment, 'Int8');
    Object.defineProperty(u, 'uz', { get() { return level(global(0) + layout.u_uz); } });
    for (const field of ['acurr', 'amax']) u[field] = { a: indexed(layout.A_MAX,
        i => view().getInt8(global(0) + layout['u_' + field] + i),
        (i, v) => view().setInt8(global(0) + layout['u_' + field] + i, Number(v))) };
    const propAt = (id, field) => global(0) + layout.u_uprops + id * layout.propSize + layout['prop_' + field];
    const prop = (id, field = 'intrinsic') => view().getBigInt64(propAt(id, field), true);
    const active = id => prop(id) !== 0n || prop(id, 'extrinsic') !== 0n;
    const flag = (p, key) => (p.mflags1 & BigInt(layout[key])) !== 0n;
    const terrain = (x, y) => ({
        get typ() { return view().getInt8(global(4) + layout.terrain + (x * layout.ROWNO + y) * layout.terrainSize + layout.terrain_typ); },
        get flags() { return services.terrainFlags(x, y); }, set flags(v) { services.setTerrainFlags(x, y, Number(v)); },
        get looted() { return services.terrainBit(x, y, 0); }, set looted(v) { services.setTerrainBit(x, y, 0, Number(v)); },
        get blessedftn() { return services.terrainBit(x, y, 1); }, set blessedftn(v) { services.setTerrainBit(x, y, 1, Number(v)); },
    });
    const env = { ...services, ...layout, object, monster, permonst, level, intPointer, int, coordxy, long,
        boolean(value) { return (int(value) << 24) >> 24; }, u,
        get HEAP8() { return new Int8Array(services.heap().buffer); }, get HEAPU8() { return services.heap(); },
        get hands_obj() { return object(services.hands()); }, get uarmg() { return object(services.equipment(0)); },
        get fmon() { return monster(pointer(global(4) + layout.fmon)); },
        get WIN_MESSAGE() { return services.winMessage(); },
        get wizard() { return view().getInt8(global(7) + layout.wizard); },
        get something() { return address(services.commonString(0)); },
        get nothing_seems_to_happen() { return address(services.commonString(1)); },
        gy: { get youmonst() { return monster(global(1) + layout.youmonst); } },
        gi: { get invent() { return object(pointer(global(2) + layout.inventory)); } },
        disp: { get botl() { return view().getInt8(global(6) + layout.botl); },
            set botl(v) { view().setInt8(global(6) + layout.botl, Number(v)); } },
        svm: { mvitals: indexed(layout.NUMMONS, i => ({
            get mvflags() { return view().getUint8(global(3) + layout.mvitals + i * layout.mvitalSize + layout.mvital_mvflags); },
        })) },
        levl: indexed(layout.COLNO, x => indexed(layout.ROWNO, y => terrain(x, y))),
        svl: { level: { objects: indexed(layout.COLNO, x => indexed(layout.ROWNO,
            y => object(pointer(global(4) + layout.floorObjects + (x * layout.ROWNO + y) * layout.pointerSize)))) } },
        mons: indexed(layout.NUMMONS + 1, i => permonst(global(8) + i * layout.permonstSize)),
        objects: indexed(layout.NUM_OBJECTS, i => { const at = global(9) + i * layout.objectClassSize;
            return { address: at, get oc_cost() { return view().getInt16(at + layout.class_oc_cost, true); },
                get oc_descr_idx() { return view().getInt16(at + layout.class_oc_descr_idx, true); } }; }),
        m_at(x, y) { return monster(pointer(global(4) + layout.floorMonsters + (x * layout.ROWNO + y) * layout.pointerSize)); },
        OBJ_DESCR(obj) { return pointer(global(10) + obj.oc_descr_idx * layout.objDescrSize + layout.descr_oc_descr); },
        cansee(x, y) { const rows = pointer(global(11) + layout.vizArray);
            return (view().getUint8(pointer(rows + y * layout.pointerSize) + x) & layout.IN_SIGHT) !== 0; },
        couldsee(x, y) { const rows = pointer(global(11) + layout.vizArray);
            return (view().getUint8(pointer(rows + y * layout.pointerSize) + x) & layout.COULD_SEE) !== 0; },
        mhis(mon) { return pointer(global(12) + services.pronoun_gender(mon, layout.PRONOUN_HALLU) * layout.genderSize + layout.gender_his); },
        mhe(mon) { return pointer(global(12) + services.pronoun_gender(mon, layout.PRONOUN_HALLU) * layout.genderSize + layout.gender_he); },
        uhim() { const female = view().getInt8(global(7) + layout.female); return pointer(global(12) + (female ? 1 : 0) * layout.genderSize + layout.gender_him); },
        Role_if(id) { return view().getInt16(global(5) + layout.roleMnum, true) === id; },
        ACURR(id) { return services.acurr(id); },
        u_at(x, y) { return u.ux === x && u.uy === y; },
        min(a, b) { return a < b ? a : b; },
        DEADMONSTER(mon) { return mon.mhp < 1; },
        IS_FOUNTAIN(typ) { return typ === layout.FOUNTAIN; },
        FOUNTAIN_IS_LOOTED(x, y) { return terrain(x, y).looted & layout.F_LOOTED; },
        FOUNTAIN_IS_WARNED(x, y) { return terrain(x, y).looted & layout.F_WARNED; },
        SET_FOUNTAIN_LOOTED(x, y) { terrain(x, y).looted |= layout.F_LOOTED; },
        SET_FOUNTAIN_WARNED(x, y) { terrain(x, y).looted |= layout.F_WARNED; },
        CLEAR_FOUNTAIN_LOOTED(x, y) { terrain(x, y).looted &= ~layout.F_LOOTED; },
        is_watch(p) { return p.address === env.mons[layout.PM_WATCHMAN].address || p.address === env.mons[layout.PM_WATCH_CAPTAIN].address; },
        nolimbs(p) { return (p.mflags1 & BigInt(layout.M1_NOLIMBS)) === BigInt(layout.M1_NOLIMBS); },
        breathless(p) { return flag(p, 'M1_BREATHLESS'); }, haseyes(p) { return !flag(p, 'M1_NOEYES'); },
        canspotmon(mon) { return !!(services.canseemon(mon) || services.sensemon(mon)); },
        glyph_is_cmap(glyph) { return glyph >= layout.GLYPH_CMAP_STONE_OFF && glyph < layout.GLYPH_CMAP_C_OFF + layout.S_goodpos - layout.S_digbeam + 1; },
        get Blind() { return active(layout.BLINDED) && prop(layout.BLINDED, 'blocked') === 0n; },
        get Deaf() { return active(layout.DEAF) || !!services.heroBit(0); },
        get Hallucination() { return prop(layout.HALLUC) !== 0n && !active(layout.HALLUC_RES); },
        get Levitation() { return active(layout.LEVITATION) && prop(layout.LEVITATION, 'blocked') === 0n; },
        get Invisible() { return active(layout.INVIS) && prop(layout.INVIS, 'blocked') === 0n && !active(layout.SEE_INVIS); },
        get Poison_resistance() { return active(layout.POISON_RES); }, get Fire_resistance() { return active(layout.FIRE_RES); },
        get Unchanging() { return active(layout.UNCHANGING); }, get Glib() { return prop(layout.GLIB); },
        get HSee_invisible() { return prop(layout.SEE_INVIS); },
        set HSee_invisible(v) { view().setBigInt64(propAt(layout.SEE_INVIS, 'intrinsic'), long(v), true); },
        pline1(msg) { return services.pline('%s', msg); },
        intLocal() { return intPointer(services.stackAlloc(layout.intSize)); },
        monsterPointerLocal() { const at = address(services.stackAlloc(layout.pointerSize));
            return { address: at, get value() { return monster(pointer(at)); },
                set value(v) { view().setBigUint64(at, BigInt(address(v)), true); } }; },
        do_clear_area(x, y, radius, fn, payload) {
            if (fn !== namespace.gush) throw new Error('Unexpected fountain clear-area callback');
            return services.do_clear_area(x, y, radius, payload);
        },
        get_iter_mons(fn) {
            if (fn !== namespace.watchman_warn_fountain) throw new Error('Unexpected fountain monster callback');
            return monster(services.get_iter_mons());
        },
    };
    for (const key of ['FROMOUTSIDE', 'LL_ARTIFACT']) {
        if (!Number.isSafeInteger(layout[key])) throw new Error('Review fountain mask: ' + key);
        env[key] = BigInt(layout[key]);
    }
    for (const name of ['makemon']) env[name] = (...args) => monster(services[name](...args));
    for (const name of ['mksobj_at', 'mkobj', 'mkobj_at', 'oname']) env[name] = (...args) => object(services[name](...args));
    env.t_at = (...args) => { const at = address(services.t_at(...args)); return at ? { address: at } : 0; };
    return env;
}
