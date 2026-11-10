// Native macOS terminal objects at the game boundary, converted to the SDK
// transport ABI only for real system calls. No NetHack terminal policy here.
import abi from './native-terminal-abi.json' with {type:'json'};
const {native:n,wire:w,nativeConstants:nc,wireConstants:wc}=abi;
const groups={c_iflag:'IGNBRK BRKINT IGNPAR PARMRK INPCK ISTRIP INLCR IGNCR ICRNL IXON IXOFF IXANY IMAXBEL IUTF8',
    c_oflag:'OPOST ONLCR OCRNL ONOCR ONLRET OFILL OFDEL',
    c_cflag:'CLOCAL CREAD CSTOPB HUPCL PARENB PARODD CRTSCTS',
    c_lflag:'ECHO ECHOE ECHOK ECHONL ICANON ISIG IEXTEN TOSTOP NOFLSH ECHOKE ECHOCTL PENDIN FLUSHO EXTPROC'};
const control='VEOF VEOL VEOL2 VERASE VWERASE VKILL VREPRINT VINTR VQUIT VSUSP VDSUSP VSTART VSTOP VLNEXT VDISCARD VMIN VTIME VSTATUS'.split(' ');
const read=(bytes,layout,key)=>{
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    return layout.tcflagSize===8?view.getBigUint64(layout[key],true):BigInt(view.getUint32(layout[key],true));
};
const write=(bytes,layout,key,value)=>{
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    if(layout.tcflagSize===8)view.setBigUint64(layout[key],BigInt.asUintN(64,value),true);
    else view.setUint32(layout[key],Number(BigInt.asUintN(32,value)),true);
};
function convert(source,from,fc,destination,to,tc){
    for(const[field,text]of Object.entries(groups)){
        let value=read(destination,to,field),input=read(source,from,field);
        for(const key of text.split(' '))if(fc[key]!==undefined&&tc[key]!==undefined){
            const a=BigInt(fc[key]),b=BigInt(tc[key]);value=(value&~b)|((input&a)?b:0n);
        }
        const multi=field==='c_cflag'?['CSIZE','CS5','CS6','CS7','CS8']:
            field==='c_oflag'?['TABDLY','TAB0','TAB1','TAB2','TAB3']:null;
        if(multi&&fc[multi[0]]!==undefined&&tc[multi[0]]!==undefined){
            const mask=BigInt(fc[multi[0]]);value&=~BigInt(tc[multi[0]]);
            const key=multi.slice(1).find(key=>fc[key]!==undefined&&BigInt(fc[key])===(input&mask));
            if(key&&tc[key]!==undefined)value|=BigInt(tc[key]);
        }
        write(destination,to,field,value);
    }
    for(const key of control)if(fc[key]!==undefined&&tc[key]!==undefined)
        destination[to.c_cc+tc[key]]=source[from.c_cc+fc[key]];
    const baud=value=>{
        const key=Object.keys(from).find(key=>/^B\d+$/.test(key)&&BigInt(from[key])===value);
        return key?BigInt(to[key]):value;
    };
    for(let i=0;i<2;i++){
        // Both ABIs place their two speed fields at the end of the structure.
        const a=from.termioSize-(2-i)*from.speedSize,b=to.termioSize-(2-i)*to.speedSize;
        const sv=new DataView(source.buffer,source.byteOffset),dv=new DataView(destination.buffer,destination.byteOffset);
        const speed=baud(from.speedSize===8?sv.getBigUint64(a,true):BigInt(sv.getUint32(a,true)));
        if(to.speedSize===8)dv.setBigUint64(b,speed,true);else dv.setUint32(b,Number(speed),true);
    }
}
// Darwin signal number -> Emscripten/Linux transport number. Unsupported
// platform-only signals remain explicit errors rather than aliasing another.
const signals=[0,1,2,3,4,5,6,null,8,9,7,11,31,13,14,15,23,19,20,18,17,21,22,29,24,25,26,27,28,null,10,12];
export function createNativeTerminal(){
    const instances=new WeakMap();
    const virtualSignals=new WeakMap();
    return function call(services,name,...args){
        const key=services.moduleKey;
        if(!instances.has(key))instances.set(key,new Map());
        const states=instances.get(key),fd=args[0];
        if(!virtualSignals.has(key))virtualSignals.set(key,new Map());
        const handlers=virtualSignals.get(key);
        const state=()=>{if(!states.has(fd))states.set(fd,{native:new Uint8Array(n.termioSize),wire:new Uint8Array(w.termioSize)});return states.get(fd);};
        const signal=sig=>{if(!Number.isInteger(sig)||signals[sig]===null||signals[sig]===undefined)throw new RangeError('Unsupported native signal '+sig);return signals[sig];};
        if(name==='signal'){
            if(signals[fd]===null){const previous=handlers.get(fd)??0n;handlers.set(fd,BigInt(args[1]));return previous;}
            const handler=BigInt(args[1]),wireHandler=handler===1n?BigInt(abi.wireIgnore):handler;
            const previous=BigInt.asUintN(64,BigInt(services.signal(signal(fd),wireHandler)));
            return previous===BigInt.asUintN(64,BigInt(abi.wireIgnore))?1n:BigInt.asIntN(64,previous);
        }
        if(name==='kill'){
            if(signals[args[1]]===null){
                const handler=handlers.get(args[1])??0n;
                if(fd!==0||handler===0n||handler===-1n)throw new Error('Unhandled native-only signal '+args[1]);
                if(handler!==1n)services.invokeSignal(handler,args[1]);
                return 0;
            }
            return services.kill(fd,signal(args[1]));
        }
        if(name==='fpathconf')return services.fpathconf(fd,args[1]===n._PC_VDISABLE?w._PC_VDISABLE:args[1]);
        if(name==='ioctl')return services.ioctl(fd,BigInt.asUintN(32,BigInt(args[1]))===0x40087468n?0x5413:Number(args[1]),args[2]);
        if(name==='cfgetospeed')return new DataView(services.heap().buffer).getBigUint64(Number(fd)+n.termioSize-8,true);
        const saved=services.stackSave();
        try{
            const pointer=services.stackAlloc(w.termioSize),s=state();
            if(name==='tcgetattr'){
                const status=services.tcgetattr(fd,pointer);
                if(!status){s.wire=services.heap().slice(pointer,pointer+w.termioSize);
                    convert(s.wire,w,wc,s.native,n,nc);services.heap().set(s.native,Number(args[1]));}
                return status;
            }
            if(name==='tcsetattr'){
                const native=services.heap().slice(Number(args[2]),Number(args[2])+n.termioSize),wire=s.wire.slice();
                convert(native,n,nc,wire,w,wc);services.heap().set(wire,pointer);
                const status=services.tcsetattr(fd,args[1]===n.TCSADRAIN?w.TCSADRAIN:args[1],pointer);
                if(!status){s.native=native;s.wire=wire;}return status;
            }
            throw new Error('Unknown native terminal operation '+name);
        }finally{services.stackRestore(saved);}
    };
}
