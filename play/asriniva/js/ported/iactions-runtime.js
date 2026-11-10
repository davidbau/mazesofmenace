// Live native fields, command identities and header macros outside the TU.
export function createIactionsEnvironment(services, layout) {
    const widths = { pointerSize: 8, longSize: 8, intSize: 4, charSize: 1,
        charSigned: 1, booleanSize: 1, booleanSigned: 1, coordxySize: 2,
        coordxySigned: 1, CHAR_BIT: 8, obj_otyp_size: 2, obj_oclass_size: 1,
        obj_invlet_size: 1, obj_oartifact_size: 1, obj_quan_size: 8, obj_spe_size: 1,
        obj_owornmask_size: 8, obj_cobj_size: 8, obj_oextra_size: 8,
        extra_oname_size: 8, class_oc_uname_size: 8, class_oc_subtyp_size: 1,
        pm_mflags1_size: 8, pm_msize_size: 1, attack_aatyp_size: 1,
        terrain_typ_size: 1, any_a_int_size: 4, heroUxSize: 2, heroUySize: 2,
        MAIL_STRUCTURES: 1, ASSERT_ENABLED: 1 };
    for (const [key, value] of Object.entries(widths))
        if (layout[key] !== value) throw new Error('Review changed iactions ABI: ' + key);
    if (layout.attackCount < 3) throw new Error('Review changed iactions attacks');
    const address = value => Number(value?.address ?? value ?? 0);
    const global = index => address(services.global(index));
    const view = () => new DataView(services.heap().buffer);
    const pointer = at => Number(view().getBigUint64(at, true));
    const indexed = (length, get) => new Proxy({}, { get(target, key) {
        if (key === 'length') return length;
        return typeof key === 'string' && /^\d+$/.test(key) ? get(Number(key)) : Reflect.get(target, key);
    } });
    function object(value) {
        const at = address(value);
        if (!at) return 0;
        const result = { address: at,
            get otyp() { return view().getInt16(at + layout.obj_otyp, true); },
            get oclass() { return view().getInt8(at + layout.obj_oclass); },
            get invlet() { return view().getInt8(at + layout.obj_invlet); },
            get oartifact() { return view().getInt8(at + layout.obj_oartifact); },
            get quan() { return view().getBigInt64(at + layout.obj_quan, true); },
            get spe() { return view().getInt8(at + layout.obj_spe); },
            get owornmask() { return view().getBigInt64(at + layout.obj_owornmask, true); },
            get cobj() { return object(pointer(at + layout.obj_cobj)); },
            get oextra() { const p = pointer(at + layout.obj_oextra); return p ? {
                address: p, get oname() { return pointer(p + layout.extra_oname); },
            } : 0; },
        };
        for (const [index, field] of ['lamplit', 'dknown', 'unpaid', 'cknown', 'known'].entries())
            Object.defineProperty(result, field, { get() { return services.objectBit(at, index); } });
        return result;
    }
    function objectClass(at) {
        const result = { address: at,
            get oc_uname() { return pointer(at + layout.class_oc_uname); },
            get oc_skill() { return view().getInt8(at + layout.class_oc_subtyp); },
            get oc_armcat() { return view().getInt8(at + layout.class_oc_subtyp); },
        };
        for (const [index, field] of ['oc_name_known', 'oc_tough', 'oc_unique', 'oc_bimanual'].entries())
            Object.defineProperty(result, field, { get() { return services.objectClassBit(at, index); } });
        return result;
    }
    function permonst(at) {
        if (!at) return 0;
        return { address: at,
            get mflags1() { return view().getBigUint64(at + layout.pm_mflags1, true); },
            get msize() { return view().getUint8(at + layout.pm_msize); },
            mattk: indexed(layout.attackCount, index => ({
                get aatyp() { return view().getUint8(at + layout.pm_mattk + index * layout.attackSize + layout.attack_aatyp); },
            })),
        };
    }
    const monster = value => { const at = address(value); return at ? { address: at } : 0; };
    const objects = indexed(layout.NUM_OBJECTS, index => objectClass(global(0) + index * layout.objectClassSize));
    const is_weptool = obj => obj.oclass === layout.TOOL_CLASS && objects[obj.otyp].oc_skill !== layout.P_NONE;
    const is_ammo = obj => (obj.oclass === layout.WEAPON_CLASS || obj.oclass === layout.GEM_CLASS)
        && objects[obj.otyp].oc_skill >= -layout.P_CROSSBOW && objects[obj.otyp].oc_skill <= -layout.P_BOW;
    const env = { ...services, ...layout,
        get HEAP8() { return new Int8Array(services.heap().buffer); },
        get HEAPU8() { return services.heap(); },
        loadChar(at) { return view().getInt8(address(at)); },
        char(value) { return Number(value) << 24 >> 24; },
        object, monster, objects,
        u: {
            get ux() { return view().getInt16(global(1) + layout.heroUx, true); },
            get uy() { return view().getInt16(global(1) + layout.heroUy, true); },
            get uswallow() { return services.heroBit(0); },
            get twoweap() { return services.heroBit(1); },
        },
        gy: { get youmonst() { return { data: permonst(pointer(global(2) + layout.youmonst + layout.monsterData)) }; } },
        cg: { get zeroany() { return global(4) + layout.zeroany; } },
        get nul_glyphinfo() { return address(services.nulGlyphInfo()); },
        levl: indexed(layout.COLNO, x => indexed(layout.ROWNO, y => ({
            get typ() { return view().getInt8(global(3) + layout.levelTerrain + (x * layout.ROWNO + y) * layout.terrainSize + layout.terrain_typ); },
        }))),
        pointerLocal() {
            const at = address(services.stackAlloc(layout.pointerSize));
            return { address: at, get value() { return pointer(at); },
                set value(v) { view().setBigUint64(at, BigInt(address(v)), true); } };
        },
        anythingLocalCopy(source) {
            const at = address(services.stackAlloc(layout.anythingSize));
            services.heap().copyWithin(at, address(source), address(source) + layout.anythingSize);
            return { address: at, get a_int() { return view().getInt32(at + layout.any_a_int, true); },
                set a_int(v) { view().setInt32(at + layout.any_a_int, v, true); } };
        },
        menuItems(value) {
            const at = address(value);
            return { address: at, 0: { item: { get a_int() { return view().getInt32(at + layout.menu_item + layout.any_a_int, true); } } } };
        },
        has_oname(obj) { return !!obj.oextra && !!obj.oextra.oname; },
        ONAME(obj) { return obj.oextra.oname; },
        is_plural(obj) { return obj.quan !== 1n || (obj.oartifact === layout.ART_EYES_OF_THE_OVERWORLD
            && !services.undiscovered_artifact(layout.ART_EYES_OF_THE_OVERWORLD)); },
        Is_container(obj) { return obj.otyp >= layout.LARGE_BOX && obj.otyp <= layout.BAG_OF_TRICKS; },
        Has_contents(obj) { return !!obj.cobj; },
        plur(n) { return n === 1n ? "" : "s"; },
        is_weptool, is_ammo,
        is_launcher(obj) { return obj.oclass === layout.WEAPON_CLASS && objects[obj.otyp].oc_skill >= layout.P_BOW && objects[obj.otyp].oc_skill <= layout.P_CROSSBOW; },
        is_missile(obj) { return (obj.oclass === layout.WEAPON_CLASS || obj.oclass === layout.TOOL_CLASS)
            && objects[obj.otyp].oc_skill >= -layout.P_BOOMERANG && objects[obj.otyp].oc_skill <= -layout.P_DART; },
        ammo_and_launcher(a, l) { return is_ammo(a) && !!l && objects[a.otyp].oc_skill === -objects[l.otyp].oc_skill; },
        bimanual(obj) { return (obj.oclass === layout.WEAPON_CLASS || obj.oclass === layout.TOOL_CLASS) && !!objects[obj.otyp].oc_bimanual; },
        is_blade(obj) { return obj.oclass === layout.WEAPON_CLASS && objects[obj.otyp].oc_skill >= layout.P_DAGGER && objects[obj.otyp].oc_skill <= layout.P_SABER; },
        is_wet_towel(obj) { return obj.otyp === layout.TOWEL && obj.spe > 0; },
        is_graystone(obj) { return [layout.LUCKSTONE, layout.LOADSTONE, layout.FLINT, layout.TOUCHSTONE].includes(obj.otyp); },
        cantwield(p) { return (p.mflags1 & BigInt(layout.M1_NOHANDS)) !== 0n || p.msize < layout.MZ_SMALL; },
        could_twoweap(p) { return Number(p.mattk[0].aatyp === layout.AT_WEAP) + Number(p.mattk[1].aatyp === layout.AT_WEAP) + Number(p.mattk[2].aatyp === layout.AT_WEAP) > 1; },
        IS_ALTAR(typ) { return typ === layout.ALTAR; },
        carrying(...args) { return object(services.carrying(...args)); },
        wearmask_to_obj(...args) { return object(services.wearmask_to_obj(...args)); },
        shop_keeper(...args) { return monster(services.shop_keeper(...args)); },
    };
    for (const [index, field] of ['uwep', 'uswapwep', 'uquiver', 'uamul', 'uleft', 'uright', 'ublindf', 'uarms'].entries())
        Object.defineProperty(env, field, { get() { return object(services.equipment(index)); } });
    for (const [index, name] of ['dowield', 'remarm_swapwep', 'dowieldquiver', 'donull', 'doapply', 'dip_into',
        'docallcmd', 'dodrop', 'do_reqmenu', 'doeat', 'doengrave', 'dofire', 'doorganize', 'adjust_split',
        'dosacrifice', 'dopay', 'dodrink', 'doread', 'dorub', 'dothrow', 'ia_dotakeoff', 'dotip',
        'doinvoke', 'dowear', 'doswapweapon', 'dotwoweapon', 'dozap', 'dowhatis'].entries())
        Object.defineProperty(env, name, { get() { return services.command(index); } });
    for (const name of ['W_ARMOR', 'W_ACCESSORY', 'W_AMUL', 'W_RING', 'W_TOOL']) {
        if (!Number.isSafeInteger(layout[name])) throw new Error('Review iactions mask: ' + name);
        env[name] = BigInt(layout[name]);
    }
    return env;
}
