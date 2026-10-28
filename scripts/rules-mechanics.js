/* Катарсис: уточнения автора, 24.10.2026. Embedded in the autonomous source. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const hooks = window.KATAR_HOOKS = window.KATAR_HOOKS || {};
const bars = [...document.querySelectorAll('.soulbar')];
const stressBar = document.querySelector('.bar.stress');
const points = b => [...b.querySelectorAll('.pip:not(.mark)')];
const value = b => points(b).filter(p => p.classList.contains('on')).length;
const marks = b => [...b.querySelectorAll('.mark')];
const number = v => { const t=String(v).trim().replaceAll('−','-'); return /^[+-]?\d+$/.test(t) && Number.isSafeInteger(Number(t)) ? Number(t) : null; };
const signed = n => n >= 0 ? '+'+n : String(n).replace('-','−');
let stress = value(stressBar), normalizing = false, lastRoll = null;
function paint(b,n) { points(b).forEach((p,i) => p.classList.toggle('on',i<n)); }
function persist() { window.KATAR_PORTAL?.save(true); }
function announce(t) { $('soul-rules-status').textContent=t; }
function limits(b) { const [left,right]=marks(b); return [right.classList.contains('on')?6:0,left.classList.contains('on')?5:10]; }
function normalize() {
 if(normalizing)return;normalizing=true;
 for(const b of bars) {
  const [left,right]=marks(b);
  if(left.classList.contains('on') && right.classList.contains('on')) {
   right.classList.remove('on');announce('В старом сохранении были оба черепа одной струны. Оставлен левый (предел 5); при необходимости исправьте отметку вручную.');
  }
  const [min,max]=limits(b);paint(b,Math.max(min,Math.min(max,value(b))));
  marks(b).forEach((p,i)=>{p.setAttribute('aria-pressed',String(p.classList.contains('on')));p.title=i?'Правый череп: минимум 6':'Левый череп: максимум 5';p.setAttribute('aria-label',b.closest('.cell').querySelector('.scale-lab').textContent+': '+p.title);});
  points(b).forEach(p=>{const n=Number(p.dataset.n);p.setAttribute('aria-disabled',String(n<min||n>max));p.title=n<min||n>max?'Значение ограничено закрашенным черепом':'Значение '+n;});
 }
 normalizing=false;
}
function stressUI() {
 $('stress-total').value=String(stress);
 paint(stressBar,Math.min(10,stress));
 $('stress-state').textContent=stress>=10?'Стресс '+stress+': проверка Воли либо действие на сосредоточение.':'Стресс '+stress+'. Проверка по общему порогу требуется при 10 и выше.';
 $('stress-fail').disabled=stress<10;$('stress-success').disabled=stress<10;$('stress-focus').disabled=stress<10;
}
// Manual sheet editing remains available. Removing a mark corrects the record;
// it is not a newly introduced in-game recovery rule.
document.querySelectorAll('.bar').forEach(b=>b.addEventListener('click',e=>{
 const p=e.target.closest('.pip');if(!p||!b.contains(p))return;
 if(p.classList.contains('mark')) {
  const pair=marks(b),other=pair.find(x=>x!==p);
  if(other?.classList.contains('on')) {announce('Оба черепа одной струны закрашивать нельзя. Выберите другую струну или исправьте ошибочную отметку.');return;}
  if(p.classList.contains('on') && !confirm('Снять отметку как исправление листа? Это не игровое восстановление: способ снятия черепов общими правилами пока не установлен.'))return;
  p.classList.toggle('on');normalize();persist();return;
 }
 const n=Number(p.dataset.n),old=value(b),next=old===n?n-1:n;
 if(b.classList.contains('soulbar')) {
  const [min,max]=limits(b);if(next<min||next>max) {announce('Закрашенный череп ограничивает струну: '+(min===6?'не ниже 6.':'не выше 5.'));return;}
 }
 paint(b,next);
 if(b===stressBar){stress=next;stressUI();}
 persist();
}));
$('stress-total').addEventListener('change',()=>{
 const n=number($('stress-total').value);if(n===null||n<0){$('stress-state').textContent='Введите целое неотрицательное значение стресса.';return;}
 stress=n;stressUI();persist();
});
$('stress-fail').onclick=()=>{
 if(stress<10)return;
 if(!confirm('Мастер подтвердил провал проверки Воли? Текущее Ментальное здоровье станет 1. Стресс не изменится.'))return;
 const field=document.querySelector('.quick-values .tile:nth-child(2) .uline');field.textContent='1';field.dispatchEvent(new Event('input',{bubbles:true}));
 $('stress-outcome').textContent='Провал подтверждён: текущее МЗ = 1. Стресс не сброшен; дополнительные последствия не назначены.';persist();
};
$('stress-success').onclick=()=>{if(stress>=10)$('stress-outcome').textContent='Успех проверки подтверждён. МЗ и стресс не изменены.';};
$('stress-focus').onclick=()=>{
 if(stress<10)return;
 const b=bars[Number($('focus-string').value)],side=Number($('focus-side').value),p=marks(b)[side];
 if(marks(b).some(x=>x.classList.contains('on'))) {$('stress-outcome').textContent='В этой струне уже есть череп. Выберите другую струну без отметок.';return;}
 if(!confirm('Вместо проверки Воли потратить 1 действие на сосредоточение и закрасить '+(side?'правый':'левый')+' череп? Струна: '+b.closest('.cell').querySelector('.scale-lab').textContent+'. Счёт действий ведётся вручную.'))return;
 p.classList.add('on');normalize();$('stress-outcome').textContent='Сосредоточение: закрашен '+(side?'правый череп; минимум струны 6.':'левый череп; максимум струны 5.')+' Учтите 1 потраченное действие. Стресс и МЗ не изменены.';persist();
};
const observer=new MutationObserver(()=>normalize());
bars.forEach(b=>observer.observe(b,{subtree:true,attributes:true,attributeFilter:['class']}));
hooks.rulesV2={get:()=>({stress}),set:data=>{
 const n=number(data?.stress);stress=n!==null&&n>=0?n:value(stressBar);normalize();stressUI();$('stress-outcome').textContent='';
}};
function modifier(kind,name) {
 if(kind==='skill')return number([...document.querySelectorAll('.skill-item')].find(n=>n.querySelector('label')?.textContent.trim()===name)?.querySelector('.skill-score')?.textContent||'');
 return number([...document.querySelectorAll('.stat')].find(n=>n.querySelector('.nm')?.textContent.trim()===name)?.querySelector('.mod .uline')?.textContent||'');
}
const group=document.createElement('optgroup');group.label='Навыки';
for(const item of document.querySelectorAll('.skill-item')) {
 const name=item.querySelector('label')?.textContent.trim();if(!name)continue;
 const o=document.createElement('option');o.value='skill:'+name;o.textContent=name;group.append(o);
}
$('check-modifier').append(group);
const saves=document.createElement('optgroup');saves.label='Спасброски характеристик';
for(const item of document.querySelectorAll('.stat')) {
 const name=item.querySelector('.nm')?.textContent.trim();if(!name)continue;
 const o=document.createElement('option');o.value='save:'+name;o.textContent=name;saves.append(o);
}
$('check-modifier').append(saves);$('check-modifier').value='skill:Фехтование';
function checkUI() {
 const [kind,name]=$('check-modifier').value.split(':'),m=modifier(kind,name),degree=$('check-edge').value;
 const unknown=degree.endsWith('2')||degree.endsWith('3');
 $('check-roll').disabled=unknown||m===null;
 $('check-formula').textContent=unknown?'Для 2-й и 3-й степеней формула пока не уточнена. Автоматический бросок недоступен.':m===null?'Сначала заполните '+name+' в листе персонажа.':'к20 '+signed(m)+(degree==='plus1'?' + к6':degree==='minus1'?' − к6':'')+' · '+(kind==='save'?'спасбросок: ':'навык: ')+name;
 $('stress-will').textContent='Воля: '+(modifier('skill','Воля')===null?'заполните навык в листе':signed(modifier('skill','Воля')))+'. Сложность и исход определяет Мастер.';
}
function die(sides) { const a=new Uint32Array(1),limit=Math.floor(4294967296/sides)*sides;do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%sides+1; }
function hitResult() {
 if(!lastRoll)return;
 const ac=number($('check-ac').value);let text=lastRoll.text;
 if(lastRoll.kind==='save'&&ac!==null)text+=' · КД не применяется к спасброску.';
 else if(ac!==null)text+=' · КД '+ac+': '+(lastRoll.total<=ac-2?'промах':lastRoll.total>=ac+2?'полный урон':'половина урона');
 $('check-result').textContent=text;
}
$('check-roll').onclick=()=>{
 checkUI();if($('check-roll').disabled)return;
 const [kind,name]=$('check-modifier').value.split(':'),m=modifier(kind,name),d20=die(20),edge=$('check-edge').value,d6=edge==='plain'?0:die(6),sign=edge==='minus1'?-1:1,total=d20+m+sign*d6;
 lastRoll={kind,total,text:name+': к20 ('+d20+') '+signed(m)+(d6?' '+(sign<0?'−':'+')+' к6 ('+d6+')':'')+' = '+total};hitResult();
};
for(const id of ['check-modifier','check-edge'])$(id).addEventListener('change',()=>{lastRoll=null;$('check-result').textContent='';checkUI();});
$('check-ac').addEventListener('input',hitResult);
$('stress-roll-will').onclick=()=>{
 window.KATAR_PORTAL?.showView('rules');$('rules-skills').open=true;$('check-modifier').value='skill:Воля';$('check-edge').value='plain';$('check-ac').value='';lastRoll=null;$('check-result').textContent='';checkUI();$('check-tools').scrollIntoView({block:'center'});$('check-modifier').focus();
};
document.addEventListener('input',checkUI);document.addEventListener('change',checkUI);
const sheetObserver=new MutationObserver(checkUI);document.querySelectorAll('.skill-score,.stat .mod .uline').forEach(n=>sheetObserver.observe(n,{subtree:true,childList:true,characterData:true}));
normalize();stressUI();checkUI();
})();
