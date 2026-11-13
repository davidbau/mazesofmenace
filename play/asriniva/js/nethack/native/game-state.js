// Native ownership: references in occupancy and linked lists are the same objects.
import {createNativeMonsterMovement} from './monster-movement.js';
const short = n => Number(n) << 16 >> 16;
const int = n => Number(n) | 0;
export class NativeGameState {
 constructor({width=80,height=21,trackLength=4}={}) {
  this.width=width; this.height=height; this.trackLength=trackLength;
  this.monsters=new Map(); this.nextId=1; this.head=0;
  this.cells=Array.from({length:width},()=>Array.from({length:height},()=>({typ:0,flags:0,lit:0,edge:0})));
  this.occupancy=Array.from({length:width},()=>Array(height).fill(0));
  this.visibility=Array.from({length:height},()=>new Uint8Array(width));
 }
 cell(x,y) {if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=this.width||y>=this.height)throw new RangeError('Map coordinate');return this.cells[x][y];}
 createMonster(fields={}) {
  const m={mx:0,my:0,mhp:1,mhpmax:1,movement:0,mspec_used:0,meating:0,mcanmove:1,mcansee:1,mstate:0n,data:0,...fields,
   id:this.nextId++,nmon:this.head,mtrack:Array.from({length:this.trackLength},()=>({x:0,y:0}))};
  this.monsters.set(m.id,m); this.head=m; return m;
 }
 requireMonster(m) {if(this.monsters.get(m?.id)!==m)throw new TypeError('Foreign monster');}
 placeMonster(m,x,y) {this.requireMonster(m);this.cell(x,y);if(this.occupancy[x][y]&&this.occupancy[x][y]!==m)throw new Error('Occupied map cell');this.occupancy[x][y]=m;}
 removeMonster(x,y) {this.cell(x,y);this.occupancy[x][y]=0;}
 // Match C ordering: occupancy removal and placement remain separate operations.
 moveMonster(m,x,y) {this.requireMonster(m);this.cell(x,y);if(this.occupancy[x][y]&&this.occupancy[x][y]!==m)throw new Error('Occupied map cell');this.removeMonster(m.mx,m.my);m.mx=short(x);m.my=short(y);this.placeMonster(m,x,y);}
 bindMovement(dependencies) {
  const state=this;
  const context=Object.assign(Object.create(dependencies),{
   int,uint:n=>Number(n)>>>0,coordxy:short,char:n=>Number(n)<<24>>24,uchar:n=>Number(n)&255,boolean:n=>Number(n)<<24>>24,
   bool:n=>n?1:0,long:n=>BigInt.asIntN(64,BigInt(n)),ulong:n=>BigInt.asUintN(64,BigInt(n)),samePtr:(a,b)=>a===b,
   intdiv:(a,b)=>int(Math.trunc(a/b)),min:Math.min,max:Math.max,
   MTSZ:this.trackLength,levl:this.cells,
   monster:m=>m,permonst:p=>p,object:o=>o,coord:p=>p,
   coordxyLocal:(value=0)=>({value:short(value)}),intLocal:(value=0)=>({value:int(value)}),
   mfndposLocal:()=>({cnt:0,poss:Array.from({length:9},()=>({x:0,y:0})),info:Array(9).fill(0n)}),
   copyStruct:(out,src)=>Object.assign(out,src),
   m_at:(x,y)=>state.occupancy[x][y],MON_AT:(x,y)=>Boolean(state.occupancy[x][y]),
   remove_monster:(x,y)=>state.removeMonster(x,y),place_monster:(m,x,y)=>state.placeMonster(m,x,y),
   cansee:(x,y)=>Boolean(state.visibility[y][x]&dependencies.IN_SIGHT),
   couldsee:(x,y)=>Boolean(state.visibility[y][x]&dependencies.COULD_SEE),
  });
  return createNativeMonsterMovement(context);
 }
}
