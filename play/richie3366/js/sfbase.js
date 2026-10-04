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

/**
 * C ref: sfbase.c norm_ptrs_bill_x `:767–769` — empty no-op body.
 * @param {*} d_bill_x C `struct bill_x *d_bill_x UNUSED`
 */
export function norm_ptrs_bill_x(d_bill_x) {
    void d_bill_x; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_branch `:772–774` — empty no-op body.
 * @param {*} d_branch C `struct branch *d_branch UNUSED`
 */
export function norm_ptrs_branch(d_branch) {
    void d_branch; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_bubble `:777–779` — empty no-op body.
 * @param {*} d_bubble C `struct bubble *d_bubble UNUSED`
 */
export function norm_ptrs_bubble(d_bubble) {
    void d_bubble; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_cemetery `:782–784` — empty no-op body.
 * @param {*} d_cemetery C `struct cemetery *d_cemetery UNUSED`
 */
export function norm_ptrs_cemetery(d_cemetery) {
    void d_cemetery; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_context_info `:787–789` — empty no-op body.
 * @param {*} d_context_info C `struct context_info *d_context_info UNUSED`
 */
export function norm_ptrs_context_info(d_context_info) {
    void d_context_info; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_achievement_tracking `:792–794` — empty no-op body.
 * @param {*} d_achievement_tracking C `struct achievement_tracking *d_achievement_tracking UNUSED`
 */
export function norm_ptrs_achievement_tracking(d_achievement_tracking) {
    void d_achievement_tracking; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_book_info `:797–799` — empty no-op body.
 * @param {*} d_book_info C `struct book_info *d_book_info UNUSED`
 */
export function norm_ptrs_book_info(d_book_info) {
    void d_book_info; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_dig_info `:802–804` — empty no-op body.
 * @param {*} d_dig_info C `struct dig_info *d_dig_info UNUSED`
 */
export function norm_ptrs_dig_info(d_dig_info) {
    void d_dig_info; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_engrave_info `:807–809` — empty no-op body.
 * @param {*} d_engrave_info C `struct engrave_info *d_engrave_info UNUSED`
 */
export function norm_ptrs_engrave_info(d_engrave_info) {
    void d_engrave_info; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_obj_split `:812–814` — empty no-op body.
 * @param {*} d_obj_split C `struct obj_split *d_obj_split UNUSED`
 */
export function norm_ptrs_obj_split(d_obj_split) {
    void d_obj_split; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_polearm_info `:817–819` — empty no-op body.
 * @param {*} d_polearm_info C `struct polearm_info *d_polearm_info UNUSED`
 */
export function norm_ptrs_polearm_info(d_polearm_info) {
    void d_polearm_info; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_takeoff_info `:822–824` — empty no-op body.
 * @param {*} d_takeoff_info C `struct takeoff_info *d_takeoff_info UNUSED`
 */
export function norm_ptrs_takeoff_info(d_takeoff_info) {
    void d_takeoff_info; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_tin_info `:827–829` — empty no-op body.
 * @param {*} d_tin_info C `struct tin_info *d_tin_info UNUSED`
 */
export function norm_ptrs_tin_info(d_tin_info) {
    void d_tin_info; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_tribute_info `:832–834` — empty no-op body.
 * @param {*} d_tribute_info C `struct tribute_info *d_tribute_info UNUSED`
 */
export function norm_ptrs_tribute_info(d_tribute_info) {
    void d_tribute_info; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_victual_info `:837–839` — empty no-op body.
 * @param {*} d_victual_info C `struct victual_info *d_victual_info UNUSED`
 */
export function norm_ptrs_victual_info(d_victual_info) {
    void d_victual_info; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_warntype_info `:842–844` — empty no-op body.
 * @param {*} d_warntype_info C `struct warntype_info *d_warntype_info UNUSED`
 */
export function norm_ptrs_warntype_info(d_warntype_info) {
    void d_warntype_info; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_d_flags `:847–849` — empty no-op body.
 * @param {*} d_d_flags C `struct d_flags *d_d_flags UNUSED`
 */
export function norm_ptrs_d_flags(d_d_flags) {
    void d_d_flags; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_d_level `:852–854` — empty no-op body.
 * @param {*} d_d_level C `struct d_level *d_d_level UNUSED`
 */
export function norm_ptrs_d_level(d_d_level) {
    void d_d_level; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_damage `:857–859` — empty no-op body.
 * @param {*} d_damage C `struct damage *d_damage UNUSED`
 */
export function norm_ptrs_damage(d_damage) {
    void d_damage; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_dest_area `:862–864` — empty no-op body.
 * @param {*} d_dest_area C `struct dest_area *d_dest_area UNUSED`
 */
export function norm_ptrs_dest_area(d_dest_area) {
    void d_dest_area; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_dgn_topology `:867–869` — empty no-op body.
 * @param {*} d_dgn_topology C `struct dgn_topology *d_dgn_topology UNUSED`
 */
export function norm_ptrs_dgn_topology(d_dgn_topology) {
    void d_dgn_topology; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_dungeon `:872–874` — empty no-op body.
 * @param {*} d_dungeon C `struct dungeon *d_dungeon UNUSED`
 */
export function norm_ptrs_dungeon(d_dungeon) {
    void d_dungeon; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_ebones `:877–879` — empty no-op body.
 * @param {*} d_ebones C `struct ebones *d_ebones UNUSED`
 */
export function norm_ptrs_ebones(d_ebones) {
    void d_ebones; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_edog `:882–884` — empty no-op body.
 * @param {*} d_edog C `struct edog *d_edog UNUSED`
 */
export function norm_ptrs_edog(d_edog) {
    void d_edog; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_egd `:887–889` — empty no-op body.
 * @param {*} d_egd C `struct egd *d_egd UNUSED`
 */
export function norm_ptrs_egd(d_egd) {
    void d_egd; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_emin `:892–894` — empty no-op body.
 * @param {*} d_emin C `struct emin *d_emin UNUSED`
 */
export function norm_ptrs_emin(d_emin) {
    void d_emin; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_engr `:897–899` — empty no-op body.
 * @param {*} d_engr C `struct engr *d_engr UNUSED`
 */
export function norm_ptrs_engr(d_engr) {
    void d_engr; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_epri `:902–904` — empty no-op body.
 * @param {*} d_epri C `struct epri *d_epri UNUSED`
 */
export function norm_ptrs_epri(d_epri) {
    void d_epri; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_eshk `:907–909` — empty no-op body.
 * @param {*} d_eshk C `struct eshk *d_eshk UNUSED`
 */
export function norm_ptrs_eshk(d_eshk) {
    void d_eshk; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_fakecorridor `:912–914` — empty no-op body.
 * @param {*} d_fakecorridor C `struct fakecorridor *d_fakecorridor UNUSED`
 */
export function norm_ptrs_fakecorridor(d_fakecorridor) {
    void d_fakecorridor; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_fe `:917–919` — empty no-op body.
 * @param {*} d_fe C `struct fe *d_fe UNUSED`
 */
export function norm_ptrs_fe(d_fe) {
    void d_fe; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_flag `:922–924` — empty no-op body.
 * @param {*} d_flag C `struct flag *d_flag UNUSED`
 */
export function norm_ptrs_flag(d_flag) {
    void d_flag; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_fruit `:927–929` — empty no-op body.
 * @param {*} d_fruit C `struct fruit *d_fruit UNUSED`
 */
export function norm_ptrs_fruit(d_fruit) {
    void d_fruit; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_gamelog_line `:932–934` — empty no-op body.
 * @param {*} d_gamelog_line C `struct gamelog_line *d_gamelog_line UNUSED`
 */
export function norm_ptrs_gamelog_line(d_gamelog_line) {
    void d_gamelog_line; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_kinfo `:937–939` — empty no-op body.
 * @param {*} d_kinfo C `struct kinfo *d_kinfo UNUSED`
 */
export function norm_ptrs_kinfo(d_kinfo) {
    void d_kinfo; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_levelflags `:942–944` — empty no-op body.
 * @param {*} d_levelflags C `struct levelflags *d_levelflags UNUSED`
 */
export function norm_ptrs_levelflags(d_levelflags) {
    void d_levelflags; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_linfo `:947–949` — empty no-op body.
 * @param {*} d_linfo C `struct linfo *d_linfo UNUSED`
 */
export function norm_ptrs_linfo(d_linfo) {
    void d_linfo; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_ls_t `:952–954` — empty no-op body.
 * @param {*} d_ls_t C `struct ls_t *d_ls_t UNUSED`
 */
export function norm_ptrs_ls_t(d_ls_t) {
    void d_ls_t; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_mapseen_feat `:957–959` — empty no-op body.
 * @param {*} d_mapseen_feat C `struct mapseen_feat *d_mapseen_feat UNUSED`
 */
export function norm_ptrs_mapseen_feat(d_mapseen_feat) {
    void d_mapseen_feat; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_mapseen_flags `:962–964` — empty no-op body.
 * @param {*} d_mapseen_flags C `struct mapseen_flags *d_mapseen_flags UNUSED`
 */
export function norm_ptrs_mapseen_flags(d_mapseen_flags) {
    void d_mapseen_flags; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_mapseen_rooms `:967–969` — empty no-op body.
 * @param {*} d_mapseen_rooms C `struct mapseen_rooms *d_mapseen_rooms UNUSED`
 */
export function norm_ptrs_mapseen_rooms(d_mapseen_rooms) {
    void d_mapseen_rooms; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_mapseen `:972–974` — empty no-op body.
 * @param {*} d_mapseen C `struct mapseen *d_mapseen UNUSED`
 */
export function norm_ptrs_mapseen(d_mapseen) {
    void d_mapseen; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_mextra `:977–979` — empty no-op body.
 * @param {*} d_mextra C `struct mextra *d_mextra UNUSED`
 */
export function norm_ptrs_mextra(d_mextra) {
    void d_mextra; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_mkroom `:982–984` — empty no-op body.
 * @param {*} d_mkroom C `struct mkroom *d_mkroom UNUSED`
 */
export function norm_ptrs_mkroom(d_mkroom) {
    void d_mkroom; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_monst `:987–989` — empty no-op body.
 * @param {*} d_monst C `struct monst *d_monst UNUSED`
 */
export function norm_ptrs_monst(d_monst) {
    void d_monst; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_mvitals `:992–994` — empty no-op body.
 * @param {*} d_mvitals C `struct mvitals *d_mvitals UNUSED`
 */
export function norm_ptrs_mvitals(d_mvitals) {
    void d_mvitals; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_nhcoord `:997–999` — empty no-op body.
 * @param {*} d_nhcoord C `struct nhcoord *d_nhcoord UNUSED`
 */
export function norm_ptrs_nhcoord(d_nhcoord) {
    void d_nhcoord; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_nhrect `:1002–1004` — empty no-op body.
 * @param {*} d_nhrect C `struct nhrect *d_nhrect UNUSED`
 */
export function norm_ptrs_nhrect(d_nhrect) {
    void d_nhrect; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_novel_tracking `:1007–1009` — empty no-op body.
 * @param {*} d_novel_tracking C `struct novel_tracking *d_novel_tracking UNUSED`
 */
export function norm_ptrs_novel_tracking(d_novel_tracking) {
    void d_novel_tracking; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_obj `:1012–1014` — empty no-op body.
 * @param {*} d_obj C `struct obj *d_obj UNUSED`
 */
export function norm_ptrs_obj(d_obj) {
    void d_obj; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_objclass `:1017–1019` — empty no-op body.
 * @param {*} d_objclass C `struct objclass *d_objclass UNUSED`
 */
export function norm_ptrs_objclass(d_objclass) {
    void d_objclass; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_oextra `:1022–1024` — empty no-op body.
 * @param {*} d_oextra C `struct oextra *d_oextra UNUSED`
 */
export function norm_ptrs_oextra(d_oextra) {
    void d_oextra; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_prop `:1027–1029` — empty no-op body.
 * @param {*} d_prop C `struct prop *d_prop UNUSED`
 */
export function norm_ptrs_prop(d_prop) {
    void d_prop; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_q_score `:1032–1034` — empty no-op body.
 * @param {*} d_q_score C `struct q_score *d_q_score UNUSED`
 */
export function norm_ptrs_q_score(d_q_score) {
    void d_q_score; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_rm `:1037–1039` — empty no-op body.
 * @param {*} d_rm C `struct rm *d_rm UNUSED`
 */
export function norm_ptrs_rm(d_rm) {
    void d_rm; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_s_level `:1042–1044` — empty no-op body.
 * @param {*} d_s_level C `struct s_level *d_s_level UNUSED`
 */
export function norm_ptrs_s_level(d_s_level) {
    void d_s_level; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_skills `:1047–1049` — empty no-op body.
 * @param {*} d_skills C `struct skills *d_skills UNUSED`
 */
export function norm_ptrs_skills(d_skills) {
    void d_skills; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_spell `:1052–1054` — empty no-op body.
 * @param {*} d_spell C `struct spell *d_spell UNUSED`
 */
export function norm_ptrs_spell(d_spell) {
    void d_spell; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_stairway `:1057–1059` — empty no-op body.
 * @param {*} d_stairway C `struct stairway *d_stairway UNUSED`
 */
export function norm_ptrs_stairway(d_stairway) {
    void d_stairway; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_trap `:1062–1064` — empty no-op body.
 * @param {*} d_trap C `struct trap *d_trap UNUSED`
 */
export function norm_ptrs_trap(d_trap) {
    void d_trap; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_u_conduct `:1067–1069` — empty no-op body.
 * @param {*} d_u_conduct C `struct u_conduct *d_u_conduct UNUSED`
 */
export function norm_ptrs_u_conduct(d_u_conduct) {
    void d_u_conduct; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_u_event `:1072–1074` — empty no-op body.
 * @param {*} d_u_event C `struct u_event *d_u_event UNUSED`
 */
export function norm_ptrs_u_event(d_u_event) {
    void d_u_event; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_u_have `:1077–1079` — empty no-op body.
 * @param {*} d_u_have C `struct u_have *d_u_have UNUSED`
 */
export function norm_ptrs_u_have(d_u_have) {
    void d_u_have; // C UNUSED
}

/**
 * C ref: sfbase.c norm_ptrs_u_realtime `:1082–1084` — empty no-op body.
 * @param {*} d_u_realtime C `struct u_realtime *d_u_realtime UNUSED`
 */
export function norm_ptrs_u_realtime(d_u_realtime) {
    void d_u_realtime; // C UNUSED
}
