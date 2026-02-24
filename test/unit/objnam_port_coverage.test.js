import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    fruit_from_name,
    fruit_from_indx,
    fruitname,
    reorder_fruit,
    safe_qbuf,
    set_wallprop_from_str,
    readobjnam_init,
    readobjnam_preparse,
    readobjnam_parse_charges,
    readobjnam_postparse1,
    readobjnam_postparse2,
    readobjnam,
    xname_flags,
    doname_base,
    distant_name,
    dbterrainmesg,
} from '../../js/objnam.js';
import { mksobj } from '../../js/mkobj.js';
import { LONG_SWORD } from '../../js/objects.js';
import { STONE, ROOM, WATER } from '../../js/config.js';
import { initRng } from '../../js/rng.js';

describe('objnam port coverage', () => {
    it('tracks fruit names and indexes', () => {
        const idx = fruit_from_name('pear');
        assert.ok(idx > 0);
        assert.equal(fruit_from_name('pear', false), idx);
        assert.equal(fruit_from_indx(idx), 'pear');
        assert.equal(fruitname(idx), 'pear');
        reorder_fruit(true);
    });

    it('builds bounded safe_qbuf output', () => {
        const s = safe_qbuf('Really ', '?', 'very long thing name', 'thing', 20);
        assert.ok(s.length <= 20);
    });

    it('maps wall-property strings', () => {
        assert.equal(set_wallprop_from_str('nondiggable'), 'nondiggable');
        assert.equal(set_wallprop_from_str('non-passwall'), 'nonpasswall');
        assert.equal(set_wallprop_from_str('unknown'), null);
    });

    it('preparses readobjnam wish modifiers', () => {
        const state = readobjnam_init();
        const text = readobjnam_preparse(state, '3 blessed +2 long sword');
        assert.equal(text, 'long sword');
        assert.equal(state.quan, 3);
        assert.equal(state.buc, 1);
        assert.equal(state.spe, 2);

        const s2 = readobjnam_init();
        assert.equal(readobjnam_parse_charges(s2, '-1 dagger'), 'dagger');
        assert.equal(s2.spe, -1);
    });

    it('postparses called/labeled and class hints', () => {
        const state = readobjnam_init();
        readobjnam_preparse(state, 'scroll labeled qwerty');
        readobjnam_postparse1(state);
        assert.equal(state.oclass > 0, true);
        assert.equal(state.actualn, 'scroll');
        assert.equal(state.dn, 'qwerty');

        const s2 = readobjnam_init();
        readobjnam_preparse(s2, 'pair of speed boots');
        readobjnam_postparse1(s2);
        assert.equal(s2.actualn, 'speed boots');

        const s3 = readobjnam_init();
        readobjnam_preparse(s3, 'blue gem');
        readobjnam_postparse1(s3);
        readobjnam_postparse2(s3);
        assert.equal(s3.actualn, 'blue');
    });

    it('keeps readobjnam wish path operational', () => {
        initRng(1234);
        const otmp = readobjnam('blessed long sword', false);
        assert.ok(otmp);
        assert.equal(otmp.blessed, true);
    });

    it('provides naming wrappers and terrain names', () => {
        const obj = mksobj(LONG_SWORD, true, false);
        assert.ok(xname_flags(obj, 0).length > 0);
        assert.ok(doname_base(obj, null).length > 0);
        assert.ok(distant_name(obj).length > 0);
        assert.equal(dbterrainmesg(STONE), 'stone');
        assert.equal(dbterrainmesg(ROOM), 'room');
        assert.equal(dbterrainmesg(WATER), 'water');
    });
});
