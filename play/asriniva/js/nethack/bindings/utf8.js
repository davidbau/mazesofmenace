import * as CAdapter from '../../c-runtime/adapter-factories.js';
// C structure views and native dependencies, outside the translated TU.
// Addresses are checked wasm64 pointers converted by Emscripten's ABI layer.
// Every field access obtains the current heap, including after memory growth.
export function createUtf8Environment(services, layout) {
    if (layout.pointerSize !== 8 || layout.intSize !== 4 || !layout.ENHANCED_SYMBOLS)
        throw new Error('Review changed utf8map ABI or symbol configuration');
    const address = value => Number(value?.address ?? value ?? 0);
    const view = () => CAdapter.currentDataView(services);
    const pointer = at => CAdapter.readPointerNumber(view,at);
    const setPointer = (at, value) => view().setBigUint64(at, BigInt(address(value)), true);
    const integer = at => view().getInt32(at, true);
    const setInteger = (at, value) => view().setInt32(at, value, true);
    let localInt;
    const indexed = (length, read) => new Proxy({}, {
        get(target, key) {
            if (key === 'length') return length;
            if (typeof key === 'string' && /^(0|[1-9][0-9]*)$/.test(key))
                return read(Number(key));
            return Reflect.get(target, key);
        },
    });

    function unicode(at) {
        at = address(at);
        if (!at) return 0;
        return {
            address: at,
            get utf32ch() { return view().getUint32(at + layout.unicodeUtf32ch, true); },
            set utf32ch(value) { view().setUint32(at + layout.unicodeUtf32ch, value, true); },
            get utf8str() { return pointer(at + layout.unicodeUtf8str); },
            set utf8str(value) { setPointer(at + layout.unicodeUtf8str, value); },
        };
    }

    function glyphMap(at) {
        at = address(at);
        if (!at) return 0;
        return {
            address: at,
            get u() { return unicode(pointer(at + layout.glyphMapU)); },
            set u(value) { setPointer(at + layout.glyphMapU, value); },
            sym: {
                get symidx() { return integer(at + layout.glyphMapSymidx); },
                set symidx(value) { setInteger(at + layout.glyphMapSymidx, value); },
            },
        };
    }

    function glyphInfo(at) {
        at = address(at);
        if (!at) return 0;
        return { address: at, gm: glyphMap(at + layout.glyphInfoGm) };
    }

    function detail(at) {
        at = address(at);
        if (!at) return 0;
        return {
            address: at,
            content: { urep: {
                get glyphidx() { return integer(at + layout.detailGlyphidx); },
                set glyphidx(value) { setInteger(at + layout.detailGlyphidx, value); },
                u: unicode(at + layout.detailUnicode),
            } },
            get next() { return detail(pointer(at + layout.detailNext)); },
            set next(value) { setPointer(at + layout.detailNext, value); },
        };
    }

    function customizationSet(at) {
        at = address(at);
        if (!at) return 0;
        return {
            address: at,
            get customization_name() { return pointer(at + layout.customName); },
            set customization_name(value) { setPointer(at + layout.customName, value); },
            get count() { return integer(at + layout.customCount); },
            set count(value) { setInteger(at + layout.customCount, value); },
            get custtype() { return integer(at + layout.customType); },
            set custtype(value) { setInteger(at + layout.customType, value); },
            get details() { return detail(pointer(at + layout.customDetails)); },
            set details(value) { setPointer(at + layout.customDetails, value); },
            get details_end() { return detail(pointer(at + layout.customDetailsEnd)); },
            set details_end(value) { setPointer(at + layout.customDetailsEnd, value); },
        };
    }

    return {
        ...services,
        get HEAPU8() { return services.heap(); },
        get HEAP8() { return services.signedHeap(); },
        get hexdd() { return address(services.hexdd()); },
        UnicodeSize: layout.UnicodeSize,
        DetailSize: layout.DetailSize,
        MAX_GLYPH: layout.MAX_GLYPH,
        COLNO: layout.COLNO,
        ROWNO: layout.ROWNO,
        custom_ureps: layout.custom_ureps,
        do_custom_symbols: layout.do_custom_symbols,
        unicode,
        glyphMap,
        customization: detail,
        detail,
        glyphmap: indexed(layout.MAX_GLYPH, index =>
            glyphMap(address(services.glyphmap()) + index * layout.GlyphMapSize)),
        gg: { gbuf: indexed(layout.ROWNO, y => indexed(layout.COLNO, x => ({
            get glyphinfo() {
                return glyphInfo(address(services.gbuf())
                    + (y * layout.COLNO + x) * layout.GbufEntrySize + layout.gbufGlyphinfo);
            },
        }))) },
        gs: {
            get showsyms() { return services.heap().subarray(address(services.showsyms())); },
            sym_customizations: indexed(layout.NUM_GRAPHICS + 1, whichSet =>
                indexed(layout.custom_count, custtype => customizationSet(address(services.customizations())
                    + (whichSet * layout.custom_count + custtype) * layout.CustomizationSize))),
        },
        gc: { get currentgraphics() { return services.currentgraphics(); } },
        glyphInfoCopy() {
            const at = address(services.stackAlloc(layout.GlyphInfoSize));
            const source = address(services.nulGlyphInfo());
            services.heap().copyWithin(at, source, source + layout.GlyphInfoSize);
            return glyphInfo(at);
        },
        intLocal() {
            if (!localInt) {
                const at = address(services.stackAlloc(layout.intSize));
                localInt = {
                    address: at,
                    get value() { return integer(at); },
                    set value(value) { setInteger(at, value); },
                };
            }
            return localInt;
        },
        storeInt(at, value) { setInteger(address(at), value); },
        strcpy(destination, source) {
            return services.strcpy(address(destination), source);
        },
        decode_glyph(text, out) { return services.decode_glyph(address(text), address(out)); },
        map_glyphinfo(x, y, glyph, flags, out) {
            return services.map_glyphinfo(x, y, glyph, flags, address(out));
        },
        find_matching_customization(name, type, set) {
            return detail(services.find_matching_customization(address(name), type, set));
        },
    };
}
