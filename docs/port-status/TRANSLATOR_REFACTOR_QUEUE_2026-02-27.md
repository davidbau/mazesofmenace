# Translator Refactor Queue (2026-02-27)

Generated from `/tmp/translator-refactor-queue-gapwave2-fix4.json` after safety+stitch dry-run.

- Total tasks: 1177
- add_missing_call_binding: 458
- add_missing_identifier: 715
- signature_refactor: 4

## Top Modules
- `js/shk.js`: 236
- `js/invent.js`: 189
- `js/do.js`: 142
- `js/mkobj.js`: 134
- `js/apply.js`: 111
- `js/spell.js`: 99
- `js/steal.js`: 61
- `js/detect.js`: 42
- `js/engrave.js`: 38
- `js/fountain.js`: 38
- `js/lock.js`: 29
- `js/attrib.js`: 23
- `js/sounds.js`: 23
- `js/bones.js`: 12

## First Actionable Slice
- `add_missing_identifier` js/apply.js::do_blinding_ray (FLASHED_LIGHT)
- `add_missing_identifier` js/apply.js::do_blinding_ray (bhit)
- `add_missing_identifier` js/apply.js::do_blinding_ray (flash_hits_mon)
- `add_missing_identifier` js/apply.js::do_blinding_ray (see_monster_closeup)
- `add_missing_identifier` js/apply.js::do_blinding_ray (transient_light_cleanup)
- `add_missing_call_binding` js/apply.js::do_blinding_ray (bhit)
- `add_missing_call_binding` js/apply.js::do_blinding_ray (flash_hits_mon)
- `add_missing_call_binding` js/apply.js::do_blinding_ray (see_monster_closeup)
- `add_missing_call_binding` js/apply.js::do_blinding_ray (transient_light_cleanup)
- `add_missing_identifier` js/apply.js::um_dist (abs)
- `add_missing_call_binding` js/apply.js::um_dist (abs)
- `add_missing_identifier` js/apply.js::o_unleash (fmon)
- `add_missing_identifier` js/apply.js::o_unleash (update_inventory)
- `add_missing_call_binding` js/apply.js::o_unleash (update_inventory)
- `add_missing_identifier` js/apply.js::m_unleash (canseemon)
- `add_missing_identifier` js/apply.js::m_unleash (get_mleash)
- `add_missing_identifier` js/apply.js::m_unleash (mhis)
- `add_missing_identifier` js/apply.js::m_unleash (update_inventory)
- `add_missing_call_binding` js/apply.js::m_unleash (canseemon)
- `add_missing_call_binding` js/apply.js::m_unleash (get_mleash)
- `add_missing_call_binding` js/apply.js::m_unleash (mhis)
- `add_missing_call_binding` js/apply.js::m_unleash (update_inventory)
- `add_missing_identifier` js/apply.js::next_to_u (get_iter_mons)
- `add_missing_identifier` js/apply.js::next_to_u (mon_has_amulet)
- `add_missing_call_binding` js/apply.js::next_to_u (get_iter_mons)
