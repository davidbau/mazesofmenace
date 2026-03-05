# Current Work: Gameplay Session Failure Analysis

**Baseline**: 3206/3234 tests pass (20 gameplay failures out of 34 sessions)
**Branch**: main
**Date**: 2026-03-04

## Recent Fixes (this session)
- trap.js: tx/ty coordinate standardization
- trap.js: seetrap(), squeak sound messages
- do_name.js: NUM_MGENDERS, pmname(), mon_pmname() auto-translation bugs
- pline.js: set_msg_xy() fix
- dogmove.js: droppables wielded-tool handling, linked-list inventories
- monmove.js: skip dochug for immobile/waiting monsters
- makemon.js: S_LEPRECHAUN always starts sleeping (C ref: makemon.c:1325)
- makemon.js: startSleeping for S_NYMPH, S_JABBERWOCK, ndemon, wumpus, eel, long worm
- makemon.js: STRAT_WAITFORU/STRAT_CLOSE/STRAT_APPEARMSG from mflags3 in finalize_creation
- makemon.js: MM_NOWAIT constant defined (0x00000002)
- monmove.js: dochug sleep handling — continue after wakeup instead of always returning
- monmove.js: STRAT_WAITFORU clearing when monster can see player or is hurt
- mon.js: check_gear_next_turn() bug fix: was 0x80000000, now correct 0x20000000 (I_SPECIAL)
- mon.js: I_SPECIAL check in movemon — monster spends turn equipping picked-up gear
- monmove.js: check_gear_next_turn() after monster floor pickup in maybeMonsterPickStuff

**Fixed this session**: seed312 (goblin picks up orcish helm at step 21, spends turn equipping at step 23)

**Fixed by upstream pull** (seed303, seed304, seed307, seed310, seed321):
- seed307: session rerecorded with updated fixture
- Others: upstream parity fixes

**Screen fixes (no pass count change)**: tutorial menu now renders at column 21 to match C:
- chargen.js: added blank + OPTIONS hint lines, removed leading space from prompt (C ref: options.c)
- windows.js buildMenuLines: id=null items (add_menu_str equivalent) render as raw text; added (end) footer
- windows.js end_menu: only auto-assign selector letters to selectable items (id !== null)

## Current Failure Categorization

### Group A: Dog movement chcnt divergences (~3 sessions)
rn2(1)=0 in JS (chcnt=0) vs rn2(3)=2 in C (chcnt=2) in dog_move position loop.
JS evaluates fewer equidistant positions than C.

Sessions: seed031, seed301, seed306

seed031 diverges at step=41, index=7347:
  JS: rn2(1)=0 @ dochug (monmove.js:847)
  C:  rn2(3)=2 @ dog_move(dogmove.c:1302) >mfndpos >dog_move >m_move
  Event: goal=(70,9) in JS vs goal=(71,10) in C

### Group B: Do_attack / combat divergences (1 session)
JS reaches dochug where C reaches do_attack (uhitm.c:473) — combat path difference.

Sessions: seed308

### Group C: Monster movement / mcalcmove divergences (3 sessions)
Sessions: seed032, seed033, seed311

seed032 at step=19: rn2(15) @ dochug vs rnd(2) @ next_ident (mkobj.c:522) - trap missile
seed033 at step=69: rnl(20) @ rhack vs rn2(12) @ mcalcmove(mon.c:1146)
seed311 at step=15: RNG divergence

### Group D: Level generation / sp_lev divergences (12 sessions)
Sessions: seed322-seed333 (wizard-mode level gen)

seed322 diverges at step=1. These are likely sp_lev/themerms differences.

### Group E: Other (1 session)
seed302

## Known Non-Gameplay Failures (pre-existing in upstream HEAD)

### Map tests: 4 failures (error:4)
seed306_map, seed306_maps_c, seed72_map, seed72_maps_c — all fail with
`_getShopItem is not a function`. Pre-existing issue in committed HEAD.
Root cause: circular import timing between makemon.js and shknam.js.

## Next Steps

1. Investigate dog_goal divergence in seed031 at step=41
   - JS goal=(70,9) vs C goal=(71,10)
   - Check dog_goal_obj selection and apport scoring
2. Investigate seed032/033/311 mcalcmove divergences
3. Investigate the wizard-mode level gen sessions (322+)
4. Investigate seed308 combat divergence
5. Fix _getShopItem null-safety in makemon.js set_mimic_sym (low priority)
