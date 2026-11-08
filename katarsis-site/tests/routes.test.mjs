import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import worker from '../src/worker.mjs';

const env={ASSETS:{fetch:async r=>{const path=new URL(r.url).pathname;const type=path.endsWith('.css')?'text/css; charset=utf-8':path.endsWith('.js')?'application/javascript; charset=utf-8':'text/html; charset=utf-8';return new Response('ASSET:'+path,{headers:{'Content-Type':type}});}}};
const req=p=>new Request('https://katarsis.example'+p);

async function publicPages(){
  const dir=new URL('../web/',import.meta.url);
  const names=(await readdir(dir)).filter(n=>n.endsWith('.html'));
  return Promise.all(names.map(async n=>({name:n,html:await readFile(new URL(n,dir),'utf8')})));
}

function internalRefs(html){
  return [...html.matchAll(/(?:href|src)="(\/[^"#?]*)"/g)].map(m=>m[1]);
}

test('every local link and asset referenced by public pages is routed',async()=>{
  const missing=[];
  for(const {name,html} of await publicPages()){
    for(const path of new Set(internalRefs(html))){
      if(path==='/'||path==='')continue;
      const response=await worker.fetch(req(path),env);
      if(response.status!==200)missing.push(`${name}: ${path} → ${response.status}`);
    }
  }
  assert.deepEqual(missing,[],`Немашрутизированные ссылки:\n${missing.join('\n')}`);
});

test('the polish stylesheet of the landing and GM pages is served',async()=>{
  const response=await worker.fetch(req('/site-polish.css'),env);
  assert.equal(response.status,200);
  assert.equal(await response.text(),'ASSET:/site-polish.css');
  assert.match(response.headers.get('Content-Type')||'',/text\/css/);
});
