// level_transition.js -- Re-export shim for level transition utilities.
// getArrivalPosition lives in do.js; this module provides a stable import
// path used by tests and older cross-references.
export { getArrivalPosition } from './do.js';
