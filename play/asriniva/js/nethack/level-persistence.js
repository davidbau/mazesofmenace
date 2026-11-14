// Original level serializers on the existing gameplay owners and storage.
import {nativeEngraveFor} from './engrave.js';
import {createRegionEntry} from './bindings/region.js';

export function enableLevelPersistence(environment,layouts){
 const {services,memory,ctypes,transport}=environment,address=environment.address;
 const text=value=>typeof value==='string'?services.literal(value):address(value);
 const serializer=(name)=>(file,data,tag,...count)=>environment.resolve(name)(address(file),address(data),text(tag),...count.map(transport.int));
 const nativeEngraving=nativeEngraveFor(environment,layouts),engraving=nativeEngraving.context;
 environment.register('engraving-persistence',Object.fromEntries(['save_engravings','rest_engravings'].map(name=>[name,nativeEngraving.functions[name]])),engraving);
 const regions=environment.start('region-reset').environment;
 regions.strlen=value=>memory.strlen(address(value));
 for(const direction of ['sfo','sfi'])for(const type of ['long','int','short','unsigned','boolean','nhrect','any','char'])regions[(direction==='sfo'?'Sfo_':'Sfi_')+type]=serializer(direction+'_'+type);
 environment.extend('region-reset',Object.fromEntries(['save_regions','rest_regions','create_region','add_region','add_rect_to_reg','run_regions','m_in_out_region','in_out_region','update_monster_region'].map(name=>[name,createRegionEntry(regions,layouts.region,name)])));
 environment.exposeAddressPort('dungeon',['save_exclusions','load_exclusions']);
 if(!environment.hasFunction('save_track'))environment.enableTrack(layouts);
 return{engraving,regions,limitation:'Original level persistence entries connected; nonempty save/restore and complete checkpoint lifecycle require C verification.'};
}
