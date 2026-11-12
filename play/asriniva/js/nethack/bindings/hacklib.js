import * as CAdapter from '../../c-runtime/adapter-factories.js';
// Compiler widths, native storage and libc ABI only; utility policy is in hacklib.js.
export function createHacklibState() {
    return { nh_qsort_base: 0, nh_qsort_size: 0n, nh_qsort_cmp_fn: 0n, nbuf: 0 };
}

export function createHacklibEnvironment(services, layout, namespace, state) {
    for (const [key, expected] of Object.entries({pointerSize:8,sizeSize:8,ssizeSize:8,
        intSize:4,charSize:1,booleanSize:1,coordSize:2,qsortIndexSize:8,
        qsortIndexIdx:0,qsortIndexIdxSize:8,config_MACOS:1,config_STRNCMPI:0,
        config_STRSTRI:0,VISCTRL_NBUF:5,TABSIZ:32,MAX_D:5})) {
        if (layout[key] !== expected) throw new Error('Review changed hacklib ABI: '+key);
    }
    const raw = value => CAdapter.unsignedPointer(value);
    const identity = value => {
        const bits = raw(value);
        return bits <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(bits) : bits;
    };
    const address = value => Number(value?.address ?? value ?? 0);
    const int = value => Number(BigInt.asIntN(32, BigInt(value)));
    const char = value => Number(BigInt.asIntN(8, BigInt(value)));
    const uchar = value => Number(BigInt.asUintN(8, BigInt(value)));
    const heap = () => services.heap();
    const view = () => new DataView(heap().buffer);
    const indexRecord = value => {
        const at = identity(value);
        return Object.defineProperties({address:at}, {
            idx: {
                get() { return view().getBigUint64(address(at)+layout.qsortIndexIdx,true); },
                set(value) { view().setBigUint64(address(at)+layout.qsortIndexIdx,raw(value),true); },
            },
        });
    };
    const indexArray = value => {
        const at = identity(value);
        return new Proxy({address:at}, {
            get(target,key) {
                if (typeof key === 'string' && /^\d+$/.test(key))
                    return indexRecord(raw(at)+BigInt(key)*BigInt(layout.qsortIndexSize));
                return Reflect.get(target,key);
            },
        });
    };
    const env = Object.assign(Object.create(services),layout,{
        hacklibState:state,indexRecord,indexArray,int,char,uchar,
        uint:value=>Number(BigInt.asUintN(32,BigInt(value))),
        boolean:char,coordxy:value=>Number(BigInt.asIntN(16,BigInt(value))),
        size_t:raw,ssize:value=>BigInt.asIntN(64,BigInt(value)),
        ptrAdd:(ptr,offset)=>identity(raw(ptr)+BigInt(offset)),
        ptrDiff:(a,b)=>BigInt.asIntN(64,raw(a)-raw(b)),
        charPointer:value=>typeof value==='string'?services.literal(value):identity(value),
        loadChar:at=>view().getInt8(address(at)),
        loadByte:at=>heap()[address(at)],
        storeChar(at,value) { const ch=char(value);view().setInt8(address(at),ch);return ch; },
        storeByte(at,value) { const ch=uchar(value);heap()[address(at)]=ch;return ch; },
        qsort(base,count,size,compare) {
            if(compare!==namespace.nh_qsort_idx_cmp)
                throw new Error('Unexpected hacklib index comparator identity');
            return services.qsort(base,count,size);
        },
        va_start(ap) {
            const packet=ap[0];
            if(!packet || !Object.hasOwn(packet,'nativeVaList'))
                throw new Error('Expected native hacklib va_list packet');
            ap.nativeVaList=packet.nativeVaList;
        },
        va_end() {},
        vsnprintf:(out,size,format,ap)=>services.vsnprintf(out,size,format,ap.nativeVaList),
        dm:namespace.dm.map(row=>({
            sz:row.sz.map(size=>typeof size==='string'?layout[size]:size),
            datamodel:services.literal(row.datamodel),
            dmplatform:services.literal(row.dmplatform),
        })),
    });
    Object.defineProperties(env,{
        HEAP8:{get:()=>new Int8Array(heap().buffer)},
        HEAPU8:{get:heap},
    });
    return env;
}
