// Configured SDK boundary behavior on real shared CVFS metadata/descriptors.
import abi from './unix-platform-abi.json' with {type:'json'};
import sdk from './sdk-boundary-abi.json' with {type:'json'};
import {VFSError} from '../services/c-vfs.js';
export function connectUnixPlatformSyscalls(environment,ctypes){
 const {services,filesystem,memory,libc,transport}=environment,ptr=environment.address;
 const text=p=>typeof p==='string'?p:memory.readString(ptr(p));
 const capture=fn=>{try{return fn();}catch(e){if(!(e instanceof VFSError))throw e;libc.errno=e.errno;return -1;}};
 const validate=fd=>{fd=transport.int(fd);if(services.descriptorFlags)services.descriptorFlags(fd);else if(fd<0||fd>2)filesystem.fstat(fd);return fd;};
 function writeStat(at,stat){
  at=ptr(at);memory.bounds(at,ctypes.size('struct stat'));
  for(const [field,value,type]of [['st_dev',stat.dev,'unsigned int'],['st_mode',stat.mode,'unsigned int'],['st_nlink',stat.nlink,'unsigned long'],['st_uid',stat.uid,'unsigned int'],['st_gid',stat.gid,'unsigned int'],['st_rdev',stat.rdev,'unsigned int'],['st_size',stat.size,'long long'],['st_blksize',4096,'int'],['st_blocks',stat.blocks,'int'],['st_ino',stat.ino,'unsigned long long']])ctypes.setField('struct stat',at,field,type,value);
  for(const name of ['atime','mtime','ctime']){const ms=stat[name].getTime(),base=ctypes.locate('struct stat',at,'st_'+name[0]+'tim').at;ctypes.setField('struct timespec',base,'tv_sec','long long',BigInt(Math.floor(ms/1000)));ctypes.setField('struct timespec',base,'tv_nsec','long',BigInt((ms%1000)*1000000));}
  return 0;
 }
 let mask=0o22;const clock=services.time;
 const syscalls={
  stat:(path,out)=>capture(()=>writeStat(out,filesystem.stat(text(path)))),
  fstat:(fd,out)=>capture(()=>{fd=transport.int(fd);if(fd>=0&&fd<=2)throw new Error('Unconnected SDK tty stat metadata');return writeStat(out,filesystem.fstat(fd));}),
  // libsyscall first validates the descriptor, including for no-op lock cmds.
  fcntl:(fd,cmd,arg)=>capture(()=>{fd=validate(fd);cmd=transport.int(cmd);if(cmd===sdk.constants.F_GETFL){const flags=services.descriptorFlags(fd);if(flags<0&&flags>=-4095){libc.errno=-flags;return -1;}return flags;}if(cmd===sdk.constants.F_SETFL)return services.addDescriptorFlags(fd,transport.int(arg));if([abi.fcntl.F_GETFD,abi.fcntl.F_SETFD,abi.fcntl.F_SETLK,abi.fcntl.F_SETLKW].includes(cmd))return 0;if(cmd===abi.fcntl.F_GETLK){memory.view.setInt16(ptr(arg)+abi.fcntl.flock_type,2,true);return 0;}throw new Error('Unconnected SDK fcntl command '+cmd);}),
  chmod:(path,mode)=>capture(()=>{const node=filesystem._lookup(text(path));mode=transport.uint(mode);if(mode&~0o777)throw new VFSError('ENOTSUP',text(path));node.mode=(node.mode&~0o777)|mode;node.ctime=filesystem._now();return 0;}),
  getuid:()=>0,getgid:()=>0,
  getlogin:()=>services.getenv(services.literal('LOGNAME')),
  isatty:fd=>{const result=capture(()=>{fd=validate(fd);if(fd<=2)return 1;if((filesystem.fstat(fd).mode&0o170000)===0o020000)return 1;libc.errno=abi.errno.ENOTTY;return 0;});return result<0?0:result;},
  umask:value=>{const old=mask;mask=transport.int(value);return old;},
  time:out=>{const value=clock();if(out)ctypes.store('long long',ptr(out),value);return value;},
  strerror:code=>services.literal(abi.errors[String(transport.int(code))]??abi.errors['0']),
  perror:message=>{const error=abi.errors[String(libc.errno)]??abi.errors['0'];if(message&&text(message)){services.fputs(message,services.stderr);services.fputs(': ',services.stderr);}services.fputs(error,services.stderr);services.fputc(10,services.stderr);},
 };
 Object.assign(services,syscalls);environment.register('unix-platform-syscalls',syscalls);
 return {writeStat,limitation:'Configured SDK single-process locking; unsupported fcntl commands fail explicitly.'};
}
