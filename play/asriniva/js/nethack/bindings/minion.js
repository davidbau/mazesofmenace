import * as CAdapter from '../../c-runtime/adapter-factories.js';
import { elementals_initial } from '../../ported/minion.js';

// Live C storage and header macros; minion decisions remain in minion.js.
export function createMinionEnvironment(services, layout, tables) {
    if (layout.pointerSize !== 8 || layout.longSize !== 8 || layout.intSize !== 4
        || layout.charSize !== 1 || !layout.charSigned || layout.CHAR_BIT !== 8
        || layout.booleanSize !== 1 || !layout.booleanSigned
        || layout.coordxySize !== 2 || !layout.coordxySigned
        || layout.mon_m_id_size !== 4 || layout.mon_mhp_size !== 4
        || layout.mon_mhpmax_size !== 4 || layout.mon_mtame_size !== 1
        || layout.mon_m_lev_size !== 1 || layout.mon_cham_size !== 2
        || layout.mon_mstrategy_size !== 8 || layout.pm_mflags2_size !== 8
        || layout.pm_maligntyp_size !== 1 || layout.pm_mlet_size !== 1
        || layout.pm_geno_size !== 2 || layout.heroPetsSize !== 8
        || layout.multiSize !== 8 || layout.obj_spe_size !== 1 || layout.obj_otyp_size !== 2)
        throw new Error('Review changed minion ABI');
    const widths = {
        mon_nmon_size: 8, mon_data_size: 8, mon_mextra_size: 8, mon_mx_size: 2, mon_my_size: 2,
        pm_pmidx_size: 4, mx_emin_size: 8, mx_epri_size: 8, emin_parentmid_size: 4,
        emin_min_align_size: 1, emin_renegade_size: 1, epri_shralign_size: 1,
        coord_x_size: 2, coord_y_size: 2, level_dnum_size: 2, level_dlevel_size: 2,
        prop_intrinsic_size: 8, prop_extrinsic_size: 8, prop_blocked_size: 8,
        mvital_mvflags_size: 1, heroUxSize: 2, heroUySize: 2, heroAlignTypeSize: 1,
        heroAlignRecordSize: 4, inventorySize: 8, femaleSize: 1, botlSize: 1, monlistSize: 8,
        SND_LIB_INTEGRATED: 0,
    };
    for (const [key, width] of Object.entries(widths))
        if (layout[key] !== width) throw new Error('Review changed minion ABI: ' + key);
    for (const key of ['NON_PM', 'A_CHAOTIC', 'A_NONE', 'STRAT_APPEARMSG', 'M2_DEMON', 'M2_LORD', 'M2_PRINCE', 'M2_MINION'])
        if (!Number.isSafeInteger(layout[key])) throw new Error('Review minion constant: ' + key);
    const address = v => Number(v?.address ?? v ?? 0);
    const global = i => address(services.global(i));
    const view = () => CAdapter.currentDataView(services);
    const pointer = at => CAdapter.readPointerNumber(view,at);
    const int = v => CAdapter.signedInt(v);
    const long = v => BigInt.asIntN(64, BigInt(v));
    const indexed = (length, getter) => new Proxy({}, { get(target, key) {
        if (key === 'length') return length;
        return typeof key === 'string' && /^\d+$/.test(key) ? getter(Number(key)) : Reflect.get(target, key);
    } });
    function fields(at, descriptors) {
        const result = { address: at };
        for (const [name, offset, kind] of descriptors)
            Object.defineProperty(result, name, {
                get() { return view()['get' + kind](at + offset, true); },
                set(v) { view()['set' + kind](at + offset, kind.includes('Big') ? BigInt(v) : Number(v), true); },
            });
        return result;
    }
    function permonst(value) {
        const at = address(value);
        return at ? fields(at, [['pmidx', layout.pm_pmidx, 'Int32'], ['mlet', layout.pm_mlet, 'Int8'],
            ['maligntyp', layout.pm_maligntyp, 'Int8'], ['geno', layout.pm_geno, 'Uint16'],
            ['mflags2', layout.pm_mflags2, 'BigUint64']]) : 0;
    }
    function emin(value) {
        const at = address(value);
        return at ? fields(at, [['parentmid', layout.emin_parentmid, 'Uint32'],
            ['min_align', layout.emin_min_align, 'Int8'], ['renegade', layout.emin_renegade, 'Int8']]) : 0;
    }
    function mextra(value) {
        const at = address(value);
        if (!at) return 0;
        return { address: at,
            get emin() { return emin(pointer(at + layout.mx_emin)); },
            set emin(v) { view().setBigUint64(at + layout.mx_emin, BigInt(address(v)), true); },
            get epri() { const p = pointer(at + layout.mx_epri); return p ? fields(p, [['shralign', layout.epri_shralign, 'Int8']]) : 0; },
        };
    }
    function monster(value) {
        const at = address(value);
        if (!at) return 0;
        const result = fields(at, ['m_id:Uint32', 'mx:Int16', 'my:Int16', 'mhp:Int32', 'mhpmax:Int32',
            'mtame:Int8', 'm_lev:Uint8', 'cham:Int16', 'mstrategy:BigUint64'].map(s => {
            const [name, kind] = s.split(':'); return [name, layout['mon_' + name], kind];
        }));
        Object.defineProperties(result, {
            nmon: { get() { return monster(pointer(at + layout.mon_nmon)); } },
            data: { get() { return permonst(pointer(at + layout.mon_data)); } },
            mextra: { get() { return mextra(pointer(at + layout.mon_mextra)); },
                set(v) { view().setBigUint64(at + layout.mon_mextra, BigInt(address(v)), true); } },
        });
        for (const [i, name] of ['isgd', 'ispriest', 'isminion', 'mpeaceful', 'minvis', 'perminvis'].entries())
            Object.defineProperty(result, name, { get() { return services.monsterBit(at, i); },
                set(v) { services.setMonsterBit(at, i, Number(v)); } });
        return result;
    }
    function object(value) {
        const at = address(value);
        return at ? fields(at, [['otyp', layout.obj_otyp, 'Int16'], ['spe', layout.obj_spe, 'Int8']]) : 0;
    }
    const level = at => fields(at, [['dnum', layout.level_dnum, 'Int16'], ['dlevel', layout.level_dlevel, 'Int16']]);
    const prop = (id, field) => view().getBigInt64(global(0) + layout.heroProps + id * layout.propSize + layout['prop_' + field], true);
    const active = id => prop(id, 'intrinsic') !== 0n || prop(id, 'extrinsic') !== 0n;
    const hasFlag = (p, flag) => (p.mflags2 & BigInt(layout[flag])) !== 0n;
    const u = {
        get ux() { return view().getInt16(global(0) + layout.heroUx, true); },
        get uy() { return view().getInt16(global(0) + layout.heroUy, true); },
        get uz() { return level(global(0) + layout.heroUz); },
        ualign: { get type() { return view().getInt8(global(0) + layout.heroAlignType); },
            get record() { return view().getInt32(global(0) + layout.heroAlignRecord, true); } },
        uconduct: { get pets() { return view().getBigInt64(global(0) + layout.heroPets, true); },
            set pets(v) { view().setBigInt64(global(0) + layout.heroPets, long(v), true); } },
    };
    const env = {
        ...services, ...layout, STRAT_APPEARMSG: BigInt(layout.STRAT_APPEARMSG),
        LL_UMONST: BigInt(layout.LL_UMONST), W_ARMS: BigInt(layout.W_ARMS),
        get HEAP8() {return CAdapter.currentInt8View(services);},
        get HEAPU8() { return services.heap(); },
        int, long, boolean(v) { return int(v) << 24 >> 24; }, coordxy(v) { return int(v) << 16 >> 16; },
        monster, permonst, object, mextra, emin,
        elementals: (tables?.elementals_initial ?? elementals_initial).map(name => layout[name]),
        mons: indexed(layout.NUMMONS + 1, i => permonst(global(9) + i * layout.permonstSize)),
        get fmon() { return monster(pointer(global(8) + layout.monlist)); },
        get uwep() { return object(services.uwep()); }, u,
        gy: { get youmonst() { return monster(global(1) + layout.youmonst); } },
        gi: { get invent() { return object(pointer(global(2) + layout.inventory)); } },
        gm: { get multi() { return view().getBigInt64(global(3) + layout.multi, true); } },
        svm: { mvitals: indexed(layout.NUMMONS, i => fields(global(4) + layout.mvitals + i * layout.mvitalSize,
            [['mvflags', layout.mvital_mvflags, 'Uint8']])) },
        flags: { get female() { return view().getInt8(global(6) + layout.female); } },
        disp: { get botl() { return view().getInt8(global(7) + layout.botl); },
            set botl(v) { view().setInt8(global(7) + layout.botl, Number(v)); } },
        get Blind() { return active(layout.BLINDED) && prop(layout.BLINDED, 'blocked') === 0n; },
        get Deaf() { return active(layout.DEAF) || !!services.roleplayDeaf(); },
        get Conflict() { return active(layout.CONFLICT); },
        get Inhell() { return services.In_hell(u.uz); },
        In_endgame(lev) { return lev.dnum === level(global(5) + layout.astralLevel).dnum; },
        u_wield_art(art) { return services.is_art(env.uwep, art); },
        is_demon(p) { return hasFlag(p, 'M2_DEMON'); },
        is_lord(p) { return hasFlag(p, 'M2_LORD'); },
        is_dprince(p) { return hasFlag(p, 'M2_DEMON') && hasFlag(p, 'M2_PRINCE'); },
        is_dlord(p) { return hasFlag(p, 'M2_DEMON') && hasFlag(p, 'M2_LORD'); },
        is_ndemon(p) { return hasFlag(p, 'M2_DEMON') && !hasFlag(p, 'M2_LORD') && !hasFlag(p, 'M2_PRINCE'); },
        is_lminion(mon) { return hasFlag(mon.data, 'M2_MINION') && services.mon_aligntyp(mon) === layout.A_LAWFUL; },
        monsndx(p) { return p.pmidx; },
        canspotmon(mon) { return !!services.canseemon(mon) || !!services.sensemon(mon); },
        DEADMONSTER(mon) { return mon.mhp < 1; },
        ACURR(a) { return services.acurr(a); },
        coordLocal() { return fields(address(services.stackAlloc(layout.coordSize)), [['x', layout.coord_x, 'Int16'], ['y', layout.coord_y, 'Int16']]); },
        longLocal() { return fields(address(services.stackAlloc(layout.longSize)), [['value', 0, 'BigInt64']]); },
    };
    // Pointer boxes expose numeric pointers while storage remains wasm64.
    env.pointerLocal = () => {
        const at = address(services.stackAlloc(layout.pointerSize));
        return { address: at, get value() { return pointer(at); }, set value(v) { view().setBigUint64(at, BigInt(address(v)), true); } };
    };
    for (const name of ['makemon', 'mk_roamer']) env[name] = (...args) => monster(services[name](...args));
    for (const name of ['mkclass', 'mkclass_aligned']) env[name] = (...args) => permonst(services[name](...args));
    for (const name of ['select_hwep', 'mksobj', 'which_armor']) env[name] = (...args) => object(services[name](...args));
    env.newmextra = (...args) => mextra(services.newmextra(...args));
    return env;
}
