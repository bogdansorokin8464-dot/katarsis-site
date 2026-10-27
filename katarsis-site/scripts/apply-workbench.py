"""Idempotent, additive presentation layer. Does not modify game scripts."""
from pathlib import Path
from bs4 import BeautifulSoup
import base64,json
site=Path(__file__).resolve().parents[1];root=site.parent;p=root/'КАТАРСИС.html';source=p.read_text();s=BeautifulSoup(source,'html.parser');builder=s.find(id='view-builder')
if not builder.select_one('.desk-builder-heading'):
 heading=s.new_tag('div',attrs={'class':'desk-builder-heading'})
 for el in list(builder.children):
  if getattr(el,'get',None) and ('portal-eyebrow' in el.get('class',[]) or 'portal-page-title' in el.get('class',[]) or 'portal-lead' in el.get('class',[])):heading.append(el.extract())
 builder.insert(0,heading)
if not s.find(id='desk-preview-name'):
 rail=builder.select_one('.portal-wizard-nav');rail.append(BeautifulSoup('''<aside class="desk-character-preview" aria-label="Текущий персонаж"><span class="desk-preview-label">ТВОЙ ПЕРСОНАЖ</span><strong id="desk-preview-name">Новая история</strong><div class="desk-preview-details"><span id="desk-preview-omen">Знамение ещё не выбрано</span><span id="desk-preview-vocation">Призвание ещё не выбрано</span></div><button class="portal-button" type="button" id="desk-preview-sheet">Открыть лист ↗</button></aside>''','html.parser'))
script=next(x.string for x in s.select('script') if 'const OMEN_DATA = ' in (x.string or ''))
def data(name):
 marker='const '+name+' = ';i=script.index(marker)+len(marker);return json.JSONDecoder().raw_decode(script[i:])[0]
meta={'omens':{k:v['bonus'] for k,v in data('OMEN_DATA').items()},'vocations':{k:'Ключ: '+v['key'][0]+' · '+', '.join(x[0] for x in v['skills'][:2]) for k,v in data('VOCATION_DATA').items()}}
for ident in ['workbench-style','workbench-script','desk-choice-data']:
 el=s.find(id=ident)
 if el:el.decompose()
art=base64.b64encode((site/'web/assets/16f3a3680ec6b991aa1b5d80.webp').read_bytes()).decode();css='@media screen{:root{--desk-art:url(data:image/webp;base64,'+art+')}}\n'+(site/'scripts/workbench.css').read_text();style=s.new_tag('style',id='workbench-style');style.string=css;s.head.append(style)
d=s.new_tag('script',id='desk-choice-data',type='application/json');d.string=json.dumps(meta,ensure_ascii=False);s.body.append(d)
js=s.new_tag('script',id='workbench-script');js.string=(site/'scripts/workbench.js').read_text();s.body.append(js)
p.write_text(str(s));print('Workbench applied: screen-only CSS, builder heading, character preview, native-backed cards; existing mechanics untouched.')
