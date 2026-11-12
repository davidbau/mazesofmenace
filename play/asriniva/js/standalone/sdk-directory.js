// Actual SDK musl dirstream buffering over the shared MEMFS-compatible VFS.
import abi from './sdk-directory-abi.json' with {type:'json'};
import {readSdkUtf8} from '../c-runtime/stdio.js';
import {VFSError,O_DIRECTORY,O_CLOEXEC,O_LARGEFILE} from '../c-runtime/vfs.js';
const owners=new WeakMap();
export function enableSdkDirectory(environment){
 if(owners.has(environment))return owners.get(environment);
 const{memory:m,filesystem:fs,libc}=environment,L=abi.layout,live=new Set(),address=environment.address;
 const fail=e=>{if(!(e instanceof VFSError))throw e;libc.errno=e.errno;return -1;},i=(p,o)=>m.view.getInt32(p+o,true),put=(p,o,v)=>m.view.setInt32(p+o,v,true);
 const api={
  opendir:path=>{let fd;try{fd=fs.open(readSdkUtf8(m,path),O_DIRECTORY|O_CLOEXEC|O_LARGEFILE);}catch(e){fail(e);return 0;}const p=m.calloc(1,L.size);if(!p){fs.close(fd);return 0;}put(p,L.fd,fd);live.add(p);return p;},
  readdir:dir=>{const p=address(dir);if(!live.has(p))throw new Error('Invalid or released DIR pointer');let pos=i(p,L.buf_pos),end=i(p,L.buf_end);if(pos>=end){try{const stream=fs._descriptor(i(p,L.fd));stream.getdents??=fs.readdir(fs._path(stream.node));const names=stream.getdents,start=Math.floor(stream.position/L.entrySize),stop=Math.min(names.length,start+Math.floor(L.capacity/L.entrySize));let bytes=0;for(let idx=start;idx<stop;idx++){const name=names[idx],node=name==='.'?stream.node:name==='..'?stream.node.parent:stream.node.children.get(name);if(!node)throw new VFSError('ENOENT');const at=p+L.buf+bytes;m.view.setBigUint64(at+L.ino,BigInt(node.ino),true);m.view.setBigInt64(at+L.off,BigInt((idx+1)*L.entrySize),true);m.view.setUint16(at+L.reclen,L.entrySize,true);m.view.setUint8(at+L.type,node.type==='dir'?4:node.type==='null'?2:8);const encoded=new TextEncoder().encode(name);let n=Math.min(encoded.length,255);while(n>0&&n<encoded.length&&(encoded[n]&192)===128)n--;m.HEAPU8.set(encoded.subarray(0,n),at+L.name);m.HEAPU8[at+L.name+n]=0;bytes+=L.entrySize;}stream.position=stop*L.entrySize;if(!bytes)return 0;put(p,L.buf_pos,0);put(p,L.buf_end,bytes);pos=0;}catch(e){if(e instanceof VFSError&&e.code==='ENOENT')return 0;fail(e);return 0;}}
   const at=p+L.buf+pos;put(p,L.buf_pos,pos+m.view.getUint16(at+L.reclen,true));m.view.setBigInt64(p+L.tell,m.view.getBigInt64(at+L.off,true),true);return at;},
  closedir:dir=>{const p=address(dir);if(!live.has(p))throw new Error('Invalid or released DIR pointer');let result=0;try{fs.close(i(p,L.fd));}catch(e){result=fail(e);}live.delete(p);m.free(p);return result;},
 };
 for(const name of Object.keys(api))if(environment.hasFunction(name))throw new Error('SDK directory would replace owner '+name);
 Object.assign(environment.services,api);environment.register('sdk-directory',api);const owner={api,live};owners.set(environment,owner);return owner;
}
