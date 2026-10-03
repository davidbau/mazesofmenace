// C ref: sfbase.c norm_ptrs_* — save-format pointer-normalization stubs.
// The norm_ptrs_* family (sfbase.c:748+) re-bases in-memory pointers for
// the binary NHFILE save image (save/restore dispatch via sftags-generated
// tables). Scored JS saves JSON (Constitution §1.6), so only the empty
// no-op bodies port here; each keeps its C signature with the UNUSED
// parameter voided. No live scored callers (decl-only refs).

/**
 * C ref: sfbase.c norm_ptrs_any `:748–750` — empty no-op body.
 * @param {*} d_any C `union any *d_any UNUSED`
 */
export function norm_ptrs_any(d_any) {
    void d_any; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_align `:752–754` — empty no-op body.
 * @param {*} d_align C `struct align *d_align UNUSED`
 */
export function norm_ptrs_align(d_align) {
    void d_align; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_arti_info `:757–759` — empty no-op body.
 * @param {*} d_arti_info C `struct arti_info *d_arti_info UNUSED`
 */
export function norm_ptrs_arti_info(d_arti_info) {
    void d_arti_info; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_attribs `:762–764` — empty no-op body.
 * @param {*} d_attribs C `struct attribs *d_attribs UNUSED`
 */
export function norm_ptrs_attribs(d_attribs) {
    void d_attribs; // C UNUSED
}
