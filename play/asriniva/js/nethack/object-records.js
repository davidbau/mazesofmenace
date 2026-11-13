// Bounded object-record/weight/lifetime group. All policy is imported unchanged;
// these projections replace C field transport only, using measured metadata.
import {obj_nutrition,eaten_stat} from '../ported/eat.js';
import {dealloc_mextra} from '../ported/mon.js';
export function enableObjectRecords(environment,layouts) {
    const {ctypes,services,transport}=environment;
    for(const name of ['objects','mons','cg','svc','svl'])environment.requireGlobal(name);
    if(typeof services.rnd!=='function')throw new Error('Object records require shared RND');
    environment.register('allocation-strings',{dupstr:(...args)=>environment.alloc('dupstr',...args)});
    const projection=(type,p,fields)=>{
        p=environment.address(p);if(!p)return 0;
        const view={address:p};
        for(const [field,scalar]of Object.entries(fields))Object.defineProperty(view,field,{
            get:()=>ctypes.getField(type,p,field,scalar),set:value=>ctypes.setField(type,p,field,scalar,value),
        });
        return view;
    };
    const object=p=>projection('struct obj',p,{otyp:'short',corpsenm:'int',globby:'unsigned int',owt:'unsigned int',oeaten:'unsigned int'});
    const indexed=(type,global,field,scalar)=>new Proxy({}, {get(_o,index){
        if(typeof index!=='string'||!/^\d+$/.test(index))throw new Error('Invalid catalogue index');
        const p=environment.requireGlobal(global)+Number(index)*ctypes.size(type);
        return projection(type,p,{[field]:scalar});
    }});
    const food=Object.create(null);
    Object.assign(food,{int:transport.int,uint:transport.uint,long:transport.long,CORPSE:layouts.mkobj.CORPSE,
        objects:indexed('struct objclass','objects','oc_nutrition','unsigned short'),
        mons:indexed('struct permonst','mons','cnutrit','unsigned short'),
        impossible:(format,...args)=>environment.diagnostics.push(environment.libc.format(format,...args)),
    });
    environment.register('object-nutrition',{obj_nutrition,eaten_stat},food,{prepareArgs:(fn,args)=>{
        const i=fn==='eaten_stat'?1:0;args[i]=object(args[i]);return args;
    }});
    const extraFields={mgivenname:'char *',egd:'void *',epri:'void *',eshk:'void *',emin:'void *',edog:'void *',ebones:'void *',mcorpsenm:'int'};
    function monster(p){
        p=environment.address(p);if(!p)return 0;
        const view={address:p};Object.defineProperty(view,'mextra',{
            get:()=>projection('struct mextra',ctypes.getField('struct monst',p,'mextra','struct mextra *'),extraFields),
            set:value=>ctypes.setField('struct monst',p,'mextra','struct mextra *',value),
        });return view;
    }
    environment.register('monster-extra',{dealloc_mextra},{free:transport.free,int:transport.int,NON_PM:layouts.mkobj.NON_PM},
        {prepareArgs:(_fn,args)=>[monster(args[0])]});
    const names=['init_oextra','newoextra','dealloc_oextra','newomonst','free_omonst','newomid','free_omid','new_omailcmd','free_omailcmd',
        'weight','container_weight','init_dummyobj','extract_nobj','extract_nexthere','add_to_buried','bcsign','next_ident','is_flammable','is_rottable','is_treefruit','dealloc_obj_real'];
    const adapter=environment.enableAddressPort('mkobj',{only:names});
    return {exports:names,adapter,limitation:'Object records, extras, weights and list primitives only. Full mksobj generation, merging, timers/light, inventory and invalid-quantity naming are not connected.'};
}
