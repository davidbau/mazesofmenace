// rumors.js -- Rumor/oracle text system, CapitalMon utility
// cf. rumors.c — getrumor, get_rnd_text, outrumor, outoracle, doconsult,
//                CapitalMon, save/restore_oracles
//
// Three subsystems:
// 1. Rumor file access: getrumor(), get_rnd_text(), get_rnd_line() [static],
//    init_rumors() [static], outrumor() (BY_ORACLE/BY_COOKIE/BY_PAPER display).
//    File format: header + index line ("%d,%ld,%lx;...") + xcrypt()-encrypted lines
//    padded to MD_PAD_RUMORS (60) chars by makedefs.
// 2. Oracle system: init_oracles(), outoracle(), doconsult(), save_oracles(),
//    restore_oracles(). Oracle text read from ORACLEFILE; multi-line records
//    separated by "---" lines; oracle_loc[] array of fseek offsets.
// 3. CapitalMon utility: CapitalMon(), init_CapMons(), free_CapMons().
//    Builds a list of non-unique monsters with capitalized names (Green-elf,
//    Archon, etc.) plus hallucinatory names from BOGUSMONFILE; used by the()
//    to decide whether to prepend "the".
//
// JS implementations:
//   unpadline()     → hacklib.unpadline() at hacklib.js:535 (exported, implemented)
//   init_rumors()   → hacklib.parseRumorsFile() at hacklib.js:564 (implemented;
//                     returns { trueTexts, trueLineBytes, trueSize, falseTexts,
//                     falseLineBytes, falseSize })
//   get_rnd_line()  → get_rnd_line_index() local fn in dungeon.js:2509 (implemented;
//                     returns array index instead of reading from file directly)
//   getrumor()      → logic inlined in random_engraving_rng() dungeon.js:2545
//                     (path B handles getrumor(0,buf,TRUE) with cookie exclusion)
//   get_rnd_text()  → partially: parseEncryptedDataFile for EPITAPHFILE (dungeon.js:2499)
//                     and direct get_rnd_line_index for ENGRAVEFILE (dungeon.js:2541);
//                     no general-purpose get_rnd_text() function in JS
//   save_oracles()  → N/A (JS has no save-file system)
//   restore_oracles() → N/A
//   outoracle()     → not implemented in JS
//   doconsult()     → not implemented in JS
//   CapitalMon()    → not implemented in JS
//   init_CapMons()  → N/A (no memory management; would use mons[] and rumor_data)
//   free_CapMons()  → N/A

// cf. rumors.c:67 [static] — unpadline(line): strip trailing underscore padding
// makedefs pads short rumors, epitaphs, engravings, and hallucinatory monster
// names with trailing '_' characters; this removes them.
// Also removes trailing newline if still present.
// JS equivalent: hacklib.unpadline() at hacklib.js:535.
// ALIGNED: rumors.c:67 — unpadline() ↔ hacklib.unpadline() (hacklib.js:535)

// cf. rumors.c:85 [static] — init_rumors(fp): parse rumors file header
// Reads two lines: "don't edit" comment + index line with format
//   "%d,%ld,%lx;%d,%ld,%lx;0,0,%lx"
//   = trueCount,trueSize,trueStart; falseCount,falseSize,falseStart; 0,0,eofOffset
// Stores true_rumor_{size,start,end} and false_rumor_{size,start,end} in globals.
// Sets true_rumor_size = -1L on parse failure and closes fp.
// JS equivalent: hacklib.parseRumorsFile() at hacklib.js:564.
// ALIGNED: rumors.c:85 — init_rumors() ↔ hacklib.parseRumorsFile() (hacklib.js:564)

// cf. rumors.c:420 [static] — get_rnd_line(fh, buf, bufsiz, rng, startpos, endpos, padlength)
// Picks a random byte offset within [startpos, endpos); reads rest of that partial line,
//   then reads the NEXT line (wrapping to startpos if at endpos/EOF).
// When padlength>0: retries up to 10× if strlen(buf) > padlength+1 (avoids uneven
//   selection probability from landing near a long line).
// Decrypts line via xcrypt(), then strips padding via unpadline().
// JS equivalent: get_rnd_line_index() local function in dungeon.js:2509.
//   JS version returns array index rather than reading from a file;
//   works on pre-parsed text arrays from parseRumorsFile/parseEncryptedDataFile.
// ALIGNED: rumors.c:420 — get_rnd_line() ↔ get_rnd_line_index() (dungeon.js:2509)

// cf. rumors.c:117 — getrumor(truth, rumor_buf, exclude_cookie): get random rumor
// truth: 1=true only, -1=false only, 0=either (adjusted by rn2(2): 0→false, 1→true).
// Opens RUMORFILE; calls init_rumors() on first use. Loops up to 50× discarding
//   lines starting with "[cookie] " marker when exclude_cookie=TRUE.
// After selection, strips "[cookie] " prefix when NOT excluding cookies
//   (fortune cookie context where the message text is read aloud).
// Non-cookie call also exercises A_WIS based on truth of the rumor.
// JS equivalent: logic inlined in dungeon.js:2545 inside random_engraving_rng().
//   Uses pre-parsed RUMOR_TRUE_TEXTS/RUMOR_FALSE_TEXTS arrays;
//   cookie exclusion loop matches C behavior (count<50, startsWith('[cookie] ')).
// TODO: rumors.c:117 — getrumor(): standalone JS function (currently inline only)

// cf. rumors.c:196 — rumor_check(): wizard-mode validation of rumors file
// Opens RUMORFILE; displays true/false section start+end byte offsets;
//   shows first two and last true/false rumors via putstr in a text window.
// Calls others_check() for ENGRAVEFILE, EPITAPHFILE, BOGUSMONFILE.
// TODO: rumors.c:196 — rumor_check(): wizard mode rumor file validator

// cf. rumors.c:308 [static] — others_check(ftype, fname, winptr): validate data file
// Wizard-mode helper: opens fname, reads header comment line, then reads
//   first two entries and scans to the last; displays in text window.
// Used by rumor_check() for engrave/epitaph/bogusmon files.
// TODO: rumors.c:308 — others_check(): wizard mode data-file validator

// cf. rumors.c:499 — get_rnd_text(fname, buf, rng, padlength): random line from data file
// Opens fname; skips "don't edit" comment; picks a random line via get_rnd_line()
//   from the entire file (startpos after header, endpos=0 for EOF).
// Used by: outrumor() for ENGRAVEFILE fallback, engrave.c for graffiti/epitaphs.
// JS equivalent: partially; dungeon.js uses parseEncryptedDataFile + get_rnd_line_index
//   for EPITAPHFILE (dungeon.js:2499) and ENGRAVEFILE (dungeon.js:2541-2543).
//   random_epitaph_text() at dungeon.js:2502 is the closest single-file analogue.
// TODO: rumors.c:499 — get_rnd_text(): general-purpose random text line reader

// cf. rumors.c:529 — outrumor(truth, mechanism): display a rumor to the player
// mechanism: BY_ORACLE=0, BY_COOKIE=1, BY_PAPER=2.
// BY_COOKIE/BY_PAPER: checks Blind (print fortune message, no reading);
//   calls getrumor(truth, buf, reading ? FALSE : TRUE).
// BY_ORACLE: uses verbalize1() + SetVoice(); random prefix ("offhandedly"/"casually"/etc).
// BY_COOKIE: prints fortune_msg ("This cookie has a scrap of paper inside.") + "It reads:".
// BY_PAPER: just "It reads:" then pline1(line).
// TODO: rumors.c:529 — outrumor(): rumor display for cookie/paper/oracle contexts

// cf. rumors.c:577 [static] — init_oracles(fp): parse oracle file header
// Reads "don't edit" comment + count line (decimal N), then N hex offset lines.
// Stores oracle_cnt and oracle_loc[] array of fseek offsets into ORACLEFILE.
// oracle_loc[0] is the "special" (first consult) oracle text.
// N/A for JS save/restore; oracle state not tracked in JS.
// TODO: rumors.c:577 — init_oracles(): oracle file offset table initialization

// cf. rumors.c:598 — save_oracles(nhfp): save oracle state to save file
// Writes oracle_cnt + oracle_loc[] array to save file.
// On release_data: zeroes oracle_cnt/oracle_flg, frees oracle_loc.
// N/A: JS has no save file system.
// N/A: rumors.c:598 — save_oracles()

// cf. rumors.c:623 — restore_oracles(nhfp): restore oracle state from save file
// Reads oracle_cnt; allocates oracle_loc[] and fills it; sets oracle_flg=1.
// N/A: JS has no save file system.
// N/A: rumors.c:623 — restore_oracles()

// cf. rumors.c:640 — outoracle(special, delphi): display oracle text
// special=TRUE: uses oracle_loc[0] (special first-consult oracle); removes that slot.
// special=FALSE: picks rnd(oracle_cnt-1) from oracle_loc[1..]; removes that slot.
// Seeks to offset, reads lines until "---\n" separator, puts in text window.
// delphi=TRUE: prints intro header ("The Oracle meditates..." or scornful gold message).
// delphi=FALSE: "The message reads:" (used for non-interactive oracle reads).
// oracle_flg: 0=not init'd, 1=init'd, -1=file open failed.
// TODO: rumors.c:640 — outoracle(): display multi-line oracle text

// cf. rumors.c:696 — doconsult(oracl): #chat with the Oracle monster
// Checks: oracl exists, is peaceful, player has gold.
// minor_cost=50 Au → outrumor(1, BY_ORACLE) (true rumor).
// major_cost=500+50*ulevel Au → outoracle(cheapskate, TRUE) (if full payment).
// Awards XP on first minor/major oracle (u.uevent.minor_oracle, .major_oracle).
// Both record ACH_ORCL achievement. Returns ECMD_OK (no time) or ECMD_TIME.
// TODO: rumors.c:696 — doconsult(): Oracle monster #chat handler

// cf. rumors.c:770 [static] — couldnt_open_file(filename): error for missing data file
// Calls impossible("Can't open '%s' file.", filename) with something_worth_saving=0
//   temporarily (to suppress irrelevant save-restore suggestion in error message).
// N/A: JS has no file I/O; data loaded from compiled-in JS constants.
// N/A: rumors.c:770 — couldnt_open_file()

// cf. rumors.c:791 — CapitalMon(word): check if word is a capitalized monster type name
// Returns TRUE if word begins uppercase AND matches a name in CapMons[] list.
// Matches full-word prefix: "Foo" matches "Foo", "Foo bar", "Foo's bar" but not "Foobar".
// Case-sensitive. Lazy-initializes CapMons[] via init_CapMons() on first call.
// Used by the() (in topten.c/do_name.c) to decide "the Archon" vs "an Archon".
// CapMons[] contains ~27 monster entries + ~20 hallucinatory entries.
// TODO: rumors.c:791 — CapitalMon(): capitalized monster name check for the()

// cf. rumors.c:829 [static] — init_CapMons(): build capitalized monster name list
// Two-pass: pass 1 counts applicable monsters; pass 2 fills CapMons[].
// Collects: non-unique monsters and unique-titles from mons[].pmnames[]
//   whose name starts uppercase (non-unique class name like Green-elf).
// Also collects from BOGUSMONFILE (hallucinatory names): uppercase names not
//   marked as personal names (bogon_is_pname); those are dupstr'd.
// CapMons[CapMonSiz-1] = NULL terminator.
// N/A: JS has no malloc; mons[] is a JS array; BOGUSMONFILE is compiled-in.
// TODO: rumors.c:829 — init_CapMons(): capitalized monster name list initialization

// cf. rumors.c:939 — free_CapMons(): release CapMons[] memory
// Frees dynamically allocated bogon entries (CapMonstCnt..CapMonSiz-2).
// Frees CapMons array itself; zeroes CapMonSiz.
// N/A: JS has garbage collection; no manual memory release needed.
// N/A: rumors.c:939 — free_CapMons()
