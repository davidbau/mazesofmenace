// sndprocs.js — sound_effect enum + Soundeffect from sndprocs.h.
// C ref: include/sndprocs.h Soundeffect; include/seffects.h X-macro.
// Contest recorder: no SND_LIB_* (extract-optlist SND_LIB_PORTAUDIO
// false) so the C macro is empty. Call sites still pass seid/vol.

export {
    se_scratching,
    se_zero_invalid,
    number_of_se_entries,
} from './generated/seffects_data.js';

/**
 * C ref: sndprocs.h `#define Soundeffect(seid, vol)` when
 * !SND_LIB_INTEGRATED — empty. Arguments at revive_corpse are
 * constants (`se_scratching`, 50); no RNG.
 * @param {number} seid
 * @param {number} vol
 */
export function Soundeffect(seid, vol) {
    void seid;
    void vol;
}
