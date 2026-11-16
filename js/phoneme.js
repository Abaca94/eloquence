/* ============================================================
   Éloquence — analyse fine de la prononciation, son par son.
   Modèle wav2vec2 « lv-60-espeak-cv-ft » (reconnaissance de phonèmes, Meta),
   version ONNX allégée, exécuté dans le navigateur avec onnxruntime-web.
   Téléchargé une seule fois depuis huggingface.co puis gardé sur l'appareil :
   l'audio ne quitte jamais l'appareil.
   ============================================================ */
(function (root) {
  "use strict";

  const MODEL_REPO = "https://huggingface.co/onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX/resolve/main/";
  const MODEL_FILE = "onnx/model_q4.onnx";
  const MODEL_URL = root.ELOQUENCE_MODEL_URL || MODEL_REPO + MODEL_FILE;   // surcharge possible pour les tests
  const MODEL_BYTES = 241691639;
  const ORT_BASE = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.29.0/dist/";
  const MODEL_CACHE = "eloquence-model-v1";

  /* Jetons anglais du vocabulaire du modèle (id dans vocab.json). */
  const VOCAB = { "n": 4, "s": 5, "t": 6, "ə": 7, "l": 8, "i": 10, "k": 11, "d": 12, "m": 13, "ɛ": 14, "ɾ": 15,
    "ɪ": 17, "p": 18, "ɐ": 20, "z": 21, "ð": 22, "f": 23, "j": 24, "v": 25, "b": 26, "ɹ": 27, "ʊ": 29,
    "iː": 30, "w": 32, "ʌ": 33, "u": 34, "ɡ": 35, "æ": 36, "aɪ": 37, "ʃ": 38, "h": 39, "ɔ": 40, "ɑː": 41,
    "ŋ": 42, "ɚ": 43, "eɪ": 44, "uː": 46, "oʊ": 49, "ᵻ": 50, "θ": 52, "aʊ": 53, "ɜ": 58, "ɑ": 59,
    "dʒ": 60, "əl": 61, "ɜː": 63, "ʒ": 65, "tʃ": 66, "ɔː": 67, "ɑːɹ": 68, "ɔːɹ": 71, "oːɹ": 77, "ʔ": 80,
    "iə": 81, "ɛɹ": 94, "ɪɹ": 97, "ɔɪ": 100, "ʊɹ": 104, "aɪɚ": 131 };
  const ID2TOK = {}; Object.keys(VOCAB).forEach(k => { ID2TOK[VOCAB[k]] = k; });
  const ALLOWED = [0].concat(Object.values(VOCAB));      // 0 = blanc CTC
  const VOWELS = new Set(["iː","i","ɪ","ᵻ","eɪ","ɛ","æ","ɑː","ɑ","ɔː","ɔ","oʊ","ʊ","uː","u","ʌ","ə","ɐ","ɚ",
    "ɜː","ɜ","aɪ","aʊ","ɔɪ","əl","ɑːɹ","ɔːɹ","oːɹ","ɛɹ","ɪɹ","ʊɹ","aɪɚ","iə"]);
  /* Voyelles réduites : jamais signalées (la forme pleine reste correcte). */
  const REDUCED = new Set(["ə", "ɐ", "ᵻ"]);
  /* Variantes acceptées pour un son attendu (prononciations natives courantes). */
  const VARIANTS = {
    "ɪ": ["ᵻ", "ə", "i"], "t": ["ɾ", "ʔ", "d"], "d": ["ɾ", "t"], "ɾ": ["t", "d"], "ɚ": ["ɜː", "ə"], "ɜː": ["ɚ"],
    "iː": ["i"], "i": ["iː", "ɪ"], "ɑː": ["ɑ", "ɔː", "ɔ"], "ɔː": ["ɑː", "ɔ", "ɑ"], "ɔ": ["ɑː", "ɔː"], "oʊ": [],
    "uː": ["u", "ʊ"], "u": ["uː"], "ʊ": ["u"], "ʌ": ["ə", "ɐ"], "əl": ["l", "ə"], "z": ["s"], "ŋ": [],
    "ɛɹ": ["ɛ"], "ɪɹ": ["ɪ", "iə", "iː"], "ʊɹ": ["ʊ", "uː"], "ɑːɹ": ["ɑː"], "ɔːɹ": ["ɔː", "oːɹ"],
    "oːɹ": ["ɔːɹ", "ɔː"], "aɪɚ": ["aɪ"], "iə": ["ɪ", "iː"], "ɹ": [], "h": []
  };
  /* Seuils de bonne prononciation (log-rapport de probabilités, voir README). */
  /* Seuils réglés sur 300 phrases d'adultes non natifs (speechocean762) et 73 phrases de natifs
     (LibriSpeech) : ~0,5 % de sons signalés à tort chez un natif. L'accent tonique est désactivé
     (stressRatio infini) : l'heuristique durée × énergie signalait 1 mot sur 6 à tort chez les natifs. */
  const CONFIG = { error: -4.0, warn: -2.5, stressRatio: Infinity };
  /* Mots grammaticaux souvent réduits à l'oral : leurs voyelles ne sont pas notées. */
  const FUNCTION_WORDS = new Set(("a an the to of for and or but are was were can could have has had do does at as " +
    "her him his them your you from that than some be been is it in on by with would should will just").split(" "));

  /* ---------- Conseils (son attendu → son entendu) ---------- */
  const SOUND_FR = {
    "θ": "th sourd [θ]", "ð": "th sonore [ð]", "s": "[s]", "z": "[z]", "t": "[t]", "d": "[d]", "f": "[f]", "v": "[v]",
    "h": "h soufflé [h]", "ɹ": "r américain [ɹ]", "w": "[w]", "ŋ": "[ŋ] de « sing »", "n": "[n]", "ɪ": "i bref [ɪ]",
    "iː": "i long [iː]", "i": "[i]", "æ": "a ouvert [æ] de « cat »", "ɛ": "è [ɛ]", "ʌ": "[ʌ] de « cup »", "ɑː": "a long [ɑː]",
    "ɔː": "[ɔː]", "ʊ": "ou bref [ʊ] de « good »", "uː": "ou long [uː]", "eɪ": "diphtongue [eɪ]", "oʊ": "diphtongue [oʊ]",
    "aɪ": "diphtongue [aɪ]", "aʊ": "diphtongue [aʊ]", "ɔɪ": "diphtongue [ɔɪ]", "ɚ": "[ɚ] (r vocalique)", "ɜː": "[ɝ] de « bird »",
    "p": "[p]", "b": "[b]", "k": "[k]", "ɡ": "[g]", "l": "[l]", "ʃ": "[ʃ]", "ʒ": "[ʒ]", "tʃ": "[tʃ]", "dʒ": "[dʒ]",
    "j": "[j]", "m": "[m]", "ɾ": "t battu [ɾ]", "ɑːɹ": "[ɑr] de « car »", "ɔːɹ": "[ɔr] de « more »", "oːɹ": "[ɔr]",
    "ɛɹ": "[ɛr] de « care »", "ɪɹ": "[ɪr] de « here »", "ʊɹ": "[ʊr] de « tour »", "aɪɚ": "[aɪɚ] de « fire »",
    "əl": "l syllabique", "iə": "[iə]", "ə": "schwa [ə]", "ɐ": "schwa [ə]", "ᵻ": "[ɪ] réduit", "-": "rien"
  };
  function soundName(t) { return SOUND_FR[t] || "[" + t + "]"; }
  const TIPS = {
    "θ>s": "Langue entre les dents, soufflez sans siffler : [θ] n'est pas [s].",
    "θ>t": "Ne bloquez pas l'air : pointe de langue entre les dents et soufflez en continu.",
    "θ>f": "La langue doit toucher les dents du haut, pas la lèvre inférieure.",
    "ð>z": "Langue entre les dents et faites vibrer la voix : [ð] n'est pas [z].",
    "ð>d": "Ne frappez pas le palais : laissez la langue entre les dents et prolongez le son.",
    "ð>v": "La langue contre les dents, pas la lèvre contre les dents.",
    "ɪ>iː": "Voyelle courte et relâchée, entre « i » et « é » : « ship », pas « sheep ».",
    "ɪ>i": "Voyelle courte et relâchée, entre « i » et « é » : « ship », pas « sheep ».",
    "ɪ>eɪ": "Plus court et plus relâché, sans glisser vers « é-i ».",
    "iː>ɪ": "Allongez et tendez les lèvres comme un sourire : « sheep », pas « ship ».",
    "æ>ɛ": "Ouvrez davantage la bouche, mâchoire basse : « bad » n'est pas « bed ».",
    "æ>ɑː": "Gardez la langue en avant, bouche large et ouverte, comme un « è » très ouvert.",
    "ɛ>æ": "Moins ouvert : un simple « è » français, mâchoire à mi-hauteur.",
    "ʌ>ɑː": "Plus court et plus central, bouche à peine ouverte : « cup », pas « cop ».",
    "ʌ>æ": "Son bref et neutre au centre de la bouche, sans écarter les lèvres.",
    "ʌ>ɔː": "N'arrondissez pas les lèvres : [ʌ] est un « eu » bref et détendu.",
    "ʊ>uː": "Plus court et relâché, lèvres moins arrondies : « full », pas « fool ».",
    "uː>ʊ": "Allongez le son et arrondissez bien les lèvres : « fool », pas « full ».",
    "eɪ>ɛ": "Faites glisser la voyelle : « é » vers « i », comme dans « day ».",
    "oʊ>ɔː": "Faites glisser la voyelle : « o » qui se ferme vers « ou ».",
    "oʊ>ɔ": "Faites glisser la voyelle : « o » qui se ferme vers « ou ».",
    "aɪ>æ": "Diphtongue complète : partez de « a » et glissez jusqu'à « i ».",
    "h>-": "Soufflez un vrai [h] avant la voyelle, comme sur une vitre.",
    "ŋ>n": "Le son se fait au fond de la gorge, langue relevée à l'arrière, sans [g] après.",
    "n>ŋ": "Pointe de langue derrière les dents du haut pour un [n] net.",
    "ɹ>-": "Prononcez le r américain : langue recourbée en arrière, sans toucher le palais.",
    "w>v": "Pas de contact dent-lèvre : arrondissez les lèvres comme pour « ou ».",
    "b>p": "Faites vibrer la voix dès le début du son.",
    "ɡ>k": "Faites vibrer la voix dès le début du son.",
    "d>t": "Faites vibrer la voix dès le début du son.",
    "z>s": "Faites vibrer la voix : [z] comme une abeille.",
    "v>f": "Faites vibrer la voix : [v] et non [f].",
    "p>b": "Pas de voix, mais un petit souffle après le [p] en début de syllabe accentuée.",
    "t>d": "Pas de voix, mais un petit souffle après le [t].",
    "k>ɡ": "Pas de voix, mais un petit souffle après le [k].",
    "ʃ>s": "Arrondissez les lèvres et reculez la langue : « ch » français.",
    "s>ʃ": "Lèvres étirées, pointe de langue derrière les dents : un [s] net.",
    "l>ɹ": "Pointe de langue contre le palais derrière les dents pour [l].",
    "ɹ>l": "La langue ne touche pas le palais pour le r américain.",
    "ɚ>ɑː": "Voyelle colorée en r : langue recourbée, bouche peu ouverte.",
    "ɜː>ɛ": "Voyelle colorée en r : langue recourbée, comme dans « bird ».",
  };
  function tipFor(exp, heard) {
    const k = exp + ">" + heard;
    if (TIPS[k]) return TIPS[k];
    if (heard === "-") return "Ce son semble manquer : articulez-le nettement.";
    if (/ɹ$/.test(exp) && exp.length > 1) return "N'oubliez pas le r américain après la voyelle : langue recourbée en arrière.";
    if (VOWELS.has(exp)) return "Écoutez le modèle en mode lent et comparez la voyelle de ce mot.";
    return "Écoutez le modèle en mode lent et isolez ce son avant de répéter le mot.";
  }

  /* ---------- Calculs ---------- */
  function normalizeAudio(x) {
    let m = 0; for (let i = 0; i < x.length; i++) m += x[i]; m /= x.length;
    let v = 0; for (let i = 0; i < x.length; i++) v += (x[i] - m) * (x[i] - m); v /= x.length;
    const s = 1 / Math.sqrt(v + 1e-7), out = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) out[i] = (x[i] - m) * s;
    return out;
  }
  /* logits [T × V] → log-probabilités sur les seuls jetons anglais. Renvoie un tableau de Float32Array (un par trame), indexé par id. */
  function logSoftmaxEnglish(data, T, V) {
    const rows = [];
    for (let t = 0; t < T; t++) {
      const off = t * V; let mx = -Infinity;
      for (const id of ALLOWED) if (data[off + id] > mx) mx = data[off + id];
      let sum = 0; for (const id of ALLOWED) sum += Math.exp(data[off + id] - mx);
      const lse = mx + Math.log(sum), row = new Float32Array(V).fill(-1e9);
      for (const id of ALLOWED) row[id] = data[off + id] - lse;
      rows.push(row);
    }
    return rows;
  }
  /* Alignement forcé CTC (Viterbi) des sons attendus → [début, fin] en trames pour chaque son. */
  function ctcAlign(lp, seq) {
    const T = lp.length, ext = [0];
    seq.forEach(s => { ext.push(VOCAB[s]); ext.push(0); });
    const S = ext.length, NEG = -1e30;
    let prev = new Float64Array(S).fill(NEG);
    const bp = Array.from({ length: T }, () => new Int8Array(S));
    prev[0] = lp[0][ext[0]]; if (S > 1) prev[1] = lp[0][ext[1]];
    for (let t = 1; t < T; t++) {
      const cur = new Float64Array(S).fill(NEG);
      for (let s = 0; s < S; s++) {
        let best = prev[s], b = 0;
        if (s >= 1 && prev[s - 1] > best) { best = prev[s - 1]; b = 1; }
        if (s >= 2 && ext[s] !== 0 && ext[s] !== ext[s - 2] && prev[s - 2] > best) { best = prev[s - 2]; b = 2; }
        cur[s] = best + lp[t][ext[s]]; bp[t][s] = b;
      }
      prev = cur;
    }
    let s = (S > 1 && prev[S - 2] > prev[S - 1]) ? S - 2 : S - 1;
    const spans = seq.map(() => [-1, -1]);
    for (let t = T - 1; t >= 0; t--) {
      if (s % 2 === 1) { const k = (s - 1) / 2; if (spans[k][1] < 0) spans[k][1] = t; spans[k][0] = t; }
      s -= bp[t][s];
    }
    return spans;
  }
  /* Score de chaque son : log(p(attendu ou variante)) - log(p(meilleur autre son)) autour de sa position. */
  function scoreSounds(lp, seq) {
    const spans = ctcAlign(lp, seq), T = lp.length;
    return seq.map((tok, k) => {
      const [a, b] = spans[k];
      if (a < 0) return { tok, gop: -10, heard: "-" };
      const ok = [VOCAB[tok]].concat((VARIANTS[tok] || []).filter(v => VOCAB[v]).map(v => VOCAB[v]));
      let pOk = 0, best = 0, heardId = 0;
      for (let t = Math.max(0, a - 1); t < Math.min(T, b + 2); t++) {
        const row = lp[t]; let po = 0;
        for (const id of ok) po += Math.exp(row[id]);
        if (po > pOk) pOk = po;
        for (const id of ALLOWED) {
          if (id === 0 || ok.includes(id)) continue;
          const p = Math.exp(row[id]); if (p > best) { best = p; heardId = id; }
        }
      }
      const gop = Math.log(pOk + 1e-6) - Math.log(Math.max(best, pOk) + 1e-6);
      return { tok, gop, heard: best > pOk ? ID2TOK[heardId] : tok, span: [a, b] };
    });
  }
  /* Accent tonique : la voyelle accentuée doit être la plus longue/forte du mot. */
  function vowelProminence(res, words, energy) {
    let k = 0;
    return words.map(([w, toks, stress]) => {
      const idx = toks.map((_, i) => k + i); k += toks.length;
      if (stress < 0) return null;
      const vow = idx.filter(i => VOWELS.has(res[i].tok));
      if (vow.length < 2) return null;
      const prom = vow.map(i => {
        const a = i > 0 && res[i - 1].span ? res[i - 1].span[1] + 1 : (res[i].span ? res[i].span[0] : 0);
        const b = i + 1 < res.length && res[i + 1].span ? res[i + 1].span[0] - 1 : (res[i].span ? res[i].span[1] : a);
        let e = 0, n = 0; for (let t = Math.max(0, a); t <= b && t < energy.length; t++) { e += energy[t]; n++; }
        return n ? (e / n) * Math.sqrt(n) : 0;
      });
      const target = vow.indexOf(idx[stress]);
      let top = 0; prom.forEach((p, i) => { if (p > prom[top]) top = i; });
      if (target < 0 || top === target) return { ok: true };
      return { ok: prom[top] < CONFIG.stressRatio * prom[target], strong: res[vow[top]].tok, syll: top, expected: target };
    });
  }
  /* Énergie RMS par trame de 20 ms (la cadence de sortie du modèle). */
  function frameEnergy(x, T) {
    const hop = x.length / T, out = new Float32Array(T);
    for (let t = 0; t < T; t++) {
      let e = 0, n = 0; for (let i = Math.floor(t * hop); i < Math.min(x.length, Math.floor((t + 1) * hop)); i++) { e += x[i] * x[i]; n++; }
      out[t] = n ? Math.sqrt(e / n) : 0;
    }
    return out;
  }

  /* Analyse complète : words = [[mot, [sons], indexAccent], …] */
  function analyse(logits, T, V, words, audio16k) {
    const lp = logSoftmaxEnglish(logits, T, V);
    const seq = []; words.forEach(w => w[1].forEach(t => { if (VOCAB[t]) seq.push(t); }));
    const clean = words.map(([w, toks, st]) => {
      const kept = toks.filter(t => VOCAB[t]);
      return [w, kept, st >= 0 ? kept.indexOf(toks[st]) : -1];
    });
    const res = scoreSounds(lp, seq);
    const stress = vowelProminence(res, clean, frameEnergy(audio16k, T));
    let k = 0, scored = 0, good = 0;
    const out = clean.map(([w, toks], wi) => {
      const fw = FUNCTION_WORDS.has(w.toLowerCase().replace(/[’']/g, "'"));
      const sounds = toks.map(() => res[k++]).map(r => {
        const skip = REDUCED.has(r.tok) || (fw && VOWELS.has(r.tok));
        const level = skip ? "ok" : r.gop < CONFIG.error ? "error" : r.gop < CONFIG.warn ? "warn" : "ok";
        if (!skip) { scored++; good += level === "ok" ? 1 : level === "warn" ? 0.6 : 0; }
        return { exp: r.tok, heard: r.heard, gop: r.gop, level,
                 tip: level === "ok" ? "" : tipFor(r.tok, r.heard),
                 label: level === "ok" ? "" : soundName(r.tok) + (r.heard !== r.tok ? " → entendu " + soundName(r.heard) : " peu net") };
      });
      const st = stress[wi];
      const stressIssue = st && st.ok === false ? { syll: st.syll + 1, expected: st.expected + 1 } : null;
      const level = sounds.some(s => s.level === "error") ? "error" : (sounds.some(s => s.level === "warn") || stressIssue) ? "warn" : "ok";
      return { word: w, sounds, stressIssue, level };
    });
    const nStress = out.filter(w => w.stressIssue).length;
    const score = Math.max(0, Math.round(100 * (scored ? good / scored : 0) - 4 * nStress));
    return { words: out, score };
  }

  /* ---------- Téléchargement et exécution (navigateur) ---------- */
  let session = null, loading = null;
  async function cachedModel() {
    if (!root.caches) return null;
    const c = await caches.open(MODEL_CACHE);
    return c.match(MODEL_URL);
  }
  async function isDownloaded() { try { return !!(await cachedModel()); } catch (e) { return false; } }
  async function download(onProgress) {
    const res = await fetch(MODEL_URL, { mode: "cors" });
    if (!res.ok) throw new Error("Téléchargement impossible (" + res.status + ")");
    const total = +res.headers.get("content-length") || MODEL_BYTES;
    const reader = res.body.getReader(), chunks = []; let got = 0;
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      chunks.push(value); got += value.length; if (onProgress) onProgress(got / total);
    }
    const blob = new Blob(chunks, { type: "application/octet-stream" });
    const c = await caches.open(MODEL_CACHE);
    await c.put(MODEL_URL, new Response(blob, { headers: { "content-type": "application/octet-stream", "content-length": String(blob.size) } }));
    return blob;
  }
  async function removeModel() { session = null; loading = null; if (root.caches) await caches.delete(MODEL_CACHE); }
  function loadScript(src) {
    return new Promise((ok, ko) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => ko(new Error("Chargement de " + src + " impossible")); document.head.appendChild(s); });
  }
  async function load(onProgress) {
    if (session) return session;
    if (loading) return loading;
    loading = (async () => {
      if (!root.ort) await loadScript(ORT_BASE + "ort.wasm.min.js");
      ort.env.wasm.wasmPaths = ORT_BASE;
      ort.env.wasm.numThreads = root.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
      let r = await cachedModel();
      const buf = r ? await r.arrayBuffer() : await (await download(onProgress)).arrayBuffer();
      session = await ort.InferenceSession.create(new Uint8Array(buf), { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
      return session;
    })();
    try { return await loading; } catch (e) { loading = null; throw e; }
  }
  async function run(audio16k, words) {
    const s = await load();
    const x = normalizeAudio(audio16k);
    const out = await s.run({ input_values: new ort.Tensor("float32", x, [1, x.length]) });
    const lg = out.logits; const [, T, V] = lg.dims;
    return analyse(lg.data, T, V, words, audio16k);
  }

  /* ---------- Micro : capture brute en 16 kHz ---------- */
  function createRecorder() {
    let ctx = null, stream = null, node = null, src = null, chunks = [], rate = 48000;
    return {
      start() {
        // Contexte audio créé tout de suite, dans le geste de l'utilisateur (exigence d'iOS).
        ctx = new (root.AudioContext || root.webkitAudioContext)();
        const resumed = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
        return this._open(resumed);
      },
      async _open(resumed) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: false, autoGainControl: true } });
        await resumed;
        rate = ctx.sampleRate; chunks = [];
        src = ctx.createMediaStreamSource(stream);
        node = ctx.createScriptProcessor(4096, 1, 1);
        node.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
        src.connect(node); node.connect(ctx.destination);
      },
      async stop() {
        try { src && src.disconnect(); node && node.disconnect(); } catch (e) {}
        stream && stream.getTracks().forEach(t => t.stop());
        const n = chunks.reduce((a, c) => a + c.length, 0), all = new Float32Array(n);
        let o = 0; chunks.forEach(c => { all.set(c, o); o += c.length; });
        try { ctx && ctx.close(); } catch (e) {}
        if (n < rate * 0.3) return null;
        return resample(all, rate, 16000);
      }
    };
  }
  async function resample(x, from, to) {
    if (from === to) return x;
    const len = Math.round(x.length * to / from);
    const off = new (root.OfflineAudioContext || root.webkitOfflineAudioContext)(1, len, to);
    const b = off.createBuffer(1, x.length, from); b.copyToChannel ? b.copyToChannel(x, 0) : b.getChannelData(0).set(x);
    const s = off.createBufferSource(); s.buffer = b; s.connect(off.destination); s.start();
    const r = await off.startRendering();
    return new Float32Array(r.getChannelData(0));
  }

  root.Phoneme = { analyse, run, load, download, isDownloaded, removeModel, createRecorder, normalizeAudio,
                   soundName, CONFIG, MODEL_BYTES, MODEL_URL, ORT_BASE, MODEL_CACHE };
})(typeof window !== "undefined" ? window : globalThis);
