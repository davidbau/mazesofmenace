// enlght_patrons.js — Quest deity lines for #attributes (enlightenment background).
// C ref: role.c (quest_info, pantheon), questpgr.c strings.
//
// Keyed by canonical role name (urole.name.m) and u.ualign.type (-1 chaotic, 0 neutral, 1 lawful).

/** @type {Record<string, [string, string]>} */
const MISSION_BY_ROLE_ALIGN = {
    'Tourist|0': [
        '  You are neutral, on a mission for The Lady',
        '  who is opposed by Blind Io (lawful) and Offler (chaotic).',
    ],
    'Wizard|0': [
        '  You are neutral, on a mission for Thoth',
        '  who is opposed by Ptah (lawful) and Anhur (chaotic).',
    ],
    'Knight|1': [
        '  You are lawful, on a mission for Lugh',
        '  who is opposed by Brigit (neutral) and Manannan Mac Lir (chaotic).',
    ],
    'Rogue|-1': [
        '  You are chaotic, on a mission for Kos',
        '  who is opposed by Issek (lawful) and Mog (neutral).',
    ],
    'Caveman|0': [
        '  You are neutral, on a mission for Ishtar',
        '  who is opposed by Anu (lawful) and Anshar (chaotic).',
    ],
    'Cavewoman|0': [
        '  You are neutral, on a mission for Ishtar',
        '  who is opposed by Anu (lawful) and Anshar (chaotic).',
    ],
    'Monk|0': [
        '  You are neutral, on a mission for Chih Sung-tzu',
        '  who is opposed by Shan Lai Ching (lawful) and Huan Ti (chaotic).',
    ],
    'Archeologist|0': [
        '  You are neutral, on a mission for Camaxtli',
        '  who is opposed by Quetzalcoatl (lawful) and Huhetotl (chaotic).',
    ],
    'Barbarian|0': [
        '  You are neutral, on a mission for Crom',
        '  who is opposed by Mitra (lawful) and Set (chaotic).',
    ],
    'Samurai|1': [
        '  You are lawful, on a mission for Amaterasu Omikami',
        '  who is opposed by Raijin (neutral) and Susanowo (chaotic).',
    ],
    'Priest|0': [
        '  You are neutral, on a mission for The Lady',
        '  who is opposed by Blind Io (lawful) and Offler (chaotic).',
    ],
    'Priest|1': [
        '  You are lawful, on a mission for Amaterasu Omikami',
        '  who is opposed by Raijin (neutral) and Susanowo (chaotic).',
    ],
    'Priest|-1': [
        '  You are chaotic, on a mission for Loki',
        '  who is opposed by Tyr (lawful) and Odin (neutral).',
    ],
    'Healer|0': [
        '  You are neutral, on a mission for Hermes',
        '  who is opposed by Apollo (lawful) and Poseidon (chaotic).',
    ],
    'Ranger|-1': [
        '  You are chaotic, on a mission for Mercury',
        '  who is opposed by Venus (lawful) and Mars (neutral).',
    ],
    'Valkyrie|1': [
        '  You are lawful, on a mission for Tyr',
        '  who is opposed by Odin (neutral) and Loki (chaotic).',
    ],
};

/**
 * @param {string} roleNameM — urole.name.m (canonical role id)
 * @param {number} alignType — u.ualign.type: -1 chaotic, 0 neutral, 1 lawful
 * @returns {string[]}
 */
export function enlightMissionLines(roleNameM, alignType) {
    const role = roleNameM || 'Tourist';
    const a = alignType === 1 || alignType === 0 || alignType === -1 ? alignType : 0;
    const hit = MISSION_BY_ROLE_ALIGN[`${role}|${a}`];
    if (hit) return [...hit];
    const label = a === 1 ? 'lawful' : a === -1 ? 'chaotic' : 'neutral';
    return [`  You are ${label}.`];
}
