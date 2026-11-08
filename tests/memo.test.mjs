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

test('the memo route, link and changelog are wired', () => {
  assert.match(worker,/\['\/memo','\/memo\.html'\],\['\/memo\/','\/memo\.html'\]/);
  assert.match(worker,/id:'2026\.11\.08\.3'/);
  assert.match(worker,/title:'Памятка по правилам на двух сторонах A4'/);
  assert.match(updates,/id="release-2026-11-08-3"/);
  assert.match(play,/href="\/memo"/,'the rules view does not link to the memo');
  assert.ok(existsSync(new URL('../web/brand-font.css',import.meta.url)),'brand-font.css is missing');
  assert.match(memo,/href="\/brand-font\.css"/);
});
