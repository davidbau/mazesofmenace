// The existing NOMUX cell representation serialized directly into a JS byte
// string. The recorder codec remains separate and unchanged.
const characters=Array.from({length:256},(_,i)=>String.fromCharCode(i));
const foreground=Array.from({length:256},(_,i)=>'\x1b['+(i<=7?30+i:i<=15?90+i-8:37)+'m');
export function serializeNativeFrame(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length!==24*80*4)throw new TypeError('Review native frame dimensions');
 const rows=[];
 for(let row=0;row<24;row++){
  let end=79,fg=7,attr=0,dec=false,line='';
  while(end>=0){const at=(row*80+end)*4;if((bytes[at]!==32&&bytes[at]!==0)||bytes[at+2]!==0||(bytes[at+1]!==7&&bytes[at+1]!==0))break;end--;}
  for(let col=0;col<=end;col++){
   const at=(row*80+col)*4,nextFg=bytes[at+1]||7,nextAttr=bytes[at+2];
   if(nextAttr!==attr){
    if((nextAttr&1)&&!(attr&1))line+='\x1b[7m';
    if(!(nextAttr&1)&&(attr&1))line+='\x1b[27m';
    if((nextAttr&2)&&!(attr&2))line+='\x1b[1m';
    if(!(nextAttr&2)&&(attr&2))line+='\x1b[22m';
    if((nextAttr&4)&&!(attr&4))line+='\x1b[4m';
    if(!(nextAttr&4)&&(attr&4))line+='\x1b[24m';
    attr=nextAttr;
   }
   if(nextFg!==fg){line+=nextFg===7?'\x1b[39m':foreground[nextFg];fg=nextFg;}
   const nextDec=Boolean(bytes[at+3]);if(nextDec!==dec){line+=nextDec?'\x0e':'\x0f';dec=nextDec;}
   line+=characters[bytes[at]||32];
  }
  if(dec)line+='\x0f';
  if(attr)line+='\x1b[0m';else if(fg!==7)line+='\x1b[39m';
  rows.push(line);
 }
 return rows.join('\n');
}
export function createNativeFrameCapture(C,namespace,services){
 const x={value:0},y={value:0};
 return kind=>{
  // Snapshot before flushing, and classify the marker after flushing, in the
  // same order as the source path. Keep numeric cursor values across callbacks.
  const screen=serializeNativeFrame(C.nomuxScreenViews().bytes);
  namespace.nomux_get_cursor(x,y);const cx=x.value,cy=y.value;
  C.fflush(C.NULL);
  services.nativeFrameCapture(screen,cx,cy,services.nativeMarkerKind(kind)==='anim');
 };
}
