// Live native storage and header expansions; priest policy remains in priest.js.
export function createPriestEnvironment(services, layout) {
    const widths = { pointerSize: 8, longSize: 8, intSize: 4, charSize: 1, charSigned: 1,
        booleanSize: 1, booleanSigned: 1, coordxySize: 2, coordxySigned: 1,
        mon_nmon_size: 8, mon_data_size: 8, mon_m_id_size: 4, mon_mx_size: 2,
        mon_my_size: 2, mon_mhp_size: 4, mon_mtame_size: 1, mon_mextra_size: 8, mon_minvent_size: 8,
        pm_maligntyp_size: 1, pm_mflags1_size: 8, pm_mflags2_size: 8,
        epri_parentmid_size: 4, epri_shralign_size: 1, epri_shroom_size: 1,
        epri_cheapskate_count_size: 4, epri_intone_time_size: 8, epri_enter_time_size: 8,
        epri_hostile_time_size: 8, epri_peaceful_time_size: 8,
        emin_min_align_size: 1, emin_renegade_size: 1, eshk_following_size: 1,
        mextra_epri_size: 8, mextra_emin_size: 8, mextra_eshk_size: 8,
        room_rtype_size: 1, room_lx_size: 2, room_hx_size: 2, room_ly_size: 2, room_hy_size: 2,
        coord_x_size: 2, coord_y_size: 2, level_dnum_size: 2, level_dlevel_size: 2,
        prop_intrinsic_size: 8, prop_extrinsic_size: 8, prop_blocked_size: 8,
        terrain_typ_size: 1, mvital_born_size: 1, gender_his_size: 8, mfp_cnt_size: 4,
        moves_size: 8, invent_size: 8, verbose_size: 1, wizard_size: 1, gameover_size: 4,
        multiReason_size: 8, nomovemsg_size: 8, currentWand_size: 8, buzzer_size: 8,
        tbx_size: 1, tby_size: 1, vizArray_size: 8, u_ux_size: 2, u_uy_size: 2,
        u_ulevelpeak_size: 4, u_ublessed_size: 4, u_ucleansed_size: 8,
        u_alignType_size: 1, u_alignRecord_size: 4, u_gnostic_size: 8,
        config_EXTRA_SANITY_CHECKS: 0, config_SND_LIB_INTEGRATED: 0, config_NDEBUG: 0 };
    for (const [key, expected] of Object.entries(widths))
        if (layout[key] !== expected) throw new Error('Review changed priest ABI: ' + key);
    const address = v => Number(v?.address ?? v ?? 0);
    const global = i => address(services.global(i));
    const view = () => new DataView(services.heap().buffer);
    const pointer = at => Number(view().getBigUint64(at, true));
    const int = v => typeof v === 'bigint' ? Number(BigInt.asIntN(32, v)) : v | 0;
    const char = v => int(v) << 24 >> 24;
    const coordxy = v => int(v) << 16 >> 16;
    const long = v => BigInt.asIntN(64, BigInt(v));
    const scalar = (o, key, at, kind) => Object.defineProperty(o, key, {
        get() { return view()['get' + kind](at(), true); },
        set(v) { view()['set' + kind](at(), kind.includes('Big') ? BigInt(v) : Number(v), true); },
    });
    const ptrField = (o, key, at, wrap = v => v) => Object.defineProperty(o, key, {
        get() { return wrap(pointer(at())); },
        set(v) { view().setBigUint64(at(), BigInt(address(v)), true); },
    });
    const indexed = (length, get, set, at) => new Proxy({ address: at }, {
        get(o, key) { if (key === 'length') return length;
            return typeof key === 'string' && /^-?\d+$/.test(key) ? get(Number(key)) : Reflect.get(o, key); },
        set(o, key, v) { if (set && typeof key === 'string' && /^-?\d+$/.test(key)) {
            set(Number(key), v); return true; } return Reflect.set(o, key, v); },
    });
    const object = v => address(v) ? { address: address(v) } : 0;
    function coord(v) { const at = address(v), o = { address: at };
        for (const k of ['x', 'y']) scalar(o, k, () => at + layout['coord_' + k], 'Int16'); return o; }
    function level(v) { const at = address(v), o = { address: at };
        for (const k of ['dnum', 'dlevel']) scalar(o, k, () => at + layout['level_' + k], 'Int16'); return o; }
    function permonst(v) {
        const at = address(v); if (!at) return 0; const o = { address: at };
        scalar(o, 'maligntyp', () => at + layout.pm_maligntyp, 'Int8');
        for (const k of ['mflags1', 'mflags2']) scalar(o, k, () => at + layout['pm_' + k], 'BigUint64');
        return o;
    }
    function epri(v) {
        const at = address(v); if (!at) return 0; const o = { address: at };
        for (const [k, kind] of [['parentmid', 'Uint32'], ['shralign', 'Int8'], ['shroom', 'Int8'],
            ['cheapskate_count', 'Uint32'], ['intone_time', 'BigInt64'], ['enter_time', 'BigInt64'],
            ['hostile_time', 'BigInt64'], ['peaceful_time', 'BigInt64']])
            scalar(o, k, () => at + layout['epri_' + k], kind);
        Object.defineProperties(o, {
            shrpos: { get() { return coord(at + layout.epri_shrpos); } },
            shrlevel: { get() { return level(at + layout.epri_shrlevel); } },
        }); return o;
    }
    function emin(v) {
        const at = address(v); if (!at) return 0; const o = { address: at };
        for (const k of ['min_align', 'renegade']) scalar(o, k, () => at + layout['emin_' + k], 'Int8');
        return o;
    }
    function eshk(v) {
        const at = address(v); if (!at) return 0; const o = { address: at };
        scalar(o, 'following', () => at + layout.eshk_following, 'Int8'); return o;
    }
    function mextra(v) {
        const at = address(v); if (!at) return 0; const o = { address: at };
        for (const [k, wrap] of [['epri', epri], ['emin', emin], ['eshk', eshk]])
            ptrField(o, k, () => at + layout['mextra_' + k], wrap);
        return o;
    }
    function monster(v) {
        const at = address(v); if (!at) return 0; const o = { address: at };
        for (const [k, kind] of [['m_id', 'Uint32'], ['mx', 'Int16'], ['my', 'Int16'],
            ['mhp', 'Int32'], ['mtame', 'Int8']]) scalar(o, k, () => at + layout['mon_' + k], kind);
        ptrField(o, 'data', () => at + layout.mon_data, permonst);
        ptrField(o, 'nmon', () => at + layout.mon_nmon, monster);
        ptrField(o, 'mextra', () => at + layout.mon_mextra, mextra);
        ptrField(o, 'minvent', () => at + layout.mon_minvent, object);
        for (const [i, k] of ['isshk', 'ispriest', 'isminion', 'mconf', 'mpeaceful', 'msleeping',
            'mcanmove', 'mfrozen', 'mcansee', 'mflee', 'female', 'minvis'].entries())
            Object.defineProperty(o, k, { get() { return services.monsterBit(at, i); },
                set(v) { services.setMonsterBit(at, i, v); } }); return o;
    }
    function room(v) {
        const at = address(v); if (!at) return 0; const o = { address: at };
        scalar(o, 'rtype', () => at + layout.room_rtype, 'Int8');
        for (const k of ['lx', 'hx', 'ly', 'hy']) scalar(o, k, () => at + layout['room_' + k], 'Int16');
        return o;
    }
    const u = { ualign: {}, uconduct: {} };
    for (const [k, kind] of [['ux', 'Int16'], ['uy', 'Int16'], ['ulevelpeak', 'Int32'],
        ['ublessed', 'Int32'], ['ucleansed', 'BigInt64']]) scalar(u, k, () => global(0) + layout['u_' + k], kind);
    scalar(u.ualign, 'type', () => global(0) + layout.u_alignType, 'Int8');
    scalar(u.ualign, 'record', () => global(0) + layout.u_alignRecord, 'Int32');
    scalar(u.uconduct, 'gnostic', () => global(0) + layout.u_gnostic, 'BigInt64');
    Object.defineProperty(u, 'uz', { get() { return level(global(0) + layout.u_uz); } });
    for (const k of ['urooms', 'urooms0']) Object.defineProperty(u, k, { get() { return global(0) + layout['u_' + k]; } });
    const propAt = (id, key) => global(0) + layout.u_uprops + id * layout.propSize + layout['prop_' + key];
    const prop = (id, key) => view().getBigInt64(propAt(id, key), true);
    const active = id => Boolean(prop(id, 'intrinsic') || prop(id, 'extrinsic'));
    const unblocked = id => active(id) && !prop(id, 'blocked');
    const fmonAt = (x, y) => global(1) + layout.floorMonsters + (x * layout.ROWNO + y) * 8;
    const levl = indexed(layout.COLNO, x => indexed(layout.ROWNO, y => {
        const at = global(1) + layout.terrain + (x * layout.ROWNO + y) * layout.terrainSize, o = { address: at };
        scalar(o, 'typ', () => at + layout.terrain_typ, 'Int8');
        Object.defineProperty(o, 'altarmask', { get() { return services.terrainBit(x, y, 0); } }); return o;
    }));
    const svr = {};
    Object.defineProperty(svr, 'rooms', { get() { const at = global(2) + layout.rooms;
        return indexed(0, i => room(at + i * layout.roomSize), null, at); } });
    const svm = {};
    scalar(svm, 'moves', () => global(3) + layout.moves, 'BigInt64');
    Object.defineProperty(svm, 'mvitals', { get() { return indexed(layout.NUMMONS, i => {
        const at = global(3) + layout.mvitals + i * layout.mvitalSize, o = { address: at };
        scalar(o, 'born', () => at + layout.mvital_born, 'Uint8'); return o;
    }); } });
    const gi = {}, flags = {}, program_state = {}, gm = {}, gn = {}, gc = {}, gb = {}, gt = {};
    ptrField(gi, 'invent', () => global(5) + layout.invent, object);
    scalar(flags, 'verbose', () => global(6) + layout.verbose, 'Int8');
    scalar(flags, 'debug', () => global(6) + layout.wizard, 'Int8');
    scalar(program_state, 'gameover', () => global(7) + layout.gameover, 'Int32');
    ptrField(gm, 'multi_reason', () => global(8) + layout.multiReason);
    ptrField(gn, 'nomovemsg', () => global(9) + layout.nomovemsg);
    ptrField(gc, 'current_wand', () => global(10) + layout.currentWand, object);
    ptrField(gb, 'buzzer', () => global(11) + layout.buzzer, monster);
    for (const k of ['tbx', 'tby']) scalar(gt, k, () => global(12) + layout[k], 'Int8');
    const mons = indexed(layout.NUMMONS, i => permonst(global(13) + i * layout.permonstSize));
    const couldsee = (x, y) => Boolean(view().getUint8(pointer(pointer(global(15) + layout.vizArray) + y * 8) + x) & layout.COULD_SEE);
    const lcheck = (l, offset) => { const target = level(global(4) + offset);
        return Boolean((target.dnum || target.dlevel) && services.on_level(l, target)); };
    const env = Object.assign(Object.create(services), layout, {
        address, int, uint: v => int(v) >>> 0, char, boolean: char, coordxy, long,
        monster, object, permonst, room, level, epri, mextra,
        EPRI: m => m.mextra ? m.mextra.epri : 0, EMIN: m => m.mextra ? m.mextra.emin : 0,
        ESHK: m => m.mextra ? m.mextra.eshk : 0,
        has_emin: m => Boolean(m.mextra && m.mextra.emin),
        longRef: (o, field) => { const result = {}; Object.defineProperty(result, 'value', {
            get() { return o[field]; }, set(v) { o[field] = long(v); } }); return result; },
        uintRef: (o, field) => { const result = {}; Object.defineProperty(result, 'value', {
            get() { return o[field]; }, set(v) { o[field] = int(v) >>> 0; } }); return result; },
        charLocal() { const at = services.stackAlloc(1), o = { address: at }; scalar(o, 'value', () => at, 'Int8'); return o; },
        mfndposLocal() { const at = services.stackAlloc(layout.mfndposSize), o = { address: at };
            scalar(o, 'cnt', () => at + layout.mfp_cnt, 'Int32');
            o.poss = indexed(layout.mfndposCount, i => coord(at + layout.mfp_poss + i * layout.coordSize));
            o.info = indexed(layout.mfndposCount, i => view().getBigInt64(at + layout.mfp_info + i * 8, true),
                (i, v) => view().setBigInt64(at + layout.mfp_info + i * 8, BigInt(v), true)); return o; },
        callLocal(fn, ...args) { const saved = services.stackSave();
            try { return fn(...args); } finally { services.stackRestore(saved); } },
        loadChar: at => view().getInt8(address(at)), storeChar: (at, v) => view().setInt8(address(at), Number(v)),
        u, levl, svr, svm, gi, flags, program_state, gm, gn, gc, gb, gt, mons,
        xdir: indexed(layout.N_DIRS, i => view().getInt8(global(16) + i)),
        ydir: indexed(layout.N_DIRS, i => view().getInt8(global(17) + i)),
        roomIndex: r => (address(r) - (global(2) + layout.rooms)) / layout.roomSize,
        m_at: (x, y) => monster(pointer(fmonAt(x, y))), MON_AT: (x, y) => Boolean(pointer(fmonAt(x, y))),
        remove_monster: (x, y) => view().setBigUint64(fmonAt(x, y), 0n, true),
        u_at: (x, y) => x === u.ux && y === u.uy,
        onlineu: (x, y) => services.online2(coordxy(x), coordxy(y), u.ux, u.uy),
        DEADMONSTER: m => m.mhp < 1,
        IS_ROOM: typ => typ >= layout.ROOM, IS_ALTAR: typ => typ === layout.ALTAR,
        IS_DOOR: typ => typ === layout.DOOR, DIR_CLAMP: dir => (dir + layout.N_DIRS) % layout.N_DIRS,
        helpless: m => Boolean(m.msleeping || !m.mcanmove),
        m_next2u: m => services.dist2(m.mx, m.my, u.ux, u.uy) <= 2,
        m_canseeu: m => (!unblocked(layout.INVIS) || Boolean(m.data.mflags1 & BigInt(layout.M1_SEE_INVIS)))
            && !services.underwater() && couldsee(m.mx, m.my),
        is_minion: p => Boolean(p.mflags2 & BigInt(layout.M2_MINION)),
        is_rider: p => [layout.PM_DEATH, layout.PM_FAMINE, layout.PM_PESTILENCE].some(i => p.address === mons[i].address),
        canspotmon: m => Boolean(services.canseemon(m) || services.sensemon(m)),
        Amask2align: x => char(!(x & layout.AM_MASK) ? layout.A_NONE : (x & layout.AM_MASK) === layout.AM_LAWFUL ? layout.A_LAWFUL : (x & layout.AM_MASK) - 2),
        Is_sanctum: l => lcheck(l, layout.sanctumLevel), Is_astralevel: l => lcheck(l, layout.astralLevel),
        In_endgame: l => l.dnum === level(global(4) + layout.astralLevel).dnum,
        mhis: m => pointer(global(14) + services.pronoun_gender(m, layout.PRONOUN_HALLU) * layout.genderSize + layout.gender_his),
        BZ_OFS_AD: ad => Math.abs(ad - layout.AD_MAGM) % 10, BZ_M_SPELL: typ => -10 - typ,
        propertyRef: id => propAt(id, 'intrinsic'),
        verbalize1: value => services.verbalize('%s', value),
        rn1(bound, offset, line, caller) { const result = services.rn2(int(bound), line, caller);
            return typeof offset === 'bigint' ? long(BigInt(result) + offset) : int(result + offset); },
    });
    for (const key of ['NOTONL', 'ALLOW_M', 'ALLOW_ROCK', 'INTRINSIC', 'FROMOUTSIDE', 'W_ARMC', 'LL_CONDUCT'])
        env[key] = BigInt(layout[key]);
    for (const [key, get] of Object.entries({
        fmon: () => monster(pointer(global(1) + layout.fmon)),
        sanctum_level: () => level(global(4) + layout.sanctumLevel),
        Conflict: () => active(layout.CONFLICT), Displaced: () => active(layout.DISPLACED),
        Invis: () => unblocked(layout.INVIS), Hallucination: () => Boolean(prop(layout.HALLUC, 'intrinsic') && !active(layout.HALLUC_RES)),
        Deaf: () => Boolean(active(layout.DEAF) || services.roleplayDeaf()),
        HEAP8: () => new Int8Array(services.heap().buffer), HEAPU8: () => services.heap(),
    })) Object.defineProperty(env, key, { get });
    Object.defineProperty(env, 'HProtection', { get() { return prop(layout.PROTECTION, 'intrinsic'); },
        set(v) { view().setBigInt64(propAt(layout.PROTECTION, 'intrinsic'), BigInt(v), true); } });
    env.makemon = (...args) => monster(services.makemon(...args));
    for (const key of ['mkobj', 'which_armor']) env[key] = (...args) => object(services[key](...args));
    return env;
}
