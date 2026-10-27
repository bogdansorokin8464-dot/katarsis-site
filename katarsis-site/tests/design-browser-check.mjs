import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 for(const width of [360,390,430,768,1440]){
  await page.setViewportSize({width,height:900});
  for(const route of ['/','/gm','/updates','/privacy','/terms','/not-a-page']){
   const response=await page.goto('http://localhost:3000'+route);assert.equal(response.status(),route==='/not-a-page'?404:200);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' overflow '+width);
   assert.equal(await page.locator('main').count(),1);assert.equal(await page.locator('h1').count(),1);
   assert.equal(await page.locator('.skip-link').count(),1);
  }
 }
 await page.setViewportSize({width:390,height:844});await page.goto('http://localhost:3000/');
 assert.equal(await page.locator('.home-hero .button').count(),1);
 assert.equal(await page.locator('.faq-item').count(),6);
 assert.equal(await page.locator('.directory-link').count(),6);
 await page.locator('.menu-toggle').click();assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'true');assert(await page.locator('main').evaluate(n=>n.inert));
 await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
 await page.screenshot({path:'/tmp/katar-design-menu.png'});
 await page.keyboard.press('Escape');assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');assert.equal(await page.evaluate(()=>document.activeElement.className),'menu-toggle');assert.equal(await page.locator('main').evaluate(n=>n.inert),false);
 await page.locator('.menu-toggle').click();await page.locator('#main-nav a').last().focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.className),'menu-toggle');await page.keyboard.press('Escape');
 await page.locator('#section-search').fill('снаряжение');assert.equal(await page.locator('.directory-link:visible').count(),1);
 await page.locator('#section-search').fill('неттакогораздела');assert(await page.locator('#search-empty').isVisible());await page.locator('#section-search').fill('');
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();assert.equal(await page.locator('html').evaluate(n=>n.classList.contains('motion-ready')),false);assert.equal(await page.locator('.reveal').first().evaluate(n=>getComputedStyle(n).opacity),'1');
 await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'/tmp/katar-design-home-mobile.png'});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/tmp/katar-design-home-desktop.png'});
 const urls=await page.locator('a[href^="/"]').evaluateAll(ns=>[...new Set(ns.map(n=>n.getAttribute('href').split('#')[0]))]);
 for(const route of urls){const r=await page.request.get('http://localhost:3000'+route);assert.equal(r.status(),200,route);}
 await page.goto('http://localhost:3000/play/#session');await page.waitForFunction(()=>KATAR_CHARACTERS?.isReady());assert.equal(await page.locator('#interface-polish-style').count(),1);
 const order=await page.locator('.portal-nav [data-view]').evaluateAll(ns=>ns.slice(0,4).map(n=>n.dataset.view));assert.deepEqual(order,['home','session','sheet','favorites']);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/katar-design-session-mobile.png'});
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const plain=await nojs.newPage();await plain.goto('http://localhost:3000/');assert(await plain.locator('#main-nav a').first().isVisible());assert(await plain.locator('.reveal').first().isVisible());assert(await plain.locator('.word-reveal').isVisible());assert(await plain.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await nojs.close();
 assert.deepEqual(errors,[]);
 console.log('PASS: six static pages at 360/390/430/768/1440; 404 status; one hero CTA; real navigation links; search/empty; menu/focus trap/Escape/inert; reduced motion; no-JS navigation; app navigation priority; no JS errors.');
}finally{await browser.close();}
