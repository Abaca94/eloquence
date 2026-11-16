/* ============================================================
   Éloquence — moteur d'application
   Reconnaissance vocale, synthèse, notation, progression.
   ============================================================ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/* ---------- Persistance ---------- */
const STORE_KEY = "eloquence-v1";
let store = {
  xp: 0, streak: 0, lastDay: null,
  answersCount: 0, bestScore: 0, scenariosDone: [],
  phraseStats: {},        // filter -> {n: essais, sum: somme des scores}
  voiceURI: null, rate: 0.95, goal: 3, todayCount: 0, today: null,
};
try {
  const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  store = Object.assign(store, saved);
} catch (e) { /* stockage corrompu : on repart propre */ }
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }

/* ---------- Gestion de journée & série ---------- */
function todayKey() { return new Date().toISOString().slice(0, 10); }
function ensureDay() {
  const today = todayKey();
  if (store.today !== today) {
    // Nouveau jour : l'objectif repart à zéro ; la série sera actualisée à la première pratique (onPractice).
    store.today = today;
    store.todayCount = 0;
    save();
  }
}
function onPractice() {
  ensureDay();
  const prev = todayKey();
  if (store.lastDay !== prev) {
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    store.streak = (store.lastDay === yesterday) ? store.streak + 1 : 1;
    store.lastDay = prev;
  }
}
function addXP(n) {
  onPractice();
  store.xp += n;
  store.answersCount++;
  store.todayCount = (store.todayCount || 0) + 1;
  const beforeLevel = levelInfo();
  save(); renderHUD(); renderProgress();
  const newLevel = levelInfo();
  if (newLevel.idx !== beforeLevel.idx) {
    toast("🎖 Nouveau niveau : " + newLevel.level.name + " !");
  }
}
/* ---------- Révision espacée ----------
   Un élément raté revient le lendemain, puis à 3, 7 et 16 jours s'il est réussi
   à chaque fois ; un nouvel échec le ramène au lendemain. Après la dernière
   étape, il sort de la liste. Clés : "p:" + phrase, "n:" + question|options. */
const REVIEW_STEPS = [1, 3, 7, 16];
function dayNum() { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 6e4) / 864e5); }
function reviewMap() { if (!store.review) store.review = {}; return store.review; }
function reviewUpdate(key, ok) {
  const m = reviewMap(), r = m[key];
  if (!ok) m[key] = { step: 0, due: dayNum() + REVIEW_STEPS[0] };
  else if (r && r.due <= dayNum()) {
    const step = r.step + 1;
    if (step >= REVIEW_STEPS.length) delete m[key];
    else m[key] = { step, due: dayNum() + REVIEW_STEPS[step] };
  }
  save(); renderReviewUI();
}
function reviewDue(prefix) {
  const m = reviewMap(), t = dayNum();
  return Object.keys(m).filter(k => k.startsWith(prefix) && m[k].due <= t).map(k => k.slice(prefix.length));
}
function nuanceKey(it) { return it.q + "|" + it.options.join("/"); }
function duePhrases() { const due = new Set(reviewDue("p:")); return PHRASES.filter(p => due.has(p.en)); }
function dueNuances() { const due = new Set(reviewDue("n:")); return NUANCES.filter(n => due.has(nuanceKey(n))); }
function renderReviewUI() {
  const np = duePhrases().length, nn = dueNuances().length, pending = Object.keys(reviewMap()).length;
  const box = $("#review-card");
  if (box) {
    box.classList.toggle("hidden", np + nn === 0);
    $("#review-text").textContent = [np ? np + (np > 1 ? " phrases" : " phrase") : "", nn ? nn + (nn > 1 ? " nuances" : " nuance") : ""].filter(Boolean).join(" et ") + " à revoir aujourd'hui";
    $("#review-pron").classList.toggle("hidden", !np);
    $("#review-nuance").classList.toggle("hidden", !nn);
  }
  const pr = $("#p-review");
  if (pr) pr.textContent = pending ? pending + " élément(s) en révision, dont " + (np + nn) + " à revoir aujourd'hui." : "Aucun élément en révision pour l'instant.";
  if ($("#pron-filters") && typeof renderPronFilters === "function" && typeof pronFilter !== "undefined") renderPronFilters();
}

function levelInfo() {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (store.xp >= LEVELS[i].xp) idx = i;
  return { idx, level: LEVELS[idx] };
}

/* ---------- Synthèse vocale (anglais américain) ----------
   Les voix varient beaucoup selon l'appareil. On classe les voix anglaises
   par qualité : Premium/Neural > Améliorée/Enhanced > voix Siri/Google >
   voix standard, et on écarte les voix « fantaisie » de macOS ainsi que les
   voix robotiques « Eloquence » (Eddy, Flo, Reed…), très imprécises. */
let voices = [];
const NOVELTY = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley|hysterical|deranged|pipe organ|mauvaises nouvelles|bonnes nouvelles|cloches|bulles|violoncelles|bouffon|orgue|trinoïdes|trinoides|murmure)\b/i;
const GOOD_NAMES = /\b(ava|zoe|evan|nathan|joelle|noelle|tom|allison|susan|samantha|alex|aaron|nicky|jenny|aria|guy|michelle)\b/i;
function voiceLang(v) { return (v.lang || "").replace("_", "-").toLowerCase(); }
function voiceScore(v) {
  const n = v.name || "", lang = voiceLang(v);
  let sc = 0;
  if (lang.startsWith("en-us")) sc += 100;
  else if (lang.startsWith("en-ca")) sc += 40;
  else if (lang.startsWith("en")) sc += 20;
  if (/premium|neural|natural/i.test(n)) sc += 80;
  else if (/enhanced|améliorée|amelioree|qualité|qualite|siri/i.test(n)) sc += 45;
  else if (/google/i.test(n)) sc += 35;
  if (GOOD_NAMES.test(n)) sc += 10;
  if (v.localService) sc += 5;          // marche hors ligne
  if (NOVELTY.test(n)) sc -= 200;
  return sc;
}
function voiceLabel(v) {
  const sc = voiceScore(v);
  const tier = sc >= 180 ? "★★★" : sc >= 130 ? "★★" : sc >= 100 ? "★" : "";
  return (tier ? tier + " " : "") + v.name + " (" + v.lang + ")";
}
function loadVoices() {
  voices = speechSynthesis.getVoices()
    .filter(v => /^en(-|_|$)/i.test(v.lang))
    .filter(v => !NOVELTY.test(v.name))
    .sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
  // Voix choisie à la main : on la garde. Sinon on prend la meilleure
  // disponible (ce qui suit automatiquement l'installation d'une voix Premium).
  if (!(store.voiceChosen && voices.some(v => v.voiceURI === store.voiceURI)) && voices.length) {
    if (store.voiceURI !== voices[0].voiceURI) { store.voiceURI = voices[0].voiceURI; store.voiceChosen = false; save(); }
  }
  const sel = $("#set-voice");
  if (!sel) return;
  sel.innerHTML = "";
  voices.forEach(v => {
    const o = document.createElement("option");
    o.value = v.voiceURI;
    o.textContent = voiceLabel(v);
    sel.appendChild(o);
  });
  if (store.voiceURI) sel.value = store.voiceURI;
  const diag = $("#voice-diag-list");
  if (diag) {
    const all = speechSynthesis.getVoices();
    const en = all.filter(v => /^en(-|_|$)/i.test(v.lang));
    diag.innerHTML = "<p>" + all.length + " voix au total, dont " + en.length + " en anglais :</p><p>" +
      (en.map(v => v.name + " · " + v.lang + (v.localService ? "" : " · en ligne")).join("<br>") || "aucune") + "</p>";
  }
  const hint = $("#voice-hint");
  if (hint) hint.classList.toggle("hidden", voices.length > 0 && voiceScore(voices[0]) >= 180);
}
speechSynthesis.onvoiceschanged = loadVoices;
let speakTimer = null;
/* Voix naturelles pré-enregistrées : même rendu sur Mac, iPhone et iPad,
   hors ligne. La voix système ne sert plus que de secours, pour un texte
   qui n'a pas d'enregistrement. */
const NATURAL_VOICES = { af_heart: "Heart · voix féminine", am_michael: "Michael · voix masculine" };
const player = new Audio();
player.preload = "auto";
function naturalVoice() {
  const v = store.naturalVoice === undefined ? "af_heart" : store.naturalVoice;
  return NATURAL_VOICES[v] ? v : null;
}
function playRecorded(text, rate, slowWanted) {
  const nv = naturalVoice();
  if (!nv || typeof AUDIO_INDEX === "undefined") return false;
  const keys = slowWanted ? [text + "|slow", text] : [text, text + "|slow"];
  const key = keys.find(k => AUDIO_INDEX[k]);
  if (!key) return false;
  const isSlow = key.endsWith("|slow");
  player.src = "audio/" + nv + "/" + AUDIO_INDEX[key] + ".mp3";
  // Les fichiers « normaux » sont enregistrés à 0.95 ; la vitesse réglée s'applique par-dessus.
  player.playbackRate = isSlow ? 1 : Math.min(2, Math.max(0.5, rate / 0.95));
  if ("preservesPitch" in player) player.preservesPitch = true;
  if ("webkitPreservesPitch" in player) player.webkitPreservesPitch = true;
  player.play().catch(() => speakSystem(text, rate));
  return true;
}
function speak(text, rateOverride) {
  speechSynthesis.cancel();
  clearTimeout(speakTimer);
  player.pause();
  const rate = rateOverride || parseFloat(store.rate) || 0.95;
  if (playRecorded(text, rate, !!rateOverride && rateOverride < 0.9)) return;
  speakSystem(text, rate);
}
function speakSystem(text, rate) {
  const u = new SpeechSynthesisUtterance(text);
  const v = voices.find(x => x.voiceURI === store.voiceURI) || voices[0];
  if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = "en-US"; }
  u.rate = rate;
  u.pitch = 1;
  // Safari (iPhone/iPad) perd parfois une phrase lancée juste après cancel().
  speakTimer = setTimeout(() => speechSynthesis.speak(u), 60);
}
loadVoices();

/* ---------- Reconnaissance vocale ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
let rec = null, listening = false;
function makeRecognition(onResult, onEnd) {
  if (!SR) return null;
  const r = new SR();
  r.lang = "en-US";
  r.interimResults = false;
  r.maxAlternatives = 3;
  r.continuous = false;
  r.onresult = (ev) => { onResult(ev.results[0][0].transcript, ev.results[0]); };
  r.onerror = (ev) => { onEnd(true, ev.error); };
  r.onend = () => { onEnd(false, null); };
  return r;
}
function micWarning(msg) {
  if (!msg) { return; }
  $("#mic-warning").classList.remove("hidden");
  $("#mic-warning").innerHTML = msg;
}
function ensureRecognitionUI() {
  if (!SR) {
    micWarning("⚠️ La reconnaissance vocale n'est pas disponible dans ce navigateur. " +
      "Ouvrez Éloquence dans <strong>Chrome</strong> ou <strong>Safari</strong> — tout le reste fonctionne, seuls les retours sur votre prononciation manquent.");
    return false;
  }
  return true;
}

/* ---------- Outils ---------- */
function normalize(s) {
  return s.toLowerCase().replace(/[.,!?;:'"`’()—–\-]/g, " ").replace(/\s+/g, " ").trim();
}
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
function wordSimilarity(a, b) {
  const max = Math.max(a.length, b.length) || 1;
  return 1 - levenshtein(a, b) / max;
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add("hidden"), 3200);
}

/* ---------- Onglets ---------- */
function showTab(name) {
  $$(".panel").forEach(p => p.classList.remove("active"));
  $("#tab-" + name).classList.add("active");
  $$("#tabs .tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
  if (name === "progress") renderProgress();
  if (name === "dashboard") renderDashboard();
}
$$("#tabs .tab").forEach(t => t.addEventListener("click", () => showTab(t.dataset.tab)));
$$(".card[data-open]").forEach(c => c.addEventListener("click", () => showTab(c.dataset.open)));

/* ---------- Tableau de bord ---------- */
function renderDashboard() {
  ensureDay();
  const goal = store.goal || 3;
  $("#daily-goal-text").textContent = goal + (goal > 1 ? " exercices" : " exercice");
  const c = store.todayCount || 0;
  $("#daily-goal-progress").textContent = c + " / " + goal;
  $("#goal-fill").style.width = Math.min(100, (c / goal) * 100) + "%";
  if (typeof pronFilter !== "undefined") renderReviewUI();
  $("#daily-tip").innerHTML = "💡 " + DAILY_TIPS[new Date().getDate() % DAILY_TIPS.length];
}
function renderHUD() {
  const li = levelInfo();
  $("#hud-xp").textContent = store.xp;
  $("#hud-streak").textContent = store.streak;
  $("#hud-level").textContent = "Nv. " + (li.idx + 1) + " · " + li.level.name;
}

/* ============================================================
   MODULE FORGE PHONÉTIQUE
   ============================================================ */
let pronIdx = 0, pronFilter = "trap", reviewList = [];
function filterPhrases() { return pronFilter === "review" ? reviewList : PHRASES.filter(p => p.f === pronFilter); }
function openReviewPhrases() {
  reviewList = duePhrases();
  if (!reviewList.length) { pronFilter = "trap"; }
  else pronFilter = "review";
  pronIdx = 0; renderPronFilters(); renderPhrase();
}
function renderPronFilters() {
  const box = $("#pron-filters");
  box.innerHTML = "";
  PHONEME_FILTERS.forEach(f => {
    const b = document.createElement("button");
    b.className = "chip-filter" + (f.id === pronFilter ? " active" : "");
    b.textContent = PHONEME_FILTER_LABELS[f.id] + " · " + PHRASES.filter(p => p.f === f.id).length;
    b.addEventListener("click", () => { pronFilter = f.id; pronIdx = 0; renderPronFilters(); renderPhrase(); });
    box.appendChild(b);
  });
  const nDue = duePhrases().length;
  if (nDue || pronFilter === "review") {
    const b = document.createElement("button");
    b.className = "chip-filter review" + (pronFilter === "review" ? " active" : "");
    b.textContent = "🔁 À revoir · " + nDue;
    b.addEventListener("click", openReviewPhrases);
    box.prepend(b);
  }
}
function currentPhrase() { return filterPhrases()[pronIdx]; }
function renderPhrase() {
  const p = currentPhrase(); if (!p) return;
  $("#pron-en").textContent = p.en;
  $("#pron-fr").textContent = p.fr;
  $("#pron-focus").textContent = p.focus;
  $("#pron-tip").textContent = p.tip;
  $("#pron-result").classList.add("hidden");
  $("#btn-show-answer").textContent = "Voir la transcription attendue";
}
$("#pron-prev").addEventListener("click", () => {
  const n = filterPhrases().length; pronIdx = (pronIdx - 1 + n) % n; renderPhrase();
});
$("#pron-next").addEventListener("click", () => {
  const n = filterPhrases().length; pronIdx = (pronIdx + 1) % n; renderPhrase();
});
$("#btn-listen").addEventListener("click", () => {
  speak(currentPhrase().en, parseFloat(store.rate));
});
$("#btn-slow").addEventListener("click", () => {
  speak(currentPhrase().en, Math.max(0.55, parseFloat(store.rate) * 0.62));
});
$("#btn-show-answer").addEventListener("click", (e) => {
  const p = currentPhrase();
  const res = $("#pron-result");
  res.classList.remove("hidden");
  res.innerHTML = "<div class='score-line'>Transcription attendue :</div><div class='heard'>" + p.en + "</div>";
  e.target.style.display = "none"; setTimeout(() => e.target.style.display = "", 10);
  e.target.textContent = "Masquer";
});

/* --- Enregistrement & notation --- */
let spaceDown = false;
$("#btn-record").addEventListener("click", toggleRecording);
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && $("#tab-pronunciation").classList.contains("active") && !e.repeat && !$("#settings-modal").classList.contains("open")) {
    e.preventDefault(); if (!spaceDown) { spaceDown = true; startRecording(); }
  }
});
document.addEventListener("keyup", (e) => {
  if (e.code === "Space" && spaceDown) { spaceDown = false; stopRecording(); }
});
function toggleRecording() { (listening || fineRec) ? stopRecording() : startRecording(); }
function startRecording() {
  if (fineReady()) return startFineRecording();
  if (!ensureRecognitionUI()) return;
  if (listening) return;
  micWarning(null); $("#mic-warning").classList.add("hidden");
  rec = makeRecognition(
    (text, alt) => finishAttempt(text, alt),
    (err, errCode) => {
      listening = false;
      $("#btn-record").classList.remove("recording");
      $("#btn-record").textContent = "🎙 Parler (ou touche Espace)";
      if (err && errCode) {
        const hints = {
          "not-allowed": "L'accès au micro a été refusé. Autorisez le microphone (icône dans la barre d'adresse) puis réessayez.",
          "service-not-allowed": "Le navigateur bloque la reconnaissance vocale ici. Chargez la page via http://localhost (script « Lancer Éloquence »).",
          "no-speech": "Aucune parole détectée — parlez un peu plus près du micro, puis réessayez.",
          "audio-capture": "Aucun micro trouvé. Vérifiez vos réglages son (micro accessible au navigateur).",
          "network": "La reconnaissance vocale nécessite une connexion Internet momentanément indisponible.",
        };
        micWarning(hints[errCode] || "Le micro n'a pas répondu (" + errCode + "). Réessayez.");
      }
    }
  );
  if (!rec) return;
  try { rec.start(); listening = true; } catch (e) { return; }
  const btn = $("#btn-record");
  btn.classList.add("recording");
  btn.textContent = "🔴 À vous… (cliquez ou relâchez Espace pour terminer)";
}
function stopRecording() {
  if (fineRec) return stopFineRecording();
  if (rec && listening) { try { rec.stop(); } catch (e) {} }
}

/* --- Analyse son par son (modèle local, voir js/phoneme.js) --- */
let fineRec = null, fineStarting = null, fineDownloaded = false, fineBusy = false, lastAudio = null;
function fineReady() { return fineDownloaded && store.fineMode !== false && !!PHONEMES[currentPhrase().en]; }
async function refreshFineUI() {
  fineDownloaded = await Phoneme.isDownloaded();
  $("#fine-download").classList.toggle("hidden", fineDownloaded);
  $("#fine-toggle-wrap").classList.toggle("hidden", !fineDownloaded);
  $("#fine-toggle").checked = store.fineMode !== false;
  $("#fine-text").innerHTML = fineDownloaded
    ? "🔬 <strong>Analyse son par son</strong> activable : votre voix est comparée son par son à la transcription attendue, sur l'appareil."
    : $("#fine-text").innerHTML;
  $("#fine-status").textContent = fineDownloaded ? "Modèle installé sur cet appareil (240 Mo)." : "Modèle non téléchargé.";
  $("#fine-remove").classList.toggle("hidden", !fineDownloaded);
}
$("#fine-download").addEventListener("click", async () => {
  const btn = $("#fine-download"), bar = $("#fine-progress");
  btn.disabled = true; bar.classList.remove("hidden");
  try {
    await Phoneme.load((f) => { bar.firstElementChild.style.width = Math.round(100 * f) + "%"; btn.textContent = "Téléchargement… " + Math.round(100 * f) + " %"; });
    store.fineMode = true; save();
    toast("Analyse son par son prête");
  } catch (e) {
    micWarning("Le téléchargement du modèle a échoué (" + e.message + "). Vérifiez la connexion et réessayez.");
  }
  btn.disabled = false; btn.textContent = "Télécharger le modèle"; bar.classList.add("hidden");
  refreshFineUI();
});
$("#fine-toggle").addEventListener("change", (e) => { store.fineMode = e.target.checked; save(); });
$("#fine-remove").addEventListener("click", async () => {
  await Phoneme.removeModel(); store.fineMode = true; save(); refreshFineUI(); toast("Modèle supprimé");
});
refreshFineUI();

function setRecordButton(state) {
  const btn = $("#btn-record");
  btn.classList.toggle("recording", state === "rec");
  btn.disabled = state === "busy";
  btn.textContent = state === "rec" ? "🔴 À vous… (cliquez ou relâchez Espace pour terminer)"
    : state === "busy" ? "⏳ Analyse son par son…" : "🎙 Parler (ou touche Espace)";
}
function startFineRecording() {
  if (fineRec || fineBusy) return;
  micWarning(null); $("#mic-warning").classList.add("hidden");
  Phoneme.load().catch(() => {});            // prépare le modèle pendant que vous parlez
  fineRec = Phoneme.createRecorder();
  fineStarting = fineRec.start().then(() => setRecordButton("rec")).catch((e) => {
    fineRec = null; setRecordButton("idle");
    micWarning("L'accès au micro a été refusé ou est indisponible. Autorisez le microphone pour Éloquence puis réessayez.");
    throw e;
  });
}
async function stopFineRecording() {
  const r = fineRec; if (!r) return;
  try { await fineStarting; } catch (e) { return; }
  fineRec = null; fineBusy = true; setRecordButton("busy");
  const phrase = currentPhrase();
  try {
    const audio = await r.stop();
    if (!audio) { micWarning("Enregistrement trop court : maintenez la touche ou recliquez à la fin de la phrase."); return; }
    lastAudio = audio;
    const result = await Phoneme.run(audio, PHONEMES[phrase.en]);
    showFineResult(result);
  } catch (e) {
    micWarning("L'analyse son par son a échoué (" + (e.message || e) + ").");
  } finally { fineBusy = false; setRecordButton("idle"); }
}
function playLastAudio() {
  if (!lastAudio) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const b = ctx.createBuffer(1, lastAudio.length, 16000); b.getChannelData(0).set(lastAudio);
  const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.onended = () => ctx.close(); s.start();
}
function esc(t) { return String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function showFineResult(r) {
  const score = r.score;
  recordScore(score);
  const xp = Math.max(2, Math.round(score / 8)) + (score >= 90 ? 6 : 0);
  addXP(xp);
  const issues = [];
  r.words.forEach(w => {
    w.sounds.filter(s => s.level !== "ok").forEach(s => issues.push({ w: w.word, lvl: s.level, label: s.label, tip: s.tip }));
    if (w.stressIssue) issues.push({ w: w.word, lvl: "warn",
      label: "accent tonique : syllabe " + w.stressIssue.syll + " plus marquée que la syllabe " + w.stressIssue.expected,
      tip: "Appuyez sur la syllabe " + w.stressIssue.expected + " : plus longue, plus forte, plus haute ; réduisez les autres." });
  });
  issues.sort((a, b) => (a.lvl === "error" ? 0 : 1) - (b.lvl === "error" ? 0 : 1));
  const verdict = score >= 90 ? "✨ Excellent, presque tous les sons sont justes." :
                  score >= 75 ? "👏 Solide. Travaillez les sons signalés ci-dessous." :
                  score >= 50 ? "🙂 En cours d'acquisition : rejouez le modèle en mode lent." :
                                "🔁 Reprenez son par son : écoutez, répétez, comparez.";
  const res = $("#pron-result");
  res.classList.remove("hidden");
  res.innerHTML = `
    <div class="score-line">${verdict} <strong>${score} / 100</strong> <span class="muted">(+${xp} ⭐)</span></div>
    <div class="score-bar"><div style="width:${score}%"></div></div>
    <div class="words">${r.words.map(w => `<span class="w-chip ${w.level === "error" ? "w-missed-soft" : w.level === "warn" ? "w-off" : "w-good"}">${esc(w.word)}</span>`).join("")}</div>
    ${issues.length ? `<ul class="fine-issues">${issues.slice(0, 6).map(i => `<li class="${i.lvl}"><strong>${esc(i.w)}</strong> · ${esc(i.label)}<br><span>${esc(i.tip)}</span></li>`).join("")}</ul>`
      : `<div class="heard">Aucun son problématique détecté.</div>`}
    ${issues.length > 6 ? `<div class="heard">… et ${issues.length - 6} autre(s) point(s) mineur(s).</div>` : ""}
    <div class="controls fine-replay"><button class="btn outline" id="btn-compare">⇄ Comparer (modèle puis moi)</button><button class="btn outline" id="btn-replay">▶ Réécouter ma voix</button><button class="btn outline" id="btn-replay-model">🔊 Le modèle</button></div>
    <div class="heard">Analyse locale, son par son. Les sons réduits (schwa) ne sont pas notés ; une alerte isolée peut être une fausse alerte.</div>`;
  $("#btn-replay").addEventListener("click", playLastAudio);
  $("#btn-compare").addEventListener("click", () => {
    // Le modèle d'abord, puis votre enregistrement dès qu'il se termine.
    speak(currentPhrase().en, parseFloat(store.rate));
    if (player.src && !player.paused) player.addEventListener("ended", playLastAudio, { once: true });
    else setTimeout(playLastAudio, 4500);
  });
  $("#btn-replay-model").addEventListener("click", () => speak(currentPhrase().en, parseFloat(store.rate)));
  toast("Enregistré · +" + xp + " ⭐");
}
function recordScore(score) {
  const ph = currentPhrase(), axis = ph.f;
  const st = store.phraseStats[axis] || { n: 0, sum: 0 };
  st.n++; st.sum += score; store.phraseStats[axis] = st;
  if (score > store.bestScore) store.bestScore = score;
  // Révision espacée : sous 75, la phrase reviendra ; à 75 ou plus, elle avance d'une étape.
  reviewUpdate("p:" + ph.en, score >= 75);
}
function finishAttempt(heard, alternatives) {
  listening = false;
  $("#btn-record").classList.remove("recording");
  $("#btn-record").textContent = "🎙 Parler (ou touche Espace)";
  const target = currentPhrase().en;
  const tWords = normalize(target).split(" ");
  const hWords = normalize(heard).split(" ");
  // Correspondance gloutonne de chaque mot cible
  const used = new Set();
  const chips = tWords.map(tw => {
    let best = null, bestScore = 0;
    hWords.forEach((hw, i) => {
      if (used.has(i)) return;
      const sim = wordSimilarity(tw, hw);
      if (sim > bestScore) { bestScore = sim; best = i; }
    });
    if (best !== null && bestScore >= 0.99) { used.add(best); return { tw, cls: "w-good" }; }
    if (best !== null && bestScore >= 0.5) { used.add(best); return { tw, cls: "w-off", alt: hWords[best] }; }
    return { tw, cls: "w-missed" };
  });
  const matchedChips = chips.filter(c => c.cls === "w-good").length;
  const offChips = chips.filter(c => c.cls === "w-off").length;
  const score = Math.round(100 * (matchedChips + 0.5 * offChips) / tWords.length);
  // XP + stats
  const xp = Math.max(2, Math.round(score / 8)) + (score >= 90 ? 6 : 0);
  recordScore(score);
  addXP(xp);

  const res = $("#pron-result");
  res.classList.remove("hidden");
  const verdict = score >= 90 ? "✨ Excellent — presque indistinguable d'un natif." :
                  score >= 75 ? "👏 Solide. Travaillez les mots surlignés en ambre." :
                  score >= 50 ? "🙂 En cours d'acquisition — rejouez le modèle en mode lent." :
                                "🔁 Reprenez lettre par lettre : écoutez, répétez, comparez.";
  res.innerHTML = `
    <div class="score-line">${verdict} <strong>${score} / 100</strong> <span class="muted">(+${xp} ⭐)</span></div>
    <div class="score-bar"><div style="width:${score}%"></div></div>
    <div class="words">${chips.map(c => `<span class="w-chip ${c.cls}" title="${c.alt ? "Entendu : " + c.alt : c.cls === "w-missed" ? "Non détecté" : ""}">${c.tw}</span>`).join("")}</div>
    <div class="heard">Reconnaissance a entendu : « ${heard} »</div>`;
  toast("Enregistré · +" + xp + " ⭐");
}

/* ============================================================
   MODULE TÊTE-À-TÊTE (agent local)
   ============================================================ */
let scenario = null, scNode = null, dlgXP = 0, dlgLives = 3;
function renderScenarios() {
  const box = $("#scenario-list");
  box.innerHTML = "";
  SCENARIOS.forEach(s => {
    const done = store.scenariosDone.includes(s.id);
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-ico">${s.icon}</div>
      <h3>${s.title}${done ? " ★" : ""}</h3>
      <p>${s.context}</p>
      <span class="cta">${done ? "Rejouer" : "Commencer"} →</span>`;
    card.addEventListener("click", () => startScenario(s));
    box.appendChild(card);
  });
}
function bubble(cls, textEN, textFR, meta) {
  const log = $("#dialogue-log");
  const div = document.createElement("div");
  div.className = "bubble " + cls;
  div.innerHTML = textEN + (textFR ? `<span class="fr">${textFR}</span>` : "") + (meta ? `<span class="meta">${meta}</span>` : "");
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}
function startScenario(s) {
  scenario = s; dlgXP = 0; dlgLives = 3;
  scNode = s.nodes.start;
  $("#dialogue-select").classList.add("hidden");
  $("#dialogue-run").classList.remove("hidden");
  $("#dialogue-title").textContent = s.title;
  $("#dialogue-log").innerHTML = "";
  $("#dlg-hints").classList.add("hidden");
  updateMeters();
  showBotNode();
}
function showBotNode() {
  bubble("bubble-agent", scNode.bot, scNode.botFr);
  speak(scNode.bot);
}
function updateMeters() {
  $("#dialogue-score").textContent = dlgXP;
  $("#dialogue-lives").textContent = "❤ " + dlgLives;
}
function endScenario() {
  if (!store.scenariosDone.includes(scenario.id)) store.scenariosDone.push(scenario.id);
  save();
  bubble("bubble-agent", "— End of this conversation.", "Fin de la conversation · total de la séance : " + dlgXP + " points ⭐. Rejouez-la ou ouvrez une autre situation.");
  $("#dlg-text").disabled = true;
  setTimeout(() => {
    $("#dialogue-run").classList.add("hidden");
    $("#dialogue-select").classList.remove("hidden");
    $("#dlg-text").disabled = false;
    renderScenarios(); renderHUD();
  }, 1800);
}
function answerDialogUED(transcript) {
  if (!transcript.trim()) return;
  bubble("bubble-user", transcript);
  const text = normalize(transcript);
  const match = (scNode.branches || []).find(b => b.keywords.some(k => text.includes(normalize(k))));
  if (match) {
    const gain = 15 + (match.praise ? 5 : 0);
    dlgXP += gain;
    bubble("bubble-agent", match.reply, match.replyFr, "Réponse reconnue · +" + gain + " ⭐");
    speak(match.reply);
    addXP(gain);
    updateMeters();
    $("#dlg-hints").classList.add("hidden");
    const nextNode = match.next ? scenario.nodes[match.next] : null;
    if (nextNode && nextNode.end) {
      dlgXP += 10; updateMeters();
      setTimeout(() => {
        bubble("bubble-agent", nextNode.bot, nextNode.botFr);
        speak(nextNode.bot);
        endScenario();
      }, 1200);
    } else if (nextNode) {
      scNode = nextNode;
      setTimeout(showBotNode, 400);
    }
  } else {
    dlgLives--;
    updateMeters();
    bubble("bubble-agent", scNode.fallback, scNode.fallbackFr, "Formulation à retravailler · réponse attendue non reconnue");
    speak(scNode.fallback);
    $("#dlg-hints").classList.remove("hidden");
    if (dlgLives <= 0) {
      dlgLives = 3;
      setTimeout(() => { toast("Trois reformulations en attente — passez à la suite si vous voulez."); }, 800);
    }
  }
}
$("#btn-talk").addEventListener("click", () => {
  if (!ensureRecognitionUI()) return;
  if (listening) { try { rec.stop(); } catch (e) {} return; }
  micWarning(null);
  rec = makeRecognition((t) => answerDialogUED(t), () => {
    listening = false;
    $("#btn-talk").classList.remove("recording");
    $("#btn-talk").textContent = "🎙 Répondre à voix haute";
  });
  try { rec.start(); listening = true; } catch (e) { return; }
  $("#btn-talk").classList.add("recording");
  $("#btn-talk").textContent = "🔴 …cliquez pour envoyer";
});
$("#btn-dlg-send").addEventListener("click", () => {
  const v = $("#dlg-text").value;
  $("#dlg-text").value = "";
  answerDialogUED(v);
});
$("#dlg-text").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); $("#btn-dlg-send").click(); }
});
$("#btn-hint").addEventListener("click", () => {
  const box = $("#dlg-hints");
  if (box.classList.contains("hidden")) {
    box.innerHTML = "<strong>Pistes de formulation acceptées :</strong><br>" + scNode.hints.map(h => "· " + h).join("<br>");
    box.classList.remove("hidden");
  } else box.classList.add("hidden");
});
$("#btn-skip").addEventListener("click", () => {
  const model = (scNode.hints && scNode.hints[0]) || "(voir les indices)";
  bubble("bubble-user", "— je passe (modèle : " + model + ")");
  dlgXP += 3;
  const nxt = (scNode.branches && scNode.branches[0]) ? scNode.branches[0].next : scNode.next;
  if (nxt && scenario.nodes[nxt]) {
    const nxtNode = scenario.nodes[nxt];
    if (nxtNode.end) {
      dlgXP += 10; updateMeters();
      setTimeout(() => { bubble("bubble-agent", nxtNode.bot, nxtNode.botFr); speak(nxtNode.bot); endScenario(); }, 900);
      stopSkipHere();
      return;
    }
    scNode = nxtNode;
  }
  addXP(3); updateMeters();
  setTimeout(showBotNode, 300);
  function stopSkipHere() { addXP(3); }
});
$("#btn-dialogue-exit").addEventListener("click", () => {
  $("#dialogue-run").classList.add("hidden");
  $("#dialogue-select").classList.remove("hidden");
  speechSynthesis.cancel();
});

/* ============================================================
   MODULE NUANCES
   ============================================================ */
let nuanceQueue = [], nuancePos = 0, nuanceLock = false;
function startNuanceRound() {
  // Les éléments à revoir aujourd'hui passent en premier.
  const due = dueNuances();
  nuanceQueue = shuffle(due).concat(shuffle(NUANCES.filter(n => !due.includes(n))));
  nuancePos = 0;
  showNuanceItem();
}
function showNuanceItem() {
  nuanceLock = false;
  const it = nuanceQueue[nuancePos];
  // Pour les exercices auditifs, la bonne option est celle du mot entendu
  // On tire le mot au hasard parmi les options : sinon la réponse serait
  // toujours la même et l'oreille ne serait pas vraiment entraînée.
  if (it.audio) {
    it.good = Math.floor(Math.random() * it.options.length);
    it.target = it.options[it.good];
  }
  const inReview = !!reviewMap()["n:" + nuanceKey(it)];
  $("#nuance-type").textContent = (inReview ? "🔁 Révision · " : "") + NUANCE_TYPES[it.type];
  $("#nuance-question").textContent = it.q || it.audio;
  $("#nuance-context").textContent = it.ctx || "";
  $("#nuance-explain").classList.add("hidden");
  $("#nuance-next").classList.add("hidden");
  const zone = $("#nuance-audio-zone");
  if (it.audio) {
    zone.innerHTML = "";
    const b = document.createElement("button");
    b.className = "btn primary";
    b.textContent = "🔊 Écouter le mot";
    b.addEventListener("click", () => speak(it.target, 0.85));
    zone.appendChild(b);
  } else zone.innerHTML = "";
  const optBox = $("#nuance-options");
  optBox.innerHTML = "";
  shuffle(it.options.map((o, i) => ({ o, good: i === it.good }))).forEach(op => {
    const b = document.createElement("button");
    b.className = "opt";
    b.textContent = op.o;
    b.addEventListener("click", () => pickNuance(b, op, it, optBox));
    optBox.appendChild(b);
  });
}
function pickNuance(btn, op, it) {
  if (nuanceLock) return;
  nuanceLock = true;
  $$("#nuance-options .opt").forEach(o => o.classList.add("muted-el"));
  btn.classList.remove("muted-el");
  const goodBtn = [...$$("#nuance-options .opt")].find(b => b.textContent === it.options[it.good]);
  if (btn.textContent === it.options[it.good]) {
    btn.classList.add("reveal-good");
    reviewUpdate("n:" + nuanceKey(it), true);
    addXP(10);
    toast("Juste ! +10 ⭐");
  } else {
    btn.classList.add("reveal-bad");
    reviewUpdate("n:" + nuanceKey(it), false);
    addXP(3);
    goodBtn.classList.add("reveal-good");
    toast("Pas tout à fait — regardez l'explication.");
  }
  const ex = $("#nuance-explain");
  ex.innerHTML = "<strong>« " + it.options[it.good] + " »</strong> — " + it.tip;
  ex.classList.remove("hidden");
  $("#nuance-next").classList.remove("hidden");
  // Après la réponse, on fait entendre les mots à la suite pour comparer.
  if (it.type === "sound") speak(it.options.join(". ... ") + ".", 0.8);
}
$("#nuance-next").addEventListener("click", () => {
  nuancePos++;
  if (nuancePos >= nuanceQueue.length) { startNuanceRound(); toast("Cycle terminé — nouvel ordre, de nouveau le défi."); return; }
  showNuanceItem();
});

/* ============================================================
   MODULE PROGRESSION
   ============================================================ */
function renderProgress() {
  const li = levelInfo();
  $("#p-level").textContent = "Nv. " + (li.idx + 1);
  $("#p-xp").textContent = store.xp;
  $("#p-streak").textContent = store.streak;
  $("#p-best").textContent = store.bestScore;
  $("#p-count").textContent = store.answersCount;
  const next = LEVELS[li.idx + 1];
  const prev = LEVELS[li.idx];
  if (next) {
    const pct = Math.round(100 * (store.xp - prev.xp) / (next.xp - prev.xp));
    $("#p-level-fill").style.width = pct + "%";
    $("#p-level-next").textContent = pct + "% — prochain palier : " + next.name + " (" + next.xp + " ⭐)";
  } else {
    $("#p-level-fill").style.width = "100%";
    $("#p-level-next").textContent = "Palier maximal atteint — chapeau bas !";
  }
  const box = $("#strength-list");
  box.innerHTML = "";
  PHONEME_FILTERS.forEach(f => {
    const st = store.phraseStats[f.id] || { n: 0, sum: 0 };
    const avg = st.n ? Math.round(st.sum / st.n) : 0;
    const row = document.createElement("div");
    row.className = "strength-row";
    row.innerHTML = `
      <div class="lbl"><span>${PHONEME_FILTER_LABELS[f.id]}</span><span>${st.n ? avg + " / 100 · " + st.n + " essais" : "pas encore travaillé"}</span></div>
      <div class="goal-bar"><div style="width:${avg}%"></div></div>`;
    box.appendChild(row);
  });
}
$("#btn-reset").addEventListener("click", () => {
  if (confirm("Effacer toute votre progression (⭐, série, scores) ? Cette action est définitive.")) {
    localStorage.removeItem(STORE_KEY);
    location.reload();
  }
});

/* ============================================================
   RÉGLAGES
   ============================================================ */
$("#btn-settings").addEventListener("click", () => {
  $("#settings-modal").classList.remove("hidden");
  $("#settings-modal").classList.add("open");
  loadVoices();
});
$("#settings-close").addEventListener("click", () => {
  $("#settings-modal").classList.add("hidden");
  $("#settings-modal").classList.remove("open");
});
$("#set-voice").addEventListener("change", (e) => {
  store.voiceURI = e.target.value; store.voiceChosen = true; save();
  speak("Let's walk through the thorough analysis of the data.");
});
$("#voice-diag").addEventListener("toggle", loadVoices);
$("#set-natural").value = naturalVoice() || "system";
$("#set-natural").addEventListener("change", (e) => {
  store.naturalVoice = e.target.value; save();
  speak("Let's walk through the thorough analysis of the data.");
});
$("#voice-test").addEventListener("click", () => speak("Let's walk through the thorough analysis of the data."));
$("#voice-auto").addEventListener("click", () => { store.voiceChosen = false; save(); loadVoices(); speak("Let's walk through the thorough analysis of the data."); });
$("#set-rate").addEventListener("input", (e) => {
  store.rate = e.target.value; $("#rate-value").textContent = e.target.value; save();
});
$("#set-goal").addEventListener("input", (e) => { store.goal = parseInt(e.target.value, 10) || 3; save(); renderDashboard(); });

/* ---------- Démarrage ---------- */
renderHUD();
renderDashboard();
$("#review-pron").addEventListener("click", () => { showTab("pronunciation"); openReviewPhrases(); });
$("#review-nuance").addEventListener("click", () => { showTab("nuance"); startNuanceRound(); });
renderReviewUI();
renderPronFilters();
renderPhrase();
renderScenarios();
startNuanceRound();
ensureDay();
