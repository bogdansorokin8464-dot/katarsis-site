(()=>{'use strict';
const CURRENT='2026.11.08.3',$=id=>document.getElementById(id);
const menu=document.querySelector('.menu-toggle'),nav=$('main-nav');
if(menu&&nav){
 let last=null;
 const regions=[...document.querySelectorAll('main,body>footer')];
 function close(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Открыть меню');document.body.classList.remove('menu-open');regions.forEach(n=>n.inert=false);}
 function open(){last=document.activeElement;nav.classList.add('open');menu.setAttribute('aria-expanded','true');menu.setAttribute('aria-label','Закрыть меню');document.body.classList.add('menu-open');regions.forEach(n=>n.inert=true);nav.querySelector('a')?.focus();}
 menu.onclick=()=>nav.classList.contains('open')?close():open();
 nav.querySelectorAll('a').forEach(a=>{if(new URL(a.href,location.href).pathname===location.pathname&&!new URL(a.href,location.href).hash)a.setAttribute('aria-current','page');a.addEventListener('click',()=>close());});
 document.addEventListener('keydown',e=>{if(!nav.classList.contains('open'))return;if(e.key==='Escape'){e.preventDefault();close();(last||menu).focus();}if(e.key==='Tab'){const items=[menu,...nav.querySelectorAll('a')],first=items[0],end=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();end.focus();}else if(!e.shiftKey&&document.activeElement===end){e.preventDefault();first.focus();}}});
 matchMedia('(min-width:701px)').addEventListener('change',e=>{if(e.matches)close();});
}
const search=$('section-search');if(search)search.addEventListener('input',()=>{const q=search.value.toLocaleLowerCase('ru').trim();let visible=0;document.querySelectorAll('[data-search]').forEach(c=>{c.hidden=!c.dataset.search.includes(q);if(!c.hidden)visible++;});$('search-empty').hidden=visible>0;});
if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
 try{
  const blocks=[...document.querySelectorAll('.reveal')];
  const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');observer.unobserve(e.target);}}),{threshold:.08});
  blocks.forEach(n=>observer.observe(n));
  const words=[];document.querySelectorAll('.word-reveal').forEach(block=>{const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const text of nodes){const fragment=document.createDocumentFragment();text.textContent.split(/(\s+)/).forEach(word=>{if(!word)return;if(/^\s+$/.test(word)){fragment.append(document.createTextNode(word));return;}const span=document.createElement('span');span.textContent=word;span.style.transitionDelay=(words.length*55)+'ms';words.push(span);fragment.append(span);});text.replaceWith(fragment);}});
  const wordObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');wordObserver.unobserve(e.target);}}),{threshold:.5,rootMargin:'0px 0px -10% 0px'});
  words.forEach(n=>wordObserver.observe(n));document.documentElement.classList.add('motion-ready');
 }catch{document.documentElement.classList.remove('motion-ready');}
}
let offered=false;
async function checkVersion(){if(document.hidden||offered)return;try{const r=await fetch('/api/version',{cache:'no-store'});if(!r.ok)return;const v=await r.json();if(v.id===CURRENT)return;offered=true;const box=document.createElement('aside');box.className='update-banner';box.setAttribute('role','status');const text=document.createElement('div');text.textContent='Доступна новая версия Катарсиса. Обновить сайт?';const apply=document.createElement('button');apply.className='button small';apply.textContent='Сохранить и обновить';apply.onclick=async()=>{apply.disabled=true;try{const saved=await window.KATAR_PORTAL?.save(true);if(saved===false)throw Error('save');location.reload();}catch{text.textContent='Не удалось сохранить персонажа. Экспортируй лист в JSON перед обновлением.';apply.disabled=false;}};const later=document.createElement('button');later.className='button secondary small';later.textContent='Позже';later.onclick=()=>box.remove();box.append(text,apply,later);document.body.append(box);}catch{}}
if(location.protocol!=='file:'){checkVersion();setInterval(checkVersion,60000);document.addEventListener('visibilitychange',checkVersion);}
})();
