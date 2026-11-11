// host/setjmp.js - setjmp()/longjmp() for the game.
//
// The implementation is js/rt/setjmp.js: longjmp() throws an rt LongJmp
// carrying the jmp_buf's address, and the catch block of the rewriter's
// setjmp lowering takes it with setjmp_caught().  The host adds nothing to
// it (no machine.longjmp / catch_longjmp): the vendored C library's
// own longjmp (lua_error, luaL_error inside the Lua VM) is a different
// exception that only the C library's own setjmp points catch, so it never
// reaches a JS setjmp site, and a JS longjmp that crosses Lua frames
// (nhlua.c nhl_hookfn -> nhl_pcall) leaves that lua_State unusable, which is
// fine: the game panics there, and interactive play restores a heap snapshot.

export { LongJmp, longjmp, setjmp_caught } from "../rt/setjmp.js";
