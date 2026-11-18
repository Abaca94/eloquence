import json, os, collections, nltk
nltk.data.path.insert(0,'/home/claude/tts/nltk_data')
from nltk.corpus import wordnet as wn
lex=json.load(open('lex.json'))
fr=collections.defaultdict(list)
for line in open('nltk_data/corpora/omw-1.4/fra/wn-data-fra.tab',encoding='utf8'):
    if line.startswith('#'): continue
    p=line.rstrip('\n').split('\t')
    if len(p)==3 and p[1]=='fra:lemma': fr[p[0]].append(p[2].replace('_',' '))
P={'n':'n','v':'v','a':'adj','s':'adj','r':'adv'}
shards=collections.defaultdict(dict); n=0
for w in lex:
    ss=[s for s in wn.synsets(w) if w in [l.lower() for l in s.lemma_names()]]
    if not ss: continue
    out=[]
    for s in ss[:5]:
        off='%08d-%s'%(s.offset(), 'a' if s.pos()=='s' else s.pos())
        syn=[l.replace('_',' ') for l in s.lemma_names() if l.lower()!=w][:5]
        out.append([P[s.pos()], s.definition(), s.examples()[:2], syn, fr.get(off,[])[:4]])
    k=w[0] if w[0].isalpha() else '_'
    shards[k][w]=out; n+=1
tot=0
for k,d in shards.items():
    s=json.dumps(d,ensure_ascii=False,separators=(',',':')); open(f'sense/{k}.json','w').write(s); tot+=len(s)
print(n,'words', tot/1e6,'MB', max(os.path.getsize(f'sense/{k}.json') for k in shards)/1e6)
print(shards['e'].get('eventually'))
