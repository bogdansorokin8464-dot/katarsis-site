import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const motion = readFileSync(resolve(root, 'scripts/interface-motion.css'), 'utf8');
const app = readFileSync(resolve(root, 'web/play/index.html'), 'utf8');

test('screen motion covers the home view and the requested player and GM views', () => {
  for (const selector of [
    '#view-home .portal-hero',
    '#view-sheet .characters-panel',
    '#view-bestiary .be-grid>.be-card',
    '#view-map .wm-viewport',
    '#view-abilities .portal-ability-grid',
    '#view-shop #shop-products',
    '#view-combat .combat-card',
    '#view-gm .gm-preview',
    '#view-handouts .ho-grid',
  ]) assert.ok(motion.includes(selector), `missing motion selector: ${selector}`);
  assert.match(motion, /@keyframes portal-ring-orbit/);
  assert.match(motion, /@keyframes portal-card-reveal/);
});

test('motion respects reduced-motion, the existing off switch, and print', () => {
  assert.match(motion, /@media screen and \(prefers-reduced-motion:no-preference\)/);
  assert.match(motion, /html\[data-motion=off\]/);
  assert.match(motion, /@media print/);
  assert.match(motion, /\.sheet\{animation:none!important;transform:none!important;opacity:1!important/);
});

test('the app uses the same motion stylesheet as its source', () => {
  const embedded = app.match(/<style id="interface-motion-style">([\s\S]*?)<\/style>/)?.[1]?.trim();
  assert.equal(embedded, motion.trim());
  assert.doesNotMatch(motion, /@import|https?:\/\//);
});
