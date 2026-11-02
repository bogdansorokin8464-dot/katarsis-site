import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const files = [
  new URL('../web/play/index.html', import.meta.url),
  new URL('../../КАТАРСИС.html', import.meta.url),
];

test('identity mirrors never rewrite a focused input or assign unchanged text', () => {
  for (const file of files) {
    const html = readFileSync(file, 'utf8');
    assert.match(html, /if\(document\.activeElement!==input&&input\.value!==field\.textContent\)input\.value=field\.textContent;/);
    assert.match(html, /if\(field\.textContent===input\.value\)return;/);
    assert.match(html, /document\.activeElement!==background&&background\.value!==value\)background\.value=value;/);
    assert.match(html, /if\(f\.textContent!==value\)f\.textContent=value;/);
    assert.doesNotMatch(html, /field\.addEventListener\('input',\(\)=>\{\$\(id\)\.value=field\.textContent;\}\)/);
  }
});
