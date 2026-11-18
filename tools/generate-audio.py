import json, hashlib, subprocess, os, sys
from kokoro_onnx import Kokoro
import soundfile as sf
k=Kokoro("kokoro-v1.0.onnx","voices-v1.0.bin")
texts=json.load(open("texts.json"))
out="/home/claude/eloquence/audio"
idx={}
for voice in ["af_heart","am_michael"]:
    os.makedirs(f"{out}/{voice}",exist_ok=True)
    for t in texts:
        key=t["text"]+("|slow" if t["slow"] else "")
        h=hashlib.sha1(key.encode()).hexdigest()[:12]
        idx[key]=h
        mp3=f"{out}/{voice}/{h}.mp3"
        if os.path.exists(mp3): continue
        s,sr=k.create(t["text"],voice=voice,speed=0.72 if t["slow"] else 0.95,lang="en-us")
        sf.write("/tmp/claude-0/tmp.wav",s,sr) if os.path.isdir("/tmp/claude-0") else sf.write("tmp.wav",s,sr)
        src="/tmp/claude-0/tmp.wav" if os.path.isdir("/tmp/claude-0") else "tmp.wav"
        subprocess.run(["ffmpeg","-y","-loglevel","error","-i",src,"-af","loudnorm=I=-16:TP=-1.5:LRA=11","-ar","24000","-ac","1","-b:a","48k",mp3],check=True)
json.dump(idx,open("idx.json","w"))
print(len(idx))
