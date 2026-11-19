// quest_lua.js — hand port of dat/quest.lua, the quest and common pager
// texts com_pager_core() looks up.
// C ref: dat/quest.lua
//
// The chunk only defines the questtext table; it rolls no dice. Ported so
// far: questtext.common.legacy and questtext.common.pauper_legacy (shown
// at game start). The role quest sections, msg_fallbacks and the other
// common messages are not ported yet.

// C ref: dat/quest.lua (top-level chunk)
export function quest_lua(L) {
    const G = L.globals;

    G.questtext = {
        common: {
            legacy: {
                synopsis: "[%dC has chosen you to recover the Amulet of Yendor for %dI.]",
                output: "menu",
                text: `It is written in the Book of %d:

    After the Creation, the cruel god Moloch rebelled
    against the authority of Marduk the Creator.
    Moloch stole from Marduk the most powerful of all
    the artifacts of the gods, the Amulet of Yendor,
    and he hid it in the dark cavities of Gehennom, the
    Under World, where he now lurks, and bides his time.

Your %G %d seeks to possess the Amulet, and with it
to gain deserved ascendance over the other gods.

You, a newly trained %r, have been heralded
from birth as the instrument of %d.  You are destined
to recover the Amulet for your deity, or die in the
attempt.  Your hour of destiny has come.  For the sake
of us all:  Go bravely with %d!`,
            },
            // -- starting with 'pauper' option set, last paragraph differs
            // from normal legacy
            pauper_legacy: {
                synopsis: "[%dC has chosen you to recover the Amulet of Yendor for %dI.]",
                output: "menu",
                text: `It is written in the Book of %d:

    After the Creation, the cruel god Moloch rebelled
    against the authority of Marduk the Creator.
    Moloch stole from Marduk the most powerful of all
    the artifacts of the gods, the Amulet of Yendor,
    and he hid it in the dark cavities of Gehennom, the
    Under World, where he now lurks, and bides his time.

Your %G %d seeks to possess the Amulet, and with it
to gain deserved ascendance over the other gods.

You, an untrained %r, have been unable to adequately
prepare to be the instrument of %d.  Nevertheless, you
are destined to recover the Amulet for your deity, or die
in the attempt.  Your hour of destiny has come.  For the
sake of us all:  Go bravely with %d!`,
            },
        },
    };
}
