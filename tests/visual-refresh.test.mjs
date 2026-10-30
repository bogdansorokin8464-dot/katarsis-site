import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const html = readFileSync(resolve(root, 'web/play/index.html'), 'utf8');
const patch = html.match(/<style id="visual-refresh-20261030">([\s\S]*?)<\/style>/)?.[1] ?? '';

test('world map keeps every labelled place and reports the current selection', () => {
  assert.equal((html.match(/class="wm-hotspot"/g) ?? []).length, 294);
  assert.equal((html.match(/aria-label="Сведения:/g) ?? []).length, 294);
  assert.match(html, /id="wm-selected-label"/);
  assert.match(html, /aria-live="polite" aria-atomic="true"/);
  assert.match(html, /wm-hotspot:focus-visible/);
  assert.match(html, /wm-city-select/);
});

test('constructor completion uses the existing six-step checklist and announces status', () => {
  assert.equal((html.match(/class="portal-step-button(?: active)?"/g) ?? []).length, 6);
  assert.match(html, /const done=\[!!name,!!omen&&skills\.omen\.length===2/);
  assert.match(html, /button\.dataset\.complete=String\(complete\)/);
  assert.match(html, /— готово/);
  assert.match(patch, /\.portal-step-button\.is-complete/);
  assert.match(patch, /\.portal-step-button\.active\.is-complete/);
});

test('ability and equipment cards share the screen treatment without touching print rules', () => {
  assert.match(patch, /#portal \.portal-ability,#portal #shop-products \.product/);
  assert.match(patch, /#portal \.portal-sheet-viewport \.sheet/);
  assert.match(patch, /@media screen/);
  assert.doesNotMatch(patch, /@media\s+print/);
  assert.match(html, /width:190mm;height:277mm/);
  assert.match(html, /#chosen-skills \{ width:210mm/);
});

test('mobile, keyboard-focus, and reduced-motion treatments are present', () => {
  assert.match(patch, /@media\(max-width:650px\)/);
  assert.match(patch, /@media\(max-width:600px\)/);
  assert.match(patch, /prefers-reduced-motion:reduce/);
  assert.match(patch, /wm-hotspot:focus-visible/);
  assert.match(patch, /wm-zoom-tools button\{min-width:44px;min-height:44px\}/);
});

test('referenced local web assets exist', () => {
  const urls = [...new Set(html.match(/\/assets\/[\w.-]+\.(?:png|jpe?g|webp|svg|woff2?|ttf|pdf)/gi) ?? [])];
  const missing = urls.filter(url => !existsSync(resolve(root, 'web', url.slice(1))));
  assert.deepEqual(missing, []);
});
