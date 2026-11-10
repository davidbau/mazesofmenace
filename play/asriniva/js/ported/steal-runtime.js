// Live C objects, globals, header macros and delayed callback identities.
export function createStealEnvironment(services, layout, core) {
    const widths = { pointerSize: 8, longSize: 8, intSize: 4, charSize: 1, charSigned: 1,
        booleanSize: 1, booleanSigned: 1, coordxySize: 2, coordxySigned: 1, CHAR_BIT: 8,
        obj_nobj_size: 8, obj_nexthere_size: 8, obj_cobj_size: 8, obj_o_id_size: 4,
        obj_otyp_size: 2, obj_oclass_size: 1, obj_oartifact_size: 1, obj_where_size: 1,
        obj_quan_size: 8, obj_owornmask_size: 8, obj_corpsenm_size: 4, obj_ox_size: 2, obj_oy_size: 2,
        mon_data_size: 8, mon_nmon_size: 8, mon_minvent_size: 8, mon_m_id_size: 4,
        mon_mtame_size: 1, mon_mx_size: 2, mon_my_size: 2, mon_mhp_size: 4, mon_misc_worn_check_size: 8,
        pm_mflags1_size: 8, pm_mflags2_size: 8, pm_mlet_size: 1, class_oc_cost_size: 2, class_oc_delay_size: 1,
        prop_intrinsic_size: 8, prop_extrinsic_size: 8, prop_blocked_size: 8,
        heroUxSize: 2, heroUySize: 2, heroSteedSize: 8, heroStuckSize: 8,
        heroTrapSize: 4, heroTrapTypeSize: 4, inventorySize: 8, multiSize: 8, multiReasonSize: 8,
        afternmvSize: 8, nomovemsgSize: 8, stealoidSize: 4, stealmidSize: 4,
        thrownobjSize: 8, kickedobjSize: 8, occupationSize: 8, femaleSize: 1, verboseSize: 1,
        lastMsgSize: 4, botlSize: 1, monlistSize: 8, seenSize: 1 };
    for (const [key, width] of Object.entries(widths))
        if (layout[key] !== width) throw new Error('Review changed steal ABI: ' + key);
    const address = value => Number(value?.address ?? value ?? 0);
    const global = index => address(services.global(index));
    const view = () => new DataView(services.heap().buffer);
    const pointer = at => Number(view().getBigUint64(at, true));
    const int = v => typeof v === 'bigint' ? Number(BigInt.asIntN(32, v)) : v | 0;
    const long = v => BigInt.asIntN(64, BigInt(v));
    const textPointer = v => typeof v === 'string' ? address(services.literal(v)) : address(v);
    const scalar = (target, name, at, kind) => Object.defineProperty(target, name, {
        get() { return view()['get' + kind](at(), true); },
        set(v) { view()['set' + kind](at(), kind.includes('Big') ? BigInt(v) : Number(v), true); },
    });
    const indexed = (length, get) => new Proxy({}, { get(target, key) {
        if (key === 'length') return length;
        return typeof key === 'string' && /^\d+$/.test(key) ? get(Number(key)) : Reflect.get(target, key);
    } });
    function permonst(value) {
        const at = address(value);
        if (!at) return 0;
        const result = { address: at };
        for (const [name, kind] of [['mflags1', 'BigUint64'], ['mflags2', 'BigUint64'], ['mlet', 'Int8']])
            scalar(result, name, () => at + layout['pm_' + name], kind);
        return result;
    }
    function object(value) {
        const at = address(value);
        if (!at) return 0;
        const result = { address: at };
        for (const [name, kind] of [['o_id', 'Uint32'], ['otyp', 'Int16'], ['oclass', 'Int8'],
            ['oartifact', 'Int8'], ['where', 'Int8'], ['quan', 'BigInt64'], ['owornmask', 'BigInt64'],
            ['corpsenm', 'Int32'], ['ox', 'Int16'], ['oy', 'Int16']])
            scalar(result, name, () => at + layout['obj_' + name], kind);
        Object.defineProperty(result, 'leashmon', { get() { return result.corpsenm; }, set(v) { result.corpsenm = v; } });
        for (const field of ['nobj', 'nexthere', 'cobj'])
            Object.defineProperty(result, field, { get() { return object(pointer(at + layout['obj_' + field])); } });
        for (const [index, field] of ['unpaid', 'cursed', 'in_use', 'no_charge', 'how_lost'].entries())
            Object.defineProperty(result, field, { get() { return services.objectBit(at, index); },
                set(v) { services.setObjectBit(at, index, Number(v)); } });
        return result;
    }
    function monster(value) {
        const at = address(value);
        if (!at) return 0;
        const result = { address: at };
        for (const [name, kind] of [['m_id', 'Uint32'], ['mtame', 'Int8'], ['mx', 'Int16'], ['my', 'Int16'],
            ['mhp', 'Int32'], ['misc_worn_check', 'BigInt64']]) scalar(result, name, () => at + layout['mon_' + name], kind);
        Object.defineProperties(result, {
            data: { get() { return permonst(pointer(at + layout.mon_data)); } },
            nmon: { get() { return monster(pointer(at + layout.mon_nmon)); } },
            minvent: { get() { return object(pointer(at + layout.mon_minvent)); } },
        });
        for (const [index, field] of ['female', 'mavenge', 'iswiz', 'isgd'].entries())
            Object.defineProperty(result, field, { get() { return services.monsterBit(at, index); },
                set(v) { services.setMonsterBit(at, index, Number(v)); } });
        return result;
    }
    const objPointerField = (index, key, field) => ({
        get [field]() { return object(pointer(global(index) + layout[key])); },
        set [field](v) { view().setBigUint64(global(index) + layout[key], BigInt(address(v)), true); },
    });
    const prop = (id, field) => view().getBigInt64(global(0) + layout.heroProps + id * layout.propSize + layout['prop_' + field], true);
    const active = id => prop(id, 'intrinsic') !== 0n || prop(id, 'extrinsic') !== 0n;
    const flag = (p, key, group = 'mflags1') => (p[group] & BigInt(layout[key])) !== 0n;
    const u = { uhave: {} };
    for (const [name, key, kind] of [['ux', 'heroUx', 'Int16'], ['uy', 'heroUy', 'Int16'],
        ['utrap', 'heroTrap', 'Uint32'], ['utraptype', 'heroTrapType', 'Uint32']]) scalar(u, name, () => global(0) + layout[key], kind);
    Object.defineProperties(u, {
        usteed: { get() { return monster(pointer(global(0) + layout.heroSteed)); } },
        ustuck: { get() { return monster(pointer(global(0) + layout.heroStuck)); } },
        ushops: { get() { return global(0) + layout.heroShops; } },
        uswallow: { get() { return services.heroBit(0); } },
        twoweap: { get() { return services.heroBit(1); } },
    });
    for (const [index, field] of ['amulet', 'bell', 'book', 'menorah'].entries())
        Object.defineProperty(u.uhave, field, { get() { return services.heroBit(index + 2); } });
    const gm = {};
    scalar(gm, 'multi', () => global(3) + layout.multi, 'BigInt64');
    Object.defineProperty(gm, 'multi_reason', {
        get() { return pointer(global(3) + layout.multiReason); },
        set(v) { view().setBigUint64(global(3) + layout.multiReason, BigInt(textPointer(v)), true); },
    });
    const gs = {};
    scalar(gs, 'stealoid', () => global(6) + layout.stealoid, 'Uint32');
    scalar(gs, 'stealmid', () => global(6) + layout.stealmid, 'Uint32');
    const iflags = {}; scalar(iflags, 'last_msg', () => global(11) + layout.lastMsg, 'Int32');
    const flags = {}; scalar(flags, 'female', () => global(10) + layout.female, 'Int8'); scalar(flags, 'verbose', () => global(10) + layout.verbose, 'Int8');
    const disp = {}; scalar(disp, 'botl', () => global(12) + layout.botl, 'Int8');
    const env = { ...services, ...layout, object, monster, permonst, int, long,
        get HEAP8() { return new Int8Array(services.heap().buffer); }, get HEAPU8() { return services.heap(); },
        char(v) { return int(v) << 24 >> 24; }, coordxy(v) { return int(v) << 16 >> 16; },
        loadChar(at) { return view().getInt8(address(at)); },
        u, gm, gs, iflags, flags, disp,
        gy: { get youmonst() { return monster(global(1) + layout.youmonst); } },
        gi: { get invent() { return object(pointer(global(2) + layout.inventory)); } },
        gt: objPointerField(7, 'thrownobj', 'thrownobj'), gk: objPointerField(8, 'kickedobj', 'kickedobj'),
        go: { get occupation() { return view().getBigUint64(global(9) + layout.occupation, true); } },
        gn: { get nomovemsg() { return pointer(global(5) + layout.nomovemsg); },
            set nomovemsg(v) { view().setBigUint64(global(5) + layout.nomovemsg, BigInt(textPointer(v)), true); } },
        ga: { get afternmv() {
            const value = view().getBigUint64(global(4) + layout.afternmv, true);
            if (value === BigInt.asUintN(64, services.callbackPointer(0))) return core.stealarm;
            if (value === BigInt.asUintN(64, services.callbackPointer(1))) return core.unstolenarm;
            return value;
        }, set afternmv(value) {
            const raw = value === core.stealarm ? services.callbackPointer(0) : value === core.unstolenarm ? services.callbackPointer(1) : BigInt(value ?? 0);
            view().setBigUint64(global(4) + layout.afternmv, BigInt.asUintN(64, raw), true);
        } },
        get fmon() { return monster(pointer(global(13) + layout.monlist)); },
        mons: indexed(layout.NUMMONS + 1, i => permonst(global(14) + i * layout.permonstSize)),
        objects: indexed(layout.NUM_OBJECTS, i => {
            const at = global(15) + i * layout.objectClassSize, result = { address: at };
            scalar(result, 'oc_cost', () => at + layout.class_oc_cost, 'Int16');
            scalar(result, 'oc_delay', () => at + layout.class_oc_delay, 'Int8');
            Object.defineProperty(result, 'oc_bimanual', { get() { return services.objectClassBit(at, 0); } });
            return result;
        }),
        levl: indexed(layout.COLNO, x => indexed(layout.ROWNO, y => ({ get roomno() { return services.roomno(x, y); } }))),
        get Punished() { return !!env.uball; },
        get Blind() { return active(layout.BLINDED) && prop(layout.BLINDED, 'blocked') === 0n; },
        get Conflict() { return active(layout.CONFLICT); },
        get Adornment() { return prop(layout.ADORNED, 'extrinsic'); },
        get Levitation() { return active(layout.LEVITATION) && prop(layout.LEVITATION, 'blocked') === 0n; },
        get Flying() { return (active(layout.FLYING) || (!!u.usteed && flag(u.usteed.data, 'M1_FLY'))) && prop(layout.FLYING, 'blocked') === 0n; },
        get RING_ON_PRIMARY() { return services.heroBit(6) === layout.LEFT_HANDED ? env.uleft : env.uright; },
        get RING_ON_SECONDARY() { return services.heroBit(6) === layout.LEFT_HANDED ? env.uright : env.uleft; },
        cansee(x, y) { const rows = pointer(global(16) + layout.vizArray); return (view().getUint8(pointer(rows + y * layout.pointerSize) + x) & layout.IN_SIGHT) !== 0; },
        canspotmon(mon) { return !!services.canseemon(mon) || !!services.sensemon(mon); },
        DEADMONSTER(mon) { return mon.mhp < 1; },
        distu(x, y) { return services.dist2(x, y, u.ux, u.uy); },
        is_animal(p) { return flag(p, 'M1_ANIMAL'); }, slithy(p) { return flag(p, 'M1_SLITHY'); },
        throws_rocks(p) { return flag(p, 'M2_ROCKTHROW', 'mflags2'); }, can_teleport(p) { return flag(p, 'M1_TPORT'); },
        touch_petrifies(p) { return p.address === env.mons[layout.PM_COCKATRICE].address || p.address === env.mons[layout.PM_CHICKATRICE].address; },
        carried(obj) { return obj.where === layout.OBJ_INVENT; }, Has_contents(obj) { return !!obj.cobj; },
        any_quest_artifact(obj) { return obj.oartifact >= layout.ART_ORB_OF_DETECTION; },
        engulfing_u(mon) { return !!u.uswallow && mon.address === (u.ustuck?.address ?? 0); },
        bimanual(obj) { return (obj.oclass === layout.WEAPON_CLASS || obj.oclass === layout.TOOL_CLASS) && !!env.objects[obj.otyp].oc_bimanual; },
        min(a, b) { return a < b ? a : b; },
        booleanLocal() { const at = address(services.stackAlloc(layout.booleanSize)); return { address: at,
            get value() { return view().getInt8(at); }, set value(v) { view().setInt8(at, Number(v)); } }; },
    };
    for (const [index, field] of ['uskin', 'uarm', 'uarmc', 'uarmf', 'uarmg', 'uarmh', 'uarms', 'uarmu',
        'uwep', 'uswapwep', 'uquiver', 'uball', 'uchain', 'uleft', 'uright'].entries())
        Object.defineProperty(env, field, { get() { return object(services.equipment(index)); } });
    for (const name of ['g_at', 'splitobj', 'droppables']) env[name] = (...args) => object(services[name](...args));
    for (const name of ['shop_keeper', 'find_objowner']) env[name] = (...args) => monster(services[name](...args));
    for (const key of ['LEFT_RING', 'RIGHT_RING', 'W_ARMOR', 'W_ACCESSORY', 'W_AMUL', 'W_RING', 'W_TOOL', 'W_WEAPONS', 'W_BALL', 'W_CHAIN', 'W_ARMG', 'W_SADDLE']) {
        if (!Number.isSafeInteger(layout[key])) throw new Error('Review steal mask: ' + key);
        env[key] = BigInt(layout[key]);
    }
    return env;
}
