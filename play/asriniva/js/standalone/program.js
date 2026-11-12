// Standalone program assembly. Source main owns initialization and gameplay.
import {createStandaloneEnvironment} from './environment.js';
export function createStandaloneProgram({layouts,runtime={},stdio:stdioOptions={},assets={},filesystemSnapshot,directories=[],readKey}={}){
 if(!layouts)throw new TypeError('Standalone program requires the configured layout profile');
 if(typeof readKey!=='function')throw new TypeError('Standalone program requires a synchronous keyboard boundary');
 const now=runtime.now??Date.now,environment=createStandaloneEnvironment({...runtime,now:()=>Number(now())/1000,filesystem:{clock:now,...runtime.filesystem}}),env=environment;
 if(filesystemSnapshot)env.filesystem.importSnapshot(filesystemSnapshot);
 for(const name of directories)env.filesystem.mkdirTree(name);
 for(const[name,value]of Object.entries(assets)){const slash=name.lastIndexOf('/');if(slash>0)env.filesystem.mkdirTree(name.slice(0,slash));const row=value instanceof Uint8Array||typeof value==='string'?{bytes:value}:value;env.filesystem.writeFile(name,row.bytes,{mode:row.mode});}
 const stdio=env.enableStdio(stdioOptions);
 env.enableSdkBoundary();
 env.enableDecl(layouts.decl);env.enableDrawing(layouts.drawing);env.enableObjects(layouts.objects);env.enableMonst(layouts.monst);
 env.enableSerialization(layouts);env.enableRnd(layouts.rnd,{seed:BigInt(runtime.environment?.NETHACK_SEED??1)});
 env.enableAddressPort('dungeon',{only:['ledger_no','maxledgerno']});env.enableObjectState(layouts);env.enableObjectRecords(layouts);env.enableItemInventory(layouts);env.enableTimers(layouts);env.enableItemNaming(layouts);env.enableMonsterSelection(layouts);env.enableMonsterCreation(layouts);
 env.enableGameStartup(layouts);env.enableHeroStartup(layouts);env.enableWorldPosition(layouts);env.enableLuaSandbox(layouts);env.enableDisplayStartup(layouts);
 env.enableLevelStartup(layouts);env.enableLevelContents(layouts);const window=env.enableWindowSystem(layouts);
 env.enableVersionInfo(layouts);env.enableOptions(layouts);env.enableSymbols(layouts);env.enableGlyphs(layouts);env.enableCommands(layouts);env.enableConfiguration(layouts);env.enableFiles(layouts);env.enableStatus(layouts);env.enableGameWindows(layouts);env.enableColorAttributes(layouts);env.enableMovement(layouts);env.enablePets(layouts);env.enableMonsterMovement(layouts);env.enableMonsterLifecycle(layouts);env.enableShknam(layouts);env.enableHeroEquipment(layouts);
 env.enableQuestPager(layouts);env.enableTerminalInput(layouts,{readKey});env.enableTerminalMessages(layouts);env.enableMessages(layouts);env.enableDoLifecycle(layouts);env.enableSaveLifecycle(layouts);env.enableLevelPersistence(layouts);env.enableWorms(layouts);env.enableRuntimeInfo(layouts);env.enableReport(layouts);env.enableTurnLoop(layouts);env.enableKillerState(layouts);env.enableEndLifecycle(layouts);env.enableInsight(layouts);env.enableTopten(layouts);env.enableRestoreLifecycle(layouts);env.enablePotion(layouts);env.enableZap(layouts,{only:['get_obj_location','get_mon_location','obj_resists','wish_history_flush','exclam','dozap','buzz','flash_str','weffects','zap_over_floor','destroy_items','bhit','hit','miss','fracture_rock','makewish','learnwand']});env.enableWere(layouts);env.enableDogmove(layouts);env.enableMhitu(layouts);env.enableMhitm(layouts);env.enableUhitm(layouts);env.enableMthrowu(layouts);env.enableMcastu(layouts);env.enableRead(layouts);env.enableRip(layouts);env.enableExplode(layouts);env.enableWizard(layouts);env.enableMplayer(layouts);env.enableMinion(layouts);env.enableVault(layouts);env.enablePriest(layouts);env.enableQuest(layouts);env.enableLock(layouts);env.enableApply(layouts);env.enableAddressPort('detect',{only:['dosearch0']});env.enableUnixPlatform(layouts);
 env.enableSteal(layouts);
 env.enableMondata(layouts);
 env.enableSpecialInteractions(layouts);
 env.enableGetpos(layouts);
 env.enableDetect(layouts);
 env.enableRegion(layouts);
 env.enableBall(layouts);
 env.enableWizcmds(layouts);
 env.enableZapPublic(layouts);
 env.enableDbridge(layouts);
 env.enableDoName(layouts);
 env.enableEngrave(layouts);
 env.enableDiscoveries(layouts);
 let started=false;
 return{environment,stdio,terminal:window.terminal,
  run(argv=[],{programName='./this.program'}={}){
   if(started)throw new Error('A standalone program instance runs once');
   if(!Array.isArray(argv)||argv.some(arg=>typeof arg!=='string'))throw new TypeError('Program arguments must be strings');
   started=true;const args=[programName,...argv],vector=env.memory.calloc(args.length+1,8);
   args.forEach((arg,i)=>env.memory.view.setBigUint64(vector+i*8,BigInt(env.services.literal(arg)),true));
   return env.services.main(args.length,vector);
  },
 };
}
