import * as CAdapter from '../../c-runtime/adapter-factories.js';
// C storage and header macros; sitting and curse decisions remain in sit.js.
export function createSitEnvironment(services, layout) {
    const widths = { pointerSize: 8, longSize: 8, intSize: 4, charSize: 1, charSigned: 1,
        booleanSize: 1, booleanSigned: 1, coordxySize: 2, coordxySigned: 1, CHAR_BIT: 8,
        u_ux_size: 2, u_uy_size: 2, u_mh_size: 4, u_mhmax_size: 4, u_uhp_size: 4,
        u_uhpmax_size: 4, u_uhppeak_size: 4, u_ucreamed_size: 4, u_uluck_size: 1, u_moreluck_size: 1,
        u_ulevel_size: 4, u_ulevelmax_size: 4, u_umonnum_size: 4, u_umonster_size: 4,
        u_uhunger_size: 4, u_utrap_size: 4, u_utraptype_size: 4, u_usteed_size: 8, u_ustuck_size: 8,
        obj_nobj_size: 8, obj_otyp_size: 2, obj_oclass_size: 1, obj_oartifact_size: 1,
        obj_spe_size: 1, obj_quan_size: 8, obj_owt_size: 4, obj_corpsenm_size: 4,
        pm_mflags1_size: 8, pm_mflags2_size: 8, pm_mlet_size: 1, class_oc_nutrition_size: 2,
        prop_intrinsic_size: 8, prop_extrinsic_size: 8, prop_blocked_size: 8,
        terrain_typ_size: 1, level_dnum_size: 2, level_dlevel_size: 2,
        dungeon_num_dunlevs_size: 2, symdef_explanation_size: 8, gender_his_size: 8,
        seenSize: 1, debugFuzzerSize: 1, femaleSize: 1, wizardSize: 1, botlSize: 1,
        SND_LIB_INTEGRATED: 0 };
    for (const [key, width] of Object.entries(widths))
        if (layout[key] !== width) throw new Error('Review changed sit ABI: ' + key);
    const address = value => Number(value?.address ?? value ?? 0);
    const global = index => address(services.global(index));
    const view = () => CAdapter.currentDataView(services);
    const pointer = at => CAdapter.readPointerNumber(view,at);
    const int = v => CAdapter.signedInt(v);
    const long = v => BigInt.asIntN(64, BigInt(v));
    const scalar = (target, name, at, kind) => Object.defineProperty(target, name, {
        get() { return view()['get' + kind](at(), true); },
        set(v) { view()['set' + kind](at(), kind.includes('Big') ? BigInt(v) : Number(v), true); },
    });
    const indexed = (length, get) => new Proxy({}, { get(target, key) {
        if (key === 'length') return length;
        return typeof key === 'string' && /^-?\d+$/.test(key) ? get(Number(key)) : Reflect.get(target, key);
    } });
    function object(value) {
        const at = address(value);
        if (!at) return 0;
        const result = { address: at };
        for (const [field, kind] of [['otyp', 'Int16'], ['oclass', 'Int8'], ['oartifact', 'Int8'],
            ['spe', 'Int8'], ['quan', 'BigInt64'], ['owt', 'Uint32'], ['corpsenm', 'Int32']])
            scalar(result, field, () => at + layout['obj_' + field], kind);
        Object.defineProperty(result, 'nobj', { get() { return object(pointer(at + layout.obj_nobj)); } });
        for (const [index, field] of ['greased', 'blessed', 'known', 'cursed', 'bknown'].entries())
            Object.defineProperty(result, field, { get() { return services.objectBit(at, index); },
                set(v) { services.setObjectBit(at, index, Number(v)); } });
        return result;
    }
    function permonst(value) {
        const at = address(value);
        if (!at) return 0;
        const result = { address: at };
        for (const [field, kind] of [['mflags1', 'BigUint64'], ['mflags2', 'BigUint64'], ['mlet', 'Int8']])
            scalar(result, field, () => at + layout['pm_' + field], kind);
        return result;
    }
    function monster(value) {
        const at = address(value);
        return at ? { address: at, get data() { return permonst(pointer(at + layout.monsterData)); } } : 0;
    }
    function level(value) {
        const at = address(value), result = { address: at };
        for (const field of ['dnum', 'dlevel']) scalar(result, field, () => at + layout['level_' + field], 'Int16');
        return result;
    }
    const u = { uhave: {}, uevent: {} };
    for (const [field, kind] of [['ux', 'Int16'], ['uy', 'Int16'], ['mh', 'Int32'], ['mhmax', 'Int32'],
        ['uhp', 'Int32'], ['uhpmax', 'Int32'], ['uhppeak', 'Int32'], ['ucreamed', 'Uint32'],
        ['uluck', 'Int8'], ['moreluck', 'Int8'], ['ulevel', 'Int32'], ['ulevelmax', 'Int32'],
        ['umonnum', 'Int32'], ['umonster', 'Int32'], ['uhunger', 'Int32'], ['utrap', 'Uint32'], ['utraptype', 'Uint32']])
        scalar(u, field, () => global(0) + layout['u_' + field], kind);
    Object.defineProperties(u, {
        uz: { get() { return level(global(0) + layout.u_uz); } },
        usteed: { get() { return monster(pointer(global(0) + layout.u_usteed)); } },
        ustuck: { get() { return monster(pointer(global(0) + layout.u_ustuck)); } },
        uundetected: { get() { return services.heroBit(1); }, set(v) { services.setHeroBit(1, Number(v)); } },
        uswallow: { get() { return services.heroBit(2); } },
    });
    Object.defineProperty(u.uhave, 'amulet', { get() { return services.heroBit(0); } });
    Object.defineProperty(u.uevent, 'uhand_of_elbereth', { get() { return services.heroBit(3); } });
    const propAt = (id, field) => global(0) + layout.u_uprops + id * layout.propSize + layout['prop_' + field];
    const prop = (id, field = 'intrinsic') => view().getBigInt64(propAt(id, field), true);
    const active = id => prop(id) !== 0n || prop(id, 'extrinsic') !== 0n;
    const flag = (p, key, group = 'mflags1') => (p[group] & BigInt(layout[key])) !== 0n;
    const terrain = (x, y) => ({
        get typ() { return view().getInt8(global(6) + layout.terrain + (x * layout.ROWNO + y) * layout.terrainSize + layout.terrain_typ); },
        set typ(v) { view().setInt8(global(6) + layout.terrain + (x * layout.ROWNO + y) * layout.terrainSize + layout.terrain_typ, Number(v)); },
        get flags() { return services.terrainFlags(x, y); }, set flags(v) { services.setTerrainFlags(x, y, Number(v)); },
    });
    const floorObjects = indexed(layout.COLNO, x => indexed(layout.ROWNO,
        y => object(pointer(global(6) + layout.floorObjects + (x * layout.ROWNO + y) * layout.pointerSize))));
    const env = { ...services, ...layout, int, long, object, permonst, monster, level, u,
        get HEAP8() {return CAdapter.currentInt8View(services);}, get HEAPU8() { return services.heap(); },
        get Luck() { return u.uluck + u.moreluck; }, get Upolyd() { return u.umonnum !== u.umonster; },
        get wizard() { return view().getInt8(global(3) + layout.wizard); },
        flags: { get female() { return view().getInt8(global(3) + layout.female); } },
        iflags: { get debug_fuzzer() { return view().getInt8(global(4) + layout.debugFuzzer); } },
        disp: { get botl() { return view().getInt8(global(5) + layout.botl); },
            set botl(v) { view().setInt8(global(5) + layout.botl, Number(v)); } },
        gy: { get youmonst() { return monster(global(1) + layout.youmonst); } },
        gi: { get invent() { return object(pointer(global(2) + layout.inventory)); } },
        levl: indexed(layout.COLNO, x => indexed(layout.ROWNO, y => terrain(x, y))),
        svl: { level: { objects: floorObjects, flags: { get nommap() { return services.levelBit(0); } } } },
        svd: { dungeons: indexed(layout.dungeonCount, i => ({
            get num_dunlevs() { return view().getInt16(global(7) + layout.dungeons + i * layout.dungeonSize + layout.dungeon_num_dunlevs, true); },
        })) },
        cg: { get zeroobj() { return global(8) + layout.zeroobj; } },
        mons: indexed(layout.NUMMONS + 1, i => permonst(global(10) + i * layout.permonstSize)),
        objects: indexed(layout.NUM_OBJECTS, i => {
            const at = global(11) + i * layout.objectClassSize;
            return { address: at, get oc_nutrition() { return view().getUint16(at + layout.class_oc_nutrition, true); },
                get oc_material() { return services.objectClassBit(at, 0); } };
        }),
        defsyms: indexed(layout.MAXPCHARS + 1, i => ({
            get explanation() { return pointer(global(12) + i * layout.symdefSize + layout.symdef_explanation); },
        })),
        get Never_mind() { return address(services.commonString(0)); }, get NH_BLACK() { return address(services.commonString(1)); },
        mhis(mon) { const index = services.pronoun_gender(mon, layout.PRONOUN_HALLU); return pointer(global(13) + index * layout.genderSize + layout.gender_his); },
        cansee(x, y) { const rows = pointer(global(9) + layout.vizArray); return (view().getUint8(pointer(rows + y * layout.pointerSize) + x) & layout.IN_SIGHT) !== 0; },
        OBJ_AT(x, y) { return !!floorObjects[x][y]; },
        Is_waterlevel(lev) { const target = level(global(7) + layout.waterLevel); return (target.dnum !== 0 || target.dlevel !== 0) && !!services.on_level(lev, target); },
        get Underwater() { return services.heroBit(4); },
        get Blind() { return active(layout.BLINDED) && prop(layout.BLINDED, 'blocked') === 0n; },
        get Deaf() { return active(layout.DEAF) || !!services.heroBit(5); },
        get Hallucination() { return prop(layout.HALLUC) !== 0n && !active(layout.HALLUC_RES); },
        get Levitation() { return active(layout.LEVITATION) && prop(layout.LEVITATION, 'blocked') === 0n; },
        get Flying() { return (active(layout.FLYING) || (!!u.usteed && flag(u.usteed.data, 'M1_FLY'))) && prop(layout.FLYING, 'blocked') === 0n; },
        get Slimed() { return prop(layout.SLIMED); }, get See_invisible() { return active(layout.SEE_INVIS); },
        get Blind_telepat() { return active(layout.TELEPAT); }, get BlindedTimeout() { return prop(layout.BLINDED) & BigInt(layout.TIMEOUT); },
        u_wield_art(id) { return services.is_art(env.uwep, id); },
        is_hider(p) { return flag(p, 'M1_HIDE'); }, humanoid(p) { return flag(p, 'M1_HUMANOID'); },
        slithy(p) { return flag(p, 'M1_SLITHY'); }, amorphous(p) { return flag(p, 'M1_AMORPHOUS'); },
        lays_eggs(p) { return flag(p, 'M1_OVIPAROUS'); },
        eggs_in_water(p) { return flag(p, 'M1_OVIPAROUS') && p.mlet === layout.S_EEL && flag(p, 'M1_SWIM'); },
        is_prince(p) { return flag(p, 'M2_PRINCE', 'mflags2'); }, is_vampire(p) { return p.mlet === layout.S_VAMPIRE; },
        eyecount(p) { return flag(p, 'M1_NOEYES') ? 0 : (p.address === env.mons[layout.PM_CYCLOPS].address || p.address === env.mons[layout.PM_FLOATING_EYE].address) ? 1 : 2; },
        likes_lava(p) { return p.address === env.mons[layout.PM_FIRE_ELEMENTAL].address || p.address === env.mons[layout.PM_SALAMANDER].address; },
        Is_box(obj) { return obj.otyp === layout.LARGE_BOX || obj.otyp === layout.CHEST; },
        IS_SINK(typ) { return typ === layout.SINK; }, IS_ALTAR(typ) { return typ === layout.ALTAR; },
        IS_GRAVE(typ) { return typ === layout.GRAVE; }, IS_THRONE(typ) { return typ === layout.THRONE; },
        levelLocal() { return level(services.stackAlloc(layout.levelSize)); },
        objectLocalCopy(source) { const at = address(services.stackAlloc(layout.objectSize));
            services.heap().copyWithin(at, address(source), address(source) + layout.objectSize); return object(at); },
        t_at(...args) { const at = address(services.t_at(...args)); return at ? { address: at, get ttyp() { return services.trapType(at); } } : 0; },
        mksobj(...args) { return object(services.mksobj(...args)); }, which_armor(...args) { return object(services.which_armor(...args)); },
    };
    const intrinsic = { HFire_resistance: 'FIRE_RES', HTeleportation: 'TELEPORT', HPoison_resistance: 'POISON_RES',
        HTelepat: 'TELEPAT', HCold_resistance: 'COLD_RES', HInvis: 'INVIS', HSee_invisible: 'SEE_INVIS',
        HFast: 'FAST', HStealth: 'STEALTH', HProtection: 'PROTECTION', HAggravate_monster: 'AGGRAVATE_MONSTER', HConfusion: 'CONFUSION' };
    for (const [name, key] of Object.entries(intrinsic)) Object.defineProperty(env, name, {
        get() { return prop(layout[key]); }, set(v) { view().setBigInt64(propAt(layout[key], 'intrinsic'), long(v), true); },
    });
    const abilities = { Fire_resistance: 'FIRE_RES', Cold_resistance: 'COLD_RES', Shock_resistance: 'SHOCK_RES',
        Drain_resistance: 'DRAIN_RES', Acid_resistance: 'ACID_RES', Antimagic: 'ANTIMAGIC',
        Half_spell_damage: 'HALF_SPDAM', Half_physical_damage: 'HALF_PHDAM' };
    for (const [name, key] of Object.entries(abilities)) Object.defineProperty(env, name, { get() { return active(layout[key]); } });
    for (const [i, field] of ['uwep', 'uarm', 'uarmf'].entries()) Object.defineProperty(env, field, { get() { return object(services.equipment(i)); } });
    for (const key of ['INTRINSIC', 'TIMEOUT', 'FROMOUTSIDE', 'W_SADDLE', 'SPFX_INTEL']) {
        if (!Number.isSafeInteger(layout[key])) throw new Error('Review sit mask: ' + key);
        env[key] = BigInt(layout[key]);
    }
    return env;
}
