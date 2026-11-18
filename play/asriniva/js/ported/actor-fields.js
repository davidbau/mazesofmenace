// Keep combat's health and coordinate operations on the authoritative heap.
// Component fixtures can supply plain actors through the same source policies.
function fields(game) {
    return Object.hasOwn(game, 'actorFields') ? game.actorFields : undefined;
}

export function monsterHP(game, actor) {
    const fixed = fields(game);
    return fixed ? fixed.hp(actor) : actor.mhp;
}

export function setMonsterHP(game, actor, value) {
    const fixed = fields(game);
    if (fixed)
        fixed.setHP(actor, value);
    else
        actor.mhp = value;
    return value;
}

export function monsterX(game, actor) {
    const fixed = fields(game);
    return fixed ? fixed.x(actor) : actor.mx;
}

export function monsterY(game, actor) {
    const fixed = fields(game);
    return fixed ? fixed.y(actor) : actor.my;
}


const combatFieldKinds = {
    cham: 'Int16',
    female: null,
    isminion: null,
    ispriest: null,
    isshk: null,
    m_id: 'Uint32',
    m_lev: 'Uint8',
    mavenge: null,
    mblinded: null,
    mcan: null,
    mcanmove: null,
    mcansee: null,
    mcloned: null,
    mconf: null,
    meating: 'Int32',
    mflee: null,
    mfrozen: null,
    mhp: 'Int32',
    mhpmax: 'Int32',
    minvis: null,
    misc_worn_check: 'BigInt64',
    mleashed: null,
    mlstmv: 'BigInt64',
    movement: 'Int16',
    mpeaceful: null,
    msleeping: null,
    mspec_used: 'Int32',
    mspeed: null,
    mstrategy: 'BigUint64',
    mstun: null,
    mtame: 'Int8',
    mtrapped: null,
    mundetected: null,
    mux: 'Int16',
    muy: 'Int16',
    weapon_check: 'Int16',
    wormno: null,
};

const ordinaryActorFields = {};
for (const name of Object.keys(combatFieldKinds)) {
    const setter = 'set' + name[0].toUpperCase() + name.slice(1);
    ordinaryActorFields[name] = actor => actor[name];
    ordinaryActorFields[setter] = (actor, value) => (actor[name] = value);
}

export function combatFieldsFor(game) {
    return fields(game) ?? ordinaryActorFields;
}

export function createActorFields(arena, layout) {
    const access = {};
    const view = arena.view;
    for (const [name, kind] of Object.entries(combatFieldKinds)) {
        const {offset, bits, shift} = layout[name];
        const setter = 'set' + name[0].toUpperCase() + name.slice(1);
        if (kind) {
            const read = view['get' + kind], write = view['set' + kind];
            const normalize = kind.startsWith('Big') ? BigInt : Number;
            access[name] = actor => read(actor.address + offset, true);
            access[setter] = (actor, value) => {
                write(actor.address + offset, normalize(value), true);
                return value;
            };
        } else {
            if (bits === undefined || bits + shift > 16)
                throw new Error('Review packed monster field ' + name);
            const singleByte = bits + shift <= 8;
            const read = singleByte ? view.getUint8 : view.getUint16;
            const write = singleByte ? view.setUint8 : view.setUint16;
            const mask = (1 << bits) - 1;
            access[name] = actor => (read(actor.address + offset, true) >>> shift) & mask;
            access[setter] = (actor, value) => {
                const at = actor.address + offset;
                const narrowed = typeof value === 'bigint' ? Number(BigInt.asUintN(bits, value)) : value & mask;
                write(at, (read(at, true) & ~(mask << shift)) | (narrowed << shift), true);
                return value;
            };
        }
    }
    access.hp = access.mhp;
    access.setHP = access.setMhp;
    access.x = actor => view.getInt16(actor.address + layout.mx.offset, true);
    access.y = actor => view.getInt16(actor.address + layout.my.offset, true);
    return Object.freeze(access);
}

// One damage calculation is ordinary JavaScript state. A damage address is
// needed only for effects that still consume an int pointer.
export class CombatDamage {
    constructor(reserveDamage) {
        this.reserveDamage = reserveDamage;
        this.values = new Int32Array(6);
        this.damageWord = undefined;
    }
    get damage() { return this.damageWord ? this.damageWord.read() : this.values[0]; }
    set damage(value) {
        if (this.damageWord)
            this.damageWord.write(value);
        else
            this.values[0] = value;
    }
    get hitflags() { return this.values[1]; }
    set hitflags(value) { this.values[1] = value; }
    get done() { return this.values[2] << 24 >> 24; }
    set done(value) { this.values[2] = value; }
    get permdmg() { return this.values[3] << 24 >> 24; }
    set permdmg(value) { this.values[3] = value; }
    get specialdmg() { return this.values[4]; }
    set specialdmg(value) { this.values[4] = value; }
    get dieroll() { return this.values[5]; }
    set dieroll(value) { this.values[5] = value; }

    flagsReference() {
        const damage = this;
        return {
            get value() { return damage.hitflags; },
            set value(value) { damage.hitflags = value; },
        };
    }
}
