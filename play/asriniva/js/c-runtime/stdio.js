// Synchronous stdio on CVFS. FILE addresses are opaque; buffers, including
// caller-supplied buffers, live in CMemory and survive memory growth. Optional
// readStdin(n) synchronously returns <=n real bytes; zero is EOF. Callback input
// is nonseekable and discards unread prefetch like SDK TTY; the historical finite
// array keeps its existing discard/rewind behavior outside freopen.
import {VFSError,O_WRONLY,O_RDWR,O_CREAT,O_TRUNC,O_EXCL,O_APPEND,O_CLOEXEC,O_LARGEFILE} from '../services/c-vfs.js';
import {address} from './memory.js';
import {scanFormatted} from './scanf.js';
const sdkUtf8Decoder=new TextDecoder();
// Pinned SDK libstrings.js TEXTDECODER=1/default-assertions UTF8ToString.
// CMemory's byte-string operations deliberately keep their Latin1 contract.
export function readSdkUtf8(memory,p){
    if(typeof p==='string')return p;p=address(p);if(!p)return '';
    const h=memory.HEAPU8;let end=p;while(h[end])end++;
    if(end-p>16)return sdkUtf8Decoder.decode(h.subarray(p,end));
    let out='';while(p<end){let a=h[p++];if(!(a&128)){out+=String.fromCharCode(a);continue;}const b=h[p++]&63;if((a&224)===192){out+=String.fromCharCode(((a&31)<<6)|b);continue;}const c=h[p++]&63;if((a&240)===224)a=((a&15)<<12)|(b<<6)|c;else a=((a&7)<<18)|(b<<12)|(c<<6)|(h[p++]&63);if(a<65536)out+=String.fromCharCode(a);else{a-=65536;out+=String.fromCharCode(55296|(a>>10),56320|(a&1023));}}return out;
}
export function createStdio(memory,filesystem,libc,{stdin=new Uint8Array(),readStdin,stdout,stderr}={}) {
    if(readStdin!==undefined&&typeof readStdin!=='function')throw new TypeError('Expected synchronous readStdin callback');
    const files=new Map(),output=[[],[]],closedStandard=new Set(),standardFlags=[0,O_WRONLY|O_CREAT,O_WRONLY|O_CREAT];let inputOffset=0;
    const text=v=>typeof v==='string'?v:memory.readString(address(v));
    const pathText=v=>readSdkUtf8(memory,v);
    const fail=(error,value)=>{if(!(error instanceof VFSError))throw error;libc.errno=error.errno;return value;};
    const capture=(operation,value)=>{try{return operation();}catch(error){return fail(error,value);}};
    const modeFlags=mode=>(mode.includes('+')?O_RDWR:mode[0]==='r'?0:O_WRONLY)|(mode.includes('x')?O_EXCL:0)|(mode.includes('e')?O_CLOEXEC:0)|(mode[0]!=='r'?O_CREAT:0)|(mode[0]==='w'?O_TRUNC:0)|(mode[0]==='a'?O_APPEND:0);
    const validMode=mode=>!mode||'rwa'.includes(mode[0]);
    const regular=fd=>filesystem.descriptors.has(fd);
    function validateDescriptor(fd){if(regular(fd))filesystem.fstat(fd);else if(fd<0||fd>2||closedStandard.has(fd))throw new VFSError('EBADF');return fd;}
    function seekDescriptor(fd,n,whence){validateDescriptor(fd);if(!regular(fd))throw new VFSError('ESPIPE');return filesystem.lseek(fd,n,whence);}
    function closeDescriptor(fd){validateDescriptor(fd);if(regular(fd))filesystem.close(fd);if(fd<3)closedStandard.add(fd);return 0;}
    function openDescriptor(path,flags,mode){let fd=filesystem.open(path,flags|O_LARGEFILE,mode);for(let n=0;n<3;n++)if(closedStandard.has(n)){filesystem.dup(fd,n);filesystem.close(fd);closedStandard.delete(n);fd=n;break;}return fd;}
    function duplicate(fd,target){validateDescriptor(fd);if(!regular(fd))throw new VFSError('ENOTSUP');if(target===undefined){for(let n=0;n<3;n++)if(closedStandard.has(n)){target=n;break;}}const result=filesystem.dup(fd,target);if(result<3)closedStandard.delete(result);return result;}
    function hostWrite(fd,bytes){const sink=fd===1?stdout:stderr;if(sink)sink(bytes);else output[fd-1].push(bytes);return bytes.length;}
    function stream(p){const f=files.get(address(p));if(!f)throw new VFSError('EBADF');return f;}
    function allocate(fd,mode=0,access='r+') {
        const p=memory.calloc(1,32);if(!p)throw new VFSError('ENOMEM');
        files.set(p,{fd,eof:false,error:false,readable:access[0]==='r'||access.includes('+'),writable:access[0]!=='r'||access.includes('+'),unget:[],mode,capacity:mode===2?0:1024,buffer:0,ownsBuffer:true,readPos:0,readEnd:0,writeEnd:0});return p;
    }
    function buffer(f){if(!f.buffer){f.buffer=memory.malloc(f.capacity);if(!f.buffer)throw new VFSError('ENOMEM');}return f.buffer;}
    function read(fd,p,n) {
        fd=Number(fd);n=Number(n);p=address(p);memory.bounds(p,n);
        if(regular(fd))return filesystem.read(fd,memory.HEAPU8,p,n);
        validateDescriptor(fd);
        if(fd===0){if(!n)return 0;if(readStdin){const bytes=readStdin(n);if(!(bytes instanceof Uint8Array)||bytes.length>n)throw new TypeError('readStdin must return Uint8Array no longer than the requested read');memory.HEAPU8.set(bytes,p);return bytes.length;}const count=Math.min(n,stdin.length-inputOffset);memory.HEAPU8.set(stdin.subarray(inputOffset,inputOffset+count),p);inputOffset+=count;return count;}
        if(fd===1||fd===2)throw new VFSError('EBADF');return filesystem.read(fd,memory.HEAPU8,p,n);
    }
    function write(fd,p,n) {
        fd=Number(fd);n=Number(n);p=address(p);memory.bounds(p,n);
        if(regular(fd))return filesystem.write(fd,memory.HEAPU8,p,n);
        validateDescriptor(fd);
        if(fd===1||fd===2)return hostWrite(fd,memory.readBytes(p,n));
        if(fd===0)throw new VFSError('EBADF');return filesystem.write(fd,memory.HEAPU8,p,n);
    }
    function flush(f) {
        let written=0;
        try{while(written<f.writeEnd){const n=write(f.fd,f.buffer+written,f.writeEnd-written);if(!n)throw new VFSError('EIO');written+=n;}}
        finally{if(written)memory.HEAPU8.copyWithin(f.buffer,f.buffer+written,f.buffer+f.writeEnd);f.writeEnd-=written;}
    }
    function discardInput(f,ignoreSeekFailure=false) {
        const unread=f.readEnd-f.readPos+f.unget.length;
        if(unread)try{if(f.fd===0&&!regular(0)){if(readStdin)throw new VFSError('ESPIPE');inputOffset-=unread;}else seekDescriptor(f.fd,-unread,1);}catch(error){if(!ignoreSeekFailure)throw error;fail(error,0);}
        f.readEnd=f.readPos=0;f.unget=[];
    }
    function fileRead(f,p,n) {
        p=address(p);n=Number(n);memory.bounds(p,n);flush(f);if(!f.readable){f.error=true;return 0;}let done=0;
        while(done<n){
            if(f.unget.length){memory.HEAPU8[p+done++]=f.unget.pop();continue;}
            if(f.readPos<f.readEnd){const count=Math.min(n-done,f.readEnd-f.readPos);memory.memmove(p+done,f.buffer+f.readPos,count);f.readPos+=count;done+=count;continue;}
            if(f.eof)break;
            if(!f.capacity){const count=read(f.fd,p+done,n-done);done+=count;if(!count){f.eof=true;break;}}
            else {const at=buffer(f),count=read(f.fd,at,f.capacity);f.readPos=0;f.readEnd=count;if(!count){f.eof=true;break;}}
        }
        return done;
    }
    function fileWrite(f,p,n) {
        p=address(p);n=Number(n);memory.bounds(p,n);if(!f.writable){f.error=true;return 0;}discardInput(f);
        // Configured musl __fwritex writes pending bytes and the entire input
        // directly when it exceeds available space; an exact fit stays pending.
        if(n>f.capacity-f.writeEnd){flush(f);return write(f.fd,p,n);}
        let done=0;
        if(f.mode===1){
            for(let i=n;i>0;i--)if(memory.HEAPU8[p+i-1]===10){flush(f);done=write(f.fd,p,i);if(done<i)return done;break;}
        }
        if(done<n){memory.memmove(buffer(f)+f.writeEnd,p+done,n-done);f.writeEnd+=n-done;}
        return n;
    }

    function operation(p,fn,failure,markError=true){let f;try{f=stream(p);return fn(f);}catch(error){if(markError&&f&&error instanceof VFSError)f.error=true;return fail(error,failure);}}
    const api={
        stdin:allocate(0,0,'r'),stdout:allocate(1,1,'w'),stderr:allocate(2,2,'w'),
        open:(p,flags,mode=0o666)=>capture(()=>openDescriptor(pathText(p),Number(flags),Number(mode)),-1),
        close:fd=>capture(()=>closeDescriptor(Number(fd)),-1),
        dup:fd=>capture(()=>duplicate(Number(fd)),-1),
        dup2:(fd,target)=>capture(()=>{fd=Number(fd);target=Number(target);if(fd===target)return validateDescriptor(fd);return duplicate(fd,target);},-1),
        descriptorFlags:fd=>{fd=Number(fd);validateDescriptor(fd);return regular(fd)?filesystem.descriptorFlags(fd):standardFlags[fd];},
        addDescriptorFlags:(fd,flags)=>{fd=Number(fd);validateDescriptor(fd);if(regular(fd))return filesystem.addDescriptorFlags(fd,Number(flags));standardFlags[fd]|=Number(flags);return 0;},
        hostError:message=>hostWrite(2,new TextEncoder().encode(message)),
        read:(fd,p,n)=>capture(()=>read(fd,p,n),-1),write:(fd,p,n)=>capture(()=>write(fd,p,n),-1),
        lseek:(fd,n,whence)=>capture(()=>BigInt(seekDescriptor(Number(fd),Number(n),Number(whence))),-1n),
        unlink:p=>capture(()=>{filesystem.unlink(pathText(p));return 0;},-1),
        rename:(a,b)=>capture(()=>{filesystem.rename(pathText(a),pathText(b));return 0;},-1),
        mkdir:(p,mode)=>capture(()=>{filesystem.mkdir(pathText(p),Number(mode));return 0;},-1),
        chdir:p=>capture(()=>{filesystem.chdir(pathText(p));return 0;},-1),
        fopen:(path,mode)=>capture(()=>{mode=text(mode);if(!validMode(mode))throw new VFSError('EINVAL');const fd=openDescriptor(pathText(path),modeFlags(mode),0o666);try{return allocate(fd,0,mode);}catch(error){closeDescriptor(fd);throw error;}},0),
        fdopen:(fd,mode)=>capture(()=>{fd=Number(fd);validateDescriptor(fd);mode=text(mode);if(!validMode(mode))throw new VFSError('EINVAL');if(mode[0]==='a')api.addDescriptorFlags(fd,O_APPEND);return allocate(fd,0,mode);},0),
        fclose:p=>operation(p,f=>{let result=0;try{flush(f);discardInput(f,Boolean(readStdin&&f.fd===0&&!regular(0)));}catch(error){result=fail(error,-1);}try{closeDescriptor(f.fd);}catch(error){result=fail(error,-1);}files.delete(address(p));if(f.ownsBuffer&&f.buffer)memory.free(f.buffer);memory.free(address(p));return result;},-1),
        fileno:p=>operation(p,f=>f.fd,-1),
        fflush:p=>p?operation(p,f=>{flush(f);discardInput(f,Boolean(readStdin&&f.fd===0&&!regular(0)));return 0;},-1):capture(()=>{let status=0;for(const [p,f]of files)if(f.writeEnd&&operation(p,()=>{flush(f);return 0;},-1)!==0)status=-1;return status;},-1),
        setvbuf:(p,userBuffer,mode,size)=>operation(p,f=>{
            mode=Number(mode);size=Number(size);userBuffer=address(userBuffer);
            // setvbuf is defined before stream I/O. musl retains its original
            // buffer for null/small supplied storage, and reserves UNGET=8.
            f.mode=0;
            if(![0,1,2].includes(mode))return -1;
            if(!Number.isSafeInteger(size)||size<0)throw new RangeError('Invalid stdio buffer size');
            if(mode===2)f.capacity=0;
            else if(userBuffer&&size>=8){
                memory.bounds(userBuffer,size);
                if(f.ownsBuffer&&f.buffer)memory.free(f.buffer);
                f.buffer=userBuffer+8;f.ownsBuffer=false;f.capacity=size-8;
            }
            if(mode===1&&f.capacity)f.mode=1;
            return 0;
        },-1),
        setbuf:(p,userBuffer)=>{api.setvbuf(p,userBuffer,userBuffer?0:2,1024);},
        __fbufsize:p=>operation(p,f=>f.capacity,0),
        __fpending:p=>operation(p,f=>f.writeEnd,0),
        fread:(p,size,count,file)=>operation(file,f=>{size=Number(size);count=Number(count);if(!size||!count)return 0;return Math.floor(fileRead(f,p,size*count)/size);},0),
        fwrite:(p,size,count,file)=>operation(file,f=>{size=Number(size);count=Number(count);if(!size||!count)return 0;return Math.floor(fileWrite(f,p,size*count)/size);},0),
        fgetc:p=>operation(p,f=>{const at=memory.malloc(1);if(!at)throw new VFSError('ENOMEM');try{return fileRead(f,at,1)?memory.HEAPU8[at]:-1;}finally{memory.free(at);}},-1),
        ungetc:(c,p)=>operation(p,f=>{if(Number(c)===-1)return -1;if(!f.readable){f.error=true;return -1;}if(f.unget.length>=8+f.readPos)return -1;f.eof=false;f.unget.push(Number(c)&255);return Number(c)&255;},-1),
        fputc:(c,p)=>operation(p,f=>{const at=memory.malloc(1);if(!at)throw new VFSError('ENOMEM');try{memory.HEAPU8[at]=Number(c)&255;return fileWrite(f,at,1)===1?Number(c)&255:-1;}finally{memory.free(at);}},-1),
        feof:p=>operation(p,f=>Number(f.eof),0),ferror:p=>operation(p,f=>Number(f.error),0),clearerr:p=>operation(p,f=>{f.eof=f.error=false;},undefined),
        fseek:(p,n,whence)=>operation(p,f=>{try{flush(f);}catch(e){f.error=true;throw e;}discardInput(f);seekDescriptor(f.fd,Number(n),Number(whence));f.eof=false;return 0;},-1,false),
        ftell:p=>operation(p,f=>BigInt(seekDescriptor(f.fd,0,1)-f.readEnd+f.readPos-f.unget.length+f.writeEnd),-1n,false),
        captured(fd){if(fd!==1&&fd!==2)throw new RangeError('Unknown output fd');const parts=output[fd-1],bytes=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){bytes.set(p,at);at+=p.length;}return bytes;},
    };
    api.freopen=(path,mode,p)=>operation(p,f=>{
        mode=text(mode);let flags=modeFlags(mode);let flushed;
        if(f.fd===0&&!regular(0)&&(f.readEnd-f.readPos+f.unget.length)){flush(f);fail(new VFSError('ESPIPE'),0);flushed=0;}else flushed=api.fflush(p);
        // musl fflush retires read pointers even after a failed input seek;
        // its failed write callback retires pending write pointers too.
        f.readPos=f.readEnd=0;f.unget=[];if(flushed<0)f.writeEnd=0;
        const unnamed=path===0||path===0n||path===null||path===undefined;
        if(unnamed){
            flags&=~(O_CREAT|O_EXCL|O_CLOEXEC);
            try{api.addDescriptorFlags(f.fd,flags);}catch(error){fail(error,0);api.fclose(p);return 0;}
        }else{
            const other=api.fopen(path,mode);if(!other){api.fclose(p);return 0;}
            const replacement=stream(other);
            if(replacement.fd===f.fd)replacement.fd=-1;
            else try{duplicate(replacement.fd,f.fd);}catch(error){fail(error,0);api.fclose(other);api.fclose(p);return 0;}
            f.readable=replacement.readable;f.writable=replacement.writable;f.eof=f.error=false;
            api.fclose(other);
        }
        return address(p);
    },0);
    api.fscanf=(file,format,...outputs)=>operation(file,f=>{flush(f);if(!f.readable){f.error=true;return -1;}return scanFormatted(memory,libc,{get:()=>api.fgetc(file),unget:c=>api.ungetc(c,file)},text(format).split('\0')[0],outputs);},-1);
    api.getc=api.fgetc;api.putc=api.fputc;api.getchar=()=>api.fgetc(api.stdin);api.putchar=c=>api.fputc(c,api.stdout);
    api.creat=(path,mode)=>api.open(path,O_WRONLY|O_CREAT|O_TRUNC,mode);
    api.rewind=p=>{api.fseek(p,0,0);api.clearerr(p);};
    api.fgets=(p,n,file)=>{p=address(p);n=Number(n);if(n<=0)return 0;memory.bounds(p,n);let i=0;while(i<n-1){const c=api.fgetc(file);if(c===-1)break;memory.HEAPU8[p+i++]=c;if(c===10)break;}if(!i&&n>1)return 0;memory.HEAPU8[p+i]=0;return p;};
    api.fputs=(str,p)=>{if(typeof str==='string'){const at=memory.cstring(str);try{return api.fputs(at,p);}finally{memory.free(at);}}const n=memory.strlen(address(str));return api.fwrite(str,1,n,p)===n?0:-1;};
    api.fprintf=(p,format,...args)=>{const value=libc.format(format,...args);return api.fputs(value,p)===-1?-1:value.length;};
    api.printf=(format,...args)=>api.fprintf(api.stdout,format,...args);api.puts=str=>api.fputs(str,api.stdout)===-1?-1:api.fputc(10,api.stdout);
    api.remove=p=>capture(()=>{const path=pathText(p);if(filesystem.isDir(filesystem.stat(path).mode))filesystem.rmdir(path);else filesystem.unlink(path);return 0;},-1);
    return api;
}
