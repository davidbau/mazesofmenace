// @ts-nocheck
// decl.js — port of nethack-c/src/decl.c (global declarations / misc functions).
// C ref: decl.c.

/* C decl.c:1185 — gcc 12.2's static analyzer thinks that some fields of
 * svc.context.victual are uninitialized when compiling 'bite(eat.c)' but
 * that's impossible; having bite() pass &svc.context.victual to this no-op
 * eliminates the analyzer's very verbose complaint. */
export function sa_victual(context_victual) {
    return;
}
