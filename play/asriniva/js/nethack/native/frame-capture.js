import {createRecorderFrameEncoder, serializeNativeFrame} from '../../ported/frame-encoding.js';
export {serializeNativeFrame};

export function createNativeFrameCapture(C,namespace,services){
 const x={value:0},y={value:0};
 const encode=createRecorderFrameEncoder();
 return kind=>{
  // Snapshot before flushing, and classify the marker after flushing, in the
  // same order as the source path. Keep numeric cursor values across callbacks.
  const bytes=C.nomuxScreenViews().bytes;
  const encoded=typeof services.nativeEncodedFrameCapture==='function';
  const screen=encoded?encode(bytes):serializeNativeFrame(bytes);
  namespace.nomux_get_cursor(x,y);const cx=x.value,cy=y.value;
  C.fflush(C.NULL);
  const capture=encoded?services.nativeEncodedFrameCapture:services.nativeFrameCapture;
  capture(screen,cx,cy,services.nativeMarkerKind(kind)==='anim');
 };
}
