// C sounds.c:617 cry_sound — cries used by egg hatchlings.
// Sound and monster class values follow monflag.h and defsym.h.
export function cry_sound(mon) {
    const data = mon.data;
    switch (data.msound) {
    case 9: return 'hiss';
    case 3:
    case 5: return 'growl';
    case 8: return 'chirp';
    case 10: return 'buzz';
    case 7: return 'screech';
    case 11: return 'grunt';
    case 21: return 'mumble';
    default: return data.mlet === 57 ? 'gurgle' : 'chitter';
    }
}
