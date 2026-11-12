import * as core from './sfctool.js';
import {withEnvironment} from './sfctool-scope.js';
export function createSfctoolHelpers(Module) {
    const L = Array.from({length:30},(_,i)=>Number(BigInt.asIntN(64,Module._utility_layout(i))));
    const raw = x => x?.address ?? Number(x || 0);
    const view = () => new DataView(Module.HEAPU8.buffer);
    const address = (p,o=0) => raw(p)+o;
    const ptr = (p,o) => Number(view().getBigUint64(address(p,o),true));
    const putptr = (p,o,v) => view().setBigUint64(address(p,o),BigInt(raw(v)),true);
    const field = (p,offset,type) => ({get(){const q=ptr(p,offset);return q?(type?record(q,type):q):0;},set(v){putptr(p,offset,v);},enumerable:true});
    function record(p,type) {
        if (!raw(p)) return 0;
        const out = {address:raw(p)};
        const properties = {};
        const rows = type==='monst' ? [['mextra',15,'mextra']] : type==='obj' ? [['oextra',16,'oextra']] : type==='mextra' ? [['mgivenname',17],['egd',18,'egd'],['epri',19,'epri'],['eshk',20,'eshk'],['emin',21,'emin'],['edog',22,'edog'],['ebones',23,'ebones']] : type==='oextra' ? [['oname',25],['omonst',26,'monst'],['omailcmd',27]] : type==='eshk' ? [['bill_p',29]] : [];
        for (const [name,key,kind] of rows) properties[name]=field(p,L[key],kind);
        if (type==='mextra') properties.mcorpsenm={get(){return view().getInt32(address(p,L[24]),true);},set(v){view().setInt32(address(p,L[24]),v,true);},enumerable:true};
        if (type==='oextra') properties.omid={get(){return view().getUint32(address(p,L[28]),true);},set(v){view().setUint32(address(p,L[28]),v,true);},enumerable:true};
        if (type==='monst') for (const [i,name] of ['isgd','ispriest','isshk','isminion','mtame'].entries()) properties[name]={get(){return Module._utility_monflag_get(BigInt(raw(p)),i);},set(v){Module._utility_monflag(BigInt(raw(p)),i,v);},enumerable:true};
        Object.defineProperties(out,properties);
        return out;
    }
    const literalPool = new Map();
    function literal(s) {
        if (typeof s!=='string') return raw(s);
        if (!literalPool.has(s)) {
            const n=Module.lengthBytesUTF8(s)+1,p=Number(Module._malloc(BigInt(n)));
            Module.stringToUTF8(s,p,n);
            literalPool.set(s,p);
        }
        return literalPool.get(s);
    }
    let varargs=0n;
    const env = {
        HACKDIR:Number(Module._utility_constant(0)),COMPRESS_EXTENSION:Number(Module._utility_constant(1)),
        EXIT_SUCCESS:Module._utility_scalar(0),EXIT_FAILURE:Module._utility_scalar(1),SIGINT:Module._utility_scalar(2),SIG_IGN:Module._utility_signal_pointer(0),done1Pointer:Module._utility_signal_pointer(1),
        stdout:Module._utility_stdout(),stderr:Module._utility_stderr(),
        flags:{get ignintr(){return Module._utility_get_ignintr();}},
        signal:(n,p)=>Module._utility_signal(n,BigInt(p)),
        vaListLocal:()=>({value:0n}),va_start:p=>{p.value=varargs;},va_end:p=>Module._utility_va_end(p.value),
        vfprintf:(f,s,p)=>Module._utility_vfprintf(BigInt(f),BigInt(raw(s)),p.value),vprintf:(s,p)=>Module._utility_vprintf(BigInt(raw(s)),p.value),
        nethack_exit:s=>Module._utility_exit(s),exit:s=>Module._utility_exit(s),
        chdir:p=>Module._utility_chdir(BigInt(raw(p))),perror:p=>Module._utility_perror(BigInt(raw(p))),
        error:(s,p)=>Module._utility_error(BigInt(literal(s)),BigInt(raw(p))),
        fprintf:(f,fmt,...args)=>Module._utility_fprintf(BigInt(f),BigInt(literal(fmt)),...Array.from({length:3},(_,i)=>BigInt(literal(args[i]??0)))),
        setChar:(p,i,c)=>Module.HEAPU8[raw(p)+i]=typeof c==='string'?c.charCodeAt(0):c,

        monsterSize:L[0],mextraSize:L[2],oextraSize:L[3],egdSize:L[4],epriSize:L[5],eshkSize:L[6],eminSize:L[7],edogSize:L[8],ebonesSize:L[9],NON_PM:L[10],BUFSZ:L[11],historical:L[12],exportascii:L[13],invalid:L[14],
        alloc:n=>Number(Module._utility_alloc(Number(n)>>>0)),
        free:p=>Module._utility_free(BigInt(raw(p))),
        memset:(p,c,n)=>Module._utility_memset(BigInt(raw(p)),c,BigInt(n)),
        newmonst:()=>record(Module._utility_alloc(L[0]),'monst'),
        dupstr:p=>Number(Module._utility_dupstr(BigInt(raw(p)))),
        strchr:(p,c)=>Number(Module._utility_strchr(BigInt(raw(p)),typeof c==='string'?c.charCodeAt(0):c)),
        strrchr:(p,c)=>Number(Module._utility_strrchr(BigInt(raw(p)),typeof c==='string'?c.charCodeAt(0):c)),
        strlen:p=>Number(Module._utility_strlen(BigInt(raw(p)))),
        strncmpi:(a,b,n)=>Module._utility_strncmpi(BigInt(raw(a)),BigInt(raw(b)),n),
        getenv:p=>Number(Module._utility_getenv(BigInt(raw(p)))),
        isspace:c=>Module._utility_isspace(c),
        char:p=>view().getInt8(raw(p)),
        lowc:c=>c>=65&&c<=90?c+32:c,
    };
    for (const name of ['mextra','oextra','egd','epri','eshk','emin','edog','ebones']) env[name]=p=>record(p,name);
    const parameterTypes = {
        new_mgivenname:'monst',free_mgivenname:'monst',newegd:'monst',free_egd:'monst',newepri:'monst',free_epri:'monst',neweshk:'monst',free_eshk:'monst',newemin:'monst',free_emin:'monst',newedog:'monst',free_edog:'monst',newebones:'monst',free_ebones:'monst',init_mextra:'mextra',newomonst:'obj',free_omonst:'obj',newomid:'obj',free_omid:'obj',new_omailcmd:'obj',free_omailcmd:'obj',init_oextra:'oextra',dealloc_mextra:'monst',dealloc_monst:'monst',new_oname:'obj',free_oname:'obj',
    };
    return {literal,L,record,env,vararg(kind,text,ap){const previous=varargs;varargs=ap;try{return withEnvironment(env,core[['raw_printf','error','pline','impossible'][kind]],Number(text));}finally{varargs=previous;}},invoke(name,args){
        args=args.map((a,i)=>typeof a==='bigint'&&!(name==='util_strncmpi'&&i===2)?Number(a):a);
        if(name==='usage'){const p=args[1];args[1]=new Proxy({}, {get(_,i){return ptr(p,Number(i)*8);}});}
        if (parameterTypes[name]) args[0]=record(args[0],parameterTypes[name]);
        if (name==='util_strncmpi')args[2]=BigInt.asUintN(64,BigInt(args[2]));
        const result=withEnvironment(env,core[name],...args);
        if (result===undefined) return;
        if (result&&typeof result==='object') return BigInt(result.address);
        if (typeof result==='string') return BigInt(literal(result));
        if (['briefname','nh_getenv'].includes(name)) return BigInt(result);
        return result;
    }};
}
