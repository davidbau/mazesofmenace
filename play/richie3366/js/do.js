// do.js — miscellaneous hero actions from do.c.
// C ref: do.c — donull (wait / rest).

/**
 * C ref: do.c donull — '.' command: do nothing for one move.
 * Returns true if the command consumes time (ECMD_TIME).
 *
 * Omits cmd_safety_prevention (safe_wait + adjacent hostile / danger_uprops
 * → ECMD_OK without time). Named in C-JS-MAP.md.
 */
export function donull() {
    return true;
}
