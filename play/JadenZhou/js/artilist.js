// artilist.js — artifact numbers.
// C ref: include/hack.h enum artifacts_nums (the ARTI_ENUM expansion of
//        include/artilist.h) and enum misc_arti_nums.
//
// Only the enum is here; the artilist[] table itself (artifact.c) is not
// ported yet. The numbers follow artilist.h entry for entry, skipping the
// "#if 0" OBSOLETE Palantir entry exactly as the C build does.

import { strncmpi, strcmpi } from './hacklib.js';

export const ART_NONARTIFACT = 0;
export const ART_EXCALIBUR = 1;
export const ART_STORMBRINGER = 2;
export const ART_MJOLLNIR = 3;
export const ART_CLEAVER = 4;
export const ART_GRIMTOOTH = 5;
export const ART_ORCRIST = 6;
export const ART_STING = 7;
export const ART_MAGICBANE = 8;
export const ART_FROST_BRAND = 9;
export const ART_FIRE_BRAND = 10;
export const ART_DRAGONBANE = 11;
export const ART_DEMONBANE = 12;
export const ART_WEREBANE = 13;
export const ART_GRAYSWANDIR = 14;
export const ART_GIANTSLAYER = 15;
export const ART_OGRESMASHER = 16;
export const ART_TROLLSBANE = 17;
export const ART_VORPAL_BLADE = 18;
export const ART_SNICKERSNEE = 19;
export const ART_SUNSWORD = 20;
export const ART_ORB_OF_DETECTION = 21;
export const ART_HEART_OF_AHRIMAN = 22;
export const ART_SCEPTRE_OF_MIGHT = 23;
export const ART_STAFF_OF_AESCULAPIUS = 24;
export const ART_MAGIC_MIRROR_OF_MERLIN = 25;
export const ART_EYES_OF_THE_OVERWORLD = 26;
export const ART_MITRE_OF_HOLINESS = 27;
export const ART_LONGBOW_OF_DIANA = 28;
export const ART_MASTER_KEY_OF_THIEVERY = 29;
export const ART_TSURUGI_OF_MURAMASA = 30;
export const ART_YENDORIAN_EXPRESS_CARD = 31;
export const ART_ORB_OF_FATE = 32;
export const ART_EYE_OF_THE_AETHIOPICA = 33;
export const AFTER_LAST_ARTIFACT = 34;
export const NROFARTIFACTS = (AFTER_LAST_ARTIFACT - 1);

// C ref: include/artilist.h -- the A() name of each artilist[] entry,
// indexed by artifact number (entry 0 is the dummy terminator slot)
const artiname = [
    "",
    "Excalibur", "Stormbringer", "Mjollnir", "Cleaver", "Grimtooth",
    "Orcrist", "Sting", "Magicbane", "Frost Brand", "Fire Brand",
    "Dragonbane", "Demonbane", "Werebane", "Grayswandir", "Giantslayer",
    "Ogresmasher", "Trollsbane", "Vorpal Blade", "Snickersnee", "Sunsword",
    "The Orb of Detection", "The Heart of Ahriman", "The Sceptre of Might",
    "The Staff of Aesculapius", "The Magic Mirror of Merlin",
    "The Eyes of the Overworld", "The Mitre of Holiness",
    "The Longbow of Diana", "The Master Key of Thievery",
    "The Tsurugi of Muramasa", "The Platinum Yendorian Express Card",
    "The Orb of Fate", "The Eye of the Aethiopica",
];

// C ref: artifact.c artifact_name() -- the otyp_p output and the fuzzy
// match are not ported yet
export function artifact_name(name, otyp_p, fuzzy) {
    if (otyp_p || fuzzy)
        throw new Error('artifact_name(): otyp_p/fuzzy matching is not ported yet');

    if (!strncmpi(name, "the ", 4))
        name = name.slice(4);

    for (let a = 1; a < AFTER_LAST_ARTIFACT; a++) {
        let aname = artiname[a];
        if (!strncmpi(aname, "the ", 4))
            aname = aname.slice(4);
        if (!strcmpi(name, aname))
            return artiname[a];
    }

    return null;
}
