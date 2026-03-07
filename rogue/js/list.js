/**
 * list.js — Linked list operations for Rogue JS port.
 *
 * C uses struct linked_list { l_next, l_prev, l_data }.
 * In JS we use plain objects. Since C uses &list (pointer to pointer),
 * we pass wrapper objects {val: head} to mutate the list head.
 *
 * C macros map as follows:
 *   new_item(size)   -> new_item()  (allocates l_data = {})
 *   ldata(ptr)       -> ptr.l_data
 *   next(ptr)        -> ptr.l_next
 *   prev(ptr)        -> ptr.l_prev
 *   attach(a, b)     -> _attach({val: a ref}, b) — use attachTo(listp, item)
 *   detach(a, b)     -> _detach({val: a ref}, b) — use detachFrom(listp, item)
 *   free_list(a)     -> _free_list({val: a ref}) — use freeList(listp)
 */

/**
 * Create a new linked list node with an empty data object.
 * @param {object} data - optional data to attach (defaults to {})
 */
export function new_item(data) {
  return { l_next: null, l_prev: null, l_data: data !== undefined ? data : {} };
}

export function ldata(ptr) { return ptr.l_data; }
export function ll_next(ptr) { return ptr.l_next; }
export function ll_prev(ptr) { return ptr.l_prev; }

/**
 * _attach(listp, item): attach item to front of list.
 * listp is an object { val: head_node_or_null }.
 */
export function _attach(listp, item) {
  item.l_next = listp.val;
  item.l_prev = null;
  if (listp.val) listp.val.l_prev = item;
  listp.val = item;
}

/**
 * _detach(listp, item): remove item from list.
 * listp is an object { val: head_node_or_null }.
 */
export function _detach(listp, item) {
  if (item.l_prev) item.l_prev.l_next = item.l_next;
  else listp.val = item.l_next;
  if (item.l_next) item.l_next.l_prev = item.l_prev;
  item.l_next = item.l_prev = null;
}

/**
 * _free_list(listp): clear the list.
 */
export function _free_list(listp) {
  listp.val = null;
}
