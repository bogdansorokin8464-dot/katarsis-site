import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const play=read('web/play/index.html');
const source=read('КАТАРСИС.html');

test('the deployed play sheet uses Evasion instead of the old armor class', () => {
  for (const [name,html] of [['public play page',play],['canonical source',source]]) {
    assert.doesNotMatch(html,/Класс Доспеха|\bКД\b/,`${name} still mentions the old armor class`);
    assert.match(html,/id="armor-pips"/,`${name} has no armor slot tracker`);
    assert.match(html,/const ARMOR=\{/,`${name} has no armor profiles`);
    assert.match(html,/Уклонение = 8 \+ Ловкость \+ доспех \+ щит \+ поправки/,`${name} has no evasion formula`);
  }
});

test('the deployed play page keeps the generated build under the asset limit', () => {
  const bytes=Buffer.byteLength(play);
  assert.ok(bytes<25*1024*1024,`play/index.html is ${bytes} bytes`);
  assert.match(play,/id="world-map-image" src="\/assets\/[a-f0-9]{24}\.webp"/);
});
