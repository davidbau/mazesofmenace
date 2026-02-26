# Iron Parity Baseline (2026-02-26)

Captured on commit `fab2d92f` at `2026-02-26 10:13:29Z`.

## Commands

`./scripts/run-session-tests.sh`
`node test/comparison/session_test_runner.js --failed --verbose`

## Full Session Summary

- Total sessions: 204
- Passed: 186
- Failed: 18

## Gameplay Parity Summary

- Gameplay sessions: 43
- RNG full parity: 25/43
- Event full parity: 25/43
- RNG full but events not: 0
- Events full but RNG not: 0

## Failing Gameplay Sessions

| Session | RNG matched/total | Events matched/total | Screens matched/total |
|---|---:|---:|---:|
| seed103_caveman_selfplay200_gameplay.session.json | 5160/10611 | 803/2710 | 55/200 |
| seed108_ranger_selfplay200_gameplay.session.json | 12480/13294 | 2517/2830 | 179/200 |
| seed109_rogue_selfplay200_gameplay.session.json | 5722/12274 | 966/3690 | 59/200 |
| seed110_samurai_selfplay200_gameplay.session.json | 5296/5976 | 1079/1458 | 105/200 |
| seed201_archeologist_wizard_gameplay.session.json | 9415/20161 | 1343/10591 | 227/335 |
| seed203_caveman_wizard_gameplay.session.json | 5471/11685 | 90/5138 | 210/336 |
| seed204_healer_wizard_gameplay.session.json | 8777/10738 | 68/1733 | 234/358 |
| seed205_knight_wizard_gameplay.session.json | 2924/8525 | 28/1114 | 0/190 |
| seed206_monk_wizard_gameplay.session.json | 3212/15707 | 56/5130 | 208/338 |
| seed207_priest_wizard_gameplay.session.json | 7775/15909 | 93/7225 | 229/371 |
| seed208_ranger_wizard_gameplay.session.json | 6068/19017 | 131/8273 | 194/324 |
| seed209_rogue_wizard_gameplay.session.json | 2894/5695 | 39/1157 | 212/348 |
| seed210_samurai_wizard_gameplay.session.json | 2901/11207 | 48/4196 | 221/380 |
| seed211_tourist_wizard_gameplay.session.json | 5489/13137 | 34/4352 | 194/404 |
| seed212_valkyrie_wizard_gameplay.session.json | 5953/6666 | 128/293 | 230/372 |
| seed5_gnomish_mines_gameplay.session.json | 17271/38041 | 2148/16466 | 353/2727 |
| seed6_tourist_gameplay.session.json | 3334/14276 | 220/5951 | 37/1284 |
| seed8_tutorial_manual_gameplay.session.json | 2417/6659 | 274/2859 | 2/1026 |
