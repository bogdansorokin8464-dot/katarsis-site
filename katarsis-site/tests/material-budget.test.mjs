import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

test('prepared GM core stays below Cloudflare’s per-file limit', () => {
  execFileSync(process.execPath, [resolve(root, 'scripts/prepare-materials.mjs')], { cwd: root });
  const corePath = resolve(root, 'web/build/materials/core.html');
  const size = statSync(corePath).size;
  const limit = 25 * 1024 * 1024;
  assert.ok(size < limit, `core.html is ${size} bytes; limit is strictly below ${limit}`);

  const core = readFileSync(corePath, 'utf8');
  const mapSrc = core.match(/<img\b[^>]*?id="world-map-image"[^>]*?src="([^"]+)"/)?.[1];
  assert.match(mapSrc ?? '', /^\/assets\/[a-f0-9]{24}\.webp$/);
  assert.ok(existsSync(resolve(root, 'web', mapSrc.slice(1))), `map asset exists: ${mapSrc}`);
  assert.doesNotMatch(core, /id="world-map-image"[^>]*?src="data:image\/webp;base64,/);
});
