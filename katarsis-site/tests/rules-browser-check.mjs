import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.BASE_URL||'http://localhost:3000';
const browser=await chromium.launch({args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.goto(base+'/play/#sheet');await page.waitForFunction(()=>!!window.KATAR_PORTAL);
assert.equal(await page.locator('#check-modifier option').count(),39);
assert.deepEqual(await page.evaluate(()=>{const s=KATAR_PORTAL.snapshot();return [s.fields.length,s.pips.length,s.modules.rulesV2.stress]}),[194,82,0]);
// Set governing characteristics through the existing sheet; skill calculation stays authoritative.
await page.evaluate(()=>{
 document.querySelectorAll('.stat .mod .uline').forEach((n,i)=>{n.textContent=i===1?'+2':'+1';n.dispatchEvent(new Event('input',{bubbles:true}));});
});
await page.waitForFunction(()=>document.querySelector('[aria-label="Значение навыка: Фехтование"]').textContent.includes('2'));
await page.evaluate(()=>KATAR_PORTAL.showView('rules'));
await page.selectOption('#check-modifier','skill:Фехтование');
await page.selectOption('#check-edge','plus1');await page.click('#check-roll');
assert.match(await page.locator('#check-result').innerText(),/Фехтование: к20 \(\d+\) \+2 \+ к6 \(\d\) = \d+/);
await page.selectOption('#check-edge','minus1');await page.click('#check-roll');
assert.match(await page.locator('#check-result').innerText(),/к20 \(\d+\) \+2 − к6/);
const total=Number((await page.locator('#check-result').innerText()).match(/= (-?\d+)$/)[1]);
for(const [ac,outcome] of [[total+2,'промах'],[total,'половина урона'],[total-2,'полный урон']]) {
 await page.fill('#check-ac',String(ac));assert.ok((await page.locator('#check-result').innerText()).includes(outcome));
}
for(const edge of ['plus2','plus3','minus2','minus3']){await page.selectOption('#check-edge',edge);assert.equal(await page.locator('#check-roll').isDisabled(),true);assert.match(await page.locator('#check-formula').innerText(),/не уточнена/);}
await page.selectOption('#check-edge','plain');await page.selectOption('#check-modifier','save:Ловкость');await page.click('#check-roll');assert.match(await page.locator('#check-result').innerText(),/Уклонение не применяется/);
await page.evaluate(()=>KATAR_PORTAL.showView('sheet'));await page.locator('.soul-rules summary').click();
await page.fill('#stress-total','12');await page.locator('#stress-total').dispatchEvent('change');
await page.click('#stress-fail');assert.equal(await page.locator('.quick-values .tile:nth-child(2) .uline').first().innerText(),'1');
assert.equal(await page.locator('#stress-total').inputValue(),'12');
// Left skull, rejection of >5 and of a second mark in the same string.
await page.selectOption('#focus-string','0');await page.selectOption('#focus-side','0');await page.click('#stress-focus');
const b=page.locator('.soulbar').nth(0);assert.equal(await b.locator('.mark.on').count(),1);
await b.locator('[data-n="9"]').click({force:true});assert.equal(await b.locator('.pip:not(.mark).on').count(),0);
await b.locator('.mark').nth(1).click();assert.equal(await b.locator('.mark.on').count(),1);assert.match(await page.locator('#soul-rules-status').innerText(),/нельзя/);
// Right skull normalizes a blank string to 6 and blocks decrementing it.
await page.selectOption('#focus-string','1');await page.selectOption('#focus-side','1');await page.click('#stress-focus');
const right=page.locator('.soulbar').nth(1);assert.equal(await right.locator('.pip:not(.mark).on').count(),6);
await right.locator('[data-n="6"]').click();assert.equal(await right.locator('.pip:not(.mark).on').count(),6);
await page.evaluate(()=>KATAR_PORTAL.save(true));await page.reload();await page.waitForFunction(()=>window.KATAR_PORTAL&&document.querySelector('#stress-total').value==='12');
assert.equal(await right.locator('.pip:not(.mark).on').count(),6);assert.equal(await right.locator('.mark.on').count(),1);
assert.equal(await page.locator('.quick-values .tile:nth-child(2) .uline').first().innerText(),'1');
// Import/export and migration: preserve old field positions, repair illegal legacy marks.
await page.evaluate(async()=>{
 const s=KATAR_PORTAL.snapshot();delete s.modules.rulesV2;
 const pips=[...document.querySelectorAll('.sheet .pip')],first=[...document.querySelectorAll('.soulbar .mark')].slice(0,2);
 for(const n of first)s.pips[pips.indexOf(n)]=true;
 await KATAR_PORTAL.restore(s,false);KATAR_PORTAL.save(true);
});
assert.equal(await b.locator('.mark.on').count(),1);assert.equal(await b.locator('.mark').first().getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#stress-total').inputValue(),'10');
assert.equal(await page.locator('#view-gm,#bestiary-data,#gm-encounter-data').count(),0);
for(const width of [390,768,1440]) {
 await page.setViewportSize({width,height:1000});
 for(const view of ['rules','sheet','combat']){await page.evaluate(v=>KATAR_PORTAL.showView(v),view);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),view+' overflow '+width);}
}
await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>KATAR_PORTAL.showView('sheet'));await page.screenshot({path:'/tmp/katarsis-rules-sheet.png',fullPage:true});
await page.goto(base+'/gm/tools#bestiary');await page.waitForFunction(()=>!!window.KATAR_PORTAL);await page.waitForSelector('#be-tag');
await page.selectOption('#be-tag','Зверь');assert.equal(await page.locator('.be-card').count(),0);await page.click('#be-reset');assert.equal(await page.locator('.be-card').count(),16);
await page.locator('[data-enemy="south-gunner"] .be-card-actions button').first().click();assert.match(await page.locator('#be-dialog-body').innerText(),/к20 \+ Стрельба/);await page.click('#be-dialog-close');
for(const path of ['/gm/adventure','/gm/handouts.pdf','/build/materials/lipotaktis.html','/build/materials/handouts.pdf'])assert.equal((await context.request.get(base+path)).status(),404,path);for(const path of ['/lipotaktis','/lipotaktis/master','/lipotaktis/pregens','/lipotaktis/players.pdf','/lipotaktis/hohotun-scenes.pdf','/lipotaktis/catharsis'])assert.equal((await context.request.get(base+path)).status(),200,path);
assert.deepEqual(errors,[]);console.log('PASS: 31 skills + 8 saves, ±к6, unknown degrees blocked, AC thresholds, stress/Will/MЗ=1, concentration, exclusive skull limits, save/reload and legacy import, mobile layouts, GM attacks/tags, Lipotaktis routes and closed legacy build paths.');
await browser.close();
