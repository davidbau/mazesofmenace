// NetHack declarations and compatibility names for the unchanged rect.c port.
// Memory, arrays, narrowing and local lifetimes are shared C-runtime operations.
export function createRectBindings(transport,services,layout,{alloc,panic,impossible,rn2}) {
    if(!layout||layout.coordSize!==2||layout.size!==8)throw new Error('Expected measured memory64 NhRect layout');
    transport.defineRecord('NhRect',{size:layout.size,fields:Object.fromEntries(['lx','ly','hx','hy'].map(k=>[k,{offset:layout[k],type:'Int16'}]))});
    const type=transport.recordType('NhRect');
    const state={rect:0,n_rects:0,rect_cnt:0},env=Object.create(services);
    Object.assign(env,{rectState:state,COLNO:layout.COLNO,ROWNO:layout.ROWNO,NhRectSize:type.size,
        alloc,rectPanic:()=>panic('Could not alloc rect'),
        rectImpossible:()=>impossible('n_rects may be too small.'),rn2,
        rectArray:p=>p?type.array(p,state.n_rects):0,
        rectLocal:()=>type.local(),rectCopy:value=>type.local(value)});
    return {state,environment:env,prepareArgs:(fn,args)=>args.map((v,i)=>{
        const result=typeof v==='object'?v:type.view(v);
        return fn==='rect_bounds'&&i<2?{...result}:result;
    })};
}
