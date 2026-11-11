// Additional standalone libc contracts. Formats outside the implemented scan
// conversions fail explicitly, rather than reporting a successful assignment.
import {address} from './memory-services.js';
import {muslQsort} from './qsort.js';
export function createStandaloneLibc(memory,libc,transport,functions) {
    const errnoAt=memory.calloc(1,4);memory.view.setInt32(errnoAt,Number(libc.errno),true);
    Object.defineProperty(libc,'errno',{get:()=>memory.view.getInt32(errnoAt,true),set:v=>memory.view.setInt32(errnoAt,Number(v),true),enumerable:true,configurable:true});
    const text=v=>typeof v==='string'?v:memory.readString(address(v));
    function sscanf(input,format,...outputs) {
        input=text(input);format=text(format);let at=0,out=0,assigned=0,converted=0;
        const fail=()=>at>=input.length&&!converted?-1:assigned;
        for(let i=0;i<format.length;) {
            if(/\s/.test(format[i])){while(/\s/.test(format[++i]??'')&&i<format.length);while(at<input.length&&/\s/.test(input[at]))at++;continue;}
            if(format[i]!=='%'){if(input[at]!==format[i])return fail();at++;i++;continue;}
            i++;if(format[i]==='%'){if(input[at]!=='%')return fail();at++;i++;continue;}
            const suppress=format[i]==='*';if(suppress)i++;
            let widthText='';while(/[0-9]/.test(format[i]??''))widthText+=format[i++];
            const width=widthText?Number(widthText):Infinity;
            let length='';if(/[hljztL]/.test(format[i]??'')){length=format[i++];if((length==='h'||length==='l')&&format[i]===length)length+=format[i++];}
            const kind=format[i++];
            if(!'diuoxXscn['.includes(kind)||length==='L'||(length&&'sc['.includes(kind)))throw new Error('Unsupported standalone scanf conversion '+length+kind);
            if(!'cn['.includes(kind))while(at<input.length&&/\s/.test(input[at]))at++;
            let token='',value;
            if(kind==='n')value=BigInt(at);
            else if(kind==='c'){const n=Number.isFinite(width)?width:1;if(at+n>input.length)return fail();token=input.slice(at,at+n);}
            else if(kind==='s'){token=input.slice(at,at+width).match(/^\S+/)?.[0]??'';if(!token)return fail();}
            else if(kind==='[') {
                let inverted=false;if(format[i]==='^'){inverted=true;i++;}
                let chars='';if(format[i]===']')chars+=format[i++];
                while(i<format.length&&format[i]!==']')chars+=format[i++];
                if(format[i++]!==']')throw new Error('Unterminated scanf scanset');
                const set=new Set();for(let n=0;n<chars.length;n++){if(n+2<chars.length&&chars[n+1]==='-'){for(let c=chars.charCodeAt(n);c<=chars.charCodeAt(n+2);c++)set.add(String.fromCharCode(c));n+=2;}else set.add(chars[n]);}
                while(token.length<width&&at+token.length<input.length&&set.has(input[at+token.length])!==inverted)token+=input[at+token.length];
                if(!token)return fail();
            } else {
                const source=input.slice(at,at+width),pattern=kind==='i'?/^[+-]?(?:0[xX][0-9a-fA-F]+|0[0-7]*|[1-9][0-9]*)/:kind==='o'?/^[+-]?[0-7]+/:'xX'.includes(kind)?/^[+-]?(?:0[xX])?[0-9a-fA-F]+/:/^[+-]?[0-9]+/;
                token=source.match(pattern)?.[0]??'';if(!token)return fail();
                const negative=token[0]==='-',digits=token.replace(/^[+-]/,'');
                const radix=kind==='o'?8:'xX'.includes(kind)?16:kind==='i'?(digits.startsWith('0x')||digits.startsWith('0X')?16:digits[0]==='0'?8:10):10;
                const body=digits.replace(/^0[xX]/,'');value=BigInt(radix===16?'0x'+body:radix===8?'0o'+body:body);if(negative)value=-value;
            }
            if(!suppress) {
                if(out>=outputs.length)throw new Error('Missing scanf output argument');
                const p=address(outputs[out++]);
                if('sc['.includes(kind)){const bytes=Uint8Array.from(token,c=>c.charCodeAt(0));memory.bounds(p,bytes.length+(kind==='c'?0:1));memory.HEAPU8.set(bytes,p);if(kind!=='c')memory.HEAPU8[p+bytes.length]=0;}
                else {const bits=length==='hh'?8:length==='h'?16:['l','ll','j','z','t'].includes(length)?64:32;transport.write((bits===64?'BigInt':'Int')+bits,p,bits===64?BigInt.asIntN(64,value):Number(BigInt.asIntN(bits,value)));}
                if(kind!=='n')assigned++;
            }
            at+=token.length;converted++;
        }
        return assigned;
    }
    return {
        // Match the configured SDK single-process syscall profile.
        getpid:()=>42,
        __errno_location:()=>errnoAt,
        sscanf,
        qsort:(base,n,size,cmp)=>muslQsort(memory,address(base),n,size,(a,b)=>typeof cmp==='function'?cmp(a,b):functions.indirect(cmp,'ipp',a,b)),
        vsnprintf:(out,n,format,args)=>{if(!Array.isArray(args))throw new TypeError('Standalone varargs require a value packet');return libc.snprintf(address(out),Number(n),format,...args);},
        vsprintf:(out,format,args)=>{if(!Array.isArray(args))throw new TypeError('Standalone varargs require a value packet');return libc.sprintf(address(out),format,...args);},
        va_start:ap=>{if(!Array.isArray(ap))throw new TypeError('Expected varargs packet');},va_end:()=>{},
        bzero:(p,n)=>memory.memset(address(p),0,Number(n)),
        bcopy:(src,dst,n)=>memory.memmove(address(dst),address(src),Number(n)),
        strcasecmp:(a,b)=>{
            a=text(a).split('\0')[0];b=text(b).split('\0')[0];
            const fold=c=>c>=65&&c<=90?c+32:c;
            for(let i=0;;i++){const left=fold(i<a.length?a.charCodeAt(i):0),right=fold(i<b.length?b.charCodeAt(i):0);if(left!==right||!left)return left-right;}
        },
        get text(){return text;},
    };
}
