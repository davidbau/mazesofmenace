import supplemental from './supplemental-record-layouts.json' with {type:'json'};
// Compatibility entry supplies NetHack declarations to the generic type engine.
import {createCTypes as createTypes} from '../c-runtime/types.js';
import {typeAliases,fieldAliases} from './declarations.js';
import windowAbi from './window-abi.json' with {type:'json'};
import optionsAbi from './options-abi.json' with {type:'json'};

// Record harvesting alone omits enums used only in function parameters. Both
// inventories are compiler measured; never infer an enum's width or sign.
const enriched=new WeakMap();
export function withNetHackEnums(metadata) {
    if(enriched.has(metadata))return enriched.get(metadata);
    const boolLayout=supplemental.scalarLayouts.bool;
    if(boolLayout.size!==1||boolLayout.alignment!==1||boolLayout.negative!==1)throw new Error('Review measured C bool representation');
    const enums={...metadata.enums};
    for(const source of [windowAbi.enums,optionsAbi.enums,supplemental.enums])for(const [name,layout] of Object.entries(source)){
        const previous=enums[name];
        if(previous&&(previous.size!==layout.size||previous.signed!==layout.signed))throw new Error('Conflicting measured C enum '+name);
        enums[name]=layout;
    }
    // Apply header member aliases to the same measured descriptors used by
    // the type engine, bitfield engine and native record views. Do not mutate
    // compiler metadata or invent offsets/widths for aliases.
    if(metadata.compilerSha256&&metadata.compilerSha256!==supplemental.compilerSha256)throw new Error('Conflicting supplemental record compiler');
    for(const [type,measured]of Object.entries(supplemental.records)){
        const existing=metadata.records[type];if(!existing)continue;
        if(existing.size!==measured.size||existing.alignment!==measured.alignment||Object.keys(existing.fields).length!==Object.keys(measured.fields).length)throw new Error('Conflicting supplemental record '+type);
        for(const [name,field]of Object.entries(measured.fields))if(!existing.fields[name]||['offset','ctype','bits','shift'].some(key=>existing.fields[name][key]!==field[key]))throw new Error('Conflicting supplemental field '+type+'.'+name);
    }
    const records={...supplemental.records,...metadata.records};
    const opaqueScalars={...metadata.opaqueScalars};
    for(const [type,plan]of Object.entries(supplemental.opaqueScalars)){
        const existing=opaqueScalars[type];if(existing&&(existing.size!==plan.size||existing.alignment!==plan.alignment))throw new Error('Conflicting measured opaque storage '+type);
        opaqueScalars[type]=plan;
    }
    const recordType=type=>{
        type=type.replace(/\b(?:const|volatile|restrict)\b/g,'').trim().replace(/\s+/g,' ');
        const seen=new Set();while(!seen.has(type)){seen.add(type);const next=metadata.aliases?.[type]??typeAliases[type];if(!next)break;type=next;}
        const anonymous=type.match(/^(?:struct|union) (?:\w+::)?\(unnamed(?: struct| union)? at .*\/([^/]+):(\d+):(\d+)\)$/);
        return anonymous?'@'+anonymous[1]+':'+anonymous[2]+':'+anonymous[3]:type.replace(/^(?:struct|union) /,'');
    };
    for(const [type,row]of Object.entries(records)){
        let fields;
        for(const [name,field]of Object.entries(row.fields)){
            const declared=field.ctype.replace(new RegExp('\\b'+name+'$'),'').trim(),target=recordType(declared);
            if(opaqueScalars[declared]){fields??={...row.fields};fields[name]={...field,storageType:declared};continue;}
            if(!records[target])continue;
            if(field.record&&field.record!==target)throw new Error('Conflicting measured record field '+type+'.'+name);
            if(!field.record){fields??={...row.fields};fields[name]={...field,record:target};}
        }
        if(fields)records[type]={...row,fields};
    }
    for(const [type,aliases]of Object.entries(fieldAliases)){
        const row=records[type];if(!row)continue;
        const fields={...row.fields};
        for(const [alias,path]of Object.entries(aliases)){
            let current=row,offset=0,field;
            const parts=path.split('.');
            for(const [i,name]of parts.entries()){
                field=current.fields[name];
                if(!field)throw new Error('Unmeasured header alias '+type+'.'+alias+' -> '+path);
                offset+=field.offset;
                if(i<parts.length-1){current=records[field.record];if(!current)throw new Error('Unmeasured header alias record '+type+'.'+alias);}
            }
            const name=parts.at(-1);
            const projected={...field,offset,ctype:field.ctype.replace(new RegExp('\\b'+name+'$'),()=>alias)};
            const existing=fields[alias];
            if(existing&&['offset','bits','shift','ctype','record'].some(key=>existing[key]!==projected[key]))throw new Error('Conflicting header alias '+type+'.'+alias);
            fields[alias]=projected;
        }
        records[type]={...row,fields};
    }
    const result={...metadata,records,enums,opaqueScalars};enriched.set(metadata,result);return result;
}
export function createCTypes(memory,metadata,bitfields) {
    // A direct caller may supply a bitfield driver built from raw compiler
    // fields. Route aliases to the physical key for that driver as well.
    const key=(type,name)=>fieldAliases[type]?.[name]??name;
    return createTypes(memory,withNetHackEnums(metadata),{get:(type,name,at)=>bitfields.get(type,key(type,name),at),set:(type,name,at,value)=>bitfields.set(type,key(type,name),at,value)},typeAliases);
}
