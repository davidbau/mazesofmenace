// Compiler sites retain their captured callback token and source evaluation
// order. These are field-specific display calls, never arbitrary C callbacks.
export const displayWindowFields=Object.freeze([
 'win_delay_output','win_delay_output','win_delay_output','win_print_glyph',
 'win_print_glyph','win_display_nhwindow','win_clear_nhwindow','win_print_glyph',
 'win_curs','win_display_nhwindow',
]);
export function connectNativeDisplayWindows(environment,services,schema,windowFields=displayWindowFields,label='display'){
 const fields=environment.ctypes.record('struct window_procs').fields;
 const code=t=>{t=environment.ctypes.canonical(t);return t.includes('*')?'p':t==='void'?'v':t==='float'?'f':t==='double'?'d':environment.ctypes.size(t)===8?'j':'i';};
 if(schema.callbackCalls.length!==windowFields.length)throw Error('Review native '+label+' window sites');
 for(const [site,field]of windowFields.entries()){
  const row=schema.callbackCalls[site];if(row.site!==site)throw Error('Review native '+label+' callback order');
  const signature=[row.ret,...row.types].map(code).join(''),fallback=services['indirect'+site];
  const declaration=fields[field]?.ctype,match=declaration?.match(/^(.*?)\s*\(\*\)\s*\((.*?)\)/);
  const parameters=match?.[2].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void');
  if(!match||[match[1],...parameters].map(code).join('')!==signature||typeof fallback!=='function')throw Error('Review native '+label+' window ABI '+site);
  let installed,invoke;
  services['indirect'+site]=(token,...args)=>{
   const callbacks=environment.nativeWindowCallbacks;
   if(callbacks){
    if(callbacks!==installed){invoke=callbacks.bindCaptured(field,signature);installed=callbacks;}
    return invoke(token,...args);
   }
   return services.nativeOwner?services.nativeOwner.boundary(fallback,token,...args):fallback(token,...args);
  };
 }
}
