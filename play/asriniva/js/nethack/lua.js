// The existing JS Lua engine on JS-owned memory; no Wasm instance is created.
import {createLuaAbi} from '../lua/abi.js';
import {createLuaBytecodeVM} from '../lua/bytecode-vm.js';
import metadata from './records.json' with {type:'json'};
import recipes from './lua-api.json' with {type:'json'};
class LuaCallbackJump {constructor(frame){this.frame=frame;}}
const names=['table','node','value','string','proto','lclosure','cclosure','upvalue','thread','global','callinfo','userdata0','userdata'];
export function createStandaloneLua(environment,options={}) {
    const {services,memory,functions,filesystem}=environment;
    const runtime=createLuaAbi({vmFactory:createLuaBytecodeVM,...options}),frames=[];
    const host=Object.create(services),bits=new DataView(new ArrayBuffer(8));
    const invokeCallback=(id,L,info)=>{
        const frame={L:Number(L)};frames.push(frame);
        try{return info===undefined?functions.callback(id)(BigInt(L)):functions.callback(id)(BigInt(L),BigInt(info));}
        catch(error){if(error instanceof LuaCallbackJump&&error.frame===frame)return -1;throw error;}
        finally{frames.pop();}
    };
    Object.assign(host,{
        ioServices:()=>({stdin:services.stdin,stdout:services.stdout,stderr:services.stderr,
            store:(p,value)=>memory.view.setBigUint64(p,BigInt(value),true),
            open:(path,mode)=>services.fopen(path,mode),close:services.fclose,flush:services.fflush,tmpfile:services.tmpfile,
            get:services.fgetc,unget:(p,ch)=>services.ungetc(ch,p),eof:services.feof,failed:services.ferror,clearerr:services.clearerr,
            seek:services.fseek,tell:services.ftell,setvbuf:(p,mode,size)=>services.setvbuf(p,0,mode,size),
            write:(p,text)=>{const bytes=Uint8Array.from(text,c=>c.charCodeAt(0)),at=memory.malloc(bytes.length||1);try{memory.HEAPU8.set(bytes,at);return Number(services.fwrite(at,1,bytes.length,p))===bytes.length;}finally{memory.free(at);}},
            errno:()=>environment.libc.errno,error:()=>memory.readString(services.strerror(environment.libc.errno)),
        }),
        callback:functions.callback,call:invokeCallback,hook:invokeCallback,
        debugLayout:i=>{if(!Number.isInteger(i)||i<0||i>=metadata.lua.debug.length)throw new Error('Unknown Lua debug layout');return metadata.lua.debug[i];},
        stringHeader:()=>metadata.lua.memory[3],
        userdataHeader:n=>{n=Number(n);if(!Number.isInteger(n)||n<0||n>65535)throw new RangeError('Invalid Lua userdata uservalue count');return n===0?metadata.lua.userdata[0]:metadata.lua.userdata[1]+n*metadata.lua.userdata[2];},
        memoryLayout:()=>Object.fromEntries(names.map((name,i)=>[name,metadata.lua.memory[i]])),
        sortClock:options.clock??(()=>0n),sortTime:options.time??(()=>0n),
        readFile:path=>filesystem.readFile(path),
        readStdin:()=>{if(!options.readStdin)throw new Error('Lua stdin reader was not supplied');return options.readStdin();},
        osClockRate:()=>1000000n,osTimezone:()=>options.timezone??'UTC',
        osTMLayout:i=>i===0?metadata.records.tm.size:metadata.records.tm.fields[['tm_sec','tm_min','tm_hour','tm_mday','tm_mon','tm_year','tm_wday','tm_yday','tm_isdst'][i-1]]?.offset,
        osRemove:p=>{environment.libc.errno=0;return services.remove(p);},
        osRename:(a,b)=>{environment.libc.errno=0;return services.rename(a,b);},
        osErrno:()=>environment.libc.errno,
        osErrorMessage:code=>{const value=options.strerror?.(code)??({0:'No error information',2:'Permission denied',8:'Bad file descriptor',20:'File exists',28:'Invalid argument',31:'Is a directory',44:'No such file or directory',48:'Out of memory',54:'Not a directory',55:'Directory not empty'})[code];if(value===undefined)throw new Error('Unimplemented standalone strerror '+code);return services.literal(value);},
    });
    function dispatch(L,operation,...args) {
        const pointer=services.literal(operation);
        const packet=args.map(v=>BigInt.asUintN(64,BigInt(v?.address??v??0)));while(packet.length<5)packet.push(0n);
        const result=runtime.dispatch(host,L,pointer,...packet);
        if(runtime.failed(L)) {
            const frame=frames.findLast(frame=>frame.L===Number(L));
            if(frame)throw new LuaCallbackJump(frame);
            runtime.unprotected(host,L);
        }
        return result;
    }
    function invoke(L,operation,a=0,b=0,c=0,d=0,e=0){
        const result=runtime.invoke(host,L,operation,a,b,c,d,e);
        if(runtime.failed(L)){
            const frame=frames.findLast(frame=>frame.L===Number(L));
            if(frame)throw new LuaCallbackJump(frame);
            runtime.unprotected(host,L);
        }
        return result;
    }
    const api={};
    for(const [name,recipe]of Object.entries(recipes.functions))api[name]=(...args)=>{
        const values=recipe.arguments.map(item=>{
            if(item.index===null)return 0;
            const value=args[item.index];
            if(item.number)return Number(value);
            if(typeof value==='string')return services.literal(value);
            return value?.address??value??0;
        });
        const result=invoke(values[0],name,values[1],values[2],values[3],values[4],values[5]);
        if(recipe.return==='void')return;
        if(recipe.return==='lua_Integer')return BigInt.asIntN(64,BigInt(result));
        if(recipe.return==='lua_Unsigned')return BigInt.asUintN(64,BigInt(result));
        if(recipe.return==='lua_Number')return Number(result);
        return recipe.return.includes('*')||['lua_Alloc','lua_CFunction'].includes(recipe.return)?Number(result):Number(result)|0;
    };
    // Original lua.h: lua_CFunction lua_tocfunction(lua_State*,int);
    api.luaL_testudata=(L,index,name)=>Number(invoke(L,'luaL_testudata',index,typeof name==='string'?services.literal(name):name));
    api.luaL_error_text=(L,message)=>invoke(L,'luaL_error_text',typeof message==='string'?services.literal(message):message);
    api.luaopen_io=L=>Number(invoke(L,'luaopen_io'));
    api.lua_tocfunction=(L,index)=>Number(invoke(L,'lua_tocfunction',index));
    // Original lua.h: void lua_setallocf(lua_State*,lua_Alloc,void*).
    api.lua_setallocf=(L,allocator,userdata)=>{invoke(L,'lua_setallocf',allocator,userdata);};
    api.lua_isuserdata=(L,i)=>[2,7].includes(api.lua_type(L,i))?1:0;
    api.lua_gc=(L,what,...args)=>Number(invoke(L,'lua_gc',what,args[0]??0,args[1]??0,args[2]??0))|0;
    return {api,dispatch,counters:runtime.counters};
}
