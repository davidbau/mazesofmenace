/* llex.c/lparser.c diagnostics through actual lobject.c BuffFS operations.
 * Lua notice: lua/lobject.js. This is internal formatting (no API checkGC). */
import { LuaError, luaStringBytes } from './lua/lobject.js';
import { LuaAuxStack } from './lua-aux-error.js';
import { luaChunkId } from './lua-debug.js';

export class LuaParserErrors {
  constructor(vm,name,{extra=2}={}) { this.vm=vm;this.name=name;this.stack=new LuaAuxStack(vm,{extra,check:false}); }
  format(format,...args){return this.stack.format(format,...args);}
  token(type){
    if(type==='eof')return '<eof>';
    if(type==='name')return '<name>';
    if(type==='string')return '<string>';
    if(type==='number')return '<number>';
    if(type.length===1){const c=type.charCodeAt(0);return c>=32&&c<127?this.format("'%c'",c):this.format("'<\\%d>'",c);}
    return this.format("'%s'",type);
  }
  textToken(parser){
    if(['name','string','number'].includes(parser.t.type)){
      parser.lexer.save('\0');return this.format("'%s'",parser.lexer.buffer.join(''));
    }
    return this.token(parser.t.type);
  }
  raise(message,line,near,context=null){
    if(message?.format)message=this.format(message.format,...message.args);
    const added=this.format('%s:%d: %s',luaChunkId(this.name),line,message);
    let value=added;
    if(near!==null){
      let token;
      if(context?.parser)token=this.textToken(context.parser);
      else if(near==='<eof>')token='<eof>';
      else if(context?.lexer){context.lexer.save('\0');token=this.format("'%s'",context.lexer.buffer.join(''));}
      else token=near;
      value=this.format('%s near %s',added,token);
    }
    const error=new LuaError(value,{adopt:false});error.status=3;throw error;
  }
  close(){this.stack.close();}
}
