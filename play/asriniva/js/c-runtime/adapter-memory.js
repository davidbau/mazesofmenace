// Shared implementations of the existing C adapter memory profiles.
// Profiles retain their own array, conversion, initialization and field contracts.
export function descriptorArray(cache,width,read,write,d,at){const key='array:'+JSON.stringify(d)+':'+at;if(cache.has(key))return cache.get(key);const child=d.a.length===1?d.e:{a:d.a.slice(1),e:d.e},stride=width(child),target={address:at,byteLength:width(d),descriptor:d};
        const result=new Proxy(target,{get(o,k){return typeof k==='string'&&/^\d+$/.test(k)?read(child,at+Number(k)*stride):Reflect.get(o,k);},set(o,k,v){if(typeof k==='string'&&/^\d+$/.test(k)){write(child,at+Number(k)*stride,v);return true;}return Reflect.set(o,k,v);}});cache.set(key,result);return result;}

export function writeIntegerCell(memory,address,bits,v){const dv=memory();if(bits===64)dv.setBigUint64(address,BigInt.asUintN(64,BigInt(v)),true);else dv['setUint'+bits](address,Number(v),true);}

export function narrowInteger(signed,bits,v){const n=BigInt[signed==='i'?'asIntN':'asUintN'](bits,BigInt(typeof v==='number'?Math.trunc(v):v));return bits===64?n:Number(n);}

export function writeDescriptor(services,addr,width,memory,raw,d,at,v){if(d.s){services.heap().copyWithin(at,addr(v),addr(v)+width(d));return;}const dv=memory();if(d.p!==undefined||d.f||d.t?.slice(1)==='64')dv.setBigUint64(at,raw(v),true);else dv['setUint'+d.t.slice(1)](at,Number(v),true);}

export function readIntegerCell(memory,decode,t,bits,address){const dv=memory();return decode(t,bits===64?dv.getBigUint64(address,true):dv['getUint'+bits](address,true));}

export function scalarMethod(t){return ({'char':'Int8','signed char':'Int8','unsigned char':'Uint8','short':'Int16','unsigned short':'Uint16','int':'Int32','unsigned int':'Uint32','long':'BigInt64','long long':'BigInt64','unsigned long':'BigUint64','unsigned long long':'BigUint64'}[t]);}

export function advanceDescriptor(view,addr,layout,array,width,read,write,v,n){if(v?.kind)return view(v.kind,addr(v)+n*layout[v.kind+'Size']);if(v?.descriptor){if(v.descriptor.a){const child=v.descriptor.a.length===1?v.descriptor.e:{a:v.descriptor.a.slice(1),e:v.descriptor.e};return array(v.descriptor,addr(v)+n*width(child));}const d=v.descriptor,at=addr(v)+n*width(d);return {address:at,descriptor:d,get value(){return read(d,at);},set value(x){write(d,at,x);}};}return addr(v)+n;}

export function defineScalarField(view,obj,key,at,kind){return (Object.defineProperty(obj,key,{
        get(){return view()['get'+kind](at(),true);},
        set(value){view()['set'+kind](at(),kind.startsWith('Big')?BigInt(value):Number(value),true);},
    }));}

export function pointerSequence(read,write,records,record,p,t,stride){return (new Proxy({address:p},{get:(o,k)=>/^\d+$/.test(String(k))?read(t,p+Number(k)*stride):(k in o?o[k]:records[t]?record(t,p)[k]:undefined),set:(o,k,v)=>{if(/^\d+$/.test(String(k)))write(t,p+Number(k)*stride,v);else o[k]=v;return true;}}));}

export function definePointerField(pointer,view,raw,obj,key,at,wrap){return (Object.defineProperty(obj,key,{
        get(){return wrap(pointer(at()));},set(value){view().setBigUint64(at(),raw(value),true);},
    }));}

export function initializeRecord(address,services,sizeof,write,fieldInfo,env,initialValue,at,type,value){
        at = address(at);
        services.heap().fill(0, at, at + sizeof(type));
        function put(at, type, value) {
            if (value === null || value === undefined) return;
            if (type.array) {
                const element = type.array.length === 1 ? type.of : {array:type.array.slice(1),of:type.of};
                if (typeof value === 'string') {
                    for (let i=0;i<value.length;i++) write(at+i,type.of,value.charCodeAt(i));
                } else value.forEach((v,i) => put(at+i*sizeof(element),element,v));
            } else if (type.record) {
                for (const [name,v] of Object.entries(value)) {
                    const f = fieldInfo(type.record,name);
                    if (f.bits !== null) env.setBit(at+f.offset,f.bitOffset,f.bits,initialValue(v));
                    else put(at+f.offset,f.type,v);
                }
            } else write(at,type,typeof value === 'string' ? services.literal(value) : initialValue(value));
        }
        put(at,type,value);
        return at;
    }

export function indexedArray(length,getter,setter){return (new Proxy({}, {
        get(target, key) {
            if (key === 'length') return length;
            if (typeof key === 'string' && /^\d+$/.test(key)) return getter(Number(key));
            return Reflect.get(target, key);
        },
        set(target, key, value) {
            if (setter && typeof key === 'string' && /^\d+$/.test(key)) {
                setter(Number(key), value);
                return true;
            }
            return Reflect.set(target, key, value);
        },
    }));}

export function typeSize(types,env,sizeOf,t){const a=t.match(/^(.*?)\[(\d+)\](.*)$/);if(a)return +a[2]*sizeOf(a[1]+a[3]);if(t.includes('*'))return 8;if(t.startsWith('enum '))return 4;if(types[t])return +types[t].slice(1)/8;return env.sizes[t];}

export function formatShape(cString,fmt){let shape='';for(const m of cString(fmt).matchAll(/%(?:[-+ #0]*)(\*|\d+)?(?:\.(\*|\d+))?(hh|ll|[hljztL])?([%csdiouxXpfgeEaAn])/g)){if(m[4]==='%')continue;if(m[1]==='*')shape+='i';if(m[2]==='*')shape+='i';shape+=m[4]==='s'||m[4]==='p'?'p':/[fgeEaA]/.test(m[4])?'d':m[3]==='l'||m[3]==='ll'||m[3]==='z'?'j':'i';}return shape;}

export function readDescriptor(decode,memory,d,at){if(d.s||d.a)return decode(d,at);const dv=memory();if(d.p!==undefined||d.f)return decode(d,dv.getBigUint64(at,true));const bits=+d.t.slice(1);return decode(d,bits===64?dv.getBigUint64(at,true):dv['getUint'+bits](at,true));}

export function writeTypedValue(scalarType,view,raw,literal,services,address,size,t,p,v){const method=scalarType(t);if(method)view()['set'+method](p,method.startsWith('Big')?BigInt(v):Number(v),true);else if(t.includes('*'))view().setBigUint64(p,raw(typeof v==='string'?literal(v):v),true);else services.heap().copyWithin(p,address(v),address(v)+size(t));return v;}

export function decodeDescriptor(view,array,addr,d,v){if(d.p!==undefined)return d.p?view(d.p,v):Number(v);if(d.s)return view(d.s,v);if(d.a)return array(d,addr(v));if(d.f)return v;
        const bits=+d.t.slice(1),r=d.t[0]==='i'?BigInt.asIntN(bits,BigInt(v)):BigInt.asUintN(bits,BigInt(v));return bits===64?r:Number(r);}

export function defineScalarValue(view,o,key,at,kind){return (Object.defineProperty(o, key, {
        get() { return view()['get' + kind](at(), true); },
        set(v) { view()['set' + kind](at(), kind.includes('Big') ? BigInt(v) : Number(v), true); },
    }));}
