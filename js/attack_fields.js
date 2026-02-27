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
    setAliasPair(attk, 'aatyp', 'type');
    setAliasPair(attk, 'adtyp', 'damage');
    setAliasPair(attk, 'damn', 'dice');
    setAliasPair(attk, 'damd', 'sides');
    return attk;
}

