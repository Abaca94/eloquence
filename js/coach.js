/* ============================================================
   Éloquence — Coach : travailler un mot (ou une courte expression)
   de votre choix, en prononciation et en sens.
   · Prononciation : dictionnaire CMUdict/eSpeak (coach/lex.json),
     voix Kokoro « Heart » exécutée dans le navigateur (coach/kokoro-int8.onnx),
     notation son par son avec le modèle de js/phoneme.js.
   · Sens : WordNet 3.0 (Princeton) et traductions WOLF (coach/sense/*.json),
     faux amis et familles de mots (js/coach-data.js).
   Tout est local : rien ne quitte l'appareil.
   ============================================================ */
const Coach = (function () {
  "use strict";
  const BASE = "coach/";
  const VOICE_URL = BASE + "kokoro-int8.onnx", VOICE_BYTES = 92361271, VOICE_CACHE = "eloquence-voice-v1";
  const VOWELS = new Set(["iː","i","ɪ","ᵻ","eɪ","ɛ","æ","ɑː","ɑ","ɔː","ɔ","oʊ","ʊ","uː","u","ʌ","ə","ɐ","ɚ",
    "ɜː","ɜ","aɪ","aʊ","ɔɪ","əl","ɑːɹ","ɔːɹ","oːɹ","ɛɹ","ɪɹ","ʊɹ","aɪɚ","iə"]);
  const ONSETS = new Set(["pɹ","pl","bɹ","bl","tɹ","dɹ","kɹ","kl","kw","ɡɹ","ɡl","fɹ","fl","θɹ","ʃɹ","sp","st","sk","sm","sn","sl","sw","tw","dw","pj","bj","kj","fj","mj","hj","vj","spɹ","stɹ","skɹ","spl","skw"]);

  /* ---------- Dictionnaire de prononciation ---------- */
  let lex = null, lexP = null, byPron = null;
  function loadLex() {
    if (lex) return Promise.resolve(lex);
    if (!lexP) lexP = fetch(BASE + "lex.json").then(r => { if (!r.ok) throw new Error("dictionnaire " + r.status); return r.json(); })
      .then(j => (lex = j)).catch(e => { lexP = null; throw e; });
    return lexP;
  }
  function clean(w) { return w.toLowerCase().replace(/[’‘]/g, "'").replace(/^[^a-z']+|[^a-z']+$/g, ""); }
  function entry(w) { const e = lex && lex[clean(w)]; return e ? { kp: e[0], toks: e[1].split(" "), st: e[2], rank: e[3] || 0 } : null; }
  /* Mots d'un texte → [[mot, jetons, accent]] pour js/phoneme.js (mots inconnus ignorés). */
  function phonemeWords(text) {
    return (text.match(/[A-Za-z][A-Za-z'’\-]*/g) || []).flatMap(w => w.split("-")).map(w => [w, entry(w)]).filter(x => x[1]).map(([w, e]) => [w, e.toks, e.st]);
  }
  function pronIndex() {
    if (byPron) return byPron;
    byPron = new Map();
    for (const w in lex) {
      const e = lex[w], r = e[3] || 1e6, cur = byPron.get(e[1]);
      if (/^[a-z]+$/.test(w) && (!cur || r < cur[1])) byPron.set(e[1], [w, r]);
    }
    return byPron;
  }
  /* Paires minimales : un seul son change, selon les confusions typiques d'un francophone. */
  function minimalPairs(word) {
    const e = entry(word); if (!e) return [];
    const idx = pronIndex(), out = [], seen = new Set([clean(word)]);
    const tryToks = (toks, a, b) => {
      const hit = idx.get(toks.join(" "));
      if (hit && !seen.has(hit[0]) && hit[1] < 25000) { seen.add(hit[0]); out.push({ word: hit[0], a, b, rank: hit[1] }); }
    };
    e.toks.forEach((t, i) => CONFUSABLE_SOUNDS.forEach(([x, y]) => {
      const to = t === x ? y : t === y ? x : null;
      if (to) { const c = e.toks.slice(); c[i] = to; tryToks(c, t, to); }
    }));
    if (e.toks[0] === "h") tryToks(e.toks.slice(1), "h", "-");
    else if (VOWELS.has(e.toks[0])) tryToks(["h"].concat(e.toks), "-", "h");
    return out.sort((p, q) => p.rank - q.rank).slice(0, 6);
  }
  /* Découpage en syllabes (attaque maximale), pour afficher l'accent. */
  function syllables(toks, st) {
    const nuc = toks.map((t, i) => VOWELS.has(t) ? i : -1).filter(i => i >= 0);
    if (!nuc.length) return [{ toks, stressed: false }];
    const starts = [0];
    for (let k = 1; k < nuc.length; k++) {
      let a = nuc[k - 1] + 1, b = nuc[k];          // consonnes entre deux voyelles : a..b-1
      let split = b;
      for (let len = Math.min(3, b - a); len >= 1; len--) {
        const on = toks.slice(b - len, b).join("");
        if (len === 1 ? toks[b - 1] !== "ŋ" : ONSETS.has(on)) { split = b - len; break; }
      }
      starts.push(split);
    }
    return starts.map((s, k) => {
      const end = k + 1 < starts.length ? starts[k + 1] : toks.length;
      return { toks: toks.slice(s, end), stressed: st >= s && st < end };
    });
  }

  /* ---------- Voix Kokoro dans le navigateur ---------- */
  let vocab = null, style = null, session = null, loadingVoice = null, voiceReady = false;
  async function voiceDownloaded() {
    if (voiceReady) return true;
    try { return !!(await (await caches.open(VOICE_CACHE)).match(VOICE_URL)); } catch (e) { return false; }
  }
  function loadScript(src) {
    return new Promise((ok, ko) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => ko(new Error("chargement de " + src)); document.head.appendChild(s); });
  }
  async function loadVoice(onProgress) {
    if (session) return session;
    if (loadingVoice) return loadingVoice;
    loadingVoice = (async () => {
      if (!window.ort) await loadScript(Phoneme.ORT_BASE + "ort.wasm.min.js");
      ort.env.wasm.wasmPaths = Phoneme.ORT_BASE;
      ort.env.wasm.numThreads = window.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
      const [v, s] = await Promise.all([fetch(BASE + "vocab.json").then(r => r.json()), fetch(BASE + "heart.bin").then(r => r.arrayBuffer())]);
      vocab = v; style = new Float32Array(s);
      let buf;
      const c = window.caches ? await caches.open(VOICE_CACHE) : null;
      const hit = c && await c.match(VOICE_URL);
      if (hit) buf = await hit.arrayBuffer();
      else {
        const res = await fetch(VOICE_URL);
        if (!res.ok) throw new Error("téléchargement de la voix (" + res.status + ")");
        const total = +res.headers.get("content-length") || VOICE_BYTES, rd = res.body.getReader(), parts = []; let got = 0;
        for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; onProgress && onProgress(Math.min(1, got / total)); }
        const blob = new Blob(parts);
        if (c) await c.put(VOICE_URL, new Response(blob, { headers: { "content-type": "application/octet-stream" } }));
        buf = await blob.arrayBuffer();
      }
      session = await ort.InferenceSession.create(new Uint8Array(buf), { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
      voiceReady = true;
      return session;
    })();
    try { return await loadingVoice; } catch (e) { loadingVoice = null; throw e; }
  }
  async function removeVoice() { session = null; loadingVoice = null; voiceReady = false; try { await caches.delete(VOICE_CACHE); } catch (e) {} }
  /* Texte → phonèmes Kokoro (mots du dictionnaire uniquement), ou null. */
  function kokoroPhonemes(text) {
    const parts = text.replace(/…/g, ",").match(/[A-Za-z][A-Za-z'’]*|[,.!?;:]/g) || [];
    let out = "", missing = 0;
    parts.forEach(p => {
      if (/^[,.!?;:]$/.test(p)) { out = out.trimEnd() + p + " "; return; }
      const e = entry(p); if (!e) { missing++; return; }
      out += e.kp + " ";
    });
    return missing ? null : out.trim();
  }
  const clips = new Map();
  async function synth(text, speed) {
    const key = text + "|" + speed;
    if (clips.has(key)) return clips.get(key);
    const ph = kokoroPhonemes(text); if (!ph) return null;
    const s = await loadVoice();
    const ids = [...ph].map(c => vocab[c]).filter(x => x != null).slice(0, 500);
    const tok = new BigInt64Array(ids.length + 2); ids.forEach((v, i) => { tok[i + 1] = BigInt(v); });
    const row = Math.min(ids.length, style.length / 256 - 1);
    const out = await s.run({ tokens: new ort.Tensor("int64", tok, [1, tok.length]),
      style: new ort.Tensor("float32", style.slice(row * 256, row * 256 + 256), [1, 256]),
      speed: new ort.Tensor("float32", new Float32Array([speed]), [1]) });
    const a = out.audio.data;
    clips.set(key, a);
    return a;
  }
  let ctx = null, src = null;
  /* À appeler dans le geste de l'utilisateur (iOS). */
  function unlock() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function playPCM(a, rate) {
    const c = unlock();
    try { src && src.stop(); } catch (e) {}
    audioMode("playback");
    const b = c.createBuffer(1, a.length, rate); b.getChannelData(0).set(louder(a));
    src = c.createBufferSource(); src.buffer = b; src.connect(c.destination); src.start();
    return new Promise(ok => { src.onended = ok; });
  }
  /* Lit un texte : voix Heart du coach si installée, sinon les enregistrements ou la voix du système. */
  async function say(text, slow) {
    unlock(); stopSpeaking();
    if (store.coachVoice !== false && await voiceDownloaded()) {
      try {
        await loadLex();
        const a = await synth(text, slow ? 0.7 : 0.92);
        if (a) return playPCM(a, 24000);
      } catch (e) { console.warn("Kokoro", e); }
    }
    speak(text, slow ? 0.72 : undefined);
    // Promesse tenue à la fin de la lecture, pour pouvoir enchaîner (« modèle puis moi »).
    return new Promise(ok => { afterSpeech = ok; });
  }

  /* ---------- Sens : WordNet + WOLF ---------- */
  const shards = {};
  function loadShard(ch) {
    const k = /[a-z]/.test(ch) ? ch : "_";
    if (!shards[k]) shards[k] = fetch(BASE + "sense/" + k + ".json").then(r => r.ok ? r.json() : {}).catch(() => { delete shards[k]; return {}; });
    return shards[k];
  }
  function baseForms(w) {
    const f = [w];
    const rules = [[/ies$/, "y"], [/ied$/, "y"], [/ves$/, "f"], [/es$/, ""], [/s$/, ""], [/ed$/, ""], [/ed$/, "e"], [/ing$/, ""], [/ing$/, "e"], [/er$/, ""], [/est$/, ""], [/ly$/, ""]];
    rules.forEach(([re, rep]) => { if (re.test(w)) { const b = w.replace(re, rep); f.push(b); if (/([bcdfgklmnprstvz])\1$/.test(b)) f.push(b.slice(0, -1)); } });
    return [...new Set(f)].filter(x => x.length > 1);
  }
  async function senses(word) {
    const w = clean(word).replace(/\s+/g, " ");
    const key = w.replace(/ /g, " ");
    const sh = await loadShard(key[0]);
    if (sh[key]) return { lemma: key, senses: sh[key] };
    for (const b of baseForms(key)) if (sh[b]) return { lemma: b, senses: sh[b] };
    return { lemma: key, senses: [] };
  }

  /* ---------- Mots difficiles ---------- */
  function mine() { if (!store.coachWords) store.coachWords = {}; return store.coachWords; }
  function toggleMine(w) {
    const m = mine();
    if (m[w]) { delete m[w]; delete reviewMap()["c:" + w]; toast("Retiré de vos mots difficiles"); }
    else { m[w] = { added: dayNum(), n: 0, best: 0 }; reviewMap()["c:" + w] = { step: 0, due: dayNum() + 1 }; toast("Ajouté à vos mots difficiles · il reviendra dans la séance du jour"); }
    save(); renderMine(); renderHeader();
  }
  function renderMine() {
    const box = $("#coach-mine"); if (!box) return;
    const m = mine(), due = new Set(reviewDue("c:")), words = Object.keys(m).sort();
    box.innerHTML = words.length ? "<strong>Mes mots difficiles :</strong> " + words.map(w =>
      `<button class="chip-filter coach-chip" data-w="${esc(w)}">${due.has(w) ? "🔁 " : ""}${esc(w)}${m[w].best ? " · " + m[w].best : ""}</button>`).join("")
      : '<span class="muted">Vos mots difficiles apparaîtront ici (bouton ☆ sur un mot).</span>';
    box.querySelectorAll(".coach-chip").forEach(b => b.addEventListener("click", () => open(b.dataset.w)));
  }

  /* ---------- Vue d'un mot ---------- */
  let cur = null;      // { text, words: [[w, entry]], pairs }
  let view = "pron";
  async function open(text, tab) {
    text = String(text || "").trim().replace(/\s+/g, " ").slice(0, 60);
    if (!text) return;
    if (typeof showTab === "function" && !$("#tab-coach").classList.contains("active")) showTab("coach");
    $("#coach-input").value = text;
    $("#coach-view").classList.remove("hidden");
    $("#coach-view").innerHTML = '<p class="muted">Chargement du dictionnaire…</p>';
    try { await loadLex(); } catch (e) { $("#coach-view").innerHTML = '<p class="heard">Le dictionnaire n\'a pas pu être chargé (hors ligne ?).</p>'; return; }
    const words = (text.match(/[A-Za-z][A-Za-z'’]*/g) || []).map(w => [w, entry(w)]);
    cur = { text, key: clean(text).replace(/[^a-z' ]/g, ""), words, pairs: words.length === 1 && words[0][1] ? minimalPairs(words[0][0]) : [] };
    if (tab) view = tab;
    try { lastSenses = (await senses(cur.key)).senses; } catch (e) { lastSenses = []; }
    render();
    $("#coach-view").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function ipaOf(e) {
    return syllables(e.toks, e.st).map(s => s.stressed ? "<b>ˈ" + esc(s.toks.join("")) + "</b>" : esc(s.toks.join(""))).join("<span class=\"syl-dot\">·</span>");
  }
  function renderHeader() {
    const h = $("#coach-head"); if (!h || !cur) return;
    const known = cur.words.filter(x => x[1]);
    h.innerHTML = `<div class="coach-word">${esc(cur.text)}</div>
      <div class="coach-ipa">${known.length ? "/" + cur.words.map(([w, e]) => e ? ipaOf(e) : "?").join(" ") + "/" : ""}</div>
      <div class="controls">
        <button class="btn primary" id="coach-say">🔊 Écouter</button>
        <button class="btn outline" id="coach-slow">🐢 Lentement</button>
        <button class="btn outline" id="coach-star">${mine()[cur.key] ? "★ Dans mes mots" : "☆ Mot difficile"}</button>
      </div>`;
    $("#coach-say").onclick = () => say(cur.text, false);
    $("#coach-slow").onclick = () => say(cur.text, true);
    $("#coach-star").onclick = () => toggleMine(cur.key);
  }
  function render() {
    if (recState) recState.stop();   // la vue est reconstruite : on n'y laisse pas un micro ouvert
    const v = $("#coach-view");
    v.innerHTML = `<div class="phrase-card column" id="coach-head"></div>
      <div class="modes" id="coach-tabs">
        <button class="mode ${view === "pron" ? "active" : ""}" data-v="pron">🎙 Prononciation</button>
        <button class="mode ${view === "sens" ? "active" : ""}" data-v="sens">📖 Sens</button>
      </div>
      <div id="coach-body"></div>`;
    renderHeader();
    v.querySelectorAll("#coach-tabs .mode").forEach(b => b.addEventListener("click", () => { view = b.dataset.v; render(); }));
    if (view === "pron") renderPron(); else renderSens();
  }

  /* --- Prononciation --- */
  function wordTips(w, e) {
    const tips = [], lw = w.toLowerCase(), syl = syllables(e.toks, e.st), n = syl.length, si = syl.findIndex(s => s.stressed);
    if (n > 1 && si >= 0) tips.push(`Accent tonique sur la <strong>${si + 1}<sup>${si ? "e" : "re"}</sup> syllabe</strong> sur ${n}` +
      (si !== n - 1 ? " : le français appuie sur la dernière, ici non. Rendez-la plus longue, plus forte et plus haute." : "."));
    if (e.toks.some(t => t === "ə" || t === "ɐ") && n > 1) tips.push("Les voyelles [ə] sont réduites : très brèves et neutres, ne les prononcez pas comme elles s'écrivent.");
    if (/^h/.test(lw)) tips.push(e.toks[0] === "h" ? "Le h initial est soufflé." : "Le h est muet ici : commencez directement par la voyelle.");
    if (/th/.test(lw)) { const th = e.toks.filter(t => t === "θ" || t === "ð"); if (th.length) tips.push("Le « th » est " + (th[0] === "θ" ? "<strong>sourd [θ]</strong> (comme « think »)" : "<strong>sonore [ð]</strong> (comme « this »)") + "."); }
    const last = e.toks[e.toks.length - 1];
    if (["z", "d", "v", "ɡ", "b", "ʒ", "dʒ"].includes(last)) tips.push("Finale sonore " + esc(Phoneme.soundName(last)) + " : gardez la voix jusqu'au bout et allongez légèrement la voyelle qui précède.");
    if (/ed$/.test(lw) && lw.length > 4) tips.push("La terminaison -ed se prononce ici " + (last === "t" ? "[t]" : e.toks.slice(-2).join("") === "ᵻd" || e.toks.slice(-2).join("") === "ɪd" ? "[ɪd] (syllabe en plus)" : "[d]") + ".");
    if (e.toks.includes("ɾ")) tips.push("Le t entre deux voyelles devient un t battu [ɾ], proche d'un d rapide, en américain.");
    const silent = [/^kn/, /^wr/, /mb$/, /^ps/, /stle$/, /ough/, /^gn/, /alk$/, /igh/].filter(re => re.test(lw));
    if (silent.length) tips.push("Attention aux lettres muettes : l'orthographe ne guide pas ici, fiez-vous à l'écoute.");
    return tips;
  }
  function renderPron() {
    const body = $("#coach-body");
    const known = cur.words.filter(x => x[1]);
    if (!known.length) {
      body.innerHTML = `<p class="heard">« ${esc(cur.text)} » n'est pas dans le dictionnaire de prononciation (100 000 mots). Vérifiez l'orthographe ; vous pouvez tout de même l'écouter avec la voix du système.</p>`;
      return;
    }
    const seen = new Set(), sounds = [];
    known.forEach(([, e]) => e.toks.forEach(t => { if (!seen.has(t)) { seen.add(t); sounds.push(t); } }));
    const hard = sounds.filter(t => HARD_FOR_FR.has(t)), easy = sounds.filter(t => !HARD_FOR_FR.has(t));
    const tips = known.flatMap(([w, e]) => wordTips(w, e).map(t => (known.length > 1 ? "<em>" + esc(w) + "</em> · " : "") + t));
    const phrases = examplesFor(cur.key);
    body.innerHTML = `
      ${tips.length ? `<div class="coach coach-tips"><strong>Conseils pour ce mot</strong><ul>${tips.map(t => "<li>" + t + "</li>").join("")}</ul></div>` : ""}
      <h3>Les sons</h3>
      <div class="sound-list">${hard.map(t => `<div class="sound-row hard"><span class="snd">${esc(t)}</span><div><strong>${esc(Phoneme.soundName(t))}</strong><br><span>${esc(SOUND_HOWTO[t] || "")}</span></div></div>`).join("")}</div>
      ${easy.length ? `<p class="muted">Sons proches du français : ${easy.map(t => esc(Phoneme.soundName(t))).join(", ")}.</p>` : ""}
      <h3>À vous</h3>
      <div class="controls"><button class="btn primary big-mic" id="coach-rec">🎙 Dire « ${esc(cur.text)} »</button></div>
      <div id="coach-result" class="result hidden"></div>
      ${cur.pairs.length ? `<h3>Paires minimales</h3>
        <p class="muted">Un seul son change. Écoutez la différence, puis dites chaque mot.</p>
        <div class="pair-list">${[[{ word: cur.key }]].concat(cur.pairs.map(p => [p])).map(([p], i) => `
          <div class="pair-row"><strong>${esc(p.word)}</strong>${i ? ` <span class="muted">${esc(Phoneme.soundName(p.b))} au lieu de ${esc(Phoneme.soundName(p.a))}</span>` : ' <span class="muted">(votre mot)</span>'}
            <span class="pair-btns"><button class="ghost small pr-say" data-w="${esc(p.word)}">🔊</button><button class="ghost small pr-rec" data-w="${esc(p.word)}">🎙</button></span>
            <div class="pair-res" data-w="${esc(p.word)}"></div></div>`).join("")}</div>
        <div class="controls"><button class="btn outline" id="coach-quiz">👂 Exercice : lequel entendez-vous ?</button></div>
        <div id="coach-quiz-box"></div>` : ""}
      ${phrases.length ? `<h3>En contexte</h3><div class="pair-list">${phrases.map((p, i) => `
          <div class="pair-row"><span>${esc(p)}</span><span class="pair-btns"><button class="ghost small ctx-say" data-i="${i}">🔊</button><button class="ghost small ctx-rec" data-i="${i}">🎙</button></span>
          <div class="pair-res" data-ctx="${i}"></div></div>`).join("")}</div>` : ""}`;
    $("#coach-rec").onclick = (ev) => recordAndScore(cur.text, $("#coach-result"), ev.currentTarget, true);
    body.querySelectorAll(".pr-say").forEach(b => b.onclick = () => say(b.dataset.w, false));
    body.querySelectorAll(".pr-rec").forEach(b => b.onclick = () => recordAndScore(b.dataset.w, body.querySelector(`.pair-res[data-w="${b.dataset.w}"]`), b, false));
    body.querySelectorAll(".ctx-say").forEach(b => b.onclick = () => say(phrases[+b.dataset.i], false));
    body.querySelectorAll(".ctx-rec").forEach(b => b.onclick = () => recordAndScore(phrases[+b.dataset.i], body.querySelector(`.pair-res[data-ctx="${b.dataset.i}"]`), b, false));
    const q = $("#coach-quiz"); if (q) q.onclick = startPairQuiz;
  }
  function examplesFor(key) {
    const re = new RegExp("\\b" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\w{0,3}\\b", "i"), out = [];
    PHRASES.forEach(p => { if (re.test(p.en)) out.push(p.en); });
    SCENARIOS.forEach(s => Object.values(s.nodes).forEach(n => [n.bot].concat((n.branches || []).map(b => b.reply)).forEach(t => { if (t && re.test(t) && t.length < 160) out.push(t); })));
    const ex = (lastSenses || []).flatMap(s => s[2]).filter(t => re.test(t));
    return [...new Set(out.concat(ex))].slice(0, 5);
  }
  let lastSenses = null;

  /* Enregistre puis note un mot ou une phrase. */
  let recState = null;
  async function recordAndScore(text, out, btn, main) {
    // Un appui pendant un enregistrement l'arrête, quel que soit le bouton (l'ancien a pu disparaître).
    if (recState) { recState.stop(); return; }
    // Réservé tout de suite, avant toute attente : un double appui ne lance pas deux enregistrements.
    const pend = { btn, cancelled: false, stop() { this.cancelled = true; if (recState === pend) recState = null; } };
    recState = pend;
    out.classList.remove("hidden");
    const label = btn.textContent;
    const dl = await Phoneme.isDownloaded(), fine = store.fineMode !== false && dl;
    if (pend.cancelled) return;
    stopSpeaking();
    if (fine) {
      const words = phonemeWords(text);
      Phoneme.load().catch(() => {});
      const r = Phoneme.createRecorder();
      try { await r.start(); } catch (e) { if (recState === pend) recState = null; out.innerHTML = '<span class="heard">Micro refusé ou indisponible.</span>'; return; }
      if (pend.cancelled) { r.stop().catch(() => {}); return; }
      btn.textContent = "⏹ Terminé"; btn.classList.add("recording");
      recState = { btn, stop: async () => {
        recState = null; btn.textContent = "⏳"; btn.classList.remove("recording");
        try {
          const audio = await r.stop();
          if (!audio) { out.innerHTML = '<span class="heard">Trop court : recommencez.</span>'; return; }
          const res = await Phoneme.run(audio, words);
          logSoundIssues(res);
          showScore(res, text, out, main, audio);
        } catch (e) { out.innerHTML = '<span class="heard">Analyse impossible (' + esc(e.message || e) + ').</span>'; }
        finally { btn.textContent = label; }
      } };
      return;
    }
    // Sans le modèle : la reconnaissance vocale du navigateur dit si le mot a été compris.
    if (typeof SR === "undefined" || !SR) { recState = null; out.innerHTML = '<span class="heard">La reconnaissance vocale n\'est pas disponible dans ce navigateur.</span>'; return; }
    const target = normalize(text);
    btn.textContent = "🔴 J'écoute…"; btn.classList.add("recording");
    const r = makeRecognition((heard, res) => {
      const alts = [...res].map(a => normalize(a.transcript));
      const ok = alts.some(a => a === target || (" " + a + " ").includes(" " + target + " "));
      const score = ok ? 85 : 40;
      if (main) noteAttempt(score);
      out.innerHTML = (ok ? "✅ Compris : « " + esc(heard) + " »." : "❌ Entendu : « " + esc(heard) + " ». Réécoutez en mode lent et recommencez.") +
        '<br><span class="muted">Pour une note son par son, ' + (dl ? 'réactivez l\'analyse son par son (Prononciation › Répéter).' : 'téléchargez le modèle d\'analyse (Prononciation › Répéter).') + '</span>';
    }, () => { if (recState && recState.btn === btn) recState = null; btn.textContent = label; btn.classList.remove("recording"); });
    recState = { btn, stop: () => { try { r.stop(); } catch (e) {} } };
    try { audioMode("play-and-record"); r.start(); } catch (e) { recState = null; btn.textContent = label; btn.classList.remove("recording"); }
  }
  function noteAttempt(score) {
    const m = mine()[cur.key];
    if (m) { m.n++; m.best = Math.max(m.best, score); }
    if (m || reviewMap()["c:" + cur.key]) reviewUpdate("c:" + cur.key, score >= 75); else save();
    addXP(Math.max(2, Math.round(score / 10)));
    if (typeof sessionStepDone === "function") sessionStepDone();
    renderMine();
  }
  function showScore(r, text, out, main, audio) {
    if (main) noteAttempt(r.score);
    const issues = [];
    r.words.forEach(w => w.sounds.filter(s => s.level !== "ok").forEach(s => issues.push({ w: w.word, s })));
    out.innerHTML = `<div class="score-line"><strong>${r.score} / 100</strong> · ${r.score >= 90 ? "✨ Très juste." : r.score >= 75 ? "👏 Bien, quelques détails." : "🔁 À reprendre, son par son."}</div>
      <div class="words">${r.words.map(w => `<span class="w-chip">${w.sounds.map(s => `<span class="snd-${s.level}" title="${esc(s.label || "")}">${esc(s.exp)}</span>`).join("")}</span>`).join(" ")}</div>
      ${issues.length ? `<ul class="fine-issues">${issues.slice(0, 4).map(i => `<li class="${i.s.level}"><strong>${esc(i.w)}</strong> · ${esc(i.s.label)}<br><span>${esc(i.s.tip)}</span></li>`).join("")}</ul>` : '<div class="heard">Aucun son problématique détecté.</div>'}
      <div class="controls"><button class="ghost small c-me">▶ Ma voix</button><button class="ghost small c-cmp">⇄ Modèle puis moi</button></div>`;
    const playMe = () => { audioMode("playback"); const c = unlock(); const b = c.createBuffer(1, audio.length, 16000); b.getChannelData(0).set(louder(audio)); const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(); return new Promise(ok => { s.onended = ok; }); };
    out.querySelector(".c-me").onclick = playMe;
    out.querySelector(".c-cmp").onclick = async () => { await say(text, false); playMe(); };
  }

  /* Exercice d'écoute : un mot de la paire est lu, lequel ? */
  let quiz = null;
  function startPairQuiz() {
    const words = [cur.key].concat(cur.pairs.slice(0, 3).map(p => p.word));
    quiz = { words, n: 0, ok: 0, total: 6 };
    nextQuiz();
  }
  function nextQuiz() {
    const box = $("#coach-quiz-box");
    if (quiz.n >= quiz.total) {
      box.innerHTML = `<p class="coach"><strong>${quiz.ok} / ${quiz.total}</strong> · ${quiz.ok === quiz.total ? "Oreille parfaite sur cette paire." : "Recommencez plus tard : la discrimination s'affine avec la répétition."}</p>`;
      addXP(quiz.ok); if (typeof sessionStepDone === "function") sessionStepDone();
      return;
    }
    const pair = [quiz.words[0], quiz.words[1 + (quiz.n % (quiz.words.length - 1))]];
    const target = pair[Math.random() < 0.5 ? 0 : 1];
    box.innerHTML = `<div class="quiz"><span class="muted">${quiz.n + 1} / ${quiz.total}</span> <button class="btn primary q-play">🔊 Écouter</button>
      ${shuffle(pair.slice()).map(w => `<button class="opt q-opt" data-w="${esc(w)}">${esc(w)}</button>`).join("")}</div>`;
    const play = () => say(target, false);
    box.querySelector(".q-play").onclick = play; play();
    box.querySelectorAll(".q-opt").forEach(b => b.onclick = () => {
      const good = b.dataset.w === target; if (good) quiz.ok++;
      b.classList.add(good ? "good" : "bad");
      if (!good) box.querySelector(`.q-opt[data-w="${target}"]`).classList.add("good");
      box.querySelectorAll(".q-opt").forEach(x => x.disabled = true);
      quiz.n++; setTimeout(nextQuiz, good ? 700 : 1600);
    });
  }

  /* --- Sens --- */
  const POS_FR = { n: "nom", v: "verbe", adj: "adjectif", adv: "adverbe" };
  async function renderSens() {
    const body = $("#coach-body");
    body.innerHTML = '<p class="muted">Recherche…</p>';
    const { lemma, senses: ss } = await senses(cur.key);
    lastSenses = ss;
    const ff = FALSE_FRIENDS[lemma] || FALSE_FRIENDS[cur.key];
    const fam = CONFUSABLES.filter(c => c.words.includes(lemma) || c.words.includes(cur.key));
    const re = new RegExp("\\b" + lemma.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\w{0,3}\\b", "i");
    const nu = NUANCES.filter(n => re.test(n.q || "") || n.options.some(o => re.test(o)));
    let html = "";
    if (ff) html += `<div class="coach ff"><strong>⚠️ Faux ami${ff.trap && ff.trap !== "—" ? " de « " + esc(ff.trap) + " »" : ""}</strong><br>
      « ${esc(lemma)} » = <strong>${esc(ff.means)}</strong>${ff.say ? `<br>Pour dire « ${esc(ff.trap)} » : <em>${esc(ff.say)}</em>` : ""}
      <br><span class="ex">${esc(ff.ex)}</span> <button class="ghost small ex-say" data-t="${esc(ff.ex)}">🔊</button></div>`;
    fam.forEach((c, ci) => {
      html += `<div class="coach fam"><strong>🔀 À ne pas confondre : ${c.words.map(esc).join(" / ")}</strong><br>${esc(c.why)}
        <div class="gaps" data-c="${ci}">${c.gaps.map((g, gi) => `<div class="gap" data-g="${gi}"><span>${esc(g[0])}</span> ${c.words.map(w => `<button class="opt small gap-opt" data-w="${esc(w)}">${esc(w)}</button>`).join("")}</div>`).join("")}</div></div>`;
    });
    if (ss.length) {
      html += `<h3>Sens${lemma !== cur.key ? " de « " + esc(lemma) + " »" : ""}</h3><ol class="sense-list">` + ss.map(s => `<li><span class="pos">${POS_FR[s[0]] || s[0]}</span> ${esc(s[1])}
        ${s[4].length ? `<div class="fr">🇫🇷 ${s[4].map(esc).join(", ")}</div>` : ""}
        ${s[3].length ? `<div class="syn">≈ ${s[3].map(esc).join(", ")}</div>` : ""}
        ${s[2].map(x => `<div class="ex">« ${esc(x)} » <button class="ghost small ex-say" data-t="${esc(x)}">🔊</button></div>`).join("")}</li>`).join("") + "</ol>";
      html += `<div class="controls"><button class="btn outline" id="sense-quiz">🧩 Exercices de sens</button></div><div id="sense-quiz-box"></div>`;
    } else if (!ff && !fam.length) html += `<p class="heard">Aucune définition trouvée pour « ${esc(cur.key)} » dans WordNet (mots grammaticaux, noms propres et expressions longues n'y figurent pas).</p>`;
    if (nu.length) html += `<h3>Dans les exercices Nuances</h3>` + nu.slice(0, 4).map((n, i) => `<div class="pair-row"><span>${esc(n.q || n.options.join(" / "))}</span><button class="ghost small nu-go" data-i="${i}">S'entraîner →</button></div>`).join("");
    html += '<p class="muted credits">Définitions : WordNet 3.0 (Princeton). Traductions : WOLF (CeCILL-C), via Open Multilingual Wordnet.</p>';
    body.innerHTML = html;
    body.querySelectorAll(".ex-say").forEach(b => b.onclick = () => say(b.dataset.t, false));
    body.querySelectorAll(".gap-opt").forEach(b => b.onclick = () => {
      const c = fam[+b.closest(".gaps").dataset.c], gEl = b.closest(".gap"), g = c.gaps[+gEl.dataset.g];
      const good = b.dataset.w === g[1];
      b.classList.add(good ? "good" : "bad");
      if (!good) gEl.querySelector(`.gap-opt[data-w="${g[1]}"]`).classList.add("good");
      gEl.querySelectorAll(".gap-opt").forEach(x => x.disabled = true);
      senseAnswered(good);
    });
    body.querySelectorAll(".nu-go").forEach(b => b.onclick = () => {
      showTab("nuance"); nuanceQueue = [nu[+b.dataset.i]].concat(shuffle(NUANCES.filter(x => x !== nu[+b.dataset.i]))); nuancePos = 0; showNuanceItem();
    });
    const sq = $("#sense-quiz"); if (sq) sq.onclick = () => senseQuiz(lemma, ss);
  }
  function senseAnswered(good) {
    if (mine()[cur.key] || reviewMap()["c:" + cur.key]) reviewUpdate("c:" + cur.key, good);
    addXP(good ? 3 : 1);
    if (typeof sessionStepDone === "function") sessionStepDone();
  }
  /* Exercices générés : sens en contexte, traduction, synonyme. */
  async function senseQuiz(lemma, ss) {
    const box = $("#sense-quiz-box");
    const sh = await loadShard(lemma[0]), others = Object.keys(sh).filter(w => w !== lemma);
    const rnd = (f) => { for (let i = 0; i < 400; i++) { const w = others[Math.floor(Math.random() * others.length)]; const r = f(w, sh[w]); if (r) return r; } return null; };
    const qs = [];
    const withEx = ss.filter(s => s[2].length);
    if (ss.length >= 2 && withEx.length) withEx.slice(0, 3).forEach(s => {
      const ex = s[2][0], opts = shuffle(ss.slice(0, 4).map(x => x[1]));
      if (!opts.includes(s[1])) opts[0] = s[1];
      qs.push({ q: "Quel sens dans : « " + ex + " » ?", opts: shuffle(opts), good: s[1], why: (POS_FR[s[0]] || "") + " · " + s[1] + (s[4].length ? " (" + s[4].join(", ") + ")" : "") });
    });
    const frS = ss.find(s => s[4].length);
    if (frS) {
      const good = frS[4].slice(0, 2).join(", "), opts = [good];
      while (opts.length < 4) { const d = rnd((w, e) => { const x = e.find(s => s[0] === frS[0] && s[4].length); return x ? x[4].slice(0, 2).join(", ") : null; }); if (!d) break; if (!opts.includes(d)) opts.push(d); }
      qs.push({ q: "Traduction de « " + lemma + " » (" + (POS_FR[frS[0]] || "") + ") ?", opts: shuffle(opts), good, why: frS[1] });
    }
    const synS = ss.find(s => s[3].length);
    if (synS) {
      const good = synS[3][0], opts = [good];
      while (opts.length < 4) { const d = rnd((w, e) => e.some(s => s[0] === synS[0]) && /^[a-z]+$/.test(w) ? w : null); if (!d) break; if (!opts.includes(d)) opts.push(d); }
      qs.push({ q: "Synonyme de « " + lemma + " » ?", opts: shuffle(opts), good, why: "« " + good + " » : " + synS[1] });
    }
    if (!qs.length) { box.innerHTML = '<p class="heard">Pas assez de données pour générer des exercices sur ce mot.</p>'; return; }
    let i = 0, ok = 0;
    const show = () => {
      if (i >= qs.length) { box.innerHTML = `<p class="coach"><strong>${ok} / ${qs.length}</strong> bonnes réponses.</p>`; return; }
      const q = qs[i];
      box.innerHTML = `<div class="quiz-q"><strong>${esc(q.q)}</strong>${q.opts.map(o => `<button class="opt s-opt">${esc(o)}</button>`).join("")}<div class="s-why hidden"></div></div>`;
      box.querySelectorAll(".s-opt").forEach((b, k) => b.onclick = () => {
        const good = q.opts[k] === q.good; if (good) ok++;
        b.classList.add(good ? "good" : "bad");
        box.querySelectorAll(".s-opt").forEach((x, j) => { x.disabled = true; if (q.opts[j] === q.good) x.classList.add("good"); });
        const w = box.querySelector(".s-why"); w.classList.remove("hidden");
        w.innerHTML = (good ? "✅ " : "❌ ") + esc(q.why) + ' <button class="btn primary small s-next">Suivant →</button>';
        w.querySelector(".s-next").onclick = () => { i++; show(); };
        senseAnswered(good);
      });
    };
    show();
  }

  /* ---------- Réglage et installation de la voix ---------- */
  async function refreshVoiceUI() {
    const box = $("#coach-voice"); if (!box) return;
    const ok = await voiceDownloaded();
    box.classList.toggle("hidden", ok);
    const st = $("#coach-voice-status"); if (st) st.textContent = ok ? "Voix Heart du coach installée (92 Mo)." : "Voix du coach non installée.";
    const rm = $("#coach-voice-remove"); if (rm) rm.classList.toggle("hidden", !ok);
  }
  function init() {
    if (!$("#tab-coach")) return;
    $("#coach-form").addEventListener("submit", (e) => { e.preventDefault(); open($("#coach-input").value); });
    $("#coach-voice-dl").addEventListener("click", async () => {
      const b = $("#coach-voice-dl"), bar = $("#coach-voice-bar");
      b.disabled = true; bar.classList.remove("hidden");
      try {
        await loadVoice(f => { bar.firstElementChild.style.width = Math.round(100 * f) + "%"; b.textContent = "Téléchargement… " + Math.round(100 * f) + " %"; });
        toast("Voix du coach prête");
      } catch (e) { toast("Échec du téléchargement de la voix : " + e.message); }
      b.disabled = false; b.textContent = "Installer la voix (92 Mo)"; bar.classList.add("hidden");
      refreshVoiceUI();
    });
    const rm = $("#coach-voice-remove");
    if (rm) rm.addEventListener("click", async () => { await removeVoice(); refreshVoiceUI(); toast("Voix du coach supprimée"); });
    renderMine(); refreshVoiceUI();
  }
  init();

  return { open, say, unlock, loadLex, entry, phonemeWords, minimalPairs, syllables, senses, kokoroPhonemes, synth, loadVoice, voiceDownloaded, renderMine, mine };
})();
function openCoachWord(w, tab) { Coach.open(w, tab); }

/* Ligne phonétique sous la phrase de la Forge : syllabes accentuées surlignées. */
function renderIpaLine() {
  const el = $("#pron-ipa"); if (!el) return;
  const p = currentPhrase(), words = p && PHONEMES[p.en];
  const on = store.showIpa !== false;
  const btn = $("#pron-ipa-toggle");
  if (btn) btn.textContent = on ? "Masquer la phonétique" : "Afficher la phonétique";
  if (!words || !on) { el.innerHTML = ""; el.classList.add("hidden"); return; }
  el.classList.remove("hidden");
  el.innerHTML = "/" + words.map(([w, toks, st]) => {
    const syl = Coach.syllables(toks, st);
    return '<span class="ipa-w" title="' + esc(w) + '">' + syl.map(x => {
      const t = esc(x.toks.join(""));
      return x.stressed && syl.length > 1 ? '<b>' + t + '</b>' : t;
    }).join('<span class="syl-dot">·</span>') + "</span>";
  }).join(" ") + "/";
}
(function () {
  const base = renderPhrase;
  renderPhrase = function () { base(); renderIpaLine(); };
  const actions = $("#pron-ipa") && $("#pron-ipa").parentElement;
  if (actions && !$("#pron-ipa-toggle")) {
    const b = document.createElement("button");
    b.className = "ghost small ipa-toggle"; b.id = "pron-ipa-toggle"; b.type = "button";
    b.addEventListener("click", () => { store.showIpa = store.showIpa === false; save(); renderIpaLine(); });
    $("#pron-ipa").insertAdjacentElement("afterend", b);
  }
  renderIpaLine();
})();
