// Exact configured original game data. No filesystem/cache/Wasm/network access.
// Reproduce with scripts/export-standalone-game-assets.py from the sealed recipe.
// NetHack license is retained verbatim in game-assets.LICENSE and bundle /license;
// terminal data retains nethack-c/wasm/terminfo/LICENSE.ncurses and its provenance.
import bundle from './game-assets.json' with {type:'json'};
export function loadGameAssets(){
 if(bundle.version!==1||bundle.root!=='/nethack')throw new Error('Unknown bundled game asset format');
 const assets=Object.create(null);
 for(const entry of bundle.entries){
  const raw=atob(entry.base64),bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  assets[bundle.root+'/'+entry.path]={bytes,mode:entry.mode};
 }
 return assets;
}
