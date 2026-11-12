// Narrow scanf conversions over a byte reader; no seeking or whole-stream copy.
// Integer consumption and failure rules follow the pinned musl vfscanf/intscan.
import abi from './libc-profile.json' with {type:'json'};
export function scanFormatted(memory,libc,reader,format,outputs){
 if(abi.longBytes!==8||abi.pointerBytes!==8||abi.EOF!==-1)throw new Error('Review scanf target ABI');
 let position=0,assigned=0,out=0;
 const space=c=>c===32||(c>=9&&c<=13),get=()=>{const c=reader.get();if(c>=0)position++;return c;},unget=c=>{if(c>=0){reader.unget(c);position--;}};
 const skip=()=>{let c;do{c=get();}while(space(c));unget(c);};
 const store=(p,length,value)=>{p=Number(p?.address??p);const bits=length==='hh'?8:length==='h'?16:['l','ll','j','z','t'].includes(length)?64:32;memory.bounds(p,bits/8);if(bits===64)memory.view.setBigInt64(p,BigInt.asIntN(64,value),true);else memory.view['setInt'+bits](p,Number(BigInt.asIntN(bits,value)),true);};
 for(let i=0;i<format.length;){
  if(space(format.charCodeAt(i))){while(space(format.charCodeAt(++i)));skip();continue;}
  if(format[i]!=='%'||format[i+1]==='%'){
   if(format[i]==='%'){i++;skip();}const c=get();if(c!==format.charCodeAt(i)){unget(c);return c<0&&!assigned?-1:assigned;}i++;continue;
  }
  i++;const suppress=format[i]==='*';if(suppress)i++;
  let widthText='';while(/[0-9]/.test(format[i]??''))widthText+=format[i++];const width=Number(widthText)||Infinity;
  let length='';if(/[hljztL]/.test(format[i]??'')){length=format[i++];if((length==='h'||length==='l')&&format[i]===length)length+=format[i++];}
  const kind=format[i++];if(!'diuoxXscn['.includes(kind)||length==='L'||(length&&'sc['.includes(kind)))throw new Error('Unsupported standalone scanf conversion '+length+kind);
  let destination;
  if(!suppress){if(out>=outputs.length)throw new Error('Missing scanf output argument');destination=Number(outputs[out++]?.address??outputs[out-1]);}
  if(kind==='n'){if(!suppress)store(destination,length,BigInt(position));continue;}
  if(!'c['.includes(kind))skip();
  const first=get();if(first<0)return assigned||-1;unget(first);
  const limit=kind==='c'&&!widthText?1:width;let used=0;
  const take=()=>{if(used>=limit)return -1;const c=get();if(c>=0)used++;return c;},back=c=>{if(c>=0){unget(c);used--;}};
  if('sc['.includes(kind)){
   let accepts;
   if(kind==='c')accepts=c=>c>=0;
   else if(kind==='s')accepts=c=>c>=0&&!space(c);
   else{
    let invert=false;if(format[i]==='^'){invert=true;i++;}const set=new Set();
    if(format[i]==='-')set.add(format.charCodeAt(i++));else if(format[i]===']')set.add(format.charCodeAt(i++));
    while(i<format.length&&format[i]!==']'){
     if(format[i]==='-'&&format[i+1]&&format[i+1]!==']'){const end=format.charCodeAt(i+1);for(let c=format.charCodeAt(i-1);c<end;c++)set.add(c);i++;}set.add(format.charCodeAt(i++));
    }
    if(format[i++]!==']')throw new Error('Unterminated scanf scanset');accepts=c=>c>=0&&(set.has(c)!==invert);
   }
   let n=0,c;while(accepts(c=take())){if(!suppress){memory.bounds(destination+n,1);memory.HEAPU8[destination+n]=c;}n++;}back(c);
   if(!n||(kind==='c'&&n!==limit))return assigned;
   if(!suppress){if(kind!=='c'){memory.bounds(destination+n,1);memory.HEAPU8[destination+n]=0;}assigned++;}continue;
  }
  let c=take(),negative=false,base=kind==='o'?8:'xX'.includes(kind)?16:kind==='i'?0:10,value=0n,digits=0;
  if(c===43||c===45){negative=c===45;c=take();}
  if((base===0||base===16)&&c===48){
   digits=1;c=take();if(c===120||c===88){c=take();if(!((c>=48&&c<=57)||(c>=65&&c<=70)||(c>=97&&c<=102))){back(c);return assigned;}base=16;digits=0;}
   else if(base===0)base=8;
  }else if(!base)base=10;
  const digit=c=>c>=48&&c<=57?c-48:c>=65&&c<=90?c-55:c>=97&&c<=122?c-87:255;
  const max=(1n<<64n)-1n;let overflow=false;
  while(c>=0&&digit(c)<base){if(!overflow){value=value*BigInt(base)+BigInt(digit(c));if(value>max)overflow=true;}digits++;c=take();}back(c);
  if(!digits){libc.errno=abi.EINVAL;return assigned;}
  if(overflow){value=max;negative=false;libc.errno=abi.ERANGE;}if(negative)value=-value;
  if(!suppress){store(destination,length,value);assigned++;}
 }
 return assigned;
}
