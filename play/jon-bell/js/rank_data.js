// @ts-nocheck
/* rank_data.js — roles[] name + rank-title table, and botl.c's rank_of().
 *
 * C ref: nethack-c-v5/upstream/src/role.c "const struct Role roles[NUM_ROLES+1]"
 * (each entry opens with { name.m, name.f } then rank[9] of { m, f }), plus
 * botl.c:298 xlev_to_rank and botl.c:330 rank_of.
 *
 * GENERATED THROUGH THE C PREPROCESSOR, not by reading the file.  role.c ships
 * the Ranger's rank list TWICE: an elvish set (Edhel / Ohtar / Kano / Arandur
 * ...) inside "#if 0 /* OBSOLETE *\/" at role.c:360-369, and the live English
 * one (Tenderfoot / Lookout / Trailblazer ...) after the #endif.  A
 * strip-comments-and-regex extraction takes the DEAD arm — this one did, on its
 * first run — so the roles[] declaration is cut out verbatim and run through
 * cpp -P before anything parses it.  That is the only conditional inside the
 * table, so cpp needs no -D flags and no include path.
 *
 * WHY THIS FILE EXISTS.  Three copies of this table were live at once:
 *   - js/com_pager.js _CP_ROLE_RANKS — correct, but sourced from the 3.7 tree
 *     per its own header, and reachable only from the status line;
 *   - js/cmd.js _enl_rank_of — ONE role (Wizard) inline, whose list contained
 *     "Prestidigitator", a title in neither the 5.0 nor the 3.7 role.c, with
 *     xlev_to_rank written as (lev - 1) / 3 against C's (lev + 2) / 4.  The
 *     other twelve roles fell through to the bare role name, which is not just
 *     a wrong word but a different sentence: insight.c:513 drops the role from
 *     "You are <rank>, a level N <race> <role>." only when rank == role.
 *   - js/display.js, per the com_pager header's "mirrored from display.js".
 *
 * bothGenders is (allow & ROLE_GENDMASK) == (ROLE_MALE | ROLE_FEMALE), read
 * off the same preprocessed text.  Only the Valkyrie is false, and
 * insight.c:487 uses it together with name.f to decide whether the role line
 * says "a level 1 FEMALE human Monk" or just "a level 1 human Valkyrie".
 *
 * Order is roles[] order — the role index used elsewhere in js/ (Rogue 7,
 * Ranger 8, Samurai 9).
 */
export const ROLE_RANKS = [
    { name: ["Archeologist", null], bothGenders: true,
      rank: [["Digger", null],
             ["Field Worker", null],
             ["Investigator", null],
             ["Exhumer", null],
             ["Excavator", null],
             ["Spelunker", null],
             ["Speleologist", null],
             ["Collector", null],
             ["Curator", null]] },
    { name: ["Barbarian", null], bothGenders: true,
      rank: [["Plunderer", "Plunderess"],
             ["Pillager", null],
             ["Bandit", null],
             ["Brigand", null],
             ["Raider", null],
             ["Reaver", null],
             ["Slayer", null],
             ["Chieftain", "Chieftainess"],
             ["Conqueror", "Conqueress"]] },
    { name: ["Caveman", "Cavewoman"], bothGenders: true,
      rank: [["Troglodyte", null],
             ["Aborigine", null],
             ["Wanderer", null],
             ["Vagrant", null],
             ["Wayfarer", null],
             ["Roamer", null],
             ["Nomad", null],
             ["Rover", null],
             ["Pioneer", null]] },
    { name: ["Healer", null], bothGenders: true,
      rank: [["Rhizotomist", null],
             ["Empiric", null],
             ["Embalmer", null],
             ["Dresser", null],
             ["Medicus ossium", "Medica ossium"],
             ["Herbalist", null],
             ["Magister", "Magistra"],
             ["Physician", null],
             ["Chirurgeon", null]] },
    { name: ["Knight", null], bothGenders: true,
      rank: [["Gallant", null],
             ["Esquire", null],
             ["Bachelor", null],
             ["Sergeant", null],
             ["Knight", null],
             ["Banneret", null],
             ["Chevalier", "Chevaliere"],
             ["Seignieur", "Dame"],
             ["Paladin", null]] },
    { name: ["Monk", null], bothGenders: true,
      rank: [["Candidate", null],
             ["Novice", null],
             ["Initiate", null],
             ["Student of Stones", null],
             ["Student of Waters", null],
             ["Student of Metals", null],
             ["Student of Winds", null],
             ["Student of Fire", null],
             ["Master", null]] },
    { name: ["Priest", "Priestess"], bothGenders: true,
      rank: [["Aspirant", null],
             ["Acolyte", null],
             ["Adept", null],
             ["Priest", "Priestess"],
             ["Curate", null],
             ["Canon", "Canoness"],
             ["Lama", null],
             ["Patriarch", "Matriarch"],
             ["High Priest", "High Priestess"]] },
    { name: ["Rogue", null], bothGenders: true,
      rank: [["Footpad", null],
             ["Cutpurse", null],
             ["Rogue", null],
             ["Pilferer", null],
             ["Robber", null],
             ["Burglar", null],
             ["Filcher", null],
             ["Magsman", "Magswoman"],
             ["Thief", null]] },
    { name: ["Ranger", null], bothGenders: true,
      rank: [["Tenderfoot", null],
             ["Lookout", null],
             ["Trailblazer", null],
             ["Reconnoiterer", "Reconnoiteress"],
             ["Scout", null],
             ["Arbalester", null],
             ["Archer", null],
             ["Sharpshooter", null],
             ["Marksman", "Markswoman"]] },
    { name: ["Samurai", null], bothGenders: true,
      rank: [["Hatamoto", null],
             ["Ronin", null],
             ["Ninja", "Kunoichi"],
             ["Joshu", null],
             ["Ryoshu", null],
             ["Kokushu", null],
             ["Daimyo", null],
             ["Kuge", null],
             ["Shogun", null]] },
    { name: ["Tourist", null], bothGenders: true,
      rank: [["Rambler", null],
             ["Sightseer", null],
             ["Excursionist", null],
             ["Peregrinator", "Peregrinatrix"],
             ["Traveler", null],
             ["Journeyer", null],
             ["Voyager", null],
             ["Explorer", null],
             ["Adventurer", null]] },
    { name: ["Valkyrie", null], bothGenders: false,
      rank: [["Stripling", null],
             ["Skirmisher", null],
             ["Fighter", null],
             ["Man-at-arms", "Woman-at-arms"],
             ["Warrior", null],
             ["Swashbuckler", null],
             ["Hero", "Heroine"],
             ["Champion", null],
             ["Lord", "Lady"]] },
    { name: ["Wizard", null], bothGenders: true,
      rank: [["Evoker", null],
             ["Conjurer", null],
             ["Thaumaturge", null],
             ["Magician", null],
             ["Enchanter", "Enchantress"],
             ["Sorcerer", "Sorceress"],
             ["Necromancer", null],
             ["Wizard", null],
             ["Mage", null]] },
];


/* C ref: botl.c:298 xlev_to_rank — experience level (1..30) to rank index
 * (0..8).  NOT (xlev - 1) / 3, which is what js/cmd.js used; the two agree only
 * at levels 1 and 2, so a level-6 Wizard was a Conjurer there and is a
 * Thaumaturge in C. */
export function xlev_to_rank(xlev) {
    return (xlev <= 2) ? 0 : (xlev <= 30) ? Math.floor((xlev + 2) / 4) : 8;
}

/* C ref: botl.c:330 rank_of(lev, monnum, female).  Walks DOWN from
 * xlev_to_rank(lev), preferring the female string at each index when one
 * exists, so a role with a hole in its rank[] reuses the nearest filled entry;
 * falls back to the role's own name.f / name.m and finally "Player". */
export function rank_of(roleIdx, lev, female) {
    const role = ROLE_RANKS[roleIdx | 0];
    if (!role) return 'Player';
    for (let i = xlev_to_rank(lev | 0); i >= 0; i--) {
        if (female && role.rank[i][1]) return role.rank[i][1];
        if (role.rank[i][0]) return role.rank[i][0];
    }
    if (female && role.name[1]) return role.name[1];
    if (role.name[0]) return role.name[0];
    return 'Player';
}

/* Resolve a roles[] index from a role NAME, matching name.m or name.f, so a
 * caller holding "Cavewoman" or "Priestess" lands on the right row.  Returns
 * -1 when the name is not a role. */
export function role_index_by_name(roleName) {
    return ROLE_RANKS.findIndex(
        (r) => r.name[0] === roleName || r.name[1] === roleName);
}
