// Native scratch bytes materialize only at a real byte consumer. Reservations
// keep ownership in the declaring frame even when an address is requested below it.
import {CMemory} from '../../c-runtime/heap.js';
export function createNativeByteValues(environment){
 const {transport:t,memory}=environment;
 return function nativeByteBuffer(size){
  size=Number(size);if(!Number.isSafeInteger(size)||size<0)throw RangeError('Native byte buffer extent');
  const reservation=t.stackAlloc.reserve(size),views=new Map();let at,data;
  const bounds=i=>{reservation.assertAlive();if(!Number.isSafeInteger(i)||i<0||i>=size)throw RangeError('Native byte buffer extent');};
  const bytes=()=>{reservation.assertAlive();return at===undefined?(data??=new Uint8Array(size)):memory.HEAPU8.subarray(at,at+size);};
  function make(offset){
   reservation.assertAlive();if(!Number.isSafeInteger(offset)||offset<0||offset>size)throw RangeError('Native byte buffer extent');if(views.has(offset))return views.get(offset);
   const value={nativeBytes:true,[Symbol.toPrimitive](){return this.address;},get address(){reservation.assertAlive();if(at===undefined){at=reservation();if(data){memory.HEAPU8.set(data,at);data=undefined;}}return at+offset;},
    at(index){if(!Number.isSafeInteger(index))throw RangeError('Native byte buffer extent');return make(offset+index);},
    store(i,v){i+=offset;bounds(i);v=t.char(v);bytes()[i]=v;return v;},
    load(i=0){i+=offset;bounds(i);const v=bytes()[i];return v<<24>>24;},
    cstringBytes(){const value=bytes().subarray(offset),n=value.indexOf(0);if(n<0)throw RangeError('Unterminated native C string');return value.slice(0,n+1);},
    copyCString(source){reservation.assertAlive();let value;
     if(source?.nativeBytes)value=source.cstringBytes();
     else if(typeof source==='string'){const raw=CMemory.byteString(source),n=raw.indexOf(0);value=new Uint8Array((n<0?raw.length:n)+1);value.set(n<0?raw:raw.subarray(0,n));}
     else{const p=environment.address(source),n=memory.strlen(p);value=memory.HEAPU8.subarray(p,p+n+1);}
     if(value.length>size-offset)throw RangeError('Native C string exceeds buffer');bytes().set(value,offset);return this;
    },
   };views.set(offset,value);return value;
  }
  return make(0);
 };
}
