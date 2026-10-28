"""Idempotent additive accounting module and small explicit calculation bridges."""
from pathlib import Path
from bs4 import BeautifulSoup
import json
site=Path(__file__).resolve().parents[1];p=site/'КАТАРСИС.html';s=BeautifulSoup(p.read_text(),'html.parser')
for sc in s.select('script'):
 t=sc.string or ''
 if 'function snapshot(){const modules={}' in t and "hooks.fullplay?.set" not in t:
  t=t.replace('hooks.playTools?.set(data.modules.playTools||{});','hooks.playTools?.set(data.modules.playTools||{});\n hooks.fullplay?.set(data.modules.fullplay||{});')
 if 'const config=[[\'Стойкость\'' in t and 'healthDerived' not in t:
  t=t.replace('config.forEach(([name,tile])=>{','const refreshers=[];\n config.forEach(([name,tile])=>{')
  t=t.replace('String(10+Number(raw))',"String(10+Number(raw)+(window.KATAR_HOOKS?.fullplay?.healthBonus(name==='Стойкость'?'hp':'mp')||0))")
  t=t.replace('  new MutationObserver(update)', '  refreshers.push(update);\n  new MutationObserver(update)')
  t=t.replace(' });\n})();'," });\n (window.KATAR_HOOKS ||= {}).healthDerived={get:()=>({}),set:()=>refreshers.forEach(f=>f()),refresh:()=>refreshers.forEach(f=>f())};\n})();")
 if "const config=[['Стойкость'" in t and 'healthDerived' in t:
  t=t.replace('`10 + ${name} (${raw}) = ${value}`',"`10 + ${name} (${raw}) + ${window.KATAR_HOOKS?.fullplay?.healthBonus(name==='Стойкость'?'hp':'mp')||0} (особенности) = ${value}`")
 if 'const controlIds=' in t and 'derived-speed-formula' in t and 'fullplay' not in t:
  t=t.replace("const defense=10+armor+shield+helmet+num('defense-adjust')+conditional;","const fullDefense=window.KATAR_HOOKS?.fullplay?.effectBonus('defense')||0,fullSpeed=window.KATAR_HOOKS?.fullplay?.effectBonus('speed')||0;\n const defense=10+armor+shield+helmet+num('defense-adjust')+conditional+fullDefense;")
  t=t.replace("num('speed-adjust')-appliedPenalty","num('speed-adjust')+fullSpeed-appliedPenalty")
  t=t.replace('${conditional?\' + 1 (Быстроног)\':\'\'} = ${defense}',"${conditional?' + 1 (Быстроног)':''}${fullDefense?' + ('+fmt(fullDefense)+', активные эффекты)':''} = ${defense}")
  t=t.replace("${appliedPenalty?' − '","${fullSpeed?' + ('+fmt(fullSpeed)+', активные эффекты)':''}${appliedPenalty?' − '")
 if sc.get('id')=='author-rules-engine' and 'fullplay' not in t:
  t=t.replace('function stressUI() {',"const threshold=()=>hooks.fullplay?.stressThreshold()||10;\nfunction stressUI() {\n const cap=hooks.fullplay?.stressCap();if(cap!==null&&cap!==undefined)stress=Math.min(stress,cap);")
  t=t.replace('stress>=10','stress>=threshold()').replace('stress<10','stress<threshold()')
  t=t.replace("'. Проверка по общему порогу требуется при 10 и выше.'","'. Проверка требуется при '+threshold()+' и выше.'")
  t=t.replace('function modifier(kind,name) {','function rawModifier(kind,name) {')
  needle='const group=document.createElement(\'optgroup\');'
  bridge="""function modifier(kind,name){const replacement=hooks.fullplay?.replacement(kind,name);const value=rawModifier(replacement?'save':kind,replacement||name);return value===null?null:value+(hooks.fullplay?.checkBonus(kind,name)||0);}
"""
  t=t.replace(needle,bridge+needle)
  t=t.replace("lastRoll={kind,total,text:name+': к20 ('+d20+') '+signed(m)+(d6?' '+(sign<0?'−':'+')+' к6 ('+d6+')':'')+' = '+total}","lastRoll={kind,total,text:name+': к20 ('+d20+') '+signed(m)+(d6?' '+(sign<0?'−':'+')+' к6 ('+d6+')':'')+' = '+total+(hooks.fullplay?.criticalLabel(d20)||'')}")
  t=t.replace('normalize();stressUI();checkUI();\n})();',"hooks.rulesV2.refresh=()=>{stressUI();checkUI();};\ndocument.addEventListener('fullplay:updated',checkUI);\nnormalize();stressUI();checkUI();\n})();")
 if 'hooks.fullplay?.set(data.modules.fullplay||{});' in t and 'KATAR_BOOT_FULLPLAY' not in t:
  t=t.replace('hooks.fullplay?.set(data.modules.fullplay||{});',"if(!hooks.fullplay)window.KATAR_BOOT_FULLPLAY=data.modules.fullplay||{};hooks.fullplay?.set(data.modules.fullplay||{});")
 if 'function snapshot(){const modules={}' in t:
  bridge="if(!hooks.fullplay)window.KATAR_BOOT_FULLPLAY=data.modules.fullplay||{};hooks.fullplay?.set(data.modules.fullplay||{});"
  # Hydrate feature policies BEFORE restoring stress; the previous hero's policy must never clamp the incoming one.
  if bridge in t and t.index(bridge)>t.index('if(hooks.rulesV2)hooks.rulesV2.set(data.modules.rulesV2||{});'):
   t=t.replace(bridge,'')
   t=t.replace('if(hooks.rulesV2)hooks.rulesV2.set(data.modules.rulesV2||{});',bridge+'\n if(hooks.rulesV2)hooks.rulesV2.set(data.modules.rulesV2||{});')
 if t!=(sc.string or ''):sc.string=t
for ident in ['fullplay-style','fullplay-proposal-data','fullplay-script']:
 n=s.find(id=ident)
 if n:n.decompose()
st=s.new_tag('style',id='fullplay-style');st.string=(site/'scripts/fullplay.css').read_text();s.head.append(st)
d=s.new_tag('script',id='fullplay-proposal-data',type='application/json');d.string=(site/'scripts/fullplay-proposals.json').read_text();s.body.append(d)
sc=s.new_tag('script',id='fullplay-script');sc.string=(site/'scripts/fullplay.js').read_text();s.body.append(sc)
p.write_text(str(s));print('Full-play module and explicit health/defense/check/restore bridges installed.')
