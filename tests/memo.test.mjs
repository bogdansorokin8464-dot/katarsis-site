import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const memo=read('web/memo.html');
const worker=read('src/worker.mjs');
const play=read('web/play/index.html');
const updates=read('web/updates.html');

test('the memo is one A4 sheet with two sides', () => {
  assert.equal((memo.match(/class="memo-sheet"/g)||[]).length,2,'memo must print on exactly two sides');
  assert.match(memo,/@page\{size:A4;margin:0\}/);
  assert.match(memo,/break-after:page/);
  assert.ok(Buffer.byteLength(memo)<25*1024*1024);
});

test('the memo carries every current rule outside combat', () => {
  const required=[
    'Создание персонажа','Восемь характеристик','31 навык','Проверка',
    '20 — критический успех','1 — критический провал',
    'Преимущество и помеха','Ресурсы и максимумы','Стресс, Воля и струны души',
    'Вдохновение','1к6 стресса','Залечить раны','Починить броню','Подготовиться',
    'Пламя славы','Избежать смерти','Рискнуть всем','шрам','0 МЗ','Сцена',
    'Снаряжение и кошель','Ремесло','max(1, базовый − модификатор навыка)',
    'Примеры рецептов','Языки','Лист, сохранение и печать','Быстрая сверка',
    'Что пока не закреплено'
  ];
  for(const phrase of required){
    assert.ok(memo.includes(phrase),`memo is missing: ${phrase}`);
  }
  assert.match(memo,/восемь<\/strong> делений трекера/,'memo must cap inspiration at eight');
});

test('the memo leaves combat to the separate card', () => {
  for(const phrase of ['Уклонение','пороги попадания','Поглощение','диагонал','три действия']){
    assert.ok(!memo.includes(phrase),`memo must not cover combat, found: ${phrase}`);
  }
  assert.match(memo,/Твой ход в бою/,'memo must point at the combat card');
});

test('the memo opens from the left sidebar', () => {
  for(const [name,html] of [['public play page',play],['canonical source',read('КАТАРСИС.html')]]){
    assert.match(html,/data-view="memo"/,`${name} has no memo tab in the sidebar`);
    assert.match(html,/Памятка A4<\/button>/,`${name} does not label the memo tab`);
    assert.match(html,/memo:'Памятка A4'/,`${name} does not register the memo view`);
    assert.match(html,/id="view-memo"/,`${name} has no memo view section`);
    assert.match(html,/id="memo-frame"[^>]*src="\/memo"/,`${name} has no memo preview frame`);
    assert.match(html,/id="memo-print"/,`${name} has no memo print button`);
    assert.match(html,/id="memo-view-script"/,`${name} has no memo view script`);
    assert.doesNotMatch(html,/<button[^>]*data-view="memo"[^>]*href=/,`${name} mixes a tab with a link`);
  }
  assert.match(memo,/window\.self!==window\.top/,'the memo does not hide its toolbar when embedded');
  assert.match(memo,/URLSearchParams\(location\.search\)\.has\('print'\)/,'the memo cannot print itself from the ?print=1 fallback');
  assert.match(play,/\/memo\?print=1/,'the app has no print fallback link');
});

test('the memo route, link and changelog are wired', () => {
  assert.match(worker,/\['\/memo','\/memo\.html'\],\['\/memo\/','\/memo\.html'\]/);
  assert.match(worker,/id:'2026\.11\.12\.\d+'/);
  assert.match(worker,/title:'.+'/);
  assert.match(updates,/id="release-2026-11-08-\d+"/);
  assert.match(play,/href="\/memo"/,'the rules view does not link to the memo');
  assert.ok(existsSync(new URL('../web/brand-font.css',import.meta.url)),'brand-font.css is missing');
  assert.match(memo,/href="\/brand-font\.css"/);
});
