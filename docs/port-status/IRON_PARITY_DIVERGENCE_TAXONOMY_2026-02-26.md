# Iron Parity Failing-Session Taxonomy (2026-02-26)

Derived from failed-gameplay replay JSON on commit `fab2d92f`.

## Top First-RNG-Divergence Origins (JS)

| Origin (`function(file:line)`) | Count |
|---|---:|
| `mcalcmove(mon.js:131)` | 2 |
| `enexto_core(makemon.js:1732)` | 2 |
| `distfleeck(monmove.js:220)` | 2 |
| `trquan(u_init.js:606)` | 1 |
| `set_apparxy(monmove.js:1527)` | 1 |
| `mktrap(dungeon.js:2362)` | 1 |
| `mkobj(mkobj.js:935)` | 1 |
| `m_move(monmove.js:1359)` | 1 |
| `getbones(bones.js:271)` | 1 |
| `get_location(sp_lev.js:2481)` | 1 |
| `exercise(attrib_exercise.js:34)` | 1 |
| `dog_move(dogmove.js:1341)` | 1 |
| `dog_move(dogmove.js:1011)` | 1 |
| `dochug(monmove.js:908)` | 1 |
| `d(rng.js:268)` | 1 |

## High-Frequency Clusters (Issue Targets)

1. `mcalcmove(mon.js:131)` (2 sessions)
2. `enexto_core(makemon.js:1732)` (2 sessions)
3. `distfleeck(monmove.js:220)` (2 sessions)

## Per-Session First RNG Divergence

| Session | Step | JS origin | C origin |
|---|---:|---|---|
| seed103_caveman_selfplay200_gameplay.session.json | 56 | `exercise(attrib_exercise.js:34) ` | `passive(uhitm.c:5997)` |
| seed108_ranger_selfplay200_gameplay.session.json | 183 | `set_apparxy(monmove.js:1527) ` | `m_move(monmove.c:1966)` |
| seed109_rogue_selfplay200_gameplay.session.json | 57 | `dog_move(dogmove.js:1341) ` | `dog_goal(dogmove.c:570)` |
| seed110_samurai_selfplay200_gameplay.session.json | 122 | `mcalcmove(mon.js:131) ` | `m_move(monmove.c:1966)` |
| seed201_archeologist_wizard_gameplay.session.json | 227 | `distfleeck(monmove.js:220) ` | `mdig_tunnel(dig.c:1418)` |
| seed203_caveman_wizard_gameplay.session.json | 214 | `m_move(monmove.js:1359) ` | `distfleeck(monmove.c:539)` |
| seed204_healer_wizard_gameplay.session.json | 212 | `mkobj(mkobj.js:935) ` | `peace_minded(makemon.c:2300)` |
| seed205_knight_wizard_gameplay.session.json | 1 | `trquan(u_init.js:606) ` | `peace_minded(makemon.c:2300)` |
| seed206_monk_wizard_gameplay.session.json | 209 | `get_location(sp_lev.js:2481) ` | `hole_destination(trap.c:450)` |
| seed207_priest_wizard_gameplay.session.json | 229 | `mcalcmove(mon.js:131) ` | `create_gas_cloud(region.c:1303)` |
| seed208_ranger_wizard_gameplay.session.json | 195 | `enexto_core(makemon.js:1732) ` | `next_ident(mkobj.c:522)` |
| seed209_rogue_wizard_gameplay.session.json | 232 | `dog_move(dogmove.js:1011) ` | `obj_resists(zap.c:1467)` |
| seed210_samurai_wizard_gameplay.session.json | 222 | `getbones(bones.js:271) ` | `distfleeck(monmove.c:539)` |
| seed211_tourist_wizard_gameplay.session.json | 281 | `enexto_core(makemon.js:1732) ` | `next_ident(mkobj.c:522)` |
| seed212_valkyrie_wizard_gameplay.session.json | 231 | `distfleeck(monmove.js:220) ` | `m_move(monmove.c:1894)` |
| seed5_gnomish_mines_gameplay.session.json | 357 | `d(rng.js:268) ` | `distfleeck(monmove.c:539)` |
| seed6_tourist_gameplay.session.json | 200 | `dochug(monmove.js:908) ` | `obj_resists(zap.c:1467)` |
| seed8_tutorial_manual_gameplay.session.json | 1 | `mktrap(dungeon.js:2362) ` | `mktrap(mklev.c:2133)` |
