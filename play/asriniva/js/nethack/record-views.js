// Compatibility entry supplies NetHack header aliases to shared record views.
import {createRecordViews as createViews} from '../c-runtime/record-views.js';
import {fieldAliases} from './declarations.js';
import {createNativeRecordViews} from './native/record-views.js';
import {nativeStateFor} from './native/state-bridge.js';
export function createRecordViews(environment) {
    if(nativeStateFor(environment).nativeArena)return createNativeRecordViews(environment);
    return createViews(environment,fieldAliases);
}
