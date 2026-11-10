// Live NHFILE/ABI/table views; original SFBASE control flow stays in sfbase.js.
export function createSfbaseEnvironment(services,layout) {
    const widths={littleEndian:1,pointerSize:8,longSize:8,intSize:4,charSigned:1,config_SFCTOOL:0,config_VMS:0,config_legacy_Sfvalue:1,version_feature_set_size:8,any_int64:0};
    for(const [field,size]of Object.entries(widths))if(layout[field]!==size)throw new Error('Review changed sfbase ABI: '+field);
    const loads={"aligntyp":"Int8","boolean":"Int8","coordxy":"Int16","int":"Int32","int16":"Int16","int32":"Int32","int64":"BigInt64","long":"BigInt64","schar":"Int8","short":"Int16","size_t":"BigUint64","time_t":"BigInt64","uchar":"Uint8","uint16":"Uint16","uint32":"Uint32","uint64":"BigUint64","ulong":"BigUint64","unsigned":"Uint32","ushort":"Uint16","xint16":"Int16","xint8":"Int8","uint8":"Uint8","char":"Int8"};
    for(const [name,kind]of Object.entries(loads))if(name!=='uint8'&&layout['sizeof_'+name]!==Number(kind.match(/\d+/)[0])/8)throw new Error('Review changed sfbase scalar: '+name);
    const signed={"aligntyp":1,"boolean":1,"coordxy":1,"int":1,"int16":1,"int32":1,"int64":1,"long":1,"schar":1,"short":1,"size_t":0,"time_t":1,"uchar":0,"uint16":0,"uint32":0,"uint64":0,"ulong":0,"unsigned":0,"ushort":0,"xint16":1,"xint8":1,"char":1};
    for(const [name,expected]of Object.entries(signed))if(layout['signed_'+name]!==expected)throw new Error('Review changed sfbase signed scalar: '+name);
    const address=value=>Number(value?.address??value??0),raw=value=>BigInt(value?.address??value??0);
    const memory=()=>new DataView(services.heap().buffer),cache=new Map();
    function nhfile(value){const at=address(value);if(!at)return 0;if(cache.has(at))return cache.get(at);const obj={address:at};cache.set(at,obj);
        for(const [field,kind]of [['mode','Int32'],['fnidx','Int32'],['structlevel','Int8'],['eof','Int8'],['fplog','BigUint64'],['rcount','BigInt64'],['wcount','BigInt64'],['nhfpconvert','BigUint64']]){
            if(layout['nhf_'+field+'_size']!==Number(kind.match(/\d+/)[0])/8)throw new Error('Review changed sfbase NHFILE field: '+field);
            Object.defineProperty(obj,field,{get(){const result=memory()['get'+kind](at+layout['nhf_'+field],true);return field==='nhfpconvert'?nhfile(result):field==='fplog'?Number(result):result;},set(value){memory()['set'+kind](at+layout['nhf_'+field],kind.startsWith('Big')?raw(value):Number(value),true);}});
        }return obj;}
    const indexed=(get,set)=>new Proxy({}, {get(obj,key){return typeof key==='string'&&/^-?\d+$/.test(key)?get(Number(key)):Reflect.get(obj,key);},set(obj,key,value){if(typeof key==='string'&&/^-?\d+$/.test(key)){set(Number(key),value);return true;}return Reflect.set(obj,key,value);}});
    const procNames=["arti_info","nhrect","branch","bubble","cemetery","context_info","nhcoord","damage","dest_area","dgn_topology","dungeon","d_level","ebones","edog","egd","emin","engr","epri","eshk","fe","flag","fruit","gamelog_line","kinfo","levelflags","ls_t","linfo","mapseen_feat","mapseen_flags","mapseen_rooms","mkroom","monst","mvitals","obj","objclass","q_score","rm","spell","stairway","s_level","trap","you","any","aligntyp","boolean","coordxy","int","int16","int32","int64","long","schar","short","size_t","time_t","uchar","uint16","uint32","uint64","ulong","unsigned","ushort","xint16","xint8","bitfield","char","genericptr","version_info"];
    function table(value,fieldlevel=false){const at=address(value),obj={address:at},functions={};
        for(const name of procNames)Object.defineProperty(functions,'sf_'+name,{get(){const fn=memory().getBigUint64(at+layout[(fieldlevel?'fieldlevel':'structlevel')+'_fn']+layout['proc_'+name],true);
            return (nhfp,data,myname,...extra)=>services.call(fn,nhfp,data,myname,extra.length?extra[0]:undefined);}});
        obj[fieldlevel?'fn_x':'fn']=functions;return obj;}
    const tables=['sfoprocs','sfiprocs','sfoflprocs','sfiflprocs'],env=Object.assign(Object.create(services),layout,{
        nhfile,address,sizes:{},bufferSizes:{},buffers:{},unsignedArray:n=>new Uint32Array(n),
        load:(name,at)=>memory()['get'+loads[name]](address(at),true),
        storeChar:(at,value)=>memory().setInt8(address(at),Number(value)),
        addressOf:(obj,field)=>address(obj)+layout['nhf_'+field],
        structlevel:value=>table(value),fieldlevel:value=>table(value,true),
        version:value=>{const at=address(value),obj={address:at};Object.defineProperty(obj,'feature_set',{get(){return memory().getBigUint64(at+layout.version_feature_set,true);},set(value){memory().setBigUint64(at+layout.version_feature_set,BigInt.asUintN(64,BigInt(value)),true);}});return obj;},
    });
    for(const name of procNames)env.sizes[name]=layout['sizeof_'+name];
    for(const [index,name]of tables.entries())env[name]=indexed(i=>table(address(services.global(index))+i*layout[(index>=2?'fieldlevel':'structlevel')+'Size'],index>=2),(i,value)=>services.copy(address(services.global(index))+i*layout[(index>=2?'fieldlevel':'structlevel')+'Size'],address(value),layout[(index>=2?'fieldlevel':'structlevel')+'Size']));
    for(const [index,name]of ['zerosfoprocs','zerosfiprocs','zerosfoflprocs','zerosfiflprocs','historical_sfo_procs','historical_sfi_procs'].entries())Object.defineProperty(env,name,{get:()=>table(services.global(index+4),index===2||index===3)});
    const bufferNames=["sfvalue_char","sfvalue_boolean","sfvalue_schar","sfvalue_aligntyp","sfvalue_any","sfvalue_genericptr","sfvalue_int16","sfvalue_int32","sfvalue_int64","sfvalue_uchar","sfvalue_uint16","sfvalue_uint32","sfvalue_uint64","sfvalue_size_t","sfvalue_time_t","sfvalue_short","sfvalue_ushort","sfvalue_int","sfvalue_unsigned","sfvalue_long","sfvalue_ulong","sfvalue_xint8","sfvalue_xint16","sfvalue_bitfield","bitfield_dump","complex_dump"];
    for(const [index,name]of bufferNames.entries()){env.bufferSizes[name]=layout['buffer_'+name];Object.defineProperty(env.buffers,name,{get:()=>address(services.buffer(index))});}
    for(const [index,name]of ['PRId32','PRId64','PRIu32','PRIu64'].entries())env[name]=services.pri(index);
    return env;
}
