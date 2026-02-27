# Translator Refactor Queue (2026-02-27)

Generated from `/tmp/translator-refactor-queue-gapwave2-v4.json` after safety+stitch dry-run.

- Total tasks: 1466
- add_missing_call_binding: 482
- add_missing_identifier: 918
- signature_refactor: 2
- syntax_emit_fix: 64

## Top Modules
- `js/shk.js`: 300
- `js/invent.js`: 221
- `js/do.js`: 179
- `js/mkobj.js`: 141
- `js/apply.js`: 128
- `js/spell.js`: 125
- `js/detect.js`: 67
- `js/sounds.js`: 66
- `js/steal.js`: 65
- `js/engrave.js`: 46
- `js/fountain.js`: 43
- `js/attrib.js`: 39
- `js/lock.js`: 32
- `js/bones.js`: 13
- `js/exper.js`: 1

## First Actionable Slice
- `add_missing_identifier` js/apply.js::do_blinding_ray (FLASHED_LIGHT)
- `add_missing_identifier` js/apply.js::do_blinding_ray (MONST_P)
- `add_missing_identifier` js/apply.js::do_blinding_ray (OBJ_P)
- `add_missing_identifier` js/apply.js::do_blinding_ray (bhit)
- `add_missing_identifier` js/apply.js::do_blinding_ray (flash_hits_mon)
- `add_missing_identifier` js/apply.js::do_blinding_ray (see_monster_closeup)
- `add_missing_identifier` js/apply.js::do_blinding_ray (transient_light_cleanup)
- `add_missing_call_binding` js/apply.js::do_blinding_ray (bhit)
- `add_missing_call_binding` js/apply.js::do_blinding_ray (flash_hits_mon)
- `add_missing_call_binding` js/apply.js::do_blinding_ray (see_monster_closeup)
- `add_missing_call_binding` js/apply.js::do_blinding_ray (transient_light_cleanup)
- `syntax_emit_fix` js/apply.js::do_blinding_ray (/tmp/tmpujgbsvgb.mjs:3 SyntaxError: missing ) after argument list)
- `add_missing_identifier` js/apply.js::um_dist (abs)
- `add_missing_call_binding` js/apply.js::um_dist (abs)
- `add_missing_identifier` js/apply.js::o_unleash (fmon)
- `add_missing_identifier` js/apply.js::o_unleash (update_inventory)
- `add_missing_call_binding` js/apply.js::o_unleash (update_inventory)
- `syntax_emit_fix` js/apply.js::o_unleash (/tmp/tmpcyewsa4g.mjs:5 SyntaxError: Unexpected identifier 'otmp')
- `add_missing_identifier` js/apply.js::m_unleash (canseemon)
- `add_missing_identifier` js/apply.js::m_unleash (get_mleash)
- `add_missing_identifier` js/apply.js::m_unleash (mhis)
- `add_missing_identifier` js/apply.js::m_unleash (otmp)
- `add_missing_identifier` js/apply.js::m_unleash (update_inventory)
- `add_missing_call_binding` js/apply.js::m_unleash (canseemon)
- `add_missing_call_binding` js/apply.js::m_unleash (get_mleash)
