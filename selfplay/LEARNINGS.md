# Selfplay Learnings

## 2026-02-14 - Dlvl1 Dog Engagement Tweak (C NetHack)

- Change: in `selfplay/brain/danger.js`, treat lone adjacent `d` (dog) on Dlvl 1 as a fight target when HP >= 45%, instead of default passive/avoid behavior.
- Why: repeated early deaths were caused by dog pressure while yielding tempo/space.
- Validation gate: C runner, seeds `1..10`, `1200` turns, `key-delay=0`.
- Baseline: average depth `2.000`, survived `6/10`.
- Candidate: average depth `2.000`, survived `7/10`.
- Net: +1 survival with no depth regression.

## 2026-02-15 - Pre-Dlvl4 Descent Guard (C NetHack)

- Change: in `selfplay/agent.js` `_shouldDescendStairs()`, added a transition guard for Dlvl 3 -> Dlvl 4:
  - if HP < 75% and no healing potions, do not descend yet.
- Why: Dlvl 4 transition was a recurring spike death point (notably gnome-lord pressure) with no upside from forcing early descent.
- Validation gate: C runner, seeds `1..10`, `1200` turns, `key-delay=0`.
- Baseline: average depth `2.000`, survived `7/10`.
- Candidate: average depth `2.000`, survived `8/10`.
- Net: +1 survival with no depth regression.

## 2026-02-15 - Dlvl1 Stair-Pressure Descent Relaxation (C NetHack)

- Change: in `selfplay/agent.js`:
  - `_shouldDescendStairs()`: when on Dlvl 1, allow descent even with `3+` nearby monsters if HP >= 70% and max nearby danger is below `HIGH`.
  - Stair-stall fallback: force descent earlier under repeated "surrounded by N monsters" blocks on Dlvl 1 (threshold from HP>=75% & 8 repeats to HP>=65% & 4 repeats).
- Why: early-floor stair stalls under low-tier monster pressure can consume many turns and convert into avoidable deaths.
- Validation gate: C runner, seeds `1..10`, `1200` turns, `key-delay=0`.
- Baseline (current main): average depth `2.000`, survived `8/10`.
- Candidate: average depth `2.100`, survived `8/10`.
- Net: +0.1 average depth with unchanged survival.
