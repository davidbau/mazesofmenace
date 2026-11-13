// Compatibility entry supplies NetHack header aliases to shared record views.
import {createRecordViews as createViews} from '../c-runtime/record-views.js';
import {fieldAliases} from './declarations.js';
export function createRecordViews(environment) {
    return createViews(environment,fieldAliases);
}
