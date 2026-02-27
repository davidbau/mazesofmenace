# Translator Refactor Queue (2026-02-27)

Generated from `/tmp/translator-refactor-queue-gapwave2-fix6b.json` after safety+stitch dry-run.

- Total tasks: 718
- add_missing_call_binding: 16
- add_missing_identifier: 691
- rename_alias: 11

## Top Modules
- `js/shk.js`: 137
- `js/invent.js`: 122
- `js/do.js`: 87
- `js/mkobj.js`: 78
- `js/apply.js`: 72
- `js/spell.js`: 61
- `js/steal.js`: 33
- `js/detect.js`: 27
- `js/engrave.js`: 25
- `js/fountain.js`: 22
- `js/lock.js`: 18
- `js/attrib.js`: 15
- `js/sounds.js`: 12
- `js/bones.js`: 8
- `js/exper.js`: 1

## Alias Renames (Auto-caught)
- `js/apply.js::snuff_candle`: `Is_candle->isCandle`
- `js/attrib.js::restore_attrib`: `ACURR->acurr`
- `js/attrib.js::restore_attrib`: `A_MAX->AMAX`
- `js/attrib.js::acurrstr`: `ACURR->acurr`
- `js/do.js::revive_mon`: `REVIVE_MON->revive_mon`
- `js/invent.js::addinv_core2`: `observe_object->observeObject`
- `js/invent.js::fully_identify_obj`: `observe_object->observeObject`
- `js/lock.js::stumble_on_door_mimic`: `m_at->mat`
- `js/shk.js::shopper_financial_report`: `inside_shop->insideShop`
- `js/shk.js::shkcatch`: `inside_shop->insideShop`
- `js/shk.js::price_quote`: `inside_shop->insideShop`

## First Actionable Slice
- `add_missing_identifier` js/apply.js::do_blinding_ray (FLASHED_LIGHT)
- `add_missing_identifier` js/apply.js::do_blinding_ray (bhit)
- `add_missing_identifier` js/apply.js::do_blinding_ray (flash_hits_mon)
- `add_missing_identifier` js/apply.js::do_blinding_ray (see_monster_closeup)
- `add_missing_identifier` js/apply.js::do_blinding_ray (transient_light_cleanup)
- `add_missing_call_binding` js/apply.js::um_dist (abs)
- `add_missing_identifier` js/apply.js::o_unleash (fmon)
- `add_missing_identifier` js/apply.js::o_unleash (update_inventory)
- `add_missing_identifier` js/apply.js::m_unleash (canseemon)
- `add_missing_identifier` js/apply.js::m_unleash (get_mleash)
- `add_missing_identifier` js/apply.js::m_unleash (mhis)
- `add_missing_identifier` js/apply.js::m_unleash (update_inventory)
- `add_missing_identifier` js/apply.js::next_to_u (get_iter_mons)
- `add_missing_identifier` js/apply.js::next_to_u (mon_has_amulet)
- `rename_alias` js/apply.js::snuff_candle (Is_candle->isCandle)
- `add_missing_identifier` js/apply.js::snuff_candle (Blind)
- `add_missing_identifier` js/apply.js::snuff_candle (OBJ_MINVENT)
- `add_missing_identifier` js/apply.js::snuff_candle (Shk_Your)
- `add_missing_identifier` js/apply.js::snuff_candle (cansee)
- `add_missing_identifier` js/apply.js::snuff_candle (get_obj_location)
- `add_missing_call_binding` js/apply.js::snuff_candle (Is_candle)
- `add_missing_identifier` js/apply.js::splash_lit (Blind)
- `add_missing_identifier` js/apply.js::splash_lit (Deaf)
- `add_missing_identifier` js/apply.js::splash_lit (Flying)
- `add_missing_identifier` js/apply.js::splash_lit (Is_waterlevel)
