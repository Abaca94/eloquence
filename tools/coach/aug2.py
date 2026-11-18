import json, sys
sys.path.insert(0, '/home/claude/eloquence/tools')
from gen_phonemes import tokenize
import phonemizer, espeakng_loader
from phonemizer.backend.espeak.wrapper import EspeakWrapper
from kokoro_onnx.config import DEFAULT_VOCAB
EspeakWrapper.set_data_path(espeakng_loader.get_data_path()); EspeakWrapper.set_library(espeakng_loader.get_library_path())
lex=json.load(open('lex.json'))
C="don't can't won't isn't aren't wasn't weren't doesn't didn't haven't hasn't hadn't wouldn't couldn't shouldn't mustn't needn't i'm you're we're they're it's that's there's what's who's let's i've you've we've they've i'll you'll we'll they'll he's she's i'd you'd we'd they'd he'll she'll it'll that'll here's where's how's".split()
ph=phonemizer.phonemize(C,'en-us',preserve_punctuation=True,with_stress=True)
for w,p in zip(C,ph):
    p=p.strip(); toks,st=tokenize(p)
    if toks and ' ' not in p: lex[w]=[''.join(c for c in p if c in DEFAULT_VOCAB),' '.join(toks),st,1]
json.dump(dict(sorted(lex.items())),open('lex.json','w'),ensure_ascii=False,separators=(',',':'))
print(lex["don't"],lex["i'm"],lex.get("we'll"))
