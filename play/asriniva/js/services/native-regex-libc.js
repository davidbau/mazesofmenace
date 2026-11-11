// JS implementation of the golden Emscripten regex ABI. Its flag values and
// opaque storage are compatible with the existing caller, while parser, match
// and diagnostic behavior follow the original Emscripten musl/TRE C library.
// Handles and memory belong to the runtime; no C regex code is called here.
import {compilePosixRegex,execPosixRegex,freePosixRegex,posixRegexError} from './posix-regex.js';
export function createNativeRegexLibc() {
    const namespaces = new WeakMap();
    const statistics = new WeakMap();
    const emptyCalls = () => ({regcomp:0,regexec:0,regerror:0,regfree:0});
    const provide = services => {
        const key=services.moduleKey ?? services;
        if(!namespaces.has(key))namespaces.set(key,new Map());
        if(!statistics.has(key))statistics.set(key,emptyCalls());
        const handles=namespaces.get(key);
        const calls=statistics.get(key);
        const bytes = pointer => {
            const heap=services.heap();let end=Number(pointer);
            while(heap[end])end++;
            return heap.slice(Number(pointer),end);
        };
        return {
            regcomp(re,source,flags) {
                ++calls.regcomp;
                if(flags!==5&&flags!==9)throw new Error('Unsupported native ERE compilation flags');
                re=Number(re);if(handles.has(re))freePosixRegex(handles.get(re));handles.delete(re);
                const result=compilePosixRegex(bytes(source),9);
                if(!result.status)handles.set(re,result.handle);
                return result.status;
            },
            regexec(re,source,count,matches,flags) {
                ++calls.regexec;
                if(count||matches)throw new Error('Native regex captures are not configured');
                return execPosixRegex(handles.get(Number(re)),bytes(source),flags);
            },
            regerror(error,re,out,size) {
                ++calls.regerror;
                const text=posixRegexError(error),heap=services.heap();out=Number(out);size=Number(size);
                for(let i=0;i<Math.min(text.length,size-1);i++)heap[out+i]=text.charCodeAt(i);
                if(size)heap[out+Math.min(text.length,size-1)]=0;
                return text.length+1;
            },
            regfree(re) {++calls.regfree;re=Number(re);if(handles.has(re))freePosixRegex(handles.get(re));handles.delete(re);},
        };
    };
    provide.diagnostics = key => ({
        transport:'ported-posixregex-direct-js',
        backend:'javascript-emscripten-musl-TRE-ERE-C-locale',
        calls:{...(statistics.get(key) ?? emptyCalls())},
        liveHandles:namespaces.get(key)?.size ?? 0,
    });
    return provide;
}
