import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import worker from '../src/worker.mjs';
const env={ASSETS:{fetch:async r=>new Response('ASSET:'+new URL(r.url).pathname,{headers:{'Content-Type':'text/html'}})}};
const req=(p,extra={})=>new Request('https://katarsis.example'+p,extra);
test('all GM materials open without cookies, configuration, or auth provider',async()=>{for(const [path,file] of [['/gm/tools','core.html']]){const r=await worker.fetch(req(path),env);assert.equal(r.status,200);assert.equal(await r.text(),'ASSET:/build/materials/'+file);assert.equal(r.headers.get('set-cookie'),null);}});
test('login is replaced with a redirect to open materials',async()=>{const r=await worker.fetch(req('/login'),env);assert.equal(r.status,302);assert.equal(r.headers.get('location'),'/gm');});
test('session endpoint describes open access without identity',async()=>{assert.deepEqual(await (await worker.fetch(req('/api/session'),env)).json(),{openAccess:true,authenticationRequired:false});});
test('public root, app and GM page are routed',async()=>{for(const path of ['/','/play/','/gm','/updates'])assert.equal((await worker.fetch(req(path),env)).status,200);});
test('master cards are links, not disabled login placeholders',async()=>{const h=await readFile(new URL('../web/gm.html',import.meta.url),'utf8');assert.ok(!h.includes('/gm/adventure'));assert.ok(!h.includes('aria-disabled'));assert.ok(!h.includes('id="logout"'));assert.ok(h.includes('Раздел открыт всем'));});
test('the site no longer posts passwords or wipes local GM notes',async()=>{const h=await readFile(new URL('../web/site.js',import.meta.url),'utf8');assert.ok(!h.includes('/api/login'));assert.ok(!h.includes('/api/logout'));assert.ok(!h.includes('clearGM'));});
test('no login or logout API remains',async()=>{assert.equal((await worker.fetch(req('/api/login',{method:'POST'}),env)).status,405);assert.equal((await worker.fetch(req('/api/logout',{method:'POST'}),env)).status,405);});
test('adventure PDF and helper are unavailable anonymously or via direct build paths',async()=>{for(const p of ['/gm/handouts.pdf','/gm/adventure','/build/materials/handouts.pdf','/build/materials/lipotaktis.html','/build/private/handouts.pdf']){assert.equal((await worker.fetch(req(p),env)).status,404,p);}});
test('assets can be cached, updated HTML must revalidate',async()=>{const asset=await worker.fetch(req('/assets/0123456789abcdef01234567.webp'),env),page=await worker.fetch(req('/gm/tools'),env);assert.match(asset.headers.get('Cache-Control'),/immutable/);assert.equal(page.headers.get('Cache-Control'),'no-cache');});
test('unknown paths still return 404 and files cannot be listed',async()=>{for(const p of ['/src/worker.mjs','/.dev.vars','/build/','/build/materials/core.html'])assert.equal((await worker.fetch(req(p),env)).status,404);});

test('removed adventure helper returns 404',async()=>{const r=await worker.fetch(req('/gm/adventure'),env);assert.equal(r.status,404);});

test('privacy and usage pages are public; unknown routes use only the branded 404 template',async()=>{
 for(const path of ['/privacy','/terms'])assert.equal((await worker.fetch(req(path),env)).status,200);
 const fetched=[];const safe={ASSETS:{fetch:async r=>{fetched.push(new URL(r.url).pathname);return new Response('Not found template');}}};
 const r=await worker.fetch(req('/build/materials/lipotaktis.html'),safe);
 assert.equal(r.status,404);assert.match(r.headers.get('Content-Type'),/text\/html/);assert.deepEqual(fetched,['/404.html']);
});
