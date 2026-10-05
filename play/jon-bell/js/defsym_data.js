// @ts-nocheck
// defsym_data.js — defsyms[i].explanation for i in [0, MAXPCHARS), in idx order.
//
// C ref: include/sym.h:52-56 struct symdef { uchar sym; const char *explanation;
// uchar color; }, and src/drawing.c:64-69, which builds
// `const struct symdef defsyms[MAXPCHARS + 1]` by including include/defsym.h in
// PCHAR_DRAWING mode.  `explanation` is the PCHAR/PCHAR2 macro's `desc` argument.
//
// nethack-c-v5/upstream/include/defsym.h in PCHAR_DRAWING mode against a local
// mirror of drawing.c's defsyms[] initialiser and dumping
// and js/oc_name_data.js, zero hand-curation.  This is the 5.0 tree, NOT
// nethack-c/ (3.7).  MAXPCHARS == 105 in both, matching js/const.js:3.
//
// CROSS-CHECKED, because an off-by-one in a 105-entry table is invisible: the
// same dump's `sym` column agrees with js/symbols.js's independently
// hand-transcribed `defsyms_sym` array on all 105 indices, so this table's
// indexing is anchored to something already load-bearing elsewhere in the port.
//
// NOTE FOR CALLERS — DUPLICATES ARE REAL AND ORDER MATTERS.  Only 61 of the 105
// explanations are distinct.  "wall" appears at 1..11, "open door" at 13,14,
// "closed door" at 15,16, "engraving" at 21,24, "water" at 38,48, "lowered
// drawbridge" at 42,43, "raised drawbridge" at 44,45, and the 29 zap/explosion/
// swallow rows (74..85, 88..104) all carry the empty string "" (they are empty
// strings in C, not NULL — verified, so C's strcmp over them is well-defined).
// C resolves a name with a forward linear scan that stops at the FIRST match
// (sp_lev.c:2016-2019 create_monster's M_AP_FURNITURE arm; drawing.c:129-140
// def_char_is_furniture), so any lookup here MUST scan forward too.  A Map keyed
// by explanation would silently resolve "wall" to 11 instead of 1.
export const DEFSYM_EXPLANATION = [
    "stone", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall",
    "wall", "doorway", "open door", "open door", "closed door", "closed door", "iron bars",
    "tree", "floor of a room", "dark part of a room", "engraving", "corridor",
    "lit corridor", "engraving", "staircase up", "staircase down", "ladder up",
    "ladder down", "branch staircase up", "branch staircase down", "branch ladder up",
    "branch ladder down", "altar", "grave", "opulent throne", "sink", "fountain", "water",
    "ice", "molten lava", "wall of lava", "lowered drawbridge", "lowered drawbridge",
    "raised drawbridge", "raised drawbridge", "air", "cloud", "water", "arrow trap",
    "dart trap", "falling rock trap", "squeaky board", "bear trap", "land mine",
    "rolling boulder trap", "sleeping gas trap", "rust trap", "fire trap", "pit",
    "spiked pit", "hole", "trap door", "teleportation trap", "level teleporter",
    "magic portal", "web", "statue trap", "magic trap", "anti-magic field",
    "polymorph trap", "vibrating square", "trapped door", "trapped chest", "", "", "", "",
    "", "", "", "", "", "", "", "", "poison cloud", "valid position", "", "", "", "", "",
    "", "", "", "", "", "", "", "", "", "", "", ""
];
