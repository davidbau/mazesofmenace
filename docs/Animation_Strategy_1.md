# Animation Strategy 1

Goal: match NetHack C transient animation behavior (especially `tmp_at` + `nh_delay_output`) in core JS engine behavior, not via comparator exceptions.

## Plan
1. Build a C `tmp_at` parity module.
2. Route all projectile/beam visuals through it.
3. Integrate deterministic delay/output flush semantics.
4. Make replay/session capture aware of transient-frame boundaries.
5. Validate against targeted animation parity sessions and full suite.

## Architecture
1. `animation_core.js` (new)
- Provide a parity API for `tmp_at(mode, glyphOrPath, x, y, opts)` with C-compatible lifecycle states (start/update/backtrack/end).
- Maintain transient layers separate from persistent map state.
- Keep a deterministic frame queue with ordering and step tags.
- Ensure animation layer does not consume RNG.

2. Display split: base map + transient overlay
- In `js/display.js` and `js/headless.js`, render persistent map state first, then transient overlay.
- Support transient cleanup equivalent to `tmp_at(DISP_END, ...)`.
- Keep persistent object/monster/player placement rules unchanged.

3. Deterministic delay/flush abstraction
- Add `nh_delay_output()` parity behavior through `animation_core` with policy modes:
- `interactive`: real wall-clock delay.
- `replay/headless`: no wall-clock delay, but still emits boundary events.
- Add explicit flush hooks for `flush_screen`/`display_nhwindow` boundaries.

4. Call-site migration (C parity surface)
- Port throw/beam visual paths to `animation_core`:
- `js/mthrowu.js` (`m_throw`, return flight path).
- beam/zap modules (`buzz`-equivalent visuals).
- any remaining ad hoc transient display code.
- Preserve C order: transient draw -> hit/effects -> `stop_occupation`/interrupt side effects -> object placement -> transient cleanup.

5. Replay/capture boundary integration
- In `js/replay_core.js`, consume animation frame queue deterministically.
- Snapshot at semantic boundaries C produces around transient effects and interrupts.
- Keep comparator behavior unchanged; fix is in engine/replay timing.

6. Observability
- Add optional transient trace events for debugging:
- `^tmp_at_start`
- `^tmp_at_step[x,y,glyph]`
- `^tmp_at_end`
- `^delay_output`
- Keep disabled by default.

7. Test strategy
- Unit tests for `tmp_at` lifecycle and overlay precedence.
- Targeted parity sessions for animation-sensitive paths (e.g., thrown missile interrupt boundary).
- Full suite regression gate: pass count must not drop; RNG/event parity must remain stable.

8. Rollout strategy
- Phase A: introduce module + compatibility wrappers.
- Phase B: migrate throw path first.
- Phase C: migrate beam/zap paths.
- Phase D: remove legacy ad hoc transient rendering.
