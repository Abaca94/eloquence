import gzip, re, json, time, sys
sys.path.insert(0, '/home/claude/eloquence/tools')
from gen_phonemes import tokenize            # même découpage que les références de phrases
import phonemizer, espeakng_loader
from phonemizer.backend.espeak.wrapper import EspeakWrapper
from kokoro_onnx.config import DEFAULT_VOCAB
EspeakWrapper.set_data_path(espeakng_loader.get_data_path()); EspeakWrapper.set_library(espeakng_loader.get_library_path())
# lemmes OEWN
lem=set()
for m in re.finditer(rb'<Lemma writtenForm="([^"]+)"', gzip.open('/home/claude/dl/oewn.xml.gz').read()):
    w=m.group(1).decode().lower()
    if re.fullmatch(r"[a-z][a-z'\-]*", w): lem.add(w)
print('oewn lemmas', len(lem))
cmu=set()
for line in open('cmudict.dict', encoding='utf8'):
    w=line.split()[0]
    if '(' in w: continue
    if re.fullmatch(r"[a-z][a-z']*", w): cmu.add(w)
SUF=['s','es','ed','d','ing','er','ers','est','ly','ies','ied','ation','ment','ments',"'s"]
def ok(w):
    if w in lem: return True
    for s in SUF:
        if w.endswith(s) and len(w)-len(s)>=2:
            b=w[:-len(s)]
            if b in lem or b+'e' in lem or (s in('ies','ied') and b+'y' in lem) or (len(b)>2 and b[-1]==b[-2] and b[:-1] in lem): return True
    return False
words=sorted(w for w in cmu if ok(w)) + sorted(w for w in lem if '-' not in w and "'" not in w and w not in cmu and len(w)>2)
words=sorted(set(words))
print('words', len(words))
t=time.time()
ph=phonemizer.phonemize(words, 'en-us', preserve_punctuation=True, with_stress=True, njobs=4)
print('phonemized', time.time()-t)
lex={}
for w,p in zip(words,ph):
    p=p.strip()
    if not p or ' ' in p: continue          # mots qu'eSpeak découpe : ignorés
    kp=''.join(c for c in p if c in DEFAULT_VOCAB)
    toks,st=tokenize(p)
    if not toks: continue
    lex[w]=[kp, ' '.join(toks), st]
json.dump(lex, open('lex.json','w'), ensure_ascii=False, separators=(',',':'))
print(len(lex), lex.get('thorough'), lex.get('worcestershire'))
