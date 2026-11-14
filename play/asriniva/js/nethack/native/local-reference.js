// Native by-reference values keep the caller's local and typed writeback order.
// A true byte consumer can materialize the declaring frame's cell on demand.
const references=new WeakMap();
export function isNativeLocalReference(value,owner,kind){const row=value&&typeof value==='object'?references.get(value):undefined;return Boolean(row&&row.owner===owner&&(kind===undefined||row.kind===kind));}
export function createNativeLocalReference({owner,kind,descriptor,width,allocate,get,set,normalize,read,write,uninitialized=false}){
 if(typeof allocate.reserve!=='function')throw Error('Native local references require declaring-frame reservations');
 const reserved=allocate.reserve(width);let at,ready=!uninitialized,value=ready?normalize(get()):undefined;
 const out={descriptor,localRef:true,set,
  get address(){reserved.assertAlive();if(at===undefined){at=Number(reserved());if(ready)write(at,value);}return at;},
  get value(){reserved.assertAlive();if(!ready&&at===undefined)return read(this.address);return at===undefined?value:read(at);},
  set value(next){reserved.assertAlive();value=normalize(next);ready=true;if(at!==undefined)write(at,value);set(at===undefined?value:read(at));},
  commit(){reserved.assertAlive();set(this.value);},
 };
 references.set(out,{owner,kind});return out;
}
