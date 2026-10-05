// js/hostenv.js — the port's read-only view of the host environment.
//
// WHY THIS EXISTS
// ---------------
// free; in a BROWSER a bare `process` is an undeclared identifier and every
// unguarded one throws ReferenceError the moment its statement evaluates.
// August is enough to make the page unplayable.
//
// `typeof process !== 'undefined' && ...` guarded most of them and is itself
// safe — `typeof` on an undeclared identifier does not throw — but 65 sites
// had no guard, and a guard that must be remembered at every new site is a
// guard that will be forgotten at the next one.  This module removes the
// question: ENV is always an object, on every host.
//
// It reads `globalThis.process` rather than importing anything, so there is no
// specifier for a browser's module loader to fail on — see
//
// NOT A CAPABILITY.  Reading an env var is not "filesystem or network"; the
// object is frozen-by-convention here and never written.  On a browser it is
// simply empty, which is the same thing as "no trace flags set".

/** The host's environment, or an empty object on a host that has none. */
export const ENV = (globalThis.process && globalThis.process.env) || {};
