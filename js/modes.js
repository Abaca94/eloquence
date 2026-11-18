/* ============================================================
   Éloquence — modes de la Forge phonétique : Répéter, Shadowing, Dictée.
   Chargé après app.js, dont il utilise les fonctions globales.
   ============================================================ */
let pronMode = "repeat", shadowBusy = false, shadowTake = null;
const MODE_HELP = {
  repeat: "Écoutez le modèle, puis dites la phrase : l'analyse compare votre voix au modèle.",
  shadow: "Parlez en même temps que la voix, comme son ombre, puis réécoutez les deux superposés pour comparer le rythme et la mélodie. Avec des écouteurs, c'est plus net.",
  dictation: "Écoutez la phrase sans la voir et tapez-la. Idéal pour entraîner l'oreille aux réductions, aux liaisons et aux nombres."
};
function setPronMode(m) {
  pronMode = m;
  $$("#pron-modes .mode").forEach(b => b.classList.toggle("active", b.dataset.mode === m));
  $("#mode-help").textContent = MODE_HELP[m];
  const dict = m === "dictation", shadow = m === "shadow";
  $("#btn-record").classList.toggle("hidden", m !== "repeat");
  $("#btn-show-answer").classList.toggle("hidden", m !== "repeat");
  $("#btn-shadow").classList.toggle("hidden", !shadow);
  $("#dictation-box").classList.toggle("hidden", !dict);
  $("#fine-box").classList.toggle("hidden", m !== "repeat");
  $(".phrase-card").classList.toggle("masked", dict);
  $("#pron-result").classList.add("hidden");
  $("#dict-input").value = "";
  if (typeof sessionModeChanged === "function") sessionModeChanged();
}
$$("#pron-modes .mode").forEach(b => b.addEventListener("click", () => setPronMode(b.dataset.mode)));
// Changer de phrase : on remet le mode à zéro (texte masqué en dictée, champ vidé).
const _renderPhraseBase = renderPhrase;
renderPhrase = function () {
  _renderPhraseBase();
  $("#dict-input").value = ""; shadowTake = null;
  $(".phrase-card").classList.toggle("masked", pronMode === "dictation");
};

/* ---------- Dictée ---------- */
const NUM_WORDS = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" ");
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function intWords(n) {
  if (n < 20) return NUM_WORDS[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " " + NUM_WORDS[n % 10] : "");
  if (n < 1000) return NUM_WORDS[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + intWords(n % 100) : "");
  if (n < 1e6) return intWords(Math.floor(n / 1000)) + " thousand" + (n % 1000 ? " " + intWords(n % 1000) : "");
  return String(n);
}
/* Chiffres tapés → mots (« 1.25 » → « one point two five », « 142 » → « one hundred forty two »). */
function digitsToWords(t) {
  return t.replace(/(\d[\d,]*)(?:\.(\d+))?\s*(%)?/g, (m, a, b, pct) => {
    let w = intWords(parseInt(a.replace(/,/g, ""), 10));
    if (b) w += " point " + b.split("").map(d => NUM_WORDS[+d]).join(" ");
    if (pct) w += " percent";
    return " " + w + " ";
  });
}
function dictWords(t) { return normalize(digitsToWords(t).replace(/-/g, " ")).split(" ").filter(Boolean); }
/* Alignement mot à mot (plus longue sous-suite commune, tolérance d'une faute de frappe). */
function alignWords(ref, got) {
  const same = (a, b) => a === b || (a.length > 4 && levenshtein(a, b) <= 1);
  const n = ref.length, m = got.length, L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i][j] = same(ref[i], got[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && same(ref[i], got[j])) { out.push({ w: ref[i], k: ref[i] === got[j] ? "ok" : "typo", got: got[j] }); i++; j++; }
    else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) { out.push({ w: got[j], k: "extra" }); j++; }
    else { out.push({ w: ref[i], k: "miss" }); i++; }
  }
  return out;
}
function showDictation(giveUp) {
  const p = currentPhrase();
  const typed = $("#dict-input").value;
  const al = alignWords(dictWords(p.en), giveUp ? [] : dictWords(typed));
  const nRef = al.filter(a => a.k !== "extra").length, nOk = al.filter(a => a.k === "ok" || a.k === "typo").length;
  const score = giveUp ? 0 : Math.round(100 * nOk / Math.max(1, nRef + al.filter(a => a.k === "extra").length * 0.5));
  const xp = giveUp ? 2 : Math.max(2, Math.round(score / 10));
  addXP(xp);
  if (!giveUp) reviewUpdate("p:" + p.en, score >= 75);
  if (typeof sessionStepDone === "function") sessionStepDone();
  $(".phrase-card").classList.remove("masked");
  const verdict = giveUp ? "Voici la phrase. Réécoutez-la en la lisant, puis réessayez sur la suivante." :
    score >= 95 ? "✨ Parfait, rien ne vous a échappé." : score >= 75 ? "👏 Très bien, quelques mots ont glissé." :
    score >= 50 ? "🙂 L'essentiel est là. Réécoutez en mode lent les mots en rouge." : "🔁 Phrase difficile : écoutez-la lentement en la lisant.";
  const res = $("#pron-result");
  res.classList.remove("hidden");
  res.innerHTML = `
    <div class="score-line">${verdict} ${giveUp ? "" : `<strong>${score} / 100</strong>`} <span class="muted">(+${xp} ⭐)</span></div>
    ${giveUp ? "" : `<div class="score-bar"><div style="width:${score}%"></div></div>`}
    <div class="words">${al.map(a => `<span class="w-chip ${a.k === "ok" ? "w-good" : a.k === "typo" ? "w-off" : a.k === "miss" ? "w-missed-soft" : "w-extra"}" title="${a.k === "typo" ? "Vous avez écrit : " + esc(a.got) : a.k === "miss" ? "Mot manquant" : a.k === "extra" ? "Mot en trop" : ""}">${esc(a.w)}</span>`).join("")}</div>
    <div class="heard">Vert : juste · orange : faute de frappe · rouge : manquant · barré : en trop.</div>
    <div class="controls"><button class="btn outline" id="dict-slow">🐢 Réécouter lentement</button></div>`;
  $("#dict-slow").addEventListener("click", () => speak(p.en, Math.max(0.55, parseFloat(store.rate) * 0.62)));
}
$("#dict-check").addEventListener("click", () => {
  if (!$("#dict-input").value.trim()) { toast("Tapez d'abord ce que vous avez entendu."); return; }
  showDictation(false);
});
$("#dict-reveal").addEventListener("click", () => showDictation(true));
$("#dict-input").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#dict-check").click(); } });

/* ---------- Shadowing ---------- */
function recordedUrl(text) {
  const nv = naturalVoice(); if (!nv || !AUDIO_INDEX[text]) return null;
  return "audio/" + nv + "/" + AUDIO_INDEX[text] + ".mp3";
}

$("#btn-shadow").addEventListener("click", async () => {
  if (shadowBusy) return;
  const p = currentPhrase(), url = recordedUrl(p.en);
  if (!url) { toast("Pas d'enregistrement pour cette phrase : choisissez une voix naturelle dans ⚙."); return; }
  shadowBusy = true;
  const btn = $("#btn-shadow");
  const rec = Phoneme.createRecorder();
  try { await rec.start(); } catch (e) { shadowBusy = false; micWarning("Le micro est indispensable pour le shadowing : autorisez-le puis réessayez."); return; }
  btn.classList.add("recording");
  btn.textContent = "🔴 Parlez avec la voix…";
  const tRec = performance.now();
  stopSpeaking();
  player.src = url; player.playbackRate = 1;
  let tModel = 0;
  player.addEventListener("playing", () => { tModel = performance.now(); }, { once: true });
  const ended = new Promise(r => { player.addEventListener("ended", r, { once: true }); player.addEventListener("error", r, { once: true }); });
  // Petit compte à rebours sonore implicite : la voix démarre une demi-seconde après le micro.
  await new Promise(r => setTimeout(r, 500));
  player.play().catch(() => {});
  await ended;
  await new Promise(r => setTimeout(r, 900));
  const audio = await rec.stop();
  btn.classList.remove("recording");
  btn.textContent = "👥 Recommencer le shadowing";
  shadowBusy = false;
  if (!audio) { micWarning("Rien n'a été enregistré. Vérifiez le micro et réessayez."); return; }
  shadowTake = { audio, url, offset: Math.max(0, (tModel - tRec) / 1000) };
  addXP(6);
  if (typeof sessionStepDone === "function") sessionStepDone();
  const res = $("#pron-result");
  res.classList.remove("hidden");
  res.innerHTML = `
    <div class="score-line">Enregistré. Écoutez les deux voix ensemble : là où elles se décalent, votre rythme ou vos liaisons diffèrent. <span class="muted">(+6 ⭐)</span></div>
    <div class="controls">
      <button class="btn primary" id="shadow-both">🎧 Superposé</button>
      <button class="btn outline" id="shadow-me">▶ Ma voix seule</button>
      <button class="btn outline" id="shadow-model">🔊 Le modèle seul</button>
    </div>
    <div class="heard">Astuce : visez d'abord la mélodie et les accents, puis la précision des sons. Pour une note son par son, passez en mode Répéter.</div>`;
  $("#shadow-both").addEventListener("click", () => playShadow(true));
  $("#shadow-me").addEventListener("click", () => playShadow(false));
  $("#shadow-model").addEventListener("click", () => speak(p.en, 1 * 0.95));
});
let shadowCtx = null;
async function playShadow(withModel) {
  if (!shadowTake) return;
  stopSpeaking();
  try { shadowCtx && shadowCtx.close(); } catch (e) {}
  const ctx = shadowCtx = new (window.AudioContext || window.webkitAudioContext)();
  const me = ctx.createBuffer(1, shadowTake.audio.length, 16000); me.getChannelData(0).set(shadowTake.audio);
  const t0 = ctx.currentTime + 0.1;
  const s1 = ctx.createBufferSource(); s1.buffer = me; s1.connect(ctx.destination); s1.start(t0);
  if (withModel) {
    try {
      const buf = await ctx.decodeAudioData(await (await fetch(shadowTake.url)).arrayBuffer());
      const g = ctx.createGain(); g.gain.value = 0.7;     // modèle un peu en retrait
      const s2 = ctx.createBufferSource(); s2.buffer = buf; s2.connect(g); g.connect(ctx.destination);
      s2.start(t0 + shadowTake.offset);
    } catch (e) { toast("Le modèle n'a pas pu être chargé."); }
  }
}
setPronMode("repeat");
