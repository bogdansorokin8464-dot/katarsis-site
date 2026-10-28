"""Self-contained companion landing for file downloads / offline preview."""
from pathlib import Path
from bs4 import BeautifulSoup
import base64,re,mimetypes
site=Path(__file__).resolve().parents[1];web=site/'web'
s=BeautifulSoup((web/'index.html').read_text(),'html.parser')
def uri(path):
 p=web/path.lstrip('/');mime=mimetypes.guess_type(str(p))[0] or 'application/octet-stream'
 if p.suffix=='.ttf':mime='font/ttf'
 return 'data:'+mime+';base64,'+base64.b64encode(p.read_bytes()).decode()
font=(web/'brand-font.css').read_text();font=re.sub(r'url\((/assets/[^)]+)\)',lambda m:'url('+uri(m[1])+')',font)
styles=font+'\n'+(web/'site.css').read_text().replace("@import url('/brand-font.css');",'')+'\n'+(web/'home.css').read_text()+'\n'+(web/'cinematic.css').read_text()
for link in list(s.select('link')):
 if link.get('rel')==['icon']:link['href']=uri(link['href'])
 else:link.decompose()
st=s.new_tag('style');st.string=styles;s.head.append(st)
for image in s.select('img[src^="/assets/"]'):image['src']=uri(image['src'])
for script in s.select('script[src]'):
 script.string=(web/script['src'].lstrip('/')).read_text();del script['src'];script.attrs.pop('defer',None)
for a in s.select('a[href]'):
 target=a['href']
 if target.startswith('/play/#'):a['href']='КАТАРСИС.html#'+target.split('#',1)[1]
 elif target=='/gm':a['href']='КАТАРСИС.html#gm'
 elif target=='/':a['href']='#main'
 elif target=='/updates':a['href']='#release-note'
 elif target in ['/privacy','/terms']:a['href']='#offline-'+target[1:]
for name,title in [('privacy','Данные и сохранения'),('terms','Об использовании')]:
 content=BeautifulSoup((web/(name+'.html')).read_text(),'html.parser').select_one('.legal-copy')
 content.select_one('a').decompose()
 details=s.new_tag('details',id='offline-'+name,attrs={'class':'panel'});summary=s.new_tag('summary');summary.string=title;details.append(summary);details.append(content);s.find('main').append(details)
label=s.new_tag('p',id='release-note',attrs={'class':'small'});label.string='Версия 2026.10.28.6 · Главная обновлена, правила и сохранения сохранены.';s.select_one('.footer').append(label)
(site/'Катарсис — главная.html').write_text(str(s))
print('Standalone landing exported with embedded images, fonts, styles and local game links.')
