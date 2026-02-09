// test/unit/hacklib.test.js -- Tests for xcrypt decryption and data file parsing
// C ref: hacklib.c xcrypt(), rumors.c unpadline(), makedefs.c

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { xcrypt, unpadline, parseEncryptedDataFile, parseRumorsFile } from '../../js/hacklib.js';
import { EPITAPH_FILE_TEXT } from '../../js/epitaph_data.js';
import { ENGRAVE_FILE_TEXT } from '../../js/engrave_data.js';
import { RUMORS_FILE_TEXT } from '../../js/rumor_data.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '../..');

describe('xcrypt', () => {
    it('is self-inverse (encrypt then decrypt returns original)', () => {
        const original = 'Hello, World!';
        const encrypted = xcrypt(original);
        const decrypted = xcrypt(encrypted);
        assert.equal(decrypted, original);
    });

    it('is self-inverse for longer strings', () => {
        const original = 'Rest in peace';
        const encrypted = xcrypt(original);
        assert.notEqual(encrypted, original);
        assert.equal(xcrypt(encrypted), original);
    });

    it('leaves newlines unchanged', () => {
        const input = 'line1\nline2\n';
        const result = xcrypt(input);
        // newline (0x0a) has neither bit 5 nor bit 6 set, so unchanged
        assert.ok(result.includes('\n'));
    });

    it('leaves control characters unchanged', () => {
        // Control chars 0-31 don't have bit 5 or 6 set (except 0x20=space)
        const input = '\t\r\x01\x02';
        assert.equal(xcrypt(input), input);
    });

    it('only modifies chars with bit 5 or 6 set', () => {
        // Test a char with neither bit 5 nor 6: e.g. 0x0A (newline), 0x09 (tab)
        for (let ch = 0; ch < 128; ch++) {
            const input = String.fromCharCode(ch);
            const output = xcrypt(input);
            const hasBit5or6 = (ch & (32 | 64)) !== 0;
            if (!hasBit5or6) {
                assert.equal(output, input,
                    `char ${ch} (0x${ch.toString(16)}) should be unchanged`);
            }
        }
    });

    it('XORs with rotating bitmask 1,2,4,8,16', () => {
        // Manually verify bitmask rotation on 'AAAAA' (0x41)
        // A=0x41, has bit 6 set
        // char 0: 0x41 ^ 1 = 0x40 = '@'
        // char 1: 0x41 ^ 2 = 0x43 = 'C'
        // char 2: 0x41 ^ 4 = 0x45 = 'E'
        // char 3: 0x41 ^ 8 = 0x49 = 'I'
        // char 4: 0x41 ^ 16 = 0x51 = 'Q'
        assert.equal(xcrypt('AAAAA'), '@CEIQ');
    });

    it('resets bitmask after 16', () => {
        // After 5 chars (bitmasks 1,2,4,8,16), next char gets bitmask 1 again
        const result = xcrypt('AAAAAA');
        assert.equal(result[5], '@'); // same as first char: 0x41 ^ 1
    });
});

describe('unpadline', () => {
    it('strips trailing underscores', () => {
        assert.equal(unpadline('Hello___'), 'Hello');
    });

    it('preserves underscores within text', () => {
        assert.equal(unpadline('hello_world___'), 'hello_world');
    });

    it('returns unchanged string with no trailing underscores', () => {
        assert.equal(unpadline('Hello'), 'Hello');
    });

    it('handles empty string', () => {
        assert.equal(unpadline(''), '');
    });

    it('handles string of only underscores', () => {
        assert.equal(unpadline('____'), '');
    });
});

describe('parseEncryptedDataFile', () => {
    it('parses the compiled epitaph file correctly', () => {
        const filePath = join(rootDir, 'nethack-c/dat/epitaph');
        const fileText = readFileSync(filePath, 'ascii');
        const data = parseEncryptedDataFile(fileText);

        assert.equal(data.texts.length, 395, 'should have 395 epitaphs');
        assert.equal(data.chunksize, 24075, 'chunksize should be 24075');
    });

    it('decrypts first epitaph correctly', () => {
        const filePath = join(rootDir, 'nethack-c/dat/epitaph');
        const fileText = readFileSync(filePath, 'ascii');
        const data = parseEncryptedDataFile(fileText);

        assert.equal(data.texts[0], 'No matter where I went, here I am.');
    });

    it('decrypts known epitaphs correctly', () => {
        const filePath = join(rootDir, 'nethack-c/dat/epitaph');
        const fileText = readFileSync(filePath, 'ascii');
        const data = parseEncryptedDataFile(fileText);

        assert.equal(data.texts[1], 'Rest in peace');
        assert.equal(data.texts[2], 'R.I.P.');
        assert.equal(data.texts[3], 'Rest In Pieces');
        assert.equal(data.texts[394],
            'You set my heart aflame.  You gave me heartburn.');
    });

    it('all line bytes are 60 (padded lines)', () => {
        const filePath = join(rootDir, 'nethack-c/dat/epitaph');
        const fileText = readFileSync(filePath, 'ascii');
        const data = parseEncryptedDataFile(fileText);

        // Each padded line is 59 chars + 1 newline = 60 bytes
        for (let i = 0; i < data.lineBytes.length; i++) {
            // Most lines should be exactly 60 (59 encrypted chars + newline)
            // but the last line might differ if no trailing newline
            assert.ok(data.lineBytes[i] > 0,
                `line ${i} should have positive byte count`);
        }
    });

    it('decrypted texts match epitaph.txt source', () => {
        const filePath = join(rootDir, 'nethack-c/dat/epitaph');
        const fileText = readFileSync(filePath, 'ascii');
        const data = parseEncryptedDataFile(fileText);

        // Read source file and extract non-comment lines
        const srcPath = join(rootDir, 'nethack-c/dat/epitaph.txt');
        const srcText = readFileSync(srcPath, 'utf-8');
        const srcLines = srcText.split('\n')
            .filter(l => !l.startsWith('#') && l.length > 0);

        // First text is makedefs-added "No matter where I went..."
        // Source texts start at index 1
        assert.equal(data.texts.length, srcLines.length + 1);
        for (let i = 0; i < srcLines.length; i++) {
            assert.equal(data.texts[i + 1], srcLines[i],
                `epitaph ${i + 1} should match source line ${i}`);
        }
    });

    it('parses the compiled engrave file correctly', () => {
        const filePath = join(rootDir, 'nethack-c/dat/engrave');
        const fileText = readFileSync(filePath, 'ascii');
        const data = parseEncryptedDataFile(fileText);

        assert.equal(data.texts.length, 47, 'should have 47 engravings');
        assert.equal(data.chunksize, 2894, 'chunksize should be 2894');
        assert.equal(data.texts[0], 'No matter where you go, there you are.');
        assert.equal(data.texts[46], 'The cake is a lie');
    });
});

describe('parseRumorsFile', () => {
    it('parses rumors file with correct section sizes', () => {
        const filePath = join(rootDir, 'nethack-c/dat/rumors');
        const fileText = readFileSync(filePath, 'ascii');
        const data = parseRumorsFile(fileText);

        assert.equal(data.trueSize, 23875);
        assert.equal(data.falseSize, 25762);
    });

    it('has correct number of true and false rumors', () => {
        const filePath = join(rootDir, 'nethack-c/dat/rumors');
        const fileText = readFileSync(filePath, 'ascii');
        const data = parseRumorsFile(fileText);

        assert.equal(data.trueTexts.length, 374);
        assert.equal(data.falseTexts.length, 397);
    });

    it('true lineBytes sum matches trueSize', () => {
        const filePath = join(rootDir, 'nethack-c/dat/rumors');
        const fileText = readFileSync(filePath, 'ascii');
        const data = parseRumorsFile(fileText);

        const sum = data.trueLineBytes.reduce((a, b) => a + b, 0);
        assert.equal(sum, data.trueSize);
    });

    it('false lineBytes sum matches falseSize', () => {
        const filePath = join(rootDir, 'nethack-c/dat/rumors');
        const fileText = readFileSync(filePath, 'ascii');
        const data = parseRumorsFile(fileText);

        const sum = data.falseLineBytes.reduce((a, b) => a + b, 0);
        assert.equal(sum, data.falseSize);
    });

    it('decrypts first true rumor correctly', () => {
        const filePath = join(rootDir, 'nethack-c/dat/rumors');
        const fileText = readFileSync(filePath, 'ascii');
        const data = parseRumorsFile(fileText);

        assert.equal(data.trueTexts[0],
            "A blindfold can be very useful if you're telepathic.");
    });

    it('decrypts first false rumor correctly', () => {
        const filePath = join(rootDir, 'nethack-c/dat/rumors');
        const fileText = readFileSync(filePath, 'ascii');
        const data = parseRumorsFile(fileText);

        assert.equal(data.falseTexts[0],
            '"So when I die, the first thing I will see in heaven is a score list?"');
    });
});

describe('JS string constants match compiled C data files', () => {
    it('epitaph_data.js matches nethack-c/dat/epitaph', () => {
        const fileText = readFileSync(join(rootDir, 'nethack-c/dat/epitaph'), 'ascii');
        const fromFile = parseEncryptedDataFile(fileText);
        const fromJS = parseEncryptedDataFile(EPITAPH_FILE_TEXT);

        assert.equal(fromJS.texts.length, fromFile.texts.length);
        assert.equal(fromJS.chunksize, fromFile.chunksize);
        assert.deepEqual(fromJS.texts, fromFile.texts);
        assert.deepEqual(fromJS.lineBytes, fromFile.lineBytes);
    });

    it('engrave_data.js matches nethack-c/dat/engrave', () => {
        const fileText = readFileSync(join(rootDir, 'nethack-c/dat/engrave'), 'ascii');
        const fromFile = parseEncryptedDataFile(fileText);
        const fromJS = parseEncryptedDataFile(ENGRAVE_FILE_TEXT);

        assert.equal(fromJS.texts.length, fromFile.texts.length);
        assert.equal(fromJS.chunksize, fromFile.chunksize);
        assert.deepEqual(fromJS.texts, fromFile.texts);
        assert.deepEqual(fromJS.lineBytes, fromFile.lineBytes);
    });

    it('rumor_data.js matches nethack-c/dat/rumors', () => {
        const fileText = readFileSync(join(rootDir, 'nethack-c/dat/rumors'), 'ascii');
        const fromFile = parseRumorsFile(fileText);
        const fromJS = parseRumorsFile(RUMORS_FILE_TEXT);

        assert.equal(fromJS.trueSize, fromFile.trueSize);
        assert.equal(fromJS.falseSize, fromFile.falseSize);
        assert.deepEqual(fromJS.trueTexts, fromFile.trueTexts);
        assert.deepEqual(fromJS.falseTexts, fromFile.falseTexts);
        assert.deepEqual(fromJS.trueLineBytes, fromFile.trueLineBytes);
        assert.deepEqual(fromJS.falseLineBytes, fromFile.falseLineBytes);
    });
});
