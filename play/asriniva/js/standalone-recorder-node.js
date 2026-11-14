// Optional local overrides and diagnostics. Never imported by browser gameplay.
import fs from 'node:fs';
import path from 'node:path';
export function loadRecorderOverrides(assets,layouts){
 const override=process.env.STANDALONE_RECORDER_ASSETS;
 function visit(from,to){for(const entry of fs.readdirSync(from,{withFileTypes:true})){const source=path.join(from,entry.name),target=to+'/'+entry.name;if(entry.isDirectory())visit(source,target);else if(entry.isFile())assets[target]={bytes:new Uint8Array(fs.readFileSync(source)),mode:fs.statSync(source).mode&0o777};else throw Error('Unsupported recorder asset '+source);}}
 if(override){assets={};visit(path.resolve(override),'/nethack');}
 if(process.env.STANDALONE_RECORDER_LAYOUTS)layouts=JSON.parse(fs.readFileSync(process.env.STANDALONE_RECORDER_LAYOUTS));
 return{assets,layouts};
}
export function writeRecorderStats(index,create){
 const directory=process.env.STANDALONE_RECORDER_STATS_DIR;
 fs.mkdirSync(directory,{recursive:true});
 const worker=process.argv.find(a=>a.startsWith('--worker-session=')),session=worker?path.basename(worker.slice('--worker-session='.length)):'direct';
 fs.writeFileSync(path.join(directory,session+'.'+process.pid+'.'+index+'.json'),JSON.stringify(create(session,process.pid),null,2));
}
