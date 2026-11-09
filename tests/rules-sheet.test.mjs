import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const book=read('КАТАРСИС.html');
const play=read('web/play/index.html');

const between=(text,start,end)=>{
  const i=text.indexOf(start);
  assert.notEqual(i,-1,`missing start: ${start}`);
  const j=text.indexOf(end,i);
  assert.notEqual(j,-1,`missing end: ${end}`);
  return text.slice(i,j);
};

test('the sheet carries the 60 injury examples with structured penalties', () => {
  const block=between(book,'const INJURY_RAW=[','const INJURIES=');
  const rows=[...block.matchAll(/^\['([^']+)','([^']+)','(light|mid|heavy)',\{/gm)];
  assert.equal(rows.length,60,'injury catalog must hold 60 examples');
  const bands=rows.map(r=>r[3]);
  assert.equal(bands.filter(b=>b==='light').length,24);
  assert.equal(bands.filter(b=>b==='mid').length,24);
  assert.equal(bands.filter(b=>b==='heavy').length,12);
  for(const name of ['Ушиб бедра','Перелом ключицы','Пневмоторакс','Внутреннее кровотечение']){
    assert.ok(block.includes("'"+name+"'"),`injury catalog lost: ${name}`);
  }
  assert.match(block,/\{speed:5\}/);
  assert.match(block,/\{flat:\{'Ловкость рук':-2\}\}/);
  assert.match(block,/\{deg:\{'Внимательность':1\}\}/);
  assert.match(book,/const INJURY_BANDS=\{light:\{label:'Лёгкая',op:'8–12',time:'до короткого отдыха',cost:10\},mid:\{label:'Средняя',op:'13–18',time:'один длинный отдых',cost:50\},heavy:\{label:'Тяжёлая',op:'19 и выше',time:'два длинных отдыха',cost:150\}\}/);
});

test('injuries live in the character state and survive export and restore', () => {
  assert.match(book,/effects:\[\],injuries:\[\],roles:\{\}/);
  assert.match(book,/s\.injuries=\(Array\.isArray\(v\.injuries\)\?v\.injuries:\[\]\)\.map\(n=>integer\(n\)\)\.filter\(n=>INJURY_BY_N\.has\(n\)\)\.slice\(0,60\)/);
  assert.match(book,/if\(window\.KATAR_EMPTY_CHARACTER\)window\.KATAR_EMPTY_CHARACTER\.modules\.fullplay=fresh\(\)/);
});

test('the injuries tab adds, treats and summarises penalties', () => {
  assert.match(book,/\['injuries','Травмы'\]/);
  assert.match(book,/injuries:injuryPanel/);
  assert.match(book,/function injuryPanel\(body\)/);
  assert.match(book,/button\('Добавить травму'/);
  assert.match(book,/Случайная травма к6−1 \/ к10/);
  assert.match(book,/button\('Вылечить'/);
  assert.match(book,/function injurySummary\(\)/);
  assert.match(book,/Операция: Медицина '\+band\.op\+' · лечение: '\+band\.time\+' · у лекаря: '\+band\.cost\+' монет/);
});

test('injury penalties reach checks, speed and carry weight automatically', () => {
  assert.match(book,/function checkBonus\(kind,name\)\{let n=effectBonus\('check',name\)\+injuryFlat\(name\);/);
  assert.match(book,/function injuryDegrees\(name\)/);
  assert.match(book,/function injurySpeed\(\)/);
  assert.match(book,/const speed=Math\.max\(0,10\+omenSpeed\+runnerSpeed\+num\('speed-adjust'\)\+fullSpeed-appliedPenalty-injurySpeed\)/);
  assert.match(book,/\(травмы\)/);
  assert.match(book,/function carryLimit\(\)\{const a=skillOnSheet\('Атлетика'\);return a===null\?null:30\*\(Math\.max\(0,a\)\+1\);\}/);
  assert.match(book,/Переносимый вес по правилу: 30 × \(Атлетика '/);
  assert.match(book,/healthBonus,effectBonus,checkBonus,replacement,stressThreshold,stressCap,injuryDegrees,injuryFlat,injurySpeed,injuryMax,carryLimit,injurySummary/);
});

test('the roller supports five degrees and cancels them against injuries', () => {
  const select=between(book,'<select id="check-edge">','</select>');
  const values=[...select.matchAll(/value="([a-z0-9]+)"/g)].map(m=>m[1]);
  assert.deepEqual(values,['plain','plus1','plus2','plus3','plus4','plus5','minus1','minus2','minus3','minus4','minus5']);
  assert.match(book,/function checkDegree\(edge,auto\)\{const base=edge==='plain'\?0:\(edge\.startsWith\('minus'\)\?-1:1\)\*Number\(edge\.replace\(\/\\D\/g,''\)\);return Math\.max\(-5,Math\.min\(5,base-\(auto\|\|0\)\)\);\}/);
  assert.match(book,/function checkInjuryDegrees\(kind,name\)/);
  assert.match(book,/for\(let i=0;i<cubes;i\+\+\)sum\+=die\(6\)/);
  assert.match(book,/травма даёт помеху '\+auto\+' — степени сложены, потолок 5/);
  assert.ok(!book.includes('Для 2-й и 3-й степеней формула пока не уточнена'),'stale degree notice survived');
  assert.match(book,/Сложность полосы: 1–7 тривиальная · 8–12 → 8 · 13–18 → 13 · 19 и выше → 19/);
});

test('active injuries are printed with the sheet', () => {
  assert.match(book,/function printState\(\)\{print\.replaceChildren\(\);compactCards\(\);const list=injuries\(\);if\(list\.length\)/);
  assert.match(book,/section\.append\(el\('h2','Травмы'\)\)/);
  assert.match(book,/Операция: Медицина '\+band\.op\+' · '\+band\.time\+' · '\+band\.cost\+' монет/);
});

test('the generated play sheet ships the same module', () => {
  assert.match(play,/const INJURY_RAW=\[/);
  assert.match(play,/\['injuries','Травмы'\]/);
  assert.match(play,/select\.id='fp-injury-select'/);
  assert.match(play,/value="plus5"/);
  assert.ok(!play.includes('Для 2-й и 3-й степеней формула пока не уточнена'));
});

test('the injuries list is visible inside the sheet, not only in the hidden tracker', () => {
  assert.match(book,/#fullplay,#fullplay-print\{display:none!important\}/,'the compact rule still hides the tracker');
  assert.match(book,/<style id="sheet-injuries-style">/);
  assert.match(book,/function injuryRoot\(\)\{let node=\$\(.sheet-injuries.\)/);
  assert.match(book,/node\.innerHTML='<h2>Травмы<\/h2>/);
  assert.match(book,/id="si-select"/);
  assert.match(book,/id="si-actions"/);
  assert.match(book,/id="si-list"/);
  assert.match(book,/id="si-summary"/);
  assert.match(book,/if\(cards&&cards\.parentElement===slot\)slot\.insertBefore\(node,cards\);else slot\.append\(node\);/);
  assert.match(book,/function renderInjuries\(\)/);
  assert.match(book,/renderInjuries\(\);printState\(\);/);
  assert.match(book,/@media print\{\n#sheet-injuries\{display:block!important/);
  assert.match(play,/<style id="sheet-injuries-style">/);
  assert.match(play,/function renderInjuries\(\)/);
  assert.match(play,/id="si-select"/);
});
