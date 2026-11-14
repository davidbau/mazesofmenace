// Ordinary engine locals stay JS values. A genuine byte-level consumer can
// request an address; subsequent reads observe writes through that address.
export function createNativeScalarLocal(initial,kind,allocate,view,{uninitialized=false,requireLifetime=true}={}){
 const width={Int8:1,Int16:2,Int32:4}[kind];
 if(!width)throw new Error('Unsupported native scalar local '+kind);
 const bits=width*8,narrow=value=>typeof value==='bigint'?Number(BigInt.asIntN(bits,value)):kind==='Int8'?Number(value)<<24>>24:kind==='Int16'?Number(value)<<16>>16:Number(value)|0;
 let value=narrow(initial),ready=!uninitialized,at;
 const reserved=typeof allocate.reserve==='function'?allocate.reserve(width):undefined;
 if(requireLifetime&&!reserved){at=Number(allocate(width));if(ready)view()['set'+kind](at,value,true);}
 return {
  get address(){
   reserved?.assertAlive();
   if(at===undefined){const next=Number(reserved?reserved():allocate(width));if(ready)view()['set'+kind](next,value,true);at=next;}
   return at;
  },
  get value(){reserved?.assertAlive();if(!ready&&at===undefined){const pointer=this.address;return view()['get'+kind](pointer,true);}return at===undefined?value:view()['get'+kind](at,true);},
  set value(next){reserved?.assertAlive();value=narrow(next);ready=true;if(at!==undefined)view()['set'+kind](at,value,true);},
 };
}
