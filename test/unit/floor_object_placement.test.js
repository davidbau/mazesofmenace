import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

function collectJsFiles(rootDir) {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path.join(rootDir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'test' || entry.name === 'node_modules' || entry.name.startsWith('.')) {
                continue;
            }
            files.push(...collectJsFiles(fullPath));
            continue;
        }
        if (entry.isFile() && entry.name.endsWith('.js')) {
            files.push(fullPath);
        }
    }
    return files;
}

describe('floor object placement', () => {
    it('routes runtime floor placement through placeFloorObject', () => {
        const projectRoot = process.cwd();
        const jsDir = path.join(projectRoot, 'js');
        const files = collectJsFiles(jsDir).filter((filePath) => {
            const base = path.basename(filePath);
            return base !== 'stackobj.js' && base !== 'mkobj.js';
        });

        const offenders = [];
        for (const filePath of files) {
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('map.objects.push(')) {
                offenders.push(path.relative(projectRoot, filePath));
            }
        }

        assert.equal(offenders.length, 0, `Found map.objects.push callsites outside placeFloorObject: ${offenders.join(', ')}`);
    });
});
