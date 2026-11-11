// Synchronous stdio on CVFS. FILE addresses are opaque; buffers, including
// caller-supplied buffers, live in CMemory and survive memory growth.
import {VFSError} from '../services/c-vfs.js';
import {address} from './memory-services.js';
export function createStdio(memory,filesystem,libc,{stdin=new Uint8Array(),stdout,stderr}={}) {
    const files=new Map(),output=[[],[]];let inputOffset=0;
    const text=v=>typeof v==='string'?v:memory.readString(address(v));
    const fail=(error,value)=>{if(!(error instanceof VFSError))throw error;libc.errno=error.errno;return value;};
    const capture=(operation,value)=>{try{return operation();}catch(error){return fail(error,value);}};
    function stream(p){const f=files.get(address(p));if(!f)throw new VFSError('EBADF');return f;}
    function allocate(fd,mode=0) {
        const p=memory.calloc(1,32);if(!p)throw new VFSError('ENOMEM');
        files.set(p,{fd,eof:false,error:false,unget:[],mode,capacity:1024,buffer:0,ownsBuffer:true,readPos:0,readEnd:0,writeEnd:0});return p;
    }
    function buffer(f){if(!f.buffer){f.buffer=memory.malloc(f.capacity);if(!f.buffer)throw new VFSError('ENOMEM');}return f.buffer;}
    function read(fd,p,n) {
        fd=Number(fd);n=Number(n);p=address(p);memory.bounds(p,n);
        if(fd===0){const count=Math.min(n,stdin.length-inputOffset);memory.HEAPU8.set(stdin.subarray(inputOffset,inputOffset+count),p);inputOffset+=count;return count;}
        if(fd===1||fd===2)throw new VFSError('EBADF');return filesystem.read(fd,memory.HEAPU8,p,n);
    }
    function write(fd,p,n) {
        fd=Number(fd);n=Number(n);p=address(p);memory.bounds(p,n);
        if(fd===1||fd===2){const bytes=memory.readBytes(p,n),sink=fd===1?stdout:stderr;if(sink)sink(bytes);else output[fd-1].push(bytes);return n;}
        if(fd===0)throw new VFSError('EBADF');return filesystem.write(fd,memory.HEAPU8,p,n);
    }
    function flush(f) {
        let written=0;
        try{while(written<f.writeEnd){const n=write(f.fd,f.buffer+written,f.writeEnd-written);if(!n)throw new VFSError('EIO');written+=n;}}
        finally{if(written)memory.HEAPU8.copyWithin(f.buffer,f.buffer+written,f.buffer+f.writeEnd);f.writeEnd-=written;}
    }
    function discardInput(f) {
        const unread=f.readEnd-f.readPos+f.unget.length;
        if(unread){if(f.fd===0)inputOffset-=unread;else filesystem.lseek(f.fd,-unread,1);}
        f.readEnd=f.readPos=0;f.unget=[];
    }
    function fileRead(f,p,n) {
        p=address(p);n=Number(n);memory.bounds(p,n);flush(f);let done=0;
        while(done<n){
            if(f.unget.length){memory.HEAPU8[p+done++]=f.unget.pop();continue;}
            if(f.readPos<f.readEnd){const count=Math.min(n-done,f.readEnd-f.readPos);memory.memmove(p+done,f.buffer+f.readPos,count);f.readPos+=count;done+=count;continue;}
            if(f.eof)break;
            if(f.mode===2){const count=read(f.fd,p+done,n-done);done+=count;if(!count){f.eof=true;break;}}
            else {const at=buffer(f),count=read(f.fd,at,f.capacity);f.readPos=0;f.readEnd=count;if(!count){f.eof=true;break;}}
        }
        return done;
    }
    function fileWrite(f,p,n) {
        p=address(p);n=Number(n);memory.bounds(p,n);discardInput(f);
        if(f.mode===2)return write(f.fd,p,n);
        const at=buffer(f);let done=0;
        while(done<n){
            let count=Math.min(n-done,f.capacity-f.writeEnd);
            if(f.mode===1){const newline=memory.HEAPU8.indexOf(10,p+done);if(newline>=p+done&&newline<p+done+count)count=newline-p-done+1;}
            memory.memmove(at+f.writeEnd,p+done,count);f.writeEnd+=count;done+=count;
            if(f.writeEnd===f.capacity||(f.mode===1&&memory.HEAPU8[at+f.writeEnd-1]===10))flush(f);
        }
        return done;
    }
    function operation(p,fn,failure){let f;try{f=stream(p);return fn(f);}catch(error){if(f&&error instanceof VFSError)f.error=true;return fail(error,failure);}}
    const api={
        stdin:allocate(0),stdout:allocate(1,1),stderr:allocate(2,2),
        open:(p,flags,mode=0o666)=>capture(()=>filesystem.open(text(p),Number(flags),Number(mode)),-1),
        close:fd=>capture(()=>{fd=Number(fd);if(fd<3)throw new VFSError('ENOTSUP');filesystem.close(fd);return 0;},-1),
        read:(fd,p,n)=>capture(()=>read(fd,p,n),-1),write:(fd,p,n)=>capture(()=>write(fd,p,n),-1),
        lseek:(fd,n,whence)=>capture(()=>BigInt(filesystem.lseek(Number(fd),Number(n),Number(whence))),-1n),
        unlink:p=>capture(()=>{filesystem.unlink(text(p));return 0;},-1),
        rename:(a,b)=>capture(()=>{filesystem.rename(text(a),text(b));return 0;},-1),
        mkdir:(p,mode)=>capture(()=>{filesystem.mkdir(text(p),Number(mode));return 0;},-1),
        chdir:p=>capture(()=>{filesystem.chdir(text(p));return 0;},-1),
        fopen:(path,mode)=>capture(()=>{const fd=filesystem.open(text(path),text(mode));try{return allocate(fd);}catch(error){filesystem.close(fd);throw error;}},0),
        fdopen:(fd,mode)=>capture(()=>{fd=Number(fd);if(fd>=3)filesystem.fstat(fd);else if(fd<0)throw new VFSError('EBADF');if(!/^[rwa]\+?b?$|^[rwa]b\+?$/.test(text(mode)))throw new VFSError('EINVAL');return allocate(fd);},0),
        fclose:p=>operation(p,f=>{let result=0;try{flush(f);}catch(error){result=fail(error,-1);}try{if(f.fd>=3)filesystem.close(f.fd);}catch(error){result=fail(error,-1);}files.delete(address(p));if(f.ownsBuffer&&f.buffer)memory.free(f.buffer);memory.free(address(p));return result;},-1),
        fileno:p=>operation(p,f=>f.fd,-1),
        fflush:p=>p?operation(p,f=>{flush(f);discardInput(f);return 0;},-1):capture(()=>{let status=0;for(const [p,f]of files)if(f.writeEnd&&operation(p,()=>{flush(f);return 0;},-1)!==0)status=-1;return status;},-1),
        setvbuf:(p,userBuffer,mode,size)=>operation(p,f=>{
            mode=Number(mode);size=Number(size);userBuffer=address(userBuffer);
            if(![0,1,2].includes(mode)||!Number.isSafeInteger(size)||size<0)throw new VFSError('EINVAL');
            if(userBuffer&&mode!==2){if(!size)throw new VFSError('EINVAL');memory.bounds(userBuffer,size);}
            flush(f);discardInput(f);if(f.ownsBuffer&&f.buffer)memory.free(f.buffer);
            f.buffer=mode===2?0:userBuffer;f.ownsBuffer=!userBuffer;f.capacity=size||1024;f.mode=mode;return 0;
        },-1),
        fread:(p,size,count,file)=>operation(file,f=>{size=Number(size);count=Number(count);if(!size||!count)return 0;return Math.floor(fileRead(f,p,size*count)/size);},0),
        fwrite:(p,size,count,file)=>operation(file,f=>{size=Number(size);count=Number(count);if(!size||!count)return 0;return Math.floor(fileWrite(f,p,size*count)/size);},0),
        fgetc:p=>operation(p,f=>{const at=memory.malloc(1);if(!at)throw new VFSError('ENOMEM');try{return fileRead(f,at,1)?memory.HEAPU8[at]:-1;}finally{memory.free(at);}},-1),
        ungetc:(c,p)=>operation(p,f=>{if(Number(c)===-1||f.unget.length>=8+f.readPos)return -1;f.eof=false;f.unget.push(Number(c)&255);return Number(c)&255;},-1),
        fputc:(c,p)=>operation(p,f=>{const at=memory.malloc(1);if(!at)throw new VFSError('ENOMEM');try{memory.HEAPU8[at]=Number(c)&255;return fileWrite(f,at,1)===1?Number(c)&255:-1;}finally{memory.free(at);}},-1),
        feof:p=>operation(p,f=>Number(f.eof),0),ferror:p=>operation(p,f=>Number(f.error),0),clearerr:p=>operation(p,f=>{f.eof=f.error=false;},undefined),
        fseek:(p,n,whence)=>operation(p,f=>{flush(f);discardInput(f);filesystem.lseek(f.fd,Number(n),Number(whence));f.eof=false;return 0;},-1),
        ftell:p=>operation(p,f=>BigInt(filesystem.lseek(f.fd,0,1)-f.readEnd+f.readPos-f.unget.length+f.writeEnd),-1n),
        captured(fd){if(fd!==1&&fd!==2)throw new RangeError('Unknown output fd');const parts=output[fd-1],bytes=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){bytes.set(p,at);at+=p.length;}return bytes;},
    };
    api.getc=api.fgetc;api.putc=api.fputc;api.getchar=()=>api.fgetc(api.stdin);api.putchar=c=>api.fputc(c,api.stdout);
    api.rewind=p=>{api.fseek(p,0,0);api.clearerr(p);};
    api.fgets=(p,n,file)=>{p=address(p);n=Number(n);if(n<=0)return 0;memory.bounds(p,n);let i=0;while(i<n-1){const c=api.fgetc(file);if(c===-1)break;memory.HEAPU8[p+i++]=c;if(c===10)break;}if(!i&&n>1)return 0;memory.HEAPU8[p+i]=0;return p;};
    api.fputs=(str,p)=>{if(typeof str==='string'){const at=memory.cstring(str);try{return api.fputs(at,p);}finally{memory.free(at);}}const n=memory.strlen(address(str));return api.fwrite(str,1,n,p)===n?0:-1;};
    api.fprintf=(p,format,...args)=>{const value=libc.format(format,...args);return api.fputs(value,p)===-1?-1:value.length;};
    api.printf=(format,...args)=>api.fprintf(api.stdout,format,...args);api.puts=str=>api.fputs(str,api.stdout)===-1?-1:api.fputc(10,api.stdout);
    api.remove=p=>capture(()=>{const path=text(p);if(filesystem.isDir(filesystem.stat(path).mode))filesystem.rmdir(path);else filesystem.unlink(path);return 0;},-1);
    return api;
}
