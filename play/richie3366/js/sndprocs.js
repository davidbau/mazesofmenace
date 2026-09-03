// sndprocs.js — sound_effect enum + Soundeffect / SetVoice / SoundSpeak
// from sndprocs.h.
// C ref: include/sndprocs.h Soundeffect / SetVoice / SoundSpeak;
// include/seffects.h X-macro. Contest recorder: no SND_LIB_*
// (extract-optlist SND_LIB_PORTAUDIO false) so those C macros are
// empty. Call sites still pass seid/vol / mon/tone/vol/moreinfo /
// spoken text.

export {
    se_scratching,
    se_alarm,
    se_blast,
    se_zero_invalid,
    number_of_se_entries,
} from './generated/seffects_data.js';

/**
 * C ref: sndprocs.h `enum voice_moreinfo` `:159–167`.
 * SetVoice moreinfo bits; contest !SND_LIB does not consume them.
 */
export const voice_nothing_special = 0;
export const voice_audioassistant = 0x0001;
export const voice_talking_artifact = 0x0002;
export const voice_deity = 0x0004;
export const voice_oracle = 0x0008;
export const voice_throne = 0x0010;
export const voice_death = 0x0020;

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

/**
 * C ref: sndprocs.h `#define SetVoice(mon, tone, vol, moreinfo)` when
 * !SND_LIB_INTEGRATED — empty (`:276`). The SND_LIB arm (`:249–252`)
 * would call `set_voice` (sounds.c); this build has no SND_LIB_*.
 * @param {object|null} mon
 * @param {number} tone
 * @param {number} vol
 * @param {number} moreinfo
 */
export function SetVoice(mon, tone, vol, moreinfo) {
    void mon;
    void tone;
    void vol;
    void moreinfo;
}

/**
 * C ref: sndprocs.h `#define SoundSpeak(text)` when
 * !SND_LIB_INTEGRATED — empty (`:275`). The SND_LIB arm (`:240–246`)
 * would call `sound_speak` (sounds.c) when PLINE_VERBALIZE|PLINE_SPEECH
 * and `iflags.voices`; this build has no SND_LIB_*. Caller:
 * `pline.c` `putmesg` `:79`.
 * @param {string|null|undefined} text
 */
export function SoundSpeak(text) {
    void text;
}
