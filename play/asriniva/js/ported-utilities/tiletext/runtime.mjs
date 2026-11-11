import * as core from './tiletext.js';
import { withEnvironment } from './scope.mjs';
export function install(m) {
    const view = () => new DataView(m.HEAPU8.buffer);
    const addr = value => Number(value?.address ?? value ?? 0);
    const raw = value => BigInt(value?.address ?? value ?? 0);
    const layout = i => Number(m._utility_tile_layout(i));
    const storage = i => Number(m._utility_tile_storage(i));
    const strings = new Map();
    const literal = text => {
        if (typeof text !== 'string') return addr(text);
        if (!strings.has(text)) {
            const n = m.lengthBytesUTF8(text) + 1, p = m._malloc(BigInt(n));
            m.stringToUTF8(text, Number(p), n);
            strings.set(text, Number(p));
        }
        return strings.get(text);
    };
    const array = (at, kind, size) => new Proxy({ address: addr(at) }, {
        get(object, key) {
            return typeof key === 'string' && /^\d+$/.test(key)
                ? view()['get' + kind](addr(at) + Number(key) * size, true) : Reflect.get(object, key);
        },
        set(object, key, value) {
            if (typeof key === 'string' && /^\d+$/.test(key)) {
                view()['set' + kind](addr(at) + Number(key) * size, Number(value), true);
                return true;
            }
            return Reflect.set(object, key, value);
        },
    });
    const palette = at => new Proxy({ address: at }, {
        get: (object,key) => typeof key === 'string' && /^\d+$/.test(key)
            ? array(at + Number(key) * layout(2), 'Uint8', 1) : Reflect.get(object,key),
    });
    const pixels = at => new Proxy({ address: addr(at) }, {
        get: (object,key) => typeof key === 'string' && /^\d+$/.test(key)
            ? new Proxy({}, { get(_, column) {
                const p = addr(at) + (Number(key) * layout(0) + Number(column)) * layout(4);
                const result = { address: p };
                for (const [i,name] of ['r','g','b'].entries()) Object.defineProperty(result,name,{
                    get: () => m.HEAPU8[p + layout(5+i)],
                    set: value => { m.HEAPU8[p + layout(5+i)] = Number(value); },
                });
                return result;
            } }) : Reflect.get(object,key),
    });
    const local = n => Number(m.stackAlloc(n));
    const intLocal = (...args) => {
        const p = local(4), box = { address: p, get value() { return view().getInt32(p,true); }, set value(v) { view().setInt32(p,Number(v),true); } };
        if (args.length) box.value = args[0];
        return box;
    };
    if(layout(0)!==16||layout(1)!==16)throw Error('Review TILETEXT default16 profile');
    const state = { num_colors:0, placeholder_init:0, tile_file:0, tile_set:0, tile_set_indx:0, grayscale:0, gidx:0 };
    const C = {
        TILE_X:layout(0), TILE_Y:layout(1), MAXCOLORMAPSIZE:layout(2), BUFSZ:layout(3),
        CM_RED:layout(11), CM_GREEN:layout(12), CM_BLUE:layout(13), placeholderSize:layout(8), RDTMODE:layout(9), WRTMODE:layout(10),
        ColorMap:palette(storage(0)), MainColorMap:palette(storage(1)), color_index:array(storage(2),'Int16',2),
        charcolors:array(storage(3),'Int8',1), placeholder:storage(4), placeholderBytes:array(storage(4),'Int8',1),
        inbuf:array(storage(5),'Int8',1), charLocal:n=>array(local(n),'Int8',1), intLocal,
        setChar:(p,v)=>{view().setInt8(addr(p),Number(v));},
        copy:(to,from,n)=>m.HEAPU8.copyWithin(addr(to),addr(from),addr(from)+n),
        memcmp:(a,b,n)=>m._memcmp(raw(a),raw(b),BigInt(n)),
        strlen:p=>Number(m._strlen(raw(p))), strcmp:(a,b)=>m._strcmp(BigInt(literal(a)),BigInt(literal(b))),
        strncmp:(a,b,n)=>m._strncmp(raw(a),BigInt(literal(b)),BigInt(n)),
        strchr:(p,c)=>Number(m._strchr(raw(p),c)), strrchr:(p,c)=>Number(m._strrchr(raw(p),c)),
        strstr:(p,s)=>Number(m._strstr(raw(p),BigInt(literal(s)))),
        fopen:(p,t)=>Number(m._utility_tile_fopen(BigInt(literal(p)),BigInt(literal(t)))),
        fgetc:f=>m._utility_tile_fgetc(raw(f)), ungetc:(c,f)=>m._utility_tile_ungetc(c,raw(f)),
        fgets:(p,n,f)=>Number(m._utility_tile_fgets(raw(p),n,raw(f))),
        fputc:(c,f)=>m._utility_tile_fputc(c,raw(f)), fclose:f=>m._utility_tile_fclose(raw(f)),
        sscanfPalette:(s,f,c,r,g,b)=>m._utility_tile_scan_palette(raw(s),BigInt(literal(f)),raw(c),raw(r),raw(g),raw(b)),
        sscanfTile:(s,f,t,i,b,g)=>m._utility_tile_scan_tile(raw(s),BigInt(literal(f)),raw(t),raw(i),raw(b),raw(g)),
        tilename:(set,index,gender)=>Number(m._utility_tilename(set,index,gender)),
        acceptable_tilename:(set,index,found,expected)=>m._acceptable_tilename(set,index,raw(found),raw(expected)),
    };
    for (const key of Object.keys(state)) Object.defineProperty(C,key,{
        get:()=>state[key], set:value=>{state[key]=key==='tile_file'?addr(value):Number(value)|0;},
    });
    for (const [key,i] of [['colorsinmap',6],['colorsinmainmap',7]]) Object.defineProperty(C,key,{
        get:()=>view().getInt32(storage(i),true),set:value=>view().setInt32(storage(i),Number(value),true),
    });
    Object.defineProperty(C,'stderr',{get:()=>m._utility_tile_stderr()});
    const shapes = new Map([
        ['too many colors (%d)\n',1], ['%c = (%d, %d, %d)\n',1],
        ['Keyword "%s" unexpected for entry %d\n',4],
        ['warning: for tile %d (numbered %d) of %s,\n',5],
        ["\tfound '%s' while expecting '%s'\n",3], ['Gray mapping issue %d > %d.\n',1],
        ['color %c not in colormap!\n',1], ['%d exceeds array boundary for ColorMap[][%d]!\n',1],
        ['# %s %d (unknown,%s)\n',6], ['# %s %d (%s)\n',6], ['# %s %d (null)\n',4],
        ['cannot open text file %s\n',2], ['bad mode (%s) for fopen_text_file\n',2],
    ]);
    C.Fprintf = (file,format,...args) => {
        const shape = shapes.get(format) ?? 0;
        const pointerSlots = {2:[0],3:[0,1],4:[0],5:[2],6:[0,2]}[shape] ?? [];
        const values = Array.from({length:4},(_,i)=>pointerSlots.includes(i)?BigInt(literal(args[i]??0)):BigInt(args[i]??0));
        m._utility_tile_print(raw(file),BigInt(literal(format)),shape,...values);
    };
    m.tiletextState=i=>i===5?+(state.tile_file!==0):state[['num_colors','placeholder_init','tile_set','tile_set_indx','grayscale'][i]];
    m.tiletextPort = (name,...args) => {
        if (['read_txttile','write_txttile'].includes(name)) args[1]=pixels(args[1]);
        if (['read_text_tile','write_text_tile'].includes(name)) args[0]=pixels(args[0]);
        if (['fopen_text_file'].includes(name)) args=args.map(addr);
        const sp=m.stackSave();
        try { return withEnvironment(C,core[name],...args); } finally { m.stackRestore(sp); }
    };
    return {state,C};
}
