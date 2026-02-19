# C Harness ubirthday Determinism Checkpoint (2026-02-19)

## Summary

- Added C harness patch `test/comparison/c-harness/patches/011-fix-ubirthday-with-getnow.patch`.
- Patch changes `u_init.c` to set:
  - `ubirthday = getnow();`
- This routes `ubirthday` through the same fixed datetime path used by replay
  harness runs (`NETHACK_FIXED_DATETIME`), removing wall-clock variance from
  shopkeeper naming (`nameshk()`).

## Why this matters

- `nameshk()` mixes `ubirthday` into shopkeeper-name selection.
- Prior behavior used `time(&ubirthday)`, so identical seed/replay keys could
  yield different shop names at different real-world times.
- That made strict session fixtures unstable over time.

## Verification

Commands:

```bash
bash test/comparison/c-harness/setup.sh
python3 -u test/comparison/c-harness/capture_step_snapshot.py \
  test/comparison/sessions/seed5_gnomish_mines_gameplay.session.json \
  360 /tmp/seed5_step360_c.json
python3 -u test/comparison/c-harness/capture_step_snapshot.py \
  test/comparison/sessions/seed5_gnomish_mines_gameplay.session.json \
  360 /tmp/seed5_step360_e.json
```

Observed:

- Both captures are byte-identical (`cmp` exit 0).
- Both runs show the same greeting token in `preSnapshotScreen`:
  - `Welcome to Enniscorthy's rare books!`

## Follow-up

- Regenerate any legacy fixtures that still contain shop-name tokens captured
  before deterministic `ubirthday` routing.
