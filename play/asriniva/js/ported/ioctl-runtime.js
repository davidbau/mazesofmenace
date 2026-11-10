// Terminal storage and native dependencies remain C-owned; this adapter only
// supplies their addresses and the compiler-selected POSIX constants.
export function createIoctlEnvironment(services, layout) {
    if (layout.pointerSize !== 8 || layout.intSize !== 4
        || !layout.POSIX_TYPES || !layout.SUSPEND || !layout.SYSCF)
        throw new Error('Review changed ioctl ABI or terminal configuration');
    const env = {
        ...services,
        ...layout,
        SIG_DFL: BigInt(layout.SIG_DFL),
        SIG_IGN: BigInt(layout.SIG_IGN),
        get HEAP8() { return services.signedHeap(); },
        get HEAPU8() { return services.heap(); },
        get termio() { return Number(services.termio()); },
        get stdin() { return Number(services.stdin()); },
        sysopt: { get shellers() { return Number(services.shellers()); } },
    };
    const view=()=>new DataView(services.heap().buffer);
    for(const[key,column]of[['LI',0],['CO',1]])Object.defineProperty(env,key,{
        get(){return view().getInt32(services.dimension(column),true);},
        set(value){view().setInt32(services.dimension(column),Number(value),true);},
    });
    env.winsizeLocal=()=>services.stackAlloc(layout.winsizeSize);
    env.windowRow=at=>view().getUint16(at+layout.winsizeRow,true);
    env.windowColumn=at=>view().getUint16(at+layout.winsizeColumn,true);
    return env;
}
