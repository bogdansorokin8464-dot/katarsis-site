import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const book=read('КАТАРСИС.html');
const play=read('web/play/index.html');
const worker=read('src/worker.mjs');
const updates=read('web/updates.html');
const memo=read('web/memo.html');
const version=read('ВЕРСИЯ.txt').trim();

const chapters=[...book.matchAll(/<details class="system-rule-chapter" id="([a-z-]+)"/g)].map(m=>m[1]);
const chapterOf=id=>{
  const i=book.indexOf('id="'+id+'"');
  assert.notEqual(i,-1,`chapter ${id} is missing`);
  const start=book.lastIndexOf('<details',i);
  const end=book.indexOf('</details>',i);
  return book.slice(start,end);
};

test('the rulebook carries 25 numbered chapters, new ones included', () => {
  assert.equal(chapters.length,25);
  for(const id of ['rules-difficulty','rules-advantage','rules-injuries','rules-stress-sources','rules-loadout','rules-init','rules-cover']){
    assert.ok(chapters.includes(id),`chapter ${id} is missing`);
  }
  const numbers=[...book.matchAll(/<small>(\d\d) \/ /g)].map(m=>m[1]);
  assert.deepEqual(numbers.slice(0,25),Array.from({length:25},(_,i)=>String(i+1).padStart(2,'0')));
  assert.match(book,/25 глав · 26 призваний · 31 навык/);
  assert.equal((book.match(/<details/g)||[]).length,(book.match(/<\/details>/g)||[]).length);
});

test('difficulty bands fix the number for the whole band', () => {
  const ch=chapterOf('rules-difficulty');
  assert.match(ch,/<th>1–7<\/th><td>Тривиальная<\/td>/);
  assert.match(ch,/<th>8–12<\/th><td>Требует проверки<\/td>/);
  assert.match(ch,/<th>13–18<\/th><td>Хороший результат<\/td>/);
  assert.match(ch,/<th>19 и выше<\/th><td>Тяжело<\/td>/);
  assert.match(ch,/Сложность полосы: 8 — требует проверки · 13 — хороший результат · 19 и выше — тяжело/);
  assert.match(ch,/обязан сделать это до броска/);
});

test('advantage and penalty are degrees of к6 capped at five', () => {
  const ch=chapterOf('rules-advantage');
  assert.match(ch,/к20 \+ навык \+ Nк6/);
  assert.match(ch,/к20 \+ навык − Nк6/);
  assert.match(ch,/Максимум — пять степеней в каждую сторону/);
  for(const step of ['Сложите степени преимущества','Сложите степени помехи','Погасите противоположные степени','Ограничьте остаток пятью']){
    assert.ok(ch.includes(step),`advantage chapter is missing: ${step}`);
  }
  assert.match(ch,/Критический успех и критический провал определяет только натуральное значение к20/);
  assert.ok(!book.includes('Формула 2-й и 3-й степеней ещё не уточнена'),'stale open formula text survived');
});

test('repeats step from normal to penalty to automatic failure', () => {
  const ch=chapterOf('rules-repeats');
  assert.match(ch,/Второе применение — бросок с одной степенью помехи/);
  assert.match(ch,/Третье применение — автоматический провал/);
  assert.match(ch,/Успех сбрасывает счётчик/);
  assert.match(ch,/степени преимущества и помехи считаются по отдельной главе/i);
});

test('initiative is к20 plus Реакция and refresh happens on your turn', () => {
  const ch=chapterOf('rules-init');
  assert.match(ch,/Инициатива = к20 \+ Реакция/);
  assert.match(ch,/по убыванию результата/);
  assert.match(ch,/При равенстве<\/strong> выше действует тот, у кого больше значение Реакции/);
  assert.match(ch,/Реакция обновляется в свой ход/);
  assert.ok(!chapterOf('rules-turn').includes('Общий момент обновления реакции отдельно не уточняется'));
});

test('cover, vision, prone, no jump action, difficult terrain', () => {
  const ch=chapterOf('rules-cover');
  assert.match(ch,/Полуукрытие<\/th><td>урон от дальних атак по цели вдвое меньше/);
  assert.match(ch,/урон игнорируется, если он не выше текущего ФЗ цели/);
  assert.match(ch,/Лёгкая заслонка[^<]*<\/th><td>одна степень помехи на Внимательность и дальние атаки/);
  assert.match(ch,/Полная заслонка[^<]*<\/th><td>цель не видна/);
  assert.match(ch,/По лежащему дальние атаки идут с одной степенью помехи, ближние — с одной степенью преимущества/);
  assert.match(ch,/Прыжков как отдельного действия нет/);
  assert.match(ch,/скорость вдвое меньше/);
  assert.ok(!chapterOf('rules-movement').includes('универсальные правила прыжков, лазания, падения'));
});

test('reload, ammo and carry weight', () => {
  const ch=chapterOf('rules-loadout');
  assert.match(ch,/перезаряжается <b>двумя действиями<\/b>/);
  assert.match(ch,/Лук<\/th><td>20 стрел/);
  assert.match(ch,/Арбалет<\/th><td>10 болтов/);
  assert.match(ch,/Праща<\/th><td>20 камней/);
  assert.match(ch,/Огнестрельное<\/th><td>5 зарядов/);
  assert.match(ch,/Переносимый вес = 30 × \(Атлетика \+ 1\)/);
  assert.match(ch,/<th>0 и меньше<\/td>|<th>0 и меньше<\/th><td>30<\/td>/);
  assert.match(ch,/<th>\+1<\/th><td>60<\/td>/);
  assert.match(ch,/При отрицательной Атлетике предел остаётся 30/);
  assert.ok(!chapterOf('rules-equipment').includes('Не назначайте универсальные дальности, вместимость, перезарядку'));
});

test('injury table has exactly 60 numbered entries with prices', () => {
  const ch=chapterOf('rules-injuries');
  const rows=[...ch.matchAll(/<tr><th>(\d+)<\/th><td>/g)].map(m=>Number(m[1]));
  assert.equal(rows.length,60,'injury table must hold 60 examples');
  assert.deepEqual(rows,Array.from({length:60},(_,i)=>i+1));
  assert.match(ch,/Лёгкая<\/th><td>8–12<\/td><td>до короткого отдыха<\/td><td>10 монет/);
  assert.match(ch,/Средняя<\/th><td>13–18<\/td><td>один длинный отдых<\/td><td>50 монет/);
  assert.match(ch,/Тяжёлая<\/th><td>19 и выше<\/td><td>два длинных отдыха<\/td><td>150 монет/);
  assert.match(ch,/Случайная травма: десятки — к6−1, единицы — к10/);
  assert.match(ch,/провал не отменяет лечение/i);
});

test('stress from a heavy hit is half the damage, rounded up', () => {
  const ch=chapterOf('rules-stress-sources');
  assert.match(ch,/Урон от врага не меньше половины максимума ФЗ<\/th><td>половина урона, округление вверх/);
  assert.match(ch,/Максимум ФЗ равен 13, урон от врага — 7/);
  assert.match(ch,/стресс равен половине урона, 3,5 → 4/);
  for(const row of ['Провал проверки Воли в опасной сцене','Смерть союзника на глазах','Ночь без отдыха','Голод или холод за сцену','Осложнение после провала']){
    assert.ok(ch.includes(row),`stress source is missing: ${row}`);
  }
  assert.match(ch,/До излечения травмы<\/th><td>штрафы травм/);
});

test('the open list drops what wave two settled', () => {
  const ch=chapterOf('rules-open');
  for(const gone of ['назначение сложности проверок','формулы 2-й и 3-й степеней','универсальная классификация однотипных действий',
                     'порядок одновременных модификаторов','таблица травм и длительное лечение','общие перезарядка, боезапас, нагрузки',
                     'общие правила укрытия, обзора','инициатива, обновление реакции']){
    assert.ok(!ch.includes(gone),`open list still claims: ${gone}`);
  }
  for(const kept of ['длительность короткого и длинного отдыха','снятие черепов','урон от падения с высоты','прерывание чужого хода']){
    assert.ok(ch.includes(kept),`open list lost: ${kept}`);
  }
});

test('the generated play sheet carries the new chapters', () => {
  for(const id of ['rules-difficulty','rules-advantage','rules-injuries','rules-stress-sources','rules-loadout','rules-init','rules-cover']){
    assert.ok(play.includes('id="'+id+'"'),`regenerate web/play/index.html: ${id} missing`);
  }
  assert.ok(play.includes('Полуукрытие'));
  assert.ok(play.includes('Переносимый вес'));
});

test('the memo repeats the same numbers', () => {
  assert.match(memo,/8–12<\/strong> — 8, <strong>13–18<\/strong> — 13/);
  assert.match(memo,/максимум пять степеней/);
  assert.match(memo,/стресс, равный половине урона с округлением вверх/);
  assert.match(memo,/Переносимый вес = 30 × \(Атлетика \+ 1\)/);
  assert.match(memo,/10 \/ 50 \/ 150 монет/);
  assert.ok(!memo.includes('формулы 2-й и 3-й степеней'));
  assert.match(memo,/на сайте, 25 глав/);
});

test('every page agrees on the release id', () => {
  assert.equal(version,'2026.11.08.7');
  assert.match(worker,/VERSION=\{id:'2026\.11\.08\.7'/);
  assert.match(worker,/title:'Травмы и степени прямо в листе персонажа'/);
  assert.ok(updates.includes('id="release-2026-11-08-7"'));
  assert.ok(updates.includes('2026.11.08.7'));
  assert.match(read('web/index.html'),/2026\.11\.08\.7/);
  assert.match(read('web/site.js'),/CURRENT='2026\.11\.08\.7'/);
});
