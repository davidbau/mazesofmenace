// One per-game native field owner. Legacy byte-level services are explicit
// synchronization boundaries; native-to-native field access stays in JS.
export class NativeStateBridge {
 constructor() { this.depth=0; this.epoch=0; this.dirty=new Set(); this.fields=0; this.hits=0; this.boundaries=0; }
 field(read,write,normalize=v=>v) {
  const owner=this;
  const cell={epoch:-1,value:undefined,read,write};this.fields++;
  return {enumerable:true,get(){
   if(!owner.depth)return read();
   if(cell.epoch!==owner.epoch){cell.value=read();cell.epoch=owner.epoch;}else owner.hits++;
   return cell.value;
  },set(value){if(!owner.depth){write(normalize(value));owner.invalidate();return;}cell.value=normalize(value);cell.epoch=owner.epoch;owner.dirty.add(cell);}};
 }
 flush() {for(const cell of this.dirty)cell.write(cell.value);this.dirty.clear();}
 invalidate() {this.epoch++;}
 boundary(fn,...args) {
  this.flush();this.boundaries++;const depth=this.depth;this.depth=0;
  try {return fn(...args);}finally {this.depth=depth;this.invalidate();}
 }
 enter() {this.flush();this.depth++;this.invalidate();}
 leave() {this.flush();this.depth--;this.invalidate();}
}
