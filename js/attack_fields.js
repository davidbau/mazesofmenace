// attack_fields.js -- C/legacy attack field alias helpers

function setAliasPair(obj, canonical, legacy) {
    if (!obj || typeof obj !== 'object') return;
    if (obj[canonical] === undefined && obj[legacy] !== undefined) {
        obj[canonical] = obj[legacy];
    }
    if (obj[legacy] === undefined && obj[canonical] !== undefined) {
        obj[legacy] = obj[canonical];
    }
}

export function canonicalizeAttackFields(attk) {
    if (!attk || typeof attk !== 'object') return attk;
    // aatyp has appeared as both "at" and "type" in legacy JS callsites.
    if (attk.aatyp === undefined) {
        if (attk.at !== undefined) attk.aatyp = attk.at;
        else if (attk.type !== undefined) attk.aatyp = attk.type;
    }
    setAliasPair(attk, 'aatyp', 'type');
    setAliasPair(attk, 'aatyp', 'at');
    setAliasPair(attk, 'adtyp', 'damage');
    setAliasPair(attk, 'adtyp', 'ad');
    setAliasPair(attk, 'damn', 'dice');
    setAliasPair(attk, 'damd', 'sides');
    return attk;
}
