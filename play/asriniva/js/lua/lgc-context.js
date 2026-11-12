/* Allocation context is dynamically scoped and restored across nested VMs.
 * Persistent heap state belongs to LuaHeap, never to this module slot.
 */
let current = null;
export const currentHeap = () => current;
export function withHeap(heap, callback) { const previous = current; current = heap; try { return callback(); } finally { current = previous; } }
