from pathlib import Path
from bs4 import BeautifulSoup
site=Path(__file__).resolve().parents[1];p=site/'КАТАРСИС.html';s=BeautifulSoup(p.read_text(),'html.parser')
for kind,file,ident in [('style','dice-table.css','dice-table-style'),('script','dice-table.js','dice-table-script')]:
 old=s.find(id=ident)
 if old:old.decompose()
 el=s.new_tag(kind,id=ident);el.string=(site/'scripts'/file).read_text();(s.head if kind=='style' else s.body).append(el)
p.write_text(str(s));print('Visual dice table installed; original stats engine unchanged.')
