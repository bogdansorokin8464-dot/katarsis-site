from pathlib import Path
from bs4 import BeautifulSoup
import json,re
site=Path(__file__).resolve().parents[1];root=site
# Adopt the author-approved clarifications in the source descriptions.
p=site/'scripts/fullplay-proposals.json';rules=json.loads(p.read_text())
for d in rules:
 d['title']=d['title'].replace(' — новая трактовка','')
 d['text']=re.sub(r'^(Предложение для обсуждения: |Предлагаемая стартовая таблица: |Предложение процедуры: |Предложение: )','',d['text'])
 for t in ['Включение предложения активирует эти два расчёта; ', 'Включение предложения открывает выбор замены характеристики; ', 'Эти значения — предложение, не прежняя авторская таблица.']:
  d['text']=d['text'].replace(t,'')
 d['text']=d['text'].replace('эту замену формулировки отдельно согласовать.','Это правило применяется к соответствующей проверке.').replace('Включение не прибавляет всё сразу:','Тактики не прибавляются все сразу:')
p.write_text(json.dumps(rules,ensure_ascii=False,indent=2));by={d['id']:d['text'] for d in rules}
p=root/'КАТАРСИС.html';s=BeautifulSoup(p.read_text(),'html.parser');sc=next(n for n in s.select('script') if 'const OMEN_DATA = ' in (n.string or ''));t=sc.string
for kind in ['OMEN_DATA','VOCATION_DATA']:
 marker='const '+kind+' = ';a=t.index(marker)+len(marker);data,n=json.JSONDecoder().raw_decode(t[a:])
 if kind=='OMEN_DATA':
  for group,d in data.items():
   for skill in d['skills']:
    if skill[0]=='Дьявольская удача':skill[2]=by['devil']
    if skill[0]=='Безумие':skill[2]=skill[2].split('\n\n')[0]+'\n\n'+by['stress']
 else:
  targets={'Боец':('fighter',True),'Свирепый':('fierce',True),'Алхимик':('alchemy',True),'Пивовар':('drinks',True),'Лекарь':('recipes',True),'Повар':('recipes',True),'Укротитель':('companion',True),'Охотник':('hunter',True),'Потомок':('heir',True),'Наставник':('definitions',True),'Талант':('definitions',True),'Выродок':('definitions',True)}
  for group,(rid,_) in targets.items():
   if group not in data:continue
   k=data[group]['key'];original=k[2].split('\n\n')[0];k[2]=by[rid] if group in ['Боец','Свирепый'] else original+'\n\n'+({'Наставник': 'До обучения запишите у каждого ученика срок выданного приёма и число применений. Отсутствие записи не делает приём постоянным или безлимитным.', 'Талант':'Для Дара подражания запишите образец, копируемый навык и срок копии. Магические умения и ключи не копируются.', 'Выродок':'До оплаты Лика изгоя и Слова страха запишите цели, дальность, длительность и условия сопротивления с Мастером.'}.get(group,by[rid]))
  for group,d in data.items():
   for skill in d['skills']:
    if skill[0]=='Во имя веры':skill[2]=skill[2].split('\n\n')[0]+'\n\n'+by['stress']
    if group=='Еретик' and skill[0]=='Чужой обряд':skill[2]=by['heretic']
    if group=='Свирепый' and skill[0]=='Устрашение':skill[2]='Преимущество на подходящую проверку запугивания Силой. Само по себе умение не гарантирует успеха.'
 t=t[:a]+json.dumps(data,ensure_ascii=False,indent=2)+t[a+n:]
sc.string=t;p.write_text(str(s))
