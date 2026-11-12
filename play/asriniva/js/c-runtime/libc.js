// Additional standalone libc contracts. Formats outside the implemented scan
// conversions fail explicitly, rather than reporting a successful assignment.
import {createErrnoStrings} from './errno.js';
import {address} from './memory.js';
import {muslQsort} from './qsort.js';
import {scanFormatted} from './scanf.js';
export function createStandaloneLibc(memory,libc,transport,functions) {
    const errnoAt=memory.calloc(1,4);memory.view.setInt32(errnoAt,Number(libc.errno),true);
    Object.defineProperty(libc,'errno',{get:()=>memory.view.getInt32(errnoAt,true),set:v=>memory.view.setInt32(errnoAt,Number(v),true),enumerable:true,configurable:true});
    const text=v=>typeof v==='string'?v:memory.readString(address(v));
    function sscanf(input,format,...outputs) {
        input=text(input).split('\0')[0];let at=0;
        return scanFormatted(memory,libc,{get:()=>at<input.length?input.charCodeAt(at++):-1,unget:()=>{at--;}},text(format).split('\0')[0],outputs);
    }
    function strncasecmp(a,b,n){
        const count=Number(transport.ulong(n));if(!count)return 0;
        const byte=(value,i)=>{if(typeof value==='string')return i<value.length?value.charCodeAt(i)&255:0;const at=address(value)+i;memory.bounds(at);return memory.HEAPU8[at];};
        const fold=c=>c>=65&&c<=90?c+32:c;
        for(let i=0;i<count;i++){const left=fold(byte(a,i)),right=fold(byte(b,i));if(left!==right||!left)return left-right;}return 0;
    }
    return {
        ...createErrnoStrings(memory),
        // Pinned musl difftime subtracts signed time_t before converting to double.
        difftime:(end,start)=>Number(BigInt.asIntN(64,transport.long(end)-transport.long(start))),
        __errno_location:()=>errnoAt,
        sscanf,
        qsort:(base,n,size,cmp)=>muslQsort(memory,address(base),n,size,(a,b)=>typeof cmp==='function'?cmp(a,b):functions.indirect(cmp,'ipp',a,b)),
        vsnprintf:(out,n,format,args)=>{if(!Array.isArray(args))throw new TypeError('Standalone varargs require a value packet');return libc.snprintf(address(out),transport.ulong(n),format,...args);},
        vsprintf:(out,format,args)=>{if(!Array.isArray(args))throw new TypeError('Standalone varargs require a value packet');return libc.sprintf(address(out),format,...args);},
        va_start:ap=>{if(!Array.isArray(ap))throw new TypeError('Expected varargs packet');},va_end:()=>{},
        bzero:(p,n)=>memory.memset(address(p),0,Number(n)),
        bcopy:(src,dst,n)=>memory.memmove(address(dst),address(src),Number(n)),
        strncasecmp,strcasecmp:(a,b)=>strncasecmp(a,b,(1n<<64n)-1n),
        get text(){return text;},
    };
}
