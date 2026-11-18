import json, re, sys
sys.path.insert(0, '/home/claude/eloquence/tools')
from gen_phonemes import tokenize
import phonemizer, espeakng_loader
from phonemizer.backend.espeak.wrapper import EspeakWrapper
from kokoro_onnx.config import DEFAULT_VOCAB
EspeakWrapper.set_data_path(espeakng_loader.get_data_path()); EspeakWrapper.set_library(espeakng_loader.get_library_path())
lex=json.load(open('lex.json'))
cmu=set(l.split()[0] for l in open('cmudict.dict',encoding='utf8') if '(' not in l.split()[0])
rank={}
for i,l in enumerate(open('/home/claude/dl/freq/en_50k.txt')):
    rank.setdefault(l.split()[0],i+1)
miss=[w for w in rank if w not in lex and w in cmu and re.fullmatch(r"[a-z][a-z']*",w)]
print('missing',len(miss))
ph=phonemizer.phonemize(miss,'en-us',preserve_punctuation=True,with_stress=True,njobs=4)
for w,p in zip(miss,ph):
    p=p.strip()
    if not p or ' ' in p: continue
    toks,st=tokenize(p)
    if toks: lex[w]=[''.join(c for c in p if c in DEFAULT_VOCAB),' '.join(toks),st]
for w,v in lex.items(): v[3:]=[rank.get(w,0)]
json.dump(dict(sorted(lex.items())),open('lex.json','w'),ensure_ascii=False,separators=(',',':'))
print(len(lex),lex['the'],lex["don't"] if "don't" in lex else None, lex['thorough'])
