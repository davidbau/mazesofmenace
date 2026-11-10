/* Lua5.4.8 collector scheduling and generation/list transitions.
 * Ported from pinned lgc.c (setpause through luaC_fullgc), lapi.c lua_gc,
 * lgc.h and luaE_setdebt in lstate.c. Lua copyright/permission: lua/lobject.js.
 * Graph traversal/weak tables/write barriers are supplied by the collector;
 * a step never substitutes a whole-heap collection for missing phase work.
 * Debt and memory arithmetic are signed/unsigned LP64 BigInt, not JS floats.
 */
export const GC = Object.freeze({ PROPAGATE:0, ENTERATOMIC:1, ATOMIC:2, SWPALLGC:3, SWPFINOBJ:4, SWPTOBEFNZ:5, SWPEND:6, CALLFIN:7, PAUSE:8 });
export const GC_MODE = Object.freeze({ INC:0, GEN:1 });
export const GC_OP = Object.freeze({ STOP:0, RESTART:1, COLLECT:2, COUNT:3, COUNTB:4, STEP:5, SETPAUSE:6, SETSTEPMUL:7, ISRUNNING:9, GEN:10, INC:11 });
export const GC_AGE = Object.freeze({ NEW:0, SURVIVAL:1, OLD0:2, OLD1:3, OLD:4, TOUCHED1:5, TOUCHED2:6 });
const STOP_USER=1, STOP_GC=2, STOP_CLOSE=4, MAX_LMEM=(1n<<63n)-1n;
const integer=value=>BigInt(value), int32=value=>Number(BigInt.asIntN(32,BigInt(value))), byte=value=>Number(BigInt.asUintN(8,BigInt(value)));
const int64=value=>BigInt.asIntN(64,value);
const gcParameter=value=>byte(Math.trunc(int32(value)/4));

/* Required graph methods:
 * restartCollection, hasGray, propagateOne, atomic, enterSweep,
 * beginSweepList(name), sweep(name,100)->{count,done}, checkSizes,
 * hasFinalizers, finalizeOne, enterIncremental, sweepToOld,
 * youngCollection, finishGeneration. 'done' means the sweep cursor was
 * already null BEFORE this step, so the next phase can start. A sweep that
 * consumes its final object stays in its phase until the following call.
 * Call allocated(delta) for ALL allocation/free deltas, including GC work.
 */
export class LuaGCScheduler {
  constructor({graph,getBytes,debt=0n,estimate=0n,state=GC.PAUSE,mode=GC_MODE.INC,stop=0,valueSize=16,onPhase=null}={}) {
    if(!graph || typeof getBytes!=='function')throw new TypeError('Lua GC graph and byte counter required');
    this.graph=graph;this.getBytes=getBytes;this.debt=integer(debt);this.estimate=integer(estimate);this.state=state;this.mode=mode;
    this.stop=stop;this.gcstopem=false;this.emergency=false;this.lastatomic=0n;this.valueSize=integer(valueSize);this.onPhase=onPhase;
    this.pause=50;this.stepmul=25;this.stepsize=13;this.minormul=20;this.majormul=25;
    if(this.valueSize<=0n)throw new RangeError('invalid Lua GC work size');
  }
  bytes(){return integer(this.getBytes());}
  phase(state){this.state=state;this.onPhase?.(state);}
  allocated(delta){this.debt+=integer(delta);}
  setDebt(debt){const minimum=this.bytes()-MAX_LMEM;this.debt=integer(debt)<minimum?minimum:integer(debt);}
  declaredGenerational(){return this.mode===GC_MODE.GEN || this.lastatomic!==0n;}
  invoke(name,...args){if(typeof this.graph[name]!=='function')throw new Error(`Lua GC phase backend is missing ${name}`);return this.graph[name](...args);}
  setPause(){
    const estimate=this.estimate/100n,pause=BigInt(this.pause*4);
    const threshold=estimate===0n || pause<MAX_LMEM/estimate?estimate*pause:MAX_LMEM;
    const debt=this.bytes()-threshold;this.setDebt(debt>0n?0n:debt);
  }
  setMinorDebt(){this.setDebt(-(this.bytes()/100n)*BigInt(this.minormul));}
  check(){if(this.debt>0n)this.step();}
  withFinalizer(callback){const stopped=this.stop;this.stop|=STOP_GC;try{return callback();}finally{this.stop=stopped;}}
  finalizeSome(count){let done=0;while(done<count && this.invoke('hasFinalizers')){this.withFinalizer(()=>this.invoke('finalizeOne'));done++;}return done;}
  finalizeAll(){while(this.invoke('hasFinalizers'))this.finalizeSome(10);}
  sweep(name,next,nextList){
    const olddebt=this.debt,result=this.invoke('sweep',name,100);
    if(result.done){this.phase(next);if(nextList)this.invoke('beginSweepList',nextList);return 0n;}
    this.estimate+=this.debt-olddebt;return integer(result.count);
  }
  singleStep(){
    if(this.gcstopem)throw new Error('reentrant Lua GC single step');
    this.gcstopem=true;
    try{
      switch(this.state){
        case GC.PAUSE:this.invoke('restartCollection');this.phase(GC.PROPAGATE);return 1n;
        case GC.PROPAGATE:
          if(!this.invoke('hasGray')){this.phase(GC.ENTERATOMIC);return 0n;}
          return integer(this.invoke('propagateOne'));
        case GC.ENTERATOMIC:{
          this.phase(GC.ATOMIC);const work=integer(this.invoke('atomic'));this.invoke('enterSweep');this.phase(GC.SWPALLGC);this.estimate=this.bytes();return work;
        }
        case GC.SWPALLGC:return this.sweep('allgc',GC.SWPFINOBJ,'finobj');
        case GC.SWPFINOBJ:return this.sweep('finobj',GC.SWPTOBEFNZ,'tobefnz');
        case GC.SWPTOBEFNZ:return this.sweep('tobefnz',GC.SWPEND,null);
        case GC.SWPEND:{const before=this.debt;this.invoke('checkSizes');this.estimate+=this.debt-before;this.phase(GC.CALLFIN);return 0n;}
        case GC.CALLFIN:
          if(this.invoke('hasFinalizers')&&!this.emergency){this.gcstopem=false;return BigInt(this.finalizeSome(10))*50n;}
          this.phase(GC.PAUSE);return 0n;
        default:throw new Error(`invalid Lua collector phase ${this.state}`);
      }
    }finally{this.gcstopem=false;}
  }
  runUntil(...states){while(!states.includes(this.state))this.singleStep();}
  incrementalStep(){
    const multiplier=BigInt((this.stepmul*4)|1);
    let debt=int64((this.debt/this.valueSize)*multiplier);
    // Preserve the pinned wasm64 arithmetic even for extreme API exponents:
    // the checked shift may fit while multiplication by stepmul wraps l_mem.
    const size=this.stepsize<=62?int64(((1n<<BigInt(this.stepsize))/this.valueSize)*multiplier):MAX_LMEM;
    do{debt=int64(debt-this.singleStep());}while(debt>int64(-size) && this.state!==GC.PAUSE);
    if(this.state===GC.PAUSE)this.setPause();else this.setDebt(int64((debt/multiplier)*this.valueSize));
  }
  finishGeneration(){
    const before=this.debt;this.invoke('finishGeneration');this.estimate+=this.debt-before;this.phase(GC.PROPAGATE);
    if(!this.emergency)this.finalizeAll();
  }
  atomicToGeneration(){
    this.phase(GC.SWPALLGC);this.invoke('sweepToOld');this.mode=GC_MODE.GEN;this.lastatomic=0n;this.estimate=this.bytes();this.finishGeneration();
  }
  enterGeneration(){
    this.runUntil(GC.PAUSE);this.runUntil(GC.PROPAGATE);this.phase(GC.ATOMIC);
    const work=integer(this.invoke('atomic'));this.atomicToGeneration();this.setMinorDebt();return work;
  }
  enterIncremental(){this.invoke('enterIncremental');this.phase(GC.PAUSE);this.mode=GC_MODE.INC;this.lastatomic=0n;}
  changeMode(mode){if(mode!==this.mode){if(mode===GC_MODE.GEN)this.enterGeneration();else this.enterIncremental();}this.lastatomic=0n;}
  fullGeneration(){this.enterIncremental();return this.enterGeneration();}
  stepGenerationFull(){
    const previous=this.lastatomic;if(this.mode===GC_MODE.GEN)this.enterIncremental();
    this.runUntil(GC.PROPAGATE);this.phase(GC.ATOMIC);const work=integer(this.invoke('atomic'));
    if(work<previous+(previous>>3n)){this.atomicToGeneration();this.setMinorDebt();}
    else{
      this.estimate=this.bytes();this.invoke('enterSweep');this.phase(GC.SWPALLGC);this.runUntil(GC.PAUSE);this.setPause();this.lastatomic=work;
    }
  }
  generationalStep(){
    if(this.lastatomic!==0n)this.stepGenerationFull();
    else{
      const base=this.estimate,growth=(base/100n)*BigInt(this.majormul*4);
      if(this.debt>0n && this.bytes()>base+growth){
        const work=this.fullGeneration();
        if(this.bytes()>=base+growth/2n){this.lastatomic=work;this.setPause();}
      }else{
        this.invoke('youngCollection');this.phase(GC.SWPALLGC);this.finishGeneration();this.setMinorDebt();this.estimate=base;
      }
    }
  }
  step(){if(this.stop!==0)this.setDebt(-2000n);else if(this.declaredGenerational())this.generationalStep();else this.incrementalStep();}
  fullCollect(emergency=false){
    if(this.emergency)throw new Error('reentrant emergency Lua GC');
    this.emergency=Boolean(emergency);
    try{
      if(this.mode===GC_MODE.GEN)this.fullGeneration();
      else{
        if(this.state<=GC.ATOMIC){this.invoke('enterSweep');this.phase(GC.SWPALLGC);}
        this.runUntil(GC.PAUSE);this.runUntil(GC.PROPAGATE);this.phase(GC.ENTERATOMIC);this.runUntil(GC.CALLFIN);this.runUntil(GC.PAUSE);this.setPause();
      }
    }finally{this.emergency=false;}
  }
  control(operation,...args){
    if(this.stop&STOP_GC)return -1;
    switch(int32(operation)){
      case GC_OP.STOP:this.stop=STOP_USER;return 0;
      case GC_OP.RESTART:this.setDebt(0n);this.stop=0;return 0;
      case GC_OP.COLLECT:this.fullCollect(false);return 0;
      case GC_OP.COUNT:return int32(this.bytes()>>10n);
      case GC_OP.COUNTB:return Number(this.bytes()&1023n);
      case GC_OP.ISRUNNING:return Number(this.stop===0);
      case GC_OP.SETPAUSE:{const old=this.pause*4;this.pause=gcParameter(args[0]??0);return old;}
      case GC_OP.SETSTEPMUL:{const old=this.stepmul*4;this.stepmul=gcParameter(args[0]??0);return old;}
      case GC_OP.STEP:{
        const data=int32(args[0]??0),oldstop=this.stop;let debt=1n;this.stop=0;
        try{if(data===0){this.setDebt(0n);this.step();}else{debt=BigInt(data)*1024n+this.debt;this.setDebt(debt);this.check();}}
        finally{this.stop=oldstop;}
        return Number(debt>0n && this.state===GC.PAUSE);
      }
      case GC_OP.GEN:{
        const old=this.declaredGenerational()?GC_OP.GEN:GC_OP.INC,minor=int32(args[0]??0),major=int32(args[1]??0);
        if(minor!==0)this.minormul=byte(minor);if(major!==0)this.majormul=gcParameter(major);this.changeMode(GC_MODE.GEN);return old;
      }
      case GC_OP.INC:{
        const old=this.declaredGenerational()?GC_OP.GEN:GC_OP.INC,pause=int32(args[0]??0),mul=int32(args[1]??0),size=int32(args[2]??0);
        if(pause!==0)this.pause=gcParameter(pause);if(mul!==0)this.stepmul=gcParameter(mul);if(size!==0)this.stepsize=byte(size);this.changeMode(GC_MODE.INC);return old;
      }
      default:return -1;
    }
  }
  beginClose(){this.stop=STOP_CLOSE;this.changeMode(GC_MODE.INC);}
}

/* The generation algorithms operate the collector's real linked records.
 * graph: {lists:{allgc,finobj,tobefnz},boundaries,currentWhite,grayLists,
 * freeRecord,reallyMark,linkGrayAgain,clearGrayLists,atomic,setPhase}.
 * Records: {next,grayNext,age,white,black,kind,open,value}. White0 means
 * non-white; currentWhite is Lua's current two-white color, not a boolean.
 * Generic link cursors {object,key} preserve native GCObject** semantics.
 */
export class LuaGCGenerational {
  constructor(graph){this.graph=graph;}
  cursor(list){return {object:this.graph.lists,key:list};}
  markOld(from,to){for(let item=from;item!==to;item=item.next)if(item.age===GC_AGE.OLD1){item.age=GC_AGE.OLD;if(item.black)this.graph.reallyMark(item);}}
  sweepToOldList(list){
    let cursor=this.cursor(list),item;
    while((item=cursor.object[cursor.key])){
      if(item.white){cursor.object[cursor.key]=item.next;this.graph.freeRecord(item);}
      else{
        item.age=GC_AGE.OLD;
        if(item.kind==='thread')this.graph.linkGrayAgain(item);
        else if(item.kind==='upvalue'&&(item.open??item.value?.open)){item.white=0;item.black=false;}
        else{item.white=0;item.black=true;}
        cursor={object:item,key:'next'};
      }
    }
  }
  sweepGen(cursor,limit,firstOld1=null){
    const ages=[GC_AGE.SURVIVAL,GC_AGE.OLD1,GC_AGE.OLD1,GC_AGE.OLD,GC_AGE.OLD,GC_AGE.TOUCHED1,GC_AGE.TOUCHED2];let item;
    while((item=cursor.object[cursor.key])!==limit){
      if(!item)throw new Error('invalid Lua generational sweep boundary');
      if(item.white){cursor.object[cursor.key]=item.next;this.graph.freeRecord(item);}
      else{
        if(item.age===GC_AGE.NEW){item.age=GC_AGE.SURVIVAL;item.white=this.graph.currentWhite;item.black=false;}
        else{item.age=ages[item.age];if(item.age===GC_AGE.OLD1&&firstOld1===null)firstOld1=item;}
        cursor={object:item,key:'next'};
      }
    }
    return {cursor,firstOld1};
  }
  correctGrayList(cursor){
    let item;
    while((item=cursor.object[cursor.key])){
      if(item.white){cursor.object[cursor.key]=item.grayNext;continue;}
      if(item.age===GC_AGE.TOUCHED1){item.black=true;item.age=GC_AGE.TOUCHED2;cursor={object:item,key:'grayNext'};}
      else if(item.kind==='thread')cursor={object:item,key:'grayNext'};
      else{if(item.age===GC_AGE.TOUCHED2)item.age=GC_AGE.OLD;item.black=true;cursor.object[cursor.key]=item.grayNext;}
    }
    return cursor;
  }
  correctGrayLists(){
    const lists=this.graph.grayLists;let cursor=this.correctGrayList({object:lists,key:'grayagain'});
    for(const name of ['weak','allweak','ephemeron']){cursor.object[cursor.key]=lists[name];lists[name]=null;cursor=this.correctGrayList(cursor);}
  }
  sweepToOld(){
    const g=this.graph,b=g.boundaries;g.clearGrayLists();g.setPhase(GC.SWPALLGC);
    this.sweepToOldList('allgc');b.reallyold=b.old1=b.survival=g.lists.allgc;b.firstold1=null;
    this.sweepToOldList('finobj');b.finobjrold=b.finobjold1=b.finobjsur=g.lists.finobj;
    this.sweepToOldList('tobefnz');
  }
  youngCollection(){
    const g=this.graph,b=g.boundaries;
    if(b.firstold1){this.markOld(b.firstold1,b.reallyold);b.firstold1=null;}
    this.markOld(g.lists.finobj,b.finobjrold);this.markOld(g.lists.tobefnz,null);
    g.setPhase(GC.ATOMIC);const work=g.atomic();g.setPhase(GC.SWPALLGC);
    let result=this.sweepGen(this.cursor('allgc'),b.survival,b.firstold1);b.firstold1=result.firstOld1;const survival=result.cursor;
    result=this.sweepGen(survival,b.old1,b.firstold1);b.firstold1=result.firstOld1;
    b.reallyold=b.old1;b.old1=survival.object[survival.key];b.survival=g.lists.allgc;
    result=this.sweepGen(this.cursor('finobj'),b.finobjsur);const finSurvival=result.cursor;this.sweepGen(finSurvival,b.finobjold1);
    b.finobjrold=b.finobjold1;b.finobjold1=finSurvival.object[finSurvival.key];b.finobjsur=g.lists.finobj;
    this.sweepGen(this.cursor('tobefnz'),null);return work;
  }
  enterIncremental(){for(const name of ['allgc','finobj','tobefnz'])for(let item=this.graph.lists[name];item;item=item.next){item.white=this.graph.currentWhite;item.black=false;item.age=GC_AGE.NEW;}for(const key of ['reallyold','old1','survival','firstold1','finobjrold','finobjold1','finobjsur'])this.graph.boundaries[key]=null;}
}
