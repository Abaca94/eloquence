#!/usr/bin/env python3
"""Génère js/phonemes.js : la transcription attendue (sons eSpeak, anglais américain)
de chaque phrase de js/data.js, mot par mot, avec la voyelle accentuée.

Le modèle de reconnaissance de phonèmes (wav2vec2 « espeak-cv-ft ») a été entraîné
sur des transcriptions eSpeak : on utilise donc eSpeak NG pour produire la référence.

Usage : python3 tools/gen_phonemes.py   (nécessite espeak-ng et node)
"""
import json, re, subprocess, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
# Jetons anglais du vocabulaire du modèle (les plus longs d'abord pour le découpage)
TOKENS = sorted(['p','b','t','d','k','ɡ','ɾ','ʔ','m','n','ŋ','f','v','θ','ð','s','z','ʃ','ʒ','h','tʃ','dʒ',
  'l','ɹ','w','j','iː','i','ɪ','ᵻ','eɪ','ɛ','æ','ɑː','ɑ','ɔː','ɔ','oʊ','ʊ','uː','u','ʌ','ə','ɐ','ɚ','ɜː',
  'aɪ','aʊ','ɔɪ','əl','ɑːɹ','ɔːɹ','oːɹ','ɛɹ','ɪɹ','ʊɹ','aɪɚ','iə'], key=len, reverse=True)
VOWELS = {'iː','i','ɪ','ᵻ','eɪ','ɛ','æ','ɑː','ɑ','ɔː','ɔ','oʊ','ʊ','uː','u','ʌ','ə','ɐ','ɚ','ɜː','aɪ','aʊ','ɔɪ',
  'əl','ɑːɹ','ɔːɹ','oːɹ','ɛɹ','ɪɹ','ʊɹ','aɪɚ','iə'}

def espeak(text):
    return subprocess.run(['espeak-ng', '-v', 'en-us', '-q', '--ipa'], input=text,
                          capture_output=True, text=True, check=True).stdout.split()

def tokenize(ipa):
    """-> (jetons, index du jeton voyelle portant l'accent principal ou -1)"""
    ipa = ipa.replace('ˌ', '').replace('-', '').replace('‿', '')
    out, stress, pending, i = [], -1, False, 0
    while i < len(ipa):
        if ipa[i] == 'ˈ':
            pending = True; i += 1; continue
        for t in TOKENS:
            if ipa.startswith(t, i):
                if pending and t in VOWELS and stress < 0:
                    stress = len(out); pending = False
                out.append(t); i += len(t); break
        else:
            i += 1
    return out, stress

def words_of(sentence):
    return [w for w in re.findall(r"[A-Za-z0-9][A-Za-z0-9'’\-]*", sentence)]

def phrase_entry(sentence):
    words = words_of(sentence)
    ip = espeak(sentence)
    if len(ip) != len(words):           # découpage différent : mot par mot
        ip = [''.join(espeak(w)) for w in words]
    res = []
    for w, x in zip(words, ip):
        toks, st = tokenize(x)
        res.append([w, toks, st])
    return res

def main():
    js = (ROOT / 'js' / 'data.js').read_text()
    phrases = json.loads(subprocess.run(['node', '-e',
        js.replace('const ', 'var ') + ';process.stdout.write(JSON.stringify(PHRASES.map(p=>p.en)))'],
        capture_output=True, text=True, check=True).stdout)
    data = {p: phrase_entry(p) for p in phrases}
    out = ("/* Généré par tools/gen_phonemes.py — ne pas modifier à la main.\n"
           "   Pour chaque phrase : [mot, sons attendus (eSpeak, en-US), index de la voyelle accentuée]. */\n"
           "const PHONEMES = {\n" + ",\n".join(json.dumps(k, ensure_ascii=False) + ": " + json.dumps(v, ensure_ascii=False, separators=(",", ":"))
                                      for k, v in data.items()) + "\n};\n")
    (ROOT / 'js' / 'phonemes.js').write_text(out)
    print(len(data), 'phrases')

if __name__ == '__main__':
    main()
