// Check canonical native records against the independent compiler-measured
// WEAPON ABI, including fields exposed through original C header aliases.
import layout from '../weapon-native-layout.json' with {type:'json'};
export function validateNativeWeaponLayouts(ctypes,measured){
 if(!ctypes?.locate||!ctypes?.size)throw Error('Native weapon layout owner missing');
 function field(type,path){let at=0,last;
  const parts=path.split('.');while(parts.length){let key=parts.shift();
   if(ctypes.canonical(type)==='struct obj'&&key==='ocarry'){key='v';parts.unshift('v_ocarry');}
   if(ctypes.canonical(type)==='struct objclass'&&key==='oc_skill')key='oc_subtyp';
   if(ctypes.canonical(type)==='struct objclass'&&key==='oc_hitbon')key='oc_oc1';
   last=ctypes.locate(type,at,key);at=last.at;type=last.field.record??last.field.ctype.replace(new RegExp('\\s+'+key+'$'),'');
  }
  return{at,type};
 }
 for(const [key,kind,type,path]of layout.checks){
  const entry=kind==='size'?undefined:field(type,path),actual=kind==='size'?ctypes.size(type):kind==='offset'?entry.at:ctypes.size(entry.type);
  if(Number(measured[key])!==actual)throw Error('Review native WEAPON layout '+key);
 }
 return layout.checks.length;
}
