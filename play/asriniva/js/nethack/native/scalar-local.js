// Ordinary engine locals stay JS values. A genuine byte-level consumer can
// request an address; subsequent reads observe writes through that address.
export function createNativeScalarLocal(initial,kind,allocate,view){
 const width={Int16:2,Int32:4}[kind];
 if(!width)throw new Error('Unsupported native scalar local '+kind);
 const narrow=kind==='Int16'?value=>Number(value)<<16>>16:value=>Number(value)|0;
 let value=narrow(initial),at;
 return {
  get address(){
   if(at===undefined){const next=Number(allocate(width));view()['set'+kind](next,value,true);at=next;}
   return at;
  },
  get value(){return at===undefined?value:view()['get'+kind](at,true);},
  set value(next){value=narrow(next);if(at!==undefined)view()['set'+kind](at,value,true);},
 };
}
